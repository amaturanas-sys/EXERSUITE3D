// PRUEBA: EL MODO INDEXADO DEL PASADOR (v0.3.42) — el disco, en la física.
//
// El herraje de `cad/` ya existía —un disco con su corona de agujeros y un pin
// de seguro— pero la física seguía clavando la bisagra donde la dejaras, con
// decimales que ningún agujero puede dar. Con el modo indexado la bisagra se
// comporta como el pin: sueltas el brazo donde sea y cae en el agujero MÁS
// CERCANO.
//
// Lo que se mide:
//   · sin indexar, se clava donde se suelte (como siempre);
//   · indexado, el ángulo al soltar es múltiplo del paso;
//   · desde un ángulo cualquiera cae al agujero más cercano, no al primero;
//   · el paso sale del número de posiciones que se pidan;
//   · y la unión se guarda y se recarga con su paso puesto.
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
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("pageerror", (e) => console.log("✗ PAGEERROR: " + e.message));
await page.goto(process.env.BASE ?? "http://127.0.0.1:4174/");
await page.waitForTimeout(1000);
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);

// Un brazo que cuelga de un pasador FRENADO sobre un poste fijo.
await page.evaluate(() => {
  const T = window.exersuite.THREE;
  window.__escena = (posiciones) => {
    const ed = window.exersuite.editor;
    for (const o of [...ed.objects.values()]) ed.removeObject(o);
    const viga = (n, c, L, A, eje) => {
      const v = ed.addComponent("pilar-linea");
      v.name = n;
      v.params = { kind: "beam", width: A, depth: A, ends: "plano",
                   path: [[0, -L / 2, 0], [0, L / 2, 0]] };
      v.rebuildGeometry();
      if (eje) v.mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), eje);
      v.mesh.position.copy(c);
      ed.bus.emit("objectTransformed", { object: v });
      return v;
    };
    const poste = viga("Poste", new T.Vector3(0, 50, 0), 100, 7);
    poste.physics = { ...poste.physics, fixed: true };
    const brazo = viga("Brazo", new T.Vector3(8 - 2.5 + 20, 80, 0), 40, 5, new T.Vector3(1, 0, 0));
    brazo.physics = { ...brazo.physics, fixed: false, massKg: 3 };
    const pas = ed.addComponent("pasador");
    pas.params = { ...pas.params, height: 16 };
    pas.rebuildGeometry();
    pas.mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(0, 0, 1));
    pas.mesh.position.set(8, 80, 0);
    ed.bus.emit("objectTransformed", { object: pas });
    pas.params.pasadorAnclas = [poste.id];
    pas.params.pasadorMoviles = [brazo.id];
    pas.params.pasadorLibre = false;          // FRENADO: se sostiene donde lo dejes
    pas.params.pasadorPerfora = false;
    if (posiciones) {
      pas.params.pasadorIndexado = true;
      pas.params.pasadorPosiciones = posiciones;
    }
    ed.aplicarPasador(pas);
    return { pas, brazo, poste };
  };
});

/** Gira el brazo `grados` y lo suelta; devuelve dónde se quedó. */
const girarYSoltar = (posiciones, grados) => page.evaluate(async ({ posiciones, grados }) => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  const { brazo } = window.__escena(posiciones);
  ed.toggleSimulation();
  await new Promise((r) => setTimeout(r, 900));
  const punta = brazo.mesh.getWorldPosition(new T.Vector3());
  ed.physics.elegirBisagra(brazo.id, punta);
  ed.physics.tomarBisagra(brazo.id);
  const paso = 2;
  for (let i = 0; i < Math.round(Math.abs(grados) / paso); i++) {
    ed.physics.girarBisagra(brazo.id, Math.sign(grados) * paso);
    await new Promise((r) => setTimeout(r, 55));
  }
  const antes = ed.physics.anguloDeBisagra(brazo.id);
  ed.physics.soltarBisagra(brazo.id);
  const traza = [];
  for (let i = 0; i < 8; i++) {
    await new Promise((r) => setTimeout(r, 300));
    traza.push(+ed.physics.anguloDeBisagra(brazo.id).toFixed(2));
  }
  const despues = ed.physics.anguloDeBisagra(brazo.id);
  const indice = ed.physics.indiceDeBisagra(brazo.id);
  ed.toggleSimulation();
  await new Promise((r) => setTimeout(r, 400));
  return { antes: +antes.toFixed(2), despues: +despues.toFixed(2), indice, traza };
}, { posiciones, grados });

// ── 1. SIN INDEXAR: se clava donde se suelte ────────────────────────────────
const libre = await girarYSoltar(0, 37);
console.log("SIN INDEXAR:", JSON.stringify(libre));
ok(libre.indice === null, "sin indexar, la bisagra no tiene posiciones", JSON.stringify(libre.indice));
ok(
  Math.abs(libre.despues - libre.antes) < 1.5,
  "y se queda donde se soltó",
  `${libre.antes}° → ${libre.despues}°`,
);

// ── 2. INDEXADO A 24 POSICIONES (15°) ───────────────────────────────────────
const idx = await girarYSoltar(24, 37);
console.log("INDEXADO 24:", JSON.stringify(idx));
const resto = Math.abs(((idx.despues % 15) + 15) % 15);
ok(
  resto < 0.6 || Math.abs(resto - 15) < 0.6,
  "indexado, cae en un múltiplo del paso (15°)",
  `${idx.antes}° → ${idx.despues}°`,
);
ok(idx.indice !== null, "y sabe en qué posición del disco está", JSON.stringify(idx.indice));
ok(idx.indice?.posiciones === 24, "de las 24 que se pidieron", idx.indice?.posiciones);
// El agujero MÁS CERCANO, no el primero: 37° está más cerca de 45 que de 30.
ok(
  Math.abs(idx.despues - idx.antes) <= 7.6,
  "al agujero más cercano, no al de más allá",
  `soltado en ${idx.antes}°, clavado en ${idx.despues}°`,
);

// ── 3. EL PASO SALE DE LAS POSICIONES ───────────────────────────────────────
const ocho = await girarYSoltar(8, 37);
console.log("INDEXADO 8:", JSON.stringify(ocho));
const r8 = Math.abs(((ocho.despues % 45) + 45) % 45);
ok(
  r8 < 0.6 || Math.abs(r8 - 45) < 0.6,
  "con 8 posiciones el paso es 45°",
  `${ocho.antes}° → ${ocho.despues}°`,
);

// ── 4. SE GUARDA Y SE RECARGA ───────────────────────────────────────────────
const vuelta = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  window.__escena(24);
  const guardado = ed.serialize();
  const antes = ed.listJoints().filter((j) => j.indexPaso > 0).length;
  await ed.loadProject(JSON.parse(JSON.stringify(guardado)));
  await new Promise((r) => setTimeout(r, 700));
  const pasos = ed.listJoints().map((j) => j.indexPaso).filter((v) => v > 0);
  return { antes, despues: pasos.length, paso: pasos[0] ?? null };
});
console.log("GUARDADO:", JSON.stringify(vuelta));
ok(vuelta.despues === vuelta.antes && vuelta.antes > 0,
   "la unión se guarda y se recarga indexada", JSON.stringify(vuelta));
ok(Math.abs((vuelta.paso ?? 0) - 15) < 0.01, "con su paso intacto", vuelta.paso);


// ── 5. Y EL HUD LO DICE ─────────────────────────────────────────────────────
//
// Saber en qué agujero va a entrar el pin ANTES de soltar es la mitad de la
// utilidad del disco. El HUD salía antes con su recordatorio de la gravedad y
// se comía el texto de medida, así que operar una bisagra no decía nada.
const hud = await page.evaluate(async () => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  const { brazo } = window.__escena(24);
  // NO BASTA CON EL TEXTO: simulando, el HUD está escondido por CSS, y poner
  // texto en un elemento con `display: none` es exactamente el fallo que esto
  // vino a arreglar. Se lee el texto SÓLO si de verdad se está mostrando.
  const leido = () => {
    const h = document.getElementById("hud");
    if (!h || getComputedStyle(h).display === "none") return null;
    return h.textContent ?? null;
  };
  ed.toggleSimulation();
  await new Promise((r) => setTimeout(r, 800));
  const enReposo = leido();
  const punta = brazo.mesh.getWorldPosition(new T.Vector3());
  ed.physics.elegirBisagra(brazo.id, punta);
  ed.physics.tomarBisagra(brazo.id);
  for (let i = 0; i < 6; i++) {
    ed.physics.girarBisagra(brazo.id, 2);
    await new Promise((r) => setTimeout(r, 60));
  }
  ed.anunciarBisagra?.(brazo.id, false);
  const girando = leido();
  ed.anunciarBisagra?.(brazo.id, true);
  const soltando = leido();
  ed.toggleSimulation();
  await new Promise((r) => setTimeout(r, 400));
  return { enReposo, girando, soltando };
});
console.log("HUD:", JSON.stringify(hud));
// En reposo el HUD no habla de la bisagra: sólo cuando se la opera. (Puede
// estar mostrando otro aviso de la escena, que es legítimo y manda.)
ok(
  !/posición\s*\d+\/|Se clava/.test(hud.enReposo ?? ""),
  "en reposo el HUD no anuncia posiciones",
  hud.enReposo,
);
ok(
  // EN HORAS, NO EN GRADOS (v0.3.48): el grado se cuenta desde la pose de
  // diseño de cada unión y no dice dónde está la pieza; la hora sí.
  /Bisagra \d{1,2}:\d{2}/.test(hud.girando ?? "") && /posición\s*\d+\/24/.test(hud.girando ?? ""),
  "girando dice la HORA a la que está y la posición del disco",
  hud.girando,
);
ok(
  /posición\s*\d+\/24/.test(hud.soltando ?? ""),
  "y al soltar dice en qué posición del disco se clava",
  hud.soltando,
);
ok(/Se clava en/.test(hud.soltando ?? ""), "diciendo que es el destino, no dónde está de paso", hud.soltando);

console.log(fallos === 0 ? "TODO OK" : `❌ ${fallos} fallo(s)`);
await browser.close();
process.exit(fallos ? 1 : 0);
