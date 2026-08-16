// El sitio, servido de verdad, en los dos idiomas.
import { chromium } from "playwright-core";
const browser = await chromium.launch({
  // El Chromium de Playwright ya instalado. Se puede apuntar a otro con
  // CHROMIUM=/ruta/al/chrome (ver LEEME.md).
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox"],
});
const fallos = [];
const ok = (c, m) => { if (!c) fallos.push(m); console.log((c ? "✓ " : "✗ ") + m); };
const DIR = ".";

for (const [idioma, locale, ruta] of [["es", "es-CL", "/"], ["en", "en-US", "/"]]) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale,
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  const rotas = [];
  page.on("response", (r) => { if (r.status() >= 400) rotas.push(`${r.status()} ${r.url()}`); });
  page.on("pageerror", (e) => rotas.push("JS " + e.message));
  await page.goto(`http://127.0.0.1:3100${ruta}`, { waitUntil: "networkidle" });

  // RECORRER LA PÁGINA ANTES DE MEDIR.
  //
  // Desde v0.2.71 el escaparate del hub trae quince fotografías con
  // `loading="lazy"`, y una imagen diferida que todavía no ha entrado en
  // pantalla tiene `complete === false`: la comprobación de más abajo las
  // contaba a todas como rotas. Se baja hasta el pie, se vuelve arriba y se
  // espera a que no quede ninguna a medias.
  await page.evaluate(async () => {
    const paso = window.innerHeight * 0.8;
    for (let y = 0; y < document.body.scrollHeight; y += paso) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForFunction(
    () => [...document.querySelectorAll("img")].every((i) => i.complete),
    null,
    { timeout: 20000 },
  );

  const info = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    h1: document.querySelector("h1")?.textContent ?? "",
    secciones: [...document.querySelectorAll("h2")].map((h) => h.textContent),
    imagenes: [...document.querySelectorAll("img")].map((i) => ({
      src: i.getAttribute("src"), ok: i.complete && i.naturalWidth > 0,
    })),
    pies: [...document.querySelectorAll("figcaption")].map((f) => f.textContent),
    faq: [...document.querySelectorAll(".faq summary")].map((s) => s.textContent),
    conmutador: [...document.querySelectorAll(".idiomas a")].map((a) => a.textContent + (a.classList.contains("activo") ? "*" : "")),
    desbordaX: document.documentElement.scrollWidth > window.innerWidth + 1,
  }));

  console.log(`\n════ ${idioma.toUpperCase()} (Accept-Language ${locale}) ════`);
  console.log("  html lang:", info.lang);
  console.log("  h1:", info.h1.slice(0, 78));
  console.log("  secciones:", info.secciones.join(" · "));
  console.log("  conmutador:", info.conmutador.join(" "));
  ok(info.lang === idioma, `el documento se declara en ${idioma}`);
  ok(info.conmutador.some((t) => t.endsWith("*")), "el conmutador marca el idioma activo");
  const rotasImg = info.imagenes.filter((i) => !i.ok);
  ok(rotasImg.length === 0, `todas las imágenes cargan (${info.imagenes.length} imágenes${rotasImg.length ? ": rotas " + rotasImg.map((i) => i.src).join(", ") : ""})`);
  ok(info.pies.length >= 8, `la galería trae sus pies de foto (${info.pies.length})`);
  ok(info.faq.length >= 6, `las preguntas frecuentes están (${info.faq.length})`);
  ok(!info.desbordaX, "la página no desborda en horizontal");
  ok(rotas.length === 0, `sin respuestas de error ni fallos de JS${rotas.length ? ": " + rotas.join(" | ") : ""}`);
  if (idioma === "en") {
    ok(/Check that your machine/.test(info.h1), "el titular está traducido");
    ok(info.pies.some((p) => /workshop|mannequin/i.test(p)), "y los pies de foto también");
    ok(info.faq.some((p) => /Do I need|offline/i.test(p)), "y las preguntas frecuentes");
  } else {
    ok(/Comprueba que tu máquina/.test(info.h1), "el titular es el español");
  }
  await page.screenshot({ path: `${DIR}/sitio-${idioma}.png`, fullPage: true });
  await ctx.close();
}

// La cookie manda sobre el idioma del navegador: un inglés que elige español
// sigue viendo español al recargar.
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "en-US" });
  const page = await ctx.newPage();
  await page.goto("http://127.0.0.1:3100/es", { waitUntil: "networkidle" });
  await page.goto("http://127.0.0.1:3100/", { waitUntil: "networkidle" });
  const lang = await page.evaluate(() => document.documentElement.lang);
  ok(lang === "es", `la elección persiste por cookie sobre el idioma del navegador (lang=${lang})`);
  await ctx.close();
}

console.log(fallos.length ? "\n❌ " + fallos.join(" · ") : "\n✅ todo correcto");
await browser.close();
process.exit(fallos.length ? 1 : 0);
