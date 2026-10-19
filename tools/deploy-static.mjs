#!/usr/bin/env node
// Upload only /editor objects. No bucket-wide listing, deletion or DNS changes.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, createHmac } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const root = fileURLToPath(new URL("../", import.meta.url));
const host = "storage.yandexcloud.net",
  bucket = process.env.YC_SITE_BUCKET || "vanechkq-site";
const origin = "https://vanechkq.com",
  prefix = "editor/";
const types = {
  ".html": "text/html; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const hmac = (key, value) => createHmac("sha256", key).update(value).digest();
async function files(dir, relative = "") {
  const result = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink() || entry.name.startsWith("."))
      throw Error("Unexpected build entry");
    const name = relative + entry.name;
    if (entry.isDirectory())
      result.push(...(await files(path.join(dir, entry.name), name + "/")));
    else {
      const type = types[path.extname(name)];
      if (!type) throw Error("Unexpected static asset: " + name);
      const body = await fs.readFile(path.join(dir, entry.name));
      result.push({ key: prefix + name, type, body });
    }
  }
  return result;
}
async function read(url) {
  const { stdout } = await promisify(execFile)(
    "curl",
    [
      "-fsSL",
      "--connect-timeout",
      "8",
      "--max-time",
      "30",
      "-w",
      "\n%{content_type}",
      url,
    ],
    { encoding: "buffer", maxBuffer: 8 * 1024 * 1024 },
  );
  const split = stdout.lastIndexOf(10);
  return {
    body: stdout.subarray(0, split),
    type: stdout.subarray(split + 1).toString(),
  };
}
function headers(key, body, type) {
  const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, ""),
    stamp = date.slice(0, 8);
  const scope = `${stamp}/ru-central1/s3/aws4_request`;
  const signed = {
    host,
    "x-amz-acl": "public-read",
    "x-amz-content-sha256": hash(body),
    "x-amz-date": date,
  };
  const names = Object.keys(signed).sort();
  const canonical = [
    "PUT",
    `/${bucket}/${key}`,
    "",
    names.map((n) => `${n}:${signed[n]}\n`).join(""),
    names.join(";"),
    hash(body),
  ].join("\n");
  let signingKey = hmac("AWS4" + process.env.YC_SECRET_ACCESS_KEY, stamp);
  for (const part of ["ru-central1", "s3", "aws4_request"])
    signingKey = hmac(signingKey, part);
  const signature = createHmac("sha256", signingKey)
    .update(["AWS4-HMAC-SHA256", date, scope, hash(canonical)].join("\n"))
    .digest("hex");
  return {
    ...signed,
    "Content-Type": type,
    "Cache-Control": "no-cache, max-age=0, must-revalidate",
    Authorization: `AWS4-HMAC-SHA256 Credential=${process.env.YC_ACCESS_KEY_ID}/${scope}, SignedHeaders=${names.join(";")}, Signature=${signature}`,
  };
}
async function main() {
  const args = process.argv.slice(2);
  if (
    args.some((a) => !["--publish", "--verify-only"].includes(a)) ||
    args.length > 1
  )
    throw Error("Usage: deploy-static [--publish | --verify-only]");
  const items = await files(path.join(root, "dist"));
  const entry = items.find((i) => i.key === prefix + "index.html");
  if (!entry?.body.toString().includes('<base href="/editor/"'))
    throw Error("Build first: pnpm build --base /editor/");
  // Bare /editor also works if the object host does not issue a directory redirect.
  items.push({ ...entry, key: "editor" });
  if (!args.length) {
    console.log(
      JSON.stringify(
        {
          origin,
          writes: items.map((i) => ({
            key: i.key,
            type: i.type,
            bytes: i.body.length,
            sha256: hash(i.body),
          })),
          deletes: 0,
        },
        null,
        2,
      ),
    );
    return;
  }
  const publish = args.includes("--publish");
  if (
    publish &&
    (!process.env.YC_ACCESS_KEY_ID || !process.env.YC_SECRET_ACCESS_KEY)
  )
    throw Error("Hosting credentials are required in the process environment");
  const storage = `https://${host}/${bucket}/`;
  const protectedKeys = [
    "index.html",
    "onboarding/index.html",
    "feed/index.html",
  ];
  const before = new Map();
  for (const key of protectedKeys)
    before.set(key, hash((await read(storage + key)).body));
  if (publish) {
    for (const item of items.sort(
      (a, b) =>
        Number(a.type.startsWith("text/html")) -
        Number(b.type.startsWith("text/html")),
    )) {
      const response = await fetch(storage + item.key, {
        method: "PUT",
        headers: headers(item.key, item.body, item.type),
        body: item.body,
        signal: AbortSignal.timeout(60000),
      });
      if (!response.ok)
        throw Error(`Upload failed: ${item.key} HTTP ${response.status}`);
      console.log("Uploaded " + item.key);
    }
  }
  for (const item of items) {
    const actual = await read(storage + item.key);
    if (
      hash(actual.body) !== hash(item.body) ||
      !actual.type.startsWith(item.type.split(";")[0])
    )
      throw Error("Origin verification failed: " + item.key);
  }
  for (const key of protectedKeys)
    if (before.get(key) !== hash((await read(storage + key)).body))
      throw Error("Another page changed during publication: " + key);
  const publicEntry = await read(origin + "/editor");
  if (hash(publicEntry.body) !== hash(entry.body))
    throw Error("Public CDN has not served the current editor yet");
  await fs.mkdir(path.join(root, "artifacts"), { recursive: true });
  await fs.writeFile(
    path.join(root, "artifacts/hosting-verification.json"),
    JSON.stringify(
      {
        url: origin + "/editor",
        checkedAt: new Date().toISOString(),
        files: items.map((i) => ({ key: i.key, sha256: hash(i.body) })),
        protectedPagesUnchanged: true,
      },
      null,
      2,
    ),
  );
  console.log("Verified " + origin + "/editor");
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
