/**
 * MOVIMIENTOS PRIMITIVOS DEL MANIQUÍ (v0.2.49).
 *
 * Antes la simulación se instruía ARTICULACIÓN POR ARTICULACIÓN: se liberaban
 * hombro y codo y una tecla los «flexionaba» a los dos y la otra los
 * «extendía». Eso hace IMPOSIBLE un press, porque las direcciones anatómicas
 * son OPUESTAS: empujar una carga es extender el codo MIENTRAS se flexiona el
 * hombro. Con el modelo viejo el brazo solo podía quedarse recto y hacia atrás
 * (extensión de las dos) o doblado y por encima de la cabeza (flexión de las
 * dos); ninguna de las dos es un empuje.
 *
 * Aquí la instrucción pasa a ser la del gesto real:
 *
 *   ZONA (qué tren del cuerpo trabaja) + SENTIDO (empuje o tracción)
 *
 * El EMPUJE es siempre la fase que ALEJA la carga del cuerpo y la TRACCIÓN su
 * inversa exacta. Cada zona reparte el paso entre sus articulaciones con el
 * signo que corresponde a su anatomía, así que un solo botón produce el
 * patrón coordinado completo.
 *
 * El PLANO del ejercicio —horizontal o vertical— NO lo pone la primitiva: lo
 * pone la POSTURA DE PARTIDA. Con el torso erguido y el hombro a la altura del
 * pecho, el empuje del tren superior sale horizontal (press de banca, press de
 * pecho); con los brazos arrancando por encima de la cabeza, sale vertical
 * (press militar). Igual con la tracción: desde delante es un remo, desde
 * arriba es un jalón. De ahí salen los cuatro movimientos clásicos con dos
 * botones y una postura.
 *
 * CONVENCIÓN DEL RIG (ver humanFigure.ts): los huesos descansan sobre −Y y la
 * figura mira a +Z, así que una X POSITIVA lleva el segmento hacia ATRÁS. Por
 * eso hombro, codo y cadera FLEXIONAN con X negativa y la rodilla con X
 * positiva; y la columna, al revés que los miembros, se INCLINA hacia delante
 * con X positiva.
 */

export type SentidoMov = 1 | -1;
/** Zonas del cuerpo que se instruyen como una sola unidad. */
export type ZonaId = "superior" | "inferior" | "bisagra";
/** Lado sobre el que actúa una zona: un solo costado o los dos a la vez. */
export type LadoZona = "L" | "R" | "sim";

export interface AporteArticular {
  /** Familia articular, sin lado ("shoulder", "knee", "spine"…). */
  familia: string;
  /** ¿La familia existe por duplicado (izquierda y derecha)? */
  bilateral: boolean;
  /** Signo de la rotación X que produce el EMPUJE de esta zona. */
  empuje: 1 | -1;
  /** Reparto del paso entre las articulaciones de la zona (1 = la que manda). */
  peso: number;
  /** Qué hace esta articulación en el empuje, para explicarlo en la interfaz. */
  es: string;
  en: string;
}

export interface ZonaMov {
  id: ZonaId;
  es: string;
  en: string;
  /** Patrón coordinado del EMPUJE (la tracción es su inversa exacta). */
  patron: AporteArticular[];
  /**
   * ACOMODACIÓN DINÁMICA: articulación que se reajusta sola en cada paso para
   * que el segmento que va después conserve la orientación con la que arrancó
   * —el pie plano sobre la plataforma mientras rodilla y cadera se extienden—.
   * `cadena` son las articulaciones cuyo giro hay que compensar.
   */
  acomodacion?: { familia: string; cadena: string[]; es: string; en: string };
  /** Ejercicios que salen de esta zona según la postura de partida. */
  ejemplosEs: string;
  ejemplosEn: string;
}

export const ZONAS: ZonaMov[] = [
  {
    id: "superior",
    es: "Tren superior",
    en: "Upper body",
    // EMPUJE = alejar la carga: el codo SE EXTIENDE (hacia +X, su tope en 15°)
    // mientras el hombro SE FLEXIONA (hacia −X, o sea hacia delante). El codo
    // recorre más grados que el hombro en un press, de ahí el reparto.
    patron: [
      { familia: "elbow", bilateral: true, empuje: 1, peso: 1, es: "extensión de codo", en: "elbow extension" },
      { familia: "shoulder", bilateral: true, empuje: -1, peso: 0.55, es: "flexión de hombro", en: "shoulder flexion" },
    ],
    ejemplosEs: "empuje horizontal (press de pecho) y vertical (press militar); tracción horizontal (remo) y vertical (jalón)",
    ejemplosEn: "horizontal push (chest press) and vertical (overhead press); horizontal pull (row) and vertical (pulldown)",
  },
  {
    id: "inferior",
    es: "Tren inferior",
    en: "Lower body",
    // EMPUJE = alejar el suelo/la plataforma: rodilla y cadera SE EXTIENDEN.
    // La rodilla flexiona con X positiva, así que extiende hacia −X; la cadera
    // flexiona con X negativa y extiende hacia +X.
    patron: [
      { familia: "knee", bilateral: true, empuje: -1, peso: 1, es: "extensión de rodilla", en: "knee extension" },
      { familia: "hip", bilateral: true, empuje: 1, peso: 0.9, es: "extensión de cadera", en: "hip extension" },
    ],
    acomodacion: {
      familia: "ankle",
      cadena: ["hip", "knee"],
      es: "el tobillo acomoda para mantener la planta en la superficie",
      en: "the ankle accommodates to keep the sole on the surface",
    },
    ejemplosEs: "prensa de piernas, hack, extensión y curl de piernas asistido",
    ejemplosEn: "leg press, hack squat, assisted leg extension and curl",
  },
  {
    id: "bisagra",
    es: "Bisagra (hinge)",
    en: "Hinge",
    // EMPUJE = enderezarse: extensión de cadera y de espalda a la vez. La
    // columna se inclina hacia delante con X POSITIVA, así que extiende hacia
    // −X, al revés que la cadera.
    patron: [
      { familia: "hip", bilateral: true, empuje: 1, peso: 1, es: "extensión de cadera", en: "hip extension" },
      { familia: "spine", bilateral: false, empuje: -1, peso: 0.5, es: "extensión de espalda", en: "back extension" },
    ],
    ejemplosEs: "peso muerto, buenos días, extensión lumbar; la tracción es la bajada (flexión de cadera y espalda)",
    ejemplosEn: "deadlift, good morning, back extension; the pull is the descent (hip and back flexion)",
  },
];

export const ZONA_POR_ID: Record<string, ZonaMov> = Object.fromEntries(
  ZONAS.map((z) => [z.id, z]),
);

/**
 * ─────────────────────────────────────────────────────────────────────────
 * PLANES DE GESTO (v0.2.96): un ejercicio no es un reparto, es un CALENDARIO.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * La ZONA dice QUÉ articulaciones trabajan; el PLAN dice EN QUÉ ORDEN y HASTA
 * DÓNDE. Hacía falta porque el diseñador describió el peso muerto así: «implica
 * una extensión de rodillas hasta subir la barra sobre la patela, luego
 * extensión de cadera para llevar la barra a nivel de la pelvis».
 *
 * Con solo una zona eso no se puede decir. La `bisagra` reparte cadera y
 * espalda a la vez y NO INCLUYE LA RODILLA, así que —medido— la rodilla se
 * quedaba clavada en 94,80° durante los 22 pasos del gesto: la extensión de
 * rodilla no ocurría nunca. Y como el reparto es un porcentaje fijo, el gesto
 * moría donde topaba la primera articulación (cadera en +30°) y no donde acaba
 * el ejercicio: la barra se quedaba 24,89 cm por debajo del bloqueo aprobado,
 * después de haber subido y vuelto a BAJAR 10,15 cm.
 *
 * Un plan es una lista de FASES. Cada fase tiene su reparto, su META —una
 * postura de la biblioteca, que es la única fuente de verdad de los ángulos— y
 * un UMBRAL que dice cuándo termina. El umbral se lee DEL MUNDO en cada paso
 * («¿ya está la barra por encima de la rótula?»), no de un contador: así la
 * tracción recorre las mismas fases al revés sin guardar estado, y cambiar de
 * zona o de ejercicio a mitad de gesto no deja nada desincronizado.
 *
 * Y el plan vive POR EJERCICIO, nunca dentro de `ZONAS`. La zona `superior` es
 * la de fábrica de todas las máquinas: tocarle un peso para arreglar el press
 * con barra rompería el tren superior entero.
 */

/** Cuándo termina una fase. Se evalúa contra el MUNDO, sin estado guardado. */
export type UmbralFase =
  | { tipo: "barraSobreRotula" }
  | { tipo: "angulo"; familia: string; grados: number; signo: 1 | -1 }
  | { tipo: "meta" };

/** Reajustes que se resuelven DESPUÉS del reparto, en cada paso. */
export type AcomodacionMov =
  | { tipo: "pitch"; familia: string; cadena: string[]; es: string; en: string }
  | { tipo: "plomada"; familia: string; es: string; en: string }
  | { tipo: "mirada"; familia: string; distanciaCm: number; es: string; en: string }
  | { tipo: "roce"; familia: string; segmentos: string[]; es: string; en: string }
  | { tipo: "equilibrio"; familia: string; es: string; en: string }
  | { tipo: "apertura"; familia: string; es: string; en: string };

/** Un tramo del gesto, entre dos posturas de la biblioteca. */
export interface FaseMov {
  id: string;
  es: string;
  en: string;
  /** Mismo formato que `ZonaMov.patron`. Los pesos son RESPALDO: se derivan. */
  patron: AporteArticular[];
  /** Postura en la que termina esta fase EN EL EMPUJE. */
  meta: string;
  hasta: UmbralFase;
  acomodaciones?: AcomodacionMov[];
}

/** El calendario de un gesto concreto. */
export interface PlanMov {
  /** Coincide con `EjercicioBarra.id`. */
  id: string;
  zona: ZonaId;
  /** Postura del extremo de TRACCIÓN (== `EjercicioBarra.fondo`). */
  origen: string;
  /** Fases EN ORDEN DE EMPUJE. La tracción las recorre al revés. */
  fases: FaseMov[];
}

/**
 * LA PLOMADA DEL BRAZO. «Los brazos no cuelgan con normalidad: deben operar
 * como CUERDAS, que soportan la barra desde el punto de anclaje del hombro».
 * Una cuerda no tiene ángulo propio — cuelga. Así que el hombro deja de ser un
 * ángulo del reparto y pasa a resolverse en cada paso para que la mano caiga
 * sobre la vertical del medio del pie. Medido: sin esto el brazo arrancaba ya a
 * 11,52° de la plomada y acababa a 56,94°, que es un puntal, no una cuerda.
 */
const PLOMADA: AcomodacionMov = {
  tipo: "plomada",
  familia: "shoulder",
  es: "el brazo cuelga a plomo del hombro",
  en: "the arm hangs plumb from the shoulder",
};

/** El tobillo persigue su orientación de partida: la planta no se despega. */
const PLANTA: AcomodacionMov = {
  tipo: "pitch",
  familia: "ankle",
  cadena: ["hip", "knee"],
  es: "el tobillo mantiene la planta en el suelo",
  en: "the ankle keeps the sole on the floor",
};

/**
 * LA MIRADA NO SE SUELTA DEL PUNTO. Lo pidió el diseñador para el peso muerto y
 * dio la razón: «en el mundo real, un peso muerto que se baja con el cuello en
 * flexión tiene mayor riesgo de producir alguna lesión espinal». Así que el
 * cuello deja de ser un ángulo del reparto —que iba de −51,8° a 19° por
 * interpolación, sin mirar a ninguna parte— y pasa a resolverse en cada paso
 * contra una marca fija del suelo, 2,25 m por delante de donde se pisa.
 */
const MIRADA: AcomodacionMov = {
  tipo: "mirada",
  familia: "neck",
  distanciaCm: 225,
  es: "la mirada se queda en su marca del suelo",
  en: "the gaze stays on its floor mark",
};

/**
 * LA BARRA ROZA EL CUERPO, NO LO ATRAVIESA (v0.2.98).
 *
 * «La barra debe detectar colisión con la pierna, el muslo y cadera (de forma
 * que la barra desliza anterior y sobre ellas, y al bloqueo no se hunde en el
 * cuerpo).» Es lo que hace un peso muerto de verdad: la barra sube ARRASTRANDO
 * por la espinilla y el muslo, y su carril lo dicta la superficie del cuerpo,
 * no una recta ideal.
 *
 * Sin esto la barra se hundía —medido a lo largo del gesto: 1,44 cm en la
 * espinilla, 1,36 en el muslo y 1,35 en la pelvis justo en el bloqueo, que es
 * donde más se ve—. El hombro es quien la mueve, porque el brazo es la cuerda
 * de la que cuelga: la plomada la lleva a la vertical del medio del pie y esta
 * acomodación la adelanta lo justo para salir de la carne, nunca hacia atrás.
 */
const ROCE: AcomodacionMov = {
  tipo: "roce",
  familia: "shoulder",
  segmentos: ["pierna-L", "pierna-R", "muslo-L", "muslo-R", "pelvis"],
  es: "la barra roza la pierna sin hundirse en ella",
  en: "the bar grazes the leg without sinking into it",
};

/**
 * EL EQUILIBRIO DE LA SENTADILLA (v0.2.99): la barra sobre el medio del pie.
 *
 * «La limitación del rango de movimiento del tobillo (dorsiflexión limitada)
 * hace que durante el movimiento la barra se desplace muy posterior al centro
 * de gravedad (el medio del pie). En el mundo real este atleta caería
 * irremediablemente hacia atrás producto del peso de la barra.» Medido: la
 * barra se iba hasta 50,5 cm por detrás del medio del pie a media bajada.
 *
 * La regla física es una sola —la carga se mantiene sobre la base de apoyo— y
 * quien la satisface es el TRONCO: la cadera retrocede al bajar y el pecho se
 * adelanta lo que haga falta para compensarla. Por eso la columna deja de estar
 * en el reparto y pasa a resolverse en cada paso, igual que el cuello en el
 * peso muerto.
 *
 * Y LA DIFERENCIA ENTRE FRONTAL Y TRASERA SALE SOLA, sin declararla en ninguna
 * parte, que es lo bonito: la barra va rígida al tronco pero apoyada en sitios
 * distintos —clavículas por delante, trapecios por detrás—, así que para dejar
 * el MISMO punto del suelo bajo la barra cada apoyo pide una inclinación
 * distinta. Es exactamente lo que describió el diseñador: «backsquat permite
 * mayor inclinación del torso porque usa más movilidad de cadera; en cambio,
 * frontsquat mantiene un torso vertical para prevenir la caída de la barra a
 * expensas de mayor rango de rodilla y tobillos».
 */
const EQUILIBRIO: AcomodacionMov = {
  tipo: "equilibrio",
  familia: "spine",
  es: "el tronco se inclina lo justo para dejar la barra sobre el medio del pie",
  en: "the trunk leans just enough to keep the bar over mid-foot",
};

/**
 * LA POSTURA NO SE CIERRA AL BAJAR (v0.2.99).
 *
 * El reparto solo mueve el eje X de cada articulación, así que la ABDUCCIÓN de
 * la cadera se quedaba en el valor de estar de pie (−10,29°) mientras la flexión
 * llegaba a −78,6°. Con la cadera tan flexionada, esos mismos 10° de abducción
 * ya no abren nada, y las piernas se juntaban: medido, la separación entre pies
 * pasaba de 60,1 cm a 39,4 durante la bajada, y volvía a abrirse al subir. La
 * postura de fondo del modelo tiene 60,8 cm y la cadera a −36,5° — o sea que la
 * apertura extra estaba en las posturas y el gesto no la recorría.
 *
 * Es exactamente lo que había descrito el diseñador al hablar del pie: la
 * apertura «se transmite por abducción y rotación externa de la cadera al
 * descender al bottom del squat». Así que la abducción deja de ser un valor
 * congelado y se RESUELVE en cada paso para conservar la separación entre las
 * dos pisadas, que es lo que no puede cambiar: los pies no se mueven del suelo.
 */
const APERTURA: AcomodacionMov = {
  tipo: "apertura",
  familia: "hip",
  es: "la cadera abduce para no cerrar la postura al bajar",
  en: "the hip abducts so the stance does not narrow on the way down",
};

/** Reparto de la sentadilla: manda la rodilla y la cadera la acompaña. */
const PATRON_SENTADILLA: AporteArticular[] = [
  { familia: "knee", bilateral: true, empuje: -1, peso: 1, es: "extensión de rodilla", en: "knee extension" },
  { familia: "hip", bilateral: true, empuje: 1, peso: 0.9, es: "extensión de cadera", en: "hip extension" },
];

/**
 * PLAN DE UNA SENTADILLA CON BARRA. Las dos son el mismo gesto —una sola fase,
 * de la postura de fondo a la de pie— y se diferencian solo en QUÉ POSTURAS,
 * porque el apoyo de la barra cambia. Sin plan, la sentadilla no tenía meta y
 * el gesto no paraba en la postura aprobada: seguía hasta topar en los límites
 * anatómicos, rodilla 150° y cadera −134,6° contra los 126° y −78,61° del
 * modelo, con la barra 37,5 cm por detrás del pie al final del recorrido.
 */
const planSentadilla = (id: string, arriba: string, fondo: string): PlanMov => ({
  id,
  zona: "inferior",
  origen: fondo,
  fases: [
    {
      id: "subida",
      es: "sentadilla",
      en: "squat",
      patron: PATRON_SENTADILLA,
      meta: arriba,
      hasta: { tipo: "meta" },
      acomodaciones: [PLANTA, APERTURA, EQUILIBRIO],
    },
  ],
});

export const PLANES: Record<string, PlanMov> = {
  "sentadilla-frontal": planSentadilla(
    "sentadilla-frontal",
    "Sentadilla frontal",
    "Sentadilla frontal (fondo)",
  ),
  "sentadilla-trasera": planSentadilla(
    "sentadilla-trasera",
    "Sentadilla trasera",
    "Sentadilla trasera (fondo)",
  ),

  /**
   * PESO MUERTO, en las dos fases que describió el diseñador.
   *
   * TIRÓN: manda la rodilla. El tronco NO se mueve (peso 0 en la columna): ese
   * es el gesto real —la cadera y el hombro suben a la vez, el ángulo del
   * tronco se conserva— y es también lo que mantiene la barra subiendo recta.
   * Termina cuando la barra pasa por encima de la rótula.
   *
   * BLOQUEO: manda la espalda, la cadera termina de abrirse y la mirada se
   * levanta. La rodilla acompaña con lo poco que le queda.
   */
  "peso-muerto": {
    id: "peso-muerto",
    zona: "bisagra",
    origen: "Peso muerto",
    fases: [
      {
        id: "tiron",
        es: "tirón",
        en: "pull",
        patron: [
          { familia: "knee", bilateral: true, empuje: -1, peso: 1, es: "extensión de rodilla", en: "knee extension" },
          { familia: "hip", bilateral: true, empuje: 1, peso: 0.79, es: "extensión de cadera", en: "hip extension" },
          { familia: "spine", bilateral: false, empuje: -1, peso: 0, es: "el tronco sostiene", en: "the trunk holds" },
        ],
        meta: "Peso muerto (rodilla)",
        hasta: { tipo: "barraSobreRotula" },
        acomodaciones: [PLANTA, PLOMADA, MIRADA, ROCE],
      },
      {
        id: "bloqueo",
        es: "bloqueo",
        en: "lockout",
        patron: [
          { familia: "spine", bilateral: false, empuje: -1, peso: 1, es: "extensión de espalda", en: "back extension" },
          { familia: "hip", bilateral: true, empuje: 1, peso: 0.3, es: "extensión de cadera", en: "hip extension" },
          { familia: "knee", bilateral: true, empuje: -1, peso: 0.3, es: "extensión de rodilla", en: "knee extension" },
        ],
        meta: "Peso muerto (bloqueo)",
        hasta: { tipo: "meta" },
        acomodaciones: [PLANTA, PLOMADA, MIRADA, ROCE],
      },
    ],
  },

  /**
   * PRESS VERTICAL, en una sola fase — y la sigmoide sale sola.
   *
   * El diseñador pidió que la barra «primero se aleje del rostro con flexión de
   * hombros, luego describa una curva sigmoidea que evita la cabeza y se
   * reposiciona en la vertical sobre la línea de equilibrio, y finalmente
   * complete la extensión de codos». Eso NO necesita dos fases: es lo que
   * dibuja el codo y el hombro yendo JUNTOS hasta su meta, porque el codo
   * empieza rápido (aleja) y el hombro remata (recoloca). Comprobado partiendo
   * el gesto de 56 maneras distintas: la mejor ganaba 0,23 cm de holgura y
   * pagaba 4,53 cm más de alejamiento del rostro.
   *
   * Lo que estaba mal era otra cosa. Primero, el peso del hombro: 0,55 es el de
   * la zona de fábrica, y el press con barra necesita 126,00/141,18 = 0,8925,
   * que es la razón EXACTA entre las dos posturas aprobadas. Y segundo, el
   * criterio de parada: el gesto moría cuando el codo topaba en su límite
   * anatómico (+15°) con el hombro a medio camino (−128° de −166°), así que la
   * barra acababa 36,41 cm por delante y 26,21 cm por debajo del bloqueo. Con
   * la META como criterio, los dos llegan a la vez y a donde tienen que llegar.
   */
  "press-vertical": {
    id: "press-vertical",
    zona: "superior",
    origen: "Press vertical",
    fases: [
      {
        id: "empuje",
        es: "empuje",
        en: "press",
        patron: [
          { familia: "elbow", bilateral: true, empuje: 1, peso: 1, es: "extensión de codo", en: "elbow extension" },
          { familia: "shoulder", bilateral: true, empuje: -1, peso: 0.8925, es: "flexión de hombro", en: "shoulder flexion" },
          // EL CUELLO VUELVE SOLO A NEUTRO. La salida lleva 12° de extensión
          // cervical —el clearance del rostro que pidió el diseñador— y el
          // bloqueo no nombra el cuello, así que su meta es CERO y el reparto
          // derivado lo devuelve a razón de 0,46°/paso. Al bajar hace lo
          // contrario y llega al rack con los 12° puestos, porque en tracción
          // la meta es `plan.origen`. El peso 0 es respaldo para cuando no hay
          // plan; con plan lo pone la falta.
          { familia: "neck", bilateral: false, empuje: 1, peso: 0, es: "la mirada vuelve al frente", en: "the gaze returns to level" },
        ],
        meta: "Press vertical (bloqueo)",
        hasta: { tipo: "meta" },
      },
    ],
  },
};

/** Todas las articulaciones que un plan mueve (patrones + acomodaciones). */
export function articulacionesDePlan(p: PlanMov, lado: LadoZona): string[] {
  const out: string[] = [];
  for (const f of p.fases) {
    for (const a of f.patron) out.push(...nombresDeFamilia(a.familia, a.bilateral, lado));
    // Las acomodaciones no declaran lado, así que se abren los DOS nombres: el
    // con sufijo (tobillo, hombro) y el pelado, porque las articulaciones
    // centrales no lo llevan. Sin el pelado, «neck» se quedaba con candado y la
    // acomodación de la mirada no podía tocarlo.
    for (const ac of f.acomodaciones ?? []) {
      out.push(ac.familia, ...nombresDeFamilia(ac.familia, true, lado));
    }
  }
  return [...new Set(out)];
}

/** Lados concretos sobre los que actúa una zona. */
export function ladosDe(lado: LadoZona): ("L" | "R")[] {
  return lado === "sim" ? ["L", "R"] : [lado];
}

/** Nombres de articulación de una familia según el lado pedido. */
export function nombresDeFamilia(
  familia: string,
  bilateral: boolean,
  lado: LadoZona,
): string[] {
  return bilateral ? ladosDe(lado).map((l) => `${familia}${l}`) : [familia];
}

/** Todas las articulaciones que una zona mueve en el lado dado (con acomodación). */
export function articulacionesDeZona(z: ZonaMov, lado: LadoZona): string[] {
  const out: string[] = [];
  for (const a of z.patron) out.push(...nombresDeFamilia(a.familia, a.bilateral, lado));
  if (z.acomodacion) {
    out.push(z.acomodacion.familia, ...nombresDeFamilia(z.acomodacion.familia, true, lado));
  }
  return out;
}
