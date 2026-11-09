# Classroom world map

Approved direction: the classroom-screen preview selected by the user, at
`.impeccable/mocks/decision/classroom.png`.

Replace the home screen with a full-viewport, flat world map. Use pale blue-gray
oceans, sage land, strong slate boundaries and readable country names. A compact
white plaque at the upper left reads “World map” and “Present-day countries”.
Zoom controls and reset view sit at the lower right; attribution sits lower left.
Keep controls accessible by keyboard and touch. The map supports drag, wheel,
pinch, double-click and keyboard navigation, with rotation disabled.

## Approaches

The previews considered a classroom screen, a multicolor political atlas and a
neutral web map. The user selected the classroom screen. A flat map provides a
simultaneous geographic overview; a globe would hide part of the world. Use the
existing Next.js static export and MapLibre renderer with local GeoJSON and
fonts, avoiding new app dependencies, APIs, databases and remote tile services.

## Data and scope

Use Natural Earth 1:50m Admin-0 country geometry and its label coordinates. Keep
full country names and let collision detection reveal smaller-country labels on
zoom. The dataset includes territories and disputed areas; its boundaries follow
Natural Earth's de facto convention, not a claim of universally agreed borders.
Record source, license, retrieval date and dataset limitations. The preview's
generated geography is illustrative and must be replaced by geographic data.

Do not add search, historical events,
timelines, accounts, sidebars or unrelated navigation in this step.

## Acceptance

The world map, boundaries and labels render from local files. Zoom, pan, resize
and reset keep labels anchored. Desktop and mobile have no page overflow. Loading,
failed assets and unavailable WebGL have clear feedback and retry. Data validation,
typecheck, lint, tests, static build and browser interaction checks pass.
