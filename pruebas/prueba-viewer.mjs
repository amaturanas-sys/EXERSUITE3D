// v0.2.19: Prototipo con foto = herramienta del VIEWER (no del Builder);
// en el viewer no hay gizmo sobre objetos (solo posturas y arrastre en sim).
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
await page.goto("http://127.0.0.1:4174/");
await page.waitForTimeout(1000);

// Builder: el botón 📸 YA NO está en su barra superior.
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);
const B1 = await page.evaluate(() => ({
  sinBotonBuilder: ![...document.querySelectorAll("#toolbar button")].some((b) => /Prototipo/.test(b.textContent)),
}));
await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  ed.insertarMaquina("rack-sentadillas", new T.Vector3(0, 0, 0));
  ed.select(null);
});
await page.waitForTimeout(2000); // autoguardado

// Home → SIMULADOR (viewer) con la sesión anterior.
await page.click("#toolbar button:has-text('Home')"); await page.waitForTimeout(500);
await page.click("button:has-text('Salir sin guardar')"); await page.waitForTimeout(800);
await page.click("text=▶ SIMULADOR"); await page.waitForTimeout(500);
await page.click("text=↻  Sesión anterior"); await page.waitForTimeout(4000);

const V1 = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const botones = [...document.querySelectorAll("#simbar button")].map((b) => b.textContent);
  return {
    viewer: document.body.classList.contains("simulator-mode"),
    botonProto: botones.some((t) => /Prototipo/.test(t)),
    herramienta: ed.getHerramienta(),
    simulando: ed.isSimulating(),
  };
});
console.log("viewer:", JSON.stringify(V1));
await page.screenshot({ path: "v219-viewer-proto.png" });

// Pausa la física y selecciona una pieza: el gizmo NO debe habilitarse.
await page.click("#simbar button:has-text('Pausar')"); await page.waitForTimeout(600);
const V2 = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const pieza = [...ed.objects.values()][0];
  ed.select(pieza);
  const helper = ed.gizmo.getHelper ? ed.gizmo.getHelper() : ed.gizmo;
  return {
    seleccionada: ed.getSelected() === pieza,
    gizmoOff: ed.gizmo.enabled === false,
    gizmoInvisible: helper.visible === false,
  };
});
console.log("gizmo:", JSON.stringify(V2));

// 📸 entra al visor de prototipo; ⌂ Volver restaura el viewer.
await page.evaluate(() => window.exersuite.editor.select(null));
await page.click("#simbar button:has-text('Prototipo')"); await page.waitForTimeout(500);
const V3 = await page.evaluate(() => ({
  modo: document.body.classList.contains("modo-prototipo"),
  visor: getComputedStyle(document.getElementById("proto-viewer")).display !== "none",
  simbarFuera: getComputedStyle(document.getElementById("simbar")).display === "none",
}));
await page.screenshot({ path: "v219-viewer-proto-abierto.png" });
await page.click("#proto-viewer button:has-text('Volver')"); await page.waitForTimeout(500);
const V4 = await page.evaluate(() => ({
  modo: document.body.classList.contains("modo-prototipo"),
  simbar: getComputedStyle(document.getElementById("simbar")).display !== "none",
  herramienta: window.exersuite.editor.getHerramienta(),
}));
console.log("proto:", JSON.stringify(V3), "salida:", JSON.stringify(V4));
const ok = B1.sinBotonBuilder && V1.viewer && V1.botonProto && V1.herramienta === "seleccion" && V1.simulando &&
  V2.seleccionada && V2.gizmoOff && V2.gizmoInvisible &&
  V3.modo && V3.visor && V3.simbarFuera && !V4.modo && V4.simbar && V4.herramienta === "seleccion";
console.log(JSON.stringify({ ok }));
console.log("ERRORES:", errores.length ? errores.join("\n") : "ninguno");
await browser.close();
