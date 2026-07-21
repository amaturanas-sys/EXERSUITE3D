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
    description:
      "Rack abierto 142×204×120 cm: montantes reales con agujeros de calce, ganchos J que abrazan el pilar y rieles de base con placas de encuadre.",
  },
  {
    id: "jaula-potencia",
    label: "Jaula de potencia",
    icon: "🗼",
    description: "Power cage 120×204×120 cm con montantes de calce, dominadas y pipes de seguridad.",
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
      "TTP001L fiel al armado: marco soldado con placas de encuadre, doble polea alta, polea de torre, carro de poleas, polea baja con barra lat, ganchos J, brazos de seguridad y porta-discos.",
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

// El gancho J real ABRAZA el montante: su manguito queda alrededor del perfil
// 5×7 y el centro del gancho cae 9,6 cm por delante del eje del pilar (medido
// en el TTP001L armado). Mismo x que el pilar; brazo hacia +Z.
const CALCE_J = 9.6;

const RACK: PiezaSpec[] = [
  // 4 MONTANTES REALES con agujeros de calce (5×7×204).
  ...([[-67, -56], [67, -56], [-67, 56], [67, 56]] as const).map(
    ([x, z], i): PiezaSpec => ({
      comp: "montante-ttp",
      nombre: `Montante ${i + 1}`,
      pos: [x, 102, z],
    }),
  ),
  // Travesaños superiores laterales + rieles de base bajo cada marco.
  { comp: "prim-box", nombre: "Travesaño sup. izq.", params: { width: 7.6, height: 7.6, depth: 104 }, material: "acero-negro", pos: [-67, 200, 0] },
  { comp: "prim-box", nombre: "Travesaño sup. der.", params: { width: 7.6, height: 7.6, depth: 104 }, material: "acero-negro", pos: [67, 200, 0] },
  { comp: "prim-box", nombre: "Riel base izq.", params: { width: 7.6, height: 5, depth: 120 }, material: "acero-negro", pos: [-67, 2.5, 0] },
  { comp: "prim-box", nombre: "Riel base der.", params: { width: 7.6, height: 5, depth: 120 }, material: "acero-negro", pos: [67, 2.5, 0] },
  // ARRIOSTRE DE BASE REAL: rieles TTP de 141 con placas de encuadre en los
  // extremos, uniendo ambos marcos por delante y por detrás (sin esto la
  // estructura colapsaría al cargar las J — solo la unía la barra de pullups).
  { comp: "riel-base-ttp", nombre: "Riel base frontal", pos: [0, 10, 56] },
  { comp: "riel-base-ttp", nombre: "Riel base trasero", pos: [0, 10, -56] },
  // Barra de dominadas trasera (tumbada a lo ancho).
  { comp: "barra-dominadas", params: { height: 134 }, pos: [0, 200, -56], rot: [0, 0, Math.PI / 2] },
  // Ganchos J ABRAZANDO los montantes frontales + pipes con collares.
  { comp: "j-hook", nombre: "Gancho J izq.", pos: [-67, 110, 56 + CALCE_J] },
  { comp: "j-hook", nombre: "Gancho J der.", pos: [67, 110, 56 + CALCE_J] },
  { comp: "brazo-seguridad", nombre: "Pipe seguridad izq.", pos: [-67, 70, 0] },
  { comp: "brazo-seguridad", nombre: "Pipe seguridad der.", pos: [67, 70, 0] },
];

const JAULA: PiezaSpec[] = [
  // 4 MONTANTES REALES con agujeros de calce (5×7×204).
  ...([[-56, -56], [56, -56], [-56, 56], [56, 56]] as const).map(
    ([x, z], i): PiezaSpec => ({
      comp: "montante-ttp",
      nombre: `Montante ${i + 1}`,
      pos: [x, 102, z],
    }),
  ),
  { comp: "prim-box", nombre: "Marco sup. izq.", params: { width: 7.6, height: 7.6, depth: 104 }, material: "acero-negro", pos: [-56, 200, 0] },
  { comp: "prim-box", nombre: "Marco sup. der.", params: { width: 7.6, height: 7.6, depth: 104 }, material: "acero-negro", pos: [56, 200, 0] },
  { comp: "prim-box", nombre: "Marco sup. frontal", params: { width: 104, height: 7.6, depth: 7.6 }, material: "acero-negro", pos: [0, 200, 56] },
  { comp: "prim-box", nombre: "Marco sup. trasero", params: { width: 104, height: 7.6, depth: 7.6 }, material: "acero-negro", pos: [0, 200, -56] },
  // Rieles de base frontal/trasero: arriostran los 4 montantes al suelo.
  { comp: "prim-box", nombre: "Riel base frontal", params: { width: 124, height: 4, depth: 10 }, material: "acero-negro", pos: [0, 2, 56] },
  { comp: "prim-box", nombre: "Riel base trasero", params: { width: 124, height: 4, depth: 10 }, material: "acero-negro", pos: [0, 2, -56] },
  { comp: "barra-dominadas", params: { height: 104 }, pos: [0, 200, 0], rot: [0, 0, Math.PI / 2] },
  // Pipes de seguridad: los collares de los extremos abrazan los montantes.
  { comp: "brazo-seguridad", nombre: "Seguridad izq.", pos: [-56, 60, 0] },
  { comp: "brazo-seguridad", nombre: "Seguridad der.", pos: [56, 60, 0] },
  // Ganchos J ABRAZANDO los montantes frontales (manguito alrededor del perfil).
  { comp: "j-hook", nombre: "Gancho J izq.", pos: [-56, 110, 56 + CALCE_J] },
  { comp: "j-hook", nombre: "Gancho J der.", pos: [56, 110, 56 + CALCE_J] },
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
// Reconstrucción FIEL del TTP001L armado: cada pieza en la posición medida en
// el STL ensamblado (transformación STL→app: x−60, z como altura, 89,5−y como
// fondo; frente de la máquina en +Z, torre de poleas en −Z).
const RACK_TORRE: PiezaSpec[] = [
  // MARCO SOLDADO COMPLETO (118×214×141): 4 montantes con agujeros de calce
  // (frontales z=66,5 · traseros z=−31,5) + travesaños con PLACAS DE ENCUADRE
  // + base, tal cual el modelo armado.
  { comp: "marco-ttp", pos: [0, 106.8, 8.9] },
  // Torre trasera de la polea: 2 columnas 4×4×214.
  { comp: "montante-rack", nombre: "Columna torre izq.", params: { width: 4, height: 213.8, depth: 4 }, pos: [-6, 106.9, -85.5] },
  { comp: "montante-rack", nombre: "Columna torre der.", params: { width: 4, height: 213.8, depth: 4 }, pos: [7, 106.9, -85.5] },
  // MULTI-AGARRE REAL de dominadas (92×32) puenteando marco y torre.
  { comp: "multiagarre-ttp", pos: [0, 207, -42.5] },
  // GANCHOS J reales ABRAZANDO los montantes traseros (a 127, como el armado).
  { comp: "j-hook", nombre: "Gancho J izq.", pos: [-55, 127, -22.5] },
  { comp: "j-hook", nombre: "Gancho J der.", pos: [56, 127, -22.5] },
  // Ganchos J bajos en los montantes frontales (a 41, como el armado).
  { comp: "j-hook", nombre: "Gancho J bajo izq.", pos: [-55, 41, 76.5] },
  { comp: "j-hook", nombre: "Gancho J bajo der.", pos: [56, 41, 76.5] },
  // BRAZOS DE SEGURIDAD TTP (86,6 perforados) calzados entre montantes.
  { comp: "brazo-ttp", nombre: "Brazo seguridad izq.", pos: [-55, 102, 17.5] },
  { comp: "brazo-ttp", nombre: "Brazo seguridad der.", pos: [56, 102, 17.5] },
  // RIELES PORTA-DISCOS REALES (106) por fuera de cada marco lateral.
  { comp: "riel-discos-ttp", nombre: "Riel discos izq.", pos: [-55, 65, 17.5] },
  { comp: "riel-discos-ttp", nombre: "Riel discos der.", pos: [56, 65, 17.5] },
  // SISTEMA DE POLEAS COMPLETO del armado: doble polea alta bajo el techo del
  // marco, polea de reenvío en la torre, carro de dos poleas y polea baja.
  { comp: "roldana", nombre: "Polea alta frontal", pos: [0, 211, -6.5], rot: [0, 0, Math.PI / 2] },
  { comp: "roldana", nombre: "Polea alta trasera", pos: [0, 211, -51.5], rot: [0, 0, Math.PI / 2] },
  { comp: "roldana", nombre: "Polea de torre", pos: [0, 203, -79.5], rot: [0, 0, Math.PI / 2] },
  { comp: "roldana", nombre: "Carro: polea sup.", pos: [0, 136, -56.5], rot: [0, 0, Math.PI / 2] },
  { comp: "roldana", nombre: "Carro: polea inf.", pos: [0, 123, -56.5], rot: [0, 0, Math.PI / 2] },
  { comp: "prim-box", nombre: "Puente del carro", params: { width: 3.5, height: 20.4, depth: 7.2 }, material: "acero-negro", pos: [0, 129, -56.5] },
  { comp: "roldana", nombre: "Polea baja", pos: [0, 10, -52.5], rot: [0, 0, Math.PI / 2] },
  { comp: "prim-box", nombre: "Soporte polea baja", params: { width: 19, height: 13.3, depth: 33.2 }, material: "acero-negro", pos: [0, 7, -65.5] },
  // BARRA LAT real colgando junto a la polea alta.
  { comp: "barra-lat-ttp", pos: [-1.6, 205.5, 0.8] },
  // Base: patín transversal real + placa estabilizadora trasera (86,6×60).
  { comp: "pie-ttp", nombre: "Patín transversal", pos: [0, 3, -52.5], rot: [0, Math.PI / 2, 0] },
  { comp: "prim-box", nombre: "Placa estabilizadora", params: { width: 86.6, height: 60, depth: 7 }, material: "acero-negro", pos: [0, 30, -85.5] },
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
