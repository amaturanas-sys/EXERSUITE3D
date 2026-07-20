import type { WorkspaceData } from "../core/project";
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
      pasoTag.textContent = "Paso 1 · ¿Cómo quieres trabajar?";
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
      pasoTag.textContent = "Paso 2 · Espacio de trabajo";
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
      pasoTag.textContent = "Paso 3 · Dimensiones del espacio (cm)";
      clear(cuerpo);

      const num = (valor: number, min: number, max: number): HTMLInputElement => {
        const i = el("input", {
          type: "number",
          value: String(valor),
          min: String(min),
          max: String(max),
          step: "10",
        }) as HTMLInputElement;
        return i;
      };
      const fila = (texto: string, control: HTMLElement): HTMLElement =>
        el("label", { class: "wizard-fila" }, [el("span", {}, [texto]), control]);

      const ancho = num(600, 100, 10000);
      const fondo = num(400, 100, 10000);

      const conTecho = el("input", { type: "checkbox" }) as HTMLInputElement;
      conTecho.checked = true;
      const alturaA = num(280, 100, 2000);
      const alturaB = num(280, 100, 2000);
      const eje = el("select", {}, [
        el("option", { value: "x" }, ["a lo ancho (eje X)"]),
        el("option", { value: "z" }, ["a lo fondo (eje Z)"]),
      ]) as HTMLSelectElement;
      const techoCampos = el("div", { class: "wizard-sub" }, [
        fila("Altura extremo A", alturaA),
        fila("Altura extremo B", alturaB),
        fila("Pendiente", eje),
      ]);
      conTecho.addEventListener("change", () => {
        techoCampos.classList.toggle("wizard-off", !conTecho.checked);
      });

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

      const crear = el("button", { class: "tool wizard-crear" }, ["Crear proyecto"]);
      crear.addEventListener("click", () => {
        const v = (i: HTMLInputElement, def: number): number => {
          const n = Number(i.value);
          return Number.isFinite(n) && n > 0 ? n : def;
        };
        terminar({
          canvas: "completo",
          modo,
          ancho: v(ancho, 600),
          fondo: v(fondo, 400),
          techo: conTecho.checked
            ? {
                alturaA: v(alturaA, 280),
                alturaB: v(alturaB, 280),
                eje: eje.value === "z" ? "z" : "x",
              }
            : null,
          paredes: [...paredes].filter(([, cb]) => cb.checked).map(([l]) => l),
        });
      });

      cuerpo.append(
        el("div", { class: "wizard-form" }, [
          fila("Ancho del suelo (X)", ancho),
          fila("Fondo del suelo (Z)", fondo),
          el("div", { class: "wizard-grupo" }, [
            el("label", { class: "wizard-check wizard-check-titulo" }, [
              conTecho,
              "Techo (capa oscura anclable, copia del suelo)",
            ]),
            techoCampos,
          ]),
          el("div", { class: "wizard-grupo" }, [
            el("div", { class: "wizard-grupo-titulo" }, [
              "Paredes (superficies de anclaje)",
            ]),
            paredesRow,
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
