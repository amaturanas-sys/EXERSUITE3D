// Revisión Fable de v0.2.14: rack nativo CON cadenas, barra detenida por
// ellas sin crear nada a mano, barra de sim con etiquetas ES + candado +
// ángulo, aviso del doblado sin selección, y Marketplace con acciones vivas.
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

// Marketplace: showroom abre la BIBLIOTECA real; botón demo confirma.
await page.click("text=🛒 MARKETPLACE"); await page.waitForTimeout(600);
await page.click(".mkc-card >> nth=0 >> button:has-text('Ver')");
await page.waitForTimeout(1000);
const MK1 = await page.evaluate(() => ({ biblioteca: !!document.querySelector(".lib-panel") || document.body.textContent.includes("Biblioteca de modelos") }));
await page.goto("http://localhost:4174/"); await page.waitForTimeout(800);
await page.click("text=🛒 MARKETPLACE"); await page.waitForTimeout(500);
await page.click("text=📤 Solicitar cotización"); await page.waitForTimeout(300);
const MK2 = await page.evaluate(() => ({
  confirmacion: document.body.textContent.includes("Solicitud demo registrada"),
  apoyo: !!document.querySelector(".mk-barra-fill"),
}));
console.log("mk:", JSON.stringify({ ...MK1, ...MK2 }));

// Builder
await page.goto("http://localhost:4174/"); await page.waitForTimeout(800);
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);

// Doblado sin selección → aviso (no queda en modo doblado)
await page.click("#tool-quick .tq-bend"); await page.waitForTimeout(300);
const bendAviso = await page.evaluate(() => !window.exersuite.editor.isBending());

// Rack nativo: nace CON 2 cadenas; barra cargada soltada sobre ellas.
const R = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  ed.insertarMaquina("rack-sentadillas", new T.Vector3(0, 0, 0));
  const cuerdas = ed.listRopes ? ed.listRopes().length : [...ed.ropes.values()].length;
  const anclas = [...ed.objects.values()].filter((o) => o.componentId === "jota-pr");
  const lado = anclas.filter((a) => a.mesh.position.z < 0);
  const yCad = (lado[0].mesh.position.y + lado[1].mesh.position.y) / 2;
  const xCad = (lado[0].mesh.position.x + lado[1].mesh.position.x) / 2;
  // Caso real: barra a lo largo de Z, centrada entre columnas, cruzando
  // AMBAS cadenas laterales (z=±55.5) perpendicularmente.
  const barra = ed.addComponent("barra-olimpica", new T.Vector3(xCad, yCad + 40, 0));
  barra.mesh.rotation.x = Math.PI / 2; // a lo largo de Z, cruza las dos cadenas
  barra.mesh.position.set(xCad, yCad + 40, 0);
  barra.mesh.updateMatrixWorld(true);
  barra.params.discCount = 2;
  barra.rebuildCargaVisual();
  window.__barra = barra.id;
  ed.select(null);
  await ed.addHumanFigure(175);
  ed.humanFigure.position.set(120, ed.humanFigure.position.y, 0);
  ed.toggleSimulation();
  return { cuerdas, yCad: +yCad.toFixed(1) };
});
await page.waitForTimeout(9000);
const B = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const b = ed.getObject(window.__barra);
  return { y: +b.mesh.position.y.toFixed(1), tool: ed.getSimHerramienta() };
});
console.log("rack:", JSON.stringify({ ...R, ...B }));

// Barra de sim: etiquetas ES, candado y ángulo
const UI = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const focal = document.querySelector(".sim-focal");
  const textos = [...focal.options].map((o) => o.textContent);
  focal.value = "kneeL";
  focal.dispatchEvent(new Event("change"));
  return { rodilla: textos.includes("Rodilla izq."), opciones: textos.length };
});
// flexión con el botón ▲ y candado
for (let i = 0; i < 5; i++) { await page.click(".sim-figura button:has-text('▲')"); await page.waitForTimeout(80); }
const UI2 = await page.evaluate(() => ({
  angulo: document.querySelector(".sim-angulo")?.textContent ?? "",
}));
await page.click(".sim-figura button:has-text('🔓')"); await page.waitForTimeout(200);
const UI3 = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const bloqueado = !ed.moverArticulacionFocal("kneeL", 1);
  return { candado: document.querySelector(".sim-figura .tool.active") !== null, bloqueado };
});
await page.evaluate(() => {
  const ed = window.exersuite.editor;
  ed.orbit.target.set(0, 80, 0);
  ed.sceneManager.camera.position.set(210, 130, 230);
  ed.orbit.update?.(); ed.requestRender?.();
});
await page.waitForTimeout(400);
await page.screenshot({ path: "v214b-rack-cadenas.png" });
console.log("ui:", JSON.stringify({ ...UI, ...UI2, ...UI3 }));

const ok =
  MK1.biblioteca && MK2.confirmacion && MK2.apoyo && bendAviso &&
  R.cuerdas === 2 && B.y > R.yCad - 12 && B.y < R.yCad + 25 &&
  UI.rodilla && UI.opciones >= 14 && /°/.test(UI2.angulo) && UI3.bloqueado;
console.log(JSON.stringify({ ok, bendAviso }));
console.log("ERRORES:", errores.length ? errores.join("\n") : "ninguno");
await browser.close();
