import assert from "node:assert/strict";
import test from "node:test";
import { constrainWorldCamera, MIN_WORLD_ZOOM, minimumWorldZoom, maximumWorldZoom } from "../src/data/world-map-camera.ts";

test("horizontal panning can cross the date line repeatedly in either direction", () => {
  for (const lng of [-1080, -540, -181, 181, 540, 1080]) {
    assert.equal(constrainWorldCamera({ lng, lat: 20 }, 0).lng, lng);
  }
});

test("continuous longitude does not remove the polar or zoom limits", () => {
  const high = constrainWorldCamera({ lng: 540, lat: 100 }, 30);
  assert.deepEqual(high, { lng: 540, lat: 85, zoom: maximumWorldZoom() });
  const low = constrainWorldCamera({ lng: -540, lat: -100 }, MIN_WORLD_ZOOM - 10);
  assert.deepEqual(low, { lng: -540, lat: -85, zoom: MIN_WORLD_ZOOM });
});

test("maximum zoom matches Google's documented close-up scale on every viewport", () => {
  for (const width of [320, 390, 844, 1440, 2048]) {
    const overview = minimumWorldZoom(width);
    const max = maximumWorldZoom();
    assert.equal(512 * 2 ** max, 256 * 2 ** 22);
    assert.ok(max > overview + 10);
    assert.equal(constrainWorldCamera({ lng: 181, lat: 20 }, 18, overview).zoom, 18);
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

test("viewport top and bottom remain inside the polar boundaries at every zoom", () => {
  const mercatorY = (lat) => (1 - Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) / Math.PI) / 2;
  for (const [width, height] of [[1440, 1000], [390, 844], [844, 390]]) {
    const min = minimumWorldZoom(width, height);
    for (const zoom of [min, min + 0.5, maximumWorldZoom()]) {
      for (const lat of [-100, -85, 0, 85, 100]) {
        const camera = constrainWorldCamera({ lng: 540, lat }, zoom, min, height);
        const half = height / (2 * 512 * 2 ** camera.zoom);
        assert.ok(mercatorY(camera.lat) - half >= -1e-10, `north edge at ${width}x${height}, ${zoom}`);
        assert.ok(mercatorY(camera.lat) + half <= 1 + 1e-10, `south edge at ${width}x${height}, ${zoom}`);
        assert.equal(camera.lng, 540);
      }
    }
  }
});
