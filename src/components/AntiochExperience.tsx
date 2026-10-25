"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { EventPanel } from "@/components/EventPanel";
import { HistoricalMap } from "@/components/HistoricalMap";
import { Timeline } from "@/components/Timeline";
import { loadAntiochData } from "@/data/loader";
import { getOutgoingRelations } from "@/data/graph";

type AntiochData = Awaited<ReturnType<typeof loadAntiochData>>;

export function AntiochExperience() {
  const [data, setData] = useState<AntiochData | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    loadAntiochData()
      .then((loadedData) => {
        if (!active) return;

        const requestedEventId = new URLSearchParams(window.location.search).get(
          "event",
        );
        const requestedEventExists = loadedData.events.some(
          (event) => event.id === requestedEventId,
        );

        setData(loadedData);
        setSelectedEventId(
          requestedEventExists ? requestedEventId : (loadedData.events[0]?.id ?? null),
        );
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "The local history files could not be loaded.",
        );
      });

    return () => {
      active = false;
    };
  }, []);

  const selectEvent = useCallback((eventId: string) => {
    setSelectedEventId(eventId);

    const url = new URL(window.location.href);
    url.searchParams.set("event", eventId);
    if (url.href !== window.location.href) window.history.pushState(null, "", url);
  }, []);

  useEffect(() => {
    if (!data) return;
    const restoreSelection = () => {
      const requested = new URLSearchParams(window.location.search).get("event");
      setSelectedEventId(data.events.find((event) => event.id === requested)?.id ?? data.events[0]?.id ?? null);
    };
    window.addEventListener("popstate", restoreSelection);
    return () => window.removeEventListener("popstate", restoreSelection);
  }, [data]);

  const selectedEvent = useMemo(
    () => data?.events.find((event) => event.id === selectedEventId) ?? null,
    [data, selectedEventId],
  );

  const selectedPlace = useMemo(() => {
    const placeId = selectedEvent?.placeIds[0];
    return data?.places.find((place) => place.id === placeId) ?? null;
  }, [data, selectedEvent]);

  return (
    <main className="experience">
      <header className="masthead">
        <div>
          <span className="eyebrow">First Crusade · Proof of concept</span>
          <h1>The Siege of Antioch</h1>
        </div>
        <span>1097–1098</span>
      </header>
      {error ? (
        <section className="load-state load-state--error" role="alert">
          <p className="eyebrow">Unable to load the local records</p>
          <p>{error}</p>
        </section>
      ) : data ? (
        <>
          <HistoricalMap
            events={data.events}
            places={data.places}
            selectedEventId={selectedEventId}
            onSelectEvent={selectEvent}
          />
          <EventPanel event={selectedEvent} place={selectedPlace}
            citations={data.citations} sources={data.sources}
            relations={selectedEvent ? getOutgoingRelations(selectedEvent.id, data.relations) : []}
            onSelect={selectEvent} />
          <Timeline
            events={data.events}
            selectedEventId={selectedEventId}
            onSelectEvent={selectEvent}
          />
        </>
      ) : (
        <section className="load-state" aria-live="polite">
          <p className="eyebrow">Loading local history files…</p>
        </section>
      )}
    </main>
  );
}
