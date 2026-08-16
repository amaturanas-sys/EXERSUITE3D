// Humo v0.2.14: transmisión de poleas del TTP con la mano nueva (fuerza
// ilimitada + guardarraíl de 12 m/s), tensión kg/lb, órbita, articulación
// focal, botón de doblado y Marketplace.
import { chromium } from "playwright-core";
const browser = await chromium.launch({
  // El Chromium de Playwright ya instalado. Se puede apuntar a otro con
  // CHROMIUM=/ruta/al/chrome (ver LEEME.md).
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
const errores = [];
page.on("pageerror", (e) => errores.push("PAGEERROR: " + e.message));
await page.goto("http://localhost:4174/");
await page.waitForTimeout(1000);

// Marketplace accesible desde la landing.
//
// v0.2.72: el hub sustituyó al marketplace de siete ventanas. Esta prueba es de
// HUMO —solo mira que la puerta abre y que hay algo detrás—; quien mide el hub
// a fondo es `prueba-hub`, con sus 62 comprobaciones.
await page.click("text=🛒 MARKETPLACE");
await page.waitForTimeout(1200);
const MK = await page.evaluate(() => ({
  marcas: document.querySelectorAll(".hub-historia").length,
  recorridos: document.querySelectorAll(".hub-tab").length,
  fichas: document.querySelectorAll(".hub-card").length,
  swatches: document.querySelectorAll(".od-swatch").length,
}));
console.log("marketplace:", JSON.stringify(MK));

await page.goto("http://localhost:4174/");
await page.waitForTimeout(800);
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);

// Botón de DOBLADO del Toolbox
await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  ed.select(ed.addComponent("pilar-linea", new T.Vector3(0, 100, 300)));
});
await page.click("#tool-quick .tq-bend"); await page.waitForTimeout(300);
const bendOn = await page.evaluate(() => window.exersuite.editor.isBending());
await page.click("#tool-quick .tq-bend"); await page.waitForTimeout(200);
const bendOff = await page.evaluate(() => !window.exersuite.editor.isBending());
console.log("doblado:", JSON.stringify({ bendOn, bendOff }));

// TTP: transmisión del sistema de poleas con la mano + tensión
const T1 = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  ed.insertarMaquina("rack-torre", new T.Vector3(0, 0, 0));
  await ed.addHumanFigure(175);
  ed.humanFigure.position.set(95, ed.humanFigure.position.y, 55);
  ed.select(null);
  ed.toggleSimulation();
  await new Promise((r) => setTimeout(r, 2500));
  const remo = [...ed.objects.values()].find((o) => (o.name || "").toLowerCase().includes("remo"));
  const porta = [...ed.objects.values()].find((o) => o.componentId === "portadiscos-ttp");
  const y0 = porta ? porta.mesh.position.y : null;
  const r0 = remo.mesh.position.clone();
  const pos = remo.mesh.position.clone();
  ed.physics.grab(remo.id, pos);
  for (let i = 0; i < 25; i++) {
    ed.physics.dragTo(pos.clone().add(new T.Vector3(0, -3 - i * 2, 8)));
    await new Promise((r) => setTimeout(r, 120));
  }
  const y1 = porta ? porta.mesh.position.y : null;
  return {
    portaSube: y0 !== null ? +(y1 - y0).toFixed(1) : null,
    remoBaja: +(r0.y - remo.mesh.position.y).toFixed(1),
    remoDesp: +r0.distanceTo(remo.mesh.position).toFixed(1),
    guiadas: ed.physics.guias.length,
    cables: ed.physics.cables.length,
    tensionKg: +ed.tensionManoKg().toFixed(1),
  };
});
await page.waitForTimeout(600);
const UI = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  // v0.2.49: la figura nace con el TREN SUPERIOR como zona activa (hombros y
  // codos libres, el resto fijo) y 8 la empuja hasta el tope del codo.
  const libresDeFabrica = ed.articulacionesLibres().sort().join(",");
  ed.panelArticulaciones.alternar();
  const familias = document.querySelectorAll("#articulaciones .mq-zona").length;
  ed.applyPose("Empuje horizontal");   // el gesto necesita de dónde partir
  let pasos = 0;
  for (let i = 0; i < 60; i++) if (ed.moverPrimitiva(1) > 0) pasos++;
  const tope = ed.moverPrimitiva(1) === 0;
  ed.setSimHerramienta("orbitar");
  return {
    tensionUI: document.querySelector(".sim-tension")?.textContent ?? "",
    libresDeFabrica, familias,
    pasos, tope, herramienta: ed.getSimHerramienta(),
  };
});
console.log("sim:", JSON.stringify({ ...T1, ...UI }));

const ok =
  MK.marcas >= 10 && MK.recorridos === 5 && MK.fichas >= 30 &&
  bendOn && bendOff &&
  T1.remoDesp > 5 && T1.cables === 2 && T1.tensionKg > 0.5 && T1.tensionKg < 500 &&
  /kg · .*lb/.test(UI.tensionUI) &&
  UI.libresDeFabrica === "elbowL,elbowR,shoulderL,shoulderR" && UI.familias === 3 &&
  UI.pasos > 5 && UI.tope && UI.herramienta === "orbitar";
console.log(JSON.stringify({ ok }));
console.log("ERRORES:", errores.length ? errores.join("\n") : "ninguno");
await browser.close();
