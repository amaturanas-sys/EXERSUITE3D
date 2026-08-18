// Prueba REAL de Prototipo con foto: garaje del usuario + rack y banco.
import { chromium } from "playwright-core";
import fs from "node:fs";
const AQUI = new URL(".", import.meta.url).pathname;   // vale desde cualquier cwd
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
// LA HERRAMIENTA DE PROTOTIPO VIVE EN EL VISOR, no en el Builder. Se compone
// el espacio con las medidas del lugar real y se fotografía en el visor, que es
// donde no hay gizmos ni paneles que salgan en la foto. Esta prueba buscaba el
// panel viejo del Builder —«#sec-prototipo»— y reventaba antes de medir nada:
// era la prueba la que estaba desfasada, no la aplicación.
await page.waitForTimeout(1200);                      // que cuaje el autoguardado
await page.click("#toolbar button:has-text('Home')"); await page.waitForTimeout(500);
// El aviso de salida solo sale si hay cambios sin guardar: en unas pruebas
// aparece y en otras no, así que se atiende si está y se sigue si no.
const avisoSalida = page.locator("button:has-text('Salir sin guardar')");
if (await avisoSalida.count()) { await avisoSalida.first().click(); await page.waitForTimeout(800); }
await page.click("text=▶ SIMULADOR"); await page.waitForTimeout(500);
await page.click("text=↻  Sesión anterior"); await page.waitForTimeout(4000);
await page.click("#simbar button:has-text('Prototipo')"); await page.waitForTimeout(600);
await page.waitForTimeout(300);
const inputFoto = await page.$("#proto-viewer input[type=file]");
await inputFoto.setInputFiles(AQUI + "fijos/foto-garaje.jpg");
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
