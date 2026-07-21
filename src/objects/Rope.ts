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
  private endMat: THREE.Material;
  /** Meshes de los segmentos (separados de los herrajes de anclaje). */
  private segs: THREE.Mesh[] = [];
  /** Herrajes de anclaje: argolla + espárrago de los que cuelga el primer eslabón. */
  private endA: THREE.Group;
  private endB: THREE.Group;

  constructor(opts: { kind: RopeKind; a: RopeEnd; b: RopeEnd; slack?: number; name?: string }) {
    this.id = `rope_${nextId++}`;
    this.kind = opts.kind;
    this.a = opts.a;
    this.b = opts.b;
    this.slack = opts.slack ?? 0.25;
    this.name =
      opts.name ?? (this.kind === "chain" ? "Cadena de seguridad" : "Correa de seguridad");
    this.segMat = buildMaterial(this.kind === "chain" ? "acero-negro" : "kevlar");
    this.endMat = buildMaterial("acero-pulido");
    this.group.userData.ropeId = this.id;
    this.endA = this.buildEndFitting();
    this.endB = this.buildEndFitting();
    this.group.add(this.endA, this.endB);
  }

  /**
   * Herraje de anclaje del extremo: argolla (por la que se enhebra el primer
   * eslabón) + espárrago que la une a la superficie de anclaje. En el espacio
   * local, la argolla queda en el plano XY (eje del toro en Z) y el espárrago
   * sale por +X hacia la pieza anfitriona.
   */
  private buildEndFitting(): THREE.Group {
    const g = new THREE.Group();
    const argolla = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.65, 8, 16), this.endMat);
    const esparrago = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 4.2, 8), this.endMat);
    esparrago.rotation.z = Math.PI / 2;
    esparrago.position.x = 2.2;
    const placa = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.7, 10), this.endMat);
    placa.rotation.z = Math.PI / 2;
    placa.position.x = 4.4;
    for (const m of [argolla, esparrago, placa]) {
      m.castShadow = true;
      m.userData.ropeId = this.id;
      g.add(m);
    }
    g.userData.ropeId = this.id;
    return g;
  }

  /** Orienta un herraje: P punto de anclaje, dirIn dirección HACIA la pieza. */
  private placeEndFitting(g: THREE.Group, P: THREE.Vector3, dirIn: THREE.Vector3): void {
    g.position.copy(P);
    const x = dirIn.clone().normalize();
    const up = new THREE.Vector3(0, 1, 0);
    let z = new THREE.Vector3().crossVectors(x, up);
    if (z.lengthSq() < 1e-4) z = new THREE.Vector3(1, 0, 0).cross(x);
    z.normalize();
    const y = new THREE.Vector3().crossVectors(z, x);
    g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
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
      this.endA.visible = this.endB.visible = false;
      return;
    }

    // La geometría unitaria solo se regenera si la plantilla cambió (el Editor
    // pasa una referencia estable, memoizada por tipo de cuerda).
    if (this.unitGeo === null || this.unitTemplate !== segTemplate) {
      this.unitGeo?.dispose();
      this.unitGeo = this.segmentGeometry(segTemplate, 1);
      this.unitTemplate = segTemplate;
      for (const m of this.segs) m.geometry = this.unitGeo;
    }

    const sag = this.slack * D * 0.45; // profundidad de la catenaria
    const r = sag / D;
    const ropeLen = D * (1 + (8 / 3) * r * r); // long. de arco aprox. de la parábola
    const defLen = this.kind === "chain" ? 5 : 9; // cm por segmento
    const n = Math.max(6, Math.min(140, Math.round(ropeLen / defLen)));
    this.setSegmentCount(n);

    const segLen = ropeLen / n;
    // INTERLOCKING de eslabones: cada eslabón mide 1,5 pasos y alterna 90°
    // sobre el eje de la cadena, de modo que atraviesa al anterior y al
    // siguiente (y los extremos quedan enhebrados en la argolla de anclaje).
    const escala = this.kind === "chain" ? segLen * 1.5 : segLen;
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
      const m = this.segs[i];
      m.position.addVectors(p0, p1).multiplyScalar(0.5);
      m.scale.setScalar(escala);
      m.quaternion.setFromUnitVectors(up, dir.subVectors(p1, p0).normalize());
      if (this.kind === "chain" && i % 2 === 1) m.rotateY(Math.PI / 2);
    }

    // Herrajes de anclaje: la argolla queda EN el punto de anclaje, contiene
    // la dirección de salida de la cadena, y su espárrago apunta hacia la
    // pieza (opuesto a la catenaria).
    this.endA.visible = this.endB.visible = true;
    const tanA = dir.subVectors(B, A).multiplyScalar(1 / D);
    tanA.y -= (4 * sag) / D;
    this.placeEndFitting(this.endA, A, tanA.clone().multiplyScalar(-1));
    const tanB = dir.subVectors(B, A).multiplyScalar(1 / D);
    tanB.y += (4 * sag) / D;
    this.placeEndFitting(this.endB, B, tanB);
  }

  /** Ajusta el pool de meshes al número de segmentos (geometría compartida). */
  private setSegmentCount(n: number): void {
    while (this.segs.length > n) {
      const m = this.segs.pop()!;
      this.group.remove(m);
    }
    while (this.segs.length < n) {
      const m = new THREE.Mesh(this.unitGeo ?? undefined, this.segMat);
      m.castShadow = true;
      m.userData.ropeId = this.id;
      this.segs.push(m);
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
    for (const g of [this.endA, this.endB]) {
      for (const c of g.children) (c as THREE.Mesh).geometry.dispose();
    }
    (this.endMat as THREE.Material).dispose?.();
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
