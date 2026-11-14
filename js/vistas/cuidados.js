// ACTIVIDADES Y CUIDADOS: pauta personal del equipo de salud (separada de la explicación educativa general).
// Conserva compatibilidad con config.cuidados (puede, evitar, limites, preguntas, fuente, fecha) y suma tarjetas estructuradas (items).
import { estado, acciones, pintar, esAdmin, esJuan, aviso } from '../nucleo.js';
import { esc, ico, val, porId, idAzar, fechaCorta } from '../util.js';
import * as db from '../db.js';

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

const FUENTES_ACTIVIDAD = [
  {
    org: 'American Heart Association (AHA)',
    tema: 'Plan personal de actividad física y progresión con rehabilitación cardíaca',
    url: 'https://www.heart.org/en/health-topics/cardiac-rehab/getting-physically-active/develop-a-physical-activity-plan-for-you',
    consulta: 'Consultado el 14 de noviembre de 2026',
  },
  {
    org: 'NHS (Reino Unido)',
    tema: 'Recuperación tras un infarto y retorno gradual a las actividades cotidianas',
    url: 'https://www.nhs.uk/conditions/heart-attack/',
    consulta: 'Consultado el 14 de noviembre de 2026',
  },
];

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
  return `<div class="actividad-card" data-k="act-${it.id}">
    <div class="titulo-fila">
      <p class="tit">${esc(it.actividad)}</p>
      <span class="chip ${meta.cls}">${ico(meta.ic)}${meta.txt}</span>
    </div>
    ${it.motivo ? `<p class="sub grande"><b>Motivo:</b> ${esc(it.motivo)}</p>` : ''}
    ${it.limite ? `<p class="sub"><b>Pauta / volver de a poco:</b> ${esc(it.limite)}</p>` : ''}
    <div class="actividad-meta">
      ${it.fuente ? `<span><b>Fuente:</b> ${esc(it.fuente)}</span>` : '<span><b>Fuente:</b> pendiente de indicar</span>'}
      ${it.fecha ? `<span><b>Fecha:</b> ${esc(it.fecha)}</span>` : ''}
      ${it.revision ? `<span class="chip amb">${ico('clock')}Revisión pendiente: ${esc(it.revision)}</span>` : ''}
    </div>
  </div>`;
}

function svgExplicacionActividad() {
  return `<svg class="dibujo-corazon" viewBox="0 0 320 84" role="img" aria-label="Ilustración educativa: diferencia entre retomar caminatas graduales y esfuerzos bruscos o al calor">
    <rect class="dc-caja dc-dest" x="6" y="8" width="146" height="68" rx="14"/>
    <text class="dc-t1" x="79" y="36" text-anchor="middle">Retorno gradual</text>
    <text class="dc-t2" x="79" y="56" text-anchor="middle">Guiado por el equipo</text>
    <rect class="dc-caja" x="168" y="8" width="146" height="68" rx="14"/>
    <text class="dc-t1" x="241" y="36" text-anchor="middle">Esfuerzo o calor</text>
    <text class="dc-t2" x="241" y="56" text-anchor="middle">Requiere consultar</text>
  </svg>`;
}

function bloqueEducacionGeneral() {
  return `<section class="panel" aria-label="Explicación general sobre actividad y recuperación">
    <div class="cabeza"><span class="ic">${ico('info')}</span><div>
      <p class="rotulo">Información educativa general · No es tu pauta individual</p>
      <h2 class="h3">¿Por qué algunas actividades se retoman de a poco y otras requieren revisión?</h2>
    </div></div>
    ${svgExplicacionActividad()}
    <p class="sub grande">Después de un problema cardíaco, el objetivo no es quedarse en reposo indefinido, sino recuperar el movimiento de manera segura y progresiva junto con el equipo tratante.</p>
    <ul class="pasos">
      <li><b>Por qué volver gradualmente:</b> caminar suave y aumentar el tiempo de a poco permite que el corazón y la circulación se adapten sin saltos bruscos de exigencia. Los programas de rehabilitación cardíaca ayudan a planificar ese avance según los exámenes de cada persona.</li>
      <li><b>Por qué ciertos esfuerzos requieren revisión médica previa:</b> agacharse de forma repetida, arrancar malezas haciendo fuerza con los brazos, levantar peso o trabajar al sol y con calor suben la presión arterial y la frecuencia cardíaca mucho más rápido que una caminata tranquila.</li>
      <li><b>Falta de información no es permiso ni prohibición:</b> si una actividad todavía no tiene indicación del médico en este cuaderno, queda en "Lo que falta consultar" para preguntarla en el próximo control.</li>
    </ul>
    <div class="fuentes-caja">
      <p class="rotulo">Fuentes clínicas de esta explicación general</p>
      <ul class="fuentes-lista">
        ${FUENTES_ACTIVIDAD.map((f) => `<li><a class="enlace" href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.org)} — ${esc(f.tema)}</a><span class="sub">${esc(f.consulta)} · Revisión editorial de la fuente; no equivale a indicación clínica personal.</span></li>`).join('')}
      </ul>
    </div>
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

export function cuidados(modo) {
  const c = (estado.config && estado.config.cuidados) || {};
  const editar = modo === 'editar' && esAdmin();
  if (editar) return editorCuidados(c);

  const items = Array.isArray(c.items) ? c.items : [];
  const hayPauta = tienePautaPersonal(c);
  const mapTextoCampo = { autorizado: 'puede', evitar: 'evitar', consultar: 'preguntas' };
  const volver = `<a class="btn quieto izq" href="#${esJuan() ? 'hoy' : 'agenda'}">${ico('left')}${esJuan() ? 'Volver a Hoy' : 'Volver a Agenda'}</a>`;

  return `<div class="envoltura">
    ${volver}
    <div class="panel cuidado">
      <h2 class="h3">${esJuan() ? 'Tus actividades y cuidados personales' : 'El día a día de Juan, según sus indicaciones'}</h2>
      <p class="sub">${esJuan()
        ? 'Aquí ves qué actividades están autorizadas por tu equipo médico, cuáles evitar por ahora y qué dudas llevamos anotadas para el próximo control.'
        : 'Aquí la familia comparte lo que indicó el equipo de salud sobre esfuerzo, peso, calor, patio y otras actividades.'}</p>
    </div>

    ${!hayPauta ? `<div class="panel estado-espera">
      <div class="cabeza"><span class="ic vacio">${ico('clock')}</span><div>
        <p class="tit">Estamos esperando tus indicaciones</p>
        <p class="sub grande">Todavía no hay indicaciones personales cargadas. Que un recuadro esté vacío no significa prohibición ni permiso automático: evita suposiciones hasta anotar lo que indique el equipo médico.</p>
      </div></div>
    </div>` : ''}

    <div class="cuidados-lista">
      ${GRUPOS.map(([est, tituloGrupo, clsChip, iconoGrupo, vacioMsg]) => {
        const deGrupo = items.filter((x) => (x.estado || 'consultar') === est);
        const campoLegacy = mapTextoCampo[est];
        const textoLegacy = c[campoLegacy] || '';
        const textoLimites = est === 'autorizado' && c.limites ? c.limites : '';
        const tieneAlgo = deGrupo.length || textoLegacy || textoLimites;
        return `<section class="panel grupo-cuidado" aria-label="${esc(tituloGrupo)}">
          <div class="titulo-fila">
            <h2 class="h3">${ico(iconoGrupo)}${esc(tituloGrupo)}</h2>
            <span class="chip ${clsChip}">${deGrupo.length + lineas(textoLegacy).length}</span>
          </div>
          ${deGrupo.length ? `<div class="actividades-cards">${deGrupo.map(tarjetaActividadPersonal).join('')}</div>` : ''}
          ${textoLegacy ? `<ul class="lista-cuidado-texto">${listaHtml(textoLegacy)}</ul>` : ''}
          ${textoLimites ? `<div class="bloque"><p class="rotulo">Límites y cómo volver de a poco</p><ul class="lista-cuidado-texto">${listaHtml(textoLimites)}</ul></div>` : ''}
          ${!tieneAlgo ? `<p class="sub">${esc(vacioMsg)}</p>` : ''}
        </section>`;
      }).join('')}
      ${!c.puede && c.limites ? `<section class="panel grupo-cuidado"><h2 class="h3">${ico('info')}Límites y cuidados anotados</h2><ul class="lista-cuidado-texto">${listaHtml(c.limites)}</ul></section>` : ''}
    </div>

    ${c.fuente ? `<p class="nota">Fuente general: <b>${esc(c.fuente)}</b>${c.fecha ? ' · Fecha: ' + esc(c.fecha) : ''}</p>` : ''}
    ${c.editado ? `<p class="nota">Anotó ${esc(c.editado.quien)} · ${fechaCorta(new Date(c.editado.ts))}</p>` : ''}
    ${esAdmin() ? `<a class="btn pri" href="#agenda/cuidados/editar">${ico('edit')}Editar indicaciones</a>` : '<p class="nota">Fabián puede cargar o actualizar las indicaciones personales desde su perfil.</p>'}

    ${bloqueEducacionGeneral()}
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
