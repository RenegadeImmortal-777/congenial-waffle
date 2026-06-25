# Vendored pdf.js (legacy, non-module build)

**Version:** 3.11.174
**Source:** `pdfjs-dist@3.11.174` npm package, `legacy/build/` directory
**License:** Apache License 2.0 (Mozilla Foundation) — see the license header at the
top of each file.

## Why these files are checked into the repo

PDF text extraction in `app.js` (`extractPdfText`) runs entirely in the browser
using pdf.js. These files used to be loaded from `cdnjs.cloudflare.com` at
runtime. That meant any disruption reaching that CDN — an ad blocker, a
corporate firewall, a regional outage, cdnjs reorganizing paths — broke PDF
uploads for users, with no way for us to fix it without waiting on a third
party.

Vendoring the files here means PDF parsing has no runtime dependency on any
external host. The trade-off is that we now own keeping them up to date.

## Files

- `pdf.min.js` — the main pdf.js library, loaded via `<script>` tag in `app.html`.
- `pdf.worker.min.js` — the background worker pdf.js uses to parse PDFs off
  the main thread. Referenced via `pdfjsLib.GlobalWorkerOptions.workerSrc` in
  `app.js`.

Both are from the `legacy/` build (not the root `build/` or any `.mjs`
module build), because `app.html` loads pdf.js with a plain `<script>` tag,
not `type="module"`. Versions of pdf.js from v4 onward dropped the
classic-script `legacy` build's broad compatibility guarantees in favor of
ES modules — if you upgrade past v3.x, you'll likely need to switch
`app.html`/`app.js` to `<script type="module">` and update the worker setup
(`pdfjsLib.GlobalWorkerOptions.workerSrc` import style changes too).

## How to update

1. Download the new version: `npm pack pdfjs-dist@<version>` (no need to add
   it as a project dependency — this app intentionally has none).
2. Extract the tarball and copy `legacy/build/pdf.min.js` and
   `legacy/build/pdf.worker.min.js` here, overwriting the old ones.
3. Update the version number at the top of this file.
4. Smoke test a PDF upload in the app before deploying.

## Routes

These files are served via the explicit `STATIC_FILES` allowlist in
`server.js` (`/vendor/pdfjs/pdf.min.js`, `/vendor/pdfjs/pdf.worker.min.js`),
the same pattern used for every other static asset in this app — there is no
generic static-directory mount.
