// Marketplace v0.2.37: las SIETE ventanas del hub (newcomers, new arrivals,
// economía local, vitrina, makers, got a wish, join) y su navegación.
import { chromium } from "playwright-core";
const browser = await chromium.launch({
  // El Chromium de Playwright ya instalado. Se puede apuntar a otro con
  // CHROMIUM=/ruta/al/chrome (ver LEEME.md).
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errores = [];
page.on("pageerror", (e) => errores.push("PAGEERROR: " + e.message));
await page.goto("http://127.0.0.1:4174/");
await page.waitForTimeout(1000);
await page.click("text=🛒 MARKETPLACE"); await page.waitForTimeout(700);

const ir = async (txt) => { await page.click(`.mk-tab:has-text('${txt}')`); await page.waitForTimeout(400); };
const R = {};

// ---------------------------------------------------------- 1) NEWCOMERS
await ir("Newcomers");
R.newcomers = await page.evaluate(() => ({
  id: !!document.querySelector("#mk-newcomers"),
  marcas: document.querySelectorAll(".mk-marca-ficha").length,
  cintas: [...document.querySelectorAll(".mk-cinta-marca")].map((e) => e.textContent),
  datos: document.querySelectorAll(".mk-dato-num").length,
  productos: document.querySelectorAll(".mkc-card").length,
}));
await page.screenshot({ path: "v237-newcomers.png" });
// "Ver en la vitrina" salta a la ventana 4 ya filtrada por esa marca.
await page.click(".mk-marca-ficha >> nth=0 >> button:has-text('Ver en la vitrina')");
await page.waitForTimeout(500);
R.saltoVitrina = await page.evaluate(() => ({
  activa: document.querySelector(".mk-tab.active")?.dataset.ventana,
  pill: document.querySelector(".mk-pill")?.textContent,
  n: document.querySelectorAll(".mkc-card").length,
}));

// ------------------------------------------------------- 2) NEW ARRIVALS
await ir("New arrivals");
R.novedades = await page.evaluate(() => ({
  id: !!document.querySelector("#mk-novedades"),
  estrenos: document.querySelectorAll(".mkc-cinta-nuevo").length,
  pies: document.querySelectorAll(".mkc-pie").length,
  proximos: document.querySelectorAll(".mk-grid .mk-card").length,
}));
await page.screenshot({ path: "v237-novedades.png" });

// ------------------------------------------------------ 3) ECONOMÍA LOCAL
await ir("Economía local");
R.localCL = await page.evaluate(() => ({
  id: !!document.querySelector("#mk-local"),
  paises: document.querySelectorAll(".mk-pais").length,
  activo: document.querySelector(".mk-pais.active")?.dataset.pais,
  locales: [...document.querySelectorAll(".mk-cinta-marca")].length,
  fichas: document.querySelectorAll(".mk-marca-ficha").length,
}));
await page.click(".mk-pais:has-text('Japón')");
await page.waitForTimeout(400);
R.localJP = await page.evaluate(() => ({
  activo: document.querySelector(".mk-pais.active")?.dataset.pais,
  locales: document.querySelectorAll(".mk-cinta-marca").length,
  titulo: document.querySelector("#mk-local .mk-titulo:nth-of-type(2)")?.textContent,
  japon: document.body.textContent.includes("Kaizen Ironworks"),
}));
await page.screenshot({ path: "v237-local.png" });
await page.click(".mk-pais:has-text('Chile')");
await page.waitForTimeout(300);

// ------------------------------------------------------------- 5) MAKERS
await ir("Makers");
R.makers = await page.evaluate(() => ({
  id: !!document.querySelector("#mk-makers"),
  hilos: document.querySelectorAll(".mk-hilo").length,
  chips: document.querySelectorAll("#mk-makers .mkc-chip").length,
  etiquetas: [...document.querySelectorAll(".mk-etiqueta")].map((e) => e.className.split(" ")[1]),
  barras: document.querySelectorAll(".mk-barra-fill").length,
  respuestasOcultas: [...document.querySelectorAll(".mk-respuestas")].every((e) => e.classList.contains("mkc-oculto")),
}));
// Desplegar respuestas del primer hilo.
await page.click(".mk-hilo >> nth=0 >> button:has-text('Respuestas')");
await page.waitForTimeout(250);
R.respuestas = await page.evaluate(() => ({
  abiertas: !document.querySelector(".mk-respuestas").classList.contains("mkc-oculto"),
  n: document.querySelectorAll(".mk-hilo .mk-respuestas:not(.mkc-oculto) .mk-respuesta").length,
  marca: !!document.querySelector(".mk-respuesta.de-marca"),
}));
// Apoyar sube el contador.
const antes = await page.textContent(".mk-apoyo-btn >> nth=0");
await page.click(".mk-apoyo-btn >> nth=0");
await page.waitForTimeout(200);
const despues = await page.textContent(".mk-apoyo-btn >> nth=0");
R.apoyo = { antes, despues, sube: parseInt(despues.replace(/\D/g, "")) === parseInt(antes.replace(/\D/g, "")) + 1 };
// Filtrar por "Busco patrocinio".
await page.click("#mk-makers .mkc-chip:has-text('patrocinio')");
await page.waitForTimeout(300);
R.filtroForo = await page.evaluate(() => ({
  hilos: document.querySelectorAll(".mk-hilo").length,
  soloPatrocinio: [...document.querySelectorAll(".mk-etiqueta")].every((e) => e.classList.contains("et-patrocinio")),
}));
await page.screenshot({ path: "v237-makers.png" });

// --------------------------------------------------------- 6) GOT A WISH
await ir("Got a wish");
R.deseo = await page.evaluate(() => ({
  id: !!document.querySelector("#mk-deseo"),
  encargos: document.querySelectorAll(".mk-deseo").length,
  estados: [...document.querySelectorAll(".mk-estado")].map((e) => e.className.split(" ")[1]),
  mensajes: document.querySelectorAll(".mk-msg").length,
  campos: document.querySelectorAll("#mk-deseo .mk-campo").length,
  marcas: document.querySelectorAll(".mk-chip-marca").length,
  swatches: document.querySelectorAll(".mk-swatch").length,
}));
// Escribir a la marca añade el mensaje al hilo.
await page.fill(".mk-chat-envio .mk-input >> nth=0", "¿Pueden mandar el .json corregido?");
await page.click(".mk-chat-envio button:has-text('Enviar') >> nth=0");
await page.waitForTimeout(250);
R.chat = await page.evaluate(() => ({
  mensajes: document.querySelectorAll(".mk-msg").length,
  ultimo: [...document.querySelectorAll(".mk-deseo")][0]?.querySelectorAll(".mk-msg")?.length,
}));
// La pintura del acabado responde al swatch.
const colorAntes = await page.getAttribute(".mk-preview svg rect >> nth=0", "fill");
await page.click(".mk-swatch >> nth=2");
await page.waitForTimeout(200);
const colorDespues = await page.getAttribute(".mk-preview svg rect >> nth=0", "fill");
R.pintura = { colorAntes, colorDespues, cambia: colorAntes !== colorDespues };
await page.screenshot({ path: "v237-deseo.png" });

// ----------------------------------------------------------- 7) JOIN
await ir("Join EXERSUITE3D");
R.unirse = await page.evaluate(() => ({
  id: !!document.querySelector("#mk-unirse"),
  pasos: document.querySelectorAll(".mk-paso").length,
  numeros: [...document.querySelectorAll(".mk-paso-num")].map((e) => e.textContent).join(""),
  ventajas: document.querySelectorAll("#mk-unirse .mk-grid .mk-card").length,
  campos: document.querySelectorAll("#mk-unirse .mk-campo").length,
  checks: document.querySelectorAll(".mk-check-in").length,
  datos: document.querySelectorAll(".mk-datos-hub .mk-dato").length,
  escaneo: document.body.textContent.includes("escáner fotográfico"),
}));
await page.click("#mk-unirse button:has-text('Solicitar incorporación')");
await page.waitForTimeout(300);
R.unirseEnvio = await page.evaluate(() => document.body.textContent.includes("Solicitud demo enviada"));
await page.screenshot({ path: "v237-unirse.png" });

for (const [k, v] of Object.entries(R)) console.log(k + ":", JSON.stringify(v));

const ok =
  R.newcomers.id && R.newcomers.marcas === 3 && R.newcomers.cintas.length === 3 &&
    R.newcomers.cintas.every((c) => /RECI/.test(c)) && R.newcomers.datos === 9 && R.newcomers.productos === 6 &&
  R.saltoVitrina.activa === "vitrina" && !!R.saltoVitrina.pill && R.saltoVitrina.n === 2 &&
  R.novedades.id && R.novedades.estrenos === 7 && R.novedades.pies === 7 && R.novedades.proximos === 3 &&
  R.localCL.id && R.localCL.paises === 7 && R.localCL.activo === "cl" && R.localCL.locales === 2 && R.localCL.fichas === 5 &&
  R.localJP.activo === "jp" && R.localJP.locales === 1 && R.localJP.japon &&
  R.makers.id && R.makers.hilos === 5 && R.makers.barras === 3 && R.makers.respuestasOcultas &&
  R.respuestas.abiertas && R.respuestas.n >= 2 && R.respuestas.marca &&
  R.apoyo.sube && R.filtroForo.hilos === 2 && R.filtroForo.soloPatrocinio &&
  R.deseo.id && R.deseo.encargos === 2 && R.deseo.estados.includes("est-presupuestado") &&
    R.deseo.mensajes === 6 && R.deseo.campos >= 5 && R.deseo.marcas === 7 && R.deseo.swatches === 7 &&
  R.chat.mensajes === 7 && R.pintura.cambia &&
  R.unirse.id && R.unirse.pasos === 4 && R.unirse.numeros === "1234" && R.unirse.ventajas === 4 &&
    R.unirse.campos === 6 && R.unirse.checks === 2 && R.unirse.datos === 3 && R.unirse.escaneo &&
  R.unirseEnvio;
console.log(JSON.stringify({ ok }));
console.log("ERRORES:", errores.length ? errores.join("\n") : "ninguno");
await browser.close();
