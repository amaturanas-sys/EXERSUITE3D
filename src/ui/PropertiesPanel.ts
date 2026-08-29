import * as THREE from "three";
import type { Editor } from "../core/Editor";
import type { SceneObject } from "../objects/SceneObject";
import type { PrimitiveParams } from "../objects/types";
import { MATERIAL_PRESETS } from "../objects/materials";
import { degToRad, radToDeg, roundTo } from "../core/units";
import { tt } from "../core/i18n";
import {
  DENTADA_BARRA_CM,
  pernosQueLleva,
  dientesQueCaben,
  medidasDentada,
  pasoMinimoDentada,
} from "../objects/placaDentada";
import { getDefinition } from "../objects/componentLibrary";
import { largoDeFabrica } from "../objects/estirar";
import { clear, el } from "./dom";

/** Piezas que CALZAN en los agujeros de un poste (suben/bajan agujero a agujero). */
const PIEZAS_CALCE = new Set([
  "j-hook",
  "jota-pr",
  "jota-rodillo-pr",
  "brazo-seguridad",
  // El safety pin también sube y baja agujero a agujero (v0.3.7): reconoce la
  // misma grilla que las jotas, aunque en vez de colgar del poste lo cruce.
  "safety-pin",
]);

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
    // El interruptor de vinculación puede apagarse desde otra guía o al
    // cancelar herramientas: si el panel muestra una guía, que lo refleje.
    this.editor.bus.on("vinculacionChanged", () => {
      if (this.current?.componentId === "guia-tubular") this.show(this.current);
    });
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
      if (multi >= 2 && !groupSelected) { this.showMulti(multi); return; }
      // Y AL DESHACERSE LA MULTISELECCIÓN, VACIARSE. Faltaba esta rama: al
      // borrar varias piezas con Supr, `removeObject` solo avisa por
      // `selectionChanged` si la borrada era la pieza única seleccionada —y
      // aquí no lo era—, así que el único evento que llegaba era este. El
      // panel se quedaba diciendo «3 piezas seleccionadas» con campos que ya
      // no movían nada.
      if (multi < 2 && !groupSelected && !this.editor.getSelected()) this.show(null);
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
    this.body.append(this.fisicaDelGrupoSection(id));
  }

  /**
   * FÍSICA DEL CONJUNTO (v0.3.10).
   *
   * Al agrupar —o al soldar, que agrupa— tocar cualquier pieza selecciona el
   * GRUPO, y este panel no traía la sección de física: masa y «Fija»
   * desaparecían de la vista. Desde fuera se ve como si la pieza hubiera
   * PERDIDO sus propiedades físicas, y en la práctica es peor que eso, porque
   * son justo las que hay que tocar: el motor solo circunscribe a sus guías
   * los cuerpos MÓVILES, así que un carro que quedó marcado como fijo deja de
   * respetar la guía y no había forma de desmarcarlo sin desagrupar la
   * máquina entera.
   *
   * Aquí se editan de una vez para todo el conjunto, y se avisa del caso que
   * de verdad rompe cosas: piezas ENHEBRADAS en guías dentro de un conjunto
   * fijo.
   */
  private fisicaDelGrupoSection(groupId: string): HTMLElement {
    const piezas = this.editor.objetosDelGrupo(groupId);
    const aviso = el("div", { class: "empty-hint", style: "padding:4px;" }, []);
    const resumen = el("div", { class: "empty-hint", style: "padding:4px;" }, []);
    const masa = el("input", { type: "number", step: "0.5", min: "0" }) as HTMLInputElement;
    const fija = el("input", { type: "checkbox" }) as HTMLInputElement;

    const enhebradas = piezas.filter((o) => (o.params.canales?.length ?? 0) > 0);
    const refrescar = (): void => {
      const kg = piezas.reduce((s, o) => s + o.physics.massKg, 0);
      const fijas = piezas.filter((o) => o.physics.fixed).length;
      if (document.activeElement !== masa) {
        masa.value = String(roundTo(piezas.length ? kg / piezas.length : 0, 2));
      }
      fija.checked = fijas === piezas.length;
      fija.indeterminate = fijas > 0 && fijas < piezas.length;
      resumen.textContent = tt(
        `${piezas.length} piezas · ${roundTo(kg, 1)} kg en total · `
          + `${fijas} fija(s), ${piezas.length - fijas} móvil(es)`,
        `${piezas.length} parts · ${roundTo(kg, 1)} kg total · `
          + `${fijas} fixed, ${piezas.length - fijas} mobile`,
      );
      // El caso que rompe las guías, dicho con su nombre.
      const atrapadas = enhebradas.filter((o) => o.physics.fixed);
      aviso.textContent =
        atrapadas.length > 0
          ? tt(
              `⚠ ${atrapadas.map((o) => o.name).join(", ")} está enhebrada en guías `
                + "tubulares pero marcada como FIJA: así no puede correr por ellas. "
                + "Desmarca «Fija» para que la guía la gobierne.",
              `⚠ ${atrapadas.map((o) => o.name).join(", ")} is threaded on tubular `
                + "guides but marked FIXED: it cannot run along them. Untick «Fixed» "
                + "so the guide governs it.",
            )
          : "";
    };

    const aplicar = (fn: (o: SceneObject) => void): void => {
      for (const o of piezas) {
        fn(o);
        this.editor.bus.emit("objectTransformed", { object: o });
      }
      refrescar();
    };
    masa.addEventListener("change", () => {
      const v = parseFloat(masa.value);
      if (!Number.isFinite(v) || v < 0) return;
      aplicar((o) => (o.physics.massKg = v));
    });
    fija.addEventListener("change", () => {
      const v = fija.checked;
      aplicar((o) => (o.physics.fixed = v));
    });

    refrescar();
    return el("div", { class: "field" }, [
      el("label", {}, [tt("Física del conjunto", "Assembly physics")]),
      resumen,
      el("div", { class: "row" }, [
        el("div", { class: "sub" }, [
          el("label", {}, [tt("Masa por pieza (kg)", "Mass per part (kg)")]),
          masa,
        ]),
        el("label", { class: "rold-check" }, [fija, tt("Fijas", "Fixed")]),
      ]),
      aviso,
    ]);
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
    // El arco de recorrido pertenece a la pieza que se muestra: al cambiar de
    // selección se retira, y `bisagraSection` lo vuelve a pintar si toca.
    this.editor.mostrarRecorridoDeBisagra(null);
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
    // La placa dentada lleva su propia sección: sus medidas no son «ancho,
    // alto y fondo» sino ganchos e intervalo, y doblarla o retorcerla no hace
    // nada —su geometría se genera antes de esa fase— así que enseñar esos
    // controles sería prometer algo que no pasa.
    const isDentada = obj.params.kind === "dentada";
    const parametric = !obj.imported && !obj.customModel && !isLine && !isDentada;
    this.body.append(this.nameField(obj));
    this.body.append(this.materialField(obj));
    if (obj.customModel) this.body.append(this.customModelHint());
    // LARGO A MEDIDA: va lo primero de las medidas, porque en estas piezas es
    // LA medida que se toca — el resto del perfil es el de fábrica.
    if (obj.largoAjustable()) this.body.append(this.largoSection(obj));
    if (parametric) {
      this.body.append(this.dimSection(obj));
    }
    if (isLine) this.body.append(this.lineSection(obj));
    if (isDentada) this.body.append(this.dentadaSection(obj));
    this.body.append(this.transformSection(obj));
    if (parametric) {
      this.body.append(this.deformSection(obj));
    }
    this.body.append(this.flipSection());
    if (obj.stack) this.body.append(this.stackSection(obj));
    if (obj.carga) this.body.append(this.cargaSection(obj));
    if (PIEZAS_CALCE.has(obj.componentId)) this.body.append(this.calceSection(obj));
    // El pasador atraviesa la viga: además del agujero, se le regula cuánto
    // sobra por cada lado y cuánto mide.
    if (getDefinition(obj.componentId)?.ejePasante) this.body.append(this.pinSection(obj));
    if (obj.componentId === "guia-tubular") this.body.append(this.vinculacionSection(obj));
    if (esTubularOPilar(obj)) this.body.append(this.brazoSection(obj));
    const bisagra = this.bisagraSection(obj);
    if (bisagra) this.body.append(bisagra);
    this.body.append(this.physicsSection(obj));
  }

  /**
   * BISAGRA: SENSIBILIDAD DEL GESTO (v0.3.21).
   *
   * Una pieza colgada de una bisagra no se empuja durante la simulación: se
   * gira con el scroll —o subiendo y bajando la mano de agarre—, que es un
   * mando de una sola dimensión y no mete ninguna fuerza fuera del pasador.
   * Lo único que hay que graduar es cuánto gira por gesto, y eso depende del
   * tamaño de la pieza: se guarda con la propia unión.
   */
  private bisagraSection(obj: SceneObject): HTMLElement | null {
    const j = this.editor.bisagraQueSostiene(obj.id);
    if (!j) return null;
    // Al seleccionar la pieza se dibuja SU RECORRIDO en el visor, con la
    // máquina parada: el rango deja de elegirse a ciegas.
    this.editor.mostrarRecorridoDeBisagra(obj.id);
    const repintarArco = (): void => this.editor.mostrarRecorridoDeBisagra(obj.id);
    const grados = (v: number, set: (n: number) => void): HTMLInputElement => {
      const inp = el("input", {
        type: "number", min: "0", max: "180", step: "5", value: String(v),
      }) as HTMLInputElement;
      inp.addEventListener("input", () => {
        const n = parseFloat(inp.value);
        if (!Number.isFinite(n)) return;
        set(Math.min(180, Math.max(0, n)));
        this.editor.jointUpdated();
        repintarArco();
      });
      return inp;
    };
    const limOn = el("input", { type: "checkbox" }) as HTMLInputElement;
    limOn.checked = j.limitsEnabled;
    limOn.addEventListener("change", () => {
      j.limitsEnabled = limOn.checked;
      this.editor.jointUpdated();
      repintarArco();
    });
    const minIn = grados(j.min, (n) => (j.min = n));
    const maxIn = grados(j.max, (n) => (j.max = n));
    const input = el("input", {
      type: "range",
      min: "1",
      max: "45",
      step: "1",
      value: String(j.sensibilidad),
    }) as HTMLInputElement;
    const lectura = el("span", { class: "empty-hint" }, []);
    const pintar = (): void => {
      lectura.textContent = tt(
        `${j.sensibilidad}° por cada 100 px de scroll`,
        `${j.sensibilidad}° per 100 px of scroll`,
      );
    };
    input.addEventListener("input", () => {
      const v = parseFloat(input.value);
      if (!Number.isFinite(v)) return;
      j.sensibilidad = Math.min(45, Math.max(1, v));
      pintar();
      this.editor.jointUpdated();
    });
    pintar();
    return el("div", { class: "field" }, [
      el("label", {}, [tt("Bisagra · recorrido", "Hinge · travel")]),
      el("label", { class: "rold-check" }, [
        limOn,
        tt("Limitar (grados de la placa)", "Limit (leaf degrees)"),
      ]),
      el("div", { class: "row" }, [
        el("div", { class: "sub" }, [el("label", {}, [tt("Mín", "Min")]), minIn]),
        el("div", { class: "sub" }, [el("label", {}, [tt("Máx", "Max")]), maxIn]),
      ]),
      el("div", { class: "empty-hint", style: "padding:4px;" }, [
        tt(
          "180° = placas en línea, 0° = plegada. El arco del visor enseña el tramo elegido.",
          "180° = leaves in line, 0° = folded. The arc in the viewport shows the chosen span.",
        ),
      ]),
      el("label", {}, [tt("Sensibilidad del gesto", "Gesture sensitivity")]),
      input,
      lectura,
      el("div", { class: "empty-hint", style: "padding:4px;" }, [
        tt(
          "En simulación, esta pieza se opera GIRÁNDOLA: scroll arriba/abajo sobre "
            + "ella, o agárrala y mueve la mano hacia arriba o hacia abajo. Más bajo, "
            + "más fino.",
          "In simulation this part is operated by TURNING it: scroll up/down over it, "
            + "or grab it and move the hand up or down. Lower means finer.",
        ),
      ]),
    ]);
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
   * SAFETY PIN: el pasador atraviesa el pinhole de lado a lado, y lo que se
   * regula aquí es lo que se regula en el rack real — cuánto mide la barra y
   * cuánto sobresale por cada lado, que es lo que decide dónde apoya la carga.
   * El diámetro lo manda el agujero: más gordo, no entra.
   */
  private pinSection(obj: SceneObject): HTMLElement {
    const lectura = el("div", { class: "empty-hint", style: "padding:4px;" }, []);
    const aviso = el("div", { class: "empty-hint", style: "padding:4px;" }, []);
    const largo = el("input", { type: "number", step: "0.5", min: "2" }) as HTMLInputElement;
    const corr = el("input", { type: "number", step: "0.5" }) as HTMLInputElement;
    const dia = el("input", { type: "number", step: "0.1", min: "0.3" }) as HTMLInputElement;

    const refrescar = (): void => {
      const e = this.editor.estadoPin(obj.id);
      largo.value = String(roundTo(obj.params.height ?? 0, 1));
      dia.value = String(roundTo((obj.params.radiusTop ?? 0) * 2, 2));
      corr.value = String(roundTo(obj.params.pinOffsetCm ?? 0, 1));
      if (!e) {
        lectura.textContent = tt(
          "Sin poste con agujeros cerca: acerca el pasador a un montante y calza con ▲/▼.",
          "No drilled post nearby: bring the pin next to an upright and seat it with ▲/▼.",
        );
        corr.removeAttribute("max");
        dia.removeAttribute("max");
        return;
      }
      corr.max = String(e.corrimientoMax);
      corr.min = String(-e.corrimientoMax);
      if (e.diaAgujero) dia.max = String(roundTo(e.diaAgujero - 0.1, 2));
      lectura.textContent = e.calzado
        ? tt(
            `Atraviesa ${e.grosor} cm de viga · sobresale ${e.sobranteA} cm por un lado `
              + `y ${e.sobranteB} cm por el otro. Agujero de Ø ${e.diaAgujero ?? "?"} cm; `
              + `pasador de Ø ${e.diaPin} cm.`,
            `Goes through ${e.grosor} cm of beam · sticks out ${e.sobranteA} cm on one side `
              + `and ${e.sobranteB} cm on the other. Hole Ø ${e.diaAgujero ?? "?"} cm; `
              + `pin Ø ${e.diaPin} cm.`,
          )
        : tt(
            `Sin calzar (el agujero más cercano es el ${e.agujero} de ${e.total}). `
              + "Usa ▲/▼ para meterlo.",
            `Not seated (nearest hole is ${e.agujero} of ${e.total}). Use ▲/▼ to drive it in.`,
          );
    };

    // Al reasentar, el pasador vuelve a su agujero con la medida nueva: el
    // sobrante se reparte otra vez y el corrimiento se respeta.
    const reasentar = (): void => {
      const err = this.editor.calcePorAgujero(obj.id, 0);
      aviso.textContent = err ?? "";
      this.editor.bus.emit("objectTransformed", { object: obj });
      refrescar();
    };

    largo.addEventListener("change", () => {
      const v = parseFloat(largo.value);
      if (!Number.isFinite(v)) return;
      obj.params.height = Math.max(2, v);
      obj.rebuildGeometry();
      reasentar();
    });
    dia.addEventListener("change", () => {
      const v = parseFloat(dia.value);
      if (!Number.isFinite(v)) return;
      const e = this.editor.estadoPin(obj.id);
      // Tope duro por el agujero: se avisa en vez de dejarlo pasar callando.
      const max = e?.diaAgujero ? e.diaAgujero - 0.1 : v;
      const d = Math.max(0.3, Math.min(max, v));
      if (d < v - 1e-6) {
        aviso.textContent = tt(
          `El agujero mide Ø ${e?.diaAgujero} cm: el pasador se queda en Ø ${roundTo(d, 2)}.`,
          `The hole is Ø ${e?.diaAgujero} cm: the pin stays at Ø ${roundTo(d, 2)}.`,
        );
      } else aviso.textContent = "";
      obj.params.radiusTop = d / 2;
      obj.params.radiusBottom = d / 2;
      obj.rebuildGeometry();
      this.editor.bus.emit("objectTransformed", { object: obj });
      refrescar();
    });
    corr.addEventListener("change", () => {
      const v = parseFloat(corr.value);
      if (!Number.isFinite(v)) return;
      const e = this.editor.estadoPin(obj.id);
      const lim = e?.corrimientoMax ?? Math.abs(v);
      const c = Math.max(-lim, Math.min(lim, v));
      if (Math.abs(c - v) > 1e-6) {
        aviso.textContent = tt(
          `Más allá de ${lim} cm el pasador dejaría de atravesar la viga.`,
          `Past ${lim} cm the pin would stop crossing the beam.`,
        );
      } else aviso.textContent = "";
      const err = this.editor.correrPasante(obj.id, c);
      if (err) aviso.textContent = err;
      this.editor.bus.emit("objectTransformed", { object: obj });
      refrescar();
    });
    const centrar = el("button", { class: "tool", title: tt("Igual sobrante a los dos lados", "Equal overhang on both sides") }, [
      tt("Centrar", "Center"),
    ]);
    centrar.addEventListener("click", () => {
      corr.value = "0";
      corr.dispatchEvent(new Event("change"));
    });

    refrescar();
    return el("div", { class: "field" }, [
      el("label", {}, [tt("Pasador (safety pin)", "Safety pin")]),
      lectura,
      el("div", { class: "row" }, [
        el("div", { class: "sub" }, [el("label", {}, [tt("Largo (cm)", "Length (cm)")]), largo]),
        el("div", { class: "sub" }, [el("label", {}, [tt("Ø (cm)", "Ø (cm)")]), dia]),
      ]),
      el("div", { class: "row" }, [
        el("div", { class: "sub" }, [
          el("label", {}, [tt("Corrimiento (cm)", "Shift (cm)")]),
          corr,
        ]),
        centrar,
      ]),
      aviso,
    ]);
  }

  /**
   * ADMINISTRAR VINCULACIÓN (v0.3.7): el interruptor de la guía tubular.
   *
   * Antes, cualquier pieza soltada encima de una guía quedaba enhebrada por el
   * hecho de pasar por ahí. Ahora manda la guía: se enciende esto, se hace
   * clic en las piezas que deben correr por ella y se las coloca con el gizmo
   * — al soltarlas se les canaliza el recorrido. Con el interruptor apagado,
   * mover una pieza junto a la guía no le hace nada.
   */
  private vinculacionSection(obj: SceneObject): HTMLElement {
    const check = el("input", { type: "checkbox" }) as HTMLInputElement;
    const estado = el("div", { class: "empty-hint", style: "padding:4px;" }, []);
    const terminar = el("button", { class: "tool" }, [tt("Terminar", "Done")]);

    const refrescar = (): void => {
      check.checked = this.editor.administraGuia(obj.id);
      const n = this.editor.guiasAdministradas().length;
      terminar.style.display = n > 0 ? "" : "none";
      estado.textContent =
        n === 0
          ? tt(
              "Apagado: mover piezas junto a esta guía no las enhebra.",
              "Off: moving pieces next to this guide does not thread them.",
            )
          : tt(
              `Administrando ${n} guía${n > 1 ? "s" : ""}. Haz clic en las piezas y colócalas `
                + "con el gizmo: al soltarlas se canaliza su recorrido. Apartarlas de la guía "
                + "les quita el canal.",
              `Managing ${n} guide${n > 1 ? "s" : ""}. Click the pieces and place them with the `
                + "gizmo: dropping them channels their travel. Moving them off the guide "
                + "removes the channel.",
            );
    };
    check.addEventListener("change", () => {
      this.editor.administrarVinculacion(obj.id, check.checked);
      refrescar();
    });
    terminar.addEventListener("click", () => {
      this.editor.terminarAdministracion();
      refrescar();
    });
    refrescar();
    return el("div", { class: "field" }, [
      el("label", {}, [tt("Administrar vinculación", "Manage linking")]),
      el("div", { class: "row" }, [
        el("label", { class: "sub", style: "flex-direction:row;align-items:center;gap:6px;" }, [
          check,
          tt("Vincular piezas a esta guía", "Link pieces to this guide"),
        ]),
        terminar,
      ]),
      estado,
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

  /**
   * PLACA DENTADA: el intervalo entre ganchos, que es lo que decide a cuántas
   * alturas se puede dejar la barra.
   *
   * El intervalo tiene un MÍNIMO que no se puede saltar, y el panel lo dice en
   * vez de dejar que el usuario lo descubra en simulación. Por debajo de él la
   * barra deja de caber por el hueco que queda entre un gancho y el de arriba,
   * y la placa sigue viéndose perfecta: los ganchos están ahí, dibujados, y la
   * barra se queda posada encima sin entrar en ninguno. Es el fallo más caro
   * de esta pieza, porque no se ve.
   *
   * El largo de la plancha NO cambia al tocar el intervalo: manda lo que se
   * trazó sobre el pilar, y lo que se recalcula es cuántos ganchos caben
   * dentro. Solo crece si se piden a mano más de los que entran.
   */
  private dentadaSection(obj: SceneObject): HTMLElement {
    const p = obj.params;
    const m = medidasDentada(p);
    const minimo = pasoMinimoDentada(p);
    const largo = p.height ?? m.largo;

    const nota = el("p", { class: "hint" }, []);
    const pintarNota = () => {
      const mm = medidasDentada(obj.params);
      clear(nota);
      nota.append(
        tt(
          `${mm.dientes} ganchos cada ${roundTo(mm.paso, 1)} cm en ${roundTo(mm.largo, 0)} cm de placa.`,
          `${mm.dientes} hooks every ${roundTo(mm.paso, 1)} cm over ${roundTo(mm.largo, 0)} cm of plate.`,
        ),
      );
      // El mínimo solo se explica cuando aprieta: si el usuario está lejos de
      // él, la advertencia es ruido.
      if (mm.paso <= minimo + 0.6) {
        nota.append(
          el("strong", {}, [
            tt(
              ` Mínimo ${roundTo(minimo, 1)} cm: por debajo, la barra (⌀ ${DENTADA_BARRA_CM} cm) ya no entra en los ganchos de en medio.`,
              ` Minimum ${roundTo(minimo, 1)} cm: below that the bar (⌀ ${DENTADA_BARRA_CM} cm) no longer fits into the middle hooks.`,
            ),
          ]),
        );
      }
    };

    /**
     * Aplica un intervalo nuevo SIN despegar la placa de su pilar.
     *
     * Hace falta porque el gancho crece con el intervalo: a más separación,
     * más vuelo. Y el `width` que guarda la pieza es el ancho TOTAL —espina
     * más vuelo—, así que si se deja quieto mientras el vuelo engorda, lo que
     * se encoge es la ESPINA, que es justo la parte que tenía que quedar sobre
     * la cara del pilar. La placa se desliza hacia dentro del poste y sus
     * ganchos se meten en él. No salta a la vista: la placa sigue pareciendo
     * bien puesta y lo que falla es la barra, que ahora choca con el pilar.
     *
     * Así que se conserva la espina y se recalcula el ancho, y la pieza se
     * corre media diferencia de vuelo por su propio eje X —que es hacia donde
     * miran los ganchos— para que el respaldo siga apoyado donde estaba.
     */
    const aplicar = (paso: number, dientes: number) => {
      const antes = medidasDentada(obj.params);
      obj.params.dienteEspaciado = paso;
      obj.params.dientes = dientes;
      const vueloNuevo = medidasDentada({ ...obj.params, width: undefined }).vuelo;
      obj.params.width = antes.espina + vueloNuevo;
      const desplazamiento = (vueloNuevo - antes.vuelo) / 2;
      if (Math.abs(desplazamiento) > 1e-6) {
        const ejeGanchos = new THREE.Vector3(1, 0, 0).applyQuaternion(obj.mesh.quaternion);
        obj.mesh.position.addScaledVector(ejeGanchos, desplazamiento);
      }
      obj.rebuildGeometry();
      this.editor.bus.emit("objectTransformed", { object: obj });
      pintarNota();
    };

    const campo = (
      label: string,
      valor: number,
      step: string,
      min: number,
      alCambiar: (v: number) => void,
    ) => {
      const input = el("input", {
        type: "number",
        value: String(roundTo(valor, 1)),
        step,
        min: String(min),
      });
      input.addEventListener("change", () => {
        const v = parseFloat(input.value);
        if (!Number.isFinite(v)) return;
        alCambiar(v);
        // El campo se reescribe con lo que la pieza aceptó de verdad: si se
        // pidió un intervalo por debajo del mínimo, aquí se ve corregido.
        input.value = String(roundTo(medidasDentada(obj.params).paso, 1));
      });
      return el("div", { class: "sub" }, [el("label", {}, [label]), input]);
    };

    const paso = campo(
      tt("Intervalo entre ganchos (cm)", "Hook interval (cm)"),
      m.paso,
      "0.5",
      roundTo(minimo, 1),
      (v) => {
        // Al cambiar el intervalo se recalculan los ganchos que caben en el
        // largo YA TRAZADO. Sin esto la plancha crecería sola para alojar los
        // que había, y se saldría del pilar sobre el que se dibujó.
        const real = Math.max(minimo, v);
        aplicar(real, dientesQueCaben(largo, real));
      },
    );

    const cuenta = el("div", { class: "sub" }, []);
    const inputN = el("input", {
      type: "number",
      value: String(m.dientes),
      step: "1",
      min: "1",
    });
    inputN.addEventListener("change", () => {
      const v = parseInt(inputN.value, 10);
      if (!Number.isFinite(v) || v < 1) return;
      aplicar(medidasDentada(obj.params).paso, v);
      inputN.value = String(medidasDentada(obj.params).dientes);
    });
    cuenta.append(el("label", {}, [tt("Ganchos", "Hooks")]), inputN);

    /**
     * ANCHO DE LA PLACA (v0.3.24), que es el de su superficie de contacto.
     *
     * Es LA medida que hay que poder tocar: una placa más ancha que la viga
     * sobresale por los cantos y deja de parecer atornillada a ella —los
     * ganchos tienen que ser lo único que asoma del perfil—. Al cambiarla, la
     * pieza se corre media diferencia por su propio eje X para que la cara que
     * apoya en el pilar se quede donde estaba, y los tornillos se reparten de
     * nuevo sobre la espina nueva.
     */
    const anchoIn = el("input", {
      type: "number",
      value: String(roundTo(medidasDentada(obj.params).espina, 1)),
      step: "0.5",
      min: "1",
    }) as HTMLInputElement;
    const pintarPernos = (): void => {
      clear(pernosNota);
      pernosNota.append(
        tt(
          `${pernosQueLleva(obj.params)} tornillos`,
          `${pernosQueLleva(obj.params)} bolts`,
        ),
      );
    };
    const pernosNota = el("span", { class: "empty-hint" }, []);
    anchoIn.addEventListener("change", () => {
      const v = parseFloat(anchoIn.value);
      if (!Number.isFinite(v) || v < 1) return;
      const antes = medidasDentada(obj.params);
      // El ancho que pide el usuario ES la superficie de contacto: se declara
      // como tal para que la regla del pilar siga valiendo.
      obj.params.dienteCaraCm = v;
      obj.params.width = v + antes.vuelo;
      const ahora = medidasDentada(obj.params);
      const desplazamiento = (ahora.ancho - antes.ancho) / 2;
      if (Math.abs(desplazamiento) > 1e-6) {
        const ejeGanchos = new THREE.Vector3(1, 0, 0).applyQuaternion(obj.mesh.quaternion);
        obj.mesh.position.addScaledVector(ejeGanchos, desplazamiento);
      }
      obj.rebuildGeometry();
      this.editor.bus.emit("objectTransformed", { object: obj });
      anchoIn.value = String(roundTo(ahora.espina, 1));
      pintarPernos();
      pintarNota();
    });

    /** SENTIDO DE LOS DIENTES: por qué canto salen y hacia dónde abren. */
    const selector = (
      valor: string,
      opciones: [string, string][],
      alCambiar: (v: string) => void,
    ): HTMLSelectElement => {
      const sel = el("select", { class: "select" }) as HTMLSelectElement;
      for (const [v, etiqueta] of opciones) {
        const o = el("option", { value: v }, [etiqueta]) as HTMLOptionElement;
        if (v === valor) o.selected = true;
        sel.append(o);
      }
      sel.addEventListener("change", () => {
        alCambiar(sel.value);
        obj.rebuildGeometry();
        this.editor.bus.emit("objectTransformed", { object: obj });
      });
      return sel;
    };
    const ladoSel = selector(
      obj.params.dienteLado ?? "derecha",
      [
        ["derecha", tt("Salen a la derecha", "Out to the right")],
        ["izquierda", tt("Salen a la izquierda", "Out to the left")],
      ],
      (v) => (obj.params.dienteLado = v as "derecha" | "izquierda"),
    );
    const bocaSel = selector(
      obj.params.dienteBoca ?? "arriba",
      [
        ["arriba", tt("Boca arriba (jota)", "Mouth up (J-hook)")],
        ["abajo", tt("Boca abajo (agarra por debajo)", "Mouth down (grips from below)")],
      ],
      (v) => (obj.params.dienteBoca = v as "arriba" | "abajo"),
    );

    // QUÉ TIENE QUE AGARRAR (v0.3.23). La misma placa hace dos trabajos: fila
    // de jotas para la barra, o herraje que fija un tubo de una estructura
    // estándar —igual que los pinholes fijan una jota—. Lo único que cambia es
    // el diámetro que la cuna debe admitir, y con él se redimensiona el gancho
    // entero: garganta, labio e intervalo mínimo.
    const agarreIn = el("input", {
      type: "number",
      value: String(roundTo(obj.params.dienteAgarreCm ?? DENTADA_BARRA_CM, 1)),
      step: "0.5",
      min: "1",
    }) as HTMLInputElement;
    agarreIn.addEventListener("change", () => {
      const v = parseFloat(agarreIn.value);
      if (!Number.isFinite(v) || v < 1) return;
      obj.params.dienteAgarreCm = v;
      // El gancho cambia de tamaño: se reaplica el intervalo para que la placa
      // no se despegue del pilar (misma cuenta que al tocar el intervalo).
      aplicar(medidasDentada(obj.params).paso, medidasDentada(obj.params).dientes);
      agarreIn.value = String(roundTo(obj.params.dienteAgarreCm ?? DENTADA_BARRA_CM, 1));
    });
    const agarre = el("div", { class: "sub" }, [
      el("label", {}, [tt("Agarra ⌀ (cm)", "Grips ⌀ (cm)")]),
      agarreIn,
    ]);

    // PLACA DOBLE (v0.3.25): la misma placa en la cara de enfrente, atada a
    // esta en medidas, sentido, posición y giro.
    const dobleOn = el("input", { type: "checkbox" }) as HTMLInputElement;
    dobleOn.checked = !!obj.params.dentadaGemela;
    dobleOn.addEventListener("change", () => {
      if (dobleOn.checked) {
        const gemela = this.editor.hacerDentadaDoble(obj);
        if (!gemela) dobleOn.checked = false;
      } else {
        this.editor.deshacerDentadaDoble(obj);
      }
      this.editor.bus.emit("objectTransformed", { object: obj });
    });

    pintarNota();
    pintarPernos();
    return el("div", { class: "field" }, [
      el("label", {}, [tt("Ganchos de la placa", "Plate hooks")]),
      el("div", { class: "row" }, [paso, cuenta]),
      el("div", { class: "row" }, [
        el("div", { class: "sub" }, [
          el("label", {}, [tt("Ancho de la placa (cm)", "Plate width (cm)")]),
          anchoIn,
        ]),
        el("div", { class: "sub" }, [el("label", {}, [tt("Tornillos", "Bolts")]), pernosNota]),
      ]),
      el("div", { class: "empty-hint", style: "padding:4px;" }, [
        tt(
          "Ponle el ancho de la viga: así los ganchos son lo único que asoma del perfil. "
            + "Los tornillos se reparten solos sobre la placa nueva.",
          "Set it to the beam's width: then the hooks are the only thing sticking out of "
            + "the profile. The bolts lay themselves out again over the new plate.",
        ),
      ]),
      el("div", { class: "row" }, [
        el("div", { class: "sub" }, [el("label", {}, [tt("Dientes", "Teeth")]), ladoSel]),
        el("div", { class: "sub" }, [el("label", {}, [tt("Boca", "Mouth")]), bocaSel]),
      ]),
      el("label", { class: "rold-check" }, [
        dobleOn,
        tt("Placa doble (cara opuesta)", "Double plate (opposite face)"),
      ]),
      el("div", { class: "empty-hint", style: "padding:4px;" }, [
        tt(
          "La gemela se monta en la cara de enfrente de la misma viga y copia todo: "
            + "medidas, sentido, posición y giro.",
          "The twin mounts on the beam's opposite face and copies everything: sizes, "
            + "direction, position and rotation.",
        ),
      ]),
      el("div", { class: "row" }, [agarre]),
      el("div", { class: "empty-hint", style: "padding:4px;" }, [
        tt(
          "Con el diámetro de la barra hace de jota; con el de un tubo, de herraje "
            + "que fija una estructura tubular. La superficie que apoya en el pilar "
            + "nunca pasa del ancho de su cara.",
          "With the bar's diameter it acts as a J-hook; with a tube's, as the fitting "
            + "that clamps a tubular structure. The surface resting on the upright "
            + "never exceeds its face width.",
        ),
      ]),
      nota,
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
        // EL AGUJERO NO PUEDE SER MÁS GORDO QUE EL PERFIL. Sin tope, los
        // agujeros se dibujaban como material FUERA de la viga: la pieza salía
        // sucia y con la caja de colisión engordada —16 cm de alto donde el
        // perfil son 5—, así que en simulación chocaba con cosas que no toca y
        // los calces la medían mal. Se deja el 90 % del lado menor, que es lo
        // que aguanta sin comerse las paredes.
        if (key === "holeDiameter") {
          const lado = Math.min(obj.params.width ?? 5, obj.params.depth ?? 5);
          (obj.params[key] as number) = Math.min(v, lado * 0.9);
        } else {
          (obj.params[key] as number) = v;
        }
        obj.rebuildGeometry();
        this.editor.bus.emit("objectTransformed", { object: obj });
        input.value = String(roundTo((obj.params[key] as number) ?? 0, 2));
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

  /**
   * LARGO A MEDIDA (v0.3.2). El brazo de seguridad, la barra de dominadas y
   * el multi-agarre se tienden ENTRE DOS PILARES, y esa separación la decide
   * quien arma la estructura. Aquí se les da la medida: la malla se alarga
   * por el centro y los remates —placas de montaje, manguito, ganchos— viajan
   * enteros hacia fuera sin deformarse.
   */
  private largoSection(obj: SceneObject): HTMLElement {
    const aj = obj.largoAjustable()!;
    const fabrica = largoDeFabrica(getDefinition(obj.componentId)!, aj.eje);
    const min = aj.minCm ?? Math.max(2 * aj.extremosCm, 10);
    const max = aj.maxCm ?? fabrica * 3;
    const input = el("input", {
      type: "number",
      value: String(roundTo(obj.params.largoCm ?? fabrica, 1)),
      step: "0.5",
      min: String(min),
      max: String(max),
    }) as HTMLInputElement;
    const aplicar = (): void => {
      const v = parseFloat(input.value);
      if (!Number.isFinite(v)) return;
      const largo = Math.max(min, Math.min(max, v));
      obj.params.largoCm = largo;
      obj.rebuildGeometry();
      this.editor.bus.emit("objectTransformed", { object: obj });
      this.editor.requestRender();
      input.value = String(roundTo(largo, 1));
    };
    input.addEventListener("change", aplicar);

    const fab = el("button", { class: "tool", title: `Vuelve a los ${fabrica} cm de fábrica` }, [
      tt("De fábrica", "Factory"),
    ]);
    fab.addEventListener("click", () => {
      input.value = String(fabrica);
      aplicar();
    });

    return el("div", { class: "field" }, [
      el("label", {}, [tt("Largo a medida", "Length to fit")]),
      el("div", { class: "row" }, [
        el("div", { class: "sub" }, [el("label", {}, [tt("Largo (cm)", "Length (cm)")]), input]),
        fab,
      ]),
      el("div", { class: "empty-hint", style: "padding:4px;" }, [
        tt(
          `Se estira por el CENTRO: los ${aj.extremosCm} cm de cada remate viajan enteros, `
            + `sin deformarse. Entre ${min} y ${max} cm.`,
          `Stretched from the MIDDLE: the ${aj.extremosCm} cm at each end travel whole, `
            + `undeformed. Between ${min} and ${max} cm.`,
        ),
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
          if (!Number.isFinite(v)) return;
          obj.mesh.position[ax] = v;
          // AVISAR POR EL BUS, como hace el gizmo. Mover la pieza a mano y no
          // decirlo dejaba la cadena, la correa o el cable anclados a ella
          // dibujados en el sitio viejo, colgando en el aire; la barra de
          // medida sin cambiar; y el proyecto sin marcar como modificado, así
          // que ni ofrecía guardar al salir ni Ctrl+Z deshacía el movimiento.
          this.editor.bus.emit("objectTransformed", { object: obj });
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
          if (!Number.isFinite(v)) return;
          obj.mesh.rotation[ax] = degToRad(v);
          this.editor.bus.emit("objectTransformed", { object: obj });
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
