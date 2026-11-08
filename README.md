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
map labels. Label positions are calculated offline using Polylabel to
find a visual interior center in each country's largest Mercator-projected
landmass, avoiding holes and offshore centroids. All map geometry and the Noto Sans font are
served locally; the app makes no runtime requests to external services.

Labels are centered on those anchors. `public/data/world/country-labels.json`
lists every country/territory with approximate geographic area, minimum zoom,
size tier and collision priority. The app fetches this list and applies it to
the label points; editing its values takes effect on refresh. Regenerating data
rebuilds the list from the policy in `scripts/lib/country-label-policy.mjs`.

Areas are geodesic measurements of the generalized source geometry, including
holes and all polygon parts, rather than official country-area statistics.
Larger areas receive priority when labels compete. These bands control when a
name becomes eligible; collision detection can delay it until there is room:

| Geographic area | Minimum MapLibre zoom |
| --- | --- |
| 1,000,000 km² and above | 0 |
| 250,000–999,999 km² | 1 |
| 50,000–249,999 km² | 2 |
| 10,000–49,999 km² | 3 |
| 2,000–9,999 km² | 4 |
| 200–1,999 km² | 5 |
| Below 200 km² | 6 |

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

The application uses no database or runtime API. Historical records live in
`public/data/antioch`, while geographic layers live in its `geometry` folder.
Event records, places, relations, citations and sources pass through the Zod
schemas in `src/data/schemas.ts`, including cross-reference validation.

The regional basemap under `public/data/antioch/basemap` is a cropped local
copy of public-domain [Natural Earth](https://www.naturalearthdata.com/) data.
It provides geographic context only; researched medieval features remain in
the separate `geometry` files. The browser does not contact Natural Earth or a
map-tile service at runtime.

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

## Archived Antioch prototype

The previous historical map is retained in `src/components/AntiochExperience.tsx`,
its companion components and `public/data/antioch/`. Its stylesheet is archived
in `src/styles/antioch-legacy.css`. These do not load on the world-map home screen.
The following describes those retained records and their limitations.

Nine episodes run from the October 1097 arrival to the June 1098 citadel
surrender. Select an episode on the timeline, use Previous/Next, or follow
the event panel's “What follows” link. Each relation explains whether it is
chronological or causal and includes its supporting citations.

Click a map marker to choose among events at that location. Events sharing
Antioch use one marker rather than overlapping points. “Locate selected event”
restores the selected location after panning. Event URLs can be shared using
`?event=event-capture`; browser Back/Forward restores earlier selections.

Source links open the original online publication; browsing the app itself
requires no external requests. The initial source selection consists of Latin
crusader narratives hosted by Fordham University and Dickinson College, with
editorial commentary. It is not a balanced survey of all historical perspectives.

Dates with uncertainty are displayed as ranges. Battlefield points are schematic
editorial anchors, not surveyed coordinates. City-level events do not imply a
known location for a particular tower, church or citadel. The empty medieval
geometry files remain empty until those features can be responsibly sourced.
No precise troop routes are asserted by the story links.

Data tests require Node 22.6+ (TypeScript stripping); Node 22.19+ is recommended.
