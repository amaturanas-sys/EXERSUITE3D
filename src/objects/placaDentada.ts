/**
 * PLACA DENTADA (upright dentado) — v0.2.73.
 *
 * Una sola plancha de acero atornillada al COSTADO de un pilar, con ganchos
 * RECORTADOS en su canto, que hace el trabajo de una fila de jotas con mucho
 * menos material: donde había seis jotas —cada una con su manguito, su pin y su
 * rodillo— hay una placa y sus pernos.
 *
 * EL DIENTE ES UNA MUESCA, NO UNA REPISA. Es el punto que costó entender del
 * modelo del diseñador: la placa es PLANA de punta a punta y el gancho es el
 * perfil de su borde, no un saliente pegado encima. Por eso la geometría se
 * hace extruyendo un contorno 2D y no apilando cajas — con cajas los dientes
 * volaban por delante de la placa, que es justo lo que no son.
 *
 * DÓNDE VA. En las caras del pilar que NO llevan pinholes. No hereda nada de la
 * grilla del poste: su paso es cosa suya. Sirve igual sobre un elemento
 * diagonal, porque se orienta por el eje mayor del anfitrión y no por la
 * vertical del mundo.
 *
 * LAS MEDIDAS SALEN DEL `.obj`, rasterizando su silueta: seis muescas de paso
 * 0,314, con 0,172 de fondo —el 47 % del ancho de la placa— y 0,095 de boca,
 * sobre una plancha de 1,962 × 0,368. Tomando los pinholes del pilar como los
 * 5 cm del proyecto, eso es una placa de 50 × 9,4 cm con dientes cada 8,1 cm y
 * muescas de 4,4 cm de fondo.
 *
 * EL PERFIL DEL GANCHO ES LO QUE RETIENE LA BARRA. La muesca entra, baja a un
 * asiento y vuelve a salir por encima: el labio que queda sobre el asiento es
 * el que impide que la barra ruede hacia fuera. Con la placa de respaldo, esas
 * son las tres caras que la física tiene que ver.
 *
 * Ejes locales: la placa corre por **Y**, su plano es **X-Y** y el grosor va en
 * **Z**. Las muescas se recortan en el canto **+X**.
 */

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { PrimitiveParams } from "./types";

/** Proporciones medidas en el `.obj`, en múltiplos del paso entre dientes. */
export const DENTADA_PROPORCIONES = {
  /** Ancho de la plancha, en múltiplos del paso entre dientes. */
  ancho: 1.17,
  /** Grosor de la plancha. El `.obj` da 0,048; se sube a acero de 8 mm. */
  grosor: 0.10,
  /** Fondo de la muesca: el 47 % del ancho de la plancha. */
  fondo: 0.55,
  /** Boca de la muesca (lo que mide de alto por donde entra la barra). */
  boca: 0.30,
} as const;

export const DENTADA_PASO_DEF = 8;
export const DENTADA_DIENTES_DEF = 6;

/** Medidas en centímetros de una placa, resueltas desde sus params. */
export interface MedidasDentada {
  paso: number;
  dientes: number;
  /** Ancho de la plancha (eje X). */
  ancho: number;
  /** Grosor de la plancha (eje Z). */
  grosor: number;
  /** Cuánto entra la muesca desde el canto. */
  fondo: number;
  /** Alto de la boca por la que entra la barra. */
  boca: number;
  /** Largo total de la plancha (eje Y). */
  largo: number;
  /** Y del centro de la muesca `i`, en coordenadas locales. */
  centroDiente: (i: number) => number;
}

/**
 * Resuelve las medidas de una placa.
 *
 * El largo se deduce de los dientes y el paso —no al revés— porque lo que el
 * usuario pide es «seis ganchos cada ocho centímetros»; dejarlo suelto daría
 * placas que terminan a medio diente. Medio paso de margen por extremo, que es
 * lo que enseña el `.obj`.
 */
export function medidasDentada(p: PrimitiveParams): MedidasDentada {
  const paso = Math.max(2, p.dienteEspaciado ?? DENTADA_PASO_DEF);
  const dientes = Math.max(1, Math.round(p.dientes ?? DENTADA_DIENTES_DEF));
  const R = DENTADA_PROPORCIONES;
  const ancho = p.width ?? R.ancho * paso;
  const largo = dientes * paso;
  return {
    paso,
    dientes,
    ancho,
    grosor: p.depth ?? R.grosor * paso,
    // El fondo nunca puede comerse la plancha entera: se deja al menos un
    // tercio del ancho de espalda, que es lo que le da rigidez a la placa.
    fondo: Math.min(p.dienteVuelo ?? R.fondo * paso, ancho * 0.66),
    boca: p.dienteAlto ?? R.boca * paso,
    largo,
    centroDiente: (i) => -largo / 2 + paso / 2 + i * paso,
  };
}

/**
 * EL CONTORNO DE LA PLACA, recorrido a favor de las agujas del reloj.
 *
 * Se sube por el canto +X abriendo una muesca en cada diente. La muesca no es
 * un rectángulo: entra, BAJA a un asiento y sale por encima, de modo que el
 * material que queda arriba de la boca sobresale sobre el asiento. Ese voladizo
 * es el labio, y es lo único que impide que la barra ruede hacia fuera — un
 * corte recto la dejaría escapar sola.
 */
function contornoDentada(m: MedidasDentada): THREE.Shape {
  const X = m.ancho / 2;
  const Y = m.largo / 2;
  const f = m.fondo;
  const b = m.boca;

  const s = new THREE.Shape();
  s.moveTo(-X, -Y);
  s.lineTo(X, -Y); // canto de abajo

  for (let i = 0; i < m.dientes; i++) {
    const yc = m.centroDiente(i);
    // Se sube por el canto hasta la boca de la muesca.
    s.lineTo(X, yc - b / 2);
    // Entrada y asiento: la barra cae hasta el fondo redondeado.
    s.quadraticCurveTo(X - f * 0.45, yc - b / 2 - f * 0.18, X - f, yc - b * 0.1);
    // Respaldo y salida: se vuelve al canto por encima del asiento.
    s.quadraticCurveTo(X - f * 0.5, yc + b * 0.55, X - f * 0.16, yc + b * 0.72);
    // El labio, que queda volado sobre el asiento.
    s.lineTo(X, yc + b * 0.95);
  }

  s.lineTo(X, Y);
  s.lineTo(-X, Y); // canto de arriba
  s.closePath(); // espalda: la cara que se atornilla al pilar
  return s;
}

/**
 * La placa entera: el contorno extruido más los pernos de fijación.
 *
 * Todo se fusiona en UNA geometría porque la pieza tiene que comportarse como
 * una sola plancha de acero —se selecciona, se mueve y se voltea entera— y
 * porque la física la lee de la malla.
 */
export function buildDentadaGeometry(p: PrimitiveParams): THREE.BufferGeometry {
  const m = medidasDentada(p);
  const plancha = new THREE.ExtrudeGeometry(contornoDentada(m), {
    depth: m.grosor,
    bevelEnabled: false,
    curveSegments: 8,
  });
  // La extrusión crece hacia +Z desde z=0; se centra en el grosor.
  plancha.translate(0, 0, -m.grosor / 2);
  const partes: THREE.BufferGeometry[] = [plancha];

  // Pernos de fijación: dos por extremo, en la espalda. Son detalle, no
  // estructura, pero sin ellos la placa parece pegada al poste con saliva.
  const rPerno = Math.max(0.4, m.paso * 0.05);
  const xPerno = -m.ancho / 2 + Math.max(1.2, m.ancho * 0.16);
  for (const y of [-m.largo / 2 + m.paso * 0.3, m.largo / 2 - m.paso * 0.3]) {
    for (const dx of [0, Math.max(2, m.ancho * 0.22)]) {
      const g = new THREE.CylinderGeometry(rPerno, rPerno, m.grosor * 1.5, 10);
      g.rotateX(Math.PI / 2);
      g.translate(xPerno + dx, y, 0);
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
    const yc = m.centroDiente(i);
    // El hueco útil: desde el fondo de la muesca hasta el canto, y desde el
    // asiento hasta el labio.
    out.push({
      centro: [m.ancho / 2 - m.fondo / 2, yc, 0],
      tam: [m.fondo, m.boca, m.grosor],
    });
  }
  return out;
}
