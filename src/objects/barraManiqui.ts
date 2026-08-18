import * as THREE from "three";

/**
 * LA BARRA EN MANOS DEL MANIQUÍ (v0.2.81).
 *
 * Hasta aquí el maniquí posaba solo: se le daba una sentadilla frontal y se
 * veía a alguien sujetando aire. Lo que hace falta para diseñar un rack es lo
 * contrario —ver DÓNDE cae la barra cargada y si el gancho la recibe—, y para
 * eso la barra tiene que ser una pieza de verdad de la escena, con sus discos
 * y su peso, colgada de la figura.
 *
 * DE DÓNDE SALE LA BARRA EN CADA CONFIGURACIÓN. Hay dos maneras distintas y no
 * son intercambiables:
 *
 *  · En los dos RACKS la barra no la sujetan las manos, la sostiene el CUERPO:
 *    en la frontal se apoya en la cara anterior de los deltoides y las
 *    clavículas, y en la trasera sobre los trapecios. Las manos solo la
 *    estabilizan. Por eso su sitio se mide contra la ARTICULACIÓN DEL HOMBRO y
 *    en el marco del tronco: si el tronco se inclina, la barra se inclina con
 *    él, que es lo que pasa de verdad.
 *  · En press y peso muerto la barra SÍ va en las manos, así que su sitio es
 *    el punto medio entre las dos manos. Anclarla al hombro aquí daría una
 *    barra flotando lejos del agarre en cuanto el brazo se mueve.
 *
 * Los desplazamientos de los racks están MEDIDOS sobre la secuencia del
 * diseñador, contra el hombro y no contra una caja envolvente: 107 unidades
 * (11,9 cm) por delante y 43 (4,8 cm) por encima en la frontal; 51 (5,7 cm)
 * por detrás y 62 (6,9 cm) por encima en la trasera. Van referidos a un
 * maniquí de 175 cm y escalan con su talla.
 */

/** Dónde se apoya la barra respecto del cuerpo. */
export type AgarreBarra = "frontal" | "trasera" | "manos";

/** Talla del maniquí sobre la que se midieron los desplazamientos. */
export const TALLA_REFERENCIA = 175;

/**
 * Desplazamiento de la barra respecto del punto medio de los hombros, en el
 * marco del TRONCO y en cm de un maniquí de referencia. Solo para los racks:
 * el agarre «manos» no usa desplazamiento porque la barra va en la mano.
 */
export const ANCLAJE_RACK: Record<"frontal" | "trasera", [number, number, number]> = {
  frontal: [0, 4.8, 11.9],
  trasera: [0, 6.9, -5.7],
};

export interface EjercicioBarra {
  id: string;
  es: string;
  en: string;
  agarre: AgarreBarra;
  /** Las dos posturas del recorrido: el final alto y el final bajo. */
  arriba: string;
  fondo: string;
  /** Zona de movimiento con la que se simula (movimientos.ts). */
  zona: "superior" | "inferior" | "bisagra";
}

/**
 * Los cuatro gestos con barra que el maniquí sabe hacer. Cada uno trae SUS DOS
 * EXTREMOS porque un ejercicio no es una postura: el rack de sentadillas se
 * dimensiona por dónde queda la barra ARRIBA (para colgarla) y por dónde queda
 * ABAJO (para que los brazos de seguridad la cojan si falla).
 */
export const EJERCICIOS_BARRA: EjercicioBarra[] = [
  {
    id: "sentadilla-frontal",
    es: "Sentadilla frontal",
    en: "Front squat",
    agarre: "frontal",
    arriba: "Sentadilla frontal (arriba)",
    fondo: "Sentadilla frontal (fondo)",
    zona: "inferior",
  },
  {
    id: "sentadilla-trasera",
    es: "Sentadilla trasera",
    en: "Back squat",
    agarre: "trasera",
    arriba: "Sentadilla trasera (arriba)",
    fondo: "Sentadilla trasera (fondo)",
    zona: "inferior",
  },
  {
    id: "press-vertical",
    es: "Press vertical",
    en: "Overhead press",
    agarre: "manos",
    arriba: "Press vertical (bloqueo)",
    fondo: "Press vertical (rack)",
    zona: "superior",
  },
  {
    id: "peso-muerto",
    es: "Peso muerto",
    en: "Deadlift",
    agarre: "manos",
    arriba: "Peso muerto (bloqueo)",
    fondo: "Peso muerto (suelo)",
    zona: "bisagra",
  },
];

export const EJERCICIO_BARRA_POR_ID: Record<string, EjercicioBarra> =
  Object.fromEntries(EJERCICIOS_BARRA.map((e) => [e.id, e]));

/** Puntos del maniquí que hacen falta para colocar la barra. */
export interface ApoyosBarra {
  hombroL: THREE.Vector3;
  hombroR: THREE.Vector3;
  manoL: THREE.Vector3;
  manoR: THREE.Vector3;
  /** Orientación del tronco (para los racks, que van pegados a él). */
  tronco: THREE.Quaternion;
  /** Talla del maniquí en cm: los desplazamientos medidos escalan con ella. */
  alturaCm: number;
}

/**
 * SITIO DE LA BARRA para un agarre dado.
 *
 * El EJE de la barra sale de la línea que une los dos puntos de apoyo, no de
 * una horizontal fija: si el maniquí está girado en la escena, o una postura
 * queda asimétrica, la barra acompaña. Se ortogonaliza contra la vertical del
 * tronco para que no salga alabeada cuando los dos apoyos quedan a distinta
 * altura.
 */
export function sitioDeLaBarra(
  agarre: AgarreBarra,
  a: ApoyosBarra,
): { pos: THREE.Vector3; quat: THREE.Quaternion } {
  const izq = agarre === "manos" ? a.manoL : a.hombroL;
  const der = agarre === "manos" ? a.manoR : a.hombroR;
  const pos = izq.clone().add(der).multiplyScalar(0.5);

  if (agarre !== "manos") {
    const d = ANCLAJE_RACK[agarre];
    const k = a.alturaCm / TALLA_REFERENCIA;
    pos.add(new THREE.Vector3(d[0] * k, d[1] * k, d[2] * k).applyQuaternion(a.tronco));
  }

  // El eje mayor de la barra: de un apoyo al otro. Si los dos coincidieran
  // —imposible en un cuerpo, pero no en una postura corrupta— se cae al eje X
  // del tronco en vez de devolver un cuaternión inválido.
  let eje = der.clone().sub(izq);
  if (eje.lengthSq() < 1e-6) eje = new THREE.Vector3(1, 0, 0).applyQuaternion(a.tronco);
  eje.normalize();

  // La malla de la barra es un cilindro tumbado sobre su eje Y local, así que
  // lo que hay que llevar sobre `eje` es +Y.
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), eje);
  return { pos, quat };
}

/** Un sitio de la escena donde una barra puede quedarse apoyada. */
export interface GanchoBarra {
  objectId: string;
  nombre: string;
  /** Dónde iría el EJE de la barra (el asiento más su radio). */
  punto: THREE.Vector3;
  /** Dirección en la que la barra se tumba sobre este gancho. */
  eje: THREE.Vector3;
}
