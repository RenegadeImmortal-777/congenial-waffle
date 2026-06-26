'use strict';

async function api(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && !data.success) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { status: res.status, data });
  return data;
}

function showAlert(message, type = 'error') {
  const el = document.getElementById('alert');
  if (!el) return;
  el.className = 'alert show alert-' + type;
  el.innerHTML = '<span class="alert-icon">' + (type === 'error' ? '⚠' : type === 'success' ? '✓' : 'ℹ') + '</span><span>' + message + '</span>';
}
