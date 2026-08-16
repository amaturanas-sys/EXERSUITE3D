// v0.2.29: (A) la foto de fondo también hace ZOOM (pinza, rueda y control
// fino) además de moverse; (B) con la perspectiva fijada aparece la PERILLA
// de inclinación que calza el suelo del modelo con el de la foto; (C) el
// encuadre completo (offset + zoom) se replica en la producción por capas.
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
await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  ed.insertarMaquina("rack-sentadillas", new T.Vector3(0, 0, 0));
  ed.select(null);
});
await page.waitForTimeout(2200); // autoguardado

// Home → SIMULADOR → 📸 Prototipo (la función vive en el viewer).
await page.click("#toolbar button:has-text('Home')"); await page.waitForTimeout(500);
const salir = page.locator("button:has-text('Salir sin guardar')");
if (await salir.count()) await salir.click();
await page.waitForTimeout(800);
await page.click("text=▶ SIMULADOR"); await page.waitForTimeout(500);
await page.click("text=↻  Sesión anterior"); await page.waitForTimeout(4000);
await page.click("#simbar button:has-text('Prototipo')"); await page.waitForTimeout(500);
await page.setInputFiles("#proto-viewer input[type=file]", "foto-garaje.jpg");
await page.waitForTimeout(1200);

// A) Zoom de la foto: rueda, pinza (dos punteros) y control fino.
await page.click("#proto-viewer button:has-text('Mover y escalar foto')");
await page.waitForTimeout(300);
const capa = await page.evaluate(() => !!document.getElementById("proto-drag"));

// A1) Arrastre (sigue funcionando) y rueda para acercar.
await page.mouse.move(640, 400);
await page.mouse.down();
await page.mouse.move(640, 350, { steps: 5 });
await page.mouse.up();
await page.waitForTimeout(200);
const trasArrastre = await page.evaluate(
  () => document.getElementById("proto-overlay").style.transform,
);
await page.mouse.move(640, 380);
for (let i = 0; i < 5; i++) await page.mouse.wheel(0, -120);
await page.waitForTimeout(300);
const A = await page.evaluate(() => {
  const ov = document.getElementById("proto-overlay");
  const m = /scale\(([\d.]+)\)/.exec(ov.style.transform);
  return {
    transform: ov.style.transform,
    escala: m ? +(+m[1]).toFixed(3) : null,
    slider: +document.querySelectorAll("#proto-viewer input[type=range]")[1].value,
  };
});
console.log("A-rueda:", JSON.stringify({ capa, trasArrastre, ...A }));

// A2) PINZA de dos dedos: separar los dedos amplía la foto.
const P = await page.evaluate(async () => {
  const capa = document.getElementById("proto-drag");
  const ev = (tipo, id, x, y) =>
    capa.dispatchEvent(
      new PointerEvent(tipo, { pointerId: id, clientX: x, clientY: y, bubbles: true }),
    );
  capa.setPointerCapture = () => {};
  const antes = document.getElementById("proto-overlay").style.transform;
  ev("pointerdown", 1, 600, 380);
  ev("pointerdown", 2, 680, 380);
  ev("pointermove", 1, 560, 380);
  ev("pointermove", 2, 720, 380); // separación 80 → 160 (×2)
  ev("pointerup", 1, 560, 380);
  ev("pointerup", 2, 720, 380);
  const t = document.getElementById("proto-overlay").style.transform;
  const m = /scale\(([\d.]+)\)/.exec(t);
  return { antes, despues: t, escala: m ? +(+m[1]).toFixed(3) : null };
});
console.log("A2-pinza:", JSON.stringify(P));

// A3) Control fino: llevar el zoom a 120 % exacto.
await page.evaluate(() => {
  const s = document.querySelectorAll("#proto-viewer input[type=range]")[1];
  s.value = "120";
  s.dispatchEvent(new Event("input", { bubbles: true }));
});
await page.waitForTimeout(300);
const A3 = await page.evaluate(() => document.getElementById("proto-overlay").style.transform);
console.log("A3-fino:", A3);
await page.screenshot({ path: "v229-zoom-foto.png" });

// B) PERILLA de inclinación: aparece al fijar la perspectiva y cambia el
//    ángulo de la vista sobre el suelo sin tocar giro ni distancia.
const B0 = await page.evaluate(() => {
  const dial = document.querySelector("#proto-viewer .proto-perilla");
  const fila = document.querySelector("#proto-viewer .proto-fila:has(.proto-lectura)");
  return {
    // Ni la perilla ni su fila de lectura se ven antes de fijar (display
    // REAL, no solo la clase: la utilidad debe ganar a .proto-fila).
    perillaOculta:
      getComputedStyle(dial).display === "none" && getComputedStyle(fila).display === "none",
  };
});
await page.click("#proto-viewer button:has-text('Fijar perspectiva')");
await page.waitForTimeout(400);
const B1 = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const d = ed.sceneManager.camera.position.clone().sub(ed.orbit.target);
  const dial = document.querySelector("#proto-viewer .proto-perilla");
  const fila = document.querySelector("#proto-viewer .proto-fila:has(.proto-lectura)");
  return {
    visible:
      getComputedStyle(dial).display !== "none" && getComputedStyle(fila).display !== "none",
    bloqueada: ed.isOrbitaBloqueada(),
    inclinacion: +ed.getInclinacionVista().toFixed(2),
    lectura: document.querySelector("#proto-viewer .proto-lectura").textContent,
    azimut: +((Math.atan2(d.x, d.z) * 180) / Math.PI).toFixed(2),
    dist: +d.length().toFixed(2),
    void: T ? 1 : 0,
  };
});
// Arrastrar la perilla a ~20° (puntero a la derecha y algo arriba).
const perilla = await page.evaluate(() => {
  const r = document.querySelector("#proto-viewer .proto-perilla").getBoundingClientRect();
  return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, r: r.width / 2 };
});
const ang = (20 * Math.PI) / 180;
await page.mouse.move(perilla.cx + Math.cos(ang) * perilla.r * 0.8, perilla.cy - Math.sin(ang) * perilla.r * 0.8);
await page.mouse.down();
await page.mouse.up();
await page.waitForTimeout(400);
const B2 = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const d = ed.sceneManager.camera.position.clone().sub(ed.orbit.target);
  return {
    inclinacion: +ed.getInclinacionVista().toFixed(2),
    lectura: document.querySelector("#proto-viewer .proto-lectura").textContent,
    azimut: +((Math.atan2(d.x, d.z) * 180) / Math.PI).toFixed(2),
    dist: +d.length().toFixed(2),
  };
});
// Pasos finos de 0,5°.
await page.click("#proto-viewer .proto-fila:has(.proto-lectura) .proto-mini >> nth=1");
await page.waitForTimeout(300);
const B3 = await page.evaluate(() => +window.exersuite.editor.getInclinacionVista().toFixed(2));
console.log("B-perilla:", JSON.stringify({ ...B0, ...B1, tras: B2, masMedio: B3 }));
await page.screenshot({ path: "v229-perilla-inclinacion.png" });

// C) Producción: el PNG replica encuadre + zoom (misma composición). El
//    botón confirma durante 1,8 s, así que se sondea mientras tanto.
await page.click("#proto-viewer button:has-text('Producir')");
let prod = "";
for (let i = 0; i < 30 && !/guardado|no se pudo/i.test(prod); i++) {
  await page.waitForTimeout(200);
  prod = await page.evaluate(
    () => document.querySelector("#proto-viewer button.primario").textContent ?? "",
  );
}
console.log("C-produccion:", JSON.stringify({ prod }));

const ok =
  capa && /translate\(0px, -50px\)/.test(trasArrastre) &&
  A.escala > 1.2 && A.slider === Math.round(A.escala * 100) &&
  Math.abs(P.escala - 2 * A.escala) < 0.1 && // la pinza ×2 duplica la escala
  /scale\(1.2\)/.test(A3) &&
  B0.perillaOculta && B1.visible && B1.bloqueada &&
  Math.abs(B2.inclinacion - 20) < 1.5 && B2.lectura === "20°" &&
  Math.abs(B2.azimut - B1.azimut) < 0.5 && Math.abs(B2.dist - B1.dist) < 0.5 &&
  Math.abs(B3 - (B2.inclinacion + 0.5)) < 0.2 &&
  /guardado/i.test(prod);
console.log(JSON.stringify({ ok }));
console.log("ERRORES:", errores.length ? errores.join("\n") : "ninguno");
await browser.close();
