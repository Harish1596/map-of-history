import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { expression } from "@maplibre/maplibre-gl-style-spec";
import { worldMapStyle } from "../src/data/world-map-style.ts";
import { countryLabelPoint } from "../scripts/lib/country-labels.mjs";

const read = (name) => JSON.parse(readFileSync(new URL(`../public/data/world/${name}.geojson`, import.meta.url)));
const countries = read("countries");
const labels = read("labels");
const layer = worldMapStyle(countries, labels).layers.find((layer) => layer.id === "country-labels");

// Independent even/odd containment check, including holes.
function inPolygon([x, y], polygon) {
  let inside = false;
  for (const ring of polygon) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

test("every country label anchor is inside its own territory", () => {
  const outside = [];
  for (const label of labels.features) {
    const country = countries.features.find((country) => country.id === label.id);
    const polygons = country.geometry.type === "Polygon" ? [country.geometry.coordinates] : country.geometry.coordinates;
    if (!polygons.some((polygon) => inPolygon(label.geometry.coordinates, polygon))) outside.push(label.properties.name);
  }
  assert.deepEqual(outside, []);
});

test("visual centers avoid holes and use the main landmass of island groups", () => {
  const mainland = [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]];
  const hole = [[3, 3], [7, 3], [7, 7], [3, 7], [3, 3]];
  const withHole = [...mainland, hole];
  assert.ok(inPolygon(countryLabelPoint({ type: "Polygon", coordinates: withHole }), withHole));
  const island = [[[30, 0], [31, 0], [31, 1], [30, 1], [30, 0]]];
  const point = countryLabelPoint({ type: "MultiPolygon", coordinates: [island, mainland] });
  assert.ok(inPolygon(point, mainland));
  assert.ok(Math.abs(point[0] - 5) < 0.01);
});

test("country label candidates are governed by collisions, not preset zoom gates", () => {
  assert.equal(layer.filter, undefined);
  assert.equal(layer.layout["text-allow-overlap"], false);
  assert.equal(layer.layout["text-anchor"], "center");
});

test("every label rank grows in screen pixels through the full supported zoom range", () => {
  const parsed = expression.createExpression(layer.layout["text-size"], "layers[3].layout.text-size");
  assert.equal(parsed.result, "success");
  for (const rank of [1, 2, 3, 4, 5, 6, 7]) {
    const size = (zoom) => parsed.value.evaluate({ zoom }, { properties: { rank } });
    for (const zoom of [0, 1, 2, 3, 4, 5, 6, 7]) {
      assert.ok(size(zoom + 1) > size(zoom), `rank ${rank}, zoom ${zoom} → ${zoom + 1}`);
    }
    assert.ok(size(0) >= 10);
  }
});
