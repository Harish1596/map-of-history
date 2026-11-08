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
of concept focuses on the Siege of Antioch during the First Crusade, 1097–1098.

Success for this phase means a working map and interactions: learners can locate
events, inspect their details and sources, and follow a clickable connection to
the next event.

## Operating Context

The proof of concept is evaluated locally in a desktop or mobile web browser.
The current interface synchronizes a map, event timeline, and detail panel.
Learners can select a location, choose an event, follow its next-event link, or
move through the chronology with Previous/Next. Event URLs preserve selection
and support browser Back/Forward.

## Capabilities and Constraints

- Preserve Next.js and the static-export approach. The existing application uses
  React, TypeScript, MapLibre, and Zod.
- Use local JSON for historical records and local GeoJSON for geography. No
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

- Nine connected Antioch episodes, their places, relationships, citations, and
  sources live in `public/data/antioch/`.
- Local regional basemap data lives in `public/data/antioch/basemap/` and derives
  from public-domain Natural Earth geography. It provides modern geographic
  context rather than a reconstruction of medieval boundaries.
- The initial historical source selection uses Latin crusader narratives and
  editorial commentary hosted by Fordham University and Dickinson College.
  This is a partial perspective, not a balanced survey of all participants.
- Medieval geometry files remain empty where features have not been responsibly
  sourced. Precise troop routes, walls, and battlefield footprints must not be
  invented to fill those gaps.
- `README.md` records the current workflow and limitations;
  `tests/history-data.test.mjs` checks dataset integrity and the event chain.

## Product Principles

1. Connect place, sequence, and explanation to support learning.
2. Make historical claims traceable to sources.
3. Show uncertainty and source limitations alongside the relevant content.
4. Prove the map and navigation with local data before adding infrastructure.
