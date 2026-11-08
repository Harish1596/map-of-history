"""Prepare categorical local XYZ PNG tiles from a local ESA/C3S 2020 overview.

Requires rasterio, numpy, Pillow. Usage:
  python scripts/prepare-land-cover.py --download-overview /tmp/cover.tif
  python scripts/prepare-land-cover.py /tmp/cover.tif
Only the explicit --download-overview step accesses the network.
"""
import hashlib
import json
import math
from datetime import date
from pathlib import Path
import sys

import numpy as np
from PIL import Image
import rasterio
from rasterio.features import rasterize
from rasterio.transform import from_bounds
from rasterio.warp import reproject, Resampling

ROOT = Path(__file__).resolve().parent.parent
UPSTREAM = "https://data.naturalcapitalalliance.stanford.edu/download/global/esa_CCI/ESA-CCI-LULC-300m-P1Y-2020-v2.1.1.tif"
if sys.argv[1] == "--download-overview":
    with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR"):
        with rasterio.open(UPSTREAM) as source:
            data = source.read(1, out_shape=(8100, 16200), resampling=Resampling.nearest)
            profile = dict(driver="GTiff", dtype="uint8", width=16200, height=8100, count=1,
                           crs=source.crs, transform=from_bounds(*source.bounds, 16200, 8100),
                           compress="lzw", tiled=True, nodata=0)
            with rasterio.open(sys.argv[2], "w", **profile) as target:
                target.write(data, 1)
                target.update_tags(**source.tags())
    print("Saved local source overview.")
    sys.exit(0)

source_file = Path(sys.argv[1])
output = ROOT / "public/data/world/land-cover"
legend_file = output / "legend.json"
legend = json.loads(legend_file.read_text())
lookup = np.zeros(256, dtype="uint8")
palette = [0] * (256 * 3)
known = set()
for group in legend["classes"]:
    for code in group["codes"]:
        lookup[code] = group["id"]
        known.add(code)
    color = group["color"].lstrip("#")
    palette[group["id"] * 3:group["id"] * 3 + 3] = [int(color[i:i + 2], 16) for i in (0, 2, 4)]
countries_file = ROOT / "public/data/world/countries.geojson"
countries = json.loads(countries_file.read_text())
tile_size, max_zoom = 512, 5
extent = math.pi * 6378137
count = 0
with rasterio.open(source_file) as source:
    tags = source.tags()
    if tags.get("NC_GLOBAL#id") != "C3S-LC-L4-LCCS-Map-300m-P1Y-2020-v2.1.1":
        raise ValueError("Expected the 2020 C3S v2.1.1 classification")
    original = source.read(1)
    unmapped = sorted(set(np.unique(original).tolist()) - known)
    if unmapped:
        raise ValueError(f"Unknown classification codes: {unmapped}")
    classified = lookup[original]
    del original
    land = rasterize(((f["geometry"], 1) for f in countries["features"]),
                     out_shape=(source.height, source.width), transform=source.transform,
                     fill=0, dtype="uint8")
    classified[land == 0] = 255
    del land
    for zoom in range(max_zoom + 1):
        dimension = tile_size * 2 ** zoom
        pixels = np.full((dimension, dimension), 255, dtype="uint8")
        reproject(classified, pixels, src_transform=source.transform, src_crs=source.crs,
                  dst_transform=from_bounds(-extent, -extent, extent, extent, dimension, dimension),
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
        print(f"Prepared land-cover zoom {zoom}", flush=True)

metadata = {
    "title": "2020 C3S/ESA CCI land-cover classification, simplified global overview",
    "year": 2020, "productVersion": "2.1.1",
    "source": "https://climate.esa.int/en/projects/land-cover/data/",
    "upstream": UPSTREAM,
    "sourceProductId": tags["NC_GLOBAL#id"],
    "sourceResolutionMetres": 300, "overviewResolutionMetres": 2400,
    "localOverviewSha256": hashlib.sha256(source_file.read_bytes()).hexdigest(),
    "legendSha256": hashlib.sha256(legend_file.read_bytes()).hexdigest(),
    "coastlineSha256": hashlib.sha256(countries_file.read_bytes()).hexdigest(),
    "preparedOn": date.today().isoformat(),
    "attribution": "ESA Climate Change Initiative – Land Cover, led by UCLouvain; Copernicus Climate Change Service (2020). GeoTIFF mirror: Stanford Natural Capital Project. Modified: overview sampling, grouped classes, reprojection, coastline mask and custom colours.",
    "license": "EC C3S Land cover Data Policy / ESA CCI Land Cover terms; attribution required",
    "licenseUrl": "https://cds.climate.copernicus.eu/licences/satellite-land-cover",
    "sourceLicenseTag": tags.get("NC_GLOBAL#license"),
    "projection": "EPSG:3857", "scheme": "XYZ", "tileSize": tile_size,
    "minZoom": 0, "maxZoom": max_zoom, "tileCount": count, "unmappedCodes": unmapped,
    "transformations": "Read the hosted classification through its existing overviews into a local 16200×8100 EPSG:4326 grid using nearest-neighbour sampling; group original LCCS codes according to legend.json; mask oceans with the bundled country outlines; reproject with nearest-neighbour sampling into lossless indexed PNG tiles. Palette index 255 is transparent, 0 is no data. No averaging of categorical codes.",
    "limitations": "Modern 2020 classification, not historical vegetation or live data. The global overview has approximately 2.4km north/south sampling at the equator; it does not preserve native 300m detail, small cover patches or reliable area totals. Grouped classes omit original subclass detail. Higher zooms enlarge existing pixels. Source classification and generalized coastlines may disagree near shorelines. Natural Earth rivers/lakes are reference overlays, not observations of 2020 land cover.",
}
(output / "metadata.json").write_text(json.dumps(metadata, indent=2) + "\n")
print(f"Prepared {count} local land-cover tiles.")
