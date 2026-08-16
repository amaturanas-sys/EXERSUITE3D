// El enlace al sitio del proyecto, en la Home de la app y en los dos idiomas.
import { chromium } from "playwright-core";
const browser = await chromium.launch({
  // El Chromium de Playwright ya instalado. Se puede apuntar a otro con
  // CHROMIUM=/ruta/al/chrome (ver LEEME.md).
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const fallos = [];
const ok = (c, m) => { if (!c) fallos.push(m); console.log((c ? "✓ " : "✗ ") + m); };
for (const idioma of ["es", "en"]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  await page.goto("http://127.0.0.1:4174/");
  await page.evaluate((l) => localStorage.setItem("exersuite.idioma", l), idioma);
  await page.reload();
  await page.waitForTimeout(1200);
  const info = await page.evaluate(() => {
    const fila = document.querySelector(".land-sitio");
    const a = fila?.querySelector("a");
    return {
      hay: !!fila,
      etiqueta: fila?.querySelector("span")?.textContent ?? "",
      texto: a?.textContent ?? "",
      href: a?.getAttribute("href") ?? "",
      target: a?.getAttribute("target") ?? "",
      rel: a?.getAttribute("rel") ?? "",
      copiar: !!fila?.querySelector(".land-copiar"),
      visible: fila ? getComputedStyle(fila).display !== "none" : false,
    };
  });
  console.log(`\n── ${idioma} ──`, JSON.stringify(info));
  ok(info.hay && info.visible, `el enlace al sitio está a la vista en la Home (${idioma})`);
  ok(info.texto === "exersuite3d.vercel.app", `la dirección se lee escrita: "${info.texto}"`);
  ok(info.href === `https://exersuite3d.vercel.app/?lang=${idioma}`, `y lleva el idioma de la app (${info.href})`);
  ok(info.target === "_blank" && /noopener/.test(info.rel), "abre fuera y sin exponer la ventana");
  ok(info.copiar, "y tiene botón de copiar por si la ventana no deja abrir pestañas");
  ok(idioma === "en" ? /Project site/.test(info.etiqueta) : /Sitio del proyecto/.test(info.etiqueta),
    `la etiqueta está en el idioma de la app ("${info.etiqueta.trim()}")`);
  if (idioma === "es") await page.screenshot({ path: "app-home-enlace.png" });
  await page.close();
}
console.log(fallos.length ? "\n❌ " + fallos.join(" · ") : "\n✅ todo correcto");
await browser.close();
process.exit(fallos.length ? 1 : 0);
