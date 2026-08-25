import type * as R from "@dimforge/rapier3d-compat";
import * as THREE from "three";

// Rapier (~2,2 MB de WASM en base64) se importa dinamicamente al iniciar la
// PRIMERA simulacion: disenar no lo necesita y el arranque queda mas ligero.
let RAPIER: typeof R;
import type { SceneObject } from "../objects/SceneObject";
import { cuerdasColision, pathIsStraight } from "../objects/linePieces";
import { getDefinition } from "../objects/componentLibrary";
import { cajasDentada } from "../objects/placaDentada";
import { espejoDe } from "../objects/espejar";
import { axisVector, type Joint } from "./joints";
import type { Cable } from "./cables";

const DEG2RAD = Math.PI / 180;

/**
 * Cuerda de seguridad vista por el motor: extremos en MUNDO (cm) con la
 * pieza de anclaje de cada uno (para amarrar la junta a su cuerpo), caída
 * inicial de la catenaria (la TENSIÓN de partida de los extremos) y radio
 * del eslabón.
 */
export interface RopeFisica {
  id: string;
  a: [number, number, number];
  b: [number, number, number];
  aId: string | null;
  bId: string | null;
  sag: number;
  radio: number;
}

interface CableEntry {
  bodies: R.RigidBody[];
  /** Anclaje local de cada nodo en el frame del cuerpo, en METROS. */
  local: { x: number; y: number; z: number }[];
  restLength: number; // metros
  /**
   * TOPE del terminal (v0.2.9): longitud mínima del primer y último
   * segmento — el accesorio del extremo no puede pasar por la roldana
   * vecina, igual que el tope de goma de una máquina real. Sin esto, el
   * extremo más liviano (p. ej. el remo) se "roba" el recorrido del cable
   * y la transmisión al contrapeso queda parcial.
   */
  topeIni: number; // metros (0 = sin tope)
  topeFin: number;
  /**
   * FRENOS engarzados (v0.2.40): esferas que viajan con el cable y no pasan
   * por una roldana. Cada uno parte el recorrido en dos tramos cuyas
   * longitudes quedan acotadas: antes del freno como mucho `s` metros de
   * cable, después como mucho `restLength - s`.
   */
  topes: { seg: number; s: number }[];
}

// Simulacion de fisica rigida con Rapier.
// El editor trabaja en centimetros (1 unidad = 1 cm). Rapier es mas estable en
// metros, asi que internamente escalamos cm -> m con el factor S.
const S = 0.01; // cm -> m

/** Segmentos del maniquí que NO reciben cuerpo: son sus puntos de agarre. */
const SEGMENTOS_SIN_CUERPO = new Set(["mano-L", "mano-R", "pie-L", "pie-R"]);
const GRAVITY = { x: 0, y: -9.81, z: 0 };

export class PhysicsWorld {
  private static ready: Promise<void> | null = null;
  private world: R.World | null = null;
  private bodies = new Map<string, { body: R.RigidBody; obj: SceneObject }>();
  private cables: CableEntry[] = [];
  /**
   * ROLDANAS EMPOTRADAS (v0.2.8): una roldana adosada a una pieza forma un
   * CUERPO RÍGIDO COMPUESTO con ella — si la estructura es móvil, la roldana
   * viaja con ella y la tensión del cable que la recorre actúa directamente
   * sobre la estructura (así el puente de un sistema de poleas sube y baja
   * según la tensión). Se guarda la pose relativa de diseño para reproyectar
   * la malla de la roldana desde el cuerpo del anfitrión en cada paso.
   */
  private empotradas: {
    obj: SceneObject;
    host: R.RigidBody;
    /** Pose relativa de diseño (frame del anfitrión, metros). */
    relPos: { x: number; y: number; z: number };
    relQ: { x: number; y: number; z: number; w: number };
  }[] = [];
  private empotradaPorId = new Map<string, PhysicsWorld["empotradas"][number]>();
  /**
   * AVISOS de armado (v0.2.34): incoherencias detectadas al construir el
   * mundo que el diseñador debe conocer porque cambian el comportamiento sin
   * romper nada (p. ej. una pieza anclada soldada a un brazo móvil ancla el
   * brazo entero). La UI los muestra al arrancar la simulación.
   */
  private avisos: string[] = [];
  /** Masa adicional acumulada por cuerpo (para sumar roldanas empotradas). */
  private masaExtra = new Map<R.RigidBody, number>();
  /** Cuerpos dinámicos colgados de algún cable (para la esticción). */
  private cuerposCable = new Set<R.RigidBody>();
  /** Posiciones al inicio del subpaso (esticción posicional). */
  private posAntes = new Map<R.RigidBody, { x: number; y: number; z: number }>();
  /** Extremos de cable CONGELADOS en su tope (parqueados contra la roldana
   *  hasta que la mano los agarre) — evita que el tope bombee contra el
   *  solver en reposo. */
  private topeCongelados = new Set<R.RigidBody>();
  /** Posiciones justo antes de la corrección POSICIONAL del cable, para poder
   *  barrer el desplazamiento neto y no atravesar nada. */
  private posCable = new Map<R.RigidBody, { x: number; y: number; z: number }>();
  /** Pares de cuerpos cuyo contacto está APAGADO por su unión: el barrido
   *  anti-atravesamiento debe ignorarlos igual que los ignora el motor. */
  private sinContacto = new Map<R.RigidBody, Set<R.RigidBody>>();

  /**
   * BISAGRA QUE GOBIERNA A CADA CUERPO (v0.2.38). Para cada cuerpo dinámico
   * articulado por una revoluta libre se guarda su eje: el ancla y la
   * dirección EN EL FRAME DE LA OTRA PIEZA, de modo que si esa otra pieza
   * también se mueve (una bisagra montada sobre un brazo) el eje se recalcula
   * bien en cada consulta. Lo usa la mano interactiva para tirar SIGUIENDO EL
   * ARCO en vez de contra el pasador.
   */
  private bisagras = new Map<
    R.RigidBody,
    { ref: R.RigidBody; ancla: { x: number; y: number; z: number }; eje: { x: number; y: number; z: number } }
  >();

  /** Importa el modulo y carga/inicializa el WASM de Rapier una sola vez. */
  static init(): Promise<void> {
    return (PhysicsWorld.ready ??= import("@dimforge/rapier3d-compat").then((m) => {
      const mod = m as unknown as { default?: typeof R };
      RAPIER = mod.default ?? (m as unknown as typeof R);
      return RAPIER.init();
    }));
  }

  /** Construye el mundo a partir del estado actual de los objetos, joints y cables. */
  build(
    objects: SceneObject[],
    joints: Joint[] = [],
    cables: Cable[] = [],
    ropes: RopeFisica[] = [],
  ): void {
    // Libera un mundo anterior si build() se reutiliza (si no, fuga WASM y los
    // cables quedarian apuntando a cuerpos de un mundo liberado).
    this.world?.free();
    this.bodies.clear();
    this.bisagras.clear();
    this.cables = [];
    this.guias = [];
    this.empotradas = [];
    this.empotradaPorId.clear();
    this.avisos = [];
    this.masaExtra.clear();
    this.cuerposCable.clear();
    this.topeCongelados.clear();
    this.posCable.clear();
    this.sinContacto.clear();
    this.figura = [];
    this.drag = null;
    this.cuerdasSim.clear();
    this.world = new RAPIER.World(GRAVITY);
    // Cadenas flexibles bajo barras pesadas (razones de masa ~1000:1): más
    // iteraciones del solver mantienen firmes las juntas de los eslabones.
    if ("numSolverIterations" in this.world) {
      (this.world as unknown as { numSolverIterations: number }).numSolverIterations = 12;
    }
    // CCD reforzado (v0.2.19): las piezas rápidas y delgadas (una barra
    // cargada en caída libre) reciben hasta 4 subpasos de barrido — sin
    // esto, a 60 fps un cuerpo recorre ~20 cm por paso y atraviesa cadenas.
    this.world.integrationParameters.maxCcdSubsteps = 4;

    // Suelo fijo: cara superior en y = 0. LOSA GRUESA (v0.2.14): 10 m de
    // espesor — una pieza delgada y rápida (una barra cargada que cae desde
    // el rack) no puede atravesarla entre dos pasos del solver, como sí
    // ocurría con la losa de 1 m.
    const ground = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(60, 5, 60).setTranslation(0, -5, 0),
      ground,
    );

    // SOLDADURAS (v0.2.32): las uniones BLOQUEADAS no son articulaciones —
    // son soldaduras. Sus piezas se funden en UN cuerpo rígido antes de
    // crear nada, así un brazo compuesto (brazo + extensión soldada) pivota
    // como una sola pieza en lugar de pelearse consigo mismo.
    const soldadas = this.agruparSoldadas(objects, joints);
    for (const obj of objects) {
      if (soldadas.anfitrionDe.get(obj.id) === obj.id || !soldadas.anfitrionDe.has(obj.id)) {
        this.addBody(obj, soldadas.masaDe.get(obj.id));
      }
    }
    this.fundirSoldadas(objects, soldadas);
    // Antes de juntas y cables: las roldanas adosadas se FUNDEN con el cuerpo
    // de su estructura (los nodos de cable que las referencien resolverán al
    // cuerpo compuesto).
    this.detectarEmpotradas();
    // Los accesorios de calce (jotas, brazos, anclajes) montados en una
    // estructura con pinholes forman GRUPO con ella: fijados, no se caen.
    this.detectarCalzados();
    // Las uniones bloqueadas ya están resueltas como soldadura rígida: crear
    // además su joint solo introduciría una restricción redundante que pelea
    // con el resto del ensamblaje.
    for (const joint of joints) {
      if (joint.locked && soldadas.anfitrionDe.has(joint.bodyAId)) continue;
      this.addJoint(joint);
    }
    for (const cable of cables) this.addCable(cable);
    // CADENAS Y CORREAS DE SEGURIDAD (v0.2.15): cuerdas FLEXIBLES de verdad
    // — eslabones dinámicos articulados, amarrados a sus piezas de anclaje.
    for (const r of ropes) this.addRopeFlexible(r);
    this.detectarGuias();
  }

  /** Eslabones simulados de cada cuerda (para reproyectar el visual). */
  private cuerdasSim = new Map<string, { cuerpos: R.RigidBody[]; medios: number[] }>();

  /**
   * CADENA/CORREA DE SEGURIDAD FLEXIBLE (v0.2.15): la cuerda se simula como
   * una cadena de CÁPSULAS DINÁMICAS articuladas por juntas esféricas y
   * amarrada por sus extremos a los cuerpos de las piezas de anclaje (fijas
   * o móviles). La catenaria inicial solo define la TENSIÓN de partida de
   * los extremos: a partir de ahí la cuerda cuelga, ondula y se deforma con
   * lo que la toca — una barra que cae sobre ella la hunde y queda mecida
   * en la cadena, como en la máquina real.
   */
  private addRopeFlexible(r: RopeFisica): void {
    if (!this.world) return;
    const a = new THREE.Vector3(r.a[0], r.a[1], r.a[2]);
    const b = new THREE.Vector3(r.b[0], r.b[1], r.b[2]);
    const D = a.distanceTo(b);
    if (D < 2) return;
    const sag = r.sag; // caída inicial (cm), misma parábola del visual
    const rr = sag / D;
    const arco = D * (1 + (8 / 3) * rr * rr); // longitud de la cuerda (cm)
    const N = THREE.MathUtils.clamp(Math.round(arco / 6), 4, 30);
    const punto = (t: number): THREE.Vector3 => {
      const p = a.clone().lerp(b, t);
      p.y -= 4 * sag * t * (1 - t);
      return p;
    };
    const radio = Math.max(0.8, r.radio) * S;
    // Masa de cadena INDUSTRIAL (~6 kg/m) repartida entre eslabones: la
    // razón de masas contra una barra cargada (100+ kg) se mantiene a raya
    // y las juntas no se estiran — el precio del realismo del solver.
    const masaLink = Math.max(0.2, (arco * S * 6) / N);
    const up = new THREE.Vector3(0, 1, 0);
    const cuerpos: R.RigidBody[] = [];
    const medios: number[] = [];
    for (let i = 0; i < N; i++) {
      const p0 = punto(i / N);
      const p1 = punto((i + 1) / N);
      const medio = p0.clone().add(p1).multiplyScalar(0.5).multiplyScalar(S);
      const largo = Math.max(p0.distanceTo(p1) * S, 0.01);
      const q = new THREE.Quaternion().setFromUnitVectors(
        up,
        p1.clone().sub(p0).normalize(),
      );
      // Amortiguación alta: una cadena real DISIPA el golpe (los eslabones
      // rozan entre sí) — sin ella, la elasticidad de las juntas devuelve
      // la barra como un trampolín.
      const bd = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(medio.x, medio.y, medio.z)
        .setRotation({ x: q.x, y: q.y, z: q.z, w: q.w })
        .setLinearDamping(3.5)
        .setAngularDamping(2.5)
        .setCcdEnabled(true);
      const body = this.world.createRigidBody(bd);
      this.world.createCollider(
        RAPIER.ColliderDesc.capsule(largo / 2, radio)
          .setDensity(0)
          .setRestitution(0)
          .setFriction(1.0),
        body,
      );
      body.setAdditionalMass(masaLink, true);
      cuerpos.push(body);
      medios.push(largo / 2);
    }
    // Juntas esféricas eslabón↔eslabón (sin contacto entre vecinos).
    for (let i = 1; i < N; i++) {
      const jd = RAPIER.JointData.spherical(
        { x: 0, y: medios[i - 1], z: 0 },
        { x: 0, y: -medios[i], z: 0 },
      );
      const j = this.world.createImpulseJoint(jd, cuerpos[i - 1], cuerpos[i], true);
      j.setContactsEnabled(false);
    }
    // Amarres de los extremos a sus piezas de anclaje.
    this.anclarCuerda(r.aId, a, cuerpos[0], -medios[0]);
    this.anclarCuerda(r.bId, b, cuerpos[N - 1], medios[N - 1]);
    this.cuerdasSim.set(r.id, { cuerpos, medios });

    // LÍMITE DE INEXTENSIBILIDAD (v0.2.19): con anclajes FIJOS, ningún
    // punto de una cuerda inextensible puede quedar fuera de la elipse
    // |PA| + |PB| = arco. El solver de juntas no resiste el impulso de una
    // barra de 180 kg en caída libre (las juntas se estiran un instante y
    // la barra se cuela); esta barrera estática invisible ES esa
    // restricción física: la cuerda flexible se deforma con normalidad por
    // dentro y la barra jamás pasa por debajo del límite real de la cadena.
    const aBody = r.aId ? this.bodies.get(r.aId)?.body : null;
    const bBody = r.bId ? this.bodies.get(r.bId)?.body : null;
    const anclajesFijos = !(aBody?.isDynamic() ?? false) && !(bBody?.isDynamic() ?? false);
    if (anclajesFijos) this.addEnvolventeCuerda(a, b, arco, radio);
  }

  /** Cápsulas estáticas sobre la elipse |PA|+|PB| = arco (rama inferior). */
  private addEnvolventeCuerda(
    a: THREE.Vector3,
    b: THREE.Vector3,
    arcoCm: number,
    radioM: number,
  ): void {
    if (!this.world) return;
    const N = THREE.MathUtils.clamp(Math.round(a.distanceTo(b) / 8), 6, 24);
    // Profundidad d bajo la cuerda tal que |P−a|+|P−b| = arco (bisección).
    const punto = (t: number): THREE.Vector3 => {
      const base = a.clone().lerp(b, t);
      let lo = 0;
      let hi = arcoCm / 2;
      for (let k = 0; k < 28; k++) {
        const d = (lo + hi) / 2;
        const p = base.clone();
        p.y -= d;
        if (p.distanceTo(a) + p.distanceTo(b) < arcoCm) lo = d;
        else hi = d;
      }
      const p = base.clone();
      p.y -= lo;
      return p;
    };
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < N; i++) {
      const p0 = punto(i / N);
      const p1 = punto((i + 1) / N);
      const medio = p0.clone().add(p1).multiplyScalar(0.5).multiplyScalar(S);
      const largo = Math.max(p0.distanceTo(p1) * S, 0.01);
      const q = new THREE.Quaternion().setFromUnitVectors(
        up,
        p1.clone().sub(p0).normalize(),
      );
      this.world.createCollider(
        RAPIER.ColliderDesc.capsule(largo / 2, radioM)
          .setTranslation(medio.x, medio.y, medio.z)
          .setRotation({ x: q.x, y: q.y, z: q.z, w: q.w })
          .setRestitution(0)
          .setFriction(1.0),
        body,
      );
    }
  }

  /** Junta esférica extremo-de-cuerda ↔ cuerpo del anclaje (o punto fijo). */
  private anclarCuerda(
    id: string | null,
    mundoCm: THREE.Vector3,
    eslabon: R.RigidBody,
    syM: number,
  ): void {
    if (!this.world) return;
    const w = mundoCm.clone().multiplyScalar(S);
    let body = id ? this.bodies.get(id)?.body ?? null : null;
    let local: { x: number; y: number; z: number };
    if (body) {
      const t = body.translation();
      const q = body.rotation();
      const inv = new THREE.Quaternion(q.x, q.y, q.z, q.w).invert();
      const v = new THREE.Vector3(w.x - t.x, w.y - t.y, w.z - t.z).applyQuaternion(inv);
      local = { x: v.x, y: v.y, z: v.z };
    } else {
      body = this.world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(w.x, w.y, w.z),
      );
      local = { x: 0, y: 0, z: 0 };
    }
    const jd = RAPIER.JointData.spherical(local, { x: 0, y: syM, z: 0 });
    const j = this.world.createImpulseJoint(jd, body, eslabon, true);
    j.setContactsEnabled(false);
  }

  /**
   * Polilínea ACTUAL de una cuerda simulada (puntos de mundo en cm): los
   * extremos de cada eslabón encadenados — el visual se reproyecta de aquí.
   */
  polilineaCuerda(id: string): THREE.Vector3[] | null {
    const e = this.cuerdasSim.get(id);
    if (!e) return null;
    const pts: THREE.Vector3[] = [];
    const u = new THREE.Vector3();
    for (let i = 0; i < e.cuerpos.length; i++) {
      const body = e.cuerpos[i];
      const t = body.translation();
      const q = body.rotation();
      u.set(0, 1, 0).applyQuaternion(new THREE.Quaternion(q.x, q.y, q.z, q.w));
      const hl = e.medios[i];
      if (i === 0) {
        pts.push(new THREE.Vector3(
          (t.x - u.x * hl) / S, (t.y - u.y * hl) / S, (t.z - u.z * hl) / S,
        ));
      }
      pts.push(new THREE.Vector3(
        (t.x + u.x * hl) / S, (t.y + u.y * hl) / S, (t.z + u.z * hl) / S,
      ));
    }
    return pts;
  }

  /**
   * Detecta cada roldana/polea ADOSADA a una pieza (su centro cae dentro del
   * volumen de la pieza, con un margen del tamaño de la roldana) y la funde
   * en un cuerpo rígido compuesto con ella:
   * - Estructura MÓVIL → la roldana viaja con ella (aunque estuviera marcada
   *   como anclada: empotrada significa solidaria) y la tensión del cable
   *   que la recorre actúa sobre la estructura — así una polea de carro o de
   *   brazo móvil transmite y recibe fuerza.
   * - Estructura FIJA y roldana dinámica → queda anclada a la estructura
   *   (no cae al vacío).
   * - Ambas fijas → ya son rígidas; no hace falta nada.
   */
  private detectarEmpotradas(): void {
    if (!this.world) return;
    // La roldana es la única polea de la biblioteca (v0.2.32); los ids
    // retirados se mantienen por compatibilidad de proyectos antiguos.
    const POLEAS = new Set(["roldana", "polea", "bloque-poleas"]);
    const entradas = [...this.bodies.entries()];
    const invH = new THREE.Quaternion();
    const v = new THREE.Vector3();
    for (const [id, e] of entradas) {
      if (!POLEAS.has(e.obj.componentId)) continue;
      // Ya fundida en un conjunto soldado: su cuerpo es el del anfitrión y
      // no debe volver a empotrarse (destruiría el cuerpo compartido).
      if (this.empotradaPorId.has(id)) continue;
      // Dimensiones LOCALES absolutas: la prueba de caja corre en el frame
      // del anfitrión y debe ser invariante al giro de la máquina completa
      // (la AABB de mundo permutaba ejes al rotar el grupo y el empotrado
      // elegía anfitriones equivocados).
      const pSize = e.obj.localSizeAbs();
      const margen = Math.max(pSize.x, pSize.y, pSize.z) / 2 + 1.5;
      let mejor: { body: R.RigidBody; obj: SceneObject } | null = null;
      let mejorD = Infinity;
      for (const [hid, h] of entradas) {
        if (hid === id || POLEAS.has(h.obj.componentId)) continue;
        const hs = h.obj.localSizeAbs();
        invH.copy(h.obj.mesh.quaternion).invert();
        v.copy(e.obj.mesh.position).sub(h.obj.mesh.position).applyQuaternion(invH);
        // Distancia firmada del centro de la roldana a la caja de la pieza.
        const d = Math.max(
          Math.abs(v.x) - hs.x / 2,
          Math.abs(v.y) - hs.y / 2,
          Math.abs(v.z) - hs.z / 2,
        );
        if (d < margen && d < mejorD) {
          mejorD = d;
          mejor = h;
        }
      }
      if (!mejor) continue;
      const hostDinamico = mejor.body.isDynamic();
      const roldanaDinamica = e.body.isDynamic();
      if (!hostDinamico && !roldanaDinamica) continue;
      // Pose relativa de diseño (frame del anfitrión, metros).
      const qH = mejor.obj.mesh.quaternion;
      const relQ = qH.clone().invert().multiply(e.obj.mesh.quaternion);
      const relPos = e.obj.mesh.position
        .clone()
        .sub(mejor.obj.mesh.position)
        .applyQuaternion(qH.clone().invert())
        .multiplyScalar(S);
      this.world.removeRigidBody(e.body);
      const entrada = {
        obj: e.obj,
        host: mejor.body,
        relPos: { x: relPos.x, y: relPos.y, z: relPos.z },
        relQ: { x: relQ.x, y: relQ.y, z: relQ.z, w: relQ.w },
      };
      this.empotradas.push(entrada);
      this.empotradaPorId.set(id, entrada);
      // Las juntas que referencien la roldana resuelven al cuerpo compuesto.
      this.bodies.set(id, { body: mejor.body, obj: mejor.obj });
      // La masa de la roldana se suma al anfitrión dinámico.
      if (hostDinamico) {
        const masa = e.obj.effectiveMassKg();
        if (masa > 0) {
          const total = (this.masaExtra.get(mejor.body) ?? 0) + masa;
          this.masaExtra.set(mejor.body, total);
          mejor.body.setAdditionalMass(total, true);
        }
      }
    }
  }

  /**
   * ACCESORIOS CALZADOS solidarios (v0.2.12): una pieza de calce (gancho J,
   * brazo de seguridad, jota, anclaje de cadena) montada en una estructura
   * con pinholes forma GRUPO RÍGIDO con ella — está FIJADA por su pin, no
   * apoyada: si la estructura es móvil (un brazo-péndulo, un carro), el
   * accesorio viaja solidario sin caerse ni deslizar; si es fija, queda
   * anclado a ella. Sus colliders se re-crean en el cuerpo anfitrión (una
   * jota fundida sigue recibiendo la barra) y su masa se suma al anfitrión
   * dinámico. Reutiliza la maquinaria de las roldanas empotradas: juntas y
   * cables resuelven al cuerpo compuesto y la malla se reproyecta desde la
   * pose del anfitrión en cada paso.
   */
  private detectarCalzados(): void {
    if (!this.world) return;
    const entradas = [...this.bodies.entries()];
    const invH = new THREE.Quaternion();
    const v = new THREE.Vector3();
    for (const [id, e] of entradas) {
      if (this.empotradaPorId.has(id)) continue;
      const def = getDefinition(e.obj.componentId);
      if (!def || (!def.calceLocal && !def.frenteCalce && !def.postesCalce)) continue;
      const aSize = e.obj.localSizeAbs();
      const margen = Math.max(aSize.x, aSize.y, aSize.z) / 2 + 2;
      let mejor: { body: R.RigidBody; obj: SceneObject } | null = null;
      let mejorD = Infinity;
      for (const [hid, h] of entradas) {
        if (hid === id || this.empotradaPorId.has(hid)) continue;
        // Solo estructuras CON grilla de pinholes hospedan un calce (de
        // biblioteca por holeStepCm o viga trazada con agujeros).
        const defH = getDefinition(h.obj.componentId);
        const conGrilla =
          !!defH?.holeStepCm ||
          (h.obj.params.kind === "beam" && (h.obj.params.holeDiameter ?? 0) > 0.1);
        if (!conGrilla) continue;
        // Caja LOCAL del anfitrión (v se expresa en su frame local; la
        // caja de mundo estaría girada respecto de él). Absoluta: una pieza
        // ESPEJADA (escala negativa) daba semilados negativos.
        const hs = h.obj.localSizeAbs();
        invH.copy(h.obj.mesh.quaternion).invert();
        v.copy(e.obj.mesh.position).sub(h.obj.mesh.position).applyQuaternion(invH);
        const d = Math.max(
          Math.abs(v.x) - hs.x / 2,
          Math.abs(v.y) - hs.y / 2,
          Math.abs(v.z) - hs.z / 2,
        );
        if (d < margen && d < mejorD) {
          mejorD = d;
          mejor = h;
        }
      }
      if (!mejor) continue;
      if (!mejor.body.isDynamic() && !e.body.isDynamic()) continue; // ya rígidos
      const qH = mejor.obj.mesh.quaternion;
      const relQ = qH.clone().invert().multiply(e.obj.mesh.quaternion);
      const relPos = e.obj.mesh.position
        .clone()
        .sub(mejor.obj.mesh.position)
        .applyQuaternion(qH.clone().invert())
        .multiplyScalar(S);
      // Los colliders del accesorio se RE-CREAN en el anfitrión con la pose
      // relativa compuesta (densidad 0: la masa va por masaExtra).
      this.world.removeRigidBody(e.body);
      for (const cd of this.colliderDescs(e.obj)) {
        const t = cd.translation;
        const pos = new THREE.Vector3(t.x, t.y, t.z).applyQuaternion(relQ).add(relPos);
        const r = cd.rotation;
        const rq = new THREE.Quaternion(r.x, r.y, r.z, r.w).premultiply(relQ);
        cd.setTranslation(pos.x, pos.y, pos.z);
        cd.setRotation({ x: rq.x, y: rq.y, z: rq.z, w: rq.w });
        cd.setDensity(0);
        this.world.createCollider(cd, mejor.body);
      }
      const entrada = {
        obj: e.obj,
        host: mejor.body,
        relPos: { x: relPos.x, y: relPos.y, z: relPos.z },
        relQ: { x: relQ.x, y: relQ.y, z: relQ.z, w: relQ.w },
      };
      this.empotradas.push(entrada);
      this.empotradaPorId.set(id, entrada);
      // Juntas y cables que referencien el accesorio resuelven al compuesto.
      this.bodies.set(id, { body: mejor.body, obj: mejor.obj });
      if (mejor.body.isDynamic()) {
        const masa = e.obj.effectiveMassKg();
        if (masa > 0) {
          const total = (this.masaExtra.get(mejor.body) ?? 0) + masa;
          this.masaExtra.set(mejor.body, total);
          mejor.body.setAdditionalMass(total, true);
        }
      }
    }
  }

  /**
   * GUÍAS TUBULARES reconocidas por el MOTOR (v0.2.5): si una pieza fija y
   * esbelta (tubo/pilar de guía) ATRAVIESA el volumen de una pieza móvil —
   * los cilindros huecos del carrier la abrazan — el movimiento de la móvil
   * queda CIRCUNSCRITO al eje de la guía: solo se traslada a lo largo del
   * tubo (con límites en sus extremos), sin deriva lateral ni vuelco. Se
   * aplica como clamp cinemático duro tras cada paso del solver, de modo que
   * ninguna tensión de cable ni colisión puede sacarla de su guía.
   */
  private guias: {
    body: R.RigidBody;
    /** Punto de la recta de deslizamiento (el centro inicial de la móvil), en m. */
    origen: { x: number; y: number; z: number };
    /** Dirección unitaria del eje de la guía (mundo). */
    eje: { x: number; y: number; z: number };
    /** Rotación de diseño (se mantiene clavada). */
    rot: { x: number; y: number; z: number; w: number };
    /** Recorrido permitido a lo largo del eje, relativo al origen (m). */
    sMin: number;
    sMax: number;
  }[] = [];

  private detectarGuias(): void {
    // TODAS LAS PIEZAS DE CADA CUERPO, no una por cuerpo (v0.3.10).
    //
    // `this.bodies` no es una biyección: al fundir un conjunto soldado, sus
    // piezas comparten el cuerpo del anfitrión. Antes se deduplicaba por
    // `handle` quedándose con la PRIMERA entrada, y eso rompía las guías en
    // cuanto algo se soldaba: si el carro de una prensa entraba en un conjunto
    // soldado, la pieza que representaba a ese cuerpo podía ser el bastidor,
    // y como el bastidor no tiene canales ni lo atraviesa ningún tubo, la
    // guía dejaba de existir — el carro conservaba sus agujeros y se caía por
    // fuera de sus barras. Lo mismo por el otro lado: una guía tubular soldada
    // al bastidor dejaba de reconocerse como guía.
    //
    // Ahora cada PIEZA se examina con el cuerpo al que pertenezca, compartido
    // o no; el clamp se aplica al cuerpo, que es lo que se mueve.
    // OJO: `this.bodies` NO sirve para enumerar piezas. Al fundir, la entrada
    // de la pieza absorbida se reescribe con el cuerpo Y EL OBJETO del
    // anfitrión (`fundirSoldadas`), así que la pieza real desaparece del mapa.
    // Las que conservan su pieza son las que cumplen `obj.id === id`; las
    // demás se recuperan de `empotradas`, que sí guarda el objeto original
    // junto al cuerpo que lo hospeda.
    const todas: { body: R.RigidBody; obj: SceneObject }[] = [];
    const vistas = new Set<SceneObject>();
    for (const [id, e] of this.bodies) {
      if (e.obj.id !== id || vistas.has(e.obj)) continue;
      vistas.add(e.obj);
      todas.push({ body: e.body, obj: e.obj });
    }
    for (const emp of this.empotradas) {
      if (vistas.has(emp.obj)) continue;
      vistas.add(emp.obj);
      todas.push({ body: emp.host, obj: emp.obj });
    }
    const dinamicas = todas.filter(({ body }) => !body.isFixed());
    const fijas = todas.filter(({ body }) => body.isFixed());
    // Un cuerpo compuesto aparece una vez por pieza: en cuanto UNA de ellas
    // queda enhebrada, el cuerpo entero ya tiene su recta y no se vuelve a
    // examinar (dos clamps sobre el mismo cuerpo pelearían entre sí).
    const yaGuiados = new Set<number>();

    // 1) Candidatas: piezas fijas ESBELTAS (tubulares) con su recta axial.
    interface Esbelta {
      centro: THREE.Vector3;
      eje: THREE.Vector3;
      largo: number;
      esStopper: boolean;
      /** Freno DECLARADO por la pieza (tope de goma), no deducido de la forma. */
      declarado?: boolean;
      cuerpo: R.RigidBody;
    }
    const esbeltas: Esbelta[] = [];
    for (const f of fijas) {
      // TOPE DECLARADO (v0.3.3): el espaciador de goma es corto y gordo, así
      // que no pasa la prueba de esbeltez de abajo —ni debe—. Entra aquí
      // marcado como freno, con su eje local Y, que es por donde se ensarta.
      if (getDefinition(f.obj.componentId)?.topeGuia) {
        esbeltas.push({
          centro: f.obj.mesh.position.clone(),
          eje: axisVector("y").applyQuaternion(f.obj.mesh.quaternion).normalize(),
          largo: f.obj.localSizeAbs().y,
          esStopper: true,
          declarado: true,
          cuerpo: f.body,
        });
        continue;
      }
      // Dimensiones LOCALES: se emparejan con letras de eje local (la AABB
      // de mundo mezclaba ejes con la pieza girada y perdía la esbeltez).
      const s = f.obj.localSizeAbs();
      const dims: [number, "x" | "y" | "z"][] = [[s.x, "x"], [s.y, "y"], [s.z, "z"]];
      dims.sort((a, b) => b[0] - a[0]);
      const [largo, ejeLocal] = dims[0];
      if (largo < 20 || largo < 4 * dims[1][0]) continue;
      // UNA PLANCHA NO ES UN RIEL (v0.2.73). La prueba de esbeltez mira el
      // largo contra el lado mediano y da por tubo cualquier cosa alargada,
      // incluida una PLACA: la dentada mide 12 × 60 × 0,8 y pasaba el examen
      // de sobra. Como consecuencia el motor la tomaba por guía, tomaba la
      // barra apoyada por carro guiado y EXCLUÍA el contacto entre ambas —
      // la barra atravesaba los ganchos despacio, como si la placa fuese un
      // fantasma, y no había forma de verlo mirando la geometría.
      //
      // Un riel tiene sección MACIZA: sus dos lados cortos se parecen. Si uno
      // es mucho menor que el otro, es chapa, y por una chapa no desliza nada.
      if (dims[1][0] > 4 * dims[2][0]) continue;
      const eje = axisVector(ejeLocal).applyQuaternion(f.obj.mesh.quaternion).normalize();
      esbeltas.push({
        centro: f.obj.mesh.position.clone(),
        eje,
        largo,
        esStopper: false,
        cuerpo: f.body,
      });
    }
    // 2) Taxonomía del sistema tubular guiado (5 piezas, según el diseñador):
    //    de cada FAMILIA COAXIAL (misma recta), la pieza MÁS LARGA es la GUÍA
    //    (tubo vertical largo) y las cortas montadas sobre ella son
    //    ESPACIADORES/STOPPERS que limitan el recorrido del carrier.
    for (const a of esbeltas) {
      for (const b of esbeltas) {
        if (a === b || a.largo >= b.largo) continue;
        if (Math.abs(a.eje.dot(b.eje)) < 0.99) continue;
        // Distancia lateral entre rectas (coaxialidad).
        const d = a.centro.clone().sub(b.centro);
        const lateral = d.clone().addScaledVector(b.eje, -d.dot(b.eje)).length();
        if (lateral >= 3) continue;
        // UN TUBO APILADO NO ES UN TOPE (v0.2.90). Coaxial y más corto valía
        // para declararlo espaciador, y dos medias columnas puestas una sobre
        // otra —caso normal al armar una torre por tramos— hacían que la de
        // arriba pasara por tope de la de abajo: el carro se frenaba en el
        // empalme, justo donde tenía que seguir subiendo.
        //
        // Un espaciador va MONTADO SOBRE la guía: comparte su tramo. Un tramo
        // apilado va a continuación y no solapa. Se pide que la corta esté
        // metida en el largo de la otra para tomarla por tope.
        const sA = a.centro.dot(b.eje);
        const sB = b.centro.dot(b.eje);
        const solapeAxial =
          Math.min(sA + a.largo / 2, sB + b.largo / 2) -
          Math.max(sA - a.largo / 2, sB - b.largo / 2);
        if (solapeAxial > a.largo / 2) {
          a.esStopper = true;
          break;
        }
      }
    }
    // Guía de verdad = tubo LARGO (≥60); las cortas solo pueden ser stoppers.
    const guiasTubo = esbeltas.filter((e) => !e.esStopper && e.largo >= 60);
    // UN TOPE SUELTO NO ES UN TOPE (v0.3.4). Los espaciadores descubiertos por
    // la forma pasan por el paso 2, que exige que estén MONTADOS sobre una guía
    // concreta; el tope declarado se saltaba ese examen, así que una pieza
    // «Tope de guía» dejada en cualquier rincón frenaba —y volvía fantasma— a
    // toda pieza guiada de la escena, incluida la pila de una torre de poleas.
    // Aquí se le pide lo mismo que a los otros: coaxial con una guía, metido en
    // su recta y solapando con su tramo.
    const montadoEnUnaGuia = (st: Esbelta): boolean =>
      guiasTubo.some((g) => {
        if (Math.abs(st.eje.dot(g.eje)) < 0.99) return false;
        const d = st.centro.clone().sub(g.centro);
        const lateral = d.clone().addScaledVector(g.eje, -d.dot(g.eje)).length();
        if (lateral > 6) return false; // fuera de la barra
        const sSt = st.centro.dot(g.eje);
        const sG = g.centro.dot(g.eje);
        return Math.abs(sSt - sG) <= g.largo / 2 + st.largo / 2;
      });
    // Solo se le exige a los DECLARADOS: los descubiertos por la forma ya
    // pasaron el paso 2, que los valida contra la pieza esbelta sobre la que
    // están montados —y esa puede ser un tubo corto que no llega a `guiasTubo`,
    // como los espaciadores del portadiscos del TTP.
    const stoppers = esbeltas.filter((e) => e.esStopper && (!e.declarado || montadoEnUnaGuia(e)));

    // 3) Móviles guiadas: la recta de una guía ATRAVIESA su volumen (los
    //    cilindros huecos del carrier abrazan el tubo).
    //    Las guías y stoppers de una móvil guiada NO COLISIONAN con ella: el
    //    tubo pasa por dentro de sus orificios y el clamp cinemático (con el
    //    stop de los espaciadores) es quien gobierna ese movimiento — sin la
    //    exclusión, la fricción del contacto permanente collider-tubo frena
    //    o atasca el deslizamiento.
    const usadas = new Set<R.RigidBody>();
    const guiados = new Set<R.RigidBody>();
    const bbox = new THREE.Box3();
    for (const d of dinamicas) {
      if (yaGuiados.has(d.body.handle)) continue;
      // Caja del CUERPO sin los discos montados: el freno de la guía topa
      // con el carrier — los discos quedan lejos de los tubos y no
      // participan del stop (con ellos, la caja inflada frenaba el carro
      // un radio de disco antes de tocar el freno).
      d.obj.worldBoxBody(bbox);
      const tam = bbox.getSize(new THREE.Vector3());
      bbox.expandByScalar(1); // cm de tolerancia del abrazo
      const centroD = d.obj.mesh.position;
      // CUÁNTO OCUPA LA MÓVIL A LO LARGO DE UN EJE (v0.3.3). Antes se sumaba
      // la caja de MUNDO proyectada sobre el eje, y eso solo vale si la pieza
      // está a escuadra con los ejes del mundo: una plancha girada 40° —el
      // carro de una prensa inclinada— tiene una caja de mundo enorme, y la
      // cuenta le daba medio metro de grosor donde tiene diez centímetros.
      // Con eso, el recorrido que dejaban los topes salía NEGATIVO y el motor
      // descartaba la guía entera: el carro se caía por fuera de sus barras.
      //
      // El soporte de una caja ORIENTADA es exacto: se proyecta cada eje local
      // de la pieza, no la caja del mundo.
      const tamLocal = d.obj.localSizeAbs();
      const qD = d.obj.mesh.quaternion;
      const soporte = (e: THREE.Vector3): number =>
        tamLocal.x * Math.abs(axisVector("x").applyQuaternion(qD).dot(e)) +
        tamLocal.y * Math.abs(axisVector("y").applyQuaternion(qD).dot(e)) +
        tamLocal.z * Math.abs(axisVector("z").applyQuaternion(qD).dot(e));
      let eje: THREE.Vector3 | null = null;
      let halfD = 0;
      // Tramos de tubo (extremos ABSOLUTOS sobre el eje) y sus cuerpos: se
      // unen abajo, una vez visto todo el juego de guías de esta móvil.
      const tramos: [number, number][] = [];
      const cuerposGuia: R.RigidBody[] = [];
      // Tubos que pasan por la recta de la móvil, con cuánto la atraviesan.
      const candidatas: { g: (typeof guiasTubo)[number]; solape: number }[] = [];
      for (const g of guiasTubo) {
        const delta = centroD.clone().sub(g.centro);
        const p = g.centro.clone().addScaledVector(g.eje, delta.dot(g.eje));
        if (!bbox.containsPoint(p)) continue;
        // ABRAZO real (v0.2.9): un manguito guiado ATRAVIESA la pieza a lo
        // largo del eje (≥ 5 cm de recorrido interior). Sin este filtro, una
        // barra de agarre colgando JUNTO a un travesaño del piso quedaba
        // falsamente circunscrita a su recta (el jalón bajo solo podía
        // moverse en horizontal, clavado y sin transmisión).
        const abrazo = soporte(g.eje);
        // UNA PIEZA CON ORIFICIOS PASANTES ESTÁ HECHA PARA ENHEBRARSE, y su
        // grosor no dice nada: el «Bloque de peso» son 30 × 4 × 18 con dos
        // agujeros que abrazan los tubos, y sus 4 cm no llegaban al listón de
        // 5, así que el motor lo veía macizo contra los tubos que lo
        // atraviesan y lo despedía de lado. La «Pila de pesos» en el mismo
        // sitio funcionaba, con lo que parecía cosa de la escena y no de la
        // pieza. A esas se les pide menos recorrido interior; el listón alto
        // sigue para las demás, y de los falsos positivos por proximidad ya se
        // encarga el solape axial de abajo.
        // Y UNA PIEZA CON CANALES TUBULARES TAMBIÉN (v0.3.3): el carro de una
        // prensa lleva calados de verdad los agujeros por donde pasan sus
        // barras guía, y esos agujeros son la prueba de que está hecha para
        // enhebrarse — igual que los orificios pasantes del bloque de peso.
        const pasante =
          (d.obj.params.holeDiameter ?? 0) > 0 || (d.obj.params.canales?.length ?? 0) > 0;
        if (abrazo < (pasante ? 2 : 5)) continue;
        // Y EL TUBO TIENE QUE ESTAR AHÍ (v0.2.76). La comprobación de arriba
        // proyecta el centro de la móvil sobre la recta de la guía, pero esa
        // recta es INFINITA: sirve igual una pieza ensartada en el tubo que
        // una posada sobre su punta, o a un metro por encima. Con eso, un
        // contrapeso dejado sobre un pilar quedaba «guiado» por él, y como el
        // guiado no choca con su guía, se hundía dentro del pilar y bajaba
        // atravesándolo hasta el suelo. En la geometría no se veía nada.
        //
        // Un manguito de verdad SOLAPA con el tramo del tubo. Se exige el
        // mismo recorrido interior que promete el abrazo.
        const sMovil = centroD.dot(g.eje);
        const sGuia = g.centro.dot(g.eje);
        const solape =
          Math.min(sMovil + abrazo / 2, sGuia + g.largo / 2) -
          Math.max(sMovil - abrazo / 2, sGuia - g.largo / 2);
        candidatas.push({ g, solape });
      }
      // La móvil está ENSARTADA en las de solape ≥ 5; las demás están en su
      // misma recta pero más allá (el resto de la columna, todavía sin
      // alcanzar). El eje lo fija la primera ensartada: sin ninguna, no hay
      // guiado por mucha recta que pase por al lado.
      const ensartadas = candidatas.filter((c) => c.solape >= 5);
      if (ensartadas.length === 0) continue;
      eje = ensartadas[0].g.eje.clone();
      // Semiextensión de la móvil a lo largo del eje (soporte del AABB).
      halfD = soporte(eje) / 2;
      const prolongaciones: { tramo: [number, number]; cuerpo: R.RigidBody }[] = [];
      for (const c of candidatas) {
        if (Math.abs(eje.dot(c.g.eje)) < 0.99) continue;
        const sG = c.g.centro.dot(eje);
        const tramo: [number, number] = [sG - c.g.largo / 2, sG + c.g.largo / 2];
        if (c.solape >= 5) {
          cuerposGuia.push(c.g.cuerpo);
          tramos.push(tramo);
        } else {
          prolongaciones.push({ tramo, cuerpo: c.g.cuerpo });
        }
      }
      // TRAMOS EN SERIE (v0.2.90): antes se INTERSECABA el recorrido que
      // permitía cada tubo. Con una sola columna daba igual, pero con dos
      // medias columnas empalmadas los dos recorridos son contiguos y su
      // intersección es VACÍA: el carro salía del `continue` sin guía ninguna
      // y se desplomaba por fuera de la torre. Un empalme es UNA guía larga,
      // así que los tramos que se tocan se FUNDEN, y de la recta resultante se
      // toma el trozo donde está metida la móvil.
      tramos.sort((a, b) => a[0] - b[0]);
      const sMovil = centroD.dot(eje);
      let ini = tramos[0][0];
      let fin = tramos[0][1];
      let mejor: [number, number] | null = null;
      let mejorSolape = 0;
      const cerrarTramo = (): void => {
        const solape =
          Math.min(sMovil + halfD, fin) - Math.max(sMovil - halfD, ini);
        if (solape > mejorSolape) {
          mejorSolape = solape;
          mejor = [ini, fin];
        }
      };
      for (let i = 1; i < tramos.length; i++) {
        // 1 cm de holgura: el empalme de dos tubos nunca es exacto.
        if (tramos[i][0] <= fin + 1) {
          fin = Math.max(fin, tramos[i][1]);
          continue;
        }
        cerrarTramo();
        ini = tramos[i][0];
        fin = tramos[i][1];
      }
      cerrarTramo();
      if (!mejor) continue;
      // Y LA COLUMNA SIGUE MÁS ALLÁ. Los tramos que la móvil todavía no
      // alcanza se absorben si TOCAN el recorrido ya reunido —y en cadena, que
      // una torre puede armarse de tres tramos—. Sin esto el carro frenaba en
      // seco en el empalme: el tubo de continuación existía, pero como aún no
      // lo abrazaba no contaba, y el recorrido terminaba justo ahí.
      let [tramoIni, tramoFin] = mejor as [number, number];
      for (let crecio = true; crecio; ) {
        crecio = false;
        for (let k = prolongaciones.length - 1; k >= 0; k--) {
          const [a2, b2] = prolongaciones[k].tramo;
          if (a2 > tramoFin + 1 || b2 < tramoIni - 1) continue; // no toca
          tramoIni = Math.min(tramoIni, a2);
          tramoFin = Math.max(tramoFin, b2);
          cuerposGuia.push(prolongaciones[k].cuerpo);
          prolongaciones.splice(k, 1);
          crecio = true;
        }
      }
      // Recorrido del CENTRO: la móvil completa se queda sobre el tubo.
      let sMin = tramoIni + halfD - sMovil;
      let sMax = tramoFin - halfD - sMovil;
      if (sMin > sMax) continue;
      // 4) STOPPERS: los espaciadores asentados en la guía acotan la caída
      //    (o el ascenso) — el carrier se DETIENE al tocarlos, sin llegar a
      //    la platina inferior.
      const s0 = sMovil;
      for (const st of stoppers) {
        if (Math.abs(st.eje.dot(eje)) < 0.99) continue;
        const delta = centroD.clone().sub(st.centro);
        const lateral = delta.clone().addScaledVector(eje, -delta.dot(eje)).length();
        if (lateral > Math.max(tam.x, tam.y, tam.z) / 2 + 3) continue; // no está en su línea
        const sSt = st.centro.dot(eje);
        const stTop = sSt + st.largo / 2;
        const stBot = sSt - st.largo / 2;
        if (stTop <= s0) sMin = Math.max(sMin, stTop + halfD - s0);
        else if (stBot >= s0) sMax = Math.min(sMax, stBot - halfD - s0);
        // UN TOPE A HORCAJADAS DEL CENTRO NO ACOTA NADA (v0.3.4): si el tramo
        // del tope contiene la proyección del centro de la móvil, ninguna de
        // las dos ramas se ejecuta. Antes se le quitaba igualmente la colisión
        // —entraba en `cuerposGuia`— y quedaba de fantasma: ni frenaba ni
        // chocaba. Ahora solo pierde el contacto el tope que de verdad acota.
        else continue;
        cuerposGuia.push(st.cuerpo);
      }
      // DOS TOPES MÁS JUNTOS QUE EL CARRO lo dejan encajado, no lo sueltan
      // (v0.3.4). Cuando el hueco libre entre ambos es menor que el grosor de
      // la móvil, `sMin > sMax` y la guía entera se descartaba: el carro se
      // quedaba sin clamp y salía despedido por fuera de sus barras. Encajado
      // entre dos topes lo que hace una pieza real es no moverse.
      if (sMin > sMax) {
        const medio = (sMin + sMax) / 2;
        sMin = medio;
        sMax = medio;
      }
      // Las guías se marcan AQUÍ, ya sabiendo que esta móvil quedó guiada: si
      // se descarta a mitad de camino, sus tubos no deben perder el contacto
      // con las demás piezas guiadas de la escena.
      for (const c of cuerposGuia) usadas.add(c);
      guiados.add(d.body);
      yaGuiados.add(d.body.handle);
      // EL CLAMP SE EXPRESA EN EL FRAME DEL CUERPO, no en el de la pieza
      // (v0.3.10). `aplicarGuias` compara la traslación del CUERPO contra
      // este origen; si la pieza está fundida en un conjunto soldado, el
      // cuerpo es el del anfitrión y su origen está en otro sitio — el clamp
      // teletransportaba el conjunto entero a la recta de la pieza, y el carro
      // salía 46 cm de lado en el primer fotograma. `sMin`/`sMax` no cambian:
      // son desplazamientos RELATIVOS a donde está ahora, y la pieza y su
      // anfitrión están rígidamente unidos, así que valen igual para los dos.
      const tr = d.body.translation();
      const rt = d.body.rotation();
      this.guias.push({
        body: d.body,
        origen: { x: tr.x, y: tr.y, z: tr.z },
        eje: { x: eje.x, y: eje.y, z: eje.z },
        rot: { x: rt.x, y: rt.y, z: rt.z, w: rt.w },
        sMin: sMin * S,
        sMax: sMax * S,
      });
    }

    // Exclusión de contacto guiado↔guía: las guías/stoppers EN USO quedan
    // con membresía exclusiva (bit 2) y los cuerpos guiados la filtran. El
    // resto del mundo sigue colisionando con todo (una barra suelta no
    // atraviesa los tubos; el guiado sí "los abraza" sin rozamiento).
    const GRUPO_GUIA = (0x0002 << 16) | 0xffff;
    const FILTRO_GUIADO = (0xffff << 16) | 0xfffd;
    for (const c of usadas) {
      for (let i = 0; i < c.numColliders(); i++) c.collider(i).setCollisionGroups(GRUPO_GUIA);
    }
    for (const c of guiados) {
      for (let i = 0; i < c.numColliders(); i++) c.collider(i).setCollisionGroups(FILTRO_GUIADO);
    }
  }

  /** Aplica el clamp de cada guía: la móvil solo vive sobre su recta. */
  private aplicarGuias(): void {
    for (const g of this.guias) {
      const t = g.body.translation();
      const dx = t.x - g.origen.x;
      const dy = t.y - g.origen.y;
      const dz = t.z - g.origen.z;
      let s = dx * g.eje.x + dy * g.eje.y + dz * g.eje.z;
      if (s < g.sMin) s = g.sMin;
      else if (s > g.sMax) s = g.sMax;
      g.body.setTranslation(
        { x: g.origen.x + g.eje.x * s, y: g.origen.y + g.eje.y * s, z: g.origen.z + g.eje.z * s },
        true,
      );
      const v = g.body.linvel();
      const va = v.x * g.eje.x + v.y * g.eje.y + v.z * g.eje.z;
      g.body.setLinvel({ x: g.eje.x * va, y: g.eje.y * va, z: g.eje.z * va }, true);
      g.body.setRotation(g.rot, true);
      g.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    }
  }

  private addCable(cable: Cable): void {
    const bodies: R.RigidBody[] = [];
    const local: { x: number; y: number; z: number }[] = [];
    for (const n of cable.nodes) {
      // Roldana EMPOTRADA: el nodo resuelve al cuerpo compuesto del anfitrión
      // y su anclaje local se reexpresa en el frame de ese cuerpo.
      const emp = this.empotradaPorId.get(n.objectId);
      if (emp) {
        const s = emp.obj.mesh.scale;
        const l = new THREE.Vector3(
          n.local.x * s.x * S,
          n.local.y * s.y * S,
          n.local.z * s.z * S,
        );
        l.applyQuaternion(new THREE.Quaternion(emp.relQ.x, emp.relQ.y, emp.relQ.z, emp.relQ.w));
        l.add(new THREE.Vector3(emp.relPos.x, emp.relPos.y, emp.relPos.z));
        bodies.push(emp.host);
        local.push({ x: l.x, y: l.y, z: l.z });
        continue;
      }
      const e = this.bodies.get(n.objectId);
      if (!e) return;
      // Anclaje local (cm geometria) -> escala de la pieza -> metros, frame cuerpo.
      const s = e.obj.mesh.scale;
      bodies.push(e.body);
      local.push({ x: n.local.x * s.x * S, y: n.local.y * s.y * S, z: n.local.z * s.z * S });
    }
    if (bodies.length < 2) return;
    // Fricción de polea: una amortiguación lineal moderada en los cuerpos
    // colgados del cable aplaca la deriva cuasi-estática del solver (bombeo
    // del bias) sin frenar los tirones de la mano, que son mucho mayores.
    for (const b of bodies) {
      if (b.isDynamic()) {
        if (b.linearDamping() < 1) b.setLinearDamping(1);
        this.cuerposCable.add(b);
      }
    }
    const entry: CableEntry = { bodies, local, restLength: 0, topeIni: 0, topeFin: 0, topes: [] };
    entry.restLength = this.cableLength(entry);
    // FRENOS: su posición se pasa a LONGITUD DE CABLE desde el nodo 0. Es la
    // magnitud que se conserva mientras el cable corre por sus roldanas, y la
    // que permite acotar cuánto cable puede quedar a cada lado de la esfera.
    for (const t of cable.topes) {
      const seg = Math.max(0, Math.min(bodies.length - 2, Math.round(t.seg)));
      const sm = this.longitudTramo(entry, 0, seg) + Math.max(0, t.dist) * S;
      const margen = 0.02; // 2 cm: nunca nace pegado a un extremo
      entry.topes.push({
        seg,
        s: Math.max(margen, Math.min(entry.restLength - margen, sm)),
      });
    }
    // Topes de terminal: solo tienen sentido con roldanas de por medio
    // (n ≥ 3). El tope es ~10 cm (radio de roldana + accesorio) acotado por
    // el largo inicial del segmento, para no nacer en violación.
    if (bodies.length >= 3) {
      const seg = (i: number, j: number) => {
        const a = this.nodeWorld(entry, i);
        const b = this.nodeWorld(entry, j);
        return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
      };
      const n = bodies.length;
      entry.topeIni = Math.min(0.1, 0.6 * seg(0, 1));
      entry.topeFin = Math.min(0.1, 0.6 * seg(n - 1, n - 2));
    }
    this.cables.push(entry);
  }

  /**
   * Aplica los TOPES de terminal de un cable: si el extremo se acercó a su
   * roldana vecina por debajo del mínimo, se reubica en el tope y se mata
   * su velocidad de aproximación. Así el extremo liviano deja de absorber
   * recorrido y la transmisión sigue hacia el resto del sistema (el
   * contrapeso), como en la máquina real.
   */
  private aplicarTopesCable(entry: CableEntry): void {
    const n = entry.bodies.length;
    if (n < 3) return;
    const extremos: [number, number, number][] = [
      [0, 1, entry.topeIni],
      [n - 1, n - 2, entry.topeFin],
    ];
    for (const [i, j, tope] of extremos) {
      if (tope <= 0) continue;
      const b = entry.bodies[i];
      if (!b.isDynamic()) continue;
      const pa = this.nodeWorld(entry, i);
      const pb = this.nodeWorld(entry, j);
      let dx = pa.x - pb.x;
      let dy = pa.y - pb.y;
      let dz = pa.z - pb.z;
      const d = Math.hypot(dx, dy, dz);
      if (d >= tope) continue;
      if (d < 1e-6) {
        dx = 0; dy = -1; dz = 0;
      } else {
        dx /= d; dy /= d; dz /= d;
      }
      const delta = tope - d;
      const c = b.translation();
      b.setTranslation({ x: c.x + dx * delta, y: c.y + dy * delta, z: c.z + dz * delta }, true);
      b.setLinvel({ x: 0, y: 0, z: 0 }, true);
      // PARQUEO en el tope: si la mano no lo sostiene, el extremo queda
      // CONGELADO contra la roldana (como la barra real descansando en su
      // tope). Si no, el solver y el tope se pelean cada paso y el sistema
      // bombea posición en reposo. La mano lo descongela al agarrarlo.
      if (this.drag?.body !== b) {
        b.setBodyType(RAPIER.RigidBodyType.Fixed, true);
        this.topeCongelados.add(b);
      }
    }
  }

  /** Anota que dos cuerpos NO deben chocar (su unión apagó los contactos). */
  private marcarSinContacto(a: R.RigidBody, b: R.RigidBody): void {
    const anotar = (x: R.RigidBody, y: R.RigidBody) => {
      let s = this.sinContacto.get(x);
      if (!s) {
        s = new Set();
        this.sinContacto.set(x, s);
      }
      s.add(y);
    };
    anotar(a, b);
    anotar(b, a);
  }

  /**
   * ANTI-ATRAVESAMIENTO DEL CABLE (v0.2.42).
   *
   * La corrección de longitud mueve los nodos con `setTranslation` DESPUÉS de
   * `world.step()`: el motor no ve esos desplazamientos, así que el cable
   * podía empujar una pieza DENTRO de la estructura de la que cuelga — la
   * barra de jalón incrustándose milímetro a milímetro en el bastidor cada
   * subpaso, que es como acaba solapada con lo que tiene al lado.
   *
   * En vez de encarecer las 8 pasadas, se corrige UNA vez por subpaso: el
   * desplazamiento NETO de cada nodo se barre con su propia forma y se corta
   * en el primer choque. Los pares cuyo contacto apagó su unión (pivotes,
   * adaptadores) se ignoran, igual que los ignora el motor.
   */
  private frenarAtravesamiento(): void {
    const world = this.world;
    if (!world) return;
    for (const [body, antes] of this.posCable) {
      const t = body.translation();
      const dx = t.x - antes.x;
      const dy = t.y - antes.y;
      const dz = t.z - antes.z;
      const mag = Math.hypot(dx, dy, dz);
      // Por debajo de 0,05 mm no hay atravesamiento posible ni que medir.
      if (mag < 5e-5) continue;
      const dir = { x: dx / mag, y: dy / mag, z: dz / mag };
      const vecinos = this.sinContacto.get(body);
      const filtro = vecinos
        ? (c: R.Collider) => {
            const padre = c.parent();
            return !padre || !vecinos.has(padre);
          }
        : undefined;
      let toi = mag;
      for (let i = 0; i < body.numColliders() && toi > 0; i++) {
        const col = body.collider(i);
        if (col.isSensor()) continue;
        // El barrido parte de la pose PREVIA: la proyección solo traslada,
        // así que basta restar el desplazamiento al centro del collider.
        const p = col.translation();
        const hit = world.castShape(
          { x: p.x - dx, y: p.y - dy, z: p.z - dz },
          col.rotation(),
          dir,
          col.shape,
          0,
          toi,
          false, // ya penetrando: lo resuelve el motor, no este barrido
          RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
          col.collisionGroups(),
          undefined,
          body,
          filtro,
        );
        if (hit && hit.time_of_impact < toi) toi = Math.max(0, hit.time_of_impact);
      }
      if (toi >= mag) continue;
      body.setTranslation(
        { x: antes.x + dir.x * toi, y: antes.y + dir.y * toi, z: antes.z + dir.z * toi },
        true,
      );
    }
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
    return this.longitudTramo(entry, 0, entry.bodies.length - 1);
  }

  /** Longitud (m) del tramo de cable entre los nodos `i0` e `i1`. */
  private longitudTramo(entry: CableEntry, i0: number, i1: number): number {
    let L = 0;
    for (let i = i0; i < i1; i++) {
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
   * NODOS AGRUPADOS POR CUERPO (v0.2.90).
   *
   * Un mismo cuerpo puede aparecer VARIAS VECES en un cable: dos roldanas
   * empotradas en la misma viga resuelven las dos al cuerpo compuesto del
   * anfitrión, y un cable que pasa por ambas lo lista dos veces. Los solventes
   * recorrían los nodos uno a uno y escribían la velocidad (o la posición) del
   * cuerpo en cada vuelta: la segunda escritura PISABA la primera en lugar de
   * sumarse, y la masa efectiva contaba dos veces la misma inercia. El cable
   * quedaba flojo por un lado y tironeaba por el otro, sin que la geometría
   * mostrase nada raro.
   *
   * Aquí cada cuerpo aparece UNA vez, con la SUMA de los gradientes de sus
   * nodos —que es exactamente la derivada de la longitud respecto a ese
   * cuerpo— y sus índices, por si el llamante necesita mirar sus vecinos.
   */
  private nodosPorCuerpo(
    bodies: R.RigidBody[],
    J: { x: number; y: number; z: number }[],
  ): {
    body: R.RigidBody;
    im: number;
    J: { x: number; y: number; z: number };
    indices: number[];
  }[] {
    const porCuerpo = new Map<
      number,
      {
        body: R.RigidBody;
        im: number;
        J: { x: number; y: number; z: number };
        indices: number[];
      }
    >();
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      let e = porCuerpo.get(b.handle);
      if (!e) {
        e = {
          body: b,
          im: b.isDynamic() ? 1 / b.mass() : 0,
          J: { x: 0, y: 0, z: 0 },
          indices: [],
        };
        porCuerpo.set(b.handle, e);
      }
      e.J.x += J[i].x;
      e.J.y += J[i].y;
      e.J.z += J[i].z;
      e.indices.push(i);
    }
    return [...porCuerpo.values()];
  }

  /**
   * Restriccion de cable inextensible y unilateral, a nivel de VELOCIDAD,
   * aplicada a TODOS los nodos dinamicos (extremos y poleas moviles). Solo tira:
   * si hay holgura (L <= rest) o ya no se alarga (vrel <= 0) no hace nada.
   */
  private solveCableVelocity(
    entry: CableEntry,
    i0 = 0,
    i1 = entry.bodies.length - 1,
    maxLen = entry.restLength,
  ): void {
    const bodies = entry.bodies.slice(i0, i1 + 1);
    const n = bodies.length;
    if (n < 2) return;
    const C = this.longitudTramo(entry, i0, i1) - maxLen;
    if (C <= 0) return;

    const p = bodies.map((_, i) => this.nodeWorld(entry, i0 + i));
    const nodos = this.nodosPorCuerpo(bodies, this.cableGradients(p));
    let effMass = 0;
    for (const nd of nodos) effMass += nd.im * (nd.J.x ** 2 + nd.J.y ** 2 + nd.J.z ** 2);
    if (effMass <= 0) return;

    let vrel = 0;
    for (const nd of nodos) {
      const v = nd.body.linvel();
      vrel += nd.J.x * v.x + nd.J.y * v.y + nd.J.z * v.z;
    }
    // Estabilización Baumgarte: el exceso de longitud se recobra por
    // VELOCIDAD (repartida por masas, dinámica coherente) en lugar de
    // teletransportar posiciones — sin esto, el reparto posicional bombea
    // energía y el sistema "repta" en reposo (el contrapeso subía solo).
    const bias = Math.min(15 * C, 2.5); // m/s
    const objetivo = -bias;
    if (vrel <= objetivo) return;

    const lambda = (objetivo - vrel) / effMass;
    for (const nd of nodos) {
      if (nd.im <= 0) continue;
      const k = nd.im * lambda;
      const v = nd.body.linvel();
      nd.body.setLinvel(
        { x: v.x + nd.J.x * k, y: v.y + nd.J.y * k, z: v.z + nd.J.z * k },
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
  private solveCablePosition(
    entry: CableEntry,
    i0 = 0,
    i1 = entry.bodies.length - 1,
    maxLen = entry.restLength,
    holgura = 0.03,
  ): void {
    const bodies = entry.bodies.slice(i0, i1 + 1);
    const restLength = maxLen;
    const n = bodies.length;
    if (n < 2) return;

    const p = bodies.map((_, i) => this.nodeWorld(entry, i0 + i));
    const segLen: number[] = [];
    for (let i = 0; i < n - 1; i++) {
      segLen.push(Math.hypot(p[i].x - p[i + 1].x, p[i].y - p[i + 1].y, p[i].z - p[i + 1].z));
    }
    // Red de EMERGENCIA: la recuperación normal la hace el bias de velocidad
    // (Baumgarte); solo se teletransporta el exceso grosero (tirones muy
    // violentos), dejando una holgura que evita el bombeo posicional.
    const C = segLen.reduce((a, b) => a + b, 0) - restLength - holgura;
    if (C <= 0) return;

    const nodos = this.nodosPorCuerpo(bodies, this.cableGradients(p));
    let effMass = 0;
    for (const nd of nodos) effMass += nd.im * (nd.J.x ** 2 + nd.J.y ** 2 + nd.J.z ** 2);
    if (effMass <= 0) return;

    const lambda = -C / effMass;
    for (const nd of nodos) {
      if (nd.im <= 0) continue;
      let dx = nd.im * lambda * nd.J.x;
      let dy = nd.im * lambda * nd.J.y;
      let dz = nd.im * lambda * nd.J.z;
      // No cruzar una polea adyacente en un solo paso: manda el vecino más
      // cercano de TODOS los nodos que este cuerpo tenga en el cable.
      let adj = Infinity;
      for (const i of nd.indices) {
        if (i > 0) adj = Math.min(adj, segLen[i - 1]);
        if (i < n - 1) adj = Math.min(adj, segLen[i]);
      }
      const mag = Math.hypot(dx, dy, dz);
      const max = 0.9 * adj;
      if (mag > max && mag > 0) {
        const s = max / mag;
        dx *= s; dy *= s; dz *= s;
      }
      // El delta se aplica al CENTRO del cuerpo (el anclaje se mueve con el).
      const c = nd.body.translation();
      nd.body.setTranslation({ x: c.x + dx, y: c.y + dy, z: c.z + dz }, true);
    }
  }

  /**
   * TOPE DE LONGITUD MÍNIMA de un tramo (v0.2.40): lo contrario del cable —
   * en vez de impedir que se estire, impide que se ACORTE. Es lo que hace un
   * freno de esfera: el cable no puede seguir corriendo hacia la roldana
   * porque la bola se interpone. Se resuelve con los mismos gradientes,
   * separando los nodos en lugar de juntarlos.
   */
  private solveTramoMinimo(
    entry: CableEntry,
    i0: number,
    i1: number,
    minLen: number,
    posicional: boolean,
  ): void {
    const bodies = entry.bodies.slice(i0, i1 + 1);
    const n = bodies.length;
    if (n < 2) return;
    const C = minLen - this.longitudTramo(entry, i0, i1); // > 0 = violado
    if (C <= 0) return;

    const p = bodies.map((_, i) => this.nodeWorld(entry, i0 + i));
    const nodos = this.nodosPorCuerpo(bodies, this.cableGradients(p));
    let effMass = 0;
    for (const nd of nodos) effMass += nd.im * (nd.J.x ** 2 + nd.J.y ** 2 + nd.J.z ** 2);
    if (effMass <= 0) return;

    if (posicional) {
      const lambda = C / effMass;
      for (const nd of nodos) {
        if (nd.im <= 0) continue;
        const k = nd.im * lambda;
        const c = nd.body.translation();
        nd.body.setTranslation(
          { x: c.x + nd.J.x * k, y: c.y + nd.J.y * k, z: c.z + nd.J.z * k },
          true,
        );
      }
      return;
    }
    let vrel = 0;
    for (const nd of nodos) {
      const v = nd.body.linvel();
      vrel += nd.J.x * v.x + nd.J.y * v.y + nd.J.z * v.z;
    }
    const objetivo = Math.min(15 * C, 2.5); // m/s: el tramo debe dejar de acortarse
    if (vrel >= objetivo) return;
    const lambda = (objetivo - vrel) / effMass;
    for (const nd of nodos) {
      if (nd.im <= 0) continue;
      const k = nd.im * lambda;
      const v = nd.body.linvel();
      nd.body.setLinvel(
        { x: v.x + nd.J.x * k, y: v.y + nd.J.y * k, z: v.z + nd.J.z * k },
        true,
      );
    }
  }

  /**
   * FRENOS DE CABLE (v0.2.40): la esfera no pasa por la roldana, así que el
   * cable que queda a cada lado de ella está acotado — antes del freno como
   * mucho `s`, después como mucho `restLength - s`. Se resuelve con la misma
   * maquinaria del cable completo, aplicada a cada TRAMO: dos restricciones
   * unilaterales más, sin cuerpos nuevos ni contactos que simular.
   *
   * El efecto es el de la máquina real: un extremo liviano deja de tragarse
   * el recorrido y la tensión se transmite al otro lado desde el primer
   * milímetro (el "momento cero" del que depende que el esfuerzo sea
   * constante en todo el rango).
   */
  private aplicarFrenos(entry: CableEntry, posicional: boolean): void {
    const n = entry.bodies.length;
    for (const t of entry.topes) {
      // El freno es un tope DURO (la esfera contra la roldana), no la
      // longitud elástica del cable: se proyecta casi sin holgura. Las dos
      // condiciones se miden sobre el MISMO tramo —el que va del extremo 0 a
      // la esfera— para que no dependan de que el cable esté perfectamente
      // tenso: la bola no puede pasar el nodo que tiene detrás (el cable
      // antes de ella nunca supera `s`) ni el que tiene delante (el cable
      // hasta ese nodo nunca baja de `s`).
      const HOLGURA = 0.005; // m
      if (t.seg >= 1) {
        if (posicional) this.solveCablePosition(entry, 0, t.seg, t.s, HOLGURA);
        else this.solveCableVelocity(entry, 0, t.seg, t.s);
      }
      if (t.seg + 1 <= n - 1) {
        this.solveTramoMinimo(entry, 0, t.seg + 1, t.s, posicional);
      }
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
    // Eje en el frame local del cuerpo A. El eje efectivo respeta el giro del
    // grupo (axisVec) cuando la maquina fue rotada como conjunto.
    const ejeMundo = joint.ejeVector();
    const axisLocalA = ejeMundo.clone().applyQuaternion(qA.clone().invert());
    const axis = { x: axisLocalA.x, y: axisLocalA.y, z: axisLocalA.z };

    // RAPIER.JointData.revolute/prismatic aplican el MISMO eje local a ambos
    // cuerpos: si sus orientaciones de diseno difieren, el solver reorienta B
    // de golpe al arrancar para alinear los frames. Cuando las orientaciones ya
    // son compatibles usamos el joint directo (camino probado); si no,
    // interponemos un ADAPTADOR: un cuerpecillo con la orientacion de A,
    // articulado con A y soldado a B con un joint fijo (que si admite frames
    // por cuerpo), de modo que B conserva su orientacion de diseno.
    const axisLocalB = ejeMundo.clone().applyQuaternion(qB.clone().invert());
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
      // Los contactos entre las dos piezas se apagan salvo que la unión pida
      // lo contrario (bisagra real montada sobre caras que no se solapan):
      // ahí el material debe frenar el plegado, no atravesarse.
      handle.setContactsEnabled(joint.contactos);
      if (!joint.contactos) this.marcarSinContacto(a.body, b.body);
    } else {
      handle = this.addJointViaAdapter(joint, a, b, anchorA, anchorB, axis);
    }

    // Se anota el EJE DE GIRO de cada pieza articulada (para que la mano tire
    // por el arco, no contra el pasador). Cada cuerpo guarda el eje descrito
    // en el frame del OTRO, que es su referencia de giro.
    if (joint.kind === "revolute" && !joint.locked) {
      if (b.body.isDynamic() && !this.bisagras.has(b.body)) {
        this.bisagras.set(b.body, { ref: a.body, ancla: anchorA, eje: axis });
      }
      if (a.body.isDynamic() && !this.bisagras.has(a.body)) {
        const e = axisLocalB;
        this.bisagras.set(a.body, { ref: b.body, ancla: anchorB, eje: { x: e.x, y: e.y, z: e.z } });
      }
    }

    if (joint.limitsEnabled) {
      const [min, max] =
        joint.kind === "revolute"
          ? [joint.min * DEG2RAD, joint.max * DEG2RAD]
          : [joint.min * S, joint.max * S];
      handle.setLimits(min, max);
    }

    // Lock switch (diagrama Versatilidad): bloqueada = rígida en la pose de
    // diseño (el frame del joint nace en cero), sin motor.
    if (joint.locked) {
      handle.setLimits(0, 0);
    } else if (joint.motor.enabled) {
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
    const w = joint.anchor.clone().multiplyScalar(S);

    // PIVOTE SOBRE PIEZA ANCLADA (v0.2.39): cuando uno de los dos lados NO se
    // mueve, el adaptador no necesita ser un cuerpo dinámico soldado — puede
    // ser un cuerpo FIJO colocado en el pasador y orientado como la pieza que
    // sí gira. Entonces la bisagra une "fijo ↔ móvil" directamente y es tan
    // rígida como cualquier otra: sin un cuerpecillo de 50 g haciendo de
    // eslabón entre el bastidor y un brazo de 19 kg, que era lo que dejaba
    // que el brazo se TORCIERA y saliera de su plano al empujarlo de un solo
    // agarre en vez de describir su semicircunferencia.
    const aFija = !a.body.isDynamic();
    const bFija = !b.body.isDynamic();
    if (aFija || bFija) {
      const movil = aFija ? b : a;
      const qM = movil.obj.mesh.quaternion;
      const anclaMovil = aFija ? anchorB : anchorA;
      // Eje en el frame de la pieza móvil: vale a la vez para ella y para el
      // adaptador, que se orienta igual (y por eso la pose de diseño es el
      // cero de la articulación).
      const ejeM = joint
        .ejeVector()
        .applyQuaternion(qM.clone().invert());
      const fijo = world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed()
          .setTranslation(w.x, w.y, w.z)
          .setRotation({ x: qM.x, y: qM.y, z: qM.z, w: qM.w }),
      );
      const ejeR = { x: ejeM.x, y: ejeM.y, z: ejeM.z };
      const cero = { x: 0, y: 0, z: 0 };
      const params =
        joint.kind === "revolute"
          ? RAPIER.JointData.revolute(cero, anclaMovil, ejeR)
          : RAPIER.JointData.prismatic(cero, anclaMovil, ejeR);
      const directo = world.createImpulseJoint(params, fijo, movil.body, true) as
        R.UnitImpulseJoint;
      directo.setContactsEnabled(false);
      // Las dos piezas del pivote no chocan entre sí salvo que la unión lo pida.
      if (!joint.contactos) {
        world
          .createImpulseJoint(RAPIER.JointData.rope(1e6, anchorA, anchorB), a.body, b.body, true)
          .setContactsEnabled(false);
        this.marcarSinContacto(a.body, b.body);
      }
      return directo;
    }

    // Adaptador: cuerpo en el punto de ancla, orientado como A (asi el eje
    // local de A vale tambien para el). Va SOLDADO a B; su masa e inercia se
    // toman del orden de las de B para que el solver no vea un salto de masa
    // de tres órdenes de magnitud (que volvía blanda la bisagra).
    const masaB = Math.max(0.2, b.body.mass());
    const inercia = Math.max(1e-3, masaB * 0.02); // ~ radio de giro de 14 cm
    const desc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(w.x, w.y, w.z)
      .setRotation({ x: qA.x, y: qA.y, z: qA.z, w: qA.w })
      .setAdditionalMassProperties(
        Math.min(masaB * 0.1, 2),
        { x: 0, y: 0, z: 0 },
        { x: inercia, y: inercia, z: inercia },
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
    // que tampoco colisionen entre si en el pivote. Si la union PIDE
    // contactos (bisagra real), no se registra: las dos piezas deben chocar.
    if (!joint.contactos) {
      const rope = world.createImpulseJoint(
        RAPIER.JointData.rope(1e6, anchorA, anchorB),
        a.body,
        b.body,
        true,
      );
      rope.setContactsEnabled(false);
      this.marcarSinContacto(a.body, b.body);
    }

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

  /**
   * SOLDADURAS (v0.2.32): agrupa en CONJUNTOS las piezas unidas por uniones
   * BLOQUEADAS. Cada conjunto se simula como un solo cuerpo rígido: uno de
   * sus miembros es el ANFITRIÓN (el que aporta el cuerpo) y los demás le
   * ceden sus colliders y su masa. Es lo que hace que un brazo compuesto
   * —brazo + extensión soldada— pivote como una pieza única.
   */
  private agruparSoldadas(
    objects: SceneObject[],
    joints: Joint[],
  ): { anfitrionDe: Map<string, string>; masaDe: Map<string, number> } {
    const anfitrionDe = new Map<string, string>();
    const masaDe = new Map<string, number>();
    const porId = new Map(objects.map((o) => [o.id, o]));
    // Union-find sobre las uniones bloqueadas.
    const padre = new Map<string, string>();
    const raiz = (a: string): string => {
      let r = a;
      while (padre.get(r) && padre.get(r) !== r) r = padre.get(r)!;
      return r;
    };
    for (const j of joints) {
      if (!j.locked) continue;
      if (!porId.has(j.bodyAId) || !porId.has(j.bodyBId)) continue;
      if (!padre.has(j.bodyAId)) padre.set(j.bodyAId, j.bodyAId);
      if (!padre.has(j.bodyBId)) padre.set(j.bodyBId, j.bodyBId);
      const ra = raiz(j.bodyAId);
      const rb = raiz(j.bodyBId);
      if (ra !== rb) padre.set(rb, ra);
    }
    if (padre.size === 0) return { anfitrionDe, masaDe };

    const grupos = new Map<string, string[]>();
    for (const id of padre.keys()) {
      const r = raiz(id);
      (grupos.get(r) ?? grupos.set(r, []).get(r)!).push(id);
    }
    for (const miembros of grupos.values()) {
      if (miembros.length < 2) continue;
      const piezas = miembros
        .map((id) => porId.get(id))
        .filter((o): o is SceneObject => !!o);
      // Un conjunto con alguna pieza ANCLADA queda anclado por completo; si
      // no, el anfitrión es la pieza con más masa (la que "manda").
      const fija = piezas.find((o) => o.physics.fixed);
      const anfitrion =
        fija ??
        piezas.reduce((mejor, o) => (o.effectiveMassKg() > mejor.effectiveMassKg() ? o : mejor));
      const masaTotal = piezas.reduce((s, o) => s + Math.max(0, o.effectiveMassKg()), 0);
      for (const o of piezas) anfitrionDe.set(o.id, anfitrion.id);
      masaDe.set(anfitrion.id, masaTotal);
      // DIAGNÓSTICO (v0.2.34): soldar una pieza ANCLADA a otras móviles
      // ancla el conjunto entero — es la trampa silenciosa que deja un brazo
      // compuesto inmóvil aunque su pivote esté bien puesto. Se avisa con
      // nombres para poder corregir la pieza culpable.
      if (fija) {
        const moviles = piezas.filter((o) => !o.physics.fixed);
        if (moviles.length > 0) {
          this.avisos.push(
            `El conjunto soldado de "${moviles[0].name}" quedó ANCLADO porque "${fija.name}" está anclada` +
              (moviles.length > 1 ? ` (y ${moviles.length - 1} pieza(s) móvil(es) más)` : ""),
          );
        }
      }
    }
    return { anfitrionDe, masaDe };
  }

  /** Incoherencias detectadas al armar el mundo (ver `avisos`). */
  avisosDeArmado(): string[] {
    return [...this.avisos];
  }

  /** Cede colliders y pose de cada pieza soldada al cuerpo de su anfitrión. */
  private fundirSoldadas(
    objects: SceneObject[],
    soldadas: { anfitrionDe: Map<string, string>; masaDe: Map<string, number> },
  ): void {
    if (!this.world || soldadas.anfitrionDe.size === 0) return;
    const porId = new Map(objects.map((o) => [o.id, o]));
    for (const [id, anfId] of soldadas.anfitrionDe) {
      if (id === anfId) continue;
      const obj = porId.get(id);
      const host = this.bodies.get(anfId);
      if (!obj || !host) continue;
      const qH = host.obj.mesh.quaternion;
      const relQ = qH.clone().invert().multiply(obj.mesh.quaternion);
      const relPos = obj.mesh.position
        .clone()
        .sub(host.obj.mesh.position)
        .applyQuaternion(qH.clone().invert())
        .multiplyScalar(S);
      for (const cd of this.colliderDescs(obj)) {
        const t = cd.translation;
        const pos = new THREE.Vector3(t.x, t.y, t.z).applyQuaternion(relQ).add(relPos);
        const r = cd.rotation;
        const rq = new THREE.Quaternion(r.x, r.y, r.z, r.w).premultiply(relQ);
        cd.setTranslation(pos.x, pos.y, pos.z);
        cd.setRotation({ x: rq.x, y: rq.y, z: rq.z, w: rq.w });
        cd.setDensity(0); // la masa del conjunto ya la puso el anfitrión
        this.world.createCollider(cd, host.body);
      }
      const entrada = {
        obj,
        host: host.body,
        relPos: { x: relPos.x, y: relPos.y, z: relPos.z },
        relQ: { x: relQ.x, y: relQ.y, z: relQ.z, w: relQ.w },
      };
      this.empotradas.push(entrada);
      this.empotradaPorId.set(id, entrada);
      // Juntas y cables que referencien la pieza resuelven al compuesto.
      this.bodies.set(id, { body: host.body, obj: host.obj });
    }
  }

  private addBody(obj: SceneObject, masaConjunto?: number): void {
    if (!this.world) return;
    // Una pieza marcada MÓVIL sin masa declarada no puede quedar estática por
    // omisión (era el caso que dejaba un brazo soldado a un cuerpo fijo en el
    // aire): recibe una masa mínima de trabajo.
    const propia = masaConjunto ?? obj.effectiveMassKg();
    const massKg = !obj.physics.fixed && propia <= 0 ? 1 : propia;
    const dynamic = massKg > 0 && !obj.physics.fixed;

    const desc = dynamic
      ? RAPIER.RigidBodyDesc.dynamic()
      : RAPIER.RigidBodyDesc.fixed();
    const p = obj.mesh.position;
    desc.setTranslation(p.x * S, p.y * S, p.z * S);
    const q = obj.mesh.quaternion;
    desc.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
    if (dynamic) {
      // Estabilidad (v0.2.4): CCD evita que piezas delgadas y rápidas (remo,
      // portadiscos) atraviesen o se ACUÑEN en la estructura entre pasos del
      // solver, y una amortiguación angular suave frena el bamboleo del
      // péndulo sin alterar la caída libre.
      desc.setCcdEnabled(true);
      desc.setAngularDamping(0.4);
    }

    const body = this.world.createRigidBody(desc);
    for (const cd of this.colliderDescs(obj)) this.world.createCollider(cd, body);
    // DISCOS MONTADOS sólidos (v0.2.10): cada disco de la carga recibe su
    // collider cilíndrico en el cuerpo de la pieza — un disco no cae por
    // debajo del suelo ni atraviesa superficies. Densidad 0: su masa ya la
    // aporta effectiveMassKg (cargaMontada × masaKg).
    if (obj.carga && obj.discosMontados() > 0) {
      const s = obj.mesh.scale;
      const rDisco = (obj.carga.diamCm / 2) * S;
      const hMedia = (obj.carga.grosorCm / 2) * S;
      for (const m of obj.getCargaParts()) {
        const cd = RAPIER.ColliderDesc.cylinder(hMedia, rDisco)
          .setTranslation(m.position.x * s.x * S, m.position.y * s.y * S, m.position.z * s.z * S)
          .setRotation({ x: m.quaternion.x, y: m.quaternion.y, z: m.quaternion.z, w: m.quaternion.w })
          .setDensity(0);
        this.world.createCollider(cd, body);
      }
    }
    if (dynamic) {
      body.setAdditionalMass(massKg, true);
      this.masaExtra.set(body, massKg);
    }

    this.bodies.set(obj.id, { body, obj });
  }

  /**
   * Colliders de una pieza. Piezas TRAZADAS dobladas (vigas y tubos con
   * codos) reciben UNA CUERDA DE COLLIDERS que sigue su curva real
   * (v0.2.14): la caja envolvente única era un muro invisible que llenaba
   * el hueco del codo — en un rack, la barra caía "sobre nada" y quedaba
   * acuñada en el aire sin alcanzar jotas ni cadenas de seguridad.
   */
  private colliderDescs(obj: SceneObject): R.ColliderDesc[] {
    const p = obj.params;
    // La placa dentada DECLARA sus cajas (v0.2.73): son seis cunas apiladas
    // una encima de otra, y el muestreo con rayos verticales de las jotas
    // saca de eso un solo canal. Sobre un pilar diagonal, ni eso.
    if (p.kind === "dentada") {
      const cajas = this.collidersDentada(obj);
      if (cajas.length) return cajas;
    }
    // Jotas y brazos de seguridad: el asiento CÓNCAVO real de la malla
    // (v0.2.15) — la caja lisa dejaba resbalar la barra fuera del gancho.
    if (getDefinition(obj.componentId)?.asientoBarra) {
      const asiento = this.collidersAsiento(obj);
      if (asiento.length >= 3) return asiento;
    }
    if ((p.kind === "beam" || p.kind === "tube") && p.path && !pathIsStraight(p.path)) {
      return this.collidersDoblado(obj);
    }
    return [this.colliderDesc(obj)];
  }

  /**
   * ASIENTO CÓNCAVO de una jota/brazo (v0.2.15): la superficie superior de
   * la malla real se muestrea con rayos verticales a lo largo del brazo y
   * cada muestra se vuelve una columna de collider — el canal en J queda
   * representado tal cual es (asiento bajo, tope delantero, respaldo alto):
   * la barra apoyada queda RETENIDA en la concavidad y no puede rodar ni
   * deslizar fuera, que es exactamente para lo que existe el gancho.
   */
  private collidersAsiento(obj: SceneObject): R.ColliderDesc[] {
    const geo = obj.mesh.geometry;
    if (!geo.boundingBox) geo.computeBoundingBox();
    const bb = geo.boundingBox!;
    const esc = obj.mesh.scale;
    const spanX = bb.max.x - bb.min.x;
    const spanZ = bb.max.z - bb.min.z;
    if (spanX < 0.2 || spanZ < 0.2 || bb.max.y - bb.min.y < 0.2) return [];
    // El brazo (y su canal) corre por el eje horizontal MÁS LARGO local.
    const ejeZ = spanZ >= spanX;
    const largo = ejeZ ? spanZ : spanX;
    const n = Math.min(48, Math.max(8, Math.round(largo / 1.2)));
    const paso = largo / n;
    const malla = new THREE.Mesh(geo);
    malla.updateMatrixWorld();
    const ray = new THREE.Raycaster();
    const abajo = new THREE.Vector3(0, -1, 0);
    const origen = new THREE.Vector3();
    const xMid = (bb.min.x + bb.max.x) / 2;
    const zMid = (bb.min.z + bb.max.z) / 2;
    const out: R.ColliderDesc[] = [];
    for (let i = 0; i < n; i++) {
      const sc = (ejeZ ? bb.min.z : bb.min.x) + (i + 0.5) * paso;
      origen.set(ejeZ ? xMid : sc, bb.max.y + 5, ejeZ ? sc : zMid);
      ray.set(origen, abajo);
      const hit = ray.intersectObject(malla, false)[0];
      if (!hit) continue;
      const yTop = hit.point.y;
      if (yTop - bb.min.y < 0.2) continue;
      const cd = RAPIER.ColliderDesc.cuboid(
        (ejeZ ? spanX / 2 : paso / 2) * Math.abs(esc.x) * S,
        ((yTop - bb.min.y) / 2) * Math.abs(esc.y) * S,
        (ejeZ ? paso / 2 : spanZ / 2) * Math.abs(esc.z) * S,
      );
      cd.setTranslation(
        (ejeZ ? xMid : sc) * esc.x * S,
        ((yTop + bb.min.y) / 2) * esc.y * S,
        (ejeZ ? sc : zMid) * esc.z * S,
      );
      cd.setRestitution(0.02).setFriction(0.9);
      out.push(cd);
    }
    return out;
  }

  /**
   * CAJAS DE LA PLACA DENTADA (v0.2.73), tomadas de su propio perfil.
   *
   * La placa sabe dónde están sus cunas —las calculó para dibujarse— así que
   * aquí no se adivina nada: se traducen sus cajas locales a colliders. Cada
   * gancho aporta el bloque de su cuna y el dedo que la cierra por fuera; la
   * espina, entera, hace de pared interior de todas.
   *
   * Con eso la barra que cae en un gancho queda RETENIDA por los tres lados y
   * abierta solo por arriba, que es como funciona una jota.
   */
  private collidersDentada(obj: SceneObject): R.ColliderDesc[] {
    const esc = obj.mesh.scale;
    // EL ESPEJO HAY QUE APLICARLO A MANO (v0.2.76). Voltear una pieza no la
    // escala en negativo —eso daría semiejes imposibles— sino que HORNEA el
    // espejo en los vértices de la malla. La placa, en cambio, no declara sus
    // cajas leyendo la malla sino calculándolas de sus medidas, así que se
    // quedaban sin voltear: donde el usuario veía los ganchos, la física tenía
    // la losa lisa de la espina, y los ganchos de verdad flotaban diez
    // centímetros al otro lado, dentro del pilar. Espejar una caja alineada a
    // los ejes es solo cambiarle el signo al centro; el tamaño no se toca.
    const esp = espejoDe(obj.params.espejo);
    const sg: [number, number, number] = [esp[0] ? -1 : 1, esp[1] ? -1 : 1, esp[2] ? -1 : 1];
    const out: R.ColliderDesc[] = [];
    for (const c of cajasDentada(obj.params)) {
      const cd = RAPIER.ColliderDesc.cuboid(
        Math.max((c.tam[0] / 2) * Math.abs(esc.x) * S, 0.002),
        Math.max((c.tam[1] / 2) * Math.abs(esc.y) * S, 0.002),
        Math.max((c.tam[2] / 2) * Math.abs(esc.z) * S, 0.002),
      );
      cd.setTranslation(
        c.centro[0] * sg[0] * esc.x * S,
        c.centro[1] * sg[1] * esc.y * S,
        c.centro[2] * sg[2] * esc.z * S,
      );
      // Acero contra acero moleteado: agarra y no rebota.
      cd.setRestitution(0.02).setFriction(0.9);
      out.push(cd);
    }
    return out;
  }

  /** Cápsulas (tubo) o prismas (viga) por cada cuerda de la curva doblada. */
  private collidersDoblado(obj: SceneObject): R.ColliderDesc[] {
    const p = obj.params;
    const esc = obj.mesh.scale;
    // Escala transversal aproximada del perfil (los ejes X/Z locales).
    const sT = (Math.abs(esc.x) + Math.abs(esc.z)) / 2;
    const up = new THREE.Vector3(0, 1, 0);
    const out: R.ColliderDesc[] = [];
    for (const { a, b } of cuerdasColision(p.path!)) {
      const A = a.clone().multiply(esc).multiplyScalar(S);
      const B = b.clone().multiply(esc).multiplyScalar(S);
      const largo = A.distanceTo(B);
      if (largo < 1e-4) continue;
      const medio = A.clone().add(B).multiplyScalar(0.5);
      const q = new THREE.Quaternion().setFromUnitVectors(
        up,
        B.clone().sub(A).normalize(),
      );
      let cd: R.ColliderDesc;
      if (p.kind === "tube") {
        const r = Math.max((p.radius ?? 2.4) * sT * S, 0.002);
        // La cápsula ya redondea los empalmes entre cuerdas.
        cd = RAPIER.ColliderDesc.capsule(largo / 2, r);
      } else {
        const hw = Math.max(((p.width ?? 5) / 2) * sT * S, 0.002);
        const hd = Math.max(((p.depth ?? 5) / 2) * sT * S, 0.002);
        // Media sección de sobrelargo: los prismas se solapan en el codo
        // en vez de dejar rendijas.
        cd = RAPIER.ColliderDesc.cuboid(hw, largo / 2 + Math.min(hw, hd), hd);
      }
      cd.setTranslation(medio.x, medio.y, medio.z);
      cd.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
      cd.setRestitution(0.05).setFriction(0.8);
      out.push(cd);
    }
    return out.length ? out : [this.colliderDesc(obj)];
  }

  private colliderDesc(obj: SceneObject): R.ColliderDesc {
    const size = obj.localSize();
    // |tamaño|: una pieza ESPEJADA (escala negativa) daría semiejes
    // negativos — comportamiento indefinido en el motor.
    const hx = (Math.abs(size.x) / 2) * S;
    const hy = (Math.abs(size.y) / 2) * S;
    const hz = (Math.abs(size.z) / 2) * S;
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
        // Tubo recto: cilindro exacto (el doblado va por collidersDoblado).
        desc = RAPIER.ColliderDesc.cylinder(hy, r);
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
    /** Agarre FIRME: la pieza está articulada y solo puede seguir su arco. */
    firme: boolean;
  } | null = null;

  /**
   * Agarra una pieza dinámica por el punto de mundo dado (cm), como una mano.
   * Devuelve false si la pieza no existe o no es dinámica.
   */
  /** Magnitud (N) máxima sostenida por la mano en el agarre actual. */
  private tensionMaxN = 0;
  /** |F| filtrada (media móvil exponencial) del agarre actual. */
  private tensionEMA = 0;

  /** Tensión máxima del agarre actual en kilogramos-fuerza. */
  tensionManoKg(): number {
    return this.tensionMaxN / 9.81;
  }

  /**
   * Eje de giro (en cm de mundo) de la pieza, si está articulada por una
   * bisagra libre: punto del pasador y dirección. La mano lo usa para
   * arrastrar SIGUIENDO EL ARCO que la pieza puede recorrer de verdad.
   */
  ejeDeGiro(objectId: string): { punto: THREE.Vector3; eje: THREE.Vector3 } | null {
    const e = this.bodies.get(objectId);
    if (!e) return null;
    const h = this.bisagras.get(e.body);
    if (!h) return null;
    const t = h.ref.translation();
    const r = h.ref.rotation();
    const q = new THREE.Quaternion(r.x, r.y, r.z, r.w);
    const punto = new THREE.Vector3(h.ancla.x, h.ancla.y, h.ancla.z)
      .applyQuaternion(q)
      .add(new THREE.Vector3(t.x, t.y, t.z))
      .divideScalar(S);
    const eje = new THREE.Vector3(h.eje.x, h.eje.y, h.eje.z).applyQuaternion(q).normalize();
    return { punto, eje };
  }

  /**
   * ¿Puede la mano mover esta pieza? Vale tanto para una pieza suelta como
   * para una ergonómica o estructural que forme parte de un conjunto móvil
   * (un asiento soldado a un brazo, el travesaño de un carro): lo que decide
   * es el CUERPO al que pertenece, no la pieza que se tocó.
   */
  puedeAgarrar(objectId: string): boolean {
    const e = this.bodies.get(objectId);
    if (!e) return false;
    return e.body.isDynamic() || this.topeCongelados.has(e.body);
  }

  /**
   * CUERPO FÍSICO DEL MANIQUÍ (v0.2.44).
   *
   * Cada segmento de la figura entra en el motor como cuerpo CINEMÁTICO: la
   * postura la manda el usuario (posar, ▲▼, agarres), no la gravedad, así que
   * el maniquí no se desploma ni lo empuja la máquina — pero la máquina
   * tampoco puede atravesarlo. Un brazo de press que llega al torso choca y
   * se detiene, que es lo que pasa con una persona sentada de verdad.
   *
   * Los colisionadores son los del propio segmento (esfera, cilindro, caja),
   * no cajas envolventes: un muslo cilíndrico rueda contra el asiento como un
   * muslo, no como un ladrillo.
   */
  private figura: { body: R.RigidBody; malla: THREE.Mesh }[] = [];

  /** ¿Está el maniquí representado en el motor? */
  get figuraEnElMotor(): boolean {
    return this.figura.length > 0;
  }

  /** Da cuerpo a la figura: un cinemático por segmento visible. */
  añadirFigura(fig: THREE.Group): void {
    const world = this.world;
    if (!world) return;
    this.quitarFigura();
    fig.updateMatrixWorld(true);
    const pos = new THREE.Vector3();
    const rot = new THREE.Quaternion();
    const esc = new THREE.Vector3();
    fig.traverse((n) => {
      const malla = n as THREE.Mesh;
      if (!malla.isMesh || !malla.visible || !malla.userData.humanFigurePart) return;
      // MANOS Y PIES no llevan collider: son los puntos por los que la figura
      // AGARRA la máquina. Apoyar una mano en un asa la lleva justo encima de
      // ella, y si además chocaran, la IK del brazo y el contacto se pelearían
      // empujándose sin parar. Lo que no puede atravesarse es el cuerpo.
      if (SEGMENTOS_SIN_CUERPO.has(malla.userData.segmentId as string)) return;
      const cd = this.colliderDeSegmento(malla);
      if (!cd) return;
      malla.matrixWorld.decompose(pos, rot, esc);
      const body = world.createRigidBody(
        RAPIER.RigidBodyDesc.kinematicPositionBased()
          .setTranslation(pos.x * S, pos.y * S, pos.z * S)
          .setRotation({ x: rot.x, y: rot.y, z: rot.z, w: rot.w }),
      );
      // Rozamiento de ropa: frena, pero no pega la pieza al cuerpo.
      world.createCollider(cd.setFriction(0.7).setRestitution(0.02), body);
      this.figura.push({ body, malla });
    });
  }

  /** Retira del motor los cuerpos del maniquí. */
  quitarFigura(): void {
    if (this.world) {
      for (const s of this.figura) this.world.removeRigidBody(s.body);
    }
    this.figura = [];
  }

  /**
   * Collider de un segmento, con la forma de su primitiva. El centro de la
   * geometría puede no estar en el origen del hueso (los huesos cuelgan hacia
   * −Y), así que se desplaza al centro real de su caja.
   */
  private colliderDeSegmento(malla: THREE.Mesh): R.ColliderDesc | null {
    const geo = malla.geometry as THREE.BufferGeometry & {
      type?: string;
      parameters?: Record<string, number>;
    };
    if (!geo.boundingBox) geo.computeBoundingBox();
    const bb = geo.boundingBox;
    if (!bb) return null;
    const esc = new THREE.Vector3();
    malla.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), esc);
    const sx = Math.abs(esc.x) * S;
    const sy = Math.abs(esc.y) * S;
    const sz = Math.abs(esc.z) * S;
    const semi = bb.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    const p = geo.parameters ?? {};
    let cd: R.ColliderDesc | null = null;
    if (geo.type === "SphereGeometry" && p.radius) {
      cd = RAPIER.ColliderDesc.ball(p.radius * Math.max(sx, sy, sz));
    } else if (geo.type === "CylinderGeometry" && p.radiusTop !== undefined) {
      const r = Math.max(p.radiusTop, p.radiusBottom ?? p.radiusTop) * Math.max(sx, sz);
      cd = RAPIER.ColliderDesc.cylinder(((p.height ?? 1) / 2) * sy, r);
    } else if (geo.type === "CapsuleGeometry" && p.radius !== undefined) {
      cd = RAPIER.ColliderDesc.capsule(
        ((p.length ?? p.height ?? 0) / 2) * sy,
        p.radius * Math.max(sx, sz),
      );
    } else {
      cd = RAPIER.ColliderDesc.cuboid(
        Math.max(semi.x * sx, 0.005),
        Math.max(semi.y * sy, 0.005),
        Math.max(semi.z * sz, 0.005),
      );
    }
    const centro = bb.getCenter(new THREE.Vector3());
    if (centro.lengthSq() > 1e-8) {
      cd.setTranslation(centro.x * sx, centro.y * sy, centro.z * sz);
    }
    return cd;
  }

  /**
   * Lleva los cuerpos del maniquí a la pose que marcan sus mallas. Se usa el
   * destino CINEMÁTICO (no un teletransporte) para que Rapier deduzca la
   * velocidad del segmento y empuje bien lo que tenga delante en vez de
   * aparecer dentro.
   */
  private sincronizarFigura(): void {
    if (this.figura.length === 0) return;
    const pos = new THREE.Vector3();
    const rot = new THREE.Quaternion();
    const esc = new THREE.Vector3();
    for (const s of this.figura) {
      s.malla.matrixWorld.decompose(pos, rot, esc);
      s.body.setNextKinematicTranslation({ x: pos.x * S, y: pos.y * S, z: pos.z * S });
      s.body.setNextKinematicRotation({ x: rot.x, y: rot.y, z: rot.z, w: rot.w });
    }
  }

  /**
   * CAJAS DE LA ESTRUCTURA (v0.2.43), en CENTÍMETROS de la escena.
   *
   * El maniquí no tiene cuerpo en el motor, así que para saber dónde NO puede
   * meter un brazo necesita una descripción del hierro: cada collider se
   * devuelve como caja orientada en su pose ACTUAL, de modo que la lista sirve
   * también con la máquina en movimiento. Las formas redondas (cilindros,
   * cápsulas, esferas) se acotan por su caja envolvente, que es lo bastante
   * fiel para un tope y no cuesta nada de calcular.
   */
  cajasDeColision(excluirIds?: Set<string>): {
    c: THREE.Vector3;
    e: [THREE.Vector3, THREE.Vector3, THREE.Vector3];
    h: [number, number, number];
  }[] {
    const out: {
      c: THREE.Vector3;
      e: [THREE.Vector3, THREE.Vector3, THREE.Vector3];
      h: [number, number, number];
    }[] = [];
    // Cuerpos que NO cuentan como estorbo (los apoyos ergonómicos: tocarlos
    // es justo lo que tiene que pasar).
    const fuera = new Set<R.RigidBody>();
    if (excluirIds) {
      for (const id of excluirIds) {
        const e = this.bodies.get(id);
        if (e) fuera.add(e.body);
      }
    }
    const vistos = new Set<R.RigidBody>();
    const m = new THREE.Matrix4();
    for (const { body } of this.bodies.values()) {
      if (vistos.has(body) || fuera.has(body)) continue;
      vistos.add(body);
      for (let i = 0; i < body.numColliders(); i++) {
        const col = body.collider(i);
        if (col.isSensor()) continue;
        const s = col.shape as {
          halfExtents?: { x: number; y: number; z: number };
          halfHeight?: number;
          radius?: number;
          type?: number;
        };
        let h: [number, number, number] | null = null;
        if (s.halfExtents) {
          h = [s.halfExtents.x, s.halfExtents.y, s.halfExtents.z];
        } else if (s.halfHeight !== undefined && s.radius !== undefined) {
          // La cápsula añade su radio a los dos casquetes; el cilindro no.
          const tapa = s.type === RAPIER.ShapeType.Capsule ? s.radius : 0;
          h = [s.radius, s.halfHeight + tapa, s.radius];
        } else if (s.radius !== undefined) {
          h = [s.radius, s.radius, s.radius];
        }
        if (!h) continue;
        const p = col.translation();
        const q = col.rotation();
        m.makeRotationFromQuaternion(new THREE.Quaternion(q.x, q.y, q.z, q.w));
        out.push({
          c: new THREE.Vector3(p.x / S, p.y / S, p.z / S),
          e: [
            new THREE.Vector3().setFromMatrixColumn(m, 0),
            new THREE.Vector3().setFromMatrixColumn(m, 1),
            new THREE.Vector3().setFromMatrixColumn(m, 2),
          ],
          h: [h[0] / S, h[1] / S, h[2] / S],
        });
      }
    }
    return out;
  }

  grab(objectId: string, worldCm: THREE.Vector3, firme = false): boolean {
    const e = this.bodies.get(objectId);
    if (!e) return false;
    // Un extremo parqueado en su tope se DESCONGELA al agarrarlo.
    if (this.topeCongelados.has(e.body)) {
      e.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
      this.topeCongelados.delete(e.body);
    }
    if (!e.body.isDynamic()) return false;
    const t = e.body.translation();
    const q = e.body.rotation();
    const worldM = worldCm.clone().multiplyScalar(S);
    const local = worldM
      .clone()
      .sub(new THREE.Vector3(t.x, t.y, t.z))
      .applyQuaternion(new THREE.Quaternion(q.x, q.y, q.z, q.w).invert());
    this.drag = { body: e.body, local, target: worldM, firme };
    this.tensionMaxN = 0; // cada agarre mide su propia tensión
    this.tensionEMA = 0;
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
    // Resorte en espacio de FUERZA (v0.2.10): el presupuesto de la mano es
    // HUMANO e independiente de la masa de la pieza agarrada. Antes la
    // fuerza escalaba con esa masa (acc·m): agarrando una barra liviana de
    // 2 kg la mano topaba en ~120 N y no podía arrastrar el contrapeso de
    // 38 kg conectado por el cable. Sobre-amortiguado para TODAS las masas
    // (KD/2√(KP·m) > 1 desde 0,3 kg), así no oscila ni con piezas ligeras.
    // AGARRE FIRME (v0.2.38): sobre una pieza ARTICULADA la mano no sujeta un
    // objeto suelto sino una manilla que solo puede recorrer su arco; ahí la
    // mano da tres veces menos juego y el brazo sigue al dedo en vez de
    // quedarse atrás. KP y KD suben JUNTOS, así el amortiguamiento relativo
    // (y por tanto la estabilidad para cualquier masa) es el mismo de siempre.
    const rigidez = d.firme ? 3 : 1;
    const KP = 1500 * rigidez; // N/m
    const KD = 120 * rigidez; // N·s/m
    // FUERZA SIEMPRE SUFICIENTE (v0.2.14): la mano ya no topa en un
    // presupuesto humano — puede levantar y operar cualquier móvil de la
    // máquina. A cambio, el simulador REPORTA cuánto costó: la tensión
    // máxima SOSTENIDA del agarre (ver tensionManoKg). La correa de error
    // y el tope solo protegen la estabilidad numérica del solver.
    const FMAX = 20_000; // N (~2 toneladas: nunca limita un ejercicio real)
    const err = new THREE.Vector3(
      d.target.x - pw.x,
      d.target.y - pw.y,
      d.target.z - pw.z,
    );
    if (err.length() > 2) err.setLength(2); // correa: sin catapultas
    const F = new THREE.Vector3(
      err.x * KP - v.x * KD,
      err.y * KP - v.y * KD,
      err.z * KP - v.z * KD,
    );
    if (F.length() > FMAX) F.setLength(FMAX);
    // La LECTURA de tensión es el esfuerzo sostenido, no los picos de un
    // subpaso del solver: |F| pasa por un filtro exponencial y se registra
    // el máximo del valor filtrado.
    this.tensionEMA += 0.08 * (F.length() - this.tensionEMA);
    if (this.tensionEMA > this.tensionMaxN) this.tensionMaxN = this.tensionEMA;
    d.body.applyImpulseAtPoint(
      { x: F.x * dt, y: F.y * dt, z: F.z * dt },
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
      // Instantánea para la esticción de los cuerpos colgados de cables.
      this.posAntes.clear();
      for (const b of this.cuerposCable) {
        if (b.isDynamic()) this.posAntes.set(b, { ...b.translation() });
      }
      this.applyDrag(PhysicsWorld.FIXED_DT);
      // El maniquí manda su postura al motor ANTES del paso: sus segmentos
      // son cinemáticos, así que llegan como destino y el motor calcula con
      // qué velocidad barren lo que tengan delante.
      this.sincronizarFigura();
      this.world.step();
      this.aplicarGuias();
      // Cable: primero corrige velocidades, luego proyecta posiciones para
      // conservar la longitud de forma dura (cable inextensible).
      if (this.cables.length > 0) {
        // 32 pasadas Gauss-Seidel: la TENSIÓN debe propagarse a través de
        // los nodos livianos (el puente del carro pesa 0,8 kg entre dos
        // cables y actúa como resorte blando en serie) hasta el contrapeso
        // pesado — con pocas pasadas el reparto por masa inversa apenas
        // toca al portadiscos y el cable se estira en vez de transmitir.
        for (let it = 0; it < 32; it++) {
          for (const c of this.cables) {
            this.solveCableVelocity(c);
            this.aplicarFrenos(c, false);
          }
        }
        // Instantánea previa a la parte POSICIONAL: es la que se barre luego
        // para que ninguna corrección de longitud atraviese geometría.
        this.posCable.clear();
        for (const c of this.cables) {
          for (const b of c.bodies) {
            if (!this.posCable.has(b)) this.posCable.set(b, { ...b.translation() });
          }
        }
        for (let it = 0; it < 8; it++) {
          for (const c of this.cables) {
            this.solveCablePosition(c);
            this.aplicarFrenos(c, true);
          }
        }
        // Topes de terminal: el extremo no pasa por su roldana vecina.
        for (const c of this.cables) this.aplicarTopesCable(c);
        // Nada de lo anterior pudo meter una pieza dentro de otra.
        this.frenarAtravesamiento();
        // La corrección del cable no puede sacar a las guiadas de su riel.
        this.aplicarGuias();
        // ESTICCIÓN de polea (posicional): si en este subpaso un cuerpo
        // colgado de cables se desplazó menos de 0,5 mm (< 3 cm/s), el
        // desplazamiento se revierte y el cuerpo queda aparcado. Esto mata
        // por completo la deriva cuasi-estática del compromiso entre cables
        // acoplados (el solver oscila fuerte por dentro pero solo "repta"
        // milímetros netos). SOLO aplica en REPOSO: con la mano activa se
        // desactiva — un contrapeso pesado necesita varios subpasos para
        // acelerar desde cero y el muro de la esticción lo dejaría clavado
        // por fuerte que tire el usuario.
        if (!this.drag) {
          for (const [b, antes] of this.posAntes) {
            if (!b.isDynamic()) continue;
            const t = b.translation();
            const dx = t.x - antes.x;
            const dy = t.y - antes.y;
            const dz = t.z - antes.z;
            if (dx * dx + dy * dy + dz * dz < 0.0005 * 0.0005) {
              b.setTranslation(antes, true);
              b.setLinvel({ x: 0, y: 0, z: 0 }, true);
            }
          }
        }
      }
      // Guardarraíl al final de CADA subpaso (v0.2.14).
      this.limitarDesbocados();
    }
    for (const { body, obj } of this.bodies.values()) {
      if (body.isFixed()) continue;
      const t = body.translation();
      obj.mesh.position.set(t.x / S, t.y / S, t.z / S);
      const r = body.rotation();
      obj.mesh.quaternion.set(r.x, r.y, r.z, r.w);
    }
    // Roldanas empotradas: su malla se reproyecta desde el cuerpo compuesto
    // del anfitrión con la pose relativa de diseño.
    for (const emp of this.empotradas) {
      if (emp.host.isFixed()) continue;
      const t = emp.host.translation();
      const q = emp.host.rotation();
      const qh = new THREE.Quaternion(q.x, q.y, q.z, q.w);
      const p = new THREE.Vector3(emp.relPos.x, emp.relPos.y, emp.relPos.z).applyQuaternion(qh);
      emp.obj.mesh.position.set((t.x + p.x) / S, (t.y + p.y) / S, (t.z + p.z) / S);
      emp.obj.mesh.quaternion
        .copy(qh)
        .multiply(new THREE.Quaternion(emp.relQ.x, emp.relQ.y, emp.relQ.z, emp.relQ.w));
    }
  }

  /**
   * PUNTO DE PARTIDA DE LA MÁQUINA (v0.2.51): recoloca las piezas móviles en
   * la configuración congelada, ya construido el mundo.
   *
   * El orden importa y es DELIBERADO: primero se construye desde el DISEÑO
   * —así los cables miden su longitud real, las cuerdas su arco real y cada
   * unión cera sus topes en la pose de fabricación— y solo DESPUÉS se mueven
   * los cuerpos. Construir directamente sobre la pose congelada le cambiaría
   * la longitud al cable y el cero a los topes, que es falsear la máquina.
   *
   * Lo que queda incoherente tras el salto —un cable que ahora está tenso, una
   * pila que debería haber subido— lo resuelve el propio motor en los primeros
   * pasos, que es exactamente lo que pasa en la máquina real.
   *
   * Las piezas SOLDADAS no se tocan: cedieron su cuerpo al anfitrión y viajan
   * con él, así que moverlas por separado partiría el conjunto.
   */
  /**
   * MODO POSE (v0.2.55): la máquina se deja mover a mano y se queda donde la
   * dejas, como una parálisis cérea.
   *
   * No es una simulación con la gravedad apagada y ya está: sin gravedad, un
   * brazo empujado seguiría girando para siempre porque nada lo frena. Lo que
   * lo convierte en «pose» es la AMORTIGUACIÓN muy alta, que se come la
   * velocidad en cuanto sueltas. Las uniones y los topes siguen mandando, así
   * que el mecanismo solo recorre los grados de libertad que de verdad tiene
   * — igual que posar el maniquí solo dobla por sus articulaciones.
   */
  modoPose(activo: boolean): void {
    if (!this.world) return;
    this.world.gravity = activo ? { x: 0, y: 0, z: 0 } : GRAVITY;
    for (const { body } of this.bodies.values()) {
      if (body.isFixed()) continue;
      body.setLinearDamping(activo ? 12 : 0);
      body.setAngularDamping(activo ? 12 : 0);
      if (activo) {
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      }
    }
  }

  /** Postura actual de cada pieza móvil, en cm de la escena. */
  posesDePiezas(): Map<string, { p: THREE.Vector3; q: THREE.Quaternion }> {
    const out = new Map<string, { p: THREE.Vector3; q: THREE.Quaternion }>();
    for (const [id, entrada] of this.bodies) {
      if (entrada.obj.id !== id) continue; // fundida: la lleva su anfitrión
      if (entrada.body.isFixed()) continue;
      out.set(id, {
        p: entrada.obj.mesh.position.clone(),
        q: entrada.obj.mesh.quaternion.clone(),
      });
    }
    return out;
  }

  recolocarPiezas(poses: Map<string, { p: THREE.Vector3; q: THREE.Quaternion }>): number {
    let movidas = 0;
    for (const [id, t] of poses) {
      const entrada = this.bodies.get(id);
      if (!entrada || entrada.obj.id !== id) continue; // fundida: la mueve su anfitrión
      const { body } = entrada;
      if (body.isFixed()) continue; // anclada al suelo: no es parte del gesto
      body.setTranslation({ x: t.p.x * S, y: t.p.y * S, z: t.p.z * S }, true);
      body.setRotation({ x: t.q.x, y: t.q.y, z: t.q.z, w: t.q.w }, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      entrada.obj.mesh.position.copy(t.p);
      entrada.obj.mesh.quaternion.copy(t.q);
      movidas++;
    }
    return movidas;
  }

  /**
   * GUARDARRAÍL DE ESTABILIDAD (v0.2.14). Dos garantías por subpaso:
   *
   * 1. NADA se desboca. Al arrancar la simulación, una pieza colocada a ojo
   *    puede quedar SOLAPADA con otra (una barra apoyada "dentro" de la caja
   *    de una jota); Rapier resuelve esa penetración con un impulso de
   *    separación que la lanzaba a decenas de m/s — y una barra delgada a esa
   *    velocidad atraviesa cualquier cosa. Con la velocidad acotada a 12 m/s
   *    (43 km/h, muy por encima de cualquier gesto real) la separación sigue
   *    ocurriendo, pero empujando en vez de disparando.
   * 2. NADIE cruza el suelo. Si pese a todo un cuerpo aparece por debajo de
   *    la losa, se devuelve justo sobre el piso con la velocidad anulada: el
   *    suelo es infranqueable por construcción, no por suerte numérica.
   */
  private limitarDesbocados(): void {
    // 8 m/s cubre cualquier caída legítima dentro de una máquina de 2,2 m
    // (√(2·g·2,2) ≈ 6,6) y recorta los impulsos de despenetración que
    // catapultaban piezas a través de cadenas y suelo (v0.2.19).
    const VMAX = 8; // m/s
    const WMAX = 30; // rad/s
    for (const { body } of this.bodies.values()) {
      if (!body.isDynamic()) continue;
      const v = body.linvel();
      const vLen = Math.hypot(v.x, v.y, v.z);
      if (vLen > VMAX) {
        const k = VMAX / vLen;
        body.setLinvel({ x: v.x * k, y: v.y * k, z: v.z * k }, true);
      }
      const w = body.angvel();
      const wLen = Math.hypot(w.x, w.y, w.z);
      if (wLen > WMAX) {
        const k = WMAX / wLen;
        body.setAngvel({ x: w.x * k, y: w.y * k, z: w.z * k }, true);
      }
      const t = body.translation();
      if (t.y < -0.05) {
        body.setTranslation({ x: t.x, y: 0.02, z: t.z }, true);
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      }
    }
  }

  dispose(): void {
    this.world?.free();
    this.world = null;
    this.bodies.clear();
    this.bisagras.clear();
    this.cables = [];
    this.guias = [];
    this.empotradas = [];
    this.empotradaPorId.clear();
    this.masaExtra.clear();
    this.cuerposCable.clear();
    this.topeCongelados.clear();
    this.posCable.clear();
    this.sinContacto.clear();
    this.figura = [];
    this.drag = null;
  }
}

function norm(x: number, y: number, z: number): { x: number; y: number; z: number } {
  const len = Math.hypot(x, y, z) || 1;
  return { x: x / len, y: y / len, z: z / len };
}
