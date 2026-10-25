import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";

const outputDirectory = path.resolve(process.cwd(), "out");
const host = process.env.STATIC_HOST ?? "127.0.0.1";
const port = Number.parseInt(process.env.STATIC_PORT ?? "3000", 10);

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".geojson", "application/geo+json; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

function resolveRequestPath(requestUrl) {
  const pathname = decodeURIComponent(
    new URL(requestUrl ?? "/", "http://localhost").pathname,
  );
  const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  let filePath = path.resolve(outputDirectory, relativePath);

  if (!filePath.startsWith(`${outputDirectory}${path.sep}`)) {
    return null;
  }

  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  return filePath;
}

const server = createServer((request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end();
    return;
  }

  const requestedFile = resolveRequestPath(request.url);
  const notFoundFile = path.join(outputDirectory, "404.html");
  const filePath =
    requestedFile && existsSync(requestedFile) && statSync(requestedFile).isFile()
      ? requestedFile
      : notFoundFile;
  const status = filePath === requestedFile ? 200 : 404;

  if (!existsSync(filePath)) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Static export not found. Run `npm run build` first.\n");
    return;
  }

  response.writeHead(status, {
    "Cache-Control": "no-cache",
    "Content-Type": contentTypes.get(path.extname(filePath)) ?? "application/octet-stream",
  });

  if (request.method === "HEAD") {
    response.end();
    return;
  }

  createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Static export ready at http://${host}:${port}`);
});
