const CACHE_NAME = 'habit-tracker-v1';
const ASSETS = [
  const ASSETS = [
  '/Habit-Tracker/',
  '/Habit-Tracker/index.html',
  '/Habit-Tracker/style.css',
  '/Habit-Tracker/app.js',
  '/Habit-Tracker/manifest.json',
  '/Habit-Tracker/icon-192.png',
  '/Habit-Tracker/icon-512.png'
];

// Install: cache all assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: serve from cache, fall back to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
