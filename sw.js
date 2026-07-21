// =====================================
// KARMAS MARKET — SERVICE WORKER
// Caches key files for offline access
// =====================================

const CACHE_NAME = "karmas-market-v1";

const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/home.html",
  "/app.js",
  "/style.css",
  "/manifest.json"
];

// Install — cache all assets
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("Karmas Market: caching assets");
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — serve from cache, fall back to network
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).catch(() => {
        // If offline and not cached, show offline page
        if (event.request.destination === "document") {
          return caches.match("/index.html");
        }
      });
    })
  );
});