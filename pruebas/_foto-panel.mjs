// RETRATO DEL PANEL DE RECORRIDO — utilidad, no prueba.
//
//   node pruebas/_foto-panel.mjs pruebas/salidas/v348-panel
//
// Monta un brazo colgado de un pivote, le pide un recorrido en horas y
// fotografía el panel de Propiedades con las horas puestas.
import { chromium } from "playwright-core";

const SAL = process.argv[2] ?? "pruebas/salidas/v348-panel";
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1420, height: 1000 } });
await page.goto("http://127.0.0.1:4174/");
await page.waitForTimeout(1000);
await page.click("text=📁 PROYECTOS"); await page.waitForTimeout(300);
await page.click(".land-actions button:has-text('NUEVO')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);

await page.evaluate(() => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  // Un poste fijo y un brazo que sale horizontal hacia la derecha: las 3 en
  // punto, que es donde nace el respaldo de un banco regulable.
  const poste = ed.addComponent("prim-box");
  poste.name = "Poste";
  poste.params = { kind: "box", width: 8, height: 70, depth: 8 };
  poste.rebuildGeometry();
  poste.mesh.position.set(0, 35, 0);
  poste.physics.fixed = true;
  poste.mesh.updateMatrixWorld(true);

  const brazo = ed.addComponent("prim-box");
  brazo.name = "Respaldo";
  brazo.params = { kind: "box", width: 60, height: 6, depth: 20 };
  brazo.rebuildGeometry();
  brazo.mesh.position.set(34, 70, 0);
  brazo.mesh.updateMatrixWorld(true);

  const j = ed.connect(poste.id, brazo.id, "revolute", new T.Vector3(0, 70, 0));
  j.axis = "z";
  j.name = "Bisagra del respaldo";
  // Escala de placa, como la que monta la herramienta de bisagra: la pose de
  // diseño es la extendida.
  j.apertura0 = 180;
  j.sentidoApertura = 1;
  j.limitsEnabled = true;
  const r = ed.relojDeUnion(j);
  const R = window.exersuite.reloj;
  // De las 3 (horizontal, como nace) a las 6 (caído a plomo), por la derecha.
  const t = R.tramoDesdeHoras(r, R.parsearHora("3:00"), R.parsearHora("6:00"), true);
  j.min = t.min;
  j.max = t.max;
  ed.jointUpdated();
  ed.select(brazo);
  const cam = ed.sceneManager.camera;
  cam.position.set(10, 96, 150);
  ed.orbit.target.set(0, 62, 0);
  ed.orbit.update();
  cam.lookAt(new T.Vector3(0, 62, 0));
  cam.updateMatrixWorld(true);
});
await page.waitForTimeout(900);
// El panel nace plegado: se despliega tocando su título, como haría cualquiera.
const cabecera = await page.$("#inspector .panel-head, #inspector header, #inspector > div:first-child");
if (cabecera) { await cabecera.click(); await page.waitForTimeout(600); }
// Se lleva el panel hasta el bloque de la bisagra, que es lo que se quiere ver.
await page.evaluate(() => {
  const insp = document.getElementById("inspector");
  const bloque = [...insp.querySelectorAll("label")].find((l) => /horas del reloj/i.test(l.textContent));
  bloque?.scrollIntoView({ block: "center" });
});
await page.waitForTimeout(400);
await page.screenshot({ path: `${SAL}.png` });
const insp = await page.$("#inspector");
if (insp) await insp.screenshot({ path: `${SAL}-panel.png` });
else console.log("sin #inspector visible");
await browser.close();
