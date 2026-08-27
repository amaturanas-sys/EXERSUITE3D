import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { SceneManager } from "../scene/SceneManager";
import { getPerf } from "./performance";
import { formatCm } from "./units";
import { SceneObject } from "../objects/SceneObject";
import { CATEGORY_COLORS, getDefinition } from "../objects/componentLibrary";
import { aplicarCables, aplicarUniones, construirMaquina, construirPiezas, STANDARD_MACHINES, type CableSpec, type PiezaSpec, type UnionSpec } from "../objects/standardMachines";
import { claveMaquina } from "./maquinasModelo";
import { prefabsMaquina } from "./prefabsMaquina";
import { tt } from "./i18n";
import { PhysicsWorld, type RopeFisica } from "../physics/PhysicsWorld";
import { Joint, type AxisName, type JointKind } from "../physics/joints";
import { Cable, type CableNode, type TopeCable } from "../physics/cables";
import { Rope, type RopeEnd, type RopeKind } from "../objects/Rope";
import {
  cuerdasColision,
  pathIsCollinear,
  pathIsStraight,
  straightPath,
  tramosCalce,
} from "../objects/linePieces";
import { espejoDe } from "../objects/espejar";
import { largoDeFabrica, puntoTrasEstirar } from "../objects/estirar";
import {
  EJERCICIOS_BARRA,
  EJERCICIO_BARRA_POR_ID,
  apoyoEnElTronco,
  sitioDeLaBarra,
  type AgarreBarra,
  type ApoyosBarra,
  type EjercicioBarra,
  type GanchoBarra,
} from "../objects/barraManiqui";
import {
  dientesQueCaben,
  medidasDentada,
  vueloDentada,
} from "../objects/placaDentada";
import { SnapManager, localSnapPoints } from "./snapping";

/**
 * Únicas piezas sobre las que un cable puede DESLIZARSE (superficies de reenvío):
 * ruedas acanaladas. Un nodo intermedio de un cable debe ser una de estas.
 */
// Superficie de reenvío del cable. Desde v0.2.32 la ROLDANA es la única
// (la polea y el bloque de poleas salieron de la biblioteca por redundantes;
// los ids antiguos siguen aceptándose al abrir proyectos viejos).
const PULLEY_IDS = new Set(["roldana", "polea", "bloque-poleas"]);

/**
 * Cuánto puede recostarse el maniquí para copiar la inclinación de un
 * respaldo (grados). Una prensa de piernas ronda los 50°; el tope existe para
 * que una pieza mal medida no acabe tumbando a la figura del todo.
 */
const RECLINACION_MAX = 60;

/**
 * Cuánto puede correr una pieza empujada por el pie en UN paso de gesto (cm).
 * El tope existe para que un paso no teletransporte la máquina cuando la
 * ecuación de la cadena tiene una raíz lejana.
 */
const CARRERA_MAX_POR_PASO = 25;

/**
 * Cuánto puede girar la cadera SOBRE SU PROPIO EJE cuando la IK resuelve un
 * pie apoyado (grados). Es rotación interna/externa: en un gesto de prensa
 * apenas la hay, y dejarla libre retorcía el muslo.
 */
const GIRO_AXIAL_CADERA = 20;

/**
 * A cuántos grados de su tope se considera que la rodilla está EN BLOQUEO
 * (extensión completa o flexión máxima). Ahí la cadena cerrada es singular:
 * el ángulo cambia mucho con muy poco recorrido de la placa.
 */
const ZONA_DE_BLOQUEO = 15;

/**
 * Cuánto avanza el pedal por pulsación cuando la ecuación de la cadena no
 * puede decidirlo (cm). Es el paso con el que arranca la fase excéntrica desde
 * el bloqueo.
 */
const PASO_MINIMO_PEDAL = 1.5;

/**
 * Direcciones de colocación de la roldana (v0.2.28), en los ejes GLOBALES del
 * proyecto: la elección no depende de desde dónde se esté mirando.
 */
export type DireccionRoldana =
  | "arriba"
  | "abajo"
  | "derecha"
  | "izquierda"
  | "anterior"
  | "posterior";

/**
 * Configuración de la BISAGRA REAL (v0.2.32): eje de giro y tamaño de las
 * placas. "auto" elige el eje global más perpendicular a la línea que une las
 * dos piezas — el que hace de charnela natural entre ellas.
 */
export interface ConfigBisagra {
  eje: "auto" | "x" | "y" | "z";
  /**
   * JUNTAR LAS PIEZAS (v0.3.8), solo con montaje por caras: la segunda pieza
   * se arrima hasta dejar su canto a la holgura del pasador, de modo que el
   * pivote queda adyacente a las dos placas —como el lomo de un libro— en vez
   * de con las palas estiradas sobre un hueco. Ausente = sí.
   */
  juntar?: boolean;
  /** Largo de cada placa desde el pasador (cm). */
  tamano: number;
  /** Recorrido limitado de la bisagra (grados); ausente = giro libre. */
  limite?: [number, number];
  /**
   * CARA DE MONTAJE (v0.2.33): en cuál de las dos caras enfrentadas al eje se
   * atornilla el herraje, en direcciones GLOBALES. Es lo que decide hacia
   * dónde puede plegar: montada arriba, las piezas topan entre sí enseguida;
   * montada abajo, la bisagra flexiona. "auto" = la cara superior/visible.
   */
  cara?: "auto" | DireccionRoldana;
}

/**
 * MONTAJE POR CARAS de la bisagra (v0.3.8): el punto y la cara elegidos con el
 * puntero sobre cada una de las dos piezas. Es lo que la herramienta pedía a
 * gritos — la placa de una bisagra real se atornilla SOBRE una cara concreta,
 * en un sitio concreto—, y de paso deja determinado el eje del pivote: es la
 * arista donde se encuentran los planos de las dos palas.
 */
/**
 * Parte de lo ocurrido al SOLDAR una selección (v0.3.9): cuántas uniones
 * rígidas se crearon, sobre cuántas piezas, cuáles quedaron sueltas por no
 * tocar a ninguna otra, y si el conjunto quedará anclado al simular.
 */
export interface ReporteSoldadura {
  soldaduras: number;
  piezas: number;
  /** Nombres de las piezas que no tocan a ninguna otra del conjunto. */
  sueltas: string[];
  grupo: string | null;
  /** Hay al menos una pieza FIJA: la física anclará el conjunto entero. */
  anclado: boolean;
  aviso: string | null;
}

/**
 * CAJA ORIENTADA (cm): centro en mundo, ejes en mundo y semilados. Es la
 * representación honesta del volumen de una pieza —o de UN TRAMO suyo—, a
 * diferencia de la AABB del mundo, que se hincha cuando la pieza está girada.
 */
interface CajaOr {
  c: THREE.Vector3;
  u: [THREE.Vector3, THREE.Vector3, THREE.Vector3];
  e: [number, number, number];
}

/**
 * HUECO MÍNIMO entre dos cajas orientadas por el teorema de los ejes
 * separadores: el MAYOR de los huecos sobre los 15 ejes de prueba. Positivo =
 * están separadas al menos eso; negativo o cero = se solapan.
 */
function huecoEntreCajas(A: CajaOr, B: CajaOr): number {
  const d = B.c.clone().sub(A.c);
  const radio = (caj: CajaOr, L: THREE.Vector3): number =>
    caj.e[0] * Math.abs(caj.u[0].dot(L)) +
    caj.e[1] * Math.abs(caj.u[1].dot(L)) +
    caj.e[2] * Math.abs(caj.u[2].dot(L));
  const ejes: THREE.Vector3[] = [...A.u, ...B.u];
  for (const ua of A.u) {
    for (const ub of B.u) {
      const cruz = new THREE.Vector3().crossVectors(ua, ub);
      if (cruz.lengthSq() > 1e-6) ejes.push(cruz.normalize());
    }
  }
  let peor = -Infinity;
  for (const L of ejes) peor = Math.max(peor, Math.abs(d.dot(L)) - radio(A, L) - radio(B, L));
  return peor;
}

export interface MontajeBisagra {
  a: { punto: THREE.Vector3; normal: THREE.Vector3 };
  b: { punto: THREE.Vector3; normal: THREE.Vector3 };
}

const DIRECCIONES_ROLDANA: Record<DireccionRoldana, THREE.Vector3> = {
  arriba: new THREE.Vector3(0, 1, 0),
  abajo: new THREE.Vector3(0, -1, 0),
  derecha: new THREE.Vector3(1, 0, 0),
  izquierda: new THREE.Vector3(-1, 0, 0),
  anterior: new THREE.Vector3(0, 0, 1),
  posterior: new THREE.Vector3(0, 0, -1),
};
import {
  DEFAULT_HUMAN_HEIGHT,
  JOINT_DOF,
  buildHumanFigure,
  disposeHumanFigure,
} from "../objects/humanFigure";
import {
  getPose,
  poseNames,
  removePose,
  resetDefaultPoses,
  setPose,
  type PoseDef,
} from "../objects/poseLibrary";
import {
  PLANES,
  ZONAS,
  ZONA_POR_ID,
  articulacionesDePlan,
  articulacionesDeZona,
  ladosDe,
  nombresDeFamilia,
  type AcomodacionMov,
  type FaseMov,
  type LadoZona,
  type PlanMov,
  type SentidoMov,
  type UmbralFase,
  type ZonaId,
} from "../objects/movimientos";
import { degToRad, radToDeg, roundTo } from "../core/units";
import { solveTwoBoneIK } from "./armIK";
import { PROJECT_VERSION, type ProjectData, type WorkspaceData } from "./project";
import type { CanalTubo, ComponentCategory, PrimitiveParams, VentanaRect } from "../objects/types";
import { componentModels } from "./componentModels";
import { figureSegments } from "./figureSegments";
import { loadModelRoot, mergeRootGeometry } from "./modelLoading";
import { EventBus } from "./eventBus";

type HandSide = "L" | "R";

export type HumanMode = "mannequin" | "skeleton";

export type TransformMode = "translate" | "rotate" | "scale";

/**
 * Un POSTE (o el TRAMO de una viga doblada) con grilla de agujeros que puede
 * hospedar un calce, ya medido respecto de la pieza que se quiere calzar.
 * Vive fuera de la clase desde v0.3.7 porque lo usan dos caminos: el que
 * mueve la pieza de agujero en agujero y el que solo INFORMA de dónde está.
 */
  interface CandidatoPoste {
    poste: SceneObject;
    /** Origen de la grilla en MUNDO: centro del poste o del TRAMO. */
    origen: THREE.Vector3;
    eje: THREE.Vector3;
    paso: number;
    fase: number;
    lim: number;
    /** Eje de los pinholes en MUNDO (null si el poste no lo define). */
    ejePin: THREE.Vector3 | null;
    lateral: number;
    cerca: boolean;
  }

export type EditorEvents = {
  objectsChanged: { objects: SceneObject[] };
  selectionChanged: { selected: SceneObject | null };
  /** Cambio de transform/dimensiones del objeto seleccionado (para refrescar panel). */
  objectTransformed: { object: SceneObject };
  modeChanged: { mode: TransformMode };
  /** Estado de la simulacion fisica. */
  simulationChanged: { running: boolean };
  /** Cambio en la lista de articulaciones. */
  jointsChanged: { joints: Joint[] };
  /** Modo "conectar dos piezas" activo/inactivo. */
  connectModeChanged: { kind: JointKind | null; pending: boolean };
  /** Cambio en la lista de cables. */
  cablesChanged: { cables: Cable[] };
  /** Modo "trazar cable" activo: nº de nodos colocados + pista de acción. */
  cableModeChanged: { active: boolean; count: number; hint?: string };
  frenoModeChanged: { active: boolean };
  /** Modo "colocar cuerda" (cadena/correa) activo: nº de extremos fijados. */
  ropeModeChanged: { active: boolean; kind: RopeKind | null; count: number };
  /** Modo "colocar roldana" (interna/externa) sobre la cara de una pieza. */
  roldanaModeChanged: { active: boolean };
  /** Modo "colocar placa dentada": cara del pilar + dos puntos de trayectoria. */
  dentadaModeChanged: { active: boolean };
  /** Modo "trazar pieza de línea" (pilar/travesaño/tubo): nº de puntos fijados. */
  lineModeChanged: { active: boolean; kind: "beam" | "tube" | "guia" | null; count: number };
  /** Modo "doblado por nodos" (bending) activo/inactivo. */
  bendModeChanged: { active: boolean };
  /** Guías tubulares en modo "administrar vinculación" (ids). */
  vinculacionChanged: { guias: string[] };
  /** Cuerda seleccionada (para editar tensión) o null. */
  ropeSelectionChanged: { id: string; name: string; slack: number } | null;
  /** Snapping de ensamblaje activado/desactivado. */
  snapChanged: { enabled: boolean };
  /** Cambio en la lista de posturas (anadir/editar/eliminar). */
  posesChanged: { names: string[] };
  /** Modo "apoyar mano en agarre" (IK): etapa actual. */
  attachModeChanged: { active: boolean; stage: "hand" | "grip" | null };
  /** Cambio en la multiseleccion (para agrupar) o en los grupos. */
  groupingChanged: { multi: number; groupSelected: boolean };
  /** Grupo seleccionado (para editar nombre/duplicar). */
  groupSelectionChanged: { id: string | null; name: string };
  /** Articulacion del personaje seleccionada (para editar angulos). */
  jointSelectionChanged: {
    name: string | null;
    angles: [number, number, number];
    locked: boolean;
  };
  /**
   * Cerrar el diálogo del costado derecho (roldana/bisagra), lo escuche quien
   * lo escuche. El núcleo no sabe de paneles: avisa y la interfaz obedece.
   */
  dialogosCerrar: Record<string, never>;
  /** El maniquí cambió de rumbo (hacia dónde mira), en grados. */
  figuraRumboChanged: { grados: number };
  /** El maniquí cogió, cambió o soltó su barra (v0.2.81). */
  barraManiquiChanged: {
    objectId: string | null;
    ejercicio: string | null;
    rackeada: boolean;
  };
  /** Estado de la figura humana de referencia. */
  humanFigureChanged: {
    present: boolean;
    heightCm: number;
    mode: HumanMode;
    loading: boolean;
  };
  /** El proyecto se acaba de autoguardar en el navegador. */
  autosaved: { at: number };
  /** Cambió el conjunto de componentes con modelo 3D personalizado. */
  componentModelsChanged: { ids: string[] };
  /** Historial de deshacer/rehacer: disponibilidad actual. */
  historyChanged: { canUndo: boolean; canRedo: boolean };
  /** Herramienta de selección de área (marquee) activada/desactivada. */
  areaSelectChanged: { on: boolean };
  /** Herramienta de arrastre directo activada/desactivada. */
  dragToolChanged: { on: boolean };
  /** Eje de trabajo bloqueado (1=X, 2=Y, 3=Z; 0/Esc libera) o null. */
  axisLockChanged: { axis: "x" | "y" | "z" | null };
  /** Contador de desplazamiento en vivo durante un arrastre/trazado (cm/°). */
  dragMeasure: { text: string | null };
  /** Cambió el espacio de trabajo (asistente de Nuevo, v0.2.0). */
  workspaceChanged: { workspace: WorkspaceData | null };
  /** Nº de piezas fuera de los límites del canvas completo (marcadas en rojo). */
  workspaceBounds: { fuera: number };
  /** Herramienta "agarrar maniquí" activada/desactivada. */
  grabFigureChanged: { on: boolean };
  /** Modos de vista del Builder: color, aristas (menú Ver, v0.2.0). */
  viewModesChanged: { color: ColorMode; edges: boolean };
  /** Herramienta del puntero durante la SIMULACIÓN (mano u órbita). */
  simToolChanged: { tool: "mano" | "orbitar" };
  /** Cambió el conjunto de articulaciones bloqueadas del maniquí. */
  jointLocksChanged: { locks: string[] };
  /** Se fijó (o restauró) la POSTURA DE PARTIDA del maniquí (v0.2.49). */
  poseDePartidaChanged: { name: string | null };
  /** Puntos de partida guardados y cuál se acaba de tocar (v0.2.56). */
  partidasChanged: { nombres: string[]; activa: string | null };
  /** Posado manual de la MÁQUINA activo/inactivo (v0.2.55). */
  poseMaquinaChanged: { active: boolean };
  /** Modo COLOCAR MANIQUÍ activo/inactivo. */
  colocarFiguraChanged: { active: boolean };
  /** Herramienta rápida activa (barra de atajos, v0.2.13). */
  herramientaChanged: { tool: HerramientaRapida };
  /** El gizmo colectivo (grupo/multiselección) cambió de pose. */
  grupoTransformado: { fuente: "gizmo" | "numerico" };
};

/** Herramientas rápidas de la barra de atajos (v0.2.13). */
export type HerramientaRapida =
  | "seleccion"
  | "area"
  | "mover"
  | "rotar"
  | "escalar"
  | "orbitar";

/** Modo de color del visor: materiales reales, por categoría o neutro. */
export type ColorMode = "material" | "categoria" | "neutro";

/**
 * PUNTO DE PARTIDA GUARDADO (v0.2.56): una configuración ergonómica entera —
 * dónde quedó la máquina y cómo estaba colocada la figura.
 */
interface PuntoDePartida {
  piezas: Map<string, { p: THREE.Vector3; q: THREE.Quaternion }> | null;
  pose: Record<string, [number, number, number]> | null;
  poseNombre: string | null;
  pos: THREE.Vector3 | null;
  quat: THREE.Quaternion | null;
}

interface SavedTransform {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  scale: THREE.Vector3;
}

/**
 * Le devuelve a una pieza su condición de máquina estándar SUSTITUIDA.
 *
 * Una máquina de la biblioteca que el usuario reemplazó por su propio modelo se
 * guarda como un `prim-box` con `modeloMaquina` puesto y la geometría del
 * modelo aplicada encima. Al duplicar o pegar sólo se copiaban los `params`, y
 * la copia salía como lo que hay debajo: una caja gris. Cargar el proyecto ya
 * lo hacía bien; esto es lo mismo, en un sitio al que puedan llamar los tres.
 */
function aplicarModeloMaquina(obj: SceneObject, clave: string | null | undefined): void {
  if (!clave) return;
  obj.modeloMaquina = clave;
  const g = componentModels.geometryClone(clave);
  if (g) obj.applyCustomGeometry(g);
}

/**
 * Nucleo del editor: posee la escena, los controles de camara, el gizmo de
 * transformacion, la coleccion de objetos y el estado de seleccion.
 */
export class Editor {
  readonly bus = new EventBus<EditorEvents>();
  readonly sceneManager: SceneManager;
  readonly orbit: OrbitControls;
  readonly gizmo: TransformControls;

  private objects = new Map<string, SceneObject>();
  private selected: SceneObject | null = null;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private running = false;

  private physics: PhysicsWorld | null = null;
  private simulating = false;
  private saved = new Map<string, SavedTransform>();

  private joints = new Map<string, Joint>();
  private jointHelpers = new THREE.Group();
  private connectMode: JointKind | null = null;
  private pendingA: SceneObject | null = null;

  private cables = new Map<string, Cable>();
  private cableVisuals = new THREE.Group();
  private cableMode = false;
  /** Herramienta de FRENO DE CABLE activa (colocar/quitar esferas de tope). */
  private frenoMode = false;
  /** Herramienta de COLOCAR MANIQUÍ activa (v0.2.41). */
  private colocarFiguraMode = false;
  /** Marca del punto de apoyo bajo el puntero mientras se coloca la figura. */
  private marcaApoyo: THREE.Mesh | null = null;
  /** Esferas de los frenos, por `cableId#indice`. */
  private frenoVisuals = new Map<string, THREE.Mesh>();
  private cablePending: { object: SceneObject; local: THREE.Vector3 }[] = [];

  // Cuerdas (cadenas/correas de seguridad): elementos de línea con catenaria.
  private ropes = new Map<string, Rope>();
  private ropeVisuals = new THREE.Group();
  private ropeMode: RopeKind | null = null;
  private ropePendingA: RopeEnd | null = null;
  private selectedRopeId: string | null = null;

  /**
   * Colocación de roldanas (diagrama Cables y Poleas): los puntos de
   * deslizamiento del cable se definen ANTES de trazarlo, tocando la cara de
   * una pieza. Config interna = embutida en el pilar/travesaño (la rueda
   * asoma por la apertura); externa = montada fuera de la cara.
   */
  private roldanaMode = false;
  /** Panel de configuración de la roldana abierto (se puede orbitar detrás). */
  private roldanaPidiendo = false;
  /** Estructura elegida para alojar la roldana (fase 2 de la herramienta). */
  private roldanaHost: SceneObject | null = null;
  /** Línea azul del eje mayor de la estructura elegida. */
  private roldanaAxisLine: THREE.Line | null = null;
  /**
   * Colocación de PLACAS DENTADAS (v0.2.73), en tres toques: la cara del
   * pilar —que además dice por qué canto salen los ganchos— y los dos puntos
   * de la trayectoria que marcan principio y fin de la plancha.
   */
  private dentadaMode = false;
  private dentadaHost: SceneObject | null = null;
  /** La cara elegida, resuelta en ejes de MUNDO. */
  private dentadaCara: {
    /** Trayectoria del pilar, orientada cuesta arriba. */
    eje: THREE.Vector3;
    /** Normal de la cara, saliendo del pilar. */
    normal: THREE.Vector3;
    /** Canto por el que vuelan los ganchos. */
    ganchos: THREE.Vector3;
    /** Ancho de la cara: lo que copia la espina de la placa. */
    anchoCara: number;
    /** Media anchura del pilar en la dirección de la normal. */
    saliente: number;
    /** Semilargo de la trayectoria. */
    half: number;
    centro: THREE.Vector3;
  } | null = null;
  /** Primer punto trazado (el principio de la placa). */
  private dentadaA: THREE.Vector3 | null = null;
  /** Intervalo entre ganchos elegido en el diálogo de la herramienta (cm). */
  private dentadaPaso: number | undefined;
  /** Línea guía y marca del primer punto. */
  private dentadaGuia: THREE.Object3D[] = [];
  /**
   * Diálogo de configuración de la roldana (lo inyecta la UI): tipo
   * interna/externa + dirección en ejes GLOBALES (arriba/abajo/derecha/
   * izquierda/anterior/posterior). Si no hay diálogo, externa hacia arriba.
   */
  elegirRoldana:
    | (() => Promise<{ tipo: "interna" | "externa"; dir: DireccionRoldana } | null>)
    | null = null;
  /**
   * Diálogo de la BISAGRA REAL (v0.2.32, lo inyecta la UI): eje de giro en los
   * ejes globales (o automático) y tamaño de las placas. Si no hay diálogo, se
   * instala con el eje automático y placas medianas.
   */
  elegirBisagra: ((porCaras: boolean) => Promise<ConfigBisagra | null>) | null = null;
  /**
   * Ventana de ARTICULACIONES del maniquí (v0.2.41): la monta la UI y el
   * editor solo la conoce para poder abrirla desde la barra de simulación.
   */
  panelArticulaciones: { alternar(): boolean; visible(): boolean } | null = null;
  /** Panel de la bisagra abierto (los clics del visor no arman otra). */
  private bisagraPidiendo = false;
  /**
   * PRIMERA CARA de la bisagra (v0.3.8): la pieza, el punto y la cara que se
   * marcaron con el primer clic. La herramienta ya no se conforma con señalar
   * dos piezas — pide dónde va cada placa, como la de roldanas.
   */
  private bisagraA: {
    obj: SceneObject;
    punto: THREE.Vector3;
    normal: THREE.Vector3;
  } | null = null;
  /** Marca visible del punto y la cara elegidos con el primer clic. */
  private bisagraMarca: THREE.Object3D | null = null;
  /** Modo "colocar terminal de cable" (ojal de anclaje sobre una cara). */
  private terminalMode = false;

  // Piezas de línea (pilar/travesaño/tubo): trazado por dos puntos + bending.
  private lineMode: "beam" | "tube" | "guia" | null = null;
  /** Dónde se pulsó con la herramienta de línea, para distinguir clic de arrastre. */
  private lineDown: { x: number; y: number } | null = null;
  private lineParams: PrimitiveParams | null = null;
  private linePendingA: THREE.Vector3 | null = null;
  /**
   * Pieza sobre la que se fijó el punto de INICIO de la guía tubular, con el
   * punto en sus coordenadas locales: es el primero de los dos anclajes.
   */
  private lineAnclaA: { obj: string; local: [number, number, number] } | null = null;
  private bendTarget: SceneObject | null = null;
  private bendHandles: THREE.Group | null = null;
  private bendDrag: { index: number; plane: THREE.Plane; origin: THREE.Vector3 } | null = null;
  /** Soldadura pendiente mientras el nodo arrastrado está imantado a otra figura. */
  private bendWeld: { objetoId: string; punto: THREE.Vector3 } | null = null;
  /** Nodo ACTIVO del modo Doblar (el último tocado): lo mueven los cursores del Arrastre preciso. */
  private bendNodeIndex: number | null = null;

  private snap: SnapManager;
  // Línea elástica de previsualización al colocar cable/cuerda (línea recta).
  private placementLine: THREE.Line | null = null;

  // Agrupacion de piezas en subensamblajes.
  private multiSel = new Set<string>();
  private groups = new Map<string, { name: string; ids: string[] }>();
  private objGroup = new Map<string, string>();
  private selectedGroupId: string | null = null;
  private selectedJointName: string | null = null;
  private groupProxy = new THREE.Object3D();
  /**
   * Pivote del gizmo del MANIQUÍ, puesto en su cadera (v0.3.13).
   *
   * El grupo de la figura tiene su origen donde le toca al rig, que no es
   * donde está el cuerpo: con la figura sentada a 50 cm, ese origen queda 30 cm
   * BAJO el suelo, y el gizmo aparecía flotando lejos del maniquí —a veces
   * fuera de la pantalla—, así que colocarlo obligaba a alejar la cámara. La
   * cadera es el punto de equilibrio de una persona, y es donde debe estar.
   */
  private figuraProxy = new THREE.Object3D();
  private figuraPrev = new THREE.Matrix4();
  private groupPrev = new THREE.Matrix4();
  // ---- Selección de área (marquee), portapapeles e historial (v0.1.8)
  private areaSelect = false;
  /** Herramienta rápida activa (barra de atajos, v0.2.13). */
  private herramienta: HerramientaRapida = "mover";
  private marquee: { x0: number; y0: number; x1: number; y1: number; additive: boolean } | null =
    null;
  private marqueeEl: HTMLDivElement | null = null;
  private clipboard: {
    data: ProjectData["objects"][number];
    category: ComponentCategory;
    importedGeometry: THREE.BufferGeometry | null;
  }[] = [];
  private history: string[] = [];
  private hIndex = -1;
  /** Eje de trabajo bloqueado (teclas 1/2/3): restringe TODO el trazado. */
  private axisLock: "x" | "y" | "z" | null = null;
  /** Herramienta de arrastre directo de piezas. */
  private dragTool = false;
  private dragMove: {
    ids: string[];
    grabbed: THREE.Vector3;
    plane: THREE.Plane;
    starts: Map<string, THREE.Vector3>;
  } | null = null;
  private gizmoDragStart: { pos: THREE.Vector3; quat: THREE.Quaternion } | null = null;
  // ---- Espacio de trabajo (asistente de Nuevo, v0.2.0)
  /** Configuración del espacio de trabajo del proyecto (o null = libre). */
  private workspace: WorkspaceData | null = null;
  /** Visual no serializable del área de suelo operable (canvas completo). */
  private workspaceVisual: THREE.Group | null = null;
  /** Piezas actualmente fuera de los límites del espacio (tinte rojo). */
  private fueraIds = new Set<string>();
  /** Transformaciones previas al arrastre para cancelar colocaciones fuera. */
  private boundsRestore: Map<string, SavedTransform> | null = null;
  // ---- Modos de vista del Builder (menú Ver, v0.2.0)
  private colorMode: ColorMode = "material";
  private edgesOn = false;
  private viewModesTimer: ReturnType<typeof setTimeout> | null = null;
  private historyTimer: ReturnType<typeof setTimeout> | null = null;
  private applyingHistory = false;
  private nextGroupId = 1;

  private references = new THREE.Group();
  private humanFigure: THREE.Group | null = null;
  private humanHeight = DEFAULT_HUMAN_HEIGHT;
  private humanMode: HumanMode = "mannequin";
  private humanToken = 0;
  private selectedFigure = false;

  /** Manos apoyadas en agarres (IK): lado -> objeto + punto local. */
  private handTargets = new Map<HandSide, { objectId: string; local: THREE.Vector3 }>();
  /**
   * BARRA EN MANOS (v0.2.81): la pieza que el maniquí lleva puesta y en qué
   * configuración. `null` = no lleva ninguna. Mientras esté puesta, la barra
   * NO se posa a mano: su sitio lo dicta el cuerpo en cada frame.
   */
  private barraManiqui:
    | { objectId: string; ejercicio: string; rackeada: boolean }
    | null = null;
  /**
   * Punto de apoyo de la barra sobre el TRONCO, en coordenadas locales de esa
   * malla. Se calcula con rayos una sola vez —el contacto es propiedad de la
   * geometría, no de la postura— y cada fotograma solo se transforma.
   */
  private apoyoBarraLocal: { agarre: string; local: THREE.Vector3 } | null = null;
  private attachMode = false;
  private attachSide: HandSide | null = null;
  /** Qué se está apoyando: la mano (hombro/codo) o el pie (cadera/rodilla). */
  private attachTipo: "mano" | "pie" = "mano";

  // ---- Ergonomía del maniquí (esquema v0.2.0)
  /** Articulaciones bloqueadas con el candado: no se posan hasta liberarlas. */
  private jointLocks = new Set<string>();
  /** Simetría de pose: los cambios de un lado se replican espejados al otro. */
  private poseSymmetry = false;
  /** Herramienta "agarrar maniquí": llevar un segmento con el puntero. */
  private grabFigureTool = false;
  private grabDrag: {
    /** Articulación que rota ("" = mover la figura entera). */
    joint: string;
    /** Punto agarrado en coords locales de la articulación (u offset raíz). */
    grabLocal: THREE.Vector3;
    origin: THREE.Vector3;
    plane: THREE.Plane;
  } | null = null;

  // Cambios sin guardar (para sugerir guardar al volver a la Home).
  private dirty = false;
  // Bajas de las suscripciones a los repertorios (modelos y segmentos).
  private unsubModels: (() => void) | null = null;
  private unsubSegments: (() => void) | null = null;

  // Autoguardado en el navegador (localStorage).
  private static readonly AUTOSAVE_KEY = "exersuite.autosave.v1";
  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;
  private autosaveInterval: ReturnType<typeof setInterval> | null = null;
  private autosaveSuspended = false;

  constructor(private canvas: HTMLCanvasElement) {
    this.sceneManager = new SceneManager(canvas);

    this.orbit = new OrbitControls(this.sceneManager.camera, canvas);
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.08;
    this.orbit.screenSpacePanning = false;
    this.orbit.maxPolarAngle = Math.PI * 0.495; // no bajar de la horizontal
    this.orbit.target.set(0, 80, 0);

    this.gizmo = new TransformControls(this.sceneManager.camera, canvas);
    this.gizmo.setSpace("local");
    // El gizmo desactiva el orbit mientras se arrastra.
    this.gizmo.addEventListener("dragging-changed", (e) => {
      this.orbit.enabled = !e.value && !this.orbitaBloqueada;
      if (e.value && this.gizmo.object) {
        this.gizmoDragStart = {
          pos: this.gizmo.object.position.clone(),
          quat: this.gizmo.object.quaternion.clone(),
        };
        this.captureBoundsRestore();
      } else {
        this.gizmoDragStart = null;
        this.bus.emit("dragMeasure", { text: null });
        this.enforceWorkspaceBounds();
        // AL SOLTAR, LA PIEZA SE ENHEBRA (v0.3.3): si quedó atravesada por
        // guías tubulares, se le abren ahí sus canales. Es lo que pidió el
        // diseñador —«mediante un posicionamiento manual (Gizmo); cuando se
        // define su posición, se produce un canal tubular en el sitio donde
        // discurre cada guía»—, y también lo que los quita al retirarla.
        this.enhebrarSeleccion();
      }
      if (!e.value) this.snap.hideIndicator();
    });
    this.gizmo.addEventListener("objectChange", () => {
      // Cualquier arrastre del gizmo (pieza, grupo o articulación del maniquí)
      // ensucia el proyecto y debe autoguardarse.
      this.scheduleAutosave();
      // Contador de desplazamiento en vivo (cm al mover, grados al rotar).
      if (this.gizmo.dragging && this.gizmoDragStart && this.gizmo.object) {
        const mode = this.gizmo.getMode();
        if (mode === "rotate") {
          const dq = this.gizmo.object.quaternion
            .clone()
            .multiply(this.gizmoDragStart.quat.clone().invert());
          const ang = THREE.MathUtils.radToDeg(2 * Math.acos(Math.min(1, Math.abs(dq.w))));
          this.bus.emit("dragMeasure", { text: `${tt("Giro", "Turn")}: ${ang.toFixed(1)}°` });
        } else if (mode === "translate") {
          this.emitDragMeasure(
            this.gizmo.object.position.clone().sub(this.gizmoDragStart.pos),
          );
        }
      }
      if (this.selectedGroupId) {
        this.applyGroupDelta();
        return;
      }
      if (this.multiSel.size > 0 && this.gizmo.object === this.groupProxy) {
        this.applyMultiDelta();
        return;
      }
      // Moviendo la figura entera: el gizmo vive en la cadera y lo que se
      // arrastra es un pivote, así que el delta se traslada al grupo.
      if (this.selectedFigure && !this.selectedJointName
        && this.gizmo.object === this.figuraProxy) {
        this.aplicarDeltaDeLaFigura();
        return;
      }
      // Posando el maniquí: al arrastrar el eje articular gira el segmento en
      // torno a la articulación, limitado a su eje/rango natural.
      if (this.selectedFigure && this.selectedJointName) {
        this.clampSelectedJoint();
        this.emitJointSelection();
        return;
      }
      if (!this.selected) return;
      this.applySnap();
      this.bus.emit("objectTransformed", { object: this.selected });
    });
    // En three r0.169 el helper del gizmo se anade por separado.
    const helper = (this.gizmo as unknown as { getHelper?: () => THREE.Object3D })
      .getHelper?.();
    this.sceneManager.scene.add(helper ?? (this.gizmo as unknown as THREE.Object3D));

    this.snap = new SnapManager(this.sceneManager.scene);
    this.sceneManager.scene.add(this.jointHelpers);
    this.sceneManager.scene.add(this.references);
    this.sceneManager.scene.add(this.cableVisuals);
    this.sceneManager.scene.add(this.ropeVisuals);
    this.sceneManager.scene.add(this.groupProxy);
    this.sceneManager.scene.add(this.figuraProxy);

    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("resize", this.onResize);
    window.addEventListener("keydown", this.onKeyDown);

    // Reaplica los modelos del repertorio a las piezas si cambian.
    this.unsubModels = componentModels.onChanged(() => this.onComponentModelsChanged());
    // Reconstruye el maniquí si cambian los modelos de sus segmentos.
    this.unsubSegments = figureSegments.onChanged(() => {
      if (this.humanFigure && this.humanMode === "mannequin") void this.addHumanFigure(this.humanHeight);
    });
    // Al mover una pieza, actualiza las cuerdas ancladas a ella.
    this.bus.on("objectTransformed", ({ object }) => this.actualizarAtadosDeObjeto(object.id));
    // Los visuales de cable solo se reconstruyen cuando algo cambió (no por frame).
    const markCables = () => {
      this.cablesDirty = true;
    };
    this.bus.on("objectTransformed", markCables);
    this.bus.on("objectsChanged", markCables);
    this.bus.on("cablesChanged", markCables);

    this.setupAutosave();
  }

  /** Reaplica la geometría del repertorio a las instancias afectadas. */
  private onComponentModelsChanged(): void {
    for (const o of this.objects.values()) {
      // Las piezas de entorno (ws-techo) tienen geometría propia del workspace.
      if (o.componentId.startsWith("ws-")) continue;
      // Máquinas estándar sustituidas: su geometría viene de su propia clave.
      if (o.modeloMaquina) {
        const g = componentModels.geometryClone(o.modeloMaquina);
        if (g) o.applyCustomGeometry(g);
        continue;
      }
      const geo = componentModels.geometryClone(o.componentId);
      if (geo) o.applyCustomGeometry(geo);
      else if (o.customModel) o.revertToPrimitive();
    }
    this.clearRopeTemplates(); // los segmentos de eslabón/Kevlar pueden haber cambiado
    this.rebuildAllRopes();
    this.bus.emit("objectsChanged", { objects: this.listObjects() });
  }

  // --------------------------------------------------------- autoguardado
  /** Suscribe el autoguardado a los eventos de cambio del proyecto. */
  private setupAutosave(): void {
    const trigger = () => {
      this.dirty = true;
      this.scheduleAutosave();
    };
    this.bus.on("objectsChanged", trigger);
    this.bus.on("objectTransformed", trigger);
    this.bus.on("jointsChanged", trigger);
    this.bus.on("cablesChanged", trigger);
    this.bus.on("groupingChanged", trigger);
    this.bus.on("humanFigureChanged", trigger);
    // Si la figura se crea, se cambia de altura o se retira CON la simulación
    // en marcha (colocar maniquí funciona en simulación), su cuerpo en el
    // motor se rehace: si no, quedarían chocando los segmentos de la figura
    // anterior contra la máquina.
    this.bus.on("humanFigureChanged", () => {
      if (!this.physics) return;
      if (this.humanFigure && this.humanMode === "mannequin") {
        this.physics.añadirFigura(this.humanFigure);
      } else {
        this.physics.quitarFigura();
      }
    });
    // Red de seguridad: vuelca a disco periódicamente por si algún cambio
    // (material, ángulo numérico de articulación…) no emitió evento.
    this.autosaveInterval = setInterval(() => this.writeAutosave(), 30_000);
    window.addEventListener("beforeunload", this.onBeforeUnload);
  }

  private onBeforeUnload = (): void => {
    this.flushAutosave();
  };

  /** ¿Hay cambios sin guardar a un archivo? */
  isDirty(): boolean {
    return this.dirty;
  }

  /** Marca el proyecto como guardado (sin cambios pendientes). */
  markClean(): void {
    this.dirty = false;
  }

  /** Programa un autoguardado diferido (debounce) tras el último cambio. */
  private scheduleAutosave(): void {
    if (this.autosaveSuspended || this.simulating) return;
    // Revalida los límites del espacio de trabajo con cada cambio de escena.
    this.checkWorkspaceBounds();
    // Y reaplica los modos de vista (color/aristas) si están activos.
    this.scheduleViewModes();
    // Todo cambio que autoguarda es también un cambio sin guardar a archivo
    // (posar el maniquí, tensar cuerdas, mover grupos… no emiten evento).
    this.dirty = true;
    this.historyPush();
    if (this.autosaveTimer !== null) clearTimeout(this.autosaveTimer);
    this.autosaveTimer = setTimeout(() => {
      this.autosaveTimer = null;
      this.writeAutosave();
    }, 800);
  }

  /** Serializa la escena y la guarda en localStorage. */
  private writeAutosave(): void {
    if (this.autosaveSuspended || this.simulating) return;
    // Una escena vacía (recién creada o tras "Explorar biblioteca") no debe
    // sobrescribir una sesión anterior: solo se autoguarda cuando hay contenido.
    if (this.objects.size === 0 && this.humanFigure === null) return;
    try {
      localStorage.setItem(Editor.AUTOSAVE_KEY, JSON.stringify(this.serialize()));
      this.bus.emit("autosaved", { at: Date.now() });
    } catch (err) {
      console.warn("No se pudo autoguardar:", err);
    }
  }

  /** Fuerza un guardado inmediato (p. ej. antes de cerrar la pestaña). */
  flushAutosave(): void {
    if (this.autosaveTimer !== null) {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = null;
    }
    this.writeAutosave();
  }

  /** ¿Hay una sesión autoguardada en este navegador? */
  hasAutosave(): boolean {
    try {
      return !!localStorage.getItem(Editor.AUTOSAVE_KEY);
    } catch {
      return false;
    }
  }

  /** Descarta el autoguardado almacenado. */
  clearAutosave(): void {
    try {
      localStorage.removeItem(Editor.AUTOSAVE_KEY);
    } catch {
      /* almacenamiento no disponible */
    }
  }

  /** Restaura la última sesión autoguardada. Devuelve true si cargó algo. */
  async restoreAutosave(): Promise<boolean> {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(Editor.AUTOSAVE_KEY);
    } catch {
      return false;
    }
    if (!raw) return false;
    try {
      await this.loadProject(JSON.parse(raw) as ProjectData);
      return true;
    } catch (err) {
      console.warn("Autoguardado corrupto, se ignora:", err);
      return false;
    }
  }

  // ----------------------------------------------------------------- ciclo
  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastFrameTime = performance.now();
    this.installRenderOnDemand();
    if (this.history.length === 0) this.resetHistory();
    this.loop();
  }

  private lastFrameTime = 0;
  private simFrame = 0;
  /** Los visuales de cable solo se reconstruyen cuando algo se ha movido. */
  private cablesDirty = true;
  /** Frames de render pendientes (render bajo demanda fuera de simulación). */
  private renderDemand = 5;
  private lastRenderTime = 0;
  /** Resolución dinámica: arrastre sobre el lienzo y último movimiento. */
  private canvasDragging = false;
  private lastMotionAt = 0;

  /** Fotografía el visor tal cual se ve (render inmediato + PNG). */
  captureViewportPNG(): string {
    this.sceneManager.render();
    return this.sceneManager.renderer.domElement.toDataURL("image/png");
  }

  /**
   * PANTALLA VERDE del visor (v0.2.15 · prototipo con foto): fondo croma y
   * suelo ocultos para recortar los modelos sobre una foto del lugar real.
   */
  setPantallaVerde(on: boolean): void {
    this.sceneManager.setPantallaVerde(on);
    // Los ayudantes de edición (uniones, indicador de calce) no son parte
    // del prototipo: se ocultan del recorte croma.
    this.jointHelpers.visible = !on && !this.simulating;
    this.snap.hideIndicator();
    this.requestRender();
  }

  /**
   * MODO CALCE del prototipo con foto (v0.2.16): fondo del render eliminado
   * (la foto del usuario asoma por debajo), suelo PRESERVADO vestido de
   * caucho, sombras activas y ayudantes de edición ocultos.
   */
  setModoCalce(on: boolean): void {
    this.sceneManager.setModoCalce(on);
    this.jointHelpers.visible = !on && !this.simulating;
    this.snap.hideIndicator();
    if (!on) this.setOrbitaBloqueada(false);
    this.requestRender();
  }

  isModoCalce(): boolean {
    return this.sceneManager.isModoCalce();
  }

  /** Ángulo de incidencia de la luz (selector del sol del prototipo). */
  setSolAzimut(grados: number): void {
    this.sceneManager.setSolAzimut(grados);
    this.requestRender();
  }

  /** Perspectiva FIJADA: la órbita queda bloqueada hasta soltarla. */
  private orbitaBloqueada = false;

  setOrbitaBloqueada(on: boolean): void {
    this.orbitaBloqueada = on;
    this.orbit.enabled = !on;
  }

  isOrbitaBloqueada(): boolean {
    return this.orbitaBloqueada;
  }

  /**
   * INCLINACIÓN DE LA VISTA (v0.2.29, prototipo con foto): ángulo de la
   * cámara sobre el plano del suelo, en grados (0° = a ras de suelo, 90° =
   * cenital). Es el parámetro que hace coincidir EXACTAMENTE el plano del
   * suelo del render con el de la fotografía: la perilla lo ajusta con la
   * perspectiva ya fijada, sin tocar el azimut ni la distancia.
   */
  getInclinacionVista(): number {
    const d = new THREE.Vector3().subVectors(this.sceneManager.camera.position, this.orbit.target);
    const horiz = Math.hypot(d.x, d.z);
    return THREE.MathUtils.radToDeg(Math.atan2(d.y, horiz));
  }

  setInclinacionVista(grados: number): void {
    const cam = this.sceneManager.camera;
    const d = new THREE.Vector3().subVectors(cam.position, this.orbit.target);
    const dist = d.length();
    if (dist < 1e-6) return;
    // Azimut y distancia intactos: solo cambia la altura del punto de vista.
    // El rango respeta el límite polar de la órbita (no se baja del suelo),
    // que si no lo recortaría en el siguiente update().
    const az = Math.atan2(d.x, d.z);
    const el = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(grados, 1, 89));
    const horiz = Math.cos(el) * dist;
    cam.position.set(
      this.orbit.target.x + Math.sin(az) * horiz,
      this.orbit.target.y + Math.sin(el) * dist,
      this.orbit.target.z + Math.cos(az) * horiz,
    );
    cam.lookAt(this.orbit.target);
    cam.updateMatrixWorld(true);
    this.requestRender();
  }

  isPantallaVerde(): boolean {
    return this.sceneManager.isPantallaVerde();
  }

  /** Pide repintar los próximos frames (interacción, cambios de escena…). */
  requestRender(frames = 3): void {
    this.renderDemand = Math.max(this.renderDemand, frames);
  }

  /**
   * Render bajo demanda: fuera de la simulación solo se pinta cuando hay
   * interacción (puntero/teclado/rueda), la cámara se mueve o algo cambió,
   * con un latido de seguridad cada 500 ms (cargas asíncronas de modelos).
   * En tablets elimina el trabajo de GPU en reposo (batería y fluidez).
   */
  private installRenderOnDemand(): void {
    const bump = (): void => this.requestRender();
    for (const ev of ["pointerdown", "pointerup", "wheel", "keydown", "touchstart", "touchend"]) {
      this.escuchar(window, ev, bump, { passive: true, capture: true });
    }
    // El movimiento del puntero solo repinta arrastrando o sobre el lienzo
    // (previsualizaciones de colocación/línea/doblado con el cursor).
    this.escuchar(
      window,
      "pointermove",
      (e) => {
        const pe = e as PointerEvent;
        if (pe.buttons > 0 || pe.target === this.sceneManager.renderer.domElement) bump();
      },
      { passive: true, capture: true },
    );
    this.escuchar(window, "touchmove", bump, { passive: true, capture: true });
    this.escuchar(window, "resize", () => this.requestRender(5));
    // Arrastre sobre el lienzo (orbitar, gizmo, doblado…): activa la escala
    // de movimiento de la resolución dinámica.
    const canvas = this.sceneManager.renderer.domElement;
    this.escuchar(canvas, "pointerdown", () => (this.canvasDragging = true), { passive: true });
    this.escuchar(canvas, "touchstart", () => (this.canvasDragging = true), { passive: true });
    for (const ev of ["pointerup", "pointercancel", "touchend", "touchcancel"]) {
      this.escuchar(window, ev, () => (this.canvasDragging = false), {
        passive: true,
        capture: true,
      });
    }
  }

  /**
   * OYENTE CON RECIBO (v0.2.90).
   *
   * El render bajo demanda cuelga quince oyentes de `window` y del lienzo, y
   * `dispose()` sólo soltaba los seis que tienen un método con nombre: al
   * volver a la Home y abrir otro proyecto, los del editor anterior seguían
   * vivos, pidiendo cuadros sobre un renderer ya destruido y sujetando al
   * editor entero en memoria. Cada `escuchar` deja apuntado cómo soltarse.
   */
  private escuchar(
    destino: Window | HTMLElement,
    evento: string,
    fn: (e: Event) => void,
    opciones?: AddEventListenerOptions,
  ): void {
    destino.addEventListener(evento, fn, opciones);
    this.oyentes.push(() => destino.removeEventListener(evento, fn, opciones));
  }

  /** Cómo soltar cada oyente instalado con `escuchar` (se drena en `dispose`). */
  private oyentes: Array<() => void> = [];

  private loop = (): void => {
    if (!this.running) return;
    const now = performance.now();
    const dt = Math.min((now - this.lastFrameTime) / 1000, 0.25);
    this.lastFrameTime = now;
    if (this.simulating && this.physics) {
      this.physics.step(dt);
      this.cablesDirty = true;
      // Las cuerdas SIMULADAS se reproyectan desde sus eslabones físicos
      // (v0.2.15: cuelgan, ondulan y se hunden como cuerdas de verdad).
      if (++this.simFrame % 2 === 0) this.syncRopesFromPhysics();
    }
    this.updateStackAnimation();
    this.updateHandIK();
    this.updateFootIK();
    // La barra sujeta va DESPUÉS de la IK: se cuelga del cuerpo ya resuelto.
    this.sincronizarBarraManiqui();
    if (this.cablesDirty) {
      this.updateCableVisuals();
      this.cablesDirty = false;
      this.requestRender();
    }
    const moved = this.orbit.update();
    // Resolución dinámica: menos píxeles mientras hay movimiento real
    // (cámara, arrastre sobre el lienzo o simulación); nítido en reposo.
    if (getPerf().dynamicResolution) {
      if (this.simulating || moved || this.canvasDragging) {
        this.lastMotionAt = now;
        this.sceneManager.setMotionScale(true);
      } else if (now - this.lastMotionAt > 300 && this.sceneManager.setMotionScale(false)) {
        this.requestRender();
      }
    } else if (this.sceneManager.setMotionScale(false)) {
      this.requestRender();
    }
    if (this.simulating || moved || this.renderDemand > 0 || now - this.lastRenderTime > 500) {
      this.sceneManager.render();
      this.lastRenderTime = now;
      if (this.renderDemand > 0) this.renderDemand--;
    }
    requestAnimationFrame(this.loop);
  };

  /** Reproyecta cada cuerda desde la polilínea de sus eslabones simulados. */
  private syncRopesFromPhysics(): void {
    if (!this.physics) return;
    for (const rope of this.ropes.values()) {
      const pts = this.physics.polilineaCuerda(rope.id);
      if (pts && pts.length > 1) {
        rope.poseFromPolyline(pts, this.ropeSegTemplate(rope.kind));
      } else {
        // Sin simulación propia (cuerda demasiado corta): sigue a sus anclas.
        this.rebuildRope(rope);
      }
    }
  }

  // ------------------------------------------------------------- simulacion
  /**
   * ¿Corre el GESTO? Posar la máquina también enciende el motor —hace falta
   * para que las uniones y sus topes manden—, pero no es una simulación: no
   * hay gravedad, nada se mueve solo y la interfaz no debe tratarlo como tal.
   */
  isSimulating(): boolean {
    return this.simulating && !this.modoPoseMaquina;
  }

  async toggleSimulation(): Promise<void> {
    // Simular y posar la máquina son excluyentes: al arrancar el gesto, el
    // posado se cierra congelando donde quedara.
    if (this.modoPoseMaquina) this.terminarPoseMaquina();
    if (this.simulating) this.stopSimulation();
    else await this.startSimulation();
  }

  private startingSim = false;

  private async startSimulation(): Promise<void> {
    // El guard `startingSim` evita arranques concurrentes mientras carga el
    // WASM de Rapier (auto-repeat de Espacio): se creaban varios mundos y los
    // anteriores nunca se liberaban.
    if (this.simulating || this.startingSim) return;
    this.startingSim = true;
    try {
      await PhysicsWorld.init();
    } finally {
      this.startingSim = false;
    }

    // Guarda el estado de diseno para poder restaurarlo al detener. VA CON EL
    // DISEÑO PUESTO: si estuviera viéndose la partida, se guardaría ella como
    // «plano» y al parar se restauraría encima del de verdad, que se perdería.
    this.conElDiseno(() => {
      this.saved.clear();
      for (const o of this.listObjects()) {
        this.saved.set(o.id, {
          position: o.mesh.position.clone(),
          quaternion: o.mesh.quaternion.clone(),
          scale: o.mesh.scale.clone(),
        });
      }
    });

    this.select(null);
    this.cancelConnect();
    this.cancelCable();
    this.cancelRope();
    this.cancelLine();
    // Los modos de DOS FASES también, o quedan armados sobre una escena que
    // ya no está quieta: la roldana con su línea guía azul encendida y la
    // placa dentada apuntando a una cara que se está moviendo.
    this.cancelRoldana();
    this.cancelPlacaDentada();
    this.endBendNodes();
    this.physics = new PhysicsWorld();
    // EL MUNDO SE ARMA DESDE EL DISEÑO. Los cables miden aquí su longitud de
    // reposo y las uniones su cero; construirlo sobre la partida los daría por
    // buenos en una configuración que es una condición de ensayo, y la máquina
    // arrancaría tensada contra sí misma.
    const motor = this.physics;
    this.conElDiseno(() => {
      motor.build(
        this.listObjects(),
        this.listJoints(),
        this.listCables(),
        this.cuerdasFisicas(),
      );
    });
    // El maniquí entra al motor con cuerpo propio: la máquina ya no lo
    // atraviesa. Sus segmentos son cinemáticos —la postura la manda quien
    // simula—, así que no se desploma ni lo arrastran las piezas.
    if (this.humanFigure && this.humanMode === "mannequin") {
      // La pose con la que se pulsa ▶ ES la postura de partida: es adonde
      // vuelve el ↺ y desde donde se repite el ejercicio en la siguiente
      // pasada. Antes el maniquí se quedaba con la última pose movida.
      this.marcarPoseDePartida();
      this.physics.añadirFigura(this.humanFigure);
    }
    // PARTIDA DE LA MÁQUINA: se aplica DESPUÉS de construir, nunca antes. El
    // mundo se arma desde el diseño —cables con su longitud real y uniones con
    // su cero de fábrica— y solo entonces se salta a la configuración
    // congelada. Lo que quede tenso lo resuelve el motor en los primeros
    // pasos, igual que en la máquina de verdad.
    const partida = this.partidaVigente();
    if (partida) {
      const movidas = this.physics.recolocarPiezas(partida);
      if (movidas > 0) this.cablesDirty = true;
    }
    this.jointHelpers.visible = false;
    this.simulating = true;
    this.bus.emit("simulationChanged", { running: true });
    // Incoherencias de armado detectadas por el motor (v0.2.34): no rompen la
    // simulación, pero explican por qué algo no se mueve como se esperaba.
    const avisos = this.physics.avisosDeArmado();
    if (avisos.length > 0) {
      console.warn("EXERSUITE3D · avisos de armado:\n· " + avisos.join("\n· "));
      this.avisoTemporal(
        `⚠ ${avisos[0]}${avisos.length > 1 ? ` (+${avisos.length - 1} aviso(s), ver consola)` : ""}`,
      );
    }
  }

  stopSimulation(): void {
    if (!this.simulating) return;
    this.endSimInteraction();
    this.simulating = false;
    this.physics?.dispose();
    this.physics = null;

    // Restaura el estado de diseno.
    for (const o of this.listObjects()) {
      const s = this.saved.get(o.id);
      if (!s) continue;
      o.mesh.position.copy(s.position);
      o.mesh.quaternion.copy(s.quaternion);
      o.mesh.scale.copy(s.scale);
    }
    this.saved.clear();
    this.jointHelpers.visible = true;
    // El maniquí también vuelve a su estado de diseño: parar la simulación lo
    // dejaba con la última pose movida y la siguiente pasada arrancaba desde
    // ahí, así que no había forma de repetir el mismo gesto dos veces.
    this.reiniciarPoseDePartida();
    // Cables y cuerdas vuelven a las posiciones de diseño restauradas.
    this.cablesDirty = true;
    this.rebuildAllRopes();
    // LAS MALLAS ACABAN DE VOLVER AL PLANO, así que la partida NO está pintada.
    // Sin decirlo, `reconciliarEdiciones` tomaría esa vuelta al plano por una
    // edición del usuario y le restaría el gesto entero al diseño: la partida
    // se destruía al primer ⏹.
    this.partidaPintada = false;
    // Y LA MÁQUINA SE QUEDA DONDE SE CONGELÓ, si hay maniquí delante: parar no
    // es soltar la partida. El plano sigue mandando por dentro (`conElDiseno`),
    // pero lo que se ve es la condición de ensayo, que es contra la que se
    // acomoda el cuerpo.
    this.sincronizarPartidaVisible();
    this.bus.emit("simulationChanged", { running: false });
  }

  // -------------------------------------------------------------- objetos

  /** Punto del suelo (y=0) bajo unas coordenadas de pantalla, o null. */
  screenToGround(clientX: number, clientY: number): THREE.Vector3 | null {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.sceneManager.camera);
    const p = new THREE.Vector3();
    const suelo = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    return this.raycaster.ray.intersectPlane(suelo, p) ? p : null;
  }

  /** Crea el componente apoyado en el suelo sobre el punto dado (drag&drop). */
  addComponentAt(componentId: string, suelo: THREE.Vector3): SceneObject {
    const obj = this.addComponent(componentId);
    const s = obj.effectiveSize();
    obj.mesh.position.set(suelo.x, s.y / 2, suelo.z);
    this.bus.emit("objectTransformed", { object: obj });
    return obj;
  }

  /**
   * CARRO DE DOBLE ROLDANA TTP (v0.2.26): el puente del carro SIEMPRE nace
   * con sus dos roldanas funcionales y su física de pieza móvil — su rol es
   * transmitir fuerza entre dos roldanas (como en el TTP con torre). Las
   * tres piezas se insertan agrupadas; en simulación las roldanas se
   * empotran al puente (cuerpo compuesto) y los cables las reconocen como
   * puntos de reenvío.
   */
  insertarCarroDoble(suelo?: THREE.Vector3): void {
    const puente = suelo
      ? this.addComponentAt("puente-carro-ttp", suelo)
      : this.addComponent("puente-carro-ttp");
    puente.physics = { ...puente.physics, fixed: false, massKg: Math.max(0.2, puente.physics.massKg) };
    // Poses del prefab TTP: poleas del carro a +7/−6 del centro del puente,
    // de canto (eje de giro en X local del puente).
    const qRueda = new THREE.Quaternion(0, 0, Math.SQRT1_2, Math.SQRT1_2);
    const ids = [puente.id];
    for (const [nombre, dy] of [
      ["Carro: polea sup.", 7],
      ["Carro: polea inf.", -6],
    ] as [string, number][]) {
      const r = this.addComponent("roldana");
      r.name = nombre;
      r.mesh.name = nombre;
      r.physics = { ...r.physics, fixed: false, massKg: 0.3 };
      r.mesh.quaternion.copy(puente.mesh.quaternion).multiply(qRueda);
      r.mesh.position
        .copy(puente.mesh.position)
        .add(new THREE.Vector3(0, dy, 0).applyQuaternion(puente.mesh.quaternion));
      this.bus.emit("objectTransformed", { object: r });
      ids.push(r.id);
    }
    const gid = this.createGroupFromIds(ids);
    if (gid) this.renameGroup(gid, tt("Carro de doble roldana", "Double-sheave trolley"));
    this.scheduleAutosave();
    this.requestRender();
  }

  /**
   * Inserta una máquina estándar (prefab de componentes agrupado) con su
   * centro en `at` (o en el origen). El grupo resultante se mueve en bloque.
   */
  insertarMaquina(prefabId: string, at = new THREE.Vector3()): void {
    // PREFAB del usuario (v0.2.4): si la máquina fue sustituida por un
    // .prefab.json corregido, ese archivo ES la definición — se arma pieza a
    // pieza con fidelidad v2, sin transcripción de por medio.
    const prefabUsuario = prefabsMaquina.get(prefabId);
    if (prefabUsuario) {
      const ids = construirPiezas(this, prefabUsuario.piezas, prefabUsuario.label, at);
      if (prefabUsuario.uniones) {
        aplicarUniones(this, ids, prefabUsuario.uniones, at);
        this.migrarContactosBisagra(new Set());
      }
      if (prefabUsuario.cables) aplicarCables(this, ids, prefabUsuario.cables);
      if (ids.length >= 2) {
        const gid = this.createGroupFromIds(ids);
        if (gid) this.renameGroup(gid, prefabUsuario.label);
      }
      this.scheduleAutosave();
      this.requestRender();
      return;
    }
    // Máquina SUSTITUIDA en la biblioteca: se inserta el modelo del usuario
    // como una sola pieza anclada (misma mecánica que los componentes).
    const clave = claveMaquina(prefabId);
    const custom = componentModels.geometryClone(clave);
    if (custom) {
      custom.computeBoundingBox();
      const size = custom.boundingBox!.getSize(new THREE.Vector3());
      const obj = this.addComponent("prim-box");
      obj.params = { kind: "box", width: size.x, height: size.y, depth: size.z };
      obj.name = STANDARD_MACHINES.find((m) => m.id === prefabId)?.label ?? prefabId;
      obj.mesh.name = obj.name;
      obj.setMaterial("acero-negro");
      obj.physics = { ...obj.physics, fixed: true };
      obj.modeloMaquina = clave;
      obj.applyCustomGeometry(custom);
      obj.mesh.position.set(at.x, size.y / 2, at.z);
      this.scheduleAutosave();
      this.requestRender();
      return;
    }
    const { ids, label } = construirMaquina(this, prefabId, at);
    if (ids.length >= 2) {
      const gid = this.createGroupFromIds(ids);
      if (gid) this.renameGroup(gid, label);
    }
    this.scheduleAutosave();
    this.requestRender();
  }

  /** Barra de zoom (v0.2.3): factor <1 acerca la cámara, >1 la aleja. */
  zoomCamara(factor: number): void {
    this.setZoomDistancia(this.getZoomDistancia() * factor);
  }

  /** Distancia actual de la cámara al objetivo de órbita (cm). */
  getZoomDistancia(): number {
    return this.sceneManager.camera.position.distanceTo(this.orbit.target);
  }

  /** Fija la distancia de la cámara (barra de continuum del zoom). */
  setZoomDistancia(distancia: number): void {
    const cam = this.sceneManager.camera;
    const dir = new THREE.Vector3().subVectors(cam.position, this.orbit.target);
    if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
    const d = THREE.MathUtils.clamp(distancia, 25, 4000);
    cam.position.copy(this.orbit.target).addScaledVector(dir.normalize(), d);
    this.orbit.update();
    this.requestRender();
  }

  /**
   * Arrastre preciso (v0.2.3): mueve la selección (pieza, multiselección o
   * grupo) un paso exacto en cm, desde los cursores en pantalla o el teclado.
   */
  nudgeSelection(dx: number, dy: number, dz: number): void {
    // Modo Doblar: los cursores mueven el NODO ACTIVO, no la pieza — así la
    // deformación puede operar en varios ejes con exactitud en un mismo ítem.
    if (this.bendTarget && this.bendNodeIndex !== null) {
      this.nudgeBendNode(dx, dy, dz);
      return;
    }
    const ids = this.getSelectionIds();
    if (ids.length === 0) return;
    const delta = new THREE.Vector3(dx, dy, dz);
    for (const id of ids) {
      const o = this.objects.get(id);
      if (!o) continue;
      o.mesh.position.add(delta);
      this.bus.emit("objectTransformed", { object: o });
    }
    // LAS UNIONES VAN CON LAS PIEZAS. El gizmo ya lo hacía y este camino no,
    // así que mover un grupo con las flechas dejaba la bolita del marcador y
    // el eje clavados en el sitio anterior; al simular, la bisagra pivotaba
    // alrededor de ese punto viejo y el conjunto se desencajaba.
    this.transformarUniones(new THREE.Matrix4().makeTranslation(dx, dy, dz), ids);
    // Reubica el gizmo colectivo para que siga a las piezas desplazadas.
    if (this.multiSel.size > 0) this.refreshMultiGizmo(true);
    else if (this.selectedGroupId) {
      this.groupProxy.position.add(delta);
      this.groupProxy.updateMatrixWorld(true);
      this.groupPrev.copy(this.groupProxy.matrixWorld);
    }
    this.checkWorkspaceBounds();
    this.emitDragMeasure(delta);
    this.scheduleAutosave();
    this.requestRender();
  }

  /** Cache del punto de ensamble por geometría (ver puntoCalceLocal). */
  private cacheCalce = new Map<string, THREE.Vector3 | null>();

  /**
   * MANGUITO DE ENSAMBLE de una pieza de calce: las jotas y brazos de
   * seguridad tienen un espacio DISEÑADO para abrazar el pilar (como los
   * orificios de los bloques de peso calzan con las guías). Se detecta en
   * la propia malla: es la CAVIDAD vertical pasante — celdas del plano XZ
   * por las que un rayo vertical atraviesa sin tocar material, encerradas
   * por material (un flood-fill desde el borde separa el exterior).
   * Devuelve el centro local (XZ) de la cavidad, o null si la malla no
   * tiene manguito.
   */
  private puntoCalceLocal(obj: SceneObject): THREE.Vector3 | null {
    // Punto CALIBRADO en la definición (manguitos abiertos o tapados que la
    // detección geométrica no ve); la detección queda para mallas sustituidas.
    const def = getDefinition(obj.componentId);
    if (def?.calceLocal && componentModels.source(obj.componentId) !== "user") {
      const p = new THREE.Vector3(def.calceLocal[0], 0, def.calceLocal[1]);
      // LARGO A MEDIDA (v0.3.2): el manguito está en el remate de la pieza, y
      // al alargarla el remate viaja entero hacia fuera. El punto CALIBRADO
      // aquí tiene que viajar con él, o el brazo alargado calzaría en el
      // pilar por donde ya no hay manguito.
      const aj = def.largoAjustable;
      if (aj && obj.params.largoCm) {
        const fabrica = largoDeFabrica(def, aj.eje);
        p[aj.eje] = puntoTrasEstirar(p[aj.eje], fabrica, obj.params.largoCm, aj.extremosCm);
      }
      return p;
    }
    const key = `${obj.componentId}:${obj.mesh.geometry.uuid}`;
    const cacheado = this.cacheCalce.get(key);
    if (cacheado !== undefined) return cacheado ? cacheado.clone() : null;

    const geo = obj.mesh.geometry;
    geo.computeBoundingBox();
    const bb = geo.boundingBox!;
    const sx = bb.max.x - bb.min.x;
    const sz = bb.max.z - bb.min.z;
    const nx = Math.max(8, Math.min(48, Math.round(sx / 1.2)));
    const nz = Math.max(8, Math.min(48, Math.round(sz / 1.2)));
    const tmp = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    const ray = new THREE.Raycaster();
    const solido: boolean[] = new Array((nx + 1) * (nz + 1)).fill(false);
    const celda = (i: number, j: number) => i * (nz + 1) + j;
    const px = (i: number) => bb.min.x + ((i + 0.5) * sx) / (nx + 1);
    const pz = (j: number) => bb.min.z + ((j + 0.5) * sz) / (nz + 1);
    for (let i = 0; i <= nx; i++) {
      for (let j = 0; j <= nz; j++) {
        ray.set(new THREE.Vector3(px(i), bb.max.y + 5, pz(j)), new THREE.Vector3(0, -1, 0));
        solido[celda(i, j)] = ray.intersectObject(tmp).length > 0;
      }
    }
    // Flood fill desde el borde: lo vacío conectado al borde es exterior.
    const exterior = new Array<boolean>(solido.length).fill(false);
    const cola: [number, number][] = [];
    for (let i = 0; i <= nx; i++) for (const j of [0, nz]) cola.push([i, j]);
    for (let j = 0; j <= nz; j++) for (const i of [0, nx]) cola.push([i, j]);
    while (cola.length) {
      const [i, j] = cola.pop()!;
      const c = celda(i, j);
      if (i < 0 || j < 0 || i > nx || j > nz || exterior[c] || solido[c]) continue;
      exterior[c] = true;
      cola.push([i - 1, j], [i + 1, j], [i, j - 1], [i, j + 1]);
    }
    // Cavidad = vacío NO exterior → centroide.
    let cx = 0, cz = 0, n = 0;
    for (let i = 0; i <= nx; i++) {
      for (let j = 0; j <= nz; j++) {
        const c = celda(i, j);
        if (!solido[c] && !exterior[c]) {
          cx += px(i);
          cz += pz(j);
          n++;
        }
      }
    }
    const punto = n >= 2 ? new THREE.Vector3(cx / n, 0, cz / n) : null;
    this.cacheCalce.set(key, punto);
    return punto ? punto.clone() : null;
  }

  /**
   * TODOS LOS POSTES CON AGUJEROS que hay alrededor de una pieza, medidos
   * respecto de ella, y el MEJOR de ellos (el más cercano de los que la
   * tienen a tiro). Reconoce las tres formas en que una estructura puede
   * traer su grilla: la de biblioteca con la malla sondeada, la viga trazada
   * con la herramienta de línea —donde los agujeros los eligió el usuario— y
   * cada TRAMO recto de una viga doblada por nodos, que conserva la suya
   * aunque quede diagonal.
   */
  private candidatosCalce(obj: SceneObject): {
    candidatos: CandidatoPoste[];
    mejor: CandidatoPoste | null;
  } {
    const centro = obj.mesh.position;
    const tam = obj.effectiveSize();
    const candidatos: CandidatoPoste[] = [];
    let mejor: CandidatoPoste | null = null;
    let mejorLateral = Infinity;
    const maxTam = Math.max(tam.x, tam.y, tam.z);
    const considerar = (cand: CandidatoPoste) => {
      candidatos.push(cand);
      if (cand.cerca && cand.lateral < mejorLateral) {
        mejorLateral = cand.lateral;
        mejor = cand;
      }
    };
    for (const o of this.objects.values()) {
      if (o === obj) continue;
      // Ejes LOCALES de la pieza llevados al mundo: el eje del poste es su
      // dimensión local más larga ROTADA por su cuaternión. (La caja de
      // mundo re-rotada duplicaría el giro: una viga tendida horizontal
      // daría un eje vertical falso y la grilla correría perpendicular.)
      const s = o.localSize();
      const dims: [number, THREE.Vector3][] = [
        [s.x, new THREE.Vector3(1, 0, 0)],
        [s.y, new THREE.Vector3(0, 1, 0)],
        [s.z, new THREE.Vector3(0, 0, 1)],
      ];
      dims.sort((a, b) => b[0] - a[0]);
      const largo = dims[0][0];

      // Grilla de pinholes del candidato: de BIBLIOTECA (paso/fase medidos
      // en la malla) o TRAZADO con la herramienta lineal (paso/fase según
      // sus parámetros de pinholes configurables — misma validez).
      const defPoste = getDefinition(o.componentId);
      // Viga DOBLADA por nodos: cada TRAMO recto que conservó pinholes
      // aporta su PROPIA grilla — el accesorio reconoce la INCLINACIÓN de
      // la cara y de sus pinholes aunque el tramo quede diagonal.
      if (!defPoste?.holeStepCm && o.params.kind === "beam" && !pathIsStraight(o.params.path)) {
        const grosor = o.params.width ?? 5;
        o.mesh.updateMatrixWorld(true);
        for (const tr of tramosCalce(o.params)) {
          const origen = o.mesh.localToWorld(tr.centro.clone());
          const eje = tr.dir.clone().applyQuaternion(o.mesh.quaternion).normalize();
          if (eje.y < 0) eje.negate(); // "subir" = hacia arriba del tramo
          const ejePin = tr.ejePin.clone().applyQuaternion(o.mesh.quaternion).normalize();
          const delta = centro.clone().sub(origen);
          const lateral = delta.clone().addScaledVector(eje, -delta.dot(eje)).length();
          const axial = Math.abs(delta.dot(eje));
          const tol = grosor / 2 + maxTam / 2 + 30;
          considerar({
            poste: o,
            origen,
            eje,
            paso: tr.paso,
            fase: tr.fase,
            lim: tr.lim,
            ejePin,
            lateral,
            cerca: lateral <= tol && axial <= tr.largo / 2 + 10,
          });
        }
        continue;
      }
      let paso: number;
      let fase: number;
      let lim: number;
      let ejePinLocal: "x" | "z" | null;
      if (defPoste?.holeStepCm) {
        paso = defPoste.holeStepCm;
        fase = defPoste.calceFase ?? 0;
        // Hasta donde llegan los agujeros DE VERDAD. Si la malla se sondeó,
        // manda su recuento de filas; si no, la rejilla es sintética y llega
        // casi al extremo, que es lo que había para todas. Sin este tope, la
        // rejilla se inventaba agujeros: la media columna POWERRACK anunciaba
        // 19 donde la malla tiene 10, y la jota podía subir medio metro por
        // encima del último pinhole, calzada sobre acero macizo.
        lim = defPoste.calceFilas
          ? ((defPoste.calceFilas - 1) / 2) * defPoste.holeStepCm + 0.01
          : largo / 2 - 2;
        ejePinLocal = defPoste.ejeCalce ?? null;
      } else if (o.params.kind === "beam" && (o.params.holeDiameter ?? 0) > 0.1) {
        const holeR = (o.params.holeDiameter ?? 0) / 2;
        const spacing = Math.max(o.params.holeSpacing ?? 5, holeR * 2 + 0.5);
        const ancho = o.params.width ?? 5;
        const margen = (o.params.ends === "diagonal" ? ancho : ancho / 2) + holeR;
        const usable = largo - 2 * margen;
        const count = Math.floor(usable / spacing) + 1;
        if (count < 1 || usable < 0) continue; // sin filas de pinholes
        paso = spacing;
        // Filas simétricas al centro: fila central (impar) o a ±paso/2 (par).
        fase = count % 2 === 1 ? 0 : spacing / 2;
        lim = ((count - 1) / 2) * spacing + 0.01;
        ejePinLocal = "z"; // la viga extruye el fondo en Z: los pinholes lo atraviesan
      } else {
        continue;
      }

      const eje = dims[0][1].applyQuaternion(o.mesh.quaternion).normalize();
      if (eje.y < 0) eje.negate(); // "subir" = hacia arriba del poste
      const ejePin = ejePinLocal
        ? (ejePinLocal === "x" ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1))
            .applyQuaternion(o.mesh.quaternion)
            .normalize()
        : null;
      const delta = centro.clone().sub(o.mesh.position);
      const lateral = delta.clone().addScaledVector(eje, -delta.dot(eje)).length();
      const axial = Math.abs(delta.dot(eje));
      // Radio de búsqueda generoso: una pieza "flotando en el aire" cerca
      // del poste también se ensambla (el más cercano gana). Los postes
      // lejanos igual quedan en la lista: la PAREJA de un tendido de dos
      // postes puede estar al otro extremo de la pieza.
      const tol = dims[1][0] / 2 + maxTam / 2 + 30;
      const cerca = lateral <= tol && axial <= largo / 2 + 10;
      considerar({
        poste: o,
        origen: o.mesh.position.clone(),
        eje,
        paso,
        fase,
        lim,
        ejePin,
        lateral,
        cerca,
      });
    }
    return { candidatos, mejor };
  }

  /**
   * CALCE POR AGUJEROS: sube o baja una pieza de calce (gancho J, brazo de
   * seguridad) por su poste AGUJERO POR AGUJERO. Busca el poste con grilla
   * de agujeros (holeStepCm) más cercano, ENSAMBLA la pieza a la estructura
   * (su manguito abraza el pilar: el eje del poste pasa por la cavidad de
   * ensamble — no queda flotando en el aire), ajusta a la grilla y da un
   * paso a lo largo del eje sin salirse de sus extremos. Devuelve un aviso
   * si no puede; null si el calce se hizo.
   *
   * `dir` 0 (v0.3.7) NO da el paso: solo asienta la pieza en el agujero que le
   * queda más cerca. Es lo que necesita el safety pin cuando le cambian el
   * largo o el corrimiento y hay que volver a colocarlo sin moverlo de fila.
   *
   * PIEZAS PASANTES (v0.3.7): una pieza con `ejePasante` —el safety pin— no
   * cuelga del poste sino que lo ATRAVIESA. Reconoce la misma grilla que las
   * jotas, pero se acuesta sobre el eje de los agujeros en vez de abrazar el
   * perfil, se ciñe al diámetro del pinhole y reparte su sobrante a los dos
   * lados según el corrimiento que se le haya dado.
   */
  calcePorAgujero(objId: string, dir: 1 | -1 | 0): string | null {
    const obj = this.objects.get(objId);
    if (!obj) return "Pieza no encontrada";
    const centro = obj.mesh.position;
    const tam = obj.effectiveSize();
    const { candidatos, mejor } = this.candidatosCalce(obj);
    if (!mejor) {
      return tt(
        "No hay un poste con agujeros junto a la pieza: acércala a un montante.",
        "There is no drilled post next to the piece: move it closer to an upright.",
      );
    }
    const { poste, origen, eje, paso, fase, lim, ejePin } = mejor as CandidatoPoste;
    // ¿ATRAVIESA el agujero (safety pin) o CUELGA del poste (jotas)?
    const pasante = getDefinition(obj.componentId)?.ejePasante ?? null;
    if (pasante && !ejePin) {
      return tt(
        "Ese poste no declara por qué cara van sus agujeros: el pasador no sabe por dónde entrar.",
        "That post does not declare which face its holes go through: the pin has no way in.",
      );
    }
    // TENDIDO ENTRE DOS POSTES (postesCalce 2): mientras las jotas cuelgan
    // de UN pilar, el brazo de seguridad se sostiene de DOS a la vez. Se
    // busca la PAREJA del poste más cercano sobre la línea del tendido
    // (perpendicular al eje de los pinholes), la pieza se alinea con su
    // eje largo sobre esa línea y se centra entre ambos — y como ambos
    // pilares comparten la grilla, subir o bajar la mueve UN agujero en
    // los dos simultáneamente.
    let pareja: CandidatoPoste | null = null;
    if (!pasante && getDefinition(obj.componentId)?.postesCalce === 2 && ejePin) {
      // El tendido corre A LO LARGO del eje de los pinholes: los pines del
      // brazo entran axialmente por las caras enfrentadas de ambos pilares.
      const tendido = ejePin;
      const largoPieza = Math.max(tam.x, tam.y, tam.z);
      let mejorSep = Infinity;
      for (const c of candidatos) {
        if (c.poste === poste) continue;
        if (Math.abs(c.eje.dot(eje)) < 0.99 || Math.abs(c.paso - paso) > 1e-3) continue;
        const d = c.origen.clone().sub(origen);
        d.addScaledVector(eje, -d.dot(eje)); // separación en planta
        const sep = d.length();
        if (sep < 20 || sep > largoPieza + 40) continue;
        // La pareja vive sobre la línea del tendido — el pilar de ENFRENTE
        // (a lo largo del eje de pinholes) no es pareja válida.
        const desvio = d.clone().addScaledVector(tendido, -d.dot(tendido)).length();
        if (desvio > 10) continue;
        if (sep < mejorSep) {
          mejorSep = sep;
          pareja = c;
        }
      }
    }
    if (pareja) {
      // Eje LARGO de la pieza sobre la línea entre ambos postes (giro en
      // planta, sin volcarla) y centro en el punto medio del tendido.
      const tamLoc = obj.localSize();
      const dimsLoc: [number, THREE.Vector3][] = [
        [tamLoc.x, new THREE.Vector3(1, 0, 0)],
        [tamLoc.y, new THREE.Vector3(0, 1, 0)],
        [tamLoc.z, new THREE.Vector3(0, 0, 1)],
      ];
      dimsLoc.sort((a, b) => b[0] - a[0]);
      const linea = pareja.origen.clone().sub(origen);
      linea.addScaledVector(eje, -linea.dot(eje)).normalize();
      const largoMundo = dimsLoc[0][1].clone().applyQuaternion(obj.mesh.quaternion);
      largoMundo.addScaledVector(eje, -largoMundo.dot(eje));
      if (largoMundo.lengthSq() > 1e-6) {
        largoMundo.normalize();
        const objetivo = linea.clone().multiplyScalar(largoMundo.dot(linea) >= 0 ? 1 : -1);
        obj.mesh.quaternion.premultiply(
          new THREE.Quaternion().setFromUnitVectors(largoMundo, objetivo),
        );
        obj.mesh.updateMatrixWorld(true);
      }
      const medio = origen.clone().add(pareja.origen).multiplyScalar(0.5);
      const desplazo = medio.sub(centro);
      desplazo.addScaledVector(eje, -desplazo.dot(eje));
      centro.add(desplazo);
    }
    // ARTICULACIÓN CON LOS PINHOLES: el pin de calce solo articula con los
    // orificios ESTANDARIZADOS pasantes por ambas caras del poste — no con
    // los agujeros accesorios de otras caras. Se gira la pieza alrededor
    // del poste hasta encarar ese eje (respetando el lado en que la dejó
    // el usuario).
    if (pasante && ejePin) {
      // PASANTE: la BARRA del pasador se acuesta sobre el eje de los
      // agujeros. Entra por una cara del poste y sale por la de enfrente,
      // perpendicular a la viga — el calce real de un safety pin. Se respeta
      // el sentido en que el usuario lo dejó (no se voltea de punta).
      const ejeLocal =
        pasante === "x"
          ? new THREE.Vector3(1, 0, 0)
          : pasante === "y"
            ? new THREE.Vector3(0, 1, 0)
            : new THREE.Vector3(0, 0, 1);
      const barra = ejeLocal.applyQuaternion(obj.mesh.quaternion).normalize();
      const objetivo = ejePin.clone().multiplyScalar(barra.dot(ejePin) >= 0 ? 1 : -1);
      if (barra.angleTo(objetivo) > 1e-4) {
        obj.mesh.quaternion.premultiply(
          new THREE.Quaternion().setFromUnitVectors(barra, objetivo),
        );
        obj.mesh.updateMatrixWorld(true);
      }
      // SIN GIRO SOBRANTE alrededor de su propia barra: da igual para un
      // cilindro, pero deja la pieza a escuadra con el poste y con ello sus
      // medidas —las que enseña el panel— en las del pasador y no en las de
      // una caja girada 30°.
      const refLocal =
        pasante === "y" ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
      const ref = refLocal.applyQuaternion(obj.mesh.quaternion);
      ref.addScaledVector(objetivo, -ref.dot(objetivo));
      const meta = eje.clone().addScaledVector(objetivo, -eje.dot(objetivo));
      if (ref.lengthSq() > 1e-6 && meta.lengthSq() > 1e-6) {
        ref.normalize();
        meta.normalize().multiplyScalar(ref.dot(meta) >= 0 ? 1 : -1);
        if (ref.angleTo(meta) > 1e-4) {
          obj.mesh.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors(ref, meta));
          obj.mesh.updateMatrixWorld(true);
        }
      }
      // Y TIENE QUE CABER: un pasador más gordo que el agujero no entraría en
      // el rack real, así que se ciñe al diámetro del pinhole.
      this.ceñirAlPinhole(obj, poste);
    } else if (!pareja && ejePin) {
      // INCLINACIÓN DE LA CARA (v0.2.12): el accesorio RECONOCE la
      // inclinación del poste o tramo donde calza — su vertical local se
      // alinea con el eje de la cara (diagonal o inclinada incluida), de
      // modo que el manguito abraza el perfil y el pin entra perpendicular
      // a esa cara, no según la vertical del mundo.
      const arriba = new THREE.Vector3(0, 1, 0).applyQuaternion(obj.mesh.quaternion).normalize();
      const objetivoArriba = eje.clone().multiplyScalar(arriba.dot(eje) >= 0 ? 1 : -1);
      if (arriba.angleTo(objetivoArriba) > 1e-4) {
        obj.mesh.quaternion.premultiply(
          new THREE.Quaternion().setFromUnitVectors(arriba, objetivoArriba),
        );
        obj.mesh.updateMatrixWorld(true);
      }
      // Cada pieza ENCARA el poste por su propio eje local (frenteCalce):
      // las jotas/brazos por Z; el anclaje de cadena monta por X.
      const frenteLocal =
        getDefinition(obj.componentId)?.frenteCalce === "x"
          ? new THREE.Vector3(1, 0, 0)
          : new THREE.Vector3(0, 0, 1);
      const frente = frenteLocal.applyQuaternion(obj.mesh.quaternion);
      frente.addScaledVector(eje, -frente.dot(eje)); // ⊥ al poste
      if (frente.lengthSq() > 1e-6) {
        frente.normalize();
        const objetivo = ejePin.clone().multiplyScalar(frente.dot(ejePin) >= 0 ? 1 : -1);
        const giro = new THREE.Quaternion().setFromUnitVectors(frente, objetivo);
        obj.mesh.quaternion.premultiply(giro);
        obj.mesh.updateMatrixWorld(true);
      }
    }
    // ENSAMBLE: el manguito de la pieza abraza el pilar — se corrige el
    // desvío lateral para que el eje del poste pase por la cavidad de
    // ensamble de la malla. Sin cavidad (primitiva maciza) no se fuerza.
    // En un tendido de DOS postes la pieza ya quedó centrada entre ambos.
    // El pasador no tiene manguito que corregir: su sitio lateral es el EJE
    // del poste (más el corrimiento), y se fija abajo de una vez.
    const pc = pareja || pasante ? null : this.puntoCalceLocal(obj);
    if (pc) {
      obj.mesh.updateMatrixWorld(true);
      const manguito = obj.mesh.localToWorld(pc.clone());
      const desvio = manguito.sub(origen);
      const lateralManguito = desvio.clone().addScaledVector(eje, -desvio.dot(eje));
      centro.sub(lateralManguito);
    }
    const delta = centro.clone().sub(origen);
    const s = delta.dot(eje);
    // Se ajusta a la grilla REAL de pinholes (paso y fase del poste) y da
    // UN paso en la dirección pedida, sin salirse de las filas existentes.
    let sNuevo = fase + Math.round((s - fase) / paso) * paso + dir * paso;
    sNuevo = Math.max(-lim, Math.min(lim, sNuevo));
    if (dir !== 0 && Math.abs(sNuevo - s) < 1e-3) {
      return tt("La pieza ya está en el último agujero del poste.", "The piece is already at the post's last hole.");
    }
    // LÍMITES DE COLISIÓN en el MISMO pilar: dos accesorios calzados no
    // pueden solaparse (rompe la fidelidad del modelo). Si el agujero
    // destino queda dentro del volumen de otra pieza montada en este
    // poste, se salta al siguiente agujero LIBRE en la misma dirección;
    // si no queda ninguno, se avisa.
    // El pasador acaba de girarse para entrar en el agujero: su medida a lo
    // largo del poste es otra que la que traía al empezar.
    const tamOcup = pasante ? obj.effectiveSize() : tam;
    const miExt =
      Math.abs(tamOcup.x * eje.x) + Math.abs(tamOcup.y * eje.y) + Math.abs(tamOcup.z * eje.z);
    const ocupantes: { s: number; ext: number }[] = [];
    for (const o of this.objects.values()) {
      if (o === obj || o === poste || (pareja && o === pareja.poste)) continue;
      const defO = getDefinition(o.componentId);
      if (!defO || (!defO.calceLocal && !defO.frenteCalce && !defO.postesCalce)) continue;
      const dO = o.mesh.position.clone().sub(origen);
      const latO = dO.clone().addScaledVector(eje, -dO.dot(eje)).length();
      const tO = o.effectiveSize();
      const maxO = Math.max(tO.x, tO.y, tO.z);
      if (latO > maxO / 2 + 10) continue; // montada en OTRO pilar
      ocupantes.push({
        s: dO.dot(eje),
        ext: Math.abs(tO.x * eje.x) + Math.abs(tO.y * eje.y) + Math.abs(tO.z * eje.z),
      });
    }
    const libre = (sv: number) =>
      ocupantes.every((q) => Math.abs(sv - q.s) >= (miExt + q.ext) / 2 - 0.5);
    if (!libre(sNuevo) && dir === 0) {
      // Reasentar en el sitio: si el agujero está ocupado no hay a dónde
      // saltar — se avisa y se deja la pieza donde estaba.
      return tt(
        "Ese agujero lo ocupa otra pieza.",
        "That hole is occupied by another piece.",
      );
    }
    if (!libre(sNuevo)) {
      let sBusca = sNuevo;
      let hallado = false;
      for (;;) {
        sBusca += dir * paso;
        if (sBusca < -lim - 1e-6 || sBusca > lim + 1e-6) break;
        if (libre(sBusca)) {
          sNuevo = sBusca;
          hallado = true;
          break;
        }
      }
      if (!hallado) {
        return tt(
          "Los agujeros en esa dirección están ocupados por otra pieza.",
          "The holes in that direction are occupied by another piece.",
        );
      }
    }
    if (pasante && ejePin) {
      // SITIO EXACTO del pasador: sobre el eje del poste, a la altura del
      // agujero, corrido a lo largo del agujero lo que se le haya pedido.
      // Con corrimiento 0 sobresale lo mismo por los dos lados.
      centro
        .copy(origen)
        .addScaledVector(eje, sNuevo)
        .addScaledVector(ejePin, obj.params.pinOffsetCm ?? 0);
    } else {
      centro.addScaledVector(eje, sNuevo - s);
    }
    this.bus.emit("objectTransformed", { object: obj });
    this.scheduleAutosave();
    this.requestRender();
    return null;
  }

  /**
   * DIÁMETRO DEL PINHOLE de un poste (cm), o null si no lo declara: de la
   * biblioteca (`holeDiameterCm`) o de los parámetros de una viga trazada con
   * la herramienta de línea, donde el agujero lo eligió el usuario.
   */
  private diametroPinhole(poste: SceneObject): number | null {
    const def = getDefinition(poste.componentId);
    if (def?.holeDiameterCm) return def.holeDiameterCm;
    const d = poste.params.holeDiameter ?? 0;
    return d > 0.1 ? d : null;
  }

  /**
   * CIÑE EL PASADOR AL AGUJERO: si viene más gordo que el pinhole, se adelgaza
   * hasta caber con holgura de montaje. Un pasador de 4 cm no entra por un
   * agujero de 2,6 en el rack real, y dejarlo pasar aquí sería dibujar acero
   * atravesando acero. Devuelve true si hubo que adelgazarlo.
   */
  private ceñirAlPinhole(obj: SceneObject, poste: SceneObject): boolean {
    const dia = this.diametroPinhole(poste);
    if (!dia) return false;
    const rMax = Math.max(0.15, dia / 2 - 0.05);
    const r = Math.max(obj.params.radiusTop ?? 0, obj.params.radiusBottom ?? 0);
    if (r <= rMax + 1e-6) return false;
    obj.params.radiusTop = +rMax.toFixed(3);
    obj.params.radiusBottom = +rMax.toFixed(3);
    obj.rebuildGeometry();
    return true;
  }

  /**
   * ESTADO DEL PASADOR para el panel de Propiedades (v0.3.7): en qué agujero
   * está, cuánta viga atraviesa y CUÁNTO SOBRESALE POR CADA LADO.
   *
   * El sobrante es la medida que el diseñador pidió poder tocar: un safety pin
   * puede quedar centrado, o correrse para sacar más barra por el lado donde
   * apoya la carga. `corrimientoMax` es hasta dónde puede correrse sin que un
   * extremo se meta dentro del poste — pasado ese punto ya no atravesaría.
   * Devuelve null si la pieza no es pasante o no hay poste con agujeros cerca.
   */
  estadoPin(objId: string): {
    agujero: number;
    total: number;
    calzado: boolean;
    /** Diámetro del pinhole (cm), o null si el poste no lo declara. */
    diaAgujero: number | null;
    /** Diámetro actual del pasador (cm). */
    diaPin: number;
    /** Grosor de viga que atraviesa (cm). */
    grosor: number;
    largo: number;
    corrimiento: number;
    corrimientoMax: number;
    sobranteA: number;
    sobranteB: number;
  } | null {
    const obj = this.objects.get(objId);
    if (!obj) return null;
    if (!getDefinition(obj.componentId)?.ejePasante) return null;
    const { mejor } = this.candidatosCalce(obj);
    if (!mejor) return null;
    const { poste, origen, eje, paso, fase, lim, ejePin } = mejor;
    if (!ejePin) return null;
    // Medida de una pieza a lo largo de una dirección del mundo: se proyectan
    // sus tres ejes locales. La caja de mundo no vale — una pieza girada da
    // una caja inflada, y aquí se mide acero, no envolventes.
    const anchoSegun = (o: SceneObject, e: THREE.Vector3): number => {
      const t = o.localSizeAbs();
      o.mesh.updateMatrixWorld();
      const q = o.mesh.quaternion;
      return (
        t.x * Math.abs(new THREE.Vector3(1, 0, 0).applyQuaternion(q).dot(e)) +
        t.y * Math.abs(new THREE.Vector3(0, 1, 0).applyQuaternion(q).dot(e)) +
        t.z * Math.abs(new THREE.Vector3(0, 0, 1).applyQuaternion(q).dot(e))
      );
    };
    const grosor = anchoSegun(poste, ejePin);
    const largo = anchoSegun(obj, ejePin);
    const corrimiento = obj.params.pinOffsetCm ?? 0;
    // Numeración de agujeros: la misma de `estadoCalce` — el 1 es el de abajo.
    const s = obj.mesh.position.clone().sub(origen).dot(eje);
    const kMin = Math.ceil((-lim - fase) / paso - 1e-6);
    const kMax = Math.floor((lim - fase) / paso + 1e-6);
    const k = Math.max(kMin, Math.min(kMax, Math.round((s - fase) / paso)));
    const r = Math.max(obj.params.radiusTop ?? 0, obj.params.radiusBottom ?? 0);
    const red = (v: number) => +v.toFixed(2);
    return {
      agujero: k - kMin + 1,
      total: Math.max(0, kMax - kMin + 1),
      calzado: Math.abs(fase + k * paso - s) <= 1,
      diaAgujero: this.diametroPinhole(poste),
      diaPin: red(r * 2),
      grosor: red(grosor),
      largo: red(largo),
      corrimiento: red(corrimiento),
      corrimientoMax: red(Math.max(0, (largo - grosor) / 2)),
      // El pasador ocupa [c − L/2, c + L/2] sobre el eje del agujero y la viga
      // [−t/2, +t/2]: lo que asoma por cada punta es la diferencia.
      sobranteA: red(corrimiento + largo / 2 - grosor / 2),
      sobranteB: red(largo / 2 - corrimiento - grosor / 2),
    };
  }

  /**
   * CORRIMIENTO DEL PASADOR (v0.3.7): cuánto se corre a lo largo del agujero.
   * Se guarda en la pieza y se vuelve a asentar en el mismo agujero, de modo
   * que la barra se desliza por el pinhole sin cambiar de altura — que es
   * exactamente lo que se hace con un pin real cuando se quiere más apoyo por
   * un lado. Devuelve un aviso si no pudo; null si quedó puesto.
   */
  correrPasante(objId: string, cm: number): string | null {
    const obj = this.objects.get(objId);
    if (!obj) return "Pieza no encontrada";
    if (!getDefinition(obj.componentId)?.ejePasante) {
      return tt("Esta pieza no atraviesa agujeros.", "This piece does not go through holes.");
    }
    obj.params.pinOffsetCm = +cm.toFixed(3);
    return this.calcePorAgujero(objId, 0);
  }

  /**
   * ESTADO del calce para el panel de Propiedades: en qué AGUJERO (1..X,
   * numerados desde abajo) está calzada la pieza y cuántos pinholes tiene
   * en total el poste más cercano. `calzada` es false si la pieza no está
   * asentada sobre una fila de la grilla (a más de 1 cm). Devuelve null si
   * no hay poste con grilla cerca. (Las reglas de grilla son las mismas de
   * calcePorAgujero — biblioteca por holeStepCm, vigas trazadas por sus
   * parámetros de pinholes.)
   */
  estadoCalce(objId: string): { agujero: number; total: number; calzada: boolean } | null {
    const obj = this.objects.get(objId);
    if (!obj) return null;
    const centro = obj.mesh.position;
    const tam = obj.effectiveSize();
    const maxTam = Math.max(tam.x, tam.y, tam.z);
    interface GrillaCerca {
      origen: THREE.Vector3;
      eje: THREE.Vector3;
      paso: number;
      fase: number;
      lim: number;
      lateral: number;
    }
    const cercanas: GrillaCerca[] = [];
    for (const o of this.objects.values()) {
      if (o === obj) continue;
      // Ejes LOCALES rotados al mundo (mismas reglas que calcePorAgujero).
      const so = o.localSize();
      const dims: [number, THREE.Vector3][] = [
        [so.x, new THREE.Vector3(1, 0, 0)],
        [so.y, new THREE.Vector3(0, 1, 0)],
        [so.z, new THREE.Vector3(0, 0, 1)],
      ];
      dims.sort((a, b) => b[0] - a[0]);
      const largo = dims[0][0];
      const defPoste = getDefinition(o.componentId);
      // Viga DOBLADA: cada tramo recto con pinholes es su propia grilla
      // (mismas reglas que calcePorAgujero — caras inclinadas incluidas).
      if (!defPoste?.holeStepCm && o.params.kind === "beam" && !pathIsStraight(o.params.path)) {
        const grosor = o.params.width ?? 5;
        o.mesh.updateMatrixWorld(true);
        for (const tr of tramosCalce(o.params)) {
          const origen = o.mesh.localToWorld(tr.centro.clone());
          const eje = tr.dir.clone().applyQuaternion(o.mesh.quaternion).normalize();
          if (eje.y < 0) eje.negate();
          const delta = centro.clone().sub(origen);
          const lateral = delta.clone().addScaledVector(eje, -delta.dot(eje)).length();
          const axial = Math.abs(delta.dot(eje));
          const tol = grosor / 2 + maxTam / 2 + 30;
          if (lateral > tol || axial > tr.largo / 2 + 10) continue;
          cercanas.push({ origen, eje, paso: tr.paso, fase: tr.fase, lim: tr.lim, lateral });
        }
        continue;
      }
      let paso: number;
      let fase: number;
      let lim: number;
      if (defPoste?.holeStepCm) {
        paso = defPoste.holeStepCm;
        fase = defPoste.calceFase ?? 0;
        // Hasta donde llegan los agujeros DE VERDAD. Si la malla se sondeó,
        // manda su recuento de filas; si no, la rejilla es sintética y llega
        // casi al extremo, que es lo que había para todas. Sin este tope, la
        // rejilla se inventaba agujeros: la media columna POWERRACK anunciaba
        // 19 donde la malla tiene 10, y la jota podía subir medio metro por
        // encima del último pinhole, calzada sobre acero macizo.
        lim = defPoste.calceFilas
          ? ((defPoste.calceFilas - 1) / 2) * defPoste.holeStepCm + 0.01
          : largo / 2 - 2;
      } else if (o.params.kind === "beam" && (o.params.holeDiameter ?? 0) > 0.1) {
        const holeR = (o.params.holeDiameter ?? 0) / 2;
        const spacing = Math.max(o.params.holeSpacing ?? 5, holeR * 2 + 0.5);
        const ancho = o.params.width ?? 5;
        const margen = (o.params.ends === "diagonal" ? ancho : ancho / 2) + holeR;
        const usable = largo - 2 * margen;
        const count = Math.floor(usable / spacing) + 1;
        if (count < 1 || usable < 0) continue;
        paso = spacing;
        fase = count % 2 === 1 ? 0 : spacing / 2;
        lim = ((count - 1) / 2) * spacing + 0.01;
      } else {
        continue;
      }
      const eje = dims[0][1].applyQuaternion(o.mesh.quaternion).normalize();
      if (eje.y < 0) eje.negate();
      const delta = centro.clone().sub(o.mesh.position);
      const lateral = delta.clone().addScaledVector(eje, -delta.dot(eje)).length();
      const axial = Math.abs(delta.dot(eje));
      const tol = dims[1][0] / 2 + maxTam / 2 + 30;
      if (lateral > tol || axial > largo / 2 + 10) continue;
      cercanas.push({ origen: o.mesh.position.clone(), eje, paso, fase, lim, lateral });
    }
    if (cercanas.length === 0) return null;
    // Filas de la grilla: k entero con -lim ≤ fase + k·paso ≤ lim; el
    // agujero 1 es el de MÁS ABAJO del poste/tramo. Entre varias grillas
    // cercanas (los tramos facetados de una comba suave son casi
    // colineales) se PREFIERE aquella donde la pieza está realmente
    // ASENTADA en una fila — el panel reporta la grilla que la sostiene.
    let mejor: { agujero: number; total: number; calzada: boolean } | null = null;
    let mejorPuntaje = Infinity;
    for (const g of cercanas) {
      const s = centro.clone().sub(g.origen).dot(g.eje);
      const kMin = Math.ceil((-g.lim - g.fase) / g.paso - 1e-6);
      const kMax = Math.floor((g.lim - g.fase) / g.paso + 1e-6);
      const total = kMax - kMin + 1;
      if (total < 1) continue;
      const k = Math.max(kMin, Math.min(kMax, Math.round((s - g.fase) / g.paso)));
      const calzada = Math.abs(g.fase + k * g.paso - s) <= 1;
      const puntaje = g.lateral + (calzada ? 0 : 10_000);
      if (puntaje < mejorPuntaje) {
        mejorPuntaje = puntaje;
        mejor = { agujero: k - kMin + 1, total, calzada };
      }
    }
    return mejor;
  }

  /**
   * BRAZO MÓVIL articulado a un ANCLAJE DE CADENA (jota-pr): una estructura
   * tubular o tipo pilar se convierte en brazo/péndulo accesorio, anclado
   * INDIRECTAMENTE al pilar de la máquina a través del anclaje (que calza en
   * los pinholes). El pivote se traza desde el nodo del extremo del brazo
   * más cercano al anclaje elegido; el eje de giro es el del pin del
   * anclaje. El brazo puede portar roldanas (soldador), cables/piolas,
   * cuernos de carga o cualquier mecanismo — se mueven con él.
   * Devuelve un aviso si no puede; null si la articulación quedó creada.
   */
  articularBrazo(objId: string): string | null {
    const obj = this.objects.get(objId);
    if (!obj) return "Pieza no encontrada";

    // Extremos del brazo a lo largo de su eje más largo.
    const tam = obj.localSize();
    const dims: [number, THREE.Vector3][] = [
      [tam.x, new THREE.Vector3(1, 0, 0)],
      [tam.y, new THREE.Vector3(0, 1, 0)],
      [tam.z, new THREE.Vector3(0, 0, 1)],
    ];
    dims.sort((a, b) => b[0] - a[0]);
    const ejeLargo = dims[0][1].applyQuaternion(obj.mesh.quaternion).normalize();
    const medio = dims[0][0] / 2;
    const extremos = [
      obj.mesh.position.clone().addScaledVector(ejeLargo, medio),
      obj.mesh.position.clone().addScaledVector(ejeLargo, -medio),
    ];

    // Anclaje de cadena más cercano a cualquiera de los dos extremos. El
    // pivote es su CILINDRO horizontal (pivoteLocal), no el centro del cuerpo.
    let anclaje: SceneObject | null = null;
    let puntoPivote: THREE.Vector3 | null = null;
    let mejorDist = 40; // alcance del trazado (cm)
    for (const o of this.objects.values()) {
      if (o === obj || o.componentId !== "jota-pr") continue;
      const piv = getDefinition(o.componentId)?.pivoteLocal ?? [0, 0];
      o.mesh.updateMatrixWorld(true);
      const cilindro = o.mesh.localToWorld(new THREE.Vector3(piv[0], 0, piv[1]));
      for (const ext of extremos) {
        const d = ext.distanceTo(cilindro);
        if (d < mejorDist) {
          mejorDist = d;
          anclaje = o;
          puntoPivote = cilindro.clone();
        }
      }
    }
    if (!anclaje || !puntoPivote) {
      return tt(
        "No hay un «Anclaje de cadena POWERRACK» cerca de los extremos del brazo: coloca uno (calzado al pilar) junto al extremo que quieres articular.",
        "There is no POWERRACK chain anchor near the arm's ends: place one (latched to the post) next to the end you want to articulate.",
      );
    }

    // El brazo pasa a ser MÓVIL (péndulo) si aún era fijo.
    obj.physics = {
      ...obj.physics,
      fixed: false,
      massKg: obj.physics.massKg > 0 ? obj.physics.massKg : 4,
    };

    // Pivote en el CILINDRO-PIVOTE del anclaje; el eje de giro es el del
    // cilindro (ejePivote, PERPENDICULAR al pin de calce): el eje global más
    // próximo a esa dirección.
    const defAnclaje = getDefinition(anclaje.componentId);
    const ejePivoteLocal =
      (defAnclaje?.ejePivote ?? defAnclaje?.frenteCalce ?? "z") === "x"
        ? new THREE.Vector3(1, 0, 0)
        : new THREE.Vector3(0, 0, 1);
    const dirPivote = ejePivoteLocal.applyQuaternion(anclaje.mesh.quaternion);
    const eje: AxisName = Math.abs(dirPivote.x) >= Math.abs(dirPivote.z) ? "x" : "z";
    const joint = this.connect(anclaje.id, obj.id, "revolute", puntoPivote);
    if (!joint) return "No se pudo crear la articulación";
    joint.axis = eje;
    joint.name = tt("Brazo articulado", "Articulated arm");
    joint.locked = false;
    // Péndulo LIBRE alrededor del cilindro (los límites por defecto de las
    // bisagras acotan a [-90°, 0°] y forzarían el brazo fuera de su caída);
    // el usuario puede acotar el recorrido después en Conexiones.
    joint.limitsEnabled = false;
    this.refreshJointHelpers();
    this.bus.emit("jointsChanged", { joints: this.listJoints() });
    this.scheduleAutosave();
    this.requestRender();
    return null;
  }

  /**
   * REANCLA una pieza de línea RECTA a su trayectoria (v0.2.20): la
   * geometría recta se construye CENTRADA en el origen local, así que al
   * ESTIRAR un extremo el reconstruido repartía el nuevo largo hacia ambos
   * lados — el extremo CONTRARIO se acortaba solo. Tras editar un nodo, el
   * path se re-centra en su cuerda y el origen de la pieza absorbe el
   * corrimiento: el extremo contrario no se mueve ni un milímetro.
   */
  private normalizarPathRecto(obj: SceneObject): void {
    const path = obj.params.path;
    if (!path || path.length < 2 || !pathIsCollinear(path)) return;
    const a = [...path[0]] as [number, number, number];
    const b = [...path[path.length - 1]] as [number, number, number];
    // REPARTO de los nodos intermedios (v0.2.90). El largo de una pieza recta
    // es el de su POLILÍNEA. Al acortar un poste tirando de la punta hacia
    // dentro, los nodos de en medio se quedaban donde estaban —ahora PASADOS
    // del extremo—, la polilínea iba y volvía, y la pieza CRECÍA en vez de
    // menguar. Repartidos por la cuerda, el largo vuelve a ser la distancia
    // entre extremos, que es lo que el usuario está viendo y arrastrando.
    for (let i = 1; i < path.length - 1; i++) {
      const t = i / (path.length - 1);
      path[i] = [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
      ];
    }
    const mid = new THREE.Vector3(
      (a[0] + b[0]) / 2,
      (a[1] + b[1]) / 2,
      (a[2] + b[2]) / 2,
    );
    if (mid.lengthSq() < 1e-8) return;
    for (const n of path) {
      n[0] -= mid.x;
      n[1] -= mid.y;
      n[2] -= mid.z;
    }
    obj.mesh.position.add(
      mid.multiply(obj.mesh.scale).applyQuaternion(obj.mesh.quaternion),
    );
    obj.mesh.updateMatrixWorld(true);
  }

  /** Desplaza el nodo activo del modo Doblar en un delta de MUNDO (cm). */
  private nudgeBendNode(dx: number, dy: number, dz: number): void {
    const obj = this.bendTarget;
    const idx = this.bendNodeIndex;
    if (!obj || idx === null) return;
    const path = obj.params.path;
    if (!path || !path[idx]) return;
    obj.mesh.updateMatrixWorld(true);
    const world = new THREE.Vector3(path[idx][0], path[idx][1], path[idx][2]).applyMatrix4(
      obj.mesh.matrixWorld,
    );
    world.add(new THREE.Vector3(dx, dy, dz));
    // Imán del soldador también con los cursores (misma regla que al arrastrar).
    const soldadura = this.puntoSoldadura(world, obj);
    if (soldadura && soldadura.punto.distanceTo(world) < 1.5) {
      world.copy(soldadura.punto);
      this.snap.showIndicator(soldadura.punto);
      this.crearSoldadura(obj, soldadura.objeto.id, soldadura.punto);
    } else {
      this.snap.hideIndicator();
    }
    const local = world.applyMatrix4(obj.mesh.matrixWorld.clone().invert());
    path[idx] = [local.x, local.y, local.z];
    this.normalizarPathRecto(obj);
    obj.rebuildGeometry();
    this.refreshBendHandles();
    this.bus.emit("objectTransformed", { object: obj });
    this.emitDragMeasure(new THREE.Vector3(dx, dy, dz));
    this.scheduleAutosave();
    this.requestRender();
  }

  /**
   * Inserta un prefab ESTRUCTURADO del usuario (.json exportado desde la app)
   * y devuelve las ADVERTENCIAS de fidelidad: piezas cuyas dimensiones ya no
   * coinciden con la biblioteca actual (control `dims` del formato v2).
   */
  insertarPrefab(
    data: { label: string; piezas: PiezaSpec[]; uniones?: UnionSpec[]; cables?: CableSpec[] },
    at = new THREE.Vector3(),
  ): string[] {
    const ids = construirPiezas(this, data.piezas, data.label, at);
    if (data.uniones) {
      aplicarUniones(this, ids, data.uniones, at);
      this.migrarContactosBisagra(new Set());
    }
    if (data.cables) aplicarCables(this, ids, data.cables);
    const avisos: string[] = [];
    for (let i = 0; i < data.piezas.length && i < ids.length; i++) {
      const p = data.piezas[i];
      if (!p.dims) continue;
      const obj = this.objects.get(ids[i]);
      if (!obj) continue;
      const s = obj.effectiveSize();
      const esperado = p.dims;
      const tol = Math.max(1.5, 0.05 * Math.max(...esperado));
      if (
        Math.abs(s.x - esperado[0]) > tol ||
        Math.abs(s.y - esperado[1]) > tol ||
        Math.abs(s.z - esperado[2]) > tol
      ) {
        avisos.push(
          `${p.nombre ?? p.comp}: mide ${s.x.toFixed(1)}×${s.y.toFixed(1)}×${s.z.toFixed(1)} y el prefab esperaba ${esperado[0]}×${esperado[1]}×${esperado[2]}`,
        );
      }
    }
    if (avisos.length > 0) {
      this.avisoTemporal(
        tt(
          `⚠ ${avisos.length} pieza(s) difieren de la biblioteca actual (ver consola)`,
          `⚠ ${avisos.length} piece(s) differ from the current library (see console)`,
        ),
      );
      console.warn("Prefab: discrepancias de fidelidad:", avisos);
    }
    if (ids.length >= 2) {
      const gid = this.createGroupFromIds(ids);
      if (gid) this.renameGroup(gid, data.label);
    }
    this.scheduleAutosave();
    this.requestRender();
    return avisos;
  }

  /** Acceso de solo lectura a una pieza por id (prefabs v2, herramientas). */
  getObject(id: string): SceneObject | undefined {
    return this.objects.get(id);
  }

  addComponent(componentId: string, position?: THREE.Vector3): SceneObject {
    // Las piezas RETIRADAS (polea, bloque de poleas, leva) se resuelven a su
    // sustituta —la roldana—, así que un proyecto o prefab antiguo abre
    // completo en lugar de perder esas piezas.
    const def = getDefinition(componentId);
    if (!def) throw new Error(`Componente desconocido: ${componentId}`);

    const count = [...this.objects.values()].filter(
      (o) => o.componentId === componentId,
    ).length;
    const obj = new SceneObject({
      name: count > 0 ? `${def.label} ${count + 1}` : def.label,
      componentId: def.id,
      category: def.category,
      // COPIA PROFUNDA (v0.2.20): los defaults se compartían POR REFERENCIA
      // — doblar por nodos una pieza mutaba el `path` del propio default de
      // la biblioteca y cada pieza nueva nacía ya deformada y descentrada.
      params: structuredClone(def.defaults),
      physics: def.physics,
      materialId: def.materialId,
      stack: def.stack,
      carga: def.cargaDiscos,
    });

    // Si la biblioteca tiene un modelo 3D para este componente, sustituye la
    // primitiva por él.
    const override = componentModels.geometryClone(def.id);
    if (override) obj.applyCustomGeometry(override);

    // Apoya la base del objeto sobre el suelo (y=0).
    const size = obj.effectiveSize();
    let alturaBase = size.y / 2;
    if (def.orientacion) {
      // Orientación natural de inserción (auditoría de biblioteca).
      obj.mesh.rotation.set(def.orientacion[0], def.orientacion[1], def.orientacion[2]);
      obj.mesh.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(obj.mesh);
      alturaBase = (bb.max.y - bb.min.y) / 2;
    }
    obj.mesh.position.copy(position ?? new THREE.Vector3(0, alturaBase, 0));

    this.sceneManager.content.add(obj.mesh);
    this.objects.set(obj.id, obj);
    this.bus.emit("objectsChanged", { objects: this.listObjects() });
    this.select(obj);
    return obj;
  }

  removeObject(obj: SceneObject): void {
    if (this.bendTarget === obj) this.endBendNodes();
    if (this.selected === obj) this.select(null);
    // Una guía borrada deja de administrar nada.
    if (this.guiasAdmin.delete(obj.id)) {
      this.bus.emit("vinculacionChanged", { guias: this.guiasAdministradas() });
    }
    // Elimina las articulaciones y cables que referencian a este objeto.
    for (const j of this.listJoints()) {
      if (j.bodyAId === obj.id || j.bodyBId === obj.id) this.joints.delete(j.id);
    }
    for (const c of this.listCables()) {
      if (c.nodes.some((n) => n.objectId === obj.id)) this.cables.delete(c.id);
    }
    // Elimina las cuerdas ancladas al objeto.
    for (const r of this.listRopes()) {
      if (r.a.objectId === obj.id || r.b.objectId === obj.id) this.deleteRope(r.id);
    }
    // Limpia membresia de grupo y multiseleccion.
    this.multiSel.delete(obj.id);
    const gid = this.objGroup.get(obj.id);
    if (gid) {
      this.objGroup.delete(obj.id);
      const g = this.groups.get(gid);
      if (g) {
        g.ids = g.ids.filter((x) => x !== obj.id);
        if (g.ids.length < 2) {
          g.ids.forEach((x) => this.objGroup.delete(x));
          this.groups.delete(gid);
          if (this.selectedGroupId === gid) this.selectedGroupId = null;
        }
      }
    }
    this.sceneManager.content.remove(obj.mesh);
    obj.dispose();
    this.objects.delete(obj.id);
    this.refreshJointHelpers();
    this.bus.emit("jointsChanged", { joints: this.listJoints() });
    this.bus.emit("cablesChanged", { cables: this.listCables() });
    this.bus.emit("objectsChanged", { objects: this.listObjects() });
  }

  /** Crea una copia de `src` (sin seleccionarla) con un desplazamiento opcional. */
  private duplicateObject(src: SceneObject, offset: THREE.Vector3): SceneObject {
    let obj: SceneObject;
    if (src.imported || src.componentId.startsWith("ws-")) {
      // Las piezas importadas no existen en la biblioteca: se clona su malla.
      obj = new SceneObject({
        name: `${src.name} copia`,
        componentId: src.componentId,
        category: src.category,
        params: { ...src.params },
        physics: { ...src.physics },
        materialId: src.materialId,
        importedGeometry: src.mesh.geometry.clone(),
      });
      this.sceneManager.content.add(obj.mesh);
      this.objects.set(obj.id, obj);
      this.bus.emit("objectsChanged", { objects: this.listObjects() });
    } else {
      obj = this.addComponent(src.componentId);
      // Copia profunda del path: si se comparte, doblar la copia doblaria la original.
      obj.params = {
        ...src.params,
        path: src.params.path?.map((n) => [...n] as [number, number, number]),
        // LOS ANCLAJES NO SE COPIAN (v0.3.4). Apuntan por id a las dos piezas
        // que sostienen la guía ORIGINAL: la copia quedaba amarrada a las
        // mismas, y al tocar el bastidor saltaba encima de ella. Duplicar un
        // rail es justo como se hace el segundo, así que la copia nace suelta
        // y se vuelve a amarrar tendiéndola.
        anclajes: undefined,
      };
      if (src.stack) obj.stack = { ...src.stack };
      obj.rebuildGeometry();
    }
    obj.setMaterial(src.materialId);
    // Máquina estándar SUSTITUIDA: la copia también es esa máquina. Sin esto la
    // copia quedaba con la caja gris del `prim-box` que le sirve de soporte.
    aplicarModeloMaquina(obj, src.modeloMaquina);
    obj.physics = { ...src.physics };
    obj.mesh.position.copy(src.mesh.position).add(offset);
    obj.mesh.quaternion.copy(src.mesh.quaternion);
    obj.mesh.scale.copy(src.mesh.scale);
    return obj;
  }

  duplicateSelected(): void {
    if (this.selectedGroupId) {
      this.duplicateSelectedGroup();
      return;
    }
    // MULTISELECCIÓN. Faltaba: con varias piezas marcadas con Ctrl+clic,
    // `this.selected` es null y el Ctrl+D se iba por el `return` sin hacer
    // nada ni decirlo, que desde fuera se ve como que la aplicación se colgó.
    // Las copias quedan seleccionadas, que es lo que uno espera para moverlas
    // en bloque a continuación.
    if (!this.selected && this.multiSel.size >= 2) {
      const copias: SceneObject[] = [];
      for (const id of [...this.multiSel]) {
        const src = this.objects.get(id);
        if (src) copias.push(this.duplicateObject(src, new THREE.Vector3(20, 0, 20)));
      }
      if (!copias.length) return;
      this.select(null);
      for (const id of this.multiSel) {
        const o = this.objects.get(id);
        if (o) this.setHighlight(o, false);
      }
      this.multiSel = new Set(copias.map((o) => o.id));
      for (const o of copias) this.setHighlight(o, true);
      this.refreshMultiGizmo(true);
      this.bus.emit("selectionChanged", { selected: null });
      this.bus.emit("groupingChanged", { multi: this.multiSel.size, groupSelected: false });
      for (const o of copias) this.bus.emit("objectTransformed", { object: o });
      return;
    }
    if (!this.selected) return;
    const obj = this.duplicateObject(this.selected, new THREE.Vector3(20, 0, 20));
    this.bus.emit("objectTransformed", { object: obj });
  }

  /** Duplica el grupo seleccionado (copia todas sus piezas y las reagrupa). */
  duplicateSelectedGroup(): void {
    const gid = this.selectedGroupId;
    const g = gid ? this.groups.get(gid) : null;
    if (!g) return;
    const offset = new THREE.Vector3(20, 0, 20);
    const newIds: string[] = [];
    for (const id of g.ids) {
      const src = this.objects.get(id);
      if (src) newIds.push(this.duplicateObject(src, offset).id);
    }
    this.createGroupFromIds(newIds);
  }

  /** Renombra el grupo seleccionado (o por id). */
  renameGroup(id: string, name: string): void {
    const g = this.groups.get(id);
    if (!g || !name.trim()) return;
    g.name = name.trim();
    if (this.selectedGroupId === id) {
      this.bus.emit("groupSelectionChanged", { id, name: g.name });
    }
  }

  /**
   * Voltea (espeja) el objeto seleccionado en un eje LOCAL (v0.2.32).
   *
   * El volteo se hornea en la geometría en lugar de aplicar una escala
   * negativa: con escala negativa el gizmo heredaba la matriz invertida y sus
   * flechas dejaban de concordar con el mundo — se arrastraba hacia +X y la
   * pieza se iba a −X. Con el espejo horneado la pieza se ve igual y sus ejes
   * siguen siendo los del mundo.
   */
  flipSelected(axis: "x" | "y" | "z"): void {
    if (!this.selected) return;
    const obj = this.selected;
    this.normalizarEspejo(obj);
    const i = axis === "x" ? 0 : axis === "y" ? 1 : 2;
    const e = obj.espejoActual();
    e[i] = !e[i];
    obj.params.espejo = e.some(Boolean) ? e : undefined;
    obj.rebuildGeometry();
    this.cablesDirty = true;
    this.bus.emit("objectTransformed", { object: obj });
    this.requestRender();
  }

  /**
   * MIGRACIÓN de piezas volteadas con escala negativa (proyectos y prefabs
   * anteriores a v0.2.32): pasa el signo de la escala a `params.espejo` y deja
   * la escala positiva, para que el gizmo vuelva a concordar con el mundo.
   */
  normalizarEspejo(obj: SceneObject): void {
    const s = obj.mesh.scale;
    const neg: [boolean, boolean, boolean] = [s.x < 0, s.y < 0, s.z < 0];
    if (!neg[0] && !neg[1] && !neg[2]) return;
    const e = obj.espejoActual();
    for (let i = 0; i < 3; i++) if (neg[i]) e[i] = !e[i];
    obj.params.espejo = e.some(Boolean) ? e : undefined;
    s.set(Math.abs(s.x), Math.abs(s.y), Math.abs(s.z));
    obj.rebuildGeometry();
  }

  // ------------------------------------------- espacio de trabajo (v0.2.0)
  getWorkspace(): WorkspaceData | null {
    return this.workspace;
  }

  /**
   * Define el espacio de trabajo del proyecto (asistente de Nuevo). Con canvas
   * "completo" dibuja el área de suelo operable y, con `crearPiezas`, genera el
   * techo (capa oscura copia del suelo, con altura y pendiente propias) y las
   * paredes como piezas ancladas REALES: sirven de superficie de anclaje para
   * articulaciones, cables y cuerdas, y participan en la simulación.
   */
  setWorkspace(ws: WorkspaceData | null, opts: { crearPiezas?: boolean } = {}): void {
    this.workspace = ws
      ? {
          ...ws,
          techo: ws.techo ? { ...ws.techo } : null,
          paredes: ws.paredes ? [...ws.paredes] : [],
          planta: ws.planta ? ws.planta.map((p) => [...p] as [number, number]) : undefined,
        }
      : null;
    // Con planta poligonal: céntrala en el origen y deriva ancho/fondo del bbox
    // (los usan el techo con pendiente y el descarte rápido de límites).
    const planta = this.workspace?.planta;
    if (planta && planta.length >= 3) {
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (const [x, z] of planta) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
      }
      const cx = (minX + maxX) / 2;
      const cz = (minZ + maxZ) / 2;
      for (const p of planta) { p[0] -= cx; p[1] -= cz; }
      this.workspace!.ancho = maxX - minX;
      this.workspace!.fondo = maxZ - minZ;
    }
    this.rebuildWorkspaceVisual();
    if (this.workspace?.canvas === "completo" && opts.crearPiezas) {
      this.crearPiezasEntorno(this.workspace);
    }
    this.checkWorkspaceBounds();
    this.bus.emit("workspaceChanged", { workspace: this.workspace });
    this.requestRender();
  }

  /**
   * Contorno del suelo operable (cm, plano XZ). Con planta dibujada es ese
   * polígono; si no, el rectángulo ancho×fondo. Null si el canvas es libre.
   */
  private wsPlanta(): [number, number][] | null {
    const ws = this.workspace;
    if (!ws || ws.canvas !== "completo") return null;
    if (ws.planta && ws.planta.length >= 3) return ws.planta;
    if (!ws.ancho || !ws.fondo) return null;
    const hx = ws.ancho / 2;
    const hz = ws.fondo / 2;
    return [
      [-hx, -hz],
      [hx, -hz],
      [hx, hz],
      [-hx, hz],
    ];
  }

  /** ¿El punto XZ cae dentro de la planta (con tolerancia eps hacia fuera)? */
  private dentroPlanta(
    planta: [number, number][],
    x: number,
    z: number,
    eps: number,
  ): boolean {
    // Ray casting par-impar.
    let dentro = false;
    for (let i = 0, j = planta.length - 1; i < planta.length; j = i++) {
      const [xi, zi] = planta[i];
      const [xj, zj] = planta[j];
      if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) dentro = !dentro;
    }
    if (dentro || eps <= 0) return dentro;
    // Tolerancia: distancia mínima del punto a los bordes del polígono.
    for (let i = 0, j = planta.length - 1; i < planta.length; j = i++) {
      const [ax, az] = planta[j];
      const [bx, bz] = planta[i];
      const dx = bx - ax;
      const dz = bz - az;
      const l2 = dx * dx + dz * dz;
      const t = l2 > 0 ? THREE.MathUtils.clamp(((x - ax) * dx + (z - az) * dz) / l2, 0, 1) : 0;
      const px = ax + t * dx;
      const pz = az + t * dz;
      if (Math.hypot(x - px, z - pz) <= eps) return true;
    }
    return false;
  }

  /** Contorno + relleno translúcido del suelo operable (no se serializa). */
  private rebuildWorkspaceVisual(): void {
    if (this.workspaceVisual) {
      this.sceneManager.scene.remove(this.workspaceVisual);
      this.workspaceVisual.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        (m.material as THREE.Material | undefined)?.dispose?.();
      });
      this.workspaceVisual = null;
    }
    const planta = this.wsPlanta();
    // El suelo del canvas completo tiene el MISMO aspecto que el estándar
    // (gris + rejilla + logo) pero recortado a la planta (v0.2.1).
    this.sceneManager.setCustomGround(planta);
    if (!planta) return;
    // Contorno fino del área operable como única señal adicional.
    const g = new THREE.Group();
    g.name = "workspace-area";
    const pts = planta.map(([x, z]) => new THREE.Vector3(x, 0.4, z));
    g.add(
      new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0x12808c }),
      ),
    );
    this.sceneManager.scene.add(g);
    this.workspaceVisual = g;
  }

  private static readonly GROSOR_ENTORNO = 6;

  /** Bloque del techo: copia fiel de la planta extruida (grosor en Y). */
  private geometriaTecho(): THREE.BufferGeometry | null {
    const planta = this.wsPlanta();
    if (!planta) return null;
    // El techo es una CARA PLANA (no un prisma): geometría simple y
    // homogénea con las paredes — copia fiel de la planta, sin grosor.
    const shape = new THREE.Shape(planta.map(([x, z]) => new THREE.Vector2(x, -z)));
    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2); // la planta queda en el plano XZ
    geo.center(); // pivote en el centro (colocación e inclinación)
    geo.computeVertexNormals();
    return geo;
  }

  /**
   * Crea la pieza "Techo" (componentId ws-techo): geometría propia regenerable
   * desde el workspace, anclada y anclable como cualquier otra pieza.
   */
  private crearTechoBase(): SceneObject {
    const geo = this.geometriaTecho();
    const ws = this.workspace;
    if (!geo || !ws) throw new Error("Sin planta de suelo para el techo");
    const obj = new SceneObject({
      name: "Techo",
      componentId: "ws-techo",
      category: "estructural",
      params: {
        kind: "box",
        width: ws.ancho ?? 100,
        height: Editor.GROSOR_ENTORNO,
        depth: ws.fondo ?? 100,
      },
      physics: { massKg: 0, fixed: true },
      materialId: "acero-negro",
    });
    obj.mesh.geometry.dispose();
    obj.mesh.geometry = geo;
    obj.customModel = true; // geometría propia: params no la reconstruye
    obj.mesh.name = "Techo";
    this.sceneManager.content.add(obj.mesh);
    this.objects.set(obj.id, obj);
    this.bus.emit("objectsChanged", { objects: this.listObjects() });
    return obj;
  }

  /** Crea techo y paredes como piezas ancladas reales del canvas completo. */
  private crearPiezasEntorno(ws: WorkspaceData): void {
    const planta = this.wsPlanta();
    if (!planta) return;
    const GROSOR = Editor.GROSOR_ENTORNO;
    const t = ws.techo;

    if (t) {
      const techo = this.crearTechoBase();
      const dh = t.alturaB - t.alturaA;
      const L = (t.eje === "x" ? ws.ancho : ws.fondo) || 1;
      const ang = Math.atan2(dh, L);
      // La pendiente sube hacia el extremo B (+X o +Z según el eje elegido).
      // La CARA del techo se posa exactamente en el plano alturaA→alturaB:
      // el mismo plano de techoYAt, así las paredes lo tocan sin holgura.
      if (t.eje === "x") techo.mesh.rotation.z = ang;
      else techo.mesh.rotation.x = -ang;
      techo.mesh.position.set(0, (t.alturaA + t.alturaB) / 2, 0);
    }

    // Paredes: una por cada borde de la planta cuya orientación exterior
    // coincida con un lado marcado (N=+Z, S=−Z, E=+X, O=−X).
    const lados = new Set(ws.paredes ?? []);
    if (lados.size > 0) {
      const usados = new Map<string, number>();
      const NOMBRES: Record<"N" | "S" | "E" | "O", string> = {
        N: "Norte",
        S: "Sur",
        E: "Este",
        O: "Oeste",
      };
      for (let i = 0; i < planta.length; i++) {
        const a = planta[i];
        const b = planta[(i + 1) % planta.length];
        const dx = b[0] - a[0];
        const dz = b[1] - a[1];
        const len = Math.hypot(dx, dz);
        if (len < 20) continue; // bordes minúsculos: sin pared
        // Normal exterior del borde (comprobada contra la propia planta).
        let nx = dz / len;
        let nz = -dx / len;
        const mx = (a[0] + b[0]) / 2;
        const mz = (a[1] + b[1]) / 2;
        if (this.dentroPlanta(planta, mx + nx * 2, mz + nz * 2, 0)) {
          nx = -nx;
          nz = -nz;
        }
        const lado: "N" | "S" | "E" | "O" =
          Math.abs(nx) >= Math.abs(nz) ? (nx > 0 ? "E" : "O") : (nz > 0 ? "N" : "S");
        if (!lados.has(lado)) continue;

        // La pared es una CARA plana del suelo al techo: su tope sigue la
        // inclinación de la techumbre (altura del techo en CADA extremo del
        // borde — prisma trapezoidal, sin huecos arriba ni abajo). Sin
        // techumbre, queda circunscrita a la altura elegida por el usuario.
        const hA = t
          ? Math.max(30, this.techoYAt(a[0], a[1]))
          : ws.alturaParedes ?? 250;
        const hB = t
          ? Math.max(30, this.techoYAt(b[0], b[1]))
          : ws.alturaParedes ?? 250;
        const hMax = Math.max(hA, hB);
        const n = (usados.get(lado) ?? 0) + 1;
        usados.set(lado, n);
        const nombre = `Pared ${NOMBRES[lado]}${n > 1 ? ` ${n}` : ""}`;
        const pos = new THREE.Vector3(
          mx - (nx * GROSOR) / 2,
          hMax / 2,
          mz - (nz * GROSOR) / 2,
        );
        const o = this.addComponent("prim-box", pos);
        o.name = nombre;
        o.mesh.name = nombre;
        // El extremo −X local de la pared cae en el punto a y el +X en b
        // (la rotación Y de abajo mapea +X local a la dirección a→b).
        o.params = { kind: "box", width: len, height: hA, height2: hB, depth: GROSOR };
        o.physics = { massKg: 0, fixed: true };
        o.rebuildGeometry();
        o.setMaterial("acero-negro");
        o.mesh.position.copy(pos);
        o.mesh.rotation.y = Math.atan2(-dz, dx);
      }
    }
    this.select(null);
  }

  /** Techo y paredes generados: forman el espacio, no se validan contra él. */
  private esPiezaEntorno(o: SceneObject): boolean {
    return (
      o.componentId.startsWith("ws-") ||
      o.name === "Techo" ||
      o.name.startsWith("Pared ")
    );
  }

  /** Altura del plano del techo (con pendiente) en un punto del suelo. */
  private techoYAt(x: number, z: number): number {
    const ws = this.workspace;
    if (!ws?.techo || !ws.ancho || !ws.fondo) return Infinity;
    const t = ws.techo;
    const L = t.eje === "x" ? ws.ancho : ws.fondo;
    const c = t.eje === "x" ? x : z;
    const f = THREE.MathUtils.clamp((c + L / 2) / L, 0, 1);
    return t.alturaA + (t.alturaB - t.alturaA) * f;
  }

  /** Marca en rojo las piezas que sobresalen del área/techo del canvas completo. */
  private checkWorkspaceBounds(): void {
    const ws = this.workspace;
    const planta = this.wsPlanta();
    const antes = this.fueraIds.size;
    const nuevas = new Set<string>();
    if (ws && planta) {
      const EPS = 0.5;
      const box = new THREE.Box3();
      for (const o of this.objects.values()) {
        if (this.esPiezaEntorno(o)) continue;
        box.setFromObject(o.mesh);
        if (box.isEmpty()) continue;
        // Las cuatro esquinas XZ del bbox deben caer dentro de la planta.
        let fuera =
          box.min.y < -EPS ||
          !this.dentroPlanta(planta, box.min.x, box.min.z, EPS) ||
          !this.dentroPlanta(planta, box.min.x, box.max.z, EPS) ||
          !this.dentroPlanta(planta, box.max.x, box.min.z, EPS) ||
          !this.dentroPlanta(planta, box.max.x, box.max.z, EPS);
        if (!fuera && ws.techo) {
          const tope = Math.min(
            this.techoYAt(box.min.x, box.min.z),
            this.techoYAt(box.max.x, box.max.z),
          );
          fuera = box.max.y > tope + EPS;
        }
        if (fuera) nuevas.add(o.id);
      }
    }
    const cambiadas = new Set<string>();
    for (const id of this.fueraIds) if (!nuevas.has(id)) cambiadas.add(id);
    for (const id of nuevas) if (!this.fueraIds.has(id)) cambiadas.add(id);
    this.fueraIds = nuevas;
    for (const id of cambiadas) {
      const o = this.objects.get(id);
      if (!o) continue;
      const enGrupo = this.selectedGroupId
        ? (this.groups.get(this.selectedGroupId)?.ids.includes(id) ?? false)
        : false;
      this.setHighlight(o, this.multiSel.has(id) || enGrupo);
    }
    if (antes !== nuevas.size || cambiadas.size > 0) {
      this.bus.emit("workspaceBounds", { fuera: nuevas.size });
      this.requestRender();
    }
  }

  /** Ids de las piezas afectadas por el arrastre actual del gizmo. */
  private gizmoAffectedIds(): string[] {
    if (!this.gizmo.object) return [];
    if (this.gizmo.object === this.groupProxy) {
      if (this.multiSel.size > 0) return [...this.multiSel];
      if (this.selectedGroupId) return [...(this.groups.get(this.selectedGroupId)?.ids ?? [])];
      return [];
    }
    if (this.selected && this.gizmo.object === this.selected.mesh) return [this.selected.id];
    return [];
  }

  /** Antes de un arrastre del gizmo: guarda dónde estaba cada pieza afectada. */
  private captureBoundsRestore(): void {
    this.boundsRestore = null;
    if (this.workspace?.canvas !== "completo") return;
    const map = new Map<string, SavedTransform>();
    for (const id of this.gizmoAffectedIds()) {
      const o = this.objects.get(id);
      if (o && !this.esPiezaEntorno(o)) {
        map.set(id, {
          position: o.mesh.position.clone(),
          quaternion: o.mesh.quaternion.clone(),
          scale: o.mesh.scale.clone(),
        });
      }
    }
    if (map.size > 0) this.boundsRestore = map;
  }

  /**
   * Al soltar un arrastre: si alguna pieza movida quedó fuera del espacio
   * editable, la colocación se cancela y todo vuelve a su posición anterior.
   */
  private enforceWorkspaceBounds(): void {
    const restore = this.boundsRestore;
    this.boundsRestore = null;
    if (!restore) return;
    this.checkWorkspaceBounds();
    const invadidas = [...restore.keys()].some((id) => this.fueraIds.has(id));
    if (!invadidas) return;
    for (const [id, s] of restore) {
      const o = this.objects.get(id);
      if (!o) continue;
      o.mesh.position.copy(s.position);
      o.mesh.quaternion.copy(s.quaternion);
      o.mesh.scale.copy(s.scale);
      this.bus.emit("objectTransformed", { object: o });
    }
    // Recoloca el proxy del grupo/multiselección para no arrastrar deltas falsos.
    if (this.gizmo.object === this.groupProxy) {
      if (this.multiSel.size > 0) this.refreshMultiGizmo();
      else if (this.selectedGroupId) this.selectGroup(this.selectedGroupId);
    }
    this.checkWorkspaceBounds();
    this.avisoFuera();
    this.requestRender();
  }

  /** Aviso temporal en el HUD al cancelar una colocación fuera del área. */
  private avisoFuera(): void {
    this.avisoTemporal(tt("⛔ Fuera del área de trabajo: colocación cancelada", "⛔ Outside the work area: placement cancelled"));
  }

  // ---------------------------------------------------- guardar / cargar
  /** Serializa toda la escena a un objeto JSON. */
  serialize(): ProjectData {
    // Lo que se guarde tiene que llevar las ediciones hechas con la partida a la
    // vista: son del plano, no del ensayo.
    this.reconciliarEdiciones();
    const v3 = (v: THREE.Vector3): [number, number, number] => [v.x, v.y, v.z];
    const q4 = (q: THREE.Quaternion): [number, number, number, number] => [q.x, q.y, q.z, q.w];
    return {
      version: PROJECT_VERSION,
      workspace: this.workspace ?? undefined,
      objects: this.listObjects().filter((o) => !o.imported).map((o) => {
        // Durante la simulación se serializa el estado de DISEÑO (guardado al
        // arrancar la física), no las posiciones simuladas del momento. Y con
        // el gesto parado, si se está VIENDO la partida, se guarda igualmente
        // el plano: el proyecto es el fabricable, y la partida viaja aparte en
        // `startParts`.
        const s = this.simulating
          ? this.saved.get(o.id)
          : this.partidaPintada
            ? (() => {
                const d = this.disenoDePartida?.get(o.id);
                return d ? { position: d.p, quaternion: d.q, scale: o.mesh.scale } : undefined;
              })()
            : undefined;
        return {
          id: o.id,
          name: o.name,
          componentId: o.componentId,
          materialId: o.materialId,
          params: { ...o.params },
          physics: { ...o.physics },
          stack: o.stack ? { ...o.stack } : undefined,
          position: v3(s?.position ?? o.mesh.position),
          quaternion: q4(s?.quaternion ?? o.mesh.quaternion),
          scale: v3(s?.scale ?? o.mesh.scale),
          modeloMaquina: o.modeloMaquina ?? undefined,
        };
      }),
      joints: this.listJoints().map((j) => ({
        name: j.name,
        kind: j.kind,
        bodyAId: j.bodyAId,
        bodyBId: j.bodyBId,
        anchor: v3(j.anchor),
        axis: j.axis,
        axisVec: j.axisVec ? v3(j.axisVec) : null,
        limitsEnabled: j.limitsEnabled,
        min: j.min,
        max: j.max,
        motor: { ...j.motor },
        locked: j.locked,
        contactos: j.contactos || undefined,
      })),
      cables: this.listCables().map((c) => ({
        name: c.name,
        nodes: c.nodes.map((n) => ({ objectId: n.objectId, local: [n.local.x, n.local.y, n.local.z] as [number, number, number] })),
        topes: c.topes.length > 0
          ? c.topes.map((t) => ({ seg: t.seg, dist: t.dist, radio: t.radio }))
          : undefined,
      })),
      ropes: this.listRopes().map((r) => ({
        name: r.name,
        kind: r.kind,
        slack: r.slack,
        a: { objectId: r.a.objectId, local: [r.a.local.x, r.a.local.y, r.a.local.z] as [number, number, number] },
        b: { objectId: r.b.objectId, local: [r.b.local.x, r.b.local.y, r.b.local.z] as [number, number, number] },
      })),
      groups: [...this.groups.values()].map((g) => ({ name: g.name, ids: [...g.ids] })),
      human: {
        present: this.humanFigure !== null,
        mode: this.humanMode,
        heightCm: this.humanHeight,
        position: this.humanFigure ? v3(this.humanFigure.position) : [0, 0, 0],
        quaternion: this.humanFigure ? q4(this.humanFigure.quaternion) : [0, 0, 0, 1],
        pose: this.humanFigure && this.humanMode === "mannequin" ? this.captureCurrentPose() : null,
        hands: [...this.handTargets].map(([side, t]) => ({
          side,
          objectId: t.objectId,
          local: [t.local.x, t.local.y, t.local.z] as [number, number, number],
        })),
        // Pies apoyados en una plataforma o pedal (v0.2.52).
        feet: [...this.footTargets].map(([side, t]) => ({
          side,
          objectId: t.objectId,
          local: [t.local.x, t.local.y, t.local.z] as [number, number, number],
          normal: t.normal
            ? ([t.normal.x, t.normal.y, t.normal.z] as [number, number, number])
            : null,
        })),
        locks: [...this.jointLocks],
        symmetry: this.poseSymmetry,
        // Apoyo, zonas de movimiento y POSTURA DE PARTIDA (v0.2.49): sin
        // ellos, reabrir el proyecto perdía el punto de partida del ejercicio.
        support: this.figuraApoyadaEn,
        supportY: this.alturaDelApoyo,
        backSupport: this.apoyoEspalda,
        lyingOnSupport: this.tumbadaEnElApoyo,
        zones: [...this.zonasActivas].map(([id, side]) => ({ id, side })),
        startPose: this.poseDePartida,
        startPoseName: this.nombreDePartida,
        startPosition: this.transformDePartida ? v3(this.transformDePartida.p) : null,
        startQuaternion: this.transformDePartida ? q4(this.transformDePartida.q) : null,
        // Dónde arranca la MÁQUINA (v0.2.51). Se guarda por índice de pieza,
        // igual que hacen las manos apoyadas, porque los ids se rehacen al
        // cargar. Solo viaja lo que se movió respecto del diseño.
        // BARRA EN MANOS (v0.2.81), por índice como startParts.
        barra: this.barraManiqui
          ? {
              index: this.listObjects().findIndex((o) => o.id === this.barraManiqui?.objectId),
              ejercicio: this.barraManiqui.ejercicio,
              rackeada: this.barraManiqui.rackeada,
            }
          : null,
        startParts: this.partidaPiezas
          ? [...this.partidaPiezas]
              .map(([id, t]) => ({
                index: this.listObjects().findIndex((o) => o.id === id),
                position: v3(t.p),
                quaternion: q4(t.q),
              }))
              .filter((e) => e.index >= 0)
          : null,
      },
      // PUNTOS DE PARTIDA GUARDADOS (v0.2.77). Vivían solo en memoria: se
      // perdían al cerrar y, peor, seguían ofreciéndose tras cargar otro
      // proyecto, apuntando a piezas que ya no existían.
      partidas: [...this.partidasGuardadas].map(([nombre, pt]) => ({
        nombre,
        piezas: pt.piezas
          ? [...pt.piezas]
              .map(([id, t]) => ({
                index: this.listObjects().findIndex((o) => o.id === id),
                position: v3(t.p),
                quaternion: q4(t.q),
              }))
              .filter((e) => e.index >= 0)
          : null,
        pose: pt.pose ? (JSON.parse(JSON.stringify(pt.pose)) as Record<string, [number, number, number]>) : null,
        poseNombre: pt.poseNombre,
        position: pt.pos ? v3(pt.pos) : null,
        quaternion: pt.quat ? q4(pt.quat) : null,
      })),
    };
  }

  /** Exporta el prototipo (las piezas) como GLB binario para otras apps. */
  exportGLB(): Promise<ArrayBuffer> {
    // Las aristas del modo Ver son ayudas visuales: fuera del GLB.
    const teniaAristas = this.edgesOn;
    if (teniaAristas) {
      this.edgesOn = false;
      this.applyViewModes();
    }
    const exporter = new GLTFExporter();
    return new Promise<ArrayBuffer>((resolve, reject) => {
      exporter.parse(
        this.sceneManager.content,
        (result) => resolve(result as ArrayBuffer),
        (err) => reject(err),
        { binary: true },
      );
    }).finally(() => {
      if (teniaAristas) {
        this.edgesOn = true;
        this.applyViewModes();
        this.requestRender();
      }
    });
  }

  /** Importa un modelo 3D (glb/gltf/obj) como una pieza editable. */
  async importModelFile(file: File): Promise<void> {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const root = await loadModelRoot(await file.arrayBuffer(), ext);
    this.addImportedModel(root, file.name.replace(/\.[^.]+$/, ""));
  }

  /** Fusiona las mallas del modelo en una pieza y la anade a la escena. */
  private addImportedModel(root: THREE.Object3D, name: string): void {
    let merged: THREE.BufferGeometry;
    try {
      merged = mergeRootGeometry(root);
    } catch {
      return;
    }

    // Centrar en X/Z y apoyar en el suelo; heuristica metros->cm.
    merged.computeBoundingBox();
    const bb = merged.boundingBox!;
    const size = new THREE.Vector3();
    bb.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = maxDim > 0 && maxDim < 5 ? 100 : 1;

    const obj = new SceneObject({
      name,
      componentId: "imported",
      category: "primitiva",
      params: { kind: "box" },
      physics: { massKg: 1, fixed: false },
      materialId: "generico",
      importedGeometry: merged,
    });
    obj.mesh.scale.setScalar(scale);
    const center = new THREE.Vector3();
    bb.getCenter(center);
    obj.mesh.position.set(-center.x * scale, -bb.min.y * scale, -center.z * scale);

    this.sceneManager.content.add(obj.mesh);
    this.objects.set(obj.id, obj);
    this.bus.emit("objectsChanged", { objects: this.listObjects() });
    this.select(obj);
  }

  /**
   * APAGA TODAS LAS HERRAMIENTAS DE COLOCACIÓN, de una vez.
   *
   * Existe porque la lista se había vuelto imposible de recordar: hay nueve
   * modos que capturan el clic del visor —cable, freno, cuerda, línea, unión,
   * mano, roldana, terminal y placa dentada— y cada sitio que necesitaba
   * apagarlos cancelaba los que su autor tenía en la cabeza ese día.
   *
   * De ahí salieron dos fallos de la auditoría, y los dos se sentían como si la
   * aplicación no obedeciera:
   *
   *   · «+ Bisagra» solo apagaba el cable, así que con la roldana a medias el
   *     botón se iluminaba, el panel anunciaba «clic en la 1.ª pieza» y el clic
   *     siguiente seguía plantando roldanas. Pedías una bisagra y salía otra
   *     cosa.
   *   · `clearScene` solo apagaba el doblado y la línea, así que «Nuevo
   *     proyecto» dejaba la línea guía azul de la roldana flotando sobre una
   *     escena vacía, con la herramienta viva y apuntando a una viga que ya no
   *     existía. Un clic junto a esa línea fantasma plantaba una roldana
   *     entera.
   *
   * Añadir un modo nuevo y olvidarse de esta lista vuelve a abrir el mismo
   * agujero, así que lo que se añada va AQUÍ y no en cada sitio.
   */
  cancelarHerramientas(conservarApoyo = false): void {
    this.cancelCable();
    this.cancelFrenoCable();
    this.cancelRope();
    this.cancelLine();
    this.cancelConnect();
    if (!conservarApoyo) this.cancelAttachHand();
    this.cancelRoldana();
    this.cancelPlacaDentada();
    this.cancelColocarFigura();
    this.endBendNodes();
    // «✋ Agarrar» faltaba aquí, y su rama de onPointerDown hace `return`
    // INCONDICIONAL: con ella encendida el visor se quedaba sordo —ni
    // seleccionar, ni deseleccionar, ni ninguna otra herramienta— y no había
    // manera de apagarla salvo volver a Ergonomía y pulsar el mismo botón.
    this.setGrabFigure(false);
    this.terminarAdministracion();
    this.bus.emit("dialogosCerrar", {});
  }

  /** Vacia la escena (objetos, articulaciones, cables, grupos, figura). */
  clearScene(): void {
    // "Nuevo" con la física corriendo: detenla antes de vaciar (si no, el
    // mundo sigue haciendo step sobre mallas liberadas).
    if (this.simulating) this.stopSimulation();
    this.cancelarHerramientas();
    this.select(null);
    for (const o of this.objects.values()) {
      this.sceneManager.content.remove(o.mesh);
      o.dispose();
    }
    this.objects.clear();
    this.joints.clear();
    this.cables.clear();
    for (const r of this.ropes.values()) {
      this.ropeVisuals.remove(r.group);
      r.dispose();
    }
    this.ropes.clear();
    this.groups.clear();
    this.objGroup.clear();
    this.multiSel.clear();
    this.removeHumanFigure();
    this.jointLocks.clear();
    this.reiniciarZonas();
    // La barra del maniquí se va con las piezas: dejar el enlace vivo apuntaba
    // a un id que ya no existe.
    this.barraManiqui = null;
    this.planActivo = null;
    this.apoyoBarraLocal = null;
    this.bus.emit("barraManiquiChanged", { objectId: null, ejercicio: null, rackeada: false });
    this.partidaPiezas = null;
    this.disenoDePartida = null;
    this.partidaPintada = false;
    // Y los puntos guardados: son de ESTE proyecto. Si sobreviven, el selector
    // sigue ofreciendo los del anterior y aplicarlos manda el maniquí a donde
    // estaba en otra escena.
    this.partidasGuardadas.clear();
    this.bus.emit("partidasChanged", { nombres: [], activa: null });
    this.poseSymmetry = false;
    this.grabDrag = null;
    this.cablesInvalidos.clear();
    this.setWorkspace(null);
    this.refreshJointHelpers();
    this.bus.emit("objectsChanged", { objects: [] });
    this.bus.emit("jointsChanged", { joints: [] });
    this.bus.emit("cablesChanged", { cables: [] });
    // Al deshacer/rehacer, clearScene forma parte de la carga interna y no
    // debe tocar la pila del historial.
    if (!this.applyingHistory) this.resetHistory();
  }

  /**
   * ¿Tiene esto pinta de proyecto? Se mira ANTES de tocar nada.
   *
   * Cargar vaciaba la escena y solo después descubría que el fichero no valía,
   * así que elegir por error un `.json` que no es un proyecto —un prefab
   * exportado desde la propia aplicación, que se llama igual y sale en el mismo
   * selector— avisaba «Archivo de proyecto no válido» con la escena YA vacía y
   * el deshacer borrado. Todo el trabajo sin guardar, perdido por un clic en el
   * fichero de al lado.
   */
  static pareceProyecto(data: unknown): data is ProjectData {
    if (!data || typeof data !== "object") return false;
    const d = data as Partial<ProjectData>;
    return typeof d.version === "number" && Array.isArray(d.objects);
  }

  /** Reemplaza la escena con la de un proyecto serializado. */
  async loadProject(data: ProjectData): Promise<void> {
    // Se comprueba aquí y no solo en quien llama: por debajo, lo primero que
    // hace la carga es vaciar la escena, y de ahí no se vuelve.
    if (!Editor.pareceProyecto(data)) {
      throw new Error("El archivo no es un proyecto de EXERSUITE3D");
    }
    if (this.simulating) this.stopSimulation();
    this.autosaveSuspended = true;
    try {
      await this.loadProjectInner(data);
    } finally {
      this.autosaveSuspended = false;
    }
    this.scheduleAutosave();
    this.dirty = false; // recién cargado = sin cambios
  }

  /**
   * Libera por completo el editor (bucle de render, contexto WebGL, listeners y
   * temporizadores) para volver a la Home sin acumular recursos entre proyectos.
   */
  dispose(): void {
    this.running = false;
    if (this.simulating) this.stopSimulation();
    if (this.viewModesTimer !== null) clearTimeout(this.viewModesTimer);
    if (this.autosaveTimer !== null) clearTimeout(this.autosaveTimer);
    if (this.autosaveInterval !== null) clearInterval(this.autosaveInterval);
    window.removeEventListener("beforeunload", this.onBeforeUnload);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("keydown", this.onKeyDown);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    for (const soltar of this.oyentes) soltar();
    this.oyentes = [];
    this.endBendNodes();
    if (this.placementLine) {
      this.sceneManager.scene.remove(this.placementLine);
      this.placementLine.geometry.dispose();
      (this.placementLine.material as THREE.Material).dispose();
      this.placementLine = null;
    }
    this.unsubModels?.();
    this.unsubSegments?.();
    this.workspace = null;
    this.rebuildWorkspaceVisual();
    this.gizmo.detach();
    // En three r0.169 TransformControls.dispose() puede fallar (el helper visual
    // está separado del control); no debe abortar la limpieza.
    try {
      this.gizmo.dispose();
    } catch {
      /* ignora */
    }
    this.orbit.dispose();
    for (const r of this.ropes.values()) r.dispose();
    this.ropes.clear();
    this.clearRopeTemplates();
    for (const o of this.objects.values()) o.dispose();
    this.objects.clear();
    this.physics?.dispose();
    this.sceneManager.dispose();
  }

  private async loadProjectInner(data: ProjectData): Promise<void> {
    this.clearScene();
    // Las piezas de entorno (techo/paredes) ya vienen en data.objects.
    this.setWorkspace(data.workspace ?? null);
    const idMap = new Map<string, string>();

    for (const od of data.objects) {
      // Un componente desconocido (proyecto de otra versión, JSON editado) no
      // debe abortar la carga del resto de la escena.
      try {
        // El techo del canvas completo regenera su geometría desde el workspace.
        const obj =
          od.componentId === "ws-techo" ? this.crearTechoBase() : this.addComponent(od.componentId);
        obj.name = od.name;
        obj.mesh.name = od.name;
        obj.params = { ...od.params };
        obj.stack = od.stack ? { ...od.stack } : undefined;
        obj.physics = { ...od.physics };
        obj.rebuildGeometry();
        obj.setMaterial(od.materialId);
        // Máquina estándar sustituida: recupera su modelo de la biblioteca.
        aplicarModeloMaquina(obj, od.modeloMaquina);
        obj.mesh.position.fromArray(od.position);
        obj.mesh.quaternion.fromArray(od.quaternion);
        obj.mesh.scale.fromArray(od.scale);
        this.normalizarEspejo(obj);
        idMap.set(od.id, obj.id);
      } catch (err) {
        console.warn(`Se omite la pieza "${od.name}" (${od.componentId}):`, err);
      }
    }

    // ANCLAJES DE LAS GUÍAS (v0.3.3): viajan en los params con el id de la
    // pieza que las sostiene, y al abrir el proyecto cada pieza nace con un id
    // NUEVO. Sin traducirlos, la guía se abría en su sitio pero se quedaba
    // sorda: mover el bastidor ya no la arrastraba.
    for (const o of this.objects.values()) {
      const an = o.params.anclajes;
      if (!an) continue;
      const trad = (e?: { obj: string; local: [number, number, number] }) => {
        if (!e) return undefined;
        const nuevo = idMap.get(e.obj);
        return nuevo ? { obj: nuevo, local: e.local } : undefined;
      };
      const a = trad(an.a);
      const b = trad(an.b);
      o.params.anclajes = a || b ? { a, b } : undefined;
    }

    // Y LOS CANALES (v0.3.10): cada canal tubular recuerda de QUÉ guía es, y
    // ese id se rehacía igual al abrir. El agujero seguía calado —es
    // geometría— así que no se notaba a simple vista, pero el id quedaba
    // huérfano y «administrar vinculación» no podía volver a tocar ese canal:
    // la guía administrada solo rehace los suyos y CONSERVA los ajenos, así
    // que un canal apuntando a una guía fantasma no había forma de quitarlo.
    // Se traducen los que se puedan y se descartan los que ya no apunten a
    // ninguna guía de la escena.
    for (const o of this.objects.values()) {
      const cs = o.params.canales;
      if (!cs?.length) continue;
      const vivos = cs.map((c) => {
        if (!c.guia) return c;
        const nuevo = idMap.get(c.guia);
        return nuevo ? { ...c, guia: nuevo } : { ...c, guia: undefined };
      });
      o.params.canales = vivos;
    }

    const contactosExplicitos = new Set<string>();
    for (const jd of data.joints) {
      const a = idMap.get(jd.bodyAId);
      const b = idMap.get(jd.bodyBId);
      if (!a || !b) continue;
      const j = this.connect(a, b, jd.kind, new THREE.Vector3().fromArray(jd.anchor));
      if (!j) continue;
      if (jd.contactos !== undefined) contactosExplicitos.add(j.id);
      j.name = jd.name;
      j.axis = jd.axis;
      j.axisVec = jd.axisVec ? new THREE.Vector3().fromArray(jd.axisVec).normalize() : null;
      j.limitsEnabled = jd.limitsEnabled;
      j.min = jd.min;
      j.max = jd.max;
      j.motor = { ...jd.motor };
      j.locked = jd.locked ?? false;
      j.contactos = jd.contactos ?? false;
    }
    this.migrarContactosBisagra(contactosExplicitos);

    for (const cd of data.cables) {
      const nodes = cd.nodes
        .map((n) => ({ objectId: idMap.get(n.objectId) ?? "", local: { x: n.local[0], y: n.local[1], z: n.local[2] } }))
        .filter((n) => n.objectId);
      if (nodes.length >= 2) {
        const c = this.createCable(nodes);
        if (c) {
          c.name = cd.name;
          c.topes = (cd.topes ?? []).map((t) => ({ seg: t.seg, dist: t.dist, radio: t.radio }));
        }
      }
    }

    for (const rd of data.ropes ?? []) {
      const remap = (e: { objectId: string | null; local: [number, number, number] }): RopeEnd | null => {
        const local = new THREE.Vector3(e.local[0], e.local[1], e.local[2]);
        if (e.objectId === null) return { objectId: null, local };
        const mapped = idMap.get(e.objectId);
        return mapped ? { objectId: mapped, local } : null;
      };
      const a = remap(rd.a);
      const b = remap(rd.b);
      if (a && b) this.createRope(rd.kind, a, b, rd.slack, rd.name);
    }

    for (const gd of data.groups) {
      const ids = gd.ids.map((id) => idMap.get(id)).filter((x): x is string => !!x);
      if (ids.length >= 2) {
        const gid = this.createGroupFromIds(ids);
        if (gid) this.renameGroup(gid, gd.name);
      }
    }

    this.select(null);

    // Ergonomía del maniquí: candados y simetría persistidos.
    this.jointLocks = new Set(data.human?.locks ?? []);
    this.poseSymmetry = !!data.human?.symmetry;

    if (data.human?.present) {
      this.humanMode = "mannequin"; // el modo esqueleto se retiró en 0.1.7
      await this.addHumanFigure(data.human.heightCm);
      const fig = this.humanFigure;
      if (fig) {
        // El apoyo se restaura ANTES de posar: sobre una pieza la figura no
        // debe re-aterrizar, o el maniquí sentado acabaría en el suelo.
        this.figuraApoyadaEn = data.human.support === "pieza" ? "pieza" : "suelo";
        this.alturaDelApoyo = data.human.supportY ?? null;
        this.apoyoEspalda = data.human.backSupport
          ? idMap.get(data.human.backSupport) ?? null
          : null;
        this.tumbadaEnElApoyo = data.human.lyingOnSupport === true;
        fig.position.fromArray(data.human.position);
        fig.quaternion.fromArray(data.human.quaternion);
        const joints = this.figureJoints();
        if (joints && data.human.pose) {
          for (const [jn, [x, y, z]] of Object.entries(data.human.pose)) {
            const jj = joints[jn];
            if (jj) jj.rotation.set(degToRad(x), degToRad(y), degToRad(z));
          }
          this.reapoyarFigura();
        }
        for (const h of data.human.hands) {
          const oid = idMap.get(h.objectId);
          if (oid) this.attachHand(h.side, oid, new THREE.Vector3().fromArray(h.local));
        }
        for (const f of data.human.feet ?? []) {
          const oid = idMap.get(f.objectId);
          if (!oid) continue;
          this.attachFoot(
            f.side,
            oid,
            new THREE.Vector3().fromArray(f.local),
            f.normal ? new THREE.Vector3().fromArray(f.normal) : null,
          );
        }
        // Zonas de movimiento y POSTURA DE PARTIDA guardadas con el proyecto.
        // Un proyecto anterior a v0.2.49 no las trae: se vuelve a la de fábrica
        // para no heredar las del proyecto que estuviera abierto antes.
        this.zonasActivas = data.human.zones?.length
          ? new Map(
              data.human.zones
                .filter((z) => ZONA_POR_ID[z.id])
                .map((z) => [z.id as ZonaId, z.side as LadoZona]),
            )
          : new Map<ZonaId, LadoZona>([["superior", "sim"]]);
        if (data.human.zones?.length) this.candadosDesdeZonas();
        this.nombreDePartida = data.human.startPoseName ?? null;
        if (data.human.startPose) {
          this.poseDePartida = data.human.startPose as PoseDef;
          this.transformDePartida = {
            p: new THREE.Vector3().fromArray(data.human.startPosition ?? data.human.position),
            q: new THREE.Quaternion().fromArray(
              data.human.startQuaternion ?? data.human.quaternion,
            ),
          };
        } else {
          this.marcarPoseDePartida();
        }
        this.bus.emit("poseDePartidaChanged", { name: this.nombreDePartida });
      }
    } else if (data.human) {
      this.humanMode = "mannequin"; // el modo esqueleto se retiró en 0.1.7
    }

    // La partida de la MÁQUINA no depende de que haya maniquí: una estación
    // puede querer arrancar en su bloqueo con o sin nadie sentado.
    this.partidaPiezas = null;
    this.disenoDePartida = null;
    this.partidaPintada = false;
    if (data.human?.startParts?.length) {
      const lista = this.listObjects();
      const poses = new Map<string, { p: THREE.Vector3; q: THREE.Quaternion }>();
      for (const e of data.human.startParts) {
        const o = lista[e.index];
        if (!o) continue;
        poses.set(o.id, {
          p: new THREE.Vector3().fromArray(e.position),
          q: new THREE.Quaternion().fromArray(e.quaternion),
        });
      }
      // Las mallas acaban de nacer EN EL PLANO —el proyecto guarda el
      // fabricable—, así que este es el momento exacto de apuntarlo.
      if (poses.size) this.ponerPartida(poses);
    }

    // BARRA EN MANOS (v0.2.81). Si el índice ya no apunta a nada —la pieza se
    // borró en otra sesión— se abre sin barra en vez de dejar un enlace roto
    // que el bucle de frame tendría que limpiar en el primer fotograma.
    if (data.human?.barra && data.human.barra.index >= 0) {
      const o = this.listObjects()[data.human.barra.index];
      if (o && EJERCICIO_BARRA_POR_ID[data.human.barra.ejercicio]) {
        this.barraManiqui = {
          objectId: o.id,
          ejercicio: data.human.barra.ejercicio,
          rackeada: !!data.human.barra.rackeada,
        };
        this.bus.emit("barraManiquiChanged", {
          objectId: o.id,
          ejercicio: data.human.barra.ejercicio,
          rackeada: !!data.human.barra.rackeada,
        });
      }
    }

    // Puntos de partida guardados (v0.2.77), por índice como los de arriba.
    if (data.partidas?.length) {
      const lista = this.listObjects();
      for (const pd of data.partidas) {
        const piezas = pd.piezas?.length ? new Map<string, { p: THREE.Vector3; q: THREE.Quaternion }>() : null;
        for (const e of pd.piezas ?? []) {
          const o = lista[e.index];
          if (!o) continue;
          piezas?.set(o.id, {
            p: new THREE.Vector3().fromArray(e.position),
            q: new THREE.Quaternion().fromArray(e.quaternion),
          });
        }
        this.partidasGuardadas.set(pd.nombre, {
          piezas: piezas && piezas.size ? piezas : null,
          pose: (pd.pose as PoseDef | null) ?? null,
          poseNombre: pd.poseNombre,
          pos: pd.position ? new THREE.Vector3().fromArray(pd.position) : null,
          quat: pd.quaternion ? new THREE.Quaternion().fromArray(pd.quaternion) : null,
        });
      }
      this.bus.emit("partidasChanged", {
        nombres: this.listaPartidas(),
        activa: this.nombreDePartida,
      });
    }

    this.bus.emit("objectsChanged", { objects: this.listObjects() });
    if (!this.applyingHistory) this.resetHistory();
  }

  listObjects(): SceneObject[] {
    return [...this.objects.values()];
  }

  getById(id: string): SceneObject | undefined {
    return this.objects.get(id);
  }

  // ------------------------------------------------------------ seleccion
  select(obj: SceneObject | null): void {
    if (this.bendTarget && obj !== this.bendTarget) this.endBendNodes();
    this.clearGroupHighlight();
    this.selected = obj;
    this.selectedFigure = false;
    this.selectedGroupId = null;
    this.clearMultiSel();
    this.selectedJointName = null;
    if (this.selectedRopeId) {
      this.selectedRopeId = null;
      this.bus.emit("ropeSelectionChanged", null);
    }
    this.resetGizmoAxes();
    if (obj) this.gizmo.attach(obj.mesh);
    else this.gizmo.detach();
    this.aplicarHerramientaGizmo();
    // Con guías administrándose, elegir una pieza YA la canaliza si le pasan
    // por dentro: el clic es el gesto que el diseñador describió para
    // enrolarla, y no tiene por qué exigir además un arrastre.
    this.enhebrarAlSeleccionar(obj);
    this.bus.emit("selectionChanged", { selected: obj });
    this.bus.emit("groupingChanged", { multi: 0, groupSelected: false });
    this.bus.emit("groupSelectionChanged", { id: null, name: "" });
    this.bus.emit("jointSelectionChanged", { name: null, angles: [0, 0, 0], locked: false });
  }

  getSelected(): SceneObject | null {
    return this.selected;
  }

  setMode(mode: TransformMode): void {
    this.gizmo.setMode(mode);
    this.bus.emit("modeChanged", { mode });
  }

  setGizmoSpace(space: "local" | "world"): void {
    this.gizmo.setSpace(space);
  }

  // ---------------------------------------------------------- snapping
  isSnapEnabled(): boolean {
    return this.snap.enabled;
  }

  setSnapEnabled(enabled: boolean): void {
    this.snap.enabled = enabled;
    if (!enabled) this.snap.hideIndicator();
    this.bus.emit("snapChanged", { enabled });
  }

  /** Encaja `obj` al punto de anclaje compatible mas cercano. Devuelve true si encajo. */
  snapObject(obj: SceneObject): boolean {
    const others = this.listObjects().filter((o) => o !== obj);
    const r = this.snap.computeSnap(obj, others);
    if (!r) return false;
    obj.mesh.position.add(r.delta);
    return true;
  }

  // ---------------------------------------------------------- agrupacion
  groupOf(objId: string): string | undefined {
    return this.objGroup.get(objId);
  }

  hasGroupSelected(): boolean {
    return this.selectedGroupId !== null;
  }

  /** Piezas de un grupo, en el orden en que se agruparon (v0.2.55). */
  objetosDelGrupo(id: string): SceneObject[] {
    const g = this.groups.get(id);
    if (!g) return [];
    return g.ids
      .map((i) => this.objects.get(i))
      .filter((o): o is SceneObject => o !== undefined);
  }

  multiCount(): number {
    return this.multiSel.size;
  }

  // ------------------------------------------ selección de área (marquee)

  setAreaSelect(on: boolean): void {
    if (on) this.setHerramienta("area");
    else if (this.herramienta === "area") this.setHerramienta("mover");
  }

  isAreaSelect(): boolean {
    return this.areaSelect;
  }

  // -------------------------------------- barra de herramientas rápidas

  /**
   * HERRAMIENTA RÁPIDA activa (v0.2.13): selección única, selección de
   * área, mover/rotar/escalar (modos del gizmo) u orbitar. Cambiar de
   * herramienta de forma explícita evita modificaciones y arrastres
   * inadvertidos: con selección/orbitar el gizmo de piezas queda inactivo
   * y oculto, y con orbitar el clic tampoco cambia la selección. El gizmo
   * articular del maniquí (Posturas) no se ve afectado.
   */
  setHerramienta(tool: HerramientaRapida): void {
    // CONTROL DE HERRAMIENTAS (v0.2.22): elegir CUALQUIER herramienta
    // abandona los modos de construcción en curso — trazado de línea,
    // cable, cuerda, conexión y doblado por nodos. Cambiar a gizmo u
    // órbita tras colocar una pieza de línea ya no sigue plantando
    // estructuras nuevas por accidente.
    this.cancelLine();
    this.cancelCable();
    this.cancelRope();
    this.cancelConnect();
    this.cancelRoldana();
    this.cancelPlacaDentada();
    this.endBendNodes();
    // Y con ellos el panel de configuración: cancelar el modo por dentro
    // dejaba el diálogo colgado con los botones muertos.
    this.setGrabFigure(false);
    this.bus.emit("dialogosCerrar", {});
    if (this.herramienta === tool) return;
    const eraArea = this.herramienta === "area";
    this.herramienta = tool;
    if (tool === "area") {
      this.areaSelect = true;
      if (this.dragTool) this.setDragTool(false);
      this.bus.emit("areaSelectChanged", { on: true });
    } else if (eraArea) {
      this.areaSelect = false;
      this.cancelMarquee();
      this.bus.emit("areaSelectChanged", { on: false });
    }
    if (tool === "mover") this.setMode("translate");
    else if (tool === "rotar") this.setMode("rotate");
    else if (tool === "escalar") this.setMode("scale");
    this.aplicarHerramientaGizmo();
    this.bus.emit("herramientaChanged", { tool });
    this.requestRender();
  }

  getHerramienta(): HerramientaRapida {
    return this.herramienta;
  }

  // ------------------------------------ herramientas de la SIMULACIÓN

  /**
   * Puntero durante la simulación: mano interactiva u órbita de cámara.
   * Por omisión ÓRBITA (v0.2.41): la mano se elige A PROPÓSITO, de modo que
   * mirar la máquina no la manosee sin querer — y cuando el usuario elige la
   * mano, sabe que cada arrastre va a mover algo.
   */
  private simTool: "mano" | "orbitar" = "orbitar";
  /** Pieza resaltada bajo el puntero con la mano (la que se agarraría). */
  private manoHover: SceneObject | null = null;
  /** Herramienta de simulación anterior al posado, para reponerla al salir. */
  private simToolPrevio: "mano" | "orbitar" = "orbitar";

  setSimHerramienta(tool: "mano" | "orbitar"): void {
    if (this.simTool === tool) return;
    this.simTool = tool;
    this.bus.emit("simToolChanged", { tool });
  }

  getSimHerramienta(): "mano" | "orbitar" {
    return this.simTool;
  }

  /**
   * TENSIÓN MÁXIMA de la mano interactiva (kg) en el agarre actual — la
   * fuerza de la mano siempre alcanza para operar la máquina (v0.2.14) y
   * el simulador reporta cuánto costó: la magnitud sostenida ejercida.
   */
  tensionManoKg(): number | null {
    if (!this.simulating || !this.physics) return null;
    return this.physics.tensionManoKg();
  }

  /** Articulaciones móviles de la figura (para el selector focal). */
  articulacionesFigura(): string[] {
    const joints = this.figureJoints();
    return joints ? Object.keys(joints).filter((n) => JOINT_DOF[n]) : [];
  }

  /**
   * CANDADO de una articulación por nombre (v0.2.14): la barra de
   * simulación puede FIJAR la articulación focal sin abrir Posturas (que
   * está oculto durante la simulación). Devuelve el estado resultante.
   */
  toggleCandadoArticulacion(nombre: string): boolean {
    if (this.jointLocks.has(nombre)) this.jointLocks.delete(nombre);
    else this.jointLocks.add(nombre);
    if (this.selectedJointName === nombre) this.emitJointSelection();
    this.scheduleAutosave();
    return this.jointLocks.has(nombre);
  }

  /** Estado de la articulación para la barra de simulación: ángulo del eje
   *  primario (grados), rango natural y candado. */
  estadoArticulacion(
    nombre: string,
  ): { grados: number; min: number; max: number; fijada: boolean } | null {
    const joints = this.figureJoints();
    const dof = JOINT_DOF[nombre];
    if (!joints || !joints[nombre] || !dof) return null;
    let eje: "x" | "y" | "z" = "x";
    let rango = -1;
    for (const ax of ["x", "y", "z"] as const) {
      const l = dof[ax];
      if (l && l[1] - l[0] > rango) {
        rango = l[1] - l[0];
        eje = ax;
      }
    }
    const lim = dof[eje]!;
    return {
      grados: Math.round(radToDeg(joints[nombre].rotation[eje])),
      min: lim[0],
      max: lim[1],
      fijada: this.jointLocks.has(nombre),
    };
  }

  /**
   * DEMOSTRACIÓN DE MOVIMIENTO (v0.2.14): los cursores ▲/▼ flexionan o
   * extienden la articulación FOCAL de la figura alrededor de su eje
   * natural primario, respetando el rango de movimiento humano. Las
   * articulaciones con candado (Posturas) quedan FIJAS y el resto del
   * cuerpo sigue la cadena (las manos apoyadas se re-resuelven por IK).
   */
  moverArticulacionFocal(nombre: string, dir: 1 | -1, pasoDeg = 4): boolean {
    const joints = this.figureJoints();
    const dof = JOINT_DOF[nombre];
    if (!joints || !joints[nombre] || !dof) return false;
    if (this.jointLocks.has(nombre)) {
      this.avisoTemporal(tt("🔒 Articulación fijada con candado", "🔒 Joint locked in place"));
      return false;
    }
    // Eje natural PRIMARIO: el de mayor rango articular.
    let eje: "x" | "y" | "z" = "x";
    let rango = -1;
    for (const ax of ["x", "y", "z"] as const) {
      const l = dof[ax];
      if (l && l[1] - l[0] > rango) {
        rango = l[1] - l[0];
        eje = ax;
      }
    }
    const lim = dof[eje];
    if (!lim) return false;
    // ▲ FLEXIONA siempre, sea cual sea el signo de la articulación: la
    // rodilla dobla con X positiva y el codo (o la cadera) con X negativa,
    // así que el sentido se toma del recorrido largo de su rango.
    const flexion = Math.abs(lim[1]) >= Math.abs(lim[0]) ? 1 : -1;
    const actual = radToDeg(joints[nombre].rotation[eje]);
    const nuevo = Math.max(lim[0], Math.min(lim[1], actual + dir * flexion * pasoDeg));
    if (Math.abs(nuevo - actual) < 1e-3) return false; // tope del rango

    joints[nombre].rotation[eje] = degToRad(nuevo);
    this.applyPoseSymmetry(nombre);
    this.reapoyarFigura();

    this.requestRender();
    return true;
  }

  /**
   * ¿Hay alguna parte del cuerpo DENTRO del hierro? (v0.2.45)
   *
   * Se mide el cuerpo ENTERO, no solo el segmento que se acaba de girar: lo
   * que delata una máquina sin holgura es el torso contra el mástil tanto
   * como el antebrazo contra un travesaño. Y se AVISA, no se impide: ese
   * choque es la evidencia de que la máquina no deja sitio a quien la usa.
   */
  private medirChoqueConEstructura(): boolean {
    if (!this.physics || !this.humanFigure) return false;
    const cajas = this.cajasEstructura ?? this.cajasCercaDeLaFigura();
    if (!cajas?.length) return false;
    const mallas = this.mallasDeLaFigura();
    if (!mallas.length) return false;
    this.humanFigure.updateMatrixWorld(true);
    return this.penetracionEnEstructura(mallas, cajas) > 0.5;
  }

  /**
   * Libera o bloquea una FAMILIA de articulaciones (hombro, codo, rodilla…)
   * en el lado pedido. `lado` "sim" actúa sobre los dos a la vez, que es como
   * se trabaja un ejercicio simétrico.
   */
  setBloqueoArticular(familia: string, lado: "L" | "R" | "sim", bloqueada: boolean): void {
    const nombres =
      familia === "spine" || familia === "neck"
        ? [familia]
        : lado === "sim"
          ? [`${familia}L`, `${familia}R`]
          : [`${familia}${lado}`];
    for (const n of nombres) {
      if (!JOINT_DOF[n]) continue;
      if (bloqueada) this.jointLocks.add(n);
      else this.jointLocks.delete(n);
    }
    if (this.selectedJointName && nombres.includes(this.selectedJointName)) {
      this.selectJoint(this.selectedJointName);
    }
    this.bus.emit("jointLocksChanged", { locks: [...this.jointLocks] });
    this.scheduleAutosave();
  }

  /** Articulaciones libres (sin candado) que el 8/9 va a mover. */
  articulacionesLibres(): string[] {
    return Object.keys(JOINT_DOF).filter((n) => !this.jointLocks.has(n));
  }

  // ------------------------------------------- movimiento POR ZONAS (v0.2.49)
  /** Zonas del cuerpo activas y el lado sobre el que actúa cada una. */
  private zonasActivas = new Map<ZonaId, LadoZona>([["superior", "sim"]]);
  /** Orientación de destino de cada segmento que se acomoda (grados). */
  private pitchAcomodacion = new Map<string, number>();
  /** ¿La última acomodación se quedó sin recorrido? (el pie pierde contacto) */
  acomodacionAlLimite = false;

  /** Zonas activas y su lado, para la interfaz. */
  zonasDeMovimiento(): Map<ZonaId, LadoZona> {
    return new Map(this.zonasActivas);
  }

  /** Vuelve a la zona de fábrica (tren superior a los dos lados). */
  private reiniciarZonas(): void {
    this.zonasActivas = new Map([["superior", "sim"]]);
    this.planActivo = null;
    this.pitchAcomodacion.clear();
    this.poseDePartida = null;
    this.transformDePartida = null;
    this.nombreDePartida = null;
  }

  ladoDeZona(id: ZonaId): LadoZona | null {
    return this.zonasActivas.get(id) ?? null;
  }

  /**
   * Activa (con su lado) o desactiva una ZONA de movimiento. El candado por
   * articulación se recalcula a partir de las zonas: lo que no participa en
   * ninguna queda fijo, que es exactamente lo que dice la interfaz.
   */
  activarZona(id: ZonaId, lado: LadoZona | null): void {
    if (lado === null) this.zonasActivas.delete(id);
    else this.zonasActivas.set(id, lado);
    this.candadosDesdeZonas();
  }

  /**
   * PLAN DEL GESTO PUESTO (v0.2.96), si el ejercicio tiene uno. Dice en qué
   * ORDEN se abren las articulaciones y HASTA DÓNDE; la zona solo dice cuáles.
   * Sin plan, `moverPrimitiva` recorre exactamente el camino de siempre.
   */
  private planActivo: PlanMov | null = null;

  /** Recalcula el candado articular a partir de las zonas activas. */
  private candadosDesdeZonas(): void {
    const libres = new Set<string>();
    for (const [id, lado] of this.zonasActivas) {
      const z = ZONA_POR_ID[id];
      if (z) for (const n of articulacionesDeZona(z, lado)) libres.add(n);
    }
    // EL PLAN ABRE SU PROPIO CANDADO. La `bisagra` solo libera columna y
    // caderas, y por eso la rodilla del peso muerto no se movía NUNCA: el
    // candado la vetaba antes de que el reparto llegara a ella.
    if (this.planActivo) {
      const lado = this.zonasActivas.get(this.planActivo.zona) ?? "sim";
      for (const n of articulacionesDePlan(this.planActivo, lado)) libres.add(n);
    }
    this.jointLocks = new Set(Object.keys(JOINT_DOF).filter((n) => !libres.has(n)));
    this.pitchAcomodacion.clear();
    this.bus.emit("jointLocksChanged", { locks: [...this.jointLocks] });
    this.scheduleAutosave();
  }

  /**
   * Orientación (grados) que debe conservar el segmento acomodado: la que
   * tenía en la POSTURA DE PARTIDA. Se calcula una sola vez y se guarda, para
   * que el pie no vaya a la deriva paso a paso.
   */
  private objetivoDeAcomodacion(
    nombre: string,
    cadena: string[],
    joints: Record<string, THREE.Object3D>,
  ): number {
    const guardado = this.pitchAcomodacion.get(nombre);
    if (guardado !== undefined) return guardado;
    const partida = this.poseDePartida;
    let suma = 0;
    for (const n of [...cadena, nombre]) {
      suma += partida?.[n] ? partida[n][0] : joints[n] ? radToDeg(joints[n].rotation.x) : 0;
    }
    this.pitchAcomodacion.set(nombre, suma);
    return suma;
  }

  /**
   * ¿Le queda recorrido a esta articulación en el sentido pedido?
   *
   * CON META, EL GESTO TERMINA DONDE TERMINA EL EJERCICIO, no donde topa la
   * anatomía. Sin ella el peso muerto moría con la cadera en su tope de +30° y
   * la barra 24,89 cm por debajo del bloqueo, y el press moría con el codo
   * bloqueado y el hombro a medio camino (−128° de −166°).
   */
  private leQuedaRecorrido(
    joints: Record<string, THREE.Object3D>,
    nombre: string,
    signo: number,
    meta?: number,
  ): boolean {
    const lim = JOINT_DOF[nombre]?.x;
    if (!lim || !joints[nombre]) return false;
    const a = radToDeg(joints[nombre].rotation.x);
    const techo = meta === undefined ? lim[1] : Math.min(lim[1], meta);
    const suelo = meta === undefined ? lim[0] : Math.max(lim[0], meta);
    return signo > 0 ? a < techo - 1e-3 : a > suelo + 1e-3;
  }

  /**
   * LA FASE EN LA QUE ESTÁ EL GESTO, leída del MUNDO y no de un contador.
   *
   * Es lo que permite que la tracción recorra las mismas fases al revés sin
   * guardar estado, y que cambiar de zona o de ejercicio a mitad de camino no
   * deje nada desincronizado: la siguiente pulsación simplemente vuelve a
   * mirar dónde está la barra.
   */
  private faseActiva(
    joints: Record<string, THREE.Object3D>,
    sentido: number,
  ): { fase: FaseMov; i: number } | null {
    const plan = this.planActivo;
    if (!plan || plan.fases.length === 0) return null;
    if (sentido > 0) {
      for (let i = 0; i < plan.fases.length; i++) {
        if (!this.umbralCruzado(plan.fases[i].hasta, joints)) return { fase: plan.fases[i], i };
      }
      return { fase: plan.fases[plan.fases.length - 1], i: plan.fases.length - 1 };
    }
    // LA TRACCIÓN MIRA EL UMBRAL DE LA FASE ANTERIOR, no el suyo (v0.2.98).
    //
    // Buscando «la última fase cuyo umbral está cruzado» la ÚLTIMA FASE NUNCA
    // SALÍA: su `hasta` es `meta` —termina cuando llega a su postura, no cuando
    // cruza nada— y `umbralCruzado` devuelve false para eso siempre. Así que al
    // bajar desde el bloqueo del peso muerto se elegía la fase de TIRÓN, con la
    // meta del suelo, y el gesto entero se deshacía de un tramo: 32 pasos para
    // subir y 20 para bajar, por posturas que no eran las de la subida (a
    // rodilla 65° la columna iba a 53,5° bajando y a 78° subiendo).
    //
    // La condición correcta es la simétrica de la del empuje: el empuje toma la
    // PRIMERA fase que aún no ha cruzado su umbral; la tracción toma la ÚLTIMA
    // cuya fase anterior sí lo cruzó, o sea la última que llegó a empezar.
    // Y CEDE EL TURNO CUANDO YA NO LE QUEDA NADA. En el hito de la rótula el
    // umbral del tirón sigue cruzado por un pelo, así que la bajada elegía otra
    // vez el bloqueo —que ya estaba en su meta— y el gesto se paraba en seco a
    // media altura. Una fase agotada pasa a la anterior.
    for (let i = plan.fases.length - 1; i > 0; i--) {
      if (!this.umbralCruzado(plan.fases[i - 1].hasta, joints)) continue;
      if (this.faseAgotada(i, -1, joints)) continue;
      return { fase: plan.fases[i], i };
    }
    return { fase: plan.fases[0], i: 0 };
  }

  /** ¿La fase `i` ya está en la postura a la que iba en este sentido? */
  private faseAgotada(
    i: number,
    sentido: number,
    joints: Record<string, THREE.Object3D>,
  ): boolean {
    const plan = this.planActivo;
    const metas = this.metasDeFase(i, sentido);
    if (!plan || !metas) return false;
    const lado = this.zonasActivas.get(plan.zona) ?? "sim";
    for (const a of plan.fases[i].patron) {
      for (const n of nombresDeFamilia(a.familia, a.bilateral, lado)) {
        if (!joints[n] || metas[n] === undefined) continue;
        if (Math.abs(radToDeg(joints[n].rotation.x) - metas[n]) > 0.05) return false;
      }
    }
    return true;
  }

  private umbralCruzado(u: UmbralFase, joints: Record<string, THREE.Object3D>): boolean {
    if (u.tipo === "meta") return false;
    if (u.tipo === "angulo") {
      const ns = u.familia === "spine" || u.familia === "neck"
        ? [u.familia]
        : [`${u.familia}L`, `${u.familia}R`];
      const vs = ns.filter((n) => joints[n]).map((n) => radToDeg(joints[n].rotation.x));
      if (vs.length === 0) return false;
      const med = vs.reduce((s, v) => s + v, 0) / vs.length;
      return u.signo > 0 ? med >= u.grados : med <= u.grados;
    }
    // «La barra sobre la patela». Se mide el punto medio de las dos manos, que
    // es EXACTAMENTE donde `sitioDeLaBarra` pone la barra de agarre en manos,
    // así que el umbral sigue definido con la barra rackeada o sin barra.
    const mL = this.centroSegmento("mano-L");
    const mR = this.centroSegmento("mano-R");
    const kL = joints.kneeL, kR = joints.kneeR;
    if (!mL || !mR || !kL || !kR) {
      // Respaldo por ángulo: el mismo punto, medido (cadera −23,77°).
      return this.umbralCruzado(
        { tipo: "angulo", familia: "hip", grados: -23.77, signo: 1 },
        joints,
      );
    }
    const yMano = (mL.y + mR.y) / 2;
    const yRodilla =
      (kL.getWorldPosition(new THREE.Vector3()).y + kR.getWorldPosition(new THREE.Vector3()).y) / 2;
    return yMano >= yRodilla;
  }

  /** Ángulos X objetivo de la fase, leídos de las posturas de la biblioteca. */
  private metasDeFase(i: number, sentido: number): Record<string, number> | null {
    const plan = this.planActivo;
    if (!plan) return null;
    const nombre = sentido > 0
      ? plan.fases[i].meta
      : i > 0 ? plan.fases[i - 1].meta : plan.origen;
    const def = getPose(nombre);
    if (!def) return null;
    // LA META ES LA POSTURA ENTERA, no solo lo que nombra. `applyPose` pone a
    // CERO todo lo que la postura no menciona, así que una articulación ausente
    // no es «da igual»: es cero. Sin esto, «Peso muerto (bloqueo)» —que solo
    // declara cuello y hombros— dejaba a la columna sin meta y el gesto la
    // llevaba hasta su tope de −30°, muy pasado de vertical, con el hombro tan
    // atrás que el brazo ya no podía colgar a plomo (50,66° de desvío medidos).
    const out: Record<string, number> = {};
    for (const n of Object.keys(JOINT_DOF)) out[n] = 0;
    for (const [art, v] of Object.entries(def)) out[art] = v[0];
    return out;
  }

  /** Fase activa en texto, para la interfaz («Bisagra · tirón»). */
  faseDelGesto(): string | null {
    const joints = this.figureJoints();
    if (!joints || !this.planActivo) return null;
    return this.faseActiva(joints, 1)?.fase.es ?? null;
  }

  /**
   * MOVIMIENTO PRIMITIVO (v0.2.49): EMPUJE (+1) o TRACCIÓN (−1) de las zonas
   * activas. Cada zona reparte el paso entre sus articulaciones con el signo
   * que le toca por anatomía —empujar es extender el codo MIENTRAS se flexiona
   * el hombro—, así que un solo botón produce el gesto entero.
   *
   * Varias zonas activas se mueven a la vez y sus aportes se SUMAN (la cadera
   * participa en el tren inferior y en la bisagra), que es lo que pasa en un
   * peso muerto o en una prensa con tronco. Devuelve cuántas articulaciones
   * se movieron.
   */
  moverPrimitiva(sentido: SentidoMov, pasoDeg = 5): number {
    const joints = this.figureJoints();
    if (!joints) return 0;
    // SENTIDO Y PASO TIENEN QUE SER NÚMEROS. Sin esto, llamar con basura —un
    // "empuje" en vez de un +1 desde un guion, un campo de texto vacío— metía
    // NaN en las rotaciones, y de ahí no se vuelve: el maniquí entero deja de
    // tener posición y hay que rehacerlo. Un return silencioso es preferible a
    // un cuerpo destruido.
    if ((sentido !== 1 && sentido !== -1) || !Number.isFinite(pasoDeg)) return 0;
    if (this.zonasActivas.size === 0) {
      this.avisoTemporal(
        tt(
          "Ninguna zona activa: marca tren superior, inferior o bisagra",
          "No zone active: tick upper body, lower body or hinge",
        ),
      );
      return 0;
    }
    // Las cajas del hierro se leen UNA vez por pulsación y valen para todo el
    // paso (la máquina no se mueve entremedias).
    this.cajasEstructura = this.physics ? this.cajasCercaDeLaFigura() : null;

    // LA HUELLA, ANTES DE TOCAR NADA. Es contra ella contra la que se replanta
    // al final del paso: los pies son un ANCLAJE y no pueden barrer el suelo.
    const huella = this.huellaDeLosPies();
    // ¿Hay CALENDARIO para este gesto? Sin plan, todo lo de abajo se comporta
    // exactamente como siempre y ninguna máquina se entera de este cambio.
    const act = this.faseActiva(joints, sentido);
    const metas = act ? this.metasDeFase(act.i, sentido) : null;

    // 1) Reparto del paso entre las articulaciones de todas las zonas.
    //
    // Cada zona tiene una articulación que MANDA (peso 1: el codo empuja, la
    // rodilla se extiende, la cadera bisagra) y el gesto TERMINA cuando ella
    // llega a su tope: un press acaba al bloquear el codo, no cuando al hombro
    // se le acaba el rango 90° después. Sin este freno el hombro seguía
    // flexionando con el brazo ya estirado y se iba por encima de la cabeza.
    //
    // CON PLAN, «su tope» pasa a ser LA META de la fase, que sale de una
    // postura aprobada; y los pesos dejan de ser fijos: se derivan de lo que le
    // falta a cada articulación para llegar. Eso lo hace autocorrector — si una
    // topa, las demás siguen apuntando a su meta y el gesto aterriza igual— e
    // impide pasarse de largo, porque el signo lo pone la propia meta.
    const delta = new Map<string, number>();
    const tope = new Map<string, number>();
    const acomodar: { nombre: string; cadena: string[]; objetivo: number }[] = [];
    const plomada: string[] = [];
    let mirada: number | null = null;
    let roce: string[] | null = null;
    const ladosRoce = new Set<string>();
    let equilibrio: "spine" | "hip" | null = null;
    let apertura = false;
    for (const [id, lado] of this.zonasActivas) {
      const z = ZONA_POR_ID[id];
      if (!z) continue;
      const conPlan = act !== null && metas !== null && id === this.planActivo?.zona;
      const patron = conPlan ? act!.fase.patron : z.patron;
      const acomodaciones: AcomodacionMov[] = conPlan
        ? act!.fase.acomodaciones ?? []
        : z.acomodacion
          ? [{ tipo: "pitch", familia: z.acomodacion.familia, cadena: z.acomodacion.cadena, es: z.acomodacion.es, en: z.acomodacion.en }]
          : [];
      const lider = patron.find((a) => a.peso >= 1) ?? null;
      const centrales = new Set<string>(); // las articulaciones sin lado, una vez
      // Cuánto le falta al líder para su meta: es el patrón de medir del resto.
      const faltaDe = (n: string): number =>
        metas && metas[n] !== undefined && joints[n]
          ? metas[n] - radToDeg(joints[n].rotation.x)
          : 0;
      for (const l of ladosDe(lado)) {
        if (lider) {
          const mandan = nombresDeFamilia(lider.familia, lider.bilateral, l).filter(
            (n) => JOINT_DOF[n]?.x && joints[n] && !this.jointLocks.has(n),
          );
          const dir = sentido * lider.empuje;
          if (
            mandan.length
            && !mandan.some((n) =>
              this.leQuedaRecorrido(joints, n, conPlan ? Math.sign(faltaDe(n)) || dir : dir,
                conPlan ? metas![n] : undefined))
          ) {
            continue; // esta zona ya agotó su recorrido por este lado
          }
        }
        const faltaLider = lider
          ? Math.max(
            ...nombresDeFamilia(lider.familia, lider.bilateral, l).map((n) => Math.abs(faltaDe(n))),
          )
          : 0;
        for (const a of patron) {
          for (const n of nombresDeFamilia(a.familia, a.bilateral, l)) {
            if (!JOINT_DOF[n]?.x || !joints[n] || this.jointLocks.has(n)) continue;
            if (!a.bilateral) {
              if (centrales.has(n)) continue; // la columna no cuenta dos veces
              centrales.add(n);
            }
            if (conPlan && metas![n] !== undefined) {
              const falta = faltaDe(n);
              const peso = faltaLider > 1e-3
                ? Math.min(4, Math.abs(falta) / faltaLider)
                : a.peso;
              delta.set(n, (delta.get(n) ?? 0) + Math.sign(falta) * peso * pasoDeg);
              tope.set(n, metas![n]);
            } else {
              delta.set(n, (delta.get(n) ?? 0) + sentido * a.empuje * a.peso * pasoDeg);
            }
          }
        }
        for (const ac of acomodaciones) {
          // LAS ARTICULACIONES CENTRALES NO LLEVAN LADO. El cuello se llama
          // «neck», no «neckL»: buscándolo con sufijo no existía, y la
          // acomodación de la mirada se descartaba en silencio en los dos
          // lados —el cuello se quedaba clavado en −51,8° todo el peso muerto,
          // mirando al suelo abajo y al techo en el bloqueo—.
          const nombre = joints[`${ac.familia}${l}`] ? `${ac.familia}${l}` : ac.familia;
          if (!joints[nombre] || this.jointLocks.has(nombre)) continue;
          if (ac.tipo === "plomada") { plomada.push(l); continue; }
          if (ac.tipo === "mirada") { mirada = ac.distanciaCm; continue; }
          // EL ROCE MUEVE LOS DOS HOMBROS A LA VEZ, así que guarda los segmentos
          // una vez y ANOTA SUS PROPIOS LADOS. Antes reutilizaba los de la
          // plomada: funcionaba porque las dos van juntas en el peso muerto,
          // pero dejaba el roce mudo en cuanto una fase llevara roce sin
          // plomada, y en silencio.
          if (ac.tipo === "roce") { roce = ac.segmentos; ladosRoce.add(l); continue; }
          if (ac.tipo === "equilibrio") { equilibrio = ac.sobre; continue; }
          if (ac.tipo === "apertura") { apertura = true; continue; }
          const cadena = ac.cadena.map((f) => `${f}${l}`);
          acomodar.push({
            nombre,
            cadena,
            objetivo: this.objetivoDeAcomodacion(nombre, cadena, joints),
          });
        }
      }
    }

    // 2) Se aplica cada aporte dentro del rango humano de su articulación, y
    //    sin rebasar nunca la meta de la fase en el sentido de marcha.
    let n = 0;
    for (const [nombre, d] of delta) {
      const lim = JOINT_DOF[nombre]!.x!;
      const actual = radToDeg(joints[nombre].rotation.x);
      let nuevo = Math.max(lim[0], Math.min(lim[1], actual + d));
      const m = tope.get(nombre);
      if (m !== undefined) nuevo = d > 0 ? Math.min(nuevo, m) : Math.max(nuevo, m);
      if (Math.abs(nuevo - actual) < 1e-3) continue; // tope del rango o meta
      joints[nombre].rotation.x = degToRad(nuevo);
      n++;
    }

    // 3) ACOMODACIÓN: el tobillo persigue la orientación de partida del pie,
    //    que es lo que mantiene la planta apoyada mientras el resto se mueve.
    this.acomodacionAlLimite = false;
    for (const a of acomodar) {
      const lim = JOINT_DOF[a.nombre]?.x;
      if (!lim) continue;
      let suma = 0;
      for (const c of a.cadena) if (joints[c]) suma += radToDeg(joints[c].rotation.x);
      const deseado = a.objetivo - suma;
      const nuevo = Math.max(lim[0], Math.min(lim[1], deseado));
      // Si el tobillo se queda sin recorrido, el pie DEJA de apoyar: es una
      // conclusión ergonómica (la plataforma pide un ángulo que no existe).
      if (Math.abs(deseado - nuevo) > 0.5) this.acomodacionAlLimite = true;
      if (Math.abs(nuevo - radToDeg(joints[a.nombre].rotation.x)) < 1e-3) continue;
      joints[a.nombre].rotation.x = degToRad(nuevo);
      n++;
    }

    // 4) LA PLOMADA DEL BRAZO y LA MIRADA. Van ANTES del reapoyo y del plantado
    //    porque son magnitudes RELATIVAS —mano contra medio del pie, cabeza
    //    contra su marca del suelo, todo dentro de la figura—, así que la
    //    traslación global posterior no las altera.
    for (const l of plomada) if (this.acomodarPlomada(l, joints)) n++;
    // EL ROCE VA DESPUÉS DE LA PLOMADA, y no al revés: la plomada dice dónde
    // querría estar la barra —sobre el medio del pie— y el roce solo la corrige
    // hacia DELANTE lo justo para no meterla en la carne. Al revés la plomada
    // desharía la corrección.
    if (roce && ladosRoce.size && this.acomodarRoce([...ladosRoce], roce, joints)) n++;
    // EL EQUILIBRIO PRIMERO Y LA APERTURA DESPUÉS, y luego el equilibrio otra
    // vez. Las dos tocan la cadera —una su flexión, la otra su abducción— y se
    // mueven la referencia mutuamente: la abducción cambia dónde caen las
    // pisadas, y la flexión cambia la separación entre ellas. Con la apertura
    // sola por delante, la postura de la frontal oscilaba entre 59,2 y 62,7 cm.
    // Dos pasadas del sagital con la lateral en medio las dejan a las dos
    // clavadas, y no hace falta más porque cada paso solo corrige un paso.
    if (equilibrio && this.acomodarEquilibrio(joints, equilibrio)) n++;
    if (apertura && huella && this.acomodarApertura(joints, huella)) n++;
    if (equilibrio && this.acomodarEquilibrio(joints, equilibrio)) n++;
    if (mirada !== null && this.acomodarMirada(mirada, joints)) n++;

    // 4 bis) EL PIE EMPUJA SU PEDAL. Si la planta apoya en una pieza que puede
    //    correr —la placa de una prensa, un estribo—, extender la pierna la
    //    EMPUJA: la persona se queda donde está y lo que viaja es la máquina.
    //    Sin esto el gesto no tenía a dónde ir, la IK del pie lo deshacía en el
    //    mismo paso y el cuerpo acababa arrastrado hacia la plataforma.
    if (this.empujarLosPedales(sentido)) this.updateFootIK();

    this.reapoyarFigura();
    // 5) Y LOS PIES SE QUEDAN DONDE PISAN. Sin esto el peso muerto barría el
    //    suelo: la punta viajaba 120,81 cm y el talón 78,37, con la planta
    //    despegada 11,54 cm. `plantarLosPies` se abstiene sola si la figura no
    //    está en el suelo o si algún pie tiene apoyo propio.
    this.plantarLosPies(huella);
    // Y LA BARRA SE CUELGA DEL CUERPO YA RESUELTO, una sola vez y de verdad.
    // Los sondeos de las acomodaciones solo TANTEAN la malla; esta es la
    // llamada que entera a la física. Además va después del replantado, que
    // traslada la figura entera: sin ella la barra se quedaría en el sitio de
    // antes de plantar hasta el siguiente fotograma.
    this.sincronizarBarraManiqui();
    const antes = this.contactoConEstructura;
    this.contactoConEstructura = this.medirChoqueConEstructura();
    this.cajasEstructura = null;
    // El aviso solo salta al ENTRAR en choque: repetirlo en cada pulsación
    // sería ruido mientras se recorre el rango con el cuerpo encajado.
    if (this.contactoConEstructura && !antes) {
      this.avisoTemporal(
        tt(
          "⚠ El cuerpo choca con la estructura: la máquina no le deja sitio",
          "⚠ The body hits the structure: the machine leaves it no room",
        ),
      );
    }
    if (n === 0) {
      this.avisoTemporal(
        sentido > 0
          ? tt("El empuje llegó a su tope articular", "The push reached its joint limit")
          : tt("La tracción llegó a su tope articular", "The pull reached its joint limit"),
      );
    }
    this.requestRender();
    this.scheduleAutosave();
    return n;
  }

  /**
   * LA MIRADA NO SE SUELTA DE SU MARCA (v0.2.97).
   *
   * Lo pidió el diseñador para el peso muerto, y con su razón: «en el mundo
   * real, un peso muerto que se baja con el cuello en flexión tiene mayor riesgo
   * de producir alguna lesión espinal». El cuello deja de ser un ángulo del
   * reparto —iba de −51,8° a 19° interpolando, sin mirar a ninguna parte— y se
   * resuelve en cada paso contra una marca FIJA del suelo, por delante de donde
   * se pisa. Bajando, eso obliga al cuello a extenderse en vez de doblarse, que
   * es justamente lo que se quería.
   *
   * Se resuelve por bisección sobre el ángulo del cuello, comparando la
   * INCLINACIÓN de la mirada con la que haría falta para dar en la marca: las
   * dos son magnitudes con signo, así que el corchete es limpio. Y como el
   * pivote del cuello no lo mueve el propio cuello, basta una pasada.
   */
  private acomodarMirada(distanciaCm: number, joints: Record<string, THREE.Object3D>): boolean {
    const fig = this.humanFigure;
    const cuello = joints.neck;
    if (!fig || !cuello) return false;
    const lim = JOINT_DOF.neck?.x;
    if (!lim) return false;
    const huella = this.huellaDeLosPies();
    if (!huella) return false;
    const adelante = new THREE.Vector3(0, 0, 1).applyQuaternion(fig.quaternion).setY(0).normalize();
    // La marca: en el suelo, por delante del punto medio de las dos pisadas.
    const marca = huella.L.clone().add(huella.R).multiplyScalar(0.5)
      .addScaledVector(adelante, distanciaCm);
    marca.y = 0;
    const original = radToDeg(cuello.rotation.x);
    // Diferencia de INCLINACIÓN entre adónde mira y adónde debería mirar.
    const desvio = (deg: number): number => {
      cuello.rotation.x = degToRad(deg);
      fig.updateMatrixWorld(true);
      const ojo = cuello.getWorldPosition(new THREE.Vector3());
      const q = cuello.getWorldQuaternion(new THREE.Quaternion());
      const vista = new THREE.Vector3(0, 0, 1).applyQuaternion(q).normalize();
      const hacia = marca.clone().sub(ojo);
      if (hacia.lengthSq() < 1e-6) return 0;
      hacia.normalize();
      return Math.asin(Math.max(-1, Math.min(1, vista.y)))
        - Math.asin(Math.max(-1, Math.min(1, hacia.y)));
    };
    // EL CUELLO NO PASA DE NEUTRAL (v0.2.98). Lo pidió el diseñador viendo la
    // subida: «al ascender hasta el bloqueo, eventualmente la posición del
    // cuello se fija hasta alcanzar la postura anatómica de quien mira hacia el
    // frente (pasa de extensión a neutral)». Y tiene sentido: el blanco del
    // suelo se sostiene mientras el tronco está inclinado, pero de pie exigiría
    // meter la barbilla —32° medidos—, que es una postura que nadie adopta al
    // terminar un peso muerto. Así que el techo de la búsqueda es 0: el cuello
    // recorre de extensión a neutral y AHÍ SE QUEDA, mirando al frente. Bajando
    // se deshace solo, porque esto se resuelve del mundo en cada paso.
    const techo = Math.min(lim[1], 0);
    if (desvio(techo) > 0) {
      // Para dar en la marca haría falta flexión: se planta en neutral. NO es
      // una acomodación al límite —es la postura pedida—, así que no se avisa.
      cuello.rotation.x = degToRad(techo);
      fig.updateMatrixWorld(true);
      return Math.abs(techo - original) > 1e-3;
    }
    let a = lim[0], b = techo;
    const fa = desvio(a);
    if (fa * desvio(b) > 0) {
      // El cuello no llega: se deja en el tope que más se acerca, que es una
      // conclusión ergonómica y no un fallo (mirar ahí pide más rango del que
      // hay). Se avisa por el mismo canal que el tobillo sin recorrido.
      const mejor = Math.abs(fa) < Math.abs(desvio(b)) ? a : b;
      cuello.rotation.x = degToRad(mejor);
      fig.updateMatrixWorld(true);
      this.acomodacionAlLimite = true;
      return Math.abs(mejor - original) > 1e-3;
    }
    for (let i = 0; i < 40; i++) {
      const m = (a + b) / 2;
      if (desvio(m) * fa > 0) a = m; else b = m;
    }
    const sol = (a + b) / 2;
    cuello.rotation.x = degToRad(sol);
    fig.updateMatrixWorld(true);
    return Math.abs(sol - original) > 1e-3;
  }

  /**
   * EL BRAZO CUELGA COMO UNA CUERDA (v0.2.96).
   *
   * «Los brazos no cuelgan con normalidad: deben operar como cuerdas, que
   * soportan la barra desde el punto de anclaje del hombro». Una cuerda no
   * tiene ángulo propio: cuelga. Así que el hombro deja de ser un valor del
   * reparto y se RESUELVE en cada paso para que la mano caiga sobre la vertical
   * del medio del pie, que es la regla sagital del peso muerto.
   *
   * Se resuelve por bisección sobre el ángulo del hombro midiendo el centro de
   * la mano en vivo, y no con una fórmula: el largo del brazo lo pone el rig y
   * cambia con la talla. Es una sola pasada, sin iterar con nada más, porque
   * girar el hombro no mueve el propio pivote del hombro.
   *
   * Y se abstiene donde no tiene sentido: sin figura en el suelo, sin huella o
   * con un pie con apoyo propio no hay vertical que perseguir.
   */
  private acomodarPlomada(lado: string, joints: Record<string, THREE.Object3D>): boolean {
    const fig = this.humanFigure;
    const hombro = joints[`shoulder${lado}`];
    if (!fig || !hombro || this.figuraApoyadaEn !== "suelo" || this.footTargets.size > 0) return false;
    const huella = this.huellaDeLosPies();
    if (!huella) return false;
    const lim = JOINT_DOF[`shoulder${lado}`]?.x;
    if (!lim) return false;
    // El blanco, en el marco SAGITAL de la figura: así vale con el maniquí
    // girado en la escena.
    const adelante = new THREE.Vector3(0, 0, 1).applyQuaternion(fig.quaternion).setY(0).normalize();
    const medio = huella.L.clone().add(huella.R).multiplyScalar(0.5);
    const blanco = medio.dot(adelante);
    const desvio = (deg: number): number => {
      hombro.rotation.x = degToRad(deg);
      fig.updateMatrixWorld(true);
      const mano = this.centroSegmento(`mano-${lado}`);
      return mano ? mano.dot(adelante) - blanco : 0;
    };
    const original = radToDeg(hombro.rotation.x);
    // LA RAÍZ SE BUSCA CERCA, y no en todo el rango. El brazo da la vuelta
    // entera: barriendo el hombro de −180° a +60° la mano cruza la vertical
    // DOS veces, así que una bisección global puede elegir la rama absurda —el
    // brazo plegado por encima de la cabeza— o, peor, ver el mismo signo en los
    // dos extremos y rendirse. Medido con el tronco a 8°: −180° da −2,61 cm y
    // +60° da −59,17, mismos signos, con dos raíces en medio. Se abre un
    // corchete desde donde está el hombro AHORA hacia los dos lados: esa es la
    // solución continua, la que un brazo puede recorrer sin teletransportarse.
    let a = original, b = original;
    const f0 = desvio(original);
    let hay = false;
    if (Math.abs(f0) < 1e-4) hay = true;
    for (let d = 2; d <= 240 && !hay; d += 2) {
      const arriba = Math.min(lim[1], original + d);
      const abajo = Math.max(lim[0], original - d);
      if (desvio(arriba) * f0 <= 0) { a = original; b = arriba; hay = true; break; }
      if (desvio(abajo) * f0 <= 0) { a = abajo; b = original; hay = true; break; }
      if (arriba === lim[1] && abajo === lim[0]) break;
    }
    if (!hay) {
      // No hay plomada alcanzable: se deja como estaba y se avisa por el mismo
      // canal que el tobillo cuando se queda sin recorrido.
      hombro.rotation.x = degToRad(original);
      fig.updateMatrixWorld(true);
      this.acomodacionAlLimite = true;
      return false;
    }
    const fa = desvio(a);
    for (let i = 0; i < 40; i++) {
      const m = (a + b) / 2;
      if (desvio(m) * fa > 0) a = m; else b = m;
    }
    const sol = (a + b) / 2;
    hombro.rotation.x = degToRad(sol);
    fig.updateMatrixWorld(true);
    return Math.abs(sol - original) > 1e-3;
  }

  /**
   * LA POSTURA NO SE CIERRA AL BAJAR (v0.2.99).
   *
   * El reparto solo mueve el eje X, así que la ABDUCCIÓN de la cadera se
   * quedaba congelada en el valor de estar de pie (−10,29°) mientras la flexión
   * llegaba a −78,6°. Con la cadera tan flexionada esos 10° ya no abren nada, y
   * las piernas se juntaban: medido, la separación entre las dos pisadas pasaba
   * de 60,1 cm a 39,4 bajando, y se volvía a abrir al subir. La postura de fondo
   * del modelo tiene 60,8 cm con la cadera a −36,5°, o sea que la apertura
   * estaba en las posturas y el gesto no la recorría.
   *
   * Lo que no puede cambiar es la separación entre los pies: están en el suelo.
   * Así que se resuelve la abducción —simétrica, el mismo incremento a los dos
   * lados— por bisección, contra la separación que había al empezar el paso. Es
   * la misma abducción y rotación externa de cadera que describió el diseñador
   * al hablar del pie, y como se lee del mundo, la subida la deshace sola.
   */
  private acomodarApertura(
    joints: Record<string, THREE.Object3D>,
    huella: { L: THREE.Vector3; R: THREE.Vector3 },
  ): boolean {
    const fig = this.humanFigure;
    const L = joints.hipL, R = joints.hipR;
    const limL = JOINT_DOF.hipL?.z, limR = JOINT_DOF.hipR?.z;
    if (!fig || !L || !R || !limL || !limR) return false;
    if (this.jointLocks.has("hipL") || this.jointLocks.has("hipR")) return false;
    const blanco = huella.L.distanceTo(huella.R);
    if (blanco < 1e-3) return false;
    const baseL = radToDeg(L.rotation.z), baseR = radToDeg(R.rotation.z);
    // `d > 0` ABRE: la cadera izquierda va hacia su −z y la derecha hacia su +z,
    // que es como están declaradas las posturas (−10,29 y +10,29 de pie).
    const separacion = (d: number): number => {
      L.rotation.z = degToRad(Math.max(limL[0], Math.min(limL[1], baseL - d)));
      R.rotation.z = degToRad(Math.max(limR[0], Math.min(limR[1], baseR + d)));
      fig.updateMatrixWorld(true);
      const h = this.huellaDeLosPies();
      return h ? h.L.distanceTo(h.R) - blanco : 0;
    };
    const f0 = separacion(0);
    if (Math.abs(f0) < 0.05) { separacion(0); return false; }
    // Corchete hacia el lado que hace falta, en pasos de 2°.
    let a = 0, b = 0, hay = false;
    const sentido = f0 < 0 ? 1 : -1; // falta anchura → abrir
    for (let d = 2; d <= 60; d += 2) {
      if (separacion(sentido * d) * f0 <= 0) {
        a = Math.min(0, sentido * d); b = Math.max(0, sentido * d); hay = true; break;
      }
    }
    if (!hay) {
      // La cadera no da para tanto: se deja como estaba. Es una conclusión
      // ergonómica —esa apertura no se aguanta— y se avisa como las demás.
      separacion(0);
      this.acomodacionAlLimite = true;
      return false;
    }
    const fa = separacion(a);
    for (let i = 0; i < 30; i++) {
      const m = (a + b) / 2;
      if (separacion(m) * fa > 0) a = m; else b = m;
    }
    separacion((a + b) / 2);
    return Math.abs((a + b) / 2) > 1e-3;
  }

  /**
   * LA BARRA SE QUEDA SOBRE EL MEDIO DEL PIE (v0.2.99).
   *
   * «La limitación del rango de movimiento del tobillo (dorsiflexión limitada)
   * hace que durante el movimiento la barra se desplace muy posterior al centro
   * de gravedad (el medio del pie). En el mundo real este atleta caería
   * irremediablemente hacia atrás producto del peso de la barra.»
   *
   * La regla es la misma que gobierna cualquier sentadilla real: la carga se
   * mantiene sobre la base de apoyo. Quien la cumple es el TRONCO, porque la
   * cadera retrocede al bajar y el pecho tiene que adelantarse para
   * compensarla. Así que la columna deja de ser un ángulo del reparto y se
   * RESUELVE en cada paso, por bisección sobre su rotación, midiendo la barra
   * en vivo contra la huella.
   *
   * Y la diferencia entre frontal y trasera sale sola: la barra va rígida al
   * tronco pero apoyada en sitios distintos —clavículas o trapecios—, así que
   * dejarla sobre el mismo punto del suelo pide inclinaciones distintas. No hay
   * que declarar en ninguna parte que la frontal va más vertical: lo dice la
   * geometría del apoyo.
   */
  private acomodarEquilibrio(
    joints: Record<string, THREE.Object3D>,
    sobre: "spine" | "hip",
  ): boolean {
    const fig = this.humanFigure;
    const enlace = this.barraManiqui;
    if (!fig || !enlace || enlace.rackeada) return false;
    // QUIÉN CEDE PARA EQUILIBRAR. En la trasera, el tronco. En la frontal, la
    // cadera —el tronco se queda vertical y la rodilla se adelanta—, y entonces
    // son dos articulaciones que se mueven juntas, una por pierna.
    const piezas = sobre === "spine"
      ? [joints.spine]
      : [joints.hipL, joints.hipR];
    const nombres = sobre === "spine" ? ["spine"] : ["hipL", "hipR"];
    if (piezas.some((j) => !j) || nombres.some((n) => this.jointLocks.has(n))) return false;
    const barra = this.objects.get(enlace.objectId);
    const limites = nombres.map((n) => JOINT_DOF[n]?.x);
    const huella = this.huellaDeLosPies();
    if (!barra || limites.some((l) => !l) || !huella) return false;
    // El corchete es el rango común: fuera de él una de las dos caderas ya no
    // podría acompañar y dejarían de moverse juntas.
    const lim: [number, number] = [
      Math.max(...limites.map((l) => l![0])),
      Math.min(...limites.map((l) => l![1])),
    ];
    const adelante = new THREE.Vector3(0, 0, 1).applyQuaternion(fig.quaternion).setY(0).normalize();
    // SE MUEVE UN INCREMENTO, NO UN ÁNGULO ABSOLUTO. Igualando las dos caderas
    // al mismo valor se borraría cualquier asimetría que el usuario haya puesto
    // a mano; con un incremento común, la asimetría se conserva y las dos
    // caderas siguen haciendo lo mismo, que es lo que pide la sentadilla.
    const base = piezas.map((j) => radToDeg(j!.rotation.x));
    const original = base[0];
    // EL TOBILLO VA DETRÁS DE LA CADERA, dentro de cada sondeo. Mover la cadera
    // sin mover el tobillo levanta el pie del suelo, y entonces «el medio del
    // pie» deja de significar nada: el primer intento saturó la cadera en su
    // tope de +30° y el tobillo en el suyo de −50°. La cadena cerrada del apoyo
    // es la de siempre —`tobillo = objetivo − (cadera + rodilla)`, la misma que
    // usa la acomodación de la planta—, así que cada sondeo se hace con el pie
    // ya plantado y lo que se mide es una postura de verdad.
    const tobillos = sobre !== "hip" ? [] : (["L", "R"] as const)
      .map((l) => ({
        pieza: joints[`ankle${l}`],
        cadera: joints[`hip${l}`],
        rodilla: joints[`knee${l}`],
        lim: JOINT_DOF[`ankle${l}`]?.x,
        objetivo: this.objetivoDeAcomodacion(`ankle${l}`, [`hip${l}`, `knee${l}`], joints),
      }))
      .filter((t) => t.pieza && t.cadera && t.rodilla && t.lim);
    const desvio = (deg: number): number => {
      const d = deg - original;
      piezas.forEach((j, i) => {
        const l = limites[i]!;
        j!.rotation.x = degToRad(Math.max(l[0], Math.min(l[1], base[i] + d)));
      });
      // El tobillo cierra la cadena con la cadera y la rodilla de SU lado.
      for (const t of tobillos) {
        const q = t.objetivo
          - radToDeg(t.cadera!.rotation.x)
          - radToDeg(t.rodilla!.rotation.x);
        t.pieza!.rotation.x = degToRad(Math.max(t.lim![0], Math.min(t.lim![1], q)));
      }
      fig.updateMatrixWorld(true);
      this.tantearBarraEnElCuerpo();
      // LA HUELLA SE VUELVE A MEDIR EN CADA SONDEO, y no vale congelarla. La
      // pelvis es la RAÍZ del rig: girar la cadera mueve las PIERNAS, no el
      // tronco, así que la barra se queda donde está y lo que viaja es el pie.
      // Con la huella congelada la función salía casi plana —no había raíz que
      // encontrar y la cadera no se movía ni un grado—. Medida contra la huella
      // de cada sondeo, lo que se anula es la distancia RELATIVA entre barra y
      // pisada, que es justo lo que sobrevive al replantado del final del paso.
      const h = this.huellaDeLosPies() ?? huella;
      return barra.mesh.position.dot(adelante)
        - h.L.clone().add(h.R).multiplyScalar(0.5).dot(adelante);
    };
    // LA RAÍZ SE BUSCA CERCA, como en la plomada del brazo. Barrer el rango
    // entero de la cadera (−135° a +30°) pasa por posturas imposibles —la pierna
    // plegada sobre sí misma, el pie sin apoyo— donde la medida no significa
    // nada, y la bisección se va a la rama absurda. Se abre el corchete desde
    // donde está AHORA hacia los dos lados: esa es la solución continua.
    let a = original, b = original;
    const f0 = desvio(original);
    let hay = Math.abs(f0) < 1e-4;
    for (let d = 2; d <= 240 && !hay; d += 2) {
      const arriba = Math.min(lim[1], original + d);
      const abajo = Math.max(lim[0], original - d);
      if (desvio(arriba) * f0 <= 0) { a = original; b = arriba; hay = true; break; }
      if (desvio(abajo) * f0 <= 0) { a = abajo; b = original; hay = true; break; }
      if (arriba === lim[1] && abajo === lim[0]) break;
    }
    if (!hay) {
      // No hay equilibrio alcanzable: se deja como estaba y se avisa por el
      // mismo canal que el tobillo sin recorrido. Es una conclusión ergonómica
      // —esa sentadilla no se aguanta—, no un fallo.
      desvio(original);
      this.acomodacionAlLimite = true;
      return false;
    }
    const fa = desvio(a);
    for (let i = 0; i < 40; i++) {
      const m = (a + b) / 2;
      if (desvio(m) * fa > 0) a = m; else b = m;
    }
    const sol = (a + b) / 2;
    desvio(sol);
    return Math.abs(sol - original) > 1e-3;
  }

  /**
   * LA BARRA ROZA EL CUERPO, NO LO ATRAVIESA (v0.2.98).
   *
   * «La barra debe detectar colisión con la pierna, el muslo y cadera (de forma
   * que la barra desliza anterior y sobre ellas, y al bloqueo no se hunde en el
   * cuerpo).» Es lo que hace un peso muerto de verdad: la barra sube arrastrando
   * por la espinilla y el muslo, y quien dicta su carril en ese tramo es la
   * SUPERFICIE DEL CUERPO, no una recta ideal.
   *
   * Sin esto se hundía en toda la subida —1,44 cm en la espinilla, 1,36 en el
   * muslo y 1,35 en la pelvis justo en el bloqueo, que es donde se ve—, porque
   * la plomada persigue la vertical del medio del pie y el cuerpo no le importa.
   *
   * CÓMO SE RESUELVE. La barra cuelga de los hombros por los brazos, así que se
   * mueve girando los DOS hombros a la vez, con el mismo incremento: moviendo
   * uno solo la barra se ladearía. Se mide la penetración de verdad —distancia
   * de cada vértice de los segmentos al EJE de la barra, contra su radio— y se
   * avanza en la dirección que saca la barra hacia delante hasta que la
   * penetración se anula, afinando después por bisección. Solo corrige hacia
   * ADELANTE: si la barra ya está limpia, no se toca nada, y por eso esto
   * convive con la plomada en vez de pelearse con ella.
   */
  private acomodarRoce(
    lados: string[],
    segmentos: string[],
    joints: Record<string, THREE.Object3D>,
  ): boolean {
    const fig = this.humanFigure;
    const enlace = this.barraManiqui;
    if (!fig || !enlace || enlace.rackeada) return false;
    const barra = this.objects.get(enlace.objectId);
    if (!barra) return false;
    const hombros = lados
      .map((l) => ({ nombre: `shoulder${l}`, obj: joints[`shoulder${l}`], lim: JOINT_DOF[`shoulder${l}`]?.x }))
      .filter((h) => h.obj && h.lim && !this.jointLocks.has(h.nombre));
    if (hombros.length === 0) return false;
    const original = hombros.map((h) => radToDeg(h.obj!.rotation.x));

    const mallas: THREE.Mesh[] = [];
    fig.traverse((n) => {
      const id = (n as THREE.Mesh).userData?.segmentId as string | undefined;
      if (id && segmentos.includes(id) && (n as THREE.Mesh).isMesh) mallas.push(n as THREE.Mesh);
    });
    if (mallas.length === 0) return false;

    const radio = barra.params?.radiusTop ?? barra.params?.radiusBottom ?? 1.45;
    const adelante = new THREE.Vector3(0, 0, 1).applyQuaternion(fig.quaternion).setY(0).normalize();
    const arriba = new THREE.Vector3(0, 1, 0);
    const v = new THREE.Vector3();

    /** Deja los hombros en `original + d` y devuelve [penetración, sagital]. */
    const sondear = (d: number): [number, number] => {
      hombros.forEach((h, i) => {
        const lim = h.lim!;
        h.obj!.rotation.x = degToRad(Math.max(lim[0], Math.min(lim[1], original[i] + d)));
      });
      fig.updateMatrixWorld(true);
      this.tantearBarraEnElCuerpo();
      const eje = barra.mesh.position;
      let dentro = 0;
      for (const m of mallas) {
        m.updateMatrixWorld(true);
        const pos = m.geometry.getAttribute("position");
        for (let i = 0; i < pos.count; i++) {
          const w = v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld).sub(eje);
          // Distancia al EJE de la barra: el eje es lateral, así que solo
          // cuentan la componente vertical y la sagital.
          const dist = Math.hypot(w.dot(arriba), w.dot(adelante));
          if (radio - dist > dentro) dentro = radio - dist;
        }
      }
      return [dentro, eje.dot(adelante)];
    };

    const [pen0, sag0] = sondear(0);
    if (pen0 <= 1e-3) { sondear(0); return false; } // ya va limpia

    // ¿HACIA QUÉ LADO GIRA EL HOMBRO PARA ADELANTAR LA BARRA? No se supone: se
    // prueba. El signo depende de la inclinación del tronco, que cambia entero
    // a lo largo del gesto.
    const [, sagMas] = sondear(1);
    const signo = sagMas > sag0 ? 1 : -1;

    // Se avanza hasta sacarla, con un tope: si hicieran falta más de 30° el
    // problema no es el roce y forzarlo destrozaría la plomada.
    let limpio: number | null = null;
    let sucio = 0;
    for (let d = 1; d <= 30; d += 1) {
      const [pen] = sondear(signo * d);
      if (pen <= 1e-3) { limpio = signo * d; break; }
      sucio = signo * d;
    }
    if (limpio === null) {
      // No hay ángulo que la saque: se deja en el que menos la hunde y se avisa
      // por el mismo canal que el tobillo sin recorrido.
      sondear(sucio);
      this.acomodacionAlLimite = true;
      return true;
    }
    // Afinado: el mínimo giro que la deja rozando, no flotando.
    let a = sucio, b = limpio;
    for (let i = 0; i < 24; i++) {
      const m = (a + b) / 2;
      if (sondear(m)[0] > 1e-3) a = m; else b = m;
    }
    sondear(b);
    return hombros.some((h, i) => Math.abs(radToDeg(h.obj!.rotation.x) - original[i]) > 1e-3);
  }

  /** Modo de gizmo que corresponde a la herramienta activa. */
  private modoDeHerramienta(): TransformMode {
    if (this.herramienta === "rotar") return "rotate";
    if (this.herramienta === "escalar") return "scale";
    return "translate";
  }

  /**
   * Aplica la herramienta al gizmo: el gizmo de PIEZAS/GRUPOS solo está
   * activo y visible con mover/rotar/escalar; los demás objetivos (p. ej.
   * una articulación del maniquí) conservan su gizmo.
   */
  private aplicarHerramientaGizmo(): void {
    const esPieza =
      this.gizmo.object === this.groupProxy ||
      (this.selected !== null && this.gizmo.object === this.selected.mesh);
    const transformando =
      this.herramienta === "mover" ||
      this.herramienta === "rotar" ||
      this.herramienta === "escalar";
    const activo = !esPieza || transformando;
    this.gizmo.enabled = activo;
    const helper = (this.gizmo as unknown as { getHelper?: () => THREE.Object3D })
      .getHelper?.();
    (helper ?? (this.gizmo as unknown as THREE.Object3D)).visible =
      activo && this.gizmo.object !== undefined && this.gizmo.object !== null;
  }

  private beginMarquee(e: PointerEvent): void {
    this.marquee = {
      x0: e.clientX,
      y0: e.clientY,
      x1: e.clientX,
      y1: e.clientY,
      additive: e.ctrlKey || e.metaKey || e.shiftKey,
    };
    this.orbit.enabled = false;
    const div = document.createElement("div");
    div.className = "marquee";
    document.body.appendChild(div);
    this.marqueeEl = div;
    this.updateMarquee(e);
  }

  private updateMarquee(e: PointerEvent): void {
    if (!this.marquee || !this.marqueeEl) return;
    this.marquee.x1 = e.clientX;
    this.marquee.y1 = e.clientY;
    const x = Math.min(this.marquee.x0, this.marquee.x1);
    const y = Math.min(this.marquee.y0, this.marquee.y1);
    const w = Math.abs(this.marquee.x1 - this.marquee.x0);
    const h = Math.abs(this.marquee.y1 - this.marquee.y0);
    Object.assign(this.marqueeEl.style, {
      left: `${x}px`,
      top: `${y}px`,
      width: `${w}px`,
      height: `${h}px`,
    });
  }

  /** Cierra el recuadro y selecciona todo lo que cae dentro. */
  private finishMarquee(): void {
    const m = this.marquee;
    this.cancelMarquee();
    if (!m) return;
    if (!m.additive) this.select(null); // limpia selección y multiselección
    const rect = this.canvas.getBoundingClientRect();
    const nx = (cx: number): number => ((cx - rect.left) / rect.width) * 2 - 1;
    const ny = (cy: number): number => -((cy - rect.top) / rect.height) * 2 + 1;
    const minX = Math.min(nx(m.x0), nx(m.x1));
    const maxX = Math.max(nx(m.x0), nx(m.x1));
    const minY = Math.min(ny(m.y0), ny(m.y1));
    const maxY = Math.max(ny(m.y0), ny(m.y1));
    const v = new THREE.Vector3();
    const inside: string[] = [];
    for (const o of this.objects.values()) {
      o.mesh.getWorldPosition(v).project(this.sceneManager.camera);
      if (v.z < 1 && v.x >= minX && v.x <= maxX && v.y >= minY && v.y <= maxY) {
        inside.push(o.id);
      }
    }
    // Un miembro dentro arrastra a todo su grupo (los grupos son unidades).
    const ids = new Set<string>(inside);
    for (const id of inside) {
      const gid = this.objGroup.get(id);
      if (gid) this.groups.get(gid)?.ids.forEach((i) => ids.add(i));
    }
    for (const id of ids) {
      const o = this.objects.get(id);
      if (!o || this.multiSel.has(id)) continue;
      this.multiSel.add(id);
      this.setHighlight(o, true);
    }
    this.refreshMultiGizmo(true);
    this.bus.emit("selectionChanged", { selected: null });
    this.bus.emit("groupingChanged", { multi: this.multiSel.size, groupSelected: false });
  }

  private cancelMarquee(): void {
    this.marqueeEl?.remove();
    this.marqueeEl = null;
    this.marquee = null;
    this.orbit.enabled = true;
  }

  // ------------------------------------ portapapeles (copiar/pegar/eliminar)

  /** Ids de la selección actual (pieza, multiselección o grupo). */
  getSelectionIds(): string[] {
    if (this.selected) return [this.selected.id];
    if (this.multiSel.size > 0) return [...this.multiSel];
    if (this.selectedGroupId) return [...(this.groups.get(this.selectedGroupId)?.ids ?? [])];
    return [];
  }

  /** Copia la selección al portapapeles interno (datos del proyecto). */
  copySelection(): void {
    const ids = this.getSelectionIds();
    if (ids.length === 0) return;
    const all = this.serialize().objects;
    this.clipboard = [];
    for (const id of ids) {
      const o = this.objects.get(id);
      const data = all.find((d) => d.id === id);
      if (!o || !data) continue;
      // Las piezas de entorno con geometría propia (techo de planta) se copian
      // clonando su malla, como las importadas.
      this.clipboard.push({
        data: JSON.parse(JSON.stringify(data)) as ProjectData["objects"][number],
        category: o.category,
        importedGeometry:
          o.imported || o.componentId.startsWith("ws-") ? o.mesh.geometry.clone() : null,
      });
    }
  }

  /** Pega el portapapeles con un pequeño desplazamiento y lo deja seleccionado. */
  pasteClipboard(): void {
    if (this.clipboard.length === 0) return;
    const offset = new THREE.Vector3(15, 0, 15);
    const created: string[] = [];
    for (const entry of this.clipboard) {
      const d = entry.data;
      let obj: SceneObject;
      if (entry.importedGeometry) {
        obj = new SceneObject({
          name: `${d.name} copia`,
          componentId: d.componentId,
          category: entry.category,
          params: { ...d.params },
          physics: { ...d.physics },
          materialId: d.materialId,
          importedGeometry: entry.importedGeometry.clone(),
        });
        this.sceneManager.content.add(obj.mesh);
        this.objects.set(obj.id, obj);
      } else {
        obj = this.addComponent(d.componentId);
        obj.params = {
          ...d.params,
          path: d.params.path?.map((n) => [...n] as [number, number, number]),
          // Los anclajes del portapapeles apuntan a las piezas del original
          // (ver `duplicateObject`): la pegada nace suelta.
          anclajes: undefined,
        };
        if (d.stack) obj.stack = { ...d.stack };
        obj.rebuildGeometry();
      }
      obj.setMaterial(d.materialId);
      aplicarModeloMaquina(obj, d.modeloMaquina);
      obj.physics = { ...d.physics };
      obj.mesh.position.fromArray(d.position).add(offset);
      obj.mesh.quaternion.fromArray(d.quaternion);
      if (d.scale) obj.mesh.scale.fromArray(d.scale);
      this.normalizarEspejo(obj);
      created.push(obj.id);
    }
    // Deja lo pegado como selección activa (listo para mover en bloque).
    this.select(null);
    for (const id of created) {
      const o = this.objects.get(id);
      if (o) {
        this.multiSel.add(id);
        this.setHighlight(o, true);
      }
    }
    this.refreshMultiGizmo(true);
    this.bus.emit("objectsChanged", { objects: this.listObjects() });
    this.bus.emit("groupingChanged", { multi: this.multiSel.size, groupSelected: false });
    this.scheduleAutosave();
  }

  /** Elimina la selección actual: pieza, multiselección, grupo o cuerda. */
  deleteSelection(): void {
    if (this.selected) {
      this.removeObject(this.selected);
      return;
    }
    if (this.multiSel.size > 0) {
      for (const id of [...this.multiSel]) {
        const o = this.objects.get(id);
        if (o) this.removeObject(o);
      }
      this.gizmo.detach();
      this.bus.emit("groupingChanged", { multi: 0, groupSelected: false });
      return;
    }
    if (this.selectedGroupId) {
      this.deleteSelectedGroup();
      return;
    }
    if (this.selectedRopeId) this.deleteRope(this.selectedRopeId);
  }

  // -------------------------------------------------- deshacer / rehacer

  /** Instantánea diferida del proyecto tras cada cambio (para deshacer). */
  private historyPush(): void {
    if (this.applyingHistory || this.simulating || this.autosaveSuspended) return;
    if (this.historyTimer !== null) clearTimeout(this.historyTimer);
    this.historyTimer = setTimeout(() => {
      this.historyTimer = null;
      this.historyCommit();
    }, 300);
  }

  private historyCommit(): void {
    if (this.applyingHistory || this.simulating) return;
    const snap = JSON.stringify(this.serialize());
    if (snap === this.history[this.hIndex]) return;
    this.history.splice(this.hIndex + 1);
    this.history.push(snap);
    if (this.history.length > 60) this.history.shift();
    this.hIndex = this.history.length - 1;
    this.emitHistory();
  }

  /** Reinicia el historial con el estado actual como punto de partida. */
  private resetHistory(): void {
    if (this.historyTimer !== null) {
      clearTimeout(this.historyTimer);
      this.historyTimer = null;
    }
    this.history = [JSON.stringify(this.serialize())];
    this.hIndex = 0;
    this.emitHistory();
  }

  private emitHistory(): void {
    this.bus.emit("historyChanged", {
      canUndo: this.hIndex > 0,
      canRedo: this.hIndex < this.history.length - 1,
    });
  }

  async undo(): Promise<void> {
    if (this.simulating) return;
    // Si hay una instantánea pendiente de confirmar, ciérrala primero.
    if (this.historyTimer !== null) {
      clearTimeout(this.historyTimer);
      this.historyTimer = null;
      this.historyCommit();
    }
    if (this.hIndex <= 0) return;
    this.hIndex--;
    await this.applyHistory();
  }

  async redo(): Promise<void> {
    if (this.simulating || this.hIndex >= this.history.length - 1) return;
    this.hIndex++;
    await this.applyHistory();
  }

  private async applyHistory(): Promise<void> {
    this.applyingHistory = true;
    try {
      await this.loadProjectInner(JSON.parse(this.history[this.hIndex]) as ProjectData);
    } finally {
      this.applyingHistory = false;
    }
    this.emitHistory();
    // OJO: aquí NO se programa historyPush (scheduleAutosave lo haría): al
    // recargar cambian los ids internos y la instantánea "nueva" truncaría la
    // rama de rehacer — era el fallo de Ctrl+Z/Ctrl+Y encadenados (v0.2.1).
    // Solo se persiste el autoguardado con el estado recién aplicado.
    this.dirty = true;
    if (this.autosaveTimer !== null) {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = null;
    }
    this.writeAutosave();
    this.requestRender();
  }

  private setHighlight(obj: SceneObject, on: boolean): void {
    const m = obj.mesh.material as THREE.MeshStandardMaterial;
    if (!m || !m.emissive) return;
    // El rojo de error (fuera del espacio editable) prevalece sobre la selección.
    if (this.fueraIds.has(obj.id)) m.emissive.setHex(0x9c1c1c);
    else m.emissive.setHex(on ? 0x14406a : 0x000000);
  }

  private clearMultiSel(): void {
    for (const id of this.multiSel) {
      const o = this.objects.get(id);
      if (o) this.setHighlight(o, false);
    }
    this.multiSel.clear();
  }

  private clearGroupHighlight(): void {
    if (!this.selectedGroupId) return;
    const g = this.groups.get(this.selectedGroupId);
    g?.ids.forEach((id) => {
      const o = this.objects.get(id);
      if (o) this.setHighlight(o, false);
    });
  }

  /** Anade/quita un objeto a la multiseleccion (para agrupar). */
  private toggleMulti(obj: SceneObject): void {
    this.clearGroupHighlight();
    this.selected = null;
    this.selectedFigure = false;
    this.selectedGroupId = null;
    this.gizmo.detach();
    if (this.multiSel.has(obj.id)) {
      this.multiSel.delete(obj.id);
      this.setHighlight(obj, false);
    } else {
      this.multiSel.add(obj.id);
      this.setHighlight(obj, true);
    }
    this.refreshMultiGizmo(true);
    this.bus.emit("selectionChanged", { selected: null });
    this.bus.emit("groupingChanged", { multi: this.multiSel.size, groupSelected: false });
  }

  /** Añade/quita TODO un grupo a la multiselección (Ctrl+clic sobre un miembro). */
  private toggleMultiGroup(gid: string): void {
    const g = this.groups.get(gid);
    if (!g) return;
    this.clearGroupHighlight();
    this.selected = null;
    this.selectedFigure = false;
    this.selectedGroupId = null;
    const allIn = g.ids.every((id) => this.multiSel.has(id));
    for (const id of g.ids) {
      const o = this.objects.get(id);
      if (!o) continue;
      if (allIn) {
        this.multiSel.delete(id);
        this.setHighlight(o, false);
      } else {
        this.multiSel.add(id);
        this.setHighlight(o, true);
      }
    }
    this.refreshMultiGizmo(true);
    this.bus.emit("selectionChanged", { selected: null });
    this.bus.emit("groupingChanged", { multi: this.multiSel.size, groupSelected: false });
  }

  /**
   * Coloca el gizmo en el centroide de la multiselección para mover/rotar el
   * conjunto en bloque (mismo mecanismo de proxy que los grupos).
   */
  private refreshMultiGizmo(attachFresh = false): void {
    if (this.multiSel.size === 0) {
      if (this.gizmo.object === this.groupProxy) this.gizmo.detach();
      return;
    }
    const centroid = new THREE.Vector3();
    let n = 0;
    for (const id of this.multiSel) {
      const o = this.objects.get(id);
      if (o) {
        centroid.add(o.mesh.position);
        n++;
      }
    }
    if (n === 0) return;
    centroid.multiplyScalar(1 / n);
    this.groupProxy.position.copy(centroid);
    this.groupProxy.quaternion.identity();
    this.groupProxy.scale.set(1, 1, 1);
    this.groupProxy.updateMatrixWorld(true);
    this.groupPrev.copy(this.groupProxy.matrixWorld);
    this.resetGizmoAxes();
    this.gizmo.attach(this.groupProxy);
    if (attachFresh) this.setMode(this.modoDeHerramienta());
    this.aplicarHerramientaGizmo();
  }

  /** Aplica el delta del proxy a todos los objetos de la multiselección. */
  private applyMultiDelta(): void {
    this.groupProxy.updateMatrixWorld(true);
    const cur = this.groupProxy.matrixWorld;
    const delta = cur.clone().multiply(this.groupPrev.clone().invert());
    for (const id of this.multiSel) {
      const o = this.objects.get(id);
      if (!o) continue;
      const m = new THREE.Matrix4().compose(o.mesh.position, o.mesh.quaternion, o.mesh.scale);
      m.premultiply(delta);
      m.decompose(o.mesh.position, o.mesh.quaternion, o.mesh.scale);
      this.actualizarAtadosDeObjeto(o.id);
    }
    this.transformarUniones(delta, this.multiSel);
    this.cablesDirty = true;
    this.groupPrev.copy(cur);
    this.bus.emit("grupoTransformado", { fuente: "gizmo" });
  }

  /**
   * Las ARTICULACIONES viajan con el conjunto (v0.2.25): el ancla se guarda
   * en coordenadas de MUNDO y el eje como dirección global, así que al mover
   * o girar un grupo/multiselección hay que aplicarles el MISMO delta que a
   * las piezas — si no, el solver reconstruye la bisagra en el punto viejo y
   * la máquina se destroza al arrancar la simulación. Solo se transforman las
   * uniones cuyas DOS piezas van dentro del conjunto (si solo va una, la
   * geometría relativa cambió de verdad y el ancla de diseño se respeta).
   */
  private transformarUniones(delta: THREE.Matrix4, ids: Iterable<string>): void {
    const set = ids instanceof Set ? (ids as Set<string>) : new Set(ids);
    const pos = new THREE.Vector3();
    const rot = new THREE.Quaternion();
    const esc = new THREE.Vector3();
    delta.decompose(pos, rot, esc);
    let alguna = false;
    for (const j of this.joints.values()) {
      if (!set.has(j.bodyAId) || !set.has(j.bodyBId)) continue;
      j.anchor.applyMatrix4(delta);
      const eje = j.ejeVector().applyQuaternion(rot).normalize();
      // Si el eje girado vuelve a caer sobre una letra cardinal POSITIVA se
      // guarda como letra (editable en el panel); cualquier otra dirección
      // queda como vector libre. La cardinal negativa también queda como
      // vector: volcarla a la letra invertiría el sentido de giro y el
      // significado de los límites min/max.
      const letra: AxisName | null =
        eje.x > 0.9999 ? "x" : eje.y > 0.9999 ? "y" : eje.z > 0.9999 ? "z" : null;
      if (letra) {
        j.axis = letra;
        j.axisVec = null;
      } else {
        j.axisVec = eje;
      }
      alguna = true;
    }
    if (alguna) {
      this.refreshJointHelpers();
      this.bus.emit("jointsChanged", { joints: this.listJoints() });
    }
  }

  /**
   * TRANSFORMACIÓN NUMÉRICA DEL GRUPO (v0.2.13): pose exacta del gizmo
   * colectivo (grupo o multiselección) para el panel de Propiedades —
   * posición del centro (cm) y rotación (°)/escala ACUMULADAS desde que
   * se tomó la selección (el proxy nace en 0°/×1 al seleccionar).
   */
  transformGrupo(): { pos: THREE.Vector3; rotDeg: THREE.Vector3; escala: number } | null {
    if (!this.selectedGroupId && this.multiSel.size === 0) return null;
    if (this.gizmo.object !== this.groupProxy) return null;
    const e = new THREE.Euler().setFromQuaternion(this.groupProxy.quaternion, "XYZ");
    return {
      pos: this.groupProxy.position.clone(),
      rotDeg: new THREE.Vector3(
        THREE.MathUtils.radToDeg(e.x),
        THREE.MathUtils.radToDeg(e.y),
        THREE.MathUtils.radToDeg(e.z),
      ),
      escala: this.groupProxy.scale.x,
    };
  }

  /**
   * Fija numéricamente la pose del grupo: mueve el centro a la posición
   * exacta, gira alrededor del centro hasta los grados pedidos y/o escala
   * uniformemente — el delta se aplica a TODAS las piezas de la selección,
   * igual que un arrastre del gizmo.
   */
  setTransformGrupo(cambio: {
    pos?: { x?: number; y?: number; z?: number };
    rotDeg?: { x?: number; y?: number; z?: number };
    escala?: number;
  }): void {
    if (!this.selectedGroupId && this.multiSel.size === 0) return;
    if (this.gizmo.object !== this.groupProxy) return;
    if (cambio.pos) {
      if (Number.isFinite(cambio.pos.x)) this.groupProxy.position.x = cambio.pos.x!;
      if (Number.isFinite(cambio.pos.y)) this.groupProxy.position.y = cambio.pos.y!;
      if (Number.isFinite(cambio.pos.z)) this.groupProxy.position.z = cambio.pos.z!;
    }
    if (cambio.rotDeg) {
      const e = new THREE.Euler().setFromQuaternion(this.groupProxy.quaternion, "XYZ");
      if (Number.isFinite(cambio.rotDeg.x)) e.x = THREE.MathUtils.degToRad(cambio.rotDeg.x!);
      if (Number.isFinite(cambio.rotDeg.y)) e.y = THREE.MathUtils.degToRad(cambio.rotDeg.y!);
      if (Number.isFinite(cambio.rotDeg.z)) e.z = THREE.MathUtils.degToRad(cambio.rotDeg.z!);
      this.groupProxy.quaternion.setFromEuler(e);
    }
    if (cambio.escala !== undefined && Number.isFinite(cambio.escala) && cambio.escala > 0.01) {
      this.groupProxy.scale.setScalar(cambio.escala);
    }
    if (this.selectedGroupId) this.applyGroupDelta();
    else this.applyMultiDelta();
    this.bus.emit("grupoTransformado", { fuente: "numerico" });
    this.scheduleAutosave();
    this.requestRender();
  }

  /** Crea un grupo (subensamblaje) a partir de la multiseleccion (>=2). */
  createGroup(): void {
    this.createGroupFromIds([...this.multiSel]);
  }

  // ------------------------------------------------------------- soldar
  /**
   * SOLDAR LA SELECCIÓN (v0.3.9).
   *
   * Agrupar deja un subensamblaje que se mueve junto EN EL EDITOR, pero al
   * simular sus piezas siguen siendo cuerpos sueltos: un brazo compuesto de
   * cinco tubos agrupados se desarma en el primer fotograma. Para que aguante
   * había que ir a Conexiones y crear a mano una unión bloqueada por cada
   * pareja que se toca — que es exactamente lo que el imán de nodos hace de
   * una en una cuando se sueltan dos nodos encima.
   *
   * Esta herramienta hace las dos cosas de un gesto: agrupa como «Agrupar» y
   * además SUELDA cada pareja de piezas del conjunto que se tocan, poniendo la
   * unión en su punto de contacto. La física reconoce esas uniones bloqueadas,
   * las une por componentes conexas y funde el conjunto en UN SOLO CUERPO
   * RÍGIDO (`agruparSoldadas` / `fundirSoldadas`, src/physics/PhysicsWorld.ts),
   * así que la estructura se mueve entera y choca entera.
   *
   * Las soldaduras son uniones normales: se ven en Conexiones, se pueden
   * desbloquear (y pasan a ser bisagras) o borrar una a una.
   */
  soldarSeleccion(): ReporteSoldadura {
    return this.soldarPiezas([...this.multiSel]);
  }

  /**
   * Suelda y agrupa una lista de piezas. Devuelve un parte de lo ocurrido: la
   * interfaz lo usa para avisar, y las pruebas para medirlo.
   */
  soldarPiezas(ids: string[], holguraCm = 2): ReporteSoldadura {
    const vacio: ReporteSoldadura = {
      soldaduras: 0,
      piezas: 0,
      sueltas: [],
      grupo: null,
      anclado: false,
      aviso: null,
    };
    if (this.simulating) {
      return {
        ...vacio,
        aviso: tt(
          "No se puede soldar con la máquina en marcha: para la simulación.",
          "Cannot weld while the machine is running: stop the simulation.",
        ),
      };
    }
    // El espacio de trabajo (suelo, paredes) no se suelda a nada.
    const limpios = ids.filter((id) => {
      const o = this.objects.get(id);
      return !!o && !o.componentId.startsWith("ws-");
    });
    if (limpios.length < 2) {
      return {
        ...vacio,
        aviso: tt(
          "Selecciona dos o más piezas para soldarlas.",
          "Select two or more parts to weld them.",
        ),
      };
    }

    // AGRUPAR PRIMERO, SOLDAR DESPUÉS. `createGroupFromIds` ABSORBE los grupos
    // a los que ya perteneciera alguna pieza (una roldana trae su eje, una
    // máquina insertada se trae entera), así que el conjunto final puede ser
    // mayor que la selección — y son ESAS piezas las que hay que soldar, no
    // las que se tocaron con el ratón.
    const gid = this.createGroupFromIds(limpios);
    const miembros = gid ? (this.groups.get(gid)?.ids ?? limpios) : limpios;
    if (gid) this.renameGroup(gid, tt("Conjunto soldado", "Welded assembly"));

    const piezas = miembros
      .map((id) => this.objects.get(id))
      .filter((o): o is SceneObject => !!o);
    for (const o of piezas) o.mesh.updateMatrixWorld(true);

    // Se suelda CADA pareja que se toca, no un árbol mínimo: así borrar una
    // soldadura no parte el conjunto en dos, y el parte de Conexiones se
    // parece a la estructura de verdad. La física no sufre por las de más:
    // une por componentes conexas y las repetidas no añaden restricción.
    let soldaduras = 0;
    const tocadas = new Set<string>();
    // Las cajas de cada pieza se calculan UNA vez: una viga doblada aporta
    // hasta 32 tramos y el barrido es de todas contra todas.
    const cajas = new Map<string, CajaOr[]>();
    for (const o of piezas) cajas.set(o.id, this.cajasDePieza(o));
    for (let i = 0; i < piezas.length; i++) {
      for (let j = i + 1; j < piezas.length; j++) {
        const a = piezas[i];
        const b = piezas[j];
        // Se mide contra la FORMA real de cada pieza (tramo a tramo en las
        // vigas dobladas), no contra su envolvente, y se admite la holgura
        // con la que un usuario coloca a ojo: se sueldan las que se tocan,
        // las que se interpenetran y las que quedan a un pelo.
        const par = this.parMasCercano(cajas.get(a.id)!, cajas.get(b.id)!);
        if (par.hueco > Math.abs(holguraCm)) continue;
        tocadas.add(a.id);
        tocadas.add(b.id);
        if (this.soldarPar(a, b, this.puntoDeContacto(par.a, par.b))) soldaduras++;
      }
    }

    const sueltas = piezas.filter((o) => !tocadas.has(o.id)).map((o) => o.name);
    // CONJUNTO ANCLADO: la física ancla el grupo soldado entero si UNA sola de
    // sus piezas está fijada (src/physics/PhysicsWorld.ts, `agruparSoldadas`).
    // Para un brazo móvil eso es justo lo contrario de lo que se busca, así que
    // se avisa — pero no se le toca la física a nadie a sus espaldas.
    const anclado = piezas.some((o) => o.physics.fixed);

    this.refreshJointHelpers();
    this.bus.emit("jointsChanged", { joints: this.listJoints() });
    this.scheduleAutosave();
    this.requestRender();

    let aviso: string | null = null;
    if (soldaduras === 0) {
      aviso = tt(
        "Ninguna de las piezas se toca: acércalas hasta que se rocen y vuelve a soldar.",
        "None of the parts touch: bring them together until they meet and weld again.",
      );
    } else if (sueltas.length > 0) {
      aviso = tt(
        `⚠ ${soldaduras} soldadura(s). ${sueltas.length} pieza(s) quedaron SUELTAS `
          + `(no tocan a ninguna otra): ${sueltas.join(", ")}`,
        `⚠ ${soldaduras} weld(s). ${sueltas.length} part(s) were left LOOSE `
          + `(they touch no other): ${sueltas.join(", ")}`,
      );
    } else if (anclado) {
      aviso = tt(
        `🔩 ${soldaduras} soldadura(s). Ojo: hay una pieza FIJA en el conjunto, `
          + "así que al simular quedará anclado entero. Quítale «Fija» en "
          + "Propiedades si lo quieres móvil.",
        `🔩 ${soldaduras} weld(s). Note: one part is FIXED, so the whole assembly `
          + "will be anchored when simulating. Untick «Fixed» in Properties to "
          + "make it mobile.",
      );
    } else {
      aviso = tt(
        `🔩 ${soldaduras} soldadura(s): las ${piezas.length} piezas se mueven y `
          + "chocan como un solo cuerpo.",
        `🔩 ${soldaduras} weld(s): the ${piezas.length} parts now move and collide `
          + "as a single body.",
      );
    }
    this.avisoTemporal(aviso);
    return { soldaduras, piezas: piezas.length, sueltas, grupo: gid, anclado, aviso };
  }

  /**
   * PUNTO DE CONTACTO entre dos piezas: el CENTRO de la zona donde se solapan
   * sus cajas ORIENTADAS.
   *
   * La primera versión buscaba el par de puntos más cercano de las dos cajas,
   * y para dos tubos enfrentados de punta daba el punto justo. Pero en una T
   * —el codo de un brazo que muere contra el canto del tramo anterior— el
   * punto más cercano es una ARISTA de la zona de contacto, no su medio: el
   * codo caía 20 cm por debajo del otro tubo y la soldadura se plantaba en la
   * esquina de abajo. Ahora se mide el intervalo de solape a lo largo de cada
   * eje de cada caja y se toma su punto medio, que es donde de verdad se
   * tocan. Cuando las piezas no llegan a tocarse, ese mismo punto medio cae en
   * mitad del hueco, que es lo razonable.
   */
  private parMasCercano(
    cajasA: CajaOr[],
    cajasB: CajaOr[],
  ): { a: CajaOr; b: CajaOr; hueco: number } {
    let mejor = { a: cajasA[0], b: cajasB[0], hueco: Infinity };
    for (const A of cajasA) {
      for (const B of cajasB) {
        const h = huecoEntreCajas(A, B);
        if (h < mejor.hueco) mejor = { a: A, b: B, hueco: h };
      }
    }
    return mejor;
  }

  private puntoDeContacto(A: CajaOr, B: CajaOr): THREE.Vector3 {
    const radio = (caj: CajaOr, L: THREE.Vector3): number =>
      caj.e[0] * Math.abs(caj.u[0].dot(L)) +
      caj.e[1] * Math.abs(caj.u[1].dot(L)) +
      caj.e[2] * Math.abs(caj.u[2].dot(L));
    // Centro del solape visto desde los ejes de UNA de las cajas.
    const medioSegun = (P: CajaOr, Q: CajaOr): THREE.Vector3 => {
      const p = P.c.clone();
      for (let i = 0; i < 3; i++) {
        const eje = P.u[i];
        const rQ = radio(Q, eje);
        const cP = P.c.dot(eje);
        const cQ = Q.c.dot(eje);
        const lo = Math.max(cP - P.e[i], cQ - rQ);
        const hi = Math.min(cP + P.e[i], cQ + rQ);
        p.addScaledVector(eje, (lo + hi) / 2 - cP);
      }
      return p;
    };
    // Las dos cajas pueden estar giradas entre sí, así que se mira desde las
    // dos y se promedia: con piezas a escuadra las dos dan lo mismo.
    return medioSegun(A, B).add(medioSegun(B, A)).multiplyScalar(0.5);
  }

  /**
   * Crea UNA soldadura entre dos piezas si no la había ya. Devuelve true si la
   * creó. Es el mismo herraje invisible que planta el imán de nodos: una unión
   * de revolución BLOQUEADA, que para la física es un cuerpo rígido común.
   */
  private soldarPar(a: SceneObject, b: SceneObject, punto: THREE.Vector3): boolean {
    if (a === b) return false;
    for (const j of this.joints.values()) {
      const mismoPar =
        (j.bodyAId === a.id && j.bodyBId === b.id) ||
        (j.bodyAId === b.id && j.bodyBId === a.id);
      if (mismoPar && j.anchor.distanceTo(punto) < 4) return false;
    }
    const joint = this.connect(b.id, a.id, "revolute", punto.clone());
    if (!joint) return false;
    joint.locked = true;
    joint.name = `Soldadura ${joint.id.split("_")[1]}`;
    return true;
  }

  /** Crea un grupo a partir de una lista de ids (>=2). Devuelve el id del grupo. */
  createGroupFromIds(ids: string[]): string | null {
    // ABSORCIÓN DE SUBGRUPOS (v0.2.31): una pieza que YA pertenece a un grupo
    // — el conjunto de una roldana (rueda + eje), una máquina insertada — se
    // trae con TODO su grupo, que se disuelve dentro del nuevo. Antes esas
    // piezas se descartaban en silencio, así que agrupar un modelo armado con
    // roldanas no hacía nada (o dejaba fuera justo las roldanas).
    const finales: string[] = [];
    const vistos = new Set<string>();
    const aDisolver = new Set<string>();
    for (const id of ids) {
      if (!this.objects.has(id)) continue;
      const gid = this.objGroup.get(id);
      const miembros = gid ? (this.groups.get(gid)?.ids ?? [id]) : [id];
      if (gid) aDisolver.add(gid);
      for (const mid of miembros) {
        if (!this.objects.has(mid) || vistos.has(mid)) continue;
        vistos.add(mid);
        finales.push(mid);
      }
    }
    if (finales.length < 2) {
      this.avisoTemporal(
        tt(
          "Selecciona al menos DOS piezas para agrupar (toca con Mayús o usa Selección).",
          "Select at least TWO parts to group (Shift-tap, or use the Selection menu).",
        ),
      );
      return null;
    }
    // Los subgrupos absorbidos dejan de existir por su cuenta.
    for (const viejo of aDisolver) this.groups.delete(viejo);

    const gid = `g${this.nextGroupId++}`;
    this.groups.set(gid, { name: `Grupo ${gid.slice(1)}`, ids: finales });
    for (const id of finales) {
      this.objGroup.set(id, gid);
      const o = this.objects.get(id);
      if (o) this.setHighlight(o, false);
    }
    this.multiSel.clear();
    this.selectGroup(gid);
    return gid;
  }

  /** Mueve el grupo seleccionado (cm) aplicando el delta a todos sus miembros. */
  nudgeSelectedGroup(dx: number, dy: number, dz: number): void {
    if (!this.selectedGroupId) return;
    this.groupProxy.position.add(new THREE.Vector3(dx, dy, dz));
    this.applyGroupDelta();
  }

  /** Selecciona un grupo completo: el gizmo mueve todos sus miembros. */
  private selectGroup(gid: string): void {
    const g = this.groups.get(gid);
    if (!g) return;
    this.clearGroupHighlight();
    this.clearMultiSel();
    this.selected = null;
    this.selectedFigure = false;
    this.selectedGroupId = gid;

    const centroid = new THREE.Vector3();
    let n = 0;
    for (const id of g.ids) {
      const o = this.objects.get(id);
      if (o) {
        centroid.add(o.mesh.position);
        n++;
        this.setHighlight(o, true);
      }
    }
    if (n > 0) centroid.multiplyScalar(1 / n);
    this.groupProxy.position.copy(centroid);
    this.groupProxy.quaternion.identity();
    this.groupProxy.scale.set(1, 1, 1);
    this.groupProxy.updateMatrixWorld(true);
    this.groupPrev.copy(this.groupProxy.matrixWorld);

    this.selectedJointName = null;
    this.resetGizmoAxes();
    this.gizmo.attach(this.groupProxy);
    this.setMode(this.modoDeHerramienta());
    this.aplicarHerramientaGizmo();
    this.bus.emit("selectionChanged", { selected: null });
    this.bus.emit("groupingChanged", { multi: 0, groupSelected: true });
    this.bus.emit("groupSelectionChanged", { id: gid, name: g.name });
    this.bus.emit("jointSelectionChanged", { name: null, angles: [0, 0, 0], locked: false });
  }

  /** Aplica el delta del proxy a todos los miembros del grupo. */
  private applyGroupDelta(): void {
    if (!this.selectedGroupId) return;
    const g = this.groups.get(this.selectedGroupId);
    if (!g) return;
    this.groupProxy.updateMatrixWorld(true);
    const cur = this.groupProxy.matrixWorld;
    const delta = cur.clone().multiply(this.groupPrev.clone().invert());
    for (const id of g.ids) {
      const o = this.objects.get(id);
      if (!o) continue;
      const m = new THREE.Matrix4().compose(o.mesh.position, o.mesh.quaternion, o.mesh.scale);
      m.premultiply(delta);
      m.decompose(o.mesh.position, o.mesh.quaternion, o.mesh.scale);
      // Las cuerdas ancladas a miembros del grupo siguen a sus anclas.
      this.actualizarAtadosDeObjeto(o.id);
    }
    this.transformarUniones(delta, g.ids);
    this.cablesDirty = true;
    this.groupPrev.copy(cur);
    this.bus.emit("grupoTransformado", { fuente: "gizmo" });
  }

  /** Disuelve el grupo seleccionado (los miembros vuelven a ser individuales). */
  ungroupSelected(): void {
    const gid = this.selectedGroupId;
    if (!gid) return;
    const g = this.groups.get(gid);
    g?.ids.forEach((id) => {
      this.objGroup.delete(id);
      const o = this.objects.get(id);
      if (o) this.setHighlight(o, false);
    });
    this.groups.delete(gid);
    this.selectedGroupId = null;
    this.gizmo.detach();
    this.bus.emit("groupingChanged", { multi: 0, groupSelected: false });
    // Avisa al inspector de que el grupo ya no existe.
    this.bus.emit("groupSelectionChanged", { id: null, name: "" });
  }

  /** Elimina el grupo seleccionado y todas sus piezas. */
  deleteSelectedGroup(): void {
    const gid = this.selectedGroupId;
    if (!gid) return;
    const g = this.groups.get(gid);
    this.selectedGroupId = null;
    this.gizmo.detach();
    g?.ids.slice().forEach((id) => {
      const o = this.objects.get(id);
      if (o) this.removeObject(o);
    });
    this.groups.delete(gid);
    this.bus.emit("groupingChanged", { multi: 0, groupSelected: false });
    this.bus.emit("groupSelectionChanged", { id: null, name: "" });
  }

  /** Encaja la pieza arrastrada a un punto de anclaje compatible (solo al mover). */
  private applySnap(): void {
    // Con eje bloqueado no se aplica el imán: corregiría la posición fuera
    // del eje (y en Y lo anulaba por completo contra el suelo).
    if (this.axisLock) return;
    if (!this.selected || this.gizmo.getMode() !== "translate" || !this.gizmo.dragging) {
      return;
    }
    const others = this.listObjects().filter((o) => o !== this.selected);
    const r = this.snap.computeSnap(this.selected, others);
    if (r) {
      this.selected.mesh.position.add(r.delta);
      this.snap.showIndicator(r.target);
    } else {
      this.snap.hideIndicator();
    }
  }

  // ------------------------------------------------------- figura humana
  hasHumanFigure(): boolean {
    return this.humanFigure !== null;
  }

  getHumanHeight(): number {
    return this.humanHeight;
  }

  getHumanMode(): HumanMode {
    return this.humanMode;
  }

  /** Anade o quita la figura humana de referencia. */
  toggleHumanFigure(): void {
    if (this.humanFigure) this.removeHumanFigure();
    else void this.addHumanFigure(this.humanHeight);
  }

  /** Cambia el modo (maniqui / esqueleto), reconstruyendo si esta presente. */
  setHumanMode(mode: HumanMode): void {
    if (mode === this.humanMode) return;
    this.humanMode = mode;
    // Solo se reconstruye si la figura ESTÁ presente: cambiar el modo no debe
    // resucitar una figura que el usuario quitó.
    if (this.humanFigure) {
      void this.addHumanFigure(this.humanHeight);
    } else {
      this.emitHumanState(false, false);
    }
  }

  private lastFigureTransform: { position: THREE.Vector3; quaternion: THREE.Quaternion } | null =
    null;

  async addHumanFigure(heightCm: number = this.humanHeight): Promise<void> {
    this.humanHeight = heightCm;
    const wasSelected = this.selectedFigure;
    // Conserva el transform actual (si lo hay) para reaplicarlo.
    const keep =
      this.humanFigure
        ? {
            position: this.humanFigure.position.clone(),
            quaternion: this.humanFigure.quaternion.clone(),
          }
        : this.lastFigureTransform;
    this.removeHumanFigure(true);
    // La malla del tronco se rehace: el apoyo guardado era de la anterior.
    this.apoyoBarraLocal = null;

    const token = ++this.humanToken;
    const figure: THREE.Group = buildHumanFigure(
      heightCm,
      figureSegments.provider,
      figureSegments.skinProvider,
      figureSegments.jointProvider,
    );

    // El usuario pudo quitar/cambiar la figura mientras cargaba.
    if (token !== this.humanToken) {
      disposeHumanFigure(figure);
      return;
    }
    if (keep) {
      figure.position.copy(keep.position);
      figure.quaternion.copy(keep.quaternion);
    }
    this.humanFigure = figure;
    this.references.add(figure);
    // ARTICULACIONES BLOQUEADAS DE ENTRADA (v0.2.41): la figura nace rígida y
    // solo se mueve lo que pide la ZONA activa (v0.2.49) — de fábrica, el tren
    // superior a los dos lados, que es el press/jalón de la mayoría de
    // estaciones. Así 8/9 hace exactamente lo que se le pidió y nada más.
    if (this.jointLocks.size === 0) this.candadosDesdeZonas();
    if (!keep) {
      this.figuraApoyadaEn = "suelo";
      this.alturaDelApoyo = null;
    }
    this.marcarPoseDePartida(this.nombreDePartida ?? null);
    // CON MANIQUÍ, LA MÁQUINA SE VE EN SU PARTIDA: es el estado sobre el que
    // hay que apoyarle las manos y los pies, y verla en el plano dejaba los
    // mandos dibujados donde no van a estar cuando empiece el gesto.
    this.sincronizarPartidaVisible();
    // Los apoyos que sobrevivieron a la reconstrucción vuelven a resolverse.
    this.updateHandIK();
    this.updateFootIK();
    if (wasSelected) this.selectFigure();
    this.emitHumanState(true, false);
    this.bus.emit("jointLocksChanged", { locks: [...this.jointLocks] });
  }

  /**
   * Quita la figura. `rehaciendo` la usa `addHumanFigure` cuando solo la está
   * reconstruyendo —otra talla, otro modelo—: ahí la barra puesta NO se suelta,
   * porque el maniquí sigue siendo el mismo y perder el ejercicio al mover el
   * cursor de la altura sería desconcertante.
   */
  removeHumanFigure(rehaciendo = false): void {
    if (!this.humanFigure) return;
    this.lastFigureTransform = {
      position: this.humanFigure.position.clone(),
      quaternion: this.humanFigure.quaternion.clone(),
    };
    if (this.selectedFigure) {
      this.gizmo.detach();
      this.selectedFigure = false;
    }
    this.references.remove(this.humanFigure);
    disposeHumanFigure(this.humanFigure);
    this.humanFigure = null;
    this.humanToken++;
    this.voladizoCache.clear(); // otra talla, otro cuerpo: se vuelve a medir
    this.suelaLocal.clear();    // y otras mallas de pie: otra suela
    // LOS APOYOS SOBREVIVEN A REHACER EL CUERPO, igual que la barra de aquí
    // abajo. Están guardados como PIEZA + PUNTO LOCAL, que no dependen del
    // cuerpo para nada: al mover el cursor de la talla —que es justo lo que se
    // hace para comprobar la ergonomía— se borraban sin decir nada y las manos
    // volvían a quedarse donde dijera la postura.
    if (!rehaciendo) {
      this.handTargets.clear();
      this.footTargets.clear();
    }
    // LA BARRA SE VA CON EL MANIQUÍ. Quitando la figura, el enlace quedaba
    // apuntando a un cuerpo que ya no existe: la pieza se quedaba clavada
    // donde estuviera, la interfaz seguía anunciando «100 kg en las manos» y
    // el ⤒ Desrackear no tenía a quién devolvérsela. La barra se queda en la
    // escena —es una pieza más y puede seguir siendo útil— pero suelta.
    if (this.barraManiqui && !rehaciendo) {
      this.barraManiqui = null;
      this.planActivo = null;
      this.apoyoBarraLocal = null;
      this.bus.emit("barraManiquiChanged", {
        objectId: null,
        ejercicio: null,
        rackeada: false,
      });
    }
    this.cancelAttachHand();
    // SIN MANIQUÍ, LA MÁQUINA VUELVE AL DISEÑO. La partida es una condición de
    // ensayo de un cuerpo concreto; sin nadie que la use, lo que hay que ver y
    // acotar es el plano fabricable.
    if (!rehaciendo) this.sincronizarPartidaVisible();
    this.emitHumanState(false, false);
  }

  /** Cambia la altura (cm) reconstruyendo la figura y conservando su transform. */
  setHumanHeight(heightCm: number): void {
    this.humanHeight = heightCm;
    // El apoyo de la barra se calculó contra la malla del tronco ANTERIOR: con
    // otra talla esa malla es otra, y el punto guardado dejaría la barra
    // flotando o metida en el pecho. Se tira y se recalcula.
    this.apoyoBarraLocal = null;
    if (!this.humanFigure) return;
    void this.addHumanFigure(heightCm);
  }

  private emitHumanState(present: boolean, loading: boolean): void {
    this.bus.emit("humanFigureChanged", {
      present,
      loading,
      heightCm: this.humanHeight,
      mode: this.humanMode,
    });
  }

  /** Decide al hacer clic en la figura: articulacion (rotar) o raiz (mover). */
  private selectFigurePart(hit: THREE.Object3D): void {
    if (!this.humanFigure) return;
    const jn = hit.userData.jointName as string | undefined;
    const joints = this.humanFigure.userData.joints as
      | Record<string, THREE.Object3D>
      | undefined;
    if (jn && joints && joints[jn]) {
      this.selectJoint(jn);
    } else {
      this.selectFigureRoot();
    }
  }

  /** Selecciona una articulacion del personaje para posarla (gizmo en rotar). */
  selectJoint(name: string): void {
    const joints = this.figureJoints();
    if (!joints || !joints[name]) return;
    this.select(null);
    this.selectedFigure = true;
    this.selectedJointName = name;
    // EL CANDADO NO SE MIRA AQUÍ (v0.2.51). Desde que la ZONA activa es quien
    // lo calcula, mirarlo al posar dejaba media figura intocable: naciendo con
    // solo el tren superior activo, seleccionar una rodilla soltaba el gizmo y
    // remitía a una ventana de «Posturas» que ya no existe. El candado dice
    // qué mueve el gesto de 8/9 en SIMULAR; POSAR posa lo que se toque.
    this.gizmo.attach(joints[name]);
    // Posar sobre los ejes locales de la articulación y solo los naturales.
    this.gizmo.setSpace("local");
    const dof = JOINT_DOF[name] ?? { x: undefined, y: undefined, z: undefined };
    this.gizmo.showX = dof.x !== undefined;
    this.gizmo.showY = dof.y !== undefined;
    this.gizmo.showZ = dof.z !== undefined;
    this.setMode("rotate"); // posar = rotar la articulacion
    this.emitJointSelection();
  }

  // ------------------------------------ ergonomía del maniquí (v0.2.0)

  isJointLocked(name: string): boolean {
    return this.jointLocks.has(name);
  }

  getJointLocks(): string[] {
    return [...this.jointLocks];
  }

  /** Bloquea/libera la articulación (la seleccionada si no se indica). */
  toggleJointLock(name?: string): void {
    const jn = name ?? this.selectedJointName;
    if (!jn) return;
    if (this.jointLocks.has(jn)) this.jointLocks.delete(jn);
    else this.jointLocks.add(jn);
    // Reengancha (o suelta) el gizmo según el nuevo estado del candado.
    if (this.selectedJointName === jn) this.selectJoint(jn);
    else this.emitJointSelection();
    this.bus.emit("jointLocksChanged", { locks: [...this.jointLocks] });
    this.scheduleAutosave();
  }

  getPoseSymmetry(): boolean {
    return this.poseSymmetry;
  }

  /** Simetría L↔R: replicar cada cambio de pose espejado al otro lado. */
  setPoseSymmetry(on: boolean): void {
    this.poseSymmetry = on;
    this.scheduleAutosave();
  }

  isGrabFigure(): boolean {
    return this.grabFigureTool;
  }

  /** Herramienta "agarrar maniquí" (mover segmentos libremente o por eje). */
  setGrabFigure(on: boolean): void {
    this.grabFigureTool = on;
    if (on) {
      this.setDragTool(false);
      this.setAreaSelect(false);
    }
    this.bus.emit("grabFigureChanged", { on });
  }

  /** Contraparte espejada de una articulación (shoulderL ↔ shoulderR). */
  private mirrorJointName(jn: string): string | null {
    if (jn.endsWith("L")) return `${jn.slice(0, -1)}R`;
    if (jn.endsWith("R")) return `${jn.slice(0, -1)}L`;
    return null;
  }

  /**
   * Con simetría activa, replica la pose de jn espejada en su contraparte.
   *
   * EL CANDADO DE ZONA NO MANDA AQUÍ, y creerlo era el fallo: «al posar el
   * maniquí no se está reconociendo la instrucción de simetría». La casilla
   * quedaba marcada, el lado elegido giraba y el otro no se movía, sin decir
   * por qué.
   *
   * La causa es que la figura NACE con todo bloqueado menos la zona activa
   * —de fábrica el tren superior—, así que posar una cadera encontraba a su
   * gemela con candado y el espejo se saltaba en silencio. Y era incoherente
   * consigo mismo: escribir grados en la articulación elegida ignora el
   * candado a propósito (ver `setJointAngle`: «el candado es cosa de la ZONA
   * en SIMULAR»), pero copiarlos al otro lado lo respetaba. El mismo gesto,
   * permitido en un costado y denegado en el otro.
   *
   * El candado dice qué articulaciones mueve el GESTO cuando la simulación
   * corre; posar es otra cosa. Simulando sí se respeta: ahí el candado es
   * justamente lo que define la zona que trabaja.
   */
  private applyPoseSymmetry(jn: string): void {
    if (!this.poseSymmetry) return;
    const joints = this.figureJoints();
    const otro = this.mirrorJointName(jn);
    if (!joints || !otro || !joints[otro] || !joints[jn]) return;
    if (this.simulating && this.jointLocks.has(otro)) return;
    const r = joints[jn].rotation;
    joints[otro].rotation.set(r.x, -r.y, -r.z);
    this.clampJoint(otro);
  }

  /** Aviso breve en el HUD (se borra solo). */
  private avisoTemporal(text: string): void {
    this.bus.emit("dragMeasure", { text });
    window.setTimeout(() => this.bus.emit("dragMeasure", { text: null }), 1800);
  }

  /** Restaura los tres ejes del gizmo (para piezas/grupos/figura completa). */
  private resetGizmoAxes(): void {
    // Con eje bloqueado, el gizmo solo ofrece el asa de ese eje (edición
    // precisa: se construye en 3D mirando una pantalla 2D).
    this.gizmo.showX = this.axisLock === null || this.axisLock === "x";
    this.gizmo.showY = this.axisLock === null || this.axisLock === "y";
    this.gizmo.showZ = this.axisLock === null || this.axisLock === "z";
  }

  // ------------------------------------------------ eje de trabajo (1/2/3)

  /** Bloquea el trazado al eje dado; repetir el mismo eje lo libera. */
  setAxisLock(axis: "x" | "y" | "z" | null): void {
    this.axisLock = this.axisLock === axis ? null : axis;
    this.resetGizmoAxes();
    this.bus.emit("axisLockChanged", { axis: this.axisLock });
  }

  getAxisLock(): "x" | "y" | "z" | null {
    return this.axisLock;
  }

  private axisVec(): THREE.Vector3 | null {
    if (this.axisLock === "x") return new THREE.Vector3(1, 0, 0);
    if (this.axisLock === "y") return new THREE.Vector3(0, 1, 0);
    if (this.axisLock === "z") return new THREE.Vector3(0, 0, 1);
    return null;
  }

  /**
   * Punto de arrastre bajo el puntero: si hay eje bloqueado, el punto de la
   * recta (origin + t·eje) más cercano al rayo del puntero; si no, la
   * intersección con el plano dado. Devuelve false si no hay solución.
   */
  private dragPoint(origin: THREE.Vector3, plane: THREE.Plane, out: THREE.Vector3): boolean {
    const axis = this.axisVec();
    if (axis) {
      const ray = this.raycaster.ray;
      const w0 = new THREE.Vector3().subVectors(origin, ray.origin);
      const b = axis.dot(ray.direction);
      const d = axis.dot(w0);
      const e = ray.direction.dot(w0);
      const denom = 1 - b * b; // axis y direction son unitarios
      if (Math.abs(denom) < 1e-6) return false;
      const t = (b * e - d) / denom;
      out.copy(origin).addScaledVector(axis, t);
      return true;
    }
    return this.raycaster.ray.intersectPlane(plane, out) !== null;
  }

  /**
   * Punto del trazado con eje bloqueado: el punto de la recta (a + t·eje) más
   * cercano al rayo del puntero. No necesita tocar suelo ni superficies, así
   * el eje Y funciona apuntando "al cielo".
   */
  private lockedLinePoint(a: THREE.Vector3): THREE.Vector3 | null {
    const p = new THREE.Vector3();
    const unused = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    return this.dragPoint(a, unused, p) ? p : null;
  }

  /** Publica el contador de desplazamiento (por eje si hay bloqueo). */
  private emitDragMeasure(d: THREE.Vector3): void {
    const text = this.axisLock
      ? `Δ${this.axisLock.toUpperCase()} = ${formatCm(d[this.axisLock])}`
      : `Δ = ${formatCm(d.length())}  (X ${formatCm(d.x)} · Y ${formatCm(d.y)} · Z ${formatCm(d.z)})`;
    this.bus.emit("dragMeasure", { text });
  }

  // -------------------------------------------- herramienta de arrastre

  setDragTool(on: boolean): void {
    this.dragTool = on;
    if (on) this.setAreaSelect(false);
    this.bus.emit("dragToolChanged", { on });
  }

  isDragTool(): boolean {
    return this.dragTool;
  }

  /** Limita una articulación a su eje/rango natural. */
  /**
   * DÓNDE PISA CADA PIE, en el suelo y en coordenadas de mundo.
   *
   * Se toma el centro de la planta —el centro de la caja del pie proyectado a
   * y=0—, que es lo que un levantador llama «donde tengo el pie»: no cambia al
   * flexionar el tobillo ni al girar la puntera.
   */
  private huellaDeLosPies(): { L: THREE.Vector3; R: THREE.Vector3 } | null {
    const fig = this.humanFigure;
    if (!fig) return null;
    fig.updateMatrixWorld(true);
    const L = this.centroDeLaPisada("L");
    const R = this.centroDeLaPisada("R");
    return L && R ? { L, R } : null;
  }

  /**
   * LA HUELLA SE MIDE DONDE EL PIE TOCA (v0.2.97), no con el centro de su caja.
   *
   * La caja de three está alineada con el MUNDO, así que girar el pie sobre sí
   * mismo ya le mueve el centro aunque el pie no viaje ni un milímetro. Mientras
   * el pie no cambiaba de rumbo dentro del gesto ese sesgo se cancelaba y daba
   * igual; en cuanto la sentadilla PIVOTA el pie al bajar —que es lo que pidió
   * el diseñador: «no deben deslizarse sobre la superficie, pero sí pueden
   * experimentar un grado menor de rotación externa»— deja de cancelarse y el
   * plantado corrige de más. Medido: entre las dos posturas la caja se movía
   * 0,23 cm y la huella de verdad 10,71.
   *
   * Se toma el centroide de los vértices que están a menos de medio centímetro
   * del punto más bajo del pie: eso ES la pisada. Si la malla no se deja leer,
   * se cae al centro de la caja, que es lo que había.
   */
  private centroDeLaPisada(lado: HandSide): THREE.Vector3 | null {
    const fig = this.humanFigure;
    if (!fig) return null;
    let malla: THREE.Mesh | null = null;
    fig.traverse((n) => {
      if ((n as THREE.Mesh).isMesh && n.userData?.segmentId === `pie-${lado}`) malla = n as THREE.Mesh;
    });
    const m = malla as THREE.Mesh | null;
    const pos = m?.geometry?.getAttribute("position");
    if (!m || !pos) {
      const c = this.centroSegmento(`pie-${lado}`);
      return c ? new THREE.Vector3(c.x, 0, c.z) : null;
    }
    m.updateMatrixWorld(true);
    // LA SUELA SE ELIGE EN EL MARCO DEL PIE, no en el del mundo. Escogiendo los
    // vértices que TOCAN el suelo, el conjunto cambia en cuanto la planta se
    // inclina un pelo, y con él el centroide: medido, eso hacía derivar la barra
    // del peso muerto 0,77 cm a lo largo del gesto. Eligiéndolos por su altura
    // LOCAL, la suela es siempre la misma nube de puntos —un punto material del
    // pie— y su centro solo se mueve si el pie se mueve.
    const banda = this.suelaLocal.get(m.uuid) ?? (() => {
      const attr = pos as THREE.BufferAttribute;
      const v = new THREE.Vector3();
      let minLocal = Infinity;
      for (let i = 0; i < attr.count; i++) {
        const y = v.fromBufferAttribute(attr, i).y;
        if (y < minLocal) minLocal = y;
      }
      const idx: number[] = [];
      for (let i = 0; i < attr.count; i++) {
        if (v.fromBufferAttribute(attr, i).y - minLocal < 0.5) idx.push(i);
      }
      this.suelaLocal.set(m.uuid, idx);
      return idx;
    })();
    if (banda.length === 0) {
      const cc = this.centroSegmento(`pie-${lado}`);
      return cc ? new THREE.Vector3(cc.x, 0, cc.z) : null;
    }
    const v = new THREE.Vector3();
    const c = new THREE.Vector3();
    for (const i of banda) {
      c.add(v.fromBufferAttribute(pos as THREE.BufferAttribute, i).applyMatrix4(m.matrixWorld));
    }
    c.multiplyScalar(1 / banda.length);
    return new THREE.Vector3(c.x, 0, c.z);
  }

  /** Índices de los vértices de la suela de cada pie (se calculan una vez). */
  private suelaLocal = new Map<string, number[]>();

  /**
   * LOS PIES SE QUEDAN DONDE PISAN (v0.2.91).
   *
   * Regla del diseñador: «los pies deben anclarse al sitio donde pisa». El rig
   * está enraizado en la PELVIS —`PARENT_JOINT.hipL` es null, la cadera es la
   * raíz de la pierna—, así que flexionar la cadera columpia las piernas y son
   * los PIES los que viajan por el suelo mientras la pelvis se queda quieta. Y
   * `reapoyarFigura` solo corrige ALTURA, nunca el arrastre horizontal.
   *
   * Medido antes de esto, entre el bloqueo y el suelo del peso muerto los pies
   * patinaban 27,7 cm hacia delante —y la barra se iba con ellos 37 cm, cuando
   * la regla sagital dice que sube y baja a plomo sobre el medio del pie—. En
   * las sentadillas la estampa era otra: la postura de fondo abduce la cadera
   * 36,5° y la de arriba no, así que el maniquí ABRÍA las piernas 14,3 cm por
   * lado al bajar, como si se recolocara en mitad del gesto.
   *
   * Un cuerpo real hace lo contrario: planta los pies, y todo lo demás —la
   * pelvis, el tronco, la barra— se acomoda a ellos. Como la pelvis es la RAÍZ
   * del rig, restituirlo es exactamente devolver la figura al sitio donde sus
   * huellas vuelven a caer sobre sus marcas.
   *
   * No se toca nada de esto si la figura está sentada en una pieza (lo que la
   * sostiene es el asiento) ni si algún pie está APOYADO en una plataforma (ahí
   * manda la IK del pie, y pelearse con ella sería deshacerla cada fotograma).
   */
  private plantarLosPies(huella: { L: THREE.Vector3; R: THREE.Vector3 } | null): void {
    const fig = this.humanFigure;
    if (!fig || !huella) return;
    if (this.figuraApoyadaEn !== "suelo" || this.footTargets.size > 0) return;
    const ahora = this.huellaDeLosPies();
    if (!ahora) return;
    // TRASLACIÓN PURA en el plano del suelo. La altura ya la resolvió
    // `reapoyarFigura`, y tocarla aquí levantaría o hundiría las plantas.
    //
    // Y SOLO TRASLACIÓN, a propósito. La primera versión también ajustaba la
    // ABDUCCIÓN para conservar la anchura de la estampa, y era pasarse: la
    // apertura de la puntera es CONSECUENCIA de la abducción (v0.2.80, decisión
    // del diseñador), así que retocarla para cuadrar centímetros le borraba al
    // pie sus 36° de rotación externa y dejaba la sentadilla con los pies
    // rectos. La anchura se resuelve donde le toca —en la postura, que ahora
    // lleva la estampa puesta desde arriba— y aquí solo se impide que el
    // cuerpo camine.
    const medioAntes = huella.L.clone().add(huella.R).multiplyScalar(0.5);
    const medioAhora = ahora.L.clone().add(ahora.R).multiplyScalar(0.5);
    fig.position.x += medioAntes.x - medioAhora.x;
    fig.position.z += medioAntes.z - medioAhora.z;
    fig.updateMatrixWorld(true);
  }

  private clampJoint(jn: string): void {
    const joints = this.figureJoints();
    if (!joints || !joints[jn]) return;
    const dof = JOINT_DOF[jn];
    if (!dof) return;
    const j = joints[jn];
    for (const ax of ["x", "y", "z"] as const) {
      const lim = dof[ax];
      if (!lim) {
        j.rotation[ax] = 0; // eje no natural: bloqueado
      } else {
        const deg = radToDeg(j.rotation[ax]);
        j.rotation[ax] = degToRad(Math.max(lim[0], Math.min(lim[1], deg)));
      }
    }
    this.reapoyarFigura();
  }

  /** Limita la articulación seleccionada y aplica la simetría si procede. */
  private clampSelectedJoint(): void {
    const jn = this.selectedJointName;
    if (!jn) return;
    this.clampJoint(jn);
    this.applyPoseSymmetry(jn);
  }

  private emitJointSelection(): void {
    const joints = this.figureJoints();
    const jn = this.selectedJointName;
    const j = jn && joints ? joints[jn] : null;
    this.bus.emit("jointSelectionChanged", {
      name: j ? jn : null,
      angles: j
        ? [
            roundTo(radToDeg(j.rotation.x), 1),
            roundTo(radToDeg(j.rotation.y), 1),
            roundTo(radToDeg(j.rotation.z), 1),
          ]
        : [0, 0, 0],
      locked: !!jn && this.jointLocks.has(jn),
    });
  }

  /** Devuelve el nombre de la articulacion seleccionada (o null). */
  getSelectedJoint(): string | null {
    return this.selectedJointName;
  }

  /** Fija el angulo (grados) de un eje de la articulacion seleccionada. */
  setJointAngle(axis: "x" | "y" | "z", deg: number): void {
    const joints = this.figureJoints();
    const jn = this.selectedJointName;
    if (!joints || !jn || !joints[jn]) return;
    // El candado es cosa de la ZONA en SIMULAR: no veta escribir grados aquí.
    // Respeta el rango natural del eje (y bloquea los ejes no articulables).
    const lim = JOINT_DOF[jn]?.[axis];
    const value = lim ? Math.max(lim[0], Math.min(lim[1], deg)) : 0;
    joints[jn].rotation[axis] = degToRad(value);
    this.applyPoseSymmetry(jn);
    this.reapoyarFigura();
    this.emitJointSelection();
    this.scheduleAutosave();
  }

  /** Ejes rotables (naturales) de la articulación seleccionada. */
  getSelectedJointAxes(): { x: boolean; y: boolean; z: boolean } {
    const dof = (this.selectedJointName && JOINT_DOF[this.selectedJointName]) || {};
    return { x: dof.x !== undefined, y: dof.y !== undefined, z: dof.z !== undefined };
  }

  /** Selecciona la figura entera para moverla/rotarla. */
  private selectFigureRoot(): void {
    if (!this.humanFigure) return;
    this.select(null);
    this.selectedFigure = true;
    this.selectedJointName = null;
    this.resetGizmoAxes();
    this.plantarProxyEnLaCadera();
    this.gizmo.attach(this.figuraProxy);
    this.setMode("translate");
  }

  /** Sitúa el pivote del gizmo en la cadera de la figura, con su orientación. */
  private plantarProxyEnLaCadera(): void {
    const fig = this.humanFigure;
    if (!fig) return;
    fig.updateMatrixWorld(true);
    let pelvis: THREE.Mesh | null = null;
    fig.traverse((n) => {
      const m = n as THREE.Mesh;
      if (m.isMesh && m.userData.segmentId === "pelvis") pelvis = m;
    });
    const p = pelvis
      ? new THREE.Box3().setFromObject(pelvis as THREE.Mesh).getCenter(new THREE.Vector3())
      : new THREE.Box3().setFromObject(fig).getCenter(new THREE.Vector3());
    this.figuraProxy.position.copy(p);
    this.figuraProxy.quaternion.copy(fig.quaternion);
    this.figuraProxy.scale.set(1, 1, 1);
    this.figuraProxy.updateMatrixWorld(true);
    this.figuraPrev.copy(this.figuraProxy.matrixWorld);
  }

  /** Lleva al grupo de la figura lo que el gizmo le hizo a su pivote. */
  private aplicarDeltaDeLaFigura(): void {
    const fig = this.humanFigure;
    if (!fig) return;
    this.figuraProxy.updateMatrixWorld(true);
    const cur = this.figuraProxy.matrixWorld;
    const delta = cur.clone().multiply(this.figuraPrev.clone().invert());
    const m = new THREE.Matrix4().compose(fig.position, fig.quaternion, fig.scale);
    m.premultiply(delta);
    m.decompose(fig.position, fig.quaternion, fig.scale);
    fig.updateMatrixWorld(true);
    this.figuraPrev.copy(cur);
    this.requestRender();
  }

  private figureJoints(): Record<string, THREE.Object3D> | null {
    return (this.humanFigure?.userData.joints as Record<string, THREE.Object3D>) ?? null;
  }

  /**
   * Aplica una postura de la biblioteca a la figura posable.
   *
   * Aplicar una postura FIJA LA PARTIDA: es de donde arranca la simulación y
   * adonde vuelve el ↺. Y la figura NO se re-aterriza si está apoyada en una
   * pieza: cargar una postura sobre un banco la tiraba al suelo.
   */
  /**
   * `replantar` distingue COLOCARSE de LEVANTAR, que es la diferencia que pide
   * el gesto real. Elegir un ejercicio, o colocar al maniquí, ESTABLECE la
   * estampa: los pies van adonde diga la postura y ése pasa a ser su sitio.
   * Moverse DENTRO del ejercicio —de arriba al fondo y vuelta— no puede
   * moverlos: nadie se recoloca a mitad de una repetición.
   */
  applyPose(name: string, replantar = true): void {
    const joints = this.figureJoints();
    const def = getPose(name);
    if (!joints || !def) return;
    // DÓNDE PISABA, antes de tocar una sola articulación: la postura cambia la
    // forma del cuerpo, no el sitio donde el maniquí tiene los pies puestos.
    const huella = replantar ? this.huellaDeLosPies() : null;
    for (const g of Object.values(joints)) g.rotation.set(0, 0, 0);
    for (const [jn, [x, y, z]] of Object.entries(def)) {
      const j = joints[jn];
      if (j) j.rotation.set(degToRad(x), degToRad(y), degToRad(z));
    }
    // Una postura guardada con un ángulo imposible dejaba la articulación
    // fuera de su rango: desde ahí ninguna primitiva puede volver a entrar.
    for (const jn of Object.keys(def)) if (joints[jn]) this.clampJoint(jn);
    this.reapoyarFigura();
    this.plantarLosPies(huella);
    // LA POSTURA DE UN EJERCICIO CON BARRA TRAE LA BARRA (v0.2.91). Las ocho
    // posturas de barra salen en la lista general de posturas, y aplicarlas
    // desde ahí sólo movía el cuerpo: la figura bajaba a la sentadilla y la
    // barra cargada se quedaba en los ganchos, o el peso muerto arrancaba con
    // los puños cerrados sobre una barra en el suelo que nadie tocaba. Es
    // mímica, no un gesto. Si la postura pertenece a un ejercicio, se enlaza la
    // barra —adoptando la que ya esté en la escena—, se desrackea y se arma su
    // zona, exactamente igual que si se hubiera elegido en el selector.
    this.engancharBarraDeLaPostura(name);
    this.marcarPoseDePartida(name);
    if (this.physics && this.humanFigure) this.physics.añadirFigura(this.humanFigure);
    this.updateHandIK();
    this.updateFootIK();
    this.emitJointSelection();
    this.requestRender();
    this.scheduleAutosave();
  }

  // ------------------------------------------ POSTURA DE PARTIDA (v0.2.49)
  /** Postura desde la que arranca la simulación y adonde devuelve el ↺. */
  private poseDePartida: PoseDef | null = null;
  private transformDePartida: { p: THREE.Vector3; q: THREE.Quaternion } | null = null;
  private nombreDePartida: string | null = null;
  /**
   * PARTIDA DE LA MÁQUINA (v0.2.51): dónde están sus piezas móviles al
   * arrancar. Hay gestos cuya postura inicial es incómoda de posar y sale
   * mucho mejor empezar por el BLOQUEO —el final de la fase concéntrica—, y
   * para eso la máquina también tiene que arrancar en ese punto.
   *
   * Vive APARTE del diseño a propósito. El diseño es el plano fabricable: es
   * lo que se exporta, lo que se acota y de donde cada unión saca el cero de
   * sus topes y cada cable su longitud. La partida es una condición de ensayo
   * que se le pone encima al arrancar, y por eso parado se sigue viendo y
   * editando el diseño, sin dos estados que confundan.
   */
  private partidaPiezas: Map<string, { p: THREE.Vector3; q: THREE.Quaternion }> | null = null;
  /**
   * El DISEÑO de esas mismas piezas: a qué se vuelve. Se apunta en el mismo
   * momento en que se congela la partida, porque es entonces cuando `saved`
   * todavía guarda el plano del que se partió.
   */
  private disenoDePartida: Map<string, { p: THREE.Vector3; q: THREE.Quaternion }> | null = null;

  /**
   * LA PARTIDA DE LA MÁQUINA ES DEL MANIQUÍ (v0.2.91), y esto lo pidió el
   * diseñador con todas las letras: «en ausencia del maniquí la configuración
   * de la máquina vuelve al default para seguir diseñando; cuando la simulación
   * comienza se dispondrá la máquina en pose de último fotograma sólo cuando el
   * maniquí está presente».
   *
   * Tiene sentido: la partida es una CONDICIÓN DE ENSAYO —dónde hay que dejar
   * el conjunto móvil para que un cuerpo concreto pueda empezar el gesto—, no
   * una propiedad de la máquina. Sin nadie que la use, lo que hay que ver y
   * medir es el plano fabricable.
   */
  private partidaVigente(): Map<string, { p: THREE.Vector3; q: THREE.Quaternion }> | null {
    if (!this.humanFigure || this.humanMode !== "mannequin") return null;
    return this.partidaPiezas?.size ? this.partidaPiezas : null;
  }

  /**
   * EL DISEÑO ES EL DUEÑO; LA PARTIDA, LO QUE SE VE.
   *
   * Aquí hubo dos errores seguidos y merece la pena dejarlos escritos, porque
   * son las dos mitades de la misma verdad.
   *
   * El primero fue dibujar la partida encima de las mallas sin más. PARADO,
   * MEDIA APLICACIÓN LEE LAS MALLAS COMO SI FUERAN EL DISEÑO: `startSimulation`
   * saca de ellas el estado al que volver y construye con ellas el mundo físico
   * —los cables miden ahí su longitud de reposo y las uniones su cero—, y
   * exportar y acotar leen de ellas el plano fabricable. Pintar la partida
   * encima envenenaba las tres cosas: la máquina arrancaba mal armada y al parar
   * se «restauraba» la partida SOBRE el diseño, que se perdía para siempre.
   *
   * El segundo fue el arreglo: quitar el pintado y dejar las mallas siempre en
   * el diseño. Correcto para la física y falso para el usuario, que en cuanto
   * congelaba la máquina la veía volver al plano de un salto —«la postura no
   * permanece en su sitio pese a fijar posición»— y ya no podía acomodarle el
   * maniquí, que es justo para lo que se congela.
   *
   * Lo que hace falta son las dos: SE VE la partida y MANDA el diseño. La
   * partida se pinta en las mallas mientras el maniquí está delante, y quien
   * necesite el plano lo pide con `conElDiseno()`, que lo repone, hace su
   * trabajo y vuelve a dejar lo que había. `disenoDePartida` guarda a qué se
   * vuelve; se apunta en el mismo momento en que se congela.
   */
  private sincronizarPartidaVisible(): void {
    if (this.simulating) return; // manda el motor
    this.reconciliarEdiciones();
    const mostrar = this.partidaVigente();
    const fuente = mostrar ?? this.disenoDePartida;
    if (fuente) {
      for (const [id, t] of fuente) {
        const o = this.objects.get(id);
        if (!o) continue;
        o.mesh.position.copy(t.p);
        o.mesh.quaternion.copy(t.q);
        o.mesh.updateMatrixWorld(true);
      }
      this.cablesDirty = true;
      this.rebuildAllRopes();
    }
    this.partidaPintada = mostrar !== null;
    this.updateHandIK();
    this.updateFootIK();
    this.requestRender();
  }

  /** ¿Están las mallas mostrando la partida ahora mismo? */
  private partidaPintada = false;

  /**
   * LO QUE SE EDITA CON LA PARTIDA A LA VISTA VA AL PLANO.
   *
   * Regla del diseñador: «poder modificar y editar la máquina con las
   * herramientas de construcción en una posición ergonómica precisa, y estos
   * cambios estructurales permanecen». La partida es una condición de ensayo
   * puesta ENCIMA del plano: mover una pieza con el gizmo mientras se ve es
   * editar el plano, no reposar la máquina.
   *
   * Sin esto, editar una pieza CONGELADA se perdía —medido: los 7 cm que se le
   * daban volvían a 0 al soltar la partida— mientras que editar una que no lo
   * estaba sí permanecía. Dos comportamientos distintos para el mismo gesto, y
   * ninguna pista de por qué.
   *
   * Se resuelve comparando: si la malla ya no está donde la dejó la partida, la
   * diferencia la puso el usuario, así que se le suma también al plano y la
   * partida se re-ancla. Va en las dos puertas por las que se pasa antes de leer
   * o reponer el plano, que es donde importa que la cuenta esté al día.
   */
  private reconciliarEdiciones(): void {
    if (this.simulating || !this.partidaPintada) return;
    const partida = this.partidaPiezas;
    const diseno = this.disenoDePartida;
    if (!partida || !diseno) return;
    for (const [id, t] of partida) {
      const o = this.objects.get(id);
      const d = diseno.get(id);
      if (!o || !d) continue;
      const dp = o.mesh.position.clone().sub(t.p);
      const giro = o.mesh.quaternion.angleTo(t.q);
      if (dp.lengthSq() < 1e-6 && giro < 1e-5) continue; // nadie la tocó
      const dq = o.mesh.quaternion.clone().multiply(t.q.clone().invert());
      d.p.add(dp);
      d.q.premultiply(dq).normalize();
      t.p.copy(o.mesh.position);
      t.q.copy(o.mesh.quaternion);
    }
  }

  /**
   * Ejecuta `fn` con las mallas EN EL DISEÑO, y deja luego lo que hubiera.
   *
   * Es la puerta por la que pasan las tres cosas que necesitan el plano y no la
   * condición de ensayo: guardar el estado al que volver, construir el mundo
   * físico y comparar qué se movió de verdad.
   */
  /** Devuelve las mallas de la partida a su sitio de plano. */
  private reponerElDiseno(): void {
    if (!this.disenoDePartida) return;
    for (const [id, t] of this.disenoDePartida) {
      const o = this.objects.get(id);
      if (!o) continue;
      o.mesh.position.copy(t.p);
      o.mesh.quaternion.copy(t.q);
      o.mesh.updateMatrixWorld(true);
    }
  }

  private conElDiseno<T>(fn: () => T): T {
    this.reconciliarEdiciones();
    const partidaVisible = !this.simulating && this.partidaPintada;
    if (partidaVisible) this.reponerElDiseno();
    try {
      return fn();
    } finally {
      if (partidaVisible) {
        const partida = this.partidaPiezas;
        if (partida) {
          for (const [id, t] of partida) {
            const o = this.objects.get(id);
            if (!o) continue;
            o.mesh.position.copy(t.p);
            o.mesh.quaternion.copy(t.q);
            o.mesh.updateMatrixWorld(true);
          }
        }
      }
    }
  }

  /**
   * Fija la POSTURA DE PARTIDA con la pose y el sitio actuales de la figura.
   * Antes, al terminar de simular el maniquí se quedaba con la última pose
   * movida y no había forma de repetir el ejercicio desde el principio.
   */
  marcarPoseDePartida(nombre?: string | null): void {
    const fig = this.humanFigure;
    if (!fig || this.humanMode !== "mannequin") return;
    this.poseDePartida = this.captureCurrentPose();
    this.transformDePartida = { p: fig.position.clone(), q: fig.quaternion.clone() };
    if (nombre !== undefined) this.nombreDePartida = nombre;
    this.pitchAcomodacion.clear();
    this.bus.emit("poseDePartidaChanged", { name: this.nombreDePartida });
  }

  /**
   * 📌 FIJA LA PARTIDA COMPLETA: la postura del maniquí Y dónde está la
   * máquina. Se usa con la simulación en marcha: se lleva el conjunto móvil
   * con la mano hasta el punto que interesa —el bloqueo, por ejemplo—, se
   * acomoda la figura y se fija. A partir de ahí, cada ▶ arranca ahí.
   *
   * Solo se guarda lo que de verdad se movió respecto del diseño: si la
   * máquina está donde la dejó el plano, no hay nada que congelar.
   */
  fijarPartida(): { piezas: number; postura: boolean } {
    this.marcarPoseDePartida();
    const poses = new Map<string, { p: THREE.Vector3; q: THREE.Quaternion }>();
    for (const o of this.listObjects()) {
      // El sitio de diseño se pregunta, no se supone: con el gesto PARADO
      // `saved` está vacío, y comparar contra nada metía la máquina entera en
      // la partida —incluidos los pilares clavados al suelo—.
      const disenada = this.sitioDeDiseno(o.id);
      const p = o.mesh.position;
      const q = o.mesh.quaternion;
      if (disenada && p.distanceTo(disenada.p) < 0.05 && q.angleTo(disenada.q) < 1e-3) {
        continue; // sigue en su sitio de diseño: no es parte del gesto
      }
      poses.set(o.id, { p: p.clone(), q: q.clone() });
    }
    this.ponerPartida(poses);
    this.bus.emit("poseDePartidaChanged", { name: this.nombreDePartida });
    this.scheduleAutosave();
    return { piezas: poses.size, postura: this.poseDePartida !== null };
  }

  /**
   * POSAR LA MÁQUINA (v0.2.55). El símil del «Posar» del maniquí, pero para el
   * mecanismo: se agarra una pieza móvil con la mano y se queda donde la
   * dejas, como una parálisis cérea.
   *
   * Antes, fijar la partida obligaba a SIMULAR: arrancar la física, pelearse
   * con un sistema en movimiento y cazar el instante bueno. Posar es lo
   * contrario — nada se mueve solo, no hay gravedad que vencer y el tiempo no
   * corre. Las uniones y sus topes sí mandan, así que el conjunto solo recorre
   * los grados de libertad que de verdad tiene.
   *
   * Y es EXCLUYENTE con la simulación: mientras el gesto corre, la máquina
   * está en manos de la física y posarla no tendría sentido.
   */
  private modoPoseMaquina = false;

  posandoMaquina(): boolean {
    return this.modoPoseMaquina;
  }

  async iniciarPoseMaquina(): Promise<void> {
    if (this.modoPoseMaquina || this.simulating || this.startingSim) return;
    // POSAR LA MÁQUINA ES PARA ALGUIEN. Sin maniquí no hay a quién acomodarle
    // el mecanismo, y la partida que saliera de aquí no se aplicaría nunca
    // (ver `partidaVigente`): más vale decirlo que dejar posar en balde.
    if (!this.humanFigure || this.humanMode !== "mannequin") {
      this.avisoTemporal(
        tt(
          "Trae primero al maniquí: la máquina se posa PARA él, y sin nadie delante vuelve a su diseño.",
          "Bring the mannequin in first: the machine is posed FOR them, and with nobody there it returns to its design.",
        ),
      );
      return;
    }
    this.startingSim = true;
    try {
      await PhysicsWorld.init();
    } finally {
      this.startingSim = false;
    }

    // Igual que al simular: el diseño se guarda para poder volver a él.
    this.saved.clear();
    for (const o of this.listObjects()) {
      this.saved.set(o.id, {
        position: o.mesh.position.clone(),
        quaternion: o.mesh.quaternion.clone(),
        scale: o.mesh.scale.clone(),
      });
    }

    this.select(null);
    this.cancelConnect();
    this.cancelCable();
    this.cancelRope();
    this.cancelLine();
    // Los modos de DOS FASES también, o quedan armados sobre una escena que
    // ya no está quieta: la roldana con su línea guía azul encendida y la
    // placa dentada apuntando a una cara que se está moviendo.
    this.cancelRoldana();
    this.cancelPlacaDentada();
    this.endBendNodes();
    this.physics = new PhysicsWorld();
    // EL MUNDO SE ARMA DESDE EL DISEÑO. Los cables miden aquí su longitud de
    // reposo y las uniones su cero; construirlo sobre la partida los daría por
    // buenos en una configuración que es una condición de ensayo, y la máquina
    // arrancaría tensada contra sí misma.
    const motor = this.physics;
    this.conElDiseno(() => {
      motor.build(
        this.listObjects(),
        this.listJoints(),
        this.listCables(),
        this.cuerdasFisicas(),
      );
    });
    // Se continúa desde donde quedó la partida, no desde el diseño: retocar un
    // punto de bloqueo ya fijado no obliga a rehacerlo entero.
    const partidaPrevia = this.partidaVigente();
    if (partidaPrevia) {
      const movidas = this.physics.recolocarPiezas(partidaPrevia);
      if (movidas > 0) this.cablesDirty = true;
    }
    // El maniquí NO entra al motor aquí: se posa aparte, y metiéndolo solo
    // estorbaría a la mano al agarrar las piezas de la máquina.
    this.physics.modoPose(true);
    // ASENTAR ANTES DE CEDER EL CONTROL. Sin peso que tense los cables, el
    // conjunto móvil busca su configuración coherente — medido en la
    // UpperMachine, el carro se recolocaba 5,6 cm. Que eso pase delante de
    // quien va a posar parece que la máquina se mueve sola, así que se
    // adelanta aquí y el control se entrega ya en reposo.
    for (let i = 0; i < 150; i++) this.physics.step();
    this.jointHelpers.visible = false;
    // Se apagan las herramientas de colocación ANTES de encender el motor: a
    // partir de aquí sus clics no llegarían a ninguna parte. El APOYO sí se
    // conserva: posar la máquina y apoyar en ella la mano son el mismo gesto
    // en dos tiempos, y apagarlo al entrar obligaba a volver a pulsarlo.
    this.cancelarHerramientas(true);
    this.select(null);
    this.simulating = true; // el motor corre; isSimulating() lo distingue
    this.modoPoseMaquina = true;
    // Se entra a posar, no a mirar. Se apunta la herramienta que había para
    // devolverla al salir: la mano se elige A PROPÓSITO (v0.2.41) y el posado
    // la dejaba puesta, así que el siguiente ▶ arrancaba con la máquina viva
    // bajo el cursor sin que nadie lo hubiera pedido.
    this.simToolPrevio = this.simTool;
    this.setSimHerramienta("mano");
    // Y SE REPLIEGA LA INTERFAZ DE EDICIÓN, como al simular. Encender
    // `simulating` sin avisar dejaba la paleta, la barra superior y la de
    // herramientas a la vista y habilitadas, pero medias muertas: se pulsaba
    // «Colocar» en un pilar y no pasaba absolutamente nada, ni un aviso. Y las
    // piezas de colocación directa sí entraban, pero sin física, porque el
    // mundo ya estaba construido.
    this.bus.emit("simulationChanged", { running: true });
    this.bus.emit("poseMaquinaChanged", { active: true });
  }

  /** Sale del posado y CONGELA donde quedó la máquina: cada ▶ arrancará ahí. */
  terminarPoseMaquina(): { piezas: number } {
    if (!this.modoPoseMaquina) return { piezas: 0 };
    this.endSimInteraction();

    // SE CONGELA LO QUE SE VE, no sólo los cuerpos del motor. Antes la lista
    // salía de `physics.posesDePiezas()`, que devuelve una entrada por CUERPO
    // RÍGIDO y se salta las piezas FUNDIDAS —las soldadas, que viajan dentro
    // del cuerpo de su anfitrión—. Congelar sólo los anfitriones y luego pintar
    // la partida dejaba a las soldadas en el plano: el brazo del press aparecía
    // partido en dos, una mitad en su sitio nuevo y la otra en el viejo. Se
    // recorren TODAS las piezas y se guarda la que se haya movido, sea cuerpo
    // propio o vaya soldada a otro.
    const poses = new Map<string, { p: THREE.Vector3; q: THREE.Quaternion }>();
    const diseno = new Map<string, { p: THREE.Vector3; q: THREE.Quaternion }>();
    for (const o of this.listObjects()) {
      const disenada = this.saved.get(o.id);
      if (!disenada) continue;
      const p = o.mesh.position;
      const q = o.mesh.quaternion;
      if (p.distanceTo(disenada.position) < 0.05 && q.angleTo(disenada.quaternion) < 1e-3) {
        continue; // sigue en su sitio de diseño: no es parte del gesto
      }
      poses.set(o.id, { p: p.clone(), q: q.clone() });
      diseno.set(o.id, { p: disenada.position.clone(), q: disenada.quaternion.clone() });
    }
    this.partidaPiezas = poses.size ? poses : null;
    this.disenoDePartida = diseno.size ? diseno : null;

    this.simulating = false;
    this.modoPoseMaquina = false;
    this.setSimHerramienta(this.simToolPrevio);
    this.physics?.dispose();
    this.physics = null;
    // La interfaz de edición vuelve (se replegó al entrar a posar).
    this.bus.emit("simulationChanged", { running: false });

    // Parado se vuelve a ver el DISEÑO, que es el plano fabricable. La partida
    // vive aparte y se aplica al arrancar.
    for (const o of this.listObjects()) {
      const s = this.saved.get(o.id);
      if (!s) continue;
      o.mesh.position.copy(s.position);
      o.mesh.quaternion.copy(s.quaternion);
      o.mesh.scale.copy(s.scale);
    }
    this.saved.clear();
    this.jointHelpers.visible = true;
    this.cablesDirty = true;
    this.rebuildAllRopes();
    // Igual que al parar la simulación: las mallas vienen del plano restaurado,
    // así que la partida no está pintada y no hay edición que reconciliar.
    this.partidaPintada = false;
    // Con el maniquí delante la máquina se queda A LA VISTA en su partida: es
    // el estado sobre el que hay que apoyarle las manos y los pies.
    this.sincronizarPartidaVisible();
    this.bus.emit("poseMaquinaChanged", { active: false });
    this.bus.emit("poseDePartidaChanged", { name: this.nombreDePartida });
    this.scheduleAutosave();
    return { piezas: poses.size };
  }

  /**
   * PUNTOS DE PARTIDA GUARDADOS (v0.2.56). Un mismo diseño se ensaya desde
   * varias configuraciones —agarre alto y agarre bajo, asiento adelantado y
   * atrasado— y hasta ahora solo cabía una: fijar la siguiente borraba la
   * anterior. Ahora se guardan numerados y se recuperan como las posturas.
   *
   * Cada punto lleva la máquina Y la figura, porque una configuración
   * ergonómica es el par: dónde está el mecanismo y cómo se coloca el cuerpo.
   */
  private partidasGuardadas = new Map<string, PuntoDePartida>();

  /** Nombres de los puntos guardados, en el orden en que se crearon. */
  listaPartidas(): string[] {
    return [...this.partidasGuardadas.keys()];
  }

  /** Guarda el estado actual como punto de partida. Devuelve su nombre. */
  guardarPartida(nombre?: string): string {
    let n = nombre?.trim() ?? "";
    if (!n) {
      // Numerados del 1 al infinito, saltando los que ya existan.
      let i = this.partidasGuardadas.size + 1;
      while (this.partidasGuardadas.has(`Partida ${i}`)) i++;
      n = `Partida ${i}`;
    }
    const fig = this.humanFigure;
    this.partidasGuardadas.set(n, {
      piezas: this.partidaPiezas
        ? new Map([...this.partidaPiezas].map(([id, t]) => [id, { p: t.p.clone(), q: t.q.clone() }]))
        : null,
      pose: this.poseDePartida ? JSON.parse(JSON.stringify(this.poseDePartida)) : null,
      poseNombre: this.nombreDePartida,
      pos: fig ? fig.position.clone() : null,
      quat: fig ? fig.quaternion.clone() : null,
    });
    this.bus.emit("partidasChanged", { nombres: this.listaPartidas(), activa: n });
    this.scheduleAutosave();
    return n;
  }

  /** Recupera un punto guardado: la máquina y la figura vuelven a él. */
  aplicarPartida(nombre: string): boolean {
    const p = this.partidasGuardadas.get(nombre);
    if (!p) return false;
    this.ponerPartida(
      p.piezas
        ? new Map([...p.piezas].map(([id, t]) => [id, { p: t.p.clone(), q: t.q.clone() }]))
        : null,
    );
    this.poseDePartida = p.pose ? JSON.parse(JSON.stringify(p.pose)) : null;
    this.nombreDePartida = p.poseNombre;
    this.transformDePartida = p.pos && p.quat ? { p: p.pos.clone(), q: p.quat.clone() } : null;
    // Con el gesto parado, devolver la figura a esa configuración es lo que
    // deja ver el punto guardado; la máquina se aplica al arrancar.
    if (!this.simulating) this.reiniciarPoseDePartida();
    this.bus.emit("partidasChanged", { nombres: this.listaPartidas(), activa: nombre });
    this.bus.emit("poseDePartidaChanged", { name: this.nombreDePartida });
    this.scheduleAutosave();
    return true;
  }

  eliminarPartida(nombre: string): void {
    if (!this.partidasGuardadas.delete(nombre)) return;
    this.bus.emit("partidasChanged", { nombres: this.listaPartidas(), activa: null });
    this.scheduleAutosave();
  }

  /** 🗑 Suelta la partida de la MÁQUINA: ▶ vuelve a arrancar en el diseño. */
  soltarPartidaMaquina(): void {
    this.partidaPiezas = null;
    this.sincronizarPartidaVisible(); // repone el diseño en las mallas
    this.disenoDePartida = null;
    this.bus.emit("poseDePartidaChanged", { name: this.nombreDePartida });
    this.scheduleAutosave();
  }

  /** Cuántas piezas tiene congeladas la partida (0 = arranca en el diseño). */
  piezasEnLaPartida(): number {
    return this.partidaVigente()?.size ?? 0;
  }

  /** ¿Hay una postura de partida a la que volver? */
  tienePoseDePartida(): boolean {
    return this.poseDePartida !== null;
  }

  /** Nombre de la postura de partida (si vino de la biblioteca). */
  nombrePoseDePartida(): string | null {
    return this.nombreDePartida;
  }

  /**
   * ↺ REINICIA a la postura de partida: devuelve la pose Y el sitio de la
   * figura, rehace su cuerpo en el motor y vuelve a resolver las manos
   * apoyadas. Es lo que permite repetir la misma serie desde el mismo punto.
   */
  reiniciarPoseDePartida(): boolean {
    const joints = this.figureJoints();
    const fig = this.humanFigure;
    if (!joints || !fig || !this.poseDePartida) return false;
    for (const g of Object.values(joints)) g.rotation.set(0, 0, 0);
    for (const [jn, [x, y, z]] of Object.entries(this.poseDePartida)) {
      joints[jn]?.rotation.set(degToRad(x), degToRad(y), degToRad(z));
    }
    if (this.transformDePartida) {
      fig.position.copy(this.transformDePartida.p);
      fig.quaternion.copy(this.transformDePartida.q);
    }
    this.pitchAcomodacion.clear();
    this.acomodacionAlLimite = false;
    this.contactoConEstructura = false;
    this.updateHandIK();
    this.updateFootIK();
    if (this.physics) this.physics.añadirFigura(fig);
    this.emitJointSelection();
    this.requestRender();
    this.scheduleAutosave();
    return true;
  }

  /**
   * A QUÉ ALTURA SE PISA bajo el maniquí (v0.2.91): la cara superior de lo que
   * haya debajo de las plantas, o 0 si sólo hay suelo.
   *
   * `ground()` clava el punto más bajo de la figura en y=0, que es el SUELO del
   * proyecto y no la superficie que se está pisando. De pie sobre la plataforma
   * de una prensa, o sobre el estribo de una máquina, la planta se hundía
   * dentro de la pieza —el cuerpo bajaba hasta el suelo— y la pisada no quedaba
   * fijada a nada.
   */
  private superficieBajoLosPies(): number {
    const fig = this.humanFigure;
    if (!fig) return 0;
    fig.updateMatrixWorld(true);
    const rayo = new THREE.Raycaster();
    const abajo = new THREE.Vector3(0, -1, 0);
    let alto = 0;
    for (const lado of ["L", "R"] as const) {
      const m = this.mallaSegmento(`pie-${lado}`);
      if (!m) continue;
      const caja = new THREE.Box3().setFromObject(m);
      const c = caja.getCenter(new THREE.Vector3());
      // El rayo sale de ENCIMA del pie: saliendo del centro, con la planta ya
      // metida en la plataforma, el primer choque sería la cara de abajo.
      rayo.set(new THREE.Vector3(c.x, caja.max.y + 2, c.z), abajo);
      for (const golpe of rayo.intersectObjects(this.sceneManager.content.children, true)) {
        // Sólo cuenta lo que está bajo la planta y a un paso de ella: una
        // pieza a un metro por debajo no es donde se pisa.
        const y = golpe.point.y;
        if (y > caja.max.y + 0.01) continue;
        if (caja.min.y - y > 30) break; // demasiado abajo: se pisa el suelo
        alto = Math.max(alto, y);
        break;
      }
    }
    return alto;
  }

  /** Sube la figura lo justo para que las plantas descansen en esa superficie. */
  private pisarLaSuperficie(): void {
    const fig = this.humanFigure;
    if (!fig) return;
    const superficie = this.superficieBajoLosPies();
    if (superficie <= 0.05) return; // el suelo; ya lo dejó `ground`
    fig.updateMatrixWorld(true);
    let planta = Infinity;
    for (const lado of ["L", "R"] as const) {
      const m = this.mallaSegmento(`pie-${lado}`);
      if (m) planta = Math.min(planta, new THREE.Box3().setFromObject(m).min.y);
    }
    if (!Number.isFinite(planta)) return;
    fig.position.y += superficie - planta;
    fig.updateMatrixWorld(true);
  }

  /**
   * Re-apoya la figura CONSERVANDO su apoyo (v0.2.49).
   *
   * `ground()` la clavaba siempre en y=0: un maniquí sentado en un banco a
   * 45 cm saltaba al suelo en cuanto se tocaba una articulación o se cargaba
   * una postura. Sobre una pieza la raíz —la pelvis— se queda donde la dejó el
   * apoyo y los miembros giran a su alrededor, que es lo que pasa al sentarse.
   */
  private reapoyarFigura(): void {
    const fig = this.humanFigure;
    if (!fig) return;
    if (this.figuraApoyadaEn === "suelo") {
      (fig.userData.ground as (() => void) | undefined)?.();
      this.pisarLaSuperficie();
      return;
    }
    // Sobre una pieza, los glúteos vuelven a posarse en la cara del asiento.
    // Sin esto la figura se quedaba flotando: la invariante del suelo solo
    // sube, así que una vez levantada por una postura de pie ya nunca volvía a
    // sentarse aunque se le cargara una postura sentada.
    if (this.alturaDelApoyo !== null) {
      fig.updateMatrixWorld(true);
      fig.position.y += this.alturaDelApoyo
        - (this.tumbadaEnElApoyo ? this.baseDeLaEspalda(fig) : this.baseDeApoyoSentado(fig));
      fig.updateMatrixWorld(true);
    }
    // LA ESPALDA VUELVE A SU RESPALDO. Es lo que fija a la persona en la
    // máquina: sin replantarla, el primer gesto de tren inferior la empujaba
    // hacia delante y acababa de pie (v0.3.11).
    // Tumbada, el respaldo ES el apoyo y la espalda ya descansa encima: no hay
    // nada contra lo que deslizar, y hacerlo la sacaría de la banca.
    const respaldo = this.apoyoEspalda && !this.tumbadaEnElApoyo
      ? this.objects.get(this.apoyoEspalda)
      : undefined;
    if (respaldo) this.deslizarHastaElRespaldo(fig, respaldo);
    this.noHundirse();
  }

  /**
   * NADA POR DEBAJO DEL SUELO (v0.2.52).
   *
   * Sea cual sea la pose o la colocación, ningún segmento puede quedar bajo el
   * suelo ni hundido en la superficie que lo sostiene. Los pies SÍ pueden
   * flotar —una extensión de rodillas es cadena abierta y el pie no toca
   * nada—, así que aquí solo se EMPUJA HACIA ARRIBA: nunca se baja un miembro
   * para forzarlo a pisar.
   *
   * El orden importa y es el que sigue un cuerpo real. Sentado en un banco
   * bajo, una persona no se levanta del banco: ESTIRA LA RODILLA y adelanta el
   * pie. Por eso primero se corrige la pierna y solo si aun estirada no llega
   * —el banco es más bajo que su pierna— se levanta la figura entera, que es
   * la señal de que el asiento no le sirve a ese cuerpo.
   */
  private noHundirse(): void {
    const fig = this.humanFigure;
    const joints = this.figureJoints();
    if (!fig || !joints) return;
    fig.updateMatrixWorld(true);

    // 1) Cada pierna que se hunde estira la rodilla hasta salir.
    for (const lado of ["L", "R"] as const) {
      // Un pie APOYADO manda: si pisa una plataforma o un pedal, la pierna la
      // resuelve la IK y tocar la rodilla aquí sería pelearse con ella.
      if (this.footTargets.has(lado)) continue;
      const rodilla = joints[`knee${lado}`];
      const lim = JOINT_DOF[`knee${lado}`]?.x;
      if (!rodilla || !lim) continue;
      for (let paso = 0; paso < 40; paso++) {
        const hundido = this.cuantoSeHunde([`pierna-${lado}`, `pie-${lado}`]);
        if (hundido <= 0.05) break;
        // La rodilla flexiona con X POSITIVA: estirarla es ir hacia el mínimo.
        const actual = radToDeg(rodilla.rotation.x);
        const nuevo = Math.max(lim[0], actual - 3);
        if (Math.abs(nuevo - actual) < 1e-3) break; // ya está estirada del todo
        rodilla.rotation.x = degToRad(nuevo);
        fig.updateMatrixWorld(true);
      }
    }

    // 2) Lo que siga por debajo sube con la figura entera. Aquí ya no hay
    //    postura que lo arregle: el apoyo es más bajo de lo que ese cuerpo
    //    necesita, y esconderlo sería falsear la medida.
    const resto = this.cuantoSeHunde();
    if (resto > 0.05) {
      fig.position.y += resto;
      fig.updateMatrixWorld(true);
    }
  }

  /**
   * Puntos de la PIEL PROPIA de un segmento, en su espacio local (cacheados).
   *
   * La geometría de cada segmento vive en el marco de la articulación de la que
   * cuelga, así que el segmento propiamente dicho es lo que queda por DEBAJO de
   * ella (y ≤ 0) y lo de arriba es el collarín que se mete en la pieza madre
   * para que la junta no se abra al doblarla.
   *
   * Hace falta distinguirlos para medir. La caja envolvente en el mundo no
   * sirve: al girar el pie, su collarín —que sube 8,5 cm por la pierna— acaba
   * más bajo que la suela, y la IK corregía contra el filo del collarín en vez
   * de contra la planta. Un punto local fijo tampoco: al girar, el vértice más
   * bajo deja de ser el mismo. Hay que quedarse con los puntos propios y buscar
   * el más bajo entre ellos ya en el mundo.
   */
  private pielPropia(m: THREE.Mesh): THREE.Vector3[] {
    const cache = m.userData.pielPropia as
      | { uuid: string; pts: THREE.Vector3[] }
      | undefined;
    if (cache && cache.uuid === m.geometry.uuid) return cache.pts;
    const pos = m.geometry.getAttribute("position");
    const pts: THREE.Vector3[] = [];
    // La PELVIS es la raíz: no cuelga de ninguna articulación, así que no tiene
    // collarín «de arriba» que descontar y toda ella es piel propia. El criterio
    // de «por debajo del pivote» vale para los segmentos que cuelgan de uno, no
    // para ella — y desde que el maniquí trae esqueleto propio la raíz está en
    // el SUELO, con lo que ese criterio no le dejaba ni un punto y se caía a
    // medir su caja sin decirlo.
    const raiz = m.userData.jointName === "";
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) * m.scale.y + m.position.y;
      if (raiz || y <= 0) pts.push(new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)));
    }
    // Todos, sin muestrear. Se probó con 256 repartidos para ahorrar trabajo y
    // sale mal: `noHundirse` corrige hasta bajar de 0,05 cm de hundimiento, y
    // una muestra no tiene esa puntería — el mínimo bailaba al girar la pierna,
    // el bucle no convergía nunca y acababa estirando la rodilla hasta el tope.
    // Sentarse dejaba la rodilla en 53° en vez de los 90° de sentarse.
    m.userData.pielPropia = { uuid: m.geometry.uuid, pts };
    return pts;
  }

  /** Punto más bajo de la PIEL PROPIA de un segmento, en el mundo. */
  private masBajoPropio(m: THREE.Mesh): number {
    const pts = this.pielPropia(m);
    if (!pts.length) return new THREE.Box3().setFromObject(m).min.y;
    const v = new THREE.Vector3();
    let y = Infinity;
    for (const p of pts) {
      v.copy(p).applyMatrix4(m.matrixWorld);
      if (v.y < y) y = v.y;
    }
    return y;
  }

  /**
   * Cuánto cuelga la planta por debajo del tobillo (cm), medido en el espacio
   * del PROPIO tobillo.
   *
   * Es una constante del rig, y tiene que serlo: medirla en mundo sobre la
   * pose de ese instante hacía que cada pasada de la IK corrigiera sobre la
   * corrección anterior, y el pie oscilaba hasta quedarse 12 cm en el aire.
   */
  private altoDelPie(side: HandSide): number {
    const fig = this.humanFigure;
    if (!fig) return 0;
    let pie: THREE.Mesh | null = null;
    fig.traverse((n) => {
      const m = n as THREE.Mesh;
      if (m.isMesh && m.userData.segmentId === `pie-${side}`) pie = m;
    });
    if (!pie) return 0;
    const malla = pie as THREE.Mesh;
    const geo = malla.geometry;
    if (!geo.boundingBox) geo.computeBoundingBox();
    // El pie cuelga del pivote del tobillo, así que su posición local ya está
    // en el espacio del tobillo; solo falta la escala del rig.
    const bajoElTobillo = -(malla.position.y + geo.boundingBox!.min.y * malla.scale.y);
    const escala = fig.getWorldScale(new THREE.Vector3()).y || 1;
    return Math.max(0, bajoElTobillo * escala);
  }

  /**
   * Cuánto se hunde el cuerpo bajo el suelo (cm). Con `soloSegmentos` mide
   * únicamente esos; sin argumento, el cuerpo entero.
   */
  private cuantoSeHunde(soloSegmentos?: string[]): number {
    const fig = this.humanFigure;
    if (!fig) return 0;
    const filtro = soloSegmentos ? new Set(soloSegmentos) : null;
    let minY = Infinity;
    fig.traverse((n) => {
      const m = n as THREE.Mesh;
      if (!m.isMesh || !m.visible || !m.userData.humanFigurePart) return;
      if (filtro && !filtro.has(String(m.userData.segmentId ?? ""))) return;
      // Solo la piel PROPIA: el collarín de un segmento vive dentro de su
      // vecino, así que si asoma por debajo del suelo es porque su vecino ya
      // está hundido — contarlo hacía ver hundimientos donde no los había y el
      // cuerpo se corregía solo, enderezando la rodilla al sentarse.
      const y = this.masBajoPropio(m);
      if (y < minY) minY = y;
    });
    return Number.isFinite(minY) ? Math.max(0, -minY) : 0;
  }

  /** Dónde se apoya la figura: en el suelo (se re-aterriza) o en una pieza. */
  private figuraApoyadaEn: "suelo" | "pieza" = "suelo";
  /** Cota de la cara sobre la que se sentó, para volver a posarla en ella. */
  private alturaDelApoyo: number | null = null;
  /**
   * Respaldo contra el que descansa la espalda, si lo hay. Se guarda para
   * REPLANTARLA en cada re-apoyo: sin esto la espalda se despegaba en cuanto
   * una postura o un gesto tocaba al maniquí, y sin apoyo detrás el tren
   * inferior lo empujaba fuera del asiento (v0.3.11).
   */
  private apoyoEspalda: string | null = null;
  /**
   * ¿Está TUMBADA sobre su apoyo? En una banca plana la misma pieza hace de
   * asiento y de respaldo, y lo que descansa en ella es la espalda entera, no
   * los glúteos: la cota de re-apoyo se mide distinto (v0.3.14).
   */
  private tumbadaEnElApoyo = false;

  /** Captura la pose actual (rotaciones de todas las articulaciones, en grados). */
  captureCurrentPose(): PoseDef {
    const joints = this.figureJoints();
    const def: PoseDef = {};
    if (joints) {
      for (const [jn, g] of Object.entries(joints)) {
        def[jn] = [
          roundTo(radToDeg(g.rotation.x), 1),
          roundTo(radToDeg(g.rotation.y), 1),
          roundTo(radToDeg(g.rotation.z), 1),
        ];
      }
    }
    return def;
  }

  listPoseNames(): string[] {
    return poseNames();
  }

  /** Guarda/actualiza una postura con la pose actual de la figura. */
  savePose(name: string): void {
    if (!name.trim() || !this.humanFigure) return;
    setPose(name.trim(), this.captureCurrentPose());
    this.bus.emit("posesChanged", { names: poseNames() });
  }

  deletePose(name: string): void {
    removePose(name);
    this.bus.emit("posesChanged", { names: poseNames() });
  }

  restoreDefaultPoses(): void {
    resetDefaultPoses();
    this.bus.emit("posesChanged", { names: poseNames() });
  }

  // ------------------------------------------------- apoyo de manos (IK)
  /** Entra en modo: clic en una mano de la figura y luego en un agarre. */
  beginAttachHand(): void {
    if (!this.humanFigure || this.humanMode !== "mannequin") return;
    this.cancelConnect();
    this.cancelCable();
    this.attachMode = true;
    this.attachTipo = "mano";
    this.attachSide = null;
    this.bus.emit("attachModeChanged", { active: true, stage: "hand" });
  }

  cancelAttachHand(): void {
    if (!this.attachMode) return;
    this.attachMode = false;
    this.attachSide = null;
    this.bus.emit("attachModeChanged", { active: false, stage: null });
  }

  /** Apoya una mano (lado) en el punto local de un objeto (agarre). */
  attachHand(side: HandSide, objectId: string, local: THREE.Vector3): void {
    if (!this.objects.has(objectId)) return;
    this.handTargets.set(side, { objectId, local: local.clone() });
  }

  /** Suelta todas las manos apoyadas. */
  detachHands(): void {
    this.handTargets.clear();
  }

  /**
   * QUÉ HAY APOYADO Y EN QUÉ, para que el panel pueda decirlo.
   *
   * `hasAttachedHands`/`hasAttachedFeet` existían y no los llamaba nadie: el
   * diseñador no tenía forma de distinguir «la mano está apoyada pero no llega»
   * de «nunca llegué a apoyarla», que son dos problemas distintos con el mismo
   * aspecto —un puño en el aire—.
   */
  apoyosPuestos(): { tipo: "mano" | "pie"; lado: "L" | "R"; pieza: string }[] {
    const out: { tipo: "mano" | "pie"; lado: "L" | "R"; pieza: string }[] = [];
    for (const [tipo, mapa] of [
      ["mano", this.handTargets],
      ["pie", this.footTargets],
    ] as const) {
      for (const [lado, t] of mapa) {
        const o = this.objects.get(t.objectId);
        if (o) out.push({ tipo, lado, pieza: o.name });
      }
    }
    return out;
  }

  hasAttachedHands(): boolean {
    return this.handTargets.size > 0;
  }

  // ---------------------------------------- BARRA EN MANOS (v0.2.81)
  //
  // La barra no se posa: la lleva puesta el cuerpo. Cada frame se recoloca
  // desde los apoyos del maniquí, así que sigue a la postura, al arrastre de
  // una articulación y al giro de la figura entera sin que nadie la toque.

  /** Centro de un segmento del maniquí en el mundo (o null si no está). */
  private centroSegmento(id: string): THREE.Vector3 | null {
    const fig = this.humanFigure;
    if (!fig) return null;
    const hallados: THREE.Mesh[] = [];
    fig.traverse((n) => {
      const m = n as THREE.Mesh;
      if (m.isMesh && m.userData.segmentId === id) hallados.push(m);
    });
    const m = hallados[0];
    if (!m) return null;
    return new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3());
  }

  /** La malla de un segmento del maniquí, o null si no está. */
  private mallaSegmento(id: string): THREE.Mesh | null {
    const fig = this.humanFigure;
    if (!fig) return null;
    const hallados: THREE.Mesh[] = [];
    fig.traverse((n) => {
      const m = n as THREE.Mesh;
      if (m.isMesh && m.userData.segmentId === id) hallados.push(m);
    });
    return hallados[0] ?? null;
  }

  /** La malla del tronco (donde se apoyan los dos racks). */
  private mallaTronco(): THREE.Mesh | null {
    return this.mallaSegmento("torso");
  }

  /**
   * Punto de apoyo de la barra sobre el tronco, ya en coordenadas del mundo.
   *
   * El cálculo con rayos se hace UNA VEZ por agarre y se guarda en local: el
   * contacto no depende de la postura, así que girar el tronco lo lleva
   * consigo. Solo se rehace si cambia el agarre o si se sustituye la malla del
   * maniquí, que es cuando de verdad cambia dónde toca.
   */
  private apoyoBarraEnElMundo(): THREE.Vector3 | null {
    const enlace = this.barraManiqui;
    const ej = enlace ? EJERCICIO_BARRA_POR_ID[enlace.ejercicio] : null;
    if (!ej || ej.agarre === "manos") return null;
    const tronco = this.mallaTronco();
    if (!tronco) return null;
    if (!this.apoyoBarraLocal || this.apoyoBarraLocal.agarre !== ej.agarre) {
      const obj = this.objects.get(enlace!.objectId);
      const radio = obj ? (obj.params.radiusTop ?? 1.45) * Math.abs(obj.mesh.scale.x || 1) : 1.45;
      // Las tres referencias van en el sistema del TRONCO: es donde vive el
      // apoyo, y así el cálculo no depende de dónde esté la figura.
      tronco.updateMatrixWorld();
      const joints = this.figureJoints();
      const aLocal = (v: THREE.Vector3) => tronco.worldToLocal(v.clone());
      const cuello = joints?.neck ? aLocal(joints.neck.getWorldPosition(new THREE.Vector3())) : null;
      const hombro = joints?.shoulderL
        ? aLocal(joints.shoulderL.getWorldPosition(new THREE.Vector3()))
        : null;
      this.apoyoBarraLocal = {
        agarre: ej.agarre,
        local: apoyoEnElTronco(tronco, this.mallaSegmento("cuello"), ej.agarre, radio, {
          cuelloY: cuello?.y ?? 0,
          hombroY: hombro?.y ?? 0,
          cuelloZ: cuello?.z ?? 0,
        }),
      };
    }
    tronco.updateMatrixWorld();
    return this.apoyoBarraLocal.local.clone().applyMatrix4(tronco.matrixWorld);
  }

  /** Los cuatro puntos del cuerpo de los que cuelga la barra. */
  private apoyosDeLaBarra(): ApoyosBarra | null {
    const fig = this.humanFigure;
    const joints = this.figureJoints();
    if (!fig || !joints || this.humanMode !== "mannequin") return null;
    fig.updateMatrixWorld(true);
    const manoL = this.centroSegmento("mano-L");
    const manoR = this.centroSegmento("mano-R");
    const hL = joints.shoulderL;
    const hR = joints.shoulderR;
    const tronco = joints.spine;
    if (!manoL || !manoR || !hL || !hR || !tronco) return null;
    return {
      apoyoTronco: this.apoyoBarraEnElMundo(),
      hombroL: hL.getWorldPosition(new THREE.Vector3()),
      hombroR: hR.getWorldPosition(new THREE.Vector3()),
      manoL,
      manoR,
      tronco: tronco.getWorldQuaternion(new THREE.Quaternion()),
      alturaCm: this.humanHeight,
    };
  }

  /**
   * Recoloca la barra sujeta. Se llama desde el bucle de frame, así que da
   * igual por qué camino se movió el maniquí: la barra llega igual.
   *
   * En SIMULACIÓN la barra sujeta no cae ni la empujan las piezas: se la
   * teletransporta a su sitio y se le anula la velocidad, que es la forma
   * honrada de decir «esto lo sostiene una persona». Lo que sí hace es empujar
   * a lo que se le ponga delante, y por eso sirve para ver si entra en el
   * gancho o si choca con el travesaño.
   */
  sincronizarBarraManiqui(): void {
    const enlace = this.barraManiqui;
    if (!enlace) return;
    const obj = this.objects.get(enlace.objectId);
    const ej = EJERCICIO_BARRA_POR_ID[enlace.ejercicio];
    if (!obj || !ej) {
      // La pieza se borró o el ejercicio ya no existe: se suelta el enlace en
      // vez de arrastrar una referencia muerta frame tras frame.
      this.barraManiqui = null;
      this.planActivo = null;
      this.bus.emit("barraManiquiChanged", { objectId: null, ejercicio: null, rackeada: false });
      return;
    }
    // Rackeada: la sostiene el gancho, no el cuerpo. Seguir colgándola de las
    // manos la arrancaría del soporte en el primer fotograma.
    if (enlace.rackeada) return;
    const apoyos = this.apoyosDeLaBarra();
    if (!apoyos) return;
    const { pos, quat } = sitioDeLaBarra(ej.agarre as AgarreBarra, apoyos);
    obj.mesh.position.copy(pos);
    obj.mesh.quaternion.copy(quat);
    obj.mesh.updateMatrixWorld(true);
    if (this.simulating && this.physics) {
      this.physics.recolocarPiezas(new Map([[obj.id, { p: pos, q: quat }]]));
    }
    this.requestRender();
  }

  /**
   * LA BARRA SOBRE EL CUERPO, SIN TOCAR LA FÍSICA (v0.3.1).
   *
   * Las acomodaciones que resuelven contra la barra —el roce, el equilibrio—
   * la mueven decenas de veces por paso mientras buscan: cada una de esas
   * posiciones es un TANTEO, no un sitio donde la barra vaya a quedarse. Usando
   * `sincronizarBarraManiqui` para tantear, en simulación cada tanteo
   * teletransportaba el cuerpo rígido de la barra —más de cien recolocaciones
   * por paso— y solo la última significaba algo. Aquí se mueve solo la malla; la
   * física se entera una vez, al final del paso.
   */
  private tantearBarraEnElCuerpo(): void {
    const enlace = this.barraManiqui;
    if (!enlace || enlace.rackeada) return;
    const obj = this.objects.get(enlace.objectId);
    const ej = EJERCICIO_BARRA_POR_ID[enlace.ejercicio];
    if (!obj || !ej) return;
    const apoyos = this.apoyosDeLaBarra();
    if (!apoyos) return;
    const { pos, quat } = sitioDeLaBarra(ej.agarre as AgarreBarra, apoyos);
    obj.mesh.position.copy(pos);
    obj.mesh.quaternion.copy(quat);
    obj.mesh.updateMatrixWorld(true);
  }

  /** Qué barra lleva puesta el maniquí, si lleva alguna. */
  getBarraManiqui(): { objectId: string; ejercicio: string; rackeada: boolean } | null {
    return this.barraManiqui ? { ...this.barraManiqui } : null;
  }

  /**
   * Le pone al maniquí la barra de un ejercicio y lo deja en su postura alta.
   *
   * Si ya llevaba una, se reaprovecha la misma pieza —con sus discos— en vez
   * de sembrar barras por la escena cada vez que se cambia de ejercicio.
   */
  ponerBarraEnManos(ejercicioId: string): SceneObject | null {
    const ej = EJERCICIO_BARRA_POR_ID[ejercicioId];
    if (!ej || !this.humanFigure || this.humanMode !== "mannequin") return null;
    let obj = this.barraManiqui ? this.objects.get(this.barraManiqui.objectId) ?? null : null;
    // SE ADOPTA LA BARRA QUE YA ESTÁ EN LA ESCENA (v0.2.91). Antes sólo se
    // reutilizaba la que ya estuviera enlazada: la barra que el usuario había
    // colocado desde la paleta, cargado con discos y dejado en los ganchos era
    // invisible para este código y se sembraba OTRA, descargada, en el origen.
    // De ahí venía la estampa de la barra en diagonal con las manos cerca de un
    // extremo: no era la barra del maniquí, era una pieza suelta que nadie
    // movía. Se prefiere la más cercana a las manos, que es la que el usuario
    // tiene delante.
    if (!obj) obj = this.barraLibreMasCerca() ?? this.addComponent("barra-olimpica");
    this.barraManiqui = { objectId: obj.id, ejercicio: ejercicioId, rackeada: false };
    this.apoyoBarraLocal = null;
    // LA ZONA DEL EJERCICIO, puesta con la barra. Elegir «peso muerto» y tener
    // que ir a marcar «bisagra» a mano en la otra pestaña era pedir dos veces
    // lo mismo: la barra ya dice qué se está haciendo. Así el 8/9 mueve lo que
    // toca desde el primer momento.
    this.armarZonaDelEjercicio(ej);
    // ELEGIR EJERCICIO ES COLOCARSE: la postura de arriba trae consigo la
    // estampa —la apertura y el sitio de los pies— y a partir de ahí manda
    // ella. Replantar aquí sería arrastrar la estampa del ejercicio anterior.
    this.aplicarPosturaBarra("arriba", false);
    this.bus.emit("barraManiquiChanged", {
      objectId: obj.id,
      ejercicio: ejercicioId,
      rackeada: false,
    });
    this.scheduleAutosave();
    return obj;
  }

  /** La `barra-olimpica` suelta más cercana a las manos del maniquí, si la hay. */
  private barraLibreMasCerca(): SceneObject | null {
    const manos = this.centroSegmento("mano-L");
    let mejor: SceneObject | null = null;
    let mejorD = Infinity;
    for (const o of this.listObjects()) {
      if (o.componentId !== "barra-olimpica") continue;
      const d = manos ? o.mesh.position.distanceTo(manos) : 0;
      if (d < mejorD) { mejorD = d; mejor = o; }
    }
    return mejor;
  }

  /**
   * ¿A qué ejercicio con barra pertenece esta postura? Es el índice inverso de
   * EJERCICIOS_BARRA: las ocho posturas de barra son EXTREMOS de un gesto, y
   * aplicarlas desde la lista general sin la barra dejaba a la figura haciendo
   * la mímica —bajando sola mientras la barra seguía en los ganchos—.
   */
  private ejercicioDeLaPostura(nombre: string): EjercicioBarra | null {
    return EJERCICIOS_BARRA.find((e) => e.arriba === nombre || e.fondo === nombre) ?? null;
  }

  /**
   * Enlaza la barra si `nombre` es un extremo de un ejercicio con barra. No
   * llama a `applyPose` —lo llama ÉL—, así que no hay recursión: sólo pone el
   * enlace, la zona y el sitio de la barra.
   */
  private engancharBarraDeLaPostura(nombre: string): void {
    const ej = this.ejercicioDeLaPostura(nombre);
    if (!ej || !this.humanFigure || this.humanMode !== "mannequin") return;
    if (this.barraManiqui?.ejercicio !== ej.id) {
      let obj = this.barraManiqui ? this.objects.get(this.barraManiqui.objectId) ?? null : null;
      if (!obj) obj = this.barraLibreMasCerca() ?? this.addComponent("barra-olimpica");
      this.barraManiqui = { objectId: obj.id, ejercicio: ej.id, rackeada: false };
      this.apoyoBarraLocal = null;
      this.armarZonaDelEjercicio(ej);
      this.bus.emit("barraManiquiChanged", {
        objectId: obj.id,
        ejercicio: ej.id,
        rackeada: false,
      });
    }
    // Si la barra está en el gancho A PROPÓSITO, ahí se queda: cambiar de
    // postura no es descolgarla, y para eso está el botón ⤒.
    if (!this.barraManiqui?.rackeada) this.sincronizarBarraManiqui();
  }

  /** Deja armada SOLO la zona de movimiento del ejercicio, en los dos lados. */
  private armarZonaDelEjercicio(ej: EjercicioBarra): void {
    for (const z of ZONAS) this.activarZona(z.id, null);
    // EL PLAN VA ANTES DE ENCENDER LA ZONA: es `activarZona` quien recalcula
    // los candados, y el plan tiene que estar puesto para que abra los suyos.
    this.planActivo = PLANES[ej.id] ?? null;
    this.activarZona(ej.zona, "sim");
  }

  /** Aplica uno de los dos extremos del recorrido del ejercicio puesto. */
  aplicarPosturaBarra(cual: "arriba" | "fondo", replantar = true): boolean {
    const enlace = this.barraManiqui;
    const ej = enlace ? EJERCICIO_BARRA_POR_ID[enlace.ejercicio] : null;
    if (!ej) return false;
    this.applyPose(cual === "arriba" ? ej.arriba : ej.fondo, replantar);
    // RACKEADA, LA SOSTIENE EL GANCHO. Dejar la barra en el soporte y moverse
    // por debajo es un gesto deliberado —se dice con el botón ⤓— y aquí se
    // respeta: agacharse no se la lleva del gancho.
    if (enlace?.rackeada) return true;
    this.sincronizarBarraManiqui();
    return true;
  }

  /**
   * Suelta la barra. Por omisión la deja en la escena donde estaba —es una
   * pieza más y puede seguir siendo útil ahí—; con `borrar` la retira.
   */
  soltarBarraDelManiqui(borrar = false): void {
    const enlace = this.barraManiqui;
    if (!enlace) return;
    this.barraManiqui = null;
    this.planActivo = null;
    if (borrar) {
      const obj = this.objects.get(enlace.objectId);
      if (obj) this.removeObject(obj);
    }
    this.bus.emit("barraManiquiChanged", { objectId: null, ejercicio: null, rackeada: false });
    this.scheduleAutosave();
  }

  /** Discos por lado montados en la barra sujeta. */
  discosBarra(): number {
    const obj = this.barraManiqui ? this.objects.get(this.barraManiqui.objectId) : null;
    return obj ? obj.discosMontados() : 0;
  }

  /** Carga la barra sujeta con `n` discos (se reparten a los dos lados). */
  setDiscosBarra(n: number): void {
    const obj = this.barraManiqui ? this.objects.get(this.barraManiqui.objectId) : null;
    if (!obj) return;
    obj.params.discCount = Math.max(0, Math.round(n));
    obj.rebuildCargaVisual();
    this.bus.emit("objectTransformed", { object: obj });
    this.sincronizarBarraManiqui();
    this.scheduleAutosave();
  }

  /** Peso total de la barra sujeta con su carga (kg). */
  pesoBarraKg(): number {
    const obj = this.barraManiqui ? this.objects.get(this.barraManiqui.objectId) : null;
    return obj ? obj.effectiveMassKg() : 0;
  }

  // ------------------------------------ RACKEAR LA BARRA (v0.2.81)
  //
  // Un rack se diseña para que la barra ENTRE y SALGA de él, así que el
  // maniquí tiene que poder dejarla en los ganchos y volver a cogerla. Los
  // ganchos no se declaran a mano: se leen de las piezas que ya saben recibir
  // una barra —las que llevan `asientoBarra` y las placas dentadas, que
  // declaran un asiento por diente—.

  /**
   * Asiento de una jota en coordenadas LOCALES: el fondo del canal en J.
   *
   * Se muestrea la cara de arriba con rayos verticales a lo largo del brazo y
   * se coge la muestra MÁS BAJA. No es un detalle: la cara superior de una
   * jota sube en el tope delantero y en el respaldo, y quedarse con el máximo
   * —o con el centro de la caja— pondría la barra encaramada en el borde en
   * vez de sentada en el canal, que es justo donde no se queda.
   */
  private asientoDeJota(obj: SceneObject): { local: THREE.Vector3; ejeLocal: THREE.Vector3 } | null {
    const geo = obj.mesh.geometry;
    if (!geo.boundingBox) geo.computeBoundingBox();
    const bb = geo.boundingBox;
    if (!bb) return null;
    const spanX = bb.max.x - bb.min.x;
    const spanZ = bb.max.z - bb.min.z;
    if (spanX < 0.2 || spanZ < 0.2 || bb.max.y - bb.min.y < 0.2) return null;
    // El brazo del gancho corre por el eje horizontal MÁS LARGO; la barra
    // descansa ATRAVESADA sobre él, o sea por el más corto.
    const brazoEnZ = spanZ >= spanX;
    const largo = brazoEnZ ? spanZ : spanX;
    const n = Math.min(48, Math.max(8, Math.round(largo / 1.2)));
    const paso = largo / n;
    const malla = new THREE.Mesh(geo);
    malla.updateMatrixWorld();
    const ray = new THREE.Raycaster();
    const abajo = new THREE.Vector3(0, -1, 0);
    const xMid = (bb.min.x + bb.max.x) / 2;
    const zMid = (bb.min.z + bb.max.z) / 2;
    let mejor: THREE.Vector3 | null = null;
    for (let i = 0; i < n; i++) {
      const sc = (brazoEnZ ? bb.min.z : bb.min.x) + (i + 0.5) * paso;
      const origen = new THREE.Vector3(brazoEnZ ? xMid : sc, bb.max.y + 5, brazoEnZ ? sc : zMid);
      ray.set(origen, abajo);
      const hit = ray.intersectObject(malla, false)[0];
      if (!hit) continue;
      if (!mejor || hit.point.y < mejor.y) mejor = hit.point.clone();
    }
    if (!mejor) return null;
    return {
      local: mejor,
      ejeLocal: brazoEnZ ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1),
    };
  }

  /** Radio del eje de la barra sujeta (lo que se hunde en el asiento). */
  private radioBarra(obj: SceneObject): number {
    return (obj.params.radiusTop ?? 1.45) * Math.abs(obj.mesh.scale.x || 1);
  }

  /**
   * Todos los sitios de la escena donde una barra puede quedarse apoyada, con
   * el punto donde iría su EJE y la dirección en la que se tumba.
   */
  ganchosDeBarra(radio = 1.45): GanchoBarra[] {
    const out: GanchoBarra[] = [];
    for (const obj of this.objects.values()) {
      obj.mesh.updateMatrixWorld(true);
      const q = obj.mesh.getWorldQuaternion(new THREE.Quaternion());
      if (obj.params.kind === "dentada") {
        // La placa declara un asiento por diente: el suelo de cada cuna está
        // en `asiento(i)` y la barra se sienta un radio por encima, medido en
        // el ARRIBA DE LA PLACA (que en un pilar diagonal no es la vertical).
        const m = medidasDentada(obj.params);
        const esp = espejoDe(obj.params.espejo);
        const sx = esp[0] ? -1 : 1;
        const sy = esp[1] ? -1 : 1;
        for (let i = 0; i < m.dientes; i++) {
          const local = new THREE.Vector3(
            ((m.cantoEspina + m.caraDedo) / 2) * sx,
            (m.asiento(i) + radio) * sy,
            0,
          );
          out.push({
            objectId: obj.id,
            nombre: `${obj.name} · diente ${i + 1}`,
            punto: local.applyMatrix4(obj.mesh.matrixWorld),
            eje: new THREE.Vector3(0, 0, 1).applyQuaternion(q).normalize(),
          });
        }
        continue;
      }
      if (!getDefinition(obj.componentId)?.asientoBarra) continue;
      const a = this.asientoDeJota(obj);
      if (!a) continue;
      const punto = a.local.clone();
      punto.y += radio / Math.abs(obj.mesh.scale.y || 1);
      out.push({
        objectId: obj.id,
        nombre: obj.name,
        punto: punto.applyMatrix4(obj.mesh.matrixWorld),
        eje: a.ejeLocal.applyQuaternion(q).normalize(),
      });
    }
    return out;
  }

  /**
   * Deja la barra en el soporte más cercano y libera al maniquí.
   *
   * Un rack tiene DOS ganchos y la barra se apoya en los dos, así que no basta
   * con el más cercano: se busca su PAREJA —otro asiento a la misma cota, con
   * el mismo eje y separado a lo largo de él— y la barra se centra entre
   * ambos. Con un solo gancho en la escena se centra en él, que es lo único
   * que se puede hacer y al menos deja ver si la altura sirve.
   */
  rackearBarra(): boolean {
    const enlace = this.barraManiqui;
    if (!enlace || enlace.rackeada) return false;
    const obj = this.objects.get(enlace.objectId);
    if (!obj) return false;
    const ganchos = this.ganchosDeBarra(this.radioBarra(obj));
    if (!ganchos.length) return false;

    const centro = obj.mesh.position.clone();
    const ejeBarra = new THREE.Vector3(0, 1, 0).applyQuaternion(obj.mesh.quaternion).normalize();
    // El más cercano medido sobre la RECTA de la barra, no sobre su centro: un
    // gancho está a un metro del centro y aun así es el suyo.
    let mejor = ganchos[0];
    let mejorD = Infinity;
    for (const g of ganchos) {
      const d = g.punto.clone().sub(centro);
      const dPerp = d.clone().sub(ejeBarra.clone().multiplyScalar(d.dot(ejeBarra))).length();
      if (dPerp < mejorD) { mejorD = dPerp; mejor = g; }
    }

    // La pareja: mismo eje, misma cota y separada a lo largo del eje.
    let pareja: GanchoBarra | null = null;
    let mejorSep = 0;
    for (const g of ganchos) {
      if (g === mejor || g.objectId === mejor.objectId) continue;
      if (Math.abs(g.eje.dot(mejor.eje)) < 0.98) continue;
      const d = g.punto.clone().sub(mejor.punto);
      if (Math.abs(d.y) > 2) continue;
      const sep = Math.abs(d.dot(mejor.eje));
      if (sep < 20 || sep > 200) continue;      // ni pegados ni de otro rack
      if (d.clone().sub(mejor.eje.clone().multiplyScalar(d.dot(mejor.eje))).length() > 8) continue;
      if (sep > mejorSep) { mejorSep = sep; pareja = g; }
    }

    const pos = pareja ? mejor.punto.clone().add(pareja.punto).multiplyScalar(0.5) : mejor.punto.clone();
    const eje = pareja
      ? pareja.punto.clone().sub(mejor.punto).normalize()
      : mejor.eje.clone();
    obj.mesh.position.copy(pos);
    obj.mesh.quaternion.copy(
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), eje),
    );
    obj.mesh.updateMatrixWorld(true);
    this.barraManiqui = { ...enlace, rackeada: true };
    if (this.simulating && this.physics) {
      this.physics.recolocarPiezas(new Map([[obj.id, { p: pos, q: obj.mesh.quaternion.clone() }]]));
    }
    this.bus.emit("barraManiquiChanged", {
      objectId: obj.id,
      ejercicio: enlace.ejercicio,
      rackeada: true,
    });
    this.bus.emit("objectTransformed", { object: obj });
    this.scheduleAutosave();
    this.requestRender();
    return true;
  }

  /** El maniquí vuelve a coger la barra del soporte y se pone en guardia. */
  desrackearBarra(): boolean {
    const enlace = this.barraManiqui;
    if (!enlace || !enlace.rackeada) return false;
    this.barraManiqui = { ...enlace, rackeada: false };
    this.aplicarPosturaBarra("arriba");
    this.bus.emit("barraManiquiChanged", {
      objectId: enlace.objectId,
      ejercicio: enlace.ejercicio,
      rackeada: false,
    });
    this.scheduleAutosave();
    return true;
  }

  /** Voladizo muñeca→centro del puño, en cm. Es del cuerpo, no de la postura. */
  private voladizoCache = new Map<HandSide, number>();

  /**
   * CUÁNTO SOBRESALE EL PUÑO del pivote de la muñeca. Es una medida del RIG —la
   * bola de la mano cuelga del pivote a lo largo del antebrazo— y no cambia con
   * la postura, así que se mide una vez por talla y se guarda. Volver a medirla
   * en cada fotograma sería reintroducir el temblor que se arregló.
   */
  private voladizoDeLaMano(side: HandSide): number {
    const guardado = this.voladizoCache.get(side);
    if (guardado !== undefined) return guardado;
    const joints = this.figureJoints();
    const wr = joints?.[`wrist${side}`];
    const centro = this.centroSegmento(`mano-${side}`);
    if (!wr || !centro) return 0;
    wr.updateWorldMatrix(true, false);
    const v = centro.distanceTo(wr.getWorldPosition(new THREE.Vector3()));
    this.voladizoCache.set(side, v);
    return v;
  }

  // ------------------------------------------- PISAR una superficie (v0.2.52)
  /**
   * Los pies no siempre tocan el suelo. En una prensa de piernas PISAN la
   * plataforma, en una extensión de rodillas quedan al aire (cadena abierta) y
   * sentado en un banco alto cuelgan. Apoyar un pie es lo mismo que apoyar una
   * mano, pero resolviendo cadera→rodilla→tobillo.
   */
  /**
   * Pies apoyados. `normal` es la NORMAL DE LA CARA que se pisa, en el espacio
   * de la pieza: sin ella la IK daba por hecho que toda superficie es
   * horizontal y en una plataforma inclinada —la de una prensa de piernas— el
   * pie la atravesaba (5,6 cm medidos con la placa de 3 cm de grosor).
   */
  private footTargets = new Map<
    HandSide,
    { objectId: string; local: THREE.Vector3; normal?: THREE.Vector3 }
  >();

  /** Entra en modo: clic en un pie/pierna de la figura y luego en la superficie. */
  beginAttachFoot(): void {
    if (!this.humanFigure || this.humanMode !== "mannequin") return;
    this.cancelConnect();
    this.cancelCable();
    this.attachMode = true;
    this.attachTipo = "pie";
    this.attachSide = null;
    this.bus.emit("attachModeChanged", { active: true, stage: "hand" });
  }

  /** Apoya un pie (lado) en el punto local de una pieza (plataforma, pedal). */
  attachFoot(
    side: HandSide,
    objectId: string,
    local: THREE.Vector3,
    normal?: THREE.Vector3 | null,
  ): void {
    if (!this.objects.has(objectId)) return;
    this.footTargets.set(side, {
      objectId,
      local: local.clone(),
      normal: normal && normal.lengthSq() > 1e-8 ? normal.clone().normalize() : undefined,
    });
  }

  detachFeet(): void {
    this.footTargets.clear();
  }

  hasAttachedFeet(): boolean {
    return this.footTargets.size > 0;
  }

  /**
   * Resuelve cada frame la IK de los pies apoyados. El POLO va hacia el frente
   * de la figura porque la rodilla dobla al revés que el codo: sin eso la
   * pierna se plegaba hacia delante, que es una rodilla rota.
   */
  private updateFootIK(): void {
    if (!this.humanFigure || this.footTargets.size === 0) return;
    const joints = this.figureJoints();
    if (!joints) return;
    const frente = new THREE.Vector3(0, 0, 1).applyQuaternion(this.humanFigure.quaternion);
    const derecha = new THREE.Vector3(1, 0, 0).applyQuaternion(this.humanFigure.quaternion);
    for (const [side, t] of [...this.footTargets]) {
      const obj = this.objects.get(t.objectId);
      if (!obj) {
        this.footTargets.delete(side);
        continue;
      }
      obj.mesh.updateMatrixWorld();
      const target = t.local.clone().applyMatrix4(obj.mesh.matrixWorld);
      const cadera = joints[`hip${side}`];
      const rodilla = joints[`knee${side}`];
      const tobillo = joints[`ankle${side}`];
      if (!cadera || !rodilla || !tobillo) continue;
      // LA SUPERFICIE MANDA SU NORMAL, y todo lo que sigue se mide contra ella
      // en vez de contra el eje Y del mundo (v0.3.11). Con una plataforma
      // horizontal la normal ES +Y y esto se comporta exactamente como antes;
      // con la placa inclinada de una prensa, medir en Y significaba dejar la
      // suela a la altura del punto tocado mientras la placa seguía subiendo
      // hacia la puntera: el pie la atravesaba.
      const normal = this.normalDePisada(
        t,
        obj,
        cadera.getWorldPosition(new THREE.Vector3()).sub(target),
      );
      // Lo que pisa es la PLANTA, no el tobillo. La IK resuelve la posición
      // del tobillo, así que el objetivo se separa de la cara lo que el pie
      // cuelga por debajo de él; sin esta corrección la planta quedaba 9 cm
      // dentro de la plataforma en vez de encima.
      // HACIA DÓNDE SALE LA RODILLA. La IK proyecta el polo sobre el plano
      // perpendicular a la pierna, así que pasarle el frente de la figura sólo
      // vale mientras frente y pierna no se alineen. En una prensa reclinada sí
      // se alinean (0,99 de coseno medido): la proyección quedaba en nada, su
      // normalización amplificaba el ruido y la rodilla saltaba de un lado a
      // otro — la suela oscilaba hasta 18 cm dentro de la placa.
      //
      // La rodilla es una BISAGRA: su eje es el eje izquierda-derecha del
      // cuerpo, así que dobla en el plano sagital pase lo que pase. Ese polo
      // —perpendicular a la pierna por construcción— no se degenera nunca
      // salvo con la pierna apuntando de lado, y para ese caso queda el frente.
      const caderaP = cadera.getWorldPosition(new THREE.Vector3());
      const haciaElPie = target.clone().sub(caderaP);
      const polo = new THREE.Vector3().crossVectors(derecha, haciaElPie);
      if (polo.lengthSq() < 1e-4) {
        polo.copy(frente);
      } else {
        // EL SIGNO LO DA LA RODILLA QUE YA HAY, no el frente de la figura
        // (v0.3.13). Recostada en una prensa, el frente casi no distingue un
        // lado del otro y el polo podía salir invertido: la IK resolvía una
        // rodilla que dobla al revés y la pierna aparecía volteada. Tomando el
        // lado hacia el que la rodilla está flexionada AHORA, la solución nunca
        // salta de rama, que es lo que hace una articulación de verdad.
        const rod = rodilla.getWorldPosition(new THREE.Vector3()).sub(caderaP);
        const eje = haciaElPie.clone().normalize();
        const fuera = rod.clone().addScaledVector(eje, -rod.dot(eje));
        const ref = fuera.lengthSq() > 1e-4 ? fuera : frente;
        if (polo.dot(ref) < 0) polo.negate();
      }
      polo.normalize();
      const cara = normal.dot(target);
      const tocado = target.clone();
      // HASTA DONDE LLEGA LA PIERNA. Si el punto pisado le queda lejos, la IK
      // deja el tobillo corto y la suela se hunde en la placa por debajo del
      // punto tocado: es el «pie atravesando la plataforma» del que avisó el
      // diseñador. Acercar el objetivo SOBRE LA MISMA CARA —el punto más
      // próximo que la pierna alcanza sin salirse del plano— deja la planta
      // apoyada y honesta: la persona pisa donde llega, no donde no llega.
      const alcance = cadera.getWorldPosition(new THREE.Vector3())
        .distanceTo(rodilla.getWorldPosition(new THREE.Vector3()))
        + rodilla.getWorldPosition(new THREE.Vector3())
          .distanceTo(tobillo.getWorldPosition(new THREE.Vector3()));
      const cadPos = cadera.getWorldPosition(new THREE.Vector3());
      const enLaCara = (p: THREE.Vector3): THREE.Vector3 => {
        if (p.distanceTo(cadPos) <= alcance - 0.5) return p;
        const h = normal.dot(cadPos) - normal.dot(p);
        const centro = cadPos.clone().addScaledVector(normal, -h);
        const r2 = alcance * alcance - h * h;
        if (r2 <= 0.25) return centro;
        const r = Math.sqrt(r2) - 0.5;
        const v = p.clone().sub(centro);
        if (v.length() <= r) return p;
        return centro.addScaledVector(v.normalize(), r);
      };
      target.addScaledVector(normal, this.altoDelPie(side));
      target.copy(enLaCara(target));
      solveTwoBoneIK(cadera, rodilla, tobillo, target, polo);
      this.acotarPierna(side, joints);
      this.nivelarTobillo(tobillo, normal);
      // CUÁNTO CUELGA LA SUELA BAJO EL TOBILLO SE MIDE, no se predice
      // (v0.3.11). `altoDelPie` lo estima suponiendo que la pieza del pie
      // cuelga a plomo del pivote, y con el tobillo ya nivelado contra una cara
      // inclinada la estimación se iba varios centímetros: la planta quedaba
      // flotando 4 cm sobre la placa o metida dentro de ella. Nivelado, ese
      // vuelo es una CONSTANTE de la pieza, así que basta medirlo una vez y
      // rehacer el objetivo con él — sin perseguirlo fotograma a fotograma,
      // que es lo que hacía oscilar la pierna.
      this.humanFigure.updateMatrixWorld(true);
      const primera = this.plantaSegunNormal(side, normal);
      if (primera !== null) {
        const vuelo = normal.dot(tobillo.getWorldPosition(new THREE.Vector3())) - primera;
        target.copy(enLaCara(tocado.clone().addScaledVector(normal, vuelo)));
        solveTwoBoneIK(cadera, rodilla, tobillo, target, polo);
        this.acotarPierna(side, joints);
        this.nivelarTobillo(tobillo, normal);
      }
      // Y se remata con el residuo REAL: con la pierna en ángulo el tobillo no
      // queda justo encima de la planta, así que se mide dónde acabó la suela y
      // se corrige el objetivo lo que falte, HASTA QUE LA SUELA SE POSA.
      //
      // Es un lazo y no un solo retoque (v0.3.11) porque nivelar el tobillo
      // vuelve a mover la suela: con una sola pasada la planta se quedaba
      // 1,5 cm dentro de la placa parada y hasta 17,7 cm en marcha. Las
      // cautelas de siempre siguen valiendo: refrescar las matrices antes de
      // medir (si no se lee la pose del fotograma anterior y la corrección se
      // realimenta) y ACOTAR cada paso — con el objetivo fuera del alcance de
      // la pierna la suela no responde como se predice y una corrección libre
      // diverge.
      this.humanFigure.updateMatrixWorld(true);
      const sola = this.plantaSegunNormal(side, normal);
      if (sola !== null && cara - sola > 0.3) {
        target.copy(enLaCara(target.addScaledVector(normal, Math.min(cara - sola, 8))));
        solveTwoBoneIK(cadera, rodilla, tobillo, target, polo);
        this.acotarPierna(side, joints);
        this.nivelarTobillo(tobillo, normal);
      }
    }
  }

  /**
   * POR DÓNDE PUEDE CORRER una pieza (unitario, mundo), o null si no corre.
   *
   * Se lee de sus CANALES: una pieza enhebrada en una o varias guías tubulares
   * solo puede desplazarse a lo largo de ellas. Si la pieza forma parte de un
   * conjunto —soldado o agrupado—, valen los canales de cualquiera de sus
   * compañeras: en una prensa, la placa que se pisa no lleva canal ninguno; lo
   * llevan los travesaños del carro al que está soldada.
   */
  private carreraDeLaPieza(obj: SceneObject): THREE.Vector3 | null {
    const gid = this.groupOf(obj.id);
    const piezas = gid ? this.objetosDelGrupo(gid) : [obj];
    const suma = new THREE.Vector3();
    let cuantas = 0;
    for (const p of piezas.length ? piezas : [obj]) {
      for (const c of p.params.canales ?? []) {
        // EL CANAL YA DICE POR DÓNDE SE CORRE: es un taladro recto, y una
        // pieza enhebrada solo puede deslizarse a lo largo de él. Si además se
        // sabe QUÉ guía lo ocupa, se prefiere el eje del tubo, que es exacto;
        // el del canal viene redondeado al eje local dominante de la pieza.
        // Y hace falta el respaldo del canal: los proyectos anteriores a
        // v0.3.4 guardaron sus canales SIN la guía (los cuatro de la prensa
        // del diseñador vienen así), y sin esto la prensa no tendría carrera.
        const g = c.guia ? this.objects.get(c.guia) : undefined;
        const eje = new THREE.Vector3();
        if (g) {
          g.mesh.updateMatrixWorld();
          eje.set(0, 1, 0).transformDirection(g.mesh.matrixWorld);
        } else {
          p.mesh.updateMatrixWorld();
          eje.set(c.eje === "x" ? 1 : 0, c.eje === "y" ? 1 : 0, c.eje === "z" ? 1 : 0)
            .transformDirection(p.mesh.matrixWorld);
        }
        if (eje.lengthSq() < 0.5) continue;
        eje.normalize();
        // Dos guías paralelas pueden venir con el tubo del revés: se alinean
        // antes de promediar o se anularían entre ellas.
        if (cuantas && suma.dot(eje) < 0) eje.negate();
        suma.add(eje);
        cuantas++;
      }
    }
    return cuantas ? suma.normalize() : null;
  }

  /** Traslada una pieza y todo su conjunto, con la simulación en marcha o sin ella. */
  private moverPiezaYSuGrupo(obj: SceneObject, d: THREE.Vector3): boolean {
    const gid = this.groupOf(obj.id);
    const piezas = gid ? this.objetosDelGrupo(gid) : [obj];
    const poses = new Map<string, { p: THREE.Vector3; q: THREE.Quaternion }>();
    for (const p of piezas.length ? piezas : [obj]) {
      if (p.physics.fixed) continue;
      poses.set(p.id, { p: p.mesh.position.clone().add(d), q: p.mesh.quaternion.clone() });
    }
    if (!poses.size) return false;
    if (this.physics) return this.physics.recolocarPiezas(poses) > 0;
    for (const [id, t] of poses) {
      const p = this.objects.get(id);
      if (!p) continue;
      p.mesh.position.copy(t.p);
      p.mesh.updateMatrixWorld(true);
    }
    return true;
  }

  /**
   * EL PIE EMPUJA SU PEDAL (v0.3.12).
   *
   * En una prensa de piernas la cadena es CERRADA: la planta no se despega de
   * la placa, así que al extender la pierna lo que se mueve es la MÁQUINA. La
   * primera versión de «Pisar» clavaba el pie a un punto fijo de la placa y la
   * IK deshacía la extensión en el mismo paso: el gesto no producía nada, y lo
   * poco que quedaba tiraba del cuerpo hacia la plataforma y lo despegaba del
   * respaldo — justo lo contrario de lo que hace una persona.
   *
   * Ahora se resuelve la cadena por el otro extremo. La rodilla fija cuánto
   * mide la pierna (`cadera→tobillo` no depende de nada más), y la placa solo
   * puede correr por su guía, así que la posición de la placa sale de una
   * ecuación de segundo grado: dónde tiene que estar el punto de contacto para
   * quedar a esa distancia de la cadera. Se elige la raíz más cercana a donde
   * está —la máquina no se teletransporta— y se acota el paso.
   */
  private empujarLosPedales(sentido: SentidoMov): boolean {
    const fig = this.humanFigure;
    const joints = this.figureJoints();
    if (!fig || !joints || this.footTargets.size === 0) return false;
    fig.updateMatrixWorld(true);
    let movio = false;
    const yaMovidos = new Set<string>();
    for (const [side, t] of this.footTargets) {
      const obj = this.objects.get(t.objectId);
      if (!obj || obj.physics.fixed) continue;
      const conjunto = this.groupOf(obj.id) ?? obj.id;
      if (yaMovidos.has(conjunto)) continue;
      const dir = this.carreraDeLaPieza(obj);
      if (!dir) continue;
      const cadera = joints[`hip${side}`];
      const rodilla = joints[`knee${side}`];
      const tobillo = joints[`ankle${side}`];
      if (!cadera || !rodilla || !tobillo) continue;
      obj.mesh.updateMatrixWorld(true);
      const contacto = t.local.clone().applyMatrix4(obj.mesh.matrixWorld);
      const H = cadera.getWorldPosition(new THREE.Vector3());
      const A = tobillo.getWorldPosition(new THREE.Vector3());
      const normal = this.normalDePisada(t, obj, H.clone().sub(contacto));
      // EL VUELO SE MIDE CON EL TOBILLO YA NIVELADO. Es una constante de la
      // pieza sólo en esa orientación, y el reparto del gesto acaba de girar
      // cadera y rodilla —los padres del tobillo—, así que ahora mismo la
      // suela cuelga hacia cualquier lado. Midiéndolo crudo, la placa se iba
      // 27 cm de más y la planta acababa dentro de ella. Nivelar aquí no
      // estropea nada: la IK del pie vuelve a nivelarla enseguida.
      this.nivelarTobillo(tobillo, normal);
      fig.updateMatrixWorld(true);
      const sola = this.plantaSegunNormal(side, normal);
      if (sola === null) continue;
      const vuelo = normal.dot(A) - sola;
      const largo = H.distanceTo(A); // lo que mide la pierna con esta rodilla
      // |contacto + s·dir + normal·vuelo − cadera| = largo
      const v = contacto.clone().addScaledVector(normal, vuelo).sub(H);
      const b = v.dot(dir);
      const c = v.lengthSq() - largo * largo;
      const disc = b * b - c;
      if (disc < 0) continue; // la guía no pasa por donde la pierna alcanza
      const raiz = Math.sqrt(disc);
      const s1 = -b + raiz;
      const s2 = -b - raiz;
      let paso = Math.abs(s1) <= Math.abs(s2) ? s1 : s2;
      if (!Number.isFinite(paso)) continue;
      // CERCA DEL BLOQUEO, LA DISTANCIA DEJA DE CONTAR (v0.3.16).
      //
      // La placa se coloca resolviendo «a qué distancia de la cadera cabe esta
      // pierna», y con la rodilla casi estirada esa distancia deja de depender
      // del ángulo: cinco grados de flexión la cambian una décima de
      // milímetro. Resultado medido: la fase excéntrica no arrancaba NUNCA
      // —veinticinco pulsaciones de tracción, cero movimiento— porque el
      // reparto flexionaba la rodilla, la placa no se movía y la IK devolvía
      // la pierna al estirado en el mismo paso.
      //
      // En esa zona manda el gesto: la placa avanza un paso mínimo en el
      // sentido que toca —alejarse al empujar, acercarse al traccionar— y en
      // cuanto la rodilla se aparta del bloqueo vuelve a mandar la ecuación.
      // EL PEDAL NO VA HACIA ATRÁS MIENTRAS SE EMPUJA (v0.3.16), ni hacia
      // delante mientras se tracciona. Es la regla que ordena todo el final
      // del recorrido: cerca del bloqueo la cadena cerrada es singular —cinco
      // grados de rodilla no cambian la longitud de la pierna ni un
      // milímetro—, y sin esta regla la ecuación devolvía pasos de signo
      // alterno: la placa retrocedía mientras se seguía empujando y luego
      // entraba en un vaivén perpetuo.
      const aleja = Math.sign(v.dot(dir)) || 1; // +1 si avanzar en `dir` aleja
      const debido = sentido * aleja;           // el signo que toca al paso
      if (paso * debido < 0) paso = 0;
      // Y CUANDO LA ECUACIÓN NO SABE DECIDIR, manda el gesto: junto al bloqueo
      // la placa avanza un paso mínimo en el sentido que toca, y en cuanto la
      // rodilla se aparta de ahí vuelve a mandar la ecuación. Sin esto la fase
      // excéntrica no arrancaba NUNCA: el reparto flexionaba la rodilla, la
      // placa no se movía y la IK devolvía la pierna al estirado en el mismo
      // paso —veinticinco pulsaciones de tracción sin mover un grado—.
      if (Math.abs(paso) < 0.05) {
        const lim = JOINT_DOF[`knee${side}`]?.x;
        const rot = radToDeg(rodilla.rotation.x);
        if (!lim || rot - lim[0] >= ZONA_DE_BLOQUEO) continue;
        const recorrido = sentido > 0 ? rot - lim[0] : lim[1] - rot;
        if (recorrido <= 0.5) continue;
        paso = debido * PASO_MINIMO_PEDAL;
      }
      const acotado = Math.max(-CARRERA_MAX_POR_PASO, Math.min(CARRERA_MAX_POR_PASO, paso));
      if (this.moverPiezaYSuGrupo(obj, dir.clone().multiplyScalar(acotado))) {
        movio = true;
        yaMovidos.add(conjunto);
      }
    }
    return movio;
  }

  /**
   * LA PIERNA NO SE RETUERCE (v0.3.15).
   *
   * `solveTwoBoneIK` orienta cada hueso hacia su objetivo con el giro mínimo,
   * y ese giro deja LIBRE la rotación alrededor del propio hueso. En una
   * prensa, con el objetivo casi alineado con la pierna, esa libertad se
   * traducía en muslos volteados: la rodilla aparecía girada de canto y la
   * cadera en rotación interna, sobre todo al retraer.
   *
   * La rodilla es una BISAGRA: su giro axial y su abducción son cero, siempre.
   * Y la cadera gira sobre su eje lo que gira una cadera, no lo que le convenga
   * a la IK. Anular el giro axial de un hueso NO mueve la articulación de
   * abajo —es un giro alrededor de su propio eje—, así que esto no le quita
   * alcance a la pierna: sólo le quita la torsión que no existe.
   */
  private acotarPierna(side: HandSide, joints: Record<string, THREE.Object3D>): void {
    // SE QUITA LA TORSIÓN, NO LA DIRECCIÓN. El giro de un hueso se parte en
    // dos: hacia dónde APUNTA y cuánto gira SOBRE SÍ MISMO. Lo primero es la
    // solución de la IK y no se toca —tocarlo desplazaba el tobillo, y la
    // planta acababa 10 cm dentro de la tarima—; lo segundo es lo que la IK
    // deja al azar y lo que retorcía el muslo. Los huesos del rig descansan a
    // lo largo de Y, así que la torsión es la componente del cuaternión en ese
    // eje y se puede separar sin aproximar nada.
    const destorcer = (nombre: string, maxGrados: number): void => {
      const j = joints[nombre];
      if (!j) return;
      const q = j.quaternion;
      const giro = new THREE.Quaternion(0, q.y, 0, q.w);
      if (giro.lengthSq() < 1e-9) return;
      giro.normalize();
      const apunta = q.clone().multiply(giro.clone().invert());
      let ang = 2 * Math.atan2(giro.y, giro.w);
      if (ang > Math.PI) ang -= 2 * Math.PI;
      if (ang < -Math.PI) ang += 2 * Math.PI;
      const tope = degToRad(maxGrados);
      const acotado = Math.max(-tope, Math.min(tope, ang));
      if (Math.abs(acotado - ang) < 1e-6) return;
      q.copy(apunta.multiply(
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), acotado),
      ));
    };
    // Y NINGUNA ARTICULACIÓN SE SALE DE SU RANGO HUMANO (v0.3.16).
    //
    // `solveTwoBoneIK` orienta huesos por cuaterniones y no sabe nada de los
    // topes de la anatomía: cuando el objetivo se aleja más de lo que la pierna
    // da de sí, ESTIRA LA RODILLA AL REVÉS. Medido sobre la prensa: la rodilla
    // bajaba suave de 76° a 12,9° y saltaba de golpe a −11,3° —23,6° en un
    // paso, con la cadera saltando 12° a la vez—, la placa empezaba a
    // RETROCEDER mientras se seguía empujando, y a partir de ahí la fase
    // excéntrica se quedaba muerta: veinticinco pulsaciones de tracción sin
    // mover un grado, porque la articulación estaba fuera de su rango y ya no
    // le quedaba recorrido hacia ningún lado.
    //
    // Acotar la flexión SÍ mueve el tobillo, al revés que destorcer, y tiene
    // que moverlo: si la rodilla no puede extenderse más, el pie no llega más
    // lejos y el gesto se acaba, que es lo que hace un tope de verdad.
    const alRango = (nombre: string): void => {
      const j = joints[nombre];
      const dof = JOINT_DOF[nombre];
      if (!j || !dof?.x) return;
      const e = new THREE.Euler().setFromQuaternion(j.quaternion, "XYZ");
      const x = Math.max(degToRad(dof.x[0]), Math.min(degToRad(dof.x[1]), e.x));
      if (Math.abs(x - e.x) < 1e-6) return;
      e.x = x;
      j.quaternion.setFromEuler(e);
    };
    // La rodilla es una BISAGRA: no gira sobre su eje, nunca. La cadera gira
    // lo que gira una cadera en un gesto de prensa.
    destorcer(`knee${side}`, 0);
    destorcer(`hip${side}`, GIRO_AXIAL_CADERA);
    // OJO: sólo la cadera. En la rodilla, el ángulo de Euler en X deja de ser
    // la flexión en cuanto la pierna sale del plano sagital, y acotarlo ahí la
    // clavaba en su tope: la fase excéntrica no despegaba nunca. Lo que
    // impide que la rodilla se estire al revés es que el pedal no puede
    // retroceder mientras se empuja (ver `empujarLosPedales`).
    alRango(`hip${side}`);
  }

  /**
   * Normal MUNDIAL de la cara que se pisa. Sin normal guardada —apoyos de
   * proyectos anteriores— se supone horizontal, que es lo que la aplicación
   * daba por hecho hasta v0.3.11. Se orienta siempre hacia arriba: se pisa
   * POR ENCIMA de la cara, y la normal cruda de una cara puede venir al revés
   * según cómo esté volteada la pieza.
   */
  private normalDePisada(
    t: { local: THREE.Vector3; normal?: THREE.Vector3 },
    obj: SceneObject,
    haciaElCuerpo: THREE.Vector3,
  ): THREE.Vector3 {
    if (!t.normal) return new THREE.Vector3(0, 1, 0);
    const n = t.normal.clone().transformDirection(obj.mesh.matrixWorld).normalize();
    if (!Number.isFinite(n.x) || n.lengthSq() < 0.5) return new THREE.Vector3(0, 1, 0);
    // LA CARA QUE SE PISA MIRA AL CUERPO, no al cielo (v0.3.12). En un suelo,
    // una tarima o un pedal, ambas cosas coinciden y por eso la primera versión
    // se limitaba a apuntar la normal hacia arriba. En una PRENSA DE PIERNAS no
    // coinciden: la placa va por encima y por delante del que empuja, y la cara
    // contra la que apoya la planta mira hacia ABAJO y hacia él. Forzando la
    // normal hacia arriba, el pie se colocaba al otro lado de la placa —encima
    // en vez de debajo— y con la puntera del revés.
    if (n.dot(haciaElCuerpo) < 0) n.negate();
    return n;
  }

  /**
   * Cota de la PLANTA medida a lo largo de una normal (cm), o null si no hay
   * pie. Con la normal +Y esto es exactamente `plantaDelPie`; con una cara
   * inclinada es la única medida que dice si la suela está por dentro o por
   * fuera de la placa.
   */
  private plantaSegunNormal(side: HandSide, normal: THREE.Vector3): number | null {
    const fig = this.humanFigure;
    if (!fig) return null;
    let malla: THREE.Mesh | null = null;
    fig.traverse((n) => {
      const m = n as THREE.Mesh;
      if (m.isMesh && m.userData.segmentId === `pie-${side}`) malla = m;
    });
    if (!malla) return null;
    const m = malla as THREE.Mesh;
    m.updateWorldMatrix(true, false);
    const v = new THREE.Vector3();
    let min = Infinity;
    for (const p of this.pielPropia(m)) {
      v.copy(p).applyMatrix4(m.matrixWorld);
      const d = normal.dot(v);
      if (d < min) min = d;
    }
    return Number.isFinite(min) ? min : null;
  }

  /**
   * El pie pisa PLANO: el tobillo deshace el giro que le impuso la tibia.
   *
   * La IK resuelve cadera y rodilla, y el pie iba solidario con la tibia. Con
   * la primitiva —una losa centrada en el pivote— apenas se notaba. Con un
   * cuerpo escaneado sí: sus pies están separados ±26 cm y el rig pone el
   * pivote del tobillo en ±10, así que el pie no gira sobre su tobillo, ORBITA
   * a 17,8 cm de él. Con la pierna en ángulo la suela acababa colgando 19 cm
   * del tobillo en vez de los 6,75 que `altoDelPie()` da por buenos, el remate
   * se topaba y la planta se quedaba 9,8 cm dentro de la plataforma.
   *
   * Nivelando, la caída vuelve a ser la que se supone y la planta se posa
   * plana, que es lo que hace un pie al pisar — con este cuerpo y con las
   * primitivas.
   */
  private nivelarTobillo(tobillo: THREE.Object3D, normal?: THREE.Vector3): void {
    if (!this.humanFigure) return;
    tobillo.updateWorldMatrix(true, false);
    const q = this.humanFigure.getWorldQuaternion(new THREE.Quaternion());
    // NIVELAR ES RESPECTO DE LA CARA QUE SE PISA, no del horizonte. Sobre una
    // placa inclinada el pie tiene que acostarse SOBRE ella: dejarlo horizontal
    // metía la puntera dentro de la placa por mucho que el punto tocado
    // estuviera en su superficie. Con la cara horizontal el marco que sale de
    // aquí es el de la figura, que es lo que se hacía hasta v0.3.11.
    if (normal && Math.abs(normal.y) < 0.999) {
      const arriba = normal.clone().normalize();
      // EL MARCO SE LEVANTA DESDE EL EJE IZQUIERDA-DERECHA, no desde el frente.
      // Recostada 50° en una prensa, la figura «mira» hacia arriba y adelante,
      // que es casi la misma dirección que la normal de la placa (0,996 de
      // coseno medido): proyectar el frente sobre el plano de la cara dejaba un
      // vector diminuto, su normalización era ruido puro y el pie salía girado
      // al azar — la suela acababa 25 cm por debajo del tobillo en vez de 7. El
      // eje izquierda-derecha del cuerpo es horizontal y nunca se alinea con la
      // normal de una superficie que se pisa.
      const derecha = new THREE.Vector3(1, 0, 0).applyQuaternion(q).projectOnPlane(arriba);
      if (derecha.lengthSq() < 1e-6) derecha.set(1, 0, 0).projectOnPlane(arriba);
      if (derecha.lengthSq() < 1e-6) return;
      derecha.normalize();
      const frente = new THREE.Vector3().crossVectors(derecha, arriba).normalize();
      q.setFromRotationMatrix(new THREE.Matrix4().makeBasis(derecha, arriba, frente));
    }
    // El local que deja el mundo en `q` es el inverso del padre por `q`. La
    // primera versión componía el corrector por la izquierda del local, que
    // solo coincide cuando los giros conmutan: con el tobillo ya girado por la
    // tibia y una cara inclinada dejaba de coincidir, y el pie salía torcido.
    const padre = tobillo.parent
      ? tobillo.parent.getWorldQuaternion(new THREE.Quaternion())
      : new THREE.Quaternion();
    tobillo.quaternion.copy(padre.invert().multiply(q));
  }

  /**
   * ¿Está el brazo de este lado MANDADO por una zona de movimiento activa?
   *
   * Si lo está, la IK de la mano NO debe tocarlo (v0.2.49): la IK apunta al
   * agarre y, apoyada la mano, deshacía el gesto en el mismo frame — el brazo
   * se quedaba clavado como si nunca se hubiera pulsado nada. Con la zona
   * activa manda el gesto y es el CUERPO el que empuja la pieza por contacto,
   * que es lo que hace una persona de verdad.
   */
  private brazoMandado(side: HandSide): boolean {
    for (const [id, lado] of this.zonasActivas) {
      const z = ZONA_POR_ID[id];
      if (!z) continue;
      if (lado !== "sim" && lado !== side) continue;
      if (z.patron.some((a) => a.familia === "shoulder" || a.familia === "elbow")) return true;
    }
    return false;
  }

  /** Resuelve cada frame la IK de las manos apoyadas para que sigan su agarre. */
  private updateHandIK(): void {
    if (!this.humanFigure || this.handTargets.size === 0) return;
    const joints = this.figureJoints();
    if (!joints) return;
    for (const [side, t] of [...this.handTargets]) {
      const obj = this.objects.get(t.objectId);
      if (!obj) {
        this.handTargets.delete(side);
        continue;
      }
      // EL VETO ES DEL GESTO EN MARCHA, no del reposo (v0.2.91). Con la zona
      // activa manda el gesto y la IK deshacía el movimiento en el mismo
      // fotograma, que es lo que este `continue` evita. Pero se aplicaba
      // TAMBIÉN parado, y la zona de fábrica es «tren superior» —que declara
      // hombro y codo—: en una UpperMachine la IK de las dos manos no se
      // ejecutaba NUNCA, ni al apoyar, ni tras una postura, ni al mover la
      // máquina. Las manos se quedaban en los grados del catálogo, cerradas en
      // el aire, y cuando coincidían con un mando era casualidad geométrica.
      // Parado, y mientras se posa la máquina, manda el apoyo.
      if (this.simulating && !this.modoPoseMaquina && this.brazoMandado(side)) continue;
      obj.mesh.updateMatrixWorld();
      // La malla ya está donde toca: con el maniquí delante muestra la partida
      // y sin él el plano, así que el agarre se persigue donde se ve. (Hasta
      // v0.2.92 había que componer el marco desde la partida a mano, porque
      // parado las mallas siempre estaban en el plano y la mano perseguía un
      // mando que no estaba ahí.)
      const target = t.local.clone().applyMatrix4(obj.mesh.matrixWorld);
      const sh = joints[`shoulder${side}`];
      const el = joints[`elbow${side}`];
      const wr = joints[`wrist${side}`];
      if (!sh || !el || !wr) continue;
      // LA QUE AGARRA ES LA PALMA, NO LA MUÑECA. `solveTwoBoneIK` pone el
      // PIVOTE de la muñeca sobre el punto, y la malla de la mano cuelga de él
      // —unos 3,5 cm de descuelgue más 6 de radio en un cuerpo de 175—, así que
      // el puño acababa pasado del mando en vez de rodearlo. La IK del pie ya
      // hace esta compensación con `altoDelPie`; ésta no la tenía.
      //
      // Y SE MIDE EL VOLADIZO, NO EL RESIDUO. La primera versión resolvía, medía
      // lo que quedaba entre el centro del puño y el agarre, y volvía a resolver
      // contra `objetivo + resto`. Corregía, sí, pero esto se ejecuta CADA
      // FOTOGRAMA partiendo de donde lo dejó el anterior, y así no converge:
      // oscila. El fotograma acaba con la muñeca en `objetivo + resto` y el puño
      // en el objetivo; el siguiente empieza resolviendo otra vez a `objetivo`,
      // que devuelve el puño a `objetivo − resto`, vuelve a medir el mismo resto
      // y vuelve a corregir. Un ciclo límite de un fotograma: EL BRAZO TIEMBLA y
      // no se asienta nunca. Es lo que el diseñador vio al apoyar las manos.
      //
      // El desplazamiento muñeca→centro del puño no es un residuo: es un vector
      // FIJO del cuerpo, que sólo depende de cómo esté orientado el antebrazo.
      // Medido así y restado del objetivo, la solución es la misma la pinte
      // quien la pinte, y el fotograma siguiente vuelve a dar exactamente eso.
      solveTwoBoneIK(sh, el, wr, target, undefined, this.voladizoDeLaMano(side));
    }
  }

  /**
   * HACIA DÓNDE MIRA EL MANIQUÍ, en grados sobre el plano del suelo.
   *
   * 0° es mirando a +Z, que es hacia donde mira el rig en reposo, y crece hacia
   * +X (a la derecha del observador). Colocar lo ADIVINA —midiendo el asiento, o
   * apuntando a la máquina fija más cercana—, y adivinar acierta casi siempre
   * pero no siempre: en un pasillo entre dos torres, o para mirar de perfil a
   * la cámara al componer una lámina, hace falta poder decirlo.
   */
  rumboFigura(): number {
    const fig = this.humanFigure;
    if (!fig) return 0;
    const frente = new THREE.Vector3(0, 0, 1).applyQuaternion(fig.quaternion);
    return +(Math.atan2(frente.x, frente.z) * 180 / Math.PI).toFixed(1);
  }

  /** Gira al maniquí hasta mirar a `grados` (absoluto, sobre el plano del suelo). */
  setRumboFigura(grados: number): void {
    const fig = this.humanFigure;
    if (!fig) return;
    const rad = degToRad(((grados % 360) + 360) % 360);
    fig.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rad);
    fig.updateMatrixWorld(true);
    this.lastFigureTransform = { position: fig.position.clone(), quaternion: fig.quaternion.clone() };
    // Girado el cuerpo, lo que colgaba de él tiene que acompañarlo: la barra va
    // atada a las manos y los apoyos apuntan a piezas que no han girado.
    this.updateHandIK();
    this.updateFootIK();
    this.sincronizarBarraManiqui();
    this.marcarPoseDePartida();
    if (this.physics && this.humanFigure) this.physics.añadirFigura(this.humanFigure);
    this.bus.emit("figuraRumboChanged", { grados: this.rumboFigura() });
    this.requestRender();
    this.scheduleAutosave();
  }

  /** Gira al maniquí un incremento (grados) desde donde mire ahora. */
  girarFigura(delta: number): void {
    if (!this.humanFigure) return;
    this.setRumboFigura(this.rumboFigura() + delta);
  }

  private selectFigure(): void {
    this.selectFigureRoot();
  }

  // ----------------------------------------------------------- conexiones
  listJoints(): Joint[] {
    return [...this.joints.values()];
  }

  getJointById(id: string): Joint | undefined {
    return this.joints.get(id);
  }

  /** Entra en modo "conectar": clic en pieza A y luego en pieza B. */
  beginConnect(kind: JointKind): void {
    if (this.simulating) return;
    // Todas, no solo el cable: si quedaba una a medias, se comía el clic con
    // el que el usuario creía estar eligiendo la primera pieza.
    this.cancelarHerramientas();
    this.connectMode = kind;
    this.pendingA = null;
    this.select(null);
    this.bus.emit("connectModeChanged", { kind, pending: false });
  }

  cancelConnect(): void {
    if (!this.connectMode) return;
    this.connectMode = null;
    this.pendingA = null;
    this.olvidarCaraBisagra();
    this.bus.emit("connectModeChanged", { kind: null, pending: false });
  }

  /** ¿Hay una primera cara marcada, esperando la segunda? (herramienta y pruebas) */
  hayMarcaBisagra(): boolean {
    return !!this.bisagraA && !!this.bisagraMarca;
  }

  /** Olvida la primera cara elegida y borra su marca. */
  private olvidarCaraBisagra(): void {
    this.bisagraA = null;
    this.limpiarMarcaBisagra();
  }

  /**
   * Borra SOLO el dibujo de la marca. Separado de olvidar la cara porque
   * marcarla vuelve a llamar aquí para no apilar dos discos, y si de paso
   * borrara el dato, la herramienta perdía la primera cara justo al dibujarla.
   */
  private limpiarMarcaBisagra(): void {
    if (!this.bisagraMarca) return;
    this.sceneManager.scene.remove(this.bisagraMarca);
    this.bisagraMarca.traverse((n) => {
      const m = n as THREE.Mesh;
      m.geometry?.dispose();
      if (m.material) (m.material as THREE.Material).dispose();
    });
    this.bisagraMarca = null;
    this.requestRender();
  }

  /**
   * Marca el punto y la cara del primer clic: un disco pegado a la cara con
   * su normal saliendo, para que se vea SOBRE QUÉ SUPERFICIE se va a atornillar
   * la placa antes de elegir la segunda.
   */
  private marcarCaraBisagra(punto: THREE.Vector3, normal: THREE.Vector3): void {
    this.limpiarMarcaBisagra();
    const g = new THREE.Group();
    const disco = new THREE.Mesh(
      new THREE.CircleGeometry(2.2, 24),
      new THREE.MeshBasicMaterial({
        color: 0x2563eb,
        depthTest: false,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
      }),
    );
    disco.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    const aguja = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 6, 8),
      new THREE.MeshBasicMaterial({ color: 0x2563eb, depthTest: false }),
    );
    aguja.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    aguja.position.copy(normal).multiplyScalar(3);
    g.add(disco, aguja);
    g.position.copy(punto).addScaledVector(normal, 0.05);
    g.renderOrder = 999;
    this.sceneManager.scene.add(g);
    this.bisagraMarca = g;
    this.requestRender();
  }

  /**
   * CARA DE LA CAJA de una pieza más parecida a la que tocó el puntero: la
   * placa de una bisagra se apoya en una superficie PLANA, así que la normal
   * cruda del triángulo se redondea a la cara del volumen real de la pieza.
   * Con una malla de biblioteca (una jota, un pilar con agujeros) esa normal
   * cruda puede ser la de un chaflán, y la placa saldría torcida.
   */
  private caraDeCaja(o: SceneObject, cruda: THREE.Vector3): THREE.Vector3 {
    const { u } = this.cajaOrientada(o);
    let mejor = cruda.clone().normalize();
    let mejorDot = 0.7; // por debajo, la cara cruda manda (superficie curva)
    for (const eje of u) {
      for (const signo of [1, -1]) {
        const cand = eje.clone().multiplyScalar(signo);
        const d = cand.dot(cruda);
        if (d > mejorDot) {
          mejorDot = d;
          mejor = cand;
        }
      }
    }
    return mejor.normalize();
  }

  removeJoint(joint: Joint): void {
    this.joints.delete(joint.id);
    this.refreshJointHelpers();
    this.bus.emit("jointsChanged", { joints: this.listJoints() });
  }

  /** Notifica que un joint cambio (para refrescar marcadores y UI). */
  jointUpdated(): void {
    this.refreshJointHelpers();
    this.bus.emit("jointsChanged", { joints: this.listJoints() });
  }

  /** Crea una articulacion entre dos objetos (por id). Anchor por defecto = punto medio. */
  connect(
    aId: string,
    bId: string,
    kind: JointKind,
    anchor?: THREE.Vector3,
  ): Joint | null {
    const a = this.objects.get(aId);
    const b = this.objects.get(bId);
    if (!a || !b || a === b) return null;
    const anc = anchor ?? a.mesh.position.clone().add(b.mesh.position).multiplyScalar(0.5);
    const joint = new Joint({ kind, bodyAId: aId, bodyBId: bId, anchor: anc });
    this.joints.set(joint.id, joint);
    this.refreshJointHelpers();
    this.bus.emit("jointsChanged", { joints: this.listJoints() });
    return joint;
  }

  private createJoint(a: SceneObject, b: SceneObject, montaje?: MontajeBisagra): void {
    if (!this.connectMode) return;
    // BISAGRA REAL (v0.2.32): la herramienta ya no deja una articulación
    // abstracta entre las dos piezas — instala el herraje completo (dos placas
    // planas y el pasador cilíndrico que las articula) y lo suelda a cada
    // pieza, así el usuario ve y controla la bisagra que está montando.
    if (this.connectMode === "revolute") {
      this.cancelConnect();
      const pedir = this.elegirBisagra;
      if (!pedir) {
        this.instalarBisagra(a, b, { eje: "auto", tamano: 8 }, montaje);
        return;
      }
      this.bisagraPidiendo = true;
      void pedir(!!montaje).then((cfg) => {
        this.bisagraPidiendo = false;
        if (cfg && this.objects.has(a.id) && this.objects.has(b.id)) {
          this.instalarBisagra(a, b, cfg, montaje);
        }
      });
      return;
    }
    this.connect(a.id, b.id, this.connectMode);
    this.cancelConnect();
  }

  /**
   * Caja ORIENTADA de una pieza (centro, ejes locales en mundo y semilados en
   * cm): la representación honesta de su volumen, a diferencia de la AABB del
   * mundo, que se hincha cuando la pieza está girada.
   */
  private cajaOrientada(o: SceneObject): CajaOr {
    const q = o.mesh.getWorldQuaternion(new THREE.Quaternion());
    const e = o.localSizeAbs().multiplyScalar(0.5);
    // EL CENTRO ES EL DEL MATERIAL, NO EL ORIGEN DE LA PIEZA (v0.3.10).
    //
    // Una viga TRAZADA no tiene su malla centrada en su origen: su recorrido
    // puede arrancar 90 cm por debajo y terminar 10 por encima. Tomar
    // `mesh.position` por centro de la caja la colocaba donde no hay acero, y
    // eso envenenaba TODO lo que mide volúmenes: soldar no encontraba
    // contactos que se ven a simple vista, y la bisagra decidía mal si podía
    // pedir colisión real entre las piezas. Medido en el modelo de una prensa
    // de piernas del diseñador: 14 de 32 piezas descolocadas, las peores
    // 55,87 cm — más de medio metro de error en una caja de 5 cm de lado.
    const geo = o.mesh.geometry;
    if (!geo.boundingBox) geo.computeBoundingBox();
    o.mesh.updateMatrixWorld();
    return {
      c: o.mesh.localToWorld(geo.boundingBox!.getCenter(new THREE.Vector3())),
      u: [
        new THREE.Vector3(1, 0, 0).applyQuaternion(q),
        new THREE.Vector3(0, 1, 0).applyQuaternion(q),
        new THREE.Vector3(0, 0, 1).applyQuaternion(q),
      ],
      e: [e.x, e.y, e.z],
    };
  }

  /**
   * EL VOLUMEN REAL DE UNA PIEZA, como una o varias cajas orientadas.
   *
   * Una caja sola vale para una primitiva y para una viga recta. Para una viga
   * DOBLADA no: su envolvente es un ladrillo lleno de aire —un pilar en L de
   * un metro por lado encierra casi un metro cúbico de nada—, así que dos
   * piezas que no se rozan salían «en contacto» y una que sí, escondida en el
   * hueco del codo, salía separada. Aquí se trocea por las mismas cuerdas con
   * las que la física construye sus colliders: la forma que el usuario ve.
   */
  private cajasDePieza(o: SceneObject): CajaOr[] {
    const p = o.params;
    const doblada =
      (p.kind === "beam" || p.kind === "tube") && !!p.path && !pathIsStraight(p.path);
    if (!doblada) return [this.cajaOrientada(o)];
    o.mesh.updateMatrixWorld();
    const esc = o.mesh.scale;
    // Semilado de la sección, con la escala de la pieza. Se toma el mayor de
    // los dos lados: pecar de grueso detecta el contacto un pelo antes, que
    // es el lado por el que conviene equivocarse.
    const grosor =
      (Math.max(p.width ?? 5, p.depth ?? 5) / 2) *
      Math.max(Math.abs(esc.x), Math.abs(esc.y), Math.abs(esc.z));
    const out: CajaOr[] = [];
    for (const cu of cuerdasColision(p.path!)) {
      const a = o.mesh.localToWorld(cu.a.clone());
      const b = o.mesh.localToWorld(cu.b.clone());
      const dir = b.clone().sub(a);
      const largo = dir.length();
      if (largo < 1e-4) continue;
      dir.normalize();
      const aux = Math.abs(dir.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
      const n1 = new THREE.Vector3().crossVectors(dir, aux).normalize();
      const n2 = new THREE.Vector3().crossVectors(dir, n1).normalize();
      out.push({
        c: a.add(b).multiplyScalar(0.5),
        u: [dir, n1, n2],
        e: [largo / 2, grosor, grosor],
      });
    }
    return out.length > 0 ? out : [this.cajaOrientada(o)];
  }

  /**
   * HUECO MÍNIMO (cm) entre el material de dos piezas: negativo si se
   * interpenetran, 0 si se rozan. Mide contra la FORMA real, tramo a tramo.
   */
  separacionEntre(a: SceneObject, b: SceneObject): number {
    let mejor = Infinity;
    const cajasA = this.cajasDePieza(a);
    const cajasB = this.cajasDePieza(b);
    for (const A of cajasA) {
      for (const B of cajasB) {
        const h = huecoEntreCajas(A, B);
        if (h < mejor) mejor = h;
        if (mejor <= -1e6) return mejor;
      }
    }
    return mejor;
  }

  /** Hasta dónde llega la pieza en la dirección `n` (cm, proyección sobre n). */
  private soporteEnDireccion(o: SceneObject, n: THREE.Vector3): number {
    const caja = this.cajaOrientada(o);
    return (
      caja.c.dot(n) +
      caja.e[0] * Math.abs(caja.u[0].dot(n)) +
      caja.e[1] * Math.abs(caja.u[1].dot(n)) +
      caja.e[2] * Math.abs(caja.u[2].dot(n))
    );
  }

  /**
   * ¿Las dos piezas están SEPARADAS en la pose de diseño? (v0.2.33)
   *
   * Prueba de ejes separadores (SAT) entre sus cajas ORIENTADAS — no las AABB
   * del mundo, que se hinchan cuando la pieza está girada y darían por
   * solapadas dos vigas que solo se encuentran en una esquina. Se admite una
   * pequeña interpenetración (`tol`) porque las piezas que se tocan suelen
   * compartir unos milímetros. Sirve para decidir si una bisagra puede pedir
   * contactos reales entre ambas sin que el solver las expulse al arrancar.
   */
  /**
   * MIGRACIÓN de bisagras reales anteriores a v0.2.33: las instaladas antes
   * de esta versión se guardaron sin pedir contactos, así que sus piezas se
   * atravesaban al plegar. Al abrir el proyecto (o insertar un prefab
   * antiguo) se les activa la colisión si las piezas anfitrionas —las que
   * lleva soldada cada placa— no están interpenetradas en la pose de diseño.
   * Las uniones que traen el dato explícito se respetan tal cual.
   */
  private migrarContactosBisagra(explicitas: Set<string>): void {
    const anfitrion = new Map<string, string>();
    for (const j of this.joints.values()) {
      if (!j.locked) continue;
      const a = this.objects.get(j.bodyAId);
      const b = this.objects.get(j.bodyBId);
      if (!a || !b) continue;
      if (a.componentId === "placa-bisagra" && b.componentId !== "placa-bisagra") {
        anfitrion.set(a.id, b.id);
      } else if (b.componentId === "placa-bisagra" && a.componentId !== "placa-bisagra") {
        anfitrion.set(b.id, a.id);
      }
    }
    for (const j of this.joints.values()) {
      if (j.locked || j.contactos || explicitas.has(j.id)) continue;
      const a = this.objects.get(j.bodyAId);
      const b = this.objects.get(j.bodyBId);
      if (a?.componentId !== "placa-bisagra" || b?.componentId !== "placa-bisagra") continue;
      const ha = this.objects.get(anfitrion.get(a.id) ?? "");
      const hb = this.objects.get(anfitrion.get(b.id) ?? "");
      if (ha && hb && ha !== hb && this.piezasSeparadas(ha, hb)) j.contactos = true;
    }
  }

  piezasSeparadas(a: SceneObject, b: SceneObject, tol = 0.8): boolean {
    return this.separacionEntre(a, b) >= -tol;
  }


  /**
   * Instala una BISAGRA REAL entre dos piezas (v0.2.32).
   *
   * Herraje: una PLACA plana soldada a cada pieza y un PASADOR cilíndrico que
   * hace de articulación entre ambas. En la simulación las placas se funden
   * con su pieza (uniones bloqueadas = soldaduras) y la única articulación
   * libre es la del pasador, de modo que lo que se ve montado es exactamente
   * lo que gira: la bisagra deja de ser una abstracción invisible.
   */
  instalarBisagra(
    a: SceneObject,
    b: SceneObject,
    cfg: ConfigBisagra,
    montaje?: MontajeBisagra,
  ): Joint | null {
    // NO SE MONTA HERRAJE CON LA MÁQUINA EN MARCHA (v0.2.76). Esto se llama
    // desde una promesa —el panel de la bisagra— que puede resolverse mucho
    // después de abrirse, y entre medias cabe pulsar ▶. Si llega aquí con la
    // simulación corriendo, las posiciones que lee son las que escribe el
    // motor, así que las placas y el pasador se colocan donde las piezas
    // estaban A MITAD DE CAÍDA; al parar, las piezas vuelven a su sitio y el
    // herraje se queda flotando, soldado a algo que ya no está ahí.
    if (this.simulating) return null;
    if (a === b) return null;
    const ca = a.mesh.getWorldPosition(new THREE.Vector3());
    const cb = b.mesh.getWorldPosition(new THREE.Vector3());
    // MEDIDAS DEL HERRAJE. Van primero porque el ESPESOR de la pala decide
    // dónde cae su plano —y con él la charnela— cuando el montaje viene de dos
    // caras elegidas a mano.
    const largo = Math.max(2, cfg.tamano);
    const ancho = Math.max(2, largo * 0.75);
    const grosor = Math.max(0.5, largo * 0.1);
    const radioPasador = Math.max(0.5, grosor * 0.9);
    // Las palas arrancan pasado el pasador: si lo montaran encima, el cilindro
    // (soldado a la pala A) chocaría con la pala B y la bisagra se agarrotaría
    // en cuanto las piezas empiezan a chocar de verdad.
    const separacion = radioPasador + 0.35;
    /** Del plano medio de la pala a la cara sobre la que se apoya. */
    const medio = grosor / 2;

    const ejes: Record<"x" | "y" | "z", THREE.Vector3> = {
      x: new THREE.Vector3(1, 0, 0),
      y: new THREE.Vector3(0, 1, 0),
      z: new THREE.Vector3(0, 0, 1),
    };
    const letraMasCercana = (v: THREE.Vector3): "x" | "y" | "z" =>
      (["x", "y", "z"] as const).reduce((mejor, k) =>
        Math.abs(v.dot(ejes[k])) > Math.abs(v.dot(ejes[mejor])) ? k : mejor,
      );
    /** Cualquier vector unitario perpendicular a `n`. */
    const perpDe = (n: THREE.Vector3): THREE.Vector3 => {
      const t = Math.abs(n.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
      return new THREE.Vector3().crossVectors(n, t).normalize();
    };

    /** Cuánto hubo que arrimar la segunda pieza para formar la articulación. */
    let arrimo = 0;
    // (Se inicializan en vacío porque las dos ramas de abajo las rellenan, y
    // en la de las caras lo hace un cierre que el compilador no sigue.)
    let ejeMundo = new THREE.Vector3(0, 1, 0);
    let charnela = new THREE.Vector3();
    let dirA = new THREE.Vector3(1, 0, 0);
    let dirB = new THREE.Vector3(-1, 0, 0);
    // Cada pala tiene SU cara de montaje: en una esquina no son la misma.
    let normalA = new THREE.Vector3(0, 1, 0);
    let normalB = new THREE.Vector3(0, 1, 0);

    if (montaje) {
      // ── MONTAJE POR CARAS (v0.3.8) ────────────────────────────────────────
      //
      // La herramienta ya no se conforma con dos piezas: pide un PUNTO sobre
      // una cara de cada una, como la instalación de roldanas externas. Con
      // eso queda dicho todo lo que antes había que adivinar o teclear en el
      // panel — sobre qué cara se pega cada placa y en qué sitio—, y el eje
      // del pivote se deduce solo: es la arista donde se encuentran los dos
      // planos de las palas. El pasador queda pegado a las dos placas, como el
      // lomo de un libro.
      normalA = montaje.a.normal.clone().normalize();
      normalB = montaje.b.normal.clone().normalize();
      // Plano medio de cada pala: paralelo a su cara, medio espesor por fuera.
      const qA = montaje.a.punto.clone().addScaledVector(normalA, medio);
      const qB = montaje.b.punto.clone().addScaledVector(normalB, medio);
      const enEsquina = new THREE.Vector3().crossVectors(normalA, normalB).length() > 0.15;
      /** Canto de la pieza B más próximo a la charnela, medido sobre `d`. */
      const cantoDeB = (d: THREE.Vector3): number =>
        -this.soporteEnDireccion(b, d.clone().negate());

      if (enEsquina) {
        // ESQUINA (una tapa sobre el canto de una caja): las dos caras se
        // cortan y la charnela ES esa arista. Se toma el punto de la arista
        // más cercano al medio de los dos clics, que es donde el usuario dijo
        // que va la bisagra a lo largo de ella. Arrimar la pieza B no la
        // mueve: el deslizamiento va DENTRO del plano de su propia pala.
        ejeMundo = new THREE.Vector3().crossVectors(normalA, normalB).normalize();
        const m = qA.clone().add(qB).multiplyScalar(0.5);
        const c = normalA.dot(normalB);
        const u = qA.clone().sub(m).dot(normalA);
        const v = qB.clone().sub(m).dot(normalB);
        const den = 1 - c * c;
        charnela = m
          .addScaledVector(normalA, (u - c * v) / den)
          .addScaledVector(normalB, (v - c * u) / den);
        // Cada pala sale de la charnela HACIA su punto: así la placa tapa el
        // sitio que se marcó, que es lo que se ve al instalarla.
        const hacia = (q: THREE.Vector3, n: THREE.Vector3, centro: THREE.Vector3) => {
          const d = q.clone().sub(charnela);
          d.addScaledVector(ejeMundo, -d.dot(ejeMundo));
          d.addScaledVector(n, -d.dot(n));
          if (d.lengthSq() > 1e-4) return d.normalize();
          // Clic justo sobre la arista: la pala sale hacia el lado de su pieza.
          const alt = new THREE.Vector3().crossVectors(ejeMundo, n).normalize();
          return alt.dot(centro.clone().sub(charnela)) >= 0 ? alt : alt.negate();
        };
        dirA = hacia(qA, normalA, ca);
        dirB = hacia(qB, normalB, cb);
        if (cfg.juntar !== false) {
          const paso = charnela.dot(dirB) + separacion - cantoDeB(dirB);
          if (Math.abs(paso) > 1e-4) {
            arrimo = Math.abs(paso);
            b.mesh.position.addScaledVector(dirB, paso);
            b.mesh.updateMatrixWorld(true);
            cb.addScaledVector(dirB, paso);
            this.bus.emit("objectTransformed", { object: b });
          }
        }
      } else {
        // CARAS PARALELAS (dos tablas sobre la misma mesa): no hay arista que
        // cortar. La charnela corre perpendicular a la línea que une los dos
        // puntos, y con las piezas juntas se planta donde de verdad se tocan:
        // pegada al canto de la primera, que es el lomo del libro. Ponerla en
        // el medio de los dos clics sin más metía la segunda pieza DENTRO de
        // la primera cuando el clic caía lejos del canto.
        const haciaB = qB.clone().sub(qA);
        haciaB.addScaledVector(normalA, -haciaB.dot(normalA));
        if (haciaB.lengthSq() < 1e-8) haciaB.copy(perpDe(normalA));
        haciaB.normalize();
        ejeMundo = new THREE.Vector3().crossVectors(normalA, haciaB).normalize();
        const m = qA.clone().add(qB).multiplyScalar(0.5);
        const sLomo =
          cfg.juntar !== false
            ? this.soporteEnDireccion(a, haciaB) + separacion
            : m.dot(haciaB);
        charnela = new THREE.Vector3()
          .addScaledVector(ejeMundo, m.dot(ejeMundo))
          .addScaledVector(normalA, qA.dot(normalA))
          .addScaledVector(haciaB, sLomo);
        dirA = haciaB.clone().negate();
        dirB = haciaB.clone();
        if (cfg.juntar !== false) {
          // Enrasar las dos caras y arrimar el canto hasta la holgura.
          const t = new THREE.Vector3()
            .addScaledVector(normalA, qA.dot(normalA) - qB.dot(normalA))
            .addScaledVector(haciaB, sLomo + separacion - cantoDeB(haciaB));
          if (t.lengthSq() > 1e-8) {
            arrimo = t.length();
            b.mesh.position.add(t);
            b.mesh.updateMatrixWorld(true);
            cb.add(t);
            this.bus.emit("objectTransformed", { object: b });
          }
        }
      }
    } else {
      // ── SIN PUNTOS: la deducción de siempre ───────────────────────────────
      // Sigue viva para las llamadas por programa (prefabs, pruebas) y para
      // cualquier bisagra hecha antes de que la herramienta pidiera caras.
      //
      // Punto de la charnela: entre las dos piezas, en su zona de contacto
      // (punto de cada caja más cercano al centro de la otra).
      const pa = a.worldBoxBody(new THREE.Box3()).clampPoint(cb, new THREE.Vector3());
      const pb = b.worldBoxBody(new THREE.Box3()).clampPoint(ca, new THREE.Vector3());
      const pivote = pa.clone().add(pb).multiplyScalar(0.5);

      const entrePiezas = cb.clone().sub(ca);
      if (entrePiezas.lengthSq() < 1e-6) entrePiezas.set(0, 1, 0);
      entrePiezas.normalize();
      const caraPedida =
        cfg.cara && cfg.cara !== "auto" ? DIRECCIONES_ROLDANA[cfg.cara].clone() : null;
      let letraAuto: "x" | "y" | "z";
      if (cfg.eje !== "auto") {
        letraAuto = cfg.eje;
      } else if (caraPedida) {
        // Con una cara elegida el eje queda determinado: la charnela corre
        // perpendicular tanto a la cara como a la línea entre las piezas.
        const ideal = new THREE.Vector3().crossVectors(caraPedida, entrePiezas);
        letraAuto =
          ideal.length() > 0.3
            ? letraMasCercana(ideal.normalize())
            : (["x", "y", "z"] as const).reduce((mejor, k) =>
                Math.abs(entrePiezas.dot(ejes[k])) < Math.abs(entrePiezas.dot(ejes[mejor]))
                  ? k
                  : mejor,
              );
      } else {
        // Sin pistas: el eje global MÁS PERPENDICULAR a la línea que une las
        // piezas (la charnela natural entre ellas).
        letraAuto = (["x", "y", "z"] as const).reduce((mejor, k) =>
          Math.abs(entrePiezas.dot(ejes[k])) < Math.abs(entrePiezas.dot(ejes[mejor])) ? k : mejor,
        );
      }
      ejeMundo = ejes[letraAuto].clone();

      // Direcciones de cada pala: del pasador hacia su pieza, ⊥ al eje.
      const perp = (v: THREE.Vector3): THREE.Vector3 => {
        const p = v.clone().addScaledVector(ejeMundo, -v.dot(ejeMundo));
        return p.lengthSq() < 1e-6 ? new THREE.Vector3() : p.normalize();
      };
      dirA = perp(ca.clone().sub(pivote));
      dirB = perp(cb.clone().sub(pivote));
      if (dirA.lengthSq() < 0.5 && dirB.lengthSq() >= 0.5) dirA = dirB.clone().negate();
      if (dirB.lengthSq() < 0.5 && dirA.lengthSq() >= 0.5) dirB = dirA.clone().negate();
      if (dirA.lengthSq() < 0.5) {
        // Piezas concéntricas: se toma cualquier perpendicular al eje.
        dirA = perp(new THREE.Vector3(0, 1, 0));
        if (dirA.lengthSq() < 0.5) dirA = perp(new THREE.Vector3(1, 0, 0));
        dirB = dirA.clone().negate();
      }
      // Palas enfrentadas: si ambas miran al mismo lado, la segunda se opone.
      if (dirA.dot(dirB) > 0.9) dirB = dirA.clone().negate();

      // CARA DE MONTAJE: una bisagra real se atornilla SOBRE la superficie de
      // las dos piezas, no dentro de ellas. Solo hay DOS caras posibles —las
      // perpendiculares al eje y a las palas— y elegir una u otra es lo que
      // decide hacia dónde pliega. Por omisión, la que mira hacia arriba.
      const normal = new THREE.Vector3().crossVectors(ejeMundo, dirA).normalize();
      if (caraPedida) {
        const proy = caraPedida.clone().addScaledVector(ejeMundo, -caraPedida.dot(ejeMundo));
        const comp = proy.dot(normal);
        if (proy.length() < 0.3 || Math.abs(comp) < 0.35 * proy.length()) {
          this.avisoTemporal(
            tt(
              "⚠ Esa cara no es perpendicular al eje de la bisagra: se monta en la cara más cercana.",
              "⚠ That face is not perpendicular to the hinge axis: it mounts on the nearest one.",
            ),
          );
          if (normal.dot(new THREE.Vector3(0.2, 1, 0.35)) < 0) normal.negate();
        } else if (comp < 0) {
          normal.negate();
        }
      } else if (normal.dot(new THREE.Vector3(0.2, 1, 0.35)) < 0) {
        normal.negate();
      }
      normalA = normal;
      normalB = normal.clone();
      // El herraje se sube justo hasta despejar el volumen REAL de ambas piezas
      // (caja orientada, no AABB: una viga girada no infla su envolvente).
      const sobresale = (o: SceneObject): number =>
        this.soporteEnDireccion(o, normal) - pivote.dot(normal);
      charnela = pivote
        .clone()
        .addScaledVector(normal, Math.max(sobresale(a), sobresale(b)) + medio + 0.1);
    }
    const letra = letraMasCercana(ejeMundo);

    const piezas: string[] = [];
    const placa = (dir: THREE.Vector3, cara: THREE.Vector3, nombre: string): SceneObject => {
      const p = this.addComponent("placa-bisagra");
      p.name = nombre;
      p.mesh.name = nombre;
      p.params = { kind: "box", width: largo, height: grosor, depth: ancho };
      p.rebuildGeometry();
      // Base: X a lo largo de la pala, Y = espesor (⊥ a la cara de montaje),
      // Z sobre el eje del pasador. Cada pala lleva SU cara: en una esquina no
      // son la misma, y forzarlas a una sola dejaba una placa en el aire.
      const z = new THREE.Vector3().crossVectors(dir, cara).normalize();
      p.mesh.quaternion.setFromRotationMatrix(
        new THREE.Matrix4().makeBasis(dir, cara, z),
      );
      p.mesh.position.copy(charnela).addScaledVector(dir, largo / 2 + separacion);
      this.bus.emit("objectTransformed", { object: p });
      piezas.push(p.id);
      return p;
    };
    const placaA = placa(dirA, normalA, tt("Placa de bisagra A", "Hinge leaf A"));
    const placaB = placa(dirB, normalB, tt("Placa de bisagra B", "Hinge leaf B"));

    // PASADOR: cilindro sobre el eje, entre las dos palas.
    const pasador = this.addComponent("pasador-bisagra");
    pasador.name = tt("Pasador de bisagra", "Hinge pin");
    pasador.mesh.name = pasador.name;
    pasador.params = {
      kind: "cylinder",
      radiusTop: radioPasador,
      radiusBottom: radioPasador,
      height: ancho + grosor * 2,
    };
    pasador.rebuildGeometry();
    pasador.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), ejeMundo);
    pasador.mesh.position.copy(charnela);
    this.bus.emit("objectTransformed", { object: pasador });
    piezas.push(pasador.id);

    // SOLDADURAS (uniones bloqueadas): cada pala con su pieza y el pasador con
    // la pala A. La física las funde en un solo cuerpo con su anfitrión.
    const soldar = (x: SceneObject, y: SceneObject, punto: THREE.Vector3): void => {
      const j = this.connect(x.id, y.id, "revolute", punto.clone());
      if (!j) return;
      j.locked = true;
      j.name = tt("Soldadura de bisagra", "Hinge weld");
    };
    soldar(a, placaA, placaA.mesh.position);
    soldar(b, placaB, placaB.mesh.position);
    soldar(placaA, pasador, charnela);

    // ARTICULACIÓN: la única unión libre, entre las dos palas, sobre el eje
    // del pasador.
    const bisagra = this.connect(placaA.id, placaB.id, "revolute", charnela.clone());
    if (bisagra) {
      bisagra.axis = letra;
      // Con las caras elegidas a mano, la charnela puede quedar en cualquier
      // dirección —una tapa sobre un canto en diagonal—, así que el eje va
      // EXACTO y no redondeado al eje global más parecido.
      bisagra.axisVec = montaje ? ejeMundo.clone() : null;
      bisagra.name = tt("Bisagra", "Hinge");
      if (cfg.limite) {
        bisagra.limitsEnabled = true;
        bisagra.min = cfg.limite[0];
        bisagra.max = cfg.limite[1];
      }
      // COLISIÓN REAL ENTRE LAS DOS PIEZAS (v0.2.33): una bisagra montada
      // sobre una cara solo puede plegar hacia el lado donde el material no
      // estorba — hacia el otro, las piezas topan. El motor apaga por defecto
      // los contactos entre los cuerpos que une una articulación (en un
      // pivote clásico se solapan a propósito), así que aquí se piden
      // EXPRESAMENTE. Si las dos piezas ya están interpenetradas en la pose
      // de diseño, se dejan apagados: encenderlos las expulsaría al arrancar.
      if (this.piezasSeparadas(a, b)) {
        bisagra.contactos = true;
      } else {
        this.avisoTemporal(
          tt(
            "⚠ Las dos piezas se superponen: la bisagra no podrá frenar contra el material.",
            "⚠ Both parts overlap: the hinge will not be able to stop against the material.",
          ),
        );
      }
    }

    const gid = this.createGroupFromIds(piezas);
    if (gid) this.renameGroup(gid, tt("Bisagra", "Hinge"));
    this.select(null);
    this.jointUpdated();
    this.requestRender();
    const nombreCara = (
      Object.entries(DIRECCIONES_ROLDANA) as [DireccionRoldana, THREE.Vector3][]
    ).reduce((mejor, [k, v]) => (normalA.dot(v) > normalA.dot(DIRECCIONES_ROLDANA[mejor]) ? k : mejor),
      "arriba" as DireccionRoldana);
    const caraES: Record<DireccionRoldana, string> = {
      arriba: "arriba",
      abajo: "abajo",
      derecha: "derecha",
      izquierda: "izquierda",
      anterior: "anterior",
      posterior: "posterior",
    };
    const caraEN: Record<DireccionRoldana, string> = {
      arriba: "top",
      abajo: "bottom",
      derecha: "right",
      izquierda: "left",
      anterior: "front",
      posterior: "back",
    };
    const arrimoES = arrimo > 0.05 ? `; ${b.name} se arrimó ${arrimo.toFixed(1)} cm` : "";
    const arrimoEN = arrimo > 0.05 ? `; ${b.name} moved in ${arrimo.toFixed(1)} cm` : "";
    this.avisoTemporal(
      tt(
        `✓ Bisagra instalada entre ${a.name} y ${b.name} (eje ${letra.toUpperCase()}, cara ${caraES[nombreCara]}${arrimoES})`,
        `✓ Hinge installed between ${a.name} and ${b.name} (axis ${letra.toUpperCase()}, ${caraEN[nombreCara]} face${arrimoEN})`,
      ),
    );
    return bisagra;
  }

  /** Reconstruye los marcadores 3D de las articulaciones. */
  refreshJointHelpers(): void {
    for (const child of [...this.jointHelpers.children]) {
      this.jointHelpers.remove(child);
      (child as THREE.Mesh).geometry?.dispose?.();
      ((child as THREE.Mesh).material as THREE.Material | undefined)?.dispose?.();
    }
    for (const joint of this.joints.values()) {
      // Una unión BLOQUEADA es una soldadura, no una articulación: se marca
      // pequeña y gris para que no tape el herraje (una bisagra real trae
      // tres soldaduras justo en la charnela).
      const soldadura = joint.locked;
      // La BISAGRA REAL ya tiene su pasador a la vista: su marcador se reduce
      // para no taparlo (el herraje es la señal, no el globo).
      const conHerraje =
        this.objects.get(joint.bodyAId)?.componentId === "placa-bisagra" &&
        this.objects.get(joint.bodyBId)?.componentId === "placa-bisagra";
      const menor = soldadura || conHerraje;
      const color = soldadura ? 0x94a3b8 : joint.kind === "revolute" ? 0x22d3ee : 0xf59e0b;
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(menor ? 1 : 3, menor ? 8 : 16, menor ? 6 : 12),
        new THREE.MeshBasicMaterial({ color, depthTest: false }),
      );
      sphere.position.copy(joint.anchor);
      sphere.renderOrder = 999;

      const dir = joint.ejeVector().multiplyScalar(soldadura ? 6 : conHerraje ? 12 : 30);
      const pts = [
        joint.anchor.clone().sub(dir),
        joint.anchor.clone().add(dir),
      ];
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color, depthTest: false }),
      );
      line.renderOrder = 999;

      this.jointHelpers.add(sphere, line);
    }
  }

  // --------------------------------------------------------------- cables
  listCables(): Cable[] {
    return [...this.cables.values()];
  }

  getCableById(id: string): Cable | undefined {
    return this.cables.get(id);
  }

  /** ¿Es la pieza una roldana/polea (única superficie válida de deslizamiento)? */
  private isPulley(obj: SceneObject): boolean {
    return PULLEY_IDS.has(obj.componentId);
  }

  /**
   * Entra en modo "trazar cable": se colocan DOS puntos de anclaje (línea recta).
   * Entre ellos pueden insertarse roldanas/poleas como puntos de reenvío: clic en
   * una roldana la añade y continúa; clic en cualquier otra pieza cierra el cable.
   */
  beginCable(): void {
    if (this.simulating) return;
    this.cancelConnect();
    this.cancelFrenoCable();
    this.cancelRope();
    this.cableMode = true;
    this.cablePending = [];
    this.select(null);
    // Aim assist (v0.2.3): las roldanas se RESALTAN para reconocerlas como
    // puntos de recorrido mientras se traza el cable.
    for (const o of this.objects.values()) if (this.isPulley(o)) this.setHighlight(o, true);
    this.emitCableMode();
  }

  // ------------------------------------------------- FRENO (TOPE) DE CABLE
  /**
   * Herramienta de FRENO DE CABLE (v0.2.40): un clic sobre el trazado de un
   * cable engarza en ese punto una ESFERA de tope. La esfera viaja con el
   * cable mientras se tira de él, pero no pasa por una roldana: al llegar a
   * ella se interpone y ese lado del cable deja de retraerse. Es el freno de
   * goma de las máquinas reales, el que mantiene la tensión en el momento
   * cero para que el esfuerzo sea parejo en todo el recorrido.
   *
   * Clic sobre un freno ya puesto lo retira.
   */
  beginFrenoCable(): void {
    if (this.simulating) return;
    this.cancelConnect();
    this.cancelRope();
    this.cancelCable();
    this.select(null);
    this.frenoMode = true;
    this.bus.emit("frenoModeChanged", { active: true });
  }

  cancelFrenoCable(): void {
    if (!this.frenoMode) return;
    this.frenoMode = false;
    this.bus.emit("frenoModeChanged", { active: false });
  }

  isFrenoMode(): boolean {
    return this.frenoMode;
  }

  /**
   * Coloca (o retira) un freno donde apunte el puntero. Devuelve true si tocó
   * algún cable. El radio por omisión —2,2 cm— es el de una esfera de tope
   * corriente, más gruesa que la garganta de cualquier roldana.
   */
  private frenoEnPuntero(): boolean {
    const lineas = this.cableVisuals.children.filter(
      (c): c is THREE.Line => (c as THREE.Line).isLine === true,
    );
    if (lineas.length === 0) return false;
    const antes = this.raycaster.params.Line?.threshold ?? 1;
    this.raycaster.params.Line = { threshold: 4 };
    const hits = this.raycaster.intersectObjects(lineas, false);
    this.raycaster.params.Line = { threshold: antes };
    const hit = hits[0];
    if (!hit) return false;
    const cable = this.cables.get(hit.object.userData.cableId as string);
    if (!cable) return false;
    const pts = this.puntosDeCable(cable);
    if (pts.length < 2) return false;

    // ¿Se pulsó sobre un freno ya puesto? Entonces se retira.
    for (let k = 0; k < cable.topes.length; k++) {
      const t = cable.topes[k];
      const p = this.puntoEnArco(pts, t.arco ?? this.arcoDeTope(pts, t));
      if (p.distanceTo(hit.point) < t.radio + 2.5) {
        cable.topes.splice(k, 1);
        this.cablesDirty = true;
        this.bus.emit("cablesChanged", { cables: this.listCables() });
        this.historyPush();
        this.scheduleAutosave();
        this.avisoTemporal(tt("Freno retirado", "Stop removed"));
        return true;
      }
    }

    const seg = Math.max(0, Math.min(pts.length - 2, hit.index ?? 0));
    const dist = Math.max(0, hit.point.distanceTo(pts[seg]));
    const tope: TopeCable = { seg, dist, radio: 2.2 };
    tope.arco = this.arcoDeTope(pts, tope);
    cable.topes.push(tope);
    this.cablesDirty = true;
    this.bus.emit("cablesChanged", { cables: this.listCables() });
    this.historyPush();
    this.scheduleAutosave();
    this.avisoTemporal(tt("⏺ Freno de cable colocado", "⏺ Cable stop placed"));
    return true;
  }

  /** Puntos de mundo (cm) del recorrido actual de un cable. */
  private puntosDeCable(cable: Cable): THREE.Vector3[] {
    const pts: THREE.Vector3[] = [];
    for (const node of cable.nodes) {
      const obj = this.objects.get(node.objectId);
      if (!obj) continue;
      obj.mesh.updateMatrixWorld();
      pts.push(
        new THREE.Vector3(node.local.x, node.local.y, node.local.z).applyMatrix4(obj.mesh.matrixWorld),
      );
    }
    return pts;
  }

  /** Distancia (cm) desde el nodo 0 hasta el freno, a lo largo del cable. */
  private arcoDeTope(pts: THREE.Vector3[], t: TopeCable): number {
    let acc = 0;
    for (let i = 0; i < Math.min(t.seg, pts.length - 1); i++) acc += pts[i].distanceTo(pts[i + 1]);
    return acc + t.dist;
  }

  /** Punto a `arco` cm del nodo 0 sobre la polilínea del cable. */
  private puntoEnArco(pts: THREE.Vector3[], arco: number): THREE.Vector3 {
    let acc = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const L = pts[i].distanceTo(pts[i + 1]);
      if (acc + L >= arco || i === pts.length - 2) {
        const t = L > 1e-6 ? Math.min(1, Math.max(0, (arco - acc) / L)) : 0;
        return pts[i].clone().lerp(pts[i + 1], t);
      }
      acc += L;
    }
    return pts[pts.length - 1].clone();
  }

  /**
   * Dibuja las esferas de freno sobre el trazado. En DISEÑO su posición se
   * recalcula desde el segmento donde se colocaron; durante la SIMULACIÓN se
   * conserva su distancia a lo largo del cable, que es lo que hace que la
   * esfera se deslice con él en vez de quedarse clavada en el aire.
   */
  private actualizarFrenos(cable: Cable, pts: THREE.Vector3[], vivos: Set<string>): void {
    for (let k = 0; k < cable.topes.length; k++) {
      const t = cable.topes[k];
      if (!this.simulating || t.arco === undefined) t.arco = this.arcoDeTope(pts, t);
      const clave = `${cable.id}#${k}`;
      vivos.add(clave);
      let m = this.frenoVisuals.get(clave);
      if (!m) {
        m = new THREE.Mesh(
          new THREE.SphereGeometry(1, 18, 12),
          new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.55, metalness: 0.1 }),
        );
        m.userData.frenoDe = cable.id;
        this.cableVisuals.add(m);
        this.frenoVisuals.set(clave, m);
      }
      m.scale.setScalar(t.radio);
      m.position.copy(this.puntoEnArco(pts, t.arco));
    }
  }

  /** Emite el estado del modo cable con una pista de la siguiente acción. */
  private emitCableMode(): void {
    const count = this.cablePending.length;
    let hint: string;
    if (count === 0) {
      hint = "Cable: clic en el 1.er punto de anclaje (se ajusta al punto de conexión más cercano).";
    } else if (count === 1) {
      hint =
        "Clic en el 2.º anclaje (línea recta). Para reenviar, clic antes en una roldana/polea.";
    } else {
      hint = `Cable con ${count} nodos. Clic en la pieza final para cerrar, o en otra roldana. Enter para finalizar.`;
    }
    this.bus.emit("cableModeChanged", { active: true, count, hint });
  }

  cancelCable(): void {
    if (!this.cableMode) return;
    this.cableMode = false;
    this.cablePending = [];
    this.clearPlacementPreview();
    // Apaga el resaltado de roldanas del aim assist.
    for (const o of this.objects.values()) {
      if (this.isPulley(o) && this.selected !== o && !this.multiSel.has(o.id)) {
        this.setHighlight(o, false);
      }
    }
    this.bus.emit("cableModeChanged", { active: false, count: 0 });
  }

  /** Cierra el cable en construccion (>=2 nodos). */
  finishCable(): void {
    if (!this.cableMode) return;
    if (this.cablePending.length >= 2) {
      this.createCable(
        this.cablePending.map((p) => ({
          objectId: p.object.id,
          local: { x: p.local.x, y: p.local.y, z: p.local.z },
        })),
      );
    }
    this.cancelCable();
  }

  /** Crea un cable a partir de una lista ordenada de nodos (pieza + anclaje). */
  createCable(nodes: CableNode[]): Cable | null {
    if (nodes.length < 2) return null;
    const cable = new Cable({ nodes });
    // Esquema Cables III: cada roldana intermedia ancla en el punto de
    // CONTACTO tangente real de su groove (radio a 90° del cable).
    this.refinarContactosCable(cable);
    this.cables.set(cable.id, cable);
    this.bus.emit("cablesChanged", { cables: this.listCables() });
    return cable;
  }

  removeCable(cable: Cable): void {
    this.cables.delete(cable.id);
    this.bus.emit("cablesChanged", { cables: this.listCables() });
  }

  /**
   * Anima las pilas de pesos: el carriage (tubo + placas seleccionadas) sube con
   * el cuerpo mientras las placas no seleccionadas y las varillas se
   * contra-mueven para quedarse quietas. El cuerpo solo sube (>=0).
   *
   * LA REFERENCIA ES EL SITIO DE DISEÑO, y de ahí venía «la pila de pesos
   * asciende completa». La contra-traslación se medía sólo `if (simulating)`
   * contra `saved`, y al salir de posar la máquina —donde el cuerpo de la pila
   * queda LEVANTADO, que es de lo que trata la partida— `saved` se vacía y
   * `simulating` se apaga: delta 0, ninguna placa se contra-mueve y las quince
   * subían pegadas al selector. La ilusión no es de la simulación, es de que la
   * pila esté fuera de su sitio, y eso pasa también parado.
   */
  private updateStackAnimation(): void {
    for (const obj of this.objects.values()) {
      if (!obj.stack) continue;
      const parts = obj.getStackParts();
      if (parts.length === 0) continue;
      const reposo = this.reposoDeDiseno(obj.id);
      const delta = reposo ? Math.max(0, obj.mesh.position.y - reposo.y) : 0;
      for (const p of parts) {
        p.mesh.position.y = p.carriage ? p.restY : p.restY - delta;
      }
    }
  }

  /**
   * DÓNDE ESTARÍA ESTA PIEZA EN EL PLANO, sea cual sea el estado. Simulando lo
   * dice `saved`; parado con la partida a la vista, `disenoDePartida`; y parado
   * sin partida, la malla YA está en el plano y no hay desvío que medir.
   */
  private reposoDeDiseno(id: string): THREE.Vector3 | null {
    if (this.simulating) return this.saved.get(id)?.position ?? null;
    if (this.partidaPintada) return this.disenoDePartida?.get(id)?.p ?? null;
    return null;
  }

  /** Como `reposoDeDiseno`, pero el sitio entero y con la malla como respaldo. */
  private sitioDeDiseno(id: string): { p: THREE.Vector3; q: THREE.Quaternion } | null {
    const o = this.objects.get(id);
    if (!o) return null;
    if (this.simulating) {
      const s = this.saved.get(id);
      return s ? { p: s.position.clone(), q: s.quaternion.clone() } : null;
    }
    if (this.partidaPintada) {
      const d = this.disenoDePartida?.get(id);
      if (d) return { p: d.p.clone(), q: d.q.clone() };
    }
    return { p: o.mesh.position.clone(), q: o.mesh.quaternion.clone() };
  }

  /**
   * LA ÚNICA PUERTA PARA PONER UNA PARTIDA, y existe porque había tres que no
   * la ponían entera. Una partida sin su plano (`disenoDePartida`) es una bomba:
   * `conElDiseno` no tiene adónde volver, así que arrancar la simulación guarda
   * la CONDICIÓN DE ENSAYO como si fuera el plano y al parar lo restaura encima
   * del de verdad, que se pierde; quitar el maniquí no repone nada y la máquina
   * se queda clavada en su pose ergonómica; y guardar el proyecto escribe la
   * pose en vez del fabricable.
   *
   * Pasaba al ABRIR un proyecto con partida, al APLICAR un punto guardado y al
   * FIJAR la partida con el gesto parado —ahí `saved` está vacío—. Ahora el
   * plano se saca siempre de `sitioDeDiseno`, que sabe leerlo en cualquiera de
   * los tres estados.
   */
  private ponerPartida(poses: Map<string, { p: THREE.Vector3; q: THREE.Quaternion }> | null): void {
    this.reconciliarEdiciones();
    // LAS MALLAS VUELVEN AL PLANO ANTES DE CAMBIAR DE PARTIDA. Lo que hubiera
    // pintado es de la ANTERIOR: dejarlo mezclaría dos condiciones de ensayo
    // —las piezas de la vieja que no estén en la nueva se quedarían en su pose—
    // y, peor, la reconciliación tomaría esa diferencia por una edición del
    // usuario y se la sumaría al plano nuevo.
    if (!this.simulating && this.partidaPintada) this.reponerElDiseno();
    this.partidaPintada = false;
    const diseno = new Map<string, { p: THREE.Vector3; q: THREE.Quaternion }>();
    if (poses) {
      for (const id of poses.keys()) {
        const sitio = this.sitioDeDiseno(id);
        if (sitio) diseno.set(id, sitio);
      }
    }
    this.partidaPiezas = poses?.size ? poses : null;
    this.disenoDePartida = diseno.size ? diseno : null;
    this.sincronizarPartidaVisible();
  }

  /** Reconstruye las polilineas de los cables segun la posicion de sus nodos. */
  private updateCableVisuals(): void {
    // Anade/quita lineas para que coincidan con los cables actuales.
    const frenosVivos = new Set<string>();
    const wanted = new Set(this.cables.keys());
    for (const child of [...this.cableVisuals.children]) {
      if (!(child as THREE.Line).isLine) continue; // las esferas de freno se podan aparte
      if (!wanted.has(child.userData.cableId as string)) {
        this.cableVisuals.remove(child);
        ((child as THREE.Line).geometry as THREE.BufferGeometry).dispose();
        ((child as THREE.Line).material as THREE.Material).dispose();
      }
    }
    const existing = new Map<string, THREE.Line>();
    for (const child of this.cableVisuals.children) {
      if ((child as THREE.Line).isLine) existing.set(child.userData.cableId as string, child as THREE.Line);
    }

    for (const cable of this.cables.values()) {
      // El contacto del groove SIGUE a las piezas: al mover un extremo o la
      // propia roldana, la tangencia se recalcula (fuera de simulación, donde
      // los anclajes del solver ya quedaron fijados al construir el mundo).
      if (!this.simulating) this.refinarContactosCable(cable);
      const pts: THREE.Vector3[] = [];
      for (const node of cable.nodes) {
        const obj = this.objects.get(node.objectId);
        if (obj) {
          obj.mesh.updateMatrixWorld();
          pts.push(
            new THREE.Vector3(node.local.x, node.local.y, node.local.z).applyMatrix4(
              obj.mesh.matrixWorld,
            ),
          );
        }
      }
      if (pts.length < 2) continue;
      let line = existing.get(cable.id);
      if (!line) {
        // AZUL OSCURO: el cable destaca contra el fondo claro del visor y
        // se distingue de las piezas, vértices y nodos.
        line = new THREE.Line(
          new THREE.BufferGeometry(),
          new THREE.LineBasicMaterial({ color: 0x1e3a8a }),
        );
        line.userData.cableId = cable.id;
        this.cableVisuals.add(line);
      }
      // SE REESCRIBE EL BÚFER, no se cambia por otro. `setFromPoints` fabrica
      // un atributo NUEVO en cada llamada, y three.js no borra el búfer de GPU
      // del que sustituye: durante la simulación esto corre en cada fotograma,
      // así que la memoria de vídeo crecía sin parar hasta arrastrar la pestaña
      // o perder el contexto WebGL. Parar la simulación no recuperaba nada.
      // Mientras el número de nodos no cambie, se escribe encima; y cuando
      // cambia, se suelta el búfer viejo antes de pedir otro.
      const attr = line.geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
      if (attr && attr.count === pts.length) {
        for (let i = 0; i < pts.length; i++) attr.setXYZ(i, pts[i].x, pts[i].y, pts[i].z);
        attr.needsUpdate = true;
        line.geometry.computeBoundingSphere();
      } else {
        line.geometry.dispose();
        line.geometry.setFromPoints(pts);
      }
      this.actualizarFrenos(cable, pts, frenosVivos);
      // Validación del diagrama Cables/Poleas: rojo si el trazado atraviesa
      // material sólido o entra desalineado al plano de una roldana. Es una
      // herramienta de DISEÑO: durante la simulación la geometría cambia a
      // cada paso y el cable se mantiene azul (el motor ya gobierna la
      // tensión real).
      const valido = this.simulating || this.validarCable(cable, pts);
      (line.material as THREE.LineBasicMaterial).color.setHex(valido ? 0x1e3a8a : 0xef4444);
      const invalidoAntes = this.cablesInvalidos.has(cable.id);
      if (!valido && !invalidoAntes) {
        this.cablesInvalidos.add(cable.id);
        this.avisoTemporal(
          tt(
            "⛔ Cable en error: atraviesa material o entra torcido a una roldana",
            "⛔ Cable error: it crosses solid material or meets a sheave misaligned",
          ),
        );
      } else if (valido && invalidoAntes) {
        this.cablesInvalidos.delete(cable.id);
      }
    }
    // Esferas de freno que ya no existen (cable borrado o freno retirado).
    for (const [clave, m] of [...this.frenoVisuals]) {
      if (frenosVivos.has(clave)) continue;
      this.cableVisuals.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
      this.frenoVisuals.delete(clave);
    }
  }

  /** Cables actualmente en error (rojos), para no repetir el aviso. */
  private cablesInvalidos = new Set<string>();

  /**
   * Estructuras que ALOJAN una roldana INTERNA de este cable (v0.2.28): son
   * las vigas/perfiles con las dos aperturas del conjunto, por donde el
   * cable entra y sale legítimamente. Se reconocen porque el grupo de la
   * roldana trae piezas "apertura-cable" y la caja de la estructura
   * contiene el centro de la rueda.
   */
  /**
   * ESTRUCTURAS QUE ALOJAN cada roldana del recorrido (v0.2.35): por cada
   * roldana del cable, las piezas cuyo volumen CONTIENE el centro de la
   * rueda — es decir, aquellas de las que la roldana es INTERNA.
   *
   * La detección es geométrica a propósito: vale para las roldanas que
   * empotró la herramienta (conjunto con eje pasante y aperturas) y también
   * para las que se colocaron a mano dentro de una viga en modelos
   * anteriores a ella. Una roldana EXTERNA queda fuera del volumen de su
   * estructura —la separa su montaje—, así que nunca aparece aquí.
   */
  private contenedoresDeRoldanas(cable: Cable): Map<string, Set<string>> {
    const dentro = new Map<string, Set<string>>();
    const caja = new THREE.Box3();
    for (const n of cable.nodes) {
      const rold = this.objects.get(n.objectId);
      if (!rold || !this.isPulley(rold) || dentro.has(rold.id)) continue;
      const hosts = new Set<string>();
      for (const cand of this.objects.values()) {
        // Ni la propia rueda, ni otras roldanas, ni los herrajes del reenvío
        // cuentan como estructura anfitriona. No se mira el GRUPO: una
        // máquina insertada agrupa todas sus piezas de golpe, y entonces la
        // viga que aloja la roldana quedaría excluida por ser "del grupo".
        if (cand.id === rold.id || this.isPulley(cand)) continue;
        if (
          cand.componentId === "soporte-roldana" ||
          cand.componentId === "eje-roldana" ||
          cand.componentId === "apertura-cable" ||
          cand.componentId === "terminal-cable"
        ) {
          continue;
        }
        caja.setFromObject(cand.mesh).expandByScalar(1);
        if (caja.containsPoint(rold.mesh.position)) hosts.add(cand.id);
      }
      if (hosts.size > 0) dentro.set(rold.id, hosts);
    }
    return dentro;
  }

  private anfitrionesDeRoldanasInternas(cable: Cable): Set<string> {
    const permeables = new Set<string>();
    const caja = new THREE.Box3();
    for (const n of cable.nodes) {
      const rold = this.objects.get(n.objectId);
      if (!rold || !this.isPulley(rold)) continue;
      const gid = this.objGroup.get(rold.id);
      const grupo = gid ? this.groups.get(gid) : undefined;
      if (!grupo) continue;
      // Marca de roldana INTERNA: su eje pasante (v0.2.30) o, en proyectos
      // anteriores, las placas de apertura que se dibujaban en las caras.
      const esInterna = grupo.ids.some((id) => {
        const c = this.objects.get(id)?.componentId;
        return c === "eje-roldana" || c === "apertura-cable";
      });
      if (!esInterna) continue;
      const propias = new Set(grupo.ids);
      for (const cand of this.objects.values()) {
        if (propias.has(cand.id)) continue;
        caja.setFromObject(cand.mesh).expandByScalar(1);
        if (caja.containsPoint(rold.mesh.position)) permeables.add(cand.id);
      }
    }
    return permeables;
  }

  /**
   * Reglas del diagrama Cables/Poleas:
   *  (a) ningún tramo puede atravesar una pieza ajena — salvo la que aloja a
   *      AMBOS extremos del tramo (roldanas internas del mismo pilar: el
   *      cable corre por dentro, entre aperturas);
   *  (b) el cable debe entrar y salir en el plano de la rueda de cada
   *      roldana intermedia (±30° aprox.); torcido = error.
   */
  private validarCable(cable: Cable, pts: THREE.Vector3[]): boolean {
    const propios = new Set(cable.nodes.map((n) => n.objectId));
    const ray = new THREE.Raycaster();
    const caja = new THREE.Box3();
    // Estructuras PERMEABLES a este cable (v0.2.28): la viga que ALOJA una
    // roldana interna del recorrido tiene sus dos aperturas justo sobre y
    // bajo la rueda — el cable entra por una y sale por la otra, así que
    // cruzar su pared ahí es el funcionamiento correcto, no un error.
    const permeables = this.anfitrionesDeRoldanasInternas(cable);
    // TRAMOS OCULTOS (v0.2.35): cuando un tramo va de una roldana INTERNA a
    // otra roldana INTERNA DE LA MISMA estructura, el cable discurre por
    // DENTRO de la viga — que en el mundo real es hueca —, así que lo que
    // haya dentro de ese volumen no lo obstruye: ni la propia viga ni las
    // piezas que penetran en ella (el mástil que sostiene el bastidor, por
    // ejemplo). La regla es ESTRICTA: si las dos roldanas pertenecen a
    // estructuras distintas, o una es externa, el tramo cruza paredes de
    // verdad y se sigue validando como siempre.
    const contenedores = this.contenedoresDeRoldanas(cable);
    const cajaOculta = new THREE.Box3();
    for (let i = 0; i < pts.length - 1; i++) {
      const dir = pts[i + 1].clone().sub(pts[i]);
      const len = dir.length();
      if (len < 2) continue;
      const dentroA = contenedores.get(cable.nodes[i].objectId);
      const dentroB = contenedores.get(cable.nodes[i + 1].objectId);
      const comunes = dentroA && dentroB ? [...dentroA].filter((id) => dentroB.has(id)) : [];
      let oculto = false;
      if (comunes.length > 0) {
        cajaOculta.makeEmpty();
        const caj = new THREE.Box3();
        for (const id of comunes) {
          const host = this.objects.get(id);
          if (host) cajaOculta.union(caj.setFromObject(host.mesh).expandByScalar(1));
        }
        oculto = !cajaOculta.isEmpty();
      }
      ray.set(pts[i], dir.normalize());
      ray.near = 1;
      ray.far = len - 1;
      for (const h of ray.intersectObjects(this.sceneManager.content.children, false)) {
        // Dentro de la estructura que aloja ambas roldanas, el cable va
        // oculto por el interior hueco: ahí nada lo obstruye.
        if (oculto && cajaOculta.containsPoint(h.point)) continue;
        const id = h.object.userData.sceneObjectId as string | undefined;
        if (!id || propios.has(id)) continue;
        const o = this.objects.get(id);
        if (!o) continue;
        // Piezas del propio conjunto de roldana: la APERTURA es el orificio
        // por donde el cable transita y las mejillas lo flanquean — no son
        // material que el cable "atraviese".
        if (
          o.componentId === "apertura-cable" ||
          o.componentId === "soporte-roldana" ||
          o.componentId === "eje-roldana"
        ) {
          continue;
        }
        // Viga que aloja una roldana interna de este cable: se cruza por sus
        // aperturas.
        if (permeables.has(id)) continue;
        caja.setFromObject(o.mesh).expandByScalar(3);
        // La pieza que contiene ambos extremos es la anfitriona del reenvío
        // interno: no cuenta como colisión.
        if (caja.containsPoint(pts[i]) && caja.containsPoint(pts[i + 1])) continue;
        return false;
      }
    }
    for (let i = 1; i < pts.length - 1; i++) {
      const obj = this.objects.get(cable.nodes[i].objectId);
      if (!obj || !this.isPulley(obj)) continue;
      const eje = new THREE.Vector3(0, 1, 0)
        .applyQuaternion(obj.mesh.getWorldQuaternion(new THREE.Quaternion()))
        .normalize();
      const dIn = pts[i].clone().sub(pts[i - 1]);
      const dOut = pts[i + 1].clone().sub(pts[i]);
      if (dIn.lengthSq() > 4 && Math.abs(dIn.normalize().dot(eje)) > 0.5) return false;
      if (dOut.lengthSq() > 4 && Math.abs(dOut.normalize().dot(eje)) > 0.5) return false;
    }
    return true;
  }

  // -------------------------------------------------------------- roldanas
  /**
   * Entra en modo "colocar roldana" EN DOS PASOS (v0.2.26): primero se toca
   * la ESTRUCTURA que la alojará (viga, pilar, travesaño, brazo…) — se puede
   * orbitar libremente para buscarla —, entonces su eje mayor se muestra como
   * una LÍNEA AZUL y el siguiente toque elige el punto a lo largo de ese eje;
   * ahí se precisa si la roldana es interna o externa y hacia qué dirección
   * va dirigida (arriba/abajo/izquierda/derecha, relativas a la vista). El
   * modo permanece activo para colocar varias; Esc sale.
   */
  beginRoldana(): void {
    if (this.simulating) return;
    this.cancelCable();
    this.cancelRope();
    this.cancelLine();
    this.cancelConnect();
    this.cancelAttachHand();
    this.cancelPlacaDentada();
    this.select(null);
    this.roldanaMode = true;
    this.terminalMode = false;
    this.limpiarEjeRoldana();
    this.bus.emit("roldanaModeChanged", { active: true });
    this.bus.emit("dragMeasure", {
      text: tt(
        "Roldana: toca la ESTRUCTURA que la alojará (viga, pilar, travesaño o brazo) — puedes orbitar para verla mejor (Esc termina)",
        "Sheave: tap the STRUCTURE that will host it (beam, post, crossbar or arm) — orbit freely to find it (Esc ends)",
      ),
    });
  }

  cancelRoldana(): void {
    if (!this.roldanaMode && !this.terminalMode) return;
    this.roldanaMode = false;
    this.roldanaPidiendo = false;
    this.terminalMode = false;
    this.limpiarEjeRoldana();
    this.bus.emit("roldanaModeChanged", { active: false });
    this.bus.emit("dragMeasure", { text: null });
  }

  /** Quita la línea azul del eje y olvida la estructura elegida. */
  private limpiarEjeRoldana(): void {
    if (this.roldanaAxisLine) {
      this.sceneManager.scene.remove(this.roldanaAxisLine);
      this.roldanaAxisLine.geometry.dispose();
      (this.roldanaAxisLine.material as THREE.Material).dispose();
      this.roldanaAxisLine = null;
    }
    this.roldanaHost = null;
    this.requestRender();
  }

  /** Eje mayor de una pieza: dirección local/mundo, semilargo y centro. */
  private ejeMayorMundo(host: SceneObject): {
    ejeMundo: THREE.Vector3;
    half: number;
    centro: THREE.Vector3;
  } {
    const ls = host.localSizeAbs();
    const ejeLocal =
      ls.x >= ls.y && ls.x >= ls.z
        ? new THREE.Vector3(1, 0, 0)
        : ls.y >= ls.z
          ? new THREE.Vector3(0, 1, 0)
          : new THREE.Vector3(0, 0, 1);
    host.mesh.updateMatrixWorld(true);
    const ejeMundo = ejeLocal
      .applyQuaternion(host.mesh.getWorldQuaternion(new THREE.Quaternion()))
      .normalize();
    return { ejeMundo, half: Math.max(ls.x, ls.y, ls.z) / 2, centro: host.mesh.position.clone() };
  }

  /** Fase 1→2: fija la estructura anfitriona y muestra su eje mayor en azul. */
  private elegirEstructuraRoldana(host: SceneObject): void {
    this.limpiarEjeRoldana();
    const { ejeMundo, half, centro } = this.ejeMayorMundo(host);
    const a = centro.clone().addScaledVector(ejeMundo, -half - 6);
    const b = centro.clone().addScaledVector(ejeMundo, half + 6);
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([a, b]),
      new THREE.LineBasicMaterial({ color: 0x2563eb, depthTest: false }),
    );
    line.renderOrder = 999;
    this.sceneManager.scene.add(line);
    this.roldanaAxisLine = line;
    this.roldanaHost = host;
    this.bus.emit("dragMeasure", {
      text: tt(
        `Estructura: ${host.name}. Toca un punto A LO LARGO del eje azul para ubicar la roldana (u otra estructura para cambiar; Esc termina)`,
        `Structure: ${host.name}. Tap a point ALONG the blue axis to place the sheave (or another structure to switch; Esc ends)`,
      ),
    });
    this.requestRender();
  }

  // -------------------------------------------------- placa dentada (upright)
  /**
   * Entra en modo "colocar placa dentada" EN TRES TOQUES (v0.2.73):
   *
   *   1. La CARA del pilar donde va la placa. El toque dice dos cosas a la
   *      vez: qué cara —la placa se atornilla ahí— y hacia qué canto salen
   *      los ganchos, que es el canto más cercano al punto tocado. Se ve al
   *      instante, porque la línea guía se dibuja sobre ESE canto: si salió
   *      del lado que no era, se vuelve a tocar la cara por el otro lado.
   *   2. y 3. Los dos puntos de la línea guía: principio y fin de la placa.
   *      De ahí salen su largo y su ubicación.
   *
   * El ANCHO no se pregunta: la espina copia el ancho de la cara y el gancho
   * vuela por delante del canto. Una placa más estrecha que su pilar no
   * apoyaría, y una más ancha se comería el canto de al lado.
   *
   * Vale igual en un pilar diagonal: la trayectoria es el eje mayor de la
   * pieza tocada, no la vertical del mundo.
   */
  beginPlacaDentada(paso?: number): void {
    if (this.simulating) return;
    this.dentadaPaso = paso;
    this.cancelCable();
    this.cancelRope();
    this.cancelLine();
    this.cancelConnect();
    this.cancelAttachHand();
    this.cancelRoldana();
    this.select(null);
    this.dentadaMode = true;
    this.limpiarGuiaDentada();
    this.bus.emit("dentadaModeChanged", { active: true });
    this.bus.emit("dragMeasure", {
      text: tt(
        "Placa dentada: toca la CARA del pilar donde va (del lado por el que quieres que salgan los ganchos). Esc termina",
        "Toothed plate: tap the pillar FACE it mounts on (on the side you want the hooks to face). Esc ends",
      ),
    });
  }

  cancelPlacaDentada(): void {
    if (!this.dentadaMode) return;
    this.dentadaMode = false;
    this.limpiarGuiaDentada();
    this.bus.emit("dentadaModeChanged", { active: false });
    this.bus.emit("dragMeasure", { text: null });
  }

  /** Borra la guía de la placa y olvida la cara y el primer punto. */
  private limpiarGuiaDentada(): void {
    for (const o of this.dentadaGuia) {
      this.sceneManager.scene.remove(o);
      const m = o as THREE.Mesh | THREE.Line;
      m.geometry?.dispose();
      (m.material as THREE.Material | undefined)?.dispose();
    }
    this.dentadaGuia = [];
    this.dentadaHost = null;
    this.dentadaCara = null;
    this.dentadaA = null;
    this.requestRender();
  }

  /**
   * Fase 1: descompone la pieza tocada en sus tres ejes locales y reparte
   * papeles — el más largo es la TRAYECTORIA, el más paralelo a la cara
   * tocada es la NORMAL, y el que sobra es el ANCHO de la cara, que es lo
   * que la placa copia.
   *
   * Tocar la TAPA del extremo no vale: por ahí no corre nada.
   */
  private elegirCaraDentada(host: SceneObject, punto: THREE.Vector3, normal: THREE.Vector3): void {
    this.limpiarGuiaDentada();
    host.mesh.updateMatrixWorld(true);
    const q = host.mesh.getWorldQuaternion(new THREE.Quaternion());
    const ls = host.localSizeAbs();
    const ejes = [
      { v: new THREE.Vector3(1, 0, 0).applyQuaternion(q), len: ls.x },
      { v: new THREE.Vector3(0, 1, 0).applyQuaternion(q), len: ls.y },
      { v: new THREE.Vector3(0, 0, 1).applyQuaternion(q), len: ls.z },
    ];
    let iMax = 0;
    let iNor = 0;
    for (let i = 1; i < 3; i++) {
      if (ejes[i].len > ejes[iMax].len) iMax = i;
      if (Math.abs(ejes[i].v.dot(normal)) > Math.abs(ejes[iNor].v.dot(normal))) iNor = i;
    }
    if (iNor === iMax) {
      this.bus.emit("dragMeasure", {
        text: tt(
          "Esa es la TAPA del extremo: la placa corre a lo largo del pilar. Toca una cara lateral",
          "That is the end cap: the plate runs along the pillar. Tap a side face",
        ),
      });
      return;
    }
    const iAnc = 3 - iMax - iNor;

    // La trayectoria se orienta CUESTA ARRIBA: la boca de los ganchos mira
    // en esa dirección, y una placa con los ganchos boca abajo no sujeta
    // nada. En un pilar vertical esto es la vertical; en uno diagonal, la
    // subida de la diagonal.
    const eje = ejes[iMax].v.clone().normalize();
    if (eje.y < 0) eje.negate();
    const nrm = ejes[iNor].v.clone().normalize();
    if (nrm.dot(normal) < 0) nrm.negate();
    // Los ganchos salen por el canto MÁS CERCANO al punto tocado.
    const lateral = new THREE.Vector3().crossVectors(eje, nrm).normalize();
    const centro = host.mesh.getWorldPosition(new THREE.Vector3());
    const lado = punto.clone().sub(centro).dot(lateral) < 0 ? -1 : 1;
    const ganchos = lateral.multiplyScalar(lado);

    this.dentadaHost = host;
    this.dentadaCara = {
      eje,
      normal: nrm,
      ganchos,
      anchoCara: ls.getComponent(iAnc),
      saliente: ls.getComponent(iNor) / 2,
      half: ls.getComponent(iMax) / 2,
      centro,
    };
    this.dibujarGuiaDentada();
    this.bus.emit("dragMeasure", {
      text: tt(
        `Cara de ${host.name} (${ls.getComponent(iAnc).toFixed(1)} cm de ancho). Los ganchos saldrán por el canto de la línea azul — si es el otro, Esc y vuelve a empezar. Toca el PRINCIPIO de la placa`,
        `Face of ${host.name} (${ls.getComponent(iAnc).toFixed(1)} cm wide). Hooks will face the blue line's edge — if it's the wrong one, Esc and start over. Tap the plate's START`,
      ),
    });
  }

  /** La línea guía, dibujada sobre el canto por el que saldrán los ganchos. */
  private dibujarGuiaDentada(): void {
    const c = this.dentadaCara;
    if (!c) return;
    for (const o of this.dentadaGuia) {
      this.sceneManager.scene.remove(o);
      const m = o as THREE.Mesh | THREE.Line;
      m.geometry?.dispose();
      (m.material as THREE.Material | undefined)?.dispose();
    }
    this.dentadaGuia = [];
    // Sobre la cara y pegada al canto de los ganchos: se ve DÓNDE va y hacia
    // dónde abre antes de tocar nada.
    const base = c.centro
      .clone()
      .addScaledVector(c.normal, c.saliente + 0.5)
      .addScaledVector(c.ganchos, c.anchoCara / 2);
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        base.clone().addScaledVector(c.eje, -c.half),
        base.clone().addScaledVector(c.eje, c.half),
      ]),
      new THREE.LineBasicMaterial({ color: 0x2563eb, depthTest: false }),
    );
    line.renderOrder = 999;
    this.sceneManager.scene.add(line);
    this.dentadaGuia.push(line);

    if (this.dentadaA) {
      const bola = new THREE.Mesh(
        new THREE.SphereGeometry(1.4, 12, 8),
        new THREE.MeshBasicMaterial({ color: 0xf97316, depthTest: false }),
      );
      bola.position.copy(this.dentadaA).addScaledVector(c.normal, c.saliente + 0.5).addScaledVector(c.ganchos, c.anchoCara / 2);
      bola.renderOrder = 1000;
      this.sceneManager.scene.add(bola);
      this.dentadaGuia.push(bola);
    }
    this.requestRender();
  }

  /**
   * Punto de la TRAYECTORIA que el puntero señala. Si el rayo toca el propio
   * pilar, se proyecta ese impacto sobre el eje; si no, se busca el punto del
   * eje más cercano al rayo (así se puede señalar al aire junto al pilar).
   * Devuelve `null` cuando el puntero anda lejos: el usuario está orbitando.
   */
  private puntoTrayectoriaDentada(hit: THREE.Intersection | undefined): THREE.Vector3 | null {
    const c = this.dentadaCara;
    if (!c) return null;
    let s: number;
    if (hit) {
      s = hit.point.clone().sub(c.centro).dot(c.eje);
    } else {
      const ray = this.raycaster.ray;
      const w0 = c.centro.clone().sub(ray.origin);
      const b = c.eje.dot(ray.direction);
      const denom = 1 - b * b;
      if (denom < 1e-6) return null; // eje mirando de frente
      const t = (b * ray.direction.dot(w0) - c.eje.dot(w0)) / denom;
      const pEje = c.centro.clone().addScaledVector(c.eje, t);
      if (ray.distanceToPoint(pEje) > Math.max(18, c.half * 0.25)) return null;
      s = t;
    }
    s = THREE.MathUtils.clamp(s, -c.half, c.half);
    return c.centro.clone().addScaledVector(c.eje, s);
  }

  /**
   * Crea la placa entre los dos puntos trazados.
   *
   * El ancho sale de la cara y el largo de los dos puntos; los ganchos se
   * reparten al paso configurado y salen los que quepan. La placa se apoya
   * sobre la cara —de ahí el medio grosor— y se corre medio vuelo de lado,
   * que es lo que deja la espina centrada en la cara con el gancho entero por
   * fuera del canto.
   */
  private colocarPlacaDentada(a: THREE.Vector3, b: THREE.Vector3): void {
    const c = this.dentadaCara;
    const host = this.dentadaHost;
    if (!c || !host) return;
    const largo = a.distanceTo(b);
    if (largo < 4) {
      this.bus.emit("dragMeasure", {
        text: tt(
          "Los dos puntos están casi encima: separa el final del principio",
          "The two points are on top of each other: move the end away from the start",
        ),
      });
      return;
    }

    const placa = this.addComponent("placa-dentada");
    const p = placa.params;
    if (this.dentadaPaso != null) p.dienteEspaciado = this.dentadaPaso;
    // El paso se resuelve por `medidasDentada`, que impone su mínimo: pedir
    // ganchos más juntos de lo que la barra admite los separa igualmente, y
    // la cuenta tiene que salir del paso REAL o sobrarían dientes.
    const paso = medidasDentada(p).paso;
    p.dienteEspaciado = paso;
    p.width = c.anchoCara + vueloDentada(p);
    p.height = largo;
    p.dientes = dientesQueCaben(largo, paso);
    placa.rebuildGeometry();

    const m = medidasDentada(p);
    // Ejes de la placa: Y por la trayectoria, X hacia los ganchos y Z el
    // grosor. La plancha es simétrica en su grosor, así que da igual por cuál
    // de las dos caras quede mirando su +Z — lo que importa es que la espina
    // caiga sobre el pilar.
    const ejeZ = new THREE.Vector3().crossVectors(c.ganchos, c.eje).normalize();
    placa.mesh.quaternion.setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(c.ganchos, c.eje, ejeZ),
    );
    placa.mesh.position
      .copy(a)
      .add(b)
      .multiplyScalar(0.5)
      .addScaledVector(c.normal, c.saliente + m.grosor / 2)
      .addScaledVector(c.ganchos, m.vuelo / 2);
    placa.physics = { ...placa.physics, fixed: true };

    this.bus.emit("objectTransformed", { object: placa });
    this.select(null);
    this.dentadaA = null;
    this.dibujarGuiaDentada();
    this.bus.emit("dragMeasure", {
      text: tt(
        `✓ ${placa.name}: ${m.dientes} ganchos cada ${m.paso.toFixed(0)} cm en ${m.largo.toFixed(0)} cm — toca otra cara o Esc para terminar`,
        `✓ ${placa.name}: ${m.dientes} hooks every ${m.paso.toFixed(0)} cm over ${m.largo.toFixed(0)} cm — tap another face or Esc to finish`,
      ),
    });
    this.requestRender();
  }

  /**
   * Entra en modo "colocar terminal de cable": el siguiente toque sobre la
   * cara de una pieza coloca ahí el ojal de anclaje (diagrama Punto de
   * anclaje de cable en caras). Esc termina.
   */
  beginTerminalCable(): void {
    if (this.simulating) return;
    this.cancelCable();
    this.cancelRope();
    this.cancelLine();
    this.cancelConnect();
    this.cancelAttachHand();
    this.cancelPlacaDentada();
    this.select(null);
    this.roldanaMode = false;
    this.limpiarEjeRoldana();
    this.terminalMode = true;
    this.bus.emit("dragMeasure", {
      text: tt(
        "Terminal de cable: toca la cara donde anclar el ojal (Esc termina)",
        "Cable terminal: tap the face where the eyelet should anchor (Esc ends)",
      ),
    });
  }

  /** Coloca el ojal terminal sobre la cara tocada, asomando de ella. */
  private colocarTerminal(host: SceneObject, punto: THREE.Vector3, normal: THREE.Vector3): void {
    const term = this.addComponent("terminal-cable");
    const previas = [...this.objects.values()].filter(
      (o) => o !== term && o.name.startsWith("Terminal de cable"),
    ).length;
    term.name = `Terminal de cable${previas > 0 ? ` ${previas + 1}` : ""}`;
    term.mesh.name = term.name;
    term.physics = { ...term.physics, fixed: true };
    // El plano del ojal contiene la normal (el cable pasa por el ojo); su eje
    // queda tangente a la cara.
    let ejeOjal = new THREE.Vector3().crossVectors(normal, new THREE.Vector3(0, 1, 0));
    if (ejeOjal.lengthSq() < 0.01) ejeOjal.set(1, 0, 0);
    ejeOjal.normalize();
    // El toro se genera en el plano XY (eje +Z).
    term.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), ejeOjal);
    const radio = term.localSizeAbs().x / 2 || 2.2;
    term.mesh.position.copy(punto).addScaledVector(normal, radio * 0.8);
    void host;
    this.bus.emit("objectTransformed", { object: term });
    this.select(null);
    this.bus.emit("dragMeasure", {
      text: tt(
        `✓ ${term.name} colocado — toca otra cara o Esc para terminar`,
        `✓ ${term.name} placed — tap another face or Esc to finish`,
      ),
    });
    this.requestRender();
  }

  /**
   * Traduce el hueco de una roldana interna al formato de VENTANA de la
   * pieza: eje pasante (la dirección elegida) y rectángulo en el plano
   * perpendicular, con el LARGO a lo largo de la viga (el diámetro de la
   * rueda) y el ANCHO a lo ancho (el paso del cable). El par de coordenadas
   * del plano es (Y,Z) para el eje X, (Z,X) para el eje Y y (X,Y) para Z.
   */
  private ventanaRect(
    dirLocal: THREE.Vector3,
    ejeLocal: THREE.Vector3,
    centroLocal: THREE.Vector3,
    largo: number,
    ancho: number,
  ): VentanaRect {
    const eje: "x" | "y" | "z" =
      Math.abs(dirLocal.x) > 0.5 ? "x" : Math.abs(dirLocal.y) > 0.5 ? "y" : "z";
    const idx = eje === "x" ? [1, 2] : eje === "y" ? [2, 0] : [0, 1];
    const c = [centroLocal.x, centroLocal.y, centroLocal.z];
    const e = [Math.abs(ejeLocal.x), Math.abs(ejeLocal.y), Math.abs(ejeLocal.z)];
    // De las dos coordenadas del plano, la que corre a lo largo de la viga
    // recibe el LARGO; la otra (la del eje de giro), el ANCHO.
    const largoEnU = e[idx[0]] >= e[idx[1]];
    return {
      eje,
      u: c[idx[0]],
      v: c[idx[1]],
      du: largoEnU ? largo : ancho,
      dv: largoEnU ? ancho : largo,
    };
  }

  /**
   * Coloca la roldana en un punto del EJE MAYOR de la estructura, según el
   * tipo (interna: embutida en el eje central, la rueda asoma por la
   * apertura; externa: montada fuera de la cara hacia la dirección elegida)
   * y la dirección a la que va dirigida — el plano de la rueda contiene el
   * eje de la estructura y esa dirección, así el cable corre a lo largo de
   * la pieza y se reenvía hacia allí.
   */
  private colocarRoldanaEnEje(
    host: SceneObject,
    puntoEje: THREE.Vector3,
    tipo: "interna" | "externa",
    dir: DireccionRoldana,
  ): void {
    // Igual que la bisagra: el panel de la roldana se resuelve tarde y entre
    // medias se puede haber arrancado la simulación.
    if (this.simulating) return;
    const { ejeMundo } = this.ejeMayorMundo(host);
    // Dirección pedida en los ejes GLOBALES del proyecto (v0.2.28): arriba/
    // abajo = ±Y, derecha/izquierda = ±X, anterior/posterior = ±Z. Al no
    // depender de la cámara, el resultado es el mismo se mire desde donde
    // se mire (y se puede orbitar mientras se elige).
    const pedida = DIRECCIONES_ROLDANA[dir].clone();
    // Componente perpendicular al eje de la estructura.
    const dirMundo = pedida.clone().addScaledVector(ejeMundo, -pedida.dot(ejeMundo));
    if (dirMundo.lengthSq() < 0.05) {
      this.bus.emit("dragMeasure", {
        text: tt(
          "⛔ Esa dirección coincide con el eje de la estructura — elige otra dirección",
          "⛔ That direction matches the structure's axis — pick another direction",
        ),
      });
      return;
    }
    dirMundo.normalize();
    // CALCE A CARA: la dirección se ajusta a la cara del perfil más cercana
    // a lo pedido (eje local dominante ⊥ al eje mayor) — el montaje apoya
    // plano y la apertura se abre en una CARA, nunca sobre una arista.
    const qHost = host.mesh.getWorldQuaternion(new THREE.Quaternion());
    const dirLocal = dirMundo.clone().applyQuaternion(qHost.clone().invert());
    const ax = Math.abs(dirLocal.x);
    const ay = Math.abs(dirLocal.y);
    const az = Math.abs(dirLocal.z);
    if (ax >= ay && ax >= az) dirLocal.set(Math.sign(dirLocal.x), 0, 0);
    else if (ay >= az) dirLocal.set(0, Math.sign(dirLocal.y), 0);
    else dirLocal.set(0, 0, Math.sign(dirLocal.z));
    dirMundo.copy(dirLocal).applyQuaternion(qHost).normalize();

    const rold = this.addComponent("roldana");
    const previas = [...this.objects.values()].filter(
      (o) => o !== rold && o.name.startsWith(`Roldana ${tipo}`),
    ).length;
    rold.name = `Roldana ${tipo}${previas > 0 ? ` ${previas + 1}` : ""}`;
    rold.mesh.name = rold.name;
    // Punto de deslizamiento del cable: fija (el cable resbala por ella).
    rold.physics = { ...rold.physics, fixed: true };

    // El eje de giro de la rueda es perpendicular al plano (eje, dirección).
    const ejeRueda = new THREE.Vector3().crossVectors(ejeMundo, dirMundo).normalize();
    rold.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), ejeRueda);

    const radio = rold.localSizeAbs().x / 2 || 4;
    // Semiespesor del perfil hacia la cara elegida (dirLocal ya es un eje
    // local exacto) y punto de la CARA (donde apoya el montaje o se abre el
    // orificio).
    const ls = host.localSizeAbs();
    const halfDir =
      (Math.abs(dirLocal.x) * ls.x + Math.abs(dirLocal.y) * ls.y + Math.abs(dirLocal.z) * ls.z) /
      2;
    const cara = puntoEje.clone().addScaledVector(dirMundo, halfDir);

    // Base local del conjunto: X = eje de la estructura, Y = dirección
    // elegida, Z = eje de giro de la rueda (terna derecha: Z = X × Y).
    const qBase = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(ejeMundo, dirMundo, ejeRueda),
    );
    const piezasConjunto = [rold.id];
    const aux = (
      comp: string,
      nombre: string,
      dims: [number, number, number],
      centro: THREE.Vector3,
    ): void => {
      const p = this.addComponent(comp);
      p.name = nombre;
      p.mesh.name = nombre;
      p.params = { kind: "box", width: dims[0], height: dims[1], depth: dims[2] };
      p.rebuildGeometry();
      p.physics = { ...p.physics, fixed: true };
      p.mesh.quaternion.copy(qBase);
      p.mesh.position.copy(centro);
      this.bus.emit("objectTransformed", { object: p });
      piezasConjunto.push(p.id);
    };

    if (tipo === "externa") {
      // Fuera de la cara, con su MONTAJE (como la polea baja del TTP): la
      // roldana no flota — una placa base apoyada en la cara y dos mejillas
      // paralelas a la rueda la vinculan a la estructura hasta su eje.
      rold.mesh.position.copy(cara).addScaledVector(dirMundo, radio + 0.5);
      aux(
        "soporte-roldana",
        tt("Placa de montaje", "Mounting plate"),
        [5, 0.8, 5.8],
        cara.clone().addScaledVector(dirMundo, 0.4),
      );
      const altoMejilla = radio + 1.3; // de la cara hasta pasado el eje
      for (const lado of [1, -1]) {
        aux(
          "soporte-roldana",
          tt("Mejilla de soporte", "Support cheek"),
          [4, altoMejilla, 0.8],
          cara
            .clone()
            .addScaledVector(dirMundo, altoMejilla / 2)
            .addScaledVector(ejeRueda, lado * 2.05),
        );
      }
    } else {
      // ALOJADA DENTRO DE LA VIGA (v0.2.30), como el soporte de polea alta
      // del TTP:
      //  · la rueda queda en el eje central del perfil y su EJE DE GIRO,
      //    pasante, se apoya en las DOS paredes laterales;
      //  · las dos caras que quedan sobre y bajo la rueda se CALAN de verdad
      //    (se modifica la geometría del anfitrión) con sendos agujeros
      //    iguales, alineados ⊥ al eje de giro: el cable entra y sale sin
      //    obstrucción y la rueda cabe entera sin chocar con la cara.
      rold.mesh.position.copy(puntoEje);

      // Ancho del perfil a lo largo del EJE DE GIRO (de pared a pared). El
      // eje de giro cae sobre un eje local exacto —dir y el eje mayor lo
      // son—, así que se redondea para evitar arrastre numérico.
      const ejeRuedaLocal = ejeRueda.clone().applyQuaternion(qHost.clone().invert());
      ejeRuedaLocal.set(
        Math.abs(ejeRuedaLocal.x) > 0.5 ? Math.sign(ejeRuedaLocal.x) : 0,
        Math.abs(ejeRuedaLocal.y) > 0.5 ? Math.sign(ejeRuedaLocal.y) : 0,
        Math.abs(ejeRuedaLocal.z) > 0.5 ? Math.sign(ejeRuedaLocal.z) : 0,
      );
      const anchoLateral =
        Math.abs(ejeRuedaLocal.x) * ls.x +
        Math.abs(ejeRuedaLocal.y) * ls.y +
        Math.abs(ejeRuedaLocal.z) * ls.z;

      // La rueda debe caber ENTRE las dos paredes: si el perfil es más
      // estrecho que su espesor, se afina proporcionalmente.
      const grosor = rold.localSizeAbs().y || 2.5;
      const holgura = 0.6;
      if (grosor + holgura > anchoLateral && anchoLateral > holgura + 0.4) {
        const k = (anchoLateral - holgura) / grosor;
        rold.mesh.scale.set(1, k, 1);
      }
      const grosorFinal = Math.min(grosor, Math.max(0.6, anchoLateral - holgura));

      // EJE PASANTE: cilindro a lo largo del eje de giro, de pared a pared.
      const eje = this.addComponent("eje-roldana");
      eje.name = tt("Eje de la roldana", "Sheave axle");
      eje.mesh.name = eje.name;
      eje.params = {
        kind: "cylinder",
        radiusTop: 0.9,
        radiusBottom: 0.9,
        height: Math.max(anchoLateral, grosorFinal + 1),
      };
      eje.rebuildGeometry();
      eje.physics = { ...eje.physics, fixed: true };
      // El cilindro nace a lo largo de +Y: se alinea con el eje de giro.
      eje.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), ejeRueda);
      eje.mesh.position.copy(puntoEje);
      this.bus.emit("objectTransformed", { object: eje });
      piezasConjunto.push(eje.id);

      // VENTANAS REALES en el anfitrión: pasantes por la dirección elegida,
      // con la rueda entera de holgura a lo largo de la viga y el paso del
      // cable a lo ancho.
      const ejeLocalHost = ejeMundo.clone().applyQuaternion(qHost.clone().invert());
      const largoVentana = 2 * radio + 2.4; // la rueda cabe y no roza la cara
      const anchoVentana = Math.min(grosorFinal + 2.2, Math.max(1.6, anchoLateral - 1.6));
      const centroLocal = host.mesh.worldToLocal(puntoEje.clone());
      const ventana = this.ventanaRect(
        dirLocal,
        ejeLocalHost,
        centroLocal,
        largoVentana,
        anchoVentana,
      );
      const yaHabia = host.params.ventanas ?? [];
      const otroEje = yaHabia.find((v) => v.eje !== ventana.eje);
      host.params = { ...host.params, ventanas: [...yaHabia, ventana] };
      host.rebuildGeometry();
      this.bus.emit("objectTransformed", { object: host });
      if (otroEje) {
        this.avisoTemporal(
          tt(
            "⚠ Esta pieza ya estaba calada en otra dirección: las ventanas se abren por un solo eje.",
            "⚠ This part was already cut through another direction: windows are opened along a single axis.",
          ),
        );
      }
    }
    this.bus.emit("objectTransformed", { object: rold });
    // El conjunto viaja unido (roldana + montaje/apertura): agrupado.
    const gid = this.createGroupFromIds(piezasConjunto);
    if (gid) this.renameGroup(gid, rold.name);
    this.select(null);
    // El modo y la estructura siguen activos para colocar la siguiente.
    this.bus.emit("dragMeasure", {
      text: tt(
        `✓ ${rold.name} colocada — toca otro punto del eje, otra estructura, o Esc para terminar`,
        `✓ ${rold.name} placed — tap another point on the axis, another structure, or Esc to finish`,
      ),
    });
    this.requestRender();
  }

  // ---------------------------------------------------------------- cuerdas
  /** Entra en modo "colocar cuerda": clic en el extremo A y luego en el B. */
  beginRope(kind: RopeKind): void {
    this.cancelCable();
    this.cancelConnect();
    this.cancelAttachHand();
    this.cancelRoldana();
    this.cancelPlacaDentada();
    this.select(null);
    this.ropeMode = kind;
    this.ropePendingA = null;
    this.bus.emit("ropeModeChanged", { active: true, kind, count: 0 });
  }

  cancelRope(): void {
    if (!this.ropeMode) return;
    this.ropeMode = null;
    this.ropePendingA = null;
    this.clearPlacementPreview();
    this.bus.emit("ropeModeChanged", { active: false, kind: null, count: 0 });
  }

  // ------------------------------------------- piezas de línea (beam/tube)
  /**
   * Entra en modo "trazar pieza de línea" (pilar/travesaño o tubo): dos clics
   * definen los extremos, como la línea recta de Paint. `params` es la plantilla
   * (perfil/extremos/agujeros o radio) elegida en el diálogo; el path se genera
   * al fijar los dos puntos. El modo queda activo para encadenar piezas (ESC
   * para salir).
   */
  beginLine(kind: "beam" | "tube" | "guia", params: PrimitiveParams): void {
    if (this.simulating) return;
    this.cancelConnect();
    this.cancelCable();
    this.cancelRope();
    this.cancelAttachHand();
    this.endBendNodes();
    this.select(null);
    this.lineMode = kind;
    this.lineParams = params;
    this.linePendingA = null;
    this.lineAnclaA = null;
    this.bus.emit("lineModeChanged", { active: true, kind, count: 0 });
  }

  cancelLine(): void {
    if (!this.lineMode) return;
    this.bus.emit("dragMeasure", { text: null });
    this.lineMode = null;
    this.lineParams = null;
    this.linePendingA = null;
    this.lineAnclaA = null;
    this.clearPlacementPreview();
    this.bus.emit("lineModeChanged", { active: false, kind: null, count: 0 });
  }

  /**
   * Aim assist del trazado: punto bajo el cursor, con ayuda de puntería que
   * imanta a los puntos clave de otras piezas (extremos, nodos y puntos medios)
   * cuando el cursor pasa a menos de ~16 px en pantalla. Si no hay imán, usa la
   * superficie señalada; si no, el suelo (y=0) redondeado al cm.
   */
  /**
   * Pieza dueña de una malla del visor. Sube por los padres porque las piezas
   * hijas —las placas de una pila, los discos montados— no llevan la marca:
   * la lleva el mesh raíz del objeto.
   */
  private piezaDeMalla(nodo: THREE.Object3D | null): SceneObject | null {
    for (let n: THREE.Object3D | null = nodo; n; n = n.parent) {
      const id = n.userData?.sceneObjectId as string | undefined;
      if (id) return this.objects.get(id) ?? null;
    }
    return null;
  }

  private pickLinePlacePoint(): {
    point: THREE.Vector3;
    snapped: boolean;
    /** Pieza sobre la que cayó el punto (la guía tubular ancla en ella). */
    obj?: SceneObject;
  } | null {
    const rect = this.canvas.getBoundingClientRect();
    let best: THREE.Vector3 | null = null;
    let bestObj: SceneObject | null = null;
    let bestPx = 16;
    const ndc = new THREE.Vector3();
    for (const obj of this.objects.values()) {
      obj.mesh.updateMatrixWorld();
      for (const lp of localSnapPoints(obj)) {
        const wp = lp.clone().applyMatrix4(obj.mesh.matrixWorld);
        ndc.copy(wp).project(this.sceneManager.camera);
        if (ndc.z > 1 || ndc.z < -1) continue; // fuera del frustum en Z
        const dx = ((ndc.x - this.pointer.x) * rect.width) / 2;
        const dy = ((ndc.y - this.pointer.y) * rect.height) / 2;
        const px = Math.hypot(dx, dy);
        if (px < bestPx) {
          bestPx = px;
          best = wp;
          bestObj = obj;
        }
      }
    }
    if (best) return { point: best, snapped: true, obj: bestObj ?? undefined };

    const hits = this.raycaster.intersectObjects(this.sceneManager.content.children, false);
    if (hits[0]) {
      return {
        point: hits[0].point.clone(),
        snapped: false,
        obj: this.piezaDeMalla(hits[0].object) ?? undefined,
      };
    }

    const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const p = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(ground, p)) {
      p.set(Math.round(p.x), 0, Math.round(p.z));
      return { point: p, snapped: false };
    }
    return null;
  }

  /** Crea la pieza de línea entre dos puntos de mundo (recta, path por nodos). */
  private createLinePiece(a: THREE.Vector3, b: THREE.Vector3): SceneObject | null {
    const kind = this.lineMode;
    const tpl = this.lineParams;
    if (!kind || !tpl) return null;
    const dir = b.clone().sub(a);
    const L = dir.length();
    if (L < 2) return null; // trazo demasiado corto
    dir.divideScalar(L);

    const id = kind === "beam" ? "pilar-linea" : kind === "guia" ? "guia-tubular" : "tubo-linea";
    const def = getDefinition(id);
    if (!def) return null;
    const count = [...this.objects.values()].filter((o) => o.componentId === def.id).length;
    // La GUÍA TUBULAR es un cilindro macizo del largo del trazo, no una pieza
    // de línea con recorrido por nodos: lo que importa de ella es su RECTA, y
    // una recta no se dobla. El diámetro viene del diálogo.
    const params: PrimitiveParams =
      kind === "guia"
        ? { ...def.defaults, ...tpl, kind: "cylinder", height: L, path: undefined }
        : { ...tpl, path: straightPath(L) };
    const obj = new SceneObject({
      name: count > 0 ? `${def.label} ${count + 1}` : def.label,
      componentId: def.id,
      category: def.category,
      params,
      physics: def.physics,
      materialId: def.materialId,
    });
    obj.mesh.position.copy(a).add(b).multiplyScalar(0.5);
    obj.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    this.sceneManager.content.add(obj.mesh);
    this.objects.set(obj.id, obj);
    this.bus.emit("objectsChanged", { objects: this.listObjects() });
    this.scheduleAutosave();
    return obj;
  }

  // ------------------------------------------------- doblado por nodos
  /**
   * Activa el doblado (bending) de la pieza seleccionada: muestra los nodos de
   * su trayectoria como asas arrastrables (curvas tipo Bézier editables). Solo
   * para piezas de línea (con `params.path`).
   */
  beginBendNodes(): void {
    const obj = this.selected;
    if (!obj || !obj.params.path || this.simulating) {
      if (!this.simulating) {
        this.avisoTemporal(
          tt(
            "Selecciona un pilar o tubo TRAZADO (herramienta de línea) para doblarlo por nodos.",
            "Select a DRAWN pillar or tube (line tool) to bend it by nodes.",
          ),
        );
      }
      return;
    }
    this.cancelConnect();
    this.cancelCable();
    this.cancelRope();
    this.cancelLine();
    this.endBendNodes();
    this.bendTarget = obj;
    this.gizmo.detach();

    const group = new THREE.Group();
    const r = Math.max(2, Math.min(4, (obj.params.radius ?? obj.params.width ?? 5) * 0.7));
    for (let i = 0; i < obj.params.path.length; i++) {
      const h = new THREE.Mesh(
        new THREE.SphereGeometry(r, 16, 12),
        new THREE.MeshBasicMaterial({
          color: 0x22d3ee,
          depthTest: false,
          transparent: true,
          opacity: 0.95,
        }),
      );
      h.renderOrder = 1001;
      h.userData.bendIndex = i;
      group.add(h);
    }
    this.bendHandles = group;
    this.sceneManager.scene.add(group);
    this.refreshBendHandles();
    this.bus.emit("bendModeChanged", { active: true });
  }

  isBending(): boolean {
    return this.bendTarget !== null;
  }

  /** Punto de conexión de OTRA pieza más cercano (imán del soldador), o null. */
  private puntoSoldadura(
    punto: THREE.Vector3,
    excluir: SceneObject,
  ): { punto: THREE.Vector3; objeto: SceneObject } | null {
    let mejor: THREE.Vector3 | null = null;
    let mejorObj: SceneObject | null = null;
    let mejorD = 8; // cm de captura del imán
    for (const o of this.objects.values()) {
      if (o === excluir || o.componentId.startsWith("ws-")) continue;
      o.mesh.updateMatrixWorld(true);
      for (const lp of this.puntosSoldables(o)) {
        const wp = lp.clone().applyMatrix4(o.mesh.matrixWorld);
        const d = wp.distanceTo(punto);
        if (d < mejorD) {
          mejorD = d;
          mejor = wp;
          mejorObj = o;
        }
      }
    }
    return mejor && mejorObj ? { punto: mejor, objeto: mejorObj } : null;
  }

  /**
   * Puntos donde puede morder el soldador: los de conexión estándar más las
   * ESQUINAS de las cajas (el esquema suelda el nodo de un tubo al vértice
   * del perfil de una viga) — solo para el soldador, sin tocar el snapping
   * general de colocación.
   */
  private puntosSoldables(o: SceneObject): THREE.Vector3[] {
    const pts = localSnapPoints(o);
    if (o.params.kind === "box") {
      const geo = o.mesh.geometry;
      if (!geo.boundingBox) geo.computeBoundingBox();
      const bb = geo.boundingBox!;
      for (const sx of [-1, 1])
        for (const sy of [-1, 1])
          for (const sz of [-1, 1])
            pts.push(new THREE.Vector3(sx * bb.max.x, sy * bb.max.y, sz * bb.max.z));
    }
    return pts;
  }

  /**
   * SOLDADURA nodo-nodo (esquema Deformación por nodos): al soltar un nodo
   * imantado sobre el punto de conexión de OTRA figura se crea una unión
   * RÍGIDA (joint bloqueado) entre ambas — las piezas quedan soldadas y se
   * gestionan desde la ventana de Conexiones (se puede desbloquear o borrar).
   */
  private crearSoldadura(a: SceneObject, objetoId: string, punto: THREE.Vector3): void {
    const b = this.objects.get(objetoId);
    if (!b || b === a) return;
    // Evita duplicados: si ya hay una unión del mismo par cerca del punto.
    for (const j of this.joints.values()) {
      const mismoPar =
        (j.bodyAId === a.id && j.bodyBId === b.id) ||
        (j.bodyAId === b.id && j.bodyBId === a.id);
      if (mismoPar && j.anchor.distanceTo(punto) < 4) return;
    }
    const joint = this.connect(b.id, a.id, "revolute", punto.clone());
    if (!joint) return;
    joint.locked = true;
    joint.name = `Soldadura ${joint.id.split("_")[1]}`;
    this.refreshJointHelpers();
    this.bus.emit("jointsChanged", { joints: this.listJoints() });
    this.avisoTemporal(
      tt(
        "🔩 Nodos soldados: unión rígida creada (ver Conexiones)",
        "🔩 Nodes welded: rigid union created (see Connections)",
      ),
    );
  }

  /**
   * Añade 1 nodo a la pieza en modo Doblar: subdivide el tramo más largo de
   * la trayectoria en su punto medio (esquema "añade 1 nodo").
   */
  agregarNodoBend(): void {
    const obj = this.bendTarget ?? this.selected;
    if (!obj?.params.path || obj.params.path.length < 2) return;
    const path = obj.params.path;
    let peor = 0;
    let dMax = -1;
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      const d = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      if (d > dMax) {
        dMax = d;
        peor = i;
      }
    }
    const a = path[peor];
    const b = path[peor + 1];
    path.splice(peor + 1, 0, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]);
    obj.rebuildGeometry();
    // Reconstruye las asas si el modo Doblar está activo.
    if (this.bendTarget === obj) {
      const objetivo = obj;
      this.endBendNodes();
      this.select(objetivo);
      this.beginBendNodes();
      // El nodo recién añadido queda ACTIVO: los cursores lo mueven al tiro.
      this.bendNodeIndex = peor + 1;
      this.refreshBendHandles();
    }
    this.scheduleAutosave();
    this.requestRender();
  }

  /** Coloca las asas sobre los nodos del path (en coordenadas de mundo). */
  private refreshBendHandles(): void {
    const obj = this.bendTarget;
    if (!obj || !this.bendHandles) return;
    obj.mesh.updateMatrixWorld(true);
    for (const h of this.bendHandles.children) {
      const i = h.userData.bendIndex as number;
      const n = obj.params.path![i];
      h.position.set(n[0], n[1], n[2]).applyMatrix4(obj.mesh.matrixWorld);
      // El nodo ACTIVO (el que mueven los cursores) se pinta distinto.
      ((h as THREE.Mesh).material as THREE.MeshBasicMaterial).color.setHex(
        i === this.bendNodeIndex ? 0xf59e0b : 0x22d3ee,
      );
    }
  }

  endBendNodes(): void {
    if (!this.bendTarget) return;
    if (this.bendHandles) {
      this.sceneManager.scene.remove(this.bendHandles);
      for (const h of this.bendHandles.children) {
        (h as THREE.Mesh).geometry.dispose();
        ((h as THREE.Mesh).material as THREE.Material).dispose();
      }
      this.bendHandles = null;
    }
    const obj = this.bendTarget;
    this.bendTarget = null;
    this.bendDrag = null;
    this.bendWeld = null;
    this.bendNodeIndex = null;
    this.snap.hideIndicator();
    this.orbit.enabled = true;
    // Reengancha el gizmo si la pieza sigue seleccionada.
    if (this.selected === obj) this.gizmo.attach(obj.mesh);
    this.bus.emit("bendModeChanged", { active: false });
    this.scheduleAutosave();
  }

  /**
   * Punto de anclaje (pieza + local + mundo) cuyo punto de conexión está más
   * cerca del ray actual; null si el ray no toca ninguna pieza. Facilita el
   * anclaje ajustándose al punto de conexión más próximo de la pieza señalada.
   */
  private pickAnchorPoint(): { object: SceneObject; local: THREE.Vector3; world: THREE.Vector3 } | null {
    const hits = this.raycaster.intersectObjects(this.sceneManager.content.children, false);
    const hit = hits[0];
    const id = hit?.object.userData.sceneObjectId as string | undefined;
    let obj = id ? this.objects.get(id) : undefined;
    let punto = hit ? hit.point.clone() : null;
    // AIM ASSIST del cable (v0.2.3): una roldana cercana al ray CAPTURA el
    // toque aunque el dedo no caiga exactamente sobre ella — facilita
    // seleccionarlas como punto de recorrido.
    if (this.cableMode) {
      const iman = this.roldanaCercanaAlRay();
      // Anti-robo: si el rayo tocó una pieza real y la roldana imantada ya es
      // el nodo anterior del cable, gana la pieza tocada — así el cable puede
      // CERRARSE en una pieza pegada a la roldana sin que el imán lo impida.
      const prev = this.cablePending[this.cablePending.length - 1];
      const imanEsPrevio = !!iman && !!prev && iman === prev.object;
      if (iman && (!obj || (!this.isPulley(obj) && !imanEsPrevio))) {
        obj = iman;
        punto = iman.mesh.getWorldPosition(new THREE.Vector3());
      }
    }
    if (!obj || !punto) return null;
    obj.mesh.updateMatrixWorld(true);
    // Roldana con nodo previo: el cable se une al punto del GROOVE más
    // cercano al tramo entrante (el groove es el punto de contacto real).
    if (this.cableMode && this.isPulley(obj) && this.cablePending.length > 0) {
      const prev = this.cablePending[this.cablePending.length - 1];
      prev.object.mesh.updateMatrixWorld(true);
      const prevW = prev.local.clone().applyMatrix4(prev.object.mesh.matrixWorld);
      const g = this.anclaEnGroove(obj, prevW);
      return { object: obj, local: g, world: g.clone().applyMatrix4(obj.mesh.matrixWorld) };
    }
    let best = new THREE.Vector3();
    let bestD = Infinity;
    for (const lp of localSnapPoints(obj)) {
      const wp = lp.clone().applyMatrix4(obj.mesh.matrixWorld);
      const d = wp.distanceTo(punto);
      if (d < bestD) { bestD = d; best = lp; }
    }
    return { object: obj, local: best, world: best.clone().applyMatrix4(obj.mesh.matrixWorld) };
  }

  /** Roldana más cercana al ray del puntero (magnetismo del trazado). */
  private roldanaCercanaAlRay(): SceneObject | null {
    let mejor: SceneObject | null = null;
    let mejorD = Infinity;
    const c = new THREE.Vector3();
    for (const o of this.objects.values()) {
      if (!this.isPulley(o)) continue;
      o.mesh.getWorldPosition(c);
      const d = this.raycaster.ray.distanceToPoint(c);
      // Radio adaptativo: con la cámara lejos, 14 cm de mundo son muy pocos
      // píxeles — se escala con la distancia (~3 %) para que la captura se
      // sienta igual a cualquier zoom.
      const distCam = this.sceneManager.camera.position.distanceTo(c);
      const captura = Math.max(14, o.effectiveSize().x * 1.6, distCam * 0.03);
      if (d < captura && d < mejorD) {
        mejorD = d;
        mejor = o;
      }
    }
    return mejor;
  }

  /** Punto LOCAL del groove de la roldana más cercano a un punto de mundo. */
  private anclaEnGroove(roldana: SceneObject, haciaWorld: THREE.Vector3): THREE.Vector3 {
    roldana.mesh.updateMatrixWorld(true);
    const local = haciaWorld.clone().applyMatrix4(roldana.mesh.matrixWorld.clone().invert());
    local.y = 0; // el eje de la rueda es Y local: el groove vive en su plano
    const radio = roldana.localSizeAbs().x / 2;
    if (local.lengthSq() < 1e-6) return new THREE.Vector3();
    return local.normalize().multiplyScalar(radio);
  }

  /**
   * Contacto FÍSICO del cable en el groove (esquema Cables III): el punto de
   * tangencia real, donde el radio queda a 90° del cable. Con los dos tramos
   * (entrante y saliente) el punto de contacto del abrazo es el opuesto a la
   * bisectriz de las direcciones hacia los vecinos: el cable pasa POR ENCIMA
   * de una roldana con ambos vecinos abajo, o POR DEBAJO si cuelga de él.
   */
  private contactoGroove(
    roldana: SceneObject,
    prevW: THREE.Vector3,
    nextW: THREE.Vector3,
    anclaActual?: THREE.Vector3,
  ): THREE.Vector3 | null {
    roldana.mesh.updateMatrixWorld(true);
    const inv = roldana.mesh.matrixWorld.clone().invert();
    const d1 = prevW.clone().applyMatrix4(inv);
    const d2 = nextW.clone().applyMatrix4(inv);
    d1.y = 0;
    d2.y = 0; // proyectadas al plano de la rueda (eje Y local)
    if (d1.lengthSq() < 1e-6 || d2.lengthSq() < 1e-6) return null;
    d1.normalize();
    d2.normalize();
    const radio = roldana.localSizeAbs().x / 2;
    const suma = d1.clone().add(d2);
    if (suma.lengthSq() < 1e-4) {
      // Paso recto (los vecinos quedan opuestos): roza tangente por un lado —
      // se conserva el lado del ancla actual (dot con el local vigente).
      const perp = new THREE.Vector3(-d1.z, 0, d1.x);
      const actual = anclaActual ?? perp;
      if (perp.dot(actual) < 0) perp.negate();
      return perp.multiplyScalar(radio);
    }
    return suma.normalize().multiplyScalar(-radio);
  }

  /**
   * Reafina los nodos-roldana de un cable al punto de contacto tangente del
   * groove usando sus dos vecinos. Dos pasadas para que roldanas consecutivas
   * converjan (cada contacto depende del vecino ya refinado).
   */
  private refinarContactosCable(cable: Cable): void {
    for (let pasada = 0; pasada < 2; pasada++) {
      for (let i = 1; i < cable.nodes.length - 1; i++) {
        const obj = this.objects.get(cable.nodes[i].objectId);
        if (!obj || !this.isPulley(obj)) continue;
        const vecino = (j: number): THREE.Vector3 | null => {
          const o = this.objects.get(cable.nodes[j].objectId);
          if (!o) return null;
          o.mesh.updateMatrixWorld();
          const l = cable.nodes[j].local;
          return new THREE.Vector3(l.x, l.y, l.z).applyMatrix4(o.mesh.matrixWorld);
        };
        const prevW = vecino(i - 1);
        const nextW = vecino(i + 1);
        if (!prevW || !nextW) continue;
        const l = cable.nodes[i].local;
        const c = this.contactoGroove(obj, prevW, nextW, new THREE.Vector3(l.x, 0, l.z));
        if (c) cable.nodes[i].local = { x: c.x, y: c.y, z: c.z };
      }
    }
  }

  /** Posición de mundo del último punto colocado (para la línea elástica). */
  private placementAnchorWorld(): THREE.Vector3 | null {
    if (this.cableMode && this.cablePending.length > 0) {
      const last = this.cablePending[this.cablePending.length - 1];
      last.object.mesh.updateMatrixWorld();
      return last.local.clone().applyMatrix4(last.object.mesh.matrixWorld);
    }
    if (this.ropeMode && this.ropePendingA) {
      return this.ropeEndWorld(this.ropePendingA);
    }
    return null;
  }

  private showPlacementLine(a: THREE.Vector3, b: THREE.Vector3): void {
    if (!this.placementLine) {
      this.placementLine = new THREE.Line(
        new THREE.BufferGeometry(),
        new THREE.LineDashedMaterial({
          color: 0x22d3ee,
          dashSize: 3,
          gapSize: 2,
          depthTest: false,
          transparent: true,
          opacity: 0.9,
        }),
      );
      this.placementLine.renderOrder = 999;
      this.sceneManager.scene.add(this.placementLine);
    }
    this.placementLine.geometry.setFromPoints([a, b]);
    this.placementLine.computeLineDistances();
    this.placementLine.visible = true;
  }

  private clearPlacementPreview(): void {
    this.snap.hideIndicator();
    if (this.placementLine) this.placementLine.visible = false;
  }

  /**
   * Previsualiza el anclaje (indicador) y la línea recta al colocar
   * cable/cuerda/pieza de línea, y arrastra los nodos en modo doblado.
   */
  private onPointerMove = (event: PointerEvent): void => {
    if (this.marquee) {
      this.updateMarquee(event);
      return;
    }
    if (this.dragMove) {
      const rect = this.canvas.getBoundingClientRect();
      this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.pointer, this.sceneManager.camera);
      const cur = new THREE.Vector3();
      if (!this.dragPoint(this.dragMove.grabbed, this.dragMove.plane, cur)) return;
      const delta = cur.sub(this.dragMove.grabbed);
      this.emitDragMeasure(delta);
      for (const id of this.dragMove.ids) {
        const o = this.objects.get(id);
        const start = this.dragMove.starts.get(id);
        if (!o || !start) continue;
        o.mesh.position.copy(start).add(delta);
        this.actualizarAtadosDeObjeto(o.id);
        this.bus.emit("objectTransformed", { object: o });
      }
      this.cablesDirty = true;
      return;
    }
    // Agarre del maniquí: la articulación rota para que el punto agarrado siga
    // al puntero (o la figura entera se traslada si se agarró la pelvis).
    if (this.grabDrag) {
      const rect = this.canvas.getBoundingClientRect();
      this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.pointer, this.sceneManager.camera);
      const target = new THREE.Vector3();
      if (!this.dragPoint(this.grabDrag.origin, this.grabDrag.plane, target)) return;
      if (this.grabDrag.joint === "") {
        this.humanFigure?.position.copy(target.clone().add(this.grabDrag.grabLocal));
        this.bus.emit("dragMeasure", { text: tt("✋ Figura completa", "✋ Whole figure") });
        this.requestRender();
        return;
      }
      const joints = this.figureJoints();
      const j = joints?.[this.grabDrag.joint];
      if (!j || !j.parent) return;
      j.updateMatrixWorld(true);
      const pivot = j.getWorldPosition(new THREE.Vector3());
      const grabWorld = j.localToWorld(this.grabDrag.grabLocal.clone());
      const v1 = grabWorld.sub(pivot);
      const v2 = target.clone().sub(pivot);
      if (v1.lengthSq() < 1e-4 || v2.lengthSq() < 1e-4) return;
      const q = new THREE.Quaternion().setFromUnitVectors(v1.normalize(), v2.normalize());
      const pq = j.parent.getWorldQuaternion(new THREE.Quaternion());
      const lq = pq.clone().invert().multiply(q).multiply(pq);
      j.quaternion.premultiply(lq);
      this.clampJoint(this.grabDrag.joint);
      this.applyPoseSymmetry(this.grabDrag.joint);
      this.emitJointSelection();
      this.bus.emit("dragMeasure", { text: `✋ ${this.grabDrag.joint}` });
      this.requestRender();
      return;
    }
    // COLOCAR MANIQUÍ: el puntero va marcando dónde caería la figura.
    if (this.colocarFiguraMode) {
      const rectC = this.canvas.getBoundingClientRect();
      this.pointer.x = ((event.clientX - rectC.left) / rectC.width) * 2 - 1;
      this.pointer.y = -((event.clientY - rectC.top) / rectC.height) * 2 + 1;
      this.raycaster.setFromCamera(this.pointer, this.sceneManager.camera);
      this.marcarApoyo(this.apoyoBajoPuntero());
      return;
    }

    const simInteract = this.simulating && (this.simDrag !== null || this.figureDrag !== null);
    // AIM ASSIST DE LA MANO (v0.2.41): con la herramienta elegida, la pieza
    // que se agarraría se resalta al pasar por encima. Así se ve de un
    // vistazo qué es "estructura móvil" y qué no, sin tener que probar.
    if (this.simulating && !simInteract && this.simTool === "mano") {
      const rect0 = this.canvas.getBoundingClientRect();
      this.pointer.x = ((event.clientX - rect0.left) / rect0.width) * 2 - 1;
      this.pointer.y = -((event.clientY - rect0.top) / rect0.height) * 2 + 1;
      this.raycaster.setFromCamera(this.pointer, this.sceneManager.camera);
      this.resaltarAgarrable(this.piezaAgarrableBajoPuntero());
      return;
    }
    if (
      (this.simulating && !simInteract) ||
      (!this.simulating && !this.cableMode && !this.ropeMode && !this.lineMode && !this.bendDrag)
    ) {
      return;
    }
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.sceneManager.camera);

    // Arrastres de simulación: mano interactiva y posicionamiento del maniquí.
    if (simInteract) {
      const at = new THREE.Vector3();
      if (this.simDrag) {
        const destino = this.puntoDeArrastre();
        if (destino) this.physics?.dragTo(destino);
      } else if (this.figureDrag && this.humanFigure &&
        this.raycaster.ray.intersectPlane(this.figureDrag.plane, at)) {
        this.humanFigure.position.copy(at.add(this.figureDrag.offset));
      }
      return;
    }

    // Arrastre de un nodo de doblado: mueve el nodo en el plano de cámara y
    // reconstruye la pieza en vivo (curva Catmull-Rom por los nodos).
    if (this.bendDrag && this.bendTarget) {
      const hit = new THREE.Vector3();
      if (!this.dragPoint(this.bendDrag.origin, this.bendDrag.plane, hit)) return;
      const obj = this.bendTarget;
      // SOLDADOR de nodos (v0.2.3): el nodo arrastrado se IMANTA al punto de
      // conexión más cercano de OTRA figura (extremos, nodos, puntos medios)
      // — así se arman estructuras complejas uniendo nodo con nodo.
      const soldadura = this.puntoSoldadura(hit, obj);
      if (soldadura) {
        hit.copy(soldadura.punto);
        this.snap.showIndicator(soldadura.punto);
        // Candidato a soldadura: se consuma al SOLTAR el nodo sobre el imán.
        this.bendWeld = { objetoId: soldadura.objeto.id, punto: soldadura.punto.clone() };
      } else {
        this.snap.hideIndicator();
        this.bendWeld = null;
      }
      this.emitDragMeasure(hit.clone().sub(this.bendDrag.origin));
      obj.mesh.updateMatrixWorld(true);
      const local = hit.applyMatrix4(obj.mesh.matrixWorld.clone().invert());
      obj.params.path![this.bendDrag.index] = [local.x, local.y, local.z];
      this.normalizarPathRecto(obj);
      obj.rebuildGeometry();
      this.refreshBendHandles();
      this.bus.emit("objectTransformed", { object: obj });
      return;
    }

    // Trazado de pieza de línea: imán de puntería + línea elástica.
    if (this.lineMode) {
      const pick = this.pickLinePlacePoint();
      let point: THREE.Vector3 | null = pick?.point ?? null;
      if (this.axisLock && this.linePendingA) point = this.lockedLinePoint(this.linePendingA);
      if (!point) {
        this.clearPlacementPreview();
        this.bus.emit("dragMeasure", { text: null });
        return;
      }
      if (pick?.snapped && !this.axisLock) this.snap.showIndicator(pick.point);
      else this.snap.hideIndicator();
      if (this.linePendingA) {
        this.showPlacementLine(this.linePendingA, point);
        this.bus.emit("dragMeasure", {
          text: `Longitud: ${formatCm(this.linePendingA.distanceTo(point))}`,
        });
      } else if (this.placementLine) this.placementLine.visible = false;
      return;
    }

    let world: THREE.Vector3 | null = null;
    let onPiece = false;
    const pick = this.pickAnchorPoint();
    if (pick) {
      world = pick.world;
      onPiece = true;
    } else if (this.ropeMode) {
      // La cuerda admite anclas libres sobre el suelo (y=0).
      const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const p = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(ground, p)) world = p;
    }

    if (!world) {
      this.clearPlacementPreview();
      return;
    }
    if (onPiece) this.snap.showIndicator(world);
    else this.snap.hideIndicator();
    const from = this.placementAnchorWorld();
    if (from) this.showPlacementLine(from, world);
    else if (this.placementLine) this.placementLine.visible = false;
  };

  private pickRopeEnd(): RopeEnd | null {
    const pick = this.pickAnchorPoint();
    if (pick) return { objectId: pick.object.id, local: pick.local };
    // Sin pieza: ancla libre sobre el plano del suelo (y=0).
    const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const p = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(ground, p)) {
      return { objectId: null, local: p };
    }
    return null;
  }

  /** Coordenada de mundo de un extremo de cuerda. */
  private ropeEndWorld(end: RopeEnd): THREE.Vector3 {
    if (end.objectId) {
      const obj = this.objects.get(end.objectId);
      if (obj) {
        obj.mesh.updateMatrixWorld();
        return end.local.clone().applyMatrix4(obj.mesh.matrixWorld);
      }
    }
    return end.local.clone();
  }

  /**
   * Plantilla de segmento memoizada por tipo de cuerda: la referencia estable
   * permite a Rope.rebuild detectar si de verdad cambió (y no reconstruir su
   * geometría unitaria en cada arrastre). Se invalida al cambiar la biblioteca.
   */
  private ropeTemplates = new Map<RopeKind, THREE.BufferGeometry | null>();

  private ropeSegTemplate(kind: RopeKind): THREE.BufferGeometry | null {
    if (!this.ropeTemplates.has(kind)) {
      this.ropeTemplates.set(
        kind,
        componentModels.geometryClone(kind === "chain" ? "cadena-eslabones" : "liston-kevlar"),
      );
    }
    return this.ropeTemplates.get(kind)!;
  }

  private clearRopeTemplates(): void {
    for (const g of this.ropeTemplates.values()) g?.dispose();
    this.ropeTemplates.clear();
  }

  private rebuildRope(rope: Rope): void {
    rope.rebuild(this.ropeEndWorld(rope.a), this.ropeEndWorld(rope.b), this.ropeSegTemplate(rope.kind));
  }

  private rebuildAllRopes(): void {
    for (const r of this.ropes.values()) this.rebuildRope(r);
  }

  /**
   * VINCULA UNA PIEZA A LAS GUÍAS QUE LA ATRAVIESAN (v0.3.3).
   *
   * Es el gesto que arma un mecanismo de guía tubular —una Smith, una prensa
   * de piernas, un hack squat—: se tienden las barras cromadas, se coloca el
   * carro encima con el gizmo y, al soltarlo, la pieza queda ENHEBRADA. Por
   * cada guía que la cruza se abre un canal redondo de verdad en su malla, del
   * diámetro del tubo más la holgura de deslizamiento, igual que el orificio
   * pasante de un carro real.
   *
   * A partir de ahí el motor hace el resto: una pieza con canales es
   * «pasante», y su recorrido queda circunscrito a la recta de sus guías, con
   * los topes acotándolo — las mismas reglas que ya gobernaban la pila de
   * pesos sobre sus tubos.
   *
   * El canal se cala por un eje LOCAL de la pieza, así que la guía tiene que
   * venir alineada con uno (hasta 12° de desvío, que la holgura absorbe). Si
   * no lo está, esa guía no se toma: el carro va montado a escuadra con sus
   * barras, también en la máquina real.
   */
  vincularAGuias(obj: SceneObject, soloGuias?: ReadonlySet<string>): number {
    if (obj.componentId === "guia-tubular") return 0;
    // Un TOPE no se enhebra: se MONTA sobre la guía más cercana, coaxial, a la
    // altura a la que se soltó. Desde ahí el motor lo toma por espaciador y
    // acota el recorrido del carro.
    if (obj.componentId === "tope-guia") {
      this.montarTopeEnGuia(obj);
      return 0;
    }
    obj.mesh.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(obj.mesh.matrixWorld).invert();
    // Caja LOCAL de la pieza SIN sus canales: los agujeros ya abiertos no
    // pueden decidir si cabe otro.
    // Caja LOCAL de la pieza. Vale la de la malla actual aunque ya tenga
    // canales abiertos: perforar no añade material por fuera, solo lo quita
    // por dentro, así que la caja es la misma.
    obj.mesh.geometry.computeBoundingBox();
    const caja = obj.mesh.geometry.boundingBox!.clone();
    const ejes: ("x" | "y" | "z")[] = ["x", "y", "z"];
    const canales: CanalTubo[] = [];
    // ADMINISTRACIÓN ACOTADA (v0.3.7): cuando el gesto viene de un grupo
    // concreto de guías —las que tienen el interruptor puesto—, solo esas se
    // recalculan. Los canales que la pieza ya tenga de OTRAS guías se
    // conservan: administrar una guía no es rehacer la pieza entera.
    if (soloGuias) {
      for (const c of obj.params.canales ?? []) {
        if (!c.guia || !soloGuias.has(c.guia)) canales.push(c);
      }
    }
    for (const g of this.objects.values()) {
      if (g === obj || g.componentId !== "guia-tubular") continue;
      if (soloGuias && !soloGuias.has(g.id)) continue;
      const largo = g.params.height ?? 0;
      const radio = Math.max(g.params.radiusTop ?? 0, g.params.radiusBottom ?? 0);
      if (!(largo > 1) || !(radio > 0.05)) continue;
      g.mesh.updateMatrixWorld();
      // Los dos extremos del tubo, llevados al frame local de la pieza.
      const p0 = new THREE.Vector3(0, -largo / 2, 0)
        .applyMatrix4(g.mesh.matrixWorld)
        .applyMatrix4(inv);
      const p1 = new THREE.Vector3(0, largo / 2, 0)
        .applyMatrix4(g.mesh.matrixWorld)
        .applyMatrix4(inv);
      const dir = p1.clone().sub(p0);
      const L = dir.length();
      if (L < 1) continue;
      dir.divideScalar(L);
      // Eje local dominante; se pide alineación (cos 12° ≈ 0,978).
      let eje: "x" | "y" | "z" = "y";
      let mejor = 0;
      for (const e of ejes) {
        const c = Math.abs(dir[e]);
        if (c > mejor) {
          mejor = c;
          eje = e;
        }
      }
      if (mejor < 0.978) continue;
      // Punto donde el tubo cruza el plano medio de la pieza (el que contiene
      // su origen local y es perpendicular al eje): ahí va el centro del canal.
      const t = (0 - p0[eje]) / dir[eje];
      const cruce = p0.clone().addScaledVector(dir, t);
      const [iu, iv]: ("x" | "y" | "z")[] =
        eje === "x" ? ["y", "z"] : eje === "y" ? ["z", "x"] : ["x", "y"];
      // ¿Pasa DE VERDAD por dentro? El centro del canal tiene que caer en la
      // sección de la pieza, y el tubo tiene que solapar con su grosor.
      // EL CANAL TIENE QUE CABER ENTERO (v0.3.4). Antes se miraba solo el
      // CENTRO del cruce contra la caja: una guía rozando el canto abría un
      // canal que se salía por el borde y se comía la cara lateral de la
      // pieza. Se pide el radio de holgura por dentro.
      const holgura = radio + 0.35;
      if (cruce[iu] - holgura < caja.min[iu] || cruce[iu] + holgura > caja.max[iu]) continue;
      if (cruce[iv] - holgura < caja.min[iv] || cruce[iv] + holgura > caja.max[iv]) continue;
      const sTubo = [p0[eje], p1[eje]].sort((a, b) => a - b);
      if (sTubo[1] < caja.min[eje] || sTubo[0] > caja.max[eje]) continue;
      canales.push({
        eje,
        u: +cruce[iu].toFixed(3),
        v: +cruce[iv].toFixed(3),
        // HOLGURA de deslizamiento: sin ella el tubo roza la pared del canal
        // y el carro se agarrota en cuanto la malla tiene un vértice de más.
        radio: +(radio + 0.35).toFixed(3),
        guia: g.id,
      });
    }
    const antes = JSON.stringify(obj.params.canales ?? []);
    const ahora = JSON.stringify(canales);
    if (antes === ahora) return canales.length;
    obj.setCanales(canales, componentModels.geometryClone(obj.componentId));
    this.bus.emit("objectsChanged", { objects: this.listObjects() });
    this.scheduleAutosave();
    this.requestRender();
    return canales.length;
  }

  /**
   * MONTA UN TOPE SOBRE SU GUÍA (v0.3.3): busca la guía tubular más cercana,
   * lo centra en su recta a la altura a la que se soltó y lo alinea con ella.
   * El tope queda ensartado, como el espaciador de goma de una prensa real, y
   * el motor lo reconoce ahí mismo como freno del recorrido.
   */
  private montarTopeEnGuia(tope: SceneObject): boolean {
    tope.mesh.updateMatrixWorld();
    const c = tope.mesh.position;
    let mejor: { g: SceneObject; s: number; d: number } | null = null;
    for (const g of this.objects.values()) {
      if (g === tope || g.componentId !== "guia-tubular") continue;
      const largo = g.params.height ?? 0;
      if (!(largo > 1)) continue;
      g.mesh.updateMatrixWorld();
      const eje = new THREE.Vector3(0, 1, 0).applyQuaternion(g.mesh.quaternion).normalize();
      const s = THREE.MathUtils.clamp(
        c.clone().sub(g.mesh.position).dot(eje),
        -largo / 2,
        largo / 2,
      );
      const punto = g.mesh.position.clone().addScaledVector(eje, s);
      const d = punto.distanceTo(c);
      // Solo si se soltó CERCA de la guía: si no, el tope se queda donde está.
      if (d > 25) continue;
      if (!mejor || d < mejor.d) mejor = { g, s, d };
    }
    if (!mejor) return false;
    const eje = new THREE.Vector3(0, 1, 0).applyQuaternion(mejor.g.mesh.quaternion).normalize();
    tope.mesh.position.copy(mejor.g.mesh.position).addScaledVector(eje, mejor.s);
    tope.mesh.quaternion.copy(mejor.g.mesh.quaternion);
    tope.mesh.updateMatrixWorld(true);
    this.bus.emit("objectTransformed", { object: tope });
    this.scheduleAutosave();
    this.requestRender();
    return true;
  }

  /**
   * Rehace los canales de lo que acabe de soltar el gizmo (pieza o grupo).
   * Público desde v0.3.7 para que las pruebas ejerciten EL MISMO camino que
   * corre al soltar, en vez de una imitación suya.
   */
  enhebrarSeleccion(): void {
    const tocadas: SceneObject[] = [];
    if (this.multiSel.size > 0) {
      for (const id of this.multiSel) {
        const o = this.objects.get(id);
        if (o) tocadas.push(o);
      }
    } else if (this.selectedGroupId) {
      const ids = this.groups.get(this.selectedGroupId)?.ids ?? [];
      for (const id of ids) {
        const o = this.objects.get(id);
        if (o) tocadas.push(o);
      }
    } else if (this.selected) tocadas.push(this.selected);
    for (const o of tocadas) {
      // El TOPE se monta sobre su guía siempre que se suelte cerca: es un
      // gesto de colocación, no de vinculación, y no pasa por el interruptor.
      if (o.componentId === "tope-guia") {
        this.montarTopeEnGuia(o);
        continue;
      }
      if (this.guiasAdmin.size === 0) continue;
      this.vincularAGuias(o, this.guiasAdmin);
    }
  }

  // ------------------------------------------- administrar vinculación
  /**
   * ADMINISTRAR VINCULACIÓN (v0.3.7).
   *
   * Hasta v0.3.6 cualquier pieza que se soltara encima de una guía quedaba
   * enhebrada por el mero hecho de pasar por ahí: el canal se abría solo. Era
   * cómodo mientras la escena tenía dos barras, y un incordio en cuanto tenía
   * ocho — una pieza que solo cruzaba el aire delante de una guía volvía
   * agujereada, y quitar un vínculo obligaba a apartar la pieza del todo.
   *
   * Ahora la guía manda. Se enciende su interruptor —«administrar
   * vinculación»—, se hace clic en las piezas que deben correr por ella y se
   * las coloca con el gizmo: al soltarlas se canaliza su recorrido. Mientras
   * el interruptor está apagado, mover una pieza junto a la guía no le hace
   * nada. Se pueden administrar VARIAS guías a la vez, encendiendo el
   * interruptor de cada una: la pieza que se coloque abrirá canal para todas
   * las que la crucen de verdad.
   *
   * Es un estado de trabajo, no del proyecto: no se guarda en el archivo.
   */
  private readonly guiasAdmin = new Set<string>();

  /** ¿Está esta guía administrando su vinculación? */
  administraGuia(id: string): boolean {
    return this.guiasAdmin.has(id);
  }

  /** Guías con el interruptor puesto. */
  guiasAdministradas(): string[] {
    return [...this.guiasAdmin];
  }

  /**
   * Enciende o apaga el interruptor de una guía. Solo lo aceptan las guías
   * tubulares: es su propiedad, no la de la pieza que se enhebra.
   */
  administrarVinculacion(id: string, on: boolean): boolean {
    const g = this.objects.get(id);
    if (!g || g.componentId !== "guia-tubular") return false;
    if (on) this.guiasAdmin.add(id);
    else this.guiasAdmin.delete(id);
    this.bus.emit("vinculacionChanged", { guias: this.guiasAdministradas() });
    return true;
  }

  /** Apaga todos los interruptores de una vez. */
  terminarAdministracion(): void {
    if (this.guiasAdmin.size === 0) return;
    this.guiasAdmin.clear();
    this.bus.emit("vinculacionChanged", { guias: [] });
  }

  /**
   * Una pieza a la que se acaba de hacer clic mientras hay guías
   * administrándose: si ya está en su sitio, se canaliza ahí mismo, sin
   * pedirle al usuario que la mueva un milímetro para nada.
   */
  private enhebrarAlSeleccionar(obj: SceneObject | null): void {
    if (!obj || this.guiasAdmin.size === 0) return;
    if (obj.componentId === "guia-tubular" || obj.componentId === "tope-guia") return;
    this.vincularAGuias(obj, this.guiasAdmin);
  }

  /**
   * TODO LO QUE CUELGA DE UNA PIEZA la sigue cuando esa pieza se mueve: las
   * cuerdas tendidas desde ella y las guías tubulares amarradas a ella por
   * alguno de sus dos extremos.
   */
  private actualizarAtadosDeObjeto(objectId: string): void {
    for (const r of this.ropes.values()) {
      if (r.a.objectId === objectId || r.b.objectId === objectId) this.rebuildRope(r);
    }
    for (const g of this.objects.values()) {
      const an = g.params.anclajes;
      if (!an) continue;
      if (an.a?.obj === objectId || an.b?.obj === objectId) this.retenderGuia(g);
    }
  }

  /**
   * Punto de amarre de una guía: el punto de mundo señalado, expresado en
   * coordenadas LOCALES de la pieza sobre la que cayó. Sin pieza no hay
   * anclaje —el extremo queda suelto en el aire, que también vale.
   */
  private anclajeEn(
    obj: SceneObject | undefined,
    punto: THREE.Vector3,
  ): { obj: string; local: [number, number, number] } | null {
    if (!obj) return null;
    obj.mesh.updateMatrixWorld();
    const inv = new THREE.Matrix4().copy(obj.mesh.matrixWorld).invert();
    const l = punto.clone().applyMatrix4(inv);
    return { obj: obj.id, local: [l.x, l.y, l.z] };
  }

  /**
   * VUELVE A TENDER una guía tubular entre sus dos anclajes: recalcula su
   * largo, su sitio y su dirección. Con un solo anclaje resuelto se queda
   * donde está —no hay recta que trazar con un punto.
   */
  private retenderGuia(g: SceneObject): void {
    const an = g.params.anclajes;
    if (!an?.a || !an?.b) return;
    const A = this.objects.get(an.a.obj);
    const B = this.objects.get(an.b.obj);
    if (!A || !B) return;
    A.mesh.updateMatrixWorld();
    B.mesh.updateMatrixWorld();
    const a = new THREE.Vector3(...an.a.local).applyMatrix4(A.mesh.matrixWorld);
    const b = new THREE.Vector3(...an.b.local).applyMatrix4(B.mesh.matrixWorld);
    const dir = b.clone().sub(a);
    const L = dir.length();
    if (L < 2) return;
    dir.divideScalar(L);
    if (Math.abs((g.params.height ?? 0) - L) > 0.01) {
      g.params.height = L;
      g.rebuildGeometry();
    }
    g.mesh.position.copy(a).add(b).multiplyScalar(0.5);
    g.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    g.mesh.updateMatrixWorld(true);
    // Y LO QUE CUELGUE DE ESTA GUÍA la sigue a su vez (v0.3.4): otra guía
    // tendida entre dos rails, un cable anclado en ella. El centinela corta la
    // recursión si dos guías acabaran amarradas la una a la otra.
    if (this.retendiendo.has(g.id)) return;
    this.retendiendo.add(g.id);
    try {
      this.bus.emit("objectTransformed", { object: g });
    } finally {
      this.retendiendo.delete(g.id);
    }
  }

  /** Guías que se están retendiendo ahora mismo (corta la recursión). */
  private retendiendo = new Set<string>();

  createRope(kind: RopeKind, a: RopeEnd, b: RopeEnd, slack?: number, name?: string): Rope {
    const rope = new Rope({ kind, a, b, slack, name });
    this.ropes.set(rope.id, rope);
    this.ropeVisuals.add(rope.group);
    this.rebuildRope(rope);
    this.bus.emit("objectsChanged", { objects: this.listObjects() });
    return rope;
  }

  listRopes(): Rope[] {
    return [...this.ropes.values()];
  }

  setRopeSlack(id: string, slack: number): void {
    const rope = this.ropes.get(id);
    if (!rope) return;
    rope.slack = Math.max(0, Math.min(1, slack));
    this.rebuildRope(rope);
    if (this.selectedRopeId === id) {
      this.bus.emit("ropeSelectionChanged", { id, name: rope.name, slack: rope.slack });
    }
    this.scheduleAutosave();
  }

  deleteRope(id: string): void {
    const rope = this.ropes.get(id);
    if (!rope) return;
    this.ropeVisuals.remove(rope.group);
    rope.dispose();
    this.ropes.delete(id);
    if (this.selectedRopeId === id) {
      this.selectedRopeId = null;
      this.bus.emit("ropeSelectionChanged", null);
    }
    this.bus.emit("objectsChanged", { objects: this.listObjects() });
    this.scheduleAutosave();
  }

  private selectRope(id: string): void {
    const rope = this.ropes.get(id);
    if (!rope) return;
    this.select(null);
    this.selectedRopeId = id;
    this.bus.emit("ropeSelectionChanged", { id, name: rope.name, slack: rope.slack });
  }

  // -------------------------------------- herramientas de simulación
  /**
   * Arrastre de mano activo. Para una pieza LIBRE el objetivo se busca en un
   * plano frente a la cámara; para una pieza ARTICULADA se busca sobre el
   * ARCO que su bisagra le permite recorrer (v0.2.38): así el tirón entra
   * entero como giro en vez de estrellarse contra el pasador.
   */
  private simDrag: {
    plane: THREE.Plane;
    arco?: { centro: THREE.Vector3; eje: THREE.Vector3; radio: number };
  } | null = null;
  /** Arrastre del maniquí (plano horizontal + offset al punto de agarre). */
  private figureDrag: { plane: THREE.Plane; offset: THREE.Vector3 } | null = null;

  /**
   * Clic durante la simulación: si toca una pieza dinámica, la AGARRA con la
   * mano interactiva (resorte físico, como una persona tirando de un agarre);
   * si toca el maniquí, lo desliza por el suelo para situarlo.
   */
  private beginSimInteraction(): void {
    // Se recorren TODOS los impactos, no solo el primero: si delante hay una
    // pieza anclada (un montante, el respaldo), la mano sigue buscando detrás
    // hasta encontrar algo que de verdad se pueda mover. El rayo es
    // RECURSIVO para que también cuenten las mallas hijas (placas de la pila,
    // discos cargados).
    const hits = this.raycaster.intersectObjects(this.sceneManager.content.children, true);
    for (const hit of hits) {
      const id = hit.object.userData.sceneObjectId as string | undefined;
      const obj = id ? this.objects.get(id) : undefined;
      if (!obj) continue;
      const arco = this.arcoDeAgarre(obj.id, hit.point);
      if (!this.physics?.grab(obj.id, hit.point, !!arco)) continue;
      const normal = this.sceneManager.camera.getWorldDirection(new THREE.Vector3());
      this.simDrag = {
        plane: new THREE.Plane().setFromNormalAndCoplanarPoint(normal, hit.point),
        arco,
      };
      this.orbit.enabled = false;
      return;
    }
    // Nada agarrable en esa dirección: si lo que hay es estructura anclada,
    // se dice — antes el clic no hacía nada y parecía que la herramienta no
    // reconocía la pieza.
    if (hits.length > 0 && !this.humanFigure) {
      const id0 = hits[0].object.userData.sceneObjectId as string | undefined;
      const o0 = id0 ? this.objects.get(id0) : undefined;
      if (o0) {
        this.avisoTemporal(
          tt(`"${o0.name}" está anclada: no se puede mover`, `"${o0.name}" is anchored: it can't be moved`),
        );
      }
    }
    if (this.humanFigure) {
      const fHits = this.raycaster.intersectObjects([this.humanFigure], true);
      if (fHits[0]) {
        const p = this.humanFigure.position;
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -p.y);
        const at = new THREE.Vector3();
        if (this.raycaster.ray.intersectPlane(plane, at)) {
          this.figureDrag = { plane, offset: p.clone().sub(at) };
          this.orbit.enabled = false;
        }
      }
    }
  }

  /**
   * Arco que la pieza agarrada puede recorrer: circunferencia centrada en su
   * eje de giro y que pasa por el punto de agarre. Devuelve null si la pieza
   * es libre (o si se la agarró justo sobre el pasador, donde no hay palanca).
   */
  private arcoDeAgarre(
    objectId: string,
    punto: THREE.Vector3,
  ): { centro: THREE.Vector3; eje: THREE.Vector3; radio: number } | undefined {
    const bis = this.physics?.ejeDeGiro(objectId);
    if (!bis) return undefined;
    const centro = bis.punto
      .clone()
      .add(bis.eje.clone().multiplyScalar(punto.clone().sub(bis.punto).dot(bis.eje)));
    const radio = punto.distanceTo(centro);
    return radio > 3 ? { centro, eje: bis.eje, radio } : undefined;
  }

  /**
   * Punto al que la mano lleva la pieza según el puntero: sobre el arco de su
   * bisagra si la tiene, y si no en el plano frente a la cámara.
   */
  private puntoDeArrastre(): THREE.Vector3 | null {
    const d = this.simDrag;
    if (!d) return null;
    const ray = this.raycaster.ray;
    if (d.arco) {
      const { centro, eje, radio } = d.arco;
      const q = new THREE.Vector3();
      const plano = new THREE.Plane().setFromNormalAndCoplanarPoint(eje, centro);
      // Con el rayo casi contenido en el plano del arco la intersección se
      // dispara al infinito: en ese caso se toma el punto del rayo más
      // cercano al eje, que es la lectura estable de "hacia dónde apunta".
      if (Math.abs(ray.direction.dot(eje)) < 0.15 || !ray.intersectPlane(plano, q)) {
        ray.closestPointToPoint(centro, q);
      }
      const radial = q.sub(centro).projectOnPlane(eje);
      if (radial.lengthSq() < 1e-6) return null;
      // El objetivo se deja EXACTAMENTE sobre el arco: así el esfuerzo que
      // mide la mano es el que de verdad cuesta girar la pieza y no incluye
      // el tirón radial que se come el pasador.
      return radial.setLength(radio).add(centro);
    }
    const at = new THREE.Vector3();
    return ray.intersectPlane(d.plane, at) ? at : null;
  }

  // ------------------------------------------ COLOCAR MANIQUÍ (v0.2.41)
  /**
   * Herramienta de COLOCAR MANIQUÍ: el puntero recorre el suelo y los puntos
   * de apoyo ergonómicos (asientos, respaldos, bancos) marcando dónde caería
   * la figura, y el clic la deja ahí con la orientación que corresponde —
   * sentada mirando al frente del asiento, o de pie sobre el suelo mirando a
   * la máquina más cercana. Funciona igual en construcción y en simulación,
   * y por tanto en el Builder y en el Viewer.
   */
  beginColocarFigura(): void {
    this.cancelConnect();
    this.cancelCable();
    this.cancelFrenoCable();
    this.cancelRope();
    this.colocarFiguraMode = true;
    this.bus.emit("colocarFiguraChanged", { active: true });
    this.avisoTemporal(
      tt(
        "Maniquí: toca el SUELO o un apoyo (asiento, respaldo, banco) para colocarlo",
        "Mannequin: tap the FLOOR or a support (seat, backrest, bench) to place it",
      ),
    );
  }

  cancelColocarFigura(): void {
    if (!this.colocarFiguraMode) return;
    this.colocarFiguraMode = false;
    this.quitarMarcaApoyo();
    this.bus.emit("colocarFiguraChanged", { active: false });
  }

  isColocarFigura(): boolean {
    return this.colocarFiguraMode;
  }

  /** ¿Es esta pieza un APOYO donde el maniquí puede sentarse o recostarse? */
  private esApoyoErgonomico(obj: SceneObject): boolean {
    const def = getDefinition(obj.componentId);
    if (def?.category === "ergonomico") {
      return obj.componentId === "asiento" || obj.componentId === "respaldo";
    }
    // Los bancos y asientos de las máquinas se nombran así aunque su pieza
    // sea una caja tapizada cualquiera.
    return /asiento|respaldo|banco|seat|bench/i.test(obj.name);
  }

  /**
   * Punto de colocación bajo el puntero: apoyo ergonómico o suelo.
   *
   * La PRIMERA pieza que encuentra el rayo manda. Si es un apoyo, ahí va la
   * figura; si es cualquier otra cosa —la pila de pesos, un montante— NO se
   * cuela al suelo que hay detrás: eso mandaba el maniquí a metros de
   * distancia, al punto donde el rayo pinchaba el plano y = 0 después de
   * atravesar media máquina.
   */
  private apoyoBajoPuntero(): { punto: THREE.Vector3; obj: SceneObject | null } | null {
    const hits = this.raycaster.intersectObjects(this.sceneManager.content.children, true);
    for (const h of hits) {
      const id = h.object.userData.sceneObjectId as string | undefined;
      const obj = id ? this.objects.get(id) : undefined;
      if (!obj) continue;
      if (!this.esApoyoErgonomico(obj)) return null; // pieza que no es apoyo: tapa el suelo
      // RESPALDO: nadie se sienta ENCIMA de un respaldo. El clic sobre él
      // vale como "siéntate contra este respaldo", así que la figura va al
      // asiento más cercano.
      if (/respaldo|back/i.test(obj.name) || obj.componentId === "respaldo") {
        const asiento = this.piezaCercana(
          h.point,
          (o) => o !== obj && (/asiento|banco|seat|bench/i.test(o.name) || o.componentId === "asiento"),
        );
        if (asiento) {
          const caja = new THREE.Box3().setFromObject(asiento.mesh);
          const centro = caja.getCenter(new THREE.Vector3());
          return { punto: new THREE.Vector3(centro.x, caja.max.y, centro.z), obj: asiento };
        }
      }
      return { punto: h.point.clone(), obj };
    }
    // Nada delante: el SUELO (plano y = 0).
    const suelo = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const p = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(suelo, p) ? { punto: p, obj: null } : null;
  }

  /** Anillo que marca dónde caería la figura. */
  private marcarApoyo(destino: { punto: THREE.Vector3; obj: SceneObject | null } | null): void {
    if (!destino) {
      this.quitarMarcaApoyo();
      return;
    }
    if (!this.marcaApoyo) {
      this.marcaApoyo = new THREE.Mesh(
        new THREE.RingGeometry(9, 13, 32),
        new THREE.MeshBasicMaterial({ color: 0x2f7dd1, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthTest: false }),
      );
      this.marcaApoyo.rotation.x = -Math.PI / 2;
      this.marcaApoyo.renderOrder = 999;
      this.references.add(this.marcaApoyo);
    }
    this.marcaApoyo.position.copy(destino.punto).add(new THREE.Vector3(0, 0.6, 0));
    (this.marcaApoyo.material as THREE.MeshBasicMaterial).color.setHex(destino.obj ? 0x7fd08a : 0x2f7dd1);
    this.canvas.style.cursor = "crosshair";
    this.requestRender();
  }

  private quitarMarcaApoyo(): void {
    if (!this.marcaApoyo) return;
    this.references.remove(this.marcaApoyo);
    this.marcaApoyo.geometry.dispose();
    (this.marcaApoyo.material as THREE.Material).dispose();
    this.marcaApoyo = null;
    this.canvas.style.cursor = "";
    this.requestRender();
  }

  /**
   * Deja la figura en el punto marcado. Sobre un APOYO se sienta y mira hacia
   * el frente del asiento (el lado opuesto a su respaldo); sobre el SUELO se
   * queda de pie mirando a la máquina más cercana.
   */
  private async colocarFiguraEn(destino: { punto: THREE.Vector3; obj: SceneObject | null }): Promise<void> {
    if (!this.humanFigure) await this.addHumanFigure();
    const fig = this.humanFigure;
    if (!fig) return;
    const frente = new THREE.Vector3(0, 0, 1);
    if (destino.obj) {
      // Sentada, la figura NO se re-aterriza: lo que la sostiene es el asiento.
      this.figuraApoyadaEn = "pieza";
      this.alturaDelApoyo = new THREE.Box3().setFromObject(destino.obj.mesh).max.y;
      // ¿SE SIENTA O SE TUMBA? En una banca plana y larga sin respaldo, el
      // medio no es sitio para sentarse: es donde uno SE ACUESTA, y la propia
      // banca hace de respaldo. Los extremos siguen siendo asiento.
      if (this.esParaTumbarse(destino.obj, destino.punto)) {
        this.acostarEnLaBanca(fig, destino.obj, destino.punto);
        this.lastFigureTransform = { position: fig.position.clone(), quaternion: fig.quaternion.clone() };
        this.marcarPoseDePartida("Tumbado");
        if (this.physics) this.physics.añadirFigura(fig);
        this.requestRender();
        this.scheduleAutosave();
        return;
      }
      this.tumbadaEnElApoyo = false;
      this.applyPose("Sentado", false);
      // La figura se APOYA sobre la cara superior del asiento. Aquí NO se
      // "aterriza": sentada, lo que toca el suelo son los pies por su cuenta,
      // y bajarla hasta que lleguen la hundiría en el asiento.
      const caja = new THREE.Box3().setFromObject(destino.obj.mesh);
      // HACIA DÓNDE MIRA: se MIDE, no se adivina por el nombre de las piezas
      // vecinas. Ver frenteAlSentarse.
      frente.copy(this.frenteAlSentarse(fig, destino.obj, destino.punto, caja.max.y));
      fig.position.set(destino.punto.x, caja.max.y, destino.punto.z);
      // El origen de la raíz NO es la cara inferior del cuerpo: los glúteos y
      // los muslos cuelgan por debajo de él, así que dejarlo a ras del asiento
      // hundía media pelvis dentro de la pieza (8,8 cm medidos). Se levanta lo
      // que haga falta para que la carne SE POSE sobre la superficie.
      fig.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(frente.x, frente.z));
      // Y la espalda contra el respaldo: un apoyo solo apoya si se toca, y en
      // un respaldo RECLINADO tocarlo exige reclinarse (v0.3.11) — deslizar
      // hacia atrás con el tronco vertical dejaba la espalda a 11,5 cm de la
      // placa, tocando sólo con la pelvis.
      const respaldo = this.respaldoDelAsiento(destino.punto, destino.obj);
      this.apoyoEspalda = respaldo?.id ?? null;
      if (respaldo) this.reclinarComoElRespaldo(fig, respaldo, frente);
      fig.position.y += caja.max.y - this.baseDeApoyoSentado(fig);
      if (respaldo) this.deslizarHastaElRespaldo(fig, respaldo);
      // Sentada en un banco bajo, la pierna no cabe entre el asiento y el
      // suelo: se estira la rodilla, como haría cualquiera.
      this.noHundirse();
    } else {
      const maquina = this.piezaCercana(destino.punto, (o) => o.physics.fixed);
      if (maquina) {
        frente.copy(maquina.mesh.position).sub(destino.punto).setY(0);
        if (frente.lengthSq() < 1e-4) frente.set(0, 0, 1);
        frente.normalize();
      }
      this.figuraApoyadaEn = "suelo";
      this.alturaDelApoyo = null;
      this.apoyoEspalda = null;
      this.tumbadaEnElApoyo = false;
      this.applyPose("De pie", false);
      fig.position.set(destino.punto.x, 0, destino.punto.z);
      // De pie no hay reclinación que valga: sólo mira hacia donde toca. (En
      // el asiento el giro ya quedó puesto arriba, con su inclinación.)
      fig.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(frente.x, frente.z));
    }
    if (!destino.obj) (fig.userData.ground as (() => void) | undefined)?.();
    this.lastFigureTransform = { position: fig.position.clone(), quaternion: fig.quaternion.clone() };
    // Colocar define la PARTIDA: es el sitio y la pose desde los que arranca.
    this.marcarPoseDePartida(destino.obj ? "Sentado" : "De pie");
    // Colocar funciona también con la simulación en marcha: el cuerpo de la
    // figura en el motor se rehace en el sitio definitivo (si no, chocaría
    // desde la pose anterior).
    if (this.physics) this.physics.añadirFigura(fig);
    this.requestRender();
    this.scheduleAutosave();
    this.avisoTemporal(
      destino.obj
        ? tt(`Maniquí sentado en "${destino.obj.name}"`, `Mannequin seated on "${destino.obj.name}"`)
        : tt("Maniquí de pie en el suelo", "Mannequin standing on the floor"),
    );
  }

  /**
   * TOPE DE ESTRUCTURA PARA ▲▼ (v0.2.43).
   *
   * El maniquí no tiene cuerpo en el motor: un brazo liberado entraba en un
   * pilar como si fuera aire (medidos 3 cm en la UpperMachine). Antes de dar
   * por bueno un paso de ▲▼ se mide cuánto penetra el segmento movido en las
   * cajas del hierro; si el paso EMPEORA la penetración, se deshace y la
   * articulación se queda donde estaba, que es lo que haría la máquina real.
   *
   * Solo actúa con la simulación en marcha: POSAR la figura sigue siendo
   * libre, porque es lo que fija la postura de partida.
   */
  private cajasEstructura: ReturnType<PhysicsWorld["cajasDeColision"]> | null = null;
  /** ¿El último paso de 8/9 dejó algún segmento dentro del hierro? */
  contactoConEstructura = false;

  /**
   * Cajas del hierro cercanas a la figura (el resto no puede estorbar).
   *
   * Los APOYOS ERGONÓMICOS quedan fuera: asiento, respaldo y banco existen
   * para que el cuerpo se pose en ellos, así que tocarlos no es "estorbar" —
   * tratarlos como estorbo era lo que separaba al maniquí de su propio
   * asiento y lo dejaba flotando.
   */
  private cajasCercaDeLaFigura(): ReturnType<PhysicsWorld["cajasDeColision"]> | null {
    if (!this.physics || !this.humanFigure) return null;
    const apoyos = new Set<string>();
    for (const o of this.objects.values()) {
      if (this.esApoyoErgonomico(o)) apoyos.add(o.id);
    }
    const cerca = new THREE.Box3().setFromObject(this.humanFigure).expandByScalar(25);
    const caja = new THREE.Box3();
    return this.physics.cajasDeColision(apoyos).filter((b) => {
      const r = Math.abs(b.h[0]) + Math.abs(b.h[1]) + Math.abs(b.h[2]);
      caja.setFromCenterAndSize(b.c, new THREE.Vector3(r * 2, r * 2, r * 2));
      return caja.intersectsBox(cerca);
    });
  }

  /** Penetración máxima (cm) de unas mallas del maniquí en el hierro. */
  private penetracionEnEstructura(
    mallas: THREE.Mesh[],
    cajas: ReturnType<PhysicsWorld["cajasDeColision"]>,
  ): number {
    const q = new THREE.Quaternion();
    const esc = new THREE.Vector3();
    const pos = new THREE.Vector3();
    const m = new THREE.Matrix4();
    let peor = 0;
    for (const malla of mallas) {
      const geo = malla.geometry;
      if (!geo.boundingBox) geo.computeBoundingBox();
      const bb = geo.boundingBox!;
      malla.matrixWorld.decompose(pos, q, esc);
      const centro = bb.getCenter(new THREE.Vector3()).applyMatrix4(malla.matrixWorld);
      const semi = bb.getSize(new THREE.Vector3()).multiplyScalar(0.5);
      const hA: [number, number, number] = [
        semi.x * Math.abs(esc.x),
        semi.y * Math.abs(esc.y),
        semi.z * Math.abs(esc.z),
      ];
      m.makeRotationFromQuaternion(q);
      const eA = [
        new THREE.Vector3().setFromMatrixColumn(m, 0),
        new THREE.Vector3().setFromMatrixColumn(m, 1),
        new THREE.Vector3().setFromMatrixColumn(m, 2),
      ];
      for (const b of cajas) {
        const p = Editor.penetracionOBB(centro, eA, hA, b.c, b.e, b.h);
        if (p > peor) peor = p;
      }
    }
    return peor;
  }

  /** SAT caja-caja: 0 si no se tocan, si no la penetración mínima (cm). */
  private static penetracionOBB(
    cA: THREE.Vector3,
    eA: THREE.Vector3[],
    hA: [number, number, number],
    cB: THREE.Vector3,
    eB: THREE.Vector3[],
    hB: [number, number, number],
  ): number {
    const d = new THREE.Vector3().subVectors(cB, cA);
    const ejes: THREE.Vector3[] = [...eA, ...eB];
    const cruz = new THREE.Vector3();
    for (const a of eA) {
      for (const b of eB) {
        cruz.crossVectors(a, b);
        if (cruz.lengthSq() > 1e-8) ejes.push(cruz.clone().normalize());
      }
    }
    let min = Infinity;
    for (const ax of ejes) {
      let ra = 0;
      let rb = 0;
      for (let i = 0; i < 3; i++) ra += hA[i] * Math.abs(eA[i].dot(ax));
      for (let i = 0; i < 3; i++) rb += hB[i] * Math.abs(eB[i].dot(ax));
      const sep = Math.abs(d.dot(ax)) - (ra + rb);
      if (sep > 0) return 0; // eje separador: no hay solape
      if (-sep < min) min = -sep;
    }
    return min === Infinity ? 0 : min;
  }

  /** Todas las mallas de segmento de la figura. */
  private mallasDeLaFigura(): THREE.Mesh[] {
    const out: THREE.Mesh[] = [];
    this.humanFigure?.traverse((n) => {
      const m = n as THREE.Mesh;
      if (m.isMesh && m.visible && m.userData.humanFigurePart) out.push(m);
    });
    return out;
  }

  /**
   * Cota mundial más baja de lo que REPOSA en el asiento: pelvis y muslos.
   * Se excluyen piernas y pies a propósito — sentada, esos cuelgan hacia el
   * suelo y medirlos hundiría la figura en la pieza en vez de posarla.
   */
  private baseDeApoyoSentado(fig: THREE.Group): number {
    // Los GLÚTEOS son el apoyo: es lo que carga el peso al sentarse. Medir en
    // cambio el punto más bajo de pelvis + muslos alzaba la figura hasta dejar
    // flotando los glúteos (11,3 cm de hueco medidos sobre una máquina real),
    // que es justo lo que se veía mal.
    fig.updateMatrixWorld(true);
    const caja = new THREE.Box3();
    fig.traverse((n) => {
      const m = n as THREE.Mesh;
      if (!m.isMesh || m.userData.segmentId !== "pelvis") return;
      caja.union(new THREE.Box3().setFromObject(m));
    });
    return caja.isEmpty() ? fig.position.y : caja.min.y;
  }

  /**
   * HACIA DÓNDE MIRA LA FIGURA AL SENTARSE (v0.2.51).
   *
   * Antes se deducía del NOMBRE de las piezas vecinas: mirar «al lado contrario
   * del respaldo más cercano» y, sin respaldo, «al lado contrario de la pieza
   * fija más cercana». En un banco plano esa pieza fija es una PATA, así que en
   * el extremo del banco la figura acababa mirando hacia el propio banco y sus
   * muslos lo atravesaban (5,8 cm medidos en el banco de fábrica, y lo mismo en
   * el medio y en los dos extremos).
   *
   * Ahora se MIDE. Se prueban las cuatro direcciones horizontales del propio
   * apoyo —las de su caja orientada, así que vale igual con el banco girado— y
   * gana la que deja las piernas MÁS FUERA del apoyo y de la estructura. Es el
   * criterio de verdad: uno se sienta mirando adonde caben las piernas.
   *
   * El respaldo sigue mandando cuando existe y está al alcance: ahí la
   * dirección no es opinable.
   */
  private frenteAlSentarse(
    fig: THREE.Group,
    apoyo: SceneObject,
    punto: THREE.Vector3,
    alturaApoyo: number,
  ): THREE.Vector3 {
    const respaldo = this.piezaCercana(
      punto,
      (o) => o.id !== apoyo.id && (/respaldo|back/i.test(o.name) || o.componentId === "respaldo"),
    );
    if (respaldo && respaldo.mesh.position.distanceTo(punto) < 90) {
      const d = punto.clone().sub(respaldo.mesh.position).setY(0);
      if (d.lengthSq() > 1e-4) return d.normalize();
    }

    // Direcciones candidatas: los ejes horizontales de la caja del apoyo, en
    // los dos sentidos. Con el apoyo girado siguen siendo sus ejes, no los del
    // mundo, que es lo que hace que un banco en diagonal funcione igual.
    const cajaApoyo = this.cajaDePieza(apoyo);
    const candidatos: THREE.Vector3[] = [];
    for (const eje of cajaApoyo.e) {
      const h = eje.clone().setY(0);
      if (h.lengthSq() < 0.04) continue; // eje casi vertical: no sirve de frente
      h.normalize();
      candidatos.push(h.clone(), h.clone().negate());
    }
    if (!candidatos.length) candidatos.push(new THREE.Vector3(0, 0, 1));

    // Contra qué se mide: el propio apoyo (que las cajas de la estructura
    // excluyen a propósito, por ser ergonómico) y el hierro de alrededor.
    const cajas = [cajaApoyo, ...(this.cajasCercaDeLaFigura() ?? [])];
    const piernas: THREE.Mesh[] = [];
    fig.traverse((n) => {
      const m = n as THREE.Mesh;
      if (m.isMesh && /^(muslo|pierna|pie)-/.test(String(m.userData.segmentId ?? ""))) piernas.push(m);
    });

    const posOriginal = fig.position.clone();
    const rotOriginal = fig.quaternion.clone();
    const centro = cajaApoyo.c.clone().setY(0);
    const haciaFuera = punto.clone().setY(0).sub(centro);
    let mejor = candidatos[0];
    let mejorCoste = Infinity;
    for (const d of candidatos) {
      fig.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(d.x, d.z));
      fig.position.set(punto.x, alturaApoyo, punto.z);
      fig.updateMatrixWorld(true);
      fig.position.y += alturaApoyo - this.baseDeApoyoSentado(fig);
      fig.updateMatrixWorld(true);
      const dentro = piernas.length ? this.penetracionEnEstructura(piernas, cajas) : 0;
      // A igualdad de estorbo, se mira HACIA FUERA del apoyo: sentado en el
      // extremo de un banco, las piernas cuelgan por el borde y no por dentro.
      const desempate = haciaFuera.lengthSq() > 1 ? -d.dot(haciaFuera.clone().normalize()) : 0;
      const coste = dentro + desempate * 0.05;
      if (coste < mejorCoste - 1e-6) {
        mejorCoste = coste;
        mejor = d;
      }
    }
    fig.position.copy(posOriginal);
    fig.quaternion.copy(rotOriginal);
    fig.updateMatrixWorld(true);
    return mejor.clone();
  }

  /** Caja orientada de una pieza, en el formato de las cajas de colisión. */
  private cajaDePieza(obj: SceneObject): ReturnType<PhysicsWorld["cajasDeColision"]>[number] {
    const geo = obj.mesh.geometry;
    if (!geo.boundingBox) geo.computeBoundingBox();
    const bb = geo.boundingBox!;
    obj.mesh.updateMatrixWorld(true);
    const q = new THREE.Quaternion();
    const esc = new THREE.Vector3();
    obj.mesh.matrixWorld.decompose(new THREE.Vector3(), q, esc);
    const semi = bb.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    const m = new THREE.Matrix4().makeRotationFromQuaternion(q);
    return {
      c: bb.getCenter(new THREE.Vector3()).applyMatrix4(obj.mesh.matrixWorld),
      e: [
        new THREE.Vector3().setFromMatrixColumn(m, 0),
        new THREE.Vector3().setFromMatrixColumn(m, 1),
        new THREE.Vector3().setFromMatrixColumn(m, 2),
      ],
      h: [semi.x * Math.abs(esc.x), semi.y * Math.abs(esc.y), semi.z * Math.abs(esc.z)],
    };
  }

  /**
   * ¿ESTE APOYO ES PARA TUMBARSE? (v0.3.14)
   *
   * Una banca plana sirve de asiento Y de respaldo: uno se sienta en el
   * extremo, con las piernas colgando, y SE ACUESTA en el medio, que es lo que
   * hace un banco de press. Se pide lo que pide el cuerpo: cara horizontal
   * —para tumbarse hay que tener dónde—, largo suficiente para un tronco, y
   * que el punto tocado caiga en el tramo central; en los extremos manda el
   * asiento. Y sólo si NO hay respaldo: con respaldo, el sitio es sentarse.
   */
  private esParaTumbarse(apoyo: SceneObject, punto: THREE.Vector3): boolean {
    const cara = this.caraDeApoyo(apoyo);
    if (cara.y < 0.8) return false; // no es una superficie sobre la que tenderse
    if (this.respaldoDelAsiento(punto, apoyo)) return false;
    const caja = this.cajaDePieza(apoyo);
    // Eje horizontal más largo: es a lo largo de él como se tiende el cuerpo.
    let iLargo = -1;
    for (let i = 0; i < 3; i++) {
      if (Math.abs(caja.e[i].y) > 0.5) continue; // ése es el grosor, va vertical
      if (iLargo < 0 || caja.h[i] > caja.h[iLargo]) iLargo = i;
    }
    if (iLargo < 0) return false;
    // Un tronco con su cabeza pide unos 90 cm de banca; menos es un taburete.
    if (caja.h[iLargo] * 2 < 90) return false;
    const t = punto.clone().sub(caja.c).dot(caja.e[iLargo]);
    return Math.abs(t) <= caja.h[iLargo] * 0.5;
  }

  /**
   * ACOSTAR LA FIGURA BOCA ARRIBA sobre su banca (v0.3.14).
   *
   * La banca hace de asiento y de respaldo a la vez, así que aquí no hay nada
   * contra lo que deslizarse: la espalda YA descansa encima. Se tiende a lo
   * largo de la banca, con la cabeza hacia el extremo que queda más despejado,
   * y lo que se posa en la cara es la ESPALDA, no los glúteos.
   */
  private acostarEnLaBanca(fig: THREE.Group, apoyo: SceneObject, punto: THREE.Vector3): void {
    const caja = this.cajaDePieza(apoyo);
    let iLargo = 0;
    for (let i = 0; i < 3; i++) {
      if (Math.abs(caja.e[i].y) > 0.5) continue;
      if (caja.h[i] > caja.h[iLargo] || Math.abs(caja.e[iLargo].y) > 0.5) iLargo = i;
    }
    const largo = caja.e[iLargo].clone().setY(0);
    if (largo.lengthSq() < 1e-4) largo.set(0, 0, 1);
    largo.normalize();
    // LA CABEZA VA HACIA EL LADO MÁS DESPEJADO: si se tocó descentrado, hacia
    // el extremo que queda por delante del punto; si no, da igual y se toma
    // el sentido del eje tal cual.
    const t = punto.clone().sub(caja.c).dot(caja.e[iLargo]);
    if (t < -0.5) largo.negate();
    this.tumbadaEnElApoyo = true;
    this.apoyoEspalda = apoyo.id;
    this.applyPose("Tumbado", false);
    const alto = new THREE.Box3().setFromObject(apoyo.mesh).max.y;
    fig.position.set(punto.x, alto, punto.z);
    // Girar NEGATIVO alrededor del eje X local echa el cuerpo hacia atrás;
    // noventa grados es quedarse tumbado boca arriba.
    const q = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      Math.atan2(largo.x, largo.z),
    );
    q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2));
    fig.quaternion.copy(q);
    fig.updateMatrixWorld(true);
    fig.position.y += alto - this.baseDeLaEspalda(fig);
    fig.updateMatrixWorld(true);
    // Los pies buscan el suelo por su cuenta; nada puede quedar por debajo.
    this.noHundirse();
    this.updateHandIK();
    this.updateFootIK();
  }

  /**
   * Cota mundial más baja de lo que REPOSA en la banca al tumbarse: espalda y
   * pelvis. Se excluyen piernas y brazos a propósito — cuelgan hacia el suelo
   * y medirlos levantaría el cuerpo por encima de la banca.
   */
  private baseDeLaEspalda(fig: THREE.Group): number {
    let y = Infinity;
    fig.traverse((n) => {
      const m = n as THREE.Mesh;
      if (!m.isMesh || !m.visible) return;
      const id = String(m.userData.segmentId ?? "");
      if (id !== "torso" && id !== "pelvis") return;
      y = Math.min(y, this.masBajoPropio(m));
    });
    return Number.isFinite(y) ? y : new THREE.Box3().setFromObject(fig).min.y;
  }

  /**
   * APOYAR LA ESPALDA (v0.2.46, reclinada en v0.3.11). Un respaldo solo sirve
   * si el cuerpo lo TOCA: la figura se recuesta con su misma inclinación y se
   * desliza hacia atrás hasta el instante justo antes de meterse en él. Sin
   * esto quedaba sentada en el aire, a 29 cm del respaldo, y cualquier medida
   * de esfuerzo salía falseada porque no había punto de apoyo desde el que
   * empujar.
   *
   * El respaldo del asiento, si está AL ALCANCE (v0.2.51). La búsqueda es
   * global y sin radio: en una sala con varias máquinas, el respaldo de la de
   * al lado hacía retroceder a quien se sentaba en un banco. Como nunca
   * llegaba a tocarlo, agotaba los pasos del bucle y lo dejaba 45 cm más
   * atrás, fuera del banco.
   */
  private respaldoDelAsiento(cerca: THREE.Vector3, asiento?: SceneObject | null): SceneObject | null {
    // QUIÉN ES EL RESPALDO SE MIDE, no se lee del nombre (v0.3.13). En la
    // prensa del diseñador hay DOS placas casi perpendiculares al asiento: el
    // respaldo, que arranca a la altura del asiento, y una cabecera más
    // pequeña y mucho más arriba. Tomando la más cercana al punto —o la que
    // llevara «respaldo» en el nombre— podía ganar la cabecera, y la figura se
    // recostaba contra ella. La regla es la de un cuerpo real: MANDA LA MÁS
    // BAJA, la que empieza donde acaba el asiento; lo que quede por encima es
    // cabecera.
    const cara = asiento ? this.caraDeApoyo(asiento) : new THREE.Vector3(0, 1, 0);
    const altoAsiento = asiento
      ? new THREE.Box3().setFromObject(asiento.mesh).max.y
      : cerca.y;
    let mejor: SceneObject | null = null;
    let mejorArranque = Infinity;
    for (const o of this.objects.values()) {
      if (asiento && o === asiento) continue;
      // AL ALCANCE O NADA (v0.2.51): en una sala con varias máquinas, el
      // respaldo de la de al lado hacía retroceder a quien se sentaba enfrente.
      if (o.mesh.position.distanceTo(cerca) > 90) continue;
      const caja = new THREE.Box3().setFromObject(o.mesh);
      // Un respaldo es una PLACA: ancha y alta, y delgada en UN solo eje. Se
      // mide en la caja PROPIA de la pieza, no en la del mundo: un tubo
      // diagonal tiene una caja mundial enorme y se colaba como respaldo —en
      // la prensa del diseñador ganaba un travesaño que baja al suelo.
      const geo = o.mesh.geometry;
      if (!geo.boundingBox) geo.computeBoundingBox();
      const propio = geo.boundingBox!.getSize(new THREE.Vector3());
      const lados = [propio.x, propio.y, propio.z].sort((a, b) => a - b);
      if (lados[1] < 28 || lados[2] < 30) continue; // una espalda pide anchura
      if (lados[0] > lados[1] / 3) continue; // no es una placa: es un bloque
      // Y PERPENDICULAR al asiento: su cara de apoyo forma un buen ángulo con
      // la del asiento. Paralela sería otro asiento, no un respaldo.
      const suya = this.caraDeApoyo(o);
      if (Math.abs(suya.dot(cara)) > 0.71) continue; // menos de 45°: no es respaldo
      // Y su cara MIRA DE LADO, no al cielo: contra un respaldo uno se apoya
      // hacia atrás. Los travesaños del bastidor son planos y anchos pero
      // miran hacia arriba, y ganaban por estar más abajo que nadie.
      if (Math.hypot(suya.x, suya.z) < 0.45) continue;
      // De las placas que quedan, MANDA LA MÁS BAJA: el respaldo arranca donde
      // acaba el asiento, y lo que quede por encima es cabecera. Y ninguna que
      // empiece muy por encima del asiento: eso ya no es donde va la espalda.
      if (caja.min.y - altoAsiento > 25) continue;
      // Ni por debajo del asiento: lo que pasa por ahí es bastidor.
      if (caja.getCenter(new THREE.Vector3()).y < altoAsiento - 10) continue;
      // Y EL ASIENTO TIENE QUE ESTAR JUSTO DELANTE DE SU CARA. Es lo que
      // distingue un respaldo de cualquier otro tablón de la máquina: uno se
      // sienta a sus pies, tocándolo. Sin esto ganaban los travesaños del
      // bastidor, que también son planos y anchos y además quedan más bajos.
      const oc = this.cajaDePieza(o);
      let iFino = 0;
      for (let i = 1; i < 3; i++) if (oc.h[i] < oc.h[iFino]) iFino = i;
      const rel = cerca.clone().sub(oc.c);
      const t = [rel.dot(oc.e[0]), rel.dot(oc.e[1]), rel.dot(oc.e[2])];
      if (Math.abs(t[iFino]) > 45) continue; // el asiento no está pegado a la cara
      let dentro = true;
      for (let i = 0; i < 3; i++) {
        if (i === iFino) continue;
        if (Math.abs(t[i]) > oc.h[i] + 15) dentro = false;
      }
      if (!dentro) continue; // el asiento no cae al pie de la placa
      const centro = caja.getCenter(new THREE.Vector3()).y;
      if (centro < mejorArranque) {
        mejorArranque = centro;
        mejor = o;
      }
    }
    if (mejor) return mejor;
    // Respaldo por NOMBRE, como respaldo del respaldo: proyectos viejos y
    // piezas cuya forma no encaja en la regla de arriba.
    const porNombre = this.piezaCercana(
      cerca,
      (o) => (!asiento || o !== asiento)
        && (/respaldo|back/i.test(o.name) || o.componentId === "respaldo"),
    );
    if (!porNombre || porNombre.mesh.position.distanceTo(cerca) > 90) return null;
    return porNombre;
  }

  /**
   * Normal de la CARA DE APOYO de una pieza: la de su lado más delgado, que es
   * sobre la que uno se sienta o se recuesta. Se devuelve mirando hacia
   * arriba, para poder comparar dos piezas entre sí.
   */
  private caraDeApoyo(o: SceneObject): THREE.Vector3 {
    const caja = this.cajaDePieza(o);
    let fino = 0;
    for (let i = 1; i < 3; i++) if (caja.h[i] < caja.h[fino]) fino = i;
    const n = caja.e[fino].clone().normalize();
    if (n.y < 0) n.negate();
    return n;
  }

  /**
   * LA ESPALDA COPIA LA INCLINACIÓN DEL RESPALDO (v0.3.11).
   *
   * En una prensa de piernas el respaldo va tumbado 50° y el asiento otros
   * tantos: quien se sienta ahí se RECUESTA, no se queda erguido. Deslizando
   * hacia atrás con el tronco vertical solo llegaba a tocar con la pelvis y la
   * espalda se quedaba a 11,5 cm de la placa; sin ese apoyo detrás, el empuje
   * del tren inferior no tenía contra qué hacerse y sacaba a la figura del
   * asiento.
   *
   * La inclinación se MIDE en la propia pieza: de sus tres ejes se toma el más
   * DELGADO —el grosor de la placa, que es su normal— orientado hacia quien se
   * sienta, y lo que ese vector se levanta sobre la horizontal es lo que se
   * recuesta el cuerpo. Un respaldo vertical da 0° y todo queda como estaba.
   */
  private reclinarComoElRespaldo(
    fig: THREE.Group,
    respaldo: SceneObject,
    frente: THREE.Vector3,
  ): void {
    const caja = this.cajaDePieza(respaldo);
    let iFino = 0;
    for (let i = 1; i < 3; i++) if (caja.h[i] < caja.h[iFino]) iFino = i;
    const normal = caja.e[iFino].clone().normalize();
    if (normal.dot(frente) < 0) normal.negate();
    const theta = Math.asin(Math.max(0, Math.min(1, normal.y)));
    // Menos de 5° es un respaldo recto: no se toca nada, y así los bancos de
    // siempre siguen comportándose exactamente igual.
    if (theta < degToRad(5)) return;
    const q = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      Math.atan2(frente.x, frente.z),
    );
    // Girar POSITIVO alrededor del eje X local echa el cuerpo hacia delante,
    // así que recostarse es el signo contrario.
    q.multiply(
      new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        -Math.min(theta, degToRad(RECLINACION_MAX)),
      ),
    );
    fig.quaternion.copy(q);
    fig.updateMatrixWorld(true);
  }

  /**
   * Acerca (o separa) la figura de su respaldo hasta dejarla justo tocándolo.
   *
   * Es IDEMPOTENTE a propósito: se llama en cada re-apoyo, y una versión que
   * solo supiera retroceder iría metiendo el cuerpo un poco más dentro del
   * respaldo en cada postura. Si al empezar ya está dentro, primero sale.
   */
  private deslizarHastaElRespaldo(fig: THREE.Group, respaldo: SceneObject): void {
    const caja = this.cajaDePieza(respaldo);
    const espalda: THREE.Mesh[] = [];
    fig.traverse((n) => {
      const m = n as THREE.Mesh;
      if (m.isMesh && (m.userData.segmentId === "torso" || m.userData.segmentId === "pelvis")) {
        espalda.push(m);
      }
    });
    if (!espalda.length) return;
    // El deslizamiento es HORIZONTAL: la altura la resuelve el asiento, y
    // moverse a lo largo del cuerpo reclinado la desharía.
    const frente = new THREE.Vector3(0, 0, 1)
      .applyQuaternion(fig.quaternion)
      .setY(0);
    if (frente.lengthSq() < 1e-6) return;
    frente.normalize();
    const origen = fig.position.clone();
    const mide = (d: number): number => {
      fig.position.copy(origen).addScaledVector(frente, d);
      fig.updateMatrixWorld(true);
      return this.penetracionEnEstructura(espalda, [caja]);
    };
    let fuera = 0;
    while (fuera < 45 && mide(fuera) > 0.5) fuera += 1;
    if (fuera >= 45) {
      mide(0); // metida y sin salida: se queda donde estaba
      return;
    }
    // SÓLO SE ACERCA SI LLEGA A TOCAR (v0.3.15). El barrido buscaba el último
    // sitio libre yendo hacia atrás, y cuando el respaldo NO estaba al alcance
    // —porque el gesto movió el cuerpo, o porque no hay respaldo detrás de
    // verdad— se quedaba con el final del recorrido: 45 cm hacia atrás. Como
    // esto se llama en CADA re-apoyo, eran 45 cm más cada vez, y la figura se
    // marchaba en horizontal hasta salirse de la máquina.
    let mejor = fuera;
    let tocado = false;
    for (let d = fuera; d >= fuera - 45; d -= 1) {
      if (mide(d) > 0.5) {
        tocado = true;
        break;
      }
      mejor = d;
    }
    if (!tocado) {
      mide(0); // el respaldo no está ahí detrás: no hay nada a lo que arrimarse
      return;
    }
    mide(mejor);
  }

  /** Pieza más cercana a un punto que cumpla el filtro. */
  private piezaCercana(p: THREE.Vector3, filtro: (o: SceneObject) => boolean): SceneObject | null {
    let mejor: SceneObject | null = null;
    let d = Infinity;
    for (const o of this.objects.values()) {
      if (!filtro(o)) continue;
      const dd = o.mesh.position.distanceToSquared(p);
      if (dd < d) {
        d = dd;
        mejor = o;
      }
    }
    return mejor;
  }

  /** Primera pieza bajo el puntero que la mano PODRÍA mover, si la hay. */
  private piezaAgarrableBajoPuntero(): SceneObject | null {
    if (!this.physics) return null;
    const hits = this.raycaster.intersectObjects(this.sceneManager.content.children, true);
    for (const h of hits) {
      const id = h.object.userData.sceneObjectId as string | undefined;
      const obj = id ? this.objects.get(id) : undefined;
      if (obj && this.physics.puedeAgarrar(obj.id)) return obj;
    }
    return null;
  }

  /** Resalta (y des-resalta) la pieza que la mano tomaría. */
  private resaltarAgarrable(obj: SceneObject | null): void {
    if (this.manoHover === obj) return;
    if (this.manoHover) this.setHighlight(this.manoHover, false);
    this.manoHover = obj;
    if (obj) this.setHighlight(obj, true);
    this.canvas.style.cursor = obj ? "grab" : "";
    this.requestRender();
  }

  /** Termina los arrastres de simulación (mano y maniquí). */
  private endSimInteraction(): void {
    this.resaltarAgarrable(null);
    if (this.simDrag) this.physics?.release();
    if (this.simDrag || this.figureDrag) this.orbit.enabled = true;
    this.simDrag = null;
    this.figureDrag = null;
  }

  /**
   * CUERDAS DE SEGURIDAD para el motor físico (v0.2.14): extremos en mundo,
   * caída de la catenaria (misma fórmula del visual: sag = slack·D·0,45) y
   * radio del eslabón. Una cuerda con AMBOS extremos en piezas fijas se
   * materializa como barrera colisionable — la barra que se suelta de las
   * jotas cae sobre la cadena y queda detenida ahí, como en el rack real.
   */
  private cuerdasFisicas(): RopeFisica[] {
    const out: RopeFisica[] = [];
    for (const r of this.ropes.values()) {
      const a = this.ropeEndWorld(r.a);
      const b = this.ropeEndWorld(r.b);
      const D = a.distanceTo(b);
      out.push({
        id: r.id,
        a: [a.x, a.y, a.z],
        b: [b.x, b.y, b.z],
        aId: r.a.objectId,
        bId: r.b.objectId,
        sag: r.slack * D * 0.45,
        radio: r.kind === "chain" ? 1.6 : 1.2,
      });
    }
    return out;
  }

  /** Vistas predefinidas para presentar el proyecto en simulación. */
  setViewPreset(view: "frontal" | "lateral" | "superior" | "isometrica"): void {
    // Encuadra el contenido (piezas + figura) con un margen cómodo.
    const box = new THREE.Box3();
    if (this.objects.size > 0) box.setFromObject(this.sceneManager.content);
    if (this.humanFigure) box.expandByObject(this.humanFigure);
    if (box.isEmpty()) box.set(new THREE.Vector3(-100, 0, -100), new THREE.Vector3(100, 200, 100));
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();
    const cam = this.sceneManager.camera;
    const dist = Math.max(80, (size / 2) / Math.tan((cam.fov * Math.PI) / 360) * 1.25);
    const dirs = {
      frontal: new THREE.Vector3(0, 0.18, 1),
      lateral: new THREE.Vector3(1, 0.18, 0),
      superior: new THREE.Vector3(0.001, 1, 0.001),
      isometrica: new THREE.Vector3(1, 0.75, 1),
    } as const;
    cam.position.copy(center).add(dirs[view].clone().normalize().multiplyScalar(dist));
    this.orbit.target.copy(center);
    this.orbit.update();
  }

  // ------------------------------------- modos de vista (menú Ver, v0.2.0)

  getColorMode(): ColorMode {
    return this.colorMode;
  }

  /** Color del visor: materiales reales, por categoría funcional o neutro. */
  setColorMode(mode: ColorMode): void {
    this.colorMode = mode;
    this.applyViewModes();
    this.bus.emit("viewModesChanged", { color: this.colorMode, edges: this.edgesOn });
    this.requestRender();
  }

  isEdges(): boolean {
    return this.edgesOn;
  }

  /** Muestra/oculta las aristas (contorno de cada pieza) sobre el sombreado. */
  setEdges(on: boolean): void {
    this.edgesOn = on;
    this.applyViewModes();
    this.bus.emit("viewModesChanged", { color: this.colorMode, edges: this.edgesOn });
    this.requestRender();
  }

  isGridVisible(): boolean {
    return this.sceneManager.isGridVisible();
  }

  setGridVisible(on: boolean): void {
    this.sceneManager.setGridVisible(on);
    this.requestRender();
  }

  /** Reaplica color de vista y aristas a todas las piezas. */
  private applyViewModes(): void {
    const tinte = (mesh: THREE.Mesh, catColor: number | null): void => {
      const m = mesh.material as THREE.MeshStandardMaterial;
      if (m && m.color && catColor !== null) m.color.setHex(catColor);
    };
    for (const o of this.objects.values()) {
      // Color.
      if (this.colorMode === "material") {
        o.setMaterial(o.materialId); // restaura el preset PBR real
      } else {
        const c =
          this.colorMode === "categoria"
            ? (CATEGORY_COLORS[o.category] ?? 0x94a3b8)
            : 0xb8bcc4;
        tinte(o.mesh, c);
        for (const child of o.mesh.children) {
          const cm = child as THREE.Mesh;
          if (cm.isMesh && !cm.userData.edgesHelper) tinte(cm, c);
        }
      }
      // Aristas.
      const previas = o.mesh.children.filter((ch) => ch.userData.edgesHelper);
      for (const ch of previas) {
        o.mesh.remove(ch);
        const lm = ch as THREE.LineSegments;
        lm.geometry.dispose();
        (lm.material as THREE.Material).dispose();
      }
      if (this.edgesOn) {
        const linea = new THREE.LineSegments(
          new THREE.EdgesGeometry(o.mesh.geometry, 30),
          new THREE.LineBasicMaterial({ color: 0x14161b }),
        );
        linea.userData.edgesHelper = true;
        o.mesh.add(linea);
      }
    }
  }

  /**
   * Reaplica los modos de vista tras cualquier mutación de escena (nuevas
   * piezas, cambios de material o geometría), con un pequeño debounce.
   */
  private scheduleViewModes(): void {
    if (this.colorMode === "material" && !this.edgesOn) return;
    if (this.viewModesTimer !== null) clearTimeout(this.viewModesTimer);
    this.viewModesTimer = setTimeout(() => {
      this.viewModesTimer = null;
      this.applyViewModes();
      this.requestRender();
    }, 150);
  }

  /** Zoom por botones (además de la rueda): factor <1 acerca, >1 aleja. */
  zoomBy(factor: number): void {
    const cam = this.sceneManager.camera;
    const offset = cam.position.clone().sub(this.orbit.target);
    const len = THREE.MathUtils.clamp(offset.length() * factor, 20, 3000);
    cam.position.copy(this.orbit.target).add(offset.setLength(len));
    this.orbit.update();
  }

  // -------------------------------------------------------------- eventos
  private onPointerDown = (event: PointerEvent): void => {
    if (this.gizmo.dragging) return;
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.sceneManager.camera);

    // Herramienta de selección de área: arrastrar dibuja el recuadro.
    if (this.areaSelect && !this.simulating && event.button === 0) {
      this.beginMarquee(event);
      return;
    }

    // Herramienta de arrastre directo: agarrar una pieza y llevarla (con el
    // eje bloqueado, se desliza solo a lo largo de ese eje).
    if (this.dragTool && !this.simulating && event.button === 0) {
      const hits = this.raycaster.intersectObjects(this.sceneManager.content.children, false);
      const hid = hits[0]?.object.userData.sceneObjectId as string | undefined;
      const hobj = hid ? this.objects.get(hid) : undefined;
      if (hobj && hits[0]) {
        let ids: string[];
        if (this.multiSel.has(hobj.id)) {
          ids = [...this.multiSel];
        } else if (this.objGroup.has(hobj.id)) {
          const gid = this.objGroup.get(hobj.id)!;
          ids = [...(this.groups.get(gid)?.ids ?? [hobj.id])];
          if (this.selectedGroupId !== gid) this.selectGroup(gid);
        } else {
          if (this.selected !== hobj) this.select(hobj);
          ids = [hobj.id];
        }
        const normal = this.sceneManager.camera.getWorldDirection(new THREE.Vector3());
        const starts = new Map<string, THREE.Vector3>();
        for (const id of ids) {
          const o = this.objects.get(id);
          if (o) starts.set(id, o.mesh.position.clone());
        }
        this.dragMove = {
          ids,
          grabbed: hits[0].point.clone(),
          plane: new THREE.Plane().setFromNormalAndCoplanarPoint(normal, hits[0].point),
          starts,
        };
        this.orbit.enabled = false;
        return;
      }
    }

    // Herramienta "agarrar maniquí": toma un segmento del cuerpo y lo lleva;
    // rota la articulación libre más cercana de la cadena (las bloqueadas con
    // el candado se saltan). Con eje bloqueado (1/2/3) el destino se
    // restringe a ese eje.
    if (this.grabFigureTool && !this.simulating && event.button === 0 && this.humanFigure) {
      const hits = this.raycaster.intersectObjects([this.humanFigure], true);
      const hit = hits[0];
      if (hit) {
        const jn0 = hit.object.userData.jointName as string | undefined;
        const normal = this.sceneManager.camera.getWorldDirection(new THREE.Vector3());
        if (jn0 === "" || jn0 === undefined) {
          // Pelvis/raíz: arrastrar la figura completa.
          this.grabDrag = {
            joint: "",
            grabLocal: this.humanFigure.position.clone().sub(hit.point),
            origin: hit.point.clone(),
            plane: new THREE.Plane().setFromNormalAndCoplanarPoint(normal, hit.point),
          };
          this.orbit.enabled = false;
          return;
        }
        // Se agarra la articulación que se ha tocado. Antes se trepaba a su
        // padre mientras estuviera con candado, y desde que el candado lo
        // fija la zona eso hacía inagarrable todo lo que la zona no mueve.
        const jn: string | null = jn0;
        const joints = this.figureJoints();
        const j = joints?.[jn];
        if (j) {
          j.updateMatrixWorld(true);
          this.grabDrag = {
            joint: jn,
            grabLocal: j.worldToLocal(hit.point.clone()),
            origin: hit.point.clone(),
            plane: new THREE.Plane().setFromNormalAndCoplanarPoint(normal, hit.point),
          };
          this.selectJoint(jn); // muestra la articulación activa en Posturas
          this.gizmo.detach(); // durante el agarre manda el puntero, no el gizmo
          this.orbit.enabled = false;
        }
      }
      return;
    }

    // COLOCAR MANIQUÍ: el clic lo deja en el apoyo o el suelo marcado. Vale
    // también con la simulación corriendo (la figura es una referencia, no un
    // cuerpo físico), que es lo que permite posarla dentro de la máquina.
    if (this.colocarFiguraMode && event.button === 0) {
      const destino = this.apoyoBajoPuntero();
      if (destino) {
        // La herramienta se APAGA al dejar la figura puesta. Si sigue viva,
        // el clic siguiente —orbitar, agarrar una pieza— vuelve a teletrans-
        // portar el maniquí, que es lo que parecía un fallo de colocación.
        this.cancelColocarFigura();
        void this.colocarFiguraEn(destino);
      } else {
        this.avisoTemporal(
          tt("Apunta al suelo o a un apoyo (asiento, respaldo, banco)", "Aim at the floor or a support (seat, backrest, bench)"),
        );
      }
      return;
    }

    // Herramienta de FRENO DE CABLE: el clic engarza (o retira) la esfera de
    // tope sobre el trazado del cable que haya bajo el puntero.
    if (this.frenoMode && !this.simulating && event.button === 0) {
      if (!this.frenoEnPuntero()) {
        this.avisoTemporal(tt("Apunta al trazado de un cable", "Aim at a cable's run"));
      }
      return;
    }

    // MODO APOYAR MANO / PISAR (IK): 1) clic en un miembro de la figura,
    // 2) clic en el agarre. VA POR ENCIMA DEL GUARD DE SIMULACIÓN a propósito,
    // igual que «Colocar maniquí»: el flujo que pidió el diseñador es llevar el
    // mecanismo a su punto de partida con «▶ Manipular» y APOYAR AHÍ las manos,
    // y con el motor corriendo el guard de abajo se comía el clic antes de que
    // llegara aquí — el botón estaba, se pulsaba, y no pasaba absolutamente
    // nada ni había aviso.
    if (this.attachMode) {
      if (!this.attachSide) {
        if (!this.humanFigure) return;
        const fHits = this.raycaster.intersectObjects([this.humanFigure], true);
        const jn = fHits[0]?.object.userData.jointName as string | undefined;
        // Apoyar mano toma el miembro SUPERIOR; apoyar pie, el INFERIOR.
        const familias =
          this.attachTipo === "pie" ? ["hip", "knee", "ankle"] : ["shoulder", "elbow", "wrist"];
        if (jn && familias.some((f) => jn.startsWith(f))) {
          this.attachSide = jn.endsWith("R") ? "R" : "L";
          this.bus.emit("attachModeChanged", { active: true, stage: "grip" });
        }
        return;
      }
      // EL RAYO ENTRA EN LAS SUBMALLAS y luego sube a la pieza. Los discos
      // montados y las partes de la pila cuelgan del mesh de su pieza, así que
      // con el rayo plano tocarlos no encontraba nada y el clic se perdía en
      // silencio: parecía que la herramienta no respondía.
      const gHits = this.raycaster.intersectObjects(this.sceneManager.content.children, true);
      const hit = gHits[0];
      let obj: SceneObject | undefined;
      for (let n: THREE.Object3D | null = hit?.object ?? null; n && !obj; n = n.parent) {
        const id = n.userData.sceneObjectId as string | undefined;
        if (id) obj = this.objects.get(id);
      }
      if (!obj || !hit) {
        this.avisoTemporal(
          tt("Apunta a la pieza del agarre", "Aim at the grip's part"),
        );
        return;
      }
      obj.mesh.updateMatrixWorld(true);
      // SE APOYA DONDE SE TOCA. Antes el punto se cuantizaba al punto de
      // anclaje más cercano de la pieza, y para un cilindro ésos son sólo tres
      // —el centro y las dos tapas—: tocar el medio de un mando de 60 cm podía
      // llevar la mano a 30 cm de allí, a la punta. Ahora manda el punto
      // tocado y los anclajes son un IMÁN de 3 cm, para que apoyar en el
      // centro exacto de un eje siga siendo fácil.
      const local = obj.mesh.worldToLocal(hit.point.clone());
      let best = local;
      let bestD = 3;
      for (const lp of localSnapPoints(obj)) {
        const wp = lp.clone().applyMatrix4(obj.mesh.matrixWorld);
        const dd = wp.distanceTo(hit.point);
        if (dd < bestD) { bestD = dd; best = lp; }
      }
      // PISAR GUARDA LA CARA, no sólo el punto (v0.3.11). La IK del pie
      // necesita saber hacia dónde mira la superficie para acostar la suela
      // sobre ella; sin eso, sobre una placa inclinada el pie la atravesaba.
      let normal: THREE.Vector3 | null = null;
      if (this.attachTipo === "pie" && hit.face) {
        const mundo = hit.face.normal
          .clone()
          .transformDirection(hit.object.matrixWorld)
          .normalize();
        // SÓLO SE PISA UNA CARA QUE MIRE AL CUERPO. Rozando el canto de una
        // placa, el rayo devuelve la normal de la cara LATERAL: quedarse con
        // ella sería pedirle al pie que se apoye de perfil. El criterio NO es
        // que la cara mire hacia arriba (v0.3.12): la placa de una prensa mira
        // hacia abajo, hacia quien la empuja, y aun así se pisa. Lo que la
        // define es que la planta pueda enfrentarse a ella, o sea que la cara
        // mire hacia la cadera de ese lado.
        const caderaP = this.figureJoints()?.[`hip${this.attachSide}`];
        const haciaElCuerpo = caderaP
          ? caderaP.getWorldPosition(new THREE.Vector3()).sub(hit.point).normalize()
          : new THREE.Vector3(0, 1, 0);
        if (Math.abs(mundo.dot(haciaElCuerpo)) < 0.34) {
          normal = null;
        } else {
          normal = mundo
            .clone()
            .transformDirection(new THREE.Matrix4().copy(obj.mesh.matrixWorld).invert())
            .normalize();
          if (!Number.isFinite(normal.x) || normal.lengthSq() < 0.5) {
            normal = null;
          } else if (mundo.dot(haciaElCuerpo) < 0) {
            // SE PISA LA CARA DE ENFRENTE. En una prensa, la única cara de la
            // placa que se ve desde fuera es la de arriba, que le da la
            // espalda a quien empuja; la que se pisa es la de abajo. Marcar la
            // que se ve y pisar la que toca es lo que quiere decir el clic, así
            // que el punto se pasa a la cara paralela sin moverse de sitio.
            normal.negate();
            best = best.clone();
            const geo = obj.mesh.geometry;
            if (!geo.boundingBox) geo.computeBoundingBox();
            const bb = geo.boundingBox!;
            const ejes: ("x" | "y" | "z")[] = ["x", "y", "z"];
            let dom: "x" | "y" | "z" = "y";
            for (const e of ejes) if (Math.abs(normal[e]) > Math.abs(normal[dom])) dom = e;
            best[dom] = normal[dom] > 0 ? bb.max[dom] : bb.min[dom];
          }
        }
      }
      if (this.attachTipo === "pie") {
        this.attachFoot(this.attachSide, obj.id, best, normal);
      } else {
        this.handTargets.set(this.attachSide, { objectId: obj.id, local: best });
      }
      this.cancelAttachHand();
      this.updateHandIK();
      this.updateFootIK();
      this.requestRender();
      this.avisoTemporal(
        this.attachTipo === "pie"
          ? tt(`Pie apoyado en "${obj.name}"`, `Foot resting on "${obj.name}"`)
          : tt(`Mano apoyada en "${obj.name}"`, `Hand resting on "${obj.name}"`),
      );
      return;
    }


    // Durante la simulación: mano interactiva (agarrar piezas dinámicas) y
    // posicionamiento del maniquí; no hay selección ni edición.
    if (this.simulating) {
      // Con la herramienta ÓRBITA el puntero solo maneja la cámara (v0.2.14).
      if (this.simTool !== "orbitar") this.beginSimInteraction();
      return;
    }

    // Modo doblado: clic en un asa inicia el arrastre del nodo; fuera, sale.
    if (this.bendTarget && this.bendHandles) {
      const hits = this.raycaster.intersectObjects(this.bendHandles.children, false);
      if (hits[0]) {
        const idx = hits[0].object.userData.bendIndex as number;
        const node = hits[0].object.position.clone();
        const normal = this.sceneManager.camera.getWorldDirection(new THREE.Vector3());
        this.bendDrag = {
          index: idx,
          plane: new THREE.Plane().setFromNormalAndCoplanarPoint(normal, node),
          origin: node.clone(),
        };
        // El nodo tocado pasa a ser el ACTIVO: los cursores del Arrastre
        // preciso lo moverán en cualquier eje (deformación multi-eje).
        this.bendNodeIndex = idx;
        this.refreshBendHandles();
        this.orbit.enabled = false;
      } else {
        this.endBendNodes();
      }
      return;
    }

    // Modo línea (pilar/travesaño/tubo): dos clics con aim assist. Con eje
    // bloqueado, el segundo punto sale de la recta del eje bajo el puntero
    // (no necesita tocar nada: el eje Y se traza apuntando al cielo).
    if (this.lineMode) {
      // EL PUNTO SE FIJA AL SOLTAR, no al pulsar, y solo con el botón
      // izquierdo. Fijándolo al pulsar no había manera de girar la vista para
      // mirar dónde iba a caer el otro extremo: el arrastre de órbita plantaba
      // el punto de inicio y el siguiente creaba un pilar entre dos sitios que
      // nadie había elegido. Y el arrastre derecho, que solo encuadra, hacía
      // lo mismo. Se recuerda dónde se pulsó y se compara al soltar.
      this.lineDown = event.button === 0 ? { x: event.clientX, y: event.clientY } : null;
      return;
    }

    // Modo cuerda: clic en el extremo A y luego en el B (línea recta).
    if (this.ropeMode) {
      const end = this.pickRopeEnd();
      if (!end) return;
      if (!this.ropePendingA) {
        this.ropePendingA = end;
        this.bus.emit("ropeModeChanged", { active: true, kind: this.ropeMode, count: 1 });
      } else {
        // Diagrama Simulación Cadenas: al fijar el anclaje final se define la
        // CAÍDA (catenaria) en cm con la que cuelga la cadena/correa.
        const aW = this.ropeEndWorld(this.ropePendingA);
        const bW = this.ropeEndWorld(end);
        const D = Math.max(1, aW.distanceTo(bW));
        const sugerida = Math.round(D * 0.12);
        const resp = window.prompt(
          tt(
            "Caída o catenaria (cm): cuánto cuelga la cadena respecto de la recta entre anclajes",
            "Sag / catenary (cm): how much the chain hangs below the straight line between anchors",
          ),
          String(sugerida),
        );
        const caida = resp === null ? sugerida : Math.max(0, Number(resp) || 0);
        // sag = slack · D · 0.45 (ver Rope) → slack = caída / (0.45·D).
        const slack = Math.max(0, Math.min(1, caida / (0.45 * D)));
        const rope = this.createRope(this.ropeMode, this.ropePendingA, end, slack);
        this.cancelRope();
        this.selectRope(rope.id);
      }
      return;
    }

    // Modo cable: dos puntos de anclaje describen una línea recta; entre medias
    // solo roldanas/poleas actúan como superficie de reenvío (deslizamiento).
    if (this.cableMode) {
      const pick = this.pickAnchorPoint();
      if (!pick) return;
      const prev = this.cablePending[this.cablePending.length - 1];
      if (prev && prev.object === pick.object) return; // mismo nodo, ignora
      if (this.cablePending.length === 0) {
        // Primer extremo (ancla A).
        this.cablePending.push({ object: pick.object, local: pick.local });
        this.emitCableMode();
      } else if (this.isPulley(pick.object)) {
        // Roldana intermedia: punto de reenvío, el cable sigue abierto.
        this.cablePending.push({ object: pick.object, local: pick.local });
        this.emitCableMode();
      } else {
        // Pieza no-polea: extremo final (ancla B). Cierra el cable.
        this.cablePending.push({ object: pick.object, local: pick.local });
        this.finishCable();
      }
      return;
    }

    // Modo "colocar terminal": el toque sobre una cara ancla el ojal.
    if (this.terminalMode) {
      const hits = this.raycaster.intersectObjects(this.sceneManager.content.children, false);
      const hit = hits[0];
      const hid = hit?.object.userData.sceneObjectId as string | undefined;
      const hostR = hid ? this.objects.get(hid) : undefined;
      if (hit && hostR && hit.face) {
        const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();
        this.colocarTerminal(hostR, hit.point.clone(), normal);
      }
      return;
    }

    // Modo "colocar placa dentada" en tres toques: cara → principio → fin.
    if (this.dentadaMode) {
      const hits = this.raycaster.intersectObjects(this.sceneManager.content.children, false);
      const hit = hits[0];
      const hid = hit?.object.userData.sceneObjectId as string | undefined;
      const hostD = hid ? this.objects.get(hid) : undefined;
      // Se elige cara cuando aún no hay ninguna, o cuando se toca OTRA pieza
      // sin tener un trazo a medias. Un toque sobre el mismo pilar con la
      // cara ya elegida es un punto de la trayectoria, no otra cara: si
      // reeligiera, el segundo toque nunca llegaría a marcar el principio.
      const cambiaPieza = hostD != null && hostD !== this.dentadaHost && !this.dentadaA;
      if (hostD && hit?.face && (!this.dentadaCara || cambiaPieza)) {
        const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();
        this.elegirCaraDentada(hostD, hit.point.clone(), n);
        return;
      }
      if (!this.dentadaCara) return; // aún no hay cara: se está orbitando
      const punto = this.puntoTrayectoriaDentada(hostD === this.dentadaHost ? hit : undefined);
      if (!punto) return;
      if (!this.dentadaA) {
        this.dentadaA = punto;
        this.dibujarGuiaDentada();
        this.bus.emit("dragMeasure", {
          text: tt(
            "Principio marcado. Toca el FINAL de la placa sobre la línea",
            "Start marked. Tap the plate's END along the line",
          ),
        });
        return;
      }
      this.colocarPlacaDentada(this.dentadaA, punto);
      return;
    }

    // Modo "colocar roldana" en dos pasos: estructura → punto del eje azul.
    if (this.roldanaMode) {
      // Con el panel de configuración abierto se puede ORBITAR en vivo: los
      // clics sobre el visor no abren un segundo panel ni mueven el punto.
      if (this.roldanaPidiendo) return;
      const hits = this.raycaster.intersectObjects(this.sceneManager.content.children, false);
      const hit = hits[0];
      const hid = hit?.object.userData.sceneObjectId as string | undefined;
      const hostR = hid ? this.objects.get(hid) : undefined;
      if (!this.roldanaHost) {
        // Fase 1: elegir estructura (un toque al vacío no cancela: se puede
        // orbitar hasta encontrarla).
        if (hostR) this.elegirEstructuraRoldana(hostR);
        return;
      }
      // Fase 2: otro anfitrión cambia la estructura; el propio anfitrión (o
      // un toque cercano al eje azul) elige el punto a lo largo del eje.
      if (hostR && hostR !== this.roldanaHost) {
        this.elegirEstructuraRoldana(hostR);
        return;
      }
      const host = this.roldanaHost;
      const { ejeMundo, half, centro } = this.ejeMayorMundo(host);
      let s: number;
      if (hostR === host && hit) {
        s = hit.point.clone().sub(centro).dot(ejeMundo);
      } else {
        // Punto de la recta del eje más cercano al rayo del puntero; lejos
        // del eje se ignora (el usuario está orbitando). Fórmula estándar de
        // parámetros más cercanos entre recta (C + t·u) y rayo (O + r·d).
        const ray = this.raycaster.ray;
        const w0 = centro.clone().sub(ray.origin);
        const b = ejeMundo.dot(ray.direction);
        const denom = 1 - b * b;
        if (denom < 1e-6) return; // eje paralelo a la vista
        const d0 = ejeMundo.dot(w0);
        const e = ray.direction.dot(w0);
        const t = (b * e - d0) / denom;
        const pEje = centro.clone().addScaledVector(ejeMundo, t);
        if (ray.distanceToPoint(pEje) > Math.max(18, half * 0.25)) return;
        s = t;
      }
      s = THREE.MathUtils.clamp(s, -half, half);
      const puntoEje = centro.clone().addScaledVector(ejeMundo, s);
      const pedir =
        this.elegirRoldana ??
        (async () => ({ tipo: "externa" as const, dir: "arriba" as const }));
      this.roldanaPidiendo = true;
      void pedir().then((cfg) => {
        this.roldanaPidiendo = false;
        if (!cfg || !this.roldanaMode || this.roldanaHost !== host) return;
        this.colocarRoldanaEnEje(host, puntoEje, cfg.tipo, cfg.dir);
      });
      return;
    }

    // Con el panel de la bisagra abierto se puede orbitar: el clic no arma
    // otra ni cambia la selección.
    if (this.bisagraPidiendo) return;

    // Modo conexion: solo objetos editables (no la figura de referencia).
    if (this.connectMode) {
      const objHits = this.raycaster.intersectObjects(
        this.sceneManager.content.children,
        false,
      );
      const golpe = objHits[0];
      const cid = golpe?.object.userData.sceneObjectId as string | undefined;
      const cobj = cid ? this.objects.get(cid) : undefined;
      if (!cobj) return;

      // BISAGRA POR CARAS (v0.3.8): no basta con señalar las dos piezas —hace
      // falta el PUNTO y la CARA donde se atornilla cada placa, igual que en la
      // instalación de una roldana externa. Con las dos caras marcadas, el eje
      // del pivote sale solo y no hay nada que elegir en el panel.
      if (this.connectMode === "revolute") {
        if (!golpe.face) return; // sin cara no hay dónde apoyar la placa
        const cruda = golpe.face.normal
          .clone()
          .transformDirection(golpe.object.matrixWorld)
          .normalize();
        const normal = this.caraDeCaja(cobj, cruda);
        if (!this.bisagraA) {
          this.bisagraA = { obj: cobj, punto: golpe.point.clone(), normal };
          this.pendingA = cobj;
          this.select(cobj);
          this.marcarCaraBisagra(golpe.point, normal);
          this.bus.emit("connectModeChanged", { kind: "revolute", pending: true });
          this.bus.emit("dragMeasure", {
            text: tt(
              `Cara marcada en ${cobj.name}. Toca ahora la CARA de la otra pieza donde va la segunda placa`,
              `Face marked on ${cobj.name}. Now tap the FACE of the other part where the second leaf goes`,
            ),
          });
          return;
        }
        // Un segundo toque en la MISMA pieza corrige la cara elegida en vez de
        // no hacer nada: es el error fácil, y rehacerlo costaba salir y entrar.
        if (cobj === this.bisagraA.obj) {
          this.bisagraA = { obj: cobj, punto: golpe.point.clone(), normal };
          this.marcarCaraBisagra(golpe.point, normal);
          return;
        }
        const primera = this.bisagraA;
        const montaje: MontajeBisagra = {
          a: { punto: primera.punto.clone(), normal: primera.normal.clone() },
          b: { punto: golpe.point.clone(), normal },
        };
        this.olvidarCaraBisagra();
        this.bus.emit("dragMeasure", { text: null });
        this.createJoint(primera.obj, cobj, montaje);
        return;
      }

      if (!this.pendingA) {
        this.pendingA = cobj;
        this.select(cobj);
        this.bus.emit("connectModeChanged", { kind: this.connectMode, pending: true });
      } else if (cobj !== this.pendingA) {
        this.createJoint(this.pendingA, cobj);
      }
      return;
    }

    // Herramienta ORBITAR: el clic no selecciona ni edita — la cámara manda
    // (evita arrastres y cambios de selección inadvertidos en tablet).
    if (this.herramienta === "orbitar") return;

    // Selección normal: objetos editables, cuerdas o figura humana, por cercanía.
    const objHits = this.raycaster.intersectObjects(
      this.sceneManager.content.children,
      false,
    );
    const figHits = this.humanFigure
      ? this.raycaster.intersectObjects([this.humanFigure], true)
      : [];
    const ropeHits = this.raycaster.intersectObjects(this.ropeVisuals.children, true);
    const objDist = objHits[0]?.distance ?? Infinity;
    const figDist = figHits[0]?.distance ?? Infinity;
    const ropeDist = ropeHits[0]?.distance ?? Infinity;

    if (ropeDist < objDist && ropeDist < figDist) {
      const rid = ropeHits[0].object.userData.ropeId as string | undefined;
      if (rid) this.selectRope(rid);
      return;
    }

    if (objDist === Infinity && figDist === Infinity) {
      this.select(null);
    } else if (figDist < objDist) {
      this.selectFigurePart(figHits[0].object);
    } else {
      const id = objHits[0].object.userData.sceneObjectId as string | undefined;
      const obj = (id && this.objects.get(id)) || null;
      if (!obj) {
        this.select(null);
      } else if (this.objGroup.has(obj.id)) {
        if (event.shiftKey || event.ctrlKey || event.metaKey) {
          this.toggleMultiGroup(this.objGroup.get(obj.id)!);
        } else {
          this.selectGroup(this.objGroup.get(obj.id)!);
        }
      } else if (event.shiftKey || event.ctrlKey || event.metaKey) {
        this.toggleMulti(obj);
      } else {
        this.select(obj);
      }
    }
  };

  /** Suelta el nodo de doblado o el agarre de simulación al levantar el puntero. */
  /**
   * Fija el punto de la herramienta de línea (el de inicio o el de fin).
   * Lo llama `onPointerUp` cuando el gesto fue un CLIC y no un arrastre.
   */
  private fijarPuntoLinea(): void {
    if (!this.lineMode) return;
    const pick = this.pickLinePlacePoint();
    if (!this.linePendingA) {
      if (!pick) return;
      this.linePendingA = pick.point.clone();
      this.lineAnclaA = this.anclajeEn(pick.obj, pick.point);
      this.bus.emit("lineModeChanged", { active: true, kind: this.lineMode, count: 1 });
    } else {
      const b = this.axisLock
        ? this.lockedLinePoint(this.linePendingA)
        : (pick?.point ?? null);
      if (!b) return;
      const guia = this.createLinePiece(this.linePendingA, b);
      // ANCLAJES DE LA GUÍA (v0.3.3): la barra queda amarrada a las dos piezas
      // sobre las que se señalaron sus extremos, así que mover el bastidor la
      // arrastra con él en vez de dejarla flotando.
      if (guia && this.lineMode === "guia") {
        const anclaB = this.axisLock ? null : this.anclajeEn(pick?.obj, b);
        if (this.lineAnclaA || anclaB) {
          guia.params.anclajes = {
            a: this.lineAnclaA ?? undefined,
            b: anclaB ?? undefined,
          };
        }
      }
      this.linePendingA = null;
      this.lineAnclaA = null;
      if (this.placementLine) this.placementLine.visible = false;
      this.bus.emit("dragMeasure", { text: null });
      this.bus.emit("lineModeChanged", { active: true, kind: this.lineMode, count: 0 });
    }
  }

  private onPointerUp = (ev: PointerEvent): void => {
    // Herramienta de línea: el clic fija punto; el arrastre era para orbitar.
    if (this.lineMode) {
      const d = this.lineDown;
      this.lineDown = null;
      if (!d) return;
      if (Math.hypot(ev.clientX - d.x, ev.clientY - d.y) > 6) return;
      const rect = this.canvas.getBoundingClientRect();
      this.pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.pointer, this.sceneManager.camera);
      this.fijarPuntoLinea();
      return;
    }
    if (this.marquee) {
      this.finishMarquee();
      return;
    }
    if (this.grabDrag) {
      this.grabDrag = null;
      this.orbit.enabled = true;
      this.bus.emit("dragMeasure", { text: null });
      this.reapoyarFigura();
      this.scheduleAutosave();
      return;
    }
    if (this.dragMove) {
      const starts = this.dragMove.starts;
      // Mismo motivo que en el desplazamiento con flechas: las uniones cuyas
      // dos piezas se han movido tienen que moverse con ellas.
      const primero = [...starts.keys()][0];
      const orig = primero ? starts.get(primero) : undefined;
      const ahora = primero ? this.objects.get(primero)?.mesh.position : undefined;
      if (orig && ahora) {
        const d = ahora.clone().sub(orig);
        if (d.lengthSq() > 1e-10) {
          this.transformarUniones(
            new THREE.Matrix4().makeTranslation(d.x, d.y, d.z),
            [...starts.keys()],
          );
        }
      }
      this.dragMove = null;
      this.orbit.enabled = true;
      this.bus.emit("dragMeasure", { text: null });
      // Canvas completo: si el arrastre dejó piezas fuera del espacio editable,
      // la colocación se cancela y vuelven a su posición anterior.
      if (this.workspace?.canvas === "completo") {
        this.checkWorkspaceBounds();
        if ([...starts.keys()].some((id) => this.fueraIds.has(id))) {
          for (const [id, p] of starts) {
            const o = this.objects.get(id);
            if (!o || this.esPiezaEntorno(o)) continue;
            o.mesh.position.copy(p);
            this.bus.emit("objectTransformed", { object: o });
          }
          this.checkWorkspaceBounds();
          this.avisoFuera();
        }
      }
      this.refreshMultiGizmo();
      this.scheduleAutosave();
      return;
    }
    if (this.simDrag || this.figureDrag) {
      this.endSimInteraction();
      return;
    }
    if (!this.bendDrag) return;
    // Soldadura nodo-nodo: si el nodo se soltó imantado a otra figura, la
    // unión rígida se consuma aquí (esquema Deformación por nodos).
    if (this.bendWeld && this.bendTarget) {
      this.crearSoldadura(this.bendTarget, this.bendWeld.objetoId, this.bendWeld.punto);
    }
    this.bendWeld = null;
    this.snap.hideIndicator();
    this.bendDrag = null;
    this.orbit.enabled = true;
    this.bus.emit("dragMeasure", { text: null });
    this.scheduleAutosave();
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    // No robar atajos mientras se escribe o navega un control de la UI.
    const t = event.target;
    if (
      t instanceof HTMLElement &&
      (t.closest("input, select, textarea") !== null || t.isContentEditable)
    ) {
      return;
    }
    if (event.key === " ") {
      // Con un botón enfocado, Espacio debe activar el botón, no la simulación.
      if (t instanceof HTMLElement && t.closest("button") !== null) return;
      event.preventDefault();
      void this.toggleSimulation();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && !this.simulating) {
      const k = event.key.toLowerCase();
      if (k === "c") {
        this.copySelection();
        return;
      }
      if (k === "v") {
        event.preventDefault();
        this.pasteClipboard();
        return;
      }
      if (k === "x") {
        this.copySelection();
        this.deleteSelection();
        return;
      }
      if (k === "z") {
        event.preventDefault();
        if (event.shiftKey) void this.redo();
        else void this.undo();
        return;
      }
      if (k === "y") {
        event.preventDefault();
        void this.redo();
        return;
      }
    }
    if (this.simulating) return;
    if (this.cableMode && (event.key === "Enter" || event.key === "Return")) {
      this.finishCable();
      return;
    }
    switch (event.key.toLowerCase()) {
      case "1":
        this.setAxisLock("x");
        break;
      case "2":
        this.setAxisLock("y");
        break;
      case "3":
        this.setAxisLock("z");
        break;
      case "0":
        if (this.axisLock) this.setAxisLock(this.axisLock); // libera
        break;
      case "g":
      case "w":
        this.setHerramienta("mover");
        break;
      case "r":
      case "e":
        this.setHerramienta("rotar");
        break;
      case "s":
        this.setHerramienta("escalar");
        break;
      case "delete":
      case "backspace":
        this.deleteSelection();
        break;
      case "escape":
        if (this.axisLock) this.setAxisLock(this.axisLock); // libera el eje
        this.cancelConnect();
        this.cancelCable();
        this.cancelFrenoCable();
        this.cancelColocarFigura();
        this.cancelRope();
        this.cancelLine();
        this.cancelRoldana();
        this.cancelPlacaDentada();
        this.cancelAttachHand();
        this.endBendNodes();
        this.setGrabFigure(false);
        this.select(null);
        break;
    }
  };

  private onResize = (): void => {
    this.sceneManager.resize();
  };
}
