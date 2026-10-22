---
name: ui-motion-video
description: Build and revise editable UI motion videos with an existing live timeline, source UI layers, deterministic playback, and cached export. Use for interface walkthroughs and motion prototypes; not for operating Jitter or only compressing an existing video.
---

# UI motion video

Work from the current `motion.project.json`, source contract and local task queue. Preserve approved artwork, copy, fonts, geometry, motion references and manual timeline edits. Apply new steering to the active task; do not silently lose earlier requirements. A demo is based on the implemented product. Do not redesign its screens to make integration easier.

## Show changes early

Update the **existing editor and its timeline** immediately. Do not create temporary review pages, a second preview interface or additional approval stages. Keep the current project open and preserve its config. A new source revision of the same scene updates that project; do not add another project or tab unless the user asks for a separate variant. Retain prior source snapshots outside the active source path. Briefly say what changed and give useful timeline ranges so the user can scrub them.

The user's review rule: export the full movie only after they have reviewed the preview and explicitly approved rendering. Silence, elapsed time, screenshots, automated checks and your own review are not approval. A direct render request can approve an already reviewed current preview. New edits that require review return to the timeline; do not keep restarting full renders while the user is still correcting it.

Use targeted frames or the changed action for local verification. Get something reviewable into the timeline before doing broad checks. When rendering is approved, honor the current exact timeline rather than an older default config.

## Preserve source ownership

Use the project's existing engine. Add scenes through manifests and `projects.json` or the editor's project control, without screen-specific branches in the editor. When integrating another owner's live prototype, work from an isolated versioned copy and record source hashes. Inspect the actual local implementation; a chat saying “done” does not establish which version is present. Do not change live files or Figma without authorization.

Keep editable text, SVG icons and source geometry. Preserve supplied photos, videos and explicitly approved static fixtures; do not replace editable controls with screenshots. Check that the selected card, article and answer represent the intended content. If a supplied fixture intentionally differs, surface that mismatch instead of silently inventing replacement content.

For visual defects and transitions read [references/motion-quality.md](references/motion-quality.md). For imported interactive code, asynchronous seeks, media or cache work read [references/deterministic-preview.md](references/deterministic-preview.md). For shared 3D objects, projected masks or screen-texture handoffs, read [references/3d-transitions.md](references/3d-transitions.md). Read [references/export-quality.md](references/export-quality.md) before exporting or changing quality settings. Do not load every reference for a small timing change.

## Editor interface

For this user's editor, keep playback simple: **one filled seek control, speed segments (¼×, ½×, 1×), and play/pause**. Use a clean scene menu, a large preview and a collapsible parameter panel. Do not reintroduce track lanes, action blocks, timeline zoom, frame-step buttons, playback-range tools or a corner logo unless requested. This is the user's editor preference, not a reason to redesign an unrelated tool.

When changing editor controls or building an editor entry point, read [references/editor-interface.md](references/editor-interface.md). It covers the DialKit interface, binding controls to the existing renderer and the 100 ms interaction grid. Ordinary scene edits do not require rebuilding the editor.

## Shared gestures and timing

For this user's editor, **every scene, preview and export uses the single agreed Tap** from `engine/tokens.mjs` and `engine/tap.mjs`. Preserve its fill, blur, mask, alpha, scale curve and press/release timing. No custom SVG ring or scene-specific substitute. Appearance changes require an explicit user request; a renderer defect is not permission to change the design.

Read the actual token values. An unchanged base diameter does not prove the displayed size is correct: check the indicator's scale curve, ancestor transforms and native coordinate system. Center it on the actual pressed element at the press instant, including lifted or scaled controls. Recheck after resizes. Use the same press/release timing for the indicator and actual target feedback. Show scrolling with the held indicator following the gesture when required.

Measure scroll targets from current card geometry. Respect the requested card index and scroll distance; when the user asks for centered focus, derive the offset from the visible viewport center. Let each dynamic card run during its reading hold. Count a requested hold after the appearance or assembly has settled. Keep pauses distinct from transition durations, so softening an animation does not consume reading time.

User timing-control preference: **scrubbing and any exposed timing drags or numeric timing edits use a 100 ms (0.1 s) grid**, with clean displayed values rather than floating-point tails. Keep playback and export at the authored frame rate. Preserve precise source timings and saved manual edits until the user actually edits that value; do not quantize an entire existing film or saved config as a side effect.

## Verify, then deliver

Preview and export must use the same time-driven scene function. Review the start, middle, last moving frame, settled frame and next boundary; verify A → B → A seeking and source fidelity. Passing numerical checks does not establish visual quality. One mesh and constant object scale do not prove that a clipped 3D phone looks rigid. Compare the visible silhouette and both endpoints against the current approved source. After two failed patches to one defect, inspect layout, compositing and state ownership instead of accumulating compensations.

Report checks honestly: separate structural checks, strict pixel comparisons, visual review and full decoded-video verification. Quantify small browser antialiasing differences instead of calling a failed strict check a pass. Fix material artifacts before delivery. Do not repeatedly run a broad suite without a new change or unresolved concern.

## Use the existing tool

From the editor checkout or a scene directory:

```sh
node "${CODEX_HOME:-$HOME/.codex}/skills/ui-motion-video/scripts/motion.mjs" inspect
node "${CODEX_HOME:-$HOME/.codex}/skills/ui-motion-video/scripts/motion.mjs" check --draft
```

For another scene pass `--project /absolute/path/to/motion.project.json` or its directory. The helper locates the owning tool and forwards arguments; it does not install dependencies, create an engine or export by itself. Follow the owning project's command help for action or segment exports and quality options. In an Agent News checkout the legacy engine is under `vision-2027/experiments/sculpture/film/`; standalone editors usually expose `tools/motion.mjs`.

This skill does not authorize publishing, inter-agent messages, usage-limit resets or edits to another owner's screens. Existing user authorization governs those actions.
