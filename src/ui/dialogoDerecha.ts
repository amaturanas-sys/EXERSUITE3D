/**
 * EL DIÁLOGO DEL COSTADO DERECHO, con un dueño.
 *
 * Los paneles de configuración de la roldana y de la bisagra se añaden a
 * `<body>` por su cuenta y ponen la clase `dialogo-derecha`, que es la que
 * repliega la ventana del maniquí. Hasta aquí SOLO ELLOS podían cerrarse: con
 * su ✕, con un botón de dirección o con Escape. Cambiar de herramienta o volver
 * a la Home cancelaba el modo por dentro pero dejaba el panel colgado con los
 * botones muertos —y, peor, con la ventana del maniquí escondida y sin ninguna
 * pista de cómo recuperarla—.
 *
 * Con esto hay un único hueco: se abre uno, se cierra el anterior, y cualquiera
 * puede cerrar el que haya sin saber cuál es. La clase del `<body>` la maneja
 * este módulo, no cada panel, que es lo que garantiza que no se quede puesta.
 */

let cerrarActual: (() => void) | null = null;

/**
 * Registra el panel recién abierto y cierra el que hubiera. `cerrar` debe
 * limpiar SOLO lo del panel (quitarlo del DOM, soltar sus oyentes y resolver su
 * promesa): la clase del `<body>` se pone y se quita aquí.
 */
export function abrirDialogoDerecha(cerrar: () => void): void {
  cerrarDialogoDerecha();
  cerrarActual = cerrar;
  document.body.classList.add("dialogo-derecha");
}

/**
 * Cierra el panel abierto, si lo hay. Se vacía el registro ANTES de llamar al
 * cierre para que un panel que se cierre a sí mismo —su ✕, su Escape— no entre
 * en bucle al pasar por aquí.
 */
export function cerrarDialogoDerecha(): void {
  const cerrar = cerrarActual;
  cerrarActual = null;
  document.body.classList.remove("dialogo-derecha");
  cerrar?.();
}

/** ¿Hay un panel abierto en el costado derecho? */
export function hayDialogoDerecha(): boolean {
  return cerrarActual !== null;
}
