/**
 * Almacén de modelos 3D personalizados por componente (IndexedDB).
 *
 * Guarda los bytes originales del archivo (.glb/.gltf/.obj) que el usuario
 * asigna a un componente de la biblioteca, para volver a generar su geometría
 * al recargar la app. Se usa IndexedDB (no localStorage) porque los modelos
 * pueden pesar varios MB.
 */
import { STORE_MODELS, openAppDb } from "./appDb";

export interface StoredModel {
  componentId: string;
  fileName: string;
  ext: string;
  bytes: ArrayBuffer;
  /** Marca de tiempo de la última edición (ms), para resolver conflictos. */
  updatedAt: number;
}

function tx(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  return openAppDb().then((db) => db.transaction(STORE_MODELS, mode).objectStore(STORE_MODELS));
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
