// Service worker: funciona sin conexión en obra
const CACHE = 'libro-obra-v2';
const ASSETS = ['./', 'index.html', 'css/styles.css', 'js/template.js', 'js/config.js', 'js/ui.js', 'js/store.js', 'js/demo.js', 'js/views-obra.js', 'js/views-registro.js', 'js/views-tools.js', 'js/views-economia.js', 'js/app.js', 'vendor/xlsx.full.min.js', 'assets/icon.svg', 'assets/icon-192.png', 'assets/icon-512.png', 'manifest.webmanifest'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin !== location.origin) {
    // fuentes: cache; APIs de clima: siempre red
    if (url.hostname.includes('fonts.')) e.respondWith(caches.open(CACHE).then(async (c) => (await c.match(e.request)) || fetch(e.request).then((r) => { c.put(e.request, r.clone()); return r; })));
    return;
  }
  // red primero (para recibir actualizaciones), caché como respaldo
  e.respondWith(fetch(e.request).then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request).then((r) => r || caches.match('index.html'))));
});
