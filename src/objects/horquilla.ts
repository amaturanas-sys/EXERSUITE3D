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
} {
  const alto = Math.max(p.horquillaAlto ?? 8, 0.4);
  const esp = Math.max(p.horquillaEspesor ?? 0.8, 0.1);
  const garganta = Math.max(p.horquillaGarganta ?? 4.2, 0.2);
  const vuelo = Math.max(p.horquillaVuelo ?? 4, 0.1);
  const radio = alto / 2;
  // El taladro nunca se come la oreja: como mucho, la mitad del semicírculo.
  const agujero = Math.min(Math.max(p.horquillaAgujero ?? 1.3, 0.05), radio * 0.75);
  return { alto, esp, garganta, vuelo, agujero, radio, ancho: garganta + 2 * esp };
}

/**
 * El perfil de una oreja, dibujado en el plano (z, y) —que es como se ve la
 * horquilla de costado— y con el taladro ya recortado.
 */
function perfilOreja(m: ReturnType<typeof medidasHorquilla>): THREE.Shape {
  const s = new THREE.Shape();
  // El alma queda detrás del eje: la oreja arranca en z = −vuelo (contra la
  // cara de la viga) y termina redondeada un radio por delante del taladro.
  const z0 = -m.vuelo;
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
  const oreja = new THREE.ExtrudeGeometry(perfilOreja(m), {
    depth: m.esp,
    bevelEnabled: false,
    curveSegments: 24,
  });
  // La extrusión sale en (x = nuestra z, y = nuestra y, z = espesor): un cuarto
  // de vuelta sobre Y lleva el espesor al eje X —del revés, ocupando [−esp, 0]—
  // y la profundidad de la horquilla al eje Z.
  oreja.rotateY(-Math.PI / 2);
  for (const lado of [-1, 1]) {
    const g = oreja.clone();
    // Cada oreja se corre hasta dejar su cara INTERIOR sobre la garganta.
    g.translate(lado < 0 ? -m.garganta / 2 : m.garganta / 2 + m.esp, 0, 0);
    partes.push(g.toNonIndexed());
  }
  oreja.dispose();

  // EL ALMA: la placa que cierra la horquilla por detrás y que es la que se
  // suelda. Va contra la cara de la viga, al fondo del vuelo.
  const alma = new THREE.BoxGeometry(m.ancho, m.alto, m.esp);
  alma.translate(0, 0, -m.vuelo - m.esp / 2);
  partes.push(alma.toNonIndexed());

  const geo = mergeGeometries(partes, false) ?? partes[0];
  for (const g of partes) if (g !== geo) g.dispose();
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}
