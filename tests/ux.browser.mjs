import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";
import { startServer } from "../exporter/server.mjs";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const ready = (page) =>
  page.waitForFunction(() => motionPreview.scene?.ready && !motionPreview.busy);
async function fixture(run) {
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
    await run(page, server);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    await server.close();
  }
}
test("drafts survive tabs, project switches and refresh; save applies all fields", () =>
  fixture(async (page) => {
    await page.getByRole("tab", { name: "Текст", exact: true }).click();
    await page.locator('[data-path="content.title"]').fill("Новый заголовок");
    await page.getByRole("tab", { name: "Tap", exact: true }).click();
    await page.locator('[data-path="tokens.tapIndicator.diameter"]').fill("44");
    await page.getByRole("tab", { name: "Текст", exact: true }).click();
    assert.equal(
      await page.locator('[data-path="content.title"]').inputValue(),
      "Новый заголовок",
    );
    await page.selectOption("#project", { label: "Переключатель" });
    await page.waitForFunction(
      () => motionPreview.project.name === "focus-toggle",
    );
    await ready(page);
    await page.selectOption("#project", { label: "Карточка и детали" });
    await page.waitForFunction(
      () => motionPreview.project.name === "cards-details",
    );
    await ready(page);
    assert.equal(
      await page.locator('[data-path="content.title"]').inputValue(),
      "Новый заголовок",
    );
    await page.reload();
    await ready(page);
    assert.equal(
      await page.locator('[data-path="content.title"]').inputValue(),
      "Новый заголовок",
    );
    const event = page.waitForEvent("download");
    await page.locator("#save").click();
    const download = await event;
    const json = JSON.parse(await fs.readFile(await download.path(), "utf8"));
    assert.equal(json.config.content.title, "Новый заголовок");
    assert.equal(json.config.tokens.tapIndicator.diameter, 44);
    assert.equal(
      await page.evaluate(() => motionPreview.scene.parameters.content.title),
      "Новый заголовок",
    );
    assert.equal(await page.locator(".apply").isDisabled(), true);
    await page.locator("#reset").click();
    await page.waitForFunction(
      () => motionPreview.scene.parameters.content.title === "Проект",
    );
    assert.equal(await page.locator("#reset").isDisabled(), true);
  }));
test("invalid fields/imports preserve working project and dialog keyboard does not play", () =>
  fixture(async (page) => {
    await page.getByRole("tab", { name: "Tap", exact: true }).click();
    assert.ok(
      Math.abs(
        Number(
          await page
            .locator('[data-path="tokens.tapIndicator.alpha"]')
            .inputValue(),
        ) -
          61 / 255,
      ) < 1e-10,
    );
    await page.locator('[data-path="tokens.tapIndicator.diameter"]').fill("-1");
    await page.locator(".apply").click();
    assert.equal(
      await page.evaluate(
        () => motionPreview.scene.parameters.tokens.tapIndicator.diameter,
      ),
      80,
    );
    assert.equal(
      await page
        .locator('[data-path="tokens.tapIndicator.diameter"]')
        .evaluate((el) => el.checkValidity()),
      false,
    );
    await page.locator('[data-path="tokens.tapIndicator.diameter"]').fill("36");
    await page.locator(".apply").click();
    await ready(page);
    assert.equal(
      await page.evaluate(
        () => motionPreview.config.tokens.tapIndicator.diameter,
      ),
      36,
    );
    await page.locator("#connect").focus();
    await page.keyboard.press("Space");
    assert.ok(await page.locator("#project-dialog").isVisible());
    assert.equal(
      await page.locator("#play").getAttribute("aria-label"),
      "Играть",
    );
    await page.locator("#project-url").fill("/missing.json");
    await page.locator("#open-project").click();
    await page.waitForFunction(() =>
      document.querySelector("#project-error").textContent.includes("404"),
    );
    assert.match(await page.locator("#project-error").textContent(), /404/);
    assert.equal(
      await page.evaluate(() => motionPreview.project.name),
      "cards-details",
    );
    await page.locator("#project-file").setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          schema: 1,
          project: "/projects/toggle/motion.project.json",
          config: { unknown: true },
        }),
      ),
    });
    await page.waitForFunction(() =>
      document.querySelector("#project-error").textContent.includes("unknown"),
    );
    assert.equal(
      await page.evaluate(() => motionPreview.project.name),
      "cards-details",
    );
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#project-dialog").isVisible(), false);
    await page.getByRole("tab", { name: "Движение", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(
      await page
        .getByRole("tab", { name: "Текст", exact: true })
        .getAttribute("aria-selected"),
      "true",
    );
    await page.locator("#connect").click();
    await page.locator("#project-file").setInputFiles({
      name: "good.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          schema: 1,
          project: "/projects/toggle/motion.project.json",
          config: { content: { title: "Imported" } },
        }),
      ),
    });
    await page.waitForFunction(
      () => motionPreview.scene.parameters.content.title === "Imported",
    );
    assert.equal(await page.locator("#project-dialog").isVisible(), false);
  }));
test("320px and 200% layouts keep controls reachable, zoom and keyboard seeking work", () =>
  fixture(async (page) => {
    await page.locator("#zoom").fill("4");
    await page.locator("#zoom").dispatchEvent("input");
    await page.locator("#playhead").focus();
    await page.keyboard.press("End");
    assert.ok(
      await page
        .locator(".timeline-scroll")
        .evaluate((el) => el.scrollLeft > 0),
    );
    await page.keyboard.press("Home");
    assert.equal(await page.evaluate(() => motionPreview.time), 0);
    for (const size of [
      { width: 320, height: 700 },
      { width: 640, height: 450 },
    ]) {
      await page.setViewportSize(size);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      for (const id of [
        "project",
        "connect",
        "save",
        "play",
        "next",
        "previous",
        "all",
        "repeat",
        "speed",
        "zoom",
      ]) {
        const b = await page.locator("#" + id).boundingBox();
        assert.ok(
          b &&
            b.x >= 0 &&
            b.x + b.width <= size.width + 1 &&
            b.y >= 0 &&
            b.y + b.height <= size.height + 1,
          `${id} outside ${size.width}px`,
        );
      }
    }
    await page.setViewportSize({ width: 320, height: 700 });
    await page.locator("#settings").click();
    assert.ok(await page.locator("#inspector-close").isVisible());
    await page.keyboard.press("Escape");
    assert.equal(
      await page.locator("#settings").getAttribute("aria-expanded"),
      "false",
    );
    await fs.mkdir(root + "artifacts/editor", { recursive: true });
    await page.screenshot({ path: root + "artifacts/editor/320.png" });
  }));
