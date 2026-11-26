#!/usr/bin/env python3
"""One-time, opt-in generation of matching day/night/snow assets for HA Seasons."""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import shutil

SEASONS = {
    "spring": "Early spring, natural fresh vegetation and subtle blossoms",
    "summer": "Summer, full natural green vegetation",
    "autumn": "Autumn, natural amber and red foliage",
    "winter": "Winter without lying snow, dormant vegetation where appropriate",
}
PRESERVE = (
    "Edit the provided image, do not generate a different location. Preserve exact camera position, "
    "framing, aspect ratio, perspective, horizon and geometry of every existing object. "
    "Do not add buildings, people, roads, rivers, decorations, mountains, or text. "
    "Only alter lighting, season and snow as requested. Keep a sharp, clearly visible image, "
    "natural colors and realistic details, no haze or artificial fog. "
    "For indoor scenes or objects without vegetation, do not invent outdoor features. "
)
NIGHT = (
    "Convert the same image to realistic, luminous nighttime photography, with visible shadows "
    "and details, a natural deep-blue night sky where sky exists, and warm light from existing "
    "windows, lamps or other plausible light sources only. Do not invent light fixtures. "
    "No daylight sun, no artificial blanket of darkness, no moon or stars added. "
)
SNOW = (
    "Add realistic settled snow ONLY on existing outdoor roofs, vegetation, ground and appropriate "
    "horizontal surfaces. Preserve paths, bodies of water and all exact object outlines. "
    "Never add snow inside rooms or on inappropriate surfaces. No falling snow or haze. "
)
DRY = "No settled snow, no falling snow; clear, readable natural daylight."
def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--input", required=True, type=Path)
    p.add_argument("--output", required=True, type=Path)
    p.add_argument("--url", default="/local/ha-seasons-custom")
    p.add_argument("--mode", choices=["single", "seasonal"], default="single")
    p.add_argument("--model", default="gpt-image-2.5-sunburst")
    p.add_argument("--quality", choices=["low", "medium", "high"], default="medium")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--yes", action="store_true", help="Explicitly accept paid image edits and uploading source to OpenAI")
    a = p.parse_args()
    if not a.input.is_file() or a.input.suffix.lower() not in (".jpg", ".jpeg", ".png", ".webp"):
        p.error("Input must be an existing JPG, PNG or WebP image.")
    if a.input.stat().st_size >= 50_000_000:
        p.error("Input exceeds 50 MB.")
    if not a.url.startswith("/local/") or any(ch in a.url for ch in "\\?#"):
        p.error("--url must be a local HA path such as /local/ha-seasons-custom")
    url = a.url.rstrip("/")
    single = a.mode == "single"
    keys = ["single"] if single else list(SEASONS)
    source_hash = hashlib.sha256(a.input.read_bytes()).hexdigest()
    fingerprint = {"source_sha256": source_hash, "mode": a.mode, "model": a.model,
                   "quality": a.quality, "generator": 1}
    plan = []
    names = {}
    source_copy = "original" + a.input.suffix.lower()
    for key in keys:
        prefix = "" if single else key + "-"
        day = source_copy if single else prefix + "day.png"
        if not single:
            plan.append((day, source_copy, PRESERVE + SEASONS[key] + ". " + DRY))
        night, snow, night_snow = [prefix + name + ".png" for name in ("night", "snow", "night-snow")]
        plan.extend([(night, day, PRESERVE + NIGHT),
                     (snow, day, PRESERVE + SNOW + " Natural daylight."),
                     (night_snow, snow, PRESERVE + NIGHT + " Preserve settled snow.")])
        names[key] = (day, night, snow, night_snow)
    if a.dry_run or not a.yes:
        print(f"Up to {len(plan)} paid image edits, source uploaded to OpenAI. No requests made.")
        for dst, src, _ in plan:
            print(f"{src} -> {dst}")
        return
    if not os.getenv("OPENAI_API_KEY"):
        p.error("Set OPENAI_API_KEY locally first; never paste it into HA.")
    from openai import OpenAI
    a.output.mkdir(parents=True, exist_ok=True)
    marker = a.output / "generation.json"
    if marker.exists():
        if json.loads(marker.read_text(encoding="utf-8")) != fingerprint:
            p.error("Output belongs to another source or settings. Use a new empty directory.")
    elif any(a.output.iterdir()):
        p.error("Use an empty directory for a new source.")
    else:
        marker.write_text(json.dumps(fingerprint, indent=2), encoding="utf-8")
    shutil.copyfile(a.input, a.output / source_copy)
    client = OpenAI(max_retries=0, timeout=300)
    for dst, src, prompt in plan:
        target = a.output / dst
        if target.exists() and target.stat().st_size > 0:
            print("Cached:", dst)
            continue
        print("Generating:", dst, flush=True)
        with (a.output / src).open("rb") as f:
            result = client.images.edit(model=a.model, image=f, prompt=prompt,
                                        quality=a.quality, output_format="png", n=1)
        data = base64.b64decode(result.data[0].b64_json, validate=True)
        if not data.startswith(bytes.fromhex("89504e470d0a1a0a")):
            raise ValueError("Expected PNG image; output not written")
        temp = target.with_suffix(".tmp")
        temp.write_bytes(data)
        temp.replace(target)
    config = {"background_mode": a.mode, "background_dim": 0.03,
              "dynamic_snow": True, "photographic_advent": False,
              "show_sun": False, "sky_height": 34}
    if single:
        for k, f in zip(("background_image", "night_image", "snow_image", "night_snow_image"), names["single"]):
            config[k] = url + "/" + f
    else:
        for i, k in enumerate(("seasonal_images", "seasonal_night_images", "seasonal_snow_images", "seasonal_night_snow_images")):
            config[k] = {season: url + "/" + files[i] for season, files in names.items()}
        config["snow_free_image"] = config["seasonal_images"]["winter"]
    # JSON is valid YAML; merge these keys into the existing card, not its entities.
    (a.output / "card-settings.json").write_text(json.dumps(config, ensure_ascii=False, indent=2), encoding="utf-8")
    print("Done. Visually inspect every image before copying assets to HA.")
    print("Merge card-settings.json into your existing card configuration.")
if __name__ == "__main__":
    main()
