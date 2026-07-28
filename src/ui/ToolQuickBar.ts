import type { Editor, HerramientaRapida } from "../core/Editor";
import { tt } from "../core/i18n";

/**
 * BARRA DE HERRAMIENTAS RÁPIDAS (v0.2.13): seis atajos cuadrados con icono
 * — selección única, selección de área, mover, rotar, escalar y orbitar —
 * anclados al borde derecho del visor. Cambiar de herramienta de forma
 * explícita y visible agiliza el flujo y evita modificaciones o arrastres
 * inadvertidos (con selección/orbitar el gizmo queda inactivo; con orbitar
 * el clic ni siquiera cambia la selección).
 */

const SVG = (contenido: string): string =>
  `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${contenido}</svg>`;

const ICONOS: Record<HerramientaRapida, string> = {
  seleccion: SVG('<path d="M5 3l14 8.6-6.1 1.3L10.6 20z" fill="currentColor" stroke="none"/>'),
  area: SVG(
    '<rect x="3.5" y="4.5" width="14" height="12" stroke-dasharray="3.5 2.6"/><path d="M14 13.5l6 4.4-3.1.7-1.2 3z" fill="currentColor" stroke="none"/>',
  ),
  mover: SVG(
    '<path d="M12 3v18M3 12h18"/><path d="M12 3l-2.6 2.6M12 3l2.6 2.6M12 21l-2.6-2.6M12 21l2.6-2.6M3 12l2.6-2.6M3 12l2.6 2.6M21 12l-2.6-2.6M21 12l-2.6 2.6"/>',
  ),
  rotar: SVG('<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.8 3.5v3.9h-3.9"/>'),
  escalar: SVG(
    '<rect x="4" y="11" width="9" height="9"/><path d="M13.5 10.5L20 4M20 4h-4.6M20 4v4.6"/>',
  ),
  orbitar: SVG(
    '<circle cx="12" cy="12" r="3.6"/><ellipse cx="12" cy="12" rx="9.5" ry="4.2" transform="rotate(-24 12 12)"/>',
  ),
};

export function crearBarraHerramientas(editor: Editor): HTMLElement {
  const bar = document.createElement("div");
  bar.id = "tool-quick";
  const defs: [HerramientaRapida, string][] = [
    ["seleccion", tt("Selección única: el clic solo selecciona", "Single select: click only selects")],
    ["area", tt("Selección de área (recuadro)", "Area select (marquee)")],
    ["mover", tt("Mover con el gizmo", "Move with the gizmo")],
    ["rotar", tt("Rotar con el gizmo", "Rotate with the gizmo")],
    ["escalar", tt("Escalar con el gizmo", "Scale with the gizmo")],
    ["orbitar", tt("Orbitar: solo la cámara, sin tocar piezas", "Orbit: camera only, pieces untouched")],
  ];
  const botones = new Map<HerramientaRapida, HTMLButtonElement>();
  for (const [tool, titulo] of defs) {
    const b = document.createElement("button");
    b.className = "tool tq-btn";
    b.title = titulo;
    b.setAttribute("aria-label", titulo);
    b.innerHTML = ICONOS[tool];
    b.addEventListener("click", () => editor.setHerramienta(tool));
    botones.set(tool, b);
    bar.appendChild(b);
  }
  const marcar = (tool: HerramientaRapida) => {
    for (const [t, b] of botones) b.classList.toggle("activa", t === tool);
  };
  marcar(editor.getHerramienta());
  editor.bus.on("herramientaChanged", ({ tool }) => marcar(tool));
  return bar;
}
