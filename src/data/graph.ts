import type { EventRelation } from "@/types/history";

export function getOutgoingRelations(
  eventId: string,
  relations: EventRelation[],
) {
  return relations.filter((relation) => relation.fromEventId === eventId);
}

export function getIncomingRelations(
  eventId: string,
  relations: EventRelation[],
) {
  return relations.filter((relation) => relation.toEventId === eventId);
}
