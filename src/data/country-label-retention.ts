import type { Map as LibreMap, ExpressionSpecification } from "maplibre-gl";

// Keep introduction priority for the lifetime of this map. Clearing it when
// zoom reverses lets newly fitting neighbours displace previously visible names.
export function retainCountryLabels(map: Pick<LibreMap, "getLayer" | "queryRenderedFeatures" | "setLayoutProperty" | "on" | "off">) {
  const retained = new Map<string, number>();

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

  map.on("idle", rememberVisible);
  return () => {
    map.off("idle", rememberVisible);
  };
}
