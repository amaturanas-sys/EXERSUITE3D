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
 * Con el pivote del brazo en el origen, la viga es una recta de inclinación C
 * que pasa a distancia E del pivote —el DESCENTRADO: en una banca real la viga
 * de topes no pasa por el pivote del respaldo, pasa por debajo—. Con `u` en la
 * dirección de la viga y `n` perpendicular, el pie del pilar está en
 * `E·n + t·u`, y el brazo en `X·(cos θ, sin θ)`. Como `n·u = 0`, el cuadrado
 * de la distancia entre los dos sale limpio:
 *
 *     L² = X² + E² + t² − 2·X·E·sen(θ−C) − 2·X·t·cos(θ−C)
 *
 * Pedir que el recorrido vaya de A a B apoyándose en una viga de largo Y es
 * pedir que el pie recorra [t₀, t₀+Y] mientras θ va de A a B. Son dos
 * ecuaciones con dos incógnitas —t₀ y L—, y al restarlas la cuadrática y el
 * término de E² se cancelan solos:
 *
 *     t₀ = [Y² − 2XY·cos β + 2XE·(sen α − sen β)] / [2·(X·cos β − X·cos α − Y)]
 *     L  = √(X² + E² + t₀² − 2·X·E·sen α − 2·X·t₀·cos α)      α = A−C, β = B−C
 *
 * Con E = 0 se reduce a la fórmula de siempre. No hay iteración ni ajuste: es
 * cerrado.
 *
 * Leer el ángulo de vuelta —qué grados da un tope a distancia t— sí necesita
 * un paso más, porque queda `E·sen ψ + t·cos ψ = K` con ψ = θ−C, que es una
 * sola sinusoide: `√(E²+t²)·cos(ψ − φ) = K` con `φ = atan2(E, t)`. De ahí
 * `θ = C + φ ± acos(K/√(E²+t²))`, y el signo lo decide cuál de los dos deja
 * los topes en escalera.
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
  /**
   * E: DESCENTRADO de la viga (cm) — a qué distancia pasa su recta del pivote
   * del brazo. Cero quiere decir que pasa justo por él. En una banca real la
   * viga de topes corre por el bastidor, por debajo del pivote del respaldo:
   * en la del diseñador son 4,2 cm.
   */
  descentradoCm?: number;
  /** Cuántos topes lleva la viga (mínimo 2). */
  topes?: number;
}

export interface TopeBrazoPilar {
  /**
   * Distancia del tope al PIE DE LA PERPENDICULAR: el punto de la recta de la
   * viga más cercano al pivote. Con descentrado cero ese punto ES el pivote.
   */
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
function anguloEnTope(
  X: number, E: number, L: number, C: number, t: number, rama: 1 | -1,
): number | null {
  const R = Math.hypot(E, t);
  if (R <= 1e-6) return null;
  const K = (X * X + E * E + t * t - L * L) / (2 * X);
  const cos = K / R;
  if (!Number.isFinite(cos) || cos < -1 || cos > 1) return null;
  const fase = Math.atan2(E, t) * R2D;
  return C + fase + rama * Math.acos(cos) * R2D;
}

/**
 * Resuelve el mecanismo. Se prueban las DOS maneras de repartir el recorrido
 * —el extremo A en la punta cercana de la viga o en la lejana— y gana la que
 * deja los topes EN ESCALERA con el pilar más corto, que es la que se puede
 * construir y usar.
 */
export function calcularBrazoPilar(cfg: CfgBrazoPilar): SolucionBrazoPilar {
  // UNA RECTA TIENE DOS SENTIDOS, y la inclinación de la viga se puede teclear
  // por cualquiera de los dos: −25° y 155° son la MISMA viga. Con el sentido
  // «contrario» los topes salían desplazados 180° —ángulos de 230° a 300° para
  // un recorrido pedido de 10 a 80—, que es exactamente la ambigüedad que se
  // acaba de quitar del eje de las bisagras. Se resuelve con los dos y gana el
  // que devuelve el recorrido que se pidió.
  // Como `acos` sólo devuelve [0,180], el ángulo del brazo sólo puede caer en
  // la banda [C, C+180]: hay que elegir el representante de la recta que la
  // ponga encima del recorrido pedido, y por eso se prueba también C−180 (que
  // es el que hacía falta para la banca del diseñador: su placa mide 155° y el
  // brazo trabaja en la banda de −25°).
  const directo = resolver(cfg, cfg.inclinacionC);
  if (cumpleElRecorrido(directo, cfg)) return directo;
  for (const giro of [-180, 180, -360, 360]) {
    const otro = resolver(cfg, cfg.inclinacionC + giro);
    if (cumpleElRecorrido(otro, cfg)) return otro;
  }
  return directo;
}

/** ¿Los extremos de la escalera son los grados que se pidieron? */
function cumpleElRecorrido(s: SolucionBrazoPilar, cfg: CfgBrazoPilar): boolean {
  if (s.topes.length < 2) return false;
  const A = Math.min(cfg.gradoA, cfg.gradoB);
  const B = Math.max(cfg.gradoA, cfg.gradoB);
  return (
    Math.abs(s.topes[0].gradoBrazo - A) < 0.6
    && Math.abs(s.topes[s.topes.length - 1].gradoBrazo - B) < 0.6
  );
}

function resolver(cfg: CfgBrazoPilar, C: number): SolucionBrazoPilar {
  const X = Math.max(1, cfg.brazoCm);
  const Y = Math.max(1, cfg.vigaCm);
  const E = cfg.descentradoCm ?? 0;
  const nTopes = Math.max(2, Math.round(cfg.topes ?? 5));
  const A = Math.min(cfg.gradoA, cfg.gradoB);
  const B = Math.max(cfg.gradoA, cfg.gradoB);

  /** Una candidata: el ángulo `p` en la punta cercana y `q` en la lejana. */
  const probar = (p: number, q: number): { t0: number; L: number } | null => {
    const cp = Math.cos((p - C) * D2R);
    const cq = Math.cos((q - C) * D2R);
    const sp = Math.sin((p - C) * D2R);
    const sq = Math.sin((q - C) * D2R);
    const den = 2 * (X * cq - X * cp - Y);
    if (Math.abs(den) < 1e-9) return null;
    const t0 = (Y * Y - 2 * X * Y * cq + 2 * X * E * (sp - sq)) / den;
    const L2 = X * X + E * E + t0 * t0 - 2 * X * E * sp - 2 * X * t0 * cp;
    if (!(L2 > 0)) return null;
    return { t0, L: Math.sqrt(L2) };
  };

  /** Los topes de una candidata, y si sirven: todos resueltos y en escalera. */
  const topesDe = (c: { t0: number; L: number }, rama: 1 | -1): TopeBrazoPilar[] => {
    const out: TopeBrazoPilar[] = [];
    for (let i = 0; i < nTopes; i++) {
      const t = c.t0 + (Y * i) / (nTopes - 1);
      const g = anguloEnTope(X, E, c.L, C, t, rama);
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

  // Cuatro candidatas: las dos maneras de repartir el recorrido por las dos
  // ramas del arcocoseno. Con descentrado cero la rama la decidía el signo de
  // `t`; con descentrado hay que probar las dos y quedarse con la que deja los
  // topes en escalera.
  const candidatas = [probar(A, B), probar(B, A)]
    .filter((c): c is { t0: number; L: number } => !!c)
    .flatMap((c) => ([1, -1] as const).map((rama) => ({ ...c, topes: topesDe(c, rama) })));
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
    aviso =
      `La viga arranca ${Math.abs(buena.t0).toFixed(1)} cm por DETRÁS del punto`
      + " más cercano al pivote: déjala pasar de largo o corre el pivote.";
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
