/**
 * BRAZO CON PILAR REGULABLE (v0.3.29)
 *
 * El mecanismo del respaldo de una banca ajustable, resuelto de una vez: un
 * BRAZO que pivota, un PILAR colgado de él por otra bisagra, y una VIGA CON
 * TOPES sobre la que ese pilar se apoya. Cambiar de tope cambia el ángulo del
 * brazo, y ésa es toda la máquina.
 *
 * Montarlo a ojo no funciona: el largo del pilar no es una preferencia, es la
 * consecuencia de los otros cuatro números. Aquí se calcula exacto.
 *
 * ─── LA GEOMETRÍA ──────────────────────────────────────────────────────────
 *
 * Con el pivote del brazo en el origen y la viga saliendo de él con una
 * inclinación C, el pie del pilar vive SOBRE la recta de la viga, a una
 * distancia t del pivote. El brazo mide X y el pilar L, así que los tres
 * lados cierran un triángulo y vale el teorema del coseno:
 *
 *     L² = X² + t² − 2·X·t·cos(θ − C)
 *
 * donde θ es el ángulo del brazo. Pedir que el recorrido vaya de A a B
 * apoyándose en una viga de largo Y es pedir que el pie recorra [t₀, t₀+Y]
 * mientras θ va de A a B. Son dos ecuaciones con dos incógnitas —t₀ y L—, y
 * restándolas la cuadrática se cancela sola:
 *
 *     t₀ = Y·(Y − 2X·cos β) / (2·(X·cos β − X·cos α − Y))      α = A−C, β = B−C
 *     L  = √(X² + t₀² − 2·X·t₀·cos α)
 *
 * No hay iteración ni ajuste: es cerrado.
 */

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

export interface CfgBrazoPilar {
  /** X: largo del brazo, del pivote a donde cuelga el pilar (cm). */
  brazoCm: number;
  /** A: un extremo del recorrido del brazo (grados sobre la horizontal). */
  gradoA: number;
  /** B: el otro extremo. */
  gradoB: number;
  /** Y: largo de la viga de topes (cm). */
  vigaCm: number;
  /** C: inclinación de la viga (grados sobre la horizontal). */
  inclinacionC: number;
  /** Cuántos topes lleva la viga (mínimo 2). */
  topes?: number;
}

export interface TopeBrazoPilar {
  /** Distancia del tope al pivote del brazo, sobre la recta de la viga. */
  distanciaCm: number;
  /** Ángulo en que queda el brazo apoyado en ese tope. */
  gradoBrazo: number;
}

export interface SolucionBrazoPilar {
  /** L: el largo que debe tener el pilar. Es LA respuesta. */
  pilarCm: number;
  /** Distancia del pivote al tope del extremo A. */
  desdeCm: number;
  /** …y al del extremo B. */
  hastaCm: number;
  topes: TopeBrazoPilar[];
  /** Qué impide que el mecanismo funcione, si algo lo impide. */
  aviso: string | null;
}

/**
 * Ángulo del brazo cuando el pie del pilar se apoya a distancia `t`.
 *
 * `t` va CON SIGNO sobre la recta de la viga: negativo quiere decir que ese
 * apoyo cae al otro lado del pivote, y eso pasa en mecanismos perfectamente
 * normales —la viga de topes de una banca pasa por debajo del pivote del
 * respaldo—. Rechazar los negativos tiraba la mitad de los topes y dejaba un
 * recorrido que no era el pedido.
 */
function anguloEnTope(X: number, L: number, C: number, t: number): number | null {
  if (Math.abs(t) <= 1e-6) return null;
  const cos = (X * X + t * t - L * L) / (2 * X * t);
  if (!Number.isFinite(cos) || cos < -1 || cos > 1) return null;
  return C + Math.acos(cos) * R2D;
}

/**
 * Resuelve el mecanismo. Se prueban las DOS maneras de repartir el recorrido
 * —el extremo A en la punta cercana de la viga o en la lejana— y gana la que
 * deja los topes EN ESCALERA con el pilar más corto, que es la que se puede
 * construir y usar.
 */
export function calcularBrazoPilar(cfg: CfgBrazoPilar): SolucionBrazoPilar {
  const X = Math.max(1, cfg.brazoCm);
  const Y = Math.max(1, cfg.vigaCm);
  const C = cfg.inclinacionC;
  const nTopes = Math.max(2, Math.round(cfg.topes ?? 5));
  const A = Math.min(cfg.gradoA, cfg.gradoB);
  const B = Math.max(cfg.gradoA, cfg.gradoB);

  /** Una candidata: el ángulo `p` en la punta cercana y `q` en la lejana. */
  const probar = (p: number, q: number): { t0: number; L: number } | null => {
    const cp = Math.cos((p - C) * D2R);
    const cq = Math.cos((q - C) * D2R);
    const den = 2 * (X * cq - X * cp - Y);
    if (Math.abs(den) < 1e-9) return null;
    const t0 = (Y * (Y - 2 * X * cq)) / den;
    const L2 = X * X + t0 * t0 - 2 * X * t0 * cp;
    if (!(L2 > 0)) return null;
    return { t0, L: Math.sqrt(L2) };
  };

  /** Los topes de una candidata, y si sirven: todos resueltos y en escalera. */
  const topesDe = (c: { t0: number; L: number }): TopeBrazoPilar[] => {
    const out: TopeBrazoPilar[] = [];
    for (let i = 0; i < nTopes; i++) {
      const t = c.t0 + (Y * i) / (nTopes - 1);
      const g = anguloEnTope(X, c.L, C, t);
      if (g == null) return [];
      out.push({ distanciaCm: +t.toFixed(2), gradoBrazo: +g.toFixed(1) });
    }
    // EN ESCALERA O NO SIRVE. Si al recorrer la viga el ángulo sube y luego
    // baja, el pie del pilar está pasando POR ENCIMA del pivote: los topes de
    // en medio dan ángulos que no están en el recorrido pedido —45 cm de brazo
    // entre 15° y 80° sobre una viga de 40 daba un tope de 126°— y la máquina
    // no se puede usar aunque los números cierren.
    const sube = out[1].gradoBrazo > out[0].gradoBrazo;
    for (let i = 1; i < out.length; i++) {
      if (sube !== out[i].gradoBrazo > out[i - 1].gradoBrazo) return [];
    }
    return out;
  };

  const candidatas = [probar(A, B), probar(B, A)]
    .filter((c): c is { t0: number; L: number } => !!c)
    .map((c) => ({ ...c, topes: topesDe(c) }));
  // PRIMERO LAS QUE DAN UNA ESCALERA DE TOPES USABLE; entre ésas, el pilar más
  // corto. Las dos ramas de la ecuación cierran el triángulo, pero una puede
  // pedir pilares de metros para el mismo recorrido, y ordenar sólo por largo
  // llega a elegir una cuyos topes de en medio se salen del recorrido. Si
  // ninguna sirve se devuelve la más corta igualmente, con su aviso: más vale
  // enseñar el número y por qué no vale que no enseñar nada.
  const utiles = candidatas.filter((c) => c.topes.length === nTopes);
  const buena = (utiles.length ? utiles : candidatas).sort((u, v) => u.L - v.L)[0];

  if (!buena) {
    return {
      pilarCm: 0, desdeCm: 0, hastaCm: 0, topes: [],
      aviso: "Con esas medidas el triángulo no cierra: prueba otro largo de viga o de brazo.",
    };
  }

  // Se listan de menos a más grados: el orden en que se usan, no el orden en
  // que caen sobre la viga (que depende de qué rama ganó).
  const topes = [...buena.topes].sort((u, v) => u.gradoBrazo - v.gradoBrazo);

  let aviso: string | null = null;
  if (topes.length < nTopes) {
    aviso =
      "Con esa viga los topes de en medio se salen del recorrido: el pie del pilar"
      + " pasa por encima del pivote. Alarga la viga, acorta el brazo o cierra el recorrido.";
  } else if (buena.t0 <= 0) {
    aviso = `La viga arranca ${Math.abs(buena.t0).toFixed(1)} cm por DETRÁS del pivote: déjala pasar de largo o corre el pivote.`;
  } else if (buena.L < 5) {
    aviso = "El pilar sale demasiado corto para ser una pieza: alarga la viga o cierra el recorrido.";
  } else if (buena.L > 3 * X) {
    // Los números cierran pero la máquina no existe: con la viga demasiado
    // corta para el recorrido pedido, la única rama que da topes en escalera
    // es la del pilar larguísimo —45 cm de brazo entre 15° y 80° sobre 40 cm
    // de viga piden 213 cm de pilar—. Es exacto y es inútil; se dice.
    aviso =
      `El pilar sale desproporcionado (${buena.L.toFixed(0)} cm para un brazo de ${X}):`
      + " la viga es corta para ese recorrido. Alárgala o cierra los grados.";
  }

  return {
    pilarCm: +buena.L.toFixed(2),
    desdeCm: +buena.t0.toFixed(2),
    hastaCm: +(buena.t0 + Y).toFixed(2),
    topes,
    aviso,
  };
}
