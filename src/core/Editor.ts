import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { SceneManager } from "../scene/SceneManager";
import { getPerf } from "./performance";
import { formatCm } from "./units";
import { SceneObject } from "../objects/SceneObject";
import { CATEGORY_COLORS, getDefinition } from "../objects/componentLibrary";
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
  PARENT_JOINT,
  buildHumanFigure,
  disposeHumanFigure,
} from "../objects/humanFigure";
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
import { PROJECT_VERSION, type ProjectData, type WorkspaceData } from "./project";
import type { ComponentCategory, PrimitiveParams } from "../objects/types";
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
  jointSelectionChanged: {
    name: string | null;
    angles: [number, number, number];
    locked: boolean;
  };
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
  /** Historial de deshacer/rehacer: disponibilidad actual. */
  historyChanged: { canUndo: boolean; canRedo: boolean };
  /** Herramienta de selección de área (marquee) activada/desactivada. */
  areaSelectChanged: { on: boolean };
  /** Herramienta de arrastre directo activada/desactivada. */
  dragToolChanged: { on: boolean };
  /** Eje de trabajo bloqueado (1=X, 2=Y, 3=Z; 0/Esc libera) o null. */
  axisLockChanged: { axis: "x" | "y" | "z" | null };
  /** Contador de desplazamiento en vivo durante un arrastre/trazado (cm/°). */
  dragMeasure: { text: string | null };
  /** Cambió el espacio de trabajo (asistente de Nuevo, v0.2.0). */
  workspaceChanged: { workspace: WorkspaceData | null };
  /** Nº de piezas fuera de los límites del canvas completo (marcadas en rojo). */
  workspaceBounds: { fuera: number };
  /** Herramienta "agarrar maniquí" activada/desactivada. */
  grabFigureChanged: { on: boolean };
  /** Modos de vista del Builder: color, aristas (menú Ver, v0.2.0). */
  viewModesChanged: { color: ColorMode; edges: boolean };
};

/** Modo de color del visor: materiales reales, por categoría o neutro. */
export type ColorMode = "material" | "categoria" | "neutro";

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
  private bendDrag: { index: number; plane: THREE.Plane; origin: THREE.Vector3 } | null = null;

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
  // ---- Selección de área (marquee), portapapeles e historial (v0.1.8)
  private areaSelect = false;
  private marquee: { x0: number; y0: number; x1: number; y1: number; additive: boolean } | null =
    null;
  private marqueeEl: HTMLDivElement | null = null;
  private clipboard: {
    data: ProjectData["objects"][number];
    category: ComponentCategory;
    importedGeometry: THREE.BufferGeometry | null;
  }[] = [];
  private history: string[] = [];
  private hIndex = -1;
  /** Eje de trabajo bloqueado (teclas 1/2/3): restringe TODO el trazado. */
  private axisLock: "x" | "y" | "z" | null = null;
  /** Herramienta de arrastre directo de piezas. */
  private dragTool = false;
  private dragMove: {
    ids: string[];
    grabbed: THREE.Vector3;
    plane: THREE.Plane;
    starts: Map<string, THREE.Vector3>;
  } | null = null;
  private gizmoDragStart: { pos: THREE.Vector3; quat: THREE.Quaternion } | null = null;
  // ---- Espacio de trabajo (asistente de Nuevo, v0.2.0)
  /** Configuración del espacio de trabajo del proyecto (o null = libre). */
  private workspace: WorkspaceData | null = null;
  /** Visual no serializable del área de suelo operable (canvas completo). */
  private workspaceVisual: THREE.Group | null = null;
  /** Piezas actualmente fuera de los límites del espacio (tinte rojo). */
  private fueraIds = new Set<string>();
  /** Transformaciones previas al arrastre para cancelar colocaciones fuera. */
  private boundsRestore: Map<string, SavedTransform> | null = null;
  // ---- Modos de vista del Builder (menú Ver, v0.2.0)
  private colorMode: ColorMode = "material";
  private edgesOn = false;
  private viewModesTimer: ReturnType<typeof setTimeout> | null = null;
  private historyTimer: ReturnType<typeof setTimeout> | null = null;
  private applyingHistory = false;
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

  // ---- Ergonomía del maniquí (esquema v0.2.0)
  /** Articulaciones bloqueadas con el candado: no se posan hasta liberarlas. */
  private jointLocks = new Set<string>();
  /** Simetría de pose: los cambios de un lado se replican espejados al otro. */
  private poseSymmetry = false;
  /** Herramienta "agarrar maniquí": llevar un segmento con el puntero. */
  private grabFigureTool = false;
  private grabDrag: {
    /** Articulación que rota ("" = mover la figura entera). */
    joint: string;
    /** Punto agarrado en coords locales de la articulación (u offset raíz). */
    grabLocal: THREE.Vector3;
    origin: THREE.Vector3;
    plane: THREE.Plane;
  } | null = null;

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
      if (e.value && this.gizmo.object) {
        this.gizmoDragStart = {
          pos: this.gizmo.object.position.clone(),
          quat: this.gizmo.object.quaternion.clone(),
        };
        this.captureBoundsRestore();
      } else {
        this.gizmoDragStart = null;
        this.bus.emit("dragMeasure", { text: null });
        this.enforceWorkspaceBounds();
      }
      if (!e.value) this.snap.hideIndicator();
    });
    this.gizmo.addEventListener("objectChange", () => {
      // Cualquier arrastre del gizmo (pieza, grupo o articulación del maniquí)
      // ensucia el proyecto y debe autoguardarse.
      this.scheduleAutosave();
      // Contador de desplazamiento en vivo (cm al mover, grados al rotar).
      if (this.gizmo.dragging && this.gizmoDragStart && this.gizmo.object) {
        const mode = this.gizmo.getMode();
        if (mode === "rotate") {
          const dq = this.gizmo.object.quaternion
            .clone()
            .multiply(this.gizmoDragStart.quat.clone().invert());
          const ang = THREE.MathUtils.radToDeg(2 * Math.acos(Math.min(1, Math.abs(dq.w))));
          this.bus.emit("dragMeasure", { text: `Giro: ${ang.toFixed(1)}°` });
        } else if (mode === "translate") {
          this.emitDragMeasure(
            this.gizmo.object.position.clone().sub(this.gizmoDragStart.pos),
          );
        }
      }
      if (this.selectedGroupId) {
        this.applyGroupDelta();
        return;
      }
      if (this.multiSel.size > 0 && this.gizmo.object === this.groupProxy) {
        this.applyMultiDelta();
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
      // Las piezas de entorno (ws-techo) tienen geometría propia del workspace.
      if (o.componentId.startsWith("ws-")) continue;
      const geo = componentModels.geometryClone(o.componentId);
      if (geo) o.applyCustomGeometry(geo);
      else if (o.customModel) o.revertToPrimitive();
    }
    this.clearRopeTemplates(); // los segmentos de eslabón/Kevlar pueden haber cambiado
    this.rebuildAllRopes();
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
    // Revalida los límites del espacio de trabajo con cada cambio de escena.
    this.checkWorkspaceBounds();
    // Y reaplica los modos de vista (color/aristas) si están activos.
    this.scheduleViewModes();
    // Todo cambio que autoguarda es también un cambio sin guardar a archivo
    // (posar el maniquí, tensar cuerdas, mover grupos… no emiten evento).
    this.dirty = true;
    this.historyPush();
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
    this.installRenderOnDemand();
    if (this.history.length === 0) this.resetHistory();
    this.loop();
  }

  private lastFrameTime = 0;
  private simFrame = 0;
  /** Los visuales de cable solo se reconstruyen cuando algo se ha movido. */
  private cablesDirty = true;
  /** Frames de render pendientes (render bajo demanda fuera de simulación). */
  private renderDemand = 5;
  private lastRenderTime = 0;
  /** Resolución dinámica: arrastre sobre el lienzo y último movimiento. */
  private canvasDragging = false;
  private lastMotionAt = 0;

  /** Fotografía el visor tal cual se ve (render inmediato + PNG). */
  captureViewportPNG(): string {
    this.sceneManager.render();
    return this.sceneManager.renderer.domElement.toDataURL("image/png");
  }

  /** Pide repintar los próximos frames (interacción, cambios de escena…). */
  requestRender(frames = 3): void {
    this.renderDemand = Math.max(this.renderDemand, frames);
  }

  /**
   * Render bajo demanda: fuera de la simulación solo se pinta cuando hay
   * interacción (puntero/teclado/rueda), la cámara se mueve o algo cambió,
   * con un latido de seguridad cada 500 ms (cargas asíncronas de modelos).
   * En tablets elimina el trabajo de GPU en reposo (batería y fluidez).
   */
  private installRenderOnDemand(): void {
    const bump = (): void => this.requestRender();
    for (const ev of ["pointerdown", "pointerup", "wheel", "keydown", "touchstart", "touchend"]) {
      window.addEventListener(ev, bump, { passive: true, capture: true });
    }
    // El movimiento del puntero solo repinta arrastrando o sobre el lienzo
    // (previsualizaciones de colocación/línea/doblado con el cursor).
    window.addEventListener(
      "pointermove",
      (e: PointerEvent) => {
        if (e.buttons > 0 || e.target === this.sceneManager.renderer.domElement) bump();
      },
      { passive: true, capture: true },
    );
    window.addEventListener("touchmove", bump, { passive: true, capture: true });
    window.addEventListener("resize", () => this.requestRender(5));
    // Arrastre sobre el lienzo (orbitar, gizmo, doblado…): activa la escala
    // de movimiento de la resolución dinámica.
    const canvas = this.sceneManager.renderer.domElement;
    canvas.addEventListener("pointerdown", () => (this.canvasDragging = true), { passive: true });
    canvas.addEventListener("touchstart", () => (this.canvasDragging = true), { passive: true });
    for (const ev of ["pointerup", "pointercancel", "touchend", "touchcancel"]) {
      window.addEventListener(ev, () => (this.canvasDragging = false), {
        passive: true,
        capture: true,
      });
    }
  }

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
      this.requestRender();
    }
    const moved = this.orbit.update();
    // Resolución dinámica: menos píxeles mientras hay movimiento real
    // (cámara, arrastre sobre el lienzo o simulación); nítido en reposo.
    if (getPerf().dynamicResolution) {
      if (this.simulating || moved || this.canvasDragging) {
        this.lastMotionAt = now;
        this.sceneManager.setMotionScale(true);
      } else if (now - this.lastMotionAt > 300 && this.sceneManager.setMotionScale(false)) {
        this.requestRender();
      }
    } else if (this.sceneManager.setMotionScale(false)) {
      this.requestRender();
    }
    if (this.simulating || moved || this.renderDemand > 0 || now - this.lastRenderTime > 500) {
      this.sceneManager.render();
      this.lastRenderTime = now;
      if (this.renderDemand > 0) this.renderDemand--;
    }
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
    this.endSimInteraction();
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
    if (src.imported || src.componentId.startsWith("ws-")) {
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

  // ------------------------------------------- espacio de trabajo (v0.2.0)
  getWorkspace(): WorkspaceData | null {
    return this.workspace;
  }

  /**
   * Define el espacio de trabajo del proyecto (asistente de Nuevo). Con canvas
   * "completo" dibuja el área de suelo operable y, con `crearPiezas`, genera el
   * techo (capa oscura copia del suelo, con altura y pendiente propias) y las
   * paredes como piezas ancladas REALES: sirven de superficie de anclaje para
   * articulaciones, cables y cuerdas, y participan en la simulación.
   */
  setWorkspace(ws: WorkspaceData | null, opts: { crearPiezas?: boolean } = {}): void {
    this.workspace = ws
      ? {
          ...ws,
          techo: ws.techo ? { ...ws.techo } : null,
          paredes: ws.paredes ? [...ws.paredes] : [],
          planta: ws.planta ? ws.planta.map((p) => [...p] as [number, number]) : undefined,
        }
      : null;
    // Con planta poligonal: céntrala en el origen y deriva ancho/fondo del bbox
    // (los usan el techo con pendiente y el descarte rápido de límites).
    const planta = this.workspace?.planta;
    if (planta && planta.length >= 3) {
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (const [x, z] of planta) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
      }
      const cx = (minX + maxX) / 2;
      const cz = (minZ + maxZ) / 2;
      for (const p of planta) { p[0] -= cx; p[1] -= cz; }
      this.workspace!.ancho = maxX - minX;
      this.workspace!.fondo = maxZ - minZ;
    }
    this.rebuildWorkspaceVisual();
    if (this.workspace?.canvas === "completo" && opts.crearPiezas) {
      this.crearPiezasEntorno(this.workspace);
    }
    this.checkWorkspaceBounds();
    this.bus.emit("workspaceChanged", { workspace: this.workspace });
    this.requestRender();
  }

  /**
   * Contorno del suelo operable (cm, plano XZ). Con planta dibujada es ese
   * polígono; si no, el rectángulo ancho×fondo. Null si el canvas es libre.
   */
  private wsPlanta(): [number, number][] | null {
    const ws = this.workspace;
    if (!ws || ws.canvas !== "completo") return null;
    if (ws.planta && ws.planta.length >= 3) return ws.planta;
    if (!ws.ancho || !ws.fondo) return null;
    const hx = ws.ancho / 2;
    const hz = ws.fondo / 2;
    return [
      [-hx, -hz],
      [hx, -hz],
      [hx, hz],
      [-hx, hz],
    ];
  }

  /** ¿El punto XZ cae dentro de la planta (con tolerancia eps hacia fuera)? */
  private dentroPlanta(
    planta: [number, number][],
    x: number,
    z: number,
    eps: number,
  ): boolean {
    // Ray casting par-impar.
    let dentro = false;
    for (let i = 0, j = planta.length - 1; i < planta.length; j = i++) {
      const [xi, zi] = planta[i];
      const [xj, zj] = planta[j];
      if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) dentro = !dentro;
    }
    if (dentro || eps <= 0) return dentro;
    // Tolerancia: distancia mínima del punto a los bordes del polígono.
    for (let i = 0, j = planta.length - 1; i < planta.length; j = i++) {
      const [ax, az] = planta[j];
      const [bx, bz] = planta[i];
      const dx = bx - ax;
      const dz = bz - az;
      const l2 = dx * dx + dz * dz;
      const t = l2 > 0 ? THREE.MathUtils.clamp(((x - ax) * dx + (z - az) * dz) / l2, 0, 1) : 0;
      const px = ax + t * dx;
      const pz = az + t * dz;
      if (Math.hypot(x - px, z - pz) <= eps) return true;
    }
    return false;
  }

  /** Contorno + relleno translúcido del suelo operable (no se serializa). */
  private rebuildWorkspaceVisual(): void {
    if (this.workspaceVisual) {
      this.sceneManager.scene.remove(this.workspaceVisual);
      this.workspaceVisual.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        (m.material as THREE.Material | undefined)?.dispose?.();
      });
      this.workspaceVisual = null;
    }
    const planta = this.wsPlanta();
    if (!planta) return;
    const g = new THREE.Group();
    g.name = "workspace-area";
    const pts = planta.map(([x, z]) => new THREE.Vector3(x, 0.4, z));
    g.add(
      new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0x12808c }),
      ),
    );
    // Relleno: la forma se construye en XY y se tumba al plano XZ.
    const shape = new THREE.Shape(planta.map(([x, z]) => new THREE.Vector2(x, -z)));
    const fillGeo = new THREE.ShapeGeometry(shape);
    fillGeo.rotateX(-Math.PI / 2);
    const fill = new THREE.Mesh(
      fillGeo,
      new THREE.MeshBasicMaterial({
        color: 0x12808c,
        transparent: true,
        opacity: 0.07,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    fill.position.y = 0.15;
    g.add(fill);
    this.sceneManager.scene.add(g);
    this.workspaceVisual = g;
  }

  private static readonly GROSOR_ENTORNO = 6;

  /** Bloque del techo: copia fiel de la planta extruida (grosor en Y). */
  private geometriaTecho(): THREE.BufferGeometry | null {
    const planta = this.wsPlanta();
    if (!planta) return null;
    const shape = new THREE.Shape(planta.map(([x, z]) => new THREE.Vector2(x, -z)));
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: Editor.GROSOR_ENTORNO,
      bevelEnabled: false,
    });
    geo.rotateX(-Math.PI / 2); // extrusión vertical: planta en XZ, grosor en +Y
    geo.center(); // pivote en el centro del bloque (colocación e inclinación)
    geo.computeVertexNormals();
    return geo;
  }

  /**
   * Crea la pieza "Techo" (componentId ws-techo): geometría propia regenerable
   * desde el workspace, anclada y anclable como cualquier otra pieza.
   */
  private crearTechoBase(): SceneObject {
    const geo = this.geometriaTecho();
    const ws = this.workspace;
    if (!geo || !ws) throw new Error("Sin planta de suelo para el techo");
    const obj = new SceneObject({
      name: "Techo",
      componentId: "ws-techo",
      category: "estructural",
      params: {
        kind: "box",
        width: ws.ancho ?? 100,
        height: Editor.GROSOR_ENTORNO,
        depth: ws.fondo ?? 100,
      },
      physics: { massKg: 0, fixed: true },
      materialId: "acero-negro",
    });
    obj.mesh.geometry.dispose();
    obj.mesh.geometry = geo;
    obj.customModel = true; // geometría propia: params no la reconstruye
    obj.mesh.name = "Techo";
    this.sceneManager.content.add(obj.mesh);
    this.objects.set(obj.id, obj);
    this.bus.emit("objectsChanged", { objects: this.listObjects() });
    return obj;
  }

  /** Crea techo y paredes como piezas ancladas reales del canvas completo. */
  private crearPiezasEntorno(ws: WorkspaceData): void {
    const planta = this.wsPlanta();
    if (!planta) return;
    const GROSOR = Editor.GROSOR_ENTORNO;
    const t = ws.techo;

    if (t) {
      const techo = this.crearTechoBase();
      const dh = t.alturaB - t.alturaA;
      const L = (t.eje === "x" ? ws.ancho : ws.fondo) || 1;
      const ang = Math.atan2(dh, L);
      // La pendiente sube hacia el extremo B (+X o +Z según el eje elegido).
      if (t.eje === "x") techo.mesh.rotation.z = ang;
      else techo.mesh.rotation.x = -ang;
      techo.mesh.position.set(0, (t.alturaA + t.alturaB) / 2 + GROSOR / 2, 0);
    }

    // Paredes: una por cada borde de la planta cuya orientación exterior
    // coincida con un lado marcado (N=+Z, S=−Z, E=+X, O=−X).
    const lados = new Set(ws.paredes ?? []);
    if (lados.size > 0) {
      const usados = new Map<string, number>();
      const NOMBRES: Record<"N" | "S" | "E" | "O", string> = {
        N: "Norte",
        S: "Sur",
        E: "Este",
        O: "Oeste",
      };
      for (let i = 0; i < planta.length; i++) {
        const a = planta[i];
        const b = planta[(i + 1) % planta.length];
        const dx = b[0] - a[0];
        const dz = b[1] - a[1];
        const len = Math.hypot(dx, dz);
        if (len < 20) continue; // bordes minúsculos: sin pared
        // Normal exterior del borde (comprobada contra la propia planta).
        let nx = dz / len;
        let nz = -dx / len;
        const mx = (a[0] + b[0]) / 2;
        const mz = (a[1] + b[1]) / 2;
        if (this.dentroPlanta(planta, mx + nx * 2, mz + nz * 2, 0)) {
          nx = -nx;
          nz = -nz;
        }
        const lado: "N" | "S" | "E" | "O" =
          Math.abs(nx) >= Math.abs(nz) ? (nx > 0 ? "E" : "O") : (nz > 0 ? "N" : "S");
        if (!lados.has(lado)) continue;

        const h = t
          ? Math.max(
              50,
              Math.min(this.techoYAt(a[0], a[1]), this.techoYAt(b[0], b[1])),
            )
          : 250;
        const n = (usados.get(lado) ?? 0) + 1;
        usados.set(lado, n);
        const nombre = `Pared ${NOMBRES[lado]}${n > 1 ? ` ${n}` : ""}`;
        const pos = new THREE.Vector3(
          mx - (nx * GROSOR) / 2,
          h / 2,
          mz - (nz * GROSOR) / 2,
        );
        const o = this.addComponent("prim-box", pos);
        o.name = nombre;
        o.mesh.name = nombre;
        o.params = { kind: "box", width: len, height: h, depth: GROSOR };
        o.physics = { massKg: 0, fixed: true };
        o.rebuildGeometry();
        o.setMaterial("acero-negro");
        o.mesh.position.copy(pos);
        o.mesh.rotation.y = Math.atan2(-dz, dx);
      }
    }
    this.select(null);
  }

  /** Techo y paredes generados: forman el espacio, no se validan contra él. */
  private esPiezaEntorno(o: SceneObject): boolean {
    return (
      o.componentId.startsWith("ws-") ||
      o.name === "Techo" ||
      o.name.startsWith("Pared ")
    );
  }

  /** Altura del plano del techo (con pendiente) en un punto del suelo. */
  private techoYAt(x: number, z: number): number {
    const ws = this.workspace;
    if (!ws?.techo || !ws.ancho || !ws.fondo) return Infinity;
    const t = ws.techo;
    const L = t.eje === "x" ? ws.ancho : ws.fondo;
    const c = t.eje === "x" ? x : z;
    const f = THREE.MathUtils.clamp((c + L / 2) / L, 0, 1);
    return t.alturaA + (t.alturaB - t.alturaA) * f;
  }

  /** Marca en rojo las piezas que sobresalen del área/techo del canvas completo. */
  private checkWorkspaceBounds(): void {
    const ws = this.workspace;
    const planta = this.wsPlanta();
    const antes = this.fueraIds.size;
    const nuevas = new Set<string>();
    if (ws && planta) {
      const EPS = 0.5;
      const box = new THREE.Box3();
      for (const o of this.objects.values()) {
        if (this.esPiezaEntorno(o)) continue;
        box.setFromObject(o.mesh);
        if (box.isEmpty()) continue;
        // Las cuatro esquinas XZ del bbox deben caer dentro de la planta.
        let fuera =
          box.min.y < -EPS ||
          !this.dentroPlanta(planta, box.min.x, box.min.z, EPS) ||
          !this.dentroPlanta(planta, box.min.x, box.max.z, EPS) ||
          !this.dentroPlanta(planta, box.max.x, box.min.z, EPS) ||
          !this.dentroPlanta(planta, box.max.x, box.max.z, EPS);
        if (!fuera && ws.techo) {
          const tope = Math.min(
            this.techoYAt(box.min.x, box.min.z),
            this.techoYAt(box.max.x, box.max.z),
          );
          fuera = box.max.y > tope + EPS;
        }
        if (fuera) nuevas.add(o.id);
      }
    }
    const cambiadas = new Set<string>();
    for (const id of this.fueraIds) if (!nuevas.has(id)) cambiadas.add(id);
    for (const id of nuevas) if (!this.fueraIds.has(id)) cambiadas.add(id);
    this.fueraIds = nuevas;
    for (const id of cambiadas) {
      const o = this.objects.get(id);
      if (!o) continue;
      const enGrupo = this.selectedGroupId
        ? (this.groups.get(this.selectedGroupId)?.ids.includes(id) ?? false)
        : false;
      this.setHighlight(o, this.multiSel.has(id) || enGrupo);
    }
    if (antes !== nuevas.size || cambiadas.size > 0) {
      this.bus.emit("workspaceBounds", { fuera: nuevas.size });
      this.requestRender();
    }
  }

  /** Ids de las piezas afectadas por el arrastre actual del gizmo. */
  private gizmoAffectedIds(): string[] {
    if (!this.gizmo.object) return [];
    if (this.gizmo.object === this.groupProxy) {
      if (this.multiSel.size > 0) return [...this.multiSel];
      if (this.selectedGroupId) return [...(this.groups.get(this.selectedGroupId)?.ids ?? [])];
      return [];
    }
    if (this.selected && this.gizmo.object === this.selected.mesh) return [this.selected.id];
    return [];
  }

  /** Antes de un arrastre del gizmo: guarda dónde estaba cada pieza afectada. */
  private captureBoundsRestore(): void {
    this.boundsRestore = null;
    if (this.workspace?.canvas !== "completo") return;
    const map = new Map<string, SavedTransform>();
    for (const id of this.gizmoAffectedIds()) {
      const o = this.objects.get(id);
      if (o && !this.esPiezaEntorno(o)) {
        map.set(id, {
          position: o.mesh.position.clone(),
          quaternion: o.mesh.quaternion.clone(),
          scale: o.mesh.scale.clone(),
        });
      }
    }
    if (map.size > 0) this.boundsRestore = map;
  }

  /**
   * Al soltar un arrastre: si alguna pieza movida quedó fuera del espacio
   * editable, la colocación se cancela y todo vuelve a su posición anterior.
   */
  private enforceWorkspaceBounds(): void {
    const restore = this.boundsRestore;
    this.boundsRestore = null;
    if (!restore) return;
    this.checkWorkspaceBounds();
    const invadidas = [...restore.keys()].some((id) => this.fueraIds.has(id));
    if (!invadidas) return;
    for (const [id, s] of restore) {
      const o = this.objects.get(id);
      if (!o) continue;
      o.mesh.position.copy(s.position);
      o.mesh.quaternion.copy(s.quaternion);
      o.mesh.scale.copy(s.scale);
      this.bus.emit("objectTransformed", { object: o });
    }
    // Recoloca el proxy del grupo/multiselección para no arrastrar deltas falsos.
    if (this.gizmo.object === this.groupProxy) {
      if (this.multiSel.size > 0) this.refreshMultiGizmo();
      else if (this.selectedGroupId) this.selectGroup(this.selectedGroupId);
    }
    this.checkWorkspaceBounds();
    this.avisoFuera();
    this.requestRender();
  }

  /** Aviso temporal en el HUD al cancelar una colocación fuera del área. */
  private avisoFuera(): void {
    this.avisoTemporal("⛔ Fuera del área de trabajo: colocación cancelada");
  }

  // ---------------------------------------------------- guardar / cargar
  /** Serializa toda la escena a un objeto JSON. */
  serialize(): ProjectData {
    const v3 = (v: THREE.Vector3): [number, number, number] => [v.x, v.y, v.z];
    const q4 = (q: THREE.Quaternion): [number, number, number, number] => [q.x, q.y, q.z, q.w];
    return {
      version: PROJECT_VERSION,
      workspace: this.workspace ?? undefined,
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
        locks: [...this.jointLocks],
        symmetry: this.poseSymmetry,
      },
    };
  }

  /** Exporta el prototipo (las piezas) como GLB binario para otras apps. */
  exportGLB(): Promise<ArrayBuffer> {
    // Las aristas del modo Ver son ayudas visuales: fuera del GLB.
    const teniaAristas = this.edgesOn;
    if (teniaAristas) {
      this.edgesOn = false;
      this.applyViewModes();
    }
    const exporter = new GLTFExporter();
    return new Promise<ArrayBuffer>((resolve, reject) => {
      exporter.parse(
        this.sceneManager.content,
        (result) => resolve(result as ArrayBuffer),
        (err) => reject(err),
        { binary: true },
      );
    }).finally(() => {
      if (teniaAristas) {
        this.edgesOn = true;
        this.applyViewModes();
        this.requestRender();
      }
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
    this.jointLocks.clear();
    this.poseSymmetry = false;
    this.grabDrag = null;
    this.setWorkspace(null);
    this.refreshJointHelpers();
    this.bus.emit("objectsChanged", { objects: [] });
    this.bus.emit("jointsChanged", { joints: [] });
    this.bus.emit("cablesChanged", { cables: [] });
    // Al deshacer/rehacer, clearScene forma parte de la carga interna y no
    // debe tocar la pila del historial.
    if (!this.applyingHistory) this.resetHistory();
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
    if (this.viewModesTimer !== null) clearTimeout(this.viewModesTimer);
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
    this.workspace = null;
    this.rebuildWorkspaceVisual();
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
    this.clearRopeTemplates();
    for (const o of this.objects.values()) o.dispose();
    this.objects.clear();
    this.physics?.dispose();
    this.sceneManager.dispose();
  }

  private async loadProjectInner(data: ProjectData): Promise<void> {
    this.clearScene();
    // Las piezas de entorno (techo/paredes) ya vienen en data.objects.
    this.setWorkspace(data.workspace ?? null);
    const idMap = new Map<string, string>();

    for (const od of data.objects) {
      // Un componente desconocido (proyecto de otra versión, JSON editado) no
      // debe abortar la carga del resto de la escena.
      try {
        // El techo del canvas completo regenera su geometría desde el workspace.
        const obj =
          od.componentId === "ws-techo" ? this.crearTechoBase() : this.addComponent(od.componentId);
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

    // Ergonomía del maniquí: candados y simetría persistidos.
    this.jointLocks = new Set(data.human?.locks ?? []);
    this.poseSymmetry = !!data.human?.symmetry;

    if (data.human?.present) {
      this.humanMode = "mannequin"; // el modo esqueleto se retiró en 0.1.7
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
      this.humanMode = "mannequin"; // el modo esqueleto se retiró en 0.1.7
    }

    this.bus.emit("objectsChanged", { objects: this.listObjects() });
    if (!this.applyingHistory) this.resetHistory();
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
    this.bus.emit("jointSelectionChanged", { name: null, angles: [0, 0, 0], locked: false });
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

  // ------------------------------------------ selección de área (marquee)

  setAreaSelect(on: boolean): void {
    this.areaSelect = on;
    if (!on) this.cancelMarquee();
    else if (this.dragTool) this.setDragTool(false);
    this.bus.emit("areaSelectChanged", { on });
  }

  isAreaSelect(): boolean {
    return this.areaSelect;
  }

  private beginMarquee(e: PointerEvent): void {
    this.marquee = {
      x0: e.clientX,
      y0: e.clientY,
      x1: e.clientX,
      y1: e.clientY,
      additive: e.ctrlKey || e.metaKey || e.shiftKey,
    };
    this.orbit.enabled = false;
    const div = document.createElement("div");
    div.className = "marquee";
    document.body.appendChild(div);
    this.marqueeEl = div;
    this.updateMarquee(e);
  }

  private updateMarquee(e: PointerEvent): void {
    if (!this.marquee || !this.marqueeEl) return;
    this.marquee.x1 = e.clientX;
    this.marquee.y1 = e.clientY;
    const x = Math.min(this.marquee.x0, this.marquee.x1);
    const y = Math.min(this.marquee.y0, this.marquee.y1);
    const w = Math.abs(this.marquee.x1 - this.marquee.x0);
    const h = Math.abs(this.marquee.y1 - this.marquee.y0);
    Object.assign(this.marqueeEl.style, {
      left: `${x}px`,
      top: `${y}px`,
      width: `${w}px`,
      height: `${h}px`,
    });
  }

  /** Cierra el recuadro y selecciona todo lo que cae dentro. */
  private finishMarquee(): void {
    const m = this.marquee;
    this.cancelMarquee();
    if (!m) return;
    if (!m.additive) this.select(null); // limpia selección y multiselección
    const rect = this.canvas.getBoundingClientRect();
    const nx = (cx: number): number => ((cx - rect.left) / rect.width) * 2 - 1;
    const ny = (cy: number): number => -((cy - rect.top) / rect.height) * 2 + 1;
    const minX = Math.min(nx(m.x0), nx(m.x1));
    const maxX = Math.max(nx(m.x0), nx(m.x1));
    const minY = Math.min(ny(m.y0), ny(m.y1));
    const maxY = Math.max(ny(m.y0), ny(m.y1));
    const v = new THREE.Vector3();
    const inside: string[] = [];
    for (const o of this.objects.values()) {
      o.mesh.getWorldPosition(v).project(this.sceneManager.camera);
      if (v.z < 1 && v.x >= minX && v.x <= maxX && v.y >= minY && v.y <= maxY) {
        inside.push(o.id);
      }
    }
    // Un miembro dentro arrastra a todo su grupo (los grupos son unidades).
    const ids = new Set<string>(inside);
    for (const id of inside) {
      const gid = this.objGroup.get(id);
      if (gid) this.groups.get(gid)?.ids.forEach((i) => ids.add(i));
    }
    for (const id of ids) {
      const o = this.objects.get(id);
      if (!o || this.multiSel.has(id)) continue;
      this.multiSel.add(id);
      this.setHighlight(o, true);
    }
    this.refreshMultiGizmo(true);
    this.bus.emit("selectionChanged", { selected: null });
    this.bus.emit("groupingChanged", { multi: this.multiSel.size, groupSelected: false });
  }

  private cancelMarquee(): void {
    this.marqueeEl?.remove();
    this.marqueeEl = null;
    this.marquee = null;
    this.orbit.enabled = true;
  }

  // ------------------------------------ portapapeles (copiar/pegar/eliminar)

  /** Ids de la selección actual (pieza, multiselección o grupo). */
  getSelectionIds(): string[] {
    if (this.selected) return [this.selected.id];
    if (this.multiSel.size > 0) return [...this.multiSel];
    if (this.selectedGroupId) return [...(this.groups.get(this.selectedGroupId)?.ids ?? [])];
    return [];
  }

  /** Copia la selección al portapapeles interno (datos del proyecto). */
  copySelection(): void {
    const ids = this.getSelectionIds();
    if (ids.length === 0) return;
    const all = this.serialize().objects;
    this.clipboard = [];
    for (const id of ids) {
      const o = this.objects.get(id);
      const data = all.find((d) => d.id === id);
      if (!o || !data) continue;
      // Las piezas de entorno con geometría propia (techo de planta) se copian
      // clonando su malla, como las importadas.
      this.clipboard.push({
        data: JSON.parse(JSON.stringify(data)) as ProjectData["objects"][number],
        category: o.category,
        importedGeometry:
          o.imported || o.componentId.startsWith("ws-") ? o.mesh.geometry.clone() : null,
      });
    }
  }

  /** Pega el portapapeles con un pequeño desplazamiento y lo deja seleccionado. */
  pasteClipboard(): void {
    if (this.clipboard.length === 0) return;
    const offset = new THREE.Vector3(15, 0, 15);
    const created: string[] = [];
    for (const entry of this.clipboard) {
      const d = entry.data;
      let obj: SceneObject;
      if (entry.importedGeometry) {
        obj = new SceneObject({
          name: `${d.name} copia`,
          componentId: d.componentId,
          category: entry.category,
          params: { ...d.params },
          physics: { ...d.physics },
          materialId: d.materialId,
          importedGeometry: entry.importedGeometry.clone(),
        });
        this.sceneManager.content.add(obj.mesh);
        this.objects.set(obj.id, obj);
      } else {
        obj = this.addComponent(d.componentId);
        obj.params = {
          ...d.params,
          path: d.params.path?.map((n) => [...n] as [number, number, number]),
        };
        obj.rebuildGeometry();
      }
      obj.setMaterial(d.materialId);
      obj.physics = { ...d.physics };
      obj.mesh.position.fromArray(d.position).add(offset);
      obj.mesh.quaternion.fromArray(d.quaternion);
      if (d.scale) obj.mesh.scale.fromArray(d.scale);
      created.push(obj.id);
    }
    // Deja lo pegado como selección activa (listo para mover en bloque).
    this.select(null);
    for (const id of created) {
      const o = this.objects.get(id);
      if (o) {
        this.multiSel.add(id);
        this.setHighlight(o, true);
      }
    }
    this.refreshMultiGizmo(true);
    this.bus.emit("objectsChanged", { objects: this.listObjects() });
    this.bus.emit("groupingChanged", { multi: this.multiSel.size, groupSelected: false });
    this.scheduleAutosave();
  }

  /** Elimina la selección actual: pieza, multiselección, grupo o cuerda. */
  deleteSelection(): void {
    if (this.selected) {
      this.removeObject(this.selected);
      return;
    }
    if (this.multiSel.size > 0) {
      for (const id of [...this.multiSel]) {
        const o = this.objects.get(id);
        if (o) this.removeObject(o);
      }
      this.gizmo.detach();
      this.bus.emit("groupingChanged", { multi: 0, groupSelected: false });
      return;
    }
    if (this.selectedGroupId) {
      this.deleteSelectedGroup();
      return;
    }
    if (this.selectedRopeId) this.deleteRope(this.selectedRopeId);
  }

  // -------------------------------------------------- deshacer / rehacer

  /** Instantánea diferida del proyecto tras cada cambio (para deshacer). */
  private historyPush(): void {
    if (this.applyingHistory || this.simulating || this.autosaveSuspended) return;
    if (this.historyTimer !== null) clearTimeout(this.historyTimer);
    this.historyTimer = setTimeout(() => {
      this.historyTimer = null;
      this.historyCommit();
    }, 300);
  }

  private historyCommit(): void {
    if (this.applyingHistory || this.simulating) return;
    const snap = JSON.stringify(this.serialize());
    if (snap === this.history[this.hIndex]) return;
    this.history.splice(this.hIndex + 1);
    this.history.push(snap);
    if (this.history.length > 60) this.history.shift();
    this.hIndex = this.history.length - 1;
    this.emitHistory();
  }

  /** Reinicia el historial con el estado actual como punto de partida. */
  private resetHistory(): void {
    if (this.historyTimer !== null) {
      clearTimeout(this.historyTimer);
      this.historyTimer = null;
    }
    this.history = [JSON.stringify(this.serialize())];
    this.hIndex = 0;
    this.emitHistory();
  }

  private emitHistory(): void {
    this.bus.emit("historyChanged", {
      canUndo: this.hIndex > 0,
      canRedo: this.hIndex < this.history.length - 1,
    });
  }

  async undo(): Promise<void> {
    if (this.simulating) return;
    // Si hay una instantánea pendiente de confirmar, ciérrala primero.
    if (this.historyTimer !== null) {
      clearTimeout(this.historyTimer);
      this.historyTimer = null;
      this.historyCommit();
    }
    if (this.hIndex <= 0) return;
    this.hIndex--;
    await this.applyHistory();
  }

  async redo(): Promise<void> {
    if (this.simulating || this.hIndex >= this.history.length - 1) return;
    this.hIndex++;
    await this.applyHistory();
  }

  private async applyHistory(): Promise<void> {
    this.applyingHistory = true;
    try {
      await this.loadProjectInner(JSON.parse(this.history[this.hIndex]) as ProjectData);
    } finally {
      this.applyingHistory = false;
    }
    this.emitHistory();
    this.scheduleAutosave();
    this.requestRender();
  }

  private setHighlight(obj: SceneObject, on: boolean): void {
    const m = obj.mesh.material as THREE.MeshStandardMaterial;
    if (!m || !m.emissive) return;
    // El rojo de error (fuera del espacio editable) prevalece sobre la selección.
    if (this.fueraIds.has(obj.id)) m.emissive.setHex(0x9c1c1c);
    else m.emissive.setHex(on ? 0x14406a : 0x000000);
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
    this.refreshMultiGizmo(true);
    this.bus.emit("selectionChanged", { selected: null });
    this.bus.emit("groupingChanged", { multi: this.multiSel.size, groupSelected: false });
  }

  /** Añade/quita TODO un grupo a la multiselección (Ctrl+clic sobre un miembro). */
  private toggleMultiGroup(gid: string): void {
    const g = this.groups.get(gid);
    if (!g) return;
    this.clearGroupHighlight();
    this.selected = null;
    this.selectedFigure = false;
    this.selectedGroupId = null;
    const allIn = g.ids.every((id) => this.multiSel.has(id));
    for (const id of g.ids) {
      const o = this.objects.get(id);
      if (!o) continue;
      if (allIn) {
        this.multiSel.delete(id);
        this.setHighlight(o, false);
      } else {
        this.multiSel.add(id);
        this.setHighlight(o, true);
      }
    }
    this.refreshMultiGizmo(true);
    this.bus.emit("selectionChanged", { selected: null });
    this.bus.emit("groupingChanged", { multi: this.multiSel.size, groupSelected: false });
  }

  /**
   * Coloca el gizmo en el centroide de la multiselección para mover/rotar el
   * conjunto en bloque (mismo mecanismo de proxy que los grupos).
   */
  private refreshMultiGizmo(attachFresh = false): void {
    if (this.multiSel.size === 0) {
      if (this.gizmo.object === this.groupProxy) this.gizmo.detach();
      return;
    }
    const centroid = new THREE.Vector3();
    let n = 0;
    for (const id of this.multiSel) {
      const o = this.objects.get(id);
      if (o) {
        centroid.add(o.mesh.position);
        n++;
      }
    }
    if (n === 0) return;
    centroid.multiplyScalar(1 / n);
    this.groupProxy.position.copy(centroid);
    this.groupProxy.quaternion.identity();
    this.groupProxy.scale.set(1, 1, 1);
    this.groupProxy.updateMatrixWorld(true);
    this.groupPrev.copy(this.groupProxy.matrixWorld);
    this.resetGizmoAxes();
    this.gizmo.attach(this.groupProxy);
    if (attachFresh && this.gizmo.getMode() === "scale") this.setMode("translate");
  }

  /** Aplica el delta del proxy a todos los objetos de la multiselección. */
  private applyMultiDelta(): void {
    this.groupProxy.updateMatrixWorld(true);
    const cur = this.groupProxy.matrixWorld;
    const delta = cur.clone().multiply(this.groupPrev.clone().invert());
    for (const id of this.multiSel) {
      const o = this.objects.get(id);
      if (!o) continue;
      const m = new THREE.Matrix4().compose(o.mesh.position, o.mesh.quaternion, o.mesh.scale);
      m.premultiply(delta);
      m.decompose(o.mesh.position, o.mesh.quaternion, o.mesh.scale);
      this.updateRopesForObject(o.id);
    }
    this.cablesDirty = true;
    this.groupPrev.copy(cur);
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
    this.bus.emit("jointSelectionChanged", { name: null, angles: [0, 0, 0], locked: false });
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
    // Con eje bloqueado no se aplica el imán: corregiría la posición fuera
    // del eje (y en Y lo anulaba por completo contra el suelo).
    if (this.axisLock) return;
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
    const figure: THREE.Group = buildHumanFigure(heightCm, figureSegments.provider);

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
    if (this.jointLocks.has(name)) {
      // Bloqueada con el candado: se selecciona (para poder liberarla desde
      // Posturas) pero no se posa.
      this.gizmo.detach();
      this.avisoTemporal("🔒 Articulación bloqueada — libérala en Posturas");
    } else {
      this.gizmo.attach(joints[name]);
      // Posar sobre los ejes locales de la articulación y solo los naturales.
      this.gizmo.setSpace("local");
      const dof = JOINT_DOF[name] ?? { x: undefined, y: undefined, z: undefined };
      this.gizmo.showX = dof.x !== undefined;
      this.gizmo.showY = dof.y !== undefined;
      this.gizmo.showZ = dof.z !== undefined;
      this.setMode("rotate"); // posar = rotar la articulacion
    }
    this.emitJointSelection();
  }

  // ------------------------------------ ergonomía del maniquí (v0.2.0)

  isJointLocked(name: string): boolean {
    return this.jointLocks.has(name);
  }

  getJointLocks(): string[] {
    return [...this.jointLocks];
  }

  /** Bloquea/libera la articulación (la seleccionada si no se indica). */
  toggleJointLock(name?: string): void {
    const jn = name ?? this.selectedJointName;
    if (!jn) return;
    if (this.jointLocks.has(jn)) this.jointLocks.delete(jn);
    else this.jointLocks.add(jn);
    // Reengancha (o suelta) el gizmo según el nuevo estado del candado.
    if (this.selectedJointName === jn) this.selectJoint(jn);
    else this.emitJointSelection();
    this.scheduleAutosave();
  }

  getPoseSymmetry(): boolean {
    return this.poseSymmetry;
  }

  /** Simetría L↔R: replicar cada cambio de pose espejado al otro lado. */
  setPoseSymmetry(on: boolean): void {
    this.poseSymmetry = on;
    this.scheduleAutosave();
  }

  isGrabFigure(): boolean {
    return this.grabFigureTool;
  }

  /** Herramienta "agarrar maniquí" (mover segmentos libremente o por eje). */
  setGrabFigure(on: boolean): void {
    this.grabFigureTool = on;
    if (on) {
      this.setDragTool(false);
      this.setAreaSelect(false);
    }
    this.bus.emit("grabFigureChanged", { on });
  }

  /** Contraparte espejada de una articulación (shoulderL ↔ shoulderR). */
  private mirrorJointName(jn: string): string | null {
    if (jn.endsWith("L")) return `${jn.slice(0, -1)}R`;
    if (jn.endsWith("R")) return `${jn.slice(0, -1)}L`;
    return null;
  }

  /** Con simetría activa, replica la pose de jn espejada en su contraparte. */
  private applyPoseSymmetry(jn: string): void {
    if (!this.poseSymmetry) return;
    const joints = this.figureJoints();
    const otro = this.mirrorJointName(jn);
    if (!joints || !otro || !joints[otro] || !joints[jn]) return;
    if (this.jointLocks.has(otro)) return; // el candado manda
    const r = joints[jn].rotation;
    joints[otro].rotation.set(r.x, -r.y, -r.z);
    this.clampJoint(otro);
  }

  /** Aviso breve en el HUD (se borra solo). */
  private avisoTemporal(text: string): void {
    this.bus.emit("dragMeasure", { text });
    window.setTimeout(() => this.bus.emit("dragMeasure", { text: null }), 1800);
  }

  /** Restaura los tres ejes del gizmo (para piezas/grupos/figura completa). */
  private resetGizmoAxes(): void {
    // Con eje bloqueado, el gizmo solo ofrece el asa de ese eje (edición
    // precisa: se construye en 3D mirando una pantalla 2D).
    this.gizmo.showX = this.axisLock === null || this.axisLock === "x";
    this.gizmo.showY = this.axisLock === null || this.axisLock === "y";
    this.gizmo.showZ = this.axisLock === null || this.axisLock === "z";
  }

  // ------------------------------------------------ eje de trabajo (1/2/3)

  /** Bloquea el trazado al eje dado; repetir el mismo eje lo libera. */
  setAxisLock(axis: "x" | "y" | "z" | null): void {
    this.axisLock = this.axisLock === axis ? null : axis;
    this.resetGizmoAxes();
    this.bus.emit("axisLockChanged", { axis: this.axisLock });
  }

  getAxisLock(): "x" | "y" | "z" | null {
    return this.axisLock;
  }

  private axisVec(): THREE.Vector3 | null {
    if (this.axisLock === "x") return new THREE.Vector3(1, 0, 0);
    if (this.axisLock === "y") return new THREE.Vector3(0, 1, 0);
    if (this.axisLock === "z") return new THREE.Vector3(0, 0, 1);
    return null;
  }

  /**
   * Punto de arrastre bajo el puntero: si hay eje bloqueado, el punto de la
   * recta (origin + t·eje) más cercano al rayo del puntero; si no, la
   * intersección con el plano dado. Devuelve false si no hay solución.
   */
  private dragPoint(origin: THREE.Vector3, plane: THREE.Plane, out: THREE.Vector3): boolean {
    const axis = this.axisVec();
    if (axis) {
      const ray = this.raycaster.ray;
      const w0 = new THREE.Vector3().subVectors(origin, ray.origin);
      const b = axis.dot(ray.direction);
      const d = axis.dot(w0);
      const e = ray.direction.dot(w0);
      const denom = 1 - b * b; // axis y direction son unitarios
      if (Math.abs(denom) < 1e-6) return false;
      const t = (b * e - d) / denom;
      out.copy(origin).addScaledVector(axis, t);
      return true;
    }
    return this.raycaster.ray.intersectPlane(plane, out) !== null;
  }

  /**
   * Punto del trazado con eje bloqueado: el punto de la recta (a + t·eje) más
   * cercano al rayo del puntero. No necesita tocar suelo ni superficies, así
   * el eje Y funciona apuntando "al cielo".
   */
  private lockedLinePoint(a: THREE.Vector3): THREE.Vector3 | null {
    const p = new THREE.Vector3();
    const unused = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    return this.dragPoint(a, unused, p) ? p : null;
  }

  /** Publica el contador de desplazamiento (por eje si hay bloqueo). */
  private emitDragMeasure(d: THREE.Vector3): void {
    const text = this.axisLock
      ? `Δ${this.axisLock.toUpperCase()} = ${formatCm(d[this.axisLock])}`
      : `Δ = ${formatCm(d.length())}  (X ${formatCm(d.x)} · Y ${formatCm(d.y)} · Z ${formatCm(d.z)})`;
    this.bus.emit("dragMeasure", { text });
  }

  // -------------------------------------------- herramienta de arrastre

  setDragTool(on: boolean): void {
    this.dragTool = on;
    if (on) this.setAreaSelect(false);
    this.bus.emit("dragToolChanged", { on });
  }

  isDragTool(): boolean {
    return this.dragTool;
  }

  /** Limita una articulación a su eje/rango natural. */
  private clampJoint(jn: string): void {
    const joints = this.figureJoints();
    if (!joints || !joints[jn]) return;
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

  /** Limita la articulación seleccionada y aplica la simetría si procede. */
  private clampSelectedJoint(): void {
    const jn = this.selectedJointName;
    if (!jn) return;
    this.clampJoint(jn);
    this.applyPoseSymmetry(jn);
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
      locked: !!jn && this.jointLocks.has(jn),
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
    if (this.jointLocks.has(jn)) {
      this.avisoTemporal("🔒 Articulación bloqueada — libérala en Posturas");
      this.emitJointSelection();
      return;
    }
    // Respeta el rango natural del eje (y bloquea los ejes no articulables).
    const lim = JOINT_DOF[jn]?.[axis];
    const value = lim ? Math.max(lim[0], Math.min(lim[1], deg)) : 0;
    joints[jn].rotation[axis] = degToRad(value);
    this.applyPoseSymmetry(jn);
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
    this.bus.emit("dragMeasure", { text: null });
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
    if (this.marquee) {
      this.updateMarquee(event);
      return;
    }
    if (this.dragMove) {
      const rect = this.canvas.getBoundingClientRect();
      this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.pointer, this.sceneManager.camera);
      const cur = new THREE.Vector3();
      if (!this.dragPoint(this.dragMove.grabbed, this.dragMove.plane, cur)) return;
      const delta = cur.sub(this.dragMove.grabbed);
      this.emitDragMeasure(delta);
      for (const id of this.dragMove.ids) {
        const o = this.objects.get(id);
        const start = this.dragMove.starts.get(id);
        if (!o || !start) continue;
        o.mesh.position.copy(start).add(delta);
        this.updateRopesForObject(o.id);
        this.bus.emit("objectTransformed", { object: o });
      }
      this.cablesDirty = true;
      return;
    }
    // Agarre del maniquí: la articulación rota para que el punto agarrado siga
    // al puntero (o la figura entera se traslada si se agarró la pelvis).
    if (this.grabDrag) {
      const rect = this.canvas.getBoundingClientRect();
      this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.pointer, this.sceneManager.camera);
      const target = new THREE.Vector3();
      if (!this.dragPoint(this.grabDrag.origin, this.grabDrag.plane, target)) return;
      if (this.grabDrag.joint === "") {
        this.humanFigure?.position.copy(target.clone().add(this.grabDrag.grabLocal));
        this.bus.emit("dragMeasure", { text: "✋ Figura completa" });
        this.requestRender();
        return;
      }
      const joints = this.figureJoints();
      const j = joints?.[this.grabDrag.joint];
      if (!j || !j.parent) return;
      j.updateMatrixWorld(true);
      const pivot = j.getWorldPosition(new THREE.Vector3());
      const grabWorld = j.localToWorld(this.grabDrag.grabLocal.clone());
      const v1 = grabWorld.sub(pivot);
      const v2 = target.clone().sub(pivot);
      if (v1.lengthSq() < 1e-4 || v2.lengthSq() < 1e-4) return;
      const q = new THREE.Quaternion().setFromUnitVectors(v1.normalize(), v2.normalize());
      const pq = j.parent.getWorldQuaternion(new THREE.Quaternion());
      const lq = pq.clone().invert().multiply(q).multiply(pq);
      j.quaternion.premultiply(lq);
      this.clampJoint(this.grabDrag.joint);
      this.applyPoseSymmetry(this.grabDrag.joint);
      this.emitJointSelection();
      this.bus.emit("dragMeasure", { text: `✋ ${this.grabDrag.joint}` });
      this.requestRender();
      return;
    }
    const simInteract = this.simulating && (this.simDrag !== null || this.figureDrag !== null);
    if (
      (this.simulating && !simInteract) ||
      (!this.simulating && !this.cableMode && !this.ropeMode && !this.lineMode && !this.bendDrag)
    ) {
      return;
    }
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.sceneManager.camera);

    // Arrastres de simulación: mano interactiva y posicionamiento del maniquí.
    if (simInteract) {
      const at = new THREE.Vector3();
      if (this.simDrag && this.raycaster.ray.intersectPlane(this.simDrag.plane, at)) {
        this.physics?.dragTo(at);
      } else if (this.figureDrag && this.humanFigure &&
        this.raycaster.ray.intersectPlane(this.figureDrag.plane, at)) {
        this.humanFigure.position.copy(at.add(this.figureDrag.offset));
      }
      return;
    }

    // Arrastre de un nodo de doblado: mueve el nodo en el plano de cámara y
    // reconstruye la pieza en vivo (curva Catmull-Rom por los nodos).
    if (this.bendDrag && this.bendTarget) {
      const hit = new THREE.Vector3();
      if (!this.dragPoint(this.bendDrag.origin, this.bendDrag.plane, hit)) return;
      this.emitDragMeasure(hit.clone().sub(this.bendDrag.origin));
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
      let point: THREE.Vector3 | null = pick?.point ?? null;
      if (this.axisLock && this.linePendingA) point = this.lockedLinePoint(this.linePendingA);
      if (!point) {
        this.clearPlacementPreview();
        this.bus.emit("dragMeasure", { text: null });
        return;
      }
      if (pick?.snapped && !this.axisLock) this.snap.showIndicator(pick.point);
      else this.snap.hideIndicator();
      if (this.linePendingA) {
        this.showPlacementLine(this.linePendingA, point);
        this.bus.emit("dragMeasure", {
          text: `Longitud: ${formatCm(this.linePendingA.distanceTo(point))}`,
        });
      } else if (this.placementLine) this.placementLine.visible = false;
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

  /**
   * Plantilla de segmento memoizada por tipo de cuerda: la referencia estable
   * permite a Rope.rebuild detectar si de verdad cambió (y no reconstruir su
   * geometría unitaria en cada arrastre). Se invalida al cambiar la biblioteca.
   */
  private ropeTemplates = new Map<RopeKind, THREE.BufferGeometry | null>();

  private ropeSegTemplate(kind: RopeKind): THREE.BufferGeometry | null {
    if (!this.ropeTemplates.has(kind)) {
      this.ropeTemplates.set(
        kind,
        componentModels.geometryClone(kind === "chain" ? "cadena-eslabones" : "liston-kevlar"),
      );
    }
    return this.ropeTemplates.get(kind)!;
  }

  private clearRopeTemplates(): void {
    for (const g of this.ropeTemplates.values()) g?.dispose();
    this.ropeTemplates.clear();
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

  // -------------------------------------- herramientas de simulación
  /** Arrastre de mano activo (plano de arrastre frente a la cámara). */
  private simDrag: { plane: THREE.Plane } | null = null;
  /** Arrastre del maniquí (plano horizontal + offset al punto de agarre). */
  private figureDrag: { plane: THREE.Plane; offset: THREE.Vector3 } | null = null;

  /**
   * Clic durante la simulación: si toca una pieza dinámica, la AGARRA con la
   * mano interactiva (resorte físico, como una persona tirando de un agarre);
   * si toca el maniquí, lo desliza por el suelo para situarlo.
   */
  private beginSimInteraction(): void {
    const hits = this.raycaster.intersectObjects(this.sceneManager.content.children, false);
    const hit = hits[0];
    const id = hit?.object.userData.sceneObjectId as string | undefined;
    const obj = id ? this.objects.get(id) : undefined;
    if (obj && hit && this.physics?.grab(obj.id, hit.point)) {
      const normal = this.sceneManager.camera.getWorldDirection(new THREE.Vector3());
      this.simDrag = {
        plane: new THREE.Plane().setFromNormalAndCoplanarPoint(normal, hit.point),
      };
      this.orbit.enabled = false;
      return;
    }
    if (this.humanFigure) {
      const fHits = this.raycaster.intersectObjects([this.humanFigure], true);
      if (fHits[0]) {
        const p = this.humanFigure.position;
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -p.y);
        const at = new THREE.Vector3();
        if (this.raycaster.ray.intersectPlane(plane, at)) {
          this.figureDrag = { plane, offset: p.clone().sub(at) };
          this.orbit.enabled = false;
        }
      }
    }
  }

  /** Termina los arrastres de simulación (mano y maniquí). */
  private endSimInteraction(): void {
    if (this.simDrag) this.physics?.release();
    if (this.simDrag || this.figureDrag) this.orbit.enabled = true;
    this.simDrag = null;
    this.figureDrag = null;
  }

  /** Vistas predefinidas para presentar el proyecto en simulación. */
  setViewPreset(view: "frontal" | "lateral" | "superior" | "isometrica"): void {
    // Encuadra el contenido (piezas + figura) con un margen cómodo.
    const box = new THREE.Box3();
    if (this.objects.size > 0) box.setFromObject(this.sceneManager.content);
    if (this.humanFigure) box.expandByObject(this.humanFigure);
    if (box.isEmpty()) box.set(new THREE.Vector3(-100, 0, -100), new THREE.Vector3(100, 200, 100));
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();
    const cam = this.sceneManager.camera;
    const dist = Math.max(80, (size / 2) / Math.tan((cam.fov * Math.PI) / 360) * 1.25);
    const dirs = {
      frontal: new THREE.Vector3(0, 0.18, 1),
      lateral: new THREE.Vector3(1, 0.18, 0),
      superior: new THREE.Vector3(0.001, 1, 0.001),
      isometrica: new THREE.Vector3(1, 0.75, 1),
    } as const;
    cam.position.copy(center).add(dirs[view].clone().normalize().multiplyScalar(dist));
    this.orbit.target.copy(center);
    this.orbit.update();
  }

  // ------------------------------------- modos de vista (menú Ver, v0.2.0)

  getColorMode(): ColorMode {
    return this.colorMode;
  }

  /** Color del visor: materiales reales, por categoría funcional o neutro. */
  setColorMode(mode: ColorMode): void {
    this.colorMode = mode;
    this.applyViewModes();
    this.bus.emit("viewModesChanged", { color: this.colorMode, edges: this.edgesOn });
    this.requestRender();
  }

  isEdges(): boolean {
    return this.edgesOn;
  }

  /** Muestra/oculta las aristas (contorno de cada pieza) sobre el sombreado. */
  setEdges(on: boolean): void {
    this.edgesOn = on;
    this.applyViewModes();
    this.bus.emit("viewModesChanged", { color: this.colorMode, edges: this.edgesOn });
    this.requestRender();
  }

  isGridVisible(): boolean {
    return this.sceneManager.isGridVisible();
  }

  setGridVisible(on: boolean): void {
    this.sceneManager.setGridVisible(on);
    this.requestRender();
  }

  /** Reaplica color de vista y aristas a todas las piezas. */
  private applyViewModes(): void {
    const tinte = (mesh: THREE.Mesh, catColor: number | null): void => {
      const m = mesh.material as THREE.MeshStandardMaterial;
      if (m && m.color && catColor !== null) m.color.setHex(catColor);
    };
    for (const o of this.objects.values()) {
      // Color.
      if (this.colorMode === "material") {
        o.setMaterial(o.materialId); // restaura el preset PBR real
      } else {
        const c =
          this.colorMode === "categoria"
            ? (CATEGORY_COLORS[o.category] ?? 0x94a3b8)
            : 0xb8bcc4;
        tinte(o.mesh, c);
        for (const child of o.mesh.children) {
          const cm = child as THREE.Mesh;
          if (cm.isMesh && !cm.userData.edgesHelper) tinte(cm, c);
        }
      }
      // Aristas.
      const previas = o.mesh.children.filter((ch) => ch.userData.edgesHelper);
      for (const ch of previas) {
        o.mesh.remove(ch);
        const lm = ch as THREE.LineSegments;
        lm.geometry.dispose();
        (lm.material as THREE.Material).dispose();
      }
      if (this.edgesOn) {
        const linea = new THREE.LineSegments(
          new THREE.EdgesGeometry(o.mesh.geometry, 30),
          new THREE.LineBasicMaterial({ color: 0x14161b }),
        );
        linea.userData.edgesHelper = true;
        o.mesh.add(linea);
      }
    }
  }

  /**
   * Reaplica los modos de vista tras cualquier mutación de escena (nuevas
   * piezas, cambios de material o geometría), con un pequeño debounce.
   */
  private scheduleViewModes(): void {
    if (this.colorMode === "material" && !this.edgesOn) return;
    if (this.viewModesTimer !== null) clearTimeout(this.viewModesTimer);
    this.viewModesTimer = setTimeout(() => {
      this.viewModesTimer = null;
      this.applyViewModes();
      this.requestRender();
    }, 150);
  }

  /** Zoom por botones (además de la rueda): factor <1 acerca, >1 aleja. */
  zoomBy(factor: number): void {
    const cam = this.sceneManager.camera;
    const offset = cam.position.clone().sub(this.orbit.target);
    const len = THREE.MathUtils.clamp(offset.length() * factor, 20, 3000);
    cam.position.copy(this.orbit.target).add(offset.setLength(len));
    this.orbit.update();
  }

  // -------------------------------------------------------------- eventos
  private onPointerDown = (event: PointerEvent): void => {
    if (this.gizmo.dragging) return;
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.sceneManager.camera);

    // Herramienta de selección de área: arrastrar dibuja el recuadro.
    if (this.areaSelect && !this.simulating && event.button === 0) {
      this.beginMarquee(event);
      return;
    }

    // Herramienta de arrastre directo: agarrar una pieza y llevarla (con el
    // eje bloqueado, se desliza solo a lo largo de ese eje).
    if (this.dragTool && !this.simulating && event.button === 0) {
      const hits = this.raycaster.intersectObjects(this.sceneManager.content.children, false);
      const hid = hits[0]?.object.userData.sceneObjectId as string | undefined;
      const hobj = hid ? this.objects.get(hid) : undefined;
      if (hobj && hits[0]) {
        let ids: string[];
        if (this.multiSel.has(hobj.id)) {
          ids = [...this.multiSel];
        } else if (this.objGroup.has(hobj.id)) {
          const gid = this.objGroup.get(hobj.id)!;
          ids = [...(this.groups.get(gid)?.ids ?? [hobj.id])];
          if (this.selectedGroupId !== gid) this.selectGroup(gid);
        } else {
          if (this.selected !== hobj) this.select(hobj);
          ids = [hobj.id];
        }
        const normal = this.sceneManager.camera.getWorldDirection(new THREE.Vector3());
        const starts = new Map<string, THREE.Vector3>();
        for (const id of ids) {
          const o = this.objects.get(id);
          if (o) starts.set(id, o.mesh.position.clone());
        }
        this.dragMove = {
          ids,
          grabbed: hits[0].point.clone(),
          plane: new THREE.Plane().setFromNormalAndCoplanarPoint(normal, hits[0].point),
          starts,
        };
        this.orbit.enabled = false;
        return;
      }
    }

    // Herramienta "agarrar maniquí": toma un segmento del cuerpo y lo lleva;
    // rota la articulación libre más cercana de la cadena (las bloqueadas con
    // el candado se saltan). Con eje bloqueado (1/2/3) el destino se
    // restringe a ese eje.
    if (this.grabFigureTool && !this.simulating && event.button === 0 && this.humanFigure) {
      const hits = this.raycaster.intersectObjects([this.humanFigure], true);
      const hit = hits[0];
      if (hit) {
        const jn0 = hit.object.userData.jointName as string | undefined;
        const normal = this.sceneManager.camera.getWorldDirection(new THREE.Vector3());
        if (jn0 === "" || jn0 === undefined) {
          // Pelvis/raíz: arrastrar la figura completa.
          this.grabDrag = {
            joint: "",
            grabLocal: this.humanFigure.position.clone().sub(hit.point),
            origin: hit.point.clone(),
            plane: new THREE.Plane().setFromNormalAndCoplanarPoint(normal, hit.point),
          };
          this.orbit.enabled = false;
          return;
        }
        let jn: string | null = jn0;
        while (jn && this.jointLocks.has(jn)) jn = PARENT_JOINT[jn] ?? null;
        if (!jn) {
          this.avisoTemporal("🔒 Cadena bloqueada: libera alguna articulación");
          return;
        }
        const joints = this.figureJoints();
        const j = joints?.[jn];
        if (j) {
          j.updateMatrixWorld(true);
          this.grabDrag = {
            joint: jn,
            grabLocal: j.worldToLocal(hit.point.clone()),
            origin: hit.point.clone(),
            plane: new THREE.Plane().setFromNormalAndCoplanarPoint(normal, hit.point),
          };
          this.selectJoint(jn); // muestra la articulación activa en Posturas
          this.gizmo.detach(); // durante el agarre manda el puntero, no el gizmo
          this.orbit.enabled = false;
        }
      }
      return;
    }

    // Durante la simulación: mano interactiva (agarrar piezas dinámicas) y
    // posicionamiento del maniquí; no hay selección ni edición.
    if (this.simulating) {
      this.beginSimInteraction();
      return;
    }

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
          origin: node.clone(),
        };
        this.orbit.enabled = false;
      } else {
        this.endBendNodes();
      }
      return;
    }

    // Modo línea (pilar/travesaño/tubo): dos clics con aim assist. Con eje
    // bloqueado, el segundo punto sale de la recta del eje bajo el puntero
    // (no necesita tocar nada: el eje Y se traza apuntando al cielo).
    if (this.lineMode) {
      const pick = this.pickLinePlacePoint();
      if (!this.linePendingA) {
        if (!pick) return;
        this.linePendingA = pick.point.clone();
        this.bus.emit("lineModeChanged", { active: true, kind: this.lineMode, count: 1 });
      } else {
        const b = this.axisLock
          ? this.lockedLinePoint(this.linePendingA)
          : (pick?.point ?? null);
        if (!b) return;
        this.createLinePiece(this.linePendingA, b);
        this.linePendingA = null;
        if (this.placementLine) this.placementLine.visible = false;
        this.bus.emit("dragMeasure", { text: null });
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
        if (event.shiftKey || event.ctrlKey || event.metaKey) {
          this.toggleMultiGroup(this.objGroup.get(obj.id)!);
        } else {
          this.selectGroup(this.objGroup.get(obj.id)!);
        }
      } else if (event.shiftKey || event.ctrlKey || event.metaKey) {
        this.toggleMulti(obj);
      } else {
        this.select(obj);
      }
    }
  };

  /** Suelta el nodo de doblado o el agarre de simulación al levantar el puntero. */
  private onPointerUp = (): void => {
    if (this.marquee) {
      this.finishMarquee();
      return;
    }
    if (this.grabDrag) {
      this.grabDrag = null;
      this.orbit.enabled = true;
      this.bus.emit("dragMeasure", { text: null });
      (this.humanFigure?.userData.ground as (() => void) | undefined)?.();
      this.scheduleAutosave();
      return;
    }
    if (this.dragMove) {
      const starts = this.dragMove.starts;
      this.dragMove = null;
      this.orbit.enabled = true;
      this.bus.emit("dragMeasure", { text: null });
      // Canvas completo: si el arrastre dejó piezas fuera del espacio editable,
      // la colocación se cancela y vuelven a su posición anterior.
      if (this.workspace?.canvas === "completo") {
        this.checkWorkspaceBounds();
        if ([...starts.keys()].some((id) => this.fueraIds.has(id))) {
          for (const [id, p] of starts) {
            const o = this.objects.get(id);
            if (!o || this.esPiezaEntorno(o)) continue;
            o.mesh.position.copy(p);
            this.bus.emit("objectTransformed", { object: o });
          }
          this.checkWorkspaceBounds();
          this.avisoFuera();
        }
      }
      this.refreshMultiGizmo();
      this.scheduleAutosave();
      return;
    }
    if (this.simDrag || this.figureDrag) {
      this.endSimInteraction();
      return;
    }
    if (!this.bendDrag) return;
    this.bendDrag = null;
    this.orbit.enabled = true;
    this.bus.emit("dragMeasure", { text: null });
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
    if ((event.ctrlKey || event.metaKey) && !this.simulating) {
      const k = event.key.toLowerCase();
      if (k === "c") {
        this.copySelection();
        return;
      }
      if (k === "v") {
        event.preventDefault();
        this.pasteClipboard();
        return;
      }
      if (k === "x") {
        this.copySelection();
        this.deleteSelection();
        return;
      }
      if (k === "z") {
        event.preventDefault();
        if (event.shiftKey) void this.redo();
        else void this.undo();
        return;
      }
      if (k === "y") {
        event.preventDefault();
        void this.redo();
        return;
      }
    }
    if (this.simulating) return;
    if (this.cableMode && (event.key === "Enter" || event.key === "Return")) {
      this.finishCable();
      return;
    }
    switch (event.key.toLowerCase()) {
      case "1":
        this.setAxisLock("x");
        break;
      case "2":
        this.setAxisLock("y");
        break;
      case "3":
        this.setAxisLock("z");
        break;
      case "0":
        if (this.axisLock) this.setAxisLock(this.axisLock); // libera
        break;
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
        this.deleteSelection();
        break;
      case "escape":
        if (this.axisLock) this.setAxisLock(this.axisLock); // libera el eje
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
