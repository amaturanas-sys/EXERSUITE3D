/**
 * Almacén de modelos 3D de los segmentos del maniquí (IndexedDB).
 *
 * Base de datos propia ("exersuite3d-figure") para no coordinar versiones con el
 * almacén de modelos de componentes.
 */
export interface StoredSegment {
  segmentId: string;
  fileName: string;
  ext: string;
  bytes: ArrayBuffer;
  updatedAt: number;
}

const DB_NAME = "exersuite3d-figure";
const STORE = "segments";
const VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "segmentId" });
      }
    };
    req.onsuccess = () => {
      // Si otra pestana pide una version mas nueva, cerramos para no bloquearla.
      req.result.onversionchange = () => req.result.close();
      resolve(req.result);
    };
    req.onerror = () => reject(req.error);
    // Otra pestana con la version antigua abierta bloquea el upgrade: mejor
    // fallar con mensaje que colgar la promesa para siempre.
    req.onblocked = () =>
      reject(new Error("Base de datos bloqueada por otra pestana abierta"));
  });
  return dbPromise;
}

function tx(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  return open().then((db) => db.transaction(STORE, mode).objectStore(STORE));
}

export async function putSegment(seg: StoredSegment): Promise<void> {
  const store = await tx("readwrite");
  return new Promise((resolve, reject) => {
    const req = store.put(seg);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteSegment(segmentId: string): Promise<void> {
  const store = await tx("readwrite");
  return new Promise((resolve, reject) => {
    const req = store.delete(segmentId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getAllSegments(): Promise<StoredSegment[]> {
  const store = await tx("readonly");
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as StoredSegment[]);
    req.onerror = () => reject(req.error);
  });
}
