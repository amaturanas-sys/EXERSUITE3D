import * as THREE from "three";
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

/** True si todos los nodos son colineales (la pieza sigue recta). */
export function pathIsStraight(path: [number, number, number][] | undefined): boolean {
  if (!path || path.length < 3) return true;
  const a = new THREE.Vector3(...path[0]);
  const b = new THREE.Vector3(...path[path.length - 1]);
  const dir = b.clone().sub(a);
  const len = dir.length();
  if (len < 1e-6) return true;
  dir.divideScalar(len);
  const tmp = new THREE.Vector3();
  for (let i = 1; i < path.length - 1; i++) {
    tmp.set(...path[i]).sub(a);
    const d = tmp.clone().sub(dir.clone().multiplyScalar(tmp.dot(dir))).length();
    if (d > 0.05) return false; // medio milimetro de tolerancia
  }
  return true;
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

/** Curva suave que pasa por los nodos del path (para barrer perfiles). */
function pathCurve(path: [number, number, number][]): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(pathVectors(path), false, "catmullrom", 0.5);
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

  if (!pathIsStraight(path)) return sweepProfile(rectShape(W, D), path);

  const L = Math.max(pathLength(path), 1);
  const holeR = Math.max(0, (p.holeDiameter ?? 0) / 2);
  const spacing = Math.max(p.holeSpacing ?? 5, holeR * 2 + 0.5);

  // Cara del perfil: largo L en X, ancho W en Y; se extruye el fondo D en Z.
  const face = new THREE.Shape();
  face.moveTo(-L / 2, -W / 2);
  face.lineTo(L / 2, -W / 2);
  face.lineTo(L / 2, W / 2);
  face.lineTo(-L / 2, W / 2);
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

  if (p.ends === "diagonal") {
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

/** Tubo de acero. Recto: cilindro con tapas. Doblado: circulo barrido. */
export function buildTubeGeometry(p: PrimitiveParams): THREE.BufferGeometry {
  const r = p.radius ?? 2.4;
  const path = p.path ?? straightPath(100);
  if (pathIsStraight(path)) {
    const L = Math.max(pathLength(path), 1);
    return new THREE.CylinderGeometry(r, r, L, 24, 1);
  }
  const circle = new THREE.Shape();
  circle.absarc(0, 0, r, 0, Math.PI * 2, false);
  return sweepProfile(circle, path);
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
