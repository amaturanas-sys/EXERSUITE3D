// v0.2.40 · HERRAMIENTA DE FRENO DE CABLE: se engarza una esfera de tope en
// un punto del cable con el puntero; la esfera viaja con el cable pero no
// pasa por la roldana, así que ese lado deja de retraerse y la tensión se
// transmite al otro (deja de fugarse por el extremo liviano).
import { chromium } from "playwright-core";
const browser = await chromium.launch({
  // El Chromium de Playwright ya instalado. Se puede apuntar a otro con
  // CHROMIUM=/ruta/al/chrome (ver LEEME.md).
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1180, height: 860 } });
const errores = [];
page.on("pageerror", (e) => errores.push(e.message));
await page.goto("http://127.0.0.1:4174/");
await page.waitForTimeout(1000);
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);
await page.evaluate(() => {
  [...document.querySelectorAll("#palette .comp-btn")]
    .find((b) => (b.textContent ?? "").trim().endsWith("UpperMachine")).click();
});
await page.waitForTimeout(1800);
const fallos = [];
const ok = (c, m) => { if (!c) fallos.push(m); console.log((c ? "✓ " : "✗ ") + m); };

// 1) El botón existe y activa la herramienta.
const hayBoton = await page.evaluate(() =>
  !!([...document.querySelectorAll("#joints button")].find((b) => b.textContent.includes("Freno"))));
ok(hayBoton, "el panel Conexiones ofrece la herramienta ⏺ Freno");
await page.evaluate(() => {
  [...document.querySelectorAll("#joints button")].find((b) => b.textContent.includes("Freno")).click();
});
await page.waitForTimeout(300);
const activo = await page.evaluate(() => window.exersuite.editor.isFrenoMode());
ok(activo, "la herramienta queda activa");

// 2) Clic sobre el trazado del cable del jalón, a media altura del último tramo.
const mira = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const cables = ed.listCables();
  const cable = cables[1];            // cable del jalón (pila → barra)
  const objs = [...ed.objects.values()];
  const p = (n) => {
    const o = ed.objects.get(n.objectId);
    o.mesh.updateMatrixWorld();
    return new T.Vector3(n.local.x, n.local.y, n.local.z).applyMatrix4(o.mesh.matrixWorld);
  };
  const nodos = cable.nodes.map(p);
  const q = nodos[4].clone().lerp(nodos[5], 0.45);   // último tramo: roldana alta → barra
  const rect = ed.sceneManager.renderer.domElement.getBoundingClientRect();
  const v = q.project(ed.sceneManager.camera);
  return { x: Math.round((v.x * 0.5 + 0.5) * rect.width), y: Math.round((-v.y * 0.5 + 0.5) * rect.height),
    cableId: cable.id, nodos: nodos.map((n) => n.toArray().map((z) => +z.toFixed(1))),
    piezas: cable.nodes.map((n) => objs.findIndex((o) => o.id === n.objectId)) };
});
console.log("cable del jalón:", JSON.stringify(mira.piezas), "punto", mira.x, mira.y);
await page.mouse.click(mira.x, mira.y);
await page.waitForTimeout(1200);
const puesto = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const c = ed.listCables()[1];
  return { topes: c.topes.length, t: c.topes[0] ?? null,
    esferas: ed.cableVisuals.children.filter((m) => m.userData.frenoDe).length };
});
console.log("freno:", JSON.stringify(puesto));
ok(puesto.topes === 1, "el clic engarza UN freno en el cable");
ok(puesto.esferas === 1, "aparece su esfera en el trazado");
ok(puesto.t && puesto.t.seg === 4, `queda en el segmento correcto (seg ${puesto.t?.seg})`);
await page.screenshot({ path: "v240-freno.png" });

// 3) Se guarda y se recupera con el proyecto.
const viaje = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const data = JSON.parse(JSON.stringify(ed.serialize()));
  return { guardado: data.cables[1].topes?.length ?? 0 };
});
ok(viaje.guardado === 1, "el freno viaja en el proyecto guardado");

// 4) El freno es un TOPE DURO: la esfera no pasa por su nodo. Con un freno a
// 116 cm sobre el ramal del carro (que mide 119,8), ese ramal no puede
// acortarse por debajo de los 116 aunque se empuje el brazo con fuerza.
const tope = async (dist) => page.evaluate(async (dist) => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const objs = [...ed.objects.values()];
  const c = ed.listCables()[0];              // cable del brazo: suelo → carro → … → brazo
  const p = (n) => {
    const o = ed.objects.get(n.objectId);
    o.mesh.updateMatrixWorld();
    return new T.Vector3(n.local.x, n.local.y, n.local.z).applyMatrix4(o.mesh.matrixWorld);
  };
  const largo = p(c.nodes[0]).distanceTo(p(c.nodes[1]));
  c.topes = dist === null ? [] : [{ seg: 0, dist, radio: 2.2 }];
  ed.cablesDirty = true;
  objs[20].stack.selected = 5; objs[20].rebuildStackVisual();
  const agarre = objs[39];
  ed.startSimulation();
  for (let i = 0; i < 120 && !ed.physics; i++) await new Promise((x) => setTimeout(x, 50));
  await new Promise((x) => setTimeout(x, 6000));
  const b = ed.physics.ejeDeGiro(agarre.id);
  const P = b.punto.clone(), E = b.eje.clone();
  const radio = agarre.mesh.position.clone().sub(P);
  ed.physics.grab(agarre.id, agarre.mesh.position.clone(), true);
  let minimo = Infinity;
  for (let k = 1; k <= 50; k++) {
    ed.physics.dragTo(radio.clone().applyAxisAngle(E, T.MathUtils.degToRad(-k)).add(P));
    await new Promise((x) => setTimeout(x, 120));
    minimo = Math.min(minimo, p(c.nodes[0]).distanceTo(p(c.nodes[1])));
  }
  ed.physics.release();
  const res = { dist, largo: +largo.toFixed(1), minimo: +minimo.toFixed(1) };
  ed.stopSimulation();
  await new Promise((x) => setTimeout(x, 1200));
  return res;
}, dist);
const libre = await tope(null);
const frenado = await tope(116);
console.log("ramal del carro sin freno:", JSON.stringify(libre));
console.log("ramal del carro con freno a 116 cm:", JSON.stringify(frenado));
ok(libre.minimo < 115.5, `sin freno el ramal se acorta libremente (${libre.minimo} de ${libre.largo} cm)`);
ok(frenado.minimo >= 115.5, `con freno no baja de donde topa la esfera (${frenado.minimo} cm)`);

// 5) Y en el extremo liviano: un freno bajo la roldana alta del jalón manda
// más recorrido a la pila al empujar el brazo.
const press = async (dist) => page.evaluate(async (dist) => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const objs = [...ed.objects.values()];
  ed.listCables()[0].topes = [];
  ed.listCables()[1].topes = dist === null ? [] : [{ seg: 4, dist, radio: 2.2 }];
  ed.cablesDirty = true;
  objs[20].stack.selected = 5; objs[20].rebuildStackVisual();
  const agarre = objs[39], pila = objs[20];
  ed.startSimulation();
  for (let i = 0; i < 120 && !ed.physics; i++) await new Promise((x) => setTimeout(x, 50));
  await new Promise((x) => setTimeout(x, 6000));
  const b = ed.physics.ejeDeGiro(agarre.id);
  const P = b.punto.clone(), E = b.eje.clone();
  const radio = agarre.mesh.position.clone().sub(P);
  const y0 = pila.mesh.position.y;
  ed.physics.grab(agarre.id, agarre.mesh.position.clone(), true);
  let pilaMax = 0;
  for (let k = 1; k <= 50; k++) {
    ed.physics.dragTo(radio.clone().applyAxisAngle(E, T.MathUtils.degToRad(-k)).add(P));
    await new Promise((x) => setTimeout(x, 120));
    pilaMax = Math.max(pilaMax, pila.mesh.position.y - y0);
  }
  ed.physics.release();
  const res = { dist, pila: +pilaMax.toFixed(1) };
  ed.stopSimulation();
  await new Promise((x) => setTimeout(x, 1200));
  return res;
}, dist);
const sinF = await press(null);
const conF = await press(1.5);
console.log("press sin freno:", JSON.stringify(sinF), " con freno:", JSON.stringify(conF));
ok(conF.pila > sinF.pila, `la pila recibe más recorrido (${sinF.pila} → ${conF.pila} cm)`);

console.log("ERRORES:", errores.length ? errores.join("\n") : "ninguno");
console.log(fallos.length ? "❌ " + fallos.join(" · ") : "✅ todo correcto");
await browser.close();
