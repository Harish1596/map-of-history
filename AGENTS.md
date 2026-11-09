<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project guidance

## Product and scope

- This is a static, interactive world-map proof of concept for students and
  educators. The current home screen shows present-day geography.
- Historical events, causal links and citations remain the longer-term goal.
- Read `PRODUCT.md`, `DESIGN.md`, `README.md` and the relevant
  `.impeccable/surfaces/` brief before changing the interface. The user's latest
  instructions take precedence over older design notes or plans.

## Architecture and entry points

- Next.js App Router, React, TypeScript and MapLibre GL JS. Consult
  `package.json` for the installed versions and available commands.
- `src/app/page.tsx` mounts `src/components/WorldMap.tsx`, the client component
  responsible for map initialization, local data loading and map controls.
- `src/data/world-map-style.ts` defines the base map and country/island/marine
  label styles. `src/data/world-map-camera.ts` defines camera constraints.
- `src/data/physical-map-style.ts` defines physical surfaces, water layers and
  mode switching. `src/data/landmark-map-style.ts` defines landmark symbols,
  category controls, source-file names and visibility helpers.
- `src/app/globals.css` contains the active interface styles.
- `next.config.ts` uses `output: "export"`. `npm run build` generates `out/`;
  `npm start` serves that export through `scripts/serve-static.mjs`. Do not
  replace this command with `next start`, which cannot serve a static export.

## Local data and provenance

- Runtime geography, raster tiles, fonts and the MapLibre worker are local.
  Preserve the no-external-map-API/no-database proof-of-concept architecture.
  Source websites are opened only when the user follows an attribution link.
- Geographic assets live in `public/data/world/`. Physical feature GeoJSON lives
  in its `physical/` subdirectory. Relief, bathymetry, land-cover and geology
  raster tiles have separate directories with metadata and applicable legends.
- `scripts/prepare-*` regenerate assets from downloaded source snapshots.
  Source downloads belong to preparation, not application startup. Keep large
  raw archives and temporary processing files outside the repository.
- Update the preparation script and generated output together. Preserve source
  URLs, licences, acknowledgements, checksums and transformation/scale notes.
  Consult each dataset's metadata; do not infer one dataset's licence from
  another dataset by the same publisher.
- Forests, canyons and undersea features currently use representative label
  locations, not surveyed boundaries. Forest/canyon coverage is selected.
  Natural Earth peak elevations may predate newer measurements. Smithsonian
  catalogue membership does not imply current volcanic activity. PB2002 shows
  approximate modern plate boundaries, not a complete fault inventory,
  earthquake hazard assessment or historical reconstruction.
- Higher-detail terrain/bathymetry work was deferred. Raster layers have native
  zoom limits recorded in metadata; overzooming enlarges existing imagery and
  does not add geographic detail. Keep those limits distinct from camera zoom.

## Map behaviour to preserve

- Keep one continuous map wrapping east/west, with the full viewport constrained
  at the north/south Mercator limits. Minimum zoom fills the viewport; maximum
  camera zoom is MapLibre level 21. Google Maps is an interaction/scale reference,
  not a runtime service or a promise of equivalent source detail.
- Country visibility uses fixed Natural Earth label-rank bands, then descending
  geographic area and identifier as priority tie-breakers. Area also controls
  font-size tiers. See `scripts/lib/country-label-policy.mjs` and the editable
  `public/data/world/country-labels.json` applied by `world-label-policy.ts`.
- Keep country text centered on the visual centroid of its main landmass, with
  an interior fallback when the centroid falls outside land. Avoid introducing
  priority based on which labels appeared first during navigation.
- Ocean names remain eligible at all zoom levels. Sea names use their own zoom
  gates. Both are available in Standard and Physical Geography, anchored over
  water with collision avoidance for sea labels.
- Physical mode offers terrain relief, land cover and rock types. Bathymetry
  remains below land across those surfaces. Landmark categories have independent
  controls and clickable source information. Preserve selections and camera
  position across surface/mode switches, and retain load-error fallback/retry.

## Compact interface conventions

- Maximize exposure to the map. Do not add a map title overlay.
- Zoom buttons are 22px square; reset is 23px square; navigation icons are 11px.
  These reduced sizes are an explicit user preference.
- Terrain and Features are 188px-wide native disclosures, collapsed initially.
  Features uses one column with compact 28px rows. Terrain closes after selection
  and returns keyboard focus to its summary.
- The collapsed Legend bar is 120px wide, 60% narrower than its former width.
  Its expanded panel can be 300px wide to keep the content readable during use.
- Terrain, Features, Legend and Map data share an exclusive disclosure group.
  Map clicks, camera movement and Escape collapse panels. Camera movement also
  dismisses feature information. Preserve keyboard labels and focus indicators.

## Verification and local workflow

- `npm run dev` starts development. For a production preview, run
  `npm run build` followed by `npm start`. `STATIC_PORT` and `STATIC_HOST`
  configure the local static server when another preview is already running.
- Use `npm test`, `npm run lint` and `npm run typecheck` as appropriate to the
  change. Run `npm run build` for application changes before claiming completion.
  Tests use Node's built-in runner with TypeScript stripping; relative TypeScript
  imports used by these tests include `.ts` extensions.
- For map/UI changes, verify desktop and mobile rendering and actual interactions.
  Check zoom in both directions, pan/reset, mode/surface switches, independent
  category choices, disclosure dismissal, source panels and relevant retry paths.
  Distinguish labels leaving the viewport from labels lost to collision placement.
- For data changes, check representative features, coordinates, stable IDs,
  provenance, classifications and source-scale limitations, not only counts.
- Preserve unrelated user changes. Make focused local commits after verification;
  report the commit and remaining working-tree state. Do not push, synchronize
  remotes or deploy as part of routine implementation work.
