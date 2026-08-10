import type { Editor } from "../core/Editor";
import { tt } from "../core/i18n";
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
      const name = window.prompt(tt("Nombre de la nueva postura:", "New pose name:"));
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

    // Herramienta "agarrar maniquí" (esquema Ergonómico): llevar un segmento
    // con el puntero; 1/2/3 restringe el movimiento a un eje.
    const grabBtn = el(
      "button",
      { class: "tool", title: "Agarra un segmento del cuerpo y muévelo (1/2/3 lo restringe a un eje)" },
      ["✋ Agarrar maniquí"],
    );
    grabBtn.addEventListener("click", () => this.editor.setGrabFigure(!this.editor.isGrabFigure()));
    this.editor.bus.on("grabFigureChanged", ({ on }) => {
      grabBtn.classList.toggle("active", on);
      this.hint.textContent = on
        ? tt("Agarrar maniquí: arrastra un segmento del cuerpo; el candado 🔒 fija articulaciones y 1/2/3 restringe a un eje.", "Grab mannequin: drag a body segment; the 🔒 lock pins joints and 1/2/3 restricts to one axis.")
        : this.defaultHint;
    });

    // Simetría L↔R: replicar cada cambio de pose espejado al otro lado.
    const symChk = el("input", { type: "checkbox" }) as HTMLInputElement;
    symChk.addEventListener("change", () => this.editor.setPoseSymmetry(symChk.checked));
    this.symChk = symChk;
    const symRow = el("label", { class: "pose-sym", title: "Cada cambio en un lado del cuerpo se replica espejado en el otro" }, [
      symChk,
      "Simetría L↔R",
    ]);

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
    // Candado de la articulación seleccionada (esquema Ergonómico).
    this.lockBtn = el(
      "button",
      { class: "tool", title: "Bloquear/liberar esta articulación (las bloqueadas no se posan)" },
      ["🔒 Bloquear"],
    ) as HTMLButtonElement;
    this.lockBtn.addEventListener("click", () => this.editor.toggleJointLock());

    this.jointBox = el("div", { class: "field" }, [
      this.jointLabel,
      el("div", { class: "row" }, [angInput("x"), angInput("y"), angInput("z")]),
      el("div", { class: "pose-actions" }, [this.lockBtn]),
    ]);
    this.jointBox.style.display = "none";

    // COLOCAR MANIQUÍ en construcción: el mismo modo de la barra de
    // simulación — hover sobre suelo y apoyos, clic para dejarlo puesto.
    const placeBtn = el("button", { class: "tool", title: "Colocar el maniquí tocando el suelo o un apoyo (asiento, respaldo, banco)" }, [
      "🧍 Colocar maniquí",
    ]);
    placeBtn.addEventListener("click", () => {
      if (this.editor.isColocarFigura()) this.editor.cancelColocarFigura();
      else this.editor.beginColocarFigura();
    });
    this.editor.bus.on("colocarFiguraChanged", ({ active }) =>
      placeBtn.classList.toggle("active", active),
    );
    const articBtn = el("button", { class: "tool", title: "Ventana de articulaciones: elige cuáles se mueven" }, [
      "🦴 Articulaciones",
    ]);
    articBtn.addEventListener("click", () => this.editor.panelArticulaciones?.alternar());

    this.root = el("aside", { class: "panel", id: "poses" }, [
      el("div", { class: "panel-title" }, ["Posturas"]),
      el("div", { class: "panel-body" }, [
        el("div", { class: "field" }, [el("label", {}, ["Postura"]), this.select]),
        el("div", { class: "pose-actions" }, [applyBtn, updateBtn]),
        el("div", { class: "pose-actions" }, [saveBtn, delBtn]),
        el("div", { class: "pose-actions" }, [resetBtn]),
        el("div", { class: "pose-actions" }, [grabBtn]),
        el("div", { class: "pose-actions" }, [placeBtn]),
        el("div", { class: "pose-actions" }, [articBtn]),
        symRow,
        this.jointBox,
        el("div", { class: "field" }, [el("label", {}, ["Manos (IK)"])]),
        el("div", { class: "pose-actions" }, [attachBtn, detachBtn]),
        this.hint,
      ]),
    ]);
    this.root.style.display = "none";

    this.editor.bus.on("jointSelectionChanged", ({ name, angles, locked }) => {
      if (name) {
        this.jointBox.style.display = "block";
        this.jointLabel.textContent = `${tt("Articulación", "Joint")}: ${name} (${tt("grados", "degrees")})${locked ? " · 🔒" : ""}`;
        this.lockBtn.textContent = locked ? tt("🔓 Liberar", "🔓 Unlock") : tt("🔒 Bloquear", "🔒 Lock");
        this.lockBtn.classList.toggle("active", locked);
        // Solo los ejes naturales (y sin candado) quedan editables.
        const axes = this.editor.getSelectedJointAxes();
        const idx = { x: 0, y: 1, z: 2 } as const;
        for (const ax of ["x", "y", "z"] as const) {
          const input = this.jointInputs[ax];
          input.value = String(angles[idx[ax]]);
          input.disabled = !axes[ax] || locked;
          input.closest(".sub")?.classList.toggle("axis-off", !axes[ax] || locked);
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
          ? tt("Apoyar mano: haz clic en una mano/brazo de la figura.", "Rest hand: click a hand/arm of the figure.")
          : tt("Ahora haz clic en el agarre donde apoyar la mano.", "Now click the grip where the hand should rest.");
    });
    this.editor.bus.on("humanFigureChanged", ({ present, mode }) => {
      this.root.style.display = present && mode === "mannequin" ? "flex" : "none";
      // Reasienta el estado persistido (cargar proyecto restaura la simetría).
      this.symChk.checked = this.editor.getPoseSymmetry();
    });
  }

  private hint!: HTMLElement;
  private jointBox!: HTMLElement;
  private jointLabel!: HTMLElement;
  private lockBtn!: HTMLButtonElement;
  private symChk!: HTMLInputElement;
  private jointInputs = {} as { x: HTMLInputElement; y: HTMLInputElement; z: HTMLInputElement };
  private readonly defaultHint = tt(
    "Posa la figura (clic en un miembro y rótalo) y pulsa Actualizar o Guardar como…. Con Apoyar mano, fija una mano a un agarre.",
    "Pose the figure (click a limb and rotate it) and press Update or Save as…. With Rest hand, pin a hand to a grip.",
  );

  private refresh(): void {
    const current = this.select.value;
    clear(this.select);
    for (const name of this.editor.listPoseNames()) {
      this.select.append(el("option", { value: name }, [name]));
    }
    if (this.editor.listPoseNames().includes(current)) this.select.value = current;
  }
}
