import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { SceneManager } from "../scene/SceneManager";
import { SceneObject } from "../objects/SceneObject";
import { getDefinition } from "../objects/componentLibrary";
import { PhysicsWorld } from "../physics/PhysicsWorld";
import { Joint, type JointKind, axisVector } from "../physics/joints";
import { Cable, type CableNode } from "../physics/cables";
import { Rope, type RopeEnd, type RopeKind } from "../objects/Rope";
import { straightPath } from "../objects/linePieces";
import { SnapManager, localSnapPoints } from "./snapping";

/**
 * Únicas piezas sobre las que un cable puede DESLIZARSE (superficies de reenvío):
 * ruedas acanaladas. Un nodo intermedio de un cable debe ser una de estas.
 */
const PULLEY_IDS = new Set(["polea", "roldana", "bloque-poleas"]);
import {
  DEFAULT_HUMAN_HEIGHT,
  JOINT_DOF,
  buildHumanFigure,
  disposeHumanFigure,
} from "../objects/humanFigure";
import { buildSkeletonFigure } from "../objects/skeletonModel";
import {
  getPose,
  poseNames,
  removePose,
  resetDefaultPoses,
  setPose,
  type PoseDef,
} from "../objects/poseLibrary";
import { degToRad, radToDeg, roundTo } from "../core/units";
import { solveTwoBoneIK } from "./armIK";
import { PROJECT_VERSION, type ProjectData } from "./project";
import type { PrimitiveParams } from "../objects/types";
import { componentModels } from "./componentModels";
import { figureSegments } from "./figureSegments";
import { loadModelRoot, mergeRootGeometry } from "./modelLoading";
import { EventBus } from "./eventBus";

type HandSide = "L" | "R";

export type HumanMode = "mannequin" | "skeleton";

export type TransformMode = "translate" | "rotate" | "scale";

export type EditorEvents = {
  objectsChanged: { objects: SceneObject[] };
  selectionChanged: { selected: SceneObject | null };
  /** Cambio de transform/dimensiones del objeto seleccionado (para refrescar panel). */
  objectTransformed: { object: SceneObject };
  modeChanged: { mode: TransformMode };
  /** Estado de la simulacion fisica. */
  simulationChanged: { running: boolean };
  /** Cambio en la lista de articulaciones. */
  jointsChanged: { joints: Joint[] };
  /** Modo "conectar dos piezas" activo/inactivo. */
  connectModeChanged: { kind: JointKind | null; pending: boolean };
  /** Cambio en la lista de cables. */
  cablesChanged: { cables: Cable[] };
  /** Modo "trazar cable" activo: nº de nodos colocados + pista de acción. */
  cableModeChanged: { active: boolean; count: number; hint?: string };
  /** Modo "colocar cuerda" (cadena/correa) activo: nº de extremos fijados. */
  ropeModeChanged: { active: boolean; kind: RopeKind | null; count: number };
  /** Modo "trazar pieza de línea" (pilar/travesaño/tubo): nº de puntos fijados. */
  lineModeChanged: { active: boolean; kind: "beam" | "tube" | null; count: number };
  /** Modo "doblado por nodos" (bending) activo/inactivo. */
  bendModeChanged: { active: boolean };
  /** Cuerda seleccionada (para editar tensión) o null. */
  ropeSelectionChanged: { id: string; name: string; slack: number } | null;
  /** Snapping de ensamblaje activado/desactivado. */
  snapChanged: { enabled: boolean };
  /** Cambio en la lista de posturas (anadir/editar/eliminar). */
  posesChanged: { names: string[] };
  /** Modo "apoyar mano en agarre" (IK): etapa actual. */
  attachModeChanged: { active: boolean; stage: "hand" | "grip" | null };
  /** Cambio en la multiseleccion (para agrupar) o en los grupos. */
  groupingChanged: { multi: number; groupSelected: boolean };
  /** Grupo seleccionado (para editar nombre/duplicar). */
  groupSelectionChanged: { id: string | null; name: string };
  /** Articulacion del personaje seleccionada (para editar angulos). */
  jointSelectionChanged: { name: string | null; angles: [number, number, number] };
  /** Estado de la figura humana de referencia. */
  humanFigureChanged: {
    present: boolean;
    heightCm: number;
    mode: HumanMode;
    loading: boolean;
  };
  /** El proyecto se acaba de autoguardar en el navegador. */
  autosaved: { at: number };
  /** Cambió el conjunto de componentes con modelo 3D personalizado. */
  componentModelsChanged: { ids: string[] };
};

interface SavedTransform {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  scale: THREE.Vector3;
}

/**
 * Nucleo del editor: posee la escena, los controles de camara, el gizmo de
 * transformacion, la coleccion de objetos y el estado de seleccion.
 */
export class Editor {
  readonly bus = new EventBus<EditorEvents>();
  readonly sceneManager: SceneManager;
  readonly orbit: OrbitControls;
  readonly gizmo: TransformControls;

  private objects = new Map<string, SceneObject>();
  private selected: SceneObject | null = null;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private running = false;

  private physics: PhysicsWorld | null = null;
  private simulating = false;
  private saved = new Map<string, SavedTransform>();

  private joints = new Map<string, Joint>();
  private jointHelpers = new THREE.Group();
  private connectMode: JointKind | null = null;
  private pendingA: SceneObject | null = null;

  private cables = new Map<string, Cable>();
  private cableVisuals = new THREE.Group();
  private cableMode = false;
  private cablePending: { object: SceneObject; local: THREE.Vector3 }[] = [];

  // Cuerdas (cadenas/correas de seguridad): elementos de línea con catenaria.
  private ropes = new Map<string, Rope>();
  private ropeVisuals = new THREE.Group();
  private ropeMode: RopeKind | null = null;
  private ropePendingA: RopeEnd | null = null;
  private selectedRopeId: string | null = null;

  // Piezas de línea (pilar/travesaño/tubo): trazado por dos puntos + bending.
  private lineMode: "beam" | "tube" | null = null;
  private lineParams: PrimitiveParams | null = null;
  private linePendingA: THREE.Vector3 | null = null;
  private bendTarget: SceneObject | null = null;
  private bendHandles: THREE.Group | null = null;
  private bendDrag: { index: number; plane: THREE.Plane } | null = null;

  private snap: SnapManager;
  // Línea elástica de previsualización al colocar cable/cuerda (línea recta).
  private placementLine: THREE.Line | null = null;

  // Agrupacion de piezas en subensamblajes.
  private multiSel = new Set<string>();
  private groups = new Map<string, { name: string; ids: string[] }>();
  private objGroup = new Map<string, string>();
  private selectedGroupId: string | null = null;
  private selectedJointName: string | null = null;
  private groupProxy = new THREE.Object3D();
  private groupPrev = new THREE.Matrix4();
  private nextGroupId = 1;

  private references = new THREE.Group();
  private humanFigure: THREE.Group | null = null;
  private humanHeight = DEFAULT_HUMAN_HEIGHT;
  private humanMode: HumanMode = "mannequin";
  private humanToken = 0;
  private selectedFigure = false;

  /** Manos apoyadas en agarres (IK): lado -> objeto + punto local. */
  private handTargets = new Map<HandSide, { objectId: string; local: THREE.Vector3 }>();
  private attachMode = false;
  private attachSide: HandSide | null = null;

  // Cambios sin guardar (para sugerir guardar al volver a la Home).
  private dirty = false;
  // Bajas de las suscripciones a los repertorios (modelos y segmentos).
  private unsubModels: (() => void) | null = null;
  private unsubSegments: (() => void) | null = null;

  // Autoguardado en el navegador (localStorage).
  private static readonly AUTOSAVE_KEY = "exersuite.autosave.v1";
  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;
  private autosaveInterval: ReturnType<typeof setInterval> | null = null;
  private autosaveSuspended = false;

  constructor(private canvas: HTMLCanvasElement) {
    this.sceneManager = new SceneManager(canvas);

    this.orbit = new OrbitControls(this.sceneManager.camera, canvas);
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.08;
    this.orbit.screenSpacePanning = false;
    this.orbit.maxPolarAngle = Math.PI * 0.495; // no bajar de la horizontal
    this.orbit.target.set(0, 80, 0);

    this.gizmo = new TransformControls(this.sceneManager.camera, canvas);
    this.gizmo.setSpace("local");
    // El gizmo desactiva el orbit mientras se arrastra.
    this.gizmo.addEventListener("dragging-changed", (e) => {
      this.orbit.enabled = !e.value;
      if (!e.value) this.snap.hideIndicator();
    });
    this.gizmo.addEventListener("objectChange", () => {
      // Cualquier arrastre del gizmo (pieza, grupo o articulación del maniquí)
      // ensucia el proyecto y debe autoguardarse.
      this.scheduleAutosave();
      if (this.selectedGroupId) {
        this.applyGroupDelta();
        return;
      }
      // Posando el maniquí: al arrastrar el eje articular gira el segmento en
      // torno a la articulación, limitado a su eje/rango natural.
      if (this.selectedFigure && this.selectedJointName) {
        this.clampSelectedJoint();
        this.emitJointSelection();
        return;
      }
      if (!this.selected) return;
      this.applySnap();
      this.bus.emit("objectTransformed", { object: this.selected });
    });
    // En three r0.169 el helper del gizmo se anade por separado.
    const helper = (this.gizmo as unknown as { getHelper?: () => THREE.Object3D })
      .getHelper?.();
    this.sceneManager.scene.add(helper ?? (this.gizmo as unknown as THREE.Object3D));

    this.snap = new SnapManager(this.sceneManager.scene);
    this.sceneManager.scene.add(this.jointHelpers);
    this.sceneManager.scene.add(this.references);
    this.sceneManager.scene.add(this.cableVisuals);
    this.sceneManager.scene.add(this.ropeVisuals);
    this.sceneManager.scene.add(this.groupProxy);

    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("resize", this.onResize);
    window.addEventListener("keydown", this.onKeyDown);

    // Reaplica los modelos del repertorio a las piezas si cambian.
    this.unsubModels = componentModels.onChanged(() => this.onComponentModelsChanged());
    // Reconstruye el maniquí si cambian los modelos de sus segmentos.
    this.unsubSegments = figureSegments.onChanged(() => {
      if (this.humanFigure && this.humanMode === "mannequin") void this.addHumanFigure(this.humanHeight);
    });
    // Al mover una pieza, actualiza las cuerdas ancladas a ella.
    this.bus.on("objectTransformed", ({ object }) => this.updateRopesForObject(object.id));
    // Los visuales de cable solo se reconstruyen cuando algo cambió (no por frame).
    const markCables = () => {
      this.cablesDirty = true;
    };
    this.bus.on("objectTransformed", markCables);
    this.bus.on("objectsChanged", markCables);
    this.bus.on("cablesChanged", markCables);

    this.setupAutosave();
  }

  /** Reaplica la geometría del repertorio a las instancias afectadas. */
  private onComponentModelsChanged(): void {
    for (const o of this.objects.values()) {
      const geo = componentModels.geometryClone(o.componentId);
      if (geo) o.applyCustomGeometry(geo);
      else if (o.customModel) o.revertToPrimitive();
    }
    this.rebuildAllRopes(); // los segmentos de eslabón/Kevlar pueden haber cambiado
    this.bus.emit("objectsChanged", { objects: this.listObjects() });
  }

  // --------------------------------------------------------- autoguardado
  /** Suscribe el autoguardado a los eventos de cambio del proyecto. */
  private setupAutosave(): void {
    const trigger = () => {
      this.dirty = true;
      this.scheduleAutosave();
    };
    this.bus.on("objectsChanged", trigger);
    this.bus.on("objectTransformed", trigger);
    this.bus.on("jointsChanged", trigger);
    this.bus.on("cablesChanged", trigger);
    this.bus.on("groupingChanged", trigger);
    this.bus.on("humanFigureChanged", trigger);
    // Red de seguridad: vuelca a disco periódicamente por si algún cambio
    // (material, ángulo numérico de articulación…) no emitió evento.
    this.autosaveInterval = setInterval(() => this.writeAutosave(), 30_000);
    window.addEventListener("beforeunload", this.onBeforeUnload);
  }

  private onBeforeUnload = (): void => {
    this.flushAutosave();
  };

  /** ¿Hay cambios sin guardar a un archivo? */
  isDirty(): boolean {
    return this.dirty;
  }

  /** Marca el proyecto como guardado (sin cambios pendientes). */
  markClean(): void {
    this.dirty = false;
  }

  /** Programa un autoguardado diferido (debounce) tras el último cambio. */
  private scheduleAutosave(): void {
    if (this.autosaveSuspended || this.simulating) return;
    // Todo cambio que autoguarda es también un cambio sin guardar a archivo
    // (posar el maniquí, tensar cuerdas, mover grupos… no emiten evento).
    this.dirty = true;
    if (this.autosaveTimer !== null) clearTimeout(this.autosaveTimer);
    this.autosaveTimer = setTimeout(() => {
      this.autosaveTimer = null;
      this.writeAutosave();
    }, 800);
  }

  /** Serializa la escena y la guarda en localStorage. */
  private writeAutosave(): void {
    if (this.autosaveSuspended || this.simulating) return;
    // Una escena vacía (recién creada o tras "Explorar biblioteca") no debe
    // sobrescribir una sesión anterior: solo se autoguarda cuando hay contenido.
    if (this.objects.size === 0 && this.humanFigure === null) return;
    try {
      localStorage.setItem(Editor.AUTOSAVE_KEY, JSON.stringify(this.serialize()));
      this.bus.emit("autosaved", { at: Date.now() });
    } catch (err) {
      console.warn("No se pudo autoguardar:", err);
    }
  }

  /** Fuerza un guardado inmediato (p. ej. antes de cerrar la pestaña). */
  flushAutosave(): void {
    if (this.autosaveTimer !== null) {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = null;
    }
    this.writeAutosave();
  }

  /** ¿Hay una sesión autoguardada en este navegador? */
  hasAutosave(): boolean {
    try {
      return !!localStorage.getItem(Editor.AUTOSAVE_KEY);
    } catch {
      return false;
    }
  }

  /** Descarta el autoguardado almacenado. */
  clearAutosave(): void {
    try {
      localStorage.removeItem(Editor.AUTOSAVE_KEY);
    } catch {
      /* almacenamiento no disponible */
    }
  }

  /** Restaura la última sesión autoguardada. Devuelve true si cargó algo. */
  async restoreAutosave(): Promise<boolean> {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(Editor.AUTOSAVE_KEY);
    } catch {
      return false;
    }
    if (!raw) return false;
    try {
      await this.loadProject(JSON.parse(raw) as ProjectData);
      return true;
    } catch (err) {
      console.warn("Autoguardado corrupto, se ignora:", err);
      return false;
    }
  }

  // ----------------------------------------------------------------- ciclo
  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastFrameTime = performance.now();
    this.loop();
  }

  private lastFrameTime = 0;
  private simFrame = 0;
  /** Los visuales de cable solo se reconstruyen cuando algo se ha movido. */
  private cablesDirty = true;

  private loop = (): void => {
    if (!this.running) return;
    const now = performance.now();
    const dt = Math.min((now - this.lastFrameTime) / 1000, 0.25);
    this.lastFrameTime = now;
    if (this.simulating && this.physics) {
      this.physics.step(dt);
      this.cablesDirty = true;
      // Las cuerdas ancladas a piezas dinamicas siguen a sus anclas (throttle).
      if (++this.simFrame % 6 === 0) this.rebuildDynamicRopes();
    }
    this.updateStackAnimation();
    this.updateHandIK();
    if (this.cablesDirty) {
      this.updateCableVisuals();
      this.cablesDirty = false;
    }
    this.orbit.update();
    this.sceneManager.render();
    requestAnimationFrame(this.loop);
  };

  /** Reconstruye solo las cuerdas con algún extremo en una pieza no fija. */
  private rebuildDynamicRopes(): void {
    for (const rope of this.ropes.values()) {
      const dyn = [rope.a.objectId, rope.b.objectId].some((id) => {
        const o = id ? this.objects.get(id) : null;
        return o && !o.physics.fixed && o.effectiveMassKg() > 0;
      });
      if (dyn) this.rebuildRope(rope);
    }
  }

  // ------------------------------------------------------------- simulacion
  isSimulating(): boolean {
    return this.simulating;
  }

  async toggleSimulation(): Promise<void> {
    if (this.simulating) this.stopSimulation();
    else await this.startSimulation();
  }

  private startingSim = false;

  private async startSimulation(): Promise<void> {
    // El guard `startingSim` evita arranques concurrentes mientras carga el
    // WASM de Rapier (auto-repeat de Espacio): se creaban varios mundos y los
    // anteriores nunca se liberaban.
    if (this.simulating || this.startingSim) return;
    this.startingSim = true;
    try {
      await PhysicsWorld.init();
    } finally {
      this.startingSim = false;
    }

    // Guarda el estado de diseno para poder restaurarlo al detener.
    this.saved.clear();
    for (const o of this.listObjects()) {
      this.saved.set(o.id, {
        position: o.mesh.position.clone(),
        quaternion: o.mesh.quaternion.clone(),
        scale: o.mesh.scale.clone(),
      });
    }

    this.select(null);
    this.cancelConnect();
    this.cancelCable();
    this.cancelRope();
    this.cancelLine();
    this.endBendNodes();
    this.physics = new PhysicsWorld();
    this.physics.build(this.listObjects(), this.listJoints(), this.listCables());
    this.jointHelpers.visible = false;
    this.simulating = true;
    this.bus.emit("simulationChanged", { running: true });
  }

  stopSimulation(): void {
    if (!this.simulating) return;
    this.simulating = false;
    this.physics?.dispose();
    this.physics = null;

    // Restaura el estado de diseno.
    for (const o of this.listObjects()) {
      const s = this.saved.get(o.id);
      if (!s) continue;
      o.mesh.position.copy(s.position);
      o.mesh.quaternion.copy(s.quaternion);
      o.mesh.scale.copy(s.scale);
    }
    this.saved.clear();
    this.jointHelpers.visible = true;
    // Cables y cuerdas vuelven a las posiciones de diseño restauradas.
    this.cablesDirty = true;
    this.rebuildAllRopes();
    this.bus.emit("simulationChanged", { running: false });
  }

  // -------------------------------------------------------------- objetos
  addComponent(componentId: string, position?: THREE.Vector3): SceneObject {
    const def = getDefinition(componentId);
    if (!def) throw new Error(`Componente desconocido: ${componentId}`);

    const count = [...this.objects.values()].filter(
      (o) => o.componentId === componentId,
    ).length;
    const obj = new SceneObject({
      name: count > 0 ? `${def.label} ${count + 1}` : def.label,
      componentId: def.id,
      category: def.category,
      params: def.defaults,
      physics: def.physics,
      materialId: def.materialId,
      stack: def.stack,
    });

    // Si la biblioteca tiene un modelo 3D para este componente, sustituye la
    // primitiva por él.
    const override = componentModels.geometryClone(def.id);
    if (override) obj.applyCustomGeometry(override);

    // Apoya la base del objeto sobre el suelo (y=0).
    const size = obj.effectiveSize();
    obj.mesh.position.copy(position ?? new THREE.Vector3(0, size.y / 2, 0));

    this.sceneManager.content.add(obj.mesh);
    this.objects.set(obj.id, obj);
    this.bus.emit("objectsChanged", { objects: this.listObjects() });
    this.select(obj);
    return obj;
  }

  removeObject(obj: SceneObject): void {
    if (this.bendTarget === obj) this.endBendNodes();
    if (this.selected === obj) this.select(null);
    // Elimina las articulaciones y cables que referencian a este objeto.
    for (const j of this.listJoints()) {
      if (j.bodyAId === obj.id || j.bodyBId === obj.id) this.joints.delete(j.id);
    }
    for (const c of this.listCables()) {
      if (c.nodes.some((n) => n.objectId === obj.id)) this.cables.delete(c.id);
    }
    // Elimina las cuerdas ancladas al objeto.
    for (const r of this.listRopes()) {
      if (r.a.objectId === obj.id || r.b.objectId === obj.id) this.deleteRope(r.id);
    }
    // Limpia membresia de grupo y multiseleccion.
    this.multiSel.delete(obj.id);
    const gid = this.objGroup.get(obj.id);
    if (gid) {
      this.objGroup.delete(obj.id);
      const g = this.groups.get(gid);
      if (g) {
        g.ids = g.ids.filter((x) => x !== obj.id);
        if (g.ids.length < 2) {
          g.ids.forEach((x) => this.objGroup.delete(x));
          this.groups.delete(gid);
          if (this.selectedGroupId === gid) this.selectedGroupId = null;
        }
      }
    }
    this.sceneManager.content.remove(obj.mesh);
    obj.dispose();
    this.objects.delete(obj.id);
    this.refreshJointHelpers();
    this.bus.emit("jointsChanged", { joints: this.listJoints() });
    this.bus.emit("cablesChanged", { cables: this.listCables() });
    this.bus.emit("objectsChanged", { objects: this.listObjects() });
  }

  /** Crea una copia de `src` (sin seleccionarla) con un desplazamiento opcional. */
  private duplicateObject(src: SceneObject, offset: THREE.Vector3): SceneObject {
    let obj: SceneObject;
    if (src.imported) {
      // Las piezas importadas no existen en la biblioteca: se clona su malla.
      obj = new SceneObject({
        name: `${src.name} copia`,
        componentId: src.componentId,
        category: src.category,
        params: { ...src.params },
        physics: { ...src.physics },
        materialId: src.materialId,
        importedGeometry: src.mesh.geometry.clone(),
      });
      this.sceneManager.content.add(obj.mesh);
      this.objects.set(obj.id, obj);
      this.bus.emit("objectsChanged", { objects: this.listObjects() });
    } else {
      obj = this.addComponent(src.componentId);
      // Copia profunda del path: si se comparte, doblar la copia doblaria la original.
      obj.params = {
        ...src.params,
        path: src.params.path?.map((n) => [...n] as [number, number, number]),
      };
      if (src.stack) obj.stack = { ...src.stack };
      obj.rebuildGeometry();
    }
    obj.setMaterial(src.materialId);
    obj.physics = { ...src.physics };
    obj.mesh.position.copy(src.mesh.position).add(offset);
    obj.mesh.quaternion.copy(src.mesh.quaternion);
    obj.mesh.scale.copy(src.mesh.scale);
    return obj;
  }

  duplicateSelected(): void {
    if (this.selectedGroupId) {
      this.duplicateSelectedGroup();
      return;
    }
    if (!this.selected) return;
    const obj = this.duplicateObject(this.selected, new THREE.Vector3(20, 0, 20));
    this.bus.emit("objectTransformed", { object: obj });
  }

  /** Duplica el grupo seleccionado (copia todas sus piezas y las reagrupa). */
  duplicateSelectedGroup(): void {
    const gid = this.selectedGroupId;
    const g = gid ? this.groups.get(gid) : null;
    if (!g) return;
    const offset = new THREE.Vector3(20, 0, 20);
    const newIds: string[] = [];
    for (const id of g.ids) {
      const src = this.objects.get(id);
      if (src) newIds.push(this.duplicateObject(src, offset).id);
    }
    this.createGroupFromIds(newIds);
  }

  /** Renombra el grupo seleccionado (o por id). */
  renameGroup(id: string, name: string): void {
    const g = this.groups.get(id);
    if (!g || !name.trim()) return;
    g.name = name.trim();
    if (this.selectedGroupId === id) {
      this.bus.emit("groupSelectionChanged", { id, name: g.name });
    }
  }

  /** Voltea (espeja) el objeto seleccionado en un eje. */
  flipSelected(axis: "x" | "y" | "z"): void {
    if (!this.selected) return;
    this.selected.mesh.scale[axis] *= -1;
    this.bus.emit("objectTransformed", { object: this.selected });
  }

  // ---------------------------------------------------- guardar / cargar
  /** Serializa toda la escena a un objeto JSON. */
  serialize(): ProjectData {
    const v3 = (v: THREE.Vector3): [number, number, number] => [v.x, v.y, v.z];
    const q4 = (q: THREE.Quaternion): [number, number, number, number] => [q.x, q.y, q.z, q.w];
    return {
      version: PROJECT_VERSION,
      objects: this.listObjects().filter((o) => !o.imported).map((o) => {
        // Durante la simulación se serializa el estado de DISEÑO (guardado al
        // arrancar la física), no las posiciones simuladas del momento.
        const s = this.simulating ? this.saved.get(o.id) : undefined;
        return {
          id: o.id,
          name: o.name,
          componentId: o.componentId,
          materialId: o.materialId,
          params: { ...o.params },
          physics: { ...o.physics },
          stack: o.stack ? { ...o.stack } : undefined,
          position: v3(s?.position ?? o.mesh.position),
          quaternion: q4(s?.quaternion ?? o.mesh.quaternion),
          scale: v3(s?.scale ?? o.mesh.scale),
        };
      }),
      joints: this.listJoints().map((j) => ({
        name: j.name,
        kind: j.kind,
        bodyAId: j.bodyAId,
        bodyBId: j.bodyBId,
        anchor: v3(j.anchor),
        axis: j.axis,
        limitsEnabled: j.limitsEnabled,
        min: j.min,
        max: j.max,
        motor: { ...j.motor },
      })),
      cables: this.listCables().map((c) => ({
        name: c.name,
        nodes: c.nodes.map((n) => ({ objectId: n.objectId, local: [n.local.x, n.local.y, n.local.z] as [number, number, number] })),
      })),
      ropes: this.listRopes().map((r) => ({
        name: r.name,
        kind: r.kind,
        slack: r.slack,
        a: { objectId: r.a.objectId, local: [r.a.local.x, r.a.local.y, r.a.local.z] as [number, number, number] },
        b: { objectId: r.b.objectId, local: [r.b.local.x, r.b.local.y, r.b.local.z] as [number, number, number] },
      })),
      groups: [...this.groups.values()].map((g) => ({ name: g.name, ids: [...g.ids] })),
      human: {
        present: this.humanFigure !== null,
        mode: this.humanMode,
        heightCm: this.humanHeight,
        position: this.humanFigure ? v3(this.humanFigure.position) : [0, 0, 0],
        quaternion: this.humanFigure ? q4(this.humanFigure.quaternion) : [0, 0, 0, 1],
        pose: this.humanFigure && this.humanMode === "mannequin" ? this.captureCurrentPose() : null,
        hands: [...this.handTargets].map(([side, t]) => ({
          side,
          objectId: t.objectId,
          local: [t.local.x, t.local.y, t.local.z] as [number, number, number],
        })),
      },
    };
  }

  /** Exporta el prototipo (las piezas) como GLB binario para otras apps. */
  exportGLB(): Promise<ArrayBuffer> {
    const exporter = new GLTFExporter();
    return new Promise((resolve, reject) => {
      exporter.parse(
        this.sceneManager.content,
        (result) => resolve(result as ArrayBuffer),
        (err) => reject(err),
        { binary: true },
      );
    });
  }

  /** Importa un modelo 3D (glb/gltf/obj) como una pieza editable. */
  async importModelFile(file: File): Promise<void> {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const root = await loadModelRoot(await file.arrayBuffer(), ext);
    this.addImportedModel(root, file.name.replace(/\.[^.]+$/, ""));
  }

  /** Fusiona las mallas del modelo en una pieza y la anade a la escena. */
  private addImportedModel(root: THREE.Object3D, name: string): void {
    let merged: THREE.BufferGeometry;
    try {
      merged = mergeRootGeometry(root);
    } catch {
      return;
    }

    // Centrar en X/Z y apoyar en el suelo; heuristica metros->cm.
    merged.computeBoundingBox();
    const bb = merged.boundingBox!;
    const size = new THREE.Vector3();
    bb.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = maxDim > 0 && maxDim < 5 ? 100 : 1;

    const obj = new SceneObject({
      name,
      componentId: "imported",
      category: "primitiva",
      params: { kind: "box" },
      physics: { massKg: 1, fixed: false },
      materialId: "generico",
      importedGeometry: merged,
    });
    obj.mesh.scale.setScalar(scale);
    const center = new THREE.Vector3();
    bb.getCenter(center);
    obj.mesh.position.set(-center.x * scale, -bb.min.y * scale, -center.z * scale);

    this.sceneManager.content.add(obj.mesh);
    this.objects.set(obj.id, obj);
    this.bus.emit("objectsChanged", { objects: this.listObjects() });
    this.select(obj);
  }

  /** Vacia la escena (objetos, articulaciones, cables, grupos, figura). */
  clearScene(): void {
    // "Nuevo" con la física corriendo: detenla antes de vaciar (si no, el
    // mundo sigue haciendo step sobre mallas liberadas).
    if (this.simulating) this.stopSimulation();
    this.endBendNodes();
    this.cancelLine();
    this.select(null);
    for (const o of this.objects.values()) {
      this.sceneManager.content.remove(o.mesh);
      o.dispose();
    }
    this.objects.clear();
    this.joints.clear();
    this.cables.clear();
    for (const r of this.ropes.values()) {
      this.ropeVisuals.remove(r.group);
      r.dispose();
    }
    this.ropes.clear();
    this.groups.clear();
    this.objGroup.clear();
    this.multiSel.clear();
    this.removeHumanFigure();
    this.refreshJointHelpers();
    this.bus.emit("objectsChanged", { objects: [] });
    this.bus.emit("jointsChanged", { joints: [] });
    this.bus.emit("cablesChanged", { cables: [] });
  }

  /** Reemplaza la escena con la de un proyecto serializado. */
  async loadProject(data: ProjectData): Promise<void> {
    if (this.simulating) this.stopSimulation();
    this.autosaveSuspended = true;
    try {
      await this.loadProjectInner(data);
    } finally {
      this.autosaveSuspended = false;
    }
    this.scheduleAutosave();
    this.dirty = false; // recién cargado = sin cambios
  }

  /**
   * Libera por completo el editor (bucle de render, contexto WebGL, listeners y
   * temporizadores) para volver a la Home sin acumular recursos entre proyectos.
   */
  dispose(): void {
    this.running = false;
    if (this.simulating) this.stopSimulation();
    if (this.autosaveTimer !== null) clearTimeout(this.autosaveTimer);
    if (this.autosaveInterval !== null) clearInterval(this.autosaveInterval);
    window.removeEventListener("beforeunload", this.onBeforeUnload);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("keydown", this.onKeyDown);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    this.endBendNodes();
    if (this.placementLine) {
      this.sceneManager.scene.remove(this.placementLine);
      this.placementLine.geometry.dispose();
      (this.placementLine.material as THREE.Material).dispose();
      this.placementLine = null;
    }
    this.unsubModels?.();
    this.unsubSegments?.();
    this.gizmo.detach();
    // En three r0.169 TransformControls.dispose() puede fallar (el helper visual
    // está separado del control); no debe abortar la limpieza.
    try {
      this.gizmo.dispose();
    } catch {
      /* ignora */
    }
    this.orbit.dispose();
    for (const r of this.ropes.values()) r.dispose();
    this.ropes.clear();
    for (const o of this.objects.values()) o.dispose();
    this.objects.clear();
    this.physics?.dispose();
    this.sceneManager.dispose();
  }

  private async loadProjectInner(data: ProjectData): Promise<void> {
    this.clearScene();
    const idMap = new Map<string, string>();

    for (const od of data.objects) {
      // Un componente desconocido (proyecto de otra versión, JSON editado) no
      // debe abortar la carga del resto de la escena.
      try {
        const obj = this.addComponent(od.componentId);
        obj.name = od.name;
        obj.mesh.name = od.name;
        obj.params = { ...od.params };
        obj.stack = od.stack ? { ...od.stack } : undefined;
        obj.physics = { ...od.physics };
        obj.rebuildGeometry();
        obj.setMaterial(od.materialId);
        obj.mesh.position.fromArray(od.position);
        obj.mesh.quaternion.fromArray(od.quaternion);
        obj.mesh.scale.fromArray(od.scale);
        idMap.set(od.id, obj.id);
      } catch (err) {
        console.warn(`Se omite la pieza "${od.name}" (${od.componentId}):`, err);
      }
    }

    for (const jd of data.joints) {
      const a = idMap.get(jd.bodyAId);
      const b = idMap.get(jd.bodyBId);
      if (!a || !b) continue;
      const j = this.connect(a, b, jd.kind, new THREE.Vector3().fromArray(jd.anchor));
      if (!j) continue;
      j.name = jd.name;
      j.axis = jd.axis;
      j.limitsEnabled = jd.limitsEnabled;
      j.min = jd.min;
      j.max = jd.max;
      j.motor = { ...jd.motor };
    }

    for (const cd of data.cables) {
      const nodes = cd.nodes
        .map((n) => ({ objectId: idMap.get(n.objectId) ?? "", local: { x: n.local[0], y: n.local[1], z: n.local[2] } }))
        .filter((n) => n.objectId);
      if (nodes.length >= 2) {
        const c = this.createCable(nodes);
        if (c) c.name = cd.name;
      }
    }

    for (const rd of data.ropes ?? []) {
      const remap = (e: { objectId: string | null; local: [number, number, number] }): RopeEnd | null => {
        const local = new THREE.Vector3(e.local[0], e.local[1], e.local[2]);
        if (e.objectId === null) return { objectId: null, local };
        const mapped = idMap.get(e.objectId);
        return mapped ? { objectId: mapped, local } : null;
      };
      const a = remap(rd.a);
      const b = remap(rd.b);
      if (a && b) this.createRope(rd.kind, a, b, rd.slack, rd.name);
    }

    for (const gd of data.groups) {
      const ids = gd.ids.map((id) => idMap.get(id)).filter((x): x is string => !!x);
      if (ids.length >= 2) {
        const gid = this.createGroupFromIds(ids);
        if (gid) this.renameGroup(gid, gd.name);
      }
    }

    this.select(null);

    if (data.human?.present) {
      this.humanMode = data.human.mode;
      await this.addHumanFigure(data.human.heightCm);
      const fig = this.humanFigure;
      if (fig) {
        fig.position.fromArray(data.human.position);
        fig.quaternion.fromArray(data.human.quaternion);
        const joints = this.figureJoints();
        if (joints && data.human.pose) {
          for (const [jn, [x, y, z]] of Object.entries(data.human.pose)) {
            const jj = joints[jn];
            if (jj) jj.rotation.set(degToRad(x), degToRad(y), degToRad(z));
          }
          (fig.userData.ground as (() => void) | undefined)?.();
        }
        for (const h of data.human.hands) {
          const oid = idMap.get(h.objectId);
          if (oid) this.attachHand(h.side, oid, new THREE.Vector3().fromArray(h.local));
        }
      }
    } else if (data.human) {
      this.humanMode = data.human.mode;
    }

    this.bus.emit("objectsChanged", { objects: this.listObjects() });
  }

  listObjects(): SceneObject[] {
    return [...this.objects.values()];
  }

  getById(id: string): SceneObject | undefined {
    return this.objects.get(id);
  }

  // ------------------------------------------------------------ seleccion
  select(obj: SceneObject | null): void {
    if (this.bendTarget && obj !== this.bendTarget) this.endBendNodes();
    this.clearGroupHighlight();
    this.selected = obj;
    this.selectedFigure = false;
    this.selectedGroupId = null;
    this.clearMultiSel();
    this.selectedJointName = null;
    if (this.selectedRopeId) {
      this.selectedRopeId = null;
      this.bus.emit("ropeSelectionChanged", null);
    }
    this.resetGizmoAxes();
    if (obj) this.gizmo.attach(obj.mesh);
    else this.gizmo.detach();
    this.bus.emit("selectionChanged", { selected: obj });
    this.bus.emit("groupingChanged", { multi: 0, groupSelected: false });
    this.bus.emit("groupSelectionChanged", { id: null, name: "" });
    this.bus.emit("jointSelectionChanged", { name: null, angles: [0, 0, 0] });
  }

  getSelected(): SceneObject | null {
    return this.selected;
  }

  setMode(mode: TransformMode): void {
    this.gizmo.setMode(mode);
    this.bus.emit("modeChanged", { mode });
  }

  setGizmoSpace(space: "local" | "world"): void {
    this.gizmo.setSpace(space);
  }

  // ---------------------------------------------------------- snapping
  isSnapEnabled(): boolean {
    return this.snap.enabled;
  }

  setSnapEnabled(enabled: boolean): void {
    this.snap.enabled = enabled;
    if (!enabled) this.snap.hideIndicator();
    this.bus.emit("snapChanged", { enabled });
  }

  /** Encaja `obj` al punto de anclaje compatible mas cercano. Devuelve true si encajo. */
  snapObject(obj: SceneObject): boolean {
    const others = this.listObjects().filter((o) => o !== obj);
    const r = this.snap.computeSnap(obj, others);
    if (!r) return false;
    obj.mesh.position.add(r.delta);
    return true;
  }

  // ---------------------------------------------------------- agrupacion
  groupOf(objId: string): string | undefined {
    return this.objGroup.get(objId);
  }

  hasGroupSelected(): boolean {
    return this.selectedGroupId !== null;
  }

  multiCount(): number {
    return this.multiSel.size;
  }

  private setHighlight(obj: SceneObject, on: boolean): void {
    const m = obj.mesh.material as THREE.MeshStandardMaterial;
    if (m && m.emissive) m.emissive.setHex(on ? 0x14406a : 0x000000);
  }

  private clearMultiSel(): void {
    for (const id of this.multiSel) {
      const o = this.objects.get(id);
      if (o) this.setHighlight(o, false);
    }
    this.multiSel.clear();
  }

  private clearGroupHighlight(): void {
    if (!this.selectedGroupId) return;
    const g = this.groups.get(this.selectedGroupId);
    g?.ids.forEach((id) => {
      const o = this.objects.get(id);
      if (o) this.setHighlight(o, false);
    });
  }

  /** Anade/quita un objeto a la multiseleccion (para agrupar). */
  private toggleMulti(obj: SceneObject): void {
    this.clearGroupHighlight();
    this.selected = null;
    this.selectedFigure = false;
    this.selectedGroupId = null;
    this.gizmo.detach();
    if (this.multiSel.has(obj.id)) {
      this.multiSel.delete(obj.id);
      this.setHighlight(obj, false);
    } else {
      this.multiSel.add(obj.id);
      this.setHighlight(obj, true);
    }
    this.bus.emit("selectionChanged", { selected: null });
    this.bus.emit("groupingChanged", { multi: this.multiSel.size, groupSelected: false });
  }

  /** Crea un grupo (subensamblaje) a partir de la multiseleccion (>=2). */
  createGroup(): void {
    this.createGroupFromIds([...this.multiSel]);
  }

  /** Crea un grupo a partir de una lista de ids (>=2). Devuelve el id del grupo. */
  createGroupFromIds(ids: string[]): string | null {
    const valid = ids.filter((id) => this.objects.has(id) && !this.objGroup.has(id));
    if (valid.length < 2) return null;
    const gid = `g${this.nextGroupId++}`;
    this.groups.set(gid, { name: `Grupo ${gid.slice(1)}`, ids: valid });
    for (const id of valid) {
      this.objGroup.set(id, gid);
      const o = this.objects.get(id);
      if (o) this.setHighlight(o, false);
    }
    this.multiSel.clear();
    this.selectGroup(gid);
    return gid;
  }

  /** Mueve el grupo seleccionado (cm) aplicando el delta a todos sus miembros. */
  nudgeSelectedGroup(dx: number, dy: number, dz: number): void {
    if (!this.selectedGroupId) return;
    this.groupProxy.position.add(new THREE.Vector3(dx, dy, dz));
    this.applyGroupDelta();
  }

  /** Selecciona un grupo completo: el gizmo mueve todos sus miembros. */
  private selectGroup(gid: string): void {
    const g = this.groups.get(gid);
    if (!g) return;
    this.clearGroupHighlight();
    this.clearMultiSel();
    this.selected = null;
    this.selectedFigure = false;
    this.selectedGroupId = gid;

    const centroid = new THREE.Vector3();
    let n = 0;
    for (const id of g.ids) {
      const o = this.objects.get(id);
      if (o) {
        centroid.add(o.mesh.position);
        n++;
        this.setHighlight(o, true);
      }
    }
    if (n > 0) centroid.multiplyScalar(1 / n);
    this.groupProxy.position.copy(centroid);
    this.groupProxy.quaternion.identity();
    this.groupProxy.scale.set(1, 1, 1);
    this.groupProxy.updateMatrixWorld(true);
    this.groupPrev.copy(this.groupProxy.matrixWorld);

    this.selectedJointName = null;
    this.resetGizmoAxes();
    this.gizmo.attach(this.groupProxy);
    this.setMode("translate");
    this.bus.emit("selectionChanged", { selected: null });
    this.bus.emit("groupingChanged", { multi: 0, groupSelected: true });
    this.bus.emit("groupSelectionChanged", { id: gid, name: g.name });
    this.bus.emit("jointSelectionChanged", { name: null, angles: [0, 0, 0] });
  }

  /** Aplica el delta del proxy a todos los miembros del grupo. */
  private applyGroupDelta(): void {
    if (!this.selectedGroupId) return;
    const g = this.groups.get(this.selectedGroupId);
    if (!g) return;
    this.groupProxy.updateMatrixWorld(true);
    const cur = this.groupProxy.matrixWorld;
    const delta = cur.clone().multiply(this.groupPrev.clone().invert());
    for (const id of g.ids) {
      const o = this.objects.get(id);
      if (!o) continue;
      const m = new THREE.Matrix4().compose(o.mesh.position, o.mesh.quaternion, o.mesh.scale);
      m.premultiply(delta);
      m.decompose(o.mesh.position, o.mesh.quaternion, o.mesh.scale);
      // Las cuerdas ancladas a miembros del grupo siguen a sus anclas.
      this.updateRopesForObject(o.id);
    }
    this.cablesDirty = true;
    this.groupPrev.copy(cur);
  }

  /** Disuelve el grupo seleccionado (los miembros vuelven a ser individuales). */
  ungroupSelected(): void {
    const gid = this.selectedGroupId;
    if (!gid) return;
    const g = this.groups.get(gid);
    g?.ids.forEach((id) => {
      this.objGroup.delete(id);
      const o = this.objects.get(id);
      if (o) this.setHighlight(o, false);
    });
    this.groups.delete(gid);
    this.selectedGroupId = null;
    this.gizmo.detach();
    this.bus.emit("groupingChanged", { multi: 0, groupSelected: false });
    // Avisa al inspector de que el grupo ya no existe.
    this.bus.emit("groupSelectionChanged", { id: null, name: "" });
  }

  /** Elimina el grupo seleccionado y todas sus piezas. */
  deleteSelectedGroup(): void {
    const gid = this.selectedGroupId;
    if (!gid) return;
    const g = this.groups.get(gid);
    this.selectedGroupId = null;
    this.gizmo.detach();
    g?.ids.slice().forEach((id) => {
      const o = this.objects.get(id);
      if (o) this.removeObject(o);
    });
    this.groups.delete(gid);
    this.bus.emit("groupingChanged", { multi: 0, groupSelected: false });
    this.bus.emit("groupSelectionChanged", { id: null, name: "" });
  }

  /** Encaja la pieza arrastrada a un punto de anclaje compatible (solo al mover). */
  private applySnap(): void {
    if (!this.selected || this.gizmo.getMode() !== "translate" || !this.gizmo.dragging) {
      return;
    }
    const others = this.listObjects().filter((o) => o !== this.selected);
    const r = this.snap.computeSnap(this.selected, others);
    if (r) {
      this.selected.mesh.position.add(r.delta);
      this.snap.showIndicator(r.target);
    } else {
      this.snap.hideIndicator();
    }
  }

  // ------------------------------------------------------- figura humana
  hasHumanFigure(): boolean {
    return this.humanFigure !== null;
  }

  getHumanHeight(): number {
    return this.humanHeight;
  }

  getHumanMode(): HumanMode {
    return this.humanMode;
  }

  /** Anade o quita la figura humana de referencia. */
  toggleHumanFigure(): void {
    if (this.humanFigure) this.removeHumanFigure();
    else void this.addHumanFigure(this.humanHeight);
  }

  /** Cambia el modo (maniqui / esqueleto), reconstruyendo si esta presente. */
  setHumanMode(mode: HumanMode): void {
    if (mode === this.humanMode) return;
    this.humanMode = mode;
    // Solo se reconstruye si la figura ESTÁ presente: cambiar el modo no debe
    // resucitar una figura que el usuario quitó.
    if (this.humanFigure) {
      void this.addHumanFigure(this.humanHeight);
    } else {
      this.emitHumanState(false, false);
    }
  }

  private lastFigureTransform: { position: THREE.Vector3; quaternion: THREE.Quaternion } | null =
    null;

  async addHumanFigure(heightCm: number = this.humanHeight): Promise<void> {
    this.humanHeight = heightCm;
    const wasSelected = this.selectedFigure;
    // Conserva el transform actual (si lo hay) para reaplicarlo.
    const keep =
      this.humanFigure
        ? {
            position: this.humanFigure.position.clone(),
            quaternion: this.humanFigure.quaternion.clone(),
          }
        : this.lastFigureTransform;
    this.removeHumanFigure();

    const token = ++this.humanToken;
    let figure: THREE.Group;
    if (this.humanMode === "skeleton") {
      this.emitHumanState(false, true); // loading
      try {
        figure = await buildSkeletonFigure(heightCm);
      } catch (err) {
        console.error("No se pudo cargar el esqueleto:", err);
        this.humanMode = "mannequin";
        figure = buildHumanFigure(heightCm, figureSegments.provider);
      }
    } else {
      figure = buildHumanFigure(heightCm, figureSegments.provider);
    }

    // El usuario pudo quitar/cambiar la figura mientras cargaba.
    if (token !== this.humanToken) {
      disposeHumanFigure(figure);
      return;
    }
    if (keep) {
      figure.position.copy(keep.position);
      figure.quaternion.copy(keep.quaternion);
    }
    this.humanFigure = figure;
    this.references.add(figure);
    if (wasSelected) this.selectFigure();
    this.emitHumanState(true, false);
  }

  removeHumanFigure(): void {
    if (!this.humanFigure) return;
    this.lastFigureTransform = {
      position: this.humanFigure.position.clone(),
      quaternion: this.humanFigure.quaternion.clone(),
    };
    if (this.selectedFigure) {
      this.gizmo.detach();
      this.selectedFigure = false;
    }
    this.references.remove(this.humanFigure);
    disposeHumanFigure(this.humanFigure);
    this.humanFigure = null;
    this.humanToken++;
    this.handTargets.clear();
    this.cancelAttachHand();
    this.emitHumanState(false, false);
  }

  /** Cambia la altura (cm) reconstruyendo la figura y conservando su transform. */
  setHumanHeight(heightCm: number): void {
    this.humanHeight = heightCm;
    if (!this.humanFigure) return;
    void this.addHumanFigure(heightCm);
  }

  private emitHumanState(present: boolean, loading: boolean): void {
    this.bus.emit("humanFigureChanged", {
      present,
      loading,
      heightCm: this.humanHeight,
      mode: this.humanMode,
    });
  }

  /** Decide al hacer clic en la figura: articulacion (rotar) o raiz (mover). */
  private selectFigurePart(hit: THREE.Object3D): void {
    if (!this.humanFigure) return;
    const jn = hit.userData.jointName as string | undefined;
    const joints = this.humanFigure.userData.joints as
      | Record<string, THREE.Object3D>
      | undefined;
    if (jn && joints && joints[jn]) {
      this.selectJoint(jn);
    } else {
      this.selectFigureRoot();
    }
  }

  /** Selecciona una articulacion del personaje para posarla (gizmo en rotar). */
  selectJoint(name: string): void {
    const joints = this.figureJoints();
    if (!joints || !joints[name]) return;
    this.select(null);
    this.selectedFigure = true;
    this.selectedJointName = name;
    this.gizmo.attach(joints[name]);
    // Posar sobre los ejes locales de la articulación y solo los naturales.
    this.gizmo.setSpace("local");
    const dof = JOINT_DOF[name] ?? { x: undefined, y: undefined, z: undefined };
    this.gizmo.showX = dof.x !== undefined;
    this.gizmo.showY = dof.y !== undefined;
    this.gizmo.showZ = dof.z !== undefined;
    this.setMode("rotate"); // posar = rotar la articulacion
    this.emitJointSelection();
  }

  /** Restaura los tres ejes del gizmo (para piezas/grupos/figura completa). */
  private resetGizmoAxes(): void {
    this.gizmo.showX = true;
    this.gizmo.showY = true;
    this.gizmo.showZ = true;
  }

  /** Limita la articulación seleccionada a su eje/rango natural. */
  private clampSelectedJoint(): void {
    const joints = this.figureJoints();
    const jn = this.selectedJointName;
    if (!joints || !jn || !joints[jn]) return;
    const dof = JOINT_DOF[jn];
    if (!dof) return;
    const j = joints[jn];
    for (const ax of ["x", "y", "z"] as const) {
      const lim = dof[ax];
      if (!lim) {
        j.rotation[ax] = 0; // eje no natural: bloqueado
      } else {
        const deg = radToDeg(j.rotation[ax]);
        j.rotation[ax] = degToRad(Math.max(lim[0], Math.min(lim[1], deg)));
      }
    }
    (this.humanFigure?.userData.ground as (() => void) | undefined)?.();
  }

  private emitJointSelection(): void {
    const joints = this.figureJoints();
    const jn = this.selectedJointName;
    const j = jn && joints ? joints[jn] : null;
    this.bus.emit("jointSelectionChanged", {
      name: j ? jn : null,
      angles: j
        ? [
            roundTo(radToDeg(j.rotation.x), 1),
            roundTo(radToDeg(j.rotation.y), 1),
            roundTo(radToDeg(j.rotation.z), 1),
          ]
        : [0, 0, 0],
    });
  }

  /** Devuelve el nombre de la articulacion seleccionada (o null). */
  getSelectedJoint(): string | null {
    return this.selectedJointName;
  }

  /** Fija el angulo (grados) de un eje de la articulacion seleccionada. */
  setJointAngle(axis: "x" | "y" | "z", deg: number): void {
    const joints = this.figureJoints();
    const jn = this.selectedJointName;
    if (!joints || !jn || !joints[jn]) return;
    // Respeta el rango natural del eje (y bloquea los ejes no articulables).
    const lim = JOINT_DOF[jn]?.[axis];
    const value = lim ? Math.max(lim[0], Math.min(lim[1], deg)) : 0;
    joints[jn].rotation[axis] = degToRad(value);
    (this.humanFigure?.userData.ground as (() => void) | undefined)?.();
    this.emitJointSelection();
    this.scheduleAutosave();
  }

  /** Ejes rotables (naturales) de la articulación seleccionada. */
  getSelectedJointAxes(): { x: boolean; y: boolean; z: boolean } {
    const dof = (this.selectedJointName && JOINT_DOF[this.selectedJointName]) || {};
    return { x: dof.x !== undefined, y: dof.y !== undefined, z: dof.z !== undefined };
  }

  /** Selecciona la figura entera para moverla/rotarla. */
  private selectFigureRoot(): void {
    if (!this.humanFigure) return;
    this.select(null);
    this.selectedFigure = true;
    this.selectedJointName = null;
    this.resetGizmoAxes();
    this.gizmo.attach(this.humanFigure);
    this.setMode("translate");
  }

  private figureJoints(): Record<string, THREE.Object3D> | null {
    return (this.humanFigure?.userData.joints as Record<string, THREE.Object3D>) ?? null;
  }

  /** Aplica una postura de la biblioteca a la figura posable. */
  applyPose(name: string): void {
    const joints = this.figureJoints();
    const def = getPose(name);
    if (!joints || !def) return;
    for (const g of Object.values(joints)) g.rotation.set(0, 0, 0);
    for (const [jn, [x, y, z]] of Object.entries(def)) {
      const j = joints[jn];
      if (j) j.rotation.set(degToRad(x), degToRad(y), degToRad(z));
    }
    (this.humanFigure?.userData.ground as (() => void) | undefined)?.();
    this.scheduleAutosave();
  }

  /** Captura la pose actual (rotaciones de todas las articulaciones, en grados). */
  captureCurrentPose(): PoseDef {
    const joints = this.figureJoints();
    const def: PoseDef = {};
    if (joints) {
      for (const [jn, g] of Object.entries(joints)) {
        def[jn] = [
          roundTo(radToDeg(g.rotation.x), 1),
          roundTo(radToDeg(g.rotation.y), 1),
          roundTo(radToDeg(g.rotation.z), 1),
        ];
      }
    }
    return def;
  }

  listPoseNames(): string[] {
    return poseNames();
  }

  /** Guarda/actualiza una postura con la pose actual de la figura. */
  savePose(name: string): void {
    if (!name.trim() || !this.humanFigure) return;
    setPose(name.trim(), this.captureCurrentPose());
    this.bus.emit("posesChanged", { names: poseNames() });
  }

  deletePose(name: string): void {
    removePose(name);
    this.bus.emit("posesChanged", { names: poseNames() });
  }

  restoreDefaultPoses(): void {
    resetDefaultPoses();
    this.bus.emit("posesChanged", { names: poseNames() });
  }

  // ------------------------------------------------- apoyo de manos (IK)
  /** Entra en modo: clic en una mano de la figura y luego en un agarre. */
  beginAttachHand(): void {
    if (!this.humanFigure || this.humanMode !== "mannequin") return;
    this.cancelConnect();
    this.cancelCable();
    this.attachMode = true;
    this.attachSide = null;
    this.bus.emit("attachModeChanged", { active: true, stage: "hand" });
  }

  cancelAttachHand(): void {
    if (!this.attachMode) return;
    this.attachMode = false;
    this.attachSide = null;
    this.bus.emit("attachModeChanged", { active: false, stage: null });
  }

  /** Apoya una mano (lado) en el punto local de un objeto (agarre). */
  attachHand(side: HandSide, objectId: string, local: THREE.Vector3): void {
    if (!this.objects.has(objectId)) return;
    this.handTargets.set(side, { objectId, local: local.clone() });
  }

  /** Suelta todas las manos apoyadas. */
  detachHands(): void {
    this.handTargets.clear();
  }

  hasAttachedHands(): boolean {
    return this.handTargets.size > 0;
  }

  /** Resuelve cada frame la IK de las manos apoyadas para que sigan su agarre. */
  private updateHandIK(): void {
    if (!this.humanFigure || this.handTargets.size === 0) return;
    const joints = this.figureJoints();
    if (!joints) return;
    for (const [side, t] of [...this.handTargets]) {
      const obj = this.objects.get(t.objectId);
      if (!obj) {
        this.handTargets.delete(side);
        continue;
      }
      obj.mesh.updateMatrixWorld();
      const target = t.local.clone().applyMatrix4(obj.mesh.matrixWorld);
      const sh = joints[`shoulder${side}`];
      const el = joints[`elbow${side}`];
      const wr = joints[`wrist${side}`];
      if (sh && el && wr) solveTwoBoneIK(sh, el, wr, target);
    }
  }

  private selectFigure(): void {
    this.selectFigureRoot();
  }

  // ----------------------------------------------------------- conexiones
  listJoints(): Joint[] {
    return [...this.joints.values()];
  }

  getJointById(id: string): Joint | undefined {
    return this.joints.get(id);
  }

  /** Entra en modo "conectar": clic en pieza A y luego en pieza B. */
  beginConnect(kind: JointKind): void {
    if (this.simulating) return;
    this.cancelCable();
    this.connectMode = kind;
    this.pendingA = null;
    this.select(null);
    this.bus.emit("connectModeChanged", { kind, pending: false });
  }

  cancelConnect(): void {
    if (!this.connectMode) return;
    this.connectMode = null;
    this.pendingA = null;
    this.bus.emit("connectModeChanged", { kind: null, pending: false });
  }

  removeJoint(joint: Joint): void {
    this.joints.delete(joint.id);
    this.refreshJointHelpers();
    this.bus.emit("jointsChanged", { joints: this.listJoints() });
  }

  /** Notifica que un joint cambio (para refrescar marcadores y UI). */
  jointUpdated(): void {
    this.refreshJointHelpers();
    this.bus.emit("jointsChanged", { joints: this.listJoints() });
  }

  /** Crea una articulacion entre dos objetos (por id). Anchor por defecto = punto medio. */
  connect(
    aId: string,
    bId: string,
    kind: JointKind,
    anchor?: THREE.Vector3,
  ): Joint | null {
    const a = this.objects.get(aId);
    const b = this.objects.get(bId);
    if (!a || !b || a === b) return null;
    const anc = anchor ?? a.mesh.position.clone().add(b.mesh.position).multiplyScalar(0.5);
    const joint = new Joint({ kind, bodyAId: aId, bodyBId: bId, anchor: anc });
    this.joints.set(joint.id, joint);
    this.refreshJointHelpers();
    this.bus.emit("jointsChanged", { joints: this.listJoints() });
    return joint;
  }

  private createJoint(a: SceneObject, b: SceneObject): void {
    if (!this.connectMode) return;
    this.connect(a.id, b.id, this.connectMode);
    this.cancelConnect();
  }

  /** Reconstruye los marcadores 3D de las articulaciones. */
  refreshJointHelpers(): void {
    for (const child of [...this.jointHelpers.children]) {
      this.jointHelpers.remove(child);
      (child as THREE.Mesh).geometry?.dispose?.();
      ((child as THREE.Mesh).material as THREE.Material | undefined)?.dispose?.();
    }
    for (const joint of this.joints.values()) {
      const color = joint.kind === "revolute" ? 0x22d3ee : 0xf59e0b;
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(3, 16, 12),
        new THREE.MeshBasicMaterial({ color, depthTest: false }),
      );
      sphere.position.copy(joint.anchor);
      sphere.renderOrder = 999;

      const dir = axisVector(joint.axis).multiplyScalar(30);
      const pts = [
        joint.anchor.clone().sub(dir),
        joint.anchor.clone().add(dir),
      ];
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color, depthTest: false }),
      );
      line.renderOrder = 999;

      this.jointHelpers.add(sphere, line);
    }
  }

  // --------------------------------------------------------------- cables
  listCables(): Cable[] {
    return [...this.cables.values()];
  }

  getCableById(id: string): Cable | undefined {
    return this.cables.get(id);
  }

  /** ¿Es la pieza una roldana/polea (única superficie válida de deslizamiento)? */
  private isPulley(obj: SceneObject): boolean {
    return PULLEY_IDS.has(obj.componentId);
  }

  /**
   * Entra en modo "trazar cable": se colocan DOS puntos de anclaje (línea recta).
   * Entre ellos pueden insertarse roldanas/poleas como puntos de reenvío: clic en
   * una roldana la añade y continúa; clic en cualquier otra pieza cierra el cable.
   */
  beginCable(): void {
    if (this.simulating) return;
    this.cancelConnect();
    this.cancelRope();
    this.cableMode = true;
    this.cablePending = [];
    this.select(null);
    this.emitCableMode();
  }

  /** Emite el estado del modo cable con una pista de la siguiente acción. */
  private emitCableMode(): void {
    const count = this.cablePending.length;
    let hint: string;
    if (count === 0) {
      hint = "Cable: clic en el 1.er punto de anclaje (se ajusta al punto de conexión más cercano).";
    } else if (count === 1) {
      hint =
        "Clic en el 2.º anclaje (línea recta). Para reenviar, clic antes en una roldana/polea.";
    } else {
      hint = `Cable con ${count} nodos. Clic en la pieza final para cerrar, o en otra roldana. Enter para finalizar.`;
    }
    this.bus.emit("cableModeChanged", { active: true, count, hint });
  }

  cancelCable(): void {
    if (!this.cableMode) return;
    this.cableMode = false;
    this.cablePending = [];
    this.clearPlacementPreview();
    this.bus.emit("cableModeChanged", { active: false, count: 0 });
  }

  /** Cierra el cable en construccion (>=2 nodos). */
  finishCable(): void {
    if (!this.cableMode) return;
    if (this.cablePending.length >= 2) {
      this.createCable(
        this.cablePending.map((p) => ({
          objectId: p.object.id,
          local: { x: p.local.x, y: p.local.y, z: p.local.z },
        })),
      );
    }
    this.cancelCable();
  }

  /** Crea un cable a partir de una lista ordenada de nodos (pieza + anclaje). */
  createCable(nodes: CableNode[]): Cable | null {
    if (nodes.length < 2) return null;
    const cable = new Cable({ nodes });
    this.cables.set(cable.id, cable);
    this.bus.emit("cablesChanged", { cables: this.listCables() });
    return cable;
  }

  removeCable(cable: Cable): void {
    this.cables.delete(cable.id);
    this.bus.emit("cablesChanged", { cables: this.listCables() });
  }

  /**
   * Anima las pilas de pesos: durante la simulacion, el carriage (tubo + placas
   * seleccionadas) sube con el cuerpo mientras las placas no seleccionadas y las
   * varillas se contra-mueven para quedarse quietas. El cuerpo solo sube (>=0).
   */
  private updateStackAnimation(): void {
    for (const obj of this.objects.values()) {
      if (!obj.stack) continue;
      const parts = obj.getStackParts();
      if (parts.length === 0) continue;
      let delta = 0;
      if (this.simulating) {
        const saved = this.saved.get(obj.id);
        if (saved) delta = Math.max(0, obj.mesh.position.y - saved.position.y);
      }
      for (const p of parts) {
        p.mesh.position.y = p.carriage ? p.restY : p.restY - delta;
      }
    }
  }

  /** Reconstruye las polilineas de los cables segun la posicion de sus nodos. */
  private updateCableVisuals(): void {
    // Anade/quita lineas para que coincidan con los cables actuales.
    const wanted = new Set(this.cables.keys());
    for (const child of [...this.cableVisuals.children]) {
      if (!wanted.has(child.userData.cableId as string)) {
        this.cableVisuals.remove(child);
        ((child as THREE.Line).geometry as THREE.BufferGeometry).dispose();
        ((child as THREE.Line).material as THREE.Material).dispose();
      }
    }
    const existing = new Map<string, THREE.Line>();
    for (const child of this.cableVisuals.children) {
      existing.set(child.userData.cableId as string, child as THREE.Line);
    }

    for (const cable of this.cables.values()) {
      const pts: THREE.Vector3[] = [];
      for (const node of cable.nodes) {
        const obj = this.objects.get(node.objectId);
        if (obj) {
          obj.mesh.updateMatrixWorld();
          pts.push(
            new THREE.Vector3(node.local.x, node.local.y, node.local.z).applyMatrix4(
              obj.mesh.matrixWorld,
            ),
          );
        }
      }
      if (pts.length < 2) continue;
      let line = existing.get(cable.id);
      if (!line) {
        line = new THREE.Line(
          new THREE.BufferGeometry(),
          new THREE.LineBasicMaterial({ color: 0xd8dee9 }),
        );
        line.userData.cableId = cable.id;
        this.cableVisuals.add(line);
      }
      line.geometry.setFromPoints(pts);
    }
  }

  // ---------------------------------------------------------------- cuerdas
  /** Entra en modo "colocar cuerda": clic en el extremo A y luego en el B. */
  beginRope(kind: RopeKind): void {
    this.cancelCable();
    this.cancelConnect();
    this.cancelAttachHand();
    this.select(null);
    this.ropeMode = kind;
    this.ropePendingA = null;
    this.bus.emit("ropeModeChanged", { active: true, kind, count: 0 });
  }

  cancelRope(): void {
    if (!this.ropeMode) return;
    this.ropeMode = null;
    this.ropePendingA = null;
    this.clearPlacementPreview();
    this.bus.emit("ropeModeChanged", { active: false, kind: null, count: 0 });
  }

  // ------------------------------------------- piezas de línea (beam/tube)
  /**
   * Entra en modo "trazar pieza de línea" (pilar/travesaño o tubo): dos clics
   * definen los extremos, como la línea recta de Paint. `params` es la plantilla
   * (perfil/extremos/agujeros o radio) elegida en el diálogo; el path se genera
   * al fijar los dos puntos. El modo queda activo para encadenar piezas (ESC
   * para salir).
   */
  beginLine(kind: "beam" | "tube", params: PrimitiveParams): void {
    if (this.simulating) return;
    this.cancelConnect();
    this.cancelCable();
    this.cancelRope();
    this.cancelAttachHand();
    this.endBendNodes();
    this.select(null);
    this.lineMode = kind;
    this.lineParams = params;
    this.linePendingA = null;
    this.bus.emit("lineModeChanged", { active: true, kind, count: 0 });
  }

  cancelLine(): void {
    if (!this.lineMode) return;
    this.lineMode = null;
    this.lineParams = null;
    this.linePendingA = null;
    this.clearPlacementPreview();
    this.bus.emit("lineModeChanged", { active: false, kind: null, count: 0 });
  }

  /**
   * Aim assist del trazado: punto bajo el cursor, con ayuda de puntería que
   * imanta a los puntos clave de otras piezas (extremos, nodos y puntos medios)
   * cuando el cursor pasa a menos de ~16 px en pantalla. Si no hay imán, usa la
   * superficie señalada; si no, el suelo (y=0) redondeado al cm.
   */
  private pickLinePlacePoint(): { point: THREE.Vector3; snapped: boolean } | null {
    const rect = this.canvas.getBoundingClientRect();
    let best: THREE.Vector3 | null = null;
    let bestPx = 16;
    const ndc = new THREE.Vector3();
    for (const obj of this.objects.values()) {
      obj.mesh.updateMatrixWorld();
      for (const lp of localSnapPoints(obj)) {
        const wp = lp.clone().applyMatrix4(obj.mesh.matrixWorld);
        ndc.copy(wp).project(this.sceneManager.camera);
        if (ndc.z > 1 || ndc.z < -1) continue; // fuera del frustum en Z
        const dx = ((ndc.x - this.pointer.x) * rect.width) / 2;
        const dy = ((ndc.y - this.pointer.y) * rect.height) / 2;
        const px = Math.hypot(dx, dy);
        if (px < bestPx) {
          bestPx = px;
          best = wp;
        }
      }
    }
    if (best) return { point: best, snapped: true };

    const hits = this.raycaster.intersectObjects(this.sceneManager.content.children, false);
    if (hits[0]) return { point: hits[0].point.clone(), snapped: false };

    const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const p = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(ground, p)) {
      p.set(Math.round(p.x), 0, Math.round(p.z));
      return { point: p, snapped: false };
    }
    return null;
  }

  /** Crea la pieza de línea entre dos puntos de mundo (recta, path por nodos). */
  private createLinePiece(a: THREE.Vector3, b: THREE.Vector3): SceneObject | null {
    const kind = this.lineMode;
    const tpl = this.lineParams;
    if (!kind || !tpl) return null;
    const dir = b.clone().sub(a);
    const L = dir.length();
    if (L < 2) return null; // trazo demasiado corto
    dir.divideScalar(L);

    const def = getDefinition(kind === "beam" ? "pilar-linea" : "tubo-linea");
    if (!def) return null;
    const count = [...this.objects.values()].filter((o) => o.componentId === def.id).length;
    const obj = new SceneObject({
      name: count > 0 ? `${def.label} ${count + 1}` : def.label,
      componentId: def.id,
      category: def.category,
      params: { ...tpl, path: straightPath(L) },
      physics: def.physics,
      materialId: def.materialId,
    });
    obj.mesh.position.copy(a).add(b).multiplyScalar(0.5);
    obj.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    this.sceneManager.content.add(obj.mesh);
    this.objects.set(obj.id, obj);
    this.bus.emit("objectsChanged", { objects: this.listObjects() });
    this.scheduleAutosave();
    return obj;
  }

  // ------------------------------------------------- doblado por nodos
  /**
   * Activa el doblado (bending) de la pieza seleccionada: muestra los nodos de
   * su trayectoria como asas arrastrables (curvas tipo Bézier editables). Solo
   * para piezas de línea (con `params.path`).
   */
  beginBendNodes(): void {
    const obj = this.selected;
    if (!obj || !obj.params.path || this.simulating) return;
    this.cancelConnect();
    this.cancelCable();
    this.cancelRope();
    this.cancelLine();
    this.endBendNodes();
    this.bendTarget = obj;
    this.gizmo.detach();

    const group = new THREE.Group();
    const r = Math.max(2, Math.min(4, (obj.params.radius ?? obj.params.width ?? 5) * 0.7));
    for (let i = 0; i < obj.params.path.length; i++) {
      const h = new THREE.Mesh(
        new THREE.SphereGeometry(r, 16, 12),
        new THREE.MeshBasicMaterial({
          color: 0x22d3ee,
          depthTest: false,
          transparent: true,
          opacity: 0.95,
        }),
      );
      h.renderOrder = 1001;
      h.userData.bendIndex = i;
      group.add(h);
    }
    this.bendHandles = group;
    this.sceneManager.scene.add(group);
    this.refreshBendHandles();
    this.bus.emit("bendModeChanged", { active: true });
  }

  isBending(): boolean {
    return this.bendTarget !== null;
  }

  /** Coloca las asas sobre los nodos del path (en coordenadas de mundo). */
  private refreshBendHandles(): void {
    const obj = this.bendTarget;
    if (!obj || !this.bendHandles) return;
    obj.mesh.updateMatrixWorld(true);
    for (const h of this.bendHandles.children) {
      const i = h.userData.bendIndex as number;
      const n = obj.params.path![i];
      h.position.set(n[0], n[1], n[2]).applyMatrix4(obj.mesh.matrixWorld);
    }
  }

  endBendNodes(): void {
    if (!this.bendTarget) return;
    if (this.bendHandles) {
      this.sceneManager.scene.remove(this.bendHandles);
      for (const h of this.bendHandles.children) {
        (h as THREE.Mesh).geometry.dispose();
        ((h as THREE.Mesh).material as THREE.Material).dispose();
      }
      this.bendHandles = null;
    }
    const obj = this.bendTarget;
    this.bendTarget = null;
    this.bendDrag = null;
    this.orbit.enabled = true;
    // Reengancha el gizmo si la pieza sigue seleccionada.
    if (this.selected === obj) this.gizmo.attach(obj.mesh);
    this.bus.emit("bendModeChanged", { active: false });
    this.scheduleAutosave();
  }

  /**
   * Punto de anclaje (pieza + local + mundo) cuyo punto de conexión está más
   * cerca del ray actual; null si el ray no toca ninguna pieza. Facilita el
   * anclaje ajustándose al punto de conexión más próximo de la pieza señalada.
   */
  private pickAnchorPoint(): { object: SceneObject; local: THREE.Vector3; world: THREE.Vector3 } | null {
    const hits = this.raycaster.intersectObjects(this.sceneManager.content.children, false);
    const hit = hits[0];
    const id = hit?.object.userData.sceneObjectId as string | undefined;
    const obj = id ? this.objects.get(id) : undefined;
    if (!obj || !hit) return null;
    obj.mesh.updateMatrixWorld(true);
    let best = new THREE.Vector3();
    let bestD = Infinity;
    for (const lp of localSnapPoints(obj)) {
      const wp = lp.clone().applyMatrix4(obj.mesh.matrixWorld);
      const d = wp.distanceTo(hit.point);
      if (d < bestD) { bestD = d; best = lp; }
    }
    return { object: obj, local: best, world: best.clone().applyMatrix4(obj.mesh.matrixWorld) };
  }

  /** Posición de mundo del último punto colocado (para la línea elástica). */
  private placementAnchorWorld(): THREE.Vector3 | null {
    if (this.cableMode && this.cablePending.length > 0) {
      const last = this.cablePending[this.cablePending.length - 1];
      last.object.mesh.updateMatrixWorld();
      return last.local.clone().applyMatrix4(last.object.mesh.matrixWorld);
    }
    if (this.ropeMode && this.ropePendingA) {
      return this.ropeEndWorld(this.ropePendingA);
    }
    return null;
  }

  private showPlacementLine(a: THREE.Vector3, b: THREE.Vector3): void {
    if (!this.placementLine) {
      this.placementLine = new THREE.Line(
        new THREE.BufferGeometry(),
        new THREE.LineDashedMaterial({
          color: 0x22d3ee,
          dashSize: 3,
          gapSize: 2,
          depthTest: false,
          transparent: true,
          opacity: 0.9,
        }),
      );
      this.placementLine.renderOrder = 999;
      this.sceneManager.scene.add(this.placementLine);
    }
    this.placementLine.geometry.setFromPoints([a, b]);
    this.placementLine.computeLineDistances();
    this.placementLine.visible = true;
  }

  private clearPlacementPreview(): void {
    this.snap.hideIndicator();
    if (this.placementLine) this.placementLine.visible = false;
  }

  /**
   * Previsualiza el anclaje (indicador) y la línea recta al colocar
   * cable/cuerda/pieza de línea, y arrastra los nodos en modo doblado.
   */
  private onPointerMove = (event: PointerEvent): void => {
    if (this.simulating || (!this.cableMode && !this.ropeMode && !this.lineMode && !this.bendDrag)) {
      return;
    }
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.sceneManager.camera);

    // Arrastre de un nodo de doblado: mueve el nodo en el plano de cámara y
    // reconstruye la pieza en vivo (curva Catmull-Rom por los nodos).
    if (this.bendDrag && this.bendTarget) {
      const hit = new THREE.Vector3();
      if (!this.raycaster.ray.intersectPlane(this.bendDrag.plane, hit)) return;
      const obj = this.bendTarget;
      obj.mesh.updateMatrixWorld(true);
      const local = hit.applyMatrix4(obj.mesh.matrixWorld.clone().invert());
      obj.params.path![this.bendDrag.index] = [local.x, local.y, local.z];
      obj.rebuildGeometry();
      this.refreshBendHandles();
      this.bus.emit("objectTransformed", { object: obj });
      return;
    }

    // Trazado de pieza de línea: imán de puntería + línea elástica.
    if (this.lineMode) {
      const pick = this.pickLinePlacePoint();
      if (!pick) {
        this.clearPlacementPreview();
        return;
      }
      if (pick.snapped) this.snap.showIndicator(pick.point);
      else this.snap.hideIndicator();
      if (this.linePendingA) this.showPlacementLine(this.linePendingA, pick.point);
      else if (this.placementLine) this.placementLine.visible = false;
      return;
    }

    let world: THREE.Vector3 | null = null;
    let onPiece = false;
    const pick = this.pickAnchorPoint();
    if (pick) {
      world = pick.world;
      onPiece = true;
    } else if (this.ropeMode) {
      // La cuerda admite anclas libres sobre el suelo (y=0).
      const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const p = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(ground, p)) world = p;
    }

    if (!world) {
      this.clearPlacementPreview();
      return;
    }
    if (onPiece) this.snap.showIndicator(world);
    else this.snap.hideIndicator();
    const from = this.placementAnchorWorld();
    if (from) this.showPlacementLine(from, world);
    else if (this.placementLine) this.placementLine.visible = false;
  };

  private pickRopeEnd(): RopeEnd | null {
    const pick = this.pickAnchorPoint();
    if (pick) return { objectId: pick.object.id, local: pick.local };
    // Sin pieza: ancla libre sobre el plano del suelo (y=0).
    const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const p = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(ground, p)) {
      return { objectId: null, local: p };
    }
    return null;
  }

  /** Coordenada de mundo de un extremo de cuerda. */
  private ropeEndWorld(end: RopeEnd): THREE.Vector3 {
    if (end.objectId) {
      const obj = this.objects.get(end.objectId);
      if (obj) {
        obj.mesh.updateMatrixWorld();
        return end.local.clone().applyMatrix4(obj.mesh.matrixWorld);
      }
    }
    return end.local.clone();
  }

  private ropeSegTemplate(kind: RopeKind): THREE.BufferGeometry | null {
    return componentModels.geometryClone(kind === "chain" ? "cadena-eslabones" : "liston-kevlar");
  }

  private rebuildRope(rope: Rope): void {
    rope.rebuild(this.ropeEndWorld(rope.a), this.ropeEndWorld(rope.b), this.ropeSegTemplate(rope.kind));
  }

  private rebuildAllRopes(): void {
    for (const r of this.ropes.values()) this.rebuildRope(r);
  }

  private updateRopesForObject(objectId: string): void {
    for (const r of this.ropes.values()) {
      if (r.a.objectId === objectId || r.b.objectId === objectId) this.rebuildRope(r);
    }
  }

  createRope(kind: RopeKind, a: RopeEnd, b: RopeEnd, slack?: number, name?: string): Rope {
    const rope = new Rope({ kind, a, b, slack, name });
    this.ropes.set(rope.id, rope);
    this.ropeVisuals.add(rope.group);
    this.rebuildRope(rope);
    this.bus.emit("objectsChanged", { objects: this.listObjects() });
    return rope;
  }

  listRopes(): Rope[] {
    return [...this.ropes.values()];
  }

  setRopeSlack(id: string, slack: number): void {
    const rope = this.ropes.get(id);
    if (!rope) return;
    rope.slack = Math.max(0, Math.min(1, slack));
    this.rebuildRope(rope);
    if (this.selectedRopeId === id) {
      this.bus.emit("ropeSelectionChanged", { id, name: rope.name, slack: rope.slack });
    }
    this.scheduleAutosave();
  }

  deleteRope(id: string): void {
    const rope = this.ropes.get(id);
    if (!rope) return;
    this.ropeVisuals.remove(rope.group);
    rope.dispose();
    this.ropes.delete(id);
    if (this.selectedRopeId === id) {
      this.selectedRopeId = null;
      this.bus.emit("ropeSelectionChanged", null);
    }
    this.bus.emit("objectsChanged", { objects: this.listObjects() });
    this.scheduleAutosave();
  }

  private selectRope(id: string): void {
    const rope = this.ropes.get(id);
    if (!rope) return;
    this.select(null);
    this.selectedRopeId = id;
    this.bus.emit("ropeSelectionChanged", { id, name: rope.name, slack: rope.slack });
  }

  // -------------------------------------------------------------- eventos
  private onPointerDown = (event: PointerEvent): void => {
    if (this.gizmo.dragging || this.simulating) return;
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.sceneManager.camera);

    // Modo doblado: clic en un asa inicia el arrastre del nodo; fuera, sale.
    if (this.bendTarget && this.bendHandles) {
      const hits = this.raycaster.intersectObjects(this.bendHandles.children, false);
      if (hits[0]) {
        const idx = hits[0].object.userData.bendIndex as number;
        const node = hits[0].object.position.clone();
        const normal = this.sceneManager.camera.getWorldDirection(new THREE.Vector3());
        this.bendDrag = {
          index: idx,
          plane: new THREE.Plane().setFromNormalAndCoplanarPoint(normal, node),
        };
        this.orbit.enabled = false;
      } else {
        this.endBendNodes();
      }
      return;
    }

    // Modo línea (pilar/travesaño/tubo): dos clics con aim assist.
    if (this.lineMode) {
      const pick = this.pickLinePlacePoint();
      if (!pick) return;
      if (!this.linePendingA) {
        this.linePendingA = pick.point.clone();
        this.bus.emit("lineModeChanged", { active: true, kind: this.lineMode, count: 1 });
      } else {
        this.createLinePiece(this.linePendingA, pick.point);
        this.linePendingA = null;
        if (this.placementLine) this.placementLine.visible = false;
        this.bus.emit("lineModeChanged", { active: true, kind: this.lineMode, count: 0 });
      }
      return;
    }

    // Modo apoyar mano (IK): 1) clic en una mano/brazo de la figura, 2) clic en el agarre.
    if (this.attachMode) {
      if (!this.attachSide) {
        if (!this.humanFigure) return;
        const fHits = this.raycaster.intersectObjects([this.humanFigure], true);
        const jn = fHits[0]?.object.userData.jointName as string | undefined;
        if (jn && (jn.startsWith("shoulder") || jn.startsWith("elbow"))) {
          this.attachSide = jn.endsWith("R") ? "R" : "L";
          this.bus.emit("attachModeChanged", { active: true, stage: "grip" });
        }
        return;
      }
      const gHits = this.raycaster.intersectObjects(this.sceneManager.content.children, false);
      const hit = gHits[0];
      const id = hit?.object.userData.sceneObjectId as string | undefined;
      const obj = id ? this.objects.get(id) : undefined;
      if (!obj || !hit) return;
      obj.mesh.updateMatrixWorld(true);
      let best = new THREE.Vector3();
      let bestD = Infinity;
      for (const lp of localSnapPoints(obj)) {
        const wp = lp.clone().applyMatrix4(obj.mesh.matrixWorld);
        const dd = wp.distanceTo(hit.point);
        if (dd < bestD) { bestD = dd; best = lp; }
      }
      this.handTargets.set(this.attachSide, { objectId: obj.id, local: best });
      this.cancelAttachHand();
      return;
    }

    // Modo cuerda: clic en el extremo A y luego en el B (línea recta).
    if (this.ropeMode) {
      const end = this.pickRopeEnd();
      if (!end) return;
      if (!this.ropePendingA) {
        this.ropePendingA = end;
        this.bus.emit("ropeModeChanged", { active: true, kind: this.ropeMode, count: 1 });
      } else {
        const rope = this.createRope(this.ropeMode, this.ropePendingA, end);
        this.cancelRope();
        this.selectRope(rope.id);
      }
      return;
    }

    // Modo cable: dos puntos de anclaje describen una línea recta; entre medias
    // solo roldanas/poleas actúan como superficie de reenvío (deslizamiento).
    if (this.cableMode) {
      const pick = this.pickAnchorPoint();
      if (!pick) return;
      const prev = this.cablePending[this.cablePending.length - 1];
      if (prev && prev.object === pick.object) return; // mismo nodo, ignora
      if (this.cablePending.length === 0) {
        // Primer extremo (ancla A).
        this.cablePending.push({ object: pick.object, local: pick.local });
        this.emitCableMode();
      } else if (this.isPulley(pick.object)) {
        // Roldana intermedia: punto de reenvío, el cable sigue abierto.
        this.cablePending.push({ object: pick.object, local: pick.local });
        this.emitCableMode();
      } else {
        // Pieza no-polea: extremo final (ancla B). Cierra el cable.
        this.cablePending.push({ object: pick.object, local: pick.local });
        this.finishCable();
      }
      return;
    }

    // Modo conexion: solo objetos editables (no la figura de referencia).
    if (this.connectMode) {
      const objHits = this.raycaster.intersectObjects(
        this.sceneManager.content.children,
        false,
      );
      const cid = objHits[0]?.object.userData.sceneObjectId as string | undefined;
      const cobj = cid ? this.objects.get(cid) : undefined;
      if (!cobj) return;
      if (!this.pendingA) {
        this.pendingA = cobj;
        this.select(cobj);
        this.bus.emit("connectModeChanged", { kind: this.connectMode, pending: true });
      } else if (cobj !== this.pendingA) {
        this.createJoint(this.pendingA, cobj);
      }
      return;
    }

    // Selección normal: objetos editables, cuerdas o figura humana, por cercanía.
    const objHits = this.raycaster.intersectObjects(
      this.sceneManager.content.children,
      false,
    );
    const figHits = this.humanFigure
      ? this.raycaster.intersectObjects([this.humanFigure], true)
      : [];
    const ropeHits = this.raycaster.intersectObjects(this.ropeVisuals.children, true);
    const objDist = objHits[0]?.distance ?? Infinity;
    const figDist = figHits[0]?.distance ?? Infinity;
    const ropeDist = ropeHits[0]?.distance ?? Infinity;

    if (ropeDist < objDist && ropeDist < figDist) {
      const rid = ropeHits[0].object.userData.ropeId as string | undefined;
      if (rid) this.selectRope(rid);
      return;
    }

    if (objDist === Infinity && figDist === Infinity) {
      this.select(null);
    } else if (figDist < objDist) {
      this.selectFigurePart(figHits[0].object);
    } else {
      const id = objHits[0].object.userData.sceneObjectId as string | undefined;
      const obj = (id && this.objects.get(id)) || null;
      if (!obj) {
        this.select(null);
      } else if (this.objGroup.has(obj.id)) {
        this.selectGroup(this.objGroup.get(obj.id)!);
      } else if (event.shiftKey) {
        this.toggleMulti(obj);
      } else {
        this.select(obj);
      }
    }
  };

  /** Suelta el nodo de doblado al levantar el puntero (en cualquier parte). */
  private onPointerUp = (): void => {
    if (!this.bendDrag) return;
    this.bendDrag = null;
    this.orbit.enabled = true;
    this.scheduleAutosave();
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    // No robar atajos mientras se escribe o navega un control de la UI.
    const t = event.target;
    if (
      t instanceof HTMLElement &&
      (t.closest("input, select, textarea") !== null || t.isContentEditable)
    ) {
      return;
    }
    if (event.key === " ") {
      // Con un botón enfocado, Espacio debe activar el botón, no la simulación.
      if (t instanceof HTMLElement && t.closest("button") !== null) return;
      event.preventDefault();
      void this.toggleSimulation();
      return;
    }
    if (this.simulating) return;
    if (this.cableMode && (event.key === "Enter" || event.key === "Return")) {
      this.finishCable();
      return;
    }
    switch (event.key.toLowerCase()) {
      case "g":
      case "w":
        this.setMode("translate");
        break;
      case "r":
      case "e":
        this.setMode("rotate");
        break;
      case "s":
        this.setMode("scale");
        break;
      case "delete":
      case "backspace":
        if (this.selected) this.removeObject(this.selected);
        else if (this.selectedGroupId) this.deleteSelectedGroup();
        else if (this.selectedRopeId) this.deleteRope(this.selectedRopeId);
        break;
      case "escape":
        this.cancelConnect();
        this.cancelCable();
        this.cancelRope();
        this.cancelLine();
        this.cancelAttachHand();
        this.endBendNodes();
        this.select(null);
        break;
    }
  };

  private onResize = (): void => {
    this.sceneManager.resize();
  };
}
