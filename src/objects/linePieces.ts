import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { PrimitiveParams } from "./types";

// Piezas trazadas por linea (estilo "linea recta" de Paint): perfiles de acero
// (pilar/travesano) y tubos. Su forma la describe `params.path` (nodos locales,
// cm). Rectas admiten extremos en diagonal y pinholes reales (agujeros
// pasantes); al doblarlas (bending por nodos) se barren a lo largo de una curva
// Catmull-Rom y los agujeros/cortes diagonales dejan de aplicarse.

/** Numero de nodos con el que nace una pieza de linea (extremos + interiores). */
export const LINE_PATH_NODES = 5;

/** Medidas nominales de perfil cuadrado/rectangular (mm del lado base). */
export const BEAM_NOMINALS_MM = [40, 50, 60, 75, 100];
/** Diametros nominales de tubo de acero (mm exteriores). */
export const TUBE_NOMINALS_MM = [25, 32, 42, 48, 60, 76];

export function pathVectors(path: [number, number, number][]): THREE.Vector3[] {
  return path.map(([x, y, z]) => new THREE.Vector3(x, y, z));
}

/** Trayectoria recta a lo largo del eje Y local, centrada en el origen. */
export function straightPath(lengthCm: number): [number, number, number][] {
  const nodes: [number, number, number][] = [];
  for (let i = 0; i < LINE_PATH_NODES; i++) {
    const t = i / (LINE_PATH_NODES - 1);
    nodes.push([0, -lengthCm / 2 + t * lengthCm, 0]);
  }
  return nodes;
}

/**
 * True si todos los nodos son colineales Y VAN EN ORDEN (la pieza sigue recta).
 *
 * El orden importa tanto como la colinealidad: el largo de una pieza recta se
 * mide como la LONGITUD DE LA POLILÍNEA, no como la distancia entre extremos.
 * Un nodo intermedio que se quede PASADO del extremo —lo que ocurre al acortar
 * un poste tirando de su punta hacia dentro— sigue estando sobre la recta, pero
 * la polilínea va, vuelve y va otra vez: el largo sale mayor que la cuerda y la
 * pieza CRECE al acortarla. Con el recorrido de ida se comporta como recta; sin
 * él es una pieza plegada, y como tal se construye.
 */
export function pathIsStraight(path: [number, number, number][] | undefined): boolean {
  return recorridoDelPath(path) === "recta";
}

/**
 * True si los nodos están SOBRE la recta de los extremos, vayan en el orden que
 * vayan. Es lo que hay que preguntar antes de re-repartirlos: una pieza recta
 * acortada por la punta es esto —colineal pero desordenada— y se arregla
 * repartiendo, no tratándola como doblada.
 */
export function pathIsCollinear(path: [number, number, number][] | undefined): boolean {
  return recorridoDelPath(path) !== "doblada";
}

/** Colinealidad y orden de una polilínea, en una sola pasada. */
function recorridoDelPath(
  path: [number, number, number][] | undefined,
): "recta" | "plegada" | "doblada" {
  if (!path || path.length < 3) return "recta";
  const a = new THREE.Vector3(...path[0]);
  const b = new THREE.Vector3(...path[path.length - 1]);
  const dir = b.clone().sub(a);
  const len = dir.length();
  if (len < 1e-6) return "recta";
  dir.divideScalar(len);
  const tmp = new THREE.Vector3();
  let anterior = 0;
  let ordenada = true;
  for (let i = 1; i < path.length - 1; i++) {
    tmp.set(...path[i]).sub(a);
    const t = tmp.dot(dir);
    const d = tmp.clone().sub(dir.clone().multiplyScalar(t)).length();
    if (d > 0.05) return "doblada"; // medio milimetro de tolerancia
    if (t < anterior - 0.05 || t > len + 0.05) ordenada = false; // retrocede o se pasa
    anterior = t;
  }
  return ordenada ? "recta" : "plegada";
}

/** Longitud de la polilinea de nodos (cm). */
export function pathLength(path: [number, number, number][]): number {
  let L = 0;
  for (let i = 0; i < path.length - 1; i++) {
    L += Math.hypot(
      path[i + 1][0] - path[i][0],
      path[i + 1][1] - path[i][1],
      path[i + 1][2] - path[i][2],
    );
  }
  return L;
}

/**
 * Curva suave que pasa por los nodos del path (para barrer perfiles).
 * Parametrización CHORDAL (v0.2.20): la uniforme sobreoscilaba — al
 * separar un nodo, la curva se hundía hacia el lado contrario formando la
 * SIGMOIDEA que hacía tan molesto corregir un tubo doblado (medido: 3×
 * más contra-comba que la chordal al jalar un extremo). La chordal
 * pondera cada tramo por su longitud real: curvas fluidas, sin bucles ni
 * oscilaciones, también con nodos muy desparejos.
 */
function pathCurve(path: [number, number, number][]): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(pathVectors(path), false, "chordal");
}

/** Seccion rectangular (ancho x fondo) centrada, para barrer el perfil. */
function rectShape(w: number, d: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, -d / 2);
  s.lineTo(w / 2, -d / 2);
  s.lineTo(w / 2, d / 2);
  s.lineTo(-w / 2, d / 2);
  s.closePath();
  return s;
}

/**
 * Perfil de acero (beam). Recto: se extruye la cara (largo x ancho) con los
 * pinholes como agujeros reales, en la direccion del fondo; extremos planos o
 * en diagonal (inglete a 45 grados por el ancho). Doblado: se barre el perfil
 * (ancho x fondo) a lo largo de la curva del path.
 */
export function buildBeamGeometry(p: PrimitiveParams): THREE.BufferGeometry {
  const W = p.width ?? 5; // ancho del perfil (cm)
  const D = p.depth ?? 5; // fondo del perfil (cm)
  const path = p.path ?? straightPath(100);

  if (p.ramas?.length) return conRamas(buildBeamSinRamas(p, W, D, path), p, rectShape(W, D));
  return buildBeamSinRamas(p, W, D, path);
}

/**
 * RAMAS (v0.3.25): cada prolongación nodal se barre con el MISMO perfil de la
 * pieza y se funde con ella. No son piezas soldadas: son parte del sólido, así
 * que se mueven, se giran y se guardan con él.
 */
function conRamas(
  tronco: THREE.BufferGeometry,
  p: PrimitiveParams,
  perfil: THREE.Shape,
): THREE.BufferGeometry {
  const partes: THREE.BufferGeometry[] = [tronco.toNonIndexed()];
  for (const rama of p.ramas ?? []) {
    if (!rama.path || rama.path.length < 2) continue;
    partes.push(sweepProfile(perfil, rama.path).toNonIndexed());
  }
  if (partes.length === 1) return tronco;
  const geo = mergeGeometries(partes, false) ?? tronco;
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

function buildBeamSinRamas(
  p: PrimitiveParams,
  W: number,
  D: number,
  path: [number, number, number][],
): THREE.BufferGeometry {
  if (!pathIsStraight(path)) return buildBentBeam(p, W, D, path);

  const L = Math.max(pathLength(path), 1);
  const holeR = Math.max(0, (p.holeDiameter ?? 0) / 2);
  const spacing = Math.max(p.holeSpacing ?? 5, holeR * 2 + 0.5);

  // EXTREMO REDONDO (v0.3.32): la punta se remata en semicírculo de radio W/2
  // en vez de en escuadra. Es lo que le hace falta al extremo proximal de un
  // brazo que pivota: la esquina de un corte recto barre W/2·√2 al girar y topa
  // contra la horquilla —o contra la viga— mucho antes de acabar el recorrido;
  // el semicírculo barre exactamente su radio y pasa. El centro del arco queda
  // a W/2 de la punta, que es donde va el taladro del pasador.
  const re = p.extremoRedondo ?? null;
  const rIni = re === "inicio" || re === "ambos" ? W / 2 : 0;
  const rFin = re === "fin" || re === "ambos" ? W / 2 : 0;

  // Cara del perfil: largo L en X, ancho W en Y; se extruye el fondo D en Z.
  const face = new THREE.Shape();
  face.moveTo(-L / 2 + rIni, -W / 2);
  face.lineTo(L / 2 - rFin, -W / 2);
  if (rFin > 0) face.absarc(L / 2 - rFin, 0, rFin, -Math.PI / 2, Math.PI / 2, false);
  else face.lineTo(L / 2, W / 2);
  face.lineTo(-L / 2 + rIni, W / 2);
  if (rIni > 0) face.absarc(-L / 2 + rIni, 0, rIni, Math.PI / 2, Math.PI * 1.5, false);
  face.closePath();

  if (holeR > 0.05) {
    // Margen en los extremos: deja sitio al corte diagonal (W) o al plano.
    const margin = (p.ends === "diagonal" ? W : W / 2) + holeR;
    const usable = L - 2 * margin;
    const count = Math.floor(usable / spacing) + 1;
    if (count >= 1 && usable >= 0) {
      const start = -((count - 1) * spacing) / 2;
      for (let i = 0; i < count; i++) {
        const hole = new THREE.Path();
        hole.absarc(start + i * spacing, 0, holeR, 0, Math.PI * 2, true);
        face.holes.push(hole);
      }
    }
  }

  const geo = new THREE.ExtrudeGeometry(face, {
    depth: D,
    bevelEnabled: false,
    curveSegments: 12,
  });
  geo.translate(0, 0, -D / 2);

  if (p.ends === "diagonal" && rIni === 0 && rFin === 0) {
    // Inglete a 45 grados: los vertices del anillo extremo se retranquean en X
    // proporcionalmente al ancho (la cara final queda plana e inclinada).
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const eps = 1e-4;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      if (x > L / 2 - eps) pos.setX(i, x - (y + W / 2));
      else if (x < -L / 2 + eps) pos.setX(i, x + (y + W / 2));
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }

  // Largo de la cara (X) -> eje Y local, como el path.
  geo.rotateZ(Math.PI / 2);
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * MOLETEADO DE UN TRAMO DE TUBO (v0.3.71). El mismo relieve que el mango de una
 * mancuerna —surcos anulares de 4 mm de paso— pero dibujado aquí, porque el tubo
 * lo dibuja la app y no el CAD.
 *
 * SE TORNEA A MANO, Y ÉSA ES LA GRACIA. El torno de three.js (`LatheGeometry`)
 * hace la forma bien pero PROMEDIA las normales entre un tramo del perfil y el
 * siguiente, y en un diente de sierra eso redondea la arista: los surcos salen
 * como una ondulación borrosa en vez de como surcos. Así que se montan los
 * vértices aquí, con una regla que el torno no sabe hacer —
 *
 *     SUAVE ALREDEDOR DEL TUBO, DURO A LO LARGO DEL PERFIL.
 *
 * Cada tramo del perfil lleva SUS PROPIAS normales, así que la arista entre el
 * fondo del surco y la cresta corta la luz de verdad; y alrededor del tubo la
 * normal gira con el ángulo, así que el cilindro sigue viéndose redondo y no
 * como un prisma de 24 caras. Es lo que hace el mallador del CAD con la
 * mancuerna, y por eso las dos piezas se ven igual.
 *
 * EL TUBO NO CAMBIA DE MATERIAL. El moleteado se ve por su relieve —por cómo
 * corta la luz—, no por ir pintado de otro color: un tubo moleteado sigue siendo
 * el mismo tubo del mismo acero.
 *
 * El tramo llega en fracciones del largo, así que estirar el tubo mueve el
 * moleteado con él en vez de dejarlo colgando a la mitad.
 */
const MOLETEADO_PASO = 0.4;   // cm entre dientes, como el mango de la mancuerna
const MOLETEADO_HONDO = 0.03; // cm que hunde cada surco
const MOLETEADO_LADOS = 28;   // caras alrededor del tubo

/** El perfil del tubo: pares (radio, altura) de una tapa a la otra. */
function perfilMoleteado(r: number, largo: number, banda: [number, number]): [number, number][] {
  const y0 = -largo / 2;
  const a = y0 + Math.min(banda[0], banda[1]) * largo;
  const b = y0 + Math.max(banda[0], banda[1]) * largo;
  const pts: [number, number][] = [[r, y0]];
  if (b - a >= MOLETEADO_PASO) {
    pts.push([r, a]);
    for (let y = a; y < b - 1e-6; y += MOLETEADO_PASO) {
      pts.push([r - MOLETEADO_HONDO, Math.min(y + MOLETEADO_PASO / 2, b)]);
      pts.push([r, Math.min(y + MOLETEADO_PASO, b)]);
    }
  }
  pts.push([r, -y0]);
  return pts;
}

function tuboMoleteado(r: number, largo: number, banda: [number, number]): THREE.BufferGeometry {
  const perfil = perfilMoleteado(r, largo, banda);
  const N = MOLETEADO_LADOS;
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];

  for (let s = 0; s + 1 < perfil.length; s++) {
    const [r0, y0] = perfil[s];
    const [r1, y1] = perfil[s + 1];
    // La normal del tramo, en el plano (radio, altura): perpendicular a él y
    // mirando hacia afuera. Es SUYA y no se promedia con la del vecino.
    const dr = r1 - r0, dy = y1 - y0;
    const len = Math.hypot(dr, dy) || 1;
    const nr = dy / len, ny = -dr / len;
    for (let i = 0; i < N; i++) {
      const t0 = (i / N) * Math.PI * 2;
      const t1 = ((i + 1) / N) * Math.PI * 2;
      const esquina = (rr: number, yy: number, th: number) => {
        pos.push(Math.cos(th) * rr, yy, Math.sin(th) * rr);
        nor.push(Math.cos(th) * nr, ny, Math.sin(th) * nr);
        uv.push(th / (Math.PI * 2), (yy + largo / 2) / largo);
      };
      esquina(r0, y0, t0); esquina(r1, y1, t0); esquina(r1, y1, t1);
      esquina(r0, y0, t0); esquina(r1, y1, t1); esquina(r0, y0, t1);
    }
  }
  // LAS DOS TAPAS, planas.
  for (const [yy, sig] of [[-largo / 2, -1], [largo / 2, 1]] as [number, number][]) {
    for (let i = 0; i < N; i++) {
      const t0 = (i / N) * Math.PI * 2;
      const t1 = ((i + 1) / N) * Math.PI * 2;
      const trio = sig > 0
        ? [[0, 0], [Math.cos(t0) * r, Math.sin(t0) * r], [Math.cos(t1) * r, Math.sin(t1) * r]]
        : [[0, 0], [Math.cos(t1) * r, Math.sin(t1) * r], [Math.cos(t0) * r, Math.sin(t0) * r]];
      for (const [x, z] of trio) {
        pos.push(x, yy, z);
        nor.push(0, sig, 0);
        uv.push(0.5 + x / (2 * r), 0.5 + z / (2 * r));
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/** Tubo de acero. Recto: cilindro con tapas. Doblado: circulo barrido. */
export function buildTubeGeometry(p: PrimitiveParams): THREE.BufferGeometry {
  const r = p.radius ?? 2.4;
  const path = p.path ?? straightPath(100);
  const recto = pathIsStraight(path);
  const largo = Math.max(pathLength(path), 1);
  // EL MOLETEADO, SÓLO EN TUBO RECTO. En un tubo doblado el perfil ya no basta
  // —habría que barrerlo por la curva— y además nadie agarra un codo.
  if (recto && p.moleteado && largo > 2 * r) {
    const geo = tuboMoleteado(r, largo, p.moleteado);
    return p.ramas?.length ? conRamas(geo, p, circuloDe(r)) : geo;
  }
  const tronco = recto
    ? new THREE.CylinderGeometry(r, r, largo, 24, 1)
    : sweepProfile(circuloDe(r), path);
  return p.ramas?.length ? conRamas(tronco, p, circuloDe(r)) : tronco;
}

function circuloDe(r: number): THREE.Shape {
  const circle = new THREE.Shape();
  circle.absarc(0, 0, r, 0, Math.PI * 2, false);
  return circle;
}

interface TramoPlano {
  recto: boolean;
  i0: number;
  i1: number;
}

/**
 * PARTICIÓN POR CUERDA ACUMULADA de la curva de una viga doblada: muestrea
 * la curva (≈1 cm entre muestras) y la corta en tramos cuya comba respecto
 * de su propia cuerda no supere 2 mm — una cara así de plana admite un
 * acople de calce aunque quede diagonal o inclinada. (La planitud puramente
 * local engaña: una curvatura suave de radio grande parece recta en cada
 * ventana pequeña y la pieza entera se enderezaría.) Los tramos que no
 * alcanzan el PIE de un accesorio (~20 cm, el manguito de una jota) son
 * parte del codo: ahí la curvatura impide instalar un acople y se barren
 * curvos (consecutivos fusionados en un solo barrido).
 */
function particionPlana(
  path: [number, number, number][],
  margen: number,
  spacing: number,
): { pts: THREE.Vector3[]; fusionados: TramoPlano[] } {
  const curva = pathCurve(path);
  const L = Math.max(pathLength(path), 2);
  const N = THREE.MathUtils.clamp(Math.ceil(L), 40, 500);
  const pts = curva.getSpacedPoints(N); // N+1 puntos

  const tolPlano = 0.2; // cm de comba tolerada en una cara de acople
  const desviacionMax = (a0: number, a1: number): number => {
    const a = pts[a0];
    const b = pts[a1];
    const dir = b.clone().sub(a);
    const len = dir.length();
    if (len < 1e-6) return 0;
    dir.divideScalar(len);
    let peor = 0;
    for (let k = a0 + 1; k < a1; k++) {
      const v = pts[k].clone().sub(a);
      const d = v.clone().addScaledVector(dir, -v.dot(dir)).length();
      if (d > peor) peor = d;
    }
    return peor;
  };
  const cortes: number[] = [0];
  let ini = 0;
  for (let j = 2; j < pts.length; j++) {
    if (desviacionMax(ini, j) > tolPlano) {
      cortes.push(j - 1);
      ini = j - 1;
    }
  }
  if (cortes[cortes.length - 1] !== pts.length - 1) cortes.push(pts.length - 1);

  const minRecto = Math.max(2 * margen + 1, spacing + 2, 20);
  const tramos: TramoPlano[] = [];
  for (let c = 0; c < cortes.length - 1; c++) {
    const i0 = cortes[c];
    const i1 = cortes[c + 1];
    const largoTramo = pts[i0].distanceTo(pts[i1]);
    tramos.push({ recto: largoTramo >= minRecto, i0, i1 });
  }
  const fusionados: TramoPlano[] = [];
  for (const t of tramos) {
    const u = fusionados[fusionados.length - 1];
    if (u && !u.recto && !t.recto) u.i1 = t.i1;
    else fusionados.push({ ...t });
  }
  return { pts, fusionados };
}

/**
 * CUERDAS DE COLISIÓN de una pieza doblada (v0.2.14): la curva barrida se
 * muestrea en segmentos casi rectos — cada par de puntos LOCALES define un
 * collider físico (cápsula o prisma) que SIGUE la forma real. Antes la
 * física usaba la caja envolvente completa, que en un pilar doblado es un
 * MURO invisible llenando el hueco del codo: una barra que caía dentro del
 * rack quedaba acuñada en el aire sin tocar jotas ni cadenas.
 */
export function cuerdasColision(
  path: [number, number, number][],
): { a: THREE.Vector3; b: THREE.Vector3 }[] {
  const curva = pathCurve(path);
  const L = Math.max(pathLength(path), 2);
  const n = THREE.MathUtils.clamp(Math.round(L / 10), 3, 32); // ~10 cm por cuerda
  const pts = curva.getSpacedPoints(n);
  const out: { a: THREE.Vector3; b: THREE.Vector3 }[] = [];
  for (let i = 0; i < pts.length - 1; i++) out.push({ a: pts[i], b: pts[i + 1] });
  return out;
}

/**
 * GRILLA DE CALCE de un tramo recto de una viga doblada, en coordenadas
 * LOCALES de la pieza: los accesorios (jotas, brazos, anclajes) reconocen
 * la INCLINACIÓN de la cara — cada tramo plano conserva su propia línea de
 * pinholes (centro, dirección y eje del pin) aunque quede diagonal.
 */
export interface TramoCalce {
  /** Punto medio de la cuerda del tramo (local, cm). */
  centro: THREE.Vector3;
  /** Dirección unitaria de la cuerda (local). */
  dir: THREE.Vector3;
  /** Eje unitario de los pinholes del tramo (local, ⊥ a la cara). */
  ejePin: THREE.Vector3;
  /** Largo de la cuerda (cm). */
  largo: number;
  /** Paso de la grilla (cm) y fase respecto del centro del tramo. */
  paso: number;
  fase: number;
  /** Última fila a cada lado del centro (|s| ≤ lim). */
  lim: number;
  /** Número de filas de pinholes del tramo. */
  count: number;
}

/** Tramos con pinholes de una viga doblada (vacío si es recta o sin agujeros). */
export function tramosCalce(p: PrimitiveParams): TramoCalce[] {
  const holeR = Math.max(0, (p.holeDiameter ?? 0) / 2);
  if (p.kind !== "beam" || holeR <= 0.05) return [];
  const path = p.path ?? straightPath(100);
  if (pathIsStraight(path)) return [];
  const W = p.width ?? 5;
  const spacing = Math.max(p.holeSpacing ?? 5, holeR * 2 + 0.5);
  const margen = W / 2 + holeR;
  const { pts, fusionados } = particionPlana(path, margen, spacing);
  const out: TramoCalce[] = [];
  for (const t of fusionados) {
    if (!t.recto) continue;
    const a = pts[t.i0];
    const b = pts[t.i1];
    const largo = a.distanceTo(b);
    const usable = largo - 2 * margen;
    const count = Math.floor(usable / spacing) + 1;
    if (count < 1 || usable < 0) continue;
    const dir = b.clone().sub(a).normalize();
    // Mismo marco que la geometría del tramo: prisma extruido en Z (los
    // agujeros lo atraviesan) y rotado de +Y a la dirección de la cuerda.
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    out.push({
      centro: a.clone().add(b).multiplyScalar(0.5),
      dir,
      ejePin: new THREE.Vector3(0, 0, 1).applyQuaternion(q).normalize(),
      largo,
      paso: spacing,
      fase: count % 2 === 1 ? 0 : spacing / 2,
      lim: ((count - 1) / 2) * spacing + 0.01,
      count,
    });
  }
  return out;
}

/**
 * Viga DOBLADA construida por TRAMOS (v0.2.12): los pinholes solo se
 * OBLITERAN donde la CURVATURA real de la superficie impide instalar un
 * acople — toda cara suficientemente plana los conserva, aunque quede
 * DIAGONAL o inclinada tras el doblado. La curva barrida se muestrea
 * centímetro a centímetro y se particiona por CUERDA ACUMULADA (comba
 * ≤ 2 mm) en tramos de cara plana; los que alcanzan el pie de un
 * accesorio (≥ 20 cm) se extruyen como prismas CON su grilla de pinholes
 * sobre su propia línea, y el resto — el codo — se barre liso. Las
 * partes comparten sus puntos de frontera: la geometría es continua.
 */
function buildBentBeam(
  p: PrimitiveParams,
  W: number,
  D: number,
  path: [number, number, number][],
): THREE.BufferGeometry {
  const holeR = Math.max(0, (p.holeDiameter ?? 0) / 2);
  const spacing = Math.max(p.holeSpacing ?? 5, holeR * 2 + 0.5);
  const margen = W / 2 + holeR;
  const { pts, fusionados } = particionPlana(path, margen, spacing);

  const partes: THREE.BufferGeometry[] = [];
  for (const t of fusionados) {
    if (t.recto) {
      // Prisma recto con pinholes sobre la línea del intervalo.
      const a = pts[t.i0];
      const b = pts[t.i1];
      const L2 = Math.max(a.distanceTo(b), 0.5);
      const cara = new THREE.Shape();
      cara.moveTo(-L2 / 2, -W / 2);
      cara.lineTo(L2 / 2, -W / 2);
      cara.lineTo(L2 / 2, W / 2);
      cara.lineTo(-L2 / 2, W / 2);
      cara.closePath();
      if (holeR > 0.05) {
        const usable = L2 - 2 * margen;
        const count = Math.floor(usable / spacing) + 1;
        if (count >= 1 && usable >= 0) {
          const inicio = -((count - 1) * spacing) / 2;
          for (let k = 0; k < count; k++) {
            const hole = new THREE.Path();
            hole.absarc(inicio + k * spacing, 0, holeR, 0, Math.PI * 2, true);
            cara.holes.push(hole);
          }
        }
      }
      const geo = new THREE.ExtrudeGeometry(cara, {
        depth: D,
        bevelEnabled: false,
        curveSegments: 12,
      });
      geo.translate(0, 0, -D / 2);
      geo.rotateZ(Math.PI / 2); // largo de la cara -> eje Y local
      const dir = b.clone().sub(a).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      geo.applyQuaternion(q);
      const medio = a.clone().add(b).multiplyScalar(0.5);
      geo.translate(medio.x, medio.y, medio.z);
      partes.push(geo);
    } else {
      // Sub-curva fiel: Catmull-Rom sobre las muestras densas del
      // intervalo (pasa por los puntos de frontera compartidos).
      const sub = pts.slice(t.i0, t.i1 + 1);
      if (sub.length < 2) continue;
      const curvaSub = new THREE.CatmullRomCurve3(sub, false, "catmullrom", 0.5);
      const steps = THREE.MathUtils.clamp(sub.length, 8, 120);
      const geo = new THREE.ExtrudeGeometry(rectShape(W, D), {
        steps,
        bevelEnabled: false,
        extrudePath: curvaSub,
        curveSegments: 20,
      });
      partes.push(geo);
    }
  }
  if (partes.length === 0) return sweepProfile(rectShape(W, D), path);
  const unida =
    partes.length === 1 ? partes[0] : (mergeGeometries(partes, false) ?? partes[0]);
  unida.computeBoundingBox();
  unida.computeBoundingSphere();
  return unida;
}

/** Barre una seccion 2D a lo largo de la curva del path (con tapas). */
function sweepProfile(
  shape: THREE.Shape,
  path: [number, number, number][],
): THREE.BufferGeometry {
  const curve = pathCurve(path);
  const steps = THREE.MathUtils.clamp((path.length - 1) * 10, 16, 120);
  const geo = new THREE.ExtrudeGeometry(shape, {
    steps,
    bevelEnabled: false,
    extrudePath: curve,
    curveSegments: 20,
  });
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}
