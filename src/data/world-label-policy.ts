import type { FeatureCollection } from "geojson";

export function applyCountryLabelList(labels: FeatureCollection, input: unknown): FeatureCollection {
  if (!input || typeof input !== "object" || !("countries" in input) || !Array.isArray(input.countries)) {
    throw new Error("Invalid country label list");
  }
  const policies = new Map<string, Record<string, number>>();
  for (const record of input.countries) {
    if (!record || typeof record.id !== "string" || policies.has(record.id)) {
      throw new Error("Missing or duplicate country label identifier");
    }
    const fields = ["areaKm2", "labelRank", "minZoom", "priority", "sizeTier"] as const;
    if (fields.some((key) => typeof record[key] !== "number" || !Number.isFinite(record[key]))
      || record.areaKm2 <= 0 || record.minZoom < 0 || record.minZoom > 21
      || record.priority < 0 || record.sizeTier < 0 || record.sizeTier > 6) {
      throw new Error(`Invalid country label policy: ${record.id}`);
    }
    if (!Number.isInteger(record.labelRank) || record.labelRank < 1 || record.labelRank > 7) {
      throw new Error(`Invalid country label rank: ${record.id}`);
    }
    policies.set(record.id, Object.fromEntries(fields.map((key) => [key, record[key]])));
  }
  return {
    ...labels,
    features: labels.features.map((feature) => {
      const id = feature.properties?.id;
      const policy = policies.get(id);
      if (!policy) throw new Error(`Missing country label policy: ${id}`);
      return { ...feature, properties: { ...feature.properties, ...policy } };
    }),
  };
}
