import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { SceneManager } from "../scene/SceneManager";
import { SceneObject } from "../objects/SceneObject";
import { getDefinition } from "../objects/componentLibrary";
import { EventBus } from "./eventBus";

export type TransformMode = "translate" | "rotate" | "scale";

export type EditorEvents = {
  objectsChanged: { objects: SceneObject[] };
  selectionChanged: { selected: SceneObject | null };
  /** Cambio de transform/dimensiones del objeto seleccionado (para refrescar panel). */
  objectTransformed: { object: SceneObject };
  modeChanged: { mode: TransformMode };
};

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
    this.orbit.update();
    this.sceneManager.render();
    requestAnimationFrame(this.loop);
  };

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
    this.sceneManager.content.remove(obj.mesh);
    obj.dispose();
    this.objects.delete(obj.id);
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

  // -------------------------------------------------------------- eventos
  private onPointerDown = (event: PointerEvent): void => {
    if (this.gizmo.dragging) return;
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.sceneManager.camera);

    const hits = this.raycaster.intersectObjects(
      this.sceneManager.content.children,
      false,
    );
    if (hits.length > 0) {
      const id = hits[0].object.userData.sceneObjectId as string | undefined;
      const obj = id ? this.objects.get(id) : undefined;
      if (obj) this.select(obj);
    } else {
      this.select(null);
    }
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.target instanceof HTMLInputElement) return;
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
        this.select(null);
        break;
    }
  };

  private onResize = (): void => {
    this.sceneManager.resize();
  };
}
