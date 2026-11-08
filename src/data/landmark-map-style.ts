import type { LayerSpecification, Map as LibreMap } from "maplibre-gl";

export const LANDMARK_GROUPS = [
  ["peaks", "Mountain peaks"], ["volcanoes", "Volcanoes"],
  ["canyons", "Canyons"], ["forests", "Named forests"],
  ["undersea", "Underwater features"], ["tectonics", "Tectonic features"],
] as const;
export type LandmarkGroup = typeof LANDMARK_GROUPS[number][0];
export type LandmarkOptions = Record<LandmarkGroup, boolean>;
export const DEFAULT_LANDMARK_OPTIONS: LandmarkOptions = { peaks: true, volcanoes: true, canyons: true, forests: true, undersea: true, tectonics: true };
export const PHYSICAL_DATA_FILES = ["rivers", "lakes", "labels", "coasts", "summits", "named-regions", "undersea-labels", "tectonic-boundaries", "tectonic-plates"] as const;

const points = [
  { group: "forests", kind: "Forest", source: "named-regions", color: "#315d3b", halo: "#e2ebda" },
  { group: "canyons", kind: "Canyon", source: "named-regions", color: "#774927", halo: "#f0e5d2" },
  { group: "peaks", kind: "Peak", source: "summits", color: "#34424b", halo: "#eef1ea" },
  { group: "volcanoes", kind: "Volcano", source: "summits", color: "#963e2c", halo: "#fff0df" },
  { group: "undersea", kind: null, source: "undersea-labels", color: "#eef8ff", halo: "#234c66" },
] as const;

export const BOUNDARY_COLORS = { Convergent: "#9a3e30", Divergent: "#275d80", Transform: "#775a20" };

export function landmarkMapLayers(): LayerSpecification[] {
  return [
    { id: "landmark-tectonics-casing", type: "line", source: "physical-tectonic-boundaries", layout: { visibility: "none" }, paint: { "line-color": "#fff5df", "line-width": ["interpolate", ["linear"], ["zoom"], 0, 2.6, 6, 4], "line-opacity": 0.85 } },
    ...Object.entries(BOUNDARY_COLORS).map(([kind, color]): LayerSpecification => ({
      id: `landmark-tectonics-${kind.toLowerCase()}`, type: "line", source: "physical-tectonic-boundaries",
      filter: ["==", ["get", "boundaryType"], kind], layout: { visibility: "none" },
      paint: { "line-color": color, "line-width": ["interpolate", ["linear"], ["zoom"], 0, 1.2, 6, 2.2], ...(kind === "Transform" ? { "line-dasharray": [3, 2] } : {}) },
    })),
    { id: "landmark-tectonics-labels", type: "symbol", source: "physical-tectonic-plates",
      filter: [">=", ["zoom"], ["get", "minZoom"]],
      layout: { visibility: "none", "text-field": ["get", "name"], "text-font": ["Noto Sans"], "text-size": ["interpolate", ["linear"], ["zoom"], 2, 12, 6, 18], "text-max-width": 8, "text-letter-spacing": 0.07, "text-padding": 8, "text-allow-overlap": false },
      paint: { "text-color": "#654c35", "text-halo-color": "#fff5df", "text-halo-width": 1.5 },
    },
    ...points.map(({ group, kind, source, color, halo }): LayerSpecification => ({
      id: `landmark-${group}`, type: "symbol", source: `physical-${source}`,
      filter: kind ? ["all", [">=", ["zoom"], ["get", "minZoom"]], ["==", ["get", "kind"], kind]] : [">=", ["zoom"], ["get", "minZoom"]],
      layout: {
        visibility: "none", "icon-image": `landmark-${group}`, "icon-size": group === "undersea" ? 0.7 : 1,
        "icon-anchor": "center", "icon-padding": 3, "icon-allow-overlap": false,
        "text-field": ["get", "name"], "text-font": ["Noto Sans"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 2, 11, 5, 13, 9, 18],
        "text-anchor": "top", "text-offset": [0, 0.85], "text-max-width": 8, "text-padding": 3,
        "text-optional": true, "symbol-sort-key": ["get", "priority"], "text-allow-overlap": false,
      },
      paint: { "text-color": color, "text-halo-color": halo, "text-halo-width": 1.5 },
    })),
  ];
}

export function landmarkGroupForLayer(id: string): LandmarkGroup | undefined {
  return LANDMARK_GROUPS.find(([group]) => id === `landmark-${group}` || id.startsWith(`landmark-${group}-`))?.[0];
}

export function setLandmarkVisibility(map: Pick<LibreMap, "getLayer" | "setLayoutProperty">, physical: boolean, options: LandmarkOptions) {
  for (const layer of landmarkMapLayers()) {
    const group = landmarkGroupForLayer(layer.id)!;
    if (map.getLayer(layer.id)) map.setLayoutProperty(layer.id, "visibility", physical && options[group] ? "visible" : "none");
  }
}

export function addLandmarkIcons(map: Pick<LibreMap, "hasImage" | "addImage">) {
  for (const { group, color, halo } of points) {
    const id = `landmark-${group}`;
    if (map.hasImage(id)) continue;
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 48;
    const c = canvas.getContext("2d");
    if (!c) throw new Error("Could not prepare landmark symbols");
    c.scale(2, 2); c.strokeStyle = halo; c.fillStyle = color; c.lineWidth = 2; c.lineJoin = "round";
    c.beginPath();
    if (group === "forests") {
      c.moveTo(12, 2); c.lineTo(4, 15); c.lineTo(9, 15); c.lineTo(9, 21); c.lineTo(15, 21); c.lineTo(15, 15); c.lineTo(20, 15); c.closePath();
    } else if (group === "canyons") {
      c.moveTo(3, 5); c.lineTo(8, 9); c.lineTo(9, 18); c.lineTo(13, 21); c.lineTo(16, 15); c.lineTo(17, 7); c.lineTo(21, 3);
      c.strokeStyle = halo; c.lineWidth = 5; c.stroke(); c.strokeStyle = color; c.lineWidth = 2;
    } else if (group === "volcanoes") {
      c.moveTo(2, 21); c.lineTo(8, 6); c.lineTo(12, 9); c.lineTo(16, 6); c.lineTo(22, 21); c.closePath();
    } else if (group === "peaks") {
      c.moveTo(12, 3); c.lineTo(22, 21); c.lineTo(2, 21); c.closePath();
    } else { c.moveTo(12, 5); c.lineTo(19, 12); c.lineTo(12, 19); c.lineTo(5, 12); c.closePath(); }
    if (group !== "canyons") c.fill(); c.stroke();
    map.addImage(id, c.getImageData(0, 0, 48, 48), { pixelRatio: 2 });
  }
}
