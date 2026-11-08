import polylabel from "polylabel";

// Match the flat map's Mercator projection so the center is visual rather than
// a latitude/longitude average (which can land in the sea or a polygon hole).
const project = ([lng, lat]) => [
  lng * Math.PI / 180,
  Math.log(Math.tan(Math.PI / 4 + Math.max(-85, Math.min(85, lat)) * Math.PI / 360)),
];
const unproject = ([x, y]) => [
  x * 180 / Math.PI,
  (2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180 / Math.PI,
];

function ringArea(ring) {
  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    area += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return Math.abs(area / 2);
}

export function countryLabelPoint(geometry) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const projected = polygons.map((polygon) => polygon.map((ring) => ring.map(project)));
  // One label per country: use its largest visible landmass, rather than a
  // centroid between separate islands or an overseas territory.
  const area = (polygon) => ringArea(polygon[0]) - polygon.slice(1).reduce((sum, ring) => sum + ringArea(ring), 0);
  const mainland = projected.reduce((best, polygon) => area(polygon) > area(best) ? polygon : best);
  const xs = mainland[0].map(([x]) => x);
  const ys = mainland[0].map(([, y]) => y);
  const span = Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const point = polylabel(mainland, Math.max(span / 1024, 1e-9));
  return unproject(point);
}
