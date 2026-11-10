// Estado compartido de la app, acciones y el aviso "Deshacer".
import { porId } from './util.js';

export const estado = {
  familia: '',
  quien: '',
  config: null,          // null hasta que llega del servidor o del caché
  tomas: {},             // id → toma
  mediciones: [],        // últimos días, más nueva primero
  compras: [],
  turnos: {},            // 'AAAA-MM-DD' → nombre
  citas: [],
  ahora: new Date(),
  fase: 'cargando',      // cargando | configurar | bienvenida | quien | app | error
  error: '',
  ui: {},                // estado de pantalla (día elegido, filas abiertas, borradores)
};

export const acciones = {};   // nombre → función(dataset, elemento, evento)

let _pintar = () => {};
export const fijarPintar = (f) => { _pintar = f; };
export const pintar = () => _pintar();
export const ir = (ruta) => { if (location.hash === '#' + ruta) pintar(); else location.hash = '#' + ruta; };

export function guardarLocal(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* modo privado */ } }
export function leerLocal(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

// ---- Aviso con "Deshacer" durante 10 segundos (no hay ventanas de confirmación) ----
let reloj = null, alDeshacer = null;
export function aviso(texto, deshacer) {
  const caja = porId('aviso');
  clearInterval(reloj);
  alDeshacer = deshacer || null;
  porId('aviso-texto').textContent = texto;
  porId('aviso-deshacer').style.display = deshacer ? '' : 'none';
  caja.classList.add('on');
  const total = deshacer ? 10000 : 3000, inicio = Date.now();
  const barra = porId('aviso-barra');
  barra.style.width = '100%';
  reloj = setInterval(() => {
    const queda = total - (Date.now() - inicio);
    barra.style.width = Math.max(0, (queda / total) * 100) + '%';
    if (queda <= 0) cerrarAviso();
  }, 100);
}
export function cerrarAviso() { clearInterval(reloj); alDeshacer = null; porId('aviso').classList.remove('on'); }
export function ejecutarDeshacer() { const f = alDeshacer; cerrarAviso(); if (f) f(); }

// Solo Fabián ve las opciones de administración. Es para simplificar la app a los demás, no una barrera de seguridad.
export const ADMIN = 'Fabián';
export const esAdmin = () => estado.quien === ADMIN;

// ---- Apariencia: Automático (sigue al iPhone), Claro u Oscuro. Se recuerda en cada teléfono. ----
export const temaElegido = () => { const t = leerLocal('cj_tema'); return t === 'claro' || t === 'oscuro' ? t : 'auto'; };
export function aplicarTema() {
  const t = temaElegido(), raiz = document.documentElement;
  if (t === 'auto') raiz.removeAttribute('data-tema'); else raiz.setAttribute('data-tema', t);
  const fondo = getComputedStyle(raiz).getPropertyValue('--bg').trim();
  const metas = document.querySelectorAll('meta[name="theme-color"]');
  for (let i = 0; i < metas.length; i++) { metas[i].removeAttribute('media'); if (fondo) metas[i].setAttribute('content', fondo); }
}
