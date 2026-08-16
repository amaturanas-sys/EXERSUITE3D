// UpperMachine: el prefab del usuario, tal cual lo exportó (0.2.31) y ya
// corregido, cargado en el motor actual.
//   A) ORIGINAL: debe evidenciar el fallo — el brazo compuesto queda anclado
//      porque una de sus piezas lo está, y el motor lo AVISA.
//   B) CORREGIDO: el brazo pivota como UN cuerpo y cada pieza conserva su
//      configuración individual (pinholes, ventanas, viga vs tubo, dims,
//      nodos del trazado) pese a estar soldada.
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
const AQUI = new URL(".", import.meta.url).pathname;   // vale desde cualquier cwd

const OUT = ".";
const ORIG = JSON.parse(
  readFileSync(AQUI + "fijos/uppermachine-del-disenador.prefab.json", "utf8"),
);
const FIX = JSON.parse(readFileSync(AQUI + "../docs/prefabs/uppermachine.prefab.json", "utf8"));

const browser = await chromium.launch({
  // El Chromium de Playwright ya instalado. Se puede apuntar a otro con
  // CHROMIUM=/ruta/al/chrome (ver LEEME.md).
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errores = [];
page.on("pageerror", (e) => errores.push("PAGEERROR: " + e.message));
const avisosConsola = [];
page.on("console", (m) => { if (m.type() === "warning") avisosConsola.push(m.text()); });
await page.goto("http://127.0.0.1:4174/");
await page.waitForTimeout(1000);
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);

const fallos = [];
const chequear = (ok, m) => { if (!ok) fallos.push(m); console.log((ok ? "✓ " : "✗ ") + m); };

const cargar = (archivo) =>
  page.evaluate((archivo) => {
    const ed = window.exersuite.editor;
    for (const j of ed.listJoints()) ed.removeJoint(j);
    for (const c of ed.listCables()) ed.removeCable(c);
    for (const o of [...ed.objects.values()]) ed.removeObject(o);
    const rep = window.exersuite.prefabIO.parsearPrefab(JSON.stringify(archivo));
    const previas = new Set(ed.objects.keys());
    // insertarPrefab devuelve las ADVERTENCIAS; las piezas nuevas se toman
    // del mapa de objetos, que conserva el orden de inserción del prefab.
    const fidelidad = ed.insertarPrefab(rep.archivo, new window.exersuite.THREE.Vector3(0, 0, 0));
    const ids = [...ed.objects.keys()].filter((k) => !previas.has(k));
    window.__ids = ids;
    return {
      piezas: ids.length,
      fidelidad,
      uniones: ed.listJoints().length,
      soldaduras: ed.listJoints().filter((j) => j.locked).length,
      cables: ed.listCables().length,
      avisos: rep.advertencias,
    };
  }, archivo);

const simular = (pasos) =>
  page.evaluate(async (pasos) => {
    const ed = window.exersuite.editor;
    const T = window.exersuite.THREE;
    const obj = (i) => ed.objects.get(window.__ids[i]);
    const pose = (i) => obj(i).mesh.position.clone();
    const antes = { p32: pose(32), p34: pose(34), p38: pose(38), p39: pose(39), p41: pose(41) };
    ed.startSimulation();
    for (let i = 0; i < 120 && !ed.physics; i++) await new Promise((r) => setTimeout(r, 50));
    await new Promise((r) => setTimeout(r, 200));
    const avisos = ed.physics.avisosDeArmado();
    for (let i = 0; i < pasos; i++) ed.physics.step(1 / 60);
    const despues = { p32: pose(32), p34: pose(34), p38: pose(38), p39: pose(39), p41: pose(41) };
    const dist = (a, b) => +a.distanceTo(b).toFixed(2);
    const pivote = new T.Vector3(0.042, 191.7527, 13.1569);
    const r = {
      avisos,
      mueve32: dist(antes.p32, despues.p32),
      mueve34: dist(antes.p34, despues.p34),
      // Rigidez del conjunto: las distancias INTERNAS no pueden cambiar.
      rig34_38: +(dist(antes.p34, antes.p38) - dist(despues.p34, despues.p38)).toFixed(2),
      rig34_39: +(dist(antes.p34, antes.p39) - dist(despues.p34, despues.p39)).toFixed(2),
      rig38_41: +(dist(antes.p38, antes.p41) - dist(despues.p38, despues.p41)).toFixed(2),
      // Radio al pivote: si el conjunto gira de verdad, se conserva.
      radio0: dist(antes.p34, pivote),
      radio1: dist(despues.p34, pivote),
      cuerpos: ed.physics.bodies.size,
      cablesInvalidos: ed.listCables().filter((c) => c.invalido).length,
      pilaSube: +(pose(20).y - antes.p32.y).toFixed(1),
    };
    ed.stopSimulation();
    return r;
  }, pasos);

// ───────────────────── A) El prefab ORIGINAL ─────────────────────────────
console.log("── A) prefab original (exportado con 0.2.31)");
const a0 = await cargar(ORIG);
console.log("  carga:", JSON.stringify(a0));
chequear(a0.piezas === 42, `entran las 42 piezas (${a0.piezas})`);
const aSim = await simular(180);
console.log("  simulación:", JSON.stringify(aSim));
chequear(
  aSim.avisos.length > 0 && /ANCLADO/.test(aSim.avisos.join(" ")),
  `el motor AVISA de la trampa: ${aSim.avisos[0] ?? "(ningún aviso)"}`,
);
chequear(aSim.mueve34 < 1, `el brazo quedaba inmóvil (se movió ${aSim.mueve34} cm)`);

// ───────────────────── B) El prefab CORREGIDO ────────────────────────────
console.log("\n── B) prefab corregido");
const b0 = await cargar(FIX);
console.log("  carga:", JSON.stringify(b0));
chequear(b0.piezas === 42, `entran las 42 piezas (${b0.piezas})`);
chequear(b0.uniones === 18, `las 18 uniones (11 originales + 6 soldaduras + guía del carro): ${b0.uniones}`);

// Afinado de los cables por la altura del carro (v0.2.36).
const afinado = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const O = (i) => ed.objects.get(window.__ids[i]);
  const guia = ed.listJoints().find((j) => j.kind === "prismatic");
  const piv = ed.listJoints().find((j) => j.kind === "revolute" && !j.locked);
  return {
    carroY: +O(15).mesh.position.y.toFixed(1),
    roldSup: +O(13).mesh.position.y.toFixed(1),
    roldInf: +O(14).mesh.position.y.toFixed(1),
    guia: guia ? [guia.axis, guia.min, guia.max, guia.limitsEnabled] : null,
    topeBrazo: piv ? [piv.min, piv.max, piv.limitsEnabled] : null,
  };
});
console.log("  afinado:", JSON.stringify(afinado));
chequear(Math.abs(afinado.carroY - 112) < 0.5, `el carro quedó a la altura afinada (${afinado.carroY} cm)`);
chequear(
  Math.abs(afinado.roldSup - afinado.carroY - 7) < 0.5 && Math.abs(afinado.carroY - afinado.roldInf - 6) < 0.5,
  "las dos roldanas del carro conservan su separación con el puente",
);
chequear(
  !!afinado.guia && afinado.guia[0] === "y" && afinado.guia[3] && afinado.guia[2] === 8,
  `el carro corre guiado en vertical con topes (${JSON.stringify(afinado.guia)})`,
);
chequear(
  !!afinado.topeBrazo && afinado.topeBrazo[2] && afinado.topeBrazo[0] === -90 && afinado.topeBrazo[1] === 0,
  `el brazo tiene su tope de reposo activo (${JSON.stringify(afinado.topeBrazo)})`,
);
chequear(b0.cables === 2, `los 2 cables se trazan completos (${b0.cables})`);

// La configuración INDIVIDUAL de cada pieza sobrevive a la soldadura.
const conf = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const obj = (i) => ed.objects.get(window.__ids[i]);
  const p = (i) => obj(i).params;
  const ls = (i) => obj(i).localSizeAbs();
  const tris = (i) => obj(i).mesh.geometry.attributes.position.count / 3;
  return {
    // Columna: pinholes Ø2.5 + la ventana calada de la roldana interna.
    col_kind: p(2).kind,
    col_pinhole: p(2).holeDiameter,
    col_paso: p(2).holeSpacing,
    col_ventanas: (p(2).ventanas ?? []).length,
    col_nodos: p(2).path.length,
    col_tris: tris(2),
    // Piezas del brazo: viga vs TUBO, radio y nodos propios.
    brazo32_kind: p(32).kind,
    brazo32_nodos: p(32).path.length,
    brazo32_espejo: p(32).espejo,
    arco34_kind: p(34).kind,
    arco34_nodos: p(34).path.length,
    mango38_kind: p(38).kind,
    mango38_radio: p(38).radius,
    mango38_nodos: p(38).path.length,
    mango39_espejo: p(39).espejo,
    grip40_kind: p(40).kind,
    grip40_radio: p(40).radius,
    // Dimensiones reales de un par de piezas.
    dim2: [+ls(2).x.toFixed(2), +ls(2).y.toFixed(2), +ls(2).z.toFixed(2)],
    dim38: [+ls(38).x.toFixed(2), +ls(38).y.toFixed(2), +ls(38).z.toFixed(2)],
    // Escalas: ninguna negativa tras la migración del volteo.
    escalasNegativas: window.__ids.filter((id) => {
      const s = ed.objects.get(id).mesh.scale;
      return s.x < 0 || s.y < 0 || s.z < 0;
    }).length,
  };
});
console.log("  configuración individual:", JSON.stringify(conf, null, 1).replace(/\n\s*/g, " "));
chequear(conf.col_kind === "beam" && conf.col_pinhole === 2.5 && conf.col_paso === 5,
  `la columna sigue siendo VIGA con pinholes Ø${conf.col_pinhole} cada ${conf.col_paso} cm`);
chequear(conf.col_ventanas === 1 && conf.col_tris > 100,
  `conserva la ventana calada de la roldana interna (${conf.col_ventanas}, ${conf.col_tris} triángulos)`);
chequear(conf.col_nodos === 8, `conserva sus 8 nodos de trazado (${conf.col_nodos})`);
chequear(conf.brazo32_kind === "beam" && conf.arco34_kind === "beam",
  "el brazo y su arco siguen siendo VIGAS");
chequear(conf.mango38_kind === "tube" && conf.mango38_radio === 1.5 && conf.grip40_kind === "tube" && conf.grip40_radio === 1.6,
  `los mangos siguen siendo TUBOS de su radio (${conf.mango38_radio} y ${conf.grip40_radio} cm)`);
chequear(conf.mango38_nodos === 8 && conf.arco34_nodos === 11 && conf.brazo32_nodos === 5,
  `cada pieza conserva sus nodos (${conf.brazo32_nodos}/${conf.arco34_nodos}/${conf.mango38_nodos})`);
// El mástil se conserva ÍNTEGRO: es el apoyo estructural del bastidor
// superior. El cruce con el cable alto lo resuelve la regla del tramo
// oculto, no un recorte de la pieza.
chequear(Math.abs(conf.dim2[1] - 209.31) < 1.5, `el mástil sigue entero (${conf.dim2[1]} cm)`);
chequear(Math.abs(conf.dim2[0] - 5.04) < 0.2 && Math.abs(conf.dim2[2] - 27.53) < 0.5,
  `la sección de la columna no cambia (${conf.dim2[0]}×${conf.dim2[2]} cm)`);
chequear(Math.abs(conf.dim38[1] - 44.56) < 0.5, `el resto de piezas conserva sus medidas (mango ${conf.dim38[1]} cm)`);
chequear(conf.escalasNegativas === 0, "ninguna pieza queda con escala negativa (volteos horneados)");
chequear(!!conf.brazo32_espejo && !!conf.mango39_espejo, "los volteos viajan como espejo en los params");

const bSim = await simular(180);
console.log("  simulación:", JSON.stringify(bSim));
chequear(bSim.avisos.length === 0, `sin avisos de armado (${bSim.avisos.join(" · ") || "ninguno"})`);
chequear(bSim.mueve34 > 2, `el brazo compuesto YA se mueve (${bSim.mueve34} cm)`);
chequear(
  Math.abs(bSim.rig34_38) < 1 && Math.abs(bSim.rig34_39) < 1 && Math.abs(bSim.rig38_41) < 1,
  `el conjunto se mueve RÍGIDO: las distancias internas no cambian (${bSim.rig34_38}/${bSim.rig34_39}/${bSim.rig38_41} cm)`,
);
chequear(
  Math.abs(bSim.radio1 - bSim.radio0) < 3,
  `gira alrededor de su pivote (radio ${bSim.radio0} → ${bSim.radio1} cm)`,
);
chequear(bSim.cablesInvalidos === 0, `los cables siguen siendo válidos (${bSim.cablesInvalidos} en error)`);
chequear(b0.fidelidad.length === 0, `ninguna pieza difiere de la biblioteca (${b0.fidelidad.join(" · ") || "0 avisos"})`);

// Validación de trazado en la pose de DISEÑO: ningún cable en rojo.
const val = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  ed.cablesDirty = true;
  ed.requestRender?.(6);
  await new Promise((r) => setTimeout(r, 600));
  return [...ed.cableVisuals.children].filter((l) => l.material.color.getHex() === 0xef4444).length;
});
chequear(val === 0, `ningún cable se marca en rojo en la pose de diseño (${val})`);

await page.evaluate(() => {
  const ed = window.exersuite.editor;
  ed.select(null);
  ed.orbit.enableDamping = false;
  ed.orbit.target.set(0, 105, 0);
  ed.sceneManager.camera.position.set(210, 165, 260);
  ed.orbit.update?.();
  ed.requestRender?.(6);
});
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/v234-uppermachine.png` });

console.log("\nerrores de página:", errores.length ? errores : "ninguno");
console.log(fallos.length ? `\n❌ ${fallos.length} fallo(s)` : "\n✅ todo correcto");
await browser.close();
process.exit(fallos.length || errores.length ? 1 : 0);
