// Presentación acotada de coincidencias del catálogo. No califica una comida como autorizada.
import { esc, ico } from '../util.js';
import { FUENTES_ALIMENTOS } from '../alimentos.js';

export function resultadoConsulta(b, porciones) {
  if (!b.consulta || b.consulta.texto !== String(b.nota || '').trim()) return '';
  const r = b.consulta.resultado, hay = r.encontrados.length > 0;
  return `<div class="consulta-comida" role="status" data-k="consulta-${b.k}">
    <p class="tit">${ico('info')}${hay ? 'Coincidencias para confirmar' : 'No encontré esa comida'}</p>
    ${hay ? `<p class="sub">${r.encontrados.map((f) => esc(f.nombre)).join(' · ')}</p>` : '<p class="sub">Prueba con los ingredientes, separados por comas.</p>'}
    ${r.excluidos.length ? `<p class="nota">Leí «sin»: ${r.excluidos.map((f) => esc(f.nombre)).join(', ')}.</p>` : ''}
    ${hay && r.desconocidos.length ? `<p class="nota">Sin reconocer: ${r.desconocidos.map(esc).join(', ')}. Completa o corrige los ingredientes.</p>` : ''}
    ${hay ? `<p class="rotulo">Qué revisar${r.parcial ? ' · consulta parcial' : ''}</p><ul>${r.consejos.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      <p class="nota">${porciones ? 'La porción anotada está en «Ver menú orientativo y porción».' : 'Falta la porción indicada para esta comida.'} Esta consulta no predice la glicemia ni confirma compatibilidad personal.</p>` : ''}
    <a class="btn sec" href="#comidas/consulta">Revisar cantidades y pauta</a>
    <details class="comida-menu"><summary>Alcance y fuentes</summary><p class="nota">Guía local de alimentos habituales. Sin cálculo de nutrientes ni recetas completas. CDC y AHA · revisión: 14 nov 2026.</p>
      ${FUENTES_ALIMENTOS.map((f) => `<p><a class="enlace" href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.nombre)}</a></p>`).join('')}</details>
  </div>`;
}
