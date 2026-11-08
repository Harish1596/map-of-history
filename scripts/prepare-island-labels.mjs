import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import area from "@turf/area";
import { countryLabelPoint } from "./lib/country-labels.mjs";
import { LABEL_SIZE_BANDS } from "./lib/country-label-policy.mjs";

const input = process.argv[2];
if (!input) throw new Error("Usage: node scripts/prepare-island-labels.mjs <ne_10m_geography_regions_polys.geojson>");
const raw = readFileSync(input);
const source = JSON.parse(raw);
const output = new URL("../public/data/world/", import.meta.url);
const countryList = JSON.parse(readFileSync(new URL("country-labels.json", output)));
const countryNames = new Set(countryList.countries.flatMap((country) => [country.name.toLowerCase(), country.label.toLowerCase()]));
const features = [];
for (const feature of source.features) {
  const p = feature.properties;
  if (!["Island", "Island group"].includes(p.FEATURECLA)) continue;
  const name = p.NAME_EN || p.NAME;
  if (!name || countryNames.has(name.toLowerCase())) continue;
  const areaKm2 = area(feature) / 1_000_000;
  const band = LABEL_SIZE_BANDS.find((band) => areaKm2 >= band.minAreaKm2);
  const minZoom = Math.max(3, band.minZoom, Math.floor(p.MIN_LABEL ?? band.minZoom));
  // The source reuses an NE_ID for the two different islands named Flores.
  // Add a geometry fingerprint to keep both records uniquely identifiable.
  const id = `island-${p.NE_ID}-${createHash("sha256").update(JSON.stringify(feature.geometry)).digest("hex").slice(0, 8)}`;
  features.push({
    type: "Feature", id,
    properties: {
      id, name, kind: p.FEATURECLA,
      areaKm2: Number(areaKm2.toFixed(3)),
      minZoom,
      // Archipelago names give way to individual islands as users zoom in.
      maxZoom: p.FEATURECLA === "Island group" ? Math.max(6, minZoom + 2) : 22,
    },
    geometry: { type: "Point", coordinates: countryLabelPoint(feature.geometry) },
  });
}
features.sort((a, b) => b.properties.areaKm2 - a.properties.areaKm2 || a.id.localeCompare(b.id));
features.forEach((feature, priority) => { feature.properties.priority = priority; });
writeFileSync(new URL("island-labels.geojson", output), JSON.stringify({ type: "FeatureCollection", features }) + "\n");
writeFileSync(new URL("island-metadata.json", output), JSON.stringify({
  title: "Natural Earth 1:10m geographic-region island names",
  source: "https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_geography_regions_polys.geojson",
  download: "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_geography_regions_polys.geojson",
  license: "Public domain", licenseUrl: "https://www.naturalearthdata.com/about/terms-of-use/",
  preparedOn: new Date().toISOString().slice(0, 10),
  sourceSha256: createHash("sha256").update(raw).digest("hex"),
  featureCount: features.length,
  transformations: "Retain Island and Island group features; use English names and interior Polylabel anchors. Omit names already covered by country labels. Minimum zoom combines area bands with source label guidance, starting at zoom 3. Group names yield to individual island names after two levels, never before zoom 6.",
  limitations: "Selected named physical regions, not every island. Island-group footprints include water and are not land-area measurements. Label detail is 1:10m; the underlying country outlines remain 1:50m.",
}, null, 2) + "\n");
console.log(`Prepared ${features.length} local island and archipelago labels.`);
