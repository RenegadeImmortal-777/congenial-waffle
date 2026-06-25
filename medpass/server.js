'use strict';
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
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
  '/share.html',
  '/auth.css',
  '/auth.js',
  '/login-init.js',
  '/signup-init.js',
  '/forgot-password-init.js',
  '/reset-password-init.js',
  '/app.css',
  '/app.js',
  '/manifest.json',
  '/sw.js',
  '/vendor/pdfjs/pdf.min.js',
  '/vendor/pdfjs/pdf.worker.min.js',
]);

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "script-src 'self'; worker-src 'self' blob:; " +
    "connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com"
  );
}

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

    // ---- Dashboard ----
    if (method === 'GET' && pathname === '/api/study/dashboard') {
      const session = requireSession(req, res); if (!session) return;
      return studyRoutes.getDashboard(req, res, session);
    }
    if (method === 'GET' && pathname === '/api/study/activity') {
      const session = requireSession(req, res); if (!session) return;
      return studyRoutes.getActivityHeatmap(req, res, session);
    }

    // ---- Analytics ----
    if (method === 'GET' && pathname === '/api/study/analytics') {
      const session = requireSession(req, res); if (!session) return;
      return studyRoutes.getAnalytics(req, res, session);
    }

    // ---- Search ----
    if (method === 'GET' && pathname === '/api/study/search') {
      const session = requireSession(req, res); if (!session) return;
      return studyRoutes.search(req, res, session, url);
    }

    // ---- XP ----
    if (pathname === '/api/study/xp') {
      const session = requireSession(req, res); if (!session) return;
      if (method === 'GET') return studyRoutes.getXP(req, res, session);
      if (method === 'POST') {
        const body = await readJsonBody(req);
        return studyRoutes.awardXP(req, res, body, session);
      }
    }

    // ---- Goals / Planner ----
    if (pathname === '/api/study/goals') {
      const session = requireSession(req, res); if (!session) return;
      if (method === 'GET') return studyRoutes.listGoals(req, res, session);
      if (method === 'POST') {
        const body = await readJsonBody(req);
        return studyRoutes.createGoal(req, res, body, session);
      }
    }
    const goalMatch = pathname.match(/^\/api\/study\/goals\/(\d+)$/);
    if (goalMatch) {
      const session = requireSession(req, res); if (!session) return;
      const id = Number(goalMatch[1]);
      if (method === 'PATCH') {
        const body = await readJsonBody(req);
        return studyRoutes.updateGoal(req, res, id, body, session);
      }
      if (method === 'DELETE') return studyRoutes.deleteGoal(req, res, id, session);
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
    const docTextMatch = pathname.match(/^\/api\/study\/documents\/(\d+)\/text$/);
    if (docTextMatch) {
      const session = requireSession(req, res); if (!session) return;
      const id = Number(docTextMatch[1]);
      if (method === 'GET') return studyRoutes.getDocumentText(req, res, id, session);
    }
    const docShareMatch = pathname.match(/^\/api\/study\/documents\/(\d+)\/share$/);
    if (docShareMatch) {
      const session = requireSession(req, res); if (!session) return;
      const id = Number(docShareMatch[1]);
      if (method === 'POST') {
        const body = await readJsonBody(req);
        return studyRoutes.shareDocument(req, res, id, body, session);
      }
    }

    // ---- Public share endpoint ----
    const shareMatch = pathname.match(/^\/api\/share\/([a-f0-9]{32})$/);
    if (shareMatch && method === 'GET') {
      return studyRoutes.getSharedDocument(req, res, shareMatch[1]);
    }

    // ---- Flashcards ----
    if (pathname === '/api/study/flashcards') {
      const session = requireSession(req, res); if (!session) return;
      if (method === 'GET') return studyRoutes.listFlashcards(req, res, session);
    }
    const fcReviewMatch = pathname.match(/^\/api\/study\/flashcards\/(\d+)\/review$/);
    if (fcReviewMatch) {
      const session = requireSession(req, res); if (!session) return;
      const cardId = Number(fcReviewMatch[1]);
      if (method === 'POST') {
        const body = await readJsonBody(req);
        return studyRoutes.reviewFlashcard(req, res, cardId, body, session);
      }
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

    // ---- chat memory ----
    if (pathname === '/api/study/chat-history') {
      const session = requireSession(req, res); if (!session) return;
      if (method === 'GET') return studyRoutes.getChatHistory(req, res, session, url);
      if (method === 'POST') {
        const body = await readJsonBody(req);
        return studyRoutes.saveChatHistory(req, res, body, session);
      }
      if (method === 'DELETE') return studyRoutes.deleteChatHistory(req, res, session);
    }

    // ---- notes ----
    if (pathname === '/api/study/notes') {
      const session = requireSession(req, res); if (!session) return;
      if (method === 'GET') return studyRoutes.listNotes(req, res, session);
      if (method === 'POST') { const body = await readJsonBody(req); return studyRoutes.createNoteHandler(req, res, body, session); }
    }
    const noteMatch = pathname.match(/^\/api\/study\/notes\/(\d+)$/);
    if (noteMatch) {
      const session = requireSession(req, res); if (!session) return;
      const noteId = Number(noteMatch[1]);
      if (method === 'PATCH') { const body = await readJsonBody(req); return studyRoutes.updateNoteHandler(req, res, noteId, body, session); }
      if (method === 'DELETE') return studyRoutes.deleteNoteHandler(req, res, noteId, session);
    }
    // ---- focus sessions ----
    if (pathname === '/api/study/focus-sessions') {
      const session = requireSession(req, res); if (!session) return;
      if (method === 'GET') return studyRoutes.getFocusStats(req, res, session);
      if (method === 'POST') { const body = await readJsonBody(req); return studyRoutes.logFocusSessionHandler(req, res, body, session); }
    }
    // ---- achievements ----
    if (pathname === '/api/study/achievements') {
      const session = requireSession(req, res); if (!session) return;
      if (method === 'GET') return studyRoutes.getAchievementsHandler(req, res, session);
    }
    // ---- weak spots ----
    if (pathname === '/api/study/weak-spots') {
      const session = requireSession(req, res); if (!session) return;
      if (method === 'GET') return studyRoutes.getWeakSpotsHandler(req, res, session);
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

server.listen(PORT, '0.0.0.0', () => {
  console.log(`MedPass server listening on http://0.0.0.0:${PORT}`);
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
