import { getIdioma } from "./i18n";

/**
 * SITIO DEL PROYECTO (v0.2.50).
 *
 * Dirección pública de la página de presentación y descarga. Vive en una sola
 * constante para que cambiar de dominio sea una línea, y se puede sobreescribir
 * en compilación con `VITE_SITIO_WEB` (útil para desplegar una preview o un
 * dominio propio sin tocar el código).
 */
export const SITIO_WEB: string =
  (import.meta.env.VITE_SITIO_WEB as string | undefined)?.replace(/\/+$/, "") ||
  "https://exersuite-3-d.vercel.app";

/** Cómo se lee la dirección en pantalla (sin protocolo: es más corta y clara). */
export const SITIO_WEB_VISIBLE: string = SITIO_WEB.replace(/^https?:\/\//, "");

/**
 * La misma dirección llevando el idioma de la app, para que el sitio abra en
 * el que ya está leyendo quien pulsa (la web respeta el parámetro `lang`).
 */
export function sitioWebConIdioma(): string {
  return `${SITIO_WEB}/?lang=${getIdioma()}`;
}
