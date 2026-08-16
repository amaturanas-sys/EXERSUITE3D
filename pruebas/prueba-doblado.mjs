// v0.2.20 doblado por nodos: (a) estirar un extremo NO acorta el contrario;
// (b) curvas centrípetas sin la sigmoidea de sobreoscilación.
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

// (a) Estirar el extremo superior +30: el extremo inferior no se mueve.
const A = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const p = ed.addComponent("pilar-linea", new T.Vector3(0, 60, 0));
  p.mesh.position.set(0, 60, 0);
  p.mesh.updateMatrixWorld(true);
  ed.select(p);
  ed.beginBendNodes();
  const mundo = (i) => {
    const n = p.params.path[i];
    return new T.Vector3(n[0], n[1], n[2]).applyMatrix4(p.mesh.matrixWorld);
  };
  const base0 = mundo(0).clone();
  const tope0 = mundo(p.params.path.length - 1).clone();
  ed.bendNodeIndex = p.params.path.length - 1;
  for (let k = 0; k < 3; k++) ed.nudgeBendNode(0, 10, 0);
  p.mesh.updateMatrixWorld(true);
  const base1 = mundo(0);
  const tope1 = mundo(p.params.path.length - 1);
  ed.endBendNodes();
  return {
    derivaBase: +base1.distanceTo(base0).toFixed(2),
    subidaTope: +(tope1.y - tope0.y).toFixed(1),
    largo: +base1.distanceTo(tope1).toFixed(1),
  };
});
console.log("estirar:", JSON.stringify(A));

// (b) Curva FLUIDA (chordal): la línea central apenas contra-comba al
// jalar un nodo — la sigmoidea de la uniforme queda descartada.
const B = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const p = ed.addComponent("pilar-linea", new T.Vector3(80, 60, 0));
  p.mesh.position.set(80, 60, 0);
  p.mesh.rotation.set(0, 0, 0);
  p.mesh.updateMatrixWorld(true);
  ed.select(p);
  ed.beginBendNodes();
  ed.bendNodeIndex = 2;
  for (let k = 0; k < 2; k++) ed.nudgeBendNode(10, 0, 0);
  const dip = (nodos) => {
    const c = new T.CatmullRomCurve3(nodos.map((n) => new T.Vector3(...n)), false, "chordal");
    let min = 1e9;
    for (const q of c.getSpacedPoints(300)) min = Math.min(min, q.x);
    return min;
  };
  const nodosCentro = JSON.parse(JSON.stringify(p.params.path));
  const centro = dip(p.params.path);
  const extremo = dip([[0, -50, 0], [0, -25, 0], [0, 0, 0], [0, 25, 0], [40, 50, 0]]);
  ed.endBendNodes();
  return { centro: +centro.toFixed(2), extremo: +extremo.toFixed(2), nodosCentro, rot: p.mesh.rotation.toArray().slice(0,3) };
});
console.log("curva (contra-comba):", JSON.stringify(B));
await page.evaluate(() => {
  const ed = window.exersuite.editor;
  ed.orbit.target.set(40, 80, 0);
  ed.sceneManager.camera.position.set(60, 90, 260);
  ed.orbit.update?.(); ed.requestRender?.();
});
await page.waitForTimeout(400);
await page.screenshot({ path: "v220-doblado.png" });
// uniforme: -1.5 (centro) / -3.0 (extremo) de contra-comba; chordal ≈ -1.
const ok = A.derivaBase < 0.5 && A.subidaTope > 28 && A.largo > 128 && A.largo < 132 &&
  B.centro > -1.2 && B.extremo > -1.3;
console.log(JSON.stringify({ ok }));
console.log("ERRORES:", errores.length ? errores.join("\n") : "ninguno");
await browser.close();
