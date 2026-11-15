// El cuaderno de Juan — arranque, navegación y armazón de la app.
import { firebaseConfig } from './config.js';
import * as db from './db.js';
import { estado, acciones, fijarPintar, pintar, ir, aviso, ejecutarDeshacer, guardarLocal, leerLocal, aplicarTema, sena, APARATO, esJuan } from './nucleo.js';
import { esc, ico, igualar, porId, val, claveFecha, sumarDias, lunesDe, idAzar } from './util.js';
import { PERSONAS, nombrePerfil, completarConfig, configInicial } from './datos.js';
import * as hoy from './vistas/hoy.js';
import * as portada from './vistas/portada.js';
import * as corazon from './vistas/corazon.js';
import * as medir from './vistas/medir.js';
import * as comidas from './vistas/comidas.js';
import * as agenda from './vistas/agenda.js';
import * as emergencia from './vistas/emergencia.js';
import * as ajustes from './vistas/ajustes.js';
import * as resumen from './vistas/resumen.js';
import * as recuperacion from './vistas/recuperacion.js';
import { resumenRemedios, asegurarPlanHoy } from './plan.js';

const params = new URLSearchParams(location.search);
const EMULADOR = params.get('emu') === '1' && /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const CODIGO_OK = /^[A-Za-z0-9]{24,64}$/;
const sufijoEmu = EMULADOR ? '&emu=1' : '';
if (EMULADOR) window.__estado = estado;   // solo para las pruebas locales

const VISTAS = {
  // Juan ve su propia portada en Hoy: los mismos datos de la familia, ordenados para consultar.
  hoy: { render: (args) => (esJuan() ? portada.render(args) : hoy.render(args)), titulo: () => 'Hoy', pestana: 'hoy' },
  corazon: { render: corazon.render, titulo: corazon.titulo, pestana: 'hoy' },
  medir: { render: medir.render, titulo: medir.titulo, pestana: 'medir' },
  comidas: { render: comidas.render, titulo: comidas.titulo, pestana: 'comidas' },
  agenda: { render: agenda.render, titulo: agenda.titulo, pestana: 'agenda' },
  ajustes: { render: ajustes.render, titulo: ajustes.titulo, pestana: 'ajustes' },
  emergencia: { render: emergencia.render, titulo: () => 'Emergencia', pestana: '' },
  resumen: { render: resumen.render, titulo: resumen.titulo, pestana: 'resumen' },
  recuperacion: { render: recuperacion.render, titulo: recuperacion.titulo, pestana: 'hoy' },
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
  ${PERSONAS.map((p) => `<button class="btn sec gigante" data-a="elegirQuien" data-v="${p}">${ico('user')}${esc(nombrePerfil(p))}</button>`).join('')}
  <p class="nota">Elegir un nombre ajusta la pantalla y firma lo anotado. No es una contraseña.</p>
  <p class="nota">Seña de este cuaderno: <b class="sena">${sena(estado.familia)}</b>. A toda la familia le tiene que salir la misma.</p>`);
const pantallaBienvenida = () => marco(`<p class="marca">El cuaderno de Juan</p><h1>Falta el link de la familia</h1>
  <p class="sub grande">Abre el link que te mandaron por WhatsApp. Si lo tienes copiado, pégalo aquí.</p>
  <input class="texto" id="link-entrada" placeholder="Pega aquí el link" autocomplete="off" aria-label="Link de la familia">
  ${estado.ui.errorLink ? `<p class="error" role="alert">${ico('alert')}${esc(estado.ui.errorLink)}</p>` : ''}
  <button class="btn pri" data-a="entrarConLink">${ico('check')}Entrar</button>
  <div class="panel"><p class="h3">¿La familia todavía no tiene cuaderno?</p>
  ${estado.ui.crear
    ? `<p class="nota aviso-ej">${ico('alert')}Esto crea un cuaderno nuevo y vacío. No muestra lo que la familia ya anotó. Si ya existe un cuaderno, vuelve atrás y abre el link que te mandaron.</p>
       <button class="btn sec" data-a="crearCuaderno">${ico('plus')}Sí, crear un cuaderno nuevo y vacío</button>
       <button class="btn quieto" data-a="cancelarCrear">${ico('left')}Volver</button>`
    : `<p class="sub">Solo Fabián, y solo la primera vez. Si la familia ya usa la app, no hace falta: se entra con el link.</p>
       <button class="btn quieto" data-a="pedirCrear">${ico('plus')}Crear el cuaderno de la familia</button>`}</div>`);

// ---------- Armazón ----------
function armazon(r) {
  if (r.nombre === 'ambulancia') return emergencia.renderAmbulancia();
  const v = VISTAS[r.nombre] || VISTAS.hoy;
  const esEmergencia = r.nombre === 'emergencia';
  const res = r.nombre === 'hoy' ? resumenRemedios(claveFecha(estado.ahora)) : null;
  const subiendo = estado.hayPend && estado.pendDesde && Date.now() - estado.pendDesde > 4000;
  const n = estado.pendientes;
  const franja = navigator.onLine === false
    ? `<p class="sin-senal no-imprimir">${ico('info')}Sin señal. Lo que anotes se guarda en este ${APARATO} y se sube cuando vuelva.</p>`
    : estado.errorSinc
      ? `<div class="sin-senal no-imprimir con-boton"><p>${ico('alert')}<span>No se pudo leer el cuaderno desde la nube. Lo que ves puede estar atrasado.</span></p><button class="btn quieto auto" data-a="reintentarSinc">${ico('undo')}Reintentar</button></div>`
      : subiendo
        ? `<p class="sin-senal no-imprimir">${ico('clock')}${n === 1 ? `Hay 1 registro guardado en este ${APARATO} que todavía no sube.` : n > 1 ? `Hay ${n} registros guardados en este ${APARATO} que todavía no suben.` : `Hay cambios guardados en este ${APARATO} que todavía no suben.`}</p>`
        : '';
  const bajoTitulo = res && res.total ? `<p class="bajo-titulo">${res.faltan === 0 ? 'Remedios listos' : res.faltan === 1 ? 'Falta 1 remedio' : `Faltan ${res.faltan} remedios`}</p>` : '';
  return `<header class="tope${esEmergencia ? ' rojo' : ''}"><div class="titulos"><h1>${esc(esJuan() && r.nombre === 'hoy' ? 'Mi día' : v.titulo(r.args))}</h1>${bajoTitulo}</div>
      ${esEmergencia ? '' : `<a class="sos" href="#emergencia">${ico('phone')}Emergencia</a>`}</header>
    ${franja}
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

  // Hoy comienza por el resumen. La familia ve primero el estado y las últimas mediciones.
  if (estado.config && estado.quien && estado.ui.irAhora && ruta().nombre === 'hoy') {
    estado.ui.irAhora = false;
    window.scrollTo(0, 0);
  }
}
fijarPintar(pintarTodo);
aplicarTema();

// ---------- Acciones generales ----------
acciones.recargar = () => location.reload();
acciones.elegirQuien = (d) => {
  estado.quien = d.v; guardarLocal('cj_quien', d.v);
  if (d.volver) { aviso(`Este celular ahora es de ${nombrePerfil(d.v)}`); ir(d.volver); } else { estado.ui.irAhora = true; pintar(); }
};
acciones.pedirCrear = () => { estado.ui.crear = true; pintar(); };
acciones.cancelarCrear = () => { estado.ui.crear = false; pintar(); };
acciones.reintentarSinc = () => { estado.errorSinc = ''; suscribir(); pintar(); };
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
document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-i]'); if (!el) return;
  const f = acciones[el.getAttribute('data-i')]; if (f) f(el.dataset, el, e);
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const t = e.target;
  if (e.key === 'Enter' && t.getAttribute && t.getAttribute('data-enter')) { e.preventDefault(); const f = acciones[t.getAttribute('data-enter')]; if (f) f(t.dataset, t, e); return; }
  if (t.getAttribute && t.getAttribute('role') === 'button') { e.preventDefault(); t.click(); }
});
porId('aviso-deshacer').addEventListener('click', ejecutarDeshacer);
window.addEventListener('hashchange', () => { estado.ui = { irAhora: true, borradoresComida: estado.ui.borradoresComida }; if (ruta().nombre === 'resumen') resumen.alEntrar(); window.scrollTo(0, 0); pintar(); });
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
  estado.errorSinc = '';
  darDeBaja = db.escuchar(claveFecha(sumarDias(ahora, -8)), claveFecha(lunesDe(ahora)), {
    sinc: (nombre, pend, cache) => { estado.sinc[nombre] = { pend, cache }; },
    config: (datos, deCache) => {
      if (datos) { estado.config = completarConfig(datos); asegurarPlanHoy(); }
      else if (!deCache) db.guardarConfig(configInicial());   // primer uso: crear el cuaderno con los valores iniciales
      contarPendientes(); pintar();
    },
    planes: (lista) => { estado.planes = {}; lista.forEach((p) => { estado.planes[p.fecha] = p; }); estado.planesListos = true; asegurarPlanHoy(); pintar(); },
    tomas: (lista) => { estado.tomas = {}; lista.forEach((t) => { estado.tomas[t.id] = t; }); contarPendientes(); pintar(); },
    mediciones: (lista) => { estado.mediciones = lista.sort((a, b) => b.ts - a.ts); contarPendientes(); pintar(); },
    turnos: (lista) => { estado.turnos = {}; lista.forEach((t) => { estado.turnos[t.fecha] = t.quien; }); contarPendientes(); pintar(); },
    compras: (lista) => { estado.compras = lista; contarPendientes(); pintar(); },
    citas: (lista) => { estado.citas = lista; contarPendientes(); pintar(); },
    error: (e) => {
      if (e && e.code === 'permission-denied') { estado.fase = 'error'; estado.error = 'Este link no tiene permiso. Pide el link de nuevo a Fabián.'; }
      else estado.errorSinc = (e && e.code) || 'error';   // se cortó la lectura en vivo: se avisa y se puede reintentar
      pintar();
    },
  });
}
// Cuenta lo que está guardado en este aparato y todavía no sube a la nube.
// `pendientes` son registros a la vista; `hayPend` incluye además borrados y cambios de ajustes, turnos y fechas.
// La copia automática del plan del día no cuenta: no es algo que haya anotado una persona.
const ESCUCHAS = ['config', 'tomas', 'mediciones', 'turnos', 'compras', 'citas'];
function contarPendientes() {
  let n = 0;
  Object.keys(estado.tomas).forEach((id) => { if (estado.tomas[id]._pend) n++; });
  estado.mediciones.forEach((m) => { if (m._pend) n++; });
  estado.compras.forEach((c) => { if (c._pend) n++; });
  estado.citas.forEach((c) => { if (c._pend) n++; });
  estado.pendientes = n;
  estado.hayPend = n > 0 || ESCUCHAS.some((k) => estado.sinc[k] && estado.sinc[k].pend);
  if (!estado.hayPend) estado.pendDesde = 0;
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

  // Si la nube rechaza un cambio, Firestore lo deshace en pantalla: hay que decirlo siempre, no solo cuando falta permiso.
  db.alFallarEscritura((e) => aviso(e && e.code === 'permission-denied' ? 'No se pudo guardar: este link no tiene permiso.' : 'No se pudo guardar en la nube. Revisa si quedó anotado y vuelve a intentarlo.'));
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
