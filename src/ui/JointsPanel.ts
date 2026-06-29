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
  private selectedId: string | null = null;

  constructor(private editor: Editor) {
    this.hingeBtn = el("button", { class: "tool", title: "Conectar dos piezas con una bisagra" }, [
      "+ Bisagra",
    ]);
    this.hingeBtn.addEventListener("click", () => this.editor.beginConnect("revolute"));

    this.slideBtn = el("button", { class: "tool", title: "Conectar dos piezas con una corredera" }, [
      "+ Corredera",
    ]);
    this.slideBtn.addEventListener("click", () => this.editor.beginConnect("prismatic"));

    this.status = el("div", { class: "empty-hint" }, [
      "Conecta dos piezas para articularlas.",
    ]);
    this.body = el("div", { class: "panel-body" });

    this.root = el("aside", { class: "panel", id: "joints" }, [
      el("div", { class: "panel-title" }, ["Conexiones"]),
      el("div", { class: "joints-actions" }, [this.hingeBtn, this.slideBtn]),
      this.status,
      this.body,
    ]);

    this.editor.bus.on("jointsChanged", () => this.render());
    this.editor.bus.on("connectModeChanged", ({ kind, pending }) =>
      this.onConnectMode(kind, pending),
    );
    this.editor.bus.on("simulationChanged", ({ running }) => {
      this.hingeBtn.disabled = running;
      this.slideBtn.disabled = running;
    });
    this.render();
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
