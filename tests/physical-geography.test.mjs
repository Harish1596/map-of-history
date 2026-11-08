import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { physicalMapLayers, setMapMode } from "../src/data/physical-map-style.ts";

const read = (name) => JSON.parse(readFileSync(new URL(`../public/data/world/physical/${name}.geojson`, import.meta.url)));

test("physical datasets contain real waterways and named landforms with valid zoom policy", () => {
  const rivers = read("rivers");
  const lakes = read("lakes");
  const labels = read("labels");
  assert(rivers.features.some((f) => /Nile/i.test(f.properties.name)));
  assert(lakes.features.some((f) => /Superior/i.test(f.properties.name)));
  for (const name of ["Alps", "Himalayas", "Sahara"]) {
    assert(labels.features.some((f) => f.properties.name === name && f.properties.minZoom === 0), `${name} eligible at world overview`);
  }
  for (const collection of [rivers, lakes, labels]) {
    assert.equal(new Set(collection.features.map((f) => f.id)).size, collection.features.length);
    for (const f of collection.features) {
      assert(Number.isFinite(f.properties.minZoom));
      assert(f.properties.minZoom >= 0 && f.properties.minZoom <= 21);
      assert(f.geometry.coordinates.length);
    }
  }
  const metadata = JSON.parse(readFileSync(new URL("../public/data/world/physical/metadata.json", import.meta.url)));
  assert.equal(metadata.license, "Public domain");
  assert.deepEqual(metadata.featureCounts, { rivers: rivers.features.length, lakes: lakes.features.length, labels: labels.features.length });
  assert(metadata.sources.every((s) => /^[a-f0-9]{64}$/.test(s.sourceSha256)));
});

test("mode switching changes visibility without touching the camera", () => {
  const visibility = new Map();
  const ids = ["country-borders", "country-labels", ...physicalMapLayers().map((l) => l.id)];
  const map = {
    getLayer: (id) => ids.includes(id),
    setLayoutProperty: (id, key, value) => { assert.equal(key, "visibility"); visibility.set(id, value); },
  };
  setMapMode(map, "physical");
  assert.equal(visibility.get("country-labels"), "none");
  assert.equal(visibility.get("physical-rivers"), "visible");
  setMapMode(map, "standard");
  assert.equal(visibility.get("country-borders"), "visible");
  assert.equal(visibility.get("physical-lakes"), "none");
  assert(physicalMapLayers().every((l) => l.layout.visibility === "none"));
});
