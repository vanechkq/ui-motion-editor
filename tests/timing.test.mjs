import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  retimeTimeline,
  sourceTime,
  editActionTiming,
} from "../engine/action-timing.mjs";
import { validateConfig } from "../core/validation.mjs";
import * as cards from "../projects/cards/timeline.mjs";
import * as toggle from "../projects/toggle/timeline.mjs";
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
const base = {
  fps: 60,
  duration: 6,
  last: 6 - 1 / 60,
  actions: [
    { id: "a", from: 1, to: 2 },
    { id: "b", from: 4, to: 5 },
  ],
  cuts: { start: 1, end: 2 },
  events: [{ time: 1.5 }],
  tracks: [
    {
      id: "screen",
      clips: [
        { name: "A", from: 0, to: 3 },
        { name: "B", from: 3, to: 6 },
      ],
    },
  ],
};
test("no edits preserve default timing and continuous sampling in both examples", () => {
  assert.equal(retimeTimeline(base, {}), base);
  near(cards.compile().duration, 4.2);
  near(toggle.compile().duration, 3.65);
  for (const api of [cards, toggle]) {
    const original = api.compile(),
      id = original.actions[0].id,
      retimed = api.compile({
        timeline: { actions: { [id]: { from: 1, duration: 1.5 } } },
      });
    assert.equal(original.sourceTimeline, undefined);
    for (const u of [0.1, 0.4, 0.6, 0.9]) {
      const a = retimed.actions[0],
        t = a.from + (a.to - a.from) * u,
        source = sourceTime(t, retimed),
        expected = api.sample(source, original),
        actual = api.sample(t, retimed);
      near(actual.time, expected.time);
      near(actual.u, expected.u);
      assert.equal(actual.phase, expected.phase);
      assert.equal(actual.visualKey, expected.visualKey);
      near(actual.actualTime, t);
    }
  }
});
test("move preserves duration, ripple gaps and input objects", () => {
  const before = structuredClone(base),
    edits = editActionTiming(base, {}, "a", 1.5, 1),
    tl = retimeTimeline(base, edits);
  assert.deepEqual(base, before);
  near(tl.actions[0].from, 1.5);
  near(tl.actions[0].to, 2.5);
  near(tl.actions[1].from, 4.5);
  near(tl.actions[1].from - tl.actions[0].to, 2);
  near(tl.duration, 6.5);
  near(sourceTime(1.75, tl), 1.25);
});
test("stretch maps all internal phases continuously and updates cuts/tracks/events", () => {
  const tl = retimeTimeline(base, editActionTiming(base, {}, "a", 1, 2));
  near(sourceTime(1, tl), 1);
  near(sourceTime(2, tl), 1.5);
  near(sourceTime(3, tl), 2);
  near(tl.cuts.end, 3);
  near(tl.events[0].time, 2);
  near(tl.tracks[0].clips[0].to, 4);
  near(tl.actions[1].from, 5);
  for (const boundary of [1, 3, 5, 6])
    assert.ok(
      Math.abs(
        sourceTime(boundary - 1e-7, tl) - sourceTime(boundary + 1e-7, tl),
      ) < 2.01e-7,
    );
});
test("frame snapping, minimum and previous-action constraints", () => {
  const moved = retimeTimeline(
    base,
    editActionTiming(base, {}, "b", 0.1, 0.001),
  );
  near(moved.actions[1].from, 2);
  near(moved.actions[1].to - moved.actions[1].from, 2 / 60);
  const tl = retimeTimeline(base, {
    actions: { a: { from: 1.009, duration: 0.802 } },
  });
  near(tl.actions[0].from * 60, 61);
  near((tl.actions[0].to - tl.actions[0].from) * 60, 48);
  assert.throws(
    () => retimeTimeline(base, { actions: { unknown: { from: 1 } } }),
    /unknown action/,
  );
  assert.throws(
    () => retimeTimeline(base, { actions: { a: { duration: 3600 } } }),
    /3600/,
  );
  assert.throws(() => editActionTiming(base, {}, "a", NaN, 1), /finite/);
});
test("config accepts timing data and rejects malformed values/fields", async () => {
  const manifest = JSON.parse(
    await fs.readFile(
      new URL("../projects/cards/motion.project.json", import.meta.url),
    ),
  );
  assert.doesNotThrow(() =>
    validateConfig(
      { timeline: { actions: { open: { from: 1, duration: 1.5 } } } },
      manifest,
    ),
  );
  for (const timeline of [
    { actions: [] },
    { actions: { open: { duration: 0 } } },
    { actions: { open: { from: -1 } } },
    { actions: { open: { duration: 1, foo: true } } },
    { foo: {} },
  ])
    assert.throws(() => validateConfig({ timeline }, manifest), /timeline/);
});
