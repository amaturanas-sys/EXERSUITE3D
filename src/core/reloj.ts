import * as THREE from "three";

/**
 * LA ESFERA DEL RELOJ COMO SISTEMA DE ÁNGULOS (v0.3.48).
 *
 * Un grado no dice nada por sí solo. «La bisagra va de 0° a 90°» obliga a
 * preguntar de qué 0 se habla: ¿de la pose de diseño?, ¿de las placas
 * enfrentadas?, ¿del eje X? Y la respuesta cambia con cada unión, así que el
 * mismo número significa cosas distintas en dos bisagras de la misma máquina.
 *
 * El reloj no tiene ese problema porque su cero no se negocia: **las 12 están
 * siempre arriba y las 6 siempre abajo**, en la máquina entera y en todas sus
 * piezas. «El respaldo va de las 12 a las 3» se entiende sin más contexto y se
 * comprueba mirando el modelo.
 *
 * CÓMO SE LEE UNA POSICIÓN. Es la AGUJA DE LA HORA:
 *
 *   · una hora son 30° (12 horas = la vuelta entera);
 *   · un minuto son 0,5°, o sea que `4:30` cae a medio camino entre el 4 y el
 *     5 — 135° —, igual que se dice en voz alta.
 *
 * Ojo con la otra lectura posible, que es la de la aguja LARGA: allí un minuto
 * vale 6° y cinco minutos son una hora. No es la que se usa aquí. Si alguna vez
 * hubiera que cambiar de convenio, el único número que se toca es
 * `GRADOS_POR_MINUTO`.
 *
 * DÓNDE ESTÁ EL 12 DE UNA UNIÓN. Una articulación gira en un plano, y la esfera
 * vive en ESE plano: el 12 es el «arriba» del mundo proyectado sobre él. Por
 * eso una bisagra con el eje VERTICAL no tiene reloj —su plano de giro es el
 * suelo, y en el suelo no hay arriba—: ahí `esferaDe` devuelve null y quien
 * llame tiene que decirlo, no inventarse una lectura.
 */

/** Una hora son 30°: doce horas dan la vuelta entera. */
export const GRADOS_POR_HORA = 30;
/** Y un minuto, la sesentava parte de una hora — aguja corta, no larga. */
export const GRADOS_POR_MINUTO = GRADOS_POR_HORA / 60;

/** Posición del reloj: hora 1..12 y minuto 0..59. */
export interface Hora {
  hora: number;
  minuto: number;
}

/** Normaliza a [0, 360). */
export function vuelta(grados: number): number {
  return ((grados % 360) + 360) % 360;
}

/** Diferencia más corta entre dos ángulos, en (−180, 180]. */
export function diferencia(a: number, b: number): number {
  return ((((a - b) % 360) + 540) % 360) - 180;
}

/** De grados de esfera (0 = las 12, creciendo en sentido horario) a hora. */
export function horaDesdeGrados(grados: number): Hora {
  const minutos = Math.round(vuelta(grados) / GRADOS_POR_MINUTO) % 720;
  const hora = Math.floor(minutos / 60);
  // Las 12, no las 0: en un reloj no existe la hora cero.
  return { hora: hora === 0 ? 12 : hora, minuto: minutos % 60 };
}

/** Y la vuelta. */
export function gradosDesdeHora(h: Hora): number {
  return vuelta((h.hora % 12) * GRADOS_POR_HORA + h.minuto * GRADOS_POR_MINUTO);
}

/** «4:30». Siempre con dos cifras de minuto, que es como se lee un reloj. */
export function formatearHora(grados: number): string {
  const { hora, minuto } = horaDesdeGrados(grados);
  return `${hora}:${String(minuto).padStart(2, "0")}`;
}

/**
 * Lee lo que el usuario escriba y lo pasa a grados de esfera.
 *
 * Se aceptan las formas en que la gente escribe una hora —`4:30`, `4h30`,
 * `4 30`— y también la hora decimal `4.5`, que es lo que sale de arrastrar un
 * mando. Devuelve null si no hay manera de entenderlo, y quien llama decide qué
 * hacer: aquí no se adivina.
 */
export function parsearHora(txt: string): number | null {
  const limpio = txt.trim().toLowerCase().replace(",", ".");
  if (!limpio) return null;
  const conMinutos = /^(\d{1,2})\s*[:h\s]\s*(\d{1,2})$/.exec(limpio);
  if (conMinutos) {
    const hora = Number(conMinutos[1]);
    const minuto = Number(conMinutos[2]);
    if (hora > 12 || minuto > 59) return null;
    return gradosDesdeHora({ hora, minuto });
  }
  const suelta = /^(\d{1,2})(\.\d+)?\s*h?$/.exec(limpio);
  if (suelta) {
    const horas = Number(limpio.replace(/h$/, "").trim());
    if (!Number.isFinite(horas) || horas > 12) return null;
    return vuelta(horas * GRADOS_POR_HORA);
  }
  return null;
}

/**
 * CUÁNTO BARRE UN TRAMO, dicho en tiempo: «1 h 30 min», «45 min».
 *
 * Una posición se nombra con una hora del reloj; una AMPLITUD no —«va de las 12
 * a las 3» no es «vale 3»—, así que se dice aparte y con su unidad, que es lo
 * que evita confundir las dos cosas al leer el panel de un vistazo.
 */
export function formatearAmplitud(grados: number): string {
  const total = Math.round(Math.abs(grados) / GRADOS_POR_MINUTO);
  const horas = Math.floor(total / 60);
  const minutos = total % 60;
  if (horas === 0) return `${minutos} min`;
  if (minutos === 0) return `${horas} h`;
  return `${horas} h ${minutos} min`;
}

/**
 * LA ESFERA DE UNA UNIÓN: dos vectores en el plano de giro, el del 12 y el de
 * las 3. Con ellos, leer una dirección es un `atan2`.
 */
export interface Esfera {
  /** Hacia dónde caen las 12 en el plano de giro. */
  arriba: THREE.Vector3;
  /** Y hacia dónde las 3, o sea el sentido horario. */
  tres: THREE.Vector3;
}

/**
 * DESDE QUÉ LADO SE MIRA UNA ESFERA.
 *
 * Un plano tiene dos caras y el reloj se ve al revés desde cada una: lo que
 * marca las 3 por delante marca las 9 por detrás. Así que la cara se elige con
 * una regla del MUNDO y no con la del pasador.
 *
 * Tomar la punta del eje parecía natural y está mal, y el error se ve en un
 * segundo: el pasador de una bisagra apunta hacia donde cayó el producto
 * vectorial al montarla —a veces +Z y a veces −Z, sin que el usuario lo haya
 * pedido ni lo vea—, así que dos bisagras idénticas de la misma máquina daban
 * horas espejadas. Eso es exactamente el mal que el reloj venía a curar.
 *
 * La regla es MIRAR DESDE DELANTE: se toma el sentido del eje que apunta hacia
 * el espectador de la vista frontal (+Z), y si el eje está contenido en ese
 * plano se desempata por +X y luego por +Y. El 12 sigue arriba y ahora las 3
 * están siempre a la derecha de quien mira la máquina.
 */
const MIRADAS = [
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(0, 1, 0),
];

/**
 * Esfera del plano perpendicular a `eje`, con el 12 arriba y las 3 a la
 * derecha de quien mira la máquina de frente.
 *
 * Devuelve null con el eje casi vertical: el plano de giro es entonces el
 * suelo, el «arriba» del mundo se proyecta en casi nada y la lectura daría
 * tumbos con cualquier temblor del modelo. Una corredera horizontal no tiene
 * horas, y decirlo es más útil que inventarlas.
 */
export function esferaDe(eje: THREE.Vector3): Esfera | null {
  const e = eje.clone().normalize();
  for (const mirada of MIRADAS) {
    const d = e.dot(mirada);
    if (Math.abs(d) > 1e-6) {
      if (d < 0) e.negate();
      break;
    }
  }
  const arriba = new THREE.Vector3(0, 1, 0).projectOnPlane(e);
  // |proyección| < 0,14 ≈ el eje a menos de 8° de la vertical.
  if (arriba.lengthSq() < 0.02) return null;
  arriba.normalize();
  return { arriba, tres: arriba.clone().cross(e).normalize() };
}

/** Qué hora marca una dirección sobre esa esfera, en grados [0, 360). */
export function lecturaDe(esfera: Esfera, dir: THREE.Vector3): number {
  return vuelta(
    THREE.MathUtils.RAD2DEG * Math.atan2(dir.dot(esfera.tres), dir.dot(esfera.arriba)),
  );
}

/**
 * La recta que lleva la escala interna de una unión a la esfera:
 * `lectura(grado) = vuelta(c0 + s · grado)`. La calcula el editor, que es quien
 * sabe dónde está la manecilla.
 */
export interface Recta {
  c0: number;
  s: 1 | -1;
}

/**
 * DE DOS HORAS A LOS GRADOS QUE GUARDA LA UNIÓN.
 *
 * EL TRAMO VA SIEMPRE EN SENTIDO HORARIO, de `desde` a `hasta`. No es una
 * limitación: es lo que quita del medio el mando que sobraba. Dos horas definen
 * DOS arcos —el de ida y el de vuelta—, y cuál de los dos se quiere no se puede
 * adivinar: tomar siempre el más corto prohibiría un brazo que barre tres
 * cuartos de vuelta, y tomar siempre el más largo prohibiría el caso normal.
 * Pero tampoco hace falta un botón de sentido, porque **el orden de las dos
 * horas ya lo dice**: de las 12 a las 3 es un cuarto de vuelta, y de las 3 a las
 * 12 son los tres cuartos que faltan. Lo elige el usuario, y lo elige
 * escribiendo.
 *
 * La cuenta delicada es la otra: el sentido horario y el sentido en que crece
 * la escala interna de la unión no tienen por qué coincidir —depende de hacia
 * dónde apunte el pasador—, y por eso `s` existe.
 *
 * `acotarPlaca` recorta a [0, 360]. La escala de placa de una bisagra NO da la
 * vuelta: su 0 son las placas enfrentadas —el cierre, donde el acero topa—, así
 * que un tramo que lo cruzara sería un recorrido que atraviesa el material. Se
 * recorta y se avisa; un pivote, que mide giro con signo, no necesita nada.
 */
export function tramoDesdeHoras(
  recta: Recta,
  desde: number,
  hasta: number,
  acotarPlaca: boolean,
): { min: number; max: number; recortado: boolean } {
  const amplitud = vuelta(hasta - desde);
  const gDesde = vuelta((desde - recta.c0) * recta.s);
  // Si la escala crece en sentido horario, `desde` es el mínimo; si crece al
  // revés, `desde` es el máximo y el tramo se cuenta hacia atrás.
  const crudoMin = recta.s === 1 ? gDesde : gDesde - amplitud;
  const crudoMax = crudoMin + amplitud;
  if (!acotarPlaca) return { min: crudoMin, max: crudoMax, recortado: false };
  const min = Math.min(360, Math.max(0, crudoMin));
  const max = Math.min(360, Math.max(0, crudoMax));
  return { min, max, recortado: min !== crudoMin || max !== crudoMax };
}

/**
 * Y la vuelta: qué horas enseñar para el tramo que la unión ya tiene puesto.
 *
 * Siempre en sentido horario, que es el mismo arco dicho de la única manera que
 * se lee sin pensar. Con el pasador al revés eso significa que `desde` es el
 * máximo de la escala y `hasta` el mínimo — y está bien: quien mira el panel no
 * tiene por qué saber hacia dónde cayó el pasador.
 */
export function horasDesdeTramo(
  recta: Recta,
  min: number,
  max: number,
): { desde: number; hasta: number } {
  const enMin = vuelta(recta.c0 + recta.s * min);
  const enMax = vuelta(recta.c0 + recta.s * max);
  return recta.s === 1
    ? { desde: enMin, hasta: enMax }
    : { desde: enMax, hasta: enMin };
}
