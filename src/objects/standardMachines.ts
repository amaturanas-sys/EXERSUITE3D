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
    description:
      "POWERRACK pieza a pieza (118×220×122): postes de dos tramos perforados, doble barra de pullups, jotas de calce con y sin rodillo, pipes de seguridad y rieles de base.",
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
      "TTP001L corregido por el diseñador: 4 pilares girados al calce, columnas inferiores y superiores, travesaños y bastidor superior, 2 tubos de guía con manguitos y portadiscos móvil, 4 jotas, set de roldanas, remo de polea alta y pullups multigrip.",
  },
  {
    id: "arbol-discos",
    label: "Árbol de discos",
    icon: "🌳",
    description: "Poste porta-discos con 6 cuernos a 3 alturas y base en cruz.",
  },
];

export interface PiezaSpec {
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

// Jaula = POWERRACK real pieza a pieza (posiciones medidas en el STL armado,
// 118×220×122): postes de DOS TRAMOS apilados (110+110), travesaños laterales
// superiores perforados, largueros de base, doble barra de pullups (70),
// rieles de base de 118, jotas de calce y pipes con collares.
const JAULA: PiezaSpec[] = [
  // 4 postes × 2 tramos de media columna perforada (7×7×110).
  ...([[-36.8, -57], [36.8, -57], [-36.8, 57], [36.8, 57]] as const).flatMap(
    ([x, z], i): PiezaSpec[] => [
      { comp: "montante-pr", nombre: `Poste ${i + 1} tramo inf.`, pos: [x, 55, z] },
      { comp: "montante-pr", nombre: `Poste ${i + 1} tramo sup.`, pos: [x, 165, z] },
    ],
  ),
  // Travesaños laterales superiores (106, perforados) y largueros de base.
  { comp: "travesano-pr", nombre: "Travesaño lateral izq.", pos: [-36.8, 212, 0] },
  { comp: "travesano-pr", nombre: "Travesaño lateral der.", pos: [36.8, 212, 0] },
  { comp: "larguero-pr", nombre: "Larguero base izq.", pos: [-36.8, 3.5, 0] },
  { comp: "larguero-pr", nombre: "Larguero base der.", pos: [36.8, 3.5, 0] },
  // Doble barra de pullups real (70) al frente y atrás, a 192.
  { comp: "barra-pr", nombre: "Barra pullups frontal", pos: [0, 192, 57] },
  { comp: "barra-pr", nombre: "Barra pullups trasera", pos: [0, 192, -57] },
  // Rieles de base reales (118) que arriostran los postes al suelo.
  { comp: "riel-base-pr", nombre: "Riel base frontal", pos: [0, 2.5, 57] },
  { comp: "riel-base-pr", nombre: "Riel base trasero", pos: [0, 2.5, -57] },
  // Jotas reales calzadas en los agujeros de los postes frontales.
  { comp: "jota-pr", nombre: "Jota izq.", pos: [-36.8, 110, 64.2] },
  { comp: "jota-pr", nombre: "Jota der.", pos: [36.8, 110, 64.2] },
  { comp: "jota-rodillo-pr", nombre: "Jota rodillo izq.", pos: [-36.8, 70, 64.9] },
  { comp: "jota-rodillo-pr", nombre: "Jota rodillo der.", pos: [36.8, 70, 64.9] },
  // Pipes de seguridad: los collares de los extremos abrazan los postes.
  { comp: "brazo-seguridad", nombre: "Pipe seguridad izq.", pos: [-36.8, 75, 0] },
  { comp: "brazo-seguridad", nombre: "Pipe seguridad der.", pos: [36.8, 75, 0] },
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
// Reconstrucción FIEL del TTP001L armado, DESGLOSADA en sus piezas: cada una
// en la posición medida en el STL ensamblado (transformación STL→app: x−60,
// z como altura, 89,5−y como fondo; frente en +Z, sistema de poleas en −Z).
// PREFAB CORREGIDO POR EL DISEÑADOR (rackcontorre.prefab.json, v0.2.3): las
// posiciones, giros y sustituciones vienen del archivo editado en la app —
// pilares girados 90° para el calce, travesaño frontal a la línea trasera,
// bastidor superior en lugar del travesaño superior y el puente medio,
// pletina TTP en lugar de la placa estabilizadora, sin brazos ni discos, y
// portadiscos MÓVIL montado abajo en los tubos de guía.
const RACK_TORRE: PiezaSpec[] = [
  // 1) 4 PILARES VERTICALES (5×7×204) girados 90°: frontales en z=71,05 y
  // traseros en z=−27,95.
  ...([[-56, 71.05], [56, 71.05], [-56, -27.95], [56, -27.95]] as const).map(
    ([x, z], i): PiezaSpec => ({
      comp: "montante-ttp",
      nombre: `Pilar vertical ${i + 1}`,
      pos: [x, 107, z],
      rot: [0, Math.PI / 2, 0],
    }),
  ),
  // 2) 2 COLUMNAS HORIZONTALES INFERIORES (141, con placas de encuadre).
  { comp: "riel-base-ttp", nombre: "Columna inferior izq.", pos: [-56, 10, 13.45], rot: [0, Math.PI / 2, 0] },
  { comp: "riel-base-ttp", nombre: "Columna inferior der.", pos: [56, 10, 13.45], rot: [0, Math.PI / 2, 0] },
  // 3) 2 COLUMNAS HORIZONTALES SUPERIORES (94) coronando los pilares.
  { comp: "columna-sup-ttp", nombre: "Columna superior izq.", pos: [-56, 199, 21.85], rot: [0, Math.PI / 2, 0] },
  { comp: "columna-sup-ttp", nombre: "Columna superior der.", pos: [56, 199, 21.85], rot: [0, Math.PI / 2, 0] },
  // 4) TRAVESAÑO INFERIOR (104 a lo ancho, al suelo bajo el sistema de poleas).
  { comp: "pie-ttp", nombre: "Travesaño inferior", pos: [0, 3, -47.95], rot: [0, Math.PI / 2, 0] },
  // 5) TRAVESAÑO FRONTAL real (118) en la línea de los pilares traseros.
  { comp: "travesano-frontal-ttp", nombre: "Travesaño frontal", pos: [0, 198.96, -28.24] },
  // 6) 2 TUBOS DE GUÍA del sistema de poleas (4×4×214) con sus MANGUITOS al pie.
  { comp: "tubo-guia-ttp", nombre: "Tubo guía izq.", pos: [-6, 106.9, -80.95] },
  { comp: "tubo-guia-ttp", nombre: "Tubo guía der.", pos: [7, 106.9, -80.95] },
  { comp: "manguito-guia-ttp", nombre: "Manguito guía izq.", pos: [-6, 33.79, -80.95] },
  { comp: "manguito-guia-ttp", nombre: "Manguito guía der.", pos: [7, 33.12, -80.95] },
  // 7) BARRA DE PULLUPS MULTIGRIP real (92×32) puenteando marco y torre.
  { comp: "multiagarre-ttp", nombre: "Barra pullups multigrip", pos: [0, 207, -36.95] },
  // 8) 4 JOTAS DE SEGURIDAD abrazando los pilares: altas atrás, bajas delante.
  { comp: "j-hook", nombre: "Jota de seguridad izq.", pos: [-56, 127, -17.95] },
  { comp: "j-hook", nombre: "Jota de seguridad der.", pos: [56, 127, -17.95] },
  { comp: "j-hook", nombre: "Jota baja izq.", pos: [-56, 40.91, 81.05] },
  { comp: "j-hook", nombre: "Jota baja der.", pos: [56, 41, 81.05] },
  // Rieles porta-discos reales (106) por fuera de cada lado.
  { comp: "riel-discos-ttp", nombre: "Riel discos izq.", pos: [-56, 65, 22.05] },
  { comp: "riel-discos-ttp", nombre: "Riel discos der.", pos: [56, 65, 22.05] },
  // 9) SET DE ROLDANAS completo: doble polea alta, polea de torre, carro de
  // dos poleas con su puente y polea baja con soporte y placa.
  { comp: "roldana", nombre: "Polea alta frontal", pos: [0, 212, -0.95], rot: [0, 0, Math.PI / 2] },
  { comp: "roldana", nombre: "Polea alta trasera", pos: [0, 212, -45.95], rot: [0, 0, Math.PI / 2] },
  { comp: "roldana", nombre: "Polea de torre", pos: [0, 203, -73.95], rot: [0, 0, Math.PI / 2] },
  { comp: "roldana", nombre: "Carro: polea sup.", pos: [0, 136, -51.95], rot: [0, 0, Math.PI / 2] },
  { comp: "roldana", nombre: "Carro: polea inf.", pos: [0, 123, -51.95], rot: [0, 0, Math.PI / 2] },
  { comp: "puente-carro-ttp", nombre: "Puente del carro", pos: [0, 129, -51.95] },
  { comp: "roldana", nombre: "Polea baja", pos: [0, 10, -47.95], rot: [0, 0, Math.PI / 2] },
  { comp: "soporte-polea-ttp", nombre: "Soporte polea baja", pos: [0, 6.7, -47.85] },
  { comp: "placa-polea-ttp", nombre: "Placa polea baja", pos: [0, 3.5, -64.55] },
  // 10) REMO DE POLEA ALTA (tubular) real, colgando junto a la polea alta.
  { comp: "barra-lat-ttp", nombre: "Remo de polea alta", pos: [-1.6, 205.5, 7.35] },
  // Pletina de unión al pie de la torre.
  { comp: "pletina-ttp", nombre: "Pletina TTP", pos: [0, 3.5, -81.05] },
  // Bastidor superior real coronando el frente del marco.
  { comp: "bastidor-sup-ttp", nombre: "Bastidor superior TTP", pos: [-0.12, 208.85, 57.18], rot: [0, Math.PI / 2, 0] },
  // 11) PORTADISCOS del sistema de poleas: MÓVIL, montado en los tubos de guía.
  { comp: "portadiscos-ttp", nombre: "Portadiscos de polea TTP", pos: [-4.66, 67, -80.95], rot: [0, Math.PI / 2, 0], fija: false },
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

/** Especificación de piezas de una máquina estándar (para hornear/exportar). */
export function piezasDeMaquina(prefabId: string): { label: string; piezas: PiezaSpec[] } | null {
  return SPECS[prefabId] ?? null;
}

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
  return { ids: construirPiezas(editor, spec.piezas, spec.label, at), label: spec.label };
}

/** Construye una lista de piezas (de una máquina estándar o de un prefab del usuario). */
export function construirPiezas(
  editor: Editor,
  piezas: PiezaSpec[],
  label: string,
  at: THREE.Vector3,
): string[] {
  const ids: string[] = [];
  for (const p of piezas) {
    const obj = editor.addComponent(p.comp);
    if (p.nombre) {
      obj.name = `${p.nombre} (${label})`;
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
  return ids;
}
