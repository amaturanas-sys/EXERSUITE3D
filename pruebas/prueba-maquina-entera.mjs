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
  // ALTURA REAL DE LA PLACA MÁS BAJA de la pila, en el mundo. Las placas NO
  // seleccionadas no se mueven nunca: no las lleva el selector. Si esta cifra
  // sube, la pila entera está ascendiendo — que es justo lo que el diseñador vio.
  window.__pila = () => {
    const T = window.exersuite.THREE;
    const o = ed.listObjects().find((x) => x.stack);
    if (!o) return null;
    o.mesh.updateMatrixWorld(true);
    const suelta = o.getStackParts().filter((p) => !p.carriage);
    if (!suelta.length) return null;
    return +Math.min(...suelta.map((p) => p.mesh.getWorldPosition(new T.Vector3()).y)).toFixed(2);
  };
});

// ── 1. Sentar al maniquí y congelar la máquina en su postura de inicio ─────
const r = await p.evaluate(async () => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  const diseno = window.__retrato();
  const pilaDiseno = window.__pila();

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
  // LA PILA TIENE QUE ENTRAR EN LA PARTIDA. Si el brazo no llegó a arrastrarla
  // por el cable, se sube a mano: levantar el conjunto móvil hasta el punto de
  // bloqueo es un gesto de posado legítimo, y es donde apareció el fallo.
  const pila = ed.listObjects().find((o) => o.stack);
  if (pila && Math.abs(pila.mesh.position.y - diseno[pila.id][1]) < 1) {
    const q0 = pila.mesh.position.clone();
    ed.physics.grab(pila.id, q0.clone());
    for (let i = 0; i < 40; i++) {
      ed.physics.dragTo(q0.clone().add(new T.Vector3(0, Math.min(i * 0.5, 14), 0)));
      ed.physics.step(1 / 60);
    }
    ed.physics.release?.();
    for (let i = 0; i < 30; i++) ed.physics.step(1 / 60);
  }
  // La contra-traslación de las placas la hace el BUCLE DE FOTOGRAMA: pasando
  // la física a mano no corre ninguno, así que hay que cederle el turno.
  await new Promise((x) => setTimeout(x, 500));
  const pilaPosando = window.__pila();
  const subioLaPila = pila ? +(pila.mesh.position.y - diseno[pila.id][1]).toFixed(2) : 0;
  // Cuántas piezas se movieron DE VERDAD durante el posado, contadas sobre las
  // mallas: es con lo que hay que comparar lo que la partida llegó a congelar.
  const movidas = Object.entries(window.__retrato())
    .filter(([id, p]) => {
      const d = diseno[id];
      return d && Math.hypot(p[0] - d[0], p[1] - d[1], p[2] - d[2]) > 0.05;
    }).length;
  const congeladas = ed.terminarPoseMaquina().piezas;
  await new Promise((x) => setTimeout(x, 500));
  const trasCongelar = window.__retrato();
  return { entra, congeladas, diseno, trasCongelar,
    reparto: { movidas, enPartida: congeladas },
    pila: { diseno: pilaDiseno, posando: pilaPosando, congelada: window.__pila(), subioLaPila },
    derivaAlCongelar: window.__deriva(diseno, trasCongelar) };
});
ok(r.entra, "se entra a posar la máquina con el maniquí sentado");
ok(r.congeladas > 0, `la partida congela lo que se movió (${r.congeladas} pieza(s))`);
// LA MÁQUINA SE QUEDA DONDE SE CONGELÓ. Es la queja literal del diseñador —«la
// postura de la máquina no permanece en su sitio pese a ejecutar fijar
// posición»—: si al salir de posar vuelve al plano de un salto, ya no hay contra
// qué acomodarle el maniquí, que es justo para lo que se congela.
ok(r.derivaAlCongelar.peor > 1,
  `al salir de posar, la máquina SE QUEDA en su partida (${r.derivaAlCongelar.peor} cm del plano)`);
// Y ENTERA: las piezas soldadas viajan con su anfitrión. Congelar sólo los
// cuerpos del motor dejaba las fundidas en el plano y el brazo salía partido.
ok(r.reparto.enPartida === r.reparto.movidas,
  `y no se queda ninguna pieza atrás (${r.reparto.enPartida} congeladas de ${r.reparto.movidas} movidas)`);

// LA PILA DE PESOS NO ASCIENDE ENTERA. El selector se lleva las placas que el
// pin engancha; las de abajo se quedan donde están, siempre — posando, congelado
// y en marcha. El diseñador lo vio subir en bloque al fijar la postura de inicio.
ok(r.pila.subioLaPila > 1,
  `el posado levanta el conjunto móvil de la pila (${r.pila.subioLaPila} cm)`);
ok(Math.abs(r.pila.posando - r.pila.diseno) < 1,
  `posando, las placas sueltas se quedan (${r.pila.posando} vs ${r.pila.diseno} cm)`);
ok(Math.abs(r.pila.congelada - r.pila.diseno) < 1,
  `y congelada la partida, también (${r.pila.congelada} vs ${r.pila.diseno} cm)`);

// ── 1.b QUITAR EL MANIQUÍ devuelve la máquina a su reposo ─────────────────
// Regla del diseñador: «poder ver la máquina en su forma de reposo en
// construcción y simulación SIN maniquí». La partida es del maniquí; sin él, lo
// que hay que ver y editar es el plano.
const oculta = await p.evaluate(async ([diseno, partida]) => {
  const ed = window.exersuite.editor;
  ed.toggleHumanFigure();               // lo quita
  await new Promise((x) => setTimeout(x, 700));
  const sinFigura = window.__deriva(diseno, window.__retrato());
  const pilaSinFigura = window.__pila();
  await ed.toggleHumanFigure();         // lo devuelve
  await new Promise((x) => setTimeout(x, 900));
  const conFigura = window.__deriva(partida, window.__retrato());
  return { sinFigura, conFigura, pilaSinFigura };
}, [r.diseno, r.trasCongelar]);
ok(oculta.sinFigura.peor < 0.5,
  `quitar el maniquí devuelve la máquina a su REPOSO (${oculta.sinFigura.peor} cm del plano)`);
ok(oculta.conFigura.peor < 0.5,
  `y devolverlo recupera su partida sin refijarla (${oculta.conFigura.peor} cm)`);
ok(Math.abs(oculta.pilaSinFigura - r.pila.diseno) < 1,
  `sin maniquí la pila también está en reposo (${oculta.pilaSinFigura} vs ${r.pila.diseno} cm)`);

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
  const pilaEnMarcha = window.__pila();
  ed.stopSimulation();
  await new Promise((x) => setTimeout(x, 1200));
  return { avisos, enMarcha, pilaEnMarcha, pilaTrasParar: window.__pila(),
    trasParar: window.__retrato() };
});
// LA MÁQUINA NO SE DESARMA AL SIMULAR. Congelar la partida teletransporta unas
// piezas y no otras: si el conjunto está soldado o unido, las que se quedan atrás
// tiran de las que saltan y el montaje revienta.
const dSim = await p.evaluate(([a, b]) => window.__deriva(a, b), [r.trasCongelar, s.enMarcha]);
ok(dSim.peor < 40,
  `simular no desarma la máquina (la pieza que más se va, ${dSim.peor} cm)`);
ok(s.avisos.length === 0, `sin avisos de armado (${s.avisos.join(" · ") || "ninguno"})`);

// AL PARAR VUELVE A SU PARTIDA, no al plano: parar no es soltar la condición de
// ensayo. Y sobre todo, vuelve ENTERA — es lo que el diseñador vio romperse para
// siempre, con las piezas disgregadas en el modo de construcción.
const dParar = await p.evaluate(([a, b]) => window.__deriva(a, b), [r.trasCongelar, s.trasParar]);
ok(dParar.peor < 1,
  `al parar, la máquina vuelve ENTERA a su partida (deriva ${dParar.peor} cm)`);
ok(Math.abs(s.pilaEnMarcha - r.pila.diseno) < 2,
  `en marcha las placas sueltas siguen en su sitio (${s.pilaEnMarcha} vs ${r.pila.diseno} cm)`);
ok(Math.abs(s.pilaTrasParar - r.pila.diseno) < 1,
  `y al parar, también (${s.pilaTrasParar} vs ${r.pila.diseno} cm)`);

// ── 4. EDITAR CON LA PARTIDA A LA VISTA, y que el cambio PERMANEZCA ────────
// Regla del diseñador: «poder modificar y editar la máquina con las herramientas
// de construcción en una posición ergonómica precisa, y estos cambios
// estructurales permanecen». La partida es una condición de ensayo puesta encima
// del plano; mover una pieza con el gizmo mientras se ve es editar el PLANO, y
// el plano tiene que enterarse.
const ed4 = await p.evaluate(async ([diseno]) => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  window.__diseno = diseno;
  // Con la partida a la vista, lo que se guarda tiene que ser el PLANO.
  window.__guardadoConPartida = ed.serialize().objects;
  // Una pieza QUE ESTÁ EN LA PARTIDA (se movió al posar) y otra que no.
  const enPartida = ed.listObjects().find((o) => {
    const d = window.__diseno[o.id];
    return d && o.mesh.position.distanceTo(new T.Vector3(...d)) > 1;
  });
  const fuera = ed.listObjects().find((o) => {
    const d = window.__diseno[o.id];
    return d && o.mesh.position.distanceTo(new T.Vector3(...d)) < 0.05;
  });
  const antesEn = enPartida.mesh.position.clone();
  const antesFuera = fuera.mesh.position.clone();
  // Se editan las dos, como haría el usuario con el gizmo.
  ed.select(enPartida);
  enPartida.mesh.position.x += 7;
  ed.bus.emit("objectTransformed", { object: enPartida });
  ed.select(fuera);
  fuera.mesh.position.x += 7;
  ed.bus.emit("objectTransformed", { object: fuera });
  ed.select(null);
  await new Promise((x) => setTimeout(x, 300));
  // Se suelta la partida: lo que queda es el PLANO, y tiene que llevar los 7 cm.
  const disEn = window.__diseno[enPartida.id];
  const disFuera = window.__diseno[fuera.id];
  ed.soltarPartidaMaquina();
  await new Promise((x) => setTimeout(x, 300));
  return {
    enPartida: { esperado: +(disEn[0] + 7).toFixed(2), real: +enPartida.mesh.position.x.toFixed(2) },
    fuera: { esperado: +(disFuera[0] + 7).toFixed(2), real: +fuera.mesh.position.x.toFixed(2) },
    seMovioEnPantalla: +antesEn.distanceTo(enPartida.mesh.position).toFixed(2) > 0
      && +antesFuera.distanceTo(fuera.mesh.position).toFixed(2) > 0,
  };
}, [r.diseno]);
ok(Math.abs(ed4.enPartida.real - ed4.enPartida.esperado) < 0.5,
  `editar una pieza CONGELADA con la partida a la vista llega al plano `
  + `(${ed4.enPartida.real}, se esperaba ${ed4.enPartida.esperado})`);
ok(Math.abs(ed4.fuera.real - ed4.fuera.esperado) < 0.5,
  `y editar una que no estaba congelada, también `
  + `(${ed4.fuera.real}, se esperaba ${ed4.fuera.esperado})`);

// EL PLANO NO SE PIERDE aunque se esté viendo la partida: es lo que se exporta y
// lo que se guarda.
const dPlano = await p.evaluate(([diseno]) => {
  const guardado = window.__guardadoConPartida;
  let peorGuardado = 0;
  for (const o of guardado) {
    const d = diseno[o.id];
    if (!d) continue;
    peorGuardado = Math.max(peorGuardado, Math.hypot(
      o.position[0] - d[0], o.position[1] - d[1], o.position[2] - d[2]));
  }
  return { peorGuardado: +peorGuardado.toFixed(2) };
}, [r.diseno]);
ok(dPlano.peorGuardado < 0.5,
  `el proyecto guardado con la partida a la vista lleva el PLANO (${dPlano.peorGuardado} cm)`);

for (const e of errores) console.log("PAGEERROR " + e);
console.log(fallos.length === 0 && errores.length === 0
  ? "\nTODO OK" : `\n${fallos.length} fallos, ${errores.length} errores de página`);
await browser.close();
process.exit(fallos.length === 0 && errores.length === 0 ? 0 : 1);
