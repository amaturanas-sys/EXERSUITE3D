import type { Editor } from "../core/Editor";
import type { SceneObject } from "../objects/SceneObject";
import { formatCm } from "../core/units";
import { tt } from "../core/i18n";
import { el } from "./dom";

/** Barra inferior con la medida en vivo (ancho x alto x fondo) de la seleccion. */
export class MeasurementHUD {
  readonly root: HTMLElement;
  private current: SceneObject | null = null;
  private simulating = false;
  private axisLock: "x" | "y" | "z" | null = null;
  private measure: string | null = null;
  private fuera = 0;

  constructor(editor: Editor) {
    this.root = el("div", { id: "hud" }, [
      tt("1 celda = 10 cm · ejes en cm", "1 cell = 10 cm · axes in cm"),
    ]);
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
    editor.bus.on("dragMeasure", ({ text }) => {
      this.measure = text;
      this.update();
    });
    editor.bus.on("workspaceBounds", ({ fuera }) => {
      this.fuera = fuera;
      this.update();
    });
  }

  private update(): void {
    if (this.simulating) {
      this.root.textContent = tt(
        "● Simulando fisica (gravedad 9.81 m/s²) — Espacio para detener",
        "● Simulating physics (gravity 9.81 m/s²) — Space to stop",
      );
      return;
    }
    const aviso =
      this.fuera > 0
        ? `⛔ ${this.fuera} ${
            this.fuera > 1
              ? tt("piezas fuera del área", "parts outside the area")
              : tt("pieza fuera del área", "part outside the area")
          }  ·  `
        : "";
    const eje = this.axisLock
      ? `${aviso}${tt("EJE", "AXIS")} ${this.axisLock.toUpperCase()} ${tt("BLOQUEADO (0 libera)", "LOCKED (0 releases)")}  ·  `
      : aviso;
    if (this.measure) {
      this.root.textContent = eje + this.measure;
      return;
    }
    if (!this.current) {
      this.root.textContent = eje + tt("1 celda = 10 cm · ejes en cm", "1 cell = 10 cm · axes in cm");
      return;
    }
    const s = this.current.effectiveSize();
    this.root.textContent =
      `${eje}${this.current.name}  ·  ${formatCm(s.x)} × ${formatCm(s.y)} × ${formatCm(s.z)}`;
  }
}
