// Utilidades sin dependencias. Todo compatible con Safari 15.

export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const ico = (n, cls) => `<svg class="ico${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
export const porId = (id) => document.getElementById(id);
export const val = (id) => { const e = porId(id); return e ? e.value.trim() : ''; };

// ---- Fechas (siempre hora local del celular) ----
export const pad = (n) => String(n).padStart(2, '0');
export const claveFecha = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const deClave = (k) => { const p = k.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
export const sumarDias = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; };
export const lunesDe = (d) => sumarDias(d, -((d.getDay() + 6) % 7));
export const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const DIAS_C = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const DIAS_K = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];
export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const mayus = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const fechaLarga = (d) => `${mayus(DIAS[d.getDay()])} ${d.getDate()} de ${MESES[d.getMonth()]}`;
export const fechaCorta = (d) => `${DIAS_C[d.getDay()]} ${d.getDate()}`;
export const fechaMedia = (d) => `${mayus(DIAS[d.getDay()])} ${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`;
export function diaRelativo(clave, hoyClave) {
  if (clave === hoyClave) return 'Hoy';
  if (clave === claveFecha(sumarDias(deClave(hoyClave), -1))) return 'Ayer';
  if (clave === claveFecha(sumarDias(deClave(hoyClave), 1))) return 'Mañana';
  return fechaCorta(deClave(clave));
}
export const idAzar = (n) => {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const a = new Uint8Array(n); crypto.getRandomValues(a);
  let s = ''; for (let i = 0; i < n; i++) s += abc[a[i] % abc.length];
  return s;
};

// ---- Actualizar el DOM sin perder foco ni lo que se está escribiendo ----
function mismo(a, b) {
  if (a.nodeType !== b.nodeType || a.nodeName !== b.nodeName) return false;
  if (a.nodeType !== 1) return true;
  return (a.id || '') === (b.id || '') && (a.getAttribute('data-k') || '') === (b.getAttribute('data-k') || '');
}
function igualarNodo(viejo, nuevo) {
  if (viejo.nodeType !== 1) { if (viejo.nodeValue !== nuevo.nodeValue) viejo.nodeValue = nuevo.nodeValue; return; }
  const esDetails = viejo.nodeName === 'DETAILS';
  const va = viejo.attributes;
  for (let i = va.length - 1; i >= 0; i--) {
    const n = va[i].name;
    if (!nuevo.hasAttribute(n) && !(esDetails && n === 'open')) viejo.removeAttribute(n);
  }
  const na = nuevo.attributes;
  for (let i = 0; i < na.length; i++) {
    const n = na[i].name, v = na[i].value;
    if (viejo.getAttribute(n) !== v) {
      viejo.setAttribute(n, v);
      if (n === 'value' && viejo !== document.activeElement) viejo.value = v;
    }
  }
  if (viejo.nodeName === 'TEXTAREA') {
    if (viejo.defaultValue !== nuevo.defaultValue) {
      viejo.defaultValue = nuevo.defaultValue;
      if (viejo !== document.activeElement) viejo.value = nuevo.defaultValue;
    }
    return;
  }
  igualarHijos(viejo, nuevo);
}
function igualarHijos(viejo, nuevo) {
  let v = viejo.firstChild, n = nuevo.firstChild;
  while (n) {
    const sigN = n.nextSibling;
    if (v && mismo(v, n)) { igualarNodo(v, n); v = v.nextSibling; }
    else if (v) { const sigV = v.nextSibling; viejo.replaceChild(n, v); v = sigV; }
    else viejo.appendChild(n);
    n = sigN;
  }
  while (v) { const sig = v.nextSibling; viejo.removeChild(v); v = sig; }
}
export function igualar(raiz, html) {
  const t = document.createElement('template');
  t.innerHTML = html;
  igualarHijos(raiz, t.content);
}

// ---- Copiar y compartir ----
export async function copiar(texto) {
  try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(texto); return true; } } catch (e) { /* sigue al plan B */ }
  const ta = document.createElement('textarea');
  ta.value = texto; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, texto.length);
  let ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
  document.body.removeChild(ta); return ok;
}
export async function compartir(datos) {
  if (!navigator.share) return false;
  try { await navigator.share(datos); return true; } catch (e) { return e && e.name === 'AbortError'; }
}
