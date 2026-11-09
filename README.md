# Interactive world map

A static proof of concept for exploring present-day geography. The home screen
is a full-screen classroom map: sage countries, clear borders and country names,
with pan, zoom and reset controls. Next.js exports the app as local static files.

Drag to pan; scroll, pinch or use the buttons to zoom. Focus the map to use arrow
keys and plus/minus. Country labels avoid overlap and smaller-country names appear
as space allows when zooming. Reset world view fits the world to the current screen.

The map wraps seamlessly east/west across the date line. Zooming out stops when
the world fills both viewport dimensions, preventing repeated whole worlds and
space beyond the polar edges. North/south panning stops at the viewport's top
and bottom boundaries. Portrait screens show a narrower longitude range so the
map fills their height. Maximum zoom is **MapLibre level 21**, matching the
pixel scale of Google's documented 256px-tile zoom level 22. This replaces the
earlier 2×-overview restriction and applies to wheel, pinch, keyboard and buttons.
The close-up cap stays fixed while the minimum adapts to viewport size.
Google Maps is a scale/interaction reference only; no Google services are loaded.
Our generalized country data does not add streets or buildings at closer zoom.

Reference: [Google's documented 2D tile zoom range](https://developers.google.com/maps/documentation/tile/2d-tiles-overview)
and [pixel coordinate scale](https://developers.google.com/maps/documentation/javascript/coordinates).

## Local map data

`public/data/world/countries.geojson` contains 242 country and territory features
from Natural Earth 1:50m Admin-0 countries. `labels.geojson` uses its English
map labels. Label positions are calculated offline as
the area-weighted visual center of each country's largest Mercator-projected
landmass, subtracting holes. When this center falls outside land, an interior
Polylabel fallback keeps the anchor inside its borders. All map geometry and the Noto Sans font are
served locally; the app makes no runtime requests to external services.

Labels are centered on those anchors. `public/data/world/country-labels.json`
lists every country/territory with approximate geographic area, minimum zoom,
Natural Earth label rank, size tier and collision priority. The app fetches this list and applies it to
the label points; editing its values takes effect on refresh. Regenerating data
rebuilds the list from the policy in `scripts/lib/country-label-policy.mjs`.

Areas are geodesic measurements of the generalized source geometry, including
holes and all polygon parts, rather than official country-area statistics.
Natural Earth `LABELRANK` controls the fixed collision order, with descending
geographic area and identifier as tie-breakers. The same rank becomes eligible
together, so higher-priority ranks are eligible before lower-priority ranks.
Placement does not depend on which names appeared first during navigation.
These app-specific thresholds are not a reproduction of Google or Mapbox's
proprietary basemaps. Labels remain centered with collision avoidance enabled:

| Natural Earth label rank | Minimum MapLibre zoom |
| --- | --- |
| 1–2 | 0 |
| 3 | 3 |
| 4 | 4 |
| 5 | 5 |
| 6 | 6 |
| 7 | 7 |

Côte d’Ivoire and Ghana become eligible at zoom 3; Central African Republic
at zoom 4, after South Sudan at zoom 3. Eligibility does not guarantee placement
until enough screen space is available. Source `MIN_LABEL` remains in the data
for reference; individual country thresholds do not override the rank bands.

Text size also follows the geographic size tier and grows in screen pixels throughout
zoom levels 0–8; the label font does not stop growing at regional zoom levels.
The map has no title plaque. A compact mode switch occupies the upper-left corner.

### Standard and Physical Geography modes

**Standard** shows country borders and country names. **Physical Geography**
shows rivers, lakes and natural-feature names, including mountain ranges,
deserts, plateaus and plains. Island names remain available in both modes.
Political borders and country labels are hidden in the physical view. Switching
preserves the current location and zoom.

The physical layers load only when first selected, from local GeoJSON in
`public/data/world/physical/`, and remain cached for subsequent switches.
Failed loads have a retry action; Standard remains usable.

The bundled Natural Earth 1:10m datasets contain 1,454 river features,
1,355 lake features and 1,127 lake/landform labels. Zoom eligibility follows
source guidance; major rank-1/2 landforms become eligible at world-view zooms
0/1. Collision detection determines which eligible names have space to appear.
River names follow their lines; lake and landform names use interior anchors.
Source URLs, checksums, licensing and preparation details are recorded in
`public/data/world/physical/metadata.json`.

Physical Geography also includes locally tiled **shaded relief with elevation-based
colours**, showing mountain ridges, valleys and plateaus beneath the names and
water features. These are Natural Earth's cross-blended hypsometric tints with
shaded relief: colours vary with both elevation and geographic region, so there
is no single numerical elevation colour scale. Lighting is baked into the imagery;
this is a top-down relief map, with no 3D terrain or tilt.

The relief tiles live in `public/data/world/relief/` (512px WebP, Web Mercator XYZ,
native zooms 0–4). They load only in Physical Geography and are enlarged at closer
zooms without introducing new terrain detail. The existing ocean stays visible
through a transparency mask derived from the bundled country outlines.
The source archive checksum, coastline checksum, transformation details and
licensing are in `public/data/world/relief/metadata.json`.

To regenerate the relief tiles, use a Python environment with `rasterio`, `numpy`
and `Pillow`, then run:

```bash
python scripts/prepare-relief.py /path/to/HYP_LR_SR.zip
```

The preparation script does not make network requests. Its source is
[Natural Earth's cross-blended shaded relief](https://www.naturalearthdata.com/downloads/10m-raster-data/10m-cross-blend-hypso/).

The physical layers do not include every waterway or landform. Lake extents are
not current water levels, and the finer 1:10m data may differ slightly from the
existing 1:50m coastal outlines. Regenerate from downloaded source files with:

```bash
node scripts/prepare-physical-data.mjs /path/to/ne_10m_rivers_lake_centerlines.geojson /path/to/ne_10m_lakes.geojson /path/to/ne_10m_geography_regions_polys.geojson
```

### Ocean names in Standard

The Standard map labels the Arctic, Atlantic, Indian, Pacific and Southern
oceans. Atlantic and Pacific use separate North/South source regions, producing
seven offshore anchors. The names come from Natural Earth's marine label areas;
interior anchors are calculated offline and track the map camera and world wrap.
Ocean labels use muted blue ink and receive first placement priority. Their
names stay visible when their anchors are on screen; sea and other labels yield
when they compete for the same space.
They are eligible from the world overview onward and remain eligible at closer
zooms when their anchors are in view. Polar names require panning into their
regions. Ocean names are available in both Standard and Physical Geography.

The tiny local dataset is `public/data/world/ocean-labels.geojson`; source,
licensing, checksum and preparation details are in `ocean-metadata.json`.
Regenerate from the same marine source used for coastal names:

```bash
node scripts/prepare-ocean-labels.mjs /path/to/ne_10m_geography_marine_polys.geojson
```

### Seas, bays and gulfs in Standard

The Standard map labels 192 marine waters: 71 seas, 60 bays and 61 gulfs. These
include the Mediterranean, Black, Red, Caribbean, Caspian, Baltic and North seas,
Bay of Bengal, Gulf of Mexico and Persian Gulf. Major waters are eligible at
zoom 1; smaller waters follow source-guided minimum zooms 4–7.
Country and island names retain collision priority. Labels persist at closer
zooms when their anchors are visible and there is space to place them.

`public/data/world/sea-labels.geojson` contains the named anchors, and
`sea-metadata.json` records source/checksums and preparation details. Anchors
are placed inside source marine label regions and checked against the bundled
country outlines. If an interior anchor falls on an island, the preparation
chooses a nearby water point inside the same region. Names stay centered on
these anchors with a five-em wrapping width; they yield when there is insufficient
room rather than shifting toward land. Names are shown in Standard
and Physical Geography. Source classes determine inclusion, preserving
the distinction between seas, bays and gulfs. This is selected coverage; label
regions do not define maritime borders.

```bash
node scripts/prepare-sea-labels.mjs /path/to/ne_10m_geography_marine_polys.geojson
```

### Physical island names

Country labels do not name every island within a country. A separate local layer
in `public/data/world/island-labels.geojson` adds 425 named islands and archipelagos
from Natural Earth's 1:10m geographic regions. Corsica, Sardinia, Sicily and the
Balearic Islands appear in regional views; individual Balearic island names
appear as you zoom closer. Country labels retain collision priority.

Island labels start at zoom 3 or later, using size and source label guidance.
Archipelago names yield to individual names after two levels, never before zoom 6.
Matching country names are omitted to avoid duplicate labels. This is a selected
named-region dataset, not coverage of every islet. Its finer label detail does
not change the underlying 1:50m outlines.

Source, license, preparation details and checksum are recorded in
`public/data/world/island-metadata.json`. Rebuild the local labels with:

```bash
node scripts/prepare-island-labels.mjs /path/to/ne_10m_geography_regions_polys.geojson
```

### Coastal features

Physical Geography adds a subtle coastline outline and 432 coastal labels:
peninsulas/headlands, named coasts, capes, isthmuses, bays, gulfs, straits,
channels, sounds, fjords, lagoons and inlets. Cape dots mark source locations;
other labels use interior anchors in Natural Earth's approximate label regions.
Water names use blue ink; coastal land names use the existing landform ink.
Labels become eligible at source-guided zooms 2–10 and remain eligible at closer
zooms, subject to collision avoidance. These layers are hidden in Standard.

`public/data/world/physical/coasts.geojson` bundles 1,428 coastline segments
and the coastal label points. It loads and caches alongside the other physical
datasets. `coasts-metadata.json` records source URLs, checksums and limitations.
Namesakes in different places are retained; matching labels are deduplicated
only when geographically close. The 1:50m coastline matches the base map's scale;
the 1:10m feature locations can differ slightly from its generalized shoreline.
This is selected present-day coverage, not every coastal feature or a historical
coast reconstruction. Label-region polygons are placement aids and are not drawn
as surveyed feature boundaries.

Regenerate from downloaded Natural Earth files with:

```bash
node scripts/prepare-coastal-data.mjs /path/to/ne_10m_geography_regions_polys.geojson /path/to/ne_10m_geography_regions_points.geojson /path/to/ne_10m_geography_marine_polys.geojson /path/to/ne_50m_coastline.geojson
```

### Land cover

In **Physical Geography**, choose **Land cover · 2020** to replace the relief
colours with classified surface cover. The collapsible legend explains 12
grouped categories plus no data. Coastlines, names and reference waterways
remain above the classification. Choose **Terrain relief** to restore relief.
The radio group offers one surface at a time: Terrain relief, Land cover or Rock
types. Controls preserve the camera; the selection survives switching map modes.

This is a **modern 2020 reference, not historical vegetation**. The source is
the ESA CCI / Copernicus Climate Change Service land-cover product v2.1.1, led
by UCLouvain, accessed through Stanford Natural Capital Project's GeoTIFF mirror.
Source LCCS codes are grouped by the checked-in `legend.json` into tree cover,
shrubs, grass, crops, mixed cover, wetlands/flooded cover, sparse vegetation,
bare ground, built-up areas, snow/ice, water and moss/lichen.

The original product is 300m; this compact global overview samples a 16200×8100
grid (about 2.4km north/south spacing at the equator). It does not preserve native
300m detail or small patches/individual fields and buildings. It is unsuitable
for calculating class areas or treating close-up pixels as surveyed boundaries.

`public/data/world/land-cover/` contains 1,365 lossless indexed PNG tiles at
native Web Mercator zooms 0–5, a JSON legend and provenance metadata. Tile pixels
use the categorical palette and nearest-neighbour resampling, without averaging
codes or smoothing colours into invented classes. Higher zooms enlarge the same
pixels. Ocean areas are transparent. Natural Earth water overlays are geographic
references, not observations of 2020 cover. Tiles load only when enabled, with
no runtime external requests. Metadata records source/product identification,
source policy and credit, overview/legend/coastline checksums and transformations.

With the same Python raster tooling as relief, regenerate in two explicit steps:

```bash
# Download an overview from the public GeoTIFF using range requests.
python scripts/prepare-land-cover.py --download-overview /tmp/land-cover-2020.tif
# Prepare the app assets locally, with no network requests.
python scripts/prepare-land-cover.py /tmp/land-cover-2020.tif
```

### Geology: rock types

Choose **Physical Geography → Rock types** to view surface lithology from GLiM
v1.1, using the original **LiMW GIS 2015** archive linked by the University of
Hamburg and CCGM-CGMW. The legend retains all 16 first-level source classes:
unconsolidated sediments; siliciclastic, mixed and carbonate sedimentary rocks;
evaporites; pyroclastics; silica-rich/intermediate/silica-poor volcanic and
plutonic rocks; metamorphic rocks; water; ice; and no data. Brief class descriptions
are available as legend-entry tooltips. Changing the surface never moves the map.

The preparation reads all **1,235,259 source polygons**, rasterizes them at pixel
centres into a 32768×16384 Eckert IV classification grid, masks the ocean with
the bundled country geometry and generates 5,461 local, lossless indexed PNG
tiles at native Web Mercator zooms 0–6. Source class IDs are preserved; colours
come from `public/data/world/geology/legend.json`. Categorical nearest-neighbour
rendering avoids blending rock classes. Tiles load only when Rock types is chosen.

This is a compiled surface-lithology reference. It does not show geological age,
subsurface sections, faults or tectonic plates. Regional source scales vary
(reported average approximately 1:3,750,000); some boundaries reflect different
source maps. The roughly kilometre-spaced preparation grid omits subpixel units,
and closer zoom does not create more detail. Water/ice classes describe cover,
without inferring the rock beneath them. Generalized reference shorelines and
water features may differ from GLiM's boundaries.

The original archive and intermediate raster stay outside the app. Source links,
archive/raster/legend/coastline checksums, class counts, source credit, rights
notices and transformations are recorded in `public/data/world/geology/metadata.json`.
The on-map GLiM credit links to the authors' dataset page. Source publications:
[Hartmann & Moosdorf (2012)](https://doi.org/10.1029/2012GC004370) and
[Moosdorf & Hartmann (2015)](https://doi.org/10.14682/2015LMWP).

With `fiona`, `rasterio`, `numpy` and `Pillow` in a Python environment, regenerate
from the downloaded original archive without network access:

```bash
python scripts/prepare-geology.py --rasterize /path/to/LiMW_GIS-2015.gdb.zip /tmp/geology.tif
python scripts/prepare-geology.py /tmp/geology.tif
```

Provenance, source checksum, preparation date and boundary limitations are in
`public/data/world/metadata.json`. The data uses Natural Earth's default de facto
boundaries, includes territories and disputed areas, and is a generalized snapshot
rather than live political data. The on-map “Map data” disclosure explains this.

To regenerate the checked-in records from a downloaded copy of the source file:

```bash
node scripts/prepare-world-data.mjs /path/to/ne_50m_admin_0_countries.geojson
```

This preparation script does not make network requests. The bundled font's SIL
Open Font License is stored in `public/fonts/OFL-NotoSans.txt`.

## Development

```bash
npm install
npm run dev
```

The application uses no database or runtime API. Geographic assets live in
`public/data/world/` and load from local files.

## Checks

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

`npm run build` produces a static export in `out/`.

To preview that production export locally:

```bash
npm start
```

The preview server uses only Node.js built-ins. Set `STATIC_HOST` or
`STATIC_PORT` to override its default `127.0.0.1:3000` address.

Data tests require Node 22.6+ (TypeScript stripping); Node 22.19+ is recommended.

### Underwater geography

Physical Geography includes Natural Earth 1:10m bathymetry, derived from SRTM
Plus, beneath all three land surfaces. Twelve depth bands run from 0–200 m to
10,000+ m below sea level. Shelves, basins, ridges and trenches are represented
through depth patterns; there are no individually named seafloor-feature layers
or 3D underwater relief. Ocean and sea names are available in both map modes.

The source is https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-bathymetry/
(public domain). Local metadata records source and coastline checksums.
`public/data/world/bathymetry/legend.json` supplies the depth legend. The 341
indexed PNG tiles cover zooms 0–4; closer views enlarge those tiles. The source
classification is generalized; approximately 4.9 km preparation-grid sampling
at the equator does not imply survey accuracy. Standard retains flat blue water.

Regenerate offline with the existing Python geospatial environment:

```bash
python scripts/prepare-bathymetry.py /path/to/ne_10m_bathymetry_all.zip
```

### Physical landmarks and tectonics

The Features disclosure independently switches six categories. Symbols, labels
and plate boundary lines can be selected for source links, source-record
elevations and geographic limitations. Choices persist across surface/mode
switches. Standard hides these physical layers. All data loads from local files.

| Category | Bundled coverage | Source |
| --- | --- | --- |
| Mountain peaks | 558 standalone summits, plus 74 merged volcano summit records | Natural Earth elevation points |
| Volcanoes | 1,214 Holocene catalogued volcanic systems | Smithsonian GVP v5.4.0, 7 Aug 2026 |
| Named forests | 15 selected forest/ecoregion locations | Wikidata, CC0 |
| Canyons | 14 selected named locations | Wikidata, CC0 |
| Undersea names | 5,311 unique gazetteer features | IHO–IOC GEBCO Gazetteer; IHO DCDB / NOAA NCEI |
| Tectonics | 52 plate labels; 1,700 classified contiguous boundary lines representing 5,824 source steps | PB2002, Peter Bird; Hugo Ahlenius / Nordpil, ODC-By 1.0 |

Metadata files in `public/data/world/physical/` preserve source URLs, checksums,
versions, acknowledgements and transformation details. Individual features have
source links. Gazetteer terms are recorded separately from the GEBCO bathymetric
grid licence; the two are not assumed interchangeable.

Forests, canyons and undersea features are label locations, not invented region
polygons. Coverage of forests/canyons is a selected starting collection. Natural
Earth summit elevations can predate newer measurements. GVP includes volcanic
fields, calderas and submarine systems; catalogue membership does not indicate
current activity. PB2002 is an approximate modern plate model published in 2003,
not an exhaustive fault map, earthquake hazard assessment or medieval geography.

Preparation scripts run offline against downloaded source snapshots:

```bash
node scripts/prepare-summits.mjs /path/to/elevation-points.geojson /path/to/gvp-holocene.geojson
node scripts/prepare-named-landmarks.mjs /path/to/source-directory
node scripts/prepare-tectonics.mjs /path/to/PB2002_steps.json /path/to/PB2002_plates.json
```

The named-landmark source directory contains the two Wikidata entity snapshots
(`named-regions-wikidata.json`, `named-regions-extra-wikidata.json`) and complete
GEBCO GeoJSON exports (`undersea-0.geojson`, `undersea-1.geojson`,
`undersea-2.geojson`). GEBCO service exports must be paginated to obtain all
records. Runtime never contacts any of these preparation-time services.

### Country timeline · 2000–2006

The compact timeline selects a **31 December** country snapshot for each year
from 2000 through 2006. **Present day** restores the existing Natural Earth map.
The camera, zoom, physical surface and feature selections stay in place. Keyboard
users can focus the year radio group and use arrow keys to change years. Year
notes & sources explains each year's researched changes and geometry coverage.
Historical data loads once, on demand, from local files; failed loads retain the
previous map and offer **Retry year**. No later historical years are enabled yet.

Historical political borders and labels use **CShapes 2.0**, Gleditsch–Ward coding,
by Schvitz, Rüegger, Girardin, Cederman, Weidmann and Gleditsch (2022),
[dataset and publication](https://icr.ethz.ch/data/cshapes/). The historical
adaptation is distributed under **[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)**,
including its noncommercial and share-alike conditions; this differs from the
public-domain Natural Earth reference data. Source, attribution, source/output
checksums, corrections and limitations live in
`public/data/world/history/metadata.json`.

This is a **selected historical reconstruction**, not a complete annual border
atlas. CShapes does not encode every researched small boundary settlement.
`changes.json` distinguishes changes shown on the map from source-baseline or
chronology-only events. In particular, the Bahrain–Qatar, Eritrea–Ethiopia,
Cameroon–Nigeria, Kazakhstan–Uzbekistan, Benin–Niger, Poland–Slovakia and
Indonesia–Timor-Leste boundary settlements have no separate year-specific
geometry in this milestone. Treaty dates, legal decisions and staged handovers
are not treated as interchangeable.

The snapshots show UN-administered East Timor in 2000–2001 and independent
Timor-Leste from 2002; Yugoslavia through 2002, Serbia and Montenegro in 2003–2005,
and separate Serbia and Montenegro in 2006. Historical Sudan, Serbia and Ukraine
use their earlier source outlines. Names include Swaziland and Macedonia.
Source date codes for the June 2006 state transitions differ from official
proclamation dates; this does not affect year-end membership. Supplementary
small-country and territory outlines use modern Natural Earth reference geometry
and are not independently date-verified. The Netherlands Antilles uses only the
mapped Curaçao and Sint Maarten components and omits other islands.

Country border sources change independently of the base land fill. Coastlines,
marine/island names, land cover, relief, geology and physical landmarks remain
modern reference layers; selecting a year does not reconstruct those features.
Differences between source coastlines and territorial conventions can be visible.

Download the [official CShapes GeoJSON](https://icr.ethz.ch/data/cshapes/CShapes-2.0.geojson)
outside the repository, then regenerate the historical geometry and metadata offline:

```bash
node scripts/prepare-country-history.mjs /path/to/CShapes-2.0.geojson
```

The curated source chronology in `changes.json` is maintained separately. The
preparation keeps source polygons, assigns stable version identifiers, computes
interior visual-centroid labels and uses the established label-rank policy.
