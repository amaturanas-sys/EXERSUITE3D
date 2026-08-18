// Prototipo con foto v0.2.16 (flujo de 5 pasos): foto DEBAJO del render,
// fondo eliminado con suelo preservado (caucho), fijar perspectiva, sol y
// producción por capas con sombras.
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

// "Foto" del lugar: pared cálida y suelo de madera.
const fotoCv = await page.evaluate(() => {
  const cv = document.createElement("canvas");
  cv.width = 1200; cv.height = 700;
  const ctx = cv.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, 700);
  g.addColorStop(0, "#cfc4b2"); g.addColorStop(0.55, "#b3a48e");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1200, 385);
  ctx.fillStyle = "#8a6b4f"; ctx.fillRect(0, 385, 1200, 315);
  for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? "#82644a" : "#8f7052"; ctx.fillRect(0, 385 + i * 40, 1200, 3); }
  return cv.toDataURL("image/png");
});
fs.writeFileSync("foto-lugar.png", Buffer.from(fotoCv.split(",")[1], "base64"));

// Composición: un banco y un rack sobre el área de trabajo.
await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  ed.insertarMaquina("banco-plano", new T.Vector3(-70, 0, 30));
  ed.insertarMaquina("rack-sentadillas", new T.Vector3(90, 0, -40));
  ed.select(null);
});

// Paso 3: cargar la foto → modo calce (foto debajo, fondo fuera, caucho).
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
await page.waitForTimeout(1000);
const S1 = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const ov = document.getElementById("proto-overlay");
  const vp = document.getElementById("viewport");
  return {
    calce: ed.isModoCalce(),
    detras: ov.classList.contains("detras") && getComputedStyle(ov).zIndex === "0",
    encima: getComputedStyle(vp).zIndex === "1",
    opacidad: vp.style.opacity,
    fondoFuera: ed.sceneManager.scene.background === null,
    sombras: ed.sceneManager.renderer.shadowMap.enabled,
  };
});
console.log("calce:", JSON.stringify(S1));
await page.screenshot({ path: "v216-calce.png" });

// Paso 4: fijar perspectiva (órbita bloqueada, aparece el dial del sol).
await page.click("#proto-viewer button:has-text('Fijar perspectiva')");
await page.waitForTimeout(400);
const S2 = await page.evaluate(() => ({
  bloqueada: window.exersuite.editor.isOrbitaBloqueada(),
  orbitOff: window.exersuite.editor.orbit.enabled === false,
  dial: !document.querySelector(".proto-dial").classList.contains("proto-oculto"),
}));
// Arrastra el sol al lado opuesto y verifica que la luz siguió.
const luz0 = await page.evaluate(() => window.exersuite.editor.sceneManager.key.position.toArray().map((v) => +v.toFixed(0)));
const dial = await page.$(".proto-dial");
const box = await dial.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.78, { steps: 5 });
await page.mouse.up();
await page.waitForTimeout(300);
const luz1 = await page.evaluate(() => window.exersuite.editor.sceneManager.key.position.toArray().map((v) => +v.toFixed(0)));
console.log("fijar:", JSON.stringify(S2), "luz:", JSON.stringify(luz0), "→", JSON.stringify(luz1));
await page.screenshot({ path: "v216-sol.png" });

// Paso 5: producir la fotografía (capas: foto + suelo caucho + sombras).
await page.click("#proto-viewer button:has-text('Producir fotografía')");
await page.waitForTimeout(1200);
const S3 = await page.evaluate(() => ({
  boton: document.querySelector("#proto-viewer .proto-btn.primario").textContent,
}));
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
if (compuesta) fs.writeFileSync("v216-prototipo-producido.png", Buffer.from(compuesta.split(",")[1], "base64"));
console.log("producir:", JSON.stringify({ ...S3, galeria: !!compuesta }));

// Salida limpia. El «Quitar foto» del panel viejo del Builder es hoy el
// «⌂ Volver» del visor: deja el calce, devuelve la órbita y restaura el fondo,
// que es justo lo que comprueba S4.
await page.click("#proto-viewer button:has-text('Volver')");
await page.waitForTimeout(400);
const S4 = await page.evaluate(() => ({
  calce: window.exersuite.editor.isModoCalce(),
  orbita: window.exersuite.editor.orbit.enabled,
  fondo: window.exersuite.editor.sceneManager.scene.background !== null,
}));
console.log("salida:", JSON.stringify(S4));
const luzCambio = luz0.join() !== luz1.join();
const ok = S1.calce && S1.detras && S1.encima && S1.opacidad === "0.75" && S1.fondoFuera && S1.sombras &&
  S2.bloqueada && S2.orbitOff && S2.dial && luzCambio &&
  /Prototipo guardado/.test(S3.boton) && !!compuesta &&
  !S4.calce && S4.orbita && S4.fondo;
console.log(JSON.stringify({ ok }));
console.log("ERRORES:", errores.length ? errores.join("\n") : "ninguno");
await browser.close();
