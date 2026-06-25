'use strict';
const crypto = require('node:crypto');
const db = require('../lib/db');
const { hashPassword, verifyPassword } = require('../lib/passwords');
const { isValidEmail, normalizeEmail, validatePassword } = require('../lib/validation');
const { createSessionForUser, getSessionUser, destroySession } = require('../lib/sessions');
const { sendJson, sendRedirect } = require('../lib/http');
const mailer = require('../lib/mailer');
const { rateLimiter } = require('../lib/ratelimit');

const VERIFY_TTL = 24 * 60 * 60 * 1000;
const RESET_TTL  =      60 * 60 * 1000;

const DUMMY_HASH = `scrypt$16384$8$1$${'00'.repeat(16)}$${'00'.repeat(64)}`;
const signupLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 5 });
const loginLimiter  = rateLimiter({ windowMs: 15 * 60 * 1000, max: 10 });
const forgotLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 5 });

const devLinks = () => !mailer.isConfigured() && process.env.NODE_ENV !== 'production';
const baseUrl  = () => process.env.APP_BASE_URL || `https://${process.env.REPLIT_DOMAINS || 'localhost:5000'}`;

async function signup(req, res, body) {
  if (!signupLimiter(req, 'signup').allowed)
    return sendJson(res, 429, { error: 'Too many signup attempts. Try again shortly.' });

  const email = normalizeEmail(body.email);
  if (!isValidEmail(email)) return sendJson(res, 400, { error: 'Enter a valid email address.' });

  const pw = validatePassword(body.password);
  if (!pw.ok) return sendJson(res, 400, { error: pw.reason });

  if (db.getUserByEmail(email)) return sendJson(res, 409, { error: 'An account with this email already exists.' });

  const hash = await hashPassword(body.password);
  const user = db.createUser(email, hash);
  db.setUserVerified(user.id);
  createSessionForUser(res, user.id);
  return sendJson(res, 201, { success: true, user: { email, verified: true } });
}

async function verifyEmail(req, res, params) {
  const token = params.get('token') || '';
  const html = (req.headers['accept'] || '').includes('text/html');
  const fail = msg => html
    ? sendRedirect(res, `/login.html?verify_error=${encodeURIComponent(msg)}`)
    : sendJson(res, 400, { error: msg });

  if (!token) return fail('Missing verification token.');
  const record = db.getVerificationToken(token);
  if (!record || record.used_at || new Date(record.expires_at) < Date.now())
    return fail('This verification link is invalid or has expired.');

  db.setUserVerified(record.user_id);
  db.consumeVerificationToken(token);
  db.invalidateVerificationTokensForUser(record.user_id);

  if (html) return sendRedirect(res, '/login.html?verified=1');
  return sendJson(res, 200, { success: true });
}

async function login(req, res, body) {
  if (!loginLimiter(req, 'login').allowed)
    return sendJson(res, 429, { error: 'Too many login attempts. Try again shortly.' });

  const email = normalizeEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';
  const user = email ? db.getUserByEmail(email) : null;
  const ok = await verifyPassword(password, user ? user.password_hash : DUMMY_HASH);

  if (!user || !ok) return sendJson(res, 401, { error: 'Invalid email or password.' });

  createSessionForUser(res, user.id);
  return sendJson(res, 200, { success: true, user: { email: user.email, verified: !!user.is_verified } });
}

function logout(req, res) {
  destroySession(req, res);
  return sendJson(res, 200, { success: true });
}

function me(req, res) {
  const session = getSessionUser(req);
  if (!session) return sendJson(res, 401, { authenticated: false });
  return sendJson(res, 200, { authenticated: true, user: { email: session.user.email, verified: !!session.user.is_verified } });
}

async function forgotPassword(req, res, body) {
  if (!forgotLimiter(req, 'forgot').allowed)
    return sendJson(res, 429, { error: 'Too many requests. Try again shortly.' });

  const email = normalizeEmail(body.email);
  const payload = { success: true, message: 'If an account exists for that email, a reset link has been sent.' };

  if (isValidEmail(email)) {
    const user = db.getUserByEmail(email);
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      db.createResetToken(token, user.id, new Date(Date.now() + RESET_TTL).toISOString());
      const link = `${baseUrl()}/reset-password.html?token=${token}`;
      await mailer.passwordResetEmail({ to: email, link }).catch(e => console.error('reset email:', e.message));
      if (devLinks()) payload.devResetLink = link;
    }
  }
  return sendJson(res, 200, payload);
}

async function resetPassword(req, res, body) {
  const token = typeof body.token === 'string' ? body.token : '';
  if (!token) return sendJson(res, 400, { error: 'Missing reset token.' });

  const pw = validatePassword(body.password);
  if (!pw.ok) return sendJson(res, 400, { error: pw.reason });

  const record = db.getResetToken(token);
  if (!record || record.used_at || new Date(record.expires_at) < Date.now())
    return sendJson(res, 400, { error: 'This reset link is invalid or has already been used.' });

  db.updateUserPassword(record.user_id, await hashPassword(body.password));
  db.consumeResetToken(token);
  db.invalidateResetTokensForUser(record.user_id);
  db.deleteSessionsForUser(record.user_id);
  return sendJson(res, 200, { success: true, message: 'Password updated. You can now sign in.' });
}

module.exports = { signup, verifyEmail, login, logout, me, forgotPassword, resetPassword };
