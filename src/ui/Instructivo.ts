import { el } from "./dom";

/**
 * Ventana de instrucciones de uso (se abre desde el botón "Instructivo" del
 * Home). Guía completa y compacta de todas las herramientas de la app.
 */

const SECCIONES: [string, string[]][] = [
  [
    "Primeros pasos",
    [
      "En el inicio elige Builder (diseñar) o Simulador (solo correr la física de un proyecto).",
      "Crea un proyecto nuevo, abre un archivo .json o continúa una sesión reciente.",
      "Al crear un proyecto el asistente pregunta el modo (Sencillo: piezas básicas · Profesional: todas las herramientas) y el espacio: canvas Libre (suelo infinito) o Completo, donde defines el suelo como rectángulo o DIBUJANDO su planta en metros (vértice a vértice, ideal para salas en L).",
      "En el canvas Completo la techumbre es una capa oscura copia fiel del suelo con sus alturas A/B y pendiente; las paredes N/S/E/O siguen el contorno y sirven de anclaje. Lo que sobresale del espacio se marca en rojo y su colocación se cancela.",
      "La escena se autoguarda en el dispositivo cada pocos segundos mientras trabajas.",
    ],
  ],
  [
    "Construir",
    [
      "Toca una pieza de la paleta para añadirla, o ARRÁSTRALA al visor para colocarla donde la sueltes (en táctil: mantén pulsado ~medio segundo y arrastra).",
      "Máquinas estándar (arriba de la paleta): rack de sentadillas, jaula de potencia, banco plano, torre de polea, rack con torre TTP (construido con las piezas REALES del despiece: montantes con agujeros de calce, ganchos J de pin+giro, rieles porta-discos, multi-agarre y patines) y árbol de discos — con medidas comerciales, listas como grupo para plantear la sala.",
      "Los paneles se pliegan tocando su título (⯆/⯈), para despejar el visor en pantallas pequeñas.",
      "Pilar/travesaño (línea) y Tubo (línea): dos toques —origen y destino— con imán a extremos y puntos medios de otras piezas.",
      "Doblar (nodos): con una pieza de línea seleccionada, edita su trayectoria arrastrando los nodos como en las curvas de Photoshop.",
      "Cuerdas (cadena/correa): toca los dos anclajes (cualquier cara de una pieza, pared o techumbre) y define la CAÍDA en cm — la catenaria con la que cuelga.",
    ],
  ],
  [
    "Editar con precisión",
    [
      "La barra agrupa las herramientas en menús: Archivo, Edición, Selección, Ver y Ejes.",
      "Toca para seleccionar; Ctrl+clic (o Shift) añade a la selección; Área (menú Selección) dibuja un recuadro que selecciona todo lo que abarca.",
      "Mover/Rotar/Escalar cambian el gizmo y Arrastrar lleva las piezas con el dedo (menú Selección).",
      "Teclas 1/2/3 (o el menú Ejes): bloquean TODO el trazado a un eje; 0 o Esc lo libera. La línea inferior muestra el desplazamiento en cm.",
      "Copiar/Pegar/Duplicar/Eliminar y Agrupar/Desagrupar viven en el menú Edición (Ctrl+C/V/D y Supr).",
      "↺/↻ o Ctrl+Z/Ctrl+Y deshacen y rehacen (hasta 60 pasos).",
      "Menú Ver: grid, aristas de las piezas, modo de color (materiales reales · por categoría · neutro) y perspectivas Frontal/Lateral/Superior/Isométrica.",
    ],
  ],
  [
    "Física y conexiones",
    [
      "En Propiedades: material, masa (kg) y Anclado (las piezas ancladas o sin masa no caen).",
      "+ Bisagra y + Corredera articulan dos piezas (toca una y luego la otra).",
      "Roldana (paleta): elige configuración interna (embutida en el pilar, la rueda asoma por la apertura) o externa (fuera de la cara) y tócala sobre la pieza — así defines ANTES los puntos de deslizamiento del cable.",
      "Terminal de cable (paleta): coloca ojales de anclaje sobre cualquier cara; el cable en ERROR se pinta en rojo si atraviesa material o entra torcido a una roldana.",
      "Lock switch en cada bisagra/corredera (Conexiones): bloqueada queda rígida en su pose — transforma una máquina de empuje horizontal en vertical con un clic.",
      "+ Cable traza un cable inextensible punto a punto: ancla A → roldanas de paso → ancla B (Finalizar cable). Las poleas dan ventaja mecánica real (2:1…).",
    ],
  ],
  [
    "Maniquí",
    [
      "Figura muestra el maniquí a escala; ajusta su altura en cm.",
      "Posa sus articulaciones arrastrando los ejes, guarda posturas y usa Apoyar mano para fijar las manos a un agarre (IK).",
      "✋ Agarrar maniquí (en Posturas): arrastra directamente un segmento del cuerpo; con 1/2/3 el movimiento se restringe a un eje.",
      "🔒 Candado: bloquea articulaciones para que no se muevan al posar (representa técnica y ejercicio con precisión); Simetría L↔R replica cada cambio espejado en el otro lado.",
    ],
  ],
  [
    "Simular",
    [
      "▶ Simular (o Espacio) corre la física; los paneles se ocultan para máximo rendimiento.",
      "Con la simulación corriendo, ARRASTRA las piezas móviles con el dedo: es la mano interactiva, como una persona usando la máquina.",
      "Al detener, todo vuelve exactamente a su posición de diseño.",
    ],
  ],
  [
    "Biblioteca de modelos",
    [
      "Sustituye cualquier componente o segmento del maniquí por tu propio modelo 3D (.glb/.gltf/.obj/.stl).",
      "Pestaña Máquinas: cada máquina estándar del modo Sencillo se puede EXPORTAR como STL u OBJ (el ensamblaje completo), editar fuera y SUSTITUIR por tu versión corregida — al insertarla usará tu modelo.",
      "Exportar ZIP descarga toda tu colección (incluidas las máquinas sustituidas); Importar ZIP la restaura o fusiona en otro dispositivo.",
    ],
  ],
  [
    "Tipos de archivo",
    [
      "Proyecto .json: tu diseño completo (piezas, física, cables, maniquí); interoperable entre la app web, Windows y la versión Godot.",
      "Modelo .glb/.gltf/.obj/.stl: modelos 3D para sustituir componentes o segmentos del maniquí en la Biblioteca (los STL de CAD en milímetros se convierten solos a cm).",
      "Biblioteca .zip: tu colección completa de modelos, exportable e importable entre dispositivos.",
      "Captura .png: fotografías del visor tomadas en el Simulador (galería en la Home).",
    ],
  ],
  [
    "Guardar y rendimiento",
    [
      "Guardar descarga el proyecto .json (interoperable con la versión de escritorio y Godot); Exportar genera un .glb del prototipo.",
      "En Rendimiento elige preset Alto/Medio/Bajo, resolución de render y resolución dinámica según tu dispositivo.",
    ],
  ],
];

/** Vuelca el contenido del instructivo dentro de un contenedor dado. */
export function renderInstructivo(contenedor: HTMLElement): void {
  for (const [titulo, puntos] of SECCIONES) {
    contenedor.append(el("h3", {}, [titulo]));
    const ul = el("ul", {});
    for (const p of puntos) ul.append(el("li", {}, [p]));
    contenedor.append(ul);
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
