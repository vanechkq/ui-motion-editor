import { test } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startServer } from "../exporter/server.mjs";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
const root = fileURLToPath(new URL("../", import.meta.url));
test("editor connects projects, applies variables, drags, loops, saves and shows mobile inspector", async () => {
  const server = await startServer(root),
    browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
        viewport: { width: 1280, height: 900 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(server.url);
    await page.waitForFunction(() => window.motionPreview?.scene?.ready);
    assert.equal(
      await page.evaluate(() => motionPreview.project.name),
      "cards-details",
    );
    await page.getByRole("tab", { name: "Tap", exact: true }).click();
    await page.locator('[data-path="tokens.tapIndicator.diameter"]').fill("36");
    await page.locator('[data-path="tokens.tapIndicator.press"]').fill("0.3");
    await page.getByRole("button", { name: "Применить" }).click();
    await page.waitForFunction(
      () => motionPreview.scene?.parameters.tokens.tapIndicator.diameter === 36,
    );
    assert.ok(
      Math.abs(
        (await page.evaluate(() => motionPreview.scene.timeline.cuts.open)) -
          1.05,
      ) < 1e-9,
    );
    await page.getByRole("button", { name: "Следующий кадр" }).click();
    assert.ok(await page.evaluate(() => motionPreview.time > 0));
    await page.locator('[data-action="open"]').click();
    await page.getByRole("button", { name: "Играть", exact: true }).click();
    assert.equal(
      await page.evaluate(() => motionPreview.selectedAction),
      "open",
    );
    await page.getByRole("button", { name: "Пауза", exact: true }).click();
    await page.getByRole("button", { name: "Следующий кадр" }).click();
    await page.selectOption("#speed", ".5");
    await page.locator('[data-path="tokens.tapIndicator.diameter"]').click();
    assert.equal(
      await page.evaluate(() => motionPreview.selectedAction),
      "open",
    );
    await page.selectOption("#speed", "1");
    await page.locator('[data-action="close"]').click();
    assert.equal(
      await page.evaluate(() => motionPreview.selectedAction),
      "close",
    );
    await page.locator(".viewer").click({ position: { x: 5, y: 5 } });
    assert.equal(await page.evaluate(() => motionPreview.selectedAction), "");
    assert.equal(
      await page.locator("#all").getAttribute("aria-pressed"),
      "true",
    );
    await page.locator('[data-action="open"]').click();
    const ruler = await page.locator("#hit-zone").boundingBox();
    await page.mouse.move(ruler.x + 100, ruler.y + 10);
    await page.mouse.down();
    await page.mouse.move(ruler.x + 200, ruler.y + 10);
    await page.mouse.up();
    assert.equal(await page.evaluate(() => motionPreview.selectedAction), "");
    assert.ok(await page.evaluate(() => motionPreview.time > 0.3));
    await page.selectOption("#project", { label: "Переключатель" });
    await page.waitForFunction(
      () =>
        motionPreview.project.name === "focus-toggle" &&
        motionPreview.scene?.ready,
    );
    assert.equal(
      await page.evaluate(() => motionPreview.project.composition.width),
      360,
    );
    await page.selectOption("#project", { label: "Карточка и детали" });
    await page.waitForFunction(
      () =>
        motionPreview.project.name === "cards-details" &&
        motionPreview.scene?.ready,
    );
    assert.equal(
      await page.evaluate(
        () => motionPreview.config.tokens.tapIndicator.diameter,
      ),
      36,
    );
    await page.evaluate(() =>
      motionPreview.seek(motionPreview.scene.timeline.last - 0.02),
    );
    await page.getByRole("button", { name: "Играть", exact: true }).click();
    await page.waitForTimeout(200);
    await page.getByRole("button", { name: "Пауза", exact: true }).click();
    assert.ok(await page.evaluate(() => motionPreview.time < 0.5));
    const downloaded = page.waitForEvent("download");
    await page.getByRole("button", { name: "Сохранить", exact: true }).click();
    const download = await downloaded;
    const config = JSON.parse(await fs.readFile(await download.path(), "utf8"));
    assert.equal(config.project, "/projects/cards/motion.project.json");
    assert.equal(config.schema, 1);
    await page.setViewportSize({ width: 390, height: 760 });
    await page.getByRole("button", { name: "Параметры", exact: true }).click();
    assert.ok(await page.locator("#inspector").isVisible());
    await fs.mkdir(root + "artifacts/editor", { recursive: true });
    await page.screenshot({ path: root + "artifacts/editor/mobile.png" });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: root + "artifacts/editor/desktop.png" });
    await page.evaluate(async () => {
      try {
        await motionPreview.openProject("/missing.json");
      } catch (e) {
        window.testError = e.message;
      }
    });
    assert.match(await page.evaluate(() => testError), /404/);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    await server.close();
  }
});
