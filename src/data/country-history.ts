import type { FeatureCollection } from "geojson";

export const HISTORY_YEARS = [2000, 2001, 2002, 2003, 2004, 2005, 2006] as const;
export type CountrySnapshot = { countries: FeatureCollection; labels: FeatureCollection };
export type CountryHistory = CountrySnapshot & { version: 1; snapshots: Record<string, string[]> };

function validPosition(value: unknown): value is number[] {
  return Array.isArray(value) && value.length >= 2 && value.every((n) => typeof n === "number" && Number.isFinite(n))
    && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90;
}

function validPolygon(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0 && value.every((ring) =>
    Array.isArray(ring) && ring.length >= 4 && ring.every(validPosition)
    && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1],
  );
}

export function parseCountryHistory(input: unknown): CountryHistory {
  if (!input || typeof input !== "object") throw new Error("Invalid country history");
  const data = input as CountryHistory;
  if (data.version !== 1 || !data.snapshots || typeof data.snapshots !== "object") throw new Error("Invalid history version or snapshots");
  const ids: Set<string>[] = [];
  for (const [index, collection] of [data.countries, data.labels].entries()) {
    if (collection?.type !== "FeatureCollection" || !Array.isArray(collection.features) || !collection.features.length) throw new Error("Invalid historical geography");
    const unique = new Set<string>();
    for (const feature of collection.features) {
      const p = feature.properties;
      if (typeof feature.id !== "string" || unique.has(feature.id) || p?.id !== feature.id || typeof p?.name !== "string" || typeof p.countryId !== "string") throw new Error("Invalid historical country identifier");
      if (!feature.geometry || (index === 0 ? !["Polygon", "MultiPolygon"].includes(feature.geometry.type) : feature.geometry.type !== "Point")) throw new Error("Invalid historical geometry");
      if (index === 1 && (![p.priority, p.minZoom, p.sizeTier, p.labelRank].every(Number.isFinite) || !Number.isInteger(p.labelRank) || p.labelRank < 1 || p.labelRank > 7)) throw new Error("Invalid historical label policy");
      const geometry = feature.geometry;
      const valid = geometry.type === "Point" ? validPosition(geometry.coordinates)
        : geometry.type === "Polygon" ? validPolygon(geometry.coordinates)
        : geometry.type === "MultiPolygon" && geometry.coordinates.length > 0 && geometry.coordinates.every(validPolygon);
      if (!valid) throw new Error("Invalid historical coordinates");
      unique.add(feature.id);
    }
    ids.push(unique);
  }
  if (ids[0].size !== ids[1].size || [...ids[0]].some((id) => !ids[1].has(id))) throw new Error("Historical countries and labels differ");
  for (const year of HISTORY_YEARS) {
    const members = data.snapshots[year];
    if (!Array.isArray(members) || !members.length || new Set(members).size !== members.length || members.some((id) => !ids[0].has(id))) throw new Error(`Invalid snapshot for ${year}`);
  }
  return data;
}

export function countrySnapshot(history: CountryHistory, year: number): CountrySnapshot {
  if (!Number.isInteger(year) || !HISTORY_YEARS.some((value) => value === year)) throw new Error(`Unsupported historical year: ${year}`);
  const ids = new Set(history.snapshots[year]);
  return {
    countries: { type: "FeatureCollection", features: history.countries.features.filter((f) => ids.has(String(f.id))) },
    labels: { type: "FeatureCollection", features: history.labels.features.filter((f) => ids.has(String(f.id))) },
  };
}
