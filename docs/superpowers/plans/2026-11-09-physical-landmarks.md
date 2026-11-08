# Physical landmarks and tectonic features

Extend the existing physical map with local datasets and six independent feature
controls, retaining the selected land surface, bathymetry, camera, and palette.

1. Prepare sourced individual peaks/elevations from Natural Earth and catalogued
   volcanic systems from Smithsonian GVP. Deduplicate overlapping summit records;
   never interpret catalogue membership as current activity.
2. Prepare named forest/ecoregion and canyon label locations from selected
   Wikidata records. Import the IHO–IOC GEBCO undersea gazetteer into source-backed
   label anchors. Do not invent footprints for these named regions.
3. Prepare classified PB2002 plate boundaries and interior plate labels, retaining
   original model classes and ODC-By attribution. Model boundaries are not an
   exhaustive fault map or a historical reconstruction.
4. Add authored point symbols, independent zoom gates, and six checkboxes in a
   compact Features disclosure. Put boundary lines below physical names; preserve
   ocean/sea placement priority. Clicking markers/names/boundaries opens a small
   source panel with elevation and limitations where applicable.
5. Validate coordinates, source records, IDs, category counts, mode/surface
   visibility and controls. Test desktop/mobile category toggles, representative
   feature clicks, source links, absence of external runtime requests and load
   failures. Run lint, types, tests and production export before committing.
