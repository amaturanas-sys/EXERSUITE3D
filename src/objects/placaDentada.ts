/**
 * PLACA DENTADA (upright dentado) — v0.2.73.
 *
 * Una sola plancha de acero grueso con ganchos recortados que se atornilla al
 * COSTADO de un pilar y hace el trabajo de una fila de jotas con mucho menos
 * material: donde antes había doce jotas —cada una con su manguito, su pin y su
 * rodillo— hay una placa y sus pernos.
 *
 * DÓNDE VA. En las caras del pilar que NO llevan pinholes, que son las
 * perpendiculares a `ejeCalce`. No hereda nada de la grilla del poste: el paso
 * de sus dientes es cosa suya y se configura aparte. Sirve igual sobre un
 * elemento diagonal, porque la placa se orienta por el eje mayor del anfitrión
 * y no por la vertical del mundo.
 *
 * LA FORMA SALE DEL `.obj` DEL DISEÑADOR. Midiéndolo diente a diente: doce
 * dientes de paso constante, cada uno de 0,4 pasos de alto, con un vuelo de
 * 1,44 pasos sobre una placa de 0,13 pasos de grosor. Tomando el paso como los
 * 5 cm que ya usa el proyecto, eso es una placa de 59 × 9,5 × 0,6 cm con doce
 * ganchos que vuelan 7,2 cm — medidas de acero real, no de dibujo.
 *
 * EL PERFIL DEL DIENTE ES LO QUE IMPORTA. Cada gancho es una J tumbada: una
 * REPISA que sale de la placa y un LABIO que sube en el extremo. Con la placa
 * de respaldo, eso da las tres caras que retienen la barra —suelo, tope
 * delantero y respaldo— y es lo que la física muestrea para que la barra se
 * quede en el diente en vez de resbalar por una caja lisa.
 *
 * Ejes locales: la placa corre por **Y**, apoya su espalda en **−Z** y los
 * dientes vuelan hacia **+Z**. El ancho de la plancha es **X**.
 */

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { PrimitiveParams } from "./types";

/** Proporciones medidas en el `.obj`, en múltiplos del paso entre dientes. */
export const DENTADA_PROPORCIONES = {
  /** Ancho de la plancha. */
  ancho: 1.91,
  /** Grosor de la plancha. */
  grosor: 0.13,
  /** Cuánto vuela el diente por delante de la plancha. */
  vuelo: 1.44,
  /** Alto de la repisa del diente. */
  alto: 0.4,
} as const;

export const DENTADA_PASO_DEF = 5;
export const DENTADA_DIENTES_DEF = 12;

/** Medidas en centímetros de una placa, resueltas desde sus params. */
export interface MedidasDentada {
  paso: number;
  dientes: number;
  ancho: number;
  grosor: number;
  vuelo: number;
  alto: number;
  /** Alto del labio que sube en el extremo del diente. */
  labio: number;
  /** Grosor del labio. */
  labioGrosor: number;
  /** Largo total de la plancha (eje Y). */
  largo: number;
  /** Y del centro del diente `i`, en coordenadas locales. */
  centroDiente: (i: number) => number;
}

/**
 * Resuelve las medidas de una placa.
 *
 * El largo se deduce de los dientes y el paso —no al revés— porque lo que el
 * usuario pide es «doce ganchos cada cinco centímetros»; dejar el largo suelto
 * daría placas que terminan a medio diente. Se le dan medio paso de margen por
 * cada extremo, que es lo que enseña el `.obj`.
 */
export function medidasDentada(p: PrimitiveParams): MedidasDentada {
  const paso = Math.max(1, p.dienteEspaciado ?? DENTADA_PASO_DEF);
  const dientes = Math.max(1, Math.round(p.dientes ?? DENTADA_DIENTES_DEF));
  const R = DENTADA_PROPORCIONES;
  const alto = p.dienteAlto ?? R.alto * paso;
  const vuelo = p.dienteVuelo ?? R.vuelo * paso;
  const largo = (dientes - 1) * paso + paso;
  return {
    paso,
    dientes,
    ancho: p.width ?? R.ancho * paso,
    grosor: p.depth ?? R.grosor * paso,
    vuelo,
    alto,
    labio: alto * 1.25,
    labioGrosor: Math.max(0.8, vuelo * 0.17),
    largo,
    centroDiente: (i) => -largo / 2 + paso / 2 + i * paso,
  };
}

function caja(w: number, h: number, d: number, x: number, y: number, z: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}

/**
 * La placa entera: plancha + un gancho por diente.
 *
 * Los ganchos se fusionan en UNA geometría en vez de dejarse como hijos porque
 * la pieza tiene que comportarse como una sola plancha de acero —se selecciona,
 * se mueve y se voltea entera— y porque la física la lee de la malla.
 */
export function buildDentadaGeometry(p: PrimitiveParams): THREE.BufferGeometry {
  const m = medidasDentada(p);
  const partes: THREE.BufferGeometry[] = [
    // La plancha. Su espalda queda en −Z, que es la cara que se atornilla.
    caja(m.ancho, m.largo, m.grosor, 0, 0, -m.grosor / 2),
  ];

  for (let i = 0; i < m.dientes; i++) {
    const y = m.centroDiente(i);
    // La repisa: sale de la cara delantera de la plancha hacia +Z.
    partes.push(caja(m.ancho, m.alto, m.vuelo, 0, y, m.vuelo / 2));
    // El labio: sube en el extremo y es el tope que retiene la barra.
    partes.push(
      caja(
        m.ancho,
        m.labio,
        m.labioGrosor,
        0,
        y + m.alto / 2 + m.labio / 2,
        m.vuelo - m.labioGrosor / 2,
      ),
    );
  }

  // Pernos de fijación: dos por extremo, hundidos en la plancha. Son detalle,
  // no estructura, pero sin ellos la placa parece flotar pegada al poste.
  const rPerno = Math.max(0.5, m.paso * 0.08);
  for (const y of [-m.largo / 2 + m.paso * 0.45, m.largo / 2 - m.paso * 0.45]) {
    for (const x of [-m.ancho * 0.28, m.ancho * 0.28]) {
      const g = new THREE.CylinderGeometry(rPerno, rPerno, m.grosor * 1.6, 10);
      g.rotateX(Math.PI / 2);
      g.translate(x, y, -m.grosor / 2);
      partes.push(g);
    }
  }

  const geo = mergeGeometries(partes, false) ?? partes[0];
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * LOS ASIENTOS DE LA PLACA, uno por diente, en coordenadas LOCALES (cm).
 *
 * La física de las jotas (`collidersAsiento`) muestrea la malla a lo largo de
 * su eje horizontal más largo y construye UN canal. Aquí no sirve: la placa es
 * VERTICAL y tiene doce canales, uno encima de otro. Por eso la placa declara
 * sus asientos en vez de dejar que se adivinen — cada uno con el suelo de la
 * repisa, el tope del labio y el respaldo de la plancha.
 *
 * Devuelve, por diente, la caja del hueco útil donde descansa la barra.
 */
export interface AsientoDiente {
  /** Centro del hueco en coordenadas locales. */
  centro: [number, number, number];
  /** Tamaño del hueco. */
  tam: [number, number, number];
}

export function asientosDentada(p: PrimitiveParams): AsientoDiente[] {
  const m = medidasDentada(p);
  const out: AsientoDiente[] = [];
  for (let i = 0; i < m.dientes; i++) {
    const y = m.centroDiente(i);
    const fondo = m.vuelo - m.labioGrosor;
    out.push({
      centro: [0, y + m.alto / 2 + m.labio / 2, fondo / 2],
      tam: [m.ancho, m.labio, fondo],
    });
  }
  return out;
}
