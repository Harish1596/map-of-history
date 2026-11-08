import assert from "node:assert/strict";
import test from "node:test";
import { constrainWorldCamera, MAX_WORLD_MAGNIFICATION, MIN_WORLD_ZOOM, minimumWorldZoom, maximumWorldZoom } from "../src/data/world-map-camera.ts";

test("horizontal panning can cross the date line repeatedly in either direction", () => {
  for (const lng of [-1080, -540, -181, 181, 540, 1080]) {
    assert.equal(constrainWorldCamera({ lng, lat: 20 }, 0).lng, lng);
  }
});

test("continuous longitude does not remove the polar or zoom limits", () => {
  const high = constrainWorldCamera({ lng: 540, lat: 100 }, 30);
  assert.deepEqual(high, { lng: 540, lat: 85, zoom: maximumWorldZoom(MIN_WORLD_ZOOM) });
  const low = constrainWorldCamera({ lng: -540, lat: -100 }, MIN_WORLD_ZOOM - 10);
  assert.deepEqual(low, { lng: -540, lat: -85, zoom: MIN_WORLD_ZOOM });
});

test("maximum magnification is 2x the overview at every viewport width", () => {
  assert.equal(MAX_WORLD_MAGNIFICATION, 2);
  for (const width of [320, 390, 844, 1440, 2048]) {
    const overview = minimumWorldZoom(width);
    const max = maximumWorldZoom(overview);
    assert.equal(2 ** (max - overview), 2);
    assert.equal(constrainWorldCamera({ lng: 181, lat: 20 }, 30, overview).zoom, max);
  }
});

test("zoom-out limit keeps a single world-width across desktop and mobile", () => {
  for (const width of [320, 390, 844, 1440, 2048]) {
    const minZoom = minimumWorldZoom(width);
    assert.ok(512 * 2 ** minZoom >= width - 1e-8);
    assert.equal(constrainWorldCamera({ lng: 540, lat: 20 }, -10, minZoom).zoom, minZoom);
  }
});
