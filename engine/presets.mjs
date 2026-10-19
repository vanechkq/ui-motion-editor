import { tapIndicator } from "./tokens.mjs";
export const clamp = (x) => Math.max(0, Math.min(1, x));
export const mix = (a, b, t) => a + (b - a) * t;
export const presets = {
  press: { ...tapIndicator.spring, duration: tapIndicator.press },
  open: { omega: 28, zeta: 0.86, duration: 0.42 },
  close: { omega: 29, zeta: 0.86, duration: 0.38 },
  label: { omega: 25, zeta: 0.88, duration: 0.3, blur: 4, offset: 8 },
  tap: {
    enter: tapIndicator.enter,
    press: tapIndicator.press,
    release: tapIndicator.release,
    scale: tapIndicator.scale,
  },
  scale: { card: 0.95, button: 0.94, close: 0.92 },
};
export function response(t, omega, zeta) {
  if (t <= 0) return 0;
  const wd = omega * Math.sqrt(1 - zeta * zeta);
  return (
    1 -
    Math.exp(-zeta * omega * t) *
      (Math.cos(wd * t) + ((zeta * omega) / wd) * Math.sin(wd * t))
  );
}
export function spring(u, duration, omega = 28, zeta = 0.82) {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  return response(u * duration, omega, zeta) / response(duration, omega, zeta);
}
export function springPreset(u, p) {
  return spring(u, p.duration, p.omega, p.zeta);
}
