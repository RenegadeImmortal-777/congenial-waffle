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
    return sendJson(res, 201, { document: doc });
  } catch (err) {
    console.error('createDocument error:', err.message);
    return sendJson(res, 500, { error: 'Could not save document.' });
  }
}

/** PATCH /api/study/documents/:id — update status + run_id after processing */
function patchDocument(req, res, id, body, session) {
  const { status, runId } = body || {};
  if (!status) return sendJson(res, 400, { error: 'status required.' });
  q.updateDocumentStatus(id, session.user.id, status, runId || null);
  return sendJson(res, 200, { ok: true });
}

/** DELETE /api/study/documents/:id */
function deleteDocument(req, res, id, session) {
  q.deleteDocument(id, session.user.id);
  return sendJson(res, 200, { ok: true });
}

module.exports = { list, create, get, patch, del, listBookmarks, createBookmark, delBookmark, listDocuments, createDocument, patchDocument, deleteDocument };
