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
      "Copiar/Pegar/Duplicar/Eliminar y Agrupar/Desagrupar viven en el menú Edición (Ctrl+C/V/D y Supr).",
      "GRUPOS: selecciona dos o más piezas (Mayús+toque o Selección de área) y Edición → Agrupar las une en un subensamblaje. Si alguna ya pertenece a un conjunto — el de una roldana (rueda + eje) o una máquina insertada —, ese conjunto se ABSORBE entero en el grupo nuevo, sin dejar piezas fuera. Después, tocar CUALQUIER pieza del grupo selecciona el grupo completo (Mayús+toque lo añade a una multiselección), y Desagrupar lo devuelve a piezas sueltas.",
      "Un grupo se mueve, gira y escala como un bloque —con el gizmo o con los números exactos de Propiedades— y su MECÁNICA viaja con él: las bisagras y correderas conservan su punto y su eje al girarlo, así que la máquina sigue funcionando en la simulación.",
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
      "+ Bisagra instala una BISAGRA REAL: toca la 1ª pieza y luego la 2ª y el panel del costado derecho pide el eje de giro (Auto, X, Y o Z global), la CARA DE MONTAJE, el tamaño de las placas y el recorrido en grados. Se montan DOS PLACAS PLANAS —una sobre la cara de cada pieza— y el PASADOR cilíndrico que las articula; cada placa queda SOLDADA a su pieza, así que lo que gira en la simulación es exactamente el herraje que ves. El conjunto queda agrupado como \"Bisagra\" y puedes moverlo o borrarlo como una sola cosa.",
      "LA CARA DECIDE HACIA DÓNDE PLIEGA, igual que en el mundo real: montada arriba, las dos piezas topan entre sí en cuanto la bisagra intenta cerrar hacia abajo (el material lo impide); montada abajo, ese mismo conjunto flexiona. Para lograrlo, las dos piezas unidas por una bisagra real SIGUEN CHOCANDO entre sí en la simulación — el interruptor \"Las piezas chocan entre sí\" de cada unión (Conexiones) lo controla, y conviene dejarlo apagado en pivotes donde las piezas se solapan a propósito, como un brazo metido en su anclaje.",
      "+ Corredera articula dos piezas con un deslizamiento (toca una y luego la otra).",
      "SOLDADURAS: una unión BLOQUEADA (Lock switch) deja de ser articulación y pasa a ser una SOLDADURA — las piezas unidas se simulan como UN SOLO CUERPO rígido con la masa de todas. Es lo que hace que un brazo compuesto (brazo + extensión soldada) pivote entero en su sitio en vez de salir despedido. Sus marcadores se dibujan pequeños y grises para distinguirlos de las articulaciones libres.",
      "Roldana (paleta, en dos pasos): toca la ESTRUCTURA que la alojará (puedes orbitar para buscarla), su eje mayor aparece como línea AZUL; toca el punto del eje donde va y el panel del costado derecho pide montaje y dirección — arriba/abajo/derecha/izquierda/anterior/posterior en los ejes GLOBALES, y el modelo se sigue viendo y orbitando mientras eliges. EXTERNA: nace con su MONTAJE (placa y mejillas) que la vincula a la estructura, nada queda flotando. INTERNA: se aloja DENTRO del perfil montada en un EJE que apoya en sus dos paredes, y CALA la estructura elegida con dos agujeros iguales y pasantes en las caras que quedan sobre y bajo la rueda (⊥ a su eje de giro) — el cable entra y sale sin obstruirse y la rueda cabe entera sin chocar con la cara, como el soporte de polea alta del TTP. El conjunto (rueda + eje) queda agrupado, y si luego agrupas la máquina entera se absorbe dentro de ella.",
      "Terminal de cable (paleta): coloca ojales de anclaje sobre cualquier cara; el cable VÁLIDO se dibuja en azul oscuro (destaca sobre el fondo claro) y el cable en ERROR se pinta en rojo si atraviesa material o entra torcido a una roldana.",
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
      "Posa sus articulaciones arrastrando los ejes, guarda posturas y usa Apoyar mano para fijar las manos a un agarre (IK).",
      "✋ Agarrar maniquí (en Posturas): arrastra directamente un segmento del cuerpo; con 1/2/3 el movimiento se restringe a un eje.",
      "🔒 Candado: bloquea articulaciones para que no se muevan al posar (representa técnica y ejercicio con precisión); Simetría L↔R replica cada cambio espejado en el otro lado.",
    ],
  },
  {
    id: "simular",
    pregunta: "¿Cómo simulo la máquina?",
    puntos: [
      "▶ Simular (o Espacio) corre la física; los paneles se ocultan para máximo rendimiento.",
      "Con la simulación corriendo, ARRASTRA las piezas móviles con el dedo: es la mano interactiva. La fuerza de la mano SIEMPRE alcanza para operar los móviles, y la barra reporta la TENSIÓN MÁXIMA ejercida en kg y lb (✋ máx …).",
      "El botón 🌐 cambia a la herramienta de ÓRBITA: el arrastre solo mueve la cámara para visualizar, sin tocar piezas; ✋ vuelve a la mano.",
      "DEMOSTRACIÓN DE MOVIMIENTO del maniquí: elige la articulación FOCAL en el selector de la barra y los cursores ▲/▼ (o las flechas del teclado) la flexionan y extienden dentro del rango de movimiento humano — las articulaciones fijadas con candado (Posturas) no se mueven y el resto del cuerpo sigue la cadena.",
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
    for (let n = 1; n <= 4; n++) {
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
