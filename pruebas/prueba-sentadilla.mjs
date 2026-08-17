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

for (const e of errores) console.log("PAGEERROR " + e);
console.log(fallos.length === 0 && errores.length === 0
  ? "\nTODO OK" : `\n${fallos.length} fallos, ${errores.length} errores de página`);
await browser.close();
process.exit(fallos.length === 0 && errores.length === 0 ? 0 : 1);
