const CACHE_NAME = 'cco-cache-v2';
const STATIC_EXTENSIONS = ['.js', '.css', '.woff2', '.woff', '.ttf', '.png', '.svg', '.ico', '.jpg', '.jpeg', '.webp'];

// Install: activate immediately
self.addEventListener('install', () => {
  self.skipWaiting();
});

// Activate: clean old caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: cache-first for static assets, network-only for API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Supabase API/Auth/Realtime — data must always be fresh
  if (url.hostname.includes('supabase')) return;

  // Skip Chrome extensions and other protocols
  if (!url.protocol.startsWith('http')) return;

  // Check if it's a static asset
  const isStatic = STATIC_EXTENSIONS.some(ext => url.pathname.endsWith(ext));

  // Also cache Google Fonts
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

  if (isStatic || isFont) {
    event.respondWith(
      caches.match(request).then(cached => {
        // Return cached version immediately if available
        if (cached) {
          // Update cache in background (stale-while-revalidate)
          fetch(request).then(response => {
            if (response && response.ok) {
              caches.open(CACHE_NAME).then(cache => cache.put(request, response));
            }
          }).catch(() => { /* offline, ignore */ });
          return cached;
        }

        // No cache — fetch from network and cache it
        return fetch(request).then(response => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // For HTML navigation requests — network-first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
  }
});
