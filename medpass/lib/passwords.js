'use strict';
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const scrypt = promisify(crypto.scrypt);

const KEY_LEN = 64;
const SALT_LEN = 16;
const N = 16384, r = 8, p = 1;

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
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(keyHex, 'hex');
  const actual = await scrypt(plain, salt, expected.length, {
    N: Number(nStr), r: Number(rStr), p: Number(pStr), maxmem: 64 * 1024 * 1024,
  });
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

module.exports = { hashPassword, verifyPassword };
