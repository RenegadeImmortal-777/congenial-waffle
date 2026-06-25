'use strict';

// ── DOM refs ──────────────────────────────────────────────────────────
// Chat log & empty state live inside the Companion panel
const chatLog = document.getElementById('companionChatLog');
const emptyState = document.getElementById('companionEmpty');
const composer = document.getElementById('composer');
const input = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const userEmailEl = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');
const attachBtn = document.getElementById('attachBtn');
const fileInput = document.getElementById('fileInput');
const attachmentsRow = document.getElementById('attachmentsRow');
const batchStatus = document.getElementById('batchStatus');
const batchStatusText = document.getElementById('batchStatusText');
const batchProgressFill = document.getElementById('batchProgressFill');
const batchCancelBtn = document.getElementById('batchCancelBtn');
const uploadProgressWrap = document.getElementById('uploadProgressWrap');
const uploadProgressLabel = document.getElementById('uploadProgressLabel');
const uploadProgressFill = document.getElementById('uploadProgressFill');
const solveAllBtn = document.getElementById('solveAllBtn');
const verifyToggle = document.getElementById('verifyToggle');
const verifyToggleLabel = document.getElementById('verifyToggleLabel');
// Sidebar + views
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarAvatar = document.getElementById('sidebarAvatar');
// Library
const docGrid = document.getElementById('docGrid');
const libraryEmpty = document.getElementById('libraryEmpty');
const uploadDocBtn = document.getElementById('uploadDocBtn');
const uploadDocBtn2 = document.getElementById('uploadDocBtn2');
const docFileInput = document.getElementById('docFileInput');
const docProcessOverlay = document.getElementById('docProcessOverlay');
const docProcessTitle = document.getElementById('docProcessTitle');
const docProcessSub = document.getElementById('docProcessSub');
const docProcessFill = document.getElementById('docProcessFill');
const docProcessBar = document.getElementById('docProcessBar');
const docProcessIcon = document.getElementById('docProcessIcon');
const docProcessError = document.getElementById('docProcessError');
const docProcessActions = document.getElementById('docProcessActions');
const docProcessRetryBtn = document.getElementById('docProcessRetryBtn');
const docProcessCloseBtn = document.getElementById('docProcessCloseBtn');
const docBadge = document.getElementById('docBadge');
// History + Assessment (inline views)
const historyListMain = document.getElementById('historyListMain');
const historyDetailMain = document.getElementById('historyDetailMain');
const historySearchInput = document.getElementById('historySearchInput');
const historyStatsStrip = document.getElementById('historyStatsStrip');
const librarySearchInput = document.getElementById('librarySearchInput');
const librarySortBtn = document.getElementById('librarySortBtn');
const librarySortNameBtn = document.getElementById('librarySortNameBtn');
const shortcutsOverlay = document.getElementById('shortcutsOverlay');
const assessRunList = document.getElementById('assessRunList');
const bookmarksMain = document.getElementById('bookmarksMain');
// Dashboard
const dashStatDocs = document.getElementById('dashStatDocs');
const dashStatRuns = document.getElementById('dashStatRuns');
const dashRecentRuns = document.getElementById('dashRecentRuns');
const dashGoHistory = document.getElementById('dashGoHistory');
const dashQaUpload = document.getElementById('dashQaUpload');
const dashQaAssess = document.getElementById('dashQaAssess');
const dashQaFlash = document.getElementById('dashQaFlash');
const dashQaChat = document.getElementById('dashQaChat');
// Flashcards
const flashDocSelect = document.getElementById('flashDocSelect');
const flashEmpty = document.getElementById('flashEmpty');
const flashDeckWrap = document.getElementById('flashDeckWrap');
const flashCounter = document.getElementById('flashCounter');
const flashDeckName = document.getElementById('flashDeckName');
const flashShuffleBtn = document.getElementById('flashShuffleBtn');
const flashCard = document.getElementById('flashCard');
const flashFrontText = document.getElementById('flashFrontText');
const flashBackText = document.getElementById('flashBackText');
const flashPrevBtn = document.getElementById('flashPrevBtn');
const flashNextBtn = document.getElementById('flashNextBtn');
const flashProgressFill = document.getElementById('flashProgressFill');
const flashUploadBtn = document.getElementById('flashUploadBtn');
const flashBadge = document.getElementById('flashBadge');
const flashSrsButtons = document.getElementById('flashSrsButtons');
const flashDueBadge = document.getElementById('flashDueBadge');
const flashHint = document.getElementById('flashHint');
// Companion panel
const companionOverlay = document.getElementById('companionOverlay');
const companionPanel = document.getElementById('companionPanel');
const companionOpenBtn = document.getElementById('companionOpenBtn');
const companionCloseBtn = document.getElementById('companionCloseBtn');
const companionClearBtn = document.getElementById('companionClearBtn');
const companionChatLog = document.getElementById('companionChatLog');
const companionEmpty = document.getElementById('companionEmpty');

// ── Navigation ────────────────────────────────────────────────────────
const VIEWS = {
  dashboard:    document.getElementById('viewDashboard'),
  library:      document.getElementById('viewLibrary'),
  flashcards:   document.getElementById('viewFlashcards'),
  history:      document.getElementById('viewHistory'),
  assess:       document.getElementById('viewAssess'),
  bookmarks:    document.getElementById('viewBookmarks'),
  assessSetup:  document.getElementById('viewAssessSetup'),
  assessQuiz:   document.getElementById('viewAssessQuiz'),
  assessResult: document.getElementById('viewAssessResult'),
  analytics:    document.getElementById('viewAnalytics'),
  search:       document.getElementById('viewSearch'),
  focus:        document.getElementById('viewFocus'),
  notes:        document.getElementById('viewNotes'),
};

let currentView = 'dashboard';

// ── Theme switching ──────────────────────────────────────────────────
(function initTheme() {
  const AMBIENT_COLORS = [
    { color: '#8B5CF6', hi: '#a78bfa', dim: '#7c3aed' },
    { color: '#14B8A6', hi: '#2dd4bf', dim: '#0f766e' },
    { color: '#F43F5E', hi: '#fb7185', dim: '#be123c' },
    { color: '#F59E0B', hi: '#fbbf24', dim: '#b45309' },
    { color: '#0EA5E9', hi: '#38bdf8', dim: '#0369a1' },
    { color: '#10B981', hi: '#34d399', dim: '#059669' },
    { color: '#F97316', hi: '#fb923c', dim: '#c2410c' },
    { color: '#6366F1', hi: '#818cf8', dim: '#4338ca' },
  ];

  const ambientSwatchesEl = document.getElementById('ambientSwatches');
  const themeButtons = document.querySelectorAll('.theme-btn');
  const ambientSwatches = document.querySelectorAll('.ambient-swatch');

  let savedTheme = localStorage.getItem('medpass-theme') || 'clinical';
  let savedAmbient = localStorage.getItem('medpass-ambient-color') || '#8B5CF6';

  function applyAmbientColor(color) {
    savedAmbient = color;
    localStorage.setItem('medpass-ambient-color', color);
    const data = AMBIENT_COLORS.find(c => c.color === color) || AMBIENT_COLORS[0];
    const root = document.documentElement;
    root.style.setProperty('--user-accent', data.color);
    root.style.setProperty('--user-accent-hi', data.hi);
    root.style.setProperty('--user-accent-dim', data.dim);
    ambientSwatches.forEach(s => s.classList.toggle('active', s.dataset.color === color));
  }

  function applyTheme(theme) {
    savedTheme = theme;
    localStorage.setItem('medpass-theme', theme);
    if (theme === 'clinical') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    themeButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.theme === theme));
    if (ambientSwatchesEl) {
      ambientSwatchesEl.style.display = theme === 'ambient' ? 'flex' : 'none';
    }
    if (theme === 'ambient') applyAmbientColor(savedAmbient);
  }

  themeButtons.forEach(btn => btn.addEventListener('click', () => applyTheme(btn.dataset.theme)));
  ambientSwatches.forEach(s => s.addEventListener('click', () => applyAmbientColor(s.dataset.color)));

  applyTheme(savedTheme);
})();

function switchView(name) {
  if (!VIEWS[name]) return;
  currentView = name;
  Object.entries(VIEWS).forEach(([k, el]) => {
    if (el) el.classList.toggle('active', k === name);
  });
  document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === name);
  });
  // Close mobile sidebar
  sidebar.classList.remove('open');
  // Lazy-load view data
  if (name === 'dashboard') loadDashboardView();
  if (name === 'history') loadHistoryView();
  if (name === 'assess')  loadAssessView();
  if (name === 'bookmarks') loadBookmarksView();
  if (name === 'library') loadLibraryView();
  if (name === 'flashcards') loadFlashcardsView();
  if (name === 'analytics') loadAnalyticsView();
  if (name === 'search') initSearchView();
  if (name === 'focus') loadFocusView();
  if (name === 'notes') loadNotesView();
}

document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
document.addEventListener('click', (e) => {
  if (sidebar.classList.contains('open') &&
      !sidebar.contains(e.target) && e.target !== sidebarToggle) {
    sidebar.classList.remove('open');
  }
});


if (window.pdfjsLib) {
  // Classic (non-module) pdf.js build, vendored locally under
  // public/vendor/pdfjs/ so PDF text extraction doesn't depend on a
  // third-party CDN being reachable at runtime (see public/vendor/pdfjs/README.md).
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.min.js';
}

const history = [];

// ---------------------------------------------------------------------
// Attachments
// ---------------------------------------------------------------------
const MAX_FILES = 6;
const MAX_IMAGES = 5;
const MAX_FILE_BYTES = 20 * 1024 * 1024; // reject originals bigger than this outright
const MAX_TEXT_CHARS = Infinity; // no client-side char cap — let the server/batching handle it
const MAX_IMAGE_EDGE = 1600; // px, longest side after client-side resize
const MAX_IMAGE_DATA_URL_CHARS = 3.5 * 1024 * 1024; // stay comfortably under Groq's 4MB cap

// A large text attachment sent as one message risks the per-minute token
// cap on Groq's free/on-demand tier (8000 TPM at time of writing) once the
// system prompt and reserved completion budget are added on top. Past this
// size, split the document into smaller sequential requests instead.
const BATCH_TRIGGER_CHARS = 6000;
const BATCH_CHUNK_CHARS = 4000; // larger chunks = fewer total parts = fewer pacing delays
const DEFAULT_BATCH_DELAY_MS = 2000; // pacing used when Groq doesn't return rate-limit headers
const BATCH_COMPLETION_TOKEN_RESERVE = 600; // rough headroom for system prompt + completion when checking remaining budget
const BATCH_MAX_RETRIES = 3; // max retry attempts per part on 429 / transient errors
const BATCH_RETRY_BASE_MS = 8000; // base backoff for retries (doubles each attempt)

let attachments = []; // { id, name, kind: 'text'|'image', status, text?, dataUrl?, error? }
let attachSeq = 0;

function renderAttachments() {
  attachmentsRow.innerHTML = '';
  attachmentsRow.hidden = attachments.length === 0;
  for (const att of attachments) {
    const chip = document.createElement('div');
    chip.className = `attachment-chip${att.status === 'error' ? ' is-error' : ''}`;

    const icon = document.createElement('span');
    icon.className = 'chip-icon';
    icon.textContent = att.kind === 'image' ? '🖼' : '📄';
    chip.appendChild(icon);

    const name = document.createElement('span');
    name.className = 'chip-name';
    name.textContent = att.name;
    chip.appendChild(name);

    if (att.status === 'loading') {
      const status = document.createElement('span');
      status.className = 'chip-status';
      status.textContent = '…';
      chip.appendChild(status);
    } else if (att.status === 'error') {
      const status = document.createElement('span');
      status.className = 'chip-status';
      status.textContent = att.error || 'error';
      chip.appendChild(status);
    }

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'chip-remove';
    remove.setAttribute('aria-label', `Remove ${att.name}`);
    remove.textContent = '×';
    remove.addEventListener('click', () => {
      attachments = attachments.filter((a) => a.id !== att.id);
      renderAttachments();
    });
    chip.appendChild(remove);

    attachmentsRow.appendChild(chip);
  }
  updateComposerState();
}

function countReadyImages() {
  return attachments.filter((a) => a.kind === 'image' && a.status === 'ready').length;
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsText(file);
  });
}

async function extractPdfText(file, onProgress) {
  if (!window.pdfjsLib) {
    throw new Error('PDF reader did not load (offline?).');
  }
  const buf = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
  const numPages = pdf.numPages;
  const chunks = [];
  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((it) => it.str).join(' ');
    chunks.push(text);
    if (onProgress) onProgress(i, numPages);
  }
  const joined = chunks.join('\n\n').trim();
  if (!joined) {
    throw new Error('No extractable text — likely a scanned PDF. Try a page screenshot instead.');
  }
  return joined;
}

// ---------------------------------------------------------------------
// Batching helpers (pure functions — no DOM access, so they're testable
// standalone in Node before being wired into the UI)
// ---------------------------------------------------------------------

/** Splits a single unit that's still too big on its own, on word boundaries where possible. */
/**
 * Finds the start index of every numbered question in raw text, whether or
 * not real newlines separate them. A question start is "<number>[.)]"
 * preceded by start-of-string or whitespace. This mirrors the detection
 * used by parseSourceQuestions/splitIntoQuestionParts so that chunking
 * (done BEFORE sending to the AI) and parsing (done AFTER) agree on where
 * one question ends and the next begins.
 */
function findQuestionStartIndices(text) {
  const numRe = /(?:^|\s)((?:Q\.?\s*)?\d{1,3})[.)]\s/g;
  const starts = [];
  let m;
  while ((m = numRe.exec(text))) {
    const numStart = m.index + (m[0].length - m[0].trimStart().length);
    starts.push(numStart);
  }
  return starts;
}

/**
 * Splits raw text into one unit per numbered question, regardless of
 * whether questions are separated by real newlines or run together on one
 * continuous line (the common case for text extracted from a PDF).
 */
function splitIntoQuestionUnits(text) {
  const starts = findQuestionStartIndices(text);
  if (starts.length === 0) return [text];
  const units = [];
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i];
    const end = i + 1 < starts.length ? starts[i + 1] : text.length;
    const unit = text.slice(start, end).trim();
    if (unit) units.push(unit);
  }
  // Anything before the first detected question number (e.g. a title line)
  // — keep it, prepended to the first unit, rather than silently dropping it.
  const firstStart = starts[0];
  const preamble = text.slice(0, firstStart).trim();
  if (preamble && units.length > 0) units[0] = `${preamble}\n\n${units[0]}`;
  return units.length > 0 ? units : [text];
}

function hardSplit(text, maxChars) {
  const out = [];
  let rest = text;
  while (rest.length > maxChars) {
    let cut = rest.lastIndexOf(' ', maxChars);
    if (cut < maxChars * 0.5) cut = maxChars; // no good space found — just cut
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) out.push(rest);
  return out;
}

/** Greedily packs whole units (questions/paragraphs) into chunks under maxChars. */
function groupUnits(units, maxChars) {
  const chunks = [];
  let current = '';
  for (const unit of units) {
    if (unit.length > maxChars) {
      if (current) { chunks.push(current); current = ''; }
      chunks.push(...hardSplit(unit, maxChars));
      continue;
    }
    const candidate = current ? `${current}\n\n${unit}` : unit;
    if (candidate.length > maxChars) {
      if (current) chunks.push(current);
      current = unit;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/**
 * Splits a large block of text into chunks no larger than maxChars,
 * preferring to keep whole numbered questions (e.g. "12. ..." or "Q12. ...")
 * together rather than cutting mid-question — whether questions are
 * separated by real newlines or run together on one continuous line (the
 * common case for raw text extracted from a PDF). Falls back to paragraph
 * splitting, then a hard character split, only if no question numbering is
 * detected at all.
 */
function splitIntoChunks(text, maxChars) {
  if (text.length <= maxChars) return [text];
  let units = splitIntoQuestionUnits(text);
  if (units.length <= 1) units = text.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  if (units.length <= 1) return hardSplit(text, maxChars);
  return groupUnits(units, maxChars);
}

/** Parses Groq's rate-limit reset duration strings (e.g. "7.66s", "1m2.3s") into milliseconds. */
function parseResetDurationMs(str) {
  if (!str) return null;
  const match = String(str).match(/^(?:(\d+)m)?(?:([\d.]+)s)?$/);
  if (!match || (!match[1] && !match[2])) return null;
  const minutes = match[1] ? parseInt(match[1], 10) : 0;
  const seconds = match[2] ? parseFloat(match[2]) : 0;
  return Math.round((minutes * 60 + seconds) * 1000);
}

/** Rough chars-to-tokens estimate (good enough for pacing decisions, not billing). */
function estimateRoughTokens(text) {
  return Math.ceil((text || '').length / 4);
}

const MAX_BATCH_WAIT_MS = 30_000; // never wait more than 30s between parts

/**
 * Decides how long to wait before sending the next batch.
 * Caps at MAX_BATCH_WAIT_MS so a large token-reset window never
 * stalls the batch for minutes at a time.
 */
function computeBatchWaitMs(rateLimit, nextChunkText) {
  if (!rateLimit || !Number.isFinite(rateLimit.remainingTokens)) return DEFAULT_BATCH_DELAY_MS;
  const needed = estimateRoughTokens(nextChunkText) + BATCH_COMPLETION_TOKEN_RESERVE;
  if (rateLimit.remainingTokens >= needed) return DEFAULT_BATCH_DELAY_MS;
  const resetMs = parseResetDurationMs(rateLimit.resetTokens);
  const raw = resetMs ? resetMs + 250 : DEFAULT_BATCH_DELAY_MS * 3;
  return Math.min(raw, MAX_BATCH_WAIT_MS);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------
// Upload progress bar helpers
// ---------------------------------------------------------------------
function showUploadProgress(label) {
  uploadProgressWrap.hidden = false;
  uploadProgressLabel.textContent = label || 'Reading PDF…';
  uploadProgressFill.style.width = '0%';
}

function updateUploadProgress(current, total, label) {
  uploadProgressLabel.textContent = label || `Reading page ${current} of ${total}…`;
  uploadProgressFill.style.width = `${Math.round((current / total) * 100)}%`;
}

function hideUploadProgress() {
  uploadProgressWrap.hidden = true;
  uploadProgressFill.style.width = '0%';
}

// ---------------------------------------------------------------------
// Textarea readonly + Solve All button state
// ---------------------------------------------------------------------
function updateComposerState() {
  const hasTextDoc = attachments.some((a) => a.kind === 'text' && a.status === 'ready');
  // Lock typing when a text doc is attached — user uses Solve All instead
  input.readOnly = hasTextDoc;
  input.placeholder = hasTextDoc
    ? 'Text document attached — use "Solve All & Download" or remove the doc to chat.'
    : 'Ask the tutor something…';
  solveAllBtn.hidden = !hasTextDoc;
  verifyToggleLabel.hidden = !hasTextDoc;
}

/**
 * Returns how long to wait (ms) before retrying a failed request.
 * Prefers the server-supplied retryAfter value (parsed from Groq's
 * `retry-after` header), then falls back to the rate-limit reset time,
 * then to exponential backoff.
 */
function computeRetryWaitMs(result, attempt) {
  // Server forwards Groq's retry-after as a number of seconds
  const retryAfterSec = result && result.data && Number(result.data.retryAfter);
  if (Number.isFinite(retryAfterSec) && retryAfterSec > 0) {
    return Math.min(retryAfterSec * 1000 + 500, MAX_BATCH_WAIT_MS);
  }
  // Fall back to the token reset window from rate-limit headers
  const rateLimit = result && result.data && result.data.rateLimit;
  if (rateLimit) {
    const resetMs = parseResetDurationMs(rateLimit.resetTokens || rateLimit.resetRequests);
    if (resetMs) return Math.min(resetMs + 500, MAX_BATCH_WAIT_MS);
  }
  // Exponential backoff: 8s, 16s, 32s — capped
  return Math.min(BATCH_RETRY_BASE_MS * Math.pow(2, attempt), MAX_BATCH_WAIT_MS);
}

function showBatchStatus(current, total, label) {
  batchStatus.hidden = false;
  batchStatusText.textContent = label || `Processing part ${current} of ${total}…`;
  batchProgressFill.style.width = `${Math.round(((current - 1) / total) * 100)}%`;
}

function hideBatchStatus() {
  batchStatus.hidden = true;
  batchProgressFill.style.width = '0%';
}

/** Downscales + recompresses an image client-side so it comfortably fits Groq's size cap. */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      const longest = Math.max(width, height);
      if (longest > MAX_IMAGE_EDGE) {
        const scale = MAX_IMAGE_EDGE / longest;
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      let quality = 0.85;
      const tryExport = () => {
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        if (dataUrl.length <= MAX_IMAGE_DATA_URL_CHARS || quality <= 0.4) {
          resolve(dataUrl);
        } else {
          quality -= 0.15;
          tryExport();
        }
      };
      tryExport();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image.'));
    };
    img.src = url;
  });
}

async function handleFiles(fileList) {
  const files = Array.isArray(fileList) ? fileList : Array.from(fileList || []);
  if (files.length === 0) return;

  if (attachments.length + files.length > MAX_FILES) {
    appendMessage('assistant', `You can attach up to ${MAX_FILES} files at a time.`, true);
    return;
  }

  for (const file of files) {
    const id = `att-${++attachSeq}`;
    const isImage = /^image\//.test(file.type);
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

    if (file.size > MAX_FILE_BYTES) {
      attachments.push({ id, name: file.name, kind: isImage ? 'image' : 'text', status: 'error', error: 'too large' });
      renderAttachments();
      continue;
    }
    if (isImage && countReadyImages() >= MAX_IMAGES) {
      attachments.push({ id, name: file.name, kind: 'image', status: 'error', error: `max ${MAX_IMAGES} images` });
      renderAttachments();
      continue;
    }

    const placeholder = { id, name: file.name, kind: isImage ? 'image' : 'text', status: 'loading' };
    attachments.push(placeholder);
    renderAttachments();

    try {
      if (isImage) {
        const dataUrl = await compressImage(file);
        placeholder.status = 'ready';
        placeholder.dataUrl = dataUrl;
      } else if (isPdf) {
        showUploadProgress(`Reading ${file.name}…`);
        const text = await extractPdfText(file, (cur, tot) => {
          updateUploadProgress(cur, tot, `Reading ${file.name} — page ${cur}/${tot}…`);
        });
        hideUploadProgress();
        placeholder.status = 'ready';
        placeholder.text = text;
      } else {
        const text = await readFileAsText(file);
        placeholder.status = 'ready';
        placeholder.text = text;
      }
    } catch (err) {
      hideUploadProgress();
      placeholder.status = 'error';
      placeholder.error = err.message || 'failed to read';
    }
    renderAttachments();
  }
}

attachBtn.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  fileInput.click();
});
fileInput.addEventListener('change', async () => {
  // Snapshot the FileList before clearing — some browsers lose the
  // reference once value is reset, and clearing before await can abort reads.
  const files = Array.from(fileInput.files || []);
  // Reset now so the same file can be re-selected after removal.
  // We already have the File objects in `files`, so clearing is safe.
  fileInput.value = '';
  if (files.length > 0) await handleFiles(files);
});

// Drag-and-drop onto the composer area
const composerEl = document.getElementById('composer');
composerEl.addEventListener('dragover', (e) => {
  e.preventDefault();
  composerEl.classList.add('drag-over');
});
composerEl.addEventListener('dragleave', (e) => {
  if (!composerEl.contains(e.relatedTarget)) composerEl.classList.remove('drag-over');
});
composerEl.addEventListener('drop', async (e) => {
  e.preventDefault();
  composerEl.classList.remove('drag-over');
  const files = Array.from(e.dataTransfer.files || []);
  if (files.length > 0) await handleFiles(files);
});

let batchCancelRequested = false;
batchCancelBtn.addEventListener('click', () => {
  batchCancelRequested = true;
  batchStatusText.textContent = 'Cancelling after the current part…';
});

// ---------------------------------------------------------------------
// Auth / session
// ---------------------------------------------------------------------
async function loadMe() {
  try {
    const res = await fetch('/api/auth/me', { headers: { Accept: 'application/json' } });
    if (!res.ok) { window.location.href = '/login.html'; return; }
    const data = await res.json();
    userEmailEl.textContent = data.user.email;
    if (sidebarAvatar) sidebarAvatar.textContent = data.user.email[0].toUpperCase();
  } catch {
    window.location.href = '/login.html';
  }
}
loadMe();
// Load doc badge on startup
loadLibraryView();
setupDocUpload();

logoutBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  e.stopPropagation();
  logoutBtn.disabled = true;
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch { /* ignore — redirect anyway */ } finally {
    window.location.href = '/login.html';
  }
});

// ---------------------------------------------------------------------
// History panel
// ---------------------------------------------------------------------
function formatRunDate(iso) {
  try {
    return new Date(iso + 'Z').toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch { return iso; }
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── History view ──────────────────────────────────────────────────────
let _allRuns = [];

async function loadHistoryView() {
  historyListMain.innerHTML = '<p class="history-loading">Loading…</p>';
  historyDetailMain.hidden = true;
  try {
    const res = await fetch('/api/study/runs');
    const data = await res.json();
    _allRuns = data.runs || [];
    renderHistoryStats(_allRuns);
    renderRunListMain(_allRuns);
  } catch {
    historyListMain.innerHTML = '<p class="history-empty">Could not load history.</p>';
  }
}

function renderHistoryStats(runs) {
  if (!historyStatsStrip) return;
  if (!runs.length) { historyStatsStrip.hidden = true; return; }
  const totalQ = runs.reduce((s, r) => s + (r.total_questions || 0), 0);
  const flagged = runs.reduce((s, r) => s + (r.disagreement_count || 0), 0);
  const unanswered = runs.reduce((s, r) => s + (r.unanswered_count || 0), 0);
  historyStatsStrip.hidden = false;
  historyStatsStrip.innerHTML = `
    <div class="history-stat-chip"><div><div class="history-stat-val" style="color:var(--teal)">${runs.length}</div><div class="history-stat-key">Runs</div></div></div>
    <div class="history-stat-chip"><div><div class="history-stat-val" style="color:var(--violet-hi)">${totalQ}</div><div class="history-stat-key">Questions</div></div></div>
    <div class="history-stat-chip"><div><div class="history-stat-val" style="color:var(--rose)">${flagged}</div><div class="history-stat-key">Flagged</div></div></div>
    <div class="history-stat-chip"><div><div class="history-stat-val" style="color:var(--gold)">${unanswered}</div><div class="history-stat-key">Unanswered</div></div></div>
  `;
}

if (historySearchInput) {
  historySearchInput.addEventListener('input', () => {
    const q = historySearchInput.value.toLowerCase();
    const filtered = _allRuns.filter(r => r.document_name.toLowerCase().includes(q));
    renderRunListMain(filtered);
  });
}

function renderRunListMain(runs) {
  if (!runs.length) {
    historyListMain.innerHTML = '<p class="history-empty" style="padding:20px;font-family:var(--font-display);font-style:italic;color:var(--text-faint)">No past runs yet. Use <em>Solve All</em> in the Dashboard or process a document to create runs.</p>';
    return;
  }
  historyListMain.innerHTML = runs.map(r => `
    <div class="history-run-card" data-id="${r.id}" style="cursor:pointer">
      <div class="history-run-name">${escapeHtml(r.document_name)}</div>
      <div class="history-run-meta">
        ${r.total_questions} Qs &middot;
        ${r.unanswered_count > 0 ? `<span class="badge-warn">${r.unanswered_count} unanswered</span> &middot; ` : ''}
        ${r.disagreement_count > 0 ? `<span class="badge-flag">${r.disagreement_count} flagged</span> &middot; ` : ''}
        ${formatRunDate(r.created_at)}
      </div>
      <button class="btn-ghost btn-sm history-delete-btn" data-id="${r.id}" title="Delete run" style="position:absolute;top:12px;right:10px;opacity:.25">🗑</button>
    </div>
  `).join('');
  historyListMain.querySelectorAll('.history-run-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.history-delete-btn')) return;
      loadRunDetail(Number(card.dataset.id));
    });
    card.querySelector('.history-delete-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Delete this run?')) return;
      await fetch(`/api/study/runs/${card.dataset.id}`, { method: 'DELETE' });
      loadHistoryView();
    });
    card.addEventListener('mouseenter', () => {
      const d = card.querySelector('.history-delete-btn');
      if (d) d.style.opacity = '0.75';
    });
    card.addEventListener('mouseleave', () => {
      const d = card.querySelector('.history-delete-btn');
      if (d) d.style.opacity = '0.25';
    });
  });
}

async function loadRunDetail(id) {
  historyDetailMain.hidden = false;
  historyDetailMain.innerHTML = '<p class="history-loading">Loading…</p>';
  try {
    const res = await fetch(`/api/study/runs/${id}`);
    const data = await res.json();
    renderRunDetailMain(data.run);
  } catch {
    historyDetailMain.innerHTML = '<p class="history-empty">Could not load run.</p>';
  }
}

function renderRunDetailMain(run) {
  const flagged = (run.items || []).filter(i => i.disagreement || i.isUnanswered);
  const allItems = run.items || [];
  const rows = flagged.map(item => {
    const tag = item.isUnanswered
      ? '<span class="badge-warn">Unanswered</span>'
      : `<span class="badge-flag">Flagged — <strong>${item.correctLetter.toUpperCase()}</strong> vs <strong>${item.disagreement.letter.toUpperCase()}</strong></span>`;
    return `<div class="history-item">
      <div class="history-item-num">Q${item.num} ${tag}</div>
      <div class="history-item-stem">${escapeHtml(item.stem || '(no stem)')}</div>
    </div>`;
  }).join('');
  const noteEscaped = escapeHtml(run.note || '');
  historyDetailMain.innerHTML = `
    <button class="btn-ghost btn-sm" id="historyBackBtn" style="margin-bottom:14px">← Back</button>
    <h3 class="history-detail-title">${escapeHtml(run.document_name)}</h3>
    <p class="history-detail-meta">${run.total_questions} Qs &middot; ${run.disagreement_count} flagged &middot; ${run.unanswered_count} unanswered</p>
    <div class="run-note-wrap">
      <label class="run-note-label">Notes</label>
      <textarea class="run-note-input" id="runNoteInput" rows="2" placeholder="Add a personal note…">${noteEscaped}</textarea>
      <button class="btn-ghost btn-sm" id="saveNoteBtn" style="margin-top:6px">Save note</button>
      <span class="note-saved-msg" id="noteSavedMsg" hidden>✓ Saved</span>
    </div>
    ${flagged.length === 0
      ? '<p class="history-empty" style="margin-top:14px;font-size:12px">No flagged or unanswered questions — clean run! ✓</p>'
      : `<p class="history-section-label" style="margin-top:14px">Review (${flagged.length}):</p>${rows}`}
  `;
  document.getElementById('historyBackBtn').addEventListener('click', () => {
    historyDetailMain.hidden = true;
  });
  document.getElementById('saveNoteBtn').addEventListener('click', async () => {
    const note = document.getElementById('runNoteInput').value;
    await fetch(`/api/study/runs/${run.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    const msg = document.getElementById('noteSavedMsg');
    msg.hidden = false; setTimeout(() => { msg.hidden = true; }, 2000);
  });
}

// ── Assessment view ───────────────────────────────────────────────────
async function loadAssessView() {
  assessRunList.innerHTML = '<p class="assess-picker-hint" style="color:var(--text-faint);font-style:italic">Loading runs…</p>';

  // Wire up AI generate button (once)
  const genBtn = document.getElementById('btnOpenAssessGen');
  if (genBtn && !genBtn._wired) {
    genBtn._wired = true;
    genBtn.addEventListener('click', () => {
      const topic = prompt('Topic or paste notes (leave blank for general medicine):') || 'general clinical medicine';
      openAssessSetup({ type: 'topic', topic }, 'Generate: ' + topic);
    });
  }

  try {
    const res = await fetch('/api/study/runs');
    const data = await res.json();
    renderAssessRunList(data.runs || []);
  } catch {
    assessRunList.innerHTML = '<p class="assess-picker-hint" style="color:var(--red)">Could not load runs.</p>';
  }
}

function renderAssessRunList(runs) {
  if (!runs.length) {
    assessRunList.innerHTML = '<p class="assess-picker-hint" style="color:var(--text-faint);font-style:italic">No runs yet. Upload a document or use Solve All in the Dashboard to generate a run, then come back here to practise.</p>';
    return;
  }
  assessRunList.innerHTML = runs.map(r => `
    <div class="assess-run-card">
      <div class="assess-run-info">
        <div class="assess-run-name">${escapeHtml(r.document_name)}</div>
        <div class="assess-run-meta">${r.total_questions} questions &middot; ${formatRunDate(r.created_at)}</div>
      </div>
      <button class="btn-start-assess" data-id="${r.id}">Start →</button>
    </div>
  `).join('');
  assessRunList.querySelectorAll('.btn-start-assess').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true; btn.textContent = 'Loading…';
      try {
        const res = await fetch(`/api/study/runs/${btn.dataset.id}`);
        const data = await res.json();
        openSelfAssess(data.run.id, data.run.items || []);
      } catch { btn.disabled = false; btn.textContent = 'Start →'; }
    });
  });
}

// ── Bookmarks view ────────────────────────────────────────────────────
async function loadBookmarksView() {
  bookmarksMain.innerHTML = '<p class="history-loading" style="padding:16px">Loading…</p>';
  try {
    const res = await fetch('/api/study/bookmarks');
    const data = await res.json();
    renderBookmarksMain(data.bookmarks || []);
  } catch {
    bookmarksMain.innerHTML = '<p class="history-empty">Could not load bookmarks.</p>';
  }
}

function renderBookmarksMain(bookmarks) {
  if (!bookmarks.length) {
    bookmarksMain.innerHTML = '<p class="history-empty" style="padding:20px;font-family:var(--font-display);font-style:italic;color:var(--text-faint)">No bookmarks yet. Use 🔖 during self-assessment to save questions here.</p>';
    return;
  }
  bookmarksMain.innerHTML = bookmarks.map(b => `
    <div class="history-item" style="position:relative;margin-bottom:10px">
      <div class="history-item-num">Q${b.question_num} ${b.correct_letter ? `<span style="color:var(--green)">✓ ${b.correct_letter.toUpperCase()}</span>` : ''}</div>
      <div class="history-item-stem">${escapeHtml(b.stem || '(no stem)')}</div>
      ${b.explanation ? `<div class="history-item-expl">${escapeHtml(b.explanation)}</div>` : ''}
      <button class="btn-ghost btn-sm bm-del-btn" data-id="${b.id}" style="position:absolute;top:8px;right:8px;opacity:.3" title="Remove">🗑</button>
    </div>
  `).join('');
  bookmarksMain.querySelectorAll('.bm-del-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await fetch(`/api/study/bookmarks/${btn.dataset.id}`, { method: 'DELETE' });
      loadBookmarksView();
    });
  });
}

// ── Dashboard View ────────────────────────────────────────────────────
// ── Heatmap renderer ──────────────────────────────────────────────────
function renderHeatmap(activity) {
  const grid = document.getElementById('heatmapGrid');
  const monthsBar = document.getElementById('heatmapMonths');
  if (!grid) return;

  const WEEKS = 52;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find the Sunday that starts 52 complete weeks ago
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - today.getDay() - (WEEKS - 1) * 7);

  // Build all 364 day cells
  const cells = [];
  const monthPositions = []; // { label, col }
  let lastMonth = -1;

  for (let w = 0; w < WEEKS; w++) {
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + w * 7 + d);
      if (date > today) continue;

      const iso = date.toISOString().slice(0, 10);
      const count = activity[iso] || 0;
      const level = count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 5 ? 3 : 4;
      const month = date.getMonth();
      if (month !== lastMonth) {
        monthPositions.push({ label: date.toLocaleString('default', { month: 'short' }), col: w });
        lastMonth = month;
      }
      const label = date.toLocaleDateString('default', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
      cells.push({ iso, count, level, label, w, d });
    }
  }

  // Render month labels
  if (monthsBar) {
    monthsBar.innerHTML = '';
    monthPositions.forEach(({ label, col }) => {
      const el = document.createElement('span');
      el.textContent = label;
      el.style.gridColumn = col + 1;
      monthsBar.appendChild(el);
    });
  }

  // Render day cells (CSS grid: 52 cols × 7 rows)
  grid.innerHTML = '';
  const tip = document.getElementById('heatmapTip');
  cells.forEach(({ iso, count, level, label, w, d }) => {
    const cell = document.createElement('span');
    cell.className = `hm-cell hm-${level}`;
    cell.style.gridColumn = w + 1;
    cell.style.gridRow = d + 1;
    cell.dataset.date = iso;
    cell.setAttribute('title', count ? `${label}: ${count} session${count !== 1 ? 's' : ''}` : label);
    cell.addEventListener('mouseenter', (e) => {
      if (!tip) return;
      tip.hidden = false;
      tip.textContent = count
        ? `${label} — ${count} study session${count !== 1 ? 's' : ''}`
        : `${label} — no activity`;
    });
    cell.addEventListener('mouseleave', () => { if (tip) tip.hidden = true; });
    grid.appendChild(cell);
  });
}

// ── Dashboard v2 mini focus timer state ──────────────────────────────
let _dashFocusInterval = null;
let _dashFocusSecsLeft = 25 * 60;
let _dashFocusRunning = false;

function _dashFocusUpdateDisplay() {
  const el = document.getElementById('dashFocusMiniTime');
  const lbl = document.getElementById('dashFocusMiniLabel');
  if (!el) return;
  const m = String(Math.floor(_dashFocusSecsLeft / 60)).padStart(2, '0');
  const s = String(_dashFocusSecsLeft % 60).padStart(2, '0');
  el.textContent = `${m}:${s}`;
  if (lbl) lbl.textContent = _dashFocusRunning ? 'Focusing…' : (_dashFocusSecsLeft === 25 * 60 ? 'Ready to focus' : 'Paused');
}

function _dashFocusStart() {
  if (_dashFocusRunning) {
    clearInterval(_dashFocusInterval);
    _dashFocusRunning = false;
    const btn = document.getElementById('dashFocusStartBtn');
    if (btn) btn.textContent = '▶ Resume';
    _dashFocusUpdateDisplay();
    return;
  }
  _dashFocusRunning = true;
  const btn = document.getElementById('dashFocusStartBtn');
  if (btn) btn.textContent = '⏸ Pause';
  _dashFocusInterval = setInterval(() => {
    _dashFocusSecsLeft--;
    _dashFocusUpdateDisplay();
    if (_dashFocusSecsLeft <= 0) {
      clearInterval(_dashFocusInterval);
      _dashFocusRunning = false;
      const b = document.getElementById('dashFocusStartBtn');
      if (b) { b.textContent = '▶ Start'; }
      const lbl = document.getElementById('dashFocusMiniLabel');
      if (lbl) lbl.textContent = '✅ Session complete!';
      fetch('/api/study/focus-sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationMins: 25, subject: '', completed: true }) }).catch(() => {});
      _dashFocusSecsLeft = 25 * 60;
    }
  }, 1000);
}

function _dashFocusReset() {
  clearInterval(_dashFocusInterval);
  _dashFocusRunning = false;
  _dashFocusSecsLeft = 25 * 60;
  const btn = document.getElementById('dashFocusStartBtn');
  if (btn) btn.textContent = '▶ Start';
  _dashFocusUpdateDisplay();
}

async function loadDashboardView() {
  try {
    // Greeting
    const hour = new Date().getHours();
    const greetEl = document.getElementById('dashGreetTitle');
    if (greetEl) {
      greetEl.textContent = hour < 12 ? 'Good morning ☀️' : hour < 17 ? 'Good afternoon 🌤' : 'Good evening 🌙';
    }

    const [dashRes, weakRes, achieveRes] = await Promise.all([
      fetch('/api/study/dashboard'),
      fetch('/api/study/weak-spots'),
      fetch('/api/study/achievements'),
    ]);
    if (!dashRes.ok) return;
    const { stats, recentRuns } = await dashRes.json();

    // Update greeting sub
    const greetSub = document.getElementById('dashGreetSub');
    if (greetSub) {
      const streak = stats.streak || 0;
      greetSub.textContent = streak > 1
        ? `🔥 You're on a ${streak}-day streak — keep it up!`
        : streak === 1 ? '🔥 Day 1 streak — come back tomorrow!' : 'Start studying to build your streak!';
    }

    // XP ring widget
    if (stats.xpLevel) {
      renderXPBar(stats.xpLevel);
      const lvlEl = document.getElementById('dashWLevel');
      const xpEl = document.getElementById('dashWXP');
      if (lvlEl) lvlEl.textContent = `Lv ${stats.xpLevel.level}`;
      if (xpEl) xpEl.textContent = `${stats.totalXP} XP`;
      const xpRing = document.getElementById('dashXpRingFill');
      if (xpRing) {
        const pct = stats.xpLevel.progressPct / 100;
        const circ = 2 * Math.PI * 32;
        xpRing.style.strokeDasharray = `${pct * circ} ${circ}`;
      }
    }

    // Streak widget
    const streakEl = document.getElementById('dashWStreak');
    const streakMsg = document.getElementById('dashStreakMsg');
    if (streakEl) streakEl.textContent = stats.streak || 0;
    if (streakMsg) {
      const s = stats.streak || 0;
      streakMsg.textContent = s === 0 ? 'Start your streak!' : s < 7 ? 'Keep going!' : s < 30 ? 'On fire! 🔥' : 'Legendary! 👑';
    }

    // Accuracy ring
    const accRing = document.getElementById('dashAccRingFill');
    const accEl = document.getElementById('dashWAccuracy');
    const acc = stats.totalQuestions > 0 ? stats.avgScore : 0;
    if (accEl) accEl.textContent = stats.totalQuestions > 0 ? acc + '%' : '—%';
    if (accRing && stats.totalQuestions > 0) {
      const circ = 2 * Math.PI * 32;
      accRing.style.strokeDasharray = `${(acc / 100) * circ} ${circ}`;
    }

    // Count widgets
    const dueEl = document.getElementById('dashWDue');
    const docsEl = document.getElementById('dashWDocs');
    const sessEl = document.getElementById('dashWSessions');
    if (dueEl) dueEl.textContent = stats.dueCards || 0;
    if (docsEl) docsEl.textContent = stats.totalDocuments || 0;
    if (sessEl) sessEl.textContent = stats.totalRuns || 0;

    // Widget click handlers
    const wXp = document.getElementById('dashWidgetXp');
    if (wXp) wXp.onclick = () => switchView('analytics');
    const countFlash = document.getElementById('dashCountFlash');
    if (countFlash) { countFlash.style.cursor = 'pointer'; countFlash.onclick = () => switchView('flashcards'); }
    const countDocs = document.getElementById('dashCountDocs');
    if (countDocs) { countDocs.style.cursor = 'pointer'; countDocs.onclick = () => switchView('library'); }

    // Recent sessions
    if (dashRecentRuns) {
      if (!recentRuns || !recentRuns.length) {
        dashRecentRuns.innerHTML = '<p class="dash-panel-empty">No sessions yet. Take a quiz to get started!</p>';
      } else {
        dashRecentRuns.innerHTML = recentRuns.slice(0, 5).map(r => {
          const score = r.total_questions > 0 ? Math.round((r.answered_count / r.total_questions) * 100) : 0;
          const cls = score >= 80 ? 'score-high' : score >= 60 ? 'score-mid' : 'score-low';
          return `<div class="dash-recent-item" data-id="${r.id}" style="cursor:pointer">
            <span class="dash-recent-icon">📊</span>
            <div class="dash-recent-info">
              <span class="dash-recent-name">${escapeHtml(r.document_name)}</span>
              <span class="dash-recent-sub">${r.answered_count}/${r.total_questions} correct</span>
            </div>
            <span class="dash-run-score ${cls}">${score}%</span>
          </div>`;
        }).join('');
        dashRecentRuns.querySelectorAll('.dash-recent-item').forEach(el => {
          el.onclick = () => { switchView('history'); setTimeout(() => loadRunDetail(Number(el.dataset.id)), 200); };
        });
      }
    }

    // Weak spots
    if (weakRes.ok) {
      const { weakSpots } = await weakRes.json();
      const wsEl = document.getElementById('dashWeakSpots');
      if (wsEl) {
        if (!weakSpots || !weakSpots.length) {
          wsEl.innerHTML = '<div class="dash-panel-empty">Complete quizzes to reveal your weak areas 🎯</div>';
        } else {
          wsEl.innerHTML = weakSpots.map(w => {
            const barW = w.score;
            const cls = w.score < 50 ? 'ws-bar-red' : w.score < 65 ? 'ws-bar-orange' : 'ws-bar-yellow';
            return `<div class="ws-item">
              <div class="ws-item-top">
                <span class="ws-name">${escapeHtml(w.name)}</span>
                <span class="ws-score">${w.score}%</span>
              </div>
              <div class="ws-bar-track"><div class="ws-bar-fill ${cls}" style="width:${barW}%"></div></div>
            </div>`;
          }).join('');
        }
        const practiceBtn = document.getElementById('dashPracticeWeak');
        if (practiceBtn) practiceBtn.onclick = () => switchView('assess');
      }
    }

    // Next achievement
    if (achieveRes.ok) {
      const { achievements } = await achieveRes.json();
      const nextEl = document.getElementById('dashNextAchievement');
      if (nextEl && achievements) {
        const next = achievements.find(a => !a.earned);
        if (next) {
          const pct = next.total > 0 ? Math.round((next.progress / next.total) * 100) : 0;
          nextEl.innerHTML = `<div class="dash-achieve-item">
            <div class="dash-achieve-icon">${next.icon}</div>
            <div class="dash-achieve-info">
              <div class="dash-achieve-name">${next.name}</div>
              <div class="dash-achieve-desc">${next.desc}</div>
              <div class="dash-achieve-bar-wrap">
                <div class="dash-achieve-bar-fill" style="width:${pct}%"></div>
              </div>
              <div class="dash-achieve-prog">${next.progress}/${next.total}</div>
            </div>
          </div>`;
        } else {
          const earned = achievements.filter(a => a.earned).length;
          nextEl.innerHTML = `<div class="dash-panel-empty">🎉 All ${earned} achievements unlocked!</div>`;
        }
        const allBtn = document.getElementById('dashGoAchievements');
        if (allBtn) allBtn.onclick = () => switchView('analytics');
      }
    }

    // Mini focus timer wire
    _dashFocusUpdateDisplay();
    const startBtn = document.getElementById('dashFocusStartBtn');
    const resetBtn = document.getElementById('dashFocusResetBtn');
    if (startBtn) startBtn.onclick = _dashFocusStart;
    if (resetBtn) resetBtn.onclick = _dashFocusReset;
    const goFocusBtn = document.getElementById('dashGoFocusRoom');
    if (goFocusBtn) goFocusBtn.onclick = () => switchView('focus');

  } catch(e) { console.error('Dashboard error:', e); }
}

// Dashboard quick-action wiring
if (dashGoHistory) dashGoHistory.onclick = () => switchView('history');
if (dashQaUpload) dashQaUpload.onclick = () => { switchView('library'); setTimeout(() => docFileInput && docFileInput.click(), 100); };
if (dashQaFlash) dashQaFlash.onclick = () => switchView('flashcards');
if (dashQaAssess) dashQaAssess.onclick = () => switchView('assess');
if (dashQaChat) dashQaChat.onclick = () => openCompanion();
const dashQaFocus = document.getElementById('dashQaFocus');
if (dashQaFocus) dashQaFocus.onclick = () => switchView('focus');
const dashQaNotes = document.getElementById('dashQaNotes');
if (dashQaNotes) dashQaNotes.onclick = () => switchView('notes');
const dashQaLib = document.getElementById('dashQaLib');
if (dashQaLib) dashQaLib.onclick = () => switchView('library');
const dashRapidFireBtn = document.getElementById('dashRapidFireBtn');
if (dashRapidFireBtn) dashRapidFireBtn.onclick = () => openRapidFire();

// ── MedPass Companion panel ───────────────────────────────────────────
function openCompanion() {
  if (!companionPanel) return;
  companionPanel.hidden = false;
  if (companionOverlay) companionOverlay.hidden = false;
  document.body.classList.add('companion-open');
  setTimeout(() => {
    companionPanel.classList.add('open');
    if (companionOverlay) companionOverlay.classList.add('open');
  }, 10);
  // Focus input
  const inp = companionPanel.querySelector('#messageInput');
  if (inp) setTimeout(() => inp.focus(), 200);
}

function closeCompanion() {
  if (!companionPanel) return;
  companionPanel.classList.remove('open');
  if (companionOverlay) companionOverlay.classList.remove('open');
  document.body.classList.remove('companion-open');
  setTimeout(() => {
    companionPanel.hidden = true;
    if (companionOverlay) companionOverlay.hidden = true;
  }, 300);
}

if (companionOpenBtn) companionOpenBtn.onclick = openCompanion;
if (companionCloseBtn) companionCloseBtn.onclick = closeCompanion;
if (companionOverlay) companionOverlay.addEventListener('click', closeCompanion);

// ── Chat memory helpers ────────────────────────────────────────────────
async function loadChatHistory() {
  try {
    const res = await fetch('/api/study/chat-history?limit=100');
    if (!res.ok) return;
    const data = await res.json().catch(() => null);
    if (!data || !Array.isArray(data.messages) || data.messages.length === 0) return;
    for (const m of data.messages) {
      history.push({ role: m.role, content: m.content_text });
      appendMessage(m.role, m.content_text);
    }
  } catch { /* non-fatal — app works without memory */ }
}

async function persistChatMessages(messages) {
  try {
    await fetch('/api/study/chat-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
  } catch { /* non-fatal */ }
}

async function clearChatHistory() {
  try {
    await fetch('/api/study/chat-history', { method: 'DELETE' });
    history.length = 0;
    companionChatLog.innerHTML = '';
    if (companionEmpty && !companionChatLog.contains(companionEmpty)) {
      companionChatLog.appendChild(companionEmpty);
    }
    if (companionEmpty) companionEmpty.hidden = false;
  } catch { /* non-fatal */ }
}

if (companionClearBtn) {
  companionClearBtn.onclick = async () => {
    if (!confirm('Clear all chat history? This cannot be undone.')) return;
    await clearChatHistory();
  };
}

loadChatHistory();

// ── Flashcards View ───────────────────────────────────────────────────
let _flashcards = [];
let _flashIdx = 0;
let _flashFlipped = false;

// Review session state
let _reviewMode = false;
let _reviewStats = { 0: 0, 1: 0, 2: 0, 3: 0 }; // rating → count
let _reviewTotal = 0;

// Extra DOM refs for review mode
const flashReviewDueBtn   = document.getElementById('flashReviewDueBtn');
const flashReviewDueBadgeCount = document.getElementById('flashReviewDueBadgeCount');
const flashReviewBanner   = document.getElementById('flashReviewBanner');
const flashReviewBannerText = document.getElementById('flashReviewBannerText');
const flashReviewExitBtn  = document.getElementById('flashReviewExitBtn');
const flashReviewSummary  = document.getElementById('flashReviewSummary');

async function loadFlashcardsView() {
  exitReviewMode(false);
  if (flashEmpty) flashEmpty.hidden = true;
  if (flashDeckWrap) flashDeckWrap.hidden = true;
  if (flashReviewSummary) flashReviewSummary.hidden = true;
  if (flashCounter) flashCounter.textContent = 'Loading…';
  try {
    const res = await fetch('/api/study/flashcards');
    const data = await res.json();
    _flashcards = data.flashcards || [];
    // Populate filter
    if (flashDocSelect) {
      const docsSeen = new Map();
      _flashcards.forEach(c => { if (!docsSeen.has(c.document_id)) docsSeen.set(c.document_id, c.document_name); });
      flashDocSelect.innerHTML = '<option value="">All documents</option>' +
        [...docsSeen.entries()].map(([id, name]) => `<option value="${id}">${escapeHtml(name)}</option>`).join('');
    }
    // Update "Review Due" button
    updateReviewDueButton();
    renderFlashcards(_flashcards);
  } catch {
    if (flashEmpty) { flashEmpty.hidden = false; flashEmpty.querySelector && (flashEmpty.querySelector('p').textContent = 'Could not load flashcards.'); }
  }
}

function getDueCards() {
  const today = new Date().toISOString().slice(0, 10);
  return _flashcards.filter(c => (c.srs_due || today) <= today);
}

function updateReviewDueButton() {
  if (!flashReviewDueBtn) return;
  const due = getDueCards();
  if (due.length > 0) {
    flashReviewDueBtn.hidden = false;
    if (flashReviewDueBadgeCount) flashReviewDueBadgeCount.textContent = due.length;
  } else {
    flashReviewDueBtn.hidden = true;
  }
}

function startReviewSession() {
  const dueCards = getDueCards();
  if (!dueCards.length) return;
  _reviewMode = true;
  _reviewStats = { 0: 0, 1: 0, 2: 0, 3: 0 };
  _reviewTotal = dueCards.length;
  // Show banner
  if (flashReviewBanner) flashReviewBanner.hidden = false;
  if (flashReviewBannerText) flashReviewBannerText.textContent = `Reviewing ${_reviewTotal} due card${_reviewTotal !== 1 ? 's' : ''}…`;
  // Hide summary if visible
  if (flashReviewSummary) flashReviewSummary.hidden = true;
  // Load only due cards
  _flashcards = dueCards;
  renderFlashcards(_flashcards);
}

function exitReviewMode(reload = true) {
  _reviewMode = false;
  _reviewStats = { 0: 0, 1: 0, 2: 0, 3: 0 };
  _reviewTotal = 0;
  if (flashReviewBanner) flashReviewBanner.hidden = true;
  if (flashReviewSummary) flashReviewSummary.hidden = true;
  if (reload) loadFlashcardsView();
}

function showReviewSummary() {
  if (!flashReviewSummary) return;
  if (flashDeckWrap) flashDeckWrap.hidden = true;
  flashReviewSummary.hidden = false;

  const total = _reviewTotal;
  const reviewed = Object.values(_reviewStats).reduce((s, v) => s + v, 0);
  const good = (_reviewStats[2] || 0) + (_reviewStats[3] || 0);
  const pct = total > 0 ? Math.round((good / total) * 100) : 0;

  // Update subtitle
  const subtitle = document.getElementById('reviewSummarySubtitle');
  if (subtitle) subtitle.textContent = `You reviewed ${reviewed} card${reviewed !== 1 ? 's' : ''}. ${good} recalled correctly.`;

  // Animate ring
  const ring = document.getElementById('reviewRingFill');
  const pctLabel = document.getElementById('reviewRingPct');
  if (ring) {
    const circum = 326.7;
    const offset = circum - (pct / 100) * circum;
    setTimeout(() => { ring.style.strokeDashoffset = offset; }, 100);
    ring.style.stroke = pct >= 80 ? '#059669' : pct >= 50 ? '#f59e0b' : '#ef4444';
  }
  if (pctLabel) pctLabel.textContent = pct + '%';

  // Breakdown
  const breakdown = document.getElementById('reviewSummaryBreakdown');
  if (breakdown) {
    const labels = ['Again', 'Hard', 'Good', 'Easy'];
    const colors = ['#dc2626', '#c2410c', '#15803d', '#1d4ed8'];
    breakdown.innerHTML = labels.map((label, i) =>
      `<div class="review-breakdown-item">
        <span class="review-breakdown-dot" style="background:${colors[i]}"></span>
        <span class="review-breakdown-label">${label}</span>
        <span class="review-breakdown-val">${_reviewStats[i] || 0}</span>
      </div>`
    ).join('');
  }

  // Next due hint
  const nextEl = document.getElementById('reviewSummaryNext');
  if (nextEl) {
    const again = _reviewStats[0] || 0;
    if (again > 0) {
      nextEl.textContent = `${again} card${again !== 1 ? 's' : ''} marked "Again" — they'll appear again tomorrow.`;
    } else {
      nextEl.textContent = 'Great work! No cards need immediate re-review.';
    }
  }

  // Wire action buttons
  const reviewAgainBtn = document.getElementById('reviewSummaryReviewAgainBtn');
  const allCardsBtn    = document.getElementById('reviewSummaryAllCardsBtn');
  if (reviewAgainBtn) {
    reviewAgainBtn.onclick = () => { exitReviewMode(true); setTimeout(startReviewSession, 300); };
  }
  if (allCardsBtn) {
    allCardsBtn.onclick = () => exitReviewMode(true);
  }
}

function renderFlashcards(cards) {
  if (flashCounter) flashCounter.textContent = `${cards.length} card${cards.length !== 1 ? 's' : ''}`;
  if (!cards.length) {
    if (flashEmpty) flashEmpty.hidden = false;
    if (flashDeckWrap) flashDeckWrap.hidden = true;
    return;
  }
  if (flashEmpty) flashEmpty.hidden = true;
  if (flashDeckWrap) flashDeckWrap.hidden = false;
  _flashIdx = 0;
  _flashFlipped = false;
  showFlashcard();
}

function showFlashcard() {
  const card = _flashcards[_flashIdx];
  if (!card) return;
  _flashFlipped = false;
  if (flashCard) flashCard.classList.remove('flipped');
  if (flashFrontText) flashFrontText.textContent = card.front;
  if (flashBackText) flashBackText.textContent = card.back;
  if (flashDeckName) flashDeckName.textContent = card.document_name || '';
  if (flashCounter) flashCounter.textContent = `${_flashIdx + 1} / ${_flashcards.length}`;
  if (flashProgressFill) flashProgressFill.style.width = `${((_flashIdx + 1) / _flashcards.length) * 100}%`;
  if (flashPrevBtn) flashPrevBtn.disabled = _flashIdx === 0;
  if (flashNextBtn) flashNextBtn.disabled = _flashIdx === _flashcards.length - 1;
  // SRS: hide rating buttons until flipped; show due badge
  if (flashSrsButtons) flashSrsButtons.hidden = true;
  if (flashHint) flashHint.hidden = false;
  if (flashDueBadge) {
    const today = new Date().toISOString().slice(0, 10);
    const due = card.srs_due || today;
    const isDue = due <= today;
    if (isDue && card.srs_reps > 0) {
      flashDueBadge.hidden = false;
      flashDueBadge.textContent = '⏰ Due for review';
    } else if (card.srs_reps === 0) {
      flashDueBadge.hidden = false;
      flashDueBadge.textContent = '✦ New card';
    } else {
      flashDueBadge.hidden = false;
      flashDueBadge.textContent = `Next review: ${due}`;
    }
  }
}

if (flashCard) {
  flashCard.addEventListener('click', () => {
    _flashFlipped = !_flashFlipped;
    flashCard.classList.toggle('flipped', _flashFlipped);
    // Show SRS rating buttons after flipping to see the answer
    if (flashSrsButtons) flashSrsButtons.hidden = !_flashFlipped;
    if (flashHint) flashHint.hidden = _flashFlipped;
  });
  flashCard.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flashCard.click(); }
    if (e.key === 'ArrowLeft' && flashPrevBtn) flashPrevBtn.click();
    if (e.key === 'ArrowRight' && flashNextBtn) flashNextBtn.click();
  });
}
if (flashPrevBtn) flashPrevBtn.onclick = () => { if (_flashIdx > 0) { _flashIdx--; showFlashcard(); } };
if (flashNextBtn) flashNextBtn.onclick = () => { if (_flashIdx < _flashcards.length - 1) { _flashIdx++; showFlashcard(); } };

// SRS rating button handlers
if (flashSrsButtons) {
  flashSrsButtons.addEventListener('click', async (e) => {
    const btn = e.target.closest('.srs-btn');
    if (!btn) return;
    const rating = Number(btn.dataset.rating);
    const card = _flashcards[_flashIdx];
    if (!card) return;
    // Disable all rating buttons during save
    flashSrsButtons.querySelectorAll('.srs-btn').forEach(b => { b.disabled = true; });
    try {
      const res = await fetch(`/api/study/flashcards/${card.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      });
      if (res.ok) {
        const result = await res.json();
        card.srs_due = result.dueDate;
        card.srs_interval = result.interval;
        card.srs_ease = result.ease;
        card.srs_reps = result.reps;
      }
    } catch { /* silent */ }
    flashSrsButtons.querySelectorAll('.srs-btn').forEach(b => { b.disabled = false; });

    // Track stats in review session
    if (_reviewMode) {
      _reviewStats[rating] = (_reviewStats[rating] || 0) + 1;
      const reviewed = Object.values(_reviewStats).reduce((s, v) => s + v, 0);
      if (flashReviewBannerText) {
        flashReviewBannerText.textContent = `${reviewed} / ${_reviewTotal} reviewed…`;
      }
    }

    // Advance to next card or end session
    if (_flashIdx < _flashcards.length - 1) {
      _flashIdx++;
      showFlashcard();
    } else {
      // End of deck
      if (_reviewMode) {
        showReviewSummary();
      } else {
        if (flashSrsButtons) flashSrsButtons.hidden = true;
        if (flashHint) { flashHint.hidden = false; flashHint.textContent = '✓ End of deck — all reviewed!'; }
      }
    }
  });
}

// Wire Review Due button and Exit Review button
if (flashReviewDueBtn) flashReviewDueBtn.onclick = startReviewSession;
if (flashReviewExitBtn) flashReviewExitBtn.onclick = () => exitReviewMode(true);
if (flashShuffleBtn) flashShuffleBtn.onclick = () => {
  for (let i = _flashcards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [_flashcards[i], _flashcards[j]] = [_flashcards[j], _flashcards[i]];
  }
  renderFlashcards(_flashcards);
};
if (flashDocSelect) flashDocSelect.addEventListener('change', () => {
  const docId = flashDocSelect.value;
  // Re-fetch filtered or show cached subset
  loadFlashcardsView().then(() => {
    if (docId) {
      const filtered = _flashcards.filter(c => String(c.document_id) === docId);
      renderFlashcards(filtered);
    }
  });
});
if (flashUploadBtn) flashUploadBtn.onclick = () => { switchView('library'); setTimeout(() => docFileInput && docFileInput.click(), 100); };

// Space key to flip when flashcard view is active
document.addEventListener('keydown', (e) => {
  if (currentView === 'flashcards' && e.key === ' ' && document.activeElement !== flashCard) {
    e.preventDefault();
    if (flashCard) flashCard.click();
  }
});


let _docLibrary = [];

let _librarySortMode = 'date';

async function loadLibraryView() {
  try {
    const res = await fetch('/api/study/documents');
    const data = await res.json();
    _docLibrary = data.documents || [];
    renderDocGrid(_docLibrary);
    updateDocBadge(_docLibrary.length);
    setupLibraryControls();
  } catch { /* silent */ }
}

function setupLibraryControls() {
  if (librarySearchInput) {
    librarySearchInput.oninput = () => applyLibraryFilter();
  }
  if (librarySortBtn) {
    librarySortBtn.onclick = () => { _librarySortMode = 'date'; librarySortBtn.classList.add('active'); if(librarySortNameBtn) librarySortNameBtn.classList.remove('active'); applyLibraryFilter(); };
    librarySortBtn.classList.add('active');
  }
  if (librarySortNameBtn) {
    librarySortNameBtn.onclick = () => { _librarySortMode = 'name'; librarySortNameBtn.classList.add('active'); if(librarySortBtn) librarySortBtn.classList.remove('active'); applyLibraryFilter(); };
  }
}

function applyLibraryFilter() {
  const q = librarySearchInput ? librarySearchInput.value.toLowerCase() : '';
  let docs = _docLibrary.filter(d => d.name.toLowerCase().includes(q));
  if (_librarySortMode === 'name') docs = [...docs].sort((a,b) => a.name.localeCompare(b.name));
  else docs = [...docs].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  renderDocGrid(docs);
}

function updateDocBadge(n) {
  if (n > 0) { docBadge.textContent = n; docBadge.hidden = false; }
  else { docBadge.hidden = true; }
}

function renderDocGrid(docs) {
  if (!docs.length) {
    libraryEmpty.hidden = false;
    docGrid.hidden = true;
    return;
  }
  libraryEmpty.hidden = true;
  docGrid.hidden = false;
  docGrid.innerHTML = docs.map(d => {
    const icon = d.mime_type === 'application/pdf' ? '📄' : '📝';
    const statusClass = d.status === 'done' ? 'doc-status-done' : d.status === 'error' ? 'doc-status-error' : 'doc-status-processing';
    const statusLabel = d.status === 'done' ? 'Ready' : d.status === 'error' ? 'Error' : 'Processing…';
    const canAct = d.status === 'done';
    const tags = (d.tags || '').split(',').map(t => t.trim()).filter(Boolean);
    const tagsHtml = tags.map(t => `<span class="doc-tag-chip">${escapeHtml(t)}</span>`).join('');
    return `
      <div class="doc-card" data-id="${d.id}" data-run="${d.run_id || ''}">
        <button class="doc-card-delete" data-id="${d.id}" title="Delete">✕</button>
        <div class="doc-card-icon">${icon}</div>
        <div class="doc-card-name">${escapeHtml(d.name)}</div>
        <div class="doc-card-meta">${formatRunDate(d.created_at)}</div>
        ${tagsHtml ? `<div class="doc-card-tags">${tagsHtml}</div>` : ''}
        <div class="doc-card-status ${statusClass}">
          <span class="doc-status-dot"></span>
          <span>${statusLabel}</span>
        </div>
        <div class="doc-card-actions">
          <button class="btn-doc teal btn-doc-chat" data-id="${d.id}" ${canAct ? '' : 'disabled'}>Ask questions</button>
          ${d.run_id ? `<button class="btn-doc btn-doc-assess" data-run="${d.run_id}">Self-assess</button>` : ''}
          ${canAct ? `<button class="btn-doc btn-doc-quiz" data-id="${d.id}" data-name="${escapeHtml(d.name)}">⚡ Quick Quiz</button>` : ''}
        </div>
        <div class="doc-card-footer">
          <button class="btn-ghost btn-xs btn-doc-tags" data-id="${d.id}" title="Edit tags">🏷 Tags</button>
          ${canAct ? `<button class="btn-ghost btn-xs btn-doc-share" data-id="${d.id}" data-token="${d.share_token || ''}" title="${d.share_token ? 'Copy share link' : 'Generate share link'}">🔗 ${d.share_token ? 'Shared' : 'Share'}</button>` : ''}
        </div>
      </div>
    `;
  }).join('');

  docGrid.querySelectorAll('.doc-card-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Delete this document?')) return;
      await fetch(`/api/study/documents/${btn.dataset.id}`, { method: 'DELETE' });
      loadLibraryView();
    });
  });

  docGrid.querySelectorAll('.btn-doc-chat').forEach(btn => {
    btn.addEventListener('click', async () => {
      const doc = _docLibrary.find(d => String(d.id) === String(btn.dataset.id));
      if (!doc) return;
      openCompanion();
      setTimeout(() => {
        appendMessage('assistant', `Loaded *${doc.name}* — ask me anything about it, or I can generate test questions from it.`);
      }, 150);
    });
  });

  docGrid.querySelectorAll('.btn-doc-assess').forEach(btn => {
    btn.addEventListener('click', async () => {
      const runId = Number(btn.dataset.run);
      const res = await fetch(`/api/study/runs/${runId}`);
      const data = await res.json();
      openSelfAssess(data.run.id, data.run.items || []);
    });
  });

  docGrid.querySelectorAll('.btn-doc-tags').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const doc = _docLibrary.find(d => String(d.id) === String(btn.dataset.id));
      const current = doc ? (doc.tags || '') : '';
      const newTags = prompt('Enter tags (comma-separated, e.g. cardiology, physiology):', current);
      if (newTags === null) return;
      await fetch(`/api/study/documents/${btn.dataset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: newTags, status: doc ? doc.status : undefined }),
      });
      loadLibraryView();
    });
  });

  docGrid.querySelectorAll('.btn-doc-quiz').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const name = btn.dataset.name || 'Document';
      const orig = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Loading…';
      try {
        const res = await fetch(`/api/study/documents/${id}/text`);
        if (!res.ok) throw new Error('Could not load document text.');
        const data = await res.json();
        openAssessSetup({ type: 'text', text: data.text }, 'Quick Quiz: ' + name);
      } catch (err) {
        alert('Could not start quiz: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = orig;
      }
    });
  });

  docGrid.querySelectorAll('.btn-doc-share').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const existingToken = btn.dataset.token;
      if (existingToken) {
        const shareUrl = `${window.location.origin}/share.html?t=${existingToken}`;
        await navigator.clipboard.writeText(shareUrl).catch(() => {});
        const orig = btn.textContent;
        btn.textContent = '✓ Copied!';
        setTimeout(() => { btn.textContent = orig; }, 2000);
        return;
      }
      btn.disabled = true;
      try {
        const res = await fetch(`/api/study/documents/${btn.dataset.id}/share`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (data.token) {
          const shareUrl = `${window.location.origin}/share.html?t=${data.token}`;
          await navigator.clipboard.writeText(shareUrl).catch(() => {});
          btn.textContent = '✓ Link copied!';
          btn.dataset.token = data.token;
          setTimeout(() => loadLibraryView(), 1500);
        }
      } catch { btn.textContent = '🔗 Share'; }
      btn.disabled = false;
    });
  });
}

// ── Document type classification (notes vs. questions) ─────────────────
/**
 * Decides whether a document's text reads as a bank of exam-style questions
 * or as plain study notes. Cheap heuristic first (numbered-question density
 * + presence of MCQ option letters), since that correctly classifies the
 * overwhelming majority of real uploads without spending an AI call. Only
 * falls back to a quick AI classification call when the heuristic is
 * genuinely ambiguous (some numbering, but not clearly question-shaped).
 */
function heuristicClassifyDocType(text) {
  const starts = findQuestionStartIndices(text);
  const totalUnits = Math.max(1, splitIntoQuestionUnits(text).length);
  const numberedDensity = starts.length / totalUnits; // ~1 if nearly every unit starts with a number
  // MCQ option markers like "A)" "(B)" "C." appearing repeatedly is a strong
  // signal of a question bank rather than prose notes.
  const optionMatches = text.match(/(?:^|\n|\s)\(?[A-Ea-e]\)?[.)]\s/g) || [];
  const optionDensity = optionMatches.length / totalUnits;

  if (starts.length >= 3 && numberedDensity > 0.5 && optionDensity > 1) return 'questions';
  if (starts.length === 0 && optionDensity < 0.3) return 'notes';
  return null; // ambiguous — let the AI decide
}

/** AI-backed fallback classification for ambiguous documents. Cheap, single short call. */
async function aiClassifyDocType(text) {
  const sample = text.slice(0, 3000);
  const instruction = `Look at this study document excerpt. Reply with EXACTLY ONE WORD: "QUESTIONS" if it is a bank of exam-style practice questions (numbered items, usually with multiple-choice options), or "NOTES" if it is study notes, a textbook excerpt, or other reference material (not structured as a quiz). No other text.`;
  const content = `${instruction}\n\n---\n${sample}`;
  try {
    const result = await sendChatRequest([{ role: 'user', content }], { solveAll: true });
    if (result.ok && result.data && result.data.reply) {
      const word = result.data.reply.trim().toUpperCase();
      if (word.includes('QUESTION')) return 'questions';
      if (word.includes('NOTE')) return 'notes';
    }
  } catch { /* fall through to default below */ }
  return 'notes'; // safest default — notes pipeline never assumes structure that isn't there
}

/** Combined classifier: heuristic first, AI fallback only when ambiguous. */
async function classifyDocumentType(text) {
  const guess = heuristicClassifyDocType(text);
  if (guess) return guess;
  return await aiClassifyDocType(text);
}

// ── Document upload + processing ──────────────────────────────────────
function setupDocUpload() {
  [uploadDocBtn, uploadDocBtn2].forEach(btn => {
    if (btn) btn.addEventListener('click', () => docFileInput.click());
  });
  docFileInput.addEventListener('change', async () => {
    const files = Array.from(docFileInput.files || []);
    docFileInput.value = '';
    for (const file of files) {
      await processAndStoreDoc(file);
    }
  });
}

async function processAndStoreDoc(file) {
  // Reset overlay to its "in progress" visual state every run, since a
  // previous run on this same overlay may have left it in the error state.
  docProcessOverlay.hidden = false;
  docProcessIcon.textContent = '⚕';
  docProcessTitle.textContent = `Processing "${file.name}"…`;
  docProcessSub.hidden = false;
  docProcessBar.hidden = false;
  docProcessSub.textContent = 'Extracting text…';
  docProcessFill.style.width = '10%';
  docProcessError.hidden = true;
  docProcessError.textContent = '';
  docProcessActions.hidden = true;

  try {
    // 1. Extract text
    let text = '';
    if (file.type === 'application/pdf') {
      // extractPdfText reports progress as (currentPage, totalPages), not a
      // percentage — convert it here.
      text = await extractPdfText(file, (cur, tot) => {
        const pct = tot ? (cur / tot) * 100 : 0;
        docProcessSub.textContent = `Reading PDF… page ${cur}/${tot}`;
        docProcessFill.style.width = `${10 + pct * 0.30}%`;
      });
    } else {
      text = await file.text();
    }
    docProcessFill.style.width = '40%';
    docProcessSub.textContent = 'Saving document…';

    // 2. Save to server
    const saveRes = await fetch('/api/study/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: file.name, sizeBytes: file.size,
        mimeType: file.type || 'text/plain', textContent: text,
      }),
    });
    const saveData = await saveRes.json().catch(() => ({}));
    if (!saveRes.ok) {
      throw new Error(saveData.error || `Could not save the document (HTTP ${saveRes.status}).`);
    }
    const docId = saveData.document?.id;
    docProcessFill.style.width = '50%';

    // 3. Classify: is this a question bank or study notes?
    docProcessSub.textContent = 'Reading document type…';
    const docType = await classifyDocumentType(text);
    if (docId) {
      await fetch(`/api/study/documents/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docType }),
      });
    }
    docProcessFill.style.width = '58%';

    let runId = null;
    if (docType === 'questions') {
      // 4a. Questions pipeline — extract + solve each question (existing flow).
      docProcessSub.textContent = 'Generating questions & answers…';
      runId = await runSolveAllForDoc(text, file.name, (pct) => {
        docProcessFill.style.width = `${58 + pct * 0.38}%`;
        docProcessSub.textContent = `Solving… ${Math.round(pct)}%`;
      });
    } else {
      // 4b. Notes pipeline — generate flashcards + a self-quiz run.
      docProcessSub.textContent = 'Building flashcards from notes…';
      const cardCount = await runFlashcardGenerationForDoc(text, file.name, docId, (pct) => {
        docProcessFill.style.width = `${58 + pct * 0.19}%`;
        docProcessSub.textContent = `Building flashcards… ${Math.round(pct)}%`;
      });
      docProcessSub.textContent = 'Drafting quiz questions from notes…';
      runId = await runQuizGenerationForNotes(text, file.name, (pct) => {
        docProcessFill.style.width = `${77 + pct * 0.19}%`;
        docProcessSub.textContent = `Drafting quiz… ${Math.round(pct)}%`;
      });
      docProcessSub.textContent = `Done — ${cardCount} flashcard(s) ready.`;
    }

    docProcessFill.style.width = '100%';
    docProcessSub.textContent = 'Done!';

    // 5. Mark doc as done
    if (docId) {
      await fetch(`/api/study/documents/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done', runId, docType }),
      });
    }

    setTimeout(() => {
      docProcessOverlay.hidden = true;
      loadLibraryView();
      switchView('library');
    }, 800);

  } catch (err) {
    console.error('Doc processing failed:', err);
    // Show the failure inside the overlay itself (with Retry / Close)
    // instead of silently hiding it and dumping a one-line message into
    // the chat log — the user is looking at the overlay, not the chat.
    docProcessIcon.textContent = '⚠';
    docProcessTitle.textContent = `Could not process "${file.name}"`;
    docProcessSub.hidden = true;
    docProcessBar.hidden = true;
    docProcessError.hidden = false;
    docProcessError.textContent = err.message || 'Something went wrong while processing this document.';
    docProcessActions.hidden = false;
    docProcessRetryBtn.onclick = () => { processAndStoreDoc(file); };
    docProcessCloseBtn.onclick = () => { docProcessOverlay.hidden = true; loadLibraryView(); };
  }
}

// Solves one chunk for the document-upload flow, recursively splitting it
// in half (up to MAX_SPLIT_DEPTH times) if the model's reply comes back
// truncated — mirrors _solveSubChunks's approach for the chat-attachment flow.
async function _solveChunkForDoc(chunkText, partLabel, depth = 0) {
  const MAX_SPLIT_DEPTH = 4;
  let result = null;
  for (let attempt = 0; attempt <= BATCH_MAX_RETRIES; attempt++) {
    try {
      result = await callAI(chunkText, partLabel);
    } catch (e) {
      result = { ok: false, error: e.message };
    }
    if (result.ok) break;
    const isRateLimit = /rate.?limit|too many|429/i.test(result.error || '');
    if (attempt < BATCH_MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, isRateLimit ? computeRetryWaitMs(result, attempt) : 3000 * (attempt + 1)));
      continue;
    }
  }

  if (!result.ok) {
    return [{ chunk: chunkText, reply: null, error: result.error }];
  }

  if (result.data.truncated) {
    const units = splitIntoQuestionUnits(chunkText);
    if (units.length > 1 && depth < MAX_SPLIT_DEPTH) {
      const mid = Math.ceil(units.length / 2);
      const [first, second] = await Promise.all([
        _solveChunkForDoc(units.slice(0, mid).join(' '), partLabel, depth + 1),
        _solveChunkForDoc(units.slice(mid).join(' '), partLabel, depth + 1),
      ]);
      return [...first, ...second];
    }
    // Can't split further — keep what we got rather than lose it silently.
    return [{ chunk: chunkText, reply: result.data.reply, truncated: true }];
  }

  return [{ chunk: chunkText, reply: result.data.reply, error: null }];
}

// Run the full solve-all batch for a document text, returns run id
async function runSolveAllForDoc(text, fileName, onProgress) {
  const chunks = splitIntoChunks(text, BATCH_CHUNK_CHARS);
  const total = chunks.length;
  let partResults = [];
  let completed = 0;

  for (let i = 0; i < total; i++) {
    onProgress && onProgress((completed / total) * 100);
    const partLabel = total > 1 ? `Part ${i + 1}/${total}` : null;
    const parts = await _solveChunkForDoc(chunks[i], partLabel);
    partResults.push(...parts);
    completed++;
    onProgress && onProgress((completed / total) * 100);
    if (i < total - 1) await new Promise(r => setTimeout(r, DEFAULT_BATCH_DELAY_MS));
  }

  const runItems = buildStudyRunItems(partResults, {});
  if (!runItems.length) {
    // Surface the most useful underlying reason rather than a generic message,
    // so failures (rate limit, missing API key, etc.) are actionable.
    const firstError = partResults.find((p) => p.error)?.error;
    throw new Error(firstError ? `Could not generate questions: ${firstError}` : 'No questions could be extracted from this document.');
  }

  const saveRes = await fetch('/api/study/runs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentName: fileName, items: runItems, sourceType: 'questions' }),
  });
  const saveData = await saveRes.json();
  return saveData.run?.id || null;
}

// Low-level AI call (single chunk) used by doc processing.
// Mirrors the request shape _runSolveAllInner uses: a real user message
// containing the instruction + chunk text, with solveAll:true so the
// server routes to the fast solve model with the right token budget.
async function callAI(chunkText, partLabel) {
  const instruction = `${partLabel ? `Continuing the same document (${partLabel}). ` : ''}For each question below, reply ONLY with:\n[number]. Answer: [letter]\nExplanation: [3-5 sentences — mechanism/concept, why the correct answer fits, and why the most tempting wrong option(s) are incorrect]. No preamble, no extra text.`;
  const content = `${instruction}\n\n${chunkText}`;
  const result = await sendChatRequest([{ role: 'user', content }], { solveAll: true });
  if (!result.ok) {
    return { ok: false, error: (result.data && result.data.error) || `HTTP ${result.status}`, data: result.data };
  }
  return { ok: true, data: result.data };
}

// ── Notes pipeline: flashcards ──────────────────────────────────────────
/**
 * Parses flashcard pairs out of a model reply formatted as repeated
 * "FRONT: ...\nBACK: ..." blocks (one per card, blank line between).
 * Tolerant of minor formatting drift since this is model output, not a
 * fixed schema — anything without both a front and back is dropped.
 */
function parseFlashcardBlocks(replyText) {
  const cards = [];
  const blocks = String(replyText || '').split(/\n\s*\n/);
  for (const block of blocks) {
    const frontMatch = block.match(/front[:\s]+([\s\S]+?)(?=\n\s*back[:\s]|$)/i);
    const backMatch = block.match(/back[:\s]+([\s\S]+)/i);
    if (frontMatch && backMatch) {
      const front = frontMatch[1].trim();
      const back = backMatch[1].trim();
      if (front && back) cards.push({ front, back });
    }
  }
  return cards;
}

/** Generates flashcards from a notes document, chunk by chunk, and saves them server-side. Returns total card count. */
async function runFlashcardGenerationForDoc(text, fileName, docId, onProgress) {
  const chunks = splitIntoChunks(text, BATCH_CHUNK_CHARS);
  const total = chunks.length;
  let allCards = [];

  for (let i = 0; i < total; i++) {
    onProgress && onProgress((i / total) * 100);
    const instruction = `These are study notes (not exam questions). Read the excerpt below and produce 5-10 flashcards covering its key facts, definitions, and concepts. Reply ONLY with repeated blocks in EXACTLY this format, separated by a blank line:\nFRONT: [a short question or term]\nBACK: [the concise answer or definition]\nNo preamble, no numbering, no extra commentary.`;
    const content = `${instruction}\n\n${chunks[i]}`;
    let result = null;
    try {
      result = await sendChatRequest([{ role: 'user', content }], { solveAll: true });
    } catch (e) {
      result = { ok: false, data: { error: e.message } };
    }
    if (result.ok && result.data && result.data.reply) {
      allCards.push(...parseFlashcardBlocks(result.data.reply));
    }
    onProgress && onProgress(((i + 1) / total) * 100);
    if (i < total - 1) await new Promise(r => setTimeout(r, DEFAULT_BATCH_DELAY_MS));
  }

  if (allCards.length === 0) return 0;

  try {
    await fetch('/api/study/flashcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId: docId || null, documentName: fileName, cards: allCards }),
    });
  } catch (err) {
    console.warn('Could not save flashcards:', err.message);
  }
  return allCards.length;
}

// ── Notes pipeline: self-quiz generation ────────────────────────────────
/**
 * Generates a set of multiple-choice quiz questions FROM notes content
 * (rather than extracting pre-existing questions), so notes documents can
 * still feed a study run / the assessment panel. Reuses the same
 * answer-block parser as the questions pipeline by asking the model to
 * produce full MCQ items (stem + options + answer + explanation) in one
 * pass per chunk.
 */
async function runQuizGenerationForNotes(text, fileName, onProgress) {
  const chunks = splitIntoChunks(text, BATCH_CHUNK_CHARS);
  const total = chunks.length;
  const items = [];
  let counter = 1;

  for (let i = 0; i < total; i++) {
    onProgress && onProgress((i / total) * 100);
    const instruction = `These are study notes (not existing exam questions). Write 4-6 NEW multiple-choice exam-style questions that test the key concepts in the excerpt below. Reply ONLY with repeated blocks, one per question, in EXACTLY this format:\n[number]. Stem: [the question]\nA) [option]\nB) [option]\nC) [option]\nD) [option]\nAnswer: [letter]\nExplanation: [3-5 sentences — mechanism/concept, why correct, why the main distractor is wrong]\nNumber the questions starting at 1 for each excerpt. No preamble, no extra text.`;
    const content = `${instruction}\n\n${chunks[i]}`;
    let result = null;
    try {
      result = await sendChatRequest([{ role: 'user', content }], { solveAll: true });
    } catch (e) {
      result = { ok: false, data: { error: e.message } };
    }
    if (result.ok && result.data && result.data.reply) {
      const parsed = parseGeneratedMcqBlocks(result.data.reply, counter);
      items.push(...parsed.items);
      counter = parsed.nextNum;
    }
    onProgress && onProgress(((i + 1) / total) * 100);
    if (i < total - 1) await new Promise(r => setTimeout(r, DEFAULT_BATCH_DELAY_MS));
  }

  if (items.length === 0) {
    throw new Error('Could not generate quiz questions from these notes.');
  }

  const saveRes = await fetch('/api/study/runs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentName: fileName, items, sourceType: 'notes' }),
  });
  const saveData = await saveRes.json();
  return saveData.run?.id || null;
}

/**
 * Parses model-generated MCQ blocks (stem + A-D options + Answer + Explanation)
 * into the same item shape buildStudyRunItems produces, so notes-derived runs
 * are indistinguishable from questions-derived runs everywhere downstream
 * (history, assessment panel, PDF export). Renumbers sequentially across
 * chunks via `startNum` so multi-chunk notes don't collide on question 1.
 */
function parseGeneratedMcqBlocks(replyText, startNum) {
  const items = [];
  let nextNum = startNum;
  const blocks = String(replyText || '').split(/\n(?=\s*\d{1,3}[.)]\s*Stem[:\s])/i);
  for (const block of blocks) {
    const stemMatch = block.match(/Stem[:\s]+([\s\S]+?)(?=\n\s*[A-D]\)|\n\s*Answer[:\s]|$)/i);
    if (!stemMatch) continue;
    const stem = stemMatch[1].trim();
    // Scope option scanning to the region between the stem and "Answer:" —
    // otherwise a letter reference inside the explanation (e.g. "Option B fits...")
    // can be mistaken for an extra option line.
    const ansSplitIdx = block.search(/\n\s*Answer[:\s]/i);
    const optionsRegion = ansSplitIdx >= 0 ? block.slice(0, ansSplitIdx) : block;
    const options = [];
    const optRe = /(?:^|\n)\s*([A-D])\)\s*([^\n]+)/g;
    let om;
    while ((om = optRe.exec(optionsRegion))) {
      options.push({ letter: om[1].toLowerCase(), text: om[2].trim() });
    }
    const ansMatch = block.match(/Answer[:\s]+([A-Da-d])\b/);
    const explMatch = block.match(/Explanation[:\s]+([\s\S]+)/i);
    if (!stem || options.length === 0) continue;
    items.push({
      num: nextNum++,
      stem,
      options,
      correctLetter: ansMatch ? ansMatch[1].toLowerCase() : null,
      explanation: explMatch ? explMatch[1].trim() : '',
      isUnanswered: !ansMatch,
      disagreement: null,
    });
  }
  return { items, nextNum };
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSESSMENT ENGINE — Bloom's taxonomy, batched generation, submit-and-score
// ─────────────────────────────────────────────────────────────────────────────

// State
let assessItems = [];
let assessRunId = null;
let assessAnswers = {};
let assessTopic = '';
let assessSource = null;

// DOM refs — setup screen
const assessSetupTitle    = document.getElementById('assessSetupTitle');
const assessGenStatus     = document.getElementById('assessGenStatus');
const assessGenBar        = document.getElementById('assessGenBar');
const assessGenLabel      = document.getElementById('assessGenLabel');
const assessStartBtn      = document.getElementById('assessStartBtn');
const assessCountRow      = document.getElementById('assessCountRow');
const assessCountCustom   = document.getElementById('assessCountCustom');
const assessBloomGrid     = document.getElementById('assessBloomGrid');

// DOM refs — quiz screen
const assessQuizTitle     = document.getElementById('assessQuizTitle');
const assessQuizBloom     = document.getElementById('assessQuizBloom');
const assessQuizScroll    = document.getElementById('assessQuizScroll');
const assessProgressFill  = document.getElementById('assessProgressFill');
const assessAnsweredCount = document.getElementById('assessAnsweredCount');
const assessSubmitBtn     = document.getElementById('assessSubmitBtn');

// DOM refs — result screen
const assessScorePct      = document.getElementById('assessScorePct');
const ringFill            = document.getElementById('ringFill');
const assessResultStats   = document.getElementById('assessResultStats');
const assessBloomBreakdown= document.getElementById('assessBloomBreakdown');
const assessResultReview  = document.getElementById('assessResultReview');
const assessRetryBtn      = document.getElementById('assessRetryBtn');

// Close buttons
document.getElementById('assessCloseBtn').addEventListener('click', () => switchView('assess'));
document.getElementById('assessQuizCloseBtn').addEventListener('click', () => switchView('assess'));
document.getElementById('assessResultCloseBtn').addEventListener('click', () => switchView('assess'));
document.getElementById('assessResultCloseBtn2').addEventListener('click', () => switchView('assess'));

// -- Count selector --
let selectedCount = 10;
assessCountRow.querySelectorAll('.assess-count-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    assessCountRow.querySelectorAll('.assess-count-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedCount = Number(btn.dataset.n);
    assessCountCustom.value = '';
  });
});
assessCountCustom.addEventListener('input', () => {
  const v = parseInt(assessCountCustom.value, 10);
  if (v > 0) {
    assessCountRow.querySelectorAll('.assess-count-btn').forEach(b => b.classList.remove('active'));
    selectedCount = v;
  }
});

function getSelectedBloomLevels() {
  return [...assessBloomGrid.querySelectorAll('input[type=checkbox]:checked')].map(c => c.value);
}

function bloomLabel(level) {
  const map = { remember:'Remember', understand:'Understand', apply:'Apply', analyze:'Analyse', evaluate:'Evaluate', create:'Create' };
  return map[level] || level;
}

// -- Entry points --

function openSelfAssess(runId, items) {
  assessRunId = runId;
  const withStems = items.filter(i => i.stem && i.stem.trim());
  const usable = withStems.length > 0 ? withStems : items;
  if (!usable.length) {
    appendMessage('assistant', 'No question data found for this run. Re-run "Solve All" to generate a self-assessable session.');
    return;
  }
  assessItems = usable;
  assessAnswers = {};
  assessTopic = 'Study Run #' + runId;
  showQuizScreen();
}

function openAssessSetup(source, titleText) {
  assessSource = source;
  assessSetupTitle.textContent = titleText || 'Configure your quiz';
  switchView('assessSetup');
}

function showAssessScreen(name) {
  const map = { setup: 'assessSetup', quiz: 'assessQuiz', result: 'assessResult' };
  if (map[name]) switchView(map[name]);
}

// -- Setup -> Generate --
assessStartBtn.addEventListener('click', async () => {
  const levels = getSelectedBloomLevels();
  if (!levels.length) { alert("Select at least one Bloom's level."); return; }
  const count = Math.max(1, Math.min(60, selectedCount || 10));
  await generateAssessQuestions(count, levels);
});

async function generateAssessQuestions(totalCount, bloomLevels) {
  assessStartBtn.disabled = true;
  assessGenStatus.classList.remove('hidden');
  assessItems = [];
  assessAnswers = {};

  const BATCH = 10;
  const batches = Math.ceil(totalCount / BATCH);

  const bloomDescriptions = {
    remember:   'L1 Remember - recall facts, definitions, normal values',
    understand: 'L2 Understand - explain mechanisms, classify, summarise',
    apply:      'L3 Apply - use knowledge in a clinical scenario or calculation',
    analyze:    'L4 Analyse - compare, differentiate, identify relationships',
    evaluate:   'L5 Evaluate - critique management choices, justify decisions',
    create:     'L6 Create - devise a management plan, synthesise from multiple sources',
  };

  let material = '';
  if (assessSource) {
    if (assessSource.type === 'conv') {
      try {
        const r = await fetch('/api/study/conversations/' + assessSource.id + '/messages');
        const d = await r.json();
        material = (d.messages || []).filter(m => m.role === 'assistant').map(m => m.content).join('\n\n').slice(0, 10000);
      } catch(e) {}
    } else if (assessSource.type === 'text') {
      material = (assessSource.text || '').slice(0, 10000);
    } else if (assessSource.type === 'topic') {
      material = 'Topic: ' + (assessSource.topic || '');
    }
  }

  const materialSection = material
    ? ('Use the following content as your source material:\n"""\n' + material + '\n"""\n')
    : '';

  for (let b = 0; b < batches; b++) {
    const batchN = Math.min(BATCH, totalCount - assessItems.length);
    if (batchN <= 0) break;

    const levelForBatch = bloomLevels[b % bloomLevels.length];
    const startQ = assessItems.length + 1;

    assessGenLabel.textContent = 'Generating batch ' + (b + 1) + ' of ' + batches + ' (' + bloomLabel(levelForBatch) + ')...';
    assessGenBar.style.width = Math.round((b / batches) * 100) + '%';

    const promptLines = [
      'You are an expert medical educator creating board-style MCQ questions.',
      '',
      materialSection,
      'Generate exactly ' + batchN + ' MCQ questions at this Bloom\'s taxonomy level:',
      bloomDescriptions[levelForBatch] || levelForBatch,
      '',
      'Rules:',
      '- Number questions starting from Q' + startQ,
      '- Each question must have exactly 4 options (A-D)',
      '- Only ONE correct answer per question',
      '- Distractors must be plausible, not obviously wrong',
      '- Stem must be a complete clinical vignette or conceptual scenario',
      '',
      'Format EVERY question exactly like this (no deviations):',
      '',
      '**Q' + startQ + '.** [complete stem - full sentence]',
      '**Bloom:** ' + levelForBatch,
      'A) [option]',
      'B) [option]',
      'C) [option]',
      'D) [option]',
      '**Answer:** [letter]) [one-sentence reason]',
      '**Explanation:** [2-3 sentences: mechanism, why correct, why main distractor is wrong]',
      '',
      '---',
      '',
      'Generate all ' + batchN + ' questions now.',
    ];

    try {
      const result = await sendChatRequest([{ role: 'user', content: promptLines.join('\n') }], { solveAll: true });
      if (!result.ok) throw new Error((result.data && result.data.error) || 'AI error');
      const parsed = parseAIQuestions(result.data.reply, assessItems.length);
      assessItems.push(...parsed);
    } catch (err) {
      assessGenLabel.textContent = 'Batch ' + (b + 1) + ' failed: ' + err.message + '. Continuing...';
      await new Promise(r => setTimeout(r, 1200));
    }
    if (b < batches - 1) await new Promise(r => setTimeout(r, 700));
  }

  assessGenBar.style.width = '100%';
  assessGenLabel.textContent = assessItems.length + ' questions ready!';

  if (!assessItems.length) {
    assessGenStatus.classList.add('hidden');
    assessStartBtn.disabled = false;
    alert('Could not generate any questions. Try a different topic or fewer questions.');
    return;
  }

  await new Promise(r => setTimeout(r, 500));
  assessGenStatus.classList.add('hidden');
  assessStartBtn.disabled = false;
  assessTopic = assessSetupTitle.textContent;
  showQuizScreen();
}

// -- Quiz screen --
function showQuizScreen() {
  showAssessScreen('quiz');
  assessQuizTitle.textContent = assessTopic || 'Quiz';
  assessQuizScroll.scrollTop = 0;

  const levels = [...new Set(assessItems.map(i => i.bloomLevel).filter(Boolean))];
  assessQuizBloom.textContent = levels.length ? ("Bloom's: " + levels.map(bloomLabel).join(' - ')) : '';

  renderAllQuestions();
  updateAnsweredCount();
  // Start timer if timed mode enabled
  startQuizTimer();
}

function renderAllQuestions() {
  assessQuizScroll.innerHTML = '';
  assessItems.forEach((item, idx) => {
    const block = document.createElement('div');
    block.className = 'quiz-question-block';
    block.id = 'qq-' + idx;

    const bloomTag = item.bloomLevel
      ? '<span class="bloom-tag bloom-' + item.bloomLevel + '">' + bloomLabel(item.bloomLevel) + '</span>'
      : '';

    const optsHtml = (item.options || []).map(opt =>
      '<button type="button" class="quiz-opt-btn" data-idx="' + idx + '" data-letter="' + opt.letter + '">' +
      '<span class="quiz-opt-letter">' + opt.letter + '</span>' +
      '<span class="quiz-opt-text">' + escapeHtml(opt.text) + '</span>' +
      '</button>'
    ).join('');

    block.innerHTML =
      '<div class="quiz-q-header">' +
        '<span class="quiz-q-num">Q' + item.num + '</span>' +
        bloomTag +
        '<button class="btn-ghost btn-xs quiz-bookmark-btn" data-idx="' + idx + '" title="Bookmark">bookmark</button>' +
      '</div>' +
      '<div class="quiz-q-stem">' + escapeHtml(item.stem || '(No stem)') + '</div>' +
      '<div class="quiz-q-options" id="opts-' + idx + '">' + optsHtml + '</div>';

    assessQuizScroll.appendChild(block);
  });

  assessQuizScroll.querySelectorAll('.quiz-opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.idx);
      const letter = btn.dataset.letter;
      assessAnswers[idx] = letter;
      document.querySelectorAll('#opts-' + idx + ' .quiz-opt-btn').forEach(b => {
        b.classList.toggle('selected', b.dataset.letter === letter);
      });
      document.getElementById('qq-' + idx).classList.add('answered');
      updateAnsweredCount();
    });
  });

  assessQuizScroll.querySelectorAll('.quiz-bookmark-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = Number(btn.dataset.idx);
      const item = assessItems[idx];
      try {
        await fetch('/api/study/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            runId: assessRunId,
            questionNum: item.num,
            stem: item.stem || '',
            correctLetter: item.correctLetter || null,
            explanation: item.explanation || '',
          }),
        });
        btn.textContent = 'saved';
        btn.disabled = true;
      } catch(e) {}
    });
  });
}

function updateAnsweredCount() {
  const answered = Object.keys(assessAnswers).length;
  const total = assessItems.length;
  assessAnsweredCount.textContent = answered + ' / ' + total + ' answered';
  const pct = total ? (answered / total) * 100 : 0;
  assessProgressFill.style.width = pct + '%';
  assessSubmitBtn.disabled = answered === 0;
  if (answered === total && total > 0) {
    assessSubmitBtn.textContent = 'Submit Quiz';
    assessSubmitBtn.classList.add('ready');
  } else {
    assessSubmitBtn.textContent = 'Submit Quiz';
    assessSubmitBtn.classList.remove('ready');
  }
}

// -- Submit -> Results --
assessSubmitBtn.addEventListener('click', () => {
  const unanswered = assessItems.length - Object.keys(assessAnswers).length;
  if (unanswered > 0) {
    if (!confirm('You have ' + unanswered + ' unanswered question' + (unanswered > 1 ? 's' : '') + '. Submit anyway?')) return;
  }
  showAssessResults();
});

function showAssessResults() {
  let correct = 0;
  const byBloom = {};
  const wrongItems = [];

  assessItems.forEach((item, idx) => {
    const ans = assessAnswers[idx];
    const isCorrect = ans && item.correctLetter && ans.toLowerCase() === item.correctLetter.toLowerCase();
    if (isCorrect) correct++;
    else wrongItems.push({ item, idx, ans });

    if (item.bloomLevel) {
      if (!byBloom[item.bloomLevel]) byBloom[item.bloomLevel] = { correct: 0, total: 0 };
      byBloom[item.bloomLevel].total++;
      if (isCorrect) byBloom[item.bloomLevel].correct++;
    }
  });

  const total = assessItems.length;
  const pct = total ? Math.round((correct / total) * 100) : 0;
  const grade = pct >= 80 ? { label: 'Excellent', color: 'var(--teal)' }
              : pct >= 60 ? { label: 'Good',      color: 'var(--violet)' }
              : pct >= 40 ? { label: 'Fair',       color: '#f59e0b' }
              :             { label: 'Needs Work', color: 'var(--red)' };

  showAssessScreen('result');
  if (VIEWS.assessResult) VIEWS.assessResult.scrollTop = 0;

  assessScorePct.textContent = pct + '%';
  assessScorePct.style.color = grade.color;
  ringFill.style.stroke = grade.color;
  const offset = 314 - (pct / 100) * 314;
  requestAnimationFrame(() => {
    ringFill.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)';
    ringFill.style.strokeDashoffset = offset;
  });

  assessResultStats.innerHTML =
    '<div class="result-stat"><div class="result-stat-val" style="color:var(--teal)">' + correct + '</div><div class="result-stat-key">Correct</div></div>' +
    '<div class="result-stat"><div class="result-stat-val" style="color:var(--red)">' + (total - correct) + '</div><div class="result-stat-key">Incorrect</div></div>' +
    '<div class="result-stat"><div class="result-stat-val">' + total + '</div><div class="result-stat-key">Total</div></div>' +
    '<div class="result-stat"><div class="result-stat-val" style="color:' + grade.color + '">' + grade.label + '</div><div class="result-stat-key">Grade</div></div>';

  const bloomOrder = ['remember','understand','apply','analyze','evaluate','create'];
  const bRows = bloomOrder.filter(l => byBloom[l]).map(l => {
    const bc = byBloom[l].correct, bt = byBloom[l].total;
    const bp = Math.round((bc / bt) * 100);
    const col = bp >= 80 ? 'var(--teal)' : bp >= 60 ? 'var(--violet)' : bp >= 40 ? '#f59e0b' : 'var(--red)';
    return '<div class="bloom-result-row">' +
      '<span class="bloom-result-label bloom-' + l + '">' + bloomLabel(l) + '</span>' +
      '<div class="bloom-result-bar-wrap"><div class="bloom-result-bar" style="width:' + bp + '%;background:' + col + '"></div></div>' +
      '<span class="bloom-result-pct" style="color:' + col + '">' + bc + '/' + bt + '</span>' +
    '</div>';
  }).join('');
  assessBloomBreakdown.innerHTML = bRows
    ? '<div class="bloom-breakdown-head">Performance by Bloom\'s level</div>' + bRows
    : '';

  if (wrongItems.length) {
    const reviewHtml = wrongItems.map(function(wi) {
      const item = wi.item, ans = wi.ans;
      return '<div class="review-item ' + (!ans ? 'review-unanswered' : 'review-wrong') + '">' +
        '<div class="review-item-header">' +
          '<span class="review-q-num">Q' + item.num + '</span>' +
          (item.bloomLevel ? '<span class="bloom-tag bloom-' + item.bloomLevel + '">' + bloomLabel(item.bloomLevel) + '</span>' : '') +
          '<span class="review-verdict">' + (!ans ? 'Unanswered' : ('You: ' + ans.toUpperCase() + ' / Correct: ' + ((item.correctLetter || '?').toUpperCase()))) + '</span>' +
        '</div>' +
        '<div class="review-stem">' + escapeHtml(item.stem || '') + '</div>' +
        (item.explanation ? '<div class="review-expl">' + renderMd(item.explanation) + '</div>' : '') +
      '</div>';
    }).join('');
    assessResultReview.innerHTML = '<div class="review-head">Review: ' + wrongItems.length + ' to revisit</div>' + reviewHtml;
  } else {
    assessResultReview.innerHTML = '<div class="review-head" style="color:var(--teal)">Perfect score - nothing to review!</div>';
  }

  // Stop timer if running
  stopQuizTimer();

  // Show XP earned
  const xpEarned = correct * 10 + (correct === total && total > 0 ? 20 : 0);
  const xpEarnedEl = document.getElementById('assessXpEarned');
  const xpEarnedText = document.getElementById('assessXpEarnedText');
  if (xpEarned > 0 && xpEarnedEl && xpEarnedText) {
    xpEarnedText.textContent = '+' + xpEarned + ' XP earned!';
    xpEarnedEl.hidden = false;
    // Refresh XP bar
    loadXP();
  } else if (xpEarnedEl) {
    xpEarnedEl.hidden = true;
  }

  // Wire export button
  const exportBtn = document.getElementById('assessResultExportBtn');
  if (exportBtn) {
    exportBtn.onclick = () => exportAssessResultsCSV(assessItems, assessAnswers);
  }
}

assessRetryBtn.addEventListener('click', () => {
  assessAnswers = {};
  showQuizScreen();
});

// -- Parser --
function parseAIQuestions(text, offset) {
  offset = offset || 0;
  const items = [];
  const blocks = text.split(/\n---+\n|\n(?=\*\*Q\d+\.?\*\*)/g).filter(b => b.trim());
  for (const block of blocks) {
    const stemMatch = block.match(/\*\*Q\d+\.?\*\*\s*([\s\S]+?)(?=\n\*\*Bloom|\nA\))/);
    if (!stemMatch) continue;
    const stem = stemMatch[1].replace(/\n/g,' ').trim();
    if (!stem) continue;

    const bloomMatch = block.match(/\*\*Bloom:\*\*\s*(\w+)/i);
    const bloomLevel = bloomMatch ? bloomMatch[1].toLowerCase() : null;

    const opts = [];
    const optMatches = [...block.matchAll(/^([A-D])\)\s*(.+)$/gm)];
    for (const m of optMatches) opts.push({ letter: m[1], text: m[2].trim() });

    const ansMatch = block.match(/\*\*Answer:\*\*\s*([A-D])/i);
    const explMatch = block.match(/\*\*Explanation:\*\*\s*([\s\S]+?)(?=\n---|\n\*\*Q|$)/i);

    if (!ansMatch || opts.length < 2) continue;
    items.push({
      num: offset + items.length + 1,
      stem,
      bloomLevel,
      options: opts,
      correctLetter: ansMatch[1].toUpperCase(),
      explanation: explMatch ? explMatch[1].trim() : '',
    });
  }
  return items;
}





// ---------------------------------------------------------------------
// Chat log rendering
// ---------------------------------------------------------------------
function appendMessage(role, text, isError, attachmentNames) {
  if (companionEmpty) companionEmpty.remove();

  const wrap = document.createElement('div');
  wrap.className = `msg ${role === 'user' ? 'msg-user' : 'msg-assistant'}${isError ? ' is-error' : ''}`;

  if (role !== 'user') {
    const meta = document.createElement('div');
    meta.className = 'msg-meta';
    meta.textContent = isError ? 'Error' : 'MedPass Companion';
    wrap.appendChild(meta);
  }

  if (attachmentNames && attachmentNames.length) {
    const meta = document.createElement('div');
    meta.className = 'msg-meta';
    meta.textContent = `📎 ${attachmentNames.join(', ')}`;
    wrap.appendChild(meta);
  }

  const body = document.createElement('div');
  body.className = 'msg-body';
  if (role === 'assistant' && !isError) {
    body.innerHTML = renderMd(text);
  } else {
    body.textContent = text;
  }
  wrap.appendChild(body);

  if (role === 'assistant' && !isError) {
    const copyBtn = document.createElement('button');
    copyBtn.className = 'msg-copy-btn';
    copyBtn.textContent = 'Copy';
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.textContent = 'Copied!';
        copyBtn.classList.add('copied');
        setTimeout(() => { copyBtn.textContent = 'Copy'; copyBtn.classList.remove('copied'); }, 1800);
      });
    });
    wrap.appendChild(copyBtn);
  }

  companionChatLog.appendChild(wrap);
  companionChatLog.scrollTop = companionChatLog.scrollHeight;
  return wrap;
}

function appendTyping() {
  const wrap = document.createElement('div');
  wrap.className = 'msg msg-assistant';
  wrap.innerHTML = '<div class="msg-meta">MedPass Companion</div><span class="typing-dots"><span></span><span></span><span></span></span>';
  companionChatLog.appendChild(wrap);
  companionChatLog.scrollTop = companionChatLog.scrollHeight;
  return wrap;
}

// auto-grow textarea
input.addEventListener('input', () => {
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 160) + 'px';
});

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    composer.requestSubmit();
  }
});

// ---------------------------------------------------------------------
// Send
// ---------------------------------------------------------------------
async function sendChatRequest(messages, opts = {}) {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ messages, ...opts }),
  });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}

/**
 * Sends a large attachment as a sequence of smaller requests instead of one
 * oversized message, pacing each send using Groq's live rate-limit info.
 * Each part is shown in the chat log and appended to `history` as it
 * completes, so the conversation reads the same way a normal multi-turn
 * exchange would. A failed part is reported inline and the batch continues
 * with the next part rather than aborting the whole run.
 */
async function runBatchedSend(chunks, baseInstruction, attachmentNames) {
  batchCancelRequested = false;
  const total = chunks.length;
  sendBtn.disabled = true;
  attachBtn.disabled = true;
  showBatchStatus(1, total);
  try { await _runBatchedSendInner(chunks, baseInstruction, attachmentNames, total); }
  finally {
    hideBatchStatus();
    sendBtn.disabled = false;
    attachBtn.disabled = false;
    input.focus();
  }
}

async function _runBatchedSendInner(chunks, baseInstruction, attachmentNames, total) {

  let lastRateLimit = null;

  for (let i = 0; i < total; i++) {
    if (batchCancelRequested) {
      appendMessage('assistant', `Batch cancelled — sent ${i} of ${total} parts.`, true);
      break;
    }

    const partLabel = `Part ${i + 1}/${total}`;
    showBatchStatus(i + 1, total, `Processing ${partLabel}…`);

    const instruction = i === 0
      ? (baseInstruction || 'Review the attached material below and summarize the key points, then highlight anything especially important for exam prep.')
      : `Continuing the same attached document (${partLabel}). Apply this instruction to this portion: ${baseInstruction || 'review and summarize the key points, highlighting anything especially important for exam prep.'}`;
    const content = `[${partLabel}]\n\n${instruction}\n\n${chunks[i]}`;

    appendMessage('user', `(attachment batch — ${partLabel})`, false, i === 0 ? attachmentNames : []);

    // --- Retry loop for this part ---
    let result = null;
    let succeeded = false;
    for (let attempt = 0; attempt <= BATCH_MAX_RETRIES; attempt++) {
      if (batchCancelRequested) break;

      const typingEl = appendTyping();
      try {
        result = await sendChatRequest([{ role: 'user', content }]);
      } catch {
        typingEl.remove();
        const isLastAttempt = attempt >= BATCH_MAX_RETRIES;
        if (isLastAttempt || batchCancelRequested) {
          appendMessage('assistant', `Network error on ${partLabel} — skipping and continuing.`, true);
          break;
        }
        const waitMs = 3000 * (attempt + 1);
        showBatchStatus(i + 1, total, `${partLabel} network error — retrying in ${Math.round(waitMs / 1000)}s…`);
        await sleep(waitMs);
        continue;
      }
      typingEl.remove();

      // Success
      if (result.ok) {
        appendMessage('assistant', result.data.reply);
        history.push({ role: 'user', content }, { role: 'assistant', content: result.data.reply });
        persistChatMessages([{ role: 'user', content }, { role: 'assistant', content: result.data.reply }]);
        lastRateLimit = result.data.rateLimit;
        succeeded = true;
        break;
      }

      // Rate-limited (429) or transient server error — retry if attempts remain
      const isRateLimit = result.status === 429 ||
        (result.status === 502 && result.data && /rate.?limit|too many|429/i.test(result.data.error || ''));
      const canRetry = isRateLimit && attempt < BATCH_MAX_RETRIES && !batchCancelRequested;

      if (canRetry) {
        const waitMs = computeRetryWaitMs(result, attempt);
        const waitSec = Math.round(waitMs / 1000);
        showBatchStatus(i + 1, total, `${partLabel} rate-limited — retrying in ${waitSec}s (attempt ${attempt + 1}/${BATCH_MAX_RETRIES})…`);
        await sleep(waitMs);
        // continue retry loop
      } else {
        // Non-retryable error or exhausted retries — report and move on
        const message = (result.data && result.data.error) || `Request failed (${result.status}).`;
        const retryNote = attempt > 0 ? ` (failed after ${attempt + 1} attempts)` : '';
        appendMessage('assistant', `${partLabel} failed${retryNote}: ${message}`, true);
        lastRateLimit = result.data && result.data.rateLimit;
        break;
      }
    }
    // --- End retry loop ---

    if (batchCancelRequested) break;

    if (i < total - 1) {
      // Always pace before the next part — whether this part succeeded or failed.
      // After a failure we use a generous fixed delay so we don't immediately
      // hammer Groq again; after success we use the live rate-limit headers.
      const waitMs = succeeded
        ? computeBatchWaitMs(lastRateLimit, chunks[i + 1])
        : DEFAULT_BATCH_DELAY_MS * 3;
      const label = succeeded ? `${partLabel} done — pacing next request…` : `${partLabel} skipped — waiting before next part…`;
      showBatchStatus(i + 1, total, label);
      await sleep(waitMs);
    }
  }

}

// ---------------------------------------------------------------------
// Solve All & Download — processes all chunks silently, downloads PDF
// with questions + answers + explanations shown together
// ---------------------------------------------------------------------

/**
 * Find inline option markers (a. / b) / c. etc.) inside a block of text,
 * in strict a→b→c→d→e sequence, optionally followed by a trailing question
 * number that starts the NEXT question. Source compilations commonly run
 * everything on one continuous line with no real newlines (typical of text
 * extracted from a PDF), e.g.:
 *   "1. Tone change in UMN lesion: a. cog wheel rigidity b. flaccidity
 *    c. myoclonia d. spasticity 2. Muscular wasting develops in: a. ..."
 * so option markers can't be required to start a new line, and the next
 * question number can immediately follow the last option's text with no
 * delimiter. To avoid false positives (e.g. "e.g.", a stray letter, a
 * number embedded in option text like "Type 1 diabetes"), each option
 * marker must be preceded by whitespace/start and followed by whitespace,
 * and we only ever search for the NEXT expected letter in sequence.
 * Returns { letter, start, end } markers in the order found.
 */
function findInlineOptionMarkers(text) {
  const letters = ['a', 'b', 'c', 'd', 'e'];
  const markers = [];
  let searchFrom = 0;
  let nextIdx = 0;
  while (nextIdx < letters.length) {
    const letter = letters[nextIdx];
    const re = new RegExp(`(^|[\\s(])(${letter})[.)]\\s`, 'i');
    const slice = text.slice(searchFrom);
    const m = slice.match(re);
    if (!m) break;
    const markerStart = searchFrom + m.index + m[1].length;
    const markerEnd = markerStart + m[2].length + 1;
    markers.push({ letter, start: markerStart, end: markerEnd });
    searchFrom = markerEnd;
    nextIdx++;
  }
  return markers;
}

/**
 * Split raw source text into per-question chunks. Tries the simple
 * "question number at start of a line" boundary first (works for
 * cleanly-formatted text with real line breaks). If that only finds one
 * question but the text clearly contains more (heuristic: more than one
 * "<digits>[.)]" preceded by whitespace appears in the text), falls back to
 * an option-sequence-aware split: a new question starts wherever a number
 * immediately follows the end of a completed a→...→(d or e) option run.
 */
function splitIntoQuestionParts(chunkText) {
  const lineBoundary = /(?=^\s*(?:Q\.?\s*)?\d{1,3}[.)]\s)/gm;
  const lineParts = chunkText.split(lineBoundary).map((s) => s.trim()).filter(Boolean);
  const looksLikeMultiple = (chunkText.match(/(?:^|\s)\d{1,3}[.)]\s/g) || []).length > 1;
  if (lineParts.length > 1 || !looksLikeMultiple) return lineParts;

  // Fallback: inline split — find every "<number>[.)] " preceded by
  // whitespace/start, and treat each occurrence as a new question start.
  const numRe = /(?:^|\s)((?:Q\.?\s*)?\d{1,3})[.)]\s/g;
  const starts = [];
  let m;
  while ((m = numRe.exec(chunkText))) {
    const numStart = m.index + (m[0].length - m[0].trimStart().length);
    starts.push(numStart);
  }
  if (starts.length === 0) return lineParts;
  const parts = [];
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i];
    const end = i + 1 < starts.length ? starts[i + 1] : chunkText.length;
    const candidate = chunkText.slice(start, end).trim();
    if (candidate) parts.push(candidate);
  }
  return parts.length > 0 ? parts : lineParts;
}

/**
 * Parse source chunk into question objects.
 * Each: { num, stem, options: [{letter, text}] }
 * Handles BOTH layouts:
 *  - options each on their own line
 *  - options run inline on the same line as the stem ("a. ... b. ... c. ...")
 *    with no real line breaks between questions at all
 */
function parseSourceQuestions(chunkText) {
  const parts = splitIntoQuestionParts(chunkText);
  return parts.map((part) => {
    const numMatch = part.match(/^\s*(?:Q\.?\s*)?(\d{1,3})[.)]\s*/);
    const num = numMatch ? parseInt(numMatch[1], 10) : 0;
    const rest = part.replace(/^\s*(?:Q\.?\s*)?\d{1,3}[.)]\s*/, '');

    const markers = findInlineOptionMarkers(rest);
    let stem;
    const options = [];
    if (markers.length >= 2) {
      stem = rest.slice(0, markers[0].start).trim();
      for (let i = 0; i < markers.length; i++) {
        const textStart = markers[i].end;
        const textEnd = i + 1 < markers.length ? markers[i + 1].start : rest.length;
        options.push({ letter: markers[i].letter, text: rest.slice(textStart, textEnd).trim() });
      }
    } else {
      // Fallback: original line-start-anchored layout
      const optionBoundary = /(?=^\s*[a-eA-E][.)]\s)/gm;
      const sections = rest.split(optionBoundary).map((s) => s.trim()).filter(Boolean);
      stem = sections[0] || rest.trim();
      for (let i = 1; i < sections.length; i++) {
        const m2 = sections[i].match(/^\s*([a-eA-E])[.)]\s*([\s\S]*)/);
        if (m2) options.push({ letter: m2[1].toLowerCase(), text: m2[2].trim() });
      }
    }
    return { num, stem, options };
  });
}

/**
 * Split AI reply text into one chunk per answered question. Tries the
 * simple line-start boundary first; if the model happened to run multiple
 * answers together with no real line break, falls back to splitting at
 * every "<number>[.):]" occurrence preceded by whitespace.
 */
function splitIntoAnswerParts(replyText) {
  const lineBoundary = /(?=^\s*(?:Q\.?\s*)?\d{1,3}[.):\s])/gm;
  const lineParts = replyText.split(lineBoundary).map((s) => s.trim()).filter(Boolean);
  const looksLikeMultiple = (replyText.match(/(?:^|\s)\d{1,3}[.):]/g) || []).length > 1;
  if (lineParts.length > 1 || !looksLikeMultiple) return lineParts;

  const numRe = /(?:^|\s)((?:Q\.?\s*)?\d{1,3})[.):\s]/g;
  const starts = [];
  let m;
  while ((m = numRe.exec(replyText))) {
    const numStart = m.index + (m[0].length - m[0].trimStart().length);
    starts.push(numStart);
  }
  if (starts.length === 0) return lineParts;
  const parts = [];
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i];
    const end = i + 1 < starts.length ? starts[i + 1] : replyText.length;
    const candidate = replyText.slice(start, end).trim();
    if (candidate) parts.push(candidate);
  }
  return parts.length > 0 ? parts : lineParts;
}

/**
 * Parse AI reply into answer blocks.
 * Each: { num, correctLetter, explanation }
 */
function parseAnswerBlocks(replyText) {
  const blocks = [];
  const parts = splitIntoAnswerParts(replyText);
  for (const part of parts) {
    const numMatch = part.match(/^\s*(?:Q\.?\s*)?(\d{1,3})[.):\s]/);
    if (!numMatch) continue;
    const num = parseInt(numMatch[1], 10);
    const body = part.replace(/^\s*(?:Q\.?\s*)?\d{1,3}[.):\s]*/, '').trim();
    const answerMatch = body.match(/(?:answer|correct)[:\s]+([a-eA-E])\b/i)
      || body.match(/^([a-eA-E])[.):\s]/i)
      || body.match(/\b([a-eA-E])\s+is\s+(?:correct|right)/i)
      || body.match(/^([a-eA-E])\s*$/i); // bare single-letter reply (e.g. verification pass "1. A")
    const correctLetter = answerMatch ? answerMatch[1].toLowerCase() : null;
    let explanation = body;
    const explMatch = body.match(/explanation[:\s]+([\s\S]+)/i);
    if (explMatch) {
      explanation = explMatch[1].trim();
    } else {
      explanation = body.replace(/^[^\n]+\n/, '').trim() || body;
    }
    blocks.push({ num, correctLetter, explanation });
  }
  return blocks;
}

/**
 * Build a normalized per-question items array from a completed Solve All run,
 * mirroring the logic used to render the PDF. Used for persisting run history.
 */
function buildStudyRunItems(partResults, verificationMap) {
  verificationMap = verificationMap || {};
  const items = [];
  for (const part of partResults) {
    // Parts are pushed as { chunk, reply } (reply is null on failure) —
    // not { success, source, answer }. A part "succeeded" iff it has a reply.
    if (!part.reply) continue;
    const sourceQs = parseSourceQuestions(part.chunk || '');
    const answerBlocks = parseAnswerBlocks(part.reply || '');
    const ansMap = {};
    for (const ab of answerBlocks) ansMap[ab.num] = ab;
    for (const sq of sourceQs) {
      const num = sq.num;
      const ans = ansMap[num];
      const isUnanswered = !ans || !ans.correctLetter;
      const verification = verificationMap[num];
      const hasDisagreement = !isUnanswered && verification &&
        verification.letter && verification.letter.toLowerCase() !== (ans.correctLetter || '').toLowerCase();
      items.push({
        num,
        stem: sq.stem || '',
        options: Array.isArray(sq.options) ? sq.options : [],
        correctLetter: ans ? (ans.correctLetter || null) : null,
        explanation: ans ? (ans.explanation || '') : '',
        isUnanswered,
        disagreement: hasDisagreement ? { letter: verification.letter } : null,
      });
    }
  }
  return items;
}

/**
 * Persist a completed Solve All run to the server (best-effort, non-blocking).
 * Failures are logged to the console but do not disrupt the PDF download.
 */
async function saveStudyRun(attachmentName, items, sourceType) {
  try {
    const res = await fetch('/api/study/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentName: attachmentName || 'Untitled', items, sourceType: sourceType || 'questions' }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn('Failed to save study run:', body.error || res.status);
    }
    const data = await res.json().catch(() => ({}));
    return data.run?.id || null;
  } catch (err) {
    console.warn('Could not persist study run:', err.message);
    return null;
  }
}

/**
 * Generate exam-style PDF.
 * For each question: number + stem, options a/b/c/d (correct one highlighted), explanation.
 */
function generateAnswersPdf(attachmentName, partResults, verificationMap) {
  verificationMap = verificationMap || {};
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  const PW = doc.internal.pageSize.getWidth();   // 595
  const PH = doc.internal.pageSize.getHeight();  // 842
  const ML = 50, MR = 50, MT = 50, MB = 50;
  const CW = PW - ML - MR;

  // ── Palette ──────────────────────────────────────────────────────────
  const NAVY       = [12,  40,  90];
  const CYAN       = [0,  175, 215];
  const WHITE      = [255, 255, 255];
  const OFFWHITE   = [248, 249, 252];
  const GRAY_LINE  = [220, 225, 235];
  const GRAY_TEXT  = [80,  90, 105];
  const DARK_TEXT  = [20,  25,  35];
  const GREEN_BG   = [232, 250, 238];
  const GREEN_BD   = [30,  160,  80];
  const GREEN_TX   = [15,  110,  50];
  const WRONG_TX   = [130, 140, 155];
  const EXPL_BG    = [240, 245, 255];
  const EXPL_BD    = [185, 210, 240];
  const EXPL_LBL   = [80, 120, 185];
  const WARN_BG    = [255, 247, 230];
  const WARN_BD    = [235, 175, 60];
  const WARN_TX    = [150, 100, 10];
  const FLAG_BG    = [253, 235, 235];
  const FLAG_BD    = [210, 90, 90];
  const FLAG_TX    = [155, 35, 35];

  let y = MT;
  let pageNum = 0;

  function sf(size, style) {
    doc.setFontSize(size);
    doc.setFont('helvetica', style || 'normal');
  }
  function sc(rgb) { doc.setTextColor(...rgb); }
  function fc(rgb) { doc.setFillColor(...rgb); }
  function dc(rgb, w) { doc.setDrawColor(...rgb); doc.setLineWidth(w || 0.5); }
  function wrapText(text, maxW, size, style) {
    sf(size || 10, style || 'normal');
    return doc.splitTextToSize(String(text || '').trim(), maxW);
  }
  function lineH(lines, lh) { return lines.length * (lh || 14); }

  function newPage() {
    // The cover page already consumes the first physical PDF page (it's
    // drawn directly via doc.rect()/doc.text() before any newPage() call,
    // with no doc.addPage()). So every call to newPage() — including the
    // very first one, for the first content page — must add a fresh page.
    // Previously this only ran when pageNum > 0, which skipped addPage()
    // on that first call and drew the whole first content page directly
    // on top of the cover page.
    doc.addPage();
    pageNum++;
    y = MT;
    // Thin top accent bar
    fc(CYAN); doc.rect(0, 0, PW, 4, 'F');
    // Header text
    sf(7.5, 'bold'); sc(CYAN);
    doc.text('MEDPASS', ML, 18);
    sf(7.5, 'normal'); sc(GRAY_TEXT);
    doc.text('Answer Key & Explanations', ML + 46, 18);
    sf(7.5, 'normal'); sc(GRAY_TEXT);
    doc.text(`Page ${pageNum}`, PW - MR, 18, { align: 'right' });
    // Header rule
    dc(GRAY_LINE, 0.4);
    doc.line(ML, 24, PW - MR, 24);
    y = 42;
  }

  function checkPage(needed) {
    if (y + needed > PH - MB) newPage();
  }

  // ── COVER PAGE ───────────────────────────────────────────────────────
  // Full navy background
  fc(NAVY); doc.rect(0, 0, PW, PH, 'F');

  // Cyan accent strip left edge
  fc(CYAN); doc.rect(0, 0, 6, PH, 'F');

  // Brand
  sf(11, 'bold'); sc(CYAN);
  doc.text('MED', 30, 80);
  sf(11, 'bold'); sc(WHITE);
  doc.text('PASS', 30 + doc.getTextWidth('MED'), 80);

  // Big title block
  sf(32, 'bold'); sc(WHITE);
  doc.text('Answer Key &', ML, 200);
  doc.text('Explanations', ML, 242);

  // Cyan rule under title
  fc(CYAN); doc.rect(ML, 258, 60, 3, 'F');

  // Document name
  const baseName = attachmentName ? attachmentName.replace(/\.[^.]+$/, '') : 'Document';
  const nameLines = wrapText(baseName, CW - 20, 12, 'normal');
  sf(12, 'normal'); sc([160, 195, 225]);
  doc.text(nameLines, ML, 286, { lineHeightFactor: 1.5 });

  // Date
  const now = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
  sf(9, 'normal'); sc([100, 135, 165]);
  doc.text(`Generated ${now}`, ML, 286 + lineH(nameLines, 18) + 14);

  // Question count badge
  let totalQs = 0;
  for (const pr of partResults) {
    if (pr.reply) totalQs += parseAnswerBlocks(pr.reply).length;
  }
  // Count how many answered questions the verification pass disagreed
  // with, so it's visible on the cover before digging into individual pages.
  let disagreementCount = 0;
  for (const pr of partResults) {
    if (!pr.reply) continue;
    for (const ab of parseAnswerBlocks(pr.reply)) {
      const v = verificationMap[ab.num];
      if (ab.correctLetter && v && v.letter && v.letter.toLowerCase() !== ab.correctLetter.toLowerCase()) {
        disagreementCount++;
      }
    }
  }
  if (totalQs > 0) {
    const badgeY = PH - 160;
    fc([0, 50, 100]); doc.roundedRect(ML, badgeY, 130, 70, 6, 6, 'F');
    sf(36, 'bold'); sc(CYAN);
    doc.text(String(totalQs), ML + 65, badgeY + 44, { align: 'center' });
    sf(8, 'normal'); sc([130, 170, 205]);
    doc.text('QUESTIONS ANSWERED', ML + 65, badgeY + 60, { align: 'center' });

    if (disagreementCount > 0) {
      const badge2X = ML + 130 + 14;
      fc([90, 30, 30]); doc.roundedRect(badge2X, badgeY, 130, 70, 6, 6, 'F');
      sf(36, 'bold'); sc([235, 130, 130]);
      doc.text(String(disagreementCount), badge2X + 65, badgeY + 44, { align: 'center' });
      sf(8, 'normal'); sc([220, 170, 170]);
      doc.text('FLAGGED FOR REVIEW', badge2X + 65, badgeY + 60, { align: 'center' });
    }
  }

  // ── CONTENT PAGES ────────────────────────────────────────────────────
  newPage();

  for (let pi = 0; pi < partResults.length; pi++) {
    const { chunk, reply, truncated: partTruncated } = partResults[pi];
    if (!reply) continue;

    const sourceQs    = parseSourceQuestions(chunk);
    const answerBlocks = parseAnswerBlocks(reply);
    const answerMap   = {};
    for (const ab of answerBlocks) answerMap[ab.num] = ab;

    const items = sourceQs.length > 0
      ? sourceQs.map((q) => ({ q, ans: answerMap[q.num] || null }))
      : answerBlocks.map((ab) => ({ q: null, ans: ab }));

    for (const { q, ans } of items) {
      if (!q && !ans) continue;
      const num = q ? q.num : (ans ? ans.num : '?');
      // Flag this question if no answer was found for it at all, or if it
      // came from a part whose reply was truncated by the model's token
      // budget (meaning even questions that DID get text back may be
      // incomplete/unreliable for this part).
      const isUnanswered = !ans || !ans.correctLetter;
      const isFromTruncatedPart = Boolean(partTruncated);

      // Independent second-opinion check: did the verification pass (a
      // different, larger model) pick a different letter than the main
      // answer? Only meaningful when both passes actually produced a letter.
      const verification = verificationMap[num];
      const hasDisagreement = !isUnanswered && verification && verification.letter
        && verification.letter.toLowerCase() !== ans.correctLetter.toLowerCase();

      // Estimate total block height for smart page break
      const stemLines = q ? wrapText(q.stem, CW - 18, 11, 'normal') : [];
      const optRows   = q ? q.options.map((o) => wrapText(`${o.letter.toUpperCase()}.  ${o.text}`, CW - 60, 10, 'normal')) : [];
      const explLines = ans ? wrapText(ans.explanation, CW - 24, 10, 'normal') : [];
      const warnLines = (isUnanswered || isFromTruncatedPart)
        ? wrapText(
            isUnanswered
              ? 'No answer was found for this question — the AI response may have skipped it. Consider re-running "Solve All" or asking about this question individually.'
              : 'This question was part of a response that got cut off before finishing. The answer/explanation above may be incomplete — double-check it.',
            CW - 24, 9, 'normal'
          )
        : [];
      const flagLines = hasDisagreement
        ? wrapText(
            `Two independent models disagreed on this one: the main answer above is ${ans.correctLetter.toUpperCase()}, but a second check suggested ${verification.letter.toUpperCase()} instead. Worth verifying against your notes/textbook before trusting either.`,
            CW - 24, 9, 'normal'
          )
        : [];
      const totalH    = 28 + (stemLines.length > 0 ? lineH(stemLines, 15) + 20 : 0)
                           + optRows.reduce((s, r) => s + lineH(r, 14) + 8, 0)
                           + (explLines.length > 0 ? lineH(explLines, 14) + 36 : 0)
                           + (warnLines.length > 0 ? lineH(warnLines, 13) + 28 : 0)
                           + (flagLines.length > 0 ? lineH(flagLines, 13) + 28 : 0)
                           + 24;
      checkPage(Math.min(totalH, PH - MT - MB - 60));

      // ── Question number pill ──
      const pillW = 32, pillH = 18;
      fc(NAVY); dc(CYAN, 0.8);
      doc.roundedRect(ML, y, pillW, pillH, 4, 4, 'FD');
      sf(8, 'bold'); sc(CYAN);
      doc.text(String(num), ML + pillW / 2, y + 12, { align: 'center' });
      y += pillH + 8;

      // ── Stem ──
      if (stemLines.length > 0) {
        const bH = lineH(stemLines, 15) + 16;
        fc(OFFWHITE); dc(GRAY_LINE, 0.4);
        doc.roundedRect(ML, y, CW, bH, 4, 4, 'FD');
        sf(11, 'normal'); sc(DARK_TEXT);
        doc.text(stemLines, ML + 10, y + 11, { lineHeightFactor: 1.45 });
        y += bH + 8;
      }

      // ── Options ──
      for (let oi = 0; oi < optRows.length; oi++) {
        const ol  = optRows[oi];
        const opt = q.options[oi];
        const isCorrect = ans && ans.correctLetter && opt.letter.toLowerCase() === ans.correctLetter.toLowerCase();
        const oH = lineH(ol, 14) + 12;
        checkPage(oH + 4);

        if (isCorrect) {
          fc(GREEN_BG); dc(GREEN_BD, 1.2);
        } else {
          fc(WHITE); dc(GRAY_LINE, 0.3);
        }
        doc.roundedRect(ML + 18, y, CW - 18, oH, 3, 3, 'FD');

        sf(10, isCorrect ? 'bold' : 'normal');
        sc(isCorrect ? GREEN_TX : WRONG_TX);
        doc.text(ol, ML + 30, y + 8 + 10 * 0.72, { lineHeightFactor: 1.4 });

        if (isCorrect) {
          // ✓ checkmark badge right side
          fc(GREEN_BD);
          doc.circle(ML + 18 + CW - 18 - 14, y + oH / 2, 7, 'F');
          sf(8, 'bold'); sc(WHITE);
          doc.text('✓', ML + 18 + CW - 18 - 14, y + oH / 2 + 3, { align: 'center' });
        }
        y += oH + 5;
      }
      if (optRows.length > 0) y += 6;

      // ── No parsed options fallback ──
      if (optRows.length === 0 && ans && ans.correctLetter) {
        const cl = wrapText(`Answer: ${ans.correctLetter.toUpperCase()}`, CW - 24, 10, 'bold');
        const bH = lineH(cl, 14) + 16;
        fc(GREEN_BG); dc(GREEN_BD, 1);
        doc.roundedRect(ML, y, CW, bH, 3, 3, 'FD');
        sf(10, 'bold'); sc(GREEN_TX);
        doc.text(cl, ML + 12, y + 11, { lineHeightFactor: 1.4 });
        y += bH + 8;
      }

      // ── Explanation ──
      if (explLines.length > 0) {
        const bH = lineH(explLines, 14) + 32;
        checkPage(bH + 10);
        fc(EXPL_BG); dc(EXPL_BD, 0.5);
        doc.roundedRect(ML, y, CW, bH, 4, 4, 'FD');
        // Left accent bar
        fc(EXPL_LBL);
        doc.roundedRect(ML, y, 3, bH, 1, 1, 'F');
        sf(7, 'bold'); sc(EXPL_LBL);
        doc.text('EXPLANATION', ML + 12, y + 12);
        sf(10, 'normal'); sc(DARK_TEXT);
        doc.text(explLines, ML + 12, y + 24, { lineHeightFactor: 1.5 });
        y += bH + 14;
      }

      // ── Warning banner: unanswered or possibly-incomplete ──
      if (warnLines.length > 0) {
        const bH = lineH(warnLines, 13) + 26;
        checkPage(bH + 10);
        fc(WARN_BG); dc(WARN_BD, 0.7);
        doc.roundedRect(ML, y, CW, bH, 4, 4, 'FD');
        fc(WARN_BD);
        doc.roundedRect(ML, y, 3, bH, 1, 1, 'F');
        sf(7, 'bold'); sc(WARN_TX);
        doc.text(isUnanswered ? '⚠ NOT ANSWERED' : '⚠ MAY BE INCOMPLETE', ML + 12, y + 12);
        sf(9, 'normal'); sc(WARN_TX);
        doc.text(warnLines, ML + 12, y + 23, { lineHeightFactor: 1.45 });
        y += bH + 14;
      }

      // ── Disagreement flag: two models picked different answers ──
      if (flagLines.length > 0) {
        const bH = lineH(flagLines, 13) + 26;
        checkPage(bH + 10);
        fc(FLAG_BG); dc(FLAG_BD, 0.7);
        doc.roundedRect(ML, y, CW, bH, 4, 4, 'FD');
        fc(FLAG_BD);
        doc.roundedRect(ML, y, 3, bH, 1, 1, 'F');
        sf(7, 'bold'); sc(FLAG_TX);
        doc.text('⚑ MODELS DISAGREED — VERIFY THIS ONE', ML + 12, y + 12);
        sf(9, 'normal'); sc(FLAG_TX);
        doc.text(flagLines, ML + 12, y + 23, { lineHeightFactor: 1.45 });
        y += bH + 14;
      }

      // ── Divider ──
      dc(GRAY_LINE, 0.3);
      doc.line(ML, y + 4, PW - MR, y + 4);
      y += 20;
    }
  }

  return doc;
}

async function runSolveAll(chunks, attachmentName) {
  batchCancelRequested = false;
  const total = chunks.length;
  sendBtn.disabled = true;
  attachBtn.disabled = true;
  solveAllBtn.disabled = true;
  input.readOnly = true;
  showBatchStatus(1, total);
  try {
    await _runSolveAllInner(chunks, attachmentName, total);
  } finally {
    hideBatchStatus();
    sendBtn.disabled = false;
    attachBtn.disabled = false;
    solveAllBtn.disabled = false;
    input.readOnly = false;
    updateComposerState();
  }
}

/**
 * Solves a list of (already-smaller) sub-chunks sequentially, recursing
 * further (halving again) if a sub-chunk's reply is itself truncated.
 * `depth` caps recursion so a single pathological question (one the model
 * can never answer within budget) can't loop forever — at depth limit we
 * just accept whatever came back, flagged as truncated, rather than retry
 * indefinitely.
 */
async function _solveSubChunks(subChunks, parentLabel, depth = 0) {
  const MAX_SPLIT_DEPTH = 4;
  const out = [];
  for (let j = 0; j < subChunks.length; j++) {
    if (batchCancelRequested) break;
    const subLabel = `${parentLabel} (split ${j + 1}/${subChunks.length})`;
    const instruction = `Continuing the same document (${subLabel}). Reply ONLY with: question number, Answer: [letter], Explanation: [3-5 sentences — mechanism/concept, why the correct answer fits, and why the most tempting wrong option(s) are incorrect]. No preamble.`;
    const content = `[${subLabel}]\n\n${instruction}\n\n${subChunks[j]}`;

    let result = null;
    for (let attempt = 0; attempt <= BATCH_MAX_RETRIES; attempt++) {
      if (batchCancelRequested) break;
      try {
        result = await sendChatRequest([{ role: 'user', content }], { solveAll: true });
      } catch {
        if (attempt >= BATCH_MAX_RETRIES) {
          out.push({ chunk: subChunks[j], reply: null, error: 'Network error — skipping this part.' });
          result = null;
          break;
        }
        await sleep(3000 * (attempt + 1));
        continue;
      }
      if (result.ok) break;
      const isRateLimit = result.status === 429 ||
        (result.status === 502 && result.data && /rate.?limit|too many|429/i.test(result.data.error || ''));
      if ((isRateLimit || result.status === 502) && attempt < BATCH_MAX_RETRIES && !batchCancelRequested) {
        await sleep(isRateLimit ? computeRetryWaitMs(result, attempt) : 4000 * (attempt + 1));
        continue;
      }
      out.push({ chunk: subChunks[j], reply: null, error: (result.data && result.data.error) || `Request failed (${result.status}).` });
      result = null;
      break;
    }

    if (!result || !result.ok) continue;

    if (result.data.truncated) {
      const units = splitIntoQuestionUnits(subChunks[j]);
      if (units.length > 1 && depth < MAX_SPLIT_DEPTH) {
        const mid = Math.ceil(units.length / 2);
        const nested = await _solveSubChunks(
          [units.slice(0, mid).join(' '), units.slice(mid).join(' ')],
          subLabel,
          depth + 1
        );
        out.push(...nested);
        continue;
      }
      // Can't split further (single question, or hit depth limit) — keep
      // what we got, flagged, rather than lose it silently.
      out.push({ chunk: subChunks[j], reply: result.data.reply, truncated: true, rateLimit: result.data.rateLimit });
      continue;
    }

    out.push({ chunk: subChunks[j], reply: result.data.reply, rateLimit: result.data.rateLimit });
    if (j < subChunks.length - 1 && !batchCancelRequested) {
      await sleep(computeBatchWaitMs(result.data.rateLimit, subChunks[j + 1]));
    }
  }
  return out;
}

/**
 * Independent second-opinion pass for Solve All. The fast model used for
 * the main pass (llama-3.1-8b-instant) is good for speed/cost but, being
 * small, can confidently pick a wrong answer on tricky medical questions.
 * This re-asks each already-answered chunk's SOURCE QUESTIONS ONLY (never
 * shows it pass 1's answer, to keep the second opinion independent) using
 * the larger reasoning model, requesting letters only — no explanations —
 * to keep this pass cheap relative to the main one.
 * Returns a map: { [questionNum]: { letter, model } } for every question
 * the verification model successfully answered. Caller compares this
 * against pass 1's answer per question; a mismatch means flag it.
 * Best-effort: if a verification request fails/times out for a chunk, that
 * chunk's questions are simply absent from the map (no flag either way) —
 * verification failing should never block or alter the original answer.
 */
async function _runVerificationPass(successfulParts) {
  const verificationMap = {};
  for (let i = 0; i < successfulParts.length; i++) {
    if (batchCancelRequested) break;
    const { chunk } = successfulParts[i];
    showBatchStatus(i + 1, successfulParts.length, `Double-checking part ${i + 1}/${successfulParts.length}…`);

    const instruction = `Independently solve each question below. Reply ONLY with, one line per question:\n[number]. [letter]\nNo explanations, no preamble, just the number and the correct letter for each question.`;
    const content = `${instruction}\n\n${chunk}`;

    let result = null;
    try {
      // solveAll: false (default) -> regular reasoning model (openai/gpt-oss-20b),
      // not the fast model used for the main pass — that's the whole point.
      result = await sendChatRequest([{ role: 'user', content }]);
    } catch {
      continue; // best-effort — skip this chunk's verification on network error
    }
    if (!result || !result.ok || !result.data || !result.data.reply) continue;

    // Reuse the same robust answer-block parser; explanation field will just
    // be empty/junk here since we asked for letters only, which is fine —
    // we only read correctLetter.
    const blocks = parseAnswerBlocks(result.data.reply);
    for (const b of blocks) {
      if (b.correctLetter) verificationMap[b.num] = { letter: b.correctLetter };
    }

    if (i < successfulParts.length - 1 && !batchCancelRequested) {
      await sleep(computeBatchWaitMs(result.data.rateLimit, successfulParts[i + 1].chunk));
    }
  }
  return verificationMap;
}

async function _runSolveAllInner(chunks, attachmentName, total) {
  // Collect { chunk, reply } pairs — keep chunk alongside reply so PDF can
  // show question text next to answer
  const partResults = [];
  let lastRateLimit = null;

  for (let i = 0; i < total; i++) {
    if (batchCancelRequested) break;

    const partLabel = `Part ${i + 1}/${total}`;
    showBatchStatus(i + 1, total, `Solving ${partLabel}…`);

    const instruction = i === 0
      ? `For each question below, reply ONLY with:\n1. Answer: [letter]\nExplanation: [3-5 sentences. State the underlying mechanism/concept, explain why the correct option fits it, and briefly say why the most tempting wrong option(s) are incorrect.]\nNo preamble, no extra text.`
      : `Continuing the same document (${partLabel}). Same format: question number, Answer: [letter], Explanation: [3-5 sentences — mechanism/concept, why the correct answer fits, and why the most tempting wrong option(s) are incorrect]. No preamble.`;
    const content = `[${partLabel}]\n\n${instruction}\n\n${chunks[i]}`;

    let result = null;
    let succeeded = false;
    for (let attempt = 0; attempt <= BATCH_MAX_RETRIES; attempt++) {
      if (batchCancelRequested) break;
      try {
        result = await sendChatRequest([{ role: 'user', content }], { solveAll: true });
      } catch (netErr) {
        // Network / timeout error — treat as retryable, not fatal
        const isLastAttempt = attempt >= BATCH_MAX_RETRIES;
        if (isLastAttempt || batchCancelRequested) {
          partResults.push({ chunk: chunks[i], reply: null, error: 'Network error — skipping this part.' });
          break;
        }
        const waitMs = 3000 * (attempt + 1);
        showBatchStatus(i + 1, total, `${partLabel} network error — retrying in ${Math.round(waitMs / 1000)}s…`);
        await sleep(waitMs);
        continue;
      }

      if (result.ok) {
        if (result.data.truncated) {
          // The reply was cut off before finishing every question in this
          // chunk (model hit its token budget). Don't accept it as-is —
          // that silently drops the questions after the cutoff with no
          // visible error. Split this chunk's questions in half and solve
          // each half separately instead; smaller chunks need less budget
          // per request and are much less likely to truncate.
          const units = splitIntoQuestionUnits(chunks[i]);
          if (units.length > 1) {
            const mid = Math.ceil(units.length / 2);
            const subChunks = [units.slice(0, mid).join(' '), units.slice(mid).join(' ')];
            showBatchStatus(i + 1, total, `${partLabel} answer was cut off — retrying as 2 smaller parts…`);
            const subResults = await _solveSubChunks(subChunks, partLabel);
            partResults.push(...subResults);
            lastRateLimit = subResults[subResults.length - 1]?.rateLimit || lastRateLimit;
            succeeded = true;
            break;
          }
          // Only one question in this "chunk" and it still got cut off —
          // nothing smaller to split into; accept what we got rather than
          // retry-looping forever, but flag it so the PDF can show it as
          // an incomplete explanation rather than silently dropping it.
          partResults.push({ chunk: chunks[i], reply: result.data.reply, truncated: true });
          lastRateLimit = result.data.rateLimit;
          succeeded = true;
          break;
        }
        partResults.push({ chunk: chunks[i], reply: result.data.reply });
        lastRateLimit = result.data.rateLimit;
        succeeded = true;
        break;
      }

      const isRateLimit = result.status === 429 ||
        (result.status === 502 && result.data && /rate.?limit|too many|429/i.test(result.data.error || ''));
      const canRetry = (isRateLimit || result.status === 502) && attempt < BATCH_MAX_RETRIES && !batchCancelRequested;

      if (canRetry) {
        const waitMs = isRateLimit ? computeRetryWaitMs(result, attempt) : 4000 * (attempt + 1);
        const reason = isRateLimit ? 'rate-limited' : 'server error';
        showBatchStatus(i + 1, total, `${partLabel} ${reason} — retrying in ${Math.round(waitMs / 1000)}s…`);
        await sleep(waitMs);
      } else {
        const errMsg = (result.data && result.data.error) || `Request failed (${result.status}).`;
        partResults.push({ chunk: chunks[i], reply: null, error: errMsg });
        break;
      }
    }

    if (batchCancelRequested) break;

    if (i < total - 1) {
      const waitMs = succeeded
        ? computeBatchWaitMs(lastRateLimit, chunks[i + 1])
        : DEFAULT_BATCH_DELAY_MS * 3;
      showBatchStatus(i + 1, total, `${partLabel} done — pacing…`);
      await sleep(waitMs);
    }
  }

  const successfulParts = partResults.filter((p) => p.reply);
  if (successfulParts.length === 0) {
    appendMessage('assistant', 'No answers were generated — batch may have been cancelled or all parts failed.', true);
    return;
  }

  // ── Verification pass ────────────────────────────────────────────────
  // The fast model (llama-3.1-8b-instant) used above is good for speed/cost
  // The fast solve model is great for throughput but can confidently pick
  // the wrong answer on tricky medical questions. Re-check every answered
  // question with the larger reasoning model — unless the user unchecked
  // the "Double-check answers" toggle to save API requests.
  let verificationMap = {};
  if (verifyToggle && verifyToggle.checked) {
    showBatchStatus(1, 1, 'Double-checking answers…');
    verificationMap = await _runVerificationPass(successfulParts);
  }

  // Persist this run to history (non-blocking — don't let a save failure
  // disrupt the PDF download the user is already waiting for).
  const runItems = buildStudyRunItems(partResults, verificationMap);
  saveStudyRun(attachmentName, runItems).catch(() => {});

  // Build and download the PDF
  showBatchStatus(1, 1, 'Generating PDF…');
  let pdfDownloadName;
  try {
    const pdfDoc = generateAnswersPdf(attachmentName, partResults, verificationMap);
    const baseName = attachmentName ? attachmentName.replace(/\.[^.]+$/, '') : 'answers';
    pdfDownloadName = `${baseName}_answers.pdf`;
    pdfDoc.save(pdfDownloadName);
  } catch (pdfErr) {
    console.error('PDF generation failed:', pdfErr);
    // Fallback: download as .txt
    const text = partResults.map((p, i) =>
      `=== Part ${i + 1} ===\n\n${p.reply || p.error || 'failed'}`
    ).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const baseName = attachmentName ? attachmentName.replace(/\.[^.]+$/, '') : 'answers';
    a.href = url;
    a.download = `${baseName}_answers.txt`;
    a.click();
    URL.revokeObjectURL(url);
    pdfDownloadName = a.download;
  }
  hideBatchStatus();

  const doneMsg = batchCancelRequested
    ? `Solve cancelled. ${successfulParts.length} of ${total} parts completed — PDF downloaded as "${pdfDownloadName}".`
    : `✓ All ${total} part(s) solved. PDF downloaded as "${pdfDownloadName}" with questions, answers & explanations.`;
  appendMessage('assistant', doneMsg);
}

solveAllBtn.addEventListener('click', async () => {
  const ready = attachments.filter((a) => a.status === 'ready' && a.kind === 'text');
  if (ready.length === 0) return;
  const docBlock = ready.map((a) => `--- ${a.name} ---\n${a.text}`).join('\n\n');
  const attachmentName = ready[0].name;
  const chunks = splitIntoChunks(docBlock, BATCH_CHUNK_CHARS);
  attachments = [];
  renderAttachments();
  await runSolveAll(chunks, attachmentName);
});

composer.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (input.readOnly) return; // doc attached — use Solve All instead
  const text = input.value.trim();
  const ready = attachments.filter((a) => a.status === 'ready');
  const pending = attachments.some((a) => a.status === 'loading');

  if (pending) {
    appendMessage('assistant', 'Still reading an attachment — try again in a second.', true);
    return;
  }
  if (!text && ready.length === 0) return;

  const textAttachments = ready.filter((a) => a.kind === 'text');
  const imageAttachments = ready.filter((a) => a.kind === 'image');

  const docBlock = textAttachments
    .map((a) => `--- ${a.name} ---\n${a.text}`)
    .join('\n\n');

  // A large text attachment with no images risks Groq's per-minute token
  // cap if sent as one message. Split it into smaller sequential requests
  // instead — each is shown in the chat log as it completes.
  if (imageAttachments.length === 0 && docBlock.length > BATCH_TRIGGER_CHARS) {
    const chunks = splitIntoChunks(docBlock, BATCH_CHUNK_CHARS);
    const attachmentNames = ready.map((a) => a.name);
    const instruction = text;
    input.value = '';
    input.style.height = 'auto';
    attachments = [];
    renderAttachments();
    await runBatchedSend(chunks, instruction, attachmentNames);
    return;
  }

  // If the user attached a document/PDF but typed no question, a raw text
  // dump with zero instruction can lead some models to return an empty or
  // refused completion. Give it an explicit instruction in that case.
  const defaultInstruction = docBlock && !text
    ? 'Review the attached material below and summarize the key points, then highlight anything especially important for exam prep.'
    : '';
  const combinedText = [text || defaultInstruction, docBlock].filter(Boolean).join('\n\n') || '(see attached image)';

  let content;
  if (imageAttachments.length > 0) {
    content = [
      { type: 'text', text: combinedText },
      ...imageAttachments.map((a) => ({ type: 'image_url', image_url: { url: a.dataUrl } })),
    ];
  } else {
    content = combinedText;
  }

  const attachmentNames = ready.map((a) => a.name);
  appendMessage('user', text || '(attachment only)', false, attachmentNames);
  history.push({ role: 'user', content });

  input.value = '';
  input.style.height = 'auto';
  attachments = [];
  renderAttachments();
  sendBtn.disabled = true;
  attachBtn.disabled = true;

  const typingEl = appendTyping();

  try {
    const result = await sendChatRequest(history);
    typingEl.remove();

    if (!result.ok) {
      const message = (result.data && result.data.error) || `Request failed (${result.status}).`;
      appendMessage('assistant', message, true);
      history.pop(); // don't keep a failed turn's (possibly image-laden) content
      return;
    }

    appendMessage('assistant', result.data.reply);
    history.push({ role: 'assistant', content: result.data.reply });

    // Once a turn with images has round-tripped successfully, collapse it
    // to a lightweight text placeholder so later turns don't keep
    // resending the full image payload(s) on every request.
    if (imageAttachments.length > 0) {
      const userIdx = history.length - 2;
      history[userIdx] = {
        role: 'user',
        content: `${combinedText}\n[${imageAttachments.length} image attachment(s) omitted from history]`,
      };
    }

    // Persist this exchange to the database (non-blocking)
    persistChatMessages([
      { role: 'user', content: history[history.length - 2].content },
      { role: 'assistant', content: result.data.reply },
    ]);
  } catch {
    typingEl.remove();
    appendMessage('assistant', 'Network error reaching the server. Try again.', true);
    history.pop();
  } finally {
    sendBtn.disabled = false;
    attachBtn.disabled = false;
    input.focus();
  }
});


// ── Markdown renderer ─────────────────────────────────────────────────
function renderMd(text) {
  if (typeof marked === 'undefined') return escapeHtml(text || '');
  try {
    marked.use({ gfm: true, breaks: true });
    const html = marked.parse(String(text || ''));
    const div = document.createElement('div');
    div.innerHTML = html;
    div.querySelectorAll('script,iframe,object,embed').forEach(el => el.remove());
    div.querySelectorAll('*').forEach(el => {
      [...el.attributes].forEach(attr => {
        if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
      });
    });
    return div.innerHTML;
  } catch(e) {
    console.error('renderMd error:', e);
    return escapeHtml(text || '');
  }
}

// ── Global keyboard shortcuts ──────────────────────────────────────────
let _gPressed = false;
let _gTimeout = null;

function closeShortcutsOverlay() { if (shortcutsOverlay) shortcutsOverlay.hidden = true; }
function openShortcutsOverlay()  { if (shortcutsOverlay) shortcutsOverlay.hidden = false; }

if (shortcutsOverlay) {
  shortcutsOverlay.addEventListener('click', (e) => {
    if (e.target === shortcutsOverlay) closeShortcutsOverlay();
  });
}

document.addEventListener('keydown', (e) => {
  const tag = (e.target && e.target.tagName) || '';
  const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable;

  if (e.key === 'Escape') {
    closeShortcutsOverlay();
    closeCompanion();
    return;
  }
  if (isTyping) return;

  if (e.key === '?') { e.preventDefault(); openShortcutsOverlay(); return; }
  if (e.key === 'c' || e.key === 'C') { e.preventDefault(); openCompanion(); return; }

  if (e.key === 'g' || e.key === 'G') {
    _gPressed = true;
    clearTimeout(_gTimeout);
    _gTimeout = setTimeout(() => { _gPressed = false; }, 800);
    return;
  }
  if (_gPressed) {
    _gPressed = false; clearTimeout(_gTimeout);
    const map = { d: 'dashboard', l: 'library', f: 'flashcards', h: 'history', a: 'assess', b: 'bookmarks', n: 'analytics', s: 'search', p: 'planner' };
    const target = map[e.key.toLowerCase()];
    if (target) { e.preventDefault(); switchView(target); }
  }
});

// ── Service Worker (PWA offline) ──────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// ═══════════════════════════════════════════════════════════════════════
// ── ⏱ TIMED EXAM MODE ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

let quizTimerInterval = null;
let quizTimerSecsLeft = 0;
let quizTimerTotalSecs = 0;

(function initTimedMode() {
  const toggle = document.getElementById('timedModeToggle');
  const options = document.getElementById('timedModeOptions');
  const timeRow = document.getElementById('timedTimeRow');
  if (!toggle || !options) return;

  toggle.addEventListener('change', () => {
    options.style.display = toggle.checked ? 'block' : 'none';
  });

  if (timeRow) {
    timeRow.querySelectorAll('.timed-time-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        timeRow.querySelectorAll('.timed-time-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }
})();

function getTimedModeSecs() {
  const toggle = document.getElementById('timedModeToggle');
  if (!toggle || !toggle.checked) return 0;
  const active = document.querySelector('.timed-time-btn.active');
  return active ? Number(active.dataset.secs) : 60;
}

function startQuizTimer() {
  stopQuizTimer();
  const secs = getTimedModeSecs();
  const wrap = document.getElementById('quizTimerWrap');
  if (!wrap) return;

  if (!secs) { wrap.hidden = true; return; }

  quizTimerTotalSecs = secs;
  quizTimerSecsLeft = secs;
  wrap.hidden = false;
  updateTimerDisplay();

  quizTimerInterval = setInterval(() => {
    quizTimerSecsLeft--;
    updateTimerDisplay();
    if (quizTimerSecsLeft <= 0) {
      stopQuizTimer();
      // Auto-submit when time is up
      if (assessSubmitBtn) {
        assessSubmitBtn.click();
      }
    }
  }, 1000);
}

function stopQuizTimer() {
  if (quizTimerInterval) { clearInterval(quizTimerInterval); quizTimerInterval = null; }
  const wrap = document.getElementById('quizTimerWrap');
  if (wrap) wrap.hidden = true;
}

function updateTimerDisplay() {
  const displayEl = document.getElementById('quizTimerDisplay');
  const ringEl = document.getElementById('timerRingFill');
  if (!displayEl) return;

  const m = Math.floor(quizTimerSecsLeft / 60);
  const s = quizTimerSecsLeft % 60;
  displayEl.textContent = m + ':' + String(s).padStart(2, '0');

  const pct = quizTimerTotalSecs > 0 ? quizTimerSecsLeft / quizTimerTotalSecs : 1;
  if (ringEl) {
    const circumference = 113;
    ringEl.style.strokeDashoffset = circumference * (1 - pct);
    // Color: green → amber → red
    ringEl.style.stroke = pct > 0.5 ? 'var(--teal)' : pct > 0.25 ? '#f59e0b' : 'var(--red)';
  }
  if (displayEl) {
    displayEl.style.color = quizTimerSecsLeft <= 10 ? 'var(--red)' : '';
  }
}

// ═══════════════════════════════════════════════════════════════════════
// ── 🏆 XP SYSTEM ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

async function loadXP() {
  try {
    const res = await fetch('/api/study/xp');
    if (!res.ok) return;
    const data = await res.json();
    renderXPBar(data);
  } catch { /* silent */ }
}

function renderXPBar(data) {
  const levelLabel = document.getElementById('xpLevelLabel');
  const totalLabel = document.getElementById('xpTotalLabel');
  const barFill = document.getElementById('xpBarFill');
  if (levelLabel) levelLabel.textContent = 'Lv ' + (data.level || 1);
  if (totalLabel) totalLabel.textContent = (data.xp || 0) + ' XP';
  if (barFill) barFill.style.width = Math.min(100, data.progress || 0) + '%';
}

// ═══════════════════════════════════════════════════════════════════════
// ── 📈 ANALYTICS VIEW ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

let analyticsLoaded = false;

async function loadAnalyticsView() {
  const loading = document.getElementById('analyticsLoading');
  const content = document.getElementById('analyticsContent');
  if (!loading || !content) return;

  loading.hidden = false;
  content.hidden = true;

  try {
    const [analyticsRes, xpRes, dashRes] = await Promise.all([
      fetch('/api/study/analytics'),
      fetch('/api/study/xp'),
      fetch('/api/study/dashboard'),
    ]);

    const analytics = analyticsRes.ok ? await analyticsRes.json() : {};
    const xpData = xpRes.ok ? await xpRes.json() : { level: 1, xp: 0, progress: 0, nextAt: 100 };
    const { stats } = dashRes.ok ? await dashRes.json() : { stats: {} };

    // XP card
    const xpLevelEl = document.getElementById('analyticsXpLevel');
    const xpBarFillEl = document.getElementById('analyticsXpBarFill');
    const xpSubEl = document.getElementById('analyticsXpSub');
    if (xpLevelEl) xpLevelEl.textContent = 'Level ' + xpData.level;
    if (xpBarFillEl) xpBarFillEl.style.width = Math.min(100, xpData.progress || 0) + '%';
    if (xpSubEl) xpSubEl.textContent = xpData.xp + ' XP total — ' + xpData.progress + '% to Level ' + (xpData.level + 1);
    renderXPBar(xpData);

    // Summary card
    const summaryGrid = document.getElementById('analyticsSummaryGrid');
    if (summaryGrid && stats) {
      summaryGrid.innerHTML = [
        { label: 'Total Sessions', val: stats.totalRuns || 0 },
        { label: 'Documents', val: stats.totalDocuments || 0 },
        { label: 'Flashcards', val: stats.totalFlashcards || 0 },
        { label: 'Avg Score', val: (stats.avgScore || 0) + '%' },
        { label: 'Day Streak', val: '🔥 ' + (stats.streak || 0) },
        { label: 'Total XP', val: '🏆 ' + (stats.totalXP || 0) },
      ].map(s =>
        '<div class="analytics-summary-item">' +
        '<div class="analytics-summary-val">' + s.val + '</div>' +
        '<div class="analytics-summary-key">' + s.label + '</div>' +
        '</div>'
      ).join('');
    }

    // Score trend
    renderScoreTrend(analytics.scoreTrend || []);

    // By-document
    renderDocBar(analytics.byDocument || []);

    // Weekly activity
    renderWeeklyActivity(analytics.weeklyActivity || []);

    content.hidden = false;

    // Achievements (async — load in background)
    loadAchievementsSection();
  } catch (e) {
    console.error('Analytics load error:', e);
  } finally {
    if (loading) loading.hidden = true;
  }
}

async function loadAchievementsSection() {
  const grid = document.getElementById('achievementsGrid');
  const meta = document.getElementById('achievementsMeta');
  const catsEl = document.getElementById('achievementsCats');
  if (!grid) return;
  try {
    const res = await fetch('/api/study/achievements');
    if (!res.ok) return;
    const { achievements } = await res.json();
    const earned = achievements.filter(a => a.earned).length;
    if (meta) meta.textContent = `${earned}/${achievements.length} unlocked`;

    // Category filter tabs
    const cats = [...new Set(achievements.map(a => a.cat))];
    let activeCat = 'All';
    if (catsEl) {
      const renderCats = () => {
        catsEl.innerHTML = ['All', ...cats].map(c =>
          `<button class="achievement-cat-btn ${c === activeCat ? 'active' : ''}" data-cat="${c}">${c}</button>`
        ).join('');
        catsEl.querySelectorAll('.achievement-cat-btn').forEach(btn => {
          btn.onclick = () => { activeCat = btn.dataset.cat; renderGrid(); renderCats(); };
        });
      };
      const renderGrid = () => {
        const filtered = activeCat === 'All' ? achievements : achievements.filter(a => a.cat === activeCat);
        grid.innerHTML = filtered.map(a => {
          const pct = a.total > 0 ? Math.round((a.progress / a.total) * 100) : 0;
          return `<div class="achievement-badge ${a.earned ? 'badge-earned' : 'badge-locked'}" title="${a.desc}">
            <div class="badge-icon">${a.icon}</div>
            <div class="badge-name">${a.name}</div>
            <div class="badge-desc">${a.desc}</div>
            ${!a.earned ? `<div class="badge-progress-wrap">
              <div class="badge-progress-fill" style="width:${pct}%"></div>
            </div>
            <div class="badge-progress-text">${a.progress}/${a.total}</div>` : '<div class="badge-earned-label">✓ Earned</div>'}
          </div>`;
        }).join('');
      };
      renderCats();
      renderGrid();
    }
  } catch(e) { console.error('Achievements error:', e); }
}

function renderScoreTrend(data) {
  const svg = document.getElementById('scoreTrendChart');
  const empty = document.getElementById('scoreTrendEmpty');
  if (!svg) return;

  if (!data.length) {
    svg.hidden = true;
    if (empty) empty.hidden = false;
    return;
  }
  svg.hidden = false;
  if (empty) empty.hidden = true;
  svg.innerHTML = '';

  const W = 700, H = 200, PAD = 40;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

  const scores = data.map(d => d.score);
  const maxY = 100, minY = 0;
  const n = scores.length;

  // Grid lines
  [0, 25, 50, 75, 100].forEach(v => {
    const y = PAD + (H - 2 * PAD) * (1 - v / maxY);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', PAD); line.setAttribute('x2', W - PAD / 2);
    line.setAttribute('y1', y); line.setAttribute('y2', y);
    line.setAttribute('stroke', 'var(--border)'); line.setAttribute('stroke-width', '0.5');
    svg.appendChild(line);
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', PAD - 6); label.setAttribute('y', y + 4);
    label.setAttribute('text-anchor', 'end');
    label.setAttribute('font-size', '9'); label.setAttribute('fill', 'var(--text-muted)');
    label.textContent = v + '%';
    svg.appendChild(label);
  });

  if (n < 2) {
    const x = W / 2;
    const y = PAD + (H - 2 * PAD) * (1 - scores[0] / maxY);
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', x); dot.setAttribute('cy', y); dot.setAttribute('r', '5');
    dot.setAttribute('fill', 'var(--violet)');
    svg.appendChild(dot);
    return;
  }

  const xStep = (W - PAD * 1.5) / (n - 1);
  const points = scores.map((s, i) => {
    const x = PAD + i * xStep;
    const y = PAD + (H - 2 * PAD) * (1 - s / maxY);
    return [x, y];
  });

  // Area fill
  const areaPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  const areaD = 'M' + points[0][0] + ',' + (H - PAD) +
    ' L' + points.map(p => p[0] + ',' + p[1]).join(' L') +
    ' L' + points[n - 1][0] + ',' + (H - PAD) + ' Z';
  areaPath.setAttribute('d', areaD);
  areaPath.setAttribute('fill', 'url(#trendGrad)');
  areaPath.setAttribute('opacity', '0.15');

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  grad.setAttribute('id', 'trendGrad'); grad.setAttribute('x1', '0'); grad.setAttribute('y1', '0');
  grad.setAttribute('x2', '0'); grad.setAttribute('y2', '1');
  const s1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  s1.setAttribute('offset', '0%'); s1.setAttribute('stop-color', 'var(--violet)');
  const s2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  s2.setAttribute('offset', '100%'); s2.setAttribute('stop-color', 'var(--violet)'); s2.setAttribute('stop-opacity', '0');
  grad.appendChild(s1); grad.appendChild(s2); defs.appendChild(grad);
  svg.appendChild(defs); svg.appendChild(areaPath);

  // Line
  const linePath = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  linePath.setAttribute('points', points.map(p => p.join(',')).join(' '));
  linePath.setAttribute('fill', 'none');
  linePath.setAttribute('stroke', 'var(--violet)');
  linePath.setAttribute('stroke-width', '2');
  linePath.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(linePath);

  // Dots + labels
  points.forEach(([x, y], i) => {
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', x); dot.setAttribute('cy', y); dot.setAttribute('r', '4');
    dot.setAttribute('fill', 'var(--violet)'); dot.setAttribute('stroke', 'var(--bg)');
    dot.setAttribute('stroke-width', '2');
    svg.appendChild(dot);
    // Score label for last point
    if (i === n - 1 || n <= 6) {
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', x); t.setAttribute('y', y - 8);
      t.setAttribute('text-anchor', 'middle'); t.setAttribute('font-size', '9');
      t.setAttribute('fill', 'var(--text-muted)');
      t.textContent = scores[i] + '%';
      svg.appendChild(t);
    }
  });
}

function renderDocBar(data) {
  const wrap = document.getElementById('docBarChart');
  const empty = document.getElementById('docBarEmpty');
  if (!wrap) return;

  if (!data.length) {
    wrap.innerHTML = '';
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;

  wrap.innerHTML = data.map(d => {
    const pct = d.score;
    const col = pct >= 80 ? 'var(--teal)' : pct >= 60 ? 'var(--violet)' : pct >= 40 ? '#f59e0b' : 'var(--red)';
    return '<div class="doc-bar-row">' +
      '<div class="doc-bar-label" title="' + escapeHtml(d.name) + '">' + escapeHtml(d.name) + '</div>' +
      '<div class="doc-bar-track">' +
        '<div class="doc-bar-fill" style="width:' + pct + '%;background:' + col + '"></div>' +
      '</div>' +
      '<div class="doc-bar-pct" style="color:' + col + '">' + pct + '%</div>' +
      '<div class="doc-bar-runs">' + d.runs + ' run' + (d.runs !== 1 ? 's' : '') + '</div>' +
    '</div>';
  }).join('');
}

function renderWeeklyActivity(data) {
  const wrap = document.getElementById('weeklyActivityChart');
  if (!wrap) return;

  if (!data.length) {
    wrap.innerHTML = '<div class="analytics-chart-empty">No weekly activity data yet.</div>';
    return;
  }

  const max = Math.max(...data.map(w => w.sessions || 0), 1);

  wrap.innerHTML = '<div class="weekly-bars">' +
    data.map(w => {
      const pct = Math.round(((w.sessions || 0) / max) * 100);
      const label = (w.week || '').replace(/^\d{4}-W/, 'W');
      return '<div class="weekly-bar-col">' +
        '<div class="weekly-bar-track">' +
          '<div class="weekly-bar-fill" style="height:' + pct + '%"></div>' +
        '</div>' +
        '<div class="weekly-bar-label">' + label + '</div>' +
        '<div class="weekly-bar-val">' + (w.sessions || 0) + '</div>' +
      '</div>';
    }).join('') +
  '</div>';
}

// Wire analytics refresh btn
const analyticsRefreshBtn = document.getElementById('analyticsRefreshBtn');
if (analyticsRefreshBtn) analyticsRefreshBtn.onclick = () => {
  analyticsLoaded = false;
  loadAnalyticsView();
};

// ═══════════════════════════════════════════════════════════════════════
// ── 🔍 GLOBAL SEARCH VIEW ────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

let searchDebounceTimer = null;

function initSearchView() {
  const input = document.getElementById('searchBarInput');
  if (!input || input._searchWired) return;
  input._searchWired = true;

  const doSearch = () => {
    const q = input.value.trim();
    if (q.length < 2) {
      document.getElementById('searchHint').hidden = false;
      document.getElementById('searchSections').hidden = true;
      document.getElementById('searchLoading').hidden = true;
      document.getElementById('searchEmpty').hidden = true;
      return;
    }
    runSearch(q);
  };

  input.addEventListener('input', () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(doSearch, 350);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { clearTimeout(searchDebounceTimer); doSearch(); }
  });

  const btn = document.getElementById('searchBarBtn');
  if (btn) btn.onclick = () => { clearTimeout(searchDebounceTimer); doSearch(); };

  // Focus the input
  setTimeout(() => input.focus(), 50);
}

async function runSearch(query) {
  const hintEl = document.getElementById('searchHint');
  const loadingEl = document.getElementById('searchLoading');
  const sectionsEl = document.getElementById('searchSections');
  const emptyEl = document.getElementById('searchEmpty');

  if (hintEl) hintEl.hidden = true;
  if (loadingEl) loadingEl.hidden = false;
  if (sectionsEl) sectionsEl.hidden = true;

  try {
    const res = await fetch('/api/study/search?q=' + encodeURIComponent(query));
    const data = res.ok ? await res.json() : { documents: [], flashcards: [], bookmarks: [] };
    renderSearchResults(data, query);
  } catch {
    renderSearchResults({ documents: [], flashcards: [], bookmarks: [] }, query);
  } finally {
    if (loadingEl) loadingEl.hidden = true;
  }
}

function highlightMatch(text, query) {
  if (!query || !text) return escapeHtml(text || '');
  const escaped = escapeHtml(text);
  const escapedQ = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escaped.replace(new RegExp(escapedQ, 'gi'), m => '<mark>' + m + '</mark>');
}

function renderSearchResults(data, query) {
  const sectionsEl = document.getElementById('searchSections');
  const emptyEl = document.getElementById('searchEmpty');
  const docsSection = document.getElementById('searchSectionDocs');
  const cardsSection = document.getElementById('searchSectionCards');
  const bookmarksSection = document.getElementById('searchSectionBookmarks');
  const docItems = document.getElementById('searchDocItems');
  const cardItems = document.getElementById('searchCardItems');
  const bookmarkItems = document.getElementById('searchBookmarkItems');

  const total = (data.documents || []).length + (data.flashcards || []).length + (data.bookmarks || []).length;

  if (!total) {
    if (sectionsEl) sectionsEl.hidden = true;
    if (emptyEl) emptyEl.hidden = false;
    return;
  }
  if (emptyEl) emptyEl.hidden = true;
  if (sectionsEl) sectionsEl.hidden = false;

  // Documents
  if (docsSection && docItems) {
    if (data.documents && data.documents.length) {
      docsSection.hidden = false;
      docItems.innerHTML = data.documents.map(d =>
        '<div class="search-result-item" style="cursor:pointer" data-view="library">' +
        '<div class="search-result-icon">📁</div>' +
        '<div class="search-result-body">' +
          '<div class="search-result-title">' + highlightMatch(d.name, query) + '</div>' +
          (d.doc_type ? '<div class="search-result-sub">Type: ' + d.doc_type + '</div>' : '') +
        '</div>' +
        '</div>'
      ).join('');
      docItems.querySelectorAll('.search-result-item').forEach(el => {
        el.onclick = () => switchView('library');
      });
    } else {
      docsSection.hidden = true;
    }
  }

  // Flashcards
  if (cardsSection && cardItems) {
    if (data.flashcards && data.flashcards.length) {
      cardsSection.hidden = false;
      cardItems.innerHTML = data.flashcards.map(c =>
        '<div class="search-result-item" style="cursor:pointer" data-view="flashcards">' +
        '<div class="search-result-icon">🃏</div>' +
        '<div class="search-result-body">' +
          '<div class="search-result-title">' + highlightMatch(c.front, query) + '</div>' +
          '<div class="search-result-sub">' + highlightMatch(c.back, query) + ' — ' + escapeHtml(c.document_name || '') + '</div>' +
        '</div>' +
        '</div>'
      ).join('');
      cardItems.querySelectorAll('.search-result-item').forEach(el => {
        el.onclick = () => switchView('flashcards');
      });
    } else {
      cardsSection.hidden = true;
    }
  }

  // Bookmarks
  if (bookmarksSection && bookmarkItems) {
    if (data.bookmarks && data.bookmarks.length) {
      bookmarksSection.hidden = false;
      bookmarkItems.innerHTML = data.bookmarks.map(b =>
        '<div class="search-result-item" style="cursor:pointer">' +
        '<div class="search-result-icon">🔖</div>' +
        '<div class="search-result-body">' +
          '<div class="search-result-title">' + highlightMatch(b.stem, query) + '</div>' +
          (b.correct_letter ? '<div class="search-result-sub">Answer: ' + b.correct_letter.toUpperCase() + '</div>' : '') +
        '</div>' +
        '</div>'
      ).join('');
      bookmarkItems.querySelectorAll('.search-result-item').forEach(el => {
        el.onclick = () => switchView('bookmarks');
      });
    } else {
      bookmarksSection.hidden = true;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// ── 📅 STUDY PLANNER VIEW ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

let plannerGoals = [];

async function loadPlannerView() {
  // Set default date to today
  const dateInput = document.getElementById('plannerTargetDate');
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().slice(0, 10);
  }

  try {
    const res = await fetch('/api/study/goals');
    if (!res.ok) return;
    const { goals } = await res.json();
    plannerGoals = goals || [];
    renderPlanner();
  } catch { /* silent */ }
}

function renderPlanner() {
  const today = new Date().toISOString().slice(0, 10);
  const todayGoals = plannerGoals.filter(g => !g.completed && g.target_date === today);
  const upcomingGoals = plannerGoals.filter(g => !g.completed && g.target_date > today);
  const completedGoals = plannerGoals.filter(g => g.completed);

  const todayList = document.getElementById('plannerTodayList');
  const upcomingList = document.getElementById('plannerUpcomingList');
  const completedList = document.getElementById('plannerCompletedList');
  const completedSection = document.getElementById('plannerCompletedSection');

  if (todayList) {
    todayList.innerHTML = todayGoals.length
      ? todayGoals.map(g => renderGoalItem(g)).join('')
      : '<div class="planner-empty">No goals scheduled for today.</div>';
    bindGoalActions(todayList);
  }

  if (upcomingList) {
    upcomingList.innerHTML = upcomingGoals.length
      ? upcomingGoals.map(g => renderGoalItem(g)).join('')
      : '<div class="planner-empty">No upcoming goals.</div>';
    bindGoalActions(upcomingList);
  }

  if (completedList && completedSection) {
    if (completedGoals.length) {
      completedSection.hidden = false;
      completedList.innerHTML = completedGoals.map(g => renderGoalItem(g)).join('');
      bindGoalActions(completedList);
    } else {
      completedSection.hidden = true;
    }
  }
}

function renderGoalItem(g) {
  const typeEmoji = { sessions: '✦', cards: '🃏', score: '📊' };
  const typeLabel = { sessions: 'sessions', cards: 'cards reviewed', score: '% target score' };
  return '<div class="planner-goal-item ' + (g.completed ? 'planner-goal-done' : '') + '" data-id="' + g.id + '">' +
    '<label class="planner-goal-check-label">' +
      '<input type="checkbox" class="planner-goal-check" data-id="' + g.id + '"' + (g.completed ? ' checked' : '') + '>' +
    '</label>' +
    '<div class="planner-goal-body">' +
      '<div class="planner-goal-title">' + escapeHtml(g.title) + '</div>' +
      '<div class="planner-goal-meta">' +
        (typeEmoji[g.goal_type] || '🎯') + ' ' +
        escapeHtml(String(g.target_value)) + ' ' + (typeLabel[g.goal_type] || g.goal_type) +
        ' · Due ' + escapeHtml(g.target_date) +
      '</div>' +
    '</div>' +
    '<button type="button" class="planner-goal-delete btn-ghost btn-xs" data-id="' + g.id + '" title="Delete">✕</button>' +
  '</div>';
}

function bindGoalActions(container) {
  container.querySelectorAll('.planner-goal-check').forEach(cb => {
    cb.addEventListener('change', async () => {
      const id = Number(cb.dataset.id);
      await patchGoal(id, { completed: cb.checked });
      await loadPlannerView();
      if (cb.checked) loadXP();
    });
  });
  container.querySelectorAll('.planner-goal-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.id);
      await fetch('/api/study/goals/' + id, { method: 'DELETE' });
      await loadPlannerView();
    });
  });
}

async function patchGoal(id, data) {
  try {
    await fetch('/api/study/goals/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch { /* silent */ }
}

// Wire planner add button
const plannerAddBtn = document.getElementById('plannerAddBtn');
const plannerFormError = document.getElementById('plannerFormError');

if (plannerAddBtn) {
  plannerAddBtn.addEventListener('click', async () => {
    const title = (document.getElementById('plannerTitle') || {}).value || '';
    const goalType = (document.getElementById('plannerGoalType') || {}).value || 'sessions';
    const targetValue = Number((document.getElementById('plannerTargetValue') || {}).value) || 1;
    const targetDate = (document.getElementById('plannerTargetDate') || {}).value || '';

    if (!title.trim()) {
      if (plannerFormError) { plannerFormError.textContent = 'Please enter a goal title.'; plannerFormError.hidden = false; }
      return;
    }
    if (!targetDate) {
      if (plannerFormError) { plannerFormError.textContent = 'Please select a target date.'; plannerFormError.hidden = false; }
      return;
    }
    if (plannerFormError) plannerFormError.hidden = true;

    try {
      const res = await fetch('/api/study/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), goalType, targetValue, targetDate }),
      });
      if (!res.ok) throw new Error('Failed to create goal');
      // Clear form
      const titleInput = document.getElementById('plannerTitle');
      if (titleInput) titleInput.value = '';
      await loadPlannerView();
    } catch (e) {
      if (plannerFormError) { plannerFormError.textContent = 'Could not add goal. Try again.'; plannerFormError.hidden = false; }
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════
// ── 📤 EXPORT CSV ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

function downloadCSV(filename, rows) {
  const csv = rows.map(row =>
    row.map(cell => {
      const s = String(cell == null ? '' : cell).replace(/"/g, '""');
      return /[,"\n\r]/.test(s) ? '"' + s + '"' : s;
    }).join(',')
  ).join('\r\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

async function exportHistoryCSV() {
  try {
    const res = await fetch('/api/study/runs');
    if (!res.ok) return;
    const { runs } = await res.json();
    const rows = [
      ['Date', 'Document', 'Total Questions', 'Answered', 'Score %', 'Note'],
      ...runs.map(r => [
        r.created_at ? r.created_at.slice(0, 10) : '',
        r.document_name,
        r.total_questions,
        r.answered_count,
        r.total_questions > 0 ? Math.round((r.answered_count / r.total_questions) * 100) : 0,
        r.note || '',
      ]),
    ];
    downloadCSV('medpass_history.csv', rows);
  } catch { /* silent */ }
}

async function exportFlashcardsCSV() {
  try {
    const res = await fetch('/api/study/flashcards');
    if (!res.ok) return;
    const { flashcards } = await res.json();
    const rows = [
      ['Front', 'Back', 'Document', 'Due Date', 'Interval (days)', 'Reps'],
      ...flashcards.map(c => [
        c.front, c.back, c.document_name || '', c.srs_due || '', c.srs_interval || 1, c.srs_reps || 0,
      ]),
    ];
    downloadCSV('medpass_flashcards.csv', rows);
  } catch { /* silent */ }
}

async function exportBookmarksCSV() {
  try {
    const res = await fetch('/api/study/bookmarks');
    if (!res.ok) return;
    const { bookmarks } = await res.json();
    const rows = [
      ['Date', 'Question', 'Correct Answer', 'Explanation'],
      ...bookmarks.map(b => [
        b.created_at ? b.created_at.slice(0, 10) : '',
        b.stem,
        b.correct_letter ? b.correct_letter.toUpperCase() : '',
        b.explanation || '',
      ]),
    ];
    downloadCSV('medpass_bookmarks.csv', rows);
  } catch { /* silent */ }
}

function exportAssessResultsCSV(items, answers) {
  const rows = [
    ['Question #', 'Stem', 'Your Answer', 'Correct Answer', 'Result'],
    ...items.map((item, idx) => {
      const userAns = answers[idx] || '';
      const correct = item.correctLetter || '';
      const result = !userAns ? 'Unanswered' : (userAns.toLowerCase() === correct.toLowerCase() ? 'Correct' : 'Incorrect');
      return [item.num, item.stem || '', userAns.toUpperCase(), correct.toUpperCase(), result];
    }),
  ];
  downloadCSV('medpass_quiz_results.csv', rows);
}

// ═══════════════════════════════════════════════════════════════════════
// ── ⏱ FOCUS ROOM ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

let focusTimerInterval = null;
let focusTimerSecsLeft = 25 * 60;
let focusTimerTotalSecs = 25 * 60;
let focusTimerRunning = false;
let focusCurrentMins = 25;

function focusUpdateDisplay() {
  const display = document.getElementById('focusTimerDisplay');
  const status = document.getElementById('focusTimerStatus');
  const ring = document.getElementById('focusRingFill');
  if (!display) return;
  const m = String(Math.floor(focusTimerSecsLeft / 60)).padStart(2, '0');
  const s = String(focusTimerSecsLeft % 60).padStart(2, '0');
  display.textContent = `${m}:${s}`;
  if (status) {
    status.textContent = focusTimerRunning ? 'Stay focused! 🧠' : (focusTimerSecsLeft === focusTimerTotalSecs ? 'Ready to focus' : 'Paused — resume when ready');
  }
  if (ring) {
    const circ = 2 * Math.PI * 120;
    const prog = focusTimerSecsLeft / focusTimerTotalSecs;
    ring.setAttribute('stroke-dasharray', `${prog * circ} ${circ}`);
  }
}

function focusSetMode(mins) {
  clearInterval(focusTimerInterval);
  focusTimerInterval = null;
  focusTimerRunning = false;
  focusCurrentMins = mins;
  focusTimerTotalSecs = mins * 60;
  focusTimerSecsLeft = focusTimerTotalSecs;
  const startBtn = document.getElementById('focusStartBtn');
  if (startBtn) startBtn.textContent = '▶ Start';
  const statusEl = document.getElementById('focusTimerStatus');
  if (statusEl) statusEl.textContent = 'Ready to focus';
  focusUpdateDisplay();
}

function focusToggle() {
  if (focusTimerRunning) {
    clearInterval(focusTimerInterval);
    focusTimerRunning = false;
    const btn = document.getElementById('focusStartBtn');
    if (btn) btn.textContent = '▶ Resume';
    focusUpdateDisplay();
    return;
  }
  focusTimerRunning = true;
  const btn = document.getElementById('focusStartBtn');
  if (btn) btn.textContent = '⏸ Pause';
  focusTimerInterval = setInterval(() => {
    focusTimerSecsLeft--;
    focusUpdateDisplay();
    if (focusTimerSecsLeft <= 0) {
      clearInterval(focusTimerInterval);
      focusTimerRunning = false;
      const b = document.getElementById('focusStartBtn');
      if (b) b.textContent = '▶ Start';
      const st = document.getElementById('focusTimerStatus');
      if (st) st.textContent = '🎉 Session complete! Great work!';
      const ml = document.getElementById('focusModeLabel');
      if (ml) ml.textContent = '✅ Done';
      const subj = (document.getElementById('focusSubjectInput') || {}).value || '';
      fetch('/api/study/focus-sessions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationMins: focusCurrentMins, subject: subj, completed: true }),
      }).then(() => loadFocusSessions()).catch(() => {});
      focusTimerSecsLeft = focusTimerTotalSecs;
    }
  }, 1000);
}

async function loadFocusSessions() {
  const listEl = document.getElementById('focusSessionsList');
  const summaryEl = document.getElementById('focusTodaySummary');
  const headerEl = document.getElementById('focusTodaySummaryHeader');
  try {
    const res = await fetch('/api/study/focus-sessions');
    if (!res.ok) return;
    const { todayMins, todaySessions, recent } = await res.json();
    const summaryText = `${todayMins} min · ${todaySessions} session${todaySessions !== 1 ? 's' : ''} today`;
    if (summaryEl) summaryEl.textContent = summaryText;
    if (headerEl) headerEl.textContent = todayMins > 0 ? `⏱ ${summaryText}` : '';
    if (listEl) {
      const todayStr = new Date().toISOString().slice(0, 10);
      const todayItems = recent.filter(r => r.created_at.slice(0, 10) === todayStr);
      if (!todayItems.length) {
        listEl.innerHTML = '<div class="focus-empty">No sessions yet today. Start your first focus session!</div>';
      } else {
        listEl.innerHTML = todayItems.map(r => {
          const t = new Date(r.created_at);
          const time = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return `<div class="focus-session-item">
            <span class="focus-session-icon">🎯</span>
            <div class="focus-session-info">
              <span class="focus-session-mins">${r.duration_mins} min focus</span>
              ${r.subject ? `<span class="focus-session-subj">${escapeHtml(r.subject)}</span>` : ''}
            </div>
            <span class="focus-session-time">${time}</span>
          </div>`;
        }).join('');
      }
    }
  } catch(e) { /* silent */ }
}

async function loadFocusView() {
  focusUpdateDisplay();
  loadFocusSessions();

  const tabs = document.querySelectorAll('.focus-mode-tab[data-mins]');
  tabs.forEach(tab => {
    if (!tab._wired) {
      tab._wired = true;
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        document.getElementById('focusTabCustom').classList.remove('active');
        tab.classList.add('active');
        document.getElementById('focusCustomRow').hidden = true;
        const label = document.getElementById('focusModeLabel');
        const mins = Number(tab.dataset.mins);
        if (label) label.textContent = mins === 25 ? 'Focus' : mins === 5 ? 'Short Break' : 'Long Break';
        focusSetMode(mins);
      });
    }
  });

  const customTab = document.getElementById('focusTabCustom');
  if (customTab && !customTab._wired) {
    customTab._wired = true;
    customTab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      customTab.classList.add('active');
      document.getElementById('focusCustomRow').hidden = false;
    });
  }

  const customSetBtn = document.getElementById('focusCustomSetBtn');
  if (customSetBtn && !customSetBtn._wired) {
    customSetBtn._wired = true;
    customSetBtn.addEventListener('click', () => {
      const mins = Math.max(1, Math.min(120, Number(document.getElementById('focusCustomMins').value) || 25));
      const label = document.getElementById('focusModeLabel');
      if (label) label.textContent = `Custom (${mins}min)`;
      focusSetMode(mins);
      document.getElementById('focusCustomRow').hidden = true;
    });
  }

  const startBtn = document.getElementById('focusStartBtn');
  if (startBtn && !startBtn._wired) {
    startBtn._wired = true;
    startBtn.addEventListener('click', focusToggle);
  }

  const resetBtn = document.getElementById('focusResetBtn');
  if (resetBtn && !resetBtn._wired) {
    resetBtn._wired = true;
    resetBtn.addEventListener('click', () => {
      focusSetMode(focusCurrentMins);
      const label = document.getElementById('focusModeLabel');
      if (label) {
        const mins = focusCurrentMins;
        label.textContent = mins === 25 ? 'Focus' : mins === 5 ? 'Short Break' : mins === 15 ? 'Long Break' : `Custom (${mins}min)`;
      }
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════
// ── 📓 NOTES ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

let allNotes = [];
let editingNoteId = null;
let noteEditorColor = 'violet';

const NOTE_COLORS = {
  violet: '#A78BFA', rose: '#FB7185', gold: '#FBBF24',
  green: '#34D399', blue: '#60A5FA', slate: '#94A3B8',
};

function openNoteEditor(note) {
  editingNoteId = note ? note.id : null;
  noteEditorColor = note ? note.color : 'violet';
  const modal = document.getElementById('noteEditorModal');
  const titleEl = document.getElementById('noteEditorTitle');
  const titleInput = document.getElementById('noteEditorTitleInput');
  const bodyEl = document.getElementById('noteEditorBody');
  const pinEl = document.getElementById('noteEditorPin');
  if (!modal) return;
  if (titleEl) titleEl.textContent = note ? 'Edit Note' : 'New Note';
  if (titleInput) titleInput.value = note ? note.title : '';
  if (bodyEl) bodyEl.value = note ? note.body : '';
  if (pinEl) pinEl.checked = note ? Boolean(note.pinned) : false;
  document.querySelectorAll('.note-color-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.color === noteEditorColor);
    btn.style.setProperty('--nc', NOTE_COLORS[btn.dataset.color] || '#64748B');
  });
  updateNoteEditorPreview();
  modal.hidden = false;
}

function updateNoteEditorPreview() {
  const card = document.querySelector('.note-editor-card');
  if (card) card.style.setProperty('--note-accent', NOTE_COLORS[noteEditorColor] || '#A78BFA');
}

async function saveNote() {
  const title = (document.getElementById('noteEditorTitleInput') || {}).value || '';
  const body = (document.getElementById('noteEditorBody') || {}).value || '';
  const pinned = (document.getElementById('noteEditorPin') || {}).checked || false;
  const color = noteEditorColor;
  try {
    if (editingNoteId) {
      await fetch(`/api/study/notes/${editingNoteId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, color, pinned }),
      });
    } else {
      await fetch('/api/study/notes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, color }),
      });
    }
    document.getElementById('noteEditorModal').hidden = true;
    await loadNotesView();
  } catch(e) { console.error('Save note error:', e); }
}

async function deleteNote(id) {
  if (!confirm('Delete this note?')) return;
  await fetch(`/api/study/notes/${id}`, { method: 'DELETE' });
  await loadNotesView();
}

async function toggleNotePin(id, pinned) {
  await fetch(`/api/study/notes/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pinned: !pinned }),
  });
  await loadNotesView();
}

function renderNoteCard(note) {
  const accent = NOTE_COLORS[note.color] || '#A78BFA';
  const preview = note.body.slice(0, 200);
  const pinIcon = note.pinned ? '📌' : '';
  return `<div class="note-card note-color-${note.color}" data-id="${note.id}" style="--note-accent:${accent}">
    <div class="note-card-header">
      <div class="note-card-title">${pinIcon} ${escapeHtml(note.title || 'Untitled')}</div>
      <div class="note-card-actions">
        <button class="note-action-btn" data-action="pin" title="${note.pinned ? 'Unpin' : 'Pin'}">📌</button>
        <button class="note-action-btn" data-action="edit" title="Edit">✏️</button>
        <button class="note-action-btn" data-action="del" title="Delete">🗑</button>
      </div>
    </div>
    <div class="note-card-body">${escapeHtml(preview)}${note.body.length > 200 ? '…' : ''}</div>
    <div class="note-card-footer">
      <span class="note-card-date">${formatRunDate(note.updated_at)}</span>
    </div>
  </div>`;
}

async function loadNotesView() {
  const grid = document.getElementById('notesGrid');
  const empty = document.getElementById('notesEmpty');
  const badge = document.getElementById('notesBadge');

  if (!grid) return;

  try {
    const res = await fetch('/api/study/notes');
    if (!res.ok) return;
    const { notes } = await res.json();
    allNotes = notes;

    // Badge
    if (badge) { badge.textContent = notes.length; badge.hidden = notes.length === 0; }

    const searchVal = (document.getElementById('notesSearch') || {}).value || '';
    const filtered = searchVal
      ? notes.filter(n => n.title.toLowerCase().includes(searchVal.toLowerCase()) || n.body.toLowerCase().includes(searchVal.toLowerCase()))
      : notes;

    if (!filtered.length) {
      if (empty) empty.hidden = false;
      // Remove existing cards
      grid.querySelectorAll('.note-card').forEach(el => el.remove());
    } else {
      if (empty) empty.hidden = true;
      grid.querySelectorAll('.note-card').forEach(el => el.remove());
      const frag = document.createDocumentFragment();
      filtered.forEach(note => {
        const div = document.createElement('div');
        div.innerHTML = renderNoteCard(note);
        const card = div.firstChild;
        card.querySelector('[data-action="pin"]').onclick = () => toggleNotePin(note.id, note.pinned);
        card.querySelector('[data-action="edit"]').onclick = () => openNoteEditor(note);
        card.querySelector('[data-action="del"]').onclick = () => deleteNote(note.id);
        card.ondblclick = () => openNoteEditor(note);
        frag.appendChild(card);
      });
      grid.appendChild(frag);
    }
  } catch(e) { console.error('Notes error:', e); }

  // Wire create buttons (once)
  const createBtn = document.getElementById('createNoteBtn');
  const createBtn2 = document.getElementById('createNoteBtn2');
  if (createBtn && !createBtn._wired) { createBtn._wired = true; createBtn.onclick = () => openNoteEditor(null); }
  if (createBtn2 && !createBtn2._wired) { createBtn2._wired = true; createBtn2.onclick = () => openNoteEditor(null); }

  // Wire search
  const search = document.getElementById('notesSearch');
  if (search && !search._wired) {
    search._wired = true;
    search.addEventListener('input', () => loadNotesView());
  }
}

// Note editor modal wiring
const noteEditorModal = document.getElementById('noteEditorModal');
const noteEditorClose = document.getElementById('noteEditorClose');
const noteEditorCancel = document.getElementById('noteEditorCancel');
const noteEditorSaveBtn = document.getElementById('noteEditorSave');
if (noteEditorClose) noteEditorClose.onclick = () => { noteEditorModal.hidden = true; };
if (noteEditorCancel) noteEditorCancel.onclick = () => { noteEditorModal.hidden = true; };
if (noteEditorSaveBtn) noteEditorSaveBtn.onclick = saveNote;
document.querySelectorAll('.note-color-btn').forEach(btn => {
  btn.onclick = () => {
    noteEditorColor = btn.dataset.color;
    document.querySelectorAll('.note-color-btn').forEach(b => b.classList.toggle('active', b.dataset.color === noteEditorColor));
    updateNoteEditorPreview();
  };
});
if (noteEditorModal) noteEditorModal.addEventListener('click', (e) => { if (e.target === noteEditorModal) noteEditorModal.hidden = true; });

// ═══════════════════════════════════════════════════════════════════════
// ── ⚡ RAPID FIRE QUIZ ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

let rfQuestions = [];
let rfCurrentIdx = 0;
let rfScore = 0;
let rfTotal = 0;
let rfTimerInterval = null;
let rfSecsLeft = 60;

async function openRapidFire() {
  const overlay = document.getElementById('rapidFireOverlay');
  if (!overlay) return;
  overlay.hidden = false;
  document.getElementById('rfIdle').hidden = false;
  document.getElementById('rfActive').hidden = true;
  document.getElementById('rfResult').hidden = true;

  // Pre-load questions from bookmarks + flashcards
  try {
    const [bmRes, fcRes] = await Promise.all([
      fetch('/api/study/bookmarks'),
      fetch('/api/study/flashcards'),
    ]);
    rfQuestions = [];
    if (bmRes.ok) {
      const { bookmarks } = await bmRes.json();
      bookmarks.forEach(bm => {
        if (bm.stem) rfQuestions.push({ type: 'bookmark', q: bm.stem, answer: bm.correct_letter, explain: bm.explanation });
      });
    }
    if (fcRes.ok) {
      const { flashcards } = await fcRes.json();
      flashcards.forEach(fc => {
        if (fc.front && fc.back) {
          rfQuestions.push({ type: 'flash', q: `Recall: ${fc.front}`, answer: null, back: fc.back });
        }
      });
    }
    rfQuestions = rfQuestions.sort(() => Math.random() - 0.5).slice(0, 30);
    const note = document.getElementById('rfSourceNote');
    if (note) note.textContent = `${rfQuestions.length} questions ready from your bookmarks & flashcards`;
  } catch(e) { console.error('RF load error:', e); }
}

function rfStart() {
  if (!rfQuestions.length) { alert('No questions available! Add bookmarks or flashcards first.'); return; }
  rfCurrentIdx = 0; rfScore = 0; rfTotal = 0; rfSecsLeft = 60;
  document.getElementById('rfIdle').hidden = true;
  document.getElementById('rfActive').hidden = false;
  document.getElementById('rfResult').hidden = true;
  rfShowQuestion();
  rfTimerInterval = setInterval(() => {
    rfSecsLeft--;
    const el = document.getElementById('rfCountdown');
    if (el) { el.textContent = rfSecsLeft; el.className = 'rf-countdown' + (rfSecsLeft <= 10 ? ' rf-countdown-urgent' : ''); }
    const prog = document.getElementById('rfProgressFill');
    if (prog) prog.style.width = (rfSecsLeft / 60 * 100) + '%';
    if (rfSecsLeft <= 0) rfEndGame();
  }, 1000);
}

function rfShowQuestion() {
  if (rfCurrentIdx >= rfQuestions.length) { rfEndGame(); return; }
  const q = rfQuestions[rfCurrentIdx];
  const qEl = document.getElementById('rfQuestion');
  const optsEl = document.getElementById('rfOptions');
  const ctr = document.getElementById('rfQCounter');
  if (ctr) ctr.textContent = `Q ${rfCurrentIdx + 1}`;
  if (qEl) qEl.textContent = q.q;
  if (optsEl) {
    if (q.type === 'flash') {
      // True/False recall
      optsEl.innerHTML = `
        <button class="rf-opt-btn rf-opt-green" data-ans="know">✓ I know this</button>
        <button class="rf-opt-btn rf-opt-red" data-ans="dont">✗ I don't know</button>`;
      optsEl.querySelectorAll('.rf-opt-btn').forEach(btn => {
        btn.onclick = () => rfAnswer(btn.dataset.ans === 'know');
      });
    } else {
      // Multiple choice — show A/B/C/D as buttons
      const letters = ['A','B','C','D'];
      optsEl.innerHTML = letters.map(l =>
        `<button class="rf-opt-btn" data-letter="${l.toLowerCase()}">${l}</button>`
      ).join('');
      optsEl.querySelectorAll('.rf-opt-btn').forEach(btn => {
        btn.onclick = () => rfAnswer(btn.dataset.letter === (q.answer || '').toLowerCase());
      });
    }
  }
}

function rfAnswer(correct) {
  rfTotal++;
  if (correct) rfScore++;
  const scoreEl = document.getElementById('rfScoreLive');
  if (scoreEl) scoreEl.textContent = `${rfScore} ✓`;
  rfCurrentIdx++;
  rfShowQuestion();
}

function rfEndGame() {
  clearInterval(rfTimerInterval);
  document.getElementById('rfActive').hidden = true;
  document.getElementById('rfResult').hidden = false;
  const scoreEl = document.getElementById('rfResultScore');
  if (scoreEl) scoreEl.textContent = `${rfScore}/${rfTotal}`;
  const xpEarned = rfScore * 3;
  const xpEl = document.getElementById('rfResultXp');
  if (xpEl) xpEl.textContent = xpEarned > 0 ? `+${xpEarned} XP earned!` : '';
  if (xpEarned > 0) {
    fetch('/api/study/xp/award', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: xpEarned, reason: 'rapid_fire' }) }).catch(() => {});
  }
}

function rfClose() {
  clearInterval(rfTimerInterval);
  const overlay = document.getElementById('rapidFireOverlay');
  if (overlay) overlay.hidden = true;
}

// Rapid Fire wiring
const rfOverlay = document.getElementById('rapidFireOverlay');
if (rfOverlay) rfOverlay.addEventListener('click', (e) => { if (e.target === rfOverlay) rfClose(); });
const rfStartBtn = document.getElementById('rfStartBtn');
if (rfStartBtn) rfStartBtn.onclick = rfStart;
const rfCloseIdle = document.getElementById('rfCloseIdle');
if (rfCloseIdle) rfCloseIdle.onclick = rfClose;
const rfPlayAgain = document.getElementById('rfPlayAgain');
if (rfPlayAgain) rfPlayAgain.onclick = () => {
  document.getElementById('rfResult').hidden = true;
  document.getElementById('rfIdle').hidden = false;
};
const rfCloseResult = document.getElementById('rfCloseResult');
if (rfCloseResult) rfCloseResult.onclick = rfClose;

// Wire export buttons
const historyExportBtn = document.getElementById('historyExportBtn');
if (historyExportBtn) historyExportBtn.onclick = exportHistoryCSV;

const flashExportBtn = document.getElementById('flashExportBtn');
if (flashExportBtn) flashExportBtn.onclick = exportFlashcardsCSV;

const bookmarksExportBtn = document.getElementById('bookmarksExportBtn');
if (bookmarksExportBtn) bookmarksExportBtn.onclick = exportBookmarksCSV;

// ═══════════════════════════════════════════════════════════════════════
// ── 🚀 INIT ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

// Load XP on startup
loadXP();
