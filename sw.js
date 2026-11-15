// Service worker: deja la app guardada en el celular para que abra aunque no haya señal.
// Los datos los guarda Firestore por su cuenta (caché sin conexión).
const VERSION = 'cuaderno-v13';
const ARCHIVOS = [
  './', 'index.html', 'manifest.json', 'css/estilos.css',
  'js/visuales.js', 'js/recorridos.js', 'js/escenas.js', 'js/vistas/recuperacion.js',
  'audios/juan/v5/c1.mp3', 'audios/juan/v5/c2.mp3', 'audios/juan/v5/c3.mp3', 'audios/juan/v5/c4.mp3', 'audios/juan/v5/c5.mp3', 'audios/juan/v5/c6.mp3',
  'js/vistas/nutricion.js',
  'js/app.js', 'js/config.js', 'js/datos.js', 'js/db.js', 'js/guias.js', 'js/nucleo.js', 'js/plan.js', 'js/util.js', 'js/alimentos.js', 'js/glucemica.js', 'datos/alimentos.json', 'js/vistas/consulta-comida.js',
  'js/vistas/hoy.js', 'js/vistas/portada.js', 'js/vistas/corazon.js', 'js/vistas/medir.js', 'js/vistas/comidas.js', 'js/vistas/agenda.js', 'js/vistas/cuidados.js', 'js/vistas/emergencia.js', 'js/vistas/ajustes.js', 'js/vistas/resumen.js',
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

  // Safari solicita rangos para audio: guardar la pista completa y servir solo el tramo pedido.
  if (propio && url.pathname.includes('/audios/juan/')) {
    e.respondWith((async () => {
      const completa = new Request(url.origin + url.pathname);
      let res = await caches.match(completa);
      if (!res) {
        try { res = await fetch(completa); } catch (err) { return new Response('', { status: 503 }); }
        if (res.ok) { const c = await caches.open(VERSION); await c.put(completa, res.clone()); }
      }
      if (!res || !res.ok) return res || new Response('', { status: 404 });
      const range = req.headers.get('Range');
      if (!range) return res;
      const datos = await res.arrayBuffer(), total = datos.byteLength;
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      const fallo = () => new Response('', { status: 416, headers: { 'Content-Range': 'bytes */' + total } });
      if (!match || (!match[1] && !match[2])) return fallo();
      const inicio = match[1] ? Number(match[1]) : Math.max(0, total - Number(match[2]));
      const fin = match[1] && match[2] ? Math.min(Number(match[2]), total - 1) : total - 1;
      if (inicio >= total || inicio > fin) return fallo();
      return new Response(datos.slice(inicio, fin + 1), { status: 206, headers: {
        'Content-Type': 'audio/mpeg', 'Accept-Ranges': 'bytes',
        'Content-Range': 'bytes ' + inicio + '-' + fin + '/' + total,
        'Content-Length': String(fin - inicio + 1)
      }});
    })());
    return;
  }

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
