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
      "La escena se autoguarda en el dispositivo cada pocos segundos mientras trabajas.",
    ],
  ],
  [
    "Construir",
    [
      "Toca una pieza de la paleta izquierda y luego el suelo para colocarla.",
      "Pilar/travesaño (línea) y Tubo (línea): dos toques —origen y destino— con imán a extremos y puntos medios de otras piezas.",
      "Doblar (nodos): con una pieza de línea seleccionada, edita su trayectoria arrastrando los nodos como en las curvas de Photoshop.",
      "Cuerdas (cadena/correa): toca los dos extremos; quedan colgando con su catenaria.",
    ],
  ],
  [
    "Editar con precisión",
    [
      "Toca para seleccionar; Ctrl+clic (o Shift) añade a la selección; el botón Área dibuja un recuadro que selecciona todo lo que abarca.",
      "Mover/Rotar/Escalar cambian el gizmo; Arrastrar lleva las piezas directamente con el dedo.",
      "Teclas 1/2/3 (o botones X/Y/Z): bloquean TODO el trazado a un eje; 0 o Esc lo libera. La línea inferior muestra el desplazamiento en cm.",
      "Copiar/Pegar/Duplicar/Eliminar desde la barra o con Ctrl+C/V/D y Supr.",
      "↺/↻ o Ctrl+Z/Ctrl+Y deshacen y rehacen (hasta 60 pasos).",
      "Agrupar une varias piezas en un subensamblaje que se mueve como bloque.",
    ],
  ],
  [
    "Física y conexiones",
    [
      "En Propiedades: material, masa (kg) y Anclado (las piezas ancladas o sin masa no caen).",
      "+ Bisagra y + Corredera articulan dos piezas (toca una y luego la otra).",
      "+ Cable traza un cable inextensible por poleas: toca los puntos de paso y Finalizar cable. Las poleas dan ventaja mecánica real (2:1…).",
    ],
  ],
  [
    "Maniquí",
    [
      "Figura muestra el maniquí a escala; ajusta su altura en cm.",
      "Posa sus articulaciones arrastrando los ejes, guarda posturas y usa Apoyar mano para fijar las manos a un agarre (IK).",
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
      "Sustituye cualquier componente o segmento del maniquí por tu propio modelo 3D (.glb/.gltf/.obj).",
      "Exportar ZIP descarga toda tu colección; Importar ZIP la restaura o fusiona en otro dispositivo.",
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

export function mostrarInstructivo(): void {
  const cerrar = (): void => overlay.remove();

  const cuerpo = el("div", { class: "instr-cuerpo" });
  for (const [titulo, puntos] of SECCIONES) {
    cuerpo.append(el("h3", {}, [titulo]));
    const ul = el("ul", {});
    for (const p of puntos) ul.append(el("li", {}, [p]));
    cuerpo.append(ul);
  }

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
