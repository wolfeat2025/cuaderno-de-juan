// ACTIVIDADES Y CUIDADOS: pauta personal del equipo de salud (separada de la explicación educativa general).
// Conserva compatibilidad con config.cuidados (puede, evitar, limites, preguntas, fuente, fecha) y suma tarjetas estructuradas (items).
import { estado, acciones, pintar, esAdmin, esJuan, aviso } from '../nucleo.js';
import { esc, ico, val, porId, idAzar, fechaCorta } from '../util.js';
import * as db from '../db.js';
import { infografia } from '../visuales.js';

export const tituloCuidados = 'Actividades y cuidados';

const CAMPOS = [
  ['puede', 'Lo que tienes autorizado (texto general)'],
  ['evitar', 'Lo que debes evitar por ahora (texto general)'],
  ['limites', 'Límites y pautas para volver de a poco'],
  ['preguntas', 'Lo que falta consultar en el próximo control'],
];

const GRUPOS = [
  ['autorizado', 'Lo que tienes autorizado', 'ok', 'ccheck', 'Todavía no hay actividades autorizadas anotadas. Cuando el médico lo indique, irán aquí con su pauta y fecha.'],
  ['evitar', 'Lo que debes evitar por ahora', 'amb', 'alert', 'Todavía no hay restricciones específicas anotadas. Esto no significa que cualquier esfuerzo esté autorizado; falta cargar la pauta médica.'],
  ['consultar', 'Lo que falta consultar', 'neutro', 'clock', 'Aquí se anotan las actividades (como tareas de patio, caminatas más largas o cargas) que hay que preguntarle al médico en el control.'],
];

const ESTADO_META = {
  autorizado: { txt: 'Autorizado', cls: 'ok', ic: 'ccheck' },
  evitar: { txt: 'Evitar por ahora', cls: 'amb', ic: 'alert' },
  consultar: { txt: 'Falta consultar', cls: 'neutro', ic: 'clock' },
};

const lineas = (texto) => String(texto || '').split('\n').map((x) => x.trim()).filter(Boolean);
const listaHtml = (texto) => lineas(texto).map((x) => `<li>${esc(x)}</li>`).join('');

function tienePautaPersonal(c) {
  const items = Array.isArray(c.items) ? c.items : [];
  return !!(items.length || c.puede || c.evitar || c.limites || c.preguntas);
}

// Tarjeta para la portada de Juan (punto 4: Actividades y cuidados).
export function resumenCuidadosPortada() {
  const c = (estado.config && estado.config.cuidados) || {};
  const items = Array.isArray(c.items) ? c.items : [];
  const aut = items.filter((x) => x.estado === 'autorizado').map((x) => x.actividad).concat(lineas(c.puede));
  const cons = items.filter((x) => x.estado === 'consultar').map((x) => x.actividad).concat(lineas(c.preguntas));
  const evit = items.filter((x) => x.estado === 'evitar').map((x) => x.actividad).concat(lineas(c.evitar));
  if (esJuan()) return `<section class="panel juan-seccion juan-acceso" aria-label="Actividades y cuidados"><div class="cabeza"><span class="ic">${ico('leaf')}</span><div><h2 class="h3">Mis actividades y cuidados</h2><p class="sub">${tienePautaPersonal(c) ? 'Consulta tu pauta antes de avanzar.' : 'Falta cargar tu pauta médica.'}</p></div></div>${evit.length ? `<p class="sub"><b>Evitar por ahora:</b> ${evit.slice(0,2).map(esc).join(' · ')}${evit.length > 2 ? ' · ver todas en la pauta' : ''}</p>` : ''}<a class="btn sec" href="#agenda/cuidados">${ico('leaf')}Ver mis indicaciones</a></section>`;

  if (!tienePautaPersonal(c)) {
    return `<section class="panel juan-seccion" aria-label="Actividades y cuidados">
      <div class="titulo-fila">
        <h2 class="h3">${ico('leaf')}Actividades y cuidados</h2>
        <span class="chip neutro">En espera de pauta</span>
      </div>
      <p class="tit">Estamos esperando tus indicaciones</p>
      <p class="sub grande">Todavía no están cargadas las indicaciones personales de tu médico sobre caminatas, tareas del patio o esfuerzos. No mostramos listas inventadas.</p>
      <a class="btn sec" href="#agenda/cuidados">${ico('info')}Ver cómo se organiza esta sección</a>
    </section>`;
  }

  return `<section class="panel juan-seccion" aria-label="Actividades y cuidados">
    <div class="titulo-fila">
      <h2 class="h3">${ico('leaf')}Actividades y cuidados</h2>
      <a class="mini-btn" href="#agenda/cuidados">Ver detalle${ico('right')}</a>
    </div>
    <div class="juan-cuidados-resumen">
      <div class="juan-cuidado-col">
        <p class="rotulo">${ico('ccheck')}Lo que tienes autorizado</p>
        ${aut.length ? `<ul class="lista-compacta">${aut.slice(0, 3).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="sub">Todavía no está anotado.</p>'}
      </div>
      <div class="juan-cuidado-col">
        <p class="rotulo">${ico('clock')}Lo que falta confirmar o evitar</p>
        ${cons.length || evit.length
          ? `<ul class="lista-compacta">${evit.slice(0, 2).map((x) => `<li><b>Evitar por ahora:</b> ${esc(x)}</li>`).join('')}${cons.slice(0, 2).map((x) => `<li><b>Consultar:</b> ${esc(x)}</li>`).join('')}</ul>`
          : '<p class="sub">Sin elementos pendientes anotados.</p>'}
      </div>
    </div>
    ${c.fuente ? `<p class="nota">Fuente: ${esc(c.fuente)}${c.fecha ? ' · ' + esc(c.fecha) : ''}</p>` : ''}
    <a class="btn sec" href="#agenda/cuidados">${ico('leaf')}Abrir Actividades y cuidados</a>
  </section>`;
}

function tarjetaActividadPersonal(it) {
  const meta = ESTADO_META[it.estado] || ESTADO_META.consultar;
  return `<div class="act-fila ${meta.cls}" data-k="act-${it.id}">
    <span class="act-ic">${ico(meta.ic)}</span>
    <div><p class="tit">${esc(it.actividad)}</p>${it.motivo ? `<p class="sub">${esc(it.motivo)}</p>` : ''}${it.limite ? `<p class="sub act-limite">${ico('up')}${esc(it.limite)}</p>` : ''}</div>
  </div>`;
}

// Visual sin cifras: la recuperación avanza por etapas y cada paso se conversa con el equipo.
const caminante = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="13" cy="4" r="2" fill="currentColor"/><path d="M11 21l2-6 3 3v3M13 15l-1-5-3 3-2 1M12 10l3 2 3 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function deAPoco() {
  const pasos = [[ico('home'), 'En casa', 'Moverse cada hora'], [caminante, 'Un poco más', 'Cada semana'], [ico('heart'), 'Lo de siempre', 'Con el médico']];
  return `<section class="panel de-a-poco" aria-label="Volver de a poco">
    <p class="rotulo">Volver de a poco</p>
    <div class="dap-pasos">${pasos.map(([ic, t, s], i) => `${i ? '<span class="dap-linea"></span>' : ''}<div class="dap-paso dap-${i + 1}"><span class="dap-ic">${ic}</span><p class="tit">${t}</p><p class="sub">${s}</p></div>`).join('')}</div>
  </section>`;
}

function asegurarBorradorItems(c) {
  if (!Array.isArray(estado.ui.cuidadosItems)) {
    estado.ui.cuidadosItems = (Array.isArray(c.items) ? c.items : []).map((x) => Object.assign({}, x));
  }
  return estado.ui.cuidadosItems;
}

function leerItemsDom() {
  const lista = estado.ui.cuidadosItems;
  if (!Array.isArray(lista)) return [];
  lista.forEach((it, i) => {
    if (!porId(`ci-act-${i}`)) return;
    it.actividad = val(`ci-act-${i}`);
    it.estado = val(`ci-est-${i}`) || 'consultar';
    it.motivo = val(`ci-mot-${i}`);
    it.limite = val(`ci-lim-${i}`);
    it.fuente = val(`ci-fue-${i}`);
    it.fecha = val(`ci-fec-${i}`);
    it.revision = val(`ci-rev-${i}`);
  });
  return lista;
}

function editorCuidados(c) {
  const items = asegurarBorradorItems(c);
  const volver = `<a class="btn quieto izq" href="#agenda/cuidados">${ico('left')}Volver</a>`;
  return `<div class="envoltura">${volver}
    <p class="sub grande">Copia únicamente lo que indicó el equipo de salud o anota lo que falta consultar. No inventes permisos ni restricciones.</p>

    <div class="panel">
      <div class="titulo-fila"><h2 class="h3">Tarjetas por actividad</h2><span class="chip neutro">${items.length}</span></div>
      <p class="sub">Cada tarjeta muestra la actividad, su estado (Autorizado, Evitar por ahora o Falta consultar), el motivo en una frase, la pauta o cómo volver de a poco, la fuente y la fecha.</p>
      ${items.map((it, i) => `<div class="actividad-editor" data-k="ed-act-${it.id || i}">
        <div class="titulo-fila"><p class="rotulo">Actividad ${i + 1}</p><button type="button" class="btn quieto auto" data-a="quitarItemCuidado" data-i="${i}">${ico('trash')}Quitar</button></div>
        <div class="dos">
          <div class="campo"><label for="ci-act-${i}">Actividad</label><input class="texto" id="ci-act-${i}" maxlength="100" value="${esc(it.actividad || '')}" placeholder="Ej: Caminar en plano / Patio"></div>
          <div class="campo"><label for="ci-est-${i}">Estado</label><select class="texto" id="ci-est-${i}">
            <option value="autorizado"${it.estado === 'autorizado' ? ' selected' : ''}>Lo que tienes autorizado</option>
            <option value="evitar"${it.estado === 'evitar' ? ' selected' : ''}>Lo que debes evitar por ahora</option>
            <option value="consultar"${(!it.estado || it.estado === 'consultar') ? ' selected' : ''}>Lo que falta consultar</option>
          </select></div>
        </div>
        <div class="campo"><label for="ci-mot-${i}">Motivo en una frase</label><input class="texto" id="ci-mot-${i}" maxlength="180" value="${esc(it.motivo || '')}" placeholder="Por qué está autorizado, se evita o se debe consultar"></div>
        <div class="campo"><label for="ci-lim-${i}">Límite o pauta para volver de a poco (si existe)</label><input class="texto" id="ci-lim-${i}" maxlength="180" value="${esc(it.limite || '')}" placeholder="Dejar vacío si no hay pauta confirmada"></div>
        <div class="dos">
          <div class="campo"><label for="ci-fue-${i}">Fuente de la indicación</label><input class="texto" id="ci-fue-${i}" maxlength="120" value="${esc(it.fuente || '')}" placeholder="Médico, alta o control"></div>
          <div class="campo"><label for="ci-fec-${i}">Fecha de indicación</label><input class="texto" type="date" id="ci-fec-${i}" value="${esc(it.fecha || '')}"></div>
        </div>
        <div class="campo"><label for="ci-rev-${i}">Revisión pendiente (opcional)</label><input class="texto" id="ci-rev-${i}" maxlength="140" value="${esc(it.revision || '')}" placeholder="Ej: Confirmar en próximo control de cardiología"></div>
      </div>`).join('')}
      <button type="button" class="btn sec" data-a="agregarItemCuidado">${ico('plus')}Agregar tarjeta de actividad</button>
      <details class="comida-menu"><summary>${ico('upload')}Pegar varias de una vez</summary>
        <p class="sub">Una por línea: <b>estado | actividad | motivo | cómo avanzar</b>. Estado: puede, evitar o preguntar.</p>
        <textarea class="texto" id="cuidado-pegar" rows="6"></textarea>
        <button type="button" class="btn sec" data-a="pegarItemsCuidado">${ico('plus')}Agregar estas tarjetas</button>
      </details>
    </div>

    <div class="panel">
      <h2 class="h3">Notas y listas generales de la pauta</h2>
      <p class="sub">Escribe una indicación por línea; lo que no esté confirmado puede quedar vacío. Lo que ya estaba cargado se conserva.</p>
      ${CAMPOS.map(([k, n]) => `<div class="campo"><label for="cuidado-${k}">${n}</label><textarea class="texto" id="cuidado-${k}" rows="3" maxlength="2000">${esc(c[k] || '')}</textarea></div>`).join('')}
      <div class="campo"><label for="cuidado-fuente">De dónde sale la indicación general</label><input class="texto" id="cuidado-fuente" maxlength="200" value="${esc(c.fuente || '')}" placeholder="Profesional, documento o control"></div>
      <div class="campo"><label for="cuidado-fecha">Fecha de la indicación general</label><input class="texto" id="cuidado-fecha" type="date" value="${esc(c.fecha || '')}"></div>
    </div>

    <button type="button" class="btn pri" data-a="guardarCuidados">${ico('check')}Guardar indicaciones</button>
  </div>`;
}

function cuidadosVisualesJuan(c) {
  const items = Array.isArray(c.items) ? c.items : [];
  const campos = { autorizado: 'puede', evitar: 'evitar', consultar: 'preguntas' };
  return `<div class="envoltura juan-visual"><a class="btn quieto izq" href="#hoy">${ico('left')}Volver a Hoy</a>
    <h2 class="h2">Mis actividades y cuidados</h2>
    ${!tienePautaPersonal(c) ? '<p class="nota aviso-info">Falta cargar tu pauta médica. Consulta a tu equipo antes de aumentar el esfuerzo.</p>' : ''}
    ${GRUPOS.map(([k,t,cls,icon]) => {
      const grupo=items.filter(x=>(x.estado||'consultar')===k), texto=c[campos[k]];
      return `<details class="panel comida-menu" data-k="juan-cuidados-${k}"${k==='evitar' && (grupo.length||texto)?' open':''}><summary>${ico(icon)}${esc(t)}</summary>${grupo.map(tarjetaActividadPersonal).join('')}${texto?`<ul class="lista-cuidado-texto">${listaHtml(texto)}</ul>`:''}${!grupo.length&&!texto?'<p class="sub">Todavía sin indicaciones anotadas.</p>':''}${k==='autorizado'&&c.limites?`<p class="tit">Límites de la pauta</p><ul class="lista-cuidado-texto">${listaHtml(c.limites)}</ul>`:''}</details>`;
    }).join('')}
    ${c.fuente?`<p class="nota">${esc(c.fuente)}${c.fecha?' · '+esc(c.fecha):''}</p>`:''}
    <a class="btn sec" href="#recuperacion/2">${ico('play')}Volver de a poco (capítulo 2)</a>
  </div>`;
}

export function cuidados(modo) {
  const c = (estado.config && estado.config.cuidados) || {};
  const editar = modo === 'editar' && esAdmin();
  if (editar) return editorCuidados(c);
  if (esJuan()) return cuidadosVisualesJuan(c);

  const items = Array.isArray(c.items) ? c.items : [];
  const hayPauta = tienePautaPersonal(c);
  const mapTextoCampo = { autorizado: 'puede', evitar: 'evitar', consultar: 'preguntas' };
  const NOMBRES = { autorizado: 'Puede hacer', evitar: 'Evitar por ahora', consultar: 'Preguntar al médico' };
  const grupos = GRUPOS.map(([est, , , iconoGrupo]) => {
    const deGrupo = items.filter((x) => (x.estado || 'consultar') === est);
    const extra = lineas(c[mapTextoCampo[est]]).concat(est === 'autorizado' ? lineas(c.limites) : []);
    if (!deGrupo.length && !extra.length) return '';
    return `<section class="panel grupo-cuidado g-${est}" aria-label="${NOMBRES[est]}">
      <h2 class="h3">${ico(iconoGrupo)}${NOMBRES[est]}</h2>
      ${deGrupo.map(tarjetaActividadPersonal).join('')}
      ${extra.length ? `<ul class="lista-cuidado-texto">${extra.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    </section>`;
  }).join('');

  return `<div class="envoltura">
    <a class="btn quieto izq" href="#agenda">${ico('left')}Volver a Agenda</a>
    ${deAPoco()}
    ${hayPauta ? `<div class="cuidados-lista">${grupos}</div>` : '<p class="sub grande">Falta cargar las indicaciones.</p>'}
    ${esAdmin() ? `<a class="btn quieto" href="#agenda/cuidados/editar">${ico('edit')}Editar indicaciones</a>` : ''}
    <a class="btn sec" href="#comidas/guia/colaciones">${ico('apple')}Ideas para colaciones</a>
  </div>`;
}

acciones.agregarItemCuidado = () => {
  if (!esAdmin()) return;
  const c = (estado.config && estado.config.cuidados) || {};
  const lista = asegurarBorradorItems(c);
  leerItemsDom();
  lista.push({ id: 'ac' + idAzar(6), actividad: '', estado: 'consultar', motivo: '', limite: '', fuente: c.fuente || '', fecha: c.fecha || '', revision: '' });
  pintar();
};
acciones.quitarItemCuidado = (d) => {
  if (!esAdmin()) return;
  const c = (estado.config && estado.config.cuidados) || {};
  const lista = asegurarBorradorItems(c);
  leerItemsDom();
  lista.splice(Number(d.i), 1);
  pintar();
};
acciones.guardarCuidados = () => {
  if (!esAdmin()) return;
  const prev = (estado.config && estado.config.cuidados) || {};
  const c = {};
  CAMPOS.forEach(([k]) => { c[k] = val('cuidado-' + k); });
  c.fuente = val('cuidado-fuente');
  c.fecha = val('cuidado-fecha');
  const rawItems = Array.isArray(estado.ui.cuidadosItems) ? leerItemsDom() : (Array.isArray(prev.items) ? prev.items : []);
  const itemsLimpios = rawItems
    .map((x) => ({
      id: x.id || ('ac' + idAzar(6)),
      actividad: String(x.actividad || '').trim(),
      estado: ESTADO_META[x.estado] ? x.estado : 'consultar',
      motivo: String(x.motivo || '').trim(),
      limite: String(x.limite || '').trim(),
      fuente: String(x.fuente || '').trim(),
      fecha: String(x.fecha || '').trim(),
      revision: String(x.revision || '').trim(),
    }))
    .filter((x) => x.actividad);

  // Si se autoriza o restringe algo, exigir fuente respaldada (en la tarjeta o en la fuente general).
  const faltaFuenteItem = itemsLimpios.some((x) => (x.estado === 'autorizado' || x.estado === 'evitar') && !x.fuente && !c.fuente);
  if (((c.puede || c.evitar || c.limites) && !c.fuente) || faltaFuenteItem) {
    aviso('Anota de dónde sale la indicación (profesional, alta o control).');
    return;
  }
  c.items = itemsLimpios;
  c.editado = { quien: estado.quien, ts: Date.now() };
  estado.ui.cuidadosItems = null;
  db.guardarConfig({ cuidados: c, editado: c.editado });
  aviso('Indicaciones guardadas');
  location.hash = '#agenda/cuidados';
};
acciones.pegarItemsCuidado = () => {
  if (!esAdmin()) return;
  const c = (estado.config && estado.config.cuidados) || {};
  const lista = asegurarBorradorItems(c);
  leerItemsDom();
  const EST = { puede: 'autorizado', autorizado: 'autorizado', evitar: 'evitar', preguntar: 'consultar', consultar: 'consultar' };
  let n = 0;
  lineas(val('cuidado-pegar')).forEach((l) => {
    const [e, actividad, motivo, limite] = l.split('|').map((x) => (x || '').trim());
    if (!actividad) return;
    lista.push({ id: 'ac' + idAzar(6), actividad, estado: EST[(e || '').toLowerCase()] || 'consultar', motivo: motivo || '', limite: limite || '', fuente: c.fuente || '', fecha: c.fecha || '', revision: '' });
    n++;
  });
  aviso(n ? `${n} tarjetas agregadas. Revisa y guarda.` : 'No se encontraron líneas válidas.');
  pintar();
};
