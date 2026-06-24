'use strict';
const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'medpass.sqlite'));

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_verified INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS verification_tokens (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reset_tokens (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_verification_user ON verification_tokens(user_id);
  CREATE INDEX IF NOT EXISTS idx_reset_user ON reset_tokens(user_id);

  CREATE TABLE IF NOT EXISTS study_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_name TEXT NOT NULL,
    total_questions INTEGER NOT NULL DEFAULT 0,
    answered_count INTEGER NOT NULL DEFAULT 0,
    unanswered_count INTEGER NOT NULL DEFAULT 0,
    disagreement_count INTEGER NOT NULL DEFAULT 0,
    results_json TEXT NOT NULL DEFAULT '[]',
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_study_runs_user ON study_runs(user_id);

  -- Bookmarked questions (saved outside of a full run — e.g. from self-assessment)
  CREATE TABLE IF NOT EXISTS bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    run_id INTEGER REFERENCES study_runs(id) ON DELETE CASCADE,
    question_num INTEGER NOT NULL,
    stem TEXT NOT NULL DEFAULT '',
    correct_letter TEXT,
    explanation TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, run_id, question_num)
  );

  CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);

  -- Uploaded documents — store extracted text so questions/answers can be
  -- regenerated without re-uploading.  status: 'pending' | 'done' | 'error'
  -- doc_type: 'questions' | 'notes' | null (pending classification)
  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    size_bytes INTEGER NOT NULL DEFAULT 0,
    mime_type TEXT NOT NULL DEFAULT '',
    text_content TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    doc_type TEXT,
    run_id INTEGER REFERENCES study_runs(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);

  -- Flashcards generated from notes documents
  CREATE TABLE IF NOT EXISTS flashcards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_flashcards_user ON flashcards(user_id);
  CREATE INDEX IF NOT EXISTS idx_flashcards_doc ON flashcards(document_id);
`);

// ---------------- users ----------------
function createUser(email, passwordHash) {
  const stmt = db.prepare(
    'INSERT INTO users (email, password_hash, is_verified) VALUES (?, ?, 0)'
  );
  const info = stmt.run(email, passwordHash);
  return getUserById(Number(info.lastInsertRowid));
}

function getUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) || null;
}

function getUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) || null;
}

function setUserVerified(userId) {
  db.prepare('UPDATE users SET is_verified = 1 WHERE id = ?').run(userId);
}

function updateUserPassword(userId, passwordHash) {
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, userId);
}

// ---------------- sessions ----------------
function createSession(id, userId, expiresAtISO) {
  db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(
    id,
    userId,
    expiresAtISO
  );
}

function getSession(id) {
  return db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) || null;
}

function deleteSession(id) {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
}

function deleteSessionsForUser(userId) {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

// ---------------- verification tokens ----------------
function createVerificationToken(token, userId, expiresAtISO) {
  db.prepare(
    'INSERT INTO verification_tokens (token, user_id, expires_at) VALUES (?, ?, ?)'
  ).run(token, userId, expiresAtISO);
}

function getVerificationToken(token) {
  return db.prepare('SELECT * FROM verification_tokens WHERE token = ?').get(token) || null;
}

function consumeVerificationToken(token) {
  db.prepare("UPDATE verification_tokens SET used_at = datetime('now') WHERE token = ?").run(
    token
  );
}

function invalidateVerificationTokensForUser(userId) {
  db.prepare(
    "UPDATE verification_tokens SET used_at = datetime('now') WHERE user_id = ? AND used_at IS NULL"
  ).run(userId);
}

// ---------------- reset tokens ----------------
function createResetToken(token, userId, expiresAtISO) {
  db.prepare('INSERT INTO reset_tokens (token, user_id, expires_at) VALUES (?, ?, ?)').run(
    token,
    userId,
    expiresAtISO
  );
}

function getResetToken(token) {
  return db.prepare('SELECT * FROM reset_tokens WHERE token = ?').get(token) || null;
}

function consumeResetToken(token) {
  db.prepare("UPDATE reset_tokens SET used_at = datetime('now') WHERE token = ?").run(token);
}

function invalidateResetTokensForUser(userId) {
  db.prepare(
    "UPDATE reset_tokens SET used_at = datetime('now') WHERE user_id = ? AND used_at IS NULL"
  ).run(userId);
}

// ---------------- study runs ----------------
/**
 * Persist a completed Solve All run.
 * `items` is an array of: { num, correctLetter, explanation, isUnanswered, disagreement }
 * Counts are derived here so the client can't lie about them.
 */
function createStudyRun(userId, { documentName, items, note, sourceType }) {
  const total = items.length;
  const answered = items.filter(i => !i.isUnanswered && i.correctLetter).length;
  const unanswered = items.filter(i => i.isUnanswered || !i.correctLetter).length;
  const disagreements = items.filter(i => i.disagreement != null).length;
  const info = db.prepare(
    `INSERT INTO study_runs
       (user_id, document_name, total_questions, answered_count, unanswered_count, disagreement_count, results_json, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(userId, documentName, total, answered, unanswered, disagreements, JSON.stringify(items), note || '');
  return getStudyRunRow(Number(info.lastInsertRowid));
}

function getStudyRunRow(id) {
  return db.prepare('SELECT * FROM study_runs WHERE id = ?').get(id) || null;
}

/** List summary rows (no results_json) for a user, newest first. */
function listStudyRunsForUser(userId) {
  return db.prepare(
    `SELECT id, document_name, total_questions, answered_count, unanswered_count, disagreement_count, note, created_at
     FROM study_runs WHERE user_id = ? ORDER BY created_at DESC`
  ).all(userId);
}

/** Full detail for one run — includes parsed items array. Returns null if not owned by userId. */
function getStudyRun(id, userId) {
  const row = db.prepare('SELECT * FROM study_runs WHERE id = ? AND user_id = ?').get(id, userId);
  if (!row) return null;
  return { ...row, items: JSON.parse(row.results_json) };
}

function deleteStudyRun(id, userId) {
  db.prepare('DELETE FROM study_runs WHERE id = ? AND user_id = ?').run(id, userId);
}

/** Update a run's annotation note. Silently no-ops if the run doesn't belong to userId. */
function updateStudyRunNote(id, userId, note) {
  db.prepare('UPDATE study_runs SET note = ? WHERE id = ? AND user_id = ?').run(
    String(note || '').slice(0, 500),
    id,
    userId
  );
}

// ---------------- bookmarks ----------------
function upsertBookmark(userId, { runId, questionNum, stem, correctLetter, explanation }) {
  db.prepare(
    `INSERT INTO bookmarks (user_id, run_id, question_num, stem, correct_letter, explanation)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, run_id, question_num) DO UPDATE SET
       stem = excluded.stem,
       correct_letter = excluded.correct_letter,
       explanation = excluded.explanation,
       created_at = datetime('now')`
  ).run(userId, runId || null, questionNum, stem || '', correctLetter || null, explanation || '');
}

function deleteBookmark(id, userId) {
  db.prepare('DELETE FROM bookmarks WHERE id = ? AND user_id = ?').run(id, userId);
}

function listBookmarksForUser(userId) {
  return db.prepare(
    `SELECT id, run_id, question_num, stem, correct_letter, explanation, created_at
     FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC`
  ).all(userId);
}

// ---------------- documents ----------------
function createDocument(userId, { name, sizeBytes, mimeType, textContent }) {
  const info = db.prepare(
    `INSERT INTO documents (user_id, name, size_bytes, mime_type, text_content, status)
     VALUES (?, ?, ?, ?, ?, 'pending')`
  ).run(userId, name.slice(0, 200), sizeBytes || 0, mimeType || '', textContent || '');
  return getDocumentById(Number(info.lastInsertRowid));
}

function getDocumentById(id) {
  return db.prepare('SELECT * FROM documents WHERE id = ?').get(id) || null;
}

function listDocumentsForUser(userId) {
  return db.prepare(
    `SELECT id, name, size_bytes, mime_type, status, doc_type, run_id, created_at
     FROM documents WHERE user_id = ? ORDER BY created_at DESC`
  ).all(userId);
}

function updateDocumentStatus(id, userId, status, runId) {
  db.prepare(
    'UPDATE documents SET status = ?, run_id = ? WHERE id = ? AND user_id = ?'
  ).run(status, runId || null, id, userId);
}

function setDocumentType(id, userId, docType) {
  db.prepare('UPDATE documents SET doc_type = ? WHERE id = ? AND user_id = ?').run(docType, id, userId);
}

function deleteDocument(id, userId) {
  db.prepare('DELETE FROM documents WHERE id = ? AND user_id = ?').run(id, userId);
}

// ---------------- flashcards ----------------
function saveFlashcards(userId, documentId, cards) {
  const insert = db.prepare(
    'INSERT INTO flashcards (user_id, document_id, front, back) VALUES (?, ?, ?, ?)'
  );
  db.prepare('DELETE FROM flashcards WHERE user_id = ? AND document_id = ?').run(userId, documentId);
  for (const card of cards) {
    insert.run(userId, documentId, String(card.front || '').slice(0, 500), String(card.back || '').slice(0, 1000));
  }
}

function listFlashcardsForDocument(documentId, userId) {
  return db.prepare(
    'SELECT id, front, back, created_at FROM flashcards WHERE document_id = ? AND user_id = ? ORDER BY id'
  ).all(documentId, userId);
}

function listAllFlashcardsForUser(userId) {
  return db.prepare(
    `SELECT f.id, f.front, f.back, f.created_at, f.document_id, d.name AS document_name
     FROM flashcards f JOIN documents d ON d.id = f.document_id
     WHERE f.user_id = ? ORDER BY f.created_at DESC`
  ).all(userId);
}

function getDashboardStats(userId) {
  const runs = db.prepare('SELECT answered_count, total_questions FROM study_runs WHERE user_id = ?').all(userId);
  const docs = db.prepare('SELECT COUNT(*) AS cnt FROM documents WHERE user_id = ? AND status = "done"').get(userId);
  const flashcards = db.prepare('SELECT COUNT(*) AS cnt FROM flashcards WHERE user_id = ?').get(userId);
  const totalQ = runs.reduce((s, r) => s + r.total_questions, 0);
  const totalA = runs.reduce((s, r) => s + r.answered_count, 0);
  return {
    totalRuns: runs.length,
    totalDocuments: (docs && docs.cnt) || 0,
    totalFlashcards: (flashcards && flashcards.cnt) || 0,
    totalQuestions: totalQ,
    totalAnswered: totalA,
    avgScore: totalQ > 0 ? Math.round((totalA / totalQ) * 100) : 0,
  };
}

module.exports = {
  db,
  createUser,
  getUserByEmail,
  getUserById,
  setUserVerified,
  updateUserPassword,
  createSession,
  getSession,
  deleteSession,
  deleteSessionsForUser,
  createVerificationToken,
  getVerificationToken,
  consumeVerificationToken,
  invalidateVerificationTokensForUser,
  createResetToken,
  getResetToken,
  consumeResetToken,
  invalidateResetTokensForUser,
  createStudyRun,
  listStudyRunsForUser,
  getStudyRun,
  deleteStudyRun,
  updateStudyRunNote,
  upsertBookmark,
  deleteBookmark,
  listBookmarksForUser,
  createDocument,
  getDocumentById,
  listDocumentsForUser,
  updateDocumentStatus,
  setDocumentType,
  deleteDocument,
  saveFlashcards,
  listFlashcardsForDocument,
  listAllFlashcardsForUser,
  getDashboardStats,
};
