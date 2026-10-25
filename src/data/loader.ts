import { antiochDataSchema } from "@/data/schemas";

const DATA_ROOT = "/data/antioch";

async function loadJson(path: string): Promise<unknown> {
  const response = await fetch(`${DATA_ROOT}/${path}`);
  if (!response.ok) {
    throw new Error(`Unable to load ${path}: ${response.status}`);
  }
  return response.json();
}

export async function loadAntiochData() {
  const [events, relations, places, sources, citations] = await Promise.all([
    loadJson("events.json"),
    loadJson("event-relations.json"),
    loadJson("places.json"),
    loadJson("sources.json"),
    loadJson("citations.json"),
  ]);

  const data = antiochDataSchema.parse({
    events,
    relations,
    places,
    sources,
    citations,
  });
  data.events.sort((a, b) => a.date.start.localeCompare(b.date.start));
  return data;
}
