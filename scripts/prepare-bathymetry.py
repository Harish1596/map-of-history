"""Prepare local depth-band tiles from Natural Earth's bathymetry archive.

Usage: python scripts/prepare-bathymetry.py /path/to/ne_10m_bathymetry_all.zip
Requires fiona, rasterio, numpy and Pillow. Preparation is entirely offline.
"""
import hashlib
import json
import math
import sys
from datetime import date
from pathlib import Path

import fiona
import numpy as np
from PIL import Image
from rasterio.features import rasterize
from rasterio.transform import from_bounds
from rasterio.warp import reproject, Resampling

root = Path(__file__).resolve().parent.parent
source = Path(sys.argv[1]).resolve()
output = root / "public/data/world/bathymetry"
output.mkdir(parents=True, exist_ok=True)
depths = [0, 200, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000]
colors = ["#b9dce9", "#94c8df", "#70b2d0", "#589aba", "#4386a8", "#367798", "#2c698d", "#245d81", "#205477", "#1d4c6e", "#194565", "#163e5c"]
archive = f"/vsizip/{source}"
shapes = []
for layer in sorted(fiona.listlayers(archive), key=lambda n: int(n.rsplit("_", 1)[1])):
    with fiona.open(archive, layer=layer) as features:
        for feature in features:
            depth = int(feature.properties["depth"])
            shapes.append((feature.geometry, depths.index(depth)))
transform = from_bounds(-180, -90, 180, 90, 8192, 4096)
classified = rasterize(shapes, out_shape=(4096, 8192), transform=transform, fill=0, dtype="uint8")
countries_file = root / "public/data/world/countries.geojson"
countries = json.loads(countries_file.read_text())
land = rasterize(((f["geometry"], 1) for f in countries["features"]), out_shape=classified.shape, transform=transform, fill=0, dtype="uint8")
classified[land == 1] = 255
del shapes, land
tile_size, max_zoom = 512, 4
size = tile_size * 2 ** max_zoom
extent = math.pi * 6378137
pixels = np.full((size, size), 255, dtype="uint8")
reproject(classified, pixels, src_transform=transform, src_crs="EPSG:4326", dst_transform=from_bounds(-extent, -extent, extent, extent, size, size), dst_crs="EPSG:3857", src_nodata=255, dst_nodata=255, resampling=Resampling.nearest)
del classified
world = Image.fromarray(pixels, mode="P")
palette = [int(color[i:i+2], 16) for color in colors for i in (1, 3, 5)]
world.putpalette(palette + [0] * (768 - len(palette)))
world.info["transparency"] = 255
count = 0
for zoom in range(max_zoom + 1):
    level = world.resize((tile_size * 2 ** zoom,) * 2, Image.Resampling.NEAREST)
    for x in range(2 ** zoom):
        directory = output / str(zoom) / str(x)
        directory.mkdir(parents=True, exist_ok=True)
        for y in range(2 ** zoom):
            level.crop((x * tile_size, y * tile_size, (x + 1) * tile_size, (y + 1) * tile_size)).save(directory / f"{y}.png", transparency=255, optimize=True)
            count += 1
    print(f"Prepared bathymetry zoom {zoom}", flush=True)
source_url = "https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-bathymetry/"
classes = [{"id": i, "name": f"{depth:,}–{depths[i+1]:,} m" if i + 1 < len(depths) else f"{depth:,}+ m", "color": colors[i], "minimumDepthMetres": depth} for i, depth in enumerate(depths)]
(output / "legend.json").write_text(json.dumps({"title": "Ocean depth · metres", "sourceName": "Natural Earth · SRTM Plus", "sourceUrl": source_url, "notice": "Approximate depth bands below sea level. Generalized world/regional reference; not a navigation chart or a live survey. Close zoom adds no detail.", "classes": classes}, indent=2) + "\n")
(output / "metadata.json").write_text(json.dumps({"title": "Natural Earth 1:10m bathymetric depth bands", "source": source_url, "download": "https://naciscdn.org/naturalearth/10m/physical/ne_10m_bathymetry_all.zip", "license": "Public domain", "licenseUrl": "https://www.naturalearthdata.com/about/terms-of-use/", "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(), "coastlineSha256": hashlib.sha256(countries_file.read_bytes()).hexdigest(), "preparedOn": date.today().isoformat(), "tileSize": tile_size, "minZoom": 0, "maxZoom": max_zoom, "tileCount": count, "projection": "EPSG:3857", "scheme": "XYZ", "depthThresholdsMetres": depths, "transformations": "Burn nested source depth polygons from shallowest to deepest into an 8192×4096 EPSG:4326 grid. Mask bundled country land, then reproject with nearest-neighbour sampling into local indexed PNG tiles. Index 255 is transparent. Colors represent depth intervals, not measured point depths.", "limitations": "Generalized depth polygons from SRTM Plus, with source cartographic buffering near coasts. Approximately 4.9 km source-grid sampling at the equator; no extra detail when overzoomed. Ridges, shelves, basins and trenches are represented by depth patterns, without individually named feature boundaries or 3D relief."}, indent=2) + "\n")
print(f"Prepared {count} local bathymetry tiles.")
