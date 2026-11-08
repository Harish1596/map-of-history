import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { countryLabelPoint } from "./lib/country-labels.mjs";

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
  transformations: "Country geometry unchanged. Retain selected display properties. Label points are computed offline with Polylabel inside the largest Mercator-projected landmass, avoiding polygon holes; original source label coordinates are not used.",
}, null, 2) + "\n");
console.log(`Prepared ${countries.features.length} local country and territory features.`);
