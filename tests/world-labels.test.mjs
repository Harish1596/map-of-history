import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { expression } from "@maplibre/maplibre-gl-style-spec";
import { worldMapStyle } from "../src/data/world-map-style.ts";
import { countryLabelPoint, countryLabelCenter } from "../scripts/lib/country-labels.mjs";
import { applyCountryLabelList } from "../src/data/world-label-policy.ts";
import { createCountryLabelList } from "../scripts/lib/country-label-policy.mjs";

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
  assert.ok(inPolygon(countryLabelCenter({ type: "Polygon", coordinates: withHole }), withHole));
  assert.ok(inPolygon(countryLabelCenter({ type: "MultiPolygon", coordinates: [island, mainland] }), mainland));
});

test("country names use the visual centroid rather than the widest part of an asymmetric outline", () => {
  const triangle = { type: "Polygon", coordinates: [[[0, 0], [12, 0], [0, 6], [0, 0]]] };
  const center = countryLabelCenter(triangle);
  assert.ok(Math.abs(center[0] - 4) < 0.001);
  const mercator = (lat) => Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
  assert.ok(Math.abs(mercator(center[1]) - mercator(6) / 3) < 0.000001);
  assert.ok(inPolygon(center, triangle.coordinates));
});

test("country labels use fixed cartographic rank, zoom gates and area tie-breakers", () => {
  const list = JSON.parse(readFileSync(new URL("../public/data/world/country-labels.json", import.meta.url)));
  const byId = new Map(list.countries.map((country) => [country.id, country]));
  assert.equal(byId.size, countries.features.length);
  assert.ok(byId.get("DZA").areaKm2 > byId.get("GRL").areaKm2, "geographic area avoids Mercator's polar size distortion");
  for (const id of ["FRA", "DZA", "PRT"]) {
    for (const island of ["BMU", "SPM", "PCN"]) {
      assert.ok(byId.get(id).minZoom < byId.get(island).minZoom, `${id} before ${island}`);
      assert.ok(byId.get(id).priority < byId.get(island).priority);
    }
  }
  let previous;
  for (const country of list.countries) {
    assert.ok(country.areaKm2 > 0);
    assert.equal(country.labelRank, countries.features.find((f) => f.id === country.id).properties.rank);
    if (previous) {
      assert.ok(country.labelRank >= previous.labelRank);
      assert.ok(country.minZoom >= previous.minZoom);
      if (country.labelRank === previous.labelRank) {
        assert.equal(country.minZoom, previous.minZoom, "same-rank neighbours become eligible together");
        assert.ok(country.areaKm2 <= previous.areaKm2, "area breaks rank ties");
      }
    }
    const label = labels.features.find((label) => label.id === country.id);
    assert.equal(label.properties.minZoom, country.minZoom);
    assert.equal(label.properties.priority, country.priority);
    assert.equal(label.properties.sizeTier, country.sizeTier);
    previous = country;
  }
  assert.equal(byId.get("CIV").minZoom, 3);
  assert.ok(byId.get("CIV").priority < byId.get("GHA").priority);
  assert.ok(byId.get("CIV").priority < byId.get("LBR").priority);
  assert.ok(byId.get("SDS").minZoom < byId.get("CAF").minZoom);
  assert.deepEqual(layer.filter, [">=", ["zoom"], ["get", "minZoom"]]);
  assert.deepEqual(layer.layout["symbol-sort-key"], ["get", "priority"]);
  assert.equal(layer.layout["text-allow-overlap"], false);
  assert.equal(layer.layout["text-anchor"], "center");
});

test("country priority does not depend on input order and rejects missing source ranks", () => {
  const forward = createCountryLabelList(countries.features);
  assert.deepEqual(createCountryLabelList([...countries.features].reverse()), forward);
  const invalid = { ...countries.features[0], properties: { ...countries.features[0].properties, rank: undefined } };
  assert.throws(() => createCountryLabelList([invalid]), /Invalid Natural Earth label rank/);
});

test("every geographic size tier grows in screen pixels across the style zoom stops", () => {
  const parsed = expression.createExpression(layer.layout["text-size"], "layers[3].layout.text-size");
  assert.equal(parsed.result, "success");
  for (const sizeTier of [0, 1, 2, 3, 4, 5, 6]) {
    const size = (zoom) => parsed.value.evaluate({ zoom }, { properties: { sizeTier } });
    for (const zoom of [0, 1, 2, 3, 4, 5, 6, 7]) {
      assert.ok(size(zoom + 1) > size(zoom), `tier ${sizeTier}, zoom ${zoom} → ${zoom + 1}`);
    }
    assert.ok(size(0) >= 10);
  }
});

test("the local country list controls rendered policy and rejects invalid edits", () => {
  const list = JSON.parse(readFileSync(new URL("../public/data/world/country-labels.json", import.meta.url)));
  list.countries.find((country) => country.id === "FRA").minZoom = 4;
  const applied = applyCountryLabelList(labels, list);
  assert.equal(applied.features.find((feature) => feature.id === "FRA").properties.minZoom, 4);
  assert.notEqual(labels.features.find((feature) => feature.id === "FRA").properties.minZoom, 4);
  assert.throws(() => applyCountryLabelList(labels, { countries: [] }), /Missing country/);
  assert.throws(() => applyCountryLabelList(labels, { countries: [...list.countries, list.countries[0]] }), /duplicate/);
  list.countries[0].minZoom = -1;
  assert.throws(() => applyCountryLabelList(labels, list), /Invalid country/);
});
