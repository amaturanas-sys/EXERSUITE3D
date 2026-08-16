// v0.2.20: Torre polea de discos nativa — 24 piezas, 3 bisagras, 2 cables;
// el carrier portadiscos queda guiado y el jalón bajo transmite.
import { chromium } from "playwright-core";
const browser = await chromium.launch({
  // El Chromium de Playwright ya instalado. Se puede apuntar a otro con
  // CHROMIUM=/ruta/al/chrome (ver LEEME.md).
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
const errores = [];
page.on("pageerror", (e) => errores.push("PAGEERROR: " + e.message));
await page.goto("http://127.0.0.1:4174/");
await page.waitForTimeout(1000);
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);
const P = await page.evaluate(() => ({
  tarjeta: [...document.querySelectorAll("#palette .maquina-btn")].some((b) => /Torre polea de discos/.test(b.textContent)),
}));
const R = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const antes = new Set([...ed.objects.keys()]);
  ed.insertarMaquina("torre-polea-discos", new T.Vector3(0, 0, 0));
  const nuevos = [...ed.objects.values()].filter((o) => !antes.has(o.id));
  const porta = nuevos.find((o) => o.componentId === "portadiscos-ttp");
  const remo = nuevos.find((o) => (o.name || "").includes("Remo de polea alta"));
  const jalon = nuevos.find((o) => (o.name || "").includes("jalón bajo"));
  window.__ids = { porta: porta?.id, remo: remo?.id, jalon: jalon?.id };
  ed.select(null);
  return {
    piezas: nuevos.length,
    uniones: ed.listJoints().length,
    cables: ed.listCables().length,
    porta: !!porta, remo: !!remo, jalon: !!jalon,
  };
});
console.log("torre:", JSON.stringify({ ...P, ...R }));

// Simulación a velocidad real: el carrier queda guiado (no cae ni deriva) y
// tirar del remo lo LEVANTA (transmisión por cable).
const S = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const porta = ed.getObject(window.__ids.porta);
  const remo = ed.getObject(window.__ids.remo);
  await ed.toggleSimulation();
  for (let i = 0; i < 120; i++) ed.physics.step(1 / 60);
  const p0 = porta.mesh.position.clone();
  const r0 = remo.mesh.position.clone();
  ed.physics.grab(remo.id, r0.clone());
  for (let i = 0; i < 240; i++) {
    ed.physics.dragTo(r0.clone().add(new T.Vector3(0, -Math.min(i * 0.5, 60), 20 + Math.min(i * 0.4, 45))));
    ed.physics.step(1 / 60);
  }
  const sube = porta.mesh.position.y - p0.y;
  const derivaXZ = Math.hypot(porta.mesh.position.x - p0.x, porta.mesh.position.z - p0.z);
  ed.physics.release?.();
  ed.toggleSimulation();
  return { portaSube: +sube.toFixed(1), derivaXZ: +derivaXZ.toFixed(1), p0y: +p0.y.toFixed(1) };
});
console.log("sim:", JSON.stringify(S));
await page.evaluate(() => {
  const ed = window.exersuite.editor;
  ed.orbit.target.set(0, 100, -10);
  ed.sceneManager.camera.position.set(230, 150, 200);
  ed.orbit.update?.(); ed.requestRender?.();
});
await page.waitForTimeout(400);
await page.screenshot({ path: "v220-torre-discos.png" });
const ok = P.tarjeta && R.piezas === 24 && R.uniones >= 3 && R.cables === 2 &&
  R.porta && R.remo && R.jalon &&
  S.portaSube > 5 && S.derivaXZ < 6;
console.log(JSON.stringify({ ok }));
console.log("ERRORES:", errores.length ? errores.join("\n") : "ninguno");
await browser.close();
