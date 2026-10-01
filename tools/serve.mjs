import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, relative, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const port = Number(process.env.PORT || 4173);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".ttf": "font/ttf", ".woff2": "font/woff2", ".ico": "image/x-icon" };
const server = createServer(async (request, response) => {
  try {
    let pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    // Alias para testar exatamente os caminhos de um subdiretório no GitHub Pages.
    if (pathname === "/portfolio") { response.writeHead(301, { Location: "/portfolio/" }); response.end(); return; }
    if (pathname.startsWith("/portfolio/")) pathname = pathname.slice("/portfolio".length);
    let path = resolve(root, "." + pathname);
    const local = relative(root, path);
    if (local.startsWith(".." + sep) || local === ".." || local.includes(".git") || local.startsWith("node_modules")) {
      response.writeHead(403); response.end(); return;
    }
    if ((await stat(path)).isDirectory()) path = resolve(path, "index.html");
    const body = await readFile(path);
    response.writeHead(200, { "Content-Type": types[extname(path)] || "application/octet-stream", "Cache-Control": "no-store" });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch (_) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Arquivo não encontrado");
  }
});
server.listen(port, "127.0.0.1", () => console.log("Portfólio disponível em http://127.0.0.1:" + port));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(() => process.exit(0)));
