// PRUEBA: la prensa de piernas del diseñador entra en el inventario de
// máquinas estándar y se arma entera (v0.3.20).
//
// Lo que se mide: que el prefab del diseñador se inserta literal (34 piezas,
// 29 uniones), que su bastidor va soldado —un solo cuerpo rígido—, que la
// máquina se apoya en el suelo por sus travesaños de base, que simular no la
// desarma (el carro baja hasta su tope y ahí se queda) y que el maniquí
// reconoce su asiento y su respaldo, que es para lo que existe.
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
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);

// ── 1. ESTÁ EN EL INVENTARIO ────────────────────────────────────────────────
const enLaPaleta = await page.evaluate(() =>
  [...document.querySelectorAll(".maquina-btn")].map((b) => b.textContent.trim()),
);
ok(
  enLaPaleta.some((t) => /Prensa de piernas/.test(t)),
  "la prensa figura en la paleta de máquinas estándar",
  enLaPaleta.join(" | "),
);

// ── 2. SE ARMA LITERAL ──────────────────────────────────────────────────────
const armado = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  ed.insertarMaquina("legpress", new T.Vector3(0, 0, 0));
  await new Promise((r) => setTimeout(r, 900));
  const objs = [...ed.objects.values()];
  const js = ed.listJoints();
  const caja = new T.Box3();
  const suelo = [];
  for (const o of objs) {
    const c = new T.Box3().setFromObject(o.mesh);
    caja.union(c);
    if (c.min.y <= 0.5) suelo.push(o.name.split(" (")[0]);
  }
  const medidas = caja.getSize(new T.Vector3());
  return {
    piezas: objs.length,
    uniones: js.length,
    soldadas: js.filter((j) => j.soldada).length,
    grupos: [...ed.groups.values()].map((g) => g.name),
    ancho: +medidas.x.toFixed(0),
    alto: +caja.max.y.toFixed(0),
    fondo: +medidas.z.toFixed(0),
    apoyadaEnElSuelo: suelo.length,
    tieneAsiento: objs.some((o) => o.name.startsWith("Asiento")),
    tieneRespaldo: objs.some((o) => o.name.startsWith("Respaldo")),
    tienePlaca: objs.some((o) => o.name.startsWith("Base de soporte")),
    tieneGuias: objs.filter((o) => o.name.startsWith("Guía tubular")).length,
    cuernos: objs.filter((o) => o.name.startsWith("Cuerno")).length,
  };
});
console.log("ARMADO:", JSON.stringify(armado));
ok(armado.piezas === 34, "se arman las 34 piezas del prefab", armado.piezas);
ok(armado.uniones === 29, "se aplican las 29 uniones", armado.uniones);
ok(
  armado.soldadas === 29,
  "el bastidor va SOLDADO: la física lo funde en un cuerpo rígido",
  `${armado.soldadas}/29`,
);
ok(
  armado.grupos.includes("Prensa de piernas"),
  "queda agrupada con su nombre",
  armado.grupos.join(", "),
);
ok(armado.tieneAsiento && armado.tieneRespaldo, "trae asiento y respaldo");
ok(armado.tienePlaca, "trae la placa de empuje");
ok(armado.tieneGuias === 2, "trae sus dos guías tubulares", armado.tieneGuias);
ok(armado.cuernos === 4, "trae los cuatro cuernos de carga", armado.cuernos);
ok(
  armado.apoyadaEnElSuelo >= 3,
  "se apoya en el suelo por sus travesaños de base",
  `${armado.apoyadaEnElSuelo} piezas tocan el suelo`,
);
ok(
  armado.ancho > 150 && armado.ancho < 240 && armado.alto > 150 && armado.alto < 240,
  "tiene medidas de máquina real",
  `${armado.ancho}×${armado.alto}×${armado.fondo} cm`,
);

// ── 3. SIMULAR NO LA DESARMA ────────────────────────────────────────────────
const sim = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  const objs = [...ed.objects.values()];
  const p0 = new Map(objs.map((o) => [o.id, o.mesh.position.clone()]));
  const fijas = objs.filter((o) => o.physics.fixed);
  const deriva = (lista) => {
    let max = 0;
    let quien = "";
    for (const o of lista) {
      const d = o.mesh.position.distanceTo(p0.get(o.id));
      if (d > max) {
        max = d;
        quien = o.name.split(" (")[0];
      }
    }
    return [+max.toFixed(1), quien];
  };
  // SE ESPERA A QUE PARE, NO UN NÚMERO DE SEGUNDOS. Con la máquina cargada
  // —o con la batería en paralelo comiéndose la CPU— el carro tarda más en
  // llegar a su tope, y una foto a los 6 s pillaba el gesto a medias. Lo que
  // se quiere saber es si CONVERGE, así que se muestrea hasta que dos
  // lecturas seguidas coinciden.
  ed.toggleSimulation();
  const traza = [];
  let quieto = false;
  for (let i = 0; i < 15 && !quieto; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    traza.push(deriva(objs)[0]);
    const n = traza.length;
    quieto = n >= 2 && Math.abs(traza[n - 1] - traza[n - 2]) <= 0.5;
  }
  const estructura = deriva(fijas);
  const final = deriva(objs);
  ed.toggleSimulation();
  await new Promise((r) => setTimeout(r, 600));
  return { traza, quieto, estructura, final, alParar: deriva(objs) };
});
console.log("SIMULACIÓN:", JSON.stringify(sim));
ok(
  sim.estructura[0] <= 1,
  "el bastidor anclado no se mueve ni un centímetro",
  `${sim.estructura[0]} cm (${sim.estructura[1]})`,
);
ok(
  sim.quieto,
  "el carro baja hasta su tope y AHÍ SE QUEDA (no cae sin fin)",
  sim.traza.join(" → ") + " cm",
);
ok(sim.final[0] < 60, "nada sale despedido", `${sim.final[0]} cm (${sim.final[1]})`);
ok(sim.alParar[0] <= 1, "al parar vuelve a su pose de diseño", `${sim.alParar[0]} cm`);

// ── 4. EL MANIQUÍ SE SIENTA EN ELLA ─────────────────────────────────────────
const ergo = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const asiento = [...ed.objects.values()].find((o) => o.name.startsWith("Asiento"));
  const respaldo = [...ed.objects.values()].find((o) => o.name.startsWith("Respaldo ("));
  const cj = new T.Box3().setFromObject(asiento.mesh);
  await ed.colocarFiguraEn({ punto: cj.getCenter(new T.Vector3()), obj: asiento });
  await new Promise((r) => setTimeout(r, 500));
  ed.humanFigure.updateMatrixWorld(true);
  const seg = (id) => {
    let m = null;
    ed.humanFigure.traverse((n) => {
      if (n.isMesh && n.userData.segmentId === id) m = n;
    });
    return m;
  };
  const pelvis = new T.Box3().setFromObject(seg("pelvis"));
  const torso = new T.Box3().setFromObject(seg("torso"));
  const cr = new T.Box3().setFromObject(respaldo.mesh);
  return {
    apoyo: ed.figuraApoyadaEn ?? null,
    huecoAsiento: +(pelvis.min.y - cj.max.y).toFixed(1),
    // Distancia del torso al respaldo por el eje en que el respaldo es delgado.
    distanciaAlRespaldo: +torso.getCenter(new T.Vector3())
      .distanceTo(cr.getCenter(new T.Vector3())).toFixed(1),
  };
});
console.log("ERGONOMÍA:", JSON.stringify(ergo));
ok(ergo.apoyo === "pieza", "la figura se apoya en una pieza de la máquina", ergo.apoyo);
ok(
  Math.abs(ergo.huecoAsiento) <= 4,
  "las nalgas quedan SOBRE el asiento, no flotando",
  `${ergo.huecoAsiento} cm`,
);
ok(
  ergo.distanciaAlRespaldo < 60,
  "el torso queda junto al respaldo",
  `${ergo.distanciaAlRespaldo} cm`,
);

await browser.close();
console.log(fallos === 0 ? "TODO OK" : `${fallos} FALLOS`);
process.exit(fallos === 0 ? 0 : 1);
