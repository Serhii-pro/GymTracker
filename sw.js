/**
 * Service Worker for GYM Tracker PWA
 * ─────────────────────────────────────────────────────────────
 * Network-First strategy with cache fallback.
 * Bumps cache version and immediately claims clients to bust stale CSS.
 */

const CACHE_NAME = 'gym-tracker-v5-20261015';

const APP_SHELL = [
  './',
  './index.html',
  './css/styles.css',
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
  './icons/icon-192.svg',
  './icons/icon-512.svg',
  './manifest.json',
];

// ── Install: pre-cache fresh app shell and immediately activate ──
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
  );
});

// ── Activate: delete ALL old caches and immediately take control ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.info('[SW] Deleting old cache:', k);
          return caches.delete(k);
        })
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: strictly Network-First, fallback to cache only when offline ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Only handle same-origin GET requests
  if (event.request.method !== 'GET' || url.origin !== location.origin) {
    return;
  }

  event.respondWith(
    fetch(event.request, { cache: 'no-cache' })
      .then(response => {
        // Clone and cache successful response
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline fallback
        return caches.match(event.request, { ignoreSearch: true });
      })
  );
});
