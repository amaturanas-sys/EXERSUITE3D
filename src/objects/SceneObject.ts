import * as THREE from "three";
import type { ComponentCategory, PhysicalAttributes, PrimitiveParams } from "./types";
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
  readonly mesh: THREE.Mesh;

  constructor(opts: {
    name: string;
    componentId: string;
    category: ComponentCategory;
    params: PrimitiveParams;
    physics: PhysicalAttributes;
    materialId: string;
  }) {
    this.id = `obj_${nextId++}`;
    this.name = opts.name;
    this.componentId = opts.componentId;
    this.category = opts.category;
    this.materialId = opts.materialId;
    this.params = { ...opts.params };
    this.physics = { ...opts.physics };

    const geometry = buildGeometry(this.params);
    const material = buildMaterial(this.materialId);
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

  /** Cambia el material PBR aplicando un preset por id. */
  setMaterial(id: string): void {
    this.materialId = id;
    applyMaterial(this.mesh.material as THREE.MeshStandardMaterial, id);
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
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
