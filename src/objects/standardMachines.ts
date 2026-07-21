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
    description: "Power cage 120×220×120 cm con barra de dominadas y seguridad.",
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
  {
    id: "rack-torre",
    label: "Rack con torre (TTP)",
    icon: "🏗️",
    description:
      "Rack doméstico 120×215×179 cm (despiece TTP001L): perfil 40×40, torre de dominadas multi-agarre, ganchos J a 127, porta-discos laterales y placa estabilizadora.",
  },
  {
    id: "arbol-discos",
    label: "Árbol de discos",
    icon: "🌳",
    description: "Poste porta-discos con 6 cuernos a 3 alturas y base en cruz.",
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
  { comp: "j-hook", nombre: "Gancho J izq.", pos: [-67, 110, 71] },
  { comp: "j-hook", nombre: "Gancho J der.", pos: [67, 110, 71] },
  { comp: "brazo-seguridad", nombre: "Pipe seguridad izq.", pos: [-67, 70, 0] },
  { comp: "brazo-seguridad", nombre: "Pipe seguridad der.", pos: [67, 70, 0] },
];

const JAULA: PiezaSpec[] = [
  ...([[-56, -56], [56, -56], [-56, 56], [56, 56]] as const).map(
    ([x, z], i): PiezaSpec => ({
      comp: "montante-rack",
      nombre: `Montante ${i + 1}`,
      params: { height: 220 },
      pos: [x, 110, z],
    }),
  ),
  { comp: "prim-box", nombre: "Marco sup. izq.", params: { width: 7.6, height: 7.6, depth: 104 }, material: "acero-negro", pos: [-56, 216, 0] },
  { comp: "prim-box", nombre: "Marco sup. der.", params: { width: 7.6, height: 7.6, depth: 104 }, material: "acero-negro", pos: [56, 216, 0] },
  { comp: "prim-box", nombre: "Marco sup. frontal", params: { width: 104, height: 7.6, depth: 7.6 }, material: "acero-negro", pos: [0, 216, 56] },
  { comp: "prim-box", nombre: "Marco sup. trasero", params: { width: 104, height: 7.6, depth: 7.6 }, material: "acero-negro", pos: [0, 216, -56] },
  { comp: "barra-dominadas", params: { height: 104 }, pos: [0, 216, 0], rot: [0, 0, Math.PI / 2] },
  { comp: "brazo-seguridad", nombre: "Seguridad izq.", pos: [-52, 60, 0] },
  { comp: "brazo-seguridad", nombre: "Seguridad der.", pos: [52, 60, 0] },
  { comp: "j-hook", nombre: "Gancho J izq.", pos: [-56, 105, 71] },
  { comp: "j-hook", nombre: "Gancho J der.", pos: [56, 105, 71] },
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

/**
 * Rack con torre TTP001L — dimensiones extraídas del despiece STL real:
 * 120 ancho × 215 alto × 179 fondo, montantes de perfil 40×40 mm, torre
 * trasera de dominadas con multi-agarre a 207 cm, ganchos J a 127 cm,
 * seguridad baja, rieles porta-discos laterales a 65 cm con cuernos y
 * placa estabilizadora trasera de 87×60 cm.
 */
const RACK_TORRE: PiezaSpec[] = [
  // Marco delantero/medio: 4 MONTANTES REALES del despiece (5×7×204, con
  // agujeros de calce para el pin de los ganchos).
  ...([[-55, 50], [55, 50], [-55, -50], [55, -50]] as const).map(
    ([x, z], i): PiezaSpec => ({
      comp: "montante-ttp",
      nombre: `Montante TTP ${i + 1}`,
      pos: [x, 102, z],
    }),
  ),
  // Torre trasera de dominadas: 2 columnas 4×4 a 215 (despiece).
  { comp: "montante-rack", nombre: "Columna torre izq.", params: { width: 4, height: 215, depth: 4 }, pos: [-6, 107.5, -83] },
  { comp: "montante-rack", nombre: "Columna torre der.", params: { width: 4, height: 215, depth: 4 }, pos: [6, 107.5, -83] },
  // Travesaños superiores que arriostran los marcos (tope del marco: 204).
  { comp: "prim-box", nombre: "Travesaño sup. izq.", params: { width: 4, height: 4, depth: 96 }, material: "acero-negro", pos: [-55, 202, 0] },
  { comp: "prim-box", nombre: "Travesaño sup. der.", params: { width: 4, height: 4, depth: 96 }, material: "acero-negro", pos: [55, 202, 0] },
  { comp: "prim-box", nombre: "Travesaño sup. frontal", params: { width: 106, height: 4, depth: 4 }, material: "acero-negro", pos: [0, 202, 50] },
  // MULTI-AGARRE REAL de dominadas (92×32 a 207, entre marco medio y torre).
  { comp: "multiagarre-ttp", pos: [0, 207, -41] },
  // Ganchos J calzados en la cara frontal del marco (pin −Z al agujero).
  { comp: "j-hook", nombre: "Gancho J izq.", pos: [-55, 127, 63] },
  { comp: "j-hook", nombre: "Gancho J der.", pos: [55, 127, 63] },
  // Soportes bajos del despiece: mismo gancho de calce en el marco trasero,
  // brazo hacia el interior (posición de seguridad a 41 cm).
  { comp: "j-hook", nombre: "Soporte bajo izq.", pos: [-55, 41, -35] },
  { comp: "j-hook", nombre: "Soporte bajo der.", pos: [55, 41, -35] },
  // RIELES PORTA-DISCOS REALES (106, con manguitos y cuernos integrados).
  { comp: "riel-discos-ttp", nombre: "Riel discos izq.", pos: [-60, 65, 0] },
  { comp: "riel-discos-ttp", nombre: "Riel discos der.", pos: [60, 65, 0] },
  // Sistema de poleas del despiece (lado izquierdo): roldana alta en la
  // montura superior, roldana baja y guías verticales del carro de peso.
  { comp: "roldana", nombre: "Roldana alta", pos: [-55, 211, 0], rot: [0, 0, Math.PI / 2] },
  { comp: "prim-box", nombre: "Travesaño inf. izq.", params: { width: 4, height: 4, depth: 96 }, material: "acero-negro", pos: [-55, 16, 0] },
  { comp: "roldana", nombre: "Roldana baja", pos: [-55, 25, 0], rot: [0, 0, Math.PI / 2] },
  { comp: "prim-box", nombre: "Guía de carro A", params: { width: 3, height: 50, depth: 3 }, material: "cromo", pos: [-55, 94, 7] },
  { comp: "prim-box", nombre: "Guía de carro B", params: { width: 3, height: 50, depth: 3 }, material: "cromo", pos: [-55, 94, -7] },
  // Base: PATINES DE SUELO REALES (104) bajo cada marco lateral y placa
  // estabilizadora trasera (87×60).
  { comp: "pie-ttp", nombre: "Patín izq.", pos: [-55, 2.5, 0] },
  { comp: "pie-ttp", nombre: "Patín der.", pos: [55, 2.5, 0] },
  { comp: "prim-box", nombre: "Placa estabilizadora", params: { width: 87, height: 60, depth: 3 }, material: "acero-negro", pos: [0, 30, -88] },
];

/** Árbol de discos (renders de sala): poste con 6 cuernos a 3 alturas. */
const ARBOL: PiezaSpec[] = [
  { comp: "prim-box", nombre: "Poste", params: { width: 6, height: 120, depth: 6 }, material: "acero-negro", pos: [0, 60, 0] },
  { comp: "prim-box", nombre: "Base longitudinal", params: { width: 66, height: 4, depth: 8 }, material: "acero-negro", pos: [0, 2, 0] },
  { comp: "prim-box", nombre: "Base transversal", params: { width: 8, height: 4, depth: 66 }, material: "acero-negro", pos: [0, 2, 0] },
  ...([30, 65, 100] as const).flatMap((h, nivel): PiezaSpec[] => [
    { comp: "cuerno-carga", nombre: `Cuerno izq. nivel ${nivel + 1}`, pos: [-15.5, h, 0], rot: [0, 0, Math.PI / 2] },
    { comp: "cuerno-carga", nombre: `Cuerno der. nivel ${nivel + 1}`, pos: [15.5, h, 0], rot: [0, 0, -Math.PI / 2] },
  ]),
];

const SPECS: Record<string, { label: string; piezas: PiezaSpec[] }> = {
  "rack-sentadillas": { label: "Rack de sentadillas", piezas: RACK },
  "jaula-potencia": { label: "Jaula de potencia", piezas: JAULA },
  "banco-plano": { label: "Banco plano", piezas: BANCO },
  "torre-polea": { label: "Torre de polea", piezas: TORRE },
  "rack-torre": { label: "Rack con torre (TTP)", piezas: RACK_TORRE },
  "arbol-discos": { label: "Árbol de discos", piezas: ARBOL },
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
