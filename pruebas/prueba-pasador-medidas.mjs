// PRUEBA: las MEDIDAS Y EL MANDO del pasador (v0.4.2).
//
// El herraje se rehace entero en cada pasada del pasador —es lo que impide que
// se acumule—, así que lo que se le toque a la horquilla puesta se pierde en
// cuanto el eje se mueve. Por eso sus cotas viven en quien la monta, y esta
// prueba mide justo eso: que lo pedido desde el pasador manda, que lo vacío
// sigue saliendo de la cuenta, y que el eje entero se maneja con un solo
// mando de gesto aunque monte varias uniones.
//
// Lo que se mide:
//   · las cotas vacías salen de la cuenta de siempre (alto = ancho del brazo);
//   · pedidas desde Propiedades, mandan ellas —y sobreviven a mover el eje—;
//   · el seguro es una cota, y de él salen los radios del disco: más gordo el
//     seguro, más gordo el disco;
//   · la sensibilidad del gesto se dice UNA VEZ en el eje y llega a TODAS las
//     uniones que monta.
import { chromium } from "playwright-core";

let fallos = 0;
const ok = (cond, msg, dato) => {
  if (cond) console.log(`✓ ${msg}`);
  else {
    fallos++;
    console.log(`✗ ${msg}${dato === undefined ? "" : ` — ${dato}`}`);
  }
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
await page.click(".wizard-carta:has-text('Canvas libre')");
await page.waitForFunction(() => !document.querySelector(".cargando-capa"), null, { timeout: 45000 });
await page.waitForTimeout(2500);

// ── ESCENA: poste, brazo de 5 cm de ancho y un eje con horquilla ────────────
await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  window.__T = T;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);

  const poste = ed.addComponent("prim-box", new T.Vector3(0, 40, 0));
  poste.name = "Poste";
  poste.params = { kind: "box", width: 20, height: 60, depth: 20 };
  poste.rebuildGeometry();
  poste.mesh.position.set(0, 40, 0);

  const brazo = ed.addComponent("prim-box", new T.Vector3(30, 40, 0));
  brazo.name = "Brazo";
  brazo.params = { kind: "box", width: 40, height: 5, depth: 5 };
  brazo.rebuildGeometry();
  brazo.mesh.position.set(34, 40, 0);

  const pin = ed.addComponent("pasador", new T.Vector3(14, 40, 0));
  pin.name = "Eje";
  pin.mesh.position.set(14, 40, 0);
  // Eje horizontal en Z: el brazo gira en el plano vertical.
  pin.mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(0, 0, 1));
  pin.params.pasadorAnclas = [poste.id];
  pin.params.pasadorMoviles = [brazo.id];
  pin.params.pasadorAnclaje = true;
  ed.bus.emit("objectTransformed", { object: pin });
  ed.aplicarPasador(pin);
  window.__ids = { poste: poste.id, brazo: brazo.id, pin: pin.id };
});
await page.waitForTimeout(600);

const leer = () => page.evaluate(() => {
  const ed = window.exersuite.editor;
  const h = ed.listObjects().find((o) => o.componentId === "punto-anclaje");
  const j = ed.listJoints().find((x) => /pivote de Brazo/.test(x.name));
  const m = ed.horquillaDelPasador(window.__ids.pin);
  return {
    hay: !!h,
    alto: h?.params.horquillaAlto ?? null,
    garganta: h?.params.horquillaGarganta ?? null,
    vuelo: h?.params.horquillaVuelo ?? null,
    esp: h?.params.horquillaEspesor ?? null,
    seguro: m ? +(m.seguro * 2).toFixed(3) : null,
    disco: m ? +(m.discoR * 2).toFixed(2) : null,
    sens: j?.sensibilidad ?? null,
  };
});

// ── 1. VACÍO = LA CUENTA DE SIEMPRE ─────────────────────────────────────────
const A = await leer();
ok(A.hay, "la horquilla se monta");
ok(Math.abs((A.alto ?? 0) - 5) < 0.01, "su alto sale del ANCHO DEL BRAZO que gira (5)", String(A.alto));
ok(Math.abs((A.garganta ?? 0) - 5.4) < 0.01, "y la garganta, de lo que pasa entre las orejas (5 + 0,4)", String(A.garganta));
ok(Math.abs((A.vuelo ?? 0) - 4) < 0.01, "y el vuelo, de la distancia real de la cara al eje (14 − 10)", String(A.vuelo));
ok(A.sens === 9, "las uniones nacen con la sensibilidad de fábrica", String(A.sens));

// ── 2. PEDIDAS DESDE EL PASADOR, MANDAN ELLAS ───────────────────────────────
// El alto y el seguro se teclean en Propiedades; el resto por parámetro, que
// es la misma puerta (el panel escribe justo esos campos).
await page.evaluate(() => {
  const ed = window.exersuite.editor;
  ed.select(ed.getObject(window.__ids.pin));
});
await page.waitForTimeout(500);
const campos = await page.evaluate(() => ({
  alto: !!document.querySelector('input[title^="Alto de la horquilla"]'),
  garganta: !!document.querySelector('input[title^="Separación entre orejas"]'),
  vuelo: !!document.querySelector('input[title^="Cuánto vuela"]'),
  esp: !!document.querySelector('input[title^="Espesor de la chapa"]'),
  seguro: !!document.querySelector('input[title^="Diámetro del pin de seguro"]'),
}));
ok(
  Object.values(campos).every(Boolean),
  "Propiedades ofrece las cotas de la horquilla y el seguro",
  JSON.stringify(campos),
);

// Se teclea en el campo del panel y se dispara su `change`, que es lo que el
// usuario provoca al salir del campo. (El panel puede estar replegado en este
// ancho de ventana, así que no vale `page.fill`, que exige verlo.)
await page.evaluate(() => {
  const i = document.querySelector('input[title^="Alto de la horquilla"]');
  i.value = "12";
  i.dispatchEvent(new Event("change", { bubbles: true }));
});
await page.waitForTimeout(500);
const B = await leer();
ok(B.alto === 12, "el alto tecleado manda sobre la cuenta", String(B.alto));
ok(B.garganta === A.garganta, "y no arrastra a las demás: la garganta sigue a la cuenta", String(B.garganta));

await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const pin = ed.getObject(window.__ids.pin);
  pin.params.pasadorHorquillaGarganta = 7;
  pin.params.pasadorHorquillaVuelo = 6;
  pin.params.pasadorHorquillaEspesor = 1.2;
  pin.params.pasadorSensibilidad = 20;
  ed.aplicarPasador(pin);
});
await page.waitForTimeout(400);
const C = await leer();
ok(C.garganta === 7 && C.vuelo === 6 && C.esp === 1.2, "garganta, vuelo y espesor a medida", JSON.stringify(C));
ok(C.sens === 20, "y la sensibilidad del gesto llega a la unión que monta", String(C.sens));

// ── 3. SOBREVIVEN A MOVER EL EJE ────────────────────────────────────────────
// Es lo que no podía hacer tocando la horquilla: se rehace entera en cada
// pasada, y el gizmo del eje dispara una pasada.
await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const pin = ed.getObject(window.__ids.pin);
  pin.mesh.position.set(15, 42, 0);
  ed.bus.emit("objectTransformed", { object: pin });
});
await page.waitForTimeout(600);
const D = await leer();
ok(
  D.alto === 12 && D.garganta === 7 && D.esp === 1.2,
  "las cotas sobreviven a mover el eje con el gizmo",
  JSON.stringify(D),
);

// ── 4. EL SEGURO ES UNA COTA, Y EL DISCO SALE DE ÉL ─────────────────────────
await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const pin = ed.getObject(window.__ids.pin);
  pin.params.pasadorIndexado = true;
  pin.params.pasadorPosiciones = 12;
  pin.params.pasadorLimite = true;
  pin.params.pasadorMin = 0;
  pin.params.pasadorMax = 90;
  ed.aplicarPasador(pin);
});
await page.waitForTimeout(500);
const E = await leer();
// El panel se repinta con la escena: se vuelve a pedir el eje para tenerlo
// delante, igual que haría quien lo está ajustando.
await page.evaluate(() => {
  const ed = window.exersuite.editor;
  ed.select(null);
  ed.select(ed.getObject(window.__ids.pin));
});
await page.waitForTimeout(500);
await page.evaluate(() => {
  const i = document.querySelector('input[title^="Diámetro del pin de seguro"]');
  i.value = "1.6";
  i.dispatchEvent(new Event("change", { bubbles: true }));
});
await page.waitForTimeout(600);
const F = await leer();
ok((E.disco ?? 0) > 0, "con el disco puesto hay corona que medir", String(E.disco));
ok(Math.abs((F.seguro ?? 0) - 1.6) < 0.01, "el seguro se pide en diámetro y se guarda como tal", String(F.seguro));
ok(
  (F.disco ?? 0) > (E.disco ?? 0),
  "y el disco CRECE con él: más acero alrededor de cada agujero",
  `${E.disco} → ${F.disco}`,
);

console.log(fallos ? `\n${fallos} FALLOS` : "\nTODO OK");
await browser.close();
process.exit(fallos ? 1 : 0);
