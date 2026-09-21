// PRUEBA: una máquina con DOS bisagras responde a las dos, y el cursor sabe a
// cuál manda (v0.3.28). Se corre sobre el modelo real del diseñador: la banca
// ajustable, con el pivote del respaldo y el del pilar de apoyo.
//
// Lo que se mide:
//   · las dos bisagras del proyecto llegan articuladas, no soldadas —guardar y
//     recargar convertía en soldadura toda bisagra frenada—;
//   · agarrando el pilar de apoyo se manda sobre SU pivote, y agarrando el
//     respaldo sobre el suyo: el cursor discrimina;
//   · y el AJUSTE funciona: al recostar el respaldo el pasador del puntal
//     salta de diente y la banca se queda donde se la deja, que es para lo que
//     existe el mecanismo.
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
await page.click("text=📁 PROYECTOS"); await page.waitForTimeout(300);
await page.click(".land-actions button:has-text('NUEVO')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')");
// SE ESPERA A QUE LA APP ESTE LISTA, NO AL RELOJ (v0.3.81): la capa de carga
// se va cuando las mallas estan. Adivinarlo con un timeout fijo es lo que
// hacia parpadear a estas pruebas.
await page.waitForFunction(() => !document.querySelector(".cargando-capa"), null, { timeout: 45000 });
await page.waitForTimeout(2500);

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
// 18 piezas desde v0.3.82: la banca gana el PASADOR TRANSVERSAL de la punta
// del puntal, que es lo que descansa en el diente de la viga. Sin él el
// puntal se colaba entre las dos placas y el respaldo se caía solo.
ok(cargado.piezas === 18 && cargado.uniones >= 16, "el proyecto del diseñador entra entero",
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

// ── 4. EL AJUSTE: SE RECUESTA EL RESPALDO Y SE QUEDA DONDE SE DEJA ──────────
//
// ESTE PASO SE REESCRIBIÓ EN v0.3.85, y conviene saber por qué.
//
// Antes agarraba EL PUNTAL y lo giraba sin levantar el respaldo. Aquello
// funcionaba mientras el mecanismo estuvo roto —el puntal flotaba libre, sin
// tocar la viga dentada—, y de hecho lo que medía no era el mecanismo sino
// CUÁNTO SE HABÍA CAÍDO el respaldo mientras tanto: pedía «que cambie más de
// 3°» y el respaldo se desplomaba a razón de casi un grado por segundo.
//
// Arreglada la banca (v0.3.82-v0.3.84: el puntal cuelga, lleva su pasador
// transversal y la viga dentada está soldada), el puntal ya NO se deja girar
// con el pasador encajado en su diente — igual que el de la máquina real,
// donde hay que levantar el respaldo para liberarlo. La prueba empezó a
// fallar 3 de cada 5 veces, y era la prueba la que pedía un imposible.
//
// Así que ahora se hace EL GESTO BUENO, el de la máquina: se recuesta el
// respaldo, el pasador salta de diente, y se comprueba lo que de verdad
// importa —que la banca SE QUEDA donde la dejas—. Eso es lo que estuvo roto.
const ajuste = await page.evaluate(async (data) => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  await ed.loadProject(data);
  await new Promise((r) => setTimeout(r, 600));
  const respaldo = [...ed.objects.values()].find((o) => /^Respaldo$/.test(o.name));
  const pasador = [...ed.objects.values()].find((o) => /Pasador de apoyo/.test(o.name));
  const dentada = [...ed.objects.values()].find((o) => /Placa dentada \(upright\)$/.test(o.name));
  const inclinacion = () => {
    const v = new T.Vector3(0, 1, 0).applyQuaternion(respaldo.mesh.quaternion);
    return +(Math.acos(Math.min(1, Math.abs(v.y))) * 180 / Math.PI).toFixed(1);
  };
  // Se recuesta agarrando EL RESPALDO por su propia bisagra, que es el gesto
  // con el que se ajusta una banca.
  // SE INSISTE HASTA QUE PRENDA. El agarre de la bisagra no siempre engancha a
  // la primera, y una prueba que a veces ni llega a recostar la banca no mide
  // nada: lo que se quiere comprobar es qué pasa DESPUÉS de recostarla.
  const recostar = async (meta) => {
    for (let intento = 0; intento < 6 && inclinacion() < meta; intento++) {
      const c = respaldo.mesh.getWorldPosition(new T.Vector3());
      ed.physics.elegirBisagra(respaldo.id, c);
      ed.physics.tomarBisagra(respaldo.id);
      for (let k = 0; k < 8; k++) {
        ed.physics.girarBisagra(respaldo.id, 3);
        await new Promise((r) => setTimeout(r, 80));
      }
      ed.physics.soltarBisagra(respaldo.id);
      await new Promise((r) => setTimeout(r, 3000));   // que asiente en su diente
    }
    return inclinacion();
  };
  ed.toggleSimulation();
  await new Promise((r) => setTimeout(r, 4000));

  const reposo1 = inclinacion();
  const reposo2 = await recostar(20);
  const reposo3 = await recostar(28);

  // ¿SE QUEDA? Seis segundos mirando sin tocar. Cuando la banca estaba rota
  // el respaldo caía a ~0,9°/s, o sea unos 5-6° en esta ventana.
  const deriva = [];
  for (let k = 0; k < 6; k++) {
    await new Promise((r) => setTimeout(r, 1000));
    deriva.push(inclinacion());
  }

  // Y el pasador tiene que seguir A LA ALTURA de la viga dentada: si se ha
  // salido por arriba o se ha ido al suelo, no está apoyado en ningún diente.
  pasador.mesh.updateMatrixWorld(true);
  dentada.mesh.updateMatrixWorld(true);
  const cajaP = new T.Box3().setFromObject(pasador.mesh);
  const cajaD = new T.Box3().setFromObject(dentada.mesh);
  const enLaViga = cajaP.min.y >= cajaD.min.y - 3 && cajaP.max.y <= cajaD.max.y + 3;

  ed.toggleSimulation();
  await new Promise((r) => setTimeout(r, 500));
  return {
    reposo1, reposo2, reposo3, deriva, enLaViga,
    recorrido: +(Math.max(reposo1, reposo2, reposo3) - Math.min(reposo1, reposo2, reposo3)).toFixed(1),
    caida: +(Math.max(...deriva) - Math.min(...deriva)).toFixed(1),
  };
}, proyecto);
console.log("AJUSTE:", JSON.stringify(ajuste));
ok(
  ajuste.recorrido > 8,
  "recostar el respaldo lo lleva a otro diente: la banca se ajusta",
  `${ajuste.reposo1}° → ${ajuste.reposo2}° → ${ajuste.reposo3}°`,
);
ok(
  ajuste.caida < 2,
  "y SE QUEDA donde se la deja: no cede sola",
  `${ajuste.caida}° de deriva en 6 s (${ajuste.deriva.join(" → ")})`,
);
ok(
  ajuste.enLaViga,
  "el pasador del puntal descansa en la viga dentada, que es lo que la sostiene",
);

await browser.close();
console.log(fallos === 0 ? "TODO OK" : `${fallos} FALLOS`);
process.exit(fallos === 0 ? 0 : 1);
