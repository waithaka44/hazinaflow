// HazinaFlow offline service worker.
// To ship an update: change the files, then bump CACHE_VERSION so phones fetch fresh copies.
const CACHE_VERSION = 'hazinaflow-v1';
const APP_SHELL = [
    './',
    './index.html',
    './manifest.webmanifest',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/icon-maskable-512.png',
    './icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then(cache => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

// Stale-while-revalidate: open instantly from cache (works with no data bundles),
// refresh the cached copy in the background when online.
self.addEventListener('fetch', event => {
    const req = event.request;
    if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

    event.respondWith(caches.open(CACHE_VERSION).then(async cache => {
        const cached = await cache.match(req, { ignoreSearch: true });
        const network = fetch(req)
            .then(res => {
                if (res && res.ok) cache.put(req, res.clone());
                return res;
            })
            .catch(() => null);

        if (cached) {
            event.waitUntil(network);
            return cached;
        }
        const res = await network;
        if (res) return res;
        if (req.mode === 'navigate') return (await cache.match('./index.html')) || Response.error();
        return Response.error();
    }));
});
