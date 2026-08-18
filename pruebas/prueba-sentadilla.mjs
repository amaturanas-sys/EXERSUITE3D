// v0.2.75 · SENTADILLA PROFUNDA: que la postura sea CONGRUENTE, no solo baja.
//
// La postura anterior bajaba la figura y ya está, y esa media verdad no la
// veía nadie: se veía a alguien empezando a sentarse. Lo que fallaba era la
// CADENA — con la espinilla clavada casi vertical la rodilla no podía
// adelantarse, sin rodilla adelante la cadera no tenía dónde ir, y el tronco
// se quedaba tieso.
//
// Por eso esto no comprueba cuatro números de la biblioteca de posturas (eso
// sería comprobar que una constante vale lo que vale). Comprueba las
// RELACIONES que hacen que una sentadilla sea una sentadilla, y que son las
// que se rompen si alguien vuelve a topar el tobillo o afloja un ángulo:
//
//   · baja de verdad — cerca de la mitad de la altura de pie
//   · la rodilla queda POR DELANTE del tobillo (espinilla inclinada)
//   · el muslo llega a la horizontal — la cadera a la altura de la rodilla
//   · el tronco se inclina al frente
//   · y las plantas siguen en el suelo, sin que nada se hunda
import { chromium } from "playwright-core";
import { AYUDANTES } from "./ayudantes-maniqui.mjs";

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const p = await browser.newPage({ viewport: { width: 1180, height: 900 } });
const errores = [];
p.on("pageerror", (e) => errores.push(e.message));
await p.goto("http://127.0.0.1:4174/");
await p.waitForTimeout(1000);
await p.click("text=🛠 BUILDER"); await p.waitForTimeout(300);
await p.click("text=Crear nuevo proyecto"); await p.waitForTimeout(300);
await p.click(".wizard-carta:has-text('Profesional')"); await p.waitForTimeout(300);
await p.click(".wizard-carta:has-text('Canvas libre')"); await p.waitForTimeout(2500);
await p.evaluate(() => window.exersuite.editor.toggleHumanFigure());
await p.waitForTimeout(1200);
await p.evaluate(AYUDANTES);

const fallos = [];
const ok = (c, m) => { if (!c) fallos.push(m); console.log((c ? "✓ " : "✗ ") + m); };

/**
 * INCLINACIÓN DE UN HUESO respecto de la vertical, en grados, positiva hacia
 * delante. Es exactamente la magnitud que se midió sobre el modelo del
 * diseñador, así que la prueba compara peras con peras.
 *
 * Se lee del esqueleto y no de la caja del segmento: la caja de un muslo casi
 * horizontal es igual de ancha se incline hacia donde se incline.
 */
const inclinacion = (seg) => p.evaluate((s) => {
  const T = window.exersuite.THREE;
  const f = window.exersuite.editor.humanFigure;
  f.updateMatrixWorld(true);
  let m = null;
  f.traverse((n) => { if (n.isMesh && n.userData.segmentId === s) m = n; });
  if (!m) return null;
  const v = new T.Vector3(0, -1, 0).applyQuaternion(m.getWorldQuaternion(new T.Quaternion()));
  return +(T.MathUtils.radToDeg(Math.atan2(v.z, -v.y))).toFixed(1);
}, seg);

/** Dirección del eje `eje` de un segmento, en el mundo. */
const eje = (seg, e) => p.evaluate(([s, e]) => {
  const T = window.exersuite.THREE;
  const f = window.exersuite.editor.humanFigure;
  f.updateMatrixWorld(true);
  let m = null;
  f.traverse((n) => { if (n.isMesh && n.userData.segmentId === s) m = n; });
  if (!m) return null;
  const v = new T.Vector3(...({ x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }[e]))
    .applyQuaternion(m.getWorldQuaternion(new T.Quaternion())).normalize();
  return [+v.x.toFixed(3), +v.y.toFixed(3), +v.z.toFixed(3)];
}, [seg, e]);

/** Posición de una articulación relativa a otra, en cm. */
const respectoA = (a, b) => p.evaluate(([a, b]) => {
  const T = window.exersuite.THREE, ed = window.exersuite.editor;
  ed.humanFigure.updateMatrixWorld(true);
  const J = ed.figureJoints();
  const v = J[a].getWorldPosition(new T.Vector3()).sub(J[b].getWorldPosition(new T.Vector3()));
  return [+v.x.toFixed(1), +v.y.toFixed(1), +v.z.toFixed(1)];
}, [a, b]);

const altura = () => p.evaluate(() => {
  const T = window.exersuite.THREE;
  const c = new T.Box3().setFromObject(window.exersuite.editor.humanFigure);
  return c.max.y - c.min.y;
});

// ---- De pie, para tener contra qué comparar
await p.evaluate(() => window.exersuite.editor.applyPose("De pie"));
await p.waitForTimeout(400);
const dePie = await altura();
ok(dePie > 150, `de pie mide lo que debe (${dePie.toFixed(0)} cm)`);
for (const seg of ["pie-L", "pierna-L", "muslo-L"]) {
  ok(Math.abs(await inclinacion(seg)) < 3, `de pie, ${seg} está aplomado`);
}

// ---- Sentadilla
await p.evaluate(() => window.exersuite.editor.applyPose("Sentadilla"));
await p.waitForTimeout(500);
const agach = await altura();
ok(agach < dePie * 0.75,
  `baja de verdad: ${agach.toFixed(0)} cm desde ${dePie.toFixed(0)} (${(agach / dePie * 100).toFixed(0)} %)`);

const tibia = await inclinacion("pierna-L");
const muslo = await inclinacion("muslo-L");
const planta = await inclinacion("pie-L");

// LA ESPINILLA SE INCLINA. Es lo que el tope de 20° del tobillo impedía: sin
// esto la rodilla no se adelanta y no hay sentadilla profunda que valga.
ok(tibia < -28 && tibia > -48,
  `la espinilla se inclina al frente ${(-tibia).toFixed(0)}° (el modelo da 37,6)`);

// EL MUSLO LLEGA A LA HORIZONTAL: es la definición de sentadilla paralela, y
// lo que separa esto de un amago.
ok(muslo > 72 && muslo < 95,
  `el muslo llega a la horizontal: ${muslo.toFixed(0)}° de la vertical (el modelo da 82)`);

// LA PLANTA SIGUE PLANA. Con la espinilla inclinada 38°, el tobillo tiene que
// dorsiflexionar otros 38 para que el pie no despegue. Que este número salga
// cerca de cero es la prueba de que la cadena cierra: si alguien vuelve a
// topar la dorsiflexión, el pie se levanta y esto lo caza.
ok(Math.abs(planta) < 8,
  `la planta se queda plana en el suelo (${planta.toFixed(0)}° de la horizontal)`);

// Y la cadena tiene que ser COHERENTE entre sí, no tres números sueltos: la
// dorsiflexión del tobillo compensa la inclinación de la espinilla.
ok(Math.abs((muslo - 120) - tibia) < 4,
  `la cadena cuadra: muslo ${muslo}° − 120° de rodilla = espinilla ${tibia}°`);

// ---- Y sigue de pie sobre el suelo: nada se hunde
const plantaL = await p.evaluate(() => window.__planta("L"));
const plantaR = await p.evaluate(() => window.__planta("R"));
const piel = await p.evaluate(() => window.__pielMasBaja());
ok(plantaL !== null && plantaL > -1.5 && plantaL < 3, `la planta izquierda pisa el suelo (${plantaL} cm)`);
ok(plantaR !== null && plantaR > -1.5 && plantaR < 3, `la planta derecha pisa el suelo (${plantaR} cm)`);
ok(piel > -1.5, `no hay carne por debajo del suelo (lo más bajo, ${piel} cm)`);

await p.screenshot({ path: "salidas/sentadilla.png" });

// ---------------------------------------------------------------- v0.2.78
// SENTADILLA CON BARRA: frontal y trasera.
//
// Lo que hay que proteger aquí no son los grados —esos son constantes de la
// biblioteca y comprobarlos sería comprobar que 126 vale 126—, sino los DOS
// hechos que salieron de medir la secuencia del diseñador y que cualquier
// retoque descuidado rompe:
//
//   1. las PIERNAS son las mismas en las dos sentadillas. No parecidas: las
//      mismas. En el modelo los extremos de muslo, tibia y pie coinciden
//      unidad a unidad. Si alguien "afina" una y no la otra, esto lo caza.
//   2. el RACK es lo único que las distingue, y se distingue por dónde cae la
//      mano: DELANTE del hombro en la frontal (deltoides y clavícula) y
//      DETRÁS en la trasera (trapecios). Si las manos acaban del mismo lado,
//      son el mismo ejercicio con dos nombres.
const medir = async () => ({
  alto: await altura(),
  tibia: await inclinacion("pierna-L"),
  muslo: await inclinacion("muslo-L"),
  planta: await inclinacion("pie-L"),
  pieLargo: await eje("pie-L", "z"),
  rodilla: await p.evaluate(() => {
    const T = window.exersuite.THREE, f = window.exersuite.editor.humanFigure;
    f.updateMatrixWorld(true);
    const d = (s) => { let m = null;
      f.traverse((n) => { if (n.isMesh && n.userData.segmentId === s) m = n; });
      return new T.Vector3(0, -1, 0).applyQuaternion(m.getWorldQuaternion(new T.Quaternion())); };
    return +T.MathUtils.radToDeg(d("muslo-L").angleTo(d("pierna-L"))).toFixed(1);
  }),
  plantaNormal: await eje("pie-L", "y"),
  muneca: await respectoA("wristL", "shoulderL"),
  codo: await respectoA("elbowL", "shoulderL"),
  suelaL: await p.evaluate(() => window.__planta("L")),
  suelaR: await p.evaluate(() => window.__planta("R")),
  piel: await p.evaluate(() => window.__pielMasBaja()),
});

const barra = {};
for (const nombre of ["Sentadilla frontal (fondo)", "Sentadilla trasera (fondo)"]) {
  await p.evaluate((q) => window.exersuite.editor.applyPose(q), nombre);
  await p.waitForTimeout(500);
  const m = await medir();
  barra[nombre] = m;
  const etq = nombre.includes("frontal") ? "frontal" : "trasera";

  ok(m.alto < dePie * 0.8,
    `${etq}: baja de verdad (${m.alto.toFixed(0)} cm, ${(m.alto / dePie * 100).toFixed(0)} % de la talla)`);
  ok(m.muslo > 72 && m.muslo < 95,
    `${etq}: el muslo llega a la horizontal (${m.muslo}° de la vertical)`);
  ok(m.tibia < -30 && m.tibia > -50,
    `${etq}: la espinilla se inclina al frente ${(-m.tibia).toFixed(0)}°`);
  // OJO: aquí NO vale la identidad plana `muslo − rodilla = espinilla` que se
  // usa arriba para la sentadilla a peso corporal. Esa solo se cumple si toda
  // la pierna vive en el plano sagital, y estas no: la cadera abre 36,5° y
  // saca la rodilla del plano, así que las proyecciones de perfil dejan de
  // sumar (se van 4°, que no es un fallo de la postura sino de mirarla de
  // lado). Lo que sí se conserva es el ángulo de verdad entre muslo y
  // espinilla, que es el que se midió sobre el modelo.
  ok(Math.abs(m.rodilla - 126) < 3,
    `${etq}: la rodilla flexiona ${m.rodilla}° en 3D (el modelo da 125,0)`);
  // La planta queda plana Y el pie sale girado hacia afuera. Ese giro NO se
  // pone a mano en ninguna parte: cae solo de la abducción de cadera más la
  // flexión y la rodilla. Si alguien quita la abducción, el pie se endereza.
  ok(m.plantaNormal[1] > 0.99,
    `${etq}: la planta queda plana (normal ${JSON.stringify(m.plantaNormal)})`);
  const giroPie = Math.abs(Math.atan2(m.pieLargo[0], m.pieLargo[2]) * 180 / Math.PI);
  ok(giroPie > 25 && giroPie < 45,
    `${etq}: el pie sale abierto ${giroPie.toFixed(0)}° (el modelo da 36,2) sin orientarlo a mano`);
  ok(m.suelaL > -1.5 && m.suelaL < 3 && m.suelaR > -1.5 && m.suelaR < 3,
    `${etq}: las dos plantas pisan el suelo (${m.suelaL} / ${m.suelaR} cm)`);
  ok(m.piel > -1.5, `${etq}: no hay carne por debajo del suelo (${m.piel} cm)`);
}

// 1. LA MISMA PIERNA en las dos.
const F = barra["Sentadilla frontal (fondo)"], T2 = barra["Sentadilla trasera (fondo)"];
ok(Math.abs(F.muslo - T2.muslo) < 0.5 && Math.abs(F.tibia - T2.tibia) < 0.5
   && Math.abs(F.planta - T2.planta) < 0.5,
  `frontal y trasera comparten pierna (muslo ${F.muslo}/${T2.muslo}, `
  + `espinilla ${F.tibia}/${T2.tibia}, planta ${F.planta}/${T2.planta})`);

// 2. EL RACK las separa: la mano cae a lados opuestos del hombro.
ok(F.muneca[2] > 8, `frontal: la mano va DELANTE del hombro (${F.muneca[2]} cm), sobre clavícula y deltoides`);
ok(T2.muneca[2] < 0, `trasera: la mano va DETRÁS del hombro (${T2.muneca[2]} cm), sobre los trapecios`);
ok(F.muneca[2] - T2.muneca[2] > 12,
  `las dos manos no están en el mismo sitio (${(F.muneca[2] - T2.muneca[2]).toFixed(1)} cm de separación)`);
ok(F.codo[2] > 5 && T2.codo[2] < 2,
  `el codo sube al frente en la frontal (${F.codo[2]} cm) y cae bajo el hombro en la trasera (${T2.codo[2]} cm)`);
ok(F.muneca[1] > 0 && T2.muneca[1] > 0,
  `en las dos la mano queda por encima del hombro (${F.muneca[1]} / ${T2.muneca[1]} cm), que es donde está la barra`);

// 3. Las posturas DE ARRIBA son el mismo rack con las piernas estiradas: en el
//    modelo los brazos de la figura de pie y los del fondo son idénticos.
for (const [arriba, fondo] of [["Sentadilla frontal (arriba)", F], ["Sentadilla trasera (arriba)", T2]]) {
  await p.evaluate((q) => window.exersuite.editor.applyPose(q), arriba);
  await p.waitForTimeout(400);
  const alto = await altura();
  const muneca = await respectoA("wristL", "shoulderL");
  const etq = arriba.includes("frontal") ? "frontal" : "trasera";
  ok(Math.abs(alto - dePie) < 1, `${etq} arriba: la figura está estirada (${alto.toFixed(0)} cm)`);
  ok(Math.abs(muneca[2] - fondo.muneca[2]) < 1 && Math.abs(muneca[1] - fondo.muneca[1]) < 1,
    `${etq} arriba: el rack es el mismo que en el fondo (mano ${JSON.stringify(muneca)})`);
}

await p.evaluate(() => window.exersuite.editor.applyPose("Sentadilla frontal (fondo)"));
await p.waitForTimeout(400);
await p.screenshot({ path: "salidas/sentadilla-frontal.png" });
await p.evaluate(() => window.exersuite.editor.applyPose("Sentadilla trasera (fondo)"));
await p.waitForTimeout(400);
await p.screenshot({ path: "salidas/sentadilla-trasera.png" });

for (const e of errores) console.log("PAGEERROR " + e);
console.log(fallos.length === 0 && errores.length === 0
  ? "\nTODO OK" : `\n${fallos.length} fallos, ${errores.length} errores de página`);
await browser.close();
process.exit(fallos.length === 0 && errores.length === 0 ? 0 : 1);
