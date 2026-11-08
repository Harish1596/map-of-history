import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (name) => JSON.parse(readFileSync(new URL(`../public/data/world/physical/${name}`, import.meta.url)));
const boundaries = read("tectonic-boundaries.geojson");
const plates = read("tectonic-plates.geojson");
const metadata = read("tectonics-metadata.json");
const mapping = { SUB: "Convergent", CCB: "Convergent", OCB: "Convergent", OSR: "Divergent", CRB: "Divergent", OTF: "Transform", CTF: "Transform" };

test("PB2002 boundaries retain all classified source steps without antimeridian chords", () => {
  assert.equal(boundaries.features.length, 1700);
  assert.equal(boundaries.features.reduce((sum, f) => sum + f.properties.stepCount, 0), 5824);
  assert.equal(new Set(boundaries.features.map((f) => f.id)).size, boundaries.features.length);
  assert.deepEqual(new Set(boundaries.features.map((f) => f.properties.sourceClass)), new Set(Object.keys(mapping)));
  for (const f of boundaries.features) {
    assert.equal(f.id, f.properties.id);
    assert.equal(f.properties.kind, "Plate boundary");
    assert.equal(f.properties.boundaryType, mapping[f.properties.sourceClass]);
    assert.equal(f.geometry.type, "LineString");
    assert(f.geometry.coordinates.length >= 2);
    assert(f.properties.stepCount > 0);
    assert(f.properties.name.endsWith(" boundary"));
    assert(f.properties.sourceUrl.includes(metadata.revision));
    assert(f.properties.minZoom <= 2);
    for (const [index, [lon, lat]] of f.geometry.coordinates.entries()) {
      assert(Number.isFinite(lon) && Number.isFinite(lat));
      assert(Math.abs(lon) <= 180 && Math.abs(lat) <= 90);
      if (index) assert(Math.abs(lon - f.geometry.coordinates[index - 1][0]) <= 180, `${f.id} crosses map`);
    }
  }
  for (const [code, type] of [["NZ\\SA", "Convergent"], ["NA-EU", "Divergent"], ["NA-PA", "Transform"]]) {
    assert(boundaries.features.some((f) => f.properties.boundaryCode === code && f.properties.boundaryType === type), code);
  }
});

test("plate label points cover the 52 PB2002 plates with useful zoom priorities", () => {
  assert.equal(plates.features.length, 52);
  assert.equal(new Set(plates.features.map((f) => f.id)).size, 52);
  assert.equal(new Set(plates.features.map((f) => f.properties.plateCode)).size, 52);
  for (const f of plates.features) {
    assert.equal(f.geometry.type, "Point");
    assert.equal(f.properties.id, f.id);
    assert.equal(f.properties.kind, "Tectonic plate");
    assert(f.properties.name.endsWith(" Plate"));
    assert(f.properties.minZoom >= 2 && f.properties.minZoom <= 5);
    assert(Number.isFinite(f.properties.priority));
    assert(f.geometry.coordinates.every(Number.isFinite));
    assert(Math.abs(f.geometry.coordinates[0]) <= 180 && Math.abs(f.geometry.coordinates[1]) <= 90);
  }
  const northAmerica = plates.features.find((f) => f.properties.plateCode === "NA");
  assert.equal(northAmerica.properties.name, "North America Plate");
  assert.equal(northAmerica.properties.minZoom, 2);
  assert(northAmerica.geometry.coordinates[0] < -50 && northAmerica.geometry.coordinates[1] > 0);
  const pacific = plates.features.find((f) => f.properties.plateCode === "PA");
  assert(Math.abs(pacific.geometry.coordinates[0]) > 100, "Pacific label stays in Pacific, away from antimeridian polygon averaging");
});

test("tectonic metadata exposes exact source revision, attribution, license and limitations", () => {
  assert.equal(metadata.boundaryCount, boundaries.features.length);
  assert.equal(metadata.plateLabelCount, plates.features.length);
  assert.equal(metadata.sourceStepCount, 5824);
  assert.deepEqual(metadata.sourceClassMapping, mapping);
  assert.equal(metadata.modelYear, 2002);
  assert.match(metadata.revision, /^[a-f\d]{40}$/);
  assert.match(metadata.preparedOn, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(metadata.licenseUrl, "https://opendatacommons.org/licenses/by/1-0/");
  assert.match(metadata.limitations, /not a current fault inventory/);
  assert.match(metadata.attribution, /Peter Bird/);
  assert.match(metadata.attribution, /Ahlenius/);
  for (const collection of [boundaries, plates]) {
    assert.equal(collection.license, metadata.licenseUrl);
    assert.equal(collection.attribution, metadata.attribution);
  }
  for (const source of metadata.sources) {
    assert.match(source.sourceSha256, /^[a-f\d]{64}$/);
    assert(source.url.includes(metadata.revision));
  }
  for (const [type, count] of Object.entries(metadata.boundaryTypes)) assert.equal(count, boundaries.features.filter((f) => f.properties.boundaryType === type).length);
});
