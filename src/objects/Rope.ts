import * as THREE from "three";
import { buildMaterial } from "./materials";

export type RopeKind = "chain" | "strap";

/** Extremo de la cuerda: anclado a una pieza (objectId + punto local) o libre. */
export interface RopeEnd {
  objectId: string | null;
  local: THREE.Vector3; // si objectId es null, es un punto de mundo
}

let nextId = 1;

/**
 * Elemento tipo cuerda (cadena o correa de seguridad): se ancla en dos extremos
 * y cuelga entre ellos describiendo una catenaria (parábola) según su holgura.
 * Se dibuja como una cadena de segmentos articulados; la forma del segmento
 * puede provenir de la biblioteca (eslabón / listón de Kevlar).
 */
export class Rope {
  readonly id: string;
  name: string;
  kind: RopeKind;
  a: RopeEnd;
  b: RopeEnd;
  /** Holgura 0..1 (0 = tensa/recta; 1 = mucha catenaria). */
  slack: number;
  readonly group = new THREE.Group();
  private segMat: THREE.Material;

  constructor(opts: { kind: RopeKind; a: RopeEnd; b: RopeEnd; slack?: number; name?: string }) {
    this.id = `rope_${nextId++}`;
    this.kind = opts.kind;
    this.a = opts.a;
    this.b = opts.b;
    this.slack = opts.slack ?? 0.25;
    this.name =
      opts.name ?? (this.kind === "chain" ? "Cadena de seguridad" : "Correa de seguridad");
    this.segMat = buildMaterial(this.kind === "chain" ? "acero-negro" : "kevlar");
    this.group.userData.ropeId = this.id;
  }

  /** Geometría unitaria (longitud 1) COMPARTIDA por todos los segmentos. */
  private unitGeo: THREE.BufferGeometry | null = null;
  /** Plantilla con la que se construyó unitGeo (para detectar cambios). */
  private unitTemplate: THREE.BufferGeometry | null | undefined = undefined;

  /**
   * Reconstruye los segmentos entre los puntos de mundo A y B. Los meshes se
   * REUTILIZAN (pool) y todos comparten una geometría unitaria escalada por
   * mesh: reconstruir al arrastrar/tensar/simular no clona geometrías ni las
   * sube a GPU (solo al cambiar la plantilla del segmento en la biblioteca).
   */
  rebuild(A: THREE.Vector3, B: THREE.Vector3, segTemplate: THREE.BufferGeometry | null): void {
    const D = A.distanceTo(B);
    if (D < 0.01) {
      this.setSegmentCount(0);
      return;
    }

    // La geometría unitaria solo se regenera si la plantilla cambió (el Editor
    // pasa una referencia estable, memoizada por tipo de cuerda).
    if (this.unitGeo === null || this.unitTemplate !== segTemplate) {
      this.unitGeo?.dispose();
      this.unitGeo = this.segmentGeometry(segTemplate, 1);
      this.unitTemplate = segTemplate;
      for (const c of this.group.children) (c as THREE.Mesh).geometry = this.unitGeo;
    }

    const sag = this.slack * D * 0.45; // profundidad de la catenaria
    const r = sag / D;
    const ropeLen = D * (1 + (8 / 3) * r * r); // long. de arco aprox. de la parábola
    const defLen = this.kind === "chain" ? 5 : 9; // cm por segmento
    const n = Math.max(6, Math.min(140, Math.round(ropeLen / defLen)));
    this.setSegmentCount(n);

    const segLen = ropeLen / n;
    const up = new THREE.Vector3(0, 1, 0);
    const p0 = new THREE.Vector3();
    const p1 = new THREE.Vector3();
    const dir = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const t0 = i / n;
      const t1 = (i + 1) / n;
      p0.lerpVectors(A, B, t0);
      p0.y -= 4 * sag * t0 * (1 - t0); // parábola: máxima caída al centro
      p1.lerpVectors(A, B, t1);
      p1.y -= 4 * sag * t1 * (1 - t1);
      const m = this.group.children[i] as THREE.Mesh;
      m.position.addVectors(p0, p1).multiplyScalar(0.5);
      m.scale.setScalar(segLen);
      m.quaternion.setFromUnitVectors(up, dir.subVectors(p1, p0).normalize());
      // Cadena por defecto: alterna 90° para simular eslabones entrelazados.
      if (!segTemplate && this.kind === "chain" && i % 2 === 1) m.rotateY(Math.PI / 2);
    }
  }

  /** Ajusta el pool de meshes al número de segmentos (geometría compartida). */
  private setSegmentCount(n: number): void {
    while (this.group.children.length > n) {
      this.group.remove(this.group.children[this.group.children.length - 1]);
    }
    while (this.group.children.length < n) {
      const m = new THREE.Mesh(this.unitGeo ?? undefined, this.segMat);
      m.castShadow = true;
      m.userData.ropeId = this.id;
      this.group.add(m);
    }
  }

  /** Geometría de un segmento (modelo de biblioteca ajustado, o forma por defecto). */
  private segmentGeometry(template: THREE.BufferGeometry | null, len: number): THREE.BufferGeometry {
    if (template) return fitToLength(template.clone(), len);
    if (this.kind === "chain") {
      // Eslabón por defecto: aro metálico.
      return new THREE.TorusGeometry(len * 0.36, len * 0.13, 6, 12);
    }
    // Listón por defecto: segmento plano y ancho.
    return new THREE.BoxGeometry(len * 0.9, len, len * 0.14);
  }

  dispose(): void {
    // Los segmentos comparten unitGeo: un único dispose.
    this.unitGeo?.dispose();
    this.unitGeo = null;
    (this.segMat as THREE.Material).dispose?.();
  }
}

/** Escala una geometría para que su eje más largo mida `len` y lo alinea con +Y. */
function fitToLength(geo: THREE.BufferGeometry, len: number): THREE.BufferGeometry {
  geo.computeBoundingBox();
  const s = new THREE.Vector3();
  geo.boundingBox!.getSize(s);
  const longest = Math.max(s.x, s.y, s.z) || 1;
  geo.applyMatrix4(new THREE.Matrix4().makeScale(len / longest, len / longest, len / longest));
  geo.computeBoundingBox();
  geo.boundingBox!.getSize(s);
  // Orienta el eje más largo hacia Y.
  if (s.x >= s.y && s.x >= s.z) geo.applyMatrix4(new THREE.Matrix4().makeRotationZ(Math.PI / 2));
  else if (s.z >= s.y && s.z >= s.x) geo.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
  geo.computeBoundingBox();
  const c = new THREE.Vector3();
  geo.boundingBox!.getCenter(c);
  geo.applyMatrix4(new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z));
  geo.computeBoundingSphere();
  return geo;
}
