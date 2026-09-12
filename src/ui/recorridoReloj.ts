import { tt } from "../core/i18n";
import {
  formatearAmplitud,
  formatearHora,
  horasDesdeTramo,
  parsearHora,
  type Recta,
  tramoDesdeHoras,
  vuelta,
} from "../core/reloj";
import { el } from "./dom";

/**
 * EL RECORRIDO DE UNA ARTICULACIÓN, EN HORAS (v0.3.48).
 *
 * El mando es el mismo en los cuatro sitios donde se pide un recorrido —el
 * panel de Propiedades, el de Articulaciones, el diálogo de instalar bisagra y
 * el pasador—, así que vive una sola vez aquí.
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
 *
 * NO SABE DE UNIONES (v0.3.49). Una bisagra guarda su rango en el `Joint`; el
 * PASADOR lo guarda en los params de la pieza y lo reparte entre las varias
 * uniones que monta. El mando no tiene por qué enterarse de eso: pide una recta
 * —de la escala a la esfera— y dos funciones para leer y escribir, y quien lo
 * usa pone lo que corresponda.
 */
export interface ModeloRecorrido {
  /** De la escala interna a la esfera. null = esta unión no tiene horas. */
  recta: Recta | null;
  leer: () => { min: number; max: number; limitado: boolean };
  escribir: (v: { min: number; max: number; limitado: boolean }) => void;
  /**
   * Dónde están, EN LA ESCALA, las piezas que giran. Sirve para avisar cuando
   * el tramo pedido las deja fuera; puede haber varias (un pasador con dos
   * brazos) o ninguna.
   */
  posesDeDiseno: number[];
  /** Acota a [0, 360]: la escala de placa de una bisagra no da la vuelta. */
  acotarPlaca: boolean;
  /** Se llama tras cada cambio, para repintar el arco del visor. */
  alCambiar: () => void;
  titulo?: string;
}

export function recorridoReloj(m: ModeloRecorrido): HTMLElement {
  const { recta, leer, escribir, posesDeDiseno, acotarPlaca, alCambiar } = m;

  const limOn = el("input", { type: "checkbox" }) as HTMLInputElement;
  limOn.checked = leer().limitado;

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

  const pintar = (): void => {
    const { min, max, limitado } = leer();
    const amplitud = Math.abs(max - min);
    lectura.textContent = tt(
      `Barre ${formatearAmplitud(amplitud)} (${amplitud.toFixed(1)}° de escala, de ${min.toFixed(1)} a ${max.toFixed(1)}).`,
      `Sweeps ${formatearAmplitud(amplitud)} (${amplitud.toFixed(1)}° of scale, from ${min.toFixed(1)} to ${max.toFixed(1)}).`,
    );
    // ¿EL TRAMO CONTIENE LA POSE EN LA QUE ESTÁ LA PIEZA? Si no, la unión nace
    // peleada con sus propios topes: el motor la empuja al tope más cercano en
    // el primer fotograma y parece que la máquina se mueve sola. Escribir un
    // arco que deja fuera la pieza es fácil —son dos horas y hay dos arcos—, así
    // que se dice en vez de dejar que se note más tarde y peor.
    if (!limitado || !recta) return;
    // SE COMPARA DANDO LA VUELTA. Un pasador puede tener el tramo en [−90, 90]
    // y un brazo anotado en 270, que es el MISMO sitio que −90: restar a pelo
    // lo daba por fuera y saltaba un aviso falso.
    const ancho = vuelta(max - min);
    const fuera = posesDeDiseno.filter((p) => vuelta(p - min) > ancho + 0.5);
    if (fuera.length === 0) return;
    const donde = fuera.map((p) => formatearHora(recta.c0 + recta.s * p)).join(", ");
    lectura.textContent += " " + tt(
      `⚠ Hay ${fuera.length === 1 ? "una pieza" : `${fuera.length} piezas`} AHORA a las ${donde}, `
        + "fuera de ese tramo: al arrancar saltará al tope más cercano. "
        + "Prueba con el arco de enfrente.",
      `⚠ ${fuera.length === 1 ? "A part is" : `${fuera.length} parts are`} NOW at ${donde}, `
        + "outside that span: it will jump to the nearest stop when the simulation "
        + "starts. Try the opposite arc.",
    );
  };

  /** Repinta los mandos a partir de lo que hay guardado. */
  const leerDelModelo = (): void => {
    if (!recta) return;
    const { min, max } = leer();
    const tramo = horasDesdeTramo(recta, min, max);
    desdeIn.value = formatearHora(tramo.desde);
    hastaIn.value = formatearHora(tramo.hasta);
    pintar();
  };

  /** Y al revés: de las dos horas a los grados que se guardan. */
  const escribirEnElModelo = (): void => {
    if (!recta) return;
    const desde = parsearHora(desdeIn.value);
    const hasta = parsearHora(hastaIn.value);
    if (desde == null || hasta == null) {
      lectura.textContent = tt(
        "No se entiende esa hora. Se escribe 4:30, 4h30 o 4.5 (1 a 12).",
        "That hour makes no sense. Write 4:30, 4h30 or 4.5 (1 to 12).",
      );
      return;
    }
    const { min, max, recortado } = tramoDesdeHoras(recta, desde, hasta, acotarPlaca);
    escribir({ min, max, limitado: limOn.checked });
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
    inp.addEventListener("change", escribirEnElModelo);
    inp.addEventListener("blur", escribirEnElModelo);
  }
  invertir.addEventListener("click", () => {
    const a = desdeIn.value;
    desdeIn.value = hastaIn.value;
    hastaIn.value = a;
    escribirEnElModelo();
  });
  limOn.addEventListener("change", () => {
    const { min, max } = leer();
    escribir({ min, max, limitado: limOn.checked });
    alCambiar();
    pintar();
  });

  if (!recta) {
    // SIN RELOJ NO SE INVENTA UNO. El eje vertical deja el plano de giro sobre
    // el suelo, y en el suelo no hay arriba: se pide en grados y se dice por
    // qué, en vez de enseñar unas horas que no significan nada.
    const grados = (cual: "min" | "max"): HTMLInputElement => {
      const inp = el("input", {
        type: "number", step: "5", value: String(leer()[cual]),
      }) as HTMLInputElement;
      inp.addEventListener("input", () => {
        const n = parseFloat(inp.value);
        if (!Number.isFinite(n)) return;
        const v = leer();
        v[cual] = acotarPlaca ? Math.min(360, Math.max(0, n)) : n;
        escribir({ ...v, limitado: limOn.checked });
        alCambiar();
      });
      return inp;
    };
    return el("div", { class: "field" }, [
      el("label", {}, [m.titulo ?? tt("Recorrido", "Travel")]),
      el("label", { class: "rold-check" }, [limOn, tt("Limitar recorrido", "Limit travel")]),
      el("div", { class: "row" }, [
        el("div", { class: "sub" }, [el("label", {}, [tt("Mín", "Min")]), grados("min")]),
        el("div", { class: "sub" }, [el("label", {}, [tt("Máx", "Max")]), grados("max")]),
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

  leerDelModelo();
  return el("div", { class: "field" }, [
    el("label", {}, [m.titulo ?? tt("Recorrido · horas del reloj", "Travel · clock hours")]),
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
