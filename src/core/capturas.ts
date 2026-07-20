import { APP_DB_VERSION, STORE_CAPTURAS, openAppDb } from "./appDb";

void APP_DB_VERSION; // el esquema vive en appDb

/**
 * Galería de capturas del Simulador: PNG del visor guardados en IndexedDB
 * (máx. 24, las más antiguas se podan) y visibles desde la Home → Simulador
 * → Capturas.
 */

export interface Captura {
  id: string;
  dataUrl: string;
  tomadaEn: number;
}

const MAX = 24;

function tx(db: IDBDatabase, mode: IDBTransactionMode): IDBObjectStore {
  return db.transaction(STORE_CAPTURAS, mode).objectStore(STORE_CAPTURAS);
}

function pedir<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

export async function guardarCaptura(dataUrl: string): Promise<Captura> {
  const db = await openAppDb();
  const cap: Captura = {
    id: `cap-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    dataUrl,
    tomadaEn: Date.now(),
  };
  await pedir(tx(db, "readwrite").put(cap));
  // Poda las más antiguas por encima del máximo.
  const todas = await listarCapturas();
  for (const vieja of todas.slice(MAX)) {
    await pedir(tx(db, "readwrite").delete(vieja.id));
  }
  return cap;
}

/** Todas las capturas, la más reciente primero. */
export async function listarCapturas(): Promise<Captura[]> {
  const db = await openAppDb();
  const todas = (await pedir(tx(db, "readonly").getAll())) as Captura[];
  return todas.sort((a, b) => b.tomadaEn - a.tomadaEn);
}

export async function borrarCaptura(id: string): Promise<void> {
  const db = await openAppDb();
  await pedir(tx(db, "readwrite").delete(id));
}
