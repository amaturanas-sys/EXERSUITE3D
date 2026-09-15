// RETRATO DE LAS KETTLEBELLS — utilidad, no prueba.
import { chromium } from "playwright-core";
const SAL = process.argv[2] ?? "pruebas/salidas/v356-kettlebells";
const b = await chromium.launch({ executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-webgl"]});
const page = await b.newPage({ viewport:{width:1400,height:800}});
await page.goto("http://127.0.0.1:4174/"); await page.waitForTimeout(1000);
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);
const btn = await page.$(".comp-btn:has-text('Kettlebell')");
if (btn) { await btn.scrollIntoViewIfNeeded(); await btn.click(); await page.waitForTimeout(500); }
await page.screenshot({ path: `${SAL}-burbuja.png` });
await page.keyboard.press("Escape"); await page.waitForTimeout(300);
const info = await page.evaluate(async () => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  const dims = []; let x = -78;
  for (const kg of [10,15,20,25,35,45,55]) {
    const id = `kettlebell-${kg}`;
    for (let i=0;i<90 && !ed.tieneModelo?.(id);i++) await new Promise(r=>setTimeout(r,150));
    const o = ed.addComponent(id);
    o.mesh.position.set(x, 0, 0); o.mesh.updateMatrixWorld(true);
    const c = new T.Box3().setFromObject(o.mesh);
    o.mesh.position.y -= c.min.y;             // apoyadas en el suelo
    o.mesh.updateMatrixWorld(true);
    const t = c.getSize(new T.Vector3());
    dims.push(`${kg}kg ${t.x.toFixed(1)}x${t.y.toFixed(1)}`);
    x += 26;
  }
  const cam = ed.sceneManager.camera;
  cam.position.set(0, 30, 145); ed.orbit.target.set(0, 15, 0); ed.orbit.update();
  cam.lookAt(new T.Vector3(0, 15, 0)); cam.updateMatrixWorld(true);
  return dims;
});
await page.waitForTimeout(900);
await page.screenshot({ path: `${SAL}-fila.png` });
console.log(info.join("  "));
await b.close();
