import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateManifest } from "../core/validation.mjs";
const root = fileURLToPath(new URL("../", import.meta.url)),
  dist = path.join(root, "dist");
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== "--base"))
  throw Error("Usage: build [--base /editor/]");
const base = args[1];
if (base && !/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(base))
  throw Error("base: expected an absolute directory path ending in /");
const registry = JSON.parse(
  await fs.readFile(path.join(root, "projects.json")),
);
for (const p of registry.projects)
  validateManifest(JSON.parse(await fs.readFile(path.join(root, p.manifest))));
await fs.rm(dist, { recursive: true, force: true });
await fs.mkdir(dist, { recursive: true });
for (const name of [
  "index.html",
  "projects.json",
  "editor",
  "core",
  "engine",
  "projects",
])
  await fs.cp(path.join(root, name), path.join(dist, name), {
    recursive: true,
  });
if (base) {
  const entry = path.join(dist, "index.html");
  const html = await fs.readFile(entry, "utf8");
  await fs.writeFile(
    entry,
    html.replace(
      '<meta charset="utf-8" />',
      `<meta charset="utf-8" /><base href="${base}" />`,
    ),
  );
}
console.log("Built static editor in dist/" + (base ? ` for ${base}` : ""));
