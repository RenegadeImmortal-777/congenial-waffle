'use strict';
const buckets = new Map();

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

function rateLimiter({ windowMs, max }) {
  return function check(req, key, identity) {
    const prefix = identity != null ? `uid:${identity}` : clientIp(req);
    const bucketKey = `${prefix}:${key}`;
    const now = Date.now();
    let entry = buckets.get(bucketKey);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      buckets.set(bucketKey, entry);
    }
    entry.count += 1;
    if (entry.count > max) return { allowed: false, retryAfterMs: entry.resetAt - now };
    return { allowed: true };
  };
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) { if (v.resetAt <= now) buckets.delete(k); }
}, 5 * 60 * 1000).unref();

module.exports = { rateLimiter, clientIp };
