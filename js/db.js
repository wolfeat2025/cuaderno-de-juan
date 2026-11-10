// Capa de datos: Firebase Auth anónimo + Firestore con caché sin conexión.
// Todo vive bajo /familias/{codigoFamilia}/...
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signInAnonymously, connectAuthEmulator } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, connectFirestoreEmulator,
  doc, collection, onSnapshot, setDoc, deleteDoc, query, where, getDocs, writeBatch,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

let db = null, auth = null, familia = '';
const COLECCIONES = ['tomas', 'mediciones', 'compras', 'turnos', 'citas'];

export function iniciar(config, emulador) {
  const app = initializeApp(config);
  auth = getAuth(app);
  // En producción Firestore detecta solo si la red necesita "long polling" (redes lentas o con proxy).
  // En las pruebas locales se fuerza, porque el WebKit de escritorio no sostiene bien el canal continuo con el emulador.
  const red = emulador ? { experimentalForceLongPolling: true } : {};
  try {
    db = initializeFirestore(app, Object.assign({ localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }, red));
  } catch (e) {
    db = initializeFirestore(app, red); // sin caché en disco (por ejemplo, navegación privada)
  }
  if (emulador) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
}

// Resuelve cuando hay sesión anónima (usa la guardada si no hay señal).
export function entrar() {
  return new Promise((resolve, reject) => {
    let listo = false;
    const fin = onAuthStateChanged(auth, (u) => {
      if (u) { if (!listo) { listo = true; fin(); resolve(u.uid); } return; }
      signInAnonymously(auth).catch((e) => { if (!listo) { listo = true; fin(); reject(e); } });
    }, (e) => { if (!listo) { listo = true; reject(e); } });
  });
}

export const fijarFamilia = (codigo) => { familia = codigo; };
const col = (nombre) => collection(db, 'familias', familia, nombre);
const ref = (nombre, id) => doc(db, 'familias', familia, nombre, id);
const refConfig = () => doc(db, 'familias', familia, 'config', 'app');
// La copia del plan de cada día se guarda junto a la configuración: /config/plan-AAAA-MM-DD
const refPlan = (fecha) => doc(db, 'familias', familia, 'config', 'plan-' + fecha);

export const nuevoId = (nombre) => doc(col(nombre)).id;

// Las escrituras no se esperan: Firestore las aplica al tiro en pantalla y las sube cuando hay señal.
const sinEsperar = (p, alFallar) => { p.catch((e) => { console.error('Firestore', e); if (alFallar) alFallar(e); }); };
let avisarError = null;
export const alFallarEscritura = (f) => { avisarError = f; };

export const poner = (nombre, id, datos) => sinEsperar(setDoc(ref(nombre, id), datos), avisarError);
export const cambiar = (nombre, id, datos) => sinEsperar(setDoc(ref(nombre, id), datos, { merge: true }), avisarError);
export const borrar = (nombre, id) => sinEsperar(deleteDoc(ref(nombre, id)), avisarError);
export const guardarConfig = (parcial) => sinEsperar(setDoc(refConfig(), parcial, { merge: true }), avisarError);
export const ponerPlan = (fecha, datos) => sinEsperar(setDoc(refPlan(fecha), datos), avisarError);

// `_pend` indica que el registro está guardado en este celular pero todavía no llega a la nube.
const lista = (snap) => snap.docs.map((d) => Object.assign({ id: d.id, _pend: d.metadata.hasPendingWrites }, d.data()));
const META = { includeMetadataChanges: true };

// Escucha en vivo. `desde` es una fecha 'AAAA-MM-DD': se traen tomas, mediciones y planes desde ese día.
export function escuchar(desde, lunes, m) {
  const bajas = [];
  const err = (e) => { console.error('Firestore', e); if (m.error) m.error(e); };
  bajas.push(onSnapshot(refConfig(), META, (s) => m.config(s.exists() ? s.data() : null, s.metadata.fromCache), err));
  bajas.push(onSnapshot(query(col('config'), where('fecha', '>=', desde)), (s) => m.planes(lista(s)), err));
  bajas.push(onSnapshot(query(col('tomas'), where('fecha', '>=', desde)), META, (s) => m.tomas(lista(s)), err));
  bajas.push(onSnapshot(query(col('mediciones'), where('fecha', '>=', desde)), META, (s) => m.mediciones(lista(s)), err));
  bajas.push(onSnapshot(query(col('turnos'), where('fecha', '>=', lunes)), (s) => m.turnos(lista(s)), err));
  bajas.push(onSnapshot(col('compras'), META, (s) => m.compras(lista(s)), err));
  bajas.push(onSnapshot(col('citas'), (s) => m.citas(lista(s)), err));
  return () => bajas.forEach((f) => f());
}

// Trae un rango de fechas (para el resumen acumulado y los reportes). Sin señal usa lo guardado en el celular.
export async function traerRango(desde, hasta) {
  const entre = (nombre) => getDocs(query(col(nombre), where('fecha', '>=', desde), where('fecha', '<=', hasta)));
  const r = await Promise.all([entre('tomas'), entre('mediciones'), entre('config')]);
  const tomas = {}, planes = {};
  lista(r[0]).forEach((t) => { tomas[t.id] = t; });
  lista(r[2]).forEach((p) => { planes[p.fecha] = p; });
  return { desde, hasta, tomas, mediciones: lista(r[1]).sort((a, b) => b.ts - a.ts), planes };
}

// ---- Respaldo ----
const limpio = (d) => { const c = Object.assign({ id: d.id }, d.data()); return c; };
export async function exportarTodo() {
  const out = { app: 'el-cuaderno-de-juan', version: 2, exportado: new Date().toISOString(), config: null, planes: [], colecciones: {} };
  const cfg = await getDocs(collection(db, 'familias', familia, 'config'));
  cfg.forEach((d) => { if (d.id === 'app') out.config = d.data(); else out.planes.push(limpio(d)); });
  for (const nombre of COLECCIONES) {
    const s = await getDocs(col(nombre));
    out.colecciones[nombre] = s.docs.map(limpio);
  }
  return out;
}

export async function importarTodo(datos) {
  if (!datos || datos.app !== 'el-cuaderno-de-juan' || !datos.colecciones) throw new Error('El archivo no es un respaldo de esta app.');
  let lote = writeBatch(db), n = 0, total = 0;
  const empujar = async (r, d) => {
    lote.set(r, d); n++; total++;
    if (n >= 400) { await lote.commit(); lote = writeBatch(db); n = 0; }
  };
  const sinId = (d) => { const c = Object.assign({}, d); delete c.id; delete c._pend; return c; };
  if (datos.config) await empujar(refConfig(), datos.config);
  for (const p of datos.planes || []) { if (p.id && /^plan-\d{4}-\d\d-\d\d$/.test(p.id)) await empujar(doc(db, 'familias', familia, 'config', p.id), sinId(p)); }
  for (const nombre of COLECCIONES) {
    for (const d of datos.colecciones[nombre] || []) { if (d.id) await empujar(ref(nombre, String(d.id)), sinId(d)); }
  }
  if (n) await lote.commit();
  return total;
}
