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
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        try {
          if (!response || response.status !== 200 || response.type !== 'basic') return response;
          const resClone = response.clone();
          try {
            const reqUrl = new URL(event.request.url);
            if (reqUrl.protocol === 'http:' || reqUrl.protocol === 'https:') {
              caches.open(CACHE).then(cache => cache.put(event.request, resClone));
            }
          } catch (e) {
            // If URL parsing fails or protocol is unsupported, skip caching
          }
        } catch (e) { /* ignore caching errors */ }
        return response;
      }).catch(() => caches.match('./home.html'));
    })
  );
});
