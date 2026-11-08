import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const collection = JSON.parse(readFileSync(new URL("../public/data/world/physical/summits.geojson", import.meta.url)));
const metadata = JSON.parse(readFileSync(new URL("../public/data/world/physical/summits-metadata.json", import.meta.url)));
const features = collection.features;

test("summits contain valid, individually sourced offline markers", () => {
  assert.equal(collection.type, "FeatureCollection");
  assert.ok(features.length > 1500);
  const ids = new Set();
  for (const feature of features) {
    const p = feature.properties;
    assert.equal(feature.geometry.type, "Point");
    const [longitude, latitude] = feature.geometry.coordinates;
    assert.ok(Number.isFinite(longitude) && longitude >= -180 && longitude <= 180);
    assert.ok(Number.isFinite(latitude) && latitude >= -90 && latitude <= 90);
    assert.equal(feature.geometry.coordinates.length, 2);
    assert.ok(p.name.trim());
    assert.ok(["Peak", "Volcano"].includes(p.kind));
    assert.equal(p.id, feature.id);
    assert.ok(!ids.has(feature.id), `duplicate ID ${feature.id}`);
    ids.add(feature.id);
    assert.ok(Number.isInteger(p.minZoom) && p.minZoom >= 3 && p.minZoom <= 6);
    assert.ok(Number.isFinite(p.priority));
    assert.ok(p.sourceName);
    assert.equal(new URL(p.sourceUrl).protocol, "https:");
    if (p.informationUrl) assert.equal(new URL(p.informationUrl).protocol, "https:");
    if (p.elevationMetres !== undefined) assert.ok(Number.isFinite(p.elevationMetres) && p.elevationMetres >= -12000 && p.elevationMetres < 9000);
    if (p.kind === "Peak") assert.ok(p.elevationMetres > 0);
    assert.equal(p.active, undefined, "catalog membership must not imply current activity");
  }
});

test("major mountains and volcanoes survive ranking and overlap removal", () => {
  for (const name of ["Mount Everest", "K2", "Denali", "Aconcagua", "Mount Kilimanjaro", "Mont Blanc", "Vinson Massif"]) {
    const match = features.find((f) => f.properties.name === name);
    assert.ok(match, name);
    assert.equal(match.properties.kind, "Peak");
    assert.ok(match.properties.minZoom <= 4);
  }
  for (const name of ["Fujisan", "Etna", "Krakatau", "Mauna Loa", "Kilauea", "Vesuvius", "Popocatepetl", "Erebus"]) {
    const matches = features.filter((f) => f.properties.name === name);
    assert.equal(matches.length, 1, name);
    assert.equal(matches[0].properties.kind, "Volcano");
    assert.equal(matches[0].properties.minZoom, 3);
  }
  assert.ok(!features.some((f) => f.properties.name === "Mount Fuji"));
  const fuji = features.find((f) => f.properties.name === "Fujisan").properties;
  assert.equal(fuji.peakName, "Mount Fuji");
  assert.equal(fuji.peakElevationMetres, 3776);
  assert.equal(fuji.elevationMetres, 3776);
  assert.equal(features.find((f) => f.properties.peakName === "Morne Diablotins").properties.name, "Diablotins, Morne");
});

test("summit metadata records exact provenance and honest catalog limitations", () => {
  assert.equal(metadata.featureCounts.total, features.length);
  assert.equal(metadata.featureCounts.peaks, features.filter((f) => f.properties.kind === "Peak").length);
  assert.equal(metadata.featureCounts.volcanoes, features.filter((f) => f.properties.kind === "Volcano").length);
  assert.equal(metadata.featureCounts.volcanoes, metadata.sources[1].sourceRecords);
  assert.equal(metadata.featureCounts.mergedPeakRecords, metadata.mergedPeakRecords.length);
  for (const source of metadata.sources) {
    assert.match(source.sourceSha256, /^[a-f0-9]{64}$/);
    assert.ok(source.license && source.licenseUrl && source.url);
  }
  assert.match(metadata.limitations, /does not mean currently erupting or active/);
  assert.match(metadata.limitations, /source-era/);
  const missingElevation = features.filter((f) => f.properties.elevationMetres === undefined);
  assert.equal(missingElevation.length, 2);
  assert.ok(features.some((f) => f.properties.kind === "Volcano" && f.properties.elevationMetres < 0), "retain submarine volcano elevations without converting to land heights");
});
