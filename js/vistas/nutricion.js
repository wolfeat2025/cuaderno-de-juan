// Consulta voluntaria por ingredientes confirmados. Nunca estima nutrientes por el nombre del plato.
import { estado, acciones, pintar, esAdmin, aviso } from '../nucleo.js';
import { esc, ico, val, DIAS_K } from '../util.js';
import * as db from '../db.js';
const CAMPOS = [['carbohidratos','Carbohidratos','g'],['sodio','Sodio','mg'],['saturadas','Grasas saturadas','g']];
const comidas = [['desayuno','Desayuno'],['almuerzo','Almuerzo'],['once','Once'],['cena','Cena'],['colacion-manana','Colación de la mañana'],['colacion-tarde','Colación de la tarde']];
const numero = v => v === '' || v == null || !Number.isFinite(Number(v)) || Number(v)<0 ? null : Number(v);
function ui() { return estado.ui.nutricion || (estado.ui.nutricion={items:[],comida:'almuerzo',preparacion:'',error:'',peticion:0}); }
export function totalNutrientes(items) {
  const total={};
  for(const [k] of CAMPOS) total[k]=items.length && items.every(i=>numero(i[k])!==null && numero(i.gramos)>0)?items.reduce((s,i)=>s+Number(i[k])*Number(i.gramos)/100,0):null;
  return total;
}
function resumen(u) {
  if(!u.items.length) return '';
  const total=totalNutrientes(u.items), pauta=(estado.config.pautaNutricion||{})[u.comida]||{};
  const limites=CAMPOS.filter(([k])=>numero(pauta[k])!==null), excedidos=limites.filter(([k])=>total[k]!==null && total[k]>Number(pauta[k]));
  const completo=u.completa && u.preparacion && CAMPOS.every(([k])=>total[k]!==null);
  const comparable=completo && pauta.fuente && limites.length;
  const titulo=!completo?'Falta completar esta comida':!comparable?'Falta una pauta para comparar':excedidos.length?'Supera un límite de la pauta':'Dentro de los límites cargados';
  return `<section class="panel"><h2 class="h3">${titulo}</h2><div class="nutri-totales">${CAMPOS.map(([k,n,un])=>`<p><span>${n}</span><b>${total[k]===null?'Sin dato':total[k].toLocaleString('es-CL',{maximumFractionDigits:1})+' '+un}</b></p>`).join('')}</div>
    ${excedidos.length?`<p class="nota">Revisar: ${excedidos.map(x=>x[1]).join(', ')}. Compara porciones y alternativas con la pauta; no omitas la comida para compensarlo.</p>`:''}
    ${comparable?`<p class="nota">Comparación únicamente con ${limites.map(x=>x[1].toLowerCase()).join(', ')} · Fuente: ${esc(pauta.fuente)}${pauta.fecha?' · '+esc(pauta.fecha):''}.</p>`:'<p class="nota">Confirma todos los ingredientes, la cantidad consumida y cómo se preparó. Un dato desconocido no se suma como cero.</p>'}
    <p class="nota">No predice la glicemia ni confirma por sí sola que la comida sea adecuada para Juan.</p></section>`;
}
export function render() {
  const u=ui(), pauta=(estado.config.pautaNutricion||{})[u.comida]||{}, porcion=(((estado.config.porciones||{})[DIAS_K[estado.ahora.getDay()]]||{})[u.comida]);
  return `<div class="envoltura"><a class="btn quieto izq" href="#comidas">${ico('left')}Volver a Comidas</a><h2 class="h2">Revisar una comida</h2>
    <p class="sub">Añade lo que realmente lleva. Puedes consultar un envase o copiar su etiqueta.</p>
    <label class="campo">Comida<select id="nut-comida" class="texto" data-c="nutComida">${comidas.map(([k,n])=>`<option value="${k}"${u.comida===k?' selected':''}>${n}</option>`).join('')}</select></label>
    ${porcion?`<p class="nota aviso-info">Porción indicada: ${esc(porcion)}</p>`:''}
    <details class="panel comida-menu" data-k="buscar-envase"><summary>Buscar un producto por código de barras</summary><p class="nota">Solo se consulta el código en Open Food Facts. Confirma que la ficha coincida con tu envase.</p><label class="campo">Código del envase<input class="texto" id="nut-codigo" inputmode="numeric" maxlength="14" value="${esc(u.codigo||'')}" data-i="nutCodigo"></label><button class="btn sec" data-a="nutBuscar"${u.cargando?' disabled':''}>${u.cargando?'Buscando…':'Buscar producto'}</button></details>
    <section class="panel" data-k="nut-editor"><h3 class="h3">${u.producto?'Confirmar etiqueta':'Añadir ingrediente'}</h3>
      ${u.producto?`<p class="nota">Ficha externa: ${esc(u.producto.nombre)}. Base declarada: ${esc(u.producto.base)}. Elige la unidad que indica el envase antes de añadir.</p>`:''}
      <label class="campo">Nombre<input class="texto" id="nut-nombre" maxlength="100" value="${esc(u.nombre||'')}" data-i="nutBorrador"></label>
      <div class="dos"><label class="campo">Cantidad consumida<input class="texto" id="nut-gramos" inputmode="decimal" value="${esc(u.gramos||'')}" data-i="nutBorrador"></label><label class="campo">Unidad<select class="texto" id="nut-unidad" data-c="nutBorrador"><option value="g"${u.unidad!=='ml'?' selected':''}>gramos</option><option value="ml"${u.unidad==='ml'?' selected':''}>mililitros</option></select></label></div>
      <details class="comida-menu" open data-k="etiqueta-nutrientes"><summary>Datos por 100 g o 100 ml, según etiqueta</summary>${CAMPOS.map(([k,n,un])=>`<label class="campo">${n} (${un})<input class="texto" id="nut-${k}" inputmode="decimal" value="${esc(u[k] == null?'':u[k])}" data-i="nutBorrador" placeholder="Vacío si no se sabe"></label>`).join('')}<p class="nota">Usa la misma unidad de referencia de la etiqueta. Si solo indica sal: sodio (mg) = sal (g) × 400.</p></details>
      <label class="campo">Fuente de estos datos<input class="texto" id="nut-fuente" maxlength="180" placeholder="Etiqueta del envase o ficha nutricional" value="${esc(u.fuente||'')}" data-i="nutBorrador"></label>
      <button class="btn pri" data-a="nutAgregar">${ico('check')}Confirmar y añadir</button>
    </section>
    ${u.error?`<p class="error" role="alert">${esc(u.error)}</p>`:''}
    ${u.items.length?`<section class="panel"><h3 class="h3">Ingredientes confirmados</h3>${u.items.map((it,i)=>`<div class="nutri-item"><div><b>${esc(it.nombre)}</b><p class="nota">${it.gramos} ${it.unidad} · ${esc(it.fuente)}</p></div><button class="mini-btn" data-a="nutQuitar" data-v="${i}" aria-label="Quitar ${esc(it.nombre)}">${ico('trash')}</button></div>`).join('')}<label class="campo">¿Cómo se preparó?<input class="texto" id="nut-preparacion" value="${esc(u.preparacion)}" placeholder="Al horno, con aceite…" maxlength="150" data-c="nutPreparacion"></label><button class="btn sec" data-a="nutCompleta" aria-pressed="${!!u.completa}">${ico(u.completa?'check':'plus')}${u.completa?'Confirmado: están todos':'Confirmar todos los ingredientes'}</button><p class="nota">Incluye aceite, salsas, sal y acompañamientos. Confirma solo si las cantidades son conocidas.</p></section>`:''}
    ${resumen(u)}
    ${esAdmin()?`<details class="panel comida-menu" data-k="pauta-${u.comida}"><summary>Cargar límites indicados por profesional</summary><p class="nota">Máximos por esta comida, solo si están indicados en su pauta. Vacío significa sin límite cargado.</p>${CAMPOS.map(([k,n,un])=>`<label class="campo">Máximo de ${n.toLowerCase()} (${un})<input class="texto" id="pauta-${k}" inputmode="decimal" value="${esc(pauta[k] == null?'':pauta[k])}"></label>`).join('')}<label class="campo">Profesional o documento<input class="texto" id="pauta-fuente" value="${esc(pauta.fuente||'')}" maxlength="180"></label><label class="campo">Fecha de la pauta<input class="texto" type="date" id="pauta-fecha" value="${esc(pauta.fecha||'')}"></label><button class="btn sec" data-a="nutGuardarPauta">Guardar pauta</button></details>`:''}
    <p class="nota">Consulta orientativa; no registra consumo. Los datos se mantienen durante esta consulta. <a class="enlace" href="https://world.openfoodfacts.org/terms-of-use" target="_blank" rel="noopener">Open Food Facts · ODbL</a>. Sus fichas son colaborativas y pueden estar incompletas.</p></div>`;
}
function leer() {
  const u=ui(); for(const k of ['nombre','gramos','unidad','fuente',...CAMPOS.map(x=>x[0])]) { const e=document.getElementById('nut-'+k); if(e)u[k]=e.value; } return u;
}
acciones.nutBorrador=()=>{leer();};
acciones.nutCodigo=()=>{ui().codigo=val('nut-codigo');};
acciones.nutComida=()=>{leer().comida=val('nut-comida');pintar();};
acciones.nutPreparacion=()=>{ui().preparacion=val('nut-preparacion');pintar();};
acciones.nutCompleta=()=>{const u=ui();u.preparacion=val('nut-preparacion');u.completa=!u.completa;pintar();};
acciones.nutQuitar=d=>{const u=leer();u.items.splice(Number(d.v),1);u.completa=false;pintar();};
acciones.nutAgregar=()=>{
  const u=leer(), gramos=numero(String(u.gramos||'').replace(',','.'));
  if(!String(u.nombre||'').trim()||!String(u.fuente||'').trim()||!gramos||gramos>10000){u.error='Completa nombre, fuente y cantidad válida.';pintar();return;}
  const it={nombre:u.nombre.trim(),fuente:u.fuente.trim(),gramos,unidad:u.unidad||'g'};
  for(const [k] of CAMPOS){const v=String(u[k] == null ? '' : u[k]).replace(',','.');it[k]=numero(v);if(v!==''&&(it[k]===null||it[k]>(k==='sodio'?100000:100))){u.error='Revisa los datos por 100 g / 100 ml.';pintar();return;}}
  u.items.push(it);u.completa=false;u.error='';u.producto=null;for(const k of ['nombre','gramos','fuente',...CAMPOS.map(x=>x[0])])u[k]='';pintar();
};
acciones.nutBuscar=async()=>{
  const u=leer(), codigo=val('nut-codigo');u.codigo=codigo;
  if(!/^\d{8,14}$/.test(codigo)){u.error='Escribe entre 8 y 14 números del código de barras.';pintar();return;}
  const pedido=++u.peticion;u.cargando=true;u.error='';pintar();const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),10000);
  try{
    const res=await fetch(`https://world.openfoodfacts.org/api/v2/product/${codigo}.json?fields=product_name,brands,nutriments,nutrition_data_per,quantity`,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
    if(!res.ok)throw new Error('red');const data=await res.json();if(estado.ui.nutricion!==u||u.peticion!==pedido)return;
    if(data.status!==1||!data.product){u.error='No encontré el producto. Puedes copiar los datos de su etiqueta.';return;}
    const p=data.product,n=p.nutriments||{};u.nombre=[p.product_name,p.brands].filter(Boolean).join(' · ').slice(0,100);u.gramos='';
    u.producto={nombre:u.nombre,base:p.nutrition_data_per||'por confirmar'};u.fuente='Open Food Facts · '+codigo;
    u.carbohidratos=numero(n.carbohydrates_100g);u.sodio=numero(n.sodium_100g)===null?null:Number(n.sodium_100g)*1000;u.saturadas=numero(n['saturated-fat_100g']);
  }catch(e){if(estado.ui.nutricion===u)u.error='No se pudo consultar. Intenta de nuevo o copia la etiqueta.';}
  finally{clearTimeout(timer);if(estado.ui.nutricion===u){u.cargando=false;pintar();}}
};
acciones.nutGuardarPauta=()=>{
  if(!esAdmin())return;const u=leer(),p={fuente:val('pauta-fuente'),fecha:val('pauta-fecha')};
  for(const [k]of CAMPOS){const v=val('pauta-'+k).replace(',','.');p[k]=numero(v);if(v!==''&&p[k]===null){aviso('Revisa los límites de la pauta');return;}}
  if(!p.fuente||!p.fecha){aviso('Indica la fuente y fecha de la pauta');return;}
  db.guardarConfig({pautaNutricion:{...(estado.config.pautaNutricion||{}),[u.comida]:p},editado:{quien:estado.quien,ts:Date.now()}});aviso('Pauta guardada');
};
