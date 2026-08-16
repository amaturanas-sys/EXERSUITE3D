// Roldana INTERNA en un PILAR VERTICAL (el caso del montante TTP): el eje
// mayor de la estructura es vertical, así que arriba/abajo deben RECHAZARSE
// y el reenvío correcto es horizontal — el cable baja por dentro del pilar y
// sale por la ventana calada en su cara.
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

await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  ed.orbit.enableDamping = false;
  ed.orbit.target.set(0, 110, 0);
  ed.sceneManager.camera.position.set(105, 150, 215);
  ed.orbit.update?.();
  ed.requestRender?.();
  window.__aPx = (x, y, z) => {
    const v = new T.Vector3(x, y, z).project(ed.sceneManager.camera);
    const r = document.getElementById("viewport").getBoundingClientRect();
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
  };
});
await page.waitForTimeout(400);

// ── 1) PILAR VERTICAL desde la paleta (8×200×8, apoyado en el suelo) ──────
await page.evaluate(() => {
  [...document.querySelectorAll("#palette .comp-btn")]
    .find((b) => (b.textContent ?? "").trim() === "Pilar estructural")
    .click();
});
await page.waitForTimeout(500);
const P = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const pilar = [...ed.objects.values()].find((o) => o.componentId === "pilar");
  ed.select(null);
  window.__pilar = pilar.id;
  const ls = pilar.localSizeAbs();
  return {
    creado: !!pilar,
    perfil: [+ls.x.toFixed(1), +ls.y.toFixed(1), +ls.z.toFixed(1)],
    pos: pilar.mesh.position.toArray().map((v) => +v.toFixed(1)),
    trisAntes: pilar.mesh.geometry.attributes.position.count / 3,
  };
});
console.log("1-pilar:", JSON.stringify(P));

// ── 2) Herramienta de roldana: estructura → eje azul VERTICAL ─────────────
await page.evaluate(() => {
  [...document.querySelectorAll("#palette .comp-btn")]
    .find((b) => (b.textContent ?? "").trim() === "Roldana")
    .click();
});
await page.waitForTimeout(300);
const pPilar = await page.evaluate(() => window.__aPx(0, 120, 0));
await page.mouse.click(pPilar.x, pPilar.y);
await page.waitForTimeout(400);
const fase1 = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const l = ed.roldanaAxisLine;
  let vertical = null;
  if (l) {
    const p = l.geometry.attributes.position;
    const d = new window.exersuite.THREE.Vector3(
      p.getX(1) - p.getX(0),
      p.getY(1) - p.getY(0),
      p.getZ(1) - p.getZ(0),
    ).normalize();
    vertical = +Math.abs(d.y).toFixed(3);
  }
  return { host: ed.roldanaHost?.id === window.__pilar, ejeAzul: !!l, ejeVertical: vertical };
});
console.log("2-fase1:", JSON.stringify(fase1));
await page.screenshot({ path: "vpilar-1-eje-azul.png" });

// ── 3) Dirección INVÁLIDA: "arriba" coincide con el eje del pilar ─────────
const pPunto = await page.evaluate(() => window.__aPx(0, 160, 0));
await page.mouse.click(pPunto.x, pPunto.y);
await page.waitForTimeout(500);
await page.click("#rold-panel .rold-opt:has-text('Interna')");
await page.waitForTimeout(150);
await page.click("#rold-panel .rold-dir:has-text('Arriba')");
await page.waitForTimeout(500);
const rechazo = await page.evaluate(() => ({
  aviso: document.getElementById("hud")?.textContent ?? "",
  roldanas: [...window.exersuite.editor.objects.values()].filter((o) =>
    o.name.startsWith("Roldana"),
  ).length,
  ventanas: (window.exersuite.editor.getObject(window.__pilar).params.ventanas ?? []).length,
}));
console.log("3-direccion invalida:", JSON.stringify(rechazo));

// ── 4) Dirección VÁLIDA: "anterior" (+Z) — reenvío horizontal ─────────────
await page.mouse.click(pPunto.x, pPunto.y);
await page.waitForTimeout(500);
await page.click("#rold-panel .rold-opt:has-text('Interna')");
await page.waitForTimeout(150);
await page.click("#rold-panel .rold-dir:has-text('Anterior')");
await page.waitForTimeout(600);
await page.keyboard.press("Escape");
await page.waitForTimeout(200);

const R = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const pilar = ed.getObject(window.__pilar);
  const rold = [...ed.objects.values()].find((o) => o.name.startsWith("Roldana interna"));
  const eje = [...ed.objects.values()].find((o) => o.componentId === "eje-roldana");
  if (!rold || !eje) return { colocada: false };
  window.__rold = rold.id;
  pilar.mesh.updateMatrixWorld(true);
  const ls = pilar.localSizeAbs();
  const vent = pilar.params.ventanas?.[0] ?? null;
  const centro = rold.mesh.position.clone();

  // Hueco REAL: rayo horizontal (+Z) por el centro de la rueda → 0 impactos;
  // desplazado en VERTICAL fuera del hueco → 2; lejos → 2.
  const rayo = (dy) =>
    new T.Raycaster(
      centro.clone().add(new T.Vector3(0, dy, -60)),
      new T.Vector3(0, 0, 1),
      0.1,
      200,
    ).intersectObject(pilar.mesh, false).length;
  const dentro = rayo(0);
  const borde = rayo((vent ? Math.max(vent.du, vent.dv) : 10) / 2 + 2);
  const lejos = rayo(-45);

  // EJE de giro: HORIZONTAL y ⊥ al pilar y a la dirección (world X).
  const ejeGiro = new T.Vector3(0, 1, 0).applyQuaternion(rold.mesh.quaternion);
  const ejeDir = new T.Vector3(0, 1, 0).applyQuaternion(eje.mesh.quaternion);

  // La rueda va en el eje central del pilar (sin desvío lateral).
  const rel = centro.clone().sub(pilar.mesh.position);
  const desvio = Math.hypot(rel.x, rel.z);

  return {
    colocada: true,
    ventanas: (pilar.params.ventanas ?? []).length,
    ventana: vent,
    trisDespues: pilar.mesh.geometry.attributes.position.count / 3,
    dentro,
    borde,
    lejos,
    ejeAlineado: +Math.abs(ejeDir.dot(ejeGiro)).toFixed(3),
    ejeHorizontal: +Math.abs(ejeDir.y).toFixed(3),
    ejeSobreX: +Math.abs(ejeDir.x).toFixed(3),
    largoEje: +eje.params.height.toFixed(1),
    ladoPilar: +Math.min(ls.x, ls.z).toFixed(1),
    grosorRueda: +(rold.localSizeAbs().y * Math.abs(rold.mesh.scale.y)).toFixed(2),
    radioRueda: +(rold.localSizeAbs().x / 2).toFixed(2),
    desvioLateral: +desvio.toFixed(2),
    altura: +centro.y.toFixed(1),
    agrupada: !!ed.objGroup.get(rold.id),
  };
});
console.log("4-roldana interna:", JSON.stringify(R));

// ── 5) Cable: baja por DENTRO del pilar y sale por la ventana ─────────────
const C = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const rold = ed.getObject(window.__rold);
  const c = rold.mesh.position.clone();
  // Anclaje arriba, en el eje del pilar; agarre delante, más abajo: el
  // recorrido queda en el plano de la rueda (vertical, con +Z).
  const arriba = ed.addComponent("terminal-cable", new T.Vector3(0, 190, 0));
  arriba.physics = { ...arriba.physics, fixed: true };
  const agarre = ed.addComponent("agarre-d", new T.Vector3(0, c.y - 45, 38));
  ed.createCable([
    { objectId: arriba.id, local: { x: 0, y: 0, z: 0 } },
    { objectId: rold.id, local: { x: 0, y: 0, z: 0 } },
    { objectId: agarre.id, local: { x: 0, y: 4, z: 0 } },
  ]);
  ed.select(null);
  ed.setEdges(true);
  ed.orbit.target.copy(c);
  ed.sceneManager.camera.position.copy(c.clone().add(new T.Vector3(10, 6, 44)));
  ed.orbit.update?.();
  ed.requestRender?.();
  return { cables: ed.listCables().length };
});
await page.waitForTimeout(1000);
const C2 = await page.evaluate(() => ({
  invalidos: window.exersuite.editor.cablesInvalidos.size,
}));
console.log("5-cable:", JSON.stringify({ ...C, ...C2 }));
await page.screenshot({ path: "vpilar-2-calado.png" });

// ── 6) Simulación: nada se descoloca ──────────────────────────────────────
const S = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  const rold = ed.getObject(window.__rold);
  const pilar = ed.getObject(window.__pilar);
  const p0 = rold.mesh.position.clone();
  const v0 = pilar.mesh.position.clone();
  await ed.toggleSimulation();
  for (let i = 0; i < 180; i++) ed.physics.step(1 / 60);
  const dR = +rold.mesh.position.distanceTo(p0).toFixed(2);
  const dP = +pilar.mesh.position.distanceTo(v0).toFixed(2);
  ed.toggleSimulation();
  return { derivaRoldana: dR, derivaPilar: dP, sigueSiendoPolea: ed.isPulley(rold) };
});
console.log("6-simulacion:", JSON.stringify(S));

const ok =
  P.creado && P.perfil[1] === 200 && P.perfil[0] === 8 &&
  fase1.host && fase1.ejeAzul && fase1.ejeVertical > 0.999 &&
  /coincide con el eje/.test(rechazo.aviso) && rechazo.roldanas === 0 &&
  rechazo.ventanas === 0 &&
  R.colocada && R.ventanas === 1 && R.ventana.eje === "z" &&
  R.trisDespues > P.trisAntes &&
  R.dentro === 0 && R.borde === 2 && R.lejos === 2 &&
  R.ejeAlineado > 0.999 && R.ejeHorizontal < 0.001 && R.ejeSobreX > 0.999 &&
  Math.abs(R.largoEje - R.ladoPilar) < 0.01 &&
  R.grosorRueda + 0.5 < R.ladoPilar &&
  // Ventana con eje "z": el plano es (X,Y) → du corre a lo ancho (eje de la
  // rueda) y dv A LO LARGO del pilar, que es donde debe caber su diámetro.
  R.ventana.dv > 2 * R.radioRueda && R.ventana.du > R.grosorRueda &&
  Math.abs(R.ventana.v - 60) < 3 && Math.abs(R.ventana.u) < 0.01 &&
  R.desvioLateral < 0.01 &&
  Math.abs(R.altura - 160) < 3 && R.agrupada &&
  C.cables === 1 && C2.invalidos === 0 &&
  S.derivaRoldana < 0.5 && S.derivaPilar < 0.5 && S.sigueSiendoPolea;
console.log(JSON.stringify({ ok }));
console.log("ERRORES:", errores.length ? errores.join("\n") : "ninguno");
await browser.close();
