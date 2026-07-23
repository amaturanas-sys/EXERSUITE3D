/**
 * Prefabs del usuario que SUSTITUYEN a las máquinas estándar (v0.2.4).
 *
 * El ciclo robusto de corrección: exportar el prefab de fábrica → editarlo en
 * la app con las herramientas nativas → volver a importarlo aquí. El archivo
 * pasa a ser la DEFINICIÓN literal de la máquina — cada inserción, preview y
 * exportación OBJ/STL usa sus piezas tal cual, sin transcripción manual.
 */

import { STORE_PREFABS, openAppDb } from "./appDb";
import type { PrefabArchivo } from "./prefabIO";

interface Registro {
  prefabId: string;
  archivo: PrefabArchivo;
  savedAt: number;
}

class PrefabsMaquina {
  private mapa = new Map<string, PrefabArchivo>();
  private listeners = new Set<() => void>();
  private cargado = false;

  /** Carga todos los prefabs guardados (una vez, al arrancar). */
  async init(): Promise<void> {
    if (this.cargado) return;
    this.cargado = true;
    try {
      const db = await openAppDb();
      const registros = await new Promise<Registro[]>((resolve, reject) => {
        const req = db.transaction(STORE_PREFABS).objectStore(STORE_PREFABS).getAll();
        req.onsuccess = () => resolve(req.result as Registro[]);
        req.onerror = () => reject(req.error);
      });
      for (const r of registros) this.mapa.set(r.prefabId, r.archivo);
      if (registros.length > 0) this.notify();
    } catch {
      /* sin IndexedDB (p. ej. pruebas): funciona en memoria */
    }
  }

  get(prefabId: string): PrefabArchivo | null {
    return this.mapa.get(prefabId) ?? null;
  }

  has(prefabId: string): boolean {
    return this.mapa.has(prefabId);
  }

  async set(prefabId: string, archivo: PrefabArchivo): Promise<void> {
    this.mapa.set(prefabId, archivo);
    this.notify();
    try {
      const db = await openAppDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_PREFABS, "readwrite");
        tx.objectStore(STORE_PREFABS).put({ prefabId, archivo, savedAt: Date.now() });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      /* en memoria */
    }
  }

  async remove(prefabId: string): Promise<void> {
    this.mapa.delete(prefabId);
    this.notify();
    try {
      const db = await openAppDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_PREFABS, "readwrite");
        tx.objectStore(STORE_PREFABS).delete(prefabId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      /* en memoria */
    }
  }

  onChanged(fn: () => void): void {
    this.listeners.add(fn);
  }

  private notify(): void {
    for (const fn of this.listeners) fn();
  }
}

export const prefabsMaquina = new PrefabsMaquina();
