import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { countryLabelPoint } from "./lib/country-labels.mjs";

if (!process.argv[2]) throw new Error("Usage: node scripts/prepare-sea-labels.mjs <ne_10m_geography_marine_polys.geojson>");
const raw = readFileSync(process.argv[2]);
const source = JSON.parse(raw);
const output = new URL("../public/data/world/", import.meta.url);
const countryBytes = readFileSync(new URL("countries.geojson", output));
const countries = JSON.parse(countryBytes);
const polygons = (geometry) => geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
const bounds = (polygon) => polygon[0].reduce((b, [x, y]) => [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)], [180, 90, -180, -90]);
const land = countries.features.flatMap((f) => polygons(f.geometry).map((polygon) => ({ polygon, bounds: bounds(polygon) })));
function inside([x, y], polygon) {
  let result = false;
  for (const ring of polygon) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) result = !result;
  }
  return result;
}
const onLand = ([x, y]) => land.some(({ polygon, bounds: b }) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3] && inside([x, y], polygon));
function waterAnchor(geometry) {
  const center = countryLabelPoint(geometry);
  if (!onLand(center)) return { point: center, adjusted: false };
  // Marine label areas can include islands. Find a nearby point in the source
  // region that is also water in the app's generalized country geometry.
  for (const steps of [32, 64, 128]) {
    let best, distance = Infinity;
    for (const polygon of polygons(geometry)) {
      const [west, south, east, north] = bounds(polygon);
      for (let i = 0; i < steps; i++) for (let j = 0; j < steps; j++) {
        const candidate = [west + (i + 0.5) * (east - west) / steps, south + (j + 0.5) * (north - south) / steps];
        const d = Math.hypot((candidate[0] - center[0]) * Math.cos(center[1] * Math.PI / 180), candidate[1] - center[1]);
        if (d < distance && inside(candidate, polygon) && !onLand(candidate)) { best = candidate; distance = d; }
      }
    }
    if (best) return { point: best, adjusted: true };
  }
  throw new Error("Could not place a sea label in water");
}
const marineKinds = { sea: "Sea", bay: "Bay", gulf: "Gulf" };
const features = source.features.filter((f) => Object.hasOwn(marineKinds, f.properties.featurecla)).map((feature) => {
  const p = feature.properties;
  const name = p.name_en || p.name;
  const id = `sea-${p.ne_id}`;
  const anchor = waterAnchor(feature.geometry);
  return {
    type: "Feature", id,
    properties: { id, name, kind: marineKinds[p.featurecla], minZoom: p.scalerank <= 1 ? 1 : Math.max(2, Math.floor(p.min_label ?? 4)), priority: p.scalerank ?? 10, adjustedForLand: anchor.adjusted },
    geometry: { type: "Point", coordinates: anchor.point.map((v) => Number(v.toFixed(5))) },
  };
});
writeFileSync(new URL("sea-labels.geojson", output), JSON.stringify({ type: "FeatureCollection", features }) + "\n");
writeFileSync(new URL("sea-metadata.json", output), JSON.stringify({
  title: "Natural Earth sea, bay and gulf label anchors",
  source: "https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_geography_marine_polys.geojson",
  license: "Public domain", licenseUrl: "https://www.naturalearthdata.com/about/terms-of-use/",
  sourceSha256: createHash("sha256").update(raw).digest("hex"),
  coastlineSha256: createHash("sha256").update(countryBytes).digest("hex"),
  preparedOn: new Date().toISOString().slice(0, 10), featureCount: features.length,
  kinds: Object.fromEntries(Object.values(marineKinds).map((kind) => [kind, features.filter((f) => f.properties.kind === kind).length])),
  transformations: "Retain sea-, bay- and gulf-class features and English names; compute interior Polylabel anchors. If an anchor lands on an island in the bundled country outlines, move it to the nearest water candidate on a 32/64/128-step grid inside its marine label region. Major rank-1 waters are eligible at zoom 1. Smaller waters use rounded-down source label zooms, starting at zoom 2. Source rank sets collision priority; labels remain eligible at closer zooms.",
  limitations: "Selected named seas, bays and gulfs from the source classifications, including inland seas. Approximate label regions are placement aids, not surveyed maritime boundaries. Country outlines are generalized; label eligibility does not guarantee visible placement when names compete.",
}, null, 2) + "\n");
console.log(`Prepared ${features.length} marine-water label anchors.`);
