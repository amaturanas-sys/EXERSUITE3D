// v0.3.6 · EL MANIQUÍ, TAMBIÉN EN EL VIEWER.
//
// Abrir un archivo desde el SIMULADOR de la Home tenía tres agujeros que el
// diseñador señaló de una vez:
//
//   1. la postura que dejó puesta en el Builder no se veía al abrir;
//   2. el panel del maniquí (posar / simular) no respondía;
//   3. no había forma de esconder el maniquí para ver la máquina.
//
// Los tres salían de lo mismo: el viewer se montaba SIN la ventana del maniquí
// —«mostrar un proyecto no necesita herramientas de edición»— y arrancaba la
// física en cuanto terminaba de cargar. El botón que abre esa ventana ya
// existía en la barra de simulación, llamando a `editor.panelArticulaciones`,
// que en el viewer era null: estaba ahí y no hacía nada.
//
// Esta prueba abre un archivo DE VERDAD por la vía del simulador —el mismo
// selector de fichero de la Home— y comprueba las tres cosas.
import { chromium } from "playwright-core";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const p = await browser.newPage({ viewport: { width: 1400, height: 900 } });
// `elegirArchivo` prefiere el selector NATIVO (`showOpenFilePicker`), y ese no
// pasa por el evento `filechooser` de Playwright. Se retira para que la app
// caiga en su camino alternativo —el `<input type=file>` clásico—, que es el
// mismo que usan los navegadores sin esa API.
await p.addInitScript(() => {
  delete window.showOpenFilePicker;
});
const errores = [];
p.on("pageerror", (e) => errores.push(e.message));
const fallos = [];
const ok = (c, m) => { if (!c) fallos.push(m); console.log((c ? "✓ " : "✗ ") + m); };

// ── 1. EN EL BUILDER: una postura inconfundible, y el archivo ──────────────
console.log("\n── En el Builder: se posa y se guarda ──────────────────────");
await p.goto("http://127.0.0.1:4174/");
await p.waitForTimeout(1000);
await p.click("text=🛠 BUILDER"); await p.waitForTimeout(300);
await p.click("text=Crear nuevo proyecto"); await p.waitForTimeout(300);
await p.click(".wizard-carta:has-text('Profesional')"); await p.waitForTimeout(300);
await p.click(".wizard-carta:has-text('Canvas libre')"); await p.waitForTimeout(2200);

const guardado = await p.evaluate(async () => {
  const ed = window.exersuite.editor;
  for (let i = 0; i < 20 && !ed.humanFigure; i++) {
    await ed.addHumanFigure();
    await new Promise((r) => setTimeout(r, 350));
  }
  // Una máquina cualquiera, para que el proyecto no sea solo el maniquí.
  ed.insertarMaquina("banco-plano", new window.exersuite.THREE.Vector3(0, 0, 0));
  // Postura a mano: brazo derecho arriba y rodilla izquierda doblada. Ningún
  // gesto de fábrica la deja así, de modo que si aparece en el viewer es
  // porque VIAJÓ en el archivo.
  const j = ed.figureJoints();
  j.shoulderR.rotation.set(-1.25, 0, 0);
  j.elbowR.rotation.set(-0.9, 0, 0);
  j.kneeL.rotation.set(0.8, 0, 0);
  ed.reapoyarFigura?.();
  const data = ed.serialize();
  return { texto: JSON.stringify(data), pose: data.human?.pose?.shoulderR };
});
ok(Array.isArray(guardado.pose) && Math.abs(guardado.pose[0] + 71.6) < 1.5,
  `el archivo lleva la postura escrita (shoulderR = ${guardado.pose?.[0]}°)`);

const archivo = path.join(os.tmpdir(), "prueba-viewer-maniqui.exersuite.json");
fs.writeFileSync(archivo, guardado.texto);

// ── 2. EN EL VIEWER: se abre el archivo por la vía del simulador ───────────
console.log("\n── En el Viewer: se abre el archivo ────────────────────────");
await p.goto("http://127.0.0.1:4174/");
await p.waitForTimeout(1200);
await p.click("text=SIMULADOR"); await p.waitForTimeout(800);
// El selector de fichero es NATIVO y se crea al vuelo: se atiende su evento.
const [chooser] = await Promise.all([
  p.waitForEvent("filechooser"),
  p.click("text=Simular archivo"),
]);
await chooser.setFiles(archivo);
await p.waitForTimeout(5000);

const viewer = await p.evaluate(() => {
  const ed = window.exersuite.editor;
  const j = ed.figureJoints();
  const grados = (v) => +(v * 180 / Math.PI).toFixed(1);
  return {
    modoViewer: document.body.classList.contains("simulator-mode"),
    simulando: !!ed.isSimulating?.(),
    hayFigura: !!ed.humanFigure,
    shoulderR: j ? grados(j.shoulderR.rotation.x) : null,
    kneeL: j ? grados(j.kneeL.rotation.x) : null,
    piezas: ed.listObjects().length,
    hayPanel: !!document.getElementById("articulaciones"),
    panelVivo: !!ed.panelArticulaciones,
  };
});
ok(viewer.modoViewer, "estamos en el viewer (simulator-mode)");
ok(viewer.piezas > 0, `el proyecto llega con sus piezas (${viewer.piezas})`);
ok(!viewer.simulando,
  `el archivo se abre COMO SE GUARDÓ, sin arrancar la física sola `
  + `(simulando: ${viewer.simulando})`);
ok(viewer.hayFigura, "el maniquí está en la escena");
ok(Math.abs(viewer.shoulderR + 71.6) < 2 && Math.abs(viewer.kneeL - 45.8) < 2,
  `y CON LA POSTURA del Builder: hombro ${viewer.shoulderR}°, rodilla ${viewer.kneeL}°`);

// ── 3. EL PANEL DEL MANIQUÍ RESPONDE ──────────────────────────────────────
console.log("\n── El panel del maniquí ────────────────────────────────────");
ok(viewer.panelVivo && viewer.hayPanel,
  `la ventana del maniquí existe en el viewer (panel: ${viewer.hayPanel}, `
  + `enganchada: ${viewer.panelVivo})`);

const alternado = await p.evaluate(() => {
  const ed = window.exersuite.editor;
  const antes = ed.panelArticulaciones.visible();
  ed.panelArticulaciones.alternar();
  const despues = ed.panelArticulaciones.visible();
  ed.panelArticulaciones.alternar();
  return { antes, despues, vuelta: ed.panelArticulaciones.visible() };
});
ok(alternado.antes !== alternado.despues && alternado.vuelta === alternado.antes,
  `el botón la abre y la cierra (${alternado.antes} → ${alternado.despues} → ${alternado.vuelta})`);

// El botón de la barra de simulación es el que la abre de verdad.
const porLaBarra = await p.evaluate(() => {
  const ed = window.exersuite.editor;
  const antes = ed.panelArticulaciones.visible();
  // El botón de la ventana del maniquí en la barra es el del hueso.
  const b = [...document.querySelectorAll("#simbar button")]
    .find((n) => (n.textContent ?? "").includes("🦴"));
  if (!b) return { encontrado: false };
  b.click();
  return { encontrado: true, antes, despues: ed.panelArticulaciones.visible() };
});
ok(porLaBarra.encontrado && porLaBarra.antes !== porLaBarra.despues,
  `y el botón de la BARRA de simulación también `
  + `(${porLaBarra.antes} → ${porLaBarra.despues})`);

// ── 4. SE PUEDE ESCONDER EL MANIQUÍ ───────────────────────────────────────
console.log("\n── Esconder el maniquí ─────────────────────────────────────");
const quitar = await p.evaluate(async () => {
  const ed = window.exersuite.editor;
  const antes = !!ed.humanFigure;
  ed.removeHumanFigure();
  await new Promise((r) => setTimeout(r, 400));
  const sin = !!ed.humanFigure;
  // Y vuelve, que esconder no es perder.
  for (let i = 0; i < 20 && !ed.humanFigure; i++) {
    await ed.addHumanFigure();
    await new Promise((r) => setTimeout(r, 300));
  }
  return { antes, sin, devuelto: !!ed.humanFigure, piezas: ed.listObjects().length };
});
ok(quitar.antes && !quitar.sin,
  `el maniquí se quita de en medio (${quitar.antes} → ${quitar.sin})`);
ok(quitar.devuelto, "y se vuelve a poner");
ok(quitar.piezas > 0, `sin llevarse la máquina por delante (${quitar.piezas} piezas)`);

// ── 5. Y LA FÍSICA SIGUE SIENDO UN GESTO ──────────────────────────────────
console.log("\n── El ▶ de la barra arranca la simulación ──────────────────");
const play = await p.evaluate(async () => {
  const ed = window.exersuite.editor;
  await ed.toggleSimulation();
  await new Promise((r) => setTimeout(r, 1200));
  const corriendo = !!ed.isSimulating?.();
  ed.stopSimulation();
  return { corriendo };
});
ok(play.corriendo, "simular sigue disponible en el viewer");

// Una captura del viewer con la ventana abierta, para la vista.
await p.evaluate(() => {
  const ed = window.exersuite.editor;
  if (!ed.panelArticulaciones.visible()) ed.panelArticulaciones.alternar();
  ed.setViewPreset?.("isometrica");
  ed.requestRender();
});
await p.waitForTimeout(900);
await p.screenshot({ path: "salidas/viewer-maniqui.png" });

for (const e of errores) console.log("PAGEERROR " + e);
console.log(fallos.length === 0 && errores.length === 0
  ? "\nTODO OK" : `\n${fallos.length} fallos, ${errores.length} errores de página`);
await browser.close();
process.exit(fallos.length === 0 && errores.length === 0 ? 0 : 1);
