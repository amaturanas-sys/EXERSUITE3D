import type { PrimitiveParams } from "../objects/types";
import { BEAM_NOMINALS_MM, TUBE_NOMINALS_MM } from "../objects/linePieces";
import { el } from "./dom";

// Diálogos de configuración de las herramientas de línea: pilar/travesaño
// (perfil 1:1/1:2/1:3, medida nominal, extremos, pinholes) y tubo (diámetro
// nominal). Devuelven la plantilla de parámetros o null si se cancela.

function dialog(
  title: string,
  fields: HTMLElement[],
  onAccept: () => PrimitiveParams,
): Promise<PrimitiveParams | null> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (value: PrimitiveParams | null) => {
      if (done) return;
      done = true;
      overlay.remove();
      resolve(value);
    };
    const ok = el("button", { class: "land-btn primary" }, ["Colocar"]);
    ok.addEventListener("click", () => finish(onAccept()));
    const cancel = el("button", { class: "land-btn ghost" }, ["Cancelar"]);
    cancel.addEventListener("click", () => finish(null));

    const box = el("div", { class: "confirm-dialog" }, [
      el("div", { class: "confirm-title" }, [title]),
      ...fields,
      el("div", { class: "confirm-actions" }, [ok, cancel]),
    ]);
    const overlay = el("div", { class: "confirm-overlay" }, [box]);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) finish(null);
    });
    document.getElementById("app")?.append(overlay);
  });
}

function selectField(
  label: string,
  options: { value: string; label: string }[],
  selected?: string,
): { row: HTMLElement; select: HTMLSelectElement } {
  const select = el("select", { class: "select" }) as HTMLSelectElement;
  for (const o of options) {
    const opt = el("option", { value: o.value }, [o.label]);
    if (o.value === selected) opt.selected = true;
    select.append(opt);
  }
  const row = el("div", { class: "field" }, [el("label", {}, [label]), select]);
  return { row, select };
}

/** Configura un pilar/travesaño de perfil de acero. */
export function configureBeam(): Promise<PrimitiveParams | null> {
  const ratio = selectField(
    "Perfil (proporción)",
    [
      { value: "1", label: "1:1 (cuadrado)" },
      { value: "2", label: "1:2 (rectangular)" },
      { value: "3", label: "1:3 (rectangular)" },
    ],
    "1",
  );
  const nominal = selectField(
    "Medida nominal (mm)",
    BEAM_NOMINALS_MM.map((n) => ({ value: String(n), label: `${n} mm` })),
    "50",
  );
  const ends = selectField(
    "Extremos",
    [
      { value: "plano", label: "Corte plano" },
      { value: "diagonal", label: "Corte diagonal (inglete 45°)" },
    ],
    "plano",
  );

  const holesOn = el("input", { type: "checkbox" }) as HTMLInputElement;
  const holeDia = el("input", { type: "number", value: "16", step: "1", min: "4" }) as HTMLInputElement;
  const holeSep = el("input", { type: "number", value: "5", step: "0.5", min: "1" }) as HTMLInputElement;
  holeDia.disabled = holeSep.disabled = true;
  holesOn.addEventListener("change", () => {
    holeDia.disabled = holeSep.disabled = !holesOn.checked;
  });
  const holesRow = el("div", { class: "field" }, [
    el("label", { style: "display:flex;gap:6px;align-items:center;" }, [
      holesOn,
      "Agujeros (pinholes)",
    ]),
    el("div", { class: "row" }, [
      el("div", { class: "sub" }, [el("label", {}, ["Diámetro (mm)"]), holeDia]),
      el("div", { class: "sub" }, [el("label", {}, ["Distancia (cm)"]), holeSep]),
    ]),
  ]);

  return dialog(
    "Nuevo pilar / travesaño",
    [ratio.row, nominal.row, ends.row, holesRow],
    () => {
      const baseCm = parseFloat(nominal.select.value) / 10;
      const r = parseInt(ratio.select.value, 10);
      return {
        kind: "beam",
        depth: baseCm,
        width: baseCm * r,
        ends: ends.select.value as "plano" | "diagonal",
        holeDiameter: holesOn.checked ? (parseFloat(holeDia.value) || 16) / 10 : 0,
        holeSpacing: parseFloat(holeSep.value) || 5,
      };
    },
  );
}

/**
 * Configura una PLACA DENTADA antes de trazarla: el intervalo entre ganchos.
 *
 * Es lo único que se pregunta, porque es lo único que no se puede deducir. El
 * ancho lo copia la placa de la cara del pilar y el largo sale de los dos
 * puntos que se tracen; el intervalo, en cambio, es una decisión de diseño —
 * a cuántas alturas distintas se quiere poder dejar la barra.
 *
 * El mínimo se enseña y se hace cumplir. Por debajo de él la barra deja de
 * entrar en los ganchos de en medio, y eso NO SE VE: la placa sale con todos
 * sus dientes dibujados y la barra se queda posada encima.
 */
export function configurarDentada(minimoCm: number): Promise<PrimitiveParams | null> {
  const sugerido = Math.max(minimoCm, 12.5);
  const paso = el("input", {
    type: "number",
    value: String(Math.round(sugerido * 10) / 10),
    step: "0.5",
    min: String(Math.round(minimoCm * 10) / 10),
  }) as HTMLInputElement;
  const aviso = el("p", { class: "hint" }, []);
  const revisar = () => {
    const v = parseFloat(paso.value);
    aviso.textContent =
      Number.isFinite(v) && v < minimoCm
        ? `Mínimo ${Math.round(minimoCm * 10) / 10} cm: por debajo, la barra no entra en los ganchos de en medio.`
        : "Cada cuánto se repite el gancho a lo largo de la placa. Son las alturas a las que se podrá dejar la barra.";
  };
  paso.addEventListener("input", revisar);
  revisar();

  const fila = el("div", { class: "field" }, [
    el("label", {}, ["Intervalo entre ganchos (cm)"]),
    paso,
    aviso,
  ]);

  return dialog("Nueva placa dentada", [fila], () => ({
    kind: "dentada",
    dienteEspaciado: Math.max(minimoCm, parseFloat(paso.value) || sugerido),
  }));
}

/** Configura un tubo de acero. */
export function configureTube(): Promise<PrimitiveParams | null> {
  const nominal = selectField(
    "Diámetro nominal (mm)",
    TUBE_NOMINALS_MM.map((n) => ({ value: String(n), label: `⌀ ${n} mm` })),
    "48",
  );
  return dialog("Nuevo tubo de acero", [nominal.row], () => ({
    kind: "tube",
    radius: parseFloat(nominal.select.value) / 20, // mm de diámetro -> cm de radio
  }));
}
