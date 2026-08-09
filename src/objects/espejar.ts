import * as THREE from "three";

/**
 * ESPEJADO HORNEADO EN LA GEOMETRÍA (v0.2.32).
 *
 * Voltear una pieza con una ESCALA NEGATIVA (mesh.scale.x *= -1) la deja bien
 * dibujada pero rompe todo lo demás: el gizmo hereda la matriz del objeto, así
 * que su flecha +X apunta a −X del mundo y los arrastres van al revés; las
 * cajas locales salen con tamaños negativos y los colisionadores se generan
 * espejados respecto de la malla.
 *
 * En su lugar el volteo se HORNEA en los vértices: la pieza se ve igual, su
 * escala sigue siendo positiva y sus ejes locales continúan concordando con
 * los del mundo. Los ejes espejados viajan en `params.espejo`, de modo que el
 * volteo sobrevive a reconstruir la geometría, guardar el proyecto y exportar
 * un prefab.
 */

/** Invierte la orientación de las caras (un espejo impar las deja del revés). */
function invertirCaras(geo: THREE.BufferGeometry): void {
  const idx = geo.getIndex();
  if (idx) {
    for (let i = 0; i + 2 < idx.count; i += 3) {
      const a = idx.getX(i);
      idx.setX(i, idx.getX(i + 2));
      idx.setX(i + 2, a);
    }
    idx.needsUpdate = true;
    return;
  }
  for (const nombre of Object.keys(geo.attributes)) {
    const attr = geo.attributes[nombre];
    for (let i = 0; i + 2 < attr.count; i += 3) {
      for (let c = 0; c < attr.itemSize; c++) {
        const t = attr.getComponent(i, c);
        attr.setComponent(i, c, attr.getComponent(i + 2, c));
        attr.setComponent(i + 2, c, t);
      }
    }
    attr.needsUpdate = true;
  }
}

/**
 * Espeja la geometría IN SITU en los ejes locales marcados: niega la
 * coordenada y la normal de cada vértice y, si el número de ejes es impar,
 * corrige el sentido de las caras para que las normales sigan mirando afuera.
 */
export function espejarGeometria(
  geo: THREE.BufferGeometry,
  ejes: readonly [boolean, boolean, boolean] | undefined,
): THREE.BufferGeometry {
  if (!ejes) return geo;
  const n = (ejes[0] ? 1 : 0) + (ejes[1] ? 1 : 0) + (ejes[2] ? 1 : 0);
  if (n === 0) return geo;

  const pos = geo.getAttribute("position");
  const nor = geo.getAttribute("normal");
  for (let a = 0; a < 3; a++) {
    if (!ejes[a]) continue;
    if (pos) {
      for (let i = 0; i < pos.count; i++) pos.setComponent(i, a, -pos.getComponent(i, a));
    }
    if (nor) {
      for (let i = 0; i < nor.count; i++) nor.setComponent(i, a, -nor.getComponent(i, a));
    }
  }
  if (pos) pos.needsUpdate = true;
  if (nor) nor.needsUpdate = true;
  if (n % 2 === 1) invertirCaras(geo);
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Diferencia entre el espejo PEDIDO y el ya horneado en la malla actual: al
 * ser una involución, basta con espejar los ejes que cambian.
 */
export function deltaEspejo(
  destino: readonly [boolean, boolean, boolean] | undefined,
  actual: readonly [boolean, boolean, boolean],
): [boolean, boolean, boolean] {
  const d = destino ?? [false, false, false];
  return [d[0] !== actual[0], d[1] !== actual[1], d[2] !== actual[2]];
}

/** Copia normalizada de la bandera de espejo (nunca `undefined`). */
export function espejoDe(
  e: readonly [boolean, boolean, boolean] | undefined,
): [boolean, boolean, boolean] {
  return e ? [!!e[0], !!e[1], !!e[2]] : [false, false, false];
}
