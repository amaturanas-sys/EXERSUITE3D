// RETRATO DE UN COMPONENTE — utilidad, no prueba (no lleva `prueba-` delante).
//
//   node pruebas/_foto.mjs agarre-d pruebas/salidas/v346-d [acercamiento]
//
// Inserta el componente en un lienzo vacío, lo levanta del suelo para que la
// rejilla no lo tape y saca dos fotos: `-frente.png` y `-34.png`. Sirve para
// mirar con los ojos lo que las pruebas miden con números.
import { chromium } from "playwright-core";
const ID = process.argv[2], SAL = process.argv[3];
// Tercer argumento opcional: cuánto acercar la cámara (1 = la de siempre).
const K = parseFloat(process.argv[4] ?? "1");
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
await page.goto("http://127.0.0.1:4174/");
await page.waitForTimeout(1000);
await page.click("text=📁 PROYECTOS"); await page.waitForTimeout(300);
await page.click(".land-actions button:has-text('NUEVO')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')");
// SE ESPERA A QUE LA APP ESTE LISTA, NO AL RELOJ (v0.3.81): la capa de carga
// se va cuando las mallas estan. Adivinarlo con un timeout fijo es lo que
// hacia parpadear a estas pruebas.
await page.waitForFunction(() => !document.querySelector(".cargando-capa"), null, { timeout: 45000 });
await page.waitForTimeout(3000);
await page.evaluate(async (id) => {
  const ed = window.exersuite.editor;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  for (let i = 0; i < 40 && !ed.tieneModelo?.(id); i++) await new Promise((r) => setTimeout(r, 150));
  const o = ed.addComponent(id);
  o.mesh.position.set(0, 12, 0);
  ed.select ? ed.select(null) : null;
  ed.clearSelection?.();
}, ID);
for (const [nombre, cam] of [["frente", [0, 12 + 1 * K, 62 * K]], ["34", [38 * K, 12 + 22 * K, 45 * K]]]) {
  await page.evaluate((c) => {
    const ed = window.exersuite.editor, T = window.exersuite.THREE;
    const cam = ed.sceneManager.camera;
    cam.position.set(c[0], c[1], c[2]);
    ed.orbit.target.set(0, 12, 0);
    ed.orbit.update();
    cam.lookAt(new T.Vector3(0, 12, 0));
    cam.updateMatrixWorld(true);
  }, cam);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SAL}-${nombre}.png` });
}
await browser.close();
