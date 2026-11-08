import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { countryLabelPoint } from "./lib/country-labels.mjs";

if (!process.argv[2]) throw new Error("Usage: node scripts/prepare-ocean-labels.mjs <ne_10m_geography_marine_polys.geojson>");
const raw = readFileSync(process.argv[2]);
const source = JSON.parse(raw);
const features = source.features.filter((f) => f.properties.featurecla === "ocean").map((feature) => {
  const p = feature.properties;
  const name = p.name === p.name.toUpperCase() ? p.name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : p.name;
  const id = `ocean-${p.ne_id}`;
  return {
    type: "Feature", id, properties: { id, name, ocean: p.name_en || name },
    geometry: { type: "Point", coordinates: countryLabelPoint(feature.geometry).map((v) => Number(v.toFixed(5))) },
  };
});
const output = new URL("../public/data/world/", import.meta.url);
writeFileSync(new URL("ocean-labels.geojson", output), JSON.stringify({ type: "FeatureCollection", features }) + "\n");
writeFileSync(new URL("ocean-metadata.json", output), JSON.stringify({
  title: "Natural Earth ocean label anchors",
  source: "https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_geography_marine_polys.geojson",
  license: "Public domain", licenseUrl: "https://www.naturalearthdata.com/about/terms-of-use/",
  sourceSha256: createHash("sha256").update(raw).digest("hex"),
  preparedOn: new Date().toISOString().slice(0, 10), featureCount: features.length,
  transformations: "Retain ocean features and compute interior Polylabel anchors. Preserve North/South Atlantic and Pacific source names, normalize uppercase names to title case, and retain the generic English ocean name separately. Labels have no zoom cutoff and always render when on screen in Standard, reserving space ahead of sea and other labels.",
  limitations: "Approximate geographic label placement, not surveyed ocean boundaries. Seven source regions describe five oceans. Names depend on the viewport containing their anchors; polar names require panning into their regions.",
}, null, 2) + "\n");
console.log(`Prepared ${features.length} ocean anchors.`);
