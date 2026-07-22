import * as THREE from "three";
import type { Editor } from "./Editor";
import type { PiezaSpec } from "../objects/standardMachines";
import { getDefinition } from "../objects/componentLibrary";

/**
 * Prefabs estructurados (v0.2.2): las máquinas editadas DENTRO de la app se
 * exportan como .json que reconoce cada parte y su función — cada pieza
 * conserva su componente de biblioteca (comp), nombre, dimensiones (params),
 * material, pose y anclaje. El archivo se puede reinsertar en la app o
 * incorporarse a la biblioteca de prefabs de una release.
 */

export interface PrefabArchivo {
  formato: "exersuite3d-prefab";
  version: 1;
  label: string;
  piezas: PiezaSpec[];
}

/**
 * Serializa la SELECCIÓN actual (pieza, multiselección o grupo) como prefab.
 * Las posiciones quedan relativas al centro en planta (X/Z) y con la altura
 * absoluta (Y), igual que las especificaciones de las máquinas estándar.
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

  const r2 = (v: number) => Math.round(v * 100) / 100;
  const e = new THREE.Euler();
  const q = new THREE.Quaternion();
  const piezas: PiezaSpec[] = datos.map((d) => {
    q.fromArray(d.quaternion);
    e.setFromQuaternion(q, "XYZ");
    // El nombre limpio, sin el sufijo " (Máquina)" que añaden los prefabs.
    const nombre = d.name.includes(" (") ? d.name.slice(0, d.name.indexOf(" (")) : d.name;
    const pieza: PiezaSpec = {
      comp: d.componentId,
      nombre,
      params: { ...d.params },
      material: d.materialId,
      pos: [r2(d.position[0] - cx), r2(d.position[1]), r2(d.position[2] - cz)],
      fija: d.physics.fixed,
    };
    if (Math.abs(e.x) + Math.abs(e.y) + Math.abs(e.z) > 1e-4) {
      pieza.rot = [e.x, e.y, e.z].map((v) => Math.round(v * 10000) / 10000) as [
        number,
        number,
        number,
      ];
    }
    return pieza;
  });

  const archivo: PrefabArchivo = { formato: "exersuite3d-prefab", version: 1, label, piezas };
  return JSON.stringify(archivo, null, 2);
}

/** Valida y normaliza un prefab entrante; lanza con mensaje claro si no vale. */
export function parsearPrefab(texto: string): PrefabArchivo {
  const data = JSON.parse(texto) as Partial<PrefabArchivo>;
  if (data.formato !== "exersuite3d-prefab" || !Array.isArray(data.piezas)) {
    throw new Error("El archivo no es un prefab de EXERSUITE3D (.json estructurado).");
  }
  const piezas = data.piezas.filter(
    (p) => p && typeof p.comp === "string" && Array.isArray(p.pos) && getDefinition(p.comp),
  );
  if (piezas.length === 0) {
    throw new Error("El prefab no contiene piezas con componentes reconocidos.");
  }
  return {
    formato: "exersuite3d-prefab",
    version: 1,
    label: typeof data.label === "string" && data.label ? data.label : "Prefab",
    piezas,
  };
}
