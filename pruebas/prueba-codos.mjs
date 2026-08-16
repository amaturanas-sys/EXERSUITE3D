// v0.2.38 · MANIQUÍ: el codo flexiona hacia DELANTE (al revés que la rodilla).
// Con los huesos en reposo sobre -Y y la figura mirando a +Z, la muñeca debe
// quedar POR DELANTE del codo al flexionar, y la pantorrilla POR DETRÁS de la
// rodilla.
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

const r = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  if (!ed.figureJoints()) await ed.addHumanFigure();
  await new Promise((x) => setTimeout(x, 600));
  const medir = () => {
    const j = ed.figureJoints();
    ed.humanFigure ?? null;
    const w = (n) => j[n].getWorldPosition(new T.Vector3());
    return {
      hombro: w("shoulderR").toArray().map((v) => +v.toFixed(1)),
      codo: w("elbowR").toArray().map((v) => +v.toFixed(1)),
      muneca: w("wristR").toArray().map((v) => +v.toFixed(1)),
      rodilla: w("kneeR").toArray().map((v) => +v.toFixed(1)),
      tobillo: w("ankleR").toArray().map((v) => +v.toFixed(1)),
    };
  };
  // 1) Flexión pura del codo desde la postura de pie.
  ed.applyPose?.("De pie");
  await new Promise((x) => setTimeout(x, 300));
  const j = ed.figureJoints();
  j.elbowR.rotation.set(T.MathUtils.degToRad(-90), 0, 0);
  j.kneeR.rotation.set(T.MathUtils.degToRad(90), 0, 0);
  ed.humanFigure.updateMatrixWorld(true);
  const flex = medir();
  // 2) Rango declarado de cada articulación.
  const dof = window.exersuite.JOINT_DOF ?? null;
  // 3) Posturas de fábrica.
  const poses = {};
  for (const nombre of ["Sentado", "Remo", "Press"]) {
    ed.applyPose(nombre);
    ed.humanFigure.updateMatrixWorld(true);
    await new Promise((x) => setTimeout(x, 200));
    poses[nombre] = medir();
  }
  ed.applyPose("Sentado");
  ed.humanFigure.updateMatrixWorld(true);
  return { flex, poses, dof };
});
console.log("flexión 90°:", JSON.stringify(r.flex));
for (const [n, v] of Object.entries(r.poses)) console.log(n + ":", JSON.stringify(v));

// El codo flexionado adelanta la muñeca; la rodilla flexionada atrasa el tobillo.
ok(r.flex.muneca[2] > r.flex.codo[2] + 5, `codo: la muñeca queda DELANTE del codo (z ${r.flex.muneca[2]} > ${r.flex.codo[2]})`);
ok(r.flex.tobillo[2] < r.flex.rodilla[2] - 5, `rodilla: el tobillo queda DETRÁS de la rodilla (z ${r.flex.tobillo[2]} < ${r.flex.rodilla[2]})`);
ok(r.poses.Sentado.muneca[2] > r.poses.Sentado.codo[2], "postura Sentado: antebrazo hacia delante");
ok(r.poses.Remo.muneca[2] > r.poses.Remo.codo[2], "postura Remo: antebrazo hacia delante");

await page.click("text=▶ Simular").catch(() => {});
await page.waitForTimeout(600);
await page.screenshot({ path: "v238-codos.png" });
console.log("ERRORES:", errores.length ? errores.join("\n") : "ninguno");
console.log(fallos.length ? "❌ " + fallos.join(" · ") : "✅ todo correcto");
await browser.close();
