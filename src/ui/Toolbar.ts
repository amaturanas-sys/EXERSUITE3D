import type { Editor, TransformMode } from "../core/Editor";
import { addRecent } from "../core/recentStore";
import { el } from "./dom";

/** Barra superior: modos de transformacion y acciones de escena. */
export class Toolbar {
  readonly root: HTMLElement;
  private modeButtons = new Map<TransformMode, HTMLButtonElement>();
  private gridOn = true;
  private space: "local" | "world" = "local";
  private lastSaveName = "exersuite3d-proyecto";

  constructor(
    private editor: Editor,
    private hooks: { onHome?: () => void; onPerformance?: () => void } = {},
  ) {
    const mode = (m: TransformMode, label: string, key: string) => {
      const b = el("button", { class: "tool", title: `${label} (${key})` }, [label]);
      b.addEventListener("click", () => this.editor.setMode(m));
      this.modeButtons.set(m, b);
      return b;
    };

    const spaceBtn = el("button", { class: "tool", title: "Espacio local/global" }, [
      "Local",
    ]);
    spaceBtn.addEventListener("click", () => {
      this.space = this.space === "local" ? "world" : "local";
      this.editor.setGizmoSpace(this.space);
      spaceBtn.textContent = this.space === "local" ? "Local" : "Global";
    });

    const gridBtn = el("button", { class: "tool active", title: "Mostrar/ocultar grid" }, [
      "Grid",
    ]);
    gridBtn.addEventListener("click", () => {
      this.gridOn = !this.gridOn;
      this.editor.sceneManager.setGridVisible(this.gridOn);
      gridBtn.classList.toggle("active", this.gridOn);
    });

    const snapBtn = el("button", { class: "tool active", title: "Encaje magnetico en puntos de anclaje" }, [
      "Imán",
    ]);
    snapBtn.classList.toggle("active", this.editor.isSnapEnabled());
    snapBtn.addEventListener("click", () =>
      this.editor.setSnapEnabled(!this.editor.isSnapEnabled()),
    );
    this.editor.bus.on("snapChanged", ({ enabled }) =>
      snapBtn.classList.toggle("active", enabled),
    );

    const dupBtn = el("button", { class: "tool", title: "Duplicar (Ctrl+D)" }, ["Duplicar"]);
    dupBtn.addEventListener("click", () => this.editor.duplicateSelected());

    const delBtn = el("button", { class: "tool danger", title: "Eliminar (Supr)" }, [
      "Eliminar",
    ]);
    delBtn.addEventListener("click", () => {
      const sel = this.editor.getSelected();
      if (sel) this.editor.removeObject(sel);
      else if (this.editor.hasGroupSelected()) this.editor.deleteSelectedGroup();
    });

    // Agrupacion de piezas.
    const groupBtn = el("button", { class: "tool", title: "Agrupar piezas (Shift+clic para multiseleccionar)" }, [
      "Agrupar",
    ]);
    groupBtn.disabled = true;
    groupBtn.addEventListener("click", () => this.editor.createGroup());
    const ungroupBtn = el("button", { class: "tool", title: "Desagrupar" }, ["Desagrupar"]);
    ungroupBtn.disabled = true;
    ungroupBtn.addEventListener("click", () => this.editor.ungroupSelected());
    this.editor.bus.on("groupingChanged", ({ multi, groupSelected }) => {
      groupBtn.disabled = multi < 2;
      groupBtn.textContent = multi >= 2 ? `Agrupar (${multi})` : "Agrupar";
      ungroupBtn.disabled = !groupSelected;
    });

    // Figura humana de referencia (escala/ergonomia).
    const figBtn = el("button", { class: "tool", title: "Mostrar/ocultar figura humana" }, [
      "Figura",
    ]);
    figBtn.addEventListener("click", () => this.editor.toggleHumanFigure());

    const figMode = el("select", { class: "select tool-select", title: "Tipo de figura" });
    figMode.append(
      el("option", { value: "mannequin" }, ["Maniquí"]),
      el("option", { value: "skeleton" }, ["Esqueleto"]),
    );
    figMode.value = this.editor.getHumanMode();
    figMode.addEventListener("change", () =>
      this.editor.setHumanMode(figMode.value as "mannequin" | "skeleton"),
    );

    const figHeight = el("input", {
      class: "tool-input",
      type: "number",
      title: "Altura de la figura (cm)",
      value: String(this.editor.getHumanHeight()),
      step: "5",
      min: "50",
      max: "250",
    });
    figHeight.addEventListener("change", () => {
      const v = parseFloat(figHeight.value);
      if (Number.isFinite(v) && v >= 50 && v <= 250) this.editor.setHumanHeight(v);
    });
    this.editor.bus.on("humanFigureChanged", ({ present, heightCm, loading }) => {
      figBtn.classList.toggle("active", present);
      figBtn.textContent = loading ? "Cargando…" : "Figura";
      figHeight.value = String(heightCm);
    });

    const simBtn = el("button", { class: "tool sim", title: "Simular fisica (Espacio)" }, [
      "▶ Simular",
    ]);
    simBtn.addEventListener("click", () => void this.editor.toggleSimulation());

    const editGroups = [
      el("div", { class: "tool-group" }, [
        mode("translate", "Mover", "W"),
        mode("rotate", "Rotar", "E"),
        mode("scale", "Escalar", "S"),
      ]),
      el("div", { class: "tool-group" }, [spaceBtn, gridBtn, snapBtn]),
      el("div", { class: "tool-group" }, [dupBtn, delBtn]),
      el("div", { class: "tool-group" }, [groupBtn, ungroupBtn]),
      el("div", { class: "tool-group" }, [figBtn, figMode, figHeight]),
    ];

    // Nuevo proyecto: vacía la escena y descarta el autoguardado.
    const newBtn = el("button", { class: "tool", title: "Vaciar la escena y empezar un proyecto nuevo" }, [
      "Nuevo",
    ]);
    newBtn.addEventListener("click", () => {
      if (window.confirm("¿Vaciar la escena y empezar un proyecto nuevo?")) {
        this.editor.clearScene();
        this.editor.clearAutosave();
      }
    });

    // Indicador de autoguardado (localStorage del navegador).
    const autosaveTag = el("span", { class: "autosave-tag", title: "Autoguardado en este navegador" }, [
      "Autoguardado activo",
    ]);
    this.editor.bus.on("autosaved", ({ at }) => {
      const d = new Date(at);
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      autosaveTag.textContent = `Guardado ✓ ${hh}:${mm}`;
    });

    // Guardar / cargar proyecto (a archivo .json).
    const saveBtn = el("button", { class: "tool", title: "Guardar el proyecto a un archivo" }, [
      "Guardar",
    ]);
    saveBtn.addEventListener("click", () => this.saveProject());
    const loadBtn = el("button", { class: "tool", title: "Cargar un proyecto desde archivo" }, [
      "Cargar",
    ]);
    const fileInput = el("input", {
      type: "file",
      accept: ".json,application/json",
    });
    fileInput.style.display = "none";
    fileInput.addEventListener("change", () => this.onLoadFile(fileInput));
    loadBtn.addEventListener("click", () => fileInput.click());

    const exportBtn = el("button", { class: "tool", title: "Exportar el prototipo a glTF (.glb)" }, [
      "Exportar",
    ]);
    exportBtn.addEventListener("click", () => this.exportGLB());

    const homeBtn = el("button", { class: "tool", title: "Volver a la pantalla de inicio" }, [
      "⌂ Home",
    ]);
    homeBtn.addEventListener("click", () => this.hooks.onHome?.());

    const perfBtn = el("button", { class: "tool", title: "Opciones de rendimiento" }, [
      "Rendimiento",
    ]);
    perfBtn.addEventListener("click", () => this.hooks.onPerformance?.());

    const importBtn = el("button", { class: "tool", title: "Importar un modelo 3D (.glb/.gltf/.obj)" }, [
      "Importar",
    ]);
    const importInput = el("input", { type: "file", accept: ".glb,.gltf,.obj" });
    importInput.style.display = "none";
    importInput.addEventListener("change", () => this.onImportFile(importInput));
    importBtn.addEventListener("click", () => importInput.click());

    this.root = el("div", { id: "toolbar" }, [
      el("div", { class: "tool-group" }, [homeBtn, simBtn]),
      ...editGroups,
      el("div", { class: "tool-group" }, [newBtn, saveBtn, loadBtn]),
      el("div", { class: "tool-group" }, [exportBtn, importBtn]),
      el("div", { class: "tool-group" }, [perfBtn]),
      el("div", { class: "tool-group" }, [autosaveTag]),
      fileInput,
      importInput,
    ]);

    this.editor.bus.on("modeChanged", ({ mode }) => this.highlight(mode));
    this.highlight("translate");

    // Durante la simulacion, las herramientas de edicion se desactivan.
    const editButtons = editGroups.flatMap((g) =>
      [...g.querySelectorAll("button")] as HTMLButtonElement[],
    );
    this.editor.bus.on("simulationChanged", ({ running }) => {
      simBtn.textContent = running ? "■ Detener" : "▶ Simular";
      simBtn.classList.toggle("active", running);
      editButtons.forEach((b) => (b.disabled = running));
      document.body.classList.toggle("simulating", running);
    });

    window.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        this.editor.duplicateSelected();
      }
    });
  }

  private highlight(active: TransformMode): void {
    this.modeButtons.forEach((btn, m) => btn.classList.toggle("active", m === active));
  }

  private saveProject(): void {
    const raw = window.prompt("Nombre del proyecto:", this.lastSaveName);
    if (raw === null) return; // cancelado
    // Nombre legible para los recientes y nombre de archivo saneado.
    const name = raw.trim() || "exersuite3d-proyecto";
    this.lastSaveName = name;
    const fileName = name.replace(/[^a-z0-9._-]+/gi, "_").replace(/^_+|_+$/g, "") || "proyecto";

    const project = this.editor.serialize();
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.editor.markClean();
    void addRecent(name, project, Date.now()).catch(() => {});
  }

  private async onLoadFile(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      await this.editor.loadProject(data);
      void addRecent(file.name.replace(/\.[^.]+$/, ""), data, Date.now()).catch(() => {});
    } catch (err) {
      console.error("No se pudo cargar el proyecto:", err);
      window.alert("Archivo de proyecto no válido.");
    }
    input.value = "";
  }

  private async exportGLB(): Promise<void> {
    try {
      const buffer = await this.editor.exportGLB();
      const blob = new Blob([buffer], { type: "model/gltf-binary" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "exersuite3d-prototipo.glb";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("No se pudo exportar:", err);
    }
  }

  private async onImportFile(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    if (!file) return;
    try {
      await this.editor.importModelFile(file);
    } catch (err) {
      console.error("No se pudo importar:", err);
      window.alert("No se pudo importar el modelo.");
    }
    input.value = "";
  }
}
