import * as THREE from "three";
import { getDefinition } from "../objects/componentLibrary";
import { Rope } from "../objects/Rope";
import { SceneObject } from "../objects/SceneObject";
import type { PiezaSpec } from "../objects/standardMachines";
import { piezasDeMaquina } from "../objects/standardMachines";
import { componentModels } from "./componentModels";
import { prefabsMaquina } from "./prefabsMaquina";

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
 * ARMA LA MÁQUINA CON SUS PIEZAS DE VERDAD (v0.3.2).
 *
 * Antes, el modelo de la máquina se cocinaba aparte: por cada pieza del spec
 * se llamaba a `buildGeometry({ ...def.defaults, ...p.params })` y se le
 * aplicaba la pose a mano. Era una SEGUNDA implementación del armado, y se
 * había quedado atrás respecto de la primera —la del editor—, que es la que
 * ve el usuario:
 *
 *   · ignoraba la `orientacion` de fábrica del componente (la que aplica
 *     `Editor.addComponent`), así que las piezas que el spec no rota
 *     explícitamente salían tumbadas: la UpperMachine se horneaba 16,6 cm más
 *     ancha y descentrada 8,3 cm respecto de la que se inserta;
 *   · no construía las piezas HIJAS que se generan solas —las quince placas
 *     de la pila de pesos, los discos del portadiscos, la carga de la barra—,
 *     de modo que la torre de poleas perdía la mitad de su malla;
 *   · y perdía el material de cada pieza, porque fundía todo en una geometría
 *     sin más.
 *
 * Ahora se arma con `SceneObject`, que es LA MISMA CLASE que el editor pone en
 * el diseño, siguiendo paso por paso lo que hacen `Editor.addComponent` y
 * `construirPiezas`. Así el modelo de la biblioteca no puede volver a
 * desviarse de la máquina: es la máquina.
 *
 * Viajan también las CUERDAS de seguridad, que tienen malla propia. Lo único
 * que no viaja son los CABLES: en el editor son un trazado (polilínea entre
 * nodos) y no una superficie, así que no hay malla que hornear.
 */
export function armarMaquina(prefabId: string): {
  raiz: THREE.Group;
  piezas: SceneObject[];
  cuerdas: Rope[];
} {
  // El prefab del USUARIO (si sustituyó la máquina) manda sobre la fábrica.
  const propio = prefabsMaquina.get(prefabId);
  const fabrica = piezasDeMaquina(prefabId);
  const listaPiezas = (propio ? propio.piezas : fabrica?.piezas) as PiezaSpec[] | undefined;
  if (!listaPiezas) throw new Error(`Máquina desconocida: ${prefabId}`);
  // Las CUERDAS solo las declara la fábrica: el formato de prefab del usuario
  // todavía no las captura, y la inserción real tampoco las tiende en ese
  // caso (`Editor.insertarMaquina` solo aplica piezas, uniones y cables).
  const listaCuerdas = propio ? [] : (fabrica?.cuerdas ?? []);
  const raiz = new THREE.Group();
  const piezas: SceneObject[] = [];
  // Alineado con `listaPiezas` por índice: las cuerdas citan a sus anclas por
  // posición en el spec, así que una pieza saltada no puede correr la cuenta.
  const porIndice: (SceneObject | null)[] = [];
  for (const p of listaPiezas) {
    const def = getDefinition(p.comp);
    if (!def) {
      porIndice.push(null);
      continue;
    }
    const obj = new SceneObject({
      name: p.nombre ?? def.label,
      componentId: def.id,
      category: def.category,
      params: structuredClone(def.defaults),
      physics: def.physics,
      materialId: def.materialId,
      // La PILA y la CARGA levantan sus piezas hijas en el constructor: las
      // quince placas, las varillas, los discos montados.
      stack: def.stack,
      carga: def.cargaDiscos,
    });
    // Modelo 3D sustituido por el usuario para esa pieza, si lo hay. Se pide
    // por el id VIGENTE (`def.id`), como hace `addComponent`: un prefab
    // antiguo puede nombrar una pieza retirada que se resuelve a su sustituta.
    const modelo = componentModels.geometryClone(def.id);
    if (modelo) obj.applyCustomGeometry(modelo);
    // Orientación natural de inserción (la de `addComponent`); si el spec trae
    // rotación propia, la de abajo la reemplaza, igual que en el editor.
    if (def.orientacion) {
      obj.mesh.rotation.set(def.orientacion[0], def.orientacion[1], def.orientacion[2]);
    }
    if (p.params) {
      obj.params = structuredClone({ ...obj.params, ...p.params });
      obj.rebuildGeometry();
    }
    if (p.material) obj.setMaterial(p.material);
    obj.mesh.position.set(p.pos[0], p.pos[1], p.pos[2]);
    if (p.rotq) obj.mesh.quaternion.set(p.rotq[0], p.rotq[1], p.rotq[2], p.rotq[3]);
    else if (p.rot) obj.mesh.rotation.set(p.rot[0], p.rot[1], p.rot[2]);
    if (p.escala) {
      obj.mesh.scale.set(p.escala[0], p.escala[1], p.escala[2]);
      normalizarEspejo(obj);
    }
    raiz.add(obj.mesh);
    piezas.push(obj);
    porIndice.push(obj);
  }
  raiz.updateMatrixWorld(true);

  // LAS CUERDAS DE SEGURIDAD también son la máquina: en el rack son dos
  // correas tendidas entre los montantes, con malla propia. Se tienden como
  // las tiende el editor (`aplicarCuerdas` → `createRope` → `rebuildRope`),
  // resolviendo los extremos contra las piezas ya posadas.
  const cuerdas: Rope[] = [];
  const enMundo = (o: SceneObject, l: [number, number, number]): THREE.Vector3 => {
    o.mesh.updateMatrixWorld();
    return new THREE.Vector3(l[0], l[1], l[2]).applyMatrix4(o.mesh.matrixWorld);
  };
  for (const c of listaCuerdas) {
    const A = porIndice[c.a.pieza];
    const B = porIndice[c.b.pieza];
    if (!A || !B) continue;
    const cuerda = new Rope({
      kind: c.tipo,
      a: { objectId: A.id, local: new THREE.Vector3(...c.a.local) },
      b: { objectId: B.id, local: new THREE.Vector3(...c.b.local) },
      slack: c.holgura ?? 0.15,
    });
    cuerda.rebuild(
      enMundo(A, c.a.local),
      enMundo(B, c.b.local),
      componentModels.geometryClone(c.tipo === "chain" ? "cadena-eslabones" : "liston-kevlar"),
    );
    raiz.add(cuerda.group);
    cuerdas.push(cuerda);
  }
  raiz.updateMatrixWorld(true);
  return { raiz, piezas, cuerdas };
}

/**
 * DE DÓNDE SALE HOY ESTA MÁQUINA, con la misma prioridad que la inserción
 * (`Editor.insertarMaquina`): el prefab del usuario manda sobre el modelo 3D
 * suelto, y este sobre la definición de fábrica. La Biblioteca lo consulta
 * para enseñar y exportar lo mismo que se va a insertar; tenerlo escrito una
 * sola vez es lo que impide que las dos prioridades se separen.
 */
export function origenDeMaquina(prefabId: string): "prefab" | "modelo" | "fabrica" {
  if (prefabsMaquina.has(prefabId)) return "prefab";
  if (componentModels.has(claveMaquina(prefabId))) return "modelo";
  return "fabrica";
}

/**
 * Volteos heredados como escala NEGATIVA: se hornean en la geometría para que
 * los ejes de la pieza vuelvan a concordar con los del mundo. Es la copia sin
 * editor de `Editor.normalizarEspejo` — la usa el armado de la biblioteca, que
 * corre desde la Home, donde no hay editor vivo.
 */
function normalizarEspejo(obj: SceneObject): void {
  const s = obj.mesh.scale;
  const neg: [boolean, boolean, boolean] = [s.x < 0, s.y < 0, s.z < 0];
  if (!neg[0] && !neg[1] && !neg[2]) return;
  const e = obj.espejoActual();
  for (let i = 0; i < 3; i++) if (neg[i]) e[i] = !e[i];
  obj.params.espejo = e.some(Boolean) ? e : undefined;
  s.set(Math.abs(s.x), Math.abs(s.y), Math.abs(s.z));
  obj.rebuildGeometry();
}

/**
 * Hornea el ENSAMBLAJE completo de una máquina estándar como una sola
 * geometría (cm, en el sitio del prefab): la máquina armada con sus piezas
 * reales, hijas incluidas, fundida en un solo cuerpo para exportar.
 */
export function hornearMaquina(prefabId: string): THREE.BufferGeometry {
  const { raiz, piezas, cuerdas } = armarMaquina(prefabId);
  const posiciones: number[] = [];
  // LAS NORMALES DE CADA PIEZA VIAJAN (v0.3.2). Antes se tiraban y se
  // recalculaban sobre la malla fundida sin índice, que da una normal por
  // triángulo: los cilindros —roldanas, barras, varillas— salían facetados,
  // distintos de como se ven en el editor. Ahora se transportan con la matriz
  // normal de la pieza, así que el modelo exportado se sombrea igual.
  const normales: number[] = [];
  let todasConNormal = true;
  const v = new THREE.Vector3();
  const nm = new THREE.Matrix3();
  raiz.traverse((n) => {
    const malla = n as THREE.Mesh;
    if (!malla.isMesh || !malla.geometry) return;
    // Las ayudas de aristas del modo Ver son LineSegments, no mallas: no entran.
    const geo = malla.geometry.index ? malla.geometry.toNonIndexed() : malla.geometry;
    const attr = geo.getAttribute("position");
    const nat = geo.getAttribute("normal");
    if (attr) {
      nm.getNormalMatrix(malla.matrixWorld);
      for (let i = 0; i < attr.count; i++) {
        v.fromBufferAttribute(attr, i).applyMatrix4(malla.matrixWorld);
        posiciones.push(v.x, v.y, v.z);
      }
      if (nat && nat.count === attr.count) {
        for (let i = 0; i < nat.count; i++) {
          v.fromBufferAttribute(nat, i).applyMatrix3(nm).normalize();
          normales.push(v.x, v.y, v.z);
        }
      } else {
        todasConNormal = false;
      }
    }
    if (geo !== malla.geometry) geo.dispose();
  });
  for (const o of piezas) o.dispose();
  for (const c of cuerdas) c.dispose();
  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.Float32BufferAttribute(posiciones, 3));
  if (todasConNormal && normales.length === posiciones.length) {
    merged.setAttribute("normal", new THREE.Float32BufferAttribute(normales, 3));
  } else {
    merged.computeVertexNormals();
  }
  merged.computeBoundingBox();
  return merged;
}

/**
 * Exporta una geometría como OBJ de texto (triángulos, cm). Si la malla trae
 * normales, viajan como `vn` y las caras las citan (`f v//vn`): así el modelo
 * descargado se sombrea en otros programas como se ve aquí, con los cilindros
 * redondos en vez de facetados.
 */
export function geometriaAOBJ(geo: THREE.BufferGeometry, nombre: string): string {
  const attr = geo.getAttribute("position");
  const nat = geo.getAttribute("normal");
  const conNormal = !!nat && nat.count === attr.count;
  const idx = new Map<string, number>();
  const idxN = new Map<string, number>();
  const verts: string[] = [];
  const normales: string[] = [];
  const caras: string[] = [];
  const cara: string[] = [];
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
    if (conNormal) {
      const nx = nat.getX(i).toFixed(4);
      const ny = nat.getY(i).toFixed(4);
      const nz = nat.getZ(i).toFixed(4);
      const kn = `${nx},${ny},${nz}`;
      let m = idxN.get(kn);
      if (m === undefined) {
        m = normales.length + 1;
        idxN.set(kn, m);
        normales.push(`vn ${nx} ${ny} ${nz}`);
      }
      cara.push(`${n}//${m}`);
    } else {
      cara.push(String(n));
    }
    if (cara.length === 3) {
      caras.push(`f ${cara[0]} ${cara[1]} ${cara[2]}`);
      cara.length = 0;
    }
  }
  const cuerpo = [verts.join("\n"), conNormal ? normales.join("\n") : "", caras.join("\n")]
    .filter(Boolean)
    .join("\n");
  return `# ${nombre} (EXERSUITE3D, cm)\n${cuerpo}\n`;
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
