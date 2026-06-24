'use strict';
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const scrypt = promisify(crypto.scrypt);
const KEY_LEN = 64;
const SALT_LEN = 16;
// scrypt cost params — N must be a power of 2. 16384 is the common
// interactive-login recommendation (~tens of ms on modern hardware).
const N = 16384;
const r = 8;
const p = 1;
/**
 * Returns a self-describing hash string: scrypt$N$r$p$saltHex$keyHex
 * Storing the cost params alongside the hash means we can change them
 * later without breaking verification of existing passwords.
 */
async function hashPassword(plain) {
  const salt = crypto.randomBytes(SALT_LEN);
  const key = await scrypt(plain, salt, KEY_LEN, { N, r, p, maxmem: 64 * 1024 * 1024 });
  return ['scrypt', N, r, p, salt.toString('hex'), key.toString('hex')].join('$');
}
async function verifyPassword(plain, stored) {
  if (typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, nStr, rStr, pStr, saltHex, keyHex] = parts;
  const n = Number(nStr);
  const rr = Number(rStr);
  const pp = Number(pStr);
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(keyHex, 'hex');
  const actual = await scrypt(plain, salt, expected.length, {
    N: n,
    r: rr,
    p: pp,
    maxmem: 64 * 1024 * 1024,
  });
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}
module.exports = { hashPassword, verifyPassword };
