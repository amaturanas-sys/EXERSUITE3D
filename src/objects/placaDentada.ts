/**
 * PLACA DENTADA (upright dentado) — v0.2.73.
 *
 * Una sola plancha de acero atornillada al COSTADO de un pilar, con ganchos
 * recortados en su canto, que hace el trabajo de una fila de jotas con mucho
 * menos material: donde había seis jotas —cada una con su manguito, su pin y
 * su rodillo— hay una placa y sus pernos.
 *
 * EL PERFIL, TAL COMO LO ENSEÑA EL MODELO DEL DISEÑADOR. Costó dos lecturas
 * dar con él, así que conviene dejarlo escrito:
 *
 *   · La placa tiene una ESPINA recta —una banda lisa— que es la que se
 *     atornilla a la cara del pilar. Su ancho es EXACTAMENTE el de esa cara.
 *   · Cada gancho VUELA por delante de la espina, es decir, por fuera del
 *     canto del pilar. Nada del gancho se come la espina: el respaldo que va
 *     contra el poste queda entero, que es lo que aguanta el momento.
 *   · El gancho no es ni una repisa pegada encima ni una muesca simétrica.
 *     Es un faldón que sale en diagonal desde la espina, una CUNA redonda
 *     donde se sienta la barra, y un DEDO que sube por fuera y la encierra.
 *     La boca queda ARRIBA: la barra entra desde arriba y no puede salir de
 *     lado, que es el motivo entero de que el dedo exista.
 *
 * LAS MEDIDAS SALEN DEL `.obj`, rasterizando la silueta de sus tres placas
 * (una de un diente, dos de seis) y midiendo el pilar al que va adosada la
 * tercera. El pilar trae pinholes cada 0,1949 unidades; tomándolos como las
 * 2" del modelo real, la unidad del fichero son 26 cm y sale esto:
 *
 *   paso entre ganchos   0,3188 u → 8,3 cm      garganta   0,1103 u → 2,9 cm
 *   vuelo del gancho     0,1747 u → 4,5 cm      dedo       0,0644 u → 1,7 cm
 *   espina               0,1931 u → 5,0 cm      grosor     0,0154 u → 4 mm
 *
 * La garganta de 2,9 cm es la comprobación que cierra la escala: es el
 * diámetro de una barra olímpica. Y la espina de 5,0 cm es el ancho exacto de
 * la cara del pilar del modelo (5,02) — de ahí sale la regla de que la placa
 * se AJUSTA SOLA al ancho de la cara y solo el gancho sobresale.
 *
 * EL GROSOR ES LA ÚNICA MEDIDA QUE NO SE RESPETA. El `.obj` da 4 mm, que en
 * una plancha de 9,5 cm de vuelo con una barra cargada encima se dobla. Se
 * sube a 8 mm, que es lo que llevan las placas de gancho reales. Es un
 * parámetro (`depth`), así que quien quiera los 4 mm del modelo los pone.
 *
 * DÓNDE VA. En las caras del pilar que NO llevan pinholes. No hereda nada de
 * la grilla del poste: su paso es cosa suya. Sirve igual sobre un elemento
 * diagonal, porque la herramienta la orienta por el eje mayor del anfitrión y
 * no por la vertical del mundo.
 *
 * Ejes locales: la placa corre por **Y**, su plano es **X-Y** y el grosor va
 * en **Z**. La espina ocupa el lado **−X** y los ganchos vuelan hacia **+X**.
 */

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { PrimitiveParams } from "./types";

/**
 * Proporciones medidas en el `.obj`. Las del gancho van en múltiplos del PASO
 * entre dientes, que es la medida que el usuario elige; las de reparto del
 * vuelo, en fracciones del propio vuelo.
 */
export const DENTADA_PROPORCIONES = {
  /** Lo que el gancho sobresale del canto de la cara. 0,1747 u ÷ 0,3188 u. */
  vuelo: 0.548,
  /** De ese vuelo, cuánto es hueco para la barra (el resto es el dedo). */
  garganta: 0.631,
  /** Alto del dedo por encima del asiento de la cuna. */
  dedoAlto: 0.301,
  /** Chaflán de la punta del dedo. */
  chaflan: 0.056,
  /** Faldón: cuánto baja la diagonal desde la cuna hasta la espina. */
  rampa: 0.424,
  /** Del extremo de la plancha al primer asiento. */
  margen: 0.58,
  /** Grosor de la plancha, en cm. El `.obj` da 0,40; se sube a acero de 8 mm. */
  grosorCm: 0.8,
  /** Ancho de la espina cuando no hay cara de la que copiarlo (cm). */
  espinaCm: 5,
  /**
   * GARGANTA MÍNIMA (cm), y de dónde sale este número.
   *
   * El `.obj` dibuja la garganta a la medida de una barra olímpica de verdad:
   * 2,87 cm, el diámetro del eje, sin una décima de holgura. En este proyecto
   * eso NO sirve, y por una razón que no se ve mirando la barra: su collider
   * es UN cilindro del radio MÁS GRANDE de la malla —el de las mangas—, así
   * que para el motor la barra mide 6,94 cm de gruesa de punta a punta. Con
   * la garganta del modelo, la barra se queda posada ENCIMA de los dientes y
   * rueda hasta caerse. Se ve una placa perfecta que no agarra nada.
   *
   * Así que la garganta se mide contra la barra que simula el motor, no
   * contra la que se dibuja: 6,94 más un centímetro de holgura. El gancho
   * sale más ancho que el del modelo del diseñador, y es el precio de que
   * funcione. El día que la barra tenga un collider que siga su perfil —
   * mangas gordas, eje fino, como ya hacen las vigas dobladas— este suelo
   * baja solo y el gancho recupera las proporciones del `.obj`. Mientras
   * tanto, `dienteVuelo` deja ponerlas a mano.
   */
  gargantaMin: 8,
  /** Labio mínimo (cm): menos acero que esto no retiene nada. */
  dedoMin: 1.4,
  /** El labio tiene que llegar al menos a media barra, o no la encierra. */
  dedoAltoMin: 0.45,
} as const;

export const DENTADA_PASO_DEF = 8;
export const DENTADA_DIENTES_DEF = 6;

/**
 * VUELO Y GARGANTA del gancho: lo que sobresale de la cara y, de eso, cuánto
 * es hueco para la barra.
 *
 * Las proporciones del `.obj` mandan mientras el hueco dé para una barra. No
 * siempre da: el gancho del modelo tiene una garganta de 2,87 cm a su paso de
 * 8,3, que es JUSTO el diámetro de una barra olímpica y ni un pelo más — el
 * diseñador dibujó la barra dentro y no le dejó holgura. A pasos más cortos
 * el hueco se estrecha con todo lo demás, y a 5 cm de paso saldría una placa
 * con gargantas de 1,7 cm: preciosa y completamente inútil.
 *
 * Así que la garganta tiene SUELO —una barra olímpica más holgura— y, si por
 * respetarlo se quedara sin labio, el gancho crece hasta que quepan los dos.
 * Al paso de fábrica esto mueve el vuelo dos milímetros; a pasos cortos es lo
 * que separa una pieza de un adorno.
 *
 * La herramienta necesita el vuelo ANTES de que la placa exista, para saber
 * cuánto correrla de lado, así que la cuenta vive aquí y se hace una sola vez.
 */
export function huecoDentada(p: PrimitiveParams): { vuelo: number; garganta: number } {
  const R = DENTADA_PROPORCIONES;
  const paso = Math.max(2, p.dienteEspaciado ?? DENTADA_PASO_DEF);
  // Proporciones del modelo…
  const vueloObj = Math.max(1, p.dienteVuelo ?? R.vuelo * paso);
  const gargantaObj = R.garganta * vueloObj;
  // …y los suelos que las hacen servir para algo.
  const garganta = Math.max(gargantaObj, R.gargantaMin);
  const dedo = Math.max(vueloObj - gargantaObj, R.dedoMin);
  return { vuelo: garganta + dedo, garganta };
}

/** Cuánto sobresale la placa de la cara en la que se apoya. */
export function vueloDentada(p: PrimitiveParams): number {
  return huecoDentada(p).vuelo;
}

/** Cuántos ganchos caben en una plancha de este largo, a este paso. */
export function dientesQueCaben(largo: number, paso: number): number {
  // Cabe n si largo ≥ (n−1)·paso + 2·margen, y margen = 0,58·paso.
  return Math.max(1, Math.floor(largo / paso - 2 * DENTADA_PROPORCIONES.margen + 1));
}

/** Medidas en centímetros de una placa, resueltas desde sus params. */
export interface MedidasDentada {
  /** Distancia entre asientos consecutivos. */
  paso: number;
  dientes: number;
  /** Ancho total de la plancha (eje X): espina + vuelo. */
  ancho: number;
  /** Banda lisa que se atornilla a la cara del pilar. */
  espina: number;
  /** Lo que el gancho sobresale por delante de la cara. */
  vuelo: number;
  /** Hueco donde entra y se sienta la barra. */
  garganta: number;
  /** Labio exterior que encierra la barra. */
  dedo: number;
  /** Alto del dedo sobre el asiento. */
  dedoAlto: number;
  chaflan: number;
  rampa: number;
  /** Grosor de la plancha (eje Z). */
  grosor: number;
  /** Largo total de la plancha (eje Y). */
  largo: number;
  /** X del canto de la espina: donde empieza el vuelo. */
  cantoEspina: number;
  /** X de la cara interior del dedo. */
  caraDedo: number;
  /** Y del punto más bajo de la cuna `i`, en coordenadas locales. */
  asiento: (i: number) => number;
}

/**
 * Resuelve las medidas de una placa.
 *
 * EL LARGO ES UN SUELO, NO UNA JAULA. Lo normal es que venga de los dos
 * puntos que el usuario trazó sobre el pilar, y entonces manda él y los
 * ganchos se reparten dentro. Pero si luego pide más ganchos de los que caben
 * a ese paso, la plancha CRECE en vez de recortar el último a medias — es la
 * única salida que nunca deja una placa rota.
 */
export function medidasDentada(p: PrimitiveParams): MedidasDentada {
  const R = DENTADA_PROPORCIONES;
  const paso = Math.max(2, p.dienteEspaciado ?? DENTADA_PASO_DEF);
  const { vuelo, garganta } = huecoDentada(p);
  // El ancho que llega es el TOTAL; la espina es lo que queda descontado el
  // vuelo, y nunca menos de un centímetro de respaldo.
  const ancho = Math.max(vuelo + 1, p.width ?? R.espinaCm + vuelo);
  const espina = ancho - vuelo;

  const margen = R.margen * paso;
  const trazado = p.height ?? 0;
  const dientes =
    p.dientes != null
      ? Math.max(1, Math.round(p.dientes))
      : trazado > 0
        ? dientesQueCaben(trazado, paso)
        : DENTADA_DIENTES_DEF;
  const minimo = (dientes - 1) * paso + 2 * margen;
  const largo = Math.max(trazado, minimo);

  // Los ganchos van al paso pedido y CENTRADOS en la plancha: si sobra
  // largo, sobra por igual arriba y abajo.
  const sobra = (largo - (dientes - 1) * paso) / 2;

  return {
    paso,
    dientes,
    ancho,
    espina,
    vuelo,
    garganta,
    dedo: vuelo - garganta,
    // El labio, alto como para encerrar media barra: uno de dos centímetros
    // sobre una barra de siete no la retiene, la deja rodar por encima.
    dedoAlto: p.dienteAlto ?? Math.max(R.dedoAlto * paso, garganta * R.dedoAltoMin),
    chaflan: R.chaflan * paso,
    rampa: R.rampa * paso,
    grosor: p.depth ?? R.grosorCm,
    largo,
    cantoEspina: ancho / 2 - vuelo,
    caraDedo: ancho / 2 - (vuelo - garganta),
    asiento: (i) => -largo / 2 + sobra + i * paso,
  };
}

/**
 * EL CONTORNO DE LA PLACA, recorrido dejando el material a la izquierda.
 *
 * Se sube por el canto de la espina y, en cada gancho, se sale en diagonal
 * hasta el canto exterior (el faldón), se sube por fuera (el dedo), se vuelve
 * por su cara interior y se cierra la vuelta rodeando la CUNA, que es un
 * semicírculo del diámetro de la garganta — es decir, del diámetro de la
 * barra. Por eso la barra se sienta y no baila.
 *
 * La boca del gancho queda ARRIBA y sin cerrar: es por donde entra la barra.
 */
function contornoDentada(m: MedidasDentada): THREE.Shape {
  const xEsp = m.cantoEspina;
  const xOut = m.ancho / 2;
  const xDed = m.caraDedo;
  const Y = m.largo / 2;
  const r = m.garganta / 2;
  const cx = (xEsp + xDed) / 2;

  const s = new THREE.Shape();
  s.moveTo(-m.ancho / 2, -Y);
  s.lineTo(xEsp, -Y); // canto de abajo, del ancho de la espina

  for (let i = 0; i < m.dientes; i++) {
    const y = m.asiento(i);
    s.lineTo(xEsp, y - m.rampa); // sube por la espina
    s.lineTo(xOut, y); // el faldón, en diagonal hasta el canto
    s.lineTo(xOut, y + m.dedoAlto); // el canto exterior del dedo
    s.lineTo(xDed, y + m.dedoAlto + m.chaflan); // la punta achaflanada
    s.lineTo(xDed, y + r); // baja por la cara interior del dedo
    s.absarc(cx, y + r, r, 0, Math.PI, true); // la cuna donde se sienta la barra
    // El arco deja el trazo en (xEsp, y + r) y se sigue por la espina.
  }

  s.lineTo(xEsp, Y);
  s.lineTo(-m.ancho / 2, Y); // canto de arriba
  s.closePath(); // espalda: la cara que se atornilla al pilar
  return s;
}

/** Centros de los pernos de fijación, en la espina (coordenadas locales). */
function pernosDentada(m: MedidasDentada): { x: number; y: number }[] {
  // Terna por extremo, como en el `.obj`: dos al filo y uno hacia adentro.
  const x0 = -m.ancho / 2;
  const a = x0 + m.espina * 0.2;
  const b = x0 + m.espina * 0.75;
  const c = (a + b) / 2;
  const out: { x: number; y: number }[] = [];
  for (const s of [1, -1]) {
    const yBorde = s * (m.largo / 2 - m.paso * 0.15);
    const yDentro = s * (m.largo / 2 - m.paso * 0.39);
    out.push({ x: a, y: yBorde }, { x: b, y: yBorde }, { x: c, y: yDentro });
  }
  return out;
}

/**
 * La placa entera: el contorno extruido más los pernos de fijación.
 *
 * Todo se fusiona en UNA geometría porque la pieza tiene que comportarse como
 * una sola plancha de acero —se selecciona, se mueve y se voltea entera—.
 */
export function buildDentadaGeometry(p: PrimitiveParams): THREE.BufferGeometry {
  const m = medidasDentada(p);
  const plancha = new THREE.ExtrudeGeometry(contornoDentada(m), {
    depth: m.grosor,
    bevelEnabled: false,
    curveSegments: 10,
  });
  // La extrusión crece hacia +Z desde z=0; se centra en el grosor.
  plancha.translate(0, 0, -m.grosor / 2);
  const partes: THREE.BufferGeometry[] = [plancha];

  // Los pernos son detalle, no estructura, pero sin ellos la placa parece
  // pegada al poste con saliva.
  const rPerno = Math.max(0.35, m.espina * 0.09);
  for (const { x, y } of pernosDentada(m)) {
    // SIN ÍNDICE, como la extrusión: `mergeGeometries` rechaza la mezcla si
    // unas geometrías traen índice y otras no, y lo hace por consola sin
    // lanzar — la placa salía entera pero sin un solo perno y nadie se
    // enteraba.
    const g = new THREE.CylinderGeometry(rPerno, rPerno, m.grosor * 1.6, 12).toNonIndexed();
    g.rotateX(Math.PI / 2);
    g.translate(x, y, 0);
    partes.push(g);
  }

  const geo = mergeGeometries(partes, false) ?? partes[0];
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * LAS CAJAS DE COLISIÓN DE LA PLACA, en coordenadas LOCALES (cm).
 *
 * La física de las jotas (`collidersAsiento`) muestrea la malla con rayos
 * verticales a lo largo de su eje horizontal más largo y saca UN canal. Aquí
 * no vale: la placa es VERTICAL y tiene seis canales, uno encima de otro, y
 * en un pilar diagonal no está ni vertical. Por eso la placa DECLARA sus
 * cajas en vez de dejar que se adivinen.
 *
 * Cada gancho da tres: el suelo de la cuna, el dedo que la cierra por fuera y
 * el faldón en diagonal. La espina va aparte, entera, y hace de pared interior
 * de las seis cunas a la vez — que es exactamente su papel en el acero.
 */
export interface CajaDentada {
  /** Centro de la caja en coordenadas locales. */
  centro: [number, number, number];
  /** Tamaño completo de la caja. */
  tam: [number, number, number];
}

export function cajasDentada(p: PrimitiveParams): CajaDentada[] {
  const m = medidasDentada(p);
  const out: CajaDentada[] = [];

  // La espina, de punta a punta: respaldo de la placa y pared interior de
  // todas las cunas.
  out.push({
    centro: [(-m.ancho / 2 + m.cantoEspina) / 2, 0, 0],
    tam: [m.espina, m.largo, m.grosor],
  });

  // EL BLOQUE DEL GANCHO LLEGA HASTA EL FALDÓN, y no es una repisa fina.
  //
  // Costó una tarde: la primera versión ponía bajo cada cuna una lámina de
  // 1,3 cm —el grosor aparente de la repisa— y una caja girada siguiendo la
  // diagonal del faldón. La barra hundía la lámina en dos pasos del motor,
  // aterrizaba sobre la CARA DE ARRIBA de la caja del faldón, que no es una
  // superficie de apoyo sino el envés de la repisa, y bajaba rodando de
  // gancho en gancho hasta el suelo. Se veía perfecta y no sujetaba nada.
  //
  // Mirando el perfil de verdad, entre la cuna y el faldón hay entre 3,4 cm
  // de acero (por dentro) y 0,8 (por fuera): es un BLOQUE, no una chapa. Así
  // que la caja va de la cuna hasta la cota del faldón de una pieza. Rellena
  // de más por el canto de fuera —donde el perfil ya adelgaza—, pero ese
  // hueco es aire entre dientes por el que no tiene que pasar nada: la barra
  // entra y sale por ARRIBA, como en cualquier jota.
  const fondo = m.rampa;
  for (let i = 0; i < m.dientes; i++) {
    const y = m.asiento(i);
    // La cuna: suelo donde se sienta la barra y pared de todo lo de abajo.
    out.push({
      centro: [(m.cantoEspina + m.caraDedo) / 2, y - fondo / 2, 0],
      tam: [m.garganta, fondo, m.grosor],
    });
    // El dedo, que sube por fuera: lo que impide que la barra ruede y salga.
    out.push({
      centro: [(m.caraDedo + m.ancho / 2) / 2, y + (m.dedoAlto - fondo) / 2, 0],
      tam: [m.dedo, m.dedoAlto + fondo, m.grosor],
    });
  }
  return out;
}
