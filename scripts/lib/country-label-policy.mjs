import area from "@turf/area";

// Areas are geodesic measurements of the bundled generalized polygons, not
// official national statistics. Area bands affect typography, not visibility.
export const LABEL_SIZE_BANDS = [
  { minAreaKm2: 1_000_000, sizeTier: 0 },
  { minAreaKm2: 250_000, sizeTier: 1 },
  { minAreaKm2: 50_000, sizeTier: 2 },
  { minAreaKm2: 10_000, sizeTier: 3 },
  { minAreaKm2: 2_000, sizeTier: 4 },
  { minAreaKm2: 200, sizeTier: 5 },
  { minAreaKm2: 0, sizeTier: 6 },
];

// App-specific thresholds for Natural Earth's LABELRANK (lower is earlier).
// Every member of a rank becomes eligible together, before lower-priority ranks.
export const LABEL_RANK_BANDS = [
  { maxRank: 2, minZoom: 0 },
  { maxRank: 3, minZoom: 3 },
  { maxRank: 4, minZoom: 4 },
  { maxRank: 5, minZoom: 5 },
  { maxRank: 6, minZoom: 6 },
  { maxRank: 7, minZoom: 7 },
];

export function createCountryLabelList(features) {
  return features.map((feature) => {
    const areaKm2 = area(feature) / 1_000_000;
    const band = LABEL_SIZE_BANDS.find((band) => areaKm2 >= band.minAreaKm2);
    const labelRank = feature.properties.rank;
    if (!Number.isInteger(labelRank) || labelRank < 1 || labelRank > 7) {
      throw new Error(`Invalid Natural Earth label rank: ${feature.id}`);
    }
    return {
      id: feature.id,
      name: feature.properties.name,
      label: feature.properties.label,
      areaKm2,
      labelRank,
      minZoom: LABEL_RANK_BANDS.find((band) => labelRank <= band.maxRank).minZoom,
      sizeTier: band.sizeTier,
    };
  }).sort((a, b) => a.labelRank - b.labelRank || b.areaKm2 - a.areaKm2 || a.id.localeCompare(b.id))
    .map((country, priority) => ({ ...country, areaKm2: Number(country.areaKm2.toFixed(3)), priority }));
}
