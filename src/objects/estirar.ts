import * as THREE from "three";
import type { ComponentDefinition } from "./types";

/**
 * ALARGAR UNA PIEZA POR EL CENTRO (v0.3.2).
 *
 * Un brazo de seguridad, una barra de dominadas o un multi-agarre se acoplan
 * entre DOS pilares, y la separación entre pilares la decide quien arma la
 * estructura: la pieza tiene que poder calzar a la medida. Pero escalarla
 * entera la estropea — las placas de montaje de los extremos se estiran, los
 * ganchos se alargan, los agujeros se vuelven óvalos.
 *
 * Lo que hace falta es lo que se hace en el taller: cortar el tubo por la
 * mitad y meter (o quitar) un trozo recto. Los dos extremos viajan RÍGIDOS,
 * enteros, cada uno hacia su lado; solo se estira el tramo central, que es
 * prismático y donde estirar no se nota.
 *
 *      ┌──┤███████████████████├──┐   original
 *      ┌──┤██████████████████████████├──┐   más largo: los remates intactos
 *
 * `extremosCm` dice cuánto de cada punta es «remate» y no se deforma. El
 * mínimo al que se puede encoger la pieza es, por tanto, la suma de sus dos
 * remates.
 *
 * LA BANDA DESCENTRADA (v0.3.54). Lo de arriba da por hecho que lo liso está
 * en el centro y que los dos remates miden lo mismo. Hay piezas donde no: un
 * brazo en voladizo lleva la culata y la cartela por un lado, la fila de
 * agujeros y la pestaña por el otro, y lo único liso que tiene es un tramo
 * corto entre el talón y el primer agujero. Con `banda` —`[desde, hasta]` en cm
 * medidos desde el canto de la pieza— se estira EXACTAMENTE ahí y todo lo demás
 * viaja rígido. La pieza sigue creciendo centrada, igual que antes: lo que
 * cambia es POR DÓNDE se corta, no hacia dónde crece.
 */
export function estirarPorElCentro(
  geo: THREE.BufferGeometry,
  eje: "x" | "y" | "z",
  largoObjetivo: number,
  extremosCm: number,
  banda?: [number, number],
): THREE.BufferGeometry {
  const attr = geo.getAttribute("position") as THREE.BufferAttribute | undefined;
  if (!attr || !(largoObjetivo > 0)) return geo;
  geo.computeBoundingBox();
  const caja = geo.boundingBox;
  if (!caja) return geo;
  const min = caja.min[eje];
  const max = caja.max[eje];
  const largo0 = max - min;
  if (!(largo0 > 1e-3)) return geo;

  const centro = (min + max) / 2;
  const tramo = bandaDe(largo0, extremosCm, banda);
  if (!tramo) return geo;
  const { a, b } = tramo;
  const ancho = b - a;

  // Encoger más allá de lo que no estira plegaría la pieza sobre sí misma: ahí
  // está el suelo.
  const objetivo = Math.max(largoObjetivo, largo0 - ancho + 0.1);
  const delta = objetivo - largo0;
  if (Math.abs(delta) < 1e-4) return geo;

  const factor = (ancho + delta) / ancho;
  const arr = attr.array as Float32Array;
  const paso = attr.itemSize;
  const desplazamiento = eje === "x" ? 0 : eje === "y" ? 1 : 2;
  for (let i = desplazamiento; i < arr.length; i += paso) {
    arr[i] = centro + puntoEnBanda(arr[i] - centro, a, b, factor, delta);
  }
  attr.needsUpdate = true;
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * LA BANDA QUE ESTIRA, siempre medida desde el CENTRO de la pieza.
 *
 * Devuelve `[a, b]` con a < b. Sin `banda` declarada es la simétrica de toda la
 * vida —lo que queda entre los dos remates—; con ella, el tramo que la pieza
 * declaró, recortado a lo que de verdad hay dentro del bulto. Si no queda nada
 * que estirar, devuelve null y la pieza se deja como está.
 */
function bandaDe(
  largo0: number,
  extremosCm: number,
  banda?: [number, number],
): { a: number; b: number } | null {
  if (banda) {
    // Vienen medidos desde el canto; se pasan al centro, que es donde trabaja
    // el resto de la cuenta.
    const a = Math.max(-largo0 / 2, Math.min(banda[0], banda[1]) - largo0 / 2);
    const b = Math.min(largo0 / 2, Math.max(banda[0], banda[1]) - largo0 / 2);
    return b - a > 1e-3 ? { a, b } : null;
  }
  const remate = Math.max(0, Math.min(extremosCm, largo0 / 2 - 0.05));
  const nucleo = largo0 / 2 - remate;
  return nucleo > 1e-3 ? { a: -nucleo, b: nucleo } : null;
}

/**
 * A DÓNDE VA UN PUNTO cuando se estira la banda `[a, b]`. Lo de antes viaja
 * rígido hacia atrás y lo de después hacia delante, repartiendo `delta` de
 * forma que el CENTRO de la pieza no se mueva — que es lo que hacía la versión
 * simétrica y lo que el resto del editor da por hecho.
 */
function puntoEnBanda(
  u: number,
  a: number,
  b: number,
  factor: number,
  delta: number,
): number {
  // El desplazamiento que mantiene quieto el centro: la banda crece `delta` y
  // se reparte a partes iguales entre los dos lados.
  const mitad = delta / 2;
  if (u <= a) return u - mitad;
  if (u >= b) return u + mitad;
  return a + (u - a) * factor - mitad;
}

/**
 * A DÓNDE VA A PARAR UN PUNTO LOCAL cuando la pieza se alarga. Es la misma
 * cuenta que hace `estirarPorElCentro` sobre cada vértice, y hace falta para
 * lo que está CALIBRADO en la definición y no vive en la malla: el punto de
 * calce del manguito, por ejemplo, que está en el remate y por tanto tiene que
 * viajar rígido con él. `u` va medido desde el centro de la pieza.
 */
export function puntoTrasEstirar(
  u: number,
  largoFabrica: number,
  largoObjetivo: number,
  extremosCm: number,
  banda?: [number, number],
): number {
  if (!(largoFabrica > 1e-3) || !(largoObjetivo > 0)) return u;
  const tramo = bandaDe(largoFabrica, extremosCm, banda);
  if (!tramo) return u;
  const ancho = tramo.b - tramo.a;
  const objetivo = Math.max(largoObjetivo, largoFabrica - ancho + 0.1);
  const delta = objetivo - largoFabrica;
  return puntoEnBanda(u, tramo.a, tramo.b, (ancho + delta) / ancho, delta);
}

/** Largo actual de una geometría por uno de sus ejes locales (cm). */
export function largoDeGeometria(geo: THREE.BufferGeometry, eje: "x" | "y" | "z"): number {
  geo.computeBoundingBox();
  const c = geo.boundingBox;
  return c ? c.max[eje] - c.min[eje] : 0;
}

/**
 * Largo DE FÁBRICA de una pieza por uno de sus ejes locales (cm), leído de sus
 * `defaults`. Es la referencia contra la que se mide el largo a medida: la
 * malla que trae la biblioteca puede diferir en unas décimas, y eso no importa
 * porque lo que se compara siempre es la misma cifra.
 */
export function largoDeFabrica(def: ComponentDefinition, eje: "x" | "y" | "z"): number {
  const d = def.defaults;
  const v = eje === "x" ? d.width : eje === "y" ? d.height : d.depth;
  return v ?? 0;
}
