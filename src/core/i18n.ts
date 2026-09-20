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

/**
 * EL DICCIONARIO NO VIAJA SI NO SE USA (v0.3.79).
 *
 * `TRADUCCIONES` pesa 120 kB del paquete de arranque —el 11 % del total— y
 * `t()` sólo lo lee cuando el idioma es inglés: en español no se consultaba
 * ni una vez, pero se descargaba entero igual. Ahora se carga aparte, y sólo
 * si hace falta.
 *
 * Se puede hacer porque el idioma está DECIDIDO ANTES de construir nada:
 * se lee de localStorage al cargar el módulo y cambiarlo recarga la página
 * (`setIdioma`). `cargarIdioma()` se espera en el arranque, antes de la
 * primera pantalla, así que para cuando alguien llama a `t()` el diccionario
 * ya está. Si algún día se llamara antes, `t()` devuelve el texto en español
 * en vez de romper — degrada, no falla.
 */
let dicc: Record<string, string> = {};

/** Trae el diccionario si el idioma lo necesita. Se espera en el arranque. */
export async function cargarIdioma(): Promise<void> {
  if (actual !== "en") return;
  dicc = (await import("./traducciones")).TRADUCCIONES;
}

/** Traduce una cadena del diccionario (identidad en español o sin entrada). */
export function t(texto: string): string {
  if (actual === "es") return texto;
  return dicc[texto] ?? texto;
}

/** Texto bilingüe directo (para cadenas dinámicas o con parámetros). */
export function tt(es: string, en: string): string {
  return actual === "en" ? en : es;
}
