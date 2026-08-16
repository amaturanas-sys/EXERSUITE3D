// v0.2.32 — las cuatro correcciones reportadas:
//  1) BRAZO COMPUESTO: brazo pivotante + extensión SOLDADA. La simulación debe
//     reconocer el conjunto (un solo cuerpo) y NO expulsar el brazo del pivote.
//  2) Piezas redundantes fuera de la biblioteca (polea, bloque-poleas, leva),
//     con remapeo de los ids antiguos a "roldana".
//  3) VOLTEAR sin escala negativa: los ejes locales siguen concordando con el
//     mundo (determinante de la matriz > 0) y la malla queda espejada.
//  4) BISAGRA REAL: dos placas + pasador, tres soldaduras y UNA articulación.
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

const fallos = [];
const chequear = (ok, msg) => { if (!ok) fallos.push(msg); console.log((ok ? "✓ " : "✗ ") + msg); };

// ───────────────────────── 2) Biblioteca curada ──────────────────────────
const bib = await page.evaluate(async () => {
  const lib = await import("/src/objects/componentLibrary.ts").catch(() => null);
  const ed = window.exersuite.editor;
  // La paleta no debe ofrecer las piezas retiradas.
  const etiquetas = [...document.querySelectorAll("#palette .comp-btn")].map((b) =>
    (b.textContent ?? "").trim(),
  );
  // Un proyecto antiguo con id "polea" tiene que seguir cargando (remapeo).
  const legado = ed.addComponent("polea");
  return {
    etiquetas,
    legadoCreado: !!legado,
    legadoComponente: legado?.componentId,
    tieneLib: !!lib,
  };
});
chequear(!bib.etiquetas.includes("Polea"), "la paleta ya no ofrece 'Polea'");
chequear(!bib.etiquetas.includes("Bloque de poleas"), "la paleta ya no ofrece 'Bloque de poleas'");
chequear(!bib.etiquetas.includes("Leva"), "la paleta ya no ofrece 'Leva'");
chequear(bib.etiquetas.includes("Roldana"), "la Roldana sigue en la paleta");
chequear(bib.legadoCreado, "un id antiguo ('polea') sigue cargando (remapeado a roldana)");
console.log("  legado →", bib.legadoComponente);

await page.evaluate(() => {
  const ed = window.exersuite.editor;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
});

// ───────────────────── 3) Voltear sin escala negativa ────────────────────
const flip = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const obj = ed.addComponent("prim-box");
  obj.params = { kind: "box", width: 40, height: 10, depth: 10, height2: 2 }; // asimétrica en X
  obj.rebuildGeometry();
  obj.mesh.position.set(0, 50, 0);
  ed.select(obj);
  const alturaEn = (x) => {
    // Altura de la malla cerca de un extremo (la cuña distingue +X de −X).
    const p = obj.mesh.geometry.attributes.position;
    let max = -1e9;
    for (let i = 0; i < p.count; i++) {
      if (Math.abs(p.getX(i) - x) < 3) max = Math.max(max, p.getY(i));
    }
    return +max.toFixed(2);
  };
  const antes = { menos: alturaEn(-20), mas: alturaEn(20) };
  ed.flipSelected("x");
  const despues = { menos: alturaEn(-20), mas: alturaEn(20) };
  const s = obj.mesh.scale;
  obj.mesh.updateMatrixWorld(true);
  const det = new T.Matrix4().extractRotation(obj.mesh.matrixWorld).determinant();
  // Eje local +X del objeto proyectado al mundo: debe seguir siendo +X global.
  const ejeX = new T.Vector3(1, 0, 0).applyQuaternion(obj.mesh.quaternion);
  window.__flipObj = obj.id;
  return {
    antes, despues,
    escala: [s.x, s.y, s.z],
    det: +det.toFixed(3),
    ejeX: ejeX.toArray().map((v) => +v.toFixed(3)),
    espejo: obj.params.espejo,
  };
});
console.log("  flip:", JSON.stringify(flip));
chequear(flip.escala.every((v) => v > 0), "voltear NO deja escala negativa");
chequear(flip.det > 0, "la matriz del objeto conserva la orientación (det > 0 ⇒ gizmo concordante)");
chequear(Math.abs(flip.ejeX[0] - 1) < 1e-3, "el eje local +X sigue apuntando a +X del mundo");
chequear(
  Math.abs(flip.antes.menos - flip.despues.mas) < 0.5 &&
    Math.abs(flip.antes.mas - flip.despues.menos) < 0.5,
  "la geometría quedó realmente espejada (la cuña cambió de extremo)",
);

// La escala negativa de un proyecto ANTIGUO se migra al abrirlo.
const migra = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const obj = ed.objects.get(window.__flipObj);
  obj.mesh.scale.set(-1, 1, 1);
  ed.normalizarEspejo(obj);
  return { escala: obj.mesh.scale.toArray(), espejo: obj.params.espejo ?? null };
});
console.log("  migración:", JSON.stringify(migra));
chequear(migra.escala.every((v) => v > 0), "una escala negativa heredada se migra a espejo horneado");

// ───────────── 1) Brazo COMPUESTO (pivote + extensión soldada) ───────────
const armado = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);

  // Poste fijo.
  const poste = ed.addComponent("prim-box");
  poste.params = { kind: "box", width: 10, height: 200, depth: 10 };
  poste.rebuildGeometry();
  poste.mesh.position.set(0, 100, 0);
  poste.physics = { massKg: 0, fixed: true };
  poste.name = "Poste";

  // Brazo que pivota en lo alto del poste (jammer arm).
  const brazo = ed.addComponent("prim-box");
  brazo.params = { kind: "box", width: 80, height: 6, depth: 6 };
  brazo.rebuildGeometry();
  brazo.mesh.position.set(45, 180, 0);
  brazo.physics = { massKg: 8, fixed: false };
  brazo.name = "Brazo";

  // EXTENSIÓN soldada al brazo, declarada MÓVIL pero sin masa (el caso que
  // rompía la simulación: quedaba estática en el aire y expulsaba el brazo).
  const ext = ed.addComponent("prim-box");
  ext.params = { kind: "box", width: 6, height: 40, depth: 6 };
  ext.rebuildGeometry();
  ext.mesh.position.set(82, 160, 0);
  ext.physics = { massKg: 0, fixed: false };
  ext.name = "Extensión";

  const pivote = new window.exersuite.THREE.Vector3(5, 180, 0);
  const jp = ed.connect(poste.id, brazo.id, "revolute", pivote);
  jp.axis = "z";
  const js = ed.connect(brazo.id, ext.id, "revolute", new window.exersuite.THREE.Vector3(82, 177, 0));
  js.locked = true;
  ed.jointUpdated();
  window.__ids = { poste: poste.id, brazo: brazo.id, ext: ext.id };
  return {
    brazo: brazo.mesh.position.toArray().map((v) => +v.toFixed(1)),
    ext: ext.mesh.position.toArray().map((v) => +v.toFixed(1)),
    dist: +brazo.mesh.position.distanceTo(ext.mesh.position).toFixed(2),
  };
});
console.log("  armado:", JSON.stringify(armado));

const sim = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  ed.startSimulation();
  for (let i = 0; i < 100 && !ed.physics; i++) await new Promise((r) => setTimeout(r, 50));
  await new Promise((r) => setTimeout(r, 200));
  for (let i = 0; i < 180; i++) ed.physics.step(1 / 60);
  const brazo = ed.objects.get(window.__ids.brazo);
  const ext = ed.objects.get(window.__ids.ext);
  const pivote = new window.exersuite.THREE.Vector3(5, 180, 0);
  const r = {
    brazo: brazo.mesh.position.toArray().map((v) => +v.toFixed(1)),
    ext: ext.mesh.position.toArray().map((v) => +v.toFixed(1)),
    dist: +brazo.mesh.position.distanceTo(ext.mesh.position).toFixed(2),
    radioPivote: +brazo.mesh.position.distanceTo(pivote).toFixed(2),
    cuerpos: ed.physics.bodies.size,
  };
  ed.stopSimulation();
  return r;
});
console.log("  simulación:", JSON.stringify(sim));
chequear(
  Math.abs(sim.dist - armado.dist) < 1.5,
  `la extensión SOLDADA viaja con el brazo (distancia ${armado.dist} → ${sim.dist})`,
);
chequear(
  Math.abs(sim.radioPivote - 40) < 6,
  `el brazo sigue colgado de su pivote (radio ${sim.radioPivote} ≈ 40)`,
);
chequear(sim.brazo[1] < 178, "el brazo cayó girando alrededor del pivote (no quedó rígido)");

// ─────────────────────── 4) Bisagra REAL montada ─────────────────────────
const bis = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  for (const j of ed.listJoints()) ed.removeJoint(j);

  const base = ed.addComponent("prim-box");
  base.params = { kind: "box", width: 60, height: 8, depth: 30 };
  base.rebuildGeometry();
  base.mesh.position.set(-30, 100, 0);
  base.physics = { massKg: 0, fixed: true };
  base.name = "Base";

  const tapa = ed.addComponent("prim-box");
  tapa.params = { kind: "box", width: 60, height: 8, depth: 30 };
  tapa.rebuildGeometry();
  tapa.mesh.position.set(31, 100, 0);
  tapa.physics = { massKg: 6, fixed: false };
  tapa.name = "Tapa";

  // Cara INFERIOR: es la que deja libre el plegado hacia abajo (v0.2.33);
  // montada arriba, las dos piezas topan entre sí y no gira.
  const j = ed.instalarBisagra(base, tapa, { eje: "z", tamano: 8, cara: "abajo" });
  const piezas = [...ed.objects.values()].map((o) => o.componentId);
  const juntas = ed.listJoints();
  window.__bis = { tapa: tapa.id, base: base.id };
  return {
    placas: piezas.filter((c) => c === "placa-bisagra").length,
    pasadores: piezas.filter((c) => c === "pasador-bisagra").length,
    soldaduras: juntas.filter((x) => x.locked).length,
    libres: juntas.filter((x) => !x.locked).length,
    eje: j?.axis,
    ancla: j?.anchor.toArray().map((v) => +v.toFixed(1)),
    grupos: ed.groups.size,
    tapaY: +tapa.mesh.position.y.toFixed(1),
  };
});
console.log("  bisagra:", JSON.stringify(bis));
chequear(bis.placas === 2, "se montaron DOS placas planas");
chequear(bis.pasadores === 1, "se montó UN pasador cilíndrico de articulación");
chequear(bis.soldaduras === 3, "tres soldaduras: placa↔pieza (×2) y pasador↔placa");
chequear(bis.libres === 1, "una sola articulación libre: la del pasador");
chequear(bis.eje === "z", "el eje pedido (Z) es el eje de la bisagra");
chequear(bis.grupos >= 1, "el herraje quedó agrupado como una bisagra");

const simBis = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  ed.startSimulation();
  for (let i = 0; i < 100 && !ed.physics; i++) await new Promise((r) => setTimeout(r, 50));
  await new Promise((r) => setTimeout(r, 200));
  const tapa = ed.objects.get(window.__bis.tapa);
  const y0 = tapa.mesh.position.y;
  for (let i = 0; i < 150; i++) ed.physics.step(1 / 60);
  const p = tapa.mesh.position.clone();
  const eje = new window.exersuite.THREE.Vector3(1.4, 100, 0); // pivote aprox.
  const r = {
    y0: +y0.toFixed(1),
    fin: p.toArray().map((v) => +v.toFixed(1)),
    radio: +p.distanceTo(eje).toFixed(1),
    z: +Math.abs(p.z).toFixed(2),
  };
  ed.stopSimulation();
  return r;
});
console.log("  simulación bisagra:", JSON.stringify(simBis));
chequear(simBis.fin[1] < simBis.y0 - 2, "la tapa gira hacia abajo sobre la bisagra");
chequear(simBis.radio > 20 && simBis.radio < 45, `la tapa queda colgada del pasador (radio ${simBis.radio})`);
chequear(simBis.z < 3, "el giro ocurre en el plano del eje Z (no se desvía de lado)");

await page.screenshot({ path: "v232-bisagra.png" });

console.log("\nerrores de página:", errores.length ? errores : "ninguno");
console.log(fallos.length ? `\n❌ ${fallos.length} fallo(s)` : "\n✅ todo correcto");
await browser.close();
process.exit(fallos.length || errores.length ? 1 : 0);
