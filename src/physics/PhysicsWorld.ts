import RAPIER from "@dimforge/rapier3d-compat";
import * as THREE from "three";
import type { SceneObject } from "../objects/SceneObject";
import { axisVector, type Joint } from "./joints";
import type { Cable } from "./cables";

const DEG2RAD = Math.PI / 180;

interface CableEntry {
  bodies: RAPIER.RigidBody[];
  restLength: number; // metros
}

// Simulacion de fisica rigida con Rapier.
// El editor trabaja en centimetros (1 unidad = 1 cm). Rapier es mas estable en
// metros, asi que internamente escalamos cm -> m con el factor S.
const S = 0.01; // cm -> m
const GRAVITY = { x: 0, y: -9.81, z: 0 };

export class PhysicsWorld {
  private static ready: Promise<void> | null = null;
  private world: RAPIER.World | null = null;
  private bodies = new Map<string, { body: RAPIER.RigidBody; obj: SceneObject }>();
  private cables: CableEntry[] = [];

  /** Carga e inicializa el WASM de Rapier una sola vez. */
  static init(): Promise<void> {
    return (PhysicsWorld.ready ??= RAPIER.init());
  }

  /** Construye el mundo a partir del estado actual de los objetos, joints y cables. */
  build(objects: SceneObject[], joints: Joint[] = [], cables: Cable[] = []): void {
    this.world = new RAPIER.World(GRAVITY);

    // Suelo fijo: cara superior en y = 0.
    const ground = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(50, 0.5, 50).setTranslation(0, -0.5, 0),
      ground,
    );

    for (const obj of objects) this.addBody(obj);
    for (const joint of joints) this.addJoint(joint);
    for (const cable of cables) this.addCable(cable);
  }

  private addCable(cable: Cable): void {
    const bodies = cable.nodeIds.map((id) => this.bodies.get(id)?.body);
    if (bodies.length < 2 || bodies.some((b) => !b)) return;
    const resolved = bodies as RAPIER.RigidBody[];
    this.cables.push({ bodies: resolved, restLength: this.cableLength(resolved) });
  }

  private cableLength(bodies: RAPIER.RigidBody[]): number {
    let L = 0;
    for (let i = 0; i < bodies.length - 1; i++) {
      const a = bodies[i].translation();
      const b = bodies[i + 1].translation();
      L += Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
    }
    return L;
  }

  /**
   * Gradiente de la longitud total respecto a cada nodo. Para un nodo interior
   * (p. ej. una POLEA MOVIL) el gradiente es la suma de los unitarios hacia sus
   * dos vecinos: por eso una polea movil sostenida por dos segmentos "siente" el
   * doble de tension y se mueve la mitad -> el ratio 2:1 (o 3:1...) emerge solo
   * de la geometria, sin codificarlo.
   */
  private cableGradients(
    p: { x: number; y: number; z: number }[],
  ): { x: number; y: number; z: number }[] {
    const n = p.length;
    const J: { x: number; y: number; z: number }[] = [];
    for (let i = 0; i < n; i++) {
      let gx = 0, gy = 0, gz = 0;
      if (i > 0) {
        const u = norm(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y, p[i].z - p[i - 1].z);
        gx += u.x; gy += u.y; gz += u.z;
      }
      if (i < n - 1) {
        const u = norm(p[i].x - p[i + 1].x, p[i].y - p[i + 1].y, p[i].z - p[i + 1].z);
        gx += u.x; gy += u.y; gz += u.z;
      }
      J.push({ x: gx, y: gy, z: gz });
    }
    return J;
  }

  /**
   * Restriccion de cable inextensible y unilateral, a nivel de VELOCIDAD,
   * aplicada a TODOS los nodos dinamicos (extremos y poleas moviles). Solo tira:
   * si hay holgura (L <= rest) o ya no se alarga (vrel <= 0) no hace nada.
   */
  private solveCableVelocity(entry: CableEntry): void {
    const { bodies, restLength } = entry;
    const n = bodies.length;
    if (n < 2) return;
    if (this.cableLength(bodies) <= restLength) return;

    const p = bodies.map((b) => b.translation());
    const J = this.cableGradients(p);
    const im = bodies.map((b) => (b.isDynamic() ? 1 / b.mass() : 0));
    let effMass = 0;
    for (let i = 0; i < n; i++) effMass += im[i] * (J[i].x ** 2 + J[i].y ** 2 + J[i].z ** 2);
    if (effMass <= 0) return;

    const v = bodies.map((b) => b.linvel());
    let vrel = 0;
    for (let i = 0; i < n; i++) vrel += J[i].x * v[i].x + J[i].y * v[i].y + J[i].z * v[i].z;
    if (vrel <= 0) return;

    const lambda = -vrel / effMass;
    for (let i = 0; i < n; i++) {
      if (im[i] <= 0) continue;
      const k = im[i] * lambda;
      bodies[i].setLinvel(
        { x: v[i].x + J[i].x * k, y: v[i].y + J[i].y * k, z: v[i].z + J[i].z * k },
        true,
      );
    }
  }

  /**
   * Proyeccion de POSICION generalizada: si el cable supera su longitud de
   * reposo, mueve los nodos dinamicos a lo largo de sus gradientes para
   * conservar la longitud. El desplazamiento de cada nodo se limita para no
   * cruzar una polea adyacente (evita inestabilidad en los extremos).
   */
  private solveCablePosition(entry: CableEntry): void {
    const { bodies, restLength } = entry;
    const n = bodies.length;
    if (n < 2) return;

    const p = bodies.map((b) => b.translation());
    const segLen: number[] = [];
    for (let i = 0; i < n - 1; i++) {
      segLen.push(Math.hypot(p[i].x - p[i + 1].x, p[i].y - p[i + 1].y, p[i].z - p[i + 1].z));
    }
    const C = segLen.reduce((a, b) => a + b, 0) - restLength;
    if (C <= 0) return;

    const J = this.cableGradients(p);
    const im = bodies.map((b) => (b.isDynamic() ? 1 / b.mass() : 0));
    let effMass = 0;
    for (let i = 0; i < n; i++) effMass += im[i] * (J[i].x ** 2 + J[i].y ** 2 + J[i].z ** 2);
    if (effMass <= 0) return;

    const lambda = -C / effMass;
    for (let i = 0; i < n; i++) {
      if (im[i] <= 0) continue;
      let dx = im[i] * lambda * J[i].x;
      let dy = im[i] * lambda * J[i].y;
      let dz = im[i] * lambda * J[i].z;
      // No cruzar una polea adyacente en un solo paso.
      const adj = Math.min(
        i > 0 ? segLen[i - 1] : Infinity,
        i < n - 1 ? segLen[i] : Infinity,
      );
      const mag = Math.hypot(dx, dy, dz);
      const max = 0.9 * adj;
      if (mag > max && mag > 0) {
        const s = max / mag;
        dx *= s; dy *= s; dz *= s;
      }
      bodies[i].setTranslation({ x: p[i].x + dx, y: p[i].y + dy, z: p[i].z + dz }, true);
    }
  }

  private addJoint(joint: Joint): void {
    if (!this.world) return;
    const a = this.bodies.get(joint.bodyAId);
    const b = this.bodies.get(joint.bodyBId);
    if (!a || !b) return;

    // Ancla local a cada cuerpo (sin escala; el frame del cuerpo no la tiene).
    const anchorA = this.localAnchor(a.obj, joint.anchor);
    const anchorB = this.localAnchor(b.obj, joint.anchor);
    // Eje en el frame local del cuerpo A.
    const axisLocalA = axisVector(joint.axis).applyQuaternion(
      a.obj.mesh.quaternion.clone().invert(),
    );
    const axis = { x: axisLocalA.x, y: axisLocalA.y, z: axisLocalA.z };

    const params =
      joint.kind === "revolute"
        ? RAPIER.JointData.revolute(anchorA, anchorB, axis)
        : RAPIER.JointData.prismatic(anchorA, anchorB, axis);

    const handle = this.world.createImpulseJoint(
      params,
      a.body,
      b.body,
      true,
    ) as RAPIER.UnitImpulseJoint;

    // Las piezas unidas por una articulacion no deben colisionar entre si
    // (si no, se bloquean en el pivote).
    handle.setContactsEnabled(false);

    if (joint.limitsEnabled) {
      const [min, max] =
        joint.kind === "revolute"
          ? [joint.min * DEG2RAD, joint.max * DEG2RAD]
          : [joint.min * S, joint.max * S];
      handle.setLimits(min, max);
    }

    if (joint.motor.enabled) {
      const vel =
        joint.kind === "revolute"
          ? joint.motor.targetVel * DEG2RAD
          : joint.motor.targetVel * S;
      handle.configureMotorVelocity(vel, joint.motor.factor);
    }
  }

  /** Convierte un punto mundial (cm) al frame local del cuerpo (metros). */
  private localAnchor(obj: SceneObject, worldCm: THREE.Vector3): {
    x: number;
    y: number;
    z: number;
  } {
    const rel = worldCm.clone().sub(obj.mesh.position);
    rel.applyQuaternion(obj.mesh.quaternion.clone().invert());
    rel.multiplyScalar(S);
    return { x: rel.x, y: rel.y, z: rel.z };
  }

  private addBody(obj: SceneObject): void {
    if (!this.world) return;
    const dynamic = obj.physics.massKg > 0 && !obj.physics.fixed;

    const desc = dynamic
      ? RAPIER.RigidBodyDesc.dynamic()
      : RAPIER.RigidBodyDesc.fixed();
    const p = obj.mesh.position;
    desc.setTranslation(p.x * S, p.y * S, p.z * S);
    const q = obj.mesh.quaternion;
    desc.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w });

    const body = this.world.createRigidBody(desc);
    this.world.createCollider(this.colliderDesc(obj), body);
    if (dynamic) body.setAdditionalMass(obj.physics.massKg, true);

    this.bodies.set(obj.id, { body, obj });
  }

  private colliderDesc(obj: SceneObject): RAPIER.ColliderDesc {
    const size = obj.localSize();
    const hx = (size.x / 2) * S;
    const hy = (size.y / 2) * S;
    const hz = (size.z / 2) * S;
    const r = Math.max(hx, hz);
    let desc: RAPIER.ColliderDesc;
    switch (obj.params.kind) {
      case "cylinder":
        desc = RAPIER.ColliderDesc.cylinder(hy, r);
        break;
      case "cone":
        desc = RAPIER.ColliderDesc.cone(hy, r);
        break;
      case "sphere":
        desc = RAPIER.ColliderDesc.ball(Math.max(hx, hy, hz));
        break;
      case "torus":
        desc = RAPIER.ColliderDesc.cylinder(Math.max(hy, hz), r);
        break;
      default: // box / plane
        desc = RAPIER.ColliderDesc.cuboid(hx, Math.max(hy, 0.005), hz);
    }
    return desc.setRestitution(0.05).setFriction(0.8);
  }

  /** Avanza la simulacion y sincroniza las mallas (convirtiendo m -> cm). */
  step(): void {
    if (!this.world) return;
    this.world.step();
    // Cable: primero corrige velocidades, luego proyecta posiciones para
    // conservar la longitud de forma dura (cable inextensible).
    if (this.cables.length > 0) {
      for (let it = 0; it < 8; it++) {
        for (const c of this.cables) this.solveCableVelocity(c);
      }
      for (let it = 0; it < 6; it++) {
        for (const c of this.cables) this.solveCablePosition(c);
      }
    }
    for (const { body, obj } of this.bodies.values()) {
      if (body.isFixed()) continue;
      const t = body.translation();
      obj.mesh.position.set(t.x / S, t.y / S, t.z / S);
      const r = body.rotation();
      obj.mesh.quaternion.set(r.x, r.y, r.z, r.w);
    }
  }

  dispose(): void {
    this.world?.free();
    this.world = null;
    this.bodies.clear();
    this.cables = [];
  }
}

function norm(x: number, y: number, z: number): { x: number; y: number; z: number } {
  const len = Math.hypot(x, y, z) || 1;
  return { x: x / len, y: y / len, z: z / len };
}
