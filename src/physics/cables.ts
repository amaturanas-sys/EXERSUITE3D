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

/**
 * FRENO (TOPE) DE CABLE (v0.2.40): la esfera engarzada al cable de las
 * máquinas reales. Viaja CON el cable mientras se tira de él, pero no puede
 * pasar por una roldana: al llegar a ella se interpone y el cable deja de
 * retraerse por ese lado. Es lo que mantiene la tensión en el momento cero y
 * evita que un extremo liviano (una barra que cuelga suelta) se robe el
 * recorrido que debería mover el contrapeso.
 *
 * Se guarda como POSICIÓN SOBRE EL RECORRIDO: el segmento donde se colocó y
 * la distancia desde su nodo inicial, medidas en la pose de diseño. `arco`
 * es esa misma posición expresada en longitud de cable desde el nodo 0; se
 * recalcula en diseño y se conserva durante la simulación, que es lo que
 * hace que la esfera se deslice por el cable en vez de quedarse clavada.
 */
export interface TopeCable {
  /** Segmento del recorrido: entre el nodo `seg` y el `seg + 1`. */
  seg: number;
  /** Distancia (cm) desde el nodo `seg` hasta la esfera, en la pose de diseño. */
  dist: number;
  /** Radio de la esfera (cm). */
  radio: number;
  /** Derivado: distancia (cm) desde el nodo 0 a lo largo del cable. */
  arco?: number;
}

let nextCableId = 1;

export class Cable {
  readonly id: string;
  name: string;
  nodes: CableNode[];
  /** Frenos engarzados a este cable (esferas que topan con las roldanas). */
  topes: TopeCable[] = [];

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
