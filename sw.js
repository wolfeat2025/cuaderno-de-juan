// Service worker: deja la app guardada en el celular para que abra aunque no haya señal.
// Los datos los guarda Firestore por su cuenta (caché sin conexión).
const VERSION = 'cuaderno-v3';
const ARCHIVOS = [
  './', 'index.html', 'manifest.json', 'css/estilos.css',
  'js/app.js', 'js/config.js', 'js/datos.js', 'js/db.js', 'js/nucleo.js', 'js/plan.js', 'js/util.js',
  'js/vistas/hoy.js', 'js/vistas/medir.js', 'js/vistas/comidas.js', 'js/vistas/agenda.js', 'js/vistas/emergencia.js', 'js/vistas/ajustes.js', 'js/vistas/resumen.js',
  'iconos/apple-touch-icon.png', 'iconos/icon-192.png', 'fuentes/nunito-400.woff2', 'fuentes/nunito-700.woff2', 'fuentes/nunito-800.woff2',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => Promise.all(ARCHIVOS.map((u) => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const propio = url.origin === self.location.origin;
  const sdk = url.origin === 'https://www.gstatic.com' && url.pathname.indexOf('/firebasejs/') === 0;
  if (!propio && !sdk) return;   // Firestore y Auth van directo a la red

  if (sdk) {   // versión fija: primero lo guardado
    e.respondWith(caches.match(req).then((r) => r || fetch(req).then((res) => { const copia = res.clone(); caches.open(VERSION).then((c) => c.put(req, copia)); return res; })));
    return;
  }
  // Archivos de la app: primero la red (para recibir mejoras), con 3 segundos de espera; si no, lo guardado.
  e.respondWith(new Promise((resolver) => {
    let listo = false;
    const deCache = () => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('index.html'));
    const reloj = setTimeout(() => { if (!listo) { listo = true; resolver(deCache()); } }, 3000);
    fetch(req).then((res) => {
      if (res && res.ok) { const copia = res.clone(); caches.open(VERSION).then((c) => c.put(url.search ? new Request(url.origin + url.pathname) : req, copia)); }
      if (!listo) { listo = true; clearTimeout(reloj); resolver(res); }
    }).catch(() => { if (!listo) { listo = true; clearTimeout(reloj); resolver(deCache()); } });
  }));
});
