import * as THREE from "three";
import type { CaraChapa, ChapaParams } from "./types";

/**
 * CHAPA DE ACERO (v0.3.72).
 *
 * Convierte un MACIZO en una PLANCHA doblada con la forma del macizo: se
 * quitan las caras que se señalen y lo que queda se engorda hacia dentro hasta
 * el grosor pedido. Un cubo sin la cara de arriba sale como una cubeta; un
 * cilindro sin sus dos tapas, como un tubo; una pieza de biblioteca sin la
 * cara de atrás, como su carcasa.
 *
 * Son dos trabajos, y aquí están los dos:
 *
 *   1. RECONOCER LAS CARAS. Una malla no tiene «caras», tiene triángulos. Dos
 *      triángulos son de la misma cara si comparten una arista y el ángulo
 *      entre ellos es pequeño. Con el umbral en 28° las seis caras de una caja
 *      siguen siendo seis (90° entre ellas) y el costado de un cilindro de 16
 *      o 32 gajos —11° a 22° entre gajo y gajo— sale como UNA cara, que es lo
 *      que cualquiera señalaría con el dedo.
 *
 *   2. ENGORDAR HACIA DENTRO. Cada vértice se mete por su normal media, pero
 *      NO una distancia igual al grosor: hay que meterlo `grosor / cos α`,
 *      donde α es lo que se separa la normal media de la de cada cara. Sin esa
 *      corrección (la «inglete»), las dos paredes de una esquina se meten cada
 *      una lo suyo y dejan de tocarse: la cubeta sale con el rincón abierto.
 *      Con ella, la esquina de un cubo de grosor t cae exactamente en
 *      (t, t, t), que es donde tiene que estar.
 *
 * La costura del borde —el canto que se ve donde se quitó una cara— se levanta
 * aparte: es el grosor de la plancha, y sin él la cubeta se vería como un papel
 * sin espesor al mirarla desde arriba.
 */

/** Umbral de continuidad entre triángulos vecinos para tenerlos por la misma cara. */
const COS_SUAVE = Math.cos((28 * Math.PI) / 180);

/** Hasta dónde se deja crecer la corrección de inglete (esquinas muy agudas). */
const INGLETE_MAX = 3.2;

/** Una cara reconocida en una malla concreta. */
export interface CaraDetectada {
  /** Triángulos que la forman, por su número en la malla (= `faceIndex` del rayo). */
  tris: number[];
  /** Normal media, en coordenadas locales de la pieza (unitaria). */
  n: THREE.Vector3;
  /** Centro de la cara, en coordenadas locales. */
  centro: THREE.Vector3;
  /** Centro de la cara en fracción de la caja envolvente (0..1 por eje). */
  cajaC: THREE.Vector3;
  /** Área total (cm²). */
  area: number;
}

/** Lectura uniforme de los triángulos, esté la malla indexada o no. */
function lectura(geo: THREE.BufferGeometry): {
  nTri: number;
  pos: THREE.BufferAttribute | THREE.InterleavedBufferAttribute;
  vert: (t: number, k: number) => number;
} {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const idx = geo.index;
  const nTri = idx ? Math.floor(idx.count / 3) : Math.floor(pos.count / 3);
  const vert = idx
    ? (t: number, k: number): number => idx.getX(t * 3 + k)
    : (t: number, k: number): number => t * 3 + k;
  return { nTri, pos, vert };
}

/** Raíz de la clase (union-find con compresión de camino). */
function raiz(padre: Int32Array, i: number): number {
  let r = i;
  while (padre[r] !== r) r = padre[r];
  for (let n = i; padre[n] !== r; ) {
    const sig = padre[n];
    padre[n] = r;
    n = sig;
  }
  return r;
}

/**
 * RECONOCE LAS CARAS de una malla. El orden de la lista no significa nada: las
 * caras se identifican por su normal y su sitio, nunca por su número.
 */
export function detectarCaras(geo: THREE.BufferGeometry): CaraDetectada[] {
  const { nTri, pos, vert } = lectura(geo);
  if (nTri === 0) return [];

  // SOLDADURA de vértices: dos vértices en el mismo sitio son el mismo punto,
  // aunque la malla los repita (una caja de three.js repite los ocho).
  const sold = new Int32Array(pos.count);
  const clave = new Map<string, number>();
  for (let i = 0; i < pos.count; i++) {
    const k = `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
    let id = clave.get(k);
    if (id === undefined) {
      id = clave.size;
      clave.set(k, id);
    }
    sold[i] = id;
  }

  const normales: THREE.Vector3[] = new Array(nTri);
  const areas = new Float64Array(nTri);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let t = 0; t < nTri; t++) {
    a.fromBufferAttribute(pos, vert(t, 0));
    b.fromBufferAttribute(pos, vert(t, 1));
    c.fromBufferAttribute(pos, vert(t, 2));
    const cruz = b.clone().sub(a).cross(c.clone().sub(a));
    areas[t] = cruz.length() / 2;
    normales[t] = areas[t] > 1e-12 ? cruz.normalize() : new THREE.Vector3(0, 1, 0);
  }

  // Une triángulos vecinos que sigan la misma superficie.
  const padre = new Int32Array(nTri);
  for (let t = 0; t < nTri; t++) padre[t] = t;
  const aristas = new Map<number, number>();
  for (let t = 0; t < nTri; t++) {
    if (areas[t] <= 1e-12) continue;
    for (let k = 0; k < 3; k++) {
      const p = sold[vert(t, k)];
      const q = sold[vert(t, (k + 1) % 3)];
      const llave = p < q ? p * 1e7 + q : q * 1e7 + p;
      const otro = aristas.get(llave);
      if (otro === undefined) {
        aristas.set(llave, t);
      } else if (normales[t].dot(normales[otro]) >= COS_SUAVE) {
        const ra = raiz(padre, t);
        const rb = raiz(padre, otro);
        if (ra !== rb) padre[ra] = rb;
      }
    }
  }

  geo.computeBoundingBox();
  const caja = geo.boundingBox!;
  const tam = caja.getSize(new THREE.Vector3());

  const porRaiz = new Map<number, CaraDetectada>();
  const centroTri = new THREE.Vector3();
  for (let t = 0; t < nTri; t++) {
    if (areas[t] <= 1e-12) continue;
    const r = raiz(padre, t);
    let cara = porRaiz.get(r);
    if (!cara) {
      cara = {
        tris: [],
        n: new THREE.Vector3(),
        centro: new THREE.Vector3(),
        cajaC: new THREE.Vector3(),
        area: 0,
      };
      porRaiz.set(r, cara);
    }
    a.fromBufferAttribute(pos, vert(t, 0));
    b.fromBufferAttribute(pos, vert(t, 1));
    c.fromBufferAttribute(pos, vert(t, 2));
    centroTri.copy(a).add(b).add(c).multiplyScalar(1 / 3);
    cara.tris.push(t);
    cara.area += areas[t];
    cara.n.addScaledVector(normales[t], areas[t]);
    cara.centro.addScaledVector(centroTri, areas[t]);
  }

  const caras: CaraDetectada[] = [];
  for (const cara of porRaiz.values()) {
    if (cara.area <= 1e-9) continue;
    cara.centro.multiplyScalar(1 / cara.area);
    if (cara.n.lengthSq() < 1e-12) continue;
    cara.n.normalize();
    cara.cajaC.set(
      tam.x > 1e-6 ? (cara.centro.x - caja.min.x) / tam.x : 0.5,
      tam.y > 1e-6 ? (cara.centro.y - caja.min.y) / tam.y : 0.5,
      tam.z > 1e-6 ? (cara.centro.z - caja.min.z) / tam.z : 0.5,
    );
    caras.push(cara);
  }
  return caras;
}

/** Ficha guardable de una cara reconocida. */
export function fichaDeCara(cara: CaraDetectada): CaraChapa {
  return {
    n: [cara.n.x, cara.n.y, cara.n.z],
    c: [cara.cajaC.x, cara.cajaC.y, cara.cajaC.z],
  };
}

/**
 * Vuelve a encontrar en `caras` las que describe la lista guardada. Se exige
 * que miren para el mismo lado y se queda con la más cercana; una ficha que no
 * encaja con nada —la pieza cambió de forma— se ignora en silencio, que es
 * mejor que quitar la cara equivocada.
 */
export function emparejarCaras(caras: CaraDetectada[], fichas: CaraChapa[]): Set<number> {
  const fuera = new Set<number>();
  for (const f of fichas) {
    const n = new THREE.Vector3(f.n[0], f.n[1], f.n[2]);
    const c = new THREE.Vector3(f.c[0], f.c[1], f.c[2]);
    let mejor = -1;
    let corta = 0.45;
    for (let i = 0; i < caras.length; i++) {
      if (fuera.has(i) || caras[i].n.dot(n) < 0.75) continue;
      const d = caras[i].cajaC.distanceTo(c);
      if (d < corta) {
        corta = d;
        mejor = i;
      }
    }
    if (mejor >= 0) fuera.add(mejor);
  }
  return fuera;
}

/**
 * LA TRANSFORMACIÓN. Devuelve la malla convertida en plancha, o la misma si no
 * hay nada que hacer. No toca la original.
 */
export function chapaGeometria(
  geo: THREE.BufferGeometry,
  chapa: ChapaParams | undefined,
): THREE.BufferGeometry {
  if (!chapa || !(chapa.grosorCm > 0)) return geo;
  const caras = detectarCaras(geo);
  if (caras.length === 0) return geo;
  const { nTri, pos, vert } = lectura(geo);

  const fuera = emparejarCaras(caras, chapa.caras ?? []);
  const quitar = new Uint8Array(nTri);
  for (const i of fuera) for (const t of caras[i].tris) quitar[t] = 1;

  // NO SE DEJA A LA PIEZA SIN NADA. Quitarlo todo no es una chapa: es borrar
  // la pieza, y para eso está la tecla de borrar.
  let quedan = 0;
  for (let t = 0; t < nTri; t++) if (!quitar[t]) quedan++;
  if (quedan === 0) return geo;

  // Soldadura otra vez, ahora para poder mover un punto y que se muevan con él
  // todos los triángulos que lo tocan (si no, la plancha se abre por dentro).
  const sold = new Int32Array(pos.count);
  const clave = new Map<string, number>();
  const punto: THREE.Vector3[] = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const k = `${Math.round(x * 1e4)},${Math.round(y * 1e4)},${Math.round(z * 1e4)}`;
    let id = clave.get(k);
    if (id === undefined) {
      id = clave.size;
      clave.set(k, id);
      punto.push(new THREE.Vector3(x, y, z));
    }
    sold[i] = id;
  }

  const nPuntos = punto.length;
  // LAS CARAS DE CADA PUNTO, SIN REPETIR. Lo que decide cuánto se mete un
  // punto son las SUPERFICIES que se juntan en él, no cuántos triángulos trae
  // cada una: la esquina de un cubo toca tres caras, y da igual que una de
  // ellas ponga dos triángulos y otra uno. Pesando triángulos, la normal media
  // se escoraba hacia la cara más partida y el rincón de la cubeta salía medio
  // milímetro fuera de sitio.
  const carasDelPunto: Map<string, THREE.Vector3>[] = [];
  for (let i = 0; i < nPuntos; i++) carasDelPunto.push(new Map());
  const nTriangulo: THREE.Vector3[] = new Array(nTri);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let t = 0; t < nTri; t++) {
    if (quitar[t]) continue;
    a.copy(punto[sold[vert(t, 0)]]);
    b.copy(punto[sold[vert(t, 1)]]);
    c.copy(punto[sold[vert(t, 2)]]);
    const cruz = b.clone().sub(a).cross(c.clone().sub(a));
    const area = cruz.length() / 2;
    if (area <= 1e-12) {
      nTriangulo[t] = new THREE.Vector3(0, 1, 0);
      continue;
    }
    nTriangulo[t] = cruz.clone().normalize();
    const n = nTriangulo[t];
    const llaveN = `${Math.round(n.x * 1e3)},${Math.round(n.y * 1e3)},${Math.round(n.z * 1e3)}`;
    for (let k = 0; k < 3; k++) carasDelPunto[sold[vert(t, k)]].set(llaveN, n);
  }

  // Normal media del punto y corrección de INGLETE: cuánto hay que meterlo por
  // esa normal para que TODAS sus caras queden a `grosor` de donde estaban.
  const normalMedia: THREE.Vector3[] = [];
  const dentro: THREE.Vector3[] = [];
  for (let i = 0; i < nPuntos; i++) {
    const N = new THREE.Vector3();
    for (const n of carasDelPunto[i].values()) N.add(n);
    if (N.lengthSq() > 1e-16) N.normalize();
    normalMedia.push(N);
    let suma = 0;
    let cuantas = 0;
    for (const n of carasDelPunto[i].values()) {
      suma += N.dot(n);
      cuantas++;
    }
    const cos = cuantas > 0 ? suma / cuantas : 1;
    const factor = Math.min(INGLETE_MAX, 1 / Math.max(0.3, cos));
    dentro.push(punto[i].clone().addScaledVector(N, -chapa.grosorCm * factor));
  }

  const salida: number[] = [];
  const empuje = (p: THREE.Vector3): void => void salida.push(p.x, p.y, p.z);

  // 1) La cara de fuera, tal cual estaba. 2) la de dentro, del revés.
  for (let t = 0; t < nTri; t++) {
    if (quitar[t]) continue;
    const i0 = sold[vert(t, 0)];
    const i1 = sold[vert(t, 1)];
    const i2 = sold[vert(t, 2)];
    empuje(punto[i0]);
    empuje(punto[i1]);
    empuje(punto[i2]);
    empuje(dentro[i0]);
    empuje(dentro[i2]);
    empuje(dentro[i1]);
  }

  // 3) EL CANTO. Una arista que solo pertenece a un triángulo de los que se
  // quedan es un borde de la plancha: ahí se ve el grosor.
  const vecinos = new Map<number, number>();
  for (let t = 0; t < nTri; t++) {
    if (quitar[t]) continue;
    for (let k = 0; k < 3; k++) {
      const p = sold[vert(t, k)];
      const q = sold[vert(t, (k + 1) % 3)];
      const llave = p < q ? p * 1e7 + q : q * 1e7 + p;
      vecinos.set(llave, (vecinos.get(llave) ?? 0) + 1);
    }
  }
  const medio = new THREE.Vector3();
  for (let t = 0; t < nTri; t++) {
    if (quitar[t] || !nTriangulo[t]) continue;
    for (let k = 0; k < 3; k++) {
      const iA = sold[vert(t, k)];
      const iB = sold[vert(t, (k + 1) % 3)];
      const iC = sold[vert(t, (k + 2) % 3)];
      const llave = iA < iB ? iA * 1e7 + iB : iB * 1e7 + iA;
      if ((vecinos.get(llave) ?? 0) !== 1) continue;
      const A = punto[iA];
      const B = punto[iB];
      // Hacia dónde mira el canto: perpendicular a la arista y a la cara, y
      // dando la espalda al triángulo (el tercer vértice queda detrás).
      const arista = B.clone().sub(A);
      const afuera = arista.clone().cross(nTriangulo[t]);
      medio.copy(A).add(B).multiplyScalar(0.5).sub(punto[iC]);
      if (afuera.dot(medio) < 0) afuera.negate();
      const nCanto = B.clone().sub(A).cross(dentro[iB].clone().sub(B));
      if (nCanto.dot(afuera) >= 0) {
        empuje(A); empuje(B); empuje(dentro[iB]);
        empuje(A); empuje(dentro[iB]); empuje(dentro[iA]);
      } else {
        empuje(A); empuje(dentro[iB]); empuje(B);
        empuje(A); empuje(dentro[iA]); empuje(dentro[iB]);
      }
    }
  }

  const nueva = new THREE.BufferGeometry();
  nueva.setAttribute("position", new THREE.Float32BufferAttribute(salida, 3));
  nueva.computeVertexNormals();
  return nueva;
}
