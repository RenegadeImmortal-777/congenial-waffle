'use strict';
const crypto = require('node:crypto');
const queries = require('./db');

const COOKIE = 'mp_sid';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error('SESSION_SECRET missing or too short.');
  return s;
}

function sign(value) {
  const mac = crypto.createHmac('sha256', secret()).update(value).digest('hex');
  return `${value}.${mac}`;
}

function unsign(signed) {
  if (typeof signed !== 'string') return null;
  const idx = signed.lastIndexOf('.');
  if (idx === -1) return null;
  const value = signed.slice(0, idx);
  const mac = signed.slice(idx + 1);
  const expected = crypto.createHmac('sha256', secret()).update(value).digest('hex');
  const a = Buffer.from(mac, 'hex'), b = Buffer.from(expected, 'hex');
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;
  return value;
}

function parseCookies(req) {
  const out = {};
  const header = req.headers.cookie;
  if (!header) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (!k) continue;
    try { out[k] = decodeURIComponent(v); } catch { out[k] = v; }
  }
  return out;
}

function serializeCookie(name, value, opts = {}) {
  let s = `${name}=${encodeURIComponent(value)}`;
  if (opts.maxAge != null) s += `; Max-Age=${Math.floor(opts.maxAge / 1000)}`;
  s += `; Path=${opts.path || '/'}`;
  if (opts.httpOnly !== false) s += '; HttpOnly';
  s += `; SameSite=${opts.sameSite || 'Lax'}`;
  if (opts.secure) s += '; Secure';
  return s;
}

function createSessionForUser(res, userId) {
  const id = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + TTL_MS);
  queries.createSession(id, userId, expiresAt.toISOString());
  res.setHeader('Set-Cookie', serializeCookie(COOKIE, sign(id), {
    maxAge: TTL_MS,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    httpOnly: true,
  }));
  return id;
}

function getSessionUser(req) {
  const cookies = parseCookies(req);
  const raw = cookies[COOKIE];
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
  const raw = cookies[COOKIE];
  if (raw) {
    const sessionId = unsign(raw);
    if (sessionId) queries.deleteSession(sessionId);
  }
  res.setHeader('Set-Cookie', serializeCookie(COOKIE, '', {
    maxAge: 0, secure: process.env.NODE_ENV === 'production', sameSite: 'Lax', httpOnly: true,
  }));
}

module.exports = { parseCookies, createSessionForUser, getSessionUser, destroySession };
