import type { Citation, EventRelation, HistoricalEvent, Place, Source } from "@/types/history";
import { SourceList } from "@/components/SourceList";
import { StoryNavigator } from "@/components/StoryNavigator";
import { useEffect, useRef } from "react";

type EventPanelProps = {
  event: HistoricalEvent | null;
  place: Place | null;
  citations: Citation[];
  sources: Source[];
  relations: EventRelation[];
  onSelect: (eventId: string) => void;
};

export function EventPanel({ event, place, citations, sources, relations, onSelect }: EventPanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (panelRef.current) panelRef.current.scrollTop = 0;
  }, [event?.id]);
  if (!event) {
    return (
      <aside className="panel" aria-label="Selected event details">
        <p>No event is selected.</p>
      </aside>
    );
  }

  return (
    <aside className="panel" aria-label="Selected event details" ref={panelRef}>
      <p className="eyebrow">{event.phase} · {event.type}</p>
      <h2 aria-live="polite">{event.title}</h2>
      <p className="event-date">{event.date.display}</p>
      <p>{event.summary}</p>

      <dl className="event-facts">
        <div>
          <dt>Event type</dt>
          <dd>{event.type}</dd>
        </div>
        <div>
          <dt>Place</dt>
          <dd>
            {place?.preferredName ?? "Unknown"}
            {place?.modernName ? ` · ${place.modernName}` : ""}
          </dd>
        </div>
        <div>
          <dt>Date confidence</dt>
          <dd>{event.date.certainty}</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>{place?.coordinateCertainty ?? "unknown"}</dd>
        </div>
      </dl>

      <div className="evidence-note">
        <p className="eyebrow">Reading the evidence</p>
        <p>{event.evidenceNote}</p>
        <p>{place?.locationNote}</p>
      </div>

      <StoryNavigator relations={relations} citations={citations} sources={sources} onSelect={onSelect} />

      <section className="source-preview" aria-labelledby="sources-heading">
        <p className="eyebrow" id="sources-heading">Sources</p>
        <SourceList citations={citations.filter((citation) => event.citationIds.includes(citation.id))} sources={sources} />
        <p className="source-context">This first selection uses Latin crusader narratives. Their perspective is partial; reported visions are not treated as verified miracles.</p>
      </section>
    </aside>
  );
}
