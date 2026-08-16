// v0.2.16b → v0.2.19: el prototipo con foto vive en su PROPIA instancia de
// visor, y desde v0.2.19 es una herramienta del VIEWER (Home → ▶ Simulador):
// el Builder no tiene sección NI visor, 📸 entra en el viewer (UI fuera),
// ⌂ Volver restaura. v0.2.29: zoom de la foto y perilla de inclinación.
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

// El Builder NO carga NADA del prototipo: ni sección, ni visor, ni botón.
const S0 = await page.evaluate(() => ({
  sinSeccion: !document.getElementById("sec-prototipo"),
  sinVisor: !document.getElementById("proto-viewer"),
  sinBoton: ![...document.querySelectorAll("#toolbar button")].some((b) =>
    /Prototipo/.test(b.textContent ?? "")),
}));

await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  ed.insertarMaquina("rack-sentadillas", new T.Vector3(60, 0, -140));
  ed.insertarMaquina("banco-plano", new T.Vector3(-120, 0, 0));
  ed.select(null);
});
await page.waitForTimeout(2200); // autoguardado

// Home → ▶ SIMULADOR (el viewer) → 📸 Prototipo: UI fuera, solo órbita.
await page.click("#toolbar button:has-text('Home')"); await page.waitForTimeout(500);
const salir = page.locator("button:has-text('Salir sin guardar')");
if (await salir.count()) await salir.click();
await page.waitForTimeout(800);
await page.click("text=▶ SIMULADOR"); await page.waitForTimeout(500);
await page.click("text=↻  Sesión anterior"); await page.waitForTimeout(4000);
await page.click("#simbar button:has-text('Prototipo')");
await page.waitForTimeout(500);
const oculto = (id) => {
  const e = document.getElementById(id);
  return !e || getComputedStyle(e).display === "none";
};
const S1 = await page.evaluate(() => {
  const oculto = (id) => {
    const e = document.getElementById(id);
    return !e || getComputedStyle(e).display === "none";
  };
  return {
    modo: document.body.classList.contains("modo-prototipo"),
    visor: getComputedStyle(document.getElementById("proto-viewer")).display !== "none",
    simbarFuera: oculto("simbar"),
    panelFuera: oculto("left-stack"),
    toolquickFuera: oculto("tool-quick"),
    herramienta: window.exersuite.editor.getHerramienta(),
  };
});
console.log("entrada:", JSON.stringify({ ...S0, ...S1 }));

// Flujo con la foto real del garaje.
const inputFoto = await page.$("#proto-viewer input[type=file]");
await inputFoto.setInputFiles("foto-garaje.jpg");
await page.waitForTimeout(1000);
await page.evaluate(() => {
  const ed = window.exersuite.editor;
  ed.sceneManager.camera.position.set(-40, 150, 430);
  ed.orbit.target.set(20, 55, -80);
  ed.orbit.update();
  ed.requestRender();
});
await page.waitForTimeout(500);
await page.screenshot({ path: "v216b-visor-calce.png" });
await page.click("#proto-viewer button:has-text('Fijar perspectiva')");
await page.waitForTimeout(300);
const dial = await page.$("#proto-viewer .proto-dial:not(.proto-perilla)");
const box = await dial.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.64, { steps: 6 });
await page.mouse.up();
await page.waitForTimeout(300);
await page.click("#proto-viewer button:has-text('Producir fotografía')");
await page.waitForTimeout(1500);
const S2 = await page.evaluate(() => ({
  boton: document.querySelector("#proto-viewer .proto-btn.primario").textContent,
  calce: window.exersuite.editor.isModoCalce(),
}));
const compuesta = await page.evaluate(() => new Promise((res) => {
  const req = indexedDB.open("exersuite3d");
  req.onsuccess = () => {
    const st = req.result.transaction("capturas", "readonly").objectStore("capturas").getAll();
    st.onsuccess = () => { const c = st.result.sort((a, b) => b.tomadaEn - a.tomadaEn); res(c[0]?.dataUrl ?? null); };
    st.onerror = () => res(null);
  };
  req.onerror = () => res(null);
}));
if (compuesta) fs.writeFileSync("v216b-visor-producido.png", Buffer.from(compuesta.split(",")[1], "base64"));
console.log("producción:", JSON.stringify({ ...S2, galeria: !!compuesta }));

// ⌂ Volver: el Builder se restaura tal como estaba.
await page.click("#proto-viewer button:has-text('Volver')");
await page.waitForTimeout(500);
const S3 = await page.evaluate(() => ({
  modo: document.body.classList.contains("modo-prototipo"),
  simbar: getComputedStyle(document.getElementById("simbar")).display !== "none",
  calce: window.exersuite.editor.isModoCalce(),
  orbita: window.exersuite.editor.orbit.enabled,
  herramienta: window.exersuite.editor.getHerramienta(),
  fondo: window.exersuite.editor.sceneManager.scene.background !== null,
}));
console.log("salida:", JSON.stringify(S3));
await page.screenshot({ path: "v216b-builder-restaurado.png" });
const ok = S0.sinSeccion && S0.sinVisor && S0.sinBoton &&
  S1.modo && S1.visor && S1.simbarFuera && S1.panelFuera && S1.toolquickFuera &&
  S1.herramienta === "orbitar" &&
  /Prototipo guardado/.test(S2.boton) && !!compuesta &&
  !S3.modo && S3.simbar && !S3.calce && S3.orbita && S3.fondo;
console.log(JSON.stringify({ ok }));
console.log("ERRORES:", errores.length ? errores.join("\n") : "ninguno");
await browser.close();
