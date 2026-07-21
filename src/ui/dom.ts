// Mini helpers para construir DOM sin framework.

import { t } from "../core/i18n";

type ElProps<K extends keyof HTMLElementTagNameMap> = Partial<
  Omit<HTMLElementTagNameMap[K], "style">
> & { class?: string; style?: string };

/**
 * Estética consistente (v0.2.1): TODO emoji de la interfaz se muestra como
 * SILUETA monocroma (filtro CSS en .emoji-sil), en lugar del glifo a color
 * que varía entre plataformas. Detecta rachas de pictogramas (con selectores
 * de variación, ZWJ y modificadores) y las envuelve en un span.
 */
const EMOJI_RE = /(?:\p{Extended_Pictographic}(?:[️‍]|\p{Emoji_Modifier})*)+/gu;

function conEmojisSilueta(texto: string): (Node | string)[] {
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
