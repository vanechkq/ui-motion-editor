import { validateTimeline } from "../../core/validation.mjs";
import { compile, sample } from "./timeline.mjs";
import { spring, mix } from "../../engine/presets.mjs";
import { createTapIndicator } from "../../engine/tap.mjs";
import { sceneLayers } from "../../engine/components.mjs";
import { publishScene } from "../../core/scene.mjs";
const config = JSON.parse(
    new URLSearchParams(location.search).get("config") || "{}",
  ),
  content = { title: "Focus time", ...config.content };
let timeline = compile(config);
const $ = (s) => document.querySelector(s),
  target = $(".switch"),
  thumb = $(".thumb"),
  tap = createTapIndicator({
    parent: $(".stage"),
    tokens: timeline.tokens.tapIndicator,
  });
$("h1").textContent = content.title;
function seek(time) {
  const pose = sample(time, timeline),
    m = timeline.motion.slide;
  const e =
    pose.phase === "enter"
      ? spring(pose.u, m.duration, m.omega, m.zeta)
      : pose.phase === "exit"
        ? 1 - spring(pose.u, m.duration, m.omega, m.zeta)
        : pose.phase === "active"
          ? 1
          : 0;
  target.style.transform = "";
  tap.hide();
  thumb.style.transform = `translateX(${26 * e}px)`;
  target.style.background = `rgb(${mix(221, 38, e)},${mix(221, 38, e)},${mix(221, 38, e)})`;
  $(".status").textContent = e > 0.5 ? "On" : "Off";
  if (pose.tap)
    tap.render({
      time: pose.time,
      start: pose.tap.start,
      x: 276,
      y: 288,
      target,
    });
  return pose;
}
await document.fonts.ready;
publishScene({
  ready: true,
  timeline,
  retime(edits) {
    const nextConfig = { ...config, timeline: structuredClone(edits) };
    const next = validateTimeline(compile(nextConfig));
    config.timeline = nextConfig.timeline;
    timeline = next;
    this.timeline = next;
    return next;
  },
  parameters: {
    hold: timeline.hold,
    motion: timeline.motion,
    tokens: timeline.tokens,
    content,
  },
  cacheInputs: { content, tokens: timeline.tokens },
  layers: sceneLayers({
    surface: $(".surface"),
    toggle: target,
    tap: tap.element,
  }),
  sample: (t) => sample(t, timeline),
  seek,
  inspect: () => ({
    invariants: { oneThumb: document.querySelectorAll(".thumb").length === 1 },
    vectorSources: true,
  }),
});
