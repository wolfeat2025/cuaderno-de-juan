// MEDIR: anotar presión, pulso, azúcar y oxígeno; historial, gráfico y resumen para el médico.
import { estado, acciones, pintar, ir, aviso, paraGuardar } from '../nucleo.js';
import * as db from '../db.js';
import { esc, ico, val, porId, claveFecha, deClave, sumarDias, hhmm, fechaCorta, fechaLarga, diaRelativo, copiar, compartir } from '../util.js';
import { TIPOS, ORDEN_TIPOS, ETIQUETA, clasificar, mensaje, azucarBaja, valorTexto, detalleMomento } from '../datos.js';
import { itemsDelDia, sinSubir } from '../plan.js';

const AVISO_MEDICO = 'Rangos generales. Valen primero las indicaciones de su médico.';
const deTipo = (t) => estado.mediciones.filter((m) => m.tipo === t);
const cuando = (m) => `${diaRelativo(m.fecha, claveFecha(estado.ahora))} ${hhmm(new Date(m.ts))}`;

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

function principal() {
  const hoy = claveFecha(estado.ahora);
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
    <details class="plegable"><summary>${ico('info')}Cómo medir bien${ico('down', 'giro')}</summary>
      <ol><li>Sentado y tranquilo 5 minutos antes.</li><li>Siempre el mismo brazo.</li><li>Sin hablar mientras se mide.</li><li>Mañana y tarde, a la misma hora.</li></ol></details>
    <div class="grilla-medir">${tarjetas}</div>
    <a class="btn quieto" href="#resumen">${ico('chart')}Resumen y reportes</a>
    <p class="nota">${estado.config.rangos.provisorio ? 'Los colores usan rangos provisorios. ' : ''}${AVISO_MEDICO}</p>
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

function formulario(t) {
  const T = TIPOS[t], u = estado.ui;
  const campos = T.campos.map((c, i) => `<div class="campo"><label for="m${i}">${c[0]}</label><input class="numero" id="m${i}" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="3" placeholder="—"></div>`).join(T.campos.length > 1 ? '<span class="barra">/</span>' : '');
  const momento = t === 'azucar' ? `<div class="grupo"><p class="rotulo">¿Cuándo se midió?</p><div class="opciones">
      ${[['ayunas', 'En ayunas'], ['despues', 'Después de comer']].map(([k, n]) => `<button class="opcion${u.momento === k ? ' sel' : ''}" data-a="elegirMomento" data-v="${k}">${n}</button>`).join('')}</div></div>` : '';
  const animos = [['Bien', ''], ['Regular', ' medio'], ['Mal', ' malo']].map(([n, cls]) => `<button class="opcion${cls}${u.animo === n ? ' sel' : ''}" data-a="elegirAnimo" data-v="${n}">${n}</button>`).join('');
  return `<div class="envoltura" data-k="form-${t}">
    <a class="btn quieto izq" href="#medir">${ico('left')}Volver a Medir</a>
    <div class="numeros">${campos}</div>
    ${momento}
    <div class="grupo"><p class="rotulo">¿Cómo se siente? (opcional)</p><div class="opciones">${animos}</div></div>
    <div class="grupo"><p class="rotulo">¿A qué hora se midió?</p><div class="opciones">
      <button class="opcion${u.otraHora ? '' : ' sel'}" data-a="horaMedicion" data-v="ahora">Recién</button><button class="opcion${u.otraHora ? ' sel' : ''}" data-a="horaMedicion" data-v="otra">Más temprano</button></div>
      ${u.otraHora ? `<input class="texto" id="mhora" type="time" value="${u.horaIni || ''}" aria-label="Hora en que se midió">` : ''}</div>
    <input class="texto" id="mnota" placeholder="Nota corta (opcional)" maxlength="120" autocomplete="off">
    ${u.errorMedir ? `<p class="error" role="alert">${ico('alert')}${esc(u.errorMedir)}</p>` : ''}
    <button class="btn pri" data-a="guardarMedicion" data-tipo="${t}">${ico('check')}Guardar</button>
    <div class="panel"><p class="rotulo">Últimos 7 días</p>${grafico(t)}</div>
    <div class="lista-hist">${historial(t)}</div>
    <p class="nota">${AVISO_MEDICO}</p>
  </div>`;
}

// Rutina acompañada: después de guardar, ofrece seguir con lo que falta medir en esta ronda (última media hora).
function siguientes(t, discreto) {
  const hace = Date.now() - 30 * 60000;
  const faltan = ORDEN_TIPOS.filter((x) => x !== t && !estado.mediciones.some((m) => m.tipo === x && m.ts >= hace));
  const volver = `<a class="btn ${faltan.length || discreto ? 'quieto' : 'pri'}" href="#hoy">${ico('home')}Volver a Hoy</a>`;
  if (!faltan.length) return `<p class="rotulo">${ico('ccheck')}Ya están las 4 mediciones</p>${volver}`;
  return `<p class="rotulo">Seguir con</p><div class="seguir">${faltan.map((x, k) => `<a class="btn ${k === 0 && !discreto ? 'pri' : 'sec'}" href="#medir/${x}">${ico(TIPOS[x].icono)}${TIPOS[x].nombre}</a>`).join('')}</div>${volver}`;
}

function resultado(t, id) {
  const m = estado.mediciones.find((x) => x.id === id);
  if (!m) return `<div class="envoltura"><p class="vacio-txt">Esta medición se borró.</p><a class="btn pri" href="#medir">${ico('left')}Volver a Medir</a></div>`;
  const c = clasificar(m, estado.config.rangos), msj = mensaje(m, estado.config.rangos);
  const mal = m.animo === 'Mal';
  return `<div class="envoltura" data-k="res-${id}">
    <div class="resultado ${c}">
      <span class="chip ${c === 'verde' ? 'ok' : c === 'amarillo' ? 'amb' : 'rojo'}">${ico(c === 'verde' ? 'ccheck' : 'alert')}${msj[0]}</span>
      <p class="v">${valorTexto(m)}<small>${TIPOS[t].unidad && t !== 'oxigeno' ? ' ' + TIPOS[t].unidad : ''}</small></p>
      <p class="que">${msj[1]}</p>
      <p class="sub">${TIPOS[t].nombre}${detalleMomento(m) ? ' ' + detalleMomento(m) : ''} · Guardado por ${esc(m.quien)} a las ${hhmm(new Date(m.ts))}</p>
    </div>
    ${mal ? `<div class="alerta131"><p>Si tiene dolor en el pecho, falta de aire o se desmaya, llamen al 131.</p><a class="btn rojo" href="tel:131">${ico('phone')}Llamar al 131</a></div>` : ''}
    ${siguientes(t, mal || c === 'rojo')}
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
      fila += `${hhmm(new Date(m.ts))} ${valorTexto(m)}${m.tipo === 'azucar' ? (m.momento === 'despues' ? ' (después de comer)' : ' (ayunas)') : ''}`;
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
  if (TIPOS[args[0]]) return args[1] === 'listo' ? resultado(args[0], args[2]) : formulario(args[0]);
  return principal();
}
export const titulo = (args) => (args[0] === 'resumen' ? 'Resumen' : TIPOS[args[0]] ? TIPOS[args[0]].nombre : 'Medir');

acciones.elegirAnimo = (d) => { estado.ui.animo = estado.ui.animo === d.v ? '' : d.v; pintar(); };
acciones.elegirMomento = (d) => { estado.ui.momento = d.v; pintar(); };
acciones.horaMedicion = (d) => { estado.ui.otraHora = d.v === 'otra'; estado.ui.horaIni = hhmm(new Date()); pintar(); };
acciones.abrirMed = (d) => { estado.ui.medAbierta = estado.ui.medAbierta === d.id ? null : d.id; pintar(); };
acciones.borrarMed = (d) => {
  const m = estado.mediciones.find((x) => x.id === d.id); if (!m) return;
  const copia = paraGuardar(m);
  db.borrar('mediciones', d.id); estado.ui.medAbierta = null;
  aviso('Medición borrada', () => db.poner('mediciones', d.id, copia));
};
acciones.guardarMedicion = (d) => {
  const t = d.tipo, T = TIPOS[t], u = estado.ui, vals = [];
  for (let i = 0; i < T.campos.length; i++) {
    const crudo = val('m' + i), n = Number(crudo), c = T.campos[i];
    if (!/^\d{1,3}$/.test(crudo)) { u.errorMedir = `Falta el número de "${c[0]}".`; pintar(); porId('m' + i).focus(); return; }
    if (n < c[1] || n > c[2]) { u.errorMedir = `Revisa el número de "${c[0]}": ${n} no parece correcto.`; pintar(); porId('m' + i).focus(); return; }
    vals.push(n);
  }
  if (t === 'presion' && vals[1] >= vals[0]) { u.errorMedir = 'Revisa los números: el de arriba debe ser mayor que el de abajo.'; pintar(); return; }
  if (t === 'azucar' && !u.momento) { u.errorMedir = 'Elige si fue en ayunas o después de comer.'; pintar(); return; }
  const ahora = new Date(), id = db.nuevoId('mediciones');
  let ts = ahora.getTime();
  if (u.otraHora) {
    const h = val('mhora');
    if (!/^\d\d:\d\d$/.test(h)) { u.errorMedir = 'Pon la hora en que se midió.'; pintar(); return; }
    const real = new Date(); real.setHours(Number(h.slice(0, 2)), Number(h.slice(3, 5)), 0, 0);
    if (real.getTime() > ts) { u.errorMedir = 'Esa hora todavía no llega. Revisa la hora.'; pintar(); return; }
    ts = real.getTime();
  }
  // `ts` es la hora real de la medición; `creado` es cuándo se anotó.
  const m = { tipo: t, valor: vals[0], fecha: claveFecha(ahora), ts, creado: ahora.getTime(), quien: estado.quien };
  if (u.otraHora) m.despues = true;
  if (t === 'presion') m.valor2 = vals[1];
  if (t === 'azucar') m.momento = u.momento;
  if (u.animo) m.animo = u.animo;
  const nota = val('mnota'); if (nota) m.nota = nota;
  db.poner('mediciones', id, m);
  u.errorMedir = ''; u.animo = ''; u.momento = ''; u.otraHora = false;
  aviso(`${T.nombre} guardada`, () => { db.borrar('mediciones', id); ir('medir/' + t); });
  ir(`medir/${t}/listo/${id}`);
};
acciones.compartirResumen = async () => {
  const texto = textoResumen();
  if (navigator.share && (await compartir({ title: 'Resumen de mediciones', text: texto }))) return;
  aviso((await copiar(texto)) ? 'Resumen copiado. Pégalo en WhatsApp o en un correo.' : 'No se pudo copiar. Mantén apretado el texto para copiarlo.');
};

// Para saber si un resultado es de azúcar baja desde otras vistas.
export { azucarBaja };
