'use strict';
const { sendJson } = require('../lib/http');
const db = require('../lib/db');

const study = {
  // ── Runs ──────────────────────────────────────────────────────────────────
  list(req, res, session) {
    return sendJson(res, 200, { runs: db.listStudyRuns(session.user.id) });
  },
  create(req, res, body, session) {
    const { documentName, items, note } = body || {};
    if (!documentName?.trim()) return sendJson(res, 400, { error: 'documentName required.' });
    if (!Array.isArray(items) || !items.length) return sendJson(res, 400, { error: 'items array required.' });
    try {
      const run = db.createStudyRun(session.user.id, { documentName: documentName.trim().slice(0, 200), items, note });
      const correct = items.filter(i => !i.isUnanswered && i.correctLetter).length;
      db.awardXP(session.user.id, correct > 0 ? correct * 10 : 5, correct > 0 ? 'quiz_correct' : 'quiz_done');
      return sendJson(res, 201, { run });
    } catch (err) { return sendJson(res, 500, { error: 'Could not save run.' }); }
  },
  get(req, res, id, session) {
    const run = db.getStudyRun(id, session.user.id);
    if (!run) return sendJson(res, 404, { error: 'Run not found.' });
    return sendJson(res, 200, { run });
  },
  patch(req, res, id, body, session) {
    if (typeof body.note !== 'string') return sendJson(res, 400, { error: '"note" string required.' });
    db.updateStudyRunNote(id, session.user.id, body.note);
    return sendJson(res, 200, { ok: true });
  },
  del(req, res, id, session) {
    db.deleteStudyRun(id, session.user.id);
    return sendJson(res, 200, { ok: true });
  },

  // ── Bookmarks ──────────────────────────────────────────────────────────────
  listBookmarks(req, res, session) { return sendJson(res, 200, { bookmarks: db.listBookmarks(session.user.id) }); },
  createBookmark(req, res, body, session) {
    const { runId, questionNum, stem, correctLetter, explanation } = body || {};
    if (!Number.isInteger(questionNum) || questionNum < 0) return sendJson(res, 400, { error: 'questionNum integer required.' });
    try { db.upsertBookmark(session.user.id, { runId, questionNum, stem, correctLetter, explanation }); return sendJson(res, 201, { ok: true }); }
    catch { return sendJson(res, 500, { error: 'Could not save bookmark.' }); }
  },
  delBookmark(req, res, id, session) { db.deleteBookmark(id, session.user.id); return sendJson(res, 200, { ok: true }); },

  // ── Documents ──────────────────────────────────────────────────────────────
  listDocuments(req, res, session) { return sendJson(res, 200, { documents: db.listDocuments(session.user.id) }); },
  createDocument(req, res, body, session) {
    const { name, sizeBytes, mimeType, textContent } = body || {};
    if (!name?.trim()) return sendJson(res, 400, { error: 'name required.' });
    if (typeof textContent !== 'string' || !textContent.trim()) return sendJson(res, 400, { error: 'textContent required.' });
    try {
      const doc = db.createDocument(session.user.id, { name: name.trim(), sizeBytes: Number(sizeBytes) || 0, mimeType: mimeType || '', textContent });
      return sendJson(res, 201, { document: doc });
    } catch { return sendJson(res, 500, { error: 'Could not save document.' }); }
  },
  patchDocument(req, res, id, body, session) {
    const { status, runId, docType, tags } = body || {};
    if (tags !== undefined) db.setDocumentTags(id, session.user.id, tags);
    if (status) { db.updateDocumentStatus(id, session.user.id, status, runId || null); if (docType) db.setDocumentType(id, session.user.id, docType); }
    return sendJson(res, 200, { ok: true });
  },
  deleteDocument(req, res, id, session) { db.deleteDocument(id, session.user.id); return sendJson(res, 200, { ok: true }); },
  getDocumentText(req, res, id, session) {
    const doc = db.getDocumentById(id);
    if (!doc || doc.user_id !== session.user.id) return sendJson(res, 404, { error: 'Document not found.' });
    if (doc.status !== 'done') return sendJson(res, 400, { error: 'Document not ready.' });
    return sendJson(res, 200, { id: doc.id, name: doc.name, text: doc.text_content || '' });
  },
  shareDocument(req, res, id, body, session) {
    if (body?.revoke) { db.revokeDocumentShare(id, session.user.id); return sendJson(res, 200, { ok: true, token: null }); }
    try { return sendJson(res, 200, { ok: true, token: db.setDocumentShareToken(id, session.user.id) }); }
    catch { return sendJson(res, 500, { error: 'Could not generate share link.' }); }
  },
  getSharedDocument(req, res, token) {
    const doc = db.getDocumentByShareToken(token);
    if (!doc) return sendJson(res, 404, { error: 'Share link not found.' });
    return sendJson(res, 200, { document: doc });
  },

  // ── Flashcards ──────────────────────────────────────────────────────────────
  listFlashcards(req, res, session) { return sendJson(res, 200, { flashcards: db.listAllFlashcards(session.user.id) }); },
  listFlashcardsForDoc(req, res, docId, session) { return sendJson(res, 200, { flashcards: db.listFlashcardsForDoc(docId, session.user.id) }); },
  saveFlashcards(req, res, docId, body, session) {
    if (!Array.isArray(body?.cards)) return sendJson(res, 400, { error: 'cards array required.' });
    try { db.saveFlashcards(session.user.id, docId, body.cards); return sendJson(res, 201, { ok: true, count: body.cards.length }); }
    catch { return sendJson(res, 500, { error: 'Could not save flashcards.' }); }
  },
  reviewFlashcard(req, res, cardId, body, session) {
    const { rating } = body || {};
    if (typeof rating !== 'number' || rating < 0 || rating > 3) return sendJson(res, 400, { error: 'rating must be 0-3.' });
    const result = db.reviewFlashcard(cardId, session.user.id, rating);
    if (!result) return sendJson(res, 404, { error: 'Flashcard not found.' });
    return sendJson(res, 200, result);
  },

  // ── Dashboard ──────────────────────────────────────────────────────────────
  getDashboard(req, res, session) {
    const stats = db.getDashboardStats(session.user.id);
    const recentRuns = db.listStudyRuns(session.user.id).slice(0, 5);
    const recentDocs = db.listDocuments(session.user.id).slice(0, 5);
    return sendJson(res, 200, { stats, recentRuns, recentDocs });
  },
  getActivity(req, res, session) { return sendJson(res, 200, { activity: db.getActivityHeatmap(session.user.id) }); },

  // ── Analytics ──────────────────────────────────────────────────────────────
  getAnalytics(req, res, session) { return sendJson(res, 200, db.getAnalytics(session.user.id)); },

  // ── Search ──────────────────────────────────────────────────────────────────
  search(req, res, session, url) {
    const q = (url.searchParams.get('q') || '').trim();
    if (!q || q.length < 2) return sendJson(res, 200, { documents: [], flashcards: [], bookmarks: [] });
    return sendJson(res, 200, db.search(session.user.id, q.slice(0, 100)));
  },

  // ── XP ──────────────────────────────────────────────────────────────────────
  getXP(req, res, session) { return sendJson(res, 200, db.getXPLevel(db.getTotalXP(session.user.id))); },
  awardXP(req, res, body, session) {
    const { amount, reason } = body || {};
    if (typeof amount !== 'number' || amount < 0) return sendJson(res, 400, { error: 'amount required.' });
    db.awardXP(session.user.id, Math.min(amount, 500), reason || 'manual');
    return sendJson(res, 200, db.getXPLevel(db.getTotalXP(session.user.id)));
  },

  // ── Goals ──────────────────────────────────────────────────────────────────
  listGoals(req, res, session) { return sendJson(res, 200, { goals: db.listGoals(session.user.id) }); },
  createGoal(req, res, body, session) {
    const { title, goalType, targetValue, targetDate } = body || {};
    if (!title?.trim()) return sendJson(res, 400, { error: 'title required.' });
    if (!targetDate || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) return sendJson(res, 400, { error: 'targetDate (YYYY-MM-DD) required.' });
    try { return sendJson(res, 201, { goal: db.createGoal(session.user.id, { title: title.trim(), goalType, targetValue, targetDate }) }); }
    catch { return sendJson(res, 500, { error: 'Could not save goal.' }); }
  },
  updateGoal(req, res, id, body, session) {
    const goal = db.updateGoal(id, session.user.id, body || {});
    if (!goal) return sendJson(res, 404, { error: 'Goal not found.' });
    return sendJson(res, 200, { goal });
  },
  deleteGoal(req, res, id, session) { db.deleteGoal(id, session.user.id); return sendJson(res, 200, { ok: true }); },

  // ── Chat History ────────────────────────────────────────────────────────────
  getChatHistory(req, res, session, url) {
    const limit = Number(url.searchParams.get('limit')) || 100;
    return sendJson(res, 200, { messages: db.listChatMessages(session.user.id, limit) });
  },
  saveChatHistory(req, res, body, session) {
    const msgs = Array.isArray(body?.messages) ? body.messages : null;
    if (!msgs?.length) return sendJson(res, 400, { error: '"messages" array required.' });
    try { db.saveChatMessages(session.user.id, msgs); return sendJson(res, 200, { saved: msgs.length }); }
    catch { return sendJson(res, 500, { error: 'Could not save chat history.' }); }
  },
  deleteChatHistory(req, res, session) { db.clearChatMessages(session.user.id); return sendJson(res, 200, { cleared: true }); },

  // ── Notes ────────────────────────────────────────────────────────────────────
  listNotes(req, res, session) { return sendJson(res, 200, { notes: db.listNotes(session.user.id) }); },
  createNote(req, res, body, session) {
    const { title, body: noteBody, color } = body || {};
    const result = db.createNote(session.user.id, { title, body: noteBody, color });
    const note = db.getNoteById(result.lastInsertRowid, session.user.id);
    return sendJson(res, 201, { note });
  },
  updateNote(req, res, id, body, session) {
    const note = db.updateNote(id, session.user.id, body || {});
    if (!note) return sendJson(res, 404, { error: 'Note not found.' });
    return sendJson(res, 200, { note });
  },
  deleteNote(req, res, id, session) { db.deleteNote(id, session.user.id); return sendJson(res, 200, { deleted: true }); },

  // ── Focus Sessions ────────────────────────────────────────────────────────────
  getFocusStats(req, res, session) { return sendJson(res, 200, db.getFocusStats(session.user.id)); },
  logFocusSession(req, res, body, session) {
    db.logFocusSession(session.user.id, body || {});
    return sendJson(res, 201, { logged: true });
  },

  // ── Weak Spots / Achievements ─────────────────────────────────────────────────
  getWeakSpots(req, res, session) { return sendJson(res, 200, { weakSpots: db.getWeakSpots(session.user.id) }); },
  getAchievements(req, res, session) { return sendJson(res, 200, { achievements: db.getAchievements(session.user.id) }); },
};

module.exports = study;
