import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const mapLibreDirectory = path.resolve("node_modules/maplibre-gl");
const outputDirectory = path.resolve("public/vendor");

mkdirSync(outputDirectory, { recursive: true });
copyFileSync(
  path.join(mapLibreDirectory, "dist/maplibre-gl-worker.mjs"),
  path.join(outputDirectory, "maplibre-gl-worker.mjs"),
);
copyFileSync(
  path.join(mapLibreDirectory, "LICENSE.txt"),
  path.join(outputDirectory, "maplibre-LICENSE.txt"),
);

console.log("Synchronized the local MapLibre worker asset.");
