# Deterministic preview, adapters and cache

## Time and imported interactions

Prefer a pure `seek(time)` over replaying clicks in real time. Use one absolute timeline for preview, frame checks and export. Retiming should map presentation time to source time continuously; carry positions, spring velocities, media time and typing position across action boundaries. Preserve the current editor config and selection when updating a scene.

An existing interactive implementation can be adapted in an isolated copy without reimplementing its design. If using a virtual clock, own timer ordering, timer cancellation, WAAPI currentTime and completion, CSS transitions/animations and relevant microtasks. Merely pausing WAAPI does not control setTimeout-driven typing or animation-finished state changes. Resolve completion callbacks at virtual deadlines, flush layout/styles at those boundaries, and sample the same keyframes used by the source. Give equal-time events a stable order. Do not leave CSS shimmer or carets running on wall-clock time.

On a reverse seek, either reconstruct state directly or restore a clean source instance and replay events to the requested time. Wait for fonts, image decoding and required media before measuring or capturing. Avoid reloads on ordinary forward frames. When reconstruction is asynchronous, serialize it and coalesce pending preview requests to the newest time; overlapping reverse seeks can otherwise start thousands of iframe reloads while the editor appears stuck. Resolve/reject all callers correctly. Export must await the selected state before capturing.

A timeline that seeks correctly in a headless sequential test can still fail during rapid live scrubbing. Check a fast forward/back interaction in the existing editor when changing asynchronous seek ownership. Measure live preview frame intervals separately from encoded fps; never infer smooth live playback from a 60 fps file.

Use seeded randomness, fixed particle topology and time-derived noise for repeatable effects. Drive video by explicit media time and decoded readiness. Mute editorial media before previews. Ensure a reading hold's visual key still includes any changing video, typing cursor, weather, shimmer or pulse state.

## Inspection is not a cache read

A cached frame can be returned without seeking the browser DOM. Therefore, do not read geometry, DOM state or motion ownership after an ordinary cache hit and assume it represents that timestamp. Use the engine's fresh/audit capture path or an explicit awaited seek before inspection. This distinction matters especially when diagnosing A → B → A defects.

Compare exact pixels where reproducibility is expected. When a strict comparison fails, inspect changed-pixel count, maximum channel error and location. Two low-amplitude antialiasing pixels in an unchanged keyboard are different evidence from a shifted label, stale blur input or a card jumping. Keep the failing strict result in the report, and do not relabel it as a pass or repeat broad checks hoping for a lucky run.

## Cache reuse

Cache keys must include rendering inputs: source/style/asset hashes, relevant config, composition, device scale, renderer/browser and platform where they affect pixels, and the visible pose. Use source-time or pose keys for truly identical reading holds so timing changes can reuse them. Keep cache behavior separate from DOM inspection.

Do not reuse old frames merely because they occur outside the named action. A global stacking context, typography change, DPR or shader change can affect other phases. Prefer the existing fingerprint's automatic invalidation. Manual cross-version reuse needs an explicit unaffected dependency/interval argument plus fresh representative comparisons. If exact equivalence is not established, render the uncertain interval. Record source and target fingerprints, what was reused and why.

Reuse lossless renderer PNGs or lossless segments, never an old compressed MP4 as the visual source for a new edit. Treat caches as immutable: link/copy known-good entries, and write new entries atomically. After cancellation, preserve valid cache entries but do not present a partial video as complete. Measure cold, warm and changed-action runs; report actual capture/hit counts and elapsed time instead of an assumed speedup.

## Focused checks

Review the actual changed action first: entry, middle, overshoot/last motion, settle and the next boundary. Include at least one return from another phase when effects use backdrop sampling, imported state or transition clones. Check semantic invariants as well: correct selected card, one status bar, correct input height, loaded icons, empty input when no submission was requested, and completed answer before the final hold.

Update obsolete hardcoded test times when the approved timeline changes. A failed legacy assertion does not prove a new visual defect, but passing unrelated old checks does not validate the new scenario either. Preserve original failure evidence and run checks against the current scene contract.

## Real controls and reversals

Test the actual UI entry, close/back and keyboard handlers, including an interruption in each direction. A direct call to a transition function does not establish that a visible button is clickable or that its handler chooses the right target. Keep hit testing synchronized with visibility; a transparent control must not intercept the visible one. After `seek()` or `setProgress()`, reconcile the interactive target so Space or the next click moves in the expected direction.

On reversal preserve both pose and velocity at the event boundary. A seek may deliberately set a deterministic state, while a live reversal must not reset the object to rest. Sample immediately before and after the actual event. Do not hide dropped wall-clock time behind a frame-delta cap and then call live playback equivalent to the authored curve; document any deliberate catch-up policy.

Check the final moving frame against the settled endpoint in both directions. Clamp only after the residual is visually negligible; quantify a remaining pixel difference rather than assuming a small progress error is invisible. For intermittent differences, repeat the same pose within the same loaded session before attributing them to font rasterization or cross-session antialiasing.
