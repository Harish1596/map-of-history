import { countryLabelCenter } from './country-labels.mjs';

function contains(geometry, [x, y]) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polygons.some((polygon) => {
    let inside = false;
    for (const ring of polygon) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  });
}

// Prefer the existing reference anchor. If differing source coastlines put it
// outside a version, choose one shared interior point and use it in every view.
export function sharedCountryLabelAnchor(geometries, preferred) {
  const insideAll = (point) => geometries.every((geometry) => contains(geometry, point));
  if (insideAll(preferred)) return preferred;
  const candidates = geometries.flatMap((geometry) => {
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
    return [countryLabelCenter(geometry), ...polygons.map((coordinates) => countryLabelCenter({ type:'Polygon', coordinates }))];
  });
  const distance = ([x,y]) => (x-preferred[0])**2 + (y-preferred[1])**2;
  const result = candidates.filter(insideAll).sort((a,b) => distance(a)-distance(b))[0];
  if (!result) throw new Error('No common interior label anchor across country versions');
  return result;
}
