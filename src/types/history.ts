export type Certainty = "high" | "medium" | "low" | "disputed";

export type EventDate = {
  start: string;
  end?: string;
  display: string;
  certainty: Certainty;
};

export type HistoricalEvent = {
  id: string;
  title: string;
  type: "arrival" | "battle" | "siege" | "movement" | "political" | "religious";
  date: EventDate;
  placeIds: string[];
  summary: string;
  claimIds: string[];
  participantIds: string[];
  featured: boolean;
  citationIds: string[];
  evidenceNote: string;
  phase: "First siege" | "Capture" | "Counter-siege" | "Resolution";
};

export type EventRelation = {
  id: string;
  fromEventId: string;
  toEventId: string;
  type: "precedes" | "enables" | "responds_to" | "part_of" | "contributes_to";
  label: string;
  description: string;
  citationIds: string[];
  certainty: Certainty;
};

export type Place = {
  id: string;
  preferredName: string;
  modernName?: string;
  coordinates: [number, number];
  coordinateCertainty: "attested" | "approximate" | "reconstructed";
  alternateNames: string[];
  locationNote: string;
};

export type Source = {
  id: string;
  title: string;
  author: string;
  sourceType: "primary" | "scholarship" | "reference" | "archaeological";
  publication?: string;
  url?: string;
};

export type Citation = {
  id: string;
  sourceId: string;
  locator?: string;
  note?: string;
};
