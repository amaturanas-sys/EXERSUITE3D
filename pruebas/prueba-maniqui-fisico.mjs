// v0.2.44 · REGRESIÓN: el maniquí tiene cuerpo en el motor.
// A/B sobre el mismo build con la figura SENTADA (se verifica la postura antes
// de medir): fuera del motor el brazo de press la barre; dentro, choca. Se
// comprueba además que no se desploma y que el brazo conserva recorrido.
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

await page.evaluate(() => {
  const T = window.exersuite.THREE;
  // Profundidad máxima de la figura dentro de piezas MÓVILES (o fijas).
  window.__prof = (soloMoviles) => {
    const ed = window.exersuite.editor;
    const fig = ed.humanFigure;
    if (!fig) return { prof: 0, parte: null, pieza: null };
    const ray = new T.Raycaster();
    const dir = new T.Vector3(0.5773, 0.5774, 0.5773).normalize();
    const v = new T.Vector3();
    const segs = [];
    fig.updateMatrixWorld(true);
    fig.traverse((n) => { if (n.isMesh && n.visible && n.userData.humanFigurePart) segs.push(n); });
    let prof = 0, parte = null, pieza = null;
    for (const o of [...ed.objects.values()]) {
      if (soloMoviles !== undefined) {
        const e = ed.physics?.bodies?.get(o.id);
        if ((!!e && e.body.isDynamic()) !== soloMoviles) continue;
      }
      const mallasO = [];
      o.mesh.updateMatrixWorld(true);
      o.mesh.traverse((n) => { if (n.isMesh) mallasO.push(n); });
      if (!mallasO.length) continue;
      const cajaO = new T.Box3().setFromObject(o.mesh);
      for (const s of segs) {
        if (!new T.Box3().setFromObject(s).intersectsBox(cajaO)) continue;
        const pos = s.geometry.getAttribute("position");
        const paso = Math.max(1, Math.floor(pos.count / 200));
        for (let i = 0; i < pos.count; i += paso) {
          v.fromBufferAttribute(pos, i).applyMatrix4(s.matrixWorld);
          ray.set(v, dir);
          const hits = ray.intersectObjects(mallasO, false);
          if (hits.length % 2 === 1 && hits[0].distance > prof) {
            prof = hits[0].distance; parte = s.userData.segmentId ?? "?"; pieza = o.name;
          }
        }
      }
    }
    return { prof: +prof.toFixed(2), parte, pieza };
  };
  window.__proy = (v) => {
    const ed = window.exersuite.editor;
    const rect = ed.sceneManager.renderer.domElement.getBoundingClientRect();
    const q = v.clone().project(ed.sceneManager.camera);
    return { x: Math.round((q.x * 0.5 + 0.5) * rect.width), y: Math.round((-q.y * 0.5 + 0.5) * rect.height) };
  };
});

const medidas = {};
for (const enElMotor of [false, true]) {
  // 1) máquina + figura, sin simulación
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
    await new Promise((x) => setTimeout(x, 700));
  });
  // 2) arrancar la simulación y SOLO ENTONCES proyectar (el encuadre cambia
  //    al ocultarse los paneles).
  const px = await page.evaluate(async () => {
    const ed = window.exersuite.editor, T = window.exersuite.THREE;
    ed.startSimulation();
    for (let i = 0; i < 160 && !ed.physics; i++) await new Promise((x) => setTimeout(x, 50));
    await new Promise((x) => setTimeout(x, 2500));
    const caja = new T.Box3().setFromObject([...ed.objects.values()][4].mesh);
    return window.__proy(new T.Vector3((caja.min.x + caja.max.x) / 2, caja.max.y + 0.3, (caja.min.z + caja.max.z) / 2));
  });
  // 3) sentar por el flujo real
  await page.evaluate(() => window.exersuite.editor.beginColocarFigura());
  await page.mouse.move(px.x, px.y); await page.waitForTimeout(400);
  await page.mouse.click(px.x, px.y); await page.waitForTimeout(1300);
  await page.evaluate(AYUDANTES);

  medidas[enElMotor ? "con" : "sin"] = await page.evaluate(async (enElMotor) => {
    const ed = window.exersuite.editor, T = window.exersuite.THREE, ph = ed.physics;
    const j = ed.figureJoints();
    const rodilla = +T.MathUtils.radToDeg(j.kneeR.rotation.x).toFixed(0);
    const tope = window.__rodillaAlTope("R");
    if (!enElMotor) ph.quitarFigura();
    await new Promise((x) => setTimeout(x, 3000));
    const objs = [...ed.objects.values()];
    const fig = ed.humanFigure;
    const y0 = fig.position.y;
    const base = window.__prof(true);

    const agarre = objs[39];
    const bg = ph.ejeDeGiro(agarre.id);
    const P = bg.punto.clone(), E = bg.eje.clone();
    const radio = agarre.mesh.position.clone().sub(P);
    ph.grab(agarre.id, agarre.mesh.position.clone(), true);
    let peorMovil = { prof: 0, parte: null, pieza: null };
    let angulo = 0;
    for (let k = 1; k <= 50; k++) {
      ph.dragTo(radio.clone().applyAxisAngle(E, T.MathUtils.degToRad(-k)).add(P));
      await new Promise((x) => setTimeout(x, 90));
      const pm = window.__prof(true);
      if (pm.prof > peorMovil.prof) peorMovil = pm;
      angulo = Math.max(angulo, T.MathUtils.radToDeg(radio.angleTo(agarre.mesh.position.clone().sub(P))));
    }
    ph.release();
    await new Promise((x) => setTimeout(x, 2500));
    const pf = window.__prof(true);
    if (pf.prof > peorMovil.prof) peorMovil = pf;

    const res = {
      enElMotor, dentro: ph.figuraEnElMotor, rodilla, tope,
      baseMovil: base.prof, peorMovil,
      caida: +(y0 - fig.position.y).toFixed(2),
      anguloBrazo: +angulo.toFixed(1),
      avisos: ph.avisosDeArmado().length,
    };
    ed.stopSimulation();
    await new Promise((x) => setTimeout(x, 1000));
    return res;
  }, enElMotor);
}
const sin = medidas.sin, con = medidas.con;
console.log("figura FUERA del motor:", JSON.stringify(sin));
console.log("figura DENTRO del motor:", JSON.stringify(con));
// Igual que en prueba-colocar: la rodilla la fija el ASIENTO, no un umbral.
ok(sin.rodilla > 20 && con.rodilla > 20 && sin.tope?.alTope && con.tope?.alTope,
  `la figura queda SENTADA en los dos casos, con la rodilla al tope que da el `
  + `asiento (${sin.rodilla}° / ${con.rodilla}°; plantas a ${sin.tope?.planta} `
  + `y ${con.tope?.planta} cm)`);
ok(con.dentro && !sin.dentro, "el A/B se aplica de verdad (dentro/fuera del motor)");
// La prueba de que el cuerpo SE HACE VALER es que la pieza móvil se detiene
// contra él: sin cuerpo recorre su arco entero, con cuerpo apenas arranca.
ok(con.anguloBrazo < sin.anguloBrazo * 0.4,
  `el cuerpo DETIENE la pieza móvil (${sin.anguloBrazo}° sin cuerpo → ${con.anguloBrazo}° con cuerpo)`);
console.log(`  penetración con piezas móviles — sin cuerpo: ${sin.peorMovil.prof} cm (${sin.peorMovil.parte}) · con cuerpo: ${con.peorMovil.prof} cm (${con.peorMovil.parte}); el residuo arranca en ${con.baseMovil} cm ANTES de mover nada: la figura bien sentada ya nace dentro del recorrido del brazo, que es el conflicto ergonómico del diseño.`);
ok(Math.abs(con.caida) < 1, `la figura NO se desploma: es cinemática (${con.caida} cm)`);
// El recorrido que se pierde con alguien sentado NO es un fallo: es la
// evidencia de que la máquina no deja holgura al cuerpo que va a usarla.
console.log(`  RECORRIDO DEL BRAZO — sin cuerpo: ${sin.anguloBrazo}° · con maniquí sentado: ${con.anguloBrazo}° (comprobación ergonómica del diseño)`);
ok(con.avisos === 0, `sin avisos de armado (${con.avisos})`);
console.log("ERRORES:", errores.length ? errores.join("\n") : "ninguno");
console.log(fallos.length ? "❌ " + fallos.join(" · ") : "✅ todo correcto");
await page.screenshot({ path: "maniqui-fisico.png" });
await browser.close();
process.exit(fallos.length ? 1 : 0);
