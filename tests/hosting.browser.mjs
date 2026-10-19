import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";
import { startServer } from "../exporter/server.mjs";
const root = fileURLToPath(new URL("../", import.meta.url));
test("static editor runs at a subdirectory with and without trailing slash", async () => {
  execFileSync(process.execPath, ["tools/build.mjs", "--base", "/editor/"], {
    cwd: root,
  });
  await fs.mkdir(path.join(root, "artifacts"), { recursive: true });
  const site = await fs.mkdtemp(path.join(root, "artifacts/hosting-"));
  await fs.cp(path.join(root, "dist"), path.join(site, "editor"), {
    recursive: true,
  });
  const server = await startServer(site),
    browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.status() >= 400) errors.push(`${r.status()}: ${r.url()}`);
    });
    for (const pathname of ["/editor", "/editor/"]) {
      await page.goto(server.url + pathname);
      await page.waitForFunction(
        () => motionPreview.scene?.ready && !motionPreview.busy,
      );
      assert.equal(
        await page.evaluate(() => motionPreview.project.name),
        "cards-details",
      );
      await page.locator('[data-action="open"]').click();
      await page.locator("#action-duration").fill("1.1");
      await page.locator("#action-duration").press("Enter");
      const downloading = page.waitForEvent("download");
      await page.locator("#save").click();
      const downloaded = await downloading;
      const config = JSON.parse(
        await fs.readFile(await downloaded.path(), "utf8"),
      );
      assert.equal(config.project, "./projects/cards/motion.project.json");
      await page.reload();
      await page.waitForFunction(
        () => motionPreview.scene?.ready && !motionPreview.busy,
      );
      assert.ok(
        Math.abs(
          (await page.evaluate(() => {
            const a = motionPreview.scene.timeline.actions[0];
            return a.to - a.from;
          })) - 1.1,
        ) < 1e-8,
      );
    }
    await page.selectOption("#project", { label: "Переключатель" });
    await page.waitForFunction(
      () =>
        motionPreview.scene?.ready &&
        !motionPreview.busy &&
        motionPreview.project.name === "focus-toggle",
    );
    await page.locator("#play").click();
    await page.locator("#play").click();
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    await server.close();
    await fs.rm(site, { recursive: true, force: true });
  }
});
