/**
 * ARRASTRE CON EL CURSOR SOBRE UN CARRIL.
 *
 * El dedo ya arrastra solo: una caja con `overflow-x: auto` se desplaza con el
 * gesto nativo del táctil, y ese gesto trae inercia y rebote que no conviene
 * reimplementar peor. Lo que falta es el RATÓN, que sobre esa misma caja no
 * hace nada salvo mover una barra que aquí está escondida. Por eso el módulo
 * solo se mete cuando `pointerType` es `mouse`.
 *
 * Dos cuidados que no son evidentes:
 *
 * - **Un arrastre no es un clic.** Al soltar, el navegador dispara `click` en
 *   lo que quedara debajo del cursor. Sin cuidado, arrastrar el carril de
 *   marcas terminaría filtrando por la marca sobre la que se soltó. Ese clic se
 *   traga en fase de captura si el puntero se movió más que el umbral.
 * - **El imán pelea con el arrastre.** Con `scroll-snap-type: x mandatory` el
 *   navegador corrige la posición en cada asignación de `scrollLeft`, y el
 *   carril se queda pegado a la diapositiva de partida por mucho que se tire.
 *   Se apaga mientras dura el gesto (clase `arrastrando`) y se vuelve a poner
 *   al soltar.
 */

/** Por debajo de esto es un clic con la mano temblona, no un arrastre. */
const UMBRAL = 6;

export function arrastrable(carril: HTMLElement, alSoltar?: () => void): void {
  let activo = false;
  let movio = false;
  let x0 = 0;
  let sl0 = 0;

  carril.addEventListener("pointerdown", (e) => {
    // El estado se limpia con CUALQUIER puntero, no solo con el ratón: si no,
    // un arrastre con el ratón dejaría marcado el carril y el siguiente toque
    // con el dedo perdería su clic.
    movio = false;
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    activo = true;
    x0 = e.clientX;
    sl0 = carril.scrollLeft;
  });

  carril.addEventListener("pointermove", (e) => {
    if (!activo) return;
    const dx = e.clientX - x0;
    if (!movio) {
      if (Math.abs(dx) < UMBRAL) return;
      movio = true;
      carril.classList.add("arrastrando");
      carril.setPointerCapture(e.pointerId);
    }
    carril.scrollLeft = sl0 - dx;
    e.preventDefault();
  });

  const soltar = (e: PointerEvent): void => {
    if (!activo) return;
    activo = false;
    if (!movio) return;
    carril.classList.remove("arrastrando");
    if (carril.hasPointerCapture(e.pointerId)) carril.releasePointerCapture(e.pointerId);
    alSoltar?.();
  };
  carril.addEventListener("pointerup", soltar);
  carril.addEventListener("pointercancel", soltar);

  // Se traga UN solo clic, el que cierra el arrastre, y se desarma acto
  // seguido. Dejarlo armado hasta el siguiente `pointerdown` parecía más
  // seguro y no lo era: un clic de teclado sobre la llamada a la acción no
  // trae puntero ninguno, así que se habría comido el primer Intro después de
  // cada arrastre.
  carril.addEventListener(
    "click",
    (e) => {
      if (!movio) return;
      movio = false;
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
