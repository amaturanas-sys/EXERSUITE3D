// PRUEBA: LA HOME DE CUATRO SECCIONES Y EL VISOR DE DESPIECE (v0.3.77).
//
// La reestructuración del diagrama, medida donde se ve:
//
//   1. LA HOME TIENE CUATRO ACCESOS —INSTRUCTIVO, PROYECTOS, MARKETPLACE y
//      SETTINGS— y ya no dos entradas (BUILDER y SIMULADOR) que obligaban a
//      decidir CON QUÉ ibas a abrir antes de saber QUÉ ibas a abrir.
//   2. LAS DOS MITADES SON IGUALES: lo que se pulsa y lo que sale al pulsarlo
//      ocupan la misma caja y la misma proporción.
//   3. CADA PROYECTO TRAE SUS TRES MODOS —BUILDER, VIEWER, SIMULAR— y su X.
//   4. EL VISOR PARTE LA PANTALLA EN DOS: la maqueta arriba, con reglas y la
//      medida del conjunto, y el inventario abajo, CUATRO POR FILA y ORDENADO
//      DE MENOR A MAYOR.
//   5. EL CURSOR SOBRE UNA CASILLA PINTA ESA PIEZA DE ROJO en la maqueta: es
//      la respuesta a «¿y ésta dónde va?».
//   6. EL CLIC LA DEJA SOLA en la viñeta, y «Modelo completo» devuelve todo.
//   7. Y EN EL VISOR NO SE CONSTRUYE: el puntero sólo mueve la cámara.
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
const BASE = process.env.BASE ?? "http://127.0.0.1:4174/";
await page.goto(BASE);
await page.waitForTimeout(1200);

// ── 1. CUATRO ACCESOS ────────────────────────────────────────────────────
const nav = await page.evaluate(() =>
  [...document.querySelectorAll(".land-nav-item")].map((b) => b.textContent.trim()));
ok(
  nav.length === 4 && nav.some((t) => /PROYECTOS/.test(t)) && !nav.some((t) => /SIMULADOR/.test(t)),
  `la Home ofrece cuatro secciones: ${nav.join(" · ")}`,
  nav.join(" | "),
);

// ── 2. DOS MITADES IGUALES ───────────────────────────────────────────────
const mitades = await page.evaluate(() => {
  const nav = document.querySelector(".land-col-nav");
  const cont = document.querySelector(".land-col-content");
  if (!nav || !cont) return null;
  const a = nav.getBoundingClientRect();
  const b = cont.getBoundingClientRect();
  return { anchoA: Math.round(a.width), anchoB: Math.round(b.width),
           altoA: Math.round(a.height), altoB: Math.round(b.height) };
});
ok(
  mitades !== null && Math.abs(mitades.anchoA - mitades.anchoB) <= 2
    && Math.abs(mitades.altoA - mitades.altoB) <= 2,
  `las dos mitades miden lo mismo (${mitades?.anchoA}×${mitades?.altoA} y ${mitades?.anchoB}×${mitades?.altoB})`,
  JSON.stringify(mitades),
);

// Un proyecto sembrado en la base del navegador, como el que deja la app al
// abrir o guardar: es lo que enseña la ficha.
await page.click("text=📁 PROYECTOS");
await page.waitForTimeout(1200);
await page.evaluate(async () => {
  const piezas = ["base-soporte", "pilar", "kettlebell-20", "disco-barbell-45", "mancuerna-30"];
  const sitios = [[0, 0, 0], [60, 0, -30], [-50, 10, 20], [40, 10, 30], [-20, 10, -30]];
  const data = {
    version: 1,
    objects: piezas.map((id, i) => ({
      id: `obj_${i + 1}`,
      name: id,
      componentId: id,
      materialId: "acero",
      params: { kind: "box" },
      physics: { massKg: 1, fixed: true },
      position: sitios[i],
      quaternion: [0, 0, 0, 1],
      scale: [1, 1, 1],
    })),
    joints: [], cables: [], ropes: [], groups: [],
  };
  const db = await new Promise((res, rej) => {
    const r = indexedDB.open("exersuite3d");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  const tx = db.transaction(["recentProjects", "recentMeta"], "readwrite");
  const rec = { id: "rp_prueba_visor", name: "Prueba visor", savedAt: Date.now(), data };
  tx.objectStore("recentProjects").put(rec);
  tx.objectStore("recentMeta").put({ id: rec.id, name: rec.name, savedAt: rec.savedAt });
  await new Promise((res) => { tx.oncomplete = res; });
});
await page.goto(BASE);
await page.waitForTimeout(1200);
await page.click("text=📁 PROYECTOS");
await page.waitForTimeout(1200);

// ── 3. LA FICHA Y SUS TRES MODOS ─────────────────────────────────────────
const ficha = await page.evaluate(() => {
  const f = [...document.querySelectorAll(".land-ficha")]
    .find((x) => x.querySelector(".land-recent-name")?.textContent === "Prueba visor");
  if (!f) return null;
  return {
    modos: [...f.querySelectorAll(".land-modo")].map((b) => b.textContent.trim()),
    borrar: !!f.querySelector(".land-borrar"),
    fecha: !!f.querySelector(".land-recent-date"),
  };
});
ok(
  ficha !== null && ficha.modos.join(",") === "BUILDER,VIEWER,SIMULAR" && ficha.borrar && ficha.fecha,
  "cada proyecto trae su fecha, su X y sus tres modos",
  JSON.stringify(ficha),
);

// ── 4. EL VISOR ──────────────────────────────────────────────────────────
await page.click(".land-ficha:has-text('Prueba visor') .land-modo:has-text('VIEWER')");
await page.waitForTimeout(7000);
const visor = await page.evaluate(() => {
  const marco = document.querySelector(".visor-modelo");
  const inv = document.querySelector(".visor-inventario");
  const grid = document.querySelector(".visor-grid");
  const celdas = [...document.querySelectorAll(".visor-celda")];
  const medida = (t) => parseFloat((t ?? "").replace(",", "."));
  return {
    hay: !!marco && !!inv,
    altoMarco: marco ? Math.round(marco.getBoundingClientRect().height) : 0,
    altoInv: inv ? Math.round(inv.getBoundingClientRect().height) : 0,
    columnas: grid ? getComputedStyle(grid).gridTemplateColumns.split(" ").length : 0,
    celdas: celdas.length,
    tallas: celdas.map((c) => medida(c.querySelector(".visor-celda-medidas")?.textContent)),
    rotulo: document.querySelector(".visor-rotulo")?.textContent ?? "",
    marcas: document.querySelectorAll(".visor-marca").length,
  };
});
ok(visor.hay && visor.columnas === 4, `el inventario va de cuatro en cuatro (${visor.columnas} columnas)`);
ok(
  Math.abs(visor.altoMarco + 46 - visor.altoInv) <= 4,
  `la maqueta y el inventario se reparten la pantalla por mitades (${visor.altoMarco + 46} y ${visor.altoInv} px)`,
  JSON.stringify({ marco: visor.altoMarco, inv: visor.altoInv }),
);
ok(visor.celdas === 5, `hay una casilla por pieza (${visor.celdas})`);
const ordenado = visor.tallas.every((v, i, a) => i === 0 || a[i - 1] <= v + 0.01);
ok(ordenado, `y van de menor a mayor (${visor.tallas.join(" → ")})`);
ok(
  /\d/.test(visor.rotulo) && visor.marcas > 6,
  `el marco dimensiona el proyecto: «${visor.rotulo}» y ${visor.marcas} marcas de regla`,
);

// ── 5. EL CURSOR PINTA DE ROJO ───────────────────────────────────────────
const rojo = await page.evaluate(async () => {
  const celda = document.querySelectorAll(".visor-celda")[2];
  const nombre = celda.querySelector(".visor-celda-nombre").textContent;
  celda.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 300));
  const ed = window.exersuite.editor;
  const rojas = [...ed.objects.values()].filter((o) => {
    const mats = Array.isArray(o.mesh.material) ? o.mesh.material : [o.mesh.material];
    return mats.some((m) => m.emissive && m.emissive.getHex() === 0xb01717);
  });
  celda.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 300));
  const tras = [...ed.objects.values()].filter((o) => {
    const mats = Array.isArray(o.mesh.material) ? o.mesh.material : [o.mesh.material];
    return mats.some((m) => m.emissive && m.emissive.getHex() === 0xb01717);
  });
  return { nombre, marcadas: rojas.length, nombreMarcado: rojas[0]?.name ?? null, trasSalir: tras.length };
});
ok(
  rojo.marcadas === 1 && rojo.trasSalir === 0,
  `el cursor sobre «${rojo.nombre}» pinta esa pieza de rojo en la maqueta, y sólo esa`,
  JSON.stringify(rojo),
);

// ── 6. EL CLIC LA DEJA SOLA ──────────────────────────────────────────────
await page.click(".visor-celda:nth-child(3)");
await page.waitForTimeout(1200);
const sola = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  return {
    visibles: [...ed.objects.values()].filter((o) => o.mesh.visible).length,
    rotulo: document.querySelector(".visor-rotulo")?.textContent ?? "",
  };
});
ok(sola.visibles === 1, `el clic deja la pieza sola en la viñeta (${sola.visibles} visible)`);
await page.click(".visor-acts button:has-text('Modelo completo')");
await page.waitForTimeout(1200);
const todo = await page.evaluate(() =>
  [...window.exersuite.editor.objects.values()].filter((o) => o.mesh.visible).length);
ok(todo === 5, `«Modelo completo» devuelve la máquina entera (${todo} piezas)`);

// ── 7. AQUÍ NO SE CONSTRUYE ──────────────────────────────────────────────
const soloMirar = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  return { herramienta: ed.getHerramienta(), seleccion: ed.selected?.id ?? null };
});
await page.mouse.click(700, 220);
await page.waitForTimeout(400);
const trasClic = await page.evaluate(() => window.exersuite.editor.selected?.id ?? null);
ok(
  soloMirar.herramienta === "orbitar" && trasClic === null,
  "en el visor el puntero sólo mueve la cámara: el clic no selecciona ni mueve piezas",
  JSON.stringify({ ...soloMirar, trasClic }),
);

console.log(fallos === 0 ? "\nTODO OK" : `\n${fallos} FALLOS`);
await browser.close();
process.exit(fallos === 0 ? 0 : 1);
