"use client";

import {
  Map as MapLibre,
  Marker,
  NavigationControl,
  ScaleControl,
  type Map as MapLibreMap,
  type StyleSpecification,
} from "maplibre-gl";
import { useEffect, useRef } from "react";

import type { HistoricalEvent, Place } from "@/types/history";

type HistoricalMapProps = {
  events: HistoricalEvent[];
  places: Place[];
  selectedEventId: string | null;
  onSelectEvent: (eventId: string) => void;
};

const ANTIOCH_CENTER: [number, number] = [36.1626, 36.2021];

const LOCAL_STYLE: StyleSpecification = {
  version: 8,
  name: "Antioch local canvas",
  sources: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "#1f2b29",
      },
    },
  ],
};

const LOCAL_GEOMETRY_LAYERS = [
  {
    id: "city-walls",
    type: "line" as const,
    color: "#d8bb7a",
    width: 3,
  },
  { id: "gates", type: "circle" as const, color: "#f0d89d", radius: 5 },
  { id: "camps", type: "fill" as const, color: "#a87448", opacity: 0.3 },
  {
    id: "supply-routes",
    type: "line" as const,
    color: "#76a6a4",
    width: 2,
  },
  {
    id: "crusader-movements",
    type: "line" as const,
    color: "#c57b57",
    width: 3,
  },
  {
    id: "kerbogha-movements",
    type: "line" as const,
    color: "#778e5d",
    width: 3,
  },
] as const;

export function HistoricalMap({
  events,
  places,
  selectedEventId,
  onSelectEvent,
}: HistoricalMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerElementsRef = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const markerElements = markerElementsRef.current;
    const map = new MapLibre({
      container: containerRef.current,
      style: LOCAL_STYLE,
      center: ANTIOCH_CENTER,
      zoom: 11.5,
      pitch: 32,
      bearing: -9,
      attributionControl: false,
    });

    map.addControl(
      new NavigationControl({ showCompass: true, visualizePitch: true }),
      "top-right",
    );
    map.addControl(new ScaleControl({ unit: "metric" }), "bottom-left");

    map.on("load", () => {
      for (const layer of LOCAL_GEOMETRY_LAYERS) {
        map.addSource(layer.id, {
          type: "geojson",
          data: `/data/antioch/geometry/${layer.id}.geojson`,
        });

        if (layer.type === "line") {
          map.addLayer({
            id: layer.id,
            type: "line",
            source: layer.id,
            paint: {
              "line-color": layer.color,
              "line-width": layer.width,
              "line-opacity": 0.9,
            },
          });
        } else if (layer.type === "circle") {
          map.addLayer({
            id: layer.id,
            type: "circle",
            source: layer.id,
            paint: {
              "circle-color": layer.color,
              "circle-radius": layer.radius,
              "circle-stroke-color": "#201d17",
              "circle-stroke-width": 2,
            },
          });
        } else {
          map.addLayer({
            id: layer.id,
            type: "fill",
            source: layer.id,
            paint: {
              "fill-color": layer.color,
              "fill-opacity": layer.opacity,
              "fill-outline-color": "#d0ad75",
            },
          });
        }
      }
    });

    const placeById = new Map(places.map((place) => [place.id, place]));
    const markers: Marker[] = [];

    for (const event of events) {
      const place = placeById.get(event.placeIds[0]);
      if (!place) continue;

      const markerElement = document.createElement("button");
      markerElement.type = "button";
      markerElement.className = "event-marker";
      markerElement.setAttribute("aria-label", `${event.title}, ${event.date.display}`);
      markerElement.title = event.title;
      markerElement.addEventListener("click", () => onSelectEvent(event.id));
      markerElements.set(event.id, markerElement);

      const marker = new Marker({
        element: markerElement,
        anchor: "center",
      })
        .setLngLat(place.coordinates)
        .addTo(map);

      markers.push(marker);
    }

    mapRef.current = map;

    return () => {
      markers.forEach((marker) => marker.remove());
      markerElements.clear();
      map.remove();
      mapRef.current = null;
    };
  }, [events, onSelectEvent, places]);

  useEffect(() => {
    for (const [eventId, markerElement] of markerElementsRef.current) {
      markerElement.classList.toggle("is-selected", eventId === selectedEventId);
    }

    const selectedEvent = events.find((event) => event.id === selectedEventId);
    const selectedPlace = places.find((place) =>
      selectedEvent?.placeIds.includes(place.id),
    );

    if (selectedPlace && mapRef.current) {
      mapRef.current.easeTo({
        center: selectedPlace.coordinates,
        zoom: Math.max(mapRef.current.getZoom(), 12.25),
        duration: 700,
      });
    }
  }, [events, places, selectedEventId]);

  return (
    <section className="map-shell" aria-label="Historical map">
      <div ref={containerRef} className="map-canvas" />
      <div className="map-status" aria-hidden="true">
        <span className="map-status__pulse" />
        Local geographic canvas
      </div>
      <div className="map-legend">
        <span><i className="legend-symbol legend-symbol--event" /> Event</span>
        <span><i className="legend-symbol legend-symbol--certain" /> Attested</span>
        <span><i className="legend-symbol legend-symbol--uncertain" /> Reconstructed</span>
      </div>
    </section>
  );
}
