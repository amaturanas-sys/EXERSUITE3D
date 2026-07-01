import type { Editor } from "../core/Editor";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  COMPONENT_LIBRARY,
  PRIMITIVE_DEFS,
} from "../objects/componentLibrary";
import type { ComponentDefinition } from "../objects/types";
import { componentModels } from "../core/componentModels";
import { clear, el } from "./dom";

/**
 * Panel izquierdo: bandeja de "piezas disponibles" (estilo set de Lego). Cada
 * pieza se coloca en el diseño con el modelo 3D que le haya asignado la
 * biblioteca (que se edita en un entorno aparte, desde la Home).
 */
export class ComponentPalette {
  readonly root: HTMLElement;
  private body: HTMLElement;
  private unsub: () => void;

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
  }

  dispose(): void {
    this.unsub();
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
    const all = [...PRIMITIVE_DEFS, ...COMPONENT_LIBRARY];
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
      if (def.placement === "rope-chain") this.editor.beginRope("chain");
      else if (def.placement === "rope-strap") this.editor.beginRope("strap");
      else this.editor.addComponent(def.id);
    });
    return btn;
  }
}
