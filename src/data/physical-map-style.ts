import type { LayerSpecification, Map as LibreMap, RasterSourceSpecification } from "maplibre-gl";
import { landmarkMapLayers, setLandmarkVisibility, DEFAULT_LANDMARK_OPTIONS, type LandmarkOptions } from "./landmark-map-style.ts";

export type MapMode = "standard" | "physical";
export type PhysicalSurface = "relief" | "land-cover" | "geology";

export function bathymetrySource(): RasterSourceSpecification {
  return {
    type: "raster", tiles: ["/data/world/bathymetry/{z}/{x}/{y}.png"],
    tileSize: 512, minzoom: 0, maxzoom: 4,
    attribution: "Natural Earth · SRTM Plus bathymetry",
  };
}

export function geologySource(): RasterSourceSpecification {
  return {
    type: "raster", tiles: ["/data/world/geology/{z}/{x}/{y}.png"],
    tileSize: 512, minzoom: 0, maxzoom: 6,
    attribution: "GLiM · Hartmann & Moosdorf; CCGM-CGMW (2015)",
  };
}

export function geologyLayer(): LayerSpecification {
  return {
    id: "physical-geology", type: "raster", source: "physical-geology",
    layout: { visibility: "none" },
    paint: { "raster-opacity": 1, "raster-resampling": "nearest", "raster-fade-duration": 0 },
  };
}

export function landCoverSource(): RasterSourceSpecification {
  return {
    type: "raster", tiles: ["/data/world/land-cover/{z}/{x}/{y}.png"],
    tileSize: 512, minzoom: 0, maxzoom: 5,
    attribution: "ESA CCI / Copernicus C3S · UCLouvain (2020)",
  };
}

export function landCoverLayer(): LayerSpecification {
  return {
    id: "physical-land-cover", type: "raster", source: "physical-land-cover",
    layout: { visibility: "none" },
    paint: { "raster-opacity": 1, "raster-resampling": "nearest", "raster-fade-duration": 0 },
  };
}

export function reliefSource(): RasterSourceSpecification {
  return {
    type: "raster", tiles: ["/data/world/relief/{z}/{x}/{y}.webp"],
    tileSize: 512, minzoom: 0, maxzoom: 4,
    attribution: "Natural Earth",
  };
}

export function physicalMapLayers(): LayerSpecification[] {
  return [
    {
      id: "physical-relief", type: "raster", source: "physical-relief",
      layout: { visibility: "none" },
      paint: { "raster-opacity": 0.9, "raster-fade-duration": 0, "raster-resampling": "linear" },
    },
    {
      id: "physical-bathymetry", type: "raster", source: "physical-bathymetry",
      layout: { visibility: "none" },
      paint: { "raster-opacity": 1, "raster-fade-duration": 0, "raster-resampling": "linear" },
    },
    {
      id: "physical-lakes", type: "fill", source: "physical-lakes",
      filter: [">=", ["zoom"], ["get", "minZoom"]],
      layout: { visibility: "none" }, paint: { "fill-color": "#8bb7d1" },
    },
    {
      id: "physical-rivers", type: "line", source: "physical-rivers",
      filter: [">=", ["zoom"], ["get", "minZoom"]],
      layout: { visibility: "none", "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#447e9b", "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.5, 5, 1.1, 10, 2] },
    },
    {
      id: "physical-coastline", type: "line", source: "physical-coasts",
      filter: ["all", ["==", ["get", "kind"], "Coastline"], [">=", ["zoom"], ["get", "minZoom"]]],
      layout: { visibility: "none", "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#6b8184", "line-opacity": 0.75, "line-width": ["interpolate", ["linear"], ["zoom"], 0, 0.45, 5, 0.8, 8, 1.2] },
    },
    ...landmarkMapLayers().filter((layer) => layer.type === "line"),
    {
      id: "physical-river-labels", type: "symbol", source: "physical-rivers",
      filter: ["all", [">=", ["zoom"], ["get", "labelZoom"]], ["!=", ["get", "name"], ""]],
      layout: {
        visibility: "none", "symbol-placement": "line", "symbol-spacing": 350,
        "text-field": ["get", "name"], "text-font": ["Noto Sans"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 2, 11, 8, 16],
        "text-padding": 4, "text-max-angle": 35,
      },
      paint: { "text-color": "#214458", "text-halo-color": "#9bc4dc", "text-halo-width": 1.5 },
    },
    {
      id: "physical-feature-labels", type: "symbol", source: "physical-labels",
      filter: [">=", ["zoom"], ["get", "minZoom"]],
      layout: {
        visibility: "none", "text-field": ["get", "name"], "text-font": ["Noto Sans"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 1, 12, 4, 16, 8, 22],
        "text-max-width": 8, "text-padding": 5, "symbol-sort-key": ["get", "priority"],
      },
      paint: {
        "text-color": ["case", ["==", ["get", "kind"], "Lake"], "#214458", "#5c5545"],
        "text-halo-color": ["case", ["==", ["get", "kind"], "Lake"], "#8bb7d1", "#d4dfd2"],
        "text-halo-width": 1.5,
      },
    },
    {
      id: "physical-capes", type: "circle", source: "physical-coasts",
      filter: ["all", ["==", ["geometry-type"], "Point"], ["==", ["get", "kind"], "Cape"], [">=", ["zoom"], ["get", "minZoom"]]],
      layout: { visibility: "none" },
      paint: { "circle-radius": 2, "circle-color": "#405c60", "circle-stroke-color": "#9bc4dc", "circle-stroke-width": 1 },
    },
    ...(["water", "land"] as const).map((zone): LayerSpecification => ({
      id: `physical-coastal-${zone}-labels`, type: "symbol", source: "physical-coasts",
      filter: ["all", ["==", ["geometry-type"], "Point"], ["==", ["get", "zone"], zone], [">=", ["zoom"], ["get", "minZoom"]]],
      layout: {
        visibility: "none", "text-field": ["get", "name"], "text-font": ["Noto Sans"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 2, 11, 5, 14, 8, 19],
        "text-max-width": 7, "text-padding": 4, "symbol-sort-key": ["get", "priority"],
        "text-variable-anchor": ["center", "top", "bottom", "left", "right"],
        "text-radial-offset": ["case", ["==", ["get", "kind"], "Cape"], 0.7, 0],
      },
      paint: { "text-color": zone === "water" ? "#214458" : "#5c5545", "text-halo-color": zone === "water" ? "#9bc4dc" : "#d4dfd2", "text-halo-width": 1.5 },
    })),
    ...landmarkMapLayers().filter((layer) => layer.type === "symbol"),
  ];
}

// Toggle existing layers; never replace the style or change the map's camera.
export function setMapMode(map: Pick<LibreMap, "getLayer" | "setLayoutProperty">, mode: MapMode, surface: PhysicalSurface = "relief", landmarks: LandmarkOptions = DEFAULT_LANDMARK_OPTIONS) {
  for (const id of ["country-borders", "country-labels"]) {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", mode === "standard" ? "visible" : "none");
  }
  for (const id of ["ocean-labels", "sea-labels"]) {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "visible");
  }
  for (const layer of physicalMapLayers()) {
    const visible = mode === "physical" && !(layer.id === "physical-relief" && surface !== "relief");
    if (map.getLayer(layer.id)) map.setLayoutProperty(layer.id, "visibility", visible ? "visible" : "none");
  }
  for (const name of ["land-cover", "geology"] as const) {
    if (map.getLayer(`physical-${name}`)) map.setLayoutProperty(`physical-${name}`, "visibility", mode === "physical" && surface === name ? "visible" : "none");
  }
  setLandmarkVisibility(map, mode === "physical", landmarks);
}
