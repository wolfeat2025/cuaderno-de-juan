// HOY: el día de Juan como línea de tiempo (remedios, mediciones y comidas en orden).
import { estado, acciones, pintar, aviso, guardarLocal, leerLocal } from '../nucleo.js';
import * as db from '../db.js';
import { esc, ico, claveFecha, deClave, sumarDias, hhmm, fechaLarga, DIAS, DIAS_K, mayus } from '../util.js';
import { COMIDAS, TIPOS, ORDEN_TIPOS, ETIQUETA, clasificar, valorTexto } from '../datos.js';

export const tomaId = (fecha, remedioId, hora) => `${fecha}_${remedioId}_${hora.replace(':', '')}`;
const franja = (h) => (h < '12:00' ? 'Mañana' : h < '19:00' ? 'Tarde' : 'Noche');
const ICONO_FRANJA = { 'Mañana': 'sun', 'Tarde': 'sunset', 'Noche': 'moon' };

// Todo lo que pasa en un día, ordenado por hora.
export function itemsDelDia(fecha) {
  const c = estado.config, items = [];
  c.remedios.filter((r) => r.activo !== false).forEach((r) => (r.horarios || []).forEach((h) => {
    if (h) items.push({ tipo: 'med', hora: h, r, id: tomaId(fecha, r.id, h) });
  }));
  const menu = (c.menu || {})[DIAS_K[deClave(fecha).getDay()]] || {};
  COMIDAS.forEach(([k, nombre, icono]) => {
    if (menu[k]) items.push({ tipo: 'comida', hora: c.horasComida[k] || '12:00', nombre, icono, texto: menu[k] });
  });
  (c.medirHoras || []).forEach((h, i) => { if (h) items.push({ tipo: 'medir', hora: h, i }); });
  const peso = { med: 0, medir: 1, comida: 2 };
  return items.sort((a, b) => (a.hora < b.hora ? -1 : a.hora > b.hora ? 1 : peso[a.tipo] - peso[b.tipo]));
}

export function resumenRemedios(fecha) {
  const meds = itemsDelDia(fecha).filter((i) => i.tipo === 'med');
  const dados = meds.filter((i) => estado.tomas[i.id]).length;
  return { total: meds.length, dados, faltan: meds.length - dados };
}

// Mediciones de un día que caen más cerca de la hora de medir número `i`.
function medicionesDeTurno(fecha, i) {
  const horas = (estado.config.medirHoras || []).filter(Boolean);
  const min = (h) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
  return estado.mediciones.filter((m) => {
    if (m.fecha !== fecha) return false;
    const t = min(hhmm(new Date(m.ts)));
    let mejor = 0;
    horas.forEach((h, j) => { if (Math.abs(min(h) - t) < Math.abs(min(horas[mejor]) - t)) mejor = j; });
    return mejor === i;
  });
}

function filaMed(it, modo, ahoraHM, fecha, anotable) {
  const t = estado.tomas[it.id], r = it.r;
  const detalle = [r.dosis, r.paraQue].filter(Boolean).map(esc).join(' · ');
  if (t) {
    const abierta = estado.ui.tomaAbierta === it.id;
    return `<div class="fila med hecho" data-k="${it.id}">
      <div class="hora">${it.hora}</div><div class="riel"><span class="cap">${ico('check')}</span></div>
      <div class="cuerpo">
        <div class="toca-area" data-a="abrirToma" data-id="${it.id}" role="button" tabindex="0">
          <p class="tit">${esc(r.nombre)}</p>
          <p class="firma">Lo dio ${esc(t.quien)} a las ${hhmm(new Date(t.ts))}</p>
        </div>
        ${abierta ? `<button class="btn quieto" data-a="quitarToma" data-id="${it.id}">${ico('undo')}Quitar la marca</button>` : ''}
      </div></div>`;
  }
  const boton = (cls) => `<button class="btn ${cls}" data-a="tomar" data-id="${it.id}" data-rid="${esc(r.id)}" data-hora="${it.hora}" data-fecha="${fecha}">${ico('check')}Ya lo tomó</button>`;
  if (modo === 'pasado') {
    return `<div class="fila med" data-k="${it.id}"><div class="hora">${it.hora}</div><div class="riel"><span class="cap vacia">${ico('pill')}</span></div>
      <div class="cuerpo"><p class="tit">${esc(r.nombre)}</p>${detalle ? `<p class="sub">${detalle}</p>` : ''}<p class="firma falta">No quedó anotado</p>${anotable ? boton('sec') : ''}</div></div>`;
  }
  const toca = modo === 'hoy' && it.hora <= ahoraHM;
  return `<div class="fila med${toca ? ' toca' : ''}" data-k="${it.id}">
    <div class="hora">${it.hora}</div><div class="riel"><span class="cap">${ico('pill')}</span></div>
    <div class="cuerpo">
      ${toca ? `<span class="chip amb">${ico('clock')}Toca ahora</span>` : ''}
      <p class="tit">${esc(r.nombre)}</p>
      ${detalle ? `<p class="sub">${detalle}</p>` : ''}
      ${modo === 'hoy' ? boton(toca ? 'pri' : 'sec') : ''}
    </div></div>`;
}

function filaMedir(it, fecha, modo) {
  const ms = medicionesDeTurno(fecha, it.i);
  const tipos = ORDEN_TIPOS.filter((t) => ms.some((m) => m.tipo === t)).map((t) => TIPOS[t].nombre);
  const hecho = tipos.length > 0;
  const sub = hecho ? `Anotado: ${tipos.join(', ')}` : (modo === 'pasado' ? 'No quedó anotado' : 'Presión, pulso, azúcar y oxígeno');
  return `<div class="fila medir${hecho ? ' hecho' : ''}" data-k="medir${it.i}">
    <div class="hora">${it.hora}</div><div class="riel"><span class="cap">${ico(hecho ? 'check' : 'pulse')}</span></div>
    <div class="cuerpo"><p class="tit">Medir a Juan</p><p class="${hecho ? 'firma' : 'sub'}">${sub}</p>
      ${modo === 'hoy' ? `<a class="btn sec" href="#medir">${ico('plus')}Anotar</a>` : ''}</div></div>`;
}

const filaComida = (it) => `<div class="fila comida" data-k="c-${it.nombre}">
  <div class="hora">${it.hora}</div><div class="riel"><span class="cap gris">${ico(it.icono)}</span></div>
  <div class="cuerpo"><p class="tit">${it.nombre}</p><p class="sub">${esc(it.texto)}</p></div></div>`;

function tiraSemana(hoy, dia) {
  const inicio = sumarDias(deClave(hoy), -3);
  let h = '<div class="semana" role="group" aria-label="Días cercanos">';
  for (let i = 0; i < 7; i++) {
    const d = sumarDias(inicio, i), k = claveFecha(d);
    const cls = (k === hoy ? ' es-hoy' : '') + (k === dia ? ' sel' : '');
    h += `<button class="dia${cls}" data-a="verDia" data-dia="${k}" aria-label="${fechaLarga(d)}"><span class="l">${mayus(DIAS[d.getDay()]).slice(0, 3)}</span><span class="n">${d.getDate()}</span></button>`;
  }
  return h + '</div>';
}

function ultimas() {
  const celdas = ORDEN_TIPOS.map((t) => {
    const m = estado.mediciones.find((x) => x.tipo === t);
    if (!m) return `<a class="celda" href="#medir/${t}"><span class="k">${TIPOS[t].nombre}</span><span class="v vacio">—</span><span class="e">Sin datos</span></a>`;
    const c = clasificar(m, estado.config.rangos);
    return `<a class="celda" href="#medir/${t}"><span class="k">${TIPOS[t].nombre}</span><span class="v ${c}">${valorTexto(m)}</span><span class="e ${c}">${c === 'rojo' ? 'Fuera' : ETIQUETA[c]}</span></a>`;
  }).join('');
  return `<p class="rotulo">${ico('pulse')}Últimas mediciones</p><div class="ultimas">${celdas}</div>`;
}

export function render() {
  const hoy = claveFecha(estado.ahora);
  const primero = claveFecha(sumarDias(estado.ahora, -3)), ultimo = claveFecha(sumarDias(estado.ahora, 3)), ayer = claveFecha(sumarDias(estado.ahora, -1));
  let dia = estado.ui.dia || hoy;
  if (dia < primero || dia > ultimo) dia = hoy;
  const anotable = dia === hoy || dia === ayer;
  const modo = dia === hoy ? 'hoy' : dia < hoy ? 'pasado' : 'futuro';
  const ahoraHM = hhmm(estado.ahora);
  const items = itemsDelDia(dia);
  const res = resumenRemedios(dia);
  const acompana = estado.turnos[dia];

  let resumen;
  if (!estado.config.remedios.length) resumen = `<a class="resumen neutro" href="#ajustes/remedios">${ico('pill')}<span>Aún no hay remedios cargados. Toca aquí para agregarlos.</span></a>`;
  else if (modo === 'futuro') resumen = `<p class="resumen neutro">${ico('pill')}<span>${res.total} ${res.total === 1 ? 'remedio' : 'remedios'} este día</span></p>`;
  else if (res.faltan === 0) resumen = `<p class="resumen ok">${ico('ccheck')}<span>Todos los remedios listos</span></p>`;
  else if (modo === 'pasado') resumen = `<p class="resumen amb">${ico('alert')}<span>${res.faltan === 1 ? 'Quedó 1 remedio sin anotar' : `Quedaron ${res.faltan} remedios sin anotar`}</span></p>`;
  else {
    const tocan = items.filter((i) => i.tipo === 'med' && !estado.tomas[i.id] && i.hora <= ahoraHM).length;
    resumen = `<p class="resumen ${tocan ? 'amb' : 'neutro'}">${ico('pill')}<span>${res.faltan === 1 ? 'Falta 1 remedio hoy' : `Faltan ${res.faltan} remedios hoy`}</span></p>`;
  }

  let linea = '', franjaActual = '', pusoAhora = modo !== 'hoy';
  const marcaAhora = `<div class="fila marca-ahora" id="ahora"><div class="hora">${ahoraHM}</div><div class="riel"><span class="punto"></span></div><div class="cuerpo"><span>Ahora</span></div></div>`;
  items.forEach((it) => {
    const f = franja(it.hora);
    if (f !== franjaActual) {
      franjaActual = f;
      linea += `<div class="fila ancla"><div class="hora"></div><div class="riel"><span class="cap chica">${ico(ICONO_FRANJA[f])}</span></div><div class="cuerpo"><p class="rotulo">${f}</p></div></div>`;
    }
    if (!pusoAhora && it.hora > ahoraHM) { linea += marcaAhora; pusoAhora = true; }
    linea += it.tipo === 'med' ? filaMed(it, modo, ahoraHM, dia, anotable) : it.tipo === 'medir' ? filaMedir(it, dia, modo) : filaComida(it);
  });
  if (!pusoAhora) linea += marcaAhora;
  if (!items.length) linea = '<p class="vacio-txt">No hay nada anotado para este día.</p>';

  const instalar = modo === 'hoy' && !window.navigator.standalone && /iPhone|iPad|iPod/.test(navigator.userAgent) && !leerLocal('cj_instalada')
    ? `<div class="panel"><p class="tit">${ico('info')}Para tenerla siempre a mano</p><p class="sub">Toca el botón Compartir de Safari y elige "Agregar a inicio".</p><button class="btn quieto" data-a="ocultarInstalar">${ico('check')}Listo, ya la agregué</button></div>` : '';

  return `<div class="envoltura">
    <p class="fecha">${fechaLarga(deClave(dia))}</p>
    ${tiraSemana(hoy, dia)}
    ${modo !== 'hoy' ? `<div class="panel otro-dia"><p class="sub">${dia === ayer ? 'Estás viendo ayer. Si faltó anotar un remedio, se puede marcar aquí.' : modo === 'pasado' ? 'Estás viendo un día que ya pasó. Aquí no se puede anotar.' : 'Estás viendo un día que viene. Aquí no se puede anotar.'}</p><button class="btn pri" data-a="verDia" data-dia="${hoy}">${ico('left')}Volver a hoy</button></div>` : ''}
    <a class="acompana" href="#agenda">${ico('user')}<span>${modo === 'hoy' ? 'Acompaña hoy' : 'Acompaña'}: <b>${acompana ? esc(acompana) : 'sin asignar'}</b></span></a>
    ${resumen}
    <div class="linea">${linea}</div>
    ${modo === 'hoy' ? ultimas() : ''}
    ${instalar}
  </div>`;
}

acciones.tomar = (d) => {
  const r = estado.config.remedios.find((x) => x.id === d.rid);
  if (!r || estado.tomas[d.id]) return;
  const ahora = new Date();
  db.poner('tomas', d.id, { fecha: d.fecha || claveFecha(ahora), remedioId: r.id, hora: d.hora, nombre: r.nombre, dosis: r.dosis || '', quien: estado.quien, ts: ahora.getTime() });
  aviso(`Listo: ${r.nombre}`, () => db.borrar('tomas', d.id));
};
acciones.abrirToma = (d) => { estado.ui.tomaAbierta = estado.ui.tomaAbierta === d.id ? null : d.id; pintar(); };
acciones.quitarToma = (d) => {
  const t = estado.tomas[d.id]; if (!t) return;
  const copia = Object.assign({}, t); delete copia.id;
  db.borrar('tomas', d.id); estado.ui.tomaAbierta = null;
  aviso('Marca quitada', () => db.poner('tomas', d.id, copia));
};
acciones.verDia = (d) => { estado.ui.dia = d.dia; estado.ui.irAhora = true; pintar(); };
acciones.ocultarInstalar = () => { guardarLocal('cj_instalada', '1'); pintar(); };
