const CACHE_NAME = 'hfa-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(names => Promise.all(names.map(name => caches.delete(name)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // 只缓存静态资源，不拦截页面导航和 API 请求
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/_next/') || url.pathname.startsWith('/icons/') || event.request.destination === 'image') {
    event.respondWith(
      caches.match(event.request).then(response => response || fetch(event.request))
    );
  }
  // 其他请求直接走网络，不缓存
});

self.addEventListener('push', (event) => {
  const data = event.data?.json() || { title: '提醒', body: '' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/dashboard/reminders'));
});
