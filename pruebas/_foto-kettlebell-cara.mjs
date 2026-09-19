import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-webgl"]});
const page = await b.newPage({ viewport:{width:900,height:800}});
await page.goto("http://127.0.0.1:4174/"); await page.waitForTimeout(1000);
await page.click("text=📁 PROYECTOS"); await page.waitForTimeout(300);
await page.click(".land-actions button:has-text('NUEVO')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);
await page.evaluate(async () => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  for (let i=0;i<90 && !ed.tieneModelo?.("kettlebell-55");i++) await new Promise(r=>setTimeout(r,150));
  const o = ed.addComponent("kettlebell-55");
  o.mesh.position.set(0,0,0); o.mesh.updateMatrixWorld(true);
  const c = new T.Box3().setFromObject(o.mesh);
  o.mesh.position.y -= c.min.y; o.mesh.updateMatrixWorld(true);
  ed.select ? ed.select(null) : null;
  const cam = ed.sceneManager.camera;
  cam.position.set(-30, 26, 38); ed.orbit.target.set(0, 12, 0); ed.orbit.update();
  cam.lookAt(new T.Vector3(0, 12, 0)); cam.updateMatrixWorld(true);
});
await page.waitForTimeout(900);
await page.screenshot({ path: "pruebas/salidas/v356-kettlebell-55-otro.png" });
await b.close();
