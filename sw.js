// =====================================
// KARMAS MARKET — SERVICE WORKER
// Caches key files for offline access
// =====================================

const CACHE_NAME = "karmas-market-v2"; // bumped so old broken cache is discarded

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
  const url = event.request.url;

  // Bypass service worker for Firebase/Google API calls and non-GET requests
  if (
    event.request.method !== "GET" ||
    url.includes("googleapis.com") ||
    url.includes("google.com") ||
    url.includes("firebaseio.com") ||
    url.includes("gstatic.com")
  ) {
    return; // Let the browser handle it normally, no interception
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).catch(() => {
        // IMPORTANT: this catch block must ALWAYS resolve to a real
        // Response object. Previously it returned undefined for any
        // request that wasn't a full page load (images, scripts, css,
        // icons, etc). respondWith() cannot accept undefined — it throws
        // "Failed to convert value to 'Response'" and logs a network
        // error, which is exactly what was flooding the console.

        if (event.request.destination === "document") {
          return caches.match("/index.html").then(page => {
            return page || new Response(
              "<h1>You're offline</h1><p>Please check your connection and try again.</p>",
              { status: 503, headers: { "Content-Type": "text/html" } }
            );
          });
        }

        // For images: return a tiny transparent placeholder instead of
        // failing, so broken image icons don't appear everywhere.
        if (event.request.destination === "image") {
          return new Response(
            new Blob(), { status: 503, statusText: "Offline" }
          );
        }

        // For everything else (scripts, css, fonts, json, etc.) — return
        // an empty but valid Response so the app doesn't crash trying to
        // process a missing resource while offline.
        return new Response("", {
          status: 503,
          statusText: "Offline — resource unavailable"
        });
      });
    })
  );
});
