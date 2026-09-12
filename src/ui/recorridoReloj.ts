import type { Editor } from "../core/Editor";
import type { Joint } from "../physics/joints";
import { tt } from "../core/i18n";
import { formatearAmplitud, formatearHora, horasDesdeTramo, parsearHora, tramoDesdeHoras } from "../core/reloj";
import { el } from "./dom";

/**
 * EL RECORRIDO DE UNA ARTICULACIÓN, EN HORAS (v0.3.48).
 *
 * El mando es el mismo en los tres sitios donde se pide un recorrido —el panel
 * de Propiedades, el de Articulaciones y el diálogo de instalar bisagra—, así
 * que vive una sola vez aquí.
 *
 * Pide DOS horas de la esfera del mundo, y el tramo va de la primera a la
 * segunda EN SENTIDO HORARIO.
 *
 * Dos horas no definen un tramo: definen DOS —el de ida y el de vuelta—, y cuál
 * de los dos es el bueno no se puede adivinar. Tomar siempre el más corto
 * prohibiría un brazo que barre tres cuartos de vuelta; tomar siempre el más
 * largo prohibiría el caso normal. Pero tampoco hace falta un mando aparte para
 * elegirlo, porque **el ORDEN de las dos horas ya lo dice**: de las 12 a las 3
 * es un cuarto de vuelta, y de las 3 a las 12 son los tres cuartos que faltan.
 * Lo elige el usuario, y lo elige escribiendo. El botón de al lado sólo
 * intercambia las dos, que es la manera rápida de pedir el arco de enfrente.
 *
 * Los grados no desaparecen: siguen abajo en gris, porque un plano de taller
 * los lleva y porque el número que guarda el proyecto es ese. Lo que cambia es
 * cuál de los dos se teclea.
 */
export function recorridoReloj(opts: {
  joint: Joint;
  editor: Editor;
  /** Se llama tras cada cambio, para repintar el arco del visor. */
  alCambiar: () => void;
  /** Acota a la escala de placa [0, 360]; los pivotes no la tienen. */
  acotarPlaca: boolean;
}): HTMLElement {
  const { joint: j, editor, alCambiar, acotarPlaca } = opts;

  const limOn = el("input", { type: "checkbox" }) as HTMLInputElement;
  limOn.checked = j.limitsEnabled;

  const campo = (): HTMLInputElement =>
    el("input", {
      type: "text",
      inputMode: "numeric",
      placeholder: "4:30",
      style: "text-align:center;",
      title: tt(
        "Posición en la esfera del reloj: 12 arriba, 3 a la derecha, 6 abajo. "
          + "Se escribe 4:30, 4h30 o 4.5 — la aguja de la HORA, o sea que 4:30 "
          + "cae a medio camino entre el 4 y el 5.",
        "Position on the clock face: 12 up, 3 right, 6 down. Write 4:30, 4h30 "
          + "or 4.5 — the HOUR hand, so 4:30 sits halfway between 4 and 5.",
      ),
    }) as HTMLInputElement;

  const desdeIn = campo();
  const hastaIn = campo();
  const invertir = el("button", {
    class: "tool",
    style: "white-space:nowrap;",
    title: tt(
      "Cambia las dos horas de sitio, o sea toma el ARCO DE ENFRENTE: si ahora "
        + "barre un cuarto de vuelta, pasa a barrer los tres cuartos que faltan.",
      "Swaps both hours, i.e. takes the OPPOSITE ARC: if it now sweeps a quarter "
        + "turn, it will sweep the other three quarters.",
    ),
  }, [tt("⇄ El arco de enfrente", "⇄ The opposite arc")]);
  const lectura = el("div", { class: "empty-hint", style: "padding:4px;" }, []);

  const reloj = editor.relojDeUnion(j);

  /** Repinta los tres mandos a partir de lo que la unión tiene puesto. */
  const leerDeLaUnion = (): void => {
    if (!reloj) return;
    const tramo = horasDesdeTramo(reloj, j.min, j.max);
    desdeIn.value = formatearHora(tramo.desde);
    hastaIn.value = formatearHora(tramo.hasta);
    pintar();
  };

  const pintar = (): void => {
    // ¿EL TRAMO CONTIENE LA POSE EN LA QUE ESTÁ LA PIEZA? Si no, la unión nace
    // peleada con sus propios topes: el motor la empuja al tope más cercano en
    // el primer fotograma y parece que la máquina se mueve sola. Escribir un
    // arco que deja fuera la pieza es fácil —son dos horas y hay dos arcos—, así
    // que se dice en vez de dejar que se note más tarde y peor.
    const enDiseno = j.apertura0 ?? 0;
    const fuera = j.limitsEnabled && (enDiseno < j.min - 0.5 || enDiseno > j.max + 0.5);
    const amplitud = Math.abs(j.max - j.min);
    lectura.textContent = tt(
      `Barre ${formatearAmplitud(amplitud)} (${amplitud.toFixed(1)}° de escala, de ${j.min.toFixed(1)} a ${j.max.toFixed(1)}).`,
      `Sweeps ${formatearAmplitud(amplitud)} (${amplitud.toFixed(1)}° of scale, from ${j.min.toFixed(1)} to ${j.max.toFixed(1)}).`,
    );
    if (fuera && reloj) {
      lectura.textContent += " " + tt(
        `⚠ La pieza está AHORA a las ${formatearHora(reloj.c0 + reloj.s * enDiseno)}, que queda `
          + "fuera de ese tramo: al arrancar saltará al tope más cercano. Prueba con el arco de enfrente.",
        `⚠ The part is NOW at ${formatearHora(reloj.c0 + reloj.s * enDiseno)}, outside that span: `
          + "it will jump to the nearest stop when the simulation starts. Try the opposite arc.",
      );
    }
  };

  /** Y al revés: de los tres mandos a los grados que guarda la unión. */
  const escribirEnLaUnion = (): void => {
    if (!reloj) return;
    const desde = parsearHora(desdeIn.value);
    const hasta = parsearHora(hastaIn.value);
    if (desde == null || hasta == null) {
      lectura.textContent = tt(
        "No se entiende esa hora. Se escribe 4:30, 4h30 o 4.5 (1 a 12).",
        "That hour makes no sense. Write 4:30, 4h30 or 4.5 (1 to 12).",
      );
      return;
    }
    const { min, max, recortado } = tramoDesdeHoras(reloj, desde, hasta, acotarPlaca);
    j.min = min;
    j.max = max;
    editor.jointUpdated();
    alCambiar();
    pintar();
    if (recortado) {
      lectura.textContent += " " + tt(
        "Ese tramo cruzaba las placas enfrentadas y se ha recortado ahí.",
        "That span crossed the closed leaves and was cut there.",
      );
    }
  };

  for (const inp of [desdeIn, hastaIn]) {
    inp.addEventListener("change", escribirEnLaUnion);
    inp.addEventListener("blur", escribirEnLaUnion);
  }
  invertir.addEventListener("click", () => {
    const a = desdeIn.value;
    desdeIn.value = hastaIn.value;
    hastaIn.value = a;
    escribirEnLaUnion();
  });
  limOn.addEventListener("change", () => {
    j.limitsEnabled = limOn.checked;
    editor.jointUpdated();
    alCambiar();
  });

  if (!reloj) {
    // SIN RELOJ NO SE INVENTA UNO. El eje vertical deja el plano de giro sobre
    // el suelo, y en el suelo no hay arriba: se pide en grados y se dice por
    // qué, en vez de enseñar unas horas que no significan nada.
    const grados = (v: number, set: (n: number) => void): HTMLInputElement => {
      const inp = el("input", {
        type: "number", step: "5", value: String(v),
      }) as HTMLInputElement;
      inp.addEventListener("input", () => {
        const n = parseFloat(inp.value);
        if (!Number.isFinite(n)) return;
        set(acotarPlaca ? Math.min(360, Math.max(0, n)) : n);
        editor.jointUpdated();
        alCambiar();
      });
      return inp;
    };
    return el("div", { class: "field" }, [
      el("label", {}, [tt("Recorrido", "Travel")]),
      el("label", { class: "rold-check" }, [limOn, tt("Limitar recorrido", "Limit travel")]),
      el("div", { class: "row" }, [
        el("div", { class: "sub" }, [el("label", {}, [tt("Mín", "Min")]), grados(j.min, (n) => (j.min = n))]),
        el("div", { class: "sub" }, [el("label", {}, [tt("Máx", "Max")]), grados(j.max, (n) => (j.max = n))]),
      ]),
      el("div", { class: "empty-hint", style: "padding:4px;" }, [
        tt(
          "Esta unión gira sobre un eje vertical, así que su plano de giro es el "
            + "suelo y ahí no hay 12 ni 6: el recorrido se pide en grados.",
          "This joint turns about a vertical axis, so its plane of rotation is the "
            + "floor and there is no 12 or 6 there: travel is set in degrees.",
        ),
      ]),
    ]);
  }

  leerDeLaUnion();
  return el("div", { class: "field" }, [
    el("label", {}, [tt("Recorrido · horas del reloj", "Travel · clock hours")]),
    el("label", { class: "rold-check" }, [limOn, tt("Limitar recorrido", "Limit travel")]),
    el("div", { class: "row" }, [
      el("div", { class: "sub" }, [el("label", {}, [tt("Desde", "From")]), desdeIn]),
      el("div", { class: "sub" }, [el("label", {}, [tt("↻ hasta", "↻ to")]), hastaIn]),
    ]),
    el("div", { class: "row" }, [invertir]),
    lectura,
    el("div", { class: "empty-hint", style: "padding:4px;" }, [
      tt(
        "Las 12 están SIEMPRE arriba y las 6 abajo, en toda la máquina. El tramo va "
          + "de la primera hora a la segunda POR LA DERECHA: 12→3 es un cuarto de "
          + "vuelta y 3→12 son los otros tres cuartos. El arco del visor lo enseña.",
        "12 is ALWAYS up and 6 down, across the whole machine. The span runs from the "
          + "first hour to the second CLOCKWISE: 12→3 is a quarter turn and 3→12 the "
          + "other three quarters. The arc in the viewport shows it.",
      ),
    ]),
  ]);
}
