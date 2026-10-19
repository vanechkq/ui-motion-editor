import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateManifest } from "../core/validation.mjs";
const root = fileURLToPath(new URL("../", import.meta.url)),
  dist = path.join(root, "dist");
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
console.log("Built static editor in dist/");
