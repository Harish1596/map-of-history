import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { countryLabelPoint } from "./lib/country-labels.mjs";

const paths = process.argv.slice(2);
if (paths.length !== 4) throw new Error("Usage: node scripts/prepare-coastal-data.mjs <regions.geojson> <points.geojson> <marine.geojson> <coastline.geojson>");
const raw = paths.map((path) => readFileSync(path));
const [regions, points, marine, coastline] = raw.map((bytes) => JSON.parse(bytes));
const output = new URL("../public/data/world/physical/", import.meta.url);
const labels = [];
const round = (value) => Array.isArray(value) ? value.map(round) : Number(value.toFixed(5));
const zoom = (value) => Math.max(2, Math.min(10, Math.floor(Number.isFinite(value) ? value : 5)));
function addLabel(f, kind, zone, source, isPoint = false) {
  const p = f.properties;
  const name = p.name_en || p.NAME_EN || p.name || p.NAME;
  const wiki = p.wikidataid || p.WIKIDATAID;
  const normalized = name?.normalize("NFKC").toLowerCase().trim();
  if (!name) return;
  const coordinates = round(isPoint ? f.geometry.coordinates : countryLabelPoint(f.geometry));
  // Equal names (and even reused source IDs) can describe different places.
  const nearbyDuplicate = labels.some((label) => {
    const existing = label.properties;
    if (existing.name.normalize("NFKC").toLowerCase().trim() !== normalized && !(wiki && existing.wikidata === wiki)) return false;
    const [lng, lat] = label.geometry.coordinates;
    const deltaLng = Math.abs(((coordinates[0] - lng + 540) % 360) - 180);
    return Math.hypot(deltaLng * Math.cos((coordinates[1] + lat) * Math.PI / 360), coordinates[1] - lat) < 0.5;
  });
  if (nearbyDuplicate) return;
  const id = `coast-${source}-${p.ne_id || p.NE_ID}-${createHash("sha256").update(JSON.stringify(f.geometry)).digest("hex").slice(0, 8)}`;
  labels.push({
    type: "Feature", id,
    properties: {
      id, name, kind, zone, source, wikidata: wiki || null,
      minZoom: zoom(p.min_label ?? p.MIN_LABEL ?? p.min_zoom),
      priority: p.scalerank ?? p.SCALERANK ?? 10,
      anchor: isPoint ? "source point" : "interior of approximate label region",
    },
    geometry: { type: "Point", coordinates },
  });
}
// Prefer the source's actual cape location over a broad label-area anchor.
for (const f of points.features) if (f.properties.featurecla === "cape") addLabel(f, "Cape", "land", "points", true);
for (const f of regions.features) {
  const p = f.properties;
  if (!["Pen/cape", "Peninsula", "Coast", "Isthmus"].includes(p.FEATURECLA)) continue;
  const name = p.NAME_EN || p.NAME;
  const kind = p.FEATURECLA === "Pen/cape" ? (/peninsula/i.test(name) ? "Peninsula" : /\bcape\b/i.test(name) ? "Cape" : "Coastal landform") : p.FEATURECLA;
  addLabel(f, kind, "land", "regions");
}
const waterKinds = { bay: "Bay", gulf: "Gulf", strait: "Strait", channel: "Channel", sound: "Sound", fjord: "Fjord", lagoon: "Lagoon", inlet: "Inlet" };
for (const f of marine.features) {
  const kind = waterKinds[f.properties.featurecla];
  if (kind) addLabel(f, kind, "water", "marine");
}
const lines = coastline.features.filter((f) => ["LineString", "MultiLineString"].includes(f.geometry?.type) && f.geometry.coordinates.length).map((f, index) => ({
  type: "Feature", id: `shoreline-${index}`,
  properties: { kind: "Coastline", minZoom: Math.max(0, f.properties.min_zoom ?? 0) },
  geometry: { ...f.geometry, coordinates: round(f.geometry.coordinates) },
}));
writeFileSync(new URL("coasts.geojson", output), JSON.stringify({ type: "FeatureCollection", features: [...lines, ...labels] }) + "\n");
const files = ["ne_10m_geography_regions_polys", "ne_10m_geography_regions_points", "ne_10m_geography_marine_polys", "ne_50m_coastline"];
writeFileSync(new URL("coasts-metadata.json", output), JSON.stringify({
  title: "Natural Earth coastal features and shorelines",
  license: "Public domain", licenseUrl: "https://www.naturalearthdata.com/about/terms-of-use/",
  preparedOn: new Date().toISOString().slice(0, 10),
  sources: files.map((name, index) => ({ url: `https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/${name}.geojson`, sourceSha256: createHash("sha256").update(raw[index]).digest("hex") })),
  featureCount: lines.length + labels.length, coastlineCount: lines.length, labelCount: labels.length,
  kinds: Object.fromEntries([...new Set(labels.map((f) => f.properties.kind))].map((kind) => [kind, labels.filter((f) => f.properties.kind === kind).length])),
  transformations: "Retain 1:50m shoreline lines and 1:10m named coasts, peninsulas/headlands, capes, isthmuses, bays, gulfs, straits, channels, sounds, fjords, lagoons and inlets. Prefer cape location points; use interior Polylabel anchors for other approximate label regions. Deduplicate matching English names or Wikidata IDs only within approximately 55km; preserve distant namesakes. Round coordinates to five decimals. Source label zooms are rounded down and limited to 2–10; labels persist at closer zooms.",
  limitations: "Selected named features, not every coastal feature. Label-region polygons are approximate placement aids, not surveyed feature boundaries or navigational limits, and are not drawn. Coastline detail remains 1:50m, matching the base map scale; 1:10m cape locations and marine features may differ slightly from it. Present-day reference data, not reconstructed historical coastlines.",
}, null, 2) + "\n");
console.log(`Prepared ${lines.length} coastline segments and ${labels.length} coastal labels.`);
