---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/components/WorldMap.tsx","src/app/globals.css"]
---

# World map home screen

Mode: Operate. Audience: students and educators exploring present-day geography.
Approved preview: `.impeccable/mocks/decision/classroom.png`. The user's selection
also confirms the scoped design in `docs/superpowers/specs/2026-11-08-world-map-design.md`.

## Direction contract

THESIS: The map itself is the app. Give geography the entire viewport and keep
the control surface small enough to disappear during exploration.

OWN-WORLD: Clear blue ocean, muted sage countries, fine but distinct slate
borders, dark sans-serif labels, white rectangular controls. Daylight classroom
use favors a light surface that stays readable on shared screens.

STORY: Open to the world; recognize continents and country names; pan and zoom
for smaller places; reset to regain geographic context.
Standard also labels the five oceans using seven sourced marine-region anchors,
with North/South Atlantic and Pacific names. Muted blue ocean text receives
first placement priority at every zoom; sea and other labels yield to it.
Ocean labels follow the same camera and continuous world wrap.
Standard adds 192 named seas, bays and gulfs in the same water-ink family, at a smaller text
scale. Major seas are eligible at overview zoom; smaller seas follow source
zoom guidance. Anchors are checked against land, with island overlaps corrected.
Country labels follow Natural Earth LABELRANK with fixed priority, then descending
area and identifier as tie-breakers, from country-labels.json. Ranks 1–2 are
eligible at zoom 0; ranks 3–7 at zoom 3–7. These are app-specific thresholds.
Area controls typography only. Priority does not depend on navigation history.
Geographic anchors use area-weighted visual centroids of the largest projected
landmass, with interior Polylabel fallbacks where the centroid falls outside
land. Text stays centered and collision avoidance remains enabled.
Physical island names appear in a secondary regional layer. Archipelago names
give way to individual island names at closer zoom; country labels stay dominant.

FIRST VIEWPORT: A continuous flat map edge to edge, with no title plaque (removed
at the user's request). A compact Standard / Physical Geography switch sits upper
left. Physical mode shows sourced shaded relief with restrained elevation/region
colours beneath rivers, lakes, natural landform names and islands,
plus subtle shoreline outlines, named coastal landforms and waterways, and
small cape-location dots. Coastal labels follow source zoom guidance and
collision placement; approximate label regions are not drawn as boundaries,
hiding political borders and country names. It loads local layers on first use
and preserves the camera. Relief is locally tiled and generalized for world and
regional views, with no tilt or 3D terrain.
A native radio group beneath the physical-mode switch selects Terrain relief,
Land cover · 2020 or Rock types. The categorical views replace relief colours,
use a collapsible lower-left legend and explain their source/overview limits.
Rock types retain GLiM's first-level surface lithology; they do not imply rock age
or subsurface structure. Selection preserves the camera and loads only local
tiles for the chosen surface. Attribution includes the active dataset's credit.
White 22px zoom buttons and a 23px reset button sit lower right, with 11px icons.
Signature interaction: all labels and borders
track the same camera during every pan and zoom. Motion is map navigation only.
The user increased the zoom range after the earlier 2×-overview cap: maximum
MapLibre zoom is now 21, using Google's documented zoom-22 pixel scale as reference.
Pan wraps continuously east/west. Zoom-out fills both viewport dimensions, and
the viewport's top/bottom edges are constrained to the Mercator polar boundaries.

FORM: Classroom screen, fifth grounded candidate; direction seed `3d33963b`.
The preview's invented geometry is replaced by sourced GeoJSON. Noto Sans supplies
the preview's plain sans-serif character; automated fingerprinting suggested an
unrelated display face and is not suitable for country-map labels.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Physical Geography has local bathymetric depth-band tiles below country land,
visible alongside every physical surface. Ocean and sea names are shared across
modes. The existing legend shows depth intervals in metres; classification
surfaces retain their own legends and include depth bands in the same panel.

Physical Features disclosure has six independent checkboxes: peaks, volcanoes,
canyons, named forests, undersea names and tectonics. All runtime data is local.
Markers, labels and model boundary lines open a source panel when selected;
recorded elevations are qualified by their source. Keep the pale control panels,
compact rows, distinct authored marker shapes and explicit geographic/model
limitations. Selecting a feature closes the filter disclosure; its source panel
temporarily replaces the depth/classification legend.

Map exposure takes priority: Terrain is a collapsed 188px bar; Features is a
188px disclosure with a single column of 28px rows. The collapsed Legend bar is
120px wide and opens to a readable 300px panel. Disclosures share an exclusive
group and close on map clicks, camera movement or Escape. Terrain closes after
selection. Zoom/reset dimensions are half their former size by explicit request.

Country timeline: bottom-center compact white panel, 440px maximum width and
mobile left inset reserving navigation room. Seven native year radio controls
cover 2000–2006 at 31 December; Present day restores Natural Earth. Local lazy
historical loading has retry and preserves the displayed snapshot on failure.
Political borders/labels update without moving the camera. Year notes & sources
opens upward in the exclusive map-tools group and distinguishes encoded country
changes from documented settlements without geometry. Physical geography and
reference coastlines remain modern. Historical attribution is CShapes 2.0,
CC BY-NC-SA 4.0, with Natural Earth reference supplements.
