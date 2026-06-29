import type { ComponentDefinition } from "./types";

// Libreria de componentes de maquinas de gimnasio.
// Cada componente parte de una primitiva con dimensiones realistas (cm) y
// atributos fisicos por defecto. Las formas son aproximaciones editables;
// se refinaran con mallas dedicadas en fases posteriores.

const c = (hex: string): number => parseInt(hex.replace("#", ""), 16);

export const COMPONENT_LIBRARY: ComponentDefinition[] = [
  // ---------------------------------------------------------------- ESTRUCTURAL
  {
    id: "pilar",
    label: "Pilar estructural",
    category: "estructural",
    color: c("#6b7280"),
    defaults: { kind: "box", width: 8, height: 200, depth: 8 },
    physics: { massKg: 0, material: "acero", fixed: true },
    description: "Columna vertical de soporte de carga.",
  },
  {
    id: "base-soporte",
    label: "Base de soporte",
    category: "estructural",
    color: c("#4b5563"),
    defaults: { kind: "box", width: 60, height: 6, depth: 60 },
    physics: { massKg: 0, material: "acero", fixed: true },
    description: "Base inferior que ancla la maquina al suelo.",
  },
  {
    id: "base-apoyo",
    label: "Base de apoyo",
    category: "estructural",
    color: c("#52525b"),
    defaults: { kind: "box", width: 40, height: 4, depth: 40 },
    physics: { massKg: 0, material: "acero", fixed: true },
    description: "Apoyo intermedio o pata estabilizadora.",
  },
  {
    id: "soporte-peso",
    label: "Soporte de peso",
    category: "estructural",
    color: c("#71717a"),
    defaults: { kind: "box", width: 30, height: 8, depth: 12 },
    physics: { massKg: 0, material: "acero", fixed: true },
    description: "Brazo o repisa que sostiene la pila de pesos.",
  },

  // ---------------------------------------------------------------- MOVIMIENTO
  {
    id: "guia",
    label: "Guia",
    category: "movimiento",
    color: c("#9ca3af"),
    defaults: { kind: "cylinder", radiusTop: 1.5, radiusBottom: 1.5, height: 180 },
    physics: { massKg: 0, material: "acero-cromado", fixed: true },
    description: "Varilla vertical que guia el recorrido de la pila.",
  },
  {
    id: "riel",
    label: "Riel",
    category: "movimiento",
    color: c("#a1a1aa"),
    defaults: { kind: "box", width: 4, height: 150, depth: 4 },
    physics: { massKg: 0, material: "acero", fixed: true },
    description: "Carril lineal para carros o asientos deslizantes.",
  },
  {
    id: "fulcro",
    label: "Fulcro",
    category: "movimiento",
    color: c("#f59e0b"),
    defaults: { kind: "cylinder", radiusTop: 2, radiusBottom: 2, height: 12 },
    physics: { massKg: 0, material: "acero", fixed: true },
    description: "Punto de apoyo fijo de una palanca.",
  },
  {
    id: "pivote",
    label: "Pivote",
    category: "movimiento",
    color: c("#fbbf24"),
    defaults: { kind: "cylinder", radiusTop: 1.2, radiusBottom: 1.2, height: 8 },
    physics: { massKg: 0.2, material: "acero", fixed: false },
    description: "Eje de rotacion de un brazo o palanca movil.",
  },

  // ---------------------------------------------------------------- TRANSMISION
  {
    id: "polea",
    label: "Polea",
    category: "transmision",
    color: c("#3b82f6"),
    defaults: { kind: "cylinder", radiusTop: 6, radiusBottom: 6, height: 3 },
    physics: { massKg: 0.5, material: "nylon", fixed: false },
    description: "Rueda acanalada que redirige un cable.",
  },
  {
    id: "roldana",
    label: "Roldana",
    category: "transmision",
    color: c("#2563eb"),
    defaults: { kind: "cylinder", radiusTop: 4, radiusBottom: 4, height: 2.5 },
    physics: { massKg: 0.3, material: "nylon", fixed: false },
    description: "Polea pequena de reenvio de cable.",
  },
  {
    id: "engranaje",
    label: "Engranaje",
    category: "transmision",
    color: c("#1d4ed8"),
    defaults: { kind: "cylinder", radiusTop: 5, radiusBottom: 5, height: 2 },
    physics: { massKg: 0.6, material: "acero", fixed: false },
    description: "Rueda dentada para conversion de fuerzas.",
  },
  {
    id: "cable",
    label: "Cable",
    category: "transmision",
    color: c("#d1d5db"),
    defaults: { kind: "cylinder", radiusTop: 0.4, radiusBottom: 0.4, height: 100 },
    physics: { massKg: 0.1, material: "acero-trenzado", fixed: false },
    description: "Cable de acero que transmite la traccion.",
  },
  {
    id: "cadena-eslabones",
    label: "Cadena de eslabones",
    category: "transmision",
    color: c("#9ca3af"),
    defaults: { kind: "cylinder", radiusTop: 0.6, radiusBottom: 0.6, height: 80 },
    physics: { massKg: 0.4, material: "acero", fixed: false },
    description: "Cadena metalica de transmision.",
  },
  {
    id: "liston-kevlar",
    label: "Liston de Kevlar",
    category: "transmision",
    color: c("#ca8a04"),
    defaults: { kind: "box", width: 3, height: 90, depth: 0.4 },
    physics: { massKg: 0.05, material: "kevlar", fixed: false },
    description: "Correa de alta resistencia y baja elongacion.",
  },
  {
    id: "resorte",
    label: "Resorte",
    category: "transmision",
    color: c("#10b981"),
    defaults: { kind: "cylinder", radiusTop: 3, radiusBottom: 3, height: 30 },
    physics: { massKg: 0.3, material: "acero-templado", fixed: false },
    description: "Muelle elastico que almacena energia.",
  },

  // ---------------------------------------------------------------- PESO
  {
    id: "bloque-peso",
    label: "Bloque de peso",
    category: "peso",
    color: c("#111827"),
    defaults: { kind: "box", width: 30, height: 4, depth: 18 },
    physics: { massKg: 5, material: "hierro-fundido", fixed: false },
    description: "Placa de la pila de pesos seleccionable.",
  },
  {
    id: "disco-peso",
    label: "Disco de peso",
    category: "peso",
    color: c("#1f2937"),
    defaults: { kind: "cylinder", radiusTop: 22, radiusBottom: 22, height: 3 },
    physics: { massKg: 20, material: "hierro-fundido", fixed: false },
    description: "Disco olimpico para barras o ejes.",
  },
  {
    id: "contrapeso",
    label: "Contrapeso",
    category: "peso",
    color: c("#374151"),
    defaults: { kind: "box", width: 20, height: 20, depth: 20 },
    physics: { massKg: 15, material: "hierro-fundido", fixed: false },
    description: "Masa de equilibrado del mecanismo.",
  },

  // ---------------------------------------------------------------- ERGONOMICO
  {
    id: "agarradera",
    label: "Agarradera",
    category: "ergonomico",
    color: c("#ef4444"),
    defaults: { kind: "torus", radius: 8, tubeRadius: 1.5 },
    physics: { massKg: 0.4, material: "goma", fixed: false },
    description: "Mango o asa que toma el usuario.",
  },
  {
    id: "asiento",
    label: "Asiento",
    category: "ergonomico",
    color: c("#7c3aed"),
    defaults: { kind: "box", width: 40, height: 6, depth: 35 },
    physics: { massKg: 2, material: "espuma-vinilo", fixed: false },
    description: "Superficie de apoyo del glúteo.",
  },
  {
    id: "respaldo",
    label: "Respaldo",
    category: "ergonomico",
    color: c("#8b5cf6"),
    defaults: { kind: "box", width: 40, height: 50, depth: 6 },
    physics: { massKg: 2, material: "espuma-vinilo", fixed: false },
    description: "Soporte para la espalda.",
  },
];

/** Primitivas neutras disponibles ademas de los componentes. */
export const PRIMITIVE_DEFS: ComponentDefinition[] = [
  {
    id: "prim-box",
    label: "Caja",
    category: "primitiva",
    color: c("#94a3b8"),
    defaults: { kind: "box", width: 30, height: 30, depth: 30 },
    physics: { massKg: 1, material: "generico", fixed: false },
    description: "Primitiva cubo/caja.",
  },
  {
    id: "prim-cylinder",
    label: "Cilindro",
    category: "primitiva",
    color: c("#94a3b8"),
    defaults: { kind: "cylinder", radiusTop: 15, radiusBottom: 15, height: 30 },
    physics: { massKg: 1, material: "generico", fixed: false },
    description: "Primitiva cilindro.",
  },
  {
    id: "prim-sphere",
    label: "Esfera",
    category: "primitiva",
    color: c("#94a3b8"),
    defaults: { kind: "sphere", radius: 15 },
    physics: { massKg: 1, material: "generico", fixed: false },
    description: "Primitiva esfera.",
  },
];

const BY_ID = new Map<string, ComponentDefinition>(
  [...COMPONENT_LIBRARY, ...PRIMITIVE_DEFS].map((d) => [d.id, d]),
);

export function getDefinition(id: string): ComponentDefinition | undefined {
  return BY_ID.get(id);
}

export const CATEGORY_LABELS: Record<string, string> = {
  estructural: "Estructural",
  movimiento: "Movimiento",
  peso: "Peso",
  ergonomico: "Ergonomico",
  transmision: "Transmision",
  primitiva: "Primitivas",
};
