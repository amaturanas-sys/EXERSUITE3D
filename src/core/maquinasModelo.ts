import * as THREE from "three";
import { getDefinition } from "../objects/componentLibrary";
import { buildGeometry } from "../objects/geometryFactory";
import { piezasDeMaquina } from "../objects/standardMachines";
import { componentModels } from "./componentModels";

/**
 * Modelos de MÁQUINA ESTÁNDAR completa (v0.2.1): las máquinas del modo
 * Sencillo son exportables como STL/OBJ y sustituibles por un archivo del
 * usuario, con la misma mecánica que los componentes de la biblioteca. El
 * modelo del usuario se guarda en componentModels bajo la clave
 * `maquina:<prefabId>`.
 */

export const MAQUINA_PREFIX = "maquina:";

export const claveMaquina = (prefabId: string): string => `${MAQUINA_PREFIX}${prefabId}`;

export const esClaveMaquina = (id: string): boolean => id.startsWith(MAQUINA_PREFIX);

/**
 * Hornea el ENSAMBLAJE completo de una máquina estándar como una sola
 * geometría (cm, centrada en planta y apoyada como el prefab): cada pieza con
 * su malla real de biblioteca si existe, o su primitiva paramétrica.
 */
export function hornearMaquina(prefabId: string): THREE.BufferGeometry {
  const spec = piezasDeMaquina(prefabId);
  if (!spec) throw new Error(`Máquina desconocida: ${prefabId}`);
  const posiciones: number[] = [];
  const m = new THREE.Matrix4();
  const e = new THREE.Euler();
  const v = new THREE.Vector3();
  for (const p of spec.piezas) {
    const def = getDefinition(p.comp);
    if (!def) continue;
    let geo = componentModels.geometryClone(p.comp);
    if (!geo) geo = buildGeometry({ ...def.defaults, ...p.params });
    const noIdx = geo.index ? geo.toNonIndexed() : geo;
    if (p.rot) e.set(p.rot[0], p.rot[1], p.rot[2]);
    else e.set(0, 0, 0);
    m.makeRotationFromEuler(e);
    m.setPosition(p.pos[0], p.pos[1], p.pos[2]);
    const attr = noIdx.getAttribute("position");
    for (let i = 0; i < attr.count; i++) {
      v.fromBufferAttribute(attr, i).applyMatrix4(m);
      posiciones.push(v.x, v.y, v.z);
    }
    if (noIdx !== geo) noIdx.dispose();
    geo.dispose();
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.Float32BufferAttribute(posiciones, 3));
  merged.computeVertexNormals();
  merged.computeBoundingBox();
  return merged;
}

/** Exporta una geometría como OBJ de texto (triángulos, cm). */
export function geometriaAOBJ(geo: THREE.BufferGeometry, nombre: string): string {
  const attr = geo.getAttribute("position");
  const idx = new Map<string, number>();
  const verts: string[] = [];
  const caras: string[] = [];
  const cara: number[] = [];
  for (let i = 0; i < attr.count; i++) {
    const x = attr.getX(i).toFixed(3);
    const y = attr.getY(i).toFixed(3);
    const z = attr.getZ(i).toFixed(3);
    const k = `${x},${y},${z}`;
    let n = idx.get(k);
    if (n === undefined) {
      n = verts.length + 1;
      idx.set(k, n);
      verts.push(`v ${x} ${y} ${z}`);
    }
    cara.push(n);
    if (cara.length === 3) {
      caras.push(`f ${cara[0]} ${cara[1]} ${cara[2]}`);
      cara.length = 0;
    }
  }
  return `# ${nombre} (EXERSUITE3D, cm)\n${verts.join("\n")}\n${caras.join("\n")}\n`;
}

/** Exporta una geometría como STL binario (cm). */
export function geometriaASTL(geo: THREE.BufferGeometry): Uint8Array {
  const attr = geo.getAttribute("position");
  const nTris = Math.floor(attr.count / 3);
  const buf = new ArrayBuffer(84 + nTris * 50);
  const dv = new DataView(buf);
  const cab = new TextEncoder().encode("EXERSUITE3D standard machine (cm)");
  new Uint8Array(buf, 0, Math.min(80, cab.length)).set(cab.subarray(0, 80));
  dv.setUint32(80, nTris, true);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const n = new THREE.Vector3();
  let off = 84;
  for (let i = 0; i < nTris; i++) {
    a.fromBufferAttribute(attr, i * 3);
    b.fromBufferAttribute(attr, i * 3 + 1);
    c.fromBufferAttribute(attr, i * 3 + 2);
    n.copy(b).sub(a).cross(c.clone().sub(a)).normalize();
    for (const val of [n.x, n.y, n.z, a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z]) {
      dv.setFloat32(off, val, true);
      off += 4;
    }
    dv.setUint16(off, 0, true);
    off += 2;
  }
  return new Uint8Array(buf);
}
