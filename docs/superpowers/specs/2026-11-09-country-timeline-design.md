# Country timeline: first historical interval

Implement the requested first interval, 2000–2006 inclusive, with year-end snapshots.
The existing present-day map remains the startup view and is available with a
Present day button. Do not expose unresearched 2007–2025 as historical snapshots.

## Approach

Use locally prepared CShapes 2.0 Gleditsch–Ward records rather than inventing
historical polygons by hiding present-day countries. Keep its source convention
and CC BY-NC-SA 4.0 attribution with the derived historical assets. Existing
Natural Earth land fills and physical geography remain geographic references.
Use Natural Earth reference geometry for small countries/territories absent from
CShapes, with an explicit supplementary-source designation.

The main acceptance cases are East Timor under UN administration in 2000–2001,
independent Timor-Leste from 2002, Yugoslavia through 2002, Serbia and Montenegro
in 2003–2005, and separate Serbia and Montenegro in 2006. Historical Sudan,
Ukraine and Serbia must not inherit later South Sudan, Crimea or Kosovo splits.
Historical names include Swaziland and Macedonia, not their later names.

CShapes does not encode every researched small border settlement. Publish the
verified chronology with per-event geometry coverage rather than drawing an
unsupported change. Boundary judgments, treaty entry into force and physical
handover remain distinct. The first milestone must describe this limitation in
Map data and historical source notes; it does not claim an exhaustive border
reconstruction or date physical layers to the selected year.

## Interface and behavior

A compact white timeline at bottom center offers seven year buttons and a
Present day button. Its title reports the displayed year and 31 December snapshot
convention. It fits desktop and mobile without covering existing navigation or
attribution. A source-notes disclosure shares the existing exclusive map-tools
group. Preserve the existing palette, local Noto Sans, keyboard focus and compact
navigation sizes. No autoplay or map title plaque.

Swap political border and label sources without reinitializing the map or
moving the camera. Keep physical land fill tied to current reference geography.
The timeline remains available in Physical Geography, with a brief note that the
year applies to countries in Standard mode and physical layers are modern.
Loading is lazy, locally cached and retryable; retain the previous displayed map
and year on a failed historical load, and ignore superseded requests.

## Verification

Test year validation, source selection, country transitions, interior labels,
stable identifiers, source provenance and chronology coverage. Run all tests,
lint, typecheck and production build. Exercise desktop/mobile year selection,
keyboard use, rapid changes, camera preservation, modes, panels and failed-load
retry in a real browser. Commit locally only.
