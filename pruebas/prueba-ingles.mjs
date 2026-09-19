// PRUEBA: LA INTERFAZ EN INGLÉS (v0.3.61).
//
// Es el trinquete de la traducción. La app se puso en inglés y quedó en CERO
// cadenas sin traducir; esta prueba mantiene ese cero: cualquier texto nuevo que
// alguien añada en castellano y no traduzca sale aquí, con su pantalla y su
// contenido, en vez de descubrirse meses después con un usuario delante.
//
// Pone la app en inglés, recorre sus pantallas y recoge TODO texto visible que
// siga sonando a castellano. No adivina desde el código: mira lo que se pinta.
//
// Cómo detecta el castellano: o lleva un carácter que el inglés no usa —ñ, ¿, ¡,
// vocal con tilde— o contiene una palabra que sólo existe en castellano. La
// lista es deliberadamente CONSERVADORA y NO lleva palabras que existan en
// los dos idiomas -base, spotter, tubular-, ni "del", que es como el ingles
// abrevia Delete: daban falsos positivos sobre texto
// que ya estaba en ingles.
// La lista es conservadora: prefiero que se me escape algo a
// inundar el informe de falsos positivos («no», «a», «final» son las dos cosas).
import { chromium } from "playwright-core";

const MARCAS = /[ñÑ¿¡áéíóúÁÉÍÓÚ]/;
const PALABRAS = new RegExp(
  "\\b(" + [
    "de","para","por","con","las","los","una","unos","unas","que","se","su","sus",
    "sin","sobre","entre","desde","hasta","cuando","donde","como","esta","este","estos",
    "hay","cada","pieza","piezas","altura","ancho","largo","peso","guardar","abrir",
    "nuevo","nueva","borrar","anadir","mover","girar","archivo","edicion","seleccion",
    "ejes","ergonomia","proyecto","maquina","maquinas","viga",
    "pilar","brazo","cuerda","asiento","respaldo","agarre","pasador","tope","punto",
    "anclaje","cadena","carro","jota","pesos","pila","cuerno","soldar","silla","manija",
    "doble","polea","poleas","guia","dentada","atril","mancuerna",
    "hexagonal","seguridad","travesano","acero","soporte","placa","montaje",
  ].join("|") + ")\\b", "i");

const sospechoso = (s) => {
  const t = s.trim();
  if (t.length < 3 || t.length > 400) return false;
  if (/^[\d\s.,:;·×/+\-%()°'"]+$/.test(t)) return false;   // sólo números y signos
  if (/^EXERSUITE3D/i.test(t)) return false;
  return MARCAS.test(t) || PALABRAS.test(t);
};

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
// EL IDIOMA SE FIJA ANTES DE ARRANCAR: la app lo lee de localStorage al cargar
// y cambiarlo después obliga a recargar.
await page.addInitScript(() => {
  try { localStorage.setItem("exersuite.idioma", "en"); } catch { /* sin storage */ }
});

// Recoge el texto visible de la pantalla actual, incluidos los `title`.
const barrer = async () =>
  page.evaluate(() => {
    const fuera = new Set(["SCRIPT", "STYLE", "NOSCRIPT"]);
    const visto = new Set();
    const salida = [];
    const anda = (n) => {
      if (n.nodeType === 3) {
        const t = n.textContent.trim();
        if (t && !visto.has(t)) { visto.add(t); salida.push(t); }
        return;
      }
      if (n.nodeType !== 1 || fuera.has(n.tagName)) return;
      const est = getComputedStyle(n);
      if (est.display === "none" || est.visibility === "hidden") return;
      for (const attr of ["title", "placeholder", "aria-label"]) {
        const v = n.getAttribute?.(attr);
        if (v && !visto.has(v)) { visto.add(v); salida.push(v); }
      }
      for (const h of n.childNodes) anda(h);
    };
    anda(document.body);
    return salida;
  });

const informe = new Map();
let fallos = 0;
const mirar = async (pantalla) => {
  const textos = await barrer();
  const malos = textos.filter(sospechoso);
  if (malos.length) { informe.set(pantalla, malos); fallos++; }
  console.log(
    `${malos.length ? "✗" : "✓"} ${pantalla.padEnd(26)} ${textos.length} textos · ` +
    `${malos.length} sin traducir`,
  );
};

console.log("RECORRIDO:");
await page.goto(process.env.BASE ?? "http://127.0.0.1:4174/");
await page.waitForTimeout(1500);
await mirar("Portada");

await page.click(".land-nav-item:nth-child(1)");
await page.waitForTimeout(1200); await mirar("Instructivo");
await page.goBack().catch(() => {}); await page.waitForTimeout(800);

await page.goto(process.env.BASE ?? "http://127.0.0.1:4174/"); await page.waitForTimeout(1200);
await page.click(".land-nav-item:nth-child(3)"); await page.waitForTimeout(1500);
await mirar("Marketplace (hub)");
await page.evaluate(() => [...document.querySelectorAll(".hub-btn-card")]
  .find((b) => /Ver en 3D|View in 3D/.test(b.textContent))?.click());
await page.waitForTimeout(2500); await mirar("Biblioteca de modelos");

await page.goto(process.env.BASE ?? "http://127.0.0.1:4174/"); await page.waitForTimeout(1200);
await page.click(".land-nav-item:nth-child(2)"); await page.waitForTimeout(600);
await mirar("Builder (inicio)");
await page.click(".land-actions button:nth-child(1)");
await page.waitForTimeout(800); await mirar("Asistente de proyecto");
await page.click(".wizard-carta:has-text('Profesional'), .wizard-carta:has-text('Professional')");
await page.waitForTimeout(600);
await page.click(".wizard-carta:has-text('Canvas libre'), .wizard-carta:has-text('Free canvas')");
await page.waitForTimeout(3500);
await mirar("Lienzo + paleta");

// Los menús de la barra, uno a uno.
for (const m of ["Archivo", "File", "Edición", "Edit", "Selección", "Select", "Ver", "View", "Ejes", "Axes"]) {
  const b = await page.$(`.menu-btn:has-text("${m}"), button:has-text("${m}")`);
  if (!b) continue;
  await b.click().catch(() => {});
  await page.waitForTimeout(350);
  await mirar(`Menú ${m}`);
  await page.keyboard.press("Escape").catch(() => {});
}

// Propiedades con una pieza dentro.
await page.evaluate(() => {
  const ed = window.exersuite?.editor;
  if (!ed) return;
  const o = ed.addComponent("pasador");
  ed.selectObject?.(o.id) ?? ed.select?.(o);
});
await page.waitForTimeout(1200);
await mirar("Propiedades (pasador)");

console.log("\n================ EN CASTELLANO, EN MODO INGLÉS ================");
let total = 0;
for (const [pantalla, malos] of informe) {
  console.log(`\n── ${pantalla} (${malos.length})`);
  for (const m of malos.slice(0, 25)) console.log("   · " + m.replace(/\s+/g, " ").slice(0, 120));
  if (malos.length > 25) console.log(`   … y ${malos.length - 25} más`);
  total += malos.length;
}
console.log(
  total === 0
    ? "TODO OK — la interfaz en inglés no deja ni una cadena en castellano"
    : `❌ ${total} cadena(s) sin traducir en ${informe.size} pantalla(s)`,
);
await browser.close();
process.exit(fallos ? 1 : 0);
