// Ajuste 2: cadenas como CUERDAS flexibles — la barra queda mecida en ellas,
// el visual sigue la física y un golpe hunde la cadena transitoriamente.
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
  const anclas = [...ed.objects.values()].filter((o) => o.componentId === "jota-pr");
  const lado = anclas.filter((a) => a.mesh.position.z < 0);
  const yCad = (lado[0].mesh.position.y + lado[1].mesh.position.y) / 2;
  const xCad = (lado[0].mesh.position.x + lado[1].mesh.position.x) / 2;
  const barra = ed.addComponent("barra-olimpica", new T.Vector3(xCad, yCad + 35, 0));
  barra.mesh.rotation.x = Math.PI / 2;
  barra.mesh.position.set(xCad, yCad + 35, 0);
  barra.mesh.updateMatrixWorld(true);
  window.__b = barra.id;
  window.__rope = ed.listRopes()[0].id;
  ed.select(null);
  ed.toggleSimulation();
  return { cuerdas: ed.listRopes().length, yCad: +yCad.toFixed(1) };
});
console.log("setup:", JSON.stringify(R0));
await page.waitForTimeout(12000);
const A = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const b = ed.getObject(window.__b);
  const pts = ed.physics.polilineaCuerda(window.__rope);
  const minCad = Math.min(...pts.map((p) => p.y));
  const rope = ed.listRopes()[0];
  let visMin = 1e9;
  rope.group.traverse((m) => { if (m.isMesh) visMin = Math.min(visMin, m.getWorldPosition(new window.exersuite.THREE.Vector3()).y); });
  return { yBarra: +b.mesh.position.y.toFixed(1), minCad: +minCad.toFixed(1), visMin: +visMin.toFixed(1) };
});
console.log("reposo:", JSON.stringify(A));
// Golpe vertical: la cuerda debe HUNDIRSE transitoriamente y recuperar.
await page.evaluate(() => {
  const body = window.exersuite.editor.physics.bodies.get(window.__b).body;
  body.setLinvel({ x: 0, y: -6, z: 0 }, true);
});
let hundMax = 0;
let minAbs = 1e9;
for (let i = 0; i < 14; i++) {
  await page.waitForTimeout(400);
  const m = await page.evaluate(() => {
    const pts = window.exersuite.editor.physics.polilineaCuerda(window.__rope);
    return Math.min(...pts.map((p) => p.y));
  });
  hundMax = Math.max(hundMax, A.minCad - m);
  minAbs = Math.min(minAbs, m);
}
await page.waitForTimeout(4000);
const F = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const b = ed.getObject(window.__b);
  const pts = ed.physics.polilineaCuerda(window.__rope);
  return { yBarra: +b.mesh.position.y.toFixed(1), minCad: +Math.min(...pts.map((p) => p.y)).toFixed(1) };
});
console.log("tras golpe:", JSON.stringify(F), "hundimientoMax:", +hundMax.toFixed(1), "minAbs:", +minAbs.toFixed(1));
const enCadena = (y, minCad) => Math.abs(y - (minCad + 1.6 + 3.5)) < 4;
const ok =
  R0.cuerdas === 2 &&
  enCadena(A.yBarra, A.minCad) && Math.abs(A.visMin - A.minCad) < 6 &&
  hundMax > 0.4 && minAbs > 61.5 && enCadena(F.yBarra, F.minCad) && F.yBarra > R0.yCad - 20;
console.log(JSON.stringify({ ok }));
console.log("ERRORES:", errores.length ? errores.join("\n") : "ninguno");
await page.evaluate(() => {
  const ed = window.exersuite.editor;
  ed.orbit.target.set(-15, 70, 0);
  ed.sceneManager.camera.position.set(170, 120, 200);
  ed.orbit.update?.(); ed.requestRender?.();
});
await page.waitForTimeout(400);
await page.screenshot({ path: "v215-cadena-flexible.png" });
await browser.close();
