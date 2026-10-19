import { PNG } from "pngjs";
import fs from "node:fs/promises";
import path from "node:path";
export function equalPixels(a, b) {
  const x = PNG.sync.read(a),
    y = PNG.sync.read(b);
  return x.width === y.width && x.height === y.height && x.data.equals(y.data);
}
export async function checkSession(session, project, out) {
  const tl = session.timeline,
    times = [
      0,
      tl.last,
      ...tl.actions.slice(1).map((a, i) => (tl.actions[i].to + a.from) / 2),
      ...tl.actions.flatMap((a) => [
        a.from,
        (a.from + a.to) / 2,
        a.to - 1 / 60,
        a.to,
        a.to + 1 / 60,
      ]),
    ].map((t) => Math.max(0, Math.min(tl.last, t)));
  await fs.mkdir(out, { recursive: true });
  for (const [i, t] of [...new Set(times)].sort((a, b) => a - b).entries())
    await fs.writeFile(
      path.join(out, `${String(i).padStart(2, "0")}-${t.toFixed(3)}.png`),
      await session.frame(t, { audit: true }),
    );
  const seeks = [];
  // Reproducible dispersed A→B→A cases, including movement and static states.
  for (const a of [
    ...new Set([
      ...times,
      ...[0.173, 0.247, 0.509, 0.771, 0.917].map((f) => tl.last * f),
    ]),
  ]) {
    const b = tl.last - a;
    const first = await session.frame(a, { audit: true });
    await session.frame(b, { audit: true });
    const second = await session.frame(a, { audit: true });
    const exact = equalPixels(first, second);
    if (!exact) {
      await fs.writeFile(
        path.join(out, `seek-${a.toFixed(6)}-first.png`),
        first,
      );
      await fs.writeFile(
        path.join(out, `seek-${a.toFixed(6)}-return.png`),
        second,
      );
    }
    seeks.push({ a, b, exact });
  }
  const invariants = { deterministicSeek: seeks.every((x) => x.exact) };
  if (project.loop)
    invariants.seamlessLoop = equalPixels(
      await session.frame(0, { audit: true }),
      await session.frame(tl.last, { audit: true }),
    );
  const inspect = await session.page.evaluate(() => motionScene.inspect());
  for (const [name, ok] of Object.entries(inspect.invariants || {})) {
    if (typeof ok !== "boolean")
      throw Error(`inspect.invariants.${name}: expected boolean`);
    invariants[name] = ok;
  }
  const report = {
    timeline: tl,
    invariants,
    seeks,
    inspect,
    errors: session.errors,
    metrics: session.metrics,
  };
  await fs.writeFile(
    path.join(out, "report.json"),
    JSON.stringify(report, null, 2),
  );
  if (session.errors.length || Object.values(invariants).some((v) => !v))
    throw Error(`Scene check failed; see ${out}/report.json`);
  return report;
}
