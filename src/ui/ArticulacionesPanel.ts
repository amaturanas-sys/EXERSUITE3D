import type { Editor } from "../core/Editor";
import { tt } from "../core/i18n";
import { ZONAS, type LadoZona, type ZonaId } from "../objects/movimientos";
import { clear, el } from "./dom";

/**
 * VENTANA DE ERGONOMÍA (v0.2.45; zonas en v0.2.49, posado de máquina en
 * v0.2.55). Se titulaba «Maniquí», pero lo que se resuelve aquí es el
 * ENCAJE ENTRE EL CUERPO Y LA MÁQUINA: desde la v0.2.55 también se posa el
 * mecanismo, así que el nombre viejo se quedaba corto.
 *
 * Una sola ventana con DOS MODOS, que es como se trabaja de verdad:
 *
 *  · POSAR    — todo lo que fija la POSTURA DE PARTIDA: la postura guardada,
 *               agarrar un segmento, colocar la figura en el suelo o en un
 *               apoyo, la simetría y el apoyo de manos. Nada de esto depende
 *               del candado articular.
 *  · SIMULAR  — la ZONA del cuerpo que trabaja, su lado, y el sentido del
 *               gesto: EMPUJE (8) o TRACCIÓN (9). Más el ↺ que devuelve la
 *               figura a su postura de partida.
 *
 * Antes esto vivía repartido entre dos ventanas —Posturas y Articulaciones—
 * y obligaba a saltar de una a otra a mitad de gesto. Y la instrucción se daba
 * ARTICULACIÓN POR ARTICULACIÓN, lo que hacía imposible un press: empujar es
 * extender el codo MIENTRAS se flexiona el hombro, direcciones opuestas.
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
  private casillas = new Map<ZonaId, HTMLInputElement>();
  private ladosZona = new Map<ZonaId, HTMLButtonElement[]>();
  private resumen: HTMLElement;
  private modo: "posar" | "simular" = "posar";
  private ladoPosar: "L" | "R" | "sim" = "sim";
  private botonesPosar = new Map<string, HTMLButtonElement>();
  private botonesLadoPosar: HTMLButtonElement[] = [];
  private cajaPosar: HTMLElement;
  private cajaSimular: HTMLElement;
  private botonesModo: Record<"posar" | "simular", HTMLButtonElement>;

  /** Lado elegido para cada zona, se conserve activa o no. */
  private ladoPorZona = new Map<ZonaId, LadoZona>();

  // --- modo POSAR ---
  private select: HTMLSelectElement;
  private nombreNuevo: HTMLInputElement;
  private etiquetaPartida: HTMLElement;
  private botonSoltarPartida: HTMLButtonElement;
  private botonPosarMaquina: HTMLButtonElement;
  private botonFigura: HTMLButtonElement;
  private symChk: HTMLInputElement;
  private hint: HTMLElement;
  private jointBox: HTMLElement;
  private jointLabel: HTMLElement;
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
    // GUARDAR CON NOMBRE en un campo de la propia ventana (v0.2.49). Con
    // window.prompt la tableta abría un diálogo del sistema que se comía el
    // gesto —y en el WebView de la app podía no aparecer siquiera—, así que
    // guardar una postura nueva fallaba sin decir por qué.
    this.nombreNuevo = el("input", {
      type: "text",
      class: "input",
      placeholder: tt("Nombre de la postura nueva", "New pose name"),
    }) as HTMLInputElement;
    const guardarComo = () => {
      const name = this.nombreNuevo.value.trim();
      if (!name) {
        this.hint.textContent = tt(
          "Escribe un nombre para la postura antes de guardarla.",
          "Type a name for the pose before saving it.",
        );
        this.nombreNuevo.focus();
        return;
      }
      this.editor.savePose(name);
      this.select.value = name;
      this.nombreNuevo.value = "";
      this.hint.textContent = tt(`Postura "${name}" guardada.`, `Pose "${name}" saved.`);
    };
    this.nombreNuevo.addEventListener("keydown", (e) => {
      if ((e as KeyboardEvent).key === "Enter") {
        e.preventDefault();
        guardarComo();
      }
    });
    const bGuardar = el("button", { class: "tool sim", title: tt("Guardar la pose actual con el nombre escrito", "Save the current pose under the typed name") }, [
      tt("Guardar como…", "Save as…"),
    ]);
    bGuardar.addEventListener("click", guardarComo);
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
      // Rótulo corto a propósito: el panel ya dice de qué va, así que
      // repetirlo aquí solo servía para desbordar la fila (v0.2.53).
      tt("✋ Agarrar", "✋ Grab"),
    ]);
    bAgarrar.addEventListener("click", () => this.editor.setGrabFigure(!this.editor.isGrabFigure()));
    this.editor.bus.on("grabFigureChanged", ({ on }) => {
      bAgarrar.classList.toggle("active", on);
      this.hint.textContent = on
        ? tt("Agarrar maniquí: arrastra un segmento del cuerpo; el candado 🔒 fija articulaciones y 1/2/3 restringe a un eje.", "Grab mannequin: drag a body segment; the 🔒 lock pins joints and 1/2/3 restricts to one axis.")
        : this.hintPorDefecto;
    });

    const bColocar = el("button", { class: "tool", title: tt("Colocar el maniquí tocando el suelo o un apoyo (asiento, respaldo, banco)", "Place the mannequin by tapping the floor or a support (seat, backrest, bench)") }, [
      tt("🧍 Colocar", "🧍 Place"),
    ]);
    bColocar.addEventListener("click", () => {
      if (this.editor.isColocarFigura()) this.editor.cancelColocarFigura();
      else this.editor.beginColocarFigura();
    });
    this.editor.bus.on("colocarFiguraChanged", ({ active }) =>
      bColocar.classList.toggle("active", active),
    );

    // CREAR / QUITAR EL MANIQUÍ (v0.2.55): venía de la barra de arriba, donde
    // era el botón «Figura». Vive aquí porque es la primera decisión de todo
    // lo que hay en esta ventana: sin figura, nada de lo demás aplica.
    this.botonFigura = el("button", { class: "tool", title: tt(
      "Crear o quitar el maniquí de referencia",
      "Create or remove the reference mannequin",
    ) }, [tt("🧍 Crear figura", "🧍 Create figure")]) as HTMLButtonElement;
    this.botonFigura.addEventListener("click", () => void this.editor.toggleHumanFigure());
    this.editor.bus.on("humanFigureChanged", ({ present, loading }) => {
      this.botonFigura.classList.toggle("active", present);
      this.botonFigura.textContent = loading
        ? tt("Cargando…", "Loading…")
        : present
          ? tt("🗑 Quitar figura", "🗑 Remove figure")
          : tt("🧍 Crear figura", "🧍 Create figure");
    });

    this.symChk = el("input", { type: "checkbox" }) as HTMLInputElement;
    this.symChk.addEventListener("change", () => this.editor.setPoseSymmetry(this.symChk.checked));
    const filaSim = el("label", { class: "pose-sym", title: tt("Cada cambio en un lado del cuerpo se replica espejado en el otro", "Every change on one side is mirrored on the other") }, [
      this.symChk,
      tt("Simetría L↔R", "Symmetry L↔R"),
    ]);

    const bApoyar = el("button", { class: "tool", title: tt("Apoyar una mano en un agarre: toca el brazo y luego el agarre", "Rest a hand on a grip: tap the arm, then the grip") }, [
      tt("✋ Apoyar mano", "✋ Rest hand"),
    ]);
    bApoyar.addEventListener("click", () => this.editor.beginAttachHand());
    // PISAR (v0.2.52): el pie no siempre toca el suelo — en una prensa pisa la
    // plataforma, en una extensión de rodillas queda al aire.
    const bPisar = el("button", { class: "tool", title: tt(
      "Pisar una superficie o pedal: toca la pierna y luego la plataforma. La pierna la resuelve la IK y el pie viaja con la pieza.",
      "Step on a surface or pedal: tap the leg, then the platform. IK solves the leg and the foot travels with the part.",
    ) }, [tt("🦶 Pisar", "🦶 Step on")]);
    bPisar.addEventListener("click", () => this.editor.beginAttachFoot());
    const bSoltar = el("button", { class: "tool", title: tt("Soltar las manos y los pies apoyados", "Release the resting hands and feet") }, [
      tt("Soltar apoyos", "Release supports"),
    ]);
    bSoltar.addEventListener("click", () => {
      this.editor.detachHands();
      this.editor.detachFeet();
    });

    this.hint = el("div", { class: "empty-hint" }, [this.hintPorDefecto]);

    // POSTURA DE PARTIDA (v0.2.49): la referencia del ejercicio. Se fija sola
    // al aplicar una postura, al colocar la figura y al arrancar la
    // simulación, y aquí se puede clavar a mano en cualquier momento.
    this.etiquetaPartida = el("div", { class: "art-hint mq-partida" }, [""]);
    // POSAR LA MÁQUINA (v0.2.55): el símil del «Posar» del maniquí. Antes esto
    // era «📌 Fijar» y obligaba a SIMULAR para colocar el mecanismo: había que
    // cazar el instante bueno de un sistema en movimiento. Ahora se posa
    // parado, con la mano, y se queda donde lo dejas.
    this.botonPosarMaquina = el("button", { class: "tool sim", title: tt(
      "Posar la máquina: agarra una pieza móvil con la mano y se queda donde la dejes. Al terminar, ahí arrancará cada ▶. No disponible mientras el gesto corre.",
      "Pose the machine: grab a moving part with the hand and it stays where you leave it. When you finish, that is where every ▶ will begin. Not available while the gesture runs.",
    ) }, [tt("🔧 Posar máquina", "🔧 Pose machine")]) as HTMLButtonElement;
    this.botonPosarMaquina.addEventListener("click", () => {
      if (this.editor.posandoMaquina()) {
        const r = this.editor.terminarPoseMaquina();
        this.hint.textContent = r.piezas
          ? tt(
              `Máquina congelada con ${r.piezas} pieza(s): ▶ arrancará ahí.`,
              `Machine frozen with ${r.piezas} part(s): ▶ will begin there.`,
            )
          : tt(
              "La máquina quedó en su diseño: no hay nada que congelar.",
              "The machine stayed at its design: nothing to freeze.",
            );
      } else {
        void this.editor.iniciarPoseMaquina();
        this.hint.textContent = tt(
          "Posando la máquina: arrastra una pieza móvil y se quedará donde la dejes. Vuelve a pulsar para congelar la partida.",
          "Posing the machine: drag a moving part and it will stay where you leave it. Press again to freeze the start.",
        );
      }
      this.refrescarPartida();
    });
    const bVolverPartida = el("button", { class: "tool", title: tt("Devuelve la figura a su postura de partida", "Return the figure to its starting pose") }, [
      tt("↺ Volver", "↺ Back"),
    ]);
    bVolverPartida.addEventListener("click", () => {
      this.editor.reiniciarPoseDePartida();
      this.refrescar();
    });
    // Soltar solo aparece cuando hay algo que soltar: la máquina congelada.
    this.botonSoltarPartida = el("button", { class: "tool danger", title: tt(
      "La máquina vuelve a arrancar en su diseño (la postura del maniquí se conserva)",
      "The machine goes back to starting at its design (the mannequin's pose is kept)",
    ) }, [tt("🗑 Soltar máquina", "🗑 Release machine")]) as HTMLButtonElement;
    this.botonSoltarPartida.addEventListener("click", () => {
      this.editor.soltarPartidaMaquina();
      this.hint.textContent = tt(
        "La máquina vuelve a arrancar en su diseño.",
        "The machine starts at its design again.",
      );
      this.refrescarPartida();
    });

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
    // Sin botón de candado (v0.2.51): el candado lo fija la ZONA activa del
    // modo SIMULAR, así que tenerlo aquí era un segundo mando para lo mismo —
    // y encima al final de una columna que había que recorrer entera.
    this.jointBox = el("div", { class: "field" }, [
      this.jointLabel,
      el("div", { class: "row" }, [campoAngulo("x"), campoAngulo("y"), campoAngulo("z")]),
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

    // ORDEN POR TAREA, no por tipo de control (v0.2.51). Antes había que
    // recorrer la columna entera para llegar a los grados de una articulación,
    // y la mitad de los mandos eran rótulos. Ahora: primero se pone la figura
    // donde va, luego se fija la referencia del ejercicio, luego la postura, y
    // el detalle articular al final — que es el orden en que se trabaja.
    const grupo = (titulo: string, hijos: (HTMLElement | string)[]) =>
      el("div", { class: "mq-grupo" }, [el("div", { class: "mq-grupo-titulo" }, [titulo]), ...hijos]);

    const masPosturas = el("details", { class: "mq-mas" }, [
      el("summary", {}, [tt("Gestionar posturas", "Manage poses")]),
      el("div", { class: "field" }, [this.nombreNuevo]),
      el("div", { class: "pose-actions" }, [bGuardar, bActualizar]),
      el("div", { class: "pose-actions" }, [bEliminar, bRestaurar]),
    ]);

    this.cajaPosar = el("div", { class: "mq-seccion" }, [
      el("div", { class: "pose-actions" }, [this.botonFigura]),
      el("div", { class: "pose-actions" }, [bColocar, bAgarrar]),

      grupo(tt("Partida del ejercicio", "Exercise start"), [
        el("div", { class: "pose-actions" }, [this.botonPosarMaquina, bVolverPartida]),
        this.etiquetaPartida,
        el("div", { class: "pose-actions" }, [this.botonSoltarPartida]),
      ]),

      grupo(tt("Postura", "Pose"), [
        el("div", { class: "row mq-fila-postura" }, [this.select, bAplicar]),
        masPosturas,
      ]),

      grupo(tt("Articulación", "Joint"), [
        filaLadosPosar,
        el("div", { class: "art-rejilla" }, filasPosar),
        this.jointBox,
      ]),

      grupo(tt("Apoyos y simetría", "Supports and symmetry"), [
        el("div", { class: "pose-actions" }, [bApoyar, bPisar]),
        el("div", { class: "pose-actions" }, [bSoltar]),
        filaSim,
      ]),

      this.hint,
    ]);

    // ---------------------------------------------------- modo SIMULAR
    //
    // La instrucción es la del gesto real: ZONA + SENTIDO. El EMPUJE aleja la
    // carga del cuerpo y la TRACCIÓN la acerca; cada zona reparte el paso
    // entre sus articulaciones con el signo que le toca por anatomía. Marcando
    // varias zonas el movimiento sale simultáneo, y el lado de cada una lo
    // hace simétrico, asimétrico o sectorizado.
    const filasZona = ZONAS.map((z) => {
      const chk = el("input", { type: "checkbox", class: "art-chk" }) as HTMLInputElement;
      chk.addEventListener("change", () => {
        this.editor.activarZona(z.id, chk.checked ? (this.ladoElegido(z.id) ?? "sim") : null);
        this.refrescar();
      });
      this.casillas.set(z.id, chk);

      const botones = LADOS.map(([id, es, en]) => {
        const b = el("button", { class: "tool art-lado-mini", title: tt(es, en) }, [
          id === "sim" ? "L+R" : id,
        ]) as HTMLButtonElement;
        b.addEventListener("click", () => {
          this.ladoPorZona.set(z.id, id);
          // Elegir lado ACTIVA la zona: es lo que se quería decir al tocarlo.
          this.editor.activarZona(z.id, id);
          this.refrescar();
        });
        return b;
      });
      this.ladosZona.set(z.id, botones);

      const empuje = z.patron.map((a) => tt(a.es, a.en)).join(" + ");
      return el("div", { class: "mq-zona" }, [
        el("label", { class: "art-fila" }, [chk, el("span", {}, [tt(z.es, z.en)])]),
        el("div", { class: "art-lados" }, botones),
        el("div", { class: "mq-zona-detalle" }, [`${tt("Empuje", "Push")}: ${empuje}`]),
      ]);
    });

    // EMPUJE / TRACCIÓN con las teclas 8 y 9 (los cursores ▲▼ los reclama el
    // navegador para recorrer los botones de la interfaz).
    const bEmpuje = el("button", { class: "tool", title: tt("EMPUJE: aleja la carga del cuerpo (tecla 8)", "PUSH: drives the load away from the body (key 8)") }, [
      tt("8 ▸ Empuje", "8 ▸ Push"),
    ]);
    const bTraccion = el("button", { class: "tool", title: tt("TRACCIÓN: acerca la carga al cuerpo (tecla 9)", "PULL: draws the load toward the body (key 9)") }, [
      tt("9 ◂ Tracción", "9 ◂ Pull"),
    ]);
    bEmpuje.addEventListener("click", () => {
      this.editor.moverPrimitiva(1);
      this.refrescar();
    });
    bTraccion.addEventListener("click", () => {
      this.editor.moverPrimitiva(-1);
      this.refrescar();
    });

    const bReiniciar = el("button", { class: "tool", title: tt("Devuelve la figura a su postura de partida", "Return the figure to its starting pose") }, [
      tt("↺ Postura de partida", "↺ Starting pose"),
    ]);
    bReiniciar.addEventListener("click", () => {
      if (!this.editor.reiniciarPoseDePartida()) {
        return;
      }
      this.refrescar();
    });

    this.resumen = el("div", { class: "art-resumen" }, [""]);

    this.cajaSimular = el("div", { class: "mq-seccion" }, [
      el("div", { class: "art-hint" }, [
        tt(
          "Marca la ZONA que trabaja y su lado. 8 EMPUJA (aleja la carga) y 9 TRACCIONA (la acerca).",
          "Tick the ZONE that works and its side. 8 PUSHES (drives the load away) and 9 PULLS (draws it in).",
        ),
      ]),
      ...filasZona,
      el("div", { class: "art-acciones mq-mover" }, [bEmpuje, bTraccion]),
      el("div", { class: "art-acciones" }, [bReiniciar]),
      this.resumen,
      el("div", { class: "art-hint" }, [
        tt(
          "El PLANO lo pone la postura de partida, no el botón: con el hombro a la altura del pecho el empuje sale horizontal (press de pecho) y con los brazos arriba, vertical (press militar). La tracción, igual: desde delante es remo y desde arriba, jalón.",
          "The PLANE comes from the starting pose, not from the button: with the shoulder at chest height the push is horizontal (chest press); with the arms overhead it is vertical (overhead press). Same for the pull: from the front it is a row, from above a pulldown.",
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
      el("div", { class: "panel-title" }, [tt("Ergonomía", "Ergonomics")]),
      el("div", { class: "panel-body" }, [
        el("div", { class: "mq-modos" }, [bPosar, bSimular]),
        this.cajaPosar,
        this.cajaSimular,
      ]),
    ]);
    this.root.style.display = "none";
    this.setModo("posar");

    this.editor.bus.on("jointLocksChanged", () => this.refrescar());
    this.editor.bus.on("poseDePartidaChanged", () => this.refrescarPartida());
    this.editor.bus.on("poseMaquinaChanged", () => this.refrescarPartida());
    this.editor.bus.on("simulationChanged", () => this.refrescarPartida());
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
          ? tt("Toca el miembro de la figura: el brazo para apoyar la mano, la pierna para pisar.", "Tap the figure's limb: the arm to rest a hand, the leg to step on something.")
          : tt("Ahora toca la pieza donde se apoya (agarre, plataforma o pedal).", "Now tap the part it rests on (grip, platform or pedal).");
    });
    this.editor.bus.on("jointSelectionChanged", ({ name, angles }) => {
      this.marcarSeleccion(name);
      if (!name) {
        this.jointBox.style.display = "none";
        return;
      }
      this.jointBox.style.display = "block";
      this.jointLabel.textContent = `${name} (${tt("grados", "degrees")})`;
      // Los ejes que la articulación NO tiene salen apagados; el candado ya no
      // pinta aquí, porque posar no depende de él.
      const ejes = this.editor.getSelectedJointAxes();
      const idx = { x: 0, y: 1, z: 2 } as const;
      for (const ax of ["x", "y", "z"] as const) {
        const input = this.jointInputs[ax];
        input.value = String(angles[idx[ax]]);
        input.disabled = !ejes[ax];
        input.closest(".sub")?.classList.toggle("axis-off", !ejes[ax]);
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

  /** Lado elegido para una zona (el activo manda; si no, el recordado). */
  private ladoElegido(id: ZonaId): LadoZona | null {
    return this.editor.ladoDeZona(id) ?? this.ladoPorZona.get(id) ?? null;
  }

  /** Etiqueta de la partida: postura del maniquí y, si la hay, de la máquina. */
  private refrescarPartida(): void {
    const nombre = this.editor.nombrePoseDePartida();
    const piezas = this.editor.piezasEnLaPartida();
    const postura = !this.editor.tienePoseDePartida()
      ? tt("sin postura fijada", "no pose pinned")
      : nombre
        ? tt(`postura "${nombre}"`, `pose “${nombre}”`)
        : tt("la postura que tenía al fijarla", "the pose it had when pinned");
    const maquina = piezas
      ? tt(`máquina congelada (${piezas} pieza(s))`, `machine frozen (${piezas} part(s))`)
      : tt("máquina en su diseño", "machine at its design");
    this.etiquetaPartida.textContent = `▶ ${postura} · ${maquina}`;
    this.etiquetaPartida.classList.toggle("mq-partida-maquina", piezas > 0);
    this.botonSoltarPartida.style.display = piezas ? "" : "none";

    // POSAR MÁQUINA solo tiene sentido con el gesto parado: mientras corre, el
    // mecanismo está en manos de la física y colocarlo a mano no significa nada.
    const posando = this.editor.posandoMaquina();
    const simulando = this.editor.isSimulating();
    this.botonPosarMaquina.classList.toggle("active", posando);
    this.botonPosarMaquina.disabled = simulando;
    this.botonPosarMaquina.textContent = posando
      ? tt("✓ Congelar aquí", "✓ Freeze here")
      : tt("🔧 Posar máquina", "🔧 Pose machine");
    this.botonPosarMaquina.title = simulando
      ? tt(
          "No disponible mientras el gesto corre: ahí manda la física. Detén la simulación para posar la máquina.",
          "Not available while the gesture runs: physics is in charge there. Stop the simulation to pose the machine.",
        )
      : tt(
          "Posar la máquina: agarra una pieza móvil con la mano y se queda donde la dejes.",
          "Pose the machine: grab a moving part with the hand and it stays where you leave it.",
        );
  }

  private refrescar(): void {
    const zonas = this.editor.zonasDeMovimiento();
    for (const z of ZONAS) {
      const activa = zonas.get(z.id) ?? null;
      const chk = this.casillas.get(z.id);
      if (chk) chk.checked = activa !== null;
      const marcado = activa ?? this.ladoPorZona.get(z.id) ?? "sim";
      const botones = this.ladosZona.get(z.id) ?? [];
      botones.forEach((b, i) => {
        b.classList.toggle("active", LADOS[i][0] === marcado && activa !== null);
      });
    }
    this.refrescarPartida();

    const activas = [...zonas].map(([id, lado]) => {
      const z = ZONAS.find((q) => q.id === id);
      const suf = lado === "sim" ? "" : ` (${lado})`;
      return `${z ? tt(z.es, z.en) : id}${suf}`;
    });
    const partes: string[] = [];
    partes.push(
      activas.length === 0
        ? tt("Ninguna zona activa: 8/9 no moverán nada.", "No zone active: 8/9 will move nothing.")
        : tt(`Trabajan: ${activas.join(", ")}.`, `Working: ${activas.join(", ")}.`),
    );
    // El CHOQUE con la estructura se anuncia, no se impide: es la evidencia
    // de que la máquina no deja sitio al cuerpo que va a usarla.
    if (this.editor.contactoConEstructura) {
      partes.push(`⚠ ${tt("el cuerpo choca con la estructura", "the body hits the structure")}`);
    }
    // Y si el tobillo se queda sin recorrido, el pie deja de apoyar: la
    // plataforma pide un ángulo que el cuerpo no tiene.
    if (this.editor.acomodacionAlLimite) {
      partes.push(
        `⚠ ${tt("el tobillo llega a su tope: el pie pierde el apoyo", "the ankle hits its limit: the foot loses contact")}`,
      );
    }
    const aviso = this.editor.contactoConEstructura || this.editor.acomodacionAlLimite;
    this.resumen.textContent = partes.join(" ");
    this.resumen.classList.toggle("art-choque", aviso);
  }
}
