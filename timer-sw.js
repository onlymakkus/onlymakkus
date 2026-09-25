// Service Worker NUR für timer.html — registriert mit scope:'/timer.html', greift also für
// keine andere onlymakkus-Seite. Cached die Timer-Seite + ihr Manifest/Icons, damit sie in
// der Halle auch mit schlechtem/keinem Empfang neu öffnet, nachdem sie einmal geladen wurde.
const CACHE_VERSION = 'v6';
const CACHE_NAME = `om-timer-${CACHE_VERSION}`;

const ASSETS = [
  '/timer.html',
  '/timer.webmanifest',
  '/icons/timer-icon-192.png',
  '/icons/timer-icon-512.png',
  '/icons/timer-icon-maskable-512.png',
  '/icons/timer-apple-touch-icon.png',
  '/icons/timer-favicon-32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // Nur eigene Assets cachen — Supabase-Requests (Account-Widget) und Google Fonts
  // unangetastet direkt ans Netzwerk durchreichen.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
