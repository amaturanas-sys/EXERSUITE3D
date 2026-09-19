import * as THREE from "three";
import type { Editor } from "../core/Editor";
import type { SceneObject } from "../objects/SceneObject";
import { clear, el } from "./dom";
import { formatCm } from "../core/units";
import { tt } from "../core/i18n";

/**
 * VISOR DE DESPIECE (v0.3.77) — la máquina, y sus piezas una a una.
 *
 * La pantalla se parte en dos mitades del mismo tamaño, como en el diagrama:
 *
 *   · arriba, EL MODELO ARMADO. Sólo se mira y se orbita —aquí no se
 *     construye—, y su marco lleva reglas horizontal y vertical para
 *     dimensionar el proyecto de un vistazo.
 *   · abajo, EL INVENTARIO: una casilla por pieza, cuatro por fila y las que
 *     hagan falta hacia abajo, ORDENADAS DE MENOR A MAYOR. Es el despiece de
 *     la máquina, como las piezas sobre la mesa antes de montarla.
 *
 * Y las dos mitades se hablan:
 *
 *   · el cursor sobre una casilla PINTA DE ROJO esa pieza en la maqueta, que
 *     es la manera de contestar «¿y ésta dónde va?»;
 *   · el clic la deja SOLA en la viñeta, para mirarla por todos lados.
 *
 * LAS MINIATURAS SE PINTAN UNA SOLA VEZ, con un renderizador aparte que las
 * vuelca a PNG. Montar un lienzo 3D vivo por casilla sería pedirle al
 * navegador cincuenta contextos WebGL a la vez: se quedan sin memoria mucho
 * antes de llegar al final del inventario.
 */

/** Una casilla del inventario, con lo que hace falta para ordenarla. */
interface Casilla {
  obj: SceneObject;
  /** Diagonal de su caja (cm): con qué se ordena de menor a mayor. */
  talla: number;
  medidas: THREE.Vector3;
  celda: HTMLElement;
}

export class VisorPiezas {
  readonly root: HTMLElement;
  private grid: HTMLElement;
  private reglaH: HTMLElement;
  private reglaV: HTMLElement;
  private rotulo: HTMLElement;
  private casillas: Casilla[] = [];
  private aislada: string | null = null;
  private vivo = true;
  private retratista: Retratista | null = null;

  constructor(
    private editor: Editor,
    private nombre: string,
    private alSalir: () => void,
  ) {
    this.grid = el("div", { class: "visor-grid" });
    this.reglaH = el("div", { class: "visor-regla-h" });
    this.reglaV = el("div", { class: "visor-regla-v" });
    this.rotulo = el("div", { class: "visor-rotulo" }, ["…"]);

    const volver = el("button", { class: "tool" }, [tt("← Volver a Home", "← Back to Home")]);
    volver.addEventListener("click", () => this.alSalir());
    const completo = el("button", { class: "tool" }, [tt("Modelo completo", "Whole model")]);
    completo.addEventListener("click", () => this.mostrarTodo());

    this.root = el("div", { class: "visor" }, [
      el("div", { class: "visor-barra" }, [
        el("div", { class: "visor-nombre" }, [this.nombre]),
        el("div", { class: "visor-acts" }, [completo, volver]),
      ]),
      // La mitad de arriba la ocupa el lienzo del editor, que vive fuera de
      // este árbol: aquí van sólo el marco con sus reglas y el rótulo.
      el("div", { class: "visor-modelo" }, [this.reglaV, this.reglaH, this.rotulo]),
      el("div", { class: "visor-inventario" }, [
        el("div", { class: "visor-titulo" }, [
          tt("PIEZAS · de menor a mayor", "PARTS · smallest to largest"),
        ]),
        this.grid,
      ]),
    ]);

    document.body.classList.add("visor-abierto");
    this.montarInventario();
    this.seguirCamara();
    // EL ENCUADRE ES DEL PROYECTO, no de la escena. `setViewPreset` mide todo
    // lo que hay —suelo y rejilla incluidos— y con media pantalla de alto la
    // máquina quedaba diminuta en una esquina. Se espera un fotograma a que el
    // lienzo tenga su nueva altura y se encuadra lo que de verdad importa.
    requestAnimationFrame(() => this.encuadrar());
  }

  dispose(): void {
    this.vivo = false;
    document.body.classList.remove("visor-abierto");
    this.editor.senalarPieza(null);
    this.editor.aislarPieza(null);
    this.retratista?.dispose();
    this.root.remove();
  }

  // ------------------------------------------------------------ inventario

  private montarInventario(): void {
    clear(this.grid);
    this.casillas = [];
    const caja = new THREE.Box3();
    const tam = new THREE.Vector3();
    for (const obj of this.editor.listObjects()) {
      obj.mesh.updateMatrixWorld(true);
      caja.setFromObject(obj.mesh);
      if (!isFinite(caja.min.x)) continue;
      caja.getSize(tam);
      const celda = el("button", { class: "visor-celda" }, []);
      const casilla: Casilla = {
        obj,
        talla: tam.length(),
        medidas: tam.clone(),
        celda,
      };
      this.casillas.push(casilla);
    }
    // DE MENOR A MAYOR, por la diagonal de su caja: es la talla que ordena un
    // tornillo antes que un montante sin que importe hacia dónde sea largo.
    this.casillas.sort((a, b) => a.talla - b.talla);

    for (const c of this.casillas) {
      const lamina = el("div", { class: "visor-lamina" }, []);
      const medidas = `${formatCm(c.medidas.x)} × ${formatCm(c.medidas.y)} × ${formatCm(c.medidas.z)}`;
      c.celda.append(
        lamina,
        el("div", { class: "visor-celda-nombre" }, [c.obj.name]),
        el("div", { class: "visor-celda-medidas" }, [medidas]),
      );
      c.celda.title = `${c.obj.name} · ${medidas}`;
      // EL CURSOR PREGUNTA «¿DÓNDE VA?» y la maqueta contesta en rojo.
      c.celda.addEventListener("pointerenter", () => this.editor.senalarPieza(c.obj.id));
      c.celda.addEventListener("pointerleave", () => this.editor.senalarPieza(null));
      c.celda.addEventListener("click", () => this.aislar(c));
      this.grid.append(c.celda);
    }
    if (!this.casillas.length) {
      this.grid.append(
        el("div", { class: "land-empty" }, [
          tt("Este proyecto no tiene piezas.", "This project has no parts."),
        ]),
      );
      return;
    }
    void this.pintarMiniaturas();
  }

  /** Retratos de cada pieza, uno detrás de otro y sin bloquear la interfaz. */
  private async pintarMiniaturas(): Promise<void> {
    this.retratista = new Retratista(220);
    for (const c of this.casillas) {
      if (!this.vivo) break;
      const url = this.retratista.retratar(c.obj);
      const lamina = c.celda.querySelector(".visor-lamina");
      if (lamina && url) {
        (lamina as HTMLElement).style.backgroundImage = `url(${url})`;
        lamina.classList.add("lista");
      }
      // Un respiro entre pieza y pieza: con cincuenta piezas seguidas la
      // pestaña se queda congelada mientras se pintan.
      await new Promise((r) => setTimeout(r, 0));
    }
    this.retratista.dispose();
    this.retratista = null;
  }

  private aislar(c: Casilla): void {
    const yaEstaba = this.aislada === c.obj.id;
    this.aislada = yaEstaba ? null : c.obj.id;
    for (const otra of this.casillas) {
      otra.celda.classList.toggle("aislada", otra.obj.id === this.aislada);
    }
    this.editor.aislarPieza(this.aislada);
    this.encuadrar();
  }

  private mostrarTodo(): void {
    this.aislada = null;
    for (const c of this.casillas) c.celda.classList.remove("aislada");
    this.editor.aislarPieza(null);
    this.encuadrar();
  }

  /** Encuadra lo que esté a la vista (la máquina entera o la pieza sola). */
  private encuadrar(): void {
    const caja = this.editor.cajaDelProyecto();
    const centro = caja.getCenter(new THREE.Vector3());
    const radio = Math.max(caja.getSize(new THREE.Vector3()).length() / 2, 5);
    this.editor.encuadrarEn(centro, radio);
  }

  // ----------------------------------------------------------- las reglas

  /**
   * LAS REGLAS DEL MARCO. Dicen cuánto mide lo que se está viendo: se calcula
   * el ancho y el alto que abarca la cámara A LA DISTANCIA DEL MODELO y se
   * reparten marcas redondas (1, 2, 5, 10… cm) a lo largo del marco. Con una
   * cámara en perspectiva eso vale para el plano del modelo, que es donde se
   * mide; por eso el rótulo da además la medida EXACTA del conjunto.
   */
  private seguirCamara(): void {
    const paso = (): void => {
      if (!this.vivo) return;
      this.dibujarReglas();
      requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }

  private dibujarReglas(): void {
    const cam = this.editor.sceneManager.camera as THREE.PerspectiveCamera;
    const caja = this.editor.cajaDelProyecto();
    const tam = caja.getSize(new THREE.Vector3());
    const centro = caja.getCenter(new THREE.Vector3());
    const marco = this.root.querySelector(".visor-modelo") as HTMLElement | null;
    if (!marco || !cam.isPerspectiveCamera) return;
    const anchoPx = marco.clientWidth;
    const altoPx = marco.clientHeight;
    if (anchoPx < 20 || altoPx < 20) return;

    const dist = cam.position.distanceTo(centro);
    const altoCm = 2 * dist * Math.tan((cam.fov * Math.PI) / 360);
    const anchoCm = altoCm * (anchoPx / altoPx);
    this.pintarRegla(this.reglaH, anchoCm, anchoPx, false);
    this.pintarRegla(this.reglaV, altoCm, altoPx, true);

    const texto = this.aislada
      ? tt("Pieza sola", "Single part")
      : tt("Proyecto", "Project");
    this.rotulo.textContent =
      `${texto}: ${formatCm(tam.x)} × ${formatCm(tam.y)} × ${formatCm(tam.z)}`;
  }

  private pintarRegla(regla: HTMLElement, medidaCm: number, px: number, vertical: boolean): void {
    // Un paso redondo que deje entre 6 y 14 marcas a lo ancho del marco.
    const bruto = medidaCm / 10;
    const exp = Math.pow(10, Math.floor(Math.log10(Math.max(bruto, 1e-3))));
    const paso = [1, 2, 5, 10].map((k) => k * exp).find((v) => medidaCm / v <= 14) ?? exp * 10;
    const marcas = Math.floor(medidaCm / paso);
    const firma = `${paso}|${marcas}|${Math.round(px)}|${vertical}`;
    if (regla.dataset.firma === firma) return;
    regla.dataset.firma = firma;
    clear(regla);
    for (let i = 0; i <= marcas; i++) {
      const frac = (i * paso) / medidaCm;
      // El cero de la vertical cae justo encima del cero de la horizontal, en
      // la esquina: se rotula una sola vez.
      const rotula = i % 2 === 0 && !(vertical && i === 0);
      const marca = el("div", { class: "visor-marca" }, [
        el("span", {}, [rotula ? formatCm(i * paso) : ""]),
      ]);
      // La vertical se cuenta desde abajo: lo que mide es una ALTURA, y una
      // altura que crece hacia el suelo se lee mal.
      if (vertical) marca.style.bottom = `${frac * 100}%`;
      else marca.style.left = `${frac * 100}%`;
      regla.append(marca);
    }
  }
}

/**
 * EL RETRATISTA: un renderizador aparte que devuelve el PNG de una pieza.
 *
 * Se le pasa la pieza, se le presta su malla un instante —no se clona: una
 * malla de veinte mil triángulos clonada cincuenta veces es memoria que no
 * hace falta gastar—, se encuadra y se vuelca a `toDataURL`. Al acabar con
 * todas se suelta el contexto WebGL, que en un navegador son un recurso
 * contado.
 */
class Retratista {
  private renderer: THREE.WebGLRenderer;
  private escena = new THREE.Scene();
  private camara: THREE.PerspectiveCamera;

  constructor(lado: number) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(lado, lado, false);
    this.camara = new THREE.PerspectiveCamera(38, 1, 0.1, 100000);
    this.escena.add(new THREE.HemisphereLight(0xffffff, 0x3a3f48, 1.15));
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(120, 200, 140);
    this.escena.add(key);
    const relleno = new THREE.DirectionalLight(0xffffff, 0.5);
    relleno.position.set(-140, 60, -90);
    this.escena.add(relleno);
  }

  retratar(obj: SceneObject): string | null {
    const mesh = obj.mesh;
    const padre = mesh.parent;
    const pos = mesh.position.clone();
    const rot = mesh.quaternion.clone();
    const visible = mesh.visible;
    try {
      this.escena.add(mesh);
      mesh.position.set(0, 0, 0);
      mesh.quaternion.identity();
      mesh.visible = true;
      mesh.updateMatrixWorld(true);
      const caja = new THREE.Box3().setFromObject(mesh);
      if (!isFinite(caja.min.x)) return null;
      const centro = caja.getCenter(new THREE.Vector3());
      const radio = Math.max(caja.getSize(new THREE.Vector3()).length() / 2, 0.5);
      const d = radio / Math.tan((this.camara.fov * Math.PI) / 360) * 1.25;
      this.camara.position.set(centro.x + d * 0.72, centro.y + d * 0.52, centro.z + d * 0.72);
      this.camara.lookAt(centro);
      this.camara.updateProjectionMatrix();
      this.renderer.render(this.escena, this.camara);
      return this.renderer.domElement.toDataURL("image/png");
    } catch {
      return null;
    } finally {
      this.escena.remove(mesh);
      mesh.position.copy(pos);
      mesh.quaternion.copy(rot);
      mesh.visible = visible;
      padre?.add(mesh);
      mesh.updateMatrixWorld(true);
    }
  }

  dispose(): void {
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
