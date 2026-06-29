import * as THREE from "three";
import { METER } from "../core/units";

/**
 * Gestiona el contexto de render de Three.js: escena, camara, renderer,
 * iluminacion y la rejilla de referencia en centimetros.
 */
export class SceneManager {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  /** Grupo que contiene los objetos editables (excluye grid, luces, gizmos). */
  readonly content = new THREE.Group();

  private grid: THREE.GridHelper;

  constructor(private canvas: HTMLCanvasElement) {
    this.scene.background = new THREE.Color(0x1e2128);

    this.camera = new THREE.PerspectiveCamera(
      50,
      1,
      1, // near: 1 cm
      100 * METER, // far: 100 m
    );
    // Vista 3/4 tipo SketchUp, mirando a una maquina de ~2 m.
    this.camera.position.set(250, 200, 320);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene.add(this.content);
    this.setupLights();
    this.grid = this.setupGrid();
    this.setupGround();

    this.resize();
  }

  private setupLights(): void {
    const ambient = new THREE.HemisphereLight(0xffffff, 0x404550, 0.9);
    this.scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(300, 500, 200);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const s = key.shadow.camera as THREE.OrthographicCamera;
    s.left = -400;
    s.right = 400;
    s.top = 400;
    s.bottom = -400;
    s.near = 1;
    s.far = 2000;
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0xffffff, 0.4);
    fill.position.set(-300, 200, -200);
    this.scene.add(fill);
  }

  /** Rejilla: cada celda = 10 cm, divisiones mayores cada 1 m. */
  private setupGrid(): THREE.GridHelper {
    const sizeCm = 6 * METER; // 6 m de lado
    const divisions = sizeCm / 10; // celdas de 10 cm
    const grid = new THREE.GridHelper(sizeCm, divisions, 0x5b6472, 0x363b45);
    (grid.material as THREE.Material).opacity = 0.6;
    (grid.material as THREE.Material).transparent = true;
    this.scene.add(grid);

    // Ejes X (rojo) y Z (azul) marcados sobre el grid.
    const axes = new THREE.AxesHelper(METER);
    axes.position.y = 0.05;
    this.scene.add(axes);
    return grid;
  }

  private setupGround(): void {
    const geo = new THREE.PlaneGeometry(6 * METER, 6 * METER);
    const mat = new THREE.ShadowMaterial({ opacity: 0.25 });
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  setGridVisible(visible: boolean): void {
    this.grid.visible = visible;
  }

  resize(): void {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}
