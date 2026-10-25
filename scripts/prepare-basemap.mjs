import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const sourceDirectory = process.argv[2] ?? "/tmp";
const outputDirectory = path.resolve("public/data/antioch/basemap");
const bounds = [34.8, 34.8, 38.0, 37.8];
const includedPlaces = new Set([
  "Aleppo",
  "Antakya",
  "Gaziantep",
  "Idlib",
  "İskenderun",
  "Kilis",
  "Latakia",
  "Samandagi",
]);
const includedRegions = new Set(["Levant Coast", "Taurus Mts."]);

const sources = [
  {
    input: "ne_land.geojson",
    output: "land.geojson",
    filter: intersectsBounds,
    transformGeometry: clipGeometryToBounds,
  },
  {
    input: "ne_coastline.geojson",
    output: "coastline.geojson",
    filter: intersectsBounds,
  },
  {
    input: "ne_rivers.geojson",
    output: "waterways.geojson",
    filter: intersectsBounds,
  },
  {
    input: "ne_lakes.geojson",
    output: "lakes.geojson",
    filter: intersectsBounds,
  },
  {
    input: "ne_places.geojson",
    output: "places.geojson",
    filter: (feature) => includedPlaces.has(feature.properties?.NAME),
  },
  {
    input: "ne_regions.geojson",
    output: "relief-regions.geojson",
    filter: (feature) => includedRegions.has(feature.properties?.NAME),
  },
];

function flattenCoordinates(coordinates) {
  if (typeof coordinates?.[0] === "number") return [coordinates];
  return coordinates.flatMap(flattenCoordinates);
}

function intersectsBounds(feature) {
  const coordinates = flattenCoordinates(feature.geometry.coordinates);
  let minimumLongitude = Infinity;
  let maximumLongitude = -Infinity;
  let minimumLatitude = Infinity;
  let maximumLatitude = -Infinity;

  for (const [longitude, latitude] of coordinates) {
    minimumLongitude = Math.min(minimumLongitude, longitude);
    maximumLongitude = Math.max(maximumLongitude, longitude);
    minimumLatitude = Math.min(minimumLatitude, latitude);
    maximumLatitude = Math.max(maximumLatitude, latitude);
  }

  return (
    maximumLongitude >= bounds[0] &&
    minimumLongitude <= bounds[2] &&
    maximumLatitude >= bounds[1] &&
    minimumLatitude <= bounds[3]
  );
}

function selectProperties(properties = {}) {
  return {
    name: properties.NAME ?? null,
    featureClass: properties.featurecla ?? null,
    scaleRank: properties.SCALERANK ?? null,
  };
}

function clipRingToBounds(ring) {
  const boundaries = [
    {
      inside: ([longitude]) => longitude >= bounds[0],
      intersect: (start, end) => {
        const ratio = (bounds[0] - start[0]) / (end[0] - start[0]);
        return [bounds[0], start[1] + ratio * (end[1] - start[1])];
      },
    },
    {
      inside: ([longitude]) => longitude <= bounds[2],
      intersect: (start, end) => {
        const ratio = (bounds[2] - start[0]) / (end[0] - start[0]);
        return [bounds[2], start[1] + ratio * (end[1] - start[1])];
      },
    },
    {
      inside: ([, latitude]) => latitude >= bounds[1],
      intersect: (start, end) => {
        const ratio = (bounds[1] - start[1]) / (end[1] - start[1]);
        return [start[0] + ratio * (end[0] - start[0]), bounds[1]];
      },
    },
    {
      inside: ([, latitude]) => latitude <= bounds[3],
      intersect: (start, end) => {
        const ratio = (bounds[3] - start[1]) / (end[1] - start[1]);
        return [start[0] + ratio * (end[0] - start[0]), bounds[3]];
      },
    },
  ];

  let output = ring;

  for (const boundary of boundaries) {
    const input = output;
    output = [];
    if (input.length === 0) break;

    let start = input[input.length - 1];
    for (const end of input) {
      const startInside = boundary.inside(start);
      const endInside = boundary.inside(end);

      if (endInside) {
        if (!startInside) output.push(boundary.intersect(start, end));
        output.push(end);
      } else if (startInside) {
        output.push(boundary.intersect(start, end));
      }

      start = end;
    }
  }

  if (output.length > 0) {
    const first = output[0];
    const last = output[output.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) output.push(first);
  }

  return output;
}

function clipGeometryToBounds(geometry) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const clippedPolygons = polygons
    .map((polygon) => polygon.map(clipRingToBounds).filter((ring) => ring.length >= 4))
    .filter((polygon) => polygon.length > 0);

  if (clippedPolygons.length === 0) return null;
  if (clippedPolygons.length === 1) {
    return { type: "Polygon", coordinates: clippedPolygons[0] };
  }
  return { type: "MultiPolygon", coordinates: clippedPolygons };
}

mkdirSync(outputDirectory, { recursive: true });

for (const source of sources) {
  const inputPath = path.join(sourceDirectory, source.input);
  const collection = JSON.parse(readFileSync(inputPath, "utf8"));
  const output = {
    type: "FeatureCollection",
    features: collection.features
      .filter(source.filter)
      .map((feature) => ({
        type: "Feature",
        properties: selectProperties(feature.properties),
        geometry: source.transformGeometry
          ? source.transformGeometry(feature.geometry)
          : feature.geometry,
      }))
      .filter((feature) => feature.geometry),
  };

  writeFileSync(
    path.join(outputDirectory, source.output),
    `${JSON.stringify(output)}\n`,
  );
}

const graticuleFeatures = [];
for (let longitude = 35; longitude <= 38; longitude += 0.5) {
  graticuleFeatures.push({
    type: "Feature",
    properties: { longitude },
    geometry: {
      type: "LineString",
      coordinates: [
        [longitude, bounds[1]],
        [longitude, bounds[3]],
      ],
    },
  });
}
for (let latitude = 35; latitude <= 37.5; latitude += 0.5) {
  graticuleFeatures.push({
    type: "Feature",
    properties: { latitude },
    geometry: {
      type: "LineString",
      coordinates: [
        [bounds[0], latitude],
        [bounds[2], latitude],
      ],
    },
  });
}
writeFileSync(
  path.join(outputDirectory, "graticule.geojson"),
  `${JSON.stringify({ type: "FeatureCollection", features: graticuleFeatures })}\n`,
);

writeFileSync(
  path.join(outputDirectory, "metadata.json"),
  `${JSON.stringify(
    {
      source: "Natural Earth",
      sourceUrl: "https://www.naturalearthdata.com/",
      license: "Public domain",
      licenseUrl: "https://www.naturalearthdata.com/about/terms-of-use/",
      bounds,
      note: "Modern physical context only; not evidence for medieval features.",
    },
    null,
    2,
  )}\n`,
);

console.log(`Prepared local basemap files in ${outputDirectory}`);
