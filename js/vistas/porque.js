// ¿POR QUÉ MARCÓ ESTO?: el azúcar con su curva, la causa probable (máx. 2) y un solo botón para medir otra vez.
// Educativo: la causa se muestra como "probable", nunca como diagnóstico. Los límites salen de config.rangos.
import { estado, acciones, pintar, ir, esJuan } from '../nucleo.js';
import * as db from '../db.js';
import { esc, ico, hhmm, mayus, claveFecha } from '../util.js';
import { clasificar, azucarBaja, detalleMomento, duracion } from '../datos.js';
import { barraAzucar } from './medir.js';
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

// Hasta 2 causas probables: el alimento que más sube y plato grande. (Medir antes de las 2 horas ya lo dice "¿Qué significa?").
function causas(m, plato) {
  const c = [];
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
  // Lo que falta (punteado hasta las 2 horas): si sigue alta, o si se midió antes de las 2 horas.
  if (ini && cf !== 'rojo' && (ult < DOS_HORAS[0] || (ult < DOS_HORAS[1] && cf === 'amarillo'))) {
    const fx = X(Math.min(span - 4, DOS_HORAS[1] + 8)), fy = Y(Math.max(110, Number(fin[2].valor) - 65)), dx = fx - fin[0];
    falta = `<path class="pq-falta" d="M${f1(fin[0])} ${f1(fin[1])} C${f1(fin[0] + dx / 2)} ${f1(fin[1] + (fy - fin[1]) * 0.4)} ${f1(fx - dx / 3)} ${f1(fy)} ${f1(fx)} ${f1(fy)}"/>`;
  }
  const h = juan ? 116 : 132;
  let svg = `<svg class="pq-curva${juan ? ' pq-juan' : ''}" viewBox="0 0 320 ${h}" role="img" aria-label="Curva del azúcar${ini ? ' después de comer' : ''}">`;
  if (ini) svg += `<rect class="pq-franja" x="${f1(X(DOS_HORAS[0]))}" y="12" width="${f1(X(DOS_HORAS[1]) - X(DOS_HORAS[0]))}" height="94" rx="10"/><text class="pq-franja-t" x="${f1((X(DOS_HORAS[0]) + X(DOS_HORAS[1])) / 2)}" y="26" text-anchor="middle">2 horas</text><text class="pq-franja-t" x="${f1((X(DOS_HORAS[0]) + X(DOS_HORAS[1])) / 2)}" y="100" text-anchor="middle">${hm(ini.min + 120)}</text>`;
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

// Botón "Medir otra vez" a la hora `obj` (minutos del día). Al tocarlo queda como tarea en la rutina de hoy.
function botonOtraVez(m, obj, texto) {
  const rep = Object.keys(estado.tomas).map((id) => Object.assign({ id }, estado.tomas[id])).find((t) => t.clase === 'repetir' && t.base === m.id);
  if (rep) return `<div class="pq-listo" role="status"><span class="ok">${ico('check')}</span><p>Listo, quedó en la rutina a las ${esc(rep.hora)}<small>🧼 Antes de medir: lavar y secar el dedo</small></p></div>
    <button class="pq-deshacer" data-a="deshacerOtraVez" data-id="${esc(rep.id)}">Deshacer</button>`;
  const ahora = minDia(Date.now());
  if (obj < ahora + 5) obj = Math.ceil((ahora + 5) / 5) * 5;
  if (obj > 23 * 60 + 55) return '';
  return `<button class="btn pri" data-a="medirOtraVez" data-id="${esc(m.id)}" data-v="${hm(obj)}">${ico('clock')}${texto} ${hm(obj)}</button>`;
}

// La situación de ahora, en palabras de casa: qué significa el número y qué hacer (con la hora del botón, si hace falta).
// Las metas salen de config.rangos; lo de azúcar baja es lo mismo que dice el resultado de Medir.
function situacion(m, c, minC, ini, bajo, pico) {
  const comer = m.tarea === 'glu-almuerzo' || (comidaDe(m) || {}).comida === 'almuerzo' ? 'almorzar' : 'comer';
  const r = rz(), v = Number(m.valor), lim = num(r.despMax), ayMin = num(r.ayMin), ayMax = num(r.ayMax);
  const nada = ['🙂', 'Nada más por ahora', 'Seguir con la rutina de siempre'];
  const yo = minDia(m.ts), despues = m.momento === 'despues', alto = lim !== null && v >= lim;
  if (c === 'rojo') return { frase: 'Azúcar baja', sig: ['⚠️', `Bajo ${num(r.rojoBajo)}: hay que actuar ahora`, 'Puede dar temblor, sudor, mareo o confusión'], hacer: ['🧃', 'Medio vaso de jugo ahora', 'Medir otra vez en 15 minutos y avisar'], hora: yo + 15, boton: 'Medir otra vez a las' };
  if (despues && typeof minC === 'number' && minC < DOS_HORAS[0] && ini) {
    const h2 = ini.min + 120;
    return { frase: alto ? `Subió después de ${comer}` : 'Está bien',
      sig: alto ? ['📈', `Sobre ${lim}, pero todavía no son las 2 horas`, 'Después de comer sube y luego baja sola'] : ['📈', 'Va en la subida normal', `A los ${duracion(minC)} todavía no es la medición que cuenta`],
      hacer: ['⏱', 'Volver a medir a las 2 horas', `Es la que cuenta: a las ${hm(h2)}, desde que empezó a ${comer}`], hora: h2, boton: 'Medir a las' };
  }
  if (despues) {
    const enDos = typeof minC === 'number' && minC <= DOS_HORAS[1] + 15;
    if (bajo) { const tip = consejo(pico); return { frase: 'Bajó. Está bien', sig: ['✓', 'Así se ve una subida normal', 'Subió después de comer y bajó sola', 'ok'], hacer: tip || nada, etq: tip ? '¿Para la próxima?' : '' }; }
    if (alto) return { frase: enDos ? 'Sigue alta' : `Subió después de ${comer}`, sig: ['📈', enDos ? `Sobre ${lim} a las 2 horas` : `Sobre ${lim} después de comer`, 'Más alto que la meta'], hacer: ['⏱', 'Volver a medir en 30 minutos', 'Si sigue alta, comentarlo en el próximo control'], hora: yo + 30, boton: 'Medir otra vez a las' };
    if (c === 'verde') return { frase: 'Está bien', sig: ['✓', enDos ? 'En la meta de las 2 horas' : 'En la meta de después de comer', `Bajo ${lim}`, 'ok'], hacer: nada };
  }
  const cuando = m.momento === 'antes' ? 'antes de comer' : 'en ayunas';
  if (c === 'verde') return { frase: 'Está bien', sig: ['✓', `En la meta ${cuando === 'en ayunas' ? 'de ayunas' : cuando}`, `Entre ${ayMin} y ${ayMax}`, 'ok'], hacer: nada };
  const bajito = ayMin !== null && v < ayMin;
  return { frase: bajito ? 'Un poco bajo' : 'Un poco alto', sig: [bajito ? '📉' : '📈', bajito ? `Un poco bajo ${cuando}` : `Un poco alto ${cuando}`, `La meta ${cuando} es de ${ayMin} a ${ayMax}`],
    hacer: ['⏱', 'Medir otra vez más tarde', 'y comentarlo en el próximo control'] };
}

export function porque(id) {
  const juan = esJuan(), m = estado.mediciones.find((x) => x.id === id && x.tipo === 'azucar');
  const volver = `<a class="btn quieto izq" href="${juan ? '#hoy' : '#medir/azucar'}">${ico('left')}${juan ? 'Volver' : 'Volver a Azúcar'}</a>`;
  if (!m) return `<div class="envoltura"><p class="vacio-txt">Esta medición se borró.</p>${volver}</div>`;
  const v = Number(m.valor), c = color(m), p = previa(m);
  const ini = inicioDe(m), lista = ventana(m, ini);
  const minC = typeof m.minComida === 'number' ? m.minComida : ini && ini.real ? minDia(m.ts) - ini.min : null;
  const antes = lista.filter((x) => x.ts < m.ts), pico = antes.reduce((b, x) => (Number(x.valor) > Number(b.valor) ? x : b), m);
  const subio = !!p && v - Number(p.valor) >= SALTO;
  const bajo = c === 'verde' && (Number(pico.valor) - v >= SALTO || (!!p && Number(p.valor) - v >= SALTO));
  const baja = !!antes.length && Number(antes[antes.length - 1].valor) > v;
  const s = situacion(m, c, minC, ini, bajo, pico);
  const frase = juan ? (c === 'rojo' ? 'Azúcar baja' : c === 'verde' ? (baja ? 'Va bajando ✓' : 'Está bien ✓') : s.frase) : s.frase;
  const det = detalleMomento(m), esc_ = ESCALA[c];
  const valor = `<div class="pq-valor"><span class="pq-big ${c}">${esc(String(m.valor))}</span><p>${esc(frase)}<small>Medido a las ${hhmm(new Date(m.ts))}${det ? ' · ' + esc(det) : ''}</small><span class="chip ${esc_[0]}">${esc_[1]}</span></p></div>`;
  // Con comida: la curva. Sin comida (ayunas, antes de comer): la misma barra de "¿Qué está bien?" de Medir.
  const grafico = curva(m, ini, lista, juan) || `<div class="pq-barra">${barraAzucar(m)}</div>`;
  const serio = c === 'rojo' || m.animo === 'Mal';
  const al131 = serio ? `<div class="alerta131"><p>Si tiene dolor en el pecho, falta de aire o se desmaya, llamen al 131.</p><a class="btn rojo" href="tel:131">${ico('phone')}Llamar al 131</a></div>` : '';
  const hoy = m.fecha === claveFecha(new Date()) && azucares(m.fecha).filter((x) => x.ts > m.ts).length === 0;
  const boton = hoy && typeof s.hora === 'number' ? botonOtraVez(m, s.hora, s.boton) : '';

  if (juan) {
    const tip = c === 'rojo' ? ['🧃', 'Medio vaso de jugo ahora', 'y avisar a la familia'] : s.boton === 'Medir a las' ? ['⏱', `Medir a las ${hm(s.hora)}`, 'Esa es la medición que cuenta']
      : m.momento === 'despues' ? ['🚶', 'Caminar un poco después de comer', 'si el equipo de salud lo autorizó'] : null;
    return `<div class="envoltura pq" data-k="pq-${esc(id)}">${volver}<div class="panel">${valor}${grafico}</div>${al131}${tip ? fila('pq-consejo', tip) : ''}</div>`;
  }

  // Familia: ¿Qué significa? · ¿Por qué? (solo si subió) · ¿Qué hacer? — una fila cada uno y un solo botón.
  let porQue = '';
  if (m.momento === 'despues' && c !== 'rojo' && !bajo && (c !== 'verde' || subio)) {
    const cs = causas(m, platoDe(comidaDe(m)));
    if (cs.length) porQue = `<div class="pq-porque"><p class="rotulo">¿Por qué? · probable</p>${cs.map((x) => fila('pq-causa', x)).join('')}</div>`;
  }
  return `<div class="envoltura pq" data-k="pq-${esc(id)}">${volver}
    <div class="panel">${valor}${grafico}
      <div class="pq-porque"><p class="rotulo">¿Qué significa?</p>${fila('pq-causa', s.sig)}</div>
      ${porQue}
      <div class="pq-porque"><p class="rotulo">${s.etq || '¿Qué hacer?'}</p>${fila('pq-causa', s.hacer)}</div>
    </div>
    ${al131}${boton}
    ${explicaAltaBaja()}
    <p class="nota">Causa probable según lo anotado; no es un diagnóstico. Valen primero las indicaciones del médico.</p>
    <button class="btn quieto" data-a="borrarMed" data-id="${esc(m.id)}">${ico('trash')}Borrar esta medición</button>
  </div>`;
}

// Desplegable "¿Qué hacer si está alta o baja?" (en Medir · Azúcar, junto a "Cómo usar nuestra máquina").
// Información general (ADA y CDC); los límites salen de config.rangos.
export function explicaAltaBaja() {
  const r = rz(), lim = num(r.despMax), ayMax = num(r.ayMax), bajo = num(r.rojoBajo);
  const tarjeta = (cls, em, titulo, sub, filas) => `<div class="ab-tarjeta ${cls}"><p class="ab-tit"><span class="em">${em}</span><span>${titulo}<small>${sub}</small></span></p>
    <ul>${filas.map(([k, t]) => `<li><b>${k}</b>${t}</li>`).join('')}</ul></div>`;
  const altaSub = [lim !== null ? `${lim} o más a las 2 horas` : '', ayMax !== null ? `más de ${ayMax} en ayunas` : ''].filter(Boolean).join(' · ');
  return `<details class="plegable guia-maq ab"><summary>${ico('alert')}¿Qué hacer si está alta o baja?${ico('down', 'giro')}</summary>
    <div class="guia-cuerpo">
      <p class="sub">Después de comer el azúcar sube y baja sola en unas 2 horas. Por eso la medición que cuenta es la de las 2 horas, desde que empezó a comer.</p>
      ${tarjeta('alta', '📈', 'Alta', altaSub, [
        ['Señales: ', 'mucha sed, orinar seguido, cansancio. Muchas veces no se siente nada.'],
        ['Qué hacer: ', 'volver a medir en 30 minutos y anotar qué comió.'],
        ['Si se repite: ', 'comentarlo en el próximo control. Si se siente mal, llamar al médico.']])}
      ${tarjeta('baja', '📉', 'Baja', bajo !== null ? `menos de ${bajo}` : '', [
        ['Señales: ', 'temblor, sudor, mareo, confusión o mucha hambre.'],
        ['Qué hacer: ', 'medio vaso de jugo o bebida con azúcar. Medir otra vez en 15 minutos; si sigue baja, repetir y avisar.'],
        ['Si no puede tragar o se desmaya: ', 'nada por la boca y llamar al 131.']])}
      <p class="nota">Información general (ADA y CDC). Valen primero las indicaciones del médico.</p>
    </div></details>`;
}

acciones.verAzucar = (d) => ir('medir/azucar/porque/' + d.id);
acciones.medirOtraVez = (d) => {
  const m = estado.mediciones.find((x) => x.id === d.id);
  if (!m || !HORA_OK.test(d.v || '')) return;
  db.poner('tomas', `${m.fecha}_repetir_${d.v.replace(':', '')}`, { clase: 'repetir', fecha: m.fecha, hora: d.v, base: m.id, quien: estado.quien, ts: Date.now() });
  pintar();
};
acciones.deshacerOtraVez = (d) => { db.borrar('tomas', d.id); pintar(); };
