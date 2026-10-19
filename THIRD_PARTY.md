# Dependencies and source policy

Runtime packages are pinned in `pnpm-lock.yaml`. Their installed license texts remain in their respective packages and apply independently from the original project's MIT source license.

- Playwright (Apache-2.0): browser automation; its package and browser distributions include their own licenses/notices.
- pngjs (MIT): PNG decoding for pixel comparisons.
- ffmpeg-static (GPL-3.0-or-later): encoder distribution wrapper; the downloaded FFmpeg binary has its own build configuration and licensing terms. It is downloaded during installation and is not bundled in this source tree. `MOTION_FFMPEG` can select another installed build.
- @axe-core/playwright (MPL-2.0) and axe-core: development-only automated accessibility checks for the editor interface.
- Prettier (MIT): development-only source formatting.

The two demos use system fonts and authorable HTML/CSS/inline SVG. There are no bundled fonts, external icon URLs, editorial images, downloaded references or paper-effect dependencies. MP4, PNG and browser test outputs are generated artifacts and ignored by Git.

Original editor and example source is licensed under MIT; see LICENSE. Dependency and binary licenses apply separately.
