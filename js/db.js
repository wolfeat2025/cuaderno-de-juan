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

export const nuevoId = (nombre) => doc(col(nombre)).id;

// Las escrituras no se esperan: Firestore las aplica al tiro en pantalla y las sube cuando hay señal.
const sinEsperar = (p, alFallar) => { p.catch((e) => { console.error('Firestore', e); if (alFallar) alFallar(e); }); };
let avisarError = null;
export const alFallarEscritura = (f) => { avisarError = f; };

export const poner = (nombre, id, datos) => sinEsperar(setDoc(ref(nombre, id), datos), avisarError);
export const cambiar = (nombre, id, datos) => sinEsperar(setDoc(ref(nombre, id), datos, { merge: true }), avisarError);
export const borrar = (nombre, id) => sinEsperar(deleteDoc(ref(nombre, id)), avisarError);
export const guardarConfig = (parcial) => sinEsperar(setDoc(refConfig(), parcial, { merge: true }), avisarError);

// Escucha en vivo. `desde` es una fecha 'AAAA-MM-DD': se traen tomas, mediciones y turnos desde ese día.
export function escuchar(desde, lunes, m) {
  const bajas = [];
  const lista = (snap) => snap.docs.map((d) => Object.assign({ id: d.id }, d.data()));
  const err = (e) => { console.error('Firestore', e); if (m.error) m.error(e); };
  bajas.push(onSnapshot(refConfig(), { includeMetadataChanges: true }, (s) => m.config(s.exists() ? s.data() : null, s.metadata.fromCache), err));
  bajas.push(onSnapshot(query(col('tomas'), where('fecha', '>=', desde)), (s) => m.tomas(lista(s)), err));
  bajas.push(onSnapshot(query(col('mediciones'), where('fecha', '>=', desde)), (s) => m.mediciones(lista(s)), err));
  bajas.push(onSnapshot(query(col('turnos'), where('fecha', '>=', lunes)), (s) => m.turnos(lista(s)), err));
  bajas.push(onSnapshot(col('compras'), (s) => m.compras(lista(s)), err));
  bajas.push(onSnapshot(col('citas'), (s) => m.citas(lista(s)), err));
  return () => bajas.forEach((f) => f());
}

// ---- Respaldo ----
export async function exportarTodo() {
  const out = { app: 'el-cuaderno-de-juan', version: 1, exportado: new Date().toISOString(), config: null, colecciones: {} };
  const cfg = await getDocs(collection(db, 'familias', familia, 'config'));
  cfg.forEach((d) => { if (d.id === 'app') out.config = d.data(); });
  for (const nombre of COLECCIONES) {
    const s = await getDocs(col(nombre));
    out.colecciones[nombre] = s.docs.map((d) => Object.assign({ id: d.id }, d.data()));
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
  if (datos.config) await empujar(refConfig(), datos.config);
  for (const nombre of COLECCIONES) {
    for (const d of datos.colecciones[nombre] || []) {
      const copia = Object.assign({}, d); const id = copia.id; delete copia.id;
      if (id) await empujar(ref(nombre, String(id)), copia);
    }
  }
  if (n) await lote.commit();
  return total;
}
