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
 * Modifica las rotaciones locales de `shoulder` y `elbow`.
 *
 * No refresca el arbol completo de la figura: getWorldPosition/Quaternion ya
 * recalculan la cadena de padres del nodo consultado (updateWorldMatrix), que
 * es lo unico que se lee aqui; recorrer toda la figura 3 veces por mano y por
 * frame era el mayor coste por frame con manos apoyadas.
 */
export function solveTwoBoneIK(
  shoulder: THREE.Object3D,
  elbow: THREE.Object3D,
  wrist: THREE.Object3D,
  target: THREE.Vector3,
  /**
   * Hacia dónde se desplaza la articulación del medio al doblar, en MUNDO.
   * El codo cae hacia abajo y algo atrás (valor por omisión); la RODILLA
   * dobla al revés —la rótula va hacia delante—, así que al apoyar un pie hay
   * que pasarle el frente de la figura o la pierna se dobla del revés.
   */
  pole?: THREE.Vector3,
  /**
   * CUÁNTO SOBRESALE EL EFECTOR más allá de la muñeca, en cm. La que agarra es
   * la PALMA, y su centro cuelga del pivote de la muñeca a lo largo del
   * antebrazo. Sumándolo aquí, el hueso de abajo se resuelve como si fuera más
   * largo y lo que aterriza en `target` es la palma, no el pivote.
   *
   * Se hace ASÍ y no corrigiendo a posteriori. La primera versión resolvía,
   * medía el residuo entre el centro del puño y el agarre, y volvía a resolver
   * contra el objetivo corregido. Corregía, pero esto se ejecuta cada fotograma
   * partiendo de donde lo dejó el anterior, y cada pasada usaba un objetivo
   * distinto: cerca de la degeneración —el brazo casi estirado apuntando arriba—
   * dos objetivos separados por centímetros dan soluciones separadas por medio
   * metro, y el brazo saltaba entre ellas sin asentarse jamás. Medido: el hombro
   * alternaba entre −134° y −18° y la mano entre y=180 y y=85. Con el alargue,
   * la solución sale de la geometría en una sola pasada y no depende de dónde
   * estuviera el brazo: la misma entrada da siempre la misma salida.
   */
  alargue = 0,
): void {
  const S = shoulder.getWorldPosition(new THREE.Vector3());
  const E = elbow.getWorldPosition(new THREE.Vector3());
  const W = wrist.getWorldPosition(new THREE.Vector3());
  const L1 = S.distanceTo(E);
  const L2 = E.distanceTo(W) + Math.max(0, alargue);
  if (L1 < 1e-4 || L2 < 1e-4) return;

  const toT = target.clone().sub(S);
  const dir = toT.lengthSq() > 1e-8 ? toT.clone().normalize() : new THREE.Vector3(0, -1, 0);
  const d = THREE.MathUtils.clamp(toT.length(), Math.abs(L1 - L2) + 0.001, L1 + L2 - 0.001);
  const Tc = S.clone().add(dir.clone().multiplyScalar(d));

  // Ley de cosenos: proyeccion del codo sobre S->Tc y su altura.
  const a = (L1 * L1 + d * d - L2 * L2) / (2 * d);
  const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));

  // Direccion de flexion (perpendicular a dir, hacia el pole).
  const polo = pole ?? POLE;
  let bend = polo.clone().sub(dir.clone().multiplyScalar(polo.dot(dir)));
  if (bend.lengthSq() < 1e-6) {
    const alt = new THREE.Vector3(0, 0, -1);
    bend = alt.sub(dir.clone().multiplyScalar(alt.dot(dir)));
  }
  bend.normalize();

  const elbowPos = S.clone().add(dir.clone().multiplyScalar(a)).add(bend.multiplyScalar(h));
  setBoneWorldDir(shoulder, elbowPos.clone().sub(S).normalize());
  // setBoneWorldDir(elbow) consulta el cuaternion mundial de su padre, lo que
  // recalcula la cadena hasta el codo ya con la nueva rotacion del hombro.
  setBoneWorldDir(elbow, Tc.clone().sub(elbowPos).normalize());
}
