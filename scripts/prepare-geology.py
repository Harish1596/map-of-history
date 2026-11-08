"""Build categorical geology tiles from the authors' GLiM GIS archive.

Requires fiona, rasterio, numpy, Pillow. No networking is performed.
  python scripts/prepare-geology.py --rasterize archive.zip /tmp/glim.tif
  python scripts/prepare-geology.py /tmp/glim.tif
"""
import hashlib
import json
import math
from collections import Counter
from datetime import date
from itertools import islice
from pathlib import Path
import sys
import zipfile

import fiona
from fiona.transform import transform_geom
import numpy as np
from PIL import Image
import rasterio
from rasterio.features import rasterize
from rasterio.transform import from_bounds
from rasterio.warp import reproject, Resampling

root = Path(__file__).resolve().parent.parent
output = root / "public/data/world/geology"
legend_file = output / "legend.json"
legend = json.loads(legend_file.read_text())
ids = {group["code"]: group["id"] for group in legend["classes"]}
countries_file = root / "public/data/world/countries.geojson"
countries = json.loads(countries_file.read_text())
def sha(path):
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()

if sys.argv[1] == "--rasterize":
    archive = Path(sys.argv[2]).resolve()
    with zipfile.ZipFile(archive) as zipped:
        gdb_name = next(n.split("/")[0] for n in zipped.namelist() if ".gdb/" in n)
    # GDAL reads the original archive directly, without exporting huge GeoJSON.
    path = f"zip://{archive}!{gdb_name}"
    with fiona.open(path, layer="GLiM_export") as source:
        width, height = 32768, 16384
        transform = from_bounds(*source.bounds, width, height)
        grid = np.zeros((height, width), dtype="uint8")
        counts = Counter()
        features = iter(source)
        while batch := list(islice(features, 8192)):
            shapes = []
            for feature in batch:
                code = feature["properties"]["xx"]
                if code not in ids:
                    raise ValueError(f"Unrecognized GLiM code: {code}")
                if not feature.geometry:
                    raise ValueError("Missing source geometry")
                counts[code] += 1
                shapes.append((feature.geometry, ids[code]))
            rasterize(shapes, out=grid, transform=transform, skip_invalid=False)
            if sum(counts.values()) // 100000 != (sum(counts.values()) - len(batch)) // 100000:
                print(f"Rasterized {sum(counts.values())} / {len(source)} polygons", flush=True)
        land = rasterize(((transform_geom("EPSG:4326", source.crs, f["geometry"]), 1) for f in countries["features"]),
                         out_shape=(height, width), transform=transform, fill=0, dtype="uint8")
        grid[land == 0] = 255
        del land
        with rasterio.open(sys.argv[3], "w", driver="GTiff", width=width, height=height,
                           count=1, dtype="uint8", crs=source.crs, transform=transform,
                           tiled=True, compress="lzw", nodata=255) as target:
            target.write(grid, 1)
            target.update_tags(sourceSha256=sha(archive), coastlineSha256=sha(countries_file),
                               classCounts=json.dumps(dict(counts)), featureCount=str(sum(counts.values())),
                               classIds=json.dumps(ids), sourceVersion="GLiM 1.1 / LiMW GIS 2015")
    print("Saved local geology classification raster.", flush=True)
    sys.exit(0)

source_file = Path(sys.argv[1])
palette = [0] * 768
for group in legend["classes"]:
    color = group["color"].lstrip("#")
    palette[group["id"] * 3:group["id"] * 3 + 3] = [int(color[i:i + 2], 16) for i in (0, 2, 4)]
tile_size, max_zoom = 512, 6
extent = math.pi * 6378137
count = 0
with rasterio.open(source_file) as source:
    tags = source.tags()
    if json.loads(tags["classIds"]) != ids or tags["coastlineSha256"] != sha(countries_file):
        raise ValueError("Rasterize again after class ID or coastline changes")
    for zoom in range(max_zoom + 1):
        size = tile_size * 2 ** zoom
        pixels = np.full((size, size), 255, dtype="uint8")
        reproject(rasterio.band(source, 1), pixels,
                  dst_transform=from_bounds(-extent, -extent, extent, extent, size, size),
                  dst_crs="EPSG:3857", src_nodata=255, dst_nodata=255, resampling=Resampling.nearest)
        level = Image.fromarray(pixels).convert("P")
        level.putpalette(palette)
        for x in range(2 ** zoom):
            directory = output / str(zoom) / str(x)
            directory.mkdir(parents=True, exist_ok=True)
            for y in range(2 ** zoom):
                tile = level.crop((x * tile_size, y * tile_size, (x + 1) * tile_size, (y + 1) * tile_size))
                tile.save(directory / f"{y}.png", transparency=255, optimize=True)
                count += 1
        del pixels, level
        print(f"Prepared geology zoom {zoom}", flush=True)
    grid_metres = [abs(source.transform.a), abs(source.transform.e)]

(output / "metadata.json").write_text(json.dumps({
    "title": "GLiM surface lithology, categorical global overview",
    "sourceVersion": tags["sourceVersion"],
    "source": legend["sourceUrl"],
    "archive": "https://www.dropbox.com/s/9vuowtebp9f1iud/LiMW_GIS%202015.gdb.zip?dl=1",
    "publisher": "https://www.ccgm.org/en/product/lithological-map-of-the-world/",
    "citations": ["Hartmann, J. & Moosdorf, N. (2012), doi:10.1029/2012GC004370", "Moosdorf, N. & Hartmann, J. (2015), doi:10.14682/2015LMWP"],
    "rights": "© CCGM-CGMW 2015; original GIS archive publicly linked by the authors and publisher.",
    "rightsUrl": "https://www.ccgm.org/en/licence-agreement-for-the-digital-maps-of-the-commission-for-the-geological-map-of-the-world/",
    "sourceSha256": tags["sourceSha256"], "classificationRasterSha256": sha(source_file),
    "legendSha256": sha(legend_file), "coastlineSha256": tags["coastlineSha256"],
    "featureCount": int(tags["featureCount"]), "sourceClassCounts": json.loads(tags["classCounts"]),
    "rasterGridSpacingMetres": grid_metres,
    "preparedOn": date.today().isoformat(), "projection": "EPSG:3857", "scheme": "XYZ",
    "tileSize": tile_size, "minZoom": 0, "maxZoom": max_zoom, "tileCount": count,
    "transformations": "Read GLiM_export first-level xx rock classes from the authors' original GIS archive. Rasterize all polygons at pixel centres into a 32768×16384 Eckert IV categorical grid. Apply the bundled country coastline mask. Reproject using nearest-neighbour sampling into lossless indexed PNG XYZ tiles. Index 0 is no data, 255 is transparent ocean. Preserve all 16 source classes; use custom legend colours.",
    "limitations": "Surface lithology, not geological age, tectonic boundaries, a subsurface section or a medieval reconstruction. Compilation scales vary by region (reported average approximately 1:3,750,000); some boundaries reflect source-map differences. Rasterization omits subpixel units. Zooming beyond native zoom 6 adds no detail. Ice/water indicate cover, not underlying rock. Reference rivers, lakes and shorelines can differ from GLiM boundaries.",
}, indent=2) + "\n")
print(f"Prepared {count} local geology tiles.")
