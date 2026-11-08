import type { FeatureCollection } from "geojson";
import type { StyleSpecification } from "maplibre-gl";

export function worldMapStyle(
  countries: FeatureCollection,
  labels: FeatureCollection,
  islands: FeatureCollection = { type: "FeatureCollection", features: [] },
  oceans: FeatureCollection = { type: "FeatureCollection", features: [] },
  seas: FeatureCollection = { type: "FeatureCollection", features: [] },
): StyleSpecification {
  return {
    version: 8,
    // No glyph server: MapLibre rasterizes the locally loaded font in-browser.
    sources: {
      countries: { type: "geojson", data: countries },
      labels: { type: "geojson", data: labels },
      islands: { type: "geojson", data: islands },
      oceans: { type: "geojson", data: oceans },
      seas: { type: "geojson", data: seas },
    },
    layers: [
      { id: "ocean", type: "background", paint: { "background-color": "#edf3f5" } },
      { id: "countries", type: "fill", source: "countries", paint: { "fill-color": "#d4dfd2" } },
      {
        id: "country-borders", type: "line", source: "countries",
        paint: {
          "line-color": "#6b8184",
          "line-width": ["interpolate", ["linear"], ["zoom"], 0, 0.65, 4, 1, 8, 1.4],
        },
      },
      {
        id: "sea-labels", type: "symbol", source: "seas",
        filter: [">=", ["zoom"], ["get", "minZoom"]],
        layout: {
          "text-field": ["get", "name"], "text-font": ["Noto Sans"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 1, 11, 4, 14, 7, 19, 10, 24],
          "text-max-width": 7, "text-line-height": 1.2, "text-padding": 3,
          "text-anchor": "center", "symbol-sort-key": ["get", "priority"],
          "text-variable-anchor": ["center", "left", "right", "top", "bottom"],
          "text-radial-offset": 0.5,
          "text-allow-overlap": false, "text-ignore-placement": false,
        },
        paint: { "text-color": "#476b7a", "text-halo-color": "#edf3f5", "text-halo-width": 1.5 },
      },
      {
        id: "island-labels", type: "symbol", source: "islands", minzoom: 3,
        filter: ["all", [">=", ["zoom"], ["get", "minZoom"]], ["<", ["zoom"], ["get", "maxZoom"]]],
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 3, 11, 5, 14, 8, 18],
          "text-max-width": 7,
          "text-padding": 2,
          "text-anchor": "center",
          "symbol-sort-key": ["get", "priority"],
          "text-allow-overlap": false,
          "text-ignore-placement": false,
        },
        paint: {
          "text-color": "#405c60",
          "text-halo-color": "#d4dfd2",
          "text-halo-width": 1,
        },
      },
      {
        id: "country-labels", type: "symbol", source: "labels",
        filter: [">=", ["zoom"], ["get", "minZoom"]],
        layout: {
          "text-field": ["get", "label"],
          "text-font": ["Noto Sans"],
          "text-size": [
            "interpolate", ["linear"], ["zoom"],
            0, ["step", ["get", "sizeTier"], 14, 1, 12, 2, 11, 3, 10],
            3, ["step", ["get", "sizeTier"], 19, 1, 15, 2, 13, 3, 12],
            5, ["step", ["get", "sizeTier"], 24, 1, 20, 2, 17, 3, 16],
            8, ["step", ["get", "sizeTier"], 34, 1, 28, 2, 24, 3, 22],
          ],
          "text-max-width": 6,
          "text-line-height": 1.15,
          "text-padding": 2,
          "text-anchor": "center",
          "text-justify": "center",
          "symbol-sort-key": ["get", "priority"],
          "text-allow-overlap": false,
          "text-ignore-placement": false,
        },
        paint: {
          "text-color": "#283b42",
          "text-halo-color": "#d4dfd2",
          "text-halo-width": 1.1,
          "text-halo-blur": 0.4,
        },
      },
      {
        id: "ocean-labels", type: "symbol", source: "oceans",
        // Symbols place in reverse layer order. Oceans reserve space first;
        // their names stay visible while other labels avoid their boxes.
        layout: {
          "text-field": ["get", "name"], "text-font": ["Noto Sans"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 0, 12, 2, 15, 5, 22, 8, 28],
          "text-max-width": 7, "text-line-height": 1.2,
          "text-letter-spacing": 0.08, "text-padding": 4,
          "text-anchor": "center", "text-allow-overlap": true,
          "text-ignore-placement": false,
        },
        paint: { "text-color": "#476b7a", "text-halo-color": "#edf3f5", "text-halo-width": 1.5 },
      },
    ],
  };
}
