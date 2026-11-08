# Deterministic country-label priority

Approved direction: replace the navigation-history workaround with Natural Earth
cartographic label ranks, explicit zoom bands and geographic area tie-breakers.
Keep MapLibre collision detection and centered local GeoJSON label anchors.

1. In `country-label-policy.mjs`, separate area-based typography from visibility.
   Sort LABELRANK, descending area, then identifier. Use integer zoom thresholds
   because feature-filter zoom evaluation occurs at integer zooms. Rank 1–2 starts
   at zoom 0; ranks 3–7 at zoom 3–7. Keep MIN_LABEL as source reference only.
2. Regenerate local country policy and label data, recording the transformation.
   Validate label ranks when applying editable JSON. Remove the retention helper
   and its WorldMap listeners so navigating cannot mutate priority.
3. Update tests for source-rank provenance, same-rank eligibility, area tie-breaks,
   input-order independence, and the CIV/GHA/LBR and CAF/SDS transition cases.
4. Verify tests, lint, types, production build, and browser transitions in both
   directions, including different pan histories. Update map documentation and
   save a focused local commit.
