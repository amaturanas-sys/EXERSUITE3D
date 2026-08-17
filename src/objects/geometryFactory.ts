import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { degToRad } from "../core/units";
import { buildBeamGeometry, buildTubeGeometry } from "./linePieces";
import { buildDentadaGeometry } from "./placaDentada";
import type { PrimitiveParams } from "./types";

// Construye una BufferGeometry a partir de parametros en centimetros.
// 1 unidad de mundo == 1 cm. Soporta modelado avanzado:
//   bendDeg  -> doblar a lo largo del eje Y (arco)
//   twistDeg -> torcer alrededor del eje Y
//   bevel    -> biselar/redondear aristas (solo cajas)

function segFor(len: number): number {
  return THREE.MathUtils.clamp(Math.round(len / 4), 6, 60);
}

function baseGeometry(p: PrimitiveParams, deform: boolean): THREE.BufferGeometry {
  const seg = p.radialSegments ?? 32;
  const w = p.width ?? 10;
  const h = p.height ?? 10;
  const d = p.depth ?? 10;
  switch (p.kind) {
    case "box": {
      // Muro TRAPEZOIDAL (height2 ≠ height): prisma cuyo tope sube de la
      // altura del extremo −X a la del extremo +X — la pared toca una
      // techumbre inclinada en toda su longitud, sin huecos.
      const h2 = p.height2;
      if (h2 !== undefined && Math.abs(h2 - h) > 0.01) {
        const forma = new THREE.Shape();
        forma.moveTo(-w / 2, 0);
        forma.lineTo(w / 2, 0);
        forma.lineTo(w / 2, h2);
        forma.lineTo(-w / 2, h);
        forma.closePath();
        const geo = new THREE.ExtrudeGeometry(forma, { depth: d, bevelEnabled: false });
        geo.translate(0, 0, -d / 2);
        // Centrado vertical como cualquier primitiva (base en −hMax/2).
        geo.translate(0, -Math.max(h, h2) / 2, 0);
        geo.computeVertexNormals();
        return geo;
      }
      // Dos orificios verticales pasantes (bloques/pilas de sistemas de
      // poleas guiadas): el bloque se extruye como placa con agujeros y se
      // levanta para que los orificios queden a lo largo del eje Y.
      const holeR = (p.holeDiameter ?? 0) / 2;
      if (holeR > 0.01 && !deform) {
        const sep = p.holeSpacing ?? 0;
        const forma = new THREE.Shape();
        forma.moveTo(-w / 2, -d / 2);
        forma.lineTo(w / 2, -d / 2);
        forma.lineTo(w / 2, d / 2);
        forma.lineTo(-w / 2, d / 2);
        forma.closePath();
        for (const cx of sep > 0.01 ? [-sep / 2, sep / 2] : [0]) {
          const agujero = new THREE.Path();
          agujero.absarc(cx, 0, Math.min(holeR, w / 2 - 0.1, d / 2 - 0.1), 0, Math.PI * 2, true);
          forma.holes.push(agujero);
        }
        const geo = new THREE.ExtrudeGeometry(forma, {
          depth: h,
          bevelEnabled: false,
          curveSegments: 24,
        });
        geo.rotateX(-Math.PI / 2); // la extrusion (Z) pasa a ser la altura (Y)
        geo.translate(0, -h / 2, 0);
        geo.computeVertexNormals();
        return geo;
      }
      const bevel = p.bevel ?? 0;
      if (bevel > 0.01) {
        const r = Math.min(bevel, Math.min(w, h, d) / 2 - 0.01);
        return new RoundedBoxGeometry(w, h, d, 4, r);
      }
      return new THREE.BoxGeometry(
        w, h, d,
        deform ? 3 : 1,
        deform ? segFor(h) : 1,
        deform ? 3 : 1,
      );
    }
    case "plane":
      return new THREE.PlaneGeometry(w, d);
    case "cylinder":
      return new THREE.CylinderGeometry(
        p.radiusTop ?? 5, p.radiusBottom ?? 5, h, seg, deform ? segFor(h) : 1,
      );
    case "cone":
      return new THREE.ConeGeometry(p.radiusBottom ?? 5, h, seg, deform ? segFor(h) : 1);
    case "sphere":
      return new THREE.SphereGeometry(p.radius ?? 5, seg, Math.max(8, seg / 2));
    case "torus":
      return new THREE.TorusGeometry(p.radius ?? 8, p.tubeRadius ?? 1.5, 16, seg);
    default:
      return new THREE.BoxGeometry(10, 10, 10);
  }
}

/** Torsion alrededor del eje Y: angulo proporcional a la altura. */
function applyTwist(geo: THREE.BufferGeometry, totalRad: number, height: number): void {
  if (Math.abs(totalRad) < 1e-4 || height < 1e-4) return;
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const a = totalRad * (y / height);
    const c = Math.cos(a), s = Math.sin(a);
    pos.setX(i, x * c - z * s);
    pos.setZ(i, x * s + z * c);
  }
  pos.needsUpdate = true;
}

/** Doblado del eje Y en el plano XY (arco), conservando la seccion. */
function applyBend(geo: THREE.BufferGeometry, totalRad: number, height: number): void {
  if (Math.abs(totalRad) < 1e-4 || height < 1e-4) return;
  const k = totalRad / height;
  const R = 1 / k;
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const a = k * y;
    const c = Math.cos(a), s = Math.sin(a);
    pos.setX(i, R - (R - x) * c);
    pos.setY(i, (R - x) * s);
  }
  pos.needsUpdate = true;
}

export function buildGeometry(p: PrimitiveParams): THREE.BufferGeometry {
  // Piezas de linea: su forma la define el path de nodos (bending propio),
  // no el doblado/torsion legado de las primitivas.
  if (p.kind === "beam") return buildBeamGeometry(p);
  if (p.kind === "tube") return buildTubeGeometry(p);
  // La placa dentada se fabrica entera —plancha, ganchos y pernos— desde su
  // número de dientes y su paso; no admite el doblado/torsión de abajo.
  if (p.kind === "dentada") return buildDentadaGeometry(p);
  const bend = degToRad(p.bendDeg ?? 0);
  const twist = degToRad(p.twistDeg ?? 0);
  const deform = Math.abs(bend) > 1e-4 || Math.abs(twist) > 1e-4;
  const geo = baseGeometry(p, deform);
  if (deform) {
    geo.computeBoundingBox();
    const height = geo.boundingBox!.max.y - geo.boundingBox!.min.y;
    applyTwist(geo, twist, height);
    applyBend(geo, bend, height);
    geo.computeVertexNormals();
    geo.computeBoundingBox(); // recalcula tras deformar (si no, queda cacheado)
    geo.computeBoundingSphere();
  }
  return geo;
}

/** Devuelve las dimensiones del bounding box (cm) de una geometria. */
export function geometrySize(geo: THREE.BufferGeometry): THREE.Vector3 {
  geo.computeBoundingBox();
  const size = new THREE.Vector3();
  geo.boundingBox!.getSize(size);
  return size;
}
