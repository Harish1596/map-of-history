import type { HistoricalEvent } from "@/types/history";
import { useEffect, useRef } from "react";

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
  const trackRef = useRef<HTMLOListElement>(null);
  const selectedIndex = events.findIndex((event) => event.id === selectedEventId);
  useEffect(() => {
    const track = trackRef.current;
    const item = track?.querySelector<HTMLElement>('[aria-current="step"]')?.parentElement;
    if (track && item) track.scrollLeft = item.offsetLeft - 4;
  }, [selectedEventId]);
  return (
    <section className="timeline" aria-label="Siege timeline">
      <div className="timeline__heading">
        <span className="eyebrow">October 1097 — June 1098</span>
        <div className="timeline-controls">
          <button type="button" disabled={selectedIndex <= 0} onClick={() => onSelectEvent(events[selectedIndex - 1].id)}>← Previous</button>
          <span aria-live="polite">{selectedIndex + 1} / {events.length}</span>
          <button type="button" disabled={selectedIndex < 0 || selectedIndex >= events.length - 1} onClick={() => onSelectEvent(events[selectedIndex + 1].id)}>Next →</button>
        </div>
      </div>
      <ol className="timeline__track" ref={trackRef}>
        {events.map((event, index) => (
          <li key={event.id}>
          <button
            className="timeline-event"
            type="button"
            aria-current={event.id === selectedEventId ? "step" : undefined}
            onClick={() => onSelectEvent(event.id)}
          >
            <span className="timeline-event__dot" aria-hidden="true" />
            <span className="timeline-event__date">{event.date.display}</span>
            <strong>{index + 1}. {event.title}</strong>
          </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
