import type { ConfigBisagra, Editor } from "../core/Editor";
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
    const terminar = (v: ConfigBisagra | null): void => {
      window.removeEventListener("keydown", alTeclado);
      panel.remove();
      resolve(v);
    };
    const alTeclado = (ev: KeyboardEvent): void => {
      if (ev.key === "Escape") terminar(null);
    };
    window.addEventListener("keydown", alTeclado);

    const bEje = new Map<ConfigBisagra["eje"], HTMLElement>();
    const bTam = new Map<number, HTMLElement>();
    const pintar = (): void => {
      for (const [k, b] of bEje) b.classList.toggle("active", k === eje);
      for (const [k, b] of bTam) b.classList.toggle("active", k === tamano);
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
      terminar({
        eje,
        tamano,
        limite:
          limOn.checked && Number.isFinite(min) && Number.isFinite(max) ? [min, max] : undefined,
      });
    });

    const cerrar = el("button", { class: "tool rold-cerrar", title: "Cancelar" }, ["✕"]);
    cerrar.addEventListener("click", () => terminar(null));

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
      el("div", { class: "joints-actions" }, [this.hingeBtn, this.slideBtn, this.cableBtn]),
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
        const t = kind === "beam" ? "pilar/travesaño" : "tubo";
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

    return el("div", { class: "joint-editor" }, [
      el("div", { class: "field" }, [lockBtn]),
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
