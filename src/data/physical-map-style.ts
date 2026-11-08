import type { LayerSpecification, Map as LibreMap, RasterSourceSpecification } from "maplibre-gl";

export type MapMode = "standard" | "physical";

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
      id: "physical-lakes", type: "fill", source: "physical-lakes",
      filter: [">=", ["zoom"], ["get", "minZoom"]],
      layout: { visibility: "none" }, paint: { "fill-color": "#b7d4df" },
    },
    {
      id: "physical-rivers", type: "line", source: "physical-rivers",
      filter: [">=", ["zoom"], ["get", "minZoom"]],
      layout: { visibility: "none", "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#709cac", "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.5, 5, 1.1, 10, 2] },
    },
    {
      id: "physical-river-labels", type: "symbol", source: "physical-rivers",
      filter: ["all", [">=", ["zoom"], ["get", "labelZoom"]], ["!=", ["get", "name"], ""]],
      layout: {
        visibility: "none", "symbol-placement": "line", "symbol-spacing": 350,
        "text-field": ["get", "name"], "text-font": ["Noto Sans"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 2, 11, 8, 16],
        "text-padding": 4, "text-max-angle": 35,
      },
      paint: { "text-color": "#285366", "text-halo-color": "#edf3f5", "text-halo-width": 1.5 },
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
        "text-color": ["case", ["==", ["get", "kind"], "Lake"], "#285366", "#5c5545"],
        "text-halo-color": ["case", ["==", ["get", "kind"], "Lake"], "#b7d4df", "#d4dfd2"],
        "text-halo-width": 1.5,
      },
    },
  ];
}

// Toggle existing layers; never replace the style or change the map's camera.
export function setMapMode(map: Pick<LibreMap, "getLayer" | "setLayoutProperty">, mode: MapMode) {
  for (const id of ["country-borders", "country-labels"]) {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", mode === "standard" ? "visible" : "none");
  }
  for (const layer of physicalMapLayers()) {
    if (map.getLayer(layer.id)) map.setLayoutProperty(layer.id, "visibility", mode === "physical" ? "visible" : "none");
  }
}
