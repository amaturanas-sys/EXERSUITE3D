import * as THREE from "three";

// Figura humana de referencia (maniqui a escala) para disenar maquinas en
// torno al cuerpo, al estilo de las "scale figures" de SketchUp.
// Construida de forma procedural a partir de primitivas con proporciones
// antropometricas estandar (~7.5 cabezas de altura). Parametrizable por la
// altura total en cm. Pensada como referencia visual: NO entra en la fisica.
//
// A futuro puede sustituirse por una malla glTF importada (p. ej. un esqueleto
// o maniqui detallado) conservando la misma interfaz (un Group con los pies en
// y=0 y la coronilla en y=heightCm).

export const DEFAULT_HUMAN_HEIGHT = 175;

function partMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x2f7dd1, // azul ilustrativo (como las figuras de referencia)
    metalness: 0.0,
    roughness: 0.6,
  });
}

interface Seg {
  geo: THREE.BufferGeometry;
  pos: [number, number, number];
}

/** Construye la figura humana con los pies en y=0 y la altura total dada (cm). */
export function buildHumanFigure(heightCm: number): THREE.Group {
  const H = heightCm;
  const mat = partMaterial();
  const cyl = (len: number, r: number) => new THREE.CylinderGeometry(r, r, len, 16);
  const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
  const ball = (r: number) => new THREE.SphereGeometry(r, 20, 14);

  const armX = 0.16 * H;
  const legX = 0.055 * H;

  const segs: Seg[] = [
    // Cabeza y cuello
    { geo: ball(0.066 * H), pos: [0, 0.932 * H, 0] },
    { geo: cyl(0.05 * H, 0.035 * H), pos: [0, 0.852 * H, 0] },
    // Torso y pelvis
    { geo: box(0.24 * H, 0.30 * H, 0.15 * H), pos: [0, 0.685 * H, 0] },
    { geo: box(0.20 * H, 0.10 * H, 0.13 * H), pos: [0, 0.5 * H, 0] },
    // Brazo izquierdo
    { geo: cyl(0.16 * H, 0.035 * H), pos: [-armX, 0.73 * H, 0] },
    { geo: cyl(0.15 * H, 0.03 * H), pos: [-armX, 0.575 * H, 0] },
    { geo: ball(0.035 * H), pos: [-armX, 0.46 * H, 0] },
    // Brazo derecho
    { geo: cyl(0.16 * H, 0.035 * H), pos: [armX, 0.73 * H, 0] },
    { geo: cyl(0.15 * H, 0.03 * H), pos: [armX, 0.575 * H, 0] },
    { geo: ball(0.035 * H), pos: [armX, 0.46 * H, 0] },
    // Pierna izquierda
    { geo: cyl(0.23 * H, 0.05 * H), pos: [-legX, 0.385 * H, 0] },
    { geo: cyl(0.23 * H, 0.04 * H), pos: [-legX, 0.155 * H, 0] },
    { geo: box(0.07 * H, 0.04 * H, 0.16 * H), pos: [-legX, 0.02 * H, 0.05 * H] },
    // Pierna derecha
    { geo: cyl(0.23 * H, 0.05 * H), pos: [legX, 0.385 * H, 0] },
    { geo: cyl(0.23 * H, 0.04 * H), pos: [legX, 0.155 * H, 0] },
    { geo: box(0.07 * H, 0.04 * H, 0.16 * H), pos: [legX, 0.02 * H, 0.05 * H] },
  ];

  const group = new THREE.Group();
  group.name = "Figura humana";
  group.userData.isHumanFigure = true;
  group.userData.heightCm = H;

  for (const s of segs) {
    const mesh = new THREE.Mesh(s.geo, mat);
    mesh.position.set(...s.pos);
    mesh.castShadow = true;
    mesh.userData.humanFigurePart = true;
    group.add(mesh);
  }
  return group;
}

/** Libera la geometria de la figura. */
export function disposeHumanFigure(group: THREE.Group): void {
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      (o.material as THREE.Material).dispose?.();
    }
  });
}
