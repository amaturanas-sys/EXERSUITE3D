import type { Editor } from "../core/Editor";
import type { SceneObject } from "../objects/SceneObject";
import type { PrimitiveParams } from "../objects/types";
import { MATERIAL_PRESETS } from "../objects/materials";
import { degToRad, radToDeg, roundTo } from "../core/units";
import { clear, el } from "./dom";

type DimField = { key: keyof PrimitiveParams; label: string };

/** Campos dimensionales editables segun el tipo de primitiva. */
function dimFields(p: PrimitiveParams): DimField[] {
  switch (p.kind) {
    case "box":
      return [
        { key: "width", label: "Ancho X" },
        { key: "height", label: "Alto Y" },
        { key: "depth", label: "Fondo Z" },
      ];
    case "plane":
      return [
        { key: "width", label: "Ancho X" },
        { key: "depth", label: "Fondo Z" },
      ];
    case "cylinder":
      return [
        { key: "radiusTop", label: "Radio sup." },
        { key: "radiusBottom", label: "Radio inf." },
        { key: "height", label: "Altura" },
      ];
    case "cone":
      return [
        { key: "radiusBottom", label: "Radio base" },
        { key: "height", label: "Altura" },
      ];
    case "sphere":
      return [{ key: "radius", label: "Radio" }];
    case "torus":
      return [
        { key: "radius", label: "Radio" },
        { key: "tubeRadius", label: "Grosor tubo" },
      ];
    default:
      return [];
  }
}

/** Panel derecho: inspector de propiedades del objeto seleccionado. */
export class PropertiesPanel {
  readonly root: HTMLElement;
  private body: HTMLElement;
  private current: SceneObject | null = null;

  constructor(private editor: Editor) {
    this.body = el("div", { class: "panel-body" });
    this.root = el("aside", { class: "panel", id: "inspector" }, [
      el("div", { class: "panel-title" }, ["Propiedades"]),
      this.body,
    ]);

    this.editor.bus.on("selectionChanged", ({ selected }) => this.show(selected));
    this.editor.bus.on("groupSelectionChanged", ({ id, name }) => {
      if (id) this.showGroup(id, name);
    });
    this.editor.bus.on("objectTransformed", ({ object }) => {
      if (object === this.current) this.refreshTransform();
    });
    this.show(null);
  }

  private showGroup(id: string, name: string): void {
    this.current = null;
    clear(this.body);
    const input = el("input", { type: "text", value: name });
    input.addEventListener("change", () => this.editor.renameGroup(id, input.value));
    const dup = el("button", { class: "tool" }, ["Duplicar"]);
    dup.addEventListener("click", () => this.editor.duplicateSelectedGroup());
    const ungroup = el("button", { class: "tool" }, ["Desagrupar"]);
    ungroup.addEventListener("click", () => this.editor.ungroupSelected());
    const del = el("button", { class: "tool danger" }, ["Eliminar grupo"]);
    del.addEventListener("click", () => this.editor.deleteSelectedGroup());
    this.body.append(
      el("div", { class: "field" }, [el("label", {}, ["Nombre del grupo"]), input]),
      el("div", { class: "pose-actions" }, [dup, ungroup]),
      el("div", { class: "pose-actions" }, [del]),
      el("div", { class: "empty-hint" }, [
        "Mueve/rota el grupo con el gizmo. Las piezas se transforman juntas.",
      ]),
    );
  }

  private show(obj: SceneObject | null): void {
    this.current = obj;
    clear(this.body);
    if (!obj) {
      this.body.append(
        el("div", { class: "empty-hint" }, [
          "Selecciona un objeto para editar sus propiedades, o anade un componente desde la paleta.",
        ]),
      );
      return;
    }
    const parametric = !obj.imported && !obj.customModel;
    this.body.append(this.nameField(obj));
    this.body.append(this.materialField(obj));
    if (obj.customModel) this.body.append(this.customModelHint());
    if (parametric) {
      this.body.append(this.dimSection(obj));
    }
    this.body.append(this.transformSection(obj));
    if (parametric) {
      this.body.append(this.deformSection(obj));
    }
    this.body.append(this.flipSection());
    if (obj.stack) this.body.append(this.stackSection(obj));
    this.body.append(this.physicsSection(obj));
  }

  private customModelHint(): HTMLElement {
    return el("div", { class: "empty-hint", style: "padding:4px;" }, [
      "Modelo 3D personalizado (biblioteca). Escala/posición editables; las " +
        "dimensiones paramétricas no aplican.",
    ]);
  }

  private deformSection(obj: SceneObject): HTMLElement {
    const field = (
      label: string,
      key: "bendDeg" | "twistDeg" | "bevel",
      step: string,
    ) => {
      const input = el("input", {
        type: "number",
        value: String(obj.params[key] ?? 0),
        step,
      });
      input.addEventListener("change", () => {
        const v = parseFloat(input.value);
        if (!Number.isFinite(v)) return;
        (obj.params[key] as number) = v;
        obj.rebuildGeometry();
        this.editor.bus.emit("objectTransformed", { object: obj });
      });
      return el("div", { class: "sub" }, [el("label", {}, [label]), input]);
    };
    const cols = [field("Doblar °", "bendDeg", "5"), field("Torcer °", "twistDeg", "5")];
    if (obj.params.kind === "box") cols.push(field("Bisel cm", "bevel", "0.5"));
    return el("div", { class: "field" }, [
      el("label", {}, ["Modelado avanzado"]),
      el("div", { class: "row" }, cols),
    ]);
  }

  private flipSection(): HTMLElement {
    const btn = (axis: "x" | "y" | "z") => {
      const b = el("button", { class: "tool", title: `Voltear en ${axis.toUpperCase()}` }, [
        `Voltear ${axis.toUpperCase()}`,
      ]);
      b.addEventListener("click", () => this.editor.flipSelected(axis));
      return b;
    };
    return el("div", { class: "field" }, [
      el("label", {}, ["Voltear (espejo)"]),
      el("div", { class: "row" }, [btn("x"), btn("y"), btn("z")]),
    ]);
  }

  private stackSection(obj: SceneObject): HTMLElement {
    const st = obj.stack!;
    const effective = el("div", { class: "empty-hint", style: "padding:4px;" }, []);
    const updateEff = () => {
      effective.textContent = `Peso seleccionado: ${roundTo(obj.effectiveMassKg(), 1)} kg`;
    };

    const numField = (label: string, value: number, step: string, onChange: (v: number) => void) => {
      const input = el("input", { type: "number", value: String(value), step, min: "0" });
      input.addEventListener("change", () => {
        const v = parseFloat(input.value);
        if (Number.isFinite(v) && v >= 0) {
          onChange(v);
          obj.rebuildStackVisual();
          updateEff();
          this.editor.bus.emit("objectTransformed", { object: obj });
        }
      });
      return el("div", { class: "sub" }, [el("label", {}, [label]), input]);
    };

    updateEff();
    return el("div", {}, [
      el("div", { class: "field" }, [
        el("label", {}, ["Pila selectorizada"]),
        el("div", { class: "row" }, [
          numField("Placas", st.plateCount, "1", (v) => (st.plateCount = Math.round(v))),
          numField("kg/placa", st.plateMassKg, "0.5", (v) => (st.plateMassKg = v)),
          numField("Seleccion", st.selected, "1", (v) => (st.selected = Math.round(v))),
        ]),
      ]),
      el("div", { class: "field" }, [effective]),
    ]);
  }

  // ------------------------------------------------------------- secciones
  private nameField(obj: SceneObject): HTMLElement {
    const input = el("input", { type: "text", value: obj.name });
    input.addEventListener("change", () => {
      obj.name = input.value;
      obj.mesh.name = input.value;
      this.editor.bus.emit("objectsChanged", { objects: this.editor.listObjects() });
    });
    return el("div", { class: "field" }, [el("label", {}, ["Nombre"]), input]);
  }

  private materialField(obj: SceneObject): HTMLElement {
    const select = el("select", { class: "select" });
    for (const preset of MATERIAL_PRESETS) {
      const opt = el("option", { value: preset.id }, [preset.label]);
      if (preset.id === obj.materialId) opt.selected = true;
      select.append(opt);
    }
    select.addEventListener("change", () => {
      obj.setMaterial(select.value);
      this.editor.bus.emit("objectTransformed", { object: obj });
    });
    return el("div", { class: "field" }, [el("label", {}, ["Material"]), select]);
  }

  private dimSection(obj: SceneObject): HTMLElement {
    const fields = dimFields(obj.params);
    const rows = fields.map((f) => {
      const value = (obj.params[f.key] as number | undefined) ?? 0;
      const input = el("input", {
        type: "number",
        value: String(roundTo(value, 2)),
        step: "0.5",
        min: "0.1",
      });
      input.addEventListener("change", () => {
        const v = parseFloat(input.value);
        if (!Number.isFinite(v) || v <= 0) return;
        (obj.params[f.key] as number) = v;
        // Al fijar medidas exactas, neutralizamos la escala del gizmo.
        obj.mesh.scale.set(1, 1, 1);
        obj.rebuildGeometry();
        this.editor.bus.emit("objectTransformed", { object: obj });
      });
      return el("div", { class: "sub" }, [el("label", {}, [`${f.label} (cm)`]), input]);
    });
    return el("div", { class: "field" }, [
      el("label", {}, ["Dimensiones"]),
      el("div", { class: "row" }, rows),
    ]);
  }

  private transformSection(obj: SceneObject): HTMLElement {
    const axes: ("x" | "y" | "z")[] = ["x", "y", "z"];

    const posRow = el(
      "div",
      { class: "row" },
      axes.map((ax) => {
        const input = el("input", {
          type: "number",
          value: String(roundTo(obj.mesh.position[ax], 1)),
          step: "1",
        });
        input.dataset.pos = ax;
        input.addEventListener("change", () => {
          const v = parseFloat(input.value);
          if (Number.isFinite(v)) obj.mesh.position[ax] = v;
        });
        return el("div", { class: "sub" }, [el("label", {}, [ax.toUpperCase()]), input]);
      }),
    );

    const rotRow = el(
      "div",
      { class: "row" },
      axes.map((ax) => {
        const input = el("input", {
          type: "number",
          value: String(roundTo(radToDeg(obj.mesh.rotation[ax]), 1)),
          step: "5",
        });
        input.dataset.rot = ax;
        input.addEventListener("change", () => {
          const v = parseFloat(input.value);
          if (Number.isFinite(v)) obj.mesh.rotation[ax] = degToRad(v);
        });
        return el("div", { class: "sub" }, [el("label", {}, [ax.toUpperCase()]), input]);
      }),
    );

    return el("div", {}, [
      el("div", { class: "field" }, [el("label", {}, ["Posicion (cm)"]), posRow]),
      el("div", { class: "field" }, [el("label", {}, ["Rotacion (grados)"]), rotRow]),
    ]);
  }

  private physicsSection(obj: SceneObject): HTMLElement {
    const mass = el("input", {
      type: "number",
      value: String(obj.physics.massKg),
      step: "0.5",
      min: "0",
    });
    mass.addEventListener("change", () => {
      const v = parseFloat(mass.value);
      if (Number.isFinite(v) && v >= 0) obj.physics.massKg = v;
    });

    const fixed = el("input", { type: "checkbox" });
    fixed.checked = obj.physics.fixed;
    fixed.addEventListener("change", () => {
      obj.physics.fixed = fixed.checked;
    });
    const fixedLabel = el("label", { style: "display:flex;gap:6px;align-items:center;" }, [
      fixed,
      "Anclado (fijo)",
    ]);

    const children = [];
    // La masa de una pila es derivada (placas seleccionadas); no se edita aqui.
    if (!obj.stack) {
      children.push(el("div", { class: "field" }, [el("label", {}, ["Masa (kg)"]), mass]));
    }
    children.push(el("div", { class: "field" }, [fixedLabel]));
    return el("div", {}, children);
  }

  /** Refresca solo los valores de posicion/rotacion (tras arrastrar el gizmo). */
  private refreshTransform(): void {
    const obj = this.current;
    if (!obj) return;
    this.body.querySelectorAll<HTMLInputElement>("input[data-pos]").forEach((input) => {
      const ax = input.dataset.pos as "x" | "y" | "z";
      if (document.activeElement !== input)
        input.value = String(roundTo(obj.mesh.position[ax], 1));
    });
    this.body.querySelectorAll<HTMLInputElement>("input[data-rot]").forEach((input) => {
      const ax = input.dataset.rot as "x" | "y" | "z";
      if (document.activeElement !== input)
        input.value = String(roundTo(radToDeg(obj.mesh.rotation[ax]), 1));
    });
  }
}
