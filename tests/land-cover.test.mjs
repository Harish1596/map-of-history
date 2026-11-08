import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { landCoverSource, landCoverLayer, physicalMapLayers, setMapMode } from "../src/data/physical-map-style.ts";
const read = (name) => JSON.parse(readFileSync(new URL(`../public/data/world/land-cover/${name}`, import.meta.url)));

test("land-cover classes preserve categorical codes and document modern overview coverage", () => {
  const legend = read("legend.json");
  assert.equal(legend.year, 2020);
  const codes = legend.classes.flatMap((c) => c.codes);
  assert.equal(new Set(codes).size, codes.length);
  for (const code of [0, 10, 20, 50, 90, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210, 220]) assert(codes.includes(code));
  const meta = read("metadata.json");
  assert.equal(meta.year, legend.year);
  assert.match(meta.localOverviewSha256, /^[a-f0-9]{64}$/);
  const hash = (path) => createHash("sha256").update(readFileSync(new URL(path, import.meta.url))).digest("hex");
  assert.equal(meta.legendSha256, hash("../public/data/world/land-cover/legend.json"), "legend edits require regenerating categorical tiles");
  assert.equal(meta.coastlineSha256, hash("../public/data/world/countries.geojson"), "coastline edits require regenerating the land mask");
  assert.equal(meta.sourceResolutionMetres, 300);
  assert(meta.overviewResolutionMetres > meta.sourceResolutionMetres);
  assert.deepEqual(meta.unmappedCodes, []);
  const source = landCoverSource();
  let count = 0;
  for (let z = source.minzoom; z <= source.maxzoom; z++) for (let x = 0; x < 2 ** z; x++) for (let y = 0; y < 2 ** z; y++) {
    assert(existsSync(new URL(`../public/data/world/land-cover/${z}/${x}/${y}.png`, import.meta.url)));
    count++;
  }
  assert.equal(meta.tileCount, count);
  assert.equal(landCoverLayer().paint["raster-resampling"], "nearest");
});

test("land cover replaces relief only while selected in Physical Geography", () => {
  const ids = ["country-borders", "country-labels", landCoverLayer().id, ...physicalMapLayers().map((l) => l.id)];
  const visibility = new Map();
  const map = { getLayer: (id) => ids.includes(id), setLayoutProperty: (id, key, value) => visibility.set(id, value) };
  setMapMode(map, "physical", "land-cover");
  assert.equal(visibility.get("physical-relief"), "none");
  assert.equal(visibility.get("physical-land-cover"), "visible");
  assert.equal(visibility.get("physical-coastline"), "visible");
  setMapMode(map, "standard", "land-cover");
  assert.equal(visibility.get("physical-land-cover"), "none");
  setMapMode(map, "physical", "relief");
  assert.equal(visibility.get("physical-relief"), "visible");
  assert.equal(visibility.get("physical-land-cover"), "none");
});
