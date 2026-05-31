/* RK POOJA — minimal service worker for app-shell offline support */
const CACHE = 'rkpooja-v1';
const APP_SHELL = [
  '/',
  '/manifest.json',
  '/logo.png',
  '/pwa-192.png',
  '/pwa-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Never cache API calls — always go to network
  if (url.pathname.startsWith('/api/')) return;
  // Network-first for HTML, cache-first for static
  if (req.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(req).then((r) => {
        const copy = r.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return r;
      }).catch(() => caches.match(req).then((r) => r || caches.match('/')))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((r) => {
      const copy = r.clone();
      if (r.status === 200) caches.open(CACHE).then((c) => c.put(req, copy));
      return r;
    }).catch(() => cached))
  );
});
