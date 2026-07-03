import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/**
 * Visor 3D ligero e independiente para previsualizar un único componente en la
 * ventana de biblioteca, sin necesidad de cargar el editor ni un proyecto.
 * Encadra automáticamente la pieza y la hace girar (turntable).
 */
export class ComponentPreview {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private mesh: THREE.Mesh | null = null;
  private running = false;
  private ro: ResizeObserver;

  constructor(private container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = false;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.domElement.style.display = "block";
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    container.append(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100000);
    this.camera.position.set(60, 45, 90);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x40454f, 1.0));
    const key = new THREE.DirectionalLight(0xffffff, 1.3);
    key.position.set(120, 200, 140);
    this.scene.add(key);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 1.6;

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.resize();
  }

  /** Muestra una geometría (en cm) con su material; encuadra la cámara. */
  show(geometry: THREE.BufferGeometry, material: THREE.Material): void {
    this.clearMesh();
    const mesh = new THREE.Mesh(geometry, material);
    this.mesh = mesh;
    this.scene.add(mesh);

    geometry.computeBoundingSphere();
    const sph = geometry.boundingSphere!;
    const r = Math.max(sph.radius, 1);
    this.controls.target.copy(sph.center);
    const dist = r / Math.sin((this.camera.fov * Math.PI) / 180 / 2);
    const dir = new THREE.Vector3(0.8, 0.55, 1).normalize();
    this.camera.position.copy(sph.center).addScaledVector(dir, dist * 1.15);
    this.camera.near = Math.max(0.1, dist / 100);
    this.camera.far = dist * 100;
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  private clearMesh(): void {
    if (!this.mesh) return;
    this.scene.remove(this.mesh);
    // La geometría y el material se crean por cada selección (clon de la
    // primitiva o del modelo): liberarlos evita fugas de memoria/GPU.
    this.mesh.geometry.dispose();
    const mat = this.mesh.material;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else mat.dispose();
    this.mesh = null;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.loop();
  }

  stop(): void {
    this.running = false;
  }

  private loop = (): void => {
    if (!this.running) return;
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.loop);
  };

  resize(): void {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  dispose(): void {
    this.stop();
    this.ro.disconnect();
    this.clearMesh();
    this.controls.dispose();
    // Libera el entorno PMREM y fuerza la pérdida del contexto WebGL: abrir la
    // biblioteca repetidamente no debe acumular contextos vivos (límite ~8-16
    // por página) hasta que el GC recoja los canvas.
    this.scene.environment?.dispose();
    this.scene.environment = null;
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
