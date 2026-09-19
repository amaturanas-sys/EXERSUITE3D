// RETRATO DE LA BARRA OLÍMPICA — utilidad, no prueba.
import { chromium } from "playwright-core";
const SAL = process.argv[2] ?? "pruebas/salidas/v369-barra";
const b = await chromium.launch({ executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-webgl"]});
const page = await b.newPage({ viewport:{width:1600,height:700}});
await page.goto("http://127.0.0.1:4174/"); await page.waitForTimeout(1000);
await page.click("text=📁 PROYECTOS"); await page.waitForTimeout(300);
await page.click(".land-actions button:has-text('NUEVO')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);

// LA BARRA ENTERA, TUMBADA. Se acuesta girándola un cuarto de vuelta sobre Z:
// el modelo entra de pie, como el cilindro al que sustituye.
const info = await page.evaluate(async () => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  for (let i=0;i<120 && !ed.tieneModelo?.("barra-olimpica");i++) await new Promise(r=>setTimeout(r,150));
  const o = ed.addComponent("barra-olimpica");
  o.mesh.rotation.set(0, 0, Math.PI / 2);
  o.mesh.position.set(0, 40, 0);
  o.mesh.updateMatrixWorld(true);
  ed.selectObject?.(null);
  const cam = ed.sceneManager.camera;
  cam.position.set(0, 42, 150); ed.orbit.target.set(0, 40, 0); ed.orbit.update();
  cam.lookAt(new T.Vector3(0, 40, 0)); cam.updateMatrixWorld(true);
  const g = o.mesh.geometry;
  const m = o.mesh.material;
  return {
    triangulos: (g.index ? g.index.count : g.attributes.position.count) / 3,
    grupos: g.groups.length,
    materiales: Array.isArray(m) ? m.map((x) => "#" + x.color.getHexString()) : ["#" + m.color.getHexString()],
    masa: o.physics?.massKg,
  };
});
await page.waitForTimeout(1200);
await page.screenshot({ path: `${SAL}-entera.png` });

// Y UN PRIMER PLANO del paso de moleteado a liso, que es la foto de referencia.
await page.evaluate(() => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  const cam = ed.sceneManager.camera;
  cam.position.set(-24, 41.6, 12); ed.orbit.target.set(-24, 40, 0); ed.orbit.update();
  cam.lookAt(new T.Vector3(-24, 40, 0)); cam.updateMatrixWorld(true);
});
await page.waitForTimeout(900);
await page.screenshot({ path: `${SAL}-macro.png` });
console.log(JSON.stringify(info));
await b.close();
