// v0.2.22: cambiar de herramienta ABANDONA los modos de construcción —
// tras trazar una línea y elegir gizmo/órbita, el clic ya no planta más.
import { chromium } from "playwright-core";
const browser = await chromium.launch({
  // El Chromium de Playwright ya instalado. Se puede apuntar a otro con
  // CHROMIUM=/ruta/al/chrome (ver LEEME.md).
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
const errores = [];
page.on("pageerror", (e) => errores.push("PAGEERROR: " + e.message));
await page.goto("http://127.0.0.1:4174/");
await page.waitForTimeout(1000);
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);

// Arma el trazado de línea (misma vía que la paleta, sin su diálogo) y
// coloca UNA pieza con dos toques en el visor.
const enLinea = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  ed.beginLine("beam", { width: 5, depth: 7, ends: "plano", holeDiameter: 1.6, holeSpacing: 5 });
  return ed.lineMode !== null;
});
await page.waitForTimeout(200);
await page.mouse.click(620, 500); await page.waitForTimeout(250);
await page.mouse.click(760, 500); await page.waitForTimeout(400);
const tras1 = await page.evaluate(() => ({
  objetos: window.exersuite.editor.objects.size,
  sigueArmado: window.exersuite.editor.lineMode !== null,
}));

// Cambia a ÓRBITA con la barra rápida: el modo línea debe abandonarse y
// los clics posteriores no construyen nada.
await page.evaluate(() => window.exersuite.editor.setHerramienta("orbitar"));
await page.waitForTimeout(200);
const S1 = await page.evaluate(() => ({
  linea: window.exersuite.editor.lineMode,
  herramienta: window.exersuite.editor.getHerramienta(),
}));
await page.mouse.click(650, 430); await page.waitForTimeout(250);
await page.mouse.click(820, 520); await page.waitForTimeout(400);
const S2 = await page.evaluate(() => window.exersuite.editor.objects.size);

// Lo mismo con el gizmo (mover) tras re-armar la línea; y con el cable.
const rearmado = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  ed.beginLine("tube", { radius: 2.4 });
  return ed.lineMode !== null;
});
await page.waitForTimeout(200);
await page.evaluate(() => window.exersuite.editor.setHerramienta("mover"));
await page.waitForTimeout(150);
const S3 = await page.evaluate(() => window.exersuite.editor.lineMode);
await page.mouse.click(700, 470); await page.waitForTimeout(300);
const S4 = await page.evaluate(() => window.exersuite.editor.objects.size);

console.log(JSON.stringify({ enLinea, tras1, S1, objetosTrasClicsOrbita: S2, rearmado, lineaTrasMover: S3, objetosFinal: S4 }));
const ok = enLinea && tras1.objetos === 1 && tras1.sigueArmado &&
  S1.linea === null && S1.herramienta === "orbitar" && S2 === 1 &&
  rearmado && S3 === null && S4 === 1;
console.log(JSON.stringify({ ok }));
console.log("ERRORES:", errores.length ? errores.join("\n") : "ninguno");
await browser.close();
