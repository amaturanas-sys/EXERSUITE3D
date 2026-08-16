// v0.2.42 · REGRESIÓN: el cable no puede empujar una pieza DENTRO de otra.
// A/B sobre el mismo build: con el guardarraíl neutralizado la barra de jalón
// se hunde en el bastidor y la estación se muere; con él activo, sale sola y
// la estación mueve la pila. El press no debe empeorar.
import { chromium } from "playwright-core";
const browser = await chromium.launch({
  // El Chromium de Playwright ya instalado. Se puede apuntar a otro con
  // CHROMIUM=/ruta/al/chrome (ver LEEME.md).
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1180, height: 860 } });
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
const medidas = {};

for (const guardia of [false, true]) {
  medidas[guardia ? "con" : "sin"] = await page.evaluate(async (guardia) => {
    const ed = window.exersuite.editor, T = window.exersuite.THREE;
    for (const o of [...ed.objects.values()]) ed.removeObject(o);
    for (const j of ed.listJoints()) ed.removeJoint(j);
    [...document.querySelectorAll("#palette .comp-btn")]
      .find((b) => (b.textContent ?? "").trim().endsWith("UpperMachine")).click();
    await new Promise((x) => setTimeout(x, 1800));
    const objs = [...ed.objects.values()];
    const pivote = ed.listJoints().find((u) => !u.locked);
    if (pivote) pivote.limitsEnabled = true;
    if (objs[20]?.stack) { objs[20].stack.selected = 5; objs[20].rebuildStackVisual(); }
    ed.startSimulation();
    for (let i = 0; i < 160 && !ed.physics; i++) await new Promise((x) => setTimeout(x, 50));
    const ph = ed.physics, proto = Object.getPrototypeOf(ph);
    if (!proto.__origFrenar) proto.__origFrenar = proto.frenarAtravesamiento;
    proto.frenarAtravesamiento = guardia ? proto.__origFrenar : function () {};
    await new Promise((x) => setTimeout(x, 4000));

    const barra = objs[17], agarre = objs[39], pila = objs[20];
    const bastidor = objs.find((o) => /Bastidor superior/i.test(o.name));
    const ejes = (q) => {
      const m = new T.Matrix4().makeRotationFromQuaternion(new T.Quaternion(q.x, q.y, q.z, q.w));
      return [new T.Vector3().setFromMatrixColumn(m, 0), new T.Vector3().setFromMatrixColumn(m, 1), new T.Vector3().setFromMatrixColumn(m, 2)];
    };
    const cajas = (body) => {
      const out = [];
      for (let i = 0; i < body.numColliders(); i++) {
        const c = body.collider(i);
        if (!c.shape.halfExtents || c.isSensor()) continue;
        out.push({ p: c.translation(), e: ejes(c.rotation()), H: [c.shape.halfExtents.x, c.shape.halfExtents.y, c.shape.halfExtents.z] });
      }
      return out;
    };
    const sep = (A, B) => {
      const d = new T.Vector3(B.p.x - A.p.x, B.p.y - A.p.y, B.p.z - A.p.z);
      const cand = [...A.e, ...B.e];
      for (const a of A.e) for (const b of B.e) {
        const c = new T.Vector3().crossVectors(a, b);
        if (c.lengthSq() > 1e-8) cand.push(c.normalize());
      }
      let mejor = -Infinity;
      for (const ax of cand) {
        let ra = 0, rb = 0;
        for (let i = 0; i < 3; i++) ra += A.H[i] * Math.abs(A.e[i].dot(ax));
        for (let i = 0; i < 3; i++) rb += B.H[i] * Math.abs(B.e[i].dot(ax));
        mejor = Math.max(mejor, Math.abs(d.dot(ax)) - (ra + rb));
      }
      return mejor;
    };
    const bB = ph.bodies.get(barra.id).body, bF = ph.bodies.get(bastidor.id).body;
    let incruste = Infinity;
    const mide = () => { for (const a of cajas(bB)) for (const b of cajas(bF)) incruste = Math.min(incruste, sep(a, b)); };

    const y0 = pila.mesh.position.y;
    const bg = ph.ejeDeGiro(agarre.id);
    const P = bg.punto.clone(), E = bg.eje.clone();
    const radio = agarre.mesh.position.clone().sub(P);
    ph.grab(agarre.id, agarre.mesh.position.clone(), true);
    let press = 0;
    for (let k = 1; k <= 45; k++) {
      ph.dragTo(radio.clone().applyAxisAngle(E, T.MathUtils.degToRad(-k)).add(P));
      await new Promise((x) => setTimeout(x, 80));
      press = Math.max(press, pila.mesh.position.y - y0);
      mide();
    }
    ph.release();
    await new Promise((x) => setTimeout(x, 5000));
    mide();
    const y1 = pila.mesh.position.y;
    const p0 = barra.mesh.position.clone();
    ph.grab(barra.id, p0.clone());
    let jalon = 0;
    for (let k = 1; k <= 40; k++) {
      ph.dragTo(p0.clone().add(new T.Vector3(0, -Math.min(3 + k * 3, 90), 2 + k * 0.4)));
      await new Promise((x) => setTimeout(x, 80));
      jalon = Math.max(jalon, pila.mesh.position.y - y1);
      mide();
    }
    ph.release();
    await new Promise((x) => setTimeout(x, 2500));
    mide();
    proto.frenarAtravesamiento = proto.__origFrenar;
    const res = {
      press: +press.toFixed(1), jalon: +jalon.toFixed(1),
      incrusteCm: +(incruste * 100).toFixed(2),
      avisos: ph.avisosDeArmado().length,
    };
    ed.stopSimulation();
    await new Promise((x) => setTimeout(x, 1200));
    return res;
  }, guardia);
}
const sin = medidas.sin, con = medidas.con;
console.log("sin guardarraíl:", JSON.stringify(sin));
console.log("con guardarraíl:", JSON.stringify(con));
ok(sin.incrusteCm < -2, `sin el guardarraíl el cable hunde la barra en el bastidor (${sin.incrusteCm} cm)`);
ok(con.incrusteCm > sin.incrusteCm + 1.5, `con el guardarraíl deja de hundirla (${con.incrusteCm} cm, ${(con.incrusteCm - sin.incrusteCm).toFixed(2)} cm menos)`);
ok(con.jalon > 2, `el jalón vuelve a mover la pila (${con.jalon} cm frente a ${sin.jalon} cm sin guardarraíl)`);
ok(sin.jalon < 5, `sin el guardarraíl el jalón estaba muerto (${sin.jalon} cm)`);
// El press NO se compara contra la rama rota: sin guardarraíl el cable
// teletransporta y la pila llega a dispararse (59,9 cm medidos de un tirón),
// así que esa referencia no está acotada. Basta con que la estación siga viva.
ok(con.press > 2, `el press sigue funcionando con el guardarraíl (${con.press} cm; la rama sin guardarraíl no es referencia: la pila se dispara)`);
ok(con.avisos === 0, `sin avisos de armado (${con.avisos})`);
console.log("ERRORES:", errores.length ? errores.join("\n") : "ninguno");
console.log(fallos.length ? "❌ " + fallos.join(" · ") : "✅ todo correcto");
await browser.close();
process.exit(fallos.length ? 1 : 0);
