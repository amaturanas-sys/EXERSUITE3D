// v0.2.39 · El brazo articulado gira LIMPIO en su plano: empujado desde UN
// solo agarre describe su semicircunferencia sobre el eje transversal, sin
// torcerse ni salirse del plano sagital, y tira del cable (la pila sube).
import { chromium } from "playwright-core";
const browser = await chromium.launch({
  // El Chromium de Playwright ya instalado. Se puede apuntar a otro con
  // CHROMIUM=/ruta/al/chrome (ver LEEME.md).
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1000, height: 860 } });
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
await page.goto("http://127.0.0.1:4174/");
await page.waitForTimeout(1000);
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);
await page.evaluate(() => {
  [...document.querySelectorAll("#palette .comp-btn")]
    .find((b) => (b.textContent ?? "").trim().endsWith("UpperMachine")).click();
});
await page.waitForTimeout(1800);
const r = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const objs = [...ed.objects.values()];
  objs[20].stack.selected = 5; objs[20].rebuildStackVisual();
  const brazo = objs[34], d = objs[39], izq = objs[40];
  ed.startSimulation();
  for (let i = 0; i < 120 && !ed.physics; i++) await new Promise((x) => setTimeout(x, 50));
  await new Promise((x) => setTimeout(x, 6000));
  const b = ed.physics.ejeDeGiro(d.id);
  const P = b.punto.clone(), E = b.eje.clone();
  const angDe = (o) => {
    const v = o.mesh.position.clone().sub(P).projectOnPlane(E);
    return T.MathUtils.radToDeg(Math.atan2(v.z, -v.y));
  };
  const euler = () => {
    const e = new T.Euler().setFromQuaternion(brazo.mesh.quaternion, "XYZ");
    return [e.x, e.y, e.z].map((v) => +T.MathUtils.radToDeg(v).toFixed(1));
  };
  const medir = () => ({
    der: +angDe(d).toFixed(1), izq: +angDe(izq).toFixed(1),
    torsion: +(angDe(d) - angDe(izq)).toFixed(1),
    euler: euler(),
    xDer: +d.mesh.position.x.toFixed(1), xIzq: +izq.mesh.position.x.toFixed(1),
  });
  const traza = [medir()];
  const pila = objs[20];
  const y0 = pila.mesh.position.y;
  let subida = 0;
  const radio = d.mesh.position.clone().sub(P);
  ed.physics.grab(d.id, d.mesh.position.clone(), true);
  for (let k = 1; k <= 50; k++) {
    ed.physics.dragTo(radio.clone().applyAxisAngle(E, T.MathUtils.degToRad(-k)).add(P));
    await new Promise((x) => setTimeout(x, 140));
    subida = Math.max(subida, pila.mesh.position.y - y0);
    if (k % 10 === 0) traza.push(medir());
  }
  for (let k = 0; k < 30; k++) await new Promise((x) => setTimeout(x, 150));
  traza.push(medir());
  subida = Math.max(subida, pila.mesh.position.y - y0);
  const kg = +ed.tensionManoKg().toFixed(1);
  ed.physics.release();
  return { traza, pila: +subida.toFixed(1), kg };
});
for (const t of r.traza) console.log(JSON.stringify(t));
console.log("pila:", r.pila, "cm · kg:", r.kg);
const fallos = [];
const ok = (c, m) => { if (!c) fallos.push(m); console.log((c ? "✓ " : "✗ ") + m); };
const maxTors = Math.max(...r.traza.map((t) => Math.abs(t.torsion)));
const maxYaw = Math.max(...r.traza.map((t) => Math.abs(t.euler[1])));
const maxRoll = Math.max(...r.traza.map((t) => Math.abs(t.euler[2] - r.traza[0].euler[2])));
const derivaX = Math.max(...r.traza.map((t) => Math.abs(t.xIzq + 23.1)));
const giro = Math.abs(r.traza[r.traza.length - 1].der - r.traza[0].der);
ok(maxTors < 1.5, `los dos agarres van al mismo ángulo (torsión máx ${maxTors.toFixed(1)}°)`);
ok(maxYaw < 1.5, `no hay guiñada fuera del plano sagital (máx ${maxYaw.toFixed(1)}°)`);
ok(maxRoll < 2, `no hay balanceo del brazo (máx ${maxRoll.toFixed(1)}°)`);
ok(derivaX < 1, `los agarres no se desplazan de lado (máx ${derivaX.toFixed(1)} cm)`);
ok(giro > 30, `el brazo recorre su semicircunferencia (${giro.toFixed(1)}°)`);
ok(r.pila > 5, `el brazo TIRA DEL CABLE: la pila sube ${r.pila} cm`);
console.log(fallos.length ? "❌ " + fallos.join(" · ") : "✅ todo correcto");
await browser.close();
