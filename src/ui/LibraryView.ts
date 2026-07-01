import * as THREE from "three";
import {
  CATEGORY_LABELS,
  COMPONENT_LIBRARY,
  PRIMITIVE_DEFS,
} from "../objects/componentLibrary";
import { SEGMENT_DEFS } from "../objects/humanFigure";
import { buildGeometry } from "../objects/geometryFactory";
import { buildMaterial } from "../objects/materials";
import { componentModels, type ImportEntry, type ImportStatus } from "../core/componentModels";
import { figureSegments } from "../core/figureSegments";
import { ComponentPreview } from "./ComponentPreview";
import { clear, el } from "./dom";

interface LibItem {
  id: string;
  label: string;
  category: string;
  description?: string;
}

/** Abstracción de una fuente de biblioteca (componentes o segmentos del maniquí). */
interface LibrarySource {
  items(): LibItem[];
  has(id: string): boolean;
  fileName(id: string): string | null;
  isUser(id: string): boolean; // true si el modelo es del usuario (permite restablecer)
  isFile(id: string): boolean;
  previewGeometry(id: string): THREE.BufferGeometry;
  previewMaterial(id: string): THREE.Material;
  setUserModel(id: string, file: File): Promise<void>;
  clearUserModel(id: string): Promise<void>;
  onChanged(fn: () => void): () => void;
  supportsZip: boolean;
}

const COMPONENT_DEFS = [...PRIMITIVE_DEFS, ...COMPONENT_LIBRARY];
const compById = new Map(COMPONENT_DEFS.map((d) => [d.id, d]));

const componentSource: LibrarySource = {
  items: () =>
    COMPONENT_DEFS.map((d) => ({
      id: d.id,
      label: d.label,
      category: CATEGORY_LABELS[d.category] ?? d.category,
      description: d.description,
    })),
  has: (id) => componentModels.has(id),
  fileName: (id) => componentModels.fileName(id),
  isUser: (id) => componentModels.source(id) === "user",
  isFile: (id) => componentModels.source(id) === "file",
  previewGeometry: (id) =>
    componentModels.geometryClone(id) ?? buildGeometry(compById.get(id)!.defaults),
  previewMaterial: (id) => buildMaterial(compById.get(id)!.materialId),
  setUserModel: (id, f) => componentModels.setUserModel(id, f),
  clearUserModel: (id) => componentModels.clearUserModel(id),
  onChanged: (fn) => componentModels.onChanged(fn),
  supportsZip: true,
};

const figureMat = () => new THREE.MeshStandardMaterial({ color: 0x2f7dd1, roughness: 0.6 });
const segmentSource: LibrarySource = {
  items: () => SEGMENT_DEFS.map((s) => ({ id: s.id, label: s.label, category: "Segmentos del maniquí" })),
  has: (id) => figureSegments.has(id),
  fileName: (id) => figureSegments.fileName(id),
  isUser: (id) => figureSegments.has(id),
  isFile: () => false,
  previewGeometry: (id) =>
    figureSegments.geometryClone(id) ?? new THREE.CapsuleGeometry(5, 22, 4, 12),
  previewMaterial: () => figureMat(),
  setUserModel: (id, f) => figureSegments.setUserModel(id, f),
  clearUserModel: (id) => figureSegments.clearUserModel(id),
  onChanged: (fn) => figureSegments.onChanged(fn),
  supportsZip: false,
};

/**
 * Biblioteca como vista autónoma de la Home. Dos pestañas: componentes de las
 * máquinas y segmentos del maniquí. Solo un visor 3D del ítem seleccionado.
 */
export class LibraryView {
  readonly root: HTMLElement;
  private listEl: HTMLElement;
  private detailEl: HTMLElement;
  private previewBox: HTMLElement;
  private fileInput: HTMLInputElement;
  private zipActions: HTMLElement;
  private preview: ComponentPreview;
  private pendingId: string | null = null;
  private selectedId: string | null = null;
  private src: LibrarySource = componentSource;
  private unsub: () => void;
  private tabs: { comp: HTMLButtonElement; seg: HTMLButtonElement };

  constructor(private onHome: () => void) {
    this.listEl = el("div", { class: "lib-list" });
    this.previewBox = el("div", { class: "lib-preview" });
    this.detailEl = el("div", { class: "lib-detail-info" });

    this.fileInput = el("input", { type: "file", accept: ".glb,.gltf,.obj" });
    this.fileInput.style.display = "none";
    this.fileInput.addEventListener("change", () => void this.onFilePicked());

    const backBtn = el("button", { class: "tool" }, ["← Volver a Home"]);
    backBtn.addEventListener("click", () => this.onHome());

    const exportBtn = el("button", { class: "tool", title: "Descargar todos los modelos en un ZIP" }, ["Exportar ZIP"]);
    exportBtn.addEventListener("click", () => void this.exportLibrary());
    const zipInput = el("input", { type: "file", accept: ".zip,application/zip" });
    zipInput.style.display = "none";
    zipInput.addEventListener("change", () => void this.onImportZip(zipInput));
    const importBtn = el("button", { class: "tool", title: "Cargar un ZIP de modelos y fusionar" }, ["Importar ZIP"]);
    importBtn.addEventListener("click", () => zipInput.click());
    this.zipActions = el("div", { class: "lib-header-actions" }, [exportBtn, importBtn]);

    this.tabs = {
      comp: el("button", { class: "lib-tab active" }, ["Componentes"]) as HTMLButtonElement,
      seg: el("button", { class: "lib-tab" }, ["Maniquí"]) as HTMLButtonElement,
    };
    this.tabs.comp.addEventListener("click", () => this.setSource(componentSource));
    this.tabs.seg.addEventListener("click", () => this.setSource(segmentSource));

    const panel = el("div", { class: "lib-panel lib-view" }, [
      el("div", { class: "lib-header" }, [
        el("div", { class: "lib-title" }, ["Biblioteca de modelos"]),
        el("div", { class: "lib-header-actions" }, [this.zipActions, backBtn]),
      ]),
      el("div", { class: "lib-tabs" }, [this.tabs.comp, this.tabs.seg]),
      el("div", { class: "lib-intro" }, [
        "Revisa cada pieza por separado y sustitúyela por un modelo 3D " +
          "(.glb, .gltf u .obj). Se guarda en este navegador. En “Maniquí” puedes " +
          "reemplazar cada segmento del cuerpo por uno más estético.",
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

    this.unsub = componentModels.onChanged(() => this.refresh());
    const unsubSeg = figureSegments.onChanged(() => this.refresh());
    const baseUnsub = this.unsub;
    this.unsub = () => {
      baseUnsub();
      unsubSeg();
    };

    this.renderList();
    this.selectFirst();
  }

  dispose(): void {
    this.unsub();
    this.preview.dispose();
    this.root.remove();
  }

  private refresh(): void {
    this.renderList();
    if (this.selectedId) this.selectItem(this.selectedId);
  }

  private setSource(src: LibrarySource): void {
    if (this.src === src) return;
    this.src = src;
    this.tabs.comp.classList.toggle("active", src === componentSource);
    this.tabs.seg.classList.toggle("active", src === segmentSource);
    this.zipActions.style.display = src.supportsZip ? "flex" : "none";
    this.selectedId = null;
    this.renderList();
    this.selectFirst();
  }

  private selectFirst(): void {
    const first = this.src.items()[0]?.id;
    if (first) this.selectItem(first);
  }

  private renderList(): void {
    clear(this.listEl);
    const byCat = new Map<string, LibItem[]>();
    for (const it of this.src.items()) {
      (byCat.get(it.category) ?? byCat.set(it.category, []).get(it.category)!).push(it);
    }
    for (const [cat, items] of byCat) {
      this.listEl.append(el("div", { class: "lib-cat" }, [cat]));
      for (const it of items) this.listEl.append(this.row(it));
    }
  }

  private row(it: LibItem): HTMLElement {
    const has = this.src.has(it.id);
    const dot = el("span", { class: has ? "lib-dot on" : "lib-dot" }, []);
    const row = el(
      "button",
      { class: this.selectedId === it.id ? "lib-row selected" : "lib-row" },
      [el("div", { class: "lib-info" }, [el("div", { class: "lib-name" }, [it.label])]), dot],
    );
    row.addEventListener("click", () => this.selectItem(it.id));
    return row;
  }

  private selectItem(id: string): void {
    this.selectedId = id;
    const it = this.src.items().find((i) => i.id === id);
    if (!it) return;
    this.listEl.querySelectorAll(".lib-row").forEach((r) => r.classList.remove("selected"));
    [...this.listEl.querySelectorAll<HTMLButtonElement>(".lib-row")].forEach((r) => {
      if (r.querySelector(".lib-name")?.textContent === it.label) r.classList.add("selected");
    });
    this.preview.show(this.src.previewGeometry(id), this.src.previewMaterial(id));
    this.renderDetail(it);
  }

  private renderDetail(it: LibItem): void {
    clear(this.detailEl);
    const has = this.src.has(it.id);
    const fileName = this.src.fileName(it.id);
    const statusText = has
      ? this.src.isFile(it.id)
        ? `Modelo de archivo: ${fileName}`
        : `Modelo personalizado: ${fileName}`
      : "Forma por defecto";

    const replace = el("button", { class: "tool" }, [has ? "Cambiar modelo…" : "Sustituir por modelo…"]);
    replace.addEventListener("click", () => {
      this.pendingId = it.id;
      this.fileInput.value = "";
      this.fileInput.click();
    });
    const actions = el("div", { class: "lib-detail-actions" }, [replace]);
    if (has && this.src.isUser(it.id)) {
      const reset = el("button", { class: "tool danger" }, ["Restablecer"]);
      reset.addEventListener("click", () => void this.src.clearUserModel(it.id));
      actions.append(reset);
    }

    this.detailEl.append(
      el("div", { class: "lib-detail-name" }, [it.label]),
      el("div", { class: has ? "lib-status on" : "lib-status" }, [statusText]),
      it.description ? el("div", { class: "lib-desc" }, [it.description]) : el("span"),
      actions,
    );
  }

  private async onFilePicked(): Promise<void> {
    const file = this.fileInput.files?.[0];
    const id = this.pendingId;
    this.pendingId = null;
    if (!file || !id) return;
    try {
      await this.src.setUserModel(id, file);
    } catch (err) {
      console.error("No se pudo asignar el modelo:", err);
      window.alert("No se pudo cargar el modelo 3D.");
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

  private showMergeDialog(entries: ImportEntry[]): void {
    const checks = new Map<ImportEntry, HTMLInputElement>();
    const rows = el("div", { class: "merge-list" });
    for (const e of entries) {
      const cb = el("input", { type: "checkbox" }) as HTMLInputElement;
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
      el("div", { class: "merge-summary" }, [
        "Por defecto se aplican los nuevos y los más recientes; los más antiguos " +
          "y los sin cambios quedan sin marcar para no sobrescribir tus ediciones.",
      ]),
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
