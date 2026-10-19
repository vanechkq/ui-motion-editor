import { chromium } from "playwright";
import { startServer } from "./server.mjs";
import { FrameCache, digest, hash } from "./cache.mjs";
import path from "node:path";
import { validateTimeline } from "../core/validation.mjs";
export async function createSession({
  root,
  manifestPath,
  project,
  config = {},
  scale = 1,
  fresh = false,
}) {
  const server = await startServer(root);
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      ...(process.env.MOTION_CHROME
        ? { executablePath: process.env.MOTION_CHROME }
        : {}),
    });
    const page = await browser.newPage({
      viewport: {
        width: project.composition.width,
        height: project.composition.height,
      },
      deviceScaleFactor: scale,
    });
    const errors = [],
      resources = new Map(),
      pending = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.route("**/*", async (route) => {
      const u = new URL(route.request().url());
      if (["data:", "blob:"].includes(u.protocol) || u.origin === server.url)
        return route.continue();
      errors.push(`External resource is not reproducible: ${u.href}`);
      return route.abort();
    });
    page.on("response", (response) => {
      if (response.status() >= 400)
        errors.push(`${response.status()}: ${response.url()}`);
      pending.push(
        response
          .body()
          .then((bytes) =>
            resources.set(new URL(response.url()).pathname, hash(bytes)),
          )
          .catch((e) => errors.push(e.message)),
      );
    });
    const relative = path
      .relative(root, path.resolve(path.dirname(manifestPath), project.scene))
      .split(path.sep)
      .join("/");
    const url = new URL(relative, server.url + "/");
    url.searchParams.set("config", JSON.stringify(config));
    await page.goto(url.href);
    await page.waitForFunction(() => window.motionScene?.ready, null, {
      timeout: 15000,
    });
    await page.evaluate(async () => {
      await document.fonts.ready;
      // Commit initial compositor layers before the first arbitrary seek.
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
    });
    await Promise.all(pending);
    const { timeline, cacheInputs } = await page.evaluate(() => ({
      timeline: motionScene.timeline,
      cacheInputs: motionScene.cacheInputs,
    }));
    validateTimeline(timeline);
    if (errors.length) throw Error(errors.join("\n"));
    const dependencies = [...resources.entries()].sort();
    const fingerprint = digest({
      version: 1,
      dependencies,
      config: cacheInputs ?? config,
      composition: project.composition,
      scale,
      browser: browser.version(),
      platform: process.platform,
      arch: process.arch,
    });
    const cache = new FrameCache(path.join(root, ".cache/frames"), fingerprint),
      metrics = { frames: 0, captures: 0, hits: 0, seekMs: 0, screenshotMs: 0 };
    return {
      page,
      timeline,
      metrics,
      dependencies,
      fingerprint,
      errors,
      browserVersion: browser.version(),
      async frame(time, { audit = false } = {}) {
        metrics.frames++;
        const pose = await page.evaluate((t) => motionScene.sample?.(t), time);
        // Without an explicit visualKey every instant gets its own key.
        const key = pose?.visualKey ?? { time };
        if (!fresh && !audit) {
          const cached = await cache.get(key);
          if (cached) {
            metrics.hits++;
            return cached;
          }
        }
        let started = performance.now();
        await page.evaluate((t) => motionScene.seek(t), time);
        metrics.seekMs += performance.now() - started;
        started = performance.now();
        const bytes = await page.screenshot({
          type: "png",
          animations: "allow",
        });
        metrics.screenshotMs += performance.now() - started;
        metrics.captures++;
        if (!audit) await cache.put(key, bytes);
        return bytes;
      },
      async close() {
        await browser.close();
        await server.close();
      },
    };
  } catch (error) {
    await browser?.close();
    await server.close();
    throw error;
  }
}
