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
      "TTP001L pieza a pieza: 4 pilares, columnas inferiores y superiores, travesaños, 2 tubos de guía, 2 brazos de seguridad, 4 jotas, set de roldanas, remo de polea alta y pullups multigrip.",
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
const RACK_TORRE: PiezaSpec[] = [
  // 1) 4 PILARES VERTICALES (5×7×204, con agujeros de calce): frontales en
  // z=66,5 y traseros en z=−31,5.
  ...([[-55, 66.5], [56, 66.5], [-55, -31.5], [56, -31.5]] as const).map(
    ([x, z], i): PiezaSpec => ({
      comp: "montante-ttp",
      nombre: `Pilar vertical ${i + 1}`,
      pos: [x, 107, z],
    }),
  ),
  // 2) 2 COLUMNAS HORIZONTALES INFERIORES (141, con placas de encuadre),
  // a lo fondo bajo cada lado del marco.
  { comp: "riel-base-ttp", nombre: "Columna inferior izq.", pos: [-55, 10, 8.9], rot: [0, Math.PI / 2, 0] },
  { comp: "riel-base-ttp", nombre: "Columna inferior der.", pos: [56, 10, 8.9], rot: [0, Math.PI / 2, 0] },
  // 3) 2 COLUMNAS HORIZONTALES SUPERIORES (94) coronando los pilares.
  { comp: "columna-sup-ttp", nombre: "Columna superior izq.", pos: [-55, 199, 17.3], rot: [0, Math.PI / 2, 0] },
  { comp: "columna-sup-ttp", nombre: "Columna superior der.", pos: [56, 199, 17.3], rot: [0, Math.PI / 2, 0] },
  // 4) TRAVESAÑO SUPERIOR (104 a lo ancho, corona trasera del marco).
  { comp: "pie-ttp", nombre: "Travesaño superior", pos: [0, 206.5, -34.7], rot: [0, Math.PI / 2, 0] },
  // 5) TRAVESAÑO INFERIOR (104 a lo ancho, al suelo bajo el sistema de poleas).
  { comp: "pie-ttp", nombre: "Travesaño inferior", pos: [0, 3, -52.5], rot: [0, Math.PI / 2, 0] },
  // TRAVESAÑO FRONTAL real (118) coronando el marco + puente menor del techo.
  { comp: "travesano-frontal-ttp", nombre: "Travesaño frontal", pos: [0, 203.5, 64.1] },
  { comp: "prim-box", nombre: "Puente superior medio", params: { width: 65, height: 3.8, depth: 6 }, material: "acero-negro", pos: [0, 211.6, 41.9] },
  // 6) 2 TUBOS DE GUÍA del sistema de poleas (4×4×214, por ellos corre el carro).
  { comp: "tubo-guia-ttp", nombre: "Tubo guía izq.", pos: [-6, 106.9, -85.5] },
  { comp: "tubo-guia-ttp", nombre: "Tubo guía der.", pos: [7, 106.9, -85.5] },
  // SOSTENEDOR DE DISCOS real (modelo WEIGHTCARRIERANDRAIL): monta sobre los
  // tubos de guía mediante los MANGUITOS; la placa queda vertical al extremo
  // trasero y el pin HORIZONTAL cruza el hueco entre tubos — los discos de
  // fierro se cargan en su tramo libre.
  { comp: "manguito-guia-ttp", nombre: "Manguito guía izq.", pos: [-6, 115, -85.5] },
  { comp: "manguito-guia-ttp", nombre: "Manguito guía der.", pos: [7, 115, -85.5] },
  { comp: "portadiscos-ttp", nombre: "Portadiscos de polea", pos: [0.5, 115, -46.5] },
  { comp: "disco-peso", nombre: "Disco cargado 1", pos: [0.5, 115, -58], rot: [Math.PI / 2, 0, 0] },
  { comp: "disco-peso", nombre: "Disco cargado 2", pos: [0.5, 115, -70], rot: [Math.PI / 2, 0, 0] },
  // 11) BARRA DE PULLUPS MULTIGRIP real (92×32) puenteando marco y torre.
  { comp: "multiagarre-ttp", nombre: "Barra pullups multigrip", pos: [0, 207, -42.5] },
  // 8) 4 JOTAS DE SEGURIDAD reales ABRAZANDO los pilares: altas en los
  // traseros (127) y bajas en los frontales (41), como el armado.
  { comp: "j-hook", nombre: "Jota de seguridad izq.", pos: [-55, 127, -22.5] },
  { comp: "j-hook", nombre: "Jota de seguridad der.", pos: [56, 127, -22.5] },
  { comp: "j-hook", nombre: "Jota baja izq.", pos: [-55, 41, 76.5] },
  { comp: "j-hook", nombre: "Jota baja der.", pos: [56, 41, 76.5] },
  // 7) 2 BRAZOS DE SEGURIDAD TTP (86,6 perforados) calzados entre pilares.
  { comp: "brazo-ttp", nombre: "Brazo seguridad izq.", pos: [-55, 102, 17.5] },
  { comp: "brazo-ttp", nombre: "Brazo seguridad der.", pos: [56, 102, 17.5] },
  // Rieles porta-discos reales (106) por fuera de cada lado.
  { comp: "riel-discos-ttp", nombre: "Riel discos izq.", pos: [-55, 65, 17.5] },
  { comp: "riel-discos-ttp", nombre: "Riel discos der.", pos: [56, 65, 17.5] },
  // 9) SET DE ROLDANAS completo del armado: doble polea alta bajo el techo
  // del marco, polea de reenvío en la torre, carro de dos poleas y polea baja.
  { comp: "roldana", nombre: "Polea alta frontal", pos: [0, 211, -6.5], rot: [0, 0, Math.PI / 2] },
  { comp: "roldana", nombre: "Polea alta trasera", pos: [0, 211, -51.5], rot: [0, 0, Math.PI / 2] },
  { comp: "roldana", nombre: "Polea de torre", pos: [0, 203, -79.5], rot: [0, 0, Math.PI / 2] },
  { comp: "roldana", nombre: "Carro: polea sup.", pos: [0, 136, -56.5], rot: [0, 0, Math.PI / 2] },
  { comp: "roldana", nombre: "Carro: polea inf.", pos: [0, 123, -56.5], rot: [0, 0, Math.PI / 2] },
  { comp: "puente-carro-ttp", nombre: "Puente del carro", pos: [0, 129, -56.5] },
  { comp: "roldana", nombre: "Polea baja", pos: [0, 10, -52.5], rot: [0, 0, Math.PI / 2] },
  { comp: "soporte-polea-ttp", nombre: "Soporte polea baja", pos: [0, 6.7, -52.4] },
  { comp: "placa-polea-ttp", nombre: "Placa polea baja", pos: [0, 3.5, -69.1] },
  // 10) REMO DE POLEA ALTA (tubular) real, colgando junto a la polea alta.
  { comp: "barra-lat-ttp", nombre: "Remo de polea alta", pos: [-1.6, 205.5, 0.8] },
  // Placa estabilizadora trasera real (86,6×60).
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
