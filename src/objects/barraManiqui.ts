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
 * DÓNDE TOCA LA BARRA, medido por CONTACTO sobre el modelo del diseñador y no
 * por un desplazamiento contra el hombro.
 *
 * Lo intenté primero contra la articulación del hombro y salió mal: el hombro
 * de un cuerpo escaneado no tiene un centro evidente —según se estime por el
 * eje de la malla o por la costura con el pecho, se mueve cinco centímetros— y
 * con ese error la barra quedaba METIDA en el pecho 1,3 cm y en el brazo 1,1.
 * Se veía apoyada y estaba dentro.
 *
 * Lo que sí es inequívoco en el .obj son los vértices del cuerpo que tocan la
 * superficie del cilindro:
 *
 *  · FRONTAL — el cuello queda el 100 % por DETRÁS del eje de la barra y el
 *    pecho la toca a ±9,8 cm de la línea media: la barra se apoya en la CARA
 *    ANTERIOR, sobre clavículas y deltoides, 2,4 cm por debajo de lo alto del
 *    pecho. Es un apoyo HORIZONTAL, contra la pared del pecho.
 *  · TRASERA — el 80 % del cuerpo cercano queda por DELANTE del eje: la barra
 *    va detrás y se apoya ENCIMA, sobre la repisa del trapecio, 3,9 cm por
 *    delante de la espalda. Es un apoyo VERTICAL, sobre el hombro.
 *
 * Por eso los dos no se resuelven igual: uno es tangencia contra la superficie
 * de delante y el otro tangencia sobre la superficie de arriba. Y por eso se
 * calculan con un rayo contra la malla del tronco en vez de con constantes: el
 * punto de apoyo es una propiedad de ESE cuerpo, y si mañana se sustituye el
 * modelo del maniquí, el apoyo se recalcula solo.
 */
export const APOYO_RACK = {
  /** Frontal: cuánto por debajo de lo alto del pecho pasa el eje (cm a 175). */
  frontalBajoElHombro: 2.4,
  /** Trasera: cuánto por delante de la espalda pasa el eje (cm a 175). */
  traseraDesdeLaEspalda: 3.9,
  /** A qué distancia de la línea media se busca el apoyo (cm a 175). */
  medioAgarre: 9.8,
} as const;

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
  /**
   * Punto de apoyo sobre el tronco YA EN EL MUNDO (solo racks). Lo calcula el
   * editor una vez con `apoyoEnElTronco` y lo transforma cada fotograma con la
   * matriz del tronco, que es barato; lanzar rayos por fotograma no lo sería.
   */
  apoyoTronco?: THREE.Vector3 | null;
}

/**
 * PUNTO DE APOYO DE LA BARRA sobre el tronco, en coordenadas LOCALES de esa
 * malla.
 *
 * Es local a propósito: el contacto es una propiedad de la GEOMETRÍA del
 * tronco, no de la postura. Calculado una vez, vale para todo el recorrido —
 * el tronco gira y el apoyo gira con él— y no hay que lanzar rayos en cada
 * fotograma.
 */
/**
 * TANGENCIA EXACTA de un cilindro horizontal contra una nube de puntos.
 *
 * Aquí estaba el error que se veía en las capturas: yo colocaba la barra a la
 * distancia de UN punto muestreado con un rayo, pero la barra es un cilindro
 * tumbado y toca por donde le da la gana — basta que un vértice del hombro
 * quede más adelantado que el punto que muestreé para que la barra entre en la
 * carne. Con esto no hay muestreo: se calcula, para cada vértice que cae
 * dentro del ancho del cilindro, la cota a la que dejaría de tocarlo, y se
 * toma la más exigente de todas.
 *
 * `eje` dice qué coordenada se desliza: "z" acerca la barra por delante
 * (apoyo de la sentadilla frontal) y "y" la baja desde arriba (apoyo de la
 * trasera, sobre el trapecio).
 */
function tangencia(
  puntos: THREE.Vector3[],
  eje: "y" | "z",
  fijo: number,
  radio: number,
): number {
  let cota = -Infinity;
  for (const v of puntos) {
    const transversal = eje === "z" ? v.y - fijo : v.z - fijo;
    const dentro = radio * radio - transversal * transversal;
    if (dentro <= 0) continue; // fuera del ancho del cilindro: no puede tocarlo
    const c = (eje === "z" ? v.z : v.y) + Math.sqrt(dentro);
    if (c > cota) cota = c;
  }
  return cota;
}

/** Vértices de una malla llevados al sistema local de otra. */
function verticesEn(malla: THREE.Mesh, destino: THREE.Mesh): THREE.Vector3[] {
  const pos = malla.geometry.attributes.position as THREE.BufferAttribute;
  malla.updateMatrixWorld();
  destino.updateMatrixWorld();
  const out: THREE.Vector3[] = [];
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(malla.matrixWorld);
    out.push(destino.worldToLocal(v.clone()));
  }
  return out;
}

/**
 * PUNTO DE APOYO DE LA BARRA sobre el cuerpo, en coordenadas LOCALES del
 * tronco.
 *
 * Es local a propósito: el contacto es una propiedad de la GEOMETRÍA, no de la
 * postura. Calculado una vez, vale para todo el recorrido —el tronco gira y el
 * apoyo gira con él— y no hay que recalcular nada por fotograma.
 *
 * Los dos racks NO se resuelven igual, y es lo que enseña el .obj del
 * diseñador: en la frontal el cuello queda el 100 % por DETRÁS del eje de la
 * barra y el pecho la toca a los lados de la línea media —apoyo horizontal
 * contra clavículas y deltoides—; en la trasera el 80 % del cuerpo cercano
 * queda por DELANTE —la barra va detrás del cuello y se apoya ENCIMA, sobre la
 * repisa del trapecio—.
 */
export function apoyoEnElTronco(
  tronco: THREE.Mesh,
  cuello: THREE.Mesh | null,
  agarre: "frontal" | "trasera",
  radioBarra: number,
  refs: { cuelloY: number; hombroY: number; cuelloZ: number },
): THREE.Vector3 {
  const geo = tronco.geometry;
  if (!geo.boundingBox) geo.computeBoundingBox();
  const bb = geo.boundingBox as THREE.Box3;

  const puntos: THREE.Vector3[] = [];
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) puntos.push(v.fromBufferAttribute(pos, i).clone());
  if (cuello) puntos.push(...verticesEn(cuello, tronco));

  if (agarre === "frontal") {
    // ALTURA DE LA CLAVÍCULA: por debajo de la base del cuello y por encima
    // del hombro. Ahí es donde se apoya la barra en un rack frontal, y no en
    // lo alto del tronco —que en este cuerpo es ya el trapecio— ni a la altura
    // del hombro, que es el pecho.
    const y = refs.cuelloY - (refs.cuelloY - refs.hombroY) * 0.3;
    const z = tangencia(puntos, "z", y, radioBarra);
    return new THREE.Vector3(0, y, Number.isFinite(z) ? z : bb.max.z + radioBarra);
  }

  // DETRÁS DEL CUELLO: la barra se mete entre la nuca y el trapecio, así que
  // primero se busca hasta dónde llega el cuello hacia atrás y la barra se
  // pone justo detrás; luego se deja caer hasta que se apoya.
  let nucaZ = refs.cuelloZ;
  if (cuello) {
    for (const p of verticesEn(cuello, tronco)) {
      if (p.y > refs.hombroY && p.z < nucaZ) nucaZ = p.z;
    }
  }
  const z = nucaZ - radioBarra;
  const y = tangencia(puntos, "y", z, radioBarra);
  return new THREE.Vector3(0, Number.isFinite(y) ? y : bb.max.y + radioBarra, z);
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

  // El EJE de la barra sale de la línea que une los dos apoyos, no de una
  // horizontal fija: si el maniquí está girado en la escena la barra acompaña.
  let eje = der.clone().sub(izq);
  if (eje.lengthSq() < 1e-6) eje = new THREE.Vector3(1, 0, 0).applyQuaternion(a.tronco);
  eje.normalize();

  // PERO UNA BARRA ES UN SÓLIDO RÍGIDO Y NO SE ALABEA (v0.2.91). La cabecera
  // prometía esta ortogonalización desde el principio; el código no la hacía, y
  // la barra copiaba LITERALMENTE la recta entre los dos apoyos. Cualquier
  // asimetría la torcía sin tope: una sola mano apoyada en una pieza, una zona
  // armada en un solo lado, una articulación editada con la simetría
  // desmarcada. Medido: rotar UN codo 45° la inclinaba y le corría el centro
  // 7 cm. En una barra de verdad eso no pasa — son las manos las que se
  // acomodan a ella.
  //
  // Se proyecta el eje sobre el plano perpendicular al ARRIBA DEL TRONCO, que
  // es lo que hace que siga acompañando al maniquí cuando está tumbado o
  // girado, en vez de clavarla a la horizontal del mundo. La componente que se
  // descarta es exactamente la inclinación espuria.
  const arriba = new THREE.Vector3(0, 1, 0).applyQuaternion(a.tronco).normalize();
  const nivelado = eje.clone().addScaledVector(arriba, -eje.dot(arriba));
  // Si el eje viene casi paralelo al tronco, la proyección se queda sin
  // dirección y no hay nada que enderezar: se respeta lo que había.
  if (nivelado.lengthSq() > 1e-4) eje.copy(nivelado.normalize());
  // La malla de la barra es un cilindro tumbado sobre su eje Y local, así que
  // lo que hay que llevar sobre `eje` es +Y.
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), eje);

  // En los racks el sitio NO se deduce de los hombros: es el punto de apoyo
  // sobre el tronco, calculado por contacto y llevado al mundo con la matriz
  // del propio tronco. Sin apoyo —tronco todavía sin cargar— se cae al punto
  // medio de los hombros, que al menos deja la barra a la altura correcta.
  if (agarre !== "manos") {
    const pos = a.apoyoTronco
      ? a.apoyoTronco.clone()
      : izq.clone().add(der).multiplyScalar(0.5);
    return { pos, quat };
  }
  return { pos: izq.clone().add(der).multiplyScalar(0.5), quat };
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
