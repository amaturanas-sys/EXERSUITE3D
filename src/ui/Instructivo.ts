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
      "El modo Profesional muestra la paleta completa (despieces reales, roldanas, terminales), las conexiones (bisagras, correderas, cables) y el bloqueo de ejes.",
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
      "Máquinas estándar (arriba de la paleta): rack de sentadillas, jaula de potencia, banco plano, torre de polea, rack con torre TTP (construido con las piezas REALES del despiece: montantes con agujeros de calce, ganchos J de pin+giro, rieles porta-discos, multi-agarre y patines) y árbol de discos — con medidas comerciales, listas como grupo para plantear la sala.",
      "Pilar/travesaño (línea) y Tubo (línea): dos toques —origen y destino— con imán a extremos y puntos medios de otras piezas.",
      "Doblar (nodos): con una pieza de línea seleccionada, edita su trayectoria arrastrando los nodos como en las curvas de Photoshop.",
      "Cuerdas (cadena/correa): toca los dos anclajes (cualquier cara de una pieza, pared o techumbre) y define la CAÍDA en cm — la catenaria con la que cuelga.",
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
      "↺/↻ o Ctrl+Z/Ctrl+Y deshacen y rehacen (hasta 60 pasos).",
      "Menú Ver: grid, aristas de las piezas, modo de color (materiales reales · por categoría · neutro) y perspectivas Frontal/Lateral/Superior/Isométrica. Los botones +/− junto al visor ajustan el zoom.",
    ],
  },
  {
    id: "fisica",
    pregunta: "¿Cómo funcionan la física y las conexiones (cables y poleas)?",
    puntos: [
      "En Propiedades: material, masa (kg) y Anclado (las piezas ancladas o sin masa no caen).",
      "+ Bisagra y + Corredera articulan dos piezas (toca una y luego la otra).",
      "Roldana (paleta, en dos pasos): toca la ESTRUCTURA que la alojará (puedes orbitar para buscarla), su eje mayor aparece como línea AZUL; toca el punto del eje donde va y precisa tipo y dirección (arriba/abajo/izquierda/derecha según la vista). EXTERNA: nace con su MONTAJE (placa y mejillas) que la vincula a la estructura, nada queda flotando. INTERNA: se aloja DENTRO del perfil y produce el orificio rectangular en la cara adecuada para el tránsito del cable, como la viga del jalón alto TTP. El conjunto queda agrupado.",
      "Terminal de cable (paleta): coloca ojales de anclaje sobre cualquier cara; el cable VÁLIDO se dibuja en azul oscuro (destaca sobre el fondo claro) y el cable en ERROR se pinta en rojo si atraviesa material o entra torcido a una roldana.",
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
      "3) Carga la fotografía del lugar: entra el MODO CALCE — la foto queda DEBAJO del render, cuyo fondo se elimina pero cuyo SUELO se preserva. ORBITA hasta el punto de coincidencia entre el suelo del área de trabajo y el de la foto (el control Render regula la transparencia del solapamiento). Si la foto fue tomada desde otra ALTURA, activa 🖐 Mover foto y arrástrala para afinar la coincidencia (doble toque la recentra); el desplazamiento se conserva en la producción.",
      "4) 📌 Fija la perspectiva (la órbita queda bloqueada) y arrastra el ☀ en el selector circular para elegir desde dónde viene la luz — las sombras deben hacer sentido con la fotografía.",
      "5) 🎞 Producir fotografía renderiza por CAPAS: tu foto de fondo y, encima, el suelo del área de trabajo — vestido de goma tipo caucho con el logotipo discretamente impreso — con los modelos y las sombras que proyectan. El piloto queda en la galería de la Home y se descarga como PNG.",
    ],
  },
  {
    id: "biblioteca",
    pregunta: "¿Qué es la Biblioteca de modelos y cómo sustituyo piezas o máquinas?",
    puntos: [
      "Sustituye cualquier componente o segmento del maniquí por tu propio modelo 3D (.glb/.gltf/.obj/.stl).",
      "Pestaña Máquinas: cada máquina estándar del modo Sencillo se puede EXPORTAR como STL u OBJ (el ensamblaje completo), editar fuera y SUSTITUIR por tu versión corregida — al insertarla usará tu modelo.",
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
