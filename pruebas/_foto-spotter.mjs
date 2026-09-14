// RETRATO DEL BRAZO SPOTTER — utilidad, no prueba. Tres largos, uno sobre otro.
import { chromium } from "playwright-core";
const SAL = process.argv[2] ?? "pruebas/salidas/v354-spotter.png";
const b = await chromium.launch({ executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-webgl"]});
const page = await b.newPage({ viewport:{width:1200,height:800}});
await page.goto("http://127.0.0.1:4174/"); await page.waitForTimeout(1000);
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);
const info = await page.evaluate(async () => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  for (let i=0;i<80 && !ed.tieneModelo?.("brazo-spotter");i++) await new Promise(r=>setTimeout(r,150));
  const dims = [];
  let y = 20;
  for (const largo of [70, 100, 140]) {
    const o = ed.addComponent("brazo-spotter");
    o.params.largoCm = largo; o.rebuildGeometry();
    o.mesh.position.set(0, y, 0); o.mesh.updateMatrixWorld(true);
    const t = new T.Box3().setFromObject(o.mesh).getSize(new T.Vector3());
    dims.push([largo, +t.x.toFixed(1), +t.y.toFixed(1), +t.z.toFixed(1)]);
    y += 38;
  }
  const cam = ed.sceneManager.camera;
  cam.position.set(150, 95, 120); ed.orbit.target.set(0, 55, 10); ed.orbit.update();
  cam.lookAt(new T.Vector3(0, 55, 10)); cam.updateMatrixWorld(true);
  return dims;
});
await page.waitForTimeout(900);
await page.screenshot({ path: SAL });
console.log(info.map(d => `${d[0]} cm -> ${d[1]}x${d[2]}x${d[3]}`).join("  |  "));
await b.close();
