// AGENDA: quién acompaña a Juan cada día y las fechas médicas.
import { estado, acciones, pintar, ir, aviso, paraGuardar } from '../nucleo.js';
import * as db from '../db.js';
import { esc, ico, val, claveFecha, deClave, sumarDias, lunesDe, fechaMedia, fechaLarga, DIAS, MESES, mayus } from '../util.js';
import { PERSONAS } from '../datos.js';

function turnos() {
  const hoy = claveFecha(estado.ahora);
  const lunes = sumarDias(lunesDe(estado.ahora), 7 * (estado.ui.semana || 0));
  let filas = '';
  for (let i = 0; i < 7; i++) {
    const d = sumarDias(lunes, i), k = claveFecha(d), quien = estado.turnos[k];
    filas += `<button class="turno${k === hoy ? ' es-hoy' : ''}" data-k="${k}" data-a="cambiarTurno" data-dia="${k}" ${k < hoy ? 'disabled' : ''}>
      <span class="num">${d.getDate()}</span><span class="sem">${k === hoy ? 'Hoy' : mayus(DIAS[d.getDay()])}</span>
      <span class="per${quien ? '' : ' vacio'}">${quien ? esc(quien) : 'Sin asignar'}</span></button>`;
  }
  const s = estado.ui.semana || 0;
  return `<div class="titulo-fila"><p class="h2">Quién acompaña</p><a class="mini-btn" href="#ajustes">${ico('gear')}Ajustes</a></div>
    <p class="sub">Semana del ${lunes.getDate()} de ${MESES[lunes.getMonth()]}. Toca un día para cambiar.</p>
    <div class="turnos">${filas}</div>
    <div class="dos">
      ${s > 0 ? `<button class="btn quieto" data-a="semana" data-v="${s - 1}">${ico('left')}Semana anterior</button>` : ''}
      ${s < 8 ? `<button class="btn quieto" data-a="semana" data-v="${s + 1}">Semana siguiente${ico('right')}</button>` : ''}
    </div>`;
}

function listaCitas() {
  const hoy = claveFecha(estado.ahora);
  const conFecha = estado.citas.filter((c) => c.fecha && c.fecha >= hoy).sort((a, b) => (a.fecha + (a.hora || '')).localeCompare(b.fecha + (b.hora || '')));
  const sinFecha = estado.citas.filter((c) => !c.fecha).sort((a, b) => a.ts - b.ts);
  const una = (c) => {
    const d = c.fecha ? deClave(c.fecha) : null;
    return `<a class="cita" href="#agenda/cita/${c.id}" data-k="${c.id}">
      <span class="caja-fecha${d ? '' : ' pendiente'}">${d ? `<span class="m">${MESES[d.getMonth()].slice(0, 3)}</span><span class="d">${d.getDate()}</span>` : `<span class="m">Falta</span><span class="d">?</span>`}</span>
      <span class="info"><span class="tit">${esc(c.titulo)}</span>
        ${d ? `<span class="cuando">${mayus(DIAS[d.getDay()])}${c.hora ? ' · ' + c.hora : ''}</span>` : `<span class="chip amb">${ico('clock')}Sin hora todavía</span>`}
        ${c.lugar ? `<span class="sub">${ico('pin')}${esc(c.lugar)}</span>` : ''}${c.nota ? `<span class="sub">${esc(c.nota)}</span>` : ''}</span></a>`;
  };
  const todas = conFecha.concat(sinFecha).map(una).join('');
  return `<p class="h2 separado">Próximas fechas</p>
    ${todas ? `<div class="citas">${todas}</div>` : '<p class="vacio-txt">No hay fechas anotadas.</p>'}
    <a class="btn pri" href="#agenda/cita/nueva">${ico('plus')}Agregar fecha</a>`;
}

function formCita(id) {
  const c = id === 'nueva' ? {} : estado.citas.find((x) => x.id === id);
  if (!c) return `<div class="envoltura"><p class="vacio-txt">Esta fecha ya no existe.</p><a class="btn pri" href="#agenda">${ico('left')}Volver a Agenda</a></div>`;
  return `<div class="envoltura" data-k="cita-${id}">
    <a class="btn quieto izq" href="#agenda">${ico('left')}Volver a Agenda</a>
    <div class="campo"><label for="c-titulo">¿Qué es?</label><input class="texto" id="c-titulo" value="${esc(c.titulo || '')}" placeholder="Ej: Control con cardiólogo" maxlength="60" autocomplete="off"></div>
    <div class="dos"><div class="campo"><label for="c-fecha">Día</label><input class="texto" id="c-fecha" type="date" value="${esc(c.fecha || '')}"></div>
      <div class="campo"><label for="c-hora">Hora</label><input class="texto" id="c-hora" type="time" value="${esc(c.hora || '')}"></div></div>
    <p class="nota">Si todavía no dan la hora, deja el día vacío. Queda anotada como "Sin hora todavía".</p>
    <div class="campo"><label for="c-lugar">Lugar</label><input class="texto" id="c-lugar" value="${esc(c.lugar || '')}" maxlength="80" autocomplete="off"></div>
    <div class="campo"><label for="c-nota">Nota</label><input class="texto" id="c-nota" value="${esc(c.nota || '')}" maxlength="140" autocomplete="off"></div>
    ${estado.ui.errorCita ? `<p class="error" role="alert">${ico('alert')}${esc(estado.ui.errorCita)}</p>` : ''}
    <button class="btn pri" data-a="guardarCita" data-id="${id}">${ico('check')}Guardar</button>
    ${id !== 'nueva' ? `<button class="btn quieto" data-a="borrarCita" data-id="${id}">${ico('trash')}Borrar esta fecha</button>` : ''}
  </div>`;
}

export function render(args) {
  if (args[0] === 'cita') return formCita(args[1]);
  return `<div class="envoltura">${turnos()}${listaCitas()}</div>`;
}
export const titulo = (args) => (args[0] === 'cita' ? (args[1] === 'nueva' ? 'Nueva fecha' : 'Fecha') : 'Agenda');

acciones.semana = (d) => { estado.ui.semana = Number(d.v); pintar(); };
acciones.cambiarTurno = (d) => {
  const actual = estado.turnos[d.dia];
  const i = PERSONAS.indexOf(actual);
  const sig = i === PERSONAS.length - 1 ? '' : PERSONAS[i + 1];   // Mamá → Fernando → Fabián → sin asignar
  if (sig) db.poner('turnos', d.dia, { fecha: d.dia, quien: sig, anoto: estado.quien, ts: Date.now() });
  else db.borrar('turnos', d.dia);
};
acciones.guardarCita = (d) => {
  const titulo = val('c-titulo');
  if (!titulo) { estado.ui.errorCita = 'Escribe qué es (por ejemplo: Control con cardiólogo).'; pintar(); return; }
  const fecha = val('c-fecha'), hora = val('c-hora');
  if (!fecha && hora) { estado.ui.errorCita = 'Si pones la hora, pon también el día.'; pintar(); return; }
  const id = d.id === 'nueva' ? db.nuevoId('citas') : d.id;
  const previa = estado.citas.find((x) => x.id === id);
  db.poner('citas', id, { titulo, fecha, hora, lugar: val('c-lugar'), nota: val('c-nota'), quien: estado.quien, ts: previa ? previa.ts : Date.now() });
  estado.ui.errorCita = '';
  aviso(`Guardado: ${titulo}${fecha ? ' · ' + fechaMedia(deClave(fecha)) : ''}`);
  ir('agenda');
};
acciones.borrarCita = (d) => {
  const c = estado.citas.find((x) => x.id === d.id); if (!c) return;
  const copia = paraGuardar(c);
  db.borrar('citas', d.id);
  aviso('Fecha borrada', () => db.poner('citas', d.id, copia));
  ir('agenda');
};
export { fechaLarga };
