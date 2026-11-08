"use client";

import { useEffect, useRef, useState } from "react";
import type { FeatureCollection } from "geojson";
import type { Map as LibreMap } from "maplibre-gl";
import { worldMapStyle } from "@/data/world-map-style";

type MapStatus = "loading" | "ready" | "error";
const WORLD_BOUNDS: [[number, number], [number, number]] = [[-180, -58], [180, 84]];

function Icon({ name }: { name: "plus" | "minus" | "reset" }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {name === "plus" && <path d="M12 5v14M5 12h14" />}
      {name === "minus" && <path d="M5 12h14" />}
      {name === "reset" && <><path d="M3 10a9 9 0 1 1 2.5 8M3 4v6h6" /></>}
    </svg>
  );
}

async function loadGeography(path: string, signal: AbortSignal): Promise<FeatureCollection> {
  const response = await fetch(path, { signal });
  if (!response.ok) throw new Error(`Could not load ${path}`);
  const data = await response.json();
  if (data.type !== "FeatureCollection" || !Array.isArray(data.features) || !data.features.length) {
    throw new Error(`Invalid geographic data in ${path}`);
  }
  return data as FeatureCollection;
}

export function WorldMap() {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LibreMap | null>(null);
  const [status, setStatus] = useState<MapStatus>("loading");
  const [attempt, setAttempt] = useState(0);
  const [limits, setLimits] = useState({ min: true, max: false });

  useEffect(() => {
    let disposed = false;
    let map: LibreMap | undefined;
    let observer: ResizeObserver | undefined;
    let failed = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      if (!disposed) setStatus((current) => current === "loading" ? "error" : current);
    }, 25_000);

    async function initialize() {
      try {
        const [maplibre, countries, labels] = await Promise.all([
          import("maplibre-gl"),
          loadGeography("/data/world/countries.geojson", controller.signal),
          loadGeography("/data/world/labels.geojson", controller.signal),
          document.fonts.load('500 16px "Noto Sans"').then((fonts) => {
            if (!fonts.length) throw new Error("Map font unavailable");
          }),
        ]);
        if (disposed || !container.current) return;
        maplibre.setWorkerUrl("/vendor/maplibre-gl-worker.mjs");
        map = new maplibre.Map({
          container: container.current,
          style: worldMapStyle(countries, labels),
          center: [0, 20], zoom: 1,
          maxZoom: 8, minZoom: -2,
          fadeDuration: 0,
          renderWorldCopies: false,
          // Permit the complete world to fit a portrait viewport. The default
          // Mercator constraint otherwise zooms in to fill the viewport height.
          transformConstrain: (center, zoom) => ({
            center: new maplibre.LngLat(
              Math.max(-180, Math.min(180, center.lng)),
              Math.max(-85, Math.min(85, center.lat)),
            ),
            zoom: Math.max(-2, Math.min(8, zoom)),
          }),
          dragRotate: false, pitchWithRotate: false,
          maxPitch: 0,
          attributionControl: false,
        });
        mapRef.current = map;
        map.touchZoomRotate.disableRotation();
        map.keyboard.disableRotation();
        const canvas = map.getCanvas();
        canvas.setAttribute("aria-label", "World map. Use arrow keys to pan and plus or minus to zoom.");
        canvas.setAttribute("aria-describedby", "map-instructions");
        map.on("zoomend", () => {
          if (!disposed && map) setLimits({
            min: map.getZoom() <= map.getMinZoom() + 0.01,
            max: map.getZoom() >= map.getMaxZoom() - 0.01,
          });
        });
        map.on("error", () => {
          failed = true;
          if (!disposed) setStatus("error");
        });
        canvas.addEventListener("webglcontextlost", () => {
          failed = true;
          if (!disposed) setStatus("error");
        });
        map.once("load", () => {
          if (disposed || !map) return;
          map.fitBounds(WORLD_BOUNDS, { padding: 24, duration: 0 });
          map.once("idle", () => {
            if (!disposed && !failed) {
              window.clearTimeout(timeout);
              setStatus("ready");
            }
          });
        });
        observer = new ResizeObserver(() => { map?.resize(); });
        observer.observe(container.current);
      } catch {
        if (!disposed) setStatus("error");
      }
    }
    void initialize();
    return () => {
      disposed = true;
      controller.abort();
      window.clearTimeout(timeout);
      observer?.disconnect();
      map?.remove();
      mapRef.current = null;
    };
  }, [attempt]);

  return (
    <main className="world-map" aria-label="Explore the world">
      <div className="world-map__canvas" ref={container} />
      <p id="map-instructions" className="visually-hidden">
        Drag to pan. Scroll or pinch to zoom. Focus the map and use arrow keys to
        pan, or plus and minus to zoom. Smaller country names appear as you zoom in.
      </p>
      {status === "loading" && <p className="map-feedback" role="status">Loading the world map…</p>}
      {status === "error" && (
        <div className="map-feedback map-feedback--error" role="alert">
          <h2>The map couldn’t load</h2>
          <p>Retry to reload the map. If it still won’t open, check that WebGL is enabled in your browser.</p>
          <button type="button" onClick={() => { setStatus("loading"); setAttempt((value) => value + 1); }}>Retry map</button>
        </div>
      )}
      <nav className="map-controls" aria-label="Map controls">
        <div className="map-controls__zoom">
          <button type="button" title="Zoom in" aria-label="Zoom in" disabled={status !== "ready" || limits.max} onClick={() => mapRef.current?.zoomIn()}><Icon name="plus" /></button>
          <button type="button" title="Zoom out" aria-label="Zoom out" disabled={status !== "ready" || limits.min} onClick={() => mapRef.current?.zoomOut()}><Icon name="minus" /></button>
        </div>
        <button type="button" title="Reset world view" aria-label="Reset world view" disabled={status !== "ready"} onClick={() => {
          mapRef.current?.resize();
          mapRef.current?.fitBounds(WORLD_BOUNDS, { padding: 24, duration: 650 });
        }}><Icon name="reset" /></button>
      </nav>
      <footer className="map-attribution">
        <a href="https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/" target="_blank" rel="noreferrer">Natural Earth</a>
        <details>
          <summary aria-label="About map boundaries">Map data</summary>
          <p>Country and territory boundaries follow Natural Earth’s de facto convention. Borders may be disputed. This generalized dataset is a geographic reference, not a live record of political changes.</p>
        </details>
      </footer>
      <noscript><p className="map-feedback">Enable JavaScript to explore the interactive map.</p></noscript>
    </main>
  );
}
