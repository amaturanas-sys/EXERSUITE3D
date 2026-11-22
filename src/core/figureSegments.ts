import * as THREE from "three";
import { PARENT_JOINT, SEGMENT_DEFS, type PielManiqui } from "../objects/humanFigure";
import { bakeComponentGeometry, firstTexturedMaterial, loadModelRoot } from "./modelLoading";
import {
  deleteSegment,
  getAllSegments,
  putSegment,
} from "./figureSegmentStore";

/**
 * Gestor de modelos 3D de los segmentos del maniquí (cabeza, torso, brazos…).
 *
 * Cada segmento puede venir de dos sitios, con la misma prioridad que en el
 * repertorio de componentes: el modelo **de archivo** que la aplicación trae de
 * serie, y encima el **modelo del usuario**, que lo pisa y se guarda en este
 * navegador. Quitar el del usuario devuelve el de serie.
 *
 * La geometría se guarda fusionada y escalada a cm, pero SIN centrar: los
 * dieciséis segmentos del maniquí de serie están troceados de un mismo cuerpo y
 * sus coordenadas dicen dónde va cada uno respecto a los demás. El rig los monta
 * de una pieza a partir de eso.
 */
const VALID = new Set(SEGMENT_DEFS.map((s) => s.id));
/** Las articulaciones del rig: los huesos que puede traer la piel, además de «raiz». */
const SEGMENT_JOINT_NAMES = Object.keys(PARENT_JOINT);

type Fuente = "file" | "user";

interface Piel {
  geo: THREE.BufferGeometry;
  piel: THREE.Material | null;
  fileName: string;
}

class FigureSegmentManager {
  private models = new Map<string, THREE.BufferGeometry>();
  // La piel del segmento, cuando el modelo trae textura (un escaneo la trae).
  private skins = new Map<string, THREE.Material>();
  private info = new Map<string, { fileName: string; updatedAt: number; source: Fuente }>();
  private fileModels = new Map<string, Piel>();
  // Dónde articula el cuerpo de serie, tal como lo declara su manifiesto.
  private juntas: Record<string, [number, number, number]> | null = null;
  // La PIEL del cuerpo de serie (v0.4.14): la malla con skinning que se ve
  // encima de los segmentos. Ver `vestirConPiel` en humanFigure.ts.
  private piel: { geo: THREE.BufferGeometry; huesos: string[] } | null = null;
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
  /** De dónde sale el modelo activo: de serie o del usuario. */
  source(segmentId: string): Fuente | null {
    return this.info.get(segmentId)?.source ?? null;
  }
  /** Si la aplicación trae un modelo de serie para este segmento. */
  hasFileModel(segmentId: string): boolean {
    return this.fileModels.has(segmentId);
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

  private setActive(
    segmentId: string,
    geo: THREE.BufferGeometry,
    piel: THREE.Material | null,
    fileName: string,
    updatedAt: number,
    source: Fuente,
  ): void {
    const prev = this.models.get(segmentId);
    const prevPiel = this.skins.get(segmentId);
    const deSerie = this.fileModels.get(segmentId);
    this.models.set(segmentId, geo);
    if (piel) this.skins.set(segmentId, piel);
    else this.skins.delete(segmentId);
    this.info.set(segmentId, { fileName, updatedAt, source });
    // Nunca liberar lo que viene de serie: es el respaldo al que se vuelve.
    if (prev && prev !== geo && prev !== deSerie?.geo) prev.dispose();
    if (prevPiel && prevPiel !== piel && prevPiel !== deSerie?.piel) prevPiel.dispose();
  }

  private async bake(
    bytes: ArrayBuffer,
    ext: string,
  ): Promise<{ geo: THREE.BufferGeometry; piel: THREE.Material | null }> {
    // Sin centrar: si los 16 vienen troceados de un mismo cuerpo, sus
    // coordenadas dicen dónde va cada uno y el rig los monta de una pieza.
    const root = await loadModelRoot(bytes, ext);
    return { geo: bakeComponentGeometry(root, false), piel: firstTexturedMaterial(root) };
  }

  async setUserModel(segmentId: string, file: File): Promise<void> {
    if (!VALID.has(segmentId)) throw new Error(`Segmento desconocido: ${segmentId}`);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const bytes = await file.arrayBuffer();
    const updatedAt = Date.now();
    const { geo, piel } = await this.bake(bytes, ext);
    this.setActive(segmentId, geo, piel, file.name, updatedAt, "user");
    await putSegment({ segmentId, fileName: file.name, ext, bytes, updatedAt });
    this.emit();
  }

  /** Quita el modelo del usuario; vuelve al de serie si lo hay, o a la primitiva. */
  async clearUserModel(segmentId: string): Promise<void> {
    await deleteSegment(segmentId);
    const deSerie = this.fileModels.get(segmentId);
    if (deSerie) {
      this.setActive(segmentId, deSerie.geo, deSerie.piel, deSerie.fileName, 0, "file");
    } else {
      const geo = this.models.get(segmentId);
      const piel = this.skins.get(segmentId);
      this.models.delete(segmentId);
      this.skins.delete(segmentId);
      this.info.delete(segmentId);
      geo?.dispose();
      piel?.dispose();
    }
    this.emit();
  }

  /** El maniquí que la aplicación trae de serie, desde public/models/maniqui. */
  private async loadFileModels(): Promise<void> {
    const base = import.meta.env.BASE_URL;
    let manifest: Record<string, unknown>;
    try {
      const res = await fetch(`${base}models/maniqui/manifest.json`, { cache: "no-store" });
      if (!res.ok) return;
      manifest = await res.json();
    } catch {
      return;
    }
    // El maniquí de serie declara además DÓNDE ARTICULA. Sin eso el rig gira
    // sobre los pivotes de sus primitivas de cilindros, que no son los de un
    // cuerpo: se le iban entre 2,3 y 10,1 cm. La clave "juntas" no es un
    // segmento, así que el bucle de abajo la descarta sola.
    const juntas = (manifest as { juntas?: unknown }).juntas;
    if (juntas && typeof juntas === "object") {
      const leidas: Record<string, [number, number, number]> = {};
      for (const [nombre, v] of Object.entries(juntas as Record<string, unknown>)) {
        if (Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === "number")) {
          leidas[nombre] = [v[0], v[1], v[2]];
        }
      }
      if (Object.keys(leidas).length) this.juntas = leidas;
    }
    // La piel va en paralelo con los segmentos: es una descarga más.
    const pielBajada = this.bajarPiel(base, (manifest as { piel?: unknown }).piel);
    // Las 16 descargas, a la vez. En serie son 16 idas y vueltas encadenadas y
    // esto corre en el arranque, con el usuario esperando; el horneado sí va
    // uno detrás de otro, que es CPU y solaparlo no gana nada.
    const bajados = await Promise.all(
      Object.entries(manifest).map(async ([segmentId, value]) => {
        const fileName = typeof value === "string" ? value.trim() : "";
        if (!fileName || !VALID.has(segmentId)) return null;
        try {
          const res = await fetch(`${base}models/maniqui/${fileName}`, { cache: "no-store" });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return { segmentId, fileName, bytes: await res.arrayBuffer() };
        } catch (e) {
          console.warn(`Maniquí de serie: no se pudo bajar "${segmentId}" (${fileName}):`, e);
          return null;
        }
      }),
    );
    for (const b of bajados) {
      if (!b) continue;
      try {
        const ext = b.fileName.split(".").pop()?.toLowerCase() ?? "";
        const { geo, piel } = await this.bake(b.bytes, ext);
        this.fileModels.set(b.segmentId, { geo, piel, fileName: b.fileName });
        if (this.info.get(b.segmentId)?.source !== "user") {
          this.setActive(b.segmentId, geo, piel, b.fileName, 0, "file");
        }
      } catch (e) {
        console.warn(`Maniquí de serie: no se pudo hornear "${b.segmentId}":`, e);
      }
    }
    this.piel = await pielBajada;
    if (this.models.size) this.emit();
  }

  /**
   * Baja y lee la piel declarada en el manifiesto. Si falta o no se deja leer,
   * el maniquí se dibuja con sus segmentos rígidos, como antes de tenerla: la
   * piel es lo que se ve, no lo que se mide, y sin ella no se pierde ninguna
   * medida.
   */
  private async bajarPiel(
    base: string,
    archivo: unknown,
  ): Promise<{ geo: THREE.BufferGeometry; huesos: string[] } | null> {
    if (typeof archivo !== "string" || !archivo.trim()) return null;
    try {
      // Con plazo: los segmentos esperan a la piel para avisar de una sola vez
      // (dos avisos rehacen la figura dos veces, y el segundo le borraría la
      // postura a quien ya la estuviera posando), así que una descarga
      // colgada no puede dejar colgado al maniquí entero.
      const res = await fetch(`${base}models/maniqui/${archivo.trim()}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raiz = await loadModelRoot(await res.arrayBuffer(), "glb");
      let malla: THREE.SkinnedMesh | null = null;
      raiz.traverse((o) => {
        if (!malla && (o as THREE.SkinnedMesh).isSkinnedMesh) malla = o as THREE.SkinnedMesh;
      });
      const m = malla as THREE.SkinnedMesh | null;
      if (!m) throw new Error("no trae malla con esqueleto");
      const huesos = m.skeleton.bones.map((b) => b.name);
      const geo = m.geometry;
      for (const a of ["position", "normal", "skinIndex", "skinWeight"]) {
        if (!geo.getAttribute(a)) throw new Error(`le falta el atributo ${a}`);
      }
      // Un archivo que no cuadra con el rig se rechaza aquí, y el maniquí se
      // dibuja con sus segmentos: mejor eso que una piel que dobla por donde
      // no es. Los huesos tienen que ser articulaciones del rig, y los índices
      // de la piel, huesos que existen.
      const validos = new Set(["raiz", ...SEGMENT_JOINT_NAMES]);
      const ajeno = huesos.find((h) => !validos.has(h));
      if (ajeno) throw new Error(`hueso desconocido «${ajeno}»`);
      const indices = geo.getAttribute("skinIndex");
      for (let i = 0; i < indices.count; i++) {
        for (let k = 0; k < 4; k++) {
          if (indices.getComponent(i, k) >= huesos.length) throw new Error("índice de hueso fuera de rango");
        }
      }
      (m.material as THREE.Material).dispose?.();
      return { geo, huesos };
    } catch (e) {
      console.warn(`Maniquí de serie: no se pudo leer la piel (${String(archivo)}):`, e);
      return null;
    }
  }

  private async loadUserModels(): Promise<void> {
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
        this.setActive(s.segmentId, geo, piel, s.fileName, s.updatedAt ?? 0, "user");
      } catch (e) {
        console.warn("Segmento no válido:", s.segmentId, e);
      }
    }
    if (stored.length) this.emit();
  }

  ensureLoaded(): Promise<void> {
    if (!this.loaded) {
      this.loaded = (async () => {
        await this.loadFileModels();
        await this.loadUserModels();
      })();
    }
    return this.loaded;
  }

  /** Proveedores para buildHumanFigure. */
  provider = (segmentId: string): THREE.BufferGeometry | null => this.geometryClone(segmentId);
  skinProvider = (segmentId: string): THREE.Material | null => this.materialClone(segmentId);
  /**
   * El esqueleto del maniquí de serie. Se entrega mientras el cuerpo de serie
   * esté completo; si el usuario sustituye algún segmento suelto sigue siendo la
   * mejor descripción disponible de dónde articula la figura, y el rig lo
   * descarta él solo cuando no cuadra.
   */
  jointProvider = (): Record<string, [number, number, number]> | null =>
    this.fileModels.size === VALID.size ? this.juntas : null;
  /**
   * La piel, mientras los dieciséis segmentos activos sean los de serie: está
   * hecha de ESE cuerpo, y con un segmento sustituido por el usuario la piel
   * taparía su modelo y doblaría sobre pivotes que ya no son los suyos. En
   * ese caso se dibujan los segmentos, como siempre.
   */
  pielProvider = (): PielManiqui | null => {
    if (!this.piel || !this.jointProvider()) return null;
    for (const id of VALID) if (this.info.get(id)?.source !== "file") return null;
    return { geometry: this.piel.geo.clone(), huesos: [...this.piel.huesos] };
  };
}

export const figureSegments = new FigureSegmentManager();
