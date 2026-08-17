import type { Editor } from "../core/Editor";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  COMPONENT_LIBRARY,
  PRIMITIVE_DEFS,
} from "../objects/componentLibrary";
import type { ComponentDefinition } from "../objects/types";
import { componentModels } from "../core/componentModels";
import { STANDARD_MACHINES } from "../objects/standardMachines";
import { configurarDentada, configureBeam, configureTube } from "./lineToolDialog";
import { pasoMinimoDentada } from "../objects/placaDentada";
import { tt } from "../core/i18n";
import { clear, el } from "./dom";

type RoldanaConfig = {
  tipo: "interna" | "externa";
  dir: "arriba" | "abajo" | "izquierda" | "derecha" | "anterior" | "posterior";
};

/**
 * Configuración de la roldana al elegir el punto del eje (herramienta en dos
 * pasos, v0.2.26; panel compacto v0.2.28): tipo (externa: montada fuera de la
 * cara con su soporte; interna: alojada dentro del perfil con sus aperturas) y
 * dirección a la que va dirigida — arriba/abajo/derecha/izquierda/anterior/
 * posterior respecto de los ejes GLOBALES del proyecto.
 *
 * El panel es PEQUEÑO y va anclado al costado derecho, SIN velo de fondo: el
 * modelo se sigue viendo y se puede orbitar en vivo mientras se decide.
 */
function elegirConfigRoldana(): Promise<RoldanaConfig | null> {
  return new Promise((resolve) => {
    let tipo: "interna" | "externa" = "externa";
    const terminar = (v: RoldanaConfig | null): void => {
      window.removeEventListener("keydown", alTeclado);
      panel.remove();
      document.body.classList.remove("dialogo-derecha");
      resolve(v);
    };
    // Esc cierra el panel (misma tecla que termina la herramienta).
    const alTeclado = (ev: KeyboardEvent): void => {
      if (ev.key === "Escape") terminar(null);
    };
    window.addEventListener("keydown", alTeclado);

    // Tipo: dos opciones compactas en fila, con la elegida resaltada.
    const bTipo = new Map<"externa" | "interna", HTMLElement>();
    const pintarTipo = (): void => {
      for (const [k, b] of bTipo) b.classList.toggle("active", k === tipo);
    };
    const opcTipo = (k: "externa" | "interna", icono: string, titulo: string, ayuda: string) => {
      const b = el("button", { class: "rold-opt", title: ayuda }, [
        el("span", { class: "rold-icono" }, [icono]),
        el("span", {}, [titulo]),
      ]);
      b.addEventListener("click", () => {
        tipo = k;
        pintarTipo();
      });
      bTipo.set(k, b);
      return b;
    };

    const dir = (icono: string, titulo: string, v: RoldanaConfig["dir"], ayuda: string) => {
      const b = el("button", { class: "rold-dir", title: ayuda }, [
        el("span", { class: "rold-icono" }, [icono]),
        el("span", {}, [titulo]),
      ]);
      b.addEventListener("click", () => terminar({ tipo, dir: v }));
      return b;
    };

    const cerrar = el("button", { class: "tool rold-cerrar", title: "Cancelar" }, ["✕"]);
    cerrar.addEventListener("click", () => terminar(null));

    const panel = el("aside", { id: "rold-panel" }, [
      el("div", { class: "rold-head" }, [
        el("span", { class: "rold-titulo" }, [tt("Roldana", "Sheave")]),
        cerrar,
      ]),
      el("div", { class: "rold-seccion" }, [tt("Montaje", "Mounting")]),
      el("div", { class: "rold-tipos" }, [
        opcTipo(
          "externa",
          "🅐",
          tt("Externa", "External"),
          tt(
            "Montada fuera de la cara, con su soporte a la estructura.",
            "Mounted outside the face, with its bracket to the structure.",
          ),
        ),
        opcTipo(
          "interna",
          "🅑",
          tt("Interna", "Internal"),
          tt(
            "Alojada dentro del perfil, con aperturas de cable en las dos caras.",
            "Housed inside the profile, with cable slots on both faces.",
          ),
        ),
      ]),
      el("div", { class: "rold-seccion" }, [
        tt("Dirección (ejes globales)", "Direction (global axes)"),
      ]),
      el("div", { class: "rold-dirs" }, [
        dir("⬆", tt("Arriba", "Up"), "arriba", "+Y"),
        dir("⬇", tt("Abajo", "Down"), "abajo", "−Y"),
        dir("➡", tt("Derecha", "Right"), "derecha", "+X"),
        dir("⬅", tt("Izquierda", "Left"), "izquierda", "−X"),
        dir("⧉", tt("Anterior", "Front"), "anterior", "+Z"),
        dir("⧈", tt("Posterior", "Back"), "posterior", "−Z"),
      ]),
      el("div", { class: "rold-pie" }, [
        tt(
          "Puedes orbitar el modelo mientras eliges.",
          "You can orbit the model while choosing.",
        ),
      ]),
    ]);
    pintarTipo();
    document.body.append(panel);
    // El carril derecho aloja UNA ventana a la vez: mientras este diálogo
    // esté abierto, la del maniquí se repliega (v0.2.48).
    document.body.classList.add("dialogo-derecha");
  });
}

/**
 * Piezas visibles en el modo Sencillo (v0.2.3): SOLO lo rudimentario — es lo
 * que lo distingue del modo Profesional del Builder. Máquinas estándar
 * completas + primitivas + un puñado de piezas básicas.
 */
const COMPS_SENCILLO = new Set([
  "prim-box",
  "prim-cylinder",
  "prim-sphere",
  "pilar",
  "base-soporte",
  "barra-dominadas",
  "disco-peso",
  "barra-olimpica",
  "asiento",
  "respaldo",
]);

/**
 * Panel izquierdo: bandeja de "piezas disponibles" (estilo set de Lego). Cada
 * pieza se coloca en el diseño con el modelo 3D que le haya asignado la
 * biblioteca (que se edita en un entorno aparte, desde la Home).
 */
export class ComponentPalette {
  readonly root: HTMLElement;
  private body: HTMLElement;
  private unsub: () => void;
  private unsubWorkspace: () => void;

  constructor(private editor: Editor) {
    // La herramienta de roldana pide tipo + dirección al elegir el punto.
    this.editor.elegirRoldana = elegirConfigRoldana;
    this.body = el("div", { class: "panel-body" });
    this.renderGroups(this.body);
    this.root = el("aside", { class: "panel", id: "palette" }, [
      this.brandHeader(),
      el("div", { class: "panel-title" }, ["Piezas disponibles"]),
      this.body,
    ]);
    // Refresca los indicadores cuando cambia el repertorio de la biblioteca.
    this.unsub = componentModels.onChanged(() => this.renderGroups(this.body));
    // El modo de trabajo (sencillo/profesional) filtra las categorías visibles.
    this.unsubWorkspace = editor.bus.on("workspaceChanged", () =>
      this.renderGroups(this.body),
    );
  }

  dispose(): void {
    this.unsub();
    this.unsubWorkspace();
  }

  /** Cabecera de marca EXERSUITE3D en la parte superior de la paleta. */
  private brandHeader(): HTMLElement {
    const img = el("img", {
      src: `${import.meta.env.BASE_URL}brand/logo-mark.png`,
      alt: "EXERSUITE3D",
    });
    return el("div", { class: "brand-header", title: "EXERSUITE3D" }, [
      el("div", { class: "brand-badge" }, [img]),
      el("div", { class: "brand-word" }, [
        el("b", {}, ["EXERSUITE3D"]),
        el("span", {}, ["Gym machine design"]),
      ]),
    ]);
  }

  /**
   * Estado de plegado de cada subcategoría de la paleta (v0.2.21):
   * persiste en el dispositivo — la interfaz queda tan limpia como el
   * usuario la deje entre sesiones y re-renderizados.
   */
  private plegado: Record<string, boolean> = (() => {
    try {
      return JSON.parse(localStorage.getItem("paleta-plegado") ?? "{}") as Record<string, boolean>;
    } catch {
      return {};
    }
  })();

  /**
   * SUBCATEGORÍA PLEGABLE (v0.2.21): cada grupo de la paleta se pliega o
   * despliega tocando su título — la lista larga se navega por secciones.
   * Devuelve el contenedor donde van los botones del grupo.
   */
  private seccionPlegable(
    body: HTMLElement,
    titulo: string,
    clave: string,
    porDefectoPlegada = false,
  ): HTMLElement {
    const plegada = this.plegado[clave] ?? porDefectoPlegada;
    const cab = el("div", { class: "cat-label cat-plegable" }, [
      `${titulo} ${plegada ? "▸" : "▾"}`,
    ]);
    cab.title = "Toca para plegar o desplegar la sección";
    const cont = el("div", { class: `cat-cont${plegada ? " oculto" : ""}` });
    cab.addEventListener("click", () => {
      const p = cont.classList.toggle("oculto");
      this.plegado[clave] = p;
      try {
        localStorage.setItem("paleta-plegado", JSON.stringify(this.plegado));
      } catch {
        /* sin almacenamiento */
      }
      cab.textContent = `${titulo} ${p ? "▸" : "▾"}`;
    });
    body.append(cab, cont);
    return cont;
  }

  private renderGroups(body: HTMLElement): void {
    clear(body);
    const sencillo = this.editor.getWorkspace()?.modo === "sencillo";
    // CURADURÍA (v0.2.18) + v0.2.28: la paleta lista SOLO las piezas sin
    // etiqueta de curaduría — las "oculta" (redundantes o plantillas
    // internas) y las "despiece" (piezas internas de las máquinas reales,
    // cuya subpestaña TTP/POWERRACK se eliminó) quedan fuera. Solo cambia
    // la paleta: prefabs y máquinas siguen resolviendo TODOS los ids.
    // El modo Sencillo conserva SU propia lista blanca tal cual.
    const all = [...PRIMITIVE_DEFS, ...COMPONENT_LIBRARY].filter(
      (d) => (sencillo ? COMPS_SENCILLO.has(d.id) : !d.paleta),
    );
    if (sencillo) {
      body.append(el("div", { class: "palette-modo" }, ["Modo sencillo · piezas básicas"]));
    }
    // Máquinas estándar (prefabs agrupados): clave para plantear la sala.
    const contMaquinas = this.seccionPlegable(body, "Máquinas estándar", "maquinas");
    for (const m of STANDARD_MACHINES) {
      const btn = el("button", { class: "comp-btn maquina-btn", title: m.description }, [
        el("span", { class: "swatch maquina-icon" }, [m.icon]),
        m.label,
      ]);
      btn.addEventListener("click", () => {
        if (this.consumeDragClick()) return;
        this.editor.insertarMaquina(m.id);
      });
      this.habilitarArrastre(btn, (suelo) => this.editor.insertarMaquina(m.id, suelo));
      contMaquinas.append(btn);
    }
    const byCat = new Map<ComponentDefinition["category"], ComponentDefinition[]>();
    for (const def of all) {
      (byCat.get(def.category) ?? byCat.set(def.category, []).get(def.category)!).push(def);
    }
    for (const [cat, defs] of byCat) {
      const cont = this.seccionPlegable(body, CATEGORY_LABELS[cat] ?? cat, `cat:${cat}`);
      for (const def of defs) {
        cont.append(this.componentButton(def));
      }
    }
  }

  // ----------------------------------------------- arrastrar y soltar (F4)
  /** True (y consume) si el click viene de terminar un arrastre. */
  private dragJustEnded = false;
  private consumeDragClick(): boolean {
    const was = this.dragJustEnded;
    this.dragJustEnded = false;
    return was;
  }

  /**
   * Arrastrar una pieza de la paleta al visor la coloca donde se suelta.
   * Ratón: basta con moverse unos px. Táctil: mantén pulsado ~0,3 s (para no
   * pelear con el scroll de la paleta) y arrastra.
   */
  private habilitarArrastre(
    btn: HTMLElement,
    colocar: (suelo: import("three").Vector3) => void,
  ): void {
    btn.addEventListener("pointerdown", (down) => {
      if (down.button !== 0) return;
      let dragging = false;
      let ghost: HTMLElement | null = null;
      const startX = down.clientX;
      const startY = down.clientY;
      const esTactil = down.pointerType !== "mouse";

      const empezar = (): void => {
        if (dragging) return;
        dragging = true;
        try {
          btn.setPointerCapture(down.pointerId);
        } catch {
          /* sin captura */
        }
        ghost = el("div", { class: "drag-ghost" }, [btn.textContent ?? ""]);
        document.body.append(ghost);
        moverGhost(startX, startY);
      };
      const moverGhost = (x: number, y: number): void => {
        if (ghost) {
          ghost.style.left = `${x + 12}px`;
          ghost.style.top = `${y + 12}px`;
        }
      };
      // Táctil: mantener pulsado activa el arrastre (el scroll no lo hace).
      const timer = esTactil ? window.setTimeout(empezar, 300) : null;

      const onMove = (e: PointerEvent): void => {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (!dragging && !esTactil && Math.hypot(dx, dy) > 6) empezar();
        if (dragging) {
          e.preventDefault();
          moverGhost(e.clientX, e.clientY);
        }
      };
      const onUp = (e: PointerEvent): void => {
        if (timer !== null) clearTimeout(timer);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onCancel);
        ghost?.remove();
        if (!dragging) return;
        this.dragJustEnded = true;
        // Suelta sobre el visor: coloca la pieza en ese punto del suelo.
        const viewport = document.getElementById("viewport");
        const r = viewport?.getBoundingClientRect();
        const sobreVisor =
          !!r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        const fueraPaleta = !this.root.contains(document.elementFromPoint(e.clientX, e.clientY));
        if (sobreVisor && fueraPaleta) {
          const suelo = this.editor.screenToGround(e.clientX, e.clientY);
          if (suelo) colocar(suelo);
        }
      };
      const onCancel = (): void => {
        if (timer !== null) clearTimeout(timer);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onCancel);
        ghost?.remove();
      };
      window.addEventListener("pointermove", onMove, { passive: false });
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onCancel);
    });
  }

  private componentButton(def: ComponentDefinition): HTMLElement {
    const swatch = el("span", { class: "swatch" });
    const accent = CATEGORY_COLORS[def.category];
    swatch.style.background = `#${accent.toString(16).padStart(6, "0")}`;
    // Marca las piezas con modelo 3D propio (asignado en la biblioteca).
    const modeled = componentModels.has(def.id);
    const title = modeled
      ? `${def.description} · con modelo 3D de la biblioteca`
      : def.description;
    const children: (Node | string)[] = [swatch, def.label];
    if (modeled) children.push(el("span", { class: "comp-modeled", title: "Modelo 3D" }, []));
    const btn = el("button", { class: "comp-btn", title }, children);
    btn.addEventListener("click", () => {
      if (this.consumeDragClick()) return;
      if (def.placement === "rope-chain") this.editor.beginRope("chain");
      else if (def.placement === "rope-strap") this.editor.beginRope("strap");
      else if (def.placement === "beam") {
        void configureBeam().then((p) => p && this.editor.beginLine("beam", p));
      } else if (def.placement === "tube") {
        void configureTube().then((p) => p && this.editor.beginLine("tube", p));
      } else if (def.id === "roldana") {
        // Herramienta en dos pasos (v0.2.26): estructura → punto del eje
        // azul → tipo + dirección (el diálogo aparece al elegir el punto).
        this.editor.beginRoldana();
      } else if (def.id === "placa-dentada") {
        // Herramienta en tres toques (v0.2.73): cara del pilar → principio →
        // final. Solo se pregunta el INTERVALO entre ganchos: el ancho lo copia
        // de la cara y el largo sale de los dos puntos.
        void configurarDentada(pasoMinimoDentada(def.defaults)).then(
          (cfg) => cfg && this.editor.beginPlacaDentada(cfg.dienteEspaciado),
        );
      } else if (def.id === "terminal-cable") {
        // Punto de anclaje de cable sobre una cara (ojal terminal).
        this.editor.beginTerminalCable();
      } else if (def.id === "puente-carro-ttp") {
        // El carro SIEMPRE nace con sus dos roldanas funcionales y su
        // física de transmisión (rol: transmitir fuerza entre roldanas).
        this.editor.insertarCarroDoble();
      } else this.editor.addComponent(def.id);
    });
    // Las piezas de colocación directa también se pueden ARRASTRAR al visor.
    if (
      !def.placement &&
      def.id !== "roldana" &&
      def.id !== "terminal-cable" &&
      def.id !== "placa-dentada"
    ) {
      if (def.id === "puente-carro-ttp") {
        this.habilitarArrastre(btn, (suelo) => this.editor.insertarCarroDoble(suelo));
      } else {
        this.habilitarArrastre(btn, (suelo) => void this.editor.addComponentAt(def.id, suelo));
      }
    }
    return btn;
  }
}
