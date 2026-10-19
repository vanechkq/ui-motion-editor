import { sampleTap } from "./components.mjs";
import { resolveTokens } from "./tokens.mjs";
export function createTapIndicator({
  parent,
  element,
  tokens = resolveTokens().tapIndicator,
}) {
  const el = element || document.createElement("div");
  if (parent && el.parentElement !== parent) parent.append(el);
  el.dataset.motionComponent = "tap-indicator";
  el.setAttribute("aria-hidden", "true");
  const rgb = tokens.color.match(/[a-f\d]{2}/gi).map((n) => parseInt(n, 16));
  Object.assign(el.style, {
    position: "absolute",
    zIndex: "1000",
    width: tokens.diameter + "px",
    height: tokens.diameter + "px",
    borderRadius: "50%",
    background: `rgba(${rgb.join(",")},${tokens.alpha})`,
    backdropFilter: `blur(${tokens.blur}px)`,
    maskImage: `radial-gradient(circle closest-side,#0000 ${tokens.inner * 100}%,#000 ${tokens.edge * 100}%)`,
    pointerEvents: "none",
    // Keep the masked blur on a persistent layer across arbitrary seeks.
    willChange: "transform, opacity",
    opacity: "0",
  });
  return {
    element: el,
    tokens,
    hide() {
      el.style.opacity = "0";
    },
    render({ time, start, x, y, target, pressScale = 0.95, motion }) {
      const m = motion || { tap: tokens, press: tokens.spring },
        pose = sampleTap(time - start, m, pressScale);
      if (!pose) {
        this.hide();
        return null;
      }
      el.style.left = x + "px";
      el.style.top = y + "px";
      el.style.opacity = pose.opacity;
      el.style.transform = `translate(-50%,-50%) scale(${pose.scale})`;
      if (target) target.style.transform = `scale(${pose.control})`;
      return pose;
    },
  };
}
