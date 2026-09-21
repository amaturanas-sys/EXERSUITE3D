// PRUEBA: LA HERRAMIENTA DE CHAPA (v0.3.72).
//
// Un cubo macizo de 20 cm al que se le quita la cara de arriba tiene que
// quedar como una CUBETA: una plancha doblada con la forma del cubo, hueca por
// dentro y abierta por arriba. Lo que se comprueba, de punta a punta y con el
// ratón de verdad —no llamando a la tripa—:
//
//   1. QUE LA HERRAMIENTA ESTÁ EN LA BARRA DE LA DERECHA. Es por donde se
//      llega a ella; si el botón no está, la herramienta no existe.
//   2. QUE EL TRABAJO QUEDA CIRCUNSCRITO A UNA PIEZA. Tomada una, tocar otra
//      con caras ya marcadas no se lleva la selección por delante.
//   3. QUE SE PUEDE ORBITAR SIN PERDER LA SELECCIÓN. Es la razón de que el
//      clic se resuelva al SOLTAR: arrastrar gira la cámara, y las caras
//      marcadas —y su burbuja— siguen ahí. Sin esto no hay manera de llegar a
//      la cara de atrás.
//   4. QUE LA BURBUJA CONFIRMA. Sale sobre la selección, dice cuántas caras
//      hay, pide el grosor y sólo al aceptar cambia la pieza.
//   5. QUE LA PIEZA SE AHUECA DE VERDAD. Se mide con el rayo: por el centro ya
//      no se toca la tapa sino el SUELO de dentro, a un grosor del fondo; y
//      junto a la pared se toca el canto, arriba del todo. Eso es una cubeta y
//      no un cubo pintado.
//   6. QUE SOBREVIVE A CAMBIAR LA MEDIDA. Las caras se guardan por lo que SON
//      —hacia dónde miran y dónde están—, no por su número de triángulo: al
//      estirar la pieza la cubeta sigue siendo una cubeta.
//   7. QUE SE DESHACE. Volver a macizo devuelve el cubo entero.
import { chromium } from "playwright-core";

let fallos = 0;
const ok = (cond, msg, dato) => {
  if (cond) console.log(`✓ ${msg}`);
  else { fallos++; console.log(`✗ ${msg}${dato === undefined ? "" : ` — ${dato}`}`); }
};

const LADO = 20;
const GROSOR = 0.5;

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
await page.click(".wizard-carta:has-text('Canvas libre')");
// SE ESPERA A QUE LA APP ESTE LISTA, NO AL RELOJ (v0.3.81): la capa de carga
// se va cuando las mallas estan. Adivinarlo con un timeout fijo es lo que
// hacia parpadear a estas pruebas.
await page.waitForFunction(() => !document.querySelector(".cargando-capa"), null, { timeout: 45000 });
await page.waitForTimeout(3000);

// Dos cubos: el que se convierte y otro al lado, para comprobar que la
// herramienta no se distrae con él.
await page.evaluate(({ lado }) => {
  const ed = window.exersuite.editor;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  const cubo = ed.addComponent("base-soporte");
  cubo.params.width = lado; cubo.params.height = lado; cubo.params.depth = lado;
  cubo.rebuildGeometry();
  cubo.mesh.position.set(0, lado / 2, 0);
  const vecino = ed.addComponent("base-soporte");
  vecino.params.width = lado; vecino.params.height = lado; vecino.params.depth = lado;
  vecino.rebuildGeometry();
  vecino.mesh.position.set(lado * 2.2, lado / 2, 0);
  window.__chapa = { cubo: cubo.id, vecino: vecino.id };
  ed.select(cubo);
  // La cámara mira los dos cubos desde arriba y de lado: así la cara superior
  // y la frontal se ven y se pueden señalar con el ratón.
  const cam = ed.sceneManager.camera;
  cam.position.set(lado * 1.6, lado * 2.4, lado * 2.8);
  ed.orbit.target.set(lado * 0.55, lado / 2, 0);
  ed.orbit.update();
  ed.requestRender();
}, { lado: LADO });
await page.waitForTimeout(400);

/** Punto del mundo → píxeles de la ventana. */
const enPantalla = async (p) =>
  page.evaluate(({ x, y, z }) => {
    const ed = window.exersuite.editor, T = window.exersuite.THREE;
    const v = new T.Vector3(x, y, z).project(ed.sceneManager.camera);
    const r = ed.canvas.getBoundingClientRect();
    return {
      x: r.left + ((v.x + 1) / 2) * r.width,
      y: r.top + ((1 - v.y) / 2) * r.height,
    };
  }, p);

const estado = async () =>
  page.evaluate(() => {
    const ed = window.exersuite.editor;
    const b = document.querySelector(".chapa-burbuja");
    return {
      modo: ed.isChapaMode(),
      burbuja: !!b,
      cuenta: b?.querySelector(".chapa-cuenta")?.textContent ?? null,
      pieza: ed.chapaObjeto?.id ?? null,
      marcadas: ed.chapaSel ? ed.chapaSel.size : -1,
    };
  });

// ── 1. EL BOTÓN ESTÁ EN LA BARRA DE LA DERECHA ───────────────────────────
const hayBoton = await page.locator("#tool-quick .tq-chapa").count();
ok(hayBoton === 1, "la herramienta cuelga de la barra lateral derecha del visor");
await page.click("#tool-quick .tq-chapa");
await page.waitForTimeout(200);
let st = await estado();
ok(st.modo && st.pieza !== null, "al encenderla toma la pieza seleccionada y espera caras", JSON.stringify(st));
ok(!st.burbuja, "y todavía no hay burbuja: no hay nada que confirmar");

// ── 2. SE TOCA LA CARA DE ARRIBA ─────────────────────────────────────────
const arriba = await enPantalla({ x: 0, y: LADO, z: 0 });
await page.mouse.click(arriba.x, arriba.y);
await page.waitForTimeout(250);
st = await estado();
ok(st.marcadas === 1 && st.burbuja, "tocar la cara de arriba la marca y abre la burbuja", JSON.stringify(st));
ok((st.cuenta ?? "").includes("1"), `la burbuja dice cuántas caras hay (${st.cuenta})`);

// ── 3. LA PIEZA DE AL LADO NO SE LLEVA LA SELECCIÓN ───────────────────────
const vecino = await enPantalla({ x: LADO * 2.2, y: LADO, z: 0 });
await page.mouse.click(vecino.x, vecino.y);
await page.waitForTimeout(200);
const stVecino = await estado();
ok(
  stVecino.pieza === st.pieza && stVecino.marcadas === 1,
  "el trabajo queda circunscrito a la pieza tomada: tocar otra no se lleva las caras marcadas",
  JSON.stringify(stVecino),
);

// ── 4. ORBITAR NO PIERDE NADA ────────────────────────────────────────────
await page.mouse.move(640, 500);
await page.mouse.down();
for (let i = 1; i <= 8; i++) { await page.mouse.move(640 - i * 14, 500 - i * 4); await page.waitForTimeout(16); }
await page.mouse.up();
await page.waitForTimeout(300);
const stOrbita = await estado();
ok(
  stOrbita.modo && stOrbita.marcadas === 1 && stOrbita.burbuja,
  "se orbita con el arrastre y la cara marcada sigue marcada",
  JSON.stringify(stOrbita),
);

// ── 5. SE CONFIRMA EN LA BURBUJA ─────────────────────────────────────────
await page.fill(".chapa-burbuja .chapa-grosor", String(GROSOR));
await page.click(".chapa-burbuja button:has-text('✓')");
await page.waitForTimeout(400);

const sonda = async () =>
  page.evaluate(({ lado }) => {
    const ed = window.exersuite.editor, T = window.exersuite.THREE;
    const o = ed.objects.get(window.__chapa.cubo);
    o.mesh.updateMatrixWorld(true);
    // Rayo desde arriba: dónde encuentra material y cuántas veces lo cruza.
    // EL RAYO NO VA POR EL CENTRO EXACTO: ahí pasa justo por la diagonal que
    // parte en dos la cara, toca los dos triángulos y cuenta cruces de más.
    const tirar = (x, z) => {
      const ray = new T.Raycaster(new T.Vector3(x, lado * 3, z), new T.Vector3(0, -1, 0));
      const hits = ray.intersectObject(o.mesh, false);
      return { y: hits.length ? hits[0].point.y : null, cruces: hits.length };
    };
    const g = o.mesh.geometry;
    g.computeBoundingBox();
    const bb = g.boundingBox;
    return {
      chapa: o.params.chapa ? { grosor: o.params.chapa.grosorCm, caras: o.params.chapa.caras.length } : null,
      centro: tirar(1.3, 0.7),
      pared: tirar(lado / 2 - 0.25, 0.7),
      alto: bb.max.y - bb.min.y,
      ancho: bb.max.x - bb.min.x,
    };
  }, { lado: LADO });

const cubeta = await sonda();
ok(
  cubeta.chapa && cubeta.chapa.caras === 1 && Math.abs(cubeta.chapa.grosor - GROSOR) < 1e-6,
  "confirmada, la pieza guarda su chapa (una cara quitada y el grosor pedido)",
  JSON.stringify(cubeta.chapa),
);
ok(
  Math.abs(cubeta.alto - LADO) < 0.2 && Math.abs(cubeta.ancho - LADO) < 0.2,
  `la cubeta ocupa lo mismo que el cubo (${cubeta.alto.toFixed(2)} × ${cubeta.ancho.toFixed(2)} cm)`,
);
ok(
  cubeta.centro.y !== null && Math.abs(cubeta.centro.y - GROSOR) < 0.25,
  `por el centro ya no hay tapa: el rayo cae hasta el suelo de dentro (y = ${cubeta.centro.y?.toFixed(2)} cm, esperado ${GROSOR})`,
);
ok(
  cubeta.pared.y !== null && Math.abs(cubeta.pared.y - LADO) < 0.3,
  `junto a la pared sí hay material arriba del todo: el canto de la plancha (y = ${cubeta.pared.y?.toFixed(2)} cm)`,
);
ok(
  Math.abs(cubeta.centro.y - GROSOR) < 0.05,
  `y el fondo mide EXACTAMENTE el grosor pedido (${cubeta.centro.y?.toFixed(3)} de ${GROSOR} cm): `
    + "el inglete de los rincones sale de las CARAS que se juntan, no de cuántos triángulos trae cada una",
);

// ── 6. SOBREVIVE A CAMBIAR LA MEDIDA ─────────────────────────────────────
await page.evaluate(({ lado }) => {
  const ed = window.exersuite.editor;
  const o = ed.objects.get(window.__chapa.cubo);
  o.params.width = lado * 1.8;
  o.rebuildGeometry();
}, { lado: LADO });
await page.waitForTimeout(200);
const estirada = await sonda();
ok(
  Math.abs(estirada.ancho - LADO * 1.8) < 0.3 && estirada.centro.y !== null
    && Math.abs(estirada.centro.y - GROSOR) < 0.25,
  `estirada al ${(1.8 * 100).toFixed(0)} % sigue siendo una cubeta: la cara de arriba se vuelve a reconocer`,
  JSON.stringify(estirada.centro),
);

// ── 7. VUELVE A SER MACIZA ───────────────────────────────────────────────
await page.evaluate(() => {
  const ed = window.exersuite.editor;
  ed.volverAMacizo(ed.objects.get(window.__chapa.cubo));
});
await page.waitForTimeout(200);
const solida = await sonda();
ok(
  solida.chapa === null && solida.centro.y !== null && Math.abs(solida.centro.y - LADO) < 0.2,
  `volver a macizo devuelve la tapa (el rayo vuelve a tocarla en y = ${solida.centro.y?.toFixed(2)} cm)`,
);

console.log(fallos === 0 ? "\nTODO OK" : `\n${fallos} FALLOS`);
await browser.close();
process.exit(fallos === 0 ? 0 : 1);
