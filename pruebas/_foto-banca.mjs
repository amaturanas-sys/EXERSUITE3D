// RETRATO DE LA BANCA CON EL PIVOTE INDEXADO — utilidad, no prueba.
//
//   node pruebas/_foto-banca.mjs pruebas/salidas/v351-banca
//
// Carga `bancoajustable3.json` y saca tres fotos: el conjunto, el pivote de
// cerca, y el respaldo reclinado tres horas para que se vea el recorrido.
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
const SAL = process.argv[2] ?? "pruebas/salidas/v351-banca";
const BANCA = JSON.parse(readFileSync(new URL("./datos/bancoajustable3.json", import.meta.url), "utf8"));
const b = await chromium.launch({ executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-webgl"]});
const page = await b.newPage({ viewport:{width:1200,height:860}});
await page.goto("http://127.0.0.1:4174/"); await page.waitForTimeout(1000);
await page.click("text=📁 PROYECTOS"); await page.waitForTimeout(300);
await page.click(".land-actions button:has-text('NUEVO')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);

const mirar = async (cam, target) => {
  await page.evaluate(({c, t}) => {
    const ed = window.exersuite.editor, T = window.exersuite.THREE;
    const k = ed.sceneManager.camera;
    k.position.set(c[0], c[1], c[2]);
    ed.orbit.target.set(t[0], t[1], t[2]); ed.orbit.update();
    k.lookAt(new T.Vector3(t[0], t[1], t[2])); k.updateMatrixWorld(true);
  }, { c: cam, t: target });
  await page.waitForTimeout(700);
};

await page.evaluate(async (data) => {
  const ed = window.exersuite.editor;
  await ed.loadProject(data);
  await new Promise(r => setTimeout(r, 900));
  ed.select ? ed.select(null) : null;
  // CON LA SIMULACIÓN ANDANDO, que es cuando se ven las piezas y no los
  // marcadores de las uniones: un puñado de bolas de colores tapando justo el
  // pivote que se quiere enseñar.
  if (!ed.isSimulating()) ed.toggleSimulation();
  await new Promise(r => setTimeout(r, 1500));
}, BANCA);

// 1. El conjunto, con el respaldo como nace.
await mirar([150, 110, 180], [-22, 55, 0]);
await page.screenshot({ path: `${SAL}-conjunto.png` });

// 2. El pivote, de cerca: el disco con su corona y el pasador atravesándolo.
await mirar([14, 62, 40], [-28, 45, 0]);
await page.screenshot({ path: `${SAL}-pivote.png` });

// 3. Y el respaldo reclinado tres horas, para ver el recorrido.
await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  const resp = [...ed.objects.values()].find(o => o.name === "Respaldo");
  const j = ed.listJoints().find(x => !x.soldada);
  const paso = j.max - (j.apertura0 ?? 0) > (j.apertura0 ?? 0) - j.min ? 5 : -5;
  ed.physics.tomarBisagra(resp.id);
  for (let i = 0; i < 20; i++) {
    ed.physics.girarBisagra(resp.id, paso);
    await new Promise(r => setTimeout(r, 130));
  }
  ed.physics.soltarBisagra(resp.id);
  await new Promise(r => setTimeout(r, 1400));
});
await mirar([150, 110, 180], [-22, 55, 0]);
await page.screenshot({ path: `${SAL}-reclinado.png` });
await b.close();
