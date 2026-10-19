import { clamp, mix, spring } from "./presets.mjs";
export function sampleTap(dt, motion, pressScale) {
  const p = motion.tap,
    b = p.enter,
    c = b + p.press,
    end = c + p.release;
  if (dt < 0 || dt > end) return null;
  let scale,
    opacity,
    control = 1;
  if (dt < b) {
    const q = spring(dt / b, b, 36, 0.86);
    scale = mix(p.scale[0], p.scale[1], q);
    opacity = clamp(q);
  } else if (dt < c) {
    const q = spring(
      (dt - b) / p.press,
      p.press,
      motion.press.omega,
      motion.press.zeta,
    );
    scale = mix(p.scale[1], p.scale[2], q);
    opacity = 1;
    control = mix(1, pressScale, q);
  } else {
    const q = spring(
      (dt - c) / p.release,
      p.release,
      motion.press.omega,
      motion.press.zeta,
    );
    scale = mix(p.scale[2], p.scale[3], q);
    opacity = clamp(1 - q);
    control = mix(pressScale, 1, q);
  }
  return { scale, opacity, control };
}
export function sceneLayers(layers) {
  for (const [name, node] of Object.entries(layers)) {
    if (!node) throw Error("Missing scene layer: " + name);
    node.dataset.motionLayer = name;
  }
  return Object.freeze(layers);
}
