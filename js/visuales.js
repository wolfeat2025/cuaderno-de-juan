// Infografías educativas de la app: SVG y CSS nativos, sin dependencias ni ritmo clínico simulado.
import { estado, acciones, pintar } from './nucleo.js';
import { esc, ico } from './util.js';
import { RECORRIDOS, dibujoRecorrido } from './recorridos.js';

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

function ui(grupo, inicial = 0) {
 if (!estado.ui.infografias) estado.ui.infografias = {};
 if (!estado.ui.infografias[grupo]) estado.ui.infografias[grupo] = { paso: inicial, etapa:0, pausa:false, modo:null };
 return estado.ui.infografias[grupo];
}
export function infografia(grupo, inicial = 0) {
 const lista=TEMAS[grupo]||TEMAS.corazon,u=ui(grupo,inicial),paso=lista[u.paso]?u.paso:0,tema=lista[paso],ruta=RECORRIDOS[grupo][paso],etapa=Number.isInteger(u.etapa)?u.etapa:0,f=FUENTES[tema.fuente];
 const voz=!!ruta.audio;
 const cuidado=u.comparar==='cuidar'&&ruta.cuidado;
 const visible=cuidado?{...ruta,pasos:ruta.cuidado}:ruta;
 return `<section class="panel cv-infografia rj-player${u.pausa?' cv-pausada':''}" data-k="infografia-${grupo}" aria-label="Explicación visual">
 <div class="cv-conceptos" role="group" aria-label="Elige una explicación">${lista.map((t,i)=>`<button class="cv-concepto${i===paso?' sel':''}" data-a="conceptoVisual" data-grupo="${grupo}" data-v="${i}" aria-pressed="${i===paso}">${esc(t.boton)}</button>`).join('')}</div>
 <div class="rj-heading"><span class="nota">${paso+1} de ${lista.length}</span><span class="rj-state">${etapa===3?'Recorrido completo':`Parte ${etapa+1} de 3`}</span></div>
 <h2 class="h2">${esc(tema.titulo)}</h2>
 <div class="cv-controles">${u.modo?`<button class="mini-btn" data-a="pausaVisual" data-grupo="${grupo}" aria-pressed="${u.pausa}">${ico(u.pausa?'right':'clock')}${u.pausa?'Continuar':'Pausar'}</button><button class="mini-btn" data-a="detenerVisual" data-grupo="${grupo}">Detener</button>`:`<button class="mini-btn" data-a="animarVisual" data-grupo="${grupo}">${etapa===3?'Repetir':'Ver animación'}</button>${voz?`<button class="mini-btn" data-a="vozVisual" data-grupo="${grupo}">${ico('info')}Escuchar</button>`:''}`}<button class="mini-btn" data-a="siguienteVisual" data-grupo="${grupo}"${paso===lista.length-1?' disabled':''}>Siguiente${ico('right')}</button></div>
 <div class="rj-stage" data-k="escena-${grupo}-${paso}-${etapa}-${cuidado?'cuidar':'explicar'}">${dibujoRecorrido(visible,etapa)}</div>
 <p class="rj-caption">${esc(etapa===3?(cuidado?ruta.comparacion.cuidar:ruta.cierre):visible.pasos[etapa][2])}</p>
 <p class="nota">Toca una parte para verla de cerca.</p>
 <div class="rj-parts" role="group" aria-label="Partes del recorrido">${ruta.pasos.map((p,i)=>`<button data-a="parteVisual" data-grupo="${grupo}" data-v="${i}" aria-pressed="${etapa===i}" class="rj-part${etapa===i?' sel':''}"><span>${i+1}</span>${esc(cuidado?ruta.cuidado[i][0]:p[0])}</button>`).join('')}</div>
 <button class="btn quieto" data-a="parteVisual" data-grupo="${grupo}" data-v="3" aria-pressed="${etapa===3}">Ver recorrido completo</button>
 ${etapa===3&&ruta.comparacion?`<div class="rj-compare"><button class="rj-avoid" data-a="compararVisual" data-grupo="${grupo}" data-v="evitar" aria-pressed="${!cuidado}"><b>${ico('alert')}Para evitar</b><p>${esc(ruta.comparacion.evitar)}</p></button><button class="rj-care" data-a="compararVisual" data-grupo="${grupo}" data-v="cuidar" aria-pressed="${!!cuidado}"><b>${ico('check')}Para cuidarme</b><p>${esc(ruta.comparacion.cuidar)}</p></button><p class="nota">${esc(ruta.comparacion.nota)}</p></div>`:''}

 ${u.requiereToque?'<p class="nota" role="status">Toca Continuar para seguir escuchando.</p>':''}
 ${u.final?'<p class="nota" role="status">Terminó la explicación. Puedes repetirla o tocar una parte.</p>':''}
 ${u.errorVoz?'<p class="nota" role="status">No se pudo reproducir el audio. Revisa la conexión y vuelve a tocar Escuchar; también puedes leer la explicación.</p>':''}
 <p class="nota cv-aclaracion">Ilustración educativa · no muestra tu estado actual.</p>
 <details class="comida-menu" data-k="relato-${grupo}-${paso}"><summary>Leer la explicación</summary>${ruta.voz.map(t=>`<p class="sub">${esc(t.replace(/\[[^\]]+\]/g,'').trim())}</p>`).join('')}<p class="nota"><a class="enlace" href="${esc(f[1])}" target="_blank" rel="noopener">${esc(f[0])}</a></p></details>
 </section>`;
}

let secuencia=0,reloj=null,grupoActivo=null;
function detener() {
 secuencia++;clearTimeout(reloj);reloj=null;
 reproductor.onended=null;reproductor.ontimeupdate=null;reproductor.onerror=null;reproductor.onloadedmetadata=null;reproductor.pause();reproductor.removeAttribute('src');reproductor.load();
 Object.values(estado.ui.infografias||{}).forEach(u=>{u.modo=null;u.pausa=false;u.requiereToque=false;});
 grupoActivo=null;
}
function enfocar(g) { requestAnimationFrame(()=>{const el=document.querySelector('[data-k="infografia-'+g+'"] .rj-heading');if(el)el.scrollIntoView({block:'start',behavior:'auto'});}); }
export function detenerRecorridos() { detener(); }
function valido(g){return !!RECORRIDOS[g];}
function preparar(g,modo) {
 detener();const u=ui(g);u.etapa=0;u.comparar=null;u.pausa=false;u.final=false;u.errorVoz=false;u.modo=modo;grupoActivo=g;return secuencia;
}
function animar(g,token) {
 if(token!==secuencia||grupoActivo!==g)return;
 const u=ui(g);if(u.pausa)return;
 reloj=setTimeout(()=>{if(token!==secuencia||u.pausa)return;
  if(u.etapa<3){u.etapa++;pintar();animar(g,token);}else{u.modo=null;u.final=true;grupoActivo=null;pintar();}
 },u.etapa===3?6500:4500);
}
const reproductor=new Audio();
reproductor.preload='auto';
reproductor.setAttribute('playsinline','');
function decir(g,token) {
 if(token!==secuencia||grupoActivo!==g)return;
 const u=ui(g),pasoAudio=u.paso,ruta=RECORRIDOS[g][pasoAudio];
 if(u.pausa)return;
 const actual=()=>token===secuencia&&grupoActivo===g&&u.paso===pasoAudio&&u.modo==='voz';
 const fallo=()=>{if(!actual())return;detener();u.errorVoz=true;pintar();};
 reproductor.onloadedmetadata=()=>{if(actual()&&Number.isFinite(reproductor.duration)&&reproductor.duration>0)u.duracionAudio=reproductor.duration;};
 reproductor.ontimeupdate=()=>{
  if(!actual())return;
  const t=reproductor.currentTime,etapa=ruta.audio.inicios.reduce((acc,inicio,i)=>t>=inicio?i:acc,0);
  if(etapa!==u.etapa){u.etapa=etapa;pintar();}
 };
 reproductor.onended=()=>{
  if(!actual())return;
  if(u.paso<RECORRIDOS[g].length-1){u.paso++;u.etapa=0;u.comparar=null;pintar();enfocar(g);decir(g,token);}
  else {u.modo=null;u.final=true;u.etapa=3;grupoActivo=null;pintar();}
 };
 reproductor.onerror=fallo;
 reproductor.src=new URL('../audios/juan/'+ruta.archivo+'.mp3',import.meta.url).href;
 const promesa=reproductor.play();
 if(promesa&&promesa.catch)promesa.catch(error=>{
  if(!actual())return;
  if(error.name==='NotAllowedError'){u.pausa=true;u.requiereToque=true;pintar();}
  else fallo();
 });
}

acciones.conceptoVisual=d=>{
 if(!valido(d.grupo)||!RECORRIDOS[d.grupo][Number(d.v)])return;
 detener();const u=ui(d.grupo);Object.assign(u,{paso:Number(d.v),etapa:0,comparar:null,final:false,errorVoz:false});pintar();enfocar(d.grupo);
};
acciones.parteVisual=d=>{
 if(!valido(d.grupo)||!Number.isInteger(Number(d.v))||Number(d.v)<0||Number(d.v)>3)return;
 detener();const u=ui(d.grupo);u.etapa=Number(d.v);u.final=false;pintar();enfocar(d.grupo);
};
acciones.compararVisual=d=>{if(!valido(d.grupo)||!['evitar','cuidar'].includes(d.v))return;detener();const u=ui(d.grupo);u.etapa=3;u.comparar=d.v;pintar();enfocar(d.grupo);};
acciones.siguienteVisual=d=>{
 if(!valido(d.grupo))return;const u=ui(d.grupo),modo=u.modo,pausa=u.pausa;
 if(u.paso>=RECORRIDOS[d.grupo].length-1)return;
 acciones.conceptoVisual({grupo:d.grupo,v:u.paso+1});
 if(modo==='voz'&&!pausa)acciones.vozVisual(d);
 else if(modo==='animacion'&&!pausa)acciones.animarVisual(d);
};
acciones.animarVisual=d=>{if(!valido(d.grupo))return;const token=preparar(d.grupo,'animacion');pintar();enfocar(d.grupo);animar(d.grupo,token);};
acciones.vozVisual=d=>{if(!valido(d.grupo))return;const token=preparar(d.grupo,'voz');pintar();enfocar(d.grupo);decir(d.grupo,token);};
acciones.pausaVisual=d=>{
 if(!valido(d.grupo)||grupoActivo!==d.grupo)return;
 const u=ui(d.grupo);u.pausa=!u.pausa;
 if(u.modo==='voz'){
  if(u.pausa)reproductor.pause();
  else {u.requiereToque=false;const token=secuencia;const promesa=reproductor.play();if(promesa&&promesa.catch)promesa.catch(()=>{if(token!==secuencia)return;u.pausa=true;u.requiereToque=true;pintar();});}
 }else{clearTimeout(reloj);if(!u.pausa)animar(d.grupo,secuencia);}
 pintar();
};
acciones.detenerVisual=()=>{detener();pintar();};
window.addEventListener('hashchange',detener);
document.addEventListener('visibilitychange',()=>{if(document.hidden){detener();pintar();}});
