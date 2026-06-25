'use strict';
const crypto = require('node:crypto');
const queries = require('../lib/queries');
const { hashPassword, verifyPassword } = require('../lib/passwords');
const { isValidEmail, normalizeEmail, validatePassword } = require('../lib/validation');
const { createSessionForUser, getSessionUser, destroySession } = require('../lib/sessions');
const { sendJson, sendRedirect } = require('../lib/http');
const mailer = require('../lib/mailer');
const { rateLimiter } = require('../lib/rateLimit');

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const RESET_TTL_MS = 60 * 60 * 1000; // 1h

// A dummy hash used to keep login's timing similar whether or not the
// email exists, so the endpoint doesn't leak account existence via timing.
const DUMMY_HASH = `scrypt$16384$8$1$${'00'.repeat(16)}$${'00'.repeat(64)}`;

const signupLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 5 });
const loginLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 10 });
const forgotLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 5 });

function baseUrl() {
  return process.env.APP_BASE_URL || 'http://localhost:3000';
}

/** True for a real browser page-navigation (clicking an email link), as
 * opposed to a fetch()/curl call — used only by verify-email, which is
 * the one route that's hit both ways. */
function prefersHtml(req) {
  const accept = req.headers['accept'] || '';
  return accept.includes('text/html');
}

const devLinksEnabled = () => !mailer.isConfigured() && process.env.NODE_ENV !== 'production';

// ---------------------------------------------------------------------
// POST /api/auth/signup
// ---------------------------------------------------------------------
async function signup(req, res, body) {
  const limit = signupLimiter(req, 'signup');
  if (!limit.allowed) {
    return sendJson(res, 429, { error: 'Too many signup attempts. Try again shortly.' });
  }

  const email = normalizeEmail(body.email);
  if (!isValidEmail(email)) {
    return sendJson(res, 400, { error: 'Enter a valid email address.' });
  }

  const pwCheck = validatePassword(body.password);
  if (!pwCheck.ok) {
    return sendJson(res, 400, { error: pwCheck.reason });
  }

  if (queries.getUserByEmail(email)) {
    return sendJson(res, 409, { error: 'An account with this email already exists.' });
  }

  const passwordHash = await hashPassword(body.password);
  const user = queries.createUser(email, passwordHash);

  // Auto-verify immediately — no SMTP configured yet.
  // When email verification is ready, remove this line and restore the
  // token/mailer block below.
  queries.setUserVerified(user.id);

  createSessionForUser(res, user.id);

  return sendJson(res, 201, {
    success: true,
    message: 'Account created. You can sign in now.',
    user: { email, verified: true },
  });
}

// ---------------------------------------------------------------------
// GET /api/auth/verify-email?token=...
// ---------------------------------------------------------------------
async function verifyEmail(req, res, searchParams) {
  const token = searchParams.get('token') || '';
  const html = prefersHtml(req);

  function fail(message) {
    if (html) return sendRedirect(res, `/login.html?verify_error=${encodeURIComponent(message)}`);
    return sendJson(res, 400, { error: message });
  }

  if (!token) return fail('Missing verification token.');

  const record = queries.getVerificationToken(token);
  const expired = record && new Date(record.expires_at).getTime() < Date.now();
  if (!record || record.used_at || expired) {
    return fail('This verification link is invalid or has expired.');
  }

  queries.setUserVerified(record.user_id);
  queries.consumeVerificationToken(token);
  queries.invalidateVerificationTokensForUser(record.user_id);

  if (html) return sendRedirect(res, '/login.html?verified=1');
  return sendJson(res, 200, { success: true, message: 'Email verified.' });
}

// ---------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------
async function login(req, res, body) {
  const limit = loginLimiter(req, 'login');
  if (!limit.allowed) {
    return sendJson(res, 429, { error: 'Too many login attempts. Try again shortly.' });
  }

  const email = normalizeEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';

  const user = email ? queries.getUserByEmail(email) : null;
  const ok = await verifyPassword(password, user ? user.password_hash : DUMMY_HASH);

  if (!user || !ok) {
    return sendJson(res, 401, { error: 'Invalid email or password.' });
  }

  createSessionForUser(res, user.id);
  return sendJson(res, 200, {
    success: true,
    user: { email: user.email, verified: !!user.is_verified },
  });
}

// ---------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------
function logout(req, res) {
  destroySession(req, res);
  return sendJson(res, 200, { success: true });
}

// ---------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------
function me(req, res) {
  const session = getSessionUser(req);
  if (!session) return sendJson(res, 401, { authenticated: false });
  return sendJson(res, 200, {
    authenticated: true,
    user: { email: session.user.email, verified: !!session.user.is_verified },
  });
}

// ---------------------------------------------------------------------
// POST /api/auth/forgot-password
// ---------------------------------------------------------------------
async function forgotPassword(req, res, body) {
  const limit = forgotLimiter(req, 'forgot');
  if (!limit.allowed) {
    return sendJson(res, 429, { error: 'Too many requests. Try again shortly.' });
  }

  const email = normalizeEmail(body.email);
  // Generic response regardless of whether the account exists, so this
  // endpoint can't be used to enumerate registered emails.
  const payload = {
    success: true,
    message: 'If an account exists for that email, a reset link has been sent.',
  };

  if (isValidEmail(email)) {
    const user = queries.getUserByEmail(email);
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + RESET_TTL_MS).toISOString();
      queries.createResetToken(token, user.id, expiresAt);
      const link = `${baseUrl()}/reset-password.html?token=${token}`;

      await mailer
        .passwordResetEmail({ to: email, link })
        .catch((err) => console.error('reset email failed:', err.message));

      if (devLinksEnabled()) payload.devResetLink = link;
    }
  }

  return sendJson(res, 200, payload);
}

// ---------------------------------------------------------------------
// POST /api/auth/reset-password
// ---------------------------------------------------------------------
async function resetPassword(req, res, body) {
  const token = typeof body.token === 'string' ? body.token : '';
  if (!token) return sendJson(res, 400, { error: 'Missing reset token.' });

  const pwCheck = validatePassword(body.password);
  if (!pwCheck.ok) return sendJson(res, 400, { error: pwCheck.reason });

  const record = queries.getResetToken(token);
  const expired = record && new Date(record.expires_at).getTime() < Date.now();
  if (!record || record.used_at || expired) {
    return sendJson(res, 400, { error: 'This reset link is invalid or has already been used.' });
  }

  const passwordHash = await hashPassword(body.password);
  queries.updateUserPassword(record.user_id, passwordHash);
  queries.consumeResetToken(token);
  queries.invalidateResetTokensForUser(record.user_id);
  // Resetting a password kills every existing session for the account —
  // including whatever session initiated the request.
  queries.deleteSessionsForUser(record.user_id);

  return sendJson(res, 200, { success: true, message: 'Password updated. You can now sign in.' });
}

module.exports = { signup, verifyEmail, login, logout, me, forgotPassword, resetPassword };
