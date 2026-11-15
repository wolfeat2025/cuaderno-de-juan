// MI RECUPERACIÓN: 6 capítulos con voz (ElevenLabs), escenas que avanzan con el audio y subtítulos grandes.
// Rutas: #recuperacion (lista) y #recuperacion/N (capítulo N, 1..6). Para Juan y para toda la familia.
import { estado, acciones, pintar, esJuan } from '../nucleo.js';
import { esc, ico, porId } from '../util.js';
import { escena, PREGUNTAS } from '../escenas.js';

// t = inicio de cada escena (s), medido en las pausas reales de cada audio.
export const CAPS = [
  { n: 'Lo que pasó', a: 'c1', dur: 33.3, t: [0, 6.95, 17.64, 24.17], x: ['Juan, hace unas semanas una parte de tu corazón se quedó un rato sin la sangre que necesitaba. Eso fue el infarto.', 'Esa zona se está curando, como cualquier herida: primero se inflama y, en las próximas semanas, forma una cicatriz firme. Mientras tanto, el resto del corazón sigue trabajando.', 'Por eso estas semanas importan. El corazón sana mejor cuando el esfuerzo crece de a poco, no de golpe.', 'Tres cosas lo ayudan: los remedios de cada día, la comida que cuida tus arterias, y el movimiento que vuelve paso a paso. Vamos con cada una.'] },
  { n: 'Volver de a poco', a: 'c2', dur: 42.9, t: [0, 11.04, 21.18, 32.09], x: ['Estas primeras semanas en casa son de reposo relativo. No es estar en cama: es moverte, pero sin apuro. Levántate, camina por la casa y cambia de posición cada hora.', 'Cada semana puedes sumar un poquito: un rato más caminando, una tarea más del día. Una buena señal: si puedes conversar mientras lo haces, el esfuerzo va bien.', 'Si sientes dolor en el pecho, falta de aire o mareo, detente, descansa y avísale a la familia. Si no se pasa en unos minutos, hay que llamar al 131.', 'Las tareas con más fuerza, como el patio, levantar peso o volver al folklore, las conversamos con el cardiólogo. Piensa cuál quieres recuperar primero: esa es tu meta.'] },
  { n: 'La comida trabaja contigo', a: 'c3', dur: 43.65, t: [0, 6.98, 20.28, 33.6], x: ['Lo que comes llega a tu sangre y a tus arterias. Por eso la comida es parte del tratamiento, igual que los remedios.', 'La sal hace que el cuerpo guarde más agua; con más agua, la presión sube y el corazón trabaja más. Y casi toda la sal viene escondida: en el pan, los quesos, las cecinas y los caldos en cubo.', 'El pan, el arroz, los fideos y las papas se convierten en azúcar en la sangre. No están prohibidos: se elige uno por comida, en una porción medida. Las bebidas y jugos con azúcar son los que más la suben.', 'Las cecinas, la mantequilla y las frituras suben el colesterol, que se va pegando en las arterias. Los remedios hacen una parte; la comida hace la otra.'] },
  { n: 'Un cambio por semana', a: 'c4', dur: 36.5, t: [0, 4.65, 15.99, 24.26], x: ['No hay que cambiar todo de un día para otro. Funciona mejor un cambio por semana.', 'Primera semana: el salero fuera de la mesa. Al comienzo todo sabe desabrido, pero en unas semanas el gusto se acostumbra y la comida vuelve a saber bien.', 'Segunda semana: agua o bebidas sin azúcar. Tercera: un solo pan, arroz o papa por comida, con la mitad del plato de verduras.', 'Cuarta: más pescado, pollo o legumbres, y menos cecinas y frituras. Cada cambio que se mantiene ayuda a cuidar la presión, el azúcar y el colesterol mientras tu corazón sana.'] },
  { n: 'Medir y conversar', a: 'c5', dur: 34.1, t: [0, 8.62, 18.49, 26.18], x: ['Medir la presión y el azúcar en casa es como sacar una foto del día. Una sola foto dice poco; muchas juntas muestran cómo vas.', 'En el cuaderno, verde es bien, ámbar es para revisar y rojo es para avisar. Un ámbar suelto no es una alarma: se vuelve a medir y se anota.', 'En el CESFAM y con el cardiólogo van a mirar esas fotos juntas. Con eso ajustan los remedios y te dicen hasta dónde avanzar.', 'Tú haces tu parte cada día: los remedios, la comida y moverte de a poco. Y tu familia está contigo en cada paso.'] },
  { n: 'Tu peso', a: 'c6', dur: 47.15, t: [0, 11.75, 23.44, 36.94], x: ['Es normal que te preocupe el peso. Pero de un día a otro, el peso cambia sobre todo por agua, no por grasa ni por músculo. Algunos de tus remedios ayudan al cuerpo a sacar agua, y eso se nota en la balanza.', 'Por eso, un kilo menos en un día no quiere decir que estés comiendo poco. Lo que importa es cómo va la semana. Pésate cada mañana, después de ir al baño y antes de desayunar, con ropa liviana.', 'Para recuperar peso, comer más pan, dulces o comida salada no ayuda al corazón. Lo que sí ayuda es no saltarte comidas y sumar proteína en cada una: huevo, pollo, pescado, legumbres o leche.', 'Avísale al médico si sigues bajando semana tras semana, o si subes de golpe en pocos días, porque eso puede ser agua acumulada. Y en el CESFAM, pregunta cuál es tu peso ideal.'] },
];

// ---- Progreso guardado en este aparato (comodidad, no dato clínico) ----
const leerVistos = () => { try { return JSON.parse(localStorage.getItem('cj_rec_vistos') || '{}'); } catch (e) { return {}; } };
const marcarVisto = (i) => { try { const v = leerVistos(); v[i] = 1; localStorage.setItem('cj_rec_vistos', JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } };
export const siguienteCap = () => { const v = leerVistos(); const i = CAPS.findIndex((_, k) => !v[k]); return i < 0 ? 0 : i; };

// ---- Reproductor: un solo Audio para toda la app ----
const R = { cap: -1, esc: -1, fase: 'portada', tocando: false, resp: '' };
let audio = null;
function asegurarAudio() {
  if (audio) return audio;
  audio = new Audio(); audio.preload = 'auto';
  audio.addEventListener('timeupdate', alAvanzar);
  audio.addEventListener('ended', alTerminar);
  audio.addEventListener('pause', () => { R.tocando = false; reflejarPausa(); });
  audio.addEventListener('play', () => { R.tocando = true; reflejarPausa(); });
  return audio;
}
const escenaDe = (c, s) => { const t = CAPS[c].t; let i = 0; for (let k = 0; k < t.length; k++) if (s >= t[k] - 0.05) i = k; return i; };
const durEsc = (c, i) => (CAPS[c].t[i + 1] || CAPS[c].dur) - CAPS[c].t[i];
const svgEscena = (c, i) => `<svg class="esc-svg" viewBox="0 0 360 280" aria-hidden="true">${escena(c, i, durEsc(c, i))}</svg>`;

function subtituloHtml(c, i, s) {
  const txt = CAPS[c].x[i], ini = CAPS[c].t[i], f = Math.max(0, Math.min(1, (s - ini) / Math.max(1, durEsc(c, i) - 0.8)));
  let corte = f >= 1 ? txt.length : txt.indexOf(' ', Math.round(txt.length * f)); if (corte < 0) corte = txt.length;
  return `<span class="ya">${esc(txt.slice(0, corte))}</span><span class="falta">${esc(txt.slice(corte))}</span>`;
}
function alAvanzar() {
  if (R.cap < 0 || R.fase !== 'tocando') return;
  const s = audio.currentTime, i = escenaDe(R.cap, s);
  if (i !== R.esc) { R.esc = i; const e = porId('rec-escena'); if (e) e.innerHTML = svgEscena(R.cap, i); }
  const sub = porId('rec-sub'); if (sub) sub.innerHTML = subtituloHtml(R.cap, i, s);
  const b = porId('rec-avance'); if (b) b.style.width = (Math.min(1, s / CAPS[R.cap].dur) * 100).toFixed(1) + '%';
}
function alTerminar() {
  marcarVisto(R.cap); R.tocando = false;
  R.fase = PREGUNTAS[R.cap] ? 'pregunta' : 'fin'; R.resp = '';
  pintar();
}
function reflejarPausa() {
  const esc0 = porId('rec-escenario'); if (esc0) esc0.classList.toggle('pausa', !R.tocando);
  const bt = porId('rec-play'); if (bt) { bt.innerHTML = ico(R.tocando ? 'pausa' : 'play'); bt.setAttribute('aria-label', R.tocando ? 'Pausar' : 'Escuchar'); }
}
function detener() { if (audio && !audio.paused) audio.pause(); }
// Al salir del capítulo o esconder la app, se pausa la voz.
window.addEventListener('hashchange', () => { if (!/^#recuperacion\/\d/.test(location.hash)) detener(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) detener(); });

function abrirCap(c) {
  if (R.cap !== c) { detener(); R.cap = c; R.esc = 0; R.fase = 'portada'; R.resp = ''; }
}
function tocar() {
  const a = asegurarAudio(), src = `audios/juan/v5/${CAPS[R.cap].a}.mp3`;
  if (!a.src || a.src.indexOf(src) < 0) { a.src = src; a.currentTime = 0; }
  if (R.fase !== 'tocando') { R.fase = 'tocando'; R.esc = escenaDe(R.cap, a.currentTime); pintar(); }
  const p = a.play(); if (p && p.catch) p.catch(() => { R.fase = 'portada'; pintar(); });
}

// ---- Pantallas ----
function lista() {
  const v = leerVistos(), sig = siguienteCap();
  return `<div class="envoltura rec-lista">
    <a class="btn quieto izq" href="#${esJuan() ? 'hoy' : 'agenda'}">${ico('left')}${esJuan() ? 'Volver a Hoy' : 'Volver a Agenda'}</a>
    <a class="rec-seguir" href="#recuperacion/${sig + 1}"><span class="rec-play-g">${ico('play')}</span><span><b>${Object.keys(v).length ? 'Seguir' : 'Empezar'}</b><span>${sig + 1}. ${esc(CAPS[sig].n)}</span></span></a>
    <ol class="rec-caps">${CAPS.map((c, i) => `<li><a href="#recuperacion/${i + 1}" class="${v[i] ? 'visto' : ''}"><span class="rec-num">${v[i] ? ico('check') : i + 1}</span><span class="tit">${esc(c.n)}</span><span class="sub">${Math.round(c.dur)} s</span></a></li>`).join('')}</ol>
  </div>`;
}
function preguntaHtml(c) {
  const P = PREGUNTAS[c], ok = R.resp && (!P.bien || R.resp === P.bien), mal = R.resp && !ok;
  return `<div class="rec-pregunta"><h2>${esc(P.q)}</h2><div class="rec-ops">${P.ops.map(([k, n, dib]) => `<button type="button" class="rec-op${R.resp === k ? (ok ? ' bien' : ' no') : ok ? ' apagada' : ''}" data-a="recResponder" data-v="${k}"><svg class="esc-svg" viewBox="-50 -45 100 90" aria-hidden="true">${dib}</svg>${esc(n)}</button>`).join('')}</div>
    <p class="rec-resp ${ok ? 'bien' : ''}">${ok ? esc(P.ok) : mal ? esc(P.no) : ''}</p></div>`;
}
function capitulo(c) {
  abrirCap(c);
  const v = leerVistos(), C = CAPS[c], hay = c + 1 < CAPS.length;
  const s = audio && audio.src.indexOf(C.a + '.mp3') >= 0 ? audio.currentTime : 0;
  const i = R.fase === 'tocando' ? escenaDe(c, s) : 0;
  let centro = '';
  if (R.fase === 'pregunta') centro = preguntaHtml(c);
  else centro = `<div id="rec-escena" class="rec-escena">${svgEscena(c, i)}</div>${R.fase === 'portada' ? `<button type="button" class="rec-portada" data-a="recTocar" aria-label="Escuchar el capítulo ${c + 1}"><span class="rec-play-g">${ico('play')}</span><b>Escuchar</b></button>` : ''}`;
  const respondida = R.fase === 'pregunta' && R.resp && (!PREGUNTAS[c].bien || R.resp === PREGUNTAS[c].bien);
  const terminado = R.fase === 'fin' || respondida;
  return `<div class="envoltura rec-cap" data-k="rec-${c}">
    <a class="btn quieto izq" href="#recuperacion">${ico('left')}Capítulos</a>
    <div class="rec-barra" aria-label="Capítulo ${c + 1} de ${CAPS.length}">${CAPS.map((_, k) => `<span class="${v[k] && k !== c ? 'hecho' : ''}">${k === c ? `<i id="rec-avance" style="width:${R.fase === 'fin' || R.fase === 'pregunta' ? 100 : 0}%"></i>` : ''}</span>`).join('')}</div>
    <h1 class="rec-titulo">${c + 1} · ${esc(C.n)}</h1>
    <div id="rec-escenario" class="rec-escenario${R.fase === 'tocando' && !R.tocando ? ' pausa' : ''}">${centro}</div>
    <p id="rec-sub" class="rec-sub" aria-live="polite">${R.fase === 'tocando' ? subtituloHtml(c, i, s) : R.fase === 'portada' ? '<span class="falta">Toca Escuchar. La voz y los dibujos avanzan solos.</span>' : R.fase === 'pregunta' ? `<span class="ya">${respondida ? 'Muy bien.' : 'Toca una respuesta.'}</span>` : `<span class="ya">${esc(C.x[3])}</span>`}</p>
    ${terminado && hay ? `<a class="btn pri grande" href="#recuperacion/${c + 2}">${ico('right')}Siguiente: ${esc(CAPS[c + 1].n)}</a>` : ''}
    ${terminado && !hay ? `<a class="btn pri grande" href="#recuperacion">${ico('check')}Terminaste los 6 capítulos</a>` : ''}
    <div class="rec-controles">
      <button type="button" class="btn quieto" data-a="recRepetir">${ico('undo')}Repetir</button>
      ${R.fase === 'tocando' ? `<button type="button" id="rec-play" class="rec-redondo" data-a="recPausa" aria-label="${R.tocando ? 'Pausar' : 'Escuchar'}">${ico(R.tocando ? 'pausa' : 'play')}</button>` : '<span class="rec-hueco"></span>'}
      ${hay && !terminado ? `<a class="btn quieto" href="#recuperacion/${c + 2}">Siguiente${ico('right')}</a>` : '<span class="rec-hueco"></span>'}
    </div>
  </div>`;
}

export function render(args) {
  const n = Number(args && args[0]);
  if (n >= 1 && n <= CAPS.length) return capitulo(n - 1);
  detener(); R.cap = -1;
  return lista();
}
export const titulo = () => 'Recuperación';

// Tarjeta de entrada (arriba en la portada de Juan; también se usa en Agenda).
export function tarjetaRecuperacion(compacta) {
  const sig = siguienteCap(), v = leerVistos(), hechos = Object.keys(v).length;
  return `<a class="rec-entrada${compacta ? ' compacta' : ''}" href="#recuperacion/${sig + 1}">
    <span class="rec-play-g">${ico('play')}</span>
    <span><b>${esJuan() ? 'Mi recuperación' : 'Entender la recuperación'}</b><span>${hechos ? `Seguir: ${sig + 1}. ${esc(CAPS[sig].n)}` : `6 capítulos · ${Math.round(CAPS.reduce((s, c) => s + c.dur, 0) / 60)} min`}</span></span>
  </a>`;
}

acciones.recTocar = () => tocar();
acciones.recPausa = () => { const a = asegurarAudio(); if (a.paused) { const p = a.play(); if (p && p.catch) p.catch(() => {}); } else a.pause(); };
acciones.recRepetir = () => { const a = asegurarAudio(); detener(); a.currentTime = 0; R.esc = 0; R.fase = 'portada'; R.resp = ''; tocar(); };
acciones.recResponder = (d) => { R.resp = d.v; pintar(); };
