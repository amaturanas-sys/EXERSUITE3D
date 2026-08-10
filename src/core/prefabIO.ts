import * as THREE from "three";
import type { Editor } from "./Editor";
import type { CableSpec, PiezaSpec, UnionSpec } from "../objects/standardMachines";
import { piezasDeMaquina, STANDARD_MACHINES } from "../objects/standardMachines";
import { getDefinition } from "../objects/componentLibrary";
import { version as VERSION_APP } from "../../package.json";

/**
 * Prefabs estructurados v2 (v0.2.4): las máquinas editadas DENTRO de la app
 * se exportan como .json que reconoce cada parte y su función con atributos
 * EXHAUSTIVOS — componente, nombre, dimensiones completas, material, pose
 * exacta (posición + CUATERNIÓN), anclaje, masa, escala y las dimensiones de
 * control para validar la fidelidad al reimportar. El archivo se reinserta en
 * la app o SUSTITUYE a una máquina estándar sin transcripción manual.
 */

export interface PrefabArchivo {
  formato: "exersuite3d-prefab";
  version: 1 | 2;
  /** Versión de la app que exportó (trazabilidad de la biblioteca). */
  app?: string;
  label: string;
  piezas: PiezaSpec[];
  /** Uniones entre piezas (corredera/bisagra) que viajan con el prefab. */
  uniones?: UnionSpec[];
  /** Cables del sistema de poleas (v0.2.8): nodos por índice de pieza +
   *  anclaje LOCAL — preservan la función móvil del modelo al reinsertar. */
  cables?: CableSpec[];
}

/**
 * Serializa la SELECCIÓN actual (pieza, multiselección o grupo) como prefab
 * v2. Las posiciones quedan relativas al centro en planta (X/Z) y con la
 * altura absoluta (Y), igual que las especificaciones de fábrica.
 */
export function serializarPrefab(editor: Editor, label: string): string | null {
  const ids = editor.getSelectionIds();
  if (ids.length === 0) return null;
  const todos = editor.serialize().objects;
  const datos = ids
    .map((id) => todos.find((d) => d.id === id))
    .filter((d): d is NonNullable<typeof d> => !!d && !d.componentId.startsWith("ws-"));
  if (datos.length === 0) return null;

  // Centro en planta de la selección.
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const d of datos) {
    minX = Math.min(minX, d.position[0]);
    maxX = Math.max(maxX, d.position[0]);
    minZ = Math.min(minZ, d.position[2]);
    maxZ = Math.max(maxZ, d.position[2]);
  }
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;

  const r4 = (v: number) => Math.round(v * 10000) / 10000;
  const r6 = (v: number) => Math.round(v * 1000000) / 1000000;
  const piezas: PiezaSpec[] = datos.map((d) => {
    // El nombre limpio, sin el sufijo " (Máquina)" que añaden los prefabs.
    const nombre = d.name.includes(" (") ? d.name.slice(0, d.name.indexOf(" (")) : d.name;
    const vivo = editor.getObject(d.id);
    const pieza: PiezaSpec = {
      comp: d.componentId,
      nombre,
      params: { ...d.params },
      material: d.materialId,
      pos: [r4(d.position[0] - cx), r4(d.position[1]), r4(d.position[2] - cz)],
      // Cuaternión SIEMPRE presente en v2: pose exacta sin ambigüedad de
      // Euler ni de la orientación de inserción del componente.
      rotq: d.quaternion.map(r6) as [number, number, number, number],
      fija: d.physics.fixed,
      masaKg: d.physics.massKg,
    };
    if (d.scale.some((s) => Math.abs(s - 1) > 1e-4)) {
      pieza.escala = d.scale.map(r4) as [number, number, number];
    }
    if (vivo) {
      const s = vivo.effectiveSize();
      pieza.dims = [r4(s.x), r4(s.y), r4(s.z)];
    }
    return pieza;
  });

  // UNIONES entre piezas de la selección (correderas/bisagras): viajan con
  // el prefab para que la reconstrucción conserve la mecánica guiada.
  const indicePorId = new Map<string, number>();
  datos.forEach((d, i) => indicePorId.set(d.id, i));
  const uniones: UnionSpec[] = [];
  for (const j of editor.listJoints()) {
    const ia = indicePorId.get(j.bodyAId);
    const ib = indicePorId.get(j.bodyBId);
    if (ia === undefined || ib === undefined) continue;
    uniones.push({
      tipo: j.kind === "revolute" ? "bisagra" : "corredera",
      fija: ia,
      movil: ib,
      eje: j.axis,
      ejeVec: j.axisVec
        ? ([r6(j.axisVec.x), r6(j.axisVec.y), r6(j.axisVec.z)] as [number, number, number])
        : undefined,
      ancla: [r4(j.anchor.x - cx), r4(j.anchor.y), r4(j.anchor.z - cz)],
      min: j.min,
      max: j.max,
      limites: j.limitsEnabled,
      bloqueada: j.locked || undefined,
      contactos: j.contactos || undefined,
    });
  }

  // CABLES cuyo recorrido queda COMPLETO dentro de la selección: viajan con
  // el prefab (nodos por índice de pieza + anclaje local) para que los
  // sistemas de poleas conserven su función móvil al reinsertar.
  const cables: CableSpec[] = [];
  for (const c of editor.listCables()) {
    const nodos: CableSpec["nodos"] = [];
    let dentro = true;
    for (const n of c.nodes) {
      const idx = indicePorId.get(n.objectId);
      if (idx === undefined) {
        dentro = false;
        break;
      }
      nodos.push({ pieza: idx, local: [r4(n.local.x), r4(n.local.y), r4(n.local.z)] });
    }
    if (dentro && nodos.length >= 2) {
      const entrada: CableSpec = { nodos };
      if (c.topes.length > 0) {
        entrada.topes = c.topes.map((t) => ({ seg: t.seg, dist: r4(t.dist), radio: t.radio }));
      }
      cables.push(entrada);
    }
  }

  const archivo: PrefabArchivo = {
    formato: "exersuite3d-prefab",
    version: 2,
    app: VERSION_APP,
    label,
    piezas,
  };
  if (uniones.length > 0) archivo.uniones = uniones;
  if (cables.length > 0) archivo.cables = cables;
  return JSON.stringify(archivo, null, 2);
}

/**
 * Prefab de FÁBRICA de una máquina estándar: la especificación literal en
 * formato v2, con todos los atributos explícitos. Es el punto de partida del
 * ciclo de corrección — se exporta, se edita en la app y se reimporta como
 * sustituto sin pérdida.
 */
export function prefabDeFabrica(prefabId: string): PrefabArchivo | null {
  const spec = piezasDeMaquina(prefabId);
  const maquina = STANDARD_MACHINES.find((m) => m.id === prefabId);
  if (!spec || !maquina) return null;
  const piezas = spec.piezas;
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const r6 = (v: number) => Math.round(v * 1000000) / 1000000;
  const piezasV2: PiezaSpec[] = piezas.map((p) => {
    const def = getDefinition(p.comp);
    e.set(p.rot?.[0] ?? 0, p.rot?.[1] ?? 0, p.rot?.[2] ?? 0);
    q.setFromEuler(e);
    return {
      comp: p.comp,
      nombre: p.nombre,
      params: { ...(def?.defaults ?? {}), ...(p.params ?? {}) },
      material: p.material ?? def?.materialId,
      pos: p.pos,
      rotq: [r6(q.x), r6(q.y), r6(q.z), r6(q.w)],
      fija: p.fija ?? true,
      masaKg: p.masaKg ?? def?.physics.massKg,
    };
  });
  const archivo: PrefabArchivo = {
    formato: "exersuite3d-prefab",
    version: 2,
    app: VERSION_APP,
    label: maquina.label,
    piezas: piezasV2,
  };
  if (spec.uniones) archivo.uniones = spec.uniones.map((u) => ({ ...u }));
  if (spec.cables) {
    archivo.cables = spec.cables.map((c) => ({
      nodos: c.nodos.map((n) => ({ pieza: n.pieza, local: [...n.local] as [number, number, number] })),
      ...(c.topes ? { topes: c.topes.map((t) => ({ ...t })) } : {}),
    }));
  }
  return archivo;
}

/** Resultado de validar un prefab entrante contra la biblioteca actual. */
export interface ReportePrefab {
  archivo: PrefabArchivo;
  /** Piezas con componente desconocido, EXCLUIDAS de la inserción. */
  desconocidas: string[];
  /** Advertencias no fatales (se inserta igual, avisando). */
  advertencias: string[];
}

/** Valida y normaliza un prefab entrante; lanza con mensaje claro si no vale. */
export function parsearPrefab(texto: string): ReportePrefab {
  const data = JSON.parse(texto) as Partial<PrefabArchivo>;
  if (data.formato !== "exersuite3d-prefab" || !Array.isArray(data.piezas)) {
    throw new Error("El archivo no es un prefab de EXERSUITE3D (.json estructurado).");
  }
  const desconocidas: string[] = [];
  const advertencias: string[] = [];
  const originales = data.piezas as PiezaSpec[];
  const nuevoIndice = new Map<number, number>();
  const piezas: PiezaSpec[] = [];
  originales.forEach((p, i) => {
    if (!p || typeof p.comp !== "string" || !Array.isArray(p.pos)) return;
    if (!getDefinition(p.comp)) {
      desconocidas.push(`${p.nombre ?? "(sin nombre)"} [${p.comp}]`);
      return;
    }
    nuevoIndice.set(i, piezas.length);
    piezas.push(p);
  });
  if (piezas.length === 0) {
    throw new Error(
      "El prefab no contiene piezas con componentes reconocidos." +
        (desconocidas.length ? ` Desconocidos: ${desconocidas.join(", ")}.` : ""),
    );
  }
  if (desconocidas.length > 0) {
    advertencias.push(
      `${desconocidas.length} pieza(s) con componente desconocido quedaron fuera: ${desconocidas.join(", ")}`,
    );
  }
  if (data.version === 1) {
    advertencias.push(
      "Prefab v1 (sin cuaterniones ni dims de control): se importa con la fidelidad antigua.",
    );
  }
  // Uniones: se remapean a los índices tras el filtrado; las que tocaban una
  // pieza excluida se descartan con aviso.
  let uniones: UnionSpec[] | undefined;
  if (Array.isArray(data.uniones)) {
    uniones = [];
    for (const u of data.uniones as UnionSpec[]) {
      if (!u || typeof u.fija !== "number" || typeof u.movil !== "number") continue;
      const fi = nuevoIndice.get(u.fija);
      const mi = nuevoIndice.get(u.movil);
      if (fi === undefined || mi === undefined) {
        advertencias.push("Una unión del prefab tocaba una pieza excluida y quedó fuera.");
        continue;
      }
      uniones.push({ ...u, fija: fi, movil: mi });
    }
    if (uniones.length === 0) uniones = undefined;
  }
  // Cables: mismos remapeos que las uniones; un cable que tocaba una pieza
  // excluida se descarta completo (su recorrido ya no tiene sentido).
  let cables: CableSpec[] | undefined;
  if (Array.isArray(data.cables)) {
    cables = [];
    for (const c of data.cables as CableSpec[]) {
      if (!c || !Array.isArray(c.nodos) || c.nodos.length < 2) continue;
      const nodos: CableSpec["nodos"] = [];
      let valido = true;
      for (const n of c.nodos) {
        const ni = typeof n?.pieza === "number" ? nuevoIndice.get(n.pieza) : undefined;
        if (ni === undefined || !Array.isArray(n.local) || n.local.length !== 3) {
          valido = false;
          break;
        }
        nodos.push({ pieza: ni, local: [n.local[0], n.local[1], n.local[2]] });
      }
      if (valido) {
        const entrada: CableSpec = { nodos };
        if (Array.isArray(c.topes)) {
          entrada.topes = c.topes
            .filter((t) => typeof t?.seg === "number" && typeof t?.dist === "number")
            .map((t) => ({ seg: t.seg, dist: t.dist, radio: t.radio }));
        }
        cables.push(entrada);
      }
      else advertencias.push("Un cable del prefab tocaba una pieza excluida y quedó fuera.");
    }
    if (cables.length === 0) cables = undefined;
  }
  return {
    archivo: {
      formato: "exersuite3d-prefab",
      version: data.version === 1 ? 1 : 2,
      app: typeof data.app === "string" ? data.app : undefined,
      label: typeof data.label === "string" && data.label ? data.label : "Prefab",
      piezas,
      uniones,
      cables,
    },
    desconocidas,
    advertencias,
  };
}
