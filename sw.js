/**
 * Service Worker for GYM Tracker PWA
 * ─────────────────────────────────────────────────────────────
 * Cache-bust version: gym-tracker-v20261016-ff-android-png
 * Network-First fetch strategy: fetches fresh from network first,
 * updating the cache in the background, fallback to cache when offline.
 * Compatible with Chrome, Firefox (Desktop & Android), Safari.
 */

const CACHE_NAME = 'gym-tracker-v20261016-ff-android-png';

const APP_SHELL = [
  './',
  './index.html',
  './css/styles.css',
  './css/styles.css?v=20261016',
  './js/data.js',
  './js/firebase.js',
  './js/state.js',
  './js/render.js',
  './js/modal.js',
  './js/week.js',
  './js/stats.js',
  './js/app.js',
  './favicon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './manifest.json',
];

// ── Install: precache APP_SHELL with Promise.allSettled so a single failure never breaks SW install ──
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await Promise.allSettled(
        APP_SHELL.map(async url => {
          try {
            const response = await fetch(url, { cache: 'reload' });
            if (response && response.status === 200) {
              await cache.put(url, response);
            } else {
              console.warn('[SW] Non-200 status when precaching:', url, response ? response.status : 'null');
            }
          } catch (err) {
            console.warn('[SW] Failed to precache asset:', url, err);
          }
        })
      );
    })
  );
});

// ── Activate: wipe ALL old caches and immediately claim clients ──
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.info('[SW] Deleting stale cache:', k);
          return caches.delete(k);
        })
      );
      await self.clients.claim();
    })()
  );
});

// ── Fetch: Network-First strategy ────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip cross-origin or non-GET requests
  if (event.request.method !== 'GET' || url.origin !== location.origin) {
    return;
  }

  event.respondWith(
    fetch(event.request, { cache: 'reload' })
      .then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(async () => {
        // Fallback to cache when offline
        const cached = await caches.match(event.request, { ignoreSearch: true });
        return cached || caches.match('./index.html');
      })
  );
});
