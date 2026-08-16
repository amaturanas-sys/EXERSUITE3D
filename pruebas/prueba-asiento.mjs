// Ajuste 1: la barra sobre las jotas queda RETENIDA en el asiento cóncavo
// (no rueda ni desliza fuera del gancho durante la simulación).
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
await page.waitForTimeout(900);
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);
const R0 = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  ed.insertarMaquina("rack-sentadillas", new T.Vector3(0, 0, 0));
  const jota = [...ed.objects.values()].find((o) => o.componentId === "jota-rodillo-pr");
  const barra = ed.addComponent("barra-olimpica", new T.Vector3(jota.mesh.position.x, jota.mesh.position.y + 8, 0));
  barra.mesh.rotation.x = Math.PI / 2;
  barra.mesh.position.set(jota.mesh.position.x, jota.mesh.position.y + 8, 0);
  barra.mesh.updateMatrixWorld(true);
  barra.params.discCount = 2;
  barra.rebuildCargaVisual();
  window.__b = barra.id;
  ed.select(null);
  ed.toggleSimulation();
  return { x0: +jota.mesh.position.x.toFixed(1), y0: +(jota.mesh.position.y + 8).toFixed(1) };
});
await page.waitForTimeout(7000);
const R = await page.evaluate(() => {
  const b = window.exersuite.editor.getObject(window.__b);
  return { x: +b.mesh.position.x.toFixed(1), y: +b.mesh.position.y.toFixed(1), z: +b.mesh.position.z.toFixed(1) };
});
// Retenida: sigue a la altura de las jotas y sin derivar en X (fuera del gancho)
const ok = Math.abs(R.x - R0.x0) < 6 && R.y > R0.y0 - 10 && R.y < R0.y0 + 8 && Math.abs(R.z) < 8;
console.log(JSON.stringify({ ...R0, ...R, ok }));
console.log("ERRORES:", errores.length ? errores.join("\n") : "ninguno");
await page.evaluate(() => {
  const ed = window.exersuite.editor;
  ed.orbit.target.set(20, 110, 0);
  ed.sceneManager.camera.position.set(200, 150, 220);
  ed.orbit.update?.(); ed.requestRender?.();
});
await page.waitForTimeout(400);
await page.screenshot({ path: "v215-asiento-jota.png" });
await browser.close();
