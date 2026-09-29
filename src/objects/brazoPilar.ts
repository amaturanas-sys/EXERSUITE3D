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
 *
 * ─── Y AL REVÉS: LA MUESCA PARA UN ÁNGULO (v0.4.11) ────────────────────────
 *
 * Una banca se diseña al revés de como se reparte aquí por omisión: primero
 * los ángulos —plano, 15°, 30°, 45°…— y de ellos salen las muescas. La misma
 * ecuación, despejando t en vez de θ, es una cuadrática en t:
 *
 *     t = X·cos ψ ± √(L² − (X·sen ψ − E)²)          ψ = θ − C
 *
 * Y trae gratis lo que más importa saber antes de cortar nada: esa raíz sólo
 * existe si |X·sen ψ − E| ≤ L, es decir, si el pilar llega a la recta de la
 * viga. Fuera de esa banda el brazo NO PUEDE estar, lo pida quien lo pida. Con
 * el pilar colgado del extremo de un brazo de 36 y 18 de pilar (E = 0), el
 * techo es asen(18/36) = 30°: una banca así no pasa de 30 grados, por muchas
 * muescas que se le dibujen a 45, 60 u 85 (un documento de referencia traía
 * justo esa tabla, y no cerraba ni un tope). La gráfica que lo acompañaba sí
 * cerraba, porque colgaba el pilar a 15 del pivote: el que cuenta es ese brazo
 * X, no el largo del respaldo.
 */

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

/**
 * LA MUESCA QUE MONTA `crearBrazoConPilar`: dos dedos alrededor de un hueco a la
 * medida del pie del pilar. De aquí sale el paso mínimo entre dos topes — por
 * debajo, los dedos de uno se meten en el hueco del siguiente y esa muesca no
 * se puede fabricar. Es la única fuente de estas medidas: el editor las lee de
 * aquí para montar la viga.
 */
export const MUESCA_PILAR = {
  /** Sección del pie del pilar (cm). */
  perfilPilarCm: 5,
  /** Lo que el pie baila dentro de la muesca (cm). */
  holguraCm: 0.4,
  /** Grueso de cada dedo (cm). */
  dedoCm: 1.5,
} as const;

/**
 * Paso mínimo entre centros de dos muescas vecinas: el hueco de una más UN
 * dedo, que comparten. 5 + 0,4 + 1,5 = 6,9 cm.
 */
export function pasoMinimoMuesca(): number {
  return MUESCA_PILAR.perfilPilarCm + MUESCA_PILAR.holguraCm + MUESCA_PILAR.dedoCm;
}

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
  /**
   * EN QUÉ TOPE NACE ARMADO (grados de brazo). Se usa el más cercano a este
   * valor; sin él, el primero de la lista. Importa más de lo que parece: el
   * mecanismo se construye RÍGIDO en ese tope, y si es el más tumbado el brazo
   * puede nacer dentro de otra pieza —en la banca del diseñador, el primer tope
   * mete el respaldo en el asiento, chocan a los 4,25 s y la simulación
   * revienta—.
   */
  gradoInicial?: number;
  /**
   * CÓMO SE REPARTEN LOS TOPES DE EN MEDIO (v0.4.11). `"viga"` —el de siempre—
   * los pone a la misma distancia unos de otros sobre la viga, y los ángulos
   * salen como salgan. `"grados"` los pone a la misma distancia EN GRADOS entre
   * A y B, que es como se piensa una banca, y las muescas salen como salgan.
   */
  reparto?: "viga" | "grados";
  /**
   * LOS ÁNGULOS EXACTOS de cada tope (grados sobre la horizontal), para cuando
   * no son equidistantes —plano, 15, 30, 45, 60, 85—. Manda sobre `gradoA`,
   * `gradoB`, `topes` y `reparto`: el recorrido va del menor al mayor.
   */
  gradosTopes?: number[];
  /**
   * Paso mínimo entre dos muescas (cm). Por omisión, el de la muesca que monta
   * el editor (`pasoMinimoMuesca`, 6,9 cm).
   */
  pasoMinimoCm?: number;
  /**
   * EL PILAR, SI YA LO TIENES (v0.4.11). Por omisión el pilar se DEDUCE de la
   * viga; con él dado se respeta, y lo que sale son las muescas y el largo de
   * viga que ocupan. Los topes van por ángulo (`gradosTopes`, o repartidos en
   * grados entre A y B), porque con el pilar fijo es lo único que queda por
   * decidir. `vigaCm` se ignora.
   */
  pilarCm?: number;
}

export interface TopeBrazoPilar {
  /**
   * Distancia del tope al PIE DE LA PERPENDICULAR: el punto de la recta de la
   * viga más cercano al pivote. Con descentrado cero ese punto ES el pivote.
   */
  distanciaCm: number;
  /** Ángulo en que queda el brazo apoyado en ese tope. */
  gradoBrazo: number;
  /** Distancia a la muesca del tope anterior (cm); nula en el primero. */
  pasoCm: number | null;
  /**
   * Ángulo entre el pilar y la viga (0° = tumbado sobre ella, 90° = de pie).
   * Dice cómo empuja: cuanto más tumbado, más carga va A LO LARGO de la viga y
   * menos contra el fondo de la muesca. El tope más recostado de la banca
   * ajustable trabaja a 37° y aguanta (medido en v0.4.11).
   */
  anguloPilarVigaGrados: number;
  /**
   * Cuántos grados de brazo mueve un centímetro de muesca en ese tope. Alto
   * quiere decir que las muescas se apiñan y un error de taller se nota en el
   * ángulo; cerca de cero, que el brazo está llegando a su techo.
   */
  gradosPorCm: number;
}

export interface SolucionBrazoPilar {
  /** L: el largo que debe tener el pilar. Es LA respuesta. */
  pilarCm: number;
  /** Distancia del pivote al tope del extremo A. */
  desdeCm: number;
  /** …y al del extremo B. */
  hastaCm: number;
  topes: TopeBrazoPilar[];
  /**
   * EL TECHO GEOMÉTRICO del brazo con este pilar: la banda de ángulos en que el
   * pilar todavía llega a la recta de la viga (|X·sen ψ − E| ≤ L). Fuera de ella
   * no hay muesca posible. Nulo si el pilar llega en todas las direcciones.
   */
  alcanceGrados: [number, number] | null;
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
  // NINGUNA DA EL RECORRIDO PEDIDO, Y ESO SE DICE (v0.4.11). Se devolvía la
  // primera en silencio: pedir de 10° a 70° sobre una viga inclinada 30° daba
  // topes de 70° a 109° sin un solo aviso, y quien montaba el mecanismo se
  // encontraba otro. Pasa cuando el recorrido CRUZA la dirección de la viga: el
  // brazo tendría que pasar por encima de ella, y ninguna rama del triángulo lo
  // hace de una vez. Se sigue devolviendo la solución —el número enseña qué sí
  // sale—, pero con su aviso delante de cualquier otro.
  if (directo.topes.length >= 2 && !directo.aviso?.startsWith("Con ")) {
    const lista = cfg.gradosTopes && cfg.gradosTopes.length >= 2 ? cfg.gradosTopes : null;
    const A = lista ? Math.min(...lista) : Math.min(cfg.gradoA, cfg.gradoB);
    const B = lista ? Math.max(...lista) : Math.max(cfg.gradoA, cfg.gradoB);
    const de = directo.topes[0].gradoBrazo;
    const a = directo.topes[directo.topes.length - 1].gradoBrazo;
    const cruza = Math.min(A, B) < cfg.inclinacionC && cfg.inclinacionC < Math.max(A, B);
    directo.aviso =
      `Los topes salen de ${de}° a ${a}°, no de ${A}° a ${B}° como pediste`
      + (cruza
        ? `: el recorrido cruza la dirección de la viga (${cfg.inclinacionC}°), y el brazo no puede`
          + " pasar por encima de ella. Inclina la viga fuera del recorrido."
        : ". Cambia el largo de la viga o del brazo.");
  }
  return directo;
}

/** ¿Los extremos de la escalera son los grados que se pidieron? */
function cumpleElRecorrido(s: SolucionBrazoPilar, cfg: CfgBrazoPilar): boolean {
  if (s.topes.length < 2) return false;
  const lista = cfg.gradosTopes && cfg.gradosTopes.length >= 2 ? cfg.gradosTopes : null;
  const A = lista ? Math.min(...lista) : Math.min(cfg.gradoA, cfg.gradoB);
  const B = lista ? Math.max(...lista) : Math.max(cfg.gradoA, cfg.gradoB);
  return (
    Math.abs(s.topes[0].gradoBrazo - A) < 0.6
    && Math.abs(s.topes[s.topes.length - 1].gradoBrazo - B) < 0.6
  );
}

/**
 * LAS DOS MUESCAS QUE DAN UN ÁNGULO (v0.4.11): dónde tiene que apoyarse el pie
 * del pilar, sobre la recta de la viga, para que el brazo quede a `grado`.
 * `t = X·cos ψ ± √(L² − (X·sen ψ − E)²)`; nulo si el pilar no llega a la viga
 * en ese ángulo. La primera es la rama `+`, la segunda la `−`.
 */
export function muescasParaAngulo(
  X: number, E: number, L: number, C: number, grado: number,
): [number, number] | null {
  const psi = (grado - C) * D2R;
  const d = X * Math.sin(psi) - E;
  const disc = L * L - d * d;
  if (!(disc >= 0)) return null;
  const r = Math.sqrt(disc);
  const base = X * Math.cos(psi);
  return [base + r, base - r];
}

/**
 * Cómo trabaja un tope: el ángulo del pilar con la viga y cuántos grados de
 * brazo mueve un centímetro de muesca. Con el pilar `s = P − F` (P el codo del
 * brazo, F el pie), `s·u = X cos ψ − t` y `s·n = X sen ψ − E`; y derivando la
 * ley del coseno, `dψ/dt = (s·u) / (X·(t sen ψ − E cos ψ))`.
 */
function comoTrabaja(
  X: number, E: number, C: number, t: number, grado: number,
): { anguloPilarVigaGrados: number; gradosPorCm: number } {
  const psi = (grado - C) * D2R;
  const su = X * Math.cos(psi) - t;
  const sn = X * Math.sin(psi) - E;
  const den = X * (t * Math.sin(psi) - E * Math.cos(psi));
  return {
    anguloPilarVigaGrados: +(Math.atan2(Math.abs(sn), Math.abs(su)) * R2D).toFixed(1),
    gradosPorCm: Math.abs(den) < 1e-9 ? Infinity : +Math.abs((su / den) * R2D).toFixed(2),
  };
}

/**
 * EL TECHO GEOMÉTRICO: la banda de ángulos alrededor de `gradoRef` en la que el
 * pilar todavía llega a la viga. Se recorre en décimas de grado, que para una
 * cota de taller sobra; nulo si llega en todas las direcciones.
 */
function alcanceDelPilar(
  X: number, E: number, L: number, C: number, gradoRef: number,
): [number, number] | null {
  const llega = (g: number): boolean => Math.abs(X * Math.sin((g - C) * D2R) - E) <= L + 1e-9;
  if (!llega(gradoRef)) return null;
  let lo = gradoRef, hi = gradoRef;
  while (hi - gradoRef < 360 && llega(hi + 0.1)) hi += 0.1;
  while (gradoRef - lo < 360 && llega(lo - 0.1)) lo -= 0.1;
  if (hi - lo >= 359.9) return null;
  return [+lo.toFixed(1), +hi.toFixed(1)];
}

/** Los ángulos pedidos, si se pidieron por grados; nulo con el reparto por viga. */
function angulosPedidos(cfg: CfgBrazoPilar, A: number, B: number, n: number): number[] | null {
  if (cfg.gradosTopes && cfg.gradosTopes.length >= 2) {
    return [...new Set(cfg.gradosTopes.map((g) => +g))].sort((a, b) => a - b);
  }
  if (cfg.reparto === "grados") {
    return Array.from({ length: n }, (_, i) => A + ((B - A) * i) / (n - 1));
  }
  return null;
}

/**
 * CON EL PILAR DADO: cada ángulo pide su muesca, sin nada que deducir. Se
 * prueban las dos ramas y vale la que deja todas las muescas resueltas y en
 * escalera. Si valen las dos, gana la `+`: el pilar inclinado HACIA ATRÁS, con
 * el pie más allá del codo —en plano, pie a X + L del pivote—, que es el
 * montaje de una banca y el de la gráfica de referencia. La otra pliega el
 * pilar hacia el pivote (en plano, a X − L): también se puede construir, pero
 * elegirla por dar la viga más corta, como hacía la primera versión, montaba
 * una banca que nadie dibujaría así.
 */
function resolverConPilar(cfg: CfgBrazoPilar, C: number): SolucionBrazoPilar {
  const X = Math.max(1, cfg.brazoCm);
  const E = cfg.descentradoCm ?? 0;
  const L = cfg.pilarCm!;
  const lista = cfg.gradosTopes && cfg.gradosTopes.length >= 2 ? cfg.gradosTopes : null;
  const A = lista ? Math.min(...lista) : Math.min(cfg.gradoA, cfg.gradoB);
  const B = lista ? Math.max(...lista) : Math.max(cfg.gradoA, cfg.gradoB);
  const n = lista ? lista.length : Math.max(2, Math.round(cfg.topes ?? 5));
  const pedidos = angulosPedidos({ ...cfg, reparto: "grados" }, A, B, n)!;
  const pasoMin = cfg.pasoMinimoCm ?? pasoMinimoMuesca();
  const alcanceGrados = alcanceDelPilar(X, E, L, C, (A + B) / 2)
    ?? (Math.abs(X * Math.sin(((A + B) / 2 - C) * D2R) - E) <= L ? null : alcanceDelPilar(X, E, L, C, A));

  const ramas = ([1, -1] as const).map((rama) => {
    const ts: number[] = [];
    for (const g of pedidos) {
      const m = muescasParaAngulo(X, E, L, C, g);
      if (!m) return null;
      ts.push(rama === 1 ? m[0] : m[1]);
    }
    const crece = ts[1] > ts[0];
    for (let i = 1; i < ts.length; i++) if (crece !== ts[i] > ts[i - 1]) return null;
    return ts;
  }).filter((x): x is number[] => !!x);   // en orden: la `+` primero, si vale

  if (ramas.length === 0) {
    const fuera = pedidos.filter((g) => !muescasParaAngulo(X, E, L, C, g));
    return {
      pilarCm: L, desdeCm: 0, hastaCm: 0, topes: [], alcanceGrados,
      aviso: fuera.length && alcanceGrados
        ? `Con ${L} cm de pilar el brazo sólo llega de ${alcanceGrados[0]}° a ${alcanceGrados[1]}°:`
          + ` a ${fuera.join("°, ")}° el pilar no alcanza la viga. Alarga el pilar o cuélgalo más cerca`
          + " del pivote."
        : fuera.length
          ? `Con ${L} cm de pilar el brazo no llega a ${fuera.join("°, ")}°: el pilar no alcanza la viga.`
          : "Con ese pilar las muescas no quedan en escalera: el pie pasaría por encima del pivote.",
    };
  }
  const ts = ramas[0];

  const topes: TopeBrazoPilar[] = pedidos.map((g, i) => ({
    distanciaCm: +ts[i].toFixed(2),
    gradoBrazo: +g.toFixed(1),
    pasoCm: i === 0 ? null : +Math.abs(ts[i] - ts[i - 1]).toFixed(2),
    ...comoTrabaja(X, E, C, ts[i], g),
  }));
  const apretado = topes.find((t) => t.pasoCm != null && t.pasoCm < pasoMin);
  const i = apretado ? topes.indexOf(apretado) : -1;
  return {
    pilarCm: +L.toFixed(2),
    desdeCm: +Math.min(ts[0], ts[ts.length - 1]).toFixed(2),
    hastaCm: +Math.max(ts[0], ts[ts.length - 1]).toFixed(2),
    topes,
    alcanceGrados,
    aviso: apretado
      ? `Los topes de ${topes[i - 1].gradoBrazo}° y ${apretado.gradoBrazo}° quedan a ${apretado.pasoCm} cm:`
        + ` dos muescas necesitan al menos ${pasoMin.toFixed(1)}. Sepáralos en grados o alarga el brazo.`
      : null,
  };
}

function resolver(cfg: CfgBrazoPilar, C: number): SolucionBrazoPilar {
  if (cfg.pilarCm != null && cfg.pilarCm > 0) return resolverConPilar(cfg, C);
  const X = Math.max(1, cfg.brazoCm);
  const Y = Math.max(1, cfg.vigaCm);
  const E = cfg.descentradoCm ?? 0;
  const pedidos0 = cfg.gradosTopes && cfg.gradosTopes.length >= 2 ? cfg.gradosTopes : null;
  const A = pedidos0 ? Math.min(...pedidos0) : Math.min(cfg.gradoA, cfg.gradoB);
  const B = pedidos0 ? Math.max(...pedidos0) : Math.max(cfg.gradoA, cfg.gradoB);
  const nTopes = pedidos0 ? pedidos0.length : Math.max(2, Math.round(cfg.topes ?? 5));
  const pedidos = angulosPedidos(cfg, A, B, nTopes);
  const pasoMin = cfg.pasoMinimoCm ?? pasoMinimoMuesca();

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

  type Crudo = { distanciaCm: number; gradoBrazo: number };
  /** Los topes de una candidata, y si sirven: todos resueltos y en escalera. */
  const topesDe = (c: { t0: number; L: number }, rama: 1 | -1): Crudo[] => {
    const out: Crudo[] = [];
    if (pedidos) {
      // POR ÁNGULO: la muesca de cada ángulo, en la rama de esta candidata. Una
      // rama no cambia de signo mientras el pilar llegue a la viga —sólo cruza
      // por donde deja de llegar—, así que una sola rama sirve para todos los
      // topes o para ninguno. Y la muesca tiene que caer dentro del tramo que
      // resolvió la candidata: los dos extremos caen en sus puntas por
      // construcción, y los de en medio, entre ellas.
      const lo = Math.min(c.t0, c.t0 + Y) - 0.05;
      const hi = Math.max(c.t0, c.t0 + Y) + 0.05;
      for (const g of pedidos) {
        const m = muescasParaAngulo(X, E, c.L, C, g);
        if (!m) return [];
        const t = rama === 1 ? m[0] : m[1];
        if (t < lo || t > hi) return [];
        out.push({ distanciaCm: t, gradoBrazo: g });
      }
      const crece = out[1].distanciaCm > out[0].distanciaCm;
      for (let i = 1; i < out.length; i++) {
        if (crece !== out[i].distanciaCm > out[i - 1].distanciaCm) return [];
      }
      return out;
    }
    for (let i = 0; i < nTopes; i++) {
      const t = c.t0 + (Y * i) / (nTopes - 1);
      const g = anguloEnTope(X, E, c.L, C, t, rama);
      if (g == null) return [];
      // Redondeados AQUÍ, como siempre: la escalera se juzga a la décima de
      // grado, y dos topes a 59,97° y 60,02° no son dos topes.
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
  // ramas. Con descentrado cero la rama la decidía el signo de `t`; con
  // descentrado hay que probar las dos y quedarse con la que deja los topes en
  // escalera.
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
      pilarCm: 0, desdeCm: 0, hastaCm: 0, topes: [], alcanceGrados: null,
      aviso: "Con esas medidas el triángulo no cierra: prueba otro largo de viga o de brazo.",
    };
  }

  // Se listan de menos a más grados: el orden en que se usan, no el orden en
  // que caen sobre la viga (que depende de qué rama ganó).
  const crudos = [...buena.topes].sort((u, v) => u.gradoBrazo - v.gradoBrazo);
  const topes: TopeBrazoPilar[] = crudos.map((t, i) => ({
    distanciaCm: +t.distanciaCm.toFixed(2),
    gradoBrazo: +t.gradoBrazo.toFixed(1),
    pasoCm: i === 0 ? null : +Math.abs(t.distanciaCm - crudos[i - 1].distanciaCm).toFixed(2),
    ...comoTrabaja(X, E, C, t.distanciaCm, t.gradoBrazo),
  }));
  const alcanceGrados = alcanceDelPilar(X, E, buena.L, C, (A + B) / 2);

  let aviso: string | null = null;
  const apretado = topes.find((t) => t.pasoCm != null && t.pasoCm < pasoMin);
  if (topes.length < nTopes) {
    if (pedidos && alcanceGrados && (A < alcanceGrados[0] || B > alcanceGrados[1])) {
      aviso =
        `Con ${buena.L.toFixed(1)} cm de pilar el brazo sólo llega de ${alcanceGrados[0]}° a`
        + ` ${alcanceGrados[1]}°: fuera de ahí el pilar no alcanza la viga. Cierra el`
        + " recorrido, alarga la viga o cuelga el pilar más lejos del pivote.";
    } else {
      aviso =
        "Con esa viga los topes de en medio se salen del recorrido: el pie del pilar"
        + " pasa por encima del pivote. Alarga la viga, acorta el brazo o cierra el recorrido.";
    }
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
  } else if (apretado) {
    // MUESCAS QUE NO CABEN (v0.4.11). Cerca del tope donde el brazo se tumba,
    // un grado de brazo apenas mueve la muesca, y repartir por ángulo las
    // apiña: en la gráfica de referencia, de 0° a 15° la muesca corre 0,93
    // pulgadas. Por debajo del paso mínimo los dedos de una muesca se meten en
    // el hueco de la otra.
    const i = topes.indexOf(apretado);
    aviso =
      `Los topes de ${topes[i - 1].gradoBrazo}° y ${apretado.gradoBrazo}° quedan a`
      + ` ${apretado.pasoCm} cm: dos muescas necesitan al menos ${pasoMin.toFixed(1)}.`
      + " Sepáralos en grados o alarga el brazo.";
  }

  return {
    pilarCm: +buena.L.toFixed(2),
    desdeCm: +buena.t0.toFixed(2),
    hastaCm: +(buena.t0 + Y).toFixed(2),
    topes,
    alcanceGrados,
    aviso,
  };
}
