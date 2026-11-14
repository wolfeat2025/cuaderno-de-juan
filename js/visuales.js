// Infografías educativas de la app: SVG y CSS nativos, sin dependencias ni ritmo clínico simulado.
import { estado, acciones, pintar } from './nucleo.js';
import { esc, ico } from './util.js';

const TEMAS = {
  corazon: [
    { boton: 'Bombeo', titulo: 'Un corazón que mueve la sangre', dibujo: 'corazon', texto: 'El corazón bombea sangre para llevar oxígeno al cuerpo.', detalle: 'La presión y el pulso son dos pistas. Para saber cómo bombea el músculo y cómo están sus arterias se necesitan los estudios médicos.', fuente: 'nhs' },
    { boton: 'Cuidados', titulo: 'Cada cuidado cumple una función', dibujo: 'cuidados', texto: 'Remedios, controles y hábitos trabajan juntos.', detalle: 'Los remedios se toman según la receta. No cambies dosis por una lectura en verde: los controles ayudan al equipo a ajustar el tratamiento.', fuente: 'nhs' },
    { boton: 'Recuperación', titulo: 'Volver de a poco, acompañado', dibujo: 'camino', texto: 'La recuperación se guía con tu equipo, paso a paso.', detalle: 'No hay una fecha automática para volver a hacer esfuerzos. Tu equipo revisa los estudios, los síntomas y lo que puedes hacer antes de indicar el siguiente paso.', fuente: 'actividad' },
  ],
  actividad: [
    { boton: 'De a poco', titulo: 'Volver a lo cotidiano, paso a paso', dibujo: 'camino', texto: 'El siguiente paso lo marca tu pauta médica.', detalle: 'La rehabilitación cardíaca ayuda a recuperar actividades con un plan adaptado a cada persona. La animación no autoriza caminatas ni esfuerzos.', fuente: 'actividad' },
    { boton: 'Mi pauta', titulo: 'Tu indicación personal va primero', dibujo: 'cuidados', texto: 'Consulta aquí lo autorizado y lo que falta confirmar.', detalle: 'Que una actividad no esté anotada no significa que esté permitida. Los límites de peso, duración o esfuerzo los indica el equipo que te trata.', fuente: 'actividad' },
    { boton: 'Controles', titulo: 'Revisar antes de avanzar', dibujo: 'corazon', texto: 'Cómo te sientes y tus estudios orientan al equipo.', detalle: 'Los valores de casa son registros puntuales. Aunque salgan en rango, no sustituyen una evaluación del corazón ni dan permiso para exigirte más.', fuente: 'nhs' },
  ],
  comida: [
    { boton: 'Azúcar', titulo: 'La cantidad de carbohidratos importa', dibujo: 'azucar', texto: 'Dulces, galletas y pan aportan carbohidratos que pueden subir la glicemia.', detalle: 'La porción y la preparación importan. El pan integral también aporta carbohidratos. La cantidad adecuada depende de tu pauta; el azúcar no se convierte directamente en grasa dentro del corazón.', fuente: 'cdc' },
    { boton: 'Sal', titulo: 'Menos sodio ayuda a cuidar la presión', dibujo: 'sal', texto: 'El exceso de sodio puede elevar la presión arterial.', detalle: 'También hay sodio en productos envasados y algunos quesos. Comparar las etiquetas ayuda a elegir. No representamos la sal como un tapón dentro de las arterias.', fuente: 'sal' },
    { boton: 'Grasas', titulo: 'Importa el tipo de grasa', dibujo: 'grasas', texto: 'El exceso de grasas saturadas puede aumentar el colesterol LDL.', detalle: 'Algunos quesos, mantequilla y carnes grasas aportan grasas saturadas. Un LDL elevado favorece la acumulación de placa con el tiempo. El dibujo es general: no muestra tus arterias.', fuente: 'grasas' },
    { boton: 'Cuidarme', titulo: 'Los cambios pequeños también suman', dibujo: 'plato', texto: 'Una alimentación equilibrada ayuda a cuidar el corazón a largo plazo.', detalle: 'Elegir verduras, proteínas adecuadas, carbohidratos con medida y menos sal y azúcar añadida acompaña a los remedios y controles. Una comida no limpia las arterias ni repara por sí sola una lesión.', fuente: 'dieta' },
  ],
};
const FUENTES = {
  nhs: ['NHS · Corazón y recuperación', 'https://www.nhs.uk/conditions/heart-attack/'],
  actividad: ['AHA · Plan personal de actividad', 'https://www.heart.org/en/health-topics/cardiac-rehab/getting-physically-active/develop-a-physical-activity-plan-for-you'],
  cdc: ['CDC · Carbohidratos y glicemia', 'https://www.cdc.gov/diabetes/healthy-eating/diabetes-meal-planning.html'],
  sal: ['AHA · Sodio y presión', 'https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/sodium/effects-of-excess-sodium-infographic'],
  grasas: ['AHA · Grasas saturadas', 'https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/fats/saturated-fats'],
  dieta: ['AHA · Alimentación y corazón', 'https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/nutrition-basics/aha-diet-and-lifestyle-recommendations'],
};

const corazon = `<g class="cv-organo"><path class="cv-cuerpo" d="M176 160c-20-10-54-32-58-62-4-26 9-44 28-45 11-1 18 5 23 13 3-17 15-24 27-20 21 6 35 27 33 50-3 30-28 52-53 64Z"/><path class="cv-relieve" d="M168 67c-1 23 18 34 11 68M188 55c-6 20 8 31 24 34M143 78c7 17 3 35 23 45"/><path class="cv-vaso" d="M172 66V38c0-11 8-17 16-17h15v17h-12v24M146 54V36h-15V23h28v37"/><path class="cv-coronaria" d="m176 73-9 29 5 36m-4-35-18-7m22 16 19-12"/></g>`;
const tubo = `<path class="cv-tubo-ext" d="M40 102H320"/><path class="cv-tubo-int" d="M40 102H320"/><path class="cv-flujo" d="M42 102H318"/>`;
const nodos = `<circle class="cv-nodo cv-p1" cx="80" cy="102" r="8"/><circle class="cv-nodo cv-p2" cx="150" cy="102" r="8"/><circle class="cv-nodo cv-p3" cx="220" cy="102" r="8"/>`;
const plato = `<g class="cv-plato"><circle class="cv-loza" cx="178" cy="102" r="70"/><path class="cv-verde" d="M178 42a60 60 0 0 0 0 120Z"/><path class="cv-prote" d="M178 102V42a60 60 0 0 1 60 60Z"/><path class="cv-carbo" d="M178 102h60a60 60 0 0 1-60 60Z"/><path class="cv-linea-plato" d="M178 42v120m0-60h60"/><circle class="cv-brote" cx="144" cy="76" r="8"/><circle class="cv-brote" cx="143" cy="115" r="10"/><circle class="cv-brote" cx="157" cy="135" r="6"/></g>`;
function escena(tipo) {
  let cuerpo;
  if (tipo === 'corazon') cuerpo = `<circle class="cv-halo" cx="177" cy="93" r="77"/><path class="cv-orbita" d="M85 150C-4 14 310-22 286 148"/>${corazon}<path class="cv-circuito cv-flujo" d="M79 164h49m102 0h49"/>`;
  else if (tipo === 'cuidados') cuerpo = `<path class="cv-camino" d="M68 130Q180 20 292 130"/><g class="cv-apoyo cv-p1"><rect x="37" y="91" width="64" height="34" rx="17"/><path d="m68 92-1 32"/></g>${corazon}<g class="cv-apoyo cv-p3"><rect x="263" y="88" width="57" height="67" rx="9"/><path d="m275 120 10 10 22-24"/></g>`;
  else if (tipo === 'camino') cuerpo = `<path class="cv-camino" d="M38 158C95 158 74 118 133 118S181 77 232 77s58-41 87-41"/><g class="cv-paso cv-p1"><circle cx="62" cy="153" r="16"/><path d="m55 153 5 6 10-13"/></g><g class="cv-paso cv-p2"><circle cx="169" cy="109" r="16"/><path d="m162 109 5 6 10-13"/></g><g class="cv-paso cv-p3"><circle cx="276" cy="64" r="16"/><path d="m269 64 5 6 10-13"/></g><g class="cv-persona"><circle cx="110" cy="37" r="10"/><path d="m107 52-8 29 23 13m-23-13-12 25m17-44 19 8m-25-8-17 9"/></g>`;
  else if (tipo === 'azucar') cuerpo = `${tubo}${nodos}<g class="cv-cubos"><rect x="115" y="28" width="18" height="18" rx="4"/><rect x="144" y="39" width="15" height="15" rx="4"/><rect x="174" y="24" width="18" height="18" rx="4"/></g><path class="cv-union" d="M167 57v21"/><g class="cv-glucosa"><rect x="117" y="94" width="13" height="13" rx="3"/><rect x="183" y="94" width="13" height="13" rx="3"/><rect x="252" y="94" width="13" height="13" rx="3"/></g>`;
  else if (tipo === 'sal') cuerpo = `<g class="cv-salero"><path d="m68 47 35-15 25 53-35 15Z"/><path d="m64 42 36-16 4 9-36 16Z"/><circle cx="95" cy="62" r="2"/><circle cx="101" cy="71" r="2"/></g><path class="cv-union" d="M143 73h30"/><circle class="cv-reloj" cx="236" cy="97" r="52"/><path class="cv-escala" d="M202 116a39 39 0 1 1 68 0"/><path class="cv-aguja" d="m236 97 19-24"/><circle class="cv-eje" cx="236" cy="97" r="6"/>`;
  else if (tipo === 'grasas') cuerpo = `${tubo}<path class="cv-placa" d="M135 77h83c-13 4-18 13-34 13s-32-9-49-13Zm-25 50h96c-16-4-20-12-39-12s-34 8-57 12Z"/>${nodos}<path class="cv-union" d="M166 45h28m-14-8v16"/>`;
  else cuerpo = `${plato}<path class="cv-camino" d="M76 182h209"/><g class="cv-paso cv-p1"><circle cx="89" cy="182" r="6"/></g><g class="cv-paso cv-p2"><circle cx="179" cy="182" r="6"/></g><g class="cv-paso cv-p3"><circle cx="269" cy="182" r="6"/></g>`;
  return `<svg class="cv-escena cv-${tipo}" viewBox="0 0 360 210" role="img" aria-label="${esc({corazon:'Esquema del corazón y circulación',cuidados:'Remedios y controles acompañan el cuidado del corazón',camino:'Camino por pasos, guiado por el equipo médico',azucar:'Carbohidratos y glucosa en la sangre',sal:'Sodio y presión arterial',grasas:'Esquema general de placa en un vaso sanguíneo',plato:'Plato equilibrado y cuidados sostenidos'}[tipo])}"><rect class="cv-fondo" x="1" y="1" width="358" height="208" rx="24"/>${cuerpo}</svg>`;
}
function ui(grupo, inicial = 0) {
  if (!estado.ui.infografias) estado.ui.infografias = {};
  if (!estado.ui.infografias[grupo]) estado.ui.infografias[grupo] = { paso: inicial, pausa: false };
  return estado.ui.infografias[grupo];
}
export function infografia(grupo, inicial = 0) {
  const lista = TEMAS[grupo] || TEMAS.corazon, u = ui(grupo, inicial), paso = lista[u.paso] ? u.paso : 0, tema = lista[paso], f = FUENTES[tema.fuente];
  const voz = typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance !== 'undefined';
  return `<section class="panel cv-infografia${u.pausa ? ' cv-pausada' : ''}" aria-label="Explicación visual" data-k="infografia-${grupo}">
    <div class="cv-conceptos" role="group" aria-label="Elige qué quieres entender">${lista.map((t,i) => `<button type="button" class="cv-concepto${i===paso?' sel':''}" data-a="conceptoVisual" data-grupo="${grupo}" data-v="${i}" aria-pressed="${i===paso}">${esc(t.boton)}</button>`).join('')}</div>
    <div class="cv-lamina" data-k="lamina-${grupo}-${paso}">${escena(tema.dibujo)}<h2 class="h2">${esc(tema.titulo)}</h2><p class="sub grande">${esc(tema.texto)}</p></div>
    <div class="cv-controles"><button type="button" class="mini-btn" data-a="pausaVisual" data-grupo="${grupo}" aria-pressed="${u.pausa}">${ico(u.pausa?'right':'clock')}${u.pausa?'Reanudar':'Pausar'}</button>${voz?`<button type="button" class="mini-btn" data-a="vozVisual" data-grupo="${grupo}" aria-pressed="${u.hablando?'true':'false'}">${ico('info')}${u.hablando?'Detener voz':'Escuchar'}</button>`:''}<button type="button" class="mini-btn" data-a="siguienteVisual" data-grupo="${grupo}">Siguiente${ico('right')}</button></div>
    <p class="nota cv-aclaracion">Ilustración general · no representa tu corazón en vivo.</p>
    ${u.errorVoz?'<p class="nota" role="status">No se pudo reproducir la voz. Puedes leer la explicación.</p>':''}
    <details class="comida-menu" data-k="mas-visual-${grupo}-${paso}"><summary>Entender un poco más</summary><p class="sub">${esc(tema.detalle)}</p><p class="nota"><a class="enlace" href="${esc(f[1])}" target="_blank" rel="noopener">${esc(f[0])}</a> · Consultado: 14 nov 2026</p></details>
  </section>`;
}

let secuenciaVoz = 0;
function detenerVoz() {
  secuenciaVoz++;
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  Object.values(estado.ui.infografias || {}).forEach((u) => { u.hablando = false; });
}
acciones.conceptoVisual = (d) => {
  if (!TEMAS[d.grupo] || !TEMAS[d.grupo][Number(d.v)]) return;
  detenerVoz(); const u = ui(d.grupo); u.paso = Number(d.v); u.errorVoz = false; pintar();
};
acciones.siguienteVisual = (d) => { if (TEMAS[d.grupo]) acciones.conceptoVisual({ grupo:d.grupo, v:(ui(d.grupo).paso+1)%TEMAS[d.grupo].length }); };
acciones.pausaVisual = (d) => { const u=ui(d.grupo); u.pausa=!u.pausa; pintar(); };
acciones.vozVisual = (d) => {
  if (!TEMAS[d.grupo] || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
  const u=ui(d.grupo), estaba=u.hablando; detenerVoz();
  if (estaba) { pintar(); return; }
  const t=TEMAS[d.grupo][u.paso], voz=new SpeechSynthesisUtterance(`${t.titulo}. ${t.texto} ${t.detalle}`), sec=secuenciaVoz;
  voz.lang='es-CL'; voz.rate=0.9; u.hablando=true; u.errorVoz=false;
  voz.onend=()=>{if(sec===secuenciaVoz){u.hablando=false;pintar();}};
  voz.onerror=()=>{if(sec===secuenciaVoz){u.hablando=false;u.errorVoz=true;pintar();}};
  try { window.speechSynthesis.speak(voz); } catch(e) { u.hablando=false; u.errorVoz=true; }
  pintar();
};
window.addEventListener('hashchange', detenerVoz);
document.addEventListener('visibilitychange', ()=>{if(document.hidden) detenerVoz();});
