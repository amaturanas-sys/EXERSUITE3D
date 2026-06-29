import type { Editor } from "../core/Editor";
import {
  CATEGORY_LABELS,
  COMPONENT_LIBRARY,
  PRIMITIVE_DEFS,
} from "../objects/componentLibrary";
import type { ComponentDefinition } from "../objects/types";
import { clear, el } from "./dom";

/** Panel izquierdo: paleta de componentes agrupados por categoria. */
export class ComponentPalette {
  readonly root: HTMLElement;

  constructor(private editor: Editor) {
    const body = el("div", { class: "panel-body" });
    this.renderGroups(body);
    this.root = el("aside", { class: "panel", id: "palette" }, [
      el("div", { class: "panel-title" }, ["Componentes"]),
      body,
    ]);
  }

  private renderGroups(body: HTMLElement): void {
    clear(body);
    const all = [...PRIMITIVE_DEFS, ...COMPONENT_LIBRARY];
    const byCat = new Map<string, ComponentDefinition[]>();
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
    swatch.style.background = `#${def.color.toString(16).padStart(6, "0")}`;
    const btn = el(
      "button",
      { class: "comp-btn", title: def.description },
      [swatch, def.label],
    );
    btn.addEventListener("click", () => this.editor.addComponent(def.id));
    return btn;
  }
}
