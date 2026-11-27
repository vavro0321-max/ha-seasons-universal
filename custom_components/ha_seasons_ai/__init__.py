"""Opt-in automatic photographic variants for HA Seasons AI."""
import asyncio
import base64
import io
import json
import logging
from pathlib import Path
import re

import aiohttp
from PIL import Image, ImageOps
import voluptuous as vol

from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.aiohttp_client import async_get_clientsession

DOMAIN = "ha_seasons_ai"
_LOGGER = logging.getLogger(__name__)
ID = re.compile(r"[a-f0-9]{32}")
CONFIG_SCHEMA = vol.Schema({
    DOMAIN: vol.Schema({
        vol.Required("api_key"): vol.All(str, vol.Length(min=1)),
        vol.Optional("allow_paid_generation", default=False): bool,
        vol.Optional("model", default="gpt-image-2.5-flare"): str,
        vol.Optional("quality", default="medium"): vol.In(["low", "medium", "high"]),
    })
}, extra=vol.ALLOW_EXTRA)
SEASONS = {
    "spring": "Spring, fresh vegetation and natural blossoms.",
    "summer": "Summer, naturally green vegetation.",
    "autumn": "Autumn, natural amber and red deciduous foliage.",
    "winter": "Winter without lying snow; remove deciduous leaves, retain evergreen conifers and exact branch geometry.",
}
PRESERVE = ("Edit the supplied photograph, preserve the location, exact perspective, camera position, "
            "framing, aspect ratio, structures, roads and objects. No new buildings, people, text, "
            "haze or artificial fog. Do not invent outdoor features in indoor scenes. ")
NIGHT = ("Realistic luminous night, visible detail, warm light only from existing plausible sources, "
         "no added fixtures, no blanket of darkness, no added stars or moon.")
SNOW = ("Settled snow only on existing suitable outdoor surfaces, preserve geometry, paths and water. "
        "No falling snow. Never add snow indoors.")

def atomic(path: Path, data: bytes) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_bytes(data)
    tmp.replace(path)

def status(folder: Path, value: dict) -> None:
    atomic(folder / "status.json", json.dumps(value).encode())

def prepare(source: Path) -> bytes:
    if source.stat().st_size > 40_000_000:
        raise ValueError("Source too large")
    with Image.open(source) as image:
        image = ImageOps.exif_transpose(image).convert("RGB")
        image.thumbnail((2048, 2048))
        out = io.BytesIO()
        image.save(out, format="JPEG", quality=94)
        return out.getvalue()

def plan():
    jobs = []
    for season, instruction in SEASONS.items():
        jobs.append((season + "-day.png", "original", PRESERVE + instruction + " Clear daylight, no snow."))
        jobs.append((season + "-night.png", season + "-day.png", PRESERVE + NIGHT))
    jobs += [("winter-snow.png", "winter-day.png", PRESERVE + SNOW + " Clear daylight."),
             ("winter-night-snow.png", "winter-snow.png", PRESERVE + NIGHT + " Preserve lying snow.")]
    return jobs

async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    settings = config[DOMAIN]
    active = set()
    session = async_get_clientsession(hass)
    root = Path(hass.config.path("www", "ha-seasons-auto"))
    image_root = Path(hass.config.path("image"))

    async def generate(image_id: str) -> None:
        folder = root / image_id
        marker = folder / "status.json"
        source = image_root / image_id / "original"
        async def work(fn, *args):
            return await hass.async_add_executor_job(fn, *args)
        try:
            await work(lambda: folder.mkdir(parents=True, exist_ok=True))
            if await work(marker.exists):
                return  # Never retry a charged or interrupted job automatically.
            original = await work(prepare, source)
            await work(status, folder, {"state": "running", "completed": 0, "total": 10})
            for index, (name, input_name, prompt) in enumerate(plan()):
                data = original if input_name == "original" else await work((folder / input_name).read_bytes)
                form = aiohttp.FormData()
                form.add_field("image", data, filename="source.jpg" if input_name == "original" else input_name,
                               content_type="image/jpeg" if input_name == "original" else "image/png")
                for key, value in {"model": settings["model"], "quality": settings["quality"],
                                   "prompt": prompt, "n": "1", "output_format": "png"}.items():
                    form.add_field(key, value)
                async with session.post("https://api.openai.com/v1/images/edits", data=form,
                                        headers={"Authorization": "Bearer " + settings["api_key"]},
                                        timeout=aiohttp.ClientTimeout(total=300), allow_redirects=False) as response:
                    if response.status != 200:
                        raise HomeAssistantError(f"Image API HTTP {response.status}")
                    result = await response.json()
                png = await work(base64.b64decode, result["data"][0]["b64_json"])
                if not png.startswith(b"\x89PNG\r\n\x1a\n"):
                    raise ValueError("Invalid PNG")
                await work(atomic, folder / name, png)
                await work(status, folder, {"state": "running", "completed": index + 1, "total": 10})
            await work(status, folder, {"state": "ready", "completed": 10, "total": 10})
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            _LOGGER.error("HA Seasons generation stopped (%s); no automatic retry", type(exc).__name__)
            if await work(marker.exists):
                await work(status, folder, {"state": "error"})
        finally:
            active.discard(image_id)

    async def handle(call: ServiceCall) -> None:
        user = await hass.auth.async_get_user(call.context.user_id) if call.context.user_id else None
        if not user or not user.is_admin:
            raise HomeAssistantError("Only an administrator may start paid generation")
        if not settings["allow_paid_generation"]:
            raise HomeAssistantError("Paid generation is disabled in configuration.yaml")
        image_id = call.data["image_id"]
        if image_id in active:
            return
        if active:
            raise HomeAssistantError("A different image is already generating")
        source = image_root / image_id / "original"
        if not await hass.async_add_executor_job(source.is_file):
            raise HomeAssistantError("Uploaded image not found")
        if image_id in active:
            return
        if active:
            raise HomeAssistantError("A different image is already generating")
        active.add(image_id)
        hass.async_create_background_task(generate(image_id), "HA Seasons AI generation")

    hass.services.async_register(DOMAIN, "generate", handle,
                                 schema=vol.Schema({vol.Required("image_id"): vol.Match(r"^[a-f0-9]{32}$")}))
    return True
