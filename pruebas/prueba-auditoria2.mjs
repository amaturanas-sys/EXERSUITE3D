// v0.2.90 · SEGUNDA AUDITORÍA: los once hallazgos, cada uno reproducido.
//
// Misma regla que la primera tanda: no se comprueba que el arreglo "esté
// puesto" —eso lo diría un grep— sino que el fallo YA NO PASA. Cada bloque
// monta la escena, hace lo que hacía el usuario y MIDE.
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
  if (ed.simulating) ed.stopSimulation?.();
  for (const c of ed.listCables()) ed.removeCable(c);
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  ed.select(null);
});

// ── A. La MANO del maniquí no se queda armada ─────────────────────────────
// `setGrabFigure(true)` se apodera del puntero: cada clic agarra un segmento.
// Cambiar de herramienta, Escape o cancelar dejaban el modo encendido y el
// lienzo seguía manipulando la figura sin nada en pantalla que lo dijera.
await limpiar();
const a = await p.evaluate(() => {
  const ed = window.exersuite.editor;
  const r = {};
  ed.setGrabFigure(true);
  r.arma = ed.isGrabFigure?.() === true || ed.grabFigureTool === true;
  ed.cancelarHerramientas();
  r.trasCancelar = ed.grabFigureTool === false;
  ed.setGrabFigure(true);
  ed.setHerramienta("mover");
  r.trasHerramienta = ed.grabFigureTool === false;
  return r;
});
ok(a.arma, "A · la mano del maniquí se enciende");
ok(a.trasCancelar, "A · cancelar herramientas la apaga");
ok(a.trasHerramienta, "A · elegir otra herramienta la apaga");

const aEsc = await p.evaluate(() => {
  const ed = window.exersuite.editor;
  ed.setGrabFigure(true);
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  return ed.grabFigureTool === false;
});
ok(aEsc, "A · Escape la apaga");

// ── B. El inspector no habla de piezas que ya no existen ───────────────────
await limpiar();
const b = await p.evaluate(async () => {
  const ed = window.exersuite.editor;
  const o1 = ed.addComponent("prim-box");
  const o2 = ed.addComponent("prim-box");
  ed.select(null);
  ed.toggleMulti(o1); ed.toggleMulti(o2);
  await new Promise((r) => setTimeout(r, 60));
  const texto = document.querySelector("#inspector")?.textContent ?? "";
  const anuncia = /2 piezas seleccionadas|2 pieces selected/.test(texto);
  ed.deleteSelection();
  await new Promise((r) => setTimeout(r, 60));
  const despues = document.querySelector("#inspector")?.textContent ?? "";
  return { anuncia, sigue: /piezas seleccionadas|pieces selected/.test(despues) };
});
ok(b.anuncia, "B · con dos piezas marcadas el inspector lo dice");
ok(!b.sigue, "B · y al borrarlas deja de decirlo");

// ── C. Ctrl+D con multiselección duplica de verdad ────────────────────────
await limpiar();
const c = await p.evaluate(() => {
  const ed = window.exersuite.editor;
  const o1 = ed.addComponent("prim-box");
  const o2 = ed.addComponent("prim-cylinder");
  ed.select(null);
  ed.toggleMulti(o1); ed.toggleMulti(o2);
  const antes = ed.objects.size;
  ed.duplicateSelected();
  return { antes, despues: ed.objects.size, marcadas: ed.multiSel.size };
});
ok(c.despues === c.antes + 2, `C · Ctrl+D duplica las DOS piezas (${c.antes} → ${c.despues})`);
ok(c.marcadas === 2, "C · y deja marcadas las copias, listas para mover");

// ── D. El carril derecho tiene un dueño ───────────────────────────────────
// El panel de la roldana se añadía al <body> con la clase que repliega la
// ventana del maniquí, y sólo él sabía quitarla: cambiar de herramienta lo
// dejaba colgado, con los botones muertos y el maniquí escondido.
await limpiar();
const d = await p.evaluate(async () => {
  const ed = window.exersuite.editor;
  const viga = ed.addComponent("prim-box");
  viga.params = { kind: "box", width: 80, height: 8, depth: 8 };
  viga.rebuildGeometry();
  ed.beginRoldana?.();
  // El panel lo abre la paleta al elegir el punto; aquí se provoca el mismo
  // estado desde el módulo del carril, que es lo que se está probando.
  const mod = window.exersuite.dialogoDerecha;
  if (!mod) return { salta: true };
  let cerrado = false;
  mod.abrirDialogoDerecha(() => { cerrado = true; });
  const abierto = document.body.classList.contains("dialogo-derecha");
  ed.setHerramienta("mover");
  await new Promise((r) => setTimeout(r, 60));
  return {
    abierto,
    cerrado,
    claseFuera: !document.body.classList.contains("dialogo-derecha"),
  };
});
if (d.salta) {
  ok(false, "D · el módulo del carril derecho no está expuesto para la prueba");
} else {
  ok(d.abierto, "D · abrir el panel repliega la ventana del maniquí");
  ok(d.cerrado, "D · cambiar de herramienta CIERRA el panel abierto");
  ok(d.claseFuera, "D · y devuelve la ventana del maniquí");
}

// ── E. Duplicar/pegar una máquina SUSTITUIDA la conserva ──────────────────
// Una máquina estándar reemplazada por el modelo del usuario vive como una
// caja anclada con `modeloMaquina` y la geometría del modelo encima. Copiarla
// sólo llevaba los `params`: la copia salía como la caja gris de debajo.
await limpiar();
const e = await p.evaluate(async () => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const cm = window.exersuiteModels;
  const clave = "maquina:banco-plano";
  // Un OBJ mínimo: un tetraedro. Basta con que NO sea la caja del soporte.
  const obj = [
    "v 0 0 0", "v 40 0 0", "v 0 60 0", "v 0 0 30",
    "f 1 2 3", "f 1 2 4", "f 1 3 4", "f 2 3 4", "",
  ].join("\n");
  await cm.setUserModel(clave, new File([obj], "prueba.obj", { type: "text/plain" }));
  ed.insertarMaquina("banco-plano", new T.Vector3(0, 0, 0));
  const orig = [...ed.objects.values()].find((o) => o.modeloMaquina === clave);
  if (!orig) { await cm.clearUserModel(clave); return { salta: true }; }
  ed.select(orig);
  ed.duplicateSelected();
  const copias = [...ed.objects.values()].filter((o) => o !== orig);
  const dup = copias[copias.length - 1];
  // Y por el portapapeles, que es el otro camino.
  ed.select(orig);
  ed.copySelection();
  ed.pasteClipboard();
  const pegada = [...ed.objects.values()].find(
    (o) => o !== orig && o !== dup,
  );
  const vertices = (o) => o?.mesh.geometry.attributes.position.count ?? 0;
  const r = {
    origenTiene: orig.modeloMaquina === clave,
    dupTiene: dup?.modeloMaquina === clave,
    pegTiene: pegada?.modeloMaquina === clave,
    dupMalla: vertices(dup) === vertices(orig),
    pegMalla: vertices(pegada) === vertices(orig),
  };
  await cm.clearUserModel(clave);
  return r;
});
if (e.salta) {
  ok(false, "E · no se pudo montar la máquina sustituida");
} else {
  ok(e.origenTiene, "E · la máquina insertada lleva el modelo del usuario");
  ok(e.dupTiene, "E · duplicarla conserva el modelo");
  ok(e.dupMalla, "E · y la copia tiene la MALLA del modelo, no la caja gris");
  ok(e.pegTiene, "E · pegarla conserva el modelo");
  ok(e.pegMalla, "E · y la pegada tiene la malla del modelo");
}

// ── F. Dos tramos de columna apilados son UNA guía ────────────────────────
// El recorrido permitido por cada tubo se INTERSECABA. Con dos tramos
// contiguos la intersección es vacía y el carro se quedaba sin guía; con el
// tramo corto arriba, además, pasaba por espaciador y frenaba en el empalme.
await limpiar();
const f = await p.evaluate(async () => {
  const ed = window.exersuite.editor;
  const tubo = (alto, y) => {
    const o = ed.addComponent("prim-box");
    o.params = { kind: "box", width: 4, height: alto, depth: 4 };
    o.rebuildGeometry();
    o.physics = { ...o.physics, fixed: true, massKg: 0 };
    o.mesh.position.set(0, y, 0);
    return o;
  };
  tubo(130, 115);           // tramo inferior: 50 … 180
  tubo(80, 220);            // tramo superior CORTO: 180 … 260
  // La pila arranca ARRIBA del todo, ensartada sólo en el tramo corto: el
  // inferior aún no la toca, y es el que tiene que prolongar el recorrido.
  const pila = ed.addComponent("pila-pesos");
  pila.mesh.position.set(0, 245, 0);
  await ed.toggleSimulation();
  const guiada = ed.physics.guias.some((g) => g.body === ed.physics.bodies.get(pila.id)?.body);
  for (let i = 0; i < 400; i++) ed.physics.step(1 / 60);
  const fin = pila.mesh.position.clone();
  ed.toggleSimulation();
  return {
    guiada,
    y: +fin.y.toFixed(1),
    deriva: +Math.hypot(fin.x, fin.z).toFixed(1),
  };
});
ok(f.guiada, "F · el carro queda GUIADO por los dos tramos apilados");
// El empalme está en y=180. Antes el tramo corto de arriba pasaba por
// espaciador, y el de abajo —que la pila aún no toca— no contaba: se quedaba
// sin guía y se desplomaba. Ahora la torre es UNA, del pie a la punta.
ok(f.y < 170, `F · CRUZA el empalme de los dos tramos (y=${f.y})`);
ok(f.y > 88 && f.y < 102, `F · y se detiene en el pie de la torre, y≈95 (${f.y})`);
ok(f.deriva < 2, `F · sin salirse de la recta de la torre (deriva ${f.deriva} cm)`);

// ── G. Dos nodos de cable en el MISMO cuerpo ──────────────────────────────
// Un aparejo 2:1 hecho con una sola pieza: el cable entra por un lado del
// bloque y sale por el otro. Los solventes escribían la velocidad del cuerpo
// una vez por nodo y la SEGUNDA pisaba a la primera, con lo que el bloque
// recibía el tirón del tramo interno —horizontal— y se iba de lado.
await limpiar();
const g = await p.evaluate(async () => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const ancla = (x) => {
    const o = ed.addComponent("prim-box");
    o.params = { kind: "box", width: 10, height: 10, depth: 10 };
    o.rebuildGeometry();
    o.physics = { ...o.physics, fixed: true, massKg: 0 };
    o.mesh.position.set(x, 200, 0);
    return o;
  };
  const izq = ancla(-60);
  const der = ancla(60);
  const bloque = ed.addComponent("contrapeso");
  bloque.mesh.position.set(0, 100, 0);
  ed.createCable([
    { objectId: izq.id, local: { x: 0, y: 0, z: 0 } },
    { objectId: bloque.id, local: { x: -10, y: 0, z: 0 } },
    { objectId: bloque.id, local: { x: 10, y: 0, z: 0 } },
    { objectId: der.id, local: { x: 0, y: 0, z: 0 } },
  ]);
  await ed.toggleSimulation();
  const y0 = bloque.mesh.position.y;
  for (let i = 0; i < 300; i++) ed.physics.step(1 / 60);
  const fin = bloque.mesh.position.clone();
  ed.toggleSimulation();
  return {
    deriva: +Math.hypot(fin.x, fin.z).toFixed(1),
    caida: +(y0 - fin.y).toFixed(1),
    finito: Number.isFinite(fin.x) && Number.isFinite(fin.y),
  };
});
ok(g.finito, "G · el aparejo de un solo cuerpo no produce NaN");
ok(g.deriva < 5, `G · el bloque cuelga a plomo, no se va de lado (deriva ${g.deriva} cm)`);
ok(g.caida < 12, `G · y el cable lo sostiene (cae ${g.caida} cm)`);

// ── I. Acortar un pilar trazado lo ACORTA ─────────────────────────────────
// El largo de una pieza recta es el de su POLILÍNEA. Al tirar de la punta
// hacia dentro, los nodos de en medio quedaban PASADOS del extremo: la
// polilínea iba, volvía y volvía a ir, y el pilar crecía al acortarlo.
await limpiar();
const i = await p.evaluate(() => {
  const ed = window.exersuite.editor;
  const o = ed.addComponent("pilar-linea");
  const largo = (m) => {
    m.mesh.geometry.computeBoundingBox();
    const b = m.mesh.geometry.boundingBox;
    return +(b.max.y - b.min.y).toFixed(1);
  };
  const antes = largo(o);
  ed.select(o);
  ed.beginBendNodes();
  ed.bendNodeIndex = o.params.path.length - 1;
  ed.nudgeBendNode(0, -70, 0); // la punta baja 70 cm: quedan 30 de pilar
  const despues = largo(o);
  const nodos = o.params.path.map((n) => +n[1].toFixed(1));
  // Invariante: la POLILÍNEA mide lo mismo que la cuerda entre sus extremos.
  // Si un nodo se queda pasado, la polilínea va y vuelve y mide de más.
  const P = o.params.path;
  let poli = 0;
  for (let k = 0; k < P.length - 1; k++) {
    poli += Math.hypot(P[k + 1][0] - P[k][0], P[k + 1][1] - P[k][1], P[k + 1][2] - P[k][2]);
  }
  const cuerda = Math.hypot(
    P[P.length - 1][0] - P[0][0],
    P[P.length - 1][1] - P[0][1],
    P[P.length - 1][2] - P[0][2],
  );
  ed.endBendNodes();
  return { antes, despues, nodos, poli: +poli.toFixed(1), cuerda: +cuerda.toFixed(1) };
});
ok(Math.abs(i.antes - 100) < 2, `I · el pilar trazado nace de 100 cm (${i.antes})`);
ok(i.despues < i.antes, `I · al acortarlo por la punta MENGUA (${i.antes} → ${i.despues})`);
ok(Math.abs(i.despues - 30) < 2, `I · y mide lo que se pidió: 30 cm (${i.despues})`);
ok(
  i.nodos.every((v, k, arr) => k === 0 || v >= arr[k - 1] - 0.01),
  `I · con los nodos repartidos en orden (${i.nodos.join(", ")})`,
);
ok(
  Math.abs(i.poli - i.cuerda) < 0.5,
  `I · la polilínea no se dobla sobre sí misma (${i.poli} vs cuerda ${i.cuerda})`,
);

// ── J. La mano de simulación no queda armada tras posar ───────────────────
// Posar la máquina enciende la mano a propósito. Al salir se quedaba puesta,
// y el siguiente ▶ arrancaba con la máquina viva bajo el cursor.
await limpiar();
const j = await p.evaluate(async () => {
  const ed = window.exersuite.editor;
  const o = ed.addComponent("disco-peso");
  o.physics = { ...o.physics, fixed: false };
  ed.setSimHerramienta("orbitar");
  await ed.iniciarPoseMaquina();
  const posando = ed.getSimHerramienta();
  ed.terminarPoseMaquina();
  return { posando, despues: ed.getSimHerramienta() };
});
ok(j.posando === "mano", "J · posar la máquina entrega la mano");
ok(j.despues === "orbitar", "J · y al salir devuelve la herramienta que había");

// ── H. Volver a la Home suelta TODOS los oyentes ──────────────────────────
// El render bajo demanda cuelga trece oyentes de `window` y del lienzo, y el
// cierre sólo soltaba los seis con nombre: el editor anterior seguía pidiendo
// cuadros sobre un renderer destruido. Va al final: deja el editor cerrado.
const h = await p.evaluate(() => {
  const ed = window.exersuite.editor;
  const registrados = ed.oyentes.length;
  ed.dispose();
  const quedan = ed.oyentes.length;
  ed.renderDemand = 0;
  window.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
  window.dispatchEvent(new WheelEvent("wheel", { bubbles: true }));
  return { registrados, quedan, demanda: ed.renderDemand };
});
ok(h.registrados >= 13, `H · el render bajo demanda registra sus oyentes (${h.registrados})`);
ok(h.quedan === 0, "H · cerrar el editor los suelta todos");
ok(h.demanda === 0, "H · y un editor cerrado ya no pide cuadros");

for (const e2 of errores) console.log("PAGEERROR " + e2);
console.log(fallos.length === 0 && errores.length === 0
  ? "\nTODO OK" : `\n${fallos.length} fallos, ${errores.length} errores de página`);
await browser.close();
process.exit(fallos.length === 0 && errores.length === 0 ? 0 : 1);
