import type { HistoricalEvent } from "@/types/history";

type TimelineProps = {
  events: HistoricalEvent[];
  selectedEventId: string | null;
  onSelectEvent: (eventId: string) => void;
};

export function Timeline({
  events,
  selectedEventId,
  onSelectEvent,
}: TimelineProps) {
  return (
    <section className="timeline" aria-label="Siege timeline">
      <div className="timeline__heading">
        <span className="eyebrow">October 1097 — June 1098</span>
        <span>{events.length} event{events.length === 1 ? "" : "s"} loaded</span>
      </div>
      <div className="timeline__track" role="list">
        {events.map((event) => (
          <button
            className="timeline-event"
            type="button"
            role="listitem"
            aria-current={event.id === selectedEventId ? "step" : undefined}
            key={event.id}
            onClick={() => onSelectEvent(event.id)}
          >
            <span className="timeline-event__dot" />
            <span className="timeline-event__date">{event.date.display}</span>
            <strong>{event.title}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}
