# UI Motion Editor

A small local editor for scripted interface animation. HTML text, CSS shapes and SVG remain editable sources. Preview and MP4 export call the same random-access scene renderer. All compositions and videos use **60 fps**.

Two self-contained examples are included: `projects/cards/` (640 × 480, card → details) and `projects/toggle/` (360 × 360, a setting changing state). Both use system fonts and inline SVG. The project is prepared locally; repository name, visibility and source license are still to be chosen by the owner.

## Install and run

Requirements: Node.js 22 or newer, pnpm 11 or newer, and internet access for the initial dependencies/browser download.

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm dev
```

Open `http://127.0.0.1:4173`. Set `PORT` to use another port. On Linux, `pnpm exec playwright install --with-deps chromium` also installs browser system dependencies and may require administrator rights. Dependencies are pinned in `pnpm-lock.yaml`. `ffmpeg-static` downloads its encoder during installation; its install script is explicitly allowed in `pnpm-workspace.yaml`.

```sh
pnpm test
pnpm test:browser
pnpm build
pnpm check
pnpm check --project projects/toggle
pnpm export --out artifacts/cards.mp4
pnpm export --action open --out artifacts/open.mp4
pnpm export --config projects/cards/retimed.config.json --action open --out artifacts/retimed-open.mp4
pnpm export --config projects/cards/example.config.json --action open --out artifacts/edited-open.mp4
pnpm export --from 0.6 --to 1.5 --out artifacts/range.mp4
pnpm export --project projects/toggle --out artifacts/toggle.mp4
pnpm motion frame --time 1.1 --out artifacts/frame.png
pnpm motion inspect --project projects/cards
```

`pnpm build` validates registered manifests and copies the static application to `dist/`; serve that folder with any static server. No backend or remote service is needed. Export commands start and close their own server on an available localhost port, independently of the preview server. `--project` accepts a directory or manifest inside this workspace.

Export defaults to native resolution. `--scale 2` changes raster resolution; MP4 dimensions must be even integers. `--draft` explicitly selects native size. `--fps` accepts only 60. `--config config.json` accepts editor downloads or plain overrides. `--action` selects an action; `--from` and `--to` optionally override its range. Ranges are half-open and use `ceil((to-from)*60)` frames. An existing MP4/PNG is protected unless `--replace` is given. `check` replaces its generated review images in the specified directory.

`MOTION_CHROME` and `MOTION_FFMPEG` optionally select installed executables. The defaults are the installed Playwright Chromium and the project FFmpeg dependency; there are no machine-specific fallbacks.

## Editor

Drag the playhead or timeline ruler, select an episode on the action track, change zoom, loop, speed, or step one frame. Space toggles playback, arrows step, Home/End seek. A click on empty space or the ruler clears the selected episode and returns to **Весь ролик**. Play/step/speed controls and inspector fields preserve the selection. Selecting another episode changes the range.

Drag the center of an action block to move it; drag its left/right edge to change its start/end. Selecting an editable action reveals **Начало** and **Длительность**, its actual interval in seconds. Changes apply immediately in 100 ms steps, keep at least 100 ms, and cannot cross the preceding action. Later actions ripple by the edited endpoint delta, preserving their intervening gaps to frame precision. The left edge keeps the snapped end fixed. Escape or pointer cancellation restores the drag's starting values.

Motion fields remain source parameters at 1×; stretching a block changes the playback mapping for the whole action, including Tap, target press and springs. The first edit rounds non-frame-aligned source intervals to frames; without edits, default timings are untouched. Hot timeline changes preserve unapplied inspector drafts. Adapters without `retime` remain viewable/selectable, with no editing handles or timing fields.

The inspector is generated from the selected manifest. Apply reloads the scene at the current time. Applied values and unapplied drafts are retained per project in this browser, including across tabs in the inspector, project switches and refresh. **Сохранить** applies pending edits and downloads the complete config; it does not write scene source files. A config also appears in the preview URL. At narrow widths, **Параметры** opens the inspector; its close button or Escape closes it. Failed connections and imports preserve the working scene.

The **+** control loads a same-origin manifest URL or JSON file. A loose manifest JSON must include `baseURL` pointing to its served project folder; uploading JSON does not upload the referenced HTML/assets. A downloaded config includes its manifest pathname and can be imported directly. Only load projects you trust: scene adapters are executable JavaScript on the same origin. The built-in server binds to localhost.

## Structure

| Folder                | Responsibility                                                |
| --------------------- | ------------------------------------------------------------- |
| `editor/`             | Neutral interface, generated inspector and timeline tracks    |
| `core/transport.mjs`  | Playback clock, range, speed and looping                      |
| `core/registry.mjs`   | Same-origin manifest loading and config envelope              |
| `core/validation.mjs` | Manifest, parameter and timeline validation                   |
| `core/scene.mjs`      | Stable `window.motionScene` adapter publication               |
| `engine/`             | Shared tokens, tap/target-press sampler and springs           |
| `exporter/`           | Temporary server, browser capture, cache, checks and encoding |
| `projects/`           | Independent compositions and timelines                        |
| `schemas/`            | JSON Schema references for manifest/config tooling            |
| `tools/`              | Dev/build/export entry points                                 |
| `tests/`              | Unit and browser integration checks                           |

## Add a layout

1. Copy `projects/toggle/` into `projects/my-layout/` and change its manifest `name`, `label`, dimensions and fields.
2. Author the settled HTML/CSS/SVG states in `index.html`. Keep text as text and use persistent nodes for shared elements. Keep assets local to this workspace.
3. Implement a pure `compile(config)` in `timeline.mjs`. Return `fps: 60`, `duration`, `last: duration - 1/60`, `actions` and `tracks`.
4. Implement `seek(time)` in `scene.mjs` to set all animated state from time. Avoid incremental physics, independent timers, CSS animations, live media and unseeded randomness. Await fonts and assets before publishing.
5. Add the manifest to `projects.json`, or connect its served URL through **+**. No editor changes are required.
6. Run `pnpm check --project projects/my-layout`, inspect boundary images, and export.

The manifest shape is documented by `schemas/manifest.schema.json`; runtime validation additionally checks duplicate fields, reserved IDs, path traversal and numerical relationships. Parameter overrides accept only paths declared by the editor plus shared Tap fields. Invalid values identify the failing path, for example `hold.details: expected number 0…30`. Preset overrides must equal one of the declared preset objects. Add a new preset to the manifest when extending motion choices.

```json
{
  "schema": 1,
  "project": "/projects/cards/motion.project.json",
  "config": {
    "hold": { "details": 2.5 },
    "content": { "title": "My project" },
    "tokens": { "tapIndicator": { "diameter": 36, "press": 0.3 } }
  }
}
```

### Scene adapter v1

```js
import { publishScene } from "../../core/scene.mjs";
await document.fonts.ready;
publishScene({
  ready: true,
  timeline, // compile(config); serializable, including actions and tracks
  parameters, // resolved values used by the inspector
  layers, // named persistent DOM nodes, assigned with sceneLayers()
  seek, // seek(seconds) -> pose; must work in any order
  sample, // optional pure sample(seconds) -> { visualKey, ...pose }
  inspect, // () -> serializable diagnostics, optional invariants: {name: boolean}
});
```

Optional `retime(edits)` updates `scene.timeline` synchronously and returns the validated new timeline, without rebuilding nodes or reloading the document. The examples compile a fresh base timeline, then call `retimeTimeline(base, edits)` from `engine/action-timing.mjs`. Their samplers map actual time through `sourceTime(time, timeline)` before sampling every visual property. Returned `pose.time` is source time; `pose.actualTime` is the editor/export time. Define action intervals to cover the full effect you intend to retime. Source action intervals must be ordered and non-overlapping for editing.

Persisted edits live at `config.timeline.actions[id] = {from, duration}`. Either field may be omitted in imported data to retain its source default; unknown action IDs, invalid fields and non-finite/negative values are rejected. Scene duration is limited to one hour. See `projects/cards/retimed.config.json` and `projects/toggle/retimed.config.json`. The source-time mapping updates cuts, events and track clips. Continuous mapping preserves easing shapes and synchronization; it does not stretch baked frames.

`publishScene` validates the adapter, sets `window.motionScene`, seeks to zero and notifies the parent with `motion-ready`. The editor reads the actual scene timeline; the exporter renders through this same `seek` function. For a mobile layout, keep any persistent system chrome in a separate stage-level overlay above animated screens, outside their opacity, scale and clipping. Desktop layouts need no such overlay. Phase timings belong to the adapter and its declared fields; derive total duration from phases and include visual timing parameters in its pose key. `compile(config)` must work in Node without DOM access and agree with the browser timeline.

A timeline action is `{id, name, from, to}`. A track is `{id, name?, clips: [{name, from, to}]}`. Times are seconds within the composition. `loop: true` in the manifest opts into an exact first/last pixel comparison. Other scenes are not required to loop.

### Shared Tap and press

Tap is placed directly under the root stage, above persistent overlays (z-index 1000), outside animated screens' masks/transforms. If reusing an element, pass the stage as `parent` so the component reparents it. The fixed compositor hint is retained. An adapter must keep other chrome below that overlay level; do not put Tap under a clipped screen. The editor reserves at least 32 px plus safe-area behavior below its tracks, including on mobile.

`engine/tokens.mjs` owns the shared default variable. `resolveTokens(config.tokens)` creates scene values. `createTapIndicator({parent,tokens})` creates the visual and samples its target press from the same timing. Pass the actual target node to `tap.render(...)` and reset its transform on every seek, as both examples do. Trigger movement after `enter + press` so that changing the shared press duration also shifts the scene transition.

## Cache and verification

Generated frames live under `.cache/frames/`. The cache fingerprint contains the bytes of loaded same-origin resources, browser version, platform, composition, scale and configuration. Each pose is keyed by `sample().visualKey`, or by time if no key is supplied. `--fresh` bypasses cache reads and refreshes captured frames.

For hold reuse, an adapter may expose `cacheInputs`: an explicit object containing all non-pose values that affect pixels. The examples use content and shared tokens; their visual keys include the current transition and motion preset. This is an adapter correctness contract: missing a visual input can produce stale frames. Leave `cacheInputs` absent to conservatively hash the entire config. External network resources are rejected during export. Assets must finish loading before `ready`.

`check` captures start, middle, last moving, settled and after-boundary frames; checks A → B → A pixel comparisons at all review boundaries plus five dispersed times; checks exact loop endpoints when requested; and runs any scene-provided boolean invariants. There are no content-specific rules in the core. PNGs are QA/cache/export intermediates, never replacements for editable source layers.

Every MP4 is decoded by FFmpeg after encoding and the decoded frame count must match. Its `.mp4.json` sidecar records the config, actual action intervals, dimensions, 60 fps, range, frame count, SHA-256, dependency fingerprints and measured timings. Browser cadence in `window.previewMetrics.cadence` measures requestAnimationFrame intervals, not guaranteed monitor presentation. Video fps is a separate property.

See `VALIDATION.md` for this machine's measured results. They are observations, not performance promises. System-font metrics may differ between operating systems. Physical mobile devices and arbitrary third-party scene adapters have not been validated.

## License and development

Original source is available under the [MIT license](LICENSE). Dependencies retain their own licenses; see [THIRD_PARTY.md](THIRD_PARTY.md). Run the documented unit/browser checks and build before pushing changes. GitHub Actions runs these checks on pull requests and pushes to `main`.
