// COMIDAS: qué preparar, cuánto servir y qué comió. Compras y guía se abren aparte.
import { estado, acciones, pintar, aviso, esAdmin, paraGuardar } from '../nucleo.js';
import * as db from '../db.js';
import { esc, ico, val, porId, claveFecha, hhmm, DIAS, DIAS_K, mayus } from '../util.js';
import { GUIA, COLACIONES, colacionesDe } from '../datos.js';
import { itemsDelDia, sinSubir } from '../plan.js';
import { SECCIONES_GUIA, GUIA_COMIDAS, PARTES_PLATO, platoGrande } from '../guias.js';

const COMIO = { todo: 'Comió todo', parte: 'Comió una parte', nada: 'No comió' };
const volver = `<a class="btn quieto izq" href="#comidas">${ico('left')}Volver a Comidas</a>`;
const lineas = (t) => String(t || '').split('\n').map((x) => x.trim()).filter(Boolean);

function tarjetaComida(it, ahoraHM) {
  const reg = estado.tomas[it.id], porciones = lineas(it.porciones), u = estado.ui;
  const servir = porciones.length
    ? `<ul class="porciones">${porciones.map((p) => { const partes = p.split(/\s+[—–-]\s+|:\s+/); return `<li><span>${esc(partes[0])}</span>${partes[1] ? `<b>${esc(partes.slice(1).join(' '))}</b>` : ''}</li>`; }).join('')}</ul>`
    : `<span class="chip amb">${ico('clock')}Porción pendiente de indicar</span>`;
  let registro;
  if (reg) {
    registro = `<div class="registro hecho"><span class="ic hecho">${ico('check')}</span><div class="txt"><p class="firma">${COMIO[reg.comio] || 'Anotado'}${reg.otra ? ' (otra comida)' : ''}</p>
      <p class="sub">${esc(reg.quien)} · ${hhmm(new Date(reg.ts))}${reg.nota ? ' · ' + esc(reg.nota) : ''}${sinSubir(reg) ? ' · sin subir' : ''}</p></div>
      <button class="btn quieto auto" data-a="quitarComida" data-id="${it.id}">${ico('undo')}Cambiar</button></div>`;
  } else if (!it.opcional && it.hora > ahoraHM) {
    registro = `<p class="sub">Se anota desde las ${it.hora}.</p>`;
  } else {
    const otra = u.otraComida === it.k;
    registro = `<p class="rotulo">¿Qué comió?</p>
      <div class="opciones">${[['todo', 'Todo'], ['parte', 'Una parte'], ['nada', 'Nada']].map(([v, n]) => `<button class="opcion" data-a="anotarComida" data-id="${it.id}" data-k="${it.k}" data-v="${v}">${n}</button>`).join('')}</div>
      ${otra ? `<input class="texto" id="otra-${it.k}" placeholder="¿Qué comió en vez de esto?" maxlength="100" autocomplete="off">`
             : `<button class="btn quieto" data-a="otraComida" data-k="${it.k}">${ico('edit')}Comió otra cosa</button>`}`;
  }
  return `<div class="panel comida-card" data-k="${it.id}">
    <div class="titulo-fila"><div class="cabeza"><span class="ic comida">${ico(it.icono)}</span><p class="h3">${it.nombre}</p>${it.opcional ? '<span class="chip neutro">Opcional</span>' : ''}</div><span class="chip neutro">${it.hora}</span></div>
    ${it.opcional ? '<p class="nota">Hora orientativa. Si no corresponde, no hace falta registrarla.</p>' : ''}
    <div class="bloque"><p class="rotulo">Qué preparar</p><p class="sub grande">${esc(it.texto)}</p></div>
    <div class="bloque"><p class="rotulo">Cuánto servir</p>${servir}</div>
    <div class="bloque">${registro}</div></div>`;
}

function principal() {
  const c = estado.config, hoy = claveFecha(estado.ahora), ahoraHM = hhmm(estado.ahora);
  const comidas = itemsDelDia(hoy).filter((i) => i.tipo === 'comida');
  const faltan = estado.compras.filter((i) => !i.comprado).length;
  const op = (ruta, icono, t, s) => `<a class="opcion-aj" href="#${ruta}"><span class="ic comida">${ico(icono)}</span><span class="info"><span class="tit">${t}</span><span class="sub">${s}</span></span>${ico('right')}</a>`;
  return `<div class="envoltura">
    <div class="panel cuidado"><p class="h3">La alimentación también es parte del cuidado</p>
      <p class="sub">Una alimentación equilibrada apoya la recuperación y ayuda a manejar la glucosa en la sangre. Sigamos las indicaciones del equipo de salud.</p></div>
    <div class="titulo-fila"><p class="h2">Comidas de hoy</p><span class="chip neutro">${mayus(DIAS[estado.ahora.getDay()])}</span></div>
    ${c.menuEsEjemplo ? `<p class="nota aviso-ej">${ico('info')}Menú de ejemplo: ajustar con la nutricionista.</p>` : ''}
    ${comidas.length ? comidas.map((it) => tarjetaComida(it, ahoraHM)).join('') : '<p class="vacio-txt">No hay menú anotado para hoy.</p>'}
    <div class="lista-aj">
      ${esAdmin() ? op('comidas/colaciones', 'clock', 'Organizar colaciones', 'Opcionales, horarios e indicaciones') : ''}
      ${op('comidas/compras', 'cart', 'Lista de compras', faltan ? `${faltan} por comprar` : 'Nada pendiente')}
      ${op('comidas/guia', 'info', 'Guía de comidas y plato', 'Desayuno, almuerzo, once y colaciones')}
      ${esAdmin() ? op('ajustes/menu', 'edit', 'Editar el menú y las porciones', 'Menú de la semana') : ''}
    </div>
    <p class="nota">Anotar lo que comió describe lo que pasó. No es una calificación.</p>
  </div>`;
}

// Guía por comida. Arriba van los cuatro accesos; el almuerzo trae el plato grande por etapas.
function guia(cual) {
  const sec = GUIA_COMIDAS[cual] ? cual : 'almuerzo', G = GUIA_COMIDAS[sec], u = estado.ui;
  const col = (titulo, cls, icono, lista) => `<div class="col"><h3 class="${cls}">${icono ? ico(icono) : ''}${titulo}</h3><ul>${lista.map((x) => `<li>${x}</li>`).join('')}</ul></div>`;
  const accesos = SECCIONES_GUIA.map(([k, n, icono]) => `<a class="opcion${k === sec ? ' sel' : ''}" href="#comidas/guia/${k}"${k === sec ? ' aria-current="page"' : ''}>${ico(icono)}${n}</a>`).join('');
  // La pauta personal va aparte de las ideas generales, y solo si la nutricionista ya indicó porciones para hoy.
  const pauta = sec === 'colaciones' ? [] : lineas(((estado.config.porciones || {})[DIAS_K[estado.ahora.getDay()]] || {})[sec]);
  const plato = sec !== 'almuerzo' ? '' : `<div class="panel plato-panel" data-k="plato-${u.platoVez || 0}">
      ${platoGrande()}
      <ul class="partes-plato">${PARTES_PLATO.map(([p, cls, t, d]) => `<li class="parte ${p}"><span class="cuadro ${cls}"></span><span><b>${t}</b><span class="sub">${d}</span></span></li>`).join('')}</ul>
      <button class="btn quieto" data-a="verPlato">${ico('undo')}Ver de nuevo</button>
      <p class="nota">Para tomar: agua o una bebida sin azúcar. Es una guía general para el almuerzo; no hay que usar el mismo plato en el desayuno ni en la once.</p></div>`;
  return `<div class="envoltura">${volver}
    <div class="opciones envuelve accesos">${accesos}</div>
    <p class="sub grande">${G.intro}</p>
    ${plato}
    <p class="rotulo">Ideas para ${sec === 'colaciones' ? 'colaciones' : sec === 'once' ? 'la once' : 'el ' + sec}</p>
    <div class="ideas">${G.ideas.map(([t, como, porque]) => `<div class="panel idea"><p class="h3">${t}</p><p class="sub grande">${como}</p><p class="sub">${porque}</p></div>`).join('')}</div>
    ${(G.notas || []).map((n) => `<p class="nota aviso-info">${ico('info')}${n}</p>`).join('')}
    ${sec === 'colaciones' ? '' : `<div class="panel"><p class="rotulo">Cuánto servir</p>${pauta.length
      ? `<ul class="porciones">${pauta.map((x) => `<li><span>${esc(x)}</span></li>`).join('')}</ul><p class="nota">Pauta cargada para hoy.</p>`
      : `<span class="chip amb">${ico('clock')}Porción pendiente de indicar</span><p class="nota">Las porciones las indica la nutricionista. Esta guía no da cantidades.</p>`}</div>`}
    <p class="rotulo">En general</p>
    <div class="guia">${col('Sí', 'ok', 'check', GUIA.si)}${col('Con medida', 'amb', '', GUIA.medida)}${col('Evitar', 'rojo', 'x', GUIA.evitar)}</div>
    <p class="nota">Guía general basada en el método del plato de los CDC. Valen primero las indicaciones de su médico y de la nutricionista.</p>
  </div>`;
}

function compras() {
  const lista = estado.compras.slice().sort((a, b) => (a.comprado === b.comprado ? a.ts - b.ts : a.comprado ? 1 : -1));
  const items = lista.map((i) => `<div class="item${i.comprado ? ' listo' : ''}" data-k="${i.id}" data-a="marcarCompra" data-id="${i.id}" role="button" tabindex="0">
      <span class="caja">${i.comprado ? ico('check') : ''}</span><span class="t">${esc(i.texto)}</span></div>`).join('');
  return `<div class="envoltura">${volver}
    <div class="agregar"><input class="texto" id="compra-nueva" placeholder="Ej: lechuga" maxlength="60" autocomplete="off" enterkeyhint="done" data-enter="agregarCompra" aria-label="Qué hay que comprar">
      <button class="btn pri auto" data-a="agregarCompra">${ico('plus')}Agregar</button></div>
    ${items ? `<div class="lista-compras">${items}</div>` : '<p class="vacio-txt">La lista está vacía.</p>'}
    ${lista.some((i) => i.comprado) ? `<button class="btn quieto" data-a="borrarComprados">${ico('trash')}Borrar comprados</button>` : ''}
  </div>`;
}

export function render(args) { return args[0] === 'colaciones' ? organizarColaciones() : args[0] === 'compras' ? compras() : args[0] === 'guia' ? guia(args[1]) : principal(); }
export const titulo = (args) => (args[0] === 'colaciones' ? 'Colaciones' : args[0] === 'compras' ? 'Compras' : args[0] === 'guia' ? 'Guía' : 'Comidas');

acciones.verPlato = () => { estado.ui.platoVez = (estado.ui.platoVez || 0) + 1; pintar(); };
acciones.otraComida = (d) => { estado.ui.otraComida = d.k; pintar(); const c = porId('otra-' + d.k); if (c) c.focus(); };
acciones.anotarComida = (d) => {
  const hoy = claveFecha(new Date()), it = itemsDelDia(hoy).find((x) => x.id === d.id);
  if (!it || estado.tomas[d.id]) return;
  const campo = porId('otra-' + d.k), nota = campo ? campo.value.trim() : '', ahora = Date.now();
  const reg = { clase: 'comida', fecha: hoy, comida: d.k, previsto: it.texto, comio: d.v, quien: estado.quien, ts: ahora, creado: ahora };
  if (nota) { reg.nota = nota; reg.otra = true; }
  db.poner('tomas', d.id, reg); estado.ui.otraComida = null;
  aviso(`${it.nombre}: ${COMIO[d.v].toLowerCase()}`, () => db.borrar('tomas', d.id));
};
acciones.quitarComida = (d) => {
  const reg = estado.tomas[d.id]; if (!reg) return;
  const copia = paraGuardar(reg);
  db.borrar('tomas', d.id);
  aviso('Registro quitado. Puedes anotarlo de nuevo.', () => db.poner('tomas', d.id, copia));
};
acciones.agregarCompra = () => {
  const campo = porId('compra-nueva'), texto = campo.value.trim();
  if (!texto) { campo.focus(); return; }
  const id = db.nuevoId('compras');
  db.poner('compras', id, { texto, comprado: false, quien: estado.quien, ts: Date.now() });
  campo.value = '';
  aviso(`Agregado: ${texto}`, () => db.borrar('compras', id));
};
acciones.marcarCompra = (d) => {
  const i = estado.compras.find((x) => x.id === d.id); if (!i) return;
  db.cambiar('compras', d.id, { comprado: !i.comprado });
};
acciones.borrarComprados = () => {
  const fuera = estado.compras.filter((i) => i.comprado); if (!fuera.length) return;
  fuera.forEach((i) => db.borrar('compras', i.id));
  aviso(fuera.length === 1 ? 'Se borró 1 producto' : `Se borraron ${fuera.length} productos`, () => fuera.forEach((i) => db.poner('compras', i.id, paraGuardar(i))));
  pintar();
};


function organizarColaciones() {
  if (!esAdmin()) return `<div class="envoltura">${volver}<p>Los horarios los administra Fabián.</p></div>`;
  const c = estado.config.colaciones || {}, sugeridas = colacionesDe(Object.assign({}, estado.config, { colaciones: {} }));
  return `<div class="envoltura">${volver}<p class="sub grande">Son opcionales. Las cantidades y la frecuencia las indica la nutricionista.</p>
    <div class="campo"><label for="col-mostrar">Mostrar en Hoy y Comidas</label><select class="texto" id="col-mostrar"><option value="si"${c.mostrar !== false ? ' selected' : ''}>Sí, como opcionales</option><option value="no"${c.mostrar === false ? ' selected' : ''}>No mostrar</option></select></div>
    ${COLACIONES.map(([k,nombre]) => `<div class="panel"><h2 class="h3">${nombre}</h2>
      <div class="campo"><label for="${k}-hora">Hora orientativa</label><input class="texto" type="time" id="${k}-hora" value="${esc(c[k+'Hora'] || '')}"><p class="nota">Vacío: entre las comidas (${(sugeridas.find((x) => x.k === k) || {}).hora || 'falta horario de comidas'}).</p></div>
      <div class="campo"><label for="${k}-texto">Qué preparar</label><input class="texto" id="${k}-texto" maxlength="250" value="${esc(c[k+'Texto'] || '')}" placeholder="Idea o indicación de la nutricionista"></div>
      <div class="campo"><label for="${k}-porcion">Porción indicada</label><input class="texto" id="${k}-porcion" maxlength="200" value="${esc(c[k+'Porcion'] || '')}" placeholder="Dejar vacío si todavía no la indicó"></div></div>`).join('')}
    <button class="btn pri" data-a="guardarColaciones">${ico('check')}Guardar colaciones</button></div>`;
}
acciones.guardarColaciones = () => {
  if (!esAdmin()) return;
  const c = { mostrar: val('col-mostrar') === 'si' };
  COLACIONES.forEach(([k]) => { c[k+'Hora'] = val(k+'-hora'); c[k+'Texto'] = val(k+'-texto'); c[k+'Porcion'] = val(k+'-porcion'); });
  db.guardarConfig({ colaciones: c, editado: { quien: estado.quien, ts: Date.now() } });
  aviso('Colaciones guardadas'); location.hash = '#comidas';
};
