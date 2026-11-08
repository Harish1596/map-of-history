import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { countryLabelPoint } from "./lib/country-labels.mjs";
import { createCountryLabelList, LABEL_SIZE_BANDS } from "./lib/country-label-policy.mjs";

// Run with a downloaded Natural Earth 1:50m Admin-0 countries GeoJSON path.
// Deliberately offline: preparing data never contacts a service.
const input = process.argv[2];
if (!input) throw new Error("Usage: node scripts/prepare-world-data.mjs <countries.geojson>");
const raw = readFileSync(input);
const source = JSON.parse(raw);
const output = new URL("../public/data/world/", import.meta.url);
mkdirSync(output, { recursive: true });

const countries = { type: "FeatureCollection", features: [] };
const labels = { type: "FeatureCollection", features: [] };
for (const feature of source.features) {
  const p = feature.properties;
  const id = p.ADM0_A3;
  const name = p.NAME_EN || p.NAME_LONG;
  if (!id || !name || !Number.isFinite(p.LABEL_X) || !Number.isFinite(p.LABEL_Y)) {
    throw new Error("Country is missing its identifier, name or label coordinates");
  }
  const properties = {
    id, name, label: p.NAME_LONG || name,
    rank: p.LABELRANK,
    minLabel: p.MIN_LABEL,
    type: p.TYPE,
    continent: p.CONTINENT,
  };
  countries.features.push({ type: "Feature", id, properties, geometry: feature.geometry });
  labels.features.push({
    type: "Feature", id, properties,
    geometry: { type: "Point", coordinates: countryLabelPoint(feature.geometry) },
  });
}

const countryList = createCountryLabelList(countries.features);
const labelPolicy = new Map(countryList.map((country) => [country.id, country]));
for (const feature of labels.features) {
  const { areaKm2, minZoom, sizeTier, priority } = labelPolicy.get(feature.id);
  feature.properties = { ...feature.properties, areaKm2, minZoom, sizeTier, priority };
}
writeFileSync(new URL("country-labels.json", output), JSON.stringify({
  description: "Countries and territories sorted by geographic area, largest first. Lower priority numbers place first. Zoom levels use MapLibre's 512px world convention.",
  areaMethod: "Approximate geodesic square kilometres measured from Natural Earth 1:50m polygons with Turf area. Includes holes and all polygon parts; not official country-area statistics.",
  bands: LABEL_SIZE_BANDS,
  countries: countryList,
}, null, 2) + "\n");

for (const [file, data] of Object.entries({ countries, labels })) {
  writeFileSync(new URL(`${file}.geojson`, output), JSON.stringify(data) + "\n");
}
writeFileSync(new URL("metadata.json", output), JSON.stringify({
  title: "Natural Earth Admin-0 countries, 1:50m",
  source: "https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/",
  download: "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson",
  license: "Public domain",
  licenseUrl: "https://www.naturalearthdata.com/about/terms-of-use/",
  preparedOn: new Date().toISOString().slice(0, 10),
  sourceSha256: createHash("sha256").update(raw).digest("hex"),
  featureCount: countries.features.length,
  boundaryConvention: "Natural Earth default de facto boundaries. Includes territories and disputed areas; not a count of sovereign states or a statement of legal recognition.",
  limitations: "Generalized 1:50m snapshot, not live political data, street detail, or survey geometry. Small-country labels appear as space allows when zooming.",
  transformations: "Country geometry unchanged. Label points use offline Polylabel inside the largest Mercator-projected landmass. Country-labels.json ranks geodesic polygon areas with Turf; size bands set minimum zoom and typography, and descending area sets collision priority.",
}, null, 2) + "\n");
console.log(`Prepared ${countries.features.length} local country and territory features.`);
