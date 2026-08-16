// v0.2.38 · MANO INTERACTIVA sobre piezas ARTICULADAS: el brazo de press de
// la UpperMachine se moviliza arrastrando desde el agarre, con el puntero
// sobre el lienzo (no por API): la mano sigue el ARCO de la bisagra.
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
await page.evaluate(() => {
  [...document.querySelectorAll("#palette .comp-btn")]
    .find((b) => (b.textContent ?? "").trim().endsWith("UpperMachine")).click();
});
await page.waitForTimeout(1800);
const fallos = [];
const ok = (c, m) => { if (!c) fallos.push(m); console.log((c ? "✓ " : "✗ ") + m); };

// Arranca la simulación y deja que el conjunto se asiente.
const eje = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  ed.startSimulation();
  for (let i = 0; i < 120 && !ed.physics; i++) await new Promise((x) => setTimeout(x, 50));
  await new Promise((x) => setTimeout(x, 6000));
  ed.setSimHerramienta("mano"); // v0.2.41: la manipulación se elige a propósito
  const objs = [...ed.objects.values()];
  const b = ed.physics.ejeDeGiro(objs[39].id);
  return b ? { punto: b.punto.toArray().map((v) => +v.toFixed(1)), eje: b.eje.toArray().map((v) => +v.toFixed(2)) } : null;
});
ok(!!eje, `el motor conoce el eje de giro del brazo (${JSON.stringify(eje)})`);

// Apunta al AGARRE del brazo (tubo recto) y comprueba que el rayo lo alcanza
// justo antes de pulsar: la máquina sigue viva y el píxel caduca.
const mira = async () => page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const objs = [...ed.objects.values()];
  const BRAZO = [32, 34, 35, 37, 38, 39, 40];
  const idOf = (id) => objs.findIndex((o) => o.id === id);
  const rect = ed.sceneManager.renderer.domElement.getBoundingClientRect();
  const cam = ed.sceneManager.camera;
  for (const i of [39, 40, 37, 38, 34]) {
    const v = objs[i].mesh.position.clone().project(cam);
    const px = (v.x * 0.5 + 0.5) * rect.width;
    const py = (-v.y * 0.5 + 0.5) * rect.height;
    ed.raycaster.setFromCamera(new T.Vector2(v.x, v.y), cam);
    const h = ed.raycaster.intersectObjects(ed.sceneManager.content.children, true);
    if (h[0] && BRAZO.includes(idOf(h[0].object.userData.sceneObjectId))) {
      const e = new T.Euler().setFromQuaternion(objs[34].mesh.quaternion, "XYZ");
      return { x: Math.round(px + rect.left), y: Math.round(py + rect.top),
        i: idOf(h[0].object.userData.sceneObjectId), ang0: +T.MathUtils.radToDeg(e.x).toFixed(1) };
    }
  }
  return null;
});
let r = null;
for (let i = 0; i < 8 && !r; i++) { r = await mira(); if (!r) await page.waitForTimeout(400); }
ok(!!r, `hay un punto del brazo bajo el puntero (pieza ${r?.i})`);

// El gesto natural para mover un brazo es seguir SU ARCO: se recorren los
// píxeles de la circunferencia que la bisagra permite.
const ruta = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const objs = [...ed.objects.values()];
  const b = ed.physics.ejeDeGiro(objs[39].id);
  const p = objs[39].mesh.position.clone();
  const centro = b.punto.clone().add(b.eje.clone().multiplyScalar(p.clone().sub(b.punto).dot(b.eje)));
  const radio = p.clone().sub(centro);
  const rect = ed.sceneManager.renderer.domElement.getBoundingClientRect();
  const pts = [];
  for (let k = 0; k <= 45; k++) {
    const q = radio.clone().applyAxisAngle(b.eje, T.MathUtils.degToRad(-k)).add(centro);
    const v = q.project(ed.sceneManager.camera);
    pts.push([Math.round((v.x * 0.5 + 0.5) * rect.width), Math.round((-v.y * 0.5 + 0.5) * rect.height)]);
  }
  return pts;
});
await page.mouse.move(ruta[0][0], ruta[0][1]);
await page.mouse.down();
const traza = [];
for (let k = 1; k < ruta.length; k++) {
  await page.mouse.move(ruta[k][0], ruta[k][1]);
  await page.waitForTimeout(90);
  if (k % 9 === 0) traza.push(await page.evaluate(() => {
    const ed = window.exersuite.editor;
    const T = window.exersuite.THREE;
    const o = [...ed.objects.values()][34];
    const e = new T.Euler().setFromQuaternion(o.mesh.quaternion, "XYZ");
    return { a: +T.MathUtils.radToDeg(e.x).toFixed(1), d: ed.physics?.isDragging?.() ? 1 : 0 };
  }));
}
await page.waitForTimeout(1500);
await page.screenshot({ path: "v238-brazo.png" });
const fin = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const o = [...ed.objects.values()][34];
  const e = new T.Euler().setFromQuaternion(o.mesh.quaternion, "XYZ");
  return { ang: +T.MathUtils.radToDeg(e.x).toFixed(1), arrastrando: !!ed.physics?.isDragging?.(),
    arco: !!ed.simDrag?.arco, kg: +(ed.tensionManoKg?.() ?? 0).toFixed(1) };
});
await page.mouse.up();
console.log("traza:", JSON.stringify(traza));
console.log("fin:", JSON.stringify(fin), "ángulo inicial", r.ang0);

ok(fin.arrastrando, "la mano sigue enganchada durante todo el arrastre");
ok(fin.arco, "el arrastre reconoce el ARCO de la bisagra");
const giro = Math.abs(fin.ang - r.ang0);
ok(giro > 30, `el brazo recorre su arco siguiendo al puntero (${giro.toFixed(1)}° de los 45° pedidos)`);
ok(traza.every((t) => t.d === 1), "no se pierde el agarre a mitad de camino");
console.log("ERRORES:", errores.length ? errores.join("\n") : "ninguno");
console.log(fallos.length ? "❌ " + fallos.join(" · ") : "✅ todo correcto");
await browser.close();
