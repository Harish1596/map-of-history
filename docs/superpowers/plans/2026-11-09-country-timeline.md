# Country Timeline Implementation Plan

> Implement inline in the current checkout, following the user's request to implement the researched first step.

**Goal:** Add local year-end country snapshots for 2000–2006 alongside the present-day map.

**Architecture:** Prepare shared historical GeoJSON and labels offline. Load once
on demand, select year records and update only political MapLibre sources.

**Tech Stack:** Existing Next.js, React, TypeScript, MapLibre and Node preparation tooling.

**Spec:** `docs/superpowers/specs/2026-11-09-country-timeline-design.md`.

## Global constraints

- Local runtime only; no external APIs, database or fabricated historical borders.
- Present day remains available. Historical coverage is explicitly 2000–2006.
- Physical surfaces remain modern references; preserve camera and selections.
- Retain dataset-specific licence, source checksums and transformation notes.

## Review focus

- Failed or superseded requests must never mismatch the displayed year and borders.
- UN-administered East Timor must not appear as Indonesian territory in 2000–2001.
- Later state separations and modern names must not leak into earlier snapshots.
- Touch/keyboard controls and panels must remain usable on narrow/short screens.
- Minor researched settlements absent from geometry must be explicitly identified.

## Task 1: Historical source and selection

- [x] Add failing tests in `tests/country-history.test.mjs` for year validation,
  state transitions, label placement and source/chronology integrity.
- [x] Add `scripts/prepare-country-history.mjs` with offline source extraction and
  deterministic identifiers, and generate `public/data/world/history/` assets.
- [x] Add `src/data/country-history.ts` with validated bundle parsing and
  `countrySnapshot(bundle, year)` returning country and label FeatureCollections.
- [x] Run focused tests and then `npm test`.

## Task 2: Timeline interface and integration

- [x] Add `src/components/CountryTimeline.tsx` and a dedicated history-loading hook;
  integrate them with `WorldMap.tsx` without recreating the camera.
- [x] Separate political borders from the reference land-fill source in the style.
- [x] Add compact responsive CSS and exclusive source notes with coverage status.
- [x] Update README, AGENTS, PRODUCT, DESIGN and the surface brief.
- [x] Verify tests, lint, typecheck, static build and desktop/mobile browser flows.
- [x] Review the complete diff, run the design detector and commit locally.

## Decisions

- User requested implementation after reviewing the historical findings; proceed
  with that scope without another design approval round.
- Keep the current checkout as required by the repository's focused-local-commit
  workflow; no independent feature branch or worktree is necessary.
- CShapes source date codes are preserved, but the user-facing chronology uses
  official historical dates. Differences within the same year do not affect
  31 December snapshots.

## Verification and review ledger

- Unit/data checks: 44 tests, including independent point containment and
  malformed-bundle checks. Historical source preparation is deterministic.
- Independent review identified an interrupted-first-load / Retry map state
  bug. The browser regression failed before the fix. Reapply the last displayed
  snapshot on every ready transition, including Present day, to clear pending
  selections after recreation.
- Validate coordinate rings and finite geographic positions during loading so
  corrupt bundles stay on the year-level retry path.
- Initial browser checks passed at 1440px, 390px and 320px for year transitions,
  keyboard controls, camera preservation, source notes, cached local loading and
  physical-surface selection. Retry and superseded-fetch checks passed.
- Visual inspection raised the timeline 16px to clear wrapped mobile attribution
  and reduced the notes panel height to preserve the mode control on short screens.

- Final verification: 44/44 tests, clean lint, typecheck and static production
  build. Regeneration reproduced valid output and metadata checksums.
- Final browser verification passed at 1440×900, 390×844 and 320×568, including
  failed-fetch fallback/retry, superseded selection and interrupted-load map
  recreation. No external runtime requests or page errors in normal flows.
- Independent review confirmed both fixes; no remaining important findings.
- Design detector: advisory existing color/type documentation drift only. New
  timeline type sizes are documented; generated sidecar drift is left unchanged.
