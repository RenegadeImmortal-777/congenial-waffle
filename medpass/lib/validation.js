'use strict';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email) {
  return typeof email === 'string' && email.length <= 254 && EMAIL_RE.test(email);
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function validatePassword(password) {
  if (typeof password !== 'string') return { ok: false, reason: 'Password is required.' };
  if (password.length < 8) return { ok: false, reason: 'Password must be at least 8 characters.' };
  if (password.length > 256) return { ok: false, reason: 'Password is too long.' };
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return { ok: false, reason: 'Password must include at least one letter and one number.' };
  }
  return { ok: true };
}

module.exports = { isValidEmail, normalizeEmail, validatePassword };
