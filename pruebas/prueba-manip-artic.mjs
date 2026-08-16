// v0.2.41 · (1) La MANIPULACIÓN se elige a propósito y resalta lo agarrable.
// (2) Articulaciones del maniquí: bloqueadas de fábrica, panel por familia y
// lado, y ▲▼ mueven a la vez todo lo liberado.
import { chromium } from "playwright-core";
const browser = await chromium.launch({
  // El Chromium de Playwright ya instalado. Se puede apuntar a otro con
  // CHROMIUM=/ruta/al/chrome (ver LEEME.md).
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1180, height: 900 } });
const errores = [];
page.on("pageerror", (e) => errores.push(e.message));
await page.goto("http://127.0.0.1:4174/");
await page.waitForTimeout(1000);
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);
const fallos = [];
const ok = (c, m) => { if (!c) fallos.push(m); console.log((c ? "✓ " : "✗ ") + m); };

// --- Herramienta de manipulación
await page.evaluate(() => {
  [...document.querySelectorAll("#palette .comp-btn")]
    .find((b) => (b.textContent ?? "").trim().endsWith("UpperMachine")).click();
});
await page.waitForTimeout(1800);
const t0 = await page.evaluate(() => window.exersuite.editor.getSimHerramienta());
ok(t0 === "orbitar", `la mano NO viene activada de fábrica (herramienta: ${t0})`);

const hover = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  ed.startSimulation();
  for (let i = 0; i < 120 && !ed.physics; i++) await new Promise((x) => setTimeout(x, 50));
  await new Promise((x) => setTimeout(x, 6000));
  ed.setSimHerramienta("mano");
  const objs = [...ed.objects.values()];
  const rect = ed.sceneManager.renderer.domElement.getBoundingClientRect();
  const punto = (i) => {
    const v = objs[i].mesh.position.clone().project(ed.sceneManager.camera);
    return { x: Math.round((v.x * 0.5 + 0.5) * rect.width), y: Math.round((-v.y * 0.5 + 0.5) * rect.height) };
  };
  return { movil: punto(39), fija: punto(6),
    puedeBrazo: ed.physics.puedeAgarrar(objs[39].id),
    puedeRespaldo: ed.physics.puedeAgarrar(objs[6].id) };
});
ok(hover.puedeBrazo, "el motor reconoce el brazo de press como estructura móvil");
ok(!hover.puedeRespaldo, "y el respaldo anclado no lo es");
await page.mouse.move(hover.movil.x, hover.movil.y);
await page.waitForTimeout(400);
const resaltado = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const objs = [...ed.objects.values()];
  const brillo = (i) => (objs[i].mesh.material.emissive?.getHex?.() ?? 0);
  return { brazo: brillo(39), cursor: ed.sceneManager.renderer.domElement.style.cursor };
});
ok(resaltado.brazo !== 0, `la pieza móvil se resalta al pasar por encima (0x${resaltado.brazo.toString(16)})`);
ok(resaltado.cursor === "grab", `y el cursor avisa que se puede asir (${resaltado.cursor})`);
await page.screenshot({ path: "v241-mano.png" });

// --- Maniquí: articulaciones
const art = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  ed.stopSimulation();
  await new Promise((x) => setTimeout(x, 600));
  await ed.addHumanFigure();
  await new Promise((x) => setTimeout(x, 700));
  const total = ed.articulacionesFigura().length;
  const libres0 = ed.articulacionesLibres().sort().join(",");
  // La ventana del maniquí aparece sola; solo hay que ponerla en SIMULAR.
  if (!ed.panelArticulaciones.visible()) ed.panelArticulaciones.alternar();
  ed.panelArticulaciones.setModo("simular");
  const visible = ed.panelArticulaciones.visible();
  const filas = document.querySelectorAll("#articulaciones .mq-zona").length;
  const secs = document.querySelectorAll("#articulaciones .mq-seccion");
  const lados = secs[1].querySelectorAll(".mq-zona .art-lados .tool").length;
  return { total, libres0, visible, filas, lados };
});
console.log("articulaciones:", JSON.stringify(art));
ok(art.libres0 === "elbowL,elbowR,shoulderL,shoulderR",
  `la figura nace con el TREN SUPERIOR como única zona activa (${art.libres0})`);
ok(art.visible && art.filas === 3 && art.lados === 9,
  `la ventana ofrece 3 zonas con su lado (${art.filas} zonas / ${art.lados} botones de lado)`);

// Activar el TREN INFERIOR desde la ventana y empujar con 8 (v0.2.49).
const mov = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  ed.applyPose("Sentadilla");
  const caja = (re) => [...document.querySelectorAll("#articulaciones .mq-zona")]
    .find((f) => re.test(f.textContent)).querySelector("input");
  caja(/Tren superior/i).click();                         // deja SOLO el inferior
  caja(/Tren inferior/i).click();
  const libres = ed.articulacionesLibres().sort();
  const j = ed.figureJoints();
  const g = (n) => T.MathUtils.radToDeg(j[n].rotation.x);
  const planta = () => g("hipL") + g("kneeL") + g("ankleL");
  const a0 = { rodillaL: g("kneeL"), rodillaR: g("kneeR"), caderaL: g("hipL"), hombro: g("shoulderL"), planta: planta() };
  for (let i = 0; i < 5; i++) ed.moverPrimitiva(1);
  const a1 = { rodillaL: g("kneeL"), rodillaR: g("kneeR"), caderaL: g("hipL"), hombro: g("shoulderL"), planta: planta() };
  return { libres, a0, a1 };
});
console.log("movimiento:", JSON.stringify(mov, (k, v) => typeof v === "number" ? +v.toFixed(1) : v));
ok(mov.libres.join(",") === "ankleL,ankleR,hipL,hipR,kneeL,kneeR",
  `la casilla de zona libera cadera, rodilla y tobillo de los DOS lados (${mov.libres.join(", ")})`);
ok(mov.a1.rodillaL < mov.a0.rodillaL - 15 && mov.a1.rodillaR < mov.a0.rodillaR - 15 &&
   mov.a1.caderaL > mov.a0.caderaL + 15,
  `8 EMPUJA: extensión simultánea de las dos rodillas y la cadera (rodillas ${(mov.a1.rodillaL - mov.a0.rodillaL).toFixed(0)}° / ${(mov.a1.rodillaR - mov.a0.rodillaR).toFixed(0)}°, cadera +${(mov.a1.caderaL - mov.a0.caderaL).toFixed(0)}°)`);
ok(Math.abs(mov.a1.hombro - mov.a0.hombro) < 0.5, "y no toca lo que está fuera de la zona (hombro)");
ok(Math.abs(mov.a1.planta - mov.a0.planta) < 1.5,
  `el tobillo acomoda y la planta conserva su orientación (${mov.a0.planta.toFixed(1)}° → ${mov.a1.planta.toFixed(1)}°)`);
await page.screenshot({ path: "v241-articulaciones.png" });
console.log("ERRORES:", errores.length ? errores.join("\n") : "ninguno");
console.log(fallos.length ? "❌ " + fallos.join(" · ") : "✅ todo correcto");
await browser.close();
