// RoadMate service worker — prima Web Push i prikazuje notifikacije.
// Ako je aplikacija otvorena i fokusirana, notifikacija se preskače
// (korisnik to već vidi uživo kroz realtime/poll).

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  event.waitUntil(
    (async () => {
      const windows = await clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      if (windows.some((w) => w.focused)) return;
      await self.registration.showNotification(data.title || 'RoadMate', {
        body: data.body || '',
        tag: data.tag || undefined,
        data: { url: data.url || '/' },
        badge: undefined,
        icon: undefined,
      });
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    (async () => {
      const windows = await clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      const existing = windows[0];
      if (existing) {
        await existing.focus();
        if ('navigate' in existing) await existing.navigate(url);
        return;
      }
      await clients.openWindow(url);
    })(),
  );
});
