import type { Editor } from "../core/Editor";
import type { SceneObject } from "../objects/SceneObject";
import { formatCm } from "../core/units";
import { el } from "./dom";

/** Barra inferior con la medida en vivo (ancho x alto x fondo) de la seleccion. */
export class MeasurementHUD {
  readonly root: HTMLElement;
  private current: SceneObject | null = null;
  private simulating = false;
  private axisLock: "x" | "y" | "z" | null = null;

  constructor(editor: Editor) {
    this.root = el("div", { id: "hud" }, ["1 celda = 10 cm · ejes en cm"]);
    editor.bus.on("selectionChanged", ({ selected }) => {
      this.current = selected;
      this.update();
    });
    editor.bus.on("objectTransformed", ({ object }) => {
      if (object === this.current) this.update();
    });
    editor.bus.on("simulationChanged", ({ running }) => {
      this.simulating = running;
      this.update();
    });
    editor.bus.on("axisLockChanged", ({ axis }) => {
      this.axisLock = axis;
      this.update();
    });
  }

  private update(): void {
    if (this.simulating) {
      this.root.textContent = "● Simulando fisica (gravedad 9.81 m/s²) — Espacio para detener";
      return;
    }
    const eje = this.axisLock
      ? `EJE ${this.axisLock.toUpperCase()} BLOQUEADO (0 libera)  ·  `
      : "";
    if (!this.current) {
      this.root.textContent = eje + "1 celda = 10 cm · ejes en cm";
      return;
    }
    const s = this.current.effectiveSize();
    this.root.textContent =
      `${eje}${this.current.name}  ·  ${formatCm(s.x)} × ${formatCm(s.y)} × ${formatCm(s.z)}`;
  }
}
