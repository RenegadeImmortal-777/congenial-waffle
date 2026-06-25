'use strict';
const crypto = require('node:crypto');
const queries = require('./queries');
const SESSION_COOKIE = 'mp_sid';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      'SESSION_SECRET is missing or too short. Set a long random value in .env.'
    );
  }
  return secret;
}
function sign(value) {
  const hmac = crypto.createHmac('sha256', getSecret()).update(value).digest('hex');
  return `${value}.${hmac}`;
}
function unsign(signed) {
  if (typeof signed !== 'string') return null;
  const idx = signed.lastIndexOf('.');
  if (idx === -1) return null;
  const value = signed.slice(0, idx);
  const mac = signed.slice(idx + 1);
  const expectedMac = crypto.createHmac('sha256', getSecret()).update(value).digest('hex');
  const macBuf = Buffer.from(mac, 'hex');
  const expectedBuf = Buffer.from(expectedMac, 'hex');
  if (macBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(macBuf, expectedBuf)) return null;
  return value;
}
// ---- cookie parsing/serializing (no dependency) ----
function parseCookies(req) {
  const header = req.headers.cookie;
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const val = part.slice(eq + 1).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(val);
    } catch {
      out[key] = val;
    }
  }
  return out;
}
function serializeCookie(name, value, opts = {}) {
  let str = `${name}=${encodeURIComponent(value)}`;
  if (opts.maxAge != null) str += `; Max-Age=${Math.floor(opts.maxAge / 1000)}`;
  str += `; Path=${opts.path || '/'}`;
  if (opts.httpOnly !== false) str += '; HttpOnly';
  str += `; SameSite=${opts.sameSite || 'Lax'}`;
  if (opts.secure) str += '; Secure';
  if (opts.expires) str += `; Expires=${opts.expires.toUTCString()}`;
  return str;
}
function isSecureRequest() {
  return process.env.NODE_ENV === 'production';
}
// ---- session lifecycle ----
function createSessionForUser(res, userId) {
  const id = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  queries.createSession(id, userId, expiresAt.toISOString());
  const cookieValue = sign(id);
  res.setHeader(
    'Set-Cookie',
    serializeCookie(SESSION_COOKIE, cookieValue, {
      maxAge: SESSION_TTL_MS,
      secure: isSecureRequest(),
      sameSite: 'Lax',
      httpOnly: true,
    })
  );
  return id;
}
function getSessionUser(req) {
  const cookies = parseCookies(req);
  const raw = cookies[SESSION_COOKIE];
  if (!raw) return null;
  const sessionId = unsign(raw);
  if (!sessionId) return null;
  const session = queries.getSession(sessionId);
  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) {
    queries.deleteSession(sessionId);
    return null;
  }
  const user = queries.getUserById(session.user_id);
  if (!user) return null;
  return { user, sessionId };
}
function destroySession(req, res) {
  const cookies = parseCookies(req);
  const raw = cookies[SESSION_COOKIE];
  if (raw) {
    const sessionId = unsign(raw);
    if (sessionId) queries.deleteSession(sessionId);
  }
  res.setHeader(
    'Set-Cookie',
    serializeCookie(SESSION_COOKIE, '', {
      maxAge: 0,
      secure: isSecureRequest(),
      sameSite: 'Lax',
      httpOnly: true,
    })
  );
}
module.exports = {
  SESSION_COOKIE,
  parseCookies,
  createSessionForUser,
  getSessionUser,
  destroySession,
};
