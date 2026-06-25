'use strict';
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
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
    tags TEXT NOT NULL DEFAULT '',
    share_token TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS flashcards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    srs_due TEXT NOT NULL DEFAULT (date('now')),
    srs_interval INTEGER NOT NULL DEFAULT 1,
    srs_ease REAL NOT NULL DEFAULT 2.5,
    srs_reps INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_date TEXT NOT NULL,
    UNIQUE(user_id, activity_date)
  );

  CREATE TABLE IF NOT EXISTS xp_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL DEFAULT 0,
    reason TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS study_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    goal_type TEXT NOT NULL DEFAULT 'sessions',
    target_value INTEGER NOT NULL DEFAULT 1,
    target_date TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content_text TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Untitled',
    body TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT 'violet',
    pinned INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS focus_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    duration_mins INTEGER NOT NULL DEFAULT 25,
    subject TEXT NOT NULL DEFAULT '',
    completed INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_study_runs_user ON study_runs(user_id);
  CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
  CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
  CREATE INDEX IF NOT EXISTS idx_flashcards_user ON flashcards(user_id);
  CREATE INDEX IF NOT EXISTS idx_flashcards_doc ON flashcards(document_id);
  CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id);
  CREATE INDEX IF NOT EXISTS idx_xp_user ON xp_events(user_id);
  CREATE INDEX IF NOT EXISTS idx_goals_user ON study_goals(user_id);
  CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_messages(user_id);
  CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id);
  CREATE INDEX IF NOT EXISTS idx_focus_user ON focus_sessions(user_id);
`);

// ── Users ───────────────────────────────────────────────────────────────────
function createUser(email, passwordHash) {
  const info = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run(email, passwordHash);
  return getUserById(Number(info.lastInsertRowid));
}
function getUserByEmail(email) { return db.prepare('SELECT * FROM users WHERE email = ?').get(email) || null; }
function getUserById(id) { return db.prepare('SELECT * FROM users WHERE id = ?').get(id) || null; }
function setUserVerified(userId) { db.prepare('UPDATE users SET is_verified = 1 WHERE id = ?').run(userId); }
function updateUserPassword(userId, hash) { db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, userId); }

// ── Sessions ────────────────────────────────────────────────────────────────
function createSession(id, userId, expiresAtISO) {
  db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(id, userId, expiresAtISO);
}
function getSession(id) { return db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) || null; }
function deleteSession(id) { db.prepare('DELETE FROM sessions WHERE id = ?').run(id); }
function deleteSessionsForUser(userId) { db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId); }

// ── Verification tokens ─────────────────────────────────────────────────────
function createVerificationToken(token, userId, expiresAtISO) {
  db.prepare('INSERT INTO verification_tokens (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expiresAtISO);
}
function getVerificationToken(token) { return db.prepare('SELECT * FROM verification_tokens WHERE token = ?').get(token) || null; }
function consumeVerificationToken(token) {
  db.prepare("UPDATE verification_tokens SET used_at = datetime('now') WHERE token = ?").run(token);
}
function invalidateVerificationTokensForUser(userId) {
  db.prepare("UPDATE verification_tokens SET used_at = datetime('now') WHERE user_id = ? AND used_at IS NULL").run(userId);
}

// ── Reset tokens ────────────────────────────────────────────────────────────
function createResetToken(token, userId, expiresAtISO) {
  db.prepare('INSERT INTO reset_tokens (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expiresAtISO);
}
function getResetToken(token) { return db.prepare('SELECT * FROM reset_tokens WHERE token = ?').get(token) || null; }
function consumeResetToken(token) {
  db.prepare("UPDATE reset_tokens SET used_at = datetime('now') WHERE token = ?").run(token);
}
function invalidateResetTokensForUser(userId) {
  db.prepare("UPDATE reset_tokens SET used_at = datetime('now') WHERE user_id = ? AND used_at IS NULL").run(userId);
}

// ── Activity / Streaks ──────────────────────────────────────────────────────
function logActivity(userId) {
  const today = new Date().toISOString().slice(0, 10);
  try { db.prepare('INSERT OR IGNORE INTO activity_log (user_id, activity_date) VALUES (?, ?)').run(userId, today); } catch {}
}

function getStreakForUser(userId) {
  const rows = db.prepare('SELECT activity_date FROM activity_log WHERE user_id = ? ORDER BY activity_date DESC').all(userId);
  if (!rows.length) return 0;
  let streak = 0;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let i = 0; i < rows.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    if (rows[i].activity_date === expected.toISOString().slice(0, 10)) streak++;
    else break;
  }
  return streak;
}

function getActivityHeatmap(userId) {
  const runs = db.prepare(`
    SELECT date(created_at) AS day, COUNT(*) AS sessions
    FROM study_runs WHERE user_id = ? AND created_at >= date('now', '-371 days')
    GROUP BY day
  `).all(userId);
  const acts = db.prepare(`
    SELECT activity_date AS day FROM activity_log
    WHERE user_id = ? AND activity_date >= date('now', '-371 days')
  `).all(userId);
  const map = {};
  for (const r of runs) map[r.day] = (map[r.day] || 0) + r.sessions;
  for (const r of acts) if (!map[r.day]) map[r.day] = 1;
  return map;
}

// ── XP ──────────────────────────────────────────────────────────────────────
function awardXP(userId, amount, reason) {
  try { db.prepare('INSERT INTO xp_events (user_id, amount, reason) VALUES (?, ?, ?)').run(userId, amount || 0, reason || ''); } catch {}
}
function getTotalXP(userId) {
  return (db.prepare('SELECT COALESCE(SUM(amount),0) AS t FROM xp_events WHERE user_id = ?').get(userId)?.t) || 0;
}
function getXPLevel(xp) {
  const levels = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500, 7500];
  let level = 1;
  for (let i = 1; i < levels.length; i++) { if (xp >= levels[i]) level = i + 1; else break; }
  const floor = levels[Math.min(level - 1, levels.length - 1)];
  const ceil  = levels[Math.min(level, levels.length - 1)];
  const progress = ceil > floor ? Math.round(((xp - floor) / (ceil - floor)) * 100) : 100;
  return { level, xp, progress, nextAt: ceil };
}

// ── Study Runs ──────────────────────────────────────────────────────────────
function createStudyRun(userId, { documentName, items, note }) {
  const total = items.length;
  const answered = items.filter(i => !i.isUnanswered && i.correctLetter).length;
  const unanswered = items.filter(i => i.isUnanswered || !i.correctLetter).length;
  const disagreements = items.filter(i => i.disagreement != null).length;
  const info = db.prepare(
    `INSERT INTO study_runs (user_id, document_name, total_questions, answered_count, unanswered_count, disagreement_count, results_json, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(userId, documentName, total, answered, unanswered, disagreements, JSON.stringify(items), note || '');
  logActivity(userId);
  return db.prepare('SELECT * FROM study_runs WHERE id = ?').get(Number(info.lastInsertRowid));
}
function listStudyRuns(userId) {
  return db.prepare(
    'SELECT id, document_name, total_questions, answered_count, unanswered_count, disagreement_count, note, created_at FROM study_runs WHERE user_id = ? ORDER BY created_at DESC'
  ).all(userId);
}
function getStudyRun(id, userId) {
  const row = db.prepare('SELECT * FROM study_runs WHERE id = ? AND user_id = ?').get(id, userId);
  if (!row) return null;
  return { ...row, items: JSON.parse(row.results_json) };
}
function deleteStudyRun(id, userId) { db.prepare('DELETE FROM study_runs WHERE id = ? AND user_id = ?').run(id, userId); }
function updateStudyRunNote(id, userId, note) {
  db.prepare('UPDATE study_runs SET note = ? WHERE id = ? AND user_id = ?').run(String(note || '').slice(0, 500), id, userId);
}

// ── Bookmarks ────────────────────────────────────────────────────────────────
function upsertBookmark(userId, { runId, questionNum, stem, correctLetter, explanation }) {
  db.prepare(
    `INSERT INTO bookmarks (user_id, run_id, question_num, stem, correct_letter, explanation)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, run_id, question_num) DO UPDATE SET
       stem = excluded.stem, correct_letter = excluded.correct_letter,
       explanation = excluded.explanation, created_at = datetime('now')`
  ).run(userId, runId || null, questionNum, stem || '', correctLetter || null, explanation || '');
}
function deleteBookmark(id, userId) { db.prepare('DELETE FROM bookmarks WHERE id = ? AND user_id = ?').run(id, userId); }
function listBookmarks(userId) {
  return db.prepare(
    'SELECT id, run_id, question_num, stem, correct_letter, explanation, created_at FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC'
  ).all(userId);
}

// ── Documents ────────────────────────────────────────────────────────────────
function createDocument(userId, { name, sizeBytes, mimeType, textContent }) {
  const info = db.prepare(
    `INSERT INTO documents (user_id, name, size_bytes, mime_type, text_content, status) VALUES (?, ?, ?, ?, ?, 'pending')`
  ).run(userId, name.slice(0, 200), sizeBytes || 0, mimeType || '', textContent || '');
  awardXP(userId, 20, 'document_uploaded');
  return db.prepare('SELECT * FROM documents WHERE id = ?').get(Number(info.lastInsertRowid));
}
function getDocumentById(id) { return db.prepare('SELECT * FROM documents WHERE id = ?').get(id) || null; }
function listDocuments(userId) {
  return db.prepare(
    'SELECT id, name, size_bytes, mime_type, status, doc_type, run_id, tags, share_token, created_at FROM documents WHERE user_id = ? ORDER BY created_at DESC'
  ).all(userId);
}
function updateDocumentStatus(id, userId, status, runId) {
  db.prepare('UPDATE documents SET status = ?, run_id = ? WHERE id = ? AND user_id = ?').run(status, runId || null, id, userId);
}
function setDocumentType(id, userId, docType) {
  db.prepare('UPDATE documents SET doc_type = ? WHERE id = ? AND user_id = ?').run(docType, id, userId);
}
function setDocumentTags(id, userId, tags) {
  db.prepare('UPDATE documents SET tags = ? WHERE id = ? AND user_id = ?').run(String(tags || '').slice(0, 200), id, userId);
}
function setDocumentShareToken(id, userId) {
  const existing = db.prepare('SELECT share_token FROM documents WHERE id = ? AND user_id = ?').get(id, userId);
  if (existing?.share_token) return existing.share_token;
  const token = crypto.randomBytes(16).toString('hex');
  db.prepare('UPDATE documents SET share_token = ? WHERE id = ? AND user_id = ?').run(token, id, userId);
  return token;
}
function revokeDocumentShare(id, userId) {
  db.prepare('UPDATE documents SET share_token = NULL WHERE id = ? AND user_id = ?').run(id, userId);
}
function getDocumentByShareToken(token) {
  return db.prepare(
    `SELECT id, name, doc_type, tags, text_content, created_at FROM documents WHERE share_token = ? AND status = 'done'`
  ).get(token) || null;
}
function deleteDocument(id, userId) { db.prepare('DELETE FROM documents WHERE id = ? AND user_id = ?').run(id, userId); }

// ── Flashcards ───────────────────────────────────────────────────────────────
function saveFlashcards(userId, documentId, cards) {
  db.prepare('DELETE FROM flashcards WHERE user_id = ? AND document_id = ?').run(userId, documentId);
  const ins = db.prepare('INSERT INTO flashcards (user_id, document_id, front, back) VALUES (?, ?, ?, ?)');
  for (const c of cards) ins.run(userId, documentId, String(c.front || '').slice(0, 500), String(c.back || '').slice(0, 1000));
}
function listFlashcardsForDoc(docId, userId) {
  return db.prepare(
    'SELECT id, front, back, srs_due, srs_interval, srs_ease, srs_reps, created_at FROM flashcards WHERE document_id = ? AND user_id = ? ORDER BY id'
  ).all(docId, userId);
}
function listAllFlashcards(userId) {
  return db.prepare(
    `SELECT f.id, f.front, f.back, f.srs_due, f.srs_interval, f.srs_ease, f.srs_reps, f.created_at, f.document_id, d.name AS document_name
     FROM flashcards f JOIN documents d ON d.id = f.document_id
     WHERE f.user_id = ? ORDER BY f.srs_due ASC, f.id ASC`
  ).all(userId);
}
function reviewFlashcard(cardId, userId, rating) {
  const card = db.prepare('SELECT * FROM flashcards WHERE id = ? AND user_id = ?').get(cardId, userId);
  if (!card) return null;
  let { srs_interval: interval, srs_ease: ease, srs_reps: reps } = card;
  const quality = [1, 2, 4, 5][Math.max(0, Math.min(3, rating))];
  if (quality < 3) { reps = 0; interval = 1; }
  else { if (reps === 0) interval = 1; else if (reps === 1) interval = 6; else interval = Math.round(interval * ease); reps++; }
  ease = Math.max(1.3, ease + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  const due = new Date(); due.setDate(due.getDate() + interval);
  const dueStr = due.toISOString().slice(0, 10);
  db.prepare('UPDATE flashcards SET srs_due = ?, srs_interval = ?, srs_ease = ?, srs_reps = ? WHERE id = ? AND user_id = ?')
    .run(dueStr, interval, ease, reps, cardId, userId);
  logActivity(userId);
  awardXP(userId, 2, 'flashcard_review');
  return { cardId, dueDate: dueStr, interval, ease, reps };
}
function countDueFlashcards(userId) {
  const today = new Date().toISOString().slice(0, 10);
  return db.prepare('SELECT COUNT(*) AS cnt FROM flashcards WHERE user_id = ? AND srs_due <= ?').get(userId, today)?.cnt || 0;
}

// ── Study Goals ───────────────────────────────────────────────────────────────
function createGoal(userId, { title, goalType, targetValue, targetDate }) {
  const info = db.prepare(
    'INSERT INTO study_goals (user_id, title, goal_type, target_value, target_date) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, String(title).slice(0, 200), goalType || 'sessions', Number(targetValue) || 1, targetDate);
  return db.prepare('SELECT * FROM study_goals WHERE id = ?').get(Number(info.lastInsertRowid));
}
function listGoals(userId) {
  return db.prepare('SELECT * FROM study_goals WHERE user_id = ? ORDER BY target_date ASC, created_at DESC').all(userId);
}
function updateGoal(id, userId, { completed, title, targetValue }) {
  const goal = db.prepare('SELECT * FROM study_goals WHERE id = ? AND user_id = ?').get(id, userId);
  if (!goal) return null;
  const nc = completed !== undefined ? (completed ? 1 : 0) : goal.completed;
  const nt = title !== undefined ? String(title).slice(0, 200) : goal.title;
  const nv = targetValue !== undefined ? Number(targetValue) : goal.target_value;
  db.prepare('UPDATE study_goals SET completed = ?, title = ?, target_value = ? WHERE id = ? AND user_id = ?').run(nc, nt, nv, id, userId);
  if (completed && !goal.completed) awardXP(userId, 50, 'goal_completed');
  return db.prepare('SELECT * FROM study_goals WHERE id = ?').get(id);
}
function deleteGoal(id, userId) { db.prepare('DELETE FROM study_goals WHERE id = ? AND user_id = ?').run(id, userId); }

// ── Chat History ──────────────────────────────────────────────────────────────
const CHAT_MAX = 200;
function saveChatMessages(userId, messages) {
  const ins = db.prepare('INSERT INTO chat_messages (user_id, role, content_text) VALUES (?, ?, ?)');
  for (const m of messages) {
    const text = typeof m.content === 'string' ? m.content
      : Array.isArray(m.content) ? m.content.filter(p => p.type === 'text').map(p => p.text).join('\n') || '[image]'
      : String(m.content || '');
    ins.run(userId, m.role === 'assistant' ? 'assistant' : 'user', text.slice(0, 8000));
  }
  const count = db.prepare('SELECT COUNT(*) AS cnt FROM chat_messages WHERE user_id = ?').get(userId)?.cnt || 0;
  if (count > CHAT_MAX) {
    const oldest = db.prepare('SELECT id FROM chat_messages WHERE user_id = ? ORDER BY id ASC LIMIT ?').all(userId, count - CHAT_MAX);
    if (oldest.length) {
      const ids = oldest.map(r => r.id).join(',');
      db.exec(`DELETE FROM chat_messages WHERE id IN (${ids})`);
    }
  }
}
function listChatMessages(userId, limit = 100) {
  return db.prepare('SELECT role, content_text AS content FROM chat_messages WHERE user_id = ? ORDER BY id DESC LIMIT ?').all(userId, limit).reverse();
}
function clearChatMessages(userId) { db.prepare('DELETE FROM chat_messages WHERE user_id = ?').run(userId); }

// ── Notes ──────────────────────────────────────────────────────────────────────
function createNote(userId, { title, body, color }) {
  return db.prepare(
    `INSERT INTO notes (user_id, title, body, color) VALUES (?, ?, ?, ?)`
  ).run(userId, String(title || 'Untitled').slice(0, 200), String(body || ''), String(color || 'violet'));
}
function getNoteById(id, userId) { return db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(id, userId) || null; }
function listNotes(userId) {
  return db.prepare('SELECT * FROM notes WHERE user_id = ? ORDER BY pinned DESC, updated_at DESC').all(userId);
}
function updateNote(id, userId, { title, body, color, pinned }) {
  const note = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(id, userId);
  if (!note) return null;
  const nt = title !== undefined ? String(title).slice(0, 200) : note.title;
  const nb = body !== undefined ? String(body) : note.body;
  const nc = color !== undefined ? String(color) : note.color;
  const np = pinned !== undefined ? (pinned ? 1 : 0) : note.pinned;
  db.prepare(`UPDATE notes SET title=?, body=?, color=?, pinned=?, updated_at=datetime('now') WHERE id=? AND user_id=?`).run(nt, nb, nc, np, id, userId);
  return db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
}
function deleteNote(id, userId) { db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').run(id, userId); }

// ── Focus Sessions ──────────────────────────────────────────────────────────────
function logFocusSession(userId, { durationMins, subject, completed }) {
  db.prepare('INSERT INTO focus_sessions (user_id, duration_mins, subject, completed) VALUES (?, ?, ?, ?)').run(
    userId, Number(durationMins) || 25, String(subject || '').slice(0, 100), completed !== false ? 1 : 0
  );
  if (completed !== false) {
    logActivity(userId);
    awardXP(userId, Math.max(5, Math.floor((Number(durationMins) || 25) / 5) * 5), 'focus_session');
  }
}
function getFocusStats(userId) {
  const total = db.prepare('SELECT COALESCE(SUM(duration_mins),0) AS t FROM focus_sessions WHERE user_id = ? AND completed = 1').get(userId)?.t || 0;
  const sessions = db.prepare('SELECT COUNT(*) AS cnt FROM focus_sessions WHERE user_id = ? AND completed = 1').get(userId)?.cnt || 0;
  const today = new Date().toISOString().slice(0, 10);
  const todayMins = db.prepare(`SELECT COALESCE(SUM(duration_mins),0) AS t FROM focus_sessions WHERE user_id = ? AND completed = 1 AND date(created_at) = ?`).get(userId, today)?.t || 0;
  return { totalMins: total, sessions, todayMins };
}

// ── Dashboard ───────────────────────────────────────────────────────────────────
function getDashboardStats(userId) {
  const runs = listStudyRuns(userId);
  const totalRuns = runs.length;
  const totalQ = runs.reduce((s, r) => s + r.total_questions, 0);
  const totalCorrect = runs.reduce((s, r) => s + r.answered_count, 0);
  const accuracy = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0;
  const streak = getStreakForUser(userId);
  const dueCards = countDueFlashcards(userId);
  const xp = getTotalXP(userId);
  const level = getXPLevel(xp);
  return { totalRuns, totalQ, totalCorrect, accuracy, streak, dueCards, ...level };
}

// ── Analytics ───────────────────────────────────────────────────────────────────
function getAnalytics(userId) {
  const runs = db.prepare(
    'SELECT total_questions, answered_count, created_at FROM study_runs WHERE user_id = ? ORDER BY created_at ASC LIMIT 50'
  ).all(userId);
  const scores = runs.map(r => ({
    date: r.created_at.slice(0, 10),
    score: r.total_questions > 0 ? Math.round((r.answered_count / r.total_questions) * 100) : 0,
    total: r.total_questions,
    correct: r.answered_count,
  }));
  const weakSpots = getWeakSpots(userId);
  const achievements = getAchievements(userId);
  return { scores, weakSpots, achievements };
}

// ── Search ─────────────────────────────────────────────────────────────────────
function search(userId, query) {
  const q = '%' + String(query || '').replace(/%/g, '\\%').replace(/_/g, '\\_') + '%';
  const docs = db.prepare(
    `SELECT id, name, doc_type, status, created_at, 'document' AS result_type FROM documents WHERE user_id = ? AND (name LIKE ? OR text_content LIKE ?) AND status = 'done' LIMIT 20`
  ).all(userId, q, q);
  const cards = db.prepare(
    `SELECT f.id, f.front, f.back, d.name AS document_name, 'flashcard' AS result_type FROM flashcards f JOIN documents d ON d.id = f.document_id WHERE f.user_id = ? AND (f.front LIKE ? OR f.back LIKE ?) LIMIT 20`
  ).all(userId, q, q);
  const bms = db.prepare(
    `SELECT id, stem, correct_letter, explanation, created_at, 'bookmark' AS result_type FROM bookmarks WHERE user_id = ? AND stem LIKE ? LIMIT 20`
  ).all(userId, q);
  return { documents: docs, flashcards: cards, bookmarks: bms };
}

// ── Weak Spots ─────────────────────────────────────────────────────────────────
function getWeakSpots(userId) {
  const runs = db.prepare('SELECT results_json FROM study_runs WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').all(userId);
  const topicErrors = {};
  for (const run of runs) {
    try {
      const items = JSON.parse(run.results_json);
      for (const item of items) {
        if (!item.correctLetter && !item.isUnanswered) continue;
        const topic = item.topic || item.category || 'General';
        if (!topicErrors[topic]) topicErrors[topic] = { errors: 0, total: 0 };
        topicErrors[topic].total++;
        if (!item.correctLetter) topicErrors[topic].errors++;
      }
    } catch {}
  }
  return Object.entries(topicErrors)
    .filter(([, v]) => v.errors > 0)
    .map(([topic, v]) => ({ topic, errors: v.errors, total: v.total, rate: Math.round((v.errors / v.total) * 100) }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 5);
}

// ── Achievements ───────────────────────────────────────────────────────────────
function getAchievements(userId) {
  const runs = listStudyRuns(userId).length;
  const xp = getTotalXP(userId);
  const streak = getStreakForUser(userId);
  const docCount = db.prepare(`SELECT COUNT(*) AS cnt FROM documents WHERE user_id = ? AND status = 'done'`).get(userId)?.cnt || 0;
  const cardCount = db.prepare('SELECT COUNT(*) AS cnt FROM flashcards WHERE user_id = ?').get(userId)?.cnt || 0;
  const all = [
    { id: 'first_run',    name: 'First Steps',       desc: 'Complete your first study session', icon: '🎯', earned: runs >= 1 },
    { id: 'ten_runs',     name: 'Study Habit',        desc: 'Complete 10 study sessions',        icon: '📚', earned: runs >= 10 },
    { id: 'fifty_runs',   name: 'Dedicated Scholar',  desc: 'Complete 50 study sessions',        icon: '🏆', earned: runs >= 50 },
    { id: 'streak_3',     name: 'On a Roll',          desc: '3-day study streak',                icon: '🔥', earned: streak >= 3 },
    { id: 'streak_7',     name: 'Week Warrior',       desc: '7-day study streak',                icon: '⚡', earned: streak >= 7 },
    { id: 'streak_30',    name: 'Iron Will',          desc: '30-day study streak',               icon: '💪', earned: streak >= 30 },
    { id: 'xp_500',       name: 'XP Grinder',         desc: 'Earn 500 XP',                       icon: '⭐', earned: xp >= 500 },
    { id: 'xp_2000',      name: 'Power Learner',      desc: 'Earn 2000 XP',                      icon: '🌟', earned: xp >= 2000 },
    { id: 'first_doc',    name: 'Knowledge Base',     desc: 'Upload your first document',        icon: '📄', earned: docCount >= 1 },
    { id: 'five_docs',    name: 'Library Builder',    desc: 'Upload 5 documents',                icon: '🗄️', earned: docCount >= 5 },
    { id: 'flashcards',   name: 'Card Collector',     desc: 'Create 20 flashcards',              icon: '🃏', earned: cardCount >= 20 },
  ];
  return all;
}

module.exports = {
  db,
  createUser, getUserByEmail, getUserById, setUserVerified, updateUserPassword,
  createSession, getSession, deleteSession, deleteSessionsForUser,
  createVerificationToken, getVerificationToken, consumeVerificationToken, invalidateVerificationTokensForUser,
  createResetToken, getResetToken, consumeResetToken, invalidateResetTokensForUser,
  logActivity, getStreakForUser, getActivityHeatmap,
  awardXP, getTotalXP, getXPLevel,
  createStudyRun, listStudyRuns, getStudyRun, deleteStudyRun, updateStudyRunNote,
  upsertBookmark, deleteBookmark, listBookmarks,
  createDocument, getDocumentById, listDocuments, updateDocumentStatus, setDocumentType,
  setDocumentTags, setDocumentShareToken, revokeDocumentShare, getDocumentByShareToken, deleteDocument,
  saveFlashcards, listFlashcardsForDoc, listAllFlashcards, reviewFlashcard, countDueFlashcards,
  createGoal, listGoals, updateGoal, deleteGoal,
  saveChatMessages, listChatMessages, clearChatMessages,
  createNote, getNoteById, listNotes, updateNote, deleteNote,
  logFocusSession, getFocusStats,
  getDashboardStats, getAnalytics, search, getWeakSpots, getAchievements,
};
