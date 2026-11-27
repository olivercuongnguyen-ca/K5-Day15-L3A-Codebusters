// Service worker: offline shell + push notifications.
const CACHE = 'ai20k-v13';
const SHELL = ['/', '/static/app.css?v=13', '/static/app.js?v=13', '/manifest.webmanifest', '/static/icons/icon-192.png', '/static/campus-map.svg?v=2'];

self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Network first for the shell and your week (always fresh when online); cached copy when offline.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const cacheable = !url.pathname.startsWith('/api/') || url.pathname.startsWith('/api/week') || url.pathname.startsWith('/api/shared') || url.pathname === '/api/buildings';
  if (!cacheable || url.pathname.startsWith('/cal/')) return;
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match(e.request)));
});

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data.json(); } catch (err) { d = {title: 'Lịch AI20K', body: e.data ? e.data.text() : ''}; }
  e.waitUntil(self.registration.showNotification(d.title || 'Lịch AI20K', {
    body: d.body || '', tag: d.tag || undefined, icon: '/static/icons/icon-192.png', badge: '/static/icons/icon-192.png',
    data: {url: d.url || '/'}
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(clients.matchAll({type: 'window', includeUncontrolled: true}).then(ws => {
    for (const w of ws) { if ('focus' in w) { w.navigate(target); return w.focus(); } }
    return clients.openWindow(target);
  }));
});
