// AJUSTES (pensado para Fabián): remedios, rangos, emergencia, menú, invitar, alarmas y respaldo.
import { estado, acciones, pintar, ir, aviso, guardarLocal, leerLocal, esAdmin, temaElegido, aplicarTema } from '../nucleo.js';
import * as db from '../db.js';
import { esc, ico, val, porId, idAzar, copiar, compartir, DIAS_K, DIAS_C, claveFecha } from '../util.js';
import { PERSONAS, COMIDAS } from '../datos.js';

const volver = (a, texto) => `<a class="btn quieto izq" href="#${a}">${ico('left')}${texto}</a>`;
const campo = (id, rotulo, valor, extra) => `<div class="campo"><label for="${id}">${rotulo}</label><input class="texto" id="${id}" value="${esc(valor == null ? '' : valor)}" autocomplete="off" ${extra || ''}></div>`;
const area = (id, rotulo, valor, filas) => `<div class="campo"><label for="${id}">${rotulo}</label><textarea class="texto" id="${id}" rows="${filas || 3}">${esc(valor || '')}</textarea></div>`;
const error = () => (estado.ui.errorAj ? `<p class="error" role="alert">${ico('alert')}${esc(estado.ui.errorAj)}</p>` : '');
const clon = (x) => JSON.parse(JSON.stringify(x));
export const linkFamilia = () => `${location.origin}${location.pathname}?f=${estado.familia}`;

function menu() {
  const op = (ruta, icono, t, s) => `<a class="opcion-aj" href="#ajustes/${ruta}"><span class="cap redonda">${ico(icono)}</span><span class="info"><span class="tit">${t}</span><span class="sub">${s}</span></span>${ico('right')}</a>`;
  const n = estado.config.remedios.filter((r) => r.activo !== false).length;
  const resp = leerLocal('cj_respaldo');
  const TEMAS = { auto: 'Automático', claro: 'Claro', oscuro: 'Oscuro' };
  const personales = `${op('apariencia', 'sun', 'Apariencia', TEMAS[temaElegido()])}
      ${op('alarmas', 'bell', 'Alarmas de los remedios', 'Cómo ponerlas en el iPhone')}
      ${op('quien', 'user', 'Quién usa este celular', esc(estado.quien))}`;
  if (!esAdmin()) return `<div class="envoltura">${volver('agenda', 'Volver a Agenda')}<div class="lista-aj">${personales}</div>
    <p class="nota">Los remedios, los rangos y los datos de emergencia los administra Fabián.</p></div>`;
  return `<div class="envoltura">
    ${volver('agenda', 'Volver a Agenda')}
    <p class="rotulo">Administración</p>
    <div class="lista-aj">
      ${op('remedios', 'pill', 'Remedios', n ? `${n} ${n === 1 ? 'activo' : 'activos'}` : 'Aún no hay remedios')}
      ${op('rangos', 'gauge', 'Rangos y horas de medir', estado.config.rangos.provisorio ? 'Provisorios: falta poner los del médico' : 'Con los del médico')}
      ${op('emergencia', 'phone', 'Datos de emergencia', estado.config.emergencia.direccion ? 'Dirección y contactos' : 'Falta la dirección')}
      ${op('menu', 'food', 'Menú semanal', estado.config.menuEsEjemplo ? 'Es el de ejemplo' : 'Ajustado')}
      ${op('invitar', 'family', 'Invitar a la familia', 'Link para WhatsApp')}
      ${op('respaldo', 'download', 'Respaldo', resp ? `Último: ${new Date(resp).toLocaleDateString('es-CL')}` : 'Aún no se hace ninguno')}
    </div>
    <p class="rotulo">Este celular</p>
    <div class="lista-aj">${personales}</div>
  </div>`;
}

// ---------- Remedios ----------
function listaRemedios() {
  const rs = estado.config.remedios;
  return `<div class="envoltura">${volver('ajustes', 'Volver a Ajustes')}
    ${rs.length ? `<div class="lista-aj">${rs.map((r) => `<a class="opcion-aj${r.activo === false ? ' apagado' : ''}" href="#ajustes/remedio/${r.id}" data-k="${r.id}"><span class="cap redonda">${ico('pill')}</span>
      <span class="info"><span class="tit">${esc(r.nombre)}</span><span class="sub">${esc([r.dosis, (r.horarios || []).join(' · ')].filter(Boolean).join(' — '))}${r.activo === false ? ' — Inactivo' : ''}</span></span>${ico('right')}</a>`).join('')}</div>`
    : '<p class="vacio-txt">Aún no hay remedios. Cárgalos desde el informe del alta.</p>'}
    <a class="btn pri" href="#ajustes/remedio/nuevo">${ico('plus')}Agregar remedio</a>
    <p class="nota">Copia el nombre y la dosis tal como salen en el informe del alta o en la receta.</p></div>`;
}
function leerRemedio() {
  const r = estado.ui.rem; if (!r || !porId('r-nombre')) return;
  r.nombre = val('r-nombre'); r.dosis = val('r-dosis'); r.paraQue = val('r-para');
  r.horarios = r.horarios.map((h, i) => val('r-h' + i));
}
function editorRemedio(id) {
  const u = estado.ui;
  if (!u.rem || u.rem._ruta !== id) {
    const base = id === 'nuevo' ? { id: 'r' + idAzar(8), nombre: '', dosis: '', paraQue: '', horarios: ['08:00'], activo: true } : estado.config.remedios.find((x) => x.id === id);
    if (!base) return `<div class="envoltura"><p class="vacio-txt">Este remedio ya no existe.</p>${volver('ajustes/remedios', 'Volver a Remedios')}</div>`;
    u.rem = clon(base); u.rem._ruta = id; if (!u.rem.horarios || !u.rem.horarios.length) u.rem.horarios = ['08:00'];
  }
  const r = u.rem;
  return `<div class="envoltura" data-k="rem-${id}">${volver('ajustes/remedios', 'Volver a Remedios')}
    ${campo('r-nombre', 'Nombre del remedio', r.nombre, 'maxlength="60"')}
    ${campo('r-dosis', 'Dosis (ej: 1 pastilla)', r.dosis, 'maxlength="60"')}
    ${campo('r-para', 'Para qué es, en palabras simples', r.paraQue, 'maxlength="60"')}
    <div class="grupo"><p class="rotulo">A qué hora se toma</p>
      ${r.horarios.map((h, i) => `<div class="agregar"><input class="texto" id="r-h${i}" type="time" value="${esc(h)}" aria-label="Horario ${i + 1}">
        ${r.horarios.length > 1 ? `<button class="btn quieto auto" data-a="quitarHorario" data-i="${i}">${ico('x')}Quitar</button>` : ''}</div>`).join('')}
      <button class="btn quieto" data-a="agregarHorario">${ico('plus')}Agregar otro horario</button></div>
    <button class="btn ${r.activo === false ? 'quieto' : 'sec'}" data-a="alternarActivo">${ico(r.activo === false ? 'x' : 'ccheck')}${r.activo === false ? 'Inactivo: no aparece en Hoy' : 'Activo: aparece en Hoy'}</button>
    ${error()}
    <button class="btn pri" data-a="guardarRemedio">${ico('check')}Guardar remedio</button></div>`;
}
acciones.agregarHorario = () => { leerRemedio(); estado.ui.rem.horarios.push('20:00'); pintar(); };
acciones.quitarHorario = (d) => { leerRemedio(); estado.ui.rem.horarios.splice(Number(d.i), 1); pintar(); };
acciones.alternarActivo = () => { leerRemedio(); estado.ui.rem.activo = estado.ui.rem.activo === false; pintar(); };
acciones.guardarRemedio = () => {
  leerRemedio(); const u = estado.ui, r = u.rem;
  if (!r.nombre) { u.errorAj = 'Falta el nombre del remedio.'; pintar(); return; }
  const horas = r.horarios.filter((h) => /^\d\d:\d\d$/.test(h));
  if (!horas.length || horas.length !== r.horarios.length) { u.errorAj = 'Revisa los horarios: falta poner una hora.'; pintar(); return; }
  const limpio = { id: r.id, nombre: r.nombre, dosis: r.dosis, paraQue: r.paraQue, horarios: Array.from(new Set(horas)).sort(), activo: r.activo !== false };
  const lista = estado.config.remedios.slice(), i = lista.findIndex((x) => x.id === r.id);
  if (i >= 0) lista[i] = limpio; else lista.push(limpio);
  db.guardarConfig({ remedios: lista });
  u.errorAj = ''; u.rem = null; aviso(`Guardado: ${limpio.nombre}`); ir('ajustes/remedios');
};

// ---------- Rangos ----------
const RANGOS = [
  ['presion', 'Presión', [['sisMax', 'Normal: arriba bajo'], ['diaMax', 'Normal: abajo bajo'], ['sisRojoAlto', 'Rojo: arriba desde'], ['diaRojoAlto', 'Rojo: abajo desde'], ['sisRojoBajo', 'Rojo: arriba hasta']]],
  ['pulso', 'Pulso en reposo', [['min', 'Normal desde'], ['max', 'Normal hasta'], ['rojoBajo', 'Rojo: hasta'], ['rojoAlto', 'Rojo: desde']]],
  ['azucar', 'Azúcar (mg/dL)', [['ayMin', 'Ayunas: desde'], ['ayMax', 'Ayunas: hasta'], ['despMax', 'Después de comer: bajo'], ['rojoBajo', 'Rojo: menor que'], ['rojoAlto', 'Rojo: desde']]],
  ['oxigeno', 'Oxígeno (%)', [['min', 'Normal desde'], ['rojoBajo', 'Rojo: menor que']]],
];
function editorRangos() {
  const c = estado.config, u = estado.ui;
  if (u.provisorio === undefined) u.provisorio = c.rangos.provisorio !== false;
  return `<div class="envoltura" data-k="rangos">${volver('ajustes', 'Volver a Ajustes')}
    <p class="nota aviso-ej">${ico('info')}${u.provisorio ? 'Rangos generales provisorios: reemplázalos por los que indique el médico.' : 'Marcados como indicados por el médico.'} Deja vacío lo que el médico no haya indicado.</p>
    ${RANGOS.map(([k, titulo, campos]) => `<div class="panel"><p class="h3">${titulo}</p><div class="rejilla">
      ${campos.map(([f, rot]) => `<div class="campo"><label for="g-${k}-${f}">${rot}</label><input class="texto" id="g-${k}-${f}" inputmode="numeric" pattern="[0-9]*" maxlength="3" autocomplete="off" value="${c.rangos[k][f] == null ? '' : esc(c.rangos[k][f])}"></div>`).join('')}</div></div>`).join('')}
    <div class="panel"><p class="h3">Horas para medir</p><p class="sub">Aparecen en la pantalla Hoy como recordatorio.</p>
      <div class="dos">${[0, 1].map((i) => `<div class="campo"><label for="g-hora${i}">${i ? 'Tarde' : 'Mañana'}</label><input class="texto" id="g-hora${i}" type="time" value="${esc((c.medirHoras || [])[i] || '')}"></div>`).join('')}</div></div>
    <button class="btn ${u.provisorio ? 'quieto' : 'sec'}" data-a="alternarProvisorio">${ico(u.provisorio ? 'alert' : 'ccheck')}${u.provisorio ? 'Son provisorios (tocar si ya son del médico)' : 'Son los del médico'}</button>
    ${error()}
    <button class="btn pri" data-a="guardarRangos">${ico('check')}Guardar rangos</button></div>`;
}
acciones.alternarProvisorio = () => { estado.ui.provisorio = !estado.ui.provisorio; pintar(); };
acciones.guardarRangos = () => {
  const u = estado.ui, r = { provisorio: !!u.provisorio };
  const obligatorios = { presion: ['sisMax', 'diaMax'], pulso: ['min', 'max'], azucar: ['ayMin', 'ayMax', 'despMax'], oxigeno: ['min'] };
  for (const [k, titulo, campos] of RANGOS) {
    r[k] = {};
    for (const [f, rot] of campos) {
      const crudo = val(`g-${k}-${f}`);
      if (crudo === '') { if (obligatorios[k].indexOf(f) >= 0) { u.errorAj = `${titulo}: falta "${rot}".`; pintar(); return; } r[k][f] = null; continue; }
      if (!/^\d{1,3}$/.test(crudo)) { u.errorAj = `${titulo}: "${rot}" debe ser un número.`; pintar(); return; }
      r[k][f] = Number(crudo);
    }
  }
  const horas = [val('g-hora0'), val('g-hora1')].filter((h) => /^\d\d:\d\d$/.test(h)).sort();
  db.guardarConfig({ rangos: r, medirHoras: horas });
  u.errorAj = ''; aviso('Rangos guardados'); ir('ajustes');
};

// ---------- Emergencia ----------
function editorEmergencia() {
  const e = estado.config.emergencia, cs = estado.config.contactos;
  const fila = (i) => { const x = cs[i] || {}; return `<div class="dos">${campo('e-n' + i, i === 3 ? 'Otro contacto' : 'Nombre', x.nombre, 'maxlength="30"')}${campo('e-t' + i, 'Teléfono', x.telefono, 'inputmode="tel" maxlength="20" placeholder="+569..."')}</div>`; };
  return `<div class="envoltura" data-k="emer">${volver('ajustes', 'Volver a Ajustes')}
    <div class="panel"><p class="h3">Cómo llegar a la casa</p>
      ${campo('e-dir', 'Dirección', e.direccion, 'maxlength="120"')}
      ${area('e-ref', 'Referencias para la ambulancia', e.referencias, 3)}</div>
    <div class="panel"><p class="h3">Datos de Juan</p>
      <div class="dos">${campo('e-nombre', 'Nombre', e.nombre, 'maxlength="40"')}${campo('e-edad', 'Edad', e.edad, 'maxlength="20"')}</div>
      ${area('e-cond', 'Antecedentes (uno por línea)', e.condiciones, 4)}
      ${campo('e-alergias', 'Alergias', e.alergias, 'maxlength="120"')}
      ${campo('e-hospital', 'Hospital o clínica donde se atiende', e.hospital, 'maxlength="120"')}
      <p class="nota">Los remedios se toman solos desde la lista de Remedios.</p></div>
    <div class="panel"><p class="h3">Contactos de la familia</p>${[0, 1, 2, 3].map(fila).join('')}</div>
    <button class="btn pri" data-a="guardarEmergencia">${ico('check')}Guardar datos</button></div>`;
}
acciones.guardarEmergencia = () => {
  const contactos = [0, 1, 2, 3].map((i) => ({ nombre: val('e-n' + i), telefono: val('e-t' + i) }));
  db.guardarConfig({
    emergencia: { nombre: val('e-nombre') || 'Juan', edad: val('e-edad'), condiciones: porId('e-cond').value.trim(), alergias: val('e-alergias'), hospital: val('e-hospital'), direccion: val('e-dir'), referencias: porId('e-ref').value.trim() },
    contactos,
  });
  aviso('Datos de emergencia guardados'); ir('ajustes');
};

// ---------- Menú semanal ----------
const ORDEN_DIAS = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];
function leerMenu() {
  const u = estado.ui; if (!u.menu || !porId('mn-desayuno')) return;
  u.menu[u.menuDia] = {}; COMIDAS.forEach(([k]) => { u.menu[u.menuDia][k] = porId('mn-' + k).value.trim(); u.horas[k] = val('mh-' + k) || u.horas[k]; });
}
function editorMenu() {
  const u = estado.ui, c = estado.config;
  if (!u.menu) { u.menu = clon(c.menu || {}); u.horas = clon(c.horasComida); u.menuDia = DIAS_K[estado.ahora.getDay()]; u.ejemplo = !!c.menuEsEjemplo; }
  const dia = u.menu[u.menuDia] || {};
  return `<div class="envoltura">${volver('ajustes', 'Volver a Ajustes')}
    <div class="dias-menu">${ORDEN_DIAS.map((k) => `<button class="opcion${k === u.menuDia ? ' sel' : ''}" data-a="diaMenu" data-v="${k}">${DIAS_C[DIAS_K.indexOf(k)]}</button>`).join('')}</div>
    <div class="grupo" data-k="menu-${u.menuDia}">
      ${COMIDAS.map(([k, n]) => `<div class="panel"><div class="titulo-fila"><label class="h3" for="mn-${k}">${n}</label><input class="texto hora-chica" id="mh-${k}" type="time" value="${esc(u.horas[k] || '')}" aria-label="Hora de ${n}"></div>
        <textarea class="texto" id="mn-${k}" rows="2" maxlength="140">${esc(dia[k] || '')}</textarea></div>`).join('')}</div>
    <button class="btn ${u.ejemplo ? 'quieto' : 'sec'}" data-a="alternarEjemplo">${ico(u.ejemplo ? 'alert' : 'ccheck')}${u.ejemplo ? 'Es un ejemplo (tocar si ya lo vio la nutricionista)' : 'Revisado con la nutricionista'}</button>
    <button class="btn pri" data-a="guardarMenu">${ico('check')}Guardar menú</button></div>`;
}
acciones.diaMenu = (d) => { leerMenu(); estado.ui.menuDia = d.v; pintar(); };
acciones.alternarEjemplo = () => { leerMenu(); estado.ui.ejemplo = !estado.ui.ejemplo; pintar(); };
acciones.guardarMenu = () => {
  leerMenu(); const u = estado.ui;
  db.guardarConfig({ menu: u.menu, horasComida: u.horas, menuEsEjemplo: u.ejemplo });
  u.menu = null; aviso('Menú guardado'); ir('ajustes');
};

// ---------- Invitar ----------
const textoInvitacion = () => `Hola. Esta es la app para cuidar al papá: "El cuaderno de Juan".\n\n1. Abre este link en Safari:\n${linkFamilia()}\n\n2. Toca el botón Compartir (el cuadrado con la flecha hacia arriba).\n3. Elige "Agregar a inicio".\n4. Ábrela desde el ícono nuevo y toca tu nombre.\n\nNo le pases este link a nadie fuera de la familia.`;
function invitar() {
  return `<div class="envoltura">${volver('ajustes', 'Volver a Ajustes')}
    <div class="panel"><p class="h3">Link de la familia</p><p class="link-fam" id="link-fam">${esc(linkFamilia())}</p>
      <p class="nota">Quien tenga este link puede ver y anotar. Mándalo solo a la familia.</p></div>
    <a class="btn pri" href="https://wa.me/?text=${encodeURIComponent(textoInvitacion())}" target="_blank" rel="noopener">${ico('share')}Mandar por WhatsApp</a>
    <button class="btn sec" data-a="copiarInvitacion">${ico('copy')}Copiar mensaje con el link</button>
    <div class="panel"><p class="h3">Cómo se instala en el iPhone</p><ol class="pasos"><li>Abrir el link en <b>Safari</b>.</li><li>Tocar el botón <b>Compartir</b> (cuadrado con flecha).</li><li>Elegir <b>Agregar a inicio</b>.</li><li>Abrir desde el ícono nuevo y tocar su nombre.</li></ol></div></div>`;
}
acciones.copiarInvitacion = async () => { aviso((await copiar(textoInvitacion())) ? 'Mensaje copiado. Pégalo en WhatsApp.' : 'No se pudo copiar. Mantén apretado el link para copiarlo.'); };

// ---------- Alarmas ----------
function alarmas() {
  const horas = {};
  estado.config.remedios.filter((r) => r.activo !== false).forEach((r) => (r.horarios || []).forEach((h) => { (horas[h] = horas[h] || []).push(r.nombre); }));
  const lista = Object.keys(horas).sort();
  return `<div class="envoltura">${volver('ajustes', 'Volver a Ajustes')}
    <p class="sub grande">La app no suena sola. Los avisos se ponen en la app <b>Reloj</b> del iPhone, una alarma por cada horario.</p>
    ${lista.length ? lista.map((h, i) => `<div class="panel"><p class="h3">Alarma ${i + 1}: ${h}</p><p class="sub">${horas[h].map(esc).join(', ')}</p>
      <ol class="pasos"><li>Abrir <b>Reloj</b> y tocar <b>Alarma</b>.</li><li>Tocar <b>+</b> y poner las <b>${h}</b>.</li><li>En <b>Repetir</b>, marcar todos los días.</li><li>En <b>Etiqueta</b>, escribir: Remedios de Juan ${h}.</li><li>Tocar <b>Guardar</b>.</li></ol></div>`).join('')
    : '<p class="vacio-txt">Primero carga los remedios con sus horarios. Después aquí sale una alarma por cada horario.</p>'}</div>`;
}

// ---------- Respaldo ----------
function respaldo() {
  const u = estado.ui, ult = leerLocal('cj_respaldo');
  return `<div class="envoltura">${volver('ajustes', 'Volver a Ajustes')}
    <p class="sub grande">El respaldo es un archivo con todo: remedios, tomas, mediciones, agenda y ajustes. Conviene hacer uno cada semana y guardarlo en el correo o en iCloud.</p>
    <p class="nota">${ult ? `Último respaldo desde este celular: ${new Date(ult).toLocaleString('es-CL')}.` : 'Todavía no se hace un respaldo desde este celular.'}</p>
    <button class="btn pri" data-a="descargarRespaldo">${ico('download')}Hacer respaldo ahora</button>
    <div class="panel"><p class="h3">Recuperar desde un respaldo</p><p class="sub">Vuelve a poner los datos del archivo. No borra lo que ya hay: lo repone o lo actualiza.</p>
      <label class="btn quieto" for="archivo-respaldo">${ico('upload')}Elegir archivo</label>
      <input type="file" id="archivo-respaldo" accept=".json,application/json" class="oculto" data-c="leerRespaldo">
      ${u.respaldo ? `<p class="sub">${esc(u.respaldoInfo)}</p><button class="btn sec" data-a="restaurarRespaldo">${ico('check')}Recuperar estos datos</button>` : ''}
      ${error()}</div></div>`;
}
acciones.descargarRespaldo = async () => {
  try {
    const datos = await db.exportarTodo();
    const nombre = `cuaderno-de-juan-${claveFecha(new Date())}.json`, texto = JSON.stringify(datos, null, 1);
    let listo = false;
    try {
      const archivo = new File([texto], nombre, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [archivo] })) listo = await compartir({ files: [archivo], title: 'Respaldo de El cuaderno de Juan' });
    } catch (e) { listo = false; }
    if (!listo) {
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([texto], { type: 'application/json' })); a.download = nombre;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }
    guardarLocal('cj_respaldo', new Date().toISOString()); aviso('Respaldo listo. Guárdalo en un lugar seguro.'); pintar();
  } catch (e) { aviso('No se pudo hacer el respaldo. Revisa la señal e inténtalo de nuevo.'); }
};
acciones.leerRespaldo = (d, el) => {
  const f = el.files && el.files[0]; if (!f) return;
  const lector = new FileReader();
  lector.onload = () => {
    const u = estado.ui;
    try {
      const datos = JSON.parse(lector.result);
      if (datos.app !== 'el-cuaderno-de-juan' || !datos.colecciones) throw new Error('otro');
      const c = datos.colecciones;
      u.respaldo = datos; u.errorAj = '';
      u.respaldoInfo = `Respaldo del ${new Date(datos.exportado).toLocaleString('es-CL')}: ${(c.mediciones || []).length} mediciones, ${(c.tomas || []).length} tomas, ${(c.citas || []).length} fechas.`;
    } catch (e) { u.respaldo = null; u.errorAj = 'Ese archivo no es un respaldo de esta app.'; }
    pintar();
  };
  lector.readAsText(f);
};
acciones.restaurarRespaldo = async () => {
  const u = estado.ui; if (!u.respaldo) return;
  try { const n = await db.importarTodo(u.respaldo); u.respaldo = null; aviso(`Listo: se recuperaron ${n} registros.`); }
  catch (e) { u.errorAj = 'No se pudo recuperar. Revisa la señal e inténtalo de nuevo.'; }
  pintar();
};

// ---------- Quién soy ----------
function quien() {
  return `<div class="envoltura">${volver('ajustes', 'Volver a Ajustes')}
    <p class="sub grande">Lo que se anote desde este celular queda firmado con este nombre.</p>
    ${PERSONAS.map((p) => `<button class="btn ${p === estado.quien ? 'pri' : 'sec'} izq" data-a="elegirQuien" data-v="${p}" data-volver="ajustes">${ico('user')}${p}</button>`).join('')}</div>`;
}

// ---------- Apariencia ----------
function apariencia() {
  const t = temaElegido();
  const op = (v, icono, nombre, detalle) => `<button class="btn ${t === v ? 'pri' : 'sec'} izq" data-a="elegirTema" data-v="${v}">${ico(icono)}<span>${nombre}<br><span class="sub-btn">${detalle}</span></span></button>`;
  return `<div class="envoltura">${volver('ajustes', 'Volver a Ajustes')}
    <p class="sub grande">Elige cómo se ve la app en este celular.</p>
    ${op('auto', 'clock', 'Automático', 'Igual que el iPhone')}${op('claro', 'sun', 'Claro', 'Fondo claro siempre')}${op('oscuro', 'moon', 'Oscuro', 'Fondo oscuro siempre')}</div>`;
}
acciones.elegirTema = (d) => { guardarLocal('cj_tema', d.v); aplicarTema(); pintar(); };

const SOLO_ADMIN = ['remedios', 'remedio', 'rangos', 'emergencia', 'menu', 'invitar', 'respaldo'];
export function render(args) {
  if (!esAdmin() && SOLO_ADMIN.indexOf(args[0]) >= 0) return menu();
  switch (args[0]) {
    case 'apariencia': return apariencia();
    case 'remedios': return listaRemedios();
    case 'remedio': return editorRemedio(args[1]);
    case 'rangos': return editorRangos();
    case 'emergencia': return editorEmergencia();
    case 'menu': return editorMenu();
    case 'invitar': return invitar();
    case 'alarmas': return alarmas();
    case 'respaldo': return respaldo();
    case 'quien': return quien();
    default: return menu();
  }
}
const TITULOS = { remedios: 'Remedios', remedio: 'Remedio', rangos: 'Rangos', emergencia: 'Datos', menu: 'Menú', invitar: 'Invitar', alarmas: 'Alarmas', respaldo: 'Respaldo', quien: 'Quién eres', apariencia: 'Apariencia' };
export const titulo = (args) => (!esAdmin() && SOLO_ADMIN.indexOf(args[0]) >= 0 ? 'Ajustes' : TITULOS[args[0]] || 'Ajustes');
