// v0.2.25: rotar un GRUPO no rompe su funcionalidad — las uniones (ancla +
// eje) viajan con el conjunto. Tres escenarios: torre de pesos 90°Y con
// simulación, rack de sentadillas 45°Y (eje libre), grupo manual con bisagra.
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

// A) Torre polea de pesos ROTADA 90° en Y: la pila sigue guiada y el remo
//    la levanta — exactamente igual que sin rotar.
await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const antes = new Set([...ed.objects.keys()]);
  ed.insertarMaquina("torre-polea-pesos", new T.Vector3(0, 0, 0));
  window.__nuevos = [...ed.objects.values()].filter((o) => !antes.has(o.id)).map((o) => o.id);
  ed.requestRender?.();
});
// La validación de cables corre en el bucle de render BAJO DEMANDA: hay que
// darle varios frames antes de leer el resultado, o la cuenta sale a cero
// simplemente porque aún no se ha evaluado.
const esperarValidacion = async () => {
  for (let i = 0; i < 12; i++) {
    await page.evaluate(() => {
      const ed = window.exersuite.editor;
      ed.cablesDirty = true;
      ed.requestRender(4);
    });
    await page.waitForTimeout(220);
  }
};
await esperarValidacion();
// Línea base: la validación de diseño ya marca cables en la geometría
// verbatim SIN rotar (observación conocida) — la rotación no debe empeorarla.
const cablesBase = await page.evaluate(() => window.exersuite.editor.cablesInvalidos.size);
const A = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const nuevos = window.__nuevos.map((id) => ed.getObject(id));
  const pila = nuevos.find((o) => o.componentId === "pila-pesos");
  const remo = nuevos.find((o) => (o.name || "").includes("Remo de polea alta"));
  // El grupo quedó seleccionado al insertar: rotación numérica exacta.
  const j0 = ed.listJoints().map((j) => j.anchor.clone());
  ed.setTransformGrupo({ rotDeg: { y: 90 } });
  const j1 = ed.listJoints();
  // Cada ancla debe haber ROTADO (a menos que caiga sobre el eje de giro).
  const anclasMovidas = j1.filter((j, i) => j.anchor.distanceTo(j0[i]) > 0.5).length;
  window.__A = { pila: pila?.id, remo: remo?.id, q: pila.mesh.quaternion.toArray() };
  return {
    piezas: nuevos.length,
    uniones: j1.length,
    anclasMovidas,
    ejes: j1.map((j) => (j.axisVec ? "vec" : j.axis)),
  };
});
console.log("A-rotada:", JSON.stringify(A));
await esperarValidacion();
const Acables = await page.evaluate(() => window.exersuite.editor.cablesInvalidos.size);
console.log("A-cables (base sin rotar → rotada):", cablesBase, "→", Acables);

const Asim = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  ed.select(null);
  const pila = ed.getObject(window.__A.pila);
  const remo = ed.getObject(window.__A.remo);
  const qRot = new T.Quaternion(0, Math.SQRT1_2, 0, Math.SQRT1_2); // 90° Y
  await ed.toggleSimulation();
  for (let i = 0; i < 120; i++) ed.physics.step(1 / 60);
  const p0 = pila.mesh.position.clone();
  const r0 = remo.mesh.position.clone();
  ed.physics.grab(remo.id, r0.clone());
  for (let i = 0; i < 240; i++) {
    const d = new T.Vector3(0, -Math.min(i * 0.5, 60), 20 + Math.min(i * 0.4, 45)).applyQuaternion(qRot);
    ed.physics.dragTo(r0.clone().add(d));
    ed.physics.step(1 / 60);
  }
  const sube = pila.mesh.position.y - p0.y;
  const derivaXZ = Math.hypot(pila.mesh.position.x - p0.x, pila.mesh.position.z - p0.z);
  ed.toggleSimulation();
  return { asentadaY: +p0.y.toFixed(1), pilaSube: +sube.toFixed(1), derivaXZ: +derivaXZ.toFixed(1) };
});
console.log("A-sim:", JSON.stringify(Asim));
await page.evaluate(() => {
  const ed = window.exersuite.editor;
  ed.orbit.target.set(0, 100, 0);
  ed.sceneManager.camera.position.set(230, 160, 210);
  ed.orbit.update?.(); ed.requestRender?.();
});
await page.waitForTimeout(400);
await page.screenshot({ path: "v225-torre-rotada.png" });

// B) Rack de sentadillas rotado 45° en Y (eje NO cardinal → vector libre):
//    la máquina se mantiene ARMADA al simular (nada sale despedido).
const B = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  // Limpia la torre del escenario A (sin tocar el espacio de trabajo).
  for (const o of [...ed.objects.values()]) {
    if (!o.componentId.startsWith("ws-")) ed.removeObject(o);
  }
  const antes = new Set([...ed.objects.keys()]);
  ed.insertarMaquina("rack-sentadillas", new T.Vector3(0, 0, 0));
  const nuevos = [...ed.objects.values()].filter((o) => !antes.has(o.id));
  ed.setTransformGrupo({ rotDeg: { y: 45 } });
  const ejes = ed.listJoints().map((j) => (j.axisVec ? "vec" : j.axis));
  const pos0 = nuevos.map((o) => o.mesh.position.clone());
  ed.select(null);
  await ed.toggleSimulation();
  for (let i = 0; i < 240; i++) ed.physics.step(1 / 60);
  let maxDesp = 0;
  nuevos.forEach((o, i) => {
    maxDesp = Math.max(maxDesp, o.mesh.position.distanceTo(pos0[i]));
  });
  ed.toggleSimulation();
  return { piezas: nuevos.length, ejes, maxDesp: +maxDesp.toFixed(1) };
});
console.log("B-rack45:", JSON.stringify(B));

// C) Grupo MANUAL: dos cajas con bisagra en Z, giradas 90° en Y → la letra
//    del eje pasa a X y el ancla gira con el conjunto; a 30° queda vector
//    libre y se serializa/restaura.
const C = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  for (const o of [...ed.objects.values()]) {
    if (!o.componentId.startsWith("ws-")) ed.removeObject(o);
  }
  const a = ed.addComponent("prim-box", new T.Vector3(-20, 10, 0));
  const b = ed.addComponent("prim-box", new T.Vector3(20, 10, 0));
  const j = ed.connect(a.id, b.id, "revolute", new T.Vector3(0, 10, 0));
  j.axis = "z";
  const gid = ed.createGroupFromIds([a.id, b.id]);
  ed.setTransformGrupo({ rotDeg: { y: 90 } });
  const tras90 = { eje: j.axisVec ? "vec" : j.axis, ancla: j.anchor.toArray().map((v) => +v.toFixed(1)) };
  const posA = a.mesh.position.toArray().map((v) => +v.toFixed(1));
  ed.setTransformGrupo({ rotDeg: { y: 120 } }); // acumulado: +30° más
  const tras30 = {
    eje: j.axisVec ? "vec" : j.axis,
    vec: j.axisVec ? j.axisVec.toArray().map((v) => +v.toFixed(3)) : null,
  };
  // Round-trip de serialización del eje libre.
  const dato = ed.serialize().joints[0];
  return { gid: !!gid, tras90, posA, tras30, serial: { axis: dato.axis, axisVec: dato.axisVec } };
});
console.log("C-manual:", JSON.stringify(C));

const ok =
  A.piezas === 22 && A.uniones >= 3 && A.anclasMovidas >= 2 && Acables <= cablesBase &&
  Asim.asentadaY > 38 && Asim.asentadaY < 60 && Asim.pilaSube > 5 && Asim.derivaXZ < 6 &&
  B.maxDesp < 8 &&
  C.tras90.eje === "x" && Math.abs(C.tras90.ancla[1] - 10) < 0.5 &&
  C.tras30.eje === "vec" && C.serial.axisVec !== null;
console.log(JSON.stringify({ ok }));
console.log("ERRORES:", errores.length ? errores.join("\n") : "ninguno");
await browser.close();
