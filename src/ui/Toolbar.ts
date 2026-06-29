import type { Editor, TransformMode } from "../core/Editor";
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

    const dupBtn = el("button", { class: "tool", title: "Duplicar (Ctrl+D)" }, ["Duplicar"]);
    dupBtn.addEventListener("click", () => this.editor.duplicateSelected());

    const delBtn = el("button", { class: "tool danger", title: "Eliminar (Supr)" }, [
      "Eliminar",
    ]);
    delBtn.addEventListener("click", () => {
      const sel = this.editor.getSelected();
      if (sel) this.editor.removeObject(sel);
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
      el("div", { class: "tool-group" }, [spaceBtn, gridBtn]),
      el("div", { class: "tool-group" }, [dupBtn, delBtn]),
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
