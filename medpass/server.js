'use strict';
const http = require('node:http');
const path = require('node:path');
const { readJsonBody, sendJson, sendRedirect, sendStaticFile } = require('./lib/http');
const { getSessionUser } = require('./lib/sessions');
const authRoutes = require('./routes/auth');
const aiRoutes = require('./routes/ai');
const studyRoutes = require('./routes/study');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const STATIC_FILES = new Set([
  '/login.html',
  '/signup.html',
  '/forgot-password.html',
  '/reset-password.html',
  '/auth.css',
  '/auth.js',
  '/login-init.js',
  '/signup-init.js',
  '/forgot-password-init.js',
  '/reset-password-init.js',
  '/app.css',
  '/app.js',
]);

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; " +
    "script-src 'self' https://cdnjs.cloudflare.com; worker-src 'self' blob: https://cdnjs.cloudflare.com; " +
    "connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com"
  );
}

// Helper: require a signed-in session or return 401.
// No verification check — email verification is disabled until SMTP is configured.
function requireSession(req, res) {
  const session = getSessionUser(req);
  if (!session) { sendJson(res, 401, { error: 'Sign in required.' }); return null; }
  return session;
}

async function handle(req, res) {
  setSecurityHeaders(res);

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  const method = req.method;

  try {
    // ---- static, public pages ----
    if (method === 'GET' && STATIC_FILES.has(pathname)) {
      return sendStaticFile(res, PUBLIC_DIR, pathname.slice(1));
    }

    // ---- root: route based on session ----
    if (method === 'GET' && pathname === '/') {
      const session = getSessionUser(req);
      if (session) return sendRedirect(res, '/app.html');
      return sendRedirect(res, '/login.html');
    }

    // ---- protected app shell ----
    if (method === 'GET' && pathname === '/app.html') {
      const session = getSessionUser(req);
      if (!session) return sendRedirect(res, '/login.html');
      return sendStaticFile(res, PUBLIC_DIR, 'app.html');
    }

    // ---- auth API ----
    if (method === 'POST' && pathname === '/api/auth/signup') {
      const body = await readJsonBody(req);
      return await authRoutes.signup(req, res, body);
    }
    if (method === 'GET' && pathname === '/api/auth/verify-email') {
      return await authRoutes.verifyEmail(req, res, url.searchParams);
    }
    if (method === 'POST' && pathname === '/api/auth/login') {
      const body = await readJsonBody(req);
      return await authRoutes.login(req, res, body);
    }
    if (method === 'POST' && pathname === '/api/auth/logout') {
      return authRoutes.logout(req, res);
    }
    if (method === 'GET' && pathname === '/api/auth/me') {
      return authRoutes.me(req, res);
    }
    if (method === 'POST' && pathname === '/api/auth/forgot-password') {
      const body = await readJsonBody(req);
      return await authRoutes.forgotPassword(req, res, body);
    }
    if (method === 'POST' && pathname === '/api/auth/reset-password') {
      const body = await readJsonBody(req);
      return await authRoutes.resetPassword(req, res, body);
    }

    // ---- AI proxy ----
    if (method === 'POST' && pathname === '/api/ai/chat') {
      const session = requireSession(req, res); if (!session) return;
      const body = await readJsonBody(req);
      return await aiRoutes.chat(req, res, body, session);
    }

    // ---- Documents ----
    if (pathname === '/api/study/documents') {
      const session = requireSession(req, res); if (!session) return;
      if (method === 'GET') return studyRoutes.listDocuments(req, res, session);
      if (method === 'POST') {
        const body = await readJsonBody(req);
        return studyRoutes.createDocument(req, res, body, session);
      }
    }
    const docMatch = pathname.match(/^\/api\/study\/documents\/(\d+)$/);
    if (docMatch) {
      const session = requireSession(req, res); if (!session) return;
      const id = Number(docMatch[1]);
      if (method === 'DELETE') return studyRoutes.deleteDocument(req, res, id, session);
      if (method === 'PATCH') {
        const body = await readJsonBody(req);
        return studyRoutes.patchDocument(req, res, id, body, session);
      }
    }

    // ---- Flashcards ----
    if (pathname === '/api/study/flashcards') {
      const session = requireSession(req, res); if (!session) return;
      if (method === 'GET') return studyRoutes.listFlashcards(req, res, session);
    }
    const fcMatch = pathname.match(/^\/api\/study\/flashcards\/(\d+)$/);
    if (fcMatch) {
      const session = requireSession(req, res); if (!session) return;
      const docId = Number(fcMatch[1]);
      if (method === 'GET') return studyRoutes.listFlashcardsForDoc(req, res, docId, session);
      if (method === 'POST') {
        const body = await readJsonBody(req);
        return studyRoutes.saveFlashcards(req, res, docId, body, session);
      }
    }

    // ---- Dashboard ----
    if (method === 'GET' && pathname === '/api/study/dashboard') {
      const session = requireSession(req, res); if (!session) return;
      return studyRoutes.getDashboard(req, res, session);
    }

    // ---- Study run history ----
    if (pathname === '/api/study/runs') {
      const session = requireSession(req, res); if (!session) return;
      if (method === 'GET') return studyRoutes.list(req, res, session);
      if (method === 'POST') {
        const body = await readJsonBody(req);
        return studyRoutes.create(req, res, body, session);
      }
    }

    // ---- Bookmarks ----
    if (pathname === '/api/study/bookmarks') {
      const session = requireSession(req, res); if (!session) return;
      if (method === 'GET') return studyRoutes.listBookmarks(req, res, session);
      if (method === 'POST') {
        const body = await readJsonBody(req);
        return studyRoutes.createBookmark(req, res, body, session);
      }
    }
    const bmMatch = pathname.match(/^\/api\/study\/bookmarks\/(\d+)$/);
    if (bmMatch) {
      const session = requireSession(req, res); if (!session) return;
      const id = Number(bmMatch[1]);
      if (method === 'DELETE') return studyRoutes.delBookmark(req, res, id, session);
    }
    const runMatch = pathname.match(/^\/api\/study\/runs\/(\d+)$/);
    if (runMatch) {
      const session = requireSession(req, res); if (!session) return;
      const id = Number(runMatch[1]);
      if (method === 'GET') return studyRoutes.get(req, res, id, session);
      if (method === 'DELETE') return studyRoutes.del(req, res, id, session);
      if (method === 'PATCH') {
        const body = await readJsonBody(req);
        return studyRoutes.patch(req, res, id, body, session);
      }
    }

    // ---- health check ----
    if (method === 'GET' && pathname === '/health') {
      return sendJson(res, 200, { status: 'ok', ts: new Date().toISOString() });
    }

    // ---- 404 ----
    if (pathname.startsWith('/api/')) {
      return sendJson(res, 404, { error: 'Not found.' });
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  } catch (err) {
    const status = err.statusCode || 500;
    console.error('Request error:', err.message);
    if (!res.headersSent) {
      return sendJson(res, status, { error: status === 500 ? 'Internal server error.' : err.message });
    }
  }
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((err) => {
    console.error('Unhandled error:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error.' }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`MedPass server listening on http://localhost:${PORT}`);
  console.log(`NODE_ENV=${process.env.NODE_ENV || 'development'}`);
  if (!process.env.GROQ_API_KEY) {
    console.log('⚠ GROQ_API_KEY not set — /api/ai/chat will return 503 until configured.');
  }
});

function gracefulShutdown(signal) {
  console.log(`${signal} received — shutting down gracefully…`);
  server.close(() => {
    try {
      const { db } = require('./lib/queries');
      db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    } catch (e) {
      console.error('Checkpoint failed:', e.message);
    }
    console.log('Server closed. Exiting.');
    process.exit(0);
  });
  setTimeout(() => { console.error('Forced exit after timeout.'); process.exit(1); }, 10_000).unref();
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

module.exports = server;
