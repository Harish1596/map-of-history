import { z } from "zod";

const certaintySchema = z.enum(["high", "medium", "low", "disputed"]);

export const eventSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(["arrival", "battle", "siege", "movement", "political", "religious"]),
  date: z.object({
    start: z.string().min(4),
    end: z.string().min(4).optional(),
    display: z.string().min(1),
    certainty: certaintySchema,
  }),
  placeIds: z.array(z.string()),
  summary: z.string().min(1),
  claimIds: z.array(z.string()),
  participantIds: z.array(z.string()),
  featured: z.boolean(),
  citationIds: z.array(z.string()).min(1),
  evidenceNote: z.string().min(1),
  phase: z.enum(["First siege", "Capture", "Counter-siege", "Resolution"]),
});

export const eventRelationSchema = z.object({
  id: z.string().min(1),
  fromEventId: z.string().min(1),
  toEventId: z.string().min(1),
  type: z.enum(["precedes", "enables", "responds_to", "part_of", "contributes_to"]),
  label: z.string().min(1),
  description: z.string().min(1),
  citationIds: z.array(z.string()),
  certainty: certaintySchema,
});

export const placeSchema = z.object({
  id: z.string().min(1),
  preferredName: z.string().min(1),
  modernName: z.string().optional(),
  coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
  coordinateCertainty: z.enum(["attested", "approximate", "reconstructed"]),
  alternateNames: z.array(z.string()),
  locationNote: z.string().min(1),
});

export const sourceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  author: z.string().min(1),
  sourceType: z.enum(["primary", "scholarship", "reference", "archaeological"]),
  publication: z.string().optional(),
  url: z.url().optional(),
});

export const citationSchema = z.object({
  id: z.string().min(1),
  sourceId: z.string().min(1),
  locator: z.string().optional(),
  note: z.string().optional(),
});

export const antiochDataSchema = z.object({
  events: z.array(eventSchema),
  relations: z.array(eventRelationSchema),
  places: z.array(placeSchema),
  sources: z.array(sourceSchema),
  citations: z.array(citationSchema),
}).superRefine((data, context) => {
  const issue = (message: string) => context.addIssue({ code: "custom", message });
  for (const [name, records] of Object.entries(data)) {
    if (new Set(records.map((record) => record.id)).size !== records.length) {
      issue(`Duplicate IDs in ${name}.`);
    }
  }
  const events = new Set(data.events.map((item) => item.id));
  const places = new Set(data.places.map((item) => item.id));
  const citations = new Set(data.citations.map((item) => item.id));
  const sources = new Set(data.sources.map((item) => item.id));
  for (const event of data.events) {
    if (!event.placeIds.length || event.placeIds.some((id) => !places.has(id))) issue(`Invalid place for ${event.id}.`);
    if (event.citationIds.some((id) => !citations.has(id))) issue(`Invalid citation for ${event.id}.`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(event.date.start) || (event.date.end && event.date.end < event.date.start)) issue(`Invalid date for ${event.id}.`);
  }
  for (const relation of data.relations) {
    if (!events.has(relation.fromEventId) || !events.has(relation.toEventId) || relation.fromEventId === relation.toEventId) issue(`Invalid endpoints for ${relation.id}.`);
    if (!relation.citationIds.length || relation.citationIds.some((id) => !citations.has(id))) issue(`Invalid citation for ${relation.id}.`);
  }
  for (const citation of data.citations) {
    if (!sources.has(citation.sourceId)) issue(`Invalid source for ${citation.id}.`);
  }
});
