import { createActionTiming } from "./action-timing.mjs";
import { Transport } from "../core/transport.mjs";
import { loadProject, readJSON, configEnvelope } from "../core/registry.mjs";
import {
  validateScene,
  validateConfig,
  validateTimeline,
  unwrapConfig,
  safeTree,
} from "../core/validation.mjs";
import { renderInspector, setPath, isChanged } from "./inspector.mjs";
import { readSaved, writeSaved } from "./storage.mjs";
const $ = (s) => document.querySelector(s),
  box = $(".screen-box"),
  track = $("#track"),
  scroll = $(".timeline-scroll"),
  transport = new Transport();
let iframe = $("iframe"),
  scene = null,
  project = null,
  projectURL = "",
  projects = [],
  config = {},
  draft = {},
  group = "motion",
  selected = "",
  t = 0,
  pps = 60,
  busy = false,
  raf = 0,
  last = 0,
  loadId = 0,
  openId = 0,
  lastKey,
  noticeTimer;
const saved = readSaved();
saved.projects ??= {};
const format = (value, ms = true) =>
  `${Math.floor(value / 60)
    .toString()
    .padStart(
      2,
      "0",
    )}:${(ms ? (value % 60).toFixed(3) : Math.floor(value % 60).toString()).padStart(ms ? 6 : 2, "0")}`;
window.previewMetrics = { frames: [], lastSeekMs: 0 };
const actionTiming = createActionTiming({
  panel: $("#action-timing"),
  scroll,
  getScene: () => scene,
  getSelected: () => selected,
  getConfig: () => config.timeline,
  getScale: () => pps,
  choose,
  pause: () => play(false),
  seek,
  apply: applyTiming,
  refresh: timeline,
  commit: () => {
    persist();
    updateURL();
  },
  onError: showError,
});
function applyTiming(edits) {
  if (!scene || busy || typeof scene.retime !== "function") return;
  const nextConfig = { ...config, timeline: edits };
  if (edits === undefined) delete nextConfig.timeline;
  validateConfig(nextConfig, project);
  const next = scene.retime(edits || {});
  validateTimeline(next);
  if (edits === undefined) {
    delete config.timeline;
    delete draft.timeline;
  } else {
    const normalized = {
      actions: Object.fromEntries(
        Object.keys(edits.actions || {}).map((id) => {
          const a = next.actions.find((a) => a.id === id);
          return [id, { from: a.from, duration: a.to - a.from }];
        }),
      ),
    };
    config.timeline = normalized;
    draft.timeline = structuredClone(normalized);
  }
  lastKey = undefined;
  transport.last = next.last;
  transport.range(...range());
  $("#duration").textContent = "/ " + format(next.duration);
  $("#playhead").setAttribute("aria-valuemax", next.last);
  updateDirty();
}
function updateURL() {
  history.replaceState(
    null,
    "",
    "?project=" +
      encodeURIComponent(new URL(projectURL).pathname) +
      "&config=" +
      encodeURIComponent(JSON.stringify(config)),
  );
}

function persist() {
  if (projectURL)
    saved.projects[new URL(projectURL).pathname] = { config, draft, group };
  saved.lastProject = projectURL
    ? new URL(projectURL).pathname
    : saved.lastProject;
  writeSaved(saved);
}
function notice(message) {
  clearTimeout(noticeTimer);
  $("#notice").textContent = message;
  $("#notice").hidden = false;
  noticeTimer = setTimeout(() => ($("#notice").hidden = true), 2400);
}
function errorMessage(error) {
  return error.message || String(error);
}
function showError(error) {
  $("#scene-error").hidden = false;
  $("#scene-error-message").textContent = errorMessage(error);
}
function clearError() {
  $("#scene-error").hidden = true;
}
function setBusy(value) {
  busy = value;
  $(".viewer").setAttribute("aria-busy", value);
  $(".loading").hidden = !value;
  for (const el of document.querySelectorAll(
    ".transport button,.transport select,.transport input,#actions button,#action-timing input,#save,#reset,#inspector button,#inspector input,#inspector select,#inspector textarea,#tabs button",
  ))
    el.disabled = value || !scene;
  $("#playhead").tabIndex = value || !scene ? -1 : 0;
  updateDirty();
}
function fit() {
  if (!project) return;
  const rect = $(".viewer").getBoundingClientRect(),
    { width, height } = project.composition,
    scale = Math.min((rect.width - 32) / width, (rect.height - 32) / height, 1);
  box.style.width = Math.max(1, width * scale) + "px";
  box.style.height = Math.max(1, height * scale) + "px";
  iframe.style.width = width + "px";
  iframe.style.height = height + "px";
  iframe.style.transform = `scale(${Math.max(0.01, scale)})`;
}
new ResizeObserver(fit).observe($(".viewer"));
function range() {
  const action = scene?.timeline.actions.find((a) => a.id === selected);
  return action ? [action.from, action.to] : [0, scene?.timeline.duration || 0];
}
function seek(value, { clock = true, reveal = false } = {}) {
  if (!scene || busy) return;
  const start = performance.now();
  t = clock
    ? transport.seek(value)
    : Math.max(0, Math.min(scene.timeline.last, value));
  const pose = scene.sample?.(t);
  if (pose?.visualKey === undefined || lastKey !== pose.visualKey) {
    const rendered = scene.seek(t);
    lastKey = rendered?.visualKey;
  }
  $("#time").textContent = format(t);
  $("#playhead").style.left = t * pps + "px";
  $("#playhead").setAttribute("aria-valuenow", t.toFixed(3));
  $("#playhead").setAttribute("aria-valuetext", format(t));
  window.previewMetrics.lastSeekMs = performance.now() - start;
  if (reveal) revealPlayhead();
  return pose;
}
function revealPlayhead() {
  const x = t * pps;
  if (x < scroll.scrollLeft + 16) scroll.scrollLeft = Math.max(0, x - 24);
  if (x > scroll.scrollLeft + scroll.clientWidth - 24)
    scroll.scrollLeft = x - scroll.clientWidth + 40;
}
function play(on) {
  on = !!(on && scene && !busy);
  transport.range(...range());
  transport.play(on);
  if (on) seek(transport.time);
  $("#play").setAttribute("aria-label", on ? "Пауза" : "Играть");
  $("#play").setAttribute("title", on ? "Пауза (пробел)" : "Играть (пробел)");
  $("#play").innerHTML = on
    ? '<svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true"><path d="M3 2h3v10H3zm5 0h3v10H8z" fill="currentColor"/></svg>'
    : '<svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true"><path d="M4 2 12 7 4 12Z" fill="currentColor"/></svg>';
  last = 0;
  if (raf) cancelAnimationFrame(raf);
  raf = on ? requestAnimationFrame(tick) : 0;
}
let intervals = [];
function tick(now) {
  raf = 0;
  if (!transport.playing) return;
  if (last) {
    const dt = now - last;
    intervals.push(dt);
    if (intervals.length > 120) intervals.shift();
    transport.speed = Number($("#speed").value);
    transport.loop = $("#repeat").getAttribute("aria-pressed") === "true";
    const next = transport.advance(dt / 1000);
    seek(next, { clock: false, reveal: true });
    if (!transport.playing) {
      play(false);
      return;
    }
  }
  last = now;
  window.previewMetrics.cadence = {
    fps: intervals.length
      ? 1000 / (intervals.reduce((a, b) => a + b, 0) / intervals.length)
      : 0,
    intervals: [...intervals],
  };
  window.previewMetrics.frames.push(window.previewMetrics.lastSeekMs);
  if (window.previewMetrics.frames.length > 600)
    window.previewMetrics.frames.shift();
  raf = requestAnimationFrame(tick);
}
function choose(id) {
  selected = id;
  actionTiming.update();
  transport.range(...range());
  for (const button of $("#actions").children)
    button.setAttribute("aria-pressed", button.dataset.action === id);
  $("#all").setAttribute("aria-pressed", !id);
  const action = scene?.timeline.actions.find((a) => a.id === id);
  $("#selection").hidden = !action;
  if (action) {
    $("#selection").style.left = action.from * pps + "px";
    $("#selection").style.width = (action.to - action.from) * pps + "px";
  }
}
document.addEventListener("pointerdown", (e) => {
  if (
    selected &&
    e.button === 0 &&
    !e.target.closest(
      "button,input,select,textarea,a,dialog,[role=tab],#inspector,#action-timing",
    )
  )
    choose("");
});
function clip(item, interactive = false) {
  const node = document.createElement(interactive ? "button" : "div");
  node.className = "clip" + (interactive ? " motion" : "");
  node.style.left = item.from * pps + 2 + "px";
  node.style.width = Math.max(2, (item.to - item.from) * pps - 4) + "px";
  node.textContent =
    project.editor?.actionLabels?.[item.id] || item.shortName || item.name;
  node.title = `${item.name} · ${format(item.from)}–${format(item.to)}`;
  if (interactive) {
    node.dataset.action = item.id;
    node.setAttribute("aria-label", item.name);
    node.setAttribute("aria-pressed", selected === item.id);
    actionTiming.decorate(node, item);
    node.onclick = (event) => {
      if (node.dataset.suppressClick) {
        delete node.dataset.suppressClick;
        event.preventDefault();
        return;
      }
      play(false);
      choose(item.id);
      seek(item.from, { reveal: true });
    };
  }
  return node;
}
function timeline() {
  if (!scene) return;
  const tl = scene.timeline;
  pps =
    actionTiming.scale ??
    Math.max(24, (scroll.clientWidth - 24) / tl.duration) *
      Number($("#zoom").value);
  track.style.width = tl.duration * pps + 24 + "px";
  $("#ruler").replaceChildren();
  const step = pps < 48 ? 2 : pps > 110 ? 0.5 : 1;
  for (let time = 0; time <= tl.duration; time += step) {
    const tick = document.createElement("span");
    tick.className = "tick";
    tick.style.left = time * pps + "px";
    tick.textContent = Number.isInteger(time) ? format(time, false) : "·";
    $("#ruler").append(tick);
  }
  $("#lanes").replaceChildren();
  for (const row of tl.tracks) {
    const lane = document.createElement("div");
    lane.className = "lane screens";
    lane.setAttribute("aria-label", row.name || row.id);
    row.clips.forEach((c) => lane.append(clip(c)));
    lane.onpointerdown = drag;
    $("#lanes").append(lane);
  }
  if (!actionTiming.active) {
    $("#actions").replaceChildren();
    tl.actions.forEach((a) => $("#actions").append(clip(a, true)));
  } else
    for (const node of $("#actions").children) {
      const a = tl.actions.find((a) => a.id === node.dataset.action);
      if (a) {
        node.style.left = a.from * pps + 2 + "px";
        node.style.width = Math.max(2, (a.to - a.from) * pps - 4) + "px";
      }
    }

  track.style.height = 28 + (tl.tracks.length + 1) * 42 + "px";
  choose(selected);
  seek(t);
}
new ResizeObserver(timeline).observe(scroll);
$("#zoom").oninput = () => {
  timeline();
  revealPlayhead();
};
function drag(e) {
  if (!scene || busy || e.button !== 0) return;
  e.preventDefault();
  play(false);
  choose("");
  const target = e.currentTarget;
  target.setPointerCapture(e.pointerId);
  const update = (e) =>
    seek((e.clientX - track.getBoundingClientRect().left) / pps);
  update(e);
  target.onpointermove = update;
  target.onpointerup = target.onpointercancel = (e) => {
    target.onpointermove = null;
    if (target.hasPointerCapture(e.pointerId))
      target.releasePointerCapture(e.pointerId);
  };
}
$("#hit-zone").onpointerdown = drag;
$("#playhead").onpointerdown = drag;
$("#actions").onpointerdown = (e) => {
  if (e.target === $("#actions")) drag(e);
};
function inspector() {
  if (!scene) return;
  group = renderInspector({
    project,
    parameters: scene.parameters,
    draft,
    group,
    onGroup: (id) => {
      group = id;
      persist();
      inspector();
      document.getElementById("tab-" + id).focus();
    },
    onChange: (path, value) => {
      setPath(draft, path, value);
      persist();
      updateDirty();
    },
    onApply: () => apply().catch(inspectorError),
  });
  updateDirty();
}
function updateDirty() {
  const button = $(".apply");
  if (button)
    button.disabled =
      busy || !scene || !isChanged(draft, config, scene.parameters);
  $("#save").title = isChanged(draft, config, scene?.parameters || {})
    ? "Применить и скачать параметры проекта"
    : "Скачать параметры проекта";
  $("#reset").disabled =
    busy ||
    !scene ||
    (!Object.keys(config).length && !Object.keys(draft).length);
}
function inspectorError(error) {
  $("#inspector-error").hidden = false;
  $("#inspector-error").textContent = errorMessage(error);
}
function projectOptions() {
  const select = $("#project");
  select.replaceChildren();
  for (const p of projects) {
    const option = document.createElement("option");
    option.value = p.url;
    option.textContent = p.label;
    select.append(option);
  }
  select.value = projectURL;
}
async function mount(manifest, url, overrides) {
  validateConfig(overrides, manifest);
  if (overrides.timeline) {
    const module = await import(new URL(manifest.timeline, url).href);
    validateTimeline(module.compile(overrides));
  }
  play(false);
  setBusy(true);
  clearError();
  const id = ++loadId;
  const candidate = document.createElement("iframe");
  candidate.title = "Сцена";
  candidate.tabIndex = -1;
  candidate.setAttribute("aria-hidden", "true");
  candidate.style.visibility = "hidden";
  candidate.style.width = manifest.composition.width + "px";
  candidate.style.height = manifest.composition.height + "px";
  const source = new URL(manifest.scene, url);
  source.searchParams.set("config", JSON.stringify(overrides));
  try {
    const nextScene = await new Promise((resolve, reject) => {
      let timer;
      const cleanup = () => {
        clearTimeout(timer);
        removeEventListener("message", ready);
      };
      const ready = (e) => {
        if (
          e.origin !== location.origin ||
          e.source !== candidate.contentWindow ||
          e.data?.type !== "motion-ready"
        )
          return;
        try {
          const adapter = validateScene(candidate.contentWindow.motionScene);
          cleanup();
          resolve(adapter);
        } catch (error) {
          cleanup();
          reject(error);
        }
      };
      addEventListener("message", ready);
      timer = setTimeout(() => {
        cleanup();
        reject(Error("Сцена не ответила. Проверьте адрес и файлы проекта."));
      }, 12000);
      candidate.src = source.href;
      box.append(candidate);
    });
    if (id !== loadId) {
      candidate.remove();
      return false;
    }
    iframe.remove();
    iframe = candidate;
    iframe.style.visibility = "visible";
    iframe.removeAttribute("aria-hidden");
    scene = nextScene;
    project = manifest;
    projectURL = url;
    config = structuredClone(overrides);
    lastKey = undefined;
    transport.setTimeline(scene.timeline);
    setBusy(false);
    box.style.visibility = "visible";
    fit();
    return true;
  } catch (error) {
    candidate.remove();
    if (id === loadId) {
      setBusy(false);
      showError(error);
    }
    throw error;
  }
}
async function openProject(url, manifest, imported, preserveDraft = false) {
  const request = ++openId;
  const loaded = await loadProject(url, manifest);
  if (request !== openId) return;
  const previous = projectURL;
  persist();
  const entry = saved.projects[new URL(loaded.url).pathname] || {};
  const next = imported ?? entry.config ?? {};
  validateConfig(next, loaded.project);
  if (!(await mount(loaded.project, loaded.url, next))) return;
  draft = structuredClone(
    preserveDraft && JSON.stringify(next) === JSON.stringify(entry.config)
      ? (entry.draft ?? next)
      : (imported ?? entry.draft ?? next),
  );
  try {
    safeTree(draft);
  } catch {
    draft = structuredClone(next);
  }
  group = entry.group || "motion";
  t = 0;
  selected = "";
  if (!projects.some((p) => p.url === projectURL))
    projects.push({ url: projectURL, label: project.label });
  projectOptions();
  readyView();
  persist();
  if (previous) notice("Проект открыт");
}
function readyView() {
  if (!scene.timeline.actions.some((a) => a.id === selected)) selected = "";
  $("#duration").textContent = "/ " + format(scene.timeline.duration);
  $("#playhead").setAttribute("aria-valuemax", scene.timeline.last);
  inspector();
  timeline();
  seek(Math.min(t, scene.timeline.last), { reveal: true });
  updateURL();
}
async function apply() {
  if (!scene || busy) return;
  const overrides = structuredClone(draft);
  validateConfig(overrides, project);
  const time = t,
    selection = selected;
  if (await mount(project, projectURL, overrides)) {
    draft = structuredClone(overrides);
    t = time;
    selected = selection;
    readyView();
    persist();
    notice("Параметры применены");
  }
}
async function save() {
  if (!scene || busy) return;
  if (isChanged(draft, config, scene.parameters)) await apply();
  const url = URL.createObjectURL(
      new Blob([JSON.stringify(configEnvelope(projectURL, config), null, 2)], {
        type: "application/json",
      }),
    ),
    link = document.createElement("a");
  link.href = url;
  link.download = project.name + "-config.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notice("Параметры скачаны");
}
$("#save").onclick = () => save().catch(inspectorError);
$("#reset").onclick = async () => {
  if (!scene || busy) return;
  draft = {};
  try {
    await apply();
    notice("Параметры сброшены");
  } catch (error) {
    inspectorError(error);
  }
};
$("#project").onchange = (e) =>
  openProject(e.target.value).catch((error) => {
    projectOptions();
    showError(error);
  });
$("#play").onclick = () => play(!transport.playing);
$("#previous").onclick = () => {
  play(false);
  seek(t - 1 / 60, { reveal: true });
};
$("#next").onclick = () => {
  play(false);
  seek(t + 1 / 60, { reveal: true });
};
$("#all").onclick = () => choose("");
$("#repeat").onclick = (e) =>
  e.currentTarget.setAttribute(
    "aria-pressed",
    e.currentTarget.getAttribute("aria-pressed") !== "true",
  );
function settings(open) {
  document.body.classList.toggle("settings-open", open);
  $("#settings").setAttribute("aria-expanded", open);
  if (open) document.querySelector("#tabs [aria-selected=true]")?.focus();
}
$("#settings").onclick = () =>
  settings(!document.body.classList.contains("settings-open"));
$("#inspector-close").onclick = () => {
  settings(false);
  $("#settings").focus();
};
$("#dismiss-error").onclick = clearError;
const dialog = $("#project-dialog");
$("#connect").onclick = () => {
  $("#project-error").hidden = true;
  $("#project-file").value = "";
  dialog.showModal();
};
$("#cancel-connect").onclick = () => dialog.close();
function dialogError(error) {
  $("#project-error").hidden = false;
  $("#project-error").textContent = errorMessage(error);
}
$("#connect-form").onsubmit = async (e) => {
  e.preventDefault();
  const submit = $("#open-project");
  submit.disabled = true;
  try {
    await openProject(e.currentTarget.elements.url.value.trim());
    dialog.close();
  } catch (error) {
    dialogError(error);
  } finally {
    submit.disabled = false;
  }
};
$("#file-project").onclick = () => $("#project-file").click();
$("#project-file").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (data.project && Object.hasOwn(data, "config"))
      await openProject(data.project, undefined, unwrapConfig(data));
    else {
      if (!data.baseURL)
        throw Error("Укажите baseURL в файле проекта — адрес папки со сценой.");
      const base = new URL(data.baseURL, location.href);
      if (!base.pathname.endsWith("/")) base.pathname += "/";
      await openProject(new URL("motion.project.json", base), data);
    }
    dialog.close();
  } catch (error) {
    dialogError(error);
  } finally {
    e.target.value = "";
  }
};
addEventListener("keydown", (e) => {
  if (dialog.open) return;
  if (actionTiming.active) {
    if (e.key === "Escape") {
      e.preventDefault();
      actionTiming.cancel();
    }
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
    e.preventDefault();
    save().catch(inspectorError);
    return;
  }
  if (e.key === "Escape") {
    if (document.body.classList.contains("settings-open")) {
      settings(false);
      $("#settings").focus();
    } else choose("");
    return;
  }
  if (
    e.target.closest("input,textarea,select,[contenteditable=true],[role=tab]")
  )
    return;
  if (e.code === "Space") {
    if (e.target.closest("button")) return;
    e.preventDefault();
    play(!transport.playing);
  } else if (e.code === "ArrowRight" || e.code === "ArrowLeft") {
    e.preventDefault();
    play(false);
    seek(t + (e.code === "ArrowRight" ? 1 : -1) / 60, { reveal: true });
  } else if (e.code === "Home" || e.code === "End") {
    e.preventDefault();
    play(false);
    seek(e.code === "Home" ? 0 : scene?.timeline.last || 0, { reveal: true });
  }
});
addEventListener("visibilitychange", () => {
  if (document.hidden) play(false);
});
window.motionPreview = {
  seek,
  play,
  openProject,
  get scene() {
    return scene;
  },
  get project() {
    return project;
  },
  get time() {
    return t;
  },
  get config() {
    return config;
  },
  get draft() {
    return draft;
  },
  get selectedAction() {
    return selected;
  },
  get busy() {
    return busy;
  },
};
try {
  setBusy(true);
  const registryURL = new URL("../projects.json", import.meta.url);
  const registry = await readJSON(registryURL);
  projects = registry.projects.map((p) => ({
    url: new URL(p.manifest, registryURL).href,
    label: p.label,
  }));
  projectOptions();
  const params = new URLSearchParams(location.search),
    initial = params.get("project") || saved.lastProject || projects[0]?.url;
  if (!initial) throw Error("Добавьте проект через +");
  const overrides = params.has("config")
    ? JSON.parse(params.get("config"))
    : undefined;
  await openProject(initial, undefined, overrides, true);
} catch (error) {
  setBusy(false);
  showError(error);
}
