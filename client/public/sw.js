/* eslint-disable no-restricted-globals */
/**
 * UniGo HK — service worker.
 *
 * Caching strategy:
 *   - App shell (`/`, `/index.html`): cache-first, with network-update.
 *     This is the "offline shell" — the landing page renders from cache
 *     even if the network is dead, instead of showing the browser's
 *     "no internet" page.
 *   - Static assets under `/assets/`, fonts: cache-first (immutable
 *     hashed filenames; safe to cache forever within the SW lifetime).
 *   - Same-origin GET requests for navigation: stale-while-revalidate
 *     so existing tabs feel instant.
 *   - `/api/*`: network-only. Auth, plaza presence, chat — none of
 *     this should ever come from a stale cache.
 *   - Cross-origin (Supabase, fonts.gstatic.com, fonts.googleapis.com):
 *     network passthrough; we don't cache anything we don't own.
 *
 * Versioning: bump CACHE_VERSION when shipping any cacheable change so
 * old caches are evicted in the activate step.
 */

const CACHE_VERSION = 'v10-1';
const SHELL_CACHE = `unigo-shell-${CACHE_VERSION}`;
const ASSET_CACHE = `unigo-assets-${CACHE_VERSION}`;

// Files we want available offline immediately. The Vite build hashes
// `/assets/*` filenames, so we can't pre-cache those reliably here —
// they get cached on first fetch instead.
const SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)).catch(() => {
      // If a shell URL 404s during install, don't break the entire SW.
      // Better to ship a partially-precached SW than to fail install
      // and leave the user with no SW at all.
    }),
  );
  // Activate immediately on first install — no need to wait for tabs to close.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Drop caches from previous versions.
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n.startsWith('unigo-') && !n.endsWith(CACHE_VERSION))
          .map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET. POST/PUT/DELETE are always network-only.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Cross-origin → don't intercept.
  if (url.origin !== self.location.origin) return;

  // /api/* → network-only, never cached.
  if (url.pathname.startsWith('/api/')) return;

  // Navigation (HTML) → stale-while-revalidate against the shell cache.
  // If offline, serve cached index.html so SPA routing still works.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL_CACHE);
        const cached = await cache.match('/index.html');
        const networkPromise = fetch(request)
          .then((res) => {
            // Update the cached shell in the background. Only cache 2xx.
            if (res.ok) cache.put('/index.html', res.clone()).catch(() => {});
            return res;
          })
          .catch(() => null);
        return cached ?? (await networkPromise) ?? new Response('Offline', { status: 503 });
      })(),
    );
    return;
  }

  // Static assets → cache-first.
  if (url.pathname.startsWith('/assets/') || /\.(?:js|css|png|jpg|jpeg|svg|webp|woff2?|ttf)$/.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(ASSET_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const res = await fetch(request);
          if (res.ok) cache.put(request, res.clone()).catch(() => {});
          return res;
        } catch {
          // Hard offline + not cached → propagate the error so the page
          // can show a sensible "asset missing" rather than a hang.
          return new Response('', { status: 504 });
        }
      })(),
    );
  }
});

// Allow the page to ask the SW to skip waiting (used after a deploy
// when we want users on the new version without a full reload race).
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
