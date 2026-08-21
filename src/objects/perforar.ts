import * as THREE from "three";
import type { CanalTubo, VentanaRect } from "./types";

/**
 * PERFORADO PASANTE (v0.2.30 · generalizado a CANALES REDONDOS en v0.3.3).
 *
 * Abre agujeros PASANTES en la geometría de una pieza, de verdad: los
 * triángulos que caen dentro del hueco se recortan y se levantan las paredes
 * interiores. Funciona sobre cualquier malla — la primitiva paramétrica de una
 * viga o el modelo de biblioteca de una pieza real —, así que la roldana
 * INTERNA modifica el objeto anfitrión elegido en lugar de dibujarle una marca
 * encima, y un carro de prensa queda con los DOS canales por los que pasan sus
 * barras guía, como en la máquina real.
 *
 * El hueco se define en coordenadas LOCALES de la pieza: un eje pasante y una
 * figura CONVEXA en el plano perpendicular a ese eje. La ventana es un
 * rectángulo; el canal tubular, un polígono regular que aproxima la sección
 * del tubo. Todo lo demás —el recorte y el levantado de paredes— es común.
 */

/** Índices (pasante, U, V) de cada eje local y su terna de coordenadas. */
function ejesDe(eje: VentanaRect["eje"]): [number, number, number] {
  if (eje === "x") return [0, 1, 2]; // pasa por X; el plano es (Y, Z)
  if (eje === "y") return [1, 2, 0]; // pasa por Y; el plano es (Z, X)
  return [2, 0, 1]; //                 pasa por Z; el plano es (X, Y)
}

type P3 = [number, number, number];
/** Vértice del contorno del hueco en el plano (U, V). */
type PUV = [number, number];

/**
 * Recorta un polígono contra un SEMIPLANO del plano (U,V)
 * (Sutherland–Hodgman). El semiplano se da por su función lineal
 * `f(p) = nu·(u − ou) + nv·(v − ov)`; se conserva el lado `f ≥ 0` o el
 * `f < 0` según `mantenerDentro`. El corte interpola el punto COMPLETO, así
 * la coordenada del eje pasante sigue la superficie original (una cara
 * inclinada se recorta sin deformarse).
 */
function recortarPlano(
  poly: P3[],
  iu: number,
  iv: number,
  nu: number,
  nv: number,
  ou: number,
  ov: number,
  mantenerDentro: boolean,
): P3[] {
  if (poly.length === 0) return poly;
  const f = (p: P3): number => nu * (p[iu] - ou) + nv * (p[iv] - ov);
  const dentro = (p: P3): boolean => (mantenerDentro ? f(p) >= 0 : f(p) < 0);
  const salida: P3[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const da = dentro(a);
    const db = dentro(b);
    if (da) salida.push(a);
    if (da !== db) {
      const fa = f(a);
      const fb = f(b);
      const t = fa / (fa - fb);
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

/** Area (con signo) del poligono proyectado en el plano U,V. */
function areaUV(poly: P3[], iu: number, iv: number): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    a += p[iu] * q[iv] - q[iu] * p[iv];
  }
  return Math.abs(a) / 2;
}

/**
 * Abre UN hueco cuyo contorno es el polígono CONVEXO `contorno`, dado en
 * sentido antihorario en el plano (U,V) del eje pasante.
 *
 * El exterior de un convexo se parte en tantas regiones DISJUNTAS como
 * lados tiene: la región i es «fuera del lado i, pero dentro de los lados
 * 0..i−1». Así ningún trozo de triángulo se emite dos veces ni se pierde
 * ninguno. (Para el rectángulo son las cuatro regiones de siempre: dos
 * bandas laterales y dos tapas entre ellas.)
 */
function perforarContorno(
  geo: THREE.BufferGeometry,
  eje: VentanaRect["eje"],
  contorno: PUV[],
): THREE.BufferGeometry {
  const n = contorno.length;
  if (n < 3) return geo;
  const [ia, iu, iv] = ejesDe(eje);

  // Semiplano interior de cada lado: normal hacia DENTRO (a la izquierda del
  // lado, con el contorno en sentido antihorario).
  const lados = contorno.map((p, i) => {
    const q = contorno[(i + 1) % n];
    return { nu: -(q[1] - p[1]), nv: q[0] - p[0], ou: p[0], ov: p[1] };
  });

  // Caja del hueco en (U,V): rechazo rápido de los triángulos que ni se acercan.
  let u0 = Infinity;
  let u1 = -Infinity;
  let v0 = Infinity;
  let v1 = -Infinity;
  for (const [u, v] of contorno) {
    if (u < u0) u0 = u;
    if (u > u1) u1 = u;
    if (v < v0) v0 = v;
    if (v > v1) v1 = v;
  }

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
    // ¿El triángulo llega siquiera al hueco? (prueba de cajas en U,V)
    const minU = Math.min(tri[0][iu], tri[1][iu], tri[2][iu]);
    const maxU = Math.max(tri[0][iu], tri[1][iu], tri[2][iu]);
    const minV = Math.min(tri[0][iv], tri[1][iv], tri[2][iv]);
    const maxV = Math.max(tri[0][iv], tri[1][iv], tri[2][iv]);
    if (maxU <= u0 || minU >= u1 || maxV <= v0 || minV >= v1) {
      salida.push(...tri[0], ...tri[1], ...tri[2]);
      continue;
    }
    const base: P3[] = [[...tri[0]], [...tri[1]], [...tri[2]]];
    // UNA CARA PARALELA AL TALADRO NO SE PUEDE CORTAR (v0.3.4). Su proyección
    // sobre el plano (U,V) es un SEGMENTO —área cero—, así que el recorte la
    // deja en polígonos degenerados que el filtro de área descarta uno por uno:
    // la cara entera desaparecía. Pasaba con los costados de una caja cuando el
    // canal llega hasta el borde, que es justo lo que ocurre al enhebrar un
    // carro con la guía cerca de su canto. Un agujero pasante como mucho la
    // roza; se emite intacta.
    if (areaUV(base, iu, iv) <= 1e-6) {
      salida.push(...tri[0], ...tri[1], ...tri[2]);
      continue;
    }
    // Exterior = unión de las n regiones disjuntas descritas arriba.
    let acumulado: P3[] = base;
    for (let i = 0; i < n && acumulado.length >= 3; i++) {
      const l = lados[i];
      const fuera = recortarPlano(acumulado, iu, iv, l.nu, l.nv, l.ou, l.ov, false);
      if (fuera.length >= 3 && areaUV(fuera, iu, iv) > 1e-6) abanico(fuera, salida);
      acumulado = recortarPlano(acumulado, iu, iv, l.nu, l.nv, l.ou, l.ov, true);
    }
    // Lo que queda DENTRO no se emite (es el hueco), pero marca hasta dónde
    // llega el material para levantar las paredes.
    for (const p of acumulado) {
      if (p[ia] < aMin) aMin = p[ia];
      if (p[ia] > aMax) aMax = p[ia];
    }
  }

  // Paredes interiores del hueco: un rectángulo por lado, de cara a cara. El
  // lado se recorre AL REVÉS que el contorno para que la pared mire hacia
  // dentro del agujero.
  if (aMax - aMin > 1e-3) {
    const punto = (a: number, u: number, w: number): P3 => {
      const p: P3 = [0, 0, 0];
      p[ia] = a;
      p[iu] = u;
      p[iv] = w;
      return p;
    };
    for (let i = 0; i < n; i++) {
      const p = contorno[(i + 1) % n];
      const q = contorno[i];
      abanico(
        [
          punto(aMin, p[0], p[1]),
          punto(aMin, q[0], q[1]),
          punto(aMax, q[0], q[1]),
          punto(aMax, p[0], p[1]),
        ],
        salida,
      );
    }
  }

  const nueva = new THREE.BufferGeometry();
  nueva.setAttribute("position", new THREE.Float32BufferAttribute(salida, 3));
  nueva.computeVertexNormals();
  if (fuente !== geo) fuente.dispose();
  return nueva;
}

/** Contorno rectangular de una ventana, en sentido antihorario. */
function contornoVentana(v: VentanaRect): PUV[] {
  const u0 = v.u - v.du / 2;
  const u1 = v.u + v.du / 2;
  const v0 = v.v - v.dv / 2;
  const v1 = v.v + v.dv / 2;
  return [
    [u0, v0],
    [u1, v0],
    [u1, v1],
    [u0, v1],
  ];
}

/**
 * Contorno del CANAL TUBULAR: polígono regular inscrito... no, CIRCUNSCRITO.
 * El tubo tiene que PASAR por el agujero, así que el polígono se dibuja con
 * el radio corregido (`r / cos(π/n)`) para que el círculo real quepa dentro y
 * no roce por las esquinas.
 */
function contornoCanal(c: CanalTubo): PUV[] {
  const lados = Math.max(8, Math.min(48, c.lados ?? 20));
  const r = c.radio / Math.cos(Math.PI / lados);
  const puntos: PUV[] = [];
  for (let i = 0; i < lados; i++) {
    const a = (2 * Math.PI * i) / lados;
    puntos.push([c.u + r * Math.cos(a), c.v + r * Math.sin(a)]);
  }
  return puntos;
}

/**
 * Devuelve la geometría con todos sus huecos abiertos —ventanas rectangulares
 * y canales tubulares— o la misma si no hay ninguno. No modifica la original:
 * el llamador decide qué hacer con ella (SceneObject libera la anterior al
 * sustituirla).
 */
export function perforarGeometria(
  geo: THREE.BufferGeometry,
  ventanas: VentanaRect[] | undefined,
  canales?: CanalTubo[] | undefined,
): THREE.BufferGeometry {
  const hayVentanas = !!ventanas && ventanas.length > 0;
  const hayCanales = !!canales && canales.length > 0;
  if (!hayVentanas && !hayCanales) return geo;
  let actual = geo;
  const encadenar = (siguiente: THREE.BufferGeometry): void => {
    if (actual !== geo && siguiente !== actual) actual.dispose();
    actual = siguiente;
  };
  for (const v of ventanas ?? []) {
    if (!(v.du > 0.05) || !(v.dv > 0.05)) continue;
    encadenar(perforarContorno(actual, v.eje, contornoVentana(v)));
  }
  for (const c of canales ?? []) {
    if (!(c.radio > 0.05)) continue;
    encadenar(perforarContorno(actual, c.eje, contornoCanal(c)));
  }
  return actual;
}
