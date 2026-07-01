import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  COMPONENT_LIBRARY,
  PRIMITIVE_DEFS,
} from "../objects/componentLibrary";
import type { ComponentCategory, ComponentDefinition } from "../objects/types";
import { buildGeometry } from "../objects/geometryFactory";
import { buildMaterial } from "../objects/materials";
import { componentModels } from "../core/componentModels";
import { ComponentPreview } from "./ComponentPreview";
import { clear, el } from "./dom";

/**
 * Biblioteca de repertorio como vista autónoma de la Home: NO crea la escena de
 * diseño; solo un visor 3D del ítem seleccionado, para editar el repertorio de
 * piezas con el mínimo de recursos.
 */
export class LibraryView {
  readonly root: HTMLElement;
  private listEl: HTMLElement;
  private detailEl: HTMLElement;
  private previewBox: HTMLElement;
  private fileInput: HTMLInputElement;
  private preview: ComponentPreview;
  private pendingId: string | null = null;
  private selectedId: string | null = null;
  private defs = new Map<string, ComponentDefinition>();
  private unsub: () => void;

  constructor(private onHome: () => void) {
    for (const def of [...PRIMITIVE_DEFS, ...COMPONENT_LIBRARY]) this.defs.set(def.id, def);

    this.listEl = el("div", { class: "lib-list" });
    this.previewBox = el("div", { class: "lib-preview" });
    this.detailEl = el("div", { class: "lib-detail-info" });

    this.fileInput = el("input", { type: "file", accept: ".glb,.gltf,.obj" });
    this.fileInput.style.display = "none";
    this.fileInput.addEventListener("change", () => void this.onFilePicked());

    const backBtn = el("button", { class: "tool" }, ["← Volver a Home"]);
    backBtn.addEventListener("click", () => this.onHome());

    const panel = el("div", { class: "lib-panel lib-view" }, [
      el("div", { class: "lib-header" }, [
        el("div", { class: "lib-title" }, ["Biblioteca de componentes"]),
        backBtn,
      ]),
      el("div", { class: "lib-intro" }, [
        "Revisa cada pieza por separado y sustitúyela por un modelo 3D " +
          "(.glb, .gltf u .obj) de SketchUp o Nomad. Se guarda en este navegador " +
          "y se aplica a todos los proyectos. También puedes reemplazar modelos " +
          "por fichero en public/models/components/ (ver LEEME.md).",
      ]),
      el("div", { class: "lib-body" }, [
        this.listEl,
        el("div", { class: "lib-detail" }, [this.previewBox, this.detailEl]),
      ]),
      this.fileInput,
    ]);
    this.root = el("div", { class: "landing lib-view-overlay" }, [panel]);

    this.preview = new ComponentPreview(this.previewBox);
    this.preview.start();

    this.unsub = componentModels.onChanged(() => {
      this.renderList();
      if (this.selectedId) this.selectComponent(this.selectedId);
    });

    this.renderList();
    const first = PRIMITIVE_DEFS[0]?.id ?? COMPONENT_LIBRARY[0]?.id;
    if (first) this.selectComponent(first);
  }

  /** Libera el visor 3D al salir de la biblioteca. */
  dispose(): void {
    this.unsub();
    this.preview.dispose();
    this.root.remove();
  }

  private renderList(): void {
    clear(this.listEl);
    const all = [...PRIMITIVE_DEFS, ...COMPONENT_LIBRARY];
    const byCat = new Map<ComponentCategory, ComponentDefinition[]>();
    for (const def of all) {
      (byCat.get(def.category) ?? byCat.set(def.category, []).get(def.category)!).push(def);
    }
    for (const [cat, defs] of byCat) {
      this.listEl.append(el("div", { class: "lib-cat" }, [CATEGORY_LABELS[cat] ?? cat]));
      for (const def of defs) this.listEl.append(this.row(def));
    }
  }

  private row(def: ComponentDefinition): HTMLElement {
    const has = componentModels.has(def.id);
    const swatch = el("span", { class: "swatch" });
    const accent = CATEGORY_COLORS[def.category];
    swatch.style.background = `#${accent.toString(16).padStart(6, "0")}`;

    const dot = el("span", { class: has ? "lib-dot on" : "lib-dot" }, []);
    const row = el(
      "button",
      { class: this.selectedId === def.id ? "lib-row selected" : "lib-row" },
      [el("div", { class: "lib-info" }, [swatch, el("div", { class: "lib-name" }, [def.label])]), dot],
    );
    row.addEventListener("click", () => this.selectComponent(def.id));
    return row;
  }

  private selectComponent(id: string): void {
    this.selectedId = id;
    const def = this.defs.get(id);
    if (!def) return;
    this.listEl.querySelectorAll(".lib-row").forEach((r) => r.classList.remove("selected"));
    [...this.listEl.querySelectorAll<HTMLButtonElement>(".lib-row")].forEach((r) => {
      if (r.querySelector(".lib-name")?.textContent === def.label) r.classList.add("selected");
    });

    const geo = componentModels.geometryClone(id) ?? buildGeometry(def.defaults);
    this.preview.show(geo, buildMaterial(def.materialId));
    this.renderDetail(def);
  }

  private renderDetail(def: ComponentDefinition): void {
    clear(this.detailEl);
    const has = componentModels.has(def.id);
    const source = componentModels.source(def.id);
    const fileName = componentModels.fileName(def.id);

    const statusText = has
      ? source === "file"
        ? `Modelo de archivo: ${fileName}`
        : `Modelo personalizado: ${fileName}`
      : "Primitiva básica (forma generada por defecto)";

    const replace = el("button", { class: "tool" }, [has ? "Cambiar modelo…" : "Sustituir por modelo…"]);
    replace.addEventListener("click", () => {
      this.pendingId = def.id;
      this.fileInput.value = "";
      this.fileInput.click();
    });
    const actions = el("div", { class: "lib-detail-actions" }, [replace]);
    if (has && source === "user") {
      const reset = el("button", { class: "tool danger" }, ["Restablecer"]);
      reset.addEventListener("click", () => void componentModels.clearUserModel(def.id));
      actions.append(reset);
    }

    this.detailEl.append(
      el("div", { class: "lib-detail-name" }, [def.label]),
      el("div", { class: has ? "lib-status on" : "lib-status" }, [statusText]),
      def.description ? el("div", { class: "lib-desc" }, [def.description]) : el("span"),
      actions,
    );
  }

  private async onFilePicked(): Promise<void> {
    const file = this.fileInput.files?.[0];
    const id = this.pendingId;
    this.pendingId = null;
    if (!file || !id) return;
    try {
      await componentModels.setUserModel(id, file);
    } catch (err) {
      console.error("No se pudo asignar el modelo:", err);
      window.alert("No se pudo cargar el modelo 3D para este componente.");
    }
    this.fileInput.value = "";
  }
}
