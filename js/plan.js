// El plan de cada día: qué remedios, comidas y mediciones estaban previstos.
// Hoy y los días que vienen salen de la configuración actual. Los días pasados salen de la copia
// que se guardó ese día, para que cambiar un horario o el menú no altere el historial.
import { estado } from './nucleo.js';
import * as db from './db.js';
import { claveFecha, deClave, hhmm, DIAS_K } from './util.js';
import { COMIDAS } from './datos.js';

export const tomaId = (fecha, remedioId, hora) => `${fecha}_${remedioId}_${hora.replace(':', '')}`;
export const comidaId = (fecha, k) => `${fecha}_comida_${k}`;
export const INFO_COMIDA = {};
COMIDAS.forEach(([k, nombre, icono]) => { INFO_COMIDA[k] = { nombre, icono }; });

export function planDesdeConfig(fecha) {
  const c = estado.config, dk = DIAS_K[deClave(fecha).getDay()];
  const menu = (c.menu || {})[dk] || {}, porciones = (c.porciones || {})[dk] || {};
  const meds = [];
  c.remedios.filter((r) => r.activo !== false).forEach((r) => (r.horarios || []).forEach((h) => {
    if (h) meds.push({ rid: r.id, nombre: r.nombre, dosis: r.dosis || '', paraQue: r.paraQue || '', hora: h });
  }));
  const comidas = COMIDAS.filter(([k]) => menu[k]).map(([k]) => ({ k, hora: c.horasComida[k] || '12:00', texto: menu[k], porciones: porciones[k] || '' }));
  return { fecha, meds, comidas, medir: (c.medirHoras || []).filter(Boolean) };
}

const firma = (p) => [
  (p.meds || []).map((m) => [m.rid, m.nombre, m.dosis, m.paraQue, m.hora].join('|')).join(';'),
  (p.comidas || []).map((c) => [c.k, c.hora, c.texto, c.porciones].join('|')).join(';'),
  (p.medir || []).join(','),
].join('#');

// Guarda (o actualiza) la copia del plan de hoy. Se llama cuando llegan la configuración y los planes.
let ultimaFirma = '';
export function asegurarPlanHoy() {
  if (!estado.config || !estado.planesListos) return;
  const hoy = claveFecha(new Date()), p = planDesdeConfig(hoy), f = hoy + firma(p), actual = estado.planes[hoy];
  if (f === ultimaFirma) return;
  ultimaFirma = f;
  if (actual && hoy + firma(actual) === f) return;
  db.ponerPlan(hoy, Object.assign({ ts: Date.now() }, p));
}

// `f` es la fuente de datos: el estado en vivo, o un rango traído para el resumen y los reportes.
export function planDe(fecha, f) {
  const src = f || estado;
  return fecha >= claveFecha(estado.ahora) ? planDesdeConfig(fecha) : (src.planes[fecha] || null);
}

// Todo lo de un día, ordenado por hora. Incluye lo anotado que ya no está en el plan (por un cambio de horario).
export function itemsDelDia(fecha, f) {
  const src = f || estado, plan = planDe(fecha, src), items = [], vistos = {};
  if (plan) {
    (plan.meds || []).forEach((m) => { const id = tomaId(fecha, m.rid, m.hora); vistos[id] = 1; items.push({ tipo: 'med', hora: m.hora, id, r: { id: m.rid, nombre: m.nombre, dosis: m.dosis, paraQue: m.paraQue } }); });
    (plan.comidas || []).forEach((c) => { const id = comidaId(fecha, c.k); vistos[id] = 1; items.push({ tipo: 'comida', hora: c.hora, id, k: c.k, nombre: INFO_COMIDA[c.k].nombre, icono: INFO_COMIDA[c.k].icono, texto: c.texto, porciones: c.porciones || '' }); });
    (plan.medir || []).forEach((h, i) => items.push({ tipo: 'medir', hora: h, i }));
  }
  Object.keys(src.tomas).forEach((id) => {
    const t = src.tomas[id];
    if (t.fecha !== fecha || vistos[id]) return;
    if (t.clase === 'comida') { const info = INFO_COMIDA[t.comida]; if (info) items.push({ tipo: 'comida', hora: hhmm(new Date(t.ts)), id, k: t.comida, nombre: info.nombre, icono: info.icono, texto: t.previsto || '', porciones: '' }); }
    else items.push({ tipo: 'med', hora: t.hora || hhmm(new Date(t.ts)), id, fueraDePlan: true, r: { id: t.remedioId, nombre: t.nombre, dosis: t.dosis || '', paraQue: '' } });
  });
  const peso = { med: 0, medir: 1, comida: 2 };
  return items.sort((a, b) => (a.hora < b.hora ? -1 : a.hora > b.hora ? 1 : peso[a.tipo] - peso[b.tipo]));
}

export function resumenRemedios(fecha, f) {
  const src = f || estado, meds = itemsDelDia(fecha, src).filter((i) => i.tipo === 'med');
  const dados = meds.filter((i) => src.tomas[i.id]).length;
  return { total: meds.length, dados, faltan: meds.length - dados };
}

// Mediciones de un día que caen más cerca de la hora de medir número `i`.
export function medicionesDeTurno(fecha, i, f) {
  const src = f || estado, plan = planDe(fecha, src), horas = (plan && plan.medir) || [];
  const min = (h) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
  return src.mediciones.filter((m) => {
    if (m.fecha !== fecha) return false;
    const t = min(hhmm(new Date(m.ts)));
    let mejor = 0;
    horas.forEach((h, j) => { if (Math.abs(min(h) - t) < Math.abs(min(horas[mejor]) - t)) mejor = j; });
    return mejor === i;
  });
}

// "Sin subir": el registro está guardado en este celular pero todavía no llega a la nube.
export const sinSubir = (doc) => !!(doc && doc._pend && (navigator.onLine === false || (estado.pendDesde && Date.now() - estado.pendDesde > 4000)));
