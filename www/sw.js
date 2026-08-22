// =====================================
// KARMAS MARKET — SERVICE WORKER
// Caches key files for offline access
// =====================================

const CACHE_NAME = "karmas-market-v3"; // bumped again — switched to network-first for core files

const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/home.html",
  "/app.js",
  "/style.css",
  "/manifest.json"
];

// Files that must ALWAYS be fetched fresh from the network first.
// These are the files that change every deploy — if we serve them from
// cache first, new deploys never show up until the cache name is bumped.
const NETWORK_FIRST_FILES = [
  "/",
  "/index.html",
  "/home.html",
  "/app.js",
  "/style.css"
];

function isNetworkFirst(url) {
  const path = new URL(url).pathname;
  return NETWORK_FIRST_FILES.some(f => path === f || path.endsWith(f));
}

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

// Fetch — network-first for core app files (so deploys always show up),
// cache-first for everything else (images, fonts, etc.)
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

  // NETWORK-FIRST: core app files. Always try the real network first so
  // every deploy shows up immediately. Only fall back to cache if the
  // network request fails (i.e. the user is offline).
  if (isNetworkFirst(url)) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Save a fresh copy in the cache for offline fallback later
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          // Offline — fall back to whatever we have cached
          return caches.match(event.request).then(cached => {
            if (cached) return cached;
            if (event.request.destination === "document") {
              return caches.match("/index.html").then(page => {
                return page || new Response(
                  "<h1>You're offline</h1><p>Please check your connection and try again.</p>",
                  { status: 503, headers: { "Content-Type": "text/html" } }
                );
              });
            }
            return new Response("", {
              status: 503,
              statusText: "Offline — resource unavailable"
            });
          });
        })
    );
    return;
  }

  // CACHE-FIRST: everything else (images, fonts, icons, etc.)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).catch(() => {
        if (event.request.destination === "document") {
          return caches.match("/index.html").then(page => {
            return page || new Response(
              "<h1>You're offline</h1><p>Please check your connection and try again.</p>",
              { status: 503, headers: { "Content-Type": "text/html" } }
            );
          });
        }

        if (event.request.destination === "image") {
          return new Response(
            new Blob(), { status: 503, statusText: "Offline" }
          );
        }

        return new Response("", {
          status: 503,
          statusText: "Offline — resource unavailable"
        });
      });
    })
  );
});