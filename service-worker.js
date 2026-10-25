// The previous version of this site (a Create React App build) registered a
// Workbox service worker that precached the old bundle. This replacement
// clears those caches, unregisters itself and reloads open tabs so returning
// visitors get the new site instead of the cached one.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      clients.forEach((client) => client.navigate(client.url));
    })()
  );
});
