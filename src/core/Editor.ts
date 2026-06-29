import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { SceneManager } from "../scene/SceneManager";
import { SceneObject } from "../objects/SceneObject";
import { getDefinition } from "../objects/componentLibrary";
import { PhysicsWorld } from "../physics/PhysicsWorld";
import { Joint, type JointKind, axisVector } from "../physics/joints";
import { Cable } from "../physics/cables";
import {
  DEFAULT_HUMAN_HEIGHT,
  buildHumanFigure,
  disposeHumanFigure,
} from "../objects/humanFigure";
import { buildSkeletonFigure } from "../objects/skeletonModel";
import { EventBus } from "./eventBus";

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
  /** Modo "trazar cable" activo: nº de nodos colocados. */
  cableModeChanged: { active: boolean; count: number };
  /** Estado de la figura humana de referencia. */
  humanFigureChanged: {
    present: boolean;
    heightCm: number;
    mode: HumanMode;
    loading: boolean;
  };
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
  private cablePending: SceneObject[] = [];

  private references = new THREE.Group();
  private humanFigure: THREE.Group | null = null;
  private humanHeight = DEFAULT_HUMAN_HEIGHT;
  private humanMode: HumanMode = "mannequin";
  private humanToken = 0;
  private selectedFigure = false;

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
    });
    this.gizmo.addEventListener("objectChange", () => {
      if (this.selected) this.bus.emit("objectTransformed", { object: this.selected });
    });
    // En three r0.169 el helper del gizmo se anade por separado.
    const helper = (this.gizmo as unknown as { getHelper?: () => THREE.Object3D })
      .getHelper?.();
    this.sceneManager.scene.add(helper ?? (this.gizmo as unknown as THREE.Object3D));

    this.sceneManager.scene.add(this.jointHelpers);
    this.sceneManager.scene.add(this.references);
    this.sceneManager.scene.add(this.cableVisuals);

    canvas.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("resize", this.onResize);
    window.addEventListener("keydown", this.onKeyDown);
  }

  // ----------------------------------------------------------------- ciclo
  start(): void {
    if (this.running) return;
    this.running = true;
    this.loop();
  }

  private loop = (): void => {
    if (!this.running) return;
    if (this.simulating && this.physics) this.physics.step();
    this.updateCableVisuals();
    this.orbit.update();
    this.sceneManager.render();
    requestAnimationFrame(this.loop);
  };

  // ------------------------------------------------------------- simulacion
  isSimulating(): boolean {
    return this.simulating;
  }

  async toggleSimulation(): Promise<void> {
    if (this.simulating) this.stopSimulation();
    else await this.startSimulation();
  }

  private async startSimulation(): Promise<void> {
    if (this.simulating) return;
    await PhysicsWorld.init();

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
    });

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
    if (this.selected === obj) this.select(null);
    // Elimina las articulaciones y cables que referencian a este objeto.
    for (const j of this.listJoints()) {
      if (j.bodyAId === obj.id || j.bodyBId === obj.id) this.joints.delete(j.id);
    }
    for (const c of this.listCables()) {
      if (c.nodeIds.includes(obj.id)) this.cables.delete(c.id);
    }
    this.sceneManager.content.remove(obj.mesh);
    obj.dispose();
    this.objects.delete(obj.id);
    this.refreshJointHelpers();
    this.bus.emit("jointsChanged", { joints: this.listJoints() });
    this.bus.emit("cablesChanged", { cables: this.listCables() });
    this.bus.emit("objectsChanged", { objects: this.listObjects() });
  }

  duplicateSelected(): void {
    if (!this.selected) return;
    const src = this.selected;
    const obj = this.addComponent(src.componentId);
    obj.params = { ...src.params };
    obj.rebuildGeometry();
    obj.setMaterial(src.materialId);
    obj.mesh.position.copy(src.mesh.position).add(new THREE.Vector3(20, 0, 20));
    obj.mesh.rotation.copy(src.mesh.rotation);
    obj.mesh.scale.copy(src.mesh.scale);
    this.bus.emit("objectTransformed", { object: obj });
  }

  listObjects(): SceneObject[] {
    return [...this.objects.values()];
  }

  getById(id: string): SceneObject | undefined {
    return this.objects.get(id);
  }

  // ------------------------------------------------------------ seleccion
  select(obj: SceneObject | null): void {
    this.selected = obj;
    this.selectedFigure = false;
    if (obj) this.gizmo.attach(obj.mesh);
    else this.gizmo.detach();
    this.bus.emit("selectionChanged", { selected: obj });
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
    if (this.humanFigure || this.lastFigureTransform) {
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
        figure = buildHumanFigure(heightCm);
      }
    } else {
      figure = buildHumanFigure(heightCm);
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

  private selectFigure(): void {
    if (!this.humanFigure) return;
    this.select(null);
    this.selectedFigure = true;
    this.gizmo.attach(this.humanFigure);
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

  /** Entra en modo "trazar cable": clic en cada nodo (extremo, poleas, extremo). */
  beginCable(): void {
    if (this.simulating) return;
    this.cancelConnect();
    this.cableMode = true;
    this.cablePending = [];
    this.select(null);
    this.bus.emit("cableModeChanged", { active: true, count: 0 });
  }

  cancelCable(): void {
    if (!this.cableMode) return;
    this.cableMode = false;
    this.cablePending = [];
    this.bus.emit("cableModeChanged", { active: false, count: 0 });
  }

  /** Cierra el cable en construccion (>=2 nodos). */
  finishCable(): void {
    if (!this.cableMode) return;
    if (this.cablePending.length >= 2) {
      this.createCable(this.cablePending.map((o) => o.id));
    }
    this.cancelCable();
  }

  /** Crea un cable a partir de una lista ordenada de ids de objetos. */
  createCable(nodeIds: string[]): Cable | null {
    if (nodeIds.length < 2) return null;
    const cable = new Cable({ nodeIds });
    this.cables.set(cable.id, cable);
    this.bus.emit("cablesChanged", { cables: this.listCables() });
    return cable;
  }

  removeCable(cable: Cable): void {
    this.cables.delete(cable.id);
    this.bus.emit("cablesChanged", { cables: this.listCables() });
  }

  /** Reconstruye las polilineas de los cables segun la posicion de sus nodos. */
  private updateCableVisuals(): void {
    // Anade/quita lineas para que coincidan con los cables actuales.
    const wanted = new Set(this.cables.keys());
    for (const child of [...this.cableVisuals.children]) {
      if (!wanted.has(child.userData.cableId as string)) {
        this.cableVisuals.remove(child);
        ((child as THREE.Line).geometry as THREE.BufferGeometry).dispose();
      }
    }
    const existing = new Map<string, THREE.Line>();
    for (const child of this.cableVisuals.children) {
      existing.set(child.userData.cableId as string, child as THREE.Line);
    }

    for (const cable of this.cables.values()) {
      const pts: THREE.Vector3[] = [];
      for (const id of cable.nodeIds) {
        const obj = this.objects.get(id);
        if (obj) pts.push(obj.mesh.position.clone());
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

  // -------------------------------------------------------------- eventos
  private onPointerDown = (event: PointerEvent): void => {
    if (this.gizmo.dragging || this.simulating) return;
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.sceneManager.camera);

    // Modo cable: cada clic anade un nodo (objeto) al trazado.
    if (this.cableMode) {
      const cHits = this.raycaster.intersectObjects(
        this.sceneManager.content.children,
        false,
      );
      const id = cHits[0]?.object.userData.sceneObjectId as string | undefined;
      const obj = id ? this.objects.get(id) : undefined;
      if (!obj) return;
      // Evita duplicar el mismo nodo consecutivo.
      if (this.cablePending[this.cablePending.length - 1] !== obj) {
        this.cablePending.push(obj);
        this.bus.emit("cableModeChanged", { active: true, count: this.cablePending.length });
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

    // Selección normal: objetos editables vs figura humana, por cercanía.
    const objHits = this.raycaster.intersectObjects(
      this.sceneManager.content.children,
      false,
    );
    const figHits = this.humanFigure
      ? this.raycaster.intersectObjects([this.humanFigure], true)
      : [];
    const objDist = objHits[0]?.distance ?? Infinity;
    const figDist = figHits[0]?.distance ?? Infinity;

    if (objDist === Infinity && figDist === Infinity) {
      this.select(null);
    } else if (figDist < objDist) {
      this.selectFigure();
    } else {
      const id = objHits[0].object.userData.sceneObjectId as string | undefined;
      this.select((id && this.objects.get(id)) || null);
    }
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.target instanceof HTMLInputElement) return;
    if (event.key === " ") {
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
        break;
      case "escape":
        this.cancelConnect();
        this.cancelCable();
        this.select(null);
        break;
    }
  };

  private onResize = (): void => {
    this.sceneManager.resize();
  };
}
