// Ajuste 3: prototipo con foto — carga de foto, superposición con opacidad,
// pantalla verde y captura compuesta por croma.
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
await page.goto("http://localhost:4174/");
await page.waitForTimeout(900);
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);

// Una "foto" de prueba: degradado cálido con franja de pared/suelo.
const fotoCv = await page.evaluate(() => {
  const cv = document.createElement("canvas");
  cv.width = 1200; cv.height = 700;
  const ctx = cv.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, 700);
  g.addColorStop(0, "#c9b8a3"); g.addColorStop(0.62, "#a08a72"); g.addColorStop(0.63, "#6e5b48"); g.addColorStop(1, "#4d4036");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1200, 700);
  return cv.toDataURL("image/png");
});
fs.writeFileSync("foto-lugar.png", Buffer.from(fotoCv.split(",")[1], "base64"));

// ALGO QUE FOTOGRAFIAR. El visor se abre con «Sesión anterior», y esa sesión
// solo existe si el Builder llegó a autoguardar algo: esta prueba no ponía ni
// una pieza —solo fabricaba la foto— y por eso no había sesión que recuperar.
await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  ed.insertarMaquina("rack-sentadillas", new T.Vector3(0, 0, -100));
  ed.select(null);
});

// Abre la sección y carga la foto por el input de archivo.
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
await inputFoto.setInputFiles("foto-lugar.png");
await page.waitForTimeout(800);

const S1 = await page.evaluate(() => {
  const ov = document.getElementById("proto-overlay");
  return {
    overlay: ov && ov.style.display !== "none",
    opacidad: ov ? +ov.style.opacity : null,
    thumb: !!document.querySelector("#proto-viewer .proto-thumb[src]"),
  };
});
console.log("overlay:", JSON.stringify(S1));
await page.screenshot({ path: "v215-proto-overlay.png" });

// LO QUE ESTA PRUEBA YA NO PUEDE COMPROBAR, y conviene que esté escrito en vez
// de fingir que sí: los botones «Pantalla verde» y «Captura compuesta» que
// medía aquí NO EXISTEN desde que la herramienta se rehízo para el visor. El
// rodaje de hoy es cargar la foto, calzar, fijar la perspectiva y producir, y
// eso lo cubre `prueba-prototipo2` de punta a punta.
//
// La pantalla verde sigue en la API del editor (`setPantallaVerde`) pero no la
// alcanza ningún mando de la interfaz. Comprobarla por API sería medir código
// muerto y dar una sensación de cobertura que no existe, así que aquí solo
// queda lo que un usuario puede hacer de verdad.
await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  ed.insertarMaquina("banco-plano", new T.Vector3(0, 0, 0));
  ed.select(null);
});
await page.waitForTimeout(400);
await page.screenshot({ path: "v215-proto-compuesto.png" });

const S3 = await page.evaluate(() => ({
  overlayVivo: (() => { const o = document.getElementById("proto-overlay"); return !!o && o.style.display !== "none"; })(),
  panel: !!document.getElementById("proto-viewer"),
}));
console.log("visor con foto:", JSON.stringify(S3));
if (!S3.overlayVivo || !S3.panel) {
  console.log("✗ el visor de prototipo no quedó montado con la foto debajo");
  process.exitCode = 1;
}

await browser.close();
