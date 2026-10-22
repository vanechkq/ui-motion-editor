# Motion quality: recurring failure modes

## Text, controls and particles

Establish settled typography first: font file and weight, native width, line height, letter spacing, line breaks, baseline, glyph advances and transform origin. Keep this layout fixed through the animation. Avoid animating `width`, `height`, `font-size` or CSS `zoom` for a label reveal or highlight; zoom can change font rounding and move the baseline even when the effect looks like a scale. Prefer one whole-control transform and compensate its anchor geometrically when needed. Inspect the baseline in native coordinates at entry, overshoot, hold and return.

Do not promote the label, icon and pill into independently moving or differently scaled layers without a reason. Put shimmer behind text and icons so it cannot wash out their strokes. Check label clipping at both ends. During a real label swap, clip only the moving label viewport; a static label should not crop glyph overhangs. Use a bounded reusable spring for scale and lift, with a readable settled state. Shimmer softness, contrast and speed are separate parameters; check the actual result instead of assuming a lower opacity fixes a harsh streak.

For particle or glyph effects, derive positions from the exact settled layout and original outlines. Before switching between particles and DOM text compare baseline, line breaks, advances, alpha and pixel placement. If that handoff moves text, fix the shared layout or retain one rendering representation through the settled state. Do not disguise a mismatch with another blur or a late opacity swap.

## Screen transitions

Keep status/navigation/chrome separate from moving content. A new opaque screen background can produce an instantaneous white cut even when its content fades in slowly. Fix background ownership and the transition boundary, not just the duration.

Do not dissolve two dense text screens on top of each other: a numerically smooth crossfade can still look like doubled text. When no approved shared-element morph exists, fade or move the outgoing content out before the incoming text becomes readable. A short staged handoff can leave the background and navbar continuous. Shared titles should transition on the same measured anchor; keep the back control stationary when that is the design. When a common motion direction is requested, inspect the signed displacement of every outgoing and incoming text group, including reverse playback. Fading opacity does not excuse opposing travel. Check readable ink and its blur halo against the moving object; DOM rectangles alone may miss a visible collision. Gate a reveal from actual geometry clearance when progress thresholds cease to match after retiming or camera changes.

Use an easing or spring with appropriate start/end velocity. Smoothness is not simply doubling every duration. Preserve the supplied spring curve when retiming it; retain position and velocity across an interrupted phase instead of restarting at rest. Derive the next phase from the last moving object: the feed must not appear before the final stack captures its card, and a settled stack should not wait through an accidental empty tail. A tiny spring residue should not trigger a visible snap.

Keyboard, input, action fade and wash should share one progress function and finish together. Keep the article viewport stable while lifting overlays when the source does so. Coordinate sheet travel and backdrop dimming; begin the answer after the sheet has settled when simultaneous motion makes the text hard to follow. Preserve the source typewriter rhythm and punctuation pauses unless asked to change them.

## Focus cues and loops

For Android Settings search/deep-link emphasis, use a stationary local background tint and a soft shimmer behind the original ink. Do not lift, enlarge, rotate, clone or shadow the whole preference cell when the user asks for this native-style cue. Keep attention styling separate from actual press feedback and the shared Tap. Highlight the requested preference card, not only its switch; keep the switch's press origin on its measured geometry. Hold focus long enough to read before pressing. A request for slower pacing usually means longer reading holds, not stretching every transition.

When a demo must loop without reversing a setting, do not invent a second tap, animate a switch off or run the whole film backward. Hold the successful result, then return to the initial composition through a time-driven transition. Avoid overlapping two readable dense text screens. An immutable initial vector layer can provide a stable reset endpoint without changing source text or geometry. Check the last displayed frame against frame zero, and inspect the moving return and next-cycle entrance as well: identical endpoints alone do not prove a good loop. Include return progress in cache keys, and verify the encoded delivery's seam separately from renderer PNG identity.

## Blur and compositing

A progressive blur is not one uniform filter. Inspect the source's masks, sampling area, cumulative blur and stacking order. Let the effect sample content beyond its visible fade; an input surface that starts mid-line can leak a sharp horizontal edge. Clip or mask each intended band and size it synchronously from the current timeline pose, including lifted buttons. ResizeObserver timing alone is not deterministic.

Status tint should interpolate with the paper appearing or disappearing. Keep its opaque status region separate from the below-status gradient, and keep both below header controls. Check the full-width fade, viewport edges, overscan and stacking contexts; a status overlay must not wash out the close/share glyphs or cast a leftover shadow on the feed.

At phase boundaries retire transition clones decisively. A descendant with explicit `visibility:visible` can escape a parent hidden with visibility; use an appropriate display/ownership boundary at inactive endpoints. Avoid rebuilding the whole scene on every seek. If browser backdrop caching is stale, first inspect the sampling layer and invalidate only the affected persistent effect group, then test both monotonic playback and reverse seeks.

For 3D-to-flat assembly, inherited depth blur must converge to the destination plane. Fade only the obsolete source-depth effect, preserving intentional shadows and final occlusion. Check every token, not only the first or the largest one. Preserve final card position, orientation and velocity at handoff.

## Content visibility and cadence

Measure actual item rectangles after fonts and media load; a fixed pixel scroll is not automatically one card. Assert the selected index and tap center after the scroll. Recheck responsive dimensions and ancestor scales. Trigger video, chart drawing, weather and answer animation from the agreed scene visibility/focus time, not a wall-clock observer that will behave differently during seeking.

A readable hold starts after reveal, typing or assembly completes. Keep it independent of motion duration so a slower entrance does not silently remove the pause. Inspect the last moving frame and one frame after it to catch blinking tokens, late text swaps and early next-screen reveals.

## Source fidelity and review scope

Verify endpoint typography from rendered text and actual font properties, including loaded font file, weight, line breaks and tracking. Instance names or stale layer labels are not copy specifications. Check original effects as well as geometry: a missing ambient shadow or a substituted font weight can make a structurally correct endpoint wrong. Distinguish approved source fog/cropping from new transition artifacts; do not remove a source effect merely to make a metric pass.

Freeze the exact revision before integration and record hashes of code, styles and assets. Keep independent variants and the user's chosen active variant separate; accepting a technical fix does not authorize switching their composition. A return to an older variant restores its known unresolved defects too. Do not describe a revert as a fix.

For a local effect patch, inspect affected phases and adjacent boundaries first. For a new camera, mask or compositing path, inspect the whole short transition in frame order in both directions, plus native-size critical poses. Reuse prior evidence only when unchanged dependencies justify it. State which tests belong to which revision; a targeted patch check is not a repeated full-sequence review.
