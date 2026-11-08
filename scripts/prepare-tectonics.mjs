import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { countryLabelPoint } from "./lib/country-labels.mjs";

// Download these two files from the pinned revision below; no network is used
// by this preparation script or by the map at runtime.
const revision = "339b0c56563c118307b1f4542703047f5f698fae";
const paths = process.argv.slice(2);
if (paths.length !== 2) throw new Error("Usage: node scripts/prepare-tectonics.mjs <PB2002_steps.json> <PB2002_plates.json>");
const raw = paths.map((path) => readFileSync(path));
const [steps, plates] = raw.map((bytes) => JSON.parse(bytes));
const sourceName = "PB2002 — Peter Bird; Hugo Ahlenius / Nordpil";
const sourceBase = `https://github.com/fraxen/tectonicplates/blob/${revision}/`;
const licenseUrl = "https://opendatacommons.org/licenses/by/1-0/";
const attribution = "Contains information from PB2002 (Peter Bird; Hugo Ahlenius / Nordpil), available under the ODC Attribution License v1.0.";
const classes = { SUB: "Convergent", CCB: "Convergent", OCB: "Convergent", CRB: "Divergent", OSR: "Divergent", CTF: "Transform", OTF: "Transform" };
const round = (coordinates) => Array.isArray(coordinates) ? coordinates.map(round) : Number(coordinates.toFixed(5));
const same = (a, b) => a[0] === b[0] && a[1] === b[1];
// The GIS conversion densifies each original digitization step. Remove that
// redundant detail within 0.002 degrees (~223 m); keep each step's endpoints.
function simplify(points) {
  if (points.length <= 2) return points;
  const [a, b] = [points[0], points.at(-1)];
  const dx = b[0] - a[0], dy = b[1] - a[1];
  let furthest = -1, maxDistance = 0.002 ** 2;
  for (let i = 1; i < points.length - 1; i += 1) {
    const t = dx || dy ? Math.max(0, Math.min(1, ((points[i][0] - a[0]) * dx + (points[i][1] - a[1]) * dy) / (dx * dx + dy * dy))) : 0;
    const distance = (points[i][0] - a[0] - t * dx) ** 2 + (points[i][1] - a[1] - t * dy) ** 2;
    if (distance > maxDistance) { furthest = i; maxDistance = distance; }
  }
  return furthest < 0 ? [a, b] : [...simplify(points.slice(0, furthest + 1)).slice(0, -1), ...simplify(points.slice(furthest))];
}
const names = new Map(plates.features.map((f) => [f.properties.Code, f.properties.PlateName]));
const boundaries = [];
for (const step of steps.features) {
  const p = step.properties;
  if (!classes[p.STEPCLASS]) throw new Error(`Unknown source classification: ${p.STEPCLASS}`);
  if (step.geometry.type !== "LineString") throw new Error("Expected source line geometry");
  const coordinates = round(simplify(step.geometry.coordinates));
  for (const [i, c] of coordinates.entries()) {
    if (!c.every(Number.isFinite) || Math.abs(c[0]) > 180 || Math.abs(c[1]) > 90 || (i && Math.abs(c[0] - coordinates[i - 1][0]) > 180)) throw new Error("Invalid or unsplit source coordinates");
  }
  const previous = boundaries.at(-1);
  // Only join steps the source declares continuous, with matching endpoints
  // and original class. Never bridge gaps or simplify across step endpoints.
  if (previous && p.STEPCONTIN === "TRUE" && previous.properties.boundaryCode === p.PLATEBOUND && previous.properties.sourceClass === p.STEPCLASS && same(previous.geometry.coordinates.at(-1), coordinates[0])) {
    previous.geometry.coordinates.push(...coordinates.slice(1));
    previous.properties.stepCount += 1;
  } else {
    const pair = p.PLATEBOUND.split(/[-/\\]/).map((code) => names.get(code) || code);
    const id = `pb2002-boundary-${p.SEQNUM}`;
    boundaries.push({ type: "Feature", id, properties: {
      id, name: `${pair.join("–")} boundary`, kind: "Plate boundary", boundaryType: classes[p.STEPCLASS],
      boundaryCode: p.PLATEBOUND, sourceClass: p.STEPCLASS, firstSourceStep: p.SEQNUM, stepCount: 1,
      minZoom: 0, priority: 1, sourceName, sourceUrl: `${sourceBase}GeoJSON/PB2002_steps.json`,
    }, geometry: { type: "LineString", coordinates } });
  }
}

const byCode = new Map();
for (const f of plates.features) {
  const code = f.properties.Code;
  const polygons = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  if (!byCode.has(code)) byCode.set(code, []);
  byCode.get(code).push(...polygons);
}
const major = new Set(["AF", "AN", "AU", "EU", "IN", "NA", "SA", "PA", "NZ", "SO"]);
const regional = new Set(["AR", "CA", "CO", "PS", "SU", "SC", "JF", "OK", "AM", "YA", "AT"]);
const labels = [...byCode.entries()].map(([code, polygons]) => {
  const id = `pb2002-plate-${code.toLowerCase()}`;
  return { type: "Feature", id, properties: {
    id, name: `${names.get(code)} Plate`, plateCode: code, kind: "Tectonic plate",
    minZoom: major.has(code) ? 2 : regional.has(code) ? 3 : 5,
    priority: major.has(code) ? 1 : regional.has(code) ? 3 : 6,
    sourceName, sourceUrl: `${sourceBase}GeoJSON/PB2002_plates.json`,
    anchor: "interior of largest source plate polygon",
  }, geometry: { type: "Point", coordinates: round(countryLabelPoint({ type: "MultiPolygon", coordinates: polygons })) } };
});
const output = new URL("../public/data/world/physical/", import.meta.url);
const collection = (features) => ({ type: "FeatureCollection", attribution, license: licenseUrl, features });
writeFileSync(new URL("tectonic-boundaries.geojson", output), JSON.stringify(collection(boundaries)) + "\n");
writeFileSync(new URL("tectonic-plates.geojson", output), JSON.stringify(collection(labels)) + "\n");
writeFileSync(new URL("tectonics-metadata.json", output), JSON.stringify({
  title: "PB2002 plate boundaries and tectonic plate labels", sourceName, attribution,
  license: "Open Data Commons Attribution License v1.0 (ODC-By)", licenseUrl,
  licenseDeclarationUrl: `${sourceBase}LICENSE.md`, revision,
  citation: "Bird, P. (2003), An updated digital model of plate boundaries, Geochemistry, Geophysics, Geosystems, 4(3), 1027, doi:10.1029/2001GC000252.",
  citationUrl: "https://doi.org/10.1029/2001GC000252",
  sourceDocumentationUrl: `${sourceBase}original/README.md`,
  preparedOn: new Date().toISOString().slice(0, 10), modelYear: 2002,
  sources: ["steps", "plates"].map((name, i) => ({ url: `${sourceBase}GeoJSON/PB2002_${name}.json`, sourceSha256: createHash("sha256").update(raw[i]).digest("hex"), featureCount: [steps, plates][i].features.length })),
  boundaryCount: boundaries.length, sourceStepCount: steps.features.length, plateLabelCount: labels.length,
  boundaryTypes: Object.fromEntries([...new Set(Object.values(classes))].map((type) => [type, boundaries.filter((f) => f.properties.boundaryType === type).length])),
  sourceClassMapping: classes,
  simplificationToleranceDegrees: 0.002,
  transformations: "Preserve every source step, its endpoints and class. Reduce GIS-densified intermediate vertices within each step using Douglas-Peucker simplification at 0.002 degrees (at most approximately 223 m); never simplify across source step endpoints. Join only adjacent, source-declared continuous steps with equal class and exact shared endpoints; round to five decimals. Source GeoJSON already splits the antimeridian. Plate labels use interior Polylabel anchors in the largest Mercator-projected polygon for each unique plate code. Names retain source wording with a Plate suffix; overview plates start at zoom 2, regional plates at 3, small plates at 5.",
  limitations: "PB2002 is a generalized global model published in 2003, not a current fault inventory, hazard model, or historical reconstruction. Boundaries are approximate; diffuse deformation zones and individual faults are not displayed. Source step classes describe modeled relative motion and are grouped into three broad display types; original seven class codes are retained. Distributor GeoJSON has 5,824 segments due to splitting, versus 5,819 steps in original documentation, and 54 plate polygons for 52 plates. Label anchors are cartographic aids, not plate centers or measurements. Model applies to present-day reference geography only.",
}, null, 2) + "\n");
console.log(`Prepared ${boundaries.length} boundaries from ${steps.features.length} source segments and ${labels.length} plate labels.`);
