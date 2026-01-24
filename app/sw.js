const CACHE_NAME = 'tss-cache-v6.5';
const urlsToCache = [
    './',
    './index.html',
    './TSS.html',
    './manifest.json',
    './logo/TSS_logo.png',
    './logo/TSS_icon.png'
];

// Install
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('TSS Cache opened');
                return cache.addAll(urlsToCache).catch(err => {
                    console.log('Cache addAll failed:', err);
                });
            })
    );
    self.skipWaiting();
});

// Activate
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch - Network first, then cache
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Skip API requests
    if (event.request.url.includes('script.google.com') ||
        event.request.url.includes('googleapis.com')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Clone the response
                const responseToCache = response.clone();

                caches.open(CACHE_NAME)
                    .then(cache => {
                        cache.put(event.request, responseToCache);
                    });

                return response;
            })
            .catch(() => {
                // Fallback to cache
                return caches.match(event.request);
            })
    );
});
