/**
 * Apertura compartida de la base de datos IndexedDB de la app ("exersuite3d").
 *
 * Un único punto define la versión y el esquema completo (los object stores de
 * modelos, proyectos recientes y sus metadatos), de modo que dé igual qué
 * módulo abra primero la base: el upgrade siempre crea/migra todo.
 */

export const APP_DB_NAME = "exersuite3d";
export const APP_DB_VERSION = 3;

export const STORE_MODELS = "componentModels";
export const STORE_RECENT = "recentProjects";
/**
 * Metadatos ligeros de los recientes (id/nombre/fecha), separados del proyecto
 * completo: listar la Home o podar no deserializa hasta 12 proyectos enteros.
 */
export const STORE_RECENT_META = "recentMeta";

let dbPromise: Promise<IDBDatabase> | null = null;

export function openAppDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(APP_DB_NAME, APP_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_MODELS)) {
        db.createObjectStore(STORE_MODELS, { keyPath: "componentId" });
      }
      if (!db.objectStoreNames.contains(STORE_RECENT)) {
        db.createObjectStore(STORE_RECENT, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_RECENT_META)) {
        db.createObjectStore(STORE_RECENT_META, { keyPath: "id" });
        // Migración v2 -> v3: rellena los metadatos desde los recientes ya
        // guardados (misma transacción versionchange del upgrade).
        const tx = req.transaction;
        if (tx && db.objectStoreNames.contains(STORE_RECENT)) {
          const src = tx.objectStore(STORE_RECENT);
          const dst = tx.objectStore(STORE_RECENT_META);
          src.openCursor().onsuccess = (e) => {
            const cur = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
            if (cur) {
              const v = cur.value as { id: string; name: string; savedAt: number };
              dst.put({ id: v.id, name: v.name, savedAt: v.savedAt });
              cur.continue();
            }
          };
        }
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
