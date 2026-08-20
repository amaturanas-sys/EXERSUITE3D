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
   * EN EL FONDO EL PIE NO SE ORIENTA A MANO. Sale girado 35,6° hacia afuera
   * —igual que en el modelo, 36,2°— solo por la abducción de cadera, la flexión
   * y la rodilla; el eje largo del pie del maniquí acaba en (−0,583, 0, 0,812)
   * contra el (−0,591, 0, 0,807) medido.
   *
   * Y DE PIE TAMPOCO SE ORIENTA: EL PIE PIVOTA AL BAJAR (v0.2.97). Esto dio una
   * vuelta entera y merece quedar escrito, porque la conclusión intermedia era
   * falsa por culpa de CÓMO se medía.
   *
   * El diseñador pidió que los pies no se deslizaran, y midiéndolo con el centro
   * de la CAJA del pie salía que la puntera viajaba 10,13 cm y el talón 9,82 en
   * sentido contrario, girando sobre un punto a 29,43 cm del pie: derrape puro.
   * Se «arregló» declarando la apertura también de pie, con lo que el pie ya no
   * giraba nada. Pero el diseñador vio la versión anterior y dijo que aquella
   * era la buena: «los apoyos del pie no deben deslizarse sobre la superficie,
   * pero sí pueden experimentar un grado menor de rotación externa, que se
   * transmite por abducción y rotación externa de la cadera al descender».
   *
   * Tenía razón, y el error era de la medida: la caja de three está alineada con
   * el MUNDO, así que girar el pie sobre sí mismo ya le mueve el centro aunque
   * el pie no viaje. Midiendo la huella donde de verdad toca —el centroide de
   * los vértices apoyados— resulta que estos ángulos YA hacen pivotar el pie en
   * el sitio: la huella se mueve 0,01 cm mientras la puntera gira 35,8°. Es
   * atornillar el pie al bajar, que es exactamente el gesto real.
   *
   * Los cinco ángulos salen de resolver la pierna de pie pidiendo planta plana,
   * el MISMO CENTRO DE HUELLA que el fondo y la barra a plomo, con el pie recto
   * como única preferencia. Caen a menos de 0,4° de los que el diseñador ya
   * tenía en v0.2.95, que es la mejor señal de que aquello estaba bien.
   *
   * La planta queda plana en los dos extremos (su normal sale
   * (0,000, 1,000, 0,000)), que es la comprobación de que la cadena cierra.
   */
  "Sentadilla frontal": {
    // De pie bajo la barra: piernas rectas, tronco a plomo y el rack ya hecho.
    // En el modelo los brazos de la figura de pie y los del fondo son idénticos.
    // LA ESTAMPA DE SENTADILLA YA ESTÁ PUESTA DE PIE (v0.2.91). Nadie se coloca
    // bajo la barra con los pies juntos y los abre a mitad de bajada: la
    // apertura se elige ANTES, y de ahí en adelante los pies no se mueven.
    // Sin esto el maniquí abría 14,3 cm por lado al descender —medido—, que es
    // el gesto de quien se recoloca, no el de quien levanta.
    //
    // EL PIE PIVOTA, NO DERRAPA (v0.2.97). Estos cinco ángulos salen de resolver
    // la pierna de pie —con el fondo del modelo intacto— pidiendo tres cosas:
    // planta plana, el MISMO CENTRO DE HUELLA que en el fondo, y la barra a
    // plomo; con el pie recto como única preferencia. Residuos medidos: huella
    // 0,01 cm, planta 0,01°, barra 0,01 cm, y 892 vértices en contacto en los
    // dos extremos.
    //
    // La puntera sí gira: 35,8° de rotación externa al bajar, que es lo que
    // transmiten la abducción y la rotación externa de la cadera. Pero gira
    // SOBRE LA PROPIA HUELLA, que no se mueve: es atornillar el pie, no
    // arrastrarlo. Ojo con medirlo: con el centro de la CAJA del pie parece que
    // derrapa 10 cm, porque la caja está alineada con el mundo y girar el pie ya
    // le mueve el centro (ver `centroDeLaPisada` en Editor.ts).
    hipL: [0.42, 0.15, -10.29], hipR: [0.42, -0.15, 10.29],
    ankleL: [-0.43, 0, 10.3], ankleR: [-0.43, 0, -10.3],
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
    // EL TOBILLO SE RESUELVE, LA CADERA NO (v0.2.96). Cadera y rodilla son el
    // dato del .obj y no se tocan. El tobillo sí: los −47,39 salían de la
    // identidad plana `tobillo = −(cadera + rodilla)`, que es una aproximación,
    // y dejaba la planta 3,88° DE CANTO y despegada 0,27 cm del suelo — los
    // vértices en contacto caían de 892 a 256, así que lo que tocaba el suelo
    // era el collarín, no la suela. Resueltos contra planta horizontal quedan
    // en −43,46 y la normal sale (0, 1, 0) exacta.
    hipL: [-78.61, 3, -36.5], hipR: [-78.61, -3, 36.5],
    kneeL: [126, 0, 0], kneeR: [126, 0, 0],
    ankleL: [-43.46, 0, 9.13], ankleR: [-43.46, 0, -9.13],
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
  "Sentadilla trasera": {
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
    // MISMA PIERNA QUE LA FRONTAL, y por la misma razón: ver allí. El pie de
    // arriba y el del fondo son literalmente el mismo pie —misma orientación en
    // el mundo, misma separación— así que no se mueve al bajar ni al subir.
    hipL: [0.42, 0.15, -10.29], hipR: [0.42, -0.15, 10.29],
    ankleL: [-0.43, 0, 10.3], ankleR: [-0.43, 0, -10.3],
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
    ankleL: [-43.46, 0, 9.13], ankleR: [-43.46, 0, -9.13],
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
  "Peso muerto": {
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
    // resuelto contra él, la desviación queda en 0,1° y la vista sale 21° bajo
    // la horizontal. A 2,25 m —el centro de la horquilla de 2 a 2,5 que pidió
    // el diseñador— salen 57,9° (v0.2.97: antes eran 51,8, contra 2,0 m).
    neck: [-57.9, 0, 0],
  },
  /**
   * HITO DEL PESO MUERTO (v0.2.96): el punto donde la barra alcanza la rótula.
   *
   * No es un extremo del gesto — es la FRONTERA entre sus dos mitades, la que
   * describió el diseñador: «extensión de rodillas hasta subir la barra sobre
   * la patela, luego extensión de cadera para llevar la barra a nivel de la
   * pelvis». Sin un punto intermedio no hay manera de decir «hasta aquí manda
   * la rodilla», y el gesto salía con la rodilla clavada todo el recorrido.
   *
   * No se estima a ojo, como los otros: sale de DOS REGLAS MEDIBLES. La barra
   * queda 1,10 cm por encima del pivote de la rodilla —eso es «sobre la
   * patela»— y la TIBIA queda vertical, que es `cadera + rodilla = 0` en este
   * rig. Con esas dos, los ángulos de pierna quedan determinados, y la barra
   * cae a 0,00 cm del medio del pie: sigue a plomo, como manda la regla
   * sagital del ejercicio.
   *
   * El tronco NO se mueve respecto del suelo (los mismos 78°): en el tirón de
   * un peso muerto la cadera y el hombro suben a la vez y el ángulo del tronco
   * se conserva. El hombro de aquí es solo una semilla — durante el gesto lo
   * resuelve la plomada en cada paso, porque el brazo es una cuerda.
   */
  "Peso muerto (rodilla)": {
    spine: [78, 0, 0],
    hipL: [-23.77, 0, 0], hipR: [-23.77, 0, 0],
    kneeL: [23.77, 0, 0], kneeR: [23.77, 0, 0],
    ankleL: [0, 0, 0], ankleR: [0, 0, 0],
    shoulderL: [-64.2, 0, 0], shoulderR: [-64.2, 0, 0],
    // Resuelto contra la misma marca del suelo a 2,25 m (v0.2.97).
    neck: [-49.9, 0, 0],
  },
  /**
   * Bloqueo del peso muerto: de pie, cadera extendida y brazos colgando.
   *
   * EL CUELLO TERMINA EN NEUTRAL, mirando al frente (v0.2.98). Ha ido por tres
   * valores y conviene dejar el recorrido escrito: 19° de «punto medio» por
   * criterio en 0.2.91; 32° en 0.2.97, que es lo que exige la marca del suelo a
   * 2,25 m desde la cabeza ya erguida; y 0° ahora, que es lo que pidió el
   * diseñador al ver la subida entera: «eventualmente la posición del cuello se
   * fija hasta alcanzar la postura anatómica de quien mira hacia el frente
   * (pasa de extensión a neutral)».
   *
   * La marca del suelo sigue gobernando el cuello mientras el tronco está
   * inclinado —que es donde importa, porque bajar en flexión cervical es lo que
   * arriesga la espalda—; lo que ya no hace es pedir barbilla abajo de pie.
   */
  "Peso muerto (bloqueo)": {
    neck: [0, 0, 0],
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
  /**
   * PRESS VERTICAL — LA SALIDA (v0.2.97).
   *
   * LA REGLA VIEJA ERA LA CULPABLE. Aquí ponía «la barra sale del rack por la
   * misma vertical por la que sube al bloqueo», y sonaba razonable: si arriba y
   * abajo comparten vertical, el empuje es una recta. El problema es que la
   * vertical del bloqueo pasa por el medio del pie… y por la CARA. Con −40 de
   * hombro y −141,18 de codo la barra arrancaba a 0,17 cm POR DETRÁS del medio
   * del pie, a la altura del mentón, y su eje no rozaba la cabeza: la
   * ATRAVESABA de lado a lado —14,12 cm de cráneo medidos por rayo, entrando en
   * x=−7,17 y saliendo en x=+6,95— durante los primeros ocho pasos.
   *
   * El diseñador lo vio y dio la salida: «deberá iniciar con la barra
   * posicionada más hacia ANTERIOR e INFERIOR, al extender hombros y bajar la
   * altura de los codos». Es exactamente el reparto que tiene este rig:
   *
   *   · EL HOMBRO ES LA ÚNICA MANIVELA DE LA ALTURA DEL CODO. El codo describe
   *     un círculo de 21,86 cm de radio alrededor del hombro, así que su suelo
   *     absoluto son 114,10 cm y sólo hay 5,12 cm de bajada en todo el rig. El
   *     codo X no le mueve la altura ni un milímetro.
   *   · EL CODO X ES EL AVANCE DE LA BARRA: +0,59 cm por grado, casi lineal, sin
   *     tocar la altura del codo.
   *
   * De ahí −30 y −130. El hombro no baja más porque el codo retrocede 0,35 cm
   * por grado y pasado −20 deja de estar debajo de la barra (a −20 ya está 3,98
   * cm por detrás del medio del pie): el rack dejaría de parecer un rack. Y el
   * codo no se flexiona más porque −131,42 es donde la barra deja de despejar
   * la cabeza; −130 conserva 0,82 cm de holgura y 20° hasta el tope.
   *
   * Medido: barra a y=149,84 (3,49 cm más baja) y avance +9,22 (9,39 cm más
   * anterior), codo a 117,03 (2,19 más bajo), agarre intacto (47,74 cm) y
   * CERO pasos con penetración en la cabeza, contra los ocho de antes.
   *
   * Y LOS 12° DE CUELLO son la extensión cervical que pidió el diseñador:
   * «cuando el press parte hay un grado de extensión cervical que ayuda al
   * clearance del rostro». Compran 1,19 cm de holgura (0,82 → 2,01) por el 20 %
   * del rango. Ojo: son el COMPLEMENTO de la corrección del brazo, no su
   * sustituto — con la salida vieja habrían hecho falta 44° para llegar a cero,
   * porque allí la barra no rozaba el mentón, estaba metida en el cráneo.
   *
   * El cuello vuelve solo a neutro durante el empuje y se re-extiende al bajar:
   * lo hace el reparto del plan, sin declarar nada (ver `PLANES` en
   * movimientos.ts).
   */
  "Press vertical": {
    shoulderL: [-30, 0, 0], shoulderR: [-30, 0, 0],
    elbowL: [-130, 80, 0], elbowR: [-130, -80, 0],
    neck: [-12, 0, 0],
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
/**
 * POSTURAS INTERNAS (v0.2.97): las que el gesto ATRAVIESA, no las que se posan.
 *
 * El diseñador lo pidió para los tres ejercicios con barra: «conserva el press
 * con barra desde la base y elimina el que está en fase de bloqueo», «conserva
 * una única postura de partida para peso muerto, desde abajo, y elimina el resto
 * de ellas», y las sentadillas «frontsquat y backsquat a secas».
 *
 * Y tiene razón de fondo: desde que el gesto tiene CALENDARIO (ver `PLANES` en
 * movimientos.ts), los extremos y los hitos dejaron de ser algo que uno elige y
 * pasaron a ser adonde el movimiento LLEGA. Ofrecerlos en la lista invitaba a
 * saltar al final del ejercicio sin haberlo hecho.
 *
 * Siguen existiendo —son las METAS del plan, y la única fuente de verdad de sus
 * ángulos—, pero no se listan. `getPose` las encuentra igual.
 */
export const POSTURAS_INTERNAS = new Set<string>([
  "Sentadilla frontal (fondo)",
  "Sentadilla trasera (fondo)",
  "Peso muerto (rodilla)",
  "Peso muerto (bloqueo)",
  "Press vertical (bloqueo)",
]);

/**
 * Nombres que cambiaron al quedarse una sola postura por ejercicio. Se renombra
 * en la biblioteca guardada CONSERVANDO lo que el usuario hubiera editado.
 */
const RENOMBRADAS: Record<string, string> = {
  "Sentadilla frontal (arriba)": "Sentadilla frontal",
  "Sentadilla trasera (arriba)": "Sentadilla trasera",
  "Peso muerto (suelo)": "Peso muerto",
  "Press vertical (rack)": "Press vertical",
};

function conPosturasDeFabrica(previas: PoseMap): PoseMap {
  const out: PoseMap = {};
  for (const [nombre, def] of Object.entries(previas)) {
    const nuevo = RENOMBRADAS[nombre];
    if (nuevo && !(nuevo in previas)) out[nuevo] = def;
    else if (!nuevo) out[nombre] = def;
    // Si el nombre nuevo YA está en la biblioteca guardada, la entrada vieja
    // sobra: se descarta en vez de dejar las dos en la lista.
  }
  for (const [nombre, def] of Object.entries(BUILTIN_POSES)) {
    if (!(nombre in out)) out[nombre] = structuredClone(def);
  }
  // LAS INTERNAS SE REFRESCAN SIEMPRE. Son METAS del gesto, no posturas de
  // usuario: una copia guardada —de una versión anterior, o retocada cuando
  // todavía se listaban— se llevaría el aterrizaje del ejercicio a otros
  // ángulos sin que nadie se entere.
  for (const nombre of POSTURAS_INTERNAS) {
    if (BUILTIN_POSES[nombre]) out[nombre] = structuredClone(BUILTIN_POSES[nombre]);
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
      // Y se pasa por `conPosturasDeFabrica` para que también aquí valgan el
      // renombrado y el refresco de las internas.
      return conPosturasDeFabrica({ ...previas, ...structuredClone(BUILTIN_POSES) });
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

/**
 * Las posturas que se ofrecen para POSAR. Las internas —los extremos y los
 * hitos que el gesto atraviesa— no salen: ver `POSTURAS_INTERNAS`.
 */
export function poseNames(): string[] {
  return Object.keys(poses).filter((n) => !POSTURAS_INTERNAS.has(n));
}

/** Todas, incluidas las internas. Lo que necesita el motor del gesto. */
export function poseNamesTodas(): string[] {
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
