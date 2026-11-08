import type { Map as LibreMap, ExpressionSpecification } from "maplibre-gl";

// Keep labels already introduced during zoom-in ahead of newly fitting names.
// Zoom-out restores geographic-area priority for the wider view.
export function retainCountryLabels(map: Pick<LibreMap, "getZoom" | "getLayer" | "queryRenderedFeatures" | "setLayoutProperty" | "on" | "off">) {
  const retained = new Map<string, number>();
  let previousZoom = map.getZoom();

  function zoomChanged() {
    const zoom = map.getZoom();
    if (zoom < previousZoom - 0.000001 && retained.size) {
      retained.clear();
      if (map.getLayer("country-labels")) map.setLayoutProperty("country-labels", "symbol-sort-key", ["get", "priority"]);
    }
    previousZoom = zoom;
  }

  function rememberVisible() {
    if (!map.getLayer("country-labels")) return;
    const visible = map.queryRenderedFeatures({ layers: ["country-labels"] })
      .map((feature) => feature.properties)
      .filter((p) => typeof p?.id === "string" && Number.isFinite(p.priority))
      .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
    const before = retained.size;
    for (const properties of visible) {
      if (!retained.has(properties.id)) retained.set(properties.id, retained.size);
    }
    if (retained.size === before) return;
    const [[firstId, firstOrder], ...rest] = [...retained];
    const expression: ExpressionSpecification = [
      "match", ["get", "id"], firstId, firstOrder,
      ...rest.flatMap(([id, order]) => [id, order]),
      ["+", retained.size, ["get", "priority"]],
    ];
    map.setLayoutProperty("country-labels", "symbol-sort-key", expression);
  }

  map.on("zoom", zoomChanged);
  map.on("idle", rememberVisible);
  return () => {
    map.off("zoom", zoomChanged);
    map.off("idle", rememberVisible);
  };
}
