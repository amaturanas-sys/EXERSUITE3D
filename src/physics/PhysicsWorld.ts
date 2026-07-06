import type * as R from "@dimforge/rapier3d-compat";
import * as THREE from "three";

// Rapier (~2,2 MB de WASM en base64) se importa dinamicamente al iniciar la
// PRIMERA simulacion: disenar no lo necesita y el arranque queda mas ligero.
let RAPIER: typeof R;
import type { SceneObject } from "../objects/SceneObject";
import { pathIsStraight } from "../objects/linePieces";
import { axisVector, type Joint } from "./joints";
import type { Cable } from "./cables";

const DEG2RAD = Math.PI / 180;

interface CableEntry {
  bodies: R.RigidBody[];
  /** Anclaje local de cada nodo en el frame del cuerpo, en METROS. */
  local: { x: number; y: number; z: number }[];
  restLength: number; // metros
}

// Simulacion de fisica rigida con Rapier.
// El editor trabaja en centimetros (1 unidad = 1 cm). Rapier es mas estable en
// metros, asi que internamente escalamos cm -> m con el factor S.
const S = 0.01; // cm -> m
const GRAVITY = { x: 0, y: -9.81, z: 0 };

export class PhysicsWorld {
  private static ready: Promise<void> | null = null;
  private world: R.World | null = null;
  private bodies = new Map<string, { body: R.RigidBody; obj: SceneObject }>();
  private cables: CableEntry[] = [];

  /** Importa el modulo y carga/inicializa el WASM de Rapier una sola vez. */
  static init(): Promise<void> {
    return (PhysicsWorld.ready ??= import("@dimforge/rapier3d-compat").then((m) => {
      const mod = m as unknown as { default?: typeof R };
      RAPIER = mod.default ?? (m as unknown as typeof R);
      return RAPIER.init();
    }));
  }

  /** Construye el mundo a partir del estado actual de los objetos, joints y cables. */
  build(objects: SceneObject[], joints: Joint[] = [], cables: Cable[] = []): void {
    // Libera un mundo anterior si build() se reutiliza (si no, fuga WASM y los
    // cables quedarian apuntando a cuerpos de un mundo liberado).
    this.world?.free();
    this.bodies.clear();
    this.cables = [];
    this.drag = null;
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
    const entries = cable.nodes.map((n) => this.bodies.get(n.objectId));
    if (entries.length < 2 || entries.some((e) => !e)) return;
    const bodies = entries.map((e) => e!.body);
    // Anclaje local (cm geometria) -> escala de la pieza -> metros, frame cuerpo.
    const local = cable.nodes.map((n, i) => {
      const s = entries[i]!.obj.mesh.scale;
      return { x: n.local.x * s.x * S, y: n.local.y * s.y * S, z: n.local.z * s.z * S };
    });
    const entry: CableEntry = { bodies, local, restLength: 0 };
    entry.restLength = this.cableLength(entry);
    this.cables.push(entry);
  }

  /** Posicion mundial (metros) del anclaje del nodo i: trans + rot * local. */
  private nodeWorld(entry: CableEntry, i: number): { x: number; y: number; z: number } {
    const t = entry.bodies[i].translation();
    const q = entry.bodies[i].rotation();
    const l = entry.local[i];
    // rotar l por el cuaternion q
    const ix = q.w * l.x + q.y * l.z - q.z * l.y;
    const iy = q.w * l.y + q.z * l.x - q.x * l.z;
    const iz = q.w * l.z + q.x * l.y - q.y * l.x;
    const iw = -q.x * l.x - q.y * l.y - q.z * l.z;
    return {
      x: t.x + (ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y),
      y: t.y + (iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z),
      z: t.z + (iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x),
    };
  }

  private cableLength(entry: CableEntry): number {
    let L = 0;
    for (let i = 0; i < entry.bodies.length - 1; i++) {
      const a = this.nodeWorld(entry, i);
      const b = this.nodeWorld(entry, i + 1);
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
    if (this.cableLength(entry) <= restLength) return;

    const p = bodies.map((_, i) => this.nodeWorld(entry, i));
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

    const p = bodies.map((_, i) => this.nodeWorld(entry, i));
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
      // El delta se aplica al CENTRO del cuerpo (el anclaje se mueve con el).
      const c = bodies[i].translation();
      bodies[i].setTranslation({ x: c.x + dx, y: c.y + dy, z: c.z + dz }, true);
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
    const qA = a.obj.mesh.quaternion;
    const qB = b.obj.mesh.quaternion;
    // Eje en el frame local del cuerpo A.
    const axisLocalA = axisVector(joint.axis).applyQuaternion(qA.clone().invert());
    const axis = { x: axisLocalA.x, y: axisLocalA.y, z: axisLocalA.z };

    // RAPIER.JointData.revolute/prismatic aplican el MISMO eje local a ambos
    // cuerpos: si sus orientaciones de diseno difieren, el solver reorienta B
    // de golpe al arrancar para alinear los frames. Cuando las orientaciones ya
    // son compatibles usamos el joint directo (camino probado); si no,
    // interponemos un ADAPTADOR: un cuerpecillo con la orientacion de A,
    // articulado con A y soldado a B con un joint fijo (que si admite frames
    // por cuerpo), de modo que B conserva su orientacion de diseno.
    const axisLocalB = axisVector(joint.axis).applyQuaternion(qB.clone().invert());
    const compatible =
      joint.kind === "revolute"
        ? axisLocalA.angleTo(axisLocalB) < 1e-3 // giro libre alrededor del eje
        : qA.angleTo(qB) < 1e-3; // la corredera bloquea toda rotacion relativa

    let handle: R.UnitImpulseJoint;
    if (compatible) {
      const params =
        joint.kind === "revolute"
          ? RAPIER.JointData.revolute(anchorA, anchorB, axis)
          : RAPIER.JointData.prismatic(anchorA, anchorB, axis);
      handle = this.world.createImpulseJoint(params, a.body, b.body, true) as
        R.UnitImpulseJoint;
      handle.setContactsEnabled(false);
    } else {
      handle = this.addJointViaAdapter(joint, a, b, anchorA, anchorB, axis);
    }

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

  /**
   * Crea la articulacion a traves de un cuerpo adaptador para respetar la
   * orientacion de diseno de ambas piezas: A —(bisagra/corredera)— adaptador
   * —(fijo con frames)— B. Devuelve el joint articulado (para limites/motor).
   */
  private addJointViaAdapter(
    joint: Joint,
    a: { body: R.RigidBody; obj: SceneObject },
    b: { body: R.RigidBody; obj: SceneObject },
    anchorA: { x: number; y: number; z: number },
    anchorB: { x: number; y: number; z: number },
    axis: { x: number; y: number; z: number },
  ): R.UnitImpulseJoint {
    const world = this.world!;
    const qA = a.obj.mesh.quaternion;
    const qB = b.obj.mesh.quaternion;

    // Adaptador: cuerpo diminuto en el punto de ancla, orientado como A (asi el
    // eje local de A vale tambien para el). Masa/inercia pequenas: va soldado a
    // B, no aporta dinamica apreciable.
    const w = joint.anchor.clone().multiplyScalar(S);
    const desc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(w.x, w.y, w.z)
      .setRotation({ x: qA.x, y: qA.y, z: qA.z, w: qA.w })
      .setAdditionalMassProperties(
        0.05,
        { x: 0, y: 0, z: 0 },
        { x: 1e-4, y: 1e-4, z: 1e-4 },
        { x: 0, y: 0, z: 0, w: 1 },
      );
    const adapter = world.createRigidBody(desc);

    const zero = { x: 0, y: 0, z: 0 };
    const params =
      joint.kind === "revolute"
        ? RAPIER.JointData.revolute(anchorA, zero, axis)
        : RAPIER.JointData.prismatic(anchorA, zero, axis);
    const unit = world.createImpulseJoint(params, a.body, adapter, true) as
      R.UnitImpulseJoint;
    unit.setContactsEnabled(false);

    // Soldadura adaptador->B conservando la pose relativa actual: el frame de
    // la union en mundo es la identidad, luego frame1 = qA^-1 y frame2 = qB^-1.
    const f1 = qA.clone().invert();
    const f2 = qB.clone().invert();
    const weld = world.createImpulseJoint(
      RAPIER.JointData.fixed(
        zero,
        { x: f1.x, y: f1.y, z: f1.z, w: f1.w },
        anchorB,
        { x: f2.x, y: f2.y, z: f2.z, w: f2.w },
      ),
      adapter,
      b.body,
      true,
    );
    weld.setContactsEnabled(false);

    // El flag de contactos solo filtra pares unidos DIRECTAMENTE por un joint:
    // registra un joint de cuerda inerte (longitud enorme) entre A y B para
    // que tampoco colisionen entre si en el pivote.
    const rope = world.createImpulseJoint(
      RAPIER.JointData.rope(1e6, anchorA, anchorB),
      a.body,
      b.body,
      true,
    );
    rope.setContactsEnabled(false);

    return unit;
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
    const massKg = obj.effectiveMassKg();
    const dynamic = massKg > 0 && !obj.physics.fixed;

    const desc = dynamic
      ? RAPIER.RigidBodyDesc.dynamic()
      : RAPIER.RigidBodyDesc.fixed();
    const p = obj.mesh.position;
    desc.setTranslation(p.x * S, p.y * S, p.z * S);
    const q = obj.mesh.quaternion;
    desc.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w });

    const body = this.world.createRigidBody(desc);
    this.world.createCollider(this.colliderDesc(obj), body);
    if (dynamic) body.setAdditionalMass(massKg, true);

    this.bodies.set(obj.id, { body, obj });
  }

  private colliderDesc(obj: SceneObject): R.ColliderDesc {
    const size = obj.localSize();
    const hx = (size.x / 2) * S;
    const hy = (size.y / 2) * S;
    const hz = (size.z / 2) * S;
    const r = Math.max(hx, hz);
    let desc: R.ColliderDesc;
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
        // El bbox exacto (cuboid) representa el aro mejor que un cilindro de
        // eje Y: el torus de three vive en el plano XY (fondo fino en Z).
        desc = RAPIER.ColliderDesc.cuboid(hx, hy, hz);
        break;
      case "tube":
        // Tubo recto: cilindro exacto; doblado: bbox de la forma barrida.
        desc = pathIsStraight(obj.params.path)
          ? RAPIER.ColliderDesc.cylinder(hy, r)
          : RAPIER.ColliderDesc.cuboid(hx, hy, hz);
        break;
      default: // box / plane / beam
        desc = RAPIER.ColliderDesc.cuboid(hx, Math.max(hy, 0.005), hz);
    }
    // La geometria puede estar descentrada respecto al origen del cuerpo
    // (doblados, barridos): alinea el collider con el centro real del bbox.
    const geo = obj.mesh.geometry;
    if (!geo.boundingBox) geo.computeBoundingBox();
    const center = geo.boundingBox!.getCenter(new THREE.Vector3());
    if (center.lengthSq() > 1e-8) {
      const s = obj.mesh.scale;
      desc.setTranslation(center.x * s.x * S, center.y * s.y * S, center.z * s.z * S);
    }
    return desc.setRestitution(0.05).setFriction(0.8);
  }

  // ------------------------------------------------- mano interactiva
  /** Agarre activo: cuerpo, punto local (m) y objetivo del arrastre (m). */
  private drag: {
    body: R.RigidBody;
    local: THREE.Vector3;
    target: THREE.Vector3;
  } | null = null;

  /**
   * Agarra una pieza dinámica por el punto de mundo dado (cm), como una mano.
   * Devuelve false si la pieza no existe o no es dinámica.
   */
  grab(objectId: string, worldCm: THREE.Vector3): boolean {
    const e = this.bodies.get(objectId);
    if (!e || !e.body.isDynamic()) return false;
    const t = e.body.translation();
    const q = e.body.rotation();
    const worldM = worldCm.clone().multiplyScalar(S);
    const local = worldM
      .clone()
      .sub(new THREE.Vector3(t.x, t.y, t.z))
      .applyQuaternion(new THREE.Quaternion(q.x, q.y, q.z, q.w).invert());
    this.drag = { body: e.body, local, target: worldM };
    return true;
  }

  /** Mueve el objetivo de la mano (cm). */
  dragTo(worldCm: THREE.Vector3): void {
    if (this.drag) this.drag.target.copy(worldCm).multiplyScalar(S);
  }

  /** Suelta la pieza agarrada. */
  release(): void {
    this.drag = null;
  }

  isDragging(): boolean {
    return this.drag !== null;
  }

  /**
   * Resorte amortiguado de la mano, aplicado como impulso en el punto de
   * agarre en cada paso fijo: tira de la pieza hacia el objetivo sin volverse
   * inestable (aceleración limitada), permitiendo que la pieza rote/palanquee
   * como lo haría empujada por una persona.
   */
  private applyDrag(dt: number): void {
    const d = this.drag;
    if (!d) return;
    const t = d.body.translation();
    const q = d.body.rotation();
    const pw = d.local
      .clone()
      .applyQuaternion(new THREE.Quaternion(q.x, q.y, q.z, q.w))
      .add(new THREE.Vector3(t.x, t.y, t.z));
    const v = d.body.linvel();
    const kp = 60; // rigidez del resorte (1/s^2)
    const kd = 12; // amortiguación (1/s)
    const acc = new THREE.Vector3(
      (d.target.x - pw.x) * kp - v.x * kd,
      (d.target.y - pw.y) * kp - v.y * kd,
      (d.target.z - pw.z) * kp - v.z * kd,
    );
    const maxAcc = 60; // m/s^2 (~6g): mano firme pero no un motor infinito
    if (acc.length() > maxAcc) acc.setLength(maxAcc);
    const m = d.body.mass();
    d.body.applyImpulseAtPoint(
      { x: acc.x * m * dt, y: acc.y * m * dt, z: acc.z * m * dt },
      { x: pw.x, y: pw.y, z: pw.z },
      true,
    );
  }

  /** Acumulador de tiempo real para avanzar con pasos fijos de 1/60 s. */
  private accumulator = 0;
  private static readonly FIXED_DT = 1 / 60;

  /**
   * Avanza la simulacion en tiempo real y sincroniza las mallas (m -> cm).
   * `dtSeconds` es el tiempo transcurrido desde el frame anterior: se acumula y
   * se ejecutan pasos fijos de 1/60 s, para que la velocidad de la fisica no
   * dependa del refresco del monitor (60/120/144 Hz) ni de bajones de FPS.
   */
  step(dtSeconds: number = PhysicsWorld.FIXED_DT): void {
    if (!this.world) return;
    // Limita el dt (pestana en segundo plano, hipos) para no espiralar: como
    // mucho 2 pasos por frame — si el equipo no llega, la simulacion va a
    // camara ligeramente lenta pero SIN tirones (espiral de la muerte).
    this.accumulator = Math.min(this.accumulator + dtSeconds, 2 * PhysicsWorld.FIXED_DT);
    while (this.accumulator >= PhysicsWorld.FIXED_DT) {
      this.accumulator -= PhysicsWorld.FIXED_DT;
      this.applyDrag(PhysicsWorld.FIXED_DT);
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
    this.drag = null;
  }
}

function norm(x: number, y: number, z: number): { x: number; y: number; z: number } {
  const len = Math.hypot(x, y, z) || 1;
  return { x: x / len, y: y / len, z: z / len };
}
