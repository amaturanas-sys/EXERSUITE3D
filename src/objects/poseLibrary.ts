// Biblioteca de posturas estandar del personaje, editable y persistente.
// Una postura = rotaciones (grados [x,y,z]) por nombre de articulacion.
// Convencion: miembros (cadera/rodilla/tobillo/hombro/codo) con X NEGATIVA
// flexionan hacia DELANTE (+Z); la columna con X POSITIVA inclina el torso
// hacia delante. Ver humanFigure.ts.

export type PoseDef = Record<string, [number, number, number]>;
export type PoseMap = Record<string, PoseDef>;

const STORAGE_KEY = "exersuite.poses.v2";
const STORAGE_KEY_V1 = "exersuite.poses.v1";

export const BUILTIN_POSES: PoseMap = {
  "De pie": {},
  /**
   * SENTADILLA PROFUNDA, medida sobre el modelo del diseñador (v0.2.75).
   *
   * Los ángulos anteriores —cadera 70, rodilla 110, tobillo 20, columna 25—
   * los puse a ojo y daban una sentadilla A MEDIAS: la figura bajaba, pero la
   * cadena no cerraba. Con la espinilla clavada casi vertical, la rodilla no
   * podía adelantarse, y sin rodilla adelante la cadera no tenía dónde ir, así
   * que el tronco se quedaba tieso. Se veía a alguien empezando a sentarse, no
   * a alguien en el fondo de una sentadilla.
   *
   * Estos salen de MEDIR el modelo, no de estimarlos. En él la figura baja al
   * 52 % de su altura de pie, y sacando los puntos de la silueta sagital —la
   * rodilla es lo más adelantado, el glúteo lo más atrasado, el tobillo donde
   * la pierna se estrecha sobre el pie— quedan:
   *
   *   espinilla  37,6° hacia delante        muslo   82° (casi horizontal)
   *   tronco     44,7° hacia delante        rodilla 119,5° de flexión
   *   cadera    126,6° de flexión           tobillo 37,6° de dorsiflexión
   *
   * Que el muslo salga horizontal y la cadera a la altura de la rodilla es la
   * comprobación de que es una sentadilla PARALELA de verdad y no un amago.
   *
   * OJO CON LA CADERA: aquí NO va el ángulo anatómico de flexión (los 126,6°
   * que forman tronco y muslo). En este esqueleto la cadera es la RAÍZ de la
   * pierna —`PARENT_JOINT.hipL` es `null`—, así que `hipX` se mide contra la
   * vertical de la figura y no contra el tronco. Poniendo los 127 anatómicos
   * el muslo apuntaba hacia ARRIBA, la espinilla salía casi vertical (7°) y el
   * pie se iba treinta centímetros hacia delante: una postura que parecía una
   * sentadilla en la captura y no lo era por dentro. Lo que va aquí son los
   * 82° que el muslo se separa de la vertical, y entonces la cadena cierra
   * sola: 82 − 120 = −38 de espinilla, que es justo la dorsiflexión del
   * tobillo, y por eso la planta queda plana en el suelo.
   */
  Sentadilla: {
    hipL: [-82, 0, 0], hipR: [-82, 0, 0],
    kneeL: [120, 0, 0], kneeR: [120, 0, 0],
    // 38° de dorsiflexión. Aquí ponía 20 «porque es el tope humano», y no lo
    // es: 20 es el tope SIN CARGA y de pie. En una sentadilla profunda con el
    // talón en el suelo el tobillo pasa de 35, y el modelo lo enseña. Con 20,
    // la espinilla no podía inclinarse y toda la postura salía incongruente —
    // que es exactamente lo que había que arreglar.
    ankleL: [-38, 0, 0], ankleR: [-38, 0, 0],
    spine: [45, 0, 0],
    shoulderL: [-70, 0, 0], shoulderR: [-70, 0, 0],
  },
  /**
   * SENTADILLA FRONTAL Y TRASERA (v0.2.78), medidas sobre la secuencia que
   * mandó el diseñador: cuatro figuras con barra —de pie y fondo de cada una—.
   *
   * No están leídas de la captura: el .obj trae cada parte del cuerpo como
   * objeto propio en la pareja frontal, así que muslo, tibia, pie, brazo,
   * antebrazo y mano se miden como SEGMENTOS, y los centros articulares salen
   * de donde dos mallas vecinas se solapan. Los grados que van aquí abajo no
   * son esas medidas transcritas, sino el resultado de AJUSTAR EL RIG contra
   * ellas: un descenso por coordenadas sobre los ejes que cada articulación
   * tiene, buscando que los segmentos del maniquí apunten adonde apuntan los
   * del modelo. El residuo es ~1° en la pierna y en el brazo frontal y ~6° en
   * el trasero, que es lo que se puede pedir cuando el tronco y los brazos de
   * esa pareja vienen fundidos en una sola malla y hay que sacarlos por cortes.
   *
   * LO QUE ENSEÑA EL MODELO, y es lo interesante: las PIERNAS hacen lo mismo en
   * las dos. Los extremos de muslo, tibia y pie de la figura frontal y de la
   * trasera coinciden unidad a unidad una vez restada la separación entre
   * ambas: no se parecen, son la misma pierna. Lo que distingue una sentadilla
   * de la otra es SOLO dónde va la barra y qué hacen los brazos para sujetarla.
   *
   * Dónde va la barra, medido contra la articulación del hombro —no contra una
   * caja envolvente, que es lo que me había desviado antes—: 107 unidades (12
   * cm) DELANTE del hombro en la frontal, sobre deltoides y clavícula, y 51
   * unidades (5,7 cm) DETRÁS en la trasera, sobre los trapecios.
   *
   * EL TRONCO CASI NO CAMBIA, y esto corrige lo que yo mismo había escrito
   * aquí. Registrando la malla del pecho de la figura de pie sobre la del
   * fondo —es la misma malla, vértice a vértice, así que la rotación rígida
   * entre ambas es exacta— el giro sale 0,0° en las dos sentadillas. Lo único
   * que se mueve en la trasera es que el pecho se adelanta 20,8 unidades
   * respecto de la pelvis sobre un tronco de 350: 3,4°. Así que las dos bajan
   * con el tronco a plomo y la trasera solo 3° más inclinada. Tiene sentido en
   * una sentadilla trasera ALTA como esta —barra sobre el trapecio, no sobre
   * la espina de la escápula—; lo que no tenía sentido eran los 18° que puse
   * antes, sacados de la inclinación de una caja envolvente que en realidad
   * medía los brazos.
   *
   * LOS BRAZOS son la diferencia de verdad. En la frontal el codo se va
   * ADELANTE y ABAJO (46° de flexión de hombro) y el antebrazo se pliega 126°
   * para devolver la mano al hombro, por debajo de la barra. En la trasera el
   * hombro apenas flexiona 19°, abre 26° hacia afuera y el codo cae 21 cm por
   * debajo del hombro mientras el antebrazo sube a la barra por detrás. Ese
   * codo pide más flexión de la que da el tope humano, así que se queda en los
   * −150 del rango: es agarre cerrado de sentadilla trasera, y ahí el codo va
   * al máximo de verdad.
   *
   * EL PIE NO SE ORIENTA A MANO. Sale girado 36° hacia afuera —igual que en el
   * modelo, 36,2°— solo por la abducción de cadera, la flexión y la rodilla;
   * el eje largo del pie del maniquí acaba en (−0,583, 0, 0,812) contra el
   * (−0,591, 0, 0,807) medido. Y la planta queda plana (su normal sale
   * (0,000, 1,000, 0,000)), que es la comprobación de que la cadena cierra.
   */
  "Sentadilla frontal (arriba)": {
    // De pie bajo la barra: piernas rectas, tronco a plomo y el rack ya hecho.
    // En el modelo los brazos de la figura de pie y los del fondo son idénticos.
    shoulderL: [-50, -24.5, -10.5], shoulderR: [-50, 24.5, 10.5],
    elbowL: [-121, -22, 0], elbowR: [-121, 22, 0],
  },
  "Sentadilla frontal (fondo)": {
    hipL: [-79, 3, -36.5], hipR: [-79, -3, 36.5],
    kneeL: [126, 0, 0], kneeR: [126, 0, 0],
    ankleL: [-43, 0, 9], ankleR: [-43, 0, -9],
    // El tronco a plomo: es lo que sostiene la barra sobre las clavículas.
    spine: [0, 0, 0],
    shoulderL: [-50, -24.5, -10.5], shoulderR: [-50, 24.5, 10.5],
    elbowL: [-121, -22, 0], elbowR: [-121, 22, 0],
  },
  "Sentadilla trasera (arriba)": {
    shoulderL: [-41.5, -56, -26], shoulderR: [-41.5, 56, 26],
    elbowL: [-150, -52.5, 0], elbowR: [-150, 52.5, 0],
  },
  "Sentadilla trasera (fondo)": {
    // Misma pierna, exactamente, que la frontal.
    hipL: [-79, 3, -36.5], hipR: [-79, -3, 36.5],
    kneeL: [126, 0, 0], kneeR: [126, 0, 0],
    ankleL: [-43, 0, 9], ankleR: [-43, 0, -9],
    // 3°, no 18: es lo que de verdad se adelanta el pecho respecto de la pelvis.
    spine: [3, 0, 0],
    shoulderL: [-41.5, -56, -26], shoulderR: [-41.5, 56, 26],
    elbowL: [-150, -52.5, 0], elbowR: [-150, 52.5, 0],
  },
  /**
   * PRESS VERTICAL Y PESO MUERTO (v0.2.79). Estos NO salen del .obj del
   * diseñador —allí solo hay sentadillas—, así que no se estiman a ojo: se
   * resuelven contra las reglas que dan las láminas de referencia, ajustando
   * el rig con el mismo descenso por coordenadas que las sentadillas.
   *
   * LA REGLA DEL PESO MUERTO la fijó el diseñador y es de vista sagital: una
   * vertical imaginaria pasa por el MEDIO DEL PIE, la barra y los brazos, que
   * caen a plomo en línea recta hasta los hombros. Y con proporciones
   * estándar, quien no llega a la barra compensa con MÁS FLEXIÓN DE RODILLA Y
   * CADERA, no inclinando más el tronco. Esta postura cumple las dos cosas:
   * barra 0,6 cm del medio del pie, hombro 0,9 cm de esa misma vertical, brazo
   * a 1,5° de la plomada, planta plana y cadera 2,7 cm POR ENCIMA de la
   * rodilla (que es lo que separa un peso muerto de una cargada desde el
   * fondo).
   *
   * LO QUE CUESTA, y conviene tenerlo escrito: con este esqueleto el alcance
   * del brazo —del hombro al centro de la mano— es de 56 cm. Con la espinilla
   * en los 15° que enseña la lámina, la mano no baja de 28,5 cm por mucha
   * cadera que se flexione; para llegar a los 22,5 cm del disco de 45 hay que
   * adelantar la rodilla hasta los 49° y aun así la mano queda a 26,7. Es
   * decir: la vertical y la cadera sobre la rodilla se respetan, y lo que cede
   * son cuatro centímetros de altura de barra.
   */
  "Peso muerto (suelo)": {
    hipL: [-86, 0, 0], hipR: [-86, 0, 0],
    kneeL: [135, 0, 0], kneeR: [135, 0, 0],
    ankleL: [-49, 0, 0], ankleR: [-49, 0, 0],
    spine: [31.5, 0, 0],
    // El hombro cuelga de la columna: inclinar el tronco se lleva el brazo con
    // él. Estos −30 son lo que hay que devolver para que el brazo caiga a
    // plomo, que es la primera regla de la lámina («arms are kept straight»).
    shoulderL: [-30, 0, 0], shoulderR: [-30, 0, 0],
    // LA MIRADA FIJA UN PUNTO A DOS METROS por delante de donde pisa, en el
    // suelo: es lo que mantiene la técnica y protege el cuello. Resuelto
    // contra ese blanco, la desviación queda en 0,1° y la vista sale 29° bajo
    // la horizontal con la cabeza a 100 cm.
    neck: [-2.5, 0, 0],
  },
  /**
   * Bloqueo del peso muerto: de pie, cadera extendida y brazos colgando.
   *
   * El cuello se queda NEUTRO a propósito. Manteniendo la misma marca del
   * suelo a dos metros, desde la cabeza ya erguida haría falta bajar la
   * barbilla 38°, y eso ya no protege nada: la marca sirve mientras el tronco
   * está inclinado, que es cuando el cuello corre peligro.
   */
  "Peso muerto (bloqueo)": {},
  "Press vertical (rack)": {
    shoulderL: [-30, 0, 0], shoulderR: [-30, 0, 0],
    elbowL: [-150, 80, 0], elbowR: [-150, -80, 0],
  },
  /** Bloqueo del press: codos extendidos y barra sobre el medio del pie. */
  "Press vertical (bloqueo)": {
    // −166 y no −180: con el brazo del todo vertical la mano se iba detrás de
    // la vertical del pie. Así la barra queda sobre el medio del pie (0,2 cm)
    // y la mano 15,9 cm por encima de la cabeza.
    shoulderL: [-166, 0, 0], shoulderR: [-166, 0, 0],
    elbowL: [0, 0, 0], elbowR: [0, 0, 0],
  },
  Sentado: {
    hipL: [-85, 0, 0], hipR: [-85, 0, 0],
    kneeL: [95, 0, 0], kneeR: [95, 0, 0],
    shoulderL: [-20, 0, 0], shoulderR: [-20, 0, 0],
    elbowL: [-55, 0, 0], elbowR: [-55, 0, 0],
  },
  Remo: {
    spine: [35, 0, 0],
    hipL: [-15, 0, 0], hipR: [-15, 0, 0],
    kneeL: [25, 0, 0], kneeR: [25, 0, 0],
    shoulderL: [20, 0, 0], shoulderR: [20, 0, 0],
    elbowL: [-105, 0, 0], elbowR: [-105, 0, 0],
  },
  Press: {
    shoulderL: [-165, 0, 0], shoulderR: [-165, 0, 0],
    elbowL: [-10, 0, 0], elbowR: [-10, 0, 0],
  },
  // POSTURAS DE PARTIDA DE LOS CUATRO MOVIMIENTOS CLÁSICOS (v0.2.49).
  //
  // El movimiento lo pone la primitiva (zona + empuje/tracción); el PLANO lo
  // pone la postura. Estas cuatro son el punto de partida de cada uno, con la
  // base sentada, para que salgan bien con solo marcar «tren superior» y
  // pulsar 8 o 9.
  "Empuje horizontal": {
    hipL: [-85, 0, 0], hipR: [-85, 0, 0],
    kneeL: [95, 0, 0], kneeR: [95, 0, 0],
    // Codos atrás y manos al pecho: al empujar, el brazo sale hacia delante.
    shoulderL: [-15, 0, 0], shoulderR: [-15, 0, 0],
    elbowL: [-100, 0, 0], elbowR: [-100, 0, 0],
  },
  "Tracción horizontal": {
    hipL: [-85, 0, 0], hipR: [-85, 0, 0],
    kneeL: [95, 0, 0], kneeR: [95, 0, 0],
    // Brazos estirados al frente: al traccionar, el codo dobla y el hombro
    // vuelve al costado. Es el remo.
    shoulderL: [-75, 0, 0], shoulderR: [-75, 0, 0],
    elbowL: [-10, 0, 0], elbowR: [-10, 0, 0],
  },
  "Empuje vertical": {
    hipL: [-85, 0, 0], hipR: [-85, 0, 0],
    kneeL: [95, 0, 0], kneeR: [95, 0, 0],
    // Manos a la altura de los hombros con el codo muy doblado: al empujar,
    // el brazo sube. Es el press militar.
    shoulderL: [-100, 0, 0], shoulderR: [-100, 0, 0],
    elbowL: [-130, 0, 0], elbowR: [-130, 0, 0],
  },
  "Tracción vertical": {
    hipL: [-85, 0, 0], hipR: [-85, 0, 0],
    kneeL: [95, 0, 0], kneeR: [95, 0, 0],
    // Brazos estirados por encima de la cabeza: al traccionar, la barra baja.
    // Es el jalón.
    shoulderL: [-165, 0, 0], shoulderR: [-165, 0, 0],
    elbowL: [-10, 0, 0], elbowR: [-10, 0, 0],
  },
};

let poses: PoseMap = load();

/**
 * Añade a la biblioteca guardada las posturas de FÁBRICA que no estén.
 *
 * Sin esto, quien ya tenía biblioteca no veía nunca las posturas que trae una
 * versión nueva —las de los cuatro movimientos clásicos, por ejemplo—: se
 * guardaba una copia el primer día y no se volvía a mirar el catálogo. Las que
 * el usuario haya modificado se respetan tal cual.
 */
function conPosturasDeFabrica(previas: PoseMap): PoseMap {
  const out = { ...previas };
  for (const [nombre, def] of Object.entries(BUILTIN_POSES)) {
    if (!(nombre in out)) out[nombre] = structuredClone(def);
  }
  return out;
}

function load(): PoseMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return conPosturasDeFabrica(JSON.parse(raw) as PoseMap);
    // MIGRACIÓN v1 → v2 (v0.2.38): el codo doblaba al revés, así que las
    // posturas guardadas con el criterio viejo se pasan al nuevo cambiando
    // el signo de su flexión. Las que el usuario creó se conservan.
    const viejo = localStorage.getItem(STORAGE_KEY_V1);
    if (viejo) {
      const previas = JSON.parse(viejo) as PoseMap;
      for (const pose of Object.values(previas)) {
        for (const art of ["elbowL", "elbowR"]) {
          if (pose[art]) pose[art] = [-pose[art][0], pose[art][1], pose[art][2]];
        }
      }
      // Las de fábrica se rehacen: pueden haber cambiado por otros motivos.
      return { ...previas, ...structuredClone(BUILTIN_POSES) };
    }
  } catch {
    /* sin persistencia disponible */
  }
  return structuredClone(BUILTIN_POSES);
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(poses));
  } catch {
    /* ignora si no hay localStorage */
  }
}

export function poseNames(): string[] {
  return Object.keys(poses);
}

export function getPose(name: string): PoseDef | undefined {
  return poses[name];
}

export function setPose(name: string, def: PoseDef): void {
  poses[name] = def;
  persist();
}

export function removePose(name: string): void {
  delete poses[name];
  persist();
}

export function isBuiltin(name: string): boolean {
  return name in BUILTIN_POSES;
}

/** Restaura la biblioteca a las posturas de fabrica. */
export function resetDefaultPoses(): void {
  poses = structuredClone(BUILTIN_POSES);
  persist();
}
