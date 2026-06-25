'use strict';
const { sendJson } = require('../lib/http');
const { rateLimiter } = require('../lib/ratelimit');

const aiLimiter = rateLimiter({ windowMs: 60_000, max: 60 });
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT = `You are MedPass Tutor, a study aid for medical students preparing for board-style exams.
Explain concepts clearly using correct medical terminology. When asked exam-style questions, walk through
the clinical reasoning before giving the answer. You are a study tool, not a clinician — make clear you
don't provide diagnosis or treatment advice for real patients. When the user attaches notes, textbook
excerpts, or images of diagrams/questions, use that material directly in your answer.`;

const MAX_TEXT_CHARS = 20000;
const MAX_MESSAGES   = 20;
const MAX_IMAGES     = 5;
const MAX_IMG_BYTES  = 5.4 * 1024 * 1024;
const ALLOWED_IMG    = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

function normalizeContent(content) {
  if (typeof content === 'string') return content.slice(0, MAX_TEXT_CHARS);
  if (!Array.isArray(content))
    throw Object.assign(new Error('Message content must be a string or array.'), { statusCode: 400 });
  const parts = [];
  for (const part of content) {
    if (!part || typeof part !== 'object')
      throw Object.assign(new Error('Invalid content part.'), { statusCode: 400 });
    if (part.type === 'text') {
      if (typeof part.text !== 'string')
        throw Object.assign(new Error('Text part needs a "text" string.'), { statusCode: 400 });
      parts.push({ type: 'text', text: part.text.slice(0, MAX_TEXT_CHARS) });
    } else if (part.type === 'image_url') {
      const url = part.image_url?.url;
      if (typeof url !== 'string' || !url.startsWith('data:image/'))
        throw Object.assign(new Error('Images must be base64 data URLs (png/jpeg/webp/gif).'), { statusCode: 400 });
      const mime = url.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/)?.[1]?.toLowerCase();
      if (!mime || !ALLOWED_IMG.has(mime))
        throw Object.assign(new Error('Unsupported image type. Use PNG, JPEG, WEBP, or GIF.'), { statusCode: 400 });
      if (url.length > MAX_IMG_BYTES)
        throw Object.assign(new Error('Image is too large.'), { statusCode: 400 });
      parts.push({ type: 'image_url', image_url: { url } });
    } else {
      throw Object.assign(new Error('Unsupported content part type.'), { statusCode: 400 });
    }
  }
  return parts;
}

function countImages(messages) {
  let n = 0;
  for (const m of messages)
    if (Array.isArray(m.content)) for (const p of m.content) if (p.type === 'image_url') n++;
  return n;
}

function extractRateLimit(headers) {
  const rl = headers.get('x-ratelimit-remaining-tokens');
  const rt = headers.get('x-ratelimit-reset-tokens');
  if (!rl && !rt) return null;
  return {
    remainingTokens: rl !== null ? Number(rl) : null,
    resetTokens: rt,
    remainingRequests: headers.get('x-ratelimit-remaining-requests') !== null ? Number(headers.get('x-ratelimit-remaining-requests')) : null,
    resetRequests: headers.get('x-ratelimit-reset-requests'),
  };
}

async function chat(req, res, body, session) {
  const userId = session?.user?.id;
  const { allowed, retryAfterMs } = aiLimiter(req, 'ai', userId);
  if (!allowed) {
    const s = Math.ceil(retryAfterMs / 1000);
    res.setHeader('Retry-After', String(s));
    return sendJson(res, 429, { error: `Rate limit hit. Wait ${s}s.`, retryAfter: s });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return sendJson(res, 503, { error: 'AI tutor not configured. Set GROQ_API_KEY.' });

  const incoming = Array.isArray(body.messages) ? body.messages : null;
  if (!incoming?.length) return sendJson(res, 400, { error: 'Provide a non-empty "messages" array.' });

  let messages;
  try {
    messages = incoming.slice(-MAX_MESSAGES).map(m => ({
      role: m?.role === 'assistant' ? 'assistant' : 'user',
      content: normalizeContent(m?.content),
    }));
  } catch (err) {
    return sendJson(res, err.statusCode || 400, { error: err.message });
  }

  const imageCount = countImages(messages);
  if (imageCount > MAX_IMAGES) return sendJson(res, 400, { error: `Max ${MAX_IMAGES} images per request.` });

  const isVision  = imageCount > 0;
  const isSolve   = body.solveAll === true && !isVision;
  const model = isVision ? (process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct')
    : isSolve   ? (process.env.GROQ_SOLVE_MODEL  || 'llama-3.1-8b-instant')
    : (process.env.GROQ_MODEL || 'openai/gpt-oss-20b');

  const reqBody = {
    model,
    messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    temperature: 0.3,
    max_completion_tokens: isSolve
      ? (Number(process.env.GROQ_SOLVE_MAX_TOKENS) || 4096)
      : (Number(process.env.GROQ_MAX_TOKENS)       || 4096),
  };
  if (!isVision && !isSolve) reqBody.reasoning_effort = process.env.GROQ_REASONING_EFFORT || 'low';

  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 90_000);
    let upstream;
    try {
      upstream = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(reqBody),
        signal: ctrl.signal,
      });
    } finally { clearTimeout(tid); }

    const rateLimit = extractRateLimit(upstream.headers);
    const data = await upstream.json().catch(() => null);

    if (!upstream.ok) {
      const msg = data?.error?.message || 'AI provider returned an error.';
      return sendJson(res, upstream.status === 429 ? 429 : 502, { error: msg, rateLimit });
    }

    const choice = data?.choices?.[0];
    const reply  = choice?.message?.content || null;
    const finish = choice?.finish_reason;

    if (!reply) {
      if (finish === 'length')
        return sendJson(res, 502, { error: 'Response exceeded token limit. Try a smaller input.', rateLimit });
      return sendJson(res, 502, { error: `AI returned empty response (${finish || 'unknown'}).`, rateLimit });
    }

    return sendJson(res, 200, { reply, rateLimit, truncated: finish === 'length' });
  } catch (err) {
    console.error('AI fetch failed:', err.message);
    return sendJson(res, 502, { error: 'Could not reach AI provider. Try again.' });
  }
}

module.exports = { chat };
