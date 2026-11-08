import area from "@turf/area";

// Areas are geodesic measurements of the bundled generalized polygons, not
// official national statistics. Descending bands keep smaller places later.
export const LABEL_SIZE_BANDS = [
  { minAreaKm2: 1_000_000, minZoom: 0, sizeTier: 0 },
  { minAreaKm2: 250_000, minZoom: 1, sizeTier: 1 },
  { minAreaKm2: 50_000, minZoom: 2, sizeTier: 2 },
  { minAreaKm2: 10_000, minZoom: 3, sizeTier: 3 },
  { minAreaKm2: 2_000, minZoom: 4, sizeTier: 4 },
  { minAreaKm2: 200, minZoom: 5, sizeTier: 5 },
  { minAreaKm2: 0, minZoom: 6, sizeTier: 6 },
];

export function createCountryLabelList(features) {
  return features.map((feature) => {
    const areaKm2 = area(feature) / 1_000_000;
    const band = LABEL_SIZE_BANDS.find((band) => areaKm2 >= band.minAreaKm2);
    return {
      id: feature.id,
      name: feature.properties.name,
      label: feature.properties.label,
      areaKm2,
      minZoom: band.minZoom,
      sizeTier: band.sizeTier,
    };
  }).sort((a, b) => b.areaKm2 - a.areaKm2 || a.id.localeCompare(b.id))
    .map((country, priority) => ({ ...country, areaKm2: Number(country.areaKm2.toFixed(3)), priority }));
}
