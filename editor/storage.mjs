const key = "ui-motion-editor:v1";
export function readSaved() {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    if (
      !value.projects ||
      typeof value.projects !== "object" ||
      Array.isArray(value.projects)
    )
      value.projects = {};
    return value;
  } catch {
    return {};
  }
}
export function writeSaved(data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
