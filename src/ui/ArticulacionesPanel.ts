import type { Editor } from "../core/Editor";
import { tt } from "../core/i18n";
import { clear, el } from "./dom";

/**
 * VENTANA DEL MANIQUÍ (v0.2.45).
 *
 * Una sola ventana con DOS MODOS, que es como se trabaja de verdad:
 *
 *  · POSAR    — todo lo que fija la POSTURA DE PARTIDA: la postura guardada,
 *               agarrar un segmento, colocar la figura en el suelo o en un
 *               apoyo, la simetría y el apoyo de manos. Nada de esto depende
 *               del candado articular.
 *  · SIMULAR  — el candado por familia articular y su lado, y el movimiento
 *               de flexión/extensión (teclas 8 y 9) de todo lo liberado.
 *
 * Antes esto vivía repartido entre dos ventanas —Posturas y Articulaciones—
 * y obligaba a saltar de una a otra a mitad de gesto.
 */

const FAMILIAS: [string, string, string][] = [
  ["spine", "Columna", "Spine"],
  ["neck", "Cuello", "Neck"],
  ["shoulder", "Hombro", "Shoulder"],
  ["elbow", "Codo", "Elbow"],
  ["wrist", "Muñeca", "Wrist"],
  ["hip", "Cadera", "Hip"],
  ["knee", "Rodilla", "Knee"],
  ["ankle", "Tobillo", "Ankle"],
];

const LADOS: ["L" | "R" | "sim", string, string][] = [
  ["L", "Izquierda", "Left"],
  ["R", "Derecha", "Right"],
  ["sim", "Simétrico", "Symmetric"],
];

export class ArticulacionesPanel {
  readonly root: HTMLElement;
  private lado: "L" | "R" | "sim" = "sim";
  private casillas = new Map<string, HTMLInputElement>();
  private resumen: HTMLElement;
  private botonesLado: HTMLButtonElement[] = [];
  private modo: "posar" | "simular" = "posar";
  private ladoPosar: "L" | "R" | "sim" = "sim";
  private botonesPosar = new Map<string, HTMLButtonElement>();
  private botonesLadoPosar: HTMLButtonElement[] = [];
  private cajaPosar: HTMLElement;
  private cajaSimular: HTMLElement;
  private botonesModo: Record<"posar" | "simular", HTMLButtonElement>;

  // --- modo POSAR ---
  private select: HTMLSelectElement;
  private symChk: HTMLInputElement;
  private hint: HTMLElement;
  private jointBox: HTMLElement;
  private jointLabel: HTMLElement;
  private lockBtn: HTMLButtonElement;
  private jointInputs = {} as { x: HTMLInputElement; y: HTMLInputElement; z: HTMLInputElement };
  private readonly hintPorDefecto = tt(
    "Posa la figura (clic en un miembro y rótalo) y pulsa Actualizar o Guardar como…. Con Apoyar mano, fija una mano a un agarre.",
    "Pose the figure (click a limb and rotate it) and press Update or Save as…. With Rest hand, pin a hand to a grip.",
  );

  constructor(private editor: Editor) {
    // ------------------------------------------------------ modo POSAR
    this.select = el("select", { class: "select" }) as HTMLSelectElement;
    this.select.addEventListener("change", () => this.editor.applyPose(this.select.value));

    const bAplicar = el("button", { class: "tool", title: tt("Aplicar la postura", "Apply the pose") }, [
      tt("Aplicar", "Apply"),
    ]);
    bAplicar.addEventListener("click", () => this.editor.applyPose(this.select.value));
    const bActualizar = el("button", { class: "tool", title: tt("Sobrescribir esta postura con la pose actual", "Overwrite this pose with the current one") }, [
      tt("Actualizar", "Update"),
    ]);
    bActualizar.addEventListener("click", () => {
      if (this.select.value) this.editor.savePose(this.select.value);
    });
    const bGuardar = el("button", { class: "tool sim", title: tt("Guardar la pose actual como nueva postura", "Save the current pose as a new one") }, [
      tt("Guardar como…", "Save as…"),
    ]);
    bGuardar.addEventListener("click", () => {
      const name = window.prompt(tt("Nombre de la nueva postura:", "New pose name:"));
      if (name && name.trim()) {
        this.editor.savePose(name);
        this.select.value = name.trim();
      }
    });
    const bEliminar = el("button", { class: "tool danger", title: tt("Eliminar esta postura", "Delete this pose") }, [
      tt("Eliminar", "Delete"),
    ]);
    bEliminar.addEventListener("click", () => {
      if (this.select.value) this.editor.deletePose(this.select.value);
    });
    const bRestaurar = el("button", { class: "tool", title: tt("Restaurar las posturas de fábrica", "Restore factory poses") }, [
      tt("Restaurar def.", "Restore def."),
    ]);
    bRestaurar.addEventListener("click", () => this.editor.restoreDefaultPoses());

    const bAgarrar = el("button", { class: "tool", title: tt("Agarra un segmento del cuerpo y muévelo (1/2/3 lo restringe a un eje)", "Grab a body segment and move it (1/2/3 restricts it to one axis)") }, [
      tt("✋ Agarrar maniquí", "✋ Grab mannequin"),
    ]);
    bAgarrar.addEventListener("click", () => this.editor.setGrabFigure(!this.editor.isGrabFigure()));
    this.editor.bus.on("grabFigureChanged", ({ on }) => {
      bAgarrar.classList.toggle("active", on);
      this.hint.textContent = on
        ? tt("Agarrar maniquí: arrastra un segmento del cuerpo; el candado 🔒 fija articulaciones y 1/2/3 restringe a un eje.", "Grab mannequin: drag a body segment; the 🔒 lock pins joints and 1/2/3 restricts to one axis.")
        : this.hintPorDefecto;
    });

    const bColocar = el("button", { class: "tool", title: tt("Colocar el maniquí tocando el suelo o un apoyo (asiento, respaldo, banco)", "Place the mannequin by tapping the floor or a support (seat, backrest, bench)") }, [
      tt("🧍 Colocar maniquí", "🧍 Place mannequin"),
    ]);
    bColocar.addEventListener("click", () => {
      if (this.editor.isColocarFigura()) this.editor.cancelColocarFigura();
      else this.editor.beginColocarFigura();
    });
    this.editor.bus.on("colocarFiguraChanged", ({ active }) =>
      bColocar.classList.toggle("active", active),
    );

    this.symChk = el("input", { type: "checkbox" }) as HTMLInputElement;
    this.symChk.addEventListener("change", () => this.editor.setPoseSymmetry(this.symChk.checked));
    const filaSim = el("label", { class: "pose-sym", title: tt("Cada cambio en un lado del cuerpo se replica espejado en el otro", "Every change on one side is mirrored on the other") }, [
      this.symChk,
      tt("Simetría L↔R", "Symmetry L↔R"),
    ]);

    const bApoyar = el("button", { class: "tool", title: tt("Apoyar una mano en un agarre (IK)", "Rest a hand on a grip (IK)") }, [
      tt("Apoyar mano", "Rest hand"),
    ]);
    bApoyar.addEventListener("click", () => this.editor.beginAttachHand());
    const bSoltar = el("button", { class: "tool", title: tt("Soltar las manos apoyadas", "Release the resting hands") }, [
      tt("Soltar manos", "Release hands"),
    ]);
    bSoltar.addEventListener("click", () => this.editor.detachHands());

    this.hint = el("div", { class: "empty-hint" }, [this.hintPorDefecto]);

    // Editor numérico de la articulación seleccionada.
    this.jointLabel = el("label", {}, [tt("Articulación", "Joint")]);
    const campoAngulo = (axis: "x" | "y" | "z") => {
      const input = el("input", { type: "number", step: "5", value: "0" }) as HTMLInputElement;
      input.addEventListener("change", () => {
        const v = parseFloat(input.value);
        if (Number.isFinite(v)) this.editor.setJointAngle(axis, v);
      });
      this.jointInputs[axis] = input;
      return el("div", { class: "sub" }, [el("label", {}, [axis.toUpperCase()]), input]);
    };
    this.lockBtn = el("button", { class: "tool", title: tt("Bloquear/liberar esta articulación (las bloqueadas no se posan)", "Lock/unlock this joint (locked ones are not posed)") }, [
      tt("🔒 Bloquear", "🔒 Lock"),
    ]) as HTMLButtonElement;
    this.lockBtn.addEventListener("click", () => this.editor.toggleJointLock());
    this.jointBox = el("div", { class: "field" }, [
      this.jointLabel,
      el("div", { class: "row" }, [campoAngulo("x"), campoAngulo("y"), campoAngulo("z")]),
      el("div", { class: "pose-actions" }, [this.lockBtn]),
    ]);
    this.jointBox.style.display = "none";

    // SELECTOR DE ARTICULACIÓN, homólogo al de SIMULAR: la misma lista de
    // familias y el mismo selector de lado, pero aquí ELIGE cuál se posa —
    // así no hay que cazar el miembro en el visor para editar sus grados.
    const filasPosar = FAMILIAS.map(([fam, es, en]) => {
      const b = el("button", { class: "tool art-sel" }, [tt(es, en)]) as HTMLButtonElement;
      b.addEventListener("click", () => {
        const unico = fam === "spine" || fam === "neck";
        const nombre = unico ? fam : `${fam}${this.ladoPosar === "sim" ? "L" : this.ladoPosar}`;
        this.editor.selectJoint(nombre);
        this.marcarSeleccion(nombre);
      });
      this.botonesPosar.set(fam, b);
      return b;
    });
    const filaLadosPosar = el("div", { class: "art-lados" }, LADOS.map(([id, es, en]) => {
      const b = el("button", { class: id === "sim" ? "tool active" : "tool" }, [tt(es, en)]) as HTMLButtonElement;
      b.addEventListener("click", () => {
        this.ladoPosar = id;
        for (const o of this.botonesLadoPosar) o.classList.toggle("active", o === b);
      });
      this.botonesLadoPosar.push(b);
      return b;
    }));

    this.cajaPosar = el("div", { class: "mq-seccion" }, [
      el("div", { class: "art-hint" }, [
        tt("Fija la POSTURA DE PARTIDA. Nada de esto depende del candado.", "Set the STARTING POSE. None of this depends on the lock."),
      ]),
      el("div", { class: "art-hint" }, [tt("Lado:", "Side:")]),
      filaLadosPosar,
      el("div", { class: "art-hint" }, [
        tt("Elige la articulación que quieres posar:", "Pick the joint you want to pose:"),
      ]),
      el("div", { class: "art-rejilla" }, filasPosar),
      el("div", { class: "field" }, [el("label", {}, [tt("Postura", "Pose")]), this.select]),
      el("div", { class: "pose-actions" }, [bAplicar, bActualizar]),
      el("div", { class: "pose-actions" }, [bGuardar, bEliminar]),
      el("div", { class: "pose-actions" }, [bRestaurar]),
      el("div", { class: "pose-actions" }, [bAgarrar]),
      el("div", { class: "pose-actions" }, [bColocar]),
      filaSim,
      el("div", { class: "field" }, [el("label", {}, [tt("Manos (IK)", "Hands (IK)")])]),
      el("div", { class: "pose-actions" }, [bApoyar, bSoltar]),
      this.jointBox,
      this.hint,
    ]);

    // ---------------------------------------------------- modo SIMULAR
    const filas = FAMILIAS.map(([fam, es, en]) => {
      const chk = el("input", { type: "checkbox", class: "art-chk" }) as HTMLInputElement;
      chk.addEventListener("change", () => {
        const unico = fam === "spine" || fam === "neck";
        this.editor.setBloqueoArticular(fam, unico ? "sim" : this.lado, !chk.checked);
      });
      this.casillas.set(fam, chk);
      return el("label", { class: "art-fila" }, [chk, el("span", {}, [tt(es, en)])]);
    });

    const filaLados = el("div", { class: "art-lados" }, LADOS.map(([id, es, en]) => {
      const b = el("button", { class: id === "sim" ? "tool active" : "tool" }, [tt(es, en)]) as HTMLButtonElement;
      b.addEventListener("click", () => {
        this.lado = id;
        for (const o of this.botonesLado) o.classList.toggle("active", o === b);
        this.refrescar();
      });
      this.botonesLado.push(b);
      return b;
    }));

    const bTodo = el("button", { class: "tool" }, [tt("Bloquear todo", "Lock all")]);
    bTodo.addEventListener("click", () => {
      for (const [fam] of FAMILIAS) this.editor.setBloqueoArticular(fam, "sim", true);
    });
    const bNada = el("button", { class: "tool" }, [tt("Liberar todo", "Release all")]);
    bNada.addEventListener("click", () => {
      for (const [fam] of FAMILIAS) this.editor.setBloqueoArticular(fam, "sim", false);
    });

    // FLEXIÓN / EXTENSIÓN con las teclas 8 y 9 (los cursores ▲▼ los reclama
    // el navegador para recorrer los botones de la interfaz).
    const bFlex = el("button", { class: "tool", title: tt("Flexionar todo lo liberado (tecla 8)", "Flex everything released (key 8)") }, [
      tt("8 ▲ Flexión", "8 ▲ Flexion"),
    ]);
    const bExt = el("button", { class: "tool", title: tt("Extender todo lo liberado (tecla 9)", "Extend everything released (key 9)") }, [
      tt("9 ▼ Extensión", "9 ▼ Extension"),
    ]);
    bFlex.addEventListener("click", () => {
      this.editor.moverArticulacionesLibres(1);
      this.refrescar();
    });
    bExt.addEventListener("click", () => {
      this.editor.moverArticulacionesLibres(-1);
      this.refrescar();
    });

    this.resumen = el("div", { class: "art-resumen" }, [""]);

    this.cajaSimular = el("div", { class: "mq-seccion" }, [
      el("div", { class: "art-hint" }, [
        tt("Lado sobre el que actúan las casillas:", "Side the checkboxes act on:"),
      ]),
      filaLados,
      el("div", { class: "art-hint" }, [
        tt("Marca lo que quieras MOVER con 8/9:", "Tick what you want to MOVE with 8/9:"),
      ]),
      ...filas,
      el("div", { class: "art-acciones" }, [bTodo, bNada]),
      el("div", { class: "art-acciones mq-mover" }, [bFlex, bExt]),
      this.resumen,
      el("div", { class: "art-hint" }, [
        tt(
          "El candado solo afecta a 8/9: posar la figura y apoyar manos y pies siguen disponibles, y son los que fijan la postura de partida.",
          "Locking only affects 8/9: posing the figure and attaching hands and feet still work, and they set the starting pose.",
        ),
      ]),
    ]);

    // ------------------------------------------------------ interruptor
    const bPosar = el("button", { class: "tool active" }, [tt("🧍 Posar", "🧍 Pose")]) as HTMLButtonElement;
    const bSimular = el("button", { class: "tool" }, [tt("▶ Simular", "▶ Simulate")]) as HTMLButtonElement;
    this.botonesModo = { posar: bPosar, simular: bSimular };
    bPosar.addEventListener("click", () => this.setModo("posar"));
    bSimular.addEventListener("click", () => this.setModo("simular"));

    this.root = el("aside", { class: "panel", id: "articulaciones" }, [
      el("div", { class: "panel-title" }, [tt("Maniquí", "Mannequin")]),
      el("div", { class: "panel-body" }, [
        el("div", { class: "mq-modos" }, [bPosar, bSimular]),
        this.cajaPosar,
        this.cajaSimular,
      ]),
    ]);
    this.root.style.display = "none";
    this.setModo("posar");

    this.editor.bus.on("jointLocksChanged", () => this.refrescar());
    this.editor.bus.on("posesChanged", () => this.refrescarPosturas());
    this.editor.bus.on("humanFigureChanged", ({ present, mode }) => {
      this.symChk.checked = this.editor.getPoseSymmetry();
      // La ventana aparece sola con el maniquí (antes lo hacía Posturas).
      if (present && mode === "mannequin") this.root.style.display = "block";
      else this.root.style.display = "none";
      this.refrescar();
    });
    // Al arrancar la simulación interesa el candado; al pararla, la postura.
    this.editor.bus.on("simulationChanged", ({ running }) =>
      this.setModo(running ? "simular" : "posar"),
    );
    this.editor.bus.on("attachModeChanged", ({ active, stage }) => {
      this.hint.textContent = !active
        ? this.hintPorDefecto
        : stage === "hand"
          ? tt("Apoyar mano: haz clic en una mano/brazo de la figura.", "Rest hand: click a hand/arm of the figure.")
          : tt("Ahora haz clic en el agarre donde apoyar la mano.", "Now click the grip where the hand should rest.");
    });
    this.editor.bus.on("jointSelectionChanged", ({ name, angles, locked }) => {
      this.marcarSeleccion(name);
      if (!name) {
        this.jointBox.style.display = "none";
        return;
      }
      this.jointBox.style.display = "block";
      this.jointLabel.textContent = `${tt("Articulación", "Joint")}: ${name} (${tt("grados", "degrees")})${locked ? " · 🔒" : ""}`;
      this.lockBtn.textContent = locked ? tt("🔓 Liberar", "🔓 Unlock") : tt("🔒 Bloquear", "🔒 Lock");
      this.lockBtn.classList.toggle("active", locked);
      const ejes = this.editor.getSelectedJointAxes();
      const idx = { x: 0, y: 1, z: 2 } as const;
      for (const ax of ["x", "y", "z"] as const) {
        const input = this.jointInputs[ax];
        input.value = String(angles[idx[ax]]);
        input.disabled = !ejes[ax] || locked;
        input.closest(".sub")?.classList.toggle("axis-off", !ejes[ax] || locked);
      }
    });

    this.refrescarPosturas();
    this.refrescar();
  }

  /** Resalta en la rejilla de POSAR la familia de la articulación activa. */
  private marcarSeleccion(nombre: string | null): void {
    const fam = nombre ? nombre.replace(/[LR]$/, "") : null;
    for (const [f, b] of this.botonesPosar) b.classList.toggle("active", f === fam);
  }

  /** Cambia de modo (posar / simular). */
  setModo(m: "posar" | "simular"): void {
    this.modo = m;
    this.cajaPosar.style.display = m === "posar" ? "block" : "none";
    this.cajaSimular.style.display = m === "simular" ? "block" : "none";
    this.botonesModo.posar.classList.toggle("active", m === "posar");
    this.botonesModo.simular.classList.toggle("active", m === "simular");
    if (m === "simular") this.refrescar();
  }

  modoActual(): "posar" | "simular" {
    return this.modo;
  }

  /** Muestra u oculta la ventana. */
  alternar(): boolean {
    const visible = this.root.style.display === "none";
    this.root.style.display = visible ? "block" : "none";
    if (visible) this.refrescar();
    return visible;
  }

  visible(): boolean {
    return this.root.style.display !== "none";
  }

  private refrescarPosturas(): void {
    const actual = this.select.value;
    clear(this.select);
    for (const nombre of this.editor.listPoseNames()) {
      this.select.append(el("option", { value: nombre }, [nombre]));
    }
    if (this.editor.listPoseNames().includes(actual)) this.select.value = actual;
  }

  private refrescar(): void {
    const libres = new Set(this.editor.articulacionesLibres());
    for (const [fam] of FAMILIAS) {
      const chk = this.casillas.get(fam);
      if (!chk) continue;
      const nombres =
        fam === "spine" || fam === "neck"
          ? [fam]
          : this.lado === "sim"
            ? [`${fam}L`, `${fam}R`]
            : [`${fam}${this.lado}`];
      const libresAqui = nombres.filter((n) => libres.has(n)).length;
      chk.checked = libresAqui > 0;
      chk.indeterminate = libresAqui > 0 && libresAqui < nombres.length;
    }
    const n = libres.size;
    const base = n === 0
      ? tt("Todo bloqueado: 8/9 no moverán nada.", "All locked: 8/9 will move nothing.")
      : tt(`${n} articulación(es) libre(s) — 8/9 las mueven a la vez.`,
           `${n} joint(s) free — 8/9 move them together.`);
    // El CHOQUE con la estructura se anuncia, no se impide: es la evidencia
    // de que la máquina no deja sitio al cuerpo que va a usarla.
    this.resumen.textContent = this.editor.contactoConEstructura
      ? `${base} ⚠ ${tt("el cuerpo choca con la estructura", "the body hits the structure")}`
      : base;
    this.resumen.classList.toggle("art-choque", this.editor.contactoConEstructura);
  }
}
