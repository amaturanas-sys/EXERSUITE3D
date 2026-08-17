// Biblioteca de posturas estandar del personaje, editable y persistente.
// Una postura = rotaciones (grados [x,y,z]) por nombre de articulacion.
// Convencion: miembros (cadera/rodilla/tobillo/hombro/codo) con X NEGATIVA
// flexionan hacia DELANTE (+Z); la columna con X POSITIVA inclina el torso
// hacia delante. Ver humanFigure.ts.

export type PoseDef = Record<string, [number, number, number]>;
export type PoseMap = Record<string, PoseDef>;

const STORAGE_KEY = "exersuite.poses.v2";
const STORAGE_KEY_V1 = "exersuite.poses.v1";

export const BUILTIN_POSES: PoseMap = {
  "De pie": {},
  /**
   * SENTADILLA PROFUNDA, medida sobre el modelo del diseñador (v0.2.75).
   *
   * Los ángulos anteriores —cadera 70, rodilla 110, tobillo 20, columna 25—
   * los puse a ojo y daban una sentadilla A MEDIAS: la figura bajaba, pero la
   * cadena no cerraba. Con la espinilla clavada casi vertical, la rodilla no
   * podía adelantarse, y sin rodilla adelante la cadera no tenía dónde ir, así
   * que el tronco se quedaba tieso. Se veía a alguien empezando a sentarse, no
   * a alguien en el fondo de una sentadilla.
   *
   * Estos salen de MEDIR el modelo, no de estimarlos. En él la figura baja al
   * 52 % de su altura de pie, y sacando los puntos de la silueta sagital —la
   * rodilla es lo más adelantado, el glúteo lo más atrasado, el tobillo donde
   * la pierna se estrecha sobre el pie— quedan:
   *
   *   espinilla  37,6° hacia delante        muslo   82° (casi horizontal)
   *   tronco     44,7° hacia delante        rodilla 119,5° de flexión
   *   cadera    126,6° de flexión           tobillo 37,6° de dorsiflexión
   *
   * Que el muslo salga horizontal y la cadera a la altura de la rodilla es la
   * comprobación de que es una sentadilla PARALELA de verdad y no un amago.
   *
   * OJO CON LA CADERA: aquí NO va el ángulo anatómico de flexión (los 126,6°
   * que forman tronco y muslo). En este esqueleto la cadera es la RAÍZ de la
   * pierna —`PARENT_JOINT.hipL` es `null`—, así que `hipX` se mide contra la
   * vertical de la figura y no contra el tronco. Poniendo los 127 anatómicos
   * el muslo apuntaba hacia ARRIBA, la espinilla salía casi vertical (7°) y el
   * pie se iba treinta centímetros hacia delante: una postura que parecía una
   * sentadilla en la captura y no lo era por dentro. Lo que va aquí son los
   * 82° que el muslo se separa de la vertical, y entonces la cadena cierra
   * sola: 82 − 120 = −38 de espinilla, que es justo la dorsiflexión del
   * tobillo, y por eso la planta queda plana en el suelo.
   */
  Sentadilla: {
    hipL: [-82, 0, 0], hipR: [-82, 0, 0],
    kneeL: [120, 0, 0], kneeR: [120, 0, 0],
    // 38° de dorsiflexión. Aquí ponía 20 «porque es el tope humano», y no lo
    // es: 20 es el tope SIN CARGA y de pie. En una sentadilla profunda con el
    // talón en el suelo el tobillo pasa de 35, y el modelo lo enseña. Con 20,
    // la espinilla no podía inclinarse y toda la postura salía incongruente —
    // que es exactamente lo que había que arreglar.
    ankleL: [-38, 0, 0], ankleR: [-38, 0, 0],
    spine: [45, 0, 0],
    shoulderL: [-70, 0, 0], shoulderR: [-70, 0, 0],
  },
  Sentado: {
    hipL: [-85, 0, 0], hipR: [-85, 0, 0],
    kneeL: [95, 0, 0], kneeR: [95, 0, 0],
    shoulderL: [-20, 0, 0], shoulderR: [-20, 0, 0],
    elbowL: [-55, 0, 0], elbowR: [-55, 0, 0],
  },
  Remo: {
    spine: [35, 0, 0],
    hipL: [-15, 0, 0], hipR: [-15, 0, 0],
    kneeL: [25, 0, 0], kneeR: [25, 0, 0],
    shoulderL: [20, 0, 0], shoulderR: [20, 0, 0],
    elbowL: [-105, 0, 0], elbowR: [-105, 0, 0],
  },
  Press: {
    shoulderL: [-165, 0, 0], shoulderR: [-165, 0, 0],
    elbowL: [-10, 0, 0], elbowR: [-10, 0, 0],
  },
  // POSTURAS DE PARTIDA DE LOS CUATRO MOVIMIENTOS CLÁSICOS (v0.2.49).
  //
  // El movimiento lo pone la primitiva (zona + empuje/tracción); el PLANO lo
  // pone la postura. Estas cuatro son el punto de partida de cada uno, con la
  // base sentada, para que salgan bien con solo marcar «tren superior» y
  // pulsar 8 o 9.
  "Empuje horizontal": {
    hipL: [-85, 0, 0], hipR: [-85, 0, 0],
    kneeL: [95, 0, 0], kneeR: [95, 0, 0],
    // Codos atrás y manos al pecho: al empujar, el brazo sale hacia delante.
    shoulderL: [-15, 0, 0], shoulderR: [-15, 0, 0],
    elbowL: [-100, 0, 0], elbowR: [-100, 0, 0],
  },
  "Tracción horizontal": {
    hipL: [-85, 0, 0], hipR: [-85, 0, 0],
    kneeL: [95, 0, 0], kneeR: [95, 0, 0],
    // Brazos estirados al frente: al traccionar, el codo dobla y el hombro
    // vuelve al costado. Es el remo.
    shoulderL: [-75, 0, 0], shoulderR: [-75, 0, 0],
    elbowL: [-10, 0, 0], elbowR: [-10, 0, 0],
  },
  "Empuje vertical": {
    hipL: [-85, 0, 0], hipR: [-85, 0, 0],
    kneeL: [95, 0, 0], kneeR: [95, 0, 0],
    // Manos a la altura de los hombros con el codo muy doblado: al empujar,
    // el brazo sube. Es el press militar.
    shoulderL: [-100, 0, 0], shoulderR: [-100, 0, 0],
    elbowL: [-130, 0, 0], elbowR: [-130, 0, 0],
  },
  "Tracción vertical": {
    hipL: [-85, 0, 0], hipR: [-85, 0, 0],
    kneeL: [95, 0, 0], kneeR: [95, 0, 0],
    // Brazos estirados por encima de la cabeza: al traccionar, la barra baja.
    // Es el jalón.
    shoulderL: [-165, 0, 0], shoulderR: [-165, 0, 0],
    elbowL: [-10, 0, 0], elbowR: [-10, 0, 0],
  },
};

let poses: PoseMap = load();

/**
 * Añade a la biblioteca guardada las posturas de FÁBRICA que no estén.
 *
 * Sin esto, quien ya tenía biblioteca no veía nunca las posturas que trae una
 * versión nueva —las de los cuatro movimientos clásicos, por ejemplo—: se
 * guardaba una copia el primer día y no se volvía a mirar el catálogo. Las que
 * el usuario haya modificado se respetan tal cual.
 */
function conPosturasDeFabrica(previas: PoseMap): PoseMap {
  const out = { ...previas };
  for (const [nombre, def] of Object.entries(BUILTIN_POSES)) {
    if (!(nombre in out)) out[nombre] = structuredClone(def);
  }
  return out;
}

function load(): PoseMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return conPosturasDeFabrica(JSON.parse(raw) as PoseMap);
    // MIGRACIÓN v1 → v2 (v0.2.38): el codo doblaba al revés, así que las
    // posturas guardadas con el criterio viejo se pasan al nuevo cambiando
    // el signo de su flexión. Las que el usuario creó se conservan.
    const viejo = localStorage.getItem(STORAGE_KEY_V1);
    if (viejo) {
      const previas = JSON.parse(viejo) as PoseMap;
      for (const pose of Object.values(previas)) {
        for (const art of ["elbowL", "elbowR"]) {
          if (pose[art]) pose[art] = [-pose[art][0], pose[art][1], pose[art][2]];
        }
      }
      // Las de fábrica se rehacen: pueden haber cambiado por otros motivos.
      return { ...previas, ...structuredClone(BUILTIN_POSES) };
    }
  } catch {
    /* sin persistencia disponible */
  }
  return structuredClone(BUILTIN_POSES);
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(poses));
  } catch {
    /* ignora si no hay localStorage */
  }
}

export function poseNames(): string[] {
  return Object.keys(poses);
}

export function getPose(name: string): PoseDef | undefined {
  return poses[name];
}

export function setPose(name: string, def: PoseDef): void {
  poses[name] = def;
  persist();
}

export function removePose(name: string): void {
  delete poses[name];
  persist();
}

export function isBuiltin(name: string): boolean {
  return name in BUILTIN_POSES;
}

/** Restaura la biblioteca a las posturas de fabrica. */
export function resetDefaultPoses(): void {
  poses = structuredClone(BUILTIN_POSES);
  persist();
}
