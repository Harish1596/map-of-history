# Historical events map

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Students and educators using the map for learning. The primary audience was
confirmed by the project owner. Specific age groups, curriculum needs, and
classroom workflows remain undecided.

## Product Purpose

Make historical events explorable through geography, chronology, and their
connections. The long-term ambition covers humanity's past; the current proof
of concept starts with present-day world geography. Historical events, causal
links and citations remain longer-term goals.

Success for this phase means a full-screen world map with country names and
borders, reliable pan and zoom, and a reset to the world overview. The user
selected the classroom-screen preview with sage land and strong borders.
The map must pan continuously east/west and constrain the viewport at both poles.
The user subsequently replaced the 2×-overview limit with a Google Maps–style
close-up range. The app caps at MapLibre zoom 21, equivalent in pixel scale to
Google's documented 256px-tile zoom 22; the local country dataset remains coarse.

## Operating Context

The proof of concept is evaluated locally in a desktop or mobile web browser.
The current interface is a flat world map with zoom and reset controls. Country
names become visible as space allows while zooming.
Regional zoom also shows named islands and archipelagos within countries, using
a separate physical-name dataset rather than treating them as sovereign states.

## Capabilities and Constraints

- Preserve Next.js and the static-export approach. The existing application uses
  React, TypeScript, and MapLibre.
- Use local GeoJSON and raster tiles for geography. No
  runtime APIs, databases, remote map tiles, or external data services in this
  phase. Explicit source links may open external publications.
- Track conflicts through the locations of battles and related events.
- Make event details and onward connections interactive, with clearly cited
  sources for events and explanations of relationships.
- Distinguish chronological sequence from supported causal relationships.
- Communicate uncertain dates, approximate locations, and schematic battlefield
  anchors. Do not present editorial coordinates as surveyed historical sites.
- Keep markers geographically anchored while panning and zooming. Group events
  sharing a location so learners can choose among them.
- Broader historical coverage, publishing, accounts, and data infrastructure
  beyond the proof of concept remain undecided.

## Evidence on Hand

- Present-day country and territory geography lives in `public/data/world/`,
  derived from Natural Earth 1:50m Admin-0 country data. The default boundaries
  follow Natural Earth's de facto convention; the dataset is a generalized
  snapshot, not live political data or a count of sovereign states.
- `public/data/world/island-labels.geojson` adds selected named islands and island
  groups from Natural Earth's 1:10m geographic regions. Source details and coverage
  limitations are recorded in `island-metadata.json`; not every islet is named.
- `README.md` records the current workflow and limitations; the tests in
  `tests/` check geographic datasets, styling and camera constraints.

## Product Principles

1. Connect place, sequence, and explanation to support learning.
2. Make historical claims traceable to sources.
3. Show uncertainty and source limitations alongside the relevant content.
4. Prove the map and navigation with local data before adding infrastructure.

## First historical interval

The country timeline now offers 31 December snapshots for 2000–2006, alongside
Present day. It supports the Timor-Leste and Serbia–Montenegro state transitions
with sourced historical geometry and period names. Historical boundaries come
from CShapes 2.0 with explicitly identified reference supplements; several small
border settlements remain documented without separate before/after geometry.
Later historical years and a complete boundary audit remain future work. Physical
geography stays a modern reference. Source notes disclose the distinction and the
historical adaptation's CC BY-NC-SA 4.0 licence.
