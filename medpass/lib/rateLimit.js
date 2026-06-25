'use strict';
// In-memory only — fine for a single-process app. If this ever runs as
// multiple instances behind a load balancer, swap this for a shared
// store (e.g. a sessions-style SQLite table, or Redis).
const buckets = new Map();
function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}
/**
 * Returns a middleware-style function: (req) => { allowed, retryAfterMs }
 * `max` requests per `windowMs` per (ip, key).
 */
function rateLimiter({ windowMs, max }) {
  // `identity` is an optional explicit bucket identifier (e.g. a user ID).
  // When provided it replaces the IP component so authenticated endpoints
  // are rate-limited per account rather than per originating address.
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
    if (entry.count > max) {
      return { allowed: false, retryAfterMs: entry.resetAt - now };
    }
    return { allowed: true };
  };
}
function resetKey(req, key, identity) {
  const prefix = identity != null ? `uid:${identity}` : clientIp(req);
  buckets.delete(`${prefix}:${key}`);
}
// periodic cleanup so the map doesn't grow forever
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) {
    if (v.resetAt <= now) buckets.delete(k);
  }
}, 5 * 60 * 1000).unref();
module.exports = { rateLimiter, resetKey, clientIp };
