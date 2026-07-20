import * as THREE from "three";
import type { Editor } from "../core/Editor";
import type { PrimitiveParams } from "./types";

/**
 * Máquinas estándar (F4 v0.2.0): prefabricados montados con los componentes
 * de la biblioteca, pensados para plantear la distribución de una sala (modo
 * Sencillo) o como punto de partida de un diseño. Cada máquina se crea como
 * piezas reales agrupadas en un subensamblaje con dimensiones comerciales.
 */

export interface MachinePrefab {
  id: string;
  label: string;
  icon: string;
  description: string;
}

export const STANDARD_MACHINES: MachinePrefab[] = [
  {
    id: "rack-sentadillas",
    label: "Rack de sentadillas",
    icon: "🏋️",
    description: "Rack abierto 142×199×120 cm con ganchos J y brazos de seguridad.",
  },
  {
    id: "jaula-potencia",
    label: "Jaula de potencia",
    icon: "🗼",
    description: "Power cage 120×220×140 cm con barra de dominadas y seguridad.",
  },
  {
    id: "banco-plano",
    label: "Banco plano",
    icon: "🛋️",
    description: "Banco de 120×45×30 cm tapizado, para press y accesorios.",
  },
  {
    id: "torre-polea",
    label: "Torre de polea (alta/baja)",
    icon: "🪢",
    description: "Columna con pila selectorizada y poleas alta y baja.",
  },
];

interface PiezaSpec {
  comp: string;
  nombre?: string;
  params?: Partial<PrimitiveParams>;
  material?: string;
  pos: [number, number, number];
  rot?: [number, number, number];
  fija?: boolean;
}

const RACK: PiezaSpec[] = [
  // 4 montantes 3x3" a 199 cm.
  ...([[-67, -56], [67, -56], [-67, 56], [67, 56]] as const).map(
    ([x, z], i): PiezaSpec => ({
      comp: "montante-rack",
      nombre: `Montante ${i + 1}`,
      params: { height: 199 },
      pos: [x, 99.5, z],
    }),
  ),
  // Travesaños superiores laterales + rieles de base.
  { comp: "prim-box", nombre: "Travesaño sup. izq.", params: { width: 7.6, height: 7.6, depth: 104 }, material: "acero-negro", pos: [-67, 195, 0] },
  { comp: "prim-box", nombre: "Travesaño sup. der.", params: { width: 7.6, height: 7.6, depth: 104 }, material: "acero-negro", pos: [67, 195, 0] },
  { comp: "prim-box", nombre: "Riel base izq.", params: { width: 7.6, height: 5, depth: 120 }, material: "acero-negro", pos: [-67, 2.5, 0] },
  { comp: "prim-box", nombre: "Riel base der.", params: { width: 7.6, height: 5, depth: 120 }, material: "acero-negro", pos: [67, 2.5, 0] },
  // Barra de dominadas trasera (tumbada a lo ancho).
  { comp: "barra-dominadas", params: { height: 134 }, pos: [0, 195, -56], rot: [0, 0, Math.PI / 2] },
  // Ganchos J y brazos de seguridad.
  { comp: "j-hook", nombre: "Gancho J izq.", pos: [-60, 110, 49] },
  { comp: "j-hook", nombre: "Gancho J der.", pos: [60, 110, 49] },
  { comp: "brazo-seguridad", nombre: "Brazo seg. izq.", pos: [-60, 70, 20] },
  { comp: "brazo-seguridad", nombre: "Brazo seg. der.", pos: [60, 70, 20] },
];

const JAULA: PiezaSpec[] = [
  ...([[-56, -66], [56, -66], [-56, 66], [56, 66]] as const).map(
    ([x, z], i): PiezaSpec => ({
      comp: "montante-rack",
      nombre: `Montante ${i + 1}`,
      params: { height: 220 },
      pos: [x, 110, z],
    }),
  ),
  { comp: "prim-box", nombre: "Marco sup. izq.", params: { width: 7.6, height: 7.6, depth: 124 }, material: "acero-negro", pos: [-56, 216, 0] },
  { comp: "prim-box", nombre: "Marco sup. der.", params: { width: 7.6, height: 7.6, depth: 124 }, material: "acero-negro", pos: [56, 216, 0] },
  { comp: "prim-box", nombre: "Marco sup. frontal", params: { width: 104, height: 7.6, depth: 7.6 }, material: "acero-negro", pos: [0, 216, 66] },
  { comp: "prim-box", nombre: "Marco sup. trasero", params: { width: 104, height: 7.6, depth: 7.6 }, material: "acero-negro", pos: [0, 216, -66] },
  { comp: "barra-dominadas", params: { height: 104 }, pos: [0, 216, 0], rot: [0, 0, Math.PI / 2] },
  { comp: "brazo-seguridad", nombre: "Seguridad izq.", params: { depth: 124 }, pos: [-52, 60, 0] },
  { comp: "brazo-seguridad", nombre: "Seguridad der.", params: { depth: 124 }, pos: [52, 60, 0] },
  { comp: "j-hook", nombre: "Gancho J izq.", pos: [-52, 105, 60] },
  { comp: "j-hook", nombre: "Gancho J der.", pos: [52, 105, 60] },
];

const BANCO: PiezaSpec[] = [
  { comp: "asiento", nombre: "Colchoneta", params: { width: 120, height: 8, depth: 30 }, pos: [0, 41, 0] },
  ...([[-52, -9], [52, -9], [-52, 9], [52, 9]] as const).map(
    ([x, z], i): PiezaSpec => ({
      comp: "prim-box",
      nombre: `Pata ${i + 1}`,
      params: { width: 6, height: 37, depth: 6 },
      material: "acero-negro",
      pos: [x, 18.5, z],
    }),
  ),
  { comp: "prim-box", nombre: "Pie izq.", params: { width: 8, height: 4, depth: 34 }, material: "acero-negro", pos: [-52, 2, 0] },
  { comp: "prim-box", nombre: "Pie der.", params: { width: 8, height: 4, depth: 34 }, material: "acero-negro", pos: [52, 2, 0] },
];

const TORRE: PiezaSpec[] = [
  { comp: "prim-box", nombre: "Base", params: { width: 60, height: 5, depth: 80 }, material: "acero-negro", pos: [0, 2.5, 10] },
  { comp: "prim-box", nombre: "Columna", params: { width: 20, height: 210, depth: 12 }, material: "acero-negro", pos: [0, 105, -18] },
  { comp: "pila-pesos", pos: [0, 47, 0] },
  { comp: "polea", nombre: "Polea alta", pos: [0, 200, 6], rot: [0, 0, Math.PI / 2] },
  { comp: "polea", nombre: "Polea baja", pos: [0, 14, 6], rot: [0, 0, Math.PI / 2] },
];

const SPECS: Record<string, { label: string; piezas: PiezaSpec[] }> = {
  "rack-sentadillas": { label: "Rack de sentadillas", piezas: RACK },
  "jaula-potencia": { label: "Jaula de potencia", piezas: JAULA },
  "banco-plano": { label: "Banco plano", piezas: BANCO },
  "torre-polea": { label: "Torre de polea", piezas: TORRE },
};

/**
 * Construye la máquina apoyada en el suelo con su centro en `at` y devuelve
 * los ids de las piezas creadas (para agruparlas) y su etiqueta.
 */
export function construirMaquina(
  editor: Editor,
  prefabId: string,
  at: THREE.Vector3,
): { ids: string[]; label: string } {
  const spec = SPECS[prefabId];
  if (!spec) throw new Error(`Máquina desconocida: ${prefabId}`);
  const ids: string[] = [];
  for (const p of spec.piezas) {
    const obj = editor.addComponent(p.comp);
    if (p.nombre) {
      obj.name = `${p.nombre} (${spec.label})`;
      obj.mesh.name = obj.name;
    }
    if (p.params) {
      obj.params = { ...obj.params, ...p.params };
      obj.rebuildGeometry();
    }
    if (p.material) obj.setMaterial(p.material);
    // Piezas de estructura ancladas salvo que se indique lo contrario.
    obj.physics = { ...obj.physics, fixed: p.fija ?? true };
    obj.mesh.position.set(at.x + p.pos[0], p.pos[1], at.z + p.pos[2]);
    if (p.rot) obj.mesh.rotation.set(p.rot[0], p.rot[1], p.rot[2]);
    ids.push(obj.id);
  }
  return { ids, label: spec.label };
}
