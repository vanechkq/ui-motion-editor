# Export quality and verification

## Freeze the reviewed inputs

Confirm full-render approval applies to the current preview. Save its exact config, source version and timeline range. If new steering arrives during export, stop the obsolete render promptly and update the existing timeline first. A partial file is not a deliverable. Use a new versioned output name and preserve previous exports.

Determine the final native dimensions, raster scale, fps, duration and audio choice before capture. Check every internal renderer's DPR: a high-resolution browser screenshot cannot repair a WebGL canvas secretly capped below the requested scale. Also check source images and glyph tessellation. HTML/SVG may remain sharp while one embedded layer is soft.

Choose an integer scale whose final dimensions are valid for the delivery codec; H.264/yuv420p needs even dimensions. For example, 412 x 915 at3x has odd height, while2x or4x is even. Do not silently crop or pad the UI to work around it. Scale the composition once; preserve its layout and tap coordinates in native units.

## Encode once from a clean source

Capture lossless PNGs or a suitable lossless master when sharp text and repeated revisions warrant it. A tested SDR RGB-master example is `libx264rgb`, CRF0, `rgb24`. Use a separate playback MP4; the lossless RGB master is not the default compatibility deliverable. Avoid cascaded lossy encodes or recompressing a previous playback file after every edit.

Use the user's compression skill/profile when requested and available. Its default and an explicitly agreed quality override are distinct: the user's standard compression profile may use CRF23, while a particular approved high-quality delivery used CRF16. Preserve explicit overrides and state them; do not turn a project-specific CRF, resolution or bitrate into a universal skill default. If no profile is known, choose and disclose a suitable quality setting rather than calling it the user's rule.

Typical opaque SDR playback delivery uses H.264, yuv420p and faststart, with explicit color matrix/range conversion and consistent tags when needed. Preserve source dimensions, fps and duration. Default to no audio when that is the user's profile or scenario; do not encode a silent audio track as a substitute. Never claim a lossy delivery is mathematically lossless. PNG/RGB-master pixel checks are different from comparisons against chroma-subsampled H.264 output.

Use protected output filenames (`-n` or the engine's equivalent), and preferably write to a partial filename then finalize only after verification. Do not overwrite prior deliverables or source assets. Avoid copying proprietary fonts, private UI assets or working snapshots into a public skill/repository merely to publish the reusable workflow.

## Verify the actual delivery

Run the project's current check before final delivery. Inspect both source and output stream metadata, then fully decode the output independently. Confirm dimensions, fps, duration within one frame, expected frame count and audio streams. Record encoder settings, bytes, hash and any errors. An encoder exit code alone is insufficient; a file can exist but be incomplete or use the wrong timeline.

For a lossless master, decode representative frames and compare RGB pixels against the exact renderer PNGs from the correct cache fingerprint. Match the actual frame index/time. Do not pick the first cache directory with a matching size; old high-resolution caches can coexist. A lossless-master mismatch signals a pipeline or reference-selection problem, not expected H.264 color loss.

Review decoded playback frames for text clarity, orientation, clipping, color, blur seams, token depth, controls and selected content. Inspect the action with the latest change. Report structural checks, strict pixel checks and visual findings separately. If the broad check has known failures, quantify them rather than claiming everything passes.

Deliver the new actual MP4 with a usable local file/download link or native media preview, and briefly state the relevant dimensions/fps/size. Keep the editable project and master available without forcing extra review pages. Preserve previous versions and explain any material quality tradeoff. Do not publish or deploy a video unless separately authorized.
