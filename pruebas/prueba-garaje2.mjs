// Prueba REAL completa: garaje del usuario → calce → fijar → sol → producir.
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

// Composición del rincón: rack al fondo-derecha, banco al centro-izquierda.
await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  ed.insertarMaquina("rack-sentadillas", new T.Vector3(60, 0, -140));
  ed.insertarMaquina("banco-plano", new T.Vector3(-120, 0, 0));
  ed.select(null);
});

// Paso 3: foto + calce orbital.
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
await page.evaluate(() => {
  const ed = window.exersuite.editor;
  ed.sceneManager.camera.position.set(-40, 150, 430);
  ed.orbit.target.set(20, 55, -80);
  ed.orbit.update();
  ed.requestRender();
});
await page.waitForTimeout(600);

// Paso 4: fijar perspectiva y arrastrar el sol hacia las ventanas del
// portón (luz desde la derecha y atrás → sombras hacia el frente-izquierda).
await page.click("#proto-viewer button:has-text('Fijar perspectiva')");
await page.waitForTimeout(400);
const dial = await page.$(".proto-dial");
const box = await dial.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.64, { steps: 6 });
await page.mouse.up();
await page.waitForTimeout(400);
const luz = await page.evaluate(() => window.exersuite.editor.sceneManager.key.position.toArray().map((v) => +v.toFixed(0)));
await page.screenshot({ path: "garaje-2-fijado-sol.png" });

// Paso 5: producir la fotografía.
await page.click("#proto-viewer button:has-text('Producir fotografía')");
await page.waitForTimeout(1500);
const boton = await page.evaluate(() => document.querySelector("#proto-viewer .proto-btn.primario").textContent);
const compuesta = await page.evaluate(() => new Promise((res) => {
  const req = indexedDB.open("exersuite3d");
  req.onsuccess = () => {
    const st = req.result.transaction("capturas", "readonly").objectStore("capturas").getAll();
    st.onsuccess = () => {
      const caps = st.result.sort((a, b) => b.tomadaEn - a.tomadaEn);
      res(caps[0]?.dataUrl ?? null);
    };
    st.onerror = () => res(null);
  };
  req.onerror = () => res(null);
}));
if (compuesta) fs.writeFileSync("garaje-3-producido.png", Buffer.from(compuesta.split(",")[1], "base64"));
console.log(JSON.stringify({ boton, galeria: !!compuesta, luz }));
console.log("ERRORES:", errores.length ? errores.join("\n") : "ninguno");
await browser.close();
