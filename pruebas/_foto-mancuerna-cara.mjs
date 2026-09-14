// RETRATO DE LA CARA GRABADA — utilidad, no prueba.
// El número vive hundido en un recuadro, así que de frente y con luz plana no se
// ve nada: hay que mirarlo DE TRES CUARTOS para que el recuadro sombree.
import { chromium } from "playwright-core";
const PESO = Number(process.argv[2] ?? 50);
const SAL = process.argv[3] ?? `pruebas/salidas/v352-mancuerna-${PESO}-cara.png`;
const b = await chromium.launch({ executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-webgl"]});
const page = await b.newPage({ viewport:{width:1000,height:800}});
await page.goto("http://127.0.0.1:4174/"); await page.waitForTimeout(1000);
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);
const caja = await page.evaluate(async (peso) => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  const id = `mancuerna-${peso}`;
  for (let i=0;i<60 && !ed.tieneModelo?.(id);i++) await new Promise(r=>setTimeout(r,150));
  const o = ed.addComponent(id);
  o.mesh.position.set(0, 10, 0);
  o.mesh.updateMatrixWorld(true);
  const c = new T.Box3().setFromObject(o.mesh), t = c.getSize(new T.Vector3());
  const cam = ed.sceneManager.camera;
  // La cabeza de +X, vista de tres cuartos y de cerca.
  const mira = new T.Vector3(t.x/2 - 1, 10, 0);
  cam.position.set(t.x/2 + 26, 10 + 11, 13);
  ed.orbit.target.copy(mira); ed.orbit.update();
  cam.lookAt(mira); cam.updateMatrixWorld(true);
  return [t.x, t.y, t.z].map(v => +v.toFixed(2));
}, PESO);
await page.waitForTimeout(900);
await page.screenshot({ path: SAL });
console.log(PESO, "lb", caja.join(" x "), "cm ->", SAL);
await b.close();
