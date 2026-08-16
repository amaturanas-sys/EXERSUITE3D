// Curaduría de la paleta (v0.2.18 → v0.2.28): sin redundancias y SIN la
// subpestaña de despiece TTP/POWERRACK; prefabs/máquinas y Biblioteca de
// modelos INTACTOS (siguen resolviendo todos los ids).
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

// Biblioteca de modelos: las piezas ocultas de la paleta SIGUEN listadas.
await page.click("text=🛒 MARKETPLACE"); await page.waitForTimeout(1200);
// El hub sustituyó al marketplace de siete ventanas en v0.2.62: la puerta a la
// biblioteca ya no es una tarjeta `.mkc-card` sino el «Ver en 3D» de cualquier
// ficha del mercado.
await page.evaluate(() => [...document.querySelectorAll(".hub-btn-card")]
  .find((b) => /Ver en 3D|View in 3D/.test(b.textContent)).click());
await page.waitForTimeout(1000);
const LIB = await page.evaluate(() => {
  const t = document.body.textContent;
  return {
    jhook: t.includes("Gancho J / soporte barra"),
    montanteRack: t.includes("Montante de rack"),
    eslabones: t.includes("Cadena de eslabones"),
  };
});
console.log("biblioteca de modelos:", JSON.stringify(LIB));

await page.goto("http://127.0.0.1:4174/"); await page.waitForTimeout(800);
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(400);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);

const P = await page.evaluate(() => {
  const botones = [...document.querySelectorAll("#palette .comp-btn")];
  const textos = botones.map((b) => b.textContent.trim());
  return {
    total: botones.length,
    // v0.2.26: la Roldana VUELVE a la paleta (entrada de la herramienta en
    // dos pasos); Cable, Base de apoyo y Fulcro salen (revisión de inventario).
    ocultasFuera: !textos.some((t) =>
      /Gancho J \/ soporte barra|Montante de rack|Barra de dominadas|Cadena de eslabones|Listón de Kevlar|Base de apoyo|Fulcro/.test(t)
    ) && !textos.includes("Guía") && !textos.includes("Riel") && !textos.includes("Cable") &&
      textos.includes("Roldana"),
    realesDentro: textos.some((t) => t.includes("Jota con rodillo")) &&
      textos.some((t) => t.includes("Pilar vertical TTP")),
    cabDespiece: !!document.querySelector(".cat-plegable"),
    // v0.2.28: la subpestaña de despiece TTP/POWERRACK se ELIMINÓ.
    sinSeccionDespiece: ![...document.querySelectorAll(".cat-plegable")].some((h) =>
      /Despiece/i.test(h.textContent ?? "")),
    despiecePieza: textos.some((t) => t.includes("Travesaño TTP")),
  };
});
console.log("paleta:", JSON.stringify(P));
await page.screenshot({ path: "v218-paleta-curada.png" });

// Las MÁQUINAS reales siguen armándose completas (usan piezas del despiece
// y ocultas por id — la curaduría no las toca).
const M = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const antes = new Set([...ed.objects.keys()]);
  ed.insertarMaquina("rack-sentadillas", new T.Vector3(-200, 0, 0));
  const rack = [...ed.objects.values()].filter((o) => !antes.has(o.id)).length;
  const antes2 = new Set([...ed.objects.keys()]);
  ed.insertarMaquina("rack-torre", new T.Vector3(200, 0, 0));
  const nuevos = [...ed.objects.values()].filter((o) => !antes2.has(o.id));
  const torre = nuevos.length;
  const conDespiece = nuevos.filter((o) => o.componentId.endsWith("-ttp")).length;
  return { rack, torre, conDespiece, cuerdas: ed.listRopes().length };
});
console.log("maquinas:", JSON.stringify(M));

// Modo sencillo intacto (10 piezas básicas).
await page.goto("http://127.0.0.1:4174/"); await page.waitForTimeout(800);
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Sencillo')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2000);
const S = await page.evaluate(() => ({
  botones: document.querySelectorAll("#palette .comp-btn:not(.maquina-btn)").length,
  sinDespiece: !document.querySelector(".despiece-cont"),
}));
console.log("sencillo:", JSON.stringify(S));

const ok = LIB.jhook && LIB.montanteRack && LIB.eslabones &&
  P.ocultasFuera && P.realesDentro && P.cabDespiece &&
  P.sinSeccionDespiece && !P.despiecePieza &&
  M.rack === 14 && M.torre > 20 && M.conDespiece > 8 && M.cuerdas === 2 &&
  S.botones === 10 && S.sinDespiece;
console.log(JSON.stringify({ ok }));
console.log("ERRORES:", errores.length ? errores.join("\n") : "ninguno");
await browser.close();
