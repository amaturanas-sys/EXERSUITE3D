// v0.2.45 · Los tres puntos del reporte:
//  1) UNA ventana de maniquí con interruptor POSAR / SIMULAR
//  2) colocar no se queda pegado ni manda la figura lejos; 8/9 mueven en AMBAS
//     direcciones (ya no hay bloqueo direccional)
//  3) las teclas son 8 y 9, y los cursores ▲▼ ya NO mueven el maniquí
import { chromium } from "playwright-core";
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
page.on("console", (m) => { if (m.type() === "error") errores.push("CONSOLE: " + m.text()); });
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
  [...document.querySelectorAll("#palette .comp-btn")]
    .find((b) => (b.textContent ?? "").trim().endsWith("UpperMachine")).click();
  await new Promise((x) => setTimeout(x, 1800));
  const pivote = ed.listJoints().find((u) => !u.locked);
  if (pivote) pivote.limitsEnabled = true;
  if (!ed.figureJoints()) await ed.addHumanFigure();
  await new Promise((x) => setTimeout(x, 800));
});

// ---- 1) UNA ventana con dos modos -----------------------------------
const ui = await page.evaluate(() => {
  const panel = document.querySelector("#articulaciones");
  const txt = (s) => [...panel.querySelectorAll(s)].map((b) => b.textContent.trim());
  return {
    hayPosturas: !!document.querySelector("#poses"),
    hayManiqui: !!panel,
    titulo: panel?.querySelector(".panel-title")?.textContent ?? null,
    visible: panel ? getComputedStyle(panel).display !== "none" : false,
    modos: txt(".mq-modos .tool"),
    // En modo POSAR deben estar las herramientas de postura…
    posarVisible: panel && getComputedStyle(panel.querySelectorAll(".mq-seccion")[0]).display !== "none",
    simularVisible: panel && getComputedStyle(panel.querySelectorAll(".mq-seccion")[1]).display !== "none",
    herramientasPosar: txt(".mq-seccion .tool"),
    familias: panel?.querySelectorAll(".art-fila").length ?? 0,
    lados: txt(".art-lados .tool"),
  };
});
ok(!ui.hayPosturas, "la ventana suelta de Posturas ya no existe");
// v0.2.55: la ventana pasa a titularse ERGONOMÍA — desde ella también se
// posa la máquina, así que «Maniquí» se quedaba corto.
ok(ui.hayManiqui && ui.titulo === "Ergonomía", `hay UNA ventana de ergonomía ("${ui.titulo}")`);
ok(ui.visible, "aparece sola al haber maniquí");
ok(ui.modos.length === 2 && /Posar/.test(ui.modos[0]) && /Simular/.test(ui.modos[1]),
  `tiene interruptor de dos modos (${ui.modos.join(" / ")})`);
ok(ui.posarVisible && !ui.simularVisible, "arranca en POSAR (postura de partida)");
// v0.2.52: «Soltar manos» pasó a «Soltar apoyos» (suelta manos Y pies) y se
// sumó «Pisar», para apoyar el pie en una plataforma o pedal.
// v0.2.53: «Agarrar/Colocar maniquí» quedaron en «Agarrar/Colocar»: el rótulo
// largo desbordaba la fila y el panel ya se titula MANIQUÍ.
// v0.2.93: los apoyos se acortaron a «✋ Mano», «🦶 Pisar» y «Soltar». El
// diseñador reportó que los rótulos largos desbordaban y salían cortados.
const tienePosar = ["Aplicar", "Guardar como…", "✋ Agarrar", "🧍 Colocar", "✋ Mano", "Pisar", "Soltar"]
  .filter((t) => ui.herramientasPosar.some((h) => h.includes(t)));
ok(tienePosar.length === 7, `POSAR reúne las herramientas de postura (${tienePosar.length}/7: ${tienePosar.join(", ")})`);

const sim = await page.evaluate(() => {
  const panel = document.querySelector("#articulaciones");
  [...panel.querySelectorAll(".mq-modos .tool")][1].click();
  const secs = panel.querySelectorAll(".mq-seccion");
  return {
    posarVisible: getComputedStyle(secs[0]).display !== "none",
    simularVisible: getComputedStyle(secs[1]).display !== "none",
    zonas: [...panel.querySelectorAll(".mq-zona .art-fila span")].map((b) => b.textContent.trim()),
    lados: [...panel.querySelectorAll(".mq-zona")[0].querySelectorAll(".art-lados .tool")].map((b) => b.textContent.trim()),
    mover: [...panel.querySelectorAll(".mq-mover .tool")].map((b) => b.textContent.trim()),
  };
});
ok(!sim.posarVisible && sim.simularVisible, "el interruptor cambia a SIMULAR");
// v0.2.49: la instrucción es ZONA + sentido, no articulación por articulación.
ok(sim.zonas.length === 3 && sim.lados.length === 3,
  `SIMULAR ofrece 3 zonas con su lado (${sim.zonas.join("/")} — ${sim.lados.join("/")})`);
ok(sim.mover.length === 2 && /8/.test(sim.mover[0]) && /9/.test(sim.mover[1]) &&
   /Empuje|Push/.test(sim.mover[0]) && /Tracci|Pull/.test(sim.mover[1]),
  `y los botones son 8 EMPUJE y 9 TRACCIÓN (${sim.mover.join(" · ")})`);

// ---- 2) colocar durante la simulación --------------------------------
const px = await page.evaluate(async () => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  ed.startSimulation();
  for (let i = 0; i < 160 && !ed.physics; i++) await new Promise((x) => setTimeout(x, 50));
  await new Promise((x) => setTimeout(x, 2500));
  const rect = ed.sceneManager.renderer.domElement.getBoundingClientRect();
  const objs = [...ed.objects.values()];
  const proy = (v) => {
    const q = v.clone().project(ed.sceneManager.camera);
    return { x: Math.round((q.x * 0.5 + 0.5) * rect.width), y: Math.round((-q.y * 0.5 + 0.5) * rect.height) };
  };
  const caja = new T.Box3().setFromObject(objs[4].mesh);
  const pila = objs.find((o) => /Bloque de pesos/i.test(o.name));
  const cp = new T.Box3().setFromObject(pila.mesh);
  return {
    asiento: proy(new T.Vector3((caja.min.x + caja.max.x) / 2, caja.max.y + 0.3, (caja.min.z + caja.max.z) / 2)),
    pila: proy(new T.Vector3((cp.min.x + cp.max.x) / 2, cp.max.y, (cp.min.z + cp.max.z) / 2)),
  };
});
const antesErr = errores.length;
await page.evaluate(() => window.exersuite.editor.beginColocarFigura());
await page.mouse.move(px.asiento.x, px.asiento.y); await page.waitForTimeout(350);
await page.mouse.click(px.asiento.x, px.asiento.y); await page.waitForTimeout(1400);
const tras = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  return { modo: ed.isColocarFigura(), pos: ed.humanFigure.position.toArray().map((v) => +v.toFixed(1)),
    modoPanel: ed.panelArticulaciones?.modoActual() };
});
ok(!tras.modo, "la herramienta de colocar SE APAGA tras dejar la figura puesta");
ok(errores.slice(antesErr).length === 0, `colocar en simulación no lanza errores (${errores.slice(antesErr).join(" | ") || "ninguno"})`);
ok(tras.modoPanel === "simular", `la ventana pasó sola a SIMULAR al arrancar la física (${tras.modoPanel})`);

// Clic sobre una pieza que NO es apoyo: no debe teletransportar la figura.
const posAntes = tras.pos;
await page.evaluate(() => window.exersuite.editor.beginColocarFigura());
await page.mouse.click(px.pila.x, px.pila.y); await page.waitForTimeout(1200);
const trasPila = await page.evaluate(() => window.exersuite.editor.humanFigure.position.toArray().map((v) => +v.toFixed(1)));
ok(JSON.stringify(trasPila) === JSON.stringify(posAntes),
  `clicar una pieza que no es apoyo NO mueve la figura (${JSON.stringify(posAntes)} → ${JSON.stringify(trasPila)})`);

// ---- 2b) flexión Y extensión funcionan en ambos sentidos --------------
const mov = await page.evaluate(async () => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  const fig = ed.humanFigure;
  fig.position.x += 18; fig.position.z += 12;   // como si se arrastrase
  fig.updateMatrixWorld(true);
  ed.physics?.añadirFigura(fig);
  await new Promise((x) => setTimeout(x, 600));
  ed.activarZona("inferior", null); ed.activarZona("bisagra", null);
  ed.activarZona("superior", "sim");   // v0.2.49: la zona sustituye al candado
  const j = ed.figureJoints();
  const a = () => +T.MathUtils.radToDeg(j.elbowL.rotation.x).toFixed(1);
  const a0 = a();
  let flex = 0;
  for (let i = 0; i < 10; i++) flex += ed.moverPrimitiva(1, 6);
  const a1 = a();
  let ext = 0;
  for (let i = 0; i < 10; i++) ext += ed.moverPrimitiva(-1, 6);
  const a2 = a();
  return { a0, a1, a2, flex, ext, choque: ed.contactoConEstructura };
});
ok(mov.flex >= 12, `el EMPUJE recorre su rango (${mov.flex} movimientos, codo ${mov.a0}° → ${mov.a1}°)`);
ok(mov.ext >= 15, `la TRACCIÓN recorre su rango (${mov.ext} movimientos, codo ${mov.a1}° → ${mov.a2}°)`);

// ---- 3) teclas 8 y 9, y los cursores ya no mueven ---------------------
const teclas = await page.evaluate(() => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  const j = ed.figureJoints();
  return { antes: +T.MathUtils.radToDeg(j.elbowL.rotation.x).toFixed(1) };
});
await page.keyboard.press("8"); await page.waitForTimeout(200);
await page.keyboard.press("8"); await page.waitForTimeout(200);
const tras8 = await page.evaluate(() => +window.exersuite.THREE.MathUtils.radToDeg(
  window.exersuite.editor.figureJoints().elbowL.rotation.x).toFixed(1));
await page.keyboard.press("9"); await page.waitForTimeout(200);
const tras9 = await page.evaluate(() => +window.exersuite.THREE.MathUtils.radToDeg(
  window.exersuite.editor.figureJoints().elbowL.rotation.x).toFixed(1));
await page.keyboard.press("ArrowUp"); await page.waitForTimeout(200);
await page.keyboard.press("ArrowDown"); await page.waitForTimeout(200);
const trasFlechas = await page.evaluate(() => +window.exersuite.THREE.MathUtils.radToDeg(
  window.exersuite.editor.figureJoints().elbowL.rotation.x).toFixed(1));
ok(tras8 > teclas.antes, `la tecla 8 EMPUJA: extiende el codo (${teclas.antes}° → ${tras8}°)`);
ok(tras9 < tras8, `la tecla 9 TRACCIONA: lo flexiona (${tras8}° → ${tras9}°)`);
ok(trasFlechas === tras9, `los cursores ▲▼ ya NO mueven el maniquí (${tras9}° → ${trasFlechas}°)`);

console.log("ERRORES:", errores.length ? errores.join("\n") : "ninguno");
console.log(fallos.length ? "❌ " + fallos.join(" · ") : "✅ todo correcto");
await page.screenshot({ path: "v245.png" });
await browser.close();
process.exit(fallos.length ? 1 : 0);
