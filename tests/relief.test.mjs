import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { physicalMapLayers, reliefSource } from "../src/data/physical-map-style.ts";

test("relief uses local tiled imagery below water and labels, only in physical mode", () => {
  const source = reliefSource();
  assert.equal(source.type, "raster");
  assert(source.tiles.every((url) => url.startsWith("/data/world/relief/")));
  const layers = physicalMapLayers();
  assert.equal(layers[0].id, "physical-relief");
  assert.equal(layers[0].layout.visibility, "none");
  assert(layers.findIndex((l) => l.id === "physical-lakes") > 0);
  const metadata = JSON.parse(readFileSync(new URL("../public/data/world/relief/metadata.json", import.meta.url)));
  assert.equal(metadata.license, "Public domain");
  assert.match(metadata.sourceSha256, /^[a-f0-9]{64}$/);
  let count = 0;
  for (let z = source.minzoom; z <= source.maxzoom; z++) {
    for (let x = 0; x < 2 ** z; x++) for (let y = 0; y < 2 ** z; y++) {
      assert(existsSync(new URL(`../public/data/world/relief/${z}/${x}/${y}.webp`, import.meta.url)), `${z}/${x}/${y}`);
      count++;
    }
  }
  assert.equal(count, metadata.tileCount);
});
