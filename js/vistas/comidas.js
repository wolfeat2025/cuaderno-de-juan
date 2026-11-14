// COMIDAS: qué preparar, cuánto servir y qué comió. Compras y guía se abren aparte.
import { estado, acciones, pintar, aviso, esAdmin, esJuan, paraGuardar } from '../nucleo.js';
import * as db from '../db.js';
import { esc, ico, val, porId, claveFecha, deClave, hhmm, fechaLarga, DIAS, DIAS_K, mayus } from '../util.js';
import { GUIA, COLACIONES, colacionesDe } from '../datos.js';
import { itemsDelDia, sinSubir } from '../plan.js';
import { SECCIONES_GUIA, GUIA_COMIDAS, PARTES_PLATO, platoGrande, dibujoPlatoCorazon, PASOS_COMIDA_CORAZON, FUENTES_COMIDA_CORAZON } from '../guias.js';

const COMIO = { todo: 'Comió todo', parte: 'Comió una parte', nada: 'No comió' };
const HORA_OK = /^([01]\d|2[0-3]):[0-5]\d$/;
const volver = `<a class="btn quieto izq" href="#comidas">${ico('left')}Volver a Comidas</a>`;
const lineas = (t) => String(t || '').split('\n').map((x) => x.trim()).filter(Boolean);

function borradores() {
  if (!estado.ui.borradoresComida) estado.ui.borradoresComida = {};
  return estado.ui.borradoresComida;
}
function leerBorrador(id, k) {
  const b = borradores()[id]; if (!b) return null;
  const cNota = porId('otra-' + k), cHora = porId('hora-comida-' + k);
  if (cNota) b.nota = cNota.value;
  if (cHora) b.hora = cHora.value.trim();
  return b;
}
function sincronizarBorradoresEnVivo() {
  const bs = estado.ui.borradoresComida; if (!bs) return;
  Object.keys(bs).forEach((id) => { if (bs[id]) leerBorrador(id, bs[id].k); });
}

function editorComida(it, reg, hoy) {
  const b = borradores()[it.id] || { k: it.k, fecha: reg ? reg.fecha : hoy, modo: reg ? 'editar' : 'otra', nota: (reg && reg.nota) || '', comio: (reg && reg.comio) || '', cuando: reg ? 'temprano' : '', hora: reg ? hhmm(new Date(reg.ts)) : '' };
  borradores()[it.id] = b;
  const fechaTxt = `${b.fecha === hoy ? 'Hoy, ' : ''}${fechaLarga(deClave(b.fecha)).toLowerCase()} (${b.fecha})`;
  const esOtra = b.modo === 'otra';
  return `<div class="editor-comida" data-k="ed-${it.id}">
    <p class="rotulo">${ico('edit')}${reg ? 'Corregir registro de comida' : 'Comió otra cosa'}</p>
    <p class="nota">Fecha asociada: <b>${esc(fechaTxt)}</b></p>
    <div class="campo">
      <label for="otra-${it.k}">${esOtra ? '¿Qué comió en vez de lo previsto?' : '¿Qué comió? (opcional si fue el menú del día)'}</label>
      <input class="texto" id="otra-${it.k}" value="${esc(b.nota)}" placeholder="Ej: sopa de pollo con verduras" maxlength="100" autocomplete="off" data-c="actualizarBorradorComida" data-id="${it.id}" data-k="${it.k}">
    </div>
    <div class="grupo">
      <p class="rotulo">¿Cuánto comió?</p>
      <div class="opciones">${[['todo', 'Todo'], ['parte', 'Una parte'], ['nada', 'Nada']].map(([v, n]) => `<button type="button" class="opcion${b.comio === v ? ' sel' : ''}" data-a="elegirCantComida" data-id="${it.id}" data-k="${it.k}" data-v="${v}" aria-pressed="${b.comio === v ? 'true' : 'false'}">${n}</button>`).join('')}</div>
    </div>
    <div class="grupo">
      <p class="rotulo">¿A qué hora fue?</p>
      <div class="opciones">
        <button type="button" class="opcion${b.cuando === 'ahora' ? ' sel' : ''}" data-a="cuandoComida" data-id="${it.id}" data-k="${it.k}" data-v="ahora" aria-pressed="${b.cuando === 'ahora' ? 'true' : 'false'}">Ahora</button>
        <button type="button" class="opcion${b.cuando === 'temprano' ? ' sel' : ''}" data-a="cuandoComida" data-id="${it.id}" data-k="${it.k}" data-v="temprano" aria-pressed="${b.cuando === 'temprano' ? 'true' : 'false'}">Más temprano</button>
      </div>
      ${b.cuando === 'temprano' ? `<div class="campo"><label for="hora-comida-${it.k}">Hora en que comió</label><input class="texto" id="hora-comida-${it.k}" type="time" value="${esc(b.hora)}" data-c="actualizarBorradorComida" data-id="${it.id}" data-k="${it.k}"></div>` : ''}
    </div>
    ${it.k === 'almuerzo' ? `<p class="nota">${ico('info')}Esta es la hora en que comió. Para calcular las 2 horas de la glicemia se usa únicamente la hora confirmada en que empezó a almorzar (se pregunta en Medir).</p>` : ''}
    ${b.error ? `<p class="error" role="alert">${ico('alert')}${esc(b.error)}</p>` : ''}
    <div class="dos">
      <button type="button" class="btn pri" data-a="guardarComidaForm" data-id="${it.id}" data-k="${it.k}">${ico('check')}Guardar comida</button>
      <button type="button" class="btn quieto" data-a="cancelarComidaForm" data-id="${it.id}" data-k="${it.k}">${ico('x')}Cancelar</button>
    </div>
    ${reg ? `<button type="button" class="btn quieto" data-a="quitarComida" data-id="${it.id}">${ico('trash')}Quitar este registro</button>` : ''}
  </div>`;
}

function tarjetaComida(it, ahoraHM, hoy) {
  sincronizarBorradoresEnVivo();
  const reg = estado.tomas[it.id], porciones = lineas(it.porciones), b = borradores()[it.id];
  const servir = porciones.length
    ? `<ul class="porciones">${porciones.map((p) => { const partes = p.split(/\s+[—–-]\s+|:\s+/); return `<li><span>${esc(partes[0])}</span>${partes[1] ? `<b>${esc(partes.slice(1).join(' '))}</b>` : ''}</li>`; }).join('')}</ul>`
    : `<span class="chip amb">${ico('clock')}Porción pendiente de la nutricionista</span>`;
  let registro;
  if (b) {
    registro = editorComida(it, reg, hoy);
  } else if (reg) {
    const hReal = hhmm(new Date(reg.ts)), hIngreso = reg.creado ? hhmm(new Date(reg.creado)) : hReal;
    const traza = [
      `Comió a las ${hReal}`,
      reg.despues && hIngreso !== hReal ? `anotado a las ${hIngreso}` : '',
      reg.corregido ? `corregido${reg.editadoPor ? ' por ' + reg.editadoPor : ''}` : '',
      `anotó ${reg.quien}`,
      sinSubir(reg) ? 'sin subir' : '',
    ].filter(Boolean).map(esc).join(' · ');
    registro = `<div class="registro hecho"><span class="ic hecho">${ico('check')}</span><div class="txt">
        <p class="firma">${COMIO[reg.comio] || 'Anotado'}${reg.otra ? ' · otra comida' : ''}${reg.nota ? ': ' + esc(reg.nota) : ''}</p>
        <p class="sub">${traza}</p></div>
      <div class="acciones-reg">
        <button type="button" class="btn quieto auto" data-a="editarComida" data-id="${it.id}" data-k="${it.k}">${ico('edit')}Corregir</button>
        <button type="button" class="btn quieto auto" data-a="quitarComida" data-id="${it.id}">${ico('undo')}Cambiar</button>
      </div></div>`;
  } else if (!it.opcional && it.hora > ahoraHM) {
    registro = `<p class="sub">Se anota desde las ${it.hora}.</p>
      <button type="button" class="btn quieto" data-a="otraComida" data-id="${it.id}" data-k="${it.k}">${ico('edit')}Comió otra cosa o más temprano</button>`;
  } else {
    registro = `<p class="rotulo">${esJuan() ? '¿Qué comiste?' : '¿Qué comió?'}</p>
      <div class="opciones">${[['todo', 'Todo'], ['parte', 'Una parte'], ['nada', 'Nada']].map(([v, n]) => `<button type="button" class="opcion" data-a="anotarComida" data-id="${it.id}" data-k="${it.k}" data-v="${v}">${n}</button>`).join('')}</div>
      <div class="dos">
        <button type="button" class="btn quieto" data-a="otraComida" data-id="${it.id}" data-k="${it.k}">${ico('edit')}Comió otra cosa</button>
        <button type="button" class="btn quieto" data-a="editarComida" data-id="${it.id}" data-k="${it.k}">${ico('clock')}Fue más temprano</button>
      </div>`;
  }
  return `<div class="panel comida-card" data-k="${it.id}">
    <div class="titulo-fila"><div class="cabeza"><span class="ic comida">${ico(it.icono)}</span><p class="h3">${it.nombre}</p>${it.opcional ? '<span class="chip neutro">Opcional</span>' : ''}</div><span class="chip neutro">${it.hora}</span></div>
    ${it.opcional ? '<p class="nota">Hora orientativa. Si no corresponde, no hace falta registrarla.</p>' : ''}
    <div class="bloque"><p class="rotulo">Qué preparar</p><p class="sub grande">${esc(it.texto)}</p></div>
    <div class="bloque"><p class="rotulo">Cuánto servir</p>${servir}</div>
    <div class="bloque">${registro}</div></div>`;
}

function bloqueCuidadoComidas() {
  const u = estado.ui, abierto = !!u.porQueComida;
  return `<div class="panel cuidado comida-encabezado" data-k="comida-cab-${u.comidaAnimVez || 0}">
    <div class="comida-hero">
      ${dibujoPlatoCorazon()}
      <div class="comida-hero-txt">
        <p class="h3">Comer bien también cuida tu corazón.</p>
        <p class="sub">Ilustración educativa general. Las porciones personales dependen de la nutricionista.</p>
      </div>
    </div>
    <div class="comida-hero-acc">
      <button type="button" class="btn sec auto" data-a="alternarPorQueComida" aria-expanded="${abierto ? 'true' : 'false'}">${ico(abierto ? 'down' : 'info')}${abierto ? 'Ocultar explicación' : '¿Por qué importa?'}</button>
      ${abierto ? `<button type="button" class="btn quieto auto" data-a="repetirAnimComida">${ico('undo')}Ver de nuevo</button>` : ''}
    </div>
    ${abierto ? `<div class="comida-explica" data-k="exp-${u.comidaAnimVez || 0}">
      <div class="pasos-visuales">
        ${PASOS_COMIDA_CORAZON.map(([t, d], i) => `<div class="paso-visual pv-${i + 1}"><span class="num-paso">${i + 1}</span><div><p class="tit">${esc(t)}</p><p class="sub">${esc(d)}</p></div></div>`).join('')}
      </div>
      <p class="nota aviso-info">${ico('info')}<span><b>Importante:</b> Una comida saludable no limpia las arterias de inmediato ni repara por sí sola una lesión del corazón, y el azúcar no se convierte directamente en grasa dentro del corazón. Es un hábito diario que acompaña a los remedios y controles médicos.</span></p>
      <div class="fuentes-caja">
        <p class="rotulo">Fuentes médicas generales</p>
        <ul class="fuentes-lista">
          ${FUENTES_COMIDA_CORAZON.map((f) => `<li><a class="enlace" href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.org)} — ${esc(f.tema)}</a><span class="sub">${esc(f.consulta)} · Material educativo general (no equivale a revisión clínica individual).</span></li>`).join('')}
        </ul>
      </div>
    </div>` : ''}
  </div>`;
}

function principal() {
  const c = estado.config, hoy = claveFecha(estado.ahora), ahoraHM = hhmm(estado.ahora);
  const comidas = itemsDelDia(hoy).filter((i) => i.tipo === 'comida');
  const faltan = estado.compras.filter((i) => !i.comprado).length;
  const op = (ruta, icono, t, s) => `<a class="opcion-aj" href="#${ruta}"><span class="ic comida">${ico(icono)}</span><span class="info"><span class="tit">${t}</span><span class="sub">${s}</span></span>${ico('right')}</a>`;
  return `<div class="envoltura">
    ${bloqueCuidadoComidas()}
    <div class="titulo-fila"><p class="h2">Comidas de hoy</p><span class="chip neutro">${mayus(DIAS[estado.ahora.getDay()])}</span></div>
    ${c.menuEsEjemplo ? `<p class="nota aviso-ej">${ico('info')}Menú de ejemplo: ajustar con la nutricionista.</p>` : ''}
    ${comidas.length ? comidas.map((it) => tarjetaComida(it, ahoraHM, hoy)).join('') : '<p class="vacio-txt">No hay menú anotado para hoy.</p>'}
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
acciones.alternarPorQueComida = () => { sincronizarBorradoresEnVivo(); estado.ui.porQueComida = !estado.ui.porQueComida; if (estado.ui.porQueComida) estado.ui.comidaAnimVez = (estado.ui.comidaAnimVez || 0) + 1; pintar(); };
acciones.repetirAnimComida = () => { sincronizarBorradoresEnVivo(); estado.ui.comidaAnimVez = (estado.ui.comidaAnimVez || 0) + 1; pintar(); };

function abrirEditorComida(d, modo) {
  sincronizarBorradoresEnVivo();
  const hoy = claveFecha(estado.ahora), id = d.id || `${hoy}_comida_${d.k}`, reg = estado.tomas[id];
  borradores()[id] = {
    k: d.k,
    fecha: reg ? reg.fecha : hoy,
    modo,
    nota: (reg && reg.nota) || '',
    comio: (reg && reg.comio) || '',
    cuando: reg ? 'temprano' : (modo === 'editar' ? 'temprano' : ''),
    hora: reg ? hhmm(new Date(reg.ts)) : '',
    error: '',
  };
  pintar();
  const c = porId(modo === 'otra' ? 'otra-' + d.k : 'hora-comida-' + d.k) || porId('otra-' + d.k);
  if (c) c.focus();
}
acciones.otraComida = (d) => abrirEditorComida(d, 'otra');
acciones.editarComida = (d) => abrirEditorComida(d, 'editar');
acciones.actualizarBorradorComida = (d) => { leerBorrador(d.id, d.k); };
acciones.elegirCantComida = (d) => { const b = leerBorrador(d.id, d.k); if (!b) return; b.comio = d.v; b.error = ''; pintar(); };
acciones.cuandoComida = (d) => {
  const b = leerBorrador(d.id, d.k); if (!b) return;
  b.cuando = d.v; b.error = '';
  pintar();
  if (d.v === 'temprano') { const c = porId('hora-comida-' + d.k); if (c) c.focus(); }
};
acciones.cancelarComidaForm = (d) => { delete borradores()[d.id]; pintar(); };
acciones.guardarComidaForm = (d) => {
  const b = leerBorrador(d.id, d.k); if (!b) return;
  const hoy = claveFecha(new Date()), it = itemsDelDia(b.fecha || hoy).find((x) => x.id === d.id) || { id: d.id, k: d.k, nombre: d.k, texto: '' };
  const previo = estado.tomas[d.id];
  const nota = String(b.nota || '').trim();
  const falla = (msg, idCampo) => { b.error = msg; pintar(); if (idCampo && porId(idCampo)) porId(idCampo).focus(); };
  if (b.modo === 'otra' && !nota) return falla('Escribe qué comió.', 'otra-' + d.k);
  if (!b.comio || !COMIO[b.comio]) return falla('Elige cuánto comió (Todo, Una parte o Nada).');
  if (b.cuando !== 'ahora' && b.cuando !== 'temprano') return falla('Elige si comió ahora o más temprano.');
  const ahora = Date.now(), fAsociada = b.fecha || hoy;
  if (!/^\d{4}-\d\d-\d\d$/.test(fAsociada) || fAsociada > hoy) return falla('La fecha asociada no es válida.');
  let ts = ahora;
  if (b.cuando === 'temprano') {
    if (!HORA_OK.test(b.hora || '')) return falla('Pon la hora en que comió (formato HH:MM).', 'hora-comida-' + d.k);
    const fechaBase = deClave(fAsociada);
    fechaBase.setHours(Number(b.hora.slice(0, 2)), Number(b.hora.slice(3, 5)), 0, 0);
    if (claveFecha(fechaBase) !== fAsociada) return falla('La hora no coincide con la fecha del registro.', 'hora-comida-' + d.k);
    if (fechaBase.getTime() > ahora + 60000) return falla('Esa hora todavía no llega. Revisa la hora.', 'hora-comida-' + d.k);
    ts = fechaBase.getTime();
  } else if (fAsociada !== hoy) {
    return falla('Para un día anterior, elige "Más temprano" e indica la hora.', 'hora-comida-' + d.k);
  }
  const reg = {
    clase: 'comida',
    fecha: fAsociada,
    comida: d.k,
    previsto: previo ? (previo.previsto || it.texto) : it.texto,
    comio: b.comio,
    quien: previo ? previo.quien : estado.quien,
    ts,
    creado: previo ? (previo.creado || previo.ts) : ahora,
  };
  if (nota) { reg.nota = nota; reg.otra = true; }
  if (!previo && b.cuando === 'temprano') reg.despues = true;
  if (previo) {
    if (previo.despues) reg.despues = true;
    reg.corregido = true;
    reg.editadoPor = estado.quien;
    reg.editadoTs = ahora;
  }
  const copiaPrev = previo ? paraGuardar(previo) : null;
  db.poner('tomas', d.id, reg);
  delete borradores()[d.id];
  aviso(`${it.nombre || 'Comida'}: ${COMIO[b.comio].toLowerCase()} (${hhmm(new Date(ts))})`, () => {
    if (copiaPrev) db.poner('tomas', d.id, copiaPrev);
    else db.borrar('tomas', d.id);
  });
};
acciones.anotarComida = (d) => {
  sincronizarBorradoresEnVivo();
  const hoy = claveFecha(new Date()), it = itemsDelDia(hoy).find((x) => x.id === d.id);
  if (!it || estado.tomas[d.id]) return;
  const ahora = Date.now();
  const reg = { clase: 'comida', fecha: hoy, comida: d.k, previsto: it.texto, comio: d.v, quien: estado.quien, ts: ahora, creado: ahora };
  db.poner('tomas', d.id, reg);
  delete borradores()[d.id];
  aviso(`${it.nombre}: ${COMIO[d.v].toLowerCase()}`, () => db.borrar('tomas', d.id));
};
acciones.quitarComida = (d) => {
  sincronizarBorradoresEnVivo();
  const reg = estado.tomas[d.id]; if (!reg) return;
  const copia = paraGuardar(reg);
  delete borradores()[d.id];
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
