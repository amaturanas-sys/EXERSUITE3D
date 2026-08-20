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
 */
export function estirarPorElCentro(
  geo: THREE.BufferGeometry,
  eje: "x" | "y" | "z",
  largoObjetivo: number,
  extremosCm: number,
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

  // El NÚCLEO elástico es lo que queda entre los dos remates, medido desde el
  // centro de la pieza. Si los remates no caben, se recorta a la mitad del
  // largo para que siempre quede algo de núcleo que estirar.
  const remate = Math.max(0, Math.min(extremosCm, largo0 / 2 - 0.05));
  const nucleo = largo0 / 2 - remate;
  if (!(nucleo > 1e-3)) return geo;

  // Encoger más allá de los dos remates juntos plegaría la pieza sobre sí
  // misma: ahí está el suelo.
  const objetivo = Math.max(largoObjetivo, 2 * remate + 0.1);
  const delta = objetivo - largo0;
  if (Math.abs(delta) < 1e-4) return geo;

  const centro = (min + max) / 2;
  const factor = (nucleo + delta / 2) / nucleo;
  const arr = attr.array as Float32Array;
  const paso = attr.itemSize;
  const desplazamiento = eje === "x" ? 0 : eje === "y" ? 1 : 2;
  for (let i = desplazamiento; i < arr.length; i += paso) {
    const u = arr[i] - centro;
    if (u > nucleo) arr[i] = centro + u + delta / 2;
    else if (u < -nucleo) arr[i] = centro + u - delta / 2;
    else arr[i] = centro + u * factor;
  }
  attr.needsUpdate = true;
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
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
): number {
  if (!(largoFabrica > 1e-3) || !(largoObjetivo > 0)) return u;
  const remate = Math.max(0, Math.min(extremosCm, largoFabrica / 2 - 0.05));
  const nucleo = largoFabrica / 2 - remate;
  if (!(nucleo > 1e-3)) return u;
  const objetivo = Math.max(largoObjetivo, 2 * remate + 0.1);
  const delta = objetivo - largoFabrica;
  if (u > nucleo) return u + delta / 2;
  if (u < -nucleo) return u - delta / 2;
  return u * ((nucleo + delta / 2) / nucleo);
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
