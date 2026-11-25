#!/usr/bin/env node
/**
 * EL MANIQUÍ DE SERIE, DEL MODELO CON RIG AL CUERPO DE LA APLICACIÓN (v0.4.14).
 *
 * Entra un cuerpo con esqueleto (rig de 22 huesos al estilo Mixamo, ~296.000
 * triángulos, en pose T y normalizado a un cubo de 1 m) y salen, en
 * `public/models/maniqui/`:
 *
 *   · `piel.glb` — la PIEL: una malla con skinning, aligerada a un presupuesto
 *     de triángulos y con sus pesos pasados del rig de origen a las 14
 *     articulaciones del maniquí (más la raíz). Es lo que se VE.
 *   · los 16 segmentos de siempre (`cabeza.glb`, `torso.glb`…) — trozos RÍGIDOS
 *     de esa misma piel, cortados por el hueso que más pesa en cada triángulo.
 *     Son lo que se MIDE: dónde pisa la planta, cuánto se hunde un muslo, qué
 *     toca el asiento, el cuerpo físico del maniquí. La aplicación entera se
 *     apoya en ellos y no se tocan sus nombres ni su formato (cm, pies en y=0,
 *     mirando a +Z, el lado «L» en −X).
 *   · `manifest.json` — los 16 segmentos, la PIEL y las `juntas`: dónde
 *     articula el cuerpo nuevo.
 *
 * Uso:
 *
 *   node scripts/procesar-maniqui.mjs [fuente.glb] [--tris 24000] [--salida dir]
 *
 * Por omisión lee `fuentes/maniqui/maniqui-rig.glb`. Es determinista: la misma
 * fuente da los mismos archivos.
 *
 * LO QUE HACE, POR ORDEN, Y POR QUÉ:
 *
 *  1. Lleva el cuerpo al espacio de la aplicación: centímetros, 175 de talla,
 *     pies en y=0, mirando a +Z.
 *  2. Pasa los pesos de los 22 huesos de origen a los 15 del maniquí (las tres
 *     vértebras y las clavículas son el tronco; cuello y cabeza, el cuello; el
 *     pie y los dedos, el tobillo) y suelda los vértices duplicados por las
 *     costuras de UV (la piel se pinta de un color liso, la UV no se usa).
 *  3. Le quita la pose T. Las posturas de la aplicación cuentan sus grados
 *     desde el reposo del maniquí, y ese reposo es el del cuerpo anterior: el
 *     brazo abierto 23,9° y el antebrazo 5,6° respecto de la vertical, el
 *     muslo 7,2°, la pierna a plomo, el pie plano y nada inclinado hacia
 *     delante ni hacia atrás (ver «EL MANIQUÍ SE PONE A PLOMO» en el CHANGELOG).
 *     Con la pose T, «De pie» saldría con los brazos en cruz y cada postura del
 *     catálogo, desplazada 66° en el hombro. Se hace con el propio rig: cada
 *     hueso gira sobre su articulación y la piel lo sigue con sus pesos.
 *  4. Calcula las juntas como el centro del ANILLO donde los pesos de dos
 *     huesos vecinos se reparten a medias: ahí es donde la piel dobla, y girar
 *     un miembro sobre otro punto lo cizalla. La columna, a los 100 cm de
 *     siempre. Se miden sobre la malla entera, no sobre la aligerada.
 *  5. Aligera con meshoptimizer hasta el presupuesto. El aligerado sólo QUITA
 *     vértices: los que quedan conservan su posición, su normal y sus pesos
 *     exactos, sin interpolar; y lleva los pesos como atributo, para no
 *     comerse las aristas de las articulaciones, que es donde la piel dobla.
 *  6. Retoca dos repartos de pesos para que la piel doble donde dobla el
 *     maniquí: el tronco sobre esos 100 cm, y el glúteo con la pelvis.
 *  7. Corta los 16 segmentos y escribe todo.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Document, NodeIO } from "@gltf-transform/core";
import { MeshoptSimplifier } from "meshoptimizer";
import * as THREE from "three";

const RAIZ_REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ------------------------------------------------------------------ opciones
const args = process.argv.slice(2);
const opcion = (nombre, porDefecto) => {
  const i = args.indexOf(nombre);
  if (i < 0) return porDefecto;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const PRESUPUESTO_TRIS = Number(opcion("--tris", "24000"));
const SALIDA = path.resolve(opcion("--salida", path.join(RAIZ_REPO, "public/models/maniqui")));
const FUENTE = path.resolve(args[0] ?? path.join(RAIZ_REPO, "fuentes/maniqui/maniqui-rig.glb"));

// -------------------------------------------------------------- constantes
/** Talla del maniquí de serie: la aplicación lo reescala a la que se pida. */
const TALLA = 175;

/**
 * EL REPOSO DEL MANIQUÍ, en grados respecto de la vertical y en el plano
 * frontal. Son los del cuerpo anterior, leídos de sus juntas: el brazo
 * hombro→codo (−9,68, −21,86), el antebrazo codo→muñeca (−2,87, −29,38), el
 * muslo cadera→rodilla (−4,88, −38,68) y la pierna rodilla→tobillo a plomo.
 * Conservarlos es lo que mantiene válidos los grados de cada postura.
 */
const REPOSO = { brazo: 23.88, antebrazo: 5.58, muslo: 7.19, pierna: 0 };

/**
 * DÓNDE DOBLA LA COLUMNA (cm desde el suelo, a 175 de talla) y la anchura de
 * la transición. El rig de origen pasa de cadera a vértebras hacia los 110 cm
 * —es su hueso Spine—, pero el maniquí dobla el tronco a 100 desde v0.2.60:
 * justo encima de la pelvis, donde empieza la flexión, y con el vientre
 * acompañando al pecho. Mover la bisagra 10 cm cambiaría todas las posturas
 * con el tronco inclinado, así que se mueven los pesos y no la bisagra.
 */
const COLUMNA_Y = 100;
const COLUMNA_BANDA = 7;

/** Las articulaciones del maniquí (`joints` del rig) y su madre. */
const MADRE = {
  raiz: null,
  spine: "raiz",
  neck: "spine",
  shoulderL: "spine",
  elbowL: "shoulderL",
  wristL: "elbowL",
  shoulderR: "spine",
  elbowR: "shoulderR",
  wristR: "elbowR",
  hipL: "raiz",
  kneeL: "hipL",
  ankleL: "kneeL",
  hipR: "raiz",
  kneeR: "hipR",
  ankleR: "kneeR",
};
const HUESOS = Object.keys(MADRE);
const H = Object.fromEntries(HUESOS.map((n, i) => [n, i]));

/** Segmento de cada hueso del maniquí (cuello y cabeza se separan aparte). */
const SEGMENTO_DE_HUESO = {
  raiz: "pelvis",
  spine: "torso",
  neck: "cuello",
  shoulderL: "brazo-sup-L",
  elbowL: "antebrazo-L",
  wristL: "mano-L",
  shoulderR: "brazo-sup-R",
  elbowR: "antebrazo-R",
  wristR: "mano-R",
  hipL: "muslo-L",
  kneeL: "pierna-L",
  ankleL: "pie-L",
  hipR: "muslo-R",
  kneeR: "pierna-R",
  ankleR: "pie-R",
};
const SEGMENTOS = [
  "cabeza", "cuello", "torso", "pelvis",
  "brazo-sup-L", "brazo-sup-R", "antebrazo-L", "antebrazo-R", "mano-L", "mano-R",
  "muslo-L", "muslo-R", "pierna-L", "pierna-R", "pie-L", "pie-R",
];

/**
 * Hueso de origen → hueso del maniquí. El lado no sale del nombre sino de
 * dónde está: el rig de origen llama «Left» al lado izquierdo DEL PERSONAJE
 * (+X, mirando a +Z) y el maniquí llama «L» al que vive en −X. Leerlo de la
 * posición evita tener que acordarse de la inversión.
 */
const BASE = {
  Hips: "raiz",
  Spine: "spine",
  Spine1: "spine",
  Spine2: "spine",
  Shoulder: "spine", // la clavícula va con el tronco: el maniquí no la articula
  Neck: "neck",
  Head: "neck",
  Arm: "shoulder",
  ForeArm: "elbow",
  Hand: "wrist",
  UpLeg: "hip",
  Leg: "knee",
  Foot: "ankle",
  ToeBase: "ankle",
};

// ------------------------------------------------------------------ lectura
const io = new NodeIO();
const doc = await io.read(FUENTE);
const raizDoc = doc.getRoot();
const skin = raizDoc.listSkins()[0];
if (!skin) throw new Error("La fuente no trae esqueleto (skin)");
const nodoMalla = raizDoc.listNodes().find((n) => n.getMesh() && n.getSkin());
const prims = nodoMalla.getMesh().listPrimitives();
if (prims.length !== 1) throw new Error(`Se esperaba una primitiva, hay ${prims.length}`);
const prim = prims[0];

const local = (n) =>
  new THREE.Matrix4().compose(
    new THREE.Vector3(...n.getTranslation()),
    new THREE.Quaternion(...n.getRotation()),
    new THREE.Vector3(...n.getScale()),
  );
const mundoCache = new Map();
const mundo = (n) => {
  if (mundoCache.has(n)) return mundoCache.get(n);
  const p = n.getParentNode();
  const m = p ? mundo(p).clone().multiply(local(n)) : local(n);
  mundoCache.set(n, m);
  return m;
};

const huesosOrigen = skin.listJoints();
const nombreOrigen = huesosOrigen.map((j) => j.getName().replace(/^mixamorig:?/, ""));
const ibm = skin.getInverseBindMatrices();
// Matriz de la pose de enlace. Si el rig está en su pose de enlace, es la
// misma para todos los huesos (se comprueba): lleva la malla al mundo.
const enlace = (i) => mundo(huesosOrigen[i]).clone().multiply(new THREE.Matrix4().fromArray(ibm.getElement(i, [])));
const B = enlace(0);
for (let i = 1; i < huesosOrigen.length; i++) {
  const d = enlace(i).elements.reduce((m, x, k) => Math.max(m, Math.abs(x - B.elements[k])), 0);
  if (d > 1e-4) throw new Error(`El rig no está en su pose de enlace (hueso ${nombreOrigen[i]}: ${d})`);
}

const P0 = prim.getAttribute("POSITION");
const J0 = prim.getAttribute("JOINTS_0");
const W0 = prim.getAttribute("WEIGHTS_0");
const I0 = prim.getIndices();
const nV0 = P0.getCount();
const trisOrigen = I0 ? I0.getCount() / 3 : nV0 / 3;

// ------------------------------------------- 1. al espacio de la aplicación
const enMundo = new Float32Array(nV0 * 3);
{
  const v = new THREE.Vector3();
  for (let i = 0; i < nV0; i++) {
    v.fromArray(P0.getElement(i, [])).applyMatrix4(B);
    enMundo.set([v.x, v.y, v.z], i * 3);
  }
}
let minY = Infinity, maxY = -Infinity;
for (let i = 1; i < enMundo.length; i += 3) {
  minY = Math.min(minY, enMundo[i]);
  maxY = Math.max(maxY, enMundo[i]);
}
const K = TALLA / (maxY - minY);
const cabezaOrigen = huesosOrigen.map((j) => new THREE.Vector3().setFromMatrixPosition(mundo(j)));
// La línea media pasa entre las dos caderas.
const iCad = nombreOrigen.map((n, i) => (/UpLeg$/.test(n) ? i : -1)).filter((i) => i >= 0);
const x0 = (cabezaOrigen[iCad[0]].x + cabezaOrigen[iCad[1]].x) / 2;
const aCm = (x, y, z) => new THREE.Vector3((x - x0) * K, (y - minY) * K, z * K);

const pos = new Float32Array(nV0 * 3);
for (let i = 0; i < nV0; i++) {
  const p = aCm(enMundo[i * 3], enMundo[i * 3 + 1], enMundo[i * 3 + 2]);
  pos.set([p.x, p.y, p.z], i * 3);
}
const cabeza = cabezaOrigen.map((c) => aCm(c.x, c.y, c.z));

// Hacia dónde mira: la punta del pie tiene que quedar por delante del tobillo.
{
  const iPie = nombreOrigen.findIndex((n) => /Foot$/.test(n));
  const iPunta = nombreOrigen.findIndex((n) => /ToeBase$/.test(n));
  if (cabeza[iPunta].z <= cabeza[iPie].z) throw new Error("El cuerpo no mira a +Z");
}

/** Hueso del maniquí al que va cada hueso de origen. */
const aManiqui = nombreOrigen.map((n, i) => {
  const m = /^(Left|Right)?(.*)$/.exec(n);
  const base = BASE[m[2]];
  if (!base) throw new Error(`Hueso de origen sin destino: ${n}`);
  if (!m[1]) return base;
  return base === "spine" ? "spine" : base + (cabeza[i].x < 0 ? "L" : "R");
});

// ---------------------------------------------- 2. pesos y soldadura
// Las costuras de UV parten la malla: el mismo punto aparece varias veces con
// distinta UV. Sin UV, son el mismo vértice, y soldándolos la piel es una sola
// superficie cerrada (sombreado continuo y aligerado sin grietas).
//
// CON TOLERANCIA, no por igualdad exacta: en el original las dos copias de un
// punto de costura difieren en el último decimal. Soldando sólo lo idéntico
// quedaban 9.280 aristas abiertas; el aligerado trataba cada costura como un
// borde, plegaba cada lado por su cuenta y abría grietas por las que se veía
// el interior del cuerpo — rayas oscuras en el cuello, los muslos y el glúteo.
// Con 0,002 cm (veinte micras) quedan 46, las del propio modelo.
const SOLDADURA_CM = 0.002;
const pesos0 = (i) => {
  const j = J0.getElement(i, []);
  const w = W0.getElement(i, []);
  return { j, w };
};
const soldado = new Int32Array(nV0);
const unicos = [];
{
  const clave = new Map();
  for (let i = 0; i < nV0; i++) {
    const k = `${Math.round(pos[i * 3] / SOLDADURA_CM)},${Math.round(pos[i * 3 + 1] / SOLDADURA_CM)},${Math.round(pos[i * 3 + 2] / SOLDADURA_CM)}`;
    let u = clave.get(k);
    if (u === undefined) {
      u = unicos.length;
      clave.set(k, u);
      unicos.push(i);
    }
    soldado[i] = u;
  }
}
let nU = unicos.length;
const nUentero = nU;
let posU = new Float32Array(nU * 3);
unicos.forEach((i, u) => posU.set(pos.subarray(i * 3, i * 3 + 3), u * 3));
// LAS NORMALES DEL MODELO ORIGINAL, no las de la malla aligerada. Cada vértice
// que sobrevive al aligerado es un vértice del original, así que conserva la
// normal que tenía sobre la superficie de 296.000 triángulos: el sombreado se
// queda tan suave como el del original con una décima parte de geometría.
// Recalcularlas sobre la malla gruesa facetaba los pliegues (el del glúteo
// salía a manchas).
let nrmU = new Float32Array(nU * 3);
{
  const N0 = prim.getAttribute("NORMAL");
  const mN = new THREE.Matrix3().getNormalMatrix(B);
  const n = new THREE.Vector3();
  if (N0) {
    for (let i = 0; i < nV0; i++) {
      n.fromArray(N0.getElement(i, [])).applyMatrix3(mN).normalize();
      const u = soldado[i];
      nrmU[u * 3] += n.x;
      nrmU[u * 3 + 1] += n.y;
      nrmU[u * 3 + 2] += n.z;
    }
  }
}
let idxU = [];
{
  const n = I0 ? I0.getCount() : nV0;
  for (let t = 0; t < n; t += 3) {
    const a = soldado[I0 ? I0.getScalar(t) : t];
    const b = soldado[I0 ? I0.getScalar(t + 1) : t + 1];
    const c = soldado[I0 ? I0.getScalar(t + 2) : t + 2];
    if (a !== b && b !== c && a !== c) idxU.push(a, b, c);
  }
}

// Pesos de cada vértice en los huesos del MANIQUÍ (15), y en los de origen
// (para separar cuello de cabeza al cortar los segmentos).
let pesoManiqui = new Float32Array(nU * HUESOS.length);
let pesoCabezaOrigen = new Float32Array(nU); // Head
let pesoCuelloOrigen = new Float32Array(nU); // Neck
unicos.forEach((i, u) => {
  const { j, w } = pesos0(i);
  for (let k = 0; k < 4; k++) {
    if (w[k] <= 0) continue;
    pesoManiqui[u * HUESOS.length + H[aManiqui[j[k]]]] += w[k];
    if (nombreOrigen[j[k]] === "Head") pesoCabezaOrigen[u] += w[k];
    if (nombreOrigen[j[k]] === "Neck") pesoCuelloOrigen[u] += w[k];
  }
});

// Pesos de ORIGEN de cada vértice (para quitar la pose T con el rig de origen,
// que es con el que se pesó la piel).
const pesoOrigenU = unicos.map((i) => pesos0(i));

// --------------------------------------------------- 3. quitar la pose T
// D[j]: lo que se mueve cada hueso de origen (giro sobre su articulación), en
// el espacio de la aplicación. La piel lo sigue con sus pesos (skinning
// lineal, el mismo que usa three.js al dibujarla).
const D = huesosOrigen.map(() => new THREE.Matrix4());
const hijos = huesosOrigen.map((j) => j.listChildren().map((c) => huesosOrigen.indexOf(c)).filter((i) => i >= 0));
const subarbol = (i) => [i, ...hijos[i].flatMap(subarbol)];
const girar = (i, q, centro) => {
  const R = new THREE.Matrix4()
    .makeTranslation(centro.x, centro.y, centro.z)
    .multiply(new THREE.Matrix4().makeRotationFromQuaternion(q))
    .multiply(new THREE.Matrix4().makeTranslation(-centro.x, -centro.y, -centro.z));
  for (const k of subarbol(i)) {
    D[k].premultiply(R);
    cabeza[k].applyMatrix4(R);
  }
};
const idx = (n) => {
  const i = nombreOrigen.indexOf(n);
  if (i < 0) throw new Error(`Falta el hueso ${n}`);
  return i;
};
const hacia = (grados, sx) => {
  const a = THREE.MathUtils.degToRad(grados);
  return new THREE.Vector3(sx * Math.sin(a), -Math.cos(a), 0);
};
const enderezar = (i, hijo, objetivo) => {
  const d = cabeza[hijo].clone().sub(cabeza[i]).normalize();
  girar(i, new THREE.Quaternion().setFromUnitVectors(d, objetivo), cabeza[i].clone());
};
const giroDe = (m) => new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().extractRotation(m));
const poseOrigen = {};
for (const lado of ["Left", "Right"]) {
  const sx = Math.sign(cabeza[idx(`${lado}Arm`)].x);
  poseOrigen[lado] = {
    brazo: cabeza[idx(`${lado}ForeArm`)].clone().sub(cabeza[idx(`${lado}Arm`)]),
    muslo: cabeza[idx(`${lado}Leg`)].clone().sub(cabeza[idx(`${lado}UpLeg`)]),
  };
  enderezar(idx(`${lado}Arm`), idx(`${lado}ForeArm`), hacia(REPOSO.brazo, sx));
  enderezar(idx(`${lado}ForeArm`), idx(`${lado}Hand`), hacia(REPOSO.antebrazo, sx));
  // La mano sigue al antebrazo, como en el cuerpo anterior: cuelga con la
  // palma hacia el muslo (en pose T mira al suelo, y el giro del brazo la
  // vuelve hacia dentro).
  enderezar(idx(`${lado}UpLeg`), idx(`${lado}Leg`), hacia(REPOSO.muslo, sx));
  enderezar(idx(`${lado}Leg`), idx(`${lado}Foot`), hacia(REPOSO.pierna, sx));
  // El pie vuelve a su orientación: plano contra el suelo y con la punta
  // donde la tenía.
  const iPie = idx(`${lado}Foot`);
  girar(iPie, giroDe(D[iPie]).invert(), cabeza[iPie].clone());
}
// Sobre la malla ENTERA (soldada), antes de aligerar: las juntas se miden
// sobre ella (paso 4), y con 148.000 vértices no dependen de cuáles sobrevivan
// al aligerado — medidas sobre la malla aligerada, la cadera bailaba un
// centímetro de una configuración a otra.
{
  const v = new THREE.Vector3();
  const acc = new THREE.Vector3();
  for (let k = 0; k < nU; k++) {
    const { j, w } = pesoOrigenU[k];
    const p = new THREE.Vector3().fromArray(posU, k * 3);
    acc.set(0, 0, 0);
    let s = 0;
    for (let m = 0; m < 4; m++) {
      if (w[m] <= 0) continue;
      v.copy(p).applyMatrix4(D[j[m]]).multiplyScalar(w[m]);
      acc.add(v);
      s += w[m];
    }
    acc.divideScalar(s || 1);
    posU.set([acc.x, acc.y, acc.z], k * 3);
    // La normal gira con los mismos pesos (sin la traslación).
    const n0 = new THREE.Vector3().fromArray(nrmU, k * 3).normalize();
    const nn = new THREE.Vector3();
    for (let m = 0; m < 4; m++) {
      if (w[m] <= 0) continue;
      nn.addScaledVector(n0.clone().applyMatrix3(new THREE.Matrix3().setFromMatrix4(D[j[m]])), w[m]);
    }
    nrmU.set(nn.normalize().toArray(), k * 3);
  }
}
// El suelo, otra vez: con la pierna enderezada la planta pudo moverse.
{
  let m = Infinity;
  for (let i = 1; i < posU.length; i += 3) m = Math.min(m, posU[i]);
  for (let i = 1; i < posU.length; i += 3) posU[i] -= m;
  for (const c of cabeza) c.y -= m;
}

// --------------------------------------------- 3b. un cuerpo simétrico
/**
 * EL MANIQUÍ ES UN ESPEJO EXACTO, como el anterior. El cuerpo de origen no lo
 * es —sus caderas se separan 0,4 cm más a un lado, una planta queda 0,05 cm
 * más alta que la otra— y la aplicación trata los dos lados como iguales: un
 * gesto con barra que agarra con las dos manos la desviaba de lado, porque
 * las manos no estaban donde estaba su simétrica. Se corta el cuerpo por la
 * línea media (x = 0), se queda la mitad del lado «L» (x ≤ 0) y, ya aligerada,
 * se refleja para dar la otra (paso 5). El corte interpola posición, normal y
 * pesos donde cruza un triángulo, y los vértices del corte quedan en x = 0
 * exacto: al reflejar se comparten, y la costura no existe.
 */
{
  const nH = HUESOS.length;
  const pos = [], nrm = [], pes = [], cab = [], cue = [];
  const nuevo = new Int32Array(nU).fill(-1);
  const meter = (p, n, w, c, u) => {
    pos.push(p[0], p[1], p[2]);
    nrm.push(n[0], n[1], n[2]);
    for (let b = 0; b < nH; b++) pes.push(w[b]);
    cab.push(c);
    cue.push(u);
    return pos.length / 3 - 1;
  };
  const dentro = (i) => posU[i * 3] <= 0;
  const viejo = (i) => {
    if (nuevo[i] < 0) {
      nuevo[i] = meter(
        posU.subarray(i * 3, i * 3 + 3), nrmU.subarray(i * 3, i * 3 + 3),
        pesoManiqui.subarray(i * nH, (i + 1) * nH), pesoCabezaOrigen[i], pesoCuelloOrigen[i],
      );
    }
    return nuevo[i];
  };
  const cortes = new Map();
  const corte = (a, b) => {
    const k = a < b ? `${a}_${b}` : `${b}_${a}`;
    let v = cortes.get(k);
    if (v !== undefined) return v;
    const xa = posU[a * 3], xb = posU[b * 3];
    const t = xa / (xa - xb);
    const mezcla = (arr, dim, i0, i1) =>
      Array.from({ length: dim }, (_, e) => arr[i0 * dim + e] + (arr[i1 * dim + e] - arr[i0 * dim + e]) * t);
    const p = mezcla(posU, 3, a, b);
    p[0] = 0;
    const n = new THREE.Vector3(...mezcla(nrmU, 3, a, b)).normalize().toArray();
    const w = mezcla(pesoManiqui, nH, a, b);
    v = meter(p, n, w,
      pesoCabezaOrigen[a] + (pesoCabezaOrigen[b] - pesoCabezaOrigen[a]) * t,
      pesoCuelloOrigen[a] + (pesoCuelloOrigen[b] - pesoCuelloOrigen[a]) * t);
    cortes.set(k, v);
    return v;
  };
  const tris = [];
  for (let t = 0; t < idxU.length; t += 3) {
    const vs = [idxU[t], idxU[t + 1], idxU[t + 2]];
    const ins = vs.map(dentro);
    if (ins.every((x) => !x)) continue;
    if (ins.every((x) => x)) {
      tris.push(viejo(vs[0]), viejo(vs[1]), viejo(vs[2]));
      continue;
    }
    // Sutherland–Hodgman contra el semiespacio x ≤ 0, conservando el sentido.
    const poli = [];
    for (let k = 0; k < 3; k++) {
      const a = vs[k], b = vs[(k + 1) % 3];
      const ia = ins[k], ib = ins[(k + 1) % 3];
      if (ia) poli.push(viejo(a));
      if (ia !== ib && posU[a * 3] !== 0 && posU[b * 3] !== 0) poli.push(corte(a, b));
    }
    for (let k = 1; k + 1 < poli.length; k++) {
      const [x, y, z] = [poli[0], poli[k], poli[k + 1]];
      if (x !== y && y !== z && x !== z) tris.push(x, y, z);
    }
  }
  nU = pos.length / 3;
  posU = Float32Array.from(pos);
  nrmU = Float32Array.from(nrm);
  pesoManiqui = Float32Array.from(pes);
  pesoCabezaOrigen = Float32Array.from(cab);
  pesoCuelloOrigen = Float32Array.from(cue);
  idxU = tris;
}

// --------------------------------------------------------- 4. las juntas
/**
 * Centro del anillo donde la piel pasa de un hueso a su vecino: los vértices
 * cuyo peso se reparte entre los dos entre el 35 y el 65 %. Es el sitio donde
 * dobla la piel, y girar un miembro sobre otro punto lo cizalla. Se miden con
 * los pesos DE ORIGEN, antes de retocarlos (paso 5): son los del rig que pesó
 * esta piel.
 */
const anillo = (madre, hija) => {
  const c = new THREE.Vector3();
  let n = 0;
  for (let k = 0; k < nU; k++) {
    const o = k * HUESOS.length;
    const a = madre.reduce((s, m) => s + pesoManiqui[o + H[m]], 0);
    const b = pesoManiqui[o + H[hija]];
    if (a + b < 0.8) continue;
    const f = b / (a + b);
    if (f > 0.35 && f < 0.65) {
      c.add(new THREE.Vector3().fromArray(posU, k * 3));
      n++;
    }
  }
  if (n < 12) throw new Error(`Junta ${hija}: anillo con ${n} vértices`);
  return c.divideScalar(n);
};
// Sobre la mitad L; las del lado R son su reflejo, y las de la línea media
// (cuello, columna) se miden sobre medio anillo, cuyo centro tiene la misma
// altura y el mismo fondo que el entero: sólo su x hay que llevarla a 0.
const juntas = {};
juntas.shoulderL = anillo(["spine"], "shoulderL");
juntas.elbowL = anillo(["shoulderL"], "elbowL");
juntas.wristL = anillo(["elbowL"], "wristL");
juntas.hipL = anillo(["raiz"], "hipL");
juntas.kneeL = anillo(["hipL"], "kneeL");
juntas.ankleL = anillo(["kneeL"], "ankleL");
for (const base of ["shoulder", "elbow", "wrist", "hip", "knee", "ankle"]) {
  const l = juntas[`${base}L`];
  juntas[`${base}R`] = new THREE.Vector3(-l.x, l.y, l.z);
}
juntas.neck = anillo(["spine"], "neck");

// La columna no sale de un anillo: va a COLUMNA_Y (ver arriba), en la línea
// media y sobre la vertical de la cadera de origen. Los pesos se le adaptan en
// el paso 5.
const alturaTalla = (() => {
  let m = -Infinity;
  for (let i = 1; i < posU.length; i += 3) m = Math.max(m, posU[i]);
  return m;
})();
const yColumna = COLUMNA_Y * (alturaTalla / TALLA);
juntas.spine = new THREE.Vector3(0, yColumna, cabeza[idx("Hips")].z);

juntas.neck.x = 0;

// Fondo: las caderas a la misma profundidad que en el cuerpo anterior (+0,23),
// para que la figura no aparezca desplazada respecto de su raíz.
{
  const dz = 0.23 - juntas.hipL.z;
  for (let i = 2; i < posU.length; i += 3) posU[i] += dz;
  for (const j of Object.values(juntas)) j.z += dz;
}

// ----------------------------------------------------------- 5. aligerar
await MeshoptSimplifier.ready;
// Los pesos entran como atributo del aligerado: así no se come las aristas
// donde el reparto cambia —las articulaciones—, que es donde la piel dobla.
const [idxS, errorRel] = MeshoptSimplifier.simplifyWithAttributes(
  new Uint32Array(idxU),
  posU,
  3,
  pesoManiqui,
  HUESOS.length,
  new Array(HUESOS.length).fill(0.5),
  null,
  Math.round(PRESUPUESTO_TRIS / 2) * 3,
  0.05,
  ["Regularize"],
);
const escala = MeshoptSimplifier.getScale(posU, 3);

/**
 * TRIÁNGULOS DOBLADOS: los que el aligerado dejó mirando hacia otro lado que
 * la superficie original en sus vértices. Es un control de calidad, no un
 * arreglo: medido, casi todos caen en el fondo de los pliegues entre los dedos
 * (67 de 76), donde la superficie ya se dobla sobre sí misma. Si un cambio de
 * presupuesto o de opciones los dispara, aparecerán como astillas oscuras.
 */
const doblados = (() => {
  const nrm = new Float32Array(nU * 3);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  const cara = (i, j, k) => {
    a.fromArray(posU, i * 3);
    b.fromArray(posU, j * 3).sub(a);
    c.fromArray(posU, k * 3).sub(a);
    return n.crossVectors(b, c);
  };
  for (let t = 0; t < idxU.length; t += 3) {
    const f = cara(idxU[t], idxU[t + 1], idxU[t + 2]);
    for (let m = 0; m < 3; m++) for (let e = 0; e < 3; e++) nrm[idxU[t + m] * 3 + e] += f.getComponent(e);
  }
  let malos = 0, torcidos = 0;
  const m = new THREE.Vector3();
  for (let t = 0; t < idxS.length; t += 3) {
    const f = cara(idxS[t], idxS[t + 1], idxS[t + 2]).clone().normalize();
    m.set(0, 0, 0);
    for (let k = 0; k < 3; k++) m.add(new THREE.Vector3().fromArray(nrm, idxS[t + k] * 3));
    const d = f.dot(m.normalize());
    if (d < 0) malos++;
    else if (d < 0.5) torcidos++;
  }
  return { malos, torcidos };
})();

// Compacta: sólo los vértices que siguen en uso.
const usado = new Int32Array(nU).fill(-1);
const orden = [];
for (const u of idxS) {
  if (usado[u] < 0) {
    usado[u] = orden.length;
    orden.push(u);
  }
}
// Y SE REFLEJA. Los vértices del corte (x = 0) se comparten; el resto se
// duplica con x cambiada de signo, la normal reflejada y los pesos de un lado
// pasados al otro. Los triángulos reflejados invierten su sentido, para seguir
// mirando hacia fuera.
const nVh = orden.length;
const espejo = new Int32Array(nVh);
let nV = nVh;
for (let v = 0; v < nVh; v++) espejo[v] = posU[orden[v] * 3] === 0 ? v : nV++;
const P = new Float32Array(nV * 3);
const Wm = new Float32Array(nV * HUESOS.length);
const pCab = new Float32Array(nV);
const pCue = new Float32Array(nV);
const N = new Float32Array(nV * 3);
const OTRO_LADO = HUESOS.map((h) => H[h.replace(/L$/, "§").replace(/R$/, "L").replace(/§$/, "R")] ?? H[h]);
orden.forEach((u, v) => {
  const p = posU.subarray(u * 3, u * 3 + 3);
  const n = new THREE.Vector3().fromArray(nrmU, u * 3).normalize();
  const w = pesoManiqui.subarray(u * HUESOS.length, (u + 1) * HUESOS.length);
  if (espejo[v] === v) {
    // En la línea media el vértice es de los dos lados: su normal no tiene
    // componente lateral y sus pesos son la media de los suyos y los
    // reflejados (un punto de la entrepierna pesa lo mismo en las dos
    // caderas).
    P.set([0, p[1], p[2]], v * 3);
    N.set(new THREE.Vector3(0, n.y, n.z).normalize().toArray(), v * 3);
    for (let b = 0; b < HUESOS.length; b++) {
      Wm[v * HUESOS.length + b] += w[b] / 2;
      Wm[v * HUESOS.length + OTRO_LADO[b]] += w[b] / 2;
    }
    pCab[v] = pesoCabezaOrigen[u];
    pCue[v] = pesoCuelloOrigen[u];
    return;
  }
  for (const [d, signo, pesos] of [[v, 1, false], [espejo[v], -1, true]]) {
    P.set([signo * p[0], p[1], p[2]], d * 3);
    N.set([signo * n.x, n.y, n.z], d * 3);
    for (let b = 0; b < HUESOS.length; b++) Wm[d * HUESOS.length + (pesos ? OTRO_LADO[b] : b)] = w[b];
    pCab[d] = pesoCabezaOrigen[u];
    pCue[d] = pesoCuelloOrigen[u];
  }
});
const mitad = Uint32Array.from(idxS, (u) => usado[u]);
const IDX = new Uint32Array(mitad.length * 2);
IDX.set(mitad);
for (let t = 0; t < mitad.length; t += 3) {
  IDX[mitad.length + t] = espejo[mitad[t]];
  IDX[mitad.length + t + 1] = espejo[mitad[t + 2]];
  IDX[mitad.length + t + 2] = espejo[mitad[t + 1]];
}
const nT = IDX.length / 3;

// ------------------------------------------- 6. dos retoques de los pesos
const suave = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * EL GLÚTEO ES DE LA PELVIS. El rig de origen, pensado para andar, reparte el
 * glúteo casi a medias entre cadera y muslo: cortando por el hueso que más
 * pesa, la pelvis se quedaba en un parche y el glúteo se iba con el muslo; y
 * sentado, la nalga giraba hacia delante con el fémur. Pero la aplicación se
 * sienta sobre la PELVIS («los glúteos se posan sobre la cara del asiento»),
 * como el cuerpo anterior, cuya pelvis bajaba hasta los 80 cm.
 *
 * El muslo empieza en el pliegue de la ingle por delante, a la altura de la
 * cadera, y por detrás PLIEGUE_GLUTEO cm más abajo a lo largo del fémur. Ese
 * corte de atrás NO es el pliegue de la nalga, que en este cuerpo cae a 15 cm:
 * la parte baja del glúteo se inserta en el fémur y al sentarse se va con él.
 * Cortando en el pliegue, la nalga sentada colgaba 15,5 cm bajo la cadera —la
 * figura se sentaba 5 cm más alta que el cuerpo anterior— y los muslos se
 * quedaban 6,6 cm en el aire. Cortando a 9 cm la pelvis apoya a 9,95 cm bajo
 * la cadera (el cuerpo anterior, a 10,5) y los muslos a 9,45: nalga y muslo se
 * posan a la vez. Y la piel sentada se estira menos: en la nalga, el percentil
 * 99 del área estirada baja de ×7,6 a ×5,8.
 *
 * El reparto entre pelvis y muslo pasa a depender SÓLO de eso:
 * por encima del pliegue la piel va con la pelvis, por debajo con el muslo, y
 * en medio una franja. Es lo que hace que la piel y los segmentos rígidos —que
 * se cortan por el hueso que más pesa— sean la misma cosa en la zona que se
 * sienta: con la mezcla del rig de origen, un vértice a medias iba rígido con
 * la pelvis en el segmento y a medias con el muslo en la piel, y sentado se
 * separaban 3,6 cm.
 */
const PLIEGUE_GLUTEO = 9;
/**
 * Anchura de la transición muslo↔pelvis, a cada lado del pliegue: amplia por
 * delante, para que la ingle doble suave, y ESTRECHA por detrás, que es donde
 * se apoya el cuerpo al sentarse. Ahí la piel tiene que ir rígida con la
 * pelvis hasta el mismo pliegue, como el segmento que se mide: con 5 cm por
 * detrás, la nalga sentada subía con el muslo y se quedaba 3,6 cm por encima
 * del asiento sobre el que la aplicación posa la pelvis — flotando.
 */
const BANDA_INGLE = 5;
const BANDA_GLUTEO = 1.5;
for (let k = 0; k < nV; k++) {
  const o = k * HUESOS.length;
  const wl = Wm[o + H.hipL], wr = Wm[o + H.hipR], wp = Wm[o + H.raiz];
  const T = wl + wr + wp;
  if (wl + wr <= 0 || T < 0.5) continue;
  const lado = wl >= wr ? "L" : "R";
  const J = juntas[`hip${lado}`];
  const eje = juntas[`knee${lado}`].clone().sub(J).normalize();
  const rel = new THREE.Vector3().fromArray(P, k * 3).sub(J);
  const d = rel.dot(eje);
  const radial = rel.clone().addScaledVector(eje, -d);
  const frente = new THREE.Vector3(0, 0, 1).addScaledVector(eje, -eje.z).normalize();
  const atras = radial.lengthSq() > 1e-6 ? Math.max(0, -radial.normalize().dot(frente)) : 0;
  const pliegue = 1 + PLIEGUE_GLUTEO * atras;
  const banda = BANDA_INGLE + (BANDA_GLUTEO - BANDA_INGLE) * atras;
  const tope = suave(pliegue - banda, pliegue + banda, d);
  Wm[o + H.hipL] = (wl / (wl + wr)) * T * tope;
  Wm[o + H.hipR] = (wr / (wl + wr)) * T * tope;
  Wm[o + H.raiz] = T * (1 - tope);
}

// LA COLUMNA DOBLA EN `yColumna`: lo que el rig reparte entre cadera y
// vértebras se vuelve a repartir según la altura, centrado ahí. El resto de
// los pesos (muslos, brazos, cuello) no se toca.
for (let k = 0; k < nV; k++) {
  const o = k * HUESOS.length;
  const h = Wm[o + H.raiz] + Wm[o + H.spine];
  if (h <= 0) continue;
  const f = suave(yColumna - COLUMNA_BANDA, yColumna + COLUMNA_BANDA, P[k * 3 + 1]);
  Wm[o + H.raiz] = h * (1 - f);
  Wm[o + H.spine] = h * f;
}

// ------------------------------------------------ pesos finales (4 por vértice)
const pielJ = new Uint8Array(nV * 4);
const pielW = new Uint8Array(nV * 4);
const dominante = new Int32Array(nV);
for (let k = 0; k < nV; k++) {
  const o = k * HUESOS.length;
  const top = HUESOS.map((_, b) => [b, Wm[o + b]]).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const s = top.reduce((acc, [, w]) => acc + w, 0) || 1;
  const q = top.map(([, w]) => Math.round((w / s) * 255));
  q[0] += 255 - q.reduce((a, b) => a + b, 0); // que sumen exactamente 255
  top.forEach(([b], m) => {
    pielJ[k * 4 + m] = b;
    pielW[k * 4 + m] = q[m];
  });
  dominante[k] = top[0][0];
}

// La normal del original vale mientras se parezca a la de la malla aligerada.
// Un vértice que estaba en el fondo de un pliegue fino del original —entre el
// pectoral y el cuello, en la raya del glúteo— conserva una normal de canto
// que ya no cuadra con la superficie gruesa que lo rodea, y dibuja una raya.
// Donde las dos se separan más de 40° (o el original no traía normales) manda
// la de la malla aligerada, ponderada por área.
let normalesRehechas = 0;
{
  const acc = new Float32Array(nV * 3);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  for (let t = 0; t < nT; t++) {
    const [i, j, k] = [IDX[t * 3], IDX[t * 3 + 1], IDX[t * 3 + 2]];
    a.fromArray(P, i * 3);
    b.fromArray(P, j * 3).sub(a);
    c.fromArray(P, k * 3).sub(a);
    n.crossVectors(b, c);
    for (const v of [i, j, k]) for (let e = 0; e < 3; e++) acc[v * 3 + e] += n.getComponent(e);
  }
  const limite = Math.cos(THREE.MathUtils.degToRad(40));
  for (let v = 0; v < nV; v++) {
    const gruesa = new THREE.Vector3().fromArray(acc, v * 3).normalize();
    const fina = new THREE.Vector3().fromArray(N, v * 3);
    if (fina.lengthSq() < 0.25 || fina.dot(gruesa) < limite) {
      N.set(gruesa.toArray(), v * 3);
      normalesRehechas++;
    }
  }
}

// ----------------------------------------------------- 7. los 16 segmentos
/** Segmento de un vértice: el de su hueso dominante; cuello y cabeza aparte. */
const segmentoDeVertice = (k) => {
  const h = HUESOS[dominante[k]];
  // En la línea media (la entrepierna) un vértice pesa igual en las dos
  // caderas, y el empate no puede darlo a un lado: es de la pelvis.
  if (P[k * 3] === 0 && /[LR]$/.test(h)) return "pelvis";
  if (h === "neck") return pCab[k] >= pCue[k] ? "cabeza" : "cuello";
  return SEGMENTO_DE_HUESO[h];
};
/**
 * COLLARÍN, como el del cuerpo anterior: cada segmento que cuelga de una
 * articulación se lleva además la franja de la piel de su madre donde su hueso
 * ya pesa (≥ 10 %). Sólo la que queda ENTERA POR ENCIMA de su pivote: esa
 * parte la aplicación ya la descuenta al medir (no es la «piel propia» de
 * `pielPropia`). Lo que pesa en el hueso pero cuelga por debajo de la junta
 * —el glúteo respecto de la cadera— no entra: iría rígido con el muslo, y al
 * sentarse bajaría con él hasta tomarse por lo que toca el asiento. Sirve para
 * que, si la piel no se usa —un segmento sustituido por el usuario—, las
 * juntas no se abran al doblar.
 */
const COLLAR = 0.1;
const hijoDe = {
  // segmento: [su hueso, el segmento del que cuelga]
  "brazo-sup-L": ["shoulderL", "torso"], "brazo-sup-R": ["shoulderR", "torso"],
  "antebrazo-L": ["elbowL", "brazo-sup-L"], "antebrazo-R": ["elbowR", "brazo-sup-R"],
  "mano-L": ["wristL", "antebrazo-L"], "mano-R": ["wristR", "antebrazo-R"],
  "muslo-L": ["hipL", "pelvis"], "muslo-R": ["hipR", "pelvis"],
  "pierna-L": ["kneeL", "muslo-L"], "pierna-R": ["kneeR", "muslo-R"],
  "pie-L": ["ankleL", "pierna-L"], "pie-R": ["ankleR", "pierna-R"],
  cuello: ["neck", "torso"],
  // El tronco es el único que cuelga HACIA ARRIBA de su pivote: su collarín
  // baja a la pelvis (ver `collarinPorEncima`).
  torso: ["spine", "pelvis"],
};
/**
 * Dónde puede ir el collarín de cada segmento: por encima de su junta para
 * los miembros, que cuelgan hacia abajo; y para el tronco, que sube desde la
 * suya, hasta 5 cm por debajo de ella, como el del cuerpo anterior (bajaba a
 * 95,3 con la columna a 100).
 */
const enSuCollarin = (hueso, v) =>
  hueso === "spine" ? P[v * 3 + 1] > juntas.spine.y - 5 : P[v * 3 + 1] > juntas[hueso].y;
/**
 * EL CUELLO SE CORTA POR SU FORMA, no por sus pesos. En el rig de origen el
 * hueso del cuello apenas pesa: la piel del cuello es de las vértebras por
 * abajo y de la cabeza por arriba, y cortando por pesos el segmento se quedaba
 * en unas briznas. La aplicación lo necesita entero —hasta dónde llega la nuca
 * decide dónde se apoya la barra en una sentadilla trasera—, así que es la
 * COLUMNA del cuello: lo que queda dentro de un cilindro vertical sobre su
 * junta, del grueso del anillo del cuello más un margen, desde los trapecios
 * hasta la base del cráneo.
 */
const cilindroCuello = (() => {
  const n = juntas.neck;
  let r = 0, c = 0;
  for (let k = 0; k < nV; k++) {
    const o = k * HUESOS.length;
    const a = Wm[o + H.spine], b = Wm[o + H.neck];
    if (a + b < 0.8) continue;
    const f = b / (a + b);
    if (f <= 0.35 || f >= 0.65) continue;
    r += Math.hypot(P[k * 3] - n.x, P[k * 3 + 2] - n.z);
    c++;
  }
  return { radio: r / c + 1.5, desde: n.y - 7, hasta: n.y + 5 };
})();
const enElCuello = (v) =>
  P[v * 3 + 1] >= cilindroCuello.desde &&
  P[v * 3 + 1] <= cilindroCuello.hasta &&
  Math.hypot(P[v * 3] - juntas.neck.x, P[v * 3 + 2] - juntas.neck.z) <= cilindroCuello.radio;

/** El segmento de un vértice, con el cuello cortado por su forma. */
const segmentoFinal = (v) => {
  const s = segmentoDeVertice(v);
  return ["torso", "cabeza", "cuello"].includes(s) && enElCuello(v) ? "cuello" : s;
};

const trisDe = Object.fromEntries(SEGMENTOS.map((s) => [s, []]));
for (let t = 0; t < nT; t++) {
  const vs = [IDX[t * 3], IDX[t * 3 + 1], IDX[t * 3 + 2]];
  // UN TRIÁNGULO ES DE UN SEGMENTO SI SUS TRES VÉRTICES LO SON. Los de la
  // frontera —un vértice de cada lado— no van a ninguno. Dándoselos al que más
  // vértices reclamaba, el segmento se llevaba RÍGIDO un vértice que en la piel
  // es del vecino: la nalga cargaba un punto que en la piel es 100 % muslo, y
  // sentado se quedaba 8,9 cm por debajo de donde se ve — y la aplicación posa
  // el maniquí sobre ese punto. Los segmentos no se dibujan, así que la franja
  // de frontera no se echa de menos; el collarín cierra la junta si algún día
  // se dibujan (ver abajo).
  const segs = vs.map(segmentoFinal);
  const puro = segs.every((x) => x === segs[0]) ? segs[0] : null;
  if (puro) trisDe[puro].push(t);
  // El collarín sale SÓLO de la madre (o de su frontera con el hijo): la
  // cabeza comparte articulación con el cuello y no es su collarín.
  for (const [seg, [hueso, madre]] of Object.entries(hijoDe)) {
    if (puro === seg || !segs.includes(madre)) continue;
    if (!segs.every((x) => x === madre || x === seg)) continue;
    if (!vs.some((v) => Wm[v * HUESOS.length + H[hueso]] >= COLLAR)) continue;
    if (vs.every((v) => enSuCollarin(hueso, v))) trisDe[seg].push(t);
  }
}

// ------------------------------------------------------------- escritura
fs.mkdirSync(SALIDA, { recursive: true });
const ioSalida = new NodeIO();

/** GLB de un segmento: sólo posiciones, en cm, como los de siempre. */
const escribirSegmento = async (seg) => {
  const ts = trisDe[seg];
  const mapa = new Map();
  const pts = [];
  const ind = [];
  for (const t of ts) {
    for (let m = 0; m < 3; m++) {
      const v = IDX[t * 3 + m];
      let nv = mapa.get(v);
      if (nv === undefined) {
        nv = pts.length / 3;
        mapa.set(v, nv);
        pts.push(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]);
      }
      ind.push(nv);
    }
  }
  const d = new Document();
  const buf = d.createBuffer();
  const prim = d
    .createPrimitive()
    .setAttribute("POSITION", d.createAccessor().setType("VEC3").setArray(new Float32Array(pts)).setBuffer(buf))
    .setIndices(d.createAccessor().setType("SCALAR").setArray(pts.length / 3 < 65536 ? new Uint16Array(ind) : new Uint32Array(ind)).setBuffer(buf));
  const nodo = d.createNode("geometry_0").setMesh(d.createMesh(seg).addPrimitive(prim));
  d.createScene("Scene").addChild(nodo);
  await ioSalida.write(path.join(SALIDA, `${seg}.glb`), d);
  return { tris: ts.length, verts: pts.length / 3 };
};

/** La piel: malla con skinning sobre las 15 articulaciones del maniquí. */
const escribirPiel = async () => {
  const d = new Document();
  const buf = d.createBuffer();
  const nodos = {};
  for (const h of HUESOS) {
    const madre = MADRE[h];
    const j = h === "raiz" ? new THREE.Vector3() : juntas[h];
    const jm = madre && madre !== "raiz" ? juntas[madre] : new THREE.Vector3();
    nodos[h] = d.createNode(h).setTranslation([j.x - jm.x, j.y - jm.y, j.z - jm.z]);
    if (madre) nodos[madre].addChild(nodos[h]);
  }
  const ibmArr = new Float32Array(HUESOS.length * 16);
  HUESOS.forEach((h, i) => {
    const j = h === "raiz" ? new THREE.Vector3() : juntas[h];
    ibmArr.set(new THREE.Matrix4().makeTranslation(-j.x, -j.y, -j.z).elements, i * 16);
  });
  const sk = d
    .createSkin("maniqui")
    .setSkeleton(nodos.raiz)
    .setInverseBindMatrices(d.createAccessor().setType("MAT4").setArray(ibmArr).setBuffer(buf));
  for (const h of HUESOS) sk.addJoint(nodos[h]);
  const mat = d
    .createMaterial("maniqui")
    .setBaseColorFactor([0x2f / 255, 0x7d / 255, 0xd1 / 255, 1])
    .setMetallicFactor(0)
    .setRoughnessFactor(0.6);
  const prim = d
    .createPrimitive()
    .setMaterial(mat)
    .setAttribute("POSITION", d.createAccessor().setType("VEC3").setArray(P).setBuffer(buf))
    .setAttribute("NORMAL", d.createAccessor().setType("VEC3").setArray(N).setBuffer(buf))
    .setAttribute("JOINTS_0", d.createAccessor().setType("VEC4").setArray(pielJ).setBuffer(buf))
    .setAttribute("WEIGHTS_0", d.createAccessor().setType("VEC4").setArray(pielW).setNormalized(true).setBuffer(buf))
    .setIndices(d.createAccessor().setType("SCALAR").setArray(nV < 65536 ? Uint16Array.from(IDX) : IDX).setBuffer(buf));
  const malla = d.createNode("piel").setMesh(d.createMesh("piel").addPrimitive(prim)).setSkin(sk);
  d.createScene("Scene").addChild(nodos.raiz).addChild(malla);
  d.getRoot().getAsset().generator = "EXERSUITE3D scripts/procesar-maniqui.mjs";
  await ioSalida.write(path.join(SALIDA, "piel.glb"), d);
};

await escribirPiel();
const porSegmento = {};
for (const s of SEGMENTOS) porSegmento[s] = await escribirSegmento(s);

const r = (x) => Math.round(x * 100) / 100;
const manifiesto = {
  ...Object.fromEntries(SEGMENTOS.slice().sort().map((s) => [s, `${s}.glb`])),
  piel: "piel.glb",
  juntas: Object.fromEntries(
    Object.keys(juntas)
      .sort()
      .map((k) => [k, [r(juntas[k].x), r(juntas[k].y), r(juntas[k].z)]]),
  ),
};
fs.writeFileSync(path.join(SALIDA, "manifest.json"), JSON.stringify(manifiesto, null, 1) + "\n");

// ---------------------------------------------------------------- informe
const kb = (f) => (fs.statSync(path.join(SALIDA, f)).size / 1024).toFixed(1);
const grados = (v) => THREE.MathUtils.radToDeg(Math.atan2(Math.hypot(v.x, v.z), -v.y)).toFixed(1);
console.log(`Fuente: ${path.relative(RAIZ_REPO, FUENTE)} — ${trisOrigen} triángulos, ${nV0} vértices, ${huesosOrigen.length} huesos`);
console.log(`Soldada: ${nUentero} vértices; media, cortada por la línea media: ${nU}. Aligerada y reflejada: ${nT} triángulos, ${nV} vértices (desviación máxima ${(errorRel * escala).toFixed(2)} cm)`);
console.log(`Triángulos doblados contra la superficie original: ${doblados.malos} del revés, ${doblados.torcidos} a más de 60°`);
console.log(`Normales: ${nV - normalesRehechas} del original, ${normalesRehechas} rehechas sobre la malla aligerada`);
for (const lado of ["Left", "Right"]) {
  console.log(`Pose de origen (${lado}): brazo a ${grados(poseOrigen[lado].brazo)}° de la vertical, muslo a ${grados(poseOrigen[lado].muslo)}°`);
}
console.log(`piel.glb ${kb("piel.glb")} kB`);
let totSeg = 0;
for (const s of SEGMENTOS) {
  totSeg += Number(kb(`${s}.glb`));
  console.log(`  ${s.padEnd(12)} ${String(porSegmento[s].tris).padStart(6)} tri ${kb(`${s}.glb`).padStart(7)} kB`);
}
console.log(`segmentos ${totSeg.toFixed(1)} kB`);
console.log("juntas (cm):");
for (const [k, v] of Object.entries(manifiesto.juntas)) console.log(`  ${k.padEnd(10)} ${v.join(", ")}`);
