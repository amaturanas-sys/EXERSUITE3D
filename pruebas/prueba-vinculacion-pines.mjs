// v0.3.7 · EL INTERRUPTOR DE LA GUÍA Y EL PASADOR QUE ATRAVIESA.
//
// Dos ajustes que pidió el diseñador sobre el mecanismo de guías tubulares:
//
//   1. Vincular una pieza a una guía no puede ser un efecto secundario de
//      moverla. Manda la GUÍA: se enciende «Administrar vinculación» en sus
//      Propiedades, se hace clic en las piezas y se las coloca con el gizmo;
//      con el interruptor apagado, pasar por delante de la guía no agujerea
//      nada.
//
//   2. El SAFETY PIN tiene que reconocer los pinholes como los reconocen las
//      jotas, pero ATRAVESÁNDOLOS: entra por una cara del poste y sale por la
//      opuesta, perpendicular a la viga, con un diámetro que quepa por el
//      agujero. Y luego se regula cuánto sobresale por cada lado y cuánto
//      mide.
//
// Aquí se comprueban las dos cosas con medidas, no con impresiones.
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

// ── 1. EL INTERRUPTOR MANDA ────────────────────────────────────────────────
console.log("\n── Administrar vinculación ─────────────────────────────────");
const sw = await p.evaluate(() => {
  const ed = window.exersuite.editor;
  const limpia = () => { for (const o of [...ed.listObjects()]) ed.removeObject(o); ed.select(null); };
  const tenderGuia = (x) => {
    const g = ed.addComponent("guia-tubular");
    g.params = { ...g.params, height: 160, radiusTop: 1.5, radiusBottom: 1.5 };
    g.rebuildGeometry();
    g.mesh.position.set(x, 90, 0);
    g.mesh.updateMatrixWorld(true);
    return g;
  };
  const carro = (x) => {
    const c = ed.addComponent("prim-box");
    c.params = { kind: "box", width: 80, height: 10, depth: 24 };
    c.rebuildGeometry();
    c.mesh.position.set(x, 90, 0);
    c.mesh.updateMatrixWorld(true);
    return c;
  };
  const vertices = (o) => o.mesh.geometry.getAttribute("position").count;

  limpia();
  const gA = tenderGuia(-30);
  const gB = tenderGuia(30);
  const c = carro(0);
  const out = { vertBase: vertices(c) };

  // (a) APAGADO: seleccionar y soltar la pieza NO la enhebra.
  ed.select(c);
  ed.enhebrarSeleccion();          // el MISMO camino que corre al soltar el gizmo
  out.apagadoCanales = (c.params.canales ?? []).length;
  out.apagadoVert = vertices(c);

  // (b) ENCENDIDO en UNA guía: solo esa abre canal.
  ed.administrarVinculacion(gA.id, true);
  out.administradas1 = ed.guiasAdministradas().length;
  ed.select(c);
  out.unaCanales = (c.params.canales ?? []).length;
  out.unaEsA = (c.params.canales ?? []).every((k) => k.guia === gA.id);
  out.unaVert = vertices(c);

  // (c) ENCENDIDA TAMBIÉN LA SEGUNDA: se añade su canal sin tocar el primero.
  ed.administrarVinculacion(gB.id, true);
  out.administradas2 = ed.guiasAdministradas().length;
  ed.select(c);
  const g2 = new Set((c.params.canales ?? []).map((k) => k.guia));
  out.dosCanales = (c.params.canales ?? []).length;
  out.dosGuias = g2.size;
  out.dosVert = vertices(c);
  // Separación real entre los dos canales abiertos (deben estar a 60 cm).
  const cs = (c.params.canales ?? []).slice().sort((a, b) => a.v - b.v);
  out.separacion = cs.length === 2 ? +Math.abs(cs[1].v - cs[0].v).toFixed(2) : null;
  out.radio = cs.length ? +cs[0].radio.toFixed(2) : null;

  // (d) ADMINISTRAR ES TAMBIÉN DESVINCULAR: con las dos guías administradas,
  //     apartar la pieza de una le quita ESE canal y le deja el otro.
  c.mesh.position.set(-45, 90, 0); // cubre de -85 a -5: cruza gA, ya no gB
  c.mesh.updateMatrixWorld(true);
  ed.select(c);
  ed.enhebrarSeleccion();
  const tras = c.params.canales ?? [];
  out.trasCanales = tras.length;
  out.trasGuias = [...new Set(tras.map((k) => k.guia))].map((id) => (id === gA.id ? "A" : "B"));

  // (e) TERMINAR apaga todos los interruptores.
  ed.terminarAdministracion();
  out.trasTerminar = ed.guiasAdministradas().length;
  return out;
});
ok(sw.apagadoCanales === 0 && sw.apagadoVert === sw.vertBase,
  `con el interruptor APAGADO la pieza no se agujerea (${sw.apagadoCanales} canales, `
  + `${sw.apagadoVert} vértices, los de fábrica)`);
ok(sw.administradas1 === 1 && sw.unaCanales === 1 && sw.unaEsA,
  `encendido en UNA guía, se abre UN canal y es el suyo (${sw.unaCanales})`);
ok(sw.unaVert > sw.vertBase,
  `y la malla se perfora de verdad (${sw.vertBase} → ${sw.unaVert} vértices)`);
ok(sw.administradas2 === 2 && sw.dosCanales === 2 && sw.dosGuias === 2,
  `encendida la SEGUNDA, se suma su canal sin perder el primero (${sw.dosCanales} canales, `
  + `${sw.dosGuias} guías)`);
ok(sw.separacion !== null && Math.abs(sw.separacion - 60) < 0.5,
  `los dos canales quedan donde pasan las barras (${sw.separacion} cm de separación, se esperaban 60)`);
ok(sw.radio !== null && Math.abs(sw.radio - 1.85) < 0.01,
  `con la holgura de deslizamiento del tubo (radio ${sw.radio} = 1,5 + 0,35)`);
ok(sw.trasCanales === 1 && sw.trasGuias.join() === "A",
  `administrar también DESVINCULA: apartada de la otra guía le queda un canal `
  + `(${sw.trasCanales}, guía ${sw.trasGuias.join() || "ninguna"})`);
ok(sw.trasTerminar === 0, "«Terminar» apaga todos los interruptores");

// El interruptor está donde el diseñador lo pidió: en Propiedades de la guía.
console.log("\n── El interruptor, en Propiedades de la guía ───────────────");
await p.evaluate(() => {
  const ed = window.exersuite.editor;
  ed.select(ed.listObjects().find((o) => o.componentId === "guia-tubular"));
});
await p.waitForTimeout(400);
const enPanel = await p.evaluate(() => {
  const etiquetas = [...document.querySelectorAll("#properties label, .panel label")]
    .map((n) => n.textContent ?? "");
  const fila = etiquetas.find((t) => t.includes("Administrar vinculación"));
  const check = [...document.querySelectorAll("input[type=checkbox]")]
    .find((n) => (n.parentElement?.textContent ?? "").includes("Vincular piezas a esta guía"));
  return { fila: !!fila, check: !!check };
});
ok(enPanel.fila && enPanel.check,
  `«Administrar vinculación» aparece en las Propiedades de la guía, con su interruptor `
  + `(rótulo: ${enPanel.fila}, casilla: ${enPanel.check})`);

const clic = await p.evaluate(async () => {
  const ed = window.exersuite.editor;
  const check = [...document.querySelectorAll("input[type=checkbox]")]
    .find((n) => (n.parentElement?.textContent ?? "").includes("Vincular piezas a esta guía"));
  check.click();
  await new Promise((r) => setTimeout(r, 150));
  const encendidas = ed.guiasAdministradas().length;
  ed.terminarAdministracion();
  return { encendidas };
});
ok(clic.encendidas === 1, `y al pulsarlo la guía entra en administración (${clic.encendidas})`);

// ── 2. EL SAFETY PIN ATRAVIESA EL PINHOLE ─────────────────────────────────
console.log("\n── El safety pin en los pinholes ───────────────────────────");
const pin = await p.evaluate(() => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  for (const o of [...ed.listObjects()]) ed.removeObject(o);
  ed.select(null);
  const poste = ed.addComponent("montante-ttp"); // 5 × 204 × 7, pinholes por X
  poste.mesh.position.set(0, 102, 0);
  poste.mesh.rotation.set(0, 0, 0);
  poste.mesh.updateMatrixWorld(true);

  const pin = ed.addComponent("safety-pin");
  // Se suelta al lado del poste, torcido y algo caído: como sale de la paleta.
  pin.mesh.position.set(11, 120, 4);
  pin.mesh.rotation.set(0, 0.6, 0);
  pin.mesh.updateMatrixWorld(true);

  const aviso = ed.calcePorAgujero(pin.id, 1);
  pin.mesh.updateMatrixWorld(true);
  const e = ed.estadoPin(pin.id);
  // El eje de la barra en el mundo: su Y local (ejePasante).
  const barra = new T.Vector3(0, 1, 0).applyQuaternion(pin.mesh.quaternion).normalize();
  const ejeAgujero = new T.Vector3(1, 0, 0); // ejeCalce "x" del montante sin girar
  const grados = (v) => +(v * 180 / Math.PI).toFixed(1);
  // La grilla que ve una JOTA en el mismo poste: el pasador tiene que contar
  // los mismos agujeros, no una rejilla suya.
  const jota = ed.addComponent("j-hook");
  jota.mesh.position.set(9, 140, 0);
  jota.mesh.updateMatrixWorld(true);
  const totalJota = ed.estadoCalce(jota.id)?.total ?? -1;
  ed.removeObject(jota);
  return {
    aviso,
    e,
    totalJota,
    // ¿Acostado sobre el eje del agujero? (0° = perfectamente alineado)
    desvio: grados(Math.acos(Math.min(1, Math.abs(barra.dot(ejeAgujero))))),
    // ¿Perpendicular a la viga (eje Y del poste)?
    conViga: grados(Math.acos(Math.min(1, Math.abs(barra.dot(new T.Vector3(0, 1, 0)))))),
    // ¿Centrado en el poste? (distancia al eje, en el plano perpendicular)
    fueraDeEje: +Math.hypot(pin.mesh.position.x - 0, pin.mesh.position.z - 0).toFixed(2),
    y: +pin.mesh.position.y.toFixed(2),
  };
});
ok(pin.aviso === null, `el pasador calza en la grilla del montante (${pin.aviso ?? "sin aviso"})`);
ok(pin.desvio < 0.5,
  `y se ACUESTA sobre el eje de los agujeros, no de pie (desvío ${pin.desvio}°)`);
ok(Math.abs(pin.conViga - 90) < 0.5,
  `o sea PERPENDICULAR a la viga, como un pin real (${pin.conViga}° con el eje del poste)`);
ok(pin.fueraDeEje < 0.05,
  `atraviesa el poste por su centro, no pasa de largo (${pin.fueraDeEje} cm fuera del eje)`);
ok(pin.e && Math.abs(pin.e.grosor - 5) < 0.05,
  `atraviesa los ${pin.e?.grosor} cm de viga del montante TTP (5 × 204 × 7, agujeros por la cara de 5)`);
ok(pin.e && Math.abs(pin.e.sobranteA - 9.5) < 0.05 && Math.abs(pin.e.sobranteB - 9.5) < 0.05,
  `y sobresale lo mismo por los dos lados (${pin.e?.sobranteA} y ${pin.e?.sobranteB} cm de los 24 de barra)`);
ok(pin.e && pin.e.calzado && pin.e.total === pin.totalJota,
  `el panel sabe en qué agujero está —el ${pin.e?.agujero} de ${pin.e?.total}— y cuenta la `
  + `MISMA grilla que ve una jota en ese poste (${pin.totalJota})`);

// ── 3. DIÁMETRO: TIENE QUE CABER POR EL AGUJERO ───────────────────────────
console.log("\n── El diámetro lo manda el agujero ─────────────────────────");
const gordo = await p.evaluate(() => {
  const ed = window.exersuite.editor;
  const pin = ed.listObjects().find((o) => o.componentId === "safety-pin");
  const e0 = ed.estadoPin(pin.id);
  // Un pasador de 8 cm de diámetro no entra por un agujero de 2,6.
  pin.params = { ...pin.params, radiusTop: 4, radiusBottom: 4 };
  pin.rebuildGeometry();
  const aviso = ed.calcePorAgujero(pin.id, 0);
  const e1 = ed.estadoPin(pin.id);
  return { agujero: e0.diaAgujero, pedido: 8, quedo: e1.diaPin, aviso };
});
ok(Math.abs(gordo.agujero - 2.6) < 0.01,
  `el montante declara su pinhole (Ø ${gordo.agujero} cm)`);
ok(gordo.quedo <= gordo.agujero - 0.09 && gordo.quedo > 2,
  `y un pasador de Ø ${gordo.pedido} cm se ciñe hasta caber por él (Ø ${gordo.quedo} cm)`);

// ── 4. SOBRANTE A CADA LADO Y LARGO ───────────────────────────────────────
console.log("\n── Corrimiento y largo ─────────────────────────────────────");
const ajuste = await p.evaluate(() => {
  const ed = window.exersuite.editor;
  const pin = ed.listObjects().find((o) => o.componentId === "safety-pin");
  pin.params = { ...pin.params, radiusTop: 1.25, radiusBottom: 1.25 };
  pin.rebuildGeometry();
  ed.calcePorAgujero(pin.id, 0);
  const yAntes = +pin.mesh.position.y.toFixed(3);

  // (a) Se corre 6 cm: el sobrante se desequilibra en exactamente eso, sin
  //     cambiar de agujero.
  ed.correrPasante(pin.id, 6);
  pin.mesh.updateMatrixWorld(true);
  const corrido = ed.estadoPin(pin.id);
  const yCorrido = +pin.mesh.position.y.toFixed(3);
  const xCorrido = +pin.mesh.position.x.toFixed(2);

  // (b) Más allá del tope no puede: dejaría de atravesar la viga.
  const max = corrido.corrimientoMax;

  // (c) Se alarga a 40 cm y se reasienta: más sobrante, mismo agujero.
  ed.correrPasante(pin.id, 0);
  pin.params = { ...pin.params, height: 40 };
  pin.rebuildGeometry();
  ed.calcePorAgujero(pin.id, 0);
  const largo = ed.estadoPin(pin.id);
  const yLargo = +pin.mesh.position.y.toFixed(3);
  return { yAntes, corrido, yCorrido, xCorrido, max, largo, yLargo };
});
ok(Math.abs(ajuste.corrido.sobranteA - 15.5) < 0.05 && Math.abs(ajuste.corrido.sobranteB - 3.5) < 0.05,
  `corrido 6 cm, sobresale ${ajuste.corrido.sobranteA} por un lado y ${ajuste.corrido.sobranteB} `
  + `por el otro (9,5 ± 6)`);
ok(Math.abs(ajuste.xCorrido - 6) < 0.05,
  `y se movió por el agujero, no por el aire (${ajuste.xCorrido} cm sobre el eje del pinhole)`);
ok(ajuste.yCorrido === ajuste.yAntes,
  `sin cambiar de altura: sigue en el mismo agujero (${ajuste.yCorrido} cm)`);
ok(Math.abs(ajuste.max - 9.5) < 0.05,
  `el tope de corrimiento es donde el pasador dejaría de atravesar (${ajuste.max} cm)`);
ok(Math.abs(ajuste.largo.largo - 40) < 0.05
  && Math.abs(ajuste.largo.sobranteA - 17.5) < 0.05
  && Math.abs(ajuste.largo.sobranteB - 17.5) < 0.05,
  `alargado a ${ajuste.largo.largo} cm, sobresale ${ajuste.largo.sobranteA} por lado ((40−5)/2)`);
ok(ajuste.yLargo === ajuste.yAntes,
  `y tampoco cambia de agujero al alargarlo (${ajuste.yLargo} cm)`);

// ── 5. SUBE Y BAJA AGUJERO A AGUJERO, COMO LAS JOTAS ──────────────────────
console.log("\n── ▲/▼ agujero por agujero ─────────────────────────────────");
const escalera = await p.evaluate(() => {
  const ed = window.exersuite.editor;
  const pin = ed.listObjects().find((o) => o.componentId === "safety-pin");
  pin.params = { ...pin.params, height: 24 };
  pin.rebuildGeometry();
  ed.calcePorAgujero(pin.id, 0);
  const y0 = pin.mesh.position.y;
  const n0 = ed.estadoPin(pin.id).agujero;
  ed.calcePorAgujero(pin.id, 1);
  const y1 = pin.mesh.position.y;
  const n1 = ed.estadoPin(pin.id).agujero;
  ed.calcePorAgujero(pin.id, -1);
  const y2 = pin.mesh.position.y;
  const n2 = ed.estadoPin(pin.id).agujero;
  return {
    paso: +(y1 - y0).toFixed(2),
    vuelta: +(y2 - y0).toFixed(2),
    agujeros: [n0, n1, n2],
  };
});
ok(Math.abs(escalera.paso - 5) < 0.01,
  `▲ lo sube exactamente un agujero de la grilla real (${escalera.paso} cm, paso TTP 5)`);
ok(Math.abs(escalera.vuelta) < 0.01, `▼ lo devuelve al de partida (${escalera.vuelta} cm)`);
ok(escalera.agujeros[1] === escalera.agujeros[0] + 1
  && escalera.agujeros[2] === escalera.agujeros[0],
  `y el panel lo cuenta bien (agujeros ${escalera.agujeros.join(" → ")})`);

// Captura: el pasador metido en el montante, visto de frente.
await p.evaluate(() => {
  const ed = window.exersuite.editor;
  const pin = ed.listObjects().find((o) => o.componentId === "safety-pin");
  ed.select(pin);
  ed.setViewPreset?.("isometrica");
  ed.requestRender();
});
await p.waitForTimeout(900);
await p.screenshot({ path: "salidas/vinculacion-pines.png" });

for (const e of errores) console.log("PAGEERROR " + e);
console.log(fallos.length === 0 && errores.length === 0
  ? "\nTODO OK" : `\n${fallos.length} fallos, ${errores.length} errores de página`);
await browser.close();
process.exit(fallos.length === 0 && errores.length === 0 ? 0 : 1);
