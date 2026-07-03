import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

// Carga del esqueleto humano de referencia (Open3DModel, LUMC — CC BY-SA).
// El GLB (Draco) y el decodificador estan vendorizados en public/ para que
// funcione offline en los empaquetados de Android/Windows.
// Atribucion: ver public/models/ATTRIBUTION.md.

const BASE = import.meta.env.BASE_URL;

let cached: THREE.Object3D | null = null;
let loadingPromise: Promise<THREE.Object3D> | null = null;

function makeLoader(): GLTFLoader {
  const draco = new DRACOLoader();
  draco.setDecoderPath(`${BASE}draco/`);
  const gltf = new GLTFLoader();
  gltf.setDRACOLoader(draco);
  return gltf;
}

function loadRaw(): Promise<THREE.Object3D> {
  if (cached) return Promise.resolve(cached);
  if (!loadingPromise) {
    loadingPromise = new Promise((resolve, reject) => {
      makeLoader().load(
        `${BASE}models/overview-skeleton.glb`,
        (gltf) => {
          cached = gltf.scene;
          resolve(gltf.scene);
        },
        undefined,
        reject,
      );
    });
  }
  return loadingPromise;
}

const boneMaterial = new THREE.MeshStandardMaterial({
  color: 0xe9e1cf,
  roughness: 0.75,
  metalness: 0.0,
});

/**
 * Construye la figura del esqueleto normalizada a `heightCm`, con los pies en
 * y=0 y centrada en X/Z. Devuelve un Group con `userData.isHumanFigure`.
 */
export async function buildSkeletonFigure(heightCm: number): Promise<THREE.Group> {
  const raw = await loadRaw();
  const inner = raw.clone(true);
  inner.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.material = boneMaterial;
      o.castShadow = false;
      o.userData.humanFigurePart = true;
    }
  });

  // glTF puede venir rotado segun el exportador: si el modelo queda "tumbado"
  // (mas largo en Z que en Y) lo enderezamos a vertical.
  const pre = new THREE.Box3().setFromObject(inner);
  const preSize = new THREE.Vector3();
  pre.getSize(preSize);
  if (preSize.z > preSize.y * 1.3) {
    inner.rotation.x = -Math.PI / 2;
    inner.updateMatrixWorld(true);
  }

  // Escala a la altura objetivo (el modelo viene en metros) y apoya en el suelo.
  const box = new THREE.Box3().setFromObject(inner);
  const size = new THREE.Vector3();
  box.getSize(size);
  const scale = heightCm / size.y;
  inner.scale.multiplyScalar(scale);
  inner.updateMatrixWorld(true);

  const box2 = new THREE.Box3().setFromObject(inner);
  const center = new THREE.Vector3();
  box2.getCenter(center);
  inner.position.x -= center.x;
  inner.position.z -= center.z;
  inner.position.y -= box2.min.y;

  const group = new THREE.Group();
  group.name = "Figura humana (esqueleto)";
  group.userData.isHumanFigure = true;
  group.userData.heightCm = heightCm;
  // El clon comparte geometrias con la cache y usa el material singleton:
  // disposeHumanFigure no debe liberarlos.
  group.userData.sharedResources = true;
  group.add(inner);
  return group;
}
