import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { worldMapStyle } from "../src/data/world-map-style.ts";
import { setMapMode } from "../src/data/physical-map-style.ts";
const read = (name) => JSON.parse(readFileSync(new URL(`../public/data/world/${name}`, import.meta.url)));

function inside([x, y], polygon) {
  let result = false;
  for (const ring of polygon) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) result = !result;
  }
  return result;
}

test("all five oceans have stable named anchors in water", () => {
  const oceans = read("ocean-labels.geojson");
  assert.equal(oceans.features.length, 7);
  assert.equal(new Set(oceans.features.map((f) => f.id)).size, 7);
  assert.deepEqual([...new Set(oceans.features.map((f) => f.properties.ocean))].sort(), ["Arctic Ocean", "Atlantic Ocean", "Indian Ocean", "Pacific Ocean", "Southern Ocean"].sort());
  const countries = read("countries.geojson");
  for (const point of oceans.features) {
    assert(point.properties.name.endsWith("Ocean"));
    for (const country of countries.features) {
      const polygons = country.geometry.type === "Polygon" ? [country.geometry.coordinates] : country.geometry.coordinates;
      assert(!polygons.some((polygon) => inside(point.geometry.coordinates, polygon)), `${point.properties.name} is offshore`);
    }
  }
  const metadata = read("ocean-metadata.json");
  assert.equal(metadata.license, "Public domain");
  assert.match(metadata.sourceSha256, /^[a-f0-9]{64}$/);
});

test("ocean labels remain visible and reserve space ahead of seas and other labels", () => {
  const style = worldMapStyle(read("countries.geojson"), read("labels.geojson"), read("island-labels.geojson"), read("ocean-labels.geojson"));
  const index = style.layers.findIndex((layer) => layer.id === "ocean-labels");
  assert(index > style.layers.findIndex((layer) => layer.id === "country-labels"));
  assert.equal(style.layers[index].layout["text-allow-overlap"], true);
  assert.equal(style.layers[index].layout["text-ignore-placement"], false);
  assert.equal(style.layers[index].minzoom, undefined);
  assert.equal(style.layers[index].maxzoom, undefined);
  assert.equal(style.layers[index].filter, undefined);
  const withSeas = worldMapStyle(read("countries.geojson"), read("labels.geojson"), read("island-labels.geojson"), read("ocean-labels.geojson"), read("sea-labels.geojson"));
  assert(withSeas.layers.findIndex((layer) => layer.id === "ocean-labels") > withSeas.layers.findIndex((layer) => layer.id === "sea-labels"));
  const visibility = new Map();
  const map = { getLayer: (id) => style.layers.find((layer) => layer.id === id), setLayoutProperty: (id, key, value) => visibility.set(id, value) };
  setMapMode(map, "physical");
  assert.equal(visibility.get("ocean-labels"), "none");
  setMapMode(map, "standard");
  assert.equal(visibility.get("ocean-labels"), "visible");
});
