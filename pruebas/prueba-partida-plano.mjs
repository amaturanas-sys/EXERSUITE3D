// v0.2.95 · UNA PARTIDA NUNCA VIAJA SIN SU PLANO.
//
// La partida es una condición de ensayo puesta ENCIMA del plano fabricable, así
// que las dos cosas van juntas: sin saber a qué se vuelve, `conElDiseno` no
// tiene adónde reponer y todo lo que lee las mallas se envenena — arrancar la
// simulación guarda la pose como si fuera el plano, quitar el maniquí no repone
// nada y la máquina se queda clavada en su pose ergonómica, y guardar el
// proyecto escribe la pose en vez del fabricable.
//
// Había tres puertas que ponían la partida sin su plano: ABRIR un proyecto que
// la trae, APLICAR un punto de partida guardado y FIJARLA con el gesto parado
// (ahí el estado de diseño guardado está vacío). Aquí se pasa por las tres.
//
// Y de propina, la cuarta: DESHACER recarga el proyecto entero, así que un ↶
// después de congelar pasaba por la primera puerta sin que nadie lo pidiera.
import { chromium } from "playwright-core";

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
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

await p.evaluate(async () => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  ed.insertarMaquina("uppermachine", new T.Vector3(0, 0, 0));
  await new Promise((r) => setTimeout(r, 1800));
  await ed.addHumanFigure();
  await new Promise((r) => setTimeout(r, 800));
  window.__retrato = () => Object.fromEntries(
    ed.listObjects().map((o) => [o.id, o.mesh.position.toArray().map((v) => +v.toFixed(2))]),
  );
  window.__deriva = (a, b) => {
    let peor = 0, quien = null;
    for (const id of Object.keys(a)) {
      if (!b[id]) continue;
      const d = Math.hypot(b[id][0] - a[id][0], b[id][1] - a[id][1], b[id][2] - a[id][2]);
      if (d > peor) { peor = d; quien = id; }
    }
    return { peor: +peor.toFixed(2), quien };
  };
  // Deja la máquina posada y congelada, como quien prepara el fotograma inicial.
  window.__congelar = async () => {
    await ed.iniciarPoseMaquina();
    const movil = ed.listObjects().find((o) => !o.physics.fixed && /brazo|jammer|palanca/i.test(o.name))
      ?? ed.listObjects().find((o) => !o.physics.fixed);
    const p0 = movil.mesh.position.clone();
    ed.physics.grab(movil.id, p0.clone());
    for (let i = 0; i < 45; i++) {
      ed.physics.dragTo(p0.clone().add(new T.Vector3(0, -Math.min(i * 0.4, 14), Math.min(i * 0.3, 10))));
      ed.physics.step(1 / 60);
    }
    ed.physics.release?.();
    for (let i = 0; i < 30; i++) ed.physics.step(1 / 60);
    const n = ed.terminarPoseMaquina().piezas;
    await new Promise((r) => setTimeout(r, 600));
    return n;
  };
});

const base = await p.evaluate(async () => {
  const ed = window.exersuite.editor;
  const diseno = window.__retrato();
  const congeladas = await window.__congelar();
  return { diseno, congeladas, partida: window.__retrato(),
    proyecto: JSON.parse(JSON.stringify(ed.serialize())) };
});
ok(base.congeladas > 0, `se congela una partida de ${base.congeladas} pieza(s)`);
ok(await p.evaluate(([a, b]) => window.__deriva(a, b).peor, [base.diseno, base.partida]) > 1,
  "y la máquina se queda a la vista en ella");

// ── 1. ABRIR un proyecto que trae partida ─────────────────────────────────
// El fichero guarda el PLANO en `objects` y la partida aparte, en `startParts`.
// Al cargarlo las mallas nacen en el plano: ese es el momento de apuntarlo.
const abrir = await p.evaluate(async ([diseno, partida, proyecto]) => {
  const ed = window.exersuite.editor;
  await ed.loadProject(proyecto);
  await new Promise((r) => setTimeout(r, 1500));
  const traeMani = ed.hasHumanFigure();
  const conFigura = window.__deriva(partida, window.__retrato());
  ed.toggleHumanFigure();               // se quita el maniquí
  await new Promise((r) => setTimeout(r, 700));
  const sinFigura = window.__deriva(diseno, window.__retrato());
  await ed.toggleHumanFigure();         // y vuelve
  await new Promise((r) => setTimeout(r, 1000));
  return { traeMani, conFigura, sinFigura,
    guardado: ed.serialize().objects.map((o) => [o.id, o.position]) };
}, [base.diseno, base.partida, base.proyecto]);
ok(abrir.traeMani, "el proyecto abierto trae su maniquí");
ok(abrir.conFigura.peor < 0.5,
  `abierto con maniquí, la máquina se ve en su partida (${abrir.conFigura.peor} cm)`);
ok(abrir.sinFigura.peor < 0.5,
  `y quitándolo vuelve a su PLANO (${abrir.sinFigura.peor} cm) — el fallo era quedarse clavada`);

// Volver a guardar tiene que devolver el mismo plano, no la pose.
const guardado = await p.evaluate(([diseno, pares]) => {
  let peor = 0;
  for (const [id, pos] of pares) {
    const d = diseno[id];
    if (!d) continue;
    peor = Math.max(peor, Math.hypot(pos[0] - d[0], pos[1] - d[1], pos[2] - d[2]));
  }
  return +peor.toFixed(2);
}, [base.diseno, abrir.guardado]);
ok(guardado < 0.5, `y re-guardarlo escribe el PLANO, no la pose (${guardado} cm)`);

// ── 2. SIMULAR Y PARAR sobre el proyecto recién abierto ───────────────────
// Sin plano al que volver, `saved` se llenaba con la pose y al parar la
// restauraba encima del diseño: la máquina quedaba rota para siempre.
const sim = await p.evaluate(async ([diseno, partida]) => {
  const ed = window.exersuite.editor;
  ed.startSimulation();
  for (let i = 0; i < 150 && !ed.physics; i++) await new Promise((x) => setTimeout(x, 20));
  await new Promise((x) => setTimeout(x, 2000));
  ed.stopSimulation();
  await new Promise((x) => setTimeout(x, 1200));
  const trasParar = window.__deriva(partida, window.__retrato());
  ed.soltarPartidaMaquina();
  await new Promise((x) => setTimeout(x, 600));
  return { trasParar, trasSoltar: window.__deriva(diseno, window.__retrato()) };
}, [base.diseno, base.partida]);
ok(sim.trasParar.peor < 1,
  `parar devuelve la máquina a su partida, entera (${sim.trasParar.peor} cm)`);
ok(sim.trasSoltar.peor < 0.5,
  `y soltar la partida deja EL PLANO intacto (${sim.trasSoltar.peor} cm)`);

// ── 3. FIJAR LA PARTIDA CON LA SIMULACIÓN EN MARCHA ───────────────────────
// 📌 se usa con el gesto corriendo: se lleva el conjunto móvil hasta el punto
// que interesa y se clava ahí. También tiene que apuntar el plano, o quitar el
// maniquí después deja la máquina clavada en la pose.
const fijar = await p.evaluate(async ([diseno]) => {
  const ed = window.exersuite.editor;
  const total = ed.listObjects().length;
  ed.startSimulation();
  for (let i = 0; i < 150 && !ed.physics; i++) await new Promise((x) => setTimeout(x, 20));
  await new Promise((x) => setTimeout(x, 1500));
  const r = ed.fijarPartida();
  ed.stopSimulation();
  await new Promise((x) => setTimeout(x, 1000));
  ed.toggleHumanFigure();               // se quita el maniquí
  await new Promise((x) => setTimeout(x, 700));
  const sinFigura = window.__deriva(diseno, window.__retrato());
  await ed.toggleHumanFigure();
  await new Promise((x) => setTimeout(x, 1000));
  return { total, piezas: r.piezas, sinFigura };
}, [base.diseno]);
ok(fijar.piezas < fijar.total,
  `fijar en marcha congela SOLO lo que se movió (${fijar.piezas} de ${fijar.total} piezas)`);
ok(fijar.sinFigura.peor < 0.5,
  `y quitando el maniquí la máquina vuelve al PLANO (${fijar.sinFigura.peor} cm)`);

// ── 4. DESHACER después de congelar ───────────────────────────────────────
// ↶ recarga el proyecto entero, así que pasa por la puerta de «abrir».
const deshacer = await p.evaluate(async () => {
  const ed = window.exersuite.editor;
  ed.soltarPartidaMaquina();
  await new Promise((x) => setTimeout(x, 400));
  const plano = window.__retrato();
  await window.__congelar();
  ed.undo();
  await new Promise((x) => setTimeout(x, 1500));
  const tras = window.__deriva(plano, window.__retrato());
  return { tras, sano: ed.listObjects().length > 0 };
});
ok(deshacer.sano, "deshacer no deja la escena vacía");
ok(deshacer.tras.peor < 60,
  `y no dispersa las piezas (la que más se va, ${deshacer.tras.peor} cm)`);

for (const e of errores) console.log("PAGEERROR " + e);
console.log(fallos.length === 0 && errores.length === 0
  ? "\nTODO OK" : `\n${fallos.length} fallos, ${errores.length} errores de página`);
await browser.close();
process.exit(fallos.length === 0 && errores.length === 0 ? 0 : 1);
