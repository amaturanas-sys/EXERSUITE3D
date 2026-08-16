/**
 * LÁMINAS DEL HUB: fotografía si la hay, dibujo si no.
 *
 * El hub nació con ilustraciones SVG en todos los huecos porque no había otra
 * cosa. Ahora una parte de esos huecos tiene fotografía de verdad y el resto
 * sigue con el dibujo, así que los dos caminos conviven y el que llama no tiene
 * que saber cuál le toca: pasa la foto si la tiene y ya está.
 *
 * Las fotografías viven en `public/marketplace/` y viajan DENTRO del paquete —
 * recortadas al encuadre en que se usan y en WebP—, porque dentro del APK y del
 * ejecutable de Windows no hay red garantizada. La ruta se arma con
 * `import.meta.env.BASE_URL` y no con una barra inicial: la aplicación no
 * siempre se sirve desde la raíz del dominio.
 */

import { el } from "../dom";

export const CARPETA_FOTOS = `${import.meta.env.BASE_URL}marketplace/`;

interface Opciones {
  /** Nombre del fichero dentro de `public/marketplace/`. Sin él, va el dibujo. */
  foto?: string;
  /** Texto alternativo. Vacío = decorativa, que es lo normal aquí. */
  alt?: string;
  /** Diferir la carga. Para lo que empieza fuera de pantalla. */
  diferida?: boolean;
  /**
   * Qué franja se conserva cuando el hueco es más apaisado que la fotografía.
   * Valor de `object-position`; por defecto el centro. Hace falta donde el
   * asunto no está en medio —una bandera colgada arriba desaparece del banner
   * si se recorta por el centro—.
   */
  foco?: string;
}

/**
 * Un hueco de imagen con la clase que le toque.
 *
 * El SVG lleva `preserveAspectRatio="slice"` y la fotografía `object-fit:
 * cover`, que hacen lo mismo: llenar el hueco recortando lo que sobre. Así los
 * dos caminos se comportan igual y el CSS del hueco no tiene que distinguirlos.
 */
export function lamina(arte: string, clase = "hub-foto", op: Opciones = {}): HTMLElement {
  const d = el("div", { class: clase });
  if (op.foto) {
    const img = el("img", {
      class: "hub-img",
      src: CARPETA_FOTOS + op.foto,
      alt: op.alt ?? "",
      decoding: "async",
    }) as HTMLImageElement;
    if (op.diferida) img.loading = "lazy";
    if (op.foco) img.style.objectPosition = op.foco;
    if (!op.alt) img.setAttribute("aria-hidden", "true");
    d.append(img);
  } else {
    d.innerHTML = `<svg viewBox="0 0 200 130" preserveAspectRatio="xMidYMid slice"
      width="100%" height="100%" aria-hidden="true">${arte}</svg>`;
  }
  return d;
}
