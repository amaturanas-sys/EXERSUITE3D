import * as THREE from "three";
import {
  CATEGORY_LABELS,
  COMPONENT_LIBRARY,
  PRIMITIVE_DEFS,
} from "../objects/componentLibrary";
import { SEGMENT_DEFS, defaultSegmentGeometry } from "../objects/humanFigure";
import { buildGeometry } from "../objects/geometryFactory";
import { buildMaterial } from "../objects/materials";
import { componentModels, type ImportEntry, type ImportStatus } from "../core/componentModels";
import { figureSegments } from "../core/figureSegments";
import { STANDARD_MACHINES } from "../objects/standardMachines";
import { claveMaquina, geometriaAOBJ, geometriaASTL, hornearMaquina } from "../core/maquinasModelo";
import { ComponentPreview } from "./ComponentPreview";
import { clear, el } from "./dom";
import { descargarArchivo, elegirArchivo } from "../core/descargas";
import { parsearPrefab, prefabDeFabrica } from "../core/prefabIO";
import { prefabsMaquina } from "../core/prefabsMaquina";
import { tt } from "../core/i18n";

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
  /** Acciones adicionales del detalle (p. ej. exportar la máquina a OBJ/STL). */
  extraActions?(id: string): HTMLElement[];
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

// ---- Máquinas estándar del modo Sencillo: exportables (STL/OBJ) y
// sustituibles por un modelo del usuario, como cualquier componente.
const maquinaPorClave = (clave: string) =>
  STANDARD_MACHINES.find((m) => claveMaquina(m.id) === clave);

async function exportarMaquina(clave: string, formato: "obj" | "stl"): Promise<void> {
  const m = maquinaPorClave(clave);
  if (!m) return;
  try {
    const geo = componentModels.geometryClone(clave) ?? hornearMaquina(m.id);
    if (formato === "obj") {
      await descargarArchivo(`${m.id}.obj`, geometriaAOBJ(geo, m.label), "model/obj");
    } else {
      await descargarArchivo(`${m.id}.stl`, geometriaASTL(geo), "model/stl");
    }
    geo.dispose();
  } catch (err) {
    console.error("No se pudo exportar la máquina:", err);
    window.alert("No se pudo exportar la máquina.");
  }
}

const machineSource: LibrarySource = {
  items: () =>
    STANDARD_MACHINES.map((m) => ({
      id: claveMaquina(m.id),
      label: m.label,
      category: "Máquinas estándar",
      description: m.description,
    })),
  has: (id) => componentModels.has(id),
  fileName: (id) => componentModels.fileName(id),
  isUser: (id) => componentModels.source(id) === "user",
  isFile: (id) => componentModels.source(id) === "file",
  previewGeometry: (id) => {
    const propia = componentModels.geometryClone(id);
    if (propia) return propia;
    const m = maquinaPorClave(id);
    return m ? hornearMaquina(m.id) : new THREE.BoxGeometry(50, 50, 50);
  },
  previewMaterial: () => buildMaterial("acero-negro"),
  setUserModel: (id, f) => componentModels.setUserModel(id, f),
  clearUserModel: (id) => componentModels.clearUserModel(id),
  onChanged: (fn) => {
    const off = componentModels.onChanged(fn);
    prefabsMaquina.onChanged(fn);
    return off;
  },
  supportsZip: true,
  extraActions: (id) => {
    const obj = el("button", { class: "tool", title: "Descargar el ensamblaje como OBJ" }, ["Exportar OBJ"]);
    obj.addEventListener("click", () => void exportarMaquina(id, "obj"));
    const stl = el("button", { class: "tool", title: "Descargar el ensamblaje como STL" }, ["Exportar STL"]);
    stl.addEventListener("click", () => void exportarMaquina(id, "stl"));

    // ---- Ciclo ROBUSTO de prefabs (v0.2.4): exportar la definición exacta,
    // corregirla en la app y reimportarla como sustituto — sin transcripción.
    const maquinaId = maquinaPorClave(id)?.id ?? id;
    const acciones: HTMLElement[] = [obj, stl];

    const expPrefab = el(
      "button",
      { class: "tool", title: "Descargar la definición por piezas (.prefab.json) para corregirla" },
      ["Exportar prefab (.json)"],
    );
    expPrefab.addEventListener("click", () => {
      const archivo = prefabsMaquina.get(maquinaId) ?? prefabDeFabrica(maquinaId);
      if (!archivo) return;
      void descargarArchivo(
        `${maquinaId}.prefab.json`,
        JSON.stringify(archivo, null, 2),
        "application/json",
      );
    });
    acciones.push(expPrefab);

    const subPrefab = el(
      "button",
      { class: "tool", title: "El .prefab.json pasa a ser la definición de esta máquina (persistente)" },
      ["Sustituir por prefab (.json)…"],
    );
    subPrefab.addEventListener("click", () => {
      void elegirArchivo(".json", "Prefab EXERSUITE3D (.json)").then((f) => {
        if (!f) return;
        void f.text().then((texto) => {
          try {
            const { archivo, advertencias } = parsearPrefab(texto);
            if (advertencias.length > 0) console.warn("Prefab con avisos:", advertencias);
            void prefabsMaquina.set(maquinaId, archivo);
            window.alert(
              tt(
                `«${archivo.label}» sustituye ahora a la máquina (${archivo.piezas.length} piezas).` +
                  (advertencias.length ? `\n⚠ ${advertencias.join("\n⚠ ")}` : ""),
                `"${archivo.label}" now replaces the machine (${archivo.piezas.length} pieces).` +
                  (advertencias.length ? `\n⚠ ${advertencias.join("\n⚠ ")}` : ""),
              ),
            );
          } catch (err) {
            console.error("Prefab no válido:", err);
            window.alert(String(err instanceof Error ? err.message : err));
          }
        });
      });
    });
    acciones.push(subPrefab);

    if (prefabsMaquina.has(maquinaId)) {
      const quitar = el(
        "button",
        { class: "tool danger", title: "Vuelve a la definición de fábrica" },
        ["Quitar prefab del usuario"],
      );
      quitar.addEventListener("click", () => void prefabsMaquina.remove(maquinaId));
      acciones.push(quitar);
      acciones.push(
        el("span", { class: "lib-badge" }, ["Prefab del usuario ACTIVO — define esta máquina."]),
      );
    }
    return acciones;
  },
};

const figureMat = () => new THREE.MeshStandardMaterial({ color: 0x2f7dd1, roughness: 0.6 });
const segmentSource: LibrarySource = {
  items: () => SEGMENT_DEFS.map((s) => ({ id: s.id, label: s.label, category: "Segmentos del maniquí" })),
  has: (id) => figureSegments.has(id),
  fileName: (id) => figureSegments.fileName(id),
  // El maniquí ya viene de serie, así que hay que distinguir de dónde sale cada
  // segmento: solo el del usuario se puede restablecer, y hacerlo devuelve el
  // de serie, no la primitiva.
  isUser: (id) => figureSegments.source(id) === "user",
  isFile: (id) => figureSegments.source(id) === "file",
  // Sin modelo, muestra la primitiva REAL del segmento (la misma que usaría el
  // maniquí): cabeza=esfera, torso=caja, muslo=cilindro…
  previewGeometry: (id) => figureSegments.geometryClone(id) ?? defaultSegmentGeometry(id),
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
  private zipActions: HTMLElement;
  private preview: ComponentPreview;
  private selectedId: string | null = null;
  private src: LibrarySource = componentSource;
  private unsub: () => void;
  private tabs: { comp: HTMLButtonElement; maq: HTMLButtonElement; seg: HTMLButtonElement };

  constructor(private onHome: () => void) {
    this.listEl = el("div", { class: "lib-list" });
    this.previewBox = el("div", { class: "lib-preview" });
    this.detailEl = el("div", { class: "lib-detail-info" });

    const backBtn = el("button", { class: "tool" }, ["← Volver a Home"]);
    backBtn.addEventListener("click", () => this.onHome());

    const exportBtn = el("button", { class: "tool", title: "Descargar todos los modelos en un ZIP" }, ["Exportar ZIP"]);
    exportBtn.addEventListener("click", () => void this.exportLibrary());
    const importBtn = el("button", { class: "tool", title: "Cargar un ZIP de modelos y fusionar" }, ["Importar ZIP"]);
    importBtn.addEventListener("click", () => void this.onImportZip());
    this.zipActions = el("div", { class: "lib-header-actions" }, [exportBtn, importBtn]);

    this.tabs = {
      comp: el("button", { class: "lib-tab active" }, ["Componentes"]) as HTMLButtonElement,
      maq: el("button", { class: "lib-tab" }, ["Máquinas"]) as HTMLButtonElement,
      seg: el("button", { class: "lib-tab" }, ["Maniquí"]) as HTMLButtonElement,
    };
    this.tabs.comp.addEventListener("click", () => this.setSource(componentSource));
    this.tabs.maq.addEventListener("click", () => this.setSource(machineSource));
    this.tabs.seg.addEventListener("click", () => this.setSource(segmentSource));

    const panel = el("div", { class: "lib-panel lib-view" }, [
      el("div", { class: "lib-header" }, [
        el("div", { class: "lib-title" }, ["Biblioteca de modelos"]),
        el("div", { class: "lib-header-actions" }, [this.zipActions, backBtn]),
      ]),
      el("div", { class: "lib-tabs" }, [this.tabs.comp, this.tabs.maq, this.tabs.seg]),
      el("div", { class: "lib-intro" }, [
        "Revisa cada pieza por separado y sustitúyela por un modelo 3D " +
          "(.glb, .gltf u .obj). Se guarda en este navegador. En “Maniquí” puedes " +
          "reemplazar cada segmento del cuerpo por uno más estético.",
      ]),
      el("div", { class: "lib-body" }, [
        this.listEl,
        el("div", { class: "lib-detail" }, [this.previewBox, this.detailEl]),
      ]),
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
    this.tabs.maq.classList.toggle("active", src === machineSource);
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
    replace.addEventListener("click", () => void this.sustituirModelo(it.id));
    const actions = el("div", { class: "lib-detail-actions" }, [replace]);
    if (has && this.src.isUser(it.id)) {
      const reset = el("button", { class: "tool danger" }, ["Restablecer"]);
      reset.addEventListener("click", () => void this.src.clearUserModel(it.id));
      actions.append(reset);
    }
    for (const extra of this.src.extraActions?.(it.id) ?? []) actions.append(extra);

    this.detailEl.append(
      el("div", { class: "lib-detail-name" }, [it.label]),
      el("div", { class: has ? "lib-status on" : "lib-status" }, [statusText]),
      it.description ? el("div", { class: "lib-desc" }, [it.description]) : el("span"),
      actions,
    );
  }

  private async sustituirModelo(id: string): Promise<void> {
    const file = await elegirArchivo(".glb,.gltf,.obj,.stl", "Modelo 3D");
    if (!file) return;
    try {
      await this.src.setUserModel(id, file);
    } catch (err) {
      console.error("No se pudo asignar el modelo:", err);
      window.alert("No se pudo cargar el modelo 3D.");
    }
  }

  // ------------------------------------------------ exportar / importar bulk
  private async exportLibrary(): Promise<void> {
    try {
      const zip = await componentModels.exportZip();
      await descargarArchivo("exersuite3d-biblioteca.zip", zip, "application/zip");
    } catch (err) {
      console.error("No se pudo exportar la biblioteca:", err);
      window.alert("No se pudo exportar la biblioteca.");
    }
  }

  private async onImportZip(): Promise<void> {
    const file = await elegirArchivo(".zip", "Biblioteca EXERSUITE3D (.zip)");
    if (!file) return;
    if (!/\.zip$/i.test(file.name)) {
      window.alert("Elige un archivo .zip (la biblioteca exportada).");
      return;
    }
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
