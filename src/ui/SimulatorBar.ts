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

    // MOVIMIENTO DEL MANIQUÍ (v0.2.49): las teclas 8 y 9 EMPUJAN y TRACCIONAN
    // las ZONAS del cuerpo que estén activas en la ventana del maniquí (🦴).
    // Cada zona mueve sus articulaciones con el signo que le toca por
    // anatomía —empujar es extender el codo mientras se flexiona el hombro—,
    // así que un solo botón produce el gesto completo.
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
      const zonas = this.editor.zonasDeMovimiento();
      resumen.textContent = zonas.size === 0
        ? tt("sin zona", "no zone")
        : [...zonas].map(([id, l]) => (l === "sim" ? id : `${id}·${l}`)).join(" + ");
      bArtic.classList.toggle("active", this.editor.panelArticulaciones?.visible() ?? false);
    };
    bArtic.addEventListener("click", () => {
      this.editor.panelArticulaciones?.alternar();
      refrescarFigura();
    });
    const mover = (dir: 1 | -1) => {
      this.editor.moverPrimitiva(dir);
      refrescarFigura();
    };
    const bFlex = el("button", { class: "tool", title: tt("EMPUJE: aleja la carga del cuerpo (tecla 8)", "PUSH: drives the load away from the body (key 8)") }, ["8 ▸"]);
    const bExt = el("button", { class: "tool", title: tt("TRACCIÓN: acerca la carga al cuerpo (tecla 9)", "PULL: draws the load toward the body (key 9)") }, ["9 ◂"]);
    bFlex.addEventListener("click", () => mover(1));
    bExt.addEventListener("click", () => mover(-1));
    const bPartida = el("button", { class: "tool", title: tt("Devuelve el maniquí a su postura de partida", "Return the mannequin to its starting pose") }, ["↺"]);
    bPartida.addEventListener("click", () => {
      this.editor.reiniciarPoseDePartida();
      refrescarFigura();
    });
    grupoFigura.append(bArtic, bFlex, bExt, bPartida, resumen);
    this.editor.bus.on("jointLocksChanged", refrescarFigura);
    this.editor.bus.on("humanFigureChanged", refrescarFigura);
    // TECLAS 8 y 9 (v0.2.45): los cursores ▲▼ los reclama el navegador para
    // recorrer los botones de la interfaz, así que pulsar "empujar" movía
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
          "🌐 órbita · ✋ manipulación: al elegirla, las piezas móviles se resaltan al pasar por encima · 🦴 maniquí · teclas 8/9 empujan y traccionan las zonas activas · ↺ vuelve a la postura de partida",
          "🌐 orbit · ✋ manipulation: pick it and mobile parts highlight on hover · 🦴 mannequin · keys 8/9 push and pull the active zones · ↺ returns to the starting pose",
        ),
      ]),
    );

    this.root = el("div", { id: "simbar" }, children);
  }
}
