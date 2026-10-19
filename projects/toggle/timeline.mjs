import { retimeTimeline, sourceTime } from "../../engine/action-timing.mjs";
import { resolveTokens } from "../../engine/tokens.mjs";
function compileBase(config = {}) {
  const tokens = resolveTokens(config.tokens),
    hold = { active: 1, ...config.hold },
    motion = {
      slide: { omega: 28, zeta: 0.86, duration: 0.42 },
      ...config.motion,
    };
  const press = tokens.tapIndicator.enter + tokens.tapIndicator.press,
    on = 0.5 + press,
    onEnd = on + motion.slide.duration,
    off = onEnd + hold.active + press,
    offEnd = off + motion.slide.duration,
    duration = Math.ceil((offEnd + 0.6) * 60) / 60;
  return {
    fps: 60,
    duration,
    last: duration - 1 / 60,
    tokens,
    hold,
    motion,
    cuts: { on, onEnd, off, offEnd },
    actions: [
      { id: "on", name: "Включить", from: 0.5, to: onEnd },
      { id: "off", name: "Выключить", from: off - press, to: offEnd },
    ],
    tracks: [
      {
        id: "state",
        clips: [
          { name: "Off", from: 0, to: on },
          { name: "Focus", from: on, to: off },
          { name: "Off", from: off, to: duration },
        ],
      },
    ],
  };
}
export function compile(config = {}) {
  return retimeTimeline(compileBase(config), config.timeline);
}
export function sample(time, tl) {
  const actualTime = Math.max(0, Math.min(tl.last, time));
  if (tl.sourceTimeline) {
    time = sourceTime(actualTime, tl);
    tl = tl.sourceTimeline;
  }
  const t = Math.max(0, Math.min(time, tl.last)),
    c = tl.cuts,
    phase =
      t < c.on
        ? "off"
        : t < c.onEnd
          ? "enter"
          : t < c.off
            ? "active"
            : t < c.offEnd
              ? "exit"
              : "off";
  const u =
    phase === "enter"
      ? (t - c.on) / tl.motion.slide.duration
      : phase === "exit"
        ? (t - c.off) / tl.motion.slide.duration
        : 0;
  const tap = tl.actions.find(
    (a) =>
      t >= a.from &&
      t <
        a.from +
          tl.tokens.tapIndicator.enter +
          tl.tokens.tapIndicator.press +
          tl.tokens.tapIndicator.release,
  );
  return {
    time: t,
    actualTime,
    phase,
    u,
    tap: tap ? { start: tap.from } : null,
    visualKey: JSON.stringify({
      phase,
      u: +u.toFixed(7),
      tap: tap ? +(t - tap.from).toFixed(7) : null,
      motion: tl.motion.slide,
    }),
  };
}
