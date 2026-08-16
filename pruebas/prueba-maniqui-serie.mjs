// El maniqui viene DE SERIE: sale el cuerpo sin que el usuario cargue nada,
// en su azul de referencia, y se sigue posando.
import { chromium } from "playwright-core";

const IDS = ["cabeza","cuello","torso","pelvis","brazo-sup-L","brazo-sup-R",
  "antebrazo-L","antebrazo-R","mano-L","mano-R","muslo-L","muslo-R",
  "pierna-L","pierna-R","pie-L","pie-R"];

let fallos = 0;
const ok = (c, m) => { console.log((c ? "✓ " : "✗ ") + m); if (!c) fallos++; };

const b = await chromium.launch({
  // El Chromium de Playwright ya instalado. Se puede apuntar a otro con
  // CHROMIUM=/ruta/al/chrome (ver LEEME.md).
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const p = await b.newPage({ viewport: { width: 1100, height: 900 } });
const errs = [];
p.on("pageerror", (e) => errs.push("PAGEERROR: " + e.message));

await p.goto("http://127.0.0.1:4174/");
await p.waitForTimeout(900);
await p.click("text=🛠 BUILDER"); await p.waitForTimeout(300);
await p.click("text=Crear nuevo proyecto"); await p.waitForTimeout(300);
await p.click(".wizard-carta:has-text('Profesional')"); await p.waitForTimeout(300);
await p.click(".wizard-carta:has-text('Canvas libre')"); await p.waitForTimeout(2500);

// NADA de cargar modelos: tiene que estar ya puesto.
const serie = await p.evaluate((ids) => ({
  con: ids.filter((i) => window.exersuiteSegments.has(i)).length,
  deSerie: ids.filter((i) => window.exersuiteSegments.source(i) === "file").length,
}), IDS);
ok(serie.con === 16, `los 16 segmentos estan cargados sin tocar nada (${serie.con})`);
ok(serie.deSerie === 16, `y los 16 vienen DE SERIE (${serie.deSerie})`);

await p.evaluate(() => window.exersuite.editor.toggleHumanFigure());
await p.waitForTimeout(2500);
ok(await p.evaluate(() => window.exersuite.editor.hasHumanFigure()), "la figura se crea");

const m = await p.evaluate(() => {
  const T = window.exersuite.THREE;
  let g = null;
  window.exersuite.editor.sceneManager.scene.traverse((o) => { if (o.userData?.isHumanFigure) g = o; });
  const bb = new T.Box3().setFromObject(g);
  let conModelo = 0, conTextura = 0, azules = 0;
  g.traverse((o) => {
    if (!o.isMesh || !o.userData?.segmentId) return;
    if (o.geometry.type === "BufferGeometry") conModelo++;
    if (o.material?.map) conTextura++;
    if (o.material?.color?.getHex() === 0x2f7dd1) azules++;
  });
  return { alto: bb.max.y - bb.min.y, suelo: bb.min.y, ancho: bb.max.x - bb.min.x,
           conModelo, conTextura, azules };
});
ok(Math.abs(m.alto - 175) < 2, `mide ${m.alto.toFixed(1)} cm`);
ok(Math.abs(m.suelo) < 2, `los pies apoyan en el suelo (y = ${m.suelo.toFixed(2)})`);
ok(m.conModelo === 16, `los 16 segmentos usan el modelo, no la primitiva (${m.conModelo})`);
ok(m.conTextura === 0, `sin textura: se pide el azul de referencia (${m.conTextura} con mapa)`);
ok(m.azules === 16, `los 16 van del azul del maniqui (${m.azules})`);
ok(m.ancho > 50, `tiene ancho de cuerpo, no de palo (${m.ancho.toFixed(1)} cm)`);

// Las piezas tienen que SOLAPAR en las juntas: es lo que evita que la
// articulacion se abra al doblarla.
const solape = await p.evaluate(() => {
  const T = window.exersuite.THREE;
  let g = null;
  window.exersuite.editor.sceneManager.scene.traverse((o) => { if (o.userData?.isHumanFigure) g = o; });
  const caja = {};
  g.traverse((o) => {
    if (!o.isMesh || !o.userData?.segmentId) return;
    caja[o.userData.segmentId] = new T.Box3().setFromObject(o);
  });
  const pares = [["torso","pelvis"],["cabeza","cuello"],["muslo-L","pelvis"],
                 ["pierna-L","muslo-L"],["antebrazo-L","brazo-sup-L"]];
  return pares.map(([a, c]) => {
    const A = caja[a], B = caja[c];
    return { par: `${a}/${c}`,
             sol: Math.min(A.max.y, B.max.y) - Math.max(A.min.y, B.min.y) };
  });
});
for (const s of solape) ok(s.sol > 1, `${s.par} solapa ${s.sol.toFixed(1)} cm`);

// Y se sigue posando.
const antes = await p.evaluate(() => {
  const T = window.exersuite.THREE; let g = null;
  window.exersuite.editor.sceneManager.scene.traverse((o) => { if (o.userData?.isHumanFigure) g = o; });
  const v = new T.Vector3(); g.userData.joints.ankleR.getWorldPosition(v); return v.y;
});
await p.evaluate(() => {
  let g = null;
  window.exersuite.editor.sceneManager.scene.traverse((o) => { if (o.userData?.isHumanFigure) g = o; });
  g.userData.joints.kneeR.rotation.x = 1.2;
  g.updateMatrixWorld(true);
});
await p.waitForTimeout(400);
const despues = await p.evaluate(() => {
  const T = window.exersuite.THREE; let g = null;
  window.exersuite.editor.sceneManager.scene.traverse((o) => { if (o.userData?.isHumanFigure) g = o; });
  const v = new T.Vector3(); g.userData.joints.ankleR.getWorldPosition(v); return v.y;
});
ok(despues > antes + 5, `al doblar la rodilla el tobillo sube (${antes.toFixed(1)} -> ${despues.toFixed(1)} cm)`);

console.log("\nERRORES: " + (errs.length ? errs.join("\n") : "ninguno"));
if (errs.length) fallos += errs.length;
console.log(fallos === 0 ? "\n✅ TODO BIEN" : `\n❌ ${fallos} fallo(s)`);
await b.close();
process.exit(fallos ? 1 : 0);
