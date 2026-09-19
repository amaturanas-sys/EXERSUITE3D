// RETRATO DEL PIVOTE INDEXADO — utilidad, no prueba.
//
//   node pruebas/_foto-pivote.mjs pruebas/salidas/v350-herramienta
//
// Monta con la HERRAMIENTA un poste, un brazo y el pasador en modo indexado con
// medio vuelta de recorrido, y fotografía la horquilla que sale: con su disco y
// con los 7 agujeros que el brazo alcanza.
import { chromium } from "playwright-core";
const SAL = process.argv[2] ?? "pruebas/salidas/v350-herramienta";
const b = await chromium.launch({ executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-webgl"]});
const page = await b.newPage({ viewport:{width:1100,height:800}});
await page.goto("http://127.0.0.1:4174/"); await page.waitForTimeout(1000);
await page.click("text=📁 PROYECTOS"); await page.waitForTimeout(300);
await page.click(".land-actions button:has-text('NUEVO')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(3000);
await page.evaluate(() => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  const poste = ed.addComponent("prim-box");
  poste.name = "Poste";
  poste.params = { kind: "box", width: 8, height: 90, depth: 8 };
  poste.rebuildGeometry(); poste.mesh.position.set(0, 45, 0);
  poste.physics.fixed = true; poste.mesh.updateMatrixWorld(true);
  const brazo = ed.addComponent("prim-box");
  brazo.name = "Brazo";
  brazo.params = { kind: "box", width: 4, height: 4, depth: 44 };
  brazo.rebuildGeometry(); brazo.mesh.position.set(0, 70, 28);
  brazo.mesh.updateMatrixWorld(true);
  const pas = ed.addComponent("pasador");
  pas.mesh.position.set(0, 70, 6);
  pas.mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0), new T.Vector3(1,0,0));
  pas.mesh.updateMatrixWorld(true);
  Object.assign(pas.params, {
    pasadorAnclas: [poste.id], pasadorMoviles: [brazo.id], pasadorAnclaje: true,
    pasadorIndexado: true, pasadorPosiciones: 12,
    pasadorLimite: true, pasadorMin: 90, pasadorMax: 270,
  });
  ed.aplicarPasador(pas);
  ed.select ? ed.select(null) : null;
  const cam = ed.sceneManager.camera;
  cam.position.set(78, 104, 96);
  ed.orbit.target.set(0, 70, 8); ed.orbit.update();
  cam.lookAt(new T.Vector3(0, 70, 8)); cam.updateMatrixWorld(true);
});
await page.waitForTimeout(900);
await page.screenshot({ path: `${SAL}.png` });
await b.close();
