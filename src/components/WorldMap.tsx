"use client";

import { useEffect, useRef, useState } from "react";
import type { FeatureCollection } from "geojson";
import type { Map as LibreMap } from "maplibre-gl";
import { worldMapStyle } from "@/data/world-map-style";
import { applyCountryLabelList } from "@/data/world-label-policy";
import { physicalMapLayers, reliefSource, landCoverLayer, landCoverSource, setMapMode, type MapMode } from "@/data/physical-map-style";
import landCoverLegend from "../../public/data/world/land-cover/legend.json";
import { constrainWorldCamera, maximumWorldZoom, minimumWorldZoom } from "@/data/world-map-camera";

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

function resetPhysicalSources(map: LibreMap | null) {
  if (!map) return;
  if (map.getLayer("physical-land-cover")) map.removeLayer("physical-land-cover");
  for (const layer of physicalMapLayers().reverse()) if (map.getLayer(layer.id)) map.removeLayer(layer.id);
  for (const name of ["relief", "rivers", "lakes", "labels", "coasts", "land-cover"]) if (map.getSource(`physical-${name}`)) map.removeSource(`physical-${name}`);
}

export function WorldMap() {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LibreMap | null>(null);
  const [status, setStatus] = useState<MapStatus>("loading");
  const [attempt, setAttempt] = useState(0);
  const [limits, setLimits] = useState({ min: true, max: false });
  const [mode, setMode] = useState<MapMode>("standard");
  const [landCover, setLandCover] = useState(false);
  const [landCoverLoading, setLandCoverLoading] = useState(false);
  const [physicalStatus, setPhysicalStatus] = useState<MapStatus>("loading");
  const [physicalAttempt, setPhysicalAttempt] = useState(0);
  const physicalRequest = useRef<{ controller: AbortController; data: Promise<FeatureCollection[]> } | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (status !== "ready" || !map) return;
    if (mode === "standard") {
      setMapMode(map, "standard");
      return;
    }
    let cancelled = false;
    async function showPhysical() {
      try {
        if (!physicalRequest.current) {
          const controller = new AbortController();
          const timeout = window.setTimeout(() => controller.abort(), 25_000);
          const data = Promise.all(["rivers", "lakes", "labels", "coasts"].map((name) =>
            loadGeography(`/data/world/physical/${name}.geojson`, controller.signal),
          )).finally(() => window.clearTimeout(timeout));
          physicalRequest.current = { controller, data };
          // Failed requests can be retried; successful data stays cached for toggles.
          void data.catch(() => {
            if (physicalRequest.current?.data === data) physicalRequest.current = null;
          });
        }
        const data = await physicalRequest.current.data;
        if (cancelled || !map) return;
        if (!map.getSource("physical-relief")) map.addSource("physical-relief", reliefSource());
        for (const [index, name] of ["rivers", "lakes", "labels", "coasts"].entries()) {
          const id = `physical-${name}`;
          if (!map.getSource(id)) map.addSource(id, { type: "geojson", data: data[index] });
        }
        for (const layer of physicalMapLayers()) {
          if (!map.getLayer(layer.id)) map.addLayer(layer, "island-labels");
        }
        if (landCover && !map.getSource("physical-land-cover")) map.addSource("physical-land-cover", landCoverSource());
        if (landCover && !map.getLayer("physical-land-cover")) map.addLayer(landCoverLayer(), "physical-lakes");
        setMapMode(map, "physical", landCover);
        setPhysicalStatus("ready");
        if (landCover) map.once("idle", () => { if (!cancelled) setLandCoverLoading(false); });
      } catch {
        if (!cancelled && map) {
          setMapMode(map, "standard");
          setPhysicalStatus("error");
        }
      }
    }
    void showPhysical();
    return () => { cancelled = true; };
  }, [mode, status, physicalAttempt, landCover]);

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
        const [maplibre, countries, labels, labelList, islands] = await Promise.all([
          import("maplibre-gl"),
          loadGeography("/data/world/countries.geojson", controller.signal),
          loadGeography("/data/world/labels.geojson", controller.signal),
          fetch("/data/world/country-labels.json", { signal: controller.signal }).then((response) => {
            if (!response.ok) throw new Error("Could not load country label list");
            return response.json();
          }),
          loadGeography("/data/world/island-labels.geojson", controller.signal),
          document.fonts.load('500 16px "Noto Sans"').then((fonts) => {
            if (!fonts.length) throw new Error("Map font unavailable");
          }),
        ]);
        if (disposed || !container.current) return;
        let viewportHeight = container.current.clientHeight;
        let minZoom = minimumWorldZoom(container.current.clientWidth, viewportHeight);
        maplibre.setWorkerUrl("/vendor/maplibre-gl-worker.mjs");
        map = new maplibre.Map({
          container: container.current,
          style: worldMapStyle(countries, applyCountryLabelList(labels, labelList), islands),
          center: [0, 20], zoom: 1,
          maxZoom: maximumWorldZoom(), minZoom,
          fadeDuration: 0,
          renderWorldCopies: true,
          // Bound the full viewport at the poles while leaving longitude free
          // to wrap continuously across the date line.
          transformConstrain: (center, zoom) => {
            const camera = constrainWorldCamera(center, zoom, minZoom, viewportHeight);
            return { center: new maplibre.LngLat(camera.lng, camera.lat), zoom: camera.zoom };
          },
          dragRotate: false, pitchWithRotate: false,
          maxPitch: 0,
          attributionControl: false,
        });
        mapRef.current = map;
        map.on("resize", () => {
          if (!map || !container.current) return;
          viewportHeight = container.current.clientHeight;
          minZoom = minimumWorldZoom(container.current.clientWidth, viewportHeight);
          map.setMinZoom(minZoom);
          setLimits({
            min: map.getZoom() <= minZoom + 0.01,
            max: map.getZoom() >= maximumWorldZoom() - 0.01,
          });
        });
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
        map.on("error", (event) => {
          if ("sourceId" in event && typeof event.sourceId === "string" && event.sourceId.startsWith("physical-")) {
            if (event.sourceId === "physical-land-cover" && (!map?.getLayer("physical-land-cover") || map.getLayoutProperty("physical-land-cover", "visibility") !== "visible")) return;
            if (!disposed) {
              if (map) setMapMode(map, "standard");
              setPhysicalStatus("error");
            }
            return;
          }
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
      physicalRequest.current?.controller.abort();
      physicalRequest.current = null;
      window.clearTimeout(timeout);
      observer?.disconnect();
      map?.remove();
      mapRef.current = null;
    };
  }, [attempt]);

  return (
    <main className="world-map" aria-label="Explore the world">
      <div className="world-map__canvas" ref={container} />
      <div className="map-modes" role="group" aria-label="Map mode">
        <button type="button" aria-pressed={mode === "standard"} disabled={status !== "ready"} onClick={() => setMode("standard")}>Standard</button>
        <button type="button" aria-pressed={mode === "physical"} disabled={status !== "ready"} onClick={() => {
          if (mode !== "physical") {
            if (physicalStatus === "error") resetPhysicalSources(mapRef.current);
            setPhysicalStatus("loading");
          }
          setMode("physical");
        }}>Physical Geography</button>
      </div>
      {mode === "physical" && status === "ready" && physicalStatus === "ready" && (
        <label className="land-cover-toggle">
          <input type="checkbox" checked={landCover} onChange={(event) => {
            setLandCoverLoading(event.target.checked);
            setLandCover(event.target.checked);
          }} />
          Land cover · 2020
        </label>
      )}
      {mode === "physical" && landCover && landCoverLoading && physicalStatus === "ready" && status === "ready" && (
        <p className="map-feedback map-feedback--land-cover" role="status">Loading land cover…</p>
      )}
      {mode === "physical" && landCover && !landCoverLoading && physicalStatus === "ready" && status === "ready" && (
        <details className="land-cover-legend">
          <summary>Land-cover legend · 2020</summary>
          <div>
            <ul aria-label="Land-cover categories">
              {landCoverLegend.classes.map((group) => <li key={group.id}><span style={{ backgroundColor: group.color }} aria-hidden="true" />{group.name}</li>)}
            </ul>
            <p>{landCoverLegend.notice}</p>
            <a href={landCoverLegend.sourceUrl} target="_blank" rel="noreferrer">ESA CCI / Copernicus C3S · UCLouvain</a>
          </div>
        </details>
      )}
      <p id="map-instructions" className="visually-hidden">
        Drag to pan. Scroll or pinch to zoom. Focus the map and use arrow keys to
        pan, or plus and minus to zoom. Use Reset world view to return to the overview.
        Switch map modes to explore countries or natural features without changing your view.
        In Physical Geography, enable Land cover to compare modern vegetation and surface types using the legend.
      </p>
      {status === "ready" && mode === "physical" && physicalStatus === "loading" && (
        <p className="map-feedback map-feedback--physical" role="status">Loading physical geography…</p>
      )}
      {status === "ready" && mode === "physical" && physicalStatus === "error" && (
        <div className="map-feedback map-feedback--physical" role="alert">
          <p>Physical geography couldn’t load. You can retry or switch to Standard.</p>
          <button type="button" onClick={() => {
            // Recreate sources so failed terrain tiles are requested again.
            resetPhysicalSources(mapRef.current);
            setPhysicalStatus("loading");
            setPhysicalAttempt((value) => value + 1);
          }}>Retry physical geography</button>
        </div>
      )}
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
        {mode === "physical" && landCover && <a href={landCoverLegend.sourceUrl} target="_blank" rel="noreferrer">ESA / C3S 2020</a>}
        <details>
          <summary aria-label="About map data">Map data</summary>
          <p>Country and territory boundaries follow Natural Earth’s de facto convention. Borders may be disputed. Physical Geography combines <a href="https://www.naturalearthdata.com/downloads/10m-raster-data/10m-cross-blend-hypso/" target="_blank" rel="noreferrer">Natural Earth shaded relief</a> with rivers, lakes and natural-feature names. Coastal names and cape locations come from <a href="https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-physical-labels/" target="_blank" rel="noreferrer">Natural Earth physical labels</a>; shorelines are generalized at 1:50m. {landCover ? <>Land-cover colours show grouped <a href={landCoverLegend.sourceUrl} target="_blank" rel="noreferrer">2020 ESA CCI / Copernicus C3S cover</a>, led by UCLouvain. This global overview omits small patches and is not historical vegetation. Water overlays are geographic references, not 2020 cover observations.</> : <>Relief colours blend elevation and regional characteristics; they are not a precise elevation scale. Water levels are not live.</>} Close zoom enlarges the imagery without adding detail.</p>
        </details>
      </footer>
      <noscript><p className="map-feedback">Enable JavaScript to explore the interactive map.</p></noscript>
    </main>
  );
}
