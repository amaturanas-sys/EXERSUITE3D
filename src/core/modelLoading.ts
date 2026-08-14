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
 * Fusiona, escala a cm (heurística metros→cm) y centra en el origen: lista para
 * sustituir a la primitiva de un componente.
 */
export function bakeComponentGeometry(root: THREE.Object3D): THREE.BufferGeometry {
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

  merged.computeBoundingBox();
  const center = new THREE.Vector3();
  merged.boundingBox!.getCenter(center);
  merged.applyMatrix4(new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z));
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}
