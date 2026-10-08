// Service worker mínimo: permite instalar la app. No guarda copias de los
// archivos (siempre se carga la última versión publicada).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
