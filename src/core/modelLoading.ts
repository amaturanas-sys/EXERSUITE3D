import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Carga y horneado de modelos 3D (glb/gltf/obj). Todo aquí es independiente del
 * renderer (no necesita contexto WebGL), por lo que puede usarse tanto en el
 * editor como en la biblioteca autónoma.
 */

// Un unico DRACOLoader compartido: cada instancia crea workers y un modulo
// WASM propios que nunca se liberan si se instancian por carga.
let sharedGltfLoader: GLTFLoader | null = null;

function gltfLoader(): GLTFLoader {
  if (!sharedGltfLoader) {
    const draco = new DRACOLoader();
    draco.setDecoderPath(`${import.meta.env.BASE_URL}draco/`);
    sharedGltfLoader = new GLTFLoader();
    sharedGltfLoader.setDRACOLoader(draco);
  }
  return sharedGltfLoader;
}

/** Carga un modelo desde sus bytes y devuelve su raíz. */
export async function loadModelRoot(bytes: ArrayBuffer, ext: string): Promise<THREE.Object3D> {
  if (ext === "stl") {
    // STL: geometría pura (sin materiales); parse directo desde los bytes.
    const grupo = new THREE.Group();
    grupo.add(new THREE.Mesh(new STLLoader().parse(bytes)));
    return grupo;
  }
  const url = URL.createObjectURL(new Blob([bytes]));
  try {
    if (ext === "obj") return await new OBJLoader().loadAsync(url);
    return (await gltfLoader().loadAsync(url)).scene;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Deja la geometría con solo position/normal/uv (no indexada) para fusionar. */
export function normalizeGeometry(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const src = g.index ? g.toNonIndexed() : g;
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", src.getAttribute("position"));
  if (src.getAttribute("normal")) out.setAttribute("normal", src.getAttribute("normal"));
  const count = src.getAttribute("position").count;
  out.setAttribute(
    "uv",
    src.getAttribute("uv") ?? new THREE.BufferAttribute(new Float32Array(count * 2), 2),
  );
  if (!src.getAttribute("normal")) out.computeVertexNormals();
  return out;
}

/**
 * Primer material CON TEXTURA del modelo, o null si no trae ninguno.
 *
 * `mergeRootGeometry` funde todas las mallas en una sola geometría y tira los
 * materiales, que es lo correcto para una pieza de máquina —se pinta del color
 * del proyecto—, pero no para un segmento del maniquí escaneado: ahí la piel
 * fotográfica ES el modelo. Se busca el primero que tenga mapa porque un
 * escaneo trae una sola textura para todo el cuerpo.
 */
export function firstTexturedMaterial(root: THREE.Object3D): THREE.Material | null {
  let out: THREE.Material | null = null;
  root.traverse((o) => {
    if (out) return;
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as
      | THREE.MeshStandardMaterial
      | undefined;
    if (mat?.map) out = mat;
  });
  return out;
}

/**
 * SEPARA EL ROTULADO DEL HIERRO, para poder pintarlo de otro color (v0.3.65).
 *
 * Las letras de un disco son el MISMO hierro que el resto de la pieza; lo que
 * las hace blancas en la foto es la pintura. Aquí eso son dos materiales sobre
 * una misma malla, y dos materiales en three.js son dos GRUPOS sobre el índice.
 *
 * CÓMO SE SABE QUÉ TRIÁNGULO ES LETRA, sin mirar el dibujo. Un relieve es una
 * costra de `asomaCm` levantada sobre una SUPERFICIE PLANA de la pieza. Así que
 * primero se buscan esos planos y luego lo que sobresale de ellos:
 *
 *   1. LOS PLANOS SE PESAN POR ÁREA, NO POR VÉRTICES. Una cara plana grande
 *      —el fondo de un cuartel, la cara del hierro— tiene vértices sólo en sus
 *      esquinas: contando vértices no aparecería, y era justo el error que dejó
 *      los números de los cuarteles sin pintar en el primer intento.
 *   2. UN PLANO ES SOPORTE si es GRANDE, o si no es la TAPA de un relieve; y
 *      una tapa se reconoce por estar exactamente `asomaCm` encima de otro
 *      plano. Hacen falta las dos señales, y cada una tapa un agujero de la
 *      otra: por área sola no valen —las tapas de las letras suman el 2.1 % de
 *      la superficie plana en el disco de 25 lb y el 1.9 % en el de 45, así que
 *      cualquier umbral las parte por la mitad, y con uno del 2 % el de 25 se
 *      quedó sin pintar—; y por altura sola tampoco —en el de 5 lb, que es una
 *      chapa fina, la CARA cae por casualidad a 2.45 mm de las tapas de sus
 *      letras, se tomó por una tapa más y el disco salió pintado en un 39 %—.
 *      Una superficie de verdad de la pieza es grande; una tapa, nunca.
 *   3. UN TRIÁNGULO ES LETRA si cabe entero en la franja que va de un SOPORTE a
 *      `asomaCm` por encima, lo supera, y no descansa él mismo en un soporte.
 *      Lo último separa una letra de una cara: la cara del hierro también
 *      «sobresale» del plano del chaflán que tiene justo debajo, y sin esa
 *      condición el disco entero salía pintado de blanco con las letras en
 *      hierro.
 *
 * Con eso se pinta tanto la marca de la llanta —levantada sobre la cara— como
 * las cifras de los cuarteles —levantadas sobre su fondo, mucho más adentro—,
 * sin que la app tenga que saber a qué hondura está cada cosa.
 *
 * El eje se busca —es la cota menor del bulto—, no se da por supuesto.
 *
 * Devuelve `false` y deja la geometría intacta si no encuentra relieve, que es
 * lo que debe pasar con cualquier pieza que no lo lleve.
 */
export function separarRotulo(geo: THREE.BufferGeometry, asomaCm: number): boolean {
  const pos = geo.getAttribute("position");
  if (!pos || geo.index) return false; // se hornea sin índice; ver normalizeGeometry
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const size = new THREE.Vector3();
  bb.getSize(size);
  const centro = new THREE.Vector3();
  bb.getCenter(centro);
  const ejes = [size.x, size.y, size.z];
  const iEje = ejes.indexOf(Math.min(...ejes));
  if (asomaCm <= 0 || ejes[iEje] <= 2 * asomaCm) return false;
  const c0 = centro.getComponent(iEje);
  const eps = Math.max(1e-4, asomaCm * 0.05);
  const hondoEje = (i: number) =>
    Math.abs((iEje === 0 ? pos.getX(i) : iEje === 1 ? pos.getY(i) : pos.getZ(i)) - c0);

  // ── 1. LOS PLANOS DOMINANTES, pesados por área ─────────────────────────
  // EL PLANO SE GUARDA CON SU HONDURA REAL, no con la de su casilla. Redondear
  // al centro de la casilla desplaza el plano hasta medio paso, y entonces la
  // propia cara «sobresale» de sí misma: con eso, la primera versión de esto
  // pintó de blanco el disco entero y dejó las letras en hierro.
  const paso = asomaCm / 4;
  const areaPorPlano = new Map<number, number>();
  const hondoPorPlano = new Map<number, number>();
  let areaTotal = 0;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const u = new THREE.Vector3();
  const v = new THREE.Vector3();
  const hondos = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) hondos[i] = hondoEje(i);
  for (let i = 0; i + 2 < pos.count; i += 3) {
    const d0 = hondos[i], d1 = hondos[i + 1], d2 = hondos[i + 2];
    if (Math.max(d0, d1, d2) - Math.min(d0, d1, d2) > 1e-4) continue; // no es plano ⟂ al eje
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    const area = u.subVectors(b, a).cross(v.subVectors(c, a)).length() / 2;
    const k = Math.round(d0 / paso);
    areaPorPlano.set(k, (areaPorPlano.get(k) ?? 0) + area);
    hondoPorPlano.set(k, (hondoPorPlano.get(k) ?? 0) + area * d0);
    areaTotal += area;
  }
  if (areaTotal <= 0) return false;
  const conArea = [...areaPorPlano.entries()]
    .filter(([, ar]) => ar >= 0.005 * areaTotal)
    .map(([k, ar]) => ({ hondo: hondoPorPlano.get(k)! / ar, parte: ar / areaTotal }));
  const planos = conArea.map((x) => x.hondo);
  const soportes = conArea
    .filter(
      (x) =>
        x.parte >= 0.05 ||
        !planos.some((q) => Math.abs(x.hondo - (q + asomaCm)) <= eps),
    )
    .map((x) => x.hondo);
  if (soportes.length === 0) return false;

  // ── 2. LO QUE SOBRESALE DE ELLOS ───────────────────────────────────────
  const cuerpo: number[] = [];
  const letras: number[] = [];
  for (let i = 0; i + 2 < pos.count; i += 3) {
    const lejos = Math.max(hondos[i], hondos[i + 1], hondos[i + 2]);
    const cerca = Math.min(hondos[i], hondos[i + 1], hondos[i + 2]);
    let esLetra = false;
    if (!soportes.some((q) => Math.abs(lejos - q) <= eps)) {
      for (const p of soportes) {
        if (cerca >= p - eps && lejos <= p + asomaCm + eps && lejos > p + eps) {
          esLetra = true;
          break;
        }
      }
    }
    (esLetra ? letras : cuerpo).push(i, i + 1, i + 2);
  }
  if (letras.length === 0) return false;

  geo.setIndex([...cuerpo, ...letras]);
  geo.clearGroups();
  geo.addGroup(0, cuerpo.length, 0);
  geo.addGroup(cuerpo.length, letras.length, 1);
  return true;
}

/** Fusiona todas las mallas de un modelo en una sola geometría (matrices aplicadas). */
export function mergeRootGeometry(root: THREE.Object3D): THREE.BufferGeometry {
  root.updateMatrixWorld(true);
  const geos: THREE.BufferGeometry[] = [];
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      const mesh = o as THREE.Mesh;
      const g = mesh.geometry.clone();
      g.applyMatrix4(mesh.matrixWorld);
      geos.push(normalizeGeometry(g));
    }
  });
  if (geos.length === 0) throw new Error("El modelo no contiene mallas.");
  const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
  return merged ?? geos[0];
}

/**
 * Fusiona y escala a cm (heurística metros→cm), lista para sustituir a la
 * primitiva de un componente.
 *
 * `centrar` se puede apagar para los segmentos del maniquí. Una pieza de
 * máquina es un objeto suelto y centrarla es lo correcto; en cambio dieciséis
 * segmentos troceados de UN MISMO cuerpo llevan en sus coordenadas la
 * información de dónde va cada uno respecto a los demás, y centrarlos uno a uno
 * la borra: quedarían los dieciséis amontonados en el origen y habría que
 * adivinar la colocación pieza a pieza.
 */
export function bakeComponentGeometry(
  root: THREE.Object3D,
  centrar = true,
): THREE.BufferGeometry {
  const merged = mergeRootGeometry(root);
  merged.computeBoundingBox();
  const size = new THREE.Vector3();
  merged.boundingBox!.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  // Heurística de unidades → cm: <5 se asume METROS (×100); >600 se asume
  // MILÍMETROS (×0.1) — ninguna pieza de gimnasio supera los 6 m. Así los
  // STL de CAD (mm) entran con sus dimensiones físicas reales.
  const scale = maxDim > 0 && maxDim < 5 ? 100 : maxDim > 600 ? 0.1 : 1;
  if (scale !== 1) merged.applyMatrix4(new THREE.Matrix4().makeScale(scale, scale, scale));

  if (centrar) {
    merged.computeBoundingBox();
    const center = new THREE.Vector3();
    merged.boundingBox!.getCenter(center);
    merged.applyMatrix4(new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z));
  }
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}
