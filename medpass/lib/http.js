'use strict';
const fs = require('node:fs');
const path = require('node:path');
// 24MB — generous enough for a chat turn carrying up to 5 base64-encoded
// images (each capped well under Groq's 4MB-per-image limit client-side)
// plus extracted document text, while still bounding worst-case memory use.
const MAX_BODY_BYTES = 24 * 1024 * 1024;
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'] || '';
    if (req.method === 'GET' || req.method === 'HEAD') {
      resolve({});
      return;
    }
    if (!contentType.includes('application/json')) {
      resolve({});
      return;
    }
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Request body too large'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(Object.assign(new Error('Invalid JSON body'), { statusCode: 400 }));
      }
    });
    req.on('error', reject);
  });
}
function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}
function sendRedirect(res, location, statusCode = 302) {
  res.writeHead(statusCode, { Location: location });
  res.end();
}
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};
/**
 * Serves a single static file safely from `rootDir`. `relPath` must
 * already be a known-good relative path (no user-controlled traversal) —
 * callers in server.js map fixed routes to fixed files.
 */
function sendStaticFile(res, rootDir, relPath, statusCode = 200) {
  const resolvedRoot = path.resolve(rootDir);
  const filePath = path.resolve(resolvedRoot, relPath);
  // Defense in depth: never serve a path that escapes the public dir.
  if (!filePath.startsWith(resolvedRoot + path.sep) && filePath !== resolvedRoot) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(statusCode, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  });
}
/** True if the client looks like it's fetching JSON (an API/XHR call). */
function wantsJson(req) {
  const accept = req.headers['accept'] || '';
  const xrw = req.headers['x-requested-with'] || '';
  if (xrw.toLowerCase() === 'fetch' || xrw.toLowerCase() === 'xmlhttprequest') return true;
  // Treat anything hitting /api/* as JSON regardless of Accept header —
  // browsers' fetch() defaults to `Accept: */*`, which would otherwise
  // be ambiguous with a real page navigation.
  return accept.includes('application/json') || accept === '*/*' || accept === '';
}
module.exports = { readJsonBody, sendJson, sendRedirect, sendStaticFile, wantsJson, MAX_BODY_BYTES };
