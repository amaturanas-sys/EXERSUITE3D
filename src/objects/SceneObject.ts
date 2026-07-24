import * as THREE from "three";
import type {
  CargaDiscosDef,
  ComponentCategory,
  PhysicalAttributes,
  PrimitiveParams,
  StackInfo,
} from "./types";
import { buildGeometry } from "./geometryFactory";
import { applyMaterial, buildMaterial } from "./materials";

let nextId = 1;

/**
 * Objeto de la escena de EXERSUITE3D: envuelve un THREE.Mesh y le adjunta
 * metadatos del componente, parametros dimensionales (cm) y atributos fisicos.
 */
export class SceneObject {
  readonly id: string;
  name: string;
  componentId: string;
  category: ComponentCategory;
  materialId: string;
  params: PrimitiveParams;
  physics: PhysicalAttributes;
  /** Pila selectorizada (solo en componentes tipo stack). */
  stack?: StackInfo;
  /** Carga de discos (carrier/barra/cuerno/atril): lados y medidas del disco. */
  carga?: CargaDiscosDef;
  /** True si la geometria proviene de un modelo importado (no parametrica). */
  imported = false;
  /** True si un modelo 3D personalizado sustituye a la primitiva del componente. */
  customModel = false;
  /** Clave `maquina:<id>` si este objeto ES una máquina estándar sustituida. */
  modeloMaquina: string | null = null;
  readonly mesh: THREE.Mesh;

  constructor(opts: {
    name: string;
    componentId: string;
    category: ComponentCategory;
    params: PrimitiveParams;
    physics: PhysicalAttributes;
    materialId: string;
    stack?: StackInfo;
    carga?: CargaDiscosDef;
    importedGeometry?: THREE.BufferGeometry;
  }) {
    this.id = `obj_${nextId++}`;
    this.name = opts.name;
    this.componentId = opts.componentId;
    this.category = opts.category;
    this.materialId = opts.materialId;
    this.params = { ...opts.params };
    this.physics = { ...opts.physics };
    this.stack = opts.stack ? { ...opts.stack } : undefined;
    this.carga = opts.carga ? { ...opts.carga } : undefined;

    this.imported = !!opts.importedGeometry;
    const geometry = opts.importedGeometry ?? buildGeometry(this.params);
    const material = buildMaterial(this.materialId);
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.userData.sceneObjectId = this.id;
    this.mesh.name = this.name;

    if (this.stack) this.rebuildStackVisual();
    if (this.carga) this.rebuildCargaVisual();
  }

  /** Partes visuales de la pila (placas/varillas/tubo) para animarlas. */
  private stackParts: { mesh: THREE.Mesh; restY: number; carriage: boolean }[] = [];

  getStackParts(): { mesh: THREE.Mesh; restY: number; carriage: boolean }[] {
    return this.stackParts;
  }

  /** Reconstruye la geometria tras cambiar `params`. */
  rebuildGeometry(): void {
    // La geometria importada o de modelo personalizado no es parametrica.
    if (this.imported || this.customModel) return;
    const old = this.mesh.geometry;
    this.mesh.geometry = buildGeometry(this.params);
    old.dispose();
    if (this.stack) this.rebuildStackVisual();
    if (this.carga) this.rebuildCargaVisual();
  }

  /**
   * Sustituye la geometria por la de un modelo 3D personalizado (ya horneada:
   * escalada a cm y centrada en el origen como una primitiva).
   */
  applyCustomGeometry(geometry: THREE.BufferGeometry): void {
    const old = this.mesh.geometry;
    this.mesh.geometry = geometry;
    old.dispose();
    this.mesh.scale.set(1, 1, 1);
    this.customModel = true;
    // Las placas/varillas/pin de la pila se dimensionan con el bbox de la
    // geometria: hay que reconstruirlas con la nueva.
    if (this.stack) this.rebuildStackVisual();
    if (this.carga) this.rebuildCargaVisual();
  }

  /** Vuelve a la primitiva parametrica del componente. */
  revertToPrimitive(): void {
    if (!this.customModel) return;
    this.customModel = false;
    const old = this.mesh.geometry;
    this.mesh.geometry = buildGeometry(this.params);
    old.dispose();
    if (this.stack) this.rebuildStackVisual();
    if (this.carga) this.rebuildCargaVisual();
  }

  /**
   * Construye las placas individuales, las varillas-guia y el tubo selector como
   * hijos de la caja envolvente (que se vuelve invisible pero sigue sirviendo
   * para seleccion/colision/snap). El "carriage" = tubo + placas seleccionadas
   * (las de arriba); el resto y las varillas son estaticas.
   */
  rebuildStackVisual(): void {
    if (!this.stack) return;
    for (const p of this.stackParts) {
      this.mesh.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    }
    this.stackParts = [];

    const env = this.mesh.material as THREE.MeshStandardMaterial;
    env.transparent = true;
    env.opacity = 0;
    env.depthWrite = false;

    const geo = this.mesh.geometry;
    geo.computeBoundingBox();
    const bb = geo.boundingBox!;
    const W = bb.max.x - bb.min.x;
    const H = bb.max.y - bb.min.y;
    const D = bb.max.z - bb.min.z;
    const P = Math.max(1, Math.round(this.stack.plateCount));
    const SEL = Math.max(0, Math.min(Math.round(this.stack.selected), P));
    const plateH = (H / P) * 0.82;

    const add = (mesh: THREE.Mesh, restY: number, carriage: boolean) => {
      mesh.position.y = restY;
      mesh.userData.sceneObjectId = this.id;
      this.mesh.add(mesh);
      this.stackParts.push({ mesh, restY, carriage });
    };

    // Placas (de abajo a arriba). Las SEL de arriba forman el carriage.
    // Si el componente define orificios verticales (sistema de poleas
    // guiadas), cada placa se perfora con ellos — como el carrier del TTP.
    const holeDia = this.customModel ? 0 : this.params.holeDiameter ?? 0;
    const holeSep = this.params.holeSpacing ?? 0;
    for (let i = 0; i < P; i++) {
      const y = -H / 2 + (i + 0.5) * (H / P);
      const placa = buildGeometry({
        kind: "box",
        width: W,
        height: plateH,
        depth: D,
        holeDiameter: holeDia,
        holeSpacing: holeSep,
      });
      const m = new THREE.Mesh(placa, buildMaterial(this.materialId));
      add(m, y, i >= P - SEL);
    }
    // Varillas guia (estaticas): si hay orificios, pasan POR ellos.
    const varillas = holeDia > 0.01 && holeSep > 0.01
      ? [-holeSep / 2, holeSep / 2]
      : [-(W / 2 + 1.5), W / 2 + 1.5];
    for (const sx of varillas) {
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, H, 12), buildMaterial("cromo"));
      r.position.x = sx;
      add(r, 0, false);
    }
    // Tubo selector (carriage).
    add(new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, H, 12), buildMaterial("acero")), 0, true);
    // Pin del selector (rojo), a la altura de la placa seleccionada mas baja.
    if (SEL > 0 && SEL < P) {
      const yPin = -H / 2 + (P - SEL + 0.5) * (H / P);
      const pin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, D + 4, 8),
        new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.3, roughness: 0.5 }),
      );
      pin.rotation.x = Math.PI / 2;
      pin.position.x = W / 2 - 1;
      add(pin, yPin, true);
    }
  }

  /** Discos ensamblados (visual) y cuántos caben realmente montados. */
  private cargaParts: THREE.Mesh[] = [];
  private cargaMontada = 0;

  /** Cantidad de discos pedida por el usuario (params.discCount). */
  discosMontados(): number {
    return Math.max(0, Math.round(this.params.discCount ?? 0));
  }

  /**
   * Reconstruye los DISCOS MONTADOS: se ensamblan introduciendo el cilindro
   * de la pieza por el orificio central del disco y quedan suspendidos por
   * la estructura (hijos del mesh: se mueven con ella en la simulación).
   * En piezas de dos lados (barra olímpica, carrier) se reparten
   * alternadamente; en las de un lado (cuerno, atril) se apilan desde la
   * base. La cantidad se recorta a lo que cabe en el largo de la pieza.
   */
  rebuildCargaVisual(): void {
    if (!this.carga) return;
    for (const m of this.cargaParts) {
      this.mesh.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
    this.cargaParts = [];
    this.cargaMontada = 0;
    const n = this.discosMontados();
    if (n === 0) return;

    // Eje de carga = eje local MÁS LARGO de la pieza (por él entran los discos).
    const geo = this.mesh.geometry;
    geo.computeBoundingBox();
    const bb = geo.boundingBox!;
    const dims = [bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z];
    const ejeIdx = dims.indexOf(Math.max(...dims));
    const L = dims[ejeIdx];
    const eje = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 1),
    ][ejeIdx];
    const centro = bb.getCenter(new THREE.Vector3());
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), eje);

    const paso = this.carga.grosorCm + 0.4;
    // Dos lados: desde el collarín interior hacia la punta; un lado: desde la base.
    const s0 = this.carga.lados === 2 ? L * 0.3 : 0;
    const maxPorLado =
      this.carga.lados === 2
        ? Math.max(0, Math.floor((L / 2 - s0) / paso))
        : Math.max(0, Math.floor((L - 2) / paso));

    for (let i = 0; i < n; i++) {
      const lado = this.carga.lados === 2 ? (i % 2 === 0 ? 1 : -1) : 1;
      const idx = this.carga.lados === 2 ? Math.floor(i / 2) : i;
      if (idx >= maxPorLado) break; // ya no caben más en la pieza
      const s =
        this.carga.lados === 2
          ? s0 + (idx + 0.5) * paso
          : -L / 2 + 1 + (idx + 0.5) * paso;
      const disco = new THREE.Mesh(
        new THREE.CylinderGeometry(this.carga.diamCm / 2, this.carga.diamCm / 2, this.carga.grosorCm, 28),
        buildMaterial("hierro-fundido"),
      );
      disco.quaternion.copy(quat);
      disco.position.copy(centro).addScaledVector(eje, lado * s);
      disco.castShadow = true;
      disco.receiveShadow = true;
      disco.userData.sceneObjectId = this.id;
      this.mesh.add(disco);
      this.cargaParts.push(disco);
      this.cargaMontada++;
    }
  }

  get color(): number {
    return (this.mesh.material as THREE.MeshStandardMaterial).color.getHex();
  }

  /** Cambia el material PBR aplicando un preset por id. */
  setMaterial(id: string): void {
    this.materialId = id;
    if (this.stack) {
      this.rebuildStackVisual(); // recolorea las placas
    } else {
      applyMaterial(this.mesh.material as THREE.MeshStandardMaterial, id);
    }
  }

  /**
   * Masa que realmente se mueve (kg): si es pila, las placas seleccionadas;
   * si carga discos, la pieza más los discos montados.
   */
  effectiveMassKg(): number {
    const discos = this.carga ? this.cargaMontada * this.carga.masaKg : 0;
    if (this.stack) {
      const sel = Math.max(0, Math.min(this.stack.selected, this.stack.plateCount));
      return sel * this.stack.plateMassKg + discos;
    }
    return this.physics.massKg + discos;
  }

  /** Dimensiones efectivas en cm (bounding box mundial * escala del mesh). */
  effectiveSize(): THREE.Vector3 {
    const box = new THREE.Box3().setFromObject(this.mesh);
    const size = new THREE.Vector3();
    box.getSize(size);
    return size;
  }

  /** Dimensiones locales en cm (bbox de la geometria * escala, sin rotacion). */
  localSize(): THREE.Vector3 {
    const geo = this.mesh.geometry;
    geo.computeBoundingBox();
    const size = new THREE.Vector3();
    geo.boundingBox!.getSize(size);
    return size.multiply(this.mesh.scale);
  }

  dispose(): void {
    for (const p of this.stackParts) {
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    }
    // Ayudas de aristas del modo Ver (si están activas).
    for (const ch of [...this.mesh.children]) {
      if (ch.userData.edgesHelper) {
        const l = ch as THREE.LineSegments;
        l.geometry.dispose();
        (l.material as THREE.Material).dispose();
      }
    }
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
