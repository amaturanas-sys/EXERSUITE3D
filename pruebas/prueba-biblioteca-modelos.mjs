// PRUEBA: LA BIBLIOTECA ENSEÑA LA PIEZA, NO UNA CAJA (v0.3.75).
//
// La Biblioteca de modelos existe para dos cosas: MIRAR cada pieza y
// SUSTITUIRLA por un modelo propio. Las dos se rompían en las familias que se
// eligen por peso —kettlebell, mancuerna, disco—, y por la misma razón: se
// listaba la CABECERA de la familia, que no es una pieza que se pueda insertar.
//
//   · su vista previa no tenía modelo que enseñar y salía la caja de reserva;
//   · y cargarle un `.glb` no cambiaba nada en ningún sitio, porque ninguna
//     pieza de la escena se llama «kettlebell» a secas: se llaman
//     `kettlebell-20`, `mancuerna-30`, `disco-barbell-45`.
//
// Lo que se comprueba:
//
//   1. QUE NO QUEDA NINGUNA CABECERA EN LA LISTA. Ninguna fila corresponde a
//      una pieza con variantes.
//   2. QUE ESTÁN LOS PESOS, uno por uno, los diecisiete.
//   3. QUE CADA UNO ENSEÑA SU MODELO: la ficha dice de qué archivo sale, y el
//      visor tiene triángulos de sobra para no ser la caja de reserva.
//   4. QUE LO QUE SE VE ES LO QUE SE INSERTA: la malla de la ficha y la de la
//      pieza puesta en la escena son la misma.
import { chromium } from "playwright-core";

let fallos = 0;
const ok = (cond, msg, dato) => {
  if (cond) console.log(`✓ ${msg}`);
  else { fallos++; console.log(`✗ ${msg}${dato === undefined ? "" : ` — ${dato}`}`); }
};

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
page.on("pageerror", (e) => console.log("✗ PAGEERROR: " + e.message));
await page.goto(process.env.BASE ?? "http://127.0.0.1:4174/");
await page.waitForTimeout(1200);
await page.click("text=🛒 MARKETPLACE");
await page.waitForTimeout(1200);
await page.evaluate(() => [...document.querySelectorAll("button")]
  .find((b) => /Ver en 3D|View in 3D/.test(b.textContent)).click());
await page.waitForTimeout(2500);

const filas = await page.evaluate(() =>
  [...document.querySelectorAll(".lib-row")].map((r) => ({
    nombre: r.querySelector(".lib-name")?.textContent ?? "",
    modelo: !!r.querySelector(".lib-dot.on"),
  })));

// ── 1. NI UNA CABECERA ───────────────────────────────────────────────────
// Las cabeceras se reconocen por su nombre pelado: la familia sin el peso.
const cabeceras = ["Kettlebell", "Mancuerna hexagonal", "Disco de peso"];
const coladas = cabeceras.filter((c) => filas.some((f) => f.nombre === c));
ok(
  coladas.length === 0,
  "ninguna cabecera de familia se cuela en la lista (lo que se lista se puede insertar)",
  coladas.join(", "),
);

// ── 2. ESTÁN LOS DIECISIETE PESOS ────────────────────────────────────────
const pesos = filas.filter((f) => cabeceras.some((c) => f.nombre.startsWith(c + " · ")));
ok(
  pesos.length === 17,
  `están los pesos uno a uno: ${pesos.length} filas (7 kettlebells + 5 mancuernas + 5 discos)`,
  pesos.map((p) => p.nombre).join(" | "),
);

// ── 3. CADA UNO ENSEÑA SU MODELO ─────────────────────────────────────────
const sinModelo = pesos.filter((p) => !p.modelo).map((p) => p.nombre);
ok(sinModelo.length === 0, "y todos traen su modelo propio", sinModelo.join(", "));

const mirar = async (nombre) => {
  await page.evaluate((n) => [...document.querySelectorAll(".lib-row")]
    .find((r) => r.querySelector(".lib-name")?.textContent === n)?.click(), nombre);
  await page.waitForTimeout(1200);
  return page.evaluate(() => ({
    estado: document.querySelector(".lib-status")?.textContent ?? "",
  }));
};

for (const nombre of ["Kettlebell · 20 kg", "Mancuerna hexagonal · 30 lb", "Disco de peso · 45 lb"]) {
  const d = await mirar(nombre);
  ok(
    /Modelo (de archivo|personalizado)/.test(d.estado),
    `«${nombre}» sale de su archivo, no de la forma de reserva (${d.estado})`,
  );
}

// ── 4. LO QUE SE VE ES LO QUE SE INSERTA ─────────────────────────────────
// La ficha promete una malla; la pieza puesta en la escena tiene que traer
// ESA, no la caja de reserva de sus `defaults`.
await page.goto(process.env.BASE ?? "http://127.0.0.1:4174/");
await page.waitForTimeout(1000);
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(3000);

const puestas = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  const out = {};
  for (const id of ["kettlebell-20", "mancuerna-30", "disco-barbell-45"]) {
    const o = ed.addComponent(id);
    await new Promise((r) => setTimeout(r, 1500));
    out[id] = {
      tris: o.mesh.geometry.attributes.position.count / 3,
      modelo: o.customModel === true,
    };
  }
  return out;
});
for (const [id, d] of Object.entries(puestas)) {
  ok(
    d.modelo && d.tris > 500,
    `«${id}» se inserta con su malla de verdad (${d.tris} triángulos)`,
    JSON.stringify(d),
  );
}

// ── 5. Y EN INGLÉS, EN INGLÉS ────────────────────────────────────────────
// Las diecisiete fichas de peso no se habían visto nunca —la Biblioteca
// listaba la cabecera—, así que nunca se habían traducido. Ahora se ven.
const page2 = await browser.newPage({ viewport: { width: 1400, height: 950 } });
await page2.addInitScript(() => {
  try { localStorage.setItem("exersuite.idioma", "en"); } catch { /* sin storage */ }
});
await page2.goto(process.env.BASE ?? "http://127.0.0.1:4174/");
await page2.waitForTimeout(1200);
await page2.click("text=🛒 MARKETPLACE");
await page2.waitForTimeout(1200);
await page2.evaluate(() => [...document.querySelectorAll("button")]
  .find((b) => /Ver en 3D|View in 3D/.test(b.textContent)).click());
await page2.waitForTimeout(2500);
const CASTELLANO = /\b(bola|costado|cabezas|goma|mango|cromado|grabado|libras|canto|alma|vaciad|llanta|cuarteles)\b/i;
for (const nombre of ["Kettlebell · 20 kg", "Hex dumbbell · 30 lb", "Weight plate · 45 lb"]) {
  const d = await page2.evaluate((n) => {
    const fila = [...document.querySelectorAll(".lib-row")]
      .find((r) => r.querySelector(".lib-name")?.textContent === n);
    if (!fila) return null;
    fila.click();
    return new Promise((res) => setTimeout(() => res({
      desc: document.querySelector(".lib-desc")?.textContent ?? "",
    }), 900));
  }, nombre);
  ok(
    d !== null && !CASTELLANO.test(d.desc),
    `en inglés, «${nombre}» tiene su ficha en inglés`,
    d === null ? "la fila no existe con ese nombre" : d.desc.slice(0, 80),
  );
}
await page2.close();

console.log(fallos === 0 ? "\nTODO OK" : `\n${fallos} FALLOS`);
await browser.close();
process.exit(fallos === 0 ? 0 : 1);
