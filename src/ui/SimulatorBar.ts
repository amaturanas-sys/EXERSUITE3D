import type { Editor } from "../core/Editor";
import { guardarCaptura } from "../core/capturas";
import { descargarArchivo } from "../core/descargas";
import { tt } from "../core/i18n";
import { conEmojisSilueta, el } from "./dom";

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
          b.textContent = tt("✓ Guardada", "✓ Saved");
          // Restaura con el envoltorio de siluetas (textContent lo perdería).
          setTimeout(() => b.replaceChildren(...conEmojisSilueta(tt("📷 Captura", "📷 Capture"))), 1600);
        } catch (err) {
          console.error("No se pudo capturar:", err);
        }
      })();
    });
    return b;
  }

  constructor(
    private editor: Editor,
    opts: {
      standalone?: boolean;
      onHome?: () => void;
      /** Abre el visor de PROTOTIPO CON FOTO (herramienta del viewer, v0.2.19). */
      onPrototipo?: () => void;
    } = {},
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
        tt("■ Pausar", "■ Pause"),
      ]);
      simBtn.addEventListener("click", () => void this.editor.toggleSimulation());
      this.editor.bus.on("simulationChanged", ({ running }) => {
        simBtn.textContent = running ? tt("■ Pausar", "■ Pause") : tt("▶ Reanudar", "▶ Resume");
        simBtn.classList.toggle("active", running);
      });
      // PROTOTIPO CON FOTO (v0.2.19): herramienta del VIEWER — desde aquí
      // se entra a su instancia (la física se detiene antes de entrar).
      const protoBtn = el("button", { class: "tool", title: tt("Prototipo con foto del lugar real", "Photo prototype of the real place") }, [
        "📸 Prototipo",
      ]);
      protoBtn.addEventListener("click", () => {
        if (this.editor.isSimulating()) this.editor.stopSimulation();
        opts.onPrototipo?.();
      });
      children.push(el("div", { class: "tool-group" }, [homeBtn, simBtn, protoBtn]));
    }

    // HERRAMIENTA DEL PUNTERO en simulación (v0.2.14): mano interactiva u
    // órbita pura (el arrastre solo mueve la cámara, sin tocar piezas).
    const bMano = el("button", { class: "tool active", title: tt("Mano interactiva: arrastra piezas móviles", "Interactive hand: drag mobile pieces") }, ["✋"]);
    const bOrbita = el("button", { class: "tool", title: tt("Órbita: el arrastre solo mueve la cámara", "Orbit: dragging only moves the camera") }, ["🌐"]);
    bMano.addEventListener("click", () => this.editor.setSimHerramienta("mano"));
    bOrbita.addEventListener("click", () => this.editor.setSimHerramienta("orbitar"));
    this.editor.bus.on("simToolChanged", ({ tool }) => {
      bMano.classList.toggle("active", tool === "mano");
      bOrbita.classList.toggle("active", tool === "orbitar");
    });

    // TENSIÓN de la mano (v0.2.14): la fuerza siempre alcanza, y aquí se
    // reporta cuánto costó el agarre actual, en kg y lb.
    const tension = el("span", { class: "sim-tension" }, [""]);
    const refrescarTension = () => {
      const kg = this.editor.tensionManoKg();
      if (kg === null || kg < 0.5) {
        tension.textContent = "";
        return;
      }
      tension.textContent = `✋ máx ${kg.toFixed(1)} kg · ${(kg * 2.20462).toFixed(1)} lb`;
    };
    let timerTension: ReturnType<typeof setInterval> | null = null;

    // DEMOSTRACIÓN DE MOVIMIENTO (v0.2.14): elige la articulación FOCAL de
    // la figura y flexiona/extiende con los cursores ▲/▼ (o las flechas del
    // teclado) dentro del rango humano; las articulaciones con candado
    // quedan fijas y el resto del cuerpo sigue la cadena.
    const NOMBRES: Record<string, [string, string]> = {
      spine: ["Columna", "Spine"],
      neck: ["Cuello", "Neck"],
      shoulderL: ["Hombro izq.", "Shoulder L"],
      shoulderR: ["Hombro der.", "Shoulder R"],
      elbowL: ["Codo izq.", "Elbow L"],
      elbowR: ["Codo der.", "Elbow R"],
      wristL: ["Muñeca izq.", "Wrist L"],
      wristR: ["Muñeca der.", "Wrist R"],
      hipL: ["Cadera izq.", "Hip L"],
      hipR: ["Cadera der.", "Hip R"],
      kneeL: ["Rodilla izq.", "Knee L"],
      kneeR: ["Rodilla der.", "Knee R"],
      ankleL: ["Tobillo izq.", "Ankle L"],
      ankleR: ["Tobillo der.", "Ankle R"],
    };
    const focal = el("select", { class: "tool tool-select sim-focal", title: tt("Articulación focal del movimiento", "Focal joint of the movement") }) as HTMLSelectElement;
    const grupoFigura = el("div", { class: "tool-group sim-figura" }, []);
    const angulo = el("span", { class: "sim-angulo" }, [""]);
    const bCandado = el("button", { class: "tool", title: tt("Fijar/liberar la articulación focal", "Lock/unlock the focal joint") }, ["🔓"]);
    const refrescarFocal = () => {
      const est = focal.value ? this.editor.estadoArticulacion(focal.value) : null;
      angulo.textContent = est ? `${est.grados}°` : "";
      bCandado.replaceChildren(est?.fijada ? "🔒" : "🔓");
      bCandado.classList.toggle("active", !!est?.fijada);
    };
    const poblarFocal = () => {
      focal.replaceChildren();
      const arts = this.editor.articulacionesFigura();
      for (const a of arts) {
        const par = NOMBRES[a];
        focal.append(el("option", { value: a }, [par ? tt(par[0], par[1]) : a]));
      }
      grupoFigura.classList.toggle("sim-oculto", arts.length === 0);
      refrescarFocal();
    };
    const mover = (dir: 1 | -1) => {
      if (focal.value) this.editor.moverArticulacionFocal(focal.value, dir);
      refrescarFocal();
    };
    const bFlex = el("button", { class: "tool", title: tt("Flexión / tracción (▲)", "Flexion / pull (▲)") }, ["▲"]);
    const bExt = el("button", { class: "tool", title: tt("Extensión / empuje (▼)", "Extension / push (▼)") }, ["▼"]);
    bFlex.addEventListener("click", () => mover(1));
    bExt.addEventListener("click", () => mover(-1));
    bCandado.addEventListener("click", () => {
      if (focal.value) this.editor.toggleCandadoArticulacion(focal.value);
      refrescarFocal();
    });
    focal.addEventListener("change", refrescarFocal);
    grupoFigura.append(focal, bFlex, bExt, bCandado, angulo);
    const teclas = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") { mover(1); e.preventDefault(); }
      else if (e.key === "ArrowDown") { mover(-1); e.preventDefault(); }
    };
    this.editor.bus.on("simulationChanged", ({ running }) => {
      if (running) {
        poblarFocal();
        refrescarTension();
        timerTension = setInterval(refrescarTension, 300);
        window.addEventListener("keydown", teclas);
      } else {
        if (timerTension) clearInterval(timerTension);
        timerTension = null;
        window.removeEventListener("keydown", teclas);
      }
    });

    children.push(
      el("div", { class: "tool-group" }, [bMano, bOrbita]),
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
      grupoFigura,
      el("div", { class: "sim-hint" }, [tension]),
      el("div", { class: "sim-hint" }, [
        "🖐 Arrastra una pieza móvil para moverla con la mano · ▲▼ flexionan la articulación focal del maniquí",
      ]),
    );

    this.root = el("div", { id: "simbar" }, children);
  }
}
