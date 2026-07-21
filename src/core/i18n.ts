import { TRADUCCIONES } from "./traducciones";

/**
 * Internacionalización ES/EN (v0.2.1). El idioma se fija por carga de página
 * (cambiarlo recarga la app): así toda la UI, que se construye una única vez,
 * queda consistente sin re-render. `t()` traduce cadenas del diccionario y el
 * helper el() del DOM la aplica automáticamente a textos y títulos; `tt()`
 * resuelve textos dinámicos o parametrizados en el punto de uso.
 */

export type Idioma = "es" | "en";

const KEY = "exersuite.idioma";

let actual: Idioma = "es";
try {
  actual = localStorage.getItem(KEY) === "en" ? "en" : "es";
} catch {
  actual = "es";
}

export function getIdioma(): Idioma {
  return actual;
}

export function setIdioma(idioma: Idioma): void {
  try {
    localStorage.setItem(KEY, idioma);
  } catch {
    /* sin almacenamiento: el idioma no persistirá */
  }
  window.location.reload();
}

/** Traduce una cadena del diccionario (identidad en español o sin entrada). */
export function t(texto: string): string {
  if (actual === "es") return texto;
  return TRADUCCIONES[texto] ?? texto;
}

/** Texto bilingüe directo (para cadenas dinámicas o con parámetros). */
export function tt(es: string, en: string): string {
  return actual === "en" ? en : es;
}
