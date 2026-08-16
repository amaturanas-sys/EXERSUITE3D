// Prueba REAL completa: garaje del usuario → calce → fijar → sol → producir.
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

// Composición del rincón: rack al fondo-derecha, banco al centro-izquierda.
await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  ed.insertarMaquina("rack-sentadillas", new T.Vector3(60, 0, -140));
  ed.insertarMaquina("banco-plano", new T.Vector3(-120, 0, 0));
  ed.select(null);
});

// Paso 3: foto + calce orbital.
await page.evaluate(() => document.querySelector("#sec-prototipo .panel-title").click());
await page.waitForTimeout(300);
const inputFoto = await page.$("#sec-prototipo input[type=file]");
await inputFoto.setInputFiles("foto-garaje.jpg");
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
await page.click("#sec-prototipo button:has-text('Fijar perspectiva')");
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
await page.click("#sec-prototipo button:has-text('Producir fotografía')");
await page.waitForTimeout(1500);
const boton = await page.evaluate(() => document.querySelector("#sec-prototipo .proto-btn.primario").textContent);
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
