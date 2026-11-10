// El cuaderno de Juan — arranque, navegación y armazón de la app.
import { firebaseConfig } from './config.js';
import * as db from './db.js';
import { estado, acciones, fijarPintar, pintar, ir, aviso, ejecutarDeshacer, guardarLocal, leerLocal, aplicarTema } from './nucleo.js';
import { esc, ico, igualar, porId, val, claveFecha, sumarDias, lunesDe, idAzar } from './util.js';
import { PERSONAS, completarConfig, configInicial } from './datos.js';
import * as hoy from './vistas/hoy.js';
import * as medir from './vistas/medir.js';
import * as comidas from './vistas/comidas.js';
import * as agenda from './vistas/agenda.js';
import * as emergencia from './vistas/emergencia.js';
import * as ajustes from './vistas/ajustes.js';
import * as resumen from './vistas/resumen.js';
import { resumenRemedios, asegurarPlanHoy } from './plan.js';

const params = new URLSearchParams(location.search);
const EMULADOR = params.get('emu') === '1' && /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const CODIGO_OK = /^[A-Za-z0-9]{24,64}$/;
const sufijoEmu = EMULADOR ? '&emu=1' : '';
if (EMULADOR) window.__estado = estado;   // solo para las pruebas locales

const VISTAS = {
  hoy: { render: hoy.render, titulo: () => 'Hoy', pestana: 'hoy' },
  medir: { render: medir.render, titulo: medir.titulo, pestana: 'medir' },
  comidas: { render: comidas.render, titulo: comidas.titulo, pestana: 'comidas' },
  agenda: { render: agenda.render, titulo: agenda.titulo, pestana: 'agenda' },
  ajustes: { render: ajustes.render, titulo: ajustes.titulo, pestana: 'ajustes' },
  emergencia: { render: emergencia.render, titulo: () => 'Emergencia', pestana: '' },
  resumen: { render: resumen.render, titulo: resumen.titulo, pestana: 'resumen' },
};
const PESTANAS = [['hoy', 'home', 'Hoy'], ['medir', 'pulse', 'Medir'], ['comidas', 'food', 'Comidas'], ['agenda', 'cal', 'Agenda']];

function ruta() {
  const partes = (location.hash || '#hoy').slice(1).split('/').map(decodeURIComponent);
  return { nombre: partes[0] || 'hoy', args: partes.slice(1), completa: partes.join('/') };
}

// ---------- Pantallas previas a la app ----------
const marco = (cuerpo) => `<div class="previa">${cuerpo}</div>`;
const pantallaConfigurar = () => marco(`<p class="marca">El cuaderno de Juan</p><h1>Falta conectar la base de datos</h1>
  <p class="sub grande">Este paso lo hace Fabián una sola vez: crear el proyecto en Firebase y pegar la configuración en el archivo <b>js/config.js</b>. Las instrucciones están en el README.</p>`);
const pantallaCargando = () => marco(`<p class="marca">El cuaderno de Juan</p><h1>Abriendo el cuaderno…</h1>
  <p class="sub grande">${estado.lento ? 'Está demorando. La primera vez se necesita internet: revisa la señal.' : 'Un momento.'}</p>`);
const pantallaError = () => marco(`<p class="marca">El cuaderno de Juan</p><h1>No se pudo abrir</h1>
  <p class="sub grande">${esc(estado.error)}</p><button class="btn pri" data-a="recargar">${ico('undo')}Intentar de nuevo</button>`);
const pantallaQuien = () => marco(`<p class="marca">El cuaderno de Juan</p><h1>¿Quién eres?</h1>
  <p class="sub grande">Toca tu nombre. Queda guardado en este celular y firma lo que anotes.</p>
  ${PERSONAS.map((p) => `<button class="btn sec gigante" data-a="elegirQuien" data-v="${p}">${ico('user')}${p}</button>`).join('')}`);
const pantallaBienvenida = () => marco(`<p class="marca">El cuaderno de Juan</p><h1>Falta el link de la familia</h1>
  <p class="sub grande">Abre el link que te mandaron por WhatsApp. Si lo tienes copiado, pégalo aquí.</p>
  <input class="texto" id="link-entrada" placeholder="Pega aquí el link" autocomplete="off" aria-label="Link de la familia">
  ${estado.ui.errorLink ? `<p class="error" role="alert">${ico('alert')}${esc(estado.ui.errorLink)}</p>` : ''}
  <button class="btn pri" data-a="entrarConLink">${ico('check')}Entrar</button>
  <div class="panel"><p class="h3">¿Eres Fabián y es la primera vez?</p><p class="sub">Esto crea un cuaderno nuevo y vacío para la familia.</p>
  <button class="btn quieto" data-a="crearCuaderno">${ico('plus')}Crear el cuaderno de la familia</button></div>`);

// ---------- Armazón ----------
function armazon(r) {
  if (r.nombre === 'ambulancia') return emergencia.renderAmbulancia();
  const v = VISTAS[r.nombre] || VISTAS.hoy;
  const esEmergencia = r.nombre === 'emergencia';
  const res = r.nombre === 'hoy' ? resumenRemedios(claveFecha(estado.ahora)) : null;
  const subiendo = estado.pendientes > 0 && estado.pendDesde && Date.now() - estado.pendDesde > 4000;
  const bajoTitulo = res && res.total ? `<p class="bajo-titulo">${res.faltan === 0 ? 'Remedios listos' : res.faltan === 1 ? 'Falta 1 remedio' : `Faltan ${res.faltan} remedios`}</p>` : '';
  return `<header class="tope${esEmergencia ? ' rojo' : ''}"><div class="titulos"><h1>${esc(v.titulo(r.args))}</h1>${bajoTitulo}</div>
      ${esEmergencia ? '' : `<a class="sos" href="#emergencia">${ico('phone')}Emergencia</a>`}</header>
    ${navigator.onLine === false ? `<p class="sin-senal no-imprimir">${ico('info')}Sin señal. Lo que anotes se guarda en este celular y se sube cuando vuelva.</p>`
      : subiendo ? `<p class="sin-senal no-imprimir">${ico('clock')}${estado.pendientes === 1 ? 'Hay 1 registro guardado en este celular que todavía no sube.' : `Hay ${estado.pendientes} registros guardados en este celular que todavía no suben.`}</p>` : ''}
    <main id="vista" data-k="${esc(r.completa)}">${v.render(r.args)}</main>
    <nav class="pestanas" aria-label="Secciones"><p class="marca-nav solo-pc"><span class="ic">${ico('pill')}</span>El cuaderno<br>de Juan</p>
      ${PESTANAS.map(([id, icono, nombre]) => { const on = v.pestana === id || (id === 'agenda' && v.pestana === 'ajustes'); return `<a href="#${id}" class="${v.pestana === id ? 'on' : on ? 'on-movil' : ''}"${on ? ' aria-current="page"' : ''}>${ico(icono)}${nombre}</a>`; }).join('')}
      <a href="#resumen" class="solo-pc${v.pestana === 'resumen' ? ' on' : ''}">${ico('chart')}Resumen</a>
      <a href="#ajustes" class="solo-pc abajo${v.pestana === 'ajustes' ? ' on' : ''}">${ico('gear')}Ajustes</a></nav>`;
}

function pintarTodo() {
  let html;
  if (estado.fase === 'configurar') html = pantallaConfigurar();
  else if (estado.fase === 'bienvenida') html = pantallaBienvenida();
  else if (estado.fase === 'error') html = pantallaError();
  else if (!estado.quien) html = pantallaQuien();
  else if (!estado.config) html = pantallaCargando();
  else html = armazon(ruta());
  igualar(porId('app'), html);

  // Al entrar a Hoy, bajar hasta lo que toca ahora (como una agenda).
  if (estado.config && estado.quien && estado.ui.irAhora && ruta().nombre === 'hoy') {
    estado.ui.irAhora = false;
    const toca = document.querySelector('.fila.toca'), marca = porId('ahora');
    const destino = toca || marca;
    if (destino) {
      const y = destino.getBoundingClientRect().top + window.pageYOffset - (toca ? 108 : 180);
      window.scrollTo(0, y > 120 ? y : 0);
    }
  }
}
fijarPintar(pintarTodo);
aplicarTema();

// ---------- Acciones generales ----------
acciones.recargar = () => location.reload();
acciones.elegirQuien = (d) => {
  estado.quien = d.v; guardarLocal('cj_quien', d.v);
  if (d.volver) { aviso(`Este celular ahora es de ${d.v}`); ir(d.volver); } else { estado.ui.irAhora = true; pintar(); }
};
acciones.crearCuaderno = () => { const c = idAzar(28); guardarLocal('cj_familia', c); location.href = `${location.pathname}?f=${c}${sufijoEmu}`; };
acciones.entrarConLink = () => {
  const crudo = val('link-entrada'), m = crudo.match(/[?&]f=([A-Za-z0-9]+)/);
  const c = m ? m[1] : crudo;
  if (!CODIGO_OK.test(c)) { estado.ui.errorLink = 'Ese link no sirve. Cópialo completo desde WhatsApp.'; pintar(); return; }
  guardarLocal('cj_familia', c); location.href = `${location.pathname}?f=${c}${sufijoEmu}`;
};

// ---------- Eventos ----------
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-a]'); if (!el || el.disabled) return;
  const f = acciones[el.getAttribute('data-a')];
  if (f) { e.preventDefault(); f(el.dataset, el, e); }
});
document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-c]'); if (!el) return;
  const f = acciones[el.getAttribute('data-c')]; if (f) f(el.dataset, el, e);
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const t = e.target;
  if (e.key === 'Enter' && t.getAttribute && t.getAttribute('data-enter')) { e.preventDefault(); const f = acciones[t.getAttribute('data-enter')]; if (f) f(t.dataset, t, e); return; }
  if (t.getAttribute && t.getAttribute('role') === 'button') { e.preventDefault(); t.click(); }
});
porId('aviso-deshacer').addEventListener('click', ejecutarDeshacer);
window.addEventListener('hashchange', () => { estado.ui = { irAhora: true }; if (ruta().nombre === 'resumen') resumen.alEntrar(); window.scrollTo(0, 0); pintar(); });
window.addEventListener('online', pintar);
window.addEventListener('offline', pintar);
window.addEventListener('scroll', () => { document.body.classList.toggle('bajo', window.pageYOffset > 150); }, { passive: true });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  estado.ahora = new Date(); estado.ui.dia = null; revisarDia(); pintar();
});

// ---------- Datos en vivo ----------
let darDeBaja = null, diaSuscrito = '';
function suscribir() {
  if (darDeBaja) darDeBaja();
  const ahora = new Date();
  diaSuscrito = claveFecha(ahora);
  darDeBaja = db.escuchar(claveFecha(sumarDias(ahora, -8)), claveFecha(lunesDe(ahora)), {
    config: (datos, deCache) => {
      if (datos) { estado.config = completarConfig(datos); asegurarPlanHoy(); }
      else if (!deCache) db.guardarConfig(configInicial());   // primer uso: crear el cuaderno con los valores iniciales
      pintar();
    },
    planes: (lista) => { estado.planes = {}; lista.forEach((p) => { estado.planes[p.fecha] = p; }); estado.planesListos = true; asegurarPlanHoy(); pintar(); },
    tomas: (lista) => { estado.tomas = {}; lista.forEach((t) => { estado.tomas[t.id] = t; }); contarPendientes(); pintar(); },
    mediciones: (lista) => { estado.mediciones = lista.sort((a, b) => b.ts - a.ts); contarPendientes(); pintar(); },
    turnos: (lista) => { estado.turnos = {}; lista.forEach((t) => { estado.turnos[t.fecha] = t.quien; }); pintar(); },
    compras: (lista) => { estado.compras = lista; contarPendientes(); pintar(); },
    citas: (lista) => { estado.citas = lista; pintar(); },
    error: (e) => { if (e && e.code === 'permission-denied') { estado.fase = 'error'; estado.error = 'Este link no tiene permiso. Pide el link de nuevo a Fabián.'; pintar(); } },
  });
}
// Cuenta lo que está guardado en este celular y todavía no sube a la nube.
function contarPendientes() {
  let n = 0;
  Object.keys(estado.tomas).forEach((id) => { if (estado.tomas[id]._pend) n++; });
  estado.mediciones.forEach((m) => { if (m._pend) n++; });
  estado.compras.forEach((c) => { if (c._pend) n++; });
  estado.pendientes = n;
  if (!n) estado.pendDesde = 0;
  else if (!estado.pendDesde) { estado.pendDesde = Date.now(); setTimeout(pintar, 4200); }
}
function revisarDia() { if (darDeBaja && claveFecha(new Date()) !== diaSuscrito) suscribir(); }

// ---------- Arranque ----------
function arrancar() {
  if (!EMULADOR && !firebaseConfig.apiKey) { estado.fase = 'configurar'; pintar(); return; }
  let codigo = params.get('f') || '';
  if (!CODIGO_OK.test(codigo)) {
    const guardado = leerLocal('cj_familia');
    if (guardado && CODIGO_OK.test(guardado)) { location.replace(`${location.pathname}?f=${guardado}${sufijoEmu}${location.hash}`); return; }
    estado.fase = 'bienvenida'; pintar(); return;
  }
  guardarLocal('cj_familia', codigo);
  estado.familia = codigo;
  estado.quien = PERSONAS.indexOf(leerLocal('cj_quien')) >= 0 ? leerLocal('cj_quien') : '';
  estado.fase = 'app';
  estado.ui.irAhora = true;
  if (window.navigator.standalone && location.hash && location.hash !== '#hoy') history.replaceState(null, '', location.pathname + location.search + '#hoy');
  pintar();

  db.alFallarEscritura((e) => { if (e && e.code === 'permission-denied') aviso('No se pudo guardar: este link no tiene permiso.'); });
  try {
    db.iniciar(EMULADOR ? { apiKey: 'demo', authDomain: 'demo-cuaderno.firebaseapp.com', projectId: 'demo-cuaderno', appId: 'demo' } : firebaseConfig, EMULADOR);
  } catch (e) { estado.fase = 'error'; estado.error = 'La configuración de Firebase no es válida. Revisa js/config.js.'; pintar(); return; }
  db.fijarFamilia(codigo);
  setTimeout(() => { if (!estado.config) { estado.lento = true; pintar(); } }, 8000);
  db.entrar().then(suscribir).catch(() => {
    estado.fase = 'error'; estado.error = 'No hay conexión. La primera vez se necesita internet. Revisa la señal e inténtalo de nuevo.'; pintar();
  });
  setInterval(() => { estado.ahora = new Date(); revisarDia(); asegurarPlanHoy(); pintar(); }, 30000);
}
arrancar();

if ('serviceWorker' in navigator && !EMULADOR && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}
