import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { countryLabelPoint } from "./lib/country-labels.mjs";

const inputs = process.argv.slice(2);
if (inputs.length !== 3) throw new Error("Usage: node scripts/prepare-physical-data.mjs <rivers.geojson> <lakes.geojson> <regions.geojson>");
const output = new URL("../public/data/world/physical/", import.meta.url);
mkdirSync(output, { recursive: true });
const raw = inputs.map((path) => readFileSync(path));
const [rivers, lakes, regions] = raw.map((bytes) => JSON.parse(bytes));
const clampZoom = (value, fallback) => Math.max(0, Math.min(21, Number.isFinite(value) ? value : fallback));
const round = (value) => Array.isArray(value) ? value.map(round) : Number(value.toFixed(5));
const normalize = (features, kind) => features.map((f, index) => ({
  type: "Feature", id: `${kind}-${index}`,
  properties: {
    name: f.properties.name_en || f.properties.name || "",
    kind,
    minZoom: clampZoom(f.properties.min_zoom, 3),
    labelZoom: clampZoom(f.properties.min_label, 5),
    priority: f.properties.scalerank ?? 10,
  },
  geometry: { ...f.geometry, coordinates: round(f.geometry.coordinates) },
}));
const riverFeatures = normalize(rivers.features.filter((f) => ["LineString", "MultiLineString"].includes(f.geometry?.type) && f.geometry.coordinates.length), "River");
const lakeFeatures = normalize(lakes.features.filter((f) => ["Polygon", "MultiPolygon"].includes(f.geometry?.type) && f.geometry.coordinates.length), "Lake");
const labels = lakeFeatures.filter((f) => f.properties.name).map((f) => ({
  ...f, id: `label-${f.id}`,
  properties: { ...f.properties, minZoom: f.properties.labelZoom },
  geometry: { type: "Point", coordinates: countryLabelPoint(f.geometry) },
}));
for (const [index, f] of regions.features.entries()) {
  const p = f.properties;
  if (!["Range/mtn", "Desert", "Plateau", "Plain"].includes(p.FEATURECLA)) continue;
  const name = p.NAME_EN || p.NAME;
  if (!name) continue;
  labels.push({
    type: "Feature", id: `landform-${index}`,
    properties: {
      name, kind: p.FEATURECLA,
      // Major ranges/deserts should identify the physical view even at a world overview.
      minZoom: p.SCALERANK <= 1 ? 0 : p.SCALERANK === 2 ? 1 : clampZoom(Math.floor(p.MIN_LABEL ?? 4), 4),
      priority: p.SCALERANK ?? 10,
    },
    geometry: { type: "Point", coordinates: countryLabelPoint(f.geometry) },
  });
}
for (const [name, features] of [["rivers", riverFeatures], ["lakes", lakeFeatures], ["labels", labels]]) {
  writeFileSync(new URL(`${name}.geojson`, output), JSON.stringify({ type: "FeatureCollection", features }) + "\n");
}
const filenames = ["ne_10m_rivers_lake_centerlines", "ne_10m_lakes", "ne_10m_geography_regions_polys"];
writeFileSync(new URL("metadata.json", output), JSON.stringify({
  title: "Natural Earth 1:10m physical geography",
  license: "Public domain", licenseUrl: "https://www.naturalearthdata.com/about/terms-of-use/",
  preparedOn: new Date().toISOString().slice(0, 10),
  sources: filenames.map((name, index) => ({
    url: `https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/${name}.geojson`,
    sourceSha256: createHash("sha256").update(raw[index]).digest("hex"),
  })),
  featureCounts: { rivers: riverFeatures.length, lakes: lakeFeatures.length, labels: labels.length },
  transformations: "Keep nonempty river lines and lake polygons with English names and source zoom/rank guidance. Round geometry to five decimal places. Anchor lake, mountain-range, desert, plateau and plain names inside their largest source polygon using Polylabel. Rank-1/2 landform labels become eligible at zoom 0/1; other landforms follow source label zooms.",
  limitations: "Generalized physical geography, not elevation or terrain relief. Named landform footprints are approximate. Lake extents are not current water levels. Country/coast outlines remain 1:50m; slight shoreline mismatches are possible. Not every waterway or landform is included.",
}, null, 2) + "\n");
console.log(`Prepared ${riverFeatures.length} rivers, ${lakeFeatures.length} lakes and ${labels.length} natural-feature labels.`);
