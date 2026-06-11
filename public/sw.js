self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Minimal fetch listener needed for "Add to Home Screen" to trigger in Chrome.
  // We do not intercept caching manually to let Turbopack/Next.js handle its own routing.
});
