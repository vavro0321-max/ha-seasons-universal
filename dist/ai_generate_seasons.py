#!/usr/bin/env python3
"""Create four season-specific *static images* from one owned photo.

Runs only on a computer/server with an OpenAI API key. NEVER from the browser/card.
The script does not modify the live Home Assistant setup.
"""
from __future__ import annotations

import argparse
import base64
from datetime import datetime, timezone
from hashlib import sha256
import json
import os
from pathlib import Path
import sys

from PIL import Image, ImageOps

SEASONS = {
    "spring": "Fresh early spring. Soft new leaves, tender grass, realistic spring blossoms, mild light, no snow.",
    "summer": "Full summer. Thick natural green foliage, rich meadow grass, vibrant wildflowers, warm summer light, no snow.",
    "autumn": "Autumn. Realistic golden, orange and rust-red deciduous leaves, some fallen leaves, crisp seasonal light, no snow.",
    "winter": "Winter. Natural snow on the roof and ground, winter trees and snowy mountains, cold soft atmosphere. Snow respects all surfaces and physical geometry.",
}

PROMPT_BASE = """Edit the attached reference photograph into a photorealistic {name} version.
Change ONLY weather, foliage, seasonal ground cover, daylight and seasonal atmosphere.
Preserve the exact camera viewpoint, framing, horizon, geometry, architecture, buildings,
windows, doors, rooftops, trees' positions, water edge, paths, furniture and all fixed objects.
Don't add or remove buildings, trees, people, cars, furniture, animals, text, graphics or logos.
No painting, illustration, oversharpening or fantasy effects.
The result must have the exact same viewpoint, close composition and natural proportions
as the reference photo. No UI and no written text.
Season instruction: {description}
"""


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description="HA Seasons AI – 1 fotografiu zmeniť na 4 ročné obdobia")
    parser.add_argument("--input", type=Path, required=True, help="Vlastný pôvodný JPG/PNG/WEBP")
    parser.add_argument("--output", type=Path, default=Path("seasons"), help="Výstupný priečinok")
    parser.add_argument("--model", default="gpt-image-2", help="OpenAI image edits model")
    parser.add_argument("--size", choices=["1536x864", "1536x1024", "1024x1536", "1024x1024", "2048x1152"], default="1536x864")
    parser.add_argument("--quality", choices=["low", "medium", "high"], default="medium")
    parser.add_argument("--only", choices=["all", *SEASONS.keys()], default="all", help="Generovať len jeden variant")
    parser.add_argument("--dry-run", action="store_true", help="Vypíš plán bez internetového volania a bez platieb")
    parser.add_argument("--yes", action="store_true", help="Povoliť platné API volania a spoplatnenie")
    parser.add_argument("--force", action="store_true", help="Prepísať už existujúce výsledky")
    return parser.parse_args(argv)


def main(argv=None):
    args = parse_args(argv)
    if not args.input.is_file():
        print(f"Chyba: neexistuje vstupný obrázok: {args.input}", file=sys.stderr)
        return 2
    if args.input.stat().st_size > 25_000_000:
        print("Chyba: obrázok je príliš veľký (limit skriptu 25 MB).", file=sys.stderr)
        return 2
    try:
        with Image.open(args.input) as img:
            img.verify()
        with Image.open(args.input) as img:
            w, h = img.size
    except Exception as exc:
        print(f"Chyba: neplatný obrázok ({exc})", file=sys.stderr)
        return 2
    if w * h > 24_000_000:
        print("Chyba: obrázok je príliš veľký (max 24 megapixelov).", file=sys.stderr)
        return 2

    jobs = list(SEASONS) if args.only == "all" else [args.only]
    print(f"Vstup: {args.input.name} | {w}×{h} | model: {args.model} | rozlíšenie: {args.size}")
    for name in jobs:
        print(f"  {name}.webp – {'prepíše sa' if (args.output/f'{name}.webp').exists() and args.force else 'nový obrázok'}")
        if args.dry_run:
            print("    PROMPT:", PROMPT_BASE.format(name=name, description=SEASONS[name]).replace("\n", " ")[:440])
    if args.dry_run:
        print("\nSUCHÝ TEST: API sa nekontaktovalo, nič sa neúčtovalo.")
        return 0
    if not args.yes:
        print("Chyba: toto volá platené AI API. Pridaj --yes po kontrole plánu (--dry-run).", file=sys.stderr)
        return 2
    if not os.environ.get("OPENAI_API_KEY"):
        print("Chyba: chýba premenná OPENAI_API_KEY. Nedávaj kľúč do dashboardu ani GitHubu.", file=sys.stderr)
        return 2

    from openai import OpenAI
    client = OpenAI()
    args.output.mkdir(parents=True, exist_ok=True)
    source_hash = sha256(args.input.read_bytes()).hexdigest()
    metadata = {"generator":"ha-seasons-ai", "created_at":datetime.now(timezone.utc).isoformat(),
                "input_sha256":source_hash,"model":args.model,"size":args.size,"quality":args.quality,"seasons":{}}
    for name in jobs:
        dest = args.output / f"{name}.webp"
        if dest.exists() and not args.force:
            print(f"{dest}: existuje – preskočené. Použi --force, ak chceš prepísať.")
            continue
        prompt = PROMPT_BASE.format(name=name, description=SEASONS[name])
        print(f"Generujem {name}…")
        # Always supply a reference image; prevents uncontrolled text-to-image scene replacement.
        with args.input.open("rb") as image:
            result = client.images.edit(model=args.model, image=image, prompt=prompt,
                                        size=args.size, quality=args.quality,
                                        output_format="png")
        encoded = result.data[0].b64_json if result.data else None
        if not encoded:
            raise RuntimeError(f"Generovanie {name} nevrátilo obrázok. Nič neukladám.")
        import io
        with Image.open(io.BytesIO(base64.b64decode(encoded))) as generated:
            generated = ImageOps.exif_transpose(generated).convert("RGB")
            temp = dest.with_suffix(".tmp.webp")
            generated.save(temp, "WEBP", quality=86, method=6)
            temp.replace(dest)
        metadata["seasons"][name] = {"file":dest.name,"sha256":sha256(dest.read_bytes()).hexdigest()}
        print(f"Hotovo: {dest.name}")

    manifest = args.output / "manifest.json"
    manifest.write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding="utf-8")
    print("\nHotovo. Otvor obrázky a over, či AI zachovala dom, okná a rozloženie scény.")
    print("Až potom ich skopíruj do Home Assistant: /config/www/ha-seasons-ai/seasons/")
    print("Každý API hovor môže byť spoplatnený. Žiadne automatické opakovanie nie je zapnuté.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"Generovanie sa zastavilo: {exc}", file=sys.stderr)
        raise SystemExit(1)
