import type { WorkspaceData } from "../core/project";
import { tt } from "../core/i18n";
import { clear, el } from "./dom";

/**
 * Asistente de "Nuevo proyecto" (v0.2.0). Pasos: modo de trabajo (Sencillo/
 * Profesional), tipo de canvas (Libre/Completo) y, para el canvas completo,
 * dimensiones del área de suelo con techo (altura y pendiente propias) y
 * paredes de anclaje opcionales. Devuelve la configuración o null si cancela.
 */
export function elegirWorkspace(): Promise<WorkspaceData | null> {
  return new Promise((resolve) => {
    let modo: WorkspaceData["modo"] = "profesional";

    const cuerpo = el("div", { class: "wizard-cuerpo" });
    const pasoTag = el("div", { class: "wizard-paso" }, [""]);

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") terminar(null);
    };
    const terminar = (ws: WorkspaceData | null): void => {
      window.removeEventListener("keydown", onKey);
      overlay.remove();
      resolve(ws);
    };
    window.addEventListener("keydown", onKey);

    const carta = (
      icono: string,
      nombre: string,
      detalle: string,
      onPick: () => void,
    ): HTMLElement => {
      const c = el("button", { class: "wizard-carta" }, [
        el("div", { class: "wizard-icono" }, [icono]),
        el("div", { class: "wizard-nombre" }, [nombre]),
        el("div", { class: "wizard-detalle" }, [detalle]),
      ]);
      c.addEventListener("click", onPick);
      return c;
    };

    const botonAtras = (onBack: () => void): HTMLElement => {
      const b = el("button", { class: "tool wizard-atras" }, ["← Atrás"]);
      b.addEventListener("click", onBack);
      return b;
    };

    const paso1 = (): void => {
      pasoTag.textContent = tt("Paso 1 · ¿Cómo quieres trabajar?", "Step 1 · How do you want to work?");
      clear(cuerpo);
      cuerpo.append(
        el("div", { class: "wizard-cartas" }, [
          carta(
            "🧰",
            "Sencillo",
            "Herramientas básicas y máquinas estándar: ideal para plantear la distribución de una sala de gimnasio.",
            () => {
              modo = "sencillo";
              paso2();
            },
          ),
          carta(
            "⚙️",
            "Profesional",
            "Todas las herramientas de diseño, física, conexiones y cables para prototipar máquinas al detalle.",
            () => {
              modo = "profesional";
              paso2();
            },
          ),
        ]),
      );
    };

    const paso2 = (): void => {
      pasoTag.textContent = tt("Paso 2 · Espacio de trabajo", "Step 2 · Workspace");
      clear(cuerpo);
      cuerpo.append(
        el("div", { class: "wizard-cartas" }, [
          carta(
            "🌐",
            "Canvas libre",
            "Suelo infinito sin límites: diseña sin restricciones de espacio.",
            () => terminar({ canvas: "libre", modo }),
          ),
          carta(
            "📐",
            "Canvas completo",
            "Área de suelo con medidas reales, techo con altura y pendiente propias y paredes de anclaje opcionales. Lo que sobresalga del espacio se marca en rojo.",
            paso3,
          ),
        ]),
        botonAtras(paso1),
      );
    };

    const paso3 = (): void => {
      pasoTag.textContent = tt("Paso 3 · Definir área de trabajo (metros)", "Step 3 · Define the work area (meters)");
      clear(cuerpo);

      const num = (valor: number, min: number, max: number): HTMLInputElement =>
        el("input", {
          type: "number",
          value: String(valor),
          min: String(min),
          max: String(max),
          step: "0.1",
        }) as HTMLInputElement;
      const fila = (texto: string, control: HTMLElement): HTMLElement =>
        el("label", { class: "wizard-fila" }, [el("span", {}, [texto]), control]);
      const v = (i: HTMLInputElement, def: number): number => {
        const n = Number(i.value);
        return Number.isFinite(n) && n > 0 ? n : def;
      };

      // ---- Superficie o suelo: rectángulo con medidas o planta dibujada.
      let modoPlanta: "rect" | "dibujo" = "rect";
      const ancho = num(6, 1, 100);
      const fondo = num(4, 1, 100);

      // Lienzo de planta: toca para añadir vértices (imán a 0,5 m); cierra
      // tocando el primer punto. Norte (+Z) hacia arriba.
      const ESCALA = 20; // px por metro
      const CW = 520;
      const CH = 300;
      const lienzo = el("canvas", { class: "wizard-lienzo" }) as HTMLCanvasElement;
      lienzo.width = CW;
      lienzo.height = CH;
      let puntos: [number, number][] = []; // metros (x, z)
      let cerrada = false;

      const aWorld = (ev: PointerEvent): [number, number] => {
        const r = lienzo.getBoundingClientRect();
        const px = ((ev.clientX - r.left) / r.width) * CW;
        const py = ((ev.clientY - r.top) / r.height) * CH;
        const x = Math.round(((px - CW / 2) / ESCALA) * 2) / 2;
        const z = Math.round(((CH / 2 - py) / ESCALA) * 2) / 2;
        return [x, z];
      };
      const aPx = ([x, z]: [number, number]): [number, number] => [
        CW / 2 + x * ESCALA,
        CH / 2 - z * ESCALA,
      ];

      const dibujar = (): void => {
        const ctx = lienzo.getContext("2d")!;
        ctx.clearRect(0, 0, CW, CH);
        ctx.fillStyle = "#14161b";
        ctx.fillRect(0, 0, CW, CH);
        // Rejilla: 0,5 m fina, 1 m marcada.
        for (let m = -Math.ceil(CW / ESCALA / 2) * 2; m <= CW / ESCALA; m += 0.5) {
          const [gx] = aPx([m, 0]);
          if (gx < 0 || gx > CW) continue;
          ctx.strokeStyle = m % 1 === 0 ? "#2a2e38" : "#20232b";
          ctx.beginPath();
          ctx.moveTo(gx, 0);
          ctx.lineTo(gx, CH);
          ctx.stroke();
        }
        for (let m = -Math.ceil(CH / ESCALA / 2) * 2; m <= CH / ESCALA; m += 0.5) {
          const [, gy] = aPx([0, m]);
          if (gy < 0 || gy > CH) continue;
          ctx.strokeStyle = m % 1 === 0 ? "#2a2e38" : "#20232b";
          ctx.beginPath();
          ctx.moveTo(0, gy);
          ctx.lineTo(CW, gy);
          ctx.stroke();
        }
        ctx.fillStyle = "#9aa1ad";
        ctx.font = "11px sans-serif";
        ctx.fillText(tt("N ↑ (+Z) · 1 celda grande = 1 m", "N ↑ (+Z) · 1 big cell = 1 m"), 8, 14);

        if (puntos.length > 0) {
          // Relleno si está cerrada.
          if (cerrada && puntos.length >= 3) {
            ctx.beginPath();
            const [x0, y0] = aPx(puntos[0]);
            ctx.moveTo(x0, y0);
            for (const p of puntos.slice(1)) {
              const [px, py] = aPx(p);
              ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fillStyle = "rgba(18, 128, 140, 0.25)";
            ctx.fill();
          }
          // Bordes + cotas por segmento.
          ctx.strokeStyle = "#12808c";
          ctx.lineWidth = 2;
          ctx.beginPath();
          const [x0, y0] = aPx(puntos[0]);
          ctx.moveTo(x0, y0);
          for (const p of puntos.slice(1)) {
            const [px, py] = aPx(p);
            ctx.lineTo(px, py);
          }
          if (cerrada) ctx.closePath();
          ctx.stroke();
          ctx.lineWidth = 1;
          const tramos = cerrada ? puntos.length : puntos.length - 1;
          ctx.fillStyle = "#e6e8ec";
          for (let i = 0; i < tramos; i++) {
            const a = puntos[i];
            const b = puntos[(i + 1) % puntos.length];
            const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
            const [mx, my] = aPx([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
            ctx.fillText(`${len.toFixed(1)} m`, mx + 4, my - 4);
          }
          // Vértices (el primero destacado: tócalo para cerrar).
          puntos.forEach((p, i) => {
            const [px, py] = aPx(p);
            ctx.beginPath();
            ctx.arc(px, py, i === 0 ? 5 : 3.5, 0, Math.PI * 2);
            ctx.fillStyle = i === 0 ? "#f2c200" : "#e6e8ec";
            ctx.fill();
          });
        }
      };

      lienzo.addEventListener("pointerdown", (ev) => {
        if (cerrada) return;
        const p = aWorld(ev);
        // Cerca del primer vértice y con 3+ puntos: cierra la planta.
        if (puntos.length >= 3) {
          const d0 = Math.hypot(p[0] - puntos[0][0], p[1] - puntos[0][1]);
          if (d0 <= 0.5) {
            cerrada = true;
            dibujar();
            actualizarPendiente();
            return;
          }
        }
        puntos.push(p);
        dibujar();
        actualizarPendiente();
      });

      const deshacerBtn = el("button", { class: "tool" }, ["↶ Deshacer punto"]);
      deshacerBtn.addEventListener("click", () => {
        if (cerrada) cerrada = false;
        else puntos.pop();
        dibujar();
        actualizarPendiente();
      });
      const limpiarBtn = el("button", { class: "tool" }, ["✕ Limpiar"]);
      limpiarBtn.addEventListener("click", () => {
        puntos = [];
        cerrada = false;
        dibujar();
        actualizarPendiente();
      });
      const cerrarPlantaBtn = el("button", { class: "tool" }, ["◼ Cerrar planta"]);
      cerrarPlantaBtn.addEventListener("click", () => {
        if (puntos.length >= 3) {
          cerrada = true;
          dibujar();
          actualizarPendiente();
        }
      });

      const zonaRect = el("div", { class: "wizard-sub" }, [
        fila("Ancho del suelo · X (m)", ancho),
        fila("Fondo del suelo · Z (m)", fondo),
      ]);
      const zonaDibujo = el("div", { class: "wizard-sub wizard-dibujo" }, [
        el("div", { class: "wizard-nota" }, [
          "Toca para añadir vértices (imán a 0,5 m); cierra tocando el punto amarillo.",
        ]),
        lienzo,
        el("div", { class: "wizard-acciones-lienzo" }, [deshacerBtn, cerrarPlantaBtn, limpiarBtn]),
      ]);
      zonaDibujo.style.display = "none";

      const tabRect = el("button", { class: "tool wizard-tab active" }, ["Rectángulo"]);
      const tabDibujo = el("button", { class: "tool wizard-tab" }, ["✏️ Dibujar planta"]);
      const setTab = (m: "rect" | "dibujo"): void => {
        modoPlanta = m;
        tabRect.classList.toggle("active", m === "rect");
        tabDibujo.classList.toggle("active", m === "dibujo");
        zonaRect.style.display = m === "rect" ? "" : "none";
        zonaDibujo.style.display = m === "dibujo" ? "" : "none";
        if (m === "dibujo") dibujar();
        actualizarPendiente();
      };
      tabRect.addEventListener("click", () => setTab("rect"));
      tabDibujo.addEventListener("click", () => setTab("dibujo"));

      // ---- Techumbre sí/no con parámetros Height A / Height B / slope.
      const conTecho = el("input", { type: "checkbox" }) as HTMLInputElement;
      conTecho.checked = true;
      const alturaA = num(2.8, 1, 20);
      const alturaB = num(2.8, 1, 20);
      const eje = el("select", {}, [
        el("option", { value: "x" }, ["a lo ancho (eje X)"]),
        el("option", { value: "z" }, ["a lo fondo (eje Z)"]),
      ]) as HTMLSelectElement;
      const pendienteInfo = el("div", { class: "wizard-nota" }, [""]);

      /** Largo (m) del suelo a lo largo del eje de la pendiente. */
      const largoEje = (): number => {
        if (modoPlanta === "dibujo" && puntos.length >= 2) {
          const xs = puntos.map((p) => p[0]);
          const zs = puntos.map((p) => p[1]);
          return eje.value === "z"
            ? Math.max(...zs) - Math.min(...zs)
            : Math.max(...xs) - Math.min(...xs);
        }
        return eje.value === "z" ? v(fondo, 4) : v(ancho, 6);
      };
      const actualizarPendiente = (): void => {
        const dh = v(alturaB, 2.8) - v(alturaA, 2.8);
        const L = Math.max(0.1, largoEje());
        const grados = (Math.atan2(dh, L) * 180) / Math.PI;
        pendienteInfo.textContent = `Slope: ${grados.toFixed(1)}° (${((dh / L) * 100).toFixed(1)} %) ${tt("de A a B", "from A to B")}`;
      };
      for (const c of [alturaA, alturaB, ancho, fondo]) {
        c.addEventListener("input", actualizarPendiente);
      }
      eje.addEventListener("change", actualizarPendiente);
      actualizarPendiente();

      const techoCampos = el("div", { class: "wizard-sub" }, [
        fila("Height A · altura extremo A (m)", alturaA),
        fila("Height B · altura extremo B (m)", alturaB),
        fila("Pendiente", eje),
        pendienteInfo,
      ]);
      conTecho.addEventListener("change", () => {
        techoCampos.classList.toggle("wizard-off", !conTecho.checked);
      });

      // ---- Paredes de anclaje.
      const paredes = new Map<"N" | "S" | "E" | "O", HTMLInputElement>();
      const nombres: Record<"N" | "S" | "E" | "O", string> = {
        N: "Norte (+Z)",
        S: "Sur (−Z)",
        E: "Este (+X)",
        O: "Oeste (−X)",
      };
      const paredesRow = el("div", { class: "wizard-paredes" });
      for (const lado of ["N", "S", "E", "O"] as const) {
        const cb = el("input", { type: "checkbox" }) as HTMLInputElement;
        paredes.set(lado, cb);
        paredesRow.append(el("label", { class: "wizard-check" }, [cb, nombres[lado]]));
      }
      // Sin techumbre, las paredes quedan circunscritas a esta altura; con
      // techumbre suben exactamente hasta el techo (con su inclinación).
      const alturaParedes = num(2.5, 1, 20);
      const filaAlturaParedes = fila("Altura de las paredes (m, sin techumbre)", alturaParedes);
      const refrescarAlturaParedes = (): void => {
        filaAlturaParedes.style.display = conTecho.checked ? "none" : "";
      };
      conTecho.addEventListener("change", refrescarAlturaParedes);
      refrescarAlturaParedes();

      const crear = el("button", { class: "tool wizard-crear" }, ["Crear proyecto"]);
      crear.addEventListener("click", () => {
        let planta: [number, number][] | undefined;
        if (modoPlanta === "dibujo") {
          if (puntos.length < 3) {
            window.alert(tt("Dibuja la planta del suelo (al menos 3 vértices) o usa el rectángulo.", "Draw the floor plan (at least 3 vertices) or use the rectangle."));
            return;
          }
          planta = puntos.map(([x, z]) => [x * 100, z * 100]); // m → cm
        }
        terminar({
          canvas: "completo",
          modo,
          ancho: Math.round(v(ancho, 6) * 100),
          fondo: Math.round(v(fondo, 4) * 100),
          planta,
          techo: conTecho.checked
            ? {
                alturaA: Math.round(v(alturaA, 2.8) * 100),
                alturaB: Math.round(v(alturaB, 2.8) * 100),
                eje: eje.value === "z" ? "z" : "x",
              }
            : null,
          paredes: [...paredes].filter(([, cb]) => cb.checked).map(([l]) => l),
          alturaParedes: Math.round(v(alturaParedes, 2.5) * 100),
        });
      });

      cuerpo.append(
        el("div", { class: "wizard-form" }, [
          el("div", { class: "wizard-grupo" }, [
            el("div", { class: "wizard-grupo-titulo" }, ["Superficie o suelo"]),
            el("div", { class: "wizard-tabs" }, [tabRect, tabDibujo]),
            zonaRect,
            zonaDibujo,
          ]),
          el("div", { class: "wizard-grupo" }, [
            el("label", { class: "wizard-check wizard-check-titulo" }, [
              conTecho,
              "Techumbre (capa oscura anclable, copia fiel del suelo)",
            ]),
            techoCampos,
          ]),
          el("div", { class: "wizard-grupo" }, [
            el("div", { class: "wizard-grupo-titulo" }, ["Paredes (superficies de anclaje)"]),
            paredesRow,
            filaAlturaParedes,
          ]),
        ]),
        el("div", { class: "wizard-acciones" }, [botonAtras(paso2), crear]),
      );
    };

    const cerrarBtn = el("button", { class: "tool" }, ["✕"]);
    cerrarBtn.addEventListener("click", () => terminar(null));
    const panel = el("div", { class: "perf-panel wizard-panel" }, [
      el("div", { class: "lib-header" }, [
        el("div", { class: "lib-title" }, ["🆕 Nuevo proyecto"]),
        cerrarBtn,
      ]),
      pasoTag,
      cuerpo,
    ]);
    const overlay = el("div", { class: "lib-overlay wizard-overlay" }, [panel]);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) terminar(null);
    });
    document.body.append(overlay);
    paso1();
  });
}
