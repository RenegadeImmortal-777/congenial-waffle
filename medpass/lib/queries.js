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

// ── Additive migrations (safe to run on existing DBs) ──────────────────
const migrations = [
  // SRS columns on flashcards
  `ALTER TABLE flashcards ADD COLUMN srs_due TEXT NOT NULL DEFAULT (date('now'))`,
  `ALTER TABLE flashcards ADD COLUMN srs_interval INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE flashcards ADD COLUMN srs_ease REAL NOT NULL DEFAULT 2.5`,
  `ALTER TABLE flashcards ADD COLUMN srs_reps INTEGER NOT NULL DEFAULT 0`,
  // Tags + sharing on documents
  `ALTER TABLE documents ADD COLUMN tags TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE documents ADD COLUMN share_token TEXT`,
  // Streak: daily activity log
  `CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_date TEXT NOT NULL,
    UNIQUE(user_id, activity_date)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id)`,
  // XP events
  `CREATE TABLE IF NOT EXISTS xp_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL DEFAULT 0,
    reason TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_xp_user ON xp_events(user_id)`,
  // Study goals / planner
  `CREATE TABLE IF NOT EXISTS study_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    goal_type TEXT NOT NULL DEFAULT 'sessions',
    target_value INTEGER NOT NULL DEFAULT 1,
    target_date TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_goals_user ON study_goals(user_id)`,
  // Persistent chat memory
  `CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content_text TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_messages(user_id)`,
  `CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Untitled',
    body TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT 'violet',
    pinned INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id)`,
  `CREATE TABLE IF NOT EXISTS focus_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    duration_mins INTEGER NOT NULL DEFAULT 25,
    subject TEXT NOT NULL DEFAULT '',
    completed INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_focus_user ON focus_sessions(user_id)`,
];

for (const sql of migrations) {
  try { db.exec(sql); } catch (e) {
    if (!e.message.includes('duplicate column') && !e.message.includes('already exists')) {
      console.error('Migration error:', e.message);
    }
  }
}

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
    id, userId, expiresAtISO
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
  db.prepare("UPDATE verification_tokens SET used_at = datetime('now') WHERE token = ?").run(token);
}

function invalidateVerificationTokensForUser(userId) {
  db.prepare(
    "UPDATE verification_tokens SET used_at = datetime('now') WHERE user_id = ? AND used_at IS NULL"
  ).run(userId);
}

// ---------------- reset tokens ----------------
function createResetToken(token, userId, expiresAtISO) {
  db.prepare('INSERT INTO reset_tokens (token, user_id, expires_at) VALUES (?, ?, ?)').run(
    token, userId, expiresAtISO
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
  logActivity(userId);
  return getStudyRunRow(Number(info.lastInsertRowid));
}

function getStudyRunRow(id) {
  return db.prepare('SELECT * FROM study_runs WHERE id = ?').get(id) || null;
}

function listStudyRunsForUser(userId) {
  return db.prepare(
    `SELECT id, document_name, total_questions, answered_count, unanswered_count, disagreement_count, note, created_at
     FROM study_runs WHERE user_id = ? ORDER BY created_at DESC`
  ).all(userId);
}

function getStudyRun(id, userId) {
  const row = db.prepare('SELECT * FROM study_runs WHERE id = ? AND user_id = ?').get(id, userId);
  if (!row) return null;
  return { ...row, items: JSON.parse(row.results_json) };
}

function deleteStudyRun(id, userId) {
  db.prepare('DELETE FROM study_runs WHERE id = ? AND user_id = ?').run(id, userId);
}

function updateStudyRunNote(id, userId, note) {
  db.prepare('UPDATE study_runs SET note = ? WHERE id = ? AND user_id = ?').run(
    String(note || '').slice(0, 500), id, userId
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
    `SELECT id, name, size_bytes, mime_type, status, doc_type, run_id, tags, share_token, created_at
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

function setDocumentTags(id, userId, tags) {
  const cleaned = String(tags || '').slice(0, 200);
  db.prepare('UPDATE documents SET tags = ? WHERE id = ? AND user_id = ?').run(cleaned, id, userId);
}

function setDocumentShareToken(id, userId) {
  const existing = db.prepare('SELECT share_token FROM documents WHERE id = ? AND user_id = ?').get(id, userId);
  if (existing && existing.share_token) return existing.share_token;
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

function deleteDocument(id, userId) {
  db.prepare('DELETE FROM documents WHERE id = ? AND user_id = ?').run(id, userId);
}

// ---------------- global search ----------------
function searchForUser(userId, query) {
  const q = '%' + String(query || '').replace(/%/g, '\\%').replace(/_/g, '\\_') + '%';
  const docs = db.prepare(
    `SELECT id, name, doc_type, status, created_at, 'document' AS result_type
     FROM documents WHERE user_id = ? AND (name LIKE ? OR text_content LIKE ?) AND status = 'done'
     LIMIT 20`
  ).all(userId, q, q);
  const cards = db.prepare(
    `SELECT f.id, f.front, f.back, d.name AS document_name, 'flashcard' AS result_type
     FROM flashcards f JOIN documents d ON d.id = f.document_id
     WHERE f.user_id = ? AND (f.front LIKE ? OR f.back LIKE ?)
     LIMIT 20`
  ).all(userId, q, q);
  const bookmarks = db.prepare(
    `SELECT id, stem, correct_letter, explanation, created_at, 'bookmark' AS result_type
     FROM bookmarks WHERE user_id = ? AND stem LIKE ?
     LIMIT 20`
  ).all(userId, q);
  return { documents: docs, flashcards: cards, bookmarks };
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
    `SELECT id, front, back, srs_due, srs_interval, srs_ease, srs_reps, created_at
     FROM flashcards WHERE document_id = ? AND user_id = ? ORDER BY id`
  ).all(documentId, userId);
}

function listAllFlashcardsForUser(userId) {
  return db.prepare(
    `SELECT f.id, f.front, f.back, f.srs_due, f.srs_interval, f.srs_ease, f.srs_reps,
            f.created_at, f.document_id, d.name AS document_name
     FROM flashcards f JOIN documents d ON d.id = f.document_id
     WHERE f.user_id = ? ORDER BY f.srs_due ASC, f.id ASC`
  ).all(userId);
}

/**
 * SM-2 spaced repetition review.
 * rating: 0=Again, 1=Hard, 2=Good, 3=Easy
 */
function reviewFlashcard(cardId, userId, rating) {
  const card = db.prepare('SELECT * FROM flashcards WHERE id = ? AND user_id = ?').get(cardId, userId);
  if (!card) return null;

  let { srs_interval: interval, srs_ease: ease, srs_reps: reps } = card;
  const quality = [1, 2, 4, 5][Math.max(0, Math.min(3, rating))];

  if (quality < 3) {
    reps = 0;
    interval = 1;
  } else {
    if (reps === 0) interval = 1;
    else if (reps === 1) interval = 6;
    else interval = Math.round(interval * ease);
    reps++;
  }

  ease = Math.max(1.3, ease + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + interval);
  const dueDateStr = dueDate.toISOString().slice(0, 10);

  db.prepare(
    'UPDATE flashcards SET srs_due = ?, srs_interval = ?, srs_ease = ?, srs_reps = ? WHERE id = ? AND user_id = ?'
  ).run(dueDateStr, interval, ease, reps, cardId, userId);

  logActivity(userId);
  // Award XP for flashcard review
  awardXP(userId, 2, 'flashcard_review');
  return { cardId, dueDate: dueDateStr, interval, ease, reps };
}

function countDueFlashcards(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const row = db.prepare(
    `SELECT COUNT(*) AS cnt FROM flashcards WHERE user_id = ? AND srs_due <= ?`
  ).get(userId, today);
  return (row && row.cnt) || 0;
}

// ---------------- activity / streaks ----------------
function logActivity(userId) {
  const today = new Date().toISOString().slice(0, 10);
  try {
    db.prepare('INSERT OR IGNORE INTO activity_log (user_id, activity_date) VALUES (?, ?)').run(userId, today);
  } catch { /* ignore */ }
}

function getStreakForUser(userId) {
  const rows = db.prepare(
    `SELECT activity_date FROM activity_log WHERE user_id = ? ORDER BY activity_date DESC`
  ).all(userId);
  if (!rows.length) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < rows.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    const expStr = expected.toISOString().slice(0, 10);
    if (rows[i].activity_date === expStr) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// ---------------- activity heatmap ----------------
function getActivityHeatmap(userId) {
  const rows = db.prepare(`
    SELECT
      date(created_at) AS day,
      COUNT(*) AS sessions
    FROM study_runs
    WHERE user_id = ?
      AND created_at >= date('now', '-371 days')
    GROUP BY day
  `).all(userId);

  const activityRows = db.prepare(`
    SELECT activity_date AS day
    FROM activity_log
    WHERE user_id = ?
      AND activity_date >= date('now', '-371 days')
  `).all(userId);

  const map = {};
  for (const r of rows) map[r.day] = (map[r.day] || 0) + r.sessions;
  for (const r of activityRows) if (!map[r.day]) map[r.day] = 1;

  return map;
}

// ---------------- XP ----------------
function awardXP(userId, amount, reason) {
  try {
    db.prepare('INSERT INTO xp_events (user_id, amount, reason) VALUES (?, ?, ?)').run(userId, amount || 0, reason || '');
  } catch { /* ignore */ }
}

function getTotalXPForUser(userId) {
  const row = db.prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM xp_events WHERE user_id = ?').get(userId);
  return (row && row.total) || 0;
}

function getXPLevel(xp) {
  const levels = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500, 7500];
  let level = 1;
  for (let i = 1; i < levels.length; i++) {
    if (xp >= levels[i]) level = i + 1; else break;
  }
  const currentFloor = levels[Math.min(level - 1, levels.length - 1)];
  const nextCeiling = levels[Math.min(level, levels.length - 1)];
  const progress = nextCeiling > currentFloor ? Math.round(((xp - currentFloor) / (nextCeiling - currentFloor)) * 100) : 100;
  return { level, xp, progress, nextAt: nextCeiling };
}

// ---------------- Study Goals / Planner ----------------
function createGoal(userId, { title, goalType, targetValue, targetDate }) {
  const info = db.prepare(
    `INSERT INTO study_goals (user_id, title, goal_type, target_value, target_date)
     VALUES (?, ?, ?, ?, ?)`
  ).run(userId, String(title || '').slice(0, 200), goalType || 'sessions', Number(targetValue) || 1, targetDate);
  return db.prepare('SELECT * FROM study_goals WHERE id = ?').get(Number(info.lastInsertRowid));
}

function listGoalsForUser(userId) {
  return db.prepare(
    `SELECT * FROM study_goals WHERE user_id = ? ORDER BY target_date ASC, created_at DESC`
  ).all(userId);
}

function updateGoal(id, userId, { completed, title, targetValue }) {
  const goal = db.prepare('SELECT * FROM study_goals WHERE id = ? AND user_id = ?').get(id, userId);
  if (!goal) return null;
  const newCompleted = completed !== undefined ? (completed ? 1 : 0) : goal.completed;
  const newTitle = title !== undefined ? String(title).slice(0, 200) : goal.title;
  const newTarget = targetValue !== undefined ? Number(targetValue) : goal.target_value;
  db.prepare(
    'UPDATE study_goals SET completed = ?, title = ?, target_value = ? WHERE id = ? AND user_id = ?'
  ).run(newCompleted, newTitle, newTarget, id, userId);
  // Award XP for completing a goal
  if (completed && !goal.completed) awardXP(userId, 50, 'goal_completed');
  return db.prepare('SELECT * FROM study_goals WHERE id = ?').get(id);
}

function deleteGoal(id, userId) {
  db.prepare('DELETE FROM study_goals WHERE id = ? AND user_id = ?').run(id, userId);
}

// ---------------- chat memory ----------------
const CHAT_MAX_STORED = 200; // max messages kept per user

function saveChatMessages(userId, messages) {
  const insert = db.prepare(
    'INSERT INTO chat_messages (user_id, role, content_text) VALUES (?, ?, ?)'
  );
  for (const m of messages) {
    const text = typeof m.content === 'string'
      ? m.content
      : Array.isArray(m.content)
        ? m.content.filter(p => p.type === 'text').map(p => p.text).join('\n') ||
          '[image attachment]'
        : String(m.content || '');
    insert.run(userId, m.role === 'assistant' ? 'assistant' : 'user', text.slice(0, 20000));
  }
  // Trim to keep only the most recent CHAT_MAX_STORED messages
  db.prepare(
    `DELETE FROM chat_messages WHERE user_id = ? AND id NOT IN (
      SELECT id FROM chat_messages WHERE user_id = ? ORDER BY id DESC LIMIT ?
    )`
  ).run(userId, userId, CHAT_MAX_STORED);
}

function listChatMessages(userId, limit) {
  const n = Math.min(Number(limit) || 100, CHAT_MAX_STORED);
  const rows = db.prepare(
    `SELECT id, role, content_text, created_at FROM chat_messages
     WHERE user_id = ? ORDER BY id DESC LIMIT ?`
  ).all(userId, n);
  return rows.reverse();
}

function clearChatMessages(userId) {
  db.prepare('DELETE FROM chat_messages WHERE user_id = ?').run(userId);
}

// ---------------- Notes ----------------
function createNote(userId, { title, body, color }) {
  return db.prepare(`INSERT INTO notes (user_id, title, body, color) VALUES (?, ?, ?, ?)`)
    .run(userId, (title || 'Untitled').slice(0, 200), (body || '').slice(0, 10000), color || 'violet');
}
function listNotesForUser(userId) {
  return db.prepare(`SELECT id, title, body, color, pinned, created_at, updated_at
    FROM notes WHERE user_id = ? ORDER BY pinned DESC, updated_at DESC`).all(userId);
}
function getNoteById(id, userId) {
  return db.prepare(`SELECT * FROM notes WHERE id = ? AND user_id = ?`).get(id, userId);
}
function updateNote(id, userId, fields) {
  const note = getNoteById(id, userId);
  if (!note) return null;
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  db.prepare(`UPDATE notes SET title=?, body=?, color=?, pinned=?, updated_at=? WHERE id=? AND user_id=?`).run(
    fields.title !== undefined ? String(fields.title).slice(0, 200) : note.title,
    fields.body !== undefined ? String(fields.body).slice(0, 10000) : note.body,
    fields.color !== undefined ? fields.color : note.color,
    fields.pinned !== undefined ? (fields.pinned ? 1 : 0) : note.pinned,
    now, id, userId
  );
  return getNoteById(id, userId);
}
function deleteNote(id, userId) {
  return db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').run(id, userId);
}

// ---------------- Focus Sessions ----------------
function logFocusSession(userId, { durationMins, subject, completed }) {
  return db.prepare(`INSERT INTO focus_sessions (user_id, duration_mins, subject, completed) VALUES (?, ?, ?, ?)`)
    .run(userId, durationMins || 25, (subject || '').slice(0, 100), completed !== false ? 1 : 0);
}
function getFocusStatsForUser(userId) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRows = db.prepare(`SELECT duration_mins FROM focus_sessions
    WHERE user_id = ? AND date(created_at) = ? AND completed = 1`).all(userId, todayStr);
  const totalSessions = db.prepare(`SELECT COUNT(*) AS cnt FROM focus_sessions WHERE user_id = ? AND completed = 1`).get(userId);
  const recent = db.prepare(`SELECT id, duration_mins, subject, created_at FROM focus_sessions
    WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`).all(userId);
  return {
    todayMins: todayRows.reduce((s, r) => s + r.duration_mins, 0),
    todaySessions: todayRows.length,
    totalSessions: (totalSessions && totalSessions.cnt) || 0,
    recent,
  };
}

// ---------------- Achievements ----------------
function getAchievementsForUser(userId) {
  const runs = db.prepare(`SELECT answered_count, total_questions FROM study_runs WHERE user_id = ?`).all(userId);
  const docs = db.prepare(`SELECT COUNT(*) AS cnt FROM documents WHERE user_id = ? AND status='done'`).get(userId);
  const flashReviews = db.prepare(`SELECT COUNT(*) AS cnt FROM xp_events WHERE user_id = ? AND reason='flashcard_review'`).get(userId);
  const streak = getStreakForUser(userId);
  const totalXP = getTotalXPForUser(userId);
  const notesCount = db.prepare(`SELECT COUNT(*) AS cnt FROM notes WHERE user_id = ?`).get(userId);
  const focusCount = db.prepare(`SELECT COUNT(*) AS cnt FROM focus_sessions WHERE user_id = ? AND completed=1`).get(userId);
  const bmCount = db.prepare(`SELECT COUNT(*) AS cnt FROM bookmarks WHERE user_id = ?`).get(userId);

  const totalRuns = runs.length;
  const totalAnswered = runs.reduce((s, r) => s + r.answered_count, 0);
  const totalQ = runs.reduce((s, r) => s + r.total_questions, 0);
  const avgScore = totalQ > 0 ? Math.round((totalAnswered / totalQ) * 100) : 0;
  const hasPerfectScore = runs.some(r => r.total_questions > 0 && r.answered_count === r.total_questions);

  const d = {
    totalRuns, totalAnswered, avgScore, hasPerfectScore,
    totalDocuments: (docs && docs.cnt) || 0,
    flashcardReviews: (flashReviews && flashReviews.cnt) || 0,
    streak, totalXP,
    totalNotes: (notesCount && notesCount.cnt) || 0,
    totalFocusSessions: (focusCount && focusCount.cnt) || 0,
    totalBookmarks: (bmCount && bmCount.cnt) || 0,
  };

  const achievements = [
    { key:'first_quiz', name:'First Steps', desc:'Complete your first quiz', icon:'🎯', cat:'Study', earned:d.totalRuns>=1, progress:Math.min(d.totalRuns,1), total:1 },
    { key:'quiz_10', name:'Quiz Regular', desc:'Complete 10 quizzes', icon:'📝', cat:'Study', earned:d.totalRuns>=10, progress:Math.min(d.totalRuns,10), total:10 },
    { key:'quiz_50', name:'Quiz Master', desc:'Complete 50 quizzes', icon:'🏆', cat:'Study', earned:d.totalRuns>=50, progress:Math.min(d.totalRuns,50), total:50 },
    { key:'streak_3', name:'Streak Starter', desc:'3-day study streak', icon:'🔥', cat:'Consistency', earned:d.streak>=3, progress:Math.min(d.streak,3), total:3 },
    { key:'streak_7', name:'Week Warrior', desc:'7-day study streak', icon:'⚡', cat:'Consistency', earned:d.streak>=7, progress:Math.min(d.streak,7), total:7 },
    { key:'streak_30', name:'Month Master', desc:'30-day study streak', icon:'👑', cat:'Consistency', earned:d.streak>=30, progress:Math.min(d.streak,30), total:30 },
    { key:'doc_1', name:'Scholar', desc:'Upload your first document', icon:'📚', cat:'Library', earned:d.totalDocuments>=1, progress:Math.min(d.totalDocuments,1), total:1 },
    { key:'doc_5', name:'Collector', desc:'Upload 5 documents', icon:'📖', cat:'Library', earned:d.totalDocuments>=5, progress:Math.min(d.totalDocuments,5), total:5 },
    { key:'doc_10', name:'Library', desc:'Upload 10 documents', icon:'🏛️', cat:'Library', earned:d.totalDocuments>=10, progress:Math.min(d.totalDocuments,10), total:10 },
    { key:'flash_10', name:'Card Learner', desc:'Review 10 flashcards', icon:'🃏', cat:'Flashcards', earned:d.flashcardReviews>=10, progress:Math.min(d.flashcardReviews,10), total:10 },
    { key:'flash_100', name:'Memory Pro', desc:'Review 100 flashcards', icon:'🧠', cat:'Flashcards', earned:d.flashcardReviews>=100, progress:Math.min(d.flashcardReviews,100), total:100 },
    { key:'flash_500', name:'Card Master', desc:'Review 500 flashcards', icon:'🎴', cat:'Flashcards', earned:d.flashcardReviews>=500, progress:Math.min(d.flashcardReviews,500), total:500 },
    { key:'q_100', name:'Centurion', desc:'Answer 100 questions', icon:'⚔️', cat:'Performance', earned:d.totalAnswered>=100, progress:Math.min(d.totalAnswered,100), total:100 },
    { key:'q_500', name:'Power Learner', desc:'Answer 500 questions', icon:'🚀', cat:'Performance', earned:d.totalAnswered>=500, progress:Math.min(d.totalAnswered,500), total:500 },
    { key:'perfect', name:'Perfect Score', desc:'Score 100% on a quiz', icon:'⭐', cat:'Performance', earned:d.hasPerfectScore, progress:d.hasPerfectScore?1:0, total:1 },
    { key:'avg_80', name:'High Achiever', desc:'Maintain 80%+ average', icon:'🎖️', cat:'Performance', earned:d.avgScore>=80&&d.totalRuns>=3, progress:Math.min(d.avgScore,80), total:80 },
    { key:'xp_500', name:'XP Hunter', desc:'Earn 500 XP', icon:'💎', cat:'XP', earned:d.totalXP>=500, progress:Math.min(d.totalXP,500), total:500 },
    { key:'xp_2000', name:'XP Legend', desc:'Earn 2000 XP', icon:'🌟', cat:'XP', earned:d.totalXP>=2000, progress:Math.min(d.totalXP,2000), total:2000 },
    { key:'first_bookmark', name:'Bookmarked', desc:'Save your first bookmark', icon:'🔖', cat:'Tools', earned:d.totalBookmarks>=1, progress:Math.min(d.totalBookmarks,1), total:1 },
    { key:'first_note', name:'Note Taker', desc:'Create your first note', icon:'📓', cat:'Tools', earned:d.totalNotes>=1, progress:Math.min(d.totalNotes,1), total:1 },
    { key:'first_focus', name:'Focused', desc:'Complete a focus session', icon:'⏱️', cat:'Tools', earned:d.totalFocusSessions>=1, progress:Math.min(d.totalFocusSessions,1), total:1 },
    { key:'focus_10', name:'Deep Worker', desc:'Complete 10 focus sessions', icon:'🧘', cat:'Tools', earned:d.totalFocusSessions>=10, progress:Math.min(d.totalFocusSessions,10), total:10 },
  ];

  return { achievements, stats: d };
}

// ---------------- Weak Spots ----------------
function getWeakSpotsForUser(userId) {
  const runs = db.prepare(`SELECT document_name, answered_count, total_questions
    FROM study_runs WHERE user_id = ? AND total_questions > 0`).all(userId);
  const docPerf = {};
  for (const r of runs) {
    if (!docPerf[r.document_name]) docPerf[r.document_name] = { correct: 0, total: 0, runs: 0 };
    docPerf[r.document_name].correct += r.answered_count;
    docPerf[r.document_name].total += r.total_questions;
    docPerf[r.document_name].runs++;
  }
  return Object.entries(docPerf)
    .map(([name, d]) => ({ name: name.slice(0, 40), score: Math.round((d.correct / d.total) * 100), runs: d.runs }))
    .filter(d => d.score < 75)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);
}

// ---------------- Analytics ----------------
function getAnalyticsForUser(userId) {
  const runs = db.prepare(
    `SELECT id, document_name, total_questions, answered_count, created_at
     FROM study_runs WHERE user_id = ? ORDER BY created_at ASC`
  ).all(userId);

  // Score trend: last 30 runs
  const scoreTrend = runs.slice(-30).map(r => ({
    date: r.created_at.slice(0, 10),
    label: r.document_name.slice(0, 24),
    score: r.total_questions > 0 ? Math.round((r.answered_count / r.total_questions) * 100) : 0,
    total: r.total_questions,
  }));

  // Per-document performance
  const docPerf = {};
  for (const r of runs) {
    if (!docPerf[r.document_name]) docPerf[r.document_name] = { correct: 0, total: 0, runs: 0 };
    docPerf[r.document_name].correct += r.answered_count;
    docPerf[r.document_name].total += r.total_questions;
    docPerf[r.document_name].runs++;
  }
  const byDocument = Object.entries(docPerf).map(([name, d]) => ({
    name: name.slice(0, 30),
    score: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0,
    runs: d.runs,
    total: d.total,
  })).sort((a, b) => b.runs - a.runs).slice(0, 10);

  // Weekly activity (last 8 weeks)
  const weeklyRows = db.prepare(`
    SELECT strftime('%Y-W%W', created_at) AS week, COUNT(*) AS sessions, SUM(answered_count) AS correct, SUM(total_questions) AS total
    FROM study_runs WHERE user_id = ? AND created_at >= date('now', '-56 days')
    GROUP BY week ORDER BY week ASC
  `).all(userId);

  return { scoreTrend, byDocument, weeklyActivity: weeklyRows };
}

// ---------------- dashboard ----------------
function getDashboardStats(userId) {
  const runs = db.prepare('SELECT answered_count, total_questions FROM study_runs WHERE user_id = ?').all(userId);
  const docs = db.prepare('SELECT COUNT(*) AS cnt FROM documents WHERE user_id = ? AND status = "done"').get(userId);
  const flashcards = db.prepare('SELECT COUNT(*) AS cnt FROM flashcards WHERE user_id = ?').get(userId);
  const totalQ = runs.reduce((s, r) => s + r.total_questions, 0);
  const totalA = runs.reduce((s, r) => s + r.answered_count, 0);
  const streak = getStreakForUser(userId);
  const dueCards = countDueFlashcards(userId);
  const totalXP = getTotalXPForUser(userId);
  const xpLevel = getXPLevel(totalXP);
  return {
    totalRuns: runs.length,
    totalDocuments: (docs && docs.cnt) || 0,
    totalFlashcards: (flashcards && flashcards.cnt) || 0,
    totalQuestions: totalQ,
    totalAnswered: totalA,
    avgScore: totalQ > 0 ? Math.round((totalA / totalQ) * 100) : 0,
    streak,
    dueCards,
    totalXP,
    xpLevel,
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
  setDocumentTags,
  setDocumentShareToken,
  revokeDocumentShare,
  getDocumentByShareToken,
  deleteDocument,
  searchForUser,
  saveFlashcards,
  listFlashcardsForDocument,
  listAllFlashcardsForUser,
  reviewFlashcard,
  countDueFlashcards,
  logActivity,
  getStreakForUser,
  getActivityHeatmap,
  awardXP,
  getTotalXPForUser,
  getXPLevel,
  createGoal,
  listGoalsForUser,
  updateGoal,
  deleteGoal,
  getAnalyticsForUser,
  getDashboardStats,
  saveChatMessages,
  listChatMessages,
  clearChatMessages,
  createNote, listNotesForUser, getNoteById, updateNote, deleteNote,
  logFocusSession, getFocusStatsForUser,
  getAchievementsForUser, getWeakSpotsForUser,
};
