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
    this.editor.bus.on("objectTransformed", ({ object }) => {
      if (object === this.current) this.refreshTransform();
    });
    this.show(null);
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
    this.body.append(this.nameField(obj));
    this.body.append(this.materialField(obj));
    this.body.append(this.dimSection(obj));
    this.body.append(this.transformSection(obj));
    this.body.append(this.physicsSection(obj));
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

    return el("div", {}, [
      el("div", { class: "field" }, [el("label", {}, ["Masa (kg)"]), mass]),
      el("div", { class: "field" }, [fixedLabel]),
    ]);
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
