# Underwater geography and marine names

Add an offline Natural Earth bathymetric reference to Physical Geography,
retaining the selected terrain/land-cover/geology surface and current camera.

1. Download the official public-domain depth-polygon archive at preparation time.
   Burn nested depths shallow-to-deep into a classified grid; mask country land
   and generate local transparent indexed PNG tiles with source checksums.
2. Add a lazy physical-only raster source below country land. Keep it visible for
   all physical surfaces. Reuse the existing ocean and sea sources in both modes,
   placing marine names above physical surfaces and keeping existing zoom gates.
3. Reuse the collapsible legend for metres below sea level, with source links and
   source-scale limitations. Preserve existing classification legends.
4. Test tile completeness, depth order, mode/surface visibility and source metadata.
   Verify desktop/mobile rendering, switching, layer order and load errors.

The source supplies generalized depth intervals, not continuous depth measurements
or 3D hillshade. Shelves, ridges, basins and trenches are visible through depth
patterns; individual undersea-feature names and surveyed boundaries are not part
of this source. All runtime requests remain local; Standard keeps its flat water.
