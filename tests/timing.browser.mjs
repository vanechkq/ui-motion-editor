import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startServer } from "../exporter/server.mjs";
import { createSession } from "../exporter/session.mjs";
import { checkSession, equalPixels } from "../exporter/check.mjs";
import { encodeVideo, decodeVideo, exportRange } from "../exporter/video.mjs";
const root = fileURLToPath(new URL("../", import.meta.url));
const near = (a, b, tol = 1e-6) =>
  assert.ok(Math.abs(a - b) < tol, `${a} != ${b}`);
const ready = (page) =>
  page.waitForFunction(() => motionPreview.scene?.ready && !motionPreview.busy);
const actions = (page) =>
  page.evaluate(() => motionPreview.scene.timeline.actions);
async function drag(page, locator, dx) {
  const box = await locator.boundingBox();
  assert.ok(box);
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y, { steps: 8 });
  await page.mouse.up();
}
test("hot center/edge/numeric timing edits, draft preservation, persistence and view-only capability", async () => {
  const server = await startServer(root),
    browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
        viewport: { width: 1280, height: 900 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(server.url);
    await ready(page);
    await page.evaluate(() => {
      window.originalFrame = document.querySelector("iframe");
      window.originalLayer = motionPreview.scene.layers.feed;
      window.frameLoads = 0;
      originalFrame.addEventListener("load", () => frameLoads++);
    });
    await page.getByRole("tab", { name: "Текст", exact: true }).click();
    await page
      .locator('[data-path="content.title"]')
      .fill("Черновик с таймингом");
    const initial = await actions(page),
      block = page.locator('[data-action="open"]');
    await block.click();
    assert.ok(await page.locator("#action-timing").isVisible());
    await drag(page, block, 80);
    let a = await actions(page);
    assert.ok(a[0].from > initial[0].from);
    near(a[0].from * 10, Math.round(a[0].from * 10));
    near((a[0].to - a[0].from) * 10, Math.round((a[0].to - a[0].from) * 10));
    for (const id of ["#action-start", "#action-duration"]) {
      assert.match(await page.locator(id).inputValue(), /^\d+(?:\.\d)?$/);
    }
    near(
      a[1].from - a[0].to,
      initial[1].from - initial[0].to,
      1 / 60 + 0.000001,
    );
    const duration = a[0].to - a[0].from;
    await drag(
      page,
      page.locator('[data-action="open"] [data-resize="end"]'),
      70,
    );
    a = await actions(page);
    assert.ok(a[0].to - a[0].from > duration);
    const end = a[0].to;
    await drag(
      page,
      page.locator('[data-action="open"] [data-resize="start"]'),
      30,
    );
    a = await actions(page);
    near(a[0].to, end);
    assert.ok(a[0].from > 0);
    await page.locator("#action-start").fill("1.066667");
    await page.locator("#action-start").press("Tab");
    near((await actions(page))[0].from, 1.1);
    await page.locator("#action-start").press("ArrowUp");
    await page.locator("#action-start").press("Tab");
    near((await actions(page))[0].from, 1.2);
    await page.locator("#action-start").fill("1.3");
    await page.locator("#action-start").press("Tab");
    await page.locator("#action-duration").fill("1.2");
    await page.locator("#action-duration").press("Enter");
    a = await actions(page);
    near(a[0].from, 1.3);
    near(a[0].to - a[0].from, 1.2);
    assert.equal(
      await page.locator('[data-path="content.title"]').inputValue(),
      "Черновик с таймингом",
    );
    assert.deepEqual(
      await page.evaluate(() => ({
        sameFrame: originalFrame === document.querySelector("iframe"),
        sameLayer: originalLayer === motionPreview.scene.layers.feed,
        loads: frameLoads,
        motion: motionPreview.scene.parameters.motion.open.duration,
      })),
      { sameFrame: true, sameLayer: true, loads: 0, motion: 0.42 },
    );
    const beforeCancel = await page.evaluate(
      () => motionPreview.config.timeline,
    );
    const b = await page.locator('[data-action="open"]').boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + 15);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 + 50, b.y + 15);
    await page.keyboard.press("Escape");
    await page.mouse.up();
    assert.deepEqual(
      await page.evaluate(() => motionPreview.config.timeline),
      beforeCancel,
    );
    const downloadEvent = page.waitForEvent("download");
    await page.locator("#save").click();
    const download = await downloadEvent,
      json = JSON.parse(await fs.readFile(await download.path(), "utf8"));
    near(json.config.timeline.actions.open.duration, 1.2);
    assert.equal(json.config.content.title, "Черновик с таймингом");
    await fs.mkdir(path.join(root, "artifacts/timing-v1"), { recursive: true });
    await fs.writeFile(
      path.join(root, "artifacts/timing-v1/cards-config.json"),
      JSON.stringify(json, null, 2),
    );
    await page.reload();
    await ready(page);
    a = await actions(page);
    near(a[0].from, 1.3);
    near(a[0].to - a[0].from, 1.2);
    await page.locator('[data-action="open"]').click();
    await page.screenshot({
      path: path.join(root, "artifacts/timing-v1/editor.png"),
    });
    await page.selectOption("#project", { label: "Переключатель" });
    await page.waitForFunction(
      () => motionPreview.project.name === "focus-toggle",
    );
    await ready(page);
    await page.locator('[data-action="on"]').click();
    await page.locator("#action-duration").fill(".01");
    await page.locator("#action-duration").press("Enter");
    a = await actions(page);
    near(a[0].to - a[0].from, 0.1);
    await page.locator('[data-action="off"]').click();
    await page.locator("#action-start").fill("0");
    await page.locator("#action-start").press("Enter");
    a = await actions(page);
    assert.ok(a[1].from >= a[0].to - 1e-9);
    await page.evaluate(() => {
      delete motionPreview.scene.retime;
    });
    await page.locator("#zoom").fill("2");
    await page.locator("#zoom").dispatchEvent("input");
    await page.locator('[data-action="on"]').click();
    assert.equal(await page.locator("#action-timing").isVisible(), false);
    assert.equal(await page.locator(".resize-handle").count(), 0);
    await page.locator("#next").click();
    assert.ok(await page.evaluate(() => motionPreview.time > 0));
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    await server.close();
  }
});
test("retimed adapters render the same source pose, pass random seek and export at 60 fps", async () => {
  for (const name of ["cards", "toggle"]) {
    const manifestPath = path.join(
        root,
        "projects",
        name,
        "motion.project.json",
      ),
      project = JSON.parse(await fs.readFile(manifestPath)),
      id = name === "cards" ? "open" : "on";
    const config = {
      timeline: { actions: { [id]: { from: 1, duration: 1.5 } } },
    };
    let original = await createSession({ root, manifestPath, project }),
      retimed;
    try {
      const a = original.timeline.actions[0],
        sourceAt = a.from + (a.to - a.from) * 0.5,
        first = await original.frame(sourceAt, { audit: true });
      await original.close();
      original = null;
      retimed = await createSession({ root, manifestPath, project, config });
      const second = await retimed.frame(1.75, { audit: true });
      if (!equalPixels(first, second)) {
        await fs.mkdir(path.join(root, "artifacts/timing-v1"), {
          recursive: true,
        });
        await fs.writeFile(
          path.join(root, "artifacts/timing-v1", name + "-source-failed.png"),
          first,
        );
        await fs.writeFile(
          path.join(root, "artifacts/timing-v1", name + "-retimed-failed.png"),
          second,
        );
      }
      assert.ok(equalPixels(first, second), name + " same pose");
      await checkSession(
        retimed,
        project,
        path.join(root, "artifacts/timing-v1", name),
      );
      const out = path.join(root, "artifacts/timing-v1", name + "-action.mp4");
      await encodeVideo(
        retimed,
        out,
        exportRange(retimed.timeline, { action: id }),
        { replace: true },
      );
      assert.equal((await decodeVideo(out)).frames, 90);
      assert.equal(retimed.timeline.fps, 60);
    } finally {
      await original?.close();
      await retimed?.close();
    }
  }
});
