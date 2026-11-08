import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

// Download sources at build/preparation time only; the application reads the output locally.
// node scripts/prepare-summits.mjs <NE elevation-points.geojson> <GVP volcanoes.geojson>
const [peakPath, volcanoPath] = process.argv.slice(2);
if (!peakPath || !volcanoPath) throw new Error("Usage: node scripts/prepare-summits.mjs <NE elevation-points.geojson> <GVP volcanoes.geojson>");
const raw = [peakPath, volcanoPath].map((path) => readFileSync(path));
const [naturalEarth, gvp] = raw.map((bytes) => JSON.parse(bytes));
const peakUrl = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_geography_regions_elevation_points.geojson";
const volcanoUrl = "https://webservices.volcano.si.edu/geoserver/GVP-VOTW/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=GVP-VOTW%3ASmithsonian_VOTW_Holocene_Volcanoes&outputFormat=application%2Fjson";
const output = new URL("../public/data/world/physical/", import.meta.url);
const majorVolcanoes = new Set(["Fujisan", "Etna", "Vesuvius", "Krakatau", "Tambora", "Mauna Loa", "Kilauea", "Rainier", "St. Helens", "Pinatubo", "Popocatepetl", "Cotopaxi", "Ruapehu", "Erebus", "Elbrus", "Ararat", "Teide", "Tenerife", "Klyuchevskoy"]);
const round = (coordinates) => coordinates.map((value) => Number(value.toFixed(5)));
const elevation = (value) => typeof value === "number" && Number.isFinite(value) ? { elevationMetres: value } : {};
const volcanoes = gvp.features.map((feature) => {
  const p = feature.properties;
  const major = majorVolcanoes.has(p.Volcano_Name);
  const id = `volcano-${p.Volcano_Number}`;
  return { type: "Feature", id, properties: {
    id, name: p.Volcano_Name, kind: "Volcano", minZoom: major ? 3 : p.Elevation >= 3000 ? 4 : p.Elevation >= 1500 ? 5 : 6,
    priority: major ? 1 : p.Elevation >= 3000 ? 4 : 7, ...elevation(p.Elevation),
    sourceName: "Smithsonian Institution, Global Volcanism Program", sourceUrl: "https://volcano.si.edu/",
    informationUrl: `https://volcano.si.edu/volcano.cfm?vn=${p.Volcano_Number}`,
    volcanoType: p.Primary_Volcano_Type, catalogue: "Holocene", country: p.Country,
  }, geometry: { type: "Point", coordinates: round(feature.geometry.coordinates) } };
});
const normalize = (name) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter((word) => word.length >= 4 && !["mount", "mountain", "mountains", "volcano", "volcanic", "gunung", "cerro", "gora", "peak", "nevado", "pico", "morne", "group"].includes(word));
const aliases = new Map(Object.entries({
  "Mount Fuji": "Fujisan", "Mount Unzen": "Unzendake", "Mount Iwate": "Iwatesan", "Mount Kuju": "Kujusan",
  "Klyuchevskaya Sopka": "Klyuchevskoy", "Baekdu Mountain": "Changbaishan", "Hallasan": "Halla",
  "Kartala": "Karthala", "Gunung Cereme": "Ciremai", "Krakatoa": "Krakatau", "Haleakalā": "Haleakala",
  "Mount Misery": "Liamuiga", "Chimborazo volcano": "Chimborazo",
}));
function distance(a, b) {
  const r = Math.PI / 180;
  return 12742 * Math.asin(Math.min(1, Math.sqrt(Math.sin((a[1] - b[1]) * r / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin((a[0] - b[0]) * r / 2) ** 2)));
}
const merged = [];
const peaks = [];
for (const feature of naturalEarth.features) {
  const p = feature.properties;
  if (p.featurecla !== "mountain") continue;
  const name = p.name_en || p.name;
  if (!name || !(p.elevation > 0)) continue;
  const rank = Number(p.scalerank) || 9;
  const minZoom = rank <= 2 ? 3 : rank <= 4 ? 4 : rank <= 6 ? 5 : 6;
  const words = normalize(name);
  const match = volcanoes.find((v) => distance(feature.geometry.coordinates, v.geometry.coordinates) <= 15 && (aliases.get(name) === v.properties.name || normalize(v.properties.name).some((word) => words.includes(word))));
  if (match) {
    match.properties.minZoom = Math.min(match.properties.minZoom, minZoom);
    match.properties.priority = Math.min(match.properties.priority, rank);
    match.properties.peakName = name;
    match.properties.peakElevationMetres = p.elevation;
    match.properties.peakSourceUrl = peakUrl;
    merged.push({ peak: name, volcano: match.properties.name });
    continue;
  }
  const id = `peak-${p.ne_id}`;
  peaks.push({ type: "Feature", id, properties: { id, name, kind: "Peak", minZoom, priority: rank,
    ...elevation(p.elevation), sourceName: "Natural Earth", sourceUrl: peakUrl,
    ...(p.wikidataid ? { informationUrl: `https://www.wikidata.org/wiki/${p.wikidataid}` } : {}),
  }, geometry: { type: "Point", coordinates: round(feature.geometry.coordinates) } });
}
const features = [...peaks, ...volcanoes].sort((a, b) => a.properties.minZoom - b.properties.minZoom || a.properties.priority - b.properties.priority || a.id.localeCompare(b.id));
writeFileSync(new URL("summits.geojson", output), JSON.stringify({ type: "FeatureCollection", features }) + "\n");
writeFileSync(new URL("summits-metadata.json", output), JSON.stringify({
  title: "Mountain peaks and Holocene volcanoes", preparedOn: new Date().toISOString().slice(0, 10),
  sources: [
    { name: "Natural Earth 1:10m geography regions elevation points", url: peakUrl, sourceSha256: createHash("sha256").update(raw[0]).digest("hex"), license: "Public domain", licenseUrl: "https://www.naturalearthdata.com/about/terms-of-use/", sourceRecords: naturalEarth.features.length },
    { name: "Global Volcanism Program, 2026. Volcanoes of the World (v. 5.4.0; 7 Aug 2026). Distributed by Smithsonian Institution, compiled by Venzke, E.", url: volcanoUrl, informationUrl: "https://volcano.si.edu/database/webservices.cfm", doi: "https://doi.org/10.5479/si.GVP.VOTW5-2026.5.4", sourceSha256: createHash("sha256").update(raw[1]).digest("hex"), license: "US federal employee database compilation; Smithsonian/GVP terms apply. Attribute Global Volcanism Program, Smithsonian Institution.", licenseUrl: "https://volcano.si.edu/gvp_termsofuse.cfm", sourceRecords: gvp.features.length, sourceTimestamp: gvp.timeStamp },
  ],
  featureCounts: { peaks: peaks.length, volcanoes: volcanoes.length, total: features.length, mergedPeakRecords: merged.length },
  transformations: "Keep Natural Earth mountain class with positive elevation; retain all Smithsonian Holocene volcano points and available numeric elevations (including submarine negative elevations). Round coordinates to five decimals. Merge peak/volcano records within 15 km only when substantive normalized names match or an explicit alias matches; preserve source peak name/elevation on the volcano. Rank peaks by Natural Earth scalerank, volcanoes by curated overview names then elevation; zoom 3–6. No eruption-status labels are inferred.",
  limitations: "Selected cartographic peaks, not an exhaustive summit inventory. Natural Earth elevations are source-era values, not a current height survey (for example Everest 8,848 m). Smithsonian locations may identify volcanic fields, calderas, or submarine systems rather than individual summits. Holocene catalog inclusion does not mean currently erupting or active; extinct volcanoes outside this catalog may remain ordinary peaks. Close but differently named summits/systems remain separate. Elevation is omitted for two volcano records where GVP supplies none. Not for navigation or hazard assessment.",
  mergedPeakRecords: merged,
}, null, 2) + "\n");
console.log(`Prepared ${peaks.length} peaks and ${volcanoes.length} volcanoes; merged ${merged.length} overlapping peak records.`);
