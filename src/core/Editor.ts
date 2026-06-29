import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { SceneManager } from "../scene/SceneManager";
import { SceneObject } from "../objects/SceneObject";
import { getDefinition } from "../objects/componentLibrary";
import { PhysicsWorld } from "../physics/PhysicsWorld";
import { Joint, type JointKind, axisVector } from "../physics/joints";
import { Cable, type CableNode } from "../physics/cables";
import { SnapManager, localSnapPoints } from "./snapping";
import {
  DEFAULT_HUMAN_HEIGHT,
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
  /** Modo "trazar cable" activo: nº de nodos colocados. */
  cableModeChanged: { active: boolean; count: number };
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

  private snap: SnapManager;

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
      if (this.selectedGroupId) {
        this.applyGroupDelta();
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
    this.sceneManager.scene.add(this.groupProxy);

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
    this.updateStackAnimation();
    this.updateHandIK();
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
      stack: def.stack,
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
      if (c.nodes.some((n) => n.objectId === obj.id)) this.cables.delete(c.id);
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
    const obj = this.addComponent(src.componentId);
    obj.params = { ...src.params };
    if (src.stack) obj.stack = { ...src.stack };
    obj.rebuildGeometry();
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
      objects: this.listObjects().filter((o) => !o.imported).map((o) => ({
        id: o.id,
        name: o.name,
        componentId: o.componentId,
        materialId: o.materialId,
        params: { ...o.params },
        physics: { ...o.physics },
        stack: o.stack ? { ...o.stack } : undefined,
        position: v3(o.mesh.position),
        quaternion: q4(o.mesh.quaternion),
        scale: v3(o.mesh.scale),
      })),
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
    const ext = file.name.split(".").pop()?.toLowerCase();
    const url = URL.createObjectURL(file);
    try {
      let root: THREE.Object3D;
      if (ext === "obj") {
        root = await new OBJLoader().loadAsync(url);
      } else {
        const draco = new DRACOLoader();
        draco.setDecoderPath(`${import.meta.env.BASE_URL}draco/`);
        const loader = new GLTFLoader();
        loader.setDRACOLoader(draco);
        root = (await loader.loadAsync(url)).scene;
      }
      this.addImportedModel(root, file.name.replace(/\.[^.]+$/, ""));
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  /** Fusiona las mallas del modelo en una pieza y la anade a la escena. */
  private addImportedModel(root: THREE.Object3D, name: string): void {
    root.updateMatrixWorld(true);
    const geos: THREE.BufferGeometry[] = [];
    root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        const mesh = o as THREE.Mesh;
        const g = mesh.geometry.clone();
        g.applyMatrix4(mesh.matrixWorld);
        geos.push(this.normalizeGeometry(g));
      }
    });
    if (geos.length === 0) return;
    let merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    if (!merged) merged = geos[0];

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

  /** Deja la geometria con solo position/normal/uv (no indexada) para fusionar. */
  private normalizeGeometry(g: THREE.BufferGeometry): THREE.BufferGeometry {
    const src = g.index ? g.toNonIndexed() : g;
    const out = new THREE.BufferGeometry();
    out.setAttribute("position", src.getAttribute("position"));
    if (src.getAttribute("normal")) out.setAttribute("normal", src.getAttribute("normal"));
    const count = src.getAttribute("position").count;
    out.setAttribute(
      "uv",
      src.getAttribute("uv") ?? new THREE.BufferAttribute(new Float32Array(count * 2), 2),
    );
    if (!src.getAttribute("normal")) out.computeVertexNormals();
    return out;
  }

  /** Vacia la escena (objetos, articulaciones, cables, grupos, figura). */
  clearScene(): void {
    this.select(null);
    for (const o of this.objects.values()) {
      this.sceneManager.content.remove(o.mesh);
      o.dispose();
    }
    this.objects.clear();
    this.joints.clear();
    this.cables.clear();
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
    this.clearScene();
    const idMap = new Map<string, string>();

    for (const od of data.objects) {
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
    this.clearGroupHighlight();
    this.selected = obj;
    this.selectedFigure = false;
    this.selectedGroupId = null;
    this.clearMultiSel();
    this.selectedJointName = null;
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
    }
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
    this.setMode("rotate"); // posar = rotar la articulacion
    this.emitJointSelection();
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
    joints[jn].rotation[axis] = degToRad(deg);
    (this.humanFigure?.userData.ground as (() => void) | undefined)?.();
  }

  /** Selecciona la figura entera para moverla/rotarla. */
  private selectFigureRoot(): void {
    if (!this.humanFigure) return;
    this.select(null);
    this.selectedFigure = true;
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
      if (sh && el && wr) solveTwoBoneIK(sh, el, wr, target, this.humanFigure);
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

  // -------------------------------------------------------------- eventos
  private onPointerDown = (event: PointerEvent): void => {
    if (this.gizmo.dragging || this.simulating) return;
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.sceneManager.camera);

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

    // Modo cable: cada clic ancla un nodo en el punto de anclaje mas cercano.
    if (this.cableMode) {
      const cHits = this.raycaster.intersectObjects(
        this.sceneManager.content.children,
        false,
      );
      const hit = cHits[0];
      const id = hit?.object.userData.sceneObjectId as string | undefined;
      const obj = id ? this.objects.get(id) : undefined;
      if (!obj || !hit) return;
      // Punto de anclaje (local) cuya posicion mundial esta mas cerca del clic.
      obj.mesh.updateMatrixWorld(true);
      let best: THREE.Vector3 | null = null;
      let bestD = Infinity;
      for (const lp of localSnapPoints(obj)) {
        const wp = lp.clone().applyMatrix4(obj.mesh.matrixWorld);
        const d = wp.distanceTo(hit.point);
        if (d < bestD) { bestD = d; best = lp; }
      }
      const prev = this.cablePending[this.cablePending.length - 1];
      if (!prev || prev.object !== obj) {
        this.cablePending.push({ object: obj, local: best ?? new THREE.Vector3() });
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
        else if (this.selectedGroupId) this.deleteSelectedGroup();
        break;
      case "escape":
        this.cancelConnect();
        this.cancelCable();
        this.cancelAttachHand();
        this.select(null);
        break;
    }
  };

  private onResize = (): void => {
    this.sceneManager.resize();
  };
}
