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
  if (z.acomodacion) out.push(...nombresDeFamilia(z.acomodacion.familia, true, lado));
  return out;
}
