# Motion quality: recurring failure modes

## Text, controls and particles

Establish settled typography first: font file and weight, native width, line height, letter spacing, line breaks, baseline, glyph advances and transform origin. Keep this layout fixed through the animation. Avoid animating `width`, `height`, `font-size` or CSS `zoom` for a label reveal or highlight; zoom can change font rounding and move the baseline even when the effect looks like a scale. Prefer one whole-control transform and compensate its anchor geometrically when needed. Inspect the baseline in native coordinates at entry, overshoot, hold and return.

Do not promote the label, icon and pill into independently moving or differently scaled layers without a reason. Put shimmer behind text and icons so it cannot wash out their strokes. Check label clipping at both ends. During a real label swap, clip only the moving label viewport; a static label should not crop glyph overhangs. Use a bounded reusable spring for scale and lift, with a readable settled state. Shimmer softness, contrast and speed are separate parameters; check the actual result instead of assuming a lower opacity fixes a harsh streak.

For particle or glyph effects, derive positions from the exact settled layout and original outlines. Before switching between particles and DOM text compare baseline, line breaks, advances, alpha and pixel placement. If that handoff moves text, fix the shared layout or retain one rendering representation through the settled state. Do not disguise a mismatch with another blur or a late opacity swap.

## Screen transitions

Keep status/navigation/chrome separate from moving content. A new opaque screen background can produce an instantaneous white cut even when its content fades in slowly. Fix background ownership and the transition boundary, not just the duration.

Do not dissolve two dense text screens on top of each other: a numerically smooth crossfade can still look like doubled text. When no approved shared-element morph exists, fade or move the outgoing content out before the incoming text becomes readable. A short staged handoff can leave the background and navbar continuous. Shared titles should transition on the same measured anchor; keep the back control stationary when that is the design.

Use an easing or spring with appropriate start/end velocity. Smoothness is not simply doubling every duration. Preserve the supplied spring curve when retiming it; retain position and velocity across an interrupted phase instead of restarting at rest. Derive the next phase from the last moving object: the feed must not appear before the final stack captures its card, and a settled stack should not wait through an accidental empty tail. A tiny spring residue should not trigger a visible snap.

Keyboard, input, action fade and wash should share one progress function and finish together. Keep the article viewport stable while lifting overlays when the source does so. Coordinate sheet travel and backdrop dimming; begin the answer after the sheet has settled when simultaneous motion makes the text hard to follow. Preserve the source typewriter rhythm and punctuation pauses unless asked to change them.

## Blur and compositing

A progressive blur is not one uniform filter. Inspect the source's masks, sampling area, cumulative blur and stacking order. Let the effect sample content beyond its visible fade; an input surface that starts mid-line can leak a sharp horizontal edge. Clip or mask each intended band and size it synchronously from the current timeline pose, including lifted buttons. ResizeObserver timing alone is not deterministic.

Status tint should interpolate with the paper appearing or disappearing. Keep its opaque status region separate from the below-status gradient, and keep both below header controls. Check the full-width fade, viewport edges, overscan and stacking contexts; a status overlay must not wash out the close/share glyphs or cast a leftover shadow on the feed.

At phase boundaries retire transition clones decisively. A descendant with explicit `visibility:visible` can escape a parent hidden with visibility; use an appropriate display/ownership boundary at inactive endpoints. Avoid rebuilding the whole scene on every seek. If browser backdrop caching is stale, first inspect the sampling layer and invalidate only the affected persistent effect group, then test both monotonic playback and reverse seeks.

For 3D-to-flat assembly, inherited depth blur must converge to the destination plane. Fade only the obsolete source-depth effect, preserving intentional shadows and final occlusion. Check every token, not only the first or the largest one. Preserve final card position, orientation and velocity at handoff.

## Content visibility and cadence

Measure actual item rectangles after fonts and media load; a fixed pixel scroll is not automatically one card. Assert the selected index and tap center after the scroll. Recheck responsive dimensions and ancestor scales. Trigger video, chart drawing, weather and answer animation from the agreed scene visibility/focus time, not a wall-clock observer that will behave differently during seeking.

A readable hold starts after reveal, typing or assembly completes. Keep it independent of motion duration so a slower entrance does not silently remove the pause. Inspect the last moving frame and one frame after it to catch blinking tokens, late text swaps and early next-screen reveals.
