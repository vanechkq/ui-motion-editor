const record = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
export function validateActionTiming(edits = {}) {
  if (!record(edits)) throw Error("timeline: expected object");
  for (const key of Object.keys(edits))
    if (key !== "actions") throw Error(`timeline.${key}: unknown field`);
  if (edits.actions === undefined) return edits;
  if (!record(edits.actions)) throw Error("timeline.actions: expected object");
  for (const [id, edit] of Object.entries(edits.actions)) {
    const path = `timeline.actions.${id}`;
    if (!id || ["__proto__", "constructor", "prototype"].includes(id))
      throw Error(`${path}: invalid action id`);
    if (!record(edit) || !Object.keys(edit).length)
      throw Error(`${path}: expected from and/or duration`);
    for (const [key, value] of Object.entries(edit)) {
      if (!["from", "duration"].includes(key))
        throw Error(`${path}.${key}: unknown field`);
      if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value > 3600 ||
        (key === "from" ? value < 0 : value <= 0)
      )
        throw Error(
          `${path}.${key}: expected ${key === "from" ? "non-negative" : "positive"} seconds up to 3600`,
        );
    }
  }
  return edits;
}
// Timeline edits retime source animation continuously; no frames or vector layers are baked.
const snap = (v, fps) => Math.round(v * fps) / fps;
function interpolate(value, points, from, to) {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i];
    if (value <= b[from] + 1e-9) {
      const span = b[from] - a[from];
      return span > 1e-9
        ? a[to] +
            ((b[to] - a[to]) * (Math.max(a[from], value) - a[from])) / span
        : b[to];
    }
  }
  return points.at(-1)[to];
}
export function sourceTime(time, timeline) {
  return timeline.timeMap
    ? interpolate(time, timeline.timeMap, "target", "source")
    : time;
}
export function retimeTimeline(base, edits = {}) {
  validateActionTiming(edits);
  for (const id of Object.keys(edits.actions || {}))
    if (!base.actions.some((a) => a.id === id))
      throw Error("timeline.actions." + id + ": unknown action");
  if (!Object.keys(edits.actions || {}).length) return base;
  for (let i = 0; i < base.actions.length; i++) {
    const a = base.actions[i];
    if (
      !(a.to > a.from) ||
      a.from < 0 ||
      (i && a.from < base.actions[i - 1].to - 1e-9)
    )
      throw Error(
        "timeline.actions: editing requires ordered, non-overlapping intervals",
      );
  }
  const fps = base.fps || 60,
    points = [{ source: 0, target: 0 }],
    actions = [];
  let shift = 0,
    previousEnd = 0;
  for (const action of base.actions) {
    const edit = edits.actions[action.id] || {},
      from = Math.max(previousEnd, snap(edit.from ?? action.from + shift, fps)),
      duration = Math.max(
        2 / fps,
        snap(edit.duration ?? action.to - action.from, fps),
      );
    if (!Number.isFinite(from) || !Number.isFinite(duration))
      throw Error("Invalid action timing");
    const to = from + duration;
    actions.push({ ...action, from, to });
    points.push(
      { source: action.from, target: from },
      { source: action.to, target: to },
    );
    previousEnd = to;
    shift = to - action.to;
  }
  const duration = Math.ceil((base.duration + shift - 1e-8) * fps) / fps;
  if (duration > 3600)
    throw Error("timeline.duration: must not exceed 3600 seconds");
  points.push({ source: base.duration, target: duration });
  const map = (time) => interpolate(time, points, "source", "target");
  return {
    ...base,
    duration,
    last: duration - 1 / fps,
    sourceTimeline: base,
    timeMap: points,
    actions,
    cuts: Object.fromEntries(
      Object.entries(base.cuts || {}).map(([k, v]) => [k, map(v)]),
    ),
    events: (base.events || []).map((e) => ({ ...e, time: map(e.time) })),
    tracks: (base.tracks || []).map((row) => ({
      ...row,
      clips: row.clips.map((clip) => ({
        ...clip,
        from: map(clip.from),
        to: map(clip.to),
      })),
    })),
  };
}
export function editActionTiming(timeline, config, id, from, duration) {
  if (!Number.isFinite(from) || !Number.isFinite(duration))
    throw Error("action timing: expected finite seconds");
  const actions = timeline.actions,
    index = actions.findIndex((a) => a.id === id);
  if (index < 0) throw Error("Unknown action " + id);
  const fps = timeline.fps || 60,
    minimum = index ? actions[index - 1].to : 0;
  from = Math.max(minimum, snap(from, fps));
  duration = Math.max(2 / fps, snap(duration, fps));
  const endDelta = from + duration - actions[index].to,
    edits = structuredClone(config || {});
  edits.actions ||= {};
  edits.actions[id] = { from, duration };
  for (const a of actions.slice(index + 1))
    edits.actions[a.id] = {
      from: snap(a.from + endDelta, fps),
      duration: snap(a.to - a.from, fps),
    };
  return edits;
}
