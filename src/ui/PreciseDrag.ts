import type { Editor } from "../core/Editor";
import { el } from "./dom";
import { tt } from "../core/i18n";

/**
 * ARRASTRE PRECISO (v0.2.3): ventana flotante con cursores en pantalla para
 * movilizar la selección con exactitud — ◀ ▶ mueven a los lados (X) y ▲ ▼
 * suben/bajan (Y) o, con el SWITCH de ejes, van adelante/atrás (Z). También
 * responden las flechas del teclado (la tecla C cambia el eje y Shift da
 * pasos de 10 cm). Se activa desde el menú Selección.
 */
export class PreciseDrag {
  readonly root: HTMLElement;
  /** Aviso de cambio de visibilidad (mantiene sincronizadas pestaña y menú). */
  onCambio: (() => void) | null = null;
  /** true: ▲▼ = arriba/abajo (Y) · false: ▲▼ = adelante/atrás (Z). */
  private ejeVertical = true;
  private activa = false;
  private switchBtn: HTMLButtonElement;
  private upBtn: HTMLButtonElement;
  private downBtn: HTMLButtonElement;

  constructor(private editor: Editor) {
    const paso = (shift: boolean) => (shift ? 10 : 1);
    const btn = (label: string, title: string, fn: (p: number) => void): HTMLButtonElement => {
      const b = el("button", { class: "tool arr-btn", title }, [label]) as HTMLButtonElement;
      b.addEventListener("click", (e) => fn(paso(e.shiftKey)));
      return b;
    };

    this.upBtn = btn("▲", "Arriba (flecha ↑)", (p) => this.vertical(p));
    this.downBtn = btn("▼", "Abajo (flecha ↓)", (p) => this.vertical(-p));
    const left = btn("◀", "Izquierda (flecha ←)", (p) => this.editor.nudgeSelection(-p, 0, 0));
    const right = btn("▶", "Derecha (flecha →)", (p) => this.editor.nudgeSelection(p, 0, 0));

    this.switchBtn = el(
      "button",
      { class: "tool arr-switch", title: "Cambiar el eje de ▲▼ (tecla C)" },
      ["↕"],
    ) as HTMLButtonElement;
    this.switchBtn.addEventListener("click", () => this.toggleEje());

    const cerrar = el("button", { class: "tool arr-cerrar", title: "Cerrar" }, ["✕"]);
    cerrar.addEventListener("click", () => this.setActiva(false));

    const grid = el("div", { class: "arr-grid" }, [
      el("span"), this.upBtn, el("span"),
      left, this.switchBtn, right,
      el("span"), this.downBtn, el("span"),
    ]);
    this.root = el("div", { class: "arrastre-panel" }, [
      el("div", { class: "arr-header" }, [
        el("span", { class: "arr-titulo" }, ["Arrastre preciso"]),
        cerrar,
      ]),
      grid,
      el("div", { class: "arr-hint" }, [
        "Flechas del teclado · C cambia el eje de ▲▼ · Shift: pasos de 10 cm",
      ]),
    ]);
    this.root.style.display = "none";
    this.actualizarEje();
  }

  private vertical(p: number): void {
    if (this.ejeVertical) this.editor.nudgeSelection(0, p, 0);
    else this.editor.nudgeSelection(0, 0, -p); // adelante = −Z (alejándose de la vista)
  }

  private toggleEje(): void {
    this.ejeVertical = !this.ejeVertical;
    this.actualizarEje();
  }

  private actualizarEje(): void {
    this.switchBtn.textContent = this.ejeVertical ? "↕" : "⇅";
    this.switchBtn.title = this.ejeVertical
      ? tt("▲▼: arriba/abajo · toca (o tecla C) para adelante/atrás", "▲▼: up/down · tap (or key C) for forward/back")
      : tt("▲▼: adelante/atrás · toca (o tecla C) para arriba/abajo", "▲▼: forward/back · tap (or key C) for up/down");
    this.upBtn.title = this.ejeVertical ? tt("Arriba (flecha ↑)", "Up (↑ arrow)") : tt("Adelante (flecha ↑)", "Forward (↑ arrow)");
    this.downBtn.title = this.ejeVertical ? tt("Abajo (flecha ↓)", "Down (↓ arrow)") : tt("Atrás (flecha ↓)", "Back (↓ arrow)");
    this.switchBtn.classList.toggle("active", !this.ejeVertical);
  }

  isActiva(): boolean {
    return this.activa;
  }

  toggle(): void {
    this.setActiva(!this.activa);
  }

  setActiva(on: boolean): void {
    if (this.activa === on) return;
    this.activa = on;
    this.root.style.display = on ? "flex" : "none";
    if (on) window.addEventListener("keydown", this.onKey, true);
    else window.removeEventListener("keydown", this.onKey, true);
    this.onCambio?.();
  }

  dispose(): void {
    this.setActiva(false);
    this.root.remove();
  }

  private onKey = (e: KeyboardEvent): void => {
    const objetivo = e.target as HTMLElement | null;
    if (objetivo && /^(INPUT|TEXTAREA|SELECT)$/.test(objetivo.tagName)) return;
    const p = e.shiftKey ? 10 : 1;
    switch (e.code) {
      case "ArrowLeft":
        this.editor.nudgeSelection(-p, 0, 0);
        break;
      case "ArrowRight":
        this.editor.nudgeSelection(p, 0, 0);
        break;
      case "ArrowUp":
        this.vertical(p);
        break;
      case "ArrowDown":
        this.vertical(-p);
        break;
      case "KeyC":
        this.toggleEje();
        break;
      default:
        return;
    }
    e.preventDefault();
    e.stopPropagation();
  };
}
