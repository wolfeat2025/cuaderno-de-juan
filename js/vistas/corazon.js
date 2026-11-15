// MI CORAZÓN: explicación clara, honesta y con respaldo para Juan y la familia.
// Separa estrictamente: (1) lo registrado en casa, (2) lo que dicen los informes y (3) educación general con fuentes.
import { estado, acciones, pintar, aviso, esAdmin, esJuan } from '../nucleo.js';
import * as db from '../db.js';
import { esc, ico, val, porId, claveFecha, deClave, hhmm, fechaCorta, fechaLarga, DIAS, MESES, mayus } from '../util.js';
import { TIPOS, ETIQUETA, clasificar, valorTexto, detalleMomento } from '../datos.js';
import { infografia } from '../visuales.js';
import { tarjetaRecuperacion } from './recuperacion.js';

export const ESTUDIOS_BASE = [
  {
    id: 'alta',
    nombre: 'Resumen de hospitalización y alta',
    queEvalua: 'Reúne el diagnóstico del episodio, lo realizado en el hospital, los remedios indicados al salir y los cuidados iniciales.',
    queFaltaPorDefecto: 'Confirmar con el documento de alta el diagnóstico definitivo y las indicaciones escritas de actividad.',
  },
  {
    id: 'coronariografia',
    nombre: 'Coronariografía',
    queEvalua: 'Estudio con contraste para observar por dentro las arterias coronarias y ver si hay estrecheces u obstrucciones importantes.',
    queFaltaPorDefecto: 'Contar con el informe escrito original para confirmar el detalle de las arterias y la conclusión final.',
  },
  {
    id: 'ecocardiograma',
    nombre: 'Ecocardiograma',
    queEvalua: 'Ecografía del corazón que muestra cómo se mueven sus paredes, cómo abren y cierran las válvulas y con qué fuerza bombea (fracción de eyección).',
    queFaltaPorDefecto: 'Contar con el informe original para conocer la fracción de eyección, la función sistólica y el estado de las paredes y válvulas.',
  },
  {
    id: 'resonancia',
    nombre: 'Resonancia cardíaca',
    queEvalua: 'Imagen detallada del músculo del corazón para evaluar cómo está el tejido cardíaco y su movimiento.',
    queFaltaPorDefecto: 'Contar con el informe original y las conclusiones del especialista.',
  },
  {
    id: 'holter',
    nombre: 'Holter de ritmo (24 horas)',
    queEvalua: 'Registra el ritmo eléctrico del corazón durante un día completo. Evalúa arritmias o pausas en ese período; no mide la fuerza de bombeo ni autoriza esfuerzos físicos.',
    queFaltaPorDefecto: 'Verificar el informe médico original (si solo se cuenta con un resumen o transcripción, queda pendiente el documento original).',
  },
];

const ORIGEN_ETIQUETA = {
  documento: { txt: 'Informe original verificado', cls: 'ok' },
  resumen: { txt: 'Resumen transcrito · falta informe original', cls: 'amb' },
  comunicado: { txt: 'Comunicado a la familia · falta documento', cls: 'amb' },
  pendiente: { txt: 'Pendiente de cargar documento', cls: 'neutro' },
};

const FUENTES_CORAZON = [
  {
    id: 'nhs-ha',
    org: 'NHS (Reino Unido)',
    tema: 'Infarto al corazón, estudios diagnósticos y proceso de recuperación',
    url: 'https://www.nhs.uk/conditions/heart-attack/',
    consulta: 'Consultado el 14 de noviembre de 2026',
  },
  {
    id: 'aha-plan',
    org: 'American Heart Association (AHA)',
    tema: 'Plan personal de actividad física y rehabilitación cardíaca con el equipo tratante',
    url: 'https://www.heart.org/en/health-topics/cardiac-rehab/getting-physically-active/develop-a-physical-activity-plan-for-you',
    consulta: 'Consultado el 14 de noviembre de 2026',
  },
  {
    id: 'aha-diet',
    org: 'American Heart Association (AHA)',
    tema: 'Alimentación y cuidados cotidianos para la salud cardiovascular',
    url: 'https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/nutrition-basics/aha-diet-and-lifestyle-recommendations',
    consulta: 'Consultado el 14 de noviembre de 2026',
  },
];

const ETAPAS_RECUPERACION = [
  {
    num: 1,
    id: 'casa',
    titulo: 'Cuidarme en casa',
    proposito: 'Dar tiempo al corazón para estabilizarse después de volver a casa, ordenar los horarios de los remedios y descansar sin exigencias físicas.',
    queSeRevisa: 'Cómo te sientes en reposo y al caminar dentro de la casa, que no aparezcan síntomas (dolor en el pecho, falta de aire o mareo), la tolerancia a los remedios y los registros de presión y azúcar.',
    queNecesitamos: 'Indicaciones del alta médica y teléfonos de control.',
  },
  {
    num: 2,
    id: 'equipo',
    titulo: 'Recuperar actividades con el equipo',
    proposito: 'Retomar actividades cotidianas y caminatas paso a paso, guiado por los controles médicos y, cuando se indique, rehabilitación cardíaca.',
    queSeRevisa: 'Los informes completos de los exámenes (ecocardiograma, coronariografía, resonancia, Holter), la respuesta del cuerpo al caminar suave y el ajuste de remedios y alimentación.',
    queNecesitamos: 'Informes originales de los exámenes y una indicación documentada del médico sobre qué actividades y esfuerzos están autorizados.',
  },
  {
    num: 3,
    id: 'mantener',
    titulo: 'Mantener los cuidados',
    proposito: 'Sostener en el tiempo los hábitos que cuidan los vasos sanguíneos y el corazón: remedios al día, comidas equilibradas, glucosa y presión controladas.',
    queSeRevisa: 'Controles programados con cardiología y medicina general, exámenes de seguimiento y bienestar en las actividades diarias autorizadas.',
    queNecesitamos: 'Pauta actualizada de los controles siguientes y plan nutricional individual.',
  },
];

// Dibujos SVG educativos sobrios (sin corazón latiendo en vivo ni promesas clínicas).
function svgTresFuentes() {
  return `<svg class="dibujo-corazon" viewBox="0 0 320 92" role="img" aria-label="Esquema educativo: registros de casa, informes médicos y guía general son tres piezas distintas">
    <rect class="dc-caja" x="6" y="10" width="94" height="72" rx="14"/>
    <text class="dc-t1" x="53" y="42" text-anchor="middle">En casa</text>
    <text class="dc-t2" x="53" y="62" text-anchor="middle">Lecturas del día</text>
    <line class="dc-union" x1="100" y1="46" x2="113" y2="46"/>
    <rect class="dc-caja dc-dest" x="113" y="10" width="94" height="72" rx="14"/>
    <text class="dc-t1" x="160" y="42" text-anchor="middle">Tus informes</text>
    <text class="dc-t2" x="160" y="62" text-anchor="middle">Estudios médicos</text>
    <line class="dc-union" x1="207" y1="46" x2="220" y2="46"/>
    <rect class="dc-caja" x="220" y="10" width="94" height="72" rx="14"/>
    <text class="dc-t1" x="267" y="42" text-anchor="middle">Guía general</text>
    <text class="dc-t2" x="267" y="62" text-anchor="middle">Con fuentes</text>
  </svg>`;
}

function svgMapaEtapas(etapaActiva) {
  const c = (n) => (etapaActiva === n ? 'dc-etapa activa' : 'dc-etapa');
  return `<svg class="dibujo-corazon mapa-etapas" viewBox="0 0 320 86" role="img" aria-label="Mapa general de tres etapas: Cuidarme en casa, Recuperar actividades con el equipo y Mantener los cuidados">
    <line class="dc-riel" x1="54" y1="32" x2="266" y2="32"/>
    <g class="${c(1)}"><circle cx="54" cy="32" r="20"/><text class="dc-num" x="54" y="38" text-anchor="middle">1</text><text class="dc-et-txt" x="54" y="70" text-anchor="middle">En casa</text></g>
    <g class="${c(2)}"><circle cx="160" cy="32" r="20"/><text class="dc-num" x="160" y="38" text-anchor="middle">2</text><text class="dc-et-txt" x="160" y="70" text-anchor="middle">Con el equipo</text></g>
    <g class="${c(3)}"><circle cx="266" cy="32" r="20"/><text class="dc-num" x="266" y="38" text-anchor="middle">3</text><text class="dc-et-txt" x="266" y="70" text-anchor="middle">Mantener</text></g>
  </svg>`;
}

function datosCorazon() {
  const raw = (estado.config && estado.config.corazon) || {};
  const mapaEstudios = {};
  (raw.estudios || []).forEach((e) => { if (e && e.id) mapaEstudios[e.id] = e; });
  const estudios = ESTUDIOS_BASE.map((b) => {
    const g = mapaEstudios[b.id] || {};
    return {
      id: b.id,
      nombre: b.nombre,
      queEvalua: b.queEvalua,
      origen: ORIGEN_ETIQUETA[g.origen] ? g.origen : 'pendiente',
      fecha: g.fecha || '',
      conclusion: g.conclusion || '',
      explicacion: g.explicacion || '',
      fuente: g.fuente || '',
      pendiente: g.pendiente || b.queFaltaPorDefecto,
    };
  });
  return {
    resumenGeneral: raw.resumenGeneral || '',
    estudios,
    editado: raw.editado || null,
  };
}

// Tarjeta para la portada de Juan (punto 5: Entender mi corazón).
export function resumenCorazonPortada() {
  if (esJuan()) return `<section class="panel juan-seccion juan-acceso" aria-label="Entender mi corazón"><div class="cabeza"><span class="ic">${ico('heart')}</span><div><h2 class="h3">Entender mi corazón</h2><p class="sub">Mira, escucha y avanza a tu ritmo.</p></div></div><a class="btn pri" href="#corazon">${ico('right')}Ver la explicación</a><a class="btn quieto" href="#corazon/recuperacion">Mi recuperación${ico('right')}</a></section>`;
  const d = datosCorazon();
  const conDato = d.estudios.filter((e) => e.origen !== 'pendiente');
  const faltanDoc = d.estudios.filter((e) => e.origen !== 'documento');
  const ultimo = conDato[conDato.length - 1];

  let textoResumen;
  if (d.resumenGeneral) {
    textoResumen = esc(d.resumenGeneral);
  } else if (ultimo) {
    const et = ORIGEN_ETIQUETA[ultimo.origen];
    textoResumen = `<b>${esc(ultimo.nombre)}</b> (${esc(et.txt.toLowerCase())}${ultimo.fecha ? ' · ' + esc(ultimo.fecha) : ''}): ${esc(ultimo.explicacion || ultimo.conclusion || 'Registrado para revisión.')}`;
  } else {
    textoResumen = 'Aquí puedes revisar qué evalúa cada examen de tu corazón, qué hemos anotado en casa y qué informes originales falta incorporar al cuaderno.';
  }

  return `<section class="panel juan-seccion" aria-label="Entender mi corazón">
    <div class="titulo-fila">
      <h2 class="h3">${ico('heart')}Entender mi corazón</h2>
      <a class="mini-btn" href="#corazon">Abrir sección${ico('right')}</a>
    </div>
    <p class="sub grande">${textoResumen}</p>
    ${faltanDoc.length ? `<p class="nota">Informes originales por completar en el cuaderno: ${faltanDoc.map((e) => esc(e.nombre)).join(', ')}.</p>` : ''}
    <div class="juan-preguntas-botones">
      <a class="btn sec izq" href="#corazon/sabemos">${ico('info')}<span>¿Qué sabemos?<br><span class="sub-btn">Registros de casa y estudios disponibles</span></span></a>
      <a class="btn sec izq" href="#corazon/falta">${ico('clock')}<span>¿Qué falta saber?<br><span class="sub-btn">Informes y pautas por confirmar</span></span></a>
      <a class="btn sec izq" href="#corazon/recuperacion">${ico('heart')}<span>¿Cómo es la recuperación?<br><span class="sub-btn">Etapas generales y preguntas frecuentes</span></span></a>
    </div>
  </section>`;
}

// Bloque 1: Lo que registramos en casa.
function bloqueRegistrosCasa() {
  const hoy = claveFecha(estado.ahora), R = estado.config.rangos;
  const recientes = estado.mediciones.slice(0, 6);
  const conSintomas = estado.mediciones.filter((m) => m.nota || m.animo === 'Mal' || m.animo === 'Regular').slice(0, 4);
  const medsActivos = (estado.config.remedios || []).filter((r) => r.activo !== false);

  return `<section class="panel" aria-label="Lo que registramos en casa">
    <div class="cabeza"><span class="ic medir">${ico('pulse')}</span><div>
      <p class="rotulo">1. Lo que registramos en casa</p>
      <h2 class="h3">Lecturas puntuales y cómo te has sentido</h2>
    </div></div>
    <p class="nota aviso-info">${ico('info')}<span>Estos valores son mediciones puntuales tomadas por la familia o por ti en casa. <b>No son monitorización continua</b> ni reemplazan un electrocardiograma o un ecocardiograma.</span></p>
    ${recientes.length ? `<div class="casa-lecturas">
      ${recientes.map((m) => {
        const c = clasificar(m, R), ctx = detalleMomento(m);
        const fTxt = m.fecha === hoy ? 'Hoy' : fechaCorta(deClave(m.fecha));
        return `<div class="casa-lectura">
          <div class="titulo-fila">
            <span class="tit">${TIPOS[m.tipo].nombre}${ctx ? ' (' + esc(ctx) + ')' : ''}: <span class="v ${c}">${valorTexto(m)}</span>${m.tipo === 'azucar' ? ' mg/dL' : m.tipo === 'pulso' ? ' lpm' : ''}</span>
            <span class="estado ${c}"><span class="luz"></span>${ETIQUETA[c]}</span>
          </div>
          <p class="sub">${esc(fTxt)} a las ${hhmm(new Date(m.ts))} · Anotó ${esc(m.quien)}${m.animo ? ` · Se sintió: ${esc(m.animo.toLowerCase())}` : ''}${m.nota ? ` · Nota: "${esc(m.nota)}"` : ''}</p>
        </div>`;
      }).join('')}
    </div>` : '<p class="vacio-txt">Todavía no hay mediciones registradas en casa.</p>'}
    ${conSintomas.length ? `<div class="bloque">
      <p class="rotulo">Notas o síntomas anotados en casa</p>
      <ul class="porciones">${conSintomas.map((m) => `<li><span>${fechaCorta(deClave(m.fecha))} ${hhmm(new Date(m.ts))} · ${esc(m.animo ? 'Se sintió ' + m.animo.toLowerCase() : '')}${m.animo && m.nota ? ': ' : ''}${esc(m.nota || '')}</span><b>${esc(m.quien)}</b></li>`).join('')}</ul>
    </div>` : '<p class="nota">No hay molestias ni síntomas anotados en los registros recientes.</p>'}
    <div class="bloque">
      <p class="rotulo">Remedios activos en tu plan (${medsActivos.length})</p>
      ${medsActivos.length
        ? `<p class="sub">${medsActivos.map((r) => `<b>${esc(r.nombre)}</b>${r.dosis ? ' (' + esc(r.dosis) + ')' : ''}`).join(' · ')}</p>`
        : '<p class="sub">Todavía no están cargados los remedios en Ajustes.</p>'}
    </div>
  </section>`;
}

// Bloque 2: Lo que dicen tus informes (y qué falta confirmar).
function bloqueInformes(d, filtro) {
  const lista = filtro === 'falta'
    ? d.estudios.filter((e) => e.origen !== 'documento')
    : d.estudios;

  return `<section class="panel" aria-label="Lo que dicen tus informes">
    <div class="cabeza"><span class="ic">${ico('card')}</span><div>
      <p class="rotulo">2. Lo que dice tu informe</p>
      <h2 class="h3">${filtro === 'falta' ? 'Exámenes e informes por completar' : 'Exámenes del corazón y su respaldo'}</h2>
    </div></div>
    <p class="nota">Cada estudio mira una parte distinta del corazón. Un examen pasado describe ese momento y no equivale a una medición de hoy. Un resultado comentado verbalmente ("salió bien") se distingue del informe escrito original.</p>
    ${d.resumenGeneral ? `<div class="panel cuidado"><p class="rotulo">Resumen general cargado</p><p class="sub grande">${esc(d.resumenGeneral)}</p></div>` : ''}
    <div class="estudios-lista">
      ${lista.map((e) => {
        const et = ORIGEN_ETIQUETA[e.origen] || ORIGEN_ETIQUETA.pendiente;
        return `<div class="estudio-card" data-k="est-${e.id}">
          <div class="titulo-fila">
            <h3 class="h3">${esc(e.nombre)}</h3>
            <span class="chip ${et.cls}">${esc(et.txt)}</span>
          </div>
          <p class="sub"><b>Para qué sirve:</b> ${esc(e.queEvalua)}</p>
          ${e.fecha ? `<p class="sub"><b>Fecha del examen:</b> ${esc(e.fecha)} <span class="nota">(estudio realizado en esa fecha, no lectura de hoy)</span></p>` : ''}
          ${e.conclusion ? `<p class="sub grande"><b>Conclusión registrada:</b> ${esc(e.conclusion)}</p>` : ''}
          ${e.explicacion ? `<p class="sub"><b>En palabras simples:</b> ${esc(e.explicacion)}</p>` : ''}
          ${e.fuente ? `<p class="nota"><b>Origen del dato:</b> ${esc(e.fuente)}</p>` : ''}
          ${e.origen !== 'documento' ? `<p class="nota aviso-ej">${ico('clock')}<span><b>Pendiente de verificar con documento:</b> ${esc(e.pendiente)}</span></p>` : ''}
        </div>`;
      }).join('')}
    </div>
    ${d.editado ? `<p class="nota">Última actualización de informes: ${esc(d.editado.quien)} · ${fechaCorta(new Date(d.editado.ts))} a las ${hhmm(new Date(d.editado.ts))}</p>` : ''}
    ${esAdmin() ? `<a class="btn sec" href="#corazon/editar">${ico('edit')}Cargar o actualizar informes</a>` : '<p class="nota">Cuando tengan un informe escrito a mano, Fabián puede transcribirlo aquí.</p>'}
  </section>`;
}

// Bloque 3: Mapa general de recuperación (Semanas y meses).
function bloqueMapaRecuperacion() {
  const etapaSel = Number(estado.ui.etapaCorazon) || 1;
  const hoy = claveFecha(estado.ahora);
  const controles = estado.citas
    .filter((c) => !c.fecha || c.fecha >= hoy)
    .sort((a, b) => (a.fecha || '9999').localeCompare(b.fecha || '9999'));

  return `<section class="panel" aria-label="Semanas y meses: mapa general de recuperación">
    <div class="cabeza"><span class="ic">${ico('heart')}</span><div>
      <p class="rotulo">3. Información general sobre recuperación</p>
      <h2 class="h3">Semanas y meses: mapa por etapas</h2>
    </div></div>
    <p class="nota aviso-info">${ico('info')}<span><b>Mapa educativo general:</b> muestra cómo suele organizarse el seguimiento después de un problema cardíaco. No es un calendario automático ni desbloquea permisos por cumplir días o tener mediciones en verde.</span></p>
    ${svgMapaEtapas(etapaSel)}
    <div class="opciones">
      ${ETAPAS_RECUPERACION.map((et) => `<button type="button" class="opcion${etapaSel === et.num ? ' sel' : ''}" data-a="elegirEtapaCorazon" data-v="${et.num}" aria-pressed="${etapaSel === et.num ? 'true' : 'false'}">${et.num}. ${esc(et.titulo.split(' ')[0])}</button>`).join('')}
    </div>
    ${ETAPAS_RECUPERACION.map((et) => `<div class="etapa-card${etapaSel === et.num ? ' activa' : ''}" data-k="etapa-${et.id}">
      <p class="h3">Etapa ${et.num}: ${esc(et.titulo)}</p>
      <p class="sub grande"><b>Propósito:</b> ${esc(et.proposito)}</p>
      <p class="sub"><b>Qué se suele revisar:</b> ${esc(et.queSeRevisa)}</p>
      <p class="nota"><b>Qué necesitamos para personalizarla:</b> ${esc(et.queNecesitamos)}</p>
    </div>`).join('')}

    <div class="bloque">
      <p class="rotulo">${ico('cal')}Próximos controles reales anotados en Agenda</p>
      ${controles.length ? `<ul class="porciones">
        ${controles.map((c) => {
          const fTxt = c.fecha ? `${mayus(DIAS[deClave(c.fecha).getDay()])} ${deClave(c.fecha).getDate()} de ${MESES[deClave(c.fecha).getMonth()]}${c.hora ? ' · ' + c.hora : ''}` : 'Sin fecha confirmada todavía';
          return `<li><span><b>${esc(c.titulo)}</b>${c.lugar ? ' · ' + esc(c.lugar) : ''}</span><b>${esc(fTxt)}</b></li>`;
        }).join('')}
      </ul>` : '<p class="sub">Todavía no hay controles con fecha anotados en la Agenda.</p>'}
      <a class="btn quieto" href="#agenda">${ico('cal')}Ver Agenda de controles</a>
    </div>
  </section>`;
}

// Preguntas frecuentes verificadas ("Respuestas sin rodeos").
const PREGUNTAS_FRECUENTES = [
  {
    id: 'sentirse-bien',
    pregunta: '¿Por qué me siento bien y todavía debo cuidarme?',
    corta: 'Sentirse con ánimo y sin dolor es una buena noticia, pero el corazón y los vasos sanguíneos siguen adaptándose por dentro aunque por fuera uno se sienta bien.',
    dibujo: `<svg class="dibujo-faq" viewBox="0 0 280 54" role="img" aria-label="Secuencia: sentirse bien hoy acompaña al tratamiento, pero el cuidado interno continúa">
      <rect x="4" y="8" width="124" height="38" rx="10" class="df-a"/><text x="66" y="32" text-anchor="middle">Buen ánimo hoy</text>
      <text x="140" y="32" text-anchor="middle" class="df-mas">+</text>
      <rect x="152" y="8" width="124" height="38" rx="10" class="df-b"/><text x="214" y="32" text-anchor="middle">Cuidado por dentro</text>
    </svg>`,
    mas: 'Después de un evento cardíaco, el músculo del corazón necesita semanas para recuperarse y los medicamentos protegen las arterias y el ritmo todos los días. Hacer esfuerzos bruscos o exponerse a mucho calor antes de tener la indicación del cardiólogo puede exigir de más al corazón sin dar aviso previo.',
    indPersonal: 'Para saber qué esfuerzos físicos concretos puedes hacer hoy: necesitamos la indicación documentada de tu cardiólogo.',
    fuenteIdx: [0, 1],
  },
  {
    id: 'presion-normal',
    pregunta: '¿Una presión normal significa que mi corazón ya se recuperó?',
    corta: 'No. Una presión o un pulso normales muestran que en ese momento la lectura estuvo en rango, pero no miden la fuerza de bombeo ni el estado completo del corazón.',
    dibujo: `<svg class="dibujo-faq" viewBox="0 0 280 54" role="img" aria-label="Diferencia: el tensiómetro mide la presión del momento; los exámenes médicos evalúan el bombeo y las arterias">
      <rect x="4" y="8" width="126" height="38" rx="10" class="df-a"/><text x="67" y="32" text-anchor="middle">Presión: ese momento</text>
      <rect x="150" y="8" width="126" height="38" rx="10" class="df-b"/><text x="213" y="32" text-anchor="middle">Eco/Controles: bombeo</text>
    </svg>`,
    mas: 'El tensiómetro mide la fuerza de la sangre en las arterias del brazo en ese minuto, el oxímetro mide la saturación de oxígeno y el Holter registra el ritmo eléctrico durante un día. Para evaluar con qué fuerza se contrae el corazón (fracción de eyección) o cómo están las arterias se usan el ecocardiograma, la coronariografía, la resonancia y la evaluación presencial del médico.',
    indPersonal: 'No tenemos todavía en el cuaderno el valor documentado de fracción de eyección del ecocardiograma original.',
    fuenteIdx: [0],
  },
  {
    id: 'de-a-poco',
    pregunta: '¿Por qué retomar las actividades de a poco?',
    corta: 'Porque volver de forma gradual permite que el corazón se adapte al esfuerzo paso a paso, con supervisión del equipo de salud y sin sobrecargarlo.',
    dibujo: `<svg class="dibujo-faq" viewBox="0 0 280 54" role="img" aria-label="Escalones graduales: paso 1 suave, paso 2 moderado, paso 3 con revisión médica">
      <rect x="16" y="32" width="72" height="16" rx="5" class="df-a"/><text x="52" y="26" text-anchor="middle">1. Suave</text>
      <rect x="104" y="22" width="72" height="26" rx="5" class="df-a"/><text x="140" y="16" text-anchor="middle">2. Gradual</text>
      <rect x="192" y="12" width="72" height="36" rx="5" class="df-b"/><text x="228" y="48" text-anchor="middle">3. Con pauta</text>
    </svg>`,
    mas: 'No es lo mismo caminar tranquilo en plano que agacharse al sol, arrancar malezas, levantar peso o hacer fuerza sostenida con los brazos. Esos esfuerzos suben la presión y la demanda de oxígeno del corazón mucho más rápido. Por eso la progresión se planifica con el médico o en rehabilitación cardíaca.',
    indPersonal: 'No tenemos esa indicación todavía para trabajo de patio, cargas o tiempos de caminata: consúltalo en el control.',
    fuenteIdx: [1, 0],
  },
  {
    id: 'preguntar-control',
    pregunta: '¿Qué tengo que preguntar en el próximo control?',
    corta: 'Conviene llevar anotadas las dudas sobre tus exámenes, tus actividades diarias en casa y las metas de tus mediciones.',
    dibujo: '',
    mas: 'Preguntas útiles para llevar al cardiólogo: 1) ¿Cuál fue el diagnóstico final en el informe de alta y cuál es mi fracción de eyección en el ecocardiograma? 2) ¿Cuánto puedo caminar por día y qué tareas del patio o de la casa debo evitar por ahora? 3) ¿Me corresponde asistir a rehabilitación cardíaca? 4) ¿Cuáles son mis rangos personales de presión y de azúcar?',
    indPersonal: 'Puedes ver y agregar preguntas de la familia en Actividades y cuidados.',
    fuenteIdx: [0, 1],
  },
];

function bloquePreguntasFrecuentes() {
  const abiertas = estado.ui.faqCorazon || {};
  return `<section class="panel" aria-label="Preguntas frecuentes">
    <p class="rotulo">${ico('info')}Respuestas sin rodeos</p>
    <h2 class="h3">Preguntas frecuentes</h2>
    <p class="nota">Respuestas redactadas y verificadas con fuentes clínicas generales. No reemplazan la indicación individual de tu médico.</p>
    <div class="faq-lista">
      ${PREGUNTAS_FRECUENTES.map((q) => {
        const ab = !!abiertas[q.id];
        const fuentes = q.fuenteIdx.map((i) => FUENTES_CORAZON[i]).filter(Boolean);
        return `<div class="faq-card" data-k="faq-${q.id}">
          <p class="tit">${esc(q.pregunta)}</p>
          <p class="sub grande">${esc(q.corta)}</p>
          ${q.dibujo}
          <p class="nota aviso-info">${ico('clock')}<span><b>En tu caso:</b> ${esc(q.indPersonal)}</span></p>
          <button type="button" class="btn quieto auto" data-a="alternarFaqCorazon" data-id="${q.id}" aria-expanded="${ab ? 'true' : 'false'}">${ico(ab ? 'up' : 'down')}${ab ? 'Ver menos' : 'Ver más y fuente'}</button>
          ${ab ? `<div class="faq-mas">
            <p class="sub">${esc(q.mas)}</p>
            <div class="fuentes-caja">
              <p class="rotulo">Fuente médica</p>
              <ul class="fuentes-lista">
                ${fuentes.map((f) => `<li><a class="enlace" href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.org)} — ${esc(f.tema)}</a><span class="sub">${esc(f.consulta)} · Revisión editorial de la fuente; no equivale a revisión clínica de tu caso.</span></li>`).join('')}
              </ul>
            </div>
          </div>` : ''}
        </div>`;
      }).join('')}
    </div>
  </section>`;
}

function bloqueFuentesGenerales() {
  return `<section class="panel" aria-label="Respaldo y fuentes">
    <p class="rotulo">Respaldo educativo</p>
    <ul class="fuentes-lista">
      ${FUENTES_CORAZON.map((f) => `<li><a class="enlace" href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.org)} — ${esc(f.tema)}</a><span class="sub">${esc(f.consulta)} · Contenido educativo general.</span></li>`).join('')}
    </ul>
    <p class="nota">Ante dolor en el pecho, falta de aire importante, desmayo o sudor frío, toca siempre el botón rojo <b>Emergencia (131)</b> arriba a la derecha, aunque las mediciones anteriores hayan salido en rango.</p>
  </section>`;
}

function editorCorazon() {
  if (!esAdmin()) return `<div class="envoltura"><a class="btn quieto izq" href="#corazon">${ico('left')}Volver a Mi corazón</a><p class="sub grande">Los informes los carga Fabián desde su perfil.</p></div>`;
  const d = datosCorazon();
  return `<div class="envoltura" data-k="ed-corazon">
    <a class="btn quieto izq" href="#corazon">${ico('left')}Volver a Mi corazón</a>
    <p class="sub grande">Transcribe aquí lo que dicen los informes médicos cuando los tengas a mano. No inventes valores ni des por confirmado un documento si solo fue un comentario verbal.</p>
    <div class="campo">
      <label for="cor-resumen">Resumen breve general (opcional)</label>
      <textarea class="texto" id="cor-resumen" rows="2" maxlength="300" placeholder="En una frase, con respaldo en los informes">${esc(d.resumenGeneral)}</textarea>
    </div>
    ${d.estudios.map((e) => `<div class="panel" data-k="ed-est-${e.id}">
      <h2 class="h3">${esc(e.nombre)}</h2>
      <div class="campo">
        <label for="cor-${e.id}-origen">Estado del respaldo</label>
        <select class="texto" id="cor-${e.id}-origen">
          <option value="pendiente"${e.origen === 'pendiente' ? ' selected' : ''}>Pendiente de cargar documento</option>
          <option value="comunicado"${e.origen === 'comunicado' ? ' selected' : ''}>Comunicado a la familia (falta informe original)</option>
          <option value="resumen"${e.origen === 'resumen' ? ' selected' : ''}>Resumen transcrito (falta informe original)</option>
          <option value="documento"${e.origen === 'documento' ? ' selected' : ''}>Informe original verificado</option>
        </select>
      </div>
      <div class="campo"><label for="cor-${e.id}-fecha">Fecha del examen</label><input class="texto" type="date" id="cor-${e.id}-fecha" value="${esc(e.fecha)}"></div>
      <div class="campo"><label for="cor-${e.id}-conclusion">Conclusión fiel del informe o resultado comunicado</label><textarea class="texto" id="cor-${e.id}-conclusion" rows="2" maxlength="500" placeholder="Copia fiel de la conclusión">${esc(e.conclusion)}</textarea></div>
      <div class="campo"><label for="cor-${e.id}-explicacion">Explicación sencilla para Juan</label><textarea class="texto" id="cor-${e.id}-explicacion" rows="2" maxlength="500" placeholder="Qué significa en palabras claras, sin prometer de más">${esc(e.explicacion)}</textarea></div>
      <div class="campo"><label for="cor-${e.id}-fuente">Origen del dato (documento, hospital o profesional)</label><input class="texto" id="cor-${e.id}-fuente" maxlength="160" value="${esc(e.fuente)}" placeholder="Ej: Informe de ecocardiograma / Resumen familiar"></div>
      <div class="campo"><label for="cor-${e.id}-pendiente">Qué falta verificar en este estudio</label><input class="texto" id="cor-${e.id}-pendiente" maxlength="240" value="${esc(e.pendiente)}"></div>
    </div>`).join('')}
    <button type="button" class="btn pri" data-a="guardarCorazon">${ico('check')}Guardar informes</button>
  </div>`;
}

function vistaVisualJuan(sub, d) {
  return `<div class="envoltura corazon-vista juan-visual">
    <a class="btn quieto izq" href="#hoy">${ico('left')}Volver a Hoy</a>
    ${tarjetaRecuperacion()}
    <details class="panel comida-menu" data-k="informes-visuales"${sub === 'sabemos' || sub === 'falta' ? ' open' : ''}><summary>Mis registros e informes</summary>
      ${d.resumenGeneral ? `<p class="sub grande">${esc(d.resumenGeneral)}</p>` : '<p class="sub">Aquí puedes ver los estudios anotados y los que faltan.</p>'}
      ${bloqueRegistrosCasa()}${bloqueInformes(d, sub === 'falta' ? 'falta' : 'todo')}
    </details>
    <details class="panel comida-menu" data-k="recuperacion-detalle"><summary>Etapas y próximos controles</summary>${bloqueMapaRecuperacion()}</details>
    <details class="panel comida-menu" data-k="preguntas-detalle"><summary>Preguntas y respuestas</summary>${bloquePreguntasFrecuentes()}</details>
    <details class="panel comida-menu" data-k="fuentes-detalle"><summary>Fuentes y señales de alarma</summary>${bloqueFuentesGenerales()}</details>
    <a class="btn sec" href="#agenda/cuidados">${ico('leaf')}Ver mis indicaciones</a>
  </div>`;
}

export function render(args) {
  const sub = args && args[0] ? args[0] : 'todo';
  if (sub === 'editar') return editorCorazon();
  const d = datosCorazon();
  if (esJuan()) return vistaVisualJuan(sub, d);
  const pestanas = [
    ['todo', 'Todo'],
    ['sabemos', '¿Qué sabemos?'],
    ['falta', '¿Qué falta saber?'],
    ['recuperacion', 'Recuperación'],
  ];
  return `<div class="envoltura corazon-vista">
    <a class="btn quieto izq" href="#hoy">${ico('left')}Volver a Hoy</a>
    <div class="panel cuidado">
      <h2 class="h3">${esJuan() ? 'Entender tu corazón, paso a paso' : 'El corazón de Juan: registros, informes y guía'}</h2>
      <p class="sub">Aquí distinguimos claramente tres cosas: lo que anotamos en casa, lo que dicen los informes médicos y la información educativa general.</p>
      ${svgTresFuentes()}
    </div>
    <div class="opciones envuelve" role="navigation" aria-label="Apartados de Mi corazón">
      ${pestanas.map(([k, n]) => `<a class="opcion${sub === k ? ' sel' : ''}" href="#corazon${k === 'todo' ? '' : '/' + k}"${sub === k ? ' aria-current="page"' : ''}>${n}</a>`).join('')}
    </div>
    ${sub === 'todo' || sub === 'sabemos' ? bloqueRegistrosCasa() : ''}
    ${sub === 'todo' || sub === 'sabemos' || sub === 'falta' ? bloqueInformes(d, sub === 'falta' ? 'falta' : 'todo') : ''}
    ${sub === 'todo' || sub === 'recuperacion' ? bloqueMapaRecuperacion() : ''}
    ${bloquePreguntasFrecuentes()}
    ${bloqueFuentesGenerales()}
  </div>`;
}

export const titulo = (args) => (args && args[0] === 'editar' ? 'Informes' : 'Mi corazón');

acciones.elegirEtapaCorazon = (d) => { estado.ui.etapaCorazon = Number(d.v); pintar(); };
acciones.alternarFaqCorazon = (d) => {
  if (!estado.ui.faqCorazon) estado.ui.faqCorazon = {};
  estado.ui.faqCorazon[d.id] = !estado.ui.faqCorazon[d.id];
  pintar();
};
acciones.guardarCorazon = () => {
  if (!esAdmin()) return;
  const estudios = ESTUDIOS_BASE.map((b) => {
    const origen = val(`cor-${b.id}-origen`) || 'pendiente';
    return {
      id: b.id,
      origen: ORIGEN_ETIQUETA[origen] ? origen : 'pendiente',
      fecha: val(`cor-${b.id}-fecha`),
      conclusion: porId(`cor-${b.id}-conclusion`) ? porId(`cor-${b.id}-conclusion`).value.trim() : '',
      explicacion: porId(`cor-${b.id}-explicacion`) ? porId(`cor-${b.id}-explicacion`).value.trim() : '',
      fuente: val(`cor-${b.id}-fuente`),
      pendiente: val(`cor-${b.id}-pendiente`),
    };
  });
  const editado = { quien: estado.quien, ts: Date.now() };
  const corazon = {
    resumenGeneral: porId('cor-resumen') ? porId('cor-resumen').value.trim() : '',
    estudios,
    editado,
  };
  db.guardarConfig({ corazon, editado });
  aviso('Informes del corazón guardados');
  location.hash = '#corazon';
};
