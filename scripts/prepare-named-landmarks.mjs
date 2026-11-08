import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { countryLabelPoint } from "./lib/country-labels.mjs";

const input = process.argv[2];
if (!input) throw new Error("Usage: node scripts/prepare-named-landmarks.mjs <source-directory>");
const output = new URL("../public/data/world/physical/", import.meta.url);
const checksums = {};
function read(name) {
  const raw = readFileSync(`${input}/${name}`);
  checksums[name] = createHash("sha256").update(raw).digest("hex");
  return JSON.parse(raw);
}
const selections = {
  Forest: ["Q177567", "Q5209517", "Q4204", "Q192666", "Q919191", "Q4526", "Q1502633", "Q477047", "Q287852", "Q2920600", "Q375634", "Q3079079", "Q1293678", "Q2913503", "Q1492122"],
  Canyon: ["Q118841", "Q1420196", "Q1107685", "Q2936928", "Q19742", "Q687057", "Q2574575", "Q886892", "Q674485", "Q1742132", "Q2231598", "Q308926", "Q5769166", "Q7960119"],
};
const first = read("named-regions-wikidata.json");
const extra = read("named-regions-extra-wikidata.json");
const entities = { ...first.entities, ...extra.entities };
const displayNames = { Q2936928: "Cotahuasi Canyon", Q1742132: "Kings Canyon (Australia)", Q177567: "Amazon Rainforest" };
const features = [];
for (const [kind, ids] of Object.entries(selections)) for (const id of new Set(ids)) {
  const entity = entities[id];
  const claims = (entity?.claims?.P625 ?? []).filter((c) => c.rank !== "deprecated");
  const coordinate = (claims.find((c) => c.rank === "preferred") ?? claims[0])?.mainsnak.datavalue?.value;
  if (!entity?.labels?.en || !coordinate || !coordinate.globe?.endsWith("/Q2")) throw new Error(`Missing terrestrial coordinate: ${id}`);
  const sourceLabel = entity.labels.en.value;
  const minZoom = kind === "Forest" && ["Q177567", "Q477047"].includes(id) ? 2 : kind === "Canyon" && id === "Q118841" ? 3 : 4;
  features.push({ type: "Feature", id, properties: { id, name: displayNames[id] ?? sourceLabel, sourceLabel, kind, minZoom, priority: minZoom, sourceName: "Wikidata", sourceUrl: `https://www.wikidata.org/wiki/${id}`, informationUrl: `https://www.wikidata.org/wiki/${id}`, locationNote: "Representative label location, not a mapped boundary or current forest extent." }, geometry: { type: "Point", coordinates: [coordinate.longitude, coordinate.latitude] } });
}
writeFileSync(new URL("named-regions.geojson", output), JSON.stringify({ type: "FeatureCollection", features }) + "\n");

function coordinates(geometry) {
  if (geometry.type === "Point") return [geometry.coordinates];
  if (["MultiPoint", "LineString"].includes(geometry.type)) return geometry.coordinates;
  return geometry.coordinates.flat(geometry.type === "MultiPolygon" ? 2 : 1);
}
function point(geometry) {
  if (["Polygon", "MultiPolygon"].includes(geometry.type)) return countryLabelPoint(geometry);
  const coords = coordinates(geometry);
  return coords[Math.floor(coords.length / 2)];
}
const undersea = new Map();
const gazetteer = "https://www.gebco.net/data-products/undersea-feature-names";
for (let layer = 0; layer < 3; layer++) for (const feature of read(`undersea-${layer}.geojson`).features) {
  const p = feature.properties;
  if (!p.NAME || !p.TYPE || !feature.geometry) continue;
  const id = `undersea-${p.FEATURE_ID}`;
  const type = p.TYPE.trim();
  const name = p.NAME.toLowerCase().endsWith(type.toLowerCase()) ? p.NAME : `${p.NAME} ${type}`;
  const major = /^(Mid-Atlantic Ridge|East Pacific Rise|Mariana Trench|Peru-Chile Trench|Java Trench|Tonga Trench|Puerto Rico Trench|Philippine Trench|Challenger Deep)$/i.test(name);
  const minZoom = major ? 2 : /Ridge|Trench|Rise/i.test(type) ? 4 : /Basin|Plain|Plateau|Shelf/i.test(type) ? 5 : 6;
  undersea.set(id, { type: "Feature", id, properties: { id, name, kind: type, minZoom, priority: minZoom, sourceName: "IHO–IOC GEBCO Gazetteer", sourceUrl: gazetteer, sourceFeatureId: p.FEATURE_ID, informationUrl: "https://www.ngdc.noaa.gov/gazetteer/", locationNote: "Label anchor derived from the source feature geometry; not a surveyed boundary or point-depth measurement." }, geometry: { type: "Point", coordinates: point(feature.geometry) } });
}
writeFileSync(new URL("undersea-labels.geojson", output), JSON.stringify({ type: "FeatureCollection", features: [...undersea.values()] }) + "\n");
writeFileSync(new URL("named-landmarks-metadata.json", output), JSON.stringify({
  preparedOn: new Date().toISOString().slice(0, 10),
  sources: [
    { name: "Wikidata selected named forests and canyons", url: "https://www.wikidata.org/", license: "CC0", licenseUrl: "https://www.wikidata.org/wiki/Wikidata:Licensing", note: "Selected source coordinates, not comprehensive global coverage; no invented forest or canyon outlines." },
    { name: "IHO–IOC GEBCO Gazetteer of Undersea Feature Names", url: gazetteer, download: "https://services2.arcgis.com/C8EMgrsFcRFL6LrL/ArcGIS/rest/services/Undersea_Features/FeatureServer", attribution: "IHO-IOC GEBCO Gazetteer of Undersea Feature Names, www.gebco.net; IHO DCDB; NOAA NCEI", license: "GEBCO requests source acknowledgement; see the linked gazetteer documentation. Not asserted to share the separate GEBCO elevation-grid licence." },
  ], sourceSha256: checksums,
  counts: { forests: features.filter((f) => f.properties.kind === "Forest").length, canyons: features.filter((f) => f.properties.kind === "Canyon").length, undersea: undersea.size },
  transformations: "Select named forest/ecoregion and canyon records from Wikidata snapshots. Preserve source coordinates and record URLs. Convert GEBCO point/line/polygon source features into one label anchor per FEATURE_ID, preferring polygon over line over point geometry. Polygon anchors are interior Polylabel points; lines use their middle source vertex. Retain feature type. Use editorial zoom priorities for major undersea names. Raw geometry is not displayed as a boundary.",
  limitations: "Representative label locations can differ from local shoreline detail. Forest records include named forest regions/ecoregions and do not describe historical vegetation or current extent. Undersea label anchors identify large features, not exact depths. Sources may contain alternative names and approximate coordinates.",
}, null, 2) + "\n");
console.log(`Prepared ${features.length} named land regions and ${undersea.size} undersea names.`);
