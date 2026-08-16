// Marketplace v0.2.37: la VITRINA DIGITAL es la ventana por defecto del hub —
// historias por marca arriba, catálogo con buscador, filtros y carrito abajo.
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
await page.click("text=🛒 MARKETPLACE"); await page.waitForTimeout(700);

const S1 = await page.evaluate(() => ({
  pestanas: document.querySelectorAll(".mk-tab").length,
  activa: document.querySelector(".mk-tab.active")?.dataset.ventana,
  productos: document.querySelectorAll(".mkc-card").length,
  imagenes: document.querySelectorAll(".mkc-img svg").length,
  ofertas: document.querySelectorAll(".mkc-badge").length,
  antes: document.querySelectorAll(".mkc-antes").length,
  chips: document.querySelectorAll(".mkc-chip").length,
  ratings: document.querySelectorAll(".mkc-rating").length,
  historias: document.querySelectorAll(".mk-historia").length,
  buscador: !!document.querySelector(".mk-buscador"),
  carritoOculto: document.querySelector(".mkc-carrito").classList.contains("mkc-oculto"),
}));
console.log("vitrina:", JSON.stringify(S1));
await page.screenshot({ path: "v237-vitrina.png" });

// Buscador: "kettlebell" deja una sola ficha; vaciarlo las devuelve todas.
await page.fill(".mk-buscador", "kettlebell");
await page.waitForTimeout(250);
const S2 = await page.evaluate(() => ({
  n: document.querySelectorAll(".mkc-card").length,
  txt: document.querySelector(".mkc-nombre")?.textContent,
}));
await page.fill(".mk-buscador", "Andes");
await page.waitForTimeout(250);
const S2b = await page.evaluate(() => document.querySelectorAll(".mkc-card").length);
await page.fill(".mk-buscador", "");
await page.waitForTimeout(250);

// Filtro por categoría: Accesorios → 6 productos.
await page.click(".mkc-chip:has-text('Accesorios')");
await page.waitForTimeout(300);
const S3 = await page.evaluate(() => document.querySelectorAll(".mkc-card").length);
await page.click(".mkc-chip:has-text('Todo')");
await page.waitForTimeout(300);

// Historia: se abre el visor, avanza y filtra la vitrina por esa marca.
await page.click(".mk-historia >> nth=0");
await page.waitForTimeout(400);
const S4 = await page.evaluate(() => ({
  visor: !!document.querySelector(".mk-hv"),
  barras: document.querySelectorAll(".mk-hv-barra").length,
  marca: document.querySelector(".mk-hv-marca")?.textContent,
  titulo: document.querySelector(".mk-hv-titulo")?.textContent,
}));
await page.click(".mk-hv-next");
await page.waitForTimeout(250);
const S5 = await page.evaluate(() => document.querySelector(".mk-hv-titulo")?.textContent);
await page.screenshot({ path: "v237-historia.png" });
await page.click(".mk-hv-cta");
await page.waitForTimeout(400);
const S6 = await page.evaluate(() => ({
  cerrado: !document.querySelector(".mk-hv"),
  pill: document.querySelector(".mk-pill")?.textContent,
  n: document.querySelectorAll(".mkc-card").length,
}));
await page.click(".mk-pill-x");
await page.waitForTimeout(250);

// Carrito: añade rack (2×) + banco → contador y total correctos.
await page.click(".mkc-card:has-text('Power rack IF-700') button:has-text('Añadir')");
await page.click(".mkc-card:has-text('Power rack IF-700') button:has-text('Añadir')");
await page.click(".mkc-card:has-text('Banco plano clásico') button:has-text('Añadir')");
await page.waitForTimeout(300);
const S7 = await page.evaluate(() => ({
  visible: !document.querySelector(".mkc-carrito").classList.contains("mkc-oculto"),
  txt: document.querySelector(".mkc-carrito-txt").textContent,
}));
console.log("busca:", JSON.stringify(S2), S2b, "accesorios:", S3, "historia:", JSON.stringify(S4), "→", S5);
console.log("filtro marca:", JSON.stringify(S6), "carrito:", JSON.stringify(S7));

// El carrito es COMPARTIDO: sigue lleno al saltar a otra ventana del hub.
await page.click(".mk-tab:has-text('New arrivals')");
await page.waitForTimeout(400);
const S8 = await page.evaluate(() => ({
  txt: document.querySelector(".mkc-carrito-txt")?.textContent,
  visible: !document.querySelector(".mkc-carrito").classList.contains("mkc-oculto"),
}));
await page.click(".mk-tab:has-text('Vitrina')");
await page.waitForTimeout(400);

// Pedido demo confirma; Vaciar esconde la barra.
await page.click(".mkc-carrito button:has-text('Pedido demo')");
await page.waitForTimeout(300);
const S9 = await page.evaluate(() => document.querySelector(".mkc-carrito").textContent.includes("Pedido demo registrado"));
await page.click(".mkc-carrito button:has-text('Vaciar')");
await page.waitForTimeout(300);
const S10 = await page.evaluate(() => document.querySelector(".mkc-carrito").classList.contains("mkc-oculto"));

// "Ver" abre la Biblioteca real.
const S11 = await page.evaluate(() => !!document.querySelector(".mk-demo"));
await page.click(".mkc-card >> nth=0 >> button:has-text('Ver')");
await page.waitForTimeout(1000);
const S12 = await page.evaluate(() => document.body.textContent.includes("Biblioteca de modelos"));
console.log("carrito compartido:", JSON.stringify(S8), "pedido:", S9, "vaciado:", S10, "demo:", S11, "biblioteca:", S12);

// total esperado: 2×1290 + 199 = 2779
const totalOk = /3\s/.test(S7.txt) && S7.txt.includes("2.779");
const ok = S1.pestanas === 7 && S1.activa === "vitrina" &&
  S1.productos === 18 && S1.imagenes === 18 && S1.ofertas === 10 && S1.antes === 10 &&
  S1.chips === 7 && S1.ratings === 18 && S1.historias === 7 && S1.buscador && S1.carritoOculto &&
  S2.n === 1 && /Kettlebell/i.test(S2.txt) && S2b === 3 && S3 === 6 &&
  S4.visor && S4.barras >= 2 && !!S4.marca && S5 !== S4.titulo &&
  S6.cerrado && (S6.pill ?? "").includes(S4.marca) && S6.n > 0 && S6.n < 18 &&
  S7.visible && totalOk && S8.visible && S8.txt === S7.txt && S9 && S10 && S11 && S12;
console.log(JSON.stringify({ ok }));
console.log("ERRORES:", errores.length ? errores.join("\n") : "ninguno");
await browser.close();
