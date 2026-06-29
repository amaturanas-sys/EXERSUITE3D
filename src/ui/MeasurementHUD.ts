import type { Editor } from "../core/Editor";
import type { SceneObject } from "../objects/SceneObject";
import { formatCm } from "../core/units";
import { el } from "./dom";

/** Barra inferior con la medida en vivo (ancho x alto x fondo) de la seleccion. */
export class MeasurementHUD {
  readonly root: HTMLElement;
  private current: SceneObject | null = null;

  constructor(editor: Editor) {
    this.root = el("div", { id: "hud" }, ["1 celda = 10 cm · ejes en cm"]);
    editor.bus.on("selectionChanged", ({ selected }) => {
      this.current = selected;
      this.update();
    });
    editor.bus.on("objectTransformed", ({ object }) => {
      if (object === this.current) this.update();
    });
  }

  private update(): void {
    if (!this.current) {
      this.root.textContent = "1 celda = 10 cm · ejes en cm";
      return;
    }
    const s = this.current.effectiveSize();
    this.root.textContent =
      `${this.current.name}  ·  ${formatCm(s.x)} × ${formatCm(s.y)} × ${formatCm(s.z)}`;
  }
}
