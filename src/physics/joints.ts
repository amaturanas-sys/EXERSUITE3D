import * as THREE from "three";

// Modelo de datos de articulaciones (joints) entre dos componentes.
//  - revolute  -> bisagra/pivote: giro alrededor de un eje (grados).
//  - prismatic -> corredera: desplazamiento lineal a lo largo de un eje (cm).

export type JointKind = "revolute" | "prismatic";
export type AxisName = "x" | "y" | "z";

export interface JointMotor {
  enabled: boolean;
  /** Velocidad objetivo: grados/s (revolute) o cm/s (prismatic). */
  targetVel: number;
  /** Rigidez/fuerza del motor (0..N). */
  factor: number;
}

let nextJointId = 1;

export class Joint {
  readonly id: string;
  name: string;
  kind: JointKind;
  /** Pieza de anclaje (suele ser la parte fija/parent). */
  bodyAId: string;
  /** Pieza movil (child). */
  bodyBId: string;
  /** Punto pivote/origen de la articulacion, en cm (mundo, estado de diseno). */
  anchor: THREE.Vector3;
  /** Eje de la articulacion en el espacio global. */
  axis: AxisName;
  limitsEnabled: boolean;
  /** Limite minimo: grados (revolute) o cm (prismatic). */
  min: number;
  /** Limite maximo: grados (revolute) o cm (prismatic). */
  max: number;
  motor: JointMotor;

  constructor(opts: {
    kind: JointKind;
    bodyAId: string;
    bodyBId: string;
    anchor: THREE.Vector3;
    axis?: AxisName;
    name?: string;
  }) {
    this.id = `joint_${nextJointId++}`;
    this.kind = opts.kind;
    this.bodyAId = opts.bodyAId;
    this.bodyBId = opts.bodyBId;
    this.anchor = opts.anchor.clone();
    this.axis = opts.axis ?? (opts.kind === "revolute" ? "z" : "y");
    this.name =
      opts.name ?? (opts.kind === "revolute" ? `Bisagra ${this.id.split("_")[1]}` : `Corredera ${this.id.split("_")[1]}`);
    this.limitsEnabled = opts.kind === "revolute";
    this.min = opts.kind === "revolute" ? -90 : 0;
    this.max = opts.kind === "revolute" ? 0 : 50;
    this.motor = { enabled: false, targetVel: opts.kind === "revolute" ? 45 : 20, factor: 2 };
  }
}

/** Vector unitario del eje seleccionado. */
export function axisVector(axis: AxisName): THREE.Vector3 {
  return new THREE.Vector3(axis === "x" ? 1 : 0, axis === "y" ? 1 : 0, axis === "z" ? 1 : 0);
}
