# MedPass

AI tutor app with email/password auth (verification + reset). Zero npm
dependencies — built entirely on Node's built-ins (`http`, `node:sqlite`,
`node:crypto`).

## Requirements

- Node.js **v22+** (for `node:sqlite`)

## Setup

```bash
cp .env.example .env
```

Edit `.env` and set `SESSION_SECRET` to a long random string. Generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Leave `GROQ_API_KEY` and `SMTP_*` blank for now — see below.

No `npm install` needed.

## Run

`.env` is **not** loaded automatically — there's no `dotenv` dependency.
Start the server with Node's built-in `--env-file` flag:

```bash
node --env-file=.env server.js
```

(Running plain `node server.js` will fail with a `SESSION_SECRET is missing`
error, since none of the `.env` values reach `process.env` that way.)

Open **http://localhost:3000** — it redirects to `/login.html`.

## Testing without real email

Sign up on `/signup.html`. Since `SMTP_*` isn't set, the signup response
includes a `devVerifyLink` and the page shows a clickable "dev mode"
verification link directly — no real email required. Same for
`/forgot-password.html` (`devResetLink`).

## Two things to know

1. **No `GROQ_API_KEY`** → `/api/ai/chat` returns a clean `503` instead of
   crashing. Fine for testing auth end-to-end; set the key to enable the
   tutor for real. Default model is `openai/gpt-oss-20b` (set `GROQ_MODEL`
   in `.env` to override). Default vision model (used automatically
   whenever a message includes an image) is
   `meta-llama/llama-4-scout-17b-16e-instruct` — override with
   `GROQ_VISION_MODEL`. Note: Groq lists Scout as a preview model, so check
   [console.groq.com/docs/vision](https://console.groq.com/docs/vision) if
   image replies ever start failing — `qwen/qwen3.6-27b` is the current
   alternative vision model on Groq.
   - The text model (`openai/gpt-oss-*`) is a *reasoning* model — it spends
     part of its token budget on hidden chain-of-thought before writing the
     visible answer. If that budget is too small, you can get back an empty
     reply with `finish_reason: length` even though the call "succeeded."
     `max_completion_tokens` defaults to `4096` (override with
     `GROQ_MAX_TOKENS`) and `reasoning_effort` defaults to `low` (override
     with `GROQ_REASONING_EFFORT`: `low`/`medium`/`high`) to leave room for
     the actual answer.
   - **Large attachments are sent as batches automatically.** If a text
     attachment (PDF/notes) produces more than ~6000 characters of extracted
     text and there are no images in the message, the client splits it into
     ~4000-character chunks — preferring to keep whole numbered questions or
     paragraphs intact — and sends them as separate sequential requests
     instead of one oversized message. This avoids both the empty-reply
     issue above and Groq's per-minute token cap (8000 TPM on the free/
     on-demand tier at time of writing). A progress bar with a cancel button
     shows above the composer while a batch is running, and each part
     appears as its own turn in the chat log. Pacing between batches uses
     Groq's live `x-ratelimit-remaining-tokens` / `x-ratelimit-reset-tokens`
     response headers (forwarded by `/api/ai/chat` as a `rateLimit` field)
     when available, falling back to a fixed 2s delay otherwise. One part
     failing doesn't stop the rest — it's reported inline and the batch
     continues. Tune the thresholds via `BATCH_TRIGGER_CHARS` and
     `BATCH_CHUNK_CHARS` near the top of `public/app.js`.
2. **Don't just drop `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` into `.env`.**
   `lib/mailer.js` is a stub — setting those values flips the app into
   thinking real mail works, which *disables* the dev-link fallback, and
   the actual send then throws and gets silently swallowed. Net effect:
   signup/reset appear to succeed but no email goes out and no link is
   shown anywhere — worse than the dev-mode behavior. Wire up a real
   transport (nodemailer, Postmark, Resend, SES, etc.) in `sendMail()`
   before setting those vars.

## File attachments in the tutor chat

The composer has an attach button (📎) next to the message box, supporting:

- **Text files** (`.txt`, `.md`) — read directly and appended to your message.
- **PDFs** — text is extracted client-side using [pdf.js](https://mozilla.github.io/pdf.js/)
  (loaded from cdnjs, classic non-module build `3.11.174`). Scanned/image-only
  PDFs with no text layer will show an error chip — screenshot the page and
  attach it as an image instead.
- **Images** (PNG/JPEG/WEBP/GIF) — resized client-side (longest edge capped
  at 1600px, recompressed to JPEG) before sending, then sent to a
  vision-capable Groq model alongside your text.

Limits: up to 6 files per message, up to 5 images per message (Groq's own
per-request cap), each original file under 20MB before client-side
processing. The server independently re-validates everything (file type,
image data-URL scheme/size, image count) — client-side limits are for UX,
not the security boundary.

`server.js`'s CSP was extended to allow scripts/workers from
`cdnjs.cloudflare.com` (for pdf.js) and `blob:` image sources (for the
canvas-based image resizing) — everything else stays locked to `'self'`,
same as the rest of the app.

## Fixed: CSP was silently blocking the sign-in/signup forms

Each auth page's actual logic (the submit handlers) used to live in an
inline `<script>` block. `server.js` sets `Content-Security-Policy:
script-src 'self'` with no `'unsafe-inline'`, so browsers silently refuse
to run those inline blocks — clicking "Sign in" (or any of the other
forms) did nothing, with no visible error unless you opened DevTools →
Console. Fixed by moving each page's logic into its own external file
(`login-init.js`, `signup-init.js`, `forgot-password-init.js`,
`reset-password-init.js`), registered as static files in `server.js`. CSP
stays strict; nothing needed loosening.

## What's been verified end-to-end (this session, locally)

- Static pages, `/`→`/login.html` redirect, security headers
  (CSP/X-Frame-Options/nosniff)
- Signup → 201, duplicate → 409, weak password / bad email → 400
- Auto-login on signup, but `app.html` / AI chat blocked until verified (403)
- Verify-email: browser navigation → redirect, API call → JSON; token is
  single-use
- Forgot-password: identical response for real vs. nonexistent email (no
  account enumeration)
- Reset: weak password rejected, old session killed, token single-use, old
  password rejected, new password works
- Logout kills session; rate limiting (10 attempts / 15 min on login) kicks
  in correctly
- AI proxy: clean 503 with no key; legacy plain-text `content` still works
- Attachment validation: malformed content type → 400, non-`data:` image
  URL → 400, unsupported part type → 400, >5 images → 400, a realistic
  ~2MB base64 image payload passes validation and reaches the upstream
  call cleanly
- Oversized request body (25MB) is rejected without crashing the server
- Malformed JSON, missing params, path-traversal attempts — handled
  cleanly, server never crashes

**Not verified** (no network egress in the dev sandbox): a live call to the
real Groq API (text or vision), actual SMTP delivery, and the pdf.js/image
flow in a real browser (canvas resizing, PDF.js worker loading from CDN).
Sanity-check those once you run it locally with a real `GROQ_API_KEY` and
open it in an actual browser.
