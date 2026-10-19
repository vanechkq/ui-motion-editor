# Publishing and maintenance

Repository: `vanechkq/ui-motion-editor`. Original source: MIT. The package remains `private: true` to prevent accidental npm publication; it does not prevent use from GitHub.

## Source boundary

Only the reusable editor, transport, shared components, springs, validation, exporter and two self-contained system-font/SVG demos belong in this repository. Private application assets, editorial media, font outlines and reference snapshots are excluded.

Dependencies remain dependencies, with upstream notices in installed packages. Do not commit `node_modules`, downloaded browser/FFmpeg binaries, `.cache`, `artifacts` or `dist`. The local task log is also excluded.

## Verification

Run `pnpm install --frozen-lockfile`, `pnpm exec playwright install chromium`, `pnpm test`, `pnpm test:browser`, `pnpm build` and the scene checks documented in README.md. GitHub Actions installs browser system dependencies and runs unit/browser checks and the static build on Linux.

The browser editor is hosted at https://vanechkq.com/editor on the owner's existing Yandex static hosting. Video export runs locally. Source updates on GitHub do not automatically upload a new hosted build or publish an npm package. See VALIDATION.md for local measurements and their limits.
