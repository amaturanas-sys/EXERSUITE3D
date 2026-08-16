// Línea base v0.2.13: tirar de la barra de jalón BAJO horizontalmente
// transmite al portadiscos (dBarraH ~50 cm, portaSube ~21-27 cm).
import { chromium } from "playwright-core";
const browser = await chromium.launch({
  // El Chromium de Playwright ya instalado. Se puede apuntar a otro con
  // CHROMIUM=/ruta/al/chrome (ver LEEME.md).
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1100, height: 750 } });
const errores = [];
page.on("pageerror", (e) => errores.push("PAGEERROR: " + e.message));
await page.goto("http://localhost:4174/");
await page.waitForTimeout(900);
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);
const R = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  ed.insertarMaquina("rack-torre", new T.Vector3(0, 0, 0));
  ed.select(null);
  ed.toggleSimulation();
  await new Promise((r) => setTimeout(r, 2500));
  const barra = [...ed.objects.values()].find((o) => (o.name || "").toLowerCase().includes("jalón bajo"));
  const porta = [...ed.objects.values()].find((o) => o.componentId === "portadiscos-ttp");
  const b0 = barra.mesh.position.clone();
  const p0 = porta.mesh.position.clone();
  ed.physics.grab(barra.id, b0.clone());
  for (let i = 0; i < 40; i++) {
    // Remo real: la barra sube al torso (por ENCIMA del riel de piso, y≈20)
    // mientras se tira hacia atrás.
    ed.physics.dragTo(b0.clone().add(new T.Vector3(0, Math.min(4 + i, 24), 4 + i * 1.6)));
    await new Promise((r) => setTimeout(r, 130));
  }
  await new Promise((r) => setTimeout(r, 1200));
  return {
    dBarraH: +(barra.mesh.position.z - b0.z).toFixed(1),
    portaSube: +(porta.mesh.position.y - p0.y).toFixed(1),
    tensionKg: +ed.tensionManoKg().toFixed(1),
  };
});
console.log("jalonbajo:", JSON.stringify(R));
console.log(JSON.stringify({ ok: R.dBarraH > 15 && R.portaSube > 3 }));
console.log("ERRORES:", errores.length ? errores.join("\n") : "ninguno");
await browser.close();
