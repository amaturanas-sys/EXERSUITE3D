import * as THREE from "three";
import { degToRad } from "../core/units";

// Figura humana de referencia POSABLE (rig articulado). Cada articulacion es un
// pivote (Object3D); rotarlo mueve toda la cadena del miembro. Las mallas llevan
// `jointName` para saber que articulacion controlar al hacer clic. Incluye
// posturas estandar que luego se ajustan a mano.
//
// El grupo raiz expone en userData:
//   isHumanFigure: true
//   joints: Record<string, Object3D>   (pivotes articulables)
//   applyPose(name): aplica una postura
//   reset(): vuelve a "De pie"

export const DEFAULT_HUMAN_HEIGHT = 175;

export const POSE_NAMES = ["De pie", "Sentadilla", "Sentado", "Remo", "Press"] as const;
export type PoseName = (typeof POSE_NAMES)[number];

// Angulos por articulacion en grados [x,y,z]. x = flexion sagital.
// Convencion: los miembros cuelgan en -Y; rotacion X NEGATIVA los lleva hacia
// DELANTE (+Z, frente de la figura) y POSITIVA hacia atras. La columna se
// extiende en +Y, asi que en ella X positiva inclina el torso hacia delante.
const POSES: Record<PoseName, Record<string, [number, number, number]>> = {
  "De pie": {},
  Sentadilla: {
    hipL: [-70, 0, 0], hipR: [-70, 0, 0],
    kneeL: [110, 0, 0], kneeR: [110, 0, 0],
    ankleL: [-30, 0, 0], ankleR: [-30, 0, 0],
    spine: [25, 0, 0],
    shoulderL: [-70, 0, 0], shoulderR: [-70, 0, 0],
  },
  Sentado: {
    hipL: [-85, 0, 0], hipR: [-85, 0, 0],
    kneeL: [95, 0, 0], kneeR: [95, 0, 0],
    shoulderL: [-20, 0, 0], shoulderR: [-20, 0, 0],
    elbowL: [55, 0, 0], elbowR: [55, 0, 0],
  },
  Remo: {
    spine: [35, 0, 0],
    hipL: [-15, 0, 0], hipR: [-15, 0, 0],
    kneeL: [25, 0, 0], kneeR: [25, 0, 0],
    shoulderL: [20, 0, 0], shoulderR: [20, 0, 0],
    elbowL: [105, 0, 0], elbowR: [105, 0, 0],
  },
  Press: {
    shoulderL: [-165, 0, 0], shoulderR: [-165, 0, 0],
    elbowL: [-10, 0, 0], elbowR: [-10, 0, 0],
  },
};

function mat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: 0x2f7dd1, metalness: 0.0, roughness: 0.6 });
}

export function buildHumanFigure(heightCm: number): THREE.Group {
  const H = heightCm;
  const joints: Record<string, THREE.Object3D> = {};

  const cyl = (len: number, r: number, jointName: string) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 14), mat());
    m.position.y = -len / 2;
    m.castShadow = true;
    m.userData.humanFigurePart = true;
    m.userData.jointName = jointName;
    return m;
  };
  const box = (w: number, h: number, d: number, jointName: string) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat());
    m.castShadow = true;
    m.userData.humanFigurePart = true;
    m.userData.jointName = jointName;
    return m;
  };
  const ball = (r: number, jointName: string) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), mat());
    m.castShadow = true;
    m.userData.humanFigurePart = true;
    m.userData.jointName = jointName;
    return m;
  };
  const pivot = (name: string, parent: THREE.Object3D, x: number, y: number, z: number) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    joints[name] = g;
    return g;
  };

  const root = new THREE.Group();

  // Pelvis (raiz). jointName "" = mover toda la figura.
  const pelvis = box(0.2 * H, 0.1 * H, 0.13 * H, "");
  root.add(pelvis);

  // Columna -> torso, cuello, cabeza
  const spine = pivot("spine", root, 0, 0.05 * H, 0);
  const chest = box(0.24 * H, 0.3 * H, 0.15 * H, "spine");
  chest.position.y = 0.15 * H;
  spine.add(chest);

  const neck = pivot("neck", spine, 0, 0.3 * H, 0);
  const neckMesh = cyl(0.05 * H, 0.035 * H, "neck");
  neckMesh.position.y = 0.025 * H;
  neck.add(neckMesh);
  const head = ball(0.066 * H, "neck");
  head.position.y = 0.05 * H + 0.066 * H;
  neck.add(head);

  // Brazos
  const buildArm = (side: "L" | "R", sx: number) => {
    const sh = pivot(`shoulder${side}`, spine, sx, 0.27 * H, 0);
    sh.add(cyl(0.16 * H, 0.035 * H, `shoulder${side}`));
    const el = pivot(`elbow${side}`, sh, 0, -0.16 * H, 0);
    el.add(cyl(0.15 * H, 0.03 * H, `elbow${side}`));
    const hand = ball(0.035 * H, `elbow${side}`);
    hand.position.y = -0.15 * H - 0.02 * H;
    el.add(hand);
  };
  buildArm("L", -0.15 * H);
  buildArm("R", 0.15 * H);

  // Piernas
  const buildLeg = (side: "L" | "R", sx: number) => {
    const hip = pivot(`hip${side}`, root, sx, -0.05 * H, 0);
    hip.add(cyl(0.23 * H, 0.05 * H, `hip${side}`));
    const knee = pivot(`knee${side}`, hip, 0, -0.23 * H, 0);
    knee.add(cyl(0.23 * H, 0.04 * H, `knee${side}`));
    const ankle = pivot(`ankle${side}`, knee, 0, -0.23 * H, 0);
    const foot = box(0.07 * H, 0.04 * H, 0.16 * H, `ankle${side}`);
    foot.position.set(0, -0.02 * H, 0.05 * H);
    ankle.add(foot);
  };
  buildLeg("L", -0.06 * H);
  buildLeg("R", 0.06 * H);

  // Escala el rig a la altura exacta solicitada y apoya los pies en y=0.
  root.updateMatrixWorld(true);
  let bb = new THREE.Box3().setFromObject(root);
  const realH = bb.max.y - bb.min.y;
  if (realH > 0) root.scale.multiplyScalar(H / realH);
  root.updateMatrixWorld(true);
  bb = new THREE.Box3().setFromObject(root);
  root.position.y -= bb.min.y;

  const applyPose = (name: PoseName) => {
    for (const g of Object.values(joints)) g.rotation.set(0, 0, 0);
    const pose = POSES[name] ?? {};
    for (const [jn, [x, y, z]] of Object.entries(pose)) {
      const j = joints[jn];
      if (j) j.rotation.set(degToRad(x), degToRad(y), degToRad(z));
    }
    // Re-apoya los pies en el suelo (conserva X/Z; solo ajusta altura).
    root.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(root);
    root.position.y -= b.min.y;
  };

  root.name = "Figura humana";
  root.userData.isHumanFigure = true;
  root.userData.heightCm = H;
  root.userData.joints = joints;
  root.userData.applyPose = applyPose;
  root.userData.reset = () => applyPose("De pie");
  return root;
}

/** Libera la geometria de la figura. */
export function disposeHumanFigure(group: THREE.Group): void {
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      (o.material as THREE.Material).dispose?.();
    }
  });
}
