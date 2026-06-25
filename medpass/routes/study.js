'use strict';
const { sendJson } = require('../lib/http');
const q = require('../lib/queries');

/** GET /api/study/runs — list summary rows for the authenticated user */
function list(req, res, session) {
  const runs = q.listStudyRunsForUser(session.user.id);
  return sendJson(res, 200, { runs });
}

/** POST /api/study/runs — persist a new completed run */
function create(req, res, body, session) {
  const { documentName, items } = body || {};
  if (!documentName || typeof documentName !== 'string' || documentName.trim() === '') {
    return sendJson(res, 400, { error: 'documentName is required.' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return sendJson(res, 400, { error: 'items array is required and must be non-empty.' });
  }
  try {
    const run = q.createStudyRun(session.user.id, {
      documentName: documentName.trim().slice(0, 200),
      items,
      note: (body.note || '').trim().slice(0, 500),
    });
    // Award XP for creating a study run (10 XP per correct answer)
    const correct = items.filter(i => !i.isUnanswered && i.correctLetter).length;
    if (correct > 0) q.awardXP(session.user.id, correct * 10, 'quiz_correct');
    else q.awardXP(session.user.id, 5, 'quiz_completed');
    return sendJson(res, 201, { run });
  } catch (err) {
    console.error('createStudyRun error:', err.message);
    return sendJson(res, 500, { error: 'Could not save run.' });
  }
}

/** GET /api/study/runs/:id — full detail including items */
function get(req, res, id, session) {
  const run = q.getStudyRun(id, session.user.id);
  if (!run) return sendJson(res, 404, { error: 'Run not found.' });
  return sendJson(res, 200, { run });
}

/** PATCH /api/study/runs/:id — update annotation note */
function patch(req, res, id, body, session) {
  if (typeof body.note !== 'string') {
    return sendJson(res, 400, { error: '"note" string is required.' });
  }
  q.updateStudyRunNote(id, session.user.id, body.note);
  return sendJson(res, 200, { ok: true });
}

/** DELETE /api/study/runs/:id */
function del(req, res, id, session) {
  q.deleteStudyRun(id, session.user.id);
  return sendJson(res, 200, { ok: true });
}

// ---- bookmarks ----

/** GET /api/study/bookmarks */
function listBookmarks(req, res, session) {
  const bookmarks = q.listBookmarksForUser(session.user.id);
  return sendJson(res, 200, { bookmarks });
}

/** POST /api/study/bookmarks */
function createBookmark(req, res, body, session) {
  const { runId, questionNum, stem, correctLetter, explanation } = body || {};
  if (!Number.isInteger(questionNum) || questionNum < 0) {
    return sendJson(res, 400, { error: 'questionNum (integer) is required.' });
  }
  try {
    q.upsertBookmark(session.user.id, { runId: runId || null, questionNum, stem, correctLetter, explanation });
    return sendJson(res, 201, { ok: true });
  } catch (err) {
    console.error('upsertBookmark error:', err.message);
    return sendJson(res, 500, { error: 'Could not save bookmark.' });
  }
}

/** DELETE /api/study/bookmarks/:id */
function delBookmark(req, res, id, session) {
  q.deleteBookmark(id, session.user.id);
  return sendJson(res, 200, { ok: true });
}

/** GET /api/study/documents */
function listDocuments(req, res, session) {
  const docs = q.listDocumentsForUser(session.user.id);
  return sendJson(res, 200, { documents: docs });
}

/** POST /api/study/documents — upload extracted text */
function createDocument(req, res, body, session) {
  const { name, sizeBytes, mimeType, textContent } = body || {};
  if (!name || typeof name !== 'string' || !name.trim()) {
    return sendJson(res, 400, { error: 'name is required.' });
  }
  if (typeof textContent !== 'string' || !textContent.trim()) {
    return sendJson(res, 400, { error: 'textContent is required.' });
  }
  try {
    const doc = q.createDocument(session.user.id, {
      name: name.trim(),
      sizeBytes: Number(sizeBytes) || 0,
      mimeType: mimeType || '',
      textContent,
    });
    q.awardXP(session.user.id, 20, 'document_uploaded');
    return sendJson(res, 201, { document: doc });
  } catch (err) {
    console.error('createDocument error:', err.message);
    return sendJson(res, 500, { error: 'Could not save document.' });
  }
}

/** PATCH /api/study/documents/:id — update status + run_id + docType + tags after processing */
function patchDocument(req, res, id, body, session) {
  const { status, runId, docType, tags } = body || {};
  if (tags !== undefined) {
    q.setDocumentTags(id, session.user.id, tags);
  }
  if (status) {
    q.updateDocumentStatus(id, session.user.id, status, runId || null);
    if (docType) q.setDocumentType(id, session.user.id, docType);
  }
  return sendJson(res, 200, { ok: true });
}

/** DELETE /api/study/documents/:id */
function deleteDocument(req, res, id, session) {
  q.deleteDocument(id, session.user.id);
  return sendJson(res, 200, { ok: true });
}

/** POST /api/study/documents/:id/share — generate or return share token */
function shareDocument(req, res, id, body, session) {
  const { revoke } = body || {};
  if (revoke) {
    q.revokeDocumentShare(id, session.user.id);
    return sendJson(res, 200, { ok: true, token: null });
  }
  try {
    const token = q.setDocumentShareToken(id, session.user.id);
    return sendJson(res, 200, { ok: true, token });
  } catch (err) {
    console.error('shareDocument error:', err.message);
    return sendJson(res, 500, { error: 'Could not generate share link.' });
  }
}

/** GET /api/share/:token — public read-only document */
function getSharedDocument(req, res, token) {
  const doc = q.getDocumentByShareToken(token);
  if (!doc) return sendJson(res, 404, { error: 'Share link not found or expired.' });
  return sendJson(res, 200, { document: doc });
}

/** GET /api/study/dashboard */
function getDashboard(req, res, session) {
  const stats = q.getDashboardStats(session.user.id);
  const recentRuns = q.listStudyRunsForUser(session.user.id).slice(0, 5);
  const recentDocs = q.listDocumentsForUser(session.user.id).slice(0, 5);
  return sendJson(res, 200, { stats, recentRuns, recentDocs });
}

/** GET /api/study/flashcards — all flashcards for the user */
function listFlashcards(req, res, session) {
  const cards = q.listAllFlashcardsForUser(session.user.id);
  return sendJson(res, 200, { flashcards: cards });
}

/** GET /api/study/flashcards/:docId — flashcards for one document */
function listFlashcardsForDoc(req, res, docId, session) {
  const cards = q.listFlashcardsForDocument(docId, session.user.id);
  return sendJson(res, 200, { flashcards: cards });
}

/** GET /api/study/activity — heatmap data for the last ~52 weeks */
function getActivityHeatmap(req, res, session) {
  const data = q.getActivityHeatmap(session.user.id);
  return sendJson(res, 200, { activity: data });
}

/** POST /api/study/flashcards/:docId — save flashcards for a document */
function saveFlashcards(req, res, docId, body, session) {
  const { cards } = body || {};
  if (!Array.isArray(cards)) return sendJson(res, 400, { error: 'cards array required.' });
  try {
    q.saveFlashcards(session.user.id, docId, cards);
    return sendJson(res, 201, { ok: true, count: cards.length });
  } catch (err) {
    console.error('saveFlashcards error:', err.message);
    return sendJson(res, 500, { error: 'Could not save flashcards.' });
  }
}

/** POST /api/study/flashcards/:id/review — SRS review rating */
function reviewFlashcard(req, res, cardId, body, session) {
  const { rating } = body || {};
  if (typeof rating !== 'number' || rating < 0 || rating > 3) {
    return sendJson(res, 400, { error: 'rating must be 0-3 (Again/Hard/Good/Easy).' });
  }
  try {
    const result = q.reviewFlashcard(cardId, session.user.id, rating);
    if (!result) return sendJson(res, 404, { error: 'Flashcard not found.' });
    return sendJson(res, 200, result);
  } catch (err) {
    console.error('reviewFlashcard error:', err.message);
    return sendJson(res, 500, { error: 'Could not save review.' });
  }
}

// ---- XP ----

/** GET /api/study/xp */
function getXP(req, res, session) {
  const xp = q.getTotalXPForUser(session.user.id);
  const level = q.getXPLevel(xp);
  return sendJson(res, 200, level);
}

/** POST /api/study/xp — award XP manually */
function awardXP(req, res, body, session) {
  const { amount, reason } = body || {};
  if (typeof amount !== 'number' || amount < 0) return sendJson(res, 400, { error: 'amount required.' });
  q.awardXP(session.user.id, Math.min(amount, 500), reason || 'manual');
  const xp = q.getTotalXPForUser(session.user.id);
  return sendJson(res, 200, q.getXPLevel(xp));
}

// ---- Goals / Planner ----

/** GET /api/study/goals */
function listGoals(req, res, session) {
  const goals = q.listGoalsForUser(session.user.id);
  return sendJson(res, 200, { goals });
}

/** POST /api/study/goals */
function createGoal(req, res, body, session) {
  const { title, goalType, targetValue, targetDate } = body || {};
  if (!title || typeof title !== 'string' || !title.trim()) return sendJson(res, 400, { error: 'title is required.' });
  if (!targetDate || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) return sendJson(res, 400, { error: 'targetDate (YYYY-MM-DD) is required.' });
  try {
    const goal = q.createGoal(session.user.id, { title: title.trim(), goalType, targetValue, targetDate });
    return sendJson(res, 201, { goal });
  } catch (err) {
    console.error('createGoal error:', err.message);
    return sendJson(res, 500, { error: 'Could not save goal.' });
  }
}

/** PATCH /api/study/goals/:id */
function updateGoal(req, res, id, body, session) {
  const goal = q.updateGoal(id, session.user.id, body || {});
  if (!goal) return sendJson(res, 404, { error: 'Goal not found.' });
  return sendJson(res, 200, { goal });
}

/** DELETE /api/study/goals/:id */
function deleteGoal(req, res, id, session) {
  q.deleteGoal(id, session.user.id);
  return sendJson(res, 200, { ok: true });
}

// ---- Analytics ----

/** GET /api/study/analytics */
function getAnalytics(req, res, session) {
  const data = q.getAnalyticsForUser(session.user.id);
  return sendJson(res, 200, data);
}

// ---- Search ----

/** GET /api/study/search?q= */
function search(req, res, session, url) {
  const query = (url.searchParams.get('q') || '').trim();
  if (!query || query.length < 2) return sendJson(res, 200, { documents: [], flashcards: [], bookmarks: [] });
  const results = q.searchForUser(session.user.id, query.slice(0, 100));
  return sendJson(res, 200, results);
}

module.exports = {
  list, create, get, patch, del,
  listBookmarks, createBookmark, delBookmark,
  listDocuments, createDocument, patchDocument, deleteDocument,
  shareDocument, getSharedDocument,
  getDashboard, listFlashcards, listFlashcardsForDoc, saveFlashcards,
  reviewFlashcard, getActivityHeatmap,
  getXP, awardXP,
  listGoals, createGoal, updateGoal, deleteGoal,
  getAnalytics,
  search,
};
