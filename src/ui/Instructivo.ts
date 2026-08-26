import { el } from "./dom";

/**
 * Ventana de instrucciones de uso (se abre desde el botón "Instructivo" del
 * Home). Guía completa y compacta de todas las herramientas de la app.
 */

/**
 * FAQ del instructivo (v0.2.3): preguntas frecuentes desplegables. Cada
 * respuesta admite además CAPTURAS demostrativas (imágenes en
 * public/instructivo/<id>-N.png se muestran automáticamente bajo el texto).
 */
const FAQ: { id: string; pregunta: string; puntos: string[] }[] = [
  {
    id: "empezar",
    pregunta: "¿Cómo empiezo un proyecto?",
    puntos: [
      "En el inicio elige Builder (diseñar) o Simulador (solo correr la física de un proyecto).",
      "Crea un proyecto nuevo, abre un archivo .json o continúa una sesión reciente.",
      "Al crear un proyecto el asistente pregunta el modo (Sencillo: piezas básicas · Profesional: todas las herramientas) y el espacio: canvas Libre (suelo infinito) o Completo, donde defines el suelo como rectángulo o DIBUJANDO su planta en metros (vértice a vértice, ideal para salas en L).",
      "La escena se autoguarda en el dispositivo cada pocos segundos mientras trabajas.",
    ],
  },
  {
    id: "sencillo",
    pregunta: "¿Qué diferencia al modo Sencillo del Profesional?",
    puntos: [
      "El modo Sencillo acota las herramientas a lo esencial: máquinas estándar completas, primitivas y unas pocas piezas básicas — ideal para plantear la distribución de una sala sin distracciones.",
      "El modo Profesional muestra la paleta completa (estructura, transmisión, movimiento, peso y ergonomía, con la roldana y los terminales de cable), las conexiones (bisagras, correderas, cables) y el bloqueo de ejes. Las piezas INTERNAS de las máquinas reales ya no se listan sueltas: viven dentro de sus máquinas y prefabs.",
      "El modo se elige al crear el proyecto y queda guardado con él.",
    ],
  },
  {
    id: "espacio",
    pregunta: "¿Cómo funciona el canvas Completo (planta, techo y paredes)?",
    puntos: [
      "En el canvas Completo la techumbre es una CARA PLANA oscura, copia fiel del suelo, con sus alturas A/B y su pendiente.",
      "Las paredes N/S/E/O son caras que van del suelo al techo SIN dejar huecos: bajo una techumbre inclinada su borde superior sigue la pendiente (trapezoidales).",
      "Sin techumbre también puede haber paredes: suben hasta la altura que definas en el asistente (campo Altura de las paredes).",
      "Lo que sobresale del espacio se marca en rojo y su colocación se cancela.",
    ],
  },
  {
    id: "construir",
    pregunta: "¿Cómo construyo una máquina?",
    puntos: [
      "Toca una pieza de la paleta para añadirla, o ARRÁSTRALA al visor para colocarla donde la sueltes (en táctil: mantén pulsado ~medio segundo y arrastra).",
      "Máquinas estándar (arriba de la paleta): rack de sentadillas, jaula de potencia, banco plano, rack con torre TTP, torre polea de discos, torre polea de pesos y árbol de discos — con medidas comerciales y armadas con las piezas REALES del despiece (montantes con agujeros de calce, ganchos J de pin+giro, rieles porta-discos, multi-agarre y patines). Cada una se inserta como GRUPO, lista para plantear la sala.",
      "Pilar/travesaño (línea) y Tubo (línea): dos toques —origen y destino— con imán a extremos y puntos medios de otras piezas.",
      "Doblar (nodos): con una pieza de línea seleccionada, edita su trayectoria arrastrando los nodos como en las curvas de Photoshop.",
      "Cuerdas (cadena/correa): toca los dos anclajes (cualquier cara de una pieza, pared o techumbre) y define la CAÍDA en cm — la catenaria con la que cuelga.",
      "La paleta lista solo piezas que se usan sueltas; las internas de cada máquina real llegan con la máquina o con su prefab. El Carro de doble roldana TTP sí está a mano (Transmisión) y nace SIEMPRE con sus dos roldanas funcionales.",
    ],
  },
  {
    id: "editar",
    pregunta: "¿Cómo edito con precisión?",
    puntos: [
      "La barra agrupa las herramientas en menús: Archivo, Edición, Selección, Ver y Ejes.",
      "Toca para seleccionar; Ctrl+clic (o Shift) añade a la selección; Área (menú Selección) dibuja un recuadro que selecciona todo lo que abarca.",
      "Mover/Rotar/Escalar cambian el gizmo y Arrastrar lleva las piezas con el dedo (menú Selección).",
      "VENTANA IZQUIERDA: una sola ventana con el logo y cuatro barras colapsables del mismo estilo — PIEZAS DISPONIBLES, PROPIEDADES, CONEXIONES y ARRASTRE PRECISO — con su propia barra de deslizamiento. Toca el título de cada barra para plegarla o desplegarla; todo el flujo de trabajo vive en la misma ventana.",
      "TOOLBOX (barra vertical del borde derecho): siete atajos con icono — selección única, selección de área, mover, rotar, escalar, orbitar y DEFORMAR POR NODOS (activa el doblado de la pieza de línea seleccionada). Con selección u orbitar el gizmo queda inactivo (nada se arrastra por accidente); con orbitar el toque solo mueve la cámara.",
      "GRUPOS Y MULTISELECCIÓN EN NÚMEROS EXACTOS: con un grupo o varias piezas seleccionadas, Propiedades muestra la posición del centro (cm), la rotación del bloque (grados) y la escala (×) — escribe el valor y el bloque completo se transforma exactamente, igual que con el gizmo.",
      "ARRASTRE PRECISO (menú Selección): abre una ventana con cursores en pantalla (◀ ▶ mueven a los lados; ▲ ▼ suben/bajan o, con el switch de ejes, adelante/atrás). También sirven las flechas del teclado, la tecla C cambia el eje y Shift da pasos de 10 cm.",
      "Teclas 1/2/3 (o el menú Ejes): bloquean TODO el trazado a un eje; 0 o Esc lo libera. La línea inferior muestra el desplazamiento en cm.",
      "Copiar/Pegar/Duplicar/Eliminar, Agrupar/Desagrupar y 🔩 Soldar viven en el menú Edición (Ctrl+C/V/D y Supr).",
      "GRUPOS: selecciona dos o más piezas (Mayús+toque o Selección de área) y Edición → Agrupar las une en un subensamblaje. Si alguna ya pertenece a un conjunto — el de una roldana (rueda + eje) o una máquina insertada —, ese conjunto se ABSORBE entero en el grupo nuevo, sin dejar piezas fuera. Después, tocar CUALQUIER pieza del grupo selecciona el grupo completo (Mayús+toque lo añade a una multiselección), y Desagrupar lo devuelve a piezas sueltas.",
      "🔩 SOLDAR es la hermana de Agrupar, y resuelve lo que Agrupar no puede: un grupo se mueve junto EN EL EDITOR, pero al simular sus piezas siguen siendo cuerpos sueltos — un brazo compuesto de cuatro tubos agrupados se cae a cachos en cuanto lo cuelgas de un extremo. Soldar agrupa IGUAL y además crea una unión rígida por cada pareja del conjunto que se toca, en el punto donde se tocan. La física reconoce esas uniones y funde el conjunto en UN SOLO CUERPO: se mueve entero, choca entero y transmite esfuerzo entero. Es la misma soldadura que planta el imán de la herramienta de nodos al soltar un nodo sobre otra pieza, pero de todas de una vez.",
      "Las soldaduras son uniones normales: aparecen en Conexiones con el nombre «Soldadura», se pueden DESBLOQUEAR (y entonces pasan a ser bisagras que giran) o borrar una a una. Si alguna pieza del conjunto no toca a ninguna otra, se avisa con su nombre — no se inventa una soldadura en el aire. Y si una de las piezas está marcada como FIJA, el conjunto entero queda anclado al simular: el aviso te lo dice, porque para un brazo móvil suele ser justo lo contrario de lo que buscas.",
      "Un grupo se mueve, gira y escala como un bloque —con el gizmo o con los números exactos de Propiedades— y su MECÁNICA viaja con él: las bisagras y correderas conservan su punto y su eje al girarlo, así que la máquina sigue funcionando en la simulación.",
      "FÍSICA DEL CONJUNTO: con un grupo seleccionado, Propiedades trae la masa y el interruptor «Fijas» de TODAS sus piezas de una vez — no hay que desagrupar la máquina para tocarlas. Importa más de lo que parece: el motor solo circunscribe a sus guías tubulares los cuerpos MÓVILES, así que un carro marcado como fijo deja de correr por sus barras. Si alguna pieza del conjunto está enhebrada en guías y quedó fija, el panel te la nombra.",
      "VOLTEAR (espejo) en Propiedades espeja la pieza HORNEANDO el volteo en su geometría: la pieza se ve reflejada pero sus ejes siguen siendo los del mundo, así que el gizmo y el arrastre preciso continúan tirando hacia donde apuntan. Los proyectos antiguos con volteos guardados como escala negativa se convierten solos al abrirlos.",
      "↺/↻ o Ctrl+Z/Ctrl+Y deshacen y rehacen (hasta 60 pasos).",
      "Menú Ver: grid, aristas de las piezas, modo de color (materiales reales · por categoría · neutro) y perspectivas Frontal/Lateral/Superior/Isométrica. Los botones +/− junto al visor ajustan el zoom.",
    ],
  },
  {
    id: "fisica",
    pregunta: "¿Cómo funcionan la física y las conexiones (cables y poleas)?",
    puntos: [
      "En Propiedades: material, masa (kg) y Anclado (las piezas ancladas o sin masa no caen).",
      "+ Bisagra instala una BISAGRA REAL, y se monta sobre CARAS, no sobre piezas: toca un PUNTO de la cara de la 1ª pieza —ahí se atornilla su placa, y queda marcado con un disco azul— y luego un punto de la cara de la 2ª. Con eso está dicho todo lo que antes había que adivinar: sobre qué superficie va cada placa y en qué sitio. El EJE DEL PIVOTE sale solo —es la arista donde se encuentran los planos de las dos palas—, así que el panel del costado derecho ya solo pide el tamaño de las placas, el recorrido en grados y si JUNTAR LAS PIEZAS. Se montan DOS PLACAS PLANAS y el PASADOR cilíndrico que las articula; cada placa queda SOLDADA a su pieza, así que lo que gira en la simulación es exactamente el herraje que ves. El conjunto queda agrupado como \"Bisagra\" y puedes moverlo o borrarlo como una sola cosa.",
      "JUNTAR LAS PIEZAS (encendido de fábrica): la segunda pieza se arrima hasta dejar su canto a la holgura del pasador, de modo que el pivote queda ADYACENTE A LAS DOS PLACAS, como el lomo de un libro, en vez de con las palas estiradas sobre un hueco. Si marcas dos caras PARALELAS —dos tablas sobre la misma mesa— además se enrasan y la bisagra sale plana; si marcas dos caras PERPENDICULARES —la cara de arriba de una caja y el costado de su tapa—, cada placa se pega a la suya y la charnela cae justo en la esquina. La primera pieza no se mueve nunca: es la referencia.",
      "LA CARA DECIDE HACIA DÓNDE PLIEGA, igual que en el mundo real: montada arriba, las dos piezas topan entre sí en cuanto la bisagra intenta cerrar hacia abajo (el material lo impide); montada abajo, ese mismo conjunto flexiona. Para lograrlo, las dos piezas unidas por una bisagra real SIGUEN CHOCANDO entre sí en la simulación — el interruptor \"Las piezas chocan entre sí\" de cada unión (Conexiones) lo controla, y conviene dejarlo apagado en pivotes donde las piezas se solapan a propósito, como un brazo metido en su anclaje.",
      "+ Corredera articula dos piezas con un deslizamiento (toca una y luego la otra).",
      "SOLDADURAS: una unión BLOQUEADA (Lock switch) deja de ser articulación y pasa a ser una SOLDADURA — las piezas unidas se simulan como UN SOLO CUERPO rígido con la masa de todas. Es lo que hace que un brazo compuesto (brazo + extensión soldada) pivote entero en su sitio en vez de salir despedido. Sus marcadores se dibujan pequeños y grises para distinguirlos de las articulaciones libres.",
      "Roldana (paleta, en dos pasos): toca la ESTRUCTURA que la alojará (puedes orbitar para buscarla), su eje mayor aparece como línea AZUL; toca el punto del eje donde va y el panel del costado derecho pide montaje y dirección — arriba/abajo/derecha/izquierda/anterior/posterior en los ejes GLOBALES, y el modelo se sigue viendo y orbitando mientras eliges. EXTERNA: nace con su MONTAJE (placa y mejillas) que la vincula a la estructura, nada queda flotando. INTERNA: se aloja DENTRO del perfil montada en un EJE que apoya en sus dos paredes, y CALA la estructura elegida con dos agujeros iguales y pasantes en las caras que quedan sobre y bajo la rueda (⊥ a su eje de giro) — el cable entra y sale sin obstruirse y la rueda cabe entera sin chocar con la cara, como el soporte de polea alta del TTP. El conjunto (rueda + eje) queda agrupado, y si luego agrupas la máquina entera se absorbe dentro de ella.",
      "Terminal de cable (paleta): coloca ojales de anclaje sobre cualquier cara; el cable VÁLIDO se dibuja en azul oscuro (destaca sobre el fondo claro) y el cable en ERROR se pinta en rojo si atraviesa material o entra torcido a una roldana.",
      "⏺ FRENO DE CABLE (Conexiones): un clic sobre el trazado engarza ahí la ESFERA de tope de las máquinas reales; otro clic sobre ella la retira. La bola viaja con el cable mientras se tira, pero NO pasa por una roldana ni por un terminal: al llegar se interpone y ese lado deja de retraerse. Es lo que mantiene la tensión en el momento cero para que el esfuerzo sea parejo en todo el recorrido — y lo que impide que un extremo liviano (una barra colgando suelta) se trague el recorrido que debería mover el contrapeso. Colócalo en el ramal por donde se te escapa la tensión, cerca de la roldana contra la que quieras que tope.",
      "TRAMOS OCULTOS: cuando un tramo del cable va de una roldana INTERNA a otra roldana INTERNA DE LA MISMA viga, el cable discurre por DENTRO del perfil —que en el mundo real es hueco—, así que nada de lo que haya en ese volumen lo obstruye: ni la propia viga ni el mástil que la sostiene penetrando en ella. La regla es estricta y va tramo a tramo: entre roldanas de vigas distintas, de una interna a una externa, o en el resto del recorrido, el cable se sigue validando contra el material como siempre.",
      "Lock switch en cada bisagra/corredera (Conexiones): bloqueada queda rígida en su pose — transforma una máquina de empuje horizontal en vertical con un clic.",
      "+ Cable traza un cable inextensible punto a punto: ancla A → roldanas de paso → ancla B (Finalizar cable). Las poleas dan ventaja mecánica real (2:1…).",
    ],
  },
  {
    id: "calce",
    pregunta: "¿Cómo calzo ganchos J, brazos de seguridad y anclajes en los pilares?",
    puntos: [
      "Selecciona el gancho J, la jota con rodillo, el brazo de seguridad o el anclaje de cadena y usa Calce en el poste (Propiedades): los botones ▲/▼ lo suben y bajan AGUJERO POR AGUJERO siguiendo la grilla real de pinholes del montante (paso 5 cm en el TTP, 5,5 cm en el POWERRACK).",
      "Al calzar, la pieza se ENSAMBLA a la estructura: su manguito abraza el pilar y el pin articula con los pinholes estandarizados — los orificios pasantes por ambas caras —, nunca con agujeros accesorios, y nunca queda flotando en el aire.",
      "Algunas piezas se sostienen de UN pilar (ganchos J, jotas, anclajes) y otras de DOS a la vez: el brazo de seguridad se TIENDE entre los dos pilares de su lado y ▲/▼ lo sube o baja un agujero en AMBOS simultáneamente.",
      "También vale para los postes TRAZADOS con la herramienta de línea: el diámetro y la distancia de sus pinholes (del diálogo de trazado) definen la grilla, y la pieza se detiene en la última fila de agujeros.",
      "El accesorio RECONOCE la inclinación de la cara: en una estructura doblada por nodos, cada tramo recto — vertical, diagonal u horizontal — tiene su propia grilla, la pieza se alinea con el eje del tramo y ▲/▼ avanza a lo largo de él.",
      "⏺ LARGO A MEDIDA: el BRAZO DE SEGURIDAD, la BARRA PULLUPS y la BARRA MULTI-AGARRE no se acoplan a una máquina, se tienden ENTRE DOS PILARES — y esa separación la decides tú al armar la estructura. Por eso su largo se cambia en Propiedades («Largo a medida»), y se cambia POR EL CENTRO: los remates de los dos extremos —placas de montaje, manguito, ganchos— viajan enteros hacia fuera sin deformarse, y solo se estira el tramo recto del medio. No es escalar la pieza: el perfil no cambia y el punto de calce viaja con su manguito, así que la pieza alargada sigue calzando donde debe. «De fábrica» la devuelve a su medida original.",
      "⏺ GUÍAS TUBULARES (una Smith, una prensa de piernas, un hack squat): por dentro todas son la misma máquina —dos barras cromadas tendidas entre los travesaños del bastidor y un CARRO que solo puede correr por su recta—, y eso es lo que armas con cuatro piezas. La GUÍA TUBULAR se tiende como una pieza de línea: eliges el diámetro y das dos toques, el de inicio y el de final. Queda amarrada a las dos piezas que tocaste, así que si mueves el bastidor la guía se vuelve a tender sola, con su nuevo largo — con las dos puntas amarradas, el largo lo mandan los soportes, como en la máquina de verdad. El DIÁMETRO se retoca siempre en Propiedades (radio), y el largo también si dejaste alguna punta al aire.",
      "⏺ ENHEBRAR EL CARRO: manda la GUÍA. Selecciónala, enciende «Administrar vinculación» en sus Propiedades (puedes encender varias guías a la vez) y desde ahí haz clic en las piezas que deben correr por ella y colócalas con el gizmo. Al soltarlas quedan VINCULADAS: por cada guía administrada que las atraviesa se les abre un canal REDONDO de verdad en la malla, del diámetro del tubo más la holgura de deslizamiento — como el orificio pasante del carro de una prensa real. Mientras el interruptor esté apagado, mover una pieza junto a la guía no le hace nada; con él encendido, apartarla le quita el canal. La guía tiene que venir alineada con un eje de la pieza (hasta 12° de desvío): el carro va a escuadra con sus barras, también en la máquina de verdad.",
      "⏺ TOPES Y SAFETY PINS: el TOPE DE GUÍA es el espaciador de goma que se monta sobre la barra — suéltalo cerca de ella y se centra en su recta, alineado. Desde ahí acota el recorrido: el carro se detiene en él en vez de llegar abajo, y puedes poner topes a los dos lados. El SAFETY PIN ATRAVIESA el pinhole de un pilar de lado a lado, perpendicular a la viga, igual que un pin de verdad: reconoce la misma grilla de agujeros que las jotas —sube y baja con ▲/▼ agujero por agujero— y se ciñe al diámetro del agujero, porque uno más gordo no entraría. En Propiedades regulas su largo y el CORRIMIENTO: cuánto sobresale por cada lado, que es lo que decide dónde apoya la carga; «Centrar» lo deja simétrico.",
      "⏺ CÓMO SE MUEVE LO ENHEBRADO: exactamente igual que la pila de pesos sobre sus tubos. El carro queda circunscrito a la RECTA de sus guías —no a la vertical—, así que en una prensa inclinada baja y avanza en profundidad a la vez, sin deriva lateral y sin volcar, y sus guías no rozan con él. Lo que lo detiene son los topes.",
      "En la SIMULACIÓN, los accesorios calzados quedan FIJADOS por su pin a la estructura: si esta es móvil (un brazo, un carro), viajan solidarios con ella sin caerse ni deslizar.",
    ],
  },
  {
    id: "pesos",
    pregunta: "¿Cómo funcionan los pesos: pila selectorizada, bloques guiados y discos?",
    puntos: [
      "La pila de pesos es selectorizada: mueve el PIN placa a placa (Propiedades) y el cable toma SOLO las placas seleccionadas, como en la máquina real.",
      "El bloque de peso y la pila llevan DOS ORIFICIOS verticales que calzan con los tubos guía: colócalos entre dos tubos verticales y en la simulación se deslizan circunscritos a ellos, deteniéndose en los topes.",
      "El portadiscos (carrier), las barras olímpicas, los cuernos de carga y los atriles aceptan DISCOS MONTADOS (Propiedades): se ensamblan introduciendo el cilindro por el orificio central del disco, quedan suspendidos por la estructura y suman su masa.",
      "El motor reconoce solo el sistema de polea tubular guiada — carrier, 2 tubos guía y 2 espaciadores/stoppers — y circunscribe el carro a sus tubos sin uniones manuales.",
      "LA CARA CON RELIEVE MIRA HACIA FUERA, a los dos lados: en una barra cargada las letras y los números se leen desde cualquiera de los dos perfiles, como en un disco de verdad. Antes todos los discos se montaban con la misma orientación y en un extremo se veía el dorso liso.",
    ],
  },
  {
    id: "brazos",
    pregunta: "¿Cómo creo brazos móviles (jammer arms)?",
    puntos: [
      "Calza un Anclaje de cadena POWERRACK al pilar: su pin posterior entra en los pinholes y su cilindro perpendicular queda libre como PIVOTE.",
      "Selecciona una estructura tubular o tipo pilar, acércala al anclaje y pulsa Articular como brazo (sección Brazo móvil de Propiedades): la pieza se vuelve móvil y gira alrededor del cilindro, cayendo en el plano frontal del pilar como un jammer arm real.",
      "El brazo puede portar roldanas (soldador de nodos), cables/piolas, cuernos de carga con discos, o calzar piezas en sus propios pinholes — todo se mueve con él y expande la máquina.",
      "BRAZO COMPUESTO: si el brazo se prolonga con otra pieza, únelas con + Bisagra y deja la unión BLOQUEADA (o usa Lock switch): la simulación las funde en un solo cuerpo y el conjunto pivota entero desde su anclaje. Una pieza marcada como móvil sin masa declarada ya no queda estática en el aire — recibe una masa mínima de trabajo.",
    ],
  },
  {
    id: "maniqui",
    pregunta: "¿Cómo uso el maniquí?",
    puntos: [
      "Figura muestra el maniquí a escala; ajusta su altura en cm.",
      "🧍 COLOCAR MANIQUÍ (en la ventana del maniquí y en la barra de simulación): al soltarlo, la figura APOYA de verdad — glúteos sobre el asiento y espalda contra el respaldo, sin quedar flotando. Y SI EL RESPALDO VA TUMBADO —una prensa de piernas, un banco inclinado—, la figura SE RECUESTA con su misma inclinación para tocarlo de espalda entera, no sólo con la pelvis: ese apoyo es lo que la fija en la máquina, y sin él el empuje del tren inferior la sacaba del asiento. Apunta y el puntero va marcando dónde caería — verde sobre un APOYO ergonómico (asiento, respaldo, banco), azul sobre el SUELO. El clic lo deja puesto con su orientación: sentado sobre la cara del asiento mirando a su frente, o de pie mirando a la máquina más cercana. Vale en construcción y en simulación, en el Builder y en el Viewer. Sobre un banco reconoce si tocas un extremo o el medio: en el extremo se sienta mirando hacia fuera, con las piernas colgando por el borde, y en el medio se sienta de lado — se elige midiendo dónde caben las piernas, no por el nombre de las piezas de al lado.",
      "🦴 VENTANA DEL MANIQUÍ: una sola ventana con dos modos. En POSAR está todo lo que fija la postura de partida — postura guardada, agarrar, colocar, simetría, apoyo de manos y un SELECTOR DE ARTICULACIÓN con las ocho familias y su lado, para elegir cuál posar sin cazar el miembro en el visor. En SIMULAR está la ZONA del cuerpo que trabaja (tren superior, tren inferior, bisagra) con su lado: izquierda, derecha o los dos.",
      "EL MOVIMIENTO SE INSTRUYE POR ZONAS, NO POR ARTICULACIONES: la tecla 8 EMPUJA (aleja la carga del cuerpo) y la 9 TRACCIONA (la acerca). Cada zona mueve sus articulaciones con el signo que le toca por anatomía: en el TREN SUPERIOR el empuje extiende el codo MIENTRAS flexiona el hombro —direcciones opuestas, que es justo lo que un modelo articulación por articulación no podía hacer—; en el TREN INFERIOR extiende rodilla y cadera con acomodación dinámica del tobillo para mantener la planta apoyada; en la BISAGRA extiende cadera y espalda. La tracción es la inversa exacta. Marcando varias zonas el gesto sale simultáneo, y con el lado sale simétrico, asimétrico o sectorizado.",
      "EL PLANO LO PONE LA POSTURA DE PARTIDA, NO EL BOTÓN: con el hombro a la altura del pecho el empuje sale horizontal (press de pecho) y con los brazos arriba, vertical (press militar); la tracción igual, desde delante es remo y desde arriba, jalón. La biblioteca trae las cuatro posturas de partida —Empuje horizontal, Empuje vertical, Tracción horizontal, Tracción vertical— para que los cuatro movimientos clásicos salgan con dos botones.",
      "📌 PARTIDA DEL EJERCICIO: congela la postura del maniquí Y dónde está la máquina. Si el gesto es más fácil de montar desde el BLOQUEO —el final de la fase concéntrica—, arranca la simulación, lleva el conjunto móvil con la mano hasta ahí, acomoda la figura y pulsa 📌 Fijar partida: cada ▶ arrancará en ese punto y desde él saldrá la excéntrica. La partida vive aparte del diseño, que es el plano fabricable: parado sigues viendo y editando el diseño, y 🗑 Soltar máquina devuelve el arranque a él. El ↺ devuelve la figura a su postura de partida sin parar, y parar la simulación también.",
      "POSAR posa lo que toques: el candado NO manda aquí. Lo que fija la zona activa es qué mueve el gesto de 8/9 en SIMULAR, así que puedes posar una rodilla aunque el tren inferior no esté marcado.",
      "🦶 PISAR UNA SUPERFICIE O PEDAL: el pie no siempre toca el suelo. En una prensa de piernas pisa la plataforma, en una extensión de rodillas queda al aire (cadena abierta) y sentado en un banco alto cuelga. Toca la pierna de la figura y luego la pieza donde apoya: la IK resuelve cadera, rodilla y tobillo, y el pie VIAJA CON LA PIEZA — si el pedal sube, la pierna lo acompaña. Soltar apoyos suelta manos y pies. La PLACA NO TIENE QUE ESTAR A NIVEL NI POR DEBAJO DE TI: al pisar se guarda la cara que tocas, así que sobre la plataforma inclinada de una prensa —que va por encima y por delante— el pie se ACUESTA sobre la cara que te mira, con la puntera hacia arriba por la pendiente, en vez de salir del revés o atravesarla. Marca la cara que VES y el pie se pone en la de enfrente, que es la que se empuja. Y SI ESA PIEZA PUEDE CORRER por una guía, el tren inferior LA EMPUJA como un gran pedal: tú te quedas en el asiento y lo que viaja es la máquina. Si el punto que marcas le queda lejos a la pierna, el pie se apoya en el sitio más cercano de esa misma cara al que llega — una persona pisa donde alcanza.",
      "NADA DEL CUERPO QUEDA BAJO EL SUELO ni hundido en su apoyo, sea cual sea la pose. Si el banco es más bajo que la pierna, se ESTIRA LA RODILLA y se adelanta el pie, que es lo que hace una persona; y solo si aun estirada no llega, se levanta la figura — eso último es la señal de que ese asiento no le sirve a ese cuerpo. La corrección solo empuja hacia arriba: a un pie nunca se le fuerza a pisar.",
      "Se usan números y no los cursores ▲▼ porque esas teclas las reclama el navegador para recorrer los botones de la interfaz. La articulación NO se frena contra el hierro: recorre su rango entero y, si el cuerpo choca, se avisa — ese choque es la evidencia de que la máquina no deja sitio, no un fallo que haya que esconder.",
      "EL MANIQUÍ TIENE CUERPO: al simular, cada segmento entra al motor con su forma real, así que las piezas móviles CHOCAN con él en vez de atravesarlo. No se desploma ni lo arrastran (su postura la mandas tú), y manos y pies quedan sin cuerpo a propósito, porque son los puntos por los que agarra la máquina. Si la figura quedó encajada en la estructura, se aparta lo mínimo al colocarla o al arrancar y se te dice cuánto.",
      "ÚSALO COMO COMPROBACIÓN ERGONÓMICA: si al sentar el maniquí una estación pierde recorrido, no es un fallo de la simulación — es que la máquina no deja holgura suficiente para el cuerpo que va a usarla, igual que pasaría con una persona. Ahí tienes qué corregir en el diseño: separar el asiento, subir el pivote, acortar el brazo.",
      "Posa sus articulaciones arrastrando los ejes, guarda posturas y usa Apoyar mano para fijar las manos a un agarre (IK).",
      "✋ Agarrar maniquí (en Posturas): arrastra directamente un segmento del cuerpo; con 1/2/3 el movimiento se restringe a un eje.",
      "🏋 BARRA EN MANOS (grupo BARRA de la ventana del maniquí): elige el ejercicio y la barra aparece PUESTA en el cuerpo, con sus discos y su peso. Cuatro configuraciones —sentadilla frontal, sentadilla trasera, press vertical y peso muerto— cada una con sus DOS extremos del recorrido (△ Arriba y ▽ Fondo), porque un rack se dimensiona por dónde queda la barra arriba, para colgarla, y dónde queda abajo, para que los brazos de seguridad la cojan si falla.",
      "UN EJERCICIO NO ES UN REPARTO, ES UN CALENDARIO. Los cuatro gestos con barra traen su PLAN: qué articulaciones trabajan, en qué ORDEN y hasta dónde. El peso muerto se parte en dos fases —primero extensión de RODILLA hasta que la barra pasa la rótula, con el tronco sosteniendo su ángulo, y después extensión de CADERA y espalda hasta el bloqueo—, y el cambio de fase se lee del mundo en cada paso («¿ya está la barra por encima de la rodilla?»), no de un contador: por eso la bajada recorre las mismas posturas al revés sin guardar nada.",
      "Y CADA GESTO SE ACOMODA SOLO A LO QUE MANDA LA FÍSICA REAL, en cada paso y sin que haya que declararlo: el BRAZO cuelga como una cuerda desde el hombro y no como un puntal; la BARRA se queda sobre el medio del pie, que es lo que impide que la figura se caiga hacia atrás; la barra ROZA la espinilla, el muslo y la cadera pero no se hunde en ellos, así que en el peso muerto sube arrastrando como en el mundo real; la MIRADA no se suelta de una marca del suelo a 2,25 m mientras el tronco está inclinado —bajar en flexión cervical es lo que arriesga la espalda— y se queda en neutral, mirando al frente, en cuanto la figura se pone de pie.",
      "LA FRONTAL Y LA TRASERA SE DIFERENCIAN SOLAS, sin declararlo en ninguna parte: la barra va rígida al tronco pero apoyada en sitios distintos —clavículas por delante, trapecios por detrás—, así que dejar el mismo punto del suelo debajo pide inclinaciones distintas. La frontal mantiene el torso VERTICAL a costa de más rodilla y más tobillo; la trasera se inclina hasta 27° y usa más cadera. En las dos, la cadera ABDUCE al descender para que la postura no se cierre, y el pie PIVOTA sobre su propia huella —la puntera se abre 36°— sin deslizarse por el suelo.",
      "EL PRESS ESQUIVA LA CABEZA: la barra sale por delante del rostro con flexión de hombro y un grado de extensión cervical, describe una sigmoide que evita la cara y se recoloca en la vertical sobre la línea de equilibrio antes de que el codo termine de extender. No es una interpolación entre las dos puntas — es la trayectoria, y por eso no atraviesa la cabeza en ningún paso.",
      "DÓNDE APOYA NO ES LO MISMO EN LAS CUATRO: en los dos racks la barra la sostiene el CUERPO —deltoides y clavículas en la frontal, trapecios en la trasera— y su sitio se calcula por CONTACTO contra la malla del maniquí, así que apoya en la piel y no se hunde en ella; en press y peso muerto va en el puño. Doblar el codo lo enseña: en un rack la barra no se inmuta, en un press se va con la mano.",
      "⤓ RACKEAR: deja la barra en el gancho más cercano y libera al maniquí; ⤒ Desrackear se la devuelve. Los ganchos se leen solos de las piezas que saben recibir una barra (jotas, brazos de seguridad y cada diente de una placa dentada). Como un rack tiene DOS, se busca la pareja del gancho elegido y la barra se centra entre ambos.",
      "Poner la barra deja armada además la ZONA de movimiento del ejercicio, así que el 8/9 mueve lo que toca sin ir a marcarlo a mano.",
      "🔒 Candado: bloquea articulaciones para que no se muevan al posar (representa técnica y ejercicio con precisión); Simetría L↔R replica cada cambio espejado en el otro lado.",
      "Cada articulación dobla hacia SU lado anatómico: el CODO flexiona hacia delante (X negativa) y la RODILLA hacia atrás (X positiva), como en el cuerpo. Si guardaste posturas con una versión anterior, se migran solas al criterio correcto.",
      "TUS POSTURAS SE GUARDAN Y LAS DE FÁBRICA SE ACTUALIZAN. La biblioteca vive en el dispositivo: las que crees tú se conservan tal cual, y las de fábrica se refrescan con cada versión de la app SALVO las que hayas editado a mano, que se respetan. Así llegan las correcciones de los gestos sin pisar tu trabajo.",
    ],
  },
  {
    id: "simular",
    pregunta: "¿Cómo simulo la máquina?",
    puntos: [
      "▶ Simular (o Espacio) corre la física; los paneles se ocultan para máximo rendimiento.",
      "El puntero arranca en ÓRBITA: mirar la máquina no la mueve. La MANIPULACIÓN (✋) se elige a propósito y, al elegirla, la pieza que agarrarías SE RESALTA al pasar por encima — da igual que sea ergonómica (un asiento, un agarre) o estructural (un travesaño): lo que decide es el conjunto móvil al que pertenece. Si lo que hay delante está anclado, se te dice con su nombre.",
      "Con la simulación corriendo, ARRASTRA las piezas móviles con el dedo: es la mano interactiva. La fuerza de la mano SIEMPRE alcanza para operar los móviles, y la barra reporta la TENSIÓN MÁXIMA ejercida en kg y lb (✋ máx …).",
      "PIEZAS ARTICULADAS: si lo que agarras cuelga de una bisagra —el brazo de press de una torre, un pedal, una tapa— la mano SIGUE SU ARCO en vez de tirar contra el pasador, así que el brazo va detrás de tu dedo mientras recorres la curva que la máquina permite. Arrastra siguiendo ese arco (no en línea recta) y el recorrido sale entero; la tensión que se muestra es la que de verdad cuesta girarla.",
      "El pivote es RÍGIDO en todo lo que no sea su giro: aunque empujes un brazo por uno solo de sus dos agarres, el conjunto describe su semicircunferencia sobre el eje del pasador sin torcerse ni salirse de plano, y por eso tira del cable como en la máquina real. Los TOPES de la unión (Conexiones) definen dónde descansa y hasta dónde llega el recorrido.",
      "Si delante de la pieza que buscas hay algo ANCLADO (un montante, el respaldo), el agarre lo atraviesa y toma la primera pieza móvil que encuentre detrás: ya no hace falta orbitar para \"despejar\" el objetivo.",
      "El botón 🌐 cambia a la herramienta de ÓRBITA: el arrastre solo mueve la cámara para visualizar, sin tocar piezas; ✋ vuelve a la mano.",
      "DEMOSTRACIÓN DE MOVIMIENTO del maniquí: en el modo SIMULAR de la ventana 🦴 marca la ZONA que trabaja y su lado, y las teclas 8 y 9 la EMPUJAN y la TRACCIONAN dentro del rango humano. Con la zona activa la mano apoyada deja de mandar sobre el brazo: manda el gesto, y es el cuerpo el que empuja la pieza por contacto.",
      "CON UNA BARRA PUESTA, el 8/9 recorre el EJERCICIO y no un reparto: el gesto aterriza en la postura del modelo —no donde tope la primera articulación—, se parte en las fases que le tocan y la tracción las deshace en orden inverso, paso por paso y por las mismas posturas. Si a la figura se le acaba el recorrido, se avisa; ese aviso es la conclusión ergonómica, no un fallo.",
      "Las JOTAS y brazos de seguridad sostienen la barra en su CONCAVIDAD real: apoyada en el gancho queda retenida por el asiento y el tope, sin rodar ni deslizar fuera.",
      "Las CADENAS y correas son CUERDAS FLEXIBLES: cuelgan, ondulan y se hunden bajo la barra que cae (y la mecen); la caída definida al tenderlas fija su tensión inicial.",
      "Al detener, todo vuelve exactamente a su posición de diseño.",
    ],
  },
  {
    id: "prototipo",
    pregunta: "¿Cómo veo mis equipos en una FOTO de mi espacio real (prototipo)?",
    puntos: [
      "1) Configura el área de trabajo con las dimensiones del lugar REAL (planta libre o parámetros): que ambas superficies coincidan es lo que da un buen resultado. 2) Compón tu espacio colocando y armando los modelos.",
      "La función es una HERRAMIENTA DEL VIEWER: abre tu proyecto en Home → ▶ Simulador y pulsa 📸 Prototipo en su barra — solo quedan el visor, la órbita y la ventana de controles (⌂ Volver te regresa al viewer). En el viewer las piezas no se editan: sin gizmo, solo posturas del maniquí y arrastre de móviles en simulación.",
      "3) Carga la fotografía del lugar: entra el MODO CALCE — la foto queda DEBAJO del render, cuyo fondo se elimina pero cuyo SUELO se preserva. ORBITA hasta el punto de coincidencia entre el suelo del área de trabajo y el de la foto (el control Render regula la transparencia del solapamiento). Si la foto fue tomada desde otra ALTURA o DISTANCIA, activa 🖐 Mover y escalar foto: arrastrarla la desplaza y la pinza de dos dedos (o la rueda) le hace ZOOM en torno a los dedos; doble toque la recentra y el control Zoom foto afina el valor. Encuadre y zoom se conservan en la producción.",
      "4) 📌 Fija la perspectiva (la órbita queda bloqueada) y aparece la PERILLA 📐 DE INCLINACIÓN: gírala — o usa los pasos de 0,5° — para inclinar el modelo hasta que su suelo calce EXACTAMENTE con el de la fotografía (no toca el giro ni la distancia, solo el ángulo de la vista sobre el suelo). Después arrastra el ☀ en el selector circular para elegir desde dónde viene la luz — las sombras deben hacer sentido con la fotografía.",
      "5) 🎞 Producir fotografía renderiza por CAPAS: tu foto de fondo y, encima, el suelo del área de trabajo — vestido de goma tipo caucho con el logotipo discretamente impreso — con los modelos y las sombras que proyectan. El piloto queda en la galería de la Home y se descarga como PNG.",
    ],
  },
  {
    id: "marketplace",
    pregunta: "¿Qué es el Marketplace?",
    puntos: [
      "Es el HUB que junta a usuarios, makers y marcas en un showroom virtual: el dueño del gimnasio cotiza y simula la distribución de su sala con equipos reales, la marca expone su catálogo y el aficionado encuentra foro, patrocinio y quien le fabrique lo que dibujó. Se recorre por SIETE ventanas.",
      "🎉 NEWCOMERS: las marcas recién llegadas al hub estrenan su vitrina — historia, país, modelos escaneados y catálogo. ✨ NEW ARRIVALS: los estrenos de los últimos tres meses, del más reciente al más antiguo, más lo que viene.",
      "🌱 ECONOMÍA LOCAL: PyMEs y marcas que fabrican en TU país (lo eliges con las banderas y queda guardado); comprar ahí acorta el envío y deja el servicio y los repuestos a mano.",
      "🏬 VITRINA DIGITAL: la tienda. Arriba, las HISTORIAS de cada marca (formato Instagram: anillo, diapositivas, avance automático y toque a los lados) y su botón Ver productos deja el catálogo filtrado por esa marca. Abajo, el catálogo con BUSCADOR, filtro por categoría y carrito — que es el mismo en todas las ventanas.",
      "🔧 MAKERS: el foro de la comunidad DIY — diseños originales, búsqueda de patrocinio (con su barra de reservas y las marcas interesadas) y equipos de trabajo. Los hilos se responden con el prefab en la mano. Aquí vive también el mercado bidireccional: cotiza tu construcción o vende tu diseño.",
      "🪄 GOT A WISH: presenta TU diseño a las marcas y pide una valoración para fabricarlo. Viaja el prefab, la marca lo simula, y la conversación queda abierta con su estado (enviado · en revisión · presupuestado · en fabricación). Incluye la pintura de estructura y tapizado del encargo.",
      "🤝 JOIN EXERSUITE3D: la puerta de entrada de las marcas. Contacto → acuerdo y ficha → ESCÁNER FOTOGRÁFICO 3D del catálogo (unas 120 fotos por equipo más las medidas de fábrica) → publicación en la vitrina, las historias y la biblioteca.",
      "Desde la ficha de cualquier producto, Ver abre la BIBLIOTECA DE MODELOS: el showroom navegable de todas las piezas y máquinas, donde además se sustituyen por modelos 3D propios.",
      "Es una MAQUETA: las marcas son ficticias y las acciones comerciales no operan todavía (etiqueta DEMO), pero la navegación es la definitiva.",
    ],
  },
  {
    id: "biblioteca",
    pregunta: "¿Qué es la Biblioteca de modelos y cómo sustituyo piezas o máquinas?",
    puntos: [
      "Sustituye cualquier componente o segmento del maniquí por tu propio modelo 3D (.glb/.gltf/.obj/.stl).",
      "Pestaña Máquinas: cada máquina estándar se puede EXPORTAR como STL u OBJ (el ensamblaje completo), editar fuera y SUSTITUIR por tu versión corregida — al insertarla usará tu modelo.",
      "Ciclo de PREFABS por máquina: Exportar prefab (.json) descarga su definición pieza a pieza (componente, medidas, pose, uniones), la corriges en la app y con Sustituir por prefab pasa a ser la definición PERSISTENTE de esa máquina.",
      "Exportar ZIP descarga toda tu colección (incluidas las máquinas sustituidas); Importar ZIP la restaura o fusiona en otro dispositivo.",
    ],
  },
  {
    id: "archivos",
    pregunta: "¿Qué tipos de archivo maneja la app?",
    puntos: [
      "Guardar y abrir usan los diálogos NATIVOS del dispositivo: tú eliges dónde buscar y dónde guardar cada archivo (en Android se abre la app Archivos del sistema: memoria, Descargas, SD, Drive…).",
      "Proyecto .json: tu diseño completo (piezas, física, cables, maniquí); interoperable entre la app web, Windows y la versión Godot.",
      "Prefab .prefab.json (Archivo → Exportar prefab de la selección): una máquina editada como archivo ESTRUCTURADO que reconoce cada parte y su función (componente, nombre, medidas, material y pose); se reinserta con Archivo → Insertar prefab.",
      "Modelo .glb/.gltf/.obj/.stl: modelos 3D para sustituir componentes o segmentos del maniquí en la Biblioteca (los STL de CAD en milímetros se convierten solos a cm).",
      "Biblioteca .zip: tu colección completa de modelos, exportable e importable entre dispositivos.",
      "Captura .png: fotografías del visor tomadas en el Simulador (galería en la Home).",
    ],
  },
  {
    id: "guardar",
    pregunta: "¿Cómo guardo mi trabajo y ajusto el rendimiento?",
    puntos: [
      "Guardar descarga el proyecto .json (interoperable con la versión de escritorio y Godot); Exportar genera un .glb del prototipo.",
      "En Rendimiento elige preset Alto/Medio/Bajo, resolución de render y resolución dinámica según tu dispositivo.",
    ],
  },
];

/** Vuelca el instructivo (FAQ desplegable) dentro de un contenedor dado. */
export function renderInstructivo(contenedor: HTMLElement): void {
  for (const item of FAQ) {
    const ul = el("ul", {});
    for (const p of item.puntos) ul.append(el("li", {}, [p]));
    const cuerpo = el("div", { class: "faq-cuerpo" }, [ul]);
    // Capturas demostrativas opcionales (public/instructivo/<id>-1.png, -2…):
    // visibles por defecto; si el archivo no existe, la imagen se retira
    // sola (ocultarlas con display:none impediría que el lazy-load las
    // descargue jamás).
    // HASTA SEIS: el tope estaba en cuatro y dejaba fuera capturas que SÍ
    // existían —`marketplace-5.png` no se ha visto nunca—. Las que no existen
    // se retiran solas al fallar la descarga, así que subir el tope no cuesta
    // nada más que un 404 silencioso por hueco.
    for (let n = 1; n <= 6; n++) {
      const img = el("img", {
        class: "faq-img",
        src: `${import.meta.env.BASE_URL}instructivo/${item.id}-${n}.png`,
        alt: item.pregunta,
        loading: "lazy",
      });
      img.addEventListener("error", () => img.remove());
      cuerpo.append(img);
    }
    contenedor.append(
      el("details", { class: "faq-item" }, [
        el("summary", { class: "faq-pregunta" }, [item.pregunta]),
        cuerpo,
      ]),
    );
  }
}

export function mostrarInstructivo(): void {
  const cerrar = (): void => overlay.remove();

  const cuerpo = el("div", { class: "instr-cuerpo" });
  renderInstructivo(cuerpo);

  const cerrarBtn = el("button", { class: "tool" }, ["Cerrar"]);
  cerrarBtn.addEventListener("click", cerrar);

  const panel = el("div", { class: "perf-panel instr-panel" }, [
    el("div", { class: "lib-header" }, [
      el("div", { class: "lib-title" }, ["📖 Instructivo de uso"]),
      cerrarBtn,
    ]),
    cuerpo,
  ]);
  const overlay = el("div", { class: "lib-overlay" }, [panel]);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) cerrar();
  });
  window.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape") cerrar();
    },
    { once: true },
  );
  document.body.append(overlay);
}
