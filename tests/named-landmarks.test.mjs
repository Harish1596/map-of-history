import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { landmarkMapLayers, setLandmarkVisibility, DEFAULT_LANDMARK_OPTIONS, LANDMARK_GROUPS, landmarkGroupForLayer } from "../src/data/landmark-map-style.ts";
const read = (name) => JSON.parse(readFileSync(new URL(`../public/data/world/physical/${name}`, import.meta.url)));

test("named forests, canyons and undersea places have finite source-backed label locations", () => {
  const regions = read("named-regions.geojson");
  const undersea = read("undersea-labels.geojson");
  assert(regions.features.some((f) => f.properties.name === "Amazon Rainforest"));
  assert(regions.features.some((f) => f.properties.name === "Grand Canyon"));
  assert(undersea.features.some((f) => f.properties.name === "Mariana Trench"));
  assert(undersea.features.some((f) => f.properties.name === "Mid-Atlantic Ridge"));
  for (const data of [regions, undersea]) {
    assert.equal(new Set(data.features.map((f) => f.id)).size, data.features.length);
    for (const f of data.features) {
      assert.equal(f.geometry.type, "Point");
      const [x,y] = f.geometry.coordinates;
      assert(Number.isFinite(x) && Math.abs(x) <= 180);
      assert(Number.isFinite(y) && Math.abs(y) <= 90);
      assert.match(f.properties.sourceUrl, /^https:\/\//);
      assert(f.properties.minZoom >= 2 && f.properties.minZoom <= 6);
    }
  }
  const metadata = read("named-landmarks-metadata.json");
  assert.equal(metadata.counts.undersea, undersea.features.length);
  assert.equal(metadata.counts.forests + metadata.counts.canyons, regions.features.length);
  assert(Object.values(metadata.sourceSha256).every((sha) => /^[a-f0-9]{64}$/.test(sha)));
});

test("all six physical-feature categories can be switched independently", () => {
  const layers = landmarkMapLayers();
  const visibility = new Map();
  const map = { getLayer: (id) => layers.find((l) => l.id === id), setLayoutProperty: (id, key, value) => visibility.set(id, value) };
  for (const [disabled] of LANDMARK_GROUPS) {
    setLandmarkVisibility(map, true, { ...DEFAULT_LANDMARK_OPTIONS, [disabled]: false });
    for (const layer of layers) assert.equal(visibility.get(layer.id), landmarkGroupForLayer(layer.id) === disabled ? "none" : "visible");
  }
  setLandmarkVisibility(map, false, DEFAULT_LANDMARK_OPTIONS);
  assert([...visibility.values()].every((value) => value === "none"));
});
