// RETRATO DE LOS DISCOS — utilidad, no prueba.
import { chromium } from "playwright-core";
const SAL = process.argv[2] ?? "pruebas/salidas/v362-discos";
const b = await chromium.launch({ executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-webgl"]});
const page = await b.newPage({ viewport:{width:1600,height:800}});
await page.goto("http://127.0.0.1:4174/"); await page.waitForTimeout(1000);
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);
const btn = await page.$(".comp-btn:has-text('Disco de peso')");
if (btn) { await btn.scrollIntoViewIfNeeded(); await btn.click(); await page.waitForTimeout(500); }
await page.screenshot({ path: `${SAL}-burbuja.png` });
await page.keyboard.press("Escape"); await page.waitForTimeout(300);
const info = await page.evaluate(async () => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  const dims = []; let x = -80;
  for (const lb of [10,15,25,35,45]) {
    const id = `disco-barbell-${lb}`;
    for (let i=0;i<90 && !ed.tieneModelo?.(id);i++) await new Promise(r=>setTimeout(r,150));
    const o = ed.addComponent(id);
    o.mesh.position.set(x, 0, 0); o.mesh.updateMatrixWorld(true);
    const c = new T.Box3().setFromObject(o.mesh);
    o.mesh.position.y -= c.min.y;
    o.mesh.updateMatrixWorld(true);
    const t = c.getSize(new T.Vector3());
    dims.push(`${lb}lb ${t.x.toFixed(1)}x${t.y.toFixed(1)}x${t.z.toFixed(2)}`);
    x += t.x / 2 + 26;
  }
  const cam = ed.sceneManager.camera;
  cam.position.set(0, 24, 130); ed.orbit.target.set(0, 20, 0); ed.orbit.update();
  cam.lookAt(new T.Vector3(0, 20, 0)); cam.updateMatrixWorld(true);
  return dims;
});
await page.waitForTimeout(900);
await page.screenshot({ path: `${SAL}-fila.png` });
console.log(info.join("  "));
await b.close();
