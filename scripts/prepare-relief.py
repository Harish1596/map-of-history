"""Prepare local XYZ WebP tiles from Natural Earth's HYP_LR_SR archive.

Build-time requirements: rasterio, numpy, Pillow. No networking is performed.
Usage: python scripts/prepare-relief.py /path/to/HYP_LR_SR.zip
"""
import hashlib
import json
import math
from datetime import date
from pathlib import Path
import sys
import zipfile

import numpy as np
from PIL import Image, ImageEnhance
import rasterio
from rasterio.features import rasterize
from rasterio.transform import from_bounds
from rasterio.warp import reproject, Resampling

root = Path(__file__).resolve().parent.parent
source = Path(sys.argv[1]).resolve()
output = root / "public/data/world/relief"
tile_size, max_zoom = 512, 4
size = tile_size * 2 ** max_zoom
extent = math.pi * 6378137
dst_transform = from_bounds(-extent, -extent, extent, extent, size, size)
countries_file = root / "public/data/world/countries.geojson"
countries = json.loads(countries_file.read_text())
with zipfile.ZipFile(source) as archive:
    tif = next(name for name in archive.namelist() if name.lower().endswith(".tif"))

with rasterio.open(f"/vsizip/{source}/{tif}") as dataset:
    if dataset.crs.to_epsg() != 4326 or dataset.count < 3:
        raise ValueError("Expected Natural Earth RGB imagery in EPSG:4326")
    # Match the app's country coastline and keep the existing ocean visible.
    land = rasterize(
        ((f["geometry"], 255) for f in countries["features"]),
        out_shape=(dataset.height, dataset.width), transform=dataset.transform,
        fill=0, dtype="uint8",
    )
    pixels = np.zeros((4, size, size), dtype="uint8")
    for band in range(3):
        reproject(
            rasterio.band(dataset, band + 1), pixels[band],
            src_transform=dataset.transform, src_crs=dataset.crs,
            dst_transform=dst_transform, dst_crs="EPSG:3857", resampling=Resampling.bilinear,
        )
    reproject(
        land, pixels[3], src_transform=dataset.transform, src_crs=dataset.crs,
        dst_transform=dst_transform, dst_crs="EPSG:3857", resampling=Resampling.bilinear,
    )
    source_size = [dataset.width, dataset.height]
del land
world = Image.fromarray(np.moveaxis(pixels, 0, -1))
del pixels
count = 0
for zoom in range(max_zoom + 1):
    dimension = tile_size * 2 ** zoom
    level = world if zoom == max_zoom else world.resize((dimension, dimension), Image.Resampling.LANCZOS)
    for x in range(2 ** zoom):
        directory = output / str(zoom) / str(x)
        directory.mkdir(parents=True, exist_ok=True)
        for y in range(2 ** zoom):
            tile = level.crop((x * tile_size, y * tile_size, (x + 1) * tile_size, (y + 1) * tile_size))
            alpha = tile.getchannel("A")
            # Restrained source colours retain elevation shading and label contrast.
            tile = ImageEnhance.Color(tile.convert("RGB")).enhance(0.65)
            tile.putalpha(alpha)
            tile.save(directory / f"{y}.webp", quality=86, method=2)
            count += 1
    print(f"Prepared zoom {zoom}", flush=True)

metadata = {
    "title": "Natural Earth cross-blended hypsometric tints with shaded relief",
    "source": "https://www.naturalearthdata.com/downloads/10m-raster-data/10m-cross-blend-hypso/",
    "download": "https://naciscdn.org/naturalearth/10m/raster/HYP_LR_SR.zip",
    "license": "Public domain",
    "licenseUrl": "https://www.naturalearthdata.com/about/terms-of-use/",
    "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
    "coastlineSha256": hashlib.sha256(countries_file.read_bytes()).hexdigest(),
    "preparedOn": date.today().isoformat(),
    "sourceDimensions": source_size,
    "projection": "EPSG:3857", "scheme": "XYZ",
    "tileSize": tile_size, "minZoom": 0, "maxZoom": max_zoom, "tileCount": count,
    "transformations": "Reproject EPSG:4326 imagery to Web Mercator; clip alpha to bundled country geometry; reduce colour saturation to 65%; generate 512px WebP tiles at zooms 0–4, quality 86.",
    "limitations": "Generalized 1:10m relief for world and regional views. Higher zooms enlarge existing imagery without adding detail. Cross-blended colours vary by elevation and geographic region, not a single numerical elevation scale. Baked lighting, not an elevation grid or 3D terrain. Coastline masking can produce slight source-alignment differences.",
}
(output / "metadata.json").write_text(json.dumps(metadata, indent=2) + "\n")
print(f"Prepared {count} local terrain tiles.")
