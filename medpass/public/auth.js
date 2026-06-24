'use strict';

/* ---------------------------------------------------------------------
   bgCanvas — faint upward-drifting data points behind the card.
--------------------------------------------------------------------- */
function initBgCanvas() {
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let w, h, dpr;
  let points = [];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.max(18, Math.min(46, Math.floor((w * h) / 38000)));
    points = Array.from({ length: count }, () => spawnPoint(true));
  }

  function spawnPoint(initial) {
    return {
      x: Math.random() * w,
      y: initial ? Math.random() * h : h + 10,
      r: 0.6 + Math.random() * 1.4,
      speed: 6 + Math.random() * 14, // px/sec
      drift: (Math.random() - 0.5) * 6,
      alpha: 0.05 + Math.random() * 0.22,
    };
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#006fd6';

    for (const p of points) {
      p.y -= p.speed * dt;
      p.x += p.drift * dt;
      if (p.y < -10) Object.assign(p, spawnPoint(false));

      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (!reduceMotion) requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  resize();
  if (reduceMotion) {
    // Draw a single static frame instead of animating.
    frame(performance.now());
  } else {
    requestAnimationFrame(frame);
  }
}

/* ---------------------------------------------------------------------
   Vitals — ECG-style widget reflecting form state.
   States: 'idle' | 'sending' | 'success' | 'error'
--------------------------------------------------------------------- */
const Vitals = (function () {
  let canvas, ctx, statusEl;
  let w, h, dpr;
  let state = 'idle';
  let buffer = [];
  let phase = 0;
  let settledAt = null;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const LABELS = {
    idle: 'STANDBY',
    sending: 'TRANSMITTING',
    success: 'CONFIRMED',
    error: 'REJECTED',
  };

  function resize() {
    if (!canvas) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.parentElement.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buffer = new Array(Math.ceil(w)).fill(0);
  }

  // Generates the next sample for the scrolling waveform based on state.
  function nextSample() {
    phase += 1;

    if (state === 'idle') {
      return Math.sin(phase * 0.045) * 4;
    }

    if (state === 'sending') {
      const cycle = phase % 46;
      if (cycle === 20) return -6;
      if (cycle === 22) return 26;
      if (cycle === 24) return -14;
      if (cycle === 26) return 6;
      return Math.sin(phase * 0.12) * 2.5;
    }

    if (state === 'success') {
      const sinceSettle = settledAt != null ? phase - settledAt : 999;
      if (sinceSettle < 0) return 0;
      if (sinceSettle === 2) return -8;
      if (sinceSettle === 4) return 30;
      if (sinceSettle === 6) return -16;
      if (sinceSettle === 8) return 4;
      return 0; // flat green baseline after the confirm spike
    }

    if (state === 'error') {
      const sinceSettle = settledAt != null ? phase - settledAt : 999;
      if (sinceSettle < 14) {
        return (Math.random() - 0.5) * 22;
      }
      return 0; // flatline red after the noise burst
    }

    return 0;
  }

  function draw() {
    if (!ctx) return;
    buffer.push(nextSample());
    if (buffer.length > w) buffer.shift();

    ctx.clearRect(0, 0, w, h);
    const mid = h / 2;

    const colors = {
      idle: '#006fd6',
      sending: '#0284c7',
      success: '#059669',
      error: '#ef4444',
    };
    ctx.strokeStyle = colors[state] || '#00d4ff';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 6;
    ctx.shadowColor = ctx.strokeStyle;

    ctx.beginPath();
    buffer.forEach((v, i) => {
      const x = i;
      const y = mid - v;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (!reduceMotion) requestAnimationFrame(draw);
  }

  function setState(next) {
    if (state === next) return;
    state = next;
    if (next === 'success' || next === 'error') settledAt = phase;
    if (statusEl) {
      statusEl.textContent = LABELS[next] || '';
      statusEl.classList.toggle('is-error', next === 'error');
      statusEl.classList.toggle('is-success', next === 'success');
    }
  }

  function init(canvasId, statusId) {
    canvas = document.getElementById(canvasId);
    statusEl = document.getElementById(statusId);
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    window.addEventListener('resize', resize);
    resize();
    if (reduceMotion) {
      draw();
    } else {
      requestAnimationFrame(draw);
    }
  }

  return { init, setState };
})();

/* ---------------------------------------------------------------------
   Small shared UI helpers
--------------------------------------------------------------------- */
function togglePassword(inputId, btnEl) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const showing = input.type === 'text';
  input.type = showing ? 'password' : 'text';
  btnEl.textContent = showing ? 'Show' : 'Hide';
  btnEl.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
}

function showBanner(el, type, message) {
  if (!el) return;
  el.textContent = message;
  el.className = `banner show ${type}`;
}

function hideBanner(el) {
  if (!el) return;
  el.className = 'banner';
  el.textContent = '';
}

async function postJSON(url, body) {
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Network error. Check your connection and try again.');
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }

  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status}).`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function getJSON(url) {
  let res;
  try {
    res = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch {
    throw new Error('Network error. Check your connection and try again.');
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }
  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status}).`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/** Simple password strength heuristic for the live meter on signup. */
function passwordStrength(pw) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
  if (/[0-9]/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  return Math.min(score, 4); // 0..4
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}
