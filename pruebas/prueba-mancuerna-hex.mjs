// PRUEBA: LAS MANCUERNAS HEXAGONALES (v0.3.52).
//
// Cinco pesos, cinco piezas. Lo que se mide aquí no es que "aparezca algo", sino
// las tres cosas que distinguen una mancuerna de un bulto con nombre:
//
//   · que NO RUEDA — el hexágono entra con una CARA abajo y no con una punta.
//     Se comprueba sin mirar el dibujo: en un hexágono regular, el ancho entre
//     caras y el ancho entre puntas guardan la razón 2/√3. Si la pieza entrase
//     de punta, alto y fondo saldrían cambiados y esa razón se daría la vuelta;
//   · que CRECEN COMO CRECE EL PESO — el cuerpo es un prisma, así que sus cotas
//     van con la RAÍZ CÚBICA de las libras. Una de 50 no es una de 10 estirada
//     al quíntuple: es 1,71 veces más ancha y pesa cinco veces más;
//   · que se ELIGE EL PESO ANTES DE COLOCARLA — el botón de la paleta no suelta
//     una mancuerna cualquiera, abre una burbuja con las cinco opciones, y la
//     que se toca es la que entra.
//
// Y el cruce de siempre: `cad/` no recalcula las fórmulas de la app y la app no
// recalcula las del CAD, así que las medidas de las dos tienen que coincidir.
import { chromium } from "playwright-core";

let fallos = 0;
const ok = (cond, msg, dato) => {
  if (cond) console.log(`✓ ${msg}`);
  else { fallos++; console.log(`✗ ${msg}${dato === undefined ? "" : ` — ${dato}`}`); }
};

// LAS COTAS DE TALLER, escritas aquí a mano a propósito: son las de la ficha de
// la mancuerna de 35 lb de referencia, las mismas de las que parte el CAD. Si la
// prueba las leyera del CAD no comprobaría nada.
const REF_LIBRAS = 35, REF_ENTRECARAS = 13.5, REF_LARGO = 34.0, MANGO = 13.0;
const KG_POR_LIBRA = 0.45359237;
const PESOS = [10, 20, 30, 40, 50];
const esperado = (lb) => {
  const k = Math.cbrt(lb / REF_LIBRAS);
  const entrecaras = REF_ENTRECARAS * k;
  const cabeza = ((REF_LARGO - MANGO) / 2) * k;
  return { entrecaras, largo: MANGO + 2 * cabeza, puntas: (entrecaras * 2) / Math.sqrt(3) };
};

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("pageerror", (e) => console.log("✗ PAGEERROR: " + e.message));
await page.goto(process.env.BASE ?? "http://127.0.0.1:4174/");
await page.waitForTimeout(1000);
await page.click("text=📁 PROYECTOS"); await page.waitForTimeout(300);
await page.click(".land-actions button:has-text('NUEVO')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(3000);

// ── 1. LAS CINCO ENTRAN CON LA MALLA DEL CAD ─────────────────────────────
const medido = await page.evaluate(async (pesos) => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  const salida = {};
  for (const w of pesos) {
    for (const o of [...ed.objects.values()]) ed.removeObject(o);
    const id = `mancuerna-${w}`;
    for (let i = 0; i < 80 && !ed.tieneModelo?.(id); i++) await new Promise((r) => setTimeout(r, 150));
    const o = ed.addComponent(id);
    o.mesh.updateMatrixWorld(true);
    const caja = new T.Box3().setFromObject(o.mesh), t = caja.getSize(new T.Vector3());
    let vertices = 0;
    o.mesh.traverse((n) => { if (n.isMesh && n.geometry) vertices += n.geometry.attributes.position.count; });
    salida[w] = { tam: [t.x, t.y, t.z].map((v) => +v.toFixed(3)), vertices, masa: o.physics?.massKg };
  }
  return salida;
}, PESOS);

for (const w of PESOS) {
  const m = medido[w], e = esperado(w);
  ok(
    m && m.vertices > 1000 &&
      Math.abs(m.tam[0] - e.largo) < 0.2 &&
      Math.abs(m.tam[1] - e.entrecaras) < 0.2,
    `la de ${w} lb entra con la malla del CAD y mide ${e.largo.toFixed(1)} × ${e.entrecaras.toFixed(1)} cm`,
    m ? `${m.tam.join(" × ")} · ${m.vertices} vértices` : "no está",
  );
}

// ── 2. DE CARA, NO DE PUNTA ──────────────────────────────────────────────
// El hexágono apoya en una cara: el ancho vertical (entre caras) es el MENOR y
// el horizontal (entre puntas) el mayor, con razón 2/√3 = 1,1547. De punta la
// razón saldría invertida y la mancuerna se bambolearía al soltarla.
const RAZON = 2 / Math.sqrt(3);
for (const w of PESOS) {
  const m = medido[w];
  const razon = m ? m.tam[2] / m.tam[1] : 0;
  ok(
    Math.abs(razon - RAZON) < 0.01,
    `la de ${w} lb apoya en una CARA, no en una punta (fondo/alto = 1.155)`,
    `fondo/alto = ${razon.toFixed(3)}`,
  );
}

// ── 3. CRECEN CON LA RAÍZ CÚBICA DEL PESO ────────────────────────────────
const anchos = PESOS.map((w) => medido[w]?.tam[1] ?? 0);
ok(
  anchos.every((v, i) => i === 0 || v > anchos[i - 1] + 0.3),
  "cada peso es más ancho que el anterior, sin empates",
  anchos.map((v) => v.toFixed(2)).join(" < "),
);
ok(
  Math.abs(anchos[4] / anchos[0] - Math.cbrt(5)) < 0.02,
  "la de 50 es 1.71 veces más ancha que la de 10 — raíz cúbica, no cinco veces",
  `${(anchos[4] / anchos[0]).toFixed(3)}`,
);
ok(
  PESOS.every((w) => Math.abs(medido[w].masa - w * KG_POR_LIBRA) < 0.05),
  "la masa de cada una es la de su etiqueta en kilos",
  PESOS.map((w) => `${w}lb=${medido[w].masa}kg`).join(" "),
);
// EL MANGO NO CRECE: lo que engorda son las cabezas. Largo − 2·cabeza = 13 cm
// en las cinco, que es la mano de una persona y no depende del peso.
const mangos = PESOS.map((w) => medido[w].tam[0] - 2 * ((REF_LARGO - MANGO) / 2) * Math.cbrt(w / REF_LIBRAS));
ok(
  mangos.every((v) => Math.abs(v - MANGO) < 0.2),
  "el mango mide 13 cm en las cinco — una mano es una mano",
  mangos.map((v) => v.toFixed(2)).join(" "),
);

// ── 4. LA BURBUJA DE LA PALETA ───────────────────────────────────────────
// En la paleta hay UN botón, no cinco: las cinco piezas están ocultas y se
// llega a ellas eligiendo el peso.
const botones = await page.evaluate(() =>
  [...document.querySelectorAll(".comp-btn")].map((b) => b.textContent.trim()),
);
ok(
  botones.filter((t) => /Mancuerna/i.test(t)).length === 1,
  "en la paleta hay un solo botón de mancuerna, no cinco",
  botones.filter((t) => /Mancuerna/i.test(t)).join(" | ") || "ninguno",
);

const btn = await page.$(".comp-btn:has-text('Mancuerna hexagonal')");
ok(!!btn, "el botón «Mancuerna hexagonal» está en la paleta");
await btn.scrollIntoViewIfNeeded();
await btn.click();
await page.waitForTimeout(400);
const opciones = await page.evaluate(() =>
  [...document.querySelectorAll(".comp-burbuja-op")].map((o) => o.textContent.trim()),
);
ok(
  opciones.join(",") === "10 lb,20 lb,30 lb,40 lb,50 lb",
  "la burbuja ofrece los cinco pesos, en orden",
  opciones.join(",") || "no se abrió",
);

// Y AL TOCAR UNA, ENTRA ESA. Se elige la de 30, que no es ni la primera ni la
// última: si el botón soltara «la mancuerna» sin más, entraría otra.
await page.evaluate(() => { window.exersuite.editor.objects.forEach((o) => window.exersuite.editor.removeObject(o)); });
await page.click(".comp-burbuja-op:has-text('30 lb')");
await page.waitForTimeout(1200);
const puesta = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const o = [...ed.objects.values()].pop();
  return o ? { comp: o.componentId ?? o.component?.id, masa: o.physics?.massKg } : null;
});
ok(
  puesta && puesta.comp === "mancuerna-30",
  "la que se toca es la que entra: elegir «30 lb» coloca la de 30",
  puesta ? `${puesta.comp} · ${puesta.masa} kg` : "no entró ninguna",
);
ok(
  await page.evaluate(() => !document.querySelector(".comp-burbuja")),
  "la burbuja se cierra al elegir",
);

// ── 5. EL CAD Y LA APP, LAS MISMAS COTAS ─────────────────────────────────
// `cad/JSON/*.json` lleva las medidas que escribió el CAD; la app las mide de
// la malla que cargó. Tienen que coincidir al milímetro.
const cad = await page.evaluate(async (pesos) => {
  const salida = {};
  for (const w of pesos) {
    try {
      const r = await fetch(`/cad/mancuerna_${w}lb.json`);
      if (r.ok) salida[w] = (await r.json()).piezas?.[0]?.dims;
    } catch { /* el JSON del CAD no se publica: se salta abajo */ }
  }
  return salida;
}, PESOS);
if (Object.keys(cad).length === 0) {
  console.log("· los prefabs del CAD no se sirven desde el build; el cruce se hace contra la ficha de taller");
  for (const w of PESOS) {
    const e = esperado(w);
    ok(
      Math.abs(medido[w].tam[2] - e.puntas) < 0.2,
      `la de ${w} lb mide ${e.puntas.toFixed(1)} cm entre puntas, como manda la ficha`,
      `${medido[w].tam[2]}`,
    );
  }
} else {
  for (const w of PESOS) {
    ok(
      cad[w] && cad[w].every((v, i) => Math.abs(v - medido[w].tam[i]) < 0.05),
      `el CAD y la app miden lo mismo en la de ${w} lb, al milímetro`,
      `CAD ${cad[w]?.join(" × ")} · app ${medido[w].tam.join(" × ")}`,
    );
  }
}

console.log(fallos === 0 ? "TODO OK" : `❌ ${fallos} fallo(s)`);
await browser.close();
process.exit(fallos ? 1 : 0);
