// v0.2.77 · Los fallos de la auditoría adversarial, cada uno reproducido.
//
// Uno por hallazgo confirmado, con la secuencia que lo destapó. No comprueban
// que el arreglo "esté puesto" —eso lo diría un grep— sino que el fallo YA NO
// PASA: cada bloque monta la escena, hace lo que hacía el usuario y mide.
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

const limpiar = () => p.evaluate(() => {
  const ed = window.exersuite.editor;
  if (ed.simulating) ed.stopSimulation();
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
});

// ── 1. «+ Bisagra» apaga la herramienta en curso ───────────────────────────
const a = await p.evaluate(() => {
  const ed = window.exersuite.editor;
  ed.beginPlacaDentada(12.5);
  const antes = ed.dentadaMode === true;
  ed.beginConnect("revolute");
  return { antes, dentadaSigue: ed.dentadaMode === true, conectando: ed.connectMode != null };
});
ok(a.antes, "la herramienta de placa dentada se enciende");
ok(!a.dentadaSigue && a.conectando,
  "«+ Bisagra» apaga la herramienta en curso en vez de dejarla comiéndose el clic");

// ── 2. Nuevo proyecto apaga la roldana y se lleva su línea guía ────────────
const b = await p.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const viga = ed.addComponent("pilar");
  viga.mesh.position.set(0, 100, 0);
  ed.beginRoldana();
  ed.elegirEstructuraRoldana(viga);
  const conLinea = ed.roldanaAxisLine != null;
  ed.clearScene();
  return { conLinea, modo: ed.roldanaMode === true, linea: ed.roldanaAxisLine != null };
});
ok(b.conLinea, "la roldana en fase 2 dibuja su línea guía");
ok(!b.modo && !b.linea,
  "«Nuevo proyecto» apaga la roldana y retira su línea, sin dejarla flotando");

// ── 3. La herramienta de línea no planta al orbitar ────────────────────────
await limpiar();
await p.evaluate(() => window.exersuite.editor.beginLine("beam", { kind: "beam", width: 5, depth: 5 }));
const antesLinea = await p.evaluate(() => window.exersuite.editor.objects.size);
// Con el ratón de verdad: pulsar, recorrer media pantalla y soltar. Es el
// gesto de orbitar, y antes plantaba el punto de inicio nada más pulsar.
await p.mouse.move(600, 400);
await p.mouse.down();
await p.mouse.move(700, 450, { steps: 8 });
await p.mouse.move(760, 500, { steps: 8 });
await p.mouse.up();
const trasArrastre = await p.evaluate(() => window.exersuite.editor.linePendingA != null);
ok(!trasArrastre, "arrastrar para orbitar NO fija el punto de inicio de la línea");

// Y el botón derecho, que solo encuadra, tampoco toca nada.
await p.mouse.move(600, 400);
await p.mouse.down({ button: "right" });
await p.mouse.up({ button: "right" });
const trasDerecho = await p.evaluate(() => window.exersuite.editor.linePendingA != null);
ok(!trasDerecho, "y el botón derecho (encuadre) tampoco");

// Un CLIC limpio sí lo fija: el arreglo no puede haber inutilizado la
// herramienta, que sería cambiar un fallo por otro.
await p.mouse.click(600, 400);
const trasClic = await p.evaluate(() => window.exersuite.editor.linePendingA != null);
ok(trasClic, "pero un clic limpio SÍ fija el punto: la herramienta sigue sirviendo");
const despuesLinea = await p.evaluate(() => {
  const ed = window.exersuite.editor;
  ed.cancelLine();
  return ed.objects.size;
});
ok(antesLinea === despuesLinea, "y no se plantó geometría por el camino");

// ── 4. El ⌀ de agujero no puede reventar el perfil ─────────────────────────
await limpiar();
const d = await p.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const v = ed.addComponent("pilar-linea");
  ed.select(v);
  const campo = [...document.querySelectorAll("#inspector .sub")]
    .find((s) => /agujero/i.test(s.textContent))?.querySelector("input");
  if (!campo) return { hay: false };
  campo.value = "40";                       // el perfil son 5 cm
  campo.dispatchEvent(new Event("change", { bubbles: true }));
  const caja = new T.Box3().setFromObject(v.mesh);
  return { hay: true, diam: v.params.holeDiameter, alto: caja.max.y - caja.min.y,
           ancho: caja.max.x - caja.min.x, fondo: caja.max.z - caja.min.z };
});
ok(d.hay, "el inspector ofrece el ⌀ de agujero del perfil");
if (d.hay) {
  ok(d.diam <= 5, `pedir 40 cm de agujero en un perfil de 5 se acota a ${d.diam} cm`);
  ok(Math.max(d.ancho, d.fondo) < 8,
    `y la viga no engorda su caja (${d.ancho.toFixed(1)} × ${d.fondo.toFixed(1)} cm de sección)`);
}

// ── 5. Mover a mano avisa por el bus ───────────────────────────────────────
await limpiar();
const e = await p.evaluate(() => {
  const ed = window.exersuite.editor;
  const o = ed.addComponent("pilar");
  ed.select(o);
  let avisos = 0;
  ed.bus.on("objectTransformed", () => avisos++);
  const campo = document.querySelector("#inspector input[data-pos='y']");
  if (!campo) return { hay: false };
  campo.value = "77";
  campo.dispatchEvent(new Event("change", { bubbles: true }));
  return { hay: true, avisos, y: o.mesh.position.y, sucio: ed.isDirty?.() };
});
ok(e.hay && Math.abs(e.y - 77) < 0.01, "escribir una coordenada mueve la pieza");
ok(e.hay && e.avisos > 0,
  "y AVISA por el bus, así que cadenas y cables la siguen y el proyecto queda sucio");

// ── 6. Cargar un .json que no es un proyecto no vacía la escena ────────────
const f = await p.evaluate(async () => {
  const ed = window.exersuite.editor;
  ed.addComponent("pilar");
  const antes = ed.objects.size;
  let lanzo = false;
  try { await ed.loadProject({ piezas: [], esto: "es un prefab" }); }
  catch { lanzo = true; }
  return { antes, despues: ed.objects.size, lanzo,
           valida: window.exersuite.editor.constructor.pareceProyecto({ version: 1, objects: [] }) };
});
ok(f.lanzo, "cargar un .json que no es un proyecto se rechaza");
ok(f.antes === f.despues, `y la escena sigue intacta (${f.despues} piezas, no 0)`);
ok(f.valida, "un proyecto de verdad sí se reconoce");

// ── 7. Las uniones siguen al grupo movido con flechas ──────────────────────
//
// El escenario del hallazgo: una máquina AGRUPADA con bisagras. Con el gizmo
// las uniones ya seguían al grupo; con las flechas se quedaban clavadas donde
// estaban, y al simular la bisagra pivotaba alrededor del punto viejo.
await limpiar();
const g = await p.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const A = ed.addComponent("pilar"); A.mesh.position.set(0, 50, 0);
  const B = ed.addComponent("base-soporte"); B.mesh.position.set(0, 100, 0);
  const j = ed.connect(A.id, B.id, "revolute", new T.Vector3(0, 75, 0));
  if (!j) return { hay: false };
  const gid = ed.createGroupFromIds([A.id, B.id]);
  if (!gid) return { hay: false, motivo: "no se pudo agrupar" };
  ed.select(null);
  ed.selectGroup(gid);
  const ids = ed.getSelectionIds();
  const an0 = j.anchor.y;
  const yA0 = A.mesh.position.y;
  const yB0 = B.mesh.position.y;
  ed.nudgeSelection(0, 30, 0);
  return {
    hay: true, enGrupo: ids.length,
    dA: A.mesh.position.y - yA0, dB: B.mesh.position.y - yB0,
    dAncla: j.anchor.y - an0,
  };
});
ok(g.hay && g.enGrupo === 2, `las dos piezas quedan agrupadas (${g.enGrupo})`);
if (g.hay) {
  ok(Math.abs(g.dA - 30) < 0.5 && Math.abs(g.dB - 30) < 0.5,
    `el grupo entero se mueve con las flechas (${g.dA} y ${g.dB} cm)`);
  ok(Math.abs(g.dAncla - 30) < 0.5,
    `y el ancla de la unión va CON él, no se queda clavada (${g.dAncla} cm)`);
}

// ── 8. Los puntos de partida viajan y no se cuelan ─────────────────────────
await limpiar();
const h = await p.evaluate(async () => {
  const ed = window.exersuite.editor;
  ed.addComponent("pilar");
  const n = ed.guardarPartida("Prueba");
  const conUna = ed.listaPartidas().length;
  const proy = ed.serialize();
  const viaja = (proy.partidas ?? []).some((x) => x.nombre === n);
  ed.clearScene();
  const trasVaciar = ed.listaPartidas().length;
  await ed.loadProject(proy);
  return { conUna, viaja, trasVaciar, trasCargar: ed.listaPartidas().length };
});
ok(h.conUna === 1, "se guarda un punto de partida");
ok(h.viaja, "y viaja en el proyecto serializado");
ok(h.trasVaciar === 0, "«Nuevo proyecto» se lleva los del proyecto anterior");
ok(h.trasCargar === 1, "y al cargar vuelven los suyos");

// ── 9. Manipular repliega la interfaz ──────────────────────────────────────
await limpiar();
const i = await p.evaluate(async () => {
  const ed = window.exersuite.editor;
  const o = ed.addComponent("disco-peso");
  o.physics = { ...o.physics, fixed: false };
  // La máquina se posa PARA alguien (v0.2.91): sin maniquí no se entra.
  await ed.addHumanFigure();
  await new Promise((r) => setTimeout(r, 700));
  await ed.iniciarPoseMaquina?.();
  const replegada = document.body.classList.contains("simulating");
  ed.terminarPoseMaquina?.();
  return { replegada, vuelve: !document.body.classList.contains("simulating") };
});
ok(i.replegada, "«▶ Manipular» repliega la interfaz de edición, como al simular");
ok(i.vuelve, "y al salir vuelve");

for (const e2 of errores) console.log("PAGEERROR " + e2);
console.log(fallos.length === 0 && errores.length === 0
  ? "\nTODO OK" : `\n${fallos.length} fallos, ${errores.length} errores de página`);
await browser.close();
process.exit(fallos.length === 0 && errores.length === 0 ? 0 : 1);
