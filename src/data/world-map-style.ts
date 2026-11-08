import type { FeatureCollection } from "geojson";
import type { StyleSpecification } from "maplibre-gl";

export function worldMapStyle(
  countries: FeatureCollection,
  labels: FeatureCollection,
): StyleSpecification {
  return {
    version: 8,
    // No glyph server: MapLibre rasterizes the locally loaded font in-browser.
    sources: {
      countries: { type: "geojson", data: countries },
      labels: { type: "geojson", data: labels },
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
    ],
  };
}
