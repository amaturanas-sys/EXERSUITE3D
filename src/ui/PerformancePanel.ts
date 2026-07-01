import type { Editor } from "../core/Editor";
import {
  applyPreset,
  getPerf,
  setPerf,
  type PerfPreset,
  type PerfSettings,
} from "../core/performance";
import { clear, el } from "./dom";

/**
 * Panel de opciones de rendimiento: presets y ajustes finos (resolución,
 * sombras, reflejos, antialias) para aliviar equipos/tablets con poca potencia.
 * Se aplican en vivo sobre el renderer (salvo el antialias, que requiere reabrir).
 */
export class PerformancePanel {
  readonly root: HTMLElement;
  private body: HTMLElement;
  private open = false;

  constructor(private editor: Editor) {
    this.body = el("div", { class: "perf-body" });
    const closeBtn = el("button", { class: "tool" }, ["Cerrar"]);
    closeBtn.addEventListener("click", () => this.hide());

    const panel = el("div", { class: "perf-panel" }, [
      el("div", { class: "lib-header" }, [
        el("div", { class: "lib-title" }, ["Rendimiento"]),
        closeBtn,
      ]),
      this.body,
    ]);
    this.root = el("div", { class: "lib-overlay", id: "perf" }, [panel]);
    this.root.addEventListener("click", (e) => {
      if (e.target === this.root) this.hide();
    });
    this.root.style.display = "none";

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.open) this.hide();
    });
  }

  toggle(): void {
    this.open ? this.hide() : this.show();
  }
  show(): void {
    this.open = true;
    this.root.style.display = "flex";
    this.render();
  }
  hide(): void {
    this.open = false;
    this.root.style.display = "none";
  }

  private apply(s: PerfSettings): void {
    setPerf(s);
    const sm = this.editor.sceneManager;
    sm.setMaxPixelRatio(s.maxPixelRatio);
    sm.setShadowsEnabled(s.shadows);
    sm.setEnvironmentEnabled(s.environment);
    this.render();
  }

  private render(): void {
    clear(this.body);
    const s = getPerf();

    // Presets.
    const presetRow = el("div", { class: "perf-presets" });
    (["alto", "medio", "bajo"] as Exclude<PerfPreset, "custom">[]).forEach((p) => {
      const b = el("button", { class: s.preset === p ? "tool active" : "tool" }, [
        p[0].toUpperCase() + p.slice(1),
      ]);
      b.addEventListener("click", () => this.apply(applyPreset(p)));
      presetRow.append(b);
    });

    // Ajustes finos.
    const resSel = el("select", { class: "select" });
    for (const [label, val] of [
      ["Muy baja (×1)", 1],
      ["Baja (×1.25)", 1.25],
      ["Media (×1.5)", 1.5],
      ["Alta (×2)", 2],
    ] as [string, number][]) {
      const o = el("option", { value: String(val) }, [label]);
      if (Math.abs(s.maxPixelRatio - val) < 0.001) o.selected = true;
      resSel.append(o);
    }
    resSel.addEventListener("change", () =>
      this.apply({ ...s, preset: "custom", maxPixelRatio: parseFloat(resSel.value) }),
    );

    const toggle = (label: string, checked: boolean, onChange: (v: boolean) => void, note?: string) => {
      const cb = el("input", { type: "checkbox" });
      cb.checked = checked;
      cb.addEventListener("change", () => onChange(cb.checked));
      return el("label", { class: "perf-toggle" }, [
        cb,
        el("span", {}, [label]),
        note ? el("em", { class: "perf-note" }, [note]) : el("span"),
      ]);
    };

    this.body.append(
      el("div", { class: "perf-label" }, ["Calidad"]),
      presetRow,
      el("div", { class: "perf-label" }, ["Resolución de render"]),
      resSel,
      el("div", { class: "perf-label" }, ["Detalles"]),
      toggle("Sombras", s.shadows, (v) => this.apply({ ...s, preset: "custom", shadows: v })),
      toggle("Reflejos de entorno", s.environment, (v) =>
        this.apply({ ...s, preset: "custom", environment: v }),
      ),
      toggle(
        "Antialias (suavizado)",
        s.antialias,
        (v) => {
          setPerf({ ...s, preset: "custom", antialias: v });
          this.render();
        },
        "se aplica al abrir un proyecto",
      ),
      el("div", { class: "perf-hint" }, [
        "Consejo: en equipos o tablets con poca potencia, usa el preset " +
          "Bajo o reduce la resolución para un diseño más fluido. " +
          `(dispositivo: hasta ×${Math.min(window.devicePixelRatio, 2).toFixed(2)} nativo)`,
      ]),
    );
  }
}
