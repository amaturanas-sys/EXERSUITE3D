import type { Editor } from "../core/Editor";
import type { SceneObject } from "../objects/SceneObject";
import type { PrimitiveParams } from "../objects/types";
import { MATERIAL_PRESETS } from "../objects/materials";
import { degToRad, radToDeg, roundTo } from "../core/units";
import { tt } from "../core/i18n";
import { clear, el } from "./dom";

/** Piezas que CALZAN en los agujeros de un poste (suben/bajan agujero a agujero). */
const PIEZAS_CALCE = new Set(["j-hook", "jota-pr", "jota-rodillo-pr", "brazo-seguridad"]);

/**
 * ¿Estructura tubular o tipo pilar? (candidata a BRAZO MÓVIL articulado):
 * primitiva esbelta — su dimensión mayor domina claramente a las demás.
 */
function esTubularOPilar(obj: SceneObject): boolean {
  const k = obj.params.kind;
  if (k !== "box" && k !== "cylinder" && k !== "beam" && k !== "tube") return false;
  if (PIEZAS_CALCE.has(obj.componentId)) return false;
  const s = obj.localSize();
  const dims = [s.x, s.y, s.z].sort((a, b) => b - a);
  return dims[0] >= 25 && dims[0] >= 2.5 * dims[1];
}

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
  /** Grupo mostrado actualmente (para vaciar el panel si el grupo se disuelve). */
  private groupShownId: string | null = null;

  constructor(private editor: Editor) {
    this.body = el("div", { class: "panel-body" });
    this.root = el("aside", { class: "panel", id: "inspector" }, [
      el("div", { class: "panel-title" }, ["Propiedades"]),
      this.body,
    ]);

    this.editor.bus.on("selectionChanged", ({ selected }) => this.show(selected));
    this.editor.bus.on("groupSelectionChanged", ({ id, name }) => {
      if (id) this.showGroup(id, name);
      else if (this.groupShownId) {
        // El grupo mostrado se desagrupó/eliminó: vaciar el panel.
        this.groupShownId = null;
        this.show(this.current);
      }
    });
    this.editor.bus.on("objectTransformed", ({ object }) => {
      if (object === this.current) this.refreshTransform();
    });
    // Multiselección: el panel ofrece la transformación numérica del bloque.
    this.editor.bus.on("groupingChanged", ({ multi, groupSelected }) => {
      if (multi >= 2 && !groupSelected) this.showMulti(multi);
    });
    this.editor.bus.on("grupoTransformado", () => this.refreshGrupoInputs());
    this.show(null);
  }

  private showMulti(multi: number): void {
    this.current = null;
    this.groupShownId = null;
    clear(this.body);
    this.body.append(
      el("div", { class: "empty-hint" }, [
        tt(
          `${multi} piezas seleccionadas. Se transforman juntas como bloque.`,
          `${multi} pieces selected. They transform together as a block.`,
        ),
      ]),
      this.grupoTransformSection(),
    );
  }

  /**
   * TRANSFORMACIÓN EXACTA del gizmo colectivo (v0.2.13): posición del
   * centro en cm, rotación en grados y escala uniforme del GRUPO o de la
   * multiselección, editables en números — el mismo efecto que arrastrar
   * el gizmo, pero exacto. Rotación y escala parten de 0°/×1 al tomar la
   * selección (son acumuladas de la sesión de selección).
   */
  private grupoTransformSection(): HTMLElement {
    const axes: ("x" | "y" | "z")[] = ["x", "y", "z"];
    const t = this.editor.transformGrupo();
    const posRow = el(
      "div",
      { class: "row" },
      axes.map((ax) => {
        const input = el("input", {
          type: "number",
          value: String(roundTo(t?.pos[ax] ?? 0, 1)),
          step: "1",
        });
        input.dataset.gpos = ax;
        input.addEventListener("change", () => {
          const v = parseFloat(input.value);
          if (Number.isFinite(v)) this.editor.setTransformGrupo({ pos: { [ax]: v } });
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
          value: String(roundTo(t?.rotDeg[ax] ?? 0, 1)),
          step: "5",
        });
        input.dataset.grot = ax;
        input.addEventListener("change", () => {
          const v = parseFloat(input.value);
          if (Number.isFinite(v)) this.editor.setTransformGrupo({ rotDeg: { [ax]: v } });
        });
        return el("div", { class: "sub" }, [el("label", {}, [ax.toUpperCase()]), input]);
      }),
    );
    const esc = el("input", {
      type: "number",
      value: String(roundTo(t?.escala ?? 1, 2)),
      step: "0.1",
      min: "0.05",
    });
    esc.dataset.gesc = "s";
    esc.addEventListener("change", () => {
      const v = parseFloat(esc.value);
      if (Number.isFinite(v) && v > 0.01) this.editor.setTransformGrupo({ escala: v });
    });
    return el("div", {}, [
      el("div", { class: "field" }, [
        el("label", {}, [tt("Posición del centro (cm)", "Center position (cm)")]),
        posRow,
      ]),
      el("div", { class: "field" }, [
        el("label", {}, [tt("Rotación del bloque (grados)", "Block rotation (degrees)")]),
        rotRow,
      ]),
      el("div", { class: "field" }, [
        el("label", {}, [tt("Escala del bloque (×)", "Block scale (×)")]),
        esc,
      ]),
    ]);
  }

  /** Refresca los campos del bloque tras un arrastre del gizmo (sin pisar el campo en foco). */
  private refreshGrupoInputs(): void {
    const t = this.editor.transformGrupo();
    if (!t) return;
    const activo = document.activeElement;
    for (const input of this.body.querySelectorAll<HTMLInputElement>("input[data-gpos]")) {
      if (input === activo) continue;
      input.value = String(roundTo(t.pos[input.dataset.gpos as "x" | "y" | "z"], 1));
    }
    for (const input of this.body.querySelectorAll<HTMLInputElement>("input[data-grot]")) {
      if (input === activo) continue;
      input.value = String(roundTo(t.rotDeg[input.dataset.grot as "x" | "y" | "z"], 1));
    }
    for (const input of this.body.querySelectorAll<HTMLInputElement>("input[data-gesc]")) {
      if (input === activo) continue;
      input.value = String(roundTo(t.escala, 2));
    }
  }

  private showGroup(id: string, name: string): void {
    this.current = null;
    this.groupShownId = id;
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
      this.grupoTransformSection(),
      el("div", { class: "empty-hint" }, [
        "Mueve/rota el grupo con el gizmo o con los números exactos de arriba. Las piezas se transforman juntas.",
      ]),
    );
    const carga = this.cargaDelGrupoSection(id);
    if (carga) this.body.append(carga);
  }

  /**
   * CARGA DEL CONJUNTO (v0.2.55). Cuánto peso sostiene la máquina, editable
   * con el grupo seleccionado — sin desagruparla.
   *
   * Es lo que de verdad se toca entre pasada y pasada: subir el pin de la
   * pila, poner un disco más en el carrier, quitar uno del cuerno. Antes
   * había que DESAGRUPAR la máquina, buscar la pieza suelta entre las
   * cuarenta que la componen, cambiarla y volver a agrupar — y agrupar de
   * nuevo no siempre devolvía el mismo conjunto.
   */
  private cargaDelGrupoSection(groupId: string): HTMLElement | null {
    const piezas = this.editor
      .objetosDelGrupo(groupId)
      .filter((o) => o.stack || o.carga);
    if (piezas.length === 0) return null;

    const total = el("div", { class: "empty-hint", style: "padding:4px;" }, []);
    const filas: HTMLElement[] = [];
    const refrescarTotal = () => {
      const kg = piezas.reduce((s, o) => s + o.effectiveMassKg(), 0);
      total.textContent = tt(
        `Carga del conjunto: ${roundTo(kg, 1)} kg`,
        `Assembly load: ${roundTo(kg, 1)} kg`,
      );
    };

    for (const obj of piezas) {
      const valor = el("span", { class: "sim-angulo" }, [""]);
      const nombre = el("label", {}, [obj.name]);

      const pintar = () => {
        if (obj.stack) {
          const st = obj.stack;
          valor.textContent = `${Math.round(st.selected)}/${Math.round(st.plateCount)} · ${roundTo(obj.effectiveMassKg(), 1)} kg`;
        } else {
          valor.textContent = `${obj.discosMontados()} · ${roundTo(obj.effectiveMassKg(), 1)} kg`;
        }
        refrescarTotal();
      };

      const aplicar = (delta: number) => {
        if (obj.stack) {
          const st = obj.stack;
          st.selected = Math.max(0, Math.min(Math.round(st.selected) + delta, Math.round(st.plateCount)));
          obj.rebuildStackVisual();
        } else {
          obj.params.discCount = Math.max(0, obj.discosMontados() + delta);
          obj.rebuildCargaVisual();
        }
        pintar();
        this.editor.bus.emit("objectTransformed", { object: obj });
      };

      const menos = el("button", { class: "tool", title: obj.stack
        ? tt("Baja el pin una placa", "Move the pin down one plate")
        : tt("Quita un disco", "Remove one plate") }, ["−"]);
      menos.addEventListener("click", () => aplicar(-1));
      const mas = el("button", { class: "tool", title: obj.stack
        ? tt("Sube el pin una placa", "Move the pin up one plate")
        : tt("Añade un disco", "Add one plate") }, ["+"]);
      mas.addEventListener("click", () => aplicar(1));

      pintar();
      filas.push(el("div", { class: "field carga-grupo" }, [
        nombre,
        el("div", { class: "row" }, [menos, valor, mas]),
      ]));
    }

    refrescarTotal();
    return el("div", {}, [
      el("div", { class: "panel-title" }, [tt("CARGA DEL CONJUNTO", "ASSEMBLY LOAD")]),
      ...filas,
      el("div", { class: "field" }, [total]),
    ]);
  }

  private show(obj: SceneObject | null): void {
    this.current = obj;
    this.groupShownId = null;
    clear(this.body);
    if (!obj) {
      this.body.append(
        el("div", { class: "empty-hint" }, [
          "Selecciona un objeto para editar sus propiedades, o anade un componente desde la paleta.",
        ]),
      );
      return;
    }
    const isLine = obj.params.kind === "beam" || obj.params.kind === "tube";
    const parametric = !obj.imported && !obj.customModel && !isLine;
    this.body.append(this.nameField(obj));
    this.body.append(this.materialField(obj));
    if (obj.customModel) this.body.append(this.customModelHint());
    if (parametric) {
      this.body.append(this.dimSection(obj));
    }
    if (isLine) this.body.append(this.lineSection(obj));
    this.body.append(this.transformSection(obj));
    if (parametric) {
      this.body.append(this.deformSection(obj));
    }
    this.body.append(this.flipSection());
    if (obj.stack) this.body.append(this.stackSection(obj));
    if (obj.carga) this.body.append(this.cargaSection(obj));
    if (PIEZAS_CALCE.has(obj.componentId)) this.body.append(this.calceSection(obj));
    if (esTubularOPilar(obj)) this.body.append(this.brazoSection(obj));
    this.body.append(this.physicsSection(obj));
  }

  /**
   * Brazo móvil (péndulo): una estructura tubular o tipo pilar se articula
   * como brazo accesorio en un «Anclaje de cadena» calzado al pilar de la
   * máquina — el trazado del pivote va del extremo más cercano del brazo al
   * anclaje. El brazo puede portar roldanas, piolas/cables o cuernos de
   * carga para expandir la máquina.
   */
  private brazoSection(obj: SceneObject): HTMLElement {
    const aviso = el("div", { class: "empty-hint", style: "padding:4px;" }, []);
    const btn = el("button", { class: "tool" }, [
      tt("⛓ Articular como brazo en un anclaje de cadena", "⛓ Articulate as an arm on a chain anchor"),
    ]);
    btn.addEventListener("click", () => {
      const err = this.editor.articularBrazo(obj.id);
      if (err) {
        aviso.textContent = err;
        return;
      }
      aviso.textContent = tt(
        "✓ Brazo articulado (péndulo): gira en el pin del anclaje. Añádele roldanas (soldador), cables o cuernos de carga.",
        "✓ Arm articulated (pendulum): it swings on the anchor pin. Add pulleys (welder), cables or loading horns to it.",
      );
      this.show(obj); // refresca (la pieza pasó a ser móvil)
    });
    return el("div", { class: "field" }, [
      el("label", {}, [tt("Brazo móvil (péndulo)", "Mobile arm (pendulum)")]),
      el("div", { class: "row" }, [btn]),
      aviso,
    ]);
  }

  /**
   * Calce en el poste (jotas y brazos de seguridad): la pieza sube o baja
   * por su montante AGUJERO POR AGUJERO, como en el rack real.
   */
  private calceSection(obj: SceneObject): HTMLElement {
    const aviso = el("div", { class: "empty-hint", style: "padding:4px;" }, []);
    // Estado del calce: en qué AGUJERO (1..X, desde abajo) está la pieza y
    // cuántos pinholes tiene el poste en total.
    const estado = el("div", { class: "empty-hint", style: "padding:4px;" }, []);
    const refrescar = () => {
      const e = this.editor.estadoCalce(obj.id);
      if (!e) {
        estado.textContent = tt("Sin poste con agujeros cerca.", "No drilled post nearby.");
      } else if (e.calzada) {
        estado.textContent = tt(
          `Calzada en el agujero ${e.agujero} de ${e.total}.`,
          `Seated in hole ${e.agujero} of ${e.total}.`,
        );
      } else {
        estado.textContent = tt(
          `Sin calzar (poste de ${e.total} agujeros; el más cercano es el ${e.agujero}).`,
          `Not seated (post has ${e.total} holes; nearest is hole ${e.agujero}).`,
        );
      }
    };
    refrescar();
    const paso = (dir: 1 | -1) => {
      const err = this.editor.calcePorAgujero(obj.id, dir);
      aviso.textContent = err ?? "";
      refrescar();
    };
    const subir = el("button", { class: "tool" }, ["▲ ", tt("Subir un agujero", "Up one hole")]);
    subir.addEventListener("click", () => paso(1));
    const bajar = el("button", { class: "tool" }, ["▼ ", tt("Bajar un agujero", "Down one hole")]);
    bajar.addEventListener("click", () => paso(-1));
    return el("div", { class: "field" }, [
      el("label", {}, [tt("Calce en el poste (agujero a agujero)", "Post catch (hole by hole)")]),
      estado,
      el("div", { class: "row" }, [subir, bajar]),
      aviso,
    ]);
  }

  /**
   * Discos montados: cuántos discos se ensamblan introduciendo el cilindro
   * de la pieza por el orificio central — quedan suspendidos y suman masa.
   */
  private cargaSection(obj: SceneObject): HTMLElement {
    const carga = obj.carga!;
    const total = el("div", { class: "empty-hint", style: "padding:4px;" }, []);
    const cuenta = el("input", {
      type: "number",
      value: String(obj.discosMontados()),
      step: "1",
      min: "0",
    });
    const aplicar = (n: number) => {
      obj.params.discCount = Math.max(0, Math.round(n));
      obj.rebuildCargaVisual();
      cuenta.value = String(obj.discosMontados());
      const kg = roundTo(obj.effectiveMassKg(), 1);
      total.textContent = tt(
        `Masa total con discos: ${kg} kg (${carga.masaKg} kg por disco)`,
        `Total mass with plates: ${kg} kg (${carga.masaKg} kg per plate)`,
      );
      this.editor.bus.emit("objectTransformed", { object: obj });
    };
    cuenta.addEventListener("change", () => {
      const v = parseFloat(cuenta.value);
      if (Number.isFinite(v)) aplicar(v);
    });
    const menos = el("button", { class: "tool" }, ["− 1"]);
    menos.addEventListener("click", () => aplicar(obj.discosMontados() - 1));
    const mas = el("button", { class: "tool" }, ["+ 1"]);
    mas.addEventListener("click", () => aplicar(obj.discosMontados() + 1));
    aplicar(obj.discosMontados());
    return el("div", { class: "field" }, [
      el("label", {}, [tt("Discos montados (por el orificio central)", "Mounted plates (through the center hole)")]),
      el("div", { class: "row" }, [menos, cuenta, mas]),
      total,
    ]);
  }

  /** Sección de piezas de línea (pilar/travesaño/tubo): medidas y doblado. */
  private lineSection(obj: SceneObject): HTMLElement {
    const isTube = obj.params.kind === "tube";
    const num = (
      label: string,
      key: "radius" | "width" | "depth" | "holeDiameter" | "holeSpacing",
      step: string,
    ) => {
      const input = el("input", {
        type: "number",
        value: String(roundTo((obj.params[key] as number | undefined) ?? 0, 2)),
        step,
        min: "0",
      });
      input.addEventListener("change", () => {
        const v = parseFloat(input.value);
        if (!Number.isFinite(v) || v < 0) return;
        (obj.params[key] as number) = v;
        obj.rebuildGeometry();
        this.editor.bus.emit("objectTransformed", { object: obj });
      });
      return el("div", { class: "sub" }, [el("label", {}, [label]), input]);
    };

    const rows: HTMLElement[] = [];
    if (isTube) {
      rows.push(el("div", { class: "row" }, [num("Radio (cm)", "radius", "0.1")]));
    } else {
      rows.push(
        el("div", { class: "row" }, [num("Ancho (cm)", "width", "0.5"), num("Fondo (cm)", "depth", "0.5")]),
        el("div", { class: "row" }, [
          num("⌀ agujero (cm)", "holeDiameter", "0.1"),
          num("Dist. agujeros (cm)", "holeSpacing", "0.5"),
        ]),
      );
    }

    const bendBtn = el("button", { class: "tool", title: "Editar la trayectoria arrastrando sus nodos" }, [
      "✎ Doblar (nodos)",
    ]);
    bendBtn.addEventListener("click", () => this.editor.beginBendNodes());
    const addNodeBtn = el("button", { class: "tool", title: "Subdivide el tramo más largo en su punto medio" }, [
      "+ Nodo",
    ]);
    addNodeBtn.addEventListener("click", () => this.editor.agregarNodoBend());

    return el("div", { class: "field" }, [
      el("label", {}, [isTube ? "Tubo de acero" : "Perfil de acero"]),
      ...rows,
      el("div", { class: "row" }, [bendBtn, addNodeBtn]),
      el("div", { class: "empty-hint", style: "padding:4px;" }, [
        "Doblar: arrastra los nodos (curva suave); al acercar un nodo al de OTRA pieza se suelda (imán). + Nodo añade un punto a la trayectoria.",
      ]),
    ]);
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

    // Pin del selector: mueve la selección placa a placa, como al cambiar el
    // pin de sitio en la máquina real — el cable solo toma las seleccionadas.
    const moverPin = (delta: number) => {
      st.selected = Math.max(0, Math.min(Math.round(st.selected) + delta, Math.round(st.plateCount)));
      obj.rebuildStackVisual();
      updateEff();
      this.editor.bus.emit("objectTransformed", { object: obj });
      this.show(obj); // refresca el campo "Seleccion"
    };
    const pinMas = el("button", { class: "tool" }, ["▼ ", tt("Pin +1 placa", "Pin +1 plate")]);
    pinMas.addEventListener("click", () => moverPin(1));
    const pinMenos = el("button", { class: "tool" }, ["▲ ", tt("Pin −1 placa", "Pin −1 plate")]);
    pinMenos.addEventListener("click", () => moverPin(-1));

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
      el("div", { class: "field" }, [
        el("label", {}, [tt("Pin del selector (el cable toma las placas seleccionadas)", "Selector pin (the cable takes the selected plates)")]),
        el("div", { class: "row" }, [pinMenos, pinMas]),
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
