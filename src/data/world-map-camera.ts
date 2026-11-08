export const MIN_WORLD_ZOOM = -2;
export const MAX_WORLD_MAGNIFICATION = 2;

export function minimumWorldZoom(viewportWidth: number) {
  // MapLibre's world is 512 CSS pixels wide at zoom zero. Keep the visible
  // longitude span at or below 360° instead of exposing a row of whole worlds.
  return Math.max(MIN_WORLD_ZOOM, Math.log2(Math.max(1, viewportWidth) / 512));
}

export function maximumWorldZoom(minZoom: number) {
  // Zoom levels are logarithmic: one extra level doubles linear scale.
  return minZoom + Math.log2(MAX_WORLD_MAGNIFICATION);
}

export function constrainWorldCamera(
  center: { lng: number; lat: number },
  zoom: number,
  minZoom = MIN_WORLD_ZOOM,
) {
  return {
    // Preserve unwrapped longitude: 181 degrees must continue east rather
    // than stopping or jumping when the camera crosses the date line.
    lng: center.lng,
    lat: Math.max(-85, Math.min(85, center.lat)),
    zoom: Math.max(minZoom, Math.min(maximumWorldZoom(minZoom), zoom)),
  };
}
