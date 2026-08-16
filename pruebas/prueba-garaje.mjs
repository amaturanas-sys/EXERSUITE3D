// Prueba REAL de Prototipo con foto: garaje del usuario + rack y banco.
import { chromium } from "playwright-core";
import fs from "node:fs";
const browser = await chromium.launch({
  // El Chromium de Playwright ya instalado. Se puede apuntar a otro con
  // CHROMIUM=/ruta/al/chrome (ver LEEME.md).
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
const errores = [];
page.on("pageerror", (e) => errores.push("PAGEERROR: " + e.message));
await page.goto("http://127.0.0.1:4174/");
await page.waitForTimeout(1000);
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);

// Composición: rincón de gimnasio de garaje — rack al fondo, banco delante.
await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  ed.insertarMaquina("rack-sentadillas", new T.Vector3(60, 0, -140));
  ed.insertarMaquina("banco-plano", new T.Vector3(-120, 0, 0));
  ed.select(null);
});

// Paso 3: cargar la foto del garaje → modo calce.
await page.evaluate(() => document.querySelector("#sec-prototipo .panel-title").click());
await page.waitForTimeout(300);
const inputFoto = await page.$("#sec-prototipo input[type=file]");
await inputFoto.setInputFiles("foto-garaje.jpg");
await page.waitForTimeout(1000);

// Órbita hacia una perspectiva concordante con la foto (cámara a la altura
// de los ojos, mirando levemente hacia abajo, como quien entra al garaje).
await page.evaluate(() => {
  const ed = window.exersuite.editor;
  ed.sceneManager.camera.position.set(-40, 150, 430);
  ed.orbit.target.set(20, 55, -80);
  ed.orbit.update();
  ed.requestRender();
});
await page.waitForTimeout(600);
await page.screenshot({ path: "garaje-1-calce.png" });
console.log("calce listo");
await browser.close();
