"use client";

import {
  Map as MapLibre,
  Marker,
  NavigationControl,
  ScaleControl,
  setWorkerUrl,
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

type ContextPlaceCollection = {
  features: Array<{
    properties: { name: string | null };
    geometry: { type: "Point"; coordinates: [number, number] };
  }>;
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
        "background-color": "#14292d",
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

function addLocalBasemap(map: MapLibreMap) {
  map.addSource("context-land", {
    type: "geojson",
    data: "/data/antioch/basemap/land.geojson",
  });
  map.addLayer({
    id: "context-land",
    type: "fill",
    source: "context-land",
    paint: {
      "fill-color": "#364033",
      "fill-opacity": 1,
    },
  });

  map.addSource("context-graticule", {
    type: "geojson",
    data: "/data/antioch/basemap/graticule.geojson",
  });
  map.addLayer({
    id: "context-graticule",
    type: "line",
    source: "context-graticule",
    paint: {
      "line-color": "#d7c89e",
      "line-opacity": 0.1,
      "line-width": 0.7,
      "line-dasharray": [2, 4],
    },
  });

  map.addSource("context-relief", {
    type: "geojson",
    data: "/data/antioch/basemap/relief-regions.geojson",
  });
  map.addLayer({
    id: "context-relief",
    type: "fill",
    source: "context-relief",
    paint: {
      "fill-color": "#8e7449",
      "fill-opacity": 0.34,
    },
  });
  map.addLayer({
    id: "context-relief-outline",
    type: "line",
    source: "context-relief",
    paint: {
      "line-color": "#9b875d",
      "line-opacity": 0.5,
      "line-width": 1,
      "line-dasharray": [2, 3],
    },
  });

  map.addSource("context-coastline", {
    type: "geojson",
    data: "/data/antioch/basemap/coastline.geojson",
  });
  map.addLayer({
    id: "context-coastline",
    type: "line",
    source: "context-coastline",
    paint: {
      "line-color": "#d4d6bb",
      "line-opacity": 0.92,
      "line-width": ["interpolate", ["linear"], ["zoom"], 7, 1.4, 11, 2.6],
    },
  });

  map.addSource("context-lakes", {
    type: "geojson",
    data: "/data/antioch/basemap/lakes.geojson",
  });
  map.addLayer({
    id: "context-lakes",
    type: "fill",
    source: "context-lakes",
    paint: {
      "fill-color": "#172a2b",
      "fill-opacity": 0.9,
    },
  });

  map.addSource("context-waterways", {
    type: "geojson",
    data: "/data/antioch/basemap/waterways.geojson",
  });
  map.addLayer({
    id: "context-waterways",
    type: "line",
    source: "context-waterways",
    paint: {
      "line-color": "#638f94",
      "line-opacity": 0.72,
      "line-width": ["interpolate", ["linear"], ["zoom"], 7, 0.6, 11, 1.8],
    },
  });

  map.addSource("context-places", {
    type: "geojson",
    data: "/data/antioch/basemap/places.geojson",
  });
  map.addLayer({
    id: "context-places",
    type: "circle",
    source: "context-places",
    paint: {
      "circle-color": "#c8bea8",
      "circle-opacity": 0.75,
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 7, 1.5, 11, 3],
    },
  });
}

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
    const contextMarkers: Marker[] = [];
    let disposed = false;
    setWorkerUrl("/vendor/maplibre-gl-worker.mjs");
    const map = new MapLibre({
      container: containerRef.current,
      style: LOCAL_STYLE,
      center: ANTIOCH_CENTER,
      zoom: 7.8,
      pitch: 0,
      bearing: 0,
      maxBounds: [
        [34.8, 34.8],
        [38, 37.8],
      ],
      attributionControl: false,
    });

    map.addControl(
      new NavigationControl({ showCompass: true, visualizePitch: true }),
      "top-right",
    );
    map.addControl(new ScaleControl({ unit: "metric" }), "bottom-left");

    map.on("load", () => {
      addLocalBasemap(map);

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

      void fetch("/data/antioch/basemap/places.geojson")
        .then((response) => {
          if (!response.ok) throw new Error("Unable to load local place labels.");
          return response.json() as Promise<ContextPlaceCollection>;
        })
        .then((collection) => {
          if (disposed) return;

          for (const feature of collection.features) {
            if (feature.geometry.type !== "Point" || !feature.properties.name) continue;

            const label = document.createElement("span");
            label.className = "context-place-label";
            label.textContent = feature.properties.name;
            contextMarkers.push(
              new Marker({ element: label, anchor: "left", offset: [7, 0] })
                .setLngLat(feature.geometry.coordinates)
                .addTo(map),
            );
          }
        })
        .catch((labelError: unknown) => {
          console.warn("Local place labels could not be rendered.", labelError);
        });
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
      const markerLabel = document.createElement("span");
      markerLabel.className = "event-marker__label";
      markerLabel.textContent = event.title;
      markerElement.append(markerLabel);
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
      disposed = true;
      markers.forEach((marker) => marker.remove());
      contextMarkers.forEach((marker) => marker.remove());
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
        zoom: Math.max(mapRef.current.getZoom(), 8.15),
        duration: 700,
      });
    }
  }, [events, places, selectedEventId]);

  return (
    <section className="map-shell" aria-label="Historical map">
      <div ref={containerRef} className="map-canvas" />
      <div className="map-status" aria-hidden="true">
        <span className="map-status__pulse" />
        Local basemap
      </div>
      <div className="map-legend">
        <span><i className="legend-symbol legend-symbol--event" /> Event</span>
        <span><i className="legend-symbol legend-symbol--certain" /> Attested</span>
        <span><i className="legend-symbol legend-symbol--uncertain" /> Reconstructed</span>
      </div>
      <p className="map-attribution">
        Base geography: {" "}
        <a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">
          Natural Earth
        </a>
      </p>
    </section>
  );
}
