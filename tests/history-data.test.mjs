import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { antiochDataSchema } from "../src/data/schemas.ts";

const root = new URL("../public/data/antioch/", import.meta.url);
const data = Object.fromEntries(await Promise.all(
  Object.entries({ events: "events", relations: "event-relations", places: "places", sources: "sources", citations: "citations" })
    .map(async ([key, file]) => [key, JSON.parse(await readFile(new URL(`${file}.json`, root), "utf8"))]),
));

test("the siege dataset has valid references and citations on every episode", () => {
  assert.equal(antiochDataSchema.safeParse(data).success, true);
  assert.equal(data.events.length, 9);
  assert.ok(data.events.every((event) => event.citationIds.length));
  assert.deepEqual(data.events.map((event) => event.date.start), data.events.map((event) => event.date.start).sort());
});

test("the story is traversable from arrival to surrender without cycles", () => {
  const visited = new Set();
  let id = "event-arrival-antioch";
  while (id) {
    assert.ok(!visited.has(id), `Cycle at ${id}`);
    visited.add(id);
    const outgoing = data.relations.filter((relation) => relation.fromEventId === id);
    assert.ok(outgoing.length <= 1);
    id = outgoing[0]?.toEventId;
  }
  assert.equal(visited.size, data.events.length);
  assert.ok(visited.has("event-citadel-surrender"));
});

test("unresolved references, duplicate IDs and invalid coordinates are rejected", () => {
  for (const mutate of [
    (copy) => { copy.events[0].placeIds = ["missing"]; },
    (copy) => { copy.events[0].citationIds = ["missing"]; },
    (copy) => { copy.relations[0].toEventId = "missing"; },
    (copy) => { copy.citations[0].sourceId = "missing"; },
    (copy) => { copy.events.push(copy.events[0]); },
    (copy) => { copy.places[0].coordinates = [200, 95]; },
  ]) {
    const copy = structuredClone(data);
    mutate(copy);
    assert.equal(antiochDataSchema.safeParse(copy).success, false);
  }
});

test("battlefield anchors are explicitly schematic and cited", () => {
  for (const event of data.events.filter((item) => item.type === "battle")) {
    const place = data.places.find((item) => item.id === event.placeIds[0]);
    assert.equal(place.coordinateCertainty, "reconstructed");
    assert.match(place.locationNote, /schematic/i);
    assert.ok(event.citationIds.length > 0);
  }
});
