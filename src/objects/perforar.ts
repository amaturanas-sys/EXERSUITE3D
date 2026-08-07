import * as THREE from "three";
import type { VentanaRect } from "./types";

/**
 * PERFORADO DE VENTANAS RECTANGULARES (v0.2.30).
 *
 * Abre agujeros rectangulares PASANTES en la geometría de una pieza, de
 * verdad: los triángulos que caen dentro del rectángulo se recortan y se
 * levantan las cuatro paredes interiores del hueco. Funciona sobre cualquier
 * malla — la primitiva paramétrica de una viga o el modelo de biblioteca de
 * una pieza real —, así que la roldana INTERNA modifica el objeto anfitrión
 * elegido en lugar de dibujarle una marca encima.
 *
 * La ventana se define en coordenadas LOCALES de la pieza: un eje pasante y
 * el rectángulo (centro y tamaños) en el plano perpendicular a ese eje.
 */

/** Índices (pasante, U, V) de cada eje local y su terna de coordenadas. */
function ejesDe(eje: VentanaRect["eje"]): [number, number, number] {
  if (eje === "x") return [0, 1, 2]; // pasa por X; el plano es (Y, Z)
  if (eje === "y") return [1, 2, 0]; // pasa por Y; el plano es (Z, X)
  return [2, 0, 1]; //                 pasa por Z; el plano es (X, Y)
}

type P3 = [number, number, number];

/**
 * Recorta un polígono convexo contra un semiplano de una coordenada
 * (Sutherland–Hodgman). `mantener` decide qué lado se conserva; el corte
 * interpola el punto COMPLETO, así la coordenada del eje pasante sigue la
 * superficie original (una cara inclinada se recorta sin deformarse).
 */
function recortar(poly: P3[], c: number, lim: number, mantenerMenor: boolean): P3[] {
  if (poly.length === 0) return poly;
  const dentro = (p: P3): boolean => (mantenerMenor ? p[c] <= lim : p[c] >= lim);
  const salida: P3[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const da = dentro(a);
    const db = dentro(b);
    if (da) salida.push(a);
    if (da !== db) {
      const t = (lim - a[c]) / (b[c] - a[c]);
      salida.push([
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
      ]);
    }
  }
  return salida;
}

/** Vuelca un polígono convexo como abanico de triángulos. */
function abanico(poly: P3[], out: number[]): void {
  for (let i = 1; i + 1 < poly.length; i++) {
    out.push(...poly[0], ...poly[i], ...poly[i + 1]);
  }
}

/** Área (en el plano U,V) para descartar restos degenerados del recorte. */
function areaUV(poly: P3[], iu: number, iv: number): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    a += p[iu] * q[iv] - q[iu] * p[iv];
  }
  return Math.abs(a) / 2;
}

function perforarUna(geo: THREE.BufferGeometry, v: VentanaRect): THREE.BufferGeometry {
  const [ia, iu, iv] = ejesDe(v.eje);
  const u0 = v.u - v.du / 2;
  const u1 = v.u + v.du / 2;
  const v0 = v.v - v.dv / 2;
  const v1 = v.v + v.dv / 2;

  const fuente = geo.index ? geo.toNonIndexed() : geo;
  const pos = fuente.attributes.position as THREE.BufferAttribute;
  const salida: number[] = [];
  // Extensión del MATERIAL a lo largo del eje pasante dentro del hueco: es
  // lo que deben cubrir las paredes interiores (de la cara de entrada a la
  // de salida), sin suponer el grosor de la pieza.
  let aMin = Infinity;
  let aMax = -Infinity;

  const tri: P3[] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let t = 0; t < pos.count; t += 3) {
    for (let k = 0; k < 3; k++) {
      tri[k][0] = pos.getX(t + k);
      tri[k][1] = pos.getY(t + k);
      tri[k][2] = pos.getZ(t + k);
    }
    // ¿El triángulo llega siquiera al rectángulo? (prueba de cajas en U,V)
    const minU = Math.min(tri[0][iu], tri[1][iu], tri[2][iu]);
    const maxU = Math.max(tri[0][iu], tri[1][iu], tri[2][iu]);
    const minV = Math.min(tri[0][iv], tri[1][iv], tri[2][iv]);
    const maxV = Math.max(tri[0][iv], tri[1][iv], tri[2][iv]);
    if (maxU <= u0 || minU >= u1 || maxV <= v0 || minV >= v1) {
      salida.push(...tri[0], ...tri[1], ...tri[2]);
      continue;
    }
    const base: P3[] = [[...tri[0]], [...tri[1]], [...tri[2]]];
    // El exterior del rectángulo se parte en CUATRO regiones disjuntas (dos
    // bandas laterales completas y dos tapas entre ellas): así ningún trozo
    // se emite dos veces.
    const regiones: P3[][] = [
      recortar(base, iu, u0, true),
      recortar(base, iu, u1, false),
      recortar(recortar(recortar(base, iu, u0, false), iu, u1, true), iv, v0, true),
      recortar(recortar(recortar(base, iu, u0, false), iu, u1, true), iv, v1, false),
    ];
    for (const r of regiones) {
      if (r.length >= 3 && areaUV(r, iu, iv) > 1e-6) abanico(r, salida);
    }
    // Trozo que cae DENTRO: no se emite (es el hueco), pero marca hasta
    // dónde llega el material para levantar las paredes.
    const dentro = recortar(
      recortar(recortar(recortar(base, iu, u0, false), iu, u1, true), iv, v0, false),
      iv,
      v1,
      true,
    );
    for (const p of dentro) {
      if (p[ia] < aMin) aMin = p[ia];
      if (p[ia] > aMax) aMax = p[ia];
    }
  }

  // Paredes interiores del hueco (cuatro rectángulos), de cara a cara.
  if (aMax - aMin > 1e-3) {
    const punto = (a: number, u: number, w: number): P3 => {
      const p: P3 = [0, 0, 0];
      p[ia] = a;
      p[iu] = u;
      p[iv] = w;
      return p;
    };
    const pared = (ua: number, va: number, ub: number, vb: number): void => {
      const p1 = punto(aMin, ua, va);
      const p2 = punto(aMin, ub, vb);
      const p3 = punto(aMax, ub, vb);
      const p4 = punto(aMax, ua, va);
      abanico([p1, p2, p3, p4], salida);
    };
    pared(u0, v0, u0, v1);
    pared(u1, v1, u1, v0);
    pared(u0, v1, u1, v1);
    pared(u1, v0, u0, v0);
  }

  const nueva = new THREE.BufferGeometry();
  nueva.setAttribute("position", new THREE.Float32BufferAttribute(salida, 3));
  nueva.computeVertexNormals();
  if (fuente !== geo) fuente.dispose();
  return nueva;
}

/**
 * Devuelve la geometría con todas sus ventanas abiertas (o la misma si no
 * hay ninguna). No modifica la original: el llamador decide qué hacer con
 * ella (SceneObject libera la anterior al sustituirla).
 */
export function perforarGeometria(
  geo: THREE.BufferGeometry,
  ventanas: VentanaRect[] | undefined,
): THREE.BufferGeometry {
  if (!ventanas || ventanas.length === 0) return geo;
  let actual = geo;
  for (const v of ventanas) {
    if (!(v.du > 0.05) || !(v.dv > 0.05)) continue;
    const siguiente = perforarUna(actual, v);
    if (actual !== geo) actual.dispose();
    actual = siguiente;
  }
  return actual;
}
