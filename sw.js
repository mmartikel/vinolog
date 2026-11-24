// VinoLog Service Worker: macht die App offline nutzbar.
// Bei Änderungen an der App die Versionsnummer erhöhen.
const CACHE = 'vinolog-v4';
const APP_FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // KI-Anfragen nie zwischenspeichern
  if (url.hostname.includes('generativelanguage.googleapis.com')) return;

  // Eigene Seite: erst online versuchen (damit Updates ankommen), sonst Cache
  if (req.mode === 'navigate' || url.origin === self.location.origin) {
    event.respondWith(
      fetch(req, { cache: 'no-store' }) // immer die neueste Version von GitHub holen
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // Externe Dateien (Tailwind, Schriften): Cache zuerst, im Hintergrund auffrischen
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
