import test from "node:test";
import assert from "node:assert/strict";
import { retainCountryLabels } from "../src/data/country-label-retention.ts";

test("visible countries keep precedence over newly fitting neighbours during zoom-in", () => {
  const handlers = new Map(), changes = [];
  let zoom = 2.3;
  let visible = [{ properties: { id: "CAF", priority: 44 } }, { properties: { id: "CIV", priority: 69 } }];
  const map = {
    getLayer: () => true, getZoom: () => zoom,
    queryRenderedFeatures: () => visible,
    setLayoutProperty: (id, property, value) => changes.push({ id, property, value }),
    on: (event, handler) => handlers.set(event, handler),
    off: (event, handler) => { assert.equal(handlers.get(event), handler); handlers.delete(event); },
  };
  const cleanup = retainCountryLabels(map);
  handlers.get("idle")();
  assert.deepEqual(changes.at(-1).value, ["match", ["get", "id"], "CAF", 0, "CIV", 1, ["+", 2, ["get", "priority"]]]);
  zoom = 3.2; handlers.get("zoom")();
  visible = [...visible, { properties: { id: "SDS", priority: 43 } }];
  handlers.get("idle")();
  assert.deepEqual(changes.at(-1).value, ["match", ["get", "id"], "CAF", 0, "CIV", 1, "SDS", 2, ["+", 3, ["get", "priority"]]]);
  const count = changes.length;
  handlers.get("idle")();
  assert.equal(changes.length, count, "unchanged placements do not trigger another layout");
  zoom = 2.2; handlers.get("zoom")();
  assert.deepEqual(changes.at(-1).value, ["get", "priority"], "zoom-out restores area-based priority");
  cleanup();
  assert.equal(handlers.size, 0);
});
