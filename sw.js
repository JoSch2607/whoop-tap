// Offline shell for the tap app.
//
// The only thing cached is the app itself, so the buttons still work in a
// basement with no signal — the tap lands in localStorage with its real time
// and syncs when the phone comes back. GitHub API calls are never cached:
// a stale 200 would make a failed write look like a successful one.

const CACHE = "whooptap-v1";
const SHELL = ["./", "./index.html", "./manifest.webmanifest",
               "./icon-180.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;   // never touch api.github.com

  // Network first, so a deployed fix reaches the phone without a hard reload;
  // cache is the fallback when there is no network at all.
  event.respondWith(
    fetch(event.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(event.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(event.request).then(hit => hit || caches.match("./index.html")))
  );
});
