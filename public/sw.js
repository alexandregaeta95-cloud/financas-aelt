// Service Worker to handle background/minimized notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'PING') {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ status: 'PONG' });
    }
    return;
  }

  if (event.data.type === 'SHOW_NOTIFICATION') {
    const promise = self.registration.showNotification(event.data.title, {
      body: event.data.body,
      icon: event.data.icon,
      tag: event.data.tag || 'risk-zone-alert',
      renotify: event.data.renotify !== false,
      requireInteraction: event.data.requireInteraction !== false,
      vibrate: event.data.vibrate || [500, 110, 500, 110, 450, 110, 200, 110, 170, 40],
      silent: false
    }).then(() => {
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ success: true });
      }
    }).catch((err) => {
      console.error('ServiceWorker notification error:', err);
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ success: false, error: String(err) });
      }
    });

    event.waitUntil(promise);
  }
});

// Listener for background Web Push events
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'Pix Recebido! 💸',
        body: event.data.text()
      };
    }
  }

  const title = data.title || 'Pix Recebido! 💸';
  const options = {
    body: data.body || 'Nova transação financeira recebida.',
    icon: data.icon || 'https://cdn-icons-png.flaticon.com/512/10542/10542475.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/10542/10542475.png',
    vibrate: [200, 100, 200, 100, 200, 100, 200],
    tag: data.tag || 'pix-notification',
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.url || '/?tab=transactions&add=true',
      valor: data.valor,
      descricao: data.descricao,
      banco: data.banco
    },
    actions: [
      {
        action: 'receita',
        title: '📈 Receita',
        icon: 'https://cdn-icons-png.flaticon.com/512/189/189246.png'
      },
      {
        action: 'despesa',
        title: '📉 Despesa',
        icon: 'https://cdn-icons-png.flaticon.com/512/189/189247.png'
      }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Listener for notification clicks (redirect to correct launch screen with params)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const notificationData = event.notification.data || {};
  
  // Base URL parsing (relative to the origin)
  let targetUrl = notificationData.url || '/?tab=transactions&add=true';
  if (!targetUrl.startsWith('http')) {
    targetUrl = self.location.origin + targetUrl;
  }
  
  // Append action parameters if clicked
  if (action === 'receita') {
    targetUrl += `&tipo=RECEITA`;
  } else if (action === 'despesa') {
    targetUrl += `&tipo=DESPESA`;
  }
  
  if (notificationData.valor) {
    targetUrl += `&valor=${encodeURIComponent(notificationData.valor)}`;
  }
  if (notificationData.descricao) {
    targetUrl += `&descricao=${encodeURIComponent(notificationData.descricao)}`;
  }
  if (notificationData.banco) {
    targetUrl += `&banco=${encodeURIComponent(notificationData.banco)}`;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Look for any already open tab on our site and navigate/focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            return client.navigate(targetUrl).then(c => c ? c.focus() : null);
          }
          return client.focus();
        }
      }
      // If no tab is open, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
