// RETRATO DE LAS MANCUERNAS — utilidad, no prueba.
import { chromium } from "playwright-core";
const SAL = process.argv[2] ?? "pruebas/salidas/v352-mancuernas";
const b = await chromium.launch({ executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-webgl"]});
const page = await b.newPage({ viewport:{width:1200,height:800}});
await page.goto("http://127.0.0.1:4174/"); await page.waitForTimeout(1000);
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);
// 1. La burbuja abierta sobre el botón de la paleta.
const btn = await page.$(".comp-btn:has-text('Mancuerna hexagonal')");
if (btn) { await btn.scrollIntoViewIfNeeded(); await btn.click(); await page.waitForTimeout(500); }
await page.screenshot({ path: `${SAL}-burbuja.png` });
await page.keyboard.press("Escape"); await page.waitForTimeout(300);
// 2. Las cinco en fila, para ver cómo crecen y el número grabado.
await page.evaluate(async () => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  // EN FILA A LO LARGO DE Z y miradas DESDE EL EJE DEL MANGO, que es la única
  // vista desde la que se lee el número grabado en la cara.
  let z = -48;
  for (const w of [10,20,30,40,50]) {
    const id = `mancuerna-${w}`;
    for (let i=0;i<60 && !ed.tieneModelo?.(id);i++) await new Promise(r=>setTimeout(r,150));
    const o = ed.addComponent(id);
    o.mesh.position.set(0, 10, z);
    o.mesh.updateMatrixWorld(true);
    z += 24;
  }
  ed.select ? ed.select(null) : null;
  const cam = ed.sceneManager.camera;
  cam.position.set(110, 34, 22);
  ed.orbit.target.set(0, 10, 0); ed.orbit.update();
  cam.lookAt(new T.Vector3(0, 10, 0)); cam.updateMatrixWorld(true);
});
await page.waitForTimeout(900);
await page.screenshot({ path: `${SAL}-fila.png` });
await b.close();
