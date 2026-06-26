'use strict';
/* ── MedPass v2 — Frontend SPA ─────────────────────────────────────────── */

const $ = id => document.getElementById(id);
const qs = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* ── API helper ─────────────────────────────────────────────────────────── */
async function api(method, url, body) {
  const opts = {
    method,
    headers: {},
    credentials: 'same-origin',
  };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  if (res.status === 401) { location.href = '/login.html'; throw new Error('Unauthenticated'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok && !data.ok) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { status: res.status, data });
  return data;
}

/* ── Toast ──────────────────────────────────────────────────────────────── */
function toast(msg, type = 'info', ms = 3500) {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  const icon = type === 'success' ? '✓' : type === 'error' ? '⚠' : 'ℹ';
  el.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
  $('toastContainer').appendChild(el);
  setTimeout(() => el.remove(), ms);
}

/* ── Modal ──────────────────────────────────────────────────────────────── */
function openModal(title, bodyHtml, opts = {}) {
  $('modalTitle').textContent = title;
  $('modalBody').innerHTML = bodyHtml;
  $('modalOverlay').style.display = 'flex';
  if (opts.onOpen) opts.onOpen($('modalBody'));
}
function closeModal() { $('modalOverlay').style.display = 'none'; }
$('modalClose').onclick = closeModal;
$('modalOverlay').onclick = e => { if (e.target === $('modalOverlay')) closeModal(); };

/* ── Theme ──────────────────────────────────────────────────────────────── */
const App = window.App = {};
App.theme = localStorage.getItem('mp_theme') || 'dark';
App.setTheme = function(t) {
  App.theme = t;
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('mp_theme', t);
  $('themeToggle').textContent = t === 'dark' ? '🌙' : '☀️';
};
App.setTheme(App.theme);

App.setAccent = function(color) {
  document.documentElement.style.setProperty('--brand', color);
  document.documentElement.style.setProperty('--brand-hi', lightenHex(color, 0.2));
  document.documentElement.style.setProperty('--brand-lo', hexAlpha(color, 0.15));
  document.documentElement.style.setProperty('--grad', `linear-gradient(135deg,${color},${lightenHex(color, 0.15)})`);
  localStorage.setItem('mp_accent', color);
  qsa('.swatch').forEach(s => s.classList.toggle('active', s.dataset.color === color));
};
const savedAccent = localStorage.getItem('mp_accent');
if (savedAccent) App.setAccent(savedAccent);

function lightenHex(hex, amt) {
  let c = parseInt(hex.slice(1), 16);
  const r = Math.min(255, (c >> 16) + Math.round(255 * amt));
  const g = Math.min(255, ((c >> 8) & 0xff) + Math.round(255 * amt));
  const b = Math.min(255, (c & 0xff) + Math.round(255 * amt));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
function hexAlpha(hex, a) {
  const c = parseInt(hex.slice(1), 16);
  return `rgba(${(c >> 16)&255},${(c >> 8)&255},${c&255},${a})`;
}

$('themeToggle').onclick = () => App.setTheme(App.theme === 'dark' ? 'light' : 'dark');
qsa('#accentSwatches .swatch').forEach(s => { s.onclick = () => App.setAccent(s.dataset.color); });

/* ── Sidebar ────────────────────────────────────────────────────────────── */
const isMobile = () => window.innerWidth <= 700;
let sidebarCollapsed = localStorage.getItem('mp_sidebar_collapsed') === '1';

function applyCollapsed() {
  if (isMobile()) {
    document.body.classList.remove('sidebar-collapsed');
  } else {
    document.body.classList.toggle('sidebar-collapsed', sidebarCollapsed);
    $('sidebarCollapseBtn').setAttribute('aria-label', sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar');
  }
}
applyCollapsed();

$('sidebarCollapseBtn').onclick = () => {
  sidebarCollapsed = !sidebarCollapsed;
  localStorage.setItem('mp_sidebar_collapsed', sidebarCollapsed ? '1' : '0');
  applyCollapsed();
};

$('hamburger').onclick = () => {
  document.body.classList.toggle('mobile-open');
};
$('overlay').onclick = () => document.body.classList.remove('mobile-open');
window.addEventListener('resize', applyCollapsed);

/* ── Navigation ─────────────────────────────────────────────────────────── */
const VIEW_TITLES = {
  dashboard: 'Dashboard', library: 'Library', study: 'Study', flashcards: 'Flashcards',
  analytics: 'Analytics', search: 'Search', focus: 'Focus Room', notes: 'Notes',
  bookmarks: 'Bookmarks', history: 'History', voice: 'Voice to Text',
  solver: 'Image Question Solver', planner: 'Study Planner', settings: 'Settings',
};
let currentView = null;

App.nav = function(viewId) {
  if (!VIEW_TITLES[viewId]) return;
  qsa('.view').forEach(v => v.classList.remove('active'));
  qsa('.nav-item').forEach(n => n.classList.remove('active'));
  const view = $('view' + viewId.charAt(0).toUpperCase() + viewId.slice(1));
  if (view) view.classList.add('active');
  qsa(`.nav-item[data-view="${viewId}"]`).forEach(n => n.classList.add('active'));
  $('pageTitle').textContent = VIEW_TITLES[viewId];
  document.title = VIEW_TITLES[viewId] + ' — MedPass';
  currentView = viewId;
  if (isMobile()) document.body.classList.remove('mobile-open');
  history.pushState({ view: viewId }, '', '#' + viewId);
  loadView(viewId);
};

qsa('.nav-item[data-view]').forEach(n => {
  n.onclick = e => { e.preventDefault(); App.nav(n.dataset.view); };
});

window.addEventListener('popstate', e => {
  if (e.state?.view) App.nav(e.state.view);
});

function loadView(v) {
  switch (v) {
    case 'dashboard':  loadDashboard();  break;
    case 'library':    loadLibrary();    break;
    case 'study':      resetStudySetup(); break;
    case 'flashcards': loadFlashcards(); break;
    case 'analytics':  loadAnalytics();  break;
    case 'search':     $('searchInput').focus(); break;
    case 'focus':      loadFocus();      break;
    case 'notes':      loadNotes();      break;
    case 'bookmarks':  loadBookmarks();  break;
    case 'history':    loadHistory();    break;
    case 'voice':      initVoice();      break;
    case 'solver':     initSolver();     break;
    case 'planner':    loadPlanner();    break;
    case 'settings':   loadSettings();   break;
  }
}

/* ── Logout ─────────────────────────────────────────────────────────────── */
async function doLogout() {
  await api('POST', '/api/auth/logout').catch(() => {});
  location.href = '/login.html';
}
$('logoutBtn').onclick = doLogout;
$('settingsLogout').onclick = doLogout;

/* ── XP / Level sidebar ─────────────────────────────────────────────────── */
async function refreshXP() {
  try {
    const { level, xp, progress } = await api('GET', '/api/study/xp');
    $('sidebarLevel').textContent = level;
    $('sidebarXP').textContent = xp;
    $('sidebarXPBar').style.width = progress + '%';
  } catch {}
}

/* ── DASHBOARD ──────────────────────────────────────────────────────────── */
async function loadDashboard() {
  try {
    const d = await api('GET', '/api/study/dashboard');
    const s = d.stats;
    $('dStatAcc').textContent    = s.accuracy + '%';
    $('dStatRuns').textContent   = s.totalRuns;
    $('dStatStreak').textContent = s.streak;
    $('dStatCards').textContent  = s.dueCards;
    $('streakCount').textContent = s.streak;

    // XP sidebar
    $('sidebarLevel').textContent = s.level;
    $('sidebarXP').textContent    = s.xp;
    $('sidebarXPBar').style.width = s.progress + '%';

    // Weak spots
    renderWeakSpots($('weakSpotsList'), d.stats?.weakSpots || []);

    // Recent docs
    const docsEl = $('recentDocsList');
    if (!d.recentDocs?.length) { docsEl.innerHTML = '<p class="empty-state">No documents yet.</p>'; }
    else {
      docsEl.innerHTML = d.recentDocs.map(doc =>
        `<div class="weak-item" style="cursor:pointer" onclick="App.nav('library')">
          <span>${docIcon(doc)}</span>
          <span style="flex:1;font-size:13px">${esc(doc.name)}</span>
          <span class="badge">${doc.status}</span>
        </div>`
      ).join('');
    }

    // Recent runs
    const runsEl = $('recentRunsList');
    if (!d.recentRuns?.length) { runsEl.innerHTML = '<p class="empty-state">No sessions yet.</p>'; }
    else {
      runsEl.innerHTML = d.recentRuns.map(r =>
        `<div class="weak-item">
          <span style="flex:1;font-size:13px">${esc(r.document_name)}</span>
          <span style="font-size:11.5px;color:var(--text-dim)">${r.answered_count}/${r.total_questions} correct</span>
        </div>`
      ).join('');
    }

    // Achievements (top earned)
    const { achievements } = await api('GET', '/api/study/achievements');
    const dashAch = $('dashAchievements');
    const earned = achievements.filter(a => a.earned).slice(0, 6);
    if (!earned.length) { dashAch.innerHTML = '<p class="empty-state">Keep studying to unlock!</p>'; }
    else {
      dashAch.innerHTML = earned.map(a =>
        `<div class="achievement earned"><span class="achievement-icon">${a.icon}</span><div><div class="achievement-name">${a.name}</div><div class="achievement-desc">${a.desc}</div></div></div>`
      ).join('');
    }
  } catch (err) { console.error('dashboard', err); }
}

function renderWeakSpots(container, spots) {
  if (!spots?.length) { container.innerHTML = '<p class="empty-state">No weak spots yet — complete some quizzes.</p>'; return; }
  container.innerHTML = spots.map(s =>
    `<div class="weak-item">
      <span style="flex:1;font-size:13px">${esc(s.topic)}</span>
      <div class="weak-bar-wrap"><div class="weak-bar-fill" style="width:${s.rate}%"></div></div>
      <span class="weak-rate">${s.rate}%</span>
    </div>`
  ).join('');
}

/* ── LIBRARY ────────────────────────────────────────────────────────────── */
let _docs = [];

async function loadLibrary() {
  try {
    const { documents } = await api('GET', '/api/study/documents');
    _docs = documents || [];
    renderDocGrid();
  } catch {}
}

function docIcon(doc) {
  const t = (doc.mime_type || '').toLowerCase();
  if (t.includes('pdf')) return '📄';
  if (t.includes('markdown') || (doc.name || '').endsWith('.md')) return '📝';
  return '📃';
}

function renderDocGrid() {
  const el = $('documentGrid');
  if (!_docs.length) { el.innerHTML = '<p class="empty-state" style="grid-column:1/-1">No documents yet. Upload a PDF, text, or markdown file.</p>'; return; }
  el.innerHTML = _docs.map(doc => {
    const statusCls = `status-${doc.status}`;
    return `<div class="doc-card">
      <div class="doc-card-icon">${docIcon(doc)}</div>
      <div class="doc-card-name">${esc(doc.name)}</div>
      <div class="doc-card-meta">${formatBytes(doc.size_bytes)} · ${relDate(doc.created_at)}</div>
      <span class="doc-card-status ${statusCls}">${doc.status}</span>
      <div class="doc-card-actions">
        ${doc.status === 'done' ? `<button class="btn-secondary doc-card-btn" onclick="startQuizFromDoc(${doc.id},'${esc(doc.name)}')">Quiz</button>` : ''}
        ${doc.status === 'done' ? `<button class="btn-secondary doc-card-btn" onclick="genFlashcardsFromDoc(${doc.id},'${esc(doc.name)}')">Flashcards</button>` : ''}
        ${doc.status === 'done' ? `<button class="btn-secondary doc-card-btn" onclick="summarizeDoc(${doc.id},'${esc(doc.name)}')">📋 Summarize</button>` : ''}
        ${doc.status === 'done' ? `<button class="btn-secondary doc-card-btn" onclick="shareDoc(${doc.id})" title="${doc.share_token ? 'Manage share link' : 'Share document'}">🔗 ${doc.share_token ? 'Shared' : 'Share'}</button>` : ''}
        <button class="btn-secondary doc-card-btn" onclick="deleteDoc(${doc.id})" style="margin-left:auto;color:#ef4444">🗑</button>
      </div>
    </div>`;
  }).join('');
}

$('fileUpload').onchange = async function() {
  const files = [...this.files];
  if (!files.length) return;
  const prog = $('uploadProgress'), bar = $('uploadBar'), st = $('uploadStatus');
  prog.style.display = 'block';
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    bar.style.width = Math.round((i / files.length) * 100) + '%';
    st.textContent = `Uploading ${f.name}…`;
    try {
      const text = await extractText(f);
      const { document: doc } = await api('POST', '/api/study/documents', {
        name: f.name, sizeBytes: f.size,
        mimeType: f.type || 'text/plain', textContent: text,
      });
      await api('PATCH', `/api/study/documents/${doc.id}`, { status: 'done' });
      toast(`${f.name} uploaded`, 'success');
    } catch (err) { toast(err.message || `Failed: ${f.name}`, 'error'); }
  }
  bar.style.width = '100%';
  st.textContent = 'Complete!';
  this.value = '';
  setTimeout(() => { prog.style.display = 'none'; }, 1800);
  await loadLibrary();
};

async function extractText(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return extractPdfText(file);
  const reader = new FileReader();
  return new Promise((res, rej) => {
    reader.onload = e => res(e.target.result || '');
    reader.onerror = rej;
    reader.readAsText(file, 'utf-8');
  });
}

async function extractPdfText(file) {
  if (typeof pdfjsLib === 'undefined') return `[PDF text extraction unavailable — pdf.js not loaded]\nFile: ${file.name}`;
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const ab = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
  let out = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    out += tc.items.map(item => item.str).join(' ') + '\n';
  }
  return out.trim() || '[PDF had no extractable text]';
}

window.deleteDoc = async function(id) {
  if (!confirm('Delete this document?')) return;
  await api('DELETE', `/api/study/documents/${id}`).catch(e => toast(e.message, 'error'));
  await loadLibrary();
};

window.shareDoc = async function(id) {
  const doc = _docs.find(d => d.id === id);
  if (!doc) return;
  if (doc.share_token) {
    const shareUrl = `${location.origin}/share.html?t=${doc.share_token}`;
    const action = confirm(`Share link:\n${shareUrl}\n\nClick OK to copy the link, or Cancel to revoke it.`);
    if (action) {
      try { await navigator.clipboard.writeText(shareUrl); toast('Link copied to clipboard!', 'success'); }
      catch { prompt('Copy this link:', shareUrl); }
    } else {
      if (!confirm('Revoke this share link? Anyone with the link will lose access.')) return;
      await api('POST', `/api/study/documents/${id}/share`, { revoke: true }).catch(e => toast(e.message, 'error'));
      toast('Share link revoked.', 'info');
      await loadLibrary();
    }
  } else {
    const { token } = await api('POST', `/api/study/documents/${id}/share`, {}).catch(e => { toast(e.message, 'error'); return {}; });
    if (!token) return;
    const shareUrl = `${location.origin}/share.html?t=${token}`;
    try { await navigator.clipboard.writeText(shareUrl); toast('Share link copied to clipboard!', 'success'); }
    catch { prompt('Copy this share link:', shareUrl); }
    await loadLibrary();
  }
};

let _pendingDocId = null;

window.startQuizFromDoc = function(id, name) {
  _pendingDocId = String(id);
  App.nav('study');
};

/* ── STUDY ──────────────────────────────────────────────────────────────── */
let quizState = null;

async function resetStudySetup() {
  showStudyPane('studySetup');
  try {
    const { documents } = await api('GET', '/api/study/documents');
    const sel = $('studyDocSel');
    sel.innerHTML = '<option value="">— select a document —</option>' +
      documents.filter(d => d.status === 'done').map(d => `<option value="${d.id}">${esc(d.name)}</option>`).join('');
    if (_pendingDocId) { sel.value = _pendingDocId; _pendingDocId = null; }
  } catch {}
}

function showStudyPane(id) {
  ['studySetup', 'studyQuiz', 'studyResults'].forEach(p => {
    $(p).style.display = p === id ? '' : 'none';
  });
}

// Study mode pills
qsa('#studyModes .pill').forEach(p => {
  p.onclick = () => { qsa('#studyModes .pill').forEach(x => x.classList.remove('active')); p.classList.add('active'); };
});

$('startQuizBtn').onclick = async () => {
  const docId = $('studyDocSel').value;
  if (!docId) { toast('Select a document first.', 'error'); return; }
  const count = Math.min(50, Math.max(1, Number($('studyQCount').value) || 10));
  const mode = qs('#studyModes .pill.active')?.dataset.mode || 'standard';
  const doc = _docs.find(d => String(d.id) === String(docId));

  $('startQuizBtn').disabled = true;
  $('startQuizBtn').textContent = 'Generating…';
  try {
    const { text } = await api('GET', `/api/study/documents/${docId}/text`);
    const prompt = `Generate exactly ${count} high-quality board-style MCQ questions from the following text.

Return ONLY a JSON array (no markdown, no explanation) like:
[{"stem":"...","choices":{"A":"...","B":"...","C":"...","D":"..."},"answer":"A","explanation":"...","topic":"..."}]

Rules:
- Each question must have exactly 4 choices (A, B, C, D)
- "answer" must be the letter of the correct choice (A/B/C/D)
- Include a 1-2 sentence explanation
- Include a short topic/category for "topic"
- Questions must be answerable from the provided text

TEXT:
${text.slice(0, 12000)}`;

    const { reply } = await api('POST', '/api/ai/chat', {
      messages: [{ role: 'user', content: prompt }]
    });
    let questions;
    try {
      let cleaned = reply
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();
      const jsonStr = cleaned.match(/\[[\s\S]*\]/)?.[0];
      if (!jsonStr) throw new Error('no array found');
      questions = JSON.parse(jsonStr);
    } catch {
      toast('AI returned invalid JSON. Try again.', 'error');
      return;
    }
    if (!Array.isArray(questions) || !questions.length) { toast('No questions generated. Try again.', 'error'); return; }

    quizState = {
      docId, docName: doc?.name || 'Document',
      questions: questions.slice(0, count),
      current: 0,
      results: [],
      timed: mode === 'timed',
      timerVal: 30,
      timerId: null,
    };
    startQuiz();
  } catch (err) { toast(err.message || 'Failed to generate quiz.', 'error'); }
  finally { $('startQuizBtn').disabled = false; $('startQuizBtn').textContent = 'Generate Quiz →'; }
};

function startQuiz() {
  showStudyPane('studyQuiz');
  renderQuestion();
}

function renderQuestion() {
  const q = quizState;
  const item = q.questions[q.current];
  const total = q.questions.length;
  $('qProgress').textContent = `Q ${q.current + 1}/${total}`;
  $('qProgFill').style.width = Math.round(((q.current) / total) * 100) + '%';

  $('qStem').textContent = item.stem;
  $('qChoices').innerHTML = '';
  $('qExplanation').style.display = 'none';
  $('qNextBtn').style.display = 'none';

  const letters = ['A','B','C','D','E'];
  const choices = typeof item.choices === 'object' && !Array.isArray(item.choices)
    ? Object.entries(item.choices)
    : letters.slice(0, 4).map((l, i) => [l, item.choices?.[i] || '']);

  choices.forEach(([letter, text]) => {
    const btn = document.createElement('div');
    btn.className = 'q-choice';
    btn.dataset.letter = letter;
    btn.innerHTML = `<span class="q-choice-letter">${letter}</span><span>${esc(String(text))}</span>`;
    btn.onclick = () => answerQuestion(letter);
    $('qChoices').appendChild(btn);
  });

  if (q.timed) {
    q.timerVal = 30;
    $('qTimer').style.display = 'flex';
    clearInterval(q.timerId);
    $('qTimer').textContent = q.timerVal + 's';
    $('qTimer').classList.remove('urgent');
    q.timerId = setInterval(() => {
      q.timerVal--;
      $('qTimer').textContent = q.timerVal + 's';
      if (q.timerVal <= 10) $('qTimer').classList.add('urgent');
      if (q.timerVal <= 0) { clearInterval(q.timerId); answerQuestion(null); }
    }, 1000);
  } else { $('qTimer').style.display = 'none'; }
}

function answerQuestion(chosen) {
  clearInterval(quizState.timerId);
  const item = quizState.questions[quizState.current];
  const correct = String(item.answer || '').toUpperCase();
  const isCorrect = chosen && chosen.toUpperCase() === correct;

  qsa('.q-choice').forEach(el => {
    el.classList.add('answered');
    el.onclick = null;
    if (el.dataset.letter === correct) el.classList.add(chosen ? 'correct' : 'revealed');
    else if (el.dataset.letter === chosen) el.classList.add('incorrect');
  });

  $('qExplanation').style.display = 'block';
  $('qExplanation').innerHTML = `<strong>${isCorrect ? '✓ Correct!' : chosen ? '✗ Incorrect.' : '⏱ Time\'s up.'}</strong><br>${esc(item.explanation || '')}`;
  $('qNextBtn').style.display = 'inline-flex';

  quizState.results.push({
    stem: item.stem,
    topic: item.topic,
    choices: item.choices,
    correctLetter: correct,
    chosen: chosen,
    isCorrect,
    isUnanswered: !chosen,
    explanation: item.explanation,
  });
}

$('qNextBtn').onclick = () => {
  quizState.current++;
  if (quizState.current >= quizState.questions.length) finishQuiz();
  else renderQuestion();
};

$('endQuizBtn').onclick = () => {
  clearInterval(quizState?.timerId);
  if (confirm('End quiz early?')) {
    // Fill remaining as unanswered
    while (quizState.current < quizState.questions.length) {
      const item = quizState.questions[quizState.current];
      quizState.results.push({ stem: item.stem, topic: item.topic, choices: item.choices, correctLetter: item.answer, chosen: null, isCorrect: false, isUnanswered: true, explanation: item.explanation });
      quizState.current++;
    }
    finishQuiz();
  }
};

async function finishQuiz() {
  clearInterval(quizState?.timerId);
  showStudyPane('studyResults');

  const results = quizState.results;
  const total = results.length;
  const correct = results.filter(r => r.isCorrect).length;
  const unanswered = results.filter(r => r.isUnanswered).length;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  $('resultSummary').innerHTML = `
    <div class="result-stat"><div class="result-stat-val">${pct}%</div><div class="result-stat-lbl">Score</div></div>
    <div class="result-stat"><div class="result-stat-val">${correct}</div><div class="result-stat-lbl">Correct</div></div>
    <div class="result-stat"><div class="result-stat-val">${total - correct - unanswered}</div><div class="result-stat-lbl">Wrong</div></div>
    <div class="result-stat"><div class="result-stat-val">${unanswered}</div><div class="result-stat-lbl">Unanswered</div></div>`;

  $('resultList').innerHTML = results.map((r, i) =>
    `<div class="result-item ${r.isCorrect ? 'correct' : r.isUnanswered ? 'unanswered' : 'incorrect'}">
      <div class="result-item-q">${i + 1}. ${esc(r.stem)}</div>
      <div class="result-item-meta">
        ${r.isCorrect ? '✓ Correct' : r.isUnanswered ? '— Unanswered' : `✗ You chose ${r.chosen || '?'}, correct: ${r.correctLetter}`}
        ${r.topic ? ` · ${esc(r.topic)}` : ''}
      </div>
      ${r.explanation ? `<div style="margin-top:6px;font-size:12.5px;color:var(--text-2)">${esc(r.explanation)}</div>` : ''}
    </div>`
  ).join('');

  // Save run
  try {
    await api('POST', '/api/study/runs', { documentName: quizState.docName, items: results, note: '' });
    refreshXP();
    toast(`Quiz saved! ${pct}% — ${correct}/${total} correct`, pct >= 70 ? 'success' : 'info');
  } catch (err) { toast('Could not save run: ' + err.message, 'error'); }
}

$('retakeBtn').onclick = () => {
  if (!quizState) return;
  quizState.current = 0;
  quizState.results = [];
  startQuiz();
};

$('qBookmarkBtn').onclick = () => {
  if (!quizState) return;
  const item = quizState.questions[quizState.current];
  const result = quizState.results[quizState.current];
  api('POST', '/api/study/bookmarks', {
    runId: null,
    questionNum: quizState.current,
    stem: item.stem,
    correctLetter: item.answer,
    explanation: item.explanation || '',
  }).then(() => toast('Bookmarked!', 'success')).catch(e => toast(e.message, 'error'));
};

/* ── FLASHCARDS ──────────────────────────────────────────────────────────── */
let _flashcards = [];
let _fcIndex = 0;

async function loadFlashcards() {
  try {
    const { flashcards } = await api('GET', '/api/study/flashcards');
    _flashcards = flashcards || [];
    _fcIndex = 0;
    renderFlashcardDeck();
    renderFCList();
  } catch {}
}

function renderFlashcardDeck() {
  const deck = $('flashcardDeck');
  const today = new Date().toISOString().slice(0, 10);
  const due = _flashcards.filter(c => c.srs_due <= today);

  if (!_flashcards.length) {
    deck.innerHTML = '<p class="empty-state">No flashcards yet. Generate some from a document in the Library.</p>';
    return;
  }
  if (!due.length) {
    deck.innerHTML = `<p class="empty-state">🎉 All ${_flashcards.length} cards reviewed! Next due: ${_flashcards.sort((a,b)=>a.srs_due.localeCompare(b.srs_due))[0]?.srs_due}.</p>`;
    return;
  }

  const card = due[0];
  const fcEl = document.createElement('div');
  fcEl.className = 'flashcard';
  fcEl.innerHTML = `
    <div class="flashcard-inner">
      <div class="flashcard-face flashcard-front">
        <span class="flashcard-label">Front</span>
        ${esc(card.front)}
      </div>
      <div class="flashcard-face flashcard-back">
        <span class="flashcard-label">Back</span>
        ${esc(card.back)}
      </div>
    </div>`;
  fcEl.onclick = () => fcEl.classList.toggle('flipped');

  const tip = document.createElement('p');
  tip.style.cssText = 'font-size:12px;color:var(--text-dim);text-align:center';
  tip.textContent = `Click card to flip · ${due.length} card${due.length !== 1 ? 's' : ''} due`;

  const ctrls = document.createElement('div');
  ctrls.className = 'fc-controls';
  [['Again','again',0],['Hard','hard',1],['Good','good',2],['Easy','easy',3]].forEach(([label, cls, rating]) => {
    const btn = document.createElement('button');
    btn.className = `fc-btn fc-btn-${cls}`;
    btn.textContent = label;
    btn.onclick = () => reviewCard(card.id, rating);
    ctrls.appendChild(btn);
  });

  deck.innerHTML = '';
  deck.append(fcEl, tip, ctrls);
}

async function reviewCard(cardId, rating) {
  try {
    await api('POST', `/api/study/flashcards/${cardId}/review`, { rating });
    await loadFlashcards();
    refreshXP();
  } catch (err) { toast(err.message, 'error'); }
}

function renderFCList() {
  const el = $('flashcardAllList');
  if (!_flashcards.length) { el.innerHTML = ''; return; }
  const today = new Date().toISOString().slice(0, 10);
  el.innerHTML = `
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text-dim);margin-bottom:8px">All Cards (${_flashcards.length})</div>` +
    _flashcards.slice(0, 50).map(c => {
      const isDue = c.srs_due <= today;
      return `<div class="fc-item">
        <span class="fc-item-front">${esc(c.front)}</span>
        <span class="fc-item-due ${isDue ? 'due-now' : ''}">${isDue ? 'Due now' : 'Due ' + c.srs_due}</span>
      </div>`;
    }).join('');
}

$('fcGenBtn').onclick = () => {
  openModal('Generate Flashcards', `
    <p style="color:var(--text-2);font-size:13.5px;margin-bottom:16px">Select a document to generate flashcards from:</p>
    <div class="fc-gen-select" id="fcDocOptions"><p class="empty-state">Loading…</p></div>
  `);
  api('GET', '/api/study/documents').then(({ documents }) => {
    const done = (documents || []).filter(d => d.status === 'done');
    const el = $('fcDocOptions');
    if (!done.length) { el.innerHTML = '<p class="empty-state">No ready documents found. Upload and process a document first.</p>'; return; }
    el.innerHTML = done.map(d =>
      `<div class="fc-gen-option" onclick="doGenFlashcards(${d.id},'${esc(d.name)}')">
        <strong>${esc(d.name)}</strong><span>Click to generate flashcards</span>
      </div>`
    ).join('');
  });
};

window.genFlashcardsFromDoc = function(id, name) {
  closeModal();
  doGenFlashcards(id, name);
};

/* ── DOCUMENT SUMMARIZER ─────────────────────────────────────────────────── */
(function() {
  let _sumRawText = '';  // keep for "Save as Note"
  let _sumDocName = '';

  function openSummarizer(docName) {
    _sumDocName = docName;
    $('summarizerTitle').textContent = 'Document Summary';
    $('summarizerSubtitle').textContent = docName;
    $('summarizerLoading').style.display = 'flex';
    $('summarizerContent').style.display = 'none';
    $('summarizerSaveBtn').style.display = 'none';
    $('summarizerOverlay').style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeSummarizer() {
    $('summarizerOverlay').style.display = 'none';
    document.body.style.overflow = '';
  }

  $('summarizerClose').onclick = closeSummarizer;
  $('summarizerOverlay').onclick = e => { if (e.target === $('summarizerOverlay')) closeSummarizer(); };

  // Parse structured JSON from AI response (robust fallback)
  function parseAISummary(raw) {
    // Try direct JSON parse first
    const jsonMatch = raw.match(/```json\s*([\s\S]*?)```/) || raw.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[1]); } catch {}
    }
    // Return null so we fall back to plain render
    return null;
  }

  function renderSummary(data, rawFallback) {
    const el = $('summarizerContent');
    if (!data) {
      // Plain-text fallback — wrap lines in simple list items
      const lines = rawFallback.split('\n').filter(l => l.trim());
      el.innerHTML = `<div class="sum-section">
        <div class="sum-section-title"><span class="sum-pill" style="background:var(--brand)"></span>Summary</div>
        <ul class="sum-list">${lines.map(l => `<li>${esc(l.replace(/^[-•*]\s*/,''))}</li>`).join('')}</ul>
      </div>`;
      return;
    }

    let html = '';

    // Key concepts
    if (data.key_concepts?.length) {
      html += `<div class="sum-section">
        <div class="sum-section-title"><span class="sum-pill" style="background:#6366f1"></span>Key Concepts</div>
        <ul class="sum-list">${data.key_concepts.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
      </div>`;
    }

    // Clinical pearls
    if (data.clinical_pearls?.length) {
      html += `<div class="sum-section">
        <div class="sum-section-title"><span class="sum-pill" style="background:#fbbf24"></span>Clinical Pearls</div>
        <ul class="sum-list">${data.clinical_pearls.map(p => `<li class="sum-pearl-item">${esc(p)}</li>`).join('')}</ul>
      </div>`;
    }

    // High-yield facts
    if (data.high_yield_facts?.length) {
      html += `<div class="sum-section">
        <div class="sum-section-title"><span class="sum-pill" style="background:#f87171"></span>High-Yield Facts</div>
        <ul class="sum-list">${data.high_yield_facts.map(f => `<li class="sum-hiyield-item">${esc(f)}</li>`).join('')}</ul>
      </div>`;
    }

    // Key terms / definitions
    if (data.key_terms?.length) {
      html += `<div class="sum-section">
        <div class="sum-section-title"><span class="sum-pill" style="background:#34d399"></span>Key Terms</div>
        <div class="sum-term-grid">${data.key_terms.map(t =>
          `<div class="sum-term-card"><div class="sum-term-name">${esc(t.term)}</div><div class="sum-term-def">${esc(t.definition)}</div></div>`
        ).join('')}</div>
      </div>`;
    }

    // One-sentence overview at top if present
    if (data.overview) {
      html = `<div class="sum-section">
        <div class="sum-section-title"><span class="sum-pill" style="background:var(--brand)"></span>Overview</div>
        <ul class="sum-list"><li>${esc(data.overview)}</li></ul>
      </div>` + html;
    }

    el.innerHTML = html || `<p class="empty-state">No structured content returned.</p>`;
  }

  function buildNoteText(data, rawFallback, docName) {
    if (!data) return `# Summary: ${docName}\n\n${rawFallback}`;
    const lines = [`# Summary: ${docName}\n`];
    if (data.overview) lines.push(`**Overview:** ${data.overview}\n`);
    if (data.key_concepts?.length) {
      lines.push('## Key Concepts');
      data.key_concepts.forEach(c => lines.push(`- ${c}`));
      lines.push('');
    }
    if (data.clinical_pearls?.length) {
      lines.push('## Clinical Pearls');
      data.clinical_pearls.forEach(p => lines.push(`- ${p}`));
      lines.push('');
    }
    if (data.high_yield_facts?.length) {
      lines.push('## High-Yield Facts');
      data.high_yield_facts.forEach(f => lines.push(`- ${f}`));
      lines.push('');
    }
    if (data.key_terms?.length) {
      lines.push('## Key Terms');
      data.key_terms.forEach(t => lines.push(`- **${t.term}**: ${t.definition}`));
    }
    return lines.join('\n');
  }

  window.summarizeDoc = async function(docId, docName) {
    openSummarizer(docName);
    _sumRawText = '';

    try {
      // 1. Fetch document text
      const { text } = await api('GET', `/api/study/documents/${docId}/text`);
      if (!text || !text.trim()) throw new Error('Document has no extractable text.');

      // Trim to ~6000 chars so we stay within context limits
      const snippet = text.length > 6000 ? text.slice(0, 6000) + '\n\n[...document continues...]' : text;

      // 2. Ask AI to produce structured summary
      const prompt = `You are a medical education assistant. Read the following document excerpt and produce a structured JSON summary.

Return ONLY a valid JSON object (no markdown fences, no explanation outside the JSON) with this exact shape:
{
  "overview": "one concise sentence describing the document",
  "key_concepts": ["concept 1", "concept 2", ...],
  "clinical_pearls": ["pearl 1", "pearl 2", ...],
  "high_yield_facts": ["fact 1", "fact 2", ...],
  "key_terms": [{"term": "Name", "definition": "Brief definition"}, ...]
}

Rules:
- key_concepts: 5–8 items, each a single sentence
- clinical_pearls: 3–6 actionable clinical insights
- high_yield_facts: 3–6 board-exam-relevant facts (numbers, associations, mnemonics)
- key_terms: 4–8 important terms with clear definitions
- Keep every item concise (≤ 25 words)

DOCUMENT:
${snippet}`;

      const { reply } = await api('POST', '/api/ai/chat', { messages: [{ role: 'user', content: prompt }] });
      const raw = reply || '';
      _sumRawText = raw;

      let parsed = null;
      // Try to extract JSON from the response
      const jsonBlock = raw.match(/```json\s*([\s\S]*?)```/) || raw.match(/```\s*([\s\S]*?)```/);
      if (jsonBlock) { try { parsed = JSON.parse(jsonBlock[1]); } catch {} }
      if (!parsed) { try { parsed = JSON.parse(raw.trim()); } catch {} }
      // Try to find a JSON object anywhere in the response
      if (!parsed) {
        const m = raw.match(/\{[\s\S]*\}/);
        if (m) { try { parsed = JSON.parse(m[0]); } catch {} }
      }

      // Render
      $('summarizerLoading').style.display = 'none';
      $('summarizerContent').style.display = 'block';
      renderSummary(parsed, raw);

      // Wire up Save as Note
      const noteBody = buildNoteText(parsed, raw, docName);
      $('summarizerSaveBtn').style.display = '';
      $('summarizerSaveBtn').onclick = async () => {
        try {
          await api('POST', '/api/study/notes', { title: `Summary: ${docName}`, body: noteBody, color: '#6366f1' });
          toast('Summary saved as note! 📋', 'success');
          $('summarizerSaveBtn').textContent = '✓ Saved';
          $('summarizerSaveBtn').disabled = true;
        } catch { toast('Could not save note.', 'error'); }
      };

    } catch (err) {
      $('summarizerLoading').style.display = 'none';
      $('summarizerContent').style.display = 'block';
      $('summarizerContent').innerHTML = `<p class="empty-state" style="color:#f87171">⚠ ${esc(err.message || 'Failed to generate summary.')}</p>`;
    }
  };
})();

window.doGenFlashcards = async function(docId, docName) {
  closeModal();
  toast(`Generating flashcards from "${docName}"…`, 'info');
  try {
    const { text } = await api('GET', `/api/study/documents/${docId}/text`);
    const prompt = `Create 15 concise spaced-repetition flashcards from the text below.
Return ONLY a JSON array like: [{"front":"question or term","back":"answer or definition"}]
No markdown, no extra text.

TEXT:
${text.slice(0, 10000)}`;
    const { reply } = await api('POST', '/api/ai/chat', { messages: [{ role: 'user', content: prompt }] });
    const cleanedReply = reply.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const jsonStr = cleanedReply.match(/\[[\s\S]*\]/)?.[0];
    if (!jsonStr) throw new Error('AI returned invalid JSON. Try again.');
    const cards = JSON.parse(jsonStr);
    if (!Array.isArray(cards)) throw new Error('AI returned invalid JSON. Try again.');
    await api('POST', `/api/study/flashcards/${docId}`, { cards });
    toast(`${cards.length} flashcards generated!`, 'success');
    if (currentView === 'flashcards') await loadFlashcards();
    refreshXP();
  } catch (err) { toast(err.message || 'Failed to generate flashcards.', 'error'); }
};

/* ── ANALYTICS ───────────────────────────────────────────────────────────── */
async function loadAnalytics() {
  try {
    const [analyticsData, activityData] = await Promise.all([
      api('GET', '/api/study/analytics'),
      api('GET', '/api/study/activity'),
    ]);

    drawScoreChart(analyticsData.scores || []);
    drawHeatmap(activityData.activity || {});
    renderWeakSpots($('analyticsWeakSpots'), analyticsData.weakSpots || []);
    renderAchievements($('achievementsList'), analyticsData.achievements || []);
  } catch (err) { console.error('analytics', err); }
}

function drawScoreChart(scores) {
  const canvas = $('scoreTrendChart');
  if (!canvas || !scores.length) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 600;
  const H = 140;
  canvas.width = W * devicePixelRatio;
  canvas.height = H * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);

  const pad = { t: 16, r: 20, b: 28, l: 40 };
  const w = W - pad.l - pad.r;
  const h = H - pad.t - pad.b;
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const textColor = isDark ? '#64748b' : '#94a3b8';
  const gridColor = isDark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)';

  ctx.clearRect(0, 0, W, H);

  const n = scores.length;
  const xs = (i) => pad.l + (i / Math.max(n - 1, 1)) * w;
  const ys = (v) => pad.t + h - (v / 100) * h;

  // Grid lines
  [0, 25, 50, 75, 100].forEach(v => {
    const y = ys(v);
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + w, y);
    ctx.strokeStyle = gridColor; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = textColor; ctx.font = '10px Inter,sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(v + '%', pad.l - 6, y + 4);
  });

  if (n > 0) {
    // Gradient fill
    const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + h);
    grad.addColorStop(0, 'rgba(99,102,241,.3)');
    grad.addColorStop(1, 'rgba(99,102,241,.01)');
    ctx.beginPath();
    ctx.moveTo(xs(0), ys(scores[0].score));
    for (let i = 1; i < n; i++) ctx.lineTo(xs(i), ys(scores[i].score));
    ctx.lineTo(xs(n - 1), pad.t + h);
    ctx.lineTo(xs(0), pad.t + h);
    ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(xs(0), ys(scores[0].score));
    for (let i = 1; i < n; i++) ctx.lineTo(xs(i), ys(scores[i].score));
    ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
    ctx.stroke();

    // Dots + labels
    scores.forEach((s, i) => {
      ctx.beginPath();
      ctx.arc(xs(i), ys(s.score), 4, 0, Math.PI * 2);
      ctx.fillStyle = '#6366f1'; ctx.fill();
    });

    // X-axis labels (every n/5)
    const step = Math.max(1, Math.floor(n / 5));
    ctx.fillStyle = textColor; ctx.font = '10px Inter,sans-serif'; ctx.textAlign = 'center';
    for (let i = 0; i < n; i += step) {
      ctx.fillText(scores[i].date.slice(5), xs(i), pad.t + h + 18);
    }
  }
}

function drawHeatmap(activity) {
  const el = $('activityHeatmap');
  const today = new Date();
  const cells = [];
  for (let i = 371; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const count = activity[key] || 0;
    const level = count === 0 ? 0 : count === 1 ? 1 : count <= 2 ? 2 : count <= 4 ? 3 : 4;
    cells.push(`<div class="hm-cell l${level}" title="${key}: ${count} sessions"></div>`);
  }
  el.innerHTML = `<div class="heatmap-grid">${cells.join('')}</div>`;
}

function renderAchievements(container, achievements) {
  if (!achievements.length) { container.innerHTML = '<p class="empty-state">No achievements yet.</p>'; return; }
  container.innerHTML = `<div class="achievements-list">` + achievements.map(a =>
    `<div class="achievement ${a.earned ? 'earned' : 'locked'}" title="${a.earned ? 'Earned!' : 'Not yet'}">
      <span class="achievement-icon">${a.icon}</span>
      <div>
        <div class="achievement-name">${a.name}</div>
        <div class="achievement-desc">${a.desc}</div>
      </div>
    </div>`
  ).join('') + '</div>';
}

/* ── SEARCH ──────────────────────────────────────────────────────────────── */
let _searchTimer = null;
$('searchInput').oninput = function() {
  clearTimeout(_searchTimer);
  const q = this.value.trim();
  if (!q || q.length < 2) { $('searchResults').innerHTML = ''; return; }
  _searchTimer = setTimeout(() => doSearch(q), 350);
};

async function doSearch(q) {
  try {
    const { documents, flashcards, bookmarks } = await api('GET', `/api/study/search?q=${encodeURIComponent(q)}`);
    let html = '';
    if (documents?.length) {
      html += `<div class="search-group-title">Documents</div>` +
        documents.map(d => `<div class="search-item" onclick="App.nav('library')">
          <div class="search-item-title">${esc(d.name)}</div>
          <div class="search-item-meta">${d.doc_type || 'Document'} · ${relDate(d.created_at)}</div>
        </div>`).join('');
    }
    if (flashcards?.length) {
      html += `<div class="search-group-title" style="margin-top:12px">Flashcards</div>` +
        flashcards.map(c => `<div class="search-item">
          <div class="search-item-title">${esc(c.front)}</div>
          <div class="search-item-meta">${esc(c.back)} · From: ${esc(c.document_name)}</div>
        </div>`).join('');
    }
    if (bookmarks?.length) {
      html += `<div class="search-group-title" style="margin-top:12px">Bookmarks</div>` +
        bookmarks.map(b => `<div class="search-item">
          <div class="search-item-title">${esc(b.stem)}</div>
          <div class="search-item-meta">Answer: ${b.correct_letter} · ${relDate(b.created_at)}</div>
        </div>`).join('');
    }
    if (!html) html = '<p class="empty-state">No results found.</p>';
    $('searchResults').innerHTML = html;
  } catch {}
}

/* ── FOCUS ROOM ──────────────────────────────────────────────────────────── */
let _pomoTimer = null;
let _pomoRunning = false;
let _pomoSeconds = 25 * 60;
let _pomoPhase = 'work'; // 'work' | 'break'
let _pomoSessionStart = null;

function loadFocus() {
  updatePomoDisplay();
  loadFocusStats();
}

function updatePomoDisplay() {
  const m = Math.floor(_pomoSeconds / 60);
  const s = _pomoSeconds % 60;
  $('pomoDisplay').textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  $('pomoPhase').textContent = _pomoPhase === 'work' ? 'Work' : 'Break';
}

$('pomoStartBtn').onclick = () => {
  if (_pomoRunning) {
    clearInterval(_pomoTimer); _pomoRunning = false;
    $('pomoStartBtn').textContent = 'Resume';
  } else {
    if (!_pomoSessionStart) _pomoSessionStart = Date.now();
    _pomoRunning = true;
    $('pomoStartBtn').textContent = 'Pause';
    _pomoTimer = setInterval(() => {
      _pomoSeconds--;
      updatePomoDisplay();
      if (_pomoSeconds <= 0) {
        clearInterval(_pomoTimer); _pomoRunning = false;
        if (_pomoPhase === 'work') {
          const dur = Number($('pomoWork').value) || 25;
          const subject = $('pomoSubject').value.trim();
          api('POST', '/api/study/focus-sessions', { durationMins: dur, subject, completed: true }).catch(() => {});
          refreshXP();
          toast('Work session done! Take a break 🎉', 'success');
          _pomoPhase = 'break';
          _pomoSeconds = (Number($('pomoBreak').value) || 5) * 60;
        } else {
          toast('Break over — back to work!', 'info');
          _pomoPhase = 'work';
          _pomoSeconds = (Number($('pomoWork').value) || 25) * 60;
        }
        _pomoSessionStart = null;
        $('pomoStartBtn').textContent = 'Start';
        updatePomoDisplay();
        loadFocusStats();
      }
    }, 1000);
  }
};

$('pomoResetBtn').onclick = () => {
  clearInterval(_pomoTimer); _pomoRunning = false; _pomoSessionStart = null;
  _pomoPhase = 'work';
  _pomoSeconds = (Number($('pomoWork').value) || 25) * 60;
  $('pomoStartBtn').textContent = 'Start';
  updatePomoDisplay();
};

$('pomoWork').onchange = () => {
  if (!_pomoRunning && _pomoPhase === 'work') {
    _pomoSeconds = (Number($('pomoWork').value) || 25) * 60;
    updatePomoDisplay();
  }
};
$('pomoBreak').onchange = () => {
  if (!_pomoRunning && _pomoPhase === 'break') {
    _pomoSeconds = (Number($('pomoBreak').value) || 5) * 60;
    updatePomoDisplay();
  }
};

async function loadFocusStats() {
  try {
    const s = await api('GET', '/api/study/focus-sessions');
    $('pomoStats').textContent = `${s.sessions} sessions · ${s.totalMins}min total · ${s.todayMins}min today`;
  } catch {}
}

/* ── NOTES ───────────────────────────────────────────────────────────────── */
let _notes = [];

async function loadNotes() {
  try {
    const { notes } = await api('GET', '/api/study/notes');
    _notes = notes || [];
    renderNoteGrid();
  } catch {}
}

function renderNoteGrid() {
  const el = $('notesGrid');
  if (!_notes.length) { el.innerHTML = '<p class="empty-state" style="grid-column:1/-1">No notes yet. Create one!</p>'; return; }
  el.innerHTML = _notes.map(n =>
    `<div class="note-card note-color-${n.color}" onclick="openNote(${n.id})">
      ${n.pinned ? '<div class="note-card-pin">📌</div>' : ''}
      <div class="note-card-title">${esc(n.title)}</div>
      <div class="note-card-body">${esc(n.body)}</div>
      <div class="note-card-meta">${relDate(n.updated_at)}</div>
    </div>`
  ).join('');
}

$('newNoteBtn').onclick = () => openNoteEditor(null);

window.openNote = function(id) {
  const note = _notes.find(n => n.id === id);
  if (note) openNoteEditor(note);
};

function openNoteEditor(note) {
  const colors = ['violet','blue','green','amber','red'];
  let cur = note?.color || 'violet';
  openModal(note ? 'Edit Note' : 'New Note', `
    <div class="note-editor">
      <input id="neTitle" class="note-editor-title form-input" placeholder="Title…" value="${esc(note?.title || '')}" style="font-size:16px;font-weight:600"/>
      <div class="note-editor-colors" style="margin:6px 0">
        ${colors.map(c => `<button class="note-color-btn ${c === cur ? 'active' : ''}" data-c="${c}" style="background:var(--${c === 'violet' ? 'brand' : c === 'blue' ? 'brand-hi' : c})"></button>`).join('')}
      </div>
      <textarea id="neBody" class="note-editor-body form-input" placeholder="Write your note…" style="min-height:180px;resize:vertical">${esc(note?.body || '')}</textarea>
      <div style="display:flex;gap:8px;margin-top:8px">
        ${note ? `<button class="btn-danger" onclick="deleteNoteById(${note.id})">Delete</button>` : ''}
        ${note ? `<button class="btn-secondary" onclick="togglePin(${note.id})">${note.pinned ? 'Unpin' : 'Pin'}</button>` : ''}
        <button class="btn-primary" style="margin-left:auto" onclick="saveNote(${note?.id || 'null'})">Save</button>
      </div>
    </div>
  `);

  // Color picker logic
  qsa('.note-color-btn').forEach(b => {
    b.onclick = function() {
      qsa('.note-color-btn').forEach(x => x.classList.remove('active'));
      this.classList.add('active');
      cur = this.dataset.c;
    };
  });

  window.saveNote = async function(id) {
    const title = $('neTitle').value.trim() || 'Untitled';
    const body  = $('neBody').value;
    try {
      if (id) await api('PATCH', `/api/study/notes/${id}`, { title, body, color: cur });
      else await api('POST', '/api/study/notes', { title, body, color: cur });
      toast('Note saved!', 'success');
      closeModal();
      await loadNotes();
    } catch (err) { toast(err.message, 'error'); }
  };
  window.deleteNoteById = async function(id) {
    if (!confirm('Delete this note?')) return;
    await api('DELETE', `/api/study/notes/${id}`).catch(e => toast(e.message, 'error'));
    closeModal(); await loadNotes();
  };
  window.togglePin = async function(id) {
    const n = _notes.find(x => x.id === id);
    await api('PATCH', `/api/study/notes/${id}`, { pinned: !n?.pinned }).catch(e => toast(e.message, 'error'));
    closeModal(); await loadNotes();
  };
}

/* ── BOOKMARKS ───────────────────────────────────────────────────────────── */
async function loadBookmarks() {
  try {
    const { bookmarks } = await api('GET', '/api/study/bookmarks');
    const el = $('bookmarksList');
    if (!bookmarks?.length) { el.innerHTML = '<p class="empty-state">No bookmarks yet. Bookmark questions while studying.</p>'; return; }
    el.innerHTML = bookmarks.map(b =>
      `<div class="bookmark-item">
        <div class="bookmark-stem">${esc(b.stem)}</div>
        <div class="bookmark-meta">
          ${b.correct_letter ? `<span>Answer: ${b.correct_letter}</span>` : ''}
          ${b.explanation ? `<span>${esc(b.explanation.slice(0, 80))}…</span>` : ''}
          <span>${relDate(b.created_at)}</span>
          <button class="bookmark-del" onclick="deleteBookmark(${b.id})">🗑</button>
        </div>
      </div>`
    ).join('');
  } catch {}
}

window.deleteBookmark = async function(id) {
  await api('DELETE', `/api/study/bookmarks/${id}`).catch(e => toast(e.message, 'error'));
  await loadBookmarks();
};

/* ── HISTORY ─────────────────────────────────────────────────────────────── */
async function loadHistory() {
  try {
    const { runs } = await api('GET', '/api/study/runs');
    const el = $('historyList');
    if (!runs?.length) { el.innerHTML = '<p class="empty-state">No study history yet.</p>'; return; }
    el.innerHTML = runs.map(r => {
      const pct = r.total_questions > 0 ? Math.round((r.answered_count / r.total_questions) * 100) : 0;
      return `<div class="history-item">
        <div class="history-doc">${esc(r.document_name)}</div>
        <div class="history-meta">
          <span>${pct}% · ${r.answered_count}/${r.total_questions} correct</span>
          <span>${relDate(r.created_at)}</span>
          ${r.note ? `<span style="font-style:italic">${esc(r.note.slice(0,60))}</span>` : ''}
          <button class="bookmark-del" onclick="deleteRun(${r.id})" style="margin-left:auto">🗑</button>
        </div>
      </div>`;
    }).join('');
  } catch {}
}

window.deleteRun = async function(id) {
  if (!confirm('Delete this session?')) return;
  await api('DELETE', `/api/study/runs/${id}`).catch(e => toast(e.message, 'error'));
  await loadHistory();
};

/* ── SETTINGS ────────────────────────────────────────────────────────────── */
async function loadSettings() {
  try {
    const { user } = await api('GET', '/api/auth/me');
    $('settingsEmail').textContent = user?.email || '';
  } catch {}
  loadGoals();
}

/* ── GOALS ───────────────────────────────────────────────────────────────── */
async function loadGoals() {
  try {
    const { goals } = await api('GET', '/api/study/goals');
    renderGoals(goals || []);
  } catch {}
}

function renderGoals(goals) {
  const el = $('goalsList');
  if (!goals.length) { el.innerHTML = '<p class="empty-state">No goals yet.</p>'; return; }
  el.innerHTML = goals.map(g =>
    `<div class="goal-item">
      <button class="goal-check ${g.completed ? 'done' : ''}" onclick="toggleGoal(${g.id},${!g.completed})">
        ${g.completed ? '✓' : ''}
      </button>
      <span class="goal-title ${g.completed ? 'done' : ''}">${esc(g.title)}</span>
      <span class="goal-date">${g.target_date}</span>
      <button class="goal-del" onclick="deleteGoalById(${g.id})">🗑</button>
    </div>`
  ).join('');
}

window.toggleGoal = async function(id, completed) {
  await api('PATCH', `/api/study/goals/${id}`, { completed }).catch(e => toast(e.message, 'error'));
  if (completed) toast('Goal completed! 🎉', 'success');
  await loadGoals();
};

window.deleteGoalById = async function(id) {
  await api('DELETE', `/api/study/goals/${id}`).catch(e => toast(e.message, 'error'));
  await loadGoals();
};

$('addGoalBtn').onclick = () => {
  openModal('New Goal', `
    <div class="form-group"><label class="form-label">Title</label><input id="gTitle" class="form-input" placeholder="e.g. Study 2 hours daily"/></div>
    <div class="form-group"><label class="form-label">Target Date</label><input id="gDate" class="form-input" type="date" value="${new Date().toISOString().slice(0,10)}"/></div>
    <button class="btn-primary w100 mt16" onclick="saveGoal()">Add Goal</button>
  `);
  window.saveGoal = async function() {
    const title = $('gTitle')?.value?.trim();
    const targetDate = $('gDate')?.value;
    if (!title) { toast('Enter a title.', 'error'); return; }
    if (!targetDate) { toast('Pick a date.', 'error'); return; }
    await api('POST', '/api/study/goals', { title, goalType: 'sessions', targetValue: 1, targetDate }).catch(e => toast(e.message, 'error'));
    closeModal(); loadGoals();
  };
};

/* ── AI PANEL ────────────────────────────────────────────────────────────── */
let _chatHistory = [];
let _attachments = [];

async function loadChatHistory() {
  try {
    const { messages } = await api('GET', '/api/study/chat-history?limit=50');
    _chatHistory = messages || [];
    const el = $('chatMessages');
    el.innerHTML = '';
    _chatHistory.forEach(m => appendChatMsg(m.role, m.content));
    scrollChat();
  } catch {}
}

function appendChatMsg(role, content) {
  const el = document.createElement('div');
  el.className = `chat-msg chat-msg-${role === 'user' ? 'user' : 'ai'}`;
  if (role === 'assistant') {
    if (typeof marked !== 'undefined' && marked.parse) {
      el.innerHTML = marked.parse(content || '', { breaks: true, gfm: true });
    } else {
      el.textContent = content || '';
    }
  } else {
    el.textContent = content || '';
  }
  $('chatMessages').appendChild(el);
  return el;
}

function scrollChat() {
  const el = $('chatMessages');
  el.scrollTop = el.scrollHeight;
}

$('aiToggleBtn').onclick = () => {
  document.body.classList.toggle('ai-open');
  if (document.body.classList.contains('ai-open')) loadChatHistory();
};
$('closePanelBtn').onclick = () => document.body.classList.remove('ai-open');

$('clearChatBtn').onclick = async () => {
  if (!confirm('Clear chat history?')) return;
  await api('DELETE', '/api/study/chat-history').catch(() => {});
  _chatHistory = [];
  $('chatMessages').innerHTML = '';
};

// Auto-resize textarea
$('chatInput').addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

$('chatInput').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
});
$('sendBtn').onclick = sendChat;

async function sendChat() {
  const input = $('chatInput');
  const text = input.value.trim();
  if (!text && !_attachments.length) return;

  const content = buildContent(text);
  input.value = ''; input.style.height = 'auto';
  $('composerAttachments').innerHTML = '';

  appendChatMsg('user', text || '[attachment]');
  scrollChat();
  _chatHistory.push({ role: 'user', content });
  _attachments = [];

  const typing = document.createElement('div');
  typing.className = 'chat-typing';
  typing.textContent = 'Thinking';
  $('chatMessages').appendChild(typing);
  scrollChat();

  $('sendBtn').disabled = true;

  try {
    const messages = _chatHistory.slice(-20);
    const { reply } = await api('POST', '/api/ai/chat', { messages });
    typing.remove();
    appendChatMsg('assistant', reply);
    _chatHistory.push({ role: 'assistant', content: reply });
    scrollChat();

    // Save to server (fire and forget)
    api('POST', '/api/study/chat-history', {
      messages: [
        { role: 'user', content },
        { role: 'assistant', content: reply },
      ]
    }).catch(() => {});
  } catch (err) {
    typing.remove();
    const errEl = appendChatMsg('assistant', '⚠ ' + (err.message || 'Error reaching AI tutor.'));
    errEl.style.color = '#ef4444';
    scrollChat();
  } finally { $('sendBtn').disabled = false; }
}

function buildContent(text) {
  if (!_attachments.length) return text;
  const parts = [];
  if (text) parts.push({ type: 'text', text });
  for (const att of _attachments) {
    if (att.type === 'image') parts.push({ type: 'image_url', image_url: { url: att.dataUrl } });
    else parts.push({ type: 'text', text: `[Attached: ${att.name}]\n${att.content}` });
  }
  return parts;
}

// File attachments
$('imgAttach').onchange = async function() {
  for (const file of this.files) {
    if (file.type.startsWith('image/')) {
      const dataUrl = await readFileAsDataUrl(file, true);
      _attachments.push({ type: 'image', name: file.name, dataUrl });
    } else if (file.name.endsWith('.pdf')) {
      const content = await extractPdfText(file);
      _attachments.push({ type: 'text', name: file.name, content: content.slice(0, 8000) });
    } else {
      const content = await readAsText(file);
      _attachments.push({ type: 'text', name: file.name, content: content.slice(0, 8000) });
    }
  }
  renderAttachChips();
  this.value = '';
};

function renderAttachChips() {
  $('composerAttachments').innerHTML = _attachments.map((a, i) =>
    `<div class="attach-chip">${a.type === 'image' ? '🖼' : '📄'} ${esc(a.name)} <button onclick="_attachments.splice(${i},1);renderAttachChips()">×</button></div>`
  ).join('');
}

function readFileAsDataUrl(file, resize = false) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onerror = () => rej(new Error(`Could not read file: ${file.name}`));
    reader.onload = e => {
      if (!resize) { res(e.target.result); return; }
      const img = new Image();
      img.onerror = () => rej(new Error(`Could not load image: ${file.name}`));
      img.onload = () => {
        const max = 800;
        let w = img.width, h = img.height;
        if (w > max || h > max) { if (w > h) { h = Math.round(h * max / w); w = max; } else { w = Math.round(w * max / h); h = max; } }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        res(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function readAsText(file) {
  return new Promise(res => {
    const r = new FileReader();
    r.onload = e => res(e.target.result || '');
    r.onerror = () => res('');
    r.readAsText(file, 'utf-8');
  });
}

/* ── STUDY PLANNER ───────────────────────────────────────────────────────── */
const PLANNER_KEY = 'mp_study_plan_v1';

function plannerLoad() { try { return JSON.parse(localStorage.getItem(PLANNER_KEY) || 'null'); } catch { return null; } }
function plannerSave(plan) { localStorage.setItem(PLANNER_KEY, JSON.stringify(plan)); }
function plannerClear() { localStorage.removeItem(PLANNER_KEY); }

function generatePlan(examName, examDate, docs, intensity) {
  const tasksPerDay = { light: 1, moderate: 2, intense: 3 }[intensity] || 2;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exam  = new Date(examDate); exam.setHours(0, 0, 0, 0);
  const totalDays = Math.max(1, Math.round((exam - today) / 86400000));

  // Build an ordered task pool
  const pool = [];
  const phase1End = Math.floor(totalDays * 0.6);
  const phase2End = Math.floor(totalDays * 0.9);

  if (docs.length === 0) return null;

  // Phase 1 — initial learning: read → quiz → flashcards for each doc
  const p1Tasks = [];
  docs.forEach(d => {
    p1Tasks.push({ type: 'read',       docName: d.name, docId: d.id, label: '📖 Study',      cls: 'task-read' });
    p1Tasks.push({ type: 'quiz',       docName: d.name, docId: d.id, label: '🎯 Quiz',       cls: 'task-quiz' });
    p1Tasks.push({ type: 'flashcards', docName: d.name, docId: d.id, label: '🃏 Flashcards', cls: 'task-flashcards' });
  });

  // Phase 2 — review: cycling quizzes + flashcards
  const p2Tasks = [];
  docs.forEach((d, i) => {
    p2Tasks.push({ type: 'review', docName: d.name, docId: d.id, label: '🔁 Review', cls: 'task-review' });
    p2Tasks.push({ type: 'quiz',   docName: d.name, docId: d.id, label: '🎯 Quiz',   cls: 'task-quiz' });
  });
  // Fill remaining phase 2 with flashcard cycling
  docs.forEach(d => {
    p2Tasks.push({ type: 'flashcards', docName: d.name, docId: d.id, label: '🃏 Flashcards', cls: 'task-flashcards' });
  });

  // Phase 3 — final sprint
  const p3Tasks = [];
  docs.forEach(d => {
    p3Tasks.push({ type: 'final', docName: d.name, docId: d.id, label: '🔥 Final Quiz',   cls: 'task-final' });
    p3Tasks.push({ type: 'final', docName: d.name, docId: d.id, label: '🃏 Flash Drill', cls: 'task-final' });
  });

  // Assign tasks to days
  const days = [];
  let p1i = 0, p2i = 0, p3i = 0;

  for (let i = 0; i < totalDays; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayOfWeek = d.getDay(); // 0=Sun
    const isLastDay = i === totalDays - 1;

    if (isLastDay) {
      days.push({ date: dateStr, tasks: [{ type: 'exam', label: '🏆 EXAM DAY', cls: 'task-exam', docName: '', docId: null }], done: false, isExam: true });
      continue;
    }

    // Rest on Sundays if plan is >= 14 days and intensity is not intense
    if (dayOfWeek === 0 && totalDays >= 14 && intensity !== 'intense') {
      days.push({ date: dateStr, tasks: [{ type: 'rest', label: '😴 Rest Day', cls: 'task-rest', docName: '', docId: null }], done: false, isRest: true });
      continue;
    }

    // Determine phase
    const tasks = [];
    const phase = i < phase1End ? 1 : i < phase2End ? 2 : 3;

    for (let t = 0; t < tasksPerDay; t++) {
      let task;
      if (phase === 1) {
        task = p1Tasks[p1i % p1Tasks.length]; p1i++;
      } else if (phase === 2) {
        task = p2Tasks[p2i % p2Tasks.length]; p2i++;
      } else {
        task = p3Tasks[p3i % p3Tasks.length]; p3i++;
      }
      // Don't push duplicate type+doc on same day
      if (!tasks.find(x => x.type === task.type && x.docId === task.docId)) tasks.push(task);
    }

    days.push({ date: dateStr, tasks, done: false });
  }

  return { examName, examDate, intensity, createdAt: today.toISOString().slice(0, 10), days };
}

async function loadPlanner() {
  const plan = plannerLoad();
  if (plan) {
    renderPlannerView(plan);
  } else {
    await loadPlannerSetup();
  }
}

async function loadPlannerSetup() {
  $('plannerSetup').style.display = 'block';
  $('plannerView').style.display = 'none';
  $('plannerResetBtn').style.display = 'none';

  // Set default exam date to 60 days from now
  const def = new Date(); def.setDate(def.getDate() + 60);
  $('plannerExamDate').value = def.toISOString().slice(0, 10);
  $('plannerExamDate').min   = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  // Intensity pills
  qsa('#plannerIntensity .pill').forEach(p => {
    p.onclick = () => { qsa('#plannerIntensity .pill').forEach(x => x.classList.remove('active')); p.classList.add('active'); };
  });

  // Load documents
  try {
    const { documents } = await api('GET', '/api/study/documents');
    const done = (documents || []).filter(d => d.status === 'done');
    const el = $('plannerDocList');
    if (!done.length) {
      el.innerHTML = '<p class="empty-state">No ready documents. Upload some in the Library first.</p>';
    } else {
      el.innerHTML = done.map(d => `
        <label class="planner-doc-item">
          <input type="checkbox" class="planner-doc-cb" data-id="${d.id}" data-name="${esc(d.name)}" checked/>
          <span class="planner-doc-item-name">${esc(d.name)}</span>
          <span class="planner-doc-item-meta">${d.doc_type || 'Document'}</span>
        </label>`).join('');
    }
  } catch { $('plannerDocList').innerHTML = '<p class="empty-state">Could not load documents.</p>'; }

  $('plannerGenerateBtn').onclick = () => {
    const examName = $('plannerExamName').value.trim() || 'My Exam';
    const examDate = $('plannerExamDate').value;
    if (!examDate) { toast('Please pick an exam date.', 'error'); return; }
    const today = new Date(); today.setHours(0,0,0,0);
    if (new Date(examDate) <= today) { toast('Exam date must be in the future.', 'error'); return; }
    const intensity = qs('#plannerIntensity .pill.active')?.dataset.intensity || 'moderate';
    const selectedDocs = [...qsa('.planner-doc-cb:checked')].map(cb => ({ id: Number(cb.dataset.id), name: cb.dataset.name }));
    if (!selectedDocs.length) { toast('Select at least one document.', 'error'); return; }

    const plan = generatePlan(examName, examDate, selectedDocs, intensity);
    if (!plan) { toast('Could not generate plan.', 'error'); return; }
    plannerSave(plan);
    renderPlannerView(plan);
    toast('Study plan created!', 'success');
  };
}

function renderPlannerView(plan) {
  $('plannerSetup').style.display = 'none';
  $('plannerView').style.display = 'block';
  $('plannerResetBtn').style.display = '';

  $('plannerResetBtn').onclick = () => {
    if (!confirm('Clear your current plan and start over?')) return;
    plannerClear();
    loadPlannerSetup();
    toast('Plan cleared.', 'info');
  };

  renderPlannerSummary(plan);
  renderPlannerCalendar(plan);
}

function renderPlannerSummary(plan) {
  const today = new Date().toISOString().slice(0, 10);
  const exam  = new Date(plan.examDate); exam.setHours(12,0,0,0);
  const daysLeft = Math.max(0, Math.round((exam - Date.now()) / 86400000));
  const studyDays = plan.days.filter(d => !d.isRest && !d.isExam);
  const doneDays  = studyDays.filter(d => d.done).length;
  const pct = studyDays.length ? Math.round((doneDays / studyDays.length) * 100) : 0;

  $('plannerSummary').innerHTML = `
    <div class="planner-exam-badge">🎓 ${esc(plan.examName)} · ${new Date(plan.examDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>
    <div class="planner-summary-chip">⏳ <span class="chip-val">${daysLeft}</span> days left</div>
    <div class="planner-summary-chip">✅ <span class="chip-val">${doneDays}/${studyDays.length}</span> days done</div>
    <div class="planner-summary-chip" style="flex:1;gap:10px;border:none;background:none;padding:0">
      <div class="planner-progress-wrap"><div class="planner-progress-fill" style="width:${pct}%"></div></div>
      <span style="font-size:12px;color:var(--text-dim);white-space:nowrap">${pct}%</span>
    </div>`;
}

const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function renderPlannerCalendar(plan) {
  const today = new Date().toISOString().slice(0, 10);
  const calEl = $('plannerCalendar');
  calEl.innerHTML = '';

  // Group days into weeks
  const weeks = [];
  let week = null;
  plan.days.forEach(day => {
    const d = new Date(day.date + 'T12:00:00');
    const dow = d.getDay(); // 0=Sun
    if (!week || dow === 0) { week = []; weeks.push(week); }
    week.push(day);
  });

  weeks.forEach((wk, wi) => {
    const firstDate = new Date(wk[0].date + 'T12:00:00');
    const lastDate  = new Date(wk[wk.length - 1].date + 'T12:00:00');
    const wLabel = `Week ${wi + 1} · ${MONTH_NAMES[firstDate.getMonth()]} ${firstDate.getDate()}${firstDate.getMonth() !== lastDate.getMonth() ? ' – ' + MONTH_NAMES[lastDate.getMonth()] + ' ' + lastDate.getDate() : ' – ' + lastDate.getDate()}`;

    const weekEl = document.createElement('div');
    weekEl.className = 'planner-week';
    weekEl.innerHTML = `<div class="planner-week-label">${wLabel}</div>`;

    const daysRow = document.createElement('div');
    daysRow.className = 'planner-week-days';

    wk.forEach(day => {
      const d = new Date(day.date + 'T12:00:00');
      const isToday  = day.date === today;
      const isPast   = day.date < today;
      const cls = ['planner-day',
        isToday          ? 'is-today'  : '',
        day.done         ? 'is-done'   : '',
        isPast && !isToday ? 'is-past' : '',
        day.isExam       ? 'is-exam'   : '',
        day.isRest       ? 'is-rest'   : '',
      ].filter(Boolean).join(' ');

      const checkmark = day.isExam ? '🏆' : day.done ? '✓' : '';
      const tasksHtml = day.tasks.map(t =>
        `<div class="planner-task ${t.cls}" title="${t.docName ? esc(t.docName) : ''}">${t.label}${t.docName ? ' · ' + esc(t.docName.slice(0, 14)) : ''}</div>`
      ).join('');

      const dayEl = document.createElement('div');
      dayEl.className = cls;
      dayEl.dataset.date = day.date;
      dayEl.innerHTML = `
        <div class="planner-day-header">
          <span class="planner-day-name">${DAY_NAMES[d.getDay()]}</span>
          <span class="planner-day-num">${d.getDate()}</span>
          <div class="planner-day-check">${checkmark}</div>
        </div>
        ${tasksHtml}`;

      if (!day.isExam) {
        dayEl.onclick = () => {
          day.done = !day.done;
          plannerSave(plan);
          renderPlannerSummary(plan);
          // Update just this cell
          dayEl.classList.toggle('is-done', day.done);
          dayEl.querySelector('.planner-day-check').textContent = day.done ? '✓' : '';
          if (day.done) toast('Day marked complete! 🎉', 'success');
        };
      }
      daysRow.appendChild(dayEl);
    });

    weekEl.appendChild(daysRow);
    calEl.appendChild(weekEl);
  });

  // Scroll to today's week
  const todayEl = calEl.querySelector('[data-date="' + new Date().toISOString().slice(0,10) + '"]');
  if (todayEl) setTimeout(() => todayEl.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
}

/* ── IMAGE QUESTION SOLVER ───────────────────────────────────────────────── */
let _solverInitialized = false;
let _solverImageDataUrl = null;
let _solverLastReply = '';

function initSolver() {
  if (_solverInitialized) return;
  _solverInitialized = true;

  const fileInput   = $('solverFileInput');
  const dropZone    = $('solverDropZone');
  const previewWrap = $('solverPreviewWrap');
  const previewImg  = $('solverPreview');
  const analyzeBtn  = $('solverAnalyzeBtn');
  const resultWrap  = $('solverResultWrap');
  const loadingEl   = $('solverLoading');
  const resultEl    = $('solverResult');

  function loadImage(file) {
    if (!file || !file.type.startsWith('image/')) { toast('Please choose an image file.', 'error'); return; }
    if (file.size > 5.5 * 1024 * 1024) { toast('Image is too large (max 5 MB).', 'error'); return; }
    readFileAsDataUrl(file, true).then(dataUrl => {
      _solverImageDataUrl = dataUrl;
      previewImg.src = dataUrl;
      dropZone.style.display = 'none';
      previewWrap.style.display = 'block';
      analyzeBtn.disabled = false;
      resultWrap.style.display = 'none';
      resultEl.innerHTML = '';
      _solverLastReply = '';
    }).catch(err => toast(err.message || 'Could not load image.', 'error'));
  }

  fileInput.onchange = e => { if (e.target.files[0]) loadImage(e.target.files[0]); e.target.value = ''; };

  // Drag-and-drop onto the drop zone
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer?.files?.[0];
    if (file) loadImage(file);
  });

  // Also allow drag-drop onto the whole view
  $('viewSolver').addEventListener('dragover', e => { e.preventDefault(); });
  $('viewSolver').addEventListener('drop', e => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) loadImage(file);
  });

  $('solverClearImg').onclick = () => {
    _solverImageDataUrl = null;
    previewImg.src = '';
    previewWrap.style.display = 'none';
    dropZone.style.display = 'flex';
    analyzeBtn.disabled = true;
    resultWrap.style.display = 'none';
    resultEl.innerHTML = '';
    _solverLastReply = '';
    fileInput.value = '';
  };

  // Example prompt buttons
  qsa('.solver-example-btn').forEach(btn => {
    btn.onclick = () => { $('solverPrompt').value = btn.dataset.prompt; };
  });

  analyzeBtn.onclick = async () => {
    if (!_solverImageDataUrl) { toast('Upload an image first.', 'error'); return; }
    const customPrompt = $('solverPrompt').value.trim();
    const instruction = customPrompt || 'This is a medical exam question. Identify the correct answer and provide a detailed step-by-step clinical reasoning explanation. Then confirm the answer.';

    resultWrap.style.display = 'block';
    loadingEl.style.display = 'flex';
    resultEl.innerHTML = '';
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = 'Analyzing…';

    const content = [
      { type: 'text', text: instruction },
      { type: 'image_url', image_url: { url: _solverImageDataUrl } },
    ];

    try {
      const { reply } = await api('POST', '/api/ai/chat', { messages: [{ role: 'user', content }] });
      _solverLastReply = reply;
      loadingEl.style.display = 'none';
      if (typeof marked !== 'undefined' && marked.parse) {
        resultEl.innerHTML = marked.parse(reply, { breaks: true, gfm: true });
      } else {
        resultEl.textContent = reply;
      }
      refreshXP();
    } catch (err) {
      loadingEl.style.display = 'none';
      resultEl.textContent = '⚠ ' + (err.message || 'AI analysis failed. Try again.');
      resultEl.style.color = '#ef4444';
      toast(err.message || 'Analysis failed.', 'error');
    } finally {
      analyzeBtn.disabled = false;
      analyzeBtn.textContent = '🔬 Analyze Question';
    }
  };

  $('solverCopyBtn').onclick = () => {
    if (!_solverLastReply) { toast('No result to copy yet.', 'error'); return; }
    navigator.clipboard.writeText(_solverLastReply).then(
      () => toast('Copied!', 'success'),
      () => {
        const ta = document.createElement('textarea');
        ta.value = _solverLastReply;
        ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta);
        ta.select(); document.execCommand('copy');
        ta.remove();
        toast('Copied!', 'success');
      }
    );
  };

  $('solverSaveNoteBtn').onclick = async () => {
    if (!_solverLastReply) { toast('No result to save yet.', 'error'); return; }
    try {
      await api('POST', '/api/study/notes', {
        title: 'Image solver — ' + new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        body: _solverLastReply,
        color: 'blue',
      });
      toast('Saved as note!', 'success');
    } catch (err) { toast(err.message || 'Could not save note.', 'error'); }
  };

  $('solverFollowUpBtn').onclick = () => {
    if (!_solverLastReply) { toast('No result yet — analyze an image first.', 'error'); return; }
    const input = $('chatInput');
    input.value = 'Regarding the image question you just solved: ';
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    document.body.classList.add('ai-open');
    loadChatHistory().then(() => input.focus());
    toast('AI Tutor opened — add your follow-up question', 'info', 3500);
  };
}

/* ── VOICE TO TEXT ───────────────────────────────────────────────────────── */
let _voiceRecognition = null;
let _voiceRunning = false;
let _voiceFinalText = '';
let _voiceInitialized = false;

function initVoice() {
  if (_voiceInitialized) return;
  _voiceInitialized = true;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    $('voiceSupportNote').style.display = 'block';
    $('voiceMicBtn').disabled = true;
    $('voiceMicBtn').style.opacity = '0.4';
    $('voiceMicBtn').style.cursor = 'not-allowed';
    $('voiceStatus').textContent = 'Not supported in this browser';
    return;
  }

  const micBtn   = $('voiceMicBtn');
  const statusEl = $('voiceStatus');
  const waveEl   = $('voiceWave');
  const finalEl  = $('voiceFinal');
  const interimEl = $('voiceInterim');
  const emptyEl  = $('voiceEmpty');

  function updateEmpty() {
    emptyEl.style.display = (_voiceFinalText || interimEl.textContent) ? 'none' : 'flex';
  }

  function buildRecognizer() {
    const rec = new SpeechRecognition();
    rec.continuous     = true;
    rec.interimResults = true;
    rec.lang           = $('voiceLang').value;

    rec.onstart = () => {
      _voiceRunning = true;
      micBtn.classList.add('recording');
      statusEl.textContent = 'Recording… speak now';
      statusEl.classList.add('active');
      waveEl.style.display = 'flex';
    };

    rec.onresult = e => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          _voiceFinalText += t + ' ';
        } else {
          interim += t;
        }
      }
      finalEl.textContent  = _voiceFinalText;
      interimEl.textContent = interim;
      updateEmpty();
    };

    rec.onerror = e => {
      const msg = {
        'not-allowed': 'Microphone access denied. Please allow microphone access.',
        'no-speech':   'No speech detected. Try speaking louder.',
        'network':     'Network error. Check your connection.',
        'audio-capture': 'No microphone found.',
      }[e.error] || `Error: ${e.error}`;
      toast(msg, 'error');
      stopVoice();
    };

    rec.onend = () => {
      if (_voiceRunning) {
        try { rec.start(); } catch {}
      } else {
        micBtn.classList.remove('recording');
        statusEl.textContent = 'Recording stopped';
        statusEl.classList.remove('active');
        waveEl.style.display = 'none';
      }
    };

    return rec;
  }

  function stopVoice() {
    _voiceRunning = false;
    if (_voiceRecognition) {
      try { _voiceRecognition.stop(); } catch {}
    }
    micBtn.classList.remove('recording');
    statusEl.textContent = _voiceFinalText.trim() ? 'Recording stopped' : 'Click to start recording';
    statusEl.classList.remove('active');
    waveEl.style.display = 'none';
    interimEl.textContent = '';
  }

  micBtn.onclick = () => {
    if (_voiceRunning) {
      stopVoice();
    } else {
      _voiceRecognition = buildRecognizer();
      _voiceRunning = true;
      try {
        _voiceRecognition.start();
      } catch (err) {
        toast('Could not start microphone: ' + err.message, 'error');
        _voiceRunning = false;
      }
    }
  };

  // Re-build recognizer when language changes (stop if running)
  $('voiceLang').onchange = () => {
    if (_voiceRunning) stopVoice();
  };

  $('voiceCopyBtn').onclick = () => {
    const text = _voiceFinalText.trim();
    if (!text) { toast('Nothing to copy yet.', 'error'); return; }
    navigator.clipboard.writeText(text).then(
      () => toast('Copied to clipboard!', 'success'),
      () => {
        // Fallback for browsers without clipboard API
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta);
        ta.select(); document.execCommand('copy');
        ta.remove();
        toast('Copied!', 'success');
      }
    );
  };

  $('voiceSaveNoteBtn').onclick = async () => {
    const text = _voiceFinalText.trim();
    if (!text) { toast('Nothing to save yet.', 'error'); return; }
    try {
      await api('POST', '/api/study/notes', {
        title: 'Voice note — ' + new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        body: text,
        color: 'violet',
      });
      toast('Saved as note!', 'success');
    } catch (err) { toast(err.message || 'Could not save note.', 'error'); }
  };

  $('voiceSendAiBtn').onclick = () => {
    const text = _voiceFinalText.trim();
    if (!text) { toast('Nothing to send yet.', 'error'); return; }
    const input = $('chatInput');
    input.value = text;
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    document.body.classList.add('ai-open');
    loadChatHistory().then(() => { input.focus(); });
    toast('Text sent to AI Tutor — press Enter to ask', 'info', 4000);
  };

  $('voiceClearBtn').onclick = () => {
    if (!_voiceFinalText.trim() && !interimEl.textContent) return;
    if (!confirm('Clear the transcript?')) return;
    if (_voiceRunning) stopVoice();
    _voiceFinalText = '';
    finalEl.textContent  = '';
    interimEl.textContent = '';
    updateEmpty();
    statusEl.textContent = 'Click to start recording';
    statusEl.classList.remove('active');
  };

  updateEmpty();
}

/* ── Keyboard shortcuts ──────────────────────────────────────────────────── */
let _ksBuffer = '';
let _ksTimer = null;
document.addEventListener('keydown', e => {
  const tag = e.target.tagName;
  if (['INPUT','TEXTAREA','SELECT'].includes(tag) || e.target.isContentEditable) return;

  _ksBuffer += e.key.toLowerCase();
  clearTimeout(_ksTimer);
  _ksTimer = setTimeout(() => { _ksBuffer = ''; }, 1000);

  const shortcuts = {
    'gd': 'dashboard', 'gl': 'library',   'gs': 'study',
    'gf': 'flashcards','ga': 'analytics', 'gx': 'focus',
    'gn': 'notes',     'gb': 'bookmarks', 'gh': 'history',
    'gv': 'voice',     'gi': 'solver',    'gp': 'planner',
  };

  if (shortcuts[_ksBuffer]) { App.nav(shortcuts[_ksBuffer]); _ksBuffer = ''; return; }

  if (_ksBuffer.endsWith('c')) {
    document.body.classList.toggle('ai-open');
    if (document.body.classList.contains('ai-open')) loadChatHistory();
    _ksBuffer = ''; return;
  }
  if (_ksBuffer.endsWith('?')) { showKeyboardHelp(); _ksBuffer = ''; }
});

function showKeyboardHelp() {
  openModal('Keyboard Shortcuts', `
    <table style="font-size:13px;border-collapse:collapse;width:100%">
      <thead><tr><th style="text-align:left;padding:6px 0;color:var(--text-dim)">Key</th><th style="text-align:left;padding:6px 0;color:var(--text-dim)">Action</th></tr></thead>
      <tbody>
        ${[['g → d','Dashboard'],['g → l','Library'],['g → s','Study'],['g → f','Flashcards'],
           ['g → a','Analytics'],['g → x','Focus Room'],['g → n','Notes'],['g → b','Bookmarks'],
           ['g → h','History'],['g → v','Voice to Text'],['g → i','Image Solver'],['g → p','Study Planner'],['c','Toggle AI Tutor'],['?','Show shortcuts']].map(([k,v]) =>
          `<tr><td style="padding:5px 16px 5px 0;font-family:var(--font-mono);font-size:12px;color:var(--brand-hi)">${k}</td><td>${v}</td></tr>`
        ).join('')}
      </tbody>
    </table>
  `);
}

/* ── Utilities ───────────────────────────────────────────────────────────── */
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatBytes(b) {
  if (!b || b < 1024) return (b || 0) + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / (1024 * 1024)).toFixed(1) + ' MB';
}

function relDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return Math.floor(diff / 60_000) + 'm ago';
  if (diff < 86_400_000) return Math.floor(diff / 3_600_000) + 'h ago';
  if (diff < 7 * 86_400_000) return Math.floor(diff / 86_400_000) + 'd ago';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ── AUDIO FILE TRANSCRIPTION ────────────────────────────────────────────── */
(function initAudioTranscribe() {
  const dropZone    = $('audioDropZone');
  const fileInput   = $('audioFileInput');
  const browseLink  = $('audioDropBrowse');
  const fileChosen  = $('audioFileChosen');
  const fileName    = $('audioFileName');
  const fileSize    = $('audioFileSize');
  const removeBtn   = $('audioRemoveBtn');
  const transcribeBtn = $('audioTranscribeBtn');
  const progressEl  = $('audioProgress');
  const progressMsg = $('audioProgressMsg');
  const transcriptSection = $('audioTranscriptSection');
  const transcriptText    = $('audioTranscriptText');

  let _file = null;
  const MAX_BYTES = 25 * 1024 * 1024;

  function setFile(f) {
    if (!f) { clearFile(); return; }
    if (f.size > MAX_BYTES) { toast('File too large — max 25 MB.', 'error'); return; }
    _file = f;
    fileName.textContent = f.name;
    fileSize.textContent = formatBytes(f.size);
    fileChosen.style.display = 'flex';
    dropZone.style.display = 'none';
    transcribeBtn.disabled = false;
  }

  function clearFile() {
    _file = null;
    fileInput.value = '';
    fileChosen.style.display = 'none';
    dropZone.style.display = 'block';
    transcribeBtn.disabled = true;
  }

  browseLink.onclick = (e) => { e.stopPropagation(); fileInput.click(); };
  dropZone.onclick   = () => fileInput.click();
  fileInput.onchange = () => setFile(fileInput.files[0]);
  removeBtn.onclick  = clearFile;

  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  });

  transcribeBtn.onclick = async () => {
    if (!_file) return;
    transcribeBtn.disabled = true;
    progressEl.style.display = 'flex';
    progressMsg.textContent = 'Uploading & transcribing… this may take a moment';
    transcriptSection.style.display = 'none';

    try {
      const fd = new FormData();
      fd.append('audio', _file, _file.name);

      const res = await fetch('/api/ai/transcribe', {
        method: 'POST',
        body: fd,
        credentials: 'same-origin',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Transcription failed.');

      transcriptText.textContent = data.transcript || '';
      transcriptSection.style.display = 'block';
      toast('Transcription complete!', 'success');
    } catch (err) {
      toast(err.message || 'Transcription failed.', 'error');
    } finally {
      progressEl.style.display = 'none';
      transcribeBtn.disabled = !_file;
    }
  };

  $('audioCopyBtn').onclick = () => {
    const text = transcriptText.textContent.trim();
    if (!text) return;
    navigator.clipboard.writeText(text).then(
      () => toast('Copied!', 'success'),
      () => {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy');
        ta.remove(); toast('Copied!', 'success');
      }
    );
  };

  $('audioSaveNoteBtn').onclick = async () => {
    const text = transcriptText.textContent.trim();
    if (!text) return;
    try {
      await api('POST', '/api/study/notes', {
        title: 'Transcript — ' + (_file?.name || new Date().toLocaleString()),
        body: text,
        color: 'blue',
      });
      toast('Saved as note!', 'success');
    } catch (err) { toast(err.message || 'Could not save.', 'error'); }
  };

  $('audioSendAiBtn').onclick = () => {
    const text = transcriptText.textContent.trim();
    if (!text) return;
    const input = $('chatInput');
    input.value = text;
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    document.body.classList.add('ai-open');
    loadChatHistory().then(() => input.focus());
    toast('Transcript sent to AI Tutor — press Enter to ask', 'info', 4000);
  };

  $('audioSaveDocBtn').onclick = async () => {
    const text = transcriptText.textContent.trim();
    if (!text) return;
    try {
      const { document: doc } = await api('POST', '/api/study/documents', {
        name: 'Transcript — ' + (_file?.name || new Date().toLocaleString()),
        textContent: text,
        mimeType: 'text/plain',
      });
      await api('PATCH', `/api/study/documents/${doc.id}`, { status: 'done' });
      toast('Saved to Library! You can now generate quizzes from it.', 'success', 4000);
    } catch (err) { toast(err.message || 'Could not save.', 'error'); }
  };

  $('audioClearTranscriptBtn').onclick = () => {
    if (!transcriptText.textContent.trim() || !confirm('Clear the transcript?')) return;
    transcriptText.textContent = '';
    transcriptSection.style.display = 'none';
  };
})();

/* ── PWA Service Worker ──────────────────────────────────────────────────── */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

/* ── Boot ────────────────────────────────────────────────────────────────── */
(async function boot() {
  // Verify session
  try {
    const { authenticated, user } = await api('GET', '/api/auth/me');
    if (!authenticated) { location.href = '/login.html'; return; }
    // Pre-warm XP display
    if (user) {}
  } catch { return; }

  // Restore last view or default to dashboard
  const hash = location.hash.replace('#', '') || '';
  const startView = VIEW_TITLES[hash] ? hash : 'dashboard';
  App.nav(startView);
})();
