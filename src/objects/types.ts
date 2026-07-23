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
  | "tube"; // tubo de acero trazado entre dos puntos

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
  // piezas de linea (beam / tube)
  /**
   * Trayectoria de la pieza en coordenadas locales (cm). Los nodos describen la
   * forma general y se editan con la herramienta de doblado (bending): una
   * curva suave (Catmull-Rom) pasa por todos ellos.
   */
  path?: [number, number, number][];
  /** Extremos del perfil: corte plano o diagonal (solo beam recto). */
  ends?: "plano" | "diagonal";
  /** Diametro de los pinholes (cm); 0 o ausente = sin agujeros (solo beam recto). */
  holeDiameter?: number;
  /** Distancia entre centros de pinholes (cm). */
  holeSpacing?: number;
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
  /** Descripcion corta para tooltips. */
  description: string;
}
