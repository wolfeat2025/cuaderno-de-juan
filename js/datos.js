// Valores iniciales y reglas de la app. Nada de esto es consejo médico:
// los rangos son provisorios y se reemplazan por los del médico en Ajustes.

// Perfiles del selector. Elegir un nombre personaliza la pantalla y firma lo anotado; no es una contraseña.
export const PERSONAS = ['Mamá', 'Fernando', 'Fabián', 'Coni', 'Juan'];
// Quienes acompañan y rotan en los turnos. Juan es el paciente: no se asigna como su propio acompañante.
export const ACOMPANANTES = ['Mamá', 'Fernando', 'Fabián', 'Coni'];
export const PACIENTE = 'Juan';
const NOMBRE_PERFIL = { Juan: 'Juan · Papá' };
export const nombrePerfil = (p) => NOMBRE_PERFIL[p] || p;

export const TIPOS = {
  presion: { nombre: 'Presión', icono: 'gauge', unidad: '', campos: [['Arriba', 50, 260], ['Abajo', 30, 160]] },
  pulso: { nombre: 'Pulso', icono: 'heart', unidad: 'por minuto', campos: [['Latidos por minuto', 20, 250]] },
  azucar: { nombre: 'Azúcar', icono: 'drop', unidad: 'mg/dL', campos: [['Número del aparato', 20, 600]] },
  oxigeno: { nombre: 'Oxígeno', icono: 'o2', unidad: '%', campos: [['Porcentaje', 50, 100]] },
  // Peso: sin colores ni rangos (nadie los ha indicado). Se mira la tendencia de la semana.
  peso: { nombre: 'Peso', icono: 'balanza', unidad: 'kg', decimal: true, campos: [['Kilos', 30, 200]] },
};
export const ORDEN_TIPOS = ['presion', 'pulso', 'azucar', 'oxigeno', 'peso'];

// Rutina de mediciones de la familia. Las horas se cambian en Ajustes; aquí solo va qué se mide y en qué contexto.
// Cada medición cumple a lo más una tarea (ver tareaDe), así una misma lectura nunca completa dos.
export const TAREAS = {
  'glu-ayunas': { tipo: 'azucar', momento: 'ayunas', nombre: 'Azúcar en ayunas' },
  'peso-manana': { tipo: 'peso', nombre: 'Peso en la mañana' },
  'pre-manana': { tipo: 'presion', nombre: 'Presión de la mañana' },
  'glu-almuerzo': { tipo: 'azucar', momento: 'despues', nombre: 'Azúcar después de almorzar' },
  'pre-noche': { tipo: 'presion', nombre: 'Presión de la noche' },
  // No es fija: la crea el botón "Medir otra vez" de "¿Por qué marcó esto?" (registro clase 'repetir').
  'glu-otra': { tipo: 'azucar', momento: 'despues', nombre: 'Azúcar otra vez' },
};
const HORA_OK = /^\d\d:\d\d$/;
const dos = (n) => String(n).padStart(2, '0');
// Lista de tareas con hora para un día. El azúcar de la tarde va 2 horas después de la hora del almuerzo.
export function rutinaDe(c) {
  const h = c.rutinaHoras || {}, alm = (c.horasComida || {}).almuerzo || '';
  let tarde = '';
  if (HORA_OK.test(alm)) { const m = Math.min(23 * 60 + 59, Number(alm.slice(0, 2)) * 60 + Number(alm.slice(3, 5)) + 120); tarde = dos(Math.floor(m / 60)) + ':' + dos(m % 60); }
  return [['glu-ayunas', h.ayunas], ['peso-manana', h.peso || h.ayunas], ['pre-manana', h.manana], ['glu-almuerzo', tarde], ['pre-noche', h.noche]]
    .filter((x) => HORA_OK.test(x[1] || '')).map((x) => ({ id: x[0], hora: x[1] }));
}
// A qué tarea corresponde una medición. Las nuevas lo traen anotado; las antiguas se deducen del contexto.
export function tareaDe(m) {
  if (typeof m.tarea === 'string') return m.tarea;
  if (m.tipo === 'azucar') return m.momento === 'despues' ? 'glu-almuerzo' : m.momento === 'antes' ? '' : 'glu-ayunas';
  if (m.tipo === 'presion') return new Date(m.ts).getHours() < 15 ? 'pre-manana' : 'pre-noche';
  if (m.tipo === 'peso') return new Date(m.ts).getHours() < 12 ? 'peso-manana' : '';
  return '';
}
export const duracion = (min) => (min >= 60 ? `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ''}` : `${min} min`);

export const COMIDAS = [
  ['desayuno', 'Desayuno', 'cup'],
  ['almuerzo', 'Almuerzo', 'soup'],
  ['once', 'Once', 'apple'],
  ['cena', 'Cena', 'fish'],
];

// Opcionales: los horarios sugeridos organizan el día, no son una pauta nutricional.
export const COLACIONES = [['colacion-manana', 'Colación de la mañana'], ['colacion-tarde', 'Colación de la tarde']];
export function colacionesDe(c) {
  const ajustes = c.colaciones || {}, h = c.horasComida || {};
  if (ajustes.mostrar === false) return [];
  const mitad = (a, b) => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(a || '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(b || '')) return '';
    const min = (x) => Number(x.slice(0, 2)) * 60 + Number(x.slice(3));
    if (min(b) <= min(a)) return '';
    const n = Math.floor((min(a) + min(b)) / 2);
    return dos(Math.floor(n / 60)) + ':' + dos(n % 60);
  };
  return COLACIONES.map(([k, nombre], i) => ({ k, nombre, opcional: true,
    hora: ajustes[k + 'Hora'] || mitad(i ? h.almuerzo : h.desayuno, i ? h.once : h.almuerzo),
    texto: ajustes[k + 'Texto'] || 'Idea opcional: fruta entera o yogur natural sin azúcar añadida. Seguir la pauta de la nutricionista.',
    porciones: ajustes[k + 'Porcion'] || '' })).filter((x) => x.hora);
}

export const ETIQUETA = { verde: 'Normal', amarillo: 'Revisar', rojo: 'Fuera de lo normal', neutro: 'Anotado' };
// Solo ámbar y rojo cuentan como aviso (el peso es "neutro").
export const esAviso = (c) => c === 'amarillo' || c === 'rojo';

// Guía general (no editable). Siempre valen primero las indicaciones del médico y la nutricionista.
export const GUIA = {
  si: ['Verduras', 'Pescado', 'Pollo sin piel', 'Legumbres', 'Agua'],
  medida: ['Pan integral', 'Papas', 'Arroz', 'Fruta', 'Palta'],
  evitar: ['Sal', 'Azúcar', 'Bebidas', 'Cecinas', 'Frituras'],
};

const MENU_EJEMPLO = {
  lun: { desayuno: 'Té sin azúcar y pan integral con palta', almuerzo: 'Cazuela de pollo sin sal, con zapallo y verduras', once: 'Té sin azúcar, pan integral y quesillo', cena: 'Ensalada de lechuga y tomate con huevo duro' },
  mar: { desayuno: 'Avena con leche descremada, sin azúcar', almuerzo: 'Porotos con zapallo, sin longaniza y sin sal', once: 'Té sin azúcar y pan integral con tomate', cena: 'Pescado al horno con ensalada' },
  mie: { desayuno: 'Té sin azúcar y pan integral con quesillo', almuerzo: 'Pescado al vapor con arroz y ensalada chilena sin sal', once: 'Té sin azúcar y una fruta', cena: 'Sopa de verduras sin sal' },
  jue: { desayuno: 'Leche descremada y pan integral con palta', almuerzo: 'Lentejas con verduras, sin sal', once: 'Té sin azúcar, pan integral y huevo', cena: 'Pollo a la plancha con ensalada' },
  vie: { desayuno: 'Té sin azúcar y pan integral con tomate', almuerzo: 'Charquicán de verduras con pollo, sin sal', once: 'Té sin azúcar y yogur sin azúcar', cena: 'Tortilla de acelga al horno con ensalada' },
  sab: { desayuno: 'Avena con leche descremada y fruta picada', almuerzo: 'Pollo al horno con papas cocidas y ensalada', once: 'Té sin azúcar y pan integral con palta', cena: 'Crema de zapallo sin sal' },
  dom: { desayuno: 'Té sin azúcar y pan integral con huevo revuelto sin sal', almuerzo: 'Cazuela de vacuno magro sin sal, con verduras', once: 'Té sin azúcar y pan integral con quesillo', cena: 'Ensalada de porotos verdes con atún al agua' },
};

export function configInicial() {
  return {
    version: 1,
    remedios: [],
    rangos: {
      provisorio: true,
      presion: { sisMax: 130, diaMax: 80, sisRojoAlto: null, diaRojoAlto: null, sisRojoBajo: null },
      pulso: { min: 60, max: 100, rojoBajo: null, rojoAlto: null },
      azucar: { ayMin: 80, ayMax: 130, despMax: 180, rojoBajo: 70, rojoAlto: null },
      oxigeno: { min: 95, rojoBajo: 92 },
    },
    medirHoras: ['08:30', '19:30'],   // formato anterior: se conserva para leer los días ya guardados
    rutinaHoras: { ayunas: '07:00', peso: '07:00', manana: '11:00', noche: '20:00' },
    horasComida: { desayuno: '09:00', almuerzo: '13:30', once: '17:30', cena: '20:30' },
    menu: MENU_EJEMPLO,
    menuEsEjemplo: true,
    emergencia: {
      // Los datos de salud no van en el código (el repositorio es público): se cargan en Ajustes.
      nombre: 'Juan', edad: '', condiciones: '',
      alergias: '', hospital: '', direccion: '', referencias: '',
    },
    contactos: [
      { nombre: 'Mamá', telefono: '' }, { nombre: 'Fernando', telefono: '' },
      { nombre: 'Fabián', telefono: '' }, { nombre: 'Coni', telefono: '' },
      { nombre: '', telefono: '' },
    ],
  };
}

// Completa una config guardada con los campos que le falten (por si la app se actualiza).
export function completarConfig(c) {
  const b = configInicial();
  const out = Object.assign({}, b, c || {});
  out.rangos = Object.assign({}, b.rangos, (c && c.rangos) || {});
  ['presion', 'pulso', 'azucar', 'oxigeno'].forEach((k) => { out.rangos[k] = Object.assign({}, b.rangos[k], out.rangos[k] || {}); });
  out.horasComida = Object.assign({}, b.horasComida, (c && c.horasComida) || {});
  out.rutinaHoras = Object.assign({}, b.rutinaHoras, (c && c.rutinaHoras) || {});
  out.emergencia = Object.assign({}, b.emergencia, (c && c.emergencia) || {});
  if (!Array.isArray(out.remedios)) out.remedios = [];
  if (!Array.isArray(out.contactos)) out.contactos = b.contactos;
  else {
    out.contactos = out.contactos.map((x) => ({ nombre: (x && x.nombre) || '', telefono: (x && x.telefono) || '' }));
    if (!out.contactos.some((x) => x.nombre.trim().toLowerCase() === 'coni')) {
      const idxVacio = out.contactos.findIndex((x) => !x.nombre && !x.telefono);
      if (idxVacio >= 0) out.contactos[idxVacio] = { nombre: 'Coni', telefono: '' };
      else out.contactos.push({ nombre: 'Coni', telefono: '' });
    }
  }
  if (!Array.isArray(out.medirHoras)) out.medirHoras = b.medirHoras;
  return out;
}

const num = (x) => (x === null || x === undefined || x === '' || isNaN(Number(x)) ? null : Number(x));

// Devuelve 'verde' | 'amarillo' | 'rojo' según los rangos configurados.
// En azúcar, "en ayunas" y "antes de comer" usan el rango de ayunas; "después de comer" usa su propio límite.
export function clasificar(m, rangos) {
  if (m.tipo === 'peso') return 'neutro';
  const r = (rangos && rangos[m.tipo]) || {};
  const v = Number(m.valor), v2 = Number(m.valor2);
  if (m.tipo === 'presion') {
    if ((num(r.sisRojoAlto) !== null && v >= num(r.sisRojoAlto)) || (num(r.diaRojoAlto) !== null && v2 >= num(r.diaRojoAlto)) || (num(r.sisRojoBajo) !== null && v <= num(r.sisRojoBajo))) return 'rojo';
    return v < num(r.sisMax) && v2 < num(r.diaMax) ? 'verde' : 'amarillo';
  }
  if (m.tipo === 'pulso') {
    if ((num(r.rojoBajo) !== null && v <= num(r.rojoBajo)) || (num(r.rojoAlto) !== null && v >= num(r.rojoAlto))) return 'rojo';
    return v >= num(r.min) && v <= num(r.max) ? 'verde' : 'amarillo';
  }
  if (m.tipo === 'azucar') {
    if ((num(r.rojoBajo) !== null && v < num(r.rojoBajo)) || (num(r.rojoAlto) !== null && v >= num(r.rojoAlto))) return 'rojo';
    if (m.momento === 'despues') return v < num(r.despMax) ? 'verde' : 'amarillo';
    return v >= num(r.ayMin) && v <= num(r.ayMax) ? 'verde' : 'amarillo';
  }
  if (m.tipo === 'oxigeno') {
    if (num(r.rojoBajo) !== null && v < num(r.rojoBajo)) return 'rojo';
    return v >= num(r.min) ? 'verde' : 'amarillo';
  }
  return 'amarillo';
}

export const azucarBaja = (m, rangos) => m.tipo === 'azucar' && num(rangos.azucar.rojoBajo) !== null && Number(m.valor) < num(rangos.azucar.rojoBajo);

export function mensaje(m, rangos) {
  if (m.tipo === 'peso') return ['Anotado', 'De un día a otro el peso cambia sobre todo por agua. Lo que importa es cómo va la semana.'];
  const c = clasificar(m, rangos);
  if (azucarBaja(m, rangos)) return ['Azúcar baja', 'Denle medio vaso de jugo. Vuelvan a medir en 15 minutos y avisen.'];
  if (c === 'rojo') return ['Fuera de lo normal', 'Vuelvan a medir en 5 minutos. Si sigue igual, avisen al médico.'];
  if (c === 'amarillo') return ['Para revisar', 'Está un poco fuera del rango. Vuelvan a medir más tarde y coméntenlo en el próximo control.'];
  return ['Normal', 'Está dentro del rango.'];
}

export function valorTexto(m) {
  if (m.tipo === 'presion') return `${m.valor}/${m.valor2}`;
  if (m.tipo === 'oxigeno') return `${m.valor}%`;
  if (m.tipo === 'peso') return `${String(m.valor).replace('.', ',')} kg`;
  return String(m.valor);
}

// Contexto de la medición en palabras (va en el historial, el resumen y los reportes).
export function detalleMomento(m) {
  if (m.tipo === 'presion') return m.tarea === 'pre-manana' ? 'mañana' : m.tarea === 'pre-noche' ? 'noche' : '';
  if (m.tipo !== 'azucar') return '';
  if (m.momento === 'antes') return 'antes de comer';
  if (m.momento !== 'despues') return 'en ayunas';
  const almuerzo = m.tarea === 'glu-almuerzo';
  if (typeof m.minComida === 'number') return `${duracion(m.minComida)} después de empezar a ${almuerzo ? 'almorzar' : 'comer'}`;
  return almuerzo ? 'después de almorzar' : 'después de comer';
}
