// Basic Service Worker for Offline Capabilities
const CACHE_NAME = 'm-chat-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './assets/m-chat-logo.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});
