import type { ComponentCategory, ComponentDefinition } from "./types";

// Libreria de componentes de maquinas de gimnasio.
// Cada componente parte de una primitiva con dimensiones realistas (cm), un
// material PBR (ver materials.ts) y atributos fisicos por defecto. La paleta
// colorea los componentes por categoria; el material define el aspecto 3D.
// Estilo alineado con los disenos de referencia (POWERRACK, Rack_TTP001L,
// SanLorenzoGym): estructuras de acero negro, guias cromadas, acentos
// azul/naranja, pesos de hierro fundido.

export const COMPONENT_LIBRARY: ComponentDefinition[] = [
  // ---------------------------------------------------------------- ESTRUCTURAL
  {
    id: "pilar",
    label: "Pilar estructural",
    category: "estructural",
    materialId: "acero-negro",
    defaults: { kind: "box", width: 8, height: 200, depth: 8 },
    physics: { massKg: 0, fixed: true },
    description: "Columna vertical de soporte de carga.",
  },
  {
    id: "base-soporte",
    label: "Base de soporte",
    category: "estructural",
    materialId: "acero-negro",
    defaults: { kind: "box", width: 60, height: 6, depth: 60 },
    physics: { massKg: 0, fixed: true },
    description: "Base inferior que ancla la maquina al suelo.",
  },
  {
    id: "base-apoyo",
    label: "Base de apoyo",
    category: "estructural",
    materialId: "acero-negro",
    defaults: { kind: "box", width: 40, height: 4, depth: 40 },
    physics: { massKg: 0, fixed: true },
    description: "Apoyo intermedio o pata estabilizadora.",
  },
  {
    id: "soporte-peso",
    label: "Soporte de peso",
    category: "estructural",
    materialId: "acero-negro",
    defaults: { kind: "box", width: 30, height: 8, depth: 12 },
    physics: { massKg: 0, fixed: true },
    description: "Brazo o repisa que sostiene la pila de pesos.",
  },
  {
    id: "j-hook",
    label: "Gancho J / soporte barra",
    category: "estructural",
    materialId: "acero-negro",
    defaults: { kind: "box", width: 6, height: 10, depth: 14 },
    physics: { massKg: 0, fixed: true },
    description: "Gancho de seguridad que sostiene la barra en el rack.",
  },

  // ---------------------------------------------------------------- MOVIMIENTO
  {
    id: "guia",
    label: "Guia",
    category: "movimiento",
    materialId: "cromo",
    defaults: { kind: "cylinder", radiusTop: 1.5, radiusBottom: 1.5, height: 180 },
    physics: { massKg: 0, fixed: true },
    description: "Varilla vertical que guia el recorrido de la pila.",
  },
  {
    id: "riel",
    label: "Riel",
    category: "movimiento",
    materialId: "acero-pulido",
    defaults: { kind: "box", width: 4, height: 150, depth: 4 },
    physics: { massKg: 0, fixed: true },
    description: "Carril lineal para carros o asientos deslizantes.",
  },
  {
    id: "fulcro",
    label: "Fulcro",
    category: "movimiento",
    materialId: "turquesa",
    defaults: { kind: "cylinder", radiusTop: 2, radiusBottom: 2, height: 12 },
    physics: { massKg: 0, fixed: true },
    description: "Punto de apoyo fijo de una palanca.",
  },
  {
    id: "pivote",
    label: "Pivote",
    category: "movimiento",
    materialId: "turquesa",
    defaults: { kind: "cylinder", radiusTop: 1.2, radiusBottom: 1.2, height: 8 },
    physics: { massKg: 0.2, fixed: false },
    description: "Eje de rotacion de un brazo o palanca movil.",
  },

  // ---------------------------------------------------------------- TRANSMISION
  {
    id: "polea",
    label: "Polea",
    category: "transmision",
    materialId: "nylon",
    defaults: { kind: "cylinder", radiusTop: 6, radiusBottom: 6, height: 3 },
    physics: { massKg: 0.5, fixed: false },
    description: "Rueda acanalada que redirige un cable.",
  },
  {
    id: "roldana",
    label: "Roldana",
    category: "transmision",
    materialId: "nylon",
    defaults: { kind: "cylinder", radiusTop: 4, radiusBottom: 4, height: 2.5 },
    physics: { massKg: 0.3, fixed: false },
    description: "Polea pequena de reenvio de cable.",
  },
  {
    id: "engranaje",
    label: "Engranaje",
    category: "transmision",
    materialId: "acero",
    defaults: { kind: "cylinder", radiusTop: 5, radiusBottom: 5, height: 2 },
    physics: { massKg: 0.6, fixed: false },
    description: "Rueda dentada para conversion de fuerzas.",
  },
  {
    id: "cable",
    label: "Cable",
    category: "transmision",
    materialId: "cromo",
    defaults: { kind: "cylinder", radiusTop: 0.4, radiusBottom: 0.4, height: 100 },
    physics: { massKg: 0.1, fixed: false },
    description: "Cable de acero que transmite la traccion.",
  },
  {
    id: "cadena-eslabones",
    label: "Cadena de eslabones",
    category: "transmision",
    materialId: "acero",
    defaults: { kind: "cylinder", radiusTop: 0.6, radiusBottom: 0.6, height: 80 },
    physics: { massKg: 0.4, fixed: false },
    description: "Cadena metalica de transmision.",
  },
  {
    id: "cadena-seguridad",
    label: "Cadena de seguridad",
    category: "transmision",
    materialId: "acero-negro",
    defaults: { kind: "cylinder", radiusTop: 0.7, radiusBottom: 0.7, height: 90 },
    physics: { massKg: 0.5, fixed: false },
    description: "Cadena de tope/seguridad del power rack (CHAIN SAFE).",
  },
  {
    id: "liston-kevlar",
    label: "Liston de Kevlar",
    category: "transmision",
    materialId: "kevlar",
    defaults: { kind: "box", width: 3, height: 90, depth: 0.4 },
    physics: { massKg: 0.05, fixed: false },
    description: "Correa de alta resistencia y baja elongacion.",
  },
  {
    id: "resorte",
    label: "Resorte",
    category: "transmision",
    materialId: "acero",
    defaults: { kind: "cylinder", radiusTop: 3, radiusBottom: 3, height: 30 },
    physics: { massKg: 0.3, fixed: false },
    description: "Muelle elastico que almacena energia.",
  },

  // ---------------------------------------------------------------- PESO
  {
    id: "bloque-peso",
    label: "Bloque de peso",
    category: "peso",
    materialId: "hierro-fundido",
    defaults: { kind: "box", width: 30, height: 4, depth: 18 },
    physics: { massKg: 5, fixed: false },
    description: "Placa de la pila de pesos seleccionable.",
  },
  {
    id: "disco-peso",
    label: "Disco de peso",
    category: "peso",
    materialId: "hierro-fundido",
    defaults: { kind: "cylinder", radiusTop: 22, radiusBottom: 22, height: 3 },
    physics: { massKg: 20, fixed: false },
    description: "Disco olimpico para barras o ejes.",
  },
  {
    id: "contrapeso",
    label: "Contrapeso",
    category: "peso",
    materialId: "hierro-fundido",
    defaults: { kind: "box", width: 20, height: 20, depth: 20 },
    physics: { massKg: 15, fixed: false },
    description: "Masa de equilibrado del mecanismo.",
  },
  {
    id: "barra-olimpica",
    label: "Barra olimpica",
    category: "peso",
    materialId: "cromo",
    defaults: { kind: "cylinder", radiusTop: 1.45, radiusBottom: 1.45, height: 220, radialSegments: 24 },
    physics: { massKg: 20, fixed: false },
    description: "Barra olimpica de 2.2 m (barbell).",
  },

  // ---------------------------------------------------------------- ERGONOMICO
  {
    id: "agarradera",
    label: "Agarradera",
    category: "ergonomico",
    materialId: "goma",
    defaults: { kind: "torus", radius: 8, tubeRadius: 1.5 },
    physics: { massKg: 0.4, fixed: false },
    description: "Mango o asa que toma el usuario.",
  },
  {
    id: "asiento",
    label: "Asiento",
    category: "ergonomico",
    materialId: "tapizado",
    defaults: { kind: "box", width: 40, height: 6, depth: 35 },
    physics: { massKg: 2, fixed: false },
    description: "Superficie de apoyo del usuario.",
  },
  {
    id: "respaldo",
    label: "Respaldo",
    category: "ergonomico",
    materialId: "tapizado",
    defaults: { kind: "box", width: 40, height: 50, depth: 6 },
    physics: { massKg: 2, fixed: false },
    description: "Soporte para la espalda.",
  },
];

/** Primitivas neutras disponibles ademas de los componentes. */
export const PRIMITIVE_DEFS: ComponentDefinition[] = [
  {
    id: "prim-box",
    label: "Caja",
    category: "primitiva",
    materialId: "generico",
    defaults: { kind: "box", width: 30, height: 30, depth: 30 },
    physics: { massKg: 1, fixed: false },
    description: "Primitiva cubo/caja.",
  },
  {
    id: "prim-cylinder",
    label: "Cilindro",
    category: "primitiva",
    materialId: "generico",
    defaults: { kind: "cylinder", radiusTop: 15, radiusBottom: 15, height: 30 },
    physics: { massKg: 1, fixed: false },
    description: "Primitiva cilindro.",
  },
  {
    id: "prim-sphere",
    label: "Esfera",
    category: "primitiva",
    materialId: "generico",
    defaults: { kind: "sphere", radius: 15 },
    physics: { massKg: 1, fixed: false },
    description: "Primitiva esfera.",
  },
];

const BY_ID = new Map<string, ComponentDefinition>(
  [...COMPONENT_LIBRARY, ...PRIMITIVE_DEFS].map((d) => [d.id, d]),
);

export function getDefinition(id: string): ComponentDefinition | undefined {
  return BY_ID.get(id);
}

export const CATEGORY_LABELS: Record<ComponentCategory, string> = {
  estructural: "Estructural",
  movimiento: "Movimiento",
  peso: "Peso",
  ergonomico: "Ergonomico",
  transmision: "Transmision",
  primitiva: "Primitivas",
};

/** Color de acento por categoria para los swatches de la paleta. */
export const CATEGORY_COLORS: Record<ComponentCategory, number> = {
  estructural: 0x6b7280,
  movimiento: 0xf59e0b,
  transmision: 0x3b82f6,
  peso: 0xeab308,
  ergonomico: 0x8b5cf6,
  primitiva: 0x94a3b8,
};
