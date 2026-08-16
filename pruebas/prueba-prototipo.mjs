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

// Abre la sección y carga la foto por el input de archivo.
await page.evaluate(() => document.querySelector("#sec-prototipo .panel-title").click());
await page.waitForTimeout(300);
const inputFoto = await page.$("#sec-prototipo input[type=file]");
await inputFoto.setInputFiles("foto-lugar.png");
await page.waitForTimeout(800);

const S1 = await page.evaluate(() => {
  const ov = document.getElementById("proto-overlay");
  return {
    overlay: ov && ov.style.display !== "none",
    opacidad: ov ? +ov.style.opacity : null,
    thumb: !!document.querySelector("#sec-prototipo .proto-thumb[src]"),
  };
});
console.log("overlay:", JSON.stringify(S1));
await page.screenshot({ path: "v215-proto-overlay.png" });

// Inserta un banco para el prototipo y activa pantalla verde.
await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  ed.insertarMaquina("banco-plano", new T.Vector3(0, 0, 0));
  ed.select(null);
});
await page.click("#sec-prototipo button:has-text('Pantalla verde')");
await page.waitForTimeout(600);
const S2 = await page.evaluate(() => ({ verde: window.exersuite.editor.isPantallaVerde() }));
await page.screenshot({ path: "v215-proto-verde.png" });

// Captura compuesta (verifica la confirmación y la descarga del PNG).
const descarga = page.waitForEvent("download", { timeout: 8000 }).catch(() => null);
await page.click("#sec-prototipo button:has-text('Captura compuesta')");
await page.waitForTimeout(900);
const S3 = await page.evaluate(() => ({
  boton: document.querySelector("#sec-prototipo .proto-btn.primario").textContent,
}));
const dl = await descarga;
S3.descarga = dl ? dl.suggestedFilename() : null;
// El compuesto queda en la galería (IndexedDB): recupéralo para inspección.
const compuesta = await page.evaluate(() => new Promise((res) => {
  const req = indexedDB.open("exersuite3d");
  req.onsuccess = () => {
    const db = req.result;
    const st = db.transaction("capturas", "readonly").objectStore("capturas");
    const all = st.getAll();
    all.onsuccess = () => {
      const caps = all.result.sort((a, b) => b.tomadaEn - a.tomadaEn);
      res(caps[0]?.dataUrl ?? null);
    };
    all.onerror = () => res(null);
  };
  req.onerror = () => res(null);
}));
S3.galeria = !!compuesta;
if (compuesta) fs.writeFileSync("v215-prototipo-compuesto.png", Buffer.from(compuesta.split(",")[1], "base64"));
console.log("verde:", JSON.stringify(S2), "compuesta:", JSON.stringify(S3));
const ok = S1.overlay && S1.opacidad === 0.45 && S1.thumb && S2.verde && /Prototipo guardado/.test(S3.boton) && S3.galeria;
console.log(JSON.stringify({ ok }));
console.log("ERRORES:", errores.length ? errores.join("\n") : "ninguno");
await browser.close();
