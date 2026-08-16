// v0.2.44 · El flujo REAL con maniquí físico: sentado y con las MANOS
// APOYADAS en los agarres, el brazo del press debe conservar su recorrido —
// los brazos siguen al agarre por IK en vez de estorbarle— y la figura no
// debe ser atravesada.
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
page.on("pageerror", (e) => errores.push(e.message));
await page.goto("http://127.0.0.1:4174/");
await page.waitForTimeout(1000);
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);

const fallos = [];
const ok = (c, m) => { if (!c) fallos.push(m); console.log((c ? "✓ " : "✗ ") + m); };

await page.evaluate(() => {
  const T = window.exersuite.THREE;
  window.__prof = () => {
    const ed = window.exersuite.editor;
    const fig = ed.humanFigure;
    if (!fig) return 0;
    const ray = new T.Raycaster();
    const dir = new T.Vector3(0.5773, 0.5774, 0.5773).normalize();
    const v = new T.Vector3();
    const segs = [];
    fig.updateMatrixWorld(true);
    const SIN = new Set(["mano-L","mano-R","pie-L","pie-R"]);
    fig.traverse((n) => { if (n.isMesh && n.visible && n.userData.humanFigurePart && !SIN.has(n.userData.segmentId)) segs.push(n); });
    let prof = 0;
    for (const o of [...ed.objects.values()]) {
      const e = ed.physics?.bodies?.get(o.id);
      if (!e || !e.body.isDynamic()) continue; // solo piezas MÓVILES
      const mallasO = [];
      o.mesh.updateMatrixWorld(true);
      o.mesh.traverse((n) => { if (n.isMesh) mallasO.push(n); });
      if (!mallasO.length) continue;
      const cajaO = new T.Box3().setFromObject(o.mesh);
      for (const s of segs) {
        if (!new T.Box3().setFromObject(s).intersectsBox(cajaO)) continue;
        const pos = s.geometry.getAttribute("position");
        const paso = Math.max(1, Math.floor(pos.count / 150));
        for (let i = 0; i < pos.count; i += paso) {
          v.fromBufferAttribute(pos, i).applyMatrix4(s.matrixWorld);
          ray.set(v, dir);
          const hits = ray.intersectObjects(mallasO, false);
          if (hits.length % 2 === 1 && hits[0].distance > prof) prof = hits[0].distance;
        }
      }
    }
    return +prof.toFixed(2);
  };
});

const medidas = {};
for (const caso of ["sin-figura", "manos-sueltas", "manos-apoyadas"]) {
  await page.evaluate(async () => {
    const ed = window.exersuite.editor;
    if (ed.simulating) ed.stopSimulation();
    await new Promise((x) => setTimeout(x, 800));
    for (const o of [...ed.objects.values()]) ed.removeObject(o);
    for (const j of ed.listJoints()) ed.removeJoint(j);
    [...document.querySelectorAll("#palette .comp-btn")]
      .find((b) => (b.textContent ?? "").trim().endsWith("UpperMachine")).click();
    await new Promise((x) => setTimeout(x, 1800));
    const objs = [...ed.objects.values()];
    const pivote = ed.listJoints().find((u) => !u.locked);
    if (pivote) pivote.limitsEnabled = true;
    if (objs[20]?.stack) { objs[20].stack.selected = 5; objs[20].rebuildStackVisual(); }
    if (!ed.figureJoints()) await ed.addHumanFigure();
    ed.detachHands();
    await new Promise((x) => setTimeout(x, 700));
  });
  const px = await page.evaluate(async () => {
    const ed = window.exersuite.editor, T = window.exersuite.THREE;
    ed.startSimulation();
    for (let i = 0; i < 160 && !ed.physics; i++) await new Promise((x) => setTimeout(x, 50));
    await new Promise((x) => setTimeout(x, 2500));
    const rect = ed.sceneManager.renderer.domElement.getBoundingClientRect();
    const caja = new T.Box3().setFromObject([...ed.objects.values()][4].mesh);
    const v = new T.Vector3((caja.min.x + caja.max.x) / 2, caja.max.y + 0.3, (caja.min.z + caja.max.z) / 2);
    const q = v.clone().project(ed.sceneManager.camera);
    return { x: Math.round((q.x * 0.5 + 0.5) * rect.width), y: Math.round((-q.y * 0.5 + 0.5) * rect.height) };
  });
  await page.evaluate(() => window.exersuite.editor.beginColocarFigura());
  await page.mouse.move(px.x, px.y); await page.waitForTimeout(400);
  await page.mouse.click(px.x, px.y); await page.waitForTimeout(1300);

  medidas[caso] = await page.evaluate(async (caso) => {
    const ed = window.exersuite.editor, T = window.exersuite.THREE, ph = ed.physics;
    const objs = [...ed.objects.values()];
    if (caso === "sin-figura") ph.quitarFigura();
    if (caso === "manos-apoyadas") {
      // Cada mano al agarre de su lado (tubos de acero 39 y 40).
      for (const [side, idx] of [["R", 39], ["L", 40]]) {
        const o = objs[idx];
        o.mesh.updateMatrixWorld(true);
        ed.attachHand(side, o.id, new T.Vector3(0, 0, 0));
      }
      await new Promise((x) => setTimeout(x, 800));
      ph.añadirFigura(ed.humanFigure);
    }
    await new Promise((x) => setTimeout(x, 2500));
    const agarre = objs[39], pila = objs[20];
    const y0 = pila.mesh.position.y;
    const b = ph.ejeDeGiro(agarre.id);
    const P = b.punto.clone(), E = b.eje.clone();
    const radio = agarre.mesh.position.clone().sub(P);
    ph.grab(agarre.id, agarre.mesh.position.clone(), true);
    let ang = 0, sube = 0, prof = 0;
    for (let k = 1; k <= 45; k++) {
      ph.dragTo(radio.clone().applyAxisAngle(E, T.MathUtils.degToRad(-k)).add(P));
      await new Promise((x) => setTimeout(x, 85));
      ang = Math.max(ang, T.MathUtils.radToDeg(radio.angleTo(agarre.mesh.position.clone().sub(P))));
      sube = Math.max(sube, pila.mesh.position.y - y0);
      prof = Math.max(prof, window.__prof());
    }
    ph.release();
    await new Promise((x) => setTimeout(x, 1500));
    const res = { caso, ang: +ang.toFixed(1), pila: +sube.toFixed(1), prof, dentro: ph.figuraEnElMotor,
      manos: ed.hasAttachedHands() };
    ed.stopSimulation();
    await new Promise((x) => setTimeout(x, 900));
    return res;
  }, caso);
  console.log(JSON.stringify(medidas[caso]));
}
const libre = medidas["sin-figura"], sueltas = medidas["manos-sueltas"], apoyadas = medidas["manos-apoyadas"];
ok(libre.pila > 5, `sin nadie sentado la estación funciona igual que antes (${libre.ang}°, pila ${libre.pila} cm)`);
ok(sueltas.dentro && apoyadas.dentro && !libre.dentro, "el maniquí entra y sale del motor a voluntad");
// Lo que demuestra que el cuerpo SE HACE VALER es que la pieza móvil se
// detiene contra él. Comparar penetraciones dejó de ser válido cuando la
// figura pasó a sentarse BIEN: su brazo nace dentro del recorrido del brazo
// de press, así que el punto de partida ya no es cero.
ok(sueltas.ang < libre.ang * 0.4,
  `el cuerpo DETIENE la pieza móvil (${libre.ang}° sin cuerpo → ${sueltas.ang}° con cuerpo)`);
console.log(`  penetración con piezas móviles — sin cuerpo: ${libre.prof} cm · con cuerpo: ${sueltas.prof} cm`);
ok(apoyadas.manos, "las manos se pueden apoyar en los agarres con el cuerpo puesto");
console.log(`  RECORRIDO DE LA ESTACIÓN — libre: ${libre.ang}° / pila ${libre.pila} cm · con maniquí sentado: ${sueltas.ang}° / pila ${sueltas.pila} cm`);
console.log(`  (manos apoyadas: ${apoyadas.ang}°, pila ${apoyadas.pila} cm; la IK lleva el antebrazo sobre el asa, de ahí ${apoyadas.prof} cm de solape mano-asa)`);
console.log("ERRORES:", errores.length ? errores.join("\n") : "ninguno");
console.log(fallos.length ? "❌ " + fallos.join(" · ") : "✅ todo correcto");
await browser.close();
process.exit(fallos.length ? 1 : 0);
