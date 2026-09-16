// RETRATO DEL MANGO MOLETEADO — utilidad, no prueba.
import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-webgl"]});
const page = await b.newPage({ viewport:{width:1400,height:800}});
await page.goto("http://127.0.0.1:4174/"); await page.waitForTimeout(1000);
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);
const info = await page.evaluate(async () => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  for (let i=0;i<120 && !ed.tieneModelo?.("mancuerna-50");i++) await new Promise(r=>setTimeout(r,150));
  const o = ed.addComponent("mancuerna-50");
  o.mesh.position.set(0, 25, 0); o.mesh.updateMatrixWorld(true);
  ed.selectObject?.(null);
  const cam = ed.sceneManager.camera;
  cam.position.set(0, 27, 42); ed.orbit.target.set(0, 25, 0); ed.orbit.update();
  cam.lookAt(new T.Vector3(0, 25, 0)); cam.updateMatrixWorld(true);
  const g = o.mesh.geometry, m = o.mesh.material;
  return { grupos: g.groups.length, mats: Array.isArray(m) ? m.map((x)=>"#"+x.color.getHexString()) : "uno" };
});
await page.waitForTimeout(1200);
await page.screenshot({ path: "pruebas/salidas/v370-mancuerna-mango.png" });
console.log(JSON.stringify(info));
await b.close();
