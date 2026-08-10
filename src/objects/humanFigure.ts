import * as THREE from "three";

// Figura humana de referencia POSABLE (rig articulado). Cada articulacion es un
// pivote (Object3D); rotarlo mueve toda la cadena del miembro. Las mallas llevan
// `jointName` para saber que articulacion controlar al hacer clic.
//
// El grupo raiz expone en userData:
//   isHumanFigure: true
//   joints: Record<string, Object3D>   (pivotes articulables)
//   ground(): re-apoya los pies en y=0
//
// Las posturas estandar viven en poseLibrary.ts y las aplica el Editor.

export const DEFAULT_HUMAN_HEIGHT = 175;

/**
 * Grados de libertad naturales de cada articulación (ejes rotables y sus
 * límites en grados). Las bisagras (codo/rodilla) solo giran en X; las esféricas
 * (hombro/cadera) en los tres ejes; muñeca/tobillo en X y Z. Sirve para que al
 * posar el maniquí cada segmento gire siguiendo el eje natural de su articulación
 * y dentro de un rango realista.
 */
export type AxisLimits = { x?: [number, number]; y?: [number, number]; z?: [number, number] };

/**
 * RANGOS ARTICULARES (revisión v0.2.41). Convención del rig: los huesos
 * descansan sobre −Y y la figura mira a +Z, así que una X POSITIVA lleva el
 * segmento hacia ATRÁS (bien para la rodilla) y una NEGATIVA hacia delante
 * (cadera, hombro, codo). El costado izquierdo vive en −X y el derecho en
 * +X, de modo que la ABDUCCIÓN —separar del cuerpo— es Z negativa a la
 * izquierda y positiva a la derecha.
 */
export const JOINT_DOF: Record<string, AxisLimits> = {
  spine: { x: [-30, 80], y: [-40, 40], z: [-35, 35] },
  // Cuello: 50° de flexión (barbilla al pecho) y 60° de extensión.
  neck: { x: [-60, 50], y: [-70, 70], z: [-40, 40] },
  // Hombro: 180° de flexión hacia delante, 60° de extensión atrás, 150° de
  // ABDUCCIÓN hacia su propio costado y 30° de aducción cruzando el cuerpo.
  // Los signos de Z estaban cambiados de lado: el brazo izquierdo abducía
  // hacia el derecho y viceversa.
  shoulderL: { x: [-180, 60], y: [-90, 90], z: [-150, 30] },
  shoulderR: { x: [-180, 60], y: [-90, 90], z: [-30, 150] },
  // CODO (v0.2.38): flexiona hacia DELANTE, al revés que la rodilla. Con los
  // huesos en reposo sobre -Y y la figura mirando a +Z, una X POSITIVA lleva
  // el segmento hacia atrás — bien para la rodilla, imposible para el codo,
  // que antes doblaba al revés del cuerpo.
  elbowL: { x: [-150, 15], y: [-80, 80] },
  elbowR: { x: [-150, 15], y: [-80, 80] },
  wristL: { x: [-70, 70], z: [-25, 25] },
  wristR: { x: [-70, 70], z: [-25, 25] },
  hipL: { x: [-135, 30], y: [-45, 45], z: [-45, 20] },
  hipR: { x: [-135, 30], y: [-45, 45], z: [-20, 45] },
  kneeL: { x: [-5, 150] },
  kneeR: { x: [-5, 150] },
  // Tobillo: 50° de flexión plantar (punta abajo) contra 20° de dorsiflexión,
  // y la inversión (planta hacia dentro) mayor que la eversión.
  ankleL: { x: [-20, 50], z: [-15, 30] },
  ankleR: { x: [-20, 50], z: [-30, 15] },
};

function mat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: 0x2f7dd1, metalness: 0.0, roughness: 0.6 });
}

/** Segmentos reemplazables del maniquí (para modelos más estéticos). */
export interface SegmentDef {
  id: string;
  label: string;
}

export const SEGMENT_DEFS: SegmentDef[] = [
  { id: "cabeza", label: "Cabeza" },
  { id: "cuello", label: "Cuello" },
  { id: "torso", label: "Torso" },
  { id: "pelvis", label: "Pelvis" },
  { id: "brazo-sup-L", label: "Brazo superior izq." },
  { id: "brazo-sup-R", label: "Brazo superior der." },
  { id: "antebrazo-L", label: "Antebrazo izq." },
  { id: "antebrazo-R", label: "Antebrazo der." },
  { id: "mano-L", label: "Mano izq." },
  { id: "mano-R", label: "Mano der." },
  { id: "muslo-L", label: "Muslo izq." },
  { id: "muslo-R", label: "Muslo der." },
  { id: "pierna-L", label: "Pierna izq." },
  { id: "pierna-R", label: "Pierna der." },
  { id: "pie-L", label: "Pie izq." },
  { id: "pie-R", label: "Pie der." },
];

/** Proveedor de geometría de segmento (modelo baked: cm, centrado en origen). */
export type SegmentProvider = (segmentId: string) => THREE.BufferGeometry | null;

/**
 * Primitiva REAL de cada segmento (misma que usa el rig al construirse), en
 * función de la altura H. Fuente única para el maniquí y para la vista previa
 * de la Biblioteca: así cada segmento se ve como lo que es (cabeza=esfera,
 * torso=caja, muslo=cilindro…) y la sustitución por un modelo se entiende.
 */
export const SEGMENT_PRIMITIVES: Record<string, (H: number) => THREE.BufferGeometry> = {
  cabeza: (H) => new THREE.SphereGeometry(0.066 * H, 18, 12),
  cuello: (H) => new THREE.CylinderGeometry(0.035 * H, 0.035 * H, 0.05 * H, 14),
  torso: (H) => new THREE.BoxGeometry(0.24 * H, 0.3 * H, 0.15 * H),
  pelvis: (H) => new THREE.BoxGeometry(0.2 * H, 0.1 * H, 0.13 * H),
  "brazo-sup-L": (H) => new THREE.CylinderGeometry(0.035 * H, 0.035 * H, 0.16 * H, 14),
  "brazo-sup-R": (H) => new THREE.CylinderGeometry(0.035 * H, 0.035 * H, 0.16 * H, 14),
  "antebrazo-L": (H) => new THREE.CylinderGeometry(0.03 * H, 0.03 * H, 0.15 * H, 14),
  "antebrazo-R": (H) => new THREE.CylinderGeometry(0.03 * H, 0.03 * H, 0.15 * H, 14),
  "mano-L": (H) => new THREE.SphereGeometry(0.035 * H, 18, 12),
  "mano-R": (H) => new THREE.SphereGeometry(0.035 * H, 18, 12),
  "muslo-L": (H) => new THREE.CylinderGeometry(0.05 * H, 0.05 * H, 0.23 * H, 14),
  "muslo-R": (H) => new THREE.CylinderGeometry(0.05 * H, 0.05 * H, 0.23 * H, 14),
  "pierna-L": (H) => new THREE.CylinderGeometry(0.04 * H, 0.04 * H, 0.23 * H, 14),
  "pierna-R": (H) => new THREE.CylinderGeometry(0.04 * H, 0.04 * H, 0.23 * H, 14),
  "pie-L": (H) => new THREE.BoxGeometry(0.07 * H, 0.04 * H, 0.16 * H),
  "pie-R": (H) => new THREE.BoxGeometry(0.07 * H, 0.04 * H, 0.16 * H),
};

/** Geometría por defecto de un segmento (para previews y como hueco del rig). */
export function defaultSegmentGeometry(
  segmentId: string,
  H = DEFAULT_HUMAN_HEIGHT,
): THREE.BufferGeometry {
  const make = SEGMENT_PRIMITIVES[segmentId];
  return make ? make(H) : new THREE.CapsuleGeometry(0.03 * H, 0.12 * H, 4, 12);
}

/**
 * Articulación "madre" de cada pivote, para escalar la cadena al agarrar el
 * maniquí: si una articulación está bloqueada, se busca la anterior libre.
 */
export const PARENT_JOINT: Record<string, string | null> = {
  spine: null,
  neck: "spine",
  shoulderL: "spine",
  elbowL: "shoulderL",
  wristL: "elbowL",
  shoulderR: "spine",
  elbowR: "shoulderR",
  wristR: "elbowR",
  hipL: null,
  kneeL: "hipL",
  ankleL: "kneeL",
  hipR: null,
  kneeR: "hipR",
  ankleR: "kneeR",
};

export function buildHumanFigure(
  heightCm: number,
  segments?: SegmentProvider,
): THREE.Group {
  const H = heightCm;
  const joints: Record<string, THREE.Object3D> = {};

  const tag = (m: THREE.Mesh, jointName: string, segmentId: string) => {
    m.castShadow = true;
    m.userData.humanFigurePart = true;
    m.userData.jointName = jointName;
    m.userData.segmentId = segmentId;
    return m;
  };

  // Las dimensiones viven en SEGMENT_PRIMITIVES (fuente única con la
  // Biblioteca); aquí solo se colocan en la jerarquía articulada.
  const cyl = (len: number, _r: number, jointName: string, segmentId: string) => {
    const m = new THREE.Mesh(defaultSegmentGeometry(segmentId, H), mat());
    m.position.y = -len / 2;
    return tag(m, jointName, segmentId);
  };
  const box = (_w: number, _h: number, _d: number, jointName: string, segmentId: string) => {
    return tag(new THREE.Mesh(defaultSegmentGeometry(segmentId, H), mat()), jointName, segmentId);
  };
  const ball = (_r: number, jointName: string, segmentId: string) => {
    return tag(new THREE.Mesh(defaultSegmentGeometry(segmentId, H), mat()), jointName, segmentId);
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
  const pelvis = box(0.2 * H, 0.1 * H, 0.13 * H, "", "pelvis");
  root.add(pelvis);

  // Columna -> torso, cuello, cabeza
  const spine = pivot("spine", root, 0, 0.05 * H, 0);
  const chest = box(0.24 * H, 0.3 * H, 0.15 * H, "spine", "torso");
  chest.position.y = 0.15 * H;
  spine.add(chest);

  const neck = pivot("neck", spine, 0, 0.3 * H, 0);
  const neckMesh = cyl(0.05 * H, 0.035 * H, "neck", "cuello");
  neckMesh.position.y = 0.025 * H;
  neck.add(neckMesh);
  const head = ball(0.066 * H, "neck", "cabeza");
  head.position.y = 0.05 * H + 0.066 * H;
  neck.add(head);

  // Brazos
  const buildArm = (side: "L" | "R", sx: number) => {
    const sh = pivot(`shoulder${side}`, spine, sx, 0.27 * H, 0);
    sh.add(cyl(0.16 * H, 0.035 * H, `shoulder${side}`, `brazo-sup-${side}`));
    const el = pivot(`elbow${side}`, sh, 0, -0.16 * H, 0);
    el.add(cyl(0.15 * H, 0.03 * H, `elbow${side}`, `antebrazo-${side}`));
    // Muneca = efector final de la IK; la mano cuelga de ella.
    const wrist = pivot(`wrist${side}`, el, 0, -0.15 * H, 0);
    const hand = ball(0.035 * H, `elbow${side}`, `mano-${side}`);
    hand.position.y = -0.02 * H;
    wrist.add(hand);
  };
  buildArm("L", -0.15 * H);
  buildArm("R", 0.15 * H);

  // Piernas
  const buildLeg = (side: "L" | "R", sx: number) => {
    const hip = pivot(`hip${side}`, root, sx, -0.05 * H, 0);
    hip.add(cyl(0.23 * H, 0.05 * H, `hip${side}`, `muslo-${side}`));
    const knee = pivot(`knee${side}`, hip, 0, -0.23 * H, 0);
    knee.add(cyl(0.23 * H, 0.04 * H, `knee${side}`, `pierna-${side}`));
    const ankle = pivot(`ankle${side}`, knee, 0, -0.23 * H, 0);
    const foot = box(0.07 * H, 0.04 * H, 0.16 * H, `ankle${side}`, `pie-${side}`);
    foot.position.set(0, -0.02 * H, 0.05 * H);
    ankle.add(foot);
  };
  buildLeg("L", -0.06 * H);
  buildLeg("R", 0.06 * H);

  // Sustituye las primitivas por los modelos de segmento (ajustados a su hueco).
  if (segments) applySegmentOverrides(root, segments);

  // Escala el rig a la altura exacta solicitada y apoya los pies en y=0.
  root.updateMatrixWorld(true);
  let bb = new THREE.Box3().setFromObject(root);
  const realH = bb.max.y - bb.min.y;
  if (realH > 0) root.scale.multiplyScalar(H / realH);
  root.updateMatrixWorld(true);
  bb = new THREE.Box3().setFromObject(root);
  root.position.y -= bb.min.y;

  // Re-apoya los pies en el suelo (conserva X/Z; solo ajusta altura).
  const ground = () => {
    root.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(root);
    root.position.y -= b.min.y;
  };

  root.name = "Figura humana";
  root.userData.isHumanFigure = true;
  root.userData.heightCm = H;
  root.userData.joints = joints;
  root.userData.ground = ground;
  return root;
}

/**
 * Sustituye la geometría de cada segmento que tenga un modelo asignado,
 * ajustándolo al hueco de la primitiva original: escala uniforme para igualar la
 * dimensión más larga y lo centra donde estaba la parte. La malla conserva su
 * material (color de referencia) y su lugar en la jerarquía articulada.
 */
function applySegmentOverrides(root: THREE.Group, provider: SegmentProvider): void {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    const id = m.userData?.segmentId as string | undefined;
    if (!m.isMesh || !id) return;
    const geo = provider(id);
    if (geo) fitSegmentGeometry(m, geo);
  });
}

function fitSegmentGeometry(mesh: THREE.Mesh, geo: THREE.BufferGeometry): void {
  mesh.geometry.computeBoundingBox();
  const os = new THREE.Vector3();
  mesh.geometry.boundingBox!.getSize(os);
  const origLongest = Math.max(os.x, os.y, os.z);

  geo.computeBoundingBox();
  const cs = new THREE.Vector3();
  geo.boundingBox!.getSize(cs);
  const custLongest = Math.max(cs.x, cs.y, cs.z) || 1;

  const s = origLongest / custLongest;
  geo.applyMatrix4(new THREE.Matrix4().makeScale(s, s, s));
  // Centra el modelo donde estaba el centro de la primitiva (mesh.position, ya
  // que las primitivas están centradas en su origen local).
  geo.computeBoundingBox();
  const cc = new THREE.Vector3();
  geo.boundingBox!.getCenter(cc);
  geo.applyMatrix4(
    new THREE.Matrix4().makeTranslation(
      mesh.position.x - cc.x,
      mesh.position.y - cc.y,
      mesh.position.z - cc.z,
    ),
  );
  geo.computeBoundingBox();
  geo.computeBoundingSphere();

  mesh.geometry.dispose();
  mesh.geometry = geo;
  mesh.position.set(0, 0, 0);
  mesh.rotation.set(0, 0, 0);
  mesh.scale.set(1, 1, 1);
}

/** Libera la geometria de la figura. */
export function disposeHumanFigure(group: THREE.Group): void {
  // El esqueleto glTF se clona desde una cache COMPARTIENDO geometrias y un
  // material singleton: hacer dispose aqui destruiria la cache y forzaria
  // re-subir el modelo entero a GPU en cada toggle maniqui/esqueleto.
  if (group.userData.sharedResources) return;
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      (o.material as THREE.Material).dispose?.();
    }
  });
}
