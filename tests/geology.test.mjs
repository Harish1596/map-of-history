import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { geologySource, geologyLayer, physicalMapLayers, landCoverLayer, setMapMode } from "../src/data/physical-map-style.ts";
const read = (name) => JSON.parse(readFileSync(new URL(`../public/data/world/geology/${name}`, import.meta.url)));

test("geology preserves all source classes, records provenance and includes its tile pyramid", () => {
  const legend = read("legend.json");
  const codes = legend.classes.map((group) => group.code);
  assert.equal(new Set(codes).size, 16);
  for (const code of ["su", "ss", "sm", "sc", "ev", "py", "va", "vi", "vb", "pa", "pi", "pb", "mt", "wb", "ig", "nd"]) assert(codes.includes(code));
  const metadata = read("metadata.json");
  assert.equal(metadata.featureCount, 1235259);
  assert.equal(Object.values(metadata.sourceClassCounts).reduce((a, b) => a + b, 0), metadata.featureCount);
  assert.deepEqual(Object.keys(metadata.sourceClassCounts).sort(), codes.sort());
  assert.match(metadata.sourceSha256, /^[a-f0-9]{64}$/);
  const hash = (path) => createHash("sha256").update(readFileSync(new URL(path, import.meta.url))).digest("hex");
  assert.equal(metadata.legendSha256, hash("../public/data/world/geology/legend.json"));
  assert.equal(metadata.coastlineSha256, hash("../public/data/world/countries.geojson"));
  const source = geologySource();
  let count = 0;
  for (let z = source.minzoom; z <= source.maxzoom; z++) for (let x = 0; x < 2 ** z; x++) for (let y = 0; y < 2 ** z; y++) {
    assert(existsSync(new URL(`../public/data/world/geology/${z}/${x}/${y}.png`, import.meta.url)));
    count++;
  }
  assert.equal(metadata.tileCount, count);
  assert.equal(geologyLayer().paint["raster-resampling"], "nearest");
});

test("physical surfaces are mutually exclusive and hidden in Standard", () => {
  const ids = ["country-borders", "country-labels", geologyLayer().id, landCoverLayer().id, ...physicalMapLayers().map((layer) => layer.id)];
  const visibility = new Map();
  const map = { getLayer: (id) => ids.includes(id), setLayoutProperty: (id, key, value) => visibility.set(id, value) };
  for (const surface of ["relief", "land-cover", "geology"]) {
    setMapMode(map, "physical", surface);
    for (const [id, expected] of [["physical-relief", "relief"], ["physical-land-cover", "land-cover"], ["physical-geology", "geology"]]) {
      assert.equal(visibility.get(id), surface === expected ? "visible" : "none");
    }
    assert.equal(visibility.get("physical-coastline"), "visible");
    setMapMode(map, "standard", surface);
    assert(["physical-relief", "physical-land-cover", "physical-geology"].every((id) => visibility.get(id) === "none"));
  }
});
