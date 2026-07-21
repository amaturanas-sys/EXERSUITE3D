import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { METER } from "../core/units";
import { getPerf } from "../core/performance";

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
  private key!: THREE.DirectionalLight;
  private envTex: THREE.Texture | null = null;
  /** Suelo estándar infinito (canvas libre). */
  private ground!: THREE.Mesh;
  /** Suelo recortado a la planta del canvas completo (mismo aspecto). */
  private customGround: THREE.Group | null = null;
  private plantaActual: [number, number][] | null = null;
  /** Preferencia de rejilla (aplica al GridHelper o al suelo personalizado). */
  private gridPref = true;

  constructor(private canvas: HTMLCanvasElement) {
    const perf = getPerf();

    // Fondo de estudio en escala de grises neutra (como el resto del programa).
    this.scene.background = gradientTexture("#eef0f2", "#cdd0d3");

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
      antialias: perf.antialias,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.ratioCap = perf.maxPixelRatio;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, perf.maxPixelRatio));
    this.renderer.shadowMap.enabled = perf.shadows;
    this.renderer.shadowMap.type = perf.softShadows ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;

    // Con sombreado simple se omite el tone mapping ACES (caro por píxel).
    this.renderer.toneMapping = perf.simpleShading
      ? THREE.NoToneMapping
      : THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    this.scene.add(this.content);
    if (perf.environment) this.setupEnvironment();
    this.setupLights();
    this.key.castShadow = perf.shadows;
    this.key.shadow.mapSize.set(perf.shadowMapSize, perf.shadowMapSize);
    this.grid = this.setupGrid();
    this.setupGround();

    this.resize();
  }

  /** Mapa de entorno PMREM para reflejos PBR realistas en metales/plasticos. */
  private setupEnvironment(): void {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envTex;
    pmrem.dispose();
  }

  // ------------------------------------------------------------- rendimiento
  /** Tope de escala configurado por el usuario (sin contar el de movimiento). */
  private ratioCap = 2;
  /** Resolución dinámica: escala reducida mientras hay movimiento. */
  private motionScale = false;

  setMaxPixelRatio(cap: number): void {
    this.ratioCap = cap;
    this.applyPixelRatio();
  }

  /**
   * Activa/desactiva la escala de movimiento (×0.7 sobre el tope): renderiza
   * a menos resolución mientras se orbita/arrastra/simula y vuelve a nítido
   * en reposo. Devuelve true si el estado cambió (para repintar).
   */
  setMotionScale(on: boolean): boolean {
    if (on === this.motionScale) return false;
    this.motionScale = on;
    this.applyPixelRatio();
    return true;
  }

  private applyPixelRatio(): void {
    const cap = this.ratioCap * (this.motionScale ? 0.7 : 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, cap));
    this.resize();
  }

  setShadowsEnabled(on: boolean): void {
    this.renderer.shadowMap.enabled = on;
    this.key.castShadow = on;
    this.renderer.shadowMap.needsUpdate = true;
    this.scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(m)) m.forEach((mm) => (mm.needsUpdate = true));
      else if (m) m.needsUpdate = true;
    });
  }

  /** Calidad de la sombra principal: tamaño del mapa y filtro suave/duro. */
  setShadowQuality(mapSize: number, soft: boolean): void {
    this.key.shadow.mapSize.set(mapSize, mapSize);
    this.key.shadow.map?.dispose();
    this.key.shadow.map = null;
    this.renderer.shadowMap.type = soft ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    this.renderer.shadowMap.needsUpdate = true;
    this.scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(m)) m.forEach((mm) => (mm.needsUpdate = true));
      else if (m) m.needsUpdate = true;
    });
  }

  /** Tone mapping según el modo de sombreado (los materiales, al reabrir). */
  setSimpleShading(on: boolean): void {
    this.renderer.toneMapping = on ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
    this.scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(m)) m.forEach((mm) => (mm.needsUpdate = true));
      else if (m) m.needsUpdate = true;
    });
  }

  setEnvironmentEnabled(on: boolean): void {
    if (on && !this.envTex) {
      this.setupEnvironment();
    } else if (!on && this.envTex) {
      this.scene.environment = null;
      this.envTex.dispose();
      this.envTex = null;
    }
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
    this.key = key;

    const fill = new THREE.DirectionalLight(0xffffff, 0.4);
    fill.position.set(-300, 200, -200);
    this.scene.add(fill);
  }

  /** Rejilla: cada celda = 10 cm, divisiones mayores cada 1 m. */
  private setupGrid(): THREE.GridHelper {
    const sizeCm = 6 * METER; // 6 m de lado
    const divisions = sizeCm / 10; // celdas de 10 cm
    const grid = new THREE.GridHelper(sizeCm, divisions, 0x9a9a9e, 0xc4c4c8);
    (grid.material as THREE.Material).opacity = 0.55;
    (grid.material as THREE.Material).transparent = true;
    this.scene.add(grid);

    // Ejes X (rojo) y Z (azul) marcados sobre el grid.
    const axes = new THREE.AxesHelper(METER);
    axes.position.y = 0.05;
    this.scene.add(axes);
    return grid;
  }

  /**
   * Suelo de trabajo: un objeto siempre presente e inamovible (no es un
   * SceneObject, así que el gizmo nunca lo selecciona ni lo borra). Plano gris
   * neutro que recibe sombras y lleva el logotipo de la app como marca de agua
   * tenue, en escala de grises de bajo contraste.
   */
  private setupGround(): void {
    const size = 6 * METER;
    const tex = this.buildFloorTexture();
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      color: 0xffffff,
      roughness: 0.96,
      metalness: 0,
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05; // justo bajo la rejilla (y=0)
    ground.receiveShadow = true;
    ground.name = "ground";
    this.scene.add(ground);
    this.ground = ground;
  }

  /**
   * Canvas completo (v0.2.1): el suelo personalizado tiene el MISMO aspecto
   * que el estándar — plano gris neutro con rejilla (1 celda = 10 cm, mayores
   * cada 1 m) y el logotipo como marca de agua — pero recortado exactamente a
   * la planta definida por el usuario. Con null vuelve al suelo infinito.
   */
  setCustomGround(planta: [number, number][] | null): void {
    this.plantaActual = planta && planta.length >= 3 ? planta.map((p) => [...p] as [number, number]) : null;
    if (this.customGround) {
      this.scene.remove(this.customGround);
      this.customGround.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mm = m.material as THREE.MeshStandardMaterial | undefined;
        mm?.map?.dispose?.();
        mm?.dispose?.();
      });
      this.customGround = null;
    }
    const activa = this.plantaActual !== null;
    this.ground.visible = !activa;
    this.grid.visible = !activa && this.gridPref;
    if (!this.plantaActual) return;

    const pts = this.plantaActual;
    const g = new THREE.Group();
    g.name = "custom-ground";

    // Suelo con la forma de la planta; la rejilla va horneada en un mosaico
    // de 1 m (los UVs de ShapeGeometry son las coordenadas del plano en cm).
    const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);
    const tex = this.buildFloorTileTexture(this.gridPref);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      color: 0xffffff,
      roughness: 0.96,
      metalness: 0,
    });
    const suelo = new THREE.Mesh(geo, mat);
    suelo.position.y = -0.05;
    suelo.receiveShadow = true;
    g.add(suelo);

    // Marca de agua del logo en el centroide de la planta (igual de tenue).
    let cx = 0;
    let cz = 0;
    let area2 = 0;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const f = pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
      area2 += f;
      cx += (pts[j][0] + pts[i][0]) * f;
      cz += (pts[j][1] + pts[i][1]) * f;
    }
    if (Math.abs(area2) > 1e-6) {
      cx /= 3 * area2;
      cz /= 3 * area2;
    }
    const xs = pts.map((p) => p[0]);
    const zs = pts.map((p) => p[1]);
    const lado = Math.min(
      Math.max(...xs) - Math.min(...xs),
      Math.max(...zs) - Math.min(...zs),
    ) * 0.55;
    const logoCanvas = document.createElement("canvas");
    logoCanvas.width = logoCanvas.height = 512;
    const logoTex = new THREE.CanvasTexture(logoCanvas);
    logoTex.colorSpace = THREE.SRGBColorSpace;
    const img = new Image();
    img.onload = () => {
      const ctx = logoCanvas.getContext("2d")!;
      const w = 512;
      const h = (w * img.height) / img.width;
      ctx.globalAlpha = 0.13;
      ctx.drawImage(img, 0, (512 - h) / 2, w, h);
      logoTex.needsUpdate = true;
    };
    img.src = `${import.meta.env.BASE_URL}brand/logo-mark.png`;
    const logo = new THREE.Mesh(
      new THREE.PlaneGeometry(lado, lado),
      new THREE.MeshBasicMaterial({ map: logoTex, transparent: true, depthWrite: false }),
    );
    logo.rotation.x = -Math.PI / 2;
    logo.position.set(cx, 0.02, cz);
    g.add(logo);

    this.scene.add(g);
    this.customGround = g;
  }

  /**
   * Mosaico de 1 m del suelo estándar: gris neutro y, si procede, la rejilla
   * con celdas de 10 cm y línea mayor de 1 m (mismos tonos que el GridHelper).
   */
  private buildFloorTileTexture(conGrid: boolean): THREE.CanvasTexture {
    const S = 256; // 256 px = 100 cm
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = S;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#e4e6e8"; // mismo gris del suelo estándar
    ctx.fillRect(0, 0, S, S);
    if (conGrid) {
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = "#c4c4c8"; // líneas menores (10 cm)
      ctx.lineWidth = 1;
      for (let i = 1; i < 10; i++) {
        const p = (S / 10) * i + 0.5;
        ctx.beginPath();
        ctx.moveTo(p, 0);
        ctx.lineTo(p, S);
        ctx.moveTo(0, p);
        ctx.lineTo(S, p);
        ctx.stroke();
      }
      ctx.strokeStyle = "#9a9a9e"; // línea mayor (1 m) en el borde del mosaico
      ctx.strokeRect(0.5, 0.5, S - 1, S - 1);
      ctx.globalAlpha = 1;
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1 / 100, 1 / 100); // UVs en cm → un mosaico por metro
    tex.anisotropy = 8;
    return tex;
  }

  /**
   * Textura del suelo: gris neutro con el logotipo dibujado al centro en un gris
   * apenas más oscuro (bajo contraste). El logo se carga de forma asíncrona y se
   * compone sobre el lienzo cuando está listo.
   */
  private buildFloorTexture(): THREE.CanvasTexture {
    const S = 1024;
    const FLOOR = "#e4e6e8"; // gris claro neutro del suelo
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = S;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = FLOOR;
    ctx.fillRect(0, 0, S, S);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;

    const img = new Image();
    img.onload = () => {
      const w = S * 0.5;
      const h = (w * img.height) / img.width;
      ctx.save();
      // Marca de agua muy tenue: el arte negro del logo queda gris medio y los
      // huecos blancos apenas más claros que el suelo => contraste leve.
      ctx.globalAlpha = 0.13;
      ctx.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
      ctx.restore();
      tex.needsUpdate = true;
    };
    img.src = `${import.meta.env.BASE_URL}brand/logo-mark.png`;
    return tex;
  }

  setGridVisible(visible: boolean): void {
    this.gridPref = visible;
    if (this.plantaActual) {
      // El suelo personalizado lleva la rejilla horneada: se reconstruye.
      this.setCustomGround(this.plantaActual);
    } else {
      this.grid.visible = visible;
    }
  }

  isGridVisible(): boolean {
    return this.gridPref;
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

  /** Libera el contexto WebGL y los recursos de la escena. */
  dispose(): void {
    (this.scene.background as THREE.Texture | null)?.dispose?.();
    this.envTex?.dispose();
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose?.();
      const m = mesh.material as THREE.Material | THREE.Material[] | undefined;
      const disposeMat = (mm: THREE.Material) => {
        // Libera tambien las texturas del material (p. ej. la CanvasTexture
        // 1024x1024 del logo del suelo), que dispose() no toca.
        const std = mm as THREE.MeshStandardMaterial;
        std.map?.dispose?.();
        std.normalMap?.dispose?.();
        std.roughnessMap?.dispose?.();
        std.metalnessMap?.dispose?.();
        mm.dispose();
      };
      if (Array.isArray(m)) m.forEach(disposeMat);
      else if (m) disposeMat(m);
    });
    this.renderer.dispose();
    this.renderer.forceContextLoss();
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
