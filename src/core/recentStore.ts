/**
 * Almacén de proyectos recientes (IndexedDB).
 *
 * Guarda una copia del proyecto cada vez que se abre o se guarda, para poder
 * reabrirlo desde la pantalla de inicio sin depender de la ruta del archivo
 * (que el navegador no expone). Los METADATOS (id/nombre/fecha) viven en un
 * store aparte: listar la Home o podar no deserializa los proyectos enteros.
 */
import { STORE_RECENT, STORE_RECENT_META, openAppDb } from "./appDb";
import type { ProjectData } from "./project";

export interface RecentRecord {
  id: string;
  name: string;
  savedAt: number;
  data: ProjectData;
  /** Miniatura JPEG del visor al guardar (data URL). Puede no haberla. */
  foto?: string;
}

export interface RecentMeta {
  id: string;
  name: string;
  savedAt: number;
  foto?: string;
}

const MAX_RECENT = 12;

/** Transacción sobre ambos stores (datos + metadatos). */
function both(mode: IDBTransactionMode): Promise<IDBTransaction> {
  return openAppDb().then((db) => db.transaction([STORE_RECENT, STORE_RECENT_META], mode));
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Identificador estable a partir del nombre (para no duplicar el mismo archivo). */
function idFor(name: string): string {
  return "rp_" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** Registra/actualiza un proyecto reciente. `now` debe ser Date.now(). */
export async function addRecent(
  name: string,
  data: ProjectData,
  now: number,
  foto?: string | null,
): Promise<void> {
  const id = idFor(name || "proyecto");
  // LA FOTO NO SE PIERDE AL REABRIR (v0.4.0). Abrir un archivo también lo
  // registra como reciente, y ahí no hay lienzo que fotografiar: sin esto, la
  // ficha perdía su miniatura cada vez que el proyecto se volvía a abrir.
  let previa: string | undefined;
  if (!foto) {
    try {
      const tx0 = await both("readonly");
      const m = await request<RecentMeta | undefined>(
        tx0.objectStore(STORE_RECENT_META).get(id) as IDBRequest<RecentMeta | undefined>,
      );
      previa = m?.foto;
    } catch {
      previa = undefined;
    }
  }
  const rec: RecentRecord = {
    id,
    name: name || "Proyecto",
    savedAt: now,
    data,
    foto: foto ?? previa,
  };
  const tx = await both("readwrite");
  await Promise.all([
    request(tx.objectStore(STORE_RECENT).put(rec)),
    request(tx.objectStore(STORE_RECENT_META).put({
      id: rec.id, name: rec.name, savedAt: rec.savedAt, foto: rec.foto,
    })),
  ]);
  await prune();
}

/** Lista los recientes (solo metadatos ligeros), más nuevos primero. */
export async function listRecent(): Promise<RecentMeta[]> {
  const db = await openAppDb();
  const metas = await request(
    db.transaction(STORE_RECENT_META, "readonly").objectStore(STORE_RECENT_META).getAll(),
  );
  return (metas as RecentMeta[]).sort((a, b) => b.savedAt - a.savedAt);
}

export async function getRecent(id: string): Promise<ProjectData | null> {
  const db = await openAppDb();
  const rec = await request(
    db.transaction(STORE_RECENT, "readonly").objectStore(STORE_RECENT).get(id),
  );
  return (rec as RecentRecord | undefined)?.data ?? null;
}

export async function deleteRecent(id: string): Promise<void> {
  const tx = await both("readwrite");
  await Promise.all([
    request(tx.objectStore(STORE_RECENT).delete(id)),
    request(tx.objectStore(STORE_RECENT_META).delete(id)),
  ]);
}

/** Conserva solo los MAX_RECENT más recientes (leyendo solo metadatos). */
async function prune(): Promise<void> {
  const metas = await listRecent();
  if (metas.length <= MAX_RECENT) return;
  for (const m of metas.slice(MAX_RECENT)) await deleteRecent(m.id);
}
