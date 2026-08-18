// v0.2.49 · MOVIMIENTO POR ZONAS (empuje / tracción) y POSTURA DE PARTIDA.
//
// 1) Los cuatro movimientos clásicos salen de DOS botones y una postura:
//    empuje horizontal y vertical, tracción horizontal y vertical.
// 2) La primitiva coordina direcciones OPUESTAS: empujar extiende el codo
//    MIENTRAS flexiona el hombro (lo que el modelo por articulación no podía).
// 3) Aislamiento: simétrico, asimétrico, sectorizado y simultáneo.
// 4) El tobillo acomoda para que la planta siga mirando adonde miraba.
// 5) Parar la simulación devuelve la figura a su postura de partida.
// 6) Guardar y cargar posturas no mueve al maniquí de su apoyo.
import { chromium } from "playwright-core";
import { AYUDANTES } from "./ayudantes-maniqui.mjs";
const browser = await chromium.launch({
  // El Chromium de Playwright ya instalado. Se puede apuntar a otro con
  // CHROMIUM=/ruta/al/chrome (ver LEEME.md).
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errores = [];
page.on("pageerror", (e) => errores.push(e.message));
await page.goto("http://127.0.0.1:4174/");
await page.waitForTimeout(1000);
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);

const fallos = [];
const ok = (c, m) => { if (!c) fallos.push(m); console.log((c ? "✓ " : "✗ ") + m); };

await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  await ed.addHumanFigure();
  await new Promise((x) => setTimeout(x, 600));
  window.__g = (n) => {
    const j = ed.humanFigure.userData.joints[n];
    return j ? +(j.rotation.x * 180 / Math.PI).toFixed(1) : null;
  };
  // Posición del puño en coordenadas del propio cuerpo (adelante = +Z, arriba = +Y).
  window.__puno = (lado) => {
    const T = window.exersuite.THREE, ed = window.exersuite.editor;
    const fig = ed.humanFigure;
    fig.updateMatrixWorld(true);
    let mano = null;
    fig.traverse((n) => { if (n.userData?.segmentId === `mano-${lado}`) mano = n; });
    const hombro = ed.humanFigure.userData.joints[`shoulder${lado}`];
    const p = new T.Vector3().setFromMatrixPosition(mano.matrixWorld);
    const h = new T.Vector3().setFromMatrixPosition(hombro.matrixWorld);
    const local = fig.worldToLocal(p.clone()).sub(fig.worldToLocal(h.clone()));
    return { adelante: +local.z.toFixed(1), arriba: +local.y.toFixed(1) };
  };
});

// ---------------------------------------------------------- 1) EL PRESS
const press = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  ed.applyPose("Empuje horizontal");
  ed.activarZona("inferior", null); ed.activarZona("bisagra", null);
  ed.activarZona("superior", "sim");
  const t = [{ fase: "partida", shoulder: __g("shoulderL"), elbow: __g("elbowL"), puno: __puno("L") }];
  for (let k = 0; k < 24; k++) ed.moverPrimitiva(1, 5);      // tecla 8 = EMPUJE
  t.push({ fase: "empuje", shoulder: __g("shoulderL"), elbow: __g("elbowL"), puno: __puno("L") });
  for (let k = 0; k < 24; k++) ed.moverPrimitiva(-1, 5);     // tecla 9 = TRACCIÓN
  t.push({ fase: "tracción", shoulder: __g("shoulderL"), elbow: __g("elbowL"), puno: __puno("L") });
  return t;
});
console.log("\n1) EMPUJE HORIZONTAL desde la postura \"Empuje horizontal\":");
for (const f of press) console.log(`   ${f.fase.padEnd(9)} hombro ${String(f.shoulder).padStart(6)}°  codo ${String(f.elbow).padStart(6)}°  puño: ${f.puno.adelante} cm adelante, ${f.puno.arriba} cm sobre el hombro`);
const [p0, pE, pT] = press;
ok(pE.elbow > p0.elbow && pE.shoulder < p0.shoulder,
  `el EMPUJE extiende el codo (${p0.elbow}°→${pE.elbow}°) MIENTRAS flexiona el hombro (${p0.shoulder}°→${pE.shoulder}°): direcciones opuestas coordinadas`);
ok(pE.elbow > -20, `el codo llega a extensión útil (${pE.elbow}°, tope anatómico +15°)`);
const recorrido = Math.hypot(pE.puno.adelante - p0.puno.adelante, pE.puno.arriba - p0.puno.arriba);
ok(pE.puno.adelante > p0.puno.adelante + 15,
  `el puño SE ALEJA del cuerpo hacia delante (${p0.puno.adelante} → ${pE.puno.adelante} cm; ${recorrido.toFixed(1)} cm de recorrido)`);
ok(Math.abs(pE.puno.arriba) < Math.abs(pE.puno.adelante),
  `y lo hace en HORIZONTAL (${pE.puno.adelante} cm adelante frente a ${pE.puno.arriba} cm de altura)`);
// Lo que define el remo no son 20 cm de recorrido —eso depende de lo largo que
// sea el brazo del cuerpo, y el escaneado tiene el húmero más corto que el rig
// de cilindros (24,2 contra 28,0)— sino que la tracción DEVUELVA el puño al
// menos a donde estaba antes de empujar.
ok(pT.puno.adelante <= p0.puno.adelante + 0.5,
  `la TRACCIÓN lo devuelve (${pE.puno.adelante} → ${pT.puno.adelante} cm, `
  + `partiendo de ${p0.puno.adelante}): remo horizontal`);

// ------------------------------------------- 2) VERTICAL desde arriba
const vert = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  ed.applyPose("Tracción vertical");                       // brazos por encima
  const t = [{ fase: "partida", puno: __puno("L"), shoulder: __g("shoulderL"), elbow: __g("elbowL") }];
  for (let k = 0; k < 24; k++) ed.moverPrimitiva(-1, 5);   // TRACCIÓN = jalón
  t.push({ fase: "tracción", puno: __puno("L"), shoulder: __g("shoulderL"), elbow: __g("elbowL") });
  for (let k = 0; k < 24; k++) ed.moverPrimitiva(1, 5);    // EMPUJE = press militar
  t.push({ fase: "empuje", puno: __puno("L"), shoulder: __g("shoulderL"), elbow: __g("elbowL") });
  return t;
});
console.log("\n2) PLANO VERTICAL desde la postura \"Tracción vertical\" (brazos arriba):");
for (const f of vert) console.log(`   ${f.fase.padEnd(9)} hombro ${String(f.shoulder).padStart(6)}°  codo ${String(f.elbow).padStart(6)}°  puño: ${f.puno.adelante} cm adelante, ${f.puno.arriba} cm sobre el hombro`);
ok(vert[1].puno.arriba < vert[0].puno.arriba - 20,
  `la TRACCIÓN baja el puño: jalón vertical (${vert[0].puno.arriba} → ${vert[1].puno.arriba} cm)`);
ok(vert[2].puno.arriba > vert[1].puno.arriba + 20,
  `el EMPUJE lo vuelve a subir: press vertical (${vert[1].puno.arriba} → ${vert[2].puno.arriba} cm)`);
ok(vert[0].puno.arriba > Math.abs(vert[0].puno.adelante),
  `el plano lo puso la POSTURA, no el botón (arranca ${vert[0].puno.arriba} cm arriba y ${vert[0].puno.adelante} cm adelante)`);

// ------------------------------ 3) aislamiento: asimétrico y sectorizado
const aislado = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  ed.applyPose("Sentado");
  ed.activarZona("superior", "R");                          // SOLO el lado derecho
  for (let k = 0; k < 20; k++) ed.moverPrimitiva(1, 5);
  const asim = { elbowR: __g("elbowR"), elbowL: __g("elbowL") };
  ed.applyPose("Sentadilla");
  ed.activarZona("superior", null);
  ed.activarZona("inferior", "sim");                        // SOLO tren inferior
  const antes = { knee: __g("kneeL"), hip: __g("hipL"), ankle: __g("ankleL"), shoulder: __g("shoulderL") };
  const planta0 = __g("hipL") + __g("kneeL") + __g("ankleL");
  for (let k = 0; k < 20; k++) ed.moverPrimitiva(1, 5);
  const tras = { knee: __g("kneeL"), hip: __g("hipL"), ankle: __g("ankleL"), shoulder: __g("shoulderL") };
  const planta1 = __g("hipL") + __g("kneeL") + __g("ankleL");
  // Simultáneo: tren inferior + bisagra a la vez (peso muerto).
  ed.applyPose("Remo");
  ed.activarZona("bisagra", "sim");
  const dl0 = { hip: __g("hipL"), spine: __g("spine"), knee: __g("kneeL") };
  for (let k = 0; k < 20; k++) ed.moverPrimitiva(1, 5);
  const dl1 = { hip: __g("hipL"), spine: __g("spine"), knee: __g("kneeL") };
  return { asim, inf: { antes, tras, planta0, planta1 }, dl: { dl0, dl1 } };
});
console.log("\n3) AISLAMIENTO:");
console.log("   asimétrico:", JSON.stringify(aislado.asim));
console.log("   sectorizado (solo tren inferior):", JSON.stringify(aislado.inf.antes), "→", JSON.stringify(aislado.inf.tras));
console.log("   simultáneo (inferior + bisagra):", JSON.stringify(aislado.dl.dl0), "→", JSON.stringify(aislado.dl.dl1));
ok(aislado.asim.elbowR > -20 && aislado.asim.elbowL < -40,
  `ASIMÉTRICO: solo se extiende el codo derecho (R ${aislado.asim.elbowR}° · L ${aislado.asim.elbowL}°)`);
ok(aislado.inf.tras.knee < aislado.inf.antes.knee && aislado.inf.tras.hip > aislado.inf.antes.hip,
  `SECTORIZADO: rodilla y cadera se extienden (rodilla ${aislado.inf.antes.knee}→${aislado.inf.tras.knee}°, cadera ${aislado.inf.antes.hip}→${aislado.inf.tras.hip}°)`);
ok(aislado.inf.tras.shoulder === aislado.inf.antes.shoulder,
  `y el tren superior NO se mueve (hombro sigue en ${aislado.inf.tras.shoulder}°)`);
ok(Math.abs(aislado.inf.planta1 - aislado.inf.planta0) < 1.5,
  `ACOMODACIÓN: la planta del pie conserva su orientación (${aislado.inf.planta0.toFixed(1)}° → ${aislado.inf.planta1.toFixed(1)}°)`);
ok(aislado.dl.dl1.hip > aislado.dl.dl0.hip && aislado.dl.dl1.spine < aislado.dl.dl0.spine,
  `SIMULTÁNEO: cadera y espalda se extienden juntas — peso muerto (cadera ${aislado.dl.dl0.hip}→${aislado.dl.dl1.hip}°, espalda ${aislado.dl.dl0.spine}→${aislado.dl.dl1.spine}°)`);
ok(aislado.dl.dl1.knee < aislado.dl.dl0.knee,
  `y la rodilla acompaña porque el tren inferior sigue activo (${aislado.dl.dl0.knee}→${aislado.dl.dl1.knee}°)`);

// -------------------------------- 4) postura de partida y repetibilidad
const partida = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  ed.activarZona("inferior", null); ed.activarZona("bisagra", null);
  ed.activarZona("superior", "sim");
  ed.applyPose("Sentado");
  const inicio = { shoulder: __g("shoulderL"), elbow: __g("elbowL") };
  const pasada = async () => {
    ed.startSimulation();
    for (let i = 0; i < 160 && !ed.physics; i++) await new Promise((x) => setTimeout(x, 50));
    await new Promise((x) => setTimeout(x, 600));
    const alArrancar = { shoulder: __g("shoulderL"), elbow: __g("elbowL") };
    for (let k = 0; k < 15; k++) ed.moverPrimitiva(1, 5);
    const alFinal = { shoulder: __g("shoulderL"), elbow: __g("elbowL") };
    ed.stopSimulation();
    await new Promise((x) => setTimeout(x, 900));
    return { alArrancar, alFinal, trasParar: { shoulder: __g("shoulderL"), elbow: __g("elbowL") } };
  };
  const a = await pasada();
  const b = await pasada();
  // ↺ en mitad de la simulación.
  ed.startSimulation();
  for (let i = 0; i < 160 && !ed.physics; i++) await new Promise((x) => setTimeout(x, 50));
  await new Promise((x) => setTimeout(x, 600));
  for (let k = 0; k < 15; k++) ed.moverPrimitiva(1, 5);
  const movido = { shoulder: __g("shoulderL"), elbow: __g("elbowL") };
  const reinicio = ed.reiniciarPoseDePartida();
  const trasReinicio = { shoulder: __g("shoulderL"), elbow: __g("elbowL") };
  ed.stopSimulation();
  await new Promise((x) => setTimeout(x, 900));
  return { inicio, a, b, movido, reinicio, trasReinicio };
});
console.log("\n4) POSTURA DE PARTIDA:");
console.log("   inicio:", JSON.stringify(partida.inicio));
console.log("   1ª pasada:", JSON.stringify(partida.a));
console.log("   2ª pasada:", JSON.stringify(partida.b));
console.log("   ↺ en marcha:", JSON.stringify(partida.movido), "→", JSON.stringify(partida.trasReinicio));
ok(JSON.stringify(partida.a.trasParar) === JSON.stringify(partida.inicio),
  `parar la simulación devuelve la postura de partida (${JSON.stringify(partida.a.trasParar)})`);
ok(JSON.stringify(partida.b.alArrancar) === JSON.stringify(partida.inicio),
  "la SEGUNDA pasada arranca desde la misma postura que la primera");
ok(JSON.stringify(partida.b.alFinal) === JSON.stringify(partida.a.alFinal),
  `y termina en el mismo sitio: el gesto es repetible (${JSON.stringify(partida.b.alFinal)})`);
ok(partida.reinicio && JSON.stringify(partida.trasReinicio) === JSON.stringify(partida.inicio),
  "el ↺ vuelve a la partida SIN parar la simulación");

// --------------------------- 5) guardar/cargar posturas sobre un apoyo
const poses = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  const res = {};
  ed.applyPose("Sentado");
  // Como si estuviera sentada en un banco: apoyada en una PIEZA, no en el suelo.
  ed.humanFigure.position.y = 45;
  ed.marcarPoseDePartida("banco");
  ed.__apoyoPieza = true;
  return res;
});
const posesB = await page.evaluate(async () => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  // Un banco de verdad: se coloca la figura sobre él con la herramienta.
  [...document.querySelectorAll("#palette .comp-btn")]
    .find((b) => (b.textContent ?? "").trim().endsWith("UpperMachine")).click();
  await new Promise((x) => setTimeout(x, 1800));
  const asiento = [...ed.objects.values()][4];
  const caja = new T.Box3().setFromObject(asiento.mesh);
  await ed.colocarFiguraEnPruebas?.({ punto: caja.getCenter(new T.Vector3()).setY(caja.max.y), obj: asiento });
  return null;
});
const apoyo = await page.evaluate(async () => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  const asiento = [...ed.objects.values()][4];
  const caja = new T.Box3().setFromObject(asiento.mesh);
  const rect = ed.sceneManager.renderer.domElement.getBoundingClientRect();
  const v = new T.Vector3((caja.min.x + caja.max.x) / 2, caja.max.y + 0.3, (caja.min.z + caja.max.z) / 2);
  const q = v.clone().project(ed.sceneManager.camera);
  return { x: Math.round((q.x * 0.5 + 0.5) * rect.width), y: Math.round((-q.y * 0.5 + 0.5) * rect.height) };
});
await page.evaluate(() => window.exersuite.editor.beginColocarFigura());
await page.mouse.move(apoyo.x, apoyo.y); await page.waitForTimeout(400);
await page.mouse.click(apoyo.x, apoyo.y); await page.waitForTimeout(1300);

await page.evaluate(AYUDANTES);
const guardado = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  const asiento = [...ed.objects.values()][4];
  const sobreElAsiento = window.__sentadaEn(asiento);
  const y0 = +ed.humanFigure.position.y.toFixed(2);
  // Editar una articulación con la figura sentada NO debe tirarla al suelo.
  ed.selectJoint("shoulderL");
  ed.setJointAngle("x", -120);
  const yEditando = +ed.humanFigure.position.y.toFixed(2);
  // Guardar la postura y recargarla tampoco.
  ed.savePose("PRUEBA-BANCO");
  const enLista = ed.listPoseNames().includes("PRUEBA-BANCO");
  // Otra postura SENTADA no la mueve de su asiento.
  ed.applyPose("Empuje horizontal");
  const yOtraSentada = +ed.humanFigure.position.y.toFixed(2);
  // La PIEL, no la caja: el collarín de cada pieza vive dentro de su vecina y
  // desde 0.2.60 la aplicación no lo cuenta como cuerpo que pise nada.
  const pieOtraSentada = window.__pielMasBaja();
  // Y una de PIE sí debe ponerla de pie: con las piernas rectas, los pies no
  // caben entre el asiento y el suelo, así que se levanta (v0.2.52).
  ed.applyPose("De pie");
  const yDePie = +ed.humanFigure.position.y.toFixed(2);
  ed.applyPose("PRUEBA-BANCO");
  const recargada = { shoulder: __g("shoulderL"), hip: __g("hipL"), y: +ed.humanFigure.position.y.toFixed(2) };
  ed.deletePose("PRUEBA-BANCO");
  return { y0, sobreElAsiento, yEditando, enLista, yOtraSentada, pieOtraSentada, yDePie, recargada, borrada: !ed.listPoseNames().includes("PRUEBA-BANCO") };
});
console.log("\n5) POSTURAS CON LA FIGURA SENTADA EN UN BANCO:");
console.log("   ", JSON.stringify(guardado));
// Sentada = los glúteos posados en la cara del asiento. Antes se miraba que la
// `y` de la figura pasara de 10, que no distinguía nada porque la raíz del rig
// estaba a la altura de la cadera; ahora está en el suelo y vale −37.
ok(guardado.sobreElAsiento?.sentada,
  `la figura queda sentada sobre el asiento (glúteos a ${guardado.sobreElAsiento?.gluteos}, `
  + `asiento a ${guardado.sobreElAsiento?.asiento} cm)`);
ok(Math.abs(guardado.yEditando - guardado.y0) < 0.01,
  `editar una articulación NO la mueve de su asiento (y=${guardado.yEditando} cm)`);
ok(guardado.enLista && guardado.borrada, "la postura nueva se guarda y se borra de la biblioteca");
ok(Math.abs(guardado.yOtraSentada - guardado.y0) < 0.01,
  `cargar OTRA postura sentada no la mueve de su asiento (y=${guardado.yOtraSentada} cm)`);
ok(guardado.pieOtraSentada >= -0.05,
  `y nada del cuerpo queda bajo el suelo (lo más bajo, a ${guardado.pieOtraSentada} cm)`);
ok(guardado.yDePie > guardado.y0 + 10,
  `una postura DE PIE sí la pone de pie: con las piernas rectas los pies no caben bajo el asiento (${guardado.y0} → ${guardado.yDePie} cm)`);
ok(guardado.recargada.shoulder === -120 && Math.abs(guardado.recargada.y - guardado.y0) < 0.01,
  `y recargar la guardada devuelve sus ángulos exactos (hombro ${guardado.recargada.shoulder}°, y=${guardado.recargada.y} cm)`);

// 6) EL SENTIDO DEL GESTO TIENE QUE SER UN NÚMERO (+1 o −1).
//
// Llamando a `moverPrimitiva` con basura —un "empuje" en vez de un +1 desde un
// guion, un campo vacío— la aritmética metía NaN en las rotaciones, y de ahí no
// se vuelve: el maniquí entero pierde su posición y hay que rehacerlo. Esto
// comprueba que la basura se ignora y el cuerpo sigue en pie.
const basura = await page.evaluate(() => {
  const T = window.exersuite.THREE, ed = window.exersuite.editor;
  ed.applyPose("De pie");
  const antes = new T.Box3().setFromObject(ed.humanFigure);
  const movidas = [
    ed.moverPrimitiva("empuje", 5),
    ed.moverPrimitiva(1, Number.NaN),
    ed.moverPrimitiva(0, 5),
  ];
  const c = new T.Box3().setFromObject(ed.humanFigure).getCenter(new T.Vector3());
  return { movidas, sano: Number.isFinite(c.x) && Number.isFinite(c.y) && Number.isFinite(c.z),
    alto: +(antes.max.y - antes.min.y).toFixed(1) };
});
console.log("\n6) SENTIDO INVÁLIDO:", JSON.stringify(basura));
ok(basura.movidas.every((n) => n === 0), "un sentido o un paso inválidos no mueven nada");
ok(basura.sano && basura.alto > 150,
  `y el maniquí sigue entero, sin NaN en las articulaciones (${basura.alto} cm)`);

console.log("\nERRORES:", errores.length ? errores.join("\n") : "ninguno");
console.log(fallos.length ? "❌ " + fallos.join(" · ") : "✅ todo correcto");
await browser.close();
process.exit(fallos.length ? 1 : 0);
