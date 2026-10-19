import { validateActionTiming } from "../engine/action-timing.mjs";
import { tapFields } from "../engine/tokens.mjs";
const unsafe = new Set(["__proto__", "prototype", "constructor"]);
const ordered = (v) =>
  Array.isArray(v)
    ? v.map(ordered)
    : v && typeof v === "object"
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, ordered(v[k])]),
        )
      : v;
const object = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const fail = (path, message) => {
  throw new Error(`${path}: ${message}`);
};
function finite(v, p, min, max) {
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max)
    fail(p, `expected number ${min}…${max}`);
}
function text(v, p) {
  if (typeof v !== "string" || !v.trim()) fail(p, "expected non-empty string");
}
export function safeTree(value, path = "config") {
  if (Array.isArray(value))
    value.forEach((v, i) => safeTree(v, `${path}.${i}`));
  else if (object(value))
    for (const [k, v] of Object.entries(value)) {
      if (unsafe.has(k)) fail(path, `forbidden key ${k}`);
      safeTree(v, `${path}.${k}`);
    }
  else if (
    !["string", "number", "boolean"].includes(typeof value) ||
    (typeof value === "number" && !Number.isFinite(value))
  )
    fail(path, "expected JSON scalar, array or object");
  return value;
}
export function validateManifest(m) {
  if (!object(m)) fail("manifest", "expected object");
  safeTree(m, "manifest");
  if (m.schema !== 1) fail("schema", "expected version 1");
  for (const k of ["name", "label", "scene", "timeline"]) text(m[k], k);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(m.name))
    fail("name", "use lowercase letters, digits and hyphens");
  for (const k of ["scene", "timeline"])
    if (!/^\.\/[\w./-]+$/.test(m[k]) || m[k].split("/").includes(".."))
      fail(k, "use a relative path inside the project, starting ./");
  if (!object(m.composition)) fail("composition", "expected object");
  for (const k of ["width", "height"]) {
    finite(m.composition[k], `composition.${k}`, 16, 8192);
    if (!Number.isInteger(m.composition[k]))
      fail(`composition.${k}`, "expected integer");
  }
  if (m.composition.fps !== 60) fail("composition.fps", "must be 60");
  finite(m.composition.exportScale, "composition.exportScale", 0.1, 6);
  if (m.loop !== undefined && typeof m.loop !== "boolean")
    fail("loop", "expected boolean");
  const ids = new Set(["tap"]),
    fields = new Set();
  if (m.editor && !Array.isArray(m.editor.groups))
    fail("editor.groups", "expected array");
  for (const g of m.editor?.groups || []) {
    text(g.id, "group.id");
    text(g.label, "group.label");
    if (ids.has(g.id)) fail("group.id", `duplicate/reserved id ${g.id}`);
    ids.add(g.id);
    if (!Array.isArray(g.fields))
      fail(`group.${g.id}.fields`, "expected array");
    for (const f of g.fields) {
      text(f.path, "field.path");
      text(f.label, "field.label");
      if (
        !/^[a-zA-Z]\w*(\.[a-zA-Z]\w*)*$/.test(f.path) ||
        f.path.split(".").some((k) => unsafe.has(k))
      )
        fail("field.path", "invalid parameter path");
      if (fields.has(f.path)) fail(f.path, "duplicate field");
      fields.add(f.path);
      if (!["number", "range", "color", "textarea", "preset"].includes(f.type))
        fail(f.path, "unsupported field type");
      for (const k of ["min", "max"])
        if (f[k] !== undefined) finite(f[k], `${f.path}.${k}`, -1e9, 1e9);
      if (f.min > f.max) fail(f.path, "min must not exceed max");
      if (f.type === "preset") {
        if (!Array.isArray(f.options) || !f.options.length)
          fail(f.path, "preset needs options");
        for (const o of f.options) {
          text(o.label, f.path);
          if (!object(o.value)) fail(f.path, "preset value must be an object");
        }
      }
    }
  }
  return m;
}
export function validateConfig(config, manifest) {
  if (!object(config)) fail("config", "expected object");
  safeTree(config);
  const fields = [
    ...(manifest.editor?.groups || []).flatMap((g) => g.fields),
    ...tapFields,
  ];
  const paths = new Map(fields.map((f) => [f.path, f]));
  const walk = (v, p = "") => {
    if (p === "timeline") {
      validateActionTiming(v);
      return;
    }
    const f = paths.get(p);
    if (f) {
      if (["number", "range"].includes(f.type))
        finite(v, p, f.min ?? -1e9, f.max ?? 1e9);
      if (f.type === "textarea" && typeof v !== "string")
        fail(p, "expected text");
      if (f.type === "color" && !/^#[0-9a-f]{6}$/i.test(v))
        fail(p, "expected #RRGGBB");
      if (
        f.type === "preset" &&
        !f.options.some(
          (o) =>
            JSON.stringify(ordered(o.value)) === JSON.stringify(ordered(v)),
        )
      )
        fail(p, "expected a declared preset");
      return;
    }
    if (
      !object(v) ||
      ![...paths.keys()].some((k) => k.startsWith(p ? p + "." : ""))
    )
      fail(p || "config", "unknown parameter");
    for (const [k, x] of Object.entries(v)) walk(x, p ? `${p}.${k}` : k);
  };
  for (const [key, value] of Object.entries(config)) walk(value, key);
  return config;
}
export function unwrapConfig(input) {
  if (!object(input)) fail("config", "expected object");
  if (!Object.hasOwn(input, "config")) return input;
  if (input.schema !== 1) fail("config.schema", "expected version 1");
  text(input.project, "config.project");
  for (const key of Object.keys(input))
    if (!["schema", "project", "config"].includes(key))
      fail(`config.${key}`, "unknown envelope field");
  return input.config;
}
export function validateTimeline(t) {
  finite(t?.duration, "timeline.duration", 1 / 60, 3600);
  if (t.fps !== 60) fail("timeline.fps", "must be 60");
  finite(t.last, "timeline.last", 0, t.duration);
  if (Math.abs(t.last - (t.duration - 1 / 60)) > 1e-7)
    fail("timeline.last", "must equal duration - 1/60");
  if (!Array.isArray(t.actions) || !Array.isArray(t.tracks))
    fail("timeline", "actions and tracks must be arrays");
  const ids = new Set();
  for (const a of t.actions) {
    text(a.id, "action.id");
    text(a.name, "action.name");
    if (ids.has(a.id)) fail("action.id", "must be unique");
    ids.add(a.id);
    bounds(a, t);
  }
  for (const r of t.tracks) {
    text(r.id, "track.id");
    if (!Array.isArray(r.clips)) fail("track.clips", "expected array");
    r.clips.forEach((c) => {
      text(c.name, "clip.name");
      bounds(c, t);
    });
  }
  return t;
}
function bounds(a, t) {
  finite(a.from, "clip.from", 0, t.duration);
  finite(a.to, "clip.to", 0, t.duration);
  if (a.to <= a.from) fail("clip.to", "must follow from");
}
export function validateScene(scene) {
  if (!scene?.ready) fail("scene.ready", "expected true");
  validateTimeline(scene.timeline);
  for (const fn of ["seek", "inspect"])
    if (typeof scene[fn] !== "function")
      fail(`scene.${fn}`, "expected function");
  if (scene.retime !== undefined && typeof scene.retime !== "function")
    fail("scene.retime", "expected function");
  if (!object(scene.parameters) || !object(scene.layers))
    fail("scene", "parameters and layers must be objects");
  return scene;
}
