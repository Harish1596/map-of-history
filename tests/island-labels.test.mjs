import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { worldMapStyle } from "../src/data/world-map-style.ts";

const read = (file) => JSON.parse(readFileSync(new URL(`../public/data/world/${file}`, import.meta.url)));

test("the Mediterranean islands in the screenshot have independent physical labels", () => {
  const islands = read("island-labels.geojson");
  for (const name of ["Corsica", "Sardinia", "Sicily", "Balearic Islands", "Mallorca", "Menorca", "Ibiza"]) {
    const feature = islands.features.find((feature) => feature.properties.name === name);
    assert.ok(feature, name);
    assert.ok(feature.properties.minZoom <= (name === "Corsica" || name === "Sardinia" ? 4 : 6));
  }
  assert.equal(new Set(islands.features.map((feature) => feature.id)).size, islands.features.length);
  const countries = new Set(read("country-labels.json").countries.flatMap((country) => [country.name.toLowerCase(), country.label.toLowerCase()]));
  for (const feature of islands.features) {
    assert.ok(!countries.has(feature.properties.name.toLowerCase()), `avoid duplicate country name: ${feature.properties.name}`);
    assert.ok(["Island", "Island group"].includes(feature.properties.kind));
    assert.ok(feature.properties.minZoom >= 3 && feature.properties.minZoom <= 10);
    assert.ok(feature.properties.maxZoom > feature.properties.minZoom);
    const [lng, lat] = feature.geometry.coordinates;
    assert.ok(lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90);
  }
});

test("physical labels arrive after the country overview and yield collision priority to countries", () => {
  const style = worldMapStyle(read("countries.geojson"), read("labels.geojson"), read("island-labels.geojson"));
  const index = style.layers.findIndex((layer) => layer.id === "island-labels");
  const layer = style.layers[index];
  assert.ok(index < style.layers.findIndex((layer) => layer.id === "country-labels"));
  assert.equal(layer.minzoom, 3);
  assert.equal(layer.layout["text-allow-overlap"], false);
  assert.deepEqual(layer.filter, ["all", [">=", ["zoom"], ["get", "minZoom"]], ["<", ["zoom"], ["get", "maxZoom"]]]);
  const balearics = read("island-labels.geojson").features.find((feature) => feature.properties.name === "Balearic Islands");
  assert.equal(balearics.properties.maxZoom, 6, "archipelago label yields room for Mallorca and Menorca");
  assert.ok(read("island-metadata.json").sourceSha256.match(/^[a-f0-9]{64}$/));
});
