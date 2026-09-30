// v0.2.40 · HERRAMIENTA DE FRENO DE CABLE: se engarza una esfera de tope en
// un punto del cable con el puntero; la esfera viaja con el cable pero no
// pasa por la roldana, así que ese lado deja de retraerse y la tensión se
// transmite al otro (deja de fugarse por el extremo liviano).
import { chromium } from "playwright-core";
import { prepararPasos } from "./arnes.mjs";
const browser = await chromium.launch({
  // El Chromium de Playwright ya instalado. Se puede apuntar a otro con
  // CHROMIUM=/ruta/al/chrome (ver LEEME.md).
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1180, height: 860 } });
// Por pasos, no por reloj: ver pruebas/arnes.mjs (v0.4.10).
const pausa = await prepararPasos(page);
const errores = [];
page.on("pageerror", (e) => errores.push(e.message));
await page.goto("http://127.0.0.1:4174/");
await pausa(1000);
await page.click("text=📁 PROYECTOS"); await pausa(300);
await page.click(".land-actions button:has-text('NUEVO')"); await pausa(300);
await page.click(".wizard-carta:has-text('Profesional')"); await pausa(300);
await page.click(".wizard-carta:has-text('Canvas libre')");
// SE ESPERA A QUE LA APP ESTE LISTA, NO AL RELOJ (v0.3.81): la capa de carga
// se va cuando las mallas estan. Adivinarlo con un timeout fijo es lo que
// hacia parpadear a estas pruebas.
await page.waitForFunction(() => !document.querySelector(".cargando-capa"), null, { timeout: 45000 });
await pausa(2500);
await page.evaluate(() => {
  [...document.querySelectorAll("#palette .comp-btn")]
    .find((b) => (b.textContent ?? "").trim().endsWith("UpperMachine")).click();
});
await pausa(1800);
const fallos = [];
const ok = (c, m) => { if (!c) fallos.push(m); console.log((c ? "✓ " : "✗ ") + m); };

// 1) El botón existe y activa la herramienta.
const hayBoton = await page.evaluate(() =>
  !!([...document.querySelectorAll("#joints button")].find((b) => b.textContent.includes("Freno"))));
ok(hayBoton, "el panel Conexiones ofrece la herramienta ⏺ Freno");
await page.evaluate(() => {
  [...document.querySelectorAll("#joints button")].find((b) => b.textContent.includes("Freno")).click();
});
await pausa(300);
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
await pausa(1200);
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
// 118 cm sobre el ramal del carro (que mide 119,8), ese ramal no puede
// acortarse por debajo de los 118 aunque se empuje el brazo con fuerza.
//
// POR QUÉ 118 Y NO 116 (v0.4.13). El brazo de press de la UpperMachine topa con
// el bastidor superior hacia los 33° —la punta alta de su segmento superior
// sube hasta él—, y en ese arco el ramal libre sólo baja hasta 116,3. Un freno
// a 116 no llegaba a tocarse nunca. Hasta v0.4.8 el brazo atravesaba el
// bastidor en un paso de física grande y el ramal bajaba a 112,7; con el motor
// por sub-pasos ya no, y la prueba se ajusta al arco real de la máquina.
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
  await ed.startSimulation();
  for (let i = 0; i < 120 && !ed.physics; i++) await window.__pausa(50);
  await window.__pausa(6000);
  const b = ed.physics.ejeDeGiro(agarre.id);
  const P = b.punto.clone(), E = b.eje.clone();
  const radio = agarre.mesh.position.clone().sub(P);
  ed.physics.grab(agarre.id, agarre.mesh.position.clone(), true);
  let minimo = Infinity;
  for (let k = 1; k <= 50; k++) {
    ed.physics.dragTo(radio.clone().applyAxisAngle(E, T.MathUtils.degToRad(-k)).add(P));
    await window.__pausa(120);
    minimo = Math.min(minimo, p(c.nodes[0]).distanceTo(p(c.nodes[1])));
  }
  ed.physics.release();
  const res = { dist, largo: +largo.toFixed(1), minimo: +minimo.toFixed(1) };
  ed.stopSimulation();
  await window.__pausa(1200);
  return res;
}, dist);
const libre = await tope(null);
const frenado = await tope(118);
console.log("ramal del carro sin freno:", JSON.stringify(libre));
console.log("ramal del carro con freno a 118 cm:", JSON.stringify(frenado));
ok(libre.minimo < 118, `sin freno el ramal se acorta libremente (${libre.minimo} de ${libre.largo} cm)`);
ok(frenado.minimo >= 118, `con freno no baja de donde topa la esfera (${frenado.minimo} cm)`);

// 5) Y en el extremo liviano: un freno bajo la roldana alta del jalón no le
// quita recorrido a la pila al empujar el brazo.
//
// Hasta v0.4.12 esto afirmaba que le DABA más (13,7 contra 13,1 cm, y ya
// entonces intermitente): era la ganancia del brazo atravesando el bastidor
// hasta los 50°. En su arco real de 33° el tramo del jalón bajo la roldana
// sólo se acorta 0,6 cm con freno o sin él —medido con el freno a 0,1, 0,5, 1
// y 1,5 cm—, y la pila sube lo mismo, 7 cm. Lo que queda por comprobar es que
// el freno no estorba.
const press = async (dist) => page.evaluate(async (dist) => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const objs = [...ed.objects.values()];
  ed.listCables()[0].topes = [];
  ed.listCables()[1].topes = dist === null ? [] : [{ seg: 4, dist, radio: 2.2 }];
  ed.cablesDirty = true;
  objs[20].stack.selected = 5; objs[20].rebuildStackVisual();
  const agarre = objs[39], pila = objs[20];
  await ed.startSimulation();
  for (let i = 0; i < 120 && !ed.physics; i++) await window.__pausa(50);
  await window.__pausa(6000);
  const b = ed.physics.ejeDeGiro(agarre.id);
  const P = b.punto.clone(), E = b.eje.clone();
  const radio = agarre.mesh.position.clone().sub(P);
  const y0 = pila.mesh.position.y;
  ed.physics.grab(agarre.id, agarre.mesh.position.clone(), true);
  let pilaMax = 0;
  for (let k = 1; k <= 50; k++) {
    ed.physics.dragTo(radio.clone().applyAxisAngle(E, T.MathUtils.degToRad(-k)).add(P));
    await window.__pausa(120);
    pilaMax = Math.max(pilaMax, pila.mesh.position.y - y0);
  }
  ed.physics.release();
  const res = { dist, pila: +pilaMax.toFixed(1) };
  ed.stopSimulation();
  await window.__pausa(1200);
  return res;
}, dist);
const sinF = await press(null);
const conF = await press(1.5);
console.log("press sin freno:", JSON.stringify(sinF), " con freno:", JSON.stringify(conF));
ok(sinF.pila > 5 && conF.pila >= sinF.pila - 0.2, `la pila no pierde recorrido con el freno (${sinF.pila} → ${conF.pila} cm)`);

console.log("ERRORES:", errores.length ? errores.join("\n") : "ninguno");
console.log(fallos.length ? "❌ " + fallos.join(" · ") : "✅ todo correcto");
await browser.close();
process.exit(fallos.length ? 1 : 0);
