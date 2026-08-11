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
    // La MANO se elige A PROPÓSITO: al arrancar manda la órbita, así mirar la
    // máquina no la manosea sin querer.
    const inicial = this.editor.getSimHerramienta();
    const bMano = el("button", {
      class: inicial === "mano" ? "tool active" : "tool",
      title: tt("Manipulación: arrastra las piezas móviles (se resaltan al pasar por encima)", "Manipulation: drag the mobile pieces (they highlight on hover)"),
    }, ["✋"]);
    const bOrbita = el("button", {
      class: inicial === "orbitar" ? "tool active" : "tool",
      title: tt("Órbita: el arrastre solo mueve la cámara", "Orbit: dragging only moves the camera"),
    }, ["🌐"]);
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

    // MOVIMIENTO DEL MANIQUÍ (v0.2.45): las teclas 8 y 9 flexionan y extienden
    // A LA VEZ todas las articulaciones LIBRES; qué está libre se decide en la
    // ventana de Articulaciones (🦴). La figura nace con todo bloqueado, así
    // que el movimiento es exactamente el que se pidió y nada más.
    // COLOCAR MANIQUÍ (v0.2.41): disponible siempre —haya figura o no— y
    // también con la simulación corriendo, en Builder y en Viewer.
    const bColocar = el("button", {
      class: "tool",
      title: tt("Colocar maniquí: toca el suelo o un apoyo (asiento, respaldo, banco)", "Place mannequin: tap the floor or a support (seat, backrest, bench)"),
    }, ["🧍"]);
    bColocar.addEventListener("click", () => {
      if (this.editor.isColocarFigura()) this.editor.cancelColocarFigura();
      else this.editor.beginColocarFigura();
    });
    this.editor.bus.on("colocarFiguraChanged", ({ active }) =>
      bColocar.classList.toggle("active", active),
    );

    const grupoFigura = el("div", { class: "tool-group sim-figura" }, []);
    const resumen = el("span", { class: "sim-angulo" }, [""]);
    const bArtic = el("button", {
      class: "tool",
      title: tt("Articulaciones: elige cuáles se mueven (izquierda, derecha o simétricas)", "Joints: pick which ones move (left, right or symmetric)"),
    }, ["🦴"]);
    const refrescarFigura = () => {
      const arts = this.editor.articulacionesFigura();
      grupoFigura.classList.toggle("sim-oculto", arts.length === 0);
      const libres = this.editor.articulacionesLibres().length;
      resumen.textContent = tt(`${libres} libres`, `${libres} free`);
      bArtic.classList.toggle("active", this.editor.panelArticulaciones?.visible() ?? false);
    };
    bArtic.addEventListener("click", () => {
      this.editor.panelArticulaciones?.alternar();
      refrescarFigura();
    });
    const mover = (dir: 1 | -1) => {
      this.editor.moverArticulacionesLibres(dir);
      refrescarFigura();
    };
    const bFlex = el("button", { class: "tool", title: tt("Flexión de todo lo liberado (tecla 8)", "Flexion of everything released (key 8)") }, ["8 ▲"]);
    const bExt = el("button", { class: "tool", title: tt("Extensión de todo lo liberado (tecla 9)", "Extension of everything released (key 9)") }, ["9 ▼"]);
    bFlex.addEventListener("click", () => mover(1));
    bExt.addEventListener("click", () => mover(-1));
    grupoFigura.append(bArtic, bFlex, bExt, resumen);
    this.editor.bus.on("jointLocksChanged", refrescarFigura);
    this.editor.bus.on("humanFigureChanged", refrescarFigura);
    // TECLAS 8 y 9 (v0.2.45): los cursores ▲▼ los reclama el navegador para
    // recorrer los botones de la interfaz, así que pulsar "flexionar" movía
    // el foco en vez del maniquí. Los números no compiten con nada.
    const teclas = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (e.key === "8") { mover(1); e.preventDefault(); }
      else if (e.key === "9") { mover(-1); e.preventDefault(); }
    };

    this.editor.bus.on("simulationChanged", ({ running }) => {
      if (running) {
        refrescarFigura();
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
      el("div", { class: "tool-group" }, [bMano, bOrbita, bColocar]),
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
        tt(
          "🌐 órbita · ✋ manipulación: al elegirla, las piezas móviles se resaltan al pasar por encima · 🦴 maniquí · teclas 8/9 flexionan y extienden lo liberado",
          "🌐 orbit · ✋ manipulation: pick it and mobile parts highlight on hover · 🦴 mannequin · keys 8/9 flex and extend what is released",
        ),
      ]),
    );

    this.root = el("div", { id: "simbar" }, children);
  }
}
