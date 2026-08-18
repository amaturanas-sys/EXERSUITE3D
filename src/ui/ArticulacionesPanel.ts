import type { Editor } from "../core/Editor";
import { tt } from "../core/i18n";
import { ZONAS, type LadoZona, type ZonaId } from "../objects/movimientos";
import { EJERCICIOS_BARRA } from "../objects/barraManiqui";
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

/** Familia, nombre en español, en inglés y GÉNERO (para «derecha/derecho»). */
const FAMILIAS: [string, string, string, "f" | "m"][] = [
  ["spine", "Columna", "Spine", "f"],
  ["neck", "Cuello", "Neck", "m"],
  ["shoulder", "Hombro", "Shoulder", "m"],
  ["elbow", "Codo", "Elbow", "m"],
  ["wrist", "Muñeca", "Wrist", "f"],
  ["hip", "Cadera", "Hip", "f"],
  ["knee", "Rodilla", "Knee", "f"],
  ["ankle", "Tobillo", "Ankle", "m"],
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
  private campoArticulacion: HTMLInputElement;
  private cajaPosar: HTMLElement;
  private cajaSimular: HTMLElement;
  private botonesModo: Record<"posar" | "simular", HTMLButtonElement>;

  /** Lado elegido para cada zona, se conserve activa o no. */
  private ladoPorZona = new Map<ZonaId, LadoZona>();

  // --- modo POSAR ---
  private select: HTMLSelectElement;
  // --- barra en manos (v0.2.81)
  private selectBarra: HTMLSelectElement;
  private botonRack: HTMLButtonElement;
  private discosBarra: HTMLInputElement;
  private etiquetaBarra: HTMLElement;
  private cajaBarra: HTMLElement;
  private nombreNuevo: HTMLInputElement;
  private etiquetaPartida: HTMLElement;
  private etiquetaApoyos: HTMLElement;
  private rumbo!: HTMLInputElement;
  private filaRumbo!: HTMLElement;
  private botonSoltarPartida: HTMLButtonElement;
  private botonPosarMaquina: HTMLButtonElement;
  private selectPartidas: HTMLSelectElement;
  private masPartidas: HTMLElement;
  private filaPartidas: HTMLElement;
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

    // BARRA EN MANOS (v0.2.81). Un ejercicio con barra no es una postura: son
    // DOS —el final alto y el final bajo— y una carga. Por eso aquí no hay un
    // selector de posturas más, sino el ejercicio, sus dos extremos y los
    // discos, que es lo que se necesita para dimensionar un rack.
    this.selectBarra = el("select", { class: "select" }) as HTMLSelectElement;
    this.selectBarra.append(
      el("option", { value: "" }, [tt("Sin barra", "No barbell")]),
      ...EJERCICIOS_BARRA.map((e) => el("option", { value: e.id }, [tt(e.es, e.en)])),
    );
    this.selectBarra.addEventListener("change", () => {
      if (this.selectBarra.value) this.editor.ponerBarraEnManos(this.selectBarra.value);
      else this.editor.soltarBarraDelManiqui();
      this.refrescarBarra();
    });

    const bArriba = el("button", { class: "tool", title: tt("Llevar la figura al final ALTO del recorrido", "Take the figure to the TOP of the range") }, [
      tt("△ Arriba", "△ Top"),
    ]);
    bArriba.addEventListener("click", () => { this.editor.aplicarPosturaBarra("arriba"); this.refrescarBarra(); });
    const bFondo = el("button", { class: "tool", title: tt("Llevar la figura al final BAJO del recorrido", "Take the figure to the BOTTOM of the range") }, [
      tt("▽ Fondo", "▽ Bottom"),
    ]);
    bFondo.addEventListener("click", () => { this.editor.aplicarPosturaBarra("fondo"); this.refrescarBarra(); });

    this.discosBarra = el("input", {
      type: "number", class: "input num", min: "0", step: "1", value: "0",
      title: tt("Discos montados (se reparten a los dos lados)", "Plates loaded (split between both sides)"),
    }) as HTMLInputElement;
    this.discosBarra.addEventListener("change", () => {
      this.editor.setDiscosBarra(+this.discosBarra.value || 0);
      this.refrescarBarra();
    });

    this.botonRack = el("button", { class: "tool", title: tt("Dejar la barra en el gancho más cercano, o volver a cogerla", "Leave the barbell on the nearest hook, or take it back") }, [
      tt("⤓ Rackear", "⤓ Rack"),
    ]) as HTMLButtonElement;
    this.botonRack.addEventListener("click", () => {
      const b = this.editor.getBarraManiqui();
      if (!b) return;
      const hecho = b.rackeada ? this.editor.desrackearBarra() : this.editor.rackearBarra();
      if (!hecho && !b.rackeada) {
        this.etiquetaBarra.textContent = tt(
          "No hay ningún gancho en la escena donde dejarla.",
          "There is no hook in the scene to leave it on.",
        );
        return;
      }
      this.refrescarBarra();
    });

    this.etiquetaBarra = el("div", { class: "mq-nota" }, [""]);
    const filaBarra = el("div", { class: "pose-actions" }, [bArriba, bFondo]);
    const filaCarga = el("div", { class: "mq-barra" }, [
      el("span", { class: "mq-etq" }, [tt("Discos", "Plates")]),
      this.discosBarra,
      this.botonRack,
    ]);
    this.cajaBarra = el("div", {}, [
      el("div", { class: "row" }, [this.selectBarra]),
      filaBarra,
      filaCarga,
      this.etiquetaBarra,
    ]);

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

    // HACIA DÓNDE MIRA (v0.2.91). Colocar adivina el rumbo —midiendo el asiento,
    // o apuntando a la máquina fija más cercana— y acierta casi siempre; pero
    // adivinar no es decidir. Aquí se dice: dos botones para girar de cuarto en
    // cuarto y un número para clavarlo exacto.
    this.rumbo = el("input", {
      type: "number", step: "15", min: "-180", max: "360", class: "mq-num",
      title: tt("Grados hacia donde mira (0° = hacia +Z)", "Degrees the mannequin faces (0° = towards +Z)"),
    }) as HTMLInputElement;
    const girar = (d: number) => el("button", { class: "tool", title: d < 0
      ? tt("Girar 45° a la izquierda", "Turn 45° left")
      : tt("Girar 45° a la derecha", "Turn 45° right") }, [d < 0 ? "↺" : "↻"]);
    const bIzq = girar(-45);
    const bDer = girar(45);
    bIzq.addEventListener("click", () => this.editor.girarFigura(-45));
    bDer.addEventListener("click", () => this.editor.girarFigura(45));
    this.rumbo.addEventListener("change", () => {
      const v = parseFloat(this.rumbo.value);
      if (Number.isFinite(v)) this.editor.setRumboFigura(v);
    });
    // VA EN LA MISMA FILA QUE «Colocar» y «Agarrar», sin añadir alto: el panel
    // ya roza la barra de simulación en una tablet de 800×1280, y una fila más
    // la solapaba. El número lleva su propia ayuda, así que no hace falta
    // etiqueta ni unidad.
    this.filaRumbo = el("span", { class: "mq-rumbo" }, [bIzq, this.rumbo, bDer]);
    const pintarRumbo = () => { this.rumbo.value = String(this.editor.rumboFigura()); };
    this.editor.bus.on("figuraRumboChanged", pintarRumbo);
    this.editor.bus.on("humanFigureChanged", pintarRumbo);
    pintarRumbo();

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

    // BILATERAL (v0.2.56): antes esto era una casilla «Simetría L↔R» perdida
    // al final de la ventana, lejos de la articulación a la que afecta. Ahora
    // es el interruptor que acompaña al nombre: dice si lo que hagas con ESA
    // articulación se replica espejado en la del otro lado.
    this.symChk = el("input", { type: "checkbox" }) as HTMLInputElement;
    this.symChk.addEventListener("change", () => this.editor.setPoseSymmetry(this.symChk.checked));
    const filaSim = el("label", { class: "mq-interruptor", title: tt("Cada cambio en un lado del cuerpo se replica espejado en el otro", "Every change on one side is mirrored on the other") }, [
      this.symChk,
      tt("Bilateral (los dos lados)", "Bilateral (both sides)"),
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
      this.refrescarApoyos();
    });

    this.hint = el("div", { class: "empty-hint" }, [this.hintPorDefecto]);
    // QUÉ HAY APOYADO. Sin esto, un puño en el aire podía ser «no llega» o
    // «nunca lo apoyaste», y no había manera de distinguirlos.
    this.etiquetaApoyos = el("div", { class: "art-hint" }, [""]);

    // POSTURA DE PARTIDA (v0.2.49): la referencia del ejercicio. Se fija sola
    // al aplicar una postura, al colocar la figura y al arrancar la
    // simulación, y aquí se puede clavar a mano en cualquier momento.
    this.etiquetaPartida = el("div", { class: "art-hint mq-partida" }, [""]);
    // LA PARTIDA, COMO UN REPRODUCTOR (v0.2.56). ▶ pone la máquina en las
    // manos del usuario —se mueve como en simulación pero sin gravedad ni
    // tiempo, cuadro a cuadro, y se queda donde la dejes— y ⏹ congela ese
    // cuadro como punto de partida. Antes era un solo botón que alternaba, y
    // no se entendía que lo primero es MOVER y lo segundo FIJAR.
    this.botonPosarMaquina = el("button", { class: "tool sim", title: tt(
      "▶ Manipular la máquina: arrastra una pieza móvil y se queda donde la dejes. No disponible mientras el gesto corre.",
      "▶ Handle the machine: drag a moving part and it stays where you leave it. Not available while the gesture runs.",
    ) }, [tt("▶ Manipular", "▶ Handle")]) as HTMLButtonElement;
    this.botonPosarMaquina.addEventListener("click", () => {
      if (this.editor.posandoMaquina()) {
        const r = this.editor.terminarPoseMaquina();
        const nombre = this.editor.guardarPartida();
        this.selectPartidas.value = nombre;
        this.hint.textContent = r.piezas
          ? tt(
              `«${nombre}» guardada con ${r.piezas} pieza(s): ▶ arrancará ahí.`,
              `“${nombre}” saved with ${r.piezas} part(s): ▶ will begin there.`,
            )
          : tt(
              `«${nombre}» guardada con la máquina en su diseño.`,
              `“${nombre}” saved with the machine at its design.`,
            );
      } else {
        void this.editor.iniciarPoseMaquina();
        this.hint.textContent = tt(
          "Manipulando la máquina: arrastra una pieza móvil y se quedará donde la dejes. Pulsa ⏹ para fijar ese punto de partida.",
          "Handling the machine: drag a moving part and it will stay where you leave it. Press ⏹ to pin that start point.",
        );
      }
      this.refrescarPartida();
    });

    // Gestor de PUNTOS DE PARTIDA, hermano del de posturas: se crean numerados
    // y se recuperan, para ensayar el mismo diseño desde varias
    // configuraciones ergonómicas sin rehacerlas cada vez.
    this.selectPartidas = el("select", { class: "select" }) as HTMLSelectElement;
    this.selectPartidas.addEventListener("change", () => {
      if (this.selectPartidas.value) this.editor.aplicarPartida(this.selectPartidas.value);
    });
    const bAplicarPartida = el("button", { class: "tool", title: tt(
      "Recuperar este punto de partida", "Recall this start point",
    ) }, [tt("Aplicar", "Apply")]);
    bAplicarPartida.addEventListener("click", () => {
      if (this.selectPartidas.value) this.editor.aplicarPartida(this.selectPartidas.value);
    });
    const bBorrarPartida = el("button", { class: "tool danger", title: tt(
      "Eliminar este punto de partida", "Delete this start point",
    ) }, [tt("Eliminar", "Delete")]);
    bBorrarPartida.addEventListener("click", () => {
      if (this.selectPartidas.value) this.editor.eliminarPartida(this.selectPartidas.value);
    });
    const bGuardarPartida = el("button", { class: "tool sim", title: tt(
      "Guardar el estado actual como un punto de partida nuevo",
      "Save the current state as a new start point",
    ) }, [tt("Guardar actual", "Save current")]);
    bGuardarPartida.addEventListener("click", () => {
      const n = this.editor.guardarPartida();
      this.selectPartidas.value = n;
      this.hint.textContent = tt(`«${n}» guardada.`, `“${n}” saved.`);
    });
    this.filaPartidas = el("div", { class: "row mq-fila-postura" }, [
      this.selectPartidas,
      bAplicarPartida,
    ]);
    this.masPartidas = el("details", { class: "mq-mas" }, [
      el("summary", {}, [tt("Gestionar partidas", "Manage start points")]),
      el("div", { class: "pose-actions" }, [bGuardarPartida, bBorrarPartida]),
    ]);

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
    // Va dentro de un <summary>, así que es un span: un <label> se come el
    // clic que despliega.
    this.jointLabel = el("span", {}, [tt("Grados exactos", "Exact degrees")]);
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
    // PLEGADO (v0.2.56): los grados exactos se tocan de vez en cuando —posar
    // se hace arrastrando— y ocupaban cuatro líneas fijas en una ventana que
    // ya pedía desplazarse. Plegado, el nombre de la articulación sigue a la
    // vista en el resumen y los números salen al abrirlo.
    this.jointBox = el("details", { class: "mq-mas mq-grados" }, [
      el("summary", {}, [this.jointLabel]),
      el("div", { class: "row" }, [campoAngulo("x"), campoAngulo("y"), campoAngulo("z")]),
    ]);
    this.jointBox.style.display = "none";

    // ARTICULACIÓN, en una línea (v0.2.56). Antes había una rejilla de ocho
    // familias más tres botones de lado: once mandos para decir algo que el
    // usuario YA dijo al tocar el miembro en el visor. Ahora el campo REFLEJA
    // lo tocado —no hay que elegir dos veces— y al lado va el único ajuste que
    // de verdad cambia el resultado: si el gesto es bilateral o de un lado.
    this.campoArticulacion = el("input", {
      type: "text",
      class: "input mq-articulacion",
      readOnly: true,
      title: tt("La articulación que tocaste en el visor", "The joint you tapped in the viewport"),
      placeholder: tt("toca un miembro de la figura", "tap a limb of the figure"),
    }) as HTMLInputElement;

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

    // ORDEN DE POSAR (v0.2.56), el de la tarea real: primero decides si hay
    // figura y dónde va, luego qué postura tiene, luego afinas una
    // articulación, luego dónde se apoya — y solo al final, con el cuerpo ya
    // resuelto, dónde arranca la máquina. La partida baja del segundo puesto
    // al último porque es la consecuencia de todo lo anterior, no su premisa.
    this.cajaPosar = el("div", { class: "mq-seccion" }, [
      el("div", { class: "pose-actions" }, [this.botonFigura]),
      el("div", { class: "pose-actions" }, [bColocar, bAgarrar, this.filaRumbo]),

      grupo(tt("Postura", "Pose"), [
        el("div", { class: "row mq-fila-postura" }, [this.select, bAplicar]),
        masPosturas,
      ]),

      grupo(tt("Barra", "Barbell"), [this.cajaBarra]),

      grupo(tt("Articulación", "Joint"), [
        this.campoArticulacion,
        filaSim,
        this.jointBox,
      ]),

      // LA MÁQUINA, ANTES QUE LOS APOYOS (v0.2.91), y lo pidió el diseñador:
      // «la función de posar máquina debe anteceder a la postura de apoyos
      // (manos y pies) para que sea posible acomodar adecuadamente el modelo
      // en el espacio». Es el orden del gesto real —primero se lleva el
      // mecanismo al punto donde empieza el ejercicio y sólo entonces se pone
      // la mano en el mando— y además el único que funciona: apoyar contra un
      // mando dibujado en su sitio de plano es apoyar en el aire.
      grupo(tt("Partida del ejercicio", "Exercise start"), [
        el("div", { class: "pose-actions" }, [this.botonPosarMaquina, bVolverPartida]),
        this.filaPartidas,
        this.masPartidas,
        this.etiquetaPartida,
        el("div", { class: "pose-actions" }, [this.botonSoltarPartida]),
      ]),

      grupo(tt("Apoyos", "Supports"), [
        el("div", { class: "pose-actions" }, [bApoyar, bPisar]),
        el("div", { class: "pose-actions" }, [bSoltar]),
        this.etiquetaApoyos,
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
    this.editor.bus.on("partidasChanged", ({ nombres, activa }) => {
      const previo = activa ?? this.selectPartidas.value;
      clear(this.selectPartidas);
      for (const n of nombres) this.selectPartidas.append(el("option", { value: n }, [n]));
      if (previo && nombres.includes(previo)) this.selectPartidas.value = previo;
      this.mostrarGestorPartidas(nombres.length > 0);
      this.refrescarPartida();
    });
    this.editor.bus.on("humanFigureChanged", ({ present, mode }) => {
      this.symChk.checked = this.editor.getPoseSymmetry();
      // La ventana aparece sola con el maniquí (antes lo hacía Posturas).
      if (present && mode === "mannequin") this.root.style.display = "block";
      else this.root.style.display = "none";
      this.refrescar();
    });
    // Al arrancar la simulación interesa el candado; al pararla, la postura.
    // POSAR LA MÁQUINA ES LA EXCEPCIÓN: enciende el motor pero sigue siendo
    // POSAR —se está acomodando el mecanismo para el maniquí—, y saltar a
    // SIMULAR escondía justo los mandos que hacen falta ahí, los de apoyos.
    this.editor.bus.on("simulationChanged", ({ running }) =>
      this.setModo(running && !this.editor.posandoMaquina() ? "simular" : "posar"),
    );
    this.editor.bus.on("poseMaquinaChanged", () => {
      this.setModo(this.editor.posandoMaquina() || !this.editor.isSimulating() ? "posar" : "simular");
      this.refrescarApoyos();
    });
    this.editor.bus.on("attachModeChanged", () => this.refrescarApoyos());
    this.editor.bus.on("attachModeChanged", ({ active, stage }) => {
      this.hint.textContent = !active
        ? this.hintPorDefecto
        : stage === "hand"
          ? tt("Toca el miembro de la figura: el brazo para apoyar la mano, la pierna para pisar.", "Tap the figure's limb: the arm to rest a hand, the leg to step on something.")
          : tt("Ahora toca la pieza donde se apoya (agarre, plataforma o pedal).", "Now tap the part it rests on (grip, platform or pedal).");
    });
    // La barra puede cambiar sin pasar por este panel (cargar un proyecto,
    // vaciar la escena, borrar la pieza), así que la caja se refresca desde el
    // editor y no desde sus propios botones.
    this.editor.bus.on("barraManiquiChanged", () => {
      this.refrescarBarra();
      // Poner una barra activa la zona de su ejercicio, así que las casillas
      // de SIMULAR también hay que ponerlas al día: si no, marcaban «tren
      // superior» mientras el maniquí ya estaba armado para un peso muerto.
      this.refrescar();
    });
    this.editor.bus.on("jointSelectionChanged", ({ name, angles }) => {
      this.marcarSeleccion(name);
      if (!name) {
        this.jointBox.style.display = "none";
        return;
      }
      this.jointBox.style.display = "block";
      // El mismo nombre legible que el campo de arriba: ver «kneeR» aquí y
      // «Rodilla derecha» dos líneas más arriba parecían dos cosas distintas.
      this.jointLabel.textContent =
        `${this.campoArticulacion.value || name} (${tt("grados", "degrees")})`;
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
    this.refrescarBarra();
    this.mostrarGestorPartidas(this.editor.listaPartidas().length > 0);
    this.refrescar();
  }

  /**
   * El selector de partidas y su gestor solo aparecen cuando hay alguna
   * guardada: hasta el primer ⏹ no hay nada que elegir, y una fila vacía es
   * alto que luego hay que desplazar.
   */
  private mostrarGestorPartidas(hay: boolean): void {
    this.filaPartidas.style.display = hay ? "" : "none";
    this.masPartidas.style.display = hay ? "" : "none";
  }

  /**
   * Escribe en el campo la articulación tocada, con nombre de persona:
   * «shoulderL» no le dice nada a nadie, «Hombro izquierdo» sí.
   */
  private marcarSeleccion(nombre: string | null): void {
    if (!nombre) {
      this.campoArticulacion.value = "";
      return;
    }
    const lado = /L$/.test(nombre) ? "L" : /R$/.test(nombre) ? "R" : null;
    const fam = nombre.replace(/[LR]$/, "");
    const def = FAMILIAS.find(([f]) => f === fam);
    const base = def ? tt(def[1], def[2]) : fam;
    // «Rodilla derecho» chirría: el adjetivo concuerda con el nombre.
    const fem = def?.[3] === "f";
    const sufijo = lado === "L"
      ? tt(fem ? " izquierda" : " izquierdo", " left")
      : lado === "R"
        ? tt(fem ? " derecha" : " derecho", " right")
        : "";
    this.campoArticulacion.value = base + sufijo;
  }

  /** Dice en voz alta qué manos y pies están apoyados, y en qué pieza. */
  private refrescarApoyos(): void {
    const puestos = this.editor.apoyosPuestos?.() ?? [];
    this.etiquetaApoyos.textContent = puestos.length === 0
      ? tt("Nada apoyado.", "Nothing resting.")
      : puestos
          .map((a) => {
            const que = a.tipo === "mano"
              ? (a.lado === "L" ? tt("mano izq.", "left hand") : tt("mano der.", "right hand"))
              : (a.lado === "L" ? tt("pie izq.", "left foot") : tt("pie der.", "right foot"));
            return `✋ ${que} → ${a.pieza}`;
          })
          .join(" · ");
  }

  /** Cambia de modo (posar / simular). */
  setModo(m: "posar" | "simular"): void {
    this.modo = m;
    this.refrescarApoyos();
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

  /**
   * Pone al día la caja de la barra: qué ejercicio lleva, cuántos discos, el
   * peso total y si está rackeada.
   *
   * El peso se lee del EDITOR y no se calcula aquí: la barra pesa lo que pesa
   * la pieza con su carga, y recalcularlo en la interfaz sería tener dos
   * versiones del mismo número esperando a desacordarse.
   */
  private refrescarBarra(): void {
    const b = this.editor.getBarraManiqui();
    this.selectBarra.value = b?.ejercicio ?? "";
    const hay = !!b;
    this.discosBarra.disabled = !hay;
    this.botonRack.disabled = !hay;
    if (hay) {
      this.discosBarra.value = String(this.editor.discosBarra());
      this.botonRack.textContent = b.rackeada
        ? tt("⤒ Desrackear", "⤒ Unrack")
        : tt("⤓ Rackear", "⤓ Rack");
      const kg = Math.round(this.editor.pesoBarraKg() * 10) / 10;
      this.etiquetaBarra.textContent = b.rackeada
        ? tt(`${kg} kg, apoyada en el soporte.`, `${kg} kg, resting on the support.`)
        : tt(`${kg} kg en las manos.`, `${kg} kg in hand.`);
    } else {
      this.etiquetaBarra.textContent = "";
    }
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
      ? tt("⏹ Fijar partida", "⏹ Pin start")
      : tt("▶ Manipular", "▶ Handle");
    this.botonPosarMaquina.title = simulando
      ? tt(
          "No disponible mientras el gesto corre: ahí manda la física. Detén la simulación para posar la máquina.",
          "Not available while the gesture runs: physics is in charge there. Stop the simulation to pose the machine.",
        )
      : posando
        ? tt(
            "⏹ Fija este cuadro como punto de partida y lo guarda numerado.",
            "⏹ Pin this frame as a start point and save it numbered.",
          )
        : tt(
            "▶ Manipular la máquina: arrástrala y se queda donde la dejes.",
            "▶ Handle the machine: drag it and it stays where you leave it.",
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
