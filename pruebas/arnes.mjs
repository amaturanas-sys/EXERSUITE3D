// EL ARNÉS: LAS PRUEBAS GOBIERNAN LA SIMULACIÓN POR PASOS (v0.4.10).
//
// Hasta v0.4.9 las pruebas medían con el reloj —«deja andar 12 s»— y el bucle de
// render convertía reloj en pasos de física según los fps que sacara la máquina.
// En el Chromium headless eso son ~3,6 fps, y dos corridas idénticas recibían
// distinto número de pasos: v0.4.8 midió 81 frente a 85 y con eso bastó para que
// el tope 1 de la banca cayera a un lado o al otro de su diente, y v0.4.9 vio el
// gesto de la mano recostar entre 21,7° y 31,7° según la corrida.
//
// Con este arnés la regla es una sola: **esperar es avanzar la física** mientras
// haya mundo físico (simulando o posando), en sub-pasos exactos de 1/60 —el
// mismo `ms` da siempre los mismos pasos—; y **esperar es dormir** cuando no lo
// hay, que es lo que necesitan la carga de proyectos y la UI. El mismo guion da
// el mismo mundo, vaya la máquina a los fps que vaya.
//
// Uso, justo después de `browser.newPage()` y ANTES del primer `page.goto`:
//
//   import { prepararPasos } from "./arnes.mjs";
//   const pausa = await prepararPasos(page);
//   ...
//   await pausa(1000);   // desde Node, en vez de page.waitForTimeout(1000)
//
// y dentro de `page.evaluate`, en vez de `new Promise((r) => setTimeout(r, ms))`:
//
//   await window.__pausa(1000);

/**
 * Deja la página lista para el paso manual y devuelve `pausa(ms)` para usar
 * desde Node. Tiene que llamarse antes del primer `goto`: el aviso a la app se
 * instala como script de arranque y cada editor que nazca lo hereda.
 */
export async function prepararPasos(page) {
  await page.addInitScript(() => {
    window.__EXERSUITE_PASO_MANUAL = true;
    window.__pausa = async (ms) => {
      const ed = window.exersuite?.editor;
      // Un arranque de simulación a medias (el WASM de Rapier carga en
      // asíncrono) se deja terminar: si no, la espera caería en «no hay mundo»,
      // dormiría sin avanzar y la prueba perdería ese tiempo simulado.
      for (let i = 0; i < 500 && ed?.startingSim; i++) {
        await new Promise((r) => setTimeout(r, 20));
      }
      if (ed?.physics) {
        // LA ENTRADA PENDIENTE, ANTES QUE LOS PASOS. En Chromium la rueda y el
        // `pointermove` son eventos continuos: no se despachan al llegar sino
        // alineados al siguiente fotograma de animación. Este `evaluate`, en
        // cambio, corre como tarea normal en cuanto llega. Sin esperar un
        // fotograma, los pasos de física se daban a veces ANTES de que la app
        // viera la muesca de rueda que la prueba acababa de mandar y a veces
        // después; y como `girarBisagra` acota el objetivo a una ventana
        // alrededor del ángulo actual, el orden cambiaba el resultado
        // (`prueba-bisagra-mano`: la rueda dejaba -49,5° o -40,4°). La entrada
        // se despacha al principio del fotograma, antes de los rAF: esperar
        // uno garantiza que ya se procesó.
        await new Promise((r) => requestAnimationFrame(() => r()));
        ed.avanzarSimulacion(ms / 1000);
        // Un respiro al hilo para que lo asíncrono de la app (avisos, render)
        // pueda correr, igual que lo tenía con el reloj.
        await new Promise((r) => setTimeout(r, 0));
      } else {
        await new Promise((r) => setTimeout(r, ms));
      }
    };
  });
  return (ms) => page.evaluate((t) => window.__pausa(t), ms);
}
