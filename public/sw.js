// Kill-switch service worker.
// A previous version used a network-first caching strategy that could break
// navigation (ERR_FAILED) for returning visitors. This version unregisters
// itself and clears all caches, so any browser that still has the old worker
// installed recovers automatically on its next visit.
self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
      await self.registration.unregister()
      const clients = await self.clients.matchAll({ type: 'window' })
      clients.forEach((c) => c.navigate(c.url))
    } catch (e) {
      // no-op
    }
  })())
})
// No fetch handler: the browser handles every request directly over the network.
