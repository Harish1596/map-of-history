import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (name) => JSON.parse(readFileSync(new URL(`../public/data/world/${name}`, import.meta.url), "utf8"));

test("world countries and labels have one-to-one stable IDs and valid coordinates", () => {
  const countries = read("countries.geojson");
  const labels = read("labels.geojson");
  assert.equal(countries.type, "FeatureCollection");
  assert.equal(countries.features.length, 242);
  const ids = new Set(countries.features.map((f) => f.id));
  assert.equal(ids.size, countries.features.length);
  assert.deepEqual(new Set(labels.features.map((f) => f.id)), ids);
  assert.equal(labels.features.length, ids.size);
  for (const country of countries.features) {
    assert.ok(["Polygon", "MultiPolygon"].includes(country.geometry.type));
    assert.ok(country.properties.name.length);
    assert.ok(country.properties.label.length);
  }
  for (const label of labels.features) {
    const [lng, lat] = label.geometry.coordinates;
    assert.ok(Number.isFinite(lng) && lng >= -180 && lng <= 180);
    assert.ok(Number.isFinite(lat) && lat >= -90 && lat <= 90);
    assert.ok(Number.isFinite(label.properties.rank));
    assert.ok(Number.isFinite(label.properties.minLabel));
  }
  for (const name of ["India", "Canada", "Brazil", "Australia", "France", "New Zealand"]) {
    assert.ok(labels.features.some((f) => f.properties.name === name), name);
  }
});

test("world data records its source, boundary convention, and license", () => {
  const metadata = read("metadata.json");
  assert.equal(metadata.featureCount, read("countries.geojson").features.length);
  assert.equal(metadata.license, "Public domain");
  assert.match(metadata.source, /^https:\/\/www.naturalearthdata.com\//);
  assert.match(metadata.sourceSha256, /^[a-f0-9]{64}$/);
  assert.match(metadata.boundaryConvention, /de facto/);
});
