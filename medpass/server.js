'use strict';
const http = require('node:http');
const path = require('node:path');
const { readJsonBody, sendJson, sendRedirect, sendStaticFile } = require('./lib/http');
const { getSessionUser } = require('./lib/sessions');
const auth  = require('./routes/auth');
const ai    = require('./routes/ai');
const study = require('./routes/study');
const games = require('./routes/games');

const PORT       = Number(process.env.PORT) || 5000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const STATIC = new Set([
  '/login.html', '/signup.html', '/forgot-password.html', '/reset-password.html', '/share.html',
  '/auth.css', '/auth.js', '/app.css', '/app.js', '/manifest.json', '/sw.js',
]);

function csp() {
  return [
    "default-src 'self'",
    "img-src 'self' data: blob:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
    "worker-src 'self' blob:",
    "connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com",
  ].join('; ');
}

function setHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Content-Security-Policy', csp());
}

function requireSession(req, res) {
  const s = getSessionUser(req);
  if (!s) { sendJson(res, 401, { error: 'Sign in required.' }); return null; }
  return s;
}

async function handle(req, res) {
  setHeaders(res);
  const url      = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  const method   = req.method;

  try {
    // Static public files
    if (method === 'GET' && STATIC.has(pathname))
      return sendStaticFile(res, PUBLIC_DIR, pathname.slice(1));

    // Favicon — silence browser auto-request
    if (method === 'GET' && pathname === '/favicon.ico') {
      res.writeHead(204); res.end(); return;
    }

    // Root redirect
    if (method === 'GET' && pathname === '/') {
      return getSessionUser(req) ? sendRedirect(res, '/app.html') : sendRedirect(res, '/login.html');
    }

    // Protected app shell
    if (method === 'GET' && pathname === '/app.html') {
      if (!getSessionUser(req)) return sendRedirect(res, '/login.html');
      return sendStaticFile(res, PUBLIC_DIR, 'app.html');
    }

    // ── Auth ──────────────────────────────────────────────────────────────────
    if (method === 'POST' && pathname === '/api/auth/signup')
      return await auth.signup(req, res, await readJsonBody(req));
    if (method === 'GET'  && pathname === '/api/auth/verify-email')
      return await auth.verifyEmail(req, res, url.searchParams);
    if (method === 'POST' && pathname === '/api/auth/login')
      return await auth.login(req, res, await readJsonBody(req));
    if (method === 'POST' && pathname === '/api/auth/logout')
      return auth.logout(req, res);
    if (method === 'GET'  && pathname === '/api/auth/me')
      return auth.me(req, res);
    if (method === 'POST' && pathname === '/api/auth/forgot-password')
      return await auth.forgotPassword(req, res, await readJsonBody(req));
    if (method === 'POST' && pathname === '/api/auth/reset-password')
      return await auth.resetPassword(req, res, await readJsonBody(req));

    // ── AI ────────────────────────────────────────────────────────────────────
    if (method === 'POST' && pathname === '/api/ai/chat') {
      const s = requireSession(req, res); if (!s) return;
      return await ai.chat(req, res, await readJsonBody(req), s);
    }
    if (method === 'POST' && pathname === '/api/ai/transcribe') {
      const s = requireSession(req, res); if (!s) return;
      return await ai.transcribe(req, res, s);
    }

    // ── Study — Dashboard ─────────────────────────────────────────────────────
    if (method === 'GET' && pathname === '/api/study/dashboard') {
      const s = requireSession(req, res); if (!s) return;
      return study.getDashboard(req, res, s);
    }
    if (method === 'GET' && pathname === '/api/study/activity') {
      const s = requireSession(req, res); if (!s) return;
      return study.getActivity(req, res, s);
    }

    // ── Study — Runs ──────────────────────────────────────────────────────────
    if (pathname === '/api/study/runs') {
      const s = requireSession(req, res); if (!s) return;
      if (method === 'GET')  return study.list(req, res, s);
      if (method === 'POST') return study.create(req, res, await readJsonBody(req), s);
    }
    const runM = pathname.match(/^\/api\/study\/runs\/(\d+)$/);
    if (runM) {
      const s = requireSession(req, res); if (!s) return;
      const id = Number(runM[1]);
      if (method === 'GET')    return study.get(req, res, id, s);
      if (method === 'DELETE') return study.del(req, res, id, s);
      if (method === 'PATCH')  return study.patch(req, res, id, await readJsonBody(req), s);
    }

    // ── Study — Bookmarks ─────────────────────────────────────────────────────
    if (pathname === '/api/study/bookmarks') {
      const s = requireSession(req, res); if (!s) return;
      if (method === 'GET')  return study.listBookmarks(req, res, s);
      if (method === 'POST') return study.createBookmark(req, res, await readJsonBody(req), s);
    }
    const bmM = pathname.match(/^\/api\/study\/bookmarks\/(\d+)$/);
    if (bmM) {
      const s = requireSession(req, res); if (!s) return;
      if (method === 'DELETE') return study.delBookmark(req, res, Number(bmM[1]), s);
    }

    // ── Study — Documents ─────────────────────────────────────────────────────
    if (pathname === '/api/study/documents') {
      const s = requireSession(req, res); if (!s) return;
      if (method === 'GET')  return study.listDocuments(req, res, s);
      if (method === 'POST') return study.createDocument(req, res, await readJsonBody(req), s);
    }
    const docM = pathname.match(/^\/api\/study\/documents\/(\d+)$/);
    if (docM) {
      const s = requireSession(req, res); if (!s) return;
      const id = Number(docM[1]);
      if (method === 'DELETE') return study.deleteDocument(req, res, id, s);
      if (method === 'PATCH')  return study.patchDocument(req, res, id, await readJsonBody(req), s);
    }
    const docTextM = pathname.match(/^\/api\/study\/documents\/(\d+)\/text$/);
    if (docTextM) {
      const s = requireSession(req, res); if (!s) return;
      if (method === 'GET') return study.getDocumentText(req, res, Number(docTextM[1]), s);
    }
    const docShareM = pathname.match(/^\/api\/study\/documents\/(\d+)\/share$/);
    if (docShareM) {
      const s = requireSession(req, res); if (!s) return;
      if (method === 'POST') return study.shareDocument(req, res, Number(docShareM[1]), await readJsonBody(req), s);
    }

    // ── Study — Public share ──────────────────────────────────────────────────
    const shareM = pathname.match(/^\/api\/share\/([a-f0-9]{32})$/);
    if (shareM && method === 'GET') return study.getSharedDocument(req, res, shareM[1]);

    // ── Study — Flashcards ────────────────────────────────────────────────────
    if (pathname === '/api/study/flashcards') {
      const s = requireSession(req, res); if (!s) return;
      if (method === 'GET') return study.listFlashcards(req, res, s);
    }
    const fcDocM = pathname.match(/^\/api\/study\/flashcards\/(\d+)$/);
    if (fcDocM) {
      const s = requireSession(req, res); if (!s) return;
      const id = Number(fcDocM[1]);
      if (method === 'GET')  return study.listFlashcardsForDoc(req, res, id, s);
      if (method === 'POST') return study.saveFlashcards(req, res, id, await readJsonBody(req), s);
    }
    const fcRevM = pathname.match(/^\/api\/study\/flashcards\/(\d+)\/review$/);
    if (fcRevM) {
      const s = requireSession(req, res); if (!s) return;
      if (method === 'POST') return study.reviewFlashcard(req, res, Number(fcRevM[1]), await readJsonBody(req), s);
    }

    // ── Study — XP ───────────────────────────────────────────────────────────
    if (pathname === '/api/study/xp') {
      const s = requireSession(req, res); if (!s) return;
      if (method === 'GET')  return study.getXP(req, res, s);
      if (method === 'POST') return study.awardXP(req, res, await readJsonBody(req), s);
    }

    // ── Study — Goals ─────────────────────────────────────────────────────────
    if (pathname === '/api/study/goals') {
      const s = requireSession(req, res); if (!s) return;
      if (method === 'GET')  return study.listGoals(req, res, s);
      if (method === 'POST') return study.createGoal(req, res, await readJsonBody(req), s);
    }
    const goalM = pathname.match(/^\/api\/study\/goals\/(\d+)$/);
    if (goalM) {
      const s = requireSession(req, res); if (!s) return;
      const id = Number(goalM[1]);
      if (method === 'PATCH')  return study.updateGoal(req, res, id, await readJsonBody(req), s);
      if (method === 'DELETE') return study.deleteGoal(req, res, id, s);
    }

    // ── Study — Chat History ──────────────────────────────────────────────────
    if (pathname === '/api/study/chat-history') {
      const s = requireSession(req, res); if (!s) return;
      if (method === 'GET')    return study.getChatHistory(req, res, s, url);
      if (method === 'POST')   return study.saveChatHistory(req, res, await readJsonBody(req), s);
      if (method === 'DELETE') return study.deleteChatHistory(req, res, s);
    }

    // ── Study — Notes ─────────────────────────────────────────────────────────
    if (pathname === '/api/study/notes') {
      const s = requireSession(req, res); if (!s) return;
      if (method === 'GET')  return study.listNotes(req, res, s);
      if (method === 'POST') return study.createNote(req, res, await readJsonBody(req), s);
    }
    const noteM = pathname.match(/^\/api\/study\/notes\/(\d+)$/);
    if (noteM) {
      const s = requireSession(req, res); if (!s) return;
      const id = Number(noteM[1]);
      if (method === 'PATCH')  return study.updateNote(req, res, id, await readJsonBody(req), s);
      if (method === 'DELETE') return study.deleteNote(req, res, id, s);
    }

    // ── Study — Focus Sessions ────────────────────────────────────────────────
    if (pathname === '/api/study/focus-sessions') {
      const s = requireSession(req, res); if (!s) return;
      if (method === 'GET')  return study.getFocusStats(req, res, s);
      if (method === 'POST') return study.logFocusSession(req, res, await readJsonBody(req), s);
    }

    // ── Study — Analytics / Search / Misc ────────────────────────────────────
    if (method === 'GET' && pathname === '/api/study/analytics') {
      const s = requireSession(req, res); if (!s) return;
      return study.getAnalytics(req, res, s);
    }
    if (method === 'GET' && pathname === '/api/study/search') {
      const s = requireSession(req, res); if (!s) return;
      return study.search(req, res, s, url);
    }
    if (method === 'GET' && pathname === '/api/study/weak-spots') {
      const s = requireSession(req, res); if (!s) return;
      return study.getWeakSpots(req, res, s);
    }
    if (method === 'GET' && pathname === '/api/study/achievements') {
      const s = requireSession(req, res); if (!s) return;
      return study.getAchievements(req, res, s);
    }

    // ── Games ─────────────────────────────────────────────────────────────────
    if (pathname === '/api/games/rooms') {
      const s = requireSession(req, res); if (!s) return;
      if (method === 'POST') return games.createRoom(req, res, await readJsonBody(req), s);
    }
    const gameRoomM = pathname.match(/^\/api\/games\/rooms\/([A-F0-9]{6})$/);
    if (gameRoomM) {
      const s = requireSession(req, res); if (!s) return;
      const rId = gameRoomM[1];
      if (method === 'GET')  return games.getRoom(req, res, rId, s);
      if (method === 'POST') return games.joinRoom(req, res, rId, await readJsonBody(req), s);
    }
    const gameMoveM = pathname.match(/^\/api\/games\/rooms\/([A-F0-9]{6})\/move$/);
    if (gameMoveM) {
      const s = requireSession(req, res); if (!s) return;
      if (method === 'POST') return games.move(req, res, gameMoveM[1], await readJsonBody(req), s);
    }

    // ── Health ────────────────────────────────────────────────────────────────
    if (method === 'GET' && pathname === '/health')
      return sendJson(res, 200, { status: 'ok', ts: new Date().toISOString() });

    // ── 404 ───────────────────────────────────────────────────────────────────
    if (pathname.startsWith('/api/')) return sendJson(res, 404, { error: 'Not found.' });
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');

  } catch (err) {
    console.error('Request error:', err.message);
    if (!res.headersSent) sendJson(res, err.statusCode || 500, { error: err.statusCode ? err.message : 'Internal server error.' });
  }
}

const server = http.createServer((req, res) => {
  handle(req, res).catch(err => {
    console.error('Unhandled:', err);
    if (!res.headersSent) { res.writeHead(500); res.end('Internal server error'); }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`MedPass v2 listening on http://0.0.0.0:${PORT}`);
  if (!process.env.GROQ_API_KEY) console.warn('⚠  GROQ_API_KEY not set — AI tutor disabled until configured.');
});

process.on('SIGTERM', () => server.close(() => { try { require('./lib/db').db.exec('PRAGMA wal_checkpoint(TRUNCATE)'); } catch {} process.exit(0); }));
process.on('SIGINT',  () => server.close(() => process.exit(0)));

module.exports = server;
