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
  /** La unión es una SOLDADURA (se funde), no una bisagra frenada (v0.3.19). */
  soldada?: boolean;
  /** Ángulo entre placas en la pose de diseño (grados, 0..180), v0.3.19. */
  apertura0?: number | null;
  /** Signo del giro relativo que abre la bisagra (v0.3.19). */
  sentidoApertura?: number;
  /** Las dos piezas unidas siguen chocando entre sí (v0.2.33). */
  contactos?: boolean;
}

export interface CableData {
  name: string;
  nodes: { objectId: string; local: Vec3 }[];
  /** Frenos engarzados al cable (esferas de tope), v0.2.40. */
  topes?: { seg: number; dist: number; radio: number }[];
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
  /** Pies apoyados en una plataforma o pedal (v0.2.52). */
  feet?: { side: "L" | "R"; objectId: string; local: Vec3; normal?: Vec3 | null }[];
  /** Articulaciones bloqueadas con el candado (esquema Ergonómico v0.2.0). */
  locks?: string[];
  /** Simetría de pose activa (los cambios de un lado se replican al otro). */
  symmetry?: boolean;
  /** Dónde se apoya: en el suelo (se re-aterriza) o en una pieza (v0.2.49). */
  support?: "suelo" | "pieza";
  /** Cota de la cara sobre la que se sentó, para reasentarla (v0.2.52). */
  supportY?: number | null;
  /** Pieza contra la que descansa la espalda, si se sentó con respaldo. */
  backSupport?: string | null;
  /** Tumbada boca arriba sobre su apoyo (banca plana que hace de respaldo). */
  lyingOnSupport?: boolean;
  /** Zonas de movimiento activas y su lado (v0.2.49). */
  zones?: { id: string; side: string }[];
  /** POSTURA DE PARTIDA: pose y sitio a los que devuelve el ↺ (v0.2.49). */
  startPose?: Record<string, Vec3> | null;
  startPoseName?: string | null;
  startPosition?: Vec3 | null;
  startQuaternion?: Quat | null;
  /**
   * PARTIDA DE LA MÁQUINA (v0.2.51): dónde arrancan sus piezas móviles, por
   * índice en la lista de objetos (los ids se rehacen al cargar). Vale para
   * empezar la simulación en el punto de bloqueo en vez de en el diseño.
   */
  startParts?: { index: number; position: Vec3; quaternion: Quat }[] | null;
  /**
   * BARRA EN MANOS (v0.2.81): qué pieza de la escena lleva puesta el maniquí y
   * en qué configuración. Va por ÍNDICE en la lista de objetos, igual que
   * `startParts`, porque los ids se rehacen al cargar.
   */
  barra?: { index: number; ejercicio: string; rackeada?: boolean } | null;
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

/**
 * PUNTO DE PARTIDA GUARDADO (v0.2.77), tal como viaja en el fichero.
 *
 * Los puntos de partida se guardaban solo en memoria: se perdían al cerrar y,
 * peor, seguían ofrecidos tras «Nuevo proyecto» — al aplicar uno, la máquina
 * arrancaba en su diseño y el maniquí saltaba a la posición que tenía en el
 * proyecto anterior. Las piezas van POR ÍNDICE, como las manos apoyadas,
 * porque los identificadores se rehacen al cargar.
 */
export interface PartidaData {
  nombre: string;
  piezas: { index: number; position: Vec3; quaternion: Quat }[] | null;
  pose: Record<string, Vec3> | null;
  poseNombre: string | null;
  position: Vec3 | null;
  quaternion: Quat | null;
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
  /** Puntos de partida guardados (v0.2.77). */
  partidas?: PartidaData[];
}
