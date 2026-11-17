// COMIDAS: qué preparar, cuánto servir y qué comió. Compras y guía se abren aparte.
import { estado, acciones, pintar, aviso, esAdmin, esJuan, paraGuardar } from '../nucleo.js';
import * as db from '../db.js';
import { esc, ico, val, porId, claveFecha, deClave, hhmm, fechaLarga, DIAS, DIAS_K, mayus } from '../util.js';
import { GUIA, COLACIONES, colacionesDe } from '../datos.js';
import { itemsDelDia, sinSubir } from '../plan.js';
import { SECCIONES_GUIA, GUIA_COMIDAS, PARTES_PLATO, platoGrande, dibujoPlatoCorazon, EXPLICA_COMIDA } from '../guias.js';
import { consultarComida } from '../alimentos.js';
import { resultadoConsulta } from './consulta-comida.js';
import { infografia, detenerRecorridos } from '../visuales.js';
import * as nutricion from './nutricion.js';
import { cargarCatalogo, catalogoListo, interpretar, alimentoPorId, cgDe, nivelComida, NIVEL_TXT } from '../glucemica.js';
import { platoDelDia, guiaRapida } from './plato-dia.js';

// ---- Carga glucémica: el catálogo se carga una vez; al llegar, se repinta. ----
cargarCatalogo().then(() => { try { pintar(); } catch (e) { /* aún no hay pantalla */ } });
export const FACTOR = { todo: 1, parte: 0.5, nada: 0 };
const r1 = (n) => Math.round(n * 10) / 10;
// Alimentos reconocidos en un texto, conservando la porción ya elegida si el alimento sigue ahí.
// "2 platos de arroz" → 2 · "media taza de arroz" → ½ (solo al reconocer por primera vez).
function cantidadDicha(t) { const s = String(t || '').trim().toLowerCase(); return /^(2|dos|doble)(\s|$)/.test(s) ? 2 : /^(media|medio|1\/2|½|mitad)(\s|$)/.test(s) ? 0.5 : 1; }
export const nombreCorto = (a) => a.n.replace(/ cocid[oa]s?$/i, '');
function calcularItems(texto, previos) {
  const usados = {};
  return interpretar(texto).map((x) => {
    if (!x.a) return { t: x.texto, id: '', pi: 0 };
    const prev = (previos || []).find((p) => p.id === x.a.id && !usados[p.id]);
    usados[x.a.id] = 1;
    return { t: x.texto, id: x.a.id, pi: prev ? Math.min(prev.pi || 0, x.a.p.length - 1) : 0, m: prev && prev.m ? prev.m : cantidadDicha(x.texto) };
  });
}
function totalCG(items, comio) {
  return (items || []).reduce((s, it) => { const a = it.id && alimentoPorId(it.id); return a ? s + cgDe(a, gramosDe(a, it)) : s; }, 0) * (FACTOR[comio] === undefined ? 1 : FACTOR[comio]);
}
// Carga de un registro guardado: usa lo elegido al anotar; los antiguos se interpretan con la porción habitual.
function cgRegistro(reg) {
  if (!catalogoListo() || !reg || reg.comio === 'nada') return null;
  if (typeof reg.cg === 'number') return reg.cg;
  const items = calcularItems(reg.nota || reg.previsto || '', []);
  if (!items.some((i) => i.id)) return null;
  return totalCG(items, reg.comio);
}
const medidorCG = (cg, chico) => { const n = nivelComida(cg); return `<span class="cg-chip ${n}${chico ? ' chico' : ''}"><span class="cg-barras"><i></i><i></i><i></i></span>${NIVEL_TXT[n]} para el azúcar</span>`; };
// Porción: la medida base del alimento × ½ · 1 · 2.
const MULT = [[0.5, '½'], [1, '1'], [2, '2']];
function gramosDe(a, it) { return a.p[it.pi || 0][1] * (it.m || 1); }
function medidaTxt(a, it) {
  const [nom, g] = a.p[it.pi || 0], m = it.m || 1;
  if (m === 1) return nom;
  const igual = a.p.find((p) => Math.abs(p[1] - g * m) < 1);
  if (igual) return igual[0];
  // "¾ taza" × 2 → "1½ tazas"; si no queda una cifra limpia: "mitad de ¾ taza".
  const FR = { '¼': 0.25, '½': 0.5, '¾': 0.75 }, TXT = { 0.25: '¼', 0.5: '½', 0.75: '¾', 1: '1', 1.5: '1½', 2: '2', 3: '3', 4: '4', 6: '6' };
  const mm = /^(\d+)?([¼½¾])?\s+([^(]+?)(\s*\(.*\))?$/.exec(nom);
  if (mm && (mm[1] || mm[2])) {
    const q = (Number(mm[1]) || 0) + (FR[mm[2]] || 0), nq = q * m;
    if (TXT[nq]) return `${TXT[nq]} ${nq > 1 ? mm[3].split(' ').map((w) => (/[aeiouáéó]$/.test(w) ? w + 's' : w + 'es')).join(' ') : mm[3]}`;
  }
  return m === 0.5 ? `mitad de ${nom}` : `el doble de ${nom}`;
}
const EMOJI = [[/arroz/, '🍚'], [/poroto|lenteja|garbanzo|arveja/, '🥣'], [/pollo|pavo|pechuga|trutro/, '🍗'], [/pescado|merluza|salmon|jurel|atun|congrio|reineta|marisc|chorito|paila/, '🐟'],
  [/ensalada|lechuga|tomate|repollo|verdura/, '🥗'], [/papa|pure|camote/, '🥔'], [/fideo|tallar|noqui|lasan/, '🍝'], [/panqueque/, '🥞'], [/huevo|tortilla/, '🥚'], [/^pan|hallulla|marraq|tostada|galleta/, '🍞'],
  [/sopa|cazuela|caldo|crema|carbonada|charquican|guiso/, '🍲'], [/leche|yogur|queso|quesillo/, '🥛'], [/^cafe|^te_/, '☕'], [/vacuno|carne|bistec|cerdo|albondi|hamburg|longaniza|vienesa/, '🥩'],
  [/palta/, '🥑'], [/bebida|jugo|nectar|agua/, '🥤'], [/manzana|compota/, '🍎'], [/platano/, '🍌'], [/naranja|mandarina|pomelo/, '🍊']];
const GRUPO_EMOJI = { frutas: '🍎', verduras: '🥗', dulces_bebidas: '🍰', preparaciones: '🍲', pan_cereales: '🍞', lacteos: '🥛', carnes_huevos: '🥩', pescados: '🐟', legumbres: '🥣', tuberculos: '🥔', grasas: '🫒', snacks: '🍪' };
export function emojiDe(a) { const e = EMOJI.find(([re]) => re.test(a.id)); return e ? e[1] : (GRUPO_EMOJI[a.gr] || '🍽'); }
// Un solo consejo: si achicar a la mitad el alimento que más sube el azúcar baja el nivel del plato.
function ideaPlato(items, comio) {
  const f = FACTOR[comio] === undefined ? 1 : FACTOR[comio], total = totalCG(items, comio), n = nivelComida(total);
  if (n === 'suave') return null;
  let mejor = null;
  items.forEach((it, i) => { const a = it.id && alimentoPorId(it.id); if (!a || (it.m || 1) < 1) return;
    const cg = cgDe(a, gramosDe(a, it)) * f; if (!mejor || cg > mejor.cg) mejor = { i, a, it, cg }; });
  if (!mejor) return null;
  const m2 = (mejor.it.m || 1) / 2, nuevo = nivelComida(total - mejor.cg / 2);
  if (nuevo === n) return null;
  return { i: mejor.i, a: mejor.a, m: m2, nivel: nuevo, medida: medidaTxt(mejor.a, { pi: mejor.it.pi, m: m2 }) };
}
function detectadosHtml(b, it) {
  if (!catalogoListo() || !String(b.nota || '').trim()) return '';
  const items = b.items || [];
  if (!items.length) return '';
  const filas = items.map((x, n) => {
    const a = x.id && alimentoPorId(x.id);
    if (!a) return `<div class="cap-ing sin"><span class="em">🍽</span><p class="n">${esc(x.t)}<small>Se guarda, sin calcular</small></p></div>`;
    const m = x.m || 1;
    return `<div class="cap-ing"><span class="em">${emojiDe(a)}</span><p class="n">${esc(nombreCorto(a))}<small>${esc(medidaTxt(a, x))}</small></p>
      <div class="mult" role="group" aria-label="Porción de ${esc(a.n)}">${MULT.map(([v, t]) => `<button type="button" class="${v === m ? 'sel' : ''}" aria-pressed="${v === m}" data-a="elegirPorcion" data-id="${it.id}" data-k="${it.k}" data-n="${n}" data-v="${v}">${t}</button>`).join('')}</div></div>`;
  }).join('');
  if (!items.some((x) => x.id)) return `<div class="detectados">${filas}</div>`;
  const comio = b.comio || 'todo', n = nivelComida(totalCG(items, comio)), idea = ideaPlato(items, comio);
  const listo = b.listo && !idea ? `<div class="idea-plato hecha"><span class="em">✓</span><p>Listo: ${esc(b.listo)}<small>Ahora sube ${NIVEL_TXT[n].toLowerCase()}</small></p></div>` : '';
  const ideaHtml = idea ? `<button type="button" class="idea-plato" data-a="aplicarIdeaPlato" data-id="${it.id}" data-k="${it.k}" data-n="${idea.i}" data-v="${idea.m}"><span class="em">${emojiDe(idea.a)}</span><p>Menos ${esc(nombreCorto(idea.a).toLowerCase())}<small>${esc(idea.medida)} · baja a ${NIVEL_TXT[idea.nivel]}</small></p><span class="accion">Cambiar</span></button>` : '';
  return `<div class="detectados">${filas}<div class="veredicto-plato"><span>Sube el azúcar</span><span class="cg-chip ${n}">${NIVEL_TXT[n]}</span></div>${ideaHtml}${listo}</div>`;
}
const COMIO = { todo: 'Comió todo', parte: 'Comió una parte', nada: 'No comió' };
const HORA_OK = /^([01]\d|2[0-3]):[0-5]\d$/;
const PREGUNTA_COMIDA = { desayuno: '¿Qué desayunó hoy?', almuerzo: '¿Qué almorzó hoy?', once: '¿Qué comió en la once?', cena: '¿Qué cenó hoy?' };
const volver = `<a class="btn quieto izq" href="#comidas">${ico('left')}Volver a Comidas</a>`;
const lineas = (t) => String(t || '').split('\n').map((x) => x.trim()).filter(Boolean);

function borradores() {
  if (!estado.ui.borradoresComida) estado.ui.borradoresComida = {};
  return estado.ui.borradoresComida;
}
function leerBorrador(id, k) {
  const b = borradores()[id]; if (!b) return null;
  const cNota = porId('otra-' + k), cHora = porId('hora-comida-' + k);
  if (cNota) b.nota = cNota.value;
  if (cHora) b.hora = cHora.value.trim();
  if (b.consulta && b.consulta.texto !== String(b.nota || '').trim()) delete b.consulta;
  return b;
}
function sincronizarBorradoresEnVivo() {
  const bs = estado.ui.borradoresComida; if (!bs) return;
  Object.keys(bs).forEach((id) => { if (bs[id]) leerBorrador(id, bs[id].k); });
}

function editorComida(it, reg, hoy) {
  const b = borradores()[it.id] || { k: it.k, fecha: reg ? reg.fecha : hoy, modo: reg ? 'editar' : 'otra', nota: (reg && reg.nota) || '', comio: (reg && reg.comio) || '', cuando: reg ? 'temprano' : '', hora: reg ? hhmm(new Date(reg.ts)) : '' };
  borradores()[it.id] = b;
  if (!b.items && b.nota && catalogoListo()) b.items = calcularItems(b.nota, reg && reg.items);
  const fechaTxt = `${b.fecha === hoy ? 'Hoy · ' : ''}${fechaLarga(deClave(b.fecha)).toLowerCase()}`;
  const esOtra = b.modo === 'otra';
  return `<div class="editor-comida" data-k="ed-${it.id}">
    <p class="rotulo">${ico('edit')}${reg ? 'Corregir comida' : 'Anotar comida'}</p>
    <p class="nota">${esc(fechaTxt)}</p>
    <div class="campo">
      <label for="otra-${it.k}">${esJuan() ? '¿Qué comiste?' : esOtra ? (PREGUNTA_COMIDA[it.k] || '¿Qué comió en la colación?') : '¿Qué comió? (vacío si fue el menú)'}</label>
      <input class="texto" id="otra-${it.k}" value="${esc(b.nota)}" placeholder="Ej: sopa de pollo con verduras" maxlength="100" autocomplete="off" data-c="actualizarBorradorComida" data-i="actualizarBorradorComida" data-id="${it.id}" data-k="${it.k}">
    </div>
    <div id="det-${it.k}">${detectadosHtml(b, it)}</div>
    <div class="grupo">
      <p class="rotulo">¿Cuánto comió?</p>
      <div class="opciones">${[['todo', 'Todo'], ['parte', 'Una parte'], ['nada', 'Nada']].map(([v, n]) => `<button type="button" class="opcion${b.comio === v ? ' sel' : ''}" data-a="elegirCantComida" data-id="${it.id}" data-k="${it.k}" data-v="${v}" aria-pressed="${b.comio === v ? 'true' : 'false'}">${n}</button>`).join('')}</div>
    </div>
    <div class="grupo">
      <p class="rotulo">¿A qué hora fue?</p>
      <div class="opciones">
        <button type="button" class="opcion${b.cuando === 'ahora' ? ' sel' : ''}" data-a="cuandoComida" data-id="${it.id}" data-k="${it.k}" data-v="ahora" aria-pressed="${b.cuando === 'ahora' ? 'true' : 'false'}">Ahora</button>
        <button type="button" class="opcion${b.cuando === 'temprano' ? ' sel' : ''}" data-a="cuandoComida" data-id="${it.id}" data-k="${it.k}" data-v="temprano" aria-pressed="${b.cuando === 'temprano' ? 'true' : 'false'}">Más temprano</button>
      </div>
      ${b.cuando === 'temprano' ? `<div class="campo"><label for="hora-comida-${it.k}">Hora en que comió</label><input class="texto" id="hora-comida-${it.k}" type="time" value="${esc(b.hora)}" data-c="actualizarBorradorComida" data-id="${it.id}" data-k="${it.k}"></div>` : ''}
    </div>
    ${it.k === 'almuerzo' ? `<p class="nota">La hora de inicio del almuerzo para medir el azúcar se confirma en Medir.</p>` : ''}
    ${b.error ? `<p class="error" role="alert">${ico('alert')}${esc(b.error)}</p>` : ''}
    <div class="dos">
      <button type="button" class="btn pri" data-a="guardarComidaForm" data-id="${it.id}" data-k="${it.k}">${ico('check')}Guardar comida</button>
      <button type="button" class="btn quieto" data-a="cancelarComidaForm" data-id="${it.id}" data-k="${it.k}">${ico('x')}Cancelar</button>
    </div>
    ${reg ? `<button type="button" class="btn quieto" data-a="quitarComida" data-id="${it.id}">${ico('trash')}Quitar este registro</button>` : ''}
  </div>`;
}

function tarjetaComida(it, ahoraHM, hoy) {
  sincronizarBorradoresEnVivo();
  const reg = estado.tomas[it.id], porciones = lineas(it.porciones), b = borradores()[it.id];
  const servir = porciones.length
    ? `<ul class="porciones">${porciones.map((p) => { const partes = p.split(/\s+[—–-]\s+|:\s+/); return `<li><span>${esc(partes[0])}</span>${partes[1] ? `<b>${esc(partes.slice(1).join(' '))}</b>` : ''}</li>`; }).join('')}</ul>`
    : `<span class="chip amb">${ico('clock')}Porción pendiente de la nutricionista</span>`;
  let registro;
  if (b) {
    registro = editorComida(it, reg, hoy);
  } else if (reg) {
    const hReal = hhmm(new Date(reg.ts));
    const traza = [
      `Comió a las ${hReal}`,
      reg.corregido ? `corregido${reg.editadoPor ? ' por ' + reg.editadoPor : ''}` : '',
      `anotó ${reg.quien}`,
      sinSubir(reg) ? 'sin subir' : '',
    ].filter(Boolean).map(esc).join(' · ');
    registro = `<div class="registro hecho"><span class="ic hecho">${ico('check')}</span><div class="txt">
        <p class="firma">${COMIO[reg.comio] || 'Anotado'}${reg.otra ? ' · otra comida' : ''}${reg.nota ? ': ' + esc(reg.nota) : ''}</p>
        <p class="sub">${traza}</p>${cgRegistro(reg) !== null ? medidorCG(cgRegistro(reg), true) : ''}</div>
      <div class="acciones-reg">
        <button type="button" class="btn quieto auto" data-a="editarComida" data-id="${it.id}" data-k="${it.k}">${ico('edit')}Corregir</button>
        <button type="button" class="btn quieto auto" data-a="quitarComida" data-id="${it.id}">${ico('undo')}Cambiar</button>
      </div></div>`;
  } else if (!it.opcional && it.hora > ahoraHM) {
    registro = '<p class="nota">Si comió más temprano, anótalo arriba.</p>';
  } else {
    registro = `<p class="rotulo">${esJuan() ? 'Si comiste este menú' : 'Si comió este menú'}</p>
      <div class="opciones">${[['todo', 'Todo'], ['parte', 'Una parte'], ['nada', 'Nada']].map(([v, n]) => `<button type="button" class="opcion" data-a="anotarComida" data-id="${it.id}" data-k="${it.k}" data-v="${v}">${n}</button>`).join('')}</div>`;
  }
  const menu = `<details class="comida-menu" data-k="menu-${it.id}"><summary>Ver menú orientativo y porción</summary>
    ${estado.config.menuEsEjemplo ? '<p class="nota">Menú de ejemplo.</p>' : ''}
    <div class="bloque"><p class="rotulo">Menú previsto</p><p class="sub grande">${esc(it.texto)}</p></div>
    <div class="bloque"><p class="rotulo">Porción indicada</p>${servir}</div>
    ${!b && !reg ? `<div class="bloque">${registro}</div>` : ''}</details>`;
  return `<div class="panel comida-card" data-k="${it.id}">
    <div class="titulo-fila"><div class="cabeza"><span class="ic comida">${ico(it.icono)}</span><p class="h3">${it.nombre}</p>${it.opcional ? '<span class="chip neutro">Opcional</span>' : ''}</div><span class="chip neutro">${it.hora}</span></div>
    ${b || reg ? `<div class="bloque">${registro}</div>` : `<button type="button" class="btn sec" data-a="otraComida" data-id="${it.id}" data-k="${it.k}">${ico('edit')}${esJuan() ? '¿Qué comiste?' : PREGUNTA_COMIDA[it.k] || 'Anotar colación'}</button>`}
    ${menu}</div>`;
}

function bloqueCuidadoComidas() {
  const u = estado.ui, abierto = !!u.porQueComida;
  if (esJuan()) return `<div class="panel cuidado"><div class="comida-hero">${dibujoPlatoCorazon()}<h2 class="h3">Comer bien cuida tu corazón</h2></div><button class="btn sec" data-a="alternarPorQueComida" aria-expanded="${abierto}">${ico('info')}${abierto?'Cerrar explicación':'¿Por qué importa?'}</button>${abierto?`<div class="comida-explica ce-tarjetas" data-k="exp-j-${u.comidaAnimVez || 0}">${EXPLICA_COMIDA.map(([t, d, svg], i) => `<div class="ce-tarjeta ce-${i + 1}">${svg}<p class="tit">${esc(t)}</p><p class="sub">${esc(d)}</p></div>`).join('')}</div>`:''}</div>`;
  return `<div class="panel cuidado comida-encabezado" data-k="comida-cab-${u.comidaAnimVez || 0}">
    <div class="comida-hero">
      ${dibujoPlatoCorazon()}
      <div class="comida-hero-txt">
        <p class="h3">Comer bien también cuida tu corazón.</p>
      </div>
    </div>
    <div class="comida-hero-acc">
      <button type="button" class="btn sec auto" data-a="alternarPorQueComida" aria-expanded="${abierto ? 'true' : 'false'}">${ico(abierto ? 'down' : 'info')}${abierto ? 'Ocultar explicación' : '¿Por qué importa?'}</button>
      ${abierto ? `<button type="button" class="btn quieto auto" data-a="repetirAnimComida">${ico('undo')}Ver de nuevo</button>` : ''}
    </div>
    ${abierto ? `<div class="comida-explica ce-tarjetas" data-k="exp-${u.comidaAnimVez || 0}">
      ${EXPLICA_COMIDA.map(([t, d, svg], i) => `<div class="ce-tarjeta ce-${i + 1}">${svg}<p class="tit">${esc(t)}</p><p class="sub">${esc(d)}</p></div>`).join('')}
    </div>` : ''}
  </div>`;
}

function principal() {
  const hoy = claveFecha(estado.ahora), ahoraHM = hhmm(estado.ahora);
  const comidas = itemsDelDia(hoy).filter((i) => i.tipo === 'comida');
  if (esJuan()) return `<div class="envoltura juan-comidas">${bloqueCuidadoComidas()}<h2 class="h2">Mis comidas de hoy</h2>${comidas.map(it=>{
    const reg=estado.tomas[it.id];
    return `<section class="panel"><div class="titulo-fila"><h3 class="h3">${ico(it.icono)}${esc(it.nombre)}</h3><span class="chip neutro">${it.opcional?'Opcional':it.hora}</span></div>${reg?`<p class="tit">${esc(reg.nota||reg.previsto||it.texto)}</p><p class="firma">${COMIO[reg.comio]||'Anotado'} · ${hhmm(new Date(reg.ts))}</p><p class="nota">Anotó ${esc(reg.quien)}${sinSubir(reg)?' · sin subir':''}</p>`:'<p class="sub">Todavía no está anotado.</p>'}<details class="comida-menu"><summary>Ver la pauta de esta comida</summary><p class="sub">${esc(it.texto)}</p>${estado.config.menuEsEjemplo?'<p class="nota">Menú de ejemplo.</p>':''}<p class="nota">${esc(it.porciones||'Porción pendiente de indicar.')}</p></details></section>`;
  }).join('')}<a class="btn sec" href="#recuperacion/3">${ico('play')}La comida trabaja contigo</a><a class="btn sec" href="#recuperacion/6">${ico('play')}Tu peso</a><a class="btn quieto" href="#comidas/guia">${ico('food')}Ideas para cuidarme</a><p class="nota">La familia anota y corrige tus comidas desde sus perfiles.</p></div>`;
  const faltan = estado.compras.filter((i) => !i.comprado).length;
  const op = (ruta, icono, t, s) => `<a class="opcion-aj" href="#${ruta}"><span class="ic comida">${ico(icono)}</span><span class="info"><span class="tit">${t}</span><span class="sub">${s}</span></span>${ico('right')}</a>`;
  return `<div class="envoltura">
    ${bloqueCuidadoComidas()}
    <div class="titulo-fila"><p class="h2">Comidas de hoy</p><span class="chip neutro">${mayus(DIAS[estado.ahora.getDay()])}</span></div>
    ${platoDelDia(hoy, comidas)}
    ${comidas.length ? comidas.map((it) => tarjetaComida(it, ahoraHM, hoy)).join('') : '<p class="vacio-txt">No hay menú anotado para hoy.</p>'}
    <div class="lista-aj">
      ${op('recuperacion/3', 'play', 'La comida trabaja contigo', 'Capítulo 3 · con voz')}
      ${op('recuperacion/6', 'play', 'Tu peso', 'Capítulo 6 · con voz')}
      ${op('comidas/consulta', 'info', 'Revisar una comida', 'Ingredientes, cantidades y pauta')}
      ${esAdmin() ? op('comidas/colaciones', 'clock', 'Organizar colaciones', 'Opcionales, horarios e indicaciones') : ''}
      ${op('comidas/compras', 'cart', 'Lista de compras', faltan ? `${faltan} por comprar` : 'Nada pendiente')}
      ${op('comidas/guia', 'info', 'Guía de comidas y plato', 'Desayuno, almuerzo, once y colaciones')}
      ${esAdmin() ? op('ajustes/menu', 'edit', 'Editar el menú y las porciones', 'Menú de la semana') : ''}
    </div>
    ${guiaRapida(comidas)}
  </div>`;
}

// Guía por comida. Arriba van los cuatro accesos; el almuerzo trae el plato grande por etapas.
function guia(cual) {
  const sec = GUIA_COMIDAS[cual] ? cual : 'almuerzo', G = GUIA_COMIDAS[sec], u = estado.ui;
  const col = (titulo, cls, icono, lista) => `<div class="col"><h3 class="${cls}">${icono ? ico(icono) : ''}${titulo}</h3><ul>${lista.map((x) => `<li>${x}</li>`).join('')}</ul></div>`;
  const accesos = SECCIONES_GUIA.map(([k, n, icono]) => `<a class="opcion${k === sec ? ' sel' : ''}" href="#comidas/guia/${k}"${k === sec ? ' aria-current="page"' : ''}>${ico(icono)}${n}</a>`).join('');
  // La pauta personal va aparte de las ideas generales, y solo si la nutricionista ya indicó porciones para hoy.
  const pauta = sec === 'colaciones' ? [] : lineas(((estado.config.porciones || {})[DIAS_K[estado.ahora.getDay()]] || {})[sec]);
  const plato = sec !== 'almuerzo' ? '' : `<div class="panel plato-panel" data-k="plato-${u.platoVez || 0}">
      ${platoGrande()}
      <ul class="partes-plato">${PARTES_PLATO.map(([p, cls, t, d]) => `<li class="parte ${p}"><span class="cuadro ${cls}"></span><span><b>${t}</b><span class="sub">${d}</span></span></li>`).join('')}</ul>
      <button class="btn quieto" data-a="verPlato">${ico('undo')}Ver de nuevo</button>
      <p class="nota">Para tomar: agua o una bebida sin azúcar. Es una guía general para el almuerzo; no hay que usar el mismo plato en el desayuno ni en la once.</p></div>`;
  return `<div class="envoltura">${volver}
    <div class="opciones envuelve accesos">${accesos}</div>
    <p class="sub grande">${G.intro}</p>
    ${plato}
    <p class="rotulo">Ideas para ${sec === 'colaciones' ? 'colaciones' : sec === 'once' ? 'la once' : 'el ' + sec}</p>
    <div class="ideas">${G.ideas.map(([t, como, porque]) => `<div class="panel idea"><p class="h3">${t}</p><p class="sub grande">${como}</p><p class="sub">${porque}</p></div>`).join('')}</div>
    ${(G.notas || []).map((n) => `<p class="nota aviso-info">${ico('info')}${n}</p>`).join('')}
    ${sec === 'colaciones' ? '' : `<div class="panel"><p class="rotulo">Cuánto servir</p>${pauta.length
      ? `<ul class="porciones">${pauta.map((x) => `<li><span>${esc(x)}</span></li>`).join('')}</ul><p class="nota">Pauta cargada para hoy.</p>`
      : `<span class="chip amb">${ico('clock')}Porción pendiente de indicar</span><p class="nota">Las porciones las indica la nutricionista. Esta guía no da cantidades.</p>`}</div>`}
    <p class="rotulo">En general</p>
    <div class="guia">${col('Sí', 'ok', 'check', GUIA.si)}${col('Con medida', 'amb', '', GUIA.medida)}${col('Evitar', 'rojo', 'x', GUIA.evitar)}</div>
    <p class="nota">Guía general basada en el método del plato de los CDC. Valen primero las indicaciones de su médico y de la nutricionista.</p>
  </div>`;
}

function compras() {
  const lista = estado.compras.slice().sort((a, b) => (a.comprado === b.comprado ? a.ts - b.ts : a.comprado ? 1 : -1));
  const items = lista.map((i) => `<div class="item${i.comprado ? ' listo' : ''}" data-k="${i.id}" data-a="marcarCompra" data-id="${i.id}" role="button" tabindex="0">
      <span class="caja">${i.comprado ? ico('check') : ''}</span><span class="t">${esc(i.texto)}</span></div>`).join('');
  return `<div class="envoltura">${volver}
    <div class="agregar"><input class="texto" id="compra-nueva" placeholder="Ej: lechuga" maxlength="60" autocomplete="off" enterkeyhint="done" data-enter="agregarCompra" aria-label="Qué hay que comprar">
      <button class="btn pri auto" data-a="agregarCompra">${ico('plus')}Agregar</button></div>
    ${items ? `<div class="lista-compras">${items}</div>` : '<p class="vacio-txt">La lista está vacía.</p>'}
    ${lista.some((i) => i.comprado) ? `<button class="btn quieto" data-a="borrarComprados">${ico('trash')}Borrar comprados</button>` : ''}
  </div>`;
}

export function render(args) { return args[0] === 'consulta' ? nutricion.render() : args[0] === 'colaciones' ? organizarColaciones() : args[0] === 'compras' ? compras() : args[0] === 'guia' ? guia(args[1]) : principal(); }
export const titulo = (args) => (args[0] === 'colaciones' ? 'Colaciones' : args[0] === 'compras' ? 'Compras' : args[0] === 'guia' ? 'Guía' : 'Comidas');

acciones.verPlato = () => { estado.ui.platoVez = (estado.ui.platoVez || 0) + 1; pintar(); };
acciones.alternarPorQueComida = () => { detenerRecorridos(); sincronizarBorradoresEnVivo(); estado.ui.porQueComida = !estado.ui.porQueComida; if (estado.ui.porQueComida) estado.ui.comidaAnimVez = (estado.ui.comidaAnimVez || 0) + 1; pintar(); };
acciones.repetirAnimComida = () => { sincronizarBorradoresEnVivo(); estado.ui.comidaAnimVez = (estado.ui.comidaAnimVez || 0) + 1; pintar(); };

function abrirEditorComida(d, modo) {
  sincronizarBorradoresEnVivo();
  const hoy = claveFecha(estado.ahora), id = d.id || `${hoy}_comida_${d.k}`, reg = estado.tomas[id];
  borradores()[id] = {
    k: d.k,
    fecha: reg ? reg.fecha : hoy,
    modo,
    nota: (reg && reg.nota) || '',
    comio: (reg && reg.comio) || '',
    cuando: reg ? 'temprano' : (modo === 'editar' ? 'temprano' : ''),
    hora: reg ? hhmm(new Date(reg.ts)) : '',
    error: '',
  };
  pintar();
  const c = porId(modo === 'otra' ? 'otra-' + d.k : 'hora-comida-' + d.k) || porId('otra-' + d.k);
  if (c) c.focus();
}
acciones.otraComida = (d) => abrirEditorComida(d, 'otra');
acciones.editarComida = (d) => abrirEditorComida(d, 'editar');
acciones.actualizarBorradorComida = (d) => {
  const anterior = borradores()[d.id], habiaConsulta = anterior && anterior.consulta;
  const b = leerBorrador(d.id, d.k);
  if (habiaConsulta && b && !b.consulta) pintar();
  // Reconoce los alimentos mientras se escribe, sin repintar toda la pantalla (no se pierde el teclado).
  if (b && catalogoListo()) {
    b.items = calcularItems(b.nota || '', b.items); b.listo = '';
    const caja = porId('det-' + d.k);
    if (caja) caja.innerHTML = detectadosHtml(b, { id: d.id, k: d.k });
  }
};
acciones.elegirPorcion = (d) => {
  const b = leerBorrador(d.id, d.k); if (!b || !b.items || !b.items[d.n]) return;
  b.items[d.n].m = Number(d.v) || 1; b.listo = ''; pintar();
};
acciones.aplicarIdeaPlato = (d) => {
  const b = leerBorrador(d.id, d.k); if (!b || !b.items || !b.items[d.n]) return;
  const x = b.items[d.n], a = alimentoPorId(x.id); if (!a) return;
  x.m = Number(d.v) || 1; b.listo = `${nombreCorto(a).toLowerCase()}, ${medidaTxt(a, x)}`; pintar();
};
acciones.consultarAlimentos = (d) => {
  const b = leerBorrador(d.id, d.k); if (!b) return;
  const texto = String(b.nota || '').trim();
  if (!texto) { b.error = 'Escribe qué comió para consultar los alimentos.'; pintar(); porId('otra-' + d.k).focus(); return; }
  b.error = ''; b.consulta = { texto, resultado: consultarComida(texto) }; pintar();
};
acciones.elegirCantComida = (d) => { const b = leerBorrador(d.id, d.k); if (!b) return; b.comio = d.v; b.error = ''; pintar(); };
acciones.cuandoComida = (d) => {
  const b = leerBorrador(d.id, d.k); if (!b) return;
  b.cuando = d.v; b.error = '';
  pintar();
  if (d.v === 'temprano') { const c = porId('hora-comida-' + d.k); if (c) c.focus(); }
};
acciones.cancelarComidaForm = (d) => { delete borradores()[d.id]; pintar(); };
acciones.guardarComidaForm = (d) => {
  const b = leerBorrador(d.id, d.k); if (!b) return;
  const hoy = claveFecha(new Date()), it = itemsDelDia(b.fecha || hoy).find((x) => x.id === d.id) || { id: d.id, k: d.k, nombre: d.k, texto: '' };
  const previo = estado.tomas[d.id];
  const nota = String(b.nota || '').trim();
  const falla = (msg, idCampo) => { b.error = msg; pintar(); if (idCampo && porId(idCampo)) porId(idCampo).focus(); };
  if (b.modo === 'otra' && !nota) return falla('Escribe qué comió.', 'otra-' + d.k);
  if (!b.comio || !COMIO[b.comio]) return falla('Elige cuánto comió (Todo, Una parte o Nada).');
  if (b.cuando !== 'ahora' && b.cuando !== 'temprano') return falla('Elige si comió ahora o más temprano.');
  const ahora = Date.now(), fAsociada = b.fecha || hoy;
  if (!/^\d{4}-\d\d-\d\d$/.test(fAsociada) || fAsociada > hoy) return falla('La fecha asociada no es válida.');
  let ts = ahora;
  if (b.cuando === 'temprano') {
    if (!HORA_OK.test(b.hora || '')) return falla('Pon la hora en que comió (formato HH:MM).', 'hora-comida-' + d.k);
    const fechaBase = deClave(fAsociada);
    fechaBase.setHours(Number(b.hora.slice(0, 2)), Number(b.hora.slice(3, 5)), 0, 0);
    if (claveFecha(fechaBase) !== fAsociada) return falla('La hora no coincide con la fecha del registro.', 'hora-comida-' + d.k);
    if (fechaBase.getTime() > ahora + 60000) return falla('Esa hora todavía no llega. Revisa la hora.', 'hora-comida-' + d.k);
    ts = fechaBase.getTime();
  } else if (fAsociada !== hoy) {
    return falla('Para un día anterior, elige "Más temprano" e indica la hora.', 'hora-comida-' + d.k);
  }
  const reg = {
    clase: 'comida',
    fecha: fAsociada,
    comida: d.k,
    previsto: previo ? (previo.previsto || it.texto) : it.texto,
    comio: b.comio,
    quien: previo ? previo.quien : estado.quien,
    ts,
    creado: previo ? (previo.creado || previo.ts) : ahora,
  };
  if (nota) { reg.nota = nota; reg.otra = true; }
  if (nota && catalogoListo()) {
    const items = calcularItems(nota, b.items);
    reg.items = items.filter((x) => x.id).map((x) => ({ id: x.id, pi: x.pi || 0, m: x.m || 1, g: gramosDe(alimentoPorId(x.id), x) }));
    reg.sinCalcular = items.filter((x) => !x.id).map((x) => x.t);
    if (reg.items.length) reg.cg = r1(totalCG(items, b.comio));
  }
  if (!previo && b.cuando === 'temprano') reg.despues = true;
  if (previo) {
    if (previo.despues) reg.despues = true;
    reg.corregido = true;
    reg.editadoPor = estado.quien;
    reg.editadoTs = ahora;
  }
  const copiaPrev = previo ? paraGuardar(previo) : null;
  db.poner('tomas', d.id, reg);
  delete borradores()[d.id];
  aviso(`${it.nombre || 'Comida'}: ${COMIO[b.comio].toLowerCase()} (${hhmm(new Date(ts))})`, () => {
    if (copiaPrev) db.poner('tomas', d.id, copiaPrev);
    else db.borrar('tomas', d.id);
  });
};
acciones.anotarComida = (d) => {
  sincronizarBorradoresEnVivo();
  const hoy = claveFecha(new Date()), it = itemsDelDia(hoy).find((x) => x.id === d.id);
  if (!it || estado.tomas[d.id]) return;
  const ahora = Date.now();
  const reg = { clase: 'comida', fecha: hoy, comida: d.k, previsto: it.texto, comio: d.v, quien: estado.quien, ts: ahora, creado: ahora };
  db.poner('tomas', d.id, reg);
  delete borradores()[d.id];
  aviso(`${it.nombre}: ${COMIO[d.v].toLowerCase()}`, () => db.borrar('tomas', d.id));
};
acciones.quitarComida = (d) => {
  sincronizarBorradoresEnVivo();
  const reg = estado.tomas[d.id]; if (!reg) return;
  const copia = paraGuardar(reg);
  delete borradores()[d.id];
  db.borrar('tomas', d.id);
  aviso('Registro quitado. Puedes anotarlo de nuevo.', () => db.poner('tomas', d.id, copia));
};
acciones.agregarCompra = () => {
  const campo = porId('compra-nueva'), texto = campo.value.trim();
  if (!texto) { campo.focus(); return; }
  const id = db.nuevoId('compras');
  db.poner('compras', id, { texto, comprado: false, quien: estado.quien, ts: Date.now() });
  campo.value = '';
  aviso(`Agregado: ${texto}`, () => db.borrar('compras', id));
};
acciones.marcarCompra = (d) => {
  const i = estado.compras.find((x) => x.id === d.id); if (!i) return;
  db.cambiar('compras', d.id, { comprado: !i.comprado });
};
acciones.borrarComprados = () => {
  const fuera = estado.compras.filter((i) => i.comprado); if (!fuera.length) return;
  fuera.forEach((i) => db.borrar('compras', i.id));
  aviso(fuera.length === 1 ? 'Se borró 1 producto' : `Se borraron ${fuera.length} productos`, () => fuera.forEach((i) => db.poner('compras', i.id, paraGuardar(i))));
  pintar();
};


function organizarColaciones() {
  if (!esAdmin()) return `<div class="envoltura">${volver}<p>Los horarios los administra Fabián.</p></div>`;
  const c = estado.config.colaciones || {}, sugeridas = colacionesDe(Object.assign({}, estado.config, { colaciones: {} }));
  return `<div class="envoltura">${volver}<p class="sub grande">Son opcionales. Las cantidades y la frecuencia las indica la nutricionista.</p>
    <div class="campo"><label for="col-mostrar">Mostrar en Hoy y Comidas</label><select class="texto" id="col-mostrar"><option value="si"${c.mostrar !== false ? ' selected' : ''}>Sí, como opcionales</option><option value="no"${c.mostrar === false ? ' selected' : ''}>No mostrar</option></select></div>
    ${COLACIONES.map(([k,nombre]) => `<div class="panel"><h2 class="h3">${nombre}</h2>
      <div class="campo"><label for="${k}-hora">Hora orientativa</label><input class="texto" type="time" id="${k}-hora" value="${esc(c[k+'Hora'] || '')}"><p class="nota">Vacío: entre las comidas (${(sugeridas.find((x) => x.k === k) || {}).hora || 'falta horario de comidas'}).</p></div>
      <div class="campo"><label for="${k}-texto">Qué preparar</label><input class="texto" id="${k}-texto" maxlength="250" value="${esc(c[k+'Texto'] || '')}" placeholder="Idea o indicación de la nutricionista"></div>
      <div class="campo"><label for="${k}-porcion">Porción indicada</label><input class="texto" id="${k}-porcion" maxlength="200" value="${esc(c[k+'Porcion'] || '')}" placeholder="Dejar vacío si todavía no la indicó"></div></div>`).join('')}
    <button class="btn pri" data-a="guardarColaciones">${ico('check')}Guardar colaciones</button></div>`;
}
acciones.guardarColaciones = () => {
  if (!esAdmin()) return;
  const c = { mostrar: val('col-mostrar') === 'si' };
  COLACIONES.forEach(([k]) => { c[k+'Hora'] = val(k+'-hora'); c[k+'Texto'] = val(k+'-texto'); c[k+'Porcion'] = val(k+'-porcion'); });
  db.guardarConfig({ colaciones: c, editado: { quien: estado.quien, ts: Date.now() } });
  aviso('Colaciones guardadas'); location.hash = '#comidas';
};
