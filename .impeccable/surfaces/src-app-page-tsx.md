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

OWN-WORLD: Pale blue-gray ocean, muted sage countries, fine but distinct slate
borders, dark sans-serif labels, white rectangular controls. Daylight classroom
use favors a light surface that stays readable on shared screens.

STORY: Open to the world; recognize continents and country names; pan and zoom
for smaller places; reset to regain geographic context.

FIRST VIEWPORT: A continuous flat map edge to edge, with no title plaque (removed
at the user's request). Attribution lower left. White 44px zoom
and reset buttons lower right. Signature interaction: all labels and borders
track the same camera during every pan and zoom. Motion is map navigation only.
The user clarified that maximum magnification is 2× the initial world view.
Pan wraps continuously east/west; zoom-out stops at one world-width.

FORM: Classroom screen, fifth grounded candidate; direction seed `3d33963b`.
The preview's invented geometry is replaced by sourced GeoJSON. Noto Sans supplies
the preview's plain sans-serif character; automated fingerprinting suggested an
unrelated display face and is not suitable for country-map labels.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
