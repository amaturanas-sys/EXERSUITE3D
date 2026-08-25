// v0.3.9 · LA HERRAMIENTA SOLDAR.
//
// Agrupar deja un subensamblaje que se mueve junto EN EL EDITOR, pero al simular
// sus piezas siguen siendo cuerpos sueltos: un brazo compuesto de cinco tubos
// agrupados se desarma en el primer fotograma. Para que aguantara había que ir a
// Conexiones y crear a mano una unión bloqueada por cada pareja que se toca —
// que es justo lo que el imán de nodos hace de una en una.
//
// SOLDAR hace las dos cosas de un gesto: agrupa como «Agrupar» y además suelda
// cada pareja del conjunto que se toca, en su punto de contacto. La física
// reconoce esas uniones bloqueadas y funde el conjunto en UN SOLO CUERPO.
//
// Aquí se comprueba con un brazo en L de cuatro tubos: que las soldaduras salen
// donde las piezas se tocan (y solo ahí), que el conjunto cae ENTERO sin
// deformarse, y que agrupar a secas NO consigue eso.
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

// Un brazo en L colgado en el aire, hecho de cuatro tubos que se tocan en
// cadena: A—B—C—D. A y D NO se tocan entre sí, así que la cadena tiene que dar
// exactamente TRES soldaduras, no seis.
const PREPARA = `
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  const limpia = () => { for (const o of [...ed.listObjects()]) ed.removeObject(o); ed.select(null); };
  const tubo = (nombre, w, h, d, pos, masa) => {
    const o = ed.addComponent("prim-box");
    o.name = nombre;
    o.params = { kind: "box", width: w, height: h, depth: d };
    o.rebuildGeometry();
    o.mesh.position.set(pos[0], pos[1], pos[2]);
    o.physics = { massKg: masa, fixed: masa === 0 };
    o.mesh.updateMatrixWorld(true);
    ed.bus.emit("objectTransformed", { object: o });
    return o;
  };
  // Brazo en L: tres tramos horizontales en fila y uno vertical al final.
  const armar = () => {
    limpia();
    const A = tubo("Tramo A", 40, 6, 6, [   0, 120, 0], 5);
    const B = tubo("Tramo B", 40, 6, 6, [  40, 120, 0], 5);
    const C = tubo("Tramo C", 40, 6, 6, [  80, 120, 0], 5);
    const D = tubo("Codo D",   6, 40, 6, [ 103, 100, 0], 5);  // baja desde el final de C
    return [A, B, C, D];
  };
  const seleccionar = (ps) => { ed.select(null); for (const o of ps) ed.toggleMulti(o); };
  const soldaduras = () => ed.listJoints().filter((j) => j.locked);
  const r2 = (v) => +v.toFixed(2);
`;

// ── 1. QUÉ SUELDA Y DÓNDE ─────────────────────────────────────────────────
console.log("\n── Qué suelda y dónde ──────────────────────────────────────");
const sold = await p.evaluate(`(() => {
  ${PREPARA}
  const [A, B, C, D] = armar();
  seleccionar([A, B, C, D]);
  const rep = ed.soldarPiezas([A.id, B.id, C.id, D.id]);
  const js = soldaduras();
  const par = (x, y) => js.find((j) =>
    (j.bodyAId === x.id && j.bodyBId === y.id) || (j.bodyAId === y.id && j.bodyBId === x.id));
  const ad = par(A, D);
  return {
    rep,
    total: js.length,
    // Las tres que TIENEN que existir, con su punto.
    ab: par(A, B) ? r2(par(A, B).anchor.x) : null,
    bc: par(B, C) ? r2(par(B, C).anchor.x) : null,
    cd: par(C, D) ? { x: r2(par(C, D).anchor.x), y: r2(par(C, D).anchor.y) } : null,
    // A y D están a 83 cm: no deben soldarse.
    hayAD: !!ad,
    bloqueadas: js.every((j) => j.locked),
    nombres: js.map((j) => j.name).every((n) => /Soldadura/.test(n)),
    tieneGrupo: !!rep.grupo,
  };
})()`);
ok(sold.rep.soldaduras === 3 && sold.total === 3,
  `una cadena de cuatro tubos da TRES soldaduras, no seis (${sold.rep.soldaduras})`);
ok(!sold.hayAD,
  "las dos puntas de la cadena no se sueldan entre sí: no se tocan");
ok(Math.abs(sold.ab - 20) < 0.6 && Math.abs(sold.bc - 60) < 0.6,
  `y cada soldadura cae donde las piezas se ROZAN (x = ${sold.ab} y ${sold.bc}; `
  + `los tubos se encuentran en 20 y 60)`);
// El codo muere contra el canto del tramo C: se tocan en el plano x = 100, y la
// franja compartida va de y = 117 a y = 120. La soldadura tiene que caer en el
// MEDIO de esa franja (118,5), no en su arista de abajo.
ok(sold.cd && Math.abs(sold.cd.x - 100) < 0.3 && Math.abs(sold.cd.y - 118.5) < 0.3,
  `y en el codo cae en el MEDIO de la franja que comparten, no en su esquina `
  + `(${sold.cd?.x}, ${sold.cd?.y}; se esperaba 100 y 118,5)`);
ok(sold.bloqueadas && sold.nombres,
  "son uniones BLOQUEADAS y se llaman «Soldadura»: se ven y se editan en Conexiones");
ok(sold.tieneGrupo, "y el conjunto queda AGRUPADO, como con «Agrupar»");
ok(sold.rep.piezas === 4 && sold.rep.sueltas.length === 0,
  `el parte dice qué pasó: ${sold.rep.piezas} piezas, ${sold.rep.sueltas.length} sueltas`);

// ── 2. AGRUPA, COMO PIDIÓ EL DISEÑADOR ────────────────────────────────────
console.log("\n── Agrupa, además de soldar ────────────────────────────────");
const grupo = await p.evaluate(() => {
  const ed = window.exersuite.editor;
  const gs = [...ed.groups.values()];
  return {
    cuantos: gs.length,
    nombre: gs[0]?.name ?? null,
    miembros: gs[0]?.ids.length ?? 0,
  };
});
ok(grupo.cuantos === 1 && grupo.miembros === 4,
  `las cuatro piezas quedan en UN grupo, como con «Agrupar» (${grupo.miembros} miembros)`);
ok(grupo.nombre === "Conjunto soldado",
  `y el grupo se llama por lo que es: «${grupo.nombre}»`);

// ── 3. LO QUE AGRUPAR NO PODÍA: AGUANTAR LA SIMULACIÓN ────────────────────
//
// Dos medidas distintas, porque la caída libre sola NO distingue: cuatro cuerpos
// sueltos caen a la vez y llegan al suelo en formación. Lo que separa un
// conjunto soldado de uno agrupado es TRANSMITIR ESFUERZO.
console.log("\n── El conjunto cae ENTERO ──────────────────────────────────");
const caida = await p.evaluate(`(async () => {
  ${PREPARA}
  const dist = (x, y) => +x.mesh.position.distanceTo(y.mesh.position).toFixed(2);
  const simular = async (pasos) => {
    await ed.toggleSimulation();
    for (let i = 0; i < 200 && !ed.physics; i++) await new Promise((r) => setTimeout(r, 25));
    await new Promise((r) => setTimeout(r, 200));
    for (let i = 0; i < pasos; i++) ed.physics.step(1 / 60);
  };
  const parar = async () => { ed.stopSimulation(); await new Promise((r) => setTimeout(r, 250)); };

  // (a) TODO MÓVIL: el brazo soldado cae entero y llega abajo SIN deformarse.
  const [A, B, C, D] = armar();
  ed.soldarPiezas([A.id, B.id, C.id, D.id]);
  const rig0 = { ad: dist(A, D), ab: dist(A, B), y: +A.mesh.position.y.toFixed(2) };
  await simular(240);
  const rig1 = { ad: dist(A, D), ab: dist(A, B), y: +A.mesh.position.y.toFixed(2) };
  await parar();

  // (b) EN VOLADIZO: el primer tramo FIJO y el resto en el aire. Aquí sí se ve
  //     la diferencia — soldado, el brazo se sostiene; agrupado, se cae a
  //     cachos porque un grupo no transmite nada.
  const voladizo = async (soldar) => {
    const [P, Q, R, S] = armar();
    P.physics = { massKg: 0, fixed: true };   // el tramo A, empotrado
    if (soldar) ed.soldarPiezas([P.id, Q.id, R.id, S.id]);
    else ed.createGroupFromIds([P.id, Q.id, R.id, S.id]);
    const antes = +S.mesh.position.y.toFixed(2);
    await simular(300);
    const despues = +S.mesh.position.y.toFixed(2);
    await parar();
    return { antes, despues, cayo: +(antes - despues).toFixed(2) };
  };
  const sold = await voladizo(true);
  const agrup = await voladizo(false);
  return {
    caida: { cayo: +(rig0.y - rig1.y).toFixed(2),
             deforma: +Math.abs(rig1.ad - rig0.ad).toFixed(2),
             deformaAB: +Math.abs(rig1.ab - rig0.ab).toFixed(2) },
    sold, agrup,
  };
})()`);
ok(caida.caida.cayo > 60,
  `todo móvil, el brazo soldado cae de verdad (${caida.caida.cayo} cm desde 120)`);
ok(caida.caida.deforma < 0.5 && caida.caida.deformaAB < 0.5,
  `y llega abajo SIN DEFORMARSE: la distancia entre sus puntas no cambia `
  + `(${caida.caida.deforma} cm) ni la de dos tramos vecinos (${caida.caida.deformaAB} cm)`);
ok(caida.sold.cayo < 1,
  `EN VOLADIZO con el primer tramo empotrado, el brazo soldado se SOSTIENE: `
  + `la punta no baja (${caida.sold.cayo} cm)`);
ok(caida.agrup.cayo > 40,
  `y solo agrupado se cae a cachos (${caida.agrup.cayo} cm) — un grupo no `
  + `transmite esfuerzo, y eso es exactamente lo que soldar viene a arreglar`);

// ── 4. LOS AVISOS QUE HACEN FALTA ─────────────────────────────────────────
console.log("\n── Los avisos ──────────────────────────────────────────────");
const avisos = await p.evaluate(`(() => {
  ${PREPARA}
  const out = {};

  // (a) Piezas que no tocan a nadie: hay que decirlo, o el usuario cree que fue.
  limpia();
  const X = tubo("Tramo X", 40, 6, 6, [0, 120, 0], 5);
  const Y = tubo("Tramo Y", 40, 6, 6, [40, 120, 0], 5);
  const Z = tubo("Perdido Z", 40, 6, 6, [0, 120, 90], 5);   // lejos de los otros
  const rSuelta = ed.soldarPiezas([X.id, Y.id, Z.id]);
  out.suelta = { n: rSuelta.soldaduras, sueltas: rSuelta.sueltas, aviso: rSuelta.aviso };

  // (b) Nada se toca: no se inventa ninguna soldadura.
  limpia();
  const P = tubo("Lejos P", 20, 6, 6, [-60, 120, 0], 5);
  const Q = tubo("Lejos Q", 20, 6, 6, [ 60, 120, 0], 5);
  const rNada = ed.soldarPiezas([P.id, Q.id]);
  out.nada = { n: rNada.soldaduras, aviso: rNada.aviso };

  // (c) Una pieza FIJA ancla el conjunto entero: hay que advertirlo.
  limpia();
  const F = tubo("Poste fijo", 8, 60, 8, [0, 30, 0], 0);
  const M = tubo("Brazo móvil", 40, 6, 6, [24, 58, 0], 5);
  const rFija = ed.soldarPiezas([F.id, M.id]);
  out.fija = { n: rFija.soldaduras, anclado: rFija.anclado, aviso: rFija.aviso };

  // (d) Soldar dos veces lo mismo no duplica uniones.
  const antes = ed.listJoints().length;
  ed.soldarPiezas([F.id, M.id]);
  out.repetida = ed.listJoints().length - antes;

  // (e) Con menos de dos piezas no hace nada y lo dice.
  out.una = ed.soldarPiezas([F.id]);
  return out;
})()`);
ok(avisos.suelta.n === 1 && avisos.suelta.sueltas.join() === "Perdido Z"
  && /SUELTAS/.test(avisos.suelta.aviso ?? ""),
  `una pieza que no toca a ninguna otra se NOMBRA en el aviso `
  + `(${avisos.suelta.sueltas.join(", ") || "ninguna"})`);
ok(avisos.nada.n === 0 && /Ninguna de las piezas se toca/.test(avisos.nada.aviso ?? ""),
  "si nada se toca, no se inventa ninguna soldadura y se explica por qué");
ok(avisos.fija.n === 1 && avisos.fija.anclado && /anclado/.test(avisos.fija.aviso ?? ""),
  "con una pieza FIJA en el conjunto se avisa de que quedará anclado al simular");
ok(avisos.repetida === 0,
  `soldar dos veces el mismo par no duplica la unión (${avisos.repetida} de más)`);
ok(avisos.una.soldaduras === 0 && /dos o más/.test(avisos.una.aviso ?? ""),
  "con una sola pieza no hace nada y lo dice");

// ── 5. ESTÁ EN EL MENÚ, JUNTO A AGRUPAR ───────────────────────────────────
console.log("\n── En el menú Edición ──────────────────────────────────────");
const menu = await p.evaluate(async () => {
  const ed = window.exersuite.editor;
  for (const o of [...ed.listObjects()]) ed.removeObject(o);
  ed.select(null);
  const mk = (n, x) => {
    const o = ed.addComponent("prim-box");
    o.name = n;
    o.params = { kind: "box", width: 40, height: 6, depth: 6 };
    o.rebuildGeometry();
    o.mesh.position.set(x, 120, 0);
    o.mesh.updateMatrixWorld(true);
    return o;
  };
  const a = mk("Uno", 0), b = mk("Dos", 40);
  ed.select(null); ed.toggleMulti(a); ed.toggleMulti(b);
  await new Promise((r) => setTimeout(r, 200));
  const edicion = [...document.querySelectorAll(".menu-btn, button")]
    .find((n) => (n.textContent ?? "").trim().startsWith("Edición"));
  edicion?.click();
  await new Promise((r) => setTimeout(r, 250));
  const items = [...document.querySelectorAll(".menu-item")].map((n) => (n.textContent ?? "").trim());
  const soldar = [...document.querySelectorAll(".menu-item")]
    .find((n) => (n.textContent ?? "").includes("Soldar"));
  const antes = ed.listJoints().filter((j) => j.locked).length;
  soldar?.click();
  await new Promise((r) => setTimeout(r, 400));
  return {
    items: items.filter((t) => /Agrupar|Soldar/.test(t)),
    habilitado: soldar ? !soldar.disabled : false,
    creadas: ed.listJoints().filter((j) => j.locked).length - antes,
  };
});
ok(menu.items.some((t) => /Soldar/.test(t)),
  `«Soldar» está en el menú Edición junto a Agrupar (${menu.items.join(" · ")})`);
ok(menu.habilitado && menu.creadas === 1,
  `y suelda de verdad al pulsarlo (${menu.creadas} soldadura)`);

// Captura del brazo soldado, ya caído.
await p.evaluate(`(() => {
  ${PREPARA}
  const [A, B, C, D] = armar();
  ed.soldarPiezas([A.id, B.id, C.id, D.id]);
  ed.select(null);
  ed.setViewPreset?.("isometrica");
  ed.requestRender();
})()`);
await p.waitForTimeout(900);
await p.screenshot({ path: "salidas/soldar.png" });

for (const e of errores) console.log("PAGEERROR " + e);
console.log(fallos.length === 0 && errores.length === 0
  ? "\nTODO OK" : `\n${fallos.length} fallos, ${errores.length} errores de página`);
await browser.close();
process.exit(fallos.length === 0 && errores.length === 0 ? 0 : 1);
