'use strict';

const CACHE_NAME = 'medpass-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// App-shell files that change as the app is developed — these must
// always be checked against the network first so users get updates
// on a normal reload, with no manual cache-busting required.
const APP_SHELL_PATHS = ['/app.html', '/app.css', '/app.js', '/manifest.json'];

function isAppShell(pathname) {
  return APP_SHELL_PATHS.includes(pathname);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache API requests — always network
  if (url.pathname.startsWith('/api/')) return;

  // For navigation requests: network first, fall back to cached app shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put('/app.html', clone));
        return response;
      }).catch(() => caches.match('/app.html'))
    );
    return;
  }

  // App shell (HTML/CSS/JS/manifest): network first, cache as fallback.
  // This is what actually fixes the "stale CSS after deploy" problem —
  // no version bump needed, ever.
  if (isAppShell(url.pathname)) {
    event.respondWith(
      fetch(request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => caches.match(request))
    );
    return;
  }

  // Everything else (vendor libs, icons, fonts): cache first, then network.
  // Safe here because vendor files don't change without changing filename.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      }).catch(() => cached);
    })
  );
});
