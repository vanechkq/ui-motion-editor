# Editor interface and timing controls

These are this user's video-editor preferences. Apply them when implementing editor controls, not as an unsolicited redesign during a scene correction.

## Small playback surface

Show a large preview, a clean scene dropdown, a collapsible parameter panel and a compact player. Playback needs one seek control, speed segments **¼× / ½× / 1×**, and play/pause. The user explicitly removed the multi-track editing surface and corner logo. Do not restore lanes, action blocks, track zoom or range-selection controls merely because the scene internally uses an action timeline.

The seek control should match the parameter sliders: a wide rounded row, progress as an inset background fill, a label on the left and current seconds on the right. Avoid substituting a thin native range track. Keep all speed choices visible in a segmented control; show the selected state and support arrow-key navigation. Keep scene labels readable, truncate long labels cleanly and preserve the actual selected project after a failed load.

## DialKit integration

Use actual DialKit controls when adopting its interface. Official documentation: https://joshpuckett.me/dialkit and https://github.com/joshpuckett/dialkit. Inspect the installed/current API before coding. A plain JavaScript editor does not need a React rewrite: the verified 2.0.2 package has a self-contained vanilla module and stylesheet. Pin the dependency; for an offline vendored distribution retain its MIT license and version/provenance. Do not add runtime CDN fetches to deterministic capture.

Relevant vanilla mounts include `mountSlider`, `mountSegmentedControl`, `mountSelectControl`, `mountFolder`, `mountColorControl` and `mountTextControl`. Bind them to the existing scene/transport and config validation. Do not create a second playback clock, replace source rendering or change export parameters as part of styling. Follow the existing draft/apply contract if the adapter requires remounting; do not advertise live parameter changes unless the scene actually updates while dragging.

Programmatic seek updates must update the control without recursively invoking its user-change handler. Switching scenes updates the slider's maximum and current time. A speed change affects transport time only; it must not rewrite the authored duration or export FPS. Disable/inert custom controls during loads as well as native inputs. Preserve config URLs, saved presets and the current project; do not seed another UI library's defaults over them.

## 100 ms interaction grid

User-authored time edits use `Math.round(seconds * 10) / 10`. Apply it to scrub gestures, timing drags and numeric timing commits. Show a short decimal representation (`1.1 s`, not `1.066667` or `1.1000000000000001`). Use a 0.1 step for keyboard interaction too; a 0.001 input step followed by rounding to 0.1 makes arrow keys appear broken.

Keep playback/export on the frame clock. A 60 fps source may legitimately contain timings that are not multiples of 0.1. Opening a project, switching scenes, restyling the editor, reading a config or drawing a slider must not round those saved values. Only an actual user timing edit is snapped. The last seek boundary may be the final source frame rather than a grid multiple; allow reaching it exactly. Separate display precision from that endpoint: some sliders infer decimals from their min/max, so a frame boundary such as `8.533333333333333` can make every label print a floating-point tail despite a 0.1 step. Use an explicit display formatter, or a rounded presentation range that maps its end to the exact last source frame. Verify both readable labels during playback and exact endpoint seeking; do not round the underlying timeline to fix the widget.

## Check the control, not only its appearance

Verify click/drag and numeric entry, keyboard stepping, segment selection and arrow navigation, play/pause after seeking, scene switching and duration changes. Check draft/apply/reset/save when parameter controls change. An unchanged token diameter does not prove an unchanged Tap: measure the native bounding box, scale curve, ancestor transforms and center at press time. If the reference matches, report it; do not silently invent a size correction. A later request to restore the previous Tap means restore its known parameters.

For narrow layouts measure the actual header, play button, scrubber and speed-group rectangles against viewport bounds. `scrollWidth <= innerWidth` can pass while an intrinsically wide grid child is clipped by overflow. Use shrinking grid columns (`minmax(0, 1fr)`) and bounded menu/input widths. Confirm the parameter overlay opens/closes by keyboard and does not obscure playback controls. Save the result in the existing editor, not a new review page.
