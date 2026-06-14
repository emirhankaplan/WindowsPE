/* WindowsPE service worker — offline support.
 *
 * Strategy:
 *   - Navigations: network-first, fall back to the cached app shell ("/").
 *   - Next.js static assets (/_next/static, fonts, icons): cache-first
 *     (immutable, content-hashed).
 *   - API GETs (the methodology + node detail + search): network-first with a
 *     cache fallback, so a box visited once stays readable fully offline.
 *
 * Hand-rolled (no next-pwa) to stay compatible with the App Router build and
 * avoid a heavyweight dependency.
 */
const VERSION = 'v1';
const SHELL_CACHE = `wpe-shell-${VERSION}`;
const STATIC_CACHE = `wpe-static-${VERSION}`;
const API_CACHE = `wpe-api-${VERSION}`;
const KEEP = new Set([SHELL_CACHE, STATIC_CACHE, API_CACHE]);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((c) => c.addAll(['/'])).catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !KEEP.has(k)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

function isStatic(url) {
  return (
    url.pathname.startsWith('/_next/static') ||
    /\.(?:woff2?|ttf|otf|png|svg|ico|webp|jpg|jpeg|css|js)$/.test(url.pathname)
  );
}

function isApi(url) {
  return url.pathname.includes('/api/v1/');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // App navigations → network-first, fall back to cached shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put('/', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('/').then((m) => m || Response.error())),
    );
    return;
  }

  // API → network-first, cache fallback (works cross-origin with CORS).
  if (isApi(url)) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(API_CACHE).then((c) => c.put(request, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(request).then((m) => m || Response.error())),
    );
    return;
  }

  // Static assets → cache-first, revalidate in the background.
  if (url.origin === self.location.origin && isStatic(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(request, copy)).catch(() => {});
            }
            return res;
          })
          .catch(() => cached || Response.error());
        return cached || network;
      }),
    );
  }
});
