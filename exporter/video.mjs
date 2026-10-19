import { spawn } from "node:child_process";
import ffmpegStatic from "ffmpeg-static";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
export const ffmpeg = process.env.MOTION_FFMPEG || ffmpegStatic;
export function exportRange(timeline, options = {}) {
  const action =
    options.action && timeline.actions.find((a) => a.id === options.action);
  if (options.action && !action)
    throw Error(`action: unknown id ${options.action}`);
  const from = Number(options.from ?? action?.from ?? 0),
    to = Number(options.to ?? action?.to ?? timeline.duration);
  if (
    !Number.isFinite(from) ||
    !Number.isFinite(to) ||
    from < 0 ||
    to <= from ||
    to > timeline.duration + 1e-7
  )
    throw Error(`range: expected 0 ≤ from < to ≤ ${timeline.duration}`);
  return { from, to, fps: 60, frames: Math.ceil((to - from) * 60 - 1e-7) };
}
export async function encodeVideo(
  session,
  out,
  range,
  { replace = false } = {},
) {
  if (!replace) {
    try {
      await fs.access(out);
      throw Error("Output exists; choose another path or use --replace");
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
  }
  await fs.mkdir(path.dirname(out), { recursive: true });
  const temp = out + "." + crypto.randomUUID() + ".tmp.mp4";
  const proc = spawn(
    ffmpeg,
    [
      "-y",
      "-v",
      "error",
      "-f",
      "image2pipe",
      "-vcodec",
      "png",
      "-framerate",
      "60",
      "-i",
      "pipe:0",
      "-an",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "18",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      temp,
    ],
    { stdio: ["pipe", "ignore", "pipe"] },
  );
  let stderr = "",
    failure;
  proc.stderr.on("data", (b) => (stderr += b));
  proc.stdin.on("error", (e) => {
    failure = e;
  });
  const finished = new Promise((resolve) => {
    proc.once("error", (e) => {
      failure = e;
      resolve(-1);
    });
    proc.once("close", resolve);
  });
  try {
    for (let n = 0; n < range.frames; n++) {
      if (failure || proc.exitCode !== null)
        throw Error(`FFmpeg: ${stderr || failure || "exited early"}`);
      const bytes = await session.frame(range.from + n / 60);
      await new Promise((resolve, reject) =>
        proc.stdin.write(bytes, (e) => (e ? reject(e) : resolve())),
      );
    }
    proc.stdin.end();
    const code = await finished;
    if (code !== 0) throw Error(`FFmpeg: ${stderr || failure}`);
    if (replace) await fs.rename(temp, out);
    else {
      await fs.link(temp, out);
      await fs.unlink(temp);
    }
  } finally {
    if (proc.exitCode === null) proc.kill();
    await fs.rm(temp, { force: true });
  }
}
export async function decodeVideo(out) {
  const proc = spawn(
    ffmpeg,
    [
      "-v",
      "error",
      "-i",
      out,
      "-map",
      "0:v:0",
      "-f",
      "null",
      "-",
      "-progress",
      "pipe:1",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  let progress = "",
    errors = "";
  proc.stdout.on("data", (b) => (progress += b));
  proc.stderr.on("data", (b) => (errors += b));
  const code = await new Promise((resolve, reject) => {
    proc.once("error", reject);
    proc.once("close", resolve);
  });
  if (code || errors.trim()) throw Error(`Video decode failed: ${errors}`);
  const frames = Number([...progress.matchAll(/^frame=(\d+)/gm)].at(-1)?.[1]);
  if (!frames) throw Error("Video decode produced no frames");
  return { frames, errors: [] };
}
