# Interactive world map

A static proof of concept for exploring present-day geography. The home screen
is a full-screen classroom map: sage countries, clear borders and country names,
with pan, zoom and reset controls. Next.js exports the app as local static files.

Drag to pan; scroll, pinch or use the buttons to zoom. Focus the map to use arrow
keys and plus/minus. Country labels avoid overlap and smaller-country names appear
as space allows when zooming. Reset world view fits the world to the current screen.

## Local map data

`public/data/world/countries.geojson` contains 242 country and territory features
from Natural Earth 1:50m Admin-0 countries. `labels.geojson` uses the source's label
positions and English map labels. All map geometry and the Noto Sans font are
served locally; the app makes no runtime requests to external services.

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
