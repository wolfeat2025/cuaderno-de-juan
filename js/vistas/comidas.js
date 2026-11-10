// COMIDAS: menú de hoy, regla del plato, guía rápida y lista de compras compartida.
import { estado, acciones, pintar, aviso } from '../nucleo.js';
import * as db from '../db.js';
import { esc, ico, porId, DIAS_K, DIAS, mayus } from '../util.js';
import { COMIDAS, GUIA } from '../datos.js';

export function render() {
  const c = estado.config, hoy = estado.ahora;
  const menu = (c.menu || {})[DIAS_K[hoy.getDay()]] || {};
  const filas = COMIDAS.map(([k, nombre, icono]) => `<div class="fila comida"><div class="hora">${c.horasComida[k] || ''}</div>
      <div class="riel"><span class="cap">${ico(icono)}</span></div>
      <div class="cuerpo"><p class="tit">${nombre}</p><p class="sub grande">${menu[k] ? esc(menu[k]) : 'Sin anotar'}</p></div></div>`).join('');
  const col = (titulo, cls, icono, lista) => `<div class="col"><h3 class="${cls}">${icono ? ico(icono) : ''}${titulo}</h3><ul>${lista.map((x) => `<li>${x}</li>`).join('')}</ul></div>`;
  const compras = estado.compras.slice().sort((a, b) => (a.comprado === b.comprado ? a.ts - b.ts : a.comprado ? 1 : -1));
  const items = compras.map((i) => `<div class="item${i.comprado ? ' listo' : ''}" data-k="${i.id}" data-a="marcarCompra" data-id="${i.id}" role="button" tabindex="0">
      <span class="caja">${i.comprado ? ico('check') : ''}</span><span class="t">${esc(i.texto)}</span></div>`).join('');
  const hayComprados = compras.some((i) => i.comprado);

  return `<div class="envoltura">
    <div class="titulo-fila"><p class="h2">Menú de hoy</p><span class="chip neutro">${mayus(DIAS[hoy.getDay()])}</span></div>
    ${c.menuEsEjemplo ? `<p class="nota aviso-ej">${ico('info')}Menú de ejemplo: ajustar con la nutricionista.</p>` : ''}
    <div class="linea">${filas}</div>

    <div class="panel plato">
      <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true">
        <circle cx="36" cy="36" r="34" fill="var(--bg)" stroke="var(--rule)" stroke-width="2"/>
        <path d="M36 2a34 34 0 0 0 0 68z" fill="var(--acc)"/>
        <path d="M36 36V2a34 34 0 0 1 34 34z" fill="var(--ink2)"/>
        <path d="M36 36h34a34 34 0 0 1-34 34z" fill="var(--amb)"/>
      </svg>
      <ul class="leyenda"><li><span class="cuadro a"></span>Mitad: verduras</li><li><span class="cuadro b"></span>Un cuarto: pollo, pescado o legumbres</li><li><span class="cuadro c"></span>Un cuarto: pan, arroz o papa</li></ul>
    </div>

    <div class="guia">${col('Sí', 'ok', 'check', GUIA.si)}${col('Con medida', 'amb', '', GUIA.medida)}${col('Evitar', 'rojo', 'x', GUIA.evitar)}</div>
    <p class="nota">Sin sal agregada y sin azúcar. Guía general: valen primero las indicaciones de su médico y de la nutricionista.</p>

    <p class="h2 separado">Lista de compras</p>
    <div class="agregar"><input class="texto" id="compra-nueva" placeholder="Ej: lechuga" maxlength="60" autocomplete="off" enterkeyhint="done" data-enter="agregarCompra" aria-label="Qué hay que comprar">
      <button class="btn pri auto" data-a="agregarCompra">${ico('plus')}Agregar</button></div>
    ${items ? `<div class="lista-compras">${items}</div>` : '<p class="vacio-txt">La lista está vacía.</p>'}
    ${hayComprados ? `<button class="btn quieto" data-a="borrarComprados">${ico('trash')}Borrar comprados</button>` : ''}
  </div>`;
}

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
  aviso(fuera.length === 1 ? 'Se borró 1 producto' : `Se borraron ${fuera.length} productos`, () => fuera.forEach((i) => {
    const copia = Object.assign({}, i); delete copia.id; db.poner('compras', i.id, copia);
  }));
  pintar();
};
