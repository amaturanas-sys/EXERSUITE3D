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
import { configureBeam, configureTube } from "./lineToolDialog";
import { clear, el } from "./dom";

type RoldanaConfig = {
  tipo: "interna" | "externa";
  dir: "arriba" | "abajo" | "izquierda" | "derecha";
};

/**
 * Configuración de la roldana al elegir el punto del eje (herramienta en dos
 * pasos, v0.2.26): tipo (externa: montada fuera de la cara; interna: embutida
 * con la rueda asomando por la apertura) y dirección a la que va dirigida —
 * arriba/abajo/izquierda/derecha, relativas a lo que se ve en pantalla.
 */
function elegirConfigRoldana(): Promise<RoldanaConfig | null> {
  return new Promise((resolve) => {
    let tipo: "interna" | "externa" | null = null;
    const terminar = (v: RoldanaConfig | null): void => {
      overlay.remove();
      resolve(v);
    };
    const carta = (icono: string, titulo: string, detalle: string, fn: () => void) => {
      const c = el("button", { class: "wizard-carta" }, [
        el("div", { class: "wizard-icono" }, [icono]),
        el("div", { class: "wizard-nombre" }, [titulo]),
        el("div", { class: "wizard-detalle" }, [detalle]),
      ]);
      c.addEventListener("click", fn);
      return c;
    };
    const cuerpo = el("div", {}, []);
    const paso = el("div", { class: "wizard-paso" }, []);
    const pasoTipo = (): void => {
      paso.textContent = "1/2 · ¿Cómo va montada en la estructura?";
      clear(cuerpo);
      cuerpo.append(
        el("div", { class: "wizard-cartas" }, [
          carta(
            "🅐",
            "Roldana externa",
            "Montada fuera de la cara de la estructura: el cable pasa por fuera.",
            () => {
              tipo = "externa";
              pasoDir();
            },
          ),
          carta(
            "🅑",
            "Roldana interna",
            "Embutida en el eje central: la rueda asoma por la apertura y el cable se reenvía por dentro.",
            () => {
              tipo = "interna";
              pasoDir();
            },
          ),
        ]),
      );
    };
    const pasoDir = (): void => {
      paso.textContent = "2/2 · ¿Hacia qué dirección va dirigida? (según lo que ves en pantalla)";
      clear(cuerpo);
      const dir = (icono: string, titulo: string, v: RoldanaConfig["dir"]) =>
        carta(icono, titulo, "", () => terminar({ tipo: tipo ?? "externa", dir: v }));
      cuerpo.append(
        el("div", { class: "wizard-cartas" }, [
          dir("⬆️", "Arriba", "arriba"),
          dir("⬇️", "Abajo", "abajo"),
          dir("⬅️", "Izquierda", "izquierda"),
          dir("➡️", "Derecha", "derecha"),
        ]),
      );
    };
    const cerrar = el("button", { class: "tool" }, ["✕"]);
    cerrar.addEventListener("click", () => terminar(null));
    const panel = el("div", { class: "perf-panel wizard-panel" }, [
      el("div", { class: "lib-header" }, [
        el("div", { class: "lib-title" }, ["Roldana: configuración"]),
        cerrar,
      ]),
      paso,
      cuerpo,
    ]);
    const overlay = el("div", { class: "lib-overlay wizard-overlay" }, [panel]);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) terminar(null);
    });
    pasoTipo();
    document.body.append(overlay);
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
    // CURADURÍA (v0.2.18): las piezas "oculta" no aparecen (redundantes o
    // plantillas internas) y las "despiece" van a su propia sección
    // plegable al final. Solo cambia la paleta: prefabs y máquinas siguen
    // resolviendo TODOS los ids de la biblioteca.
    // El modo Sencillo conserva SU propia lista blanca tal cual (incluida
    // la barra de dominadas genérica): la curaduría rige la paleta
    // profesional.
    const all = [...PRIMITIVE_DEFS, ...COMPONENT_LIBRARY].filter(
      (d) => (sencillo ? COMPS_SENCILLO.has(d.id) : d.paleta !== "oculta"),
    );
    const despiece = all.filter((d) => d.paleta === "despiece");
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
      if (def.paleta === "despiece") continue;
      (byCat.get(def.category) ?? byCat.set(def.category, []).get(def.category)!).push(def);
    }
    for (const [cat, defs] of byCat) {
      const cont = this.seccionPlegable(body, CATEGORY_LABELS[cat] ?? cat, `cat:${cat}`);
      for (const def of defs) {
        cont.append(this.componentButton(def));
      }
    }
    // Despiece TTP/POWERRACK: las piezas INTERNAS de las máquinas reales,
    // agrupadas y plegadas de fábrica — disponibles sin saturar la paleta.
    if (despiece.length > 0 && !sencillo) {
      const cont = this.seccionPlegable(body, "Despiece TTP / POWERRACK", "despiece", true);
      cont.classList.add("despiece-cont");
      for (const def of despiece) cont.append(this.componentButton(def));
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
    if (!def.placement && def.id !== "roldana" && def.id !== "terminal-cable") {
      if (def.id === "puente-carro-ttp") {
        this.habilitarArrastre(btn, (suelo) => this.editor.insertarCarroDoble(suelo));
      } else {
        this.habilitarArrastre(btn, (suelo) => void this.editor.addComponentAt(def.id, suelo));
      }
    }
    return btn;
  }
}
