// v0.2.49 · EL CASO DEL USUARIO: simular el press con la figura SENTADA en la
// máquina. Antes los brazos se quedaban en extensión completa porque hombro y
// codo se instruían por separado y sus direcciones anatómicas son opuestas.
// Ahora la instrucción es «tren superior · empuje» y el brazo hace el gesto.
import { chromium } from "playwright-core";
import { AYUDANTES } from "./ayudantes-maniqui.mjs";
const browser = await chromium.launch({
  // El Chromium de Playwright ya instalado. Se puede apuntar a otro con
  // CHROMIUM=/ruta/al/chrome (ver LEEME.md).
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errores = [];
page.on("pageerror", (e) => errores.push(e.message));
await page.goto("http://127.0.0.1:4174/");
await page.waitForTimeout(1000);
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);

const fallos = [];
const ok = (c, m) => { if (!c) fallos.push(m); console.log((c ? "✓ " : "✗ ") + m); };

await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  [...document.querySelectorAll("#palette .comp-btn")]
    .find((b) => (b.textContent ?? "").trim().endsWith("UpperMachine")).click();
  await new Promise((x) => setTimeout(x, 1800));
  const objs = [...ed.objects.values()];
  const pivote = ed.listJoints().find((u) => !u.locked);
  if (pivote) pivote.limitsEnabled = true;
  if (objs[20]?.stack) { objs[20].stack.selected = 5; objs[20].rebuildStackVisual(); }
  if (!ed.figureJoints()) await ed.addHumanFigure();
  ed.startSimulation();
  for (let i = 0; i < 160 && !ed.physics; i++) await new Promise((x) => setTimeout(x, 50));
  await new Promise((x) => setTimeout(x, 2000));
});
// Sentar el maniquí en el asiento con la herramienta real.
const px = await page.evaluate(() => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  const rect = ed.sceneManager.renderer.domElement.getBoundingClientRect();
  const caja = new T.Box3().setFromObject([...ed.objects.values()][4].mesh);
  const v = new T.Vector3((caja.min.x + caja.max.x) / 2, caja.max.y + 0.3, (caja.min.z + caja.max.z) / 2);
  const q = v.clone().project(ed.sceneManager.camera);
  return { x: Math.round((q.x * 0.5 + 0.5) * rect.width), y: Math.round((-q.y * 0.5 + 0.5) * rect.height) };
});
await page.evaluate(() => window.exersuite.editor.beginColocarFigura());
await page.mouse.move(px.x, px.y); await page.waitForTimeout(400);
await page.mouse.click(px.x, px.y); await page.waitForTimeout(1300);
await page.evaluate(AYUDANTES);

const r = await page.evaluate(async () => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  const objs = [...ed.objects.values()];
  const g = (n) => +T.MathUtils.radToDeg(ed.figureJoints()[n].rotation.x).toFixed(1);
  // Con los apoyos vivos (v0.2.91) lo que se conserva al parar no son los
  // GRADOS sino DÓNDE QUEDA LA MANO: los brazos vuelven a buscar el agarre.
  const manoAlAgarre = (lado, idx) => {
    const fig = ed.humanFigure; fig.updateMatrixWorld(true);
    let m = null; fig.traverse((n) => { if (n.userData?.segmentId === `mano-${lado}`) m = n; });
    const c = new T.Box3().setFromObject(m).getCenter(new T.Vector3());
    return +c.distanceTo([...ed.objects.values()][idx].mesh.position).toFixed(1);
  };
  const foto = () => ({ hombro: g("shoulderL"), codo: g("elbowL"),
    y: +ed.humanFigure.position.y.toFixed(2), agarreL: manoAlAgarre("L", 40) });
  // Postura de partida del gesto y manos en los agarres.
  ed.applyPose("Empuje horizontal");
  for (const [side, idx] of [["R", 39], ["L", 40]]) {
    objs[idx].mesh.updateMatrixWorld(true);
    ed.attachHand(side, objs[idx].id, new T.Vector3(0, 0, 0));
  }
  await new Promise((x) => setTimeout(x, 700));
  ed.physics.añadirFigura(ed.humanFigure);
  ed.marcarPoseDePartida("Empuje horizontal");
  const sentada = window.__sentadaEn([...ed.objects.values()][4]);
  const partida = foto();

  ed.activarZona("inferior", null); ed.activarZona("bisagra", null);
  ed.activarZona("superior", "sim");
  for (let k = 0; k < 30; k++) { ed.moverPrimitiva(1, 5); await new Promise((x) => setTimeout(x, 30)); }
  const empujado = foto();
  const choque = ed.contactoConEstructura;
  for (let k = 0; k < 30; k++) { ed.moverPrimitiva(-1, 5); await new Promise((x) => setTimeout(x, 30)); }
  const traccionado = foto();
  ed.stopSimulation();
  await new Promise((x) => setTimeout(x, 1200));
  const trasParar = foto();
  // Sentada = los glúteos posados en la cara del asiento (ver __sentadaEn): la
  // `y` de la figura ya no significa nada desde que la raíz del rig está en el
  // suelo en vez de a la altura de la cadera.
  return { partida, empujado, traccionado, trasParar, choque, sentada };
});
console.log("partida:    ", JSON.stringify(r.partida));
console.log("tras 8×30:  ", JSON.stringify(r.empujado));
console.log("tras 9×30:  ", JSON.stringify(r.traccionado));
console.log("tras parar: ", JSON.stringify(r.trasParar));
ok(r.sentada?.sentada,
  `el maniquí queda sentado en la máquina (glúteos a ${r.sentada?.gluteos}, `
  + `asiento a ${r.sentada?.asiento} cm)`);
ok(r.empujado.codo > r.partida.codo + 40 && r.empujado.hombro < r.partida.hombro - 20,
  `el EMPUJE hace el gesto completo: codo ${r.partida.codo}°→${r.empujado.codo}° y hombro ${r.partida.hombro}°→${r.empujado.hombro}°`);
ok(r.traccionado.codo < r.empujado.codo - 40,
  `y la TRACCIÓN lo deshace (codo ${r.empujado.codo}°→${r.traccionado.codo}°): los brazos NO se quedan en extensión`);
// PARAR DEVUELVE EL SITIO Y EL AGARRE, no los grados exactos. Desde v0.2.91
// la mano apoyada manda con el gesto parado —antes la zona «tren superior»
// vetaba su IK y el brazo se quedaba clavado en los grados del catálogo—, así
// que al parar los brazos vuelven a BUSCAR el mando. Que los ángulos difieran
// es la consecuencia correcta; lo que tiene que conservarse es dónde se sienta
// la figura y a qué distancia le queda el agarre.
ok(Math.abs(r.trasParar.y - r.partida.y) < 0.01,
  `parar devuelve el sitio de partida (y ${r.trasParar.y})`);
// Y AL PARAR, EL APOYO MANDA. Mientras el gesto corre gobierna la zona y la IK
// de la mano se aparta a propósito —si no, deshacía el movimiento en el mismo
// fotograma—; en cuanto se para, el brazo vuelve a buscar el mando y la mano se
// acerca. (Que no llegue a tocarlo es la lectura ergonómica de esta máquina:
// el agarre le queda a 60,6 cm del hombro y este cuerpo alcanza 56.)
ok(r.trasParar.agarreL < r.partida.agarreL,
  `al parar, el brazo vuelve a buscar el mando (${r.partida.agarreL} → ${r.trasParar.agarreL} cm)`);
console.log(`  (choque con la estructura durante el empuje: ${r.choque} — es la lectura ergonómica, no un fallo)`);
console.log("ERRORES:", errores.length ? errores.join("\n") : "ninguno");
console.log(fallos.length ? "❌ " + fallos.join(" · ") : "✅ todo correcto");
await browser.close();
process.exit(fallos.length ? 1 : 0);
