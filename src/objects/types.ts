// Tipos compartidos para los objetos de la escena de EXERSUITE3D.

/** Primitivas geometricas base sobre las que se construyen los componentes. */
export type PrimitiveKind =
  | "box"
  | "cylinder"
  | "sphere"
  | "cone"
  | "torus"
  | "plane"
  | "beam" // perfil de acero (pilar/travesano) trazado entre dos puntos
  | "tube" // tubo de acero trazado entre dos puntos
  | "dentada"; // placa de acero con ganchos, atornillada al costado de un pilar

/**
 * Parametros dimensionales de una primitiva, SIEMPRE en centimetros (o grados/segmentos).
 * Solo se usan los campos relevantes segun `kind`.
 */
export interface PrimitiveParams {
  kind: PrimitiveKind;
  // box / plane
  width?: number; // X (cm)
  height?: number; // Y (cm)
  depth?: number; // Z (cm)
  // cylinder / cone
  radiusTop?: number; // cm
  radiusBottom?: number; // cm
  // sphere
  radius?: number; // cm
  // torus
  tubeRadius?: number; // cm
  // discretizacion
  radialSegments?: number;
  // modelado avanzado
  /** Doblado a lo largo del eje Y, en grados. */
  bendDeg?: number;
  /** Torsion alrededor del eje Y, en grados. */
  twistDeg?: number;
  /** Bisel/redondeo de aristas (cm), solo cajas. */
  bevel?: number;
  /**
   * Altura del extremo +X (cm), solo cajas: si difiere de `height`, la caja
   * se vuelve un PRISMA TRAPEZOIDAL cuyo tope va de height (−X) a height2
   * (+X) — los muros bajo una techumbre inclinada tocan el techo en toda su
   * longitud, sin triángulos vacíos.
   */
  height2?: number;
  // piezas de linea (beam / tube)
  /**
   * Trayectoria de la pieza en coordenadas locales (cm). Los nodos describen la
   * forma general y se editan con la herramienta de doblado (bending): una
   * curva suave (Catmull-Rom) pasa por todos ellos.
   */
  path?: [number, number, number][];
  /** Extremos del perfil: corte plano o diagonal (solo beam recto). */
  ends?: "plano" | "diagonal";
  /**
   * Diametro de los agujeros (cm); 0 o ausente = sin agujeros.
   * - beam recto: pinholes laterales a lo largo de la pieza.
   * - box: DOS ORIFICIOS VERTICALES pasantes (eje Y) que abrazan los tubos
   *   guia de un sistema de poleas — como los cilindros huecos del carrier
   *   del TTP: la pieza se desliza por las guias verticales.
   */
  holeDiameter?: number;
  /** Distancia entre centros de los agujeros (cm). */
  holeSpacing?: number;
  /**
   * DISCOS MONTADOS en la pieza (carrier, barra olimpica, cuerno de carga,
   * atril): cantidad de discos ensamblados introduciendo el cilindro por el
   * orificio central — quedan suspendidos por la estructura y se mueven con
   * ella. La definicion del componente (cargaDiscos) fija lados y medidas.
   */
  discCount?: number;
  /**
   * VENTANAS RECTANGULARES PASANTES (v0.2.30): huecos calados de verdad en la
   * pieza — los abre la herramienta de roldana INTERNA en las dos caras que
   * quedan sobre y bajo la rueda, para que el cable pase sin obstruirse y la
   * rueda no choque con la cara. Viajan en los params, así que sobreviven a
   * la reconstrucción de la geometría, al guardado del proyecto y a los
   * prefabs.
   */
  ventanas?: VentanaRect[];
  /**
   * PLACA DENTADA (v0.2.73): cuántos ganchos lleva y cada cuánto.
   *
   * Son parámetros PROPIOS y no heredados del pilar: la placa se atornilla a
   * las caras que NO llevan pinholes, así que su grilla no tiene por qué
   * coincidir con la del poste. El largo de la plancha sale de estos dos —lo
   * que se pide es «doce ganchos cada cinco centímetros», y dejar el largo
   * suelto daría placas que terminan a medio diente—.
   */
  dientes?: number;
  /** Distancia entre centros de dientes (cm). */
  dienteEspaciado?: number;
  /** Alto de la repisa del diente (cm). Por defecto, 0,4 del paso. */
  dienteAlto?: number;
  /** Cuánto vuela el diente por delante de la plancha (cm). */
  dienteVuelo?: number;
  /**
   * VOLTEO / ESPEJADO (v0.2.32): ejes locales en los que la pieza está
   * espejada. Se hornea en la GEOMETRÍA en lugar de usar una escala
   * negativa, porque una escala negativa invierte también los ejes del
   * gizmo y del arrastre preciso — el usuario tiraba de +X y la pieza se
   * iba a −X. Con el espejo horneado la pieza se ve igual y sus ejes
   * siguen concordando con el mundo.
   */
  espejo?: [boolean, boolean, boolean];
}

/**
 * Hueco rectangular PASANTE en coordenadas LOCALES de la pieza (cm): un eje
 * por el que atraviesa y el rectángulo (centro + tamaños) en el plano
 * perpendicular. El par de coordenadas del plano es (Y,Z) para el eje X,
 * (Z,X) para el eje Y y (X,Y) para el eje Z.
 */
export interface VentanaRect {
  /** Eje local que atraviesa la pieza de lado a lado. */
  eje: "x" | "y" | "z";
  /** Centro del hueco: primera coordenada del plano perpendicular. */
  u: number;
  /** Centro del hueco: segunda coordenada del plano perpendicular. */
  v: number;
  /** Tamaño del hueco en la primera coordenada del plano. */
  du: number;
  /** Tamaño del hueco en la segunda coordenada del plano. */
  dv: number;
}

/** Categorias funcionales de los componentes de una maquina de gimnasio. */
export type ComponentCategory =
  | "estructural"
  | "movimiento"
  | "peso"
  | "ergonomico"
  | "transmision"
  | "primitiva";

/**
 * Informacion de una pila de pesos selectorizada. El tubo selector arrastra las
 * placas enganchadas por el pin (la seleccionada y las de encima); las de debajo
 * no se mueven. La masa movilizada = selected * plateMassKg.
 */
export interface StackInfo {
  /** Numero total de placas del stack. */
  plateCount: number;
  /** Masa de cada placa (kg). */
  plateMassKg: number;
  /** Placas seleccionadas (desde arriba) que se movilizan. */
  selected: number;
}

/** Atributos fisicos/mecanicos editables de un componente. */
export interface PhysicalAttributes {
  /** Masa en kilogramos (0 = estatico/anclado). */
  massKg: number;
  /** Si esta anclado al "mundo" (no se mueve aunque tenga masa). */
  fixed: boolean;
}

/** Definicion de un tipo de componente en la libreria. */
export interface ComponentDefinition {
  id: string;
  label: string;
  category: ComponentCategory;
  /** Id del material PBR por defecto (ver materials.ts). */
  materialId: string;
  /** Geometria por defecto. */
  defaults: PrimitiveParams;
  /** Atributos fisicos por defecto. */
  physics: PhysicalAttributes;
  /** Si es una pila selectorizada, sus parametros por defecto. */
  stack?: StackInfo;
  /**
   * Colocación especial con herramienta de línea (dos extremos): cuerdas
   * (cadena/correa de seguridad) o piezas trazadas (perfil/tubo de acero).
   */
  placement?: "rope-chain" | "rope-strap" | "beam" | "tube";
  /**
   * Rotación de INSERCIÓN (auditoría de biblioteca): algunas piezas nacen
   * giradas para quedar en su orientación natural (p. ej. barras de
   * dominadas horizontales, discos de pie como rueda).
   */
  orientacion?: [number, number, number];
  /**
   * Paso de la grilla de agujeros de calce (cm) en postes verticales: las
   * jotas y brazos de seguridad suben/bajan por el poste AGUJERO POR AGUJERO
   * con este paso.
   */
  holeStepCm?: number;
  /**
   * Eje LOCAL horizontal por el que atraviesan los PINHOLES estandarizados
   * del poste (diámetro y paso nominales, presentes en AMBAS caras): el pin
   * de las jotas/brazos solo articula con estos orificios — no con los
   * agujeros accesorios de otras caras.
   */
  ejeCalce?: "x" | "z";
  /**
   * Fase de la grilla de pinholes (cm): desplazamiento de la fila más
   * cercana al centro del poste a lo largo de su eje largo (medido en la
   * malla real). La grilla es fase + k·holeStepCm.
   */
  calceFase?: number;
  /**
   * Punto local [x, z] del MANGUITO DE ENSAMBLE (cm): el espacio de la pieza
   * diseñado para abrazar el pilar (jotas, brazos de seguridad). Al calzar,
   * el eje del poste pasa por este punto — la pieza queda COLOCADA en la
   * estructura, no flotando. Sin él, se intenta detectar la cavidad en la
   * malla.
   */
  calceLocal?: [number, number];
  /**
   * Eje LOCAL horizontal con el que la pieza ENCARA el poste al calzar (el
   * pin/mordaza mira en esta dirección). Por defecto "z" (jotas y brazos);
   * el anclaje de cadena monta por "x".
   */
  frenteCalce?: "x" | "z";
  /**
   * Cantidad de POSTES de los que se sostiene la pieza al calzar (def. 1).
   * Las jotas/ganchos cuelgan de UN pilar; el brazo de seguridad se TIENDE
   * entre DOS pilares a la vez: al calzar se alinea sobre la línea que los
   * une y subir/bajar lo mueve un agujero en AMBOS simultáneamente (misma
   * grilla).
   */
  postesCalce?: 1 | 2;
  /**
   * Punto local [x, z] del CILINDRO-PIVOTE (cm): el eje horizontal del que
   * cuelgan cadenas o se articulan BRAZOS móviles (jammer arms). Si falta,
   * el pivote es el centro de la pieza.
   */
  pivoteLocal?: [number, number];
  /**
   * Eje LOCAL del cilindro-pivote. En el anclaje de cadena es PERPENDICULAR
   * al pin de calce: el pin (frenteCalce) entra en los pinholes del pilar y
   * el brazo gira alrededor del cilindro perpendicular.
   */
  ejePivote?: "x" | "z";
  /**
   * La pieza CARGA DISCOS por su eje (se ensamblan por el orificio central
   * del disco y quedan suspendidos): lados de carga (1 = un extremo,
   * 2 = ambos), diametro/grosor del disco (cm) y masa por disco (kg).
   */
  cargaDiscos?: CargaDiscosDef;
  /**
   * La pieza tiene un ASIENTO CÓNCAVO que recibe la barra (jotas, brazos de
   * seguridad): su física debe seguir el PERFIL real de la malla — el motor
   * muestrea la superficie superior y construye el canal (asiento bajo,
   * tope delantero, respaldo) para que la barra quede RETENIDA en la
   * concavidad en vez de resbalar sobre una caja lisa.
   */
  asientoBarra?: boolean;
  /**
   * CURADURÍA DE LA PALETA (v0.2.18): qué hace la pieza en "Piezas
   * disponibles" del Builder. "oculta" = redundante con una pieza real o
   * plantilla interna; "despiece" = pieza INTERNA de una máquina real
   * (TTP/POWERRACK). Desde v0.2.28 ninguna de las dos se lista en el
   * Builder — la sección plegable del despiece se eliminó —, pero la
   * etiqueta se conserva porque describe el papel de la pieza. SOLO afecta
   * a la paleta: prefabs, máquinas estándar, proyectos guardados y la
   * Biblioteca de modelos siguen resolviendo la pieza por su id.
   */
  paleta?: "oculta" | "despiece";
  /** Descripcion corta para tooltips. */
  description: string;
}

/** Definicion de la carga de discos de una pieza (ver ComponentDefinition). */
export interface CargaDiscosDef {
  lados: 1 | 2;
  diamCm: number;
  grosorCm: number;
  masaKg: number;
  /**
   * Distancia del centro al HOMBRO de la manga de carga (cm, piezas de dos
   * lados): el cilindro del diámetro del orificio central del disco empieza
   * en esta deflección (cambio de grosor) y los discos se apilan contra
   * ella, como en una barra olímpica real. Medido en la malla oficial.
   */
  mangaCm?: number;
}
