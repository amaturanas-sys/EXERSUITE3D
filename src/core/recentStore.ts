/**
 * Almacén de proyectos recientes (IndexedDB).
 *
 * Guarda una copia del proyecto cada vez que se abre o se guarda, para poder
 * reabrirlo desde la pantalla de inicio sin depender de la ruta del archivo
 * (que el navegador no expone).
 */
import type { ProjectData } from "./project";

export interface RecentRecord {
  id: string;
  name: string;
  savedAt: number;
  data: ProjectData;
}

export interface RecentMeta {
  id: string;
  name: string;
  savedAt: number;
}

const DB_NAME = "exersuite3d";
const STORE = "recentProjects";
const VERSION = 2; // sube respecto al store de modelos (versión 1)
const MAX_RECENT = 12;

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("componentModels")) {
        db.createObjectStore("componentModels", { keyPath: "componentId" });
      }
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function store(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  return open().then((db) => db.transaction(STORE, mode).objectStore(STORE));
}

/** Identificador estable a partir del nombre (para no duplicar el mismo archivo). */
function idFor(name: string): string {
  return "rp_" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** Registra/actualiza un proyecto reciente. `now` debe ser Date.now(). */
export async function addRecent(name: string, data: ProjectData, now: number): Promise<void> {
  const s = await store("readwrite");
  const rec: RecentRecord = { id: idFor(name || "proyecto"), name: name || "Proyecto", savedAt: now, data };
  await new Promise<void>((resolve, reject) => {
    const req = s.put(rec);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  await prune();
}

/** Lista los recientes (sin los datos pesados), más nuevos primero. */
export async function listRecent(): Promise<RecentMeta[]> {
  const s = await store("readonly");
  const all = await new Promise<RecentRecord[]>((resolve, reject) => {
    const req = s.getAll();
    req.onsuccess = () => resolve(req.result as RecentRecord[]);
    req.onerror = () => reject(req.error);
  });
  return all
    .map((r) => ({ id: r.id, name: r.name, savedAt: r.savedAt }))
    .sort((a, b) => b.savedAt - a.savedAt);
}

export async function getRecent(id: string): Promise<ProjectData | null> {
  const s = await store("readonly");
  const rec = await new Promise<RecentRecord | undefined>((resolve, reject) => {
    const req = s.get(id);
    req.onsuccess = () => resolve(req.result as RecentRecord | undefined);
    req.onerror = () => reject(req.error);
  });
  return rec?.data ?? null;
}

export async function deleteRecent(id: string): Promise<void> {
  const s = await store("readwrite");
  await new Promise<void>((resolve, reject) => {
    const req = s.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/** Conserva solo los MAX_RECENT más recientes. */
async function prune(): Promise<void> {
  const metas = await listRecent();
  if (metas.length <= MAX_RECENT) return;
  for (const m of metas.slice(MAX_RECENT)) await deleteRecent(m.id);
}
