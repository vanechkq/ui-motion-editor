# Shared 3D objects and screen handoffs

Use this reference for transitions in which a phone or another rigid object moves between UI compositions. Preserve approved camera/dolly intent; the values below describe checks, not a universal camera recipe.

## Projected shape, camera and masks

Keep one rigid object and interpolate its orientation continuously. Distinguish physical object scale, camera zoom, projected dimensions and the portion remaining visible after masks. A constant mesh scale or stable object ID proves ownership, not the absence of visible stretching.

Measure the projected body using its actual outline, including front/back depth and rounded edges where relevant. A projected center or four planar corners can underestimate a tilted body's silhouette. Use those bounds to align camera framing and endpoints. If matching apparent width, derive zoom from the desired projected width and remeasure the resulting bounds; do not independently animate width and height to force a fit. Preserve an explicitly approved dolly rather than flattening it to fix a mask defect.

Inspect visible head, foot, rounded corners, side edges and display together at intermediate poses. Two opposing crops can make a rigid phone look like an extending tube. A moving lower fade may remove the rounded foot before the upper crown has emerged from a card. Coordinate the crop with actual head clearance; retain the intended silhouette until the reveal can expose the next part cleanly. Check the result, not only an algebraic bound.

Audit every clipping level: WebGL canvas, viewport, card clip, CSS mask and shadow surface. Provide enough overscan for the requested camera path and effects. Make a fade reach transparent before its sampling surface ends; otherwise the final fractional alpha turns into a hard line. Do not expand the approved card into a fullscreen white surface as a workaround unless that variant is requested.

## Dense blur without blank or doubled screens

A direct crossfade between dense sharp screens produces readable double text. A sparse Gaussian shader can produce repeated pill outlines, ghost gestures or a sampling grid even when its weights sum correctly. Inspect native-size neighbouring frames around the texture handoff, not only its midpoint.

One useful implementation is to prepare sufficiently sampled blurred versions of both screen textures once, then move from old sharp to old blurred, hand off between blurred screens, and resolve to new sharp. Choose blur radius for the actual texture/native scale. Pad or extend edges before filtering, preserve color space and alpha, and retain source aspect ratio. Do not rebuild a CPU blur texture every frame. A dense separable GPU blur or suitable blur pyramid can also work; use the existing engine's best fit.

Avoid a blank screen reset as a substitute for a continuous handoff. Validate that all relevant states share the intended projection and UV fit, and wait for image decoding and texture readiness before the first capture.

## Typography, shadows and evidence

Account for blur support when checking text/object separation: for a Gaussian, roughly three sigma is a useful diagnostic halo, not a guarantee of visual clearance. Test all frames where text remains visible and inspect near-threshold poses. Trigger incoming text from measured clearance if a simple progress gate causes collisions.

Match the approved endpoint's shadow model. CSS `drop-shadow` blur is not automatically the same parameter as a design tool's shadow radius; compare the visible spread and falloff. Apply the effect to the intended silhouette and ensure its containing surface does not clip it. Keep deliberate source fog distinct from inherited depth blur that must disappear at assembly.

Capture the start, critical crops, texture handoff, final motion and endpoint in both directions. Include A → B → A exact-state checks and real control interruption checks. Report separately: rigid geometry/ownership, visible silhouette, text clearance, texture sampling, source fidelity and determinism. A pass in one category cannot close a failure in another.
