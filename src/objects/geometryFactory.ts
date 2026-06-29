import * as THREE from "three";
import type { PrimitiveParams } from "./types";

// Construye una BufferGeometry a partir de parametros en centimetros.
// 1 unidad de mundo == 1 cm, asi que los valores se usan directamente.
export function buildGeometry(p: PrimitiveParams): THREE.BufferGeometry {
  const seg = p.radialSegments ?? 32;
  switch (p.kind) {
    case "box":
      return new THREE.BoxGeometry(p.width ?? 10, p.height ?? 10, p.depth ?? 10);
    case "cylinder":
      return new THREE.CylinderGeometry(
        p.radiusTop ?? 5,
        p.radiusBottom ?? 5,
        p.height ?? 10,
        seg,
      );
    case "cone":
      return new THREE.ConeGeometry(p.radiusBottom ?? 5, p.height ?? 10, seg);
    case "sphere":
      return new THREE.SphereGeometry(p.radius ?? 5, seg, Math.max(8, seg / 2));
    case "torus":
      return new THREE.TorusGeometry(p.radius ?? 8, p.tubeRadius ?? 1.5, 16, seg);
    case "plane":
      return new THREE.PlaneGeometry(p.width ?? 10, p.depth ?? 10);
    default:
      return new THREE.BoxGeometry(10, 10, 10);
  }
}

/** Devuelve las dimensiones del bounding box (cm) de una geometria. */
export function geometrySize(geo: THREE.BufferGeometry): THREE.Vector3 {
  geo.computeBoundingBox();
  const size = new THREE.Vector3();
  geo.boundingBox!.getSize(size);
  return size;
}
