import type * as R from "@dimforge/rapier3d-compat";
import * as THREE from "three";

// Rapier (~2,2 MB de WASM en base64) se importa dinamicamente al iniciar la
// PRIMERA simulacion: disenar no lo necesita y el arranque queda mas ligero.
let RAPIER: typeof R;
import type { SceneObject } from "../objects/SceneObject";
import { cuerdasColision, pathIsStraight } from "../objects/linePieces";
import { getDefinition } from "../objects/componentLibrary";
import { axisVector, type Joint } from "./joints";
import type { Cable } from "./cables";

const DEG2RAD = Math.PI / 180;

/**
 * Cuerda de seguridad vista por el motor: extremos en MUNDO (cm), caída de
 * la catenaria y radio del eslabón. `movil` marca las que cuelgan de piezas
 * dinámicas (no se materializan).
 */
export interface RopeFisica {
  a: [number, number, number];
  b: [number, number, number];
  sag: number;
  radio: number;
  movil: boolean;
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
    this.cables = [];
    this.guias = [];
    this.empotradas = [];
    this.empotradaPorId.clear();
    this.masaExtra.clear();
    this.cuerposCable.clear();
    this.topeCongelados.clear();
    this.drag = null;
    this.world = new RAPIER.World(GRAVITY);

    // Suelo fijo: cara superior en y = 0. LOSA GRUESA (v0.2.14): 10 m de
    // espesor — una pieza delgada y rápida (una barra cargada que cae desde
    // el rack) no puede atravesarla entre dos pasos del solver, como sí
    // ocurría con la losa de 1 m.
    const ground = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(60, 5, 60).setTranslation(0, -5, 0),
      ground,
    );

    for (const obj of objects) this.addBody(obj);
    // Antes de juntas y cables: las roldanas adosadas se FUNDEN con el cuerpo
    // de su estructura (los nodos de cable que las referencien resolverán al
    // cuerpo compuesto).
    this.detectarEmpotradas();
    // Los accesorios de calce (jotas, brazos, anclajes) montados en una
    // estructura con pinholes forman GRUPO con ella: fijados, no se caen.
    this.detectarCalzados();
    for (const joint of joints) this.addJoint(joint);
    for (const cable of cables) this.addCable(cable);
    // CADENAS Y CORREAS DE SEGURIDAD (v0.2.14): dejan de ser adorno visual —
    // se materializan como una cuerda de cápsulas que DETIENE la barra.
    for (const r of ropes) this.addRopeBarrier(r);
    this.detectarGuias();
  }

  /**
   * CADENA/CORREA DE SEGURIDAD como BARRERA FÍSICA (v0.2.14): la cuerda se
   * muestrea a lo largo de su catenaria y cada tramo recibe una cápsula
   * colisionable. Con los dos extremos anclados a piezas FIJAS (el caso de
   * las cadenas de seguridad tendidas entre los pilares de un rack) la
   * barrera es un cuerpo estático: una barra que cae desde las jotas queda
   * DETENIDA por la cadena, como en la máquina real. Si algún extremo
   * cuelga de una pieza móvil, la cuerda se deja solo visual (su geometría
   * cambiaría a cada paso).
   */
  private addRopeBarrier(r: RopeFisica): void {
    if (!this.world || r.movil) return;
    const a = new THREE.Vector3(r.a[0], r.a[1], r.a[2]);
    const b = new THREE.Vector3(r.b[0], r.b[1], r.b[2]);
    const D = a.distanceTo(b);
    if (D < 1) return;
    const sag = r.sag; // caída de la catenaria (cm), misma fórmula del visual
    const N = THREE.MathUtils.clamp(Math.round(D / 8), 4, 40);
    const punto = (t: number): THREE.Vector3 => {
      const p = a.clone().lerp(b, t);
      p.y -= 4 * sag * t * (1 - t); // parábola: máxima caída al centro
      return p;
    };
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    const radio = Math.max(0.8, r.radio) * S;
    const eje = new THREE.Vector3();
    const q = new THREE.Quaternion();
    for (let i = 0; i < N; i++) {
      const p0 = punto(i / N);
      const p1 = punto((i + 1) / N);
      const medio = p0.clone().add(p1).multiplyScalar(0.5).multiplyScalar(S);
      const largo = p0.distanceTo(p1) * S;
      if (largo < 1e-4) continue;
      eje.copy(p1).sub(p0).normalize();
      q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), eje);
      this.world.createCollider(
        RAPIER.ColliderDesc.capsule(largo / 2, radio)
          .setTranslation(medio.x, medio.y, medio.z)
          .setRotation({ x: q.x, y: q.y, z: q.z, w: q.w })
          .setRestitution(0.02)
          .setFriction(0.9),
        body,
      );
    }
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
    const POLEAS = new Set(["polea", "roldana", "bloque-poleas"]);
    const entradas = [...this.bodies.entries()];
    const invH = new THREE.Quaternion();
    const v = new THREE.Vector3();
    for (const [id, e] of entradas) {
      if (!POLEAS.has(e.obj.componentId)) continue;
      const pSize = e.obj.effectiveSize();
      const margen = Math.max(pSize.x, pSize.y, pSize.z) / 2 + 1.5;
      let mejor: { body: R.RigidBody; obj: SceneObject } | null = null;
      let mejorD = Infinity;
      for (const [hid, h] of entradas) {
        if (hid === id || POLEAS.has(h.obj.componentId)) continue;
        const hs = h.obj.effectiveSize();
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
      const aSize = e.obj.effectiveSize();
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
        // caja de mundo estaría girada respecto de él).
        const hs = h.obj.localSize();
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
    // Dedupe: una roldana empotrada duplica la entrada de su anfitrión en el
    // mapa de cuerpos (para juntas) — aquí cada cuerpo cuenta una sola vez.
    const vistos = new Set<number>();
    const unicos = [...this.bodies.values()].filter(({ body }) => {
      if (vistos.has(body.handle)) return false;
      vistos.add(body.handle);
      return true;
    });
    const dinamicas = unicos.filter(({ body }) => !body.isFixed());
    const fijas = unicos.filter(({ body }) => body.isFixed());

    // 1) Candidatas: piezas fijas ESBELTAS (tubulares) con su recta axial.
    interface Esbelta {
      centro: THREE.Vector3;
      eje: THREE.Vector3;
      largo: number;
      esStopper: boolean;
      cuerpo: R.RigidBody;
    }
    const esbeltas: Esbelta[] = [];
    for (const f of fijas) {
      const s = f.obj.effectiveSize();
      const dims: [number, "x" | "y" | "z"][] = [[s.x, "x"], [s.y, "y"], [s.z, "z"]];
      dims.sort((a, b) => b[0] - a[0]);
      const [largo, ejeLocal] = dims[0];
      if (largo < 20 || largo < 4 * dims[1][0]) continue;
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
        if (lateral < 3) {
          a.esStopper = true;
          break;
        }
      }
    }
    // Guía de verdad = tubo LARGO (≥60); las cortas solo pueden ser stoppers.
    const guiasTubo = esbeltas.filter((e) => !e.esStopper && e.largo >= 60);
    const stoppers = esbeltas.filter((e) => e.esStopper);

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
      // Caja del CUERPO sin los discos montados: el freno de la guía topa
      // con el carrier — los discos quedan lejos de los tubos y no
      // participan del stop (con ellos, la caja inflada frenaba el carro
      // un radio de disco antes de tocar el freno).
      d.obj.worldBoxBody(bbox);
      const tam = bbox.getSize(new THREE.Vector3());
      bbox.expandByScalar(1); // cm de tolerancia del abrazo
      const centroD = d.obj.mesh.position;
      let eje: THREE.Vector3 | null = null;
      let sMin = -Infinity;
      let sMax = Infinity;
      let halfD = 0;
      for (const g of guiasTubo) {
        const delta = centroD.clone().sub(g.centro);
        const p = g.centro.clone().addScaledVector(g.eje, delta.dot(g.eje));
        if (!bbox.containsPoint(p)) continue;
        // ABRAZO real (v0.2.9): un manguito guiado ATRAVIESA la pieza a lo
        // largo del eje (≥ 5 cm de recorrido interior). Sin este filtro, una
        // barra de agarre colgando JUNTO a un travesaño del piso quedaba
        // falsamente circunscrita a su recta (el jalón bajo solo podía
        // moverse en horizontal, clavado y sin transmisión).
        const abrazo =
          tam.x * Math.abs(g.eje.x) + tam.y * Math.abs(g.eje.y) + tam.z * Math.abs(g.eje.z);
        if (abrazo < 5) continue;
        if (eje && Math.abs(eje.dot(g.eje)) < 0.99) continue;
        usadas.add(g.cuerpo);
        if (!eje) {
          eje = g.eje.clone();
          // Semiextensión de la móvil a lo largo del eje (soporte del AABB).
          halfD =
            (tam.x * Math.abs(eje.x) + tam.y * Math.abs(eje.y) + tam.z * Math.abs(eje.z)) / 2;
        }
        // Recorrido del CENTRO: la móvil completa se queda sobre el tubo.
        const s0 = centroD.dot(eje);
        const sG = g.centro.dot(eje);
        sMin = Math.max(sMin, sG - g.largo / 2 + halfD - s0);
        sMax = Math.min(sMax, sG + g.largo / 2 - halfD - s0);
      }
      if (!eje || sMin > sMax) continue;
      // 4) STOPPERS: los espaciadores asentados en la guía acotan la caída
      //    (o el ascenso) — el carrier se DETIENE al tocarlos, sin llegar a
      //    la platina inferior.
      const s0 = centroD.dot(eje);
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
        usadas.add(st.cuerpo);
      }
      if (sMin > sMax) continue;
      guiados.add(d.body);
      const q = d.obj.mesh.quaternion;
      this.guias.push({
        body: d.body,
        origen: { x: centroD.x * S, y: centroD.y * S, z: centroD.z * S },
        eje: { x: eje.x, y: eje.y, z: eje.z },
        rot: { x: q.x, y: q.y, z: q.z, w: q.w },
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
    const entry: CableEntry = { bodies, local, restLength: 0, topeIni: 0, topeFin: 0 };
    entry.restLength = this.cableLength(entry);
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
    const C = this.cableLength(entry) - restLength;
    if (C <= 0) return;

    const p = bodies.map((_, i) => this.nodeWorld(entry, i));
    const J = this.cableGradients(p);
    const im = bodies.map((b) => (b.isDynamic() ? 1 / b.mass() : 0));
    let effMass = 0;
    for (let i = 0; i < n; i++) effMass += im[i] * (J[i].x ** 2 + J[i].y ** 2 + J[i].z ** 2);
    if (effMass <= 0) return;

    const v = bodies.map((b) => b.linvel());
    let vrel = 0;
    for (let i = 0; i < n; i++) vrel += J[i].x * v[i].x + J[i].y * v[i].y + J[i].z * v[i].z;
    // Estabilización Baumgarte: el exceso de longitud se recobra por
    // VELOCIDAD (repartida por masas, dinámica coherente) en lugar de
    // teletransportar posiciones — sin esto, el reparto posicional bombea
    // energía y el sistema "repta" en reposo (el contrapeso subía solo).
    const bias = Math.min(15 * C, 2.5); // m/s
    const objetivo = -bias;
    if (vrel <= objetivo) return;

    const lambda = (objetivo - vrel) / effMass;
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
    // Red de EMERGENCIA: la recuperación normal la hace el bias de velocidad
    // (Baumgarte); solo se teletransporta el exceso grosero (tirones muy
    // violentos), dejando una holgura que evita el bombeo posicional.
    const HOLGURA = 0.03; // m
    const C = segLen.reduce((a, b) => a + b, 0) - restLength - HOLGURA;
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
    if ((p.kind === "beam" || p.kind === "tube") && p.path && !pathIsStraight(p.path)) {
      return this.collidersDoblado(obj);
    }
    return [this.colliderDesc(obj)];
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

  grab(objectId: string, worldCm: THREE.Vector3): boolean {
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
    this.drag = { body: e.body, local, target: worldM };
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
    const KP = 1500; // N/m
    const KD = 120; // N·s/m
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
          for (const c of this.cables) this.solveCableVelocity(c);
        }
        for (let it = 0; it < 8; it++) {
          for (const c of this.cables) this.solveCablePosition(c);
        }
        // Topes de terminal: el extremo no pasa por su roldana vecina.
        for (const c of this.cables) this.aplicarTopesCable(c);
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
    const VMAX = 12; // m/s
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
    this.cables = [];
    this.guias = [];
    this.empotradas = [];
    this.empotradaPorId.clear();
    this.masaExtra.clear();
    this.cuerposCable.clear();
    this.topeCongelados.clear();
    this.drag = null;
  }
}

function norm(x: number, y: number, z: number): { x: number; y: number; z: number } {
  const len = Math.hypot(x, y, z) || 1;
  return { x: x / len, y: y / len, z: z / len };
}
