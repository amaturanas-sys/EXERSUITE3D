// Modelo de datos de un cable que recorre una secuencia de nodos (extremos +
// poleas) conservando su longitud total. Es inextensible y solo puede TIRAR
// (restriccion unilateral): cuando esta tenso acopla sus dos extremos; cuando
// hay holgura no ejerce fuerza.
//
// nodeIds[0]      = extremo A (p. ej. agarradera/esfuerzo)
// nodeIds[1..n-1] = poleas de reenvio (puntos de paso)
// nodeIds[n]      = extremo B (p. ej. pila de pesos)

let nextCableId = 1;

export class Cable {
  readonly id: string;
  name: string;
  nodeIds: string[];

  constructor(opts: { nodeIds: string[]; name?: string }) {
    this.id = `cable_${nextCableId++}`;
    this.nodeIds = [...opts.nodeIds];
    this.name = opts.name ?? `Cable ${this.id.split("_")[1]}`;
  }

  get endAId(): string {
    return this.nodeIds[0];
  }

  get endBId(): string {
    return this.nodeIds[this.nodeIds.length - 1];
  }

  get pulleyIds(): string[] {
    return this.nodeIds.slice(1, -1);
  }
}
