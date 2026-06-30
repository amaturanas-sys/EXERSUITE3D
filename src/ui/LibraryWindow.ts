import type { Editor } from "../core/Editor";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  COMPONENT_LIBRARY,
  PRIMITIVE_DEFS,
} from "../objects/componentLibrary";
import type { ComponentCategory, ComponentDefinition } from "../objects/types";
import { clear, el } from "./dom";

/**
 * Ventana de biblioteca: permite sustituir la primitiva básica de cada
 * componente por un modelo 3D diseñado en SketchUp / Nomad (.glb/.gltf/.obj).
 * Los modelos se guardan en el navegador y se aplican a todas las instancias.
 */
export class LibraryWindow {
  readonly root: HTMLElement;
  private listEl: HTMLElement;
  private fileInput: HTMLInputElement;
  private pendingId: string | null = null;
  private open = false;

  constructor(private editor: Editor) {
    this.listEl = el("div", { class: "lib-list" });

    this.fileInput = el("input", {
      type: "file",
      accept: ".glb,.gltf,.obj",
    });
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
        "Sustituye el dibujo básico de cualquier componente por un modelo 3D " +
          "(.glb, .gltf u .obj) hecho en SketchUp o Nomad. Se aplica a todas " +
          "sus piezas y se guarda en este navegador. También puedes colocar los " +
          "modelos como ficheros en la carpeta public/models/components/ " +
          "(ver LEEME.md) para sustituirlos sin usar la app.",
      ]),
      this.listEl,
      this.fileInput,
    ]);
    // Cerrar al hacer clic fuera del panel.
    this.root = el("div", { class: "lib-overlay", id: "library" }, [panel]);
    this.root.addEventListener("click", (e) => {
      if (e.target === this.root) this.hide();
    });
    this.root.style.display = "none";

    this.editor.bus.on("componentModelsChanged", () => {
      if (this.open) this.renderList();
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.open) this.hide();
    });
  }

  show(): void {
    this.open = true;
    this.root.style.display = "flex";
    this.renderList();
  }

  hide(): void {
    this.open = false;
    this.root.style.display = "none";
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
    const fileName = this.editor.getComponentModelName(def.id);
    const source = this.editor.getComponentModelSource(def.id);

    const swatch = el("span", { class: "swatch" });
    const accent = CATEGORY_COLORS[def.category];
    swatch.style.background = `#${accent.toString(16).padStart(6, "0")}`;

    let statusText = "Primitiva básica";
    if (has) {
      statusText =
        source === "file" ? `Modelo (archivo): ${fileName}` : `Modelo: ${fileName}`;
    }
    const status = el("span", { class: has ? "lib-status on" : "lib-status" }, [statusText]);

    const replace = el("button", { class: "tool" }, [has ? "Cambiar…" : "Sustituir…"]);
    replace.addEventListener("click", () => {
      this.pendingId = def.id;
      this.fileInput.value = "";
      this.fileInput.click();
    });

    const actions = el("div", { class: "lib-actions" }, [replace]);
    // Solo se puede "restablecer" un modelo puesto desde la app (usuario). Los
    // modelos de archivo se gestionan reemplazando el fichero en la carpeta.
    if (has && source === "user") {
      const reset = el("button", { class: "tool danger" }, ["Restablecer"]);
      reset.addEventListener("click", () => void this.editor.clearComponentModel(def.id));
      actions.append(reset);
    }

    return el("div", { class: "lib-row" }, [
      el("div", { class: "lib-info" }, [
        swatch,
        el("div", {}, [
          el("div", { class: "lib-name" }, [def.label]),
          status,
        ]),
      ]),
      actions,
    ]);
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
