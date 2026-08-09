import type { PhysicalAttributes, PrimitiveParams, StackInfo } from "../objects/types";
import type { JointKind, JointMotor, AxisName } from "../physics/joints";

// Formato de proyecto serializable (escena completa) para guardar/cargar.

export const PROJECT_VERSION = 1;

type Vec3 = [number, number, number];
type Quat = [number, number, number, number];

export interface ObjData {
  id: string;
  name: string;
  componentId: string;
  materialId: string;
  params: PrimitiveParams;
  physics: PhysicalAttributes;
  stack?: StackInfo;
  position: Vec3;
  quaternion: Quat;
  scale: Vec3;
  /** Clave `maquina:<id>` si el objeto es una máquina estándar sustituida. */
  modeloMaquina?: string;
}

export interface JointData {
  name: string;
  kind: JointKind;
  bodyAId: string;
  bodyBId: string;
  anchor: Vec3;
  axis: AxisName;
  /** Eje libre en mundo (unitario) si la unión giró con su grupo (v0.2.25). */
  axisVec?: Vec3 | null;
  limitsEnabled: boolean;
  min: number;
  max: number;
  motor: JointMotor;
  /** Lock switch: la articulación queda rígida en su pose de diseño. */
  locked?: boolean;
  /** Las dos piezas unidas siguen chocando entre sí (v0.2.33). */
  contactos?: boolean;
}

export interface CableData {
  name: string;
  nodes: { objectId: string; local: Vec3 }[];
}

export interface GroupData {
  name: string;
  ids: string[];
}

export interface RopeData {
  name: string;
  kind: "chain" | "strap";
  slack: number;
  a: { objectId: string | null; local: Vec3 };
  b: { objectId: string | null; local: Vec3 };
}

export interface HumanData {
  present: boolean;
  mode: "mannequin" | "skeleton";
  heightCm: number;
  position: Vec3;
  quaternion: Quat;
  /** Rotaciones de las articulaciones en grados (solo maniqui). */
  pose: Record<string, Vec3> | null;
  hands: { side: "L" | "R"; objectId: string; local: Vec3 }[];
  /** Articulaciones bloqueadas con el candado (esquema Ergonómico v0.2.0). */
  locks?: string[];
  /** Simetría de pose activa (los cambios de un lado se replican al otro). */
  symmetry?: boolean;
}

/** Espacio de trabajo del proyecto (asistente de Nuevo, v0.2.0). */
export interface WorkspaceData {
  /** Canvas: libre (suelo infinito) o completo (área definida con límites). */
  canvas: "libre" | "completo";
  /** Modo de trabajo: sencillo (herramientas básicas) o profesional (todo). */
  modo: "sencillo" | "profesional";
  /** Dimensiones del área (cm), solo canvas completo (bbox si hay planta). */
  ancho?: number;
  fondo?: number;
  /**
   * Planta del suelo dibujada como polígono libre (cm, plano XZ, centrada en
   * el origen). Si existe, define la superficie operable; si no, se usa el
   * rectángulo ancho×fondo.
   */
  planta?: [number, number][];
  /** Techo: alturas en los extremos A y B (pendiente) a lo largo de un eje. */
  techo?: { alturaA: number; alturaB: number; eje: "x" | "z" } | null;
  /** Altura de las paredes (cm) cuando NO hay techumbre (con techo, la
   *  pared sube exactamente hasta él, siguiendo su inclinación). */
  alturaParedes?: number;
  /** Paredes creadas en los bordes (N=+Z, S=-Z, E=+X, O=-X). */
  paredes?: ("N" | "S" | "E" | "O")[];
}

export interface ProjectData {
  version: number;
  objects: ObjData[];
  joints: JointData[];
  cables: CableData[];
  ropes?: RopeData[];
  groups: GroupData[];
  human: HumanData;
  workspace?: WorkspaceData;
}
