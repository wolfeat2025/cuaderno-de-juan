// EMERGENCIA: llamar al 131, cómo llegar, datos para la ambulancia y contactos.
import { estado, esAdmin } from '../nucleo.js';
import { esc, ico } from '../util.js';

const lineas = (t) => String(t || '').split('\n').map((x) => x.trim()).filter(Boolean);
const remediosActivos = () => estado.config.remedios.filter((r) => r.activo !== false);
const telLimpio = (t) => String(t || '').replace(/[^\d+]/g, '');
const nombreEdad = (e) => esc(e.nombre) + (e.edad ? ', ' + esc(e.edad) : '');

export function render() {
  const c = estado.config, e = c.emergencia;
  const meds = remediosActivos();
  const contactos = c.contactos.filter((x) => x.nombre);
  return `<div class="envoltura">
    <a class="llamar131" href="tel:131">${ico('phone')}<span><span class="t1">Llamar al 131</span><span class="t2">Ambulancia SAMU</span></span></a>
    <a class="btn sec" href="#ambulancia">${ico('card')}Mostrar a la ambulancia</a>

    <div class="panel">
      <p class="rotulo">${ico('pin')}Cómo llegar</p>
      ${e.direccion ? `<p class="dato-g">${esc(e.direccion)}</p>` : `<p class="falta-dato">Falta la dirección. ${esAdmin() ? '<a href="#ajustes/emergencia">Agregarla</a>' : 'La agrega Fabián.'}</p>`}
      ${e.referencias ? `<p class="dato">${esc(e.referencias)}</p>` : ''}
    </div>

    <div class="panel">
      <p class="rotulo">${ico('user')}Datos de ${esc(e.nombre)}</p>
      <ul class="hechos">
        <li>${ico('info')}<span><b>${nombreEdad(e)}</b></span></li>
        ${lineas(e.condiciones).length ? '' : `<li>${ico('heart')}<span>Antecedentes: sin anotar. ${esAdmin() ? '<a class="enlace" href="#ajustes/emergencia">Agregarlos</a>' : 'Los agrega Fabián.'}</span></li>`}
        ${lineas(e.condiciones).map((l) => `<li>${ico('heart')}<span>${esc(l)}</span></li>`).join('')}
        <li>${ico('pill')}<span><b>Remedios:</b> ${meds.length ? meds.map((r) => esc(r.nombre + (r.dosis ? ' ' + r.dosis : ''))).join(', ') : 'sin anotar'}</span></li>
        <li>${ico('alert')}<span><b>Alergias:</b> ${e.alergias ? esc(e.alergias) : 'sin anotar'}</span></li>
        <li>${ico('pin')}<span><b>Se atiende en:</b> ${e.hospital ? esc(e.hospital) : 'sin anotar'}</span></li>
      </ul>
    </div>

    <div class="panel sin-relleno">
      <p class="rotulo con-relleno">${ico('family')}Familia</p>
      ${contactos.map((x) => `<div class="contacto"><p class="n">${esc(x.nombre)}</p>${telLimpio(x.telefono)
        ? `<a class="btn sec auto" href="tel:${telLimpio(x.telefono)}">${ico('phone')}Llamar</a>`
        : (esAdmin() ? `<a class="mini-btn" href="#ajustes/emergencia">Falta el teléfono</a>` : `<span class="mini-btn">Falta el teléfono</span>`)}</div>`).join('')}
    </div>

    <div class="panel">
      <p class="rotulo rojo">${ico('alert')}Llamen al 131 si tiene</p>
      <ul class="hechos senales">
        <li>${ico('alert')}<span>Dolor o apretón en el pecho que no se pasa en unos minutos</span></li>
        <li>${ico('alert')}<span>Mucha falta de aire</span></li>
        <li>${ico('alert')}<span>Se desmaya</span></li>
        <li>${ico('alert')}<span>Latidos muy rápidos o desordenados</span></li>
        <li>${ico('alert')}<span>Sudor frío y decaimiento</span></li>
      </ul>
    </div>
    <p class="nota centro">Esta guía es general. Valen primero las indicaciones de su médico.</p>
  </div>`;
}

export function renderAmbulancia() {
  const e = estado.config.emergencia, meds = remediosActivos();
  const fila = (k, v) => `<p class="renglon"><span class="k">${k}</span>${v}</p>`;
  return `<div class="ambulancia">
    <a class="btn quieto" href="#emergencia">${ico('x')}Cerrar</a>
    <h1>${nombreEdad(e)}</h1>
    ${lineas(e.condiciones).length ? fila('Antecedentes', lineas(e.condiciones).map(esc).join('<br>')) : ''}
    ${fila('Remedios', meds.length ? meds.map((r) => esc(r.nombre + (r.dosis ? ' ' + r.dosis : ''))).join(', ') : 'Sin anotar')}
    ${fila('Alergias', e.alergias ? esc(e.alergias) : 'Sin anotar')}
    ${fila('Se atiende en', e.hospital ? esc(e.hospital) : 'Sin anotar')}
    ${e.direccion ? fila('Dirección', esc(e.direccion)) : ''}
  </div>`;
}
