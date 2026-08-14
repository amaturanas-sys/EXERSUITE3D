import * as THREE from "three";
import { SEGMENT_DEFS } from "../objects/humanFigure";
import { bakeComponentGeometry, firstTexturedMaterial, loadModelRoot } from "./modelLoading";
import {
  deleteSegment,
  getAllSegments,
  putSegment,
} from "./figureSegmentStore";

/**
 * Gestor de modelos 3D de los segmentos del maniquí (cabeza, torso, brazos…),
 * para reemplazar sus partes por versiones más estéticas desde ajustes. Guarda
 * la geometría fusionada y escalada a cm (centrada); el rig la ajusta a cada
 * hueco al construir la figura.
 */
const VALID = new Set(SEGMENT_DEFS.map((s) => s.id));

class FigureSegmentManager {
  private models = new Map<string, THREE.BufferGeometry>();
  // La piel del segmento, cuando el modelo trae textura (un escaneo la trae).
  private skins = new Map<string, THREE.Material>();
  private info = new Map<string, { fileName: string; updatedAt: number }>();
  private listeners = new Set<() => void>();
  private loaded: Promise<void> | null = null;

  onChanged(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private emit(): void {
    for (const fn of this.listeners) fn();
  }

  has(segmentId: string): boolean {
    return this.models.has(segmentId);
  }
  fileName(segmentId: string): string | null {
    return this.info.get(segmentId)?.fileName ?? null;
  }
  /** Clon de la geometría del segmento (o null). Lo usa el rig como proveedor. */
  geometryClone(segmentId: string): THREE.BufferGeometry | null {
    return this.models.get(segmentId)?.clone() ?? null;
  }
  /**
   * Clon de la piel del segmento (o null si el modelo no traía textura).
   *
   * Va clonada porque cada figura del proyecto es independiente: al quitar una,
   * `disposeHumanFigure` libera sus materiales, y compartir el original dejaría
   * a las demás sin textura.
   */
  materialClone(segmentId: string): THREE.Material | null {
    return this.skins.get(segmentId)?.clone() ?? null;
  }

  private set(
    segmentId: string,
    geo: THREE.BufferGeometry,
    piel: THREE.Material | null,
    fileName: string,
    updatedAt: number,
  ): void {
    const prev = this.models.get(segmentId);
    const prevPiel = this.skins.get(segmentId);
    this.models.set(segmentId, geo);
    if (piel) this.skins.set(segmentId, piel);
    else this.skins.delete(segmentId);
    this.info.set(segmentId, { fileName, updatedAt });
    if (prev && prev !== geo) prev.dispose();
    if (prevPiel && prevPiel !== piel) prevPiel.dispose();
  }

  private async bake(
    bytes: ArrayBuffer,
    ext: string,
  ): Promise<{ geo: THREE.BufferGeometry; piel: THREE.Material | null }> {
    const root = await loadModelRoot(bytes, ext);
    return { geo: bakeComponentGeometry(root), piel: firstTexturedMaterial(root) };
  }

  async setUserModel(segmentId: string, file: File): Promise<void> {
    if (!VALID.has(segmentId)) throw new Error(`Segmento desconocido: ${segmentId}`);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const bytes = await file.arrayBuffer();
    const updatedAt = Date.now();
    const { geo, piel } = await this.bake(bytes, ext);
    this.set(segmentId, geo, piel, file.name, updatedAt);
    await putSegment({ segmentId, fileName: file.name, ext, bytes, updatedAt });
    this.emit();
  }

  async clearUserModel(segmentId: string): Promise<void> {
    await deleteSegment(segmentId);
    const geo = this.models.get(segmentId);
    const piel = this.skins.get(segmentId);
    this.models.delete(segmentId);
    this.skins.delete(segmentId);
    this.info.delete(segmentId);
    geo?.dispose();
    piel?.dispose();
    this.emit();
  }

  ensureLoaded(): Promise<void> {
    if (!this.loaded) {
      this.loaded = (async () => {
        let stored;
        try {
          stored = await getAllSegments();
        } catch {
          return;
        }
        for (const s of stored) {
          if (!VALID.has(s.segmentId)) continue;
          try {
            const { geo, piel } = await this.bake(s.bytes, s.ext);
            this.set(s.segmentId, geo, piel, s.fileName, s.updatedAt ?? 0);
          } catch (e) {
            console.warn("Segmento no válido:", s.segmentId, e);
          }
        }
        if (this.models.size) this.emit();
      })();
    }
    return this.loaded;
  }

  /** Proveedores para buildHumanFigure. */
  provider = (segmentId: string): THREE.BufferGeometry | null => this.geometryClone(segmentId);
  skinProvider = (segmentId: string): THREE.Material | null => this.materialClone(segmentId);
}

export const figureSegments = new FigureSegmentManager();
