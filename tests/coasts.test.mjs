import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { physicalMapLayers } from "../src/data/physical-map-style.ts";

const read = (name) => JSON.parse(readFileSync(new URL(`../public/data/world/physical/${name}`, import.meta.url)));
test("coastal data includes shorelines and correctly classified coastal features", () => {
  const data = read("coasts.geojson");
  assert.equal(new Set(data.features.map((f) => f.id)).size, data.features.length);
  assert(data.features.some((f) => f.geometry.type === "LineString"));
  const labels = data.features.filter((f) => f.geometry.type === "Point");
  for (const [name, kind] of [["Arabian Peninsula", "Peninsula"], ["Strait of Gibraltar", "Strait"], ["Bay of Biscay", "Bay"], ["Persian Gulf", "Gulf"], ["Cape of Good Hope", "Cape"]]) {
    assert(labels.some((f) => f.properties.name === name && f.properties.kind === kind), name);
  }
  const capeYork = labels.filter((f) => f.properties.name === "Cape York");
  assert(capeYork.some((f) => f.geometry.coordinates[1] < 0), "Australian Cape York retained");
  assert(capeYork.some((f) => f.geometry.coordinates[1] > 0), "Greenland Cape York retained");
  for (const f of labels) {
    assert(f.properties.minZoom >= 2 && f.properties.minZoom <= 10);
    assert(["land", "water"].includes(f.properties.zone));
    assert(f.geometry.coordinates.every(Number.isFinite));
    assert(Math.abs(f.geometry.coordinates[0]) <= 180 && Math.abs(f.geometry.coordinates[1]) <= 90);
  }
  const metadata = read("coasts-metadata.json");
  assert.equal(metadata.featureCount, data.features.length);
  assert.equal(metadata.labelCount, labels.length);
  assert.equal(metadata.license, "Public domain");
  assert(metadata.sources.every((s) => /^[a-f0-9]{64}$/.test(s.sourceSha256)));
});

test("coastal outlines and labels are physical-only and sit above relief", () => {
  const layers = physicalMapLayers();
  for (const id of ["physical-coastline", "physical-coastal-water-labels", "physical-coastal-land-labels", "physical-capes"]) {
    const index = layers.findIndex((l) => l.id === id);
    assert(index > layers.findIndex((l) => l.id === "physical-relief"));
    assert.equal(layers[index].source, "physical-coasts");
    assert.equal(layers[index].layout.visibility, "none");
  }
});
