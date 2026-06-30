import type { Editor } from "../core/Editor";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  COMPONENT_LIBRARY,
  PRIMITIVE_DEFS,
} from "../objects/componentLibrary";
import type { ComponentCategory, ComponentDefinition } from "../objects/types";
import { buildGeometry } from "../objects/geometryFactory";
import { buildMaterial } from "../objects/materials";
import { ComponentPreview } from "./ComponentPreview";
import { clear, el } from "./dom";

/**
 * Ventana de biblioteca: explora cada componente individualmente con una
 * vista previa 3D y permite sustituirlo por un modelo importado
 * (.glb/.gltf/.obj) sin cargar un proyecto completo.
 */
export class LibraryWindow {
  readonly root: HTMLElement;
  private listEl: HTMLElement;
  private detailEl: HTMLElement;
  private previewBox: HTMLElement;
  private fileInput: HTMLInputElement;
  private preview: ComponentPreview | null = null;
  private pendingId: string | null = null;
  private selectedId: string | null = null;
  private open = false;
  private defs = new Map<string, ComponentDefinition>();

  constructor(private editor: Editor) {
    for (const def of [...PRIMITIVE_DEFS, ...COMPONENT_LIBRARY]) this.defs.set(def.id, def);

    this.listEl = el("div", { class: "lib-list" });
    this.previewBox = el("div", { class: "lib-preview" });
    this.detailEl = el("div", { class: "lib-detail-info" });

    this.fileInput = el("input", { type: "file", accept: ".glb,.gltf,.obj" });
    this.fileInput.style.display = "none";
    this.fileInput.addEventListener("change", () => void this.onFilePicked());

    const closeBtn = el("button", { class: "tool", title: "Cerrar" }, ["Cerrar"]);
    closeBtn.addEventListener("click", () => this.hide());

    const panel = el("div", { class: "lib-panel" }, [
      el("div", { class: "lib-header" }, [
        el("div", { class: "lib-title" }, ["Biblioteca de componentes"]),
        closeBtn,
      ]),
      el("div", { class: "lib-intro" }, [
        "Explora cada pieza por separado y sustitúyela por un modelo 3D " +
          "(.glb, .gltf u .obj) de SketchUp o Nomad. Se aplica a todas sus " +
          "instancias y se guarda en este navegador. También puedes reemplazar " +
          "modelos por fichero en public/models/components/ (ver LEEME.md).",
      ]),
      el("div", { class: "lib-body" }, [
        this.listEl,
        el("div", { class: "lib-detail" }, [this.previewBox, this.detailEl]),
      ]),
      this.fileInput,
    ]);

    this.root = el("div", { class: "lib-overlay", id: "library" }, [panel]);
    this.root.addEventListener("click", (e) => {
      if (e.target === this.root) this.hide();
    });
    this.root.style.display = "none";

    this.editor.bus.on("componentModelsChanged", () => {
      if (this.open) {
        this.renderList();
        if (this.selectedId) this.selectComponent(this.selectedId);
      }
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.open) this.hide();
    });
  }

  show(): void {
    this.open = true;
    this.root.style.display = "flex";
    if (!this.preview) this.preview = new ComponentPreview(this.previewBox);
    this.preview.start();
    this.renderList();
    const first = this.selectedId ?? PRIMITIVE_DEFS[0]?.id ?? COMPONENT_LIBRARY[0]?.id;
    if (first) this.selectComponent(first);
  }

  hide(): void {
    this.open = false;
    this.root.style.display = "none";
    this.preview?.stop(); // libera el bucle de render mientras está oculta
  }

  toggle(): void {
    if (this.open) this.hide();
    else this.show();
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
    const has = this.editor.hasComponentModel(def.id);
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
    // Resalta la fila activa.
    this.listEl.querySelectorAll(".lib-row").forEach((r) => r.classList.remove("selected"));
    [...this.listEl.querySelectorAll<HTMLButtonElement>(".lib-row")].forEach((r) => {
      if (r.querySelector(".lib-name")?.textContent === def.label) r.classList.add("selected");
    });

    // Previsualiza la geometría activa (modelo o primitiva).
    if (this.preview) {
      const geo = this.editor.getComponentModelGeometryClone(id) ?? buildGeometry(def.defaults);
      this.preview.show(geo, buildMaterial(def.materialId));
    }

    this.renderDetail(def);
  }

  private renderDetail(def: ComponentDefinition): void {
    clear(this.detailEl);
    const has = this.editor.hasComponentModel(def.id);
    const source = this.editor.getComponentModelSource(def.id);
    const fileName = this.editor.getComponentModelName(def.id);

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
      reset.addEventListener("click", () => void this.editor.clearComponentModel(def.id));
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
      await this.editor.setComponentModel(id, file);
    } catch (err) {
      console.error("No se pudo asignar el modelo:", err);
      window.alert("No se pudo cargar el modelo 3D para este componente.");
    }
    this.fileInput.value = "";
  }
}
