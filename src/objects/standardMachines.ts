import * as THREE from "three";
import type { Editor } from "../core/Editor";
import type { PrimitiveParams } from "./types";
import {
  UPPER_MACHINE,
  UPPER_MACHINE_CABLES,
  UPPER_MACHINE_UNIONES,
} from "./maquinas/upperMachine";

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
      "Rack de sentadillas del diseñador: dos montantes perforados de 212 cm con arcos superiores, barra de dominadas, jotas con rodillo, anclajes de cadena y base articulada.",
  },
  {
    id: "jaula-potencia",
    label: "Jaula de potencia",
    icon: "🗼",
    description:
      "Jaula de potencia del diseñador (112×219×129): cuatro pilares TTP perforados con columnas inferiores y superiores, travesaños, barra pullups multigrip, cuatro jotas de calce y dos brazos de seguridad.",
  },
  {
    id: "banco-plano",
    label: "Banco plano",
    icon: "🛋️",
    description:
      "Banco plano clásico del diseñador (120×41×30): colchoneta tapizada sobre espina central, pata trasera en L, pata delantera en arco y bisagras de plegado bloqueadas.",
  },
  {
    id: "rack-torre",
    label: "Rack con torre (TTP)",
    icon: "🏗️",
    description:
      "TTP001L corregido por el diseñador: 4 pilares girados al calce, columnas inferiores y superiores, travesaños y bastidor superior, 2 tubos de guía con manguitos y portadiscos móvil, 4 jotas, set de roldanas, remo de polea alta y pullups multigrip.",
  },
  {
    id: "uppermachine",
    label: "UpperMachine",
    icon: "🏠",
    description:
      "Torre multiestación del diseñador: pila selectorizada de 15 placas sobre tubos guía, carro de doble roldana, jalón alto con barra, y brazo de pecho COMPUESTO (segmento, arco en U, mangos y agarres soldados en un cuerpo rígido) que pivota desde el bastidor superior.",
  },
  {
    id: "torre-polea-discos",
    label: "Torre polea de discos",
    icon: "🛗",
    description:
      "Torre de polea del diseñador con CARRIER PORTADISCOS (carga por discos): dos tubos guía con manguitos, poleas alta/baja/de torre, carro de doble roldana, remo de polea alta y barra de jalón bajo, con sus dos cables completos.",
  },
  {
    id: "torre-polea-pesos",
    label: "Torre polea de pesos",
    icon: "🧱",
    description:
      "Variante de la torre del diseñador con BLOQUE DE PESOS: la pila seleccionable abraza los tubos guía en lugar del carrier portadiscos — mismo bastidor, poleas, remo de polea alta y jalón bajo con sus dos cables.",
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
  /** Eje LIBRE en mundo (unitario) si la unión no cae sobre una letra (v0.2.25). */
  ejeVec?: [number, number, number];
  /** Ancla en coordenadas del prefab (mismas que `pos`); por defecto, la posición de la pieza móvil. */
  ancla?: [number, number, number];
  min?: number;
  max?: number;
  /** Con límites activos (por defecto sí cuando hay min/max). */
  limites?: boolean;
  bloqueada?: boolean;
  /** Las dos piezas unidas siguen chocando entre sí (bisagra real, v0.2.33). */
  contactos?: boolean;
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

/**
 * CUERDA DE SEGURIDAD de una máquina (v0.2.14): cadena o correa tendida
 * entre dos piezas (por índice, con anclaje local en cm). El formato
 * prefab del usuario aún no captura cuerdas — las máquinas nativas las
 * declaran aquí para nacer completas (y el motor las materializa como
 * barrera si sus anclas son fijas).
 */
export interface CuerdaSpec {
  tipo: "chain" | "strap";
  a: { pieza: number; local: [number, number, number] };
  b: { pieza: number; local: [number, number, number] };
  /** Holgura de la catenaria (0..1). */
  holgura?: number;
}

// RACK DE SENTADILLAS del diseñador — racksentadillas.prefab.json
// (v0.2.14): piezas VERBATIM del archivo. Dos montantes perforados con
// arcos superiores, barra de dominadas, jotas con rodillo, anclajes de
// cadena y base con travesaños articulados. No editar a mano: ante una
// nueva corrección, reemplazar por el contenido del .prefab.json.
const RACK: PiezaSpec[] = [
  { comp: "barra-pr", nombre: "Barra pullups lateral der.", params: { kind: "box", width: 7, height: 12, depth: 106 }, material: "acero-negro", pos: [22.4621, 210.7134, 0.0844], rotq: [0, 0, 0, 1], fija: true, masaKg: 0 },
  { comp: "jota-pr", nombre: "Anclaje de cadena izq.", params: { kind: "box", width: 13.2, height: 13, depth: 7.4 }, material: "acero-negro", pos: [20.0332, 68.2807, -55.5513], rotq: [0, 0, 0, 1], fija: true, masaKg: 0, escala: [-1, 1, 1] },
  { comp: "jota-pr", nombre: "Anclaje de cadena der.", params: { kind: "box", width: 13.2, height: 13, depth: 7.4 }, material: "acero-negro", pos: [20.1621, 68.2807, 55.554], rotq: [0, 0, 0, 1], fija: true, masaKg: 0, escala: [-1, 1, 1] },
  { comp: "jota-rodillo-pr", nombre: "Jota rodillo izq.", params: { kind: "box", width: 7.4, height: 13, depth: 15.4 }, material: "acero-negro", pos: [18.3332, 118.2807, -55.5513], rotq: [0, 0.707107, 0, 0.707107], fija: true, masaKg: 0 },
  { comp: "jota-rodillo-pr", nombre: "Jota rodillo der.", params: { kind: "box", width: 7.4, height: 13, depth: 15.4 }, material: "acero-negro", pos: [18.4621, 118.2807, 55.554], rotq: [0, 0.707107, 0, 0.707107], fija: true, masaKg: 0 },
  { comp: "pilar-linea", nombre: "Pilar / travesaño", params: { kind: "beam", depth: 7, width: 5, ends: "plano", holeDiameter: 1.6, holeSpacing: 5, path: [[0, -106.280731, 0], [0, -53.140366, 0], [0, 0, 0], [0, 53.140366, 0], [0, 106.280731, 0]] }, material: "acero-negro", pos: [22.3332, 110.7807, -55.5513], rotq: [0, 0.707107, 0, 0.707107], fija: true, masaKg: 0 },
  { comp: "pilar-linea", nombre: "Pilar / travesaño", params: { kind: "beam", depth: 7, width: 5, ends: "plano", holeDiameter: 1.6, holeSpacing: 5, path: [[0, -106.280731, 0], [0, -53.140366, 0], [0, 0, 0], [0, 53.140366, 0], [0, 106.280731, 0]] }, material: "acero-negro", pos: [22.4621, 110.7807, 55.554], rotq: [0, 0.707107, 0, 0.707107], fija: true, masaKg: 0 },
  { comp: "pilar-linea", nombre: "Pilar / travesaño", params: { kind: "beam", depth: 5, width: 5, ends: "plano", holeDiameter: 0, holeSpacing: 5, path: [[0, -53.555126, 0], [0, -26.777563, 0], [0, 0, 0], [0, 26.777563, 0], [0, 53.555126, 0]] }, material: "acero-negro", pos: [-7.8421, 1.7829, -55.5513], rotq: [0, 0, 0.707107, 0.707107], fija: true, masaKg: 0 },
  { comp: "pilar-linea", nombre: "Pilar / travesaño", params: { kind: "beam", depth: 5, width: 5, ends: "plano", holeDiameter: 0, holeSpacing: 5, path: [[0, -53.555126, 0], [0, -26.777563, 0], [0, 0, 0], [0, 26.777563, 0], [0, 53.555126, 0]] }, material: "acero-negro", pos: [-7.813, 1.7829, 55.4911], rotq: [0, 0, 0.707107, 0.707107], fija: true, masaKg: 0 },
  { comp: "pilar-linea", nombre: "Pilar / travesaño", params: { kind: "beam", depth: 5, width: 5, ends: "plano", holeDiameter: 0, holeSpacing: 5, path: [[0.0, -55.804692, -8.029068], [0.0, -51.434187, 0], [0, -26.777563, 2.634408], [0, -0.0, 3.275483], [0, 26.777563, 2.505633], [-0.0, 50.912415, 0], [0.0, 55.237739, -8]] }, material: "acero-negro", pos: [53.7421, 1.7829, 0.2534], rotq: [0.5, 0.5, 0.5, 0.5], fija: true, masaKg: 0 },
  { comp: "pilar-linea", nombre: "Pilar / travesaño", params: { kind: "beam", depth: 5, width: 5, ends: "plano", holeDiameter: 1.6, holeSpacing: 5, path: [[0, -105.206091, 0], [0, -52.603045, 0], [0, 0, 0], [0, 70.368189, 6.09974], [0, 97.892955, 29.348636], [0.0, 103.042469, 73.583129]] }, material: "acero-negro", pos: [-53.7205, 109.6772, -55.554], rotq: [0, 0.707107, 0, 0.707107], fija: true, masaKg: 0 },
  { comp: "pilar-linea", nombre: "Pilar / travesaño", params: { kind: "beam", depth: 5, width: 5, ends: "plano", holeDiameter: 1.6, holeSpacing: 5, path: [[0, -105.206091, 0], [0, -52.603045, 0], [0, 0, 0], [0, 70.368189, 6.09974], [0, 97.892955, 29.348636], [0.0, 103.042469, 73.583129]] }, material: "acero-negro", pos: [-53.7421, 109.6772, 55.446], rotq: [0, 0.707107, 0, 0.707107], fija: true, masaKg: 0 },
  { comp: "jota-pr", nombre: "Anclaje de cadena POWERRACK 3", params: { kind: "box", width: 13.2, height: 13, depth: 7.4 }, material: "acero-negro", pos: [-51.6847, 70.1495, 55.446], rotq: [0, 0, 0.001847, 0.999998], fija: true, masaKg: 0 },
  { comp: "jota-pr", nombre: "Anclaje de cadena POWERRACK 4", params: { kind: "box", width: 13.2, height: 13, depth: 7.4 }, material: "acero-negro", pos: [-51.6631, 70.1495, -55.554], rotq: [0, 0, 0.001847, 0.999998], fija: true, masaKg: 0 },
];

// CADENAS DE SEGURIDAD del rack: una por lado, tendidas entre el anclaje
// delantero y el trasero (el prefab del usuario no captura cuerdas — se
// declaran aquí para que la máquina nazca completa, como en sus capturas).
const RACK_CUERDAS: CuerdaSpec[] = [
  { tipo: "chain", a: { pieza: 1, local: [0, 0, 0] }, b: { pieza: 13, local: [0, 0, 0] }, holgura: 0.16 },
  { tipo: "chain", a: { pieza: 2, local: [0, 0, 0] }, b: { pieza: 12, local: [0, 0, 0] }, holgura: 0.16 },
];

// Bisagras de la base (bloqueadas en uso).
const RACK_UNIONES: UnionSpec[] = [
  { tipo: "bisagra", fija: 7, movil: 9, eje: "z", ancla: [45.713, 1.7829, -55.5513], min: -90, max: 0, limites: true, bloqueada: true },
  { tipo: "bisagra", fija: 8, movil: 9, eje: "z", ancla: [45.7421, 1.7829, 55.4911], min: -90, max: 0, limites: true, bloqueada: true },
];

// JAULA DE POTENCIA del diseñador — jauladepotencia.prefab.json
// (v0.2.21): piezas VERBATIM del archivo. Cuatro pilares TTP con columnas
// inferiores y superiores, travesaños, barra pullups multigrip, cuatro
// jotas de calce y dos brazos de seguridad. No editar a mano: ante una
// corrección, reemplazar por el contenido del .prefab.json.
const JAULA: PiezaSpec[] = [
  { comp: "montante-ttp", nombre: "Pilar vertical 1", params: { kind: "box", width: 5, height: 204, depth: 7 }, material: "acero-negro", pos: [-56, 107, 54.5], rotq: [0, 0.707107, 0, 0.707107], fija: true, masaKg: 0 },
  { comp: "montante-ttp", nombre: "Pilar vertical 2", params: { kind: "box", width: 5, height: 204, depth: 7 }, material: "acero-negro", pos: [56, 107, 54.5], rotq: [0, 0.707107, 0, 0.707107], fija: true, masaKg: 0 },
  { comp: "montante-ttp", nombre: "Pilar vertical 3", params: { kind: "box", width: 5, height: 204, depth: 7 }, material: "acero-negro", pos: [-56, 107, -44.5], rotq: [0, 0.707107, 0, 0.707107], fija: true, masaKg: 0 },
  { comp: "montante-ttp", nombre: "Pilar vertical 4", params: { kind: "box", width: 5, height: 204, depth: 7 }, material: "acero-negro", pos: [56, 107, -44.5], rotq: [0, 0.707107, 0, 0.707107], fija: true, masaKg: 0 },
  { comp: "riel-base-ttp", nombre: "Columna inferior izq.", params: { kind: "box", width: 141, height: 20, depth: 7 }, material: "acero-negro", pos: [-56, 10, -3.1], rotq: [0, -0.707107, 0, 0.707107], fija: true, masaKg: 0 },
  { comp: "riel-base-ttp", nombre: "Columna inferior der.", params: { kind: "box", width: 141, height: 20, depth: 7 }, material: "acero-negro", pos: [56, 10, -3.1], rotq: [0, -0.707107, 0, 0.707107], fija: true, masaKg: 0, escala: [1, 1, -1] },
  { comp: "columna-sup-ttp", nombre: "Columna superior izq.", params: { kind: "box", width: 94, height: 20, depth: 7 }, material: "acero-negro", pos: [-56, 199, 5.3], rotq: [0, 0.707107, 0, 0.707107], fija: true, masaKg: 0 },
  { comp: "columna-sup-ttp", nombre: "Columna superior der.", params: { kind: "box", width: 94, height: 20, depth: 7 }, material: "acero-negro", pos: [56, 199, 5.3], rotq: [0, 0.707107, 0, 0.707107], fija: true, masaKg: 0 },
  { comp: "pie-ttp", nombre: "Travesaño inferior", params: { kind: "box", width: 15, height: 5, depth: 104 }, material: "acero-negro", pos: [0, 3, -64.5], rotq: [0, 0.707107, 0, 0.707107], fija: true, masaKg: 0 },
  { comp: "travesano-frontal-ttp", nombre: "Travesaño frontal", params: { kind: "box", width: 118, height: 20, depth: 5.2 }, material: "acero-negro", pos: [-0.12, 199.35, -44.792], rotq: [0, 0, 0, 1], fija: true, masaKg: 0 },
  { comp: "multiagarre-ttp", nombre: "Barra pullups multigrip", params: { kind: "box", width: 32, height: 9.6, depth: 106.5 }, material: "acero-negro", pos: [0, 208.8, 41.1], rotq: [0, 0.707107, 0, 0.707107], fija: true, masaKg: 0 },
  { comp: "j-hook", nombre: "Jota de seguridad izq.", params: { kind: "box", width: 9, height: 24, depth: 26 }, material: "acero-negro", pos: [-56, 127, -34.5], rotq: [0, 0, 0, 1], fija: true, masaKg: 0 },
  { comp: "j-hook", nombre: "Jota de seguridad der.", params: { kind: "box", width: 9, height: 24, depth: 26 }, material: "acero-negro", pos: [56, 127, -34.5], rotq: [0, 0, 0, 1], fija: true, masaKg: 0 },
  { comp: "j-hook", nombre: "Jota baja izq.", params: { kind: "box", width: 9, height: 24, depth: 26 }, material: "acero-negro", pos: [-56, 40.91, 64.5], rotq: [0, 0, 0, 1], fija: true, masaKg: 0 },
  { comp: "j-hook", nombre: "Jota baja der.", params: { kind: "box", width: 9, height: 24, depth: 26 }, material: "acero-negro", pos: [56, 41, 64.5], rotq: [0, 0, 0, 1], fija: true, masaKg: 0 },
  { comp: "brazo-seguridad", nombre: "Brazo de seguridad izq.", params: { kind: "box", width: 9, height: 24, depth: 106 }, material: "acero-negro", pos: [-56, 65, 5.5], rotq: [0, 0, 0, 1], fija: true, masaKg: 0 },
  { comp: "brazo-seguridad", nombre: "Brazo de seguridad der.", params: { kind: "box", width: 9, height: 24, depth: 106 }, material: "acero-negro", pos: [56, 65, 5.5], rotq: [0, 0, 0, 1], fija: true, masaKg: 0 },
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

// La antigua "Torre de polea (alta/baja)" salió del inventario en v0.2.25:
// las torres de polea de discos y de pesos del diseñador suplen su función.

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
// TORRE POLEA DE DISCOS del diseñador — torrepoleadediscos.prefab.json
// (v0.2.20): piezas VERBATIM del archivo. Torre de polea con CARRIER
// PORTADISCOS (carga por discos), dos tubos guía con manguitos, poleas
// altas/baja/de torre, carro de doble roldana, remo de polea alta y barra
// de jalón bajo, con dos cables completos. (Variante futura: bloque de
// pesos en lugar del carrier.) No editar a mano: ante una corrección,
// reemplazar por el contenido del .prefab.json.
const TORRE_DISCOS: PiezaSpec[] = [
  { comp: "pie-ttp", nombre: "Travesaño inferior", params: { kind: "box", width: 15, height: 5, depth: 104 }, material: "acero-negro", pos: [-0.015, 3, -11.5388], rotq: [0, 0.707107, 0, 0.707107], fija: true, masaKg: 0, escala: [1, 1, 0.9793] },
  { comp: "tubo-guia-ttp", nombre: "Tubo guía izq.", params: { kind: "box", width: 4, height: 214, depth: 4 }, material: "acero-pulido", pos: [-6.3258, 106.9, -44.5388], rotq: [0, 0, 0, 1], fija: true, masaKg: 0 },
  { comp: "tubo-guia-ttp", nombre: "Tubo guía der.", params: { kind: "box", width: 4, height: 214, depth: 4 }, material: "acero-pulido", pos: [6.985, 106.9, -44.5388], rotq: [0, 0, 0, 1], fija: true, masaKg: 0 },
  { comp: "manguito-guia-ttp", nombre: "Manguito guía izq.", params: { kind: "box", width: 6, height: 54, depth: 6 }, material: "acero-pulido", pos: [-6.3096, 33.79, -44.5388], rotq: [0, 0, 0, 1], fija: true, masaKg: 2 },
  { comp: "manguito-guia-ttp", nombre: "Manguito guía der.", params: { kind: "box", width: 6, height: 54, depth: 6 }, material: "acero-pulido", pos: [6.985, 33.12, -44.5388], rotq: [0, 0, 0, 1], fija: true, masaKg: 2 },
  { comp: "roldana", nombre: "Polea alta frontal", params: { kind: "cylinder", height: 2.5, radiusTop: 4, radiusBottom: 4 }, material: "nylon", pos: [-0.015, 211, 34.4612], rotq: [0, 0, 0.707107, 0.707107], fija: true, masaKg: 0.3 },
  { comp: "roldana", nombre: "Polea alta trasera", params: { kind: "cylinder", height: 2.5, radiusTop: 4, radiusBottom: 4 }, material: "nylon", pos: [-0.015, 211, -10.5388], rotq: [0, 0, 0.707107, 0.707107], fija: true, masaKg: 0.3 },
  { comp: "roldana", nombre: "Polea de torre", params: { kind: "cylinder", height: 2.5, radiusTop: 4, radiusBottom: 4 }, material: "nylon", pos: [-0.015, 203, -38.5388], rotq: [0, 0, 0.707107, 0.707107], fija: true, masaKg: 0.3 },
  { comp: "roldana", nombre: "Carro: polea sup.", params: { kind: "cylinder", height: 2.5, radiusTop: 4, radiusBottom: 4 }, material: "nylon", pos: [-0.015, 136, -15.5388], rotq: [0, 0, 0.707107, 0.707107], fija: false, masaKg: 0.3 },
  { comp: "roldana", nombre: "Carro: polea inf.", params: { kind: "cylinder", height: 2.5, radiusTop: 4, radiusBottom: 4 }, material: "nylon", pos: [-0.015, 123, -15.5388], rotq: [0, 0, 0.707107, 0.707107], fija: false, masaKg: 0.3 },
  { comp: "puente-carro-ttp", nombre: "Puente del carro", params: { kind: "box", width: 3.5, height: 20.4, depth: 7.2 }, material: "acero-negro", pos: [-0.015, 129, -15.5388], rotq: [0, 0, 0, 1], fija: false, masaKg: 0.2 },
  { comp: "roldana", nombre: "Polea baja", params: { kind: "cylinder", height: 2.5, radiusTop: 4, radiusBottom: 4 }, material: "nylon", pos: [-0.015, 10, -11.5388], rotq: [0, 0, 0.707107, 0.707107], fija: true, masaKg: 0.3 },
  { comp: "soporte-polea-ttp", nombre: "Soporte polea baja", params: { kind: "box", width: 19, height: 13.3, depth: 7.2 }, material: "acero-negro", pos: [-0.015, 6.7, -11.4388], rotq: [0, 0, 0, 1], fija: true, masaKg: 0 },
  { comp: "placa-polea-ttp", nombre: "Placa polea baja", params: { kind: "box", width: 19, height: 7, depth: 26 }, material: "acero-negro", pos: [-0.015, 3.5, -28.1388], rotq: [0, 0, 0, 1], fija: true, masaKg: 0 },
  { comp: "barra-lat-ttp", nombre: "Remo de polea alta", params: { kind: "box", width: 75, height: 7, depth: 2 }, material: "cromo", pos: [-0.135, 210.247, 44.6912], rotq: [0, 0, 0, 1], fija: false, masaKg: 4 },
  { comp: "pletina-ttp", nombre: "Pletina TTP", params: { kind: "box", width: 45, height: 5, depth: 7 }, material: "acero-negro", pos: [-0.015, 3.5, -44.6388], rotq: [0, 0, 0, 1], fija: true, masaKg: 0 },
  { comp: "bastidor-sup-ttp", nombre: "Bastidor superior TTP", params: { kind: "box", width: 32, height: 15, depth: 92.3 }, material: "acero-negro", pos: [-0.135, 206.85, -1.4388], rotq: [0, 1, 0, 0], fija: true, masaKg: 0 },
  { comp: "portadiscos-ttp", nombre: "Portadiscos de polea TTP", params: { kind: "box", width: 6.1, height: 8.1, depth: 88, discCount: 3 }, material: "acero-negro", pos: [0.3392, 67, -44.6912], rotq: [0, 0.707107, 0, 0.707107], fija: false, masaKg: 8 },
  { comp: "barra-dominadas", nombre: "Barra de jalón bajo", params: { kind: "cylinder", height: 50, radiusTop: 1.6, radiusBottom: 1.6 }, material: "cromo", pos: [3.985, 5, 8.4612], rotq: [0, 0, 0.707107, 0.707107], fija: false, masaKg: 2 },
  { comp: "pilar-linea", nombre: "Pilar / travesaño", params: { kind: "beam", width: 5, depth: 7, ends: "plano", holeDiameter: 0, holeSpacing: 5, path: [[0, -29.578074, 0], [0, -14.789037, 0], [-2.527652, -3.453547, 0], [-12.799007, 9.049852, 0], [-31.806238, 11.090995, 0.5]] }, material: "acero-negro", pos: [54.2912, 3, -33.5478], rotq: [-0.707107, 0, 0, 0.707107], fija: true, masaKg: 0 },
  { comp: "pilar-linea", nombre: "Pilar / travesaño", params: { kind: "beam", width: 5, depth: 7, ends: "plano", holeDiameter: 0, holeSpacing: 5, path: [[0, -29.578074, 0], [0, -14.789037, 0], [-2.527652, -3.453547, 0], [-12.799007, 9.049852, 0], [-31.806238, 11.090995, 0.5]] }, material: "acero-negro", pos: [-54.2912, 3, -33.515], rotq: [-0.707107, 0, 0, 0.707107], fija: true, masaKg: 0, escala: [-1, 1, 1] },
  { comp: "pilar-linea", nombre: "Pilar / travesaño", params: { kind: "beam", width: 5, depth: 7, ends: "plano", holeDiameter: 1.6, holeSpacing: 5, path: [[0, -101.478722, 0], [0, -76.109042, 0], [0, -50.739361, 0], [0, -25.369681, 0], [0, 0, 0], [0, 25.369681, 0], [0, 50.739361, 0], [0, 66.468019, 0], [0, 89.107808, 2.446404], [0, 97.925334, 18.53356], [0, 98.934026, 42.309652]] }, material: "acero-negro", pos: [-13.6375, 107.1216, -11.6466], rotq: [0, 0, 0, 1], fija: true, masaKg: 0, escala: [1, 1, -1] },
  { comp: "pilar-linea", nombre: "Pilar / travesaño", params: { kind: "beam", width: 5, depth: 7, ends: "plano", holeDiameter: 1.6, holeSpacing: 5, path: [[0, -101.478722, 0], [0, -76.109042, 0], [0, -50.739361, 0], [0, -25.369681, 0], [0, 0, 0], [0, 25.369681, 0], [0, 50.739361, 0], [0, 66.468019, 0], [0, 89.107808, 2.446404], [0, 97.925334, 18.53356], [0, 98.934026, 42.309652]] }, material: "acero-negro", pos: [13.585, 107.1216, -11.615], rotq: [0, 0, 0, 1], fija: true, masaKg: 0, escala: [1, 1, -1] },
  { comp: "pilar-linea", nombre: "Pilar / travesaño", params: { kind: "beam", width: 5, depth: 5, ends: "plano", holeDiameter: 0, holeSpacing: 5, path: [[1.615067, -13.583646, 38.568193], [-0.015759, -12.788268, 13.580028], [-0.003509, -11.993307, 3.024], [0, 0, 0], [-0.003321, 11.945412, 2.861656], [-0.015666, 12.79233, 13.499779], [1.615067, 13.638828, 38.568193]] }, material: "acero-negro", pos: [-0.0986, 206.6173, 8.4056], rotq: [0.000821, 0, -0.707106, 0.707107], fija: true, masaKg: 0, escala: [1, 1, -1] },
];

const TORRE_DISCOS_UNIONES: UnionSpec[] = [
  { tipo: "bisagra", fija: 15, movil: 19, eje: "z", ancla: [22.485, 3.5, -44.6388], min: -90, max: 0, limites: true, bloqueada: true },
  { tipo: "bisagra", fija: 22, movil: 23, eje: "z", ancla: [13.585, 205.047, -30.1486], min: -90, max: 0, limites: true, bloqueada: true },
  { tipo: "bisagra", fija: 21, movil: 23, eje: "z", ancla: [-13.6375, 205.047, -30.1801], min: -90, max: 0, limites: true, bloqueada: true },
];

const TORRE_DISCOS_CABLES: CableSpec[] = [
  { nodos: [{ pieza: 18, local: [0, 0, 0] }, { pieza: 11, local: [-0.7369, 0, -0.9114] }, { pieza: 9, local: [1.1671, 0, 0.1076] }, { pieza: 13, local: [0, 0, -13] }] },
  { nodos: [{ pieza: 17, local: [0, 4.0671, 0] }, { pieza: 7, local: [1.1605, 0, -0.1641] }, { pieza: 8, local: [-1.1612, 0, 0.159] }, { pieza: 6, local: [0.8649, 0, -0.7909] }, { pieza: 5, local: [-1.164, 0, 0.1368] }, { pieza: 14, local: [0, 3.397, 0] }] },
];

// TORRE POLEA DE PESOS — torrepoleadepesos.prefab.json CORREGIDO por el
// diseñador (v0.2.24): piezas VERBATIM del archivo. Mismo bastidor de la
// torre de discos SIN manguitos espaciadores: el BLOQUE DE PESOS (pila
// seleccionable) abraza los tubos guía cerca del piso, con remo de polea
// alta, jalón bajo y sus dos cables. No editar a mano: ante una nueva
// corrección, reemplazar por el contenido del .prefab.json.
const TORRE_PESOS: PiezaSpec[] = [
  { comp: "pie-ttp", nombre: "Travesaño inferior", params: { kind: "box", width: 15, height: 5, depth: 104 }, material: "acero-negro", pos: [-0.015, 3, -11.565], rotq: [0, 0.707107, 0, 0.707107], fija: true, masaKg: 0, escala: [1, 1, 0.9793] },
  { comp: "tubo-guia-ttp", nombre: "Tubo guía izq.", params: { kind: "box", width: 4, height: 214, depth: 4 }, material: "acero-pulido", pos: [-6.3258, 106.9, -44.565], rotq: [0, 0, 0, 1], fija: true, masaKg: 0 },
  { comp: "tubo-guia-ttp", nombre: "Tubo guía der.", params: { kind: "box", width: 4, height: 214, depth: 4 }, material: "acero-pulido", pos: [6.985, 106.9, -44.565], rotq: [0, 0, 0, 1], fija: true, masaKg: 0 },
  { comp: "roldana", nombre: "Polea alta frontal", params: { kind: "cylinder", height: 2.5, radiusTop: 4, radiusBottom: 4 }, material: "nylon", pos: [-0.015, 211, 34.435], rotq: [0, 0, 0.707107, 0.707107], fija: true, masaKg: 0.3 },
  { comp: "roldana", nombre: "Polea alta trasera", params: { kind: "cylinder", height: 2.5, radiusTop: 4, radiusBottom: 4 }, material: "nylon", pos: [-0.015, 211, -10.565], rotq: [0, 0, 0.707107, 0.707107], fija: true, masaKg: 0.3 },
  { comp: "roldana", nombre: "Polea de torre", params: { kind: "cylinder", height: 2.5, radiusTop: 4, radiusBottom: 4 }, material: "nylon", pos: [-0.015, 203, -38.565], rotq: [0, 0, 0.707107, 0.707107], fija: true, masaKg: 0.3 },
  { comp: "roldana", nombre: "Carro: polea sup.", params: { kind: "cylinder", height: 2.5, radiusTop: 4, radiusBottom: 4 }, material: "nylon", pos: [-0.015, 136, -15.565], rotq: [0, 0, 0.707107, 0.707107], fija: false, masaKg: 0.3 },
  { comp: "roldana", nombre: "Carro: polea inf.", params: { kind: "cylinder", height: 2.5, radiusTop: 4, radiusBottom: 4 }, material: "nylon", pos: [-0.015, 123, -15.565], rotq: [0, 0, 0.707107, 0.707107], fija: false, masaKg: 0.3 },
  { comp: "puente-carro-ttp", nombre: "Puente del carro", params: { kind: "box", width: 3.5, height: 20.4, depth: 7.2 }, material: "acero-negro", pos: [-0.015, 129, -15.565], rotq: [0, 0, 0, 1], fija: false, masaKg: 0.2 },
  { comp: "roldana", nombre: "Polea baja", params: { kind: "cylinder", height: 2.5, radiusTop: 4, radiusBottom: 4 }, material: "nylon", pos: [-0.015, 10, -11.565], rotq: [0, 0, 0.707107, 0.707107], fija: true, masaKg: 0.3 },
  { comp: "soporte-polea-ttp", nombre: "Soporte polea baja", params: { kind: "box", width: 19, height: 13.3, depth: 7.2 }, material: "acero-negro", pos: [-0.015, 6.7, -11.465], rotq: [0, 0, 0, 1], fija: true, masaKg: 0 },
  { comp: "placa-polea-ttp", nombre: "Placa polea baja", params: { kind: "box", width: 19, height: 7, depth: 26 }, material: "acero-negro", pos: [-0.015, 3.5, -28.165], rotq: [0, 0, 0, 1], fija: true, masaKg: 0, escala: [1, 1, -1] },
  { comp: "barra-lat-ttp", nombre: "Remo de polea alta", params: { kind: "box", width: 75, height: 7, depth: 2 }, material: "cromo", pos: [-0.135, 210.247, 44.665], rotq: [0, 0, 0, 1], fija: false, masaKg: 4 },
  { comp: "pletina-ttp", nombre: "Pletina TTP", params: { kind: "box", width: 45, height: 5, depth: 7 }, material: "acero-negro", pos: [-0.015, 3.5, -44.665], rotq: [0, 0, 0, 1], fija: true, masaKg: 0 },
  { comp: "bastidor-sup-ttp", nombre: "Bastidor superior TTP", params: { kind: "box", width: 32, height: 15, depth: 92.3 }, material: "acero-negro", pos: [-0.135, 206.85, -1.465], rotq: [0, 1, 0, 0], fija: true, masaKg: 0 },
  { comp: "pila-pesos", nombre: "Bloque de pesos", params: { kind: "box", width: 25, height: 90, depth: 18, holeDiameter: 6, holeSpacing: 13.3 }, material: "hierro-fundido", pos: [0.33, 53.2002, -44.565], rotq: [0, 0, 0, 1], fija: false, masaKg: 102 },
  { comp: "barra-dominadas", nombre: "Barra de jalón bajo", params: { kind: "cylinder", height: 50, radiusTop: 1.6, radiusBottom: 1.6 }, material: "cromo", pos: [3.985, 5, 8.435], rotq: [0, 0, 0.707107, 0.707107], fija: false, masaKg: 2 },
  { comp: "pilar-linea", nombre: "Pilar / travesaño", params: { kind: "beam", width: 5, depth: 7, ends: "plano", holeDiameter: 0, holeSpacing: 5, path: [[0, -29.578074, 0], [0, -14.789037, 0], [-2.527652, -3.453547, 0], [-12.799007, 9.049852, 0], [-31.806238, 11.090995, 0.5]] }, material: "acero-negro", pos: [54.2912, 3, -33.574], rotq: [-0.707107, 0, 0, 0.707107], fija: true, masaKg: 0 },
  { comp: "pilar-linea", nombre: "Pilar / travesaño", params: { kind: "beam", width: 5, depth: 7, ends: "plano", holeDiameter: 0, holeSpacing: 5, path: [[0, -29.578074, 0], [0, -14.789037, 0], [-2.527652, -3.453547, 0], [-12.799007, 9.049852, 0], [-31.806238, 11.090995, 0.5]] }, material: "acero-negro", pos: [-54.2912, 3, -33.5412], rotq: [-0.707107, 0, 0, 0.707107], fija: true, masaKg: 0, escala: [-1, 1, 1] },
  { comp: "pilar-linea", nombre: "Pilar / travesaño", params: { kind: "beam", width: 5, depth: 7, ends: "plano", holeDiameter: 1.6, holeSpacing: 5, path: [[0, -101.478722, 0], [0, -76.109042, 0], [0, -50.739361, 0], [0, -25.369681, 0], [0, 0, 0], [0, 25.369681, 0], [0, 50.739361, 0], [0, 66.468019, 0], [0, 89.107808, 2.446404], [0, 97.925334, 18.53356], [0, 98.934026, 42.309652]] }, material: "acero-negro", pos: [-13.6375, 107.1216, -11.6728], rotq: [0, 0, 0, 1], fija: true, masaKg: 0, escala: [1, 1, -1] },
  { comp: "pilar-linea", nombre: "Pilar / travesaño", params: { kind: "beam", width: 5, depth: 7, ends: "plano", holeDiameter: 1.6, holeSpacing: 5, path: [[0, -101.478722, 0], [0, -76.109042, 0], [0, -50.739361, 0], [0, -25.369681, 0], [0, 0, 0], [0, 25.369681, 0], [0, 50.739361, 0], [0, 66.468019, 0], [0, 89.107808, 2.446404], [0, 97.925334, 18.53356], [0, 98.934026, 42.309652]] }, material: "acero-negro", pos: [13.585, 107.1216, -11.6412], rotq: [0, 0, 0, 1], fija: true, masaKg: 0, escala: [1, 1, -1] },
  { comp: "pilar-linea", nombre: "Pilar / travesaño", params: { kind: "beam", width: 5, depth: 5, ends: "plano", holeDiameter: 0, holeSpacing: 5, path: [[1.615067, -13.583646, 38.568193], [-0.015759, -12.788268, 13.580028], [-0.003509, -11.993307, 3.024], [0, 0, 0], [-0.003321, 11.945412, 2.861656], [-0.015666, 12.79233, 13.499779], [1.615067, 13.638828, 38.568193]] }, material: "acero-negro", pos: [-0.0986, 206.6173, 8.3794], rotq: [0.000821, 0, -0.707106, 0.707107], fija: true, masaKg: 0, escala: [1, 1, -1] },
];

const TORRE_PESOS_UNIONES: UnionSpec[] = [
  { tipo: "bisagra", fija: 13, movil: 17, eje: "z", ancla: [22.485, 3.5, -44.665], min: -90, max: 0, limites: true, bloqueada: true },
  { tipo: "bisagra", fija: 20, movil: 21, eje: "z", ancla: [13.585, 205.047, -30.1748], min: -90, max: 0, limites: true, bloqueada: true },
  { tipo: "bisagra", fija: 19, movil: 21, eje: "z", ancla: [-13.6375, 205.047, -30.2063], min: -90, max: 0, limites: true, bloqueada: true },
];

const TORRE_PESOS_CABLES: CableSpec[] = [
  { nodos: [{ pieza: 15, local: [0, 45, 0] }, { pieza: 5, local: [1.1613, 0, -0.1579] }, { pieza: 6, local: [-1.1612, 0, 0.159] }, { pieza: 4, local: [0.8649, 0, -0.7909] }, { pieza: 3, local: [-1.164, 0, 0.1368] }, { pieza: 12, local: [0, 3.397, 0] }] },
  { nodos: [{ pieza: 16, local: [0, 0, 0] }, { pieza: 9, local: [-0.7371, 0, -0.9112] }, { pieza: 7, local: [1.1711, 0, 0.0456] }, { pieza: 11, local: [0, 0, 0] }] },
];

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
  cuerdas?: CuerdaSpec[];
}

const SPECS: Record<string, MaquinaSpec> = {
  "rack-sentadillas": { label: "Rack de sentadillas", piezas: RACK, uniones: RACK_UNIONES, cuerdas: RACK_CUERDAS },
  "jaula-potencia": { label: "Jaula de potencia", piezas: JAULA },
  "banco-plano": { label: "Banco plano", piezas: BANCO, uniones: BANCO_UNIONES },
  // Las guías del carrier las RECONOCE el motor físico (tubos que atraviesan
  // los manguitos) — no necesitan unión manual.
  "rack-torre": { label: "Rack con torre (TTP)", piezas: RACK_TORRE, cables: RACK_TORRE_CABLES },
  "torre-polea-discos": { label: "Torre polea de discos", piezas: TORRE_DISCOS, uniones: TORRE_DISCOS_UNIONES, cables: TORRE_DISCOS_CABLES },
  "torre-polea-pesos": { label: "Torre polea de pesos", piezas: TORRE_PESOS, uniones: TORRE_PESOS_UNIONES, cables: TORRE_PESOS_CABLES },
  "arbol-discos": { label: "Árbol de discos", piezas: ARBOL },
  // Definición LITERAL revisada contra el motor actual (v0.2.36): sus 41
  // piezas viven en su propio módulo por tamaño.
  uppermachine: {
    label: "UpperMachine",
    piezas: UPPER_MACHINE,
    uniones: UPPER_MACHINE_UNIONES,
    cables: UPPER_MACHINE_CABLES,
  },
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
  if (spec.cuerdas) aplicarCuerdas(editor, ids, spec.cuerdas);
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

/** Tiende las CUERDAS DE SEGURIDAD de una máquina recién armada. */
export function aplicarCuerdas(editor: Editor, ids: string[], cuerdas: CuerdaSpec[]): void {
  for (const c of cuerdas) {
    const aId = ids[c.a.pieza];
    const bId = ids[c.b.pieza];
    if (!aId || !bId) continue;
    editor.createRope(
      c.tipo,
      { objectId: aId, local: new THREE.Vector3(...c.a.local) },
      { objectId: bId, local: new THREE.Vector3(...c.b.local) },
      c.holgura ?? 0.15,
    );
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
    if (u.ejeVec) {
      joint.axisVec = new THREE.Vector3(u.ejeVec[0], u.ejeVec[1], u.ejeVec[2]).normalize();
    }
    if (u.min !== undefined) joint.min = u.min;
    if (u.max !== undefined) joint.max = u.max;
    joint.limitsEnabled = u.limites ?? (u.min !== undefined || u.max !== undefined);
    if (u.bloqueada) joint.locked = true;
    if (u.contactos) joint.contactos = true;
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
      // COPIA PROFUNDA (v0.2.20): el spec de la máquina es un módulo
      // constante — sin clonar, doblar por nodos un pilar insertado mutaba
      // el `path` del propio spec y las siguientes inserciones de la
      // máquina nacían con la pieza ya deformada.
      obj.params = structuredClone({ ...obj.params, ...p.params });
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
    if (p.escala) {
      obj.mesh.scale.set(p.escala[0], p.escala[1], p.escala[2]);
      // VOLTEOS heredados como escala NEGATIVA (prefabs anteriores a
      // v0.2.32): se hornean en la geometría para que los ejes de la pieza
      // vuelvan a concordar con los del mundo (gizmo y arrastre preciso).
      editor.normalizarEspejo(obj);
    }
    ids.push(obj.id);
  }
  return ids;
}
