// v0.3.10 · SOLDAR MIDE CONTRA EL ACERO, Y LA GUÍA SOBREVIVE AL SOLDADO.
//
// Tres defectos que el diseñador destapó armando una prensa de piernas, y que
// tienen una raíz común: el motor medía volúmenes donde no había material.
//
//   1. La caja de colisión de una pieza se centraba en su ORIGEN, no en su
//      material. Una viga trazada no tiene la malla centrada en su origen —su
//      recorrido puede arrancar 90 cm por debajo—, así que la caja quedaba
//      donde no hay acero. Medido en el modelo del diseñador: 14 de 32 piezas
//      descolocadas, las peores 55,87 cm. De ahí que soldar pareciera «pedir
//      un posicionamiento demasiado estricto»: no encontraba contactos que se
//      ven a simple vista.
//
//   2. Una viga DOBLADA se medía por su envolvente, un ladrillo lleno de aire:
//      dos piezas que no se rozan salían en contacto y una escondida en el
//      hueco del codo salía separada.
//
//   3. Al soldar, las piezas se FUNDEN en un solo cuerpo, y la detección de
//      guías tubulares se quedaba con UNA pieza por cuerpo — la primera del
//      mapa. Si el carro de una prensa entraba en un conjunto soldado y la
//      elegida era el bastidor, la guía dejaba de existir: el carro conservaba
//      sus agujeros y se caía por fuera de sus barras.
//
// Y un cuarto, de interfaz: al agrupar, el panel mostraba el GRUPO y la
// sección de física desaparecía — masa y «Fija» quedaban fuera de alcance sin
// desagrupar la máquina entera.
import { chromium } from "playwright-core";

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const p = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errores = [];
p.on("pageerror", (e) => errores.push(e.message));
const fallos = [];
const ok = (c, m) => { if (!c) fallos.push(m); console.log((c ? "✓ " : "✗ ") + m); };

await p.goto("http://127.0.0.1:4174/");
await p.waitForTimeout(1000);
await p.click("text=🛠 BUILDER"); await p.waitForTimeout(300);
await p.click("text=Crear nuevo proyecto"); await p.waitForTimeout(300);
await p.click(".wizard-carta:has-text('Profesional')"); await p.waitForTimeout(300);
await p.click(".wizard-carta:has-text('Canvas libre')"); await p.waitForTimeout(2200);

const PREPARA = `
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  const limpia = () => { for (const o of [...ed.listObjects()]) ed.removeObject(o); ed.select(null); };
  const r2 = (v) => +v.toFixed(2);
  const viga = (nombre, path, pos, rotY) => {
    const o = ed.addComponent("pilar-linea");
    o.name = nombre;
    o.params = { kind: "beam", width: 5, depth: 5, ends: "plano", path };
    o.rebuildGeometry();
    o.mesh.position.set(pos[0], pos[1], pos[2]);
    if (rotY) o.mesh.rotation.set(0, 0, rotY);
    o.physics = { massKg: 5, fixed: false };
    o.mesh.updateMatrixWorld(true);
    return o;
  };
  const caja = (nombre, w, h, d, pos) => {
    const o = ed.addComponent("prim-box");
    o.name = nombre;
    o.params = { kind: "box", width: w, height: h, depth: d };
    o.rebuildGeometry();
    o.mesh.position.set(pos[0], pos[1], pos[2]);
    o.physics = { massKg: 5, fixed: false };
    o.mesh.updateMatrixWorld(true);
    return o;
  };
`;

// ── 1. LA CAJA SE CENTRA EN EL MATERIAL, NO EN EL ORIGEN ──────────────────
//
// Una viga cuyo material cuelga 90 cm POR DEBAJO de su origen, y una placa
// pegada a su extremo inferior. Con la caja centrada en el origen, la viga
// «ocupaba» de y=100 a y=190 —justo al revés de donde está el acero— y la
// placa quedaba a 85 cm de distancia: soldar no encontraba nada.
console.log("\n── La caja, donde está el acero ────────────────────────────");
const centrado = await p.evaluate(`(() => {
  ${PREPARA}
  limpia();
  // Viga DOBLADA cuyo material cuelga muy por debajo de su origen: baja 90 cm
  // y luego dobla hacia +z. (En una viga RECTA la malla sí nace centrada en el
  // origen; el descentrado es cosa de las trazadas por nodos, que son las que
  // pueblan una máquina de verdad.)
  const v = viga("Viga colgante", [[0,0,0],[0,-45,0],[0,-90,0],[20,-90,0]], [0, 100, 0]);
  // Placa pegada al CODO de abajo, a 90 cm del origen de la viga.
  const pl = caja("Placa al pie", 20, 6, 20, [10, 7, 0]);
  const hueco = r2(ed.separacionEntre(v, pl));
  const rep = ed.soldarPiezas([v.id, pl.id]);
  const j = ed.listJoints().find((x) => x.locked);
  return { hueco, soldaduras: rep.soldaduras, anclaY: j ? r2(j.anchor.y) : null };
})()`);
ok(centrado.hueco < 1,
  `la viga y la placa se miden EN CONTACTO, que es como están (${centrado.hueco} cm; `
  + `negativo = se interpenetran). Con la caja en el origen de la viga salían a 37 cm.`);
ok(centrado.soldaduras === 1,
  `y se sueldan (${centrado.soldaduras} soldadura)`);
ok(centrado.anclaY !== null && Math.abs(centrado.anclaY - 10) < 8,
  `con la soldadura junto al ACERO de abajo (y = ${centrado.anclaY}), no junto al `
  + `origen de la viga (y = 100)`);

// ── 2. UNA VIGA DOBLADA NO ES SU ENVOLVENTE ───────────────────────────────
//
// Dos vigas en L encaradas: sus envolventes se solapan de lleno, pero su acero
// corre por lados opuestos del hueco y no se toca. Medir por la envolvente las
// daba soldadas.
console.log("\n── El hueco del codo no es acero ───────────────────────────");
const codo = await p.evaluate(`(() => {
  ${PREPARA}
  limpia();
  // A: baja por x=0 de y=100 a 60, y sigue por y=60 hasta x=30.
  const A = viga("Ele A", [[0,0,0],[0,-20,0],[0,-40,0],[15,-40,0],[30,-40,0]], [0, 100, 0]);
  // B: la misma forma girada media vuelta, encajada en el mismo rectángulo.
  const B = viga("Ele B", [[0,0,0],[0,-20,0],[0,-40,0],[15,-40,0],[30,-40,0]], [40, 50, 0], Math.PI);
  const cajaDe = (o) => {
    const bb = new T.Box3().setFromObject(o.mesh);
    return { min: [r2(bb.min.x), r2(bb.min.y)], max: [r2(bb.max.x), r2(bb.max.y)] };
  };
  const solapan = (() => {
    const a = new T.Box3().setFromObject(A.mesh), b = new T.Box3().setFromObject(B.mesh);
    return a.intersectsBox(b);
  })();
  const hueco = r2(ed.separacionEntre(A, B));
  const rep = ed.soldarPiezas([A.id, B.id]);
  return { solapan, hueco, soldaduras: rep.soldaduras, sueltas: rep.sueltas.length,
           cajaA: cajaDe(A), cajaB: cajaDe(B) };
})()`);
ok(codo.solapan,
  `las dos envolventes se solapan de lleno (A ${JSON.stringify(codo.cajaA.min)}–`
  + `${JSON.stringify(codo.cajaA.max)}, B ${JSON.stringify(codo.cajaB.min)}–${JSON.stringify(codo.cajaB.max)})`);
ok(codo.hueco > 2,
  `pero el ACERO no se toca: quedan ${codo.hueco} cm de aire entre las dos formas`);
ok(codo.soldaduras === 0 && codo.sueltas === 2,
  `así que no se suelda nada y las dos se declaran sueltas (${codo.soldaduras} soldaduras, `
  + `${codo.sueltas} sueltas)`);

// ── 3. LA GUÍA SOBREVIVE AL SOLDADO ───────────────────────────────────────
//
// Un carro enhebrado en dos guías, soldado además a una ménsula. Al simular
// tiene que seguir corriendo por sus barras, sin desviarse ni un centímetro.
console.log("\n── El carro soldado sigue en su guía ───────────────────────");
const guiado = await p.evaluate(`(async () => {
  ${PREPARA}
  const tender = (x) => {
    const g = ed.addComponent("guia-tubular");
    g.params = { ...g.params, height: 160, radiusTop: 1.5, radiusBottom: 1.5 };
    g.rebuildGeometry();
    g.mesh.position.set(x, 90, 0);
    g.physics = { massKg: 0, fixed: true };
    g.mesh.updateMatrixWorld(true);
    return g;
  };
  const correr = async (soldar) => {
    limpia();
    const gA = tender(-30), gB = tender(30);
    const carro = caja("Carro", 80, 10, 24, [0, 140, 0]);
    ed.administrarVinculacion(gA.id, true);
    ed.administrarVinculacion(gB.id, true);
    ed.select(carro);
    const canales = (carro.params.canales ?? []).length;
    ed.terminarAdministracion();
    // Una ménsula pegada al carro, para soldarla con él.
    const mens = caja("Ménsula", 12, 10, 24, [46, 140, 0]);
    if (soldar) ed.soldarPiezas([carro.id, mens.id]);
    const p0 = carro.mesh.position.clone();
    await ed.toggleSimulation();
    for (let i = 0; i < 200 && !ed.physics; i++) await new Promise(r => setTimeout(r, 25));
    await new Promise(r => setTimeout(r, 200));
    const cuerpo = ed.physics.bodies.get(carro.id)?.body;
    const enGuia = (ed.physics.guias ?? []).some(g => g.body === cuerpo);
    for (let i = 0; i < 240; i++) ed.physics.step(1/60);
    const p1 = carro.mesh.position.clone();
    ed.stopSimulation();
    await new Promise(r => setTimeout(r, 250));
    const d = p1.clone().sub(p0);
    return { canales, enGuia, baja: r2(p0.y - p1.y),
             lateral: r2(Math.hypot(d.x, d.z)) };
  };
  return { suelto: await correr(false), soldado: await correr(true) };
})()`);
ok(guiado.suelto.canales === 2 && guiado.soldado.canales === 2,
  `el carro se enhebra en las dos guías (${guiado.soldado.canales} canales)`);
ok(guiado.suelto.enGuia,
  "suelto, el motor lo reconoce circunscrito a sus barras");
ok(guiado.soldado.enGuia,
  "y SOLDADO también — que es lo que se perdía al fundirse en el conjunto");
ok(guiado.soldado.baja > 10 && guiado.soldado.lateral < 0.5,
  `soldado, baja por la guía (${guiado.soldado.baja} cm) sin desviarse `
  + `(${guiado.soldado.lateral} cm de lado)`);

// ── 4. LA FÍSICA NO SE PIERDE AL AGRUPAR ──────────────────────────────────
console.log("\n── Física del conjunto en el panel ─────────────────────────");
await p.evaluate(`(() => {
  ${PREPARA}
  limpia();
  const g = ed.addComponent("guia-tubular");
  g.params = { ...g.params, height: 160 }; g.rebuildGeometry();
  g.mesh.position.set(0, 90, 0); g.physics = { massKg: 0, fixed: true };
  g.mesh.updateMatrixWorld(true);
  const carro = caja("Carro", 60, 10, 24, [0, 140, 0]);
  ed.administrarVinculacion(g.id, true);
  ed.select(carro);
  ed.terminarAdministracion();
  // Se marca FIJO: es el estado que rompe la guía y que había que poder ver.
  carro.physics = { massKg: 0, fixed: true };
  const mens = caja("Ménsula", 12, 10, 24, [36, 140, 0]);
  const gid = ed.createGroupFromIds([carro.id, mens.id]);
  ed.selectGroup(gid);
})()`);
await p.waitForTimeout(600);
const panel = await p.evaluate(() => {
  const t = document.getElementById("inspector")?.textContent ?? "";
  const masa = [...document.querySelectorAll("#inspector input[type=number]")].length;
  const fija = [...document.querySelectorAll("#inspector input[type=checkbox]")]
    .find((n) => (n.parentElement?.textContent ?? "").includes("Fijas"));
  return {
    hayFisica: t.includes("Física del conjunto"),
    avisa: /enhebrada en guías/.test(t),
    nombraCarro: t.includes("Carro"),
    hayFija: !!fija,
    masa,
  };
});
ok(panel.hayFisica && panel.hayFija,
  `con el grupo seleccionado, el panel trae «Física del conjunto» con su masa y `
  + `su casilla de fijas (fisica: ${panel.hayFisica}, casilla: ${panel.hayFija})`);
ok(panel.avisa && panel.nombraCarro,
  "y avisa por su nombre de la pieza enhebrada que quedó marcada como FIJA");

const desfija = await p.evaluate(async () => {
  const ed = window.exersuite.editor;
  const fija = [...document.querySelectorAll("#inspector input[type=checkbox]")]
    .find((n) => (n.parentElement?.textContent ?? "").includes("Fijas"));
  fija.checked = false;
  fija.dispatchEvent(new Event("change"));
  await new Promise((r) => setTimeout(r, 300));
  const carro = ed.listObjects().find((o) => o.name === "Carro");
  return { fijo: carro.physics.fixed,
           avisa: /enhebrada en guías/.test(document.getElementById("inspector")?.textContent ?? "") };
});
ok(!desfija.fijo && !desfija.avisa,
  `y desde ahí se le quita «Fija» sin desagrupar la máquina (fijo: ${desfija.fijo})`);

await p.evaluate(() => window.exersuite.editor.setViewPreset?.("isometrica"));
await p.waitForTimeout(700);
await p.screenshot({ path: "salidas/soldar-forma.png" });

for (const e of errores) console.log("PAGEERROR " + e);
console.log(fallos.length === 0 && errores.length === 0
  ? "\nTODO OK" : `\n${fallos.length} fallos, ${errores.length} errores de página`);
await browser.close();
process.exit(fallos.length === 0 && errores.length === 0 ? 0 : 1);
