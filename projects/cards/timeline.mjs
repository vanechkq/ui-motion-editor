import { retimeTimeline, sourceTime } from "../../engine/action-timing.mjs";
import { resolveTokens } from "../../engine/tokens.mjs";
function compileBase(overrides = {}) {
  const tokens = resolveTokens(overrides.tokens),
    hold = { details: 1.5, ...overrides.hold },
    motion = {
      open: { omega: 28, zeta: 0.86, duration: 0.42 },
      close: { omega: 29, zeta: 0.86, duration: 0.38 },
      ...overrides.motion,
    },
    press = tokens.tapIndicator.enter + tokens.tapIndicator.press,
    open = 0.6 + press,
    details = open + motion.open.duration,
    close = details + hold.details + press,
    home = close + motion.close.duration,
    duration = Math.ceil((home + 0.6) * 60) / 60,
    last = duration - 1 / 60,
    actions = [
      { id: "open", name: "Открыть", from: 0.6, to: details },
      { id: "close", name: "Закрыть", from: close - press, to: home },
    ],
    tracks = [
      {
        id: "screens",
        clips: [
          { name: "Карточки", from: 0, to: open },
          { name: "Детали", from: open, to: close },
          { name: "Карточки", from: close, to: duration },
        ],
      },
    ];
  return {
    fps: 60,
    hold,
    motion,
    tokens,
    duration,
    last,
    cuts: { open, details, close, home },
    actions,
    tracks,
    events: actions.map((a) => ({ name: a.id, time: a.from })),
    overrides,
  };
}
export function compile(config = {}) {
  return retimeTimeline(compileBase(config), config.timeline);
}
export function sample(t, tl) {
  const actualTime = Math.max(0, Math.min(tl.last, t));
  if (tl.sourceTimeline) {
    t = sourceTime(actualTime, tl);
    tl = tl.sourceTimeline;
  }
  t = Math.max(0, Math.min(tl.last, t));
  const c = tl.cuts,
    phase =
      t < c.open
        ? "home"
        : t < c.details
          ? "open"
          : t < c.close
            ? "details"
            : t < c.home
              ? "close"
              : "home",
    u =
      phase === "open"
        ? (t - c.open) / tl.motion.open.duration
        : phase === "close"
          ? (t - c.close) / tl.motion.close.duration
          : 0,
    tap = tl.actions.find(
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
    tap: tap ? { id: tap.id, start: tap.from } : null,
    visualKey: JSON.stringify({
      phase,
      u: +u.toFixed(7),
      tap: tap
        ? [tap.id, +(t - tap.from).toFixed(7), tl.tokens.tapIndicator]
        : null,
      motion: ["open", "close"].includes(phase) ? tl.motion[phase] : null,
    }),
    done: t >= tl.last - 1e-8,
  };
}
export function reviewTimes(tl, action) {
  return tl.actions
    .filter((a) => !action || a.id === action)
    .flatMap((a) => [
      a.from,
      (a.from + a.to) / 2,
      a.to - 1 / 60,
      a.to,
      a.to + 1 / 60,
    ]);
}
