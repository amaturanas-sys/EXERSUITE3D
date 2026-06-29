// Tipos compartidos para los objetos de la escena de EXERSUITE3D.

/** Primitivas geometricas base sobre las que se construyen los componentes. */
export type PrimitiveKind =
  | "box"
  | "cylinder"
  | "sphere"
  | "cone"
  | "torus"
  | "plane";

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
}

/** Categorias funcionales de los componentes de una maquina de gimnasio. */
export type ComponentCategory =
  | "estructural"
  | "movimiento"
  | "peso"
  | "ergonomico"
  | "transmision"
  | "primitiva";

/** Atributos fisicos/mecanicos editables de un componente. */
export interface PhysicalAttributes {
  /** Masa en kilogramos (0 = estatico/anclado). */
  massKg: number;
  /** Material para densidad/rozamiento visual y futura simulacion. */
  material: string;
  /** Si esta anclado al "mundo" (no se mueve aunque tenga masa). */
  fixed: boolean;
}

/** Definicion de un tipo de componente en la libreria. */
export interface ComponentDefinition {
  id: string;
  label: string;
  category: ComponentCategory;
  /** Color base en hex. */
  color: number;
  /** Geometria por defecto. */
  defaults: PrimitiveParams;
  /** Atributos fisicos por defecto. */
  physics: PhysicalAttributes;
  /** Descripcion corta para tooltips. */
  description: string;
}
