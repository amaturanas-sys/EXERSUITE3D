// Rack de sentadillas nativo + barra cargada: la barra NO cruza el suelo,
// se apoya en las jotas y, si se suelta, la CADENA de seguridad la detiene.
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

// ---- Rack de sentadillas de fábrica + barra cargada sobre las jotas
const setup = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const antes = new Set([...ed.objects.keys()]);
  ed.insertarMaquina("rack-sentadillas", new T.Vector3(0, 0, 0));
  const nuevos = [...ed.objects.values()].filter((o) => !antes.has(o.id));
  const jotas = nuevos.filter((o) => o.componentId === "jota-rodillo-pr");
  const anclajes = nuevos.filter((o) => o.componentId === "jota-pr");
  // Barra olímpica cargada, tendida sobre las dos jotas (eje Z entre pilares).
  const yJota = jotas[0].mesh.position.y;
  const xJota = jotas[0].mesh.position.x;
  const barra = ed.addComponent("barra-olimpica", new T.Vector3(xJota, yJota + 8, 0));
  barra.mesh.rotation.x = Math.PI / 2; // largo a lo largo de Z
  barra.mesh.position.set(xJota, yJota + 8, 0);
  barra.mesh.updateMatrixWorld(true);
  barra.params.discCount = 2;
  barra.rebuildCargaVisual();
  window.__ids = { barra: barra.id, jotas: jotas.map((j) => j.id), anclajes: anclajes.map((a) => a.id) };
  ed.select(null);
  return {
    piezas: nuevos.length,
    uniones: ed.listJoints().length,
    jotas: jotas.length,
    anclajes: anclajes.length,
    yJota: +yJota.toFixed(1),
    masaBarra: +barra.effectiveMassKg().toFixed(1),
  };
});
console.log("setup:", JSON.stringify(setup));

// ---- A) La barra descansa en las jotas y NO atraviesa el suelo
await page.evaluate(() => window.exersuite.editor.toggleSimulation());
await page.waitForTimeout(4000);
const A = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const b = ed.getObject(window.__ids.barra);
  return { y: +b.mesh.position.y.toFixed(1) };
});
console.log("A (sobre jotas):", JSON.stringify(A));
await page.evaluate(() => {
  const ed = window.exersuite.editor;
  ed.orbit.target.set(0, 100, 0);
  ed.sceneManager.camera.position.set(190, 150, 210);
  ed.orbit.update?.(); ed.requestRender?.();
});
await page.waitForTimeout(400);
await page.screenshot({ path: "v214-barra-jotas.png" });
await page.evaluate(() => window.exersuite.editor.toggleSimulation());
await page.waitForTimeout(700);

// ---- B) Cadena de seguridad entre los anclajes + barra soltada por encima
const setB = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const [a1, a2] = window.__ids.anclajes.map((id) => ed.getObject(id));
  // Cadena tendida entre los dos anclajes del MISMO lado (mismo x).
  const mismos = window.__ids.anclajes
    .map((id) => ed.getObject(id))
    .sort((p, q) => p.mesh.position.x - q.mesh.position.x);
  const A = mismos[0], B = mismos[1];
  const rope = ed.createRope("chain", { objectId: A.id, local: new T.Vector3(0, 0, 0) }, { objectId: B.id, local: new T.Vector3(0, 0, 0) }, 0.18);
  // La barra arranca 40 cm sobre la cadena, libre: debe quedar detenida por ella.
  const barra = ed.getObject(window.__ids.barra);
  const yCadena = (A.mesh.position.y + B.mesh.position.y) / 2;
  const xCadena = (A.mesh.position.x + B.mesh.position.x) / 2;
  const zCadena = (A.mesh.position.z + B.mesh.position.z) / 2;
  barra.mesh.position.set(xCadena, yCadena + 40, zCadena);
  barra.mesh.rotation.set(0, 0, 0);
  barra.mesh.rotation.z = Math.PI / 2; // largo a lo largo de X, cruza la cadena
  barra.mesh.updateMatrixWorld(true);
  ed.select(null);
  return {
    ropeOk: !!rope,
    anclajeA: [+A.mesh.position.x.toFixed(1), +A.mesh.position.y.toFixed(1), +A.mesh.position.z.toFixed(1)],
    anclajeB: [+B.mesh.position.x.toFixed(1), +B.mesh.position.y.toFixed(1), +B.mesh.position.z.toFixed(1)],
    yCadena: +yCadena.toFixed(1),
    yBarra0: +barra.mesh.position.y.toFixed(1),
  };
});
console.log("setB:", JSON.stringify(setB));
await page.evaluate(() => window.exersuite.editor.toggleSimulation());
// La barra roza los pilares traseros al bajar (fricción real): tarda ~8 s.
await page.waitForTimeout(9000);
const B = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const b = ed.getObject(window.__ids.barra);
  return { y: +b.mesh.position.y.toFixed(1) };
});
console.log("B (sobre cadena):", JSON.stringify(B));
await page.evaluate(() => {
  const ed = window.exersuite.editor;
  ed.orbit.target.set(0, 70, 0);
  ed.sceneManager.camera.position.set(150, 110, 190);
  ed.orbit.update?.(); ed.requestRender?.();
});
await page.waitForTimeout(400);
await page.screenshot({ path: "v214-barra-cadena.png" });

const okSetup = setup.piezas === 14 && setup.uniones === 2 && setup.jotas === 2 && setup.anclajes === 4;
const okJotas = A.y > setup.yJota - 6 && A.y < setup.yJota + 20; // apoyada, no caída
const okCadena = B.y > setB.yCadena - 12 && B.y < setB.yCadena + 20; // detenida por la cadena
console.log(JSON.stringify({ okSetup, okJotas, okCadena, ok: okSetup && okJotas && okCadena }));
console.log("ERRORES:", errores.length ? errores.join("\n") : "ninguno");
await browser.close();
