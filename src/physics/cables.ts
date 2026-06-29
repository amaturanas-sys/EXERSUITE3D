// Modelo de datos de un cable que recorre una secuencia de nodos (extremos +
// poleas) conservando su longitud total. Es inextensible y solo puede TIRAR
// (restriccion unilateral): cuando esta tenso acopla sus dos extremos; cuando
// hay holgura no ejerce fuerza.
//
// Cada nodo se engancha a un PUNTO DE ANCLAJE concreto de una pieza (no solo a
// su centro): `local` es el punto en coordenadas locales (cm, sin escala) de la
// geometria, de modo que el enganche sigue la posicion y rotacion de la pieza.
//
// nodes[0]      = extremo A (p. ej. agarradera/esfuerzo)
// nodes[1..n-1] = poleas de reenvio (puntos de paso)
// nodes[n]      = extremo B (p. ej. pila de pesos)

export interface CableNode {
  objectId: string;
  /** Punto de anclaje en el espacio local (cm) de la pieza. */
  local: { x: number; y: number; z: number };
}

let nextCableId = 1;

export class Cable {
  readonly id: string;
  name: string;
  nodes: CableNode[];

  constructor(opts: { nodes: CableNode[]; name?: string }) {
    this.id = `cable_${nextCableId++}`;
    this.nodes = opts.nodes.map((n) => ({ objectId: n.objectId, local: { ...n.local } }));
    this.name = opts.name ?? `Cable ${this.id.split("_")[1]}`;
  }

  get endAId(): string {
    return this.nodes[0].objectId;
  }

  get endBId(): string {
    return this.nodes[this.nodes.length - 1].objectId;
  }

  get pulleyIds(): string[] {
    return this.nodes.slice(1, -1).map((n) => n.objectId);
  }
}
