// Ajuste 1b: empujón horizontal a la barra asentada — el TOPE del gancho la
// retiene (antes rodaba y caía).
import { chromium } from "playwright-core";
const browser = await chromium.launch({
  // El Chromium de Playwright ya instalado. Se puede apuntar a otro con
  // CHROMIUM=/ruta/al/chrome (ver LEEME.md).
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
await page.goto("http://localhost:4174/");
await page.waitForTimeout(900);
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);
await page.evaluate(() => {
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
});
await page.waitForTimeout(3000);
// Empujones en ±X (la boca del gancho mira por X)
for (const vx of [0.8, -0.8, 1.2]) {
  await page.evaluate((vx) => {
    const ed = window.exersuite.editor;
    const body = ed.physics.bodies.get(window.__b).body;
    body.setLinvel({ x: vx, y: 0, z: 0 }, true); // m/s
  }, vx);
  await page.waitForTimeout(1500);
  const s = await page.evaluate(() => {
    const b = window.exersuite.editor.getObject(window.__b);
    return { x: +b.mesh.position.x.toFixed(1), y: +b.mesh.position.y.toFixed(1) };
  });
  console.log(`tras empujón vx=${vx}:`, JSON.stringify(s));
}
const F = await page.evaluate(() => {
  const b = window.exersuite.editor.getObject(window.__b);
  return { x: +b.mesh.position.x.toFixed(1), y: +b.mesh.position.y.toFixed(1) };
});
console.log(JSON.stringify({ ok: F.y > 110 && Math.abs(F.x - 18.3) < 8 }));
await browser.close();
