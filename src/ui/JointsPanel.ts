import type { Editor } from "../core/Editor";
import type { Joint } from "../physics/joints";
import { roundTo } from "../core/units";
import { clear, el } from "./dom";

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
    this.hingeBtn = el("button", { class: "tool", title: "Conectar dos piezas con una bisagra" }, [
      "+ Bisagra",
    ]);
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
      const row = el("div", { class: "joint-row" }, [`${icon} ${j.name}`, el("span", { class: "joint-sub" }, [`${a} → ${b}`])]);
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

    // Eje
    const axisSel = el("select", { class: "select" });
    for (const ax of ["x", "y", "z"] as const) {
      const opt = el("option", { value: ax }, [ax.toUpperCase()]);
      if (ax === j.axis) opt.selected = true;
      axisSel.append(opt);
    }
    axisSel.addEventListener("change", () => {
      j.axis = axisSel.value as Joint["axis"];
      this.editor.jointUpdated();
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

    return el("div", { class: "joint-editor" }, [
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
