// Mini helpers para construir DOM sin framework.

import { t } from "../core/i18n";

type ElProps<K extends keyof HTMLElementTagNameMap> = Partial<
  Omit<HTMLElementTagNameMap[K], "style">
> & { class?: string; style?: string };

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
    node.append(typeof child === "string" ? document.createTextNode(t(child)) : child);
  }
  return node;
}

export function clear(node: HTMLElement): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}
