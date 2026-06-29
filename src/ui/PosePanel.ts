import type { Editor } from "../core/Editor";
import { clear, el } from "./dom";

/**
 * Panel de gestion de posturas del personaje posable. Permite aplicar, editar
 * (posar a mano y actualizar), guardar nuevas y eliminar posturas. Visible solo
 * cuando hay un maniqui posable.
 */
export class PosePanel {
  readonly root: HTMLElement;
  private select: HTMLSelectElement;

  constructor(private editor: Editor) {
    this.select = el("select", { class: "select" });
    this.select.addEventListener("change", () => this.editor.applyPose(this.select.value));

    const applyBtn = el("button", { class: "tool", title: "Aplicar la postura" }, ["Aplicar"]);
    applyBtn.addEventListener("click", () => this.editor.applyPose(this.select.value));

    const updateBtn = el("button", { class: "tool", title: "Sobrescribir esta postura con la pose actual" }, [
      "Actualizar",
    ]);
    updateBtn.addEventListener("click", () => {
      if (this.select.value) this.editor.savePose(this.select.value);
    });

    const saveBtn = el("button", { class: "tool sim", title: "Guardar la pose actual como nueva postura" }, [
      "Guardar como…",
    ]);
    saveBtn.addEventListener("click", () => {
      const name = window.prompt("Nombre de la nueva postura:");
      if (name && name.trim()) {
        this.editor.savePose(name);
        this.select.value = name.trim();
      }
    });

    const delBtn = el("button", { class: "tool danger", title: "Eliminar esta postura" }, ["Eliminar"]);
    delBtn.addEventListener("click", () => {
      if (this.select.value) this.editor.deletePose(this.select.value);
    });

    const resetBtn = el("button", { class: "tool", title: "Restaurar las posturas de fábrica" }, [
      "Restaurar def.",
    ]);
    resetBtn.addEventListener("click", () => this.editor.restoreDefaultPoses());

    this.root = el("aside", { class: "panel", id: "poses" }, [
      el("div", { class: "panel-title" }, ["Posturas"]),
      el("div", { class: "panel-body" }, [
        el("div", { class: "field" }, [el("label", {}, ["Postura"]), this.select]),
        el("div", { class: "pose-actions" }, [applyBtn, updateBtn]),
        el("div", { class: "pose-actions" }, [saveBtn, delBtn]),
        el("div", { class: "pose-actions" }, [resetBtn]),
        el("div", { class: "empty-hint" }, [
          "Posa la figura (clic en un miembro y rótalo) y pulsa Actualizar para editar, o Guardar como… para una postura nueva.",
        ]),
      ]),
    ]);
    this.root.style.display = "none";

    this.refresh();
    this.editor.bus.on("posesChanged", () => this.refresh());
    this.editor.bus.on("humanFigureChanged", ({ present, mode }) => {
      this.root.style.display = present && mode === "mannequin" ? "flex" : "none";
    });
  }

  private refresh(): void {
    const current = this.select.value;
    clear(this.select);
    for (const name of this.editor.listPoseNames()) {
      this.select.append(el("option", { value: name }, [name]));
    }
    if (this.editor.listPoseNames().includes(current)) this.select.value = current;
  }
}
