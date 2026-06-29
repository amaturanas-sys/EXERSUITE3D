import * as THREE from "three";
import type { SceneObject } from "../objects/SceneObject";

// Snapping de ensamblaje: al arrastrar una pieza, si uno de sus puntos de
// anclaje se acerca a un punto de anclaje de otra pieza, encaja (se desplaza
// para que ambos coincidan). Los puntos clave son el centro (eje/articulacion),
// los extremos de los cilindros y los centros de cara de las cajas.

/** Puntos de anclaje en el espacio LOCAL (sin escala) de la geometria. */
export function localSnapPoints(obj: SceneObject): THREE.Vector3[] {
  const geo = obj.mesh.geometry;
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const hx = bb.max.x;
  const hy = bb.max.y;
  const hz = bb.max.z;
  const pts = [new THREE.Vector3(0, 0, 0)]; // centro = eje/articulacion
  switch (obj.params.kind) {
    case "cylinder":
    case "cone":
      pts.push(new THREE.Vector3(0, hy, 0), new THREE.Vector3(0, -hy, 0));
      break;
    case "box":
    case "plane":
      pts.push(
        new THREE.Vector3(hx, 0, 0),
        new THREE.Vector3(-hx, 0, 0),
        new THREE.Vector3(0, hy, 0),
        new THREE.Vector3(0, -hy, 0),
        new THREE.Vector3(0, 0, hz),
        new THREE.Vector3(0, 0, -hz),
      );
      break;
    // sphere / torus: solo el centro
  }
  return pts;
}

export interface SnapResult {
  delta: THREE.Vector3;
  target: THREE.Vector3;
}

export class SnapManager {
  enabled = true;
  threshold = 10; // cm
  private indicator: THREE.Mesh;

  constructor(scene: THREE.Scene) {
    this.indicator = new THREE.Mesh(
      new THREE.SphereGeometry(2.5, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, depthTest: false, transparent: true, opacity: 0.9 }),
    );
    this.indicator.visible = false;
    this.indicator.renderOrder = 1000;
    scene.add(this.indicator);
  }

  /** Busca el mejor emparejamiento de puntos de anclaje dentro del umbral. */
  computeSnap(moving: SceneObject, others: SceneObject[]): SnapResult | null {
    if (!this.enabled) return null;
    moving.mesh.updateMatrixWorld(true);
    const movWorld = localSnapPoints(moving).map((p) =>
      p.clone().applyMatrix4(moving.mesh.matrixWorld),
    );

    let best: { d: number; mp: THREE.Vector3; tp: THREE.Vector3 } | null = null;
    for (const o of others) {
      o.mesh.updateMatrixWorld(true);
      const tgts = localSnapPoints(o).map((p) => p.clone().applyMatrix4(o.mesh.matrixWorld));
      for (const mp of movWorld) {
        for (const tp of tgts) {
          const d = mp.distanceTo(tp);
          if (d < this.threshold && (!best || d < best.d)) best = { d, mp, tp };
        }
      }
    }
    if (!best) return null;
    return { delta: best.tp.clone().sub(best.mp), target: best.tp };
  }

  showIndicator(pos: THREE.Vector3): void {
    this.indicator.position.copy(pos);
    this.indicator.visible = true;
  }

  hideIndicator(): void {
    this.indicator.visible = false;
  }
}
