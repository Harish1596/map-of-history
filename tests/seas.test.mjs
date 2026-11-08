import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
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

test("named seas have stable IDs and source-guided zoom eligibility", () => {
  const seas = read("sea-labels.geojson");
  const countries = read("countries.geojson");
  assert.equal(seas.features.length, 71);
  assert.equal(new Set(seas.features.map((f) => f.id)).size, 71);
  for (const name of ["Mediterranean Sea", "Black Sea", "Red Sea", "Caspian Sea", "Caribbean Sea", "Baltic Sea", "North Sea", "Aegean Sea", "Bering Sea"]) {
    assert(seas.features.some((f) => f.properties.name === name), name);
  }
  for (const f of seas.features) {
    assert(f.properties.minZoom >= 1 && f.properties.minZoom <= 8);
    assert(f.geometry.coordinates.every(Number.isFinite));
    assert(Math.abs(f.geometry.coordinates[0]) <= 180 && Math.abs(f.geometry.coordinates[1]) <= 90);
    for (const country of countries.features) {
      const polygons = country.geometry.type === "Polygon" ? [country.geometry.coordinates] : country.geometry.coordinates;
      assert(!polygons.some((polygon) => inside(f.geometry.coordinates, polygon)), `${f.properties.name} stays offshore`);
    }
  }
  const meta = read("sea-metadata.json");
  assert.equal(meta.featureCount, seas.features.length);
  assert.equal(meta.license, "Public domain");
  assert.match(meta.sourceSha256, /^[a-f0-9]{64}$/);
  assert.equal(meta.coastlineSha256, createHash("sha256").update(readFileSync(new URL("../public/data/world/countries.geojson", import.meta.url))).digest("hex"));
});

test("sea labels yield to countries and switch with Standard", () => {
  const seas = read("sea-labels.geojson");
  const style = worldMapStyle(read("countries.geojson"), read("labels.geojson"), read("island-labels.geojson"), read("ocean-labels.geojson"), seas);
  const index = style.layers.findIndex((layer) => layer.id === "sea-labels");
  assert(index >= 0 && index < style.layers.findIndex((layer) => layer.id === "country-labels"));
  assert.equal(style.layers[index].layout["text-allow-overlap"], false);
  assert.deepEqual(style.layers[index].filter, [">=", ["zoom"], ["get", "minZoom"]]);
  const visibility = new Map();
  const map = { getLayer: (id) => style.layers.find((layer) => layer.id === id), setLayoutProperty: (id, key, value) => visibility.set(id, value) };
  setMapMode(map, "physical"); assert.equal(visibility.get("sea-labels"), "none");
  setMapMode(map, "standard"); assert.equal(visibility.get("sea-labels"), "visible");
});
