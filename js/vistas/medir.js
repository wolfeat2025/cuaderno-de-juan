// MEDIR: la rutina del día, anotar presión, pulso, azúcar y oxígeno, historial, gráfico y resumen para el médico.
import { estado, acciones, pintar, ir, aviso, paraGuardar } from '../nucleo.js';
import * as db from '../db.js';
import { esc, ico, val, porId, claveFecha, deClave, sumarDias, hhmm, fechaCorta, fechaLarga, diaRelativo, copiar, compartir } from '../util.js';
import { TIPOS, ORDEN_TIPOS, ETIQUETA, TAREAS, rutinaDe, clasificar, mensaje, azucarBaja, valorTexto, detalleMomento, duracion } from '../datos.js';
import { itemsDelDia, sinSubir, medicionesDeTarea } from '../plan.js';
import { guiaMaquina } from '../guias.js';

const AVISO_MEDICO = 'Rangos generales. Valen primero las indicaciones de su médico.';
const deTipo = (t) => estado.mediciones.filter((m) => m.tipo === t);
const HORA_OK = /^\d\d:\d\d$/;
const aMin = (h) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));

// Mini gráfico de los últimos 7 días para la tarjeta de cada medición.
function chispa(t) {
  const desde = sumarDias(estado.ahora, -6).getTime();
  const ms = deTipo(t).filter((m) => m.ts >= desde).slice().reverse();
  if (ms.length < 2) return '<svg class="chispa" viewBox="0 0 120 26" aria-hidden="true"><line class="vacia" x1="3" y1="13" x2="117" y2="13"/></svg>';
  const vs = ms.map((m) => Number(m.valor)), lo = Math.min.apply(null, vs), hi = Math.max.apply(null, vs);
  const x = (k) => 4 + (k * 112) / (vs.length - 1), y = (v) => (hi === lo ? 13 : 22 - ((v - lo) / (hi - lo)) * 18);
  const pts = vs.map((v, k) => `${x(k).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return `<svg class="chispa" viewBox="0 0 120 26" aria-hidden="true"><polyline points="${pts}"/><circle cx="${x(vs.length - 1).toFixed(1)}" cy="${y(vs[vs.length - 1]).toFixed(1)}" r="3.2"/></svg>`;
}

// Recordatorio breve de la rutina real de cuatro mediciones, leyendo los horarios configurados.
function recordatorioMedir() {
  const r = rutinaDe(estado.config), mapa = {};
  r.forEach((x) => { mapa[x.id] = x.hora; });
  const hAzucar = [mapa['glu-ayunas'] ? `ayunas ${mapa['glu-ayunas']}` : '', mapa['glu-almuerzo'] ? `almuerzo + 2 h (${mapa['glu-almuerzo']})` : ''].filter(Boolean).join(' · ');
  const hPresion = [mapa['pre-manana'] ? `mañana ${mapa['pre-manana']}` : '', mapa['pre-noche'] ? `noche ${mapa['pre-noche']}` : ''].filter(Boolean).join(' · ');
  return `<div class="panel cuidado recordatorio-medir" role="region" aria-label="Recordatorio de mediciones">
    <div class="rec-fila">
      <span class="rec-iconos" aria-hidden="true">${ico('sun')}${ico('soup')}</span>
      <div>
        <p class="tit">Azúcar: en ayunas y 2 h después de empezar a almorzar.</p>
        ${hAzucar ? `<p class="sub">Horario configurado: ${esc(hAzucar)}</p>` : ''}
      </div>
    </div>
    <div class="rec-fila">
      <span class="rec-iconos" aria-hidden="true">${ico('sun')}${ico('moon')}</span>
      <div>
        <p class="tit">Presión y pulso: mañana y noche.</p>
        ${hPresion ? `<p class="sub">Horario configurado: ${esc(hPresion)}</p>` : ''}
      </div>
    </div>
    <p class="nota">Horarios organizados por la familia en la app (se cambian en Ajustes).</p>
  </div>`;
}

// Las tareas de medición de hoy, con su estado. Tocar una abre el formulario con su contexto ya sugerido.
function rutinaHoy() {
  const hoy = claveFecha(estado.ahora), tareas = itemsDelDia(hoy).filter((i) => i.tipo === 'tarea');
  if (!tareas.length) return '';
  const filas = tareas.map((it) => {
    const T = TAREAS[it.tid], ms = medicionesDeTarea(hoy, it.tid), ult = ms[ms.length - 1];
    const c = ult ? clasificar(ult, estado.config.rangos) : '';
    const sub = ult
      ? `<span class="firma"><span class="v ${c}">${valorTexto(ult)}</span> · ${ETIQUETA[c]} · ${hhmm(new Date(ult.ts))}${ms.length > 1 ? ` · ${ms.length} lecturas` : ''}</span>`
      : `<span class="sub">${it.hora} · Falta anotar</span>`;
    return `<a class="opcion-aj" href="#medir/${T.tipo}/t/${it.tid}" data-k="rut-${it.tid}"><span class="ic ${ult ? 'hecho' : 'medir'}">${ico(ult ? 'check' : TIPOS[T.tipo].icono)}</span>
      <span class="info"><span class="tit">${T.nombre}</span>${sub}</span>${ico('right')}</a>`;
  }).join('');
  return `<p class="rotulo">${ico('clock')}Rutina de hoy</p><div class="lista-aj rutina">${filas}</div>`;
}

function principal() {
  const hoy = claveFecha(estado.ahora), rutina = rutinaHoy();
  const tarjetas = ORDEN_TIPOS.map((t) => {
    const T = TIPOS[t], m = deTipo(t)[0];
    const c = m ? clasificar(m, estado.config.rangos) : '';
    const cuandoCorto = m ? (m.fecha === hoy ? hhmm(new Date(m.ts)) : diaRelativo(m.fecha, hoy)) : '';
    return `<a class="tarjeta-medir t-${t}" href="#medir/${t}">
      <div class="arriba"><span class="ic">${ico(T.icono)}</span><p class="n">${T.nombre}</p></div>
      <p class="v ${m ? c : 'vacio'}">${m ? valorTexto(m) : '—'}</p>
      <p class="estado ${c}">${m ? `<span class="luz"></span>${c === 'rojo' ? 'Fuera' : ETIQUETA[c]} · ${cuandoCorto}` : 'Sin datos todavía'}</p>
      ${chispa(t)}
      <span class="anotar">${ico('plus')}Anotar</span></a>`;
  }).join('');
  return `<div class="envoltura medir">
    ${recordatorioMedir()}
    ${rutina}
    ${rutina ? `<p class="rotulo">${ico('plus')}Anotar otra medición</p>` : ''}
    <div class="grilla-medir">${tarjetas}</div>
    <a class="btn quieto" href="#resumen">${ico('chart')}Resumen y reportes</a>
    <p class="nota">Dentro de cada medición está "Cómo usar nuestra máquina". ${estado.config.rangos.provisorio ? 'Los colores usan rangos generales. ' : ''}Valen primero las indicaciones de su médico.</p>
  </div>`;
}

function grafico(t) {
  const hoy = estado.ahora, ini = sumarDias(hoy, -6).getTime(), fin = sumarDias(hoy, 1).getTime();
  const ms = deTipo(t).filter((m) => m.ts >= ini).slice().reverse();
  if (ms.length < 2) return '<p class="nota">El gráfico aparece cuando haya al menos 2 mediciones.</p>';
  const W = 330, H = 170, L = 40, R = 8, T = 12, B = 30;
  const todos = []; ms.forEach((m) => { todos.push(Number(m.valor)); if (t === 'presion') todos.push(Number(m.valor2)); });
  let lo = Math.min.apply(null, todos), hi = Math.max.apply(null, todos);
  const margen = Math.max(5, (hi - lo) * 0.2); lo = Math.floor(lo - margen); hi = Math.ceil(hi + margen);
  const x = (ts) => L + ((ts - ini) / (fin - ini)) * (W - L - R);
  const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const color = { verde: 'var(--acc)', amarillo: 'var(--amb)', rojo: 'var(--red)' };
  const serie = (campo, cls) => {
    const pts = ms.map((m) => `${x(m.ts).toFixed(1)},${y(Number(m[campo])).toFixed(1)}`).join(' ');
    const dots = ms.map((m) => `<circle cx="${x(m.ts).toFixed(1)}" cy="${y(Number(m[campo])).toFixed(1)}" r="5" fill="${color[clasificar(m, estado.config.rangos)]}"/>`).join('');
    return `<polyline class="${cls}" fill="none" points="${pts}"/>${dots}`;
  };
  let ejes = '';
  [lo, Math.round((lo + hi) / 2), hi].forEach((v) => { ejes += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="guia"/><text x="${L - 6}" y="${y(v) + 5}" text-anchor="end">${v}</text>`; });
  for (let i = 0; i < 7; i++) { const d = sumarDias(hoy, i - 6); ejes += `<text x="${x(d.getTime() + 12 * 3600000)}" y="${H - 8}" text-anchor="middle">${i === 6 ? 'Hoy' : fechaCorta(d).slice(0, 3)}</text>`; }
  return `<svg class="grafico" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Gráfico de ${TIPOS[t].nombre} de los últimos 7 días">${ejes}${serie('valor', 'l1')}${t === 'presion' ? serie('valor2', 'l2') : ''}</svg>
    ${t === 'presion' ? '<p class="nota">Línea gruesa: arriba. Línea delgada: abajo.</p>' : ''}`;
}

function historial(t) {
  const hoy = claveFecha(estado.ahora), desde = claveFecha(sumarDias(estado.ahora, -6));
  const ms = deTipo(t).filter((m) => m.fecha >= desde);
  if (!ms.length) return '<p class="nota">Todavía no hay mediciones en los últimos 7 días.</p>';
  let h = '', dia = '';
  ms.forEach((m) => {
    if (m.fecha !== dia) { dia = m.fecha; h += `<p class="rotulo dia-hist">${diaRelativo(dia, hoy) === fechaCorta(deClave(dia)) ? fechaLarga(deClave(dia)) : diaRelativo(dia, hoy)}</p>`; }
    const c = clasificar(m, estado.config.rangos), abierta = estado.ui.medAbierta === m.id;
    const extra = [detalleMomento(m), m.animo ? `se siente ${m.animo.toLowerCase()}` : '', m.nota, m.despues ? 'anotado después' : '', sinSubir(m) ? 'sin subir' : ''].filter(Boolean).map(esc).join(' · ');
    h += `<div class="reg" data-k="${m.id}"><div class="toca-area" data-a="abrirMed" data-id="${m.id}" role="button" tabindex="0">
        <span class="h">${hhmm(new Date(m.ts))}</span><span class="v ${c}">${valorTexto(m)}</span><span class="estado ${c}"><span class="luz"></span>${ETIQUETA[c]}</span></div>
      <p class="sub">${esc(m.quien)}${extra ? ' · ' + extra : ''}</p>
      ${abierta ? `<button class="btn quieto" data-a="borrarMed" data-id="${m.id}">${ico('trash')}Borrar esta medición</button>` : ''}</div>`;
  });
  return h;
}

// ---- Contexto de la medición ----
// Azúcar: 'ayunas' y 'almuerzo' cumplen su tarea de la rutina; 'antes' y 'despues' son de cualquier otra comida.
const CTX_AZUCAR = [['ayunas', 'En ayunas'], ['almuerzo', 'Después de almorzar'], ['antes', 'Antes de otra comida'], ['despues', 'Después de otra comida']];
const CTX_PRESION = [['pre-manana', 'Mañana'], ['pre-noche', 'Noche'], ['otro', 'Otro momento']];
// Lo elegido en pantalla; si no se ha tocado nada, lo que sugiere la tarea desde la que se entró.
function contexto(t, tid) {
  const u = estado.ui, T = TAREAS[tid];
  if (t === 'azucar') return u.momento || (T && T.tipo === 'azucar' ? (T.momento === 'ayunas' ? 'ayunas' : 'almuerzo') : '');
  if (t === 'presion') return u.cuando || (T && T.tipo === 'presion' ? tid : tid === 'otro' ? 'otro' : estado.ahora.getHours() < 15 ? 'pre-manana' : 'pre-noche');
  return '';
}

function formulario(t, tid) {
  const T = TIPOS[t], u = estado.ui, ctx = contexto(t, tid);
  const maquina = t === 'presion' ? [' · Sistema', ' · Día'] : ['', ''];
  const campos = T.campos.map((c, i) => `<div class="campo"><label for="m${i}">${c[0]}${maquina[i] || ''}</label><input class="numero" id="m${i}" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="3" placeholder="—"></div>`).join(T.campos.length > 1 ? '<span class="barra">/</span>' : '');
  const pulso = t === 'presion' ? `<div class="campo campo-pulso"><label for="m2">Pulso · Bey/MIN (si lo quieres anotar)</label><input class="numero" id="m2" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="3" placeholder="—"></div>` : '';
  const chips = (lista, accion) => lista.map(([k, n]) => `<button class="opcion${ctx === k ? ' sel' : ''}" data-a="${accion}" data-v="${k}">${n}</button>`).join('');
  let momento = '';
  if (t === 'azucar') {
    const despues = ctx === 'almuerzo' || ctx === 'despues', comida = ctx === 'almuerzo' ? 'almorzar' : 'comer';
    // Solo se reutiliza una hora de inicio de almuerzo ya confirmada hoy en Medir; nunca la hora de consumo de Comidas.
    if (ctx === 'almuerzo' && u.inicio === undefined) {
      const hoy = claveFecha(estado.ahora);
      const prev = estado.mediciones.find((m) => m.fecha === hoy && m.tipo === 'azucar' && m.tarea === 'glu-almuerzo' && HORA_OK.test(m.inicioComida || ''));
      u.inicio = prev ? prev.inicioComida : '';
    }
    let van = '';
    if (despues && HORA_OK.test(u.inicio || '')) {
      const ref = u.otraHora && HORA_OK.test(val('mhora')) ? aMin(val('mhora')) : aMin(hhmm(new Date())), dif = ref - aMin(u.inicio);
      van = dif >= 0 ? `Van ${duracion(dif)} desde que empezó a ${comida}.` : '';
    }
    momento = `<div class="grupo"><p class="rotulo">¿Cuándo se midió?</p><div class="opciones envuelve">${chips(CTX_AZUCAR, 'elegirMomento')}</div></div>
      ${despues ? `<div class="grupo" data-k="inicio"><label class="rotulo" for="minicio">¿A qué hora empezó a ${comida}?</label>
        <input class="texto" id="minicio" type="time" value="${esc(u.inicio || '')}" data-c="cambiarInicio">
        <p class="nota">${van || 'Si no se sabe, se deja vacío.'} Lo habitual es medir cerca de 2 horas después de empezar (se cuenta desde el inicio del almuerzo, no desde la hora en que se anotó la comida).</p></div>` : ''}`;
  } else if (t === 'presion') {
    momento = `<div class="grupo"><p class="rotulo">¿De cuándo es esta medición?</p><div class="opciones">${chips(CTX_PRESION, 'elegirCuando')}</div></div>`;
  }
  const animos = [['Bien', ''], ['Regular', ' medio'], ['Mal', ' malo']].map(([n, cls]) => `<button class="opcion${cls}${u.animo === n ? ' sel' : ''}" data-a="elegirAnimo" data-v="${n}">${n}</button>`).join('');
  return `<div class="envoltura" data-k="form-${t}">
    <a class="btn quieto izq" href="#medir">${ico('left')}Volver a Medir</a>
    ${guiaMaquina(t)}
    <div class="numeros">${campos}</div>
    ${pulso}
    ${momento}
    <div class="grupo"><p class="rotulo">¿Cómo se siente? (opcional)</p><div class="opciones">${animos}</div></div>
    <div class="grupo"><p class="rotulo">¿A qué hora se midió?</p><div class="opciones">
      <button class="opcion${u.otraHora ? '' : ' sel'}" data-a="horaMedicion" data-v="ahora">Recién</button><button class="opcion${u.otraHora ? ' sel' : ''}" data-a="horaMedicion" data-v="otra">Más temprano</button></div>
      ${u.otraHora ? `<input class="texto" id="mhora" type="time" value="${u.horaIni || ''}" aria-label="Hora en que se midió">` : ''}</div>
    <input class="texto" id="mnota" placeholder="Nota corta (opcional)" maxlength="120" autocomplete="off">
    ${u.errorMedir ? `<p class="error" role="alert">${ico('alert')}${esc(u.errorMedir)}</p>` : ''}
    <button class="btn pri" data-a="guardarMedicion" data-tipo="${t}" data-tid="${esc(tid || '')}">${ico('check')}Guardar</button>
    <div class="panel"><p class="rotulo">Últimos 7 días</p>${grafico(t)}</div>
    <div class="lista-hist">${historial(t)}</div>
    <p class="nota">${AVISO_MEDICO}</p>
  </div>`;
}

// Después de guardar: lo que todavía falta de la rutina de hoy (no se pide medir todo cada vez).
function loQueFalta(discreto) {
  const hoy = claveFecha(estado.ahora), tareas = itemsDelDia(hoy).filter((i) => i.tipo === 'tarea');
  const faltan = tareas.filter((i) => !medicionesDeTarea(hoy, i.tid).length);
  const volver = `<a class="btn ${faltan.length || discreto ? 'quieto' : 'pri'}" href="#hoy">${ico('home')}Volver a Hoy</a>`;
  if (!tareas.length) return volver;
  if (!faltan.length) return `<p class="rotulo">${ico('ccheck')}La rutina de hoy está completa</p>${volver}`;
  return `<p class="rotulo">Falta hoy</p><div class="seguir">${faltan.map((i) => `<a class="btn sec izq" href="#medir/${TAREAS[i.tid].tipo}/t/${i.tid}">${ico(TIPOS[TAREAS[i.tid].tipo].icono)}<span>${TAREAS[i.tid].nombre}<br><span class="sub-btn">Hora de la rutina: ${i.hora}</span></span></a>`).join('')}</div>${volver}`;
}

function resultado(t, id) {
  const m = estado.mediciones.find((x) => x.id === id);
  if (!m) return `<div class="envoltura"><p class="vacio-txt">Esta medición se borró.</p><a class="btn pri" href="#medir">${ico('left')}Volver a Medir</a></div>`;
  const R = estado.config.rangos, c = clasificar(m, R), msj = mensaje(m, R);
  const pulso = m.pulsoId ? estado.mediciones.find((x) => x.id === m.pulsoId) : null, cp = pulso ? clasificar(pulso, R) : '';
  const mal = m.animo === 'Mal', serio = mal || c === 'rojo' || cp === 'rojo';
  return `<div class="envoltura" data-k="res-${id}">
    <div class="resultado ${c}">
      <span class="chip ${c === 'verde' ? 'ok' : c === 'amarillo' ? 'amb' : 'rojo'}">${ico(c === 'verde' ? 'ccheck' : 'alert')}${msj[0]}</span>
      <p class="v">${valorTexto(m)}<small>${TIPOS[t].unidad && t !== 'oxigeno' ? ' ' + TIPOS[t].unidad : ''}</small></p>
      <p class="que">${msj[1]}</p>
      <p class="sub">${TIPOS[t].nombre}${detalleMomento(m) ? ' ' + detalleMomento(m) : ''} · Guardado por ${esc(m.quien)} a las ${hhmm(new Date(m.ts))}</p>
    </div>
    ${pulso ? `<div class="panel junto t-pulso"><span class="ic tipo">${ico('heart')}</span><div class="txt"><p class="tit">Pulso ${pulso.valor} por minuto</p><p class="estado ${cp}"><span class="luz"></span>${mensaje(pulso, R)[0]}</p></div></div>` : ''}
    ${serio ? `<div class="alerta131"><p>Si tiene dolor en el pecho, falta de aire o se desmaya, llamen al 131.</p><a class="btn rojo" href="tel:131">${ico('phone')}Llamar al 131</a></div>` : ''}
    ${t === 'presion' ? `<a class="btn quieto" href="#medir/presion/t/${m.tarea || 'otro'}">${ico('plus')}Anotar otra lectura</a>` : ''}
    ${loQueFalta(serio)}
    <p class="nota">${AVISO_MEDICO}</p>
  </div>`;
}

export function textoResumen() {
  const hoy = estado.ahora, desde = sumarDias(hoy, -6), kDesde = claveFecha(desde);
  const L = [];
  const e = estado.config.emergencia;
  L.push(`Resumen de ${e.nombre || 'Juan'} — del ${fechaCorta(desde)} al ${fechaCorta(hoy)} (${hoy.getFullYear()})`);
  L.push('Mediciones tomadas en la casa por la familia.', '');
  ORDEN_TIPOS.forEach((t) => {
    const ms = deTipo(t).filter((m) => m.fecha >= kDesde).slice().reverse();
    L.push(`${TIPOS[t].nombre.toUpperCase()}${TIPOS[t].unidad ? ' (' + TIPOS[t].unidad + ')' : ''}`);
    if (!ms.length) { L.push('  Sin mediciones.', ''); return; }
    let dia = '', fila = '';
    ms.forEach((m) => {
      if (m.fecha !== dia) { if (fila) L.push(fila); dia = m.fecha; fila = `  ${fechaCorta(deClave(dia))}: `; } else fila += ' · ';
      const det = m.tipo === 'azucar' ? (m.momento === 'ayunas' ? 'ayunas' : detalleMomento(m)) : '';
      fila += `${hhmm(new Date(m.ts))} ${valorTexto(m)}${det ? ` (${det})` : ''}`;
    });
    L.push(fila, '');
  });
  if (estado.config.remedios.length) {
    L.push('REMEDIOS (tomas marcadas)');
    for (let i = 0; i < 7; i++) {
      const d = sumarDias(desde, i), k = claveFecha(d);
      const meds = itemsDelDia(k).filter((x) => x.tipo === 'med');
      const dados = meds.filter((x) => estado.tomas[x.id]).length;
      L.push(`  ${fechaCorta(d)}: ${dados} de ${meds.length}`);
    }
    L.push('');
  }
  const notas = estado.mediciones.filter((m) => m.fecha >= kDesde && (m.nota || m.animo === 'Mal' || m.animo === 'Regular')).slice().reverse();
  if (notas.length) {
    L.push('NOTAS');
    notas.forEach((m) => L.push(`  ${fechaCorta(deClave(m.fecha))} ${hhmm(new Date(m.ts))} · ${TIPOS[m.tipo].nombre} ${valorTexto(m)}${m.animo ? ' · se siente ' + m.animo.toLowerCase() : ''}${m.nota ? ' · ' + m.nota : ''}`));
  }
  return L.join('\n').trim();
}

function resumen() {
  return `<div class="envoltura">
    <a class="btn quieto izq" href="#medir">${ico('left')}Volver a Medir</a>
    <button class="btn pri" data-a="compartirResumen">${ico('share')}Compartir o copiar</button>
    <pre class="texto-resumen" id="texto-resumen">${esc(textoResumen())}</pre>
  </div>`;
}

export function render(args) {
  if (args[0] === 'resumen') return resumen();
  if (TIPOS[args[0]]) return args[1] === 'listo' ? resultado(args[0], args[2]) : formulario(args[0], args[1] === 't' ? args[2] : '');
  return principal();
}
export const titulo = (args) => (args[0] === 'resumen' ? 'Resumen' : TIPOS[args[0]] ? TIPOS[args[0]].nombre : 'Medir');

acciones.elegirAnimo = (d) => { estado.ui.animo = estado.ui.animo === d.v ? '' : d.v; pintar(); };
acciones.elegirMomento = (d) => { estado.ui.momento = d.v; pintar(); };
acciones.elegirCuando = (d) => { estado.ui.cuando = d.v; pintar(); };
acciones.cambiarInicio = (d, el) => { estado.ui.inicio = el.value; pintar(); };
acciones.horaMedicion = (d) => { estado.ui.otraHora = d.v === 'otra'; estado.ui.horaIni = hhmm(new Date()); pintar(); };
acciones.abrirMed = (d) => { estado.ui.medAbierta = estado.ui.medAbierta === d.id ? null : d.id; pintar(); };
acciones.borrarMed = (d) => {
  const m = estado.mediciones.find((x) => x.id === d.id); if (!m) return;
  // Si la presión se anotó junto con el pulso, se borran y se reponen juntos.
  const par = m.pulsoId ? estado.mediciones.find((x) => x.id === m.pulsoId) : null;
  const copia = paraGuardar(m), copiaPar = par ? paraGuardar(par) : null;
  db.borrar('mediciones', d.id); if (par) db.borrar('mediciones', par.id);
  estado.ui.medAbierta = null;
  aviso('Medición borrada', () => { db.poner('mediciones', d.id, copia); if (par) db.poner('mediciones', par.id, copiaPar); });
};
acciones.guardarMedicion = (d) => {
  const t = d.tipo, T = TIPOS[t], u = estado.ui, vals = [];
  const falla = (texto, campo) => { u.errorMedir = texto; pintar(); if (campo && porId(campo)) porId(campo).focus(); };
  for (let i = 0; i < T.campos.length; i++) {
    const crudo = val('m' + i), n = Number(crudo), c = T.campos[i];
    if (!/^\d{1,3}$/.test(crudo)) return falla(`Falta el número de "${c[0]}".`, 'm' + i);
    if (n < c[1] || n > c[2]) return falla(`Revisa el número de "${c[0]}": ${n} no parece correcto.`, 'm' + i);
    vals.push(n);
  }
  if (t === 'presion' && vals[1] >= vals[0]) return falla('Revisa los números: el de arriba debe ser mayor que el de abajo.');
  let pulso = null;
  if (t === 'presion' && val('m2') !== '') {
    const crudo = val('m2'), n = Number(crudo), c = TIPOS.pulso.campos[0];
    if (!/^\d{1,3}$/.test(crudo) || n < c[1] || n > c[2]) return falla(`Revisa el número del pulso: ${crudo} no parece correcto.`, 'm2');
    pulso = n;
  }
  const ctx = contexto(t, d.tid);
  if (t === 'azucar' && !ctx) return falla('Elige si fue en ayunas, antes o después de comer.');
  const ahora = new Date(), id = db.nuevoId('mediciones');
  let ts = ahora.getTime();
  if (u.otraHora) {
    const h = val('mhora');
    if (!HORA_OK.test(h)) return falla('Pon la hora en que se midió.');
    const real = new Date(); real.setHours(Number(h.slice(0, 2)), Number(h.slice(3, 5)), 0, 0);
    if (real.getTime() > ts) return falla('Esa hora todavía no llega. Revisa la hora.');
    ts = real.getTime();
  }
  // `ts` es la hora real de la medición; `creado` es cuándo se anotó.
  const m = { tipo: t, valor: vals[0], fecha: claveFecha(ahora), ts, creado: ahora.getTime(), quien: estado.quien };
  if (u.otraHora) m.despues = true;
  if (t === 'presion') { m.valor2 = vals[1]; m.tarea = ctx === 'otro' ? '' : ctx; }
  if (t === 'azucar') {
    m.momento = ctx === 'almuerzo' ? 'despues' : ctx;
    m.tarea = ctx === 'ayunas' ? 'glu-ayunas' : ctx === 'almuerzo' ? 'glu-almuerzo' : '';
    const inicio = val('minicio');
    if (m.momento === 'despues' && HORA_OK.test(inicio)) {
      const ini = new Date(ts); ini.setHours(Number(inicio.slice(0, 2)), Number(inicio.slice(3, 5)), 0, 0);
      if (ini.getTime() > ts) return falla('La hora en que empezó a comer no puede ser después de la medición.', 'minicio');
      m.inicioComida = inicio; m.minComida = Math.round((ts - ini.getTime()) / 60000);
    }
  }
  if (u.animo) m.animo = u.animo;
  const nota = val('mnota'); if (nota) m.nota = nota;
  // El pulso anotado junto a la presión se guarda como su propia medición, enlazada a esta.
  let idPulso = '';
  if (pulso !== null) {
    idPulso = db.nuevoId('mediciones'); m.pulsoId = idPulso;
    const p = { tipo: 'pulso', valor: pulso, fecha: m.fecha, ts, creado: m.creado, quien: estado.quien, junto: id };
    if (u.otraHora) p.despues = true;
    db.poner('mediciones', idPulso, p);
  }
  db.poner('mediciones', id, m);
  u.errorMedir = ''; u.animo = ''; u.momento = ''; u.cuando = ''; u.inicio = undefined; u.otraHora = false;
  aviso(`${T.nombre} guardada`, () => { db.borrar('mediciones', id); if (idPulso) db.borrar('mediciones', idPulso); ir('medir/' + t); });
  ir(`medir/${t}/listo/${id}`);
};
acciones.compartirResumen = async () => {
  const texto = textoResumen();
  if (navigator.share && (await compartir({ title: 'Resumen de mediciones', text: texto }))) return;
  aviso((await copiar(texto)) ? 'Resumen copiado. Pégalo en WhatsApp o en un correo.' : 'No se pudo copiar. Mantén apretado el texto para copiarlo.');
};

// Para saber si un resultado es de azúcar baja desde otras vistas.
export { azucarBaja };
