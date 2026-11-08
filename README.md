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
The map has no title plaque covering the upper-left corner.

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
