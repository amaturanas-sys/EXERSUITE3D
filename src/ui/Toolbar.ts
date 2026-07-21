import type { ColorMode, Editor, TransformMode } from "../core/Editor";
import { acceptSeguro, descargarArchivo } from "../core/descargas";
import { addRecent } from "../core/recentStore";
import { t, tt } from "../core/i18n";
import { clear, el } from "./dom";

/**
 * Barra superior con menús agrupados (esquema v0.2.0): Archivo, Edición,
 * Selección, Ver y Ejes. Los menús se despliegan bajo su botón (popover fijo,
 * fuera del scroll de la barra) y muestran el estado vivo al abrirse.
 */
export class Toolbar {
  readonly root: HTMLElement;
  private menuEl: HTMLElement;
  private menuOwner: HTMLButtonElement | null = null;
  private lastSaveName = "exersuite3d-proyecto";

  // Estado vivo reflejado en los menús al abrirlos.
  private mode: TransformMode = "translate";
  private space: "local" | "world" = "local";
  private canUndo = false;
  private canRedo = false;
  private multi = 0;
  private groupSelected = false;
  private axisLock: "x" | "y" | "z" | null = null;

  private fileInput: HTMLInputElement;
  private importInput: HTMLInputElement;

  constructor(
    private editor: Editor,
    private hooks: { onHome?: () => void; onPerformance?: () => void } = {},
  ) {
    this.menuEl = el("div", { class: "tool-menu" });
    document.body.append(this.menuEl);

    // Entradas de archivo ocultas (cargar proyecto / importar modelo).
    this.fileInput = el("input", {
      type: "file",
      accept: acceptSeguro(".json,application/json"),
    });
    this.fileInput.style.display = "none";
    this.fileInput.addEventListener("change", () => void this.onLoadFile(this.fileInput));
    this.importInput = el("input", { type: "file", accept: acceptSeguro(".glb,.gltf,.obj,.stl") });
    this.importInput.style.display = "none";
    this.importInput.addEventListener("change", () => void this.onImportFile(this.importInput));

    // ---- Botones siempre visibles
    const homeBtn = el("button", { class: "tool", title: "Volver a la pantalla de inicio" }, [
      "⌂ Home",
    ]);
    homeBtn.addEventListener("click", () => this.hooks.onHome?.());

    const simBtn = el("button", { class: "tool sim", title: "Simular fisica (Espacio)" }, [
      "▶ Simular",
    ]);
    simBtn.addEventListener("click", () => void this.editor.toggleSimulation());

    // ---- Menús desplegables (esquema: Edición / Selección / Ver / Ejes)
    const archivoBtn = this.menuBtn("Archivo", (m) => this.buildArchivo(m));
    const edicionBtn = this.menuBtn("Edición", (m) => this.buildEdicion(m));
    const seleccionBtn = this.menuBtn("Selección", (m) => this.buildSeleccion(m));
    const verBtn = this.menuBtn("Ver", (m) => this.buildVer(m));
    const ejesBtn = this.menuBtn("Ejes", (m) => this.buildEjes(m));

    // El botón Ejes muestra el eje bloqueado como distintivo.
    this.editor.bus.on("axisLockChanged", ({ axis }) => {
      this.axisLock = axis;
      ejesBtn.textContent = axis ? `${t("Ejes")}: ${axis.toUpperCase()} ▾` : `${t("Ejes")} ▾`;
      ejesBtn.classList.toggle("active", axis !== null);
      if (this.menuOwner === ejesBtn) this.cerrarMenu();
    });

    // ---- Figura humana de referencia (acceso directo frecuente)
    const figBtn = el("button", { class: "tool", title: "Mostrar/ocultar figura humana" }, [
      "Figura",
    ]);
    figBtn.addEventListener("click", () => this.editor.toggleHumanFigure());
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
      figBtn.textContent = loading ? tt("Cargando…", "Loading…") : t("Figura");
      figHeight.value = String(heightCm);
    });

    // Indicador de autoguardado (localStorage del navegador).
    const autosaveTag = el("span", { class: "autosave-tag", title: "Autoguardado en este navegador" }, [
      "Autoguardado activo",
    ]);
    this.editor.bus.on("autosaved", ({ at }) => {
      const d = new Date(at);
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      autosaveTag.textContent = `${tt("Guardado", "Saved")} ✓ ${hh}:${mm}`;
    });

    const editGroups = [
      el("div", { class: "tool-group edit-only" }, [
        archivoBtn,
        edicionBtn,
        seleccionBtn,
        verBtn,
        ejesBtn,
      ]),
      el("div", { class: "tool-group edit-only" }, [figBtn, figHeight]),
    ];

    this.root = el("div", { id: "toolbar" }, [
      el("div", { class: "tool-group" }, [homeBtn, simBtn]),
      ...editGroups,
      el("div", { class: "tool-group" }, [autosaveTag]),
      this.fileInput,
      this.importInput,
    ]);

    // Estado vivo para pintar los menús al abrirlos.
    this.editor.bus.on("modeChanged", ({ mode }) => {
      this.mode = mode;
    });
    this.editor.bus.on("historyChanged", ({ canUndo, canRedo }) => {
      this.canUndo = canUndo;
      this.canRedo = canRedo;
    });
    this.editor.bus.on("groupingChanged", ({ multi, groupSelected }) => {
      this.multi = multi;
      this.groupSelected = groupSelected;
    });

    // Durante la simulacion, las herramientas de edicion se desactivan.
    const editButtons = editGroups.flatMap(
      (g) => [...g.querySelectorAll("button")] as HTMLButtonElement[],
    );
    this.editor.bus.on("simulationChanged", ({ running }) => {
      simBtn.textContent = running ? tt("■ Detener", "■ Stop") : tt("▶ Simular", "▶ Simulate");
      simBtn.classList.toggle("active", running);
      editButtons.forEach((b) => (b.disabled = running));
      document.body.classList.toggle("simulating", running);
      if (running) this.cerrarMenu();
    });

    window.addEventListener("keydown", this.onKeyDown);
    document.addEventListener("pointerdown", this.onDocPointerDown, true);
  }

  // ------------------------------------------------------------- menús

  /** Botón que abre/cierra su menú desplegable (popover bajo el botón). */
  private menuBtn(label: string, build: (menu: HTMLElement) => void): HTMLButtonElement {
    const btn = el("button", { class: "tool menu-btn" }, [`${t(label)} ▾`]);
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (this.menuOwner === btn) {
        this.cerrarMenu();
        return;
      }
      this.menuOwner = btn;
      clear(this.menuEl);
      build(this.menuEl);
      this.menuEl.classList.add("open");
      const r = btn.getBoundingClientRect();
      this.menuEl.style.top = `${r.bottom + 6}px`;
      // Que no se salga por la derecha de la pantalla.
      const w = Math.max(this.menuEl.offsetWidth, 200);
      this.menuEl.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - w - 8))}px`;
    });
    return btn;
  }

  private cerrarMenu(): void {
    this.menuEl.classList.remove("open");
    this.menuOwner = null;
  }

  private onDocPointerDown = (e: Event): void => {
    if (!this.menuEl.contains(e.target as Node)) this.cerrarMenu();
  };

  private item(
    label: string,
    onClick: () => void,
    opts: { check?: boolean; disabled?: boolean; danger?: boolean; keep?: boolean } = {},
  ): HTMLElement {
    const b = el(
      "button",
      { class: `menu-item${opts.danger ? " danger" : ""}${opts.check ? " checked" : ""}` },
      [`${opts.check ? "✓ " : ""}${t(label)}`],
    );
    (b as HTMLButtonElement).disabled = !!opts.disabled;
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      onClick();
      if (opts.keep && this.menuOwner) {
        // Repinta el menú en el sitio para seguir ajustando (toggles).
        const owner = this.menuOwner;
        this.cerrarMenu();
        owner.click();
      } else {
        this.cerrarMenu();
      }
    });
    return b;
  }

  private sep(): HTMLElement {
    return el("div", { class: "menu-sep" });
  }

  private header(text: string): HTMLElement {
    return el("div", { class: "menu-header" }, [text]);
  }

  private buildArchivo(m: HTMLElement): void {
    m.append(
      this.item("Nuevo proyecto…", () => {
        if (window.confirm(tt("¿Vaciar la escena y empezar un proyecto nuevo?", "Clear the scene and start a new project?"))) {
          this.editor.clearScene();
          this.editor.clearAutosave();
        }
      }),
      this.item("Guardar proyecto (.json)…", () => this.saveProject()),
      this.item("Cargar proyecto…", () => this.fileInput.click()),
      this.sep(),
      this.item("Importar modelo 3D…", () => this.importInput.click()),
      this.item("Exportar prototipo (.glb)", () => void this.exportGLB()),
      this.sep(),
      this.item("Rendimiento…", () => this.hooks.onPerformance?.()),
    );
  }

  private buildEdicion(m: HTMLElement): void {
    m.append(
      this.item("↺ Deshacer (Ctrl+Z)", () => void this.editor.undo(), { disabled: !this.canUndo }),
      this.item("↻ Rehacer (Ctrl+Y)", () => void this.editor.redo(), { disabled: !this.canRedo }),
      this.sep(),
      this.item("Copiar (Ctrl+C)", () => this.editor.copySelection()),
      this.item("Pegar (Ctrl+V)", () => this.editor.pasteClipboard()),
      this.item("Duplicar (Ctrl+D)", () => this.editor.duplicateSelected()),
      this.item("Eliminar (Supr)", () => this.editor.deleteSelection(), { danger: true }),
      this.sep(),
      this.item(this.multi >= 2 ? `${t("Agrupar")} (${this.multi})` : "Agrupar", () => this.editor.createGroup(), {
        disabled: this.multi < 2,
      }),
      this.item("Desagrupar", () => this.editor.ungroupSelected(), {
        disabled: !this.groupSelected,
      }),
    );
  }

  private buildSeleccion(m: HTMLElement): void {
    const modo = (mm: TransformMode, label: string, key: string) =>
      this.item(`${label} (${key})`, () => this.editor.setMode(mm), { check: this.mode === mm });
    m.append(
      this.header("Gizmo"),
      modo("translate", "Mover", "W"),
      modo("rotate", "Rotar", "E"),
      modo("scale", "Escalar", "S"),
      this.sep(),
      this.item("Selección de área", () => this.editor.setAreaSelect(!this.editor.isAreaSelect()), {
        check: this.editor.isAreaSelect(),
        keep: true,
      }),
      this.item("Arrastrar piezas", () => this.editor.setDragTool(!this.editor.isDragTool()), {
        check: this.editor.isDragTool(),
        keep: true,
      }),
      this.sep(),
      this.item(this.space === "local" ? "Espacio: Local" : "Espacio: Global", () => {
        this.space = this.space === "local" ? "world" : "local";
        this.editor.setGizmoSpace(this.space);
      }, { keep: true }),
      this.item("Imán (encaje magnético)", () => this.editor.setSnapEnabled(!this.editor.isSnapEnabled()), {
        check: this.editor.isSnapEnabled(),
        keep: true,
      }),
    );
  }

  private buildVer(m: HTMLElement): void {
    const color = (c: ColorMode, label: string) =>
      this.item(label, () => this.editor.setColorMode(c), {
        check: this.editor.getColorMode() === c,
        keep: true,
      });
    m.append(
      this.item("Grid del suelo", () => this.editor.setGridVisible(!this.editor.isGridVisible()), {
        check: this.editor.isGridVisible(),
        keep: true,
      }),
      this.item("Aristas de las piezas", () => this.editor.setEdges(!this.editor.isEdges()), {
        check: this.editor.isEdges(),
        keep: true,
      }),
      this.sep(),
      this.header("Modo de color"),
      color("material", "Materiales reales"),
      color("categoria", "Por categoría funcional"),
      color("neutro", "Neutro (arcilla)"),
      this.sep(),
      this.header("Perspectiva"),
      this.item("Frontal", () => this.editor.setViewPreset("frontal")),
      this.item("Lateral", () => this.editor.setViewPreset("lateral")),
      this.item("Superior", () => this.editor.setViewPreset("superior")),
      this.item("Isométrica", () => this.editor.setViewPreset("isometrica")),
    );
  }

  private buildEjes(m: HTMLElement): void {
    const eje = (a: "x" | "y" | "z", key: string) =>
      this.item(`Bloquear eje ${a.toUpperCase()} (tecla ${key})`, () => this.editor.setAxisLock(a), {
        check: this.axisLock === a,
      });
    m.append(
      this.header("Todo el trazado se circunscribe al eje"),
      eje("x", "1"),
      eje("y", "2"),
      eje("z", "3"),
      this.sep(),
      this.item("Liberar (0 / Esc)", () => this.editor.setAxisLock(null), {
        disabled: this.axisLock === null,
      }),
    );
  }

  // ----------------------------------------------------------- acciones

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.ctrlKey && e.key.toLowerCase() === "d") {
      e.preventDefault();
      this.editor.duplicateSelected();
    }
    if (e.key === "Escape") this.cerrarMenu();
  };

  /** Da de baja los listeners globales (al volver a la Home). */
  dispose(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    document.removeEventListener("pointerdown", this.onDocPointerDown, true);
    this.menuEl.remove();
  }

  private saveProject(): void {
    const raw = window.prompt(tt("Nombre del proyecto:", "Project name:"), this.lastSaveName);
    if (raw === null) return; // cancelado
    // Nombre legible para los recientes y nombre de archivo saneado.
    const name = raw.trim() || "exersuite3d-proyecto";
    this.lastSaveName = name;
    const fileName = name.replace(/[^a-z0-9._-]+/gi, "_").replace(/^_+|_+$/g, "") || "proyecto";

    const project = this.editor.serialize();
    void descargarArchivo(`${fileName}.json`, JSON.stringify(project, null, 2), "application/json");
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
      await descargarArchivo("exersuite3d-prototipo.glb", new Uint8Array(buffer), "model/gltf-binary");
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
