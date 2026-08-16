// v0.2.33 — la bisagra debe ser CONCORDANTE con las físicas del mundo:
//  · montada en la cara SUPERIOR, las dos vigas topan entre sí y el plegado
//    hacia abajo queda impedido por el material (antes se atravesaban);
//  · montada en la cara INFERIOR, el mismo conjunto SÍ flexiona hacia abajo;
//  · el herraje no se agarrota: el pasador no roza la pala contraria.
import { chromium } from "playwright-core";
const OUT = ".";
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

const fallos = [];
const chequear = (ok, m) => { if (!ok) fallos.push(m); console.log((ok ? "✓ " : "✗ ") + m); };

// Escenario: viga anclada + viga móvil enfrentadas en el mismo plano, como en
// la captura del usuario. La bisagra se monta en la cara indicada.
const montar = async (cara) =>
  page.evaluate((cara) => {
    const ed = window.exersuite.editor;
    for (const j of ed.listJoints()) ed.removeJoint(j);
    for (const o of [...ed.objects.values()]) ed.removeObject(o);
    const viga = (x, masa, nombre) => {
      const o = ed.addComponent("prim-box");
      o.params = { kind: "box", width: 60, height: 10, depth: 24 };
      o.rebuildGeometry();
      o.mesh.position.set(x, 100, 0);
      o.physics = { massKg: masa, fixed: masa === 0 };
      o.name = nombre;
      ed.bus.emit("objectTransformed", { object: o });
      return o;
    };
    const A = viga(-31, 0, "Viga fija");
    const B = viga(31, 12, "Viga móvil");
    const j = ed.instalarBisagra(A, B, { eje: "z", tamano: 9, cara });
    const placas = [...ed.objects.values()].filter((o) => o.componentId === "placa-bisagra");
    const pasador = [...ed.objects.values()].find((o) => o.componentId === "pasador-bisagra");
    // Holgura entre el pasador (soldado a la pala A) y la pala contraria.
    const rPas = pasador.localSizeAbs().x / 2;
    const dPala = Math.min(...placas.map((p) => p.mesh.position.distanceTo(pasador.mesh.position)));
    const semiPala = placas[0].localSizeAbs().x / 2;
    window.__ids = { A: A.id, B: B.id };
    return {
      contactos: !!j?.contactos,
      alturaHerraje: +(pasador.mesh.position.y - 100).toFixed(2),
      holgura: +(dPala - semiPala - rPas).toFixed(2),
      yB: +B.mesh.position.y.toFixed(2),
    };
  }, cara);

const simular = async (pasos = 240) =>
  page.evaluate(async (pasos) => {
    const ed = window.exersuite.editor;
    const B = ed.objects.get(window.__ids.B);
    const A = ed.objects.get(window.__ids.A);
    ed.startSimulation();
    for (let i = 0; i < 100 && !ed.physics; i++) await new Promise((r) => setTimeout(r, 50));
    await new Promise((r) => setTimeout(r, 200));
    for (let i = 0; i < pasos; i++) ed.physics.step(1 / 60);
    const e = new window.exersuite.THREE.Euler().setFromQuaternion(B.mesh.quaternion, "ZYX");
    // Penetración real entre las dos vigas al final (cajas orientadas).
    const separadas = ed.piezasSeparadas(A, B, 0.8);
    const r = {
      giro: +((e.z * 180) / Math.PI).toFixed(1),
      pos: B.mesh.position.toArray().map((v) => +v.toFixed(1)),
      separadas,
    };
    ed.stopSimulation();
    return r;
  }, pasos);

// ── A) Bisagra ARRIBA: el material impide el plegado ─────────────────────
const arriba = await montar("arriba");
console.log("  montaje arriba:", JSON.stringify(arriba));
chequear(arriba.contactos, "la bisagra pide contactos reales entre las dos vigas");
chequear(arriba.alturaHerraje > 4.9, `el herraje va sobre la cara superior (+${arriba.alturaHerraje} cm)`);
chequear(arriba.holgura > 0, `el pasador no roza la pala contraria (holgura ${arriba.holgura} cm)`);
const simA = await simular();
console.log("  simulación arriba:", JSON.stringify(simA));
chequear(Math.abs(simA.giro) < 12, `montada arriba NO pliega: topa contra el material (${simA.giro}°)`);
chequear(simA.separadas, "las dos vigas no se atraviesan");
await page.screenshot({ path: `${OUT}/v233-arriba-topa.png` });

// ── B) Bisagra ABAJO: el mismo conjunto sí flexiona ──────────────────────
const abajo = await montar("abajo");
console.log("  montaje abajo:", JSON.stringify(abajo));
chequear(abajo.alturaHerraje < -4.9, `el herraje va bajo la cara inferior (${abajo.alturaHerraje} cm)`);
const simB = await simular();
console.log("  simulación abajo:", JSON.stringify(simB));
chequear(Math.abs(simB.giro) > 25, `montada abajo SÍ flexiona hacia abajo (${simB.giro}°)`);
chequear(simB.separadas, "tampoco al plegar se atraviesan las vigas");
await page.screenshot({ path: `${OUT}/v233-abajo-flexiona.png` });

// ── B2) Vigas GIRADAS: el herraje se apoya en la cara real, no flotando ──
const giradas = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  for (const j of ed.listJoints()) ed.removeJoint(j);
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  const ang = (30 * Math.PI) / 180;
  const viga = (x, masa) => {
    const o = ed.addComponent("prim-box");
    o.params = { kind: "box", width: 60, height: 10, depth: 24 };
    o.rebuildGeometry();
    o.mesh.position.set(x, 100, 0);
    o.mesh.rotation.set(0, 0, ang);
    o.physics = { massKg: masa, fixed: masa === 0 };
    ed.bus.emit("objectTransformed", { object: o });
    return o;
  };
  const A = viga(-31 * Math.cos(ang), 0);
  const B = viga(31 * Math.cos(ang), 12);
  A.mesh.position.y = 100 - 31 * Math.sin(ang);
  B.mesh.position.y = 100 + 31 * Math.sin(ang);
  A.mesh.updateMatrixWorld(true);
  B.mesh.updateMatrixWorld(true);
  ed.instalarBisagra(A, B, { eje: "z", tamano: 9, cara: "auto" });
  const pasador = [...ed.objects.values()].find((o) => o.componentId === "pasador-bisagra");
  // Altura del pasador sobre el plano medio de la viga A, medida en el eje
  // local +Y de la viga (su cara superior real, no la envolvente del mundo).
  const arribaLocal = new T.Vector3(0, 1, 0).applyQuaternion(A.mesh.quaternion);
  const alto = pasador.mesh.position.clone().sub(A.mesh.position).dot(arribaLocal);
  return { alto: +alto.toFixed(2), semiViga: 5 };
});
console.log("  vigas giradas:", JSON.stringify(giradas));
chequear(
  Math.abs(giradas.alto - 5.55) < 0.8,
  `con las vigas giradas el herraje apoya en la cara real (${giradas.alto} cm sobre el plano medio, esperado ≈5.55)`,
);

// ── C) Un pivote clásico NO debe verse afectado ──────────────────────────
const pivote = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  for (const j of ed.listJoints()) ed.removeJoint(j);
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  const poste = ed.addComponent("prim-box");
  poste.params = { kind: "box", width: 12, height: 200, depth: 12 };
  poste.rebuildGeometry();
  poste.mesh.position.set(0, 100, 0);
  poste.physics = { massKg: 0, fixed: true };
  // Brazo que ABRAZA el poste (se solapa a propósito, como un jammer arm).
  const brazo = ed.addComponent("prim-box");
  brazo.params = { kind: "box", width: 80, height: 8, depth: 8 };
  brazo.rebuildGeometry();
  brazo.mesh.position.set(38, 180, 0);
  brazo.physics = { massKg: 10, fixed: false };
  const j = ed.connect(poste.id, brazo.id, "revolute", new window.exersuite.THREE.Vector3(0, 180, 0));
  j.axis = "z";
  j.limitsEnabled = false;
  ed.jointUpdated();
  ed.startSimulation();
  await new Promise((r) => setTimeout(r, 400));
  for (let i = 0; i < 180; i++) ed.physics.step(1 / 60);
  const p = brazo.mesh.position.clone();
  const r = {
    contactos: j.contactos,
    radio: +p.distanceTo(new window.exersuite.THREE.Vector3(0, 180, 0)).toFixed(1),
    y: +p.y.toFixed(1),
  };
  ed.stopSimulation();
  return r;
});
console.log("  pivote clásico:", JSON.stringify(pivote));
chequear(!pivote.contactos, "un pivote normal sigue SIN contactos (las piezas se solapan a propósito)");
chequear(Math.abs(pivote.radio - 38) < 5, `el brazo sigue colgado de su pivote (radio ${pivote.radio})`);

console.log("\nerrores de página:", errores.length ? errores : "ninguno");
console.log(fallos.length ? `\n❌ ${fallos.length} fallo(s)` : "\n✅ todo correcto");
await browser.close();
process.exit(fallos.length || errores.length ? 1 : 0);
