/**
 * PUNTO DE ANCLAJE — la horquilla del pasador (v0.3.32).
 *
 * El pasador solo resuelve el EJE, pero un eje no se sostiene en el aire: en la
 * máquina real va cogido por una horquilla soldada a la estructura. Esta pieza
 * es esa horquilla, y es lo que faltaba para que el pasador se pudiera montar
 * como se monta de verdad.
 *
 * LA FORMA, TAL COMO LA ENSEÑA EL MODELO:
 *
 *   · Un ALMA plana —el bloque que se apoya contra la cara de la viga— que es
 *     por donde la pieza va SOLDADA. Su ancho es el de la garganta más las dos
 *     orejas, así que la horquilla nunca es más estrecha que lo que abraza.
 *   · Dos OREJAS paralelas que vuelan del alma y dejan entre ellas la GARGANTA,
 *     que es donde entra el brazo móvil. Van taladradas a la misma cota, y por
 *     ese taladro pasa el pasador: el eje queda cogido por los dos lados, no en
 *     voladizo.
 *   · La punta de cada oreja es REDONDA, un semicírculo centrado EN EL EJE. Es
 *     la única forma que no choca: cualquier esquina, al girar el brazo, barre
 *     un radio mayor que el del taladro y topa contra la viga. Por eso el mismo
 *     redondeo se le pide al extremo proximal del brazo (`extremoRedondo`).
 *
 * El sistema local es el del pasador que va a sostener:
 *
 *   X = EJE DEL PASADOR (la garganta se abre en X)
 *   Y = alto de la horquilla (corre a lo largo de la viga soldada)
 *   Z = del alma hacia la boca (las orejas vuelan en +Z)
 *
 * El origen queda EN EL EJE, no en el alma: así, colocar la horquilla es poner
 * su origen donde está el pasador, sin cuentas.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { PrimitiveParams } from "./types";

/** Medidas efectivas de una horquilla, con los valores por defecto ya puestos. */
export function medidasHorquilla(p: PrimitiveParams): {
  alto: number;
  esp: number;
  garganta: number;
  vuelo: number;
  agujero: number;
  radio: number;
  ancho: number;
  tramos: number;
  arco: number;
  seguro: number;
  arcoR: number;
  discoR: number;
  paso: number;
  discoArco: number;
  cuboR: number;
} {
  const alto = Math.max(p.horquillaAlto ?? 8, 0.4);
  const esp = Math.max(p.horquillaEspesor ?? 0.8, 0.1);
  const garganta = Math.max(p.horquillaGarganta ?? 4.2, 0.2);
  // EL VUELO SE MIDE DESDE LA CARA QUE SE SUELDA (v0.4.3), o sea desde el
  // DORSO del alma, que es el plano que toca la viga. Medido desde la cara de
  // delante —como estaba— la placa entera quedaba ENTERRADA en la viga: en la
  // banca ajustable, 0,57 cm de penetración contra el pilar en todos los
  // ángulos, que es justo el espesor de la chapa menos el pelo del perfil.
  // Nunca menos que la propia chapa: el alma no puede pasarse del eje.
  const vuelo = Math.max(p.horquillaVuelo ?? 4, esp + 0.1);
  const radio = alto / 2;
  // El taladro nunca se come la oreja: como mucho, la mitad del semicírculo.
  const agujero = Math.min(Math.max(p.horquillaAgujero ?? 1.3, 0.05), radio * 0.75);

  // EL DISCO DE TRAMOS y su corona. Los dos radios NO son cotas que alguien
  // teclea: SALEN de la cuenta, que es la misma que guarda `cad/src/lib/
  // indexada.py`. Entre agujero y agujero tiene que quedar acero —al menos el
  // radio del propio agujero—, y de ahí sale el radio mínimo de la corona:
  //
  //     2·R·sen(paso/2) − 2·s ≥ s   ⟹   R ≥ 1,5·s / sen(paso/2)
  //
  // Y la corona tiene que caer FUERA del semicírculo de la oreja, porque si no
  // los agujeros se comerían el canto por el que gira el brazo.
  const tramos = Math.max(0, Math.round(p.horquillaTramos ?? 0));
  const arco = Math.min(360, Math.max(1, p.horquillaArco ?? 180));
  // El seguro es más fino que el pasador: es un pin de retén, no un eje. Se
  // puede pedir a medida (v0.4.2) —es una pieza de catálogo, como el eje—, y
  // de él salen los radios de la corona, así que subirlo ENGORDA EL DISCO.
  const seguro = Math.min(Math.max(p.horquillaSeguro ?? agujero * 0.5, 0.2), radio);
  const vueltaEntera = arco >= 359.9;
  const paso = tramos >= 2 ? arco / (vueltaEntera ? tramos : tramos - 1) : 0;
  const minimo = paso > 0
    ? (1.5 * seguro) / Math.sin((paso * Math.PI) / 360)
    : 0;
  const arcoR = tramos >= 2 ? Math.max(minimo, radio + 2 * seguro) : 0;
  const discoR = tramos >= 2 ? arcoR + 2 * seguro : 0;

  // HASTA DÓNDE LLEGA LA CHAPA (v0.3.52). Un disco redondo entero al lado de
  // una corona que sólo cubre media vuelta es acero que no hace nada y que sí
  // CHOCA: con el chasis, con la viga, con lo que haya detrás. Recortado queda
  // como un Pacman, y lo que se recorta es justo lo que sobraba.
  //
  // Por omisión se le deja al abanico el arco de su corona MÁS el margen que
  // el último agujero necesita por el costado — el mismo criterio que el
  // `canto` usa por el radio, así que el acero alrededor de un agujero es igual
  // por los cuatro lados—.
  const margen = arcoR > 0
    ? (Math.asin(Math.min(1, (2 * seguro) / arcoR)) * 180) / Math.PI
    : 0;
  const discoArco = tramos >= 2
    ? Math.min(360, Math.max(arco, p.horquillaDiscoArco ?? arco + 2 * margen))
    : 0;
  // El cubo alrededor del eje NO se recorta nunca: es lo que agarra el pasador,
  // y un abanico con el vértice en el propio taladro no agarraría nada.
  const cuboR = tramos >= 2 ? Math.max(radio, agujero * 2) : 0;

  return {
    alto, esp, garganta, vuelo, agujero, radio, ancho: garganta + 2 * esp,
    tramos, arco, seguro, arcoR, discoR, paso, discoArco, cuboR,
  };
}

/**
 * El perfil del DISCO DE TRAMOS: la oreja de fuera, crecida hasta ser un disco,
 * con el taladro del eje y la corona de agujeros del seguro.
 *
 * Es lo que en la máquina real fija el brazo por tramos sin soltarlo, y lo que
 * hace innecesaria la pieza suelta que había que soldar al lado del pivote y
 * alinear a mano. La corona se centra en LA BOCA (+Z), que es hacia donde barre
 * el brazo.
 */
function perfilDisco(m: ReturnType<typeof medidasHorquilla>): THREE.Shape {
  const s = new THREE.Shape();
  if (m.discoArco >= 359.9) {
    s.absarc(0, 0, m.discoR, 0, Math.PI * 2, false);
  } else {
    // EL PACMAN, de una sola tirada: se sale por el canto del cubo, se va
    // derecho al canto del abanico, se barre el abanico, se vuelve al cubo y se
    // cierra por el cubo dando la vuelta POR EL LADO QUE SOBRA. Así es un solo
    // contorno cerrado y no hay que unir dos formas, que `THREE.Shape` no sabe.
    const media = (m.discoArco * Math.PI) / 360;
    const a0 = -media;
    const a1 = media;
    s.moveTo(m.cuboR * Math.cos(a0), m.cuboR * Math.sin(a0));
    s.lineTo(m.discoR * Math.cos(a0), m.discoR * Math.sin(a0));
    s.absarc(0, 0, m.discoR, a0, a1, false);
    s.lineTo(m.cuboR * Math.cos(a1), m.cuboR * Math.sin(a1));
    s.absarc(0, 0, m.cuboR, a1, a0 + Math.PI * 2, false);
    s.closePath();
  }
  const taladro = new THREE.Path();
  taladro.absarc(0, 0, m.agujero, 0, Math.PI * 2, true);
  s.holes.push(taladro);
  for (let k = 0; k < m.tramos; k++) {
    const ang = ((-m.arco / 2 + k * m.paso) * Math.PI) / 180;
    const hueco = new THREE.Path();
    hueco.absarc(
      m.arcoR * Math.cos(ang),
      m.arcoR * Math.sin(ang),
      m.seguro,
      0,
      Math.PI * 2,
      true,
    );
    s.holes.push(hueco);
  }
  return s;
}

/**
 * El perfil de una oreja, dibujado en el plano (z, y) —que es como se ve la
 * horquilla de costado— y con el taladro ya recortado.
 */
function perfilOreja(m: ReturnType<typeof medidasHorquilla>): THREE.Shape {
  const s = new THREE.Shape();
  // El alma queda detrás del eje: la oreja arranca donde acaba el alma —o sea
  // un espesor por delante de la cara soldada— y termina redondeada un radio
  // por delante del taladro.
  const z0 = -m.vuelo + m.esp;
  const r = m.radio;
  s.moveTo(z0, -r);
  s.lineTo(0, -r);
  // Semicírculo centrado EN EL EJE (z = 0), que es el origen de la pieza.
  s.absarc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);
  s.lineTo(z0, r);
  s.closePath();
  const taladro = new THREE.Path();
  taladro.absarc(0, 0, m.agujero, 0, Math.PI * 2, true);
  s.holes.push(taladro);
  return s;
}

export function buildHorquillaGeometry(p: PrimitiveParams): THREE.BufferGeometry {
  const m = medidasHorquilla(p);
  const partes: THREE.BufferGeometry[] = [];

  // LAS DOS OREJAS. Se extruyen a lo largo de X —el eje del pasador— y se
  // colocan a un lado y otro de la garganta.
  const extruir = (forma: THREE.Shape): THREE.ExtrudeGeometry =>
    new THREE.ExtrudeGeometry(forma, {
      depth: m.esp,
      bevelEnabled: false,
      curveSegments: 24,
    });
  const oreja = extruir(perfilOreja(m));
  // EL DISCO VA EN UNA SOLA OREJA, la de fuera. Ponerlo en las dos duplicaría
  // el acero sin duplicar nada útil: el seguro entra por un lado y ya está
  // clavado. Es también lo que enseñan las fotos de las jaulas de verdad.
  const disco = m.tramos >= 2 ? extruir(perfilDisco(m)) : null;
  if (disco) disco.rotateY(-Math.PI / 2);
  // La extrusión sale en (x = nuestra z, y = nuestra y, z = espesor): un cuarto
  // de vuelta sobre Y lleva el espesor al eje X —del revés, ocupando [−esp, 0]—
  // y la profundidad de la horquilla al eje Z.
  oreja.rotateY(-Math.PI / 2);
  for (const lado of [-1, 1]) {
    const g = lado > 0 && disco ? disco.clone() : oreja.clone();
    // Cada oreja se corre hasta dejar su cara INTERIOR sobre la garganta.
    g.translate(lado < 0 ? -m.garganta / 2 : m.garganta / 2 + m.esp, 0, 0);
    partes.push(g.toNonIndexed());
  }
  oreja.dispose();
  disco?.dispose();

  // EL ALMA: la placa que cierra la horquilla por detrás y que es la que se
  // suelda. Su DORSO se apoya en la cara de la viga, al fondo del vuelo — y se
  // apoya, no se entierra: ahí está el medio centímetro que se comía.
  const alma = new THREE.BoxGeometry(m.ancho, m.alto, m.esp);
  alma.translate(0, 0, -m.vuelo + m.esp / 2);
  partes.push(alma.toNonIndexed());

  const geo = mergeGeometries(partes, false) ?? partes[0];
  for (const g of partes) if (g !== geo) g.dispose();
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

/** Una caja de colisión de la horquilla, en su sistema local. */
export interface CajaHorquilla {
  centro: [number, number, number];
  tam: [number, number, number];
}

/**
 * LAS CAJAS DE LA HORQUILLA (v0.3.97).
 *
 * LA GARGANTA ES UN HUECO, Y ESTO ES LO QUE LO DICE.
 *
 * Sin estas cajas la pieza caía al camino genérico de `colliderDescs`, que le
 * da UN cuboide de su envolvente: una horquilla MACIZA. El brazo que entra por
 * la boca —que es lo único que esta pieza existe para permitir— aparecía
 * entonces penetrando hasta el fondo del vuelo, y el recorrido lo frenaba una
 * colisión que no está en la malla ni en la máquina.
 *
 * Medido en la banca ajustable al montarle la horquilla: de 4 a 5 cm de
 * penetración de la espina del respaldo, y **los mismos en los siete ángulos
 * de 0° a 90°**. Un solape que no depende del ángulo no es un tope de
 * recorrido; es una pieza que la física ve rellena.
 *
 * Son tres cajas y ninguna es una aproximación grosera: el alma —la placa que
 * se suelda, al fondo— y las dos orejas, una a cada lado de la garganta. La
 * punta redonda de la oreja sí se aproxima por su caja, y da igual: la oreja
 * es FIJA y queda fuera del plano por el que barre el brazo, así que su
 * esquina no llega a tocar nada.
 */
export function cajasHorquilla(p: PrimitiveParams): CajaHorquilla[] {
  const m = medidasHorquilla(p);
  // La oreja va del frente del alma a la punta del semicírculo, que está un
  // radio más allá del eje.
  const largo = m.vuelo + m.radio - m.esp;
  const zOreja = (m.radio - m.vuelo + m.esp) / 2;
  return [
    { centro: [0, 0, -m.vuelo + m.esp / 2], tam: [m.ancho, m.alto, m.esp] },
    { centro: [-(m.garganta + m.esp) / 2, 0, zOreja], tam: [m.esp, m.alto, largo] },
    { centro: [(m.garganta + m.esp) / 2, 0, zOreja], tam: [m.esp, m.alto, largo] },
  ];
}
