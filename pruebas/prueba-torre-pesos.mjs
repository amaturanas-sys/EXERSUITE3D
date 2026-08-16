// v0.2.23: Torre polea con BLOQUE DE PESOS — pila seleccionable en los
// tubos guía, remo levanta la pila, y export del .prefab.json borrador.
import { chromium } from "playwright-core";
import fs from "node:fs";
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

const R = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const antes = new Set([...ed.objects.keys()]);
  ed.insertarMaquina("torre-polea-pesos", new T.Vector3(0, 0, 0));
  const nuevos = [...ed.objects.values()].filter((o) => !antes.has(o.id));
  const pila = nuevos.find((o) => o.componentId === "pila-pesos");
  const remo = nuevos.find((o) => (o.name || "").includes("Remo de polea alta"));
  const carrier = nuevos.find((o) => o.componentId === "portadiscos-ttp");
  window.__ids = { todos: nuevos.map((o) => o.id), pila: pila?.id, remo: remo?.id };
  return {
    piezas: nuevos.length,
    pila: !!pila,
    sinCarrier: !carrier,
    cables: ed.listCables().length,
    uniones: ed.listJoints().length,
    pilaPos: pila ? pila.mesh.position.toArray().map((v) => +v.toFixed(1)) : null,
  };
});
console.log("torre-pesos:", JSON.stringify(R));

// Export del BORRADOR .prefab.json para la corrección del diseñador.
const json = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  ed.select(null);
  for (const id of window.__ids.todos) ed.toggleMulti(ed.getObject(id));
  return window.exersuite.prefabIO.serializarPrefab(ed, "Torre polea de pesos");
});
fs.writeFileSync("torrepoleadepesos.prefab.json", json);
const parsed = JSON.parse(json);
console.log("prefab:", JSON.stringify({ piezas: parsed.piezas.length, uniones: (parsed.uniones ?? []).length, cables: (parsed.cables ?? []).length, label: parsed.label }));

// Simulación: la pila queda GUIADA y el remo la LEVANTA por el cable.
const S = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  ed.select(null);
  const pila = ed.getObject(window.__ids.pila);
  const remo = ed.getObject(window.__ids.remo);
  await ed.toggleSimulation();
  for (let i = 0; i < 120; i++) ed.physics.step(1 / 60);
  const p0 = pila.mesh.position.clone();
  const r0 = remo.mesh.position.clone();
  ed.physics.grab(remo.id, r0.clone());
  for (let i = 0; i < 240; i++) {
    ed.physics.dragTo(r0.clone().add(new T.Vector3(0, -Math.min(i * 0.5, 60), 20 + Math.min(i * 0.4, 45))));
    ed.physics.step(1 / 60);
  }
  const sube = pila.mesh.position.y - p0.y;
  const derivaXZ = Math.hypot(pila.mesh.position.x - p0.x, pila.mesh.position.z - p0.z);
  ed.toggleSimulation();
  return { asentadaY: +p0.y.toFixed(1), pilaSube: +sube.toFixed(1), derivaXZ: +derivaXZ.toFixed(1) };
});
console.log("sim:", JSON.stringify(S));
await page.evaluate(() => {
  const ed = window.exersuite.editor;
  ed.orbit.target.set(0, 100, -10);
  ed.sceneManager.camera.position.set(230, 150, 200);
  ed.orbit.update?.(); ed.requestRender?.();
});
await page.waitForTimeout(400);
await page.screenshot({ path: "v224-torre-pesos.png" });
const ok = R.piezas === 22 && R.pila && R.sinCarrier && R.cables === 2 && R.uniones >= 3 &&
  parsed.piezas.length === 22 && (parsed.cables ?? []).length === 2 &&
  S.asentadaY > 38 && S.asentadaY < 60 && S.pilaSube > 5 && S.derivaXZ < 6;
console.log(JSON.stringify({ ok }));
console.log("ERRORES:", errores.length ? errores.join("\n") : "ninguno");
await browser.close();
