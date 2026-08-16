// v0.2.46 · (1) el maniquí APOYA de verdad en asiento y respaldo, sin hover.
//           (2) el modo POSAR refleja la articulación tocada. En v0.2.56 la
//               rejilla de 8 familias + los 3 botones de lado se sustituyen
//               por un campo con el nombre y un interruptor bilateral: lo que
//               se comprueba ahora es que el campo REFLEJE lo seleccionado.
// Se usa el prefab REAL del usuario, que es donde se vio el problema.
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
const AQUI = new URL(".", import.meta.url).pathname;   // vale desde cualquier cwd

const prefab = readFileSync(
  AQUI + "fijos/user.prefab.json",
  "utf8",
);
const browser = await chromium.launch({
  // El Chromium de Playwright ya instalado. Se puede apuntar a otro con
  // CHROMIUM=/ruta/al/chrome (ver LEEME.md).
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errores = [];
page.on("pageerror", (e) => errores.push("PAGEERROR: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errores.push("CONSOLE: " + m.text()); });
await page.goto("http://127.0.0.1:4174/");
await page.waitForTimeout(1000);
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);

const fallos = [];
const ok = (c, m) => { if (!c) fallos.push(m); console.log((c ? "✓ " : "✗ ") + m); };

// ---- 2) selector de articulación en POSAR ----------------------------
const posar = await page.evaluate(async (txt) => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  const { parsearPrefab } = window.exersuitePrefabs;
  ed.insertarPrefab(parsearPrefab(txt).archivo, new T.Vector3(0, 0, 0));
  await new Promise((x) => setTimeout(x, 2000));
  if (!ed.figureJoints()) await ed.addHumanFigure();
  await new Promise((x) => setTimeout(x, 800));
  ed.panelArticulaciones.setModo("posar");
  const panel = document.querySelector("#articulaciones");
  const campo = panel.querySelector("input.mq-articulacion");
  const interruptor = panel.querySelector(".mq-interruptor input[type=checkbox]");
  // Tocar el codo derecho en el visor: el campo debe decirlo con su nombre.
  ed.selectJoint("elbowR");
  const sel = ed.getSelectedJoint();
  return { hayCampo: !!campo, hayInterruptor: !!interruptor, sel,
    texto: campo ? campo.value : null,
    // Solo la caja de POSAR: SIMULAR conserva a propósito sus zonas y lados.
    rejillaVieja: [...panel.querySelectorAll(".mq-seccion")][0]
      .querySelectorAll(".art-rejilla .tool").length,
    ladosViejos: [...panel.querySelectorAll(".mq-seccion")][0]
      .querySelectorAll(".art-lados .tool").length,
    ladosDeSimular: [...panel.querySelectorAll(".mq-seccion")][1]
      .querySelectorAll(".art-lados .tool").length };
}, prefab);
ok(posar.hayCampo, "POSAR tiene el campo con el nombre de la articulación");
ok(posar.hayInterruptor, "y su interruptor bilateral");
ok(posar.rejillaVieja === 0 && posar.ladosViejos === 0,
  `POSAR ya no tiene rejilla ni botones de lado (${posar.rejillaVieja}/${posar.ladosViejos})`);
ok(posar.ladosDeSimular === 9,
  `y SIMULAR conserva los suyos, sin tocar (${posar.ladosDeSimular})`);
ok(posar.sel === "elbowR", `tocar el codo derecho lo selecciona (${posar.sel})`);
ok(posar.texto === "Codo derecho", `y el campo lo dice con nombre de persona ("${posar.texto}")`);

// ---- 1) apoyo real en asiento y respaldo ------------------------------
const px = await page.evaluate(async () => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  ed.startSimulation();
  for (let i = 0; i < 160 && !ed.physics; i++) await new Promise((x) => setTimeout(x, 50));
  await new Promise((x) => setTimeout(x, 2500));
  const rect = ed.sceneManager.renderer.domElement.getBoundingClientRect();
  const asiento = [...ed.objects.values()].find((o) => /^Asiento/i.test(o.name));
  const c = new T.Box3().setFromObject(asiento.mesh);
  const v = new T.Vector3((c.min.x + c.max.x) / 2, c.max.y + 0.3, (c.min.z + c.max.z) / 2);
  const q = v.clone().project(ed.sceneManager.camera);
  return { x: Math.round((q.x * 0.5 + 0.5) * rect.width), y: Math.round((-q.y * 0.5 + 0.5) * rect.height) };
});
await page.evaluate(() => window.exersuite.editor.beginColocarFigura());
await page.mouse.move(px.x, px.y); await page.waitForTimeout(400);
await page.mouse.click(px.x, px.y); await page.waitForTimeout(1600);

const ap = await page.evaluate(() => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  const fig = ed.humanFigure; fig.updateMatrixWorld(true);
  const segs = {};
  fig.traverse((n) => { if (n.isMesh && n.userData.segmentId) segs[n.userData.segmentId] = new T.Box3().setFromObject(n); });
  const objs = [...ed.objects.values()];
  const asiento = new T.Box3().setFromObject(objs.find((o) => /^Asiento/i.test(o.name)).mesh);
  const respaldo = new T.Box3().setFromObject(objs.find((o) => /^Respaldo(?! 2)/i.test(o.name)).mesh);
  return {
    huecoAsiento: +(segs["pelvis"].min.y - asiento.max.y).toFixed(2),
    huecoRespaldo: +(segs["torso"].min.z - respaldo.max.z).toFixed(2),
    modo: ed.panelArticulaciones.modoActual(),
  };
});
ok(Math.abs(ap.huecoAsiento) < 1.5, `los glúteos APOYAN en el asiento, sin flotar (${ap.huecoAsiento} cm)`);
ok(ap.huecoRespaldo < 1.5, `la espalda APOYA en el respaldo (${ap.huecoRespaldo} cm)`);
ok(ap.modo === "simular", `y la ventana está en SIMULAR con la física corriendo (${ap.modo})`);
console.log("ERRORES:", errores.length ? errores.join("\n") : "ninguno");
console.log(fallos.length ? "❌ " + fallos.join(" · ") : "✅ todo correcto");
await page.screenshot({ path: "v246.png" });
await browser.close();
process.exit(fallos.length ? 1 : 0);
