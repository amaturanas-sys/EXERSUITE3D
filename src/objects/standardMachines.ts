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
    description:
      "Banco plano clásico del diseñador (120×41×30): colchoneta tapizada sobre espina central, pata trasera en L, pata delantera en arco y bisagras de plegado bloqueadas.",
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
  // ---- Prefab v2 (v0.2.4): atributos exhaustivos para reconstrucción exacta.
  /** Rotación como CUATERNIÓN [x,y,z,w] — exacta, sin ambigüedad de Euler. */
  rotq?: [number, number, number, number];
  /** Masa explícita (kg) si difiere de la del componente. */
  masaKg?: number;
  /** Escala si la pieza fue escalada (≠ 1). */
  escala?: [number, number, number];
  /** Dimensiones locales al exportar: CONTROL de fidelidad al reimportar. */
  dims?: [number, number, number];
}

/**
 * UNIÓN entre dos piezas de un prefab (v0.2.4): corredera o bisagra que
 * CIRCUNSCRIBE el movimiento de una pieza móvil (p. ej. el portadiscos del
 * TTP corre solo verticalmente por los tubos de guía). Los índices refieren
 * al arreglo `piezas`; `fija` es el cuerpo ancla y `movil` el guiado.
 */
export interface UnionSpec {
  tipo: "bisagra" | "corredera";
  fija: number;
  movil: number;
  eje?: "x" | "y" | "z";
  /** Ancla en coordenadas del prefab (mismas que `pos`); por defecto, la posición de la pieza móvil. */
  ancla?: [number, number, number];
  min?: number;
  max?: number;
  /** Con límites activos (por defecto sí cuando hay min/max). */
  limites?: boolean;
  bloqueada?: boolean;
}

/**
 * CABLE de un prefab (v0.2.8): recorrido punto a punto del sistema de poleas
 * — extremo A, roldanas de paso, extremo B. Cada nodo referencia una pieza
 * por ÍNDICE del arreglo `piezas` y su anclaje en coordenadas LOCALES de esa
 * pieza (cm), por lo que el cable se reconstruye idéntico en cualquier
 * posición de inserción y la máquina conserva su función móvil.
 */
export interface CableSpec {
  nodos: { pieza: number; local: [number, number, number] }[];
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
// superiores perforados, largueros de base, doble barra de pullups (106),
// rieles de base de 118, jotas de calce y pipes con collares.
const JAULA: PiezaSpec[] = [
  // 4 postes × 2 tramos de media columna perforada (7×7×110).
  ...([[-36.8, -57], [36.8, -57], [-36.8, 57], [36.8, 57]] as const).flatMap(
    ([x, z], i): PiezaSpec[] => [
      { comp: "montante-pr", nombre: `Poste ${i + 1} tramo inf.`, pos: [x, 55, z] },
      { comp: "montante-pr", nombre: `Poste ${i + 1} tramo sup.`, pos: [x, 165, z] },
    ],
  ),
  // Barras de pullups reales (106, con placas en los extremos) corriendo a
  // lo fondo sobre cada lado (auditoría: identidad corregida).
  { comp: "barra-pr", nombre: "Barra pullups lateral izq.", pos: [-36.8, 212, 0] },
  { comp: "barra-pr", nombre: "Barra pullups lateral der.", pos: [36.8, 212, 0] },
  { comp: "larguero-pr", nombre: "Larguero base izq.", pos: [-36.8, 3.5, 0] },
  { comp: "larguero-pr", nombre: "Larguero base der.", pos: [36.8, 3.5, 0] },
  // Travesaños reales (70) cruzando a lo ancho al frente y atrás, a 192
  // (auditoría: identidad corregida).
  { comp: "travesano-pr", nombre: "Travesaño frontal", pos: [0, 192, 57] },
  { comp: "travesano-pr", nombre: "Travesaño trasero", pos: [0, 192, -57] },
  // Rieles de base reales (118) que arriostran los postes al suelo.
  { comp: "riel-base-pr", nombre: "Riel base frontal", pos: [0, 2.5, 57] },
  { comp: "riel-base-pr", nombre: "Riel base trasero", pos: [0, 2.5, -57] },
  // Anclajes de cadena (auditoría: no son jotas) y jotas con rodillo
  // calzadas en los agujeros de los postes frontales (la malla de la jota
  // con rodillo quedó horneada como j-hook: rot y90 conserva su pose aquí).
  { comp: "jota-pr", nombre: "Anclaje de cadena izq.", pos: [-36.8, 110, 64.2] },
  { comp: "jota-pr", nombre: "Anclaje de cadena der.", pos: [36.8, 110, 64.2] },
  { comp: "jota-rodillo-pr", nombre: "Jota rodillo izq.", pos: [-36.8, 70, 64.9], rot: [0, Math.PI / 2, 0] },
  { comp: "jota-rodillo-pr", nombre: "Jota rodillo der.", pos: [36.8, 70, 64.9], rot: [0, Math.PI / 2, 0] },
  // Pipes de seguridad: los collares de los extremos abrazan los postes.
  { comp: "brazo-seguridad", nombre: "Pipe seguridad izq.", pos: [-36.8, 75, 0] },
  { comp: "brazo-seguridad", nombre: "Pipe seguridad der.", pos: [36.8, 75, 0] },
];

// BANCO PLANO CLÁSICO del diseñador — bancoplanoclasico.prefab.json
// (v0.2.13): piezas VERBATIM del archivo. Colchoneta sobre espina central
// trazada, pata trasera en L con pie corrido, pata delantera en arco con
// dos pies y bisagras de plegado BLOQUEADAS. No editar a mano: ante una
// nueva corrección, reemplazar por el contenido del .prefab.json siguiente.
const BANCO: PiezaSpec[] = [
  { comp: "asiento", nombre: "Colchoneta", params: { kind: "box", width: 120, height: 8, depth: 30 }, material: "tapizado", pos: [0, 36.7153, 0], rotq: [0, 0, 0, 1], fija: true, masaKg: 2 },
  { comp: "prim-box", nombre: "Pie izq.", params: { kind: "box", width: 8, height: 4, depth: 34 }, material: "acero-negro", pos: [-52, 2, 0], rotq: [0, 0, 0, 1], fija: true, masaKg: 1 },
  { comp: "prim-box", nombre: "Pie der.", params: { kind: "box", width: 8, height: 4, depth: 15 }, material: "acero-negro", pos: [52, 2, 22], rotq: [0, 0, 0, 1], fija: true, masaKg: 1 },
  {
    comp: "pilar-linea",
    nombre: "Pata trasera en L",
    params: {
      kind: "beam", depth: 5, width: 5, ends: "plano", holeDiameter: 0, holeSpacing: 5,
      path: [
        [0, -15.842691599752307, 0],
        [0, -7.921345799876153, 0],
        [0.4249177221894058, 0, 0],
        [6.404642114110054, 7.921345799876153, 0],
        [23.567640633304404, 11.882018699814225, 0],
      ],
    },
    material: "acero-negro", pos: [-52, 19.8427, 0], rotq: [0, 0, 0, 1], fija: true, masaKg: 0,
  },
  {
    comp: "pilar-linea",
    nombre: "Espina central",
    params: {
      kind: "beam", depth: 5, width: 5, ends: "plano", holeDiameter: 0, holeSpacing: 5,
      path: [
        [0, -41.40874442181292, 0],
        [0, -20.70437221090646, 0],
        [0, 0, 0],
        [0, 20.704372210906463, 0],
        [0, 41.40874442181292, 0],
      ],
    },
    material: "acero-negro", pos: [12.9764, 31.7247, 0], rotq: [0, 0, -0.707107, 0.707107], fija: true, masaKg: 0,
  },
  { comp: "prim-box", nombre: "Pie delantero", params: { kind: "box", width: 8, height: 4, depth: 15 }, material: "acero-negro", pos: [52, 2, -22], rotq: [0, 0, 0, 1], fija: true, masaKg: 1 },
  {
    comp: "pilar-linea",
    nombre: "Pata delantera en arco",
    params: {
      kind: "beam", depth: 5, width: 5, ends: "plano", holeDiameter: 0, holeSpacing: 5,
      path: [
        [7.105427357601002e-15, -22.000000000000004, -11.334075056531898],
        [1.4210854715202004e-14, -19.796227117289938, 1.1552483797550241],
        [1.4210854715202004e-14, -18.05202136237298, 13.644571816041948],
        [7.105427357601002e-15, 3.6087232332610226e-15, 16.252244608597586],
        [1.4210854715202004e-14, 18.250754929127822, 13.314696160547035],
        [1.4210854715202004e-14, 20.528940069057676, 0.9903105520075659],
        [7.105427357601002e-15, 22.000000000000004, -11.334075056531907],
      ],
    },
    material: "acero-negro", pos: [52, 15.3341, 0], rotq: [-0.707107, 0, 0, 0.707107], fija: true, masaKg: 0,
  },
];

// Bisagras de PLEGADO del banco clásico (bloqueadas en uso): la pata
// trasera pliega contra la espina y el arco delantero contra sus pies.
const BANCO_UNIONES: UnionSpec[] = [
  { tipo: "bisagra", fija: 4, movil: 3, eje: "z", ancla: [-28.4324, 31.7247, 0], min: -90, max: 0, limites: true, bloqueada: true },
  { tipo: "bisagra", fija: 5, movil: 6, eje: "z", ancla: [52, 4, -22], min: -90, max: 0, limites: true, bloqueada: true },
  { tipo: "bisagra", fija: 2, movil: 6, eje: "z", ancla: [52, 4, 22], min: -90, max: 0, limites: true, bloqueada: true },
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
// PREFAB CORREGIDO POR EL DISEÑADOR — rackcontorrettp.prefab.json v2
// (v0.2.4): posiciones ideales VERBATIM del archivo, con cuaterniones
// exactos. No editar a mano: ante una nueva corrección, reemplazar por
// el contenido del .prefab.json siguiente.
const RACK_TORRE: PiezaSpec[] = [
  { comp: "montante-ttp", nombre: "Pilar vertical 1", pos: [-56, 107, 71.0762], rotq: [0, 0.707107, 0, 0.707107], fija: true, masaKg: 0 },
  { comp: "montante-ttp", nombre: "Pilar vertical 2", pos: [56, 107, 71.0762], rotq: [0, 0.707107, 0, 0.707107], fija: true, masaKg: 0 },
  { comp: "montante-ttp", nombre: "Pilar vertical 3", pos: [-56, 107, -27.9238], rotq: [0, 0.707107, 0, 0.707107], fija: true, masaKg: 0 },
  { comp: "montante-ttp", nombre: "Pilar vertical 4", pos: [56, 107, -27.9238], rotq: [0, 0.707107, 0, 0.707107], fija: true, masaKg: 0 },
  { comp: "riel-base-ttp", nombre: "Columna inferior izq.", pos: [-56, 10, 13.4762], rotq: [0, -0.707107, 0, 0.707107], fija: true, masaKg: 0 },
  { comp: "riel-base-ttp", nombre: "Columna inferior der.", pos: [56, 10, 13.4762], rotq: [0, -0.707107, 0, 0.707107], fija: true, masaKg: 0, escala: [1, 1, -1] },
  { comp: "columna-sup-ttp", nombre: "Columna superior izq.", pos: [-56, 199, 21.8762], rotq: [0, 0.707107, 0, 0.707107], fija: true, masaKg: 0 },
  { comp: "columna-sup-ttp", nombre: "Columna superior der.", pos: [56, 199, 21.8762], rotq: [0, 0.707107, 0, 0.707107], fija: true, masaKg: 0 },
  { comp: "pie-ttp", nombre: "Travesaño inferior", pos: [0, 3, -47.9238], rotq: [0, 0.707107, 0, 0.707107], fija: true, masaKg: 0 },
  { comp: "travesano-frontal-ttp", nombre: "Travesaño frontal", pos: [-0.12, 199.35, -28.2158], rotq: [0, 0, 0, 1], fija: true, masaKg: 0 },
  { comp: "tubo-guia-ttp", nombre: "Tubo guía izq.", pos: [-6.3108, 106.9, -80.9238], rotq: [0, 0, 0, 1], fija: true, masaKg: 0 },
  { comp: "tubo-guia-ttp", nombre: "Tubo guía der.", pos: [7, 106.9, -80.9238], rotq: [0, 0, 0, 1], fija: true, masaKg: 0 },
  { comp: "manguito-guia-ttp", nombre: "Manguito guía izq.", pos: [-6.2946, 33.79, -80.9238], rotq: [0, 0, 0, 1], fija: true, masaKg: 2 },
  { comp: "manguito-guia-ttp", nombre: "Manguito guía der.", pos: [7, 33.12, -80.9238], rotq: [0, 0, 0, 1], fija: true, masaKg: 2 },
  { comp: "multiagarre-ttp", nombre: "Barra pullups multigrip", pos: [0, 208.8, 57.6762], rotq: [0, 0.707107, 0, 0.707107], fija: true, masaKg: 0 },
  { comp: "j-hook", nombre: "Jota de seguridad izq.", pos: [-56, 127, -17.9238], rotq: [0, 0, 0, 1], fija: true, masaKg: 0 },
  { comp: "j-hook", nombre: "Jota de seguridad der.", pos: [56, 127, -17.9238], rotq: [0, 0, 0, 1], fija: true, masaKg: 0 },
  { comp: "j-hook", nombre: "Jota baja izq.", pos: [-56, 40.91, 81.0762], rotq: [0, 0, 0, 1], fija: true, masaKg: 0 },
  { comp: "j-hook", nombre: "Jota baja der.", pos: [56, 41, 81.0762], rotq: [0, 0, 0, 1], fija: true, masaKg: 0 },
  { comp: "brazo-seguridad", nombre: "Brazo de seguridad izq.", pos: [-56, 65, 22.0762], rotq: [0, 0, 0, 1], fija: true, masaKg: 0 },
  { comp: "brazo-seguridad", nombre: "Brazo de seguridad der.", pos: [56, 65, 22.0762], rotq: [0, 0, 0, 1], fija: true, masaKg: 0 },
  { comp: "roldana", nombre: "Polea alta frontal", pos: [0, 211, -1.9238], rotq: [0, 0, 0.707107, 0.707107], fija: true, masaKg: 0.3 },
  { comp: "roldana", nombre: "Polea alta trasera", pos: [0, 211, -46.9238], rotq: [0, 0, 0.707107, 0.707107], fija: true, masaKg: 0.3 },
  { comp: "roldana", nombre: "Polea de torre", pos: [0, 203, -74.9238], rotq: [0, 0, 0.707107, 0.707107], fija: true, masaKg: 0.3 },
  // El carro es MÓVIL: cuelga de los cables y sube/baja según su tensión
  // (jalón alto y bajo). Las dos roldanas se empotran solas en el puente
  // (cuerpo compuesto, v0.2.8) y viajan con él. Masas del .prefab.json del
  // diseñador (v0.2.9).
  { comp: "roldana", nombre: "Carro: polea sup.", pos: [0, 136, -51.9238], rotq: [0, 0, 0.707107, 0.707107], fija: false, masaKg: 0.3 },
  { comp: "roldana", nombre: "Carro: polea inf.", pos: [0, 123, -51.9238], rotq: [0, 0, 0.707107, 0.707107], fija: false, masaKg: 0.3 },
  { comp: "puente-carro-ttp", nombre: "Puente del carro", pos: [0, 129, -51.9238], rotq: [0, 0, 0, 1], fija: false, masaKg: 0.2 },
  { comp: "roldana", nombre: "Polea baja", pos: [0, 10, -47.9238], rotq: [0, 0, 0.707107, 0.707107], fija: true, masaKg: 0.3 },
  { comp: "soporte-polea-ttp", nombre: "Soporte polea baja", pos: [0, 6.7, -47.8238], rotq: [0, 0, 0, 1], fija: true, masaKg: 0 },
  { comp: "placa-polea-ttp", nombre: "Placa polea baja", pos: [0, 3.5, -64.5238], rotq: [0, 0, 0, 1], fija: true, masaKg: 0 },
  { comp: "barra-lat-ttp", nombre: "Remo de polea alta", pos: [-0.12, 210.247, 8.3062], rotq: [0, 0, 0, 1], fija: false, masaKg: 4 },
  { comp: "pletina-ttp", nombre: "Pletina TTP", pos: [0, 3.5, -81.0238], rotq: [0, 0, 0, 1], fija: true, masaKg: 0 },
  { comp: "bastidor-sup-ttp", nombre: "Bastidor superior TTP", pos: [-0.12, 206.85, -37.8238], rotq: [0, 1, 0, 0], fija: true, masaKg: 0 },
  { comp: "portadiscos-ttp", nombre: "Portadiscos de polea TTP", params: { discCount: 3 }, pos: [0.3542, 67, -81.0762], rotq: [0, 0.707107, 0, 0.707107], fija: false, masaKg: 8 },
  { comp: "barra-dominadas", nombre: "Barra de jalón bajo", params: { kind: "cylinder", radiusTop: 1.6, radiusBottom: 1.6, height: 50 }, material: "cromo", pos: [4, 5, -27.9238], rotq: [0, 0, 0.707107, 0.707107], fija: false, masaKg: 2 },
];

/**
 * CABLES del sistema de poleas del TTP (del .prefab.json del diseñador,
 * v0.2.8). Índices sobre RACK_TORRE:
 * - Jalón BAJO: barra de jalón bajo (34) → polea baja (27) → polea inferior
 *   del carro (25) → anclado en la placa (29). Tirar de la barra baja TIRA
 *   el puente del carro hacia abajo.
 * - Jalón ALTO: portadiscos (33) → polea de torre (23) → polea superior del
 *   carro (24) → polea alta trasera (22) → polea alta frontal (21) → remo
 *   (30). La tensión levanta el puente y el contrapeso del portadiscos.
 */
const RACK_TORRE_CABLES: CableSpec[] = [
  {
    nodos: [
      { pieza: 34, local: [0, 0, 0] },
      { pieza: 27, local: [-0.7369, 0, -0.9114] },
      { pieza: 25, local: [1.1671, 0, 0.1076] },
      { pieza: 29, local: [0, 0, -13] },
    ],
  },
  {
    nodos: [
      { pieza: 33, local: [0, 4.0671, 0] },
      { pieza: 23, local: [1.1605, 0, -0.1641] },
      { pieza: 24, local: [-1.1612, 0, 0.159] },
      { pieza: 22, local: [0.8649, 0, -0.7909] },
      { pieza: 21, local: [-1.164, 0, 0.1368] },
      { pieza: 30, local: [0, 3.397, 0] },
    ],
  },
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

export interface MaquinaSpec {
  label: string;
  piezas: PiezaSpec[];
  uniones?: UnionSpec[];
  cables?: CableSpec[];
}

const SPECS: Record<string, MaquinaSpec> = {
  "rack-sentadillas": { label: "Rack de sentadillas", piezas: RACK },
  "jaula-potencia": { label: "Jaula de potencia", piezas: JAULA },
  "banco-plano": { label: "Banco plano", piezas: BANCO, uniones: BANCO_UNIONES },
  "torre-polea": { label: "Torre de polea", piezas: TORRE },
  // Las guías del carrier las RECONOCE el motor físico (tubos que atraviesan
  // los manguitos) — no necesitan unión manual.
  "rack-torre": { label: "Rack con torre (TTP)", piezas: RACK_TORRE, cables: RACK_TORRE_CABLES },
  "arbol-discos": { label: "Árbol de discos", piezas: ARBOL },
};

/** Especificación de piezas de una máquina estándar (para hornear/exportar). */
export function piezasDeMaquina(prefabId: string): MaquinaSpec | null {
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
  const ids = construirPiezas(editor, spec.piezas, spec.label, at);
  if (spec.uniones) aplicarUniones(editor, ids, spec.uniones, at);
  if (spec.cables) aplicarCables(editor, ids, spec.cables);
  return { ids, label: spec.label };
}

/**
 * Reconstruye los CABLES de un prefab recién armado: cada nodo se re-ancla a
 * la pieza creada (por índice) en su punto local original, así los sistemas
 * de poleas conservan su recorrido y su función móvil.
 */
export function aplicarCables(editor: Editor, ids: string[], cables: CableSpec[]): void {
  for (const c of cables) {
    if (!c || !Array.isArray(c.nodos)) continue;
    const nodes: { objectId: string; local: { x: number; y: number; z: number } }[] = [];
    let completo = true;
    for (const n of c.nodos) {
      const id = ids[n.pieza];
      if (!id || !Array.isArray(n.local)) {
        completo = false;
        break;
      }
      nodes.push({ objectId: id, local: { x: n.local[0], y: n.local[1], z: n.local[2] } });
    }
    if (completo && nodes.length >= 2) editor.createCable(nodes);
  }
}

/**
 * Crea las UNIONES de un prefab recién armado: correderas/bisagras entre las
 * piezas por índice, con eje, límites y ancla del spec (v0.2.4).
 */
export function aplicarUniones(
  editor: Editor,
  ids: string[],
  uniones: UnionSpec[],
  at: THREE.Vector3,
): void {
  for (const u of uniones) {
    const aId = ids[u.fija];
    const bId = ids[u.movil];
    if (!aId || !bId) continue;
    const ancla = u.ancla
      ? new THREE.Vector3(at.x + u.ancla[0], u.ancla[1], at.z + u.ancla[2])
      : editor.getObject(bId)?.mesh.position.clone();
    const joint = editor.connect(aId, bId, u.tipo === "bisagra" ? "revolute" : "prismatic", ancla);
    if (!joint) continue;
    if (u.eje) joint.axis = u.eje;
    if (u.min !== undefined) joint.min = u.min;
    if (u.max !== undefined) joint.max = u.max;
    joint.limitsEnabled = u.limites ?? (u.min !== undefined || u.max !== undefined);
    if (u.bloqueada) joint.locked = true;
  }
  editor.refreshJointHelpers();
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
    if (p.masaKg !== undefined) obj.physics = { ...obj.physics, massKg: p.masaKg };
    obj.mesh.position.set(at.x + p.pos[0], p.pos[1], at.z + p.pos[2]);
    // Pose exacta: el CUATERNIÓN del prefab v2 manda; si no, los Euler; si
    // tampoco, se conserva la orientación de inserción del componente.
    if (p.rotq) obj.mesh.quaternion.set(p.rotq[0], p.rotq[1], p.rotq[2], p.rotq[3]);
    else if (p.rot) obj.mesh.rotation.set(p.rot[0], p.rot[1], p.rot[2]);
    if (p.escala) obj.mesh.scale.set(p.escala[0], p.escala[1], p.escala[2]);
    ids.push(obj.id);
  }
  return ids;
}
