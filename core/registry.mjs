import {
  validateManifest,
  validateConfig,
  unwrapConfig,
} from "./validation.mjs";
export function sameOriginURL(value, base = document.baseURI) {
  const url = new URL(value, base);
  if (url.origin !== location.origin)
    throw Error("Проект и сцена должны быть на том же сервере");
  return url;
}
export async function readJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw Error(`${response.status}: ${url}`);
  return response.json();
}
export async function loadProject(url, manifest) {
  const resolved = sameOriginURL(url);
  const project = validateManifest(manifest || (await readJSON(resolved)));
  sameOriginURL(project.scene, resolved);
  return { project, url: resolved.href };
}
export function configEnvelope(project, config) {
  const url = new URL(project),
    root = new URL("../", import.meta.url);
  const portable =
    url.origin === root.origin && url.pathname.startsWith(root.pathname)
      ? "./" + url.pathname.slice(root.pathname.length)
      : url.pathname;
  return { schema: 1, project: portable, config };
}
export function readConfig(value, project) {
  return validateConfig(unwrapConfig(value), project);
}
