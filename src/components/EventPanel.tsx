import type { HistoricalEvent, Place } from "@/types/history";

type EventPanelProps = {
  event: HistoricalEvent | null;
  place: Place | null;
};

export function EventPanel({ event, place }: EventPanelProps) {
  if (!event) {
    return (
      <aside className="panel" aria-label="Selected event details">
        <p>No event is selected.</p>
      </aside>
    );
  }

  return (
    <aside className="panel" aria-label="Selected event details">
      <p className="eyebrow">Selected event</p>
      <h2>{event.title}</h2>
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

      <section className="source-preview" aria-labelledby="sources-heading">
        <p className="eyebrow" id="sources-heading">Sources</p>
        <p>
          Citations will appear here when researched claims are linked to this
          event.
        </p>
      </section>
    </aside>
  );
}
