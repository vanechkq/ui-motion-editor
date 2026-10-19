# Local validation — 19 October 2026

Validated on macOS arm64 with Node 22+ compatible source, pnpm 11.25.0 and Playwright Chromium 141.0.7390.37. This records a local release candidate, not a claim about every browser or device.

## 100 ms editing update

Action movement, both resize handles and numeric timing edits now use 100 ms steps with at most one decimal place. The targeted browser check also verifies rounding `1.066667` to `1.1`, ArrowUp advancing to `1.2`, draft retention and non-overlap. Internal rendering/export stays at 60 fps. This supersedes the earlier editor's frame-sized interaction step; imported/source timelines retain frame precision.

## Current candidate — timing-v1

Integrated and verified SCULPTURE-028 v1 and SCULPTURE-029 v1 locally on 19 October 2026. The earlier measurements below remain historical; this section records the current candidate.

- Unit tests: **11/11**. Browser integration/UX/accessibility tests: **11/11**. Static build passes.
- Action center/edge dragging and numeric start/duration work at 60 fps with a two-frame minimum, no overlap and preserved gaps when later actions shift. Escape restores the state before a drag, including while a numeric field retains focus.
- Both public scene adapters update timing without iframe loads or rebuilding persistent DOM layers. Draft text survives timing edits; saved configuration and reload preserve the actual action intervals. View-only adapters do not show editing controls.
- The inspector distinguishes base motion settings at 1× from the selected action's actual interval. Automated accessibility checks also cover the selected timing controls.
- Timeline clearance measures 39–41 px below the final track at viewport widths 320, 520, 820 and 1440 px. The mobile inspector aligns with the taller timeline. A synthetic static top strip cannot cover the root-level Tap overlay.
- Unedited timeline defaults remain 4.2 s (cards) and 3.65 s (toggle). Retimed CLI checks passed exact A → B → A comparisons, loop endpoints and scene invariants, including reading holds; 69 captures per scene. A retimed pose matches its corresponding source pose exactly.
- Additional first-frame regression: 20 independent source/retimed session pairs matched exactly. The exporter now waits for two initial animation frames so the compositor commits its initial layers before the first arbitrary seek. Card screen layers also remain promoted across scale changes. No pixel comparison tolerance was introduced.
- In-app browser: choosing an action exposes numeric timing; changing duration to 1.5 s immediately updates the timeline, later action and URL. Desktop screenshot and decoded midpoint/end frames were visually reviewed.

| Retimed export | Frames | Captures | Cache hits | Total |
| --- | ---: | ---: | ---: | ---: |
| Cards, cache reads bypassed | 320 | 320 | 0 | 10.758 s |
| Cards, warm cache | 320 | 0 | 320 | 0.557 s |
| Opening action, warm cache | 90 | 0 | 90 | 0.356 s |
| Toggle, partially warm cache | 293 | 48 | 245 | 1.953 s |

Separate FFmpeg inspection confirmed H.264/yuv420p, 60 fps, expected dimensions and successful complete decode. Cards: 640 × 480, 5.333333 s; toggle: 360 × 360, 4.883333 s; opening action: 1.5 s. Fresh and warm cards files share SHA-256 `a87083da241c069b43c9f2e0f51b1cc64dcf443255a1a520b11befd3bf048ea0`.

Evidence is in ignored `artifacts/timing-v1/`: UI screenshots, clearance measurements, Tap overlay, exact-seek reports, videos, config/action sidecars and independent decode logs. Previously failed diagnostic frames are retained with `failed` in their names; they are not release evidence. Physical devices and other operating systems remain untested. No remote publication occurred.

## Initial interface pass

- Unit tests: 6/6 pass.
- Browser integration/UX/accessibility tests: 7/7 pass.
- Both scene adapters: exact A → B → A pixel equality at review boundaries and five dispersed times; exact loop endpoints.
- Additional compositor regression check: 20 independent browser sessions, 340 seek comparisons, all exact after the persistent Tap layer fix. No pixel tolerance was introduced.
- Automated WCAG 2 A/AA and 2.1 AA checks: zero reported violations in the editor's desktop, connection dialog and mobile inspector states. Scene iframe excluded; this is not a full accessibility certification.
- Layout/keyboard checks: 320 px viewport and 640 × 450 compact viewport (equivalent layout viewport at 200% zoom), tabs/Space/arrows/Home/End/Escape, selection/drag/zoom/loop, imports/errors, draft retention and save/reset.
- In-app browser: play/pause, selected episode retained while playing, empty-space click returns to whole-film selection.
- Independent clean source copy: frozen dependency install, static build, timeline inspection and frame rendering passed without the original workspace or fixed server paths.
- Full/partial MP4 files decoded without errors. Independent FFmpeg stream inspection confirmed H.264/yuv420p and 60 fps. Cards: 640 × 480, 252 frames, 4.2 s; toggle: 360 × 360, 219 frames, 3.65 s; opening action: 47 frames, 0.783333 s.

## Fixes verified in this pass

1. Spring overshoot produced a negative CSS mask radius near the end of card expansion. The browser retained an earlier mask, causing a visible late jump. Mask geometry now clamps at the stage boundary; actual before/after-boundary pixels are checked.
2. A rare masked-blur compositor difference affected 3 pixels by 1/255 in the toggle scene. Keeping Tap on a persistent transform/opacity layer removed the observed discrepancy across the 20-session regression run. Failed earlier QA remains only among ignored local artifacts.
3. Draft fields no longer disappear when switching inspector tabs or projects, or refreshing. Save applies all pending fields before downloading.
4. Loading is transactional: invalid manifests/configs preserve the working scene. Controls reflect loading/disabled states and errors can be dismissed.
5. Empty-space/ruler clicks clear episode selection; transport and field controls preserve it. Loop overshoot and final-frame progression are handled by the shared clock.
6. Focused buttons use their normal Space behavior; dialog/field shortcuts do not start playback. Tabs support arrow navigation, the playhead supports keyboard seeking, and the mobile inspector has close/Escape behavior.
7. Fractional alpha initializes after input constraints; the inspector displays its numeric percentage. Inactive tab contrast was corrected.

## Measured export timings

Each measurement includes browser preparation, rendering/cache reads, encoding and independent decode on this machine. `--fresh` bypasses every cache read, including identical holds, so its capture count is intentionally larger than a normal first export.

| Export                             | Frames | Captures | Cache hits |   Total |
| ---------------------------------- | -----: | -------: | ---------: | ------: |
| Cards, cache reads bypassed        |    252 |      252 |          0 | 8.212 s |
| Cards, warm cache                  |    252 |        0 |        252 | 0.472 s |
| Toggle, first full export          |    219 |       95 |        124 | 3.444 s |
| Opening action, warm cache         |     47 |        0 |         47 | 0.250 s |
| Edited title + Tap, opening action |     47 |       47 |          0 | 1.690 s |

The fresh and warm cards MP4 SHA-256 values are identical. These observations are not speed guarantees for other scenes, computers or video sizes. Preview frame pacing was not benchmarked as a display-performance claim.

Generated screenshots, decoded boundary frames, detailed reports and video sidecars are under ignored `artifacts/`. Run the documented commands to regenerate them. `node_modules`, caches, browser binaries, videos and private source materials are not included in the source archive.

## Publication scope

Source publication authorized by the owner on 19 October 2026: `vanechkq/ui-motion-editor`, with MIT source license. Physical mobile devices and other operating systems remain untested.
