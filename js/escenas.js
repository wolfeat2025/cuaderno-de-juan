// Escenas de "Mi recuperación": dibujos planos de objetos de la casa, sin brillos ni partículas.
// Cada escena recibe la duración de su tramo de audio (s) y ubica las entradas en fracciones de ese tramo,
// para que cada cosa aparezca cuando la voz la nombra. Lienzo 360 × 280.

// Envoltorio animado: la animación CSS va en un <g> propio, así no pisa la posición del dibujo.
const A = (cls, s, inner, extra = '') => `<g class="${cls}" style="--d:${s.toFixed(2)}s;${extra}">${inner}</g>`;
const at = (x, y, sc, inner) => `<g transform="translate(${x} ${y})${sc && sc !== 1 ? ` scale(${sc})` : ''}">${inner}</g>`;
const palabra = (txt, s, acc) => A('pop', s, `<text class="palabra${acc ? ' acc' : ''}" x="180" y="262" text-anchor="middle">${txt}</text>`);
const rotulo = (x, y, txt, s, anchor = 'middle') => A('e', s, `<text class="rot" x="${x}" y="${y}" text-anchor="${anchor}">${txt}</text>`);
const flecha = (x1, y, x2, s) => A('e', s, `<path class="flecha" d="M${x1} ${y}H${x2}m-10-10 10 10-10 10"/>`);

// ---------- Objetos ----------
const O = {
  corazon: (zona) => `<path class="cz" d="M0 40C-56 6-62-32-32-44c16-6 28 2 32 12 4-10 16-18 32-12 30 12 24 50-32 84z"/>${zona || ''}`,
  marraqueta: () => '<ellipse cx="-15" rx="22" ry="17" class="pan"/><ellipse cx="15" rx="22" ry="17" class="pan"/><path class="pan-l" d="M0-15v30M-15-12c-4 6-4 18 0 24M15-12c4 6 4 18 0 24"/>',
  salero: () => '<path class="vidrio" d="M-14-6h28l-3 30h-22z"/><path class="sal" d="M-12 10h24l-1.6 14h-20.8z"/><path class="tapa" d="M-14-6c0-10 6-16 14-16s14 6 14 16z"/><circle class="hoyo" cx="-5" cy="-12" r="1.6"/><circle class="hoyo" cx="0" cy="-15" r="1.6"/><circle class="hoyo" cx="5" cy="-12" r="1.6"/>',
  queso: () => '<path class="queso" d="M-24 14 22-14l4 28z"/><circle class="queso-h" cx="4" cy="6" r="3.5"/><circle class="queso-h" cx="16" cy="-3" r="2.5"/>',
  cecina: () => '<circle class="cec" r="20"/><circle class="cec2" r="15"/><circle class="cec-p" cx="-6" cy="-5" r="2.6"/><circle class="cec-p" cx="6" cy="-7" r="2"/><circle class="cec-p" cx="4" cy="6" r="2.8"/><circle class="cec-p" cx="-7" cy="7" r="2"/>',
  caldo: () => '<path class="caldo" d="M-15-9 0-17l15 8v18L0 17l-15-8z"/><path class="caldo-l" d="M-15-9 0-1l15-8M0-1v18"/>',
  arroz: () => '<path class="arroz" d="M-22-2c0-14 10-20 22-20s22 6 22 20z"/><path class="taza" d="M-26-2h52a26 22 0 0 1-52 0z"/>',
  papa: () => '<path class="papa" d="M-24 2c-2-12 10-20 24-18s26 6 24 16-12 18-26 16-20-4-22-14z"/>',
  bebida: () => '<path class="botella" d="M-6-34h12v8c6 4 9 9 9 16v38a4 4 0 0 1-4 4h-22a4 4 0 0 1-4-4v-38c0-7 3-12 9-16z"/><rect class="etiqueta" x="-15" y="-4" width="30" height="16"/><rect class="etiqueta" x="-7" y="-40" width="14" height="7" rx="2"/>',
  vaso: () => '<path class="vidrio" d="M-16-26h32l-4 52h-24z"/><path class="agua" d="M-14-8h28l-2.6 32h-22.8z"/>',
  plato: () => '<ellipse cy="4" rx="46" ry="14" class="sombra"/><ellipse rx="46" ry="14" class="loza"/><ellipse rx="32" ry="9" class="loza-l"/>',
  platoLleno: () => '<circle r="40" class="loza"/><path class="verd" d="M0-34a34 34 0 0 0 0 68z"/><path class="prot" d="M0 0V-34a34 34 0 0 1 34 34z"/><path class="pan" d="M0 0h34a34 34 0 0 1-34 34z"/>',
  pastillero: () => `<rect x="-44" y="-16" width="88" height="32" rx="8" class="pastillero"/>${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${-40 + i * 12}" y="-11" width="9" height="22" rx="3" class="pastillero-c"/>`).join('')}`,
  zapatilla: () => '<path class="zap" d="M-30 8c0-12 6-22 14-24 6 8 16 10 26 10 10 0 20 4 20 14z"/><path class="zap-s" d="M-32 8h62v6a4 4 0 0 1-4 4h-54a4 4 0 0 1-4-4z"/><path class="zap-l" d="M-12-10l6 6M-6-12l6 6"/>',
  persona: () => '<circle class="piel" cy="-46" r="11"/><path class="ropa" d="M-14-30h28a6 6 0 0 1 6 6v24h-40v-24a6 6 0 0 1 6-6z"/><path class="pierna" d="M-8 0v26M8 0v26"/>',
  caminante: () => '<circle class="piel" cy="-46" r="11"/><path class="ropa" d="M-12-30h24a6 6 0 0 1 6 6v24h-36v-24a6 6 0 0 1 6-6z"/><g class="paso"><path class="pierna" d="M-6 0l-8 26M6 0l8 26"/></g>',
  casa: () => '<path class="casa" d="M-60 0 0-46 60 0v60h-120z"/><path class="techo" d="M-70 4 0-52 70 4"/><rect class="puerta" x="-12" y="26" width="24" height="34" rx="3"/>',
  reloj: () => '<circle class="reloj" r="20"/><path class="aguja-r" d="M0 0V-12M0 0l8 5"/>',
  telefono: () => '<rect class="tel" x="-22" y="-36" width="44" height="72" rx="10"/><text class="tel-t" y="8" text-anchor="middle">131</text>',
  mano: () => '<path class="mano" d="M-14 24v-30a5 5 0 0 1 10 0v-10a5 5 0 0 1 10 0v4a5 5 0 0 1 10 0v6a5 5 0 0 1 10 0v26c0 12-10 20-22 20s-18-6-18-16z"/>',
  planta: () => '<path class="maceta" d="M-16 6h32l-4 22h-24z"/><path class="hoja" d="M0 6c-2-16-14-22-22-22 2 12 8 20 22 22zM0 6c2-16 14-22 22-22-2 12-8 20-22 22z"/>',
  bolsa: () => '<path class="bolsa" d="M-22-10h44l6 40h-56z"/><path class="asa" d="M-10-10c0-14 20-14 20 0"/>',
  panuelo: () => '<path class="panuelo" d="M-24-18c14 6 30-4 44 4-6 14 0 26-6 38-14-6-26 2-38-6 6-12-6-24 0-36z"/>',
  balanza: () => '<rect class="balanza" x="-46" y="-30" width="92" height="60" rx="14"/><path class="dial" d="M-20-6a20 20 0 0 1 40 0z"/>',
  gota: () => '<path class="gota" d="M0-14c6 8 9 12 9 16a9 9 0 0 1-18 0c0-4 3-8 9-16z"/>',
  huevo: () => '<ellipse class="huevo" rx="15" ry="19"/>',
  pescado: () => '<path class="pez" d="M-26 0c10-14 30-14 40 0-10 14-30 14-40 0zM14 0l14-10v20z"/><circle class="ojo" cx="-14" cy="-2" r="2.2"/>',
  porotos: () => '<path class="taza" d="M-26-2h52a26 22 0 0 1-52 0z"/>' + [[-14, -6], [-4, -9], [6, -6], [15, -9], [-9, -13], [3, -14]].map(([x, y]) => `<ellipse class="poroto" cx="${x}" cy="${y}" rx="6" ry="4"/>`).join(''),
  leche: () => '<path class="caja" d="M-14-28h28v56h-28z"/><path class="caja-t" d="M-14-28 0-40l14 12z"/><rect class="caja-e" x="-14" y="-6" width="28" height="14"/>',
  manzana: () => '<path class="manzana" d="M0-12c-10-8-26-2-26 14 0 16 12 28 20 28 3 0 4-2 6-2s3 2 6 2c8 0 20-12 20-28 0-16-16-22-26-14z"/><path class="tallo" d="M0-12c0-6 2-10 6-14"/>',
  lechuga: () => '<circle class="lechuga" r="28"/><circle class="lechuga-c" r="10"/>',
  foto: () => '<rect class="foto" x="-18" y="-14" width="36" height="28" rx="5"/><circle class="foto-p" r="5"/>',
  estetoscopio: () => '<path class="esteto" d="M-20-30v18a20 20 0 0 0 40 0v-18M0 8v14a14 14 0 0 0 28 0v-6"/><circle class="esteto-c" cx="28" cy="12" r="8"/>',
  medico: () => '<circle class="piel" cy="-46" r="11"/><path class="bata" d="M-16-30h32a6 6 0 0 1 6 6v30h-44v-30a6 6 0 0 1 6-6z"/><path class="esteto" d="M-6-30v10a6 6 0 0 0 12 0v-10"/>',
  medidor: (cls) => '<path class="z-v" d="M-48 0A48 48 0 0 1-24-41.6"/><path class="z-a" d="M-24-41.6A48 48 0 0 1 24-41.6"/><path class="z-r" d="M24-41.6A48 48 0 0 1 48 0"/>' + `<line class="aguja ${cls}" x1="0" y1="0" x2="0" y2="-40"/><circle class="eje" r="7"/>`,
  check: () => '<circle class="check-c" r="13"/><path class="check-l" d="M-6 0l4 4 8-8"/>',
  pregunta: () => '<circle class="preg-c" r="13"/><text class="preg-t" y="6" text-anchor="middle">?</text>',
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
  (D) => `${[0, 1, 2, 3].map((i) => A('llena-x', (0.1 + i * 0.1) * D, `<rect class="semana" x="${30 + i * 76}" y="40" width="70" height="26" rx="8"/><text class="rot" x="${65 + i * 76}" y="58" text-anchor="middle">Sem ${i + 1}</text>`)).join('')}${A('e', 0.55 * D, at(140, 186, 0.95, O.caminante()))}${A('e', 0.6 * D, at(210, 186, 0.95, O.caminante()))}${A('pop', 0.68 * D, '<path class="globo" d="M150 100h50a10 10 0 0 1 10 10v16a10 10 0 0 1-10 10h-30l-10 10v-10h-10a10 10 0 0 1-10-10v-16a10 10 0 0 1 10-10z"/><text class="rot" x="175" y="124" text-anchor="middle">bla bla</text>')}${palabra('Conversar = bien', 0.8 * D, true)}`,
  (D) => `${A('e', 0.05 * D, at(60, 70, 0.6, O.corazon()))}${A('e', 0.12 * D, '<path class="aire" d="M120 54h40M120 70h30M120 86h40"/>')}${A('e', 0.2 * D, '<path class="mareo" d="M240 70a12 12 0 1 1-12-12 20 20 0 1 1 20 20"/>')}${rotulo(60, 120, 'pecho', 0.05 * D)}${rotulo(140, 120, 'aire', 0.12 * D)}${rotulo(236, 120, 'mareo', 0.2 * D)}${A('pop', 0.42 * D, at(110, 180, 1, O.mano()))}${rotulo(110, 252, 'Parar', 0.42 * D)}${A('pop', 0.68 * D, at(260, 180, 1.1, O.telefono()))}`,
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
  (D) => `${A('e', 0.02 * D, A('sale', 0.25 * D, at(180, 70, 1.1, O.cecina())))}${A('e', 0.15 * D, at(80, 120, 1, O.pescado()))}${A('e', 0.22 * D, at(180, 124, 1, O.porotos()))}${A('e', 0.3 * D, at(280, 120, 1, '<path class="pollo" d="M-22 10c-6-16 6-30 22-30s26 14 20 28c-4 10-16 12-24 10l-8 12-6-4 6-10c-6-2-8-4-10-6z"/>'))}
    ${[0, 1, 2, 3].map((i) => A('pop', (0.55 + i * 0.05) * D, at(90 + i * 60, 196, 0.9, O.check()))).join('')}${A('late', 0.8 * D, at(180, 248, 0.45, O.corazon()))}`,
];
const C5 = [
  (D) => `${A('e', 0.05 * D, at(70, 120, 1.6, O.foto()))}${flecha(116, 120, 150, 0.4 * D)}${[0, 1, 2, 3, 4, 5].map((i) => A('pop', (0.5 + i * 0.05) * D, at(178 + i * 30, 120 + [8, -4, 6, -2, 4, 0][i], 0.75, O.foto()))).join('')}${A('traza', 0.8 * D, '<path class="curva" d="M178 128 208 116 238 126 268 118 298 124 328 120"/>')}`,
  (D) => `${[['verde', 'Bien', 70], ['amarillo', 'Revisar', 180], ['rojo', 'Avisar', 290]].map(([c, t, x], i) => A('pop', (0.08 + i * 0.12) * D, `<circle class="pt ${c}" cx="${x}" cy="100" r="30"/><text class="rot" x="${x}" y="160" text-anchor="middle">${t}</text>`)).join('')}
    ${A('e', 0.6 * D, `${flecha(150, 210, 196, 0)}<circle class="pt amarillo" cx="130" cy="210" r="16"/><circle class="pt verde" cx="220" cy="210" r="16"/><text class="rot" x="250" y="216">otra vez</text>`)}`,
  (D) => `${[0, 1, 2, 3, 4].map((i) => A('e', (0.05 + i * 0.05) * D, at(40 + i * 34, 90 + [6, -4, 4, -2, 0][i], 0.7, O.foto()))).join('')}${A('e', 0.4 * D, '<rect class="mesa" x="200" y="170" width="140" height="12" rx="6"/>')}${A('pop', 0.48 * D, at(270, 130, 1, O.estetoscopio()))}${palabra('Control', 0.6 * D, true)}`,
  (D) => `${A('e', 0.05 * D, at(110, 110, 0.8, O.pastillero()))}${A('e', 0.18 * D, at(180, 110, 0.6, O.platoLleno()))}${A('e', 0.3 * D, at(250, 116, 0.9, O.zapatilla()))}${[60, 120, 240, 300].map((x, i) => A('e', (0.55 + i * 0.06) * D, at(x, 196, 0.7, O.persona()))).join('')}${A('late', 0.75 * D, at(180, 186, 0.42, O.corazon()))}${palabra('Contigo', 0.82 * D, true)}`,
];
const C6 = [
  (D) => `${A('e', 0.03 * D, at(180, 150, 1.6, O.balanza()))}${A('e', 0.03 * D, '<line class="aguja aguja-baja" x1="180" y1="141" x2="180" y2="113" style="transform-origin:180px 141px"/>', `--d2:${(0.6 * D).toFixed(2)}s`)}${[0, 1, 2].map((i) => A('gotea', (0.55 + i * 0.08) * D, at(150 + i * 30, 100, 1, O.gota()))).join('')}${palabra('Es agua', 0.75 * D, true)}`,
  (D) => `${[72.6, 72.2, 72.5, 71.8, 72.4, 72.0, 72.3].map((v, i) => A('pop', (0.1 + i * 0.05) * D, `<circle class="pt-peso" cx="${46 + i * 45}" cy="${130 - (v - 72.2) * 60}" r="8"/>`)).join('')}${A('traza', 0.55 * D, '<path class="curva" d="M30 130H330"/>')}${rotulo(180, 200, 'cada mañana', 0.6 * D)}${palabra('Mira la semana', 0.7 * D, true)}`,
  (D) => `${[[O.marraqueta(), 70], ['<path class="dulce" d="M-18-8h36v16h-36z"/><path class="dulce-l" d="M-18-8l-8-6v28l8-6M18-8l8-6v28l-8-6"/>', 180], [O.salero(), 290]].map(([dib, x], i) => A('e', (0.02 + i * 0.05) * D, A('sale', 0.35 * D, at(x, 70, 1, dib) + `<path class="tacha" d="M${x - 22} 48l44 44M${x + 22} 48l-44 44"/>`))).join('')}
    ${[[O.huevo(), 50], ['<path class="pollo" d="M-22 10c-6-16 6-30 22-30s26 14 20 28c-4 10-16 12-24 10l-8 12-6-4 6-10c-6-2-8-4-10-6z"/>', 115], [O.pescado(), 180], [O.porotos(), 245], [O.leche(), 310]].map(([dib, x], i) => A('pop', (0.55 + i * 0.06) * D, at(x, 170, 1, dib))).join('')}${palabra('Proteína en cada comida', 0.82 * D, true)}`,
  (D) => `${A('traza', 0.05 * D, '<path class="curva" d="M30 60 70 70 110 82 150 96"/>')}${flecha(160, 90, 200, 0.25 * D)}${A('pop', 0.3 * D, at(250, 104, 0.8, O.medico()))}
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
