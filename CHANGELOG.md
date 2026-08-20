# Changelog

Todos los cambios notables de **EXERSUITE3D** se documentan aquí.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y el proyecto usa [Versionado Semántico](https://semver.org/lang/es/).

## [0.2.100] — 2026-08-20

La sentadilla frontal deja de equilibrarse con el tronco y pasa a hacerlo con la
cadera, que es lo que le permite quedarse vertical.

### Corregido

**La frontal mantiene el torso vertical, y ahora sí.** El diseñador dio la
trasera por buena y señaló la frontal: le faltaban «las correcciones necesarias
(mediante dorsiflexión del tobillo y anteriorización de la rodilla para mantener
el torso vertical asociada a abducción y rotación externa de cadera al
descender)».

El diagnóstico era claro en cuanto se miraba: **las dos posturas de fondo tenían
la MISMA PIERNA** —cadera −78,61°, rodilla 126°, tobillo −43,46°— y solo se
diferenciaban en el tronco y en los brazos. Con la barra delante y esa pierna, la
única forma que tenía la frontal de equilibrarse era echar el tronco un poco
hacia ATRÁS (−2,9° en el fondo, y oscilando hasta +6,9° por el camino). Un apaño,
no un gesto.

Así que en la frontal la incógnita cambia de sitio. La trasera equilibra con el
TRONCO —y se queda como está, aprobada—; la frontal equilibra con la CADERA: el
tronco no se toca, la rodilla manda el descenso y lo que se resuelve contra el
medio del pie es cuánto se echan atrás las caderas. Medido en el gesto entero:

| | frontal | trasera |
|---|---|---|
| tronco en el fondo | **0,00°** (0,00° en todo el gesto) | 18,72° (hasta 27,07°) |
| tobillo | 4,93° → **−39,28°** | 3,48° → −43,49° |
| rodilla sobre la puntera | −25,95 → **+4,89 cm** | −24,94 → +6,96 cm |
| abducción de cadera | −10,64° → **−37,44°** | −10,33° → −36,53° |
| barra sobre el medio del pie | **0,00 cm** | 0,00 cm |

Y para que las dos incógnitas de la cadera —su flexión, que equilibra, y su
abducción, que sostiene la anchura— no se estropeen la una a la otra, el paso
resuelve sagital, lateral y sagital otra vez. Con la apertura sola por delante,
la postura de la frontal oscilaba entre 59,2 y 62,7 cm de separación; ahora se
queda en 59,9–61,3 y la pisada viaja 0,52 cm.

Por el camino, dos cosas que costaron encontrar y conviene dejar escritas. La
primera: la pelvis es la RAÍZ del rig, así que girar la cadera mueve las PIERNAS
y no el tronco — con la huella congelada como blanco, la función que busca el
equilibrio salía casi plana y la cadera no se movía ni un grado. Se mide contra
la huella de cada sondeo, y lo que se anula es la distancia RELATIVA entre barra
y pisada, que es justo lo que sobrevive al replantado del final del paso. La
segunda: el tobillo tiene que acompañar DENTRO de cada sondeo —`tobillo =
objetivo − (cadera + rodilla)`, la cadena cerrada del apoyo—, porque mover la
cadera sin mover el tobillo levanta el pie y entonces «el medio del pie» no
significa nada: el primer intento saturó la cadera en su tope de +30° y el
tobillo en el suyo de −50°.

### Medido, y para que lo decida el diseñador

La frontal sale con **menos** dorsiflexión y **menos** rodilla por delante que la
trasera (−39,3° contra −43,5°, y 4,89 cm contra 6,96), cuando el diseñador
esperaba lo contrario: «a expensas de mayor rango de rodilla y tobillos». No es
un fallo del solucionador —es geometría del modelo—: en esta figura la barra del
rack frontal queda unos 11 cm por delante de la línea de la cadera, así que un
tronco vertical ya deja las caderas MÁS atrás de lo que las deja el tronco
inclinado 18,7° de la trasera, y con la misma rodilla de 126° la espinilla viaja
menos.

Hay dos palancas para invertirlo, y las dos tocan un número aprobado:

1. **La rodilla del fondo de la frontal**, hoy los mismos 126° medidos sobre el
   modelo. Subirla es literalmente «mayor rango de rodilla», y arrastra la
   dorsiflexión detrás.
2. **La altura del rack frontal**, hoy un 30% del cuello hacia el hombro. Subirlo
   hacia la base del cuello acerca la barra al eje del tronco —el tronco se
   estrecha ahí— y adelanta las caderas.

### Añadido

- `prueba-gesto-barra` mide ahora, en las dos sentadillas, la dorsiflexión del
  tobillo, la abducción de la cadera y cuánto asoma la rodilla por delante de la
  puntera a lo largo del gesto. Son los tres criterios que dio el diseñador, y
  hasta ahora ninguno estaba comprobado.

## [0.2.99] — 2026-08-20

Las sentadillas dejan de caerse hacia atrás, y la frontal sale más vertical que
la trasera sin que nadie se lo diga.

### Corregido

**La barra se queda sobre el medio del pie.** «La limitación del rango de
movimiento del tobillo (dorsiflexión limitada) hace que durante el movimiento la
barra se desplace muy posterior al centro de gravedad (el medio del pie) [...]
en el mundo real este atleta caería irremediablemente hacia atrás producto del
peso de la barra.» Medido: la barra llegaba a **50,5 cm por detrás** del medio
del pie a media bajada. Ahora se queda en **0,00 cm** en todos los pasos, ida y
vuelta, en las dos sentadillas.

La regla física es una sola —la carga sobre la base de apoyo— y quien la cumple
es el TRONCO, porque la cadera retrocede al bajar y el pecho tiene que
adelantarse para compensarla. Así que la columna deja de ser un ángulo del
reparto y se resuelve en cada paso por bisección, midiendo la barra en vivo
contra la pisada.

**Y LA DIFERENCIA ENTRE FRONTAL Y TRASERA SALE SOLA**, que es lo mejor de este
arreglo: no está declarada en ninguna parte. La barra va rígida al tronco pero
apoyada en sitios distintos —clavículas por delante, trapecios por detrás—, así
que dejar el mismo punto del suelo debajo pide inclinaciones distintas. Medido
en el fondo: la frontal **−2,9°** (torso vertical, nunca pasa de 6,9° en todo el
gesto) contra la trasera **18,7°** (hasta 27,1°). Es exactamente lo que había
descrito el diseñador: «backsquat permite mayor inclinación del torso porque usa
más movilidad de cadera; en cambio, frontsquat mantiene un torso vertical para
prevenir la caída de la barra a expensas de mayor rango de rodilla y tobillos».

**El gesto para en la postura del modelo, y no donde tope una articulación.**
Las sentadillas no tenían PLAN —lo tenían el peso muerto y el press, no ellas—,
así que el reparto seguía repartiendo hasta el límite anatómico: **rodilla 150°
y cadera −134,6°**, contra los 126° y −78,61° del modelo del diseñador. Ahora
las dos tienen su plan de una fase, de la postura de fondo a la de pie, y
aterrizan en los ángulos del modelo.

**La postura ya no se cierra al bajar.** Este salió al medir lo anterior, y es
de los que se ven: el reparto solo mueve el eje X de cada articulación, así que
la ABDUCCIÓN de la cadera se quedaba congelada en el valor de estar de pie
(−10,29°) mientras la flexión llegaba a −78,6°. Con la cadera tan flexionada
esos 10° ya no abren nada, y las piernas se juntaban: la separación entre pies
pasaba de **60,1 cm a 39,4** durante la bajada y se volvía a abrir al subir. La
postura de fondo del modelo tiene 60,8 cm con la cadera a −36,5°, o sea que la
apertura estaba en las posturas y el gesto no la recorría.

Lo que no puede cambiar es la separación entre los pies —están en el suelo—, así
que la abducción se resuelve contra ella, simétrica y por bisección. Medido:
**60,24–60,28 cm** durante todo el gesto, con la cadera desarrollando sola de
−10,3° a −43,3° de abducción. Es la misma «abducción y rotación externa de la
cadera al descender al bottom del squat» que el diseñador había descrito al
hablar del pie. Y las pisadas siguen clavadas: **0,01 cm**.

### Decidido, y va aquí para que no se reabra

La POSTURA ESTÁTICA de la sentadilla trasera trae la barra **14,1 cm por detrás**
del medio del pie, de pie y en el fondo, y el gesto lo corrige en su primer paso
—de ahí un salto de unos 15° de tronco entre aplicar la postura y empezar a
moverse—. No es un fallo del gesto sino la geometría del modelo: el hombro del
rig cae sobre el tobillo, el medio del pie está 9,1 cm por delante y la barra se
apoya otros 5 cm por detrás de la nuca. Equilibrar la postura pediría 18,7° de
inclinación estando de pie.

**Se queda como está**, por decisión del diseñador: «la postura estaría bien tal
cual, el gesto hace el trabajo adecuado». Así que los 14,1 cm de la postura de
la trasera NO son un fallo pendiente: son la estampa aprobada, y el equilibrio
es cosa del gesto.

### Añadido

- `prueba-gesto-barra` filma también las dos sentadillas: dónde queda la barra
  respecto del medio del pie en cada paso, si el gesto aterriza en la postura del
  modelo, si las pisadas viajan, cuánto se abre o se cierra la postura, y que la
  frontal salga más vertical que la trasera.
- La prueba mide ahora la pisada EN EL MARCO DEL PIE. Elegir la banda de contacto
  por la Y del mundo funciona con el pie plano, pero en el fondo de la sentadilla
  el pie se inclina 8,15° y la banda deja de coger la suela entera: se queda con
  la puntera y la referencia miente 5,7 cm. Es la misma lección de v0.2.97 —medir
  la huella donde el pie toca, en su propio marco— aplicada a la prueba.

## [0.2.98] — 2026-08-20

El peso muerto, terminado: cuello, roce y una bajada que de verdad deshace la subida.

### Corregido

**El cuello se fija en neutral al llegar al bloqueo.** Viendo la subida entera,
el diseñador afinó lo de la mirada: «al ascender hasta el bloqueo, eventualmente
la posición del cuello se fija hasta alcanzar la postura anatómica de quien mira
hacia el frente (pasa de extensión a neutral). Luego, al descender, la
cinemática se reproduce en reverso».

Y tiene razón: sostener la marca del suelo estando ya de pie exige **32° de
barbilla abajo**, que es lo que salía en 0.2.97 y no es una postura que nadie
adopte al terminar un peso muerto. Así que la marca sigue gobernando el cuello
mientras el tronco está inclinado —que es donde importa, porque bajar en flexión
cervical es lo que arriesga la espalda— pero con **techo en neutral**: el cuello
recorre de −57,9° a 0° y ahí se queda. Medido en los 64 pasos del gesto: nunca
pasa a flexión (**máximo 0,0°**), acaba en **0,00°** mirando al frente, y
bajando vuelve solo a su extensión de partida (**−57,8°** contra los −57,9° de
origen), sin estado guardado. Mientras le queda extensión —49 de los 64 pasos—
la vista se mantiene entre **202 y 223 cm**.

**La barra roza la pierna, el muslo y la cadera, y ya no se hunde en ellos.**
«La barra debe detectar colisión con la pierna, el muslo y cadera (de forma que
la barra desliza anterior y sobre ellas, y al bloqueo no se hunde en el
cuerpo).» Se hundía en toda la subida: medido por intersección real de cilindro
contra malla, **1,44 cm** en la espinilla, **1,36** en el muslo y **1,35** en la
pelvis justo en el bloqueo, que es donde se ve.

Ahora la barra negocia su carril con el cuerpo. El hombro es quien la mueve
—el brazo es la cuerda de la que cuelga—, así que la acomodación gira los DOS
hombros a la vez con el mismo incremento, mide la penetración de verdad y avanza
hasta anularla, afinando por bisección. Solo corrige **hacia delante**: donde no
hay carne, la plomada manda y la barra sigue sobre el medio del pie. Resultado:
penetración **0,00 cm en los 64 pasos**, ida y vuelta.

Eso cambia el carril, y a propósito: el recorrido sagital pasa de una recta de
0,5 cm a **5,4 cm de subida y 4,6 de bajada**, que es exactamente el bulto de la
espinilla y del muslo. La barra nunca cae por detrás del medio del pie
(**0,33 cm** de margen) y en el bloqueo acaba **5,76 cm** por delante de él,
apoyada en el muslo en vez de metida 1,35 cm en la pelvis. Las dos reglas del
diseñador conviven porque la barra solo se aparta de la vertical lo que el
cuerpo la empuja, nunca por su cuenta.

**La bajada deshace la subida de verdad, fase por fase.** Buscando la razón del
carril raro de la bajada apareció un fallo de fondo que llevaba desde 0.2.96: la
tracción elegía «la última fase cuyo umbral está cruzado», y el umbral de la
ÚLTIMA fase es `meta` —termina al llegar a su postura, no al cruzar nada—, así
que esa fase **nunca salía elegida**. Bajando desde el bloqueo se cogía la fase
de TIRÓN con la meta del suelo y el gesto entero se deshacía de un solo tramo:
**32 pasos para subir y 20 para bajar**, por posturas que no eran las mismas —a
rodilla 65° la columna iba a 53,5° bajando y a 78° subiendo—.

La condición correcta es la simétrica de la del empuje: el empuje toma la
PRIMERA fase que aún no ha cruzado su umbral, la tracción la ÚLTIMA que llegó a
empezar. Y una fase que ya está en su meta cede el turno a la anterior, porque
en el hito de la rótula el umbral del tirón sigue cruzado por un pelo y la
bajada se paraba en seco a media altura. Ahora son **32 pasos en los dos
sentidos**, con la columna sostenida a 78° durante el tirón inverso y el mismo
carril de barra: el residuo que queda son **3,2°** en el codo entre fases, por
debajo del paso de 5°, porque la subida corta el tirón cuando la barra pasa la
rótula (rodilla 24,8°) y la bajada termina el bloqueo en la postura del hito
(23,77°).

### Añadido

- `prueba-gesto-barra` mide ahora tres cosas más del peso muerto: cuánto se hunde
  la barra en la pierna, el muslo y la cadera en cada paso; el ángulo del cuello
  a lo largo del gesto; y si la bajada pasa por las mismas posturas que la subida,
  comparando qué columna le toca a cada rodilla. Esta última es la que habría
  cazado lo de las fases en 0.2.96: la prueba anterior solo miraba los extremos,
  y los extremos siempre estuvieron bien.

## [0.2.97] — 2026-08-20

Los cinco ajustes que pidió el diseñador después de ver 0.2.96 en movimiento.

### Corregido

**La sentadilla vuelve a la estampa de 0.2.95, pero el pie PIVOTA en vez de
derrapar.** El veredicto del diseñador fue claro: «la cinemática que habías
descrito en la versión anterior (0.2.95) para la sentadilla desde arriba era la
más apropiada». En 0.2.96 se había corregido de más — se le exigió al pie una
orientación fija en el mundo, y con eso se perdió el aspecto bueno.

La razón de fondo era un ERROR DE MEDIDA, y conviene dejarlo escrito: la caja
envolvente de three está alineada con el mundo, así que girar el pie sobre sí
mismo ya le mueve el centro aunque el pie no viaje ni un milímetro. Medido así
parecía que la huella saltaba 10,71 cm. Medida donde el pie toca de verdad —el
centroide de los vértices apoyados, en el marco del propio pie— se mueve
**0,01 cm**. No había derrape: había un centro de caja girando.

Así que se restaura la cinemática de 0.2.95 y se le pone la única condición que
el diseñador sí puso: «los apoyos del pie o pisada no deben deslizarse sobre la
superficie, pero sí pueden experimentar un grado menor de rotación externa (que
se transmite por abducción y rotación externa de la cadera al descender al
bottom del squat)». Medido en las dos sentadillas y en los dos pies: la huella
se queda a **0,01 cm**, la puntera se abre **35,8°** hacia fuera, y el centro de
giro de la transformación rígida cae a **0,02 cm** de la huella —dentro del pie,
que es la definición de pivotar y no de arrastrar—. La planta apoya entera
arriba y abajo (892 → 892 vértices de contacto, normal 1,000) y la pelvis no
avanza al bajar: la barra sigue cayendo a plomo.

Y las dos sentadillas con barra dejan de tener dos versiones: son **Sentadilla
frontal** y **Sentadilla trasera** a secas, con esta cinemática de serie.

**El press sale más adelante y más abajo, y con el cuello extendido.** Pedido
del diseñador: «deberá iniciar con la barra posicionada más hacia anterior e
inferior (al extender hombros y bajar la altura de los codos). Cuando el press
parte hay un grado de extensión cervical que ayuda al clearance del rostro para
evitar colisión con la barra, en conjunto con la trayectoria sigmoidea que ya
está bien lograda».

La salida vieja no era solo poco natural: la barra ARRANCABA DENTRO DE LA
CABEZA. Medido por intersección real de cilindro contra malla, el eje entraba
**14,12 cm** en el cráneo en la postura de rack. La salida nueva —hombro −30°,
codo −130° con 80° de rotación, y **12° de extensión cervical**— sale limpia
desde el primer fotograma: penetración **0 cm en los 28 pasos** del gesto. La
sigmoide se conserva y se mide: el vientre de la curva llega a **19,21 cm** en
el paso 11 de 27 —a mitad de camino, no al principio— y vuelve a la vertical
sobre la línea de equilibrio con **0,64 cm** de desvío. Los 12° de cuello se
deshacen solos al llegar al bloqueo, porque el cuello entra en el patrón con
peso 0: su meta es la postura de arriba, y vuelve a extenderse al bajar.

Del listado de posturas desaparece **Press vertical (bloqueo)**: queda una sola
partida, la de la base, como pidió el diseñador.

**El peso muerto no suelta la mirada de su marca, y esta vez de verdad.** El
diseñador dio la cinemática por buena —«tanto la simulación de la fase
concéntrica como la excéntrica funcionan de manera adecuada»— y pidió una cosa
más, con su razón médica: «si es posible mantener la mirada en todo momento a 2
o 2.5 metros por delante de la figura sería ideal, para que la cinemática sea
aún más fidedigna (en el mundo real, un peso muerto que se baja con el cuello en
flexión tiene mayor riesgo de producir alguna lesión espinal)».

El cuello deja de ser un ángulo del reparto y pasa a RESOLVERSE en cada paso
contra una marca fija del suelo, a 2,25 m por delante del punto medio de las dos
pisadas: se bisecta el ángulo cervical comparando la inclinación de la vista con
la que haría falta para dar en el blanco.

Y hubo que arreglar dos cosas para que esa acomodación llegara a correr, porque
escrita ya estaba y NO SE EJECUTABA NUNCA. Las articulaciones centrales no
llevan lado —el cuello se llama `neck`, no `neckL`— y se le buscaba con sufijo
en los dos lados, así que se descartaba en silencio; encima el plan le ponía
candado, porque los candados solo se abren para lo que el plan nombra y las
acomodaciones se nombraban también con sufijo. Resultado: el cuello clavado en
−51,8° durante los 70 pasos del gesto, mirando al suelo a 1,6 m en el arranque y
**al techo** en el bloqueo (51,8° por encima de la horizontal). Arreglado, la
vista se queda entre **204 y 234 cm** en los 70 pasos, ida y vuelta, dentro de
la horquilla pedida. Los tres ángulos cervicales de la biblioteca quedan
resueltos contra esa marca: −57,9° en el suelo, −49,9° en la rótula y **32°** en
el bloqueo, que sustituyen a los 19° de «punto medio» que se habían elegido por
criterio en 0.2.91 — el diseñador acaba de pedir lo contrario.

También aquí queda una sola partida: **Peso muerto**, desde abajo.

**Los discos olímpicos se leen desde los dos perfiles.** «La cara con relieves
(letras y números) deberá mirar hacia el sentido opuesto al sentido de la manga.
Por ejemplo, en una barra cargada con discos, la cara con relieve mira hacia
ambos extremos laterales de forma que se lee desde ambas vistas de perfil.»
Todos los discos se montaban con la misma orientación, así que en un extremo se
leía el relieve y en el otro se veía el dorso liso. El relieve de la malla está
en su cara −Y (11 583 de 11 871 vértices caen por debajo del plano medio), que
alineada apunta hacia dentro en el lado positivo: se le da media vuelta a ese
lado. Medido disco a disco, el relieve apunta al extremo de su manga con
producto escalar **1,000** en los seis.

### Añadido

- `pruebas/prueba-discos.mjs`: monta seis discos en la barra olímpica, localiza
  la cara del relieve contando vértices a cada lado del plano medio —para no
  depender de recordar en qué cara la trae la plantilla— y comprueba que apunte
  al extremo de su lado.
- `prueba-gesto-barra` mide ahora también DÓNDE MIRA la figura en cada paso,
  trazando el eje frontal de la cabeza hasta el suelo. Es la prueba que faltaba:
  la acomodación de la mirada llevaba escrita una versión entera sin ejecutarse
  y ninguna prueba lo notaba.
- `prueba-pie-anclado` distingue pivote de derrape resolviendo el punto fijo de
  la transformación rígida entre las dos posturas: si cae dentro de la huella,
  el pie gira sobre sí mismo.

## [0.2.96] — 2026-08-19

La cinemática de los gestos, no solo sus extremos.

### Corregido

**El pie es un anclaje y deja de derrapar en la sentadilla.** El fallo no era el
que parecía: el CENTRO del pie apenas se movía —0,23 cm, y por eso el plantado
por traslación lo daba por bueno— pero el pie GIRABA 34,98° sobre sí mismo al
bajar y volvía a 0° al subir. La punta viajaba 10,13 cm y el talón 9,82 cm en
sentido contrario, alrededor de un punto situado a 29,43 cm del centro del pie:
fuera del pie. No pivotaba, derrapaba — casi 20 cm de arrastre por pie y
repetición. Y en el fondo la planta apoyaba de canto (892 → 256 vértices en
contacto) y flotaba 0,27 cm: lo que tocaba el suelo era el collarín.

Se resuelve la pierna de pie como sistema, con el fondo del modelo INTACTO
(cadera −78,61/3/−36,5 y los 126° de rodilla), pidiendo la misma orientación del
pie en el mundo y la misma separación entre pies — las dos únicas cosas que una
traslación no puede arreglar. Medido por la ruta real, frontal y trasera:
puntera y talón **0,00 cm**, rumbo **0,00°**, normal de la planta 1,000, suela
pegada al suelo, 892 vértices de contacto. La puntera sigue abierta 35,6° (el
modelo da 36,2) y la barra baja a plomo.

De pie la apertura ahora **se declara** con rotación axial de cadera: el tobillo
de este esqueleto no tiene eje Y, así que con la rodilla recta no puede salir de
la abducción. En el fondo se sigue cayendo de la cadena.

**El peso muerto se mueve como un peso muerto.** Las dos posturas extremas eran
correctas; lo que pasaba entre ellas, no. La zona «bisagra» solo repartía cadera
y espalda —la RODILLA no estaba en el patrón— así que se quedaba clavada en
94,80° durante los 22 pasos del gesto: la extensión de rodilla no ocurría nunca.
Nadie anclaba el pie dentro del paso, de modo que la punta barría 120,81 cm, el
talón 78,37 y la planta se despegaba 11,54 cm; la barra acababa 121,44 cm por
delante del medio del pie. Y el gesto moría donde topaba la primera articulación
(cadera en +30°), con la barra 24,89 cm por debajo del bloqueo, después de haber
subido y vuelto a BAJAR 10,15 cm.

Un ejercicio deja de ser un reparto y pasa a ser un **calendario**: una lista de
fases, cada una con su patrón, su META —una postura de la biblioteca, que es la
única fuente de verdad— y un umbral que se lee del mundo en cada paso. El peso
muerto son dos: **tirón**, donde manda la rodilla y el tronco sostiene, hasta que
la barra pasa por encima de la rótula; y **bloqueo**, donde mandan la espalda y
la cadera. Medido: barra 21,87 → 81,08 cm sin retroceder nunca, desvío de la
vertical 0,22 cm, punta y talón 0,00, y aterrizaje exacto en el bloqueo aprobado.

**Y los brazos cuelgan como cuerdas.** El hombro deja de ser un ángulo del
reparto: se resuelve en cada paso para que la mano caiga sobre la vertical del
medio del pie, que es la regla sagital del ejercicio. Antes el brazo arrancaba ya
a 11,52° de la plomada y acababa a 56,94° — un puntal, no una cuerda.

**El press vertical esquiva la cabeza.** La barra subía en vertical
atravesándola, y moría con el codo bloqueado y el hombro a medio camino (−128°
de −166°), 36,41 cm por delante y 26,21 por debajo del bloqueo. Con el peso de
hombro del ejercicio (126,00/141,18, la razón exacta entre sus dos posturas
aprobadas) y la META como criterio de parada, la trayectoria sale sola: la barra
se aleja del rostro hasta 11,62 cm a la altura de la coronilla y vuelve a la
vertical sobre la línea de equilibrio (0,10 cm), subiendo de 153,33 a 190,82 cm
sin retroceder. Es la sigmoide pedida. La penetración en la cabeza queda en el
roce de la barbilla al salir del rack (8 pasos de 31, máximo 1,42 cm), y arranca
de los 0,82 cm que **la propia postura aprobada** ya trae.

**Y la simetría del posado vuelve a funcionar.** «Al posar el maniquí no se está
reconociendo la instrucción de simetría»: la casilla quedaba marcada, el lado
elegido giraba y el otro no. La figura nace con todo bloqueado menos la zona
activa, así que posar una cadera encontraba a su gemela con candado y el espejo
se saltaba en silencio. Era incoherente consigo mismo: escribir grados en la
articulación elegida ignora el candado a propósito, copiarlos al otro lado lo
respetaba. El candado dice qué mueve el gesto al SIMULAR; posar es otra cosa.

### Verificación

Dos pruebas nuevas. `prueba-pie-anclado` (18 aserciones) mide punta, talón,
rumbo, planta, suela y el ciclo de vuelta en las dos sentadillas. `prueba-gesto-
barra` (34) FILMA los dos gestos paso a paso en vez de mirar sus extremos: barra
a plomo, orden rodilla→cadera, pies clavados durante todo el recorrido,
aterrizaje en las posturas aprobadas, la sigmoide del press y la penetración en
la cabeza medida por intersección real contra la malla. Incluye un bloque de NO
REGRESIÓN que comprueba que una zona sin plan da exactamente el paso de siempre
(rodilla 5,00°, cadera 4,50°).

Cuatro aserciones nuevas de simetría en `ergonomia-v256` que exigen que el otro
lado se MUEVA, no solo que la bandera cambie — que es por lo que el fallo pasó.

Verdes también `sentadilla`, `levantamiento`, `zonas`, `barra-maniqui`,
`posar-apoyar`, `apoyos`, `v245`, `v251`, `maquina-entera` y `partida-plano`.
`manip-artic` sale en rojo, y está comprobado revirtiendo `src/` a la versión
anterior que **falla igual sin estos cambios**: es un rojo de entorno.

## [0.2.95] — 2026-08-19

La pila de pesos deja de ascender entera.

### Corregido

**La pila de pesos ascendía completa al posar la máquina.** Los dos fallos que
reportó el diseñador —«al posar la máquina en su punto de partida se estropea la
simulación por movimiento de los mecanismos asociados: la pila de pesos asciende
completa» y «al ocultar el maniquí la máquina persiste en su configuración de
pose ergonómica»— resultaron ser el mismo, y no era de física: era de dibujo.

En una pila selectorizada el pin engancha unas placas y el tubo selector se las
lleva; las de abajo no se mueven nunca. Eso se dibuja contra-trasladando las
placas sueltas justo lo que sube el cuerpo de la pila, y esa cuenta se hacía
sólo `if (simulating)` y contra el estado guardado al arrancar. Al salir de
posar —donde el cuerpo de la pila queda LEVANTADO, que es de lo que trata la
partida— ese estado se vacía y la simulación se apaga: la resta daba cero,
ninguna placa se contra-movía y las quince subían pegadas al selector. La
máquina no estaba rota; lo que estaba mal era la única pieza que se dibuja
aparte, y quedaba a la vista tanto en construcción como al ocultar la figura.

La referencia pasa a ser **el sitio de diseño de la pila, sea cual sea el
estado**: simulando lo dice el estado guardado, parado con la partida a la vista
lo dice el plano de la partida, y parado sin partida la malla ya está en su
sitio y no hay desvío que medir.

**Una partida nunca viaja sin su plano.** Buscando el fallo anterior salió a la
luz otro de la misma familia, y peor. La partida es una condición de ensayo
puesta ENCIMA del plano fabricable, así que las dos van juntas: sin saber a qué
se vuelve, arrancar la simulación guarda la pose como si fuera el plano y al
parar la restaura encima del de verdad, que se pierde; quitar el maniquí no
repone nada y la máquina se queda clavada en su pose ergonómica; y guardar el
proyecto escribe la pose en vez del fabricable.

Había tres puertas que ponían la partida sin su plano: **abrir** un proyecto que
la trae, **aplicar** un punto de partida guardado y **fijarla** con el gesto
parado (ahí el estado de diseño guardado está vacío, y de paso metía la máquina
entera en la partida, pilares clavados al suelo incluidos). Y una cuarta que
pasaba por la primera sin que nadie lo pidiera: **deshacer**, que recarga el
proyecto completo. Ahora todas pasan por la misma puerta, que apunta el plano
leyéndolo del sitio que corresponda a cada estado.

### Verificación

`prueba-maquina-entera` sube a 20 comprobaciones, seis de ellas nuevas sobre la
pila. La placa más baja se mide en el mundo en los cinco estados de la secuencia
completa —posando, congelada la partida, sin maniquí, en marcha y tras parar— y
se queda en 10,9 cm en todos, con el cuerpo de la pila levantado 33,3 cm. Antes
subía a 44,2 cm posando y bajaba a −22,4 al quitar la figura. Verdes también
`posar-maquina`, `posar-apoyar`, `ergonomia-v256` y `auditoria2`.

Prueba nueva, `prueba-partida-plano` (11 comprobaciones), que pasa por las
cuatro puertas: abrir, aplicar, fijar en marcha y deshacer. En cada una se
comprueba lo mismo —que quitar el maniquí devuelve la máquina al plano, que
parar la deja en su partida y que re-guardar escribe el fabricable—: 0,00 cm en
todas.

**Y se limpió la batería de rojos que no señalaban nada.** De los cuatro que
arrastraba, tres eran pruebas midiendo interfaces retiradas: `fable-v214`
buscaba el Marketplace de tarjetas (es EL HUB desde v0.2.62) y la barra de
simulación con cursores ▲▼ (son las teclas 8/9 desde v0.2.45); `uppermachine`
contaba 42 piezas y 18 uniones del prefab anterior al rediseño del pivote
(v0.2.36/39 lo dejó en 41 y 16, y quitó la guía prismática del carro, que ahora
flota entre los senos de los dos cables); y comprobaba que el brazo estaba
suelto viéndolo derivar, cosa que una máquina bien armada no hace —daba 0,05 cm
tanto suelto como anclado—, así que ahora se le pregunta al motor si su cuerpo
quedó fijo. `v245` esperaba los rótulos largos de los apoyos, que se acortaron
en v0.2.93 justo porque se salían de la fila. Dos de ellas, además, no devolvían
código de salida: un `ok:false` pasaba por verde.

`v251` medía una pared del único compromiso real que quedaba: en este esqueleto
el muslo es un cilindro cuyo eje va a la altura de la cadera, así que su parte
baja queda 5,2 cm por debajo del punto más bajo de la pelvis. O apoya la pelvis
—y el muslo entra 2,5 cm en el acolchado— o apoya el muslo y los glúteos flotan
11,3 cm, que es el fallo que se corrigió eligiendo los glúteos. Las dos cosas no
caben, así que la prueba pasa a vigilar **las dos paredes**: el muslo no entra
más de 3 cm y el trasero no flota (0,0 cm).

## [0.2.94] — 2026-08-19

Editar la máquina en su posición ergonómica, y que el cambio permanezca.

### Corregido

**Lo que se edita con la partida a la vista va al plano.** Regla del diseñador:
«poder modificar y editar la máquina con las herramientas de construcción en una
posición ergonómica precisa, y estos cambios estructurales permanecen». No se
cumplía, y de la peor manera: editar una pieza CONGELADA se perdía —medido, los
7 cm que se le daban volvían a 0 al soltar la partida— mientras que editar una
que no lo estaba sí permanecía. El mismo gesto con dos resultados distintos y
ninguna pista de por qué.

La partida es una condición de ensayo puesta ENCIMA del plano, así que mover una
pieza con el gizmo mientras se ve es editar el plano, no reposar la máquina. Si
la malla ya no está donde la dejó la partida, esa diferencia la puso el usuario:
se le suma también al plano y la partida se re-ancla.

Con eso hizo falta decir explícitamente cuándo la partida está PINTADA. Al parar
la simulación o el posado las mallas vienen del plano restaurado, y sin esa marca
la reconciliación tomaba esa vuelta al plano por una edición y le restaba el
gesto entero al diseño: la partida se destruía al primer ⏹.

### Verificación

`prueba-maquina-entera` sube a 12 comprobaciones. Editar una pieza congelada
llega al plano (6,91 de 6,91 esperados), editar una libre también (7,04), y el
proyecto guardado con la partida a la vista sigue llevando el plano (0,01 cm).
Verdes también `posar-apoyar`, `posar-maquina`, `press-maquina`, `auditoria2`,
`carga-grupo`, `grupos`, `ergonomia-v256`, `uppermachine-lib` y `torre-pesos`.

## [0.2.93] — 2026-08-19

La máquina se queda donde la congelas, y entera.

### Cambiado

**Con el maniquí delante, parado se ve la PARTIDA.** Esto cambia lo que fijó la
v0.2.51 —«parado se sigue viendo y editando el diseño»— y conviene decir por qué.
Aquella regla nació cuando la partida era sólo una condición de arranque del
motor. Pero posar la máquina existe para acomodarle el cuerpo, y ahí se vuelve
en contra: «la postura de la máquina no permanece en su sitio pese a ejecutar
fijar posición, motivo por el cual es imposible posar el maniquí para una
ergonomía congruente». Si la máquina vuelve al plano de un salto, no hay contra
qué colocar el cuerpo.

Se conserva la intención de la regla vieja: la partida sólo se ve CON EL MANIQUÍ
delante —sin él se diseña sobre el plano, igual que antes—, el plano sigue siendo
lo que se exporta y se guarda, y soltar la partida lo repone.

Por dentro manda el diseño, y esto costó caro aprenderlo. `startSimulation` saca
de las mallas el estado al que volver y construye con ellas el mundo físico —los
cables miden ahí su longitud de reposo y las uniones su cero—. Cuando se pintó la
partida encima sin más, la máquina arrancaba mal armada y al parar se
«restauraba» la partida SOBRE el plano, que se perdía; cada ▶/⏹ lo empeoraba.
Ahora esas tres cosas pasan por una única puerta, `conElDiseno`, que repone el
plano, hace el trabajo y devuelve lo que había.

### Corregido

**La máquina ya no se parte al congelar.** La partida salía de
`physics.posesDePiezas()`, que devuelve una entrada por CUERPO RÍGIDO y se salta
las piezas SOLDADAS —viajan dentro del cuerpo de su anfitrión—. Se congelaban los
anfitriones y las fundidas se quedaban en el plano: el brazo del press aparecía
partido en dos, una mitad en su sitio nuevo y la otra en el viejo. Ahora se
recorren todas las piezas: en la UpperMachine pasa de congelar 3 a congelar 8,
que son las que de verdad se movieron.

**Botones con el texto cortado.** «Apoyar mano» y «Soltar apoyos» caían a dos
líneas en el panel de 262 px y lo engordaban hasta solapar la barra de
simulación. Acortados a «Mano» y «Soltar», con la explicación entera en su ayuda;
con el alto recuperado, «Mira a» vuelve a su propia fila en vez de apretujarse
con Colocar y Agarrar.

### Verificación

`prueba-maquina-entera` sube a 11 comprobaciones: la máquina se queda en su
partida al congelar (33,3 cm del plano), no se queda ninguna pieza atrás (8 de
8), no se desarma al simular, vuelve entera al parar, soltar la partida repone el
plano y el proyecto guardado lleva el plano y no la partida. Verde, junto con las
tres de solapes, `menus-v257`, `posar-apoyar`, `posar-maquina`, `press-maquina`,
`ergonomia-v256` y `auditoria2`.

## [0.2.92] — 2026-08-19

El temblor de los brazos apoyados, que el diseñador grabó en vídeo.

### Corregido

**El brazo apoyado se asienta en vez de temblar.** La compensación de la palma
corregía ITERANDO: `solveTwoBoneIK` pone el pivote de la MUÑECA sobre el punto,
así que se resolvía, se medía lo que quedaba entre el centro del puño y el
agarre, y se volvía a resolver contra el objetivo corregido. Pero eso corre en
cada fotograma partiendo de donde lo dejó el anterior, y cada pasada usa un
objetivo distinto: cerca de la degeneración —el brazo casi estirado apuntando
arriba— dos objetivos separados por centímetros dan soluciones separadas por
medio metro. Medido con el mando a 130 cm, el hombro alternaba entre −133,7° y
−18,1° y la mano entre y=179,6 e y=84,4, indefinidamente: 47,5 cm de oscilación
entre pasadas consecutivas.

La mano no es una corrección a posteriori, es parte del antebrazo.
`solveTwoBoneIK` acepta ahora un `alargue` —cuánto sobresale el efector más allá
de la muñeca— y resuelve el hueso de abajo como si fuera más largo, de modo que
lo que aterriza en el objetivo es la palma. Una sola pasada, sin estado. El
voladizo es una medida del rig, así que se mide una vez por talla y se guarda.

Tras el arreglo: **0,000 cm de oscilación** en ocho pasadas seguidas, y la mano
llega a 11,7 cm del mando en vez de quedarse entre 42 y 57.

El temblor es anterior a esta tanda; lo que lo destapó fue levantar el veto de la
IK con el gesto parado en la v0.2.91 — antes no corría nunca ahí.

### Verificación

`prueba-maquina-entera` (nueva, 8 comprobaciones) reproduce la secuencia exacta
del vídeo: sentar al maniquí en la UpperMachine, «▶ Manipular» y arrastrar el
brazo del press, congelar la partida, apoyar las manos, simular y parar. Mide el
temblor, si la máquina se desarma al simular y si vuelve entera a su plano.
Confirma de paso que lo de «la máquina queda rota para siempre» ya lo arreglaba
la v0.2.91: deriva 0 cm al congelar y 0 al volver a construcción.

## [0.2.91] — 2026-08-19

Las tres reglas del levantamiento que pidió el diseñador, el flujo de posar la
máquina puesto en su orden, y los cuatro defectos que enseñaban sus capturas.

### Añadido

**Hacia dónde mira el maniquí.** Colocar lo adivinaba —midiendo el asiento, o
apuntando a la máquina fija más cercana— y acierta casi siempre; pero adivinar
no es decidir. Dos botones de cuarto y un número exacto, en la misma fila que
«Colocar». La barra y los apoyos acompañan al giro.

**La pisada se fija a la superficie.** `ground()` clavaba el punto más bajo de
la figura en y=0 —el suelo del proyecto—, no en lo que se está pisando: de pie
sobre la plataforma de una prensa la planta se hundía en la pieza.

### Corregido

**Los pies se quedan donde pisan.** El rig está enraizado en la pelvis, así que
flexionar la cadera columpiaba las piernas y eran los PIES los que viajaban por
el suelo. Entre el bloqueo y el suelo del peso muerto patinaban 27,7 cm hacia
delante; en las sentadillas se abrían 14,3 cm por lado al bajar.

**La barra sube y baja a plomo.** Con los pies anclados, el recorrido de la
barra sale de una cuenta: se desplaza lo que se desplace el pie respecto de la
cadera. De los tres ángulos de la sentadilla DOS ya eran correctos —−78,61 de
cadera frente a los −79 estimados, 9,01 de tobillo frente a 9—; el que estaba
mal era el tobillo en X, −43 en vez de −47,39. Cuatro grados de tobillo son
8,6 cm de barra. La rodilla NO se toca: son los 126° medidos sobre el modelo, y
la profundidad es consecuencia (43,2 cm).

**Posar la máquina va antes que apoyar, y su partida es del maniquí.** Sin
maniquí la máquina vuelve a su diseño para seguir dibujando, y ▶ arranca en el
último fotograma sólo si hay alguien delante. El modo apoyo va ahora por encima
del guard de simulación y sobrevive a entrar en «▶ Manipular»: antes el botón
estaba, se pulsaba, y no pasaba nada.

**Las manos agarran.** `brazoMandado` vetaba la IK de mano en cuanto una zona
activa declarase hombro o codo, y la zona de fábrica es «tren superior»: en una
UpperMachine la IK no se ejecutaba NUNCA. El veto es del gesto EN MARCHA, no del
reposo. Además el punto de apoyo se cuantizaba al anclaje más cercano —en un
cilindro sólo hay tres— y la IK llevaba la muñeca al punto en vez de la palma.

**La postura de un ejercicio trae la barra**, adoptando la que ya esté en la
escena en vez de sembrar otra, y **la barra no se alabea**: copiaba literalmente
la recta entre los dos puños, así que rotar un codo 45° la inclinaba y le corría
el centro 7 cm. Con un codo doblado 60°, ahora 0,00°.

**Parado, las mallas son el DISEÑO.** Llegaron a dibujar la partida encima y fue
un desastre: `startSimulation` saca de ellas el estado al que volver y construye
con ellas el mundo físico —los cables miden ahí su reposo y las uniones su
cero—, así que la máquina arrancaba mal armada y al parar se «restauraba» la
partida sobre el plano, que se perdía. Cada ▶/⏹ lo empeoraba.

### Verificación

`prueba-levantamiento` (34 comprobaciones) y `prueba-posar-apoyar` (28) miden
las reglas y los defectos, incluida la que vigila que tres ciclos ▶/⏹ no
deriven el plano. Verde, junto con `sentadilla`, `barra-maniqui`,
`posar-maquina`, `press-maquina`, `uppermachine-lib`, `auditoria`, `auditoria2`
y `800-debug`.

## [0.2.90] — 2026-08-18

Los once hallazgos de la segunda auditoría, arreglados de raíz y con una
prueba cada uno.

### Corregido

**La mano del maniquí se quedaba armada.** Encenderla se apodera del puntero:
cada clic en el lienzo agarra un segmento. Cambiar de herramienta, pulsar
Escape o cancelar apagaban el modo por dentro pero dejaban la mano puesta, y
el lienzo seguía manipulando la figura sin nada en pantalla que lo dijera.
Ahora los tres caminos la sueltan.

**El inspector hablaba de piezas que ya no existían.** Con varias marcadas y
Supr, el panel se quedaba diciendo «3 piezas seleccionadas» y ofreciendo
campos de posición y rotación que no movían nada: `removeObject` sólo avisa
por `selectionChanged` cuando la borrada era la pieza única, y aquí no lo era.

**Ctrl+D no hacía nada con varias piezas marcadas.** Con multiselección
`selected` es nulo y el atajo se iba por el `return` sin duplicar ni avisar.
Ahora duplica todas y deja las copias marcadas, listas para moverlas en
bloque.

**El panel del costado derecho se quedaba colgado.** Los de la roldana y la
bisagra se añadían al `<body>` con la clase que repliega la ventana del
maniquí, y sólo ellos sabían quitarla: al cambiar de herramienta o volver a la
Home quedaban a la vista con los botones muertos y el maniquí escondido, sin
pista de cómo recuperarlo. El carril tiene ahora **un dueño** (`dialogoDerecha`):
quien abre cierra al anterior, y cualquiera puede cerrar el que haya sin saber
cuál es.

**Duplicar o pegar una máquina sustituida daba una caja gris.** Una máquina
estándar reemplazada por el modelo del usuario vive como un `prim-box` anclado
con `modeloMaquina` y la geometría del modelo encima; copiarla sólo llevaba
los `params` y salía lo de debajo. Cargar el proyecto ya lo hacía bien: ese
mismo trabajo está ahora en un sitio al que llaman los tres caminos. De paso,
pegar tampoco copiaba el `stack` de la pila de pesos.

**Dos tramos de columna apilados dejaban el carro sin guía.** El recorrido que
permite cada tubo se INTERSECABA, y con dos tramos contiguos la intersección
es vacía: el carro salía del filtro sin guía y se desplomaba por fuera de la
torre (16 cm de deriva, medido). Además, el tramo de arriba —coaxial y más
corto— pasaba por **espaciador**, con lo que frenaba en el empalme en vez de
prolongar el recorrido. Ahora un espaciador tiene que ir MONTADO SOBRE la
guía —compartir su tramo—, los tramos que se tocan se funden, y la columna se
prolonga en cadena aunque el carro todavía no haya llegado a los tramos de más
allá.

**Dos nodos de cable en el mismo cuerpo se pisaban.** Pasa con dos roldanas
empotradas en la misma viga, y con cualquier aparejo 2:1 armado sobre una sola
pieza: los solventes escribían la velocidad del cuerpo una vez por nodo y la
segunda pisaba a la primera, además de contar dos veces la misma inercia. El
bloque recibía el tirón del tramo interno —horizontal— y se iba de lado: 112 cm
de deriva y 89 cm de subida, medidos. Ahora cada cuerpo entra una vez, con la
SUMA de los gradientes de sus nodos.

**Volver a la Home dejaba oyentes vivos.** El render bajo demanda cuelga quince
oyentes de `window` y del lienzo y el cierre sólo soltaba los seis con nombre:
el editor anterior seguía pidiendo cuadros sobre un renderer destruido y se
quedaba entero en memoria. Cada oyente deja ahora apuntado cómo soltarse.

**Acortar un pilar trazado lo hacía CRECER.** El largo de una pieza recta es el
de su polilínea. Al tirar de la punta hacia dentro los nodos de en medio se
quedaban pasados del extremo: la polilínea iba, volvía y volvía a ir, y un
pilar de 100 cm acortado a 30 medía 120. Los nodos se reparten ahora por la
cuerda, y una polilínea que se dobla sobre sí misma deja de contar como recta.

**La mano quedaba armada tras posar la máquina.** Posar la entrega a propósito;
al salir se quedaba puesta y el siguiente ▶ arrancaba con la máquina viva bajo
el cursor —justo lo que la herramienta de órbita por omisión (v0.2.41) está
para evitar—. Al salir se devuelve la que había.

### Verificación

`prueba-auditoria2` reproduce los once, uno por bloque: **32 comprobaciones,
todas en verde**. La batería completa queda en **64 verdes y 3 rojos de 67**
—los mismos tres fichados de la v0.2.89—, con los flojos del paralelo
(`atraviesa`, `cable-oculto`, `hub`, `uppermachine-lib`) repetidos en serie y
en verde. Como en la primera tanda, no comprueban que el arreglo esté
puesto —eso lo diría un `grep`— sino que el fallo ya no pasa. Comprobado
además al revés: con la física anterior, los bloques de la torre apilada y del
aparejo de un solo cuerpo **fallan**; con el reparto de nodos anterior, falla
el del pilar acortado.

## [0.2.89] — 2026-08-18

Dos decisiones del diseñador y los cuatro rojos que llevaban versiones sin
revisar.

### Corregido

**`garaje`, `garaje2`, `prototipo` y `prototipo2` no estaban rotas por un fallo
de la aplicación.** Llevaban versiones fichadas como «rojos de antes, sin
revisar», reventando con `reading 'click' of null` antes de medir nada. La
causa: **la herramienta de PROTOTIPO se mudó del Builder al visor** y las cuatro
seguían buscando el panel viejo, `#sec-prototipo`, que ya no existe. Reescritas
al camino real —componer en el Builder, Home → ▶ SIMULADOR → sesión anterior, y
📸 Prototipo en la barra—, **las cuatro pasan**. Con ellas la batería sube de 59
a 63 verdes de 66.

Dos cosas más salieron de ahí, y quedan escritas en vez de disimuladas:

- `prueba-prototipo` medía los botones «Pantalla verde» y «Captura compuesta»,
  que **no existen** desde que la herramienta se rehízo. Esa parte se retira: la
  pantalla verde sigue en la API del editor pero no la alcanza ningún mando de
  la interfaz, así que comprobarla sería medir código muerto y dar una sensación
  de cobertura que no existe. El rodaje de hoy —cargar, calzar, fijar y
  producir— lo cubre `prueba-prototipo2` de punta a punta.
- `prueba-prototipo` no ponía ni una pieza antes de saltar al visor, así que no
  había sesión que recuperar. Ahora compone algo que fotografiar, que es de lo
  que va la herramienta.

### Cambiado

**El cuello en el bloqueo del peso muerto pasa a 19°**, a mitad de camino entre
la mirada al frente y la marca del suelo. Lo decidió el diseñador. Conviene
saber que no es como los demás ángulos del archivo: la salida está RESUELTA
contra un blanco medible —el punto del suelo a dos metros— y esto es un
criterio.

**El alcance del brazo del esqueleto se queda como está** (56 cm de hombro a
centro de mano, contra los ~65 de la norma antropométrica). El esqueleto sale
del modelo del diseñador y él decide que refleje su modelo; el coste ya está
escrito donde toca: el peso muerto se inclina más de lo que enseña la lámina
porque el brazo no llega.

## [0.2.88] — 2026-08-18

### Corregido

**La entrada de v0.2.10 faltaba en este archivo.** Se escribió en su día —está
en el commit que publicó esa versión— y se perdió en una edición posterior, así
que el historial tenía un hueco entre la 0.2.9 y la 0.2.11 aunque la versión
existiera, con su tag y su código. Restaurada tal cual se escribió: el jalón
bajo del TTP con libertad de vectores y transmisión completa al carrier.

Con eso el CHANGELOG cubre las 88 versiones del ciclo 0.2 sin un solo salto.

## [0.2.87] — 2026-08-18

Batería completa en serie sobre el build final, para cerrar la release.

**59 verdes y 7 rojos de 66**, y los siete rojos vienen de antes: `garaje`,
`garaje2`, `prototipo` y `prototipo2` revientan en el asistente de proyecto
nuevo, `fable-v214` se agota antes de arrancar, `uppermachine` deja 5
aserciones y `v251` una (las piernas entran 2,5 cm en el banco).

Lo que dejó de estar en rojo, medido y no supuesto: **`freno` y `atraviesa`
salieron verdes** —estaban fichados como intermitentes—, y con ellas
`cable-oculto`, `800-debug`, `800-debug2`, `800-debug3` y `uppermachine-lib`,
que solo caían en paralelo. `sitio` pasa con el Next.js levantado.

### Corregido

**Dos aserciones que rompió el grupo BARRA de v0.2.81.** `ergonomia-v256` y
`v251` afirmaban que POSAR tiene cuatro grupos por tarea, y añadir BARRA lo dejó
en cinco. No es un defecto de la aplicación sino de las pruebas, y se corrigen
diciendo lo que de verdad protegen: no el número, sino que POSAR siga agrupado
por tarea y no vuelva a ser una columna de mandos sueltos. BARRA va entre
Postura y Articulación porque es parte del «qué ejercicio» —elegirla fija las
dos posturas del recorrido y la zona de movimiento— y la articulación es el
afinado de lo ya elegido.

### Cambiado

`pruebas/LEEME.md` recoge la medición de hoy en su ficha de rojos conocidos, que
llevaba desde v0.2.75 sin rehacerse.

## [0.2.86] — 2026-08-18

### Corregido

Dos estados de la barra que no se invalidaban. Ninguno de los dos rompía nada a
la vista, y por eso convenía cazarlos antes de la release.

- **Quitar el maniquí dejaba la barra enlazada a un cuerpo inexistente:** la
  pieza se quedaba clavada donde estuviera, el panel seguía anunciando «100 kg
  en las manos» y el ⤒ Desrackear no tenía a quién devolvérsela. Ahora la
  suelta — y la deja en la escena, porque es una pieza más y puede seguir
  siendo útil.
- **Cambiar la talla del maniquí dejaba el apoyo calculado contra el cuerpo
  ANTERIOR.** El punto de contacto se guarda en coordenadas del tronco para no
  recalcularlo por fotograma, pero con otra talla esa malla es otra: la barra
  habría quedado flotando o metida en el pecho. Ahora se recalcula.

Y ojo con el parecido entre los dos: cambiar la talla también reconstruye la
figura por dentro, pero es el MISMO maniquí, así que ahí la barra NO se suelta
— perder el ejercicio al mover el cursor de la altura sería desconcertante.

### Pruebas

`prueba-barra-maniqui.mjs` sube a 54 con los dos casos y su diferencia.

## [0.2.85] — 2026-08-18

Documentación al día para la release.

### Cambiado

- **Instructivo:** la barra en manos del maniquí entra en la ficha «¿Cómo uso el
  maniquí?» — las cuatro configuraciones y sus dos extremos, por qué el apoyo no
  es el mismo en un rack que en un press, el rackeo sobre los ganchos de la
  escena y que elegir un ejercicio deja armada su zona de movimiento.
- **`pruebas/LEEME.md`:** la batería pasa a 66 pruebas y se documentan los dos
  fallos de apoyo que solo se vieron midiendo, más la aserción que hubo que
  retirar por estar mal escrita.
- **Cápsula del tiempo:** entrada del 18 de agosto con seis capturas del ciclo
  v0.2.78–v0.2.84.

## [0.2.84] — 2026-08-18

### Añadido

**Poner la barra deja armado el ejercicio entero.** Elegir «peso muerto» y
tener que ir a marcar «bisagra» a mano en la otra pestaña era pedir dos veces lo
mismo: la barra ya dice qué se está haciendo. Ahora cada configuración activa su
zona de movimiento —inferior para las sentadillas, superior para el press,
bisagra para el peso muerto— y solo esa, así que el 8/9 mueve lo que toca desde
el primer momento.

Con eso la función se cierra de punta a punta: se elige el ejercicio, la barra
aparece en las manos con sus discos, se pulsa el empuje y la barra sube. Medido:
41 cm en el peso muerto, 20 en la sentadilla frontal, 6 en el press.

### Corregido

**Un sentido de gesto inválido destruía el maniquí.** `moverPrimitiva` espera
+1 o −1; llamándola con otra cosa —un `"empuje"` en vez de un `1` desde un
guion, un campo vacío— la aritmética metía **NaN** en las rotaciones, y de ahí
no se vuelve: la figura entera pierde su posición y hay que rehacerla. Lo
encontré escribiendo la prueba del gesto, equivocándome yo mismo al llamarla.
Ahora un sentido o un paso que no sean números se ignoran y el cuerpo se queda
como estaba.

### Pruebas

`prueba-barra-maniqui.mjs` sube a 50: comprueba que cada configuración deja
armada su zona y solo esa, y que el empuje mueve la barra de verdad.
`prueba-zonas.mjs` gana la regresión del sentido inválido — que la basura no
mueva nada y que el maniquí siga entero.

## [0.2.83] — 2026-08-18

### Corregido

**El rack frontal: la mano se apoyaba ENCIMA de la barra en vez de sujetarla.**
Otra corrección del diseñador, y la medida le da la razón: con la barra puesta,
el centro de la mano quedaba 8,2 cm POR ENCIMA del eje. En un rack frontal los
dedos van POR DEBAJO y retienen la barra para que no ruede hacia delante y se
caiga; una mano encima la empuja, no la sostiene.

Los ángulos nuevos son un ajuste contra CINCO medidas de la figura frontal del
.obj —mano 0,8 cm bajo el eje, agarre a 34,1 cm de la línea media, codo 25,1 cm
bajo la barra y 8,5 por delante—. Quedan: mano 1,2 cm del eje, agarre 34,4 y
codo −27,3 / +0,4.

Dos cosas que aprendí midiendo y que no habría acertado a ojo:

- **El agarre ancho no es para llegar**, es para el codo. Con agarre estrecho la
  mano alcanza la barra perfectamente; lo que compra la anchura es altura de
  codo, que es lo que impide que la barra ruede. Es exactamente la compensación
  que describió el diseñador para la falta de rango de hombro, codo y muñeca.
- **En el modelo el codo NO va alto**: va veinticinco centímetros por debajo de
  la barra. Yo lo había supuesto arriba.

**Extensión de muñeca, para que el puño ENVUELVA la barra.** Con la mano en su
sitio la postura todavía se veía mal: el eje de empuñadura del puño quedaba 54°
cruzado con el de la barra y la mano parecía pegada al lado en vez de agarrando.
Con extensión de muñeca baja a 10,6° en la frontal y a 2,2° en la trasera.
Comprobado antes de aplicarlo que la X positiva es extensión —con el brazo
colgando lleva la mano hacia atrás— y no flexión, que es lo que el ajuste había
elegido por su cuenta.

### Pruebas

`prueba-barra-maniqui.mjs` sube a 43. Tres guardias nuevas: que la mano está EN
la barra y no encima, que el puño la envuelve en lugar de apoyarse de lado, y
que lo consigue con extensión de muñeca.

Y una aserción vieja RETIRADA porque era mía y estaba mal: decía que en los
racks la barra no debía estar en el puño. La toca, y debe tocarla. Lo que
distingue un rack de un press no es si la mano llega, sino QUIÉN SOSTIENE la
barra — se comprueba doblando el codo: en el rack la barra no se inmuta, en el
press se va con la mano.

## [0.2.82] — 2026-08-18

### Corregido

**Los puntos de apoyo de la barra en los dos racks: estaba METIDA en el
cuerpo.** Lo señaló el diseñador sobre una captura, y al medirlo era cierto: la
barra entraba 1,3 cm en el pecho en la sentadilla frontal y 0,9 en el tronco y
1,1 en el brazo en la trasera. Se veía apoyada y estaba dentro.

La causa era el método. La colgaba de un desplazamiento medido contra la
ARTICULACIÓN DEL HOMBRO, y el hombro de un cuerpo escaneado no tiene un centro
evidente: según se estime por el eje de la malla o por la costura con el pecho,
se mueve cinco centímetros. Con ese error de partida, cualquier constante que
saliera de ahí colocaba mal la barra.

**Ahora el apoyo se calcula por CONTACTO contra la propia malla del maniquí**,
que es lo que dice el .obj del diseñador cuando se le pregunta bien: en la
frontal el cuello queda el 100 % por detrás del eje de la barra y el pecho la
toca a los lados de la línea media —apoyo HORIZONTAL contra clavículas y
deltoides—; en la trasera el 80 % del cuerpo cercano queda por delante —la
barra va detrás del cuello y se apoya ENCIMA, sobre la repisa del trapecio—.
Son dos apoyos de naturaleza distinta y ahora se resuelven distinto.

Y se resuelve con TANGENCIA EXACTA, no muestreando puntos: la barra es un
cilindro tumbado y toca por donde le da la gana, así que basta que un vértice
del hombro quede más adelantado que el punto muestreado para que entre en la
carne. Para cada vértice que cae dentro del ancho del cilindro se calcula la
cota a la que dejaría de tocarlo y se toma la más exigente de todas.

El cálculo se hace UNA VEZ y se guarda en coordenadas del tronco: el contacto
es propiedad de la geometría, no de la postura, así que el tronco gira y el
apoyo gira con él. Si mañana se sustituye el modelo del maniquí, el apoyo se
recalcula solo.

Resultado: tronco 0,0 cm en las dos —apoyada, ni hundida ni flotando—, cuello y
cabeza libres, y la mano sobre la barra.

### Pruebas

`prueba-barra-maniqui.mjs` sube a 35 comprobaciones con la guardia que faltaba:
mide la distancia de cada vértice del segmento al EJE de la barra y se queda
con la menor. Cero es apoyada; negativo, dentro de la carne. Es la que habría
cazado el fallo original, que no se veía en ninguna captura.

## [0.2.81] — 2026-08-18

**La barra en manos del maniquí.** Hasta aquí la figura posaba sola: se le daba
una sentadilla frontal y se veía a alguien sujetando aire. Un rack se
dimensiona por dónde queda la barra CARGADA, así que ahora la barra es una
pieza de verdad de la escena, con sus discos y su peso, colgada del cuerpo.

### Añadido

**Cuatro configuraciones con barra** —sentadilla frontal, sentadilla trasera,
press vertical y peso muerto—, cada una con sus DOS extremos del recorrido: un
ejercicio no es una postura, y un rack se mide por dónde queda la barra arriba
(para colgarla) y dónde queda abajo (para que los brazos de seguridad la cojan
si falla).

**Dónde se apoya la barra, que no es lo mismo en las cuatro:**

- En los dos RACKS la barra no la sujetan las manos, la sostiene el CUERPO —
  deltoides y clavículas en la frontal, trapecios en la trasera—. Su sitio va
  medido contra la ARTICULACIÓN DEL HOMBRO y en el marco del tronco: 11,9 cm
  por delante y 4,8 por encima en la frontal, 5,7 por detrás y 6,9 por encima
  en la trasera. Si el tronco se inclina, la barra se inclina con él.
- En press y peso muerto la barra SÍ va en las manos, así que su sitio es el
  punto medio entre los dos puños. Anclarla al hombro aquí dejaría una barra
  flotando lejos del agarre en cuanto el brazo se mueve.

**Carga de discos y peso real.** Los discos se montan sobre la barra con el
mismo mecanismo que el resto de piezas cargables, y el peso total sale de la
pieza: cuatro discos de 20 sobre una barra de 20 son 100 kg.

**Rackear y desrackear sobre soportes de verdad.** Los ganchos no se declaran a
mano: se leen de las piezas que ya saben recibir una barra —las que llevan
`asientoBarra` y las placas dentadas, que declaran un asiento por diente—. Un
rack tiene DOS ganchos, así que no basta el más cercano: se busca su pareja
—mismo eje, misma cota, separada a lo largo de él— y la barra se centra entre
ambos. Rackeada, la sostiene el gancho: agacharse ya no se la lleva.

**La barra sigue al cuerpo sin que nadie la toque.** Se recoloca en el bucle de
frame, después de resolver la IK, así que da igual por qué camino se movió el
maniquí —una postura, el arrastre de una articulación, girar la figura entera,
la simulación—: la barra llega igual.

### Corregido

**La salida del peso muerto, otra vez, y esta con una prueba física detrás.**
Con «compensa con más flexión de rodilla y cadera» entendí la ARTICULACIÓN del
rig y adelanté la rodilla 49°: salió una cargada desde el fondo, no un peso
muerto. En una bisagra la flexión de cadera es el TRONCO sobre el fémur, que en
este esqueleto vive en `spine` porque la pelvis es la raíz y no rota. Rehecha
con la espinilla casi vertical (15°), la cadera se va atrás y arriba —6,9 cm
por encima de la rodilla— y el tronco baja.

Lo que lo confirma no es una captura: **los discos APOYAN en el suelo**. Con la
postura anterior flotaban 4,7 cm, que era la física diciendo que la figura no
llegaba a la barra.

### Pruebas

`prueba-barra-maniqui.mjs` (24 comprobaciones). Mide relaciones: que la barra
va delante del hombro en la frontal y detrás en la trasera, que en press y peso
muerto va en el puño, que baja con la figura sin despegarse del trapecio, que
el disco apoya en el suelo en la salida del peso muerto, y que rackearla la
deja a la altura del gancho y agacharse ya no se la lleva.

## [0.2.80] — 2026-08-18

Corrección del diseñador sobre la salida del peso muerto.

### Corregido

**La regla es de vista sagital, y la puso él:** una vertical imaginaria pasa
por el MEDIO DEL PIE, la barra y los brazos, que caen a plomo en línea recta
hasta los hombros. Y con proporciones estándar, quien no llega a la barra
compensa con MÁS FLEXIÓN DE RODILLA Y CADERA, no inclinando más el tronco —
que es justo lo que hacía la versión de v0.2.79, con el tronco a 61° y la
barra 7 cm por delante del medio del pie.

Rehecha contra esa regla: barra a 0,6 cm del medio del pie, hombro a 0,9 cm de
esa misma vertical, brazo a 1,5° de la plomada, planta plana y cadera 2,7 cm
**por encima** de la rodilla, que es lo que separa un peso muerto de una
cargada desde el fondo. El tronco baja de 61° a 31,5° y la rodilla se adelanta
de 35° a 49°.

De las tres repartos posibles se eligió este. Los otros dos cumplían la
vertical pero uno sentaba la cadera 2 cm por DEBAJO de la rodilla y el otro se
llevaba la barra 7 cm por delante del pie. Lo que cede aquí son cuatro
centímetros de altura de barra: el alcance del brazo de este esqueleto es de
56 cm del hombro al centro de la mano, y con la espinilla en los 15° de la
lámina la mano no baja de 28,5 cm por mucha cadera que se flexione.

**La mirada fija un punto a dos metros por delante de donde pisa, en el
suelo** — mantiene la técnica y protege el cuello. Resuelto contra ese blanco,
la desviación queda en 0,1° y la vista sale 29° bajo la horizontal. En el
bloqueo el cuello se deja NEUTRO a propósito: mantener la misma marca con el
tronco ya erguido pediría bajar la barbilla 38°, y ahí ya no protege nada.

**La apertura del pie en las sentadillas se queda en los 36° medidos.** No se
pone a mano: es consecuencia de la abducción de cadera, y así es como sale en
un cuerpo real.

## [0.2.79] — 2026-08-18

Primer trozo de la barra en manos del maniquí: las cuatro posturas que faltaban
para que las configuraciones con barra tengan principio y final.

### Añadido

**«Press vertical (rack)», «Press vertical (bloqueo)», «Peso muerto (suelo)» y
«Peso muerto (bloqueo)».** Estas no salen del `.obj` del diseñador —allí solo
hay sentadillas—, así que no se estiman a ojo: se resuelven contra las reglas
que dan las láminas de referencia, ajustando el rig con el mismo descenso por
coordenadas que las sentadillas.

- **Peso muerto.** Manda LA BARRA, no el cuerpo: centro a 22,5 cm del suelo
  (radio del disco de 45) y sobre el METATARSO, no sobre el centro del pie. A
  partir de ahí, brazos verticales, planta plana, cadera por encima de la
  rodilla y hombros sobre la barra. Sale a 22,7 cm de altura, 1,1 cm por
  delante del metatarso, brazo a 2° de la plomada y cadera 4 cm sobre la
  rodilla.
- **Press vertical.** La salida NO es el rack de la sentadilla frontal, y eso
  lo corrigen las láminas: allí el codo va arriba, aquí el ANTEBRAZO VA
  VERTICAL bajo la barra. Queda a 0,5° de la plomada, con la muñeca 15,2 cm
  sobre el hombro (altura de clavícula), la mano 7,7 cm por fuera y el codo
  10,9 cm por delante. El bloqueo pone la mano a 190,9 cm, 15,9 sobre la
  cabeza y la barra sobre el medio del pie.

**El precio, y conviene que esté escrito:** el brazo del rig es corto. De pie,
su mano queda a 79,9 cm del suelo, unos 6 cm más alta que la de una persona de
175. Esos centímetros se pagan bajando más el cuerpo, y se pagan en el peso
muerto: tronco a 61° de la vertical contra los ~55 de la lámina, y espinilla a
35° contra 15-20. La barra queda donde tiene que quedar; el cuerpo llega a ella
algo más plegado que en el dibujo. Alargar el húmero toca todas las posturas ya
medidas y no entra aquí.

## [0.2.78] — 2026-08-18

La secuencia de sentadilla con barra que mandó el diseñador —cuatro figuras:
de pie y fondo de una **sentadilla frontal** y de una **trasera**— medida y
metida en el maniquí como cuatro posturas.

### Añadido

**Cuatro posturas nuevas:** «Sentadilla frontal (arriba)», «Sentadilla frontal
(fondo)», «Sentadilla trasera (arriba)» y «Sentadilla trasera (fondo)». Salen
de medir el `.obj`, no de estimarlas a ojo: en la pareja frontal cada parte del
cuerpo viene como objeto propio, así que muslo, tibia, pie, brazo, antebrazo y
mano se miden como segmentos y los centros articulares se sacan de donde dos
mallas vecinas se solapan. Los grados que quedan en la biblioteca son el
resultado de **ajustar el rig contra esas direcciones** —un descenso por
coordenadas sobre los ejes que cada articulación tiene—, con un residuo de ~1°
en la pierna y en el brazo frontal y ~6° en el trasero, que es lo que se puede
pedir cuando el tronco y los brazos de esa pareja vienen fundidos en una sola
malla.

**Lo que enseña el modelo, y no es lo que yo esperaba:**

- **Las piernas son las mismas en las dos sentadillas.** No parecidas: los
  extremos de muslo, tibia y pie coinciden unidad a unidad entre la figura
  frontal y la trasera. Lo único que distingue un ejercicio del otro es dónde
  va la barra y qué hacen los brazos para sujetarla.
- **El tronco casi no cambia.** Registrando la malla del pecho de la figura de
  pie sobre la del fondo —es la misma malla, vértice a vértice, así que la
  rotación entre ambas es exacta— el giro sale 0,0° en las dos. Lo único que se
  mueve en la trasera es que el pecho se adelanta 3,4° respecto de la pelvis.
  Las dos bajan con el tronco a plomo.
- **La barra**, medida contra la articulación del hombro: 12 cm DELANTE en la
  frontal (deltoides y clavícula) y 5,7 cm DETRÁS en la trasera (trapecios).
- **El pie sale abierto 36° sin orientarlo a mano.** No se pone en ninguna
  parte: cae solo de la abducción de cadera más la flexión y la rodilla, y da
  36,0° contra los 36,2° medidos.

### Corregido

**El tope de dorsiflexión de tobillo se documentaba con una medida mala.** La
nota decía 49,5° citando este mismo modelo; midiendo sobre los centros
articulares en vez de sobre el eje de la malla salen 43,0°. El tope se queda en
50 —es un tope, no un valor por defecto—, pero la cifra que lo justifica ahora
es la buena.

### Pruebas

`prueba-sentadilla.mjs` cubre también las dos sentadillas con barra. Comprueba
relaciones, no constantes: que las dos comparten pierna, que la rodilla flexiona
126° **en 3D** —la identidad plana `muslo − rodilla = espinilla` deja de valer
en cuanto la cadera abre 36° y saca la pierna del plano sagital—, que la planta
queda plana y el pie abierto, y que la mano cae DELANTE del hombro en la frontal
y DETRÁS en la trasera, que es lo que hace que sean dos ejercicios y no uno con
dos nombres.

## [0.2.77] — 2026-08-17

Los doce hallazgos GRAVES que quedaban de la auditoría adversarial. Con los
tres de v0.2.76, quedan corregidos los 2 críticos y los 13 graves; siguen
abiertos 12 de gravedad media y baja.

### Corregido

**Herramientas que no se apagaban.** Había nueve modos que capturan el clic del
visor y cada sitio que necesitaba apagarlos cancelaba los que su autor recordaba
ese día. De ahí salían dos fallos que se sentían como desobediencia:

- **«+ Bisagra» y «+ Corredera» solo apagaban el cable.** Con la roldana a
  medias, el botón se iluminaba, el panel anunciaba «clic en la 1.ª pieza» y el
  clic siguiente seguía plantando roldanas. Pedías una bisagra y salía otra cosa.
- **«Nuevo proyecto», «Cargar» y Deshacer dejaban viva la roldana**, con su
  línea guía azul flotando sobre una escena vacía y apuntando a una viga que ya
  no existía. Un clic junto a esa línea fantasma plantaba una roldana entera.

Ahora hay **un solo apagado** (`cancelarHerramientas`) y lo usan todos. Añadir
un modo nuevo y olvidarse de esa lista vuelve a abrir el agujero, así que lo
que se añada va ahí y no en cada sitio.

**No se podía girar la vista mientras se trazaba.** La herramienta de línea
fijaba el punto al PULSAR y con cualquier botón: el arrastre de órbita marcaba
el inicio y el siguiente creaba un pilar entre dos sitios que nadie eligió; el
arrastre derecho, que solo encuadra, hacía lo mismo. Ahora el punto se fija al
SOLTAR, solo con el botón izquierdo y solo si el puntero no viajó.

**La rejilla de calce inventaba agujeros.** Se extendía hasta 2 cm de las
puntas del poste sin mirar cuántos pinholes tiene la malla: la media columna
POWERRACK anunciaba «agujero X de 19» donde tiene 10, y la jota subía medio
metro por encima del último agujero real, calzada sobre acero macizo con el pin
apoyado en la nada. Los recuentos ya estaban sondeados y anotados en comentarios
(30 filas y 10); ahora se hacen cumplir.

**Las uniones se quedaban atrás.** Mover un grupo con las flechas o con la
herramienta Arrastrar movía las piezas pero dejaba el ancla de la bisagra
clavada en el sitio anterior; al simular, pivotaba alrededor del punto viejo y
el conjunto se desencajaba. Con el gizmo sí funcionaba: eran los otros dos
caminos, que no llamaban a `transformarUniones`.

**El inspector movía piezas en silencio.** Escribir una coordenada o unos
grados no avisaba por el bus: la cadena o el cable anclados seguían dibujados en
el sitio viejo, colgando en el aire; la barra de medida no cambiaba; y el
proyecto no quedaba marcado como modificado, así que ni ofrecía guardar al salir
ni Ctrl+Z deshacía el movimiento.

**El ⌀ de agujero no tenía tope.** Un valor mayor que el perfil dibujaba los
agujeros como material FUERA de la viga y le engordaba la caja de colisión —16
cm de alto donde el perfil son 5—, así que en simulación chocaba con cosas que
no toca. Se acota al 90 % del lado menor.

**«▶ Manipular» encendía el motor sin replegar la interfaz.** La paleta, la
barra superior y la de herramientas seguían a la vista y habilitadas, pero
medias muertas: se pulsaba «Colocar» en un pilar y no pasaba nada, ni un aviso.
Ahora repliega como la simulación, y al salir vuelve.

**Cargar un `.json` ajeno vaciaba la escena.** Elegir por error un prefab —que
se llama igual y sale en el mismo selector— avisaba «Archivo de proyecto no
válido» con la escena YA vacía y el deshacer borrado. Ahora se comprueba antes
de tocar nada.

**Los puntos de partida no viajaban.** Se perdían al cerrar y, peor, seguían
ofreciéndose tras «Nuevo proyecto»: al aplicar uno, la máquina arrancaba en su
diseño y el maniquí saltaba a la posición que tenía en el otro proyecto. Ahora
se guardan en el fichero, por índice de pieza como las manos apoyadas.

**El «Bloque de peso» no podía deslizar por sus tubos.** Son 4 cm de plancha
contra un umbral de abrazo de 5, así que el motor lo veía macizo contra los
tubos que lo atraviesan y lo despedía de lado. Pero su grosor no es lo que
decide: tiene **orificios pasantes**, está hecho para enhebrarse. A las piezas
que los declaran se les pide menos recorrido interior.

**El cable fugaba memoria de vídeo.** `setFromPoints` fabrica un atributo nuevo
en cada llamada y three.js no borra el búfer del que sustituye; esto corre en
cada fotograma de simulación, así que una sesión larga con cables iba
degradándose hasta arrastrar la pestaña o perder el contexto WebGL, y parar no
recuperaba nada. Ahora se reescribe el búfer y solo se pide otro cuando cambia
el número de nodos.

### Sabido

- Prueba nueva, `auditoria`: reproduce cada fallo con la secuencia que lo
  destapó. La batería pasa a **65**. Escribirla cazó de paso dos montajes míos
  que daban verde sin ejercitar nada — la primera versión del ancla «pasaba»
  porque el grupo no llegaba a moverse.

## [0.2.76] — 2026-08-17

Los tres primeros hallazgos de la auditoría adversarial previa a la release
(70 agentes: ocho rastreadores sobre subsistemas distintos y dos verificadores
por hallazgo con el encargo de tumbarlo). Sobrevivieron 27; aquí van los dos
críticos y el que afecta a la pieza nueva.

### Corregido

- **CRÍTICO — la recta de una guía era infinita, y cualquier pieza alineada con
  un pilar lo atravesaba.** Un contrapeso dejado sobre la punta de un pilar no
  se apoyaba: al arrancar la simulación pegaba un salto hacia abajo, se metía
  dentro del pilar y bajaba atravesándolo hasta el suelo, además de quedar
  clavado a esa vertical sin poder volcar. Nada lo delataba en la geometría.

  El detector de guías proyectaba el centro de la pieza móvil sobre la recta
  de la guía y solo comprobaba que ese punto cayera dentro de la caja de la
  MÓVIL — nunca que la móvil solapara con el TRAMO del tubo. Así, una pieza
  posada sobre la punta entraba en el criterio igual que un manguito ensartado,
  y como el guiado no choca con su guía (esa exclusión existe para que los
  manguitos deslicen sin rozamiento), el pilar se volvía un fantasma. Ahora se
  exige solape axial real: el tubo tiene que atravesar de verdad ≥ 5 cm del
  volumen de la móvil, que es justo lo que ya prometía el comentario del abrazo.

  Medido: el contrapeso caía de y=250 hasta el suelo; ahora se queda en 219,2,
  apoyado sobre la punta del pilar.

- **CRÍTICO — los paneles de roldana y bisagra sobrevivían a entrar en
  simulación y montaban el herraje dentro del mundo en marcha.** Con el panel
  abierto se podía pulsar ▶ (el panel no se oculta: la regla que repliega la
  interfaz de edición no lo alcanza) y luego «Instalar bisagra». Las placas y el
  pasador se colocaban según dónde estaban las piezas EN ESE INSTANTE; al parar,
  las piezas volvían a su pose de diseño y el herraje se quedaba flotando,
  soldado a algo que ya no estaba ahí — y al siguiente ▶ esas soldaduras pegaban
  un tirón.

  Los dos instaladores se ejecutan desde una promesa que puede resolverse mucho
  después de abrirse el panel, y validaban que las piezas existieran (defensa
  contra el borrado) pero no que la simulación estuviera parada. Ahora llevan el
  mismo guardia de entrada que todos los `begin*`, y arrancar la simulación
  cancela además los modos de roldana y placa dentada, que quedaban armados
  sobre una escena en movimiento.

- **Voltear una placa dentada dejaba los ganchos físicos en el lado contrario
  al que se ve.** Voltear no escala en negativo —eso daría semiejes
  imposibles— sino que HORNEA el espejo en los vértices; y la placa no declara
  sus cajas leyendo la malla, sino calculándolas de sus medidas, así que se
  quedaban sin voltear. Donde el usuario veía los ganchos, la física tenía la
  losa lisa de la espina, y los ganchos de verdad flotaban diez centímetros al
  otro lado, dentro del pilar. Medido: malla y física coinciden ahora al 100 %.

### Sabido

- **`freno` pasa de rojo constante a INTERMITENTE, y no está arreglado.** El
  arreglo de las guías movió su medida (antes daba 12,5 cm de recorrido donde
  espera 13,1) pero no la estabilizó: medido 2 verdes de 3 en serie. Junto con
  `atraviesa`, son las dos que quedan midiendo recorrido simulado con espera de
  reloj — la misma enfermedad que se corrigió en `hub` y `placa-dentada` en
  v0.2.75.

- **Quedan 24 hallazgos confirmados sin tocar**, de gravedad alta para abajo,
  repartidos por herramientas, interfaz y datos. Ninguno es de las piezas
  nuevas. Están inventariados para decidir cuáles entran en la release.

## [0.2.75] — 2026-08-17

### Cambiado

- **La sentadilla del maniquí es ahora una sentadilla de verdad.** Los ángulos
  anteriores —cadera 70, rodilla 110, tobillo 20, columna 25— estaban puestos a
  ojo y daban una postura A MEDIAS: la figura bajaba, pero la cadena no cerraba.
  Con la espinilla clavada casi vertical la rodilla no podía adelantarse, sin
  rodilla adelante la cadera no tenía dónde ir, y el tronco se quedaba tieso. Se
  veía a alguien empezando a sentarse.

  Los nuevos salen de **medir el modelo** que envió el diseñador, no de
  estimarlos: en él la figura baja al 52 % de su altura de pie, y sacando los
  puntos de la silueta sagital —la rodilla es lo más adelantado, el glúteo lo
  más atrasado, el tobillo donde la pierna se estrecha sobre el pie— quedan la
  espinilla a **37,6°**, el muslo a **82°** (horizontal), el tronco a **44,7°**
  y **119,5°** de flexión de rodilla. La aplicación reproduce hoy 38 / 82 / 45,
  con la planta plana en el suelo.

- **La dorsiflexión del tobillo sube de 20° a 40°.** Estaba topada en 20 con la
  nota de que era «el tope humano», y no lo es: 20° es el tope de pie y sin
  carga. En cuclillas, con el peso encima y el talón en el suelo, el tobillo
  pasa de 35 — es la articulación que decide si alguien puede bajar del todo, y
  por eso los levantadores usan cuña. Con el tope viejo la espinilla no podía
  inclinarse y **ninguna** sentadilla podía salir congruente.

### Sabido

- **En la cadera NO va el ángulo anatómico de flexión.** Cuesta un rato verlo y
  conviene dejarlo escrito: los 126,6° que forman tronco y muslo en el modelo
  NO son lo que espera `hipL`. En este esqueleto la cadera es la RAÍZ de la
  pierna (`PARENT_JOINT.hipL` es `null`), así que su ángulo se mide contra la
  vertical de la figura y no contra el tronco. Poniendo los 127 anatómicos, el
  muslo apuntaba hacia arriba, la espinilla salía casi vertical (7°) y el pie se
  iba treinta centímetros hacia delante: una postura que en la captura parecía
  una sentadilla y por dentro no lo era. Lo que va son los **82°** que el muslo
  se separa de la vertical, y entonces la cadena cierra sola — 82 − 120 = −38 de
  espinilla, que es justo la dorsiflexión del tobillo, y de ahí que la planta
  quede plana.

- **La figura queda al 68 % de su altura de pie y el modelo al 52 %.** La
  diferencia es el cuello: en el modelo la cabeza va metida hacia el pecho y
  aquí se queda neutra. Las cuatro articulaciones que se pidieron —espalda,
  cadera, rodilla y tobillo— sí coinciden con lo medido.

- **El `.obj` trae tres mallas y solo una es la sentadilla.** `Mesh_33` es la
  figura de pie (referencia), `Mesh_11` la sentadilla profunda —es la única con
  el doble de profundidad sagital, 0,365 frente a 0,179— y `Mesh_2` una tercera
  postura que no se ha usado. `Mesh_11` no comparte topología con las otras dos,
  así que sus ángulos hubo que sacarlos de la geometría y no de un Kabsch por
  hueso.

- Prueba nueva, `sentadilla`: la batería pasa a **64**.

## [0.2.74] — 2026-08-17

### Añadido

- **El intervalo entre ganchos de la placa dentada se puede elegir**, que es
  lo que decide a cuántas alturas distintas se puede dejar la barra. Se
  pregunta al empezar a colocarla y se puede cambiar después, con la placa
  seleccionada, en el panel de propiedades (**Ganchos de la placa**), junto al
  número de ganchos. El panel dice en todo momento cuántos ganchos hay, cada
  cuánto y en qué largo de placa.

  Cambiar el intervalo **no cambia el largo** de la plancha: manda lo que se
  trazó sobre el pilar, y lo que se recalcula es cuántos ganchos caben dentro.
  Solo crece si se piden a mano más de los que entran.

### Corregido

- **De doce ganchos, solo servía uno.** Al intervalo con el que nació la pieza
  —8 cm— una barra soltada sobre cualquier gancho que no fuera el de más
  arriba se quedaba **posada encima de los dientes** en vez de entrar en la
  cuna. Medido soltando una barra sobre cada uno de los doce: sujetaba **1**.

  El de arriba funcionaba porque es el único que no tiene otro diente encima —
  y era justo el que probaba la prueba de v0.2.73. La placa se veía impecable.

  La causa es que el diente **escalaba con el intervalo**: separar los ganchos
  agrandaba también el diente, de modo que el pasillo por el que la barra tiene
  que colarse —entre la punta de un dedo y el faldón del gancho de arriba— casi
  no crecía. Ahora la cuna, el labio y la garganta los manda **la barra**, y el
  faldón es lo que cede: se aplana cuando los dientes se juntan. Y hay un
  **intervalo mínimo** que se hace cumplir, calculado de tres condiciones —que
  quepa la barra por la boca, que quepa por el pasillo y que bajo la cuna quede
  acero de verdad—. Con la barra de este proyecto salen **11,9 cm**; el de
  fábrica pasa de 8 a **12,5**.

  Medido de nuevo, soltando una barra sobre **cada** gancho: 7/7 a 12,5 cm,
  6/6 a 15, 4/4 a 20 y 3/3 a 26.

- **Cambiar el intervalo despegaba la placa del pilar.** El gancho crece con el
  intervalo, y el ancho que guarda la pieza es el TOTAL —espina más vuelo—, así
  que al engordar el vuelo lo que encogía era la **espina**, justo la parte que
  apoyaba en la cara del poste: la placa se corría hacia dentro y sus ganchos se
  metían en el pilar. Tampoco se veía; lo que fallaba era la barra, que empezaba
  a chocar con el poste. Ahora se conserva la espina, se recalcula el ancho y la
  pieza se corre media diferencia de vuelo para seguir apoyada donde estaba.

- **La placa ya no ofrece controles que no hacen nada.** Doblar y retorcer no
  la afectan —su geometría se genera antes de esa fase—, así que el panel deja
  de enseñarlos.

- **Abrir un proyecto de v0.2.73 estiraba la placa.** Traía sus ganchos cada
  8 cm; al subir el paso al mínimo, la plancha crecía para alojar los que había
  —de 100 cm a 146— y se salía por los dos extremos del pilar sobre el que se
  dibujó. Pedir más ganchos SÍ estira la placa, porque es una decisión; que la
  estire un mínimo que el usuario no pidió, no. Ahora lo que se recorta son los
  ganchos.

- **Un intervalo de 0 colgaba la pestaña.** `dientesQueCaben` devolvía
  `Infinity` y el contorno se ponía a dibujar ganchos para siempre. No sale del
  panel —valida— pero sí de un fichero de proyecto tocado a mano. Ahora hay
  suelo y un tope de 200 ganchos, que a 12 cm de paso son 24 metros de placa.

### Sabido

- **12,5 cm entre ganchos parece mucho al lado de los 5 cm de una grilla de
  pinholes, y lo manda la barra.** Su collider es un cilindro del radio mayor
  de la malla —el de las mangas—, así que para el motor mide 6,94 cm de gruesa
  de punta a punta; un gancho tiene que dejar pasar eso más el labio que lo
  encierra. Con una barra de verdad, de 2,9, el mínimo bajaría de 6 cm. Es una
  sola constante, `DENTADA_BARRA_CM`: el día que la barra tenga un collider que
  siga su perfil, el mínimo, la garganta y el labio se ajustan solos.

- **`window.exersuite.dentada`** expone las medidas resueltas de la pieza para
  las pruebas. No es un adorno: la prueba tiene que soltar la barra en el CENTRO
  de la garganta, y recalcular ese centro en el guion sería copiar la fórmula —
  si la fórmula se equivoca, la copia se equivoca igual y la prueba pasa.

## [0.2.73] — 2026-08-17

### Añadido

- **Placa dentada (upright dentado): una plancha que hace de fila de jotas.**
  Donde había seis jotas —cada una con su manguito, su pin y su rodillo— hay
  ahora una sola plancha de acero con los ganchos recortados en el canto.

  Se coloca con una herramienta de **tres toques**:

  1. La **cara del pilar** donde va. El toque dice dos cosas a la vez: qué cara
     —ahí se atornilla— y por qué canto salen los ganchos, que es el más
     cercano al punto tocado. Se ve al momento, porque la línea guía se dibuja
     sobre ese canto.
  2. y 3. Los **dos puntos de la trayectoria**: principio y final. De ahí salen
     el largo y la ubicación.

  El **ancho no se pregunta**: la espina copia el ancho de la cara y el gancho
  vuela entero por delante del canto. Una placa más estrecha que su pilar no
  apoyaría; una más ancha se comería el canto de al lado. El **número y el paso
  de los ganchos** se configuran como los pinholes de un pilar, y son suyos —la
  placa va en las caras que NO llevan pinholes, así que no hereda esa grilla.

  Vale igual sobre un **elemento diagonal**: la trayectoria es el eje mayor de
  la pieza tocada, no la vertical del mundo. Tocar la tapa de un extremo no
  vale y lo dice.

  Y **agarra de verdad**: sus cunas son colisión, no dibujo. Una barra soltada
  sobre un gancho se sienta en él y no rueda hacia fuera.

### Corregido

- **Una plancha se hacía pasar por riel de guía, y la barra la atravesaba.**
  El detector de guías daba por tubo cualquier pieza fija alargada —«el largo
  es cuatro veces el lado mediano»—, y la placa dentada, de 12 × 60 × 0,8, lo
  cumplía de sobra. Consecuencia: el motor la tomaba por guía, tomaba la barra
  apoyada por carro guiado y **excluía el contacto entre las dos**, que es lo
  que hace la exclusión guía↔guiado para que los manguitos deslicen sin
  rozamiento. La barra bajaba despacio a través de los ganchos, como si la
  placa fuese un fantasma, y no había forma de verlo mirando la geometría.

  Ahora, además del largo, se mira la **sección**: un riel la tiene maciza —sus
  dos lados cortos se parecen—, y si uno es mucho menor que el otro es chapa, y
  por una chapa no desliza nada.

- **Los pernos de la placa no llegaban a la malla.** `mergeGeometries` rechaza
  mezclar geometrías con índice y sin él, y lo avisa **por consola sin lanzar**:
  la placa salía entera y sin un solo perno.

### Sabido

- **La garganta del gancho es más ancha que la del modelo de referencia, y es a
  propósito.** El `.obj` del diseñador dibuja el hueco a la medida justa de una
  barra olímpica: 2,87 cm, sin holgura. Aquí no sirve, por algo que no se ve
  mirando la barra — su collider es UN cilindro del radio más grande de la
  malla, el de las mangas, así que para el motor la barra mide **6,94 cm de
  gruesa de punta a punta**. Con la garganta del modelo, la barra se quedaba
  posada encima de los dientes y rodaba hasta caerse: una placa preciosa que no
  agarraba nada.

  Así que la garganta se mide contra la barra que SIMULA el motor y no contra
  la que se dibuja. El gancho sale más ancho que el del `.obj` —vuela 9,6 cm en
  vez de 4,5— y es el precio de que funcione. El día que la barra tenga un
  collider que siga su perfil (mangas gordas, eje fino, como ya hacen las vigas
  dobladas), ese suelo baja solo y el gancho recupera las proporciones del
  modelo. Mientras tanto, `dienteVuelo` deja ponerlas a mano.

- **Las medidas salen de medir el `.obj`, no de mirarlo.** Rasterizando la
  silueta de sus tres placas —una de un diente, dos de seis— y midiendo el
  pilar al que va adosada la tercera: paso 0,3188, vuelo 0,1747, espina 0,1931,
  garganta 0,1103, grosor 0,0154. Tomando los pinholes del pilar (0,1949) como
  las 2" del modelo real, la unidad del fichero son 26 cm; con eso la sección
  del pilar da **5,0 × 7,0 cm**, que es exactamente el perfil del montante TTP
  de este proyecto, y la garganta da el diámetro de una barra olímpica. Dos
  comprobaciones independientes que cierran la escala.

- **El grosor no se respeta: el `.obj` da 4 mm y la pieza lleva 8.** Una
  plancha de 4 mm con 9,6 cm de vuelo y una barra cargada encima se dobla. Es
  el parámetro `depth`, así que quien quiera los 4 mm del modelo los pone.

- `prueba-freno` falla 2 aserciones **también en serie**, y no es de este
  trabajo: sin este cambio da 12,5 cm de recorrido donde espera 13,1, y con él
  13,0. Se corrige la ficha de [LEEME](pruebas/LEEME.md), que la daba por verde
  en serie.

## [0.2.72] — 2026-08-16

### Corregido

- **Cuatro pruebas seguían midiendo el marketplace que el hub sustituyó.**
  `paleta` y `humo-v214` llegaban a la biblioteca de modelos pulsando una
  tarjeta `.mkc-card` que ya no existe; ahora entran por el «Ver en 3D» de una
  ficha del mercado. `marketplace` y `catalogo` medían las siete ventanas
  enteras —pestañas `.mk-tab`, ventanas `#mk-newcomers`— y **se retiran**: lo
  que las sustituye lo cubre `prueba-hub` con sus 62 comprobaciones.

- **`prueba-sitio` daba por rotas las imágenes diferidas.** Comprobaba
  `complete && naturalWidth > 0`, y una imagen con `loading="lazy"` que todavía
  no ha entrado en pantalla tiene `complete === false`. Con las quince
  fotografías del escaparate nuevo, las quince salían «rotas» estando bien.
  Ahora la prueba recorre la página hasta el pie antes de medir. **Es la primera
  vez que `sitio` pasa.**

### Sabido

- **La batería son 62 pruebas. El estado real, medido en serie:**

  | | |
  |---|---|
  | verdes | 55 |
  | rojas de verdad | 7 |

  Las siete: `garaje`, `garaje2`, `prototipo`, `prototipo2` y `fable-v214`
  revientan en el asistente de proyecto nuevo sin llegar a medir nada;
  `uppermachine` falla 5 aserciones —entran 41 piezas de 42 y 16 uniones de 18—;
  y `v251` falla 2 —las piernas siguen entrando 2,5 cm en el banco—. Ninguna es
  de este trabajo.

- **UNA CORRECCIÓN A LO QUE DIJE EN v0.2.63.** Allí informé de que trece pruebas
  «pasaban en serie». La comprobación que usé buscaba solo marcas `✗` en la
  salida, y **una prueba que revienta con una excepción no capturada no imprime
  ninguna**: se las dio por verdes estando rotas. Hay que mirar también el código
  de salida, que es lo que hace `correr-todo.sh`. Queda escrito en el LEEME.

- **El `vite preview` del 4174 se murió por tercera vez** a media tanda. No es
  falta de memoria ni de disco —16 GB libres, 26 GB de disco—; queda sin
  diagnosticar. Mientras tanto, conviene comprobar que sigue vivo antes de dar
  por buena cualquier reejecución.

## [0.2.71] — 2026-08-16

### Cambiado

- **LA DIRECCIÓN OFICIAL ES `exersuite-3-d.vercel.app`.** Estaba escrita sin
  guiones —`exersuite3d.vercel.app`— y no era la buena. Corregida en los cinco
  sitios donde vivía: el enlace de la Home de la aplicación (`core/sitio.ts`),
  el README, los metadatos del sitio de marketing, la guía de despliegue y la
  prueba que la comprueba.

### Añadido

- **EL SITIO OFICIAL SE PARTE EN DOS MITADES.** Arriba sigue lo de siempre
  —presentar y vender el software—; abajo, detrás de la historia, entra una
  **versión de escaparate del hub**.

  Es a propósito una versión CORTA, no el hub metido con calzador: cuatro
  filtros en vez de seis recorridos, ninguna ficha abre detalle, y no se puede
  comprar nada. El botón de cada tarjeta lleva al precio del software, no a un
  carrito, porque lo que vende la página es la aplicación.

  Se puede filtrar por marca —pulsando su logotipo— y por recorrido: todo el
  catálogo, recién lanzados, marcas recién llegadas y talleres que fabrican
  cerca. El contador se mueve en vivo.

  **Usa los tokens del sitio —tinta y papel hueso— y no el negro con naranja de
  la aplicación.** Es la misma marca contando lo mismo, no un trozo de la app
  pegado dentro.

- **`lib/hub-datos.json`, generado, no escrito a mano.** La verdad del catálogo
  vive en `datos.ts` y es TypeScript; el sitio es JavaScript y no puede
  importarlo. En vez de mantener dos catálogos —que es como se desincronizan—,
  `pruebas/fijos/preparar-hub-sitio.py` lee el de la aplicación, escribe el JSON
  y copia las imágenes que hagan falta.

  **Solo pasan los productos con fotografía**: 15 de los 35, y las 10 marcas que
  tienen alguno. El dibujo SVG de las fichas vive en `arte.ts`, que tampoco
  viaja al sitio, y un escaparate público con la mitad de las fichas en dibujo
  de relleno se ve a medio hacer.

### Corregido

- **El hub del sitio no reaccionaba a los filtros.** El precio se formateaba con
  `toLocaleString`, que lo pinta el servidor y lo vuelve a pintar el navegador
  sin que los dos tengan por qué traer los mismos datos de idioma: Node escribía
  «1,690» donde el navegador escribía «1.690». React lo veía como una página
  distinta, tiraba la hidratación entera —error #423— y la sección se quedaba
  sin oyentes. **Fallaba en silencio**: la página se veía perfecta y los botones
  no hacían nada. Ahora los miles se agrupan con una expresión regular y
  servidor y navegador escriben siempre lo mismo.

## [0.2.70] — 2026-08-16

### Añadido

- **Cinco fichas más con fotografía**, exprimiendo lo que quedaba en el material
  que ya había: la barra cromada con sus discos (de la sesión de estudio del
  rack) para *Barra olímpica Steel Core*, el multipower y la torre de poleas de
  la sala moderna para *Multipower Evolution* y *Torre de poleas Revolution*, el
  rack del garaje oscuro —que se quedó libre al cambiar el banner de ForMakers—
  para *Rack Optimus O-700*, y las prensas de la nave para *Prensa de piernas
  45° Titan*.

  **La regla que decidió qué entraba:** la zona de origen tiene que medir al
  menos unos 450 px de ancho, porque por debajo de eso ampliar hasta los 640 del
  hueco se nota y una ficha borrosa es peor que el dibujo al que sustituye. Esa
  regla dejó fuera la kettlebell de la pared, el rack del garaje claro y las
  bandas colgadas: los objetos están en las fotografías, pero ocupan 240 o 330
  píxeles y no aguantan el recorte.

### Sabido

- **Quince de las treinta y cinco fichas tienen fotografía; veinte siguen con
  dibujo.** No es por dejarlo a medias: **el material fotográfico está
  agotado**. Todas las imágenes disponibles ya están haciendo un trabajo —cinco
  son banners de recorrido, dos son secciones y quince son fichas— y seguir
  recortando de ellas solo repetiría la misma sala en varias tarjetas.

  Lo que falta necesita fotografía nueva, y estos son los asuntos:

  | familia | fichas |
  |---|---|
  | racks y jaulas | Power rack PR-9, Jaula PM-Kubus, Jaula Apex A-6 |
  | bancos | Banco regulable 7 posiciones, Banco plano de sala |
  | peso libre | Kettlebell 24 kg, Mancuernas hexagonales, Barra Apex, Discos bumper 100 kg |
  | accesorios | Árbol de discos, Bandas de resistencia, Bandas de sprint, Trineo de empuje, Trineo de velocidad, Plataforma de levantamiento, Plataforma de roble, Anillas de madera, Jotas de precisión |
  | máquinas | Torre de jammer arms TI-2, Prensa RV-45 |

  **No hay generación de imágenes en esta sesión**: el servidor MCP que la traía
  se desconectó. Con él —o con fotografías nuevas— se completan las veinte en
  una tanda.

## [0.2.69] — 2026-08-16

### Añadido

- **TRES FOTOGRAFÍAS NUEVAS, SEIS RECORTES, TRES PRODUCTOS NUEVOS.** De las
  imágenes que mandó el diseñador, tres eran nuevas y de mucha mejor calidad que
  lo que había. Cada una traía **más de un producto dentro**, así que de cada
  una salen varios recortes: usarlas enteras habría dejado cinco tarjetas
  enseñando la misma escena.

  | recorte | de dónde | dónde va |
  |---|---|---|
  | `p-agarres` | los dos agarres de estribo | **producto nuevo**: EquipX «Par de agarres de estribo EX-Grip», $75 |
  | `p-discos-pila` | la pila de discos del fondo de esa misma foto | ficha *Set discos bumper 150 kg*, que estaba con dibujo |
  | `p-brazos` | los brazos de seguridad sobre el rack | **producto nuevo**: ProMax «Brazos de seguridad abatibles PR-Safe», $390 |
  | `p-pasador` | el recuadro de detalle de esa misma foto | ficha *Par de jotas con rodillo UHMW* |
  | `p-estacion` | la estación de polea del garaje | **producto nuevo**: Flexion «Estación de polea con banco FX-Duo», $1.290 |
  | `rec-formakers` | el garaje entero | sustituye al banner de ForMakers |

  Los tres productos nuevos se le dieron a la marca a la que le tocaban por lo
  que vende cada una: los agarres a EquipX —«la pieza que le faltaba a tu
  rack»—, los brazos de seguridad a ProMax, que hace los racks, y la estación a
  Flexion, cuyo lema es «estaciones que caben donde vives».

- **El catálogo pasa de 32 a 35 productos**, y de cinco fichas con fotografía a
  **diez**.

### Cambiado

- **El banner de ForMakers cambia por el mismo garaje mejor iluminado.** Era la
  versión oscura de la misma sala; la nueva se ve, y encima enseña el banco de
  trabajo y el panel de herramientas, que es de lo que habla el recorrido.

### Sabido

- **`public/marketplace/` va por 996 KB.** Sigue siendo menos de lo que ocupa el
  maniquí, pero conviene mirarlo cuando entren las fotografías de las trece
  fichas que aún llevan dibujo.

## [0.2.68] — 2026-08-16

### Cambiado

- **EL DISCO DE VALORACIÓN ES EL DE LA MARCA, REDIBUJADO A VECTOR.** La versión
  de 0.2.67 era una interpretación —dos aros— y no era lo que pedía el
  diseñador. Ahora está el plato entero: aro exterior, cuatro radios en
  diagonal, «BARBEL» arqueado arriba, «STANDARD» arqueado abajo, «45 LBS» a
  ambos lados, buje y agujero central. Blanco el lleno, gris el vacío.

  **Por qué se redibujó en vez de recortarlo.** No hay ningún disco limpio del
  que partir: el del logotipo (`brand/logo-mark.png`) lleva el compás encima y
  le tapa medio plato, y en la máquina no hay `potrace` ni ningún otro trazador.
  Así que se midió el plato del logotipo radio a radio —aro exterior en 0,89 del
  radio, cuerpo hasta 0,81, buje en 0,15, agujero en 0,072— y se volvió a
  levantar en SVG. Es vector de verdad: el mismo dibujo vale a 22 px en una
  ficha y a 500 px en una lámina, sin perder resolución.

  **La máscara es lo que lo hace funcionar sobre cualquier fondo.** El plato es
  una sola pieza de `currentColor` y todo lo demás —aro, radios, buje, agujero y
  letras— son AGUJEROS de verdad, no dibujos del color del fondo. Pintarlos del
  color de la tarjeta habría sido más corto y se habría roto en cuanto el disco
  apareciera sobre otra cosa.

  **Se define una sola vez.** En la rejilla del mercado hay 32 fichas × 5
  discos = 160 discos; repetir el dibujo entero 160 veces traería además los
  mismos identificadores de máscara y de arco, que en un documento tienen que
  ser únicos. Va un `<symbol>` en el hub y cada disco es un `<use>`.

- **Los discos suben de 18 a 22 px.** Con el detalle del plato dentro, por
  debajo de veinte se empastan en una mancha.

### Sabido

- **A 22 px las letras del plato no se leen**, y no pueden: son texto de siete
  unidades sobre un dibujo de cien. Están porque a tamaños grandes el disco es
  correcto y porque de cerca dan la textura que hace que se reconozca la pieza,
  no para leerlas en una ficha.

## [0.2.67] — 2026-08-16

### Cambiado

- **LOS DISCOS DE VALORACIÓN SE DIBUJAN COMO EL DISCO DE LA MARCA.** Eran cinco
  círculos naranjas, planos, llenos o vacíos. Ahora son cinco discos de pesa
  —aro exterior grueso, buje y agujero—, **blancos los llenos y grises los
  vacíos**, con la cuenta escrita al lado: «4/5». A dieciocho píxeles contar
  aros cuesta, y el número lo resuelve de un vistazo.

  Van en SVG y no en mapa de bits por dos razones: a este tamaño una fotografía
  del disco sería un borrón, y el color tiene que poder cambiarlo el CSS. Todo
  el dibujo hereda `currentColor`, así que lleno y vacío son la misma pieza con
  distinto color y no hay dos ficheros que mantener.

  **El dibujo se quedó en dos aros.** Los cuatro radios en diagonal del disco
  real se probaron y a este tamaño lo único que hacían era emborronar el centro:
  cinco discos seguidos parecían una fila de tuercas.

- **La cabecera enseña el logotipo grande y ya no repite el nombre en texto.**
  Antes había un icono redondo de 40 px más un `<h1>` diciendo «EXERSUITE3D» al
  lado; ahora va el logotipo completo a 64 px —44 en el teléfono—, que trae el
  nombre dentro. Se recortó el aire transparente del original a
  `brand/logo-hub.webp`, 12 KB: sin recortar, el 20 % de la altura era margen
  vacío y el logotipo se veía pequeño por mucho que se agrandara la caja.

- **El botón de salida se queda en «← Volver».** Decía «← Volver a EXERSUITE3D»
  con la cola escondida en el teléfono; ahora que el logotipo dice el nombre a
  dos dedos de distancia, repetirlo sobraba, y de paso desaparece la media
  query que lo recortaba.

- **Siete productos bajan a tres discos.** Con todo el catálogo entre cuatro y
  cinco, el aro vacío casi no aparecía y el widget nuevo no se veía trabajar.

## [0.2.66] — 2026-08-16

### Cambiado

- **LAS DIECISÉIS MARCAS DEL DISEÑADOR SUSTITUYEN A LAS SIETE INVENTADAS.**
  ProMax Fitness, Steel Core Gym, Titan Commercial, EquipX Pro, Flexion
  Stations, Iron Works Commercial, Vortex Workout, Matrix Fitness Solutions,
  Commercial Power Squad, Optimus Gym Equip, Velocity Trainers, Apex Fitness
  Gear, Gymnast Commercial, Revolution Fitness, Precision Gym y Evolution
  Fitness Products. Cada una con su emblema real en la burbuja del carril.

  A cada marca se le escribió lo que el hub necesita para que los recorridos
  signifiquen algo: país, tamaño, antigüedad, lema e historia. El reparto no es
  decorativo, lo consumen los filtros:

  - **nueve son PyME** —Flexion, Iron Works, Vortex, Power Squad, Velocity,
    Apex, Gymnast, Precision y Evolution—, que es de lo que se nutre
    HelpYourCommunity;
  - **cuatro llevan cuatro meses o menos** —Precision (1), Apex (2), Velocity
    (3) y Revolution (4)—, que son las de NewComers y las únicas con el aro
    naranja en el carril;
  - **tres son chilenas** —Iron Works, Velocity y Evolution—, que es el país por
    defecto y por tanto la economía local de partida.

- **El catálogo pasa de 18 productos a 32, dos por marca.** Cada par se escribió
  a la medida de su marca: Steel Core vende discos y barras, EquipX vende la
  pieza que le falta a un rack de otro, Gymnast vende anillas y roble, Precision
  vende «tu diseño, fabricado». Diez son estrenos, que es lo que llena
  NewArrivals.

- **Los ocho diseños de OnDemand se reparten ahora entre siete marcas** en vez
  de concentrarse en unas pocas, y las siluetas paramétricas se repuntaron a los
  identificadores nuevos.

- **El foro y las solicitudes hablan de las marcas nuevas.** Los cinco proyectos
  de ForMakers y los dos encargos de OnDemand mencionaban por su nombre a las
  marcas viejas dentro del texto de las respuestas; se reescribieron.

- **La burbuja del carril lleva fondo BLANCO.** Son logotipos de tinta oscura,
  hechos para papel: sobre el negro del hub se perdían justo las letras. Con el
  aro de color alrededor se leen como el avatar de una marca en cualquier otro
  sitio.

- **El velo del banner es más denso.** Tenía que ganarle a un dibujo plano y
  ahora le gana a una fotografía: sobre una sala iluminada el rótulo se perdía,
  y en el teléfono —donde la bajada ocupa tres líneas— el texto subía hasta
  donde el degradado ya no cubría.

- **La etiqueta de la burbuja pasa de 68 a 80 px**, que es lo que mide el nombre
  más largo del juego: «Power Squad» se cortaba en «Power Squ…».

### Añadido

- **Los treinta y dos recortes de la lámina de marcas**, en
  `public/marketplace/marcas/`: **216 KB** en total. De cada logotipo salen dos
  piezas —el emblema solo, cuadrado, para la burbuja de 64 px; y el conjunto
  completo con su nombre, para donde haya anchura—. El emblema va aparte porque
  metiendo el logotipo entero en la burbuja el nombre saldría a dos píxeles de
  alto.

  El corte entre emblema y nombre lo busca el guion solo
  (`pruebas/fijos/preparar-logos.py`): dentro de cada celda mira cuánta tinta hay
  por fila y parte por el valle de la mitad de arriba. No se exige una fila
  limpia —en varios logotipos el nombre roza el emblema y no hay ni un píxel de
  aire—, basta con que tenga muy poca tinta comparada con la fila más cargada.

### Corregido

- **Arrastrar el carril por encima de una fotografía lo dejaba clavado.** Al
  poner los logotipos en las burbujas, tirar del carril arrancaba el arrastre
  NATIVO de imágenes del navegador, que cancela el puntero: el carril pasó de
  moverse 176 px a moverse 22. Ninguna lámina del hub es arrastrable ya.

### Sabido

- **Los monogramas SVG de marca de `arte.ts` quedan sin usar.** Los sustituyen
  los emblemas reales. Se borran cuando se limpien los módulos viejos del
  marketplace, que siguen en disco sin que los llame nadie.

- **El emblema de EquipX Pro lleva su nombre dentro**, y a 64 px no se lee. Es
  cosa del logotipo, no del recorte: el nombre forma parte de la marca. Debajo
  de la burbuja va escrito de todos modos.

## [0.2.65] — 2026-08-16

### Corregido

Catorce defectos del hub nuevo, encontrados por una revisión adversarial de
cuatro lentes —gesto, estado, datos y CSS— sobre el código de 0.2.63/0.2.64 y
confirmados uno a uno contra el build. Ninguno lo cazaba la batería.

**El gesto**

- **Arrastre fantasma: el carrusel se movía con el ratón SUELTO.** El gesto solo
  se cerraba con el `pointerup` que llegara al propio carril. Bastaba pulsar la
  lámina, salir por abajo sin recorrer 6 px en horizontal —el gesto de toda la
  vida para cancelar un clic— y soltar sobre el mercado: ese `pointerup` no
  llegaba nunca, el gesto quedaba abierto para siempre y el siguiente **paseo**
  del cursor arrastraba el carril. Peor aún, la clase `arrastrando` se quedaba
  pegada, con el imán apagado y el `ResizeObserver` mudo —su guarda es esa misma
  clase—, así que el carrusel no volvía a centrarse ni redimensionando.

  Ahora el gesto se cierra desde la VENTANA, no desde el carril, y `pointermove`
  comprueba `e.buttons`: si el botón ya no está pulsado, se cierra solo. Las
  escuchas de ventana se ponen al empezar el gesto y se quitan al terminarlo,
  que de paso deja de acumularlas cada vez que se abre el hub.

- **Pulsar la lámina a media animación entraba en el recorrido EQUIVOCADO.** El
  oyente de `scroll` reescribía `vista` en cada cuadro del deslizamiento suave,
  así que durante ~600 ms después de pulsar una pestaña la lámina de debajo del
  cursor y `vista` eran valores intermedios. Medido: pulsar la pestaña ForMakers
  y hacer clic 150 ms después dejaba **NewArrivals** puesto con la pestaña
  ForMakers marcada; pulsando la lámina de destino no entraba nada hasta
  pasados ~700 ms. Ahora, mientras dura el viaje manda el destino y no lo que se
  vea de camino, con un plazo de 900 ms por si la animación se interrumpe.

- **Un segundo puntero mataba el arrastre a medias.** Un toque con el dedo
  durante un arrastre con ratón limpiaba el seguro anticlic y salía sin quitar
  la clase: el arrastre terminaba filtrando por la marca que quedó debajo. Cada
  evento se compara ahora contra el `pointerId` del gesto en curso.

- **En un carril que NO desborda, el clic moría en silencio.** Las siete
  burbujas de marca caben de sobra en un escritorio de 1280 px, así que tirar de
  ellas no mueve nada — pero el seguro anticlic se armaba igual y se comía el
  clic. Ocho píxeles de temblor y la marca no se seleccionaba. Ahora el gesto ni
  siquiera empieza si no hay nada que desplazar.

- **El seguro anticlic caduca.** Se armaba al soltar y solo se desarmaba con el
  siguiente puntero; si el arrastre acababa fuera de la página no había clic que
  lo consumiera y se comía el siguiente, que puede venir del teclado. Ahora vale
  400 ms.

**Los datos**

- **El trineo se pintaba con un color que su ficha no dejaba tocar.** `piso()`
  usa `detalle` en cuatro elementos y `PERSONALIZABLES.trineo` solo declaraba
  `estructura`, de modo que la plataforma de carga arrastraba el color que
  hubiera quedado del diseño anterior. El trineo declara ahora `detalle`, y la
  vista previa ya no puede pintar una parte que la ficha no abra: si no está
  declarada, va del color de la estructura.

- **Filtrar el foro borraba los apoyos dados y las respuestas abiertas.** Cada
  filtrado rehacía las cinco fichas desde cero y con ellas el estado que vive
  dentro. Ahora se construyen una vez y el filtro solo las esconde, igual que
  hace el mercado con sus tarjetas.

- **El grabado BORRABA `<`, `>` y `&` en vez de escaparlos**, así que el lienzo
  enseñaba algo distinto de lo escrito. «Barras & Cía» es un rótulo normal. De
  paso, el recorte a 14 caracteres se hacía antes del borrado y un texto con `&`
  pintaba trece.

- **El mensaje que el usuario escribe a la marca pasaba por el diccionario de
  traducción** y se reescribía solo: `el()` traduce a sus hijos de tipo cadena, y
  el diccionario tiene entradas de una palabra —«Peso», «Cable», «Ver»—. Lo que
  teclea una persona es contenido, no interfaz, y ahora va como nodo de texto.

**El CSS**

- **La cabecera pegajosa se comía el título de la ventana recién abierta.** El
  hub es el contenedor de scroll y no declaraba `scroll-padding-top`, así que
  cada `scrollIntoView` dejaba el título DEBAJO de la cabecera opaca: de los 38
  px del rótulo «OnDemand» se veían 3. Es justo el gesto que la reforma quiere
  lucir. Ahora 78 px.

- **Los campos de TEXTO del hub salían con la piel del Builder.** El
  `input[type="text"]` del editor tiene especificidad (0,1,1) y le ganaba a
  `.hub-input` (0,1,0) por mucho que estuviera más abajo: fondo azulado, radio
  de 5 px y 31 px de alto contra los 38 de sus hermanos del mismo formulario.
  Solo los de tipo texto, lo que se veía como una mezcla dentro de la misma
  caja. Calificados con `.hub`.

- **Las casillas de «Piezas extra» no marcaban el foco.** El `input:focus {
  outline: none }` del editor las alcanzaba y el hub solo reponía el indicador
  para tres clases que ellas no llevan. Son las que suman recargo: el control
  que decide el precio.

- **«← Volver» se partía en dos líneas por debajo de 380 px** y engordaba la
  cabecera pegajosa de 65 a 75 px en toda la página. A 360 px —el ancho más
  común de un Android, que es el destino del APK— el botón medía 50 px de alto.

- **Por debajo de ~350 px el hub entero ganaba barra horizontal**, se arrastraba
  de lado y el sello HUB salía cortado. Ahora el nombre cede con puntos
  suspensivos y el eje X está cerrado.

### Añadido

- **`prueba-hub` pasa de 42 a 62 comprobaciones.** Las veinte nuevas cubren
  exactamente lo que se escapó: el arrastre fantasma, el clic a media animación,
  el estado del foro al filtrar, el encaje bajo la cabecera, la piel de los
  campos, el foco de las casillas y la cabecera a 360 y 320 px.

## [0.2.64] — 2026-08-16

### Añadido

- **FOTOGRAFÍA DE VERDAD EN EL HUB.** Doce fotografías del diseñador entran al
  marketplace en los huecos que les corresponden. Adónde va cada una y por qué:

  | hueco | fotografía |
  |---|---|
  | banner **NewArrivals** | sala moderna con multipower y torre de poleas |
  | banner **NewComers** | hilera de mancuernas — el género que estrena una marca |
  | banner **HelpYourCommunity** | garaje con la bandera de Chile: cerca, de barrio |
  | banner **OnDemand** | cabina de pintura: alguien pintando una pieza a soplete |
  | banner **ForMakers** | garaje de hormigón con banco, herramientas y dorsales |
  | **JOINEXERSUITE3D** | nave enorme en blanco y negro, filas de máquinas |
  | **«Publica el tuyo»** de ForMakers | garaje luminoso con banco de trabajo |
  | ficha *Torre de polea dual* | placa selectorizada con el pasador amarillo |
  | ficha *Multipower NW-Linear* | dos multipowers alineados |
  | ficha *Barra de jalón multigrip* | agarre de polea colgando |
  | ficha *Tu diseño, fabricado* | soldadura, chispas |
  | ficha *Cadenas de seguridad* | mosquetón de un cable |

  La de OnDemand es la que más manda: el recorrido va de pintar, grabar y
  ampliar un diseño, y la fotografía es exactamente eso ocurriendo.

- **`imagen.ts`, un solo hueco para foto o dibujo.** El que llama pasa la foto
  si la tiene y no se entera del resto: el SVG lleva
  `preserveAspectRatio="slice"` y la fotografía `object-fit: cover`, que hacen
  lo mismo —llenar recortando lo que sobre—, así que el CSS del hueco no tiene
  que distinguirlos. Trece de las dieciocho fichas siguen con su dibujo y se ven
  en la misma rejilla sin saltar.

- **Encuadre por lámina.** La bandera del garaje chileno cuelga en el tercio de
  arriba y el recorte apaisado del banner se la comía. `foco` fija el
  `object-position` de esa lámina en `center 22%`; las demás siguen por el
  centro.

### Cambiado

- **Las fotografías viajan dentro del paquete**, en `public/marketplace/`,
  recortadas al encuadre en que se usan y en WebP: **636 KB las doce**, contra
  los 6,2 MB que suman los originales. Dentro del APK y del ejecutable de
  Windows no hay red garantizada, así que no valía enlazarlas de fuera. Los
  originales del diseñador no se tocan.

- **Las de las fichas van diferidas** (`loading="lazy"`): de dieciocho tarjetas
  caben tres en pantalla. Las cinco de los banners no, porque el carrusel se
  hojea y una lámina en blanco al llegar a ella sería peor que el byte que
  ahorra.

- **Nivelado leve de las fotos de ficha** —`saturate(.88) brightness(.94)`—
  porque vienen de luces distintas y saltaban al lado del dibujo plano. El
  banner no lo lleva: ahí el degradado que oscurece el pie ya hace el trabajo.

### Sabido

- **La fotografía de *Cadenas de seguridad* es un mosquetón, no una cadena.** Es
  la pieza del juego de doce que peor calza con su ficha; se puso porque es
  herraje de seguridad sobre cable y porque el hueco alternativo era el dibujo.
  Cámbiese en cuanto haya una foto de cadenas.

- **Trece fichas de producto y las dos solicitudes de OnDemand siguen con
  dibujo.** Las solicitudes seguirán así aunque lleguen más fotos: son encargos
  de un diseño MODIFICADO, y ninguna fotografía de catálogo los retrata.

- **Las cuatro siluetas del personalizador siguen siendo dibujo**, y tienen que
  serlo: son las que se repintan en vivo.

## [0.2.63] — 2026-08-16

### Añadido

- **MIRAR Y ENTRAR SON DOS GESTOS DISTINTOS.** Las cinco pestañas de recorridos
  pasan a ser un **carrusel**, y el reparto de trabajo cambia:

  - la **pestaña MUEVE** el carrusel y no toca nada más. Hojear los cinco
    recorridos ya no reordena la página bajo el cursor;
  - **pulsar la lámina grande** es lo que **ENTRA** en el recorrido. Volver a
    pulsarla lo deshace, igual que el marbete que aparece junto al contador.

  Cada lámina lleva ahora su llamada a la acción con la cuenta dentro —«Ver los
  7 equipos →»— que es lo que dice que la fotografía se pulsa. La pestaña del
  recorrido puesto queda marcada con un punto, que puede no ser la que se está
  mirando.

  Consecuencia: el hub **abre con el mercado entero**, 18 de 18. Antes abría con
  NewArrivals ya aplicado y 7 productos, sin que nadie lo hubiera pedido.

- **Los dos carruseles se arrastran con el cursor.** El dedo ya lo hacía —una
  caja con `overflow-x: auto` trae el gesto nativo, con su inercia y su rebote,
  y reimplementarlo sale peor—, pero el ratón no hacía nada sobre una barra que
  además está escondida. El módulo nuevo (`carrusel.ts`) solo se mete cuando
  `pointerType` es `mouse`. Dos cuidados que no se ven:

  - **un arrastre no es un clic**: al soltar, el navegador dispara `click` en lo
    que quede debajo, así que arrastrar el carril de marcas habría filtrado por
    la marca sobre la que se soltó. Se traga en fase de captura;
  - **el imán pelea con el arrastre**: con `scroll-snap-type: x mandatory` el
    navegador corrige cada asignación de `scrollLeft` y el carril se queda
    pegado a la lámina de partida. Se apaga mientras dura el gesto.

- **ONDEMAND ES UNA VENTANA, NO UN FILTRO.** Son diseños que su marca abre a
  modificación, y ahora se pueden modificar de verdad:

  - **ocho diseños abiertos** de los dieciocho del mercado (`PERSONALIZABLES` en
    `datos.ts`, indexada por `id` de producto para poder abrir o cerrar un
    diseño sin tocar su ficha);
  - **pintura por partes** —estructura, tapizado, detalles, según lo que lleve
    cada equipo— sobre nueve colores de fábrica;
  - **grabado o serigrafía** de hasta 14 caracteres;
  - **piezas extra** con su recargo, y el total recalculándose;
  - **«Prototipar en 3D»**, que lleva al Builder: la silueta de aquí sirve para
    decidir rápido entre dos colores, la estética se decide sobre el modelo;
  - debajo, **tus solicitudes** —los antiguos «encargos»— con sus cuatro estados
    y el hilo abierto con la marca.

  **La vista previa se pinta de verdad.** Las ilustraciones de `arte.ts` llevan
  la paleta cocida dentro de la cadena —se generan una vez al cargar el módulo—
  y no hay forma de recolorearlas sin rehacerlas. Así que `ondemand.ts` dibuja
  cuatro siluetas paramétricas propias —bastidor, banco, torre y suelo— que
  reciben los colores y el texto como argumentos, y reparte los ocho diseños
  entre ellas.

- **FORMAKERS ES EL TABLÓN TIPO KICKSTARTER.** Diseñadores independientes
  enseñan lo que están haciendo y buscan con qué sacarlo adelante: respaldo de
  la comunidad, o una marca que se sume a fabricarlo. Cinco proyectos, filtro
  por lo que se busca (diseño original · patrocinio · equipo de trabajo), barra
  de financiación con las reservas conseguidas sobre el objetivo y las marcas
  interesadas en los dos que la piden, apoyos en vivo, respuestas plegables y un
  compositor para publicar el propio.

- **`pruebas/prueba-hub.mjs`**, 42 comprobaciones sobre los dos gestos, el
  arrastre, el intercambio de ventana, el personalizador y el foro. La batería
  pasa de 63 a 64.

### Cambiado

- **La ventana de abajo se cambia entera, no se filtra.** Tres de los cinco
  recorridos son cortes del mismo catálogo y se quedan en el mercado
  filtrándolo; OnDemand y ForMakers no son tienda, así que sustituyen al mercado
  en lugar de recortarlo. El tipo `Destino` lo hace explícito.

- **El foro maker y los encargos vuelven al hub.** En 0.2.62 quedaron fuera
  porque la maqueta no les daba sitio; ahora tienen el suyo. `makers.ts` y
  `deseo.ts` quedan superados por `formakers.ts` y `ondemand.ts`.

- **Pulsar una marca del carril quita antes el panel puesto.** Una marca son sus
  productos, y el filtro habría caído sobre un mercado escondido.

### Corregido

- **El carril se comía el primer clic después de cada arrastre.** El seguro que
  distingue arrastrar de pulsar se armaba al soltar y solo se desarmaba en el
  siguiente `pointerdown`. Parecía lo seguro y no lo era: un clic de teclado
  sobre la llamada a la acción no trae puntero ninguno, así que se habría comido
  el primer Intro después de cada arrastre, y un toque con el dedo detrás de un
  arrastre con el ratón tampoco reponía el estado. Ahora se traga **un** clic y
  se desarma acto seguido, y cualquier puntero limpia el estado al bajar.
  Lo cazó `prueba-hub`.

### Sabido

- **Las láminas siguen siendo dibujos vectoriales de relleno**, tanto en los
  banners como en las fichas de producto. Las cuatro siluetas del personalizador
  son esquemáticas a propósito: lo que tiene que quedar claro es qué se está
  pintando, no cómo va a quedar el acabado real.

- **`makers.ts`, `deseo.ts`, `index.ts`, `descubrir.ts`, `vitrina.ts` y
  `unirse.ts` siguen en disco sin que los llame nadie.** El bundle los descarta.
  Se borran cuando el hub nuevo esté cerrado.

- **El carril de marcas solo desborda en pantallas estrechas.** En 1280 px las
  siete burbujas caben y arrastrarlo no mueve nada, que es lo correcto.

- **Estado de la batería: 64 pruebas, las mismas nueve rojas de siempre.**
  `garaje`, `garaje2`, `prototipo`, `prototipo2`, `fable-v214`, `uppermachine`,
  `freno`, `v251` y `sitio` —esta última necesita el Next.js en el 3100—. Este
  trabajo no rompió ninguna.

  La tanda completa marcó **veintidós** en rojo, y trece de ellas pasaron al
  repetirlas en serie. La causa no fue contención: **el `vite preview` del 4174
  se murió a media tanda** y las que estaban corriendo en ese momento
  —`catalogo`, `marketplace`, `paleta`, `humo-v214`, `menus-v257`,
  `posar-maquina`, `pilar-vertical`, `press-maquina` y la propia `hub`— cayeron
  con `ERR_CONNECTION_REFUSED`. Antes de dar por rojo nada de una tanda
  completa, conviene mirar si la salida dice eso.

## [0.2.62] — 2026-08-16

### Cambiado

- **EL HUB DEL MARKETPLACE, REHECHO SOBRE LA MAQUETA CONCEPTUAL.** Las siete
  ventanas con barra lateral —recién llegadas, estrenos, economía local, vitrina
  digital, foro maker, encargos e incorporación— desaparecen como ventanas. En
  su lugar hay **una sola página** que ocupa la pantalla entera y se recorre de
  arriba abajo, con esta estructura:

  | franja | qué lleva |
  |---|---|
  | cabecera | logo + EXERSUITE3D, salida a la aplicación, sello `HUB` |
  | historias | las 7 marcas en burbuja con anillo, permanentes |
  | recorridos | 5 pestañas + el banner ilustrado del recorrido activo |
  | mercado | buscador, 3 desplegables, contador y la rejilla de 18 productos |
  | JOINEXERSUITE3D | el texto y la lámina a un lado, el formulario al otro |
  | pie | la advertencia de maqueta |

  Los cinco recorridos son **NewArrivals** (7 productos), **NewComers** (6, de
  las marcas recién llegadas), **HelpYourCommunity** (12, de las PyME),
  **OnDemand** (1, los que no llevan precio) y **ForMakers** (los 18). La
  pestaña filtra la rejilla además de cambiar el banner.

  El foro maker y los encargos quedan **fuera** de esta versión: la maqueta no
  les da sitio y aún hay que decidir dónde van.

- **La salida vive en la cabecera, no flotando.** Como el hub tapa la ventana
  entera necesita una salida propia; estaba fija abajo a la izquierda y se
  superponía a las tarjetas del mercado. Ahora va en la cabecera, que es
  pegajosa y por tanto siempre está a la vista sin taparle nada al contenido. En
  pantallas de 640 px o menos se recorta a «← Volver».

- **DM Sans empaquetada, no traída de un CDN.** La tipografía entra por
  `@fontsource/dm-sans` (400/500/700/900) y viaja dentro del bundle. Un
  `@import` a Google Fonts no serviría: dentro del APK y del ejecutable de
  Windows no hay red garantizada.

### Corregido

- **El hub se abría detrás de la Home.** La capa quedó en `z-index: 40` y la
  Landing está en 50, así que el hub se montaba en el DOM —los nodos estaban
  todos ahí— pero no se veía nada. Ahora en 55.

- **`playwright-core` volvió al repositorio, declarado.** La batería lo importa
  en las 63 pruebas, pero nunca estuvo en `package.json`: vivía suelto en
  `node_modules`, y la primera instalación de una dependencia se lo llevó por
  delante al reconciliar contra el lockfile. Queda en `devDependencies`, que es
  donde debía estar desde que la batería entró al repositorio en 0.2.61.

### Sabido

- **Las láminas de los productos, los banners y la ilustración del formulario
  son dibujos vectoriales de relleno.** Están para que se vea la composición;
  las fotografías reales entran más adelante.

- **OnDemand tiene un solo producto y ForMakers no filtra.** Los otros tres
  recorridos salen de una propiedad real del catálogo; estos dos todavía no
  tienen definido qué los distingue.

- **Las siete ventanas viejas siguen en disco y ya no las llama nadie.**
  `index.ts`, `descubrir.ts`, `vitrina.ts`, `makers.ts`, `deseo.ts` y
  `unirse.ts` quedan huérfanos —el bundle los descarta— y se conservan a
  propósito: guardan el contenido del foro y de los encargos, que hay que
  recolocar antes de borrarlos. `chipsSeleccion()` y `encabezado()` siguen sin
  usarse, igual que antes.

## [0.2.61] — 2026-08-16

### Añadido

- **EL MANIQUÍ GIRA DONDE GIRA UN CUERPO.** El rig ya no articula sobre los
  pivotes que heredó de sus primitivas de cilindros y cajas: los coloca en los
  centros articulares del cuerpo que está montando.

  Era la causa de fondo anotada en 0.2.60. El pivote del tobillo estaba a 10,2
  cm del eje y el tobillo del cuerpo cae en otro sitio, así que el pie no giraba
  sobre el tobillo: **orbitaba** a varios centímetros de él. Con eso mal, todo lo
  que ERGONOMÍA mide encima del maniquí —dónde pisa, cuánto se hunde en un
  asiento, a qué altura le queda un agarre— estaba midiendo sobre un esqueleto
  que no era el de la figura que se ve.

  Cuánto se movió cada pivote, en el maniquí de 175 cm:

  | articulación | rig antes | cuerpo ahora | se mueve |
  |---|---|---|---|
  | columna  | (0, 93,3, 0)      | (0, 100,0, +1,4)      | 6,8 cm |
  | cuello   | (0, 144,2, 0)     | (0, 146,4, −0,7)      | 2,3 cm |
  | hombro   | (∓25,5, 139,1, 0) | (∓16,2, 136,0, −2,3)  | 10,1 cm |
  | codo     | (∓25,5, 112,0, 0) | (∓25,9, 114,1, −2,3)  | 3,2 cm |
  | muñeca   | (∓25,5, 86,5, 0)  | (∓28,7, 84,7, −2,3)   | 4,4 cm |
  | cadera   | (∓10,2, 84,8, 0)  | (∓8,5, 90,5, +0,2)    | 5,9 cm |
  | rodilla  | (∓10,2, 45,8, 0)  | (∓13,4, 51,8, +0,2)   | 6,8 cm |
  | tobillo  | (∓10,2, 6,8, 0)   | (∓13,3, 11,5, +0,2)   | 5,7 cm |

  Con ello cambian los largos de hueso, que ahora son los del cuerpo y no los de
  la torre de primitivas: muslo 39,0 (era 40,2), pierna 40,3 (40,2), brazo 23,9
  (28,0), antebrazo 29,5 (26,2), tronco 46,4 (52,5).

  **De dónde salen los números.** El modelo nuevo trae el maniquí montado además
  de desmontado, y de la copia montada se leen las juntas directamente. Las
  piezas vecinas solapan a propósito —el modelador engordó los puntos de
  contacto para que la articulación no se abra al doblarla—, así que la junta es
  el centro del **volumen que comparten**. Cruzar sus cajas no vale: la caja del
  torso se traga el brazo entero y deja el hombro 11 cm por debajo de donde
  está.

  El manifiesto del maniquí de serie declara ahora ese esqueleto en una clave
  `juntas`. El rig lo usa solo si viene entero y si además hay modelo para los
  dieciséis segmentos; con la mitad de los pivotes movidos y la otra mitad
  donde los dejó la primitiva, la figura sale peor que sin tocar nada.

### Cambiado

- **EL MANIQUÍ SE PONE A PLOMO.** El cuerpo está esculpido en **pose A** —el
  brazo abre 30,6°, el codo 22,1°, la cadera 16,0° y la rodilla 4,6°— y las
  posturas de la aplicación dan sus ángulos contando desde un hueso que cuelga a
  plomo. Dejándolo tal cual, «De pie» salía despatarrado y «Sentado» con las
  rodillas hacia fuera.

  Cada segmento gira **sobre su propia junta** hasta enderezar la cadena. Es un
  giro rígido: no deforma nada, y como el centro de giro es la junta, el solape
  que cura la articulación sigue exactamente donde estaba. Al pie y a la mano se
  les devuelve su orientación girándolos de vuelta sobre tobillo y muñeca —que
  es justo para lo que existen esas dos articulaciones—, y así la planta queda
  plana contra el suelo.

  El giro se parte en dos, y no por gusto:

  - **Sagital** (lo que el hueso cuelga hacia delante): se quita **entero**. Es
    el que descuadra las bisagras — el codo llegaba 22° flexionado, así que su
    cero no era su cero y su tope de hiperextensión (+15°) era inalcanzable.
    Quitarlo mueve la mano hacia atrás, donde no hay nada con que chocar.
  - **Frontal** (la abducción, lo que el miembro abre de lado): se quita **lo
    que el cuerpo aguanta**. A plomo del todo, la mano se mete **11,2 cm dentro
    del muslo** y un muslo 5,9 dentro del otro; el cuerpo está esculpido abierto
    precisamente para que la mano libre la pierna. Se busca por bisección el
    mayor giro que no añade más de 1 cm de carne compartida sobre la que el
    modelo ya trae, y quedan **cadera 7,4°** (de 16,0) y **hombro 23,9°** (de
    30,6).

  Medido después: las juntas siguen solapando de 1,8 a 11,5 cm, y donde no debe
  haber contacto no lo hay salvo el roce natural de la mano contra el muslo
  (0,9 cm) y de los muslos entre sí en la entrepierna (4,6, viniendo de 3,7 en
  el esculpido).

- **El abdomen pasa al torso.** El modelo trae 17 piezas y el rig tiene 16
  huecos; la de más es un vientre entre la pelvis y el pecho. En 0.2.60 iba con
  la pelvis; ahora va con el **torso**, y la columna dobla a **100 cm** del
  suelo en vez de a 109. A 109 la bisagra es torácica; a 100 cae justo encima de
  la pelvis, que es donde empieza la flexión del tronco, y además el vientre
  acompaña al pecho al inclinarse, como en un cuerpo.

- **El maniquí de serie pasa al modelo nuevo**, con las superficies rehechas y
  la cabeza reducida a la proporción del cuerpo. **47.024 triángulos y 0,86 MB**
  (venía de 53.052 y 0,97). La cabeza sigue siendo la pieza cara —54.736 de los
  95.760 triángulos del conjunto—; aligerada a 6.000, el error sobre su
  superficie es de **0,30 mm en el percentil 99**.

### Sabido

- **La junta se estima donde las dos piezas comparten carne, y eso arrastra
  cuando el collarín no reparte a los dos lados.** Donde el solape monta a
  caballo de la articulación el número sale bueno: la rodilla cae a 51,8 cm y en
  un cuerpo de 175 está sobre los 50. Donde el collarín sube solo por un lado,
  tira: el **tobillo** sale a 11,5 cm cuando el maléolo anda por los 7, y el
  **hombro** a 136 cm y ±16,2 cuando la cabeza del húmero está más cerca de 142
  y ±19 —el collarín del brazo se hunde 11 cm dentro del torso y se lleva el
  centro hacia dentro y hacia abajo—. Se nota poco: la flexión plantar levanta
  el talón algo más de la cuenta y el brazo cuelga un poco más pegado al cuerpo.

- **La pose de reposo conserva 23,9° de abducción de hombro y 7,4° de cadera**,
  que es lo que el cuerpo esculpido permite sin que la mano entre en el muslo.
  Los ángulos de las posturas cuentan desde ahí, no desde un miembro a plomo
  perfecto.

- **`prueba-apoyos` mide con una caja lo que la aplicación dejó de contar.** Su
  única aserción roja da 0,76 cm de cuerpo bajo el suelo llevando el gesto
  inferior al final de su recorrido. Medido pieza a pieza: la **piel** del pie
  está exactamente en 0,00 —`noHundirse` la deja clavada en el suelo— y lo que
  baja a −0,76 es el **collarín** del pie, que vive dentro de la pierna y que
  desde 0.2.60 no cuenta como planta a propósito. El ayudante `__bajoSuelo` de
  la prueba sigue usando la caja del segmento; su hermano `__pie`, en el mismo
  fichero, ya usa la piel propia.

- **La raíz de la figura pasa a estar en el SUELO**, entre los pies, en vez de a
  la altura de la cadera: con esqueleto propio los pivotes se miden desde ahí.
  Los proyectos guardados no se ven afectados —al cargarlos, `reapoyarFigura`
  vuelve a posar la figura por su apoyo guardado, no por la `y` cruda—, pero
  cualquier código que leyera `humanFigure.position.y` como si significara algo
  necesitaba revisión.

- **Cuatro pruebas medían con reglas del rig viejo, y se han reescrito para
  medir la PROPIEDAD en vez del número.** Así no hay que recalibrarlas con el
  próximo cuerpo:

  - *¿Está sentada?* Antes: `humanFigure.position.y > 10`, que no distinguía
    nada —con la raíz a la altura de la cadera esa `y` pasaba de 10 tanto
    sentada como de pie— y que al bajar la raíz al suelo pasó a fallar sin que
    nada se hubiera roto. Ahora: los glúteos posados en la cara del asiento.
    Medido, 42,54 contra 42,54 cm.
  - *¿Toma la postura sentada?* Antes: rodilla > 60°, calibrado sobre la pierna
    del rig de cilindros. El ángulo de un cuerpo sentado lo fija el ASIENTO: la
    postura pide 95° y `noHundirse` estira hasta que la planta llega al suelo,
    así que depende de lo alto que sea el asiento y de lo larga que sea la
    pierna. Ahora se comprueba que está **tan doblada como el asiento permite**:
    doblarla 6° más tiene que meter la planta bajo el suelo. Medido: 59°, planta
    a 0,48 cm, y a 65° se hunde a −1,01. Sigue cazando el fallo de 0.2.60, que
    dejaba 50–53° teniendo 59 disponibles.
  - *¿Queda algo bajo el suelo?* Antes: la caja del segmento, que incluye el
    collarín que la aplicación dejó de contar en 0.2.60 a propósito. Ahora: la
    piel propia. Medido, lo más bajo del cuerpo a 0,48 cm.
  - *¿La tracción devuelve el puño?* Antes: 20 cm de recorrido, que depende de
    lo largo que sea el brazo (el húmero del cuerpo mide 24,2 cm contra los 28,0
    del rig). Ahora: que lo devuelva **al menos a donde estaba antes de
    empujar**. Medido: 32,3 → 47,6 → 30,8 cm.

- **Estado de la batería: 63 pruebas.** Corrida entera y con cada rojo repetido
  en serie para separar contención de fallo real:

  - **Nueve rojas de verdad**, todas de antes de este trabajo: `garaje`,
    `garaje2`, `prototipo`, `prototipo2`, `fable-v214`, `uppermachine`, `freno`
    y `v251`, más `sitio`, que necesita el Next.js en el 3100.
  - **Cinco solo en paralelo**: `atraviesa`, `cable-oculto`, `800-debug`,
    `800-debug3` y `uppermachine-lib` pasan las cinco al correrlas en serie.
  - **Las nueve del maniquí, en verde.**

- En una postura muy forzada el collarín rígido gira y atraviesa la piel de la
  pieza vecina, y la junta se ve arrugada. Es inherente a articular segmentos
  rígidos sin deformar la malla; sin collarín, en ese mismo sitio habría un
  agujero, que es peor.

## [0.2.60] — 2026-08-15

### Añadido

- **EL MANIQUÍ YA ES UN CUERPO, DE SERIE.** La figura humana sale de fábrica
  con un cuerpo real —escaneado, troceado a mano en los 16 segmentos y con las
  juntas trabajadas— en vez de con la torre de cápsulas, cajas y esferas de
  antes. No hay que cargar nada: viene puesto.

  Va en su **azul de referencia**, sin textura. La forma es lo que importa para
  juzgar el encaje entre el cuerpo y la máquina; una piel fotográfica añade
  megabytes y ruido visual sin decir nada de ergonomía.

  **Las articulaciones aguantan al doblarse.** Cada pieza lleva un collarín que
  se mete dentro de su vecina: medido, las juntas solapan entre **1,6 y 34 cm**,
  y las superficies se tocan (0,03 a 0,31 cm). Un segmento rígido que gira abre un hueco en su articulación
  salvo que la carne de las dos piezas se monte una sobre otra, y eso es lo que
  hacen esos collarines. Comprobado en sentadilla profunda con los brazos
  flexionados: no se abre ninguna junta.

  **Pesa 0,97 MB** en 16 archivos, 53.052 triángulos. El modelo llega ya
  optimizado y con las piezas cerradas —las 17 son volúmenes estancos—, así que
  solo se ha tocado la cabeza: traía 54.736 de los 95.788 triángulos del
  conjunto, el 57 % del presupuesto en el 7 % de la superficie. Aligerada a
  12.000, el error sobre su superficie es de **0,17 mm en el percentil 99**.

  El modelo trae **17 piezas** y el rig tiene 16 huecos: la de más es un
  abdomen entre la pelvis y el torso. Va fundido con la **pelvis**, que es la
  raíz, porque el rig dobla en la columna —que cae justo ahí— y así el pecho
  bascula por encima de un vientre quieto, como en un cuerpo. Pasarlo al torso
  es cambiar una línea.

  Cargarlo al arrancar cuesta **254 ms**, en paralelo con el repertorio de
  componentes y los prefabs. Las 16 descargas van a la vez; en serie eran 16
  idas y vueltas encadenadas con el usuario esperando (396 ms).

  El OBJ viene en **cuadriláteros**, no en triángulos. Leyendo solo tres de los
  cuatro índices se pierde medio polígono en cada cara y la figura sale moteada,
  se ve a través de ella; hay que partir cada quad en dos.

### Cambiado

- **La Biblioteca distingue el segmento de serie del tuyo.** Ahora que el
  maniquí viene con cuerpo, la ficha de cada segmento dice si el modelo activo
  es **de archivo** o **personalizado**, y restablecer devuelve el de serie en
  vez de la primitiva. Antes el maniquí daba por hecho que cualquier modelo era
  del usuario, así que siempre ponía «Modelo personalizado».

### Corregido

- **LAS JUNTAS DEL MANIQUÍ DEJAN DE SALIR MOTEADAS.** Rodillas, codos, hombros
  y cuello aparecían salpicados de píxeles blancos sucios.

  No era un hueco ni un fallo del modelo: era **z-fighting**. Un maniquí
  troceado de un cuerpo real solapa en las juntas —la carne de dos piezas ocupa
  el mismo sitio para que la articulación no se abra al doblarla—, así que ahí
  las dos superficies son coincidentes y con la misma profundidad el z-buffer
  decide píxel a píxel cuál gana.

  Ahora cada segmento lleva su propio **sesgo de profundidad**, así que en cada
  banda de solape gana siempre el mismo y el moteado desaparece. Es un
  desempate, no un desplazamiento: **no se mueve un solo vértice**, de modo que
  las medidas del maniquí —de las que vive toda la ventana de ERGONOMÍA— siguen
  siendo exactamente las mismas, y el modelo queda tal como se esculpió.

  Antes se probó a curarlo moviendo geometría: hundir el collarín por su
  normal. Sale peor. Desvanecido por distancia al filo deja un escalón en la
  piel visible; desvanecido por profundidad no arregla nada donde las
  superficies son exactamente coincidentes, porque ahí el signo de la distancia
  es una moneda al aire y se hundía la mitad de los vértices sí y la otra
  mitad no.

### Corregido (continuación)

- **LA PLANTA DEL PIE VUELVE A SER LA PLANTA.** Con el maniquí de serie, pisar
  una plataforma dejaba la suela **9,8 cm por debajo** de su cara.

  La aplicación medía «dónde pisa el pie» como el fondo de la CAJA de la pieza
  del pie. Con la primitiva —una losa de 7 cm— eso era la suela. La pieza de un
  cuerpo troceado lleva un collarín que sube 8,5 cm por la pierna para que el
  tobillo no se abra al doblarlo, y **al girar el pie ese collarín queda más
  bajo que la suela**: la IK corregía contra el filo del collarín, que no pisa
  nada.

  Ahora se distingue la **piel propia** del collarín. La geometría de cada
  segmento vive en el marco de su articulación, así que lo propio es lo que
  queda por debajo de ella y el collarín lo de arriba; la planta es el punto más
  bajo de lo propio, ya en el mundo. Sirve igual con la pieza girada, que es
  donde fallaba. Medido: la suela se posa a **0,33 cm** de la cara de la
  plataforma, y sentada queda a 0,92 cm del suelo.

  Lo mismo se aplica a `cuantoSeHunde`: el collarín de un segmento vive dentro
  de su vecino, así que si asoma bajo el suelo es porque el vecino ya está
  hundido — contarlo hacía ver hundimientos donde no los había.

  Se probó a quedarse con una muestra de 256 puntos por segmento para ahorrar
  trabajo: no vale. `noHundirse` corrige hasta bajar de 0,05 cm y una muestra no
  tiene esa puntería; el mínimo bailaba al girar la pierna y el bucle estiraba
  la rodilla hasta el tope.

### Sabido

- **EL RIG NO MUEVE SUS PIVOTES AL METER UN CUERPO.** Es la causa de fondo de
  lo que queda por arreglar, y está medida.

  `colocarCuerpoEntero` mete el cuerpo con una sola transformación y deja los
  pivotes donde los puso la geometría de las primitivas. El cuerpo escaneado
  está de pie con las piernas abiertas, así que **su tobillo cae en x = ±26,3
  cm y el pivote del rig sigue en ±10,2**: un brazo de palanca de 16 cm. El pie
  no gira sobre su tobillo, ORBITA. Lo mismo en la rodilla (cuerpo ±21,2 contra
  rig ±10,2) y, en vertical, en la columna (cuerpo 105,3 contra rig 93,3).

  De ahí salen los síntomas que quedan. Sentarse: el fondo de la pelvis está
  4,1 cm bajo la cadera en este cuerpo y 8,5 en la primitiva, así que la figura
  se sienta 4,4 cm más abajo, la pierna ya no llega al suelo desde el banco y
  `noHundirse` estira la rodilla de 95° a 50° para sacarla.

  Arreglarlo bien es reubicar los pivotes en los centros articulares del cuerpo
  —ya están medidos, junta a junta— pero eso cambia los largos de hueso y con
  ellos todo lo calibrado sobre el rig, así que no es un parche.

- **Quedan cinco pruebas en rojo**, y por eso **esta versión no se debe
  etiquetar todavía**: `colocar` y `maniqui-fisico` (rodilla a 50° al
  sentarse), `apoyos` por una sola aserción y por poco (0,65 cm de cuerpo bajo
  el suelo en el peor caso de un barrido de posturas, viniendo de 9,8), y
  `maniqui-usa`, `v251` y `solape-ui`, sin revisar desde las correcciones.

- En una postura muy forzada —rodilla a 109°, codo a 69°— el collarín rígido
  gira y atraviesa la piel de la pieza vecina, y la junta se ve arrugada. Es
  inherente a articular segmentos rígidos sin deformar la malla; sin collarín,
  en ese mismo sitio habría un agujero, que es peor.

## [0.2.59] — 2026-08-14

### Corregido

- **UN CUERPO TROCEADO ENTRA DE UNA PIEZA, NO SEGMENTO A SEGMENTO.** Al
  sustituir los 16 segmentos del maniquí por las partes de un cuerpo real
  troceado a mano, la figura salía **deformada y con las costuras abiertas**.

  Cada modelo se encajaba en su hueco por separado, estirando su caja hasta
  llenar la de la primitiva. Y las primitivas del rig no tienen proporciones de
  cuerpo: la del pie es una losa de 6,8 cm y un pie de verdad, con su tobillo,
  mide 13,7. Medido sobre un cuerpo escaneado y troceado a mano, **el pie se
  deformaba un 51 %**, el antebrazo un 35 %, el brazo un 28 % y la pelvis un
  26 %. Al deformarse cada pieza distinto, las dos caras de un mismo corte
  dejaban de coincidir y ahí se abrían las costuras.

  Ahora, cuando los segmentos vienen **troceados de un mismo cuerpo**, se
  montan todos con **una sola transformación**, respetando la posición que
  traen unos respecto a otros. El cuerpo entra tal cual se esculpió, sin
  deformar, y sigue siendo continuo porque los cortes ya casaban entre sí.

  Se distingue por la geometría, sin preguntar nada: si son trozos de un
  cuerpo, sus cajas están repartidas por el espacio y la de todos juntos es
  mucho más alta que la de cualquiera suelto; si es cada uno un modelo
  independiente, vienen centrados en su origen y la unión no crece. Por debajo
  del umbral se sigue encajando pieza a pieza, como hasta ahora.

  Para que eso funcione, los segmentos del maniquí **ya no se centran** al
  hornearlos. Una pieza de máquina es un objeto suelto y centrarla es lo
  correcto; dieciséis trozos de un mismo cuerpo llevan en sus coordenadas dónde
  va cada uno, y centrarlos uno a uno borra esa información.

  Comprobado con la figura escaneada real: se arma, mide 175,0 cm para una
  talla de 175, los pies apoyan en y=0,00, los 16 segmentos llevan su textura
  y al doblar la rodilla derecha el tobillo se mueve 44 cm.

## [0.2.58] — 2026-08-14

### Añadido

- **EL MANIQUÍ SE PONE LA PIEL DEL MODELO.** Cuando un segmento se sustituye
  por un modelo que trae textura —un escaneo la trae: cara, ropa, calzado—,
  ahora el maniquí la lleva puesta. Antes se quedaba con el azul de referencia
  y la fotografía se perdía por el camino: se cargaba la forma del cuerpo y se
  tiraba la mitad del modelo.

  El horneado funde todas las mallas en una geometría y descarta los
  materiales, que es lo correcto para una pieza de máquina —se pinta del color
  del proyecto— pero no para un cuerpo. Ahora, además de la geometría, se
  guarda el primer material **con mapa** que traiga el archivo; un escaneo trae
  uno solo para todo el cuerpo. Si el modelo no tiene textura, el segmento se
  queda con su azul, como siempre.

  La piel va **clonada** por figura: al quitar una, `disposeHumanFigure` libera
  sus materiales, y compartir el original dejaría a las demás sin textura.

### Corregido

- **UN MODELO DE SEGMENTO YA NO ENTRA DESARMADO EN EL MANIQUÍ.** Sustituir las
  partes del maniquí por modelos propios (*Biblioteca → Maniquí*) producía una
  figura rota: la cabeza flotando sobre el cuello, los brazos despegados del
  tronco y los pies por debajo del suelo.

  La causa estaba en cómo se encajaba cada modelo en su hueco: **escala
  uniforme igualando la dimensión más larga del modelo con la más larga de la
  primitiva**, y luego centrar. Esa regla vale para cambiar una pieza suelta
  por otra más bonita, pero no para armar un cuerpo, porque los segmentos
  anatómicos tienen proporciones muy distintas de las primitivas que ocupan.
  El pie lo enseña bien: la primitiva es una losa de 7 cm y un pie de verdad
  mide 27 cm de alto contando el tobillo, así que se metía encogido a la
  cuarta parte y descolgado de su sitio. El cuello igual: cilindro flaco
  contra un cuello escaneado que trae los trapecios.

  Ahora el modelo **llena el hueco eje a eje**. Cada segmento ocupa exactamente
  el sitio que el rig le reserva: las juntas casan y el maniquí conserva las
  medidas de las que depende toda la ventana de ERGONOMÍA. Lo que se paga es
  que el modelo se deforma para caber, que es justo lo que se busca aquí — el
  maniquí mantiene su talla y toma la forma del cuerpo.

  Un eje plano (un plano, una calcomanía) se deja como está en ese eje, para no
  multiplicar por infinito.

  Comprobado con una figura escaneada real troceada en los 16 segmentos: se
  arma, mide 175,0 cm para una talla de 175, los pies apoyan en y=0,00 y al
  doblar la rodilla derecha el tobillo se mueve 44 cm y sube. Los 16 segmentos
  usan el modelo cargado, sin un solo error de consola.

## [0.2.57] — 2026-08-14

### Corregido

- **ELEGIR UNA HERRAMIENTA DEL MENÚ LO COLAPSA.** «Selección de área» y
  «Arrastrar piezas» dejaban el desplegable abierto **encima del lienzo**, y
  el primer gesto que empezara ahí moría sin decir nada: ni recuadro, ni
  selección, ni aviso.

  Medido con la UpperMachine: el popover ocupa 220×321 px y tapa el 5,4 % del
  lienzo a 1440×900 y el 9 % a 1024×768 — pero el porcentaje engaña, porque
  cae en el centro-alto y deja debajo **21 de las 41 piezas** en escritorio y
  **22 de 41** en tableta. Empezar el recuadro sobre la torre de poleas, que
  es lo natural, era un clic muerto.

  No era un fallo suelto sino dos clases de ítem metidas en el mismo saco. Los
  **ajustes** —Espacio, Imán, Grid del suelo, Aristas, Color— sí ganan con que
  el menú siga abierto: se tocan varios seguidos. Las **herramientas** no: lo
  siguiente que hace el usuario es usar el lienzo. Ahora solo los ajustes lo
  conservan. Comprobado: el recuadro sale al primer intento y encuadra las 41
  piezas sin repetir el gesto.

- **Pulsar por segunda vez el botón de un menú ya lo cierra.** No lo hacía: el
  `pointerdown` global lo cerraba y el `click` inmediatamente posterior lo
  volvía a abrir, así que el botón nunca alternaba.

### Cambiado

- **ORBITAR YA NO CIERRA EL MENÚ ABIERTO.** Cualquier toque en el lienzo lo
  cerraba, y eso impedía justo lo más útil de dejarlo abierto: encender
  «Aristas» o «Grid del suelo» y **girar la cámara para ver el efecto** sin
  perder el menú a mitad de comprobación. Ahora un menú solo se cierra a
  propósito: su propio botón, Escape, o elegir una herramienta.

### Sabido

- **El carril lateral derecho ya era un atajo limpio** y no se ha tocado:
  medido, ninguna de sus siete herramientas abre ni despliega un menú, ni
  con los menús cerrados ni con uno abierto. Lo que parecía que los abría era
  el propio desplegable reabriéndose solo, que es lo corregido arriba.

## [0.2.56] — 2026-08-13

### Cambiado

- **POSAR, en el orden en que se trabaja.** Los grupos pasan a ser
  **Postura → Articulación → Apoyos → Partida del ejercicio**, con crear o
  quitar la figura, Colocar y Agarrar arriba del todo. La partida baja del
  segundo puesto al último porque es la consecuencia de todo lo anterior, no
  su premisa: primero decides si hay figura y dónde va, luego cómo está, y
  solo con el cuerpo resuelto, dónde arranca la máquina.

- **LA ARTICULACIÓN, EN UNA LÍNEA.** Antes había una rejilla de ocho familias
  —Columna, Cuello, Hombro, Codo, Muñeca, Cadera, Rodilla, Tobillo— más tres
  botones de lado y, al final de la ventana, una casilla «Simetría L↔R»: doce
  mandos para decir algo que el usuario **ya había dicho al tocar el miembro
  en el visor**.

  Ahora un campo REFLEJA lo tocado, con nombre de persona —«Rodilla derecha»,
  no `kneeR`, y concordando el género, que «Rodilla derecho» chirría— y a su
  lado va el único ajuste que cambia el resultado: el interruptor
  **Bilateral**, que dice si lo que hagas con esa articulación se replica
  espejado en la del otro lado. Es la misma simetría de antes, pero pegada a
  lo que afecta en vez de perdida al final de la columna.

  Los **grados exactos** quedan plegados bajo el nombre de la articulación:
  posar se hace arrastrando, y esos cuatro renglones fijos costaban 39 px en
  una ventana que ya pedía desplazarse. El resumen sigue diciendo cuál está
  seleccionada —«Rodilla derecha (grados)»— y los números salen al abrirlo.

- **LA PARTIDA DEL EJERCICIO, COMO UN REPRODUCTOR.** **▶ Manipular** pone la
  máquina en tus manos —se mueve como en simulación pero sin gravedad ni
  tiempo, cuadro a cuadro, y se queda donde la dejes— y **⏹ Fijar partida**
  congela ese cuadro. Antes era un solo botón que alternaba y no se entendía
  que lo primero es MOVER y lo segundo FIJAR.

### Añadido

- **PUNTOS DE PARTIDA GUARDADOS, numerados del 1 en adelante.** Un mismo
  diseño se ensaya desde varias configuraciones —agarre alto y agarre bajo,
  asiento adelantado y atrasado— y hasta ahora solo cabía una: fijar la
  siguiente borraba la anterior. Cada ⏹ guarda una «Partida N» y el selector
  las recupera, igual que el gestor de posturas. Cada punto lleva **la máquina
  Y la figura**, porque una configuración ergonómica es el par: dónde está el
  mecanismo y cómo se coloca el cuerpo.

  Verificado el ciclo entero: ▶ entra en manipulación y el botón pasa a ⏹, el
  remo de la UpperMachine se arrastra 18 cm, ⏹ guarda «Partida 1» con 3 piezas
  congeladas, se crean «Partida 2» y «Partida 3», se recuperan y se eliminan.

  El selector y su gestor **solo aparecen cuando hay alguna guardada**: hasta
  el primer ⏹ no hay nada que elegir, y una fila vacía es alto que luego hay
  que desplazar. Son 51 px.

## [0.2.55] — 2026-08-13

### Añadido

- **POSAR LA MÁQUINA, PARADA Y A MANO.** El símil del «Posar» del maniquí,
  pero para el mecanismo: con el gesto detenido se agarra una pieza móvil y
  **se queda donde la dejas**, como una parálisis cérea. Al salir, ahí
  arranca cada ▶.

  Antes, fijar dónde empieza el ejercicio obligaba a SIMULAR: arrancar la
  física, pelearse con un sistema en movimiento y cazar el instante bueno con
  la mano. Ahora nada se mueve solo, no hay gravedad que vencer y el tiempo no
  corre. Las uniones y sus topes sí mandan, así que el conjunto solo recorre
  los grados de libertad que de verdad tiene — igual que posar el maniquí solo
  dobla por sus articulaciones.

  Lo que lo convierte en pose no es apagar la gravedad, es la
  **amortiguación**: sin ella, un brazo empujado seguiría girando para siempre
  porque nada lo frena. Y al entrar, el mundo se asienta 150 pasos antes de
  ceder el control: sin peso que tense los cables el conjunto móvil busca su
  configuración coherente, y en la UpperMachine el carro se recolocaba
  **5,6 cm** delante de quien iba a posar, que parecía que la máquina se movía
  sola. Con el asentado previo, **0 cm**.

  Es **excluyente con simular**: mientras el gesto corre, el botón queda
  deshabilitado — ahí manda la física y colocar el mecanismo a mano no
  significaría nada. Medido: la mano lleva el remo de la UpperMachine de 196,6
  a 176,6 cm y dos segundos después sigue exactamente ahí.

- **LA CARGA DEL CONJUNTO SE EDITA SIN DESAGRUPAR.** Con la máquina
  seleccionada como grupo, Propiedades muestra ahora una fila por cada pieza
  que sostiene peso, con su selector rápido: el **pin de la pila** placa a
  placa, y los **discos** del portadiscos, la barra o el cuerno de carga, uno
  a uno. Debajo, la carga total del conjunto.

  Es lo que de verdad se toca entre pasada y pasada. Antes había que
  DESAGRUPAR la máquina, buscar la pieza suelta entre las cuarenta que la
  componen, cambiarla y volver a agrupar. Verificado en las dos vías: la pila
  de la UpperMachine sube de 34 a 40,8 kg al subir el pin una placa, y el
  portadiscos del rack con torre pasa de 38 a 48 kg al montar un disco — y la
  máquina sigue agrupada al terminar.

### Cambiado

- **El botón «Figura» de la barra es ahora «Ergonomía 🦴»** y abre la ventana
  del maniquí. Crear o quitar la figura se muda dentro de ella, que es donde
  vive todo lo demás que le concierne: posar, colocar, las zonas que trabajan
  y la partida del ejercicio.

  Se llama **Ergonomía** y no «Simular» por dos razones. Una, que justo al
  lado vive el ▶ que arranca la física, y dos botones con el mismo nombre
  invitan a equivocarse. Y otra mejor: nombra lo que la ventana hace —el
  encaje entre el cuerpo y la máquina— en vez del modo en que esté.

## [0.2.54] — 2026-08-13

### Corregido

- **EL APK YA NO ES UN BUILD DE DEPURACIÓN.** El CI compilaba
  `assembleDebug`, y eso marca el paquete con **`android:debuggable="true"`**:
  la bandera que Play Protect y las capas de seguridad de los fabricantes
  usan para bloquear un APK instalado de lado. Ahora compila
  `assembleRelease`, con el **mismo** keystore del repositorio
  —`buildTypes.release` ya lo usaba—, así que la identidad del paquete no
  cambia y quien tenga la app instalada de la v0.2.7 en adelante sigue
  pudiendo actualizar. El APK baja además de 15,6 a 14,0 MB.

  **Esto quita un riesgo real, pero NO está demostrado que fuera la causa**
  del fallo de instalación de la v0.2.53. `debuggable="true"` estaba en
  **todas** las versiones anteriores —medido en la v0.2.5, v0.2.6, v0.2.7 y
  v0.2.52—, así que no explica por qué falla justo ésta. Publicar un build de
  depuración estaba mal de todas formas.

- **El APK de la v0.2.53 estaba sano.** Verificado entero: firma v1 completa
  sobre sus 538 entradas con cero digests incorrectos, bloque de firma v2 con
  el digest del contenido recalculado y coincidiendo, firma RSA válida,
  `resources.arsc` sin comprimir y alineado a 4 bytes, sin entradas
  duplicadas, sin `testOnly`, sin librerías nativas, y el SHA-256 del archivo
  descargado igual al de la release. Frente a la v0.2.52 los `.dex` y
  `resources.arsc` son idénticos byte a byte y el manifiesto difiere en una
  sola línea, la de versión. **Nada del binario explica el fallo**, lo que
  deja como candidatas las condiciones del aparato.

  **Y acabó instalándose sin cambiar el APK.** Tras varios intentos fallidos
  y tras autorizar el aviso de Play Protect con el código de seguridad del
  aparato, la instalación pasó: el aviso sigue apareciendo, pero ya no
  bloquea. El binario que entró es el mismo que antes fallaba.

  Así que **la causa nunca quedó demostrada**, y conviene decirlo tal cual.
  Lo único que sí quedó probado es lo de arriba: el paquete estaba bien. El
  patrón —falla, se autoriza en Play Protect, y a la enésima entra— apunta a
  una condición del dispositivo, no del archivo. Si hubiera sido un conflicto
  de firma con una copia instalada, no habría pasado nunca sin desinstalar:
  esa regla de Android no cede con reintentos.

- **Una puerta que mira el binario, no el workflow.** Ni el build de
  depuración ni el cambio de llave de la v0.2.6 se ven leyendo el YAML: hay
  que abrir el APK. `scripts/verificar-apk.py` corre en CI antes de publicar
  y falla si el paquete es de depuración, si es `testOnly`, si está firmado
  con una llave que no es la del repositorio, si `resources.arsc` va
  comprimido o desalineado, si hay entradas sin firmar o con digest que no
  cuadra, o si falta la firma v2. Probado contra los dos casos reales: marca
  el APK de la v0.2.53 por depuración, y el de la v0.2.6 por llave distinta.

### Sabido

- **Si «no se instaló la aplicación» se repite, prueba primero a reintentar
  y a autorizar el aviso de Play Protect.** Es lo que acabó funcionando aquí,
  con el mismo archivo que fallaba: el aviso sigue saliendo, pero deja pasar
  la instalación. No sabemos por qué costó varios intentos.

- **Si aun así no entra, y vienes de una versión ANTERIOR a la v0.2.7,
  desinstala primero.** Esto no se llegó a comprobar en el aparato —el fallo
  se resolvió antes—, pero el riesgo está medido y no tiene arreglo posible
  desde el lado del APK: Android no deja sustituir un paquete instalado por
  otro firmado con una llave distinta, y el aviso que enseña es el mismo
  escueto «no se instaló la aplicación», sin decir por qué.

  El porqué está medido: hasta la v0.2.6 cada compilación del CI generaba su
  propio `debug.keystore`, así que cada versión salía con una llave distinta.
  Descargadas las cinco releases con APK de entonces —v0.2.0, v0.2.1, v0.2.3,
  v0.2.5 y v0.2.6—, todas son `com.exersuite.app` y **cada una lleva un
  certificado diferente**. Desde la v0.2.7 la llave es siempre la misma, la
  del repositorio.

  El orden importa, porque **desinstalar borra los datos locales**:

  1. Abre la app que tengas instalada y guarda lo tuyo: **Guardar proyecto**
     y **Exportar ZIP de la biblioteca**. Comprueba que los archivos estén
     fuera de la app (en Descargas o en Drive), no dentro.
  2. Desinstala EXERSUITE3D. Si el aparato tiene más de un perfil, hazlo con
     **⋮ → Desinstalar para todos los usuarios** desde Ajustes →
     Aplicaciones: mientras siga instalada en un perfil secundario o en un
     espacio infantil con la llave vieja, el conflicto no desaparece aunque
     en tu perfil ya no la veas.
  3. Instala el APK nuevo y recupera tus proyectos desde los archivos del
     paso 1.

  De la v0.2.7 en adelante esto no vuelve a hacer falta: todas comparten
  llave y se actualizan encima sin desinstalar.

## [0.2.53] — 2026-08-13

### Corregido

- **Dos botones del panel del maniquí se salían por la derecha.** «✋ Agarrar
  maniquí» sobresalía 36 px a 800×1280 y 66 px a 1024×768, y «↺ Volver a
  partida» 8 y 38, así que el rótulo quedaba tapado por la barra de
  herramientas. Se vio verificando el APK publicado de la v0.2.52.

  La causa es de manual: `button.tool` lleva `white-space: nowrap`, y un ítem
  flex no encoge por debajo de su ancho de contenido mientras su `min-width`
  sea `auto`. Con eso, el `flex: 1` de la fila no podía repartir el espacio y
  el botón se salía. Ahora esas filas dejan encoger sus botones y la etiqueta
  cae a dos líneas antes que salirse — vale para cualquier idioma, que es lo
  que importa: en inglés los rótulos son otros.

  Y de paso, cuatro rótulos que repetían lo que ya decía su contexto: dentro
  de un panel titulado MANIQUÍ y de un grupo llamado «Partida del ejercicio»,
  «Colocar maniquí» y «Volver a partida» sobraban de largo. Quedan en
  🧍 Colocar, ✋ Agarrar, 📌 Fijar y ↺ Volver, cada uno con su explicación
  entera en el globo de ayuda. Comprobado a 800×1280, 1280×800 y 1024×768:
  **ningún botón se sale en ninguno**.

## [0.2.52] — 2026-08-13

### Añadido

- **🦶 PISAR UNA SUPERFICIE O PEDAL.** El pie no siempre toca el suelo: en una
  prensa de piernas **pisa la plataforma**, en una extensión de rodillas queda
  **al aire** (cadena abierta) y sentado en un banco alto **cuelga**. Ahora
  apoyar un pie funciona igual que apoyar una mano —se toca la pierna y luego
  la pieza— y la IK resuelve cadera→rodilla→tobillo. El pie **viaja con la
  pieza**: si el pedal sube, la pierna lo acompaña. Verificado: la planta se
  posa a 33,25 cm sobre una plataforma cuya cara está a 33,5, y al subirla
  12 cm el pie la sigue.

  Dos detalles que costaron su medida. Lo que pisa es la **planta**, no el
  tobillo, así que el objetivo de la IK sube lo que el pie cuelga por debajo
  de él (sin eso la suela quedaba 9 cm dentro de la plataforma). Y la rodilla
  dobla **al revés que el codo**, así que el solver recibe el frente de la
  figura como polo; con el polo del codo la pierna se plegaba hacia delante.

### Corregido

- **NADA DEL CUERPO QUEDA BAJO EL SUELO NI HUNDIDO EN SU APOYO**, en ninguna
  pose ni colocación. Sentado en el banco de fábrica —40,7 cm— el pie se metía
  **3,12 cm bajo el suelo**, y ninguna pose lo corregía.

  La corrección sigue el orden de un cuerpo real: sentado en un banco bajo,
  una persona no se levanta del banco, **estira la rodilla** y adelanta el pie.
  Así que primero se corrige la pierna y solo si aun estirada no llega —el
  banco es más bajo que su pierna— se levanta la figura entera, que es
  precisamente la señal de que ese asiento no le sirve a ese cuerpo.

  La invariante **solo empuja hacia arriba**: nunca baja un miembro para
  forzarlo a pisar, porque los pies pueden y deben flotar. Comprobado sobre
  las nueve posturas de fábrica, la colocación en banco, la rodilla llevada a
  su tope y el gesto de tren inferior recorrido entero: **0 cm** en todos.
- **La figura vuelve a sentarse en su apoyo.** La invariante solo sube, así
  que una vez levantada por una postura de pie se quedaba flotando 34 cm sobre
  el asiento aunque se le cargara después una postura sentada. Ahora los
  glúteos se reposan en la cara del asiento antes de aplicar la invariante, y
  la cota del apoyo viaja en el proyecto.
- Un pie apoyado en un pedal **manda sobre la corrección de rodilla**: la
  pierna la resuelve su IK y tocarla desde la invariante era pelearse con ella.

## [0.2.51] — 2026-08-12

### Añadido

- **LA PARTIDA CONGELA TAMBIÉN LA MÁQUINA.** Hay gestos cuya postura inicial
  es incómoda de posar y sale mucho mejor empezar por el **bloqueo** —el final
  de la fase concéntrica, justo antes de la excéntrica—, pero para eso la
  máquina tiene que arrancar ahí y no en su diseño.

  Ahora **📌 Fijar partida** congela las dos cosas: la postura del maniquí y
  dónde están las piezas móviles. Se posa la máquina con la mano durante la
  simulación —el único método que la mueve por su cinemática real, con la
  bisagra describiendo su arco y el cable conservando su longitud—, se fija, y
  cada ▶ arranca ahí. Medido en la UpperMachine: el agarre arranca a 101,1 cm
  en vez de a 89,6, y desde ahí baja solo, que es la fase excéntrica.

  **La partida vive APARTE del diseño**, no lo sobrescribe. El diseño es el
  plano fabricable: es lo que se exporta, lo que se acota y de donde cada
  unión saca el cero de sus topes y cada cable su longitud. Por eso el mundo
  se construye siempre desde el diseño y solo DESPUÉS se salta a la
  configuración congelada; construir sobre ella le cambiaría la longitud al
  cable. Parado se sigue viendo y editando el diseño, y **🗑 Soltar máquina**
  devuelve el arranque a él. Todo viaja en el proyecto.

### Cambiado

- **POSAR, reordenado por tarea.** Medido a 1024×768: el panel ocupaba 1020 px
  con 622 visibles, así que **seis de los doce mandos caían bajo el pliegue** y
  llegar al candado pedía bajar unos 400 px. Ahora son cuatro grupos —Partida
  del ejercicio · Postura · Articulación · Manos y simetría—, con la gestión de
  la biblioteca de posturas plegada y cinco rótulos retirados: el contenido
  baja de 1020 a 811 px.

  **Corrección posterior a la publicación:** aquí decía «Cabe sin bajar», y no
  es cierto. Medido de nuevo sobre el APK de la v0.2.52, a 1024×768 el panel
  muestra 629 px de los 811, así que **siguen quedando 182 px bajo el
  pliegue**. La mejora es real —209 px menos y los mandos frecuentes ya salen
  arriba—, pero el panel todavía pide desplazarse para llegar al final.
- **Objetivos táctiles** del selector de articulación y de los selectores de
  lado, de 22-24 px a 30-34: en una tableta eran imposibles de acertar.

### Corregido

- **SENTARSE EN EL EXTREMO DE UN BANCO.** La figura quedaba volteada, mirando
  hacia el banco, y sus muslos lo atravesaban. La orientación se deducía del
  NOMBRE de las piezas vecinas —«al lado contrario de la pieza fija más
  cercana»— y en un banco plano esa pieza es una PATA, así que en el extremo
  apuntaba hacia dentro. Medido en el banco de fábrica: **5,8 cm de muslo
  dentro de la colchoneta en las tres posiciones** (los dos extremos y el
  medio).

  Ahora se mide: se prueban las cuatro direcciones horizontales de la caja
  orientada del propio apoyo —así vale igual con el banco girado— y gana la que
  deja las piernas más fuera. Resultado: **0 cm** en las tres, mirando hacia
  fuera en los extremos y de lado en el medio, que es donde caben las piernas.
- **El respaldo de la máquina de al lado ya no arrastra al que se sienta en un
  banco.** La búsqueda de respaldo era global y sin radio: al no llegar nunca a
  tocarlo, agotaba los 45 pasos del bucle y dejaba la figura **45 cm más
  atrás**, fuera del banco. Con una UpperMachine a 200 cm, sentarse en x=45
  terminaba en x=0.
- **POSAR ya no depende del candado.** Desde v0.2.49 lo fija la ZONA activa, y
  como la figura nace con solo el tren superior, seleccionar una rodilla
  soltaba el gizmo y remitía a una ventana de «Posturas» que ya no existe:
  **media figura era imposible de posar**. El candado dice qué mueve el gesto
  de 8/9 en SIMULAR; POSAR posa lo que se toque. Se retira también su botón
  duplicado del editor numérico.

## [0.2.50] — 2026-08-12

### Añadido

- **EL SITIO WEB HABLA LOS DOS IDIOMAS.** La página de presentación
  (`sitio-web/`, Vercel) se sirve en español o inglés **según la preferencia
  del visitante**: `?lang` → cookie → `Accept-Language` → español. La decisión
  se toma UNA vez en el servidor (middleware), así que no hay parpadeo de
  idioma ni aviso de hidratación, y `<html lang>` sale correcto. Hay conmutador
  ES · EN —dos enlaces de verdad, que funcionan sin JavaScript y se pueden
  compartir— y URLs propias `/es` y `/en` con `hreflang` para que exista una
  dirección rastreable de cada idioma.

  El español sigue siendo la verdad y no se mueve: el inglés es una capa
  **opcional y esparsa** bajo la clave `en`, con la misma forma, que se
  resuelve hoja a hoja con respaldo al español. Lo que no esté traducido se
  sirve en español, y añadirla no cambia el tipo de ningún campo ya publicado
  —lo que habría reventado, por ejemplo, el título del cobro que se manda a
  Mercado Pago—. La traducción de la historia que ya vivía en un desplegable
  se reaprovecha sola: en inglés la historia ES la sección, no un anexo.

- **`/admin` edita en los dos idiomas** con pestañas Español · English, un
  contador de traducciones pendientes y un botón **«Textos de fábrica»** por
  sección, para adoptar la presentación nueva sin perder lo que ya se escribió.

- **La aplicación enlaza al sitio del proyecto** desde el pie de su Home, con
  la dirección **escrita a la vista** y un botón de copiar: el empaquetado de
  escritorio puede negarse a abrir una pestaña nueva, así que quien lo lea
  siempre puede teclearla. El enlace lleva el idioma de la app, y la web abre
  en el mismo (`?lang=`). La dirección se puede cambiar con `VITE_SITIO_WEB`.

- **Ocho capturas reales de la aplicación** en la galería del sitio, con pie
  bilingüe: el taller completo, la instrucción por zonas, la física del cable
  con su pila, la roldana en dos toques, la medición en centímetros, el
  inventario, el herraje de la bisagra y la Home con su instructivo.

### Cambiado

- **Presentación del producto reescrita.** El titular pasa de describir la
  categoría a decir qué se gana: comprobar que la máquina le sirve a un cuerpo
  antes de soldarla. Se añaden la sección del problema con a quién le pasa y
  seis preguntas frecuentes de compra (requisitos, sin conexión, formatos,
  qué pasa en la 1.0, y qué NO es esto). Las características pasan a estar
  ordenadas por lo que diferencia: la validación ergonómica primero.

### Corregido

- **El contenido guardado ya no oculta lo que trae una versión nueva.** La
  fusión era superficial (`{...defecto, ...guardado}`), así que si el objeto
  publicado traía una sección entera, sustituía a la de fábrica con clave y
  todo: cualquier campo añadido después no llegaba nunca a producción. Ahora
  la fusión es profunda, lo guardado manda y los arrays se solapan por índice
  sin acortarse.
- **El editor reventaba al escribir la primera traducción**: recorría la ruta
  suponiendo que existía, y la clave `en` no está en el contenido publicado.
  Ahora crea lo que falte por el camino, y decide entre objeto y array mirando
  el siguiente tramo (`incluye.2` crea un array, no una clave «2»).
- **Los mensajes de la API salían siempre en español.** Un visitante inglés
  leía la página traducida y, al suscribirse, recibía la respuesta en español.
  Ahora las rutas devuelven un código estable y el cliente lo traduce.
- **La cookie de idioma se perdía justo al volver de Mercado Pago.** Se fija
  con `SameSite=Lax` y el idioma viaja además en las URLs de vuelta, así que
  el comprador recibe su descarga en el idioma en el que estaba leyendo.
- **Copia de seguridad automática antes de publicar** desde `/admin`: el
  editor guarda el documento entero, y con dos pestañas abiertas una podía
  pisar a la otra sin dejar rastro.
- Cifras de la presentación **corregidas contra el código**: la biblioteca
  tiene 41 piezas en la paleta y 73 definiciones (decía 47); el registro de
  cambios tiene 59 entradas (no 49); el mínimo de Android que declara el
  empaquetado es 5.1 (`minSdkVersion 22`), no 7; la rejilla es de 10 cm pero
  **no** marca cada metro; y los modelos 3D importados viven en la Biblioteca
  del dispositivo, **no** dentro del `.json` del proyecto.

## [0.2.49] — 2026-08-12

### Cambiado

- **LA SIMULACIÓN SE INSTRUYE POR ZONAS, NO POR ARTICULACIONES.** El modelo
  anterior liberaba articulaciones sueltas y las movía todas «flexionando» o
  «extendiendo» a la vez. Eso hace IMPOSIBLE un press: empujar una carga es
  **extender el codo MIENTRAS se flexiona el hombro**, direcciones anatómicas
  opuestas. Medido en la máquina: con el modelo viejo el brazo solo podía
  quedarse recto y hacia atrás (hombro +60°, codo +15°) o doblado por encima
  de la cabeza (hombro −180°, codo −150°); ninguna de las dos es un empuje, y
  de ahí que los brazos se quedaran en extensión completa.

  Ahora la instrucción es la del gesto real: **ZONA + SENTIDO**.

  - **Tren superior** — empuje: extensión de codo + flexión de hombro.
  - **Tren inferior** — empuje: extensión de rodilla + extensión de cadera,
    **con acomodación dinámica del tobillo** para que la planta conserve su
    orientación sobre la plataforma. Cuando el tobillo se queda sin recorrido
    se avisa: el pie pierde el apoyo porque la máquina pide un ángulo que el
    cuerpo no tiene.
  - **Bisagra (hinge)** — empuje: extensión de cadera + extensión de espalda.

  La **tracción es la inversa exacta** de cada patrón. Las teclas 8 y 9 pasan
  a ser EMPUJE y TRACCIÓN. Cada zona se activa con su **lado** (izquierda,
  derecha o los dos), así que el movimiento sale simétrico, asimétrico,
  sectorizado o simultáneo con solo marcar casillas: marcando tren inferior y
  bisagra a la vez, cadera y espalda se extienden juntas — un peso muerto.

  El gesto **termina donde manda su articulación principal**: el press acaba
  al bloquear el codo, no cuando al hombro se le acaba el rango 90° después.

- **El PLANO lo pone la postura de partida, no el botón.** Con el hombro a la
  altura del pecho el empuje sale horizontal y con los brazos arriba, vertical;
  la tracción, igual: desde delante es un remo y desde arriba un jalón. Se
  añaden las cuatro posturas de partida a la biblioteca —**Empuje horizontal,
  Empuje vertical, Tracción horizontal, Tracción vertical**— para que los
  cuatro movimientos clásicos salgan con dos botones.

- **Con la zona activa, la mano apoyada deja de mandar sobre el brazo.** La IK
  apuntaba al agarre y deshacía el gesto en el mismo fotograma: el brazo se
  quedaba clavado como si no se hubiera pulsado nada. Ahora manda el gesto y
  es el CUERPO el que empuja la pieza por contacto, que es lo que hace una
  persona.

### Añadido

- **POSTURA DE PARTIDA con reinicio (↺).** Se fija sola al aplicar una postura,
  al colocar la figura y al pulsar ▶, y se puede clavar a mano con 📌 Fijar
  partida. **Parar la simulación devuelve la figura a ella**, y el ↺ la
  devuelve sin parar. Antes el maniquí se quedaba con la última pose movida y
  no había forma de repetir el mismo gesto una segunda vez.
- La postura de partida, las zonas activas y el apoyo de la figura se guardan
  con el proyecto.

### Corregido

- **Cargar o guardar una postura tiraba al maniquí al suelo.** Cada cambio de
  articulación re-aterrizaba la figura en y=0: sentada en un banco a 51 cm,
  aplicar una postura la mandaba al suelo y editar un ángulo la movía sola.
  Ahora, apoyada en una pieza, la pelvis se queda donde la dejó el apoyo y los
  miembros giran a su alrededor; solo se re-aterriza lo que está en el suelo.
- **Guardar una postura nueva** se hace con un campo de la propia ventana. El
  `prompt` del sistema abría un diálogo que se comía el gesto en la tableta —y
  en el WebView de la app podía no aparecer siquiera—, así que guardar fallaba
  sin decir por qué.
- **Las posturas de fábrica nuevas ya aparecen en bibliotecas existentes.** Se
  guardaba una copia el primer día y no se volvía a mirar el catálogo, así que
  quien ya tenía biblioteca no vería nunca las que trae una versión nueva.
- La postura **Sentadilla** pedía 30° de dorsiflexión de tobillo contra un tope
  humano de 20°: desde un ángulo imposible ninguna acomodación podía sostener
  la planta. Corregida, y al aplicar una postura los ángulos se limitan al
  rango articular.

## [0.2.48] — 2026-08-11

### Cambiado

- Cápsula del Instructivo al día: la ayuda del maniquí mostraba la ventana de
  Articulaciones anterior, que ya no existe. Ahora enseña la ventana única en
  modo POSAR con su selector de articulación, la figura sentada apoyando de
  verdad y el Toolbox visible en su carril.

### Corregido

- **LAS VENTANAS YA NO SE PISAN.** Auditoría de la interfaz en 5 tamaños de
  pantalla (1440×900, 1280×800, 1024×768, 800×1280 y 640×900) × 7 escenarios
  con varias herramientas abiertas a la vez: **50 conflictos medidos, 0 tras
  los ajustes**. Lo que fallaba:

  - Todo el costado derecho compartía `right: 12px`, así que la ventana del
    maniquí **tapaba el Toolbox por completo** (100 % de su superficie) en
    TODOS los tamaños. Ahora existe un CARRIL derecho: el Toolbox se queda
    pegado al borde y toda ventana de ese lado se aparta su ancho.
  - Las ventanas del costado derecho crecían hasta la barra superior y hasta
    la de simulación. Ahora viven en una BANDA vertical que empieza bajo la
    barra de arriba y acaba sobre la de abajo, midiendo la altura REAL de
    ambas (que crecen a varias filas al estrecharse la pantalla). Si no cabe,
    la ventana desplaza por dentro en vez de desbordar.
  - El bloque de estilo de la ventana del maniquí estaba DESPUÉS de las
    consultas de medio, así que anulaba su propio cajón de pantalla estrecha:
    en 640×900 la ventana salía de la pantalla y tapaba la barra de zoom, las
    dos pestañas y la barra de simulación. Reordenado.
  - El costado derecho aloja UNA ventana a la vez: mientras un diálogo de
    herramienta (roldana, bisagra) ocupa el carril, la del maniquí se repliega
    y vuelve al cerrarlo.
  - Los menús de la barra superior colgaban del botón y tapaban la franja
    inferior de la propia barra. Ahora cuelgan del borde de la barra.

  Los elementos TRANSITORIOS —menús desplegables, fantasma de arrastre,
  marquesina de selección, velos modales— sí pueden cubrir a propósito: se
  cierran al tocar fuera y no compiten por el espacio.

## [0.2.47] — 2026-08-11

### Corregido

- **LA CADERA DEL MANIQUÍ, A LA ALTURA DE LA CABEZA FEMORAL.** El pivote de
  cadera estaba en la CARA INFERIOR de la pelvis, no en medio de ella. Como el
  muslo es un cilindro de radio 0,05·H que cuelga de ese pivote, al sentarse
  —muslo horizontal— su cara inferior quedaba **8,75 cm por debajo de los
  glúteos**: era geométricamente imposible que ambos apoyaran a la vez sobre un
  asiento plano, y había que elegir cuál se hundía o cuál flotaba.

  Subido un radio de muslo, la generatriz inferior del muslo coincide con la
  cara inferior de la pelvis — que es lo que pasa en un cuerpo real, donde el
  fémur articula por el MEDIO del hueso coxal y no por su borde de abajo.

  Medido sobre la misma máquina: **0 cm de hueco al asiento, contacto con el
  respaldo y 0 cm de muslo hundido en el cojín** (antes: 0 / contacto / 8,06).
  La cadera queda al 48,4 % de la estatura, dentro del rango humano; la
  estatura sigue siendo exacta (175 cm) y los pies siguen apoyando en y = 0 en
  todas las posturas de fábrica.

## [0.2.46] — 2026-08-11

### Corregido

- **EL MANIQUÍ APOYA EN SUS APOYOS, ya no flota sobre ellos.** Medido sobre una
  máquina real: al sentarlo quedaba **11,3 cm por encima del asiento y a
  29,2 cm del respaldo**. Con esa separación no hay punto desde el que empujar,
  así que cualquier lectura de esfuerzo salía falseada. Tres causas, las tres
  corregidas:

  1. La altura se calculaba con el punto más bajo de pelvis Y muslos. Si un
     muslo caía —asiento corto o inclinado—, la figura se alzaba hasta dejar
     ESE punto a ras y los glúteos quedaban en el aire. Ahora la referencia son
     los GLÚTEOS, que es lo que carga el peso.
  2. No había nada que llevara la espalda al respaldo. Ahora la figura se
     desliza hacia atrás hasta el instante justo antes de meterse en él.
  3. El "despeje inicial" de v0.2.44 apartaba la figura de TODO lo que tocara,
     apoyos incluidos, deshaciendo lo anterior. Se retira: los apoyos
     ergonómicos quedan fuera de lo que cuenta como estorbo, y el maniquí se
     queda donde lo pones. Si eso lo deja encajado en la máquina, es la
     evidencia ergonómica que se busca, no algo que esconder.

  Resultado sobre el mismo modelo: **0 cm de hueco al asiento y contacto con el
  respaldo**.

### Añadido

- **SELECTOR DE ARTICULACIÓN EN EL MODO POSAR**, homólogo al de SIMULAR: la
  misma lista de ocho familias y su propio selector de lado, pero aquí ELIGE
  cuál se posa — ya no hay que cazar el miembro en el visor para editar sus
  grados, y la familia activa queda resaltada aunque la selección venga de un
  clic en la figura.

### Sabido

- Con los glúteos a ras del asiento, los MUSLOS quedaban ~8 cm dentro del
  cojín. Resuelto en 0.2.47 recolocando la cadera del rig.

## [0.2.45] — 2026-08-11

### Cambiado

- **UNA SOLA VENTANA PARA EL MANIQUÍ, con dos modos.** Las herramientas de
  posar vivían en "Posturas" y los candados en "Articulaciones", así que había
  que saltar de ventana a mitad de gesto. Ahora hay una ventana —**Maniquí**—
  con un interruptor:
  - **🧍 POSAR** fija la POSTURA DE PARTIDA: postura guardada, agarrar un
    segmento, colocar la figura, simetría L↔R y apoyo de manos (IK).
  - **▶ SIMULAR** trae el candado por familia articular con su selector de
    lado, y la flexión/extensión de todo lo liberado.

  La ventana aparece sola cuando hay maniquí y salta a SIMULAR al arrancar la
  física (y vuelve a POSAR al pararla). La ventana "Posturas" desaparece.

- **FLEXIÓN Y EXTENSIÓN CON LAS TECLAS 8 y 9** (antes ▲▼). Los cursores los
  reclama el navegador para recorrer los botones de la interfaz, así que
  pulsar "flexionar" movía el foco en vez del maniquí. 8 flexiona, 9 extiende;
  los botones de la ventana y de la barra de simulación lo dicen.

### Corregido

- **COLOCAR MANIQUÍ SE APAGA AL SOLTARLO.** La herramienta seguía activa tras
  el clic, de modo que el siguiente toque —orbitar, agarrar una pieza— volvía
  a teletransportar la figura. Eso era el "error" al colocar durante la
  simulación.

- **CLICAR UNA PIEZA QUE NO ES APOYO YA NO MANDA LA FIGURA LEJOS.** El rayo se
  colaba hasta el suelo que había DETRÁS de la pieza y dejaba el maniquí a
  metros de distancia (medido: a 4,7 m al tocar la pila de pesos). Ahora la
  primera pieza que encuentra el rayo manda: si no es un apoyo, no se coloca y
  se dice qué apuntar.

- **CLICAR UN RESPALDO SIENTA EN SU ASIENTO**, en vez de dejar la figura
  encaramada sobre el respaldo.

- **NINGUNA DIRECCIÓN DEL MOVIMIENTO QUEDA MUERTA.** El tope de estructura de
  v0.2.43 frenaba la articulación cuando el segmento fuera a entrar en el
  hierro, y con la figura encajada eso mataba un sentido entero del recorrido
  (medido: 1 paso aplicado de 40 en flexión). Se retira: las articulaciones
  recorren su rango completo y el choque **se avisa** —en la ventana y con un
  mensaje— en vez de impedirse. Ese choque es la evidencia de que la máquina
  no deja sitio al cuerpo, y esconderlo era justo lo contrario de lo que sirve.

## [0.2.44] — 2026-08-11

### Añadido

- **EL MANIQUÍ TIENE CUERPO EN EL MOTOR**. Cada segmento entra como cuerpo
  CINEMÁTICO con la forma de su primitiva —esfera la cabeza, cilindros los
  miembros, cajas torso y pelvis—, no como caja envolvente. Cinemático quiere
  decir que la postura la manda quien simula (posar, ▲▼, agarres): la figura no
  se desploma ni la arrastran las piezas, pero **la máquina ya no puede
  atravesarla**. Medido sobre la UpperMachine: el conjunto móvil pasa de meterse
  5,0 cm en el cuerpo de la figura a **0 cm**.

- **MANOS Y PIES SIN COLLIDER, a propósito**: son los puntos por los que la
  figura AGARRA la máquina. Apoyar una mano en un asa la lleva justo encima de
  ella, y si además chocaran, la IK del brazo y el contacto se pelearían
  empujándose sin parar. Lo que no puede atravesarse es el cuerpo.

- **DESPEJE AL COLOCAR Y AL ARRANCAR**: con cuerpo físico, nacer dentro de la
  máquina deja la estación inservible —la pieza móvil topa desde el primer
  instante— y el motor no puede resolverlo, porque un cinemático y una pieza
  anclada no se empujan. La figura se aparta por su frente lo MÍNIMO necesario,
  y solo si de verdad estaba encajada; se avisa de cuánto se movió.

### Lo que esto revela

- **El maniquí sólido es, de hecho, una COMPROBACIÓN ERGONÓMICA.** Si al sentar
  la figura una estación pierde recorrido, lo que falla es el diseño de la
  máquina, no el motor: no hay holgura suficiente para el cuerpo que va a
  usarla. En la UpperMachine de fábrica se ve enseguida — el press pasa de
  23-33° y 7-11 cm de pila sin nadie a 1-18° con la figura sentada, porque el
  asiento la deja a **0,6-3,3 cm** del conjunto móvil (mano 0,6 cm, cabeza
  2,9 cm, antebrazo 3,3 cm, torso 10,3 cm). Esas cifras son la medida de cuánta
  holgura hay que ganar rediseñando.

### Sabido

- Apoyar la mano en un asa lleva el antebrazo sobre ella (7-8 cm de solape
  mano-asa): la IK apunta al punto de agarre, no a una empuñadura por fuera.
  Por eso los miembros del maniquí no viajan CON el asa como los de una persona.

## [0.2.43] — 2026-08-10

### Corregido

- **EL MANIQUÍ SENTADO SE POSA EN EL ASIENTO, NO SE HUNDE**. Al sentarlo se
  ponía el ORIGEN de su raíz a ras de la cara superior del asiento, pero los
  glúteos y los muslos cuelgan por debajo de ese origen: media pelvis quedaba
  dentro de la pieza (8,8 cm medidos en la UpperMachine). Ahora se mide la cota
  más baja de lo que de verdad reposa —pelvis y muslos, no las piernas, que
  cuelgan hacia el suelo— y se levanta la figura lo justo para que esa cota
  coincida con la superficie.

- **LA ESTRUCTURA FRENA A ▲▼**. El maniquí no tiene cuerpo en el motor, así
  que un brazo liberado entraba en un pilar como si fuera aire: medidos 3,03 cm
  de brazo dentro de un travesaño recorriendo hombro y codo. Antes de dar por
  bueno un paso de ▲▼ se mide cuánto penetra el segmento movido en las cajas de
  colisión de la máquina —leídas en su pose actual, así que valen también con
  la máquina en marcha— y si el paso EMPEORA la penetración se deshace: la
  articulación se queda donde el hierro la deja.

  Un segmento que ya estaba rozando puede seguir moviéndose, incluso para
  salir; lo único que no puede es entrar más. Medido: la penetración añadida
  por ▲▼ pasa de 3,03 cm a **cero** (el 1,42 cm que queda es previo, del pie
  contra un travesaño al colocar la figura), se aplican 113 de 152 pasos —los
  frenados son justo los que entraban en el hierro— y la pulsación pasa de
  0,14 ms a 2 ms.

  El tope solo actúa con la simulación en marcha: POSAR el maniquí y colocar
  los agarres siguen siendo libres, porque son los que fijan la postura de
  partida.

### Sabido

- El maniquí sigue sin cuerpo físico: la MÁQUINA puede barrerlo (medidos
  2,78 cm de brazo de press a través del torso) y el pie puede quedar dentro
  de un travesaño al sentarlo. Eso pide meter la figura en el motor, que es
  otro cambio.

## [0.2.42] — 2026-08-10

### Corregido

- **EL CABLE YA NO EMPUJA UNA PIEZA DENTRO DE OTRA**. La corrección de longitud
  del cable movía los nodos con un reposicionamiento directo DESPUÉS del paso
  del motor, así que ese desplazamiento no pasaba por los contactos: nada le
  impedía meter una pieza dentro de la estructura de la que cuelga. En la
  UpperMachine la barra de jalón se hundía milímetro a milímetro en el
  bastidor superior hasta **3,3 cm**, se quedaba clavada ahí y **la estación de
  jalón dejaba de funcionar**: la pila subía 0,3 cm en vez de 21.

  Ahora el desplazamiento NETO que el cable imprime a cada nodo en el subpaso
  se barre con la forma del propio cuerpo y se corta en el primer choque, una
  sola vez por subpaso (no en cada una de las ocho pasadas, para no encarecer
  el bucle). Los pares cuyo contacto apagó su unión —pivotes y adaptadores— se
  ignoran, igual que los ignora el motor, y una pieza que ya estaba penetrando
  sigue pudiendo salir: eso lo resuelve el motor, no el barrido.

  Medido sobre la UpperMachine, tres repeticiones: la barra pasa de hundirse
  3,1-3,4 cm a quedar libre en cuanto el motor la expulsa, el jalón pasa de
  0,2-0,3 cm a 20,5-24,5 cm de recorrido de la pila, y el press se mantiene.
  El coste del paso sube de ~1,3 ms a ~1,4-2,2 ms.

## [0.2.41] — 2026-08-10

### Añadido

- **HERRAMIENTA DE MANIPULACIÓN, ELEGIDA A PROPÓSITO**. La simulación arranca
  con el puntero en ÓRBITA: mirar la máquina ya no la manosea. La mano (✋) se
  elige, y al elegirla **resalta al pasar por encima la pieza que agarraría**,
  sea ergonómica o estructural — lo que decide es el CUERPO al que pertenece,
  así que un asiento o un travesaño soldado a un conjunto móvil se agarran
  igual que el propio brazo. Si lo que hay bajo el puntero está anclado, se
  dice con su nombre en vez de no hacer nada.

- **COLOCAR MANIQUÍ (🧍) apuntando**: el puntero recorre el SUELO y los puntos
  de apoyo ergonómicos —asientos, respaldos, bancos— marcando dónde caería la
  figura (la marca cambia de color sobre un apoyo), y el clic la deja ahí con
  su orientación: sentada sobre la cara superior del asiento y mirando al
  frente de éste, o de pie sobre el suelo mirando a la máquina más cercana.
  Está en el panel Posturas y en la barra de simulación, así que sirve en
  construcción y en simulación, en el Builder y en el Viewer.

- **VENTANA DE ARTICULACIONES (🦴)**: una casilla por familia articular
  —columna, cuello, hombro, codo, muñeca, cadera, rodilla, tobillo— y un
  selector de lado (izquierda, derecha o simétrico). La figura nace con TODAS
  las articulaciones BLOQUEADAS y se libera a propósito lo que el ejercicio
  necesita; los cursores **▲▼ mueven a la vez todas las liberadas**, cada una
  por su eje natural y en el sentido en que flexiona. El candado gobierna solo
  ese movimiento: posar la figura a mano y apoyar manos y pies siguen
  disponibles, porque son los que fijan la postura de partida.

### Corregido

- **REVISIÓN DE LOS RANGOS ARTICULARES DEL MANIQUÍ**. La ABDUCCIÓN DEL HOMBRO
  tenía los signos cambiados de lado: el brazo izquierdo separaba hacia el
  derecho y viceversa (`shoulderL` z `[-30,150]` → `[-150,30]`, y su espejo).
  El TOBILLO permitía tanta dorsiflexión como flexión plantar (`[-45,45]` →
  `[-20,50]`) y su inversión/eversión era simétrica cuando no lo es
  (`[-15,30]` a la izquierda y su espejo a la derecha). El CUELLO pasa a
  `[-60,50]` (50° de flexión, 60° de extensión) y el CODO gana la
  pronosupución del antebrazo (`y: [-80,80]`), que no existía.

## [0.2.40] — 2026-08-10

### Añadido

- **HERRAMIENTA DE FRENO (TOPE) DE CABLE** — `⏺ Freno`, en el panel
  Conexiones. Un clic sobre el trazado de un cable engarza ahí la ESFERA de
  tope de las máquinas reales: viaja con el cable mientras se tira de él, pero
  no pasa por una roldana ni por un terminal, y al llegar se interpone y ese
  lado deja de retraerse. Otro clic sobre la esfera la retira. La bola se
  dibuja sobre el cable y se DESLIZA con él durante la simulación, porque lo
  que se conserva es su posición a lo largo del cable, no su punto en el aire.

  Sirve para lo que motivó la herramienta: **limitar las fugas de tensión**.
  En un sistema de dos estaciones, el extremo más liviano —una barra que
  cuelga suelta— se traga el recorrido que debería mover el contrapeso; un
  freno en su ramal lo impide y el esfuerzo se vuelve parejo desde el momento
  cero.

  En el motor no es un cuerpo más ni un contacto que simular: el freno parte
  el recorrido en dos tramos y acota sus longitudes —antes de la esfera nunca
  hay más de `s` de cable, y hasta el nodo siguiente nunca menos—, con la
  misma maquinaria del cable inextensible pero proyectado casi sin holgura,
  porque un tope de goma no es elástico. Medido en la UpperMachine: un freno a
  116 cm sobre un ramal de 119,8 impide que baje de 116,4 cm (sin él llega a
  114,4), y uno bajo la roldana alta del jalón sube el recorrido que el press
  entrega a la pila de 9,4 a 11,5 cm.

  El freno viaja en el proyecto, en los prefabs y en las máquinas estándar.

## [0.2.39] — 2026-08-10

### Corregido

- **EL BRAZO ARTICULADO SE TORCÍA EN VEZ DE GIRAR EN SU PLANO**. Empujando el
  brazo de press de la UpperMachine desde UN solo agarre, el conjunto no
  describía su semicircunferencia sobre el pasador: se torcía. Medido, con un
  empuje de 50°: **22° de diferencia entre el agarre derecho y el izquierdo**,
  13° de guiñada, 60° de balanceo y el agarre izquierdo desplazado 23 cm hacia
  el centro. La trayectoria que salía no era la de la máquina.

  La causa estaba en cómo se arma un pivote cuando las dos piezas tienen
  orientaciones de diseño distintas: se interponía un ADAPTADOR dinámico de
  50 g y 1e-4 kg·m² de inercia entre el bastidor y un brazo de 19 kg. Con ese
  salto de masa de tres órdenes de magnitud el solver deja la bisagra blanda
  en los dos grados de libertad que debería bloquear, y un tirón desde un lado
  la retuerce.

  Ahora, cuando **uno de los dos lados está ANCLADO** —el caso de casi todos
  los pivotes de una máquina: un brazo sobre su bastidor— el adaptador es un
  cuerpo FIJO colocado en el pasador y orientado como la pieza que gira, de
  modo que la bisagra une «anclado ↔ móvil» directamente y es tan rígida como
  cualquier otra. Cuando ambas piezas se mueven, el adaptador conserva su
  papel pero recibe masa e inercia del orden de las de la pieza que sostiene.

  Resultado medido en el mismo empuje: **0,0° de torsión, 0,0° de guiñada,
  0,0° de balanceo**, los agarres clavados en su sitio y el brazo recorriendo
  su semicircunferencia hacia anterior y arriba. Y como ya no se escapa
  torciéndose, TIRA DEL CABLE: la pila sube 10,4 cm en 39° de recorrido
  (antes 2,9 cm), con 33 kg de esfuerzo.

- Con la bisagra rígida los **TOPES del pivote vuelven a valer**: se activan
  los del brazo de la UpperMachine ([-90°, 0°]), así descansa exactamente en
  su pose de diseño —apoyado en su tope, listo para empujar contra el
  respaldo— en vez de colarse 10 cm por detrás al arrancar la simulación.

## [0.2.38] — 2026-08-10

### Corregido

- **LA MANO SIGUE EL ARCO DE LA PIEZA ARTICULADA**. Movilizar el brazo de
  press era casi imposible: la mano llevaba el objetivo a un plano paralelo a
  la pantalla, y como una pieza con bisagra solo puede recorrer un ARCO, la
  mayor parte del tirón se estrellaba contra el pasador — 30 a 50 kg de
  esfuerzo para no mover nada, o unos pocos grados cuando movía.

  Ahora el motor anota el EJE DE GIRO de cada pieza articulada (el ancla y la
  dirección en el frame de la pieza de referencia, así vale también para una
  bisagra montada sobre otra pieza móvil) y la mano lleva el objetivo sobre la
  circunferencia que esa pieza puede recorrer de verdad. Todo el esfuerzo
  entra como giro y la lectura de tensión sigue siendo honesta, porque el
  objetivo cae EXACTAMENTE sobre el arco y no incluye el tirón radial que se
  come el pasador.

  Además, sobre una pieza articulada el agarre es FIRME (tres veces menos
  juego: KP y KD suben juntos, así la estabilidad para cualquier masa es la de
  siempre), porque la mano no sujeta un objeto suelto sino una manilla guiada.

  Medido en la UpperMachine, arrastrando el agarre con el puntero: el brazo de
  press recorre 34° de los 45° pedidos siguiendo al dedo con ~3° de retraso y
  27 kg de esfuerzo. Antes, el mismo gesto daba 4°.

- **El agarre ya no se queda con la primera pieza que encuentra**: el rayo
  recorre TODOS los impactos hasta dar con algo que de verdad se pueda mover,
  así una pieza anclada por delante (un montante, el respaldo) deja de
  bloquear el agarre de lo que hay detrás. El rayo pasa a ser recursivo, de
  modo que también cuentan las mallas hijas (placas de la pila, discos
  cargados).

- **EL CODO DEL MANIQUÍ DOBLABA AL REVÉS**. Con los huesos en reposo sobre
  −Y y la figura mirando a +Z, una X positiva lleva el segmento hacia ATRÁS:
  correcto para la rodilla, imposible para el codo, que tenía el mismo signo
  (`[-15, 150]`). El antebrazo se plegaba hacia la espalda. El rango pasa a
  `[-150, 15]` y las posturas de fábrica «Sentado» y «Remo» se corrigen con
  él; las posturas que hubieras guardado se migran solas cambiando el signo
  de la flexión del codo.

- Los cursores **▲/▼ de la articulación focal FLEXIONAN siempre**, sea cual
  sea el signo de la articulación: antes ▲ flexionaba la rodilla pero extendía
  la cadera, el hombro y (ahora) el codo.

## [0.2.37] — 2026-08-09

### Añadido

- **MARKETPLACE: el hub de siete ventanas**. El catálogo de la Home pasa a ser
  el HUB que junta a usuarios, makers y marcas en un showroom virtual: el
  dueño de gimnasio cotiza y simula la distribución de su sala con equipos
  reales, la marca expone su catálogo en modelos de alta fidelidad levantados
  por escáner fotográfico, y el aficionado encuentra foro, patrocinio y quien
  le fabrique lo que dibujó. Se recorre por una barra de siete pestañas y el
  CARRITO es el mismo en todas las vitrinas.

  1. **🎉 NEWCOMERS** — las marcas recién llegadas (cuatro meses o menos)
     estrenan su vitrina: historia, país, modelos escaneados, seguidores y
     catálogo, con salto directo a la vitrina ya filtrada por esa marca.
  2. **✨ NEW ARRIVALS** — los estrenos de los últimos tres meses con su
     cinta y su antigüedad, del más reciente al más antiguo, más la fila de
     «próximamente» con aviso.
  3. **🌱 SUPPORT THE LOCAL ECONOMY** — PyMEs y marcas que fabrican en el
     país del usuario, que se elige con las banderas y queda guardado;
     debajo, el resto de talleres pequeños del hub.
  4. **🏬 VITRINA DIGITAL** — la tienda. Arriba, las HISTORIAS de cada marca
     en formato Instagram (anillo, diapositivas verticales, barra de
     progreso, avance automático y toque a los lados), cuyo botón «Ver
     productos» deja el catálogo filtrado por esa marca. Abajo, el catálogo
     con BUSCADOR integrado (nombre, marca, categoría o nota), chips de
     categoría y carrito con total.
  5. **🔧 MAKERS** — el foro de la comunidad DIY: diseños originales,
     búsqueda de patrocinio (con barra de reservas y las marcas interesadas)
     y equipos de trabajo, con respuestas plegables —las de las marcas
     marcadas aparte—, apoyo en vivo y compositor de hilo nuevo. Aquí vive
     ahora el mercado bidireccional makers ⇄ manufacturers.
  6. **🪄 GOT A WISH** — el usuario presenta su diseño a las marcas y pide
     una valoración para fabricarlo: formulario de encargo con las marcas
     destinatarias, conversación directa por hilo con su estado (enviado ·
     en revisión · presupuestado · en fabricación) y la pintura de
     estructura y tapizado que acompaña al pedido.
  7. **🤝 JOIN EXERSUITE3D** — la puerta de entrada de las marcas al hub:
     el trayecto contacto → acuerdo y ficha → escáner fotográfico 3D →
     publicación, qué gana la marca y el formulario para escribir a la
     administración.

### Cambiado

- El catálogo crece a **18 productos de 7 marcas** con su país, su condición
  de PyME y su antigüedad en el hub; se añade la categoría **Máquinas**. Las
  fechas se guardan como ANTIGÜEDAD (días o meses atrás), no absolutas, para
  que «recién llegada» y «estreno» sigan siendo ciertos con el paso del
  tiempo.
- El Marketplace se reparte en `src/ui/marketplace/` (arte, datos, piezas
  comunes y un módulo por ventana) en lugar de un solo archivo.
- FAQ del Instructivo al día, con capturas de las ventanas nuevas.

## [0.2.36] — 2026-08-09

### Añadido

- **UPPERMACHINE en la biblioteca de máquinas estándar**: la torre
  multiestación del diseñador entra en el Builder junto al rack, la jaula y
  las torres de polea. 41 piezas con su geometría literal —trazados,
  pinholes, ventanas caladas, perfil viga o tubo—, 16 uniones y 2 cables.

  Su mecánica: una pila selectorizada de 15 placas × 6,8 kg sobre tubos
  guía; el CARRO DE DOBLE ROLDANA flota entre los senos de los dos cables
  (el del jalón tira hacia arriba, el del press hacia abajo), de modo que
  su altura fija de una vez el largo de ambos. El jalón alto da 23–27 cm de
  recorrido de placas con 5–7 cm de recorrido muerto, y el press de pecho
  7,4 cm; su carga útil práctica ronda los 20 kg, que es lo que el brazo
  (19,2 kg) puede contrarrestar.

  El BRAZO COMPUESTO —segmento superior, arco en U, dos mangos y dos
  agarres— viaja soldado como un solo cuerpo rígido y pivota desde el
  bastidor superior.

## [0.2.35] — 2026-08-09

### Añadido

- **TRAMOS OCULTOS del cable**: cuando un tramo va de una roldana INTERNA a
  otra roldana INTERNA DE LA MISMA estructura, el cable discurre por DENTRO
  del perfil —hueco en el mundo real—, así que nada de lo que ocupe ese
  volumen lo obstruye: ni la propia viga ni el mástil que la sostiene
  penetrando en ella. Antes el validador lo marcaba en rojo y obligaba a
  mutilar la estructura para "arreglarlo".

  La regla es ESTRICTA y se aplica tramo a tramo: entre roldanas de vigas
  DISTINTAS, de una interna a una EXTERNA, o en cualquier otro punto del
  recorrido, el cable se sigue validando contra el material como siempre —
  ahí sí transgrede las paredes del perfil.

  La condición de roldana interna se resuelve por geometría (la rueda cae
  dentro del volumen de la estructura), así que vale tanto para las que
  empotró la herramienta como para las colocadas a mano en modelos
  anteriores a ella.

### Corregido

- **Prefab UpperMachine**: se revierte el recorte del mástil de v0.2.34. El
  remate llega al interior del bastidor superior porque es su APOYO
  ESTRUCTURAL —sin ese contacto la torre horizontal cede—, y el cruce con
  el cable alto no era un defecto del diseño sino un tramo oculto, que
  ahora el validador entiende. El prefab ya no altera la geometría de
  ninguna pieza.

## [0.2.34] — 2026-08-09

### Añadido

- **Avisos de armado**: al arrancar la simulación el motor informa de las
  incoherencias que cambian el comportamiento sin romper nada. La primera:
  **soldar una pieza ANCLADA a otras móviles ancla el conjunto entero** —
  la trampa silenciosa que deja un brazo compuesto inmóvil aunque su pivote
  esté bien puesto. El aviso nombra la pieza culpable.
- **`docs/prefabs/uppermachine.prefab.json`**: la máquina UpperMachine del
  diseñador, revisada y puesta al día con el motor actual (ver abajo).

### Corregido

- **Los volteos de los PREFABS también se hornean**: al insertar un prefab
  con `escala` negativa (v0.2.31 o anterior) la pieza conservaba la escala
  invertida y su gizmo seguía descuadrado. Ahora se migra al insertarla,
  igual que al abrir un proyecto.

### Revisión del prefab UpperMachine

Se corrigieron las incoherencias físicas que el motor actual destapa, sin
tocar la geometría de las piezas (trazados, pinholes, ventanas, perfil viga
o tubo, dimensiones y nodos se conservan intactos):

- El **brazo compuesto** mezclaba piezas móviles con un mango ANCLADO, de
  modo que el conjunto entero quedaba anclado y no pivotaba. Los mangos y
  los tubos de agarre pasan a ser móviles con masa real, y el arco recibe
  la suya (antes 0 kg).
- Faltaban las **soldaduras** del mango derecho (espejo de las del
  izquierdo) y de los dos tubos de agarre: se quedaban clavados en el aire
  mientras el brazo se movía.
- Los **terminales de cable** no viajaban con su pieza: el cable del brazo
  tiraba de un anclaje fijo en vez del brazo. Ahora van soldados a la pieza
  que deben arrastrar.
- Cuatro piezas guardaban su **volteo como escala negativa**; pasan a
  espejo horneado.
- El **remate del mástil** llegaba 3,6 cm por encima del cable alto y lo
  atravesaba (el validador lo marcaba en rojo): se recorta 6 cm, con lo que
  el mástil sigue metido 9 cm dentro del bastidor superior y ambos cables
  quedan válidos.

## [0.2.33] — 2026-08-09

### Corregido

- **La bisagra plegaba atravesando el material**: el motor apaga los
  contactos entre los dos cuerpos que une una articulación —en un pivote
  clásico las piezas se solapan a propósito—, y como las placas de la
  bisagra se funden con sus piezas, esa regla acababa apagando también la
  colisión entre las dos vigas: se cerraban una dentro de la otra. Ahora
  una bisagra real PIDE contactos, así que el recorrido lo define la
  geometría igual que en el mundo: montada sobre la cara superior las
  piezas topan enseguida y no pliegan; montada en la inferior, el mismo
  conjunto flexiona. Si las dos piezas ya estaban interpenetradas al
  instalarla, los contactos se dejan apagados y se avisa (encenderlos las
  expulsaría al arrancar).
- **El herraje flotaba sobre las piezas giradas**: se apoyaba usando la
  caja AABB del mundo, que se hincha al girar la pieza (una viga a 30°
  inflaba su envolvente y subía la bisagra 14 cm por encima de la cara).
  Ahora se apoya sobre la caja ORIENTADA — la superficie real.
- El pasador ya no roza la placa contraria: las palas arrancan pasado su
  radio, así que la bisagra no se agarrota cuando las piezas empiezan a
  chocar de verdad.
- Las bisagras instaladas con v0.2.32 se corrigen al abrir el proyecto o
  reinsertar el prefab: se les activa la colisión si sus piezas no están
  superpuestas.

### Añadido

- **Cara de montaje de la bisagra**: el panel suma un selector de cara en
  direcciones globales (auto, arriba, abajo, derecha, izquierda, anterior,
  posterior). Es la decisión física de la herramienta — la cara determina
  hacia dónde puede plegar —, y con eje «Auto» la charnela se deduce de la
  cara elegida y de la línea entre las piezas.
- **Interruptor «Las piezas chocan entre sí»** en cada unión (Conexiones):
  encendido, el material frena el recorrido; apagado, las piezas se
  atraviesan, que es lo que necesita un pivote donde se solapan a propósito
  (un brazo metido en su anclaje). Viaja en proyectos y prefabs.

## [0.2.32] — 2026-08-09

### Añadido

- **Herramienta de bisagra REAL**: «+ Bisagra» ya no deja una articulación
  invisible entre dos piezas — instala el herraje completo. Tras tocar la
  1.ª y la 2.ª pieza, un panel pequeño al costado derecho (se puede
  orbitar el modelo mientras se decide) pide el EJE de giro (Auto, X, Y o
  Z global), el TAMAÑO de las placas y el RECORRIDO en grados. Se montan
  DOS PLACAS PLANAS sobre la cara de cada pieza y el PASADOR cilíndrico
  que las articula; cada placa queda SOLDADA a su pieza, de modo que en la
  simulación gira exactamente el herraje que se ve. El conjunto queda
  agrupado como «Bisagra» y se mueve o se borra como una sola cosa.

### Corregido

- **Un brazo compuesto salía despedido de su pivote**: las uniones
  BLOQUEADAS son soldaduras, no articulaciones, pero el motor las trataba
  como una articulación más y las hacía pelear con el pivote del brazo.
  Ahora las piezas soldadas se FUNDEN en un solo cuerpo rígido (con la
  masa de todas y los colisionadores de cada una), así que un jammer arm
  con una extensión soldada pivota entero desde su anclaje. Además, una
  pieza marcada como MÓVIL sin masa declarada ya no se simulaba como
  estática — flotaba en el aire y expulsaba a lo que tuviera unido —:
  recibe una masa mínima de trabajo.
- **Voltear una pieza descuadraba el gizmo**: el volteo se aplicaba como
  ESCALA NEGATIVA, que invierte también los ejes del objeto — se
  arrastraba hacia +X y la pieza se iba a −X. Ahora el espejo se HORNEA en
  la geometría: la pieza se ve reflejada igual, pero su escala sigue
  siendo positiva y sus ejes concuerdan con los del mundo. Los proyectos y
  prefabs antiguos con escalas negativas se convierten al abrirlos.
- Los marcadores de las uniones BLOQUEADAS se dibujan pequeños y grises
  (son soldaduras) y el de una bisagra real se reduce para no tapar su
  propio pasador.

### Cambiado

- **Biblioteca sin piezas redundantes**: se retiran la *polea*, el *bloque
  de poleas* y la *leva* — la roldana, con su herramienta de colocación
  (externa con montaje / interna alojada y calada), cubre su función y es
  más versátil. Los proyectos, prefabs y máquinas que las usaban siguen
  cargando: sus ids se resuelven a la roldana.
- FAQ actualizada (física y conexiones, brazos móviles, edición) con la
  bisagra real, las soldaduras y el volteo horneado, más una captura nueva
  del herraje.

## [0.2.31] — 2026-08-07

### Corregido

- **Agrupar a partir de la selección volvía a fallar en modelos con
  roldanas**: las piezas que ya pertenecían a un conjunto — el de cada
  roldana (rueda + eje), creado por la propia herramienta desde v0.2.27,
  o una máquina insertada — se descartaban en silencio, de modo que
  Edición → Agrupar dejaba fuera justo esas piezas o no hacía nada. Ahora
  el grupo nuevo ABSORBE esos conjuntos enteros (se disuelven dentro de
  él) y, si aun así no llegan a dos piezas, lo dice en pantalla en lugar
  de callar. Tocar cualquier pieza del grupo vuelve a seleccionar el
  grupo completo, que se mueve, gira y escala como bloque.

### Cambiado

- **FAQ (Instructivo) al día**: se reescriben los puntos que habían
  quedado atrás — paleta sin la subpestaña de despiece, inventario actual
  de máquinas estándar, herramienta de roldana en dos pasos con calado
  real, grupos (crear absorbiendo conjuntos, seleccionar tocando, girar
  sin perder la mecánica) y el prototipo con zoom de la foto y perilla de
  inclinación —, y se añade una entrada para el Marketplace.
- **Capturas del Instructivo regeneradas** con la interfaz actual (21
  imágenes, incluidas las nuevas de grupos, herramienta de roldana, viga
  calada, prototipo y marketplace); se retiran las que ya no
  correspondían a ninguna pantalla.

## [0.2.30] — 2026-08-07

La roldana interna se aloja DE VERDAD dentro de la viga: la estructura
elegida se cala y la rueda gira sobre un eje apoyado en sus dos paredes.

### Cambiado

- **La viga se PERFORA de verdad**: colocar una roldana interna modifica la
  geometría del objeto seleccionado — abre en él dos agujeros pasantes
  iguales, en las caras que quedan sobre y bajo la rueda, alineados
  perpendicularmente a su eje de giro. Ya no se dibujan placas encima de
  las caras: el hueco es real (un rayo lo atraviesa sin tocar material) y
  se ve el interior de sus paredes.
- **Eje de giro soportado por las dos paredes**: la rueda nace montada en
  un eje pasante que va de pared a pared del perfil, en lugar de quedar
  suelta en el aire.
- **La rueda cabe entera**: el hueco se dimensiona con el diámetro de la
  rueda más holgura a lo largo de la viga, y el paso del cable a lo
  ancho, de modo que la rueda no choca con la cara; si el perfil es más
  estrecho que su espesor, la rueda se afina para entrar entre las
  paredes.

### Añadido

- **Ventanas rectangulares pasantes** (`ventanas` en los parámetros de la
  pieza) como capacidad general del modelo: se calan recortando los
  triángulos de la malla y levantando las cuatro paredes interiores del
  hueco, así que funcionan igual sobre una primitiva paramétrica que
  sobre el modelo 3D de biblioteca de una pieza real. Viajan en el
  proyecto y se vuelven a calar al recargarlo.
- Componente oculto **Eje de roldana** (lo produce la herramienta).

## [0.2.29] — 2026-08-07

El calce del prototipo con foto gana los dos grados de libertad que le
faltaban: escala de la fotografía e inclinación del modelo.

### Añadido

- **Zoom de la fotografía de fondo**: 🖐 pasa a ser *Mover y escalar foto*
  — arrastrar la desplaza (como antes) y la PINZA de dos dedos o la rueda
  del ratón la acercan y alejan, anclando el zoom al punto bajo los dedos;
  un control fino del panel fija el porcentaje exacto (30–300 %) y el
  doble toque recentra. Encuadre y escala se replican en la producción por
  capas, así que el PNG reproduce exactamente lo que se ve.
- **Perilla de inclinación del modelo** (📐): aparece al FIJAR la
  perspectiva y gira el punto de vista en vertical hasta que el plano del
  suelo del render calza EXACTAMENTE con el de la fotografía — sin tocar
  el giro ni la distancia, que la fijación ya dejó resueltos. Trae lectura
  en grados y pasos finos de 0,5°.

### Corregido

- La utilidad `.proto-oculto` no ocultaba las filas del panel del
  prototipo (la clase base `.proto-fila`, definida después, ganaba en
  especificidad): la fila de inclinación asomaba antes de fijar la
  perspectiva.

## [0.2.28] — 2026-08-07

Paleta sin la subpestaña de despiece, panel de roldana compacto con
direcciones globales y aperturas en las dos caras de la viga.

### Cambiado

- **La subpestaña "Despiece TTP/POWERRACK" sale de la paleta**: las piezas
  internas de las máquinas reales ya no se listan en el Builder. El *Carro
  de doble roldana TTP* pasa a la sección Transmisión (sigue disponible
  con sus dos roldanas funcionales). Las máquinas estándar, los prefabs,
  los proyectos guardados y la Biblioteca de modelos siguen resolviendo
  TODOS los ids como siempre.
- **Panel de la herramienta de roldana COMPACTO y al costado derecho**:
  reemplaza al diálogo modal a pantalla completa — el modelo se sigue
  viendo y se puede ORBITAR en vivo mientras se elige (los clics sobre el
  visor no abren un segundo panel; Esc cancela).
- **Direcciones en ejes GLOBALES**: arriba (+Y), abajo (−Y), derecha (+X),
  izquierda (−X), anterior (+Z) y posterior (−Z) — antes eran cuatro y
  relativas a la cámara, así que el resultado cambiaba según desde dónde
  se mirase.
- **Roldana interna: DOS aperturas**, de las mismas dimensiones, en las
  dos caras del perfil colocalizadas con la rueda — la de encima y la de
  debajo, ambas perpendiculares a su eje de giro —, por donde el cable
  entra y sale: es la pieza de soporte de polea alta del TTP. La
  validación reconoce la viga que aloja una roldana interna del recorrido
  como PERMEABLE (cruzarla por sus aperturas es el funcionamiento
  correcto, no un error).

## [0.2.27] — 2026-08-07

La roldana ya no queda flotando: montaje real para la externa y
alojamiento con apertura para la interna.

### Cambiado

- **Roldana externa con MONTAJE**: al colocarla nace vinculada a la
  estructura por una placa base apoyada en la cara y dos mejillas
  paralelas a la rueda que llegan hasta su eje — como el soporte que fija
  la polea baja al travesaño inferior del jalón bajo en el modelo TTP.
- **Roldana interna ALOJADA con apertura**: se aloja en el interior de la
  viga/estructura y produce un ORIFICIO RECTANGULAR en la cara del perfil
  hacia la dirección elegida, que facilita el tránsito del cable — como
  las roldanas internas de la estructura de soporte superior del sistema
  de jalón alto del TTP. La validación de cables reconoce la apertura y
  las mejillas como parte del conjunto (no como material atravesado).
- La dirección elegida se CALZA a la cara del perfil más cercana (eje
  local dominante): el montaje apoya plano y la apertura se abre en una
  cara, nunca sobre una arista. El conjunto (roldana + montaje o
  apertura) queda AGRUPADO y viaja unido.

## [0.2.26] — 2026-08-06

Herramienta de roldana en dos pasos, revisión del inventario de piezas y
foto de fondo arrastrable en el prototipo.

### Cambiado

- **Herramienta de roldana rediseñada (dos pasos)**: al elegir Roldana en
  la paleta ya no se toca una cara — primero se toca la ESTRUCTURA que la
  alojará (viga, pilar, travesaño, brazo…; se puede orbitar libremente
  para buscarla), su eje mayor aparece como una LÍNEA AZUL, y el
  siguiente toque elige el punto a lo largo de ese eje; ahí se precisa el
  tipo (interna: embutida con la rueda asomando por la apertura; externa:
  montada fuera de la cara) y la dirección a la que va dirigida
  (arriba/abajo/izquierda/derecha, relativas a la vista). El modo queda
  activo para encadenar roldanas y Esc termina; las estructuras con
  roldanas adosadas o insertas interactúan con los cables como siempre.
- **Revisión ítem por ítem del inventario** (solo la paleta del Builder;
  los prefabs no cambian): la Roldana VUELVE a la paleta como entrada de
  la nueva herramienta; salen el Cable rígido (los cables reales se
  trazan con su herramienta), la Base de apoyo (la Base de soporte
  redimensionada la cubre) y el Fulcro (un Pivote anclado lo suple).
- **Carro de doble roldana TTP** (el puente del carro): SIEMPRE conserva
  sus roldanas y su física de transmisión — desde la paleta nace como
  conjunto agrupado (puente móvil + polea superior e inferior
  funcionales, poses del prefab TTP); en simulación las roldanas se
  empotran al puente como cuerpo compuesto y los cables las reconocen
  como reenvío, igual que en el TTP con torre.

### Añadido

- **Prototipo con foto — 🖐 Mover foto**: en el modo calce, la fotografía
  de fondo se puede ARRASTRAR para calzar mejor la perspectiva (las fotos
  pueden estar tomadas desde una altura distinta a la del visor 3D);
  doble toque la recentra y el desplazamiento se conserva en la
  producción por capas.

## [0.2.25] — 2026-08-05

Rotar un grupo ya no rompe su mecánica, y el inventario pierde la torre
de polea antigua (las dos torres del diseñador la suplen).

### Corregido

- **Rotar un grupo conserva su funcionalidad** (bug reportado con la
  Torre polea de pesos girada 90°): las ARTICULACIONES ahora viajan con
  el conjunto — el ancla (guardada en coordenadas de mundo) y el eje se
  transforman con el mismo delta que las piezas al mover/girar un grupo o
  multiselección desde el gizmo o el panel de Propiedades. Si el eje
  girado cae sobre un eje cardinal se conserva como letra (editable en el
  panel); en ángulos intermedios queda como VECTOR LIBRE, que el motor,
  los marcadores 3D, el guardado y los prefabs entienden. Elegir una
  letra en el panel de conexiones reemplaza el vector.
- **Detecciones del motor invariantes a la rotación**: el empotrado de
  roldanas, los accesorios calzados y las guías tubulares median las
  piezas con la caja AABB de MUNDO dentro de pruebas expresadas en el
  frame LOCAL — con la máquina girada permutaban ejes y elegían
  anfitriones equivocados (la polea alta se fundía con el remo y la
  máquina se desarmaba al simular). Ahora usan las dimensiones LOCALES
  absolutas (también inmunes al espejado con escala negativa), y el
  radio del groove de las roldanas para el contacto de cables se mide
  igual. Verificado: la torre girada 90° asienta y transmite IGUAL que
  sin girar (pila a 52, remo la sube +67 cm, deriva 0), el rack girado
  45° se mantiene armado, y un grupo manual con bisagra conserva ancla y
  eje tras el giro.

### Eliminado

- **Torre de polea (alta/baja)** sale del inventario de máquinas: las
  torres de polea de discos y de pesos del diseñador suplen su función.

## [0.2.24] — 2026-08-05

La Torre polea de pesos queda DEFINITIVA con la corrección del diseñador.

### Cambiado

- **Torre polea de pesos — versión corregida del diseñador**
  (torrepoleadepesos.prefab.json, verbatim): se eliminan los manguitos
  espaciadores y el BLOQUE DE PESOS baja a su posición natural cerca del
  piso (base ≈ 8 cm), abrazado a los tubos guía; el recorrido de ambos
  cables y las tres bisagras quedan según el archivo (22 piezas).
  Verificado: la pila asienta guiada y el remo de polea alta la levanta
  +67 cm por el cable, sin deriva lateral.

## [0.2.23] — 2026-08-05

La variante encargada: TORRE POLEA DE PESOS — el bastidor de la torre del
diseñador con la pila seleccionable (bloque de pesos) en lugar del carrier.

### Añadido

- **Torre polea de pesos** (borrador para corrección del diseñador): el
  MISMO bastidor de la Torre polea de discos — tubos guía con manguitos
  espaciadores, poleas alta/baja/de torre, carro de doble roldana, remo
  de polea alta, jalón bajo y sus dos cables — con la PILA DE PESOS
  seleccionable abrazada a los tubos guía en lugar del carrier
  portadiscos: descansa sobre los espaciadores (base ≈ 61 cm) y el cable
  de carga toma su tapa. Verificado: tirar del remo levanta la pila
  +45 cm por el cable, sin deriva lateral en las guías. Se exportó el
  torrepoleadepesos.prefab.json para la ronda de corrección.

## [0.2.22] — 2026-08-05

Control de herramientas: cambiar de herramienta ABANDONA cualquier modo de
construcción en curso.

### Corregido

- **Ya no se construyen estructuras por accidente al cambiar de
  herramienta**: tras colocar una pieza en construcción tipo LÍNEA (o con
  el cable, la cuerda, la conexión o el doblado por nodos activos),
  elegir cualquier herramienta — selección, área, mover, rotar, escalar u
  orbitar, desde el Toolbox, los menús o el teclado — SALE del modo de
  construcción: los toques siguientes ya no plantan piezas nuevas.
  Re-tocar la herramienta activa también cancela el modo en curso.

## [0.2.21] — 2026-08-05

La JAULA DE POTENCIA del diseñador entra al repertorio estándar, la paleta
se navega por SUBCATEGORÍAS PLEGABLES y los discos montados heredan el
diseño distintivo del "Disco de peso" de la biblioteca.

### Añadido

- **Jaula de potencia del diseñador** (jauladepotencia.prefab.json,
  verbatim — reemplaza la jaula genérica anterior): cuatro pilares TTP
  perforados con columnas inferiores y superiores, travesaños, barra
  pullups multigrip, cuatro jotas de calce y dos brazos de seguridad
  (17 piezas).

### Cambiado

- **Subcategorías PLEGABLES en "Piezas disponibles"**: cada grupo de la
  paleta (Máquinas estándar, Primitivas, Estructural, Movimiento, Poleas
  y cables, Pesos, Ergonómico, Despiece…) se pliega y despliega tocando
  su título, con chevron de estado — la lista larga se navega por
  secciones y la interfaz queda limpia. El estado de plegado PERSISTE en
  el dispositivo entre sesiones.
- **Discos de carga con el diseño DISTINTIVO**: los discos que se montan
  en la barra olímpica, los cuernos y el portadiscos usan la MISMA malla
  que la pieza "Disco de peso" de la biblioteca — si el diseñador
  sustituyó su modelo (el disco con radios y relieve), toda la carga lo
  hereda, alineado por su grosor y escalado al diámetro/grosor de cada
  pieza. Sin modelo sustituido, el cilindro clásico de siempre.

## [0.2.20] — 2026-08-05

Nueva TORRE POLEA DE DISCOS nativa, el guardado en Android deja de cerrar
la aplicación, y el doblado por nodos queda como debía: estirar un extremo
no toca el contrario, curvas fluidas sin sigmoidea, y el bug de fondo que
corrompía la biblioteca al doblar, erradicado.

### Añadido

- **Torre polea de discos** (torrepoleadediscos.prefab.json del diseñador,
  verbatim): torre de polea con CARRIER PORTADISCOS — dos tubos guía con
  manguitos, poleas alta/baja/de torre, carro de doble roldana, remo de
  polea alta y barra de jalón bajo, con sus tres bisagras y DOS CABLES
  completos. Verificado: tirar del remo levanta el carrier por el cable
  (+64 cm) sin una décima de deriva lateral en las guías. (Queda encargada
  la variante con BLOQUE DE PESOS en lugar del carrier.)
- El racksentadillas.prefab.json adjunto se verificó NUMÉRICAMENTE
  IDÉNTICO al rack nativo vigente (las modificaciones ya estaban
  incorporadas desde v0.2.14): no se duplica.

### Corregido

- **Guardar ya no CIERRA la aplicación** (Android): Capacitor serializa
  las opciones del PluginCall retenido al estado de instancia mientras el
  diálogo "Guardar como…" está abierto — con una captura de varios MB en
  base64, ese bundle superaba el límite del Binder y Android mataba el
  proceso (TransactionTooLargeException). El contenido viaja ahora fuera
  del call (memoria del plugin) y se elimina de sus opciones antes de
  lanzar la actividad. Revisados los demás flujos de archivos (abrir,
  compartir, descarga clásica, proyecto, prefab, biblioteca): ninguno
  arrastra payloads por ese camino.
- **Doblado por nodos — estirar un extremo ya no ACORTA el contrario**:
  la geometría recta se construye centrada en el origen, así que el largo
  nuevo se repartía hacia ambos lados. Tras editar un nodo, el path se
  re-centra en su cuerda y el origen de la pieza absorbe el corrimiento:
  el extremo contrario no se mueve ni un milímetro (verificado: +30 cm en
  un extremo, deriva 0.0 del otro).
- **Curvas FLUIDAS (chordal)**: la parametrización uniforme sobreoscilaba
  formando la SIGMOIDEA — al jalar un nodo, la curva se hundía hacia el
  lado contrario (medido: 3 cm de contra-comba al doblar un extremo).
  La catmull-rom CHORDAL pondera cada tramo por su longitud real: 3×
  menos contra-comba y curvas limpias también con nodos desparejos.
- **La biblioteca ya no se CORROMPE al doblar** (bug de fondo descubierto
  en la revisión): los `params` de las piezas se compartían POR
  REFERENCIA con los defaults de la biblioteca y con los specs de las
  máquinas nativas — doblar una pieza mutaba el default y cada pieza (o
  máquina) nueva nacía ya deformada y descentrada. Copia profunda en la
  creación de piezas y en la construcción de prefabs.

## [0.2.19] — 2026-08-05

Las cadenas ganan su LÍMITE DE INEXTENSIBILIDAD (ninguna barra las
atraviesa, ni de 180 kg en caída libre) y el Prototipo con foto pasa a ser
herramienta del VIEWER, donde el gizmo queda fuera de las piezas.

### Corregido

- **La barra ya no atraviesa las cadenas ni cae al suelo**: el solver de
  juntas no resiste el impulso de una barra muy cargada en caída libre
  (las juntas de los eslabones se estiraban un instante y la barra se
  colaba hasta el suelo — reproducido con 180 kg desde 160 cm). Cada
  cuerda con anclajes fijos materializa ahora su restricción física real:
  una barrera invisible sobre la elipse |PA|+|PB| = arco — el lugar
  geométrico límite que una cadena INEXTENSIBLE puede alcanzar. La cadena
  flexible se deforma con normalidad por dentro y nada pasa por debajo de
  su límite: barrido de 33 colocaciones (alturas 75–200, profundidades
  entre pilares, descentres, giros y 2–4 discos) a velocidad real, todas
  retenidas.
- **Anti-túnel reforzado**: hasta 4 subpasos de CCD por paso (a 60 fps un
  cuerpo recorría ~20 cm por paso y podía atravesar colliders delgados) y
  velocidad máxima de seguridad recortada de 12 a 8 m/s — cubre cualquier
  caída legítima en una máquina de 2,2 m y desarma los impulsos de
  despenetración que catapultaban piezas.

### Cambiado

- **El Prototipo con foto es herramienta del VIEWER**: su botón 📸 vive
  en la barra del Simulador (Home → ▶ Simulador) y desaparece de la barra
  del Builder — el visor de prototipo se abre deteniendo la física y ⌂
  Volver regresa al viewer.
- **El viewer no edita**: sin capacidad de gizmo sobre los objetos — la
  herramienta queda fija en selección; solo se posan las articulaciones
  del maniquí y se arrastran los móviles durante la simulación.

## [0.2.18] — 2026-08-04

Revisión de la biblioteca: la paleta del Builder se CURA de redundancias
sin tocar un solo id — prefabs, máquinas estándar, proyectos guardados y
la Biblioteca de modelos siguen resolviendo todas las piezas.

### Cambiado

- **Paleta profesional CURADA** (nuevo atributo `paleta` de la
  biblioteca, que solo afecta a "Piezas disponibles"):
  · OCHO piezas redundantes dejan de aparecer: los genéricos con gemelo
    real (Montante de rack, Gancho J, Guía, Riel, Barra de dominadas,
    Roldana) y las plantillas internas de las cuerdas (Cadena de
    eslabones, Listón de Kevlar), que se confundían con las cuerdas de
    seguridad colocables.
  · DIECIOCHO piezas internas de las máquinas reales (pletinas, placas y
    soportes de polea, bastidores, travesaños, largueros, listones, pies,
    rieles de base, tubo guía, puente del carro, portadiscos, manguito)
    se agrupan en la nueva sección plegable "Despiece TTP / POWERRACK",
    disponible sin saturar las categorías principales.
- **El modo Sencillo conserva su propia lista blanca intacta** (incluida
  la barra de dominadas genérica) y no muestra la sección de despiece.
- Nada más cambia: las máquinas estándar se arman completas con sus
  piezas internas, los prefab .json se insertan igual y la Biblioteca de
  modelos sigue listando TODAS las piezas para sustituir modelos.

## [0.2.17] — 2026-08-04

El Marketplace se vuelve un CATÁLOGO DE VENTA visual: productos con
imagen, ofertas con descuento, filtros por categoría y carrito demo.

### Cambiado

- **Marketplace — catálogo con imágenes y ofertas** (primera modificación
  secuencial de la maqueta): el showroom textual pasa a ser una grilla de
  DIEZ productos, cada uno con su ILUSTRACIÓN de producto (SVG
  autocontenidos: rack, torre de poleas, banco, jota con rodillo, cadenas,
  barra olímpica, discos bumper, multigrip, árbol de discos y el servicio
  "tu diseño, fabricado" de Taller Quimera), marca, calificación,
  descripción y precio. Las OFERTAS llevan su insignia con el porcentaje
  de descuento y el precio anterior tachado.
- **Filtros y carrito demo**: chips por categoría (Racks, Poleas, Pesos y
  barras, Bancos, Accesorios), botón 🛒 Añadir que alimenta un carrito con
  contador de artículos y TOTAL en vivo, Pedido demo que confirma en
  línea y Vaciar. 🧩 Ver sigue abriendo la Biblioteca real (showroom).
  El mercado bidireccional (con el apoyo de la comunidad) y la
  personalización con pintura continúan intactos bajo el catálogo, y todo
  conserva la etiqueta DEMO con marcas ficticias.

## [0.2.16] — 2026-08-04

El PROTOTIPO CON FOTO toma su forma definitiva: la foto del lugar vive
DEBAJO del render, el calce se hace orbitando sobre el suelo preservado, la
perspectiva se fija, el sol se arrastra en un selector circular y la
fotografía se produce por capas con suelo de caucho y sombras reales.

### Cambiado

- **Prototipo con foto — flujo definitivo en cinco pasos** (reemplaza la
  primera iteración por croma de v0.2.15):
  1. El área de trabajo se configura con las dimensiones del lugar REAL
     (planta de forma libre o parámetros digitales): la coincidencia de
     superficies es la base del buen resultado.
  2. El usuario compone su espacio colocando y armando los modelos.
  3. Al cargar la fotografía se entra en MODO CALCE: la foto se ubica
     DEBAJO del render dinámico, cuyo fondo se elimina (como pantalla
     verde) pero cuyo SUELO se preserva — se ORBITA hasta el punto de
     coincidencia entre el suelo del área de trabajo y el suelo de la
     foto, con la transparencia del render regulable para ver el
     solapamiento.
  4. La perspectiva se FIJA (📌: la órbita queda bloqueada) y el ÁNGULO DE
     INCIDENCIA DE LA LUZ se elige arrastrando un sol ☀ en un selector
     circular, para que las sombras hagan sentido con la fotografía.
  5. La foto se PRODUCE por capas: fondo = fotografía del usuario; encima,
     la captura del suelo del área de trabajo con sus modelos y las
     sombras que proyectan. El suelo básico se transforma en GOMA tipo
     caucho (moteado EPDM) con el logotipo de la aplicación discretamente
     impreso — para que se vea real. Galería + descarga PNG.
  Las sombras se fuerzan durante el modo calce aunque el preset de
  rendimiento las tenga apagadas, y al salir todo vuelve a su estado.
- **Circunscrito a su PROPIA INSTANCIA DE VISOR**: la función no agrega
  ninguna sección a la ventana izquierda — para no sobresaturar la
  interfaz del Builder, se entra con el botón 📸 Prototipo de la barra
  superior y TODA la interfaz de edición desaparece (queda el visor, la
  órbita y la ventana flotante de controles con ⌂ Volver); al salir, el
  Builder se restaura tal como estaba, herramienta activa incluida.

## [0.2.15] — 2026-08-03

Las jotas sostienen la barra en su CONCAVIDAD real, las cadenas se
comportan como CUERDAS flexibles de verdad, y nace el PROTOTIPO CON FOTO:
el simulador de estética del espacio con fotografías del usuario.

### Corregido

- **Asiento CÓNCAVO de las jotas y brazos de seguridad**: el motor ahora
  reconoce que el gancho J tiene una estructura cóncava que SOSTIENE la
  barra — la superficie superior de la malla real se muestrea con rayos
  verticales y cada muestra se vuelve una columna de collider, de modo que
  el canal (asiento bajo, tope delantero, respaldo) queda representado tal
  cual es. La barra apoyada queda RETENIDA: ni rueda ni desliza fuera del
  gancho, aunque se la empuje (antes resbalaba sobre una caja lisa y caía).

### Cambiado

- **Cadenas y correas como CUERDAS FLEXIBLES**: durante la simulación cada
  cadena es una cadena de eslabones dinámicos articulados por juntas
  esféricas, amarrada por sus extremos a los cuerpos de sus piezas de
  anclaje. La catenaria de diseño solo define la TENSIÓN inicial de los
  extremos: a partir de ahí la cuerda cuelga, ondula, se hunde bajo la
  barra que cae (y la mece) y recupera su forma — el visual de eslabones
  se reproyecta en vivo desde la física, en vez de quedarse clavado en su
  parábola. Eslabones con masa industrial y amortiguación de rozamiento:
  la cadena disipa el golpe en lugar de devolverlo como un trampolín.

### Añadido

- **PROTOTIPO CON FOTO** (nueva sección de la ventana izquierda): el
  simulador de la estética y disposición del espacio con FOTOGRAFÍAS del
  usuario como referencia. Configura un espacio con las dimensiones del
  lugar real, carga una foto de ese lugar y ALINEA la cámara con la foto
  superpuesta al visor (transparencia ajustable, sin capturar toques);
  activa la PANTALLA VERDE (fondo croma con suelo, rejilla y ayudantes
  ocultos) y pide la CAPTURA COMPUESTA: los modelos se recortan por croma
  y se solapan sobre la foto — un piloto visual de lo que obtendría al
  colocar los equipos en su sitio, guardado en la galería y descargado
  como PNG.

## [0.2.14] — 2026-08-02

El Marketplace llega como maqueta navegable, la simulación gana la mano
con lectura de tensión, la órbita pura y la demostración de movimiento por
articulación focal, el rack de sentadillas del diseñador entra a la
biblioteca nativa CON sus cadenas, y las físicas dejan de acuñar la barra:
las piezas dobladas colisionan por su forma real.

### Corregido

- **Colisión por FORMA REAL de las piezas dobladas**: una viga o tubo
  TRAZADO con codos colisionaba con su caja envolvente completa — en el
  rack de sentadillas, los pilares traseros doblados levantaban un MURO
  invisible que llenaba el hueco del rack: la barra soltada dentro quedaba
  acuñada en el aire, sin alcanzar jotas, cadenas ni suelo. Ahora la curva
  barrida se muestrea en cuerdas de ~10 cm y cada una recibe su collider
  (cápsulas en tubos, prismas solapados en vigas): la barra cae por el
  hueco real, roza el pilar con fricción y las cadenas de seguridad la
  detienen, con los discos apoyados sobre los eslabones.
- **Piezas ESPEJADAS con física**: una pieza con escala negativa (la jota
  derecha del rack, la columna inferior derecha del TTP) producía un
  collider de semiejes negativos — comportamiento indefinido que en la
  práctica la volvía FANTASMA: la barra la atravesaba. Los semiejes ahora
  usan el tamaño absoluto y el espejo colisiona igual que su gemela.
- **La barra no cruza el suelo**: losa de suelo de 10 m de espesor y un
  guardarraíl por subpaso (velocidades acotadas, todo cuerpo bajo la línea
  de suelo se reposa sobre ella) — el impulso violento de despenetración
  al arrancar la simulación ya no catapulta piezas al vacío.

### Añadido

- **MARKETPLACE (maqueta navegable)** en la Home: showroom virtual de
  marcas (ficticias) cuyos equipos se prueban como ítems de biblioteca
  ANTES de comprar — el botón abre la Biblioteca real —, mercado
  bidireccional makers⇄manufacturers (cotiza la construcción de tu diseño
  con apoyo de la comunidad; las marcas licencian o compran diseños), y
  pedido de equipo personalizado con interfaz de pintura en vivo sobre el
  banco plano clásico (estructura y tapizado por separado). Los flujos
  comerciales confirman en línea y todo lleva etiqueta DEMO.
- **RACK DE SENTADILLAS nativo**: la máquina estándar es el modelo del
  diseñador (racksentadillas.prefab.json, verbatim: 14 piezas con pilares
  doblados, jotas espejadas y rodillos) y nace CON sus dos cadenas de
  seguridad tendidas entre los anclajes de cada lado — el formato prefab
  no captura cuerdas, así que la especificación nativa las repone
  (CuerdaSpec) y la física las materializa como barrera.
- **Mano con TENSIÓN legible** (✋): la fuerza del agarre siempre
  alcanza, y la barra de simulación reporta la tensión máxima sostenida
  del agarre en curso en kg y lb (filtrada, sin picos numéricos).
- **Herramienta de ÓRBITA en simulación** (🌐): el arrastre solo mueve la
  cámara, sin tocar piezas — conmutable con la mano en la misma barra.
- **DEMOSTRACIÓN DE MOVIMIENTO por articulación focal**: selector en
  español (Columna, Hombro izq., Rodilla der., …), cursores ▲▼ (también
  flechas del teclado) que flexionan/extienden la articulación FOCAL
  dentro del rango humano real, candado 🔒 para fijarla, lectura del
  ángulo en grados y el resto del cuerpo ajustándose por la cadena (mano
  agarrada e IK incluidos).
- **DOBLADO POR NODOS en el Toolbox**: séptimo atajo (icono de curva) que
  activa la deformación por nodos de la pieza trazada seleccionada; sin
  una pieza válida avisa en pantalla en vez de callar.

## [0.2.13] — 2026-07-28

El banco plano clásico del diseñador entra a la biblioteca, los grupos se
transforman con números exactos, una barra de seis herramientas rápidas
evita los arrastres inadvertidos y la ventana izquierda se reorganiza en
cinco barras colapsables.

### Añadido

- **Ventana izquierda ÚNICA**: la columna de comandos es UNA sola
  ventana con el logo y cuatro barras colapsables del mismo estilo que
  "Piezas disponibles" — PIEZAS DISPONIBLES, PROPIEDADES, CONEXIONES y
  ARRASTRE PRECISO — circunscritas a sus márgenes, con buen espaciado,
  texto completo y su propia barra de deslizamiento. Las pestañas
  laterales de Propiedades/Conexiones/Arrastre desaparecen: tocar el
  título de cada barra la pliega o despliega. En pantallas angostas la
  ventana entera es un cajón (botón 🧩) y la barra de zoom se esconde
  mientras está abierto para no interceptar los toques. El Toolbox de
  seis herramientas vive en su barra vertical del borde derecho.
- **Barra superior en varias filas**: si las herramientas no caben en
  una fila, la barra salta de fila en vez de ocultarlas o exigir
  desplazamiento — todos los textos y botones quedan visibles, y la
  ventana izquierda empieza siempre justo debajo de su altura real.

- **Banco plano CLÁSICO de fábrica**: la máquina estándar "Banco plano"
  ahora es el modelo del diseñador (bancoplanoclasico.prefab.json,
  verbatim): colchoneta tapizada de 120×30 sobre espina central trazada,
  pata trasera en L con pie corrido, pata delantera en arco con dos pies
  y tres bisagras de plegado bloqueadas.
- **Transformación NUMÉRICA del grupo**: con un grupo o una
  multiselección, Propiedades muestra la pose exacta del gizmo colectivo
  — posición del centro (cm), rotación del bloque (grados) y escala (×),
  acumuladas desde que se tomó la selección — y editable en números: el
  bloque completo se mueve, gira alrededor de su centro o se escala con
  precisión, igual que arrastrando el gizmo.
- **Barra de HERRAMIENTAS RÁPIDAS** (borde derecho del visor): seis
  atajos cuadrados con icono — selección única, selección de área,
  mover, rotar, escalar y orbitar — con la herramienta activa marcada.
  Cambiar de herramienta es explícito y fluido: con selección u orbitar
  el gizmo de piezas queda inactivo y oculto (nada se mueve por
  accidente), y con orbitar el toque solo maneja la cámara sin cambiar
  la selección. Los atajos de teclado G/W (mover), R/E (rotar) y S
  (escalar) seleccionan la herramienta correspondiente.

## [0.2.12] — 2026-07-26

El brazo de seguridad se sostiene de DOS pilares, como en la máquina real.

### Corregido

- **Calce de DOS postes**: mientras los ganchos J, las jotas y los
  anclajes cuelgan de UN pilar, el brazo de seguridad se TIENDE entre los
  dos pilares de su lado (el pin entra axialmente por las caras
  enfrentadas). Al calzar, el motor busca la pareja del pilar más cercano
  sobre la línea de los pinholes, alinea el eje largo del brazo sobre esa
  línea y lo centra entre ambos; ▲/▼ lo sube o baja UN agujero en los dos
  pilares simultáneamente (comparten grilla). Antes quedaba colgando de
  un solo punto, girado hacia afuera de la máquina.
- **Sin SOLAPAMIENTO entre accesorios del mismo pilar**: al subir o bajar
  una pieza calzada, si el agujero destino cae dentro del volumen de otra
  pieza montada en ese poste, el paso SALTA al siguiente agujero libre en
  la misma dirección (o avisa si no queda ninguno) — dos jotas ya no
  pueden ocupar el mismo espacio.

### Añadido

- **Número de pinhole en Propiedades**: la sección "Calce en el poste"
  muestra en qué agujero está calzada la pieza y cuántos tiene el poste
  ("Calzada en el agujero 21 de 40"), numerados desde abajo — el motor
  conoce la grilla completa (1..X) de cada montante de biblioteca y de
  cada poste trazado con pinholes configurables.
- **Los pinholes SOBREVIVEN a la deformación por nodos**: al doblar una
  estructura trazada, los agujeros solo se obliteran donde la CURVATURA
  real de la superficie impide instalar un acople; toda cara
  suficientemente plana los conserva, aunque quede DIAGONAL o inclinada.
  La curva se muestrea centímetro a centímetro y se particiona por
  cuerda acumulada (comba ≤ 2 mm) en caras planas: las que alcanzan el
  pie de un accesorio (≥ 20 cm) se extruyen con su grilla de pinholes y
  el codo se barre liso, fusionados en una geometría continua.
- **Calce en caras INCLINADAS**: los accesorios reconocen la inclinación
  de la cara y del pinhole donde calzan. Cada tramo recto de una
  estructura doblada por nodos aporta su PROPIA grilla de calce (centro,
  dirección y eje del pin del tramo): la jota se alinea con el eje del
  tramo — vertical, diagonal u horizontal —, su manguito abraza esa
  línea, ▲/▼ avanza agujero a agujero A LO LARGO del tramo y Propiedades
  reporta el número de agujero de la grilla que la sostiene.
- **Accesorios calzados como GRUPO físico**: en la simulación, una pieza
  de calce (gancho J, jota, brazo, anclaje) montada en una estructura con
  pinholes queda FIJADA por su pin — forma un cuerpo rígido compuesto con
  ella. Si la estructura es móvil (un brazo, un carro), el accesorio
  viaja solidario sin caerse ni deslizar; si es fija, queda anclado. Sus
  colliders siguen activos en el cuerpo compuesto (una jota fundida sigue
  recibiendo la barra) y su masa se suma a la estructura móvil.

## [0.2.11] — 2026-07-26

El jalón bajo del TTP funciona como la máquina real: la barra se mueve con
libertad total de vectores y su tirón se transmite completo al carrier.

### Corregido

- **La barra de jalón bajo ya no queda clavada en horizontal**: la
  detección de guías tubulares confundía la barra colgante (a 2 cm del
  travesaño del piso) con un carro guiado y la circunscribía a una recta
  horizontal. Ahora una pieza solo se considera guiada si el tubo la
  ATRAVIESA a lo largo (abrazo interior ≥ 5 cm, como los manguitos del
  carrier) — la barra recupera la libertad de vectores del jalón alto.
- **Transmisión COMPLETA del jalón bajo al carrier**: el extremo más
  liviano del cable (el remo) absorbía el recorrido al tirar de la barra
  baja y el portadiscos apenas se movía. Nuevos TOPES DE TERMINAL: el
  primer y último segmento del cable no pueden acortarse por debajo del
  tope del accesorio contra su roldana vecina (~10 cm), y el extremo que
  llega a su tope queda PARQUEADO contra la polea (como la barra real
  descansando en el tope de goma) hasta que la mano lo agarre — todo el
  recorrido restante va al contrapeso.
- **Mano interactiva con fuerza HUMANA**: el resorte de la mano pasa a un
  presupuesto de fuerza fijo (hasta ~80 kgf, sobre-amortiguado para toda
  masa) en lugar de escalar con la masa de la pieza agarrada — agarrando
  la barra liviana de 2 kg la mano topaba en ~12 kgf y no podía arrastrar
  el contrapeso de 38 kg conectado por el cable. Verificado con el
  .prefab.json del diseñador: la mano arrastra la barra baja 36 cm
  elevando el portadiscos cargado (+14 cm) y la levanta 52 cm en
  vertical.

- **MANGAS DE CARGA reconocidas**: los discos entran por la manga — el
  cilindro cuyo diámetro concuerda con el orificio central — y se apilan
  contra el HOMBRO (la deflección o cambio de grosor que delimita la
  manga), como en una barra olímpica real. Hombros medidos en las mallas
  oficiales: carrier del TTP a ±14 cm del centro, barra olímpica a
  ±75 cm. Antes los discos flotaban a un tercio del largo de la pieza.
- **El freno de las guías topa con el CUERPO del carrier**: los discos
  montados quedan lejos de los tubos y no participan del stop — antes
  inflaban la caja del carro y el freno actuaba un radio de disco antes
  del contacto real. El volumen efectivo de una pieza excluye su carga.
- **Discos montados SÓLIDOS**: cada disco de la carga recibe su collider
  cilíndrico — una barra olímpica cargada descansa SOBRE sus discos y
  ningún disco cae por debajo del suelo ni atraviesa superficies.
- **Los discos sobreviven a recargar el proyecto**: en piezas con malla
  personalizada (carrier, barra olímpica) el contador de discos no
  reconstruía la carga al recargar un proyecto o insertar la máquina de
  fábrica — solo al tocar el contador en Propiedades.
- **Esticción solo en REPOSO**: el aparcado anti-deriva de los sistemas
  de poleas se desactiva mientras la mano arrastra — un contrapeso pesado
  necesita varios pasos para acelerar desde cero y el muro de la
  esticción lo dejaba clavado; ahora el jalón bajo eleva el portadiscos
  cargado (38 kg) con la ventaja 2:1 real del carro móvil.

### Cambiado

- **Fábrica RACK_TORRE sincronizada con el prefab v0.2.9 del diseñador**:
  roldanas del carro dinámicas, puente del carro con su masa real
  (0,2 kg) y portadiscos con 3 DISCOS montados de contrapeso (~38 kg
  efectivos) — la máquina estándar sale de fábrica con el sistema de
  poleas cargado y funcional.

## [0.2.10] — 2026-07-26

El jalón bajo del TTP funciona como la máquina real: la barra se mueve con
libertad total de vectores y su tirón se transmite completo al carrier.

### Corregido

- **La barra de jalón bajo ya no queda clavada en horizontal**: la
  detección de guías tubulares confundía la barra colgante (a 2 cm del
  travesaño del piso) con un carro guiado y la circunscribía a una recta
  horizontal. Ahora una pieza solo se considera guiada si el tubo la
  ATRAVIESA a lo largo (abrazo interior ≥ 5 cm, como los manguitos del
  carrier) — la barra recupera la libertad de vectores del jalón alto.
- **Transmisión COMPLETA del jalón bajo al carrier**: el extremo más
  liviano del cable (el remo) absorbía el recorrido al tirar de la barra
  baja y el portadiscos apenas se movía. Nuevos TOPES DE TERMINAL: el
  primer y último segmento del cable no pueden acortarse por debajo del
  tope del accesorio contra su roldana vecina (~10 cm), y el extremo que
  llega a su tope queda PARQUEADO contra la polea (como la barra real
  descansando en el tope de goma) hasta que la mano lo agarre — todo el
  recorrido restante va al contrapeso.

## [0.2.9] — 2026-07-25

El sistema de poleas cobra vida: las roldanas se empotran en su estructura
y el puente del carro del TTP sube y baja según la tensión de los cables.

### Añadido

- **Roldanas EMPOTRADAS en su estructura**: una roldana adosada a una pieza
  forma ahora un cuerpo rígido COMPUESTO con ella en la simulación. Si la
  estructura es móvil, la roldana viaja con ella y la tensión del cable que
  la recorre actúa directamente sobre la estructura; si es fija, la roldana
  queda anclada (no cae al vacío). Vale para carros de polea, brazos
  móviles con roldanas y cualquier pieza portante.
- **El puente del carro del TTP es MÓVIL**: el rack con torre de fábrica
  incorpora la barra de jalón bajo y sus DOS CABLES reales (jalón bajo →
  polea baja → carro → placa · portadiscos → torre → carro → poleas altas →
  remo). El puente con sus dos roldanas sube y baja según la tensión: tirar
  del jalón bajo lo desciende, tirar del remo alto lo eleva y moviliza el
  contrapeso — verificado con el motor físico.
- **Estabilidad de cables**: recuperación de longitud por VELOCIDAD
  (Baumgarte) con proyección de posición solo como red de emergencia,
  fricción de polea (amortiguación) y esticción posicional — los sistemas
  de poleas quedan QUIETOS en reposo (antes el contrapeso "reptaba" solo) y
  el cable se mantiene azul durante la simulación (la validación roja es
  una herramienta de diseño).

## [0.2.8] — 2026-07-25

Las paredes del área de trabajo se vuelven CARAS reales del suelo al techo,
el techo pasa a ser una cara plana, los cables se ven en azul oscuro y el
Instructivo ilustrado queda con imágenes fieles a cada pestaña.

### Cambiado

- **Techo como CARA PLANA**: la techumbre del canvas completo deja de ser
  un prisma con espesor y pasa a ser una única cara plana (con su
  pendiente A/B) — geometría más simple y uniforme con las paredes, que
  hacen contacto exacto con ella.
- **Cables en AZUL OSCURO**: los cables de los sistemas de poleas y
  roldanas se dibujan en azul oscuro para destacar sobre el fondo claro
  del visor (antes, gris claro casi invisible); el estado de ERROR sigue
  siendo rojo.

### Corregido

- **Los prefabs preservan sus CABLES**: el ciclo de prefabs ignoraba los
  cables configurados en el modelo — un sistema de poleas exportado volvía
  sin su cable y perdía la función móvil. Ahora el .prefab.json lleva un
  bloque `cables` (recorrido nodo a nodo por índice de pieza + anclaje
  LOCAL) que se exporta con la selección, se valida/remapea al importar y
  se reconstruye al insertar — también en las máquinas sustituidas por
  prefab. Los anclajes locales garantizan el mismo recorrido en cualquier
  posición de inserción.
- **El panel de Posturas ya no obstruye las pestañas laterales**: la
  ventana flotante del maniquí se dibujaba encima de las pestañas
  Propiedades/Conexiones/Arrastre preciso; ahora se abre a la derecha de
  la tira, sin solapamiento de ventanas.
- **Paredes del canvas completo como CARAS suelo-techo**: cada pared es
  ahora una cara plana que hace contacto entre la superficie del suelo y el
  techo — bajo una techumbre INCLINADA, su tope sigue la pendiente (prisma
  trapezoidal con la altura del techo en cada extremo del borde), sin
  espacios vacíos en la base ni en la porción superior. Antes eran cajas de
  tope plano a la altura mínima del techo: quedaba un triángulo abierto en
  el lado alto.
- **Altura de paredes SIN techumbre definida por el usuario**: el asistente
  de Nuevo proyecto muestra el campo "Altura de las paredes (m)" cuando la
  techumbre está desactivada — las paredes quedan circunscritas a esa
  altura (antes, 2,5 m fijos).
- **Imágenes del FAQ re-escenificadas**: las capturas de las pestañas de
  calce, pesos, física y simulación no representaban bien su texto (tomas
  lejanas o escenas de prueba abarrotadas) — se sustituyen por escenas
  limpias y encuadradas: ganchos calzados de cerca (montante y poste
  trazado), bloque y pila ensartados en sus guías, discos montados en
  carrier/barra/cuerno, validación de cables y simulación con el bloque en
  sus topes. En esta ronda se re-escenifican además espacio (techo plano
  inclinado con paredes al ras) y física (cable azul por roldana y cable
  en error), y los textos de esas pestañas describen las propiedades
  nuevas.
- **construir-1 y maniqui-1 del FAQ re-capturadas del build actual**: la
  imagen de construir reciclaba una captura del 21-jul con el rack TTP en
  su ensamblaje ANTERIOR a las correcciones del prefab de fábrica (torre,
  multiagarre, techo del rack), y la del maniquí mostraba las paredes y el
  techo del espacio en vez de la figura. Ahora: rack con torre insertado
  tal como lo produce la app hoy, y maniquí en pie con el panel de
  Posturas abierto.

## [0.2.7] — 2026-07-24

La actualización del APK sobre una versión instalada vuelve a funcionar —
y de aquí en adelante funcionará SIEMPRE.

### Corregido

- **Firma CONSISTENTE del APK**: cada build de CI firmaba con un keystore
  de debug generado al vuelo en el runner, así que cada release traía una
  FIRMA DISTINTA y Android rechazaba actualizar sobre la versión instalada
  ("error al instalar/actualizar"). Ahora el proyecto firma todos sus
  builds (debug y release, local y CI) con un keystore PROPIO que viaja en
  el repositorio: las actualizaciones futuras instalan directo, sin
  desinstalar.
- **Nota de transición (una sola vez)**: la versión que ya tengas instalada
  quedó firmada con una llave vieja, así que ESTA actualización aún pide
  desinstalar la anterior. Antes de hacerlo, guarda lo que quieras
  conservar (Guardar proyecto y Exportar ZIP de la biblioteca — el
  desinstalado borra los datos locales de la app). Desde la v0.2.7 en
  adelante, nunca más.

## [0.2.6] — 2026-07-24

El motor reconoce por geometría el sistema de polea tubular guiada del TTP
(taxonomía de 5 piezas del diseñador) — validado en tablet: el carrier corre
por sus guías y se detiene sobre los stoppers, sin uniones manuales. Además,
guardar y abrir archivos pasa a usar el GESTOR NATIVO del dispositivo.

### Añadido

- **Archivos con el gestor NATIVO del dispositivo, eligiendo el destino**:
  todos los flujos de exportar (proyectos, prefabs, GLB/OBJ/STL, ZIP de la
  biblioteca, capturas) y de importar (proyectos, modelos 3D, prefabs, ZIP)
  pasan por un sistema unificado.
  - **Android (APK)**: plugin nativo propio sobre el Storage Access
    Framework — al guardar se abre el "Guardar como…" de la app Archivos
    (se navega y elige carpeta y nombre: Descargas, SD, Drive…) y al abrir,
    el selector de documentos del sistema con búsqueda en cualquier
    ubicación. El flujo clásico (Documentos/EXERSUITE3D o compartir) queda
    solo como respaldo de binarios antiguos.
  - **Web y Windows**: diálogos nativos del sistema operativo (File System
    Access API) con caída automática al ancla/`<input>` clásicos si el
    navegador no la trae.

### Corregido

- **Botones completos en las ventanas del asistente**: las cartas y botones
  de «Nuevo proyecto» y del diálogo de la roldana iban a ras del borde del
  panel y se veían recortados — ahora todo el contenido tiene margen
  interior respecto de la ventana que lo contiene.
- **El sonido de los botones es un "click" de ratón analógico**: chasquido
  seco de microinterruptor (ráfaga de ruido filtrado) más el golpecito grave
  del plástico, en lugar del pitido electrónico anterior.
- **Sistema de polea tubular guiada reconocido por el MOTOR (5 piezas)**:
  al construir el mundo físico, el motor clasifica el sistema según la
  taxonomía del diseñador — el CARRIER (soporta discos a cada lado y abraza
  con sus cilindros huecos), las 2 GUÍAS TUBULARES (los tubos verticales
  largos: la pieza más larga de cada familia coaxial) y los 2 ESPACIADORES/
  STOPPERS (los tubos huecos cortos asentados al pie de cada guía). El
  movimiento del carrier queda CIRCUNSCRITO al eje de las guías (clamp
  cinemático duro tras el solver y tras la corrección del cable: sin deriva
  lateral ni vuelco) y los stoppers LIMITAN su caída — se detiene sobre
  ellos sin llegar a la platina inferior. Independiente del prefab, sin
  uniones manuales. Verificado: caída libre detenida en el stop (67→66,4)
  y, con el cable del lat pulldown, deriva lateral 0 durante 6 s.

- **Interacciones de máquina real en el simulador**:
  - **Calce AGUJERO POR AGUJERO con ENSAMBLE real**: los ganchos J y los
    brazos de seguridad suben y bajan por su poste siguiendo la grilla de
    PINHOLES ESTANDARIZADOS del montante — los orificios pasantes por ambas
    caras, con paso y fase MEDIDOS en la malla real (5,0 cm en el TTP,
    5,5 cm en el POWERRACK, 5 cm en el rack 3×3) —, con ajuste automático a
    la grilla, tope en los extremos y botones ▲/▼ en el panel de
    Propiedades. Al calzar, la pieza GIRA alrededor del poste hasta encarar
    el eje de los pinholes (nunca los agujeros accesorios de otras caras).
    Vale IGUAL para los postes de biblioteca que para los TRAZADOS con la
    herramienta lineal: sus pinholes configurables (diámetro y paso del
    diálogo de trazado) definen la grilla — la pieza calza fila a fila y se
    detiene en la última fila de pinholes, no en el extremo del perfil. Al calzar, el
    MANGUITO de la pieza (su espacio diseñado para el ensamble, como los
    orificios de los bloques con las guías) ABRAZA el pilar: el accesorio
    queda colocado EN la estructura, nunca flotando en el aire — el punto
    de ensamble está calibrado por pieza y, en mallas sustituidas, se
    detecta la cavidad en la propia geometría.
  - **Pin del selector del stack**: botones que mueven el pin placa a placa
    — el cable toma SOLO las placas seleccionadas (masa efectiva y carriage
    ya respondían a la selección; ahora el pin se maneja como en la máquina).
  - **DISCOS MONTADOS**: el portadiscos (carrier), las barras olímpicas, los
    cuernos de carga y los atriles aceptan una cantidad de discos que se
    ensamblan introduciendo el cilindro por el orificio central del disco —
    quedan suspendidos por la estructura, se mueven con ella en la
    simulación y suman su masa (20 kg por disco olímpico, 10 kg en el
    carrier). La cantidad se recorta a lo que cabe en el largo de la pieza
    y persiste en proyectos y prefabs.
- **BRAZOS MÓVILES articulados (jammer arms)**: cualquier estructura tubular
  o tipo pilar (de biblioteca o trazada) puede convertirse en BRAZO/PÉNDULO
  accesorio, anclado INDIRECTAMENTE al pilar de la máquina a través del
  «Anclaje de cadena» (que calza en los pinholes y hace de PIVOTE). En
  Propiedades, la sección "Brazo móvil (péndulo)" traza la articulación
  desde el extremo del brazo más cercano al anclaje: la pieza pasa a ser
  móvil y gira alrededor del eje del pin del anclaje. El brazo puede portar
  roldanas (soldador), piolas/cables, cuernos de carga o cualquier otro
  mecanismo para expandir la máquina — verificado: un brazo horizontal
  pendulea 90° hasta colgar del pin, como los jammer arms reales.
- **Bloque de peso y pila de pesos GUIADOS por tubos verticales** (como el
  carrier del TTP): ambos llevan ahora DOS ORIFICIOS cilíndricos pasantes
  (separación de fábrica 13,3 cm — la de los tubos guía del TTP, editable
  por parámetros) que describen el espacio justo para deslizarse por las
  guías. Cada placa de la pila va perforada y sus varillas pasan POR los
  orificios. En el motor, un cuerpo guiado ya NO ROZA con sus guías ni
  stoppers (el tubo corre por dentro del orificio): el clamp cinemático y
  los stops gobiernan el movimiento — verificado: el bloque y la pila caen
  circunscritos (deriva 0) y se detienen exactamente al final de la guía.

### Cambiado

- **El APK viaja como `EXERSUITE3D.APK`** dentro del artefacto de CI y de la
  Release: sin renombrados manuales antes de alojarlo en HuggingFace.

## [0.2.5] — 2026-07-23

Física del sistema de poleas del TTP: el prefab ideal del diseñador queda de
fábrica VERBATIM y la simulación con cable y polea se vuelve estable — el
portadiscos corre circunscrito a los tubos de guía y el remo ya no se acuña.

### Añadido

- **UNIONES en los prefabs**: el formato v2 ahora transporta correderas y
  bisagras entre piezas (tipo, pieza fija/móvil, eje, límites, ancla) — se
  exportan con la selección, se validan y remapean al importar, y se crean
  automáticamente al armar la máquina o insertar el prefab.
- **Rack con torre según el prefab v2 ideal del diseñador** (VERBATIM, sin
  transcripción) + **corredera de fábrica del portadiscos**: el carrier
  queda CIRCUNSCRITO a los tubos de guía (corredera vertical con límites)
  — ya no se columpia fuera de la torre durante la simulación con cable.

### Corregido

- **El remo de lat pulldown ya no se acuña en el pilar del bastidor**: los
  cuerpos dinámicos simulan con CCD (las piezas delgadas y rápidas no
  atraviesan la estructura entre pasos del solver) y una amortiguación
  angular suave que frena el bamboleo sin alterar la caída libre.

## [0.2.4] — 2026-07-23

La release de la FIDELIDAD: el ciclo de corrección de prefabs se vuelve
robusto (formato v2 con atributos exhaustivos, validación al importar y
máquinas sustituibles por prefab directamente en la app), la biblioteca de
elementos pasa por su auditoría definitiva ítem por ítem con el diseñador
(identidades, mallas y orientaciones corregidas), y el Rack con torre queda
reconstruido fiel al CAD desde el prefab corregido, con el WEIGHTCARRIER
oficial como portadiscos.

### Añadido

- **Ciclo ROBUSTO de prefabs (formato v2)**: cada pieza exporta sus
  atributos exhaustivos — componente, nombre, dimensiones completas,
  material, posición, CUATERNIÓN exacto (sin ambigüedad de Euler), anclaje,
  masa, escala y unas dimensiones de CONTROL. Al importar, la app valida
  contra la biblioteca actual: los componentes desconocidos se excluyen con
  aviso y las piezas cuyas medidas ya no coinciden se reportan — la
  reconstrucción verificada es EXACTA (error cero en posición, rotación y
  dimensiones en la ida y vuelta de las 35 piezas del rack).
- **Máquinas estándar sustituibles por prefab EN la app**: en la Biblioteca
  (pestaña Máquinas), «Exportar prefab (.json)» descarga la definición de
  fábrica por piezas, y «Sustituir por prefab (.json)…» hace que el archivo
  corregido pase a ser LA definición de esa máquina — persistente en el
  navegador, usada por la paleta, el preview y las exportaciones OBJ/STL,
  sin transcripción manual de por medio. «Quitar prefab del usuario»
  devuelve la de fábrica.

### Corregido

- **Auditoría definitiva de la biblioteca — pasada 2 (ítem por ítem con el
  diseñador)**: identidades corregidas — barra-pr ↔ travesano-pr (la barra
  de pullups real es la pieza de 106 con placas; el travesaño es la de 70);
  jota-pr re-rotulada como ANCLAJE DE CADENA (no es una jota);
  brazo-seguridad adopta el modelo correcto (brazo en L con gancho de
  9×24×106) y se ELIMINAN riel-discos-ttp y brazo-ttp (redundantes).
  Orientaciones de inserción naturales: barra de dominadas y barra de
  fondos nacen HORIZONTALES, el disco de peso nace VERTICAL (de pie como
  rueda), la correa de seguridad gira 90° sobre su eje largo, la jota con
  rodillo queda orientada como el gancho J, y el portadiscos (WEIGHTCARRIER
  oficial) se hornea HORIZONTAL — pin de 88 a lo largo, con el collarín
  hacia la torre, cruzando el hueco entre los tubos de guía del rack. La
  jaula POWERRACK y el Rack con torre se recolocan con las identidades
  correctas.
- **Auditoría de la biblioteca — pasada 1**: las mallas del
  BASTIDOR SUPERIOR y del MULTIAGARRE TTP estaban INTERCAMBIADAS desde el
  despiece original — el bastidor real es la viga con T (92×32×15, T que
  corona la torre, gancho de polea y pestañas) y el multiagarre real es el
  abanico ARQUEADO de 106,5 con placas en ambos extremos. Mallas, medidas,
  descripciones y el techo del Rack con torre corregidos: el arco cruza el
  frente casi de pilar a pilar sobre el travesaño frontal y la viga con T
  puentea el marco con la torre (la T corona los tubos con su polea).

### Cambiado

- **Rack con torre (TTP) según el prefab CORREGIDO del diseñador**
  (rackcontorre.prefab.json, editado en la app y reincorporado como modelo
  de fábrica): los 4 pilares girados 90° para el calce, travesaño frontal
  reubicado a la línea de los pilares traseros, BASTIDOR SUPERIOR real en
  lugar del travesaño superior y el puente medio, PLETINA TTP en lugar de
  la placa estabilizadora, manguitos de guía al pie de los tubos, sin
  brazos de seguridad ni discos precargados, y el PORTADISCOS ahora es
  pieza MÓVIL montada en los tubos de guía (34 piezas en total).
- **Orientaciones corregidas contra el CAD** (2.ª ronda): los laterales
  inferiores van girados a −90° — la placa de encuadre calza en los
  pilares traseros y la curva con el pie queda al frente — y el BASTIDOR
  del sistema de polea alta corre a lo largo, puenteando el marco con la
  torre: su ménsula trasera queda sobre la polea de torre y las poleas
  altas cuelgan bajo su vano.
- **Portadiscos con la pieza REAL** (WEIGHTCARRIER_1.stl oficial): la malla
  del portadiscos es ahora la barra deslizante vertical auténtica del
  TTP001L — 88 cm de alto, sección 6×8, con collarín a media altura — que
  soporta los discos y corre guiada por los rieles del sistema de poleas
  (sigue siendo pieza móvil en el rack).
- **Techo del rack según el CAD** (3.ª y 4.ª ronda): el TRAVESAÑO FRONTAL
  vuelve al FRENTE del techo (tras los pilares frontales) y el MULTIAGARRE
  cruza A LO ANCHO montado sobre él — placas apoyadas en la cara superior
  de la viga, abanico arqueándose hacia arriba con leve voladizo por
  delante y agarres del centro colgando. Se repone el TRAVESAÑO SUPERIOR
  (104) cerrando el techo por atrás, donde descansa la placa media del
  bastidor (35 piezas).

## [0.2.3] — 2026-07-22

Release de estética, usabilidad e interacción del motor de diseño, previa a
la incorporación de los prefabs corregidos: Home con Instructivo-FAQ y pie de
soporte, ventanas colapsables ocultas por defecto, zoom de continuo, Arrastre
preciso, y los dos esquemas del diseñador incorporados — trazado de cable con
aim assist y contacto tangente real del groove, y deformación por nodos con
soldadura nodo-nodo entre figuras.

### Añadido

- **Instructivo primero y en formato FAQ**: el INSTRUCTIVO es ahora la
  primera vista de la Home (y la que se abre por defecto), reorganizado como
  preguntas frecuentes desplegables. Cada respuesta admite CAPTURAS
  demostrativas (imágenes en public/instructivo/) que se mostrarán bajo el
  texto cuando existan.
- **Barra de ZOOM de continuo**: selector horizontal discreto y sencillo en
  la esquina inferior izquierda del visor — un deslizador entre − y + que
  recorre todo el rango de la cámara (además del gesto de pellizco/rueda).
- **Asistencia de puntería del CABLE**: al trazar un cable las roldanas se
  RESALTAN como puntos de recorrido y un imán captura el toque cercano
  aunque el dedo no caiga exactamente sobre ellas; el ancla se coloca en el
  punto real de contacto del GROOVE (la garganta de la rueda) orientado
  hacia el tramo entrante.
- **SOLDADOR de nodos**: en modo Doblar, el nodo arrastrado se imanta a los
  puntos de conexión de OTRAS figuras (extremos, nodos, puntos medios y
  esquinas de las cajas) con indicador visual — permite unir estructuras
  nodo con nodo, como si fuese un soldador. Botón «+ Nodo» en Propiedades
  para añadir un nodo a la trayectoria (subdivide el tramo más largo), en
  piezas poligonales (pilares/travesaños) y tubulares.
- **Soldadura REAL nodo-nodo** (esquema Deformación por nodos): al soltar el
  nodo imantado sobre otra figura se crea una unión rígida persistente
  («Soldadura», un joint bloqueado en Conexiones, sin duplicados) — las
  piezas quedan soldadas también en la simulación física, y la unión puede
  desbloquearse o borrarse.
- **Nodo ACTIVO + deformación multi-eje**: el último nodo tocado queda
  resaltado y los cursores del Arrastre preciso (y las flechas del teclado)
  lo mueven eje por eje — deformaciones en varios ejes dentro de un mismo
  ítem, con el imán del soldador también en los pasos precisos. «+ Nodo»
  deja el nodo nuevo activo al instante.
- **Contacto tangente real del groove** (esquema Cables III): el nodo de
  cada roldana intermedia se ancla en el punto de CONTACTO físico del
  cable — la tangente donde el radio queda a 90° del cable, calculada con
  los tramos entrante y saliente (el cable pasa por encima de una roldana
  con ambos vecinos abajo, o por debajo si cuelga de ella). El contacto se
  recalcula al mover las piezas, y funciona igual con roldanas externas e
  internas (todas reconocidas como objeto de recorrido).
- **Sonido de click**: todos los botones de la interfaz emiten un tic corto
  y discreto (WebAudio, sin archivos de audio).
- **Pie de página de la Home**: versión instalada de la app, crédito
  «Brought to you by A. Maturana Steinbrugge» y canal de soporte técnico
  (amaturanas@uft.edu).
- **ARRASTRE PRECISO** (menú Selección): ventana flotante con cursores en
  pantalla para movilizar la selección con exactitud — ◀ ▶ mueven a los
  lados y ▲ ▼ suben/bajan o, con el SWITCH de ejes, van adelante/atrás.
  También responden las flechas del teclado (la tecla C cambia el eje y
  Shift da pasos de 10 cm); el HUD muestra el desplazamiento en cm.
- **Pestañas laterales verticales**: las ventanas de Propiedades, Conexiones
  y Arrastre preciso se muestran ON DEMAND desde una tira de etiquetas
  verticales en el costado izquierdo del visor — un click abre la ventana y
  otro click en la pestaña la vuelve a esconder. Disponibles en ambos modos
  de trabajo y OCULTAS por defecto al entrar al editor (más espacio de
  visor desde el primer momento).

### Cambiado

- **Modo Sencillo acotado a lo rudimentario** (lo que lo distingue del modo
  Profesional): paleta con solo las máquinas estándar, las primitivas y unas
  pocas piezas básicas, y sin bloqueo de Ejes (las ventanas de Propiedades y
  Conexiones siguen disponibles desde sus pestañas).

### Corregido

- **Caras transparentes por un lado y sólidas por el otro**: los modelos de
  la biblioteca con normales invertidas se renderizan ahora a DOBLE CARA en
  todos los materiales — el bug desaparece en toda la app.
- **Márgenes y botones cortados**: los textos de paneles y ventanas parten
  palabra cuando no caben y las filas de botones (Voltear X/Y/Z, acciones de
  la Biblioteca, diálogos) envuelven a la línea siguiente en lugar de
  cortarse.
- **La píldora de medidas ya no queda debajo de la barra de zoom**: ahora
  comparte la fila inferior arrancando a la derecha de la barra, siempre
  legible.
- **El imán del cable ya no "roba" el clic de cierre**: si se toca una pieza
  real y la roldana imantada ya es el nodo anterior, gana la pieza tocada —
  el cable se cierra con normalidad aunque haya una roldana pegada.
- **Radio de captura del imán adaptativo al zoom**: escala con la distancia
  de la cámara (~3 %), para que apuntar a una roldana se sienta igual de
  fácil de cerca que de lejos.
- **Siluetas en TODOS los emojis**: también en los botones flotantes de
  pantallas pequeñas (piezas, propiedades, posturas) y en el botón 📷
  Captura después de usarlo.
- **Barra superior compacta en pantallas estrechas** (≤680 px): botones y
  huecos aprietan para que el indicador «Guardado ✓» quede a la vista sin
  desplazar.

## [0.2.2] — 2026-07-22

Los despieces reales del diseñador (TTP001L y POWERRACK) pasan a ser el
corazón de la biblioteca: cada pieza con su malla oficial, las máquinas
estándar reconstruidas fieles a los modelos armados, y el flujo completo de
exportar/corregir/sustituir prefabs.

### Añadido

- **Conocimiento de estructuras reales en el motor** (despieces STL TTP001L
  y POWERRACK, analizados por componentes conexos): dos máquinas estándar
  nuevas — **Rack con torre (TTP)** y **Árbol de discos** — construidas con
  las piezas reales y sus posiciones medidas en los modelos armados.
- **TTP001L reconocido pieza a pieza** (11 clases): 4 pilares verticales con
  agujeros de calce, 2 columnas horizontales inferiores (141, con placas de
  encuadre) y 2 superiores (94), travesaño superior e inferior (104), 2
  tubos de guía del sistema de poleas (4×4×214), 2 brazos de seguridad
  perforados con collar, 4 jotas, el set de roldanas completo (doble polea
  alta, polea de torre, carro de dos poleas con su puente, polea baja con
  soporte y placa), el remo tubular de polea alta y la barra de pullups
  multigrip — todas también como componentes sueltos de la paleta.
- **Biblioteca con los archivos OFICIALES por pieza** aportados por el
  diseñador (TTP001L1…19, POWERRACKP1…P10, WEIGHTCARRIER, CHAIN): cada
  componente usa la malla auténtica de su archivo; la ROLDANA real (rueda
  de 7,2) es el visual de todas las roldanas de la app.
- **Jaula de potencia = POWERRACK pieza a pieza** (118×220×122, posiciones
  medidas del armado): postes de DOS tramos perforados apilados (110+110),
  travesaños laterales superiores, largueros de base, doble barra de
  pullups (70), jotas de calce con y sin rodillo, pipes de seguridad con
  collares y rieles de base de 118.
- **Portadiscos del sistema de poleas** (WEIGHTCARRIER +
  WEIGHTCARRIERANDRAIL): componente móvil real montado como en el modelo de
  interacción — sobre los tubos de guía mediante los manguitos, placa
  vertical de 55×55 al extremo y pin HORIZONTAL de 88 cruzando el hueco
  entre tubos; los discos de fierro se cargan en el tramo libre (el Rack
  con torre trae dos de muestra) y el cable del sistema lo eleva.
- **Cadena lineal según el modelo CHAIN**: el eslabón oficial es la
  plantilla y la interacción es exacta — cada eslabón mide 1,5 pasos
  (largo/paso = 60,5/40,3 medido) y alterna 90° sobre el eje, atravesando
  al anterior y al siguiente; cada anclaje instala su herraje (argolla con
  espárrago) del que se enhebra el primer eslabón.
- **Máquinas estándar exportables y sustituibles** (pestaña Máquinas de la
  Biblioteca): cada prefab del modo Sencillo se EXPORTA como STL u OBJ (el
  ensamblaje completo) para editarlo fuera y se SUSTITUYE por el modelo
  corregido (.stl/.obj/.glb/.gltf); la máquina sustituida se inserta como
  una sola pieza anclada, persiste en el proyecto, viaja en el ZIP de la
  biblioteca y puede venir de fábrica vía manifest (claves maquina:<id>).
- **Emojis como SILUETA monocroma en toda la interfaz**: los pictogramas se
  muestran como figura (solo la silueta, al tono de la interfaz) en Home,
  asistente, menús, paleta, paneles, Biblioteca, Instructivo y diálogos —
  estética consistente entre ventanas y plataformas.
- **Prefabs ESTRUCTURADOS (.prefab.json)**: edita una máquina estándar con
  las herramientas nativas y usa Archivo → "Exportar prefab de la selección"
  para descargarla como archivo que reconoce cada parte y su FUNCIÓN
  (componente de biblioteca, nombre, medidas, material, pose y anclaje);
  "Insertar prefab" la reconstruye pieza a pieza como grupo. Es el formato
  de intercambio para corregir prefabs e incorporarlos a la biblioteca en
  releases futuras.

### Corregido

- **El gancho J tipo calce ABRAZA el montante**: manguito alrededor del
  perfil 5×7 con el centro a 9,6 cm del eje del pilar (medido en el
  armado), pin al agujero; el rack y la jaula usan montantes reales con
  agujeros en lugar de pilares lisos.
- **Bases arriostradas**: rack y jaula ganan rieles de base reales con
  placas de encuadre uniendo los marcos al suelo (antes solo la barra de
  pullups los conectaba y la estructura colapsaría al cargar las J).
- **Brazos de seguridad con collares** que abrazan los pilares a la altura
  de anclaje, sobre el eje de los montantes.
- **Eslabones de cadena con interlocking real** (antes los últimos
  eslabones no se entrelazaban y los anclajes no tenían sitio de colgado).

## [0.2.1] — 2026-07-21

### Añadido

- **Interfaz bilingüe Español/English**: selector de idioma en SETTINGS
  (persiste en el dispositivo). Toda la interfaz — Home, asistente, menús,
  paneles, paleta, HUD, Instructivo y diálogos — se muestra en el idioma
  elegido; pensado para presentar el proyecto a una audiencia más amplia.
- **Descarga directa en Android**: al guardar proyectos, exportar la
  biblioteca (ZIP), GLB o capturas, la app ofrece descargar DIRECTAMENTE a
  Documentos/EXERSUITE3D (visible en la app Archivos) además de la hoja de
  compartir (Drive, enviar…), que queda como alternativa y como respaldo.
- **"Nuestra historia"** en la Home (sustituye la dedicatoria): el relato del
  origen del proyecto — del niño que construía con bloques digitales porque
  los juguetes no llegaban a su país, al profesional de la salud que ve a su
  gente perder movimiento por falta de espacio, tiempo y presupuesto — y la
  visión: involucrar al usuario final, el hub/marketplace y el sueño del
  diseñador pionero. En ES y EN; se muestra el idioma activo de la interfaz.
- **Roldanas configurables antes del cable** (diagrama Cables y Poleas): el
  botón Roldana de la paleta pregunta la configuración — **interna**
  (embutida en el eje del pilar/travesaño; la rueda asoma por la apertura) o
  **externa** (montada fuera de la cara) — y se coloca tocando la cara de la
  pieza, orientada según su eje largo y anclada. Así se definen PRIMERO los
  puntos de deslizamiento y luego el + Cable se traza punto a punto por
  ellas (ancla A → roldanas → ancla B).
- **Caída de la catenaria en cadenas/correas** (diagrama Simulación
  Cadenas): al fijar el anclaje final se pregunta la caída en cm con la que
  cuelga la cadena (sugerencia automática según la distancia); los anclajes
  admiten cualquier cara de una pieza, pared o techumbre.

### Corregido

- **Deshacer/Rehacer no respondía de forma encadenada**: al aplicar un paso
  de historial se re-apilaba una instantánea espuria (los ids internos
  cambian al recargar la escena) que truncaba la rama de rehacer y absorbía
  los deshacer siguientes. Ctrl+Z/Ctrl+Y y los ítems del menú Edición ya
  avanzan y retroceden paso a paso.
- **El asistente de Nuevo no cabía en pantallas bajas**: el panel limita su
  altura y el contenido (incluido el paso Dibujar planta) se desplaza con
  scroll; el botón Crear proyecto siempre queda alcanzable.
- **El área de trabajo personalizada ahora LUCE como la estándar**: el suelo
  del canvas completo es el mismo plano gris neutro con rejilla (celda de
  10 cm, mayores cada 1 m) y el logotipo como marca de agua, recortado
  exactamente a la planta definida (rectángulo o dibujada); fuera de ella no
  hay suelo. Se retiró el relleno turquesa; queda solo el contorno fino.

## [0.2.0] — 2026-07-20

Rediseño mayor de la interfaz y del flujo de trabajo (esquemas del usuario),
en la app web/APK/Windows. El kit Godot mantiene la paridad v0.1.9; el
rediseño v0.2.0 se portará en una iteración posterior.

### Añadido

- **Home maestro-detalle**: navegación Builder · Simulador · Instructivo ·
  Settings con panel de contenido y leyenda contextual; galería de capturas
  del Simulador y ajustes de rendimiento integrados en la Home.
- **Asistente de proyecto nuevo**: modo de trabajo **Sencillo** (piezas
  básicas y máquinas estándar, para plantear la distribución de una sala) o
  **Profesional** (todas las herramientas), y espacio de trabajo **Libre**
  (suelo infinito) o **Completo**.
- **Canvas Completo — definir área de trabajo**: el suelo se define como
  rectángulo con medidas o **dibujando su planta en metros** (lienzo con
  rejilla, imán a 0,5 m y cota por segmento; admite salas en L o
  irregulares). **Techumbre** opcional como capa oscura copia FIEL de la
  planta, con alturas A/B y pendiente (slope en ° y % calculado en vivo), y
  **paredes N/S/E/O** generadas borde a borde del contorno. Techo y paredes
  son piezas ancladas reales: admiten bisagras, cables y cuerdas y
  participan en la simulación.
- **Límites del espacio editable**: lo que sobresale de la planta, del suelo
  o del plano inclinado del techo se tiñe de rojo, el HUD cuenta las piezas
  fuera y la colocación se cancela al soltar el arrastre.
- **Barra con menús agrupados**: Archivo · Edición · Selección · **Ver**
  (grid, aristas de las piezas, modo de color materiales/por
  categoría/neutro y perspectivas Frontal/Lateral/Superior/Isométrica) ·
  Ejes (bloqueo X/Y/Z con distintivo). Barra compacta ideal para tablet.
- **Ergonomía del maniquí**: **candado por articulación** (las bloqueadas no
  se posan; persistido en el proyecto), **Simetría L↔R** (cada cambio se
  replica espejado) y **✋ Agarrar maniquí** (arrastra un segmento del cuerpo
  y rota la articulación libre más cercana; 1/2/3 restringe a un eje;
  agarrar la pelvis mueve la figura).
- **Máquinas estándar** en la paleta: rack de sentadillas (142×199×120 cm),
  jaula de potencia, banco plano y torre de polea alta/baja — prefabricados
  con componentes reales, agrupados y con medidas comerciales.
- **Arrastrar y soltar desde la paleta**: las piezas (y máquinas) se sueltan
  en el punto del suelo elegido; en táctil, mantener pulsado ~0,3 s.
- **Paneles plegables**: tocar el título de cualquier panel lo colapsa a su
  cabecera.
- **Modelos CAD integrados**: barra olímpica (2,20 m) y disco de 45 lb con
  malla real y colisionador primitivo a dimensiones reales.

### Corregido

- **Biblioteca del maniquí**: cada segmento muestra ahora su primitiva real
  (cabeza=esfera, torso=caja, muslo=cilindro…) en lugar del mismo cilindro
  para todos, compartiendo la geometría con el rig para que la sustitución
  por modelos mapee correctamente.

## [0.1.9] — 2026-07-17

### Corregido

- **Biblioteca: "Sustituir por modelo…" no dejaba elegir archivos en
  Android**: el selector del sistema filtra por tipo MIME y no conoce el de
  los `.glb`/`.gltf` (los mostraba bloqueados). En la app nativa los
  selectores se abren ahora sin filtro y el tipo se valida por extensión al
  elegir — aplica también a abrir proyectos `.json` e importar modelos.
- **Exportar/Importar ZIP de la biblioteca no funcionaba en el APK**: el
  WebView de Android ignora las descargas por ancla con blobs. Todas las
  descargas de la app (ZIP de biblioteca, guardar proyecto `.json`,
  exportar `.glb`) usan ahora un mecanismo compatible: en Android se escribe
  el archivo y se abre la hoja de compartir del sistema (guardar en
  Archivos, Drive, enviar…); en web y Windows, descarga normal.
- **Godot: los diálogos de archivo usan el selector NATIVO del sistema**
  (`use_native_dialog`): en Android abre el selector con acceso real al
  almacenamiento — sustituir modelos, abrir/guardar proyectos y el ZIP de la
  biblioteca ya acceden a los directorios del dispositivo.

### Añadido

- **Botón "📖 Instructivo" en el inicio**: abre una ventana con la guía de
  uso completa — primeros pasos, construcción, edición de precisión (ejes
  1/2/3, área, copiar/pegar, deshacer), física y conexiones, maniquí,
  simulación, biblioteca y rendimiento.

## [0.1.8] — 2026-07-06

### Añadido

- **Herramienta de selección completa** en el Builder web:
  - **Ctrl+clic** (o Shift+clic) añade/quita piezas de la selección; sobre
    una pieza agrupada, añade/quita el grupo entero.
  - **Selección de área**: botón "Área" en la barra — arrastra un recuadro
    tipo Paint y selecciona todo lo que cae dentro (con Ctrl, añade a lo ya
    seleccionado); los grupos entran como unidad.
  - La multiselección ahora lleva **gizmo propio en el centroide**: mover o
    rotar actúa sobre todo el conjunto en bloque (cuerdas y cables siguen a
    sus anclas).
- **Copiar / pegar / cortar / eliminar la selección**: botones Copiar y
  Pegar en la barra y atajos **Ctrl+C / Ctrl+V / Ctrl+X / Supr**; lo pegado
  aparece con un pequeño desplazamiento y queda seleccionado, listo para
  colocar. Funciona con piezas sueltas, multiselección y grupos (también
  piezas importadas).
- **Deshacer / Rehacer**: botones ↺/↻ en la barra y **Ctrl+Z / Ctrl+Y**
  (o Ctrl+Shift+Z). Historial por instantáneas del proyecto completo
  (piezas, articulaciones, cables, cuerdas, grupos y maniquí), con
  agrupación automática de cambios rápidos (arrastres del gizmo = un solo
  paso) y tope de 60 pasos.
- **Herramienta "Arrastrar"**: agarra cualquier pieza directamente en el
  visor y llévala sin pasar por las asas del gizmo; arrastra igualmente
  multiselecciones y grupos completos (cuerdas y cables siguen).
- **Eje de trabajo bloqueado (1=X, 2=Y, 3=Z; 0 o Esc libera; repetir la
  tecla también)**: restringe TODO el trazado al eje elegido para construir
  con precisión en 3D mirando una pantalla 2D — el gizmo muestra solo el
  asa de ese eje (mover y rotar), la herramienta Arrastrar desliza la pieza
  por la recta del eje, los **nodos de doblado** se mueven solo a lo largo
  del eje y el **trazado de pilares/travesaños/tubos** proyecta el segundo
  punto sobre el eje desde el primero. Botones X/Y/Z en la barra (para
  tablet) y aviso "EJE … BLOQUEADO" en la línea inferior.
- **Contador de desplazamiento en vivo**: durante cualquier arrastre o
  trazado, la línea inferior muestra la medida en centímetros — Δ por eje
  con bloqueo activo, Δ total con desglose X/Y/Z sin él, grados al rotar
  con el gizmo y longitud en vivo al trazar pilares/travesaños/tubos.

### Corregido

- **El eje Y no funcionaba con el bloqueo de eje**: el trazado y el imán
  dependían de que el puntero tocara suelo o superficies — al apuntar hacia
  arriba no había intersección y la herramienta no respondía. Con eje
  bloqueado, ahora el punto se calcula sobre la recta del eje más cercana
  al rayo del puntero (funciona "apuntando al cielo") y el imán de anclaje
  se desactiva para no corregir la posición fuera del eje.

## [0.1.7] — 2026-07-06

### Añadido

- **Kit de migración a Godot 4** (`godot/` + `docs/MIGRACION-GODOT.md`):
  proyecto Godot nativo que **abre los mismos proyectos `.json`** de la app y
  los simula con física nativa — piezas con material/escala, bisagras y
  correderas con límites y motor, **cables inextensibles con poleas 2:1
  emergente**, cuerdas en catenaria, perfiles/tubos por línea (rectos y
  doblados por Catmull-Rom), maniquí a escala con pose, **mano interactiva**,
  cámara orbital táctil con vistas y demo integrada. La biblioteca de datos
  (47 componentes, 20 materiales) se genera automáticamente desde el código
  TypeScript. La guía cubre instalación, uso de los modelos `.glb`,
  exportación a Windows/Android paso a paso y la hoja de ruta con la tabla de
  paridad para completar el editor en Godot.
- **Migración 1:1 definitiva a Godot** (`godot/`): el kit pasa de "núcleo
  funcional" a réplica completa lista para publicar —
  - **Identidad visual**: icono y splash de la marca, tema propio (paleta
    papel/tinta de la web) en toda la interfaz y **pantalla de inicio** con
    logo, Crear/Abrir/**Simulador**/Continuar/Biblioteca/Demo y **proyectos
    recientes**.
  - **Editor completo**: **anillos de rotación libre** en el gizmo,
    **multiselección** (Shift/Ctrl+clic) con arrastre en bloque y **grupos**
    (Agrupar/Desagrupar, interoperables con la web), y **pinholes reales** en
    perfiles (CSG: caja menos cilindros).
  - **Biblioteca de repertorio potenciada**: pantalla propia para **sustituir
    por un `.glb`** el modelo de cada componente **y de cada segmento del
    maniquí** (ajuste automático al hueco de la primitiva, persistencia en
    `user://`, carga en caliente sin reimportar, prioridad usuario →
    empaquetado → primitiva, y primitiva fantasma al seleccionar).
  - **Maniquí potenciado**: segmentos con los ids de la web, overrides de
    modelo por segmento e **IK de manos de dos huesos** que sigue los agarres
    durante la simulación; pose y manos viajan en el `.json` en ambos
    sentidos.
  - **Persistencia**: **autosave** cada 20 s (`user://autosave.json`, botón
    Continuar en el inicio) y **proyectos recientes** nativos.

### Cambiado

- **Resolución dinámica** (web): mientras se orbita, se arrastra sobre el
  lienzo o corre la simulación, el render baja a ×0,7 de la escala elegida y
  vuelve a nítido en reposo — la técnica de las apps nativas de escultura.
  Activa por defecto en los presets Medio y Bajo, con conmutador propio en
  Rendimiento.

- **Rendimiento web, segunda ronda**: la **escala de render** admite ×0.75 y
  ×0.5 (el preset **Bajo** pasa a ×0.75 — la palanca que usan las apps
  nativas de tablet); **sombreado simple** opcional (Lambert sin tone
  mapping ACES, una fracción del coste PBR por píxel, activo en Bajo);
  sombras del preset **Medio** a mapa de 1024 con filtro duro (las suaves
  PCF quedan para Alto, con conmutador propio); y la física se limita a
  **2 sub-pasos por frame** para eliminar la espiral de tirones cuando el
  equipo no llega a 60 fps (cámara ligeramente lenta en vez de saltos).
- **Rendimiento web (app v0.1.6)**: **render bajo demanda** — fuera de la
  simulación solo se repinta con interacción (puntero/teclado/rueda),
  movimiento de cámara o cambios de escena, con latido de seguridad cada
  500 ms; en tablets elimina el trabajo de GPU en reposo (fluidez, batería y
  temperatura). En móvil/tablet el preset de Rendimiento por defecto pasa a
  **"medio"** (DPR 1,25, sin antialias) — el usuario puede subirlo cuando
  quiera desde el panel Rendimiento.
- **Rendimiento Godot**: CI y binarios sobre **Godot 4.4.1** con **Jolt
  Physics** e **interpolación física 3D** (adiós stuttering 60 Hz ↔
  pantalla, solo en cuerpos dinámicos y con reset al restaurar el diseño);
  los **pinholes CSG se hornean** a malla estática tras el primer cálculo
  (coste cero por frame); overrides móviles (sin MSAA, sombra 1024 con
  filtro duro solo en Android); **bajo consumo en el Builder** (solo repinta
  con actividad); IK de manos solo al simular; y **tipografía del sistema**
  (Roboto/Segoe UI, la pila de la web) en toda la interfaz.
- **CI Godot**: nuevo job **"capturas"** que ejecuta la app con renderer por
  software (xvfb + gl_compatibility), fotografía Home/Builder/Biblioteca/
  Simulación y sube los PNG como artifact `capturas-ui` — revisión visual
  sin instalar el APK.
- **Godot: paridad visual y de herramientas 1:1 con la web v0.1.6** —
  - **Home** como el de la web: logotipo grande, selector **Builder /
    Simulador** con sus acciones (Crear nuevo proyecto, Abrir archivo…,
    Explorar biblioteca / Simular archivo…), tarjeta de **PROYECTOS
    RECIENTES** y **DEDICATORIA**.
  - **Barra del Builder** completa: **Simular en verde**, Mover/Rotar
    (filtran las asas del gizmo), **Grid** conmutable, Duplicar, Eliminar,
    Agrupar/Desagrupar, **Figura** con altura del maniquí en cm, vistas,
    zoom, proyecto y "Autoguardado activo".
  - **Paleta** como la web: cabecera con el logotipo, "PIEZAS DISPONIBLES" y
    tarjetas por pieza con **punto de color por categoría** (los
    CATEGORY_COLORS exactos de la web).
  - **Visor claro** como la web: fondo gris claro, **rejilla de 10 cm** con
    líneas mayores cada metro, **ejes X/Y/Z de colores** y rótulo "1 celda =
    10 cm · ejes en cm".
  - **Inspector** en tarjetas **PROPIEDADES** / **CONEXIONES** (bisagra,
    corredera, cable siempre a mano) con los mismos textos de la web.
  - **Biblioteca de modelos** como la web: **vista previa 3D giratoria** del
    ítem (primitiva o .glb sustituido), "Sustituir por modelo…",
    "Restablecer primitiva" y **Exportar/Importar ZIP** de toda la colección.
  - Diálogo **"Cambios sin guardar"** (Guardar y salir / Salir sin guardar /
    Cancelar) al volver al inicio.
  - Splash e iconos con los logotipos correctos (icono como la web: logo
    negro sobre blanco; splash con el logotipo claro sobre fondo oscuro).

### Eliminado

- **Figura de esqueleto**: se retira el modo "Esqueleto" de la figura humana
  (sin relevancia para el proyecto). El selector de tipo de figura
  desaparece de la barra, el modelo `overview-skeleton.glb` (1,25 MB) sale
  del paquete y los proyectos guardados con ese modo se abren con el
  maniquí.

### Corregido

- **Godot: el APK/EXE exportado salía sin la biblioteca de datos**: los
  `.json` no son recursos importados y el filtro de exportación no los
  incluía, por lo que los binarios nativos arrancaban sin componentes ni
  materiales (escena vacía). Ahora `data/*.json` y `extras/*.json` viajan
  dentro del paquete. Además, la interfaz se escala a la densidad real de la
  pantalla (`canvas_items`, diseño base 1280×800) para que botones y paneles
  se vean a tamaño correcto en tablets sin tocar la resolución del render 3D.

## [0.1.6] — 2026-07-04

### Cambiado

- **Ajuste completo de la interfaz a la pantalla del dispositivo**: la barra
  superior ya no se desborda —se limita al ancho visible y se desplaza
  horizontalmente (swipe/rueda) cuando las herramientas no caben—; los paneles
  laterales estrechan su ancho por tramos en pantallas medianas y, en móviles
  y tablets verticales, se convierten en **cajones ocultables** con pestañas
  (🧩 piezas, 🧰 propiedades/conexiones, 🧍 posturas) que dejan el viewport
  libre y mantienen todas las opciones accesibles. Se respetan las **zonas
  seguras** del dispositivo (notch, barras del sistema) en barra, paneles y
  barra de simulación.

## [0.1.5] — 2026-07-03

### Añadido

- **Modo Simulador desde la pantalla de inicio**: un selector **Builder /
  Simulador** permite abrir un proyecto (archivo, reciente o sesión anterior)
  solo para **correr su física**, sin construir ninguna herramienta de edición
  (paleta, inspector, paneles…) — ideal para mostrar un diseño gastando el
  mínimo de recursos. La física arranca sola y la única interfaz es la barra
  de simulación (Inicio, Pausar/Reanudar y las herramientas de abajo).
- **Barra de herramientas de simulación** (también en el Builder, al pulsar
  Simular): set de **perspectivas** (Frontal / Lateral / Superior / Isométrica,
  encuadrando el proyecto), **zoom** por botones (además de la rueda),
  **posicionamiento del maniquí** (arrástralo para situarlo frente a la
  máquina) y **mano interactiva**: arrastra cualquier pieza móvil y un resorte
  físico amortiguado tira de ella por el punto agarrado, como una persona real
  usando los agarres y barras de la máquina (la pieza palanquea, gira y
  arrastra lo que tenga conectado).
- **Crear pilar / travesaño (línea)**: nueva herramienta de la paleta que traza
  un perfil de acero entre dos puntos, como la línea recta de Paint. Un diálogo
  permite elegir **perfil 1:1 / 1:2 / 1:3**, **medida nominal** (40–100 mm),
  **extremos** (corte plano o diagonal en inglete a 45°) y **pinholes** reales
  (agujeros pasantes con diámetro y distancia configurables). Incluye **aim
  assist**: el cursor se imanta a extremos, nodos y puntos medios de otras
  piezas para encadenar estructuras complejas; el modo queda activo para trazar
  varias piezas seguidas (ESC para salir).
- **Crear tubo de acero (línea)**: igual que el pilar pero con sección circular
  y **medidas nominales** de tubo (⌀ 25–76 mm), con el mismo aim assist.
- **Bending (doblado por nodos)**: al seleccionar un pilar/travesaño o tubo, el
  botón **Doblar (nodos)** muestra los nodos de su trayectoria como asas
  arrastrables; arrastrarlos da forma a la pieza con una **curva suave**
  (Catmull-Rom), al estilo de las curvas editables de Photoshop. La forma se
  guarda con el proyecto y la física usa el volumen doblado. En piezas dobladas
  no aplican agujeros ni extremos diagonales (vuelven al enderezarlas).

### Cambiado

- Durante la simulación se **oculta toda la interfaz de edición** (paleta,
  inspector, conexiones, posturas, HUD y los grupos de herramientas de la
  barra): edición y simulación quedan como dos entornos separados, y al
  detener la física la interfaz vuelve tal cual estaba.

### Corregido

- **Articular piezas con orientaciones distintas** ya no produce un latigazo al
  iniciar la simulación: cuando los frames de diseño no son compatibles, la
  bisagra/corredera se crea a través de un cuerpo adaptador que respeta la
  orientación de ambas piezas (antes el solver reorientaba la pieza móvil de
  golpe para alinear los ejes locales).
- **Física**: la velocidad de la simulación ya no depende del refresco del
  monitor (paso fijo de 1/60 s con acumulador; a 120/144 Hz corría al doble).
  Collider del toro (aro) ajustado a su caja real (flotaba/empujaba a
  distancia); colliders de geometrías dobladas alineados con el centro real de
  la forma (colisionaban desplazados); iniciar la simulación dos veces seguidas
  (Espacio mantenido) ya no crea mundos de física duplicados sin liberar.
- **Guardar durante la simulación** (botón Guardar, Home → "Guardar y salir")
  serializa ahora el estado de **diseño**, no las posiciones simuladas del
  momento (antes guardaba la máquina "colapsada").
- **"Nuevo" durante la simulación** detiene la física antes de vaciar la
  escena (antes seguía simulando sobre una escena vacía y la edición quedaba
  bloqueada).
- **Cambios sin guardar**: posar el maniquí, tensar cuerdas, mover grupos y
  doblar piezas ya cuentan como cambios (antes se salía sin aviso de guardar).
- Las **cuerdas** siguen a sus anclas al mover un **grupo**, durante la
  **simulación** y al **restaurar** el diseño al detenerla (antes quedaban
  flotando en la posición antigua).
- **Cargar un proyecto** con una pieza desconocida (de otra versión) ya no
  aborta la carga completa: se omite esa pieza con aviso y se carga el resto.
  Abrir un proyecto reciente que falla muestra un error en vez de quedar en
  silencio. **Duplicar una pieza importada** (glb/obj) ya no lanza un error.
- **Desagrupar/eliminar un grupo** ya no deja el inspector mostrando los
  controles del grupo inexistente.
- **Atajos de teclado**: ya no se disparan al escribir o navegar en selectores
  y campos de la UI (Espacio arrancaba la simulación desde un desplegable,
  Supr borraba la pieza…); con un botón enfocado, Espacio activa el botón.
- **Alternar maniquí/esqueleto** ya no resucita una figura que el usuario
  quitó, y volver a mostrar el esqueleto ya no re-sube el modelo entero a GPU
  (la caché compartida se conservaba mal).
- **Abrir el mismo archivo dos veces** desde la pantalla de inicio funciona
  (el selector no se reseteaba tras un archivo inválido).
- **Fugas de memoria/GPU corregidas** al alternar proyecto ↔ Home: atajos
  globales de Toolbar y panel de Rendimiento que retenían el editor entero,
  contexto WebGL y entorno PMREM de la vista previa de la biblioteca,
  texturas del suelo, materiales de los ayudantes de articulaciones y de los
  cables, decodificador Draco duplicado por cada modelo cargado, y pilas
  selectorizadas que no se reconstruían al asignarles un modelo 3D.

### Rendimiento

- **Rapier se carga bajo demanda**: el módulo de física (~2,2 MB de WASM) se
  descarga al pulsar **Simular** por primera vez, no al abrir la app; la
  landing y el editor arrancan más ligeros.
- Las **cuerdas** reutilizan sus meshes (pool) y comparten una única geometría
  unitaria escalada por segmento: arrastrar la pieza anclada o el slider de
  tensión ya no clona ni re-sube geometrías a GPU.
- La **IK de manos** ya no recorre el árbol completo de la figura 3 veces por
  mano y por frame: solo recalcula la cadena hombro→muñeca consultada.
- Los **proyectos recientes** guardan sus metadatos (nombre/fecha) en un store
  aparte de IndexedDB (migración automática): listar la Home o podar ya no
  deserializa hasta 12 proyectos completos.
- Los visuales de **cables** solo se reconstruyen cuando algo se mueve (antes
  re-subían sus buffers a GPU en cada frame, incluso en reposo).
- El **snapping** ya no recalcula el bounding box de todas las geometrías en
  cada evento de arrastre (se degradaba con modelos personalizados grandes).
- El bundle se divide en chunks (`three`, `rapier`, app): descarga en paralelo
  y mejor caché del navegador entre versiones (el código propio pasa de
  3,2 MB a ~300 kB por actualización).

## [0.1.4] — 2026-07-01

### Añadido

- **Cable por poleas rediseñado**: la herramienta de cable se coloca ahora
  seleccionando **dos puntos de anclaje** que describen una **línea recta**
  (estilo “línea recta” de Paint), con **previsualización elástica** y un
  indicador que resalta el **punto de conexión** más cercano de la pieza
  señalada (anclaje facilitado por proximidad). Entre los dos extremos, las
  únicas superficies por las que el cable puede **deslizarse** son
  **roldanas/poleas** (`polea`, `roldana`, `bloque de poleas`): al hacer clic en
  una se añade como punto de reenvío y el trazado continúa; al hacer clic en
  cualquier otra pieza se cierra el cable (o **Enter/Finalizar**).
- **Cadenas y correas de seguridad como cuerdas**: se colocan con una
  herramienta de **línea** (clic en un extremo y luego en el otro, estilo “línea
  recta” de Paint). Cada extremo se **ancla** a la pieza más cercana (a su punto
  de anclaje) o a la superficie del suelo. Cuelgan describiendo una **catenaria**
  con **tensión/holgura ajustable** (panel Conexiones). Se dibujan como
  **segmentos articulados** (eslabones o listones), y la forma del segmento se
  toma de la biblioteca: al reemplazar el modelo de **Cadena de eslabones** o
  **Listón de Kevlar** en la biblioteca, las cuerdas usan ese modelo más preciso.
- **Reemplazo de segmentos del maniquí**: en la biblioteca (pestaña **Maniquí**)
  se puede sustituir cada parte del cuerpo (cabeza, torso, brazos, antebrazos,
  manos, muslos, piernas, pies…) por un modelo 3D más estético. El modelo se
  ajusta automáticamente al hueco de la parte (igualando su dimensión más larga
  y centrándolo), conserva la articulación y se guarda en el navegador; el
  maniquí se reconstruye al cambiarlo. La biblioteca queda en dos pestañas:
  **Componentes** y **Maniquí**.
- **Posado dinámico del maniquí por eje articular**: al seleccionar un segmento,
  el gizmo se coloca en la articulación y solo muestra los **ejes naturales** de
  esa articulación (bisagra en codo/rodilla = 1 eje; esférica en hombro/cadera =
  3 ejes; muñeca/tobillo = 2). Arrastrar el eje gira el segmento completo en
  torno a la articulación, dentro de **rangos anatómicos** (se limitan los
  ángulos y se bloquean los ejes no naturales, también en el editor numérico).
- **Exportar/importar la biblioteca en bloque** (ZIP), para mantener el
  repertorio entre dispositivos. Al importar, un diálogo de fusión clasifica
  cada modelo entrante frente al local (**Nuevo / Más reciente / Más antiguo /
  Sin cambios**) usando marcas de tiempo: por defecto aplica los nuevos y los
  más recientes, y **no** sobrescribe tus ediciones con versiones más antiguas
  ni con modelos por defecto (los que no cambiaron no viajan en el ZIP). El
  usuario marca/desmarca qué aplicar.
- **Opciones de rendimiento** (botón **Rendimiento** en el editor): presets
  Alto/Medio/Bajo y ajustes finos de resolución de render, sombras, reflejos de
  entorno y antialias, para diseñar con fluidez en equipos o tablets con poca
  potencia. Se guardan y se aplican en vivo (el antialias, al reabrir).
- **Volver a la Home** desde un proyecto (botón **⌂ Home**): sugiere guardar si
  hay cambios (Guardar y salir / Salir sin guardar / Cancelar) y libera por
  completo el editor, permitiendo trabajar en varios proyectos de forma
  secuencial sin reiniciar la app.

### Cambiado

- La **biblioteca de repertorio** ahora es una vista de la **Home** que muestra
  solo el ítem seleccionado en un visor 3D, sin ejecutar el entorno de diseño
  completo en segundo plano (menor consumo de recursos). El botón de biblioteca
  se retira del editor; se accede desde la pantalla de inicio. Toda la
  previsualización y el reemplazo de modelos ocurren en ese entorno separado.
- La paleta del editor pasa a ser una **bandeja de "piezas disponibles"** (estilo
  set de Lego): cada pieza se coloca en el diseño con el modelo 3D que le haya
  asignado la biblioteca, y se marca con un punto las que tienen modelo propio.
  Los modelos se comparten entre todos los proyectos (gestor único).

## [0.1.3] — 2026-06-30

### Añadido

- **Pantalla de inicio (launcher)**: al abrir la app se muestra una landing
  ligera —sin inicializar WebGL/física hasta elegir acción, para ahorrar
  recursos— con el logotipo grande y su lettering, botones **Crear nuevo** y
  **Abrir archivo…**, **Continuar sesión anterior** (autoguardado), una lista de
  **proyectos recientes** (IndexedDB) y un apartado de **dedicatoria** editable
  desde `public/dedicatoria.txt`.
- **Explorar biblioteca** desde la landing: abre la biblioteca sobre una escena
  vacía (sin cargar un proyecto) para revisar cada componente por separado con
  una **vista previa 3D** (turntable, orbitable) y sustituirlo por un modelo,
  haciendo más eficiente la edición del repertorio de piezas.
- **Guardar** pide ahora un nombre de proyecto (se usa para el archivo `.json` y
  para la entrada de proyectos recientes).
- Dedicatoria del autor en cinco idiomas (español, inglés, alemán, francés y
  portugués) con etiqueta de idioma en la pantalla de inicio.

### Corregido

- El autoguardado ya no sobrescribe la sesión anterior con una escena vacía:
  abrir "Crear nuevo" o "Explorar biblioteca" conserva la sesión hasta que haya
  contenido nuevo (sigue disponible en "Continuar sesión anterior").
- La vista previa de la biblioteca libera la geometría y el material de cada
  componente al cambiar de selección (evita fugas de memoria/GPU).

## [0.1.2] — 2026-06-30

### Añadido

- **Biblioteca de componentes**: ventana para sustituir la primitiva básica de
  cualquier componente por un modelo 3D diseñado en SketchUp o Nomad
  (`.glb`/`.gltf`/`.obj`). El modelo se fusiona, se escala a cm y se centra, se
  aplica a todas las instancias del componente y se guarda en el navegador
  (IndexedDB) para restaurarse al reabrir; botón **Restablecer** para volver a
  la primitiva.
- **Modelos por archivo**: carpeta `public/models/components/` con un
  `manifest.json` (id de componente → fichero) para reemplazar modelos solo con
  archivos, sin código ni la app. Se cargan al arrancar; un modelo puesto desde
  la Biblioteca tiene prioridad sobre el de archivo. Incluye `LEEME.md` con la
  lista de ids y las instrucciones.

### Cambiado

- **Suelo de trabajo** siempre presente e inamovible: plano gris neutro (escala
  de grises) que recibe sombras y muestra el logotipo de la app como marca de
  agua tenue, de bajo contraste. No es seleccionable ni se borra al limpiar la
  escena. Fondo y rejilla neutralizados a grises.

## [0.1.1] — 2026-06-30

### Añadido

- **Identidad de marca EXERSUITE3D**: el logotipo (placa olímpica + compás de
  dibujo) se integra como favicon, cabecera de la paleta (insignia + wordmark)
  e iconos nativos de la app (Android e iconos de Tauri), generados desde el
  arte de marca. Paleta monocroma industrial (tinta + papel hueso) en la
  interfaz: los estados activos/seleccionados usan el acento de marca.
- Este `CHANGELOG.md`.

### Cambiado

- El ejecutable de escritorio (Tauri) ahora se llama `EXERSUITE3D.exe` (antes
  `exersuite3d.exe`), vía `mainBinaryName` en `tauri.conf.json`.
- Los paneles laterales arrancan bajo la barra superior para no quedar tapados.

## [0.1.0] — 2026-06-30

Primera versión empaquetada, con binarios para Android y Windows publicados
automáticamente en la Release.

### Añadido

- **Editor 3D** estilo SketchUp / NomadSculpt: viewport con cámara orbital,
  grid en centímetros (1 unidad = 1 cm), selección, gizmos de mover/rotar/escalar
  y HUD de medidas. Librería de componentes mecánicos de gimnasio (estructurales,
  de movimiento, de transmisión, de peso y ergonómicos) con material PBR y
  atributos físicos editables, e inspector con medidas exactas.
- **Física (Rapier)**: cuerpos rígidos, gravedad, masas y colisiones, con
  Play/Stop que restaura el diseño. Articulaciones de bisagra (revolute) y
  corredera (prismatic) con eje, pivote, límites de recorrido y motor de
  velocidad.
- **Cables y poleas**: cable inextensible que pasa por poleas (puntos de paso) y
  acopla sus dos extremos por conservación de longitud; las poleas móviles
  producen el ratio 2:1 de forma emergente. Pila de pesos selectorizada con
  placas, varillas, tubo y pin animados.
- **Ensamblaje**: encaje magnético (snapping) en puntos de anclaje
  (centro/eje, extremos de cilindros, centros de cara) y agrupación
  multicomponente (subensamblajes) con nombrar/duplicar/desagrupar.
- **Modelado**: voltear (espejo) y deformación libre —doblar (bend), torcer
  (twist) y biselar/redondear aristas (cajas).
- **Figura humana de referencia**: maniquí posable con rig de articulaciones
  (rotación por gizmo y editor numérico de ángulos X/Y/Z) **o** esqueleto
  anatómico detallado (glTF/Draco, CC BY-SA con su crédito), a escala con altura
  editable en cm. Posturas estándar editables y ampliables (biblioteca
  persistente: aplicar, actualizar, guardar, eliminar, restaurar). Apoyo de
  manos en agarres con IK de dos huesos.
- **Proyecto**: guardar/cargar a archivo `.json` (piezas, joints, cables, grupos
  y personaje con su pose) y **autoguardado** en el navegador (localStorage) con
  restauración al reabrir.
- **Interoperabilidad glTF**: exportar el prototipo a `.glb` binario e importar
  modelos `.glb`/`.gltf` (Draco) u `.obj`.
- **Empaquetado multiplataforma** desde el mismo bundle web: Android (APK) con
  Capacitor y Windows (standalone) con Tauri.
- **CI/CD** (GitHub Actions): compila el APK (runner Linux) y el `.exe` +
  instaladores NSIS/MSI (runner Windows) en cada push y, al crear un tag `v*`,
  publica una GitHub Release con todos los binarios adjuntos.

[Sin publicar]: https://github.com/amaturanas-sys/EXERSUITE3D/compare/v0.1.6...HEAD
[0.1.6]: https://github.com/amaturanas-sys/EXERSUITE3D/compare/v0.1.5...v0.1.6
[0.1.5]: https://github.com/amaturanas-sys/EXERSUITE3D/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/amaturanas-sys/EXERSUITE3D/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/amaturanas-sys/EXERSUITE3D/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/amaturanas-sys/EXERSUITE3D/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/amaturanas-sys/EXERSUITE3D/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/amaturanas-sys/EXERSUITE3D/releases/tag/v0.1.0
