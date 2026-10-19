import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
const mime = {
  ".html": "text/html",
  ".mjs": "text/javascript",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};
export async function startServer(root, { port = 0, host = "127.0.0.1" } = {}) {
  root = await fs.realpath(root);
  const server = http.createServer(async (req, res) => {
    try {
      if (!["GET", "HEAD"].includes(req.method)) {
        res.writeHead(405).end();
        return;
      }
      const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      const parts = pathname.split("/");
      if (
        parts.some(
          (p) =>
            p.startsWith(".") ||
            ["node_modules", "artifacts", "dist"].includes(p),
        )
      ) {
        res.writeHead(403).end();
        return;
      }
      let file = path.resolve(root, "." + pathname);
      if ((await fs.stat(file)).isDirectory())
        file = path.join(file, "index.html");
      file = await fs.realpath(file);
      if (!file.startsWith(root + path.sep)) {
        res.writeHead(403).end();
        return;
      }
      const bytes = await fs.readFile(file);
      res.writeHead(200, {
        "Content-Type": mime[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(req.method === "HEAD" ? undefined : bytes);
    } catch {
      res.writeHead(404).end("Not found");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });
  return {
    url: `http://${host}:${server.address().port}`,
    close: () => new Promise((r) => server.close(r)),
  };
}
