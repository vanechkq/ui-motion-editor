import { editActionTiming } from "../engine/action-timing.mjs";
/** Interaction layer only. Scene adapters own compilation and continuous time mapping. */
export function createActionTiming({
  panel,
  scroll,
  getScene,
  getSelected,
  getConfig,
  getScale,
  choose,
  pause,
  seek,
  apply,
  refresh,
  commit,
  onError,
}) {
  let gesture = null;
  addEventListener(
    "keydown",
    (event) => {
      if (gesture && event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        finish(null, true);
      }
    },
    true,
  );
  panel.innerHTML =
    '<label>Начало<span class="number-field"><input id="action-start" type="number" aria-label="Начало действия" min="0" step="0.1" required><span aria-hidden="true">с</span></span></label><label>Длительность<span class="number-field"><input id="action-duration" type="number" aria-label="Длительность действия" min="0.1" step="0.1" required><span aria-hidden="true">с</span></span></label><p id="timing-error" role="alert" hidden></p>';
  const start = panel.querySelector("#action-start"),
    duration = panel.querySelector("#action-duration"),
    error = panel.querySelector("#timing-error");
  function update() {
    const scene = getScene(),
      a = scene?.timeline.actions.find((a) => a.id === getSelected());
    panel.hidden = !a || typeof scene?.retime !== "function";
    if (!a) return;
    start.value = String(+a.from.toFixed(1));
    duration.value = String(+(a.to - a.from).toFixed(1));
    start.min = String(
      Math.ceil(
        ((scene.timeline.actions[scene.timeline.actions.indexOf(a) - 1]?.to ||
          0) -
          1e-9) *
          10,
      ) / 10,
    );
  }
  const snap = (value) => Math.round(value * 10) / 10;
  function editsFor(timeline, config, id, from, length) {
    const index = timeline.actions.findIndex((a) => a.id === id);
    const minimum =
      Math.ceil(((timeline.actions[index - 1]?.to || 0) - 1e-9) * 10) / 10;
    return editActionTiming(
      timeline,
      config,
      id,
      Math.max(minimum, snap(from)),
      Math.max(0.1, snap(length)),
    );
  }
  function numeric() {
    const a = getScene()?.timeline.actions.find((a) => a.id === getSelected());
    if (!a || !getScene()?.retime) return;
    if (
      start.value === "" ||
      duration.value === "" ||
      !Number.isFinite(start.valueAsNumber) ||
      !Number.isFinite(duration.valueAsNumber) ||
      duration.valueAsNumber <= 0
    ) {
      error.hidden = false;
      error.textContent =
        "Введите начало и положительную длительность в секундах.";
      return;
    }
    try {
      pause();
      const edits = editsFor(
        getScene().timeline,
        getConfig(),
        a.id,
        start.valueAsNumber,
        duration.valueAsNumber,
      );
      apply(edits);
      refresh();
      commit();
      error.hidden = true;
    } catch (e) {
      error.hidden = false;
      error.textContent = e.message;
      update();
    }
  }
  for (const input of [start, duration]) {
    input.onchange = numeric;
    input.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        numeric();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        update();
        error.hidden = true;
      }
    };
  }
  function finish(event, cancel = false) {
    if (!gesture) return;
    const g = gesture;
    gesture = null;
    g.node.onpointermove = g.node.onpointerup = g.node.onpointercancel = null;
    g.node.onlostpointercapture = null;
    if (g.node.hasPointerCapture(g.pointerId))
      g.node.releasePointerCapture(g.pointerId);
    if (cancel && g.moved) apply(g.edits);
    if (g.moved) {
      g.node.dataset.suppressClick = "true";
      commit();
    } else if (!cancel) seek(g.action.from);
    refresh();
  }
  function pointerDown(e, action, node) {
    if (e.button !== 0 || !getScene()?.retime) return;
    e.preventDefault();
    e.stopPropagation();
    pause();
    choose(action.id);
    error.hidden = true;
    const timeline = getScene().timeline,
      index = timeline.actions.findIndex((a) => a.id === action.id);
    gesture = {
      node,
      action,
      timeline,
      edits: structuredClone(getConfig()),
      scale: getScale(),
      x: e.clientX,
      scroll: scroll.scrollLeft,
      minimum: timeline.actions[index - 1]?.to || 0,
      edge: e.target.closest("[data-resize]")?.dataset.resize || "move",
      pointerId: e.pointerId,
      moved: false,
    };
    node.setPointerCapture(e.pointerId);
    node.onpointermove = (event) => {
      const g = gesture;
      if (!g) return;
      const pixels = event.clientX - g.x + scroll.scrollLeft - g.scroll;
      if (!g.moved && Math.abs(pixels) < 3) return;
      g.moved = true;
      const delta = pixels / g.scale,
        min = 0.1,
        baseDuration = action.to - action.from;
      let from = action.from,
        len = baseDuration;
      if (g.edge === "start") {
        const end = snap(action.to);
        from = Math.min(
          end - min,
          Math.max(g.minimum, snap(action.from + delta)),
        );
        len = end - from;
      } else if (g.edge === "end") len = Math.max(min, baseDuration + delta);
      else from = Math.max(g.minimum, action.from + delta);
      try {
        apply(editsFor(timeline, g.edits, action.id, from, len));
        refresh();
      } catch (error) {
        finish(event, true);
        onError(error);
      }
    };
    node.onpointerup = (e) => finish(e);
    node.onpointercancel = (e) => finish(e, true);
    node.onlostpointercapture = (e) => finish(e, true);
  }
  function decorate(node, action) {
    if (typeof getScene()?.retime !== "function") return;
    node.classList.add("editable-action");
    node.title += " · Перетащите блок или его края";
    for (const edge of ["start", "end"]) {
      const handle = document.createElement("span");
      handle.className = "resize-handle " + edge;
      handle.dataset.resize = edge;
      handle.setAttribute("aria-hidden", "true");
      node.append(handle);
    }
    node.onpointerdown = (e) => pointerDown(e, action, node);
  }
  return {
    update,
    decorate,
    get scale() {
      return gesture?.scale;
    },
    get active() {
      return !!gesture;
    },
    cancel() {
      if (!gesture) return false;
      finish(null, true);
      return true;
    },
  };
}
