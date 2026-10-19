import { validateScene } from "./validation.mjs";
/** Publish only after fonts/assets are ready. seek must be a pure function of time. */
export function publishScene(scene) {
  validateScene(scene);
  window.motionScene = scene;
  scene.seek(0);
  parent.postMessage({ type: "motion-ready" }, location.origin);
  return scene;
}
