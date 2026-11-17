// ¿POR QUÉ MARCÓ ESTO?: el azúcar con su curva, la causa probable (máx. 2) y un solo botón para medir otra vez.
// Educativo: la causa se muestra como "probable", nunca como diagnóstico. Los límites salen de config.rangos.
import { estado, acciones, pintar, ir, esJuan } from '../nucleo.js';
import * as db from '../db.js';
import { esc, ico, hhmm, mayus, claveFecha } from '../util.js';
import { clasificar, azucarBaja, mensaje, detalleMomento } from '../datos.js';
import { comidaId } from '../plan.js';
import { catalogoListo, alimentoPorId, cgDe } from '../glucemica.js';
import { FACTOR, nombreCorto, emojiDe } from './comidas.js';

const SALTO = 50;               // cambio que se nota entre dos mediciones de menos de 1 hora
const VENTANA = 240;            // minutos desde el inicio de la comida que entran en la curva
const DOS_HORAS = [106, 134];   // la franja "2 horas", en minutos desde que empezó a comer
const HORA_OK = /^\d\d:\d\d$/;
const ART = { desayuno: 'el desayuno', almuerzo: 'el almuerzo', once: 'la once', cena: 'la cena' };
const ESCALA = { verde: ['ok', 'Bien'], amarillo: ['amb', 'Atento'], rojo: ['rojo', 'Al tiro'] };
const num = (x) => (x === null || x === undefined || x === '' || isNaN(Number(x)) ? null : Number(x));
const aMin = (h) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
const minDia = (ts) => { const d = new Date(ts); return d.getHours() * 60 + d.getMinutes(); };
const hm = (n) => String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
const f1 = (n) => n.toFixed(1);
const rz = () => (estado.config.rangos && estado.config.rangos.azucar) || {};
// Rojo solo para el azúcar bajo el mínimo; lo demás fuera de rango es ámbar.
const color = (x) => (azucarBaja(x, estado.config.rangos) ? 'rojo' : clasificar(x, estado.config.rangos) === 'verde' ? 'verde' : 'amarillo');
const azucares = (fecha) => estado.mediciones.filter((x) => x.tipo === 'azucar' && x.fecha === fecha).sort((a, b) => a.ts - b.ts);

// La medición de azúcar anterior, si fue hace menos de 1 hora.
function previa(m) {
  let p = null;
  estado.mediciones.forEach((x) => { if (x.tipo === 'azucar' && x.id !== m.id && x.ts < m.ts && m.ts - x.ts <= 3600000 && (!p || x.ts > p.ts)) p = x; });
  return p;
}

// ¿Abrir la explicación al guardar? Sobre el límite de después de comer, bajo el mínimo, o un cambio fuerte en menos de 1 hora.
export function pideExplicar(m) {
  const r = rz(), v = Number(m.valor), p = previa(m);
  return (num(r.despMax) !== null && v >= num(r.despMax)) || (num(r.rojoBajo) !== null && v < num(r.rojoBajo)) || (!!p && Math.abs(v - Number(p.valor)) >= SALTO);
}

// Si hay una "medición otra vez" pendiente cerca de esta hora, la lectura la cumple.
export function cumpleRepetir(fecha, ts) {
  return Object.keys(estado.tomas).some((id) => { const t = estado.tomas[id]; return t.clase === 'repetir' && t.fecha === fecha && HORA_OK.test(t.hora || '') && Math.abs(aMin(t.hora) - minDia(ts)) <= 45; });
}

// Hora en que empezó a comer: la confirmada en Medir (esta lectura u otra cercana). Si no hay, la del almuerzo del plan (aproximada).
function inicioDe(m) {
  if (m.momento !== 'despues') return null;
  const yo = minDia(m.ts);
  const con = [m].concat(azucares(m.fecha)).find((x) => x.momento === 'despues' && Math.abs(x.ts - m.ts) <= VENTANA * 60000 && HORA_OK.test(x.inicioComida || '') && aMin(x.inicioComida) <= yo);
  if (con) return { min: aMin(con.inicioComida), real: true };
  const alm = (estado.config.horasComida || {}).almuerzo;
  if ((m.tarea === 'glu-almuerzo' || m.tarea === 'glu-otra') && HORA_OK.test(alm || '') && aMin(alm) < yo && yo - aMin(alm) <= VENTANA) return { min: aMin(alm), real: false };
  return null;
}

// Las lecturas que entran en la curva.
function ventana(m, ini) {
  return azucares(m.fecha).filter((x) => {
    if (x.id === m.id) return true;
    if (x.momento === 'ayunas') return false;
    const t = minDia(x.ts);
    return ini ? t >= ini.min && t - ini.min <= VENTANA : Math.abs(x.ts - m.ts) <= 90 * 60000;
  });
}

// El registro de Comidas al que corresponde la lectura (el almuerzo, o la última comida de las 4 horas previas).
function comidaDe(m) {
  if (m.momento !== 'despues') return null;
  const alm = estado.tomas[comidaId(m.fecha, 'almuerzo')];
  if ((m.tarea === 'glu-almuerzo' || m.tarea === 'glu-otra') && alm && alm.clase === 'comida' && Math.abs(alm.ts - m.ts) <= 5 * 3600000) return alm;
  let r = null;
  Object.keys(estado.tomas).forEach((id) => {
    const t = estado.tomas[id];
    if (t.clase === 'comida' && t.fecha === m.fecha && t.ts <= m.ts && m.ts - t.ts <= VENTANA * 60000 && (!r || t.ts > r.ts)) r = t;
  });
  return r;
}

// Lo que comió según los alimentos y porciones guardados en Comidas (fase 1): el que más sube y las porciones dobles.
function platoDe(reg) {
  if (!reg || !catalogoListo() || reg.comio === 'nada' || !Array.isArray(reg.items) || !reg.items.length) return null;
  const fac = FACTOR[reg.comio] === undefined ? 1 : FACTOR[reg.comio];
  const its = reg.items.map((it) => {
    const a = alimentoPorId(it.id); if (!a) return null;
    const g = typeof it.g === 'number' ? it.g : a.p[it.pi || 0][1] * (it.m || 1);
    return { it, a, cg: cgDe(a, g) * fac };
  }).filter(Boolean);
  if (!its.length) return null;
  const top = its.reduce((b, x) => (x.cg > b.cg ? x : b));
  return { reg, top, total: typeof reg.cg === 'number' ? reg.cg : its.reduce((s, x) => s + x.cg, 0), grandes: its.filter((x) => x !== top && (x.it.m || 1) >= 2) };
}
const enComida = (reg) => ART[reg.comida] || 'la comida';

// Hasta 2 causas probables, ordenadas: medido antes de las 2 horas, el alimento que más sube, plato grande.
function causas(m, minC, plato) {
  const c = [];
  if (typeof minC === 'number' && minC >= 0 && minC < DOS_HORAS[0]) c.push(['⏱', 'Se midió antes de las 2 horas', minC < 60 ? 'El azúcar todavía venía subiendo' : 'El azúcar todavía venía bajando']);
  if (plato && plato.total > 10) {
    const t = plato.top, doble = (t.it.m || 1) >= 2;
    c.push([emojiDe(t.a), `${mayus(nombreCorto(t.a))} en ${enComida(plato.reg)}`, doble ? 'Porción doble: sube más el azúcar' : t.a.ig >= 70 ? 'Sube el azúcar rápido' : 'Es lo que más sube el azúcar del plato']);
  }
  if (plato && plato.grandes.length) c.push(['🍽', 'Plato grande', `Doble porción de ${nombreCorto(plato.grandes[0].a).toLowerCase()}`]);
  if (m.momento === 'despues' && !comidaDe(m)) c.push(['🍽', 'Falta anotar qué comió', 'Con eso se ve la causa probable']);
  return c.slice(0, 2);
}

// Un solo consejo para la próxima, según lo que más pesó en la subida.
function consejo(pico) {
  const reg = comidaDe(pico), plato = platoDe(reg), ini = inicioDe(pico);
  const minP = typeof pico.minComida === 'number' ? pico.minComida : ini && ini.real ? minDia(pico.ts) - ini.min : null;
  const temprano = typeof minP === 'number' && minP < DOS_HORAS[0];
  if (plato && plato.total > 10) {
    // La mitad de lo que comió, dicha con la medida de casa más cercana ("½ taza"); si no calza, "media porción".
    const t = plato.top, g = (typeof t.it.g === 'number' ? t.it.g : t.a.p[t.it.pi || 0][1] * (t.it.m || 1)) / 2;
    const cerca = t.a.p.reduce((b, x) => (Math.abs(x[1] - g) < Math.abs(b[1] - g) ? x : b));
    const med = Math.abs(cerca[1] - g) <= g * 0.35 ? cerca[0] : 'media porción';
    return [emojiDe(t.a), `${mayus(med)} de ${nombreCorto(t.a).toLowerCase()}`, temprano ? 'y medir justo a las 2 horas' : `en ${enComida(reg)}`];
  }
  if (temprano) return ['⏱', 'Medir justo a las 2 horas', 'contando desde que empieza a comer'];
  return null;
}

// Curva genérica después de comer, con la franja de las 2 horas y los puntos reales.
const Y = (v) => Math.max(10, Math.min(108, 106 - (v - 70) * 0.56));
// Curva suave por los puntos; con `plano`, la salida parte horizontal (antes de comer el azúcar está quieto).
function suave(p, plano) {
  let d = `M${f1(p[0][0])} ${f1(p[0][1])}`;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i - 1] || p[i], b = p[i], c = p[i + 1], e = p[i + 2] || c;
    const c1 = i === 0 && plano ? [b[0] + (c[0] - b[0]) * 0.45, b[1]] : [b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6];
    d += ` C${f1(c1[0])} ${f1(c1[1])} ${f1(c[0] - (e[0] - b[0]) / 6)} ${f1(c[1] - (e[1] - b[1]) / 6)} ${f1(c[0])} ${f1(c[1])}`;
  }
  return d;
}
function curva(m, ini, lista, juan) {
  if (!ini && lista.length < 2) return '';
  const lim = num(rz().despMax), t0 = ini ? ini.min : minDia(lista[0].ts) - 20;
  const rel = (x) => minDia(x.ts) - t0, ult = rel(lista[lista.length - 1]);
  const span = Math.max(ini ? 150 : 60, ult + 20), X = (r) => 20 + (r / span) * 282;
  const pts = lista.map((x) => [X(rel(x)), Y(Number(x.valor)), x]);
  let anclas = pts.map((p) => [p[0], p[1]]);
  if (ini) {
    const pre = [[20, 98]];
    if (rel(lista[0]) > 70) pre.push([X(55), Math.max(14, pts[0][1] - 10)]);
    anclas = pre.concat(anclas);
  }
  const fin = pts[pts.length - 1], cf = color(fin[2]);
  let falta = '';
  if (ini && ult < DOS_HORAS[1] && cf === 'amarillo') {
    const fx = X(Math.min(span - 4, DOS_HORAS[1] + 8)), fy = Y(Math.max(110, Number(fin[2].valor) - 65)), dx = fx - fin[0];
    falta = `<path class="pq-falta" d="M${f1(fin[0])} ${f1(fin[1])} C${f1(fin[0] + dx / 2)} ${f1(fin[1] + (fy - fin[1]) * 0.4)} ${f1(fx - dx / 3)} ${f1(fy)} ${f1(fx)} ${f1(fy)}"/>`;
  }
  const h = juan ? 116 : 132;
  let svg = `<svg class="pq-curva${juan ? ' pq-juan' : ''}" viewBox="0 0 320 ${h}" role="img" aria-label="Curva del azúcar${ini ? ' después de comer' : ''}">`;
  if (ini) svg += `<rect class="pq-franja" x="${f1(X(DOS_HORAS[0]))}" y="12" width="${f1(X(DOS_HORAS[1]) - X(DOS_HORAS[0]))}" height="94" rx="10"/><text class="pq-franja-t" x="${f1((X(DOS_HORAS[0]) + X(DOS_HORAS[1])) / 2)}" y="26" text-anchor="middle">2 horas</text>`;
  if (lim !== null && !juan) svg += `<line class="pq-lim" x1="14" y1="${f1(Y(lim))}" x2="306" y2="${f1(Y(lim))}"/><text x="14" y="${f1(Y(lim) - 6)}">${lim}</text>`;
  if (anclas.length > 1) svg += `<path class="pq-linea ${cf} pq-dibuja" d="${suave(anclas, !!ini)}"/>`;
  svg += falta;
  let antX = -99, antT = ini ? 70 : -99;
  pts.forEach((p) => {
    const x = p[2], c = color(x), este = x.id === m.id, lx = p[0] - antX < 34 ? p[0] + 20 : p[0];
    antX = p[0];
    svg += `<circle class="pq-punto ${c} pq-pop" cx="${f1(p[0])}" cy="${f1(p[1])}" r="${este ? 9 : 7}"/><text class="pq-n ${c}" x="${f1(lx)}" y="${f1(Math.max(12, p[1] - 14))}" text-anchor="middle">${esc(String(x.valor))}</text>`;
    if (!juan && p[0] - antT >= 40) { svg += `<text x="${f1(p[0])}" y="124" text-anchor="middle">${hhmm(new Date(x.ts))}</text>`; antT = p[0]; }
  });
  if (ini && !juan) svg += `<text x="14" y="124">🍽 ${hm(ini.min)}${ini.real ? '' : '?'}</text>`;
  return svg + '</svg>';
}

const fila = (cls, c) => `<div class="${cls}"><span class="em${c[3] ? ' ' + c[3] : ''}">${c[0]}</span><p>${esc(c[1])}${c[2] ? `<small>${esc(c[2])}</small>` : ''}</p></div>`;

// Botón "Medir otra vez": +30 min (+15 si está bajo). Al tocarlo queda como tarea en la rutina del día.
function botonOtraVez(m, c) {
  const rep = Object.keys(estado.tomas).map((id) => Object.assign({ id }, estado.tomas[id])).find((t) => t.clase === 'repetir' && t.base === m.id);
  if (rep) return `<div class="pq-listo" role="status"><span class="ok">${ico('check')}</span><p>Listo, quedó en la rutina a las ${esc(rep.hora)}<small>🧼 Antes de medir: lavar y secar el dedo</small></p></div>
    <button class="pq-deshacer" data-a="deshacerOtraVez" data-id="${esc(rep.id)}">Deshacer</button>`;
  const ahora = minDia(Date.now());
  let obj = minDia(m.ts) + (c === 'rojo' ? 15 : 30);
  if (obj < ahora + 5) obj = Math.ceil((ahora + 5) / 5) * 5;
  if (obj > 23 * 60 + 55) return '';
  return `<button class="btn pri" data-a="medirOtraVez" data-id="${esc(m.id)}" data-v="${hm(obj)}">${ico('clock')}Medir otra vez a las ${hm(obj)}</button>`;
}

export function porque(id) {
  const juan = esJuan(), m = estado.mediciones.find((x) => x.id === id && x.tipo === 'azucar');
  const volver = `<a class="btn quieto izq" href="${juan ? '#hoy' : '#medir/azucar'}">${ico('left')}${juan ? 'Volver' : 'Volver a Azúcar'}</a>`;
  if (!m) return `<div class="envoltura"><p class="vacio-txt">Esta medición se borró.</p>${volver}</div>`;
  const r = rz(), v = Number(m.valor), c = color(m), p = previa(m), lim = num(r.despMax);
  const ini = inicioDe(m), lista = ventana(m, ini);
  const minC = typeof m.minComida === 'number' ? m.minComida : ini && ini.real ? minDia(m.ts) - ini.min : null;
  const antes = lista.filter((x) => x.ts < m.ts), pico = antes.reduce((b, x) => (Number(x.valor) > Number(b.valor) ? x : b), m);
  const subio = !!p && v - Number(p.valor) >= SALTO;
  const bajo = c === 'verde' && (Number(pico.valor) - v >= SALTO || (!!p && Number(p.valor) - v >= SALTO));
  const baja = !!antes.length && Number(antes[antes.length - 1].valor) > v;
  const comer = m.tarea === 'glu-almuerzo' || (comidaDe(m) || {}).comida === 'almuerzo' ? 'almorzar' : 'comer';
  const alto = c === 'amarillo' && num(r.ayMin) !== null && v < num(r.ayMin) ? 'Un poco bajo' : 'Un poco alto';
  let frase;
  if (juan) frase = c === 'rojo' ? 'Azúcar baja' : c === 'verde' ? (baja ? 'Va bajando ✓' : 'Está bien ✓') : alto;
  else if (c === 'rojo') frase = 'Azúcar baja';
  else if (bajo) frase = 'Bajó. Está bien';
  else if (lim !== null && v >= lim) frase = m.momento === 'despues' ? `Subió después de ${comer}` : 'Está alto';
  else if (subio) frase = 'Subió rápido';
  else if (!!p && Number(p.valor) - v >= SALTO) frase = 'Va bajando';
  else frase = c === 'verde' ? 'Está bien' : alto;
  const esc_ = ESCALA[c];
  const valor = `<div class="pq-valor"><span class="pq-big ${c}">${esc(String(m.valor))}</span><p>${frase}<small>Medido a las ${hhmm(new Date(m.ts))}</small><span class="chip ${esc_[0]}">${esc_[1]}</span></p></div>`;
  const grafico = curva(m, ini, lista, juan);
  const aviso = c === 'rojo' ? `<p class="pq-aviso" role="alert">${esc(mensaje(m, estado.config.rangos)[1])}</p>` : '';
  // Igual que en el resultado de Medir: con azúcar baja o si se siente mal, el acceso al 131 queda a la vista.
  const serio = c === 'rojo' || m.animo === 'Mal';
  const al131 = serio ? `<div class="alerta131"><p>Si tiene dolor en el pecho, falta de aire o se desmaya, llamen al 131.</p><a class="btn rojo" href="tel:131">${ico('phone')}Llamar al 131</a></div>` : '';
  const det = detalleMomento(m), cab = det ? `<p class="pq-cab">${esc(mayus(det))}</p>` : '';

  if (juan) {
    const tip = c === 'rojo' ? null : m.momento === 'despues' ? ['🚶', 'Caminar un poco después de comer', 'si el equipo de salud lo autorizó'] : null;
    return `<div class="envoltura pq" data-k="pq-${esc(id)}">${volver}${cab}<div class="panel">${valor}${grafico}</div>${aviso}${al131}${tip ? fila('pq-consejo', tip) : ''}</div>`;
  }

  // Familia: la causa probable si hay que estar atentos; si ya bajó, un ✓ y un consejo para la próxima.
  const atento = c !== 'verde' || subio;
  const ultimaDelDia = azucares(m.fecha).filter((x) => x.ts > m.ts).length === 0;
  let porQue = '', despues = '';
  if (atento && c !== 'rojo') {
    const cs = causas(m, minC, platoDe(comidaDe(m)));
    if (cs.length) porQue = `<div class="pq-porque"><p class="rotulo">¿Por qué? · probable</p>${cs.map((x) => fila('pq-causa', x)).join('')}</div>`;
  } else if (bajo) {
    const cuando = m.momento !== 'despues' || typeof minC !== 'number' ? '' : minC < DOS_HORAS[0] ? ', antes de las 2 horas' : minC <= DOS_HORAS[1] ? ', a las 2 horas' : '';
    porQue = `<div class="pq-porque">${fila('pq-causa', ['✓', 'Bajó solo' + cuando, m.momento === 'despues' ? 'Así se ve una subida normal después de comer' : '', 'ok'])}</div>`;
    const tip = consejo(pico);
    if (tip) despues = `<p class="pq-etq">Para la próxima</p>${fila('pq-consejo', tip)}`;
  }
  const boton = atento && ultimaDelDia && m.fecha === claveFecha(new Date()) ? botonOtraVez(m, c) : '';
  return `<div class="envoltura pq" data-k="pq-${esc(id)}">${volver}${cab}
    <div class="panel">${valor}${grafico}${porQue}</div>
    ${aviso}${al131}${boton}${despues}
    <p class="nota">Causa probable según lo anotado; no es un diagnóstico. Valen primero las indicaciones del médico.</p>
    <button class="btn quieto" data-a="borrarMed" data-id="${esc(m.id)}">${ico('trash')}Borrar esta medición</button>
  </div>`;
}

acciones.verAzucar = (d) => ir('medir/azucar/porque/' + d.id);
acciones.medirOtraVez = (d) => {
  const m = estado.mediciones.find((x) => x.id === d.id);
  if (!m || !HORA_OK.test(d.v || '')) return;
  db.poner('tomas', `${m.fecha}_repetir_${d.v.replace(':', '')}`, { clase: 'repetir', fecha: m.fecha, hora: d.v, base: m.id, quien: estado.quien, ts: Date.now() });
  pintar();
};
acciones.deshacerOtraVez = (d) => { db.borrar('tomas', d.id); pintar(); };
