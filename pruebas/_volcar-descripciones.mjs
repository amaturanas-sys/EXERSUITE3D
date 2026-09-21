// Vuelca las descripciones TAL COMO EXISTEN EN EJECUCION (utilidad, no prueba).
import { chromium } from "playwright-core";
import { writeFileSync } from "node:fs";
const b = await chromium.launch({ executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-webgl"]});
const page = await b.newPage({ viewport:{width:1280,height:900}});
await page.goto("http://127.0.0.1:4174/"); await page.waitForTimeout(1200);
await page.click("text=📁 PROYECTOS"); await page.waitForTimeout(300);
await page.click(".land-actions button:has-text('NUEVO')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')");
// SE ESPERA A QUE LA APP ESTE LISTA, NO AL RELOJ (v0.3.81): la capa de carga
// se va cuando las mallas estan. Adivinarlo con un timeout fijo es lo que
// hacia parpadear a estas pruebas.
await page.waitForFunction(() => !document.querySelector(".cargando-capa"), null, { timeout: 45000 });
await page.waitForTimeout(3000);
const d = await page.evaluate(() =>
  [...document.querySelectorAll(".comp-btn")]
    .map((b) => ({ etiqueta: b.textContent.trim(), desc: b.getAttribute("title") || "" }))
    .filter((x) => x.desc));
writeFileSync(process.argv[2] ?? "/tmp/desc.json", JSON.stringify(d, null, 1));
console.log(d.length, "descripciones volcadas");
await b.close();
