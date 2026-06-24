'use strict';
const { sendJson } = require('../lib/http');
const { rateLimiter } = require('../lib/rateLimit');

// 60 requests per 60 s per authenticated user.
// Generous enough for a large Solve All run (e.g. 20 chunks × 2 passes = 40
// requests) while still blocking runaway scripts or mis-fired loops.
const aiLimiter = rateLimiter({ windowMs: 60_000, max: 60 });

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const SYSTEM_PROMPT = `You are MedPass Tutor, a study aid for medical students preparing for
board-style exams. Explain concepts clearly, use correct terminology, and
when asked exam-style questions, walk through the reasoning before giving
the answer. You are a study tool, not a clinician — make clear you don't
provide diagnosis or treatment advice for real patients. When the user
attaches notes, textbook excerpts, or images of diagrams/questions, use
that material directly in your answer.`;

const MAX_TEXT_PART_CHARS = 20000; // per text part (covers extracted doc text)
const MAX_MESSAGES = 20; // most recent messages forwarded upstream
const MAX_IMAGES_PER_REQUEST = 5; // Groq's per-request image cap
const MAX_IMAGE_DATA_URL_CHARS = 5.4 * 1024 * 1024; // ~4MB binary, base64-inflated
const ALLOWED_IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

/**
 * Validates and normalizes one message's `content` into either a plain
 * string (legacy/simple turns) or an array of {type:'text'|'image_url'}
 * parts (OpenAI/Groq multimodal format). Throws a 400-tagged error on
 * anything malformed so the caller can reject the whole request cleanly.
 */
function normalizeContent(content) {
  if (typeof content === 'string') {
    return content.slice(0, MAX_TEXT_PART_CHARS);
  }
  if (!Array.isArray(content)) {
    throw Object.assign(new Error('Each message "content" must be a string or an array.'), { statusCode: 400 });
  }

  const parts = [];
  for (const part of content) {
    if (!part || typeof part !== 'object') {
      throw Object.assign(new Error('Invalid content part.'), { statusCode: 400 });
    }
    if (part.type === 'text') {
      if (typeof part.text !== 'string') {
        throw Object.assign(new Error('Text content parts must include a "text" string.'), { statusCode: 400 });
      }
      parts.push({ type: 'text', text: part.text.slice(0, MAX_TEXT_PART_CHARS) });
      continue;
    }
    if (part.type === 'image_url') {
      const url = part.image_url && part.image_url.url;
      if (typeof url !== 'string' || !url.startsWith('data:image/')) {
        throw Object.assign(
          new Error('Image attachments must be a base64 data URL (png, jpeg, webp, or gif).'),
          { statusCode: 400 }
        );
      }
      const mimeMatch = url.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
      const mime = mimeMatch && mimeMatch[1].toLowerCase();
      if (!mime || !ALLOWED_IMAGE_MIME.has(mime)) {
        throw Object.assign(new Error('Unsupported image type. Use PNG, JPEG, WEBP, or GIF.'), { statusCode: 400 });
      }
      if (url.length > MAX_IMAGE_DATA_URL_CHARS) {
        throw Object.assign(new Error('One of the attached images is too large.'), { statusCode: 400 });
      }
      parts.push({ type: 'image_url', image_url: { url } });
      continue;
    }
    throw Object.assign(new Error('Unsupported content part type.'), { statusCode: 400 });
  }
  return parts;
}

/**
 * Pulls Groq's standard rate-limit headers off the upstream response so the
 * client can pace follow-up requests (e.g. batched sends) instead of
 * guessing fixed delays. `resetTokens`/`resetRequests` are left as Groq's
 * raw duration strings (e.g. "7.66s", "1m2.3s") — parsing happens client-side.
 * Returns null if Groq didn't send any of these headers.
 */
function extractRateLimit(headers) {
  const limitTokens = headers.get('x-ratelimit-limit-tokens');
  const remainingTokens = headers.get('x-ratelimit-remaining-tokens');
  const resetTokens = headers.get('x-ratelimit-reset-tokens');
  const limitRequests = headers.get('x-ratelimit-limit-requests');
  const remainingRequests = headers.get('x-ratelimit-remaining-requests');
  const resetRequests = headers.get('x-ratelimit-reset-requests');
  if (
    limitTokens === null &&
    remainingTokens === null &&
    resetTokens === null &&
    limitRequests === null &&
    remainingRequests === null &&
    resetRequests === null
  ) {
    return null;
  }
  return {
    limitTokens: limitTokens !== null ? Number(limitTokens) : null,
    remainingTokens: remainingTokens !== null ? Number(remainingTokens) : null,
    resetTokens,
    limitRequests: limitRequests !== null ? Number(limitRequests) : null,
    remainingRequests: remainingRequests !== null ? Number(remainingRequests) : null,
    resetRequests,
  };
}

function countImages(messages) {
  let count = 0;
  for (const m of messages) {
    if (Array.isArray(m.content)) {
      for (const part of m.content) {
        if (part.type === 'image_url') count += 1;
      }
    }
  }
  return count;
}

/**
 * POST /api/ai/chat
 * body: { messages: [{ role: 'user'|'assistant', content: string | Array<part> }, ...] }
 * `content` parts: { type: 'text', text } | { type: 'image_url', image_url: { url } }
 * (image_url.url must be a base64 data: URL — no remote fetches are forwarded).
 * Requires an authenticated + verified session (enforced by the caller
 * in server.js before this handler runs).
 */
async function chat(req, res, body, session) {
  // Per-user rate limit — keyed on account ID so VPN/IP changes don't reset it.
  const userId = session && session.user && session.user.id;
  const { allowed, retryAfterMs } = aiLimiter(req, 'ai-chat', userId);
  if (!allowed) {
    const retryAfterSec = Math.ceil(retryAfterMs / 1000);
    res.setHeader('Retry-After', String(retryAfterSec));
    return sendJson(res, 429, {
      error: `Too many requests — you've hit the per-minute limit. Wait ${retryAfterSec}s and try again.`,
      retryAfter: retryAfterSec,
    });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return sendJson(res, 503, {
      error: 'AI tutor is not configured yet. Set GROQ_API_KEY in the server .env file.',
    });
  }

  const incoming = Array.isArray(body.messages) ? body.messages : null;
  if (!incoming || incoming.length === 0) {
    return sendJson(res, 400, { error: 'Provide a non-empty "messages" array.' });
  }

  let messages;
  try {
    messages = incoming.slice(-MAX_MESSAGES).map((m) => ({
      role: m && m.role === 'assistant' ? 'assistant' : 'user',
      content: normalizeContent(m && m.content),
    }));
  } catch (err) {
    return sendJson(res, err.statusCode || 400, { error: err.message });
  }

  const imageCount = countImages(messages);
  if (imageCount > MAX_IMAGES_PER_REQUEST) {
    return sendJson(res, 400, { error: `Too many images attached — ${MAX_IMAGES_PER_REQUEST} max per request.` });
  }

  // Any image anywhere in the forwarded window routes the whole request
  // through the vision-capable model, since Groq's model is fixed per call.
  const isVisionCall = imageCount > 0;
  // solveAll=true uses a fast non-reasoning model — answers are short and
  // structured, no chain-of-thought needed, and it burns far fewer tokens
  // so rate-limit resets happen much faster between parts.
  const isSolveAll = body.solveAll === true && !isVisionCall;
  const model = isVisionCall
    ? (process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct')
    : isSolveAll
      ? (process.env.GROQ_SOLVE_MODEL || 'llama-3.1-8b-instant')
      : (process.env.GROQ_MODEL || 'openai/gpt-oss-20b');

  const requestBody = {
    model,
    messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    temperature: 0.3,
    // solveAll answers now require 3-5 sentence explanations per question
    // (mechanism + why correct + why the main distractor is wrong), and a
    // chunk can hold 10-15+ questions, so 1024 was far too small and was
    // silently truncating replies partway through a chunk. GROQ_SOLVE_MAX_TOKENS
    // lets this be tuned independently of the regular chat's GROQ_MAX_TOKENS.
    max_completion_tokens: isSolveAll
      ? (Number(process.env.GROQ_SOLVE_MAX_TOKENS) || 4096)
      : (Number(process.env.GROQ_MAX_TOKENS) || 4096),
  };
  // reasoning_effort only on gpt-oss models
  if (!isVisionCall && !isSolveAll) {
    requestBody.reasoning_effort = process.env.GROQ_REASONING_EFFORT || 'low';
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90_000); // 90s hard timeout
    let upstream;
    try {
      upstream = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
    const rateLimit = extractRateLimit(upstream.headers);
    const retryAfter = upstream.headers.get('retry-after') || null;
    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      const message = (data && data.error && data.error.message) || 'The AI provider returned an error.';
      // Pass 429 through unchanged so the client can distinguish rate-limit
      // errors from other failures and apply the correct backoff strategy.
      const statusOut = upstream.status === 429 ? 429 : 502;
      return sendJson(res, statusOut, {
        error: message,
        rateLimit,
        retryAfter,
      });
    }
    const choice = data && data.choices && data.choices[0];
    const reply = choice && choice.message ? choice.message.content : null;
    const finishReason = choice && choice.finish_reason;
    if (!reply) {
      console.error('Empty reply from Groq:', JSON.stringify(data));
      if (finishReason === 'length') {
        return sendJson(res, 502, {
          error: 'That request needs a longer answer than fits in one response. Try asking about a smaller chunk (e.g. 10-15 questions, or one topic) at a time.',
          rateLimit,
        });
      }
      const detail = finishReason ? ` (finish_reason: ${finishReason})` : '';
      return sendJson(res, 502, { error: `The AI provider returned an empty response${detail}.`, rateLimit });
    }
    // A non-empty reply can still be CUT OFF mid-answer if the model hit
    // max_completion_tokens before finishing every question in the chunk.
    // This used to slip through as a normal 200 — the client would then
    // silently treat every question after the cutoff as "no answer found."
    // Flag it explicitly so the caller can retry with a smaller chunk
    // instead of just losing those questions.
    const truncated = finishReason === 'length';
    return sendJson(res, 200, { reply, rateLimit, truncated });
  } catch (err) {
    // Expected to land here in network-restricted environments — this
    // confirms the gating/error-handling path works even when the
    // upstream call itself can't complete.
    console.error('AI proxy fetch failed:', err.message);
    return sendJson(res, 502, { error: 'Could not reach the AI provider. Try again shortly.' });
  }
}

module.exports = { chat };
