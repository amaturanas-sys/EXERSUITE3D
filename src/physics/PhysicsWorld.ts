import RAPIER from "@dimforge/rapier3d-compat";
import * as THREE from "three";
import type { SceneObject } from "../objects/SceneObject";
import { axisVector, type Joint } from "./joints";

const DEG2RAD = Math.PI / 180;

// Simulacion de fisica rigida con Rapier.
// El editor trabaja en centimetros (1 unidad = 1 cm). Rapier es mas estable en
// metros, asi que internamente escalamos cm -> m con el factor S.
const S = 0.01; // cm -> m
const GRAVITY = { x: 0, y: -9.81, z: 0 };

export class PhysicsWorld {
  private static ready: Promise<void> | null = null;
  private world: RAPIER.World | null = null;
  private bodies = new Map<string, { body: RAPIER.RigidBody; obj: SceneObject }>();

  /** Carga e inicializa el WASM de Rapier una sola vez. */
  static init(): Promise<void> {
    return (PhysicsWorld.ready ??= RAPIER.init());
  }

  /** Construye el mundo a partir del estado actual de los objetos y joints. */
  build(objects: SceneObject[], joints: Joint[] = []): void {
    this.world = new RAPIER.World(GRAVITY);

    // Suelo fijo: cara superior en y = 0.
    const ground = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(50, 0.5, 50).setTranslation(0, -0.5, 0),
      ground,
    );

    for (const obj of objects) this.addBody(obj);
    for (const joint of joints) this.addJoint(joint);
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
  }
}
