import * as THREE from "three";

// IK analitica de 2 huesos (hombro + codo) para que la muneca alcance un punto.
// Los huesos del rig descansan a lo largo de -Y local. Resolvemos la posicion
// del codo por la ley de cosenos y orientamos cada hueso hacia su objetivo.

const REST = new THREE.Vector3(0, -1, 0);
// Tendencia de flexion del codo: hacia abajo y ligeramente atras.
const POLE = new THREE.Vector3(0, -1, -0.25);

/** Orienta `joint` para que su eje -Y mundial apunte a `worldDir` (normalizado). */
function setBoneWorldDir(joint: THREE.Object3D, worldDir: THREE.Vector3): void {
  const parent = joint.parent;
  if (!parent) return;
  const pq = parent.getWorldQuaternion(new THREE.Quaternion());
  const qWorld = new THREE.Quaternion().setFromUnitVectors(REST, worldDir);
  joint.quaternion.copy(pq.invert().multiply(qWorld));
}

/**
 * Resuelve la IK del brazo: hombro->codo->muneca para alcanzar `target` (mundo).
 * `root` es la figura (para refrescar matrices). Modifica las rotaciones locales
 * de `shoulder` y `elbow`.
 */
export function solveTwoBoneIK(
  shoulder: THREE.Object3D,
  elbow: THREE.Object3D,
  wrist: THREE.Object3D,
  target: THREE.Vector3,
  root: THREE.Object3D,
): void {
  root.updateMatrixWorld(true);
  const S = shoulder.getWorldPosition(new THREE.Vector3());
  const E = elbow.getWorldPosition(new THREE.Vector3());
  const W = wrist.getWorldPosition(new THREE.Vector3());
  const L1 = S.distanceTo(E);
  const L2 = E.distanceTo(W);
  if (L1 < 1e-4 || L2 < 1e-4) return;

  const toT = target.clone().sub(S);
  const dir = toT.lengthSq() > 1e-8 ? toT.clone().normalize() : new THREE.Vector3(0, -1, 0);
  const d = THREE.MathUtils.clamp(toT.length(), Math.abs(L1 - L2) + 0.001, L1 + L2 - 0.001);
  const Tc = S.clone().add(dir.clone().multiplyScalar(d));

  // Ley de cosenos: proyeccion del codo sobre S->Tc y su altura.
  const a = (L1 * L1 + d * d - L2 * L2) / (2 * d);
  const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));

  // Direccion de flexion (perpendicular a dir, hacia el pole).
  let bend = POLE.clone().sub(dir.clone().multiplyScalar(POLE.dot(dir)));
  if (bend.lengthSq() < 1e-6) {
    const alt = new THREE.Vector3(0, 0, -1);
    bend = alt.sub(dir.clone().multiplyScalar(alt.dot(dir)));
  }
  bend.normalize();

  const elbowPos = S.clone().add(dir.clone().multiplyScalar(a)).add(bend.multiplyScalar(h));
  setBoneWorldDir(shoulder, elbowPos.clone().sub(S).normalize());
  root.updateMatrixWorld(true);
  setBoneWorldDir(elbow, Tc.clone().sub(elbowPos).normalize());
  root.updateMatrixWorld(true);
}
