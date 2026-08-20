import type { ConfigBisagra, Editor } from "../core/Editor";
import { abrirDialogoDerecha, cerrarDialogoDerecha } from "./dialogoDerecha";
import type { Joint } from "../physics/joints";
import { roundTo } from "../core/units";
import { tt } from "../core/i18n";
import { clear, el } from "./dom";

/**
 * Configuración de la BISAGRA REAL (v0.2.32) tras elegir las dos piezas: eje
 * de giro (automático o un eje global), largo de las placas y recorrido.
 *
 * Panel PEQUEÑO al costado derecho y sin velo, como el de la roldana: el
 * modelo se sigue viendo y se puede orbitar mientras se decide dónde y cómo
 * queda montado el herraje.
 */
function elegirConfigBisagra(): Promise<ConfigBisagra | null> {
  return new Promise((resolve) => {
    let eje: ConfigBisagra["eje"] = "auto";
    let tamano = 8;
    let cara: NonNullable<ConfigBisagra["cara"]> = "auto";
    let resuelto = false;
    const terminar = (v: ConfigBisagra | null): void => {
      if (resuelto) return;
      resuelto = true;
      window.removeEventListener("keydown", alTeclado);
      panel.remove();
      resolve(v);
    };
    // El carril derecho tiene UN dueño: quien abra cierra al anterior, y
    // cualquiera —cambiar de herramienta, volver a la Home— puede cerrar el que
    // haya sin saber cuál es. Antes solo este panel podía cerrarse a sí mismo y
    // se quedaba colgado con los botones muertos, escondiendo el maniquí.
    const cerrarYResolver = (v: ConfigBisagra | null): void => {
      // PRIMERO se resuelve con lo elegido y DESPUÉS se descuelga del carril:
      // el cierre registrado allí resuelve con `null`, y `terminar` sólo hace
      // caso a la primera llamada —así una dirección elegida no se pierde—.
      terminar(v);
      cerrarDialogoDerecha();
    };
    const alTeclado = (ev: KeyboardEvent): void => {
      if (ev.key === "Escape") cerrarYResolver(null);
    };
    window.addEventListener("keydown", alTeclado);

    const bEje = new Map<ConfigBisagra["eje"], HTMLElement>();
    const bTam = new Map<number, HTMLElement>();
    const bCara = new Map<string, HTMLElement>();
    const pintar = (): void => {
      for (const [k, b] of bEje) b.classList.toggle("active", k === eje);
      for (const [k, b] of bTam) b.classList.toggle("active", k === tamano);
      for (const [k, b] of bCara) b.classList.toggle("active", k === cara);
    };
    const opcCara = (
      k: NonNullable<ConfigBisagra["cara"]>,
      titulo: string,
      ayuda: string,
    ): HTMLElement => {
      const b = el("button", { class: "rold-opt", title: ayuda }, [titulo]);
      b.addEventListener("click", () => {
        cara = k;
        pintar();
      });
      bCara.set(k, b);
      return b;
    };
    const opcEje = (k: ConfigBisagra["eje"], titulo: string, ayuda: string) => {
      const b = el("button", { class: "rold-opt", title: ayuda }, [titulo]);
      b.addEventListener("click", () => {
        eje = k;
        pintar();
      });
      bEje.set(k, b);
      return b;
    };
    const opcTam = (cm: number, titulo: string) => {
      const b = el("button", { class: "rold-opt", title: `${cm} cm` }, [titulo]);
      b.addEventListener("click", () => {
        tamano = cm;
        pintar();
      });
      bTam.set(cm, b);
      return b;
    };

    const limOn = el("input", { type: "checkbox" }) as HTMLInputElement;
    const minIn = el("input", { type: "number", value: "0", step: "5" }) as HTMLInputElement;
    const maxIn = el("input", { type: "number", value: "90", step: "5" }) as HTMLInputElement;

    const instalar = el("button", { class: "tool sim" }, [tt("Instalar bisagra", "Install hinge")]);
    instalar.addEventListener("click", () => {
      const min = parseFloat(minIn.value);
      const max = parseFloat(maxIn.value);
      cerrarYResolver({
        eje,
        tamano,
        cara,
        limite:
          limOn.checked && Number.isFinite(min) && Number.isFinite(max) ? [min, max] : undefined,
      });
    });

    const cerrar = el("button", { class: "tool rold-cerrar", title: "Cancelar" }, ["✕"]);
    cerrar.addEventListener("click", () => cerrarYResolver(null));

    const panel = el("aside", { id: "bisagra-panel" }, [
      el("div", { class: "rold-head" }, [
        el("span", { class: "rold-titulo" }, [tt("Bisagra", "Hinge")]),
        cerrar,
      ]),
      el("div", { class: "rold-seccion" }, [tt("Eje de giro (global)", "Hinge axis (global)")]),
      el("div", { class: "rold-ejes" }, [
        opcEje(
          "auto",
          tt("Auto", "Auto"),
          tt(
            "El eje más perpendicular a la línea entre las dos piezas.",
            "The axis most perpendicular to the line between both parts.",
          ),
        ),
        opcEje("x", "X", "±X"),
        opcEje("y", "Y", "±Y"),
        opcEje("z", "Z", "±Z"),
      ]),
      el("div", { class: "rold-seccion" }, [
        tt("Cara de montaje (global)", "Mounting face (global)"),
      ]),
      el("div", { class: "rold-ejes" }, [
        opcCara(
          "auto",
          tt("Auto", "Auto"),
          tt("La cara superior/visible.", "The top/visible face."),
        ),
        opcCara("arriba", "⬆", tt("Arriba (+Y)", "Up (+Y)")),
        opcCara("abajo", "⬇", tt("Abajo (−Y)", "Down (−Y)")),
        opcCara("derecha", "➡", tt("Derecha (+X)", "Right (+X)")),
        opcCara("izquierda", "⬅", tt("Izquierda (−X)", "Left (−X)")),
        opcCara("anterior", "⧉", tt("Anterior (+Z)", "Front (+Z)")),
        opcCara("posterior", "⧈", tt("Posterior (−Z)", "Back (−Z)")),
      ]),
      el("div", { class: "rold-pie" }, [
        tt(
          "La cara decide hacia dónde pliega: por el otro lado las piezas topan entre sí.",
          "The face decides which way it folds: on the other side the parts butt against each other.",
        ),
      ]),
      el("div", { class: "rold-seccion" }, [tt("Placas", "Leaves")]),
      el("div", { class: "rold-ejes" }, [
        opcTam(5, tt("Chica", "Small")),
        opcTam(8, tt("Media", "Medium")),
        opcTam(12, tt("Grande", "Large")),
      ]),
      el("div", { class: "rold-seccion" }, [tt("Recorrido", "Travel")]),
      el("label", { class: "rold-check" }, [limOn, tt("Limitar (grados)", "Limit (degrees)")]),
      el("div", { class: "rold-nums" }, [minIn, maxIn]),
      el("div", { class: "field" }, [instalar]),
      el("div", { class: "rold-pie" }, [
        tt(
          "Se montan dos placas planas y el pasador que las articula; cada placa queda soldada a su pieza.",
          "Two flat leaves and the pin that articulates them are mounted; each leaf is welded to its part.",
        ),
      ]),
    ]);
    pintar();
    document.body.append(panel);
    // El carril derecho aloja UNA ventana a la vez: mientras este diálogo
    // esté abierto, la del maniquí se repliega (v0.2.48). Lo registra el módulo
    // del carril, que es quien pone y quita la clase del <body>.
    abrirDialogoDerecha(() => terminar(null));
  });
}

/** Panel de articulaciones: crea y edita bisagras (revolute) y correderas (prismatic). */
export class JointsPanel {
  readonly root: HTMLElement;
  private body: HTMLElement;
  private status: HTMLElement;
  private hingeBtn: HTMLButtonElement;
  private slideBtn: HTMLButtonElement;
  private cableBtn: HTMLButtonElement;
  private frenoBtn: HTMLButtonElement;
  private finishBtn: HTMLButtonElement;
  private selectedId: string | null = null;
  private ropeBox!: HTMLElement;
  private ropeLabel!: HTMLElement;
  private ropeSlider!: HTMLInputElement;
  private ropeId: string | null = null;

  constructor(private editor: Editor) {
    // La herramienta de bisagra pide eje, tamaño y recorrido antes de montar
    // el herraje real (dos placas + pasador).
    this.editor.elegirBisagra = elegirConfigBisagra;
    this.hingeBtn = el(
      "button",
      {
        class: "tool",
        title: "Instalar una bisagra REAL (dos placas y su pasador) entre dos piezas",
      },
      ["+ Bisagra"],
    );
    this.hingeBtn.addEventListener("click", () => this.editor.beginConnect("revolute"));

    this.slideBtn = el("button", { class: "tool", title: "Conectar dos piezas con una corredera" }, [
      "+ Corredera",
    ]);
    this.slideBtn.addEventListener("click", () => this.editor.beginConnect("prismatic"));

    this.cableBtn = el("button", { class: "tool", title: "Trazar un cable por poleas" }, [
      "+ Cable",
    ]);
    this.cableBtn.addEventListener("click", () => this.editor.beginCable());

    this.frenoBtn = el(
      "button",
      {
        class: "tool",
        title: "Engarzar un FRENO (esfera de tope) en un punto del cable; volver a pulsarlo sobre el freno lo retira",
      },
      ["⏺ Freno"],
    );
    this.frenoBtn.addEventListener("click", () => {
      if (this.editor.isFrenoMode()) this.editor.cancelFrenoCable();
      else this.editor.beginFrenoCable();
    });

    this.finishBtn = el("button", { class: "tool sim", title: "Finalizar el cable (Enter)" }, [
      "Finalizar cable",
    ]);
    this.finishBtn.style.display = "none";
    this.finishBtn.addEventListener("click", () => this.editor.finishCable());

    this.status = el("div", { class: "empty-hint" }, [
      "Articula piezas (bisagra/corredera) o traza un cable por poleas.",
    ]);
    this.body = el("div", { class: "panel-body" });

    // Editor de la cuerda seleccionada (cadena/correa): tensión y borrar.
    this.ropeSlider = el("input", {
      type: "range",
      min: "0",
      max: "100",
      value: "25",
    }) as HTMLInputElement;
    this.ropeSlider.addEventListener("input", () => {
      if (this.ropeId) this.editor.setRopeSlack(this.ropeId, parseFloat(this.ropeSlider.value) / 100);
    });
    this.ropeLabel = el("label", {}, ["Cuerda"]);
    const ropeDel = el("button", { class: "tool danger" }, ["Eliminar cuerda"]);
    ropeDel.addEventListener("click", () => {
      if (this.ropeId) this.editor.deleteRope(this.ropeId);
    });
    this.ropeBox = el("div", { class: "field" }, [
      this.ropeLabel,
      el("div", { class: "sub" }, [el("label", {}, ["Tensión ← → Holgura (catenaria)"]), this.ropeSlider]),
      ropeDel,
    ]);
    this.ropeBox.style.display = "none";

    this.root = el("aside", { class: "panel", id: "joints" }, [
      el("div", { class: "panel-title" }, ["Conexiones"]),
      el("div", { class: "joints-actions" }, [
        this.hingeBtn,
        this.slideBtn,
        this.cableBtn,
        this.frenoBtn,
      ]),
      this.finishBtn,
      this.status,
      this.ropeBox,
      this.body,
    ]);

    this.editor.bus.on("jointsChanged", () => this.render());
    this.editor.bus.on("cablesChanged", () => this.render());
    this.editor.bus.on("connectModeChanged", ({ kind, pending }) =>
      this.onConnectMode(kind, pending),
    );
    this.editor.bus.on("cableModeChanged", ({ active, count, hint }) =>
      this.onCableMode(active, count, hint),
    );
    this.editor.bus.on("frenoModeChanged", ({ active }) => {
      this.frenoBtn.classList.toggle("active", active);
      this.status.textContent = active
        ? "Freno de cable: clic sobre el trazado de un cable para engarzar la esfera de tope (clic sobre un freno puesto lo retira). ESC para salir."
        : "Articula piezas (bisagra/corredera) o traza un cable por poleas.";
    });
    this.editor.bus.on("ropeModeChanged", ({ active, kind, count }) => {
      if (active) {
        const t = kind === "chain" ? "cadena" : "correa";
        this.status.textContent =
          count < 1
            ? `Colocar ${t}: clic en el punto de INICIO (se ancla a la pieza/superficie).`
            : `Ahora clic en el punto FINAL de la ${t}.`;
      } else {
        this.status.textContent = "Articula piezas (bisagra/corredera) o traza un cable por poleas.";
      }
    });
    this.editor.bus.on("lineModeChanged", ({ active, kind, count }) => {
      if (active) {
        const t = kind === "beam" ? "pilar/travesaño" : kind === "guia" ? "guía tubular" : "tubo";
        this.status.textContent =
          count < 1
            ? `Trazar ${t}: clic en el punto de INICIO (imán a extremos/puntos medios de otras piezas). ESC para salir.`
            : `Ahora clic en el punto FINAL del ${t}. Puedes seguir trazando; ESC para salir.`;
      } else {
        this.status.textContent = "Articula piezas (bisagra/corredera) o traza un cable por poleas.";
      }
    });
    this.editor.bus.on("bendModeChanged", ({ active }) => {
      if (active) {
        this.status.textContent =
          "Doblado: arrastra los nodos de la pieza para darle forma (curva suave). Clic fuera o ESC para terminar.";
      } else {
        this.status.textContent = "Articula piezas (bisagra/corredera) o traza un cable por poleas.";
      }
    });
    this.editor.bus.on("ropeSelectionChanged", (payload) => {
      if (payload) {
        this.ropeId = payload.id;
        this.ropeLabel.textContent = payload.name;
        this.ropeSlider.value = String(Math.round(payload.slack * 100));
        this.ropeBox.style.display = "block";
      } else {
        this.ropeId = null;
        this.ropeBox.style.display = "none";
      }
    });
    this.editor.bus.on("simulationChanged", ({ running }) => {
      this.hingeBtn.disabled = running;
      this.slideBtn.disabled = running;
      this.cableBtn.disabled = running;
    });
    this.render();
  }

  private onCableMode(active: boolean, count: number, hint?: string): void {
    this.cableBtn.classList.toggle("active", active);
    // El botón "Finalizar" solo tiene sentido cuando ya hay una cuerda de reenvío
    // en construcción (>=2 nodos); con dos anclas se cierra sola al 2.º clic.
    this.finishBtn.style.display = active && count >= 2 ? "block" : "none";
    if (active) {
      this.status.textContent =
        hint ?? `Cable: ${count} nodo(s). Clic en cada punto de anclaje.`;
    } else {
      this.status.textContent =
        "Articula piezas (bisagra/corredera) o traza un cable por poleas.";
    }
  }

  private onConnectMode(kind: string | null, pending: boolean): void {
    this.hingeBtn.classList.toggle("active", kind === "revolute");
    this.slideBtn.classList.toggle("active", kind === "prismatic");
    if (!kind) {
      this.status.textContent = "Conecta dos piezas para articularlas.";
    } else {
      const tipo = kind === "revolute" ? "bisagra" : "corredera";
      this.status.textContent = pending
        ? `Ahora clic en la 2ª pieza (móvil) para la ${tipo}.`
        : kind === "revolute"
          ? tt(
              "Clic en la 1ª pieza: se montará una bisagra real (dos placas + pasador).",
              "Click the 1st part: a real hinge (two leaves + pin) will be mounted.",
            )
          : `Clic en la 1ª pieza (anclaje) para la ${tipo}.`;
    }
  }

  private render(): void {
    clear(this.body);
    this.renderJoints();
    this.renderCables();
  }

  private renderCables(): void {
    const cables = this.editor.listCables();
    if (cables.length === 0) return;
    this.body.append(el("div", { class: "cat-label" }, ["Cables"]));
    for (const c of cables) {
      const a = this.editor.getById(c.endAId)?.name ?? "?";
      const b = this.editor.getById(c.endBId)?.name ?? "?";
      const poleas = c.pulleyIds.length;
      const row = el("div", { class: "joint-row" }, [
        `↬ ${c.name}`,
        el("span", { class: "joint-sub" }, [`${a} → ${b} · ${poleas} polea(s)`]),
      ]);
      const del = el("button", { class: "tool danger", title: "Eliminar cable" }, ["Eliminar"]);
      del.style.marginTop = "6px";
      del.addEventListener("click", (e) => {
        e.stopPropagation();
        this.editor.removeCable(c);
      });
      row.append(del);
      this.body.append(row);
    }
  }

  private renderJoints(): void {
    const joints = this.editor.listJoints();
    if (joints.length === 0) return;

    for (const j of joints) {
      const a = this.editor.getById(j.bodyAId)?.name ?? "?";
      const b = this.editor.getById(j.bodyBId)?.name ?? "?";
      const icon = j.kind === "revolute" ? "⟲" : "↔";
      const row = el("div", { class: "joint-row" }, [
        `${icon} ${j.name}${j.locked ? " 🔒" : ""}`,
        el("span", { class: "joint-sub" }, [`${a} → ${b}`]),
      ]);
      if (j.id === this.selectedId) row.classList.add("selected");
      row.addEventListener("click", () => {
        this.selectedId = this.selectedId === j.id ? null : j.id;
        this.render();
      });
      this.body.append(row);
      if (j.id === this.selectedId) this.body.append(this.editorFor(j));
    }
  }

  private editorFor(j: Joint): HTMLElement {
    const isRev = j.kind === "revolute";
    const angUnit = isRev ? "°" : "cm";
    const velUnit = isRev ? "°/s" : "cm/s";

    // Eje. Si la unión giró con su grupo (eje libre en mundo), se muestra una
    // opción extra informativa; elegir una letra la reemplaza por ese eje.
    const axisSel = el("select", { class: "select" });
    if (j.axisVec) {
      const v = j.axisVec;
      const opt = el("option", { value: "libre" }, [
        `Girado (${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`,
      ]);
      opt.selected = true;
      axisSel.append(opt);
    }
    for (const ax of ["x", "y", "z"] as const) {
      const opt = el("option", { value: ax }, [ax.toUpperCase()]);
      if (!j.axisVec && ax === j.axis) opt.selected = true;
      axisSel.append(opt);
    }
    axisSel.addEventListener("change", () => {
      if (axisSel.value === "libre") return;
      j.axis = axisSel.value as Joint["axis"];
      j.axisVec = null;
      this.editor.jointUpdated();
      this.render();
    });

    // Limites
    const limOn = el("input", { type: "checkbox" });
    limOn.checked = j.limitsEnabled;
    limOn.addEventListener("change", () => {
      j.limitsEnabled = limOn.checked;
      this.editor.jointUpdated();
    });
    const minIn = this.num(j.min, (v) => (j.min = v));
    const maxIn = this.num(j.max, (v) => (j.max = v));

    // Motor
    const motOn = el("input", { type: "checkbox" });
    motOn.checked = j.motor.enabled;
    motOn.addEventListener("change", () => {
      j.motor.enabled = motOn.checked;
      this.editor.jointUpdated();
    });
    const velIn = this.num(j.motor.targetVel, (v) => (j.motor.targetVel = v));

    // Ancla (cm)
    const anchorRow = (["x", "y", "z"] as const).map((ax) => {
      const input = this.num(roundTo(j.anchor[ax], 1), (v) => {
        j.anchor[ax] = v;
      });
      return el("div", { class: "sub" }, [el("label", {}, [ax.toUpperCase()]), input]);
    });

    const del = el("button", { class: "tool danger", title: "Eliminar conexion" }, ["Eliminar"]);
    del.addEventListener("click", () => {
      this.selectedId = null;
      this.editor.removeJoint(j);
    });

    // Lock switch (diagrama Versatilidad): un clic la deja rígida en su pose
    // de diseño — transforma la máquina (empuje horizontal ↔ vertical) sin
    // rehacer las conexiones.
    const lockBtn = el(
      "button",
      {
        class: `tool${j.locked ? " active" : ""}`,
        title:
          "Bloqueada: la articulación queda RÍGIDA en su pose actual (la máquina cambia de configuración con un clic)",
      },
      [j.locked ? "🔒 Lock switch: bloqueada" : "🔓 Lock switch: libre"],
    );
    lockBtn.addEventListener("click", () => {
      j.locked = !j.locked;
      this.editor.jointUpdated();
      this.render();
    });

    // COLISIÓN entre las dos piezas unidas (v0.2.33): activada, el material
    // frena el recorrido (una bisagra sobre la cara solo pliega hacia el lado
    // libre); desactivada, las piezas se atraviesan — que es lo que necesita
    // un pivote clásico, donde el brazo se mete dentro de su anclaje.
    const contOn = el("input", { type: "checkbox" }) as HTMLInputElement;
    contOn.checked = j.contactos;
    contOn.addEventListener("change", () => {
      j.contactos = contOn.checked;
      this.editor.jointUpdated();
    });

    return el("div", { class: "joint-editor" }, [
      el("div", { class: "field" }, [lockBtn]),
      el("div", { class: "field" }, [
        el(
          "label",
          {
            style: "display:flex;gap:6px;align-items:center;",
            title:
              "Las dos piezas siguen chocando entre si: el material frena el recorrido (bisagras montadas sobre una cara). Desactivalo en pivotes donde las piezas se solapan a proposito.",
          },
          [contOn, "Las piezas chocan entre si"],
        ),
      ]),
      el("div", { class: "field" }, [el("label", {}, ["Eje de la articulacion"]), axisSel]),
      el("div", { class: "field" }, [
        el("label", { style: "display:flex;gap:6px;align-items:center;" }, [limOn, "Limitar recorrido"]),
        el("div", { class: "row" }, [
          el("div", { class: "sub" }, [el("label", {}, [`Min (${angUnit})`]), minIn]),
          el("div", { class: "sub" }, [el("label", {}, [`Max (${angUnit})`]), maxIn]),
        ]),
      ]),
      el("div", { class: "field" }, [
        el("label", { style: "display:flex;gap:6px;align-items:center;" }, [motOn, "Motor"]),
        el("div", { class: "sub" }, [el("label", {}, [`Velocidad (${velUnit})`]), velIn]),
      ]),
      el("div", { class: "field" }, [el("label", {}, ["Pivote / origen (cm)"]), el("div", { class: "row" }, anchorRow)]),
      el("div", { class: "field" }, [del]),
    ]);
  }

  private num(value: number, onChange: (v: number) => void): HTMLInputElement {
    const input = el("input", { type: "number", value: String(value), step: "1" });
    input.addEventListener("change", () => {
      const v = parseFloat(input.value);
      if (Number.isFinite(v)) {
        onChange(v);
        this.editor.jointUpdated();
      }
    });
    return input;
  }
}
