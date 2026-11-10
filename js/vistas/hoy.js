// HOY: el día de Juan como línea de tiempo compacta (hora, tarea y botón).
import { estado, acciones, pintar, aviso, guardarLocal, leerLocal, esAdmin, paraGuardar } from '../nucleo.js';
import * as db from '../db.js';
import { esc, ico, val, claveFecha, deClave, sumarDias, hhmm, fechaLarga, DIAS, mayus } from '../util.js';
import { TIPOS, ORDEN_TIPOS, ETIQUETA, clasificar, valorTexto } from '../datos.js';
import { itemsDelDia, resumenRemedios, medicionesDeTurno, planDe, sinSubir } from '../plan.js';

const franja = (h) => (h < '12:00' ? 'Mañana' : h < '19:00' ? 'Tarde' : 'Noche');
const ICONO_FRANJA = { 'Mañana': 'sun', 'Tarde': 'sunset', 'Noche': 'moon' };
export const COMIO = { todo: 'Comió todo', parte: 'Comió una parte', nada: 'No comió' };
const pend = (d) => (sinSubir(d) ? ' <span class="pend">· sin subir</span>' : '');

const fila = (cls, k, hora, tarjeta) => `<div class="fila ${cls}" data-k="${k}"><div class="hora">${hora}</div><div class="riel"><span class="nodo"></span></div>${tarjeta}</div>`;

function filaMed(it, modo, ahoraHM, fecha, anotable) {
  const t = estado.tomas[it.id], r = it.r;
  const detalle = [r.dosis, r.paraQue].filter(Boolean).map(esc).join(' · ');
  if (t) {
    const abierta = estado.ui.tomaAbierta === it.id;
    return fila('med hecho', it.id, it.hora, `<div class="tarjeta-fila"><div class="toca-area cabeza" data-a="abrirToma" data-id="${it.id}" role="button" tabindex="0">
        <span class="ic hecho">${ico('check')}</span>
        <div class="txt"><p class="tit">${esc(r.nombre)}</p><p class="firma">Lo dio ${esc(t.quien)} a las ${hhmm(new Date(t.ts))}${t.corregido ? ' (hora corregida)' : ''}${pend(t)}</p></div>${ico(abierta ? 'down' : 'right', 'flecha')}</div>
      ${abierta ? `<div class="agregar ancho"><input class="texto" id="hora-toma" type="time" value="${hhmm(new Date(t.ts))}" aria-label="Hora en que lo tomó"><button class="btn sec auto" data-a="guardarHoraToma" data-id="${it.id}">${ico('clock')}Cambiar hora</button></div>
        <button class="btn quieto" data-a="quitarToma" data-id="${it.id}">${ico('undo')}Quitar la marca</button>` : ''}</div>`);
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

function filaComida(it) {
  const reg = estado.tomas[it.id];
  return fila('comida' + (reg ? ' hecho' : ''), it.id, it.hora, `<a class="tarjeta-fila plana" href="#comidas"><span class="ic ${reg ? 'hecho' : 'comida'}">${ico(reg ? 'check' : it.icono)}</span>
    <div class="txt"><p class="tit">${it.nombre}</p>${reg ? `<p class="firma">${COMIO[reg.comio] || 'Anotado'} · ${esc(reg.quien)}${pend(reg)}</p>` : `<p class="sub">${esc(it.texto)}</p>`}</div>${ico('right', 'flecha')}</a>`);
}

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

export function anillo(dados, total) {
  const c = 2 * Math.PI * 24, parte = total ? dados / total : 0;
  return `<svg class="anillo" viewBox="0 0 60 60" role="img" aria-label="${dados} de ${total} remedios dados"><circle class="pista" cx="30" cy="30" r="24"/>
    <circle class="avance" cx="30" cy="30" r="24" stroke-dasharray="${(c * parte).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 30 30)"/>
    <text x="30" y="36" text-anchor="middle">${dados}/${total}</text></svg>`;
}

function tarjetaResumen(dia, modo, items, ahoraHM) {
  const res = resumenRemedios(dia);
  if (!estado.config.remedios.length && !res.total) {
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
  return `<p class="rotulo">${ico('pulse')}Últimas mediciones</p><div class="ultimas">${celdas}</div>
    <a class="acompana" href="#resumen">${ico('chart')}<span><b>Resumen de estos días</b></span>${ico('right', 'flecha')}</a>`;
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
  const sinPlan = modo === 'pasado' && !planDe(dia) ? '<p class="nota">Ese día nadie abrió el cuaderno, así que solo se muestra lo que quedó anotado.</p>' : '';

  const instalar = modo === 'hoy' && !window.navigator.standalone && /iPhone|iPad|iPod/.test(navigator.userAgent) && !leerLocal('cj_instalada')
    ? `<div class="panel"><p class="tit">Para tenerla siempre a mano</p><p class="sub">Toca el botón Compartir de Safari y elige "Agregar a inicio".</p><button class="btn quieto" data-a="ocultarInstalar">${ico('check')}Listo, ya la agregué</button></div>` : '';

  return `<div class="envoltura hoy">
    <div class="hoy-cab"><p class="saludo">${saludo()}</p><p class="fecha">${fechaLarga(deClave(dia))}</p>${tiraSemana(hoy, dia)}</div>
    ${modo !== 'hoy' ? `<div class="panel otro-dia"><p class="sub">${dia === ayer ? 'Estás viendo ayer. Si faltó anotar un remedio, se puede marcar aquí.' : modo === 'pasado' ? 'Estás viendo un día que ya pasó. Aquí no se puede anotar.' : 'Estás viendo un día que viene. Aquí no se puede anotar.'}</p><button class="btn pri" data-a="verDia" data-dia="${hoy}">${ico('left')}Volver a hoy</button></div>` : ''}
    <div class="hoy-cols">
      <div class="hoy-resumen">${tarjetaResumen(dia, modo, items, ahoraHM)}
        <a class="acompana" href="#agenda">${ico('user')}<span>${modo === 'hoy' ? 'Acompaña hoy' : 'Acompaña'}: <b>${acompana ? esc(acompana) : 'sin asignar'}</b></span>${ico('right', 'flecha')}</a></div>
      <div class="linea">${linea}${sinPlan}</div>
      <div class="hoy-ultimas">${modo === 'hoy' ? ultimas() : ''}${instalar}</div>
    </div>
  </div>`;
}

acciones.tomar = (d) => {
  const item = itemsDelDia(d.fecha || claveFecha(new Date())).find((x) => x.id === d.id);
  if (!item || estado.tomas[d.id]) return;
  const ahora = new Date(), r = item.r;
  db.poner('tomas', d.id, { fecha: d.fecha || claveFecha(ahora), remedioId: r.id, hora: d.hora, nombre: r.nombre, dosis: r.dosis || '', quien: estado.quien, ts: ahora.getTime(), creado: ahora.getTime() });
  aviso(`Listo: ${r.nombre}`, () => db.borrar('tomas', d.id));
};
acciones.abrirToma = (d) => { estado.ui.tomaAbierta = estado.ui.tomaAbierta === d.id ? null : d.id; pintar(); };
acciones.quitarToma = (d) => {
  const t = estado.tomas[d.id]; if (!t) return;
  const copia = paraGuardar(t);
  db.borrar('tomas', d.id); estado.ui.tomaAbierta = null;
  aviso('Marca quitada', () => db.poner('tomas', d.id, copia));
};
// Corregir la hora real en que se tomó (por ejemplo, si se anotó más tarde).
acciones.guardarHoraToma = (d) => {
  const t = estado.tomas[d.id], h = val('hora-toma'); if (!t || !/^\d\d:\d\d$/.test(h)) return;
  const antes = t.ts, f = new Date(t.ts); f.setHours(Number(h.slice(0, 2)), Number(h.slice(3, 5)), 0, 0);
  if (f.getTime() > Date.now() + 60000) { aviso('Esa hora todavía no llega. Revisa la hora.'); return; }
  db.cambiar('tomas', d.id, { ts: f.getTime(), corregido: true, creado: t.creado || antes });
  estado.ui.tomaAbierta = null;
  aviso(`Hora cambiada a las ${h}`, () => db.cambiar('tomas', d.id, { ts: antes, corregido: !!t.corregido }));
};
acciones.verDia = (d) => { estado.ui.dia = d.dia; estado.ui.irAhora = true; pintar(); };
acciones.ocultarInstalar = () => { guardarLocal('cj_instalada', '1'); pintar(); };
