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
};

let poses: PoseMap = load();

function load(): PoseMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PoseMap;
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
