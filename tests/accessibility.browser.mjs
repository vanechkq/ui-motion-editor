import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { startServer } from "../exporter/server.mjs";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
test("editor WCAG 2 AA automated checks on desktop, dialog and mobile inspector", async () => {
  const server = await startServer(root),
    browser = await chromium.launch({ headless: true }),
    reports = [];
  try {
    const context = await browser.newContext({
        viewport: { width: 1280, height: 900 },
      }),
      page = await context.newPage();
    await page.goto(server.url);
    await page.waitForFunction(
      () => motionPreview.scene?.ready && !motionPreview.busy,
    );
    const audit = async (name) => {
      const result = await new AxeBuilder({ page })
        .exclude("iframe")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      reports.push({ name, violations: result.violations });
    };
    await audit("desktop");
    await page.locator('[data-action="open"]').click();
    await audit("selected-action-timing");
    await page.locator("#connect").click();
    await audit("project-dialog");
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 390, height: 760 });
    await page.locator('[data-action="open"]').click();
    await page.locator("#settings").click();
    await page.getByRole("tab", { name: "Tap", exact: true }).click();
    await audit("mobile-inspector");
    await fs.mkdir(root + "artifacts/editor", { recursive: true });
    await fs.writeFile(
      root + "artifacts/editor/accessibility.json",
      JSON.stringify(reports, null, 2),
    );
    assert.deepEqual(
      reports.flatMap((r) =>
        r.violations.map((v) => ({
          state: r.name,
          id: v.id,
          nodes: v.nodes.map((n) => ({
            target: n.target,
            summary: n.failureSummary,
          })),
        })),
      ),
      [],
    );
  } finally {
    await browser.close();
    await server.close();
  }
});
