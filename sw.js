const CACHE = 'gymnerd-v1';
const ASSETS = [
  './',
  './home.html',
  './livesession.html',
  './manifest.json',
  './favicon.svg',
  './auth.js',
  './db.js',
  './drive-storage.js',
  './gn-i18n.js',
  './icons/icon-192.svg',
  './icons/icon-512.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const acceptHeader = event.request.headers.get('Accept') || '';
  const isHtmlRequest = acceptHeader.includes('text/html');

  // Network-first for navigation / HTML requests so users get fresh pages quickly.
  if (isHtmlRequest) {
    // If the browser requested a reload (hard refresh), prefer network and do not
    // fall back to cache. Some browsers set `event.request.cache === 'reload'` on
    // hard reloads; others send `Cache-Control: no-cache` in the request headers.
    const isReload = event.request.cache === 'reload' || (event.request.headers.get('Cache-Control') || '').includes('no-cache');

    if (isReload) {
      event.respondWith(
        fetch(event.request, { cache: 'no-store' }).then(response => {
          if (response && response.status === 200) {
            const resClone = response.clone();
            caches.open(CACHE).then(cache => cache.put(event.request, resClone));
          }
          return response;
        }).catch(() => caches.match('./home.html'))
      );
      return;
    }

    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).then(response => {
        if (response && response.status === 200) {
          const resClone = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, resClone));
        }
        return response;
      }).catch(() => caches.match('./home.html'))
    );
    return;
  }

  // For other assets: stale-while-revalidate — respond with cache if available,
  // and update cache in background so future requests are fresh.
  // If this is a forced reload, bypass cache for non-HTML assets too.
  const isReloadReq = event.request.cache === 'reload' || (event.request.headers.get('Cache-Control') || '').includes('no-cache');

  if (isReloadReq) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).then(response => {
        if (!response || response.status !== 200) return response;
        if (response.type === 'basic' || new URL(event.request.url).origin === self.location.origin) {
          try {
            const resClone = response.clone();
            caches.open(CACHE).then(cache => cache.put(event.request, resClone));
          } catch (e) { /* ignore caching errors */ }
        }
        return response;
      }).catch(() => caches.match('./home.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request, { cache: 'no-store' }).then(response => {
        if (!response || response.status !== 200) return response;
        // Only cache same-origin/basic responses to avoid opaque responses from third parties.
        if (response.type === 'basic' || new URL(event.request.url).origin === self.location.origin) {
          try {
            const resClone = response.clone();
            caches.open(CACHE).then(cache => cache.put(event.request, resClone));
          } catch (e) { /* ignore caching errors */ }
        }
        return response;
      }).catch(() => undefined);

      // Return cached if present, otherwise wait for network.
      return cached || networkFetch;
    })
  );
});
