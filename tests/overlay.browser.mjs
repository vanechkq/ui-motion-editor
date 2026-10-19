import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { PNG } from "pngjs";
import { startServer } from "../exporter/server.mjs";
const root = fileURLToPath(new URL("../", import.meta.url));
test("last track has bottom clearance and mobile inspector follows timeline", async () => {
  const server = await startServer(root),
    browser = await chromium.launch({ headless: true }),
    report = [];
  try {
    const page = await browser.newPage();
    await page.goto(server.url);
    await page.waitForFunction(
      () => motionPreview.scene?.ready && !motionPreview.busy,
    );
    for (const width of [320, 520, 820, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const m = await page.evaluate(() => ({
        width: innerWidth,
        gap:
          innerHeight -
          document.querySelector("#actions").getBoundingClientRect().bottom,
        trackBottom: document.querySelector("#actions").getBoundingClientRect()
          .bottom,
        timelineTop: document.querySelector(".timeline").getBoundingClientRect()
          .top,
        viewportHeight: innerHeight,
      }));
      assert.ok(m.gap >= 32, `${width}: ${m.gap}`);
      report.push(m);
      if (width < 610) {
        await page.locator("#settings").click();
        const bottom = await page
          .locator(".panel")
          .evaluate((e) => e.getBoundingClientRect().bottom);
        assert.ok(Math.abs(bottom - m.timelineTop) < 1);
        await page.keyboard.press("Escape");
      }
    }
    await fs.mkdir(path.join(root, "artifacts/timing-v1"), { recursive: true });
    await fs.writeFile(
      path.join(root, "artifacts/timing-v1/clearance.json"),
      JSON.stringify(report, null, 2),
    );
  } finally {
    await browser.close();
    await server.close();
  }
});
test("Tap remains above a persistent top overlay even when reusing a nested node", async () => {
  const server = await startServer(root),
    browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 640, height: 480 },
    });
    await page.goto(server.url + "/projects/cards/index.html");
    await page.waitForFunction(() => window.motionScene?.ready);
    const topology = await page.evaluate(async () => {
      const { createTapIndicator } = await import("../../engine/tap.mjs"),
        { resolveTokens } = await import("../../engine/tokens.mjs"),
        stage = document.querySelector(".stage"),
        band = document.createElement("div"),
        element = document.createElement("div");
      Object.assign(band.style, {
        position: "absolute",
        left: "0",
        top: "0",
        width: "100%",
        height: "52px",
        background: "white",
        zIndex: "40",
      });
      stage.append(band);
      document.querySelector(".feed").append(element);
      const tokens = resolveTokens().tapIndicator;
      Object.assign(tokens, {
        diameter: 80,
        color: "#ff0000",
        alpha: 1,
        blur: 0,
        scale: [1, 1, 1, 1],
      });
      const tap = createTapIndicator({ parent: stage, element, tokens });
      tap.render({ time: 0.25, start: 0, x: 50, y: 40 });
      return {
        root: element.parentElement === stage,
        z: +getComputedStyle(element).zIndex,
        overlayZ: +getComputedStyle(band).zIndex,
        willChange: element.style.willChange,
      };
    });
    assert.equal(topology.root, true);
    assert.ok(topology.z > topology.overlayZ);
    assert.ok(topology.willChange.includes("transform"));
    const bytes = await page.screenshot(),
      png = PNG.sync.read(bytes);
    for (const y of [30, 40, 50, 55]) {
      const i = (y * png.width + 82) * 4;
      assert.deepEqual(
        [...png.data.slice(i, i + 3)],
        [255, 0, 0],
        `ring at y=${y}`,
      );
    }
    await fs.mkdir(path.join(root, "artifacts/timing-v1"), { recursive: true });
    await fs.writeFile(
      path.join(root, "artifacts/timing-v1/tap-overlay.png"),
      bytes,
    );
  } finally {
    await browser.close();
    await server.close();
  }
});
