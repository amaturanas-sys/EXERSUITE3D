/**
 * Almacén de modelos 3D personalizados por componente (IndexedDB).
 *
 * Guarda los bytes originales del archivo (.glb/.gltf/.obj) que el usuario
 * asigna a un componente de la biblioteca, para volver a generar su geometría
 * al recargar la app. Se usa IndexedDB (no localStorage) porque los modelos
 * pueden pesar varios MB.
 */

export interface StoredModel {
  componentId: string;
  fileName: string;
  ext: string;
  bytes: ArrayBuffer;
}

const DB_NAME = "exersuite3d";
const STORE = "componentModels";
const VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "componentId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  return open().then((db) => db.transaction(STORE, mode).objectStore(STORE));
}

export async function putModel(model: StoredModel): Promise<void> {
  const store = await tx("readwrite");
  return new Promise((resolve, reject) => {
    const req = store.put(model);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteModel(componentId: string): Promise<void> {
  const store = await tx("readwrite");
  return new Promise((resolve, reject) => {
    const req = store.delete(componentId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getAllModels(): Promise<StoredModel[]> {
  const store = await tx("readonly");
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as StoredModel[]);
    req.onerror = () => reject(req.error);
  });
}
