import { validateTimeline } from "../../core/validation.mjs";
import { publishScene } from "../../core/scene.mjs";
import { compile, sample } from "./timeline.mjs";
import { spring, mix } from "../../engine/presets.mjs";
import { createTapIndicator } from "../../engine/tap.mjs";
import { sceneLayers } from "../../engine/components.mjs";
const overrides = JSON.parse(
  new URLSearchParams(location.search).get("config") || "{}",
);
let timeline = compile(overrides);
const $ = (s) => document.querySelector(s),
  tap = createTapIndicator({
    parent: $(".stage"),
    tokens: timeline.tokens.tapIndicator,
  }),
  content = { title: "Проект", ...overrides.content };
for (const e of document.querySelectorAll("h1:first-of-type"))
  if (e.parentElement !== $(".second")) e.textContent = content.title;
const card = $(".card"),
  detail = $(".detail"),
  close = $(".close"),
  feed = $(".feed"),
  start = { x: 44, y: 105, w: 267, h: 270 };
function seek(t) {
  const s = sample(t, timeline);
  tap.hide();
  card.style.transform = "";
  close.style.transform = "";
  const e =
    s.phase === "open"
      ? spring(
          s.u,
          timeline.motion.open.duration,
          timeline.motion.open.omega,
          timeline.motion.open.zeta,
        )
      : s.phase === "close"
        ? 1 -
          spring(
            s.u,
            timeline.motion.close.duration,
            timeline.motion.close.omega,
            timeline.motion.close.zeta,
          )
        : s.phase === "details"
          ? 1
          : 0;
  const reveal = Math.max(0, Math.min(1, e));
  detail.style.visibility = e > 0 ? "visible" : "hidden";
  detail.style.clipPath = `inset(${mix(start.y, 0, reveal)}px ${mix(640 - start.x - start.w, 0, reveal)}px ${mix(480 - start.y - start.h, 0, reveal)}px ${mix(start.x, 0, reveal)}px round ${mix(20, 0, reveal)}px)`;
  feed.style.transform = `scale(${mix(1, 0.97, e)})`;
  detail.querySelector("h1").style.transform = `translateY(${mix(25, 0, e)}px)`;
  if (s.tap) {
    const opened = s.tap.id === "open";
    tap.render({
      time: s.time,
      start: s.tap.start,
      x: opened ? 177.5 : 592,
      y: opened ? 240 : 42,
      target: opened ? card : close,
      pressScale: 0.95,
    });
  }
  return s;
}
await document.fonts.ready;
publishScene({
  ready: true,
  timeline,
  retime(edits) {
    const nextConfig = { ...overrides, timeline: structuredClone(edits) };
    const next = validateTimeline(compile(nextConfig));
    overrides.timeline = nextConfig.timeline;
    timeline = next;
    this.timeline = next;
    return next;
  },
  sample: (t) => sample(t, timeline),
  parameters: {
    hold: timeline.hold,
    motion: timeline.motion,
    tokens: timeline.tokens,
    content,
  },
  cacheInputs: { content, tokens: timeline.tokens },
  layers: sceneLayers({ feed, detail, shared: $(".shared"), tap: tap.element }),
  content,
  seek,
  inspect: () => ({
    vectorSources: true,
    tapDiameter: tap.tokens.diameter,
    composition: [640, 480],
  }),
});
