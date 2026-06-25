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
  bookmarks: 'Bookmarks', history: 'History', settings: 'Settings',
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
        <button class="btn-secondary doc-card-btn" onclick="deleteDoc(${doc.id})" style="margin-left:auto;color:#ef4444">🗑</button>
      </div>
    </div>`;
  }).join('');
}

$('fileUpload').onchange = async function() {
  const files = [...this.files];
  if (!files.length) return;
  const prog = $('uploadProgress');
  const bar  = $('uploadBar');
  const status = $('uploadStatus');
  prog.style.display = 'block';
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    bar.style.width = Math.round(((i) / files.length) * 100) + '%';
    status.textContent = `Processing ${f.name}…`;
    try {
      const text = await extractText(f);
      await api('POST', '/api/study/documents', {
        name: f.name,
        sizeBytes: f.size,
        mimeType: f.type || 'text/plain',
        textContent: text,
      });
      await api('PATCH', '/api/study/documents/' + ((await api('GET', '/api/study/documents')).documents[0]?.id), { status: 'done' });
    } catch (err) { toast(err.message || `Failed: ${f.name}`, 'error'); }
  }
  bar.style.width = '100%';
  status.textContent = 'Done!';
  setTimeout(() => { prog.style.display = 'none'; bar.style.width = '0%'; }, 2000);
  this.value = '';
  await loadLibrary();
};

// Smarter upload: extract text, then create + immediately patch to 'done'
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

window.startQuizFromDoc = function(id, name) {
  App.nav('study');
  setTimeout(() => {
    const sel = $('studyDocSel');
    if (sel) sel.value = String(id);
  }, 100);
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
      const jsonStr = reply.match(/\[[\s\S]*\]/)?.[0];
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
    const jsonStr = reply.match(/\[[\s\S]*\]/)?.[0];
    const cards = JSON.parse(jsonStr);
    if (!Array.isArray(cards)) throw new Error('Invalid JSON');
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
        ${colors.map(c => `<button class="note-color-btn ${c === cur ? 'active' : ''}" data-c="${c}" style="background:var(--${c === 'violet' ? 'brand' : c === 'blue' ? 'brand-hi' : c})" onclick="this.parentNode.querySelectorAll('.note-color-btn').forEach(b=>b.classList.remove('active'));this.classList.add('active');this.dataset.selected='1'"></button>`).join('')}
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
  return new Promise(res => {
    const reader = new FileReader();
    reader.onload = e => {
      if (!resize) { res(e.target.result); return; }
      const img = new Image();
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
    'gn': 'notes',     'gb': 'bookmarks',  'gh': 'history',
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
           ['g → h','History'],['c','Toggle AI Tutor'],['?','Show shortcuts']].map(([k,v]) =>
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
