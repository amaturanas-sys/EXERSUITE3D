// v0.2.91 · POSAR LA MÁQUINA VA ANTES QUE APOYAR, y la partida es del maniquí.
//
// Reglas del diseñador, en sus palabras: «la función de posar máquina debe
// anteceder a la postura de apoyos (manos y pies) para que sea posible acomodar
// adecuadamente el modelo en el espacio. La función deberá operar en el entorno
// de construcción en presencia del maniquí, y en ausencia del maniquí la
// configuración de la máquina vuelve al default para seguir diseñando. Cuando
// la simulación comienza se dispondrá la máquina en pose de último fotograma
// sólo cuando el maniquí está presente».
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

// ── 1. Sin maniquí no se posa la máquina ──────────────────────────────────
const a = await p.evaluate(async () => {
  const ed = window.exersuite.editor;
  const o = ed.addComponent("disco-peso");
  o.physics = { ...o.physics, fixed: false };
  await ed.iniciarPoseMaquina();
  return { posando: ed.posandoMaquina(), simulando: ed.isSimulating() };
});
ok(!a.posando && !a.simulando, "sin maniquí, «▶ Manipular» no entra: la máquina se posa PARA alguien");

// ── 2. La partida SÓLO rige con el maniquí delante ────────────────────────
const b = await p.evaluate(async () => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  // Una pieza móvil que se pueda congelar en otro sitio que el del plano.
  const pieza = ed.addComponent("disco-peso");
  pieza.physics = { ...pieza.physics, fixed: false };
  pieza.mesh.position.set(0, 60, 0);
  const disenoY = pieza.mesh.position.y;
  await ed.addHumanFigure();
  await new Promise((r) => setTimeout(r, 700));
  await ed.iniciarPoseMaquina();
  const entra = ed.posandoMaquina();
  // Posar es A MANO: corre el motor pero sin gravedad ni tiempo, así que la
  // pieza se lleva con la mano hasta donde interese, como haría el usuario.
  const p0 = pieza.mesh.position.clone();
  ed.physics.grab(pieza.id, p0.clone());
  for (let i = 0; i < 60; i++) {
    ed.physics.dragTo(p0.clone().add(new T.Vector3(0, -Math.min(i, 30), 0)));
    ed.physics.step(1 / 60);
  }
  ed.physics.release?.();
  for (let i = 0; i < 20; i++) ed.physics.step(1 / 60);
  const r = ed.terminarPoseMaquina();
  const conManiqui = pieza.mesh.position.y;
  const congeladas = ed.piezasEnLaPartida();
  // Se va el maniquí: la máquina vuelve al plano.
  ed.removeHumanFigure();
  await new Promise((x) => setTimeout(x, 200));
  const sinManiqui = pieza.mesh.position.y;
  const congeladasSin = ed.piezasEnLaPartida();
  // Vuelve el maniquí: vuelve la partida, sin haberla vuelto a fijar.
  await ed.addHumanFigure();
  await new Promise((x) => setTimeout(x, 700));
  const otraVez = pieza.mesh.position.y;
  return { entra, piezas: r.piezas, disenoY, conManiqui: +conManiqui.toFixed(1),
    sinManiqui: +sinManiqui.toFixed(1), otraVez: +otraVez.toFixed(1),
    congeladas, congeladasSin };
});
ok(b.entra, "con maniquí delante sí se entra a posar la máquina");
ok(b.piezas > 0 && b.congeladas > 0, `la partida congela lo que se movió (${b.piezas} pieza(s))`);
ok(Math.abs(b.conManiqui - b.disenoY) > 5,
  `con el maniquí, la máquina se VE en su partida y no en el plano (${b.conManiqui} frente a ${b.disenoY} cm)`);
ok(Math.abs(b.sinManiqui - b.disenoY) < 0.5,
  `sin maniquí vuelve al diseño para seguir diseñando (${b.sinManiqui} cm)`);
ok(b.congeladasSin === 0, "y sin maniquí la partida no cuenta (0 piezas congeladas)");
ok(Math.abs(b.otraVez - b.conManiqui) < 0.5,
  `al volver el maniquí vuelve su partida, sin refijarla (${b.otraVez} cm)`);

// ── 3. Se puede APOYAR LA MANO con la máquina posada ──────────────────────
const c = await p.evaluate(async () => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  const mando = ed.addComponent("prim-cylinder");
  mando.params = { kind: "cylinder", radiusTop: 2, radiusBottom: 2, height: 60 };
  mando.rebuildGeometry();
  mando.physics = { ...mando.physics, fixed: true };
  mando.mesh.position.set(0, 120, 40);
  ed.applyPose("De pie");
  await new Promise((r) => setTimeout(r, 300));
  await ed.iniciarPoseMaquina();
  const posando = ed.posandoMaquina();
  // El modo apoyo sobrevive a entrar en «Manipular» y acepta el apoyo.
  ed.beginAttachHand();
  const modoVivo = ed.attachMode === true;
  ed.attachSide = "L";
  ed.attachHand("L", mando.id, new T.Vector3(0, 0, 0));
  const puestos = ed.apoyosPuestos();
  ed.updateHandIK();
  await new Promise((r) => setTimeout(r, 200));
  const fig = ed.humanFigure; fig.updateMatrixWorld(true);
  let mano = null; fig.traverse((n) => { if (n.userData?.segmentId === "mano-L") mano = n; });
  const cm = new T.Box3().setFromObject(mano).getCenter(new T.Vector3());
  ed.terminarPoseMaquina();
  return { posando, modoVivo, puestos: puestos.length,
    distancia: +cm.distanceTo(mando.mesh.position).toFixed(1) };
});
ok(c.posando, "se entra a posar la máquina con el maniquí puesto");
ok(c.modoVivo, "«✋ Apoyar mano» sigue vivo dentro de «▶ Manipular»: es el mismo gesto en dos tiempos");
ok(c.puestos === 1, `el panel puede decir qué hay apoyado (${c.puestos} apoyo)`);
ok(c.distancia < 20, `y la mano VA al mando, no se queda en el aire (${c.distancia} cm del eje)`);

// ── 4. La zona activa ya no veta la IK con el gesto parado ────────────────
const d = await p.evaluate(async () => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const mando = ed.listObjects().find((o) => o.componentId === "prim-cylinder");
  // «Tren superior» es la zona de fábrica y declara hombro y codo.
  ed.activarZona("superior", "sim");
  ed.updateHandIK();
  await new Promise((r) => setTimeout(r, 200));
  const fig = ed.humanFigure; fig.updateMatrixWorld(true);
  let mano = null; fig.traverse((n) => { if (n.userData?.segmentId === "mano-L") mano = n; });
  const cm = new T.Box3().setFromObject(mano).getCenter(new T.Vector3());
  return { distancia: +cm.distanceTo(mando.mesh.position).toFixed(1) };
});
ok(d.distancia < 20,
  `con «tren superior» armada y el gesto PARADO, el apoyo sigue mandando (${d.distancia} cm)`);

// ── 5. La postura de un ejercicio TRAE LA BARRA ───────────────────────────
// Las ocho posturas de barra salen en la lista general. Aplicadas desde ahí
// sólo movían el cuerpo: la figura bajaba a la sentadilla y la barra cargada
// se quedaba en los ganchos. Es mímica, no un gesto.
const e = await p.evaluate(async () => {
  const ed = window.exersuite.editor;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  ed.soltarBarraDelManiqui?.();
  await new Promise((r) => setTimeout(r, 200));
  const sinBarra = ed.getBarraManiqui()?.objectId ?? null;
  ed.applyPose("Peso muerto (suelo)");
  await new Promise((r) => setTimeout(r, 300));
  const tras = ed.getBarraManiqui();
  return { sinBarra, objeto: tras?.objectId ?? null, ejercicio: tras?.ejercicio ?? null,
    zona: [...(ed.zonasActivas?.keys?.() ?? [])] };
});
ok(e.sinBarra === null, "de partida el maniquí no lleva barra");
ok(e.objeto !== null && e.ejercicio === "peso-muerto",
  `aplicar «Peso muerto (suelo)» ENLAZA la barra del ejercicio (${e.ejercicio})`);
ok(e.zona.includes("bisagra"), `y arma su zona de movimiento (${e.zona.join(", ") || "ninguna"})`);

// ── 6. Se ADOPTA la barra que ya está en la escena, no se siembra otra ─────
const f = await p.evaluate(async () => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  ed.soltarBarraDelManiqui?.();
  await new Promise((r) => setTimeout(r, 200));
  // Una barra colocada a mano, cargada, y girada como la dejó el usuario.
  const mia = ed.addComponent("barra-olimpica");
  mia.mesh.position.set(0, 100, 30);
  mia.mesh.rotation.set(0.5, 0.3, 0.2);
  const antes = ed.listObjects().filter((o) => o.componentId === "barra-olimpica").length;
  ed.ponerBarraEnManos("peso-muerto");
  await new Promise((r) => setTimeout(r, 400));
  const despues = ed.listObjects().filter((o) => o.componentId === "barra-olimpica").length;
  return { antes, despues, esLaMia: ed.getBarraManiqui()?.objectId === mia.id };
});
ok(f.antes === 1, "hay una barra puesta a mano en la escena");
ok(f.despues === 1 && f.esLaMia,
  `el maniquí ADOPTA esa barra en vez de sembrar otra (${f.antes} → ${f.despues})`);

// ── 7. La barra no se alabea aunque los brazos dejen de ser simétricos ─────
const g = await p.evaluate(async () => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  ed.ponerBarraEnManos("peso-muerto");
  await new Promise((r) => setTimeout(r, 400));
  const incl = () => {
    const o = ed.getObject(ed.getBarraManiqui().objectId);
    o.mesh.updateMatrixWorld(true);
    const eje = new T.Vector3(0, 1, 0).applyQuaternion(o.mesh.quaternion).normalize();
    return +(Math.asin(Math.min(1, Math.abs(eje.y))) * 180 / Math.PI).toFixed(2);
  };
  const base = incl();
  const J = ed.humanFigure.userData.joints;
  ed.setPoseSymmetry?.(false);
  const medidas = [];
  for (const grados of [15, 30, 45, 60]) {
    J.elbowL.rotation.x = -grados * Math.PI / 180;
    ed.sincronizarBarraManiqui();
    medidas.push({ grados, incl: incl() });
  }
  return { base, medidas, peor: Math.max(...medidas.map((m) => m.incl)) };
});
ok(g.base < 0.5, `la barra nace nivelada (${g.base}°)`);
ok(g.peor < 1,
  `y sigue nivelada con UN codo doblado hasta 60° (peor caso ${g.peor}°) — una barra es un sólido rígido`);

// ── 8. Colocar al maniquí permite decir HACIA DÓNDE MIRA ──────────────────
// Colocar lo adivina —midiendo el asiento, o apuntando a la máquina fija más
// cercana— y acierta casi siempre; pero adivinar no es decidir.
const h = await p.evaluate(async () => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  ed.setRumboFigura(0);
  const cero = ed.rumboFigura();
  const frenteA = new T.Vector3(0, 0, 1).applyQuaternion(ed.humanFigure.quaternion).toArray().map((v) => +v.toFixed(2));
  ed.setRumboFigura(90);
  const noventa = ed.rumboFigura();
  const frenteB = new T.Vector3(0, 0, 1).applyQuaternion(ed.humanFigure.quaternion).toArray().map((v) => +v.toFixed(2));
  ed.girarFigura(-45);
  const tras = ed.rumboFigura();
  // La barra puesta acompaña al giro: va atada a las manos.
  ed.setRumboFigura(0);
  ed.ponerBarraEnManos("peso-muerto");
  await new Promise((r) => setTimeout(r, 400));
  const ejeAntes = (() => {
    const o = ed.getObject(ed.getBarraManiqui().objectId);
    o.mesh.updateMatrixWorld(true);
    return new T.Vector3(0, 1, 0).applyQuaternion(o.mesh.quaternion).toArray().map((v) => +v.toFixed(2));
  })();
  ed.setRumboFigura(90);
  await new Promise((r) => setTimeout(r, 300));
  const ejeDespues = (() => {
    const o = ed.getObject(ed.getBarraManiqui().objectId);
    o.mesh.updateMatrixWorld(true);
    return new T.Vector3(0, 1, 0).applyQuaternion(o.mesh.quaternion).toArray().map((v) => +v.toFixed(2));
  })();
  return { cero, noventa, tras, frenteA, frenteB, ejeAntes, ejeDespues };
});
ok(h.cero === 0 && Math.abs(h.frenteA[2] - 1) < 0.01,
  `a 0° el maniquí mira a +Z (${h.frenteA.join(", ")})`);
ok(h.noventa === 90 && Math.abs(h.frenteB[0] - 1) < 0.01,
  `a 90° mira a +X (${h.frenteB.join(", ")})`);
ok(h.tras === 45, `y los botones de cuarto giran de verdad (90° − 45° = ${h.tras}°)`);
ok(Math.abs(h.ejeAntes[0]) > 0.9 && Math.abs(h.ejeDespues[2]) > 0.9,
  `la barra acompaña al giro (eje ${h.ejeAntes.join(",")} → ${h.ejeDespues.join(",")})`);

for (const e of errores) console.log("PAGEERROR " + e);
console.log(fallos.length === 0 && errores.length === 0
  ? "\nTODO OK" : `\n${fallos.length} fallos, ${errores.length} errores de página`);
await browser.close();
process.exit(fallos.length === 0 && errores.length === 0 ? 0 : 1);
