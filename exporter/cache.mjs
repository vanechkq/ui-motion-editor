import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
export const hash = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");
export function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, stable(value[k])]),
    );
  return value;
}
export const digest = (value) => hash(JSON.stringify(stable(value)));
export class FrameCache {
  constructor(root, fingerprint) {
    this.root = path.join(root, fingerprint);
  }
  async get(key) {
    try {
      return await fs.readFile(path.join(this.root, digest(key) + ".png"));
    } catch (e) {
      if (e.code === "ENOENT") return null;
      throw e;
    }
  }
  async put(key, bytes) {
    await fs.mkdir(this.root, { recursive: true });
    const target = path.join(this.root, digest(key) + ".png"),
      temp = target + "." + crypto.randomUUID() + ".tmp";
    await fs.writeFile(temp, bytes);
    await fs.rename(temp, target);
  }
}
