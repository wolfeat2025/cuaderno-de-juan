// RESUMEN: panel acumulado de lo anotado, y reportes del día o de la semana para guardar como PDF.
import { estado, acciones, pintar } from '../nucleo.js';
import * as db from '../db.js';
import { esc, ico, val, claveFecha, deClave, sumarDias, lunesDe, hhmm, fechaLarga, fechaCorta, DIAS, MESES, mayus } from '../util.js';
import { TIPOS, ORDEN_TIPOS, ETIQUETA, clasificar, valorTexto, detalleMomento } from '../datos.js';
import { itemsDelDia, resumenRemedios } from '../plan.js';
import { anillo } from './hoy.js';

const R = { periodo: 'todo', clave: '', datos: null, cargando: false, error: '', rep: { modo: 'dia', fecha: '', clave: '', datos: null, cargando: false } };
const DIAS_PERIODO = { 7: 7, 30: 30, todo: 90 };
const COMIO = { todo: 'Todo', parte: 'Una parte', nada: 'Nada' };
const prom = (xs) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);

function cargar() {
  const hoy = claveFecha(estado.ahora), desde = claveFecha(sumarDias(estado.ahora, -(DIAS_PERIODO[R.periodo] - 1)));
  R.cargando = true; R.error = '';
  db.traerRango(desde, hoy).then((d) => { R.datos = d; R.clave = R.periodo + hoy; R.cargando = false; pintar(); })
    .catch(() => { R.cargando = false; R.error = 'No se pudo armar el resumen. Revisa la señal e inténtalo de nuevo.'; pintar(); });
}

// Gráfico de línea de un tipo de medición entre dos fechas. Los puntos van del color de su estado.
export function graficoRango(t, ms, ini, fin) {
  if (ms.length < 2) return `<p class="nota">${ms.length ? 'Hay 1 medición: el gráfico aparece desde la segunda.' : 'Sin mediciones en este período.'}</p>`;
  const W = 330, H = 150, L = 38, Rr = 8, T = 10, B = 26, orden = ms.slice().sort((a, b) => a.ts - b.ts);
  const todos = []; orden.forEach((m) => { todos.push(Number(m.valor)); if (t === 'presion') todos.push(Number(m.valor2)); });
  let lo = Math.min.apply(null, todos), hi = Math.max.apply(null, todos);
  const margen = Math.max(4, (hi - lo) * 0.2); lo = Math.floor(lo - margen); hi = Math.ceil(hi + margen);
  const x = (ts) => L + ((ts - ini) / Math.max(1, fin - ini)) * (W - L - Rr), y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const color = { verde: 'var(--acc)', amarillo: 'var(--amb)', rojo: 'var(--red)' };
  const serie = (campo, cls) => `<polyline class="${cls}" fill="none" points="${orden.map((m) => `${x(m.ts).toFixed(1)},${y(Number(m[campo])).toFixed(1)}`).join(' ')}"/>` +
    orden.map((m) => `<circle cx="${x(m.ts).toFixed(1)}" cy="${y(Number(m[campo])).toFixed(1)}" r="4.5" fill="${color[clasificar(m, estado.config.rangos)]}"/>`).join('');
  let ejes = '';
  [lo, Math.round((lo + hi) / 2), hi].forEach((v) => { ejes += `<line x1="${L}" x2="${W - Rr}" y1="${y(v)}" y2="${y(v)}" class="guia"/><text x="${L - 6}" y="${y(v) + 5}" text-anchor="end">${v}</text>`; });
  ejes += `<text x="${L}" y="${H - 6}">${fechaCorta(new Date(ini))}</text><text x="${W - Rr}" y="${H - 6}" text-anchor="end">${fechaCorta(new Date(fin - 1))}</text>`;
  return `<svg class="grafico" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Gráfico de ${TIPOS[t].nombre}">${ejes}${serie('valor', 'l1')}${t === 'presion' ? serie('valor2', 'l2') : ''}</svg>`;
}

// ---------- Panel acumulado ----------
function tarjetaTipo(t, d, ini, fin) {
  const T = TIPOS[t], ms = d.mediciones.filter((m) => m.tipo === t), ult = ms[0];
  if (!ult) return `<div class="panel t-${t}"><div class="cabeza"><span class="ic tipo">${ico(T.icono)}</span><p class="h3">${T.nombre}</p></div><p class="vacio-txt">Sin mediciones todavía.</p></div>`;
  const c = clasificar(ult, estado.config.rangos), cl = ms.map((m) => clasificar(m, estado.config.rangos));
  const revisar = cl.filter((x) => x === 'amarillo').length, fuera = cl.filter((x) => x === 'rojo').length;
  const dato = (k, v) => `<div class="dato-mini"><span class="k">${k}</span><span class="v">${v}</span></div>`;
  let cifras;
  if (t === 'presion') {
    const alta = ms.slice().sort((a, b) => b.valor - a.valor)[0], baja = ms.slice().sort((a, b) => a.valor - b.valor)[0];
    cifras = dato('Promedio', `${prom(ms.map((m) => Number(m.valor)))}/${prom(ms.map((m) => Number(m.valor2)))}`) + dato('Más baja', valorTexto(baja)) + dato('Más alta', valorTexto(alta));
  } else if (t === 'azucar') {
    const ay = ms.filter((m) => m.momento !== 'despues').map((m) => Number(m.valor)), de = ms.filter((m) => m.momento === 'despues').map((m) => Number(m.valor));
    cifras = dato('Promedio en ayunas', ay.length ? prom(ay) : '—') + dato('Promedio después de comer', de.length ? prom(de) : '—');
  } else {
    const vs = ms.map((m) => Number(m.valor));
    cifras = dato('Promedio', prom(vs) + (t === 'oxigeno' ? '%' : '')) + dato('Más bajo', Math.min.apply(null, vs) + (t === 'oxigeno' ? '%' : '')) + dato('Más alto', Math.max.apply(null, vs) + (t === 'oxigeno' ? '%' : ''));
  }
  return `<div class="panel t-${t}">
    <div class="titulo-fila"><div class="cabeza"><span class="ic tipo">${ico(T.icono)}</span><p class="h3">${T.nombre}</p></div><span class="chip neutro">${ms.length} ${ms.length === 1 ? 'medición' : 'mediciones'}</span></div>
    <div class="ultimo"><p class="v ${c}">${valorTexto(ult)}</p><div><p class="estado ${c}"><span class="luz"></span>${ETIQUETA[c]}</p><p class="sub">Última: ${fechaCorta(deClave(ult.fecha))} ${hhmm(new Date(ult.ts))}</p></div></div>
    ${graficoRango(t, ms, ini, fin)}
    <div class="datos-mini">${cifras}</div>
    <p class="sub">${revisar || fuera ? `${revisar ? `${revisar} para revisar` : ''}${revisar && fuera ? ' · ' : ''}${fuera ? `${fuera} fuera de lo normal` : ''}` : 'Todas dentro del rango configurado'}</p></div>`;
}

function panel() {
  const hoy = claveFecha(estado.ahora);
  if (R.clave !== R.periodo + hoy && !R.cargando && !R.error) setTimeout(cargar, 0);
  const selector = `<div class="opciones">${[['7', '7 días'], ['30', '30 días'], ['todo', 'Todo']].map(([v, n]) => `<button class="opcion${R.periodo === v ? ' sel' : ''}" data-a="periodoResumen" data-v="${v}">${n}</button>`).join('')}</div>`;
  if (R.error) return `<div class="envoltura">${selector}<p class="error">${ico('alert')}${R.error}</p><button class="btn pri" data-a="recargarResumen">${ico('undo')}Intentar de nuevo</button></div>`;
  if (!R.datos || R.clave !== R.periodo + hoy) return `<div class="envoltura">${selector}<p class="vacio-txt">Armando el resumen…</p></div>`;
  const d = R.datos;

  // Días con algo anotado: desde el primer registro del período hasta hoy.
  let primera = hoy;
  Object.keys(d.tomas).forEach((id) => { if (d.tomas[id].fecha < primera) primera = d.tomas[id].fecha; });
  d.mediciones.forEach((m) => { if (m.fecha < primera) primera = m.fecha; });
  Object.keys(d.planes).forEach((f) => { if (f < primera) primera = f; });
  const dias = []; for (let x = deClave(primera); claveFecha(x) <= hoy; x = sumarDias(x, 1)) dias.push(claveFecha(x));
  const ini = deClave(primera).getTime(), fin = sumarDias(estado.ahora, 1).getTime();
  const hayAlgo = d.mediciones.length || Object.keys(d.tomas).length;

  // Remedios y comidas por día
  let dados = 0, total = 0; const cuenta = { todo: 0, parte: 0, nada: 0, sin: 0 }, ahoraHM = hhmm(estado.ahora);
  const barras = dias.slice(-30).map((f) => {
    const r = resumenRemedios(f, d); dados += r.dados; total += r.total;
    const alto = r.total ? Math.max(8, Math.round((r.dados / r.total) * 100)) : 8;
    const cls = !r.total ? 'nada' : r.dados === r.total ? 'ok' : r.dados ? 'parcial' : 'cero';
    return `<span class="barra-dia ${cls}" style="height:${alto}%" title="${fechaCorta(deClave(f))}: ${r.dados} de ${r.total}"></span>`;
  }).join('');
  dias.forEach((f) => itemsDelDia(f, d).filter((i) => i.tipo === 'comida').forEach((i) => {
    const reg = d.tomas[i.id]; if (reg) cuenta[reg.comio] = (cuenta[reg.comio] || 0) + 1; else if (f < hoy || i.hora <= ahoraHM) cuenta.sin++;
  }));
  const totalCom = cuenta.todo + cuenta.parte + cuenta.nada + cuenta.sin;
  const tramo = (k, cls) => (cuenta[k] ? `<span class="tramo ${cls}" style="flex:${cuenta[k]}"></span>` : '');

  // Lo más reciente
  const eventos = [];
  Object.keys(d.tomas).forEach((id) => { const t = d.tomas[id]; eventos.push(t.clase === 'comida'
    ? { ts: t.ts, ic: 'comida', icono: 'food', tit: `${mayus(t.comida)}: ${(COMIO[t.comio] || '').toLowerCase()}`, quien: t.quien }
    : { ts: t.ts, ic: '', icono: 'pill', tit: t.nombre, quien: t.quien }); });
  d.mediciones.forEach((m) => eventos.push({ ts: m.ts, ic: 'medir', icono: TIPOS[m.tipo].icono, tit: `${TIPOS[m.tipo].nombre} ${valorTexto(m)}`, quien: m.quien, c: clasificar(m, estado.config.rangos) }));
  eventos.sort((a, b) => b.ts - a.ts);
  const reciente = eventos.slice(0, 8).map((e) => `<div class="evento"><span class="ic ${e.ic}">${ico(e.icono)}</span><div class="txt"><p class="tit">${esc(e.tit)}${e.c && e.c !== 'verde' ? ` <span class="estado ${e.c} en-linea">${ETIQUETA[e.c]}</span>` : ''}</p><p class="sub">${fechaCorta(new Date(e.ts))} ${hhmm(new Date(e.ts))} · ${esc(e.quien || '')}</p></div></div>`).join('');

  return `<div class="envoltura resumen">
    ${selector}
    <div class="panel portada"><p class="grande-num">${dias.length}</p><div><p class="h3">${dias.length === 1 ? 'día anotado' : 'días anotados'}</p>
      <p class="sub">${hayAlgo ? `Desde el ${fechaLarga(deClave(primera)).toLowerCase()}` : 'El resumen se arma solo a medida que anoten.'}</p></div>
      <a class="btn sec auto no-imprimir" href="#resumen/reporte">${ico('download')}Reporte en PDF</a></div>
    <div class="rejilla-resumen">
      <div class="panel"><div class="cabeza"><span class="ic">${ico('pill')}</span><p class="h3">Remedios</p></div>
        ${total ? `<div class="ultimo">${anillo(dados, total)}<div><p class="tit">${Math.round((dados / total) * 100)}% con registro</p><p class="sub">${dados} de ${total} tomas anotadas</p></div></div>
          <div class="barras">${barras}</div><p class="nota">Cada barra es un día. Verde: todo anotado. Ámbar: una parte. Gris: sin registro.</p>` : '<p class="vacio-txt">Aún no hay remedios en el plan.</p>'}</div>
      <div class="panel"><div class="cabeza"><span class="ic comida">${ico('food')}</span><p class="h3">Comidas</p></div>
        ${totalCom ? `<div class="tramos">${tramo('todo', 'ok')}${tramo('parte', 'amb')}${tramo('nada', 'rojo')}${tramo('sin', 'sin')}</div>
          <div class="datos-mini"><div class="dato-mini"><span class="k">Todo</span><span class="v">${cuenta.todo}</span></div><div class="dato-mini"><span class="k">Una parte</span><span class="v">${cuenta.parte}</span></div><div class="dato-mini"><span class="k">Nada</span><span class="v">${cuenta.nada}</span></div><div class="dato-mini"><span class="k">Sin registro</span><span class="v">${cuenta.sin}</span></div></div>` : '<p class="vacio-txt">Aún no hay comidas anotadas.</p>'}</div>
      ${ORDEN_TIPOS.map((t) => tarjetaTipo(t, d, ini, fin)).join('')}
      <div class="panel ancha"><div class="cabeza"><span class="ic vacio">${ico('clock')}</span><p class="h3">Lo más reciente</p></div>${reciente || '<p class="vacio-txt">Todavía no hay registros.</p>'}</div>
    </div>
    <p class="nota">Son cuentas de lo anotado, según los rangos configurados${estado.config.rangos.provisorio ? ' (provisorios)' : ''}. Sin registro no significa que no ocurrió. Valen primero las indicaciones de su médico.</p>
  </div>`;
}

// ---------- Reporte para PDF ----------
function cargarReporte() {
  const rep = R.rep, f = deClave(rep.fecha);
  const desde = rep.modo === 'dia' ? rep.fecha : claveFecha(lunesDe(f)), hasta = rep.modo === 'dia' ? rep.fecha : claveFecha(sumarDias(lunesDe(f), 6));
  rep.cargando = true;
  db.traerRango(desde, hasta).then((d) => { rep.datos = d; rep.clave = rep.modo + rep.fecha; rep.cargando = false; pintar(); })
    .catch(() => { rep.cargando = false; rep.datos = null; rep.clave = rep.modo + rep.fecha; pintar(); });
}
const tabla = (cab, filas) => `<table class="tabla"><thead><tr>${cab.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${filas.length ? filas.map((f) => `<tr>${f.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${cab.length}" class="sin">Sin registros.</td></tr>`}</tbody></table>`;
const sinReg = '<span class="sin">Sin registro</span>', aunNo = '<span class="sin">Aún no corresponde</span>';
const estadoTxt = (m) => { const c = clasificar(m, estado.config.rangos); return `<span class="estado ${c} en-linea">${ETIQUETA[c]}</span>`; };

function seccionesDia(f, d) {
  const items = itemsDelDia(f, d), meds = items.filter((i) => i.tipo === 'med'), comidas = items.filter((i) => i.tipo === 'comida');
  const ms = d.mediciones.filter((m) => m.fecha === f).sort((a, b) => a.ts - b.ts);
  const conReg = meds.filter((i) => d.tomas[i.id]).length, comReg = comidas.filter((i) => d.tomas[i.id]).length;
  const hoy = claveFecha(estado.ahora), ahoraHM = hhmm(estado.ahora), falta = (i) => (f > hoy || (f === hoy && i.hora > ahoraHM) ? aunNo : sinReg);
  return `<div class="cifras"><div><b>${conReg} de ${meds.length}</b><span>tomas con registro</span></div><div><b>${ms.length}</b><span>${ms.length === 1 ? 'medición' : 'mediciones'}</span></div><div><b>${comReg} de ${comidas.length}</b><span>comidas con registro</span></div></div>
    <h3>Remedios</h3>${tabla(['Hora', 'Remedio', 'Dosis', 'Registro'], meds.map((i) => { const t = d.tomas[i.id]; return [i.hora, esc(i.r.nombre), esc(i.r.dosis || '—'), t ? `Dado a las ${hhmm(new Date(t.ts))} · ${esc(t.quien)}${t.corregido ? ' (hora corregida)' : ''}` : falta(i)]; }))}
    <h3>Mediciones</h3>${tabla(['Hora', 'Medición', 'Valor', 'Según rangos', 'Anotó', 'Nota'], ms.map((m) => [hhmm(new Date(m.ts)), TIPOS[m.tipo].nombre + (detalleMomento(m) ? ` (${detalleMomento(m)})` : ''), `<b>${valorTexto(m)}</b>${TIPOS[m.tipo].unidad && m.tipo !== 'oxigeno' ? ' ' + TIPOS[m.tipo].unidad : ''}`, estadoTxt(m), esc(m.quien), esc([m.animo ? `Se siente ${m.animo.toLowerCase()}` : '', m.nota || '', m.despues ? 'Anotado después' : ''].filter(Boolean).join('. ') || '—')]))}
    <h3>Comidas</h3>${tabla(['Hora', 'Comida', 'Previsto', 'Porción indicada', 'Lo que comió'], comidas.map((i) => { const t = d.tomas[i.id]; return [i.hora, i.nombre, esc(i.texto || '—'), esc(i.porciones ? i.porciones.split('\n').join('; ') : 'Pendiente de indicar'), t ? `${COMIO[t.comio] || 'Anotado'}${t.nota ? ` · ${esc(t.nota)}` : ''} · ${esc(t.quien)}` : falta(i)]; }))}`;
}

function seccionesSemana(lunes, d) {
  const hoy = claveFecha(estado.ahora), ini = lunes.getTime(), fin = sumarDias(lunes, 7).getTime();
  const dias = []; for (let i = 0; i < 7; i++) dias.push(claveFecha(sumarDias(lunes, i)));
  const celdaTipo = (f, t) => d.mediciones.filter((m) => m.fecha === f && m.tipo === t).sort((a, b) => a.ts - b.ts).map((m) => `${hhmm(new Date(m.ts))} <b>${valorTexto(m)}</b>`).join('<br>') || '—';
  const filas = dias.map((f) => {
    if (f > hoy) return [fechaCorta(deClave(f)), '<span class="sin">Aún no llega</span>', '', '', '', '', ''];
    const r = resumenRemedios(f, d), com = itemsDelDia(f, d).filter((i) => i.tipo === 'comida');
    const c = { todo: 0, parte: 0, nada: 0 }; com.forEach((i) => { const t = d.tomas[i.id]; if (t) c[t.comio]++; });
    const vienen = f === hoy ? com.filter((i) => !d.tomas[i.id] && i.hora > hhmm(estado.ahora)).length : 0;
    return [`<b>${fechaCorta(deClave(f))}</b>`, r.total ? `${r.dados} de ${r.total}` : '—', celdaTipo(f, 'presion'), celdaTipo(f, 'pulso'), celdaTipo(f, 'azucar'), celdaTipo(f, 'oxigeno'), com.length ? `Todo ${c.todo} · Parte ${c.parte} · Nada ${c.nada} · Sin registro ${com.length - c.todo - c.parte - c.nada - vienen}${vienen ? ` · Por venir ${vienen}` : ''}` : '—'];
  });
  const fuera = d.mediciones.filter((m) => clasificar(m, estado.config.rangos) !== 'verde').sort((a, b) => a.ts - b.ts);
  const sinToma = []; dias.filter((f) => f <= hoy).forEach((f) => itemsDelDia(f, d).filter((i) => i.tipo === 'med' && !d.tomas[i.id] && (f < hoy || i.hora <= hhmm(estado.ahora))).forEach((i) => sinToma.push([fechaCorta(deClave(f)), i.hora, esc(i.r.nombre), esc(i.r.dosis || '—')])));
  const notas = d.mediciones.filter((m) => m.nota || m.animo === 'Mal' || m.animo === 'Regular').sort((a, b) => a.ts - b.ts);
  return `<h3>Resumen por día</h3>${tabla(['Día', 'Remedios', 'Presión', 'Pulso', 'Azúcar', 'Oxígeno', 'Comidas'], filas)}
    <h3>Gráficos de la semana</h3><div class="graficos">${ORDEN_TIPOS.map((t) => `<div class="t-${t}"><p class="rotulo">${TIPOS[t].nombre}${TIPOS[t].unidad ? ' (' + TIPOS[t].unidad + ')' : ''}</p>${graficoRango(t, d.mediciones.filter((m) => m.tipo === t), ini, fin)}</div>`).join('')}</div>
    <p class="nota">Puntos verdes: dentro del rango configurado. Ámbar: para revisar. Rojo: fuera de lo normal. En presión, la línea gruesa es la de arriba.</p>
    <h3>Valores para revisar o fuera de lo normal</h3>${tabla(['Día', 'Hora', 'Medición', 'Valor', 'Según rangos'], fuera.map((m) => [fechaCorta(deClave(m.fecha)), hhmm(new Date(m.ts)), TIPOS[m.tipo].nombre + (detalleMomento(m) ? ` (${detalleMomento(m)})` : ''), `<b>${valorTexto(m)}</b>`, estadoTxt(m)]))}
    <h3>Tomas sin registro</h3>${tabla(['Día', 'Hora', 'Remedio', 'Dosis'], sinToma)}
    <h3>Notas y cómo se sintió</h3>${tabla(['Día', 'Hora', 'Medición', 'Nota'], notas.map((m) => [fechaCorta(deClave(m.fecha)), hhmm(new Date(m.ts)), `${TIPOS[m.tipo].nombre} ${valorTexto(m)}`, esc([m.animo ? `Se siente ${m.animo.toLowerCase()}` : '', m.nota || ''].filter(Boolean).join('. '))]))}`;
}

function reporte() {
  const rep = R.rep, hoy = claveFecha(estado.ahora);
  if (!rep.fecha) rep.fecha = hoy;
  if (rep.clave !== rep.modo + rep.fecha && !rep.cargando) setTimeout(cargarReporte, 0);
  const f = deClave(rep.fecha), lunes = lunesDe(f), domingo = sumarDias(lunes, 6), e = estado.config.emergencia;
  const controles = `<div class="no-imprimir controles">
    <a class="btn quieto izq" href="#resumen">${ico('left')}Volver al resumen</a>
    <div class="opciones">${[['dia', 'Un día'], ['semana', 'Una semana']].map(([v, n]) => `<button class="opcion${rep.modo === v ? ' sel' : ''}" data-a="modoReporte" data-v="${v}">${n}</button>`).join('')}</div>
    <div class="agregar"><input class="texto" id="rep-fecha" type="date" value="${rep.fecha}" max="${hoy}" data-c="fechaReporte" aria-label="Fecha del reporte"><button class="btn pri auto" data-a="imprimir">${ico('download')}Guardar como PDF</button></div>
    <p class="nota">Se abre la ventana de imprimir: elige "Guardar como PDF". El archivo queda en tu computador o celular; no se envía a nadie.</p></div>`;
  if (!rep.datos || rep.clave !== rep.modo + rep.fecha) return `<div class="envoltura reporte">${controles}<p class="vacio-txt">${rep.cargando ? 'Armando el reporte…' : 'No se pudo armar el reporte. Revisa la señal.'}</p></div>`;
  const parcial = rep.modo === 'semana' && claveFecha(domingo) >= hoy;
  const titulo = rep.modo === 'dia' ? `Reporte del día: ${fechaLarga(f).toLowerCase()} de ${f.getFullYear()}`
    : `Reporte semanal: del lunes ${lunes.getDate()} de ${MESES[lunes.getMonth()]} al domingo ${domingo.getDate()} de ${MESES[domingo.getMonth()]} de ${domingo.getFullYear()}`;
  return `<div class="envoltura reporte">${controles}
    <div class="hoja">
      <div class="hoja-cab"><p class="marca">El cuaderno de Juan</p><h2>${titulo}</h2>
        <p class="sub">${esc(e.nombre)}${e.edad ? ', ' + esc(e.edad) : ''} · Generado el ${fechaLarga(estado.ahora).toLowerCase()} a las ${hhmm(estado.ahora)} por ${esc(estado.quien)}</p></div>
      ${parcial ? `<p class="aviso-parcial">${ico('alert')}Reporte parcial: la semana termina el domingo ${domingo.getDate()} de ${MESES[domingo.getMonth()]}.</p>` : ''}
      ${rep.modo === 'dia' ? seccionesDia(rep.fecha, rep.datos) : seccionesSemana(lunes, rep.datos)}
      <p class="pie">Registros anotados por la familia en la casa. "Sin registro" significa que no quedó anotado, no que no ocurrió. Los colores usan los rangos configurados en la app${estado.config.rangos.provisorio ? ', que son provisorios' : ''}. Este reporte no reemplaza la evaluación médica.</p>
    </div></div>`;
}

export function render(args) { return args[0] === 'reporte' ? reporte() : panel(); }
export const titulo = (args) => (args[0] === 'reporte' ? 'Reporte' : 'Resumen');

acciones.periodoResumen = (d) => { R.periodo = d.v; R.error = ''; pintar(); };
acciones.recargarResumen = () => { R.error = ''; R.clave = ''; pintar(); };
acciones.modoReporte = (d) => { R.rep.modo = d.v; pintar(); };
acciones.fechaReporte = () => { const v = val('rep-fecha'); if (/^\d{4}-\d\d-\d\d$/.test(v) && v <= claveFecha(estado.ahora)) { R.rep.fecha = v; pintar(); } };
acciones.imprimir = () => window.print();
// Al volver a entrar se vuelve a traer, para mostrar lo más reciente.
export function alEntrar() { R.clave = ''; R.rep.clave = ''; }
