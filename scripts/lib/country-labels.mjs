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

function projectedMainland(geometry) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const projected = polygons.map((polygon) => polygon.map((ring) => ring.map(project)));
  // One label per country: use its largest visible landmass, rather than a
  // centroid between separate islands or an overseas territory.
  const area = (polygon) => ringArea(polygon[0]) - polygon.slice(1).reduce((sum, ring) => sum + ringArea(ring), 0);
  const mainland = projected.reduce((best, polygon) => area(polygon) > area(best) ? polygon : best);
  return mainland;
}

export function countryLabelPoint(geometry) {
  const mainland = projectedMainland(geometry);
  const xs = mainland[0].map(([x]) => x);
  const ys = mainland[0].map(([, y]) => y);
  const span = Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const point = polylabel(mainland, Math.max(span / 1024, 1e-9));
  return unproject(point);
}

// The area-weighted visual center differs from Polylabel's widest interior spot.
// Use it for country names, retaining an interior fallback for concave outlines
// and holes whose geometric center is outside the country's land.
export function countryLabelCenter(geometry) {
  const mainland = projectedMainland(geometry);
  let weight = 0, x = 0, y = 0;
  for (const [index, ring] of mainland.entries()) {
    let crossSum = 0, ringX = 0, ringY = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const cross = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
      crossSum += cross;
      ringX += (ring[j][0] + ring[i][0]) * cross;
      ringY += (ring[j][1] + ring[i][1]) * cross;
    }
    if (!crossSum) continue;
    const ringWeight = Math.abs(crossSum) * (index === 0 ? 1 : -1);
    weight += ringWeight;
    x += ringX / (3 * crossSum) * ringWeight;
    y += ringY / (3 * crossSum) * ringWeight;
  }
  const center = [x / weight, y / weight];
  let inside = false;
  for (const ring of mainland) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > center[1]) !== (yj > center[1]) && center[0] < (xj - xi) * (center[1] - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside ? unproject(center) : countryLabelPoint(geometry);
}
