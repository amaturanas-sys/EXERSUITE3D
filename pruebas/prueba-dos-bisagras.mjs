// PRUEBA: una máquina con DOS bisagras responde a las dos, y el cursor sabe a
// cuál manda (v0.3.28). Se corre sobre el modelo real del diseñador: la banca
// ajustable, con el pivote del respaldo y el del pilar de apoyo.
//
// Lo que se mide:
//   · las dos bisagras del proyecto llegan articuladas, no soldadas —guardar y
//     recargar convertía en soldadura toda bisagra frenada—;
//   · agarrando el pilar de apoyo se manda sobre SU pivote, y agarrando el
//     respaldo sobre el suyo: el cursor discrimina;
//   · girar el pilar de apoyo cambia la inclinación del respaldo, que es para
//     lo que existe el mecanismo.
import { readFileSync } from "node:fs";
import { chromium } from "playwright-core";

let fallos = 0;
const ok = (cond, msg, dato) => {
  if (cond) console.log(`✓ ${msg}`);
  else {
    fallos++;
    console.log(`✗ ${msg}${dato === undefined ? "" : ` — ${dato}`}`);
  }
};

const proyecto = JSON.parse(
  readFileSync(new URL("./datos/bancoajustable.json", import.meta.url), "utf8"),
);

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("pageerror", (e) => console.log("✗ PAGEERROR: " + e.message));
await page.goto(process.env.BASE ?? "http://127.0.0.1:4174/");
await page.waitForTimeout(1000);
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);

// ── 1. LAS DOS BISAGRAS LLEGAN ARTICULADAS ──────────────────────────────────
const cargado = await page.evaluate(async (data) => {
  const ed = window.exersuite.editor;
  await ed.loadProject(data);
  await new Promise((r) => setTimeout(r, 800));
  const js = ed.listJoints();
  const bisagras = js.filter((j) => j.apertura0 != null);
  return {
    piezas: ed.objects.size,
    uniones: js.length,
    bisagras: bisagras.length,
    // Una articulación NUNCA es una soldadura: si lo es, la pieza que cuelga
    // de ella queda fundida y no hay nada que manipular.
    soldadas: bisagras.filter((j) => j.soldada).length,
    frenadas: bisagras.filter((j) => j.locked).length,
  };
}, proyecto);
console.log("CARGADO:", JSON.stringify(cargado));
ok(cargado.piezas === 17 && cargado.uniones >= 15, "el proyecto del diseñador entra entero",
  `${cargado.piezas} piezas, ${cargado.uniones} uniones`);
ok(cargado.bisagras === 2, "trae sus DOS bisagras", cargado.bisagras);
ok(
  cargado.soldadas === 0,
  "y las dos llegan ARTICULADAS: ninguna resucita como soldadura",
  `${cargado.soldadas} soldadas de ${cargado.bisagras}`,
);

// ── 2. GUARDAR Y RECARGAR NO SUELDA NADA ────────────────────────────────────
// Es el camino por el que se perdía: `soldada` no se escribía cuando valía
// `false`, y al releer se deducía de `locked`.
const ida = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  // Se frena una de las dos con el candado, que es el gesto del usuario.
  const bis = ed.listJoints().filter((j) => j.apertura0 != null);
  for (const j of bis) j.locked = true;   // las dos con el candado echado
  ed.jointUpdated();
  const guardado = ed.serialize();
  const texto = JSON.stringify(guardado);
  await ed.loadProject(JSON.parse(texto));
  await new Promise((r) => setTimeout(r, 800));
  const tras = ed.listJoints().filter((j) => j.apertura0 != null);
  return {
    enElFichero: JSON.parse(texto).joints.filter((j) => j.apertura0 != null)
      .map((j) => ({ locked: j.locked, soldada: j.soldada })),
    soldadasTras: tras.filter((j) => j.soldada).length,
    frenadasTras: tras.filter((j) => j.locked).length,
  };
});
console.log("IDA Y VUELTA:", JSON.stringify(ida));
ok(
  ida.enElFichero.every((j) => j.soldada === false),
  "el fichero anota `soldada: false` en vez de callárselo",
  JSON.stringify(ida.enElFichero),
);
ok(
  ida.soldadasTras === 0 && ida.frenadasTras === 2,
  "tras guardar y recargar, las bisagras frenadas SIGUEN siendo bisagras",
  `${ida.soldadasTras} soldadas, ${ida.frenadasTras} frenadas`,
);

// ── 3. EL CURSOR DISCRIMINA A QUÉ BISAGRA MANDA ─────────────────────────────
const manda = await page.evaluate(async (data) => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  await ed.loadProject(data);
  await new Promise((r) => setTimeout(r, 600));
  const busca = (re) => [...ed.objects.values()].find((o) => re.test(o.name));
  // El pilar de apoyo es el travesaño con agujeros de 4 cm; el respaldo, el
  // tapizado grande.
  const pilar = [...ed.objects.values()].find((o) => o.params.holeDiameter === 4);
  const respaldo = busca(/^Respaldo$/);
  ed.toggleSimulation();
  await new Promise((r) => setTimeout(r, 1500));
  const ejeDe = (o, punto) => {
    ed.physics.elegirBisagra(o.id, punto);
    const g = ed.physics.ejeDeGiro(o.id);
    return g ? [+g.punto.x.toFixed(1), +g.punto.y.toFixed(1)] : null;
  };
  const cPilar = pilar.mesh.getWorldPosition(new T.Vector3());
  const cResp = respaldo.mesh.getWorldPosition(new T.Vector3());
  const out = {
    // Cuántas bisagras cuelgan de cada pieza (el respaldo cuelga de las dos).
    pilarEsBisagra: ed.physics.esBisagra(pilar.id),
    respaldoEsBisagra: ed.physics.esBisagra(respaldo.id),
    pivotePilar: ejeDe(pilar, cPilar),
    pivoteRespaldo: ejeDe(respaldo, cResp),
  };
  ed.toggleSimulation();
  await new Promise((r) => setTimeout(r, 500));
  return out;
}, proyecto);
console.log("MANDA:", JSON.stringify(manda));
ok(manda.pilarEsBisagra, "el pilar de apoyo cuelga de una bisagra");
ok(manda.respaldoEsBisagra, "y el respaldo también");
ok(
  manda.pivotePilar && manda.pivoteRespaldo
    && Math.hypot(manda.pivotePilar[0] - manda.pivoteRespaldo[0],
                  manda.pivotePilar[1] - manda.pivoteRespaldo[1]) > 10,
  "y CADA UNO manda sobre un pivote distinto: el cursor discrimina",
  `pilar → ${JSON.stringify(manda.pivotePilar)}, respaldo → ${JSON.stringify(manda.pivoteRespaldo)}`,
);

// ── 4. GIRAR EL PILAR DE APOYO INCLINA EL RESPALDO ──────────────────────────
const inclina = await page.evaluate(async (data) => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  await ed.loadProject(data);
  await new Promise((r) => setTimeout(r, 600));
  const pilar = [...ed.objects.values()].find((o) => o.params.holeDiameter === 4);
  const respaldo = [...ed.objects.values()].find((o) => /^Respaldo$/.test(o.name));
  ed.toggleSimulation();
  await new Promise((r) => setTimeout(r, 1500));
  // Inclinación del respaldo: cuánto se aparta de la vertical su eje largo.
  const inclinacion = () => {
    const v = new T.Vector3(0, 1, 0).applyQuaternion(respaldo.mesh.quaternion);
    return +(Math.acos(Math.min(1, Math.abs(v.y))) * 180 / Math.PI).toFixed(1);
  };
  const antes = inclinacion();
  // Se agarra EL PILAR DE APOYO por su punta y se gira su bisagra.
  const punta = pilar.mesh.getWorldPosition(new T.Vector3());
  ed.physics.elegirBisagra(pilar.id, punta);
  ed.physics.tomarBisagra(pilar.id);
  let llamadas = 0;
  for (let i = 0; i < 40; i++) {
    ed.physics.girarBisagra(pilar.id, 2);
    llamadas++;
    await new Promise((r) => setTimeout(r, 60));
  }
  const anguloPilar = ed.physics.anguloDeBisagra(pilar.id);
  ed.physics.soltarBisagra(pilar.id);
  await new Promise((r) => setTimeout(r, 800));
  const despues = inclinacion();
  ed.toggleSimulation();
  await new Promise((r) => setTimeout(r, 500));
  return {
    antes, despues, llamadas,
    giroPilar: anguloPilar === null ? null : +anguloPilar.toFixed(1),
  };
}, proyecto);
console.log("INCLINA:", JSON.stringify(inclina));
ok(
  Math.abs(inclina.giroPilar ?? 0) > 5,
  "el pilar de apoyo gira sobre su bisagra al mandarla",
  `${inclina.giroPilar}°`,
);
ok(
  Math.abs(inclina.despues - inclina.antes) > 3,
  "y el respaldo cambia de inclinación como consecuencia",
  `${inclina.antes}° → ${inclina.despues}°`,
);

await browser.close();
console.log(fallos === 0 ? "TODO OK" : `${fallos} FALLOS`);
process.exit(fallos === 0 ? 0 : 1);
