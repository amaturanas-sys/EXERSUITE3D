/**
 * ARRASTRE CON EL CURSOR SOBRE UN CARRIL.
 *
 * El dedo ya arrastra solo: una caja con `overflow-x: auto` se desplaza con el
 * gesto nativo del táctil, y ese gesto trae inercia y rebote que no conviene
 * reimplementar peor. Lo que falta es el RATÓN, que sobre esa misma caja no
 * hace nada salvo mover una barra que aquí está escondida. Por eso el módulo
 * solo se mete cuando `pointerType` es `mouse`.
 *
 * Cuatro cuidados, todos aprendidos a base de romperlo:
 *
 * - **Un arrastre no es un clic.** Al soltar, el navegador dispara `click` en
 *   lo que quedara debajo del cursor. Sin cuidado, arrastrar el carril de
 *   marcas terminaría filtrando por la marca sobre la que se soltó. Se traga
 *   UN clic en fase de captura, y solo si llega pisándole los talones al
 *   arrastre: si el botón se suelta fuera de la página no habrá clic ninguno, y
 *   el seguro no puede quedarse armado esperándolo.
 *
 * - **El gesto se cierra desde la VENTANA, no desde el carril.** Escuchando
 *   solo aquí, soltar el botón fuera dejaba el gesto abierto para siempre: el
 *   siguiente paseo del ratón, sin pulsar nada, arrastraba el carril. Las
 *   escuchas de ventana se ponen al empezar y se quitan al terminar, que
 *   además evita que se acumulen cada vez que se abre el hub.
 *
 * - **Un segundo puntero no manda sobre el primero.** Un toque con el dedo en
 *   mitad de un arrastre con el ratón cerraba el gesto a medias y dejaba la
 *   clase puesta. Cada evento se compara contra el `pointerId` del gesto en
 *   curso.
 *
 * - **Sin desbordamiento no hay arrastre.** En un carril cuyo contenido cabe
 *   entero —las siete burbujas de marca en un escritorio— tirar del ratón no
 *   mueve nada, así que tampoco puede tragarse el clic: el usuario no vería
 *   moverse nada y su clic desaparecería.
 *
 * - **El imán pelea con el arrastre.** Con `scroll-snap-type: x mandatory` el
 *   navegador corrige la posición en cada asignación de `scrollLeft`, y el
 *   carril se queda pegado a la diapositiva de partida por mucho que se tire.
 *   Se apaga mientras dura el gesto (clase `arrastrando`).
 */

/** Por debajo de esto es un clic con la mano temblona, no un arrastre. */
const UMBRAL = 6;

/** Cuánto vale el seguro anticlic desde que se suelta. */
const VENTANA_CLIC = 400;

export function arrastrable(carril: HTMLElement, alSoltar?: () => void): void {
  /** Puntero del gesto en curso; `null` si no hay ninguno. */
  let id: number | null = null;
  let movio = false;
  let cerradoEn = -Infinity;
  let x0 = 0;
  let sl0 = 0;

  const desborda = (): boolean => carril.scrollWidth - carril.clientWidth > 1;

  const mover = (e: PointerEvent): void => {
    if (id === null || e.pointerId !== id) return;
    // El botón se soltó donde no nos enteramos (fuera de la ventana, sobre el
    // marco del navegador). Sin esto el carril seguiría al cursor suelto.
    if (!(e.buttons & 1)) {
      cerrar();
      return;
    }
    const dx = e.clientX - x0;
    if (!movio) {
      if (Math.abs(dx) < UMBRAL) return;
      movio = true;
      carril.classList.add("arrastrando");
    }
    carril.scrollLeft = sl0 - dx;
    e.preventDefault();
  };

  const soltar = (e: PointerEvent): void => {
    if (id === null || e.pointerId !== id) return;
    cerrar();
  };

  function cerrar(): void {
    if (id === null) return;
    id = null;
    window.removeEventListener("pointermove", mover);
    window.removeEventListener("pointerup", soltar);
    window.removeEventListener("pointercancel", soltar);
    if (!movio) return;
    carril.classList.remove("arrastrando");
    cerradoEn = performance.now();
    alSoltar?.();
  }

  carril.addEventListener("pointerdown", (e) => {
    if (id !== null) {
      // Segundo puntero: se abandona el gesto en curso en vez de dejarlo a
      // medias, y no se empieza otro.
      cerrar();
      return;
    }
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    if (!desborda()) return;
    id = e.pointerId;
    movio = false;
    x0 = e.clientX;
    sl0 = carril.scrollLeft;
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", soltar);
  });

  carril.addEventListener(
    "click",
    (e) => {
      if (!movio) return;
      movio = false;
      // Solo se traga el clic que cierra el arrastre. Si el gesto acabó fuera
      // de la página no habrá clic, y el seguro caduca solo en vez de comerse
      // el siguiente —que puede venir del teclado, sin puntero ninguno—.
      if (performance.now() - cerradoEn > VENTANA_CLIC) return;
      e.stopPropagation();
      e.preventDefault();
    },
    true,
  );
}

/** Si el sistema pide poco movimiento, los saltos del carrusel son secos. */
export function suavidad(): ScrollBehavior {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}
