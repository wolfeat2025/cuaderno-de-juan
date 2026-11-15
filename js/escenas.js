// Escenas de "Mi recuperación": dibujos planos de objetos de la casa, sin brillos ni partículas.
// Cada escena recibe la duración de su tramo de audio (s) y ubica las entradas en fracciones de ese tramo,
// para que cada cosa aparezca cuando la voz la nombra. Lienzo 360 × 280.

// Envoltorio animado: la animación CSS va en un <g> propio, así no pisa la posición del dibujo.
const A = (cls, s, inner, extra = '') => `<g class="${cls}" style="--d:${s.toFixed(2)}s;${extra}">${inner}</g>`;
const at = (x, y, sc, inner) => `<g transform="translate(${x} ${y})${sc && sc !== 1 ? ` scale(${sc})` : ''}">${inner}</g>`;
const palabra = (txt, s, acc) => A('pop', s, `<text class="palabra${acc ? ' acc' : ''}" x="180" y="262" text-anchor="middle">${txt}</text>`);
const rotulo = (x, y, txt, s, anchor = 'middle') => A('e', s, `<text class="rot" x="${x}" y="${y}" text-anchor="${anchor}">${txt}</text>`);
const flecha = (x1, y, x2, s) => A('e', s, `<path class="flecha" d="M${x1} ${y}H${x2}m-10-10 10 10-10 10"/>`);

// ---------- Objetos (plano con volumen: color base, lado en sombra, brillo y sombra en el suelo) ----------
const suelo = (rx, y = 0) => `<ellipse class="suelo" cy="${y}" rx="${rx}" ry="${(rx * 0.16).toFixed(1)}"/>`;
// Persona plana con volumen: lado en sombra, cuello, pelo canoso. `pose`: de pie, camina, pecho, aire, mareo, bata.
const persona = (pose = '', ropa = 'ropa') => {
  const camina = pose === 'camina';
  const piernas = camina
    ? '<path class="pantalon" d="M-9 0h9l-7 26h-8z"/><path class="pantalon-s" d="M1 0h9l5 26h-8z"/><path class="zapato" d="M-15 26h9v4h-12a2 2 0 0 1 3-4z"/><path class="zapato" d="M7 26h9a3 3 0 0 1 3 4h-12z"/>'
    : '<path class="pantalon" d="M-11 0h10v26h-9z"/><path class="pantalon-s" d="M1 0h10l-1 26h-9z"/><path class="zapato" d="M-11 26h10v4h-12a2 2 0 0 1 2-4z"/><path class="zapato" d="M1 26h10a2 2 0 0 1 2 4h-12z"/>';
  const brazoIzq = pose === 'pecho' ? `<path class="${ropa}" d="M-15-27c-6 6-6 16 2 18l14-6-2-6-10 3c0-4 1-7 2-9z"/><circle class="piel" cx="2" cy="-15" r="4.5"/>`
    : camina ? `<path class="${ropa}" d="M-15-27l-11 20 6 3 10-17z"/><circle class="piel" cx="-23" cy="-5" r="4.2"/>`
    : `<path class="${ropa}" d="M-15-27l-6 26h6l5-21z"/><circle class="piel" cx="-18" cy="1" r="4.2"/>`;
  const brazoDer = pose === 'mareo' ? `<path class="${ropa}-s" d="M15-27l9-14-5-3-9 13z"/><circle class="piel" cx="21" cy="-44" r="4.2"/>`
    : camina ? `<path class="${ropa}-s" d="M15-27l9 20-6 2-8-17z"/><circle class="piel" cx="21" cy="-4" r="4.2"/>`
    : `<path class="${ropa}-s" d="M15-27l6 26h-6l-5-21z"/><circle class="piel" cx="18" cy="1" r="4.2"/>`;
  const extra = pose === 'aire' ? '<path class="trazo-amb" d="M13-50c6 0 8 3 14 3M13-44c5 1 7 4 12 5"/>'
    : pose === 'mareo' ? '<path class="trazo-amb" d="M-14-64c4-6 24-6 28 0" stroke-dasharray="3 5"/><circle class="estrella" cx="-12" cy="-66" r="2.4"/><circle class="estrella" cx="12" cy="-67" r="2.4"/>'
    : pose === 'bata' ? '<path class="esteto" d="M-6-30v9a6 6 0 0 0 12 0v-9"/><circle class="esteto-c" cx="0" cy="-15" r="2.6"/>' : '';
  return `${suelo(19, 31)}${piernas}${brazoIzq}<path class="${ropa}" d="M-15-30c10-4 20-4 30 0l2 31h-34z"/><path class="${ropa}-s" d="M3-32c5 0 9 1 12 2l2 31h-14z"/>${brazoDer}<rect class="piel-s" x="-4" y="-37" width="8" height="8" rx="2"/><circle class="piel" cy="-46" r="11"/><path class="pelo" d="M-11-47a11 11 0 0 1 22-1c-2-5-7-8-11-8s-9 3-11 9z"/>${extra}`;
};
const O = {
  corazon: (zona) => `${suelo(40, 50)}<path class="cz" d="M0 44C-58 10-64-30-34-44c16-7 28 1 34 11 6-10 18-18 34-11 30 14 24 54-34 88z"/><path class="cz-s" d="M0 44c8-6 50-34 46-66-2-8-6-14-12-17 28 18 18 52-34 83z"/><path class="brillo" d="M-38-30c4-6 10-8 16-7"/>${zona || ''}`,
  marraqueta: () => `${suelo(34, 16)}<path class="pan" d="M-36 2c0-12 10-18 18-18 6 0 10 2 12 4 2-2 6-4 12-4s10 2 12 4c2-2 6-4 12-4 8 0 18 6 18 18-2 10-14 14-36 14S-34 12-36 2z" transform="scale(.82)"/><path class="pan-s" d="M-30 6c4 6 14 8 30 8s26-2 30-8c-2 6-12 10-30 10S-28 12-30 6z"/><path class="pan-l" d="M0-12v24M-15-10c-3 6-3 14 0 20M15-10c3 6 3 14 0 20"/><path class="brillo" d="M-24-8c3-3 7-4 10-4"/>`,
  salero: () => `${suelo(16, 25)}<path class="vidrio" d="M-14-6h28l-3 30h-22z"/><path class="sal" d="M-12.5 8h25l-1.6 15h-21.8z"/><path class="brillo-v" d="M-9-2l-1.6 22"/><path class="tapa" d="M-15-6c0-10 6-16 15-16s15 6 15 16z"/><path class="tapa-s" d="M2-21c7 2 13 7 13 15h-8c0-6-2-11-5-15z"/><circle class="hoyo" cx="-5" cy="-12" r="1.6"/><circle class="hoyo" cx="0" cy="-15" r="1.6"/><circle class="hoyo" cx="5" cy="-12" r="1.6"/>`,
  queso: () => `${suelo(24, 16)}<path class="queso" d="M-26 14 20-16l8 30z"/><path class="queso-s" d="M20-16l8 30h-12z"/><circle class="queso-h" cx="0" cy="6" r="3.8"/><circle class="queso-h" cx="12" cy="-4" r="2.6"/><circle class="queso-h" cx="-12" cy="10" r="2"/>`,
  cecina: () => `${suelo(20, 21)}<circle class="cec" r="20"/><circle class="cec2" r="16"/><path class="cec-s" d="M10-12a16 16 0 0 1-2 26 16 16 0 0 0 2-26z"/><circle class="cec-p" cx="-6" cy="-5" r="2.8"/><circle class="cec-p" cx="6" cy="-8" r="2.1"/><circle class="cec-p" cx="3" cy="6" r="3"/><circle class="cec-p" cx="-8" cy="7" r="2.1"/><circle class="cec-p" cx="10" cy="2" r="1.7"/>`,
  caldo: () => `${suelo(17, 18)}<path class="caldo" d="M-16-8 0-17l16 9v18L0 18l-16-9z"/><path class="caldo-s" d="M0 0l16-8v18L0 18z"/><path class="caldo-t" d="M-16-8 0-17l16 9L0 0z"/><path class="caldo-r" d="M-13 2l10 5"/>`,
  arroz: () => `${suelo(26, 20)}<path class="arroz" d="M-24-2c0-14 11-22 24-22s24 8 24 22z"/>${[[-10, -10], [-2, -16], [8, -12], [14, -6], [-16, -5], [2, -7]].map(([x, y]) => `<ellipse class="grano-a" cx="${x}" cy="${y}" rx="2.2" ry="1.2"/>`).join('')}<path class="taza" d="M-27-2h54a27 22 0 0 1-54 0z"/><path class="taza-s" d="M10-2h17a27 22 0 0 1-17 20z"/>`,
  papa: () => `${suelo(24, 16)}<path class="papa" d="M-24 2c-2-12 10-20 24-18s26 6 24 16-12 18-26 16-20-4-22-14z"/><path class="papa-s" d="M-12 14c14 4 32 0 34-14 2 14-12 22-34 14z"/><circle class="papa-o" cx="-8" cy="-4" r="1.8"/><circle class="papa-o" cx="9" cy="3" r="1.8"/><circle class="papa-o" cx="12" cy="-7" r="1.4"/>`,
  bebida: () => `${suelo(16, 33)}<path class="botella" d="M-6-36h12v9c6 4 9 9 9 16v39a4 4 0 0 1-4 4h-22a4 4 0 0 1-4-4v-39c0-7 3-12 9-16z"/><path class="botella-s" d="M4-27c6 4 9 9 9 16v39a4 4 0 0 1-4 4h-5z"/><rect class="etiqueta" x="-15" y="-4" width="30" height="16"/><rect class="etiqueta" x="-7" y="-42" width="14" height="7" rx="2"/><path class="brillo" d="M-8-18v40"/>`,
  vaso: () => `${suelo(16, 27)}<path class="vidrio" d="M-17-26h34l-4 52h-26z"/><path class="agua" d="M-15-6h30l-2.6 30h-24.8z"/><path class="agua-t" d="M-15-6h30v3h-30z"/><path class="brillo-v" d="M-11-20l-2 40"/>`,
  plato: () => '<ellipse cy="5" rx="48" ry="15" class="suelo"/><ellipse rx="48" ry="15" class="loza"/><ellipse rx="33" ry="9.5" class="loza-l"/>',
  platoLleno: () => `${suelo(40, 42)}<circle r="42" class="loza"/><circle r="34" class="loza-l"/>
    <path class="verd" d="M-2-33a33 33 0 0 0 0 66z"/>${[[-20, -14], [-12, 4], [-22, 12], [-10, -22]].map(([x, y]) => `<circle class="verd-c" cx="${x}" cy="${y}" r="5"/>`).join('')}
    <path class="prot" d="M2 -1V-33a33 33 0 0 1 31 31z"/><path class="prot-s" d="M12-22c6 4 10 10 12 18h-14z"/>
    <path class="carbo" d="M2 2h31a33 33 0 0 1-31 31z"/>${[[10, 10], [18, 14], [12, 20], [22, 8]].map(([x, y]) => `<ellipse class="grano-a" cx="${x}" cy="${y}" rx="2.2" ry="1.2"/>`).join('')}`,
  pastillero: () => `${suelo(46, 20)}<rect x="-46" y="-17" width="92" height="34" rx="9" class="pastillero"/><rect x="-46" y="5" width="92" height="12" rx="6" class="pastillero-s"/>${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => `<rect x="${-42 + i * 12.2}" y="-12" width="9.5" height="20" rx="3" class="pastillero-c"/><text class="dia" x="${-37.2 + i * 12.2}" y="2" text-anchor="middle">${d}</text>`).join('')}`,
  zapatilla: () => `${suelo(32, 20)}<path class="zap" d="M-32 8c0-12 6-24 14-26 6 8 18 10 28 10 12 0 22 4 22 16z"/><path class="zap-s" d="M6-8c12 0 22 4 26 16h-18c0-8-4-14-8-16z"/><path class="zap-p" d="M-34 8h66v6a5 5 0 0 1-5 5h-56a5 5 0 0 1-5-5z"/><path class="zap-l" d="M-14-10l7 6M-7-13l7 6M0-14l6 6"/>`,
  persona: () => persona(),
  caminante: () => persona('camina'),
  medico: () => persona('bata', 'bata'),
  sintoma: (pose) => persona(pose),
  casa: () => `${suelo(70, 62)}<path class="casa" d="M-58-2 0-44l58 42v64h-116z"/><path class="casa-s" d="M0-44l58 42v64H20V-30z"/><path class="techo" d="M-68 4 0-50 68 4"/><rect class="chimenea" x="28" y="-40" width="12" height="22"/><rect class="ventana" x="-44" y="14" width="24" height="22" rx="3"/><path class="ventana-l" d="M-32 14v22M-44 25h24"/><rect class="puerta" x="0" y="22" width="24" height="40" rx="3"/><circle class="pomo" cx="19" cy="44" r="2"/>`,
  reloj: () => `<circle class="reloj-s" cy="3" r="22"/><circle class="reloj" r="22"/>${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => { const a = i * Math.PI / 6; return `<circle class="marca-r" cx="${(Math.sin(a) * 17).toFixed(1)}" cy="${(-Math.cos(a) * 17).toFixed(1)}" r="${i % 3 ? 1 : 1.8}"/>`; }).join('')}<path class="aguja-r" d="M0 0V-12M0 0l8 5"/><circle class="eje" r="2.4"/>`,
  telefono: () => `${suelo(24, 40)}<rect class="tel" x="-24" y="-38" width="48" height="76" rx="11"/><rect class="tel-p" x="-19" y="-30" width="38" height="58" rx="6"/><text class="tel-t" y="-4" text-anchor="middle">131</text><path class="tel-i" d="M-8 10c0 6 10 14 16 14l3-4-5-3-3 2c-3-1-6-4-7-7l2-3-3-5z"/>`,
  mano: () => `<path class="mano" d="M-15 26v-32a5 5 0 0 1 10 0v-12a5 5 0 0 1 10 0v6a5 5 0 0 1 10 0v6a5 5 0 0 1 10 0v28c0 13-10 22-23 22s-17-6-17-18z"/><path class="mano-s" d="M10 24v-12a5 5 0 0 1 10 0v16c0 13-10 22-23 22 8-4 13-14 13-26z"/>`,
  planta: () => `${suelo(18, 30)}<path class="hoja" d="M0 6c-3-18-16-26-26-26 2 14 10 24 26 26z"/><path class="hoja-s" d="M0 6c3-18 16-26 26-26-2 14-10 24-26 26z"/><path class="hoja" d="M0 4c-2-14 2-26 8-32 4 10 2 22-8 32z"/><path class="maceta" d="M-17 6h34l-4 23h-26z"/><path class="maceta-s" d="M4 6h13l-4 23h-9z"/><rect class="maceta-b" x="-19" y="3" width="38" height="7" rx="3"/>`,
  bolsa: () => `${suelo(28, 32)}<path class="asa" d="M-12-10c0-16 24-16 24 0"/><path class="bolsa" d="M-24-10h48l6 40h-60z"/><path class="bolsa-s" d="M8-10h16l6 40h-18z"/><path class="pesa" d="M-12 6h24v14h-24z"/><text class="dia" x="0" y="17" text-anchor="middle">5 kg</text>`,
  panuelo: () => `<path class="baston" d="M-2 30-6-8"/><path class="panuelo" d="M-6-8c10-8 22 4 34-4-2 12 4 22 0 32-12-4-22 4-30-4 2-8-6-16-4-24z"/><path class="panuelo-s" d="M14 6c6-2 10-4 14-4-2 6 0 12-2 18-6-2-10 0-14-2z"/><path class="panuelo-l" d="M-2 0c8-4 16 2 26-2"/>`,
  balanza: () => `${suelo(52, 36)}<rect class="balanza" x="-50" y="-32" width="100" height="64" rx="16"/><rect class="balanza-s" x="-50" y="16" width="100" height="16" rx="8"/><rect class="display" x="-22" y="-24" width="44" height="18" rx="5"/><text class="display-t" y="-10" text-anchor="middle">kg</text><ellipse class="pie-b" cx="-22" cy="6" rx="11" ry="7"/><ellipse class="pie-b" cx="22" cy="6" rx="11" ry="7"/>`,
  gota: () => '<path class="gota" d="M0-15c7 9 10 13 10 17a10 10 0 0 1-20 0c0-4 3-8 10-17z"/><path class="brillo" d="M-5 0a5 5 0 0 0 3 5"/>',
  huevo: () => `${suelo(14, 20)}<ellipse class="huevo" rx="15" ry="19"/><path class="huevo-s" d="M5-17c8 6 10 16 6 26-3 6-8 9-13 10 12-8 12-26 7-36z"/><path class="brillo" d="M-8-8c1-4 3-7 6-8"/>`,
  pescado: () => `${suelo(26, 14)}<path class="pez" d="M-28 0c10-15 32-15 42 0-10 15-32 15-42 0z"/><path class="pez-s" d="M-26 3c12 10 30 10 40-3-10 15-32 15-40 3z"/><path class="pez" d="M14 0l15-11v22z"/><path class="pez-l" d="M-6-8c4 4 4 12 0 16"/><circle class="ojo" cx="-17" cy="-3" r="2.4"/>`,
  pollo: () => `${suelo(24, 22)}<path class="hueso" d="M-26 18a5 5 0 1 1 4-8l10-10 6 6-10 10a5 5 0 1 1-10 2z"/><path class="pollo" d="M-10 2c-6-12 2-24 14-26 14-2 26 10 22 22-4 10-16 14-26 10z"/><path class="pollo-s" d="M2 10c12 2 22-4 24-12 0 12-12 18-24 14z"/><path class="brillo" d="M-2-16c4-3 8-4 12-3"/>`,
  porotos: () => `${suelo(28, 20)}${[[-14, -7], [-4, -11], [7, -7], [16, -10], [-9, -15], [4, -16], [12, -14]].map(([x, y]) => `<ellipse class="poroto" cx="${x}" cy="${y}" rx="6" ry="4"/>`).join('')}<path class="taza" d="M-28-4h56a28 22 0 0 1-56 0z"/><path class="taza-s" d="M10-4h18a28 22 0 0 1-18 20z"/>`,
  leche: () => `${suelo(16, 30)}<path class="caja" d="M-15-28h30v56h-30z"/><path class="caja-s" d="M5-28h10v56H5z"/><path class="caja-t" d="M-15-28 0-41l15 13z"/><rect class="caja-e" x="-15" y="-8" width="30" height="16"/><text class="caja-x" y="4" text-anchor="middle">LECHE</text>`,
  manzana: () => `${suelo(22, 30)}<path class="manzana" d="M0-12c-10-8-26-2-26 14 0 16 12 28 20 28 3 0 4-2 6-2s3 2 6 2c8 0 20-12 20-28 0-16-16-22-26-14z"/><path class="manzana-s" d="M8 28c8-2 18-14 18-26 0-8-4-14-10-16 10 10 6 34-8 42z"/><path class="tallo" d="M0-12c0-6 2-10 6-14"/><path class="hoja" d="M4-20c6-6 14-6 16-2-6 4-12 4-16 2z"/><path class="brillo" d="M-16-2c0-5 3-9 7-10"/>`,
  lechuga: () => `${suelo(28, 26)}<circle class="lechuga" r="28"/><path class="lechuga-s" d="M10-26a28 28 0 0 1 0 52c10-14 10-38 0-52z"/><path class="lechuga-l" d="M-20-8c8 6 14 6 20 0s12-6 20 0M-22 8c8 6 16 6 22 0s14-6 22 0"/><circle class="lechuga-c" r="9"/>`,
  foto: () => '<rect class="foto-s" x="-20" y="-14" width="40" height="32" rx="5"/><rect class="foto" x="-20" y="-17" width="40" height="32" rx="5"/><path class="foto-l" d="M-13 6l7-6 6 4 6-8 7 6"/><circle class="foto-p" cx="8" cy="-8" r="3.4"/>',
  estetoscopio: () => '<path class="esteto" d="M-20-30v18a20 20 0 0 0 40 0v-18M0 8v14a14 14 0 0 0 28 0v-6"/><circle class="esteto-c" cx="28" cy="12" r="9"/><circle class="brillo-c" cx="25" cy="9" r="2.6"/><circle class="esteto-c" cx="-20" cy="-32" r="3.4"/><circle class="esteto-c" cx="20" cy="-32" r="3.4"/>',
  medidor: (cls) => '<path class="z-v" d="M-48 0A48 48 0 0 1-24-41.6"/><path class="z-a" d="M-24-41.6A48 48 0 0 1 24-41.6"/><path class="z-r" d="M24-41.6A48 48 0 0 1 48 0"/>' + `<line class="aguja ${cls}" x1="0" y1="0" x2="0" y2="-40"/><circle class="eje" r="7"/>`,
  check: () => '<circle class="check-c" r="14"/><path class="check-l" d="M-6 0l4 4 8-8"/>',
  pregunta: () => '<circle class="preg-c" r="14"/><text class="preg-t" y="6" text-anchor="middle">?</text>',
  dulce: () => `${suelo(26, 14)}<path class="dulce-l" d="M-20-8l-10-7v30l10-7M20-8l10-7v30l-10-7z"/><rect class="dulce" x="-20" y="-10" width="40" height="20" rx="8"/><path class="dulce-s" d="M-20 2h40v2a8 8 0 0 1-8 6h-24a8 8 0 0 1-8-6z"/><path class="brillo" d="M-12-5h14"/>`,
};
export const DIBUJOS = O;

// ---------- Capítulos: 4 escenas cada uno (una por tramo entre [pause]) ----------
const C1 = [
  (D) => `${A('e', 0.05 * D, at(180, 118, 1.6, O.corazon()))}${A('apaga', 0.45 * D, at(180, 118, 1.6, '<circle class="zona" cx="18" cy="-6" r="12"/>'))}${palabra('El infarto', 0.7 * D)}`,
  (D) => `${at(180, 118, 1.6, O.corazon('<circle class="zona" cx="18" cy="-6" r="12"/>'))}${A('cose', 0.12 * D, at(180, 118, 1.6, '<path class="costura" d="M8-12l8 4m-2-10l6 8m4-6l2 10m6-6l-4 8m6 2l-8 2"/>'))}${A('late', 0.6 * D, at(180, 118, 1.6, O.corazon('<circle class="zona-ok" cx="18" cy="-6" r="12"/>')))}${palabra('Está sanando', 0.55 * D, true)}`,
  (D) => `${[0, 1, 2, 3].map((i) => A('e', (0.08 + i * 0.06) * D, `<rect class="escalon" x="${50 + i * 66}" y="${200 - i * 38}" width="62" height="${16 + i * 38}" rx="8"/>`)).join('')}${A('sube', 0.4 * D, '<circle class="punto-sube" cx="81" cy="186" r="12"/>', `--dur:${(0.5 * D).toFixed(2)}s`)}${palabra('De a poco', 0.35 * D, true)}`,
  (D) => `${A('e', 0.18 * D, at(70, 110, 0.9, O.pastillero()))}${A('e', 0.4 * D, at(180, 110, 0.9, O.platoLleno()))}${A('e', 0.62 * D, at(292, 116, 1.1, O.zapatilla()))}${rotulo(70, 160, 'remedios', 0.22 * D)}${rotulo(180, 170, 'comida', 0.44 * D)}${rotulo(292, 160, 'movimiento', 0.66 * D)}${palabra('Tres ayudas', 0.8 * D, true)}`,
];
const C2 = [
  (D) => `${A('e', 0.05 * D, at(130, 150, 1, O.casa()))}${A('pop', 0.55 * D, at(280, 70, 1.2, O.reloj()))}${A('camina', 0.3 * D, at(100, 200, 0.9, O.caminante()), `--dur:${(0.6 * D).toFixed(2)}s`)}${palabra('Cada hora', 0.75 * D, true)}`,
  (D) => `${[0, 1, 2, 3].map((i) => A('llena-x', (0.1 + i * 0.1) * D, `<rect class="semana" x="${30 + i * 76}" y="40" width="70" height="26" rx="8"/><text class="rot" x="${65 + i * 76}" y="58" text-anchor="middle">Sem ${i + 1}</text>`)).join('')}${A('e', 0.55 * D, at(140, 196, 1.15, O.caminante()))}${A('e', 0.6 * D, at(220, 196, 1.15, O.caminante()))}${A('pop', 0.68 * D, '<path class="globo" d="M156 96h48a12 12 0 0 1 12 12v12a12 12 0 0 1-12 12h-26l-12 10v-10h-10a12 12 0 0 1-12-12v-12a12 12 0 0 1 12-12z"/><circle class="globo-p" cx="166" cy="114" r="4"/><circle class="globo-p" cx="180" cy="114" r="4"/><circle class="globo-p" cx="194" cy="114" r="4"/>')}${palabra('Conversar = bien', 0.8 * D, true)}`,
  (D) => `${[['pecho', 'pecho', 64], ['aire', 'aire', 180], ['mareo', 'mareo', 296]].map(([pose, t, x], i) => A('e', (0.04 + i * 0.07) * D, `<rect class="tarjeta" x="${x - 50}" y="10" width="100" height="132" rx="18"/>${at(x, 92, 0.95, O.sintoma(pose))}<text class="rot" x="${x}" y="134" text-anchor="middle">${t}</text>`)).join('')}${A('pop', 0.42 * D, at(96, 190, 0.85, O.mano()))}${rotulo(96, 258, 'parar y avisar', 0.42 * D)}${flecha(150, 196, 200, 0.6 * D)}${A('pop', 0.66 * D, at(254, 196, 0.9, O.telefono()))}`,
  (D) => `${[[70, O.planta(), 'patio'], [180, O.bolsa(), 'peso'], [290, O.panuelo(), 'folklore']].map(([x, dib, t], i) => A('e', (0.08 + i * 0.12) * D, `<rect class="tarjeta" x="${x - 50}" y="50" width="100" height="130" rx="18"/>${at(x, 112, 1.2, dib)}<text class="rot" x="${x}" y="168" text-anchor="middle">${t}</text>`) + A('pop', (0.45 + i * 0.05) * D, at(x + 38, 56, 1, O.pregunta()))).join('')}${palabra('Tu meta', 0.82 * D, true)}`,
];
const C3 = [
  (D) => `${A('e', 0.05 * D, at(70, 110, 1, O.platoLleno()))}${flecha(126, 110, 166, 0.3 * D)}${A('e', 0.4 * D, '<rect class="arteria" x="180" y="82" width="160" height="56" rx="28"/><rect class="arteria-in" x="180" y="96" width="160" height="28" rx="14"/><clipPath id="tubo"><rect x="180" y="96" width="160" height="28" rx="14"/></clipPath><g clip-path="url(#tubo)"><g class="fluye">' + [-80, -40, 0, 40, 80, 120, 160].map((i) => `<ellipse class="globulo" cx="${190 + i}" cy="110" rx="9" ry="6"/>`).join('') + '</g></g>')}${rotulo(260, 168, 'tu arteria', 0.45 * D)}${palabra('Comida = tratamiento', 0.7 * D, true)}`,
  (D) => `${A('e', 0.02 * D, '<path class="frasco" d="M40 70h100v130a16 16 0 0 1-16 16H56a16 16 0 0 1-16-16z"/><rect class="frasco-t" x="34" y="58" width="112" height="16" rx="6"/><text class="frasco-r" x="90" y="71" text-anchor="middle">SAL</text>')}
    ${[[O.salero(), 0.06, -22, 162, 1], [O.marraqueta(), 0.56, 18, 160, 0.8], [O.queso(), 0.64, -16, 128, 0.9], [O.cecina(), 0.72, 22, 124, 0.9], [O.caldo(), 0.8, 0, 94, 1]].map(([dib, f, dx, dy, sc]) => A('cae', f * D, at(90, 30, sc, dib), `--dx:${dx}px;--dy:${dy}px`)).join('')}
    ${A('e', 0.04 * D, at(270, 150, 1, O.medidor('aguja-sube')), `--d2:${(0.22 * D).toFixed(2)}s`)}${rotulo(270, 186, 'presión', 0.04 * D)}${palabra('Sal escondida', 0.56 * D)}`,
  (D) => `${A('e', 0.3 * D, at(180, 140, 1.2, O.plato()))}
    ${A('e', 0.02 * D, A('va', 0.5 * D, at(70, 60, 0.9, O.marraqueta()), '--dx:110px;--dy:76px'))}${A('e', 0.08 * D, A('sale', 0.45 * D, at(180, 64, 1, O.arroz())))}${A('e', 0.16 * D, A('sale', 0.47 * D, at(290, 62, 1, O.papa())))}
    ${palabra('Uno por comida', 0.55 * D, true)}${A('e', 0.74 * D, at(318, 180, 0.8, O.bebida()))}${rotulo(40, 222, 'azúcar en la sangre', 0.76 * D, 'start')}${A('traza', 0.8 * D, '<path class="curva amb" d="M196 226c20 0 26-48 40-48s16 48 30 48"/>')}`,
  (D) => `${A('e', 0.02 * D, '<circle class="arteria" cx="110" cy="118" r="78"/><circle class="arteria-in" cx="110" cy="118" r="62"/>')}${A('placa', 0.12 * D, '<circle class="placa-c" cx="110" cy="118" r="51"/>', `--dur:${(0.45 * D).toFixed(2)}s`)}${rotulo(110, 216, 'tu arteria por dentro', 0.05 * D)}
    ${A('e', 0.08 * D, at(250, 50, 0.8, O.cecina()))}${A('e', 0.62 * D, at(270, 112, 0.9, O.pastillero()))}${A('e', 0.78 * D, at(270, 176, 0.62, O.platoLleno()))}${palabra('Mitad y mitad', 0.82 * D, true)}`,
];
const C4 = [
  (D) => `${[0, 1, 2, 3].map((i) => A('e', (0.1 + i * 0.1) * D, `<rect class="sem-cal" x="${28 + i * 78}" y="70" width="70" height="90" rx="14"/><text class="rot" x="${63 + i * 78}" y="98" text-anchor="middle">Sem ${i + 1}</text>`)).join('')}${palabra('1 cambio por semana', 0.55 * D, true)}`,
  (D) => `${A('e', 0.02 * D, '<rect class="mesa" x="40" y="150" width="160" height="12" rx="6"/>')}${A('e', 0.02 * D, A('sale-der', 0.2 * D, at(120, 120, 1.3, O.salero())))}${A('pop', 0.22 * D, at(64, 50, 1.2, O.check()))}
    ${A('e', 0.45 * D, at(280, 140, 1, O.medidor('aguja-sabor')), `--d2:${(0.6 * D).toFixed(2)}s`)}${rotulo(280, 176, 'sabor', 0.45 * D)}${rotulo(236, 152, 'soso', 0.5 * D)}${rotulo(324, 152, 'rico', 0.5 * D)}${palabra('Salero fuera', 0.3 * D, true)}`,
  (D) => `${A('e', 0.02 * D, A('sale', 0.2 * D, at(80, 110, 1, O.bebida())))}${A('pop', 0.22 * D, at(80, 110, 1.3, O.vaso()))}${A('pop', 0.25 * D, at(80, 40, 1, O.check()))}
    ${A('e', 0.48 * D, at(250, 118, 1.2, O.platoLleno()))}${A('pop', 0.55 * D, at(250, 40, 1, O.check()))}${rotulo(80, 200, 'agua', 0.25 * D)}${rotulo(250, 200, '½ verduras', 0.55 * D)}`,
  (D) => `${A('e', 0.02 * D, A('sale', 0.25 * D, at(180, 70, 1.1, O.cecina())))}${A('e', 0.15 * D, at(80, 120, 1, O.pescado()))}${A('e', 0.22 * D, at(180, 124, 1, O.porotos()))}${A('e', 0.3 * D, at(280, 120, 1.1, O.pollo()))}
    ${[0, 1, 2, 3].map((i) => A('pop', (0.55 + i * 0.05) * D, at(90 + i * 60, 196, 0.9, O.check()))).join('')}${A('late', 0.8 * D, at(180, 248, 0.45, O.corazon()))}`,
];
const C5 = [
  (D) => `${A('e', 0.05 * D, at(70, 100, 2, O.foto()))}${rotulo(70, 160, 'un día', 0.1 * D)}${flecha(122, 100, 152, 0.4 * D)}${[0, 1, 2, 3, 4, 5].map((i) => A('pop', (0.5 + i * 0.05) * D, at(180 + i * 30, 96 + [8, -6, 6, -4, 4, 0][i], 0.85, O.foto()))).join('')}${rotulo(255, 160, 'muchos días', 0.75 * D)}${palabra('Cómo vas', 0.85 * D, true)}`,
  (D) => `${[['verde', 'Bien', 70], ['amarillo', 'Revisar', 180], ['rojo', 'Avisar', 290]].map(([c, t, x], i) => A('pop', (0.08 + i * 0.12) * D, `<circle class="pt ${c}" cx="${x}" cy="100" r="30"/><text class="rot" x="${x}" y="160" text-anchor="middle">${t}</text>`)).join('')}
    ${A('e', 0.6 * D, `${flecha(150, 210, 196, 0)}<circle class="pt amarillo" cx="130" cy="210" r="16"/><circle class="pt verde" cx="220" cy="210" r="16"/><text class="rot" x="250" y="216">otra vez</text>`)}`,
  (D) => `${[0, 1, 2, 3, 4].map((i) => A('e', (0.05 + i * 0.05) * D, at(46 + i * 30, 96 + [6, -4, 4, -2, 0][i], 0.85, O.foto()))).join('')}${A('e', 0.4 * D, '<rect class="mesa" x="200" y="170" width="140" height="12" rx="6"/>')}${A('pop', 0.48 * D, at(270, 130, 1, O.estetoscopio()))}${palabra('Control', 0.6 * D, true)}`,
  (D) => `${A('e', 0.05 * D, at(110, 110, 0.8, O.pastillero()))}${A('e', 0.18 * D, at(180, 110, 0.6, O.platoLleno()))}${A('e', 0.3 * D, at(250, 116, 0.9, O.zapatilla()))}${[60, 120, 240, 300].map((x, i) => A('e', (0.55 + i * 0.06) * D, at(x, 196, 0.7, O.persona()))).join('')}${A('late', 0.75 * D, at(180, 186, 0.42, O.corazon()))}${palabra('Contigo', 0.82 * D, true)}`,
];
const C6 = [
  (D) => `${A('e', 0.03 * D, at(180, 160, 1.7, O.balanza()))}${A('pop', 0.6 * D, '<text class="menos" x="262" y="118">−1 kg</text>')}${[0, 1, 2].map((i) => A('gotea', (0.55 + i * 0.08) * D, at(140 + i * 40, 70, 1.3, O.gota()))).join('')}${palabra('Es agua', 0.75 * D, true)}`,
  (D) => `${[72.6, 72.2, 72.5, 71.8, 72.4, 72.0, 72.3].map((v, i) => A('pop', (0.1 + i * 0.05) * D, `<circle class="pt-peso" cx="${46 + i * 45}" cy="${130 - (v - 72.2) * 60}" r="8"/>`)).join('')}${A('traza', 0.55 * D, '<path class="curva" d="M30 130H330"/>')}${rotulo(180, 200, 'cada mañana', 0.6 * D)}${palabra('Mira la semana', 0.7 * D, true)}`,
  (D) => `${[[O.marraqueta(), 70], [O.dulce(), 180], [O.salero(), 290]].map(([dib, x], i) => A('e', (0.02 + i * 0.05) * D, A('sale', 0.35 * D, at(x, 70, 1, dib) + `<path class="tacha" d="M${x - 22} 48l44 44M${x + 22} 48l-44 44"/>`))).join('')}
    ${[[O.huevo(), 50], [O.pollo(), 115], [O.pescado(), 180], [O.porotos(), 245], [O.leche(), 310]].map(([dib, x], i) => A('pop', (0.55 + i * 0.06) * D, at(x, 170, 1, dib))).join('')}${palabra('Proteína en cada comida', 0.82 * D, true)}`,
  (D) => `${A('traza', 0.05 * D, '<path class="curva" d="M30 60 70 70 110 82 150 96"/>')}${flecha(160, 90, 200, 0.25 * D)}${A('pop', 0.3 * D, at(256, 110, 1.1, O.medico()))}
    ${A('traza', 0.45 * D, '<path class="curva amb" d="M30 200h60l20-40h30"/>')}${A('pop', 0.55 * D, at(160, 160, 1.2, O.gota()))}${flecha(176, 170, 206, 0.6 * D)}${palabra('Avisar', 0.8 * D, true)}`,
];
const ESCENAS = [C1, C2, C3, C4, C5, C6];
export const escena = (cap, i, dur) => ESCENAS[cap][i](dur);

// Preguntas al final de algunos capítulos. `bien` vacío = cualquier respuesta vale (es una elección personal).
export const PREGUNTAS = {
  1: { q: '¿Qué quieres recuperar primero?', ops: [['patio', 'Patio', O.planta()], ['caminar', 'Caminar más', O.zapatilla()], ['folklore', 'Folklore', O.panuelo()]], bien: '', ok: 'Esa es tu meta. Pregúntala en el control.' },
  2: { q: '¿Dónde hay más sal escondida?', ops: [['pan', 'Marraqueta', O.marraqueta()], ['manzana', 'Manzana', O.manzana()], ['lechuga', 'Lechuga', O.lechuga()]], bien: 'pan', ok: '¡Sí! El pan trae bastante sal.', no: 'Esa tiene muy poca. Prueba otra.' },
  3: { q: '¿Qué cambio empezamos esta semana?', ops: [['salero', 'Salero fuera', O.salero()], ['agua', 'Agua', O.vaso()], ['plato', 'Plato', O.platoLleno()]], bien: '', ok: 'Listo: ese es el cambio de esta semana.' },
  5: { q: '¿Qué ayuda más a recuperar peso sano?', ops: [['pan', 'Pan con mantequilla', O.marraqueta()], ['huevo', 'Huevo', O.huevo()], ['bebida', 'Bebida', O.bebida()]], bien: 'huevo', ok: '¡Sí! La proteína ayuda a recuperar músculo.', no: 'Esa suma azúcar o grasa. Prueba otra.' },
};
