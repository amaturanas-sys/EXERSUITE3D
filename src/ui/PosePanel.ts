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

    const attachBtn = el("button", { class: "tool", title: "Apoyar una mano en un agarre (IK)" }, [
      "Apoyar mano",
    ]);
    attachBtn.addEventListener("click", () => this.editor.beginAttachHand());
    const detachBtn = el("button", { class: "tool", title: "Soltar las manos apoyadas" }, [
      "Soltar manos",
    ]);
    detachBtn.addEventListener("click", () => this.editor.detachHands());

    this.hint = el("div", { class: "empty-hint" }, [this.defaultHint]);

    // Editor numerico de la articulacion seleccionada.
    this.jointLabel = el("label", {}, ["Articulación"]);
    const angInput = (axis: "x" | "y" | "z") => {
      const input = el("input", { type: "number", step: "5", value: "0" });
      input.addEventListener("change", () => {
        const v = parseFloat(input.value);
        if (Number.isFinite(v)) this.editor.setJointAngle(axis, v);
      });
      this.jointInputs[axis] = input;
      return el("div", { class: "sub" }, [el("label", {}, [axis.toUpperCase()]), input]);
    };
    this.jointBox = el("div", { class: "field" }, [
      this.jointLabel,
      el("div", { class: "row" }, [angInput("x"), angInput("y"), angInput("z")]),
    ]);
    this.jointBox.style.display = "none";

    this.root = el("aside", { class: "panel", id: "poses" }, [
      el("div", { class: "panel-title" }, ["Posturas"]),
      el("div", { class: "panel-body" }, [
        el("div", { class: "field" }, [el("label", {}, ["Postura"]), this.select]),
        el("div", { class: "pose-actions" }, [applyBtn, updateBtn]),
        el("div", { class: "pose-actions" }, [saveBtn, delBtn]),
        el("div", { class: "pose-actions" }, [resetBtn]),
        this.jointBox,
        el("div", { class: "field" }, [el("label", {}, ["Manos (IK)"])]),
        el("div", { class: "pose-actions" }, [attachBtn, detachBtn]),
        this.hint,
      ]),
    ]);
    this.root.style.display = "none";

    this.editor.bus.on("jointSelectionChanged", ({ name, angles }) => {
      if (name) {
        this.jointBox.style.display = "block";
        this.jointLabel.textContent = `Articulación: ${name} (grados)`;
        // Solo los ejes naturales de la articulación quedan editables.
        const axes = this.editor.getSelectedJointAxes();
        const idx = { x: 0, y: 1, z: 2 } as const;
        for (const ax of ["x", "y", "z"] as const) {
          const input = this.jointInputs[ax];
          input.value = String(angles[idx[ax]]);
          input.disabled = !axes[ax];
          input.closest(".sub")?.classList.toggle("axis-off", !axes[ax]);
        }
      } else {
        this.jointBox.style.display = "none";
      }
    });

    this.refresh();
    this.editor.bus.on("posesChanged", () => this.refresh());
    this.editor.bus.on("attachModeChanged", ({ active, stage }) => {
      attachBtn.classList.toggle("active", active);
      this.hint.textContent = !active
        ? this.defaultHint
        : stage === "hand"
          ? "Apoyar mano: haz clic en una mano/brazo de la figura."
          : "Ahora haz clic en el agarre donde apoyar la mano.";
    });
    this.editor.bus.on("humanFigureChanged", ({ present, mode }) => {
      this.root.style.display = present && mode === "mannequin" ? "flex" : "none";
    });
  }

  private hint!: HTMLElement;
  private jointBox!: HTMLElement;
  private jointLabel!: HTMLElement;
  private jointInputs = {} as { x: HTMLInputElement; y: HTMLInputElement; z: HTMLInputElement };
  private readonly defaultHint =
    "Posa la figura (clic en un miembro y rótalo) y pulsa Actualizar o Guardar como…. Con Apoyar mano, fija una mano a un agarre.";

  private refresh(): void {
    const current = this.select.value;
    clear(this.select);
    for (const name of this.editor.listPoseNames()) {
      this.select.append(el("option", { value: name }, [name]));
    }
    if (this.editor.listPoseNames().includes(current)) this.select.value = current;
  }
}
