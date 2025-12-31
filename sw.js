/**
 * Reign - Service Worker
 * Enables offline functionality and caching
 * Updated for production deployment
 */

const CACHE_NAME = 'reign-v17';

// Core assets that must be cached for offline functionality
const CORE_ASSETS = [
    '/',
    '/index.html',
    '/auth.html',
    '/styles.css',
    '/css/components.css',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png'
];

// JavaScript files
const JS_ASSETS = [
    '/js/core.js',
    '/js/app.js',
    '/js/storage.js',
    '/js/router.js',
    '/js/charts.js',
    '/js/views.js',
    '/js/utils.js',
    '/js/config.js',
    '/js/auth.js',
    '/js/sync.js',
    '/js/components/header.js',
    '/js/components/sidebar.js',
    '/js/components/footer.js'
];

// All pages
const PAGE_ASSETS = [
    '/pages/morning.html',
    '/pages/evening.html',
    '/pages/events.html',
    '/pages/learning.html',
    '/pages/lessons.html',
    '/pages/idea.html',
    '/pages/dailygood.html',
    '/pages/relationships.html',
    '/pages/notifications.html',
    '/pages/archive.html',
    '/pages/settings.html',
    '/pages/about.html',
    '/pages/support.html'
];

// Combine all assets
const ASSETS_TO_CACHE = [...CORE_ASSETS, ...JS_ASSETS, ...PAGE_ASSETS];

// External CDN resources (cache on first use)
const CDN_RESOURCES = [
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
    'https://unpkg.com',
    'https://cdn.jsdelivr.net'
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching core assets...');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
            .catch((err) => {
                console.error('[SW] Cache install failed:', err);
            })
    );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cache) => {
                        if (cache !== CACHE_NAME) {
                            console.log('[SW] Clearing old cache:', cache);
                            return caches.delete(cache);
                        }
                    })
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch event - Network first for API, Cache first for assets
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip API requests (let them go to network)
    if (url.pathname.startsWith('/api/')) {
        return event.respondWith(fetch(event.request));
    }

    // For CDN resources - stale while revalidate
    if (CDN_RESOURCES.some(cdn => url.origin.includes(cdn.replace('https://', '')))) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                const fetchPromise = fetch(event.request).then((networkResponse) => {
                    if (networkResponse.ok) {
                        const clone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    }
                    return networkResponse;
                }).catch(() => cachedResponse);

                return cachedResponse || fetchPromise;
            })
        );
        return;
    }

    // For app assets - cache first, network fallback
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    // Return cached, but also update cache in background
                    fetch(event.request).then((networkResponse) => {
                        if (networkResponse.ok) {
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, networkResponse);
                            });
                        }
                    }).catch(() => { });
                    return cachedResponse;
                }

                // Not in cache, fetch from network
                return fetch(event.request)
                    .then((networkResponse) => {
                        if (networkResponse.ok) {
                            const clone = networkResponse.clone();
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, clone);
                            });
                        }
                        return networkResponse;
                    })
                    .catch(() => {
                        // Offline fallback for navigation
                        if (event.request.mode === 'navigate') {
                            return caches.match('/index.html');
                        }
                    });
            })
    );
});
