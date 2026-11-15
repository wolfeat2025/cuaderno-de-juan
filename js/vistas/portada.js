// PORTADA DE JUAN (Hoy cuando el perfil activo es Juan · Papá).
// Presenta los mismos datos familiares con lectura clara, sin números sueltos ni tarjetas engañosas.
import { estado, APARATO, sena } from '../nucleo.js';
import { esc, ico, claveFecha, deClave, sumarDias, hhmm, fechaLarga, fechaCorta } from '../util.js';
import { TIPOS, ETIQUETA, TAREAS, clasificar, valorTexto, detalleMomento } from '../datos.js';
import { itemsDelDia, medicionesDeTarea, medicionesDeTurno, sinSubir } from '../plan.js';
import { tiraSemana, bloqueLineaDia, COMIO } from './hoy.js';
import { resumenCuidadosPortada } from './cuidados.js';
import { tarjetaRecuperacion } from './recuperacion.js';
import { resumenCorazonPortada } from './corazon.js';

function estadoSincDiscreto() {
  const lectura = Object.keys(estado.sinc).some((k) => estado.sinc[k] && !estado.sinc[k].cache);
  if (navigator.onLine === false) return { cls: 'amb', icono: 'info', txt: `Sin internet · viendo lo guardado en este ${APARATO}` };
  if (estado.errorSinc) return { cls: 'amb', icono: 'alert', txt: 'No se pudo actualizar desde la nube' };
  if (estado.hayPend) return { cls: 'amb', icono: 'clock', txt: 'Subiendo los últimos cambios…' };
  if (!lectura) return { cls: 'neutro', icono: 'clock', txt: 'Conectando con el cuaderno…' };
  return { cls: 'ok', icono: 'ccheck', txt: `Actualizado · Cuaderno ${sena(estado.familia)}` };
}

// Cada valor conserva su fecha/hora real. El aro resume registros: no mide el corazón.
function bloqueUltimosRegistros(hoy, ayer) {
  const R = estado.config.rangos;
  const tipos = ['presion', 'pulso', 'azucar'];
  const cuidados = estado.config.cuidados || {};
  if (estado.mediciones.some((m) => m.tipo === 'oxigeno') || /ox[ií]geno|saturaci[oó]n/i.test([cuidados.puede, cuidados.evitar, cuidados.limites].join(' '))) tipos.push('oxigeno');
  if (estado.mediciones.some((m) => m.tipo === 'peso')) tipos.push('peso');
  const lecturas = tipos.map((t) => ({ tipo: t, m: estado.mediciones.find((m) => m.tipo === t) }));
  const existentes = lecturas.filter((x) => x.m);
  const colores = existentes.map((x) => clasificar(x.m, R));
  const viejos = existentes.some((x) => x.m.fecha !== hoy);
  const faltan = existentes.length < lecturas.length;
  const color = colores.includes('rojo') ? 'rojo' : colores.includes('amarillo') ? 'amarillo' : viejos || faltan ? 'neutro' : 'verde';
  const titulo = color === 'rojo' || color === 'amarillo' ? 'Hay registros para revisar' : viejos ? 'Hay lecturas de días anteriores' : faltan ? 'Faltan lecturas por anotar' : 'Últimas lecturas en rango';
  const icono = color === 'verde' ? 'check' : color === 'neutro' ? 'clock' : 'alert';
  return `<section class="panel juan-seccion juan-vitales" aria-label="Tus últimos registros">
    <div class="juan-estado-visual ${color}">
      <div class="juan-aro" aria-hidden="true"><svg viewBox="0 0 80 80"><circle class="ja-fondo" cx="40" cy="40" r="33"/><circle class="ja-orbita" cx="40" cy="40" r="33"/></svg>${ico(icono)}</div>
      <div><p class="nota">Tus últimos registros</p><h2 class="h3">${titulo}</h2></div>
    </div>
    <div class="juan-reg-grid">${lecturas.map(({tipo, m}) => {
      const c = m ? clasificar(m, R) : 'neutro';
      const fecha = !m ? 'Todavía sin registro' : (m.fecha === hoy ? 'Hoy' : m.fecha === ayer ? 'Ayer' : fechaCorta(deClave(m.fecha))) + ' · ' + hhmm(new Date(m.ts));
      const contexto = tipo === 'azucar' && m ? ({ayunas:'En ayunas',despues:'Después de comer',antes:'Antes de comer'}[m.momento] || 'Contexto en Medir') : '';
      return `<a class="juan-lectura" href="#medir/${tipo}" data-k="juan-ultima-${tipo}">
        <span class="rotulo-item">${ico(TIPOS[tipo].icono)}${TIPOS[tipo].nombre}</span>
        <span class="v-grande ${c}">${m ? valorTexto(m) : '—'}${m && tipo === 'azucar' ? '<small> mg/dL</small>' : m && tipo === 'pulso' ? '<small> lpm</small>' : m && tipo === 'oxigeno' ? '<small> %</small>' : ''}</span>
        <span class="estado ${c}">${m ? ETIQUETA[c] : 'Sin datos'}</span>
        ${contexto ? `<span class="nota">${contexto}</span>` : ''}<span class="nota">${esc(fecha)}${sinSubir(m) ? ' · sin subir' : ''}</span>
      </a>`;
    }).join('')}</div>
    <details class="comida-menu"><summary>Cómo leer mis registros</summary><p class="sub">${R.provisorio ? 'Se comparan con rangos generales de referencia.' : 'Se comparan con los rangos configurados.'} Son lecturas anotadas, no un monitor en vivo ni una evaluación completa del corazón. Toca un valor para ver el contexto y quién lo anotó.</p></details>
  </section>`;
}

function infoItemPlan(it, hoy) {
  if (it.tipo === 'med') {
    const t = estado.tomas[it.id], r = it.r;
    const sub = [r.dosis, r.paraQue].filter(Boolean).join(' · ') || 'Remedio del plan';
    return {
      hecho: !!t,
      hora: it.hora,
      icono: 'pill',
      clsIc: '',
      titulo: r.nombre,
      sub,
      hechoTxt: t ? `Ya quedó anotado a las ${hhmm(new Date(t.ts))} por ${t.quien}` : '',
      accion: `<button type="button" class="btn pri" data-a="tomar" data-id="${it.id}" data-rid="${esc(r.id)}" data-hora="${it.hora}" data-fecha="${hoy}">${ico('check')}Anote que ya lo tomé</button>`,
      avisoSinc: navigator.onLine === false || estado.errorSinc || estado.hayPend
        ? 'Si alguien ya te lo dio en otro teléfono, revisa primero antes de tomar otra dosis.'
        : '',
    };
  }
  if (it.tipo === 'tarea') {
    const T = TAREAS[it.tid], ms = medicionesDeTarea(hoy, it.tid), ult = ms[ms.length - 1];
    return {
      hecho: !!ult,
      hora: it.hora,
      icono: TIPOS[T.tipo].icono,
      clsIc: 'medir',
      titulo: T.nombre,
      sub: T.tipo === 'azucar' && T.momento === 'despues' ? 'Se mide 2 horas después de empezar a almorzar' : 'Medición de la rutina diaria',
      hechoTxt: ult ? `Ya quedó anotado (${valorTexto(ult)}) a las ${hhmm(new Date(ult.ts))} por ${ult.quien}` : '',
      accion: `<a class="btn pri" href="#medir/${T.tipo}/t/${it.tid}">${ico('plus')}Ir a anotar ${TIPOS[T.tipo].nombre.toLowerCase()}</a>`,
    };
  }
  if (it.tipo === 'medir') {
    const ms = medicionesDeTurno(hoy, it.i);
    return {
      hecho: ms.length > 0,
      hora: it.hora,
      icono: 'pulse',
      clsIc: 'medir',
      titulo: 'Medición programada',
      sub: 'Presión, pulso o azúcar',
      hechoTxt: ms.length ? `Ya quedó anotado a las ${hhmm(new Date(ms[ms.length - 1].ts))}` : '',
      accion: `<a class="btn pri" href="#medir">${ico('plus')}Ir a Medir</a>`,
    };
  }
  const reg = estado.tomas[it.id];
  return {
    hecho: !!reg,
    hora: it.hora,
    icono: it.icono || 'food',
    clsIc: 'comida',
    opcional: !!it.opcional,
    titulo: it.nombre,
    sub: it.texto,
    hechoTxt: reg ? `Ya quedó anotado (${COMIO[reg.comio] || 'Anotado'}) a las ${hhmm(new Date(reg.ts))} por ${reg.quien}` : '',
    accion: `<a class="btn sec" href="#comidas">${ico('food')}Ver en Comidas</a>`,
  };
}

// 3. Ahora te toca: una acción prioritaria y concreta a partir del plan real, y un acceso a lo siguiente.
function bloqueAhoraTeToca(hoy, ahoraHM, items) {
  const todos = items.map((it) => ({ it, info: infoItemPlan(it, hoy) }));
  const obligatorios = todos.filter((x) => !x.info.opcional);
  const pendientes = obligatorios.filter((x) => !x.info.hecho);
  const hechosRecientes = obligatorios.filter((x) => x.info.hecho);

  if (!obligatorios.length) {
    return `<section class="panel juan-seccion" aria-label="Ahora te toca">
      <h2 class="h3">${ico('clock')}Ahora te toca</h2>
      <p class="tit">Todavía no hay tareas programadas para hoy</p>
      <p class="sub">Cuando Fabián cargue los horarios de los remedios, aquí verás qué toca en cada momento.</p>
    </section>`;
  }

  if (!pendientes.length) {
    const ult = hechosRecientes[hechosRecientes.length - 1];
    return `<section class="panel juan-seccion ok" aria-label="Ahora te toca">
      <div class="cabeza"><span class="ic hecho">${ico('check')}</span><div>
        <h2 class="h3">Ya quedó anotado todo lo previsto por hoy</h2>
        ${ult ? `<p class="sub">${esc(ult.info.titulo)}: ${esc(ult.info.hechoTxt)}.</p>` : ''}
      </div></div>
    </section>`;
  }

  // Priorizar lo que ya está en hora (<= ahoraHM) o el próximo inmediato del día.
  const enHora = pendientes.filter((x) => x.info.hora <= ahoraHM);
  const actual = enHora.length ? enHora[0] : pendientes[0];
  const idxActual = pendientes.indexOf(actual);
  const siguiente = pendientes[idxActual + 1] || null;
  const yaEnHora = actual.info.hora <= ahoraHM;

  // Si justo antes hubo algo que ya quedó anotado, mostrarlo discretamente para dar tranquilidad.
  const recienHecho = hechosRecientes.length ? hechosRecientes[hechosRecientes.length - 1] : null;

  return `<section class="panel juan-seccion ${yaEnHora ? 'toca-panel' : ''}" aria-label="Ahora te toca">
    <div class="titulo-fila">
      <h2 class="h3">${ico('clock')}Ahora te toca</h2>
      <span class="chip ${yaEnHora ? 'amb' : 'neutro'}">${yaEnHora ? `Desde las ${actual.info.hora}` : `Próximo · ${actual.info.hora}`}</span>
    </div>
    <div class="juan-toca-principal">
      <div class="cabeza">
        <span class="ic ${actual.info.clsIc}">${ico(actual.info.icono)}</span>
        <div class="txt">
          <p class="tit">${esc(actual.info.titulo)}</p>
          <p class="sub grande">${esc(actual.info.sub)}</p>
        </div>
      </div>
      ${actual.info.avisoSinc ? `<p class="nota aviso-info">${ico('info')}<span>${esc(actual.info.avisoSinc)}</span></p>` : ''}
      ${actual.info.accion}
    </div>
    ${siguiente ? `<div class="juan-siguiente">
      <p class="sub"><b>Después sigue:</b> ${siguiente.info.hora} · ${esc(siguiente.info.titulo)}</p>
    </div>` : '<p class="sub">Es la última tarea programada por hoy.</p>'}
  </section>`;
}

export function render() {
  const hoy = claveFecha(estado.ahora);
  const primero = claveFecha(sumarDias(estado.ahora, -3)), ultimo = claveFecha(sumarDias(estado.ahora, 3)), ayer = claveFecha(sumarDias(estado.ahora, -1));
  let dia = estado.ui.dia || hoy;
  if (dia < primero || dia > ultimo) dia = hoy;
  const anotable = dia === hoy || dia === ayer;
  const modo = dia === hoy ? 'hoy' : dia < hoy ? 'pasado' : 'futuro';
  const ahoraHM = hhmm(estado.ahora);
  const items = itemsDelDia(dia);
  const acompana = estado.turnos[dia];
  const sinc = estadoSincDiscreto();

  return `<div class="envoltura juan-portada">
    <div class="juan-cabecera" aria-label="Fecha y sincronización">
      <p class="fecha">${fechaLarga(deClave(dia))}</p>
      <span class="chip ${sinc.cls}">${ico(sinc.icono)}${esc(sinc.cls === 'ok' ? 'Actualizado' : sinc.txt)}</span>
      <details class="comida-menu"><summary>Ver otro día</summary>${tiraSemana(hoy, dia)}<p class="nota">Cuaderno ${sena(estado.familia)}</p></details>
    </div>

    ${modo !== 'hoy' ? `<div class="panel otro-dia">
      <p class="sub">${dia === ayer ? 'Estás mirando el día de ayer.' : modo === 'pasado' ? 'Estás mirando un día anterior.' : 'Estás mirando un día futuro.'}</p>
      <button type="button" class="btn pri" data-a="verDia" data-dia="${hoy}">${ico('left')}Volver a hoy</button>
    </div>` : ''}

    ${modo === 'hoy' ? tarjetaRecuperacion() : ''}
    ${modo === 'hoy' ? bloqueUltimosRegistros(hoy, ayer) : ''}
    ${modo === 'hoy' ? bloqueAhoraTeToca(hoy, ahoraHM, items) : ''}
    ${modo === 'hoy' ? resumenCorazonPortada() : ''}
    ${modo === 'hoy' ? resumenCuidadosPortada() : ''}
    ${bloqueLineaDia(dia, modo, ahoraHM, anotable, items, 'Mi día')}
    <a class="acompana" href="#agenda">${ico('user')}<span>Te acompaña: <b>${acompana ? esc(acompana) : 'sin asignar'}</b></span>${ico('right', 'flecha')}</a>
  </div>`;
}
