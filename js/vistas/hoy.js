// HOY: el día de Juan como línea de tiempo compacta (hora, tarea y botón).
import { estado, acciones, pintar, aviso, guardarLocal, leerLocal, esAdmin } from '../nucleo.js';
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

const fila = (cls, k, hora, tarjeta) => `<div class="fila ${cls}" data-k="${k}"><div class="hora">${hora}</div><div class="riel"><span class="nodo"></span></div>${tarjeta}</div>`;

function filaMed(it, modo, ahoraHM, fecha, anotable) {
  const t = estado.tomas[it.id], r = it.r;
  const detalle = [r.dosis, r.paraQue].filter(Boolean).map(esc).join(' · ');
  if (t) {
    const abierta = estado.ui.tomaAbierta === it.id;
    return fila('med hecho', it.id, it.hora, `<div class="tarjeta-fila toca-area" data-a="abrirToma" data-id="${it.id}" role="button" tabindex="0">
      <span class="ic hecho">${ico('check')}</span>
      <div class="txt"><p class="tit">${esc(r.nombre)}</p><p class="firma">Lo dio ${esc(t.quien)} a las ${hhmm(new Date(t.ts))}</p></div>
      ${abierta ? `<button class="btn quieto" data-a="quitarToma" data-id="${it.id}">${ico('undo')}Quitar la marca</button>` : ''}</div>`);
  }
  const boton = (cls) => `<button class="btn ${cls}" data-a="tomar" data-id="${it.id}" data-rid="${esc(r.id)}" data-hora="${it.hora}" data-fecha="${fecha}">${ico('check')}Ya lo tomó</button>`;
  if (modo === 'pasado') {
    return fila('med', it.id, it.hora, `<div class="tarjeta-fila"><span class="ic vacio">${ico('pill')}</span>
      <div class="txt"><p class="tit">${esc(r.nombre)}</p>${detalle ? `<p class="sub">${detalle}</p>` : ''}<p class="firma falta">No quedó anotado</p></div>${anotable ? boton('sec') : ''}</div>`);
  }
  const toca = modo === 'hoy' && it.hora <= ahoraHM;
  return fila('med' + (toca ? ' toca' : ''), it.id, it.hora, `<div class="tarjeta-fila"><span class="ic">${ico('pill')}</span>
    <div class="txt">${toca ? `<span class="chip amb">${ico('clock')}Toca ahora</span>` : ''}<p class="tit">${esc(r.nombre)}</p>${detalle ? `<p class="sub">${detalle}</p>` : ''}</div>
    ${modo === 'hoy' ? boton(toca ? 'pri' : 'sec') : ''}</div>`);
}

function filaMedir(it, fecha, modo) {
  const ms = medicionesDeTurno(fecha, it.i);
  const tipos = ORDEN_TIPOS.filter((t) => ms.some((m) => m.tipo === t)).map((t) => TIPOS[t].nombre);
  const hecho = tipos.length > 0;
  const sub = hecho ? `Anotado: ${tipos.join(', ')}` : (modo === 'pasado' ? 'No quedó anotado' : 'Presión, pulso, azúcar y oxígeno');
  return fila('medir' + (hecho ? ' hecho' : ''), 'medir' + it.i, it.hora, `<div class="tarjeta-fila"><span class="ic ${hecho ? 'hecho' : 'medir'}">${ico(hecho ? 'check' : 'pulse')}</span>
    <div class="txt"><p class="tit">Medir a Juan</p><p class="${hecho ? 'firma' : 'sub'}">${sub}</p></div>
    ${modo === 'hoy' ? `<a class="btn sec" href="#medir">${ico('plus')}Anotar</a>` : ''}</div>`);
}

const filaComida = (it) => fila('comida', 'c-' + it.nombre, it.hora, `<a class="tarjeta-fila plana" href="#comidas"><span class="ic comida">${ico(it.icono)}</span>
  <div class="txt"><p class="tit">${it.nombre}</p><p class="sub">${esc(it.texto)}</p></div>${ico('right', 'flecha')}</a>`);

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

function anillo(dados, total) {
  const c = 2 * Math.PI * 24, parte = total ? dados / total : 0;
  return `<svg class="anillo" viewBox="0 0 60 60" role="img" aria-label="${dados} de ${total} remedios dados"><circle class="pista" cx="30" cy="30" r="24"/>
    <circle class="avance" cx="30" cy="30" r="24" stroke-dasharray="${(c * parte).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 30 30)"/>
    <text x="30" y="36" text-anchor="middle">${dados}/${total}</text></svg>`;
}

function tarjetaResumen(dia, modo, items, ahoraHM) {
  const res = resumenRemedios(dia);
  if (!estado.config.remedios.length) {
    return esAdmin()
      ? `<a class="resumen-dia" href="#ajustes/remedios"><span class="ic">${ico('pill')}</span><div class="txt"><p class="tit">Aún no hay remedios cargados</p><p class="sub">Toca aquí para agregarlos.</p></div>${ico('right', 'flecha')}</a>`
      : `<div class="resumen-dia"><span class="ic">${ico('pill')}</span><div class="txt"><p class="tit">Aún no hay remedios cargados</p><p class="sub">Fabián los agrega desde su celular.</p></div></div>`;
  }
  let cls = '', tit, sub = `${res.dados} de ${res.total} ${res.total === 1 ? 'dado' : 'dados'}`;
  if (modo === 'futuro') { tit = `${res.total} ${res.total === 1 ? 'remedio' : 'remedios'} este día`; sub = 'Todavía no corresponde anotar.'; }
  else if (res.faltan === 0) { cls = ' ok'; tit = 'Todos los remedios listos'; }
  else if (modo === 'pasado') { cls = ' amb'; tit = res.faltan === 1 ? 'Quedó 1 remedio sin anotar' : `Quedaron ${res.faltan} remedios sin anotar`; }
  else {
    const tocan = items.filter((i) => i.tipo === 'med' && !estado.tomas[i.id] && i.hora <= ahoraHM).length;
    if (tocan) { cls = ' amb'; sub += tocan === 1 ? ' · 1 toca ahora' : ` · ${tocan} tocan ahora`; }
    tit = res.faltan === 1 ? 'Falta 1 remedio hoy' : `Faltan ${res.faltan} remedios hoy`;
  }
  return `<div class="resumen-dia${cls}">${anillo(res.dados, res.total)}<div class="txt"><p class="tit">${tit}</p><p class="sub">${sub}</p></div></div>`;
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

const saludo = () => { const h = estado.ahora.getHours(); return `${h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches'}, ${esc(estado.quien)}`; };

export function render() {
  const hoy = claveFecha(estado.ahora);
  const primero = claveFecha(sumarDias(estado.ahora, -3)), ultimo = claveFecha(sumarDias(estado.ahora, 3)), ayer = claveFecha(sumarDias(estado.ahora, -1));
  let dia = estado.ui.dia || hoy;
  if (dia < primero || dia > ultimo) dia = hoy;
  const anotable = dia === hoy || dia === ayer;
  const modo = dia === hoy ? 'hoy' : dia < hoy ? 'pasado' : 'futuro';
  const ahoraHM = hhmm(estado.ahora);
  const items = itemsDelDia(dia);
  const acompana = estado.turnos[dia];

  let linea = '', franjaActual = '', pusoAhora = modo !== 'hoy';
  const marcaAhora = `<div class="fila marca-ahora" id="ahora"><div class="hora">${ahoraHM}</div><div class="riel"><span class="punto"></span></div><p class="ahora-txt">Ahora</p></div>`;
  items.forEach((it) => {
    const f = franja(it.hora);
    if (f !== franjaActual) {
      franjaActual = f;
      linea += `<div class="fila ancla"><div class="hora"></div><div class="riel"></div><p class="rotulo">${ico(ICONO_FRANJA[f])}${f}</p></div>`;
    }
    if (!pusoAhora && it.hora > ahoraHM) { linea += marcaAhora; pusoAhora = true; }
    linea += it.tipo === 'med' ? filaMed(it, modo, ahoraHM, dia, anotable) : it.tipo === 'medir' ? filaMedir(it, dia, modo) : filaComida(it);
  });
  if (!pusoAhora) linea += marcaAhora;
  if (!items.length) linea = '<p class="vacio-txt">No hay nada anotado para este día.</p>';

  const instalar = modo === 'hoy' && !window.navigator.standalone && /iPhone|iPad|iPod/.test(navigator.userAgent) && !leerLocal('cj_instalada')
    ? `<div class="panel"><p class="tit">Para tenerla siempre a mano</p><p class="sub">Toca el botón Compartir de Safari y elige "Agregar a inicio".</p><button class="btn quieto" data-a="ocultarInstalar">${ico('check')}Listo, ya la agregué</button></div>` : '';

  return `<div class="envoltura hoy">
    <div class="hoy-cab"><p class="saludo">${saludo()}</p><p class="fecha">${fechaLarga(deClave(dia))}</p>${tiraSemana(hoy, dia)}</div>
    ${modo !== 'hoy' ? `<div class="panel otro-dia"><p class="sub">${dia === ayer ? 'Estás viendo ayer. Si faltó anotar un remedio, se puede marcar aquí.' : modo === 'pasado' ? 'Estás viendo un día que ya pasó. Aquí no se puede anotar.' : 'Estás viendo un día que viene. Aquí no se puede anotar.'}</p><button class="btn pri" data-a="verDia" data-dia="${hoy}">${ico('left')}Volver a hoy</button></div>` : ''}
    <div class="hoy-cols">
      <div class="hoy-resumen">${tarjetaResumen(dia, modo, items, ahoraHM)}
        <a class="acompana" href="#agenda">${ico('user')}<span>${modo === 'hoy' ? 'Acompaña hoy' : 'Acompaña'}: <b>${acompana ? esc(acompana) : 'sin asignar'}</b></span>${ico('right', 'flecha')}</a></div>
      <div class="linea">${linea}</div>
      <div class="hoy-ultimas">${modo === 'hoy' ? ultimas() : ''}${instalar}</div>
    </div>
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
