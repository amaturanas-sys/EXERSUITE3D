import * as THREE from "three";
import type {
  ComponentCategory,
  PhysicalAttributes,
  PrimitiveParams,
  StackInfo,
} from "./types";
import { buildGeometry } from "./geometryFactory";
import { applyMaterial, buildMaterial } from "./materials";

let nextId = 1;

/**
 * Objeto de la escena de EXERSUITE3D: envuelve un THREE.Mesh y le adjunta
 * metadatos del componente, parametros dimensionales (cm) y atributos fisicos.
 */
export class SceneObject {
  readonly id: string;
  name: string;
  componentId: string;
  category: ComponentCategory;
  materialId: string;
  params: PrimitiveParams;
  physics: PhysicalAttributes;
  /** Pila selectorizada (solo en componentes tipo stack). */
  stack?: StackInfo;
  /** True si la geometria proviene de un modelo importado (no parametrica). */
  imported = false;
  /** True si un modelo 3D personalizado sustituye a la primitiva del componente. */
  customModel = false;
  readonly mesh: THREE.Mesh;

  constructor(opts: {
    name: string;
    componentId: string;
    category: ComponentCategory;
    params: PrimitiveParams;
    physics: PhysicalAttributes;
    materialId: string;
    stack?: StackInfo;
    importedGeometry?: THREE.BufferGeometry;
  }) {
    this.id = `obj_${nextId++}`;
    this.name = opts.name;
    this.componentId = opts.componentId;
    this.category = opts.category;
    this.materialId = opts.materialId;
    this.params = { ...opts.params };
    this.physics = { ...opts.physics };
    this.stack = opts.stack ? { ...opts.stack } : undefined;

    this.imported = !!opts.importedGeometry;
    const geometry = opts.importedGeometry ?? buildGeometry(this.params);
    const material = buildMaterial(this.materialId);
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.userData.sceneObjectId = this.id;
    this.mesh.name = this.name;

    if (this.stack) this.rebuildStackVisual();
  }

  /** Partes visuales de la pila (placas/varillas/tubo) para animarlas. */
  private stackParts: { mesh: THREE.Mesh; restY: number; carriage: boolean }[] = [];

  getStackParts(): { mesh: THREE.Mesh; restY: number; carriage: boolean }[] {
    return this.stackParts;
  }

  /** Reconstruye la geometria tras cambiar `params`. */
  rebuildGeometry(): void {
    // La geometria importada o de modelo personalizado no es parametrica.
    if (this.imported || this.customModel) return;
    const old = this.mesh.geometry;
    this.mesh.geometry = buildGeometry(this.params);
    old.dispose();
    if (this.stack) this.rebuildStackVisual();
  }

  /**
   * Sustituye la geometria por la de un modelo 3D personalizado (ya horneada:
   * escalada a cm y centrada en el origen como una primitiva).
   */
  applyCustomGeometry(geometry: THREE.BufferGeometry): void {
    const old = this.mesh.geometry;
    this.mesh.geometry = geometry;
    old.dispose();
    this.mesh.scale.set(1, 1, 1);
    this.customModel = true;
    // Las placas/varillas/pin de la pila se dimensionan con el bbox de la
    // geometria: hay que reconstruirlas con la nueva.
    if (this.stack) this.rebuildStackVisual();
  }

  /** Vuelve a la primitiva parametrica del componente. */
  revertToPrimitive(): void {
    if (!this.customModel) return;
    this.customModel = false;
    const old = this.mesh.geometry;
    this.mesh.geometry = buildGeometry(this.params);
    old.dispose();
    if (this.stack) this.rebuildStackVisual();
  }

  /**
   * Construye las placas individuales, las varillas-guia y el tubo selector como
   * hijos de la caja envolvente (que se vuelve invisible pero sigue sirviendo
   * para seleccion/colision/snap). El "carriage" = tubo + placas seleccionadas
   * (las de arriba); el resto y las varillas son estaticas.
   */
  rebuildStackVisual(): void {
    if (!this.stack) return;
    for (const p of this.stackParts) {
      this.mesh.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    }
    this.stackParts = [];

    const env = this.mesh.material as THREE.MeshStandardMaterial;
    env.transparent = true;
    env.opacity = 0;
    env.depthWrite = false;

    const geo = this.mesh.geometry;
    geo.computeBoundingBox();
    const bb = geo.boundingBox!;
    const W = bb.max.x - bb.min.x;
    const H = bb.max.y - bb.min.y;
    const D = bb.max.z - bb.min.z;
    const P = Math.max(1, Math.round(this.stack.plateCount));
    const SEL = Math.max(0, Math.min(Math.round(this.stack.selected), P));
    const plateH = (H / P) * 0.82;

    const add = (mesh: THREE.Mesh, restY: number, carriage: boolean) => {
      mesh.position.y = restY;
      mesh.userData.sceneObjectId = this.id;
      this.mesh.add(mesh);
      this.stackParts.push({ mesh, restY, carriage });
    };

    // Placas (de abajo a arriba). Las SEL de arriba forman el carriage.
    for (let i = 0; i < P; i++) {
      const y = -H / 2 + (i + 0.5) * (H / P);
      const m = new THREE.Mesh(new THREE.BoxGeometry(W, plateH, D), buildMaterial(this.materialId));
      add(m, y, i >= P - SEL);
    }
    // Varillas guia (estaticas).
    for (const sx of [-(W / 2 + 1.5), W / 2 + 1.5]) {
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, H, 12), buildMaterial("cromo"));
      r.position.x = sx;
      add(r, 0, false);
    }
    // Tubo selector (carriage).
    add(new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, H, 12), buildMaterial("acero")), 0, true);
    // Pin del selector (rojo), a la altura de la placa seleccionada mas baja.
    if (SEL > 0 && SEL < P) {
      const yPin = -H / 2 + (P - SEL + 0.5) * (H / P);
      const pin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, D + 4, 8),
        new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.3, roughness: 0.5 }),
      );
      pin.rotation.x = Math.PI / 2;
      pin.position.x = W / 2 - 1;
      add(pin, yPin, true);
    }
  }

  get color(): number {
    return (this.mesh.material as THREE.MeshStandardMaterial).color.getHex();
  }

  /** Cambia el material PBR aplicando un preset por id. */
  setMaterial(id: string): void {
    this.materialId = id;
    if (this.stack) {
      this.rebuildStackVisual(); // recolorea las placas
    } else {
      applyMaterial(this.mesh.material as THREE.MeshStandardMaterial, id);
    }
  }

  /** Masa que realmente se mueve (kg): si es pila, las placas seleccionadas. */
  effectiveMassKg(): number {
    if (this.stack) {
      const sel = Math.max(0, Math.min(this.stack.selected, this.stack.plateCount));
      return sel * this.stack.plateMassKg;
    }
    return this.physics.massKg;
  }

  /** Dimensiones efectivas en cm (bounding box mundial * escala del mesh). */
  effectiveSize(): THREE.Vector3 {
    const box = new THREE.Box3().setFromObject(this.mesh);
    const size = new THREE.Vector3();
    box.getSize(size);
    return size;
  }

  /** Dimensiones locales en cm (bbox de la geometria * escala, sin rotacion). */
  localSize(): THREE.Vector3 {
    const geo = this.mesh.geometry;
    geo.computeBoundingBox();
    const size = new THREE.Vector3();
    geo.boundingBox!.getSize(size);
    return size.multiply(this.mesh.scale);
  }

  dispose(): void {
    for (const p of this.stackParts) {
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    }
    // Ayudas de aristas del modo Ver (si están activas).
    for (const ch of [...this.mesh.children]) {
      if (ch.userData.edgesHelper) {
        const l = ch as THREE.LineSegments;
        l.geometry.dispose();
        (l.material as THREE.Material).dispose();
      }
    }
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
