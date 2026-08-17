/**
 * PLACA DENTADA (upright dentado) — v0.2.74.
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
  /** Holgura de la garganta sobre el diámetro de la barra (cm). */
  holguraBarra: 1.06,
  /** Labio mínimo (cm): menos acero que esto no retiene nada. */
  dedoMin: 1.6,
  /** Cuánto pasa el labio del EJE de la barra (cm). Por debajo, no la encierra. */
  labioSobreEje: 0.15,
  /** Suelo de acero bajo la cuna (cm): menos, y la barra lo hunde. */
  rampaMin: 2.5,
  /** Holgura de la boca de entrada sobre el diámetro de la barra (cm). */
  holguraBoca: 0.5,
} as const;

/**
 * LA BARRA, TAL COMO LA VE EL MOTOR (cm de diámetro).
 *
 * No es la que se dibuja. El collider de `barra-olimpica` es UN cilindro del
 * radio MÁS GRANDE de su malla —el de las mangas—, así que para la física la
 * barra mide 6,94 cm de gruesa de punta a punta, aunque el eje se vea fino.
 *
 * Todo el gancho se dimensiona contra ESTE número, porque es el que decide si
 * la barra entra o no. El `.obj` del diseñador dibuja la garganta a la medida
 * de una barra de verdad —2,87 cm, sin una décima de holgura—, y con esa
 * medida aquí la barra se queda posada encima de los dientes: una placa
 * perfecta que no agarra nada.
 *
 * Es UNA constante a propósito. El día que la barra tenga un collider que siga
 * su perfil (mangas gordas, eje fino, como ya hacen las vigas dobladas), se
 * cambia aquí y el gancho entero —garganta, labio y paso mínimo— recupera solo
 * las proporciones del modelo.
 */
export const DENTADA_BARRA_CM = 6.94;

export const DENTADA_PASO_DEF = 12.5;
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
  // …y el suelo que las hace servir para algo: por la garganta tiene que
  // caber la barra.
  const garganta = Math.max(gargantaObj, DENTADA_BARRA_CM + R.holguraBarra);
  const dedo = Math.max(vueloObj - gargantaObj, R.dedoMin);
  return { vuelo: garganta + dedo, garganta };
}

/** Alto del labio: siempre por encima del EJE de la barra, o no la encierra. */
function altoLabio(p: PrimitiveParams, paso: number): number {
  const R = DENTADA_PROPORCIONES;
  const suelo = DENTADA_BARRA_CM / 2 + R.labioSobreEje;
  const alto = Math.max(p.dienteAlto ?? R.dedoAlto * paso, suelo);
  // Y nunca tan alto que tape la boca por la que la barra tiene que entrar.
  return Math.min(alto, Math.max(suelo, paso - DENTADA_BARRA_CM - R.holguraBoca));
}

/**
 * EL FALDÓN MÁS HONDO QUE AÚN DEJA ENTRAR LA BARRA.
 *
 * Aquí está el nudo de toda la pieza, y conviene dejarlo escrito porque no se
 * ve mirando el dibujo. Para meter la barra en un gancho INTERMEDIO hay que
 * pasarla por el pasillo que queda entre la punta del dedo de ese gancho y el
 * FALDÓN del gancho de arriba. Ese pasillo es lo primero que se estrangula
 * cuando los dientes se juntan, y estrangularlo no se nota en la placa: se ve
 * preciosa, la barra se posa encima de los dientes y no baja.
 *
 * El faldón va de (espina, asiento−rampa) a (canto, asiento), así que la
 * distancia de la punta del dedo a esa recta sale en forma cerrada. Pidiendo
 * que sea al menos el diámetro de la barra queda una cuadrática en la rampa
 * —con el coeficiente de segundo grado NEGATIVO, porque el dedo es más fino
 * que la barra—, y su raíz positiva es el faldón máximo.
 */
function rampaMaxima(paso: number, vuelo: number, dedo: number, dedoAlto: number, chaflan: number): number {
  const D = DENTADA_BARRA_CM;
  const A = vuelo * (paso - dedoAlto - chaflan);
  const c = D * D - dedo * dedo;
  if (c <= 0) return Infinity; // dedo más gordo que la barra: nada estrangula
  const disc = A * A * dedo * dedo + c * (A * A - D * D * vuelo * vuelo);
  if (disc < 0) return 0; // a este paso no cabe ni con el faldón plano
  return Math.max(0, (-A * dedo + Math.sqrt(disc)) / c);
}

/**
 * EL PASO MÍNIMO ENTRE GANCHOS, que es lo que hace que la placa sirva.
 *
 * Un gancho tiene que poder RECIBIR una barra, y no solo sostenerla. Si los
 * dientes se juntan más de la cuenta, la barra ya no entra en ninguno salvo
 * en el de arriba del todo —que no tiene nada encima— y la placa se convierte
 * en un adorno con un solo sitio útil. Medido: al paso de 8 cm que traía la
 * pieza al nacer, de doce ganchos sujetaba UNO.
 *
 * Tres condiciones, y manda la más exigente:
 *
 *   · LA BOCA. Por el canto exterior, entre el alto del dedo de un gancho y
 *     el faldón del siguiente, tiene que caber la barra: paso − labio ≥ ⌀.
 *   · EL PASILLO. La barra tiene que poder colarse en diagonal entre la punta
 *     del dedo y el faldón de arriba (ver `rampaMaxima`).
 *   · EL SUELO. Bajo la cuna tiene que quedar acero de verdad: si el faldón se
 *     aplana para dejar sitio, la cuna se queda sin fondo y la barra lo hunde.
 *
 * Con la barra de 6,94 que simula el motor salen 11,9 cm. Con una barra de
 * verdad, de 2,9, saldrían menos de 6 — el suelo lo pone la barra, no el
 * capricho: en cuanto `DENTADA_BARRA_CM` adelgace, esto baja solo.
 */
export function pasoMinimoDentada(p: PrimitiveParams): number {
  // PUNTO FIJO, y no una cuenta de una pasada. El mínimo depende del tamaño
  // del gancho, y el gancho depende un poco del paso —el labio exterior
  // engorda con él—, así que la cuenta se muerde la cola. Sin resolverla, el
  // mínimo que enseña el panel y el paso al que la pieza acaba quedándose se
  // separan un par de décimas, y no hay manera de escribir el número que el
  // propio panel está pidiendo. Converge en dos vueltas: la dependencia es
  // floja (la derivada anda por 0,05).
  let paso = p.dienteEspaciado ?? DENTADA_PASO_DEF;
  for (let i = 0; i < 3; i++) paso = minimoParaHueco({ ...p, dienteEspaciado: paso });
  return paso;
}

function minimoParaHueco(p: PrimitiveParams): number {
  const R = DENTADA_PROPORCIONES;
  const D = DENTADA_BARRA_CM;
  const { vuelo, garganta } = huecoDentada(p);
  const dedo = vuelo - garganta;
  const labio = D / 2 + R.labioSobreEje;

  // 1) La boca de entrada.
  const porBoca = D + labio + R.holguraBoca;

  // 2 y 3) El pasillo con el faldón en su mínimo estructural: se despeja el
  // paso de la misma ecuación que resuelve `rampaMaxima`, ahora con la rampa
  // fijada en su suelo.
  const r = R.rampaMin;
  const K = (D * Math.hypot(r, vuelo) + dedo * r) / vuelo;
  const porPasillo = (K + labio) / (1 - R.chaflan);

  return Math.max(porBoca, porPasillo);
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
  const { vuelo, garganta } = huecoDentada(p);
  // EL PASO NUNCA BAJA DE SU MÍNIMO, aunque se pida. Se prefiere una placa con
  // menos ganchos y todos útiles a una con muchos y uno solo que reciba la
  // barra: el usuario ve enseguida que los ganchos se separaron, y no ve nunca
  // que dejaron de servir.
  const paso = Math.max(pasoMinimoDentada(p), p.dienteEspaciado ?? DENTADA_PASO_DEF);
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

  const dedoAlto = altoLabio(p, paso);
  const chaflan = R.chaflan * paso;
  // EL FALDÓN CEDE ANTES QUE EL PASO. Es la pieza del perfil que se puede
  // recortar sin que el gancho deje de ser un gancho: la cuna, el labio y la
  // garganta los manda la barra, pero la diagonal de debajo solo tiene que
  // dejar sitio para meterla. Cuando los dientes se juntan, se aplana.
  const rampa = Math.max(
    R.rampaMin,
    Math.min(R.rampa * paso, rampaMaxima(paso, vuelo, vuelo - garganta, dedoAlto, chaflan)),
  );

  return {
    paso,
    dientes,
    ancho,
    espina,
    vuelo,
    garganta,
    dedo: vuelo - garganta,
    dedoAlto,
    chaflan,
    rampa,
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
