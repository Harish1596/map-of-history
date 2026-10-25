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
  coordinates: z.tuple([z.number(), z.number()]),
  coordinateCertainty: z.enum(["attested", "approximate", "reconstructed"]),
  alternateNames: z.array(z.string()),
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
});
