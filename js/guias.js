// Guías visuales: cómo usar las máquinas de la casa y cómo armar las comidas.
// Son pasos generales con respaldo público (CDC y FDA). No reemplazan el manual de cada aparato
// ni las indicaciones del equipo de salud. Los dibujos son de referencia y no muestran lecturas reales.
import { ico } from './util.js';

const marco = (titulo, dibujo, extra, pasos, pie) => `<details class="plegable guia-maq"><summary>${ico('info')}Cómo usar nuestra máquina${ico('down', 'giro')}</summary>
  <div class="guia-cuerpo"><p class="h3">${titulo}</p>${dibujo}${extra}
    <ol class="pasos">${pasos.map((p) => `<li>${p}</li>`).join('')}</ol>${pie.map((p) => `<p class="nota">${p}</p>`).join('')}</div></details>`;
const equivale = (filas) => `<ul class="equivale">${filas.map(([a, b]) => `<li><b>${a}</b><span>${b}</span></li>`).join('')}</ul>`;

const DIBUJO_TENSIOMETRO = `<svg class="dibujo" viewBox="0 0 320 210" role="img" aria-label="Dibujo del tensiómetro: tres números en la pantalla y el botón Inicio al medio">
  <rect class="cuerpo" x="14" y="8" width="292" height="194" rx="46"/>
  <g class="tenue"><line x1="38" y1="58" x2="58" y2="58"/><line x1="44" y1="78" x2="58" y2="78"/><line x1="38" y1="98" x2="58" y2="98"/><line x1="38" y1="116" x2="58" y2="116"/></g>
  <text class="chico" x="34" y="140">OMS</text>
  <rect class="pantalla" x="76" y="28" width="128" height="120" rx="10"/>
  <text class="num" x="192" y="66" text-anchor="end">– – –</text>
  <text class="num" x="192" y="103" text-anchor="end">– –</text>
  <text class="num" x="192" y="138" text-anchor="end">– –</text>
  <text class="rot" x="214" y="62">Sistema</text><text class="rot" x="214" y="99">Día</text><text class="rot" x="214" y="134">Bey/MIN</text>
  <rect class="boton" x="66" y="160" width="58" height="30" rx="9"/><text class="chico" x="95" y="180" text-anchor="middle">Config.</text>
  <rect class="boton fuerte" x="132" y="160" width="56" height="30" rx="9"/><text class="chico fuerte" x="160" y="180" text-anchor="middle">Inicio</text>
  <rect class="boton" x="196" y="160" width="62" height="30" rx="9"/><text class="chico" x="227" y="180" text-anchor="middle">Memoria</text>
</svg>`;

const DIBUJO_GLUCOMETRO = `<svg class="dibujo" viewBox="0 0 320 200" role="img" aria-label="Dibujo del medidor de azúcar, la tira y la gota">
  <rect class="cuerpo" x="24" y="8" width="118" height="184" rx="52"/>
  <rect class="boton" x="44" y="30" width="22" height="22" rx="6"/><rect class="boton" x="72" y="30" width="22" height="22" rx="6"/><rect class="boton" x="100" y="30" width="22" height="22" rx="6"/>
  <text class="chico" x="83" y="46" text-anchor="middle">S</text>
  <rect class="pantalla" x="44" y="62" width="78" height="72" rx="8"/>
  <text class="num" x="83" y="108" text-anchor="middle">– – –</text>
  <text class="chico" x="83" y="164" text-anchor="middle">CareSens</text>
  <rect class="tira" x="188" y="30" width="20" height="92" rx="5"/><rect class="tira punta" x="188" y="30" width="20" height="16" rx="5"/>
  <text class="rot" x="220" y="62">Tira</text><text class="rot" x="220" y="82">CareSens S</text>
  <path class="gota" d="M198 146c9 11 13 17 13 23a13 13 0 0 1-26 0c0-6 4-12 13-23z"/>
  <text class="rot" x="220" y="174">Gota</text>
</svg>`;

const DIBUJO_OXIMETRO = `<svg class="dibujo" viewBox="0 0 320 170" role="img" aria-label="Dibujo del oxímetro puesto en el dedo">
  <path class="dedo" d="M0 70h96a22 22 0 0 1 0 44H0z"/>
  <rect class="cuerpo" x="70" y="22" width="176" height="126" rx="30"/>
  <rect class="pantalla" x="96" y="42" width="124" height="86" rx="8"/>
  <text class="chico" x="108" y="64">SpO2 %</text><text class="num" x="208" y="78" text-anchor="end">– –</text>
  <text class="chico" x="108" y="106">PR</text><text class="num" x="208" y="118" text-anchor="end">– –</text>
  <text class="rot" x="256" y="70">Oxígeno</text><text class="rot" x="256" y="112">Pulso</text>
</svg>`;

const GUIAS = {
  presion: () => marco('Tensiómetro de brazo MediCor BP-A1', DIBUJO_TENSIOMETRO,
    equivale([['Sistema', 'se anota en Arriba'], ['Día', 'se anota en Abajo'], ['Bey/MIN', 'se anota en Pulso']]),
    ['Media hora antes: sin café, cigarro ni ejercicio. Pasar al baño primero.',
      'Sentado 5 minutos, con la espalda apoyada y los pies en el suelo, sin cruzar las piernas.',
      'Manguito sobre el brazo sin ropa, firme pero sin apretar. El brazo apoyado en la mesa, a la altura del pecho.',
      'Apretar <b>Inicio</b> y quedarse quieto y sin hablar hasta que termine.',
      'Anotar aquí los tres números. Si se mide de nuevo, esperar 1 a 2 minutos y anotar las dos lecturas.'],
    ['El aparato guarda la memoria de 2 usuarios: usar siempre el mismo para Juan. Si muestra el aviso de latido irregular, escribirlo en la nota.',
      'La escala de colores del aparato (OMS) y los números de la caja no son la meta de Juan.',
      'Pasos generales de los CDC. Este aparato no trae manual: sus símbolos y errores quedan pendientes.']),
  azucar: () => marco('Medidor CareSens S Fit BT, con tiras CareSens S', DIBUJO_GLUCOMETRO, '',
    ['Lavarse las manos con agua tibia y jabón, y secarlas bien.',
      'Poner una tira nueva en el medidor.',
      'Pinchar el dedo con el lancetero.',
      'Acercar la gota a la tira, con suavidad. En unos segundos aparece el número.',
      'Anotar aquí el número, la hora y si fue antes o después de comer.'],
    ['El número se anota tal como sale, en mg/dL. No se corrige ni se redondea.',
      'Pasos generales de los CDC. Falta el manual de este medidor para los símbolos, los errores y el cambio de lanceta.']),
  oxigeno: () => marco('Oxímetro de dedo', DIBUJO_OXIMETRO,
    equivale([['SpO2 %', 'es el oxígeno: se anota aquí'], ['PR', 'es el pulso']]),
    ['La mano tibia, relajada y más abajo que el corazón.',
      'Sin esmalte en ese dedo.',
      'Quieto, sin mover la mano.',
      'Esperar unos segundos, hasta que el número deje de cambiar.',
      'Anotar el porcentaje.'],
    ['Si no está puesto en el dedo, lo que muestre la pantalla no es una medición.',
      'El oxígeno no tiene horario en la rutina: se mide cuando haga falta o si lo pide el médico.',
      'Pasos generales de la FDA. Falta identificar la marca del oxímetro para sumar su manual.']),
  pulso: () => `<p class="nota aviso-info">${ico('info')}El pulso sale en el tensiómetro (Bey/MIN) y en el oxímetro (PR). Si se mide la presión, es más fácil anotarlo ahí mismo.</p>`,
};
export const guiaMaquina = (t) => (GUIAS[t] ? GUIAS[t]() : '');

// ---------- Comidas ----------
// Ideas generales con comida chilena de todos los días. Las porciones no van aquí: las indica la nutricionista.
export const SECCIONES_GUIA = [['desayuno', 'Desayuno', 'cup'], ['almuerzo', 'Almuerzo', 'soup'], ['once', 'Once', 'apple'], ['colaciones', 'Colaciones', 'leaf']];
export const GUIA_COMIDAS = {
  desayuno: {
    intro: 'Algo con proteína, un carbohidrato y, si se puede, una verdura o una fruta entera.',
    ideas: [
      ['Pan con huevo y tomate', 'Huevo revuelto o duro, con poco aceite. Tomate en rodajas.', 'El huevo aporta proteína y el tomate suma verdura.'],
      ['Avena con leche y fruta', 'Cocer la avena en leche sin azúcar unos minutos. Fruta picada al final.', 'La avena tiene fibra. La leche y la fruta también cuentan como carbohidrato.'],
      ['Pan con quesillo y tomate', 'Quesillo en láminas, tomate y orégano.', 'Se arma rápido y lleva proteína.'],
      ['Pan con palta', 'Palta molida con unas gotas de limón.', 'Conocido y fácil. Con té o café sin azúcar.'],
    ],
  },
  almuerzo: {
    intro: 'El plato se arma en tres partes. Sirve para cualquier almuerzo de la casa.',
    ideas: [
      ['Lentejas con zapallo y ensalada', 'Lentejas con zapallo y zanahoria, sin longaniza. Ensalada verde al lado.', 'Las legumbres cuentan como proteína y también como carbohidrato: ese día el arroz o el pan va en menos cantidad.'],
      ['Pollo al horno con arroz y ensalada', 'Pollo sin piel al horno. Ensalada chilena o de lechuga.', 'El arroz ocupa solo su cuarto del plato.'],
      ['Cazuela', 'Con harta verdura y la presa.', 'La papa, el choclo y el arroz comparten el mismo cuarto: no se suman los tres.'],
      ['Pescado con verduras', 'Pescado al horno o a la plancha, con verduras salteadas o ensalada.', 'Medio plato de verduras y un cuarto de papas cocidas o arroz.'],
      ['Tortilla de verduras', 'De acelga o zapallo italiano, al horno o con poco aceite.', 'El huevo es la proteína y la verdura ya va dentro.'],
    ],
  },
  once: {
    intro: 'Se puede armar igual que el desayuno. Si reemplaza la cena, conviene sumarle verdura.',
    ideas: [
      ['Pan con quesillo y lechuga', 'Con tomate o pepino si hay.', 'Proteína y verdura en el mismo pan.'],
      ['Huevo con ensalada', 'Huevo duro o revuelto con ensalada de lo que haya.', 'Sirve cuando la once es la última comida del día.'],
      ['Yogur con fruta', 'Yogur natural sin azúcar añadida, con fruta entera picada.', 'Sin azúcar añadida no significa sin carbohidratos: conviene mirar la etiqueta.'],
      ['Para tomar', 'Té, agua de hierbas o agua con limón, sin azúcar.', 'Las bebidas y los jugos en polvo con azúcar suben el azúcar en la sangre.'],
    ],
  },
  colaciones: {
    intro: 'Son para cuando tenga hambre entre comidas, o si su pauta las indica. No son obligatorias.',
    ideas: [
      ['Una fruta entera', 'Lavada y con cáscara si se puede.', 'Entera llena más que en jugo.'],
      ['Yogur natural', 'Sin azúcar añadida.', 'Conviene mirar la etiqueta: no todos los yogures son iguales.'],
      ['Verduras crudas', 'Palitos de apio o zanahoria, con unas gotas de limón.', 'Casi no suben el azúcar.'],
      ['Un huevo duro', 'Se puede dejar cocido en el refrigerador.', 'Proteína simple.'],
    ],
    notas: ['Servir la colación en un plato: no comer directo de la bolsa o la caja.',
      'Una colación no es lo mismo que atender una baja de azúcar. Si el aparato marca menos de 70, seguir lo que indica la app al anotar la medición.'],
  },
};

export const PARTES_PLATO = [
  ['p1', 'a', 'La mitad: verduras', 'Ensaladas, acelga, zapallo italiano, porotos verdes. Aportan fibra.'],
  ['p2', 'b', 'Un cuarto: proteínas', 'Pollo, pescado, huevo o legumbres. Ayudan a mantener los músculos y los tejidos.'],
  ['p3', 'c', 'Un cuarto: carbohidratos', 'Pan, arroz, fideos, papa o choclo: se elige uno, no se suman. Repartirlos parecido en cada comida ayuda a manejar el azúcar.'],
];

// Plato grande. Cada parte aparece por etapas (ver .plato-g en los estilos); sin animación queda completo.
export const platoGrande = () => `<svg class="plato-g" viewBox="0 0 300 300" role="img" aria-label="Plato: la mitad verduras, un cuarto proteínas y un cuarto carbohidratos">
  <circle class="loza" cx="150" cy="150" r="146"/>
  <g class="parte p1"><path class="a" d="M150 20a130 130 0 0 0 0 260z"/><text x="84" y="146" text-anchor="middle">Verduras</text><text class="menor" x="84" y="170" text-anchor="middle">la mitad</text></g>
  <g class="parte p2"><path class="b" d="M150 150V20a130 130 0 0 1 130 130z"/><text x="208" y="96" text-anchor="middle">Proteínas</text><text class="menor" x="208" y="118" text-anchor="middle">un cuarto</text></g>
  <g class="parte p3"><path class="c" d="M150 150h130a130 130 0 0 1-130 130z"/><text x="208" y="196" text-anchor="middle">Pan, arroz</text><text x="208" y="218" text-anchor="middle">o papa</text><text class="menor" x="204" y="240" text-anchor="middle">un cuarto</text></g>
</svg>`;

// Dibujo sobrio de plato y corazón para el encabezado de Comidas (ilustración educativa, sin latido en bucle).
export const dibujoPlatoCorazon = () => `<svg class="plato-corazon" viewBox="0 0 128 68" role="img" aria-label="Ilustración educativa: plato equilibrado y cuidado del corazón">
  <g class="pc-plato">
    <circle class="loza" cx="34" cy="34" r="28"/>
    <path class="a" d="M34 10a24 24 0 0 0 0 48z"/>
    <path class="b" d="M34 34V10a24 24 0 0 1 24 24z"/>
    <path class="c" d="M34 34h24a24 24 0 0 1-24 24z"/>
  </g>
  <path class="pc-puente" d="M66 34h14" stroke-dasharray="3 3"/>
  <g class="pc-corazon">
    <circle class="pc-fondo" cx="98" cy="34" r="24"/>
    <path class="pc-trazo" d="M98 46.5 87.2 35.8a7.4 7.4 0 0 1 10.8-10.1 7.4 7.4 0 0 1 10.8 10.1z"/>
  </g>
</svg>`;

export const PASOS_COMIDA_CORAZON = [
  ['1. Armar el plato con medida', 'Verduras en la mitad del plato, una proteína magra (pescado, pollo sin piel, legumbres o huevo) y una porción medida de carbohidratos, cocinando con poca sal y sin azúcar añadida.'],
  ['2. Acompañar el azúcar y la presión', 'Repartir los carbohidratos de forma ordenada ayuda a evitar subidas bruscas de glucosa después de comer, y comer con menos sal apoya el manejo de la presión arterial.'],
  ['3. Cuidar los vasos sanguíneos a largo plazo', 'Mantener la glucosa, la presión y el colesterol en rango a lo largo de las semanas disminuye la exigencia sobre los vasos sanguíneos y el corazón.'],
];

export const FUENTES_COMIDA_CORAZON = [
  {
    org: 'American Heart Association (AHA)',
    tema: 'Patrón general de alimentación y estilo de vida cardiovascular',
    url: 'https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/nutrition-basics/aha-diet-and-lifestyle-recommendations',
    consulta: 'Consultado el 14 de noviembre de 2026',
  },
  {
    org: 'Centers for Disease Control and Prevention (CDC)',
    tema: 'Relación entre control de la glucosa, presión arterial y cuidado del corazón',
    url: 'https://www.cdc.gov/diabetes/diabetes-complications/diabetes-and-your-heart.html',
    consulta: 'Consultado el 14 de noviembre de 2026',
  },
];
