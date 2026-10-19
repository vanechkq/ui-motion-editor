import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSession } from "../exporter/session.mjs";
import { checkSession, equalPixels } from "../exporter/check.mjs";
import { encodeVideo, decodeVideo, exportRange } from "../exporter/video.mjs";
const root = fileURLToPath(new URL("../", import.meta.url));
async function session(name, config = {}, fresh = false) {
  const manifestPath = path.join(root, "projects", name, "motion.project.json"),
    project = JSON.parse(await fs.readFile(manifestPath));
  return {
    project,
    s: await createSession({ root, manifestPath, project, config, fresh }),
  };
}
test("both scene adapters are deterministic at arbitrary seek times", async () => {
  for (const name of ["cards", "toggle"]) {
    const { s, project } = await session(name);
    try {
      const report = await checkSession(
        s,
        project,
        path.join(root, "artifacts", name, "review"),
      );
      assert.equal(report.invariants.deterministicSeek, true);
      assert.equal(report.invariants.seamlessLoop, true);
    } finally {
      await s.close();
    }
  }
});
test("partial export decodes, warm frames match, hold edits reuse while content and tokens invalidate", async () => {
  let { s } = await session("cards", {}, true);
  const out = path.join(root, "artifacts/tests/partial.mp4");
  let cold,
    fingerprint = s.fingerprint;
  try {
    cold = await s.frame(0.99);
    await encodeVideo(s, out, exportRange(s.timeline, { action: "open" }), {
      replace: true,
    });
    assert.equal((await decodeVideo(out)).frames, 47);
    assert.ok(s.metrics.captures > 0);
  } finally {
    await s.close();
  }
  ({ s } = await session("cards"));
  try {
    assert.ok(equalPixels(cold, await s.frame(0.99)));
    assert.equal(s.metrics.hits, 1);
  } finally {
    await s.close();
  }
  ({ s } = await session("cards", { hold: { details: 2.5 } }));
  try {
    assert.ok(equalPixels(cold, await s.frame(0.99)));
    assert.equal(s.metrics.hits, 1);
  } finally {
    await s.close();
  }
  ({ s } = await session("cards", {
    content: { title: "Changed test title" },
  }));
  try {
    assert.equal(equalPixels(cold, await s.frame(0.99)), false);
    assert.notEqual(s.fingerprint, fingerprint);
  } finally {
    await s.close();
  }
  ({ s } = await session("cards", {
    tokens: { tapIndicator: { diameter: 36, press: 0.3 } },
  }));
  try {
    await s.frame(0.99);
    assert.notEqual(s.fingerprint, fingerprint);
    const width = await s.page
      .locator('[data-motion-component="tap-indicator"]')
      .evaluate((e) => e.style.width);
    assert.equal(width, "36px");
    assert.ok(Math.abs(s.timeline.cuts.open - 1.05) < 1e-9);
  } finally {
    await s.close();
  }
});
