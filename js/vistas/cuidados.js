// Indicaciones personales cargadas por la familia; sin prescripciones precargadas.
import { estado, acciones, esAdmin, aviso } from '../nucleo.js';
import { esc, ico, val, fechaCorta } from '../util.js';
import * as db from '../db.js';

export const tituloCuidados = 'Actividades y cuidados';
const CAMPOS = [['puede', 'Actividades autorizadas'], ['evitar', 'Qué evitar por ahora'], ['limites', 'Límites y cuidados'], ['preguntas', 'Preguntas para el próximo control']];
const lista = (texto) => String(texto || '').split('\n').map((x) => x.trim()).filter(Boolean).map((x) => `<li>${esc(x)}</li>`).join('');
export function cuidados(modo) {
  const c = estado.config.cuidados || {}, editar = modo === 'editar' && esAdmin();
  const volver = `<a class="btn quieto izq" href="#agenda${editar ? '/cuidados' : ''}">${ico('left')}Volver</a>`;
  if (editar) return `<div class="envoltura">${volver}<p class="sub grande">Copia lo que indicó el equipo de salud. Escribe una actividad por línea; lo que no esté confirmado puede quedar vacío.</p>
    ${CAMPOS.map(([k,n]) => `<div class="campo"><label for="cuidado-${k}">${n}</label><textarea class="texto" id="cuidado-${k}" rows="4" maxlength="2000">${esc(c[k] || '')}</textarea></div>`).join('')}
    <div class="campo"><label for="cuidado-fuente">De dónde sale la indicación</label><input class="texto" id="cuidado-fuente" maxlength="200" value="${esc(c.fuente || '')}" placeholder="Profesional, documento o control"></div>
    <div class="campo"><label for="cuidado-fecha">Fecha de la indicación</label><input class="texto" id="cuidado-fecha" type="date" value="${esc(c.fecha || '')}"></div>
    <button class="btn pri" data-a="guardarCuidados">${ico('check')}Guardar indicaciones</button></div>`;
  return `<div class="envoltura">${volver}
    <div class="panel cuidado"><h2 class="h3">El día a día, según sus indicaciones</h2><p class="sub">Aquí la familia comparte lo que indicó el equipo de salud sobre esfuerzo, peso, calor, jardín y otras actividades.</p></div>
    ${!c.puede && !c.evitar && !c.limites ? '<p class="nota aviso-ej">Todavía no hay indicaciones personales cargadas. Esta pantalla no autoriza actividades ni esfuerzos.</p>' : ''}
    <div class="cuidados-lista">${CAMPOS.map(([k,n]) => `<div class="panel"><h2 class="h3">${n}</h2>${c[k] ? `<ul>${lista(c[k])}</ul>` : '<p class="sub">Pendiente de anotar.</p>'}</div>`).join('')}</div>
    ${c.fuente ? `<p class="nota">Fuente: ${esc(c.fuente)}${c.fecha ? ' · ' + esc(c.fecha) : ''}</p>` : ''}
    ${c.editado ? `<p class="nota">Anotó ${esc(c.editado.quien)} · ${fechaCorta(new Date(c.editado.ts))}</p>` : ''}
    ${esAdmin() ? `<a class="btn pri" href="#agenda/cuidados/editar">${ico('edit')}Editar indicaciones</a>` : '<p class="nota">Fabián puede cargar las indicaciones desde su perfil.</p>'}
    <a class="btn sec" href="#comidas/guia/colaciones">${ico('apple')}Ideas para colaciones</a></div>`;
}
acciones.guardarCuidados = () => {
  if (!esAdmin()) return;
  const c = {};
  CAMPOS.forEach(([k]) => { c[k] = val('cuidado-' + k); });
  c.fuente = val('cuidado-fuente'); c.fecha = val('cuidado-fecha'); c.editado = { quien: estado.quien, ts: Date.now() };
  if ((c.puede || c.evitar || c.limites) && !c.fuente) { aviso('Anota de dónde sale la indicación.'); return; }
  db.guardarConfig({ cuidados: c, editado: c.editado });
  aviso('Indicaciones guardadas'); location.hash = '#agenda/cuidados';
};
