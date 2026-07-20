import type { Editor } from "../core/Editor";
import { guardarCaptura } from "../core/capturas";
import { descargarArchivo } from "../core/descargas";
import { el } from "./dom";

/**
 * Barra de herramientas de SIMULACIÓN: perspectivas, zoom y las pistas de la
 * mano interactiva / posicionamiento del maniquí. En el Builder se muestra
 * solo mientras corre la física (la UI de edición se oculta); en el modo
 * Simulador (desde la Home) es la única interfaz y añade Inicio y ▶/■.
 */
export class SimulatorBar {
  readonly root: HTMLElement;

  /** 📷 Fotografía el visor: guarda en la galería de la Home y descarga. */
  private botonCaptura(): HTMLElement {
    const b = el("button", { class: "tool", title: "Capturar imagen del visor (galería + descarga)" }, [
      "📷 Captura",
    ]);
    b.addEventListener("click", () => {
      void (async () => {
        try {
          const dataUrl = this.editor.captureViewportPNG();
          await guardarCaptura(dataUrl);
          const base64 = dataUrl.split(",")[1];
          const bin = atob(base64);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          await descargarArchivo(`exersuite3d-captura-${Date.now()}.png`, bytes, "image/png");
          b.textContent = "✓ Guardada";
          setTimeout(() => (b.textContent = "📷 Captura"), 1600);
        } catch (err) {
          console.error("No se pudo capturar:", err);
        }
      })();
    });
    return b;
  }

  constructor(
    private editor: Editor,
    opts: { standalone?: boolean; onHome?: () => void } = {},
  ) {
    const view = (label: string, v: "frontal" | "lateral" | "superior" | "isometrica") => {
      const b = el("button", { class: "tool", title: `Vista ${label.toLowerCase()}` }, [label]);
      b.addEventListener("click", () => this.editor.setViewPreset(v));
      return b;
    };
    const zoom = (label: string, factor: number, title: string) => {
      const b = el("button", { class: "tool", title }, [label]);
      b.addEventListener("click", () => this.editor.zoomBy(factor));
      return b;
    };

    const children: HTMLElement[] = [];

    if (opts.standalone) {
      const homeBtn = el("button", { class: "tool", title: "Volver a la pantalla de inicio" }, [
        "⌂ Inicio",
      ]);
      homeBtn.addEventListener("click", () => opts.onHome?.());
      const simBtn = el("button", { class: "tool sim", title: "Pausar/reanudar la física (Espacio)" }, [
        "■ Pausar",
      ]);
      simBtn.addEventListener("click", () => void this.editor.toggleSimulation());
      this.editor.bus.on("simulationChanged", ({ running }) => {
        simBtn.textContent = running ? "■ Pausar" : "▶ Reanudar";
        simBtn.classList.toggle("active", running);
      });
      children.push(el("div", { class: "tool-group" }, [homeBtn, simBtn]));
    }

    children.push(
      el("div", { class: "tool-group" }, [
        view("Frontal", "frontal"),
        view("Lateral", "lateral"),
        view("Superior", "superior"),
        view("Isométrica", "isometrica"),
      ]),
      el("div", { class: "tool-group" }, [
        zoom("＋", 0.8, "Acercar"),
        zoom("－", 1.25, "Alejar"),
      ]),
      el("div", { class: "tool-group" }, [this.botonCaptura()]),
      el("div", { class: "sim-hint" }, [
        "🖐 Arrastra una pieza móvil para moverla con la mano · arrastra el maniquí para situarlo",
      ]),
    );

    this.root = el("div", { id: "simbar" }, children);
  }
}
