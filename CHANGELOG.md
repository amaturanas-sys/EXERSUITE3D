# Changelog

Todos los cambios notables de **EXERSUITE3D** se documentan aquí.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y el proyecto usa [Versionado Semántico](https://semver.org/lang/es/).

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
