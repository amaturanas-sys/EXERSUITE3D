// Mini helpers para construir DOM sin framework.

import { t } from "../core/i18n";

type ElProps<K extends keyof HTMLElementTagNameMap> = Partial<
  Omit<HTMLElementTagNameMap[K], "style">
> & { class?: string; style?: string } & { [atributo: `aria-${string}`]: string } & {
  [atributo: `data-${string}`]: string;
};

/**
 * Estética consistente (v0.2.1): TODO emoji de la interfaz se muestra como
 * SILUETA monocroma (filtro CSS en .emoji-sil), en lugar del glifo a color
 * que varía entre plataformas. Detecta rachas de pictogramas (con selectores
 * de variación, ZWJ y modificadores) y las envuelve en un span.
 */
const EMOJI_RE = /(?:\p{Extended_Pictographic}(?:[️‍]|\p{Emoji_Modifier})*)+/gu;

export function conEmojisSilueta(texto: string): (Node | string)[] {
  EMOJI_RE.lastIndex = 0;
  if (!EMOJI_RE.test(texto)) return [texto];
  EMOJI_RE.lastIndex = 0;
  const partes: (Node | string)[] = [];
  let ultimo = 0;
  for (const m of texto.matchAll(EMOJI_RE)) {
    const i = m.index ?? 0;
    if (i > ultimo) partes.push(texto.slice(ultimo, i));
    const span = document.createElement("span");
    span.className = "emoji-sil";
    span.textContent = m[0];
    partes.push(span);
    ultimo = i + m[0].length;
  }
  if (ultimo < texto.length) partes.push(texto.slice(ultimo));
  return partes;
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: ElProps<K> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  const { class: className, style, ...rest } = props;
  if (className) node.className = className;
  if (style) node.style.cssText = style;
  // i18n: los textos y títulos pasan por el diccionario (identidad en español).
  const r = rest as Record<string, unknown>;
  for (const attr of ["title", "placeholder", "alt"]) {
    if (typeof r[attr] === "string") r[attr] = t(r[attr] as string);
  }
  // LOS ATRIBUTOS CON GUION VAN POR setAttribute, NO POR Object.assign.
  // `Object.assign(node, { "aria-label": "Cerrar" })` no pone un atributo:
  // crea una propiedad JS llamada "aria-label" que no mira nadie, y el botón
  // se sigue anunciando como «equis, botón». Lo mismo con `role`, que sólo
  // refleja al atributo en navegadores recientes. Se separan aquí, de una vez,
  // para que escribir `aria-*` en cualquier `el()` funcione sin pensarlo.
  for (const clave of Object.keys(r)) {
    if (clave.includes("-") || clave === "role") {
      node.setAttribute(clave, String(r[clave]));
      delete r[clave];
    }
  }
  Object.assign(node, rest);
  for (const child of children) {
    if (typeof child === "string") node.append(...conEmojisSilueta(t(child)));
    else node.append(child);
  }
  return node;
}

export function clear(node: HTMLElement): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/**
 * UN BOTÓN ENCENDIDO, DICHO EN VOZ ALTA (v0.3.78).
 *
 * Por toda la interfaz hay botones que marcan estado con `classList.toggle`:
 * la herramienta activa, el eje elegido, la bisagra frente a la deslizadera,
 * el preset de calidad. La clase `.active` es fondo, color y negrita, así que
 * para quien ve funciona — pero un lector de pantalla lee «Simular» igual esté
 * corriendo o parado, y a quien no distingue el color no le queda ninguna
 * pista. `aria-pressed` es lo que convierte ese botón en un interruptor.
 *
 * `marcar` es para INTERRUPTORES (se enciende y se apaga). Para grupos donde
 * se elige uno de varios y eso es NAVEGAR —la sección de la portada, la
 * pestaña de la biblioteca— el atributo correcto es `aria-current`, y de eso
 * se encarga `marcarActual`.
 */
export function marcar(boton: HTMLElement, encendido: boolean, clase = "active"): void {
  boton.classList.toggle(clase, encendido);
  boton.setAttribute("aria-pressed", String(encendido));
}

/**
 * UN MODAL QUE SE PUEDE USAR SIN RATÓN (v0.3.78).
 *
 * En todo `src/ui/` había UNA sola llamada a `.focus()`. Los tres diálogos
 * modales —el de cambios sin guardar, el de las líneas y el de la biblioteca—
 * se añadían al DOM y el foco se quedaba donde estaba: DETRÁS del velo. El
 * peor era el de cambios sin guardar, que decide entre «guardar y salir» y
 * «salir sin guardar»: con teclado había que tabular a ciegas por toda la
 * aplicación hasta dar con él, y con lector de pantalla no se anunciaba nada.
 * Tampoco se cerraban con Escape (el clic en el velo sí, pero eso es ratón).
 *
 * No monta una trampa de foco completa: con `aria-modal` y el foco dentro está
 * cubierto lo que duele.
 *
 * @param alCancelar qué hacer con Escape. Si se omite, Escape no cierra.
 * @returns función que devuelve el foco a donde estaba, para llamar al cerrar.
 */
export function prepararModal(
  dialogo: HTMLElement,
  titulo: HTMLElement | null,
  focoInicial: HTMLElement | null,
  alCancelar?: () => void,
): () => void {
  dialogo.setAttribute("role", "dialog");
  dialogo.setAttribute("aria-modal", "true");
  if (titulo) {
    if (!titulo.id) titulo.id = `modal-tit-${Math.random().toString(36).slice(2, 9)}`;
    dialogo.setAttribute("aria-labelledby", titulo.id);
  }
  const previo = document.activeElement as HTMLElement | null;
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape" && alCancelar) {
      e.stopPropagation();
      alCancelar();
    }
  };
  if (alCancelar) window.addEventListener("keydown", onKey, true);
  // Tras insertarlo: un elemento sin renderizar no acepta el foco.
  requestAnimationFrame(() => focoInicial?.focus());
  return () => {
    if (alCancelar) window.removeEventListener("keydown", onKey, true);
    previo?.focus?.();
  };
}

/** Como `marcar`, pero para el «aquí estás» de un grupo de navegación. */
export function marcarActual(boton: HTMLElement, actual: boolean, clase = "active"): void {
  boton.classList.toggle(clase, actual);
  if (actual) boton.setAttribute("aria-current", "true");
  else boton.removeAttribute("aria-current");
}
