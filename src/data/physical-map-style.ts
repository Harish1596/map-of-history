import type { LayerSpecification, Map as LibreMap, RasterSourceSpecification } from "maplibre-gl";

export type MapMode = "standard" | "physical";

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
      id: "physical-coastline", type: "line", source: "physical-coasts",
      filter: ["all", ["==", ["get", "kind"], "Coastline"], [">=", ["zoom"], ["get", "minZoom"]]],
      layout: { visibility: "none", "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#6b8184", "line-opacity": 0.75, "line-width": ["interpolate", ["linear"], ["zoom"], 0, 0.45, 5, 0.8, 8, 1.2] },
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
    {
      id: "physical-capes", type: "circle", source: "physical-coasts",
      filter: ["all", ["==", ["geometry-type"], "Point"], ["==", ["get", "kind"], "Cape"], [">=", ["zoom"], ["get", "minZoom"]]],
      layout: { visibility: "none" },
      paint: { "circle-radius": 2, "circle-color": "#405c60", "circle-stroke-color": "#edf3f5", "circle-stroke-width": 1 },
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
      paint: { "text-color": zone === "water" ? "#285366" : "#5c5545", "text-halo-color": zone === "water" ? "#edf3f5" : "#d4dfd2", "text-halo-width": 1.5 },
    })),
  ];
}

// Toggle existing layers; never replace the style or change the map's camera.
export function setMapMode(map: Pick<LibreMap, "getLayer" | "setLayoutProperty">, mode: MapMode, landCover = false) {
  for (const id of ["country-borders", "country-labels"]) {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", mode === "standard" ? "visible" : "none");
  }
  for (const layer of physicalMapLayers()) {
    const visible = mode === "physical" && !(layer.id === "physical-relief" && landCover);
    if (map.getLayer(layer.id)) map.setLayoutProperty(layer.id, "visibility", visible ? "visible" : "none");
  }
  if (map.getLayer("physical-land-cover")) map.setLayoutProperty("physical-land-cover", "visibility", mode === "physical" && landCover ? "visible" : "none");
}
