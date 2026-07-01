import * as THREE from "three";
import { SEGMENT_DEFS } from "../objects/humanFigure";
import { bakeComponentGeometry, loadModelRoot } from "./modelLoading";
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

  private set(segmentId: string, geo: THREE.BufferGeometry, fileName: string, updatedAt: number): void {
    const prev = this.models.get(segmentId);
    this.models.set(segmentId, geo);
    this.info.set(segmentId, { fileName, updatedAt });
    if (prev && prev !== geo) prev.dispose();
  }

  private async bake(bytes: ArrayBuffer, ext: string): Promise<THREE.BufferGeometry> {
    return bakeComponentGeometry(await loadModelRoot(bytes, ext));
  }

  async setUserModel(segmentId: string, file: File): Promise<void> {
    if (!VALID.has(segmentId)) throw new Error(`Segmento desconocido: ${segmentId}`);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const bytes = await file.arrayBuffer();
    const updatedAt = Date.now();
    this.set(segmentId, await this.bake(bytes, ext), file.name, updatedAt);
    await putSegment({ segmentId, fileName: file.name, ext, bytes, updatedAt });
    this.emit();
  }

  async clearUserModel(segmentId: string): Promise<void> {
    await deleteSegment(segmentId);
    const geo = this.models.get(segmentId);
    this.models.delete(segmentId);
    this.info.delete(segmentId);
    geo?.dispose();
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
            this.set(s.segmentId, await this.bake(s.bytes, s.ext), s.fileName, s.updatedAt ?? 0);
          } catch (e) {
            console.warn("Segmento no válido:", s.segmentId, e);
          }
        }
        if (this.models.size) this.emit();
      })();
    }
    return this.loaded;
  }

  /** Proveedor para buildHumanFigure. */
  provider = (segmentId: string): THREE.BufferGeometry | null => this.geometryClone(segmentId);
}

export const figureSegments = new FigureSegmentManager();
