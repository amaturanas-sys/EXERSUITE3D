// v0.2.42 · A/B del barrido anti-atravesamiento del cable.
// Mismo build, mismo guion: primero con el guardarraíl NEUTRALIZADO y luego
// activo. Se mide recorrido de la pila en las dos estaciones, cuánto se
// incrusta la barra en el bastidor y cuánto atravesamiento se evita.
import { chromium } from "playwright-core";
const browser = await chromium.launch({
  // El Chromium de Playwright ya instalado. Se puede apuntar a otro con
  // CHROMIUM=/ruta/al/chrome (ver LEEME.md).
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1180, height: 860 } });
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
await page.goto("http://127.0.0.1:4174/");
await page.waitForTimeout(1000);
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);

for (const guardia of [false, true]) {
  const r = await page.evaluate(async (guardia) => {
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
    const ph = ed.physics;
    const proto = Object.getPrototypeOf(ph);
    if (!proto.__origFrenar) proto.__origFrenar = proto.frenarAtravesamiento;
    const orig = proto.__origFrenar;
    let recortes = 0, mmEvitados = 0;
    if (guardia) {
      proto.frenarAtravesamiento = function () {
        const antes = new Map();
        for (const [b] of this.posCable) antes.set(b, { ...b.translation() });
        orig.call(this);
        for (const [b, a] of antes) {
          const t = b.translation();
          const d = Math.hypot(t.x - a.x, t.y - a.y, t.z - a.z);
          if (d > 1e-9) { recortes++; mmEvitados += d * 1000; }
        }
      };
    } else {
      proto.frenarAtravesamiento = function () {};
    }
    await new Promise((x) => setTimeout(x, 4000));

    // --- ¿cuánto se incrusta la barra en el bastidor? -------------------
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
    const bBarra = ph.bodies.get(barra.id).body;
    const bBast = bastidor ? ph.bodies.get(bastidor.id).body : null;
    let incrusteMin = Infinity;
    const medirIncruste = () => {
      if (!bBast) return;
      const A = cajas(bBarra), B = cajas(bBast);
      for (const a of A) for (const b of B) incrusteMin = Math.min(incrusteMin, sep(a, b));
    };

    const y0 = pila.mesh.position.y;
    const bg = ph.ejeDeGiro(agarre.id);
    const P = bg.punto.clone(), E = bg.eje.clone();
    const radio = agarre.mesh.position.clone().sub(P);
    ph.grab(agarre.id, agarre.mesh.position.clone(), true);
    let press = 0, kgP = 0;
    for (let k = 1; k <= 45; k++) {
      ph.dragTo(radio.clone().applyAxisAngle(E, T.MathUtils.degToRad(-k)).add(P));
      await new Promise((x) => setTimeout(x, 80));
      press = Math.max(press, pila.mesh.position.y - y0);
      kgP = Math.max(kgP, ed.tensionManoKg());
      medirIncruste();
    }
    ph.release();
    await new Promise((x) => setTimeout(x, 5000));
    medirIncruste();

    const y1 = pila.mesh.position.y;
    const p0 = barra.mesh.position.clone();
    ph.grab(barra.id, p0.clone());
    let jalon = 0, kgJ = 0;
    for (let k = 1; k <= 40; k++) {
      ph.dragTo(p0.clone().add(new T.Vector3(0, -Math.min(3 + k * 3, 90), 2 + k * 0.4)));
      await new Promise((x) => setTimeout(x, 80));
      jalon = Math.max(jalon, pila.mesh.position.y - y1);
      kgJ = Math.max(kgJ, ed.tensionManoKg());
      medirIncruste();
    }
    ph.release();
    await new Promise((x) => setTimeout(x, 2500));
    medirIncruste();

    // coste por paso
    const t0 = performance.now();
    for (let i = 0; i < 60; i++) ph.step(1 / 60);
    const msPaso = (performance.now() - t0) / 60;

    proto.frenarAtravesamiento = orig;
    const res = {
      guardia, press: +press.toFixed(1), kgP: +kgP.toFixed(1),
      jalon: +jalon.toFixed(1), kgJ: +kgJ.toFixed(1),
      incrusteCm: +(incrusteMin * 100).toFixed(3),
      recortes, mmEvitados: +mmEvitados.toFixed(1),
      msPaso: +msPaso.toFixed(2),
      avisos: ph.avisosDeArmado().length,
    };
    ed.stopSimulation();
    await new Promise((x) => setTimeout(x, 1200));
    return res;
  }, guardia);
  console.log(JSON.stringify(r));
}
await browser.close();
