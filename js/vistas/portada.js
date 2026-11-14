// PORTADA DE JUAN (Hoy cuando el perfil activo es Juan · Papá).
// Presenta los mismos datos familiares con lectura clara, sin números sueltos ni tarjetas engañosas.
import { estado, APARATO, sena } from '../nucleo.js';
import { esc, ico, claveFecha, deClave, sumarDias, hhmm, fechaLarga, fechaCorta } from '../util.js';
import { TIPOS, ETIQUETA, TAREAS, clasificar, valorTexto, detalleMomento } from '../datos.js';
import { itemsDelDia, medicionesDeTarea, medicionesDeTurno, sinSubir } from '../plan.js';
import { tiraSemana, bloqueLineaDia, COMIO } from './hoy.js';
import { resumenCuidadosPortada } from './cuidados.js';
import { resumenCorazonPortada } from './corazon.js';

function estadoSincDiscreto() {
  const lectura = Object.keys(estado.sinc).some((k) => estado.sinc[k] && !estado.sinc[k].cache);
  if (navigator.onLine === false) return { cls: 'amb', icono: 'info', txt: `Sin internet · viendo lo guardado en este ${APARATO}` };
  if (estado.errorSinc) return { cls: 'amb', icono: 'alert', txt: 'No se pudo actualizar desde la nube' };
  if (estado.hayPend) return { cls: 'amb', icono: 'clock', txt: 'Subiendo los últimos cambios…' };
  if (!lectura) return { cls: 'neutro', icono: 'clock', txt: 'Conectando con el cuaderno…' };
  return { cls: 'ok', icono: 'ccheck', txt: `Actualizado · Cuaderno ${sena(estado.familia)}` };
}

function etiquetaAntiguedad(fechaReg, hoy, ayer) {
  if (fechaReg === hoy) return { esHoy: true, badge: '<span class="chip ok">De hoy</span>', cuando: 'Hoy' };
  if (fechaReg === ayer) return { esHoy: false, badge: '<span class="chip amb">De ayer · no es de hoy</span>', cuando: 'Ayer' };
  const fTxt = fechaCorta(deClave(fechaReg));
  return { esHoy: false, badge: `<span class="chip amb">Del ${esc(fTxt)} · dato anterior</span>`, cuando: fechaLarga(deClave(fechaReg)) };
}

function explicaEstado(tipo, c, rangos) {
  const prov = rangos && rangos.provisorio ? ' (rango general de referencia)' : ' (según rango configurado)';
  if (c === 'verde') return `Esto significa: está dentro del rango esperado${prov}.`;
  if (c === 'amarillo') return `Esto significa: está un poco fuera del rango${prov}. Conviene comentarlo en el control o medir más tarde.`;
  return `Esto significa: está fuera del rango${prov}. Si sientes molestias, avisa a la familia o toca Emergencia.`;
}

// 2. Tus últimos registros: presión/pulso y azúcar con su fecha y hora reales; oxígeno solo si es relevante o está indicado.
function bloqueUltimosRegistros(hoy, ayer) {
  const R = estado.config.rangos;
  const mPres = estado.mediciones.find((m) => m.tipo === 'presion');
  const mPulso = mPres && mPres.pulsoId
    ? estado.mediciones.find((m) => m.id === mPres.pulsoId)
    : estado.mediciones.find((m) => m.tipo === 'pulso');
  const mAzu = estado.mediciones.find((m) => m.tipo === 'azucar');
  const mOxi = estado.mediciones.find((m) => m.tipo === 'oxigeno');

  let htmlPres;
  if (mPres) {
    const c = clasificar(mPres, R), ant = etiquetaAntiguedad(mPres.fecha, hoy, ayer);
    const pulsoTxt = mPulso && mPulso.fecha === mPres.fecha ? ` · Pulso: <b>${mPulso.valor}</b> lpm` : '';
    const ctx = detalleMomento(mPres);
    htmlPres = `<div class="juan-reg-item" data-k="ult-pres">
      <div class="titulo-fila">
        <span class="rotulo-item">${ico('gauge')}Tu última presión${ctx ? ' (' + esc(ctx) + ')' : ''}</span>
        ${ant.badge}
      </div>
      <div class="juan-reg-valor">
        <span class="v-grande ${c}">${valorTexto(mPres)}</span>
        <span class="estado ${c}"><span class="luz"></span>${ETIQUETA[c]}</span>
      </div>
      <p class="sub grande">${ant.cuando} a las <b>${hhmm(new Date(mPres.ts))}</b>${pulsoTxt} · anotó ${esc(mPres.quien)}${sinSubir(mPres) ? ' · sin subir' : ''}</p>
      <p class="sub">${explicaEstado('presion', c, R)}</p>
    </div>`;
  } else {
    htmlPres = `<div class="juan-reg-item vacio" data-k="ult-pres-vacio">
      <div class="titulo-fila"><span class="rotulo-item">${ico('gauge')}Tu última presión</span><span class="chip neutro">Sin lectura</span></div>
      <p class="tit">Todavía no está anotado</p>
      <p class="sub">Cuando se tome la presión en casa, aparecerá aquí con su fecha y hora.</p>
    </div>`;
  }

  let htmlAzu;
  if (mAzu) {
    const c = clasificar(mAzu, R), ant = etiquetaAntiguedad(mAzu.fecha, hoy, ayer);
    const ctx = detalleMomento(mAzu);
    htmlAzu = `<div class="juan-reg-item" data-k="ult-azu">
      <div class="titulo-fila">
        <span class="rotulo-item">${ico('drop')}Tu última azúcar${ctx ? ' (' + esc(ctx) + ')' : ''}</span>
        ${ant.badge}
      </div>
      <div class="juan-reg-valor">
        <span class="v-grande ${c}">${valorTexto(mAzu)} <small>mg/dL</small></span>
        <span class="estado ${c}"><span class="luz"></span>${ETIQUETA[c]}</span>
      </div>
      <p class="sub grande">${ant.cuando} a las <b>${hhmm(new Date(mAzu.ts))}</b> · anotó ${esc(mAzu.quien)}${sinSubir(mAzu) ? ' · sin subir' : ''}</p>
      <p class="sub">${explicaEstado('azucar', c, R)}</p>
    </div>`;
  } else {
    htmlAzu = `<div class="juan-reg-item vacio" data-k="ult-azu-vacio">
      <div class="titulo-fila"><span class="rotulo-item">${ico('drop')}Tu última azúcar</span><span class="chip neutro">Sin lectura</span></div>
      <p class="tit">Todavía no está anotado</p>
      <p class="sub">Se anota en ayunas y 2 horas después de empezar a almorzar.</p>
    </div>`;
  }

  // Oxígeno solo si hay un registro relevante o una indicación configurada.
  const cCuid = estado.config.cuidados || {};
  const indOxi = /ox[ií]geno|saturaci[oó]n|ox[ií]metro/i.test([cCuid.puede, cCuid.evitar, cCuid.limites].join(' '));
  let htmlOxi = '';
  if (mOxi || indOxi) {
    if (mOxi) {
      const c = clasificar(mOxi, R), ant = etiquetaAntiguedad(mOxi.fecha, hoy, ayer);
      htmlOxi = `<div class="juan-reg-item" data-k="ult-oxi">
        <div class="titulo-fila"><span class="rotulo-item">${ico('o2')}Tu último oxígeno</span>${ant.badge}</div>
        <div class="juan-reg-valor"><span class="v-grande ${c}">${valorTexto(mOxi)}</span><span class="estado ${c}"><span class="luz"></span>${ETIQUETA[c]}</span></div>
        <p class="sub grande">${ant.cuando} a las <b>${hhmm(new Date(mOxi.ts))}</b> · anotó ${esc(mOxi.quien)}</p>
      </div>`;
    } else {
      htmlOxi = `<div class="juan-reg-item vacio" data-k="ult-oxi-vacio">
        <div class="titulo-fila"><span class="rotulo-item">${ico('o2')}Tu último oxígeno</span><span class="chip neutro">Sin lectura</span></div>
        <p class="tit">Todavía no está anotado</p>
      </div>`;
    }
  }

  return `<section class="panel juan-seccion" aria-label="Tus últimos registros">
    <div class="titulo-fila"><h2 class="h3">${ico('pulse')}Tus últimos registros</h2><a class="mini-btn" href="#medir">Ir a Medir${ico('right')}</a></div>
    <p class="nota">Son las lecturas anotadas en casa; no es un monitor continuo.</p>
    <div class="juan-reg-lista">${htmlPres}${htmlAzu}${htmlOxi}</div>
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
    ${recienHecho ? `<p class="firma">${ico('check')}Ya quedó anotado: <b>${esc(recienHecho.info.titulo)}</b> (${esc(recienHecho.info.hechoTxt.replace(/^Ya quedó anotado\s*/i, ''))}).</p>` : ''}
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
    <section class="panel juan-hola" aria-label="Saludo y estado del día">
      <div class="titulo-fila">
        <div>
          <p class="saludo">Tu cuaderno personal</p>
          <h2 class="h2">Hola, Juan</h2>
        </div>
        <span class="chip ${sinc.cls}">${ico(sinc.icono)}${esc(sinc.txt)}</span>
      </div>
      <p class="fecha">${fechaLarga(deClave(dia))}</p>
      <a class="acompana" href="#agenda">
        ${ico('user')}
        <span>${modo === 'hoy' ? 'Hoy te acompaña' : 'Te acompaña'}: <b>${acompana ? esc(acompana) : 'sin asignar en la agenda'}</b></span>
        ${ico('right', 'flecha')}
      </a>
      ${tiraSemana(hoy, dia)}
    </section>

    ${modo !== 'hoy' ? `<div class="panel otro-dia">
      <p class="sub">${dia === ayer ? 'Estás mirando el día de ayer.' : modo === 'pasado' ? 'Estás mirando un día anterior.' : 'Estás mirando un día futuro.'}</p>
      <button type="button" class="btn pri" data-a="verDia" data-dia="${hoy}">${ico('left')}Volver a hoy</button>
    </div>` : ''}

    ${modo === 'hoy' ? bloqueUltimosRegistros(hoy, ayer) : ''}
    ${modo === 'hoy' ? bloqueAhoraTeToca(hoy, ahoraHM, items) : ''}
    ${modo === 'hoy' ? resumenCuidadosPortada() : ''}
    ${modo === 'hoy' ? resumenCorazonPortada() : ''}
    ${bloqueLineaDia(dia, modo, ahoraHM, anotable, items, 'Mi día')}
  </div>`;
}
