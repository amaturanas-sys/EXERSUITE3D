import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
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
    // Fondo claro de estudio (estilo ilustrativo).
    this.scene.background = gradientTexture("#eef2f6", "#c6cfd8");

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

    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    this.scene.add(this.content);
    this.setupEnvironment();
    this.setupLights();
    this.grid = this.setupGrid();
    this.setupGround();

    this.resize();
  }

  /** Mapa de entorno PMREM para reflejos PBR realistas en metales/plasticos. */
  private setupEnvironment(): void {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = envTex;
    pmrem.dispose();
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
    const grid = new THREE.GridHelper(sizeCm, divisions, 0x9aa6b4, 0xc2cad3);
    (grid.material as THREE.Material).opacity = 0.55;
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
    const mat = new THREE.ShadowMaterial({ opacity: 0.18 });
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

/** Textura de gradiente vertical para un fondo de estudio. */
function gradientTexture(top: string, bottom: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 2;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
