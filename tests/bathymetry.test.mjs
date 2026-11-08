import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { bathymetrySource, physicalMapLayers, setMapMode } from "../src/data/physical-map-style.ts";

test("local bathymetry has complete tiles, source provenance and ordered depth bands", () => {
  const source = bathymetrySource();
  const base = new URL("../public/data/world/bathymetry/", import.meta.url);
  const metadata = JSON.parse(readFileSync(new URL("metadata.json", base)));
  const legend = JSON.parse(readFileSync(new URL("legend.json", base)));
  assert.equal(metadata.license, "Public domain");
  assert.match(metadata.sourceSha256, /^[a-f0-9]{64}$/);
  assert(source.tiles.every((url) => url.startsWith("/data/world/bathymetry/")));
  assert.deepEqual(legend.classes.map((band) => band.minimumDepthMetres), [0, 200, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000]);
  let count = 0;
  for (let z = source.minzoom; z <= source.maxzoom; z++) for (let x = 0; x < 2 ** z; x++) for (let y = 0; y < 2 ** z; y++) {
    assert(existsSync(new URL(`${z}/${x}/${y}.png`, base)));
    count++;
  }
  assert.equal(count, metadata.tileCount);
});

test("bathymetry remains visible for every physical surface and hides in Standard", () => {
  const ids = ["country-labels", "ocean-labels", "sea-labels", ...physicalMapLayers().map((l) => l.id)];
  const visibility = new Map();
  const map = {getLayer: (id) => ids.includes(id), setLayoutProperty: (id, key, value) => visibility.set(id, value)};
  for (const surface of ["relief", "land-cover", "geology"]) {
    setMapMode(map, "physical", surface);
    assert.equal(visibility.get("physical-bathymetry"), "visible");
    assert.equal(visibility.get("ocean-labels"), "visible");
    assert.equal(visibility.get("sea-labels"), "visible");
  }
  setMapMode(map, "standard");
  assert.equal(visibility.get("physical-bathymetry"), "none");
});
