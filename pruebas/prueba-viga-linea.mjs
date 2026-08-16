// Roldana INTERNA sobre una viga trazada con la HERRAMIENTA LINEAL típica
// (pilar/travesaño de línea, perfil 1:2 con pinholes), todo por la interfaz:
// se dibuja la viga con dos clics, se eleva, y se coloca la roldana con la
// herramienta en dos pasos (estructura → punto del eje → interna + dirección).
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

// Cámara determinista + proyección de mundo a píxeles para los clics.
await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  ed.orbit.enableDamping = false;
  ed.orbit.target.set(0, 20, 0);
  ed.sceneManager.camera.position.set(150, 190, 260);
  ed.orbit.update?.();
  ed.requestRender?.();
  window.__aPx = (x, y, z) => {
    const v = new T.Vector3(x, y, z).project(ed.sceneManager.camera);
    const r = document.getElementById("viewport").getBoundingClientRect();
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
  };
});
await page.waitForTimeout(500);

// ── 1) HERRAMIENTA LINEAL: perfil 1:2 de 50 mm CON pinholes ───────────────
await page.click("#palette .comp-btn:has-text('Pilar / travesaño (línea)')");
await page.waitForTimeout(400);
const dlg = await page.evaluate(() => !!document.querySelector(".confirm-dialog"));
await page.evaluate(() => {
  const d = document.querySelector(".confirm-dialog");
  const sel = d.querySelectorAll("select");
  sel[0].value = "2"; sel[0].dispatchEvent(new Event("change", { bubbles: true })); // 1:2
  sel[1].value = "50"; sel[1].dispatchEvent(new Event("change", { bubbles: true })); // 50 mm
  const chk = d.querySelector('input[type="checkbox"]');
  chk.click(); // pinholes ON (⌀16 mm cada 5 cm)
});
await page.click(".confirm-dialog button:has-text('Colocar')");
await page.waitForTimeout(400);

// Dos clics sobre el suelo: la viga se traza de (-45,0,0) a (45,0,0).
const pA = await page.evaluate(() => window.__aPx(-45, 0, 0));
await page.mouse.click(pA.x, pA.y);
await page.waitForTimeout(300);
const pB = await page.evaluate(() => window.__aPx(45, 0, 0));
await page.mouse.click(pB.x, pB.y);
await page.waitForTimeout(500);
await page.keyboard.press("Escape"); // termina el encadenado de la herramienta
await page.waitForTimeout(200);

const V = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const viga = [...ed.objects.values()].find((o) => o.componentId === "pilar-linea");
  if (!viga) return { creada: false };
  // Elevar la viga a altura de trabajo (cursores de arrastre preciso).
  ed.select(viga);
  ed.nudgeSelection(0, 150, 0);
  ed.select(null);
  window.__viga = viga.id;
  const ls = viga.localSizeAbs();
  return {
    creada: true,
    nombre: viga.name,
    perfil: [viga.params.width, viga.params.depth],
    pinholes: viga.params.holeDiameter,
    largo: +Math.max(ls.x, ls.y, ls.z).toFixed(1),
    pos: viga.mesh.position.toArray().map((v) => +v.toFixed(1)),
    trisAntes: viga.mesh.geometry.attributes.position.count / 3,
  };
});
console.log("1-viga lineal:", JSON.stringify({ dialogo: dlg, ...V }));
// La viga subió a la altura de trabajo: se reencuadra la vista sobre ella.
await page.evaluate(() => {
  const ed = window.exersuite.editor;
  ed.orbit.target.set(0, 150, 0);
  ed.sceneManager.camera.position.set(70, 178, 150);
  ed.orbit.update?.();
  ed.requestRender?.();
});
await page.waitForTimeout(500);
await page.screenshot({ path: "vlinea-1-viga.png" });

// ── 2) ROLDANA INTERNA por la interfaz ────────────────────────────────────
// OJO: hay varios botones con "roldana" en el texto (el carro de doble
// roldana). La herramienta es el de texto EXACTO "Roldana".
await page.evaluate(() => {
  const b = [...document.querySelectorAll("#palette .comp-btn")].find(
    (x) => (x.textContent ?? "").trim() === "Roldana",
  );
  b.click();
});
await page.waitForTimeout(300);
// Fase 1: tocar la ESTRUCTURA (centro de la viga, ya elevada a y=150).
const pViga = await page.evaluate(() => window.__aPx(0, 150, 0));
await page.mouse.click(pViga.x, pViga.y);
await page.waitForTimeout(400);
const fase1 = await page.evaluate(() => ({
  host: window.exersuite.editor.roldanaHost?.id === window.__viga,
  ejeAzul: !!window.exersuite.editor.roldanaAxisLine,
}));
console.log("fase1:", JSON.stringify(fase1));
await page.screenshot({ path: "vlinea-2-eje-azul.png" });

// Fase 2: tocar un punto A LO LARGO del eje azul (a 20 cm del centro).
const pPunto = await page.evaluate(() => window.__aPx(20, 150, 0));
await page.mouse.click(pPunto.x, pPunto.y);
await page.waitForTimeout(500);
const panel = await page.evaluate(() => !!document.getElementById("rold-panel"));
console.log("panel:", panel);
if (!panel) await page.screenshot({ path: "vlinea-debug.png" });
await page.click("#rold-panel .rold-opt:has-text('Interna')");
await page.waitForTimeout(200);
await page.click("#rold-panel .rold-dir:has-text('Anterior')");
await page.waitForTimeout(600);
await page.keyboard.press("Escape");
await page.waitForTimeout(200);

const R = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const viga = ed.getObject(window.__viga);
  const rold = [...ed.objects.values()].find((o) => o.name.startsWith("Roldana interna"));
  const eje = [...ed.objects.values()].find((o) => o.componentId === "eje-roldana");
  if (!rold || !eje) return { colocada: false };
  window.__rold = rold.id;
  viga.mesh.updateMatrixWorld(true);
  const ls = viga.localSizeAbs();
  const vent = viga.params.ventanas?.[0] ?? null;

  // Hueco REAL: un rayo por el centro de la rueda, en la dirección elegida
  // (+Z), debe atravesar sin tocar material; desplazado al borde, 2 impactos.
  const centro = rold.mesh.position.clone();
  // OJO: la viga lleva PINHOLES cada 5 cm en la fila central, y el rayo va
  // justo por el eje de esos agujeros: la sonda del borde se desplaza en
  // VERTICAL (fuera del hueco y fuera de la fila de pinholes).
  const rayo = (dx, dy) =>
    new T.Raycaster(
      centro.clone().add(new T.Vector3(dx, dy, -60)),
      new T.Vector3(0, 0, 1),
      0.1,
      200,
    ).intersectObject(viga.mesh, false).length;
  const dentro = rayo(0, 0);
  const borde = rayo(0, (vent ? vent.du : 4) / 2 + 1.2);
  const lejos = rayo(-40, 1.5);

  // El EJE va de pared a pared a lo largo del eje de giro de la rueda.
  const ejeGiro = new T.Vector3(0, 1, 0).applyQuaternion(rold.mesh.quaternion);
  const ejeDir = new T.Vector3(0, 1, 0).applyQuaternion(eje.mesh.quaternion);

  // La rueda queda DENTRO del perfil (su centro en el eje de la viga).
  const rel = centro.clone().sub(viga.mesh.position);
  const ejeViga = new T.Vector3(0, 1, 0).applyQuaternion(viga.mesh.quaternion);
  const desvio = rel.clone().addScaledVector(ejeViga, -rel.dot(ejeViga)).length();

  return {
    colocada: true,
    ventanas: (viga.params.ventanas ?? []).length,
    ventana: vent,
    trisDespues: viga.mesh.geometry.attributes.position.count / 3,
    dentro,
    borde,
    lejos,
    ejeAlineado: +Math.abs(ejeDir.dot(ejeGiro)).toFixed(3),
    largoEje: +eje.params.height.toFixed(1),
    // Perfil: [a lo ancho del eje de giro, a lo largo, en la dirección].
    perfil: [+ls.x.toFixed(1), +ls.y.toFixed(1), +ls.z.toFixed(1)],
    perfilLateral: +[ls.x, ls.y, ls.z].sort((a, b) => a - b)[1].toFixed(1),
    grosorRueda: +(rold.localSizeAbs().y * Math.abs(rold.mesh.scale.y)).toFixed(2),
    radioRueda: +(rold.localSizeAbs().x / 2).toFixed(2),
    desvioDelEje: +desvio.toFixed(2),
    sobreLaViga: +Math.abs(rel.dot(ejeViga)).toFixed(1),
    agrupada: !!ed.objGroup.get(rold.id),
    // Los PINHOLES de la viga sobreviven al calado.
    pinholes: viga.params.holeDiameter,
  };
});
console.log("2-roldana interna:", JSON.stringify({ fase1, panel, ...R }));

// ── 3) Cable por el hueco y vista de comprobación ─────────────────────────
const C = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const rold = ed.getObject(window.__rold);
  const c = rold.mesh.position.clone();
  const anclaje = ed.addComponent("terminal-cable", new T.Vector3(-38, c.y, 0));
  anclaje.physics = { ...anclaje.physics, fixed: true };
  const salida = ed.addComponent("terminal-cable", new T.Vector3(c.x + 30, c.y, 40));
  salida.physics = { ...salida.physics, fixed: true };
  ed.createCable([
    { objectId: anclaje.id, local: { x: 0, y: 0, z: 0 } },
    { objectId: rold.id, local: { x: 0, y: 0, z: 0 } },
    { objectId: salida.id, local: { x: 0, y: 0, z: 0 } },
  ]);
  ed.select(null);
  ed.setEdges(true);
  ed.orbit.target.copy(c);
  ed.sceneManager.camera.position.copy(c.clone().add(new T.Vector3(-8, 8, 46)));
  ed.orbit.update?.();
  ed.requestRender?.();
  return { cables: ed.listCables().length };
});
await page.waitForTimeout(1000);
const C2 = await page.evaluate(() => ({
  invalidos: window.exersuite.editor.cablesInvalidos.size,
}));
console.log("3-cable:", JSON.stringify({ ...C, ...C2 }));
await page.screenshot({ path: "vlinea-3-calada.png" });

// ── 4) SIMULACIÓN: la rueda queda solidaria a la viga (cuerpo compuesto)
//      y nada se descoloca al arrancar la física.
const S = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  const rold = ed.getObject(window.__rold);
  const viga = ed.getObject(window.__viga);
  const p0 = rold.mesh.position.clone();
  const v0 = viga.mesh.position.clone();
  await ed.toggleSimulation();
  const ph = ed.physics;
  const porHandle = new Map();
  for (const { body, obj } of ph.bodies.values()) porHandle.set(body.handle, obj.name);
  const emp = ph.empotradas.find((e) => e.obj.id === rold.id);
  const anfitrion = emp ? porHandle.get(emp.host.handle) ?? "?" : null;
  // Con viga y rueda FIJAS no hace falta fundirlas: ya son rígidas (el
  // empotrado solo se aplica cuando alguna de las dos es móvil).
  const ambosFijos = rold.physics.fixed && viga.physics.fixed;
  const cuerpoRueda = ph.bodies.get(rold.id);
  const ruedaEnMundo = !!cuerpoRueda && cuerpoRueda.body.isFixed();
  for (let i = 0; i < 180; i++) ph.step(1 / 60);
  const dR = +rold.mesh.position.distanceTo(p0).toFixed(2);
  const dV = +viga.mesh.position.distanceTo(v0).toFixed(2);
  ed.toggleSimulation();
  return {
    empotrada: !!emp,
    anfitrion,
    ambosFijos,
    ruedaEnMundo,
    sigueSiendoPolea: ed.isPulley(rold),
    derivaRoldana: dR,
    derivaViga: dV,
  };
});
console.log("4-simulacion:", JSON.stringify(S));

const ok =
  V.creada && V.perfil[0] === 10 && V.perfil[1] === 5 && V.pinholes > 1 &&
  Math.abs(V.largo - 90) < 1 &&
  fase1.host && fase1.ejeAzul && panel &&
  R.colocada && R.ventanas === 1 && R.trisDespues > V.trisAntes &&
  R.dentro === 0 && R.borde === 2 && R.lejos === 2 &&
  R.ejeAlineado > 0.999 && R.largoEje >= R.perfilLateral - 0.01 &&
  R.grosorRueda + 0.5 < R.perfilLateral &&
  // El punto lo elige un CLIC sobre la viga: basta con que caiga donde se
  // tocó (±2 cm de precisión de píxel), no en la coordenada exacta.
  R.desvioDelEje < 0.01 && Math.abs(R.sobreLaViga - 20) < 2 &&
  R.agrupada && R.pinholes > 1 &&
  C.cables === 1 && C2.invalidos === 0 &&
  (S.empotrada || (S.ambosFijos && S.ruedaEnMundo)) && S.sigueSiendoPolea &&
  S.derivaRoldana < 0.5 && S.derivaViga < 0.5;
console.log(JSON.stringify({ ok }));
console.log("ERRORES:", errores.length ? errores.join("\n") : "ninguno");
await browser.close();
