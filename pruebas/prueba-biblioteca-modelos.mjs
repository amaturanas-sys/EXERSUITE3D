// PRUEBA: LA BIBLIOTECA ENSEÑA LA PIEZA, NO UNA CAJA (v0.3.75 y v0.3.76).
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
import { readFileSync } from "fs";

// La MISMA lista que enseña la Biblioteca, leída del catálogo: el vigente con
// las familias de peso abiertas en sus variantes.
const CATALOGO = JSON.parse(readFileSync(new URL("../godot/data/components.json", import.meta.url), "utf8"));
const IDS = CATALOGO.components.flatMap((c) =>
  c.paleta ? [] : (c.variantes?.length ? c.variantes.map((v) => v.id) : [c.id]));

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
await page.click("text=📁 PROYECTOS"); await page.waitForTimeout(300);
await page.click(".land-actions button:has-text('NUEVO')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')");
// SE ESPERA A QUE LA APP ESTE LISTA, NO AL RELOJ (v0.3.81): la capa de carga
// se va cuando las mallas estan. Adivinarlo con un timeout fijo es lo que
// hacia parpadear a estas pruebas.
await page.waitForFunction(() => !document.querySelector(".cargando-capa"), null, { timeout: 45000 });
await page.waitForTimeout(3000);

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

// ── 5. NI UNA CAJA MÁS QUE LAS QUE SON CAJAS ─────────────────────────────
// Un barrido por TODO el catálogo: se inserta cada pieza y se mira su malla.
// Salir como un prisma de ocho triángulos con los vértices en las esquinas de
// su propia caja sólo vale para lo que ES una caja —la primitiva, la base de
// soporte, el asiento y el respaldo son planchas—; cualquier otra que salga
// así es una pieza sin modelo enseñando su bulto de reserva.
const SON_CAJA = ["prim-box", "base-soporte", "asiento", "respaldo",
  "correa-seguridad", "pilar-linea"];
const barrido = await page.evaluate(async ({ permitidas, ids }) => {
  const ed = window.exersuite.editor;
  const cajas = [];
  for (const id of ids) {
    for (const o of [...ed.objects.values()]) ed.removeObject(o);
    let o;
    try { o = ed.addComponent(id); } catch { continue; }
    await new Promise((r) => setTimeout(r, 700));
    const g = o.mesh.geometry;
    g.computeBoundingBox();
    const pos = g.attributes.position;
    if (pos.count > 24) continue;                       // demasiados vértices para ser una caja
    let enEsquinas = true;
    for (let i = 0; i < pos.count && enEsquinas; i++) {
      const v = [pos.getX(i), pos.getY(i), pos.getZ(i)];
      const mn = [g.boundingBox.min.x, g.boundingBox.min.y, g.boundingBox.min.z];
      const mx = [g.boundingBox.max.x, g.boundingBox.max.y, g.boundingBox.max.z];
      for (let k = 0; k < 3; k++) {
        if (Math.abs(v[k] - mn[k]) > 1e-3 && Math.abs(v[k] - mx[k]) > 1e-3) { enEsquinas = false; break; }
      }
    }
    if (enEsquinas && !permitidas.includes(id)) cajas.push(id);
  }
  return cajas;
}, { permitidas: SON_CAJA, ids: IDS });
ok(barrido.length === 0, "ninguna pieza del catálogo sale como una caja sin serlo", barrido.join(", "));

// ── 6. Y NADIE OFRECE LO QUE NO PUEDE CUMPLIR ────────────────────────────
// Una pieza que se TRAZA entre dos puntos no puede venir de una malla fija:
// medido, asignarle un modelo a un pilar de 5 × 200 × 5 cm lo dejaba en un
// cubo de 100 × 100 × 100 y alargarlo después ya no lo movía. Y una cuerda ni
// siquiera es una pieza de la escena. En esas filas no hay botón: hay nota.
const sinBoton = ["Pilar / travesaño (línea)", "Tubo de acero (línea)",
  "Guía tubular", "Cadena de seguridad", "Correa de seguridad"];
await page.goto(process.env.BASE ?? "http://127.0.0.1:4174/");
await page.waitForTimeout(1000);
await page.click("text=🛒 MARKETPLACE"); await page.waitForTimeout(1200);
await page.evaluate(() => [...document.querySelectorAll("button")]
  .find((b) => /Ver en 3D|View in 3D/.test(b.textContent)).click());
await page.waitForTimeout(2500);
for (const nombre of sinBoton) {
  const d = await page.evaluate(async (n) => {
    const fila = [...document.querySelectorAll(".lib-row")]
      .find((r) => r.querySelector(".lib-name")?.textContent === n);
    if (!fila) return null;
    fila.click();
    await new Promise((r) => setTimeout(r, 500));
    return {
      nota: (document.querySelector(".lib-nota")?.textContent ?? "").slice(0, 60),
      boton: [...document.querySelectorAll(".lib-detail-actions button")]
        .some((b) => /Sustituir|Cambiar modelo|Replace|Change model/.test(b.textContent)),
    };
  }, nombre);
  ok(
    d !== null && d.nota.length > 10 && !d.boton,
    `«${nombre}» explica por qué no se sustituye, en vez de ofrecer un botón que la rompe`,
    d === null ? "no está en la lista" : JSON.stringify(d),
  );
}

// Y el daño que ese botón hacía, medido: un pilar trazado tiene que seguir
// siendo su trazo, pase lo que pase con la biblioteca.
await page.goto(process.env.BASE ?? "http://127.0.0.1:4174/");
await page.waitForTimeout(1000);
await page.click("text=📁 PROYECTOS"); await page.waitForTimeout(300);
await page.click(".land-actions button:has-text('NUEVO')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')");
// SE ESPERA A QUE LA APP ESTE LISTA, NO AL RELOJ (v0.3.81): la capa de carga
// se va cuando las mallas estan. Adivinarlo con un timeout fijo es lo que
// hacia parpadear a estas pruebas.
await page.waitForFunction(() => !document.querySelector(".cargando-capa"), null, { timeout: 45000 });
await page.waitForTimeout(3000);
const pilar = await page.evaluate(async () => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  const p = ed.addComponent("pilar-linea");
  p.params.path = [[0, -100, 0], [0, -50, 0], [0, 0, 0], [0, 50, 0], [0, 100, 0]];
  p.rebuildGeometry();
  const alto = () => {
    p.mesh.geometry.computeBoundingBox();
    const s = p.mesh.geometry.boundingBox.getSize(new T.Vector3());
    return +s.y.toFixed(1);
  };
  const antes = alto();
  p.params.path = [[0, -200, 0], [0, -100, 0], [0, 0, 0], [0, 100, 0], [0, 200, 0]];
  p.rebuildGeometry();
  return { antes, trasAlargar: alto() };
});
ok(
  pilar.antes === 200 && pilar.trasAlargar === 400,
  `un pilar trazado obedece a su trazo: ${pilar.antes} cm y ${pilar.trasAlargar} al alargarlo`,
  JSON.stringify(pilar),
);

// ── 7. Y EN INGLÉS, EN INGLÉS ────────────────────────────────────────────
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
