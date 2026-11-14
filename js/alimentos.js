// Catálogo local educativo, revisado el 14-11-2026. Sin API, perfil clínico ni datos familiares.
// Las fuentes respaldan los grupos y criterios generales; no son fichas de nutrientes de recetas chilenas.
export const FUENTES_ALIMENTOS = [
  { nombre: 'CDC · Planificar las comidas', url: 'https://www.cdc.gov/diabetes/healthy-eating/diabetes-meal-planning.html' },
  { nombre: 'CDC · Carbohidratos', url: 'https://www.cdc.gov/diabetes/healthy-eating/carb-counting-manage-blood-sugar.html' },
  { nombre: 'AHA · Alimentación y corazón', url: 'https://www.heart.org/en/healthy-living/healthy-eating/healthy-food-facts' },
];

// Primero se buscan las expresiones más largas: porotos verdes no equivale a porotos secos.
// Una receta se reconoce como receta pendiente de desglosar, sin inventar sus ingredientes.
const FILAS = [
  ['Verduras', 'verdura', 'verdura|verduras'],
  ['Lechuga', 'verdura', 'lechuga'], ['Tomate', 'verdura', 'tomate|tomates'],
  ['Acelga', 'verdura', 'acelga|acelgas'], ['Espinaca', 'verdura', 'espinaca|espinacas'],
  ['Brócoli', 'verdura', 'brocoli'], ['Coliflor', 'verdura', 'coliflor|arroz de coliflor'],
  ['Porotos verdes', 'verdura', 'porotos verdes|judias verdes'],
  ['Zapallo italiano', 'verdura', 'zapallo italiano|zapallito italiano|zapallos italianos'],
  ['Pepino', 'verdura', 'pepino|pepinos'], ['Repollo', 'verdura', 'repollo'],
  ['Zanahoria', 'verdura', 'zanahoria|zanahorias'],
  ['Arroz', 'almidon', 'arroz|arroz integral'],
  ['Papas', 'almidon', 'papa|papas|patata|patatas'],
  ['Pan', 'almidon', 'pan|pan integral|pan blanco|marraqueta|marraquetas|hallulla|hallullas'],
  ['Avena', 'almidon', 'avena'], ['Fideos', 'almidon', 'fideos|pasta|pastas|tallarines'],
  ['Choclo', 'almidon', 'choclo|maiz'], ['Quínoa', 'almidon', 'quinoa|quinua'],
  ['Porotos', 'legumbre', 'poroto|porotos|frijol|frijoles'],
  ['Lentejas', 'legumbre', 'lenteja|lentejas'], ['Garbanzos', 'legumbre', 'garbanzo|garbanzos'],
  ['Pollo', 'proteina', 'pollo|pechuga de pollo'], ['Pavo', 'proteina', 'pavo'],
  ['Pescado', 'proteina', 'pescado|merluza|reineta|salmon|atun|sardina|sardinas|jurel'],
  ['Huevo', 'proteina', 'huevo|huevos'], ['Tofu', 'proteina', 'tofu'],
  ['Carne de vacuno', 'carne', 'vacuno|carne de vacuno'],
  ['Carne (tipo por confirmar)', 'carne', 'carne'],
  ['Fruta', 'fruta', 'fruta|frutas'], ['Manzana', 'fruta', 'manzana|manzanas'],
  ['Pera', 'fruta', 'pera|peras'], ['Plátano', 'fruta', 'platano|platanos|banana'],
  ['Naranja', 'fruta', 'naranja|naranjas'], ['Mandarina', 'fruta', 'mandarina|mandarinas'],
  ['Frutilla', 'fruta', 'frutilla|frutillas|fresa|fresas'],
  ['Leche', 'lacteo', 'leche|leche descremada|leche semidescremada'],
  ['Yogur', 'lacteo', 'yogur|yogurt|yogur natural|yogurt natural'],
  ['Queso', 'queso', 'queso|quesillo|queso fresco'],
  ['Palta', 'grasa', 'palta|aguacate'], ['Frutos secos', 'grasa', 'nueces|nuez|almendras|mani|frutos secos'],
  ['Aceite de oliva', 'grasa', 'aceite de oliva'],
  ['Agua', 'agua', 'agua'], ['Té', 'infusion', 'te'], ['Café', 'infusion', 'cafe'],
  ['Jugo', 'jugo', 'jugo|jugos|zumo|zumos'],
  ['Bebida gaseosa', 'bebida', 'bebida|bebidas|gaseosa|gaseosas|refresco|refrescos'],
  ['Azúcar', 'dulce', 'azucar'], ['Miel', 'dulce', 'miel'],
  ['Dulces', 'dulce', 'dulces|galletas|pastel|torta|mermelada'],
  ['Cecinas', 'procesado', 'cecinas|jamon|jamon de pavo|salchicha|salchichas|vienesa|vienesas|longaniza|chorizo'],
  ['Mantequilla', 'saturada', 'mantequilla|manteca|crema de leche'],
  ['Sal', 'sal', 'sal'],
  ['Guiso', 'receta', 'guiso|guiso de acelga|guiso de verduras'],
  ['Ensalada (ingredientes por confirmar)', 'receta', 'ensalada|ensaladas'],
  ['Cazuela', 'receta', 'cazuela'], ['Charquicán', 'receta', 'charquican'],
  ['Tortilla', 'receta', 'tortilla|tortilla de acelga'],
  ['Sopa', 'receta', 'sopa|crema de zapallo'],
  ['Empanada', 'receta', 'empanada|empanadas'],
  ['Pastel de choclo', 'receta', 'pastel de choclo'],
  ['Arroz con leche', 'receta', 'arroz con leche'],
];

export const normalizarComida = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const candidatos = FILAS.flatMap(([nombre, grupo, aliases]) => aliases.split('|').map((a) => ({ nombre, grupo, palabras: a.split(' ') })))
  .sort((a, b) => b.palabras.length - a.palabras.length);
const OMITIR = new Set(('con y e de del al la el las los un una unos unas en a por para sin ni no mas muy poco poca poca cantidad gramos gr g kg ml cc taza tazas vaso vasos cucharada cucharadas unidad unidades trozo trozos porcion porciones medio media cocido cocida cocidos cocidas hervido hervida hervidas hervidos horno vapor plancha asado asada asadas asados frito frita fritos fritas natural integral descremada semidescremada anadida anadido picada picado sin piel agua caliente desayuno almuerzo once cena comio tome tomo').split(' '));

export function consultarComida(texto) {
  const limpio = normalizarComida(texto), tokens = limpio.match(/[a-z0-9]+|[,;.!]/g) || [];
  const usados = new Set(), encontrados = [], excluidos = [];
  for (const candidato of candidatos) {
    const n = candidato.palabras.length;
    for (let i = 0; i <= tokens.length - n; i++) {
      if (!candidato.palabras.every((p, j) => tokens[i + j] === p && !usados.has(i + j))) continue;
      for (let j = 0; j < n; j++) usados.add(i + j);
      // Negación inmediata: "sin azúcar" no se convierte en azúcar consumida.
      const negado = ['sin', 'no', 'ni'].includes(tokens[i - 1]);
      const lista = negado ? excluidos : encontrados;
      if (!lista.some((f) => f.nombre === candidato.nombre)) lista.push({ nombre: candidato.nombre, grupo: candidato.grupo });
    }
  }
  const desconocidos = [...new Set(tokens.filter((t, i) => !usados.has(i) && /^[a-z]+$/.test(t) && !OMITIR.has(t)))];
  const grupos = new Set(encontrados.map((f) => f.grupo));
  const consejos = [];
  if (grupos.has('receta')) consejos.push('Para revisar una preparación, escribe sus ingredientes y cómo se cocinó.');
  if (grupos.has('jugo')) consejos.push('Para acompañar una comida, prefiere agua a jugo; la fruta entera y el jugo no son equivalentes.');
  if (grupos.has('bebida') || grupos.has('dulce')) consejos.push('Revisa si tiene azúcar añadida y cuánto se consumió.');
  if (grupos.has('procesado') || grupos.has('sal')) consejos.push('Revisa la sal y el sodio; en productos envasados, compara la etiqueta.');
  if (/\bfrit[oa]s?\b/.test(limpio)) consejos.push('Si fue frito, revisa el tipo de grasa y la cantidad usada.');
  if (grupos.has('saturada') || grupos.has('queso') || grupos.has('carne')) consejos.push('Revisa la cantidad y las grasas saturadas; en carnes, importa el corte y la preparación.');
  if (encontrados.some((f) => ['almidon', 'legumbre', 'fruta', 'lacteo'].includes(f.grupo))) consejos.push('Hay alimentos con carbohidratos. Compara la cantidad con la porción indicada.');
  if (encontrados.filter(f => f.grupo === 'almidon').length > 1) consejos.unshift('Hay más de una fuente de almidón. Revisa la cantidad total de pan, arroz, papas o fideos con la pauta.');
  if (grupos.has('verdura') && (grupos.has('proteina') || grupos.has('legumbre')) && grupos.has('almidon')) consejos.push('Aparecen verduras, proteína y almidón. Falta confirmar sus cantidades y preparación.');
  if (!consejos.length && encontrados.length) consejos.push('Confirma los ingredientes, la cantidad y la preparación antes de compararlos con su pauta.');
  return { encontrados, excluidos, desconocidos, consejos: consejos.slice(0, 2), parcial: desconocidos.length > 0 || grupos.has('receta') };
}
