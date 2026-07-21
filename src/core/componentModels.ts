import * as THREE from "three";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { getDefinition } from "../objects/componentLibrary";
import { STANDARD_MACHINES } from "../objects/standardMachines";
import { deleteModel, getAllModels, putModel } from "./modelStore";
import { bakeComponentGeometry, loadModelRoot } from "./modelLoading";

/** Estado de un modelo entrante respecto al local, al importar un comprimido. */
export type ImportStatus = "new" | "newer" | "older" | "unchanged" | "unknown";

export interface ImportEntry {
  componentId: string;
  label: string;
  fileName: string;
  ext: string;
  bytes: Uint8Array;
  updatedAt: number;
  localUpdatedAt: number | null;
  status: ImportStatus;
}

/**
 * Gestor de modelos 3D por componente, independiente del editor y del renderer.
 * Mantiene la geometría "activa" de cada componente (modelo de usuario, de
 * archivo o ninguna) y persiste los modelos de usuario en IndexedDB.
 *
 * Es un singleton compartido por el editor y por la biblioteca autónoma, de modo
 * que la biblioteca puede editar el repertorio sin crear una escena de diseño.
 */
class ComponentModelManager {
  private models = new Map<string, THREE.BufferGeometry>();
  private info = new Map<string, { fileName: string; source: "file" | "user" }>();
  private fileModels = new Map<string, { geo: THREE.BufferGeometry; fileName: string }>();
  private listeners = new Set<() => void>();
  private loaded: Promise<void> | null = null;

  /** Suscribe un callback a los cambios del repertorio. Devuelve el de baja. */
  onChanged(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }

  has(componentId: string): boolean {
    return this.models.has(componentId);
  }

  fileName(componentId: string): string | null {
    return this.info.get(componentId)?.fileName ?? null;
  }

  source(componentId: string): "file" | "user" | null {
    return this.info.get(componentId)?.source ?? null;
  }

  /** Clon de la geometría activa de un componente (o null). */
  geometryClone(componentId: string): THREE.BufferGeometry | null {
    return this.models.get(componentId)?.clone() ?? null;
  }

  private setActive(
    componentId: string,
    geo: THREE.BufferGeometry,
    fileName: string,
    source: "file" | "user",
  ): void {
    const prev = this.models.get(componentId);
    this.models.set(componentId, geo);
    this.info.set(componentId, { fileName, source });
    // No liberar geometrías de archivo (respaldo compartido).
    if (prev && prev !== geo && prev !== this.fileModels.get(componentId)?.geo) {
      prev.dispose();
    }
  }

  private async bake(bytes: ArrayBuffer, ext: string): Promise<THREE.BufferGeometry> {
    return bakeComponentGeometry(await loadModelRoot(bytes, ext));
  }

  /** Hornea, activa y persiste un modelo de usuario con su marca de tiempo. */
  private async store(
    componentId: string,
    fileName: string,
    ext: string,
    bytes: ArrayBuffer,
    updatedAt: number,
  ): Promise<void> {
    const geo = await this.bake(bytes, ext);
    this.setActive(componentId, geo, fileName, "user");
    await putModel({ componentId, fileName, ext, bytes, updatedAt });
  }

  /** Asigna un modelo de usuario a un componente (persistente) y notifica. */
  async setUserModel(componentId: string, file: File): Promise<void> {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    await this.store(componentId, file.name, ext, await file.arrayBuffer(), Date.now());
    this.emit();
  }

  /** Quita el modelo de usuario; vuelve al de archivo si existe, o a la primitiva. */
  async clearUserModel(componentId: string): Promise<void> {
    await deleteModel(componentId);
    const fallback = this.fileModels.get(componentId);
    if (fallback) {
      this.setActive(componentId, fallback.geo, fallback.fileName, "file");
    } else {
      const geo = this.models.get(componentId);
      this.models.delete(componentId);
      this.info.delete(componentId);
      geo?.dispose();
    }
    this.emit();
  }

  /** Carga los modelos (archivo + usuario) una sola vez. */
  ensureLoaded(): Promise<void> {
    if (!this.loaded) {
      this.loaded = (async () => {
        await this.loadFileModels();
        await this.loadUserModels();
      })();
    }
    return this.loaded;
  }

  private async loadFileModels(): Promise<void> {
    const base = import.meta.env.BASE_URL;
    let manifest: Record<string, unknown>;
    try {
      const res = await fetch(`${base}models/components/manifest.json`, { cache: "no-store" });
      if (!res.ok) return;
      manifest = await res.json();
    } catch {
      return;
    }
    for (const [componentId, value] of Object.entries(manifest)) {
      const fileName = typeof value === "string" ? value.trim() : "";
      if (!fileName) continue;
      // Se admiten componentes de biblioteca y máquinas estándar (maquina:<id>).
      const esMaquina =
        componentId.startsWith("maquina:") &&
        STANDARD_MACHINES.some((m) => `maquina:${m.id}` === componentId);
      if (!getDefinition(componentId) && !esMaquina) {
        console.warn(`manifest.json: componente desconocido "${componentId}"`);
        continue;
      }
      try {
        const res = await fetch(`${base}models/components/${fileName}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const bytes = await res.arrayBuffer();
        const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
        const geo = await this.bake(bytes, ext);
        this.fileModels.set(componentId, { geo, fileName });
        if (this.info.get(componentId)?.source !== "user") {
          this.setActive(componentId, geo, fileName, "file");
        }
      } catch (e) {
        console.warn(`No se pudo cargar el modelo de archivo de "${componentId}" (${fileName}):`, e);
      }
    }
    if (this.models.size) this.emit();
  }

  private async loadUserModels(): Promise<void> {
    let stored;
    try {
      stored = await getAllModels();
    } catch {
      return;
    }
    for (const m of stored) {
      try {
        const geo = await this.bake(m.bytes, m.ext);
        this.setActive(m.componentId, geo, m.fileName, "user");
      } catch (e) {
        console.warn("Modelo de componente no válido:", m.componentId, e);
      }
    }
    if (this.models.size) this.emit();
  }

  // ------------------------------------------------- exportar / importar bulk
  /** Empaqueta todos los modelos de usuario en un ZIP (con marcas de tiempo). */
  async exportZip(): Promise<Uint8Array> {
    const stored = await getAllModels();
    const files: Record<string, Uint8Array> = {};
    const manifest: {
      version: number;
      exportedAt: number;
      models: Record<string, { fileName: string; ext: string; updatedAt: number; path: string }>;
    } = { version: 1, exportedAt: Date.now(), models: {} };

    for (const m of stored) {
      const path = `models/${m.componentId}.${m.ext}`;
      files[path] = new Uint8Array(m.bytes);
      manifest.models[m.componentId] = {
        fileName: m.fileName,
        ext: m.ext,
        updatedAt: m.updatedAt ?? 0,
        path,
      };
    }
    files["manifest.json"] = strToU8(JSON.stringify(manifest, null, 2));
    return zipSync(files, { level: 6 });
  }

  /**
   * Analiza un ZIP entrante sin aplicarlo: compara cada modelo con el local y
   * clasifica su estado (nuevo, más reciente, más antiguo, sin cambios).
   */
  async analyzeImport(zipBytes: ArrayBuffer): Promise<ImportEntry[]> {
    const files = unzipSync(new Uint8Array(zipBytes));
    const manifestRaw = files["manifest.json"];
    if (!manifestRaw) throw new Error("El comprimido no contiene manifest.json.");
    const manifest = JSON.parse(strFromU8(manifestRaw)) as {
      models: Record<string, { fileName: string; ext: string; updatedAt: number; path: string }>;
    };

    const localList = await getAllModels().catch(() => []);
    const local = new Map(localList.map((m) => [m.componentId, m]));

    const entries: ImportEntry[] = [];
    for (const [componentId, meta] of Object.entries(manifest.models ?? {})) {
      const bytes = files[meta.path];
      if (!bytes) continue;
      const def = getDefinition(componentId);
      // Las máquinas estándar sustituidas viajan con clave `maquina:<id>`.
      const maquina = componentId.startsWith("maquina:")
        ? STANDARD_MACHINES.find((m) => `maquina:${m.id}` === componentId)
        : undefined;
      const loc = local.get(componentId);
      let status: ImportStatus;
      if (!def && !maquina) status = "unknown";
      else if (!loc) status = "new";
      else if (hashU8(bytes) === hashU8(new Uint8Array(loc.bytes))) status = "unchanged";
      else status = (meta.updatedAt ?? 0) > (loc.updatedAt ?? 0) ? "newer" : "older";

      entries.push({
        componentId,
        label: def?.label ?? maquina?.label ?? componentId,
        fileName: meta.fileName,
        ext: meta.ext,
        bytes,
        updatedAt: meta.updatedAt ?? 0,
        localUpdatedAt: loc?.updatedAt ?? null,
        status,
      });
    }
    // Orden: primero los que requieren decisión.
    const rank: Record<ImportStatus, number> = { newer: 0, new: 1, older: 2, unchanged: 3, unknown: 4 };
    entries.sort((a, b) => rank[a.status] - rank[b.status] || a.label.localeCompare(b.label));
    return entries;
  }

  /** Aplica los modelos seleccionados de un análisis previo (conserva su fecha). */
  async applyImport(selected: ImportEntry[]): Promise<void> {
    for (const e of selected) {
      if (e.status === "unknown") continue;
      try {
        await this.store(e.componentId, e.fileName, e.ext, e.bytes.slice().buffer, e.updatedAt);
      } catch (err) {
        console.warn(`No se pudo importar el modelo de "${e.componentId}":`, err);
      }
    }
    if (selected.length) this.emit();
  }
}

/** Hash rápido no criptográfico (FNV-1a 32 bits) para detectar cambios. */
function hashU8(u8: Uint8Array): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < u8.length; i++) {
    h ^= u8[i];
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Singleton compartido. */
export const componentModels = new ComponentModelManager();
