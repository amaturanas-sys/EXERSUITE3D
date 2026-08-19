// Revisión Fable de v0.2.14: rack nativo CON cadenas, barra detenida por ellas
// sin crear nada a mano, aviso del doblado sin selección, y el Marketplace.
//
// Puesta al día en v0.2.95. Llevaba tandas en rojo por DOS trozos que medían
// una interfaz retirada: el Marketplace de tarjetas (`.mkc-card`, «Ver»,
// «Solicitar cotización»), que en v0.2.62 pasó a ser EL HUB a pantalla
// completa; y la barra de simulación con selector focal y cursores ▲▼, que en
// v0.2.45 dejó su sitio a las teclas 8 EMPUJE / 9 TRACCIÓN sobre la zona activa
// —eso lo mide ahora `prueba-v245`—. Un rojo que no señala nada acaba
// enseñando a no mirar los rojos.
import { chromium } from "playwright-core";
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
await page.waitForTimeout(1000);

// Marketplace. Desde v0.2.62 la tienda es EL HUB, a pantalla completa y con
// marco propio: se monta como una capa `.hub` sobre la ventana entera y no
// comparte navegación con la Home. Lo de antes (`.mkc-card`, «Ver», «Solicitar
// cotización») era la maqueta anterior y ya no existe.
await page.click("text=🛒 MARKETPLACE"); await page.waitForTimeout(1500);
const MK1 = await page.evaluate(() => {
  const hub = document.querySelector(".hub");
  return {
    hub: !!hub,
    marcas: hub ? hub.querySelectorAll(".hub-carril button, .hub-marca-btn").length : 0,
    volver: !!hub && [...hub.querySelectorAll("button")].some((b) => /Volver/.test(b.textContent)),
  };
});
// Y se sale con su propio botón: la capa se quita y vuelve la Home.
await page.evaluate(() => {
  const b = [...document.querySelectorAll(".hub button")].find((x) => /Volver/.test(x.textContent));
  b?.click();
});
await page.waitForTimeout(800);
const MK2 = await page.evaluate(() => ({
  cerrado: !document.querySelector(".hub"),
  home: !!document.querySelector(".landing"),
}));
console.log("mk:", JSON.stringify({ ...MK1, ...MK2 }));

// Builder
await page.goto("http://localhost:4174/"); await page.waitForTimeout(800);
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);

// Doblado sin selección → aviso (no queda en modo doblado)
await page.click("#tool-quick .tq-bend"); await page.waitForTimeout(300);
const bendAviso = await page.evaluate(() => !window.exersuite.editor.isBending());

// Rack nativo: nace CON 2 cadenas; barra cargada soltada sobre ellas.
const R = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  ed.insertarMaquina("rack-sentadillas", new T.Vector3(0, 0, 0));
  const cuerdas = ed.listRopes ? ed.listRopes().length : [...ed.ropes.values()].length;
  const anclas = [...ed.objects.values()].filter((o) => o.componentId === "jota-pr");
  const lado = anclas.filter((a) => a.mesh.position.z < 0);
  const yCad = (lado[0].mesh.position.y + lado[1].mesh.position.y) / 2;
  const xCad = (lado[0].mesh.position.x + lado[1].mesh.position.x) / 2;
  // Caso real: barra a lo largo de Z, centrada entre columnas, cruzando
  // AMBAS cadenas laterales (z=±55.5) perpendicularmente.
  const barra = ed.addComponent("barra-olimpica", new T.Vector3(xCad, yCad + 40, 0));
  barra.mesh.rotation.x = Math.PI / 2; // a lo largo de Z, cruza las dos cadenas
  barra.mesh.position.set(xCad, yCad + 40, 0);
  barra.mesh.updateMatrixWorld(true);
  barra.params.discCount = 2;
  barra.rebuildCargaVisual();
  window.__barra = barra.id;
  ed.select(null);
  await ed.addHumanFigure(175);
  ed.humanFigure.position.set(120, ed.humanFigure.position.y, 0);
  ed.toggleSimulation();
  return { cuerdas, yCad: +yCad.toFixed(1) };
});
await page.waitForTimeout(9000);
const B = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const b = ed.getObject(window.__barra);
  return { y: +b.mesh.position.y.toFixed(1), tool: ed.getSimHerramienta() };
});
console.log("rack:", JSON.stringify({ ...R, ...B }));

// LA BARRA DE SIM CON SELECTOR FOCAL Y ▲▼ YA NO EXISTE. En v0.2.45 el gesto
// pasó a las teclas 8 EMPUJE / 9 TRACCIÓN sobre la ZONA activa, y los cursores
// dejaron de mover al maniquí a propósito. Lo que aquí se comprobaba lo cubre
// ahora `prueba-v245`, que mide el rango de las dos direcciones; repetirlo aquí
// contra un DOM que se retiró sólo daba un rojo que no señalaba nada.
await page.evaluate(() => {
  const ed = window.exersuite.editor;
  ed.orbit.target.set(0, 80, 0);
  ed.sceneManager.camera.position.set(210, 130, 230);
  ed.orbit.update?.(); ed.requestRender?.();
});
await page.waitForTimeout(400);
await page.screenshot({ path: "v214b-rack-cadenas.png" });

const ok =
  MK1.hub && MK1.marcas > 0 && MK1.volver && MK2.cerrado && MK2.home && bendAviso &&
  R.cuerdas === 2 && B.y > R.yCad - 12 && B.y < R.yCad + 25;
console.log(JSON.stringify({ ok, bendAviso }));
console.log("ERRORES:", errores.length ? errores.join("\n") : "ninguno");
// SIN CÓDIGO DE SALIDA, un `ok:false` pasaba por verde: la batería sólo mira el
// código y las marcas ✗/❌. Esta prueba sólo caía cuando reventaba.
if (!ok || errores.length) console.log("❌ revisión de v0.2.14 en rojo");
await browser.close();
process.exit(ok && errores.length === 0 ? 0 : 1);
