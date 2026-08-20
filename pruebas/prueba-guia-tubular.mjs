// v0.3.3 · MECANISMOS DE GUÍA TUBULAR.
//
// El diseñador pidió poder armar una Smith, una prensa de piernas o un hack
// squat. Todas son la misma máquina por dentro: dos barras cromadas tendidas
// entre los travesaños de un bastidor, un CARRO enhebrado en ellas que solo
// puede correr por su recta, topes que acotan ese recorrido y pines de
// seguridad metidos en los agujeros del pilar.
//
// Esta prueba arma justamente eso —con las guías INCLINADAS, como en una
// prensa de verdad— y comprueba las cinco cosas que lo hacen funcionar:
//
//   1. la guía se tiende entre dos anclajes y los sigue si el bastidor se mueve;
//   2. soltar el carro encima le abre un canal REDONDO por cada guía;
//   3. con la física corriendo, el carro baja POR LA RECTA de las guías y no
//      por la vertical, que es lo que distingue una prensa de un peso colgado;
//   4. un tope montado en las guías lo detiene antes;
//   5. y el safety pin calza en los pinholes del pilar.
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

// ── 0. LA PIEZA ESTÁ EN EL CATÁLOGO ────────────────────────────────────────
console.log("\n── En la paleta ────────────────────────────────────────────");
const enPaleta = await p.evaluate(() => {
  const t = [...document.querySelectorAll(".comp-btn")].map((n) => n.textContent.trim());
  return { guia: t.includes("Guía tubular"), tope: t.includes("Tope de guía"), pin: t.includes("Safety pin") };
});
ok(enPaleta.guia && enPaleta.tope && enPaleta.pin,
  `guía, tope y safety pin están en «Piezas disponibles» (${JSON.stringify(enPaleta)})`);

// ── 1. LA GUÍA SE TIENDE ENTRE DOS ANCLAJES ────────────────────────────────
//
// Se arma el bastidor de la prensa: dos travesaños, uno arriba-atrás y otro
// abajo-adelante, y entre ellos dos guías paralelas INCLINADAS ~45°.
console.log("\n── La guía, tendida entre sus dos anclajes ─────────────────");
const armado = await p.evaluate(() => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  for (const o of [...ed.listObjects()]) ed.removeObject(o);

  // Travesaños del bastidor (cajas ancladas), separados en alto y en fondo.
  const alto = ed.addComponent("prim-box");
  alto.params = { kind: "box", width: 90, height: 8, depth: 8 };
  alto.rebuildGeometry();
  alto.physics = { ...alto.physics, fixed: true, massKg: 0 };
  alto.mesh.position.set(0, 170, -60);

  const bajo = ed.addComponent("prim-box");
  bajo.params = { kind: "box", width: 90, height: 8, depth: 8 };
  bajo.rebuildGeometry();
  bajo.physics = { ...bajo.physics, fixed: true, massKg: 0 };
  bajo.mesh.position.set(0, 30, 60);

  // Dos guías paralelas, ancladas arriba y abajo (los mismos puntos que
  // elegiría la herramienta de dos toques, con su registro de anclajes).
  const guias = [];
  for (const x of [-30, 30]) {
    const g = ed.addComponent("guia-tubular");
    const a = new T.Vector3(x, 170, -60);
    const b = new T.Vector3(x, 30, 60);
    const dir = b.clone().sub(a);
    const L = dir.length();
    dir.divideScalar(L);
    g.params = { ...g.params, height: L };
    g.params.anclajes = {
      a: { obj: alto.id, local: [x - alto.mesh.position.x, 0, 0] },
      b: { obj: bajo.id, local: [x - bajo.mesh.position.x, 0, 0] },
    };
    g.rebuildGeometry();
    g.mesh.position.copy(a).add(b).multiplyScalar(0.5);
    g.mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir);
    g.mesh.updateMatrixWorld(true);
    guias.push(g);
  }
  ed.select(null);
  return {
    largo: +guias[0].params.height.toFixed(1),
    // Inclinación de la guía respecto de la vertical (grados).
    inclina: +(
      Math.acos(Math.abs(new T.Vector3(0, 1, 0).applyQuaternion(guias[0].mesh.quaternion).y))
      * 180 / Math.PI
    ).toFixed(1),
    ids: { alto: alto.id, bajo: bajo.id, g0: guias[0].id, g1: guias[1].id },
  };
});
ok(armado.largo > 150 && armado.largo < 210,
  `la guía nace con el largo que dan sus dos puntos (${armado.largo} cm)`);
ok(armado.inclina > 30 && armado.inclina < 60,
  `y con la inclinación de la prensa, no vertical (${armado.inclina}° respecto de la vertical)`);

// El bastidor se mueve: la guía tiene que ir con él.
const seguimiento = await p.evaluate((ids) => {
  const ed = window.exersuite.editor;
  const g = ed.objects.get(ids.g0);
  const antes = g.mesh.position.clone();
  const alto = ed.objects.get(ids.alto);
  alto.mesh.position.x += 20;
  alto.mesh.updateMatrixWorld(true);
  ed.bus.emit("objectTransformed", { object: alto });
  const despues = g.mesh.position.clone();
  return { dx: +(despues.x - antes.x).toFixed(2), largo: +g.params.height.toFixed(1) };
}, armado.ids);
ok(Math.abs(seguimiento.dx - 10) < 0.5,
  `al mover el travesaño de arriba 20 cm, la guía se vuelve a tender y su centro `
  + `viaja la mitad (${seguimiento.dx} cm)`);
// Se deshace el movimiento para seguir con el bastidor recto.
await p.evaluate((ids) => {
  const ed = window.exersuite.editor;
  const alto = ed.objects.get(ids.alto);
  alto.mesh.position.x -= 20;
  alto.mesh.updateMatrixWorld(true);
  ed.bus.emit("objectTransformed", { object: alto });
}, armado.ids);

// ── 2. EL CARRO SE ENHEBRA: UN CANAL POR GUÍA ──────────────────────────────
console.log("\n── El carro, enhebrado en las dos guías ────────────────────");
const enhebrado = await p.evaluate((ids) => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  const g0 = ed.objects.get(ids.g0);
  const g1 = ed.objects.get(ids.g1);
  const eje = new T.Vector3(0, 1, 0).applyQuaternion(g0.mesh.quaternion).normalize();

  // Carro: una plancha puesta a escuadra con las guías, a media altura.
  const carro = ed.addComponent("prim-box");
  carro.params = { kind: "box", width: 84, height: 10, depth: 46 };
  carro.rebuildGeometry();
  carro.physics = { ...carro.physics, fixed: false, massKg: 40 };
  // Se orienta con su eje Y a lo largo de las guías y se centra en su recta.
  carro.mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), eje);
  // Centrado ENTRE las dos guías: es donde va el carro de una prensa.
  carro.mesh.position.copy(g0.mesh.position).add(g1.mesh.position).multiplyScalar(0.5);
  carro.mesh.updateMatrixWorld(true);
  const antes = carro.mesh.geometry.getAttribute("position").count;
  const n = ed.vincularAGuias(carro);
  const despues = carro.mesh.geometry.getAttribute("position").count;
  ed.select(null);
  return {
    n,
    canales: (carro.params.canales ?? []).map((c) => ({
      eje: c.eje, u: +c.u.toFixed(1), v: +c.v.toFixed(1), r: +c.radio.toFixed(2),
    })),
    antes, despues,
    id: carro.id,
  };
}, armado.ids);
ok(enhebrado.n === 2,
  `se abren DOS canales, uno por guía (${enhebrado.n})`);
ok(enhebrado.canales.every((c) => c.eje === "y"),
  `los dos van por el eje del carro, no por la vertical del mundo `
  + `(${enhebrado.canales.map((c) => c.eje).join(", ")})`);
ok(enhebrado.canales.length === 2
  && Math.abs(Math.abs(enhebrado.canales[0].v - enhebrado.canales[1].v) - 60) < 2,
  `y separados los 60 cm que separan las guías `
  + `(${enhebrado.canales.map((c) => c.v).join(" / ")})`);
ok(enhebrado.canales.every((c) => Math.abs(c.r - 1.85) < 0.01),
  `con el radio del tubo más la holgura de deslizamiento (${enhebrado.canales[0]?.r} cm)`);
ok(enhebrado.despues > enhebrado.antes,
  `la malla del carro CAMBIA: los canales están calados de verdad `
  + `(${enhebrado.antes} → ${enhebrado.despues} vértices)`);

// ── 3. Y CORRE POR LA RECTA DE LAS GUÍAS ───────────────────────────────────
//
// Lo que separa una prensa de un peso colgado: al soltarlo, el carro no cae
// en vertical — baja SIGUIENDO las guías, avanzando también en profundidad.
console.log("\n── En la simulación: baja por la recta, no en vertical ─────");
const caida = await p.evaluate(async (id) => {
  const ed = window.exersuite.editor;
  const carro = ed.objects.get(id);
  const p0 = carro.mesh.position.clone();
  await ed.toggleSimulation();
  await new Promise((r) => setTimeout(r, 4000));
  const p1 = carro.mesh.position.clone();
  ed.stopSimulation();
  await new Promise((r) => setTimeout(r, 600));
  return {
    dy: +(p1.y - p0.y).toFixed(1),
    dz: +(p1.z - p0.z).toFixed(1),
    dx: +(p1.x - p0.x).toFixed(2),
  };
}, enhebrado.id);
ok(caida.dy < -8, `el carro BAJA al soltarlo (${caida.dy} cm en Y)`);
ok(caida.dz > 5,
  `y avanza en profundidad a la vez: va por la recta inclinada, no por la `
  + `vertical (${caida.dz} cm en Z)`);
ok(Math.abs(caida.dx) < 1.5,
  `sin deriva lateral: la guía lo tiene circunscrito (${caida.dx} cm en X)`);

// ── 4. UN TOPE MONTADO EN LA GUÍA LO DETIENE ANTES ─────────────────────────
console.log("\n── El tope acota el recorrido ──────────────────────────────");
const conTope = await p.evaluate(async (ctx) => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  const carro = ed.objects.get(ctx.carro);
  const g0 = ed.objects.get(ctx.g0);
  const g1 = ed.objects.get(ctx.g1);
  const eje = new T.Vector3(0, 1, 0).applyQuaternion(g0.mesh.quaternion).normalize();
  // El carro vuelve arriba, al centro de las guías, para medir desde ahí.
  carro.mesh.position.copy(g0.mesh.position).add(g1.mesh.position).multiplyScalar(0.5);
  carro.mesh.updateMatrixWorld(true);
  // Un tope en cada guía, 25 cm por debajo del carro sobre su misma recta. El
  // centro de cada tope se proyecta desde el carro a la recta de SU guía.
  const montados = [];
  for (const g of [g0, g1]) {
    const t = ed.addComponent("tope-guia");
    // `eje` es el +Y de la guía, y las guías se tendieron de arriba abajo: el
    // tope que frena la BAJADA va 25 cm más allá del carro en ese sentido.
    const sCarro = carro.mesh.position.clone().sub(g.mesh.position).dot(eje);
    t.mesh.position.copy(g.mesh.position).addScaledVector(eje, sCarro + 25);
    t.mesh.updateMatrixWorld(true);
    // Se suelta cerca de la guía: `vincularAGuias` lo monta coaxial en ella.
    const antes = t.mesh.position.clone();
    ed.vincularAGuias(t);
    const alineado = Math.abs(
      new T.Vector3(0, 1, 0).applyQuaternion(t.mesh.quaternion).dot(eje),
    );
    montados.push({ movido: +t.mesh.position.distanceTo(antes).toFixed(2), alineado: +alineado.toFixed(3) });
  }
  const p0 = carro.mesh.position.clone();
  await ed.toggleSimulation();
  await new Promise((r) => setTimeout(r, 3000));
  const recorrido = +carro.mesh.position.distanceTo(p0).toFixed(1);
  ed.stopSimulation();
  await new Promise((r) => setTimeout(r, 600));
  return { montados, recorrido };
}, { carro: enhebrado.id, g0: armado.ids.g0, g1: armado.ids.g1 });
ok(conTope.montados.every((m) => m.alineado > 0.99),
  `el tope se monta COAXIAL con la guía al soltarlo cerca `
  + `(${conTope.montados.map((m) => m.alineado).join(", ")})`);
ok(conTope.recorrido < 30,
  `y el carro se detiene en él en vez de llegar abajo (${conTope.recorrido} cm de recorrido)`);

// ── 5. EL SAFETY PIN CALZA EN UN PINHOLE ───────────────────────────────────
console.log("\n── El safety pin, metido en su agujero ─────────────────────");
const pin = await p.evaluate(() => {
  const ed = window.exersuite.editor;
  for (const o of [...ed.listObjects()]) ed.removeObject(o);
  // Un montante perforado de verdad y un pin soltado a su lado.
  const poste = ed.addComponent("montante-ttp");
  poste.mesh.position.set(0, 102, 0);
  poste.mesh.updateMatrixWorld(true);
  const pin = ed.addComponent("safety-pin");
  pin.mesh.position.set(9, 120, 0);
  pin.mesh.updateMatrixWorld(true);
  const antes = pin.mesh.position.clone();
  const aviso = ed.calcePorAgujero(pin.id, 1);
  const despues = pin.mesh.position.clone();
  return {
    aviso,
    // Distancia LATERAL al eje del poste: si calzó, el pin quedó atravesándolo.
    lateral: +Math.hypot(despues.x - 0, despues.z - 0).toFixed(2),
    subioO: +(despues.y - antes.y).toFixed(2),
    y: +despues.y.toFixed(1),
  };
});
ok(pin.aviso === null, `el pin calza en la grilla del montante (${pin.aviso ?? "sin aviso"})`);
ok(pin.lateral < 6,
  `y queda metido en el poste, no flotando al lado (${pin.lateral} cm del eje)`);

for (const e of errores) console.log("PAGEERROR " + e);
console.log(fallos.length === 0 && errores.length === 0
  ? "\nTODO OK" : `\n${fallos.length} fallos, ${errores.length} errores de página`);
await browser.close();
process.exit(fallos.length === 0 && errores.length === 0 ? 0 : 1);
