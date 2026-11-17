// COMIDAS · "Hoy, en el plato" (dona del día) y la guía rápida Buenas / Con medida / Evitar.
// Estimación educativa según lo anotado (alimentos y porciones de la fase 1). No es una pauta: valen la nutricionista y el médico.
import { estado, acciones, pintar } from '../nucleo.js';
import { esc, ico, hhmm, porId, mayus, claveFecha } from '../util.js';
import { azucarBaja, clasificar } from '../datos.js';
import { itemsDelDia } from '../plan.js';
import { catalogoListo, alimentoPorId, sugerir, cgDe, nivelComida, NIVEL_TXT } from '../glucemica.js';
import { FACTOR, nombreCorto, emojiDe } from './comidas.js';

const ART = { desayuno: 'el desayuno', almuerzo: 'el almuerzo', once: 'la once', cena: 'la cena' };
const SODIO_DIA = 2000; // mg: referencia general de la OMS para adultos (no es una indicación personal)

// Qué parte del plato es cada alimento: [arroz y pan, proteína, verdura]. Frutas, lácteos y grasas no van en el plato.
// Las legumbres cuentan mitad como proteína y mitad como carbohidrato (igual que en la guía del almuerzo).
const PARTE = { verduras: [0, 0, 1], carnes_huevos: [0, 1, 0], pescados: [0, 1, 0], legumbres: [0.5, 0.5, 0], pan_cereales: [1, 0, 0], tuberculos: [1, 0, 0], snacks: [1, 0, 0] };
function reparto(a) {
  if (PARTE[a.gr]) return PARTE[a.gr];
  if (a.gr === 'dulces_bebidas') return a.c >= 5 ? [1, 0, 0] : null;
  // Platos caseros: se reparten según sus carbohidratos y proteínas; el resto se cuenta como verdura.
  if (a.gr === 'preparaciones') { const c = Math.min(1, a.c / 25), p = Math.min(1 - c, a.pr / 15); return [c, p, 1 - c - p]; }
  return null;
}
const gramos = (a, it) => (typeof it.g === 'number' ? it.g : a.p[it.pi || 0][1] * (it.m || 1));

function platoHoy(hoy) {
  let carb = 0, prot = 0, verd = 0, sodio = 0, regs = 0;
  Object.keys(estado.tomas).forEach((id) => {
    const t = estado.tomas[id];
    if (t.clase !== 'comida' || t.fecha !== hoy || t.comio === 'nada' || !Array.isArray(t.items) || !t.items.length) return;
    const f = FACTOR[t.comio] === undefined ? 1 : FACTOR[t.comio];
    regs++;
    t.items.forEach((it) => {
      const a = alimentoPorId(it.id); if (!a) return;
      const g = gramos(a, it) * f, r = reparto(a);
      sodio += (a.so * g) / 100;
      if (r) { carb += r[0] * g; prot += r[1] * g; verd += r[2] * g; }
    });
  });
  const tot = carb + prot + verd;
  if (!regs || tot < 50) return null;
  // Comparado con el plato de la guía (la mitad verdura, un cuarto proteína, un cuarto arroz o pan).
  const p = { carb: carb / tot, prot: prot / tot, verd: verd / tot };
  p.nv = p.verd < 0.3 ? 'falta' : 'bien';
  p.np = p.prot < 0.15 ? 'falta' : p.prot > 0.45 ? 'mucho' : 'bien';
  p.nc = p.carb > 0.4 ? 'mucho' : 'bien';
  p.ns = sodio >= SODIO_DIA ? 'mucho' : 'bien';
  return p;
}

function dona(p) {
  let off = 0;
  const seg = (v, cls) => { const l = v * 100, s = `<circle class="pd-seg ${cls}" cx="21" cy="21" r="15.9155" stroke-dasharray="${l.toFixed(1)} ${(100 - l).toFixed(1)}" stroke-dashoffset="${(-off).toFixed(1)}"/>`; off += l; return s; };
  return `<svg class="pd-dona" viewBox="0 0 42 42" aria-hidden="true"><circle class="pd-fondo" cx="21" cy="21" r="15.9155"/><g transform="rotate(-90 21 21)">${seg(p.verd, 'v')}${seg(p.prot, 'p')}${seg(p.carb, 'c')}</g></svg>`;
}
const PAL = { falta: 'Falta', bien: 'Bien', mucho: 'Mucho' };
const fila = (cls, nombre, n) => `<span><i class="pd-dot ${cls}"></i>${nombre}<em class="${n}">${PAL[n]}</em></span>`;

// La próxima comida principal de hoy que todavía no está anotada.
function siguiente(comidas) {
  const ahora = hhmm(estado.ahora);
  return comidas.find((i) => !i.opcional && !estado.tomas[i.id] && i.hora >= ahora) || null;
}

// El azúcar medido después de cada comida (el más alto), para la tira de arriba.
function gluDe(it, reg, hoy) {
  const ms = estado.mediciones.filter((m) => m.tipo === 'azucar' && m.fecha === hoy && (it.k === 'almuerzo'
    ? m.tarea === 'glu-almuerzo' || m.tarea === 'glu-otra'
    : reg && m.momento === 'despues' && m.tarea !== 'glu-almuerzo' && m.tarea !== 'glu-otra' && m.ts > reg.ts && m.ts - reg.ts <= 4 * 3600000));
  return ms.reduce((b, m) => (!b || Number(m.valor) > Number(b.valor) ? m : b), null);
}

export function platoDelDia(hoy, comidas) {
  const prin = comidas.filter((i) => !i.opcional);
  if (!prin.some((i) => estado.tomas[i.id])) return '';
  const tira = `<div class="pd-tira" style="grid-template-columns:repeat(${prin.length},1fr)">${prin.map((it) => {
    const reg = estado.tomas[it.id], glu = gluDe(it, reg, hoy);
    if (glu) {
      const c = azucarBaja(glu, estado.config.rangos) ? 'baja' : clasificar(glu, estado.config.rangos) === 'verde' ? 'ok' : 'al';
      return `<a class="pd-c ${c}" href="#medir/azucar/porque/${esc(glu.id)}" aria-label="${esc(it.nombre)}: azúcar ${esc(String(glu.valor))}">${esc(it.nombre)}<b>${esc(String(glu.valor))}</b></a>`;
    }
    return `<span class="pd-c${reg && reg.comio !== 'nada' ? ' ok' : ''}">${esc(it.nombre)}<b>${reg ? '✓' : '—'}</b></span>`;
  }).join('')}</div>`;
  const p = catalogoListo() ? platoHoy(hoy) : null;
  let cuerpo = '', tip = '';
  if (p) {
    cuerpo = `<p class="rotulo">Hoy, en el plato</p><div class="pd-fila">${dona(p)}<div class="pd-ley">
      ${fila('v', 'Verdura', p.nv)}${fila('p', 'Proteína', p.np)}${fila('c', 'Arroz y pan', p.nc)}${fila('s', 'Sal', p.ns)}</div></div>
      <p class="nota">Estimación según lo anotado.</p>`;
    // Un solo consejo, para la próxima comida de hoy.
    const sig = siguiente(comidas);
    const partes = [p.nv === 'falta' && ['🥗', 'más verdura'], p.nc === 'mucho' && ['🍞', 'menos pan o arroz'], p.np === 'falta' && ['🍗', 'algo de pollo, pescado, huevo o legumbres'], p.ns === 'mucho' && ['🧂', 'sin agregar sal']].filter(Boolean).slice(0, 2);
    if (sig && partes.length) tip = `<div class="pq-consejo"><span class="em">${partes[0][0]}</span><p>Para ${ART[sig.k] || 'la próxima comida'}<small>${esc(mayus(partes.map((x) => x[1]).join(' y ')))}</small></p></div>`;
  }
  return `<section class="panel plato-dia">${tira}${cuerpo}</section>${tip}`;
}

// ---- Guía rápida (al final de Comidas) ----
// Lista general corta, en palabras de casa. Las porciones exactas las indica la nutricionista.
const GUIA_RAPIDA = {
  buenas: [['cazuela_ave', '🍲', 'Cazuela de pollo', 'sin papa extra'], ['charquican', '🥘', 'Charquicán', 'con harta verdura'], ['pescado_horno', '🐟', 'Pescado al horno', 'con ensalada'],
    ['ensalada_chilena', '🥗', 'Ensalada chilena', 'sin agregar sal'], ['manzana', '🍎', 'Manzana', 'entera, con cáscara'], ['palta', '🥑', 'Palta', 'porción chica']],
  medida: [['arroz_blanco_cocido', '🍚', 'Arroz', 'poca cantidad'], ['porotos_con_riendas', '🥣', 'Porotos con riendas', 'plato chico'], ['pan_marraqueta', '🍞', 'Marraqueta', 'mejor media'],
    ['papa_cocida', '🥔', 'Papa cocida', 'en vez del arroz, no junto'], ['platano', '🍌', 'Plátano', 'mejor medio']],
  evitar: [['bebida_azucarada', '🥤', 'Bebida con azúcar', 'mejor agua'], ['jugo_polvo', '🧃', 'Jugo en polvo con azúcar', 'mejor sin azúcar'], ['completo', '🌭', 'Completo', 'mucha sal'],
    ['queque', '🍰', 'Queque o torta', 'solo en un cumpleaños'], ['empanada_pino', '🥟', 'Empanada de pino', 'mucha grasa y sal']],
};
const PESTANAS = [['buenas', 'Buenas'], ['medida', 'Con medida'], ['evitar', 'Evitar']];

function filasGuia(comidas) {
  const u = estado.ui, tab = u.guiaTab || 'buenas', q = String(u.guiaBusca || '').trim(), sig = siguiente(comidas);
  const filas = q.length >= 2 && catalogoListo()
    ? sugerir(q, 5).map((a) => [a.id, emojiDe(a), nombreCorto(a), a.p[0][0], nivelComida(cgDe(a, a.p[0][1]))])
    : GUIA_RAPIDA[tab].map((x) => [x[0], x[1], x[2], x[3], '']);
  if (!filas.length) return '<p class="nota">No está en la lista. Prueba con otra palabra.</p>';
  return filas.map(([id, em, n, s, niv]) => {
    const abierto = u.guiaSel === id && sig;
    return `<div class="gr-item" data-k="gr-${esc(id)}"><button type="button" class="gr-f" data-a="guiaTocar" data-id="${esc(id)}"${sig ? ` aria-expanded="${abierto ? 'true' : 'false'}"` : ''}>
        <span class="em">${em}</span><span class="n">${esc(n)}<small>${esc(s)}</small></span>${niv ? `<span class="cg-chip chico ${niv}">${NIVEL_TXT[niv]}</span>` : `<i class="gr-dot ${tab}"></i>`}</button>
      ${abierto ? `<div class="gr-agregar"><p>¿Agregar a ${ART[sig.k] || 'la próxima comida'} de hoy?</p><div class="gr-botones">
        <button type="button" class="btn pri" data-a="guiaAgregar" data-id="${esc(id)}" data-v="${esc(sig.id)}">${ico('plus')}Sí, agregar</button>
        <button type="button" class="btn quieto" data-a="guiaTocar" data-id="${esc(id)}">Solo estaba mirando</button></div></div>` : ''}</div>`;
  }).join('');
}

export function guiaRapida(comidas) {
  const u = estado.ui, tab = u.guiaTab || 'buenas', buscando = String(u.guiaBusca || '').trim().length >= 2;
  return `<section class="guia-rapida" data-k="guia-rapida">
    <p class="h2">Guía de comidas</p>
    <input class="texto" id="gr-busca" type="search" placeholder="Buscar: pan, cazuela…" value="${esc(u.guiaBusca || '')}" maxlength="40" autocomplete="off" data-i="guiaBuscar" aria-label="Buscar un alimento">
    <div class="opciones gr-seg${buscando ? ' apagada' : ''}">${PESTANAS.map(([k, n]) => `<button type="button" class="opcion${!buscando && k === tab ? ' sel' : ''}" data-a="guiaPestana" data-v="${k}" aria-pressed="${!buscando && k === tab ? 'true' : 'false'}">${n}</button>`).join('')}</div>
    <div class="gr-lista" id="gr-lista">${filasGuia(comidas)}</div>
    <p class="nota">Guía general · se ajusta con la pauta del CESFAM.</p>
  </section>`;
}

const comidasDeHoy = () => itemsDelDia(claveFecha(estado.ahora)).filter((i) => i.tipo === 'comida');

acciones.guiaPestana = (d) => { estado.ui.guiaTab = d.v; estado.ui.guiaBusca = ''; estado.ui.guiaSel = ''; pintar(); };
acciones.guiaTocar = (d) => { estado.ui.guiaSel = estado.ui.guiaSel === d.id ? '' : d.id; pintar(); };
// Mientras se escribe se cambia solo la lista (no se repinta todo, así no se pierde el teclado).
acciones.guiaBuscar = (d, el) => {
  estado.ui.guiaBusca = el.value; estado.ui.guiaSel = '';
  const caja = porId('gr-lista'); if (caja) caja.innerHTML = filasGuia(comidasDeHoy());
  const seg = document.querySelector('.gr-seg'), busca = String(el.value).trim().length >= 2;
  if (seg) { seg.classList.toggle('apagada', busca); Array.prototype.forEach.call(seg.children, (b) => { const sel = !busca && b.getAttribute('data-v') === (estado.ui.guiaTab || 'buenas'); b.classList.toggle('sel', sel); b.setAttribute('aria-pressed', sel ? 'true' : 'false'); }); }
};
// "Sí, agregar": abre el editor de esa comida con el alimento escrito. No se guarda nada hasta que la familia toque Guardar.
acciones.guiaAgregar = (d) => {
  const a = alimentoPorId(d.id), it = comidasDeHoy().find((i) => i.id === d.v);
  if (!a || !it) return;
  const bs = estado.ui.borradoresComida || (estado.ui.borradoresComida = {});
  const b = bs[it.id] || { k: it.k, fecha: claveFecha(estado.ahora), modo: 'otra', nota: '', comio: '', cuando: '', hora: '' };
  const nombre = nombreCorto(a).toLowerCase();
  b.nota = b.nota ? `${b.nota} con ${nombre}` : nombre;
  delete b.items; bs[it.id] = b;
  estado.ui.guiaSel = '';
  pintar();
  setTimeout(() => { const ed = document.querySelector(`[data-k="ed-${it.id}"]`); if (ed && ed.scrollIntoView) ed.scrollIntoView({ block: 'center' }); }, 80);
};
