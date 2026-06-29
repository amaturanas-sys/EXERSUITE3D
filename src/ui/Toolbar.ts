import type { Editor, TransformMode } from "../core/Editor";
import { POSE_NAMES } from "../objects/humanFigure";
import { el } from "./dom";

/** Barra superior: modos de transformacion y acciones de escena. */
export class Toolbar {
  readonly root: HTMLElement;
  private modeButtons = new Map<TransformMode, HTMLButtonElement>();
  private gridOn = true;
  private space: "local" | "world" = "local";

  constructor(private editor: Editor) {
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
    const figPose = el("select", { class: "select tool-select", title: "Postura estándar" });
    for (const name of POSE_NAMES) figPose.append(el("option", { value: name }, [name]));
    figPose.addEventListener("change", () => this.editor.applyPose(figPose.value));

    this.editor.bus.on("humanFigureChanged", ({ present, heightCm, loading, mode }) => {
      figBtn.classList.toggle("active", present);
      figBtn.textContent = loading ? "Cargando…" : "Figura";
      figHeight.value = String(heightCm);
      // Las posturas solo aplican al maniquí posable (no al esqueleto GLB).
      figPose.disabled = !present || mode !== "mannequin";
    });
    figPose.disabled = true;

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
      el("div", { class: "tool-group" }, [figBtn, figMode, figHeight, figPose]),
    ];

    this.root = el("div", { id: "toolbar" }, [
      el("div", { class: "tool-group" }, [simBtn]),
      ...editGroups,
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
}
