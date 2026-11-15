// Búsqueda de alimentos y carga glucémica (estimación educativa, no indicación médica).
// Catálogo fijo en datos/alimentos.json (sin datos personales). Se genera con herramientas/alimentos.cjs.
let catalogo = null, cargando = null;

export function cargarCatalogo() {
  if (catalogo) return Promise.resolve(catalogo);
  if (!cargando) cargando = fetch('datos/alimentos.json').then((r) => r.json()).then((j) => { catalogo = j.a || []; return catalogo; }).catch(() => { cargando = null; return []; });
  return cargando;
}
export const catalogoListo = () => !!catalogo;
export const alimentoPorId = (id) => (catalogo || []).find((a) => a.id === id) || null;

export const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ ]/g, ' ').replace(/\s+/g, ' ').trim();
const singular = (w) => (w.length > 4 && /es$/.test(w) ? w.slice(0, -2) : w.length > 3 && /s$/.test(w) ? w.slice(0, -1) : w);
const toks = (s) => norm(s).split(' ').filter((w) => w.length > 1 && !VACIAS[w]).map(singular);
const VACIAS = { de: 1, del: 1, la: 1, el: 1, los: 1, las: 1, un: 1, una: 1, con: 1, y: 1, al: 1, en: 1, mas: 1, poco: 1, media: 1, medio: 1 };

// Puntaje de un alimento para un texto: frase exacta > frase contenida > palabras en común.
function puntaje(a, texto, tt) {
  let mejor = 0;
  a.s.forEach((sin) => {
    if (sin === texto) mejor = Math.max(mejor, 100);
    else if ((' ' + texto + ' ').indexOf(' ' + sin + ' ') >= 0) mejor = Math.max(mejor, 60 + sin.length);
    else {
      const st = sin.split(' ').map(singular), comunes = st.filter((w) => tt.indexOf(w) >= 0).length;
      if (comunes) mejor = Math.max(mejor, comunes === tt.length && st[0] === tt[0] ? 42 : (comunes / st.length) * 50);
    }
  });
  return mejor;
}

// Sugerencias mientras se escribe (la última palabra puede estar a medias).
export function sugerir(texto, max = 5) {
  if (!catalogo) return [];
  const t = norm(texto); if (t.length < 2) return [];
  const ult = singular(t.split(' ').pop());
  return catalogo.map((a) => {
    let p = puntaje(a, t, toks(t));
    if (a.s.some((s) => s.split(' ').some((w) => w.indexOf(ult) === 0))) p = Math.max(p, 40 + ult.length);
    return [p, a];
  }).filter((x) => x[0] >= 30).sort((x, y) => y[0] - x[0]).slice(0, max).map((x) => x[1]);
}

// "pan con palta y té" -> [{texto:'pan', a}, {texto:'palta', a}, {texto:'te', a}]
export function interpretar(texto) {
  if (!catalogo) return [];
  // 1) Primero los platos de varias palabras que estén completos en el texto ("porotos con riendas", "cafe con leche").
  let resto = ' ' + norm(texto) + ' ';
  const enteros = [];
  catalogo.forEach((a) => a.s.forEach((sin) => { if (sin.indexOf(' ') > 0) enteros.push([sin, a]); }));
  enteros.sort((x, y) => y[0].length - x[0].length);
  const hallados = [];
  enteros.forEach(([sin, a]) => {
    const i = resto.indexOf(' ' + sin + ' ');
    if (i >= 0) { hallados.push([i, { texto: sin, a }]); resto = resto.slice(0, i) + ' |' + ' '.repeat(sin.length - 1) + resto.slice(i + sin.length + 1); }
  });
  // 2) Lo que queda se separa por "con", "y", comas.
  const partes = resto.split(/ con | y | mas |,|\+|\|/).map((x) => x.trim()).filter((x) => x && !VACIAS[x]);
  const sueltos = partes.map((p) => {
    const tt = toks(p); let mejor = null, mp = 0;
    catalogo.forEach((a) => { const s = puntaje(a, p, tt); if (s > mp) { mp = s; mejor = a; } });
    return { texto: p, a: mp >= 35 ? mejor : null };
  });
  return hallados.sort((x, y) => x[0] - y[0]).map((x) => x[1]).concat(sueltos);
}

// Carga glucémica de una porción: IG × carbohidratos disponibles (g) / 100.
export const cgDe = (a, gramos) => (a.ig * (a.c * gramos / 100)) / 100;
export const carbsDe = (a, gramos) => (a.c * gramos) / 100;
// Cortes habituales en la literatura (por comida y por día). Solo para orientar.
export const nivelComida = (cg) => (cg <= 10 ? 'suave' : cg < 20 ? 'media' : 'alta');
export const nivelDia = (cg) => (cg < 80 ? 'suave' : cg <= 120 ? 'media' : 'alta');
export const NIVEL_TXT = { suave: 'Suave', media: 'Media', alta: 'Alta' };
