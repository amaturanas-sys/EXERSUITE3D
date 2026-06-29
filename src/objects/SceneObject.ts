import * as THREE from "three";
import type { ComponentCategory, PhysicalAttributes, PrimitiveParams } from "./types";
import { buildGeometry } from "./geometryFactory";

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
  params: PrimitiveParams;
  physics: PhysicalAttributes;
  readonly mesh: THREE.Mesh;

  constructor(opts: {
    name: string;
    componentId: string;
    category: ComponentCategory;
    params: PrimitiveParams;
    physics: PhysicalAttributes;
    color: number;
  }) {
    this.id = `obj_${nextId++}`;
    this.name = opts.name;
    this.componentId = opts.componentId;
    this.category = opts.category;
    this.params = { ...opts.params };
    this.physics = { ...opts.physics };

    const geometry = buildGeometry(this.params);
    const material = new THREE.MeshStandardMaterial({
      color: opts.color,
      metalness: 0.25,
      roughness: 0.6,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.userData.sceneObjectId = this.id;
    this.mesh.name = this.name;
  }

  /** Reconstruye la geometria tras cambiar `params`. */
  rebuildGeometry(): void {
    const old = this.mesh.geometry;
    this.mesh.geometry = buildGeometry(this.params);
    old.dispose();
  }

  get color(): number {
    return (this.mesh.material as THREE.MeshStandardMaterial).color.getHex();
  }

  setColor(hex: number): void {
    (this.mesh.material as THREE.MeshStandardMaterial).color.setHex(hex);
  }

  /** Dimensiones efectivas en cm (bounding box * escala del mesh). */
  effectiveSize(): THREE.Vector3 {
    const box = new THREE.Box3().setFromObject(this.mesh);
    const size = new THREE.Vector3();
    box.getSize(size);
    return size;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
