#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  validateManifest,
  validateConfig,
  validateTimeline,
  unwrapConfig,
} from "../core/validation.mjs";
import { createSession } from "../exporter/session.mjs";
import { checkSession } from "../exporter/check.mjs";
import { encodeVideo, exportRange, decodeVideo } from "../exporter/video.mjs";
import { hash } from "../exporter/cache.mjs";
const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const flags = new Set(["replace", "fresh", "draft"]),
  values = new Set([
    "project",
    "config",
    "out",
    "action",
    "from",
    "to",
    "time",
    "scale",
    "fps",
  ]);
export function parseArgs(args) {
  const [command = "help", ...rest] = args,
    options = {};
  for (let i = 0; i < rest.length; i++) {
    const k = rest[i].replace(/^--/, "");
    if (!rest[i].startsWith("--") || (!flags.has(k) && !values.has(k)))
      throw Error(`Unknown option: ${rest[i]}`);
    if (flags.has(k)) options[k] = true;
    else {
      if (!rest[i + 1] || rest[i + 1].startsWith("--"))
        throw Error(`--${k} requires a value`);
      options[k] = rest[++i];
    }
  }
  return { command, options };
}
export async function run(args) {
  const { command, options: o } = parseArgs(args);
  if (command === "help") {
    console.log(
      "motion inspect | check | frame --time 1 | export [--action open | --from 1 --to 2]\n  --project projects/cards --config config.json --out path --scale 1 --fresh --replace\n60 fps. Starts its own temporary localhost server. See README.md.",
    );
    return;
  }
  if (!["inspect", "check", "frame", "export"].includes(command))
    throw Error(`Unknown command: ${command}`);
  const input = o.config
    ? JSON.parse(await fs.readFile(path.resolve(o.config), "utf8"))
    : {};
  let projectPath =
    o.project ||
    (input.project
      ? "." + new URL(input.project, "http://localhost").pathname
      : "projects/cards");
  let manifestPath = path.resolve(root, projectPath);
  if (!manifestPath.endsWith(".json"))
    manifestPath = path.join(manifestPath, "motion.project.json");
  if (!manifestPath.startsWith(root + path.sep))
    throw Error("project: must be inside this workspace");
  const project = validateManifest(
      JSON.parse(await fs.readFile(manifestPath, "utf8")),
    ),
    config = validateConfig(unwrapConfig(input), project);
  const module = await import(
    pathToFileURL(path.resolve(path.dirname(manifestPath), project.timeline))
  );
  if (typeof module.compile !== "function")
    throw Error("timeline module must export compile(config)");
  const tl = validateTimeline(module.compile(config));
  if (command === "inspect") {
    console.log(JSON.stringify({ project, timeline: tl }, null, 2));
    return;
  }
  const scale = Number(
    o.scale ?? (o.draft ? 1 : project.composition.exportScale),
  );
  if (!Number.isFinite(scale) || scale < 0.1 || scale > 6)
    throw Error("scale: expected .1…6");
  if (o.fps !== undefined && Number(o.fps) !== 60)
    throw Error("fps: must be 60");
  const width = project.composition.width * scale,
    height = project.composition.height * scale;
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    (command === "export" && (width % 2 || height % 2))
  )
    throw Error(
      "dimensions: export size must be integer and MP4 dimensions even",
    );
  const started = performance.now(),
    session = await createSession({
      root,
      manifestPath,
      project,
      config,
      scale,
      fresh: o.fresh,
    });
  try {
    const out = path.resolve(
      o.out ||
        path.join(
          root,
          "artifacts",
          project.name,
          command === "check"
            ? "review"
            : command === "frame"
              ? "frame.png"
              : "film.mp4",
        ),
    );
    if (command === "check") {
      const report = await checkSession(session, project, out);
      console.log(
        JSON.stringify({
          out,
          invariants: report.invariants,
          metrics: report.metrics,
        }),
      );
      return;
    }
    if (command === "frame") {
      const time = Number(o.time ?? 0);
      if (!Number.isFinite(time) || time < 0 || time > tl.last)
        throw Error(`time: expected 0…${tl.last}`);
      await fs.mkdir(path.dirname(out), { recursive: true });
      await fs.writeFile(out, await session.frame(time), {
        flag: o.replace ? "w" : "wx",
      });
    } else {
      const range = exportRange(session.timeline, o);
      await encodeVideo(session, out, range, { replace: o.replace });
      const decode = await decodeVideo(out);
      if (decode.frames !== range.frames)
        throw Error(
          `Decoded ${decode.frames} frames; expected ${range.frames}`,
        );
      if (session.errors.length) throw Error(session.errors.join("\n"));
      const report = {
        project: project.name,
        config,
        actions: session.timeline.actions,
        composition: { width, height, fps: 60 },
        ...range,
        duration: range.frames / 60,
        decode,
        metrics: { ...session.metrics, totalMs: performance.now() - started },
        dependencies: session.dependencies,
        fingerprint: session.fingerprint,
        browser: session.browserVersion,
        sha256: hash(await fs.readFile(out)),
      };
      await fs.writeFile(out + ".json", JSON.stringify(report, null, 2));
      console.log(JSON.stringify({ out, ...report, dependencies: undefined }));
    }
  } finally {
    await session.close();
  }
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  run(process.argv.slice(2)).catch((error) => {
    console.error(`motion: ${error.message}`);
    process.exitCode = 1;
  });
