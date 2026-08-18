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
   * LOS BRAZOS son la diferencia de verdad, y el rack frontal los tuve mal dos
   * veces. LA MANO NO SUJETA LA BARRA POR ENCIMA: en un rack frontal los dedos
   * van POR DEBAJO y la retienen para que no ruede hacia delante y se caiga.
   * Midiéndolo con la barra puesta, mi primera versión dejaba la mano 8,2 cm
   * por ENCIMA del eje —apoyada sobre la barra, empujándola— y eso no sujeta
   * nada.
   *
   * Los ángulos de ahora son un ajuste contra CINCO medidas de la figura
   * frontal del .obj: mano 0,8 cm por debajo del eje, agarre a 34,1 cm de la
   * línea media, y codo 25,1 cm bajo la barra y 8,5 por delante. Salen mano
   * 0,1 cm del eje, agarre 37,6 y codo −24,5 / +3,9. Y ojo con el codo: en el
   * modelo del diseñador NO va alto, va veinticinco centímetros por debajo de
   * la barra. El agarre ancho es lo que compensa la falta de rango de hombro,
   * codo y muñeca, tal y como lo describió él. En la trasera el
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
    // LA ESTAMPA DE SENTADILLA YA ESTÁ PUESTA DE PIE (v0.2.91). Nadie se coloca
    // bajo la barra con los pies juntos y los abre a mitad de bajada: la
    // apertura se elige ANTES, y de ahí en adelante los pies no se mueven.
    // Sin esto el maniquí abría 14,3 cm por lado al descender —medido—, que es
    // el gesto de quien se recoloca, no el de quien levanta.
    //
    // 10,4° de abducción es lo que iguala la anchura del fondo (60,5 cm entre
    // los centros de los pies), resuelto contra el modelo. Con la rodilla recta
    // el tobillo deshace exactamente la abducción —de ahí que los dos ángulos
    // coincidan— y la planta queda plana.
    hipL: [0, 0, -10.4], hipR: [0, 0, 10.4],
    ankleL: [0, 0, 10.4], ankleR: [0, 0, -10.4],
    shoulderL: [-33, -24, 24], shoulderR: [-33, 24, -24],
    elbowL: [-140, 6, 0], elbowR: [-140, -6, 0],
    // EXTENSIÓN DE MUÑECA: es lo que hace que el puño ENVUELVA la barra en vez
    // de doblarse hacia dentro. Sin ella el eje del puño queda 54° cruzado con
    // el de la barra y la mano se ve pegada al lado, no agarrando; con ella
    // baja a 10,6°. Comprobado que la X positiva es extensión —con el brazo
    // colgando lleva la mano hacia atrás— y no flexión.
    wristL: [25, 0, 25], wristR: [25, 0, -25],
  },
  "Sentadilla frontal (fondo)": {
    // LA PIERNA DEL FONDO, RESUELTA POR GEOMETRÍA (v0.2.91) y no a ojo.
    //
    // Con los pies ya anclados, el sitio de la barra deja de depender de dónde
    // esté la pelvis: la pelvis es la RAÍZ del rig, así que plantar el pie
    // equivale a decir «la pelvis se coloca donde haga falta para que el pie
    // caiga en su marca». Y entonces el recorrido de la barra sale de una sola
    // cuenta: la barra va rígida al tronco, luego se desplaza EXACTAMENTE lo
    // que se desplace el pie respecto de la cadera.
    //
    // Para que no se desplace nada, el PIE tiene que quedar respecto de la
    // pelvis donde estaba de pie: 9,1 cm por delante. La RODILLA no se toca
    // —son los 126° medidos sobre el modelo del diseñador—, así que queda una
    // sola incógnita, la cadera, y el tobillo no es libre: cierra la cadena
    // (`tobillo = −(cadera + rodilla)`).
    //
    // Resuelto así, la barra pasa de irse 8,6 cm hacia atrás a quedarse en
    // 0,0, y de los tres ángulos DOS eran ya los correctos: −78,61 de cadera
    // frente a los −79 estimados y 9,01 de tobillo frente a 9. El que estaba
    // mal era el tobillo en X, −43 en vez de −47,39, y por eso la barra se
    // iba: 4° de tobillo son 8,6 cm de barra. La profundidad baja de 45,9 a
    // 43,2 cm, que es CONSECUENCIA y no objetivo — la marca la da el modelo.
    hipL: [-78.61, 3, -36.5], hipR: [-78.61, -3, 36.5],
    kneeL: [126, 0, 0], kneeR: [126, 0, 0],
    ankleL: [-47.39, 0, 9.01], ankleR: [-47.39, 0, -9.01],
    // El tronco a plomo: es lo que sostiene la barra sobre las clavículas.
    spine: [0, 0, 0],
    shoulderL: [-33, -24, 24], shoulderR: [-33, 24, -24],
    elbowL: [-140, 6, 0], elbowR: [-140, -6, 0],
    // EXTENSIÓN DE MUÑECA: es lo que hace que el puño ENVUELVA la barra en vez
    // de doblarse hacia dentro. Sin ella el eje del puño queda 54° cruzado con
    // el de la barra y la mano se ve pegada al lado, no agarrando; con ella
    // baja a 10,6°. Comprobado que la X positiva es extensión —con el brazo
    // colgando lleva la mano hacia atrás— y no flexión.
    wristL: [25, 0, 25], wristR: [25, 0, -25],
  },
  "Sentadilla trasera (arriba)": {
    // EL MISMO TRONCO QUE EN EL FONDO. Con la barra sobre los trapecios uno no
    // está perfectamente vertical arriba y se inclina 3° al bajar: se está ya
    // con esos 3°, y así el punto de apoyo de la barra no viaja con el pecho.
    spine: [3, 0, 0],
    // LA ESTAMPA DE SENTADILLA YA ESTÁ PUESTA DE PIE (v0.2.91). Nadie se coloca
    // bajo la barra con los pies juntos y los abre a mitad de bajada: la
    // apertura se elige ANTES, y de ahí en adelante los pies no se mueven.
    // Sin esto el maniquí abría 14,3 cm por lado al descender —medido—, que es
    // el gesto de quien se recoloca, no el de quien levanta.
    //
    // 10,4° de abducción es lo que iguala la anchura del fondo (60,5 cm entre
    // los centros de los pies), resuelto contra el modelo. Con la rodilla recta
    // el tobillo deshace exactamente la abducción —de ahí que los dos ángulos
    // coincidan— y la planta queda plana.
    hipL: [0, 0, -10.4], hipR: [0, 0, 10.4],
    ankleL: [0, 0, 10.4], ankleR: [0, 0, -10.4],
    shoulderL: [-41.5, -56, -26], shoulderR: [-41.5, 56, 26],
    elbowL: [-150, -52.5, 0], elbowR: [-150, 52.5, 0],
    // Aquí el puño ya salía casi alineado (13,4°) porque el agarre es cerrado
    // y el brazo va pegado; la extensión lo deja en 2,2°.
    wristL: [19.5, 0, 13], wristR: [19.5, 0, -13],
  },
  "Sentadilla trasera (fondo)": {
    // Misma pierna que la frontal, resuelta igual (ver la frontal). Cambia el
    // parámetro porque la caída es de 45,4 cm y no de 45,9: la barra sobre los
    // trapecios arranca más alta que sobre las clavículas.
    hipL: [-78.61, 3, -36.5], hipR: [-78.61, -3, 36.5],
    kneeL: [126, 0, 0], kneeR: [126, 0, 0],
    ankleL: [-47.39, 0, 9.01], ankleR: [-47.39, 0, -9.01],
    // 3°, no 18: es lo que de verdad se adelanta el pecho respecto de la pelvis.
    spine: [3, 0, 0],
    shoulderL: [-41.5, -56, -26], shoulderR: [-41.5, 56, 26],
    elbowL: [-150, -52.5, 0], elbowR: [-150, 52.5, 0],
    // Aquí el puño ya salía casi alineado (13,4°) porque el agarre es cerrado
    // y el brazo va pegado; la extensión lo deja en 2,2°.
    wristL: [19.5, 0, 13], wristR: [19.5, 0, -13],
  },
  /**
   * PRESS VERTICAL Y PESO MUERTO (v0.2.79). Estos NO salen del .obj del
   * diseñador —allí solo hay sentadillas—, así que no se estiman a ojo: se
   * resuelven contra las reglas que dan las láminas de referencia, ajustando
   * el rig con el mismo descenso por coordenadas que las sentadillas.
   *
   * LA REGLA DEL PESO MUERTO la fijó el diseñador y es de vista sagital: una
   * vertical imaginaria pasa por el MEDIO DEL PIE, la barra y los brazos, que
   * caen a plomo en línea recta hasta los hombros.
   *
   * Y LA FIRMA DE LA BISAGRA ES LA ESPINILLA CASI VERTICAL. Esto me costó dos
   * intentos. Con «compensa con más flexión de rodilla y cadera» entendí la
   * ARTICULACIÓN del rig y adelanté la rodilla 49°, y salió una cargada desde
   * el fondo, no un peso muerto: en una bisagra la flexión de cadera es el
   * TRONCO sobre el fémur, que en este esqueleto vive en `spine` porque la
   * pelvis es la raíz y no rota. La rodilla apenas rebasa el tobillo (15°), la
   * cadera se va atrás y arriba, y el tronco baja.
   *
   * Resuelto contra esas reglas: barra a 21,9 cm —los discos de 44 tocan el
   * suelo—, 0,2 cm del medio del pie, hombro a 1,1 cm de esa misma vertical,
   * brazo a 1,2° de la plomada, planta plana, espinilla a 15° y cadera 6,9 cm
   * POR ENCIMA de la rodilla.
   *
   * EL TRONCO SALE A 78° de la vertical, más horizontal que en la lámina. No
   * es un ajuste a ojo: con la espinilla clavada en 15° y la barra a la altura
   * del disco, es lo único que queda. El alcance del brazo de este esqueleto
   * —del hombro al centro de la mano— es de 56 cm, y cada centímetro que le
   * falta al brazo lo paga la columna.
   */
  "Peso muerto (suelo)": {
    hipL: [-79.8, 0, 0], hipR: [-79.8, 0, 0],
    kneeL: [94.8, 0, 0], kneeR: [94.8, 0, 0],
    ankleL: [-15, 0, 0], ankleR: [-15, 0, 0],
    spine: [78, 0, 0],
    // El hombro cuelga de la columna: inclinar el tronco se lleva el brazo con
    // él. Estos −76,8 son lo que hay que devolver para que el brazo caiga a
    // plomo, que es la primera regla de la lámina («arms are kept straight»).
    shoulderL: [-76.8, 0, 0], shoulderR: [-76.8, 0, 0],
    // LA MIRADA FIJA UN PUNTO A DOS METROS por delante de donde pisa, en el
    // suelo: es lo que mantiene la técnica y protege el cuello. Con el tronco
    // casi horizontal hace falta bastante extensión para llegar a ese blanco;
    // resuelto contra él, la desviación queda en 0,1° y la vista sale 26° bajo
    // la horizontal.
    neck: [-51.8, 0, 0],
  },
  /**
   * Bloqueo del peso muerto: de pie, cadera extendida y brazos colgando.
   *
   * EL CUELLO, A MITAD DE CAMINO, y esto lo decidió el diseñador. Manteniendo
   * la misma marca del suelo a dos metros, desde la cabeza ya erguida harían
   * falta 38° de barbilla abajo —es literalmente lo que pasa si no despegas la
   * vista del sitio—; con el cuello neutro, la mirada se va al frente. Los 19°
   * son el punto medio: quien relaja la vista al subir sin llegar a levantar la
   * cabeza.
   *
   * Que quede claro de dónde sale, porque no es como los demás ángulos de este
   * archivo: la salida del peso muerto está RESUELTA contra un blanco medible
   * —el punto del suelo— y esto es un criterio, no una medida.
   */
  "Peso muerto (bloqueo)": {
    neck: [19, 0, 0],
    // LA BARRA SOBRE EL MEDIO DEL PIE, también arriba (v0.2.91). La misma
    // regla sagital que gobierna el arranque vale en el bloqueo, y no se
    // cumplía: con los brazos colgando a plomo la barra quedaba 9,1 cm POR
    // DETRÁS de la vertical del medio del pie, porque el hombro del rig cae
    // sobre el tobillo y el medio del pie está 9,1 cm por delante de él.
    //
    // Lo que lo resuelve no es un truco: arriba la barra DESCANSA EN LOS
    // MUSLOS y son ellos los que empujan el brazo hacia delante. 9,41° de
    // flexión de hombro —resueltos contra el modelo— dejan la barra en z=9,12
    // contra un medio del pie en 9,11.
    shoulderL: [-9.41, 0, 0], shoulderR: [-9.41, 0, 0],
  },
  "Press vertical (rack)": {
    // LA BARRA SALE DEL RACK POR LA MISMA VERTICAL por la que sube al bloqueo.
    // Con el hombro en −30 y el codo en −150 el punto de partida quedaba 2,4 cm
    // por detrás y el press describía una coma en vez de una recta.
    //
    // El desvío cero no lo da un punto sino una CURVA de pares hombro/codo, y
    // sobre ella hay que elegir: cuanto más flexionado el hombro, más recorrido
    // le queda al empuje pero menos rango tiene el press. Se toma −40/−141,18
    // porque deja 7,9 cm de empuje —margen de sobra— con 37,6 cm de recorrido.
    shoulderL: [-40, 0, 0], shoulderR: [-40, 0, 0],
    elbowL: [-141.18, 80, 0], elbowR: [-141.18, -80, 0],
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
