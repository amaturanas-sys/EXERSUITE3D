import type { Editor } from "../core/Editor";
import { tt } from "../core/i18n";
import { el } from "./dom";

/**
 * PANEL DE ARTICULACIONES (v0.2.41).
 *
 * La ventana desde la que se decide QUÉ se mueve. Cada familia articular
 * —columna, cuello, hombro, codo, muñeca, cadera, rodilla, tobillo— tiene su
 * casilla, y un selector de lado (izquierda, derecha o simétrico) dice sobre
 * cuál actúa. La figura nace con TODO bloqueado: se libera a propósito lo que
 * el ejercicio necesita y los cursores ▲▼ mueven a la vez todo lo liberado.
 *
 * El candado gobierna SOLO ese movimiento: posar la figura a mano y colocar
 * los agarres de manos y pies siguen funcionando con las articulaciones
 * bloqueadas, porque son los que fijan la postura de partida.
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
  private lado: "L" | "R" | "sim" = "sim";
  private casillas = new Map<string, HTMLInputElement>();
  private resumen: HTMLElement;
  private botonesLado: HTMLButtonElement[] = [];

  constructor(private editor: Editor) {
    const filas = FAMILIAS.map(([fam, es, en]) => {
      const chk = el("input", { type: "checkbox", class: "art-chk" }) as HTMLInputElement;
      chk.addEventListener("change", () => {
        const unico = fam === "spine" || fam === "neck";
        this.editor.setBloqueoArticular(fam, unico ? "sim" : this.lado, !chk.checked);
      });
      this.casillas.set(fam, chk);
      return el("label", { class: "art-fila" }, [chk, el("span", {}, [tt(es, en)])]);
    });

    const ladoRow = el("div", { class: "art-lados" }, LADOS.map(([id, es, en]) => {
      const b = el("button", { class: id === "sim" ? "tool active" : "tool" }, [tt(es, en)]) as HTMLButtonElement;
      b.addEventListener("click", () => {
        this.lado = id;
        for (const o of this.botonesLado) o.classList.toggle("active", o === b);
        this.refrescar();
      });
      this.botonesLado.push(b);
      return b;
    }));

    const bTodo = el("button", { class: "tool" }, [tt("Bloquear todo", "Lock all")]);
    bTodo.addEventListener("click", () => {
      for (const [fam] of FAMILIAS) this.editor.setBloqueoArticular(fam, "sim", true);
    });
    const bNada = el("button", { class: "tool" }, [tt("Liberar todo", "Release all")]);
    bNada.addEventListener("click", () => {
      for (const [fam] of FAMILIAS) this.editor.setBloqueoArticular(fam, "sim", false);
    });

    this.resumen = el("div", { class: "art-resumen" }, [""]);

    this.root = el("aside", { class: "panel", id: "articulaciones" }, [
      el("div", { class: "panel-title" }, [tt("Articulaciones", "Joints")]),
      el("div", { class: "panel-body" }, [
        el("div", { class: "art-hint" }, [
          tt("Lado sobre el que actúan las casillas:", "Side the checkboxes act on:"),
        ]),
        ladoRow,
        el("div", { class: "art-hint" }, [
          tt("Marca lo que quieras MOVER con ▲▼:", "Tick what you want to MOVE with ▲▼:"),
        ]),
        ...filas,
        el("div", { class: "art-acciones" }, [bTodo, bNada]),
        this.resumen,
        el("div", { class: "art-hint" }, [
          tt(
            "El bloqueo solo afecta a ▲▼: posar la figura y apoyar manos y pies siguen disponibles, y son los que fijan la postura de partida.",
            "Locking only affects ▲▼: posing the figure and attaching hands and feet still work, and they set the starting pose.",
          ),
        ]),
      ]),
    ]);
    this.root.style.display = "none";

    this.editor.bus.on("jointLocksChanged", () => this.refrescar());
    this.editor.bus.on("humanFigureChanged", () => this.refrescar());
    this.refrescar();
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

  private refrescar(): void {
    const libres = new Set(this.editor.articulacionesLibres());
    for (const [fam] of FAMILIAS) {
      const chk = this.casillas.get(fam);
      if (!chk) continue;
      const nombres =
        fam === "spine" || fam === "neck"
          ? [fam]
          : this.lado === "sim"
            ? [`${fam}L`, `${fam}R`]
            : [`${fam}${this.lado}`];
      const libresAqui = nombres.filter((n) => libres.has(n)).length;
      chk.checked = libresAqui > 0;
      chk.indeterminate = libresAqui > 0 && libresAqui < nombres.length;
    }
    const n = libres.size;
    this.resumen.textContent = n === 0
      ? tt("Todo bloqueado: ▲▼ no moverán nada.", "All locked: ▲▼ will move nothing.")
      : tt(`${n} articulación(es) libre(s) — ▲▼ las mueven a la vez.`,
           `${n} joint(s) free — ▲▼ move them together.`);
  }
}
