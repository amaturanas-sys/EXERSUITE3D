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
  // Tobillo: 50° de flexión plantar (punta abajo) contra 40° de dorsiflexión,
  // y la inversión (planta hacia dentro) mayor que la eversión.
  //
  // La dorsiflexión estuvo topada en 20° con la nota de que era «el tope
  // humano». No lo es: 20° es el tope de pie y SIN CARGA. En cuclillas, con el
  // peso encima y el talón en el suelo, el tobillo pasa de 35 — es la
  // articulación que decide si alguien puede bajar del todo, y por eso los
  // levantadores usan cuña. Medido en el modelo del diseñador: 37,6°.
  //
  // Con el tope en 20 la espinilla no podía inclinarse, la rodilla no se
  // adelantaba y la sentadilla entera salía a medias (v0.2.75).
  ankleL: { x: [-40, 50], z: [-15, 30] },
  ankleR: { x: [-40, 50], z: [-30, 15] },
};

function mat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: 0x2f7dd1, metalness: 0.0, roughness: 0.6 });
}

/**
 * Desempata la profundidad entre segmentos que comparten piel.
 *
 * Un maniquí troceado de un cuerpo real solapa en las juntas: la carne de dos
 * piezas ocupa el mismo sitio para que la articulación no se abra al doblarla.
 * Ahí las dos superficies son COINCIDENTES, y con la misma profundidad el
 * z-buffer decide píxel a píxel cuál gana: sale un moteado sucio en rodillas,
 * codos y hombros.
 *
 * Dándole a cada segmento un sesgo de profundidad propio, en cada banda de
 * solape gana siempre el mismo y el moteado desaparece. Es un desempate, no un
 * desplazamiento: nada se mueve de sitio, así que las medidas del maniquí —de
 * las que vive ERGONOMÍA— no cambian.
 */
function sesgarProfundidad(m: THREE.MeshStandardMaterial, orden: number): void {
  m.polygonOffset = true;
  m.polygonOffsetFactor = 0;
  m.polygonOffsetUnits = -orden;
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
 * Proveedor de la PIEL de un segmento: el material del modelo cuando trae
 * textura. Un maniquí escaneado la trae —la piel fotográfica es media mitad
 * del modelo— y sin esto se veía la forma del cuerpo pintada del azul de
 * referencia. Devuelve null y el segmento se queda con ese azul.
 */
export type SegmentSkinProvider = (segmentId: string) => THREE.Material | null;

/**
 * ESQUELETO PROPIO del maniquí: dónde articula de verdad el cuerpo que se está
 * montando, en centímetros, con los pies en y=0 y a 175 cm de talla.
 *
 * Sin esto el rig gira sobre los pivotes que heredó de sus primitivas, y esos
 * pivotes son los de una figura de cilindros, no los de un cuerpo. La
 * diferencia no es cosmética: con el maniquí de serie los pivotes se mueven
 * entre 2,3 y 10,1 cm —el hombro es el que más—, así que el segmento no giraba
 * sobre su articulación sino que ORBITABA alrededor de ella, y con ello se iba
 * al garete todo lo que la aplicación mide encima del maniquí: dónde pisa,
 * cuánto se hunde en un asiento, a qué altura le queda un agarre.
 *
 * Las claves son las mismas que las de `joints` (spine, neck, shoulderL…). Se
 * usa solo si vienen TODAS y si además hay modelo para los dieciséis segmentos:
 * mezclar pivotes de un cuerpo con geometría de otro es peor que no tocar nada.
 */
export type SegmentJointProvider = () => Record<string, [number, number, number]> | null;

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
  skins?: SegmentSkinProvider,
  esqueleto?: SegmentJointProvider,
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

  // Piernas.
  //
  // CADERA A LA ALTURA DE LA CABEZA FEMORAL (v0.2.47). Antes el pivote estaba
  // en la CARA INFERIOR de la pelvis (−0,05·H), no en medio de ella. Como el
  // muslo es un cilindro de radio 0,05·H que cuelga de ese pivote, al sentarse
  // —muslo horizontal— su cara inferior quedaba 0,05·H (8,75 cm en un maniquí
  // de 175) POR DEBAJO de los glúteos: era imposible que ambos apoyaran a la
  // vez sobre un asiento plano. Uno u otro tenía que hundirse o flotar.
  //
  // Subiéndolo un radio de muslo, la generatriz inferior del muslo horizontal
  // coincide exactamente con la cara inferior de la pelvis, que es lo que pasa
  // en un cuerpo real: el fémur articula por el MEDIO del hueso coxal, no por
  // su borde de abajo.
  const RADIO_MUSLO = 0.05 * H;
  const buildLeg = (side: "L" | "R", sx: number) => {
    const hip = pivot(`hip${side}`, root, sx, -0.05 * H + RADIO_MUSLO, 0);
    hip.add(cyl(0.23 * H, RADIO_MUSLO, `hip${side}`, `muslo-${side}`));
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
  if (segments) applySegmentOverrides(root, joints, segments, skins, esqueleto?.() ?? null);

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
 * ajustándolo al hueco de la primitiva original. La malla conserva su material
 * (color de referencia) y su lugar en la jerarquía articulada.
 */
function applySegmentOverrides(
  root: THREE.Group,
  joints: Record<string, THREE.Object3D>,
  provider: SegmentProvider,
  skins?: SegmentSkinProvider,
  esqueleto?: Record<string, [number, number, number]> | null,
): void {
  const conModelo: { mesh: THREE.Mesh; geo: THREE.BufferGeometry; id: string }[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    const id = m.userData?.segmentId as string | undefined;
    if (!m.isMesh || !id) return;
    const geo = provider(id);
    if (geo) conModelo.push({ mesh: m, geo, id });
  });
  if (!conModelo.length) return;

  // ¿Vienen troceados de un mismo cuerpo o es cada uno un modelo suelto?
  // Si son trozos de un cuerpo, sus cajas están REPARTIDAS en el espacio y la
  // de todos juntos es mucho más alta que la de cualquiera por separado. Si son
  // modelos sueltos, cada uno viene centrado en su origen y las cajas se
  // solapan, así que la unión no crece.
  const union = new THREE.Box3();
  let masAlta = 0;
  for (const { geo } of conModelo) {
    geo.computeBoundingBox();
    union.union(geo.boundingBox!);
    masAlta = Math.max(masAlta, geo.boundingBox!.max.y - geo.boundingBox!.min.y);
  }
  const alturaUnion = union.max.y - union.min.y;
  const cuerpoEntero = masAlta > 0 && alturaUnion > masAlta * 1.5;
  // El esqueleto solo vale si viene ENTERO y el cuerpo también: con la mitad de
  // los pivotes movidos y la otra mitad donde los dejaron las primitivas, la
  // figura sale peor que sin tocar nada.
  const propio =
    esqueleto &&
    cuerpoEntero &&
    conModelo.length === SEGMENT_DEFS.length &&
    Object.keys(PARENT_JOINT).every((n) => Array.isArray(esqueleto[n]))
      ? esqueleto
      : null;
  if (propio) recolocarPivotes(root, joints, propio);
  if (cuerpoEntero) {
    colocarCuerpoEntero(root, conModelo, propio != null);
  } else {
    for (const { mesh, geo } of conModelo) fitSegmentGeometry(mesh, geo);
  }

  for (const { mesh, id } of conModelo) {
    const piel = skins?.(id);
    if (piel) {
      (mesh.material as THREE.Material).dispose?.();
      mesh.material = piel;
    }
    // Cada segmento con su sesgo, para que en las juntas gane siempre el mismo.
    const orden = SEGMENT_DEFS.findIndex((s) => s.id === id);
    sesgarProfundidad(mesh.material as THREE.MeshStandardMaterial, orden);
  }
}

/**
 * Lleva los pivotes del rig a donde articula el cuerpo de verdad.
 *
 * El esqueleto viene en coordenadas absolutas (pies en y=0), y la jerarquía del
 * rig es relativa: cada pivote cuelga del anterior. Restando el sitio de la
 * articulación madre se pasa de una cosa a la otra. Los pivotes sin madre
 * —columna y caderas— quedan medidos desde la raíz, que con esqueleto propio se
 * queda en el SUELO, entre los pies, en vez de a la altura de la cadera.
 *
 * Nada se rota: solo se mueven los centros de giro. Los rangos articulares y las
 * posturas siguen contando desde el mismo cero.
 */
function recolocarPivotes(
  root: THREE.Group,
  joints: Record<string, THREE.Object3D>,
  esqueleto: Record<string, [number, number, number]>,
): void {
  for (const [nombre, pivote] of Object.entries(joints)) {
    const j = esqueleto[nombre];
    if (!j) continue;
    const madre = PARENT_JOINT[nombre];
    const p = madre ? esqueleto[madre] : null;
    pivote.position.set(j[0] - (p?.[0] ?? 0), j[1] - (p?.[1] ?? 0), j[2] - (p?.[2] ?? 0));
  }
  root.updateMatrixWorld(true);
}

/**
 * Monta los segmentos con UNA SOLA transformación para todos, respetando la
 * posición que traen unos respecto a otros.
 *
 * Encajar cada pieza por separado en su hueco —estirando su caja hasta
 * llenarlo— rompe el cuerpo por dos sitios a la vez. Uno, cada pieza se estira
 * distinto: medido sobre un cuerpo escaneado y troceado a mano, el pie se
 * deformaba un 51 % y el antebrazo un 35 %, porque las primitivas del rig no
 * tienen las proporciones de un cuerpo real (la del pie es una losa de 6,8 cm y
 * un pie con su tobillo mide 13,7). Y dos, al deformarse distinto, las caras
 * del corte dejan de coincidir con las de su vecina y se abren las costuras.
 *
 * Con una transformación común no pasa ninguna de las dos cosas: el cuerpo
 * entra tal cual se esculpió, sin deformar, y sigue siendo continuo porque los
 * cortes de las piezas seguían casando entre sí.
 */
function colocarCuerpoEntero(
  root: THREE.Group,
  piezas: { mesh: THREE.Mesh; geo: THREE.BufferGeometry; id: string }[],
  propio = false,
): void {
  // El hueco de TODO el maniquí: la caja de las primitivas que va a sustituir.
  root.updateMatrixWorld(true);
  const destino = new THREE.Box3();
  for (const { mesh } of piezas) destino.expandByObject(mesh);

  const origen = new THREE.Box3();
  for (const { geo } of piezas) origen.union(geo.boundingBox!);

  const tOrigen = new THREE.Vector3();
  const tDestino = new THREE.Vector3();
  origen.getSize(tOrigen);
  destino.getSize(tDestino);
  // Escala UNIFORME por la altura: el cuerpo conserva sus proporciones, que es
  // justo lo que se quiere conservar. La talla exacta la fija el rig después,
  // reescalando el conjunto entero.
  const s = tOrigen.y > 1e-6 ? tDestino.y / tOrigen.y : 1;

  const cOrigen = new THREE.Vector3();
  const cDestino = new THREE.Vector3();
  origen.getCenter(cOrigen);
  destino.getCenter(cDestino);

  // Con esqueleto propio no hay nada que encajar: los pivotes ya se movieron al
  // sitio del cuerpo y la geometría viene medida en ese mismo espacio —175 cm,
  // pies en y=0—, así que entra tal cual. La talla que pida quien lo llame la
  // pone el reescalado final del rig.
  const M = propio
    ? new THREE.Matrix4()
    : new THREE.Matrix4()
        // Los pies del cuerpo sobre los pies del maniquí; centrado en X y Z.
        .makeTranslation(
          cDestino.x - cOrigen.x * s,
          destino.min.y - origen.min.y * s,
          cDestino.z - cOrigen.z * s,
        )
        .multiply(new THREE.Matrix4().makeScale(s, s, s));

  const sitio = new THREE.Vector3();
  for (const { mesh, geo } of piezas) {
    geo.applyMatrix4(M);
    // La geometría vive en el marco de la articulación de la que cuelga; en
    // reposo no hay giros, así que basta restarle dónde está esa articulación.
    (mesh.parent ?? root).getWorldPosition(sitio);
    geo.applyMatrix4(new THREE.Matrix4().makeTranslation(-sitio.x, -sitio.y, -sitio.z));
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    mesh.geometry.dispose();
    mesh.geometry = geo;
    mesh.position.set(0, 0, 0);
    mesh.rotation.set(0, 0, 0);
    mesh.scale.set(1, 1, 1);
  }
}

/**
 * Encaja el modelo en el HUECO de la primitiva estirando CADA EJE por separado,
 * y lo centra donde estaba la parte.
 *
 * Antes la escala era uniforme, igualando la dimensión más larga del modelo con
 * la más larga de la primitiva. Eso vale para sustituir una pieza suelta, pero
 * no para armar un cuerpo: los segmentos anatómicos tienen proporciones muy
 * distintas de las primitivas que ocupan —el pie es una losa de 7 cm y un pie
 * de verdad mide 27 cm de alto con el tobillo; el cuello es un cilindro flaco y
 * un cuello escaneado trae los trapecios— así que cada pieza se escalaba por su
 * lado más largo y aterrizaba encogida y descentrada. El resultado era una
 * figura DESARMADA: la cabeza flotando sobre el cuello, los brazos separados
 * del tronco y los pies por debajo del suelo.
 *
 * Llenando el hueco eje a eje, cada segmento ocupa exactamente el sitio que el
 * rig le reserva: las juntas casan y —lo que importa aquí— el maniquí conserva
 * las medidas de las que depende toda la ventana de ERGONOMÍA. Lo que se paga
 * es que el modelo se deforma para caber, que es justo lo que se quiere: el
 * maniquí mantiene su talla y toma la forma del cuerpo.
 */
function fitSegmentGeometry(mesh: THREE.Mesh, geo: THREE.BufferGeometry): void {
  mesh.geometry.computeBoundingBox();
  const os = new THREE.Vector3();
  mesh.geometry.boundingBox!.getSize(os);

  geo.computeBoundingBox();
  const cs = new THREE.Vector3();
  geo.boundingBox!.getSize(cs);

  // Un eje plano (un plano, una calcomanía) no se puede estirar: se deja como
  // está en ese eje en vez de multiplicar por infinito.
  geo.applyMatrix4(
    new THREE.Matrix4().makeScale(
      cs.x > 1e-6 ? os.x / cs.x : 1,
      cs.y > 1e-6 ? os.y / cs.y : 1,
      cs.z > 1e-6 ? os.z / cs.z : 1,
    ),
  );
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
