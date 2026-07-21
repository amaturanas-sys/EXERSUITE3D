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

/**
 * Configuración de la roldana antes de colocarla (diagrama Cables y Poleas):
 * interna (embutida en el pilar/travesaño, la rueda asoma por la apertura) o
 * externa (montada con soporte fuera de la cara).
 */
function elegirConfigRoldana(): Promise<"interna" | "externa" | null> {
  return new Promise((resolve) => {
    const terminar = (v: "interna" | "externa" | null): void => {
      overlay.remove();
      resolve(v);
    };
    const carta = (icono: string, titulo: string, detalle: string, v: "interna" | "externa") => {
      const c = el("button", { class: "wizard-carta" }, [
        el("div", { class: "wizard-icono" }, [icono]),
        el("div", { class: "wizard-nombre" }, [titulo]),
        el("div", { class: "wizard-detalle" }, [detalle]),
      ]);
      c.addEventListener("click", () => terminar(v));
      return c;
    };
    const cerrar = el("button", { class: "tool" }, ["✕"]);
    cerrar.addEventListener("click", () => terminar(null));
    const panel = el("div", { class: "perf-panel wizard-panel" }, [
      el("div", { class: "lib-header" }, [
        el("div", { class: "lib-title" }, ["Roldana: configuración"]),
        cerrar,
      ]),
      el("div", { class: "wizard-paso" }, [
        "Después, toca la cara de la pieza donde colocarla.",
      ]),
      el("div", { class: "wizard-cartas" }, [
        carta(
          "🅐",
          "Roldana externa",
          "Montada fuera de la cara de la pieza: el cable pasa por fuera.",
          "externa",
        ),
        carta(
          "🅑",
          "Roldana interna",
          "Embutida dentro del pilar/travesaño: la rueda asoma por la apertura y el cable se reenvía por dentro.",
          "interna",
        ),
      ]),
    ]);
    const overlay = el("div", { class: "lib-overlay wizard-overlay" }, [panel]);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) terminar(null);
    });
    document.body.append(overlay);
  });
}

/** Categorías visibles en el modo de trabajo Sencillo (asistente de Nuevo). */
const CATS_SENCILLO: ComponentDefinition["category"][] = [
  "primitiva",
  "estructural",
  "peso",
  "ergonomico",
];

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

  private renderGroups(body: HTMLElement): void {
    clear(body);
    const sencillo = this.editor.getWorkspace()?.modo === "sencillo";
    const all = [...PRIMITIVE_DEFS, ...COMPONENT_LIBRARY].filter(
      (d) => !sencillo || CATS_SENCILLO.includes(d.category),
    );
    if (sencillo) {
      body.append(el("div", { class: "palette-modo" }, ["Modo sencillo · piezas básicas"]));
    }
    // Máquinas estándar (prefabs agrupados): clave para plantear la sala.
    body.append(el("div", { class: "cat-label" }, ["Máquinas estándar"]));
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
      body.append(btn);
    }
    const byCat = new Map<ComponentDefinition["category"], ComponentDefinition[]>();
    for (const def of all) {
      (byCat.get(def.category) ?? byCat.set(def.category, []).get(def.category)!).push(def);
    }
    for (const [cat, defs] of byCat) {
      body.append(el("div", { class: "cat-label" }, [CATEGORY_LABELS[cat] ?? cat]));
      for (const def of defs) {
        body.append(this.componentButton(def));
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
        // Punto de deslizamiento del cable: se configura y se coloca sobre
        // la cara de una pieza existente (diagrama Cables y Poleas).
        void elegirConfigRoldana().then((c) => c && this.editor.beginRoldana(c));
      } else if (def.id === "terminal-cable") {
        // Punto de anclaje de cable sobre una cara (ojal terminal).
        this.editor.beginTerminalCable();
      } else this.editor.addComponent(def.id);
    });
    // Las piezas de colocación directa también se pueden ARRASTRAR al visor.
    if (!def.placement && def.id !== "roldana" && def.id !== "terminal-cable") {
      this.habilitarArrastre(btn, (suelo) => void this.editor.addComponentAt(def.id, suelo));
    }
    return btn;
  }
}
