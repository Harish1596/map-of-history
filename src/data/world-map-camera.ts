export const MIN_WORLD_ZOOM = -2;
// Google documents 256px tiles through zoom 22. MapLibre's 512px world at
// zoom zero reaches the same pixel scale at zoom 21 (512 * 2^21 = 256 * 2^22).
// Reference: https://developers.google.com/maps/documentation/tile/2d-tiles-overview
export const MAX_WORLD_ZOOM = 21;

export function worldOverviewZoom(viewportWidth: number, viewportHeight = 0) {
  // MapLibre's world is 512 CSS pixels wide at zoom zero. Keep the visible
  // longitude span at or below 360°, and fill the height so neither pole
  // exposes space beyond the map on tall screens.
  return Math.max(MIN_WORLD_ZOOM, Math.log2(Math.max(1, viewportWidth, viewportHeight) / 512));
}

export function minimumWorldZoom(viewportWidth: number, viewportHeight = 0) {
  return Math.max(MIN_WORLD_ZOOM, worldOverviewZoom(viewportWidth, viewportHeight) - 2);
}

export function maximumWorldZoom() {
  return MAX_WORLD_ZOOM;
}

export function constrainWorldCamera(
  center: { lng: number; lat: number },
  zoom: number,
  minZoom = MIN_WORLD_ZOOM,
  viewportHeight = 0,
) {
  const boundedZoom = Math.max(minZoom, Math.min(maximumWorldZoom(), zoom));
  const halfHeight = Math.min(0.5, viewportHeight / (2 * 512 * 2 ** boundedZoom));
  const lat = Math.max(-85, Math.min(85, center.lat));
  const y = (1 - Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) / Math.PI) / 2;
  const boundedY = Math.max(halfHeight, Math.min(1 - halfHeight, y));
  return {
    // Preserve unwrapped longitude: 181 degrees must continue east rather
    // than stopping or jumping when the camera crosses the date line.
    lng: center.lng,
    lat: viewportHeight > 0
      ? Math.atan(Math.sinh(Math.PI * (1 - 2 * boundedY))) * 180 / Math.PI
      : lat,
    zoom: boundedZoom,
  };
}
