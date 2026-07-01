import * as THREE from "three";
import { getDefinition } from "../objects/componentLibrary";
import { deleteModel, getAllModels, putModel } from "./modelStore";
import { bakeComponentGeometry, loadModelRoot } from "./modelLoading";

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

  /** Asigna un modelo de usuario a un componente (persistente) y notifica. */
  async setUserModel(componentId: string, file: File): Promise<void> {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const bytes = await file.arrayBuffer();
    const geo = await this.bake(bytes, ext);
    this.setActive(componentId, geo, file.name, "user");
    await putModel({ componentId, fileName: file.name, ext, bytes });
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
      if (!getDefinition(componentId)) {
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
}

/** Singleton compartido. */
export const componentModels = new ComponentModelManager();
