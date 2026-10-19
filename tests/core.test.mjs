import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  validateManifest,
  validateConfig,
  validateTimeline,
  unwrapConfig,
} from "../core/validation.mjs";
import { Transport } from "../core/transport.mjs";
import { compile, sample } from "../projects/cards/timeline.mjs";
import { sampleTap } from "../engine/components.mjs";
import { exportRange } from "../exporter/video.mjs";
import { parseArgs } from "../tools/motion.mjs";
const manifest = JSON.parse(
  await fs.readFile(
    new URL("../projects/cards/motion.project.json", import.meta.url),
  ),
);
test("manifest and config reject actionable invalid inputs", () => {
  assert.equal(validateManifest(manifest), manifest);
  for (const [change, pattern] of [
    [{ composition: { ...manifest.composition, fps: 120 } }, /fps/],
    [{ scene: "../../private.html" }, /scene/],
    [{ schema: 2 }, /schema/],
  ])
    assert.throws(() => validateManifest({ ...manifest, ...change }), pattern);
  assert.throws(
    () => validateConfig({ hold: { details: -1 } }, manifest),
    /hold.details/,
  );
  assert.throws(
    () =>
      validateConfig({ tokens: { tapIndicator: { color: "red" } } }, manifest),
    /color/,
  );
  assert.throws(
    () => validateConfig({ content: { unknown: "x" } }, manifest),
    /unknown/,
  );
  assert.throws(
    () =>
      validateConfig(JSON.parse('{"__proto__":{"polluted":true}}'), manifest),
    /forbidden/,
  );
  assert.throws(
    () => validateConfig({ motion: { open: { omega: 3 } } }, manifest),
    /preset/,
  );
});
test("shared timing shifts trigger and synchronizes tap/target press", () => {
  const base = compile(),
    edited = compile({
      tokens: { tapIndicator: { diameter: 36, press: 0.3 } },
    });
  assert.ok(Math.abs(edited.cuts.open - base.cuts.open - 0.1) < 1e-8);
  const token = edited.tokens.tapIndicator,
    pose = sampleTap(
      token.enter + token.press,
      { tap: token, press: token.spring },
      0.95,
    );
  assert.equal(pose.control, 0.95);
  assert.equal(pose.scale, token.scale[2]);
  assert.equal(validateTimeline(edited), edited);
});
test("time sampling is independent from call order", () => {
  const tl = compile(),
    a = sample(0.99, tl);
  for (const time of [0, 3, 1.3, tl.last, 0.02]) sample(time, tl);
  assert.deepEqual(sample(0.99, tl), a);
  assert.equal(sample(0, tl).visualKey, sample(tl.last, tl).visualKey);
});
test("transport preserves loop overshoot, stops and steps", () => {
  const clock = new Transport();
  clock.setTimeline(compile());
  clock.range(0.6, 1.37);
  clock.seek(1.36);
  clock.play(true);
  assert.ok(Math.abs(clock.advance(0.04) - 0.63) < 1e-9);
  clock.loop = false;
  clock.seek(1.36);
  assert.equal(clock.advance(0.04), 1.37);
  assert.equal(clock.playing, false);
  clock.seek(-1);
  assert.equal(clock.time, 0);
  clock.seek(99);
  assert.equal(clock.time, clock.last);
});
test("partial export frame range and CLI errors", () => {
  const tl = compile(),
    range = exportRange(tl, { action: "open" });
  assert.equal(range.frames, 47);
  assert.equal(range.fps, 60);
  assert.throws(() => exportRange(tl, { action: "missing" }), /unknown/);
  assert.throws(() => exportRange(tl, { from: 2, to: 1 }), /range/);
  assert.throws(() => parseArgs(["export", "--scale"]), /requires a value/);
  assert.throws(() => parseArgs(["export", "--scle", "3"]), /Unknown option/);
});

test("preset key order and config envelope version are validated", () => {
  assert.doesNotThrow(() =>
    validateConfig(
      { motion: { open: { duration: 0.42, zeta: 0.86, omega: 28 } } },
      manifest,
    ),
  );
  assert.throws(
    () =>
      unwrapConfig({
        schema: 2,
        project: "/projects/cards/motion.project.json",
        config: {},
      }),
    /schema/,
  );
});
