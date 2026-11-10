// Valores iniciales y reglas de la app. Nada de esto es consejo médico:
// los rangos son provisorios y se reemplazan por los del médico en Ajustes.

export const PERSONAS = ['Mamá', 'Fernando', 'Fabián'];

export const TIPOS = {
  presion: { nombre: 'Presión', icono: 'gauge', unidad: '', campos: [['Arriba', 50, 260], ['Abajo', 30, 160]] },
  pulso: { nombre: 'Pulso', icono: 'heart', unidad: 'por minuto', campos: [['Latidos por minuto', 20, 250]] },
  azucar: { nombre: 'Azúcar', icono: 'drop', unidad: 'mg/dL', campos: [['Número del aparato', 20, 600]] },
  oxigeno: { nombre: 'Oxígeno', icono: 'o2', unidad: '%', campos: [['Porcentaje', 50, 100]] },
};
export const ORDEN_TIPOS = ['presion', 'pulso', 'azucar', 'oxigeno'];

export const COMIDAS = [
  ['desayuno', 'Desayuno', 'cup'],
  ['almuerzo', 'Almuerzo', 'soup'],
  ['once', 'Once', 'apple'],
  ['cena', 'Cena', 'fish'],
];

export const ETIQUETA = { verde: 'Normal', amarillo: 'Revisar', rojo: 'Fuera de lo normal' };

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
    medirHoras: ['08:30', '19:30'],
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
      { nombre: 'Fabián', telefono: '' }, { nombre: '', telefono: '' },
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
  out.emergencia = Object.assign({}, b.emergencia, (c && c.emergencia) || {});
  if (!Array.isArray(out.remedios)) out.remedios = [];
  if (!Array.isArray(out.contactos)) out.contactos = b.contactos;
  if (!Array.isArray(out.medirHoras)) out.medirHoras = b.medirHoras;
  return out;
}

const num = (x) => (x === null || x === undefined || x === '' || isNaN(Number(x)) ? null : Number(x));

// Devuelve 'verde' | 'amarillo' | 'rojo' según los rangos configurados.
export function clasificar(m, rangos) {
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
  const c = clasificar(m, rangos);
  if (azucarBaja(m, rangos)) return ['Azúcar baja', 'Denle medio vaso de jugo. Vuelvan a medir en 15 minutos y avisen.'];
  if (c === 'rojo') return ['Fuera de lo normal', 'Vuelvan a medir en 5 minutos. Si sigue igual, avisen al médico.'];
  if (c === 'amarillo') return ['Para revisar', 'Está un poco fuera del rango. Vuelvan a medir más tarde y coméntenlo en el próximo control.'];
  return ['Normal', 'Está dentro del rango.'];
}

export function valorTexto(m) {
  if (m.tipo === 'presion') return `${m.valor}/${m.valor2}`;
  if (m.tipo === 'oxigeno') return `${m.valor}%`;
  return String(m.valor);
}

export const detalleMomento = (m) => (m.tipo === 'azucar' ? (m.momento === 'despues' ? 'después de comer' : 'en ayunas') : '');
