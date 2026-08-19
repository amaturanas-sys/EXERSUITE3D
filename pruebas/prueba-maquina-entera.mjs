// v0.2.92 · LA MÁQUINA NO SE DESARMA, y sigue entera al volver a construcción.
//
// Reproduce la secuencia EXACTA que el diseñador grabó en vídeo:
//   1. Coloca al maniquí sentado en la UpperMachine.
//   2. «▶ Manipular» y arrastra el brazo del press hasta la postura de inicio.
//   3. Sale del modo: la máquina queda congelada (n piezas).
//   4. Apoya las manos en los agarres.
//   5. «▶ Simular».
//   6. Para y vuelve a construcción.
//
// Lo que veía: al apoyar, las extremidades TIEMBLAN y no se asientan; al simular,
// los componentes SE DESARMAN; y al parar, la máquina queda ROTA para siempre, con
// las piezas disgregadas. Aquí se mide cada una de las tres cosas.
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
  // Retrato de la máquina: dónde está cada pieza. Es con lo que se compara.
  window.__retrato = () => Object.fromEntries(
    ed.listObjects().map((o) => [o.id, o.mesh.position.toArray().map((v) => +v.toFixed(2))]),
  );
  // Cuánto se ha movido la pieza que más se ha movido, entre dos retratos.
  window.__deriva = (a, b) => {
    let peor = 0, quien = null;
    for (const id of Object.keys(a)) {
      if (!b[id]) continue;
      const d = Math.hypot(b[id][0] - a[id][0], b[id][1] - a[id][1], b[id][2] - a[id][2]);
      if (d > peor) { peor = d; quien = id; }
    }
    return { peor: +peor.toFixed(2), quien };
  };
});

// ── 1. Sentar al maniquí y congelar la máquina en su postura de inicio ─────
const r = await p.evaluate(async () => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  const diseno = window.__retrato();

  // Sentado en el asiento de la máquina, con la herramienta real.
  const asiento = ed.listObjects().find((o) => /asiento/i.test(o.name));
  const caja = new T.Box3().setFromObject(asiento.mesh);
  await ed.colocarFiguraEn({ punto: caja.getCenter(new T.Vector3()), obj: asiento });
  await new Promise((x) => setTimeout(x, 600));

  // «▶ Manipular»: se arrastra un brazo móvil hasta la postura de inicio.
  await ed.iniciarPoseMaquina();
  const entra = ed.posandoMaquina();
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
  const congeladas = ed.terminarPoseMaquina().piezas;
  await new Promise((x) => setTimeout(x, 500));
  const trasCongelar = window.__retrato();
  return { entra, congeladas, diseno, trasCongelar,
    derivaAlCongelar: window.__deriva(diseno, trasCongelar) };
});
ok(r.entra, "se entra a posar la máquina con el maniquí sentado");
ok(r.congeladas > 0, `la partida congela lo que se movió (${r.congeladas} pieza(s))`);
// PARADO SE VE EL DISEÑO. La partida vive aparte; si se dibujara encima, el mundo
// físico se construiría desde ella y arrancaría mal armado.
ok(r.derivaAlCongelar.peor < 0.5,
  `al salir de posar, la máquina sigue en su plano (deriva ${r.derivaAlCongelar.peor} cm)`);

// ── 2. Apoyar las manos: la IK tiene que ASENTARSE, no temblar ─────────────
const t = await p.evaluate(async () => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  // Dos agarres: las piezas móviles más altas, que es donde se empuña.
  const agarres = ed.listObjects()
    .filter((o) => o.mesh.position.y > 80)
    .sort((a, b) => b.mesh.position.y - a.mesh.position.y)
    .slice(0, 2);
  ed.attachHand("L", agarres[0].id, new T.Vector3(0, 0, 0));
  ed.attachHand("R", agarres[1].id, new T.Vector3(0, 0, 0));
  const mano = (lado) => {
    const fig = ed.humanFigure; fig.updateMatrixWorld(true);
    let m = null; fig.traverse((n) => { if (n.userData?.segmentId === `mano-${lado}`) m = n; });
    return new T.Box3().setFromObject(m).getCenter(new T.Vector3());
  };
  // Se resuelve muchas veces, como hace el bucle de fotograma. Si la IK no es
  // idempotente, la mano oscila entre dos sitios en vez de quedarse quieta.
  ed.updateHandIK();
  const trazas = [];
  for (let i = 0; i < 12; i++) {
    ed.updateHandIK();
    trazas.push(mano("L").clone());
  }
  let temblor = 0;
  for (let i = 1; i < trazas.length; i++) {
    temblor = Math.max(temblor, trazas[i].distanceTo(trazas[i - 1]));
  }
  return { temblor: +temblor.toFixed(3), apoyos: ed.apoyosPuestos().length };
});
ok(t.apoyos === 2, `las dos manos quedan apoyadas (${t.apoyos})`);
// EL TEMBLOR. La IK corre en CADA fotograma partiendo de donde la dejó el
// anterior: si no es idempotente entra en un ciclo límite de un fotograma y el
// brazo vibra sin asentarse nunca. Un milímetro es ya generoso.
ok(t.temblor < 0.1,
  `el brazo se ASIENTA en vez de temblar (${t.temblor} cm entre pasadas de la IK)`);

// ── 3. Simular y parar: la máquina tiene que seguir entera ─────────────────
const s = await p.evaluate(async () => {
  const ed = window.exersuite.editor;
  ed.startSimulation();
  for (let i = 0; i < 150 && !ed.physics; i++) await new Promise((x) => setTimeout(x, 20));
  await new Promise((x) => setTimeout(x, 2500));
  const avisos = ed.physics?.avisosDeArmado?.() ?? [];
  const enMarcha = window.__retrato();
  ed.stopSimulation();
  await new Promise((x) => setTimeout(x, 1200));
  return { avisos, enMarcha, trasParar: window.__retrato() };
});
// LA MÁQUINA NO SE DESARMA AL SIMULAR. Congelar la partida teletransporta unas
// piezas y no otras: si el conjunto está soldado o unido, las que se quedan atrás
// tiran de las que saltan y el montaje revienta.
const dSim = await p.evaluate(([a, b]) => window.__deriva(a, b), [r.trasCongelar, s.enMarcha]);
ok(dSim.peor < 40,
  `simular no desarma la máquina (la pieza que más se va, ${dSim.peor} cm)`);
ok(s.avisos.length === 0, `sin avisos de armado (${s.avisos.join(" · ") || "ninguno"})`);

// Y AL PARAR, EL PLANO INTACTO. Es lo que el diseñador vio romperse para siempre:
// la máquina quedaba disgregada en el modo de construcción.
const dParar = await p.evaluate(([a, b]) => window.__deriva(a, b), [r.diseno, s.trasParar]);
ok(dParar.peor < 0.5,
  `al parar, la máquina vuelve ENTERA a su plano (deriva ${dParar.peor} cm)`);

for (const e of errores) console.log("PAGEERROR " + e);
console.log(fallos.length === 0 && errores.length === 0
  ? "\nTODO OK" : `\n${fallos.length} fallos, ${errores.length} errores de página`);
await browser.close();
process.exit(fallos.length === 0 && errores.length === 0 ? 0 : 1);
