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
   * Restriccion de cable inextensible y unilateral, a nivel de VELOCIDAD.
   * Acopla los dos extremos a lo largo de sus segmentos terminales; las poleas
   * intermedias son puntos de paso. Solo tira (lambda <= 0): si hay holgura no
   * hace nada. La conservacion de longitud se afianza luego con solveCablePosition.
   */
  private solveCableVelocity(entry: CableEntry): void {
    if (!this.world) return;
    const { bodies, restLength } = entry;
    const n = bodies.length;
    const A = bodies[0];
    const B = bodies[n - 1];
    const imA = A.isDynamic() ? 1 / A.mass() : 0;
    const imB = B.isDynamic() ? 1 / B.mass() : 0;
    const im = imA + imB;
    if (im <= 0) return;

    const L = this.cableLength(bodies);
    if (L <= restLength) return; // holgura: el cable no empuja

    const uA = this.endDir(bodies, 0);
    const uB = this.endDir(bodies, n - 1);
    const vA = A.linvel();
    const vB = B.linvel();
    const vrel = uA.x * vA.x + uA.y * vA.y + uA.z * vA.z + uB.x * vB.x + uB.y * vB.y + uB.z * vB.z;
    if (vrel <= 0) return; // ya no se esta alargando

    const lambda = -vrel / im;
    if (imA > 0) {
      const k = imA * lambda;
      A.setLinvel({ x: vA.x + uA.x * k, y: vA.y + uA.y * k, z: vA.z + uA.z * k }, true);
    }
    if (imB > 0) {
      const k = imB * lambda;
      B.setLinvel({ x: vB.x + uB.x * k, y: vB.y + uB.y * k, z: vB.z + uB.z * k }, true);
    }
  }

  /**
   * Proyeccion de POSICION: si el cable supera su longitud de reposo, acerca los
   * extremos a sus poleas (repartiendo por masa inversa) para conservar la
   * longitud de forma dura. Es lo que evita que el cable se estire.
   */
  private solveCablePosition(entry: CableEntry): void {
    const { bodies, restLength } = entry;
    const n = bodies.length;
    const A = bodies[0];
    const B = bodies[n - 1];
    const imA = A.isDynamic() ? 1 / A.mass() : 0;
    const imB = B.isDynamic() ? 1 / B.mass() : 0;
    const im = imA + imB;
    if (im <= 0) return;

    const C = this.cableLength(bodies) - restLength;
    if (C <= 0) return; // holgura

    const pA = A.translation();
    const wA = bodies[1].translation();
    const pB = B.translation();
    const wB = bodies[n - 2].translation();
    const segA = Math.hypot(pA.x - wA.x, pA.y - wA.y, pA.z - wA.z);
    const segB = Math.hypot(pB.x - wB.x, pB.y - wB.y, pB.z - wB.z);

    // Reduccion deseada por masa inversa, con tope para no acortar un segmento
    // por debajo de 0: si un lado se agota, el sobrante mueve el otro extremo.
    let rA = imA > 0 ? (imA / im) * C : 0;
    let rB = imB > 0 ? (imB / im) * C : 0;
    if (imA === 0) rB = C;
    if (imB === 0) rA = C;
    if (rA > segA) { rB += rA - segA; rA = segA; }
    if (rB > segB) { rA = Math.min(segA, rA + (rB - segB)); rB = segB; }

    if (imA > 0 && rA > 0) {
      const uA = norm(pA.x - wA.x, pA.y - wA.y, pA.z - wA.z);
      const s = segA - rA;
      A.setTranslation({ x: wA.x + uA.x * s, y: wA.y + uA.y * s, z: wA.z + uA.z * s }, true);
    }
    if (imB > 0 && rB > 0) {
      const uB = norm(pB.x - wB.x, pB.y - wB.y, pB.z - wB.z);
      const s = segB - rB;
      B.setTranslation({ x: wB.x + uB.x * s, y: wB.y + uB.y * s, z: wB.z + uB.z * s }, true);
    }
  }

  /** Direccion unitaria del segmento terminal en el extremo `idx` (hacia su polea). */
  private endDir(bodies: RAPIER.RigidBody[], idx: number): { x: number; y: number; z: number } {
    const inner = idx === 0 ? 1 : bodies.length - 2;
    const p = bodies[idx].translation();
    const w = bodies[inner].translation();
    return norm(p.x - w.x, p.y - w.y, p.z - w.z);
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
