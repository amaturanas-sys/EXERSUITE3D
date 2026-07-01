import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  COMPONENT_LIBRARY,
  PRIMITIVE_DEFS,
} from "../objects/componentLibrary";
import type { ComponentCategory, ComponentDefinition } from "../objects/types";
import { buildGeometry } from "../objects/geometryFactory";
import { buildMaterial } from "../objects/materials";
import { componentModels, type ImportEntry, type ImportStatus } from "../core/componentModels";
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

    const exportBtn = el("button", { class: "tool", title: "Descargar todos los modelos en un ZIP" }, [
      "Exportar ZIP",
    ]);
    exportBtn.addEventListener("click", () => void this.exportLibrary());

    const zipInput = el("input", { type: "file", accept: ".zip,application/zip" });
    zipInput.style.display = "none";
    zipInput.addEventListener("change", () => void this.onImportZip(zipInput));
    const importBtn = el("button", { class: "tool", title: "Cargar un ZIP de modelos y fusionar" }, [
      "Importar ZIP",
    ]);
    importBtn.addEventListener("click", () => zipInput.click());

    const panel = el("div", { class: "lib-panel lib-view" }, [
      el("div", { class: "lib-header" }, [
        el("div", { class: "lib-title" }, ["Biblioteca de componentes"]),
        el("div", { class: "lib-header-actions" }, [exportBtn, importBtn, backBtn]),
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
      zipInput,
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

  // ------------------------------------------------ exportar / importar bulk
  private async exportLibrary(): Promise<void> {
    try {
      const zip = await componentModels.exportZip();
      const blob = new Blob([zip as unknown as BlobPart], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "exersuite3d-biblioteca.zip";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("No se pudo exportar la biblioteca:", err);
      window.alert("No se pudo exportar la biblioteca.");
    }
  }

  private async onImportZip(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    let entries: ImportEntry[];
    try {
      entries = await componentModels.analyzeImport(await file.arrayBuffer());
    } catch (err) {
      console.error("Comprimido no válido:", err);
      window.alert("El archivo no es un ZIP de biblioteca válido.");
      return;
    }
    if (!entries.length) {
      window.alert("El comprimido no contiene modelos.");
      return;
    }
    this.showMergeDialog(entries);
  }

  /** Diálogo de fusión: el usuario elige qué modelos entrantes aplicar. */
  private showMergeDialog(entries: ImportEntry[]): void {
    const checks = new Map<ImportEntry, HTMLInputElement>();
    const rows = el("div", { class: "merge-list" });
    for (const e of entries) {
      const cb = el("input", { type: "checkbox" }) as HTMLInputElement;
      // Por defecto: aplica los nuevos y los más recientes; no pisa con antiguos.
      cb.checked = e.status === "new" || e.status === "newer";
      cb.disabled = e.status === "unchanged" || e.status === "unknown";
      checks.set(e, cb);
      rows.append(
        el("label", { class: "merge-row" }, [
          cb,
          el("div", { class: "merge-main" }, [
            el("div", { class: "merge-name" }, [e.label]),
            el("div", { class: "merge-meta" }, [mergeMeta(e)]),
          ]),
          el("span", { class: `merge-badge ${e.status}` }, [STATUS_LABEL[e.status]]),
        ]),
      );
    }

    const summary = el("div", { class: "merge-summary" }, [
      "Marca los modelos a aplicar. Por defecto se aplican los nuevos y los más " +
        "recientes; los más antiguos y los sin cambios quedan sin marcar para no " +
        "sobrescribir tus ediciones.",
    ]);

    const applyBtn = el("button", { class: "land-btn primary" }, ["Aplicar selección"]);
    applyBtn.addEventListener("click", () => {
      const selected = entries.filter((e) => checks.get(e)?.checked);
      overlay.remove();
      void componentModels.applyImport(selected);
    });
    const cancelBtn = el("button", { class: "land-btn ghost" }, ["Cancelar"]);
    cancelBtn.addEventListener("click", () => overlay.remove());

    const dialog = el("div", { class: "confirm-dialog merge-dialog" }, [
      el("div", { class: "confirm-title" }, ["Importar biblioteca de modelos"]),
      summary,
      rows,
      el("div", { class: "confirm-actions" }, [applyBtn, cancelBtn]),
    ]);
    const overlay = el("div", { class: "confirm-overlay" }, [dialog]);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });
    this.root.append(overlay);
  }
}

const STATUS_LABEL: Record<ImportStatus, string> = {
  new: "Nuevo",
  newer: "Más reciente",
  older: "Más antiguo",
  unchanged: "Sin cambios",
  unknown: "Desconocido",
};

function fmtDate(ms: number | null): string {
  if (!ms) return "—";
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function mergeMeta(e: ImportEntry): string {
  const inc = `entrante ${fmtDate(e.updatedAt)}`;
  if (e.localUpdatedAt == null) return `${e.fileName} · ${inc}`;
  return `${e.fileName} · local ${fmtDate(e.localUpdatedAt)} · ${inc}`;
}
