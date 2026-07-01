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
}

export interface JointData {
  name: string;
  kind: JointKind;
  bodyAId: string;
  bodyBId: string;
  anchor: Vec3;
  axis: AxisName;
  limitsEnabled: boolean;
  min: number;
  max: number;
  motor: JointMotor;
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
}

export interface ProjectData {
  version: number;
  objects: ObjData[];
  joints: JointData[];
  cables: CableData[];
  ropes?: RopeData[];
  groups: GroupData[];
  human: HumanData;
}
