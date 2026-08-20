// v0.3.2 · RETIRAR DEL LISTADO NO ES BORRAR.
//
// El diseñador mandó quitar del inventario las piezas que no usa nadie —ni una
// máquina, ni un prefab, ni una prueba— y puso una condición encima:
//
//   «la eliminación de estos elementos de la biblioteca no deberá afectar los
//    prefabs que ya los tienen incorporados, ni tampoco afectar el
//    comportamiento y físicas de dichos prefabs».
//
// Eso es exactamente lo que separa RETIRAR de BORRAR, y es lo que esta prueba
// vigila. La pieza sale de «Piezas disponibles» pero su definición sigue en la
// biblioteca, así que:
//
//   · un proyecto guardado que la lleve se sigue abriendo,
//   · un prefab que la lleve se sigue insertando,
//   · y la pieza pesa lo mismo, mide lo mismo y se comporta igual en la física.
//
// Las medidas de `HUELLA` se tomaron con la versión ANTERIOR al retiro: son el
// antes contra el que se compara el después.
import { chromium } from "playwright-core";

// tamaño [x,y,z] en cm · masa en kg · si está anclada · material · vértices
const HUELLA = {
  "soporte-peso":     { tam: [30, 8, 12],      masa: 0,    fijo: true,  material: "acero-negro",    verts: 24 },
  "montante-pr":      { tam: [7, 110, 7],      masa: 0,    fijo: true,  material: "acero-negro",    verts: 13476 },
  "correa-seguridad": { tam: [120, 0.6, 4],    masa: 0.3,  fijo: false, material: "nylon",          verts: 24 },
  "barra-fondos":     { tam: [40, 4, 4],       masa: 0,    fijo: true,  material: "acero-negro",    verts: 196 },
  "landmine":         { tam: [5.2, 18, 5.2],   masa: 1,    fijo: false, material: "acero-negro",    verts: 196 },
  "pivote":           { tam: [2.4, 8, 2.4],    masa: 0.2,  fijo: false, material: "turquesa",       verts: 196 },
  "pop-pin":          { tam: [1.6, 14, 1.6],   masa: 0.1,  fijo: false, material: "acero-pulido",   verts: 196 },
  "carro-cable":      { tam: [14, 16, 10],     masa: 1.5,  fijo: false, material: "acero-negro",    verts: 24 },
  "brazo-ajustable":  { tam: [8, 80, 8],       masa: 3,    fijo: false, material: "acero-negro",    verts: 24 },
  "engranaje":        { tam: [10, 2, 10],      masa: 0.6,  fijo: false, material: "acero",          verts: 196 },
  "cadena-seguridad": { tam: [1.4, 90, 1.4],   masa: 0.5,  fijo: false, material: "acero-negro",    verts: 196 },
  "resorte":          { tam: [6, 30, 6],       masa: 0.3,  fijo: false, material: "acero",          verts: 196 },
  "bloque-peso":      { tam: [30, 4, 18],      masa: 5,    fijo: false, material: "hierro-fundido", verts: 1236 },
  "micro-disco":      { tam: [12, 1.2, 12],    masa: 1.25, fijo: false, material: "hierro-fundido", verts: 196 },
  "agarradera":       { tam: [19, 19, 3],      masa: 0.4,  fijo: false, material: "goma",           verts: 561 },
  "cuerda-triceps":   { tam: [2.4, 60, 2.4],   masa: 0.3,  fijo: false, material: "nylon",          verts: 196 },
  "barra-jalon":      { tam: [2.8, 120, 2.8],  masa: 2,    fijo: false, material: "cromo",          verts: 196 },
  "correa-tobillo":   { tam: [20, 8, 1],       masa: 0.2,  fijo: false, material: "nylon",          verts: 24 },
};
const IDS = Object.keys(HUELLA);

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

// ── 1. YA NO SE LISTAN ─────────────────────────────────────────────────────
console.log("\n── Fuera del inventario ────────────────────────────────────");
const listadas = await p.evaluate((ids) => {
  const textos = [...document.querySelectorAll(".palette-item, .comp-item, [data-comp-id]")]
    .map((n) => n.dataset?.compId ?? n.textContent ?? "");
  const todo = textos.join("");
  return ids.filter((id) => todo.includes(id));
}, IDS);
ok(listadas.length === 0,
  `ninguna de las ${IDS.length} retiradas aparece en la paleta `
  + `(${listadas.length === 0 ? "0" : listadas.join(", ")})`);

// ── 2. PERO SE SIGUEN CONSTRUYENDO, IDÉNTICAS ──────────────────────────────
console.log("\n── La definición sigue viva ────────────────────────────────");
const medido = await p.evaluate((ids) => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  const out = {};
  for (const id of ids) {
    for (const o of [...ed.listObjects()]) ed.removeObject(o);
    let o = null;
    try { o = ed.addComponent(id); } catch (e) { out[id] = { error: String(e).slice(0, 80) }; continue; }
    if (!o) { out[id] = { error: "addComponent devolvió null" }; continue; }
    o.mesh.updateMatrixWorld(true);
    const b = new T.Box3().setFromObject(o.mesh).getSize(new T.Vector3());
    out[id] = {
      tam: [+b.x.toFixed(2), +b.y.toFixed(2), +b.z.toFixed(2)],
      masa: o.physics?.massKg ?? null,
      fijo: !!o.physics?.fixed,
      material: o.materialId ?? null,
      verts: o.mesh.geometry?.getAttribute("position")?.count ?? 0,
    };
  }
  return out;
}, IDS);

let iguales = 0;
const distintas = [];
for (const id of IDS) {
  const a = HUELLA[id], b = medido[id];
  const mismo = b && !b.error
    && a.tam.every((v, i) => Math.abs(v - b.tam[i]) < 0.01)
    && a.masa === b.masa && a.fijo === b.fijo
    && a.material === b.material && a.verts === b.verts;
  if (mismo) iguales++; else distintas.push(`${id}: ${JSON.stringify(b)}`);
}
ok(iguales === IDS.length,
  `las ${IDS.length} se siguen construyendo con su MISMO tamaño, masa, anclaje, `
  + `material y malla (${iguales} de ${IDS.length})`);
for (const d of distintas) console.log("    " + d);

// ── 3. UN PREFAB QUE LAS LLEVE SIGUE FUNCIONANDO ───────────────────────────
//
// Se arma un conjunto con TRES retiradas —una anclada, una que cae y una
// pesada—, se exporta como prefab, se borra todo y se reinserta. Lo que se
// comprueba no es que el archivo se escriba: es que al volver las piezas
// conservan su masa y su anclaje, que es lo que decide cómo se comportan.
console.log("\n── Un prefab que las lleva: ida y vuelta ───────────────────");
const viaje = await p.evaluate(async () => {
  const ed = window.exersuite.editor;
  for (const o of [...ed.listObjects()]) ed.removeObject(o);
  const ids = ["soporte-peso", "bloque-peso", "landmine"];
  const puestos = ids.map((id, i) => {
    const o = ed.addComponent(id);
    o.mesh.position.set(i * 40 - 40, 60, 0);
    return o;
  });
  const antes = puestos.map((o) => ({
    comp: o.componentId, masa: o.physics.massKg, fijo: !!o.physics.fixed,
  }));
  // EL CICLO DE VERDAD, no uno inventado para la prueba: `serializarPrefab` es
  // lo que ejecuta «Exportar prefab» e `insertarPrefab` lo que ejecuta
  // «Insertar prefab». Si retirar una pieza rompiera ese viaje, se rompe aquí.
  const { serializarPrefab, parsearPrefab } = window.exersuite.prefabIO;
  // `select` REEMPLAZA la selección; para varias piezas hay que ir sumándolas
  // con la multiselección, que es lo que hace Mayús+toque en el visor.
  puestos.forEach((o) => ed.toggleMulti(o));
  const texto = serializarPrefab(ed, "prueba-retiradas");
  if (!texto) return { error: "serializarPrefab devolvió null" };
  for (const o of [...ed.listObjects()]) ed.removeObject(o);
  const vacio = ed.listObjects().length;
  const informe = parsearPrefab(texto);
  if (!informe?.archivo) return { error: "parsearPrefab no devolvió el archivo" };
  ed.insertarPrefab(informe.archivo);
  await new Promise((r) => setTimeout(r, 400));
  const vuelta = ed.listObjects()
    .filter((o) => ids.includes(o.componentId))
    .map((o) => ({ comp: o.componentId, masa: o.physics.massKg, fijo: !!o.physics.fixed }));
  return { antes, vuelta, vacio, n: ed.listObjects().length,
           // LA SEÑAL MÁS AFILADA: `desconocidas` son las piezas cuyo id la
           // biblioteca ya no resuelve, y que el prefab EXCLUYE al insertar.
           // Si retirar del listado fuera borrar, las tres saldrían aquí.
           desconocidas: informe.desconocidas ?? [],
           advertencias: informe.advertencias ?? [] };
});
ok(!viaje.error, `el ciclo exportar → insertar se completa (${viaje.error ?? "sin error"})`);
ok(viaje.vacio === 0, `la escena se vacía antes de reinsertar (${viaje.vacio} piezas)`);
ok((viaje.desconocidas ?? []).length === 0,
  `la biblioteca SIGUE RESOLVIENDO sus ids: ninguna queda excluida por desconocida `
  + `(${viaje.desconocidas?.length ? viaje.desconocidas.join(", ") : "0"})`);
ok(viaje.vuelta.length === viaje.antes.length && viaje.vuelta.every(Boolean),
  `el prefab vuelve con sus ${viaje.antes.length} piezas (${viaje.vuelta.filter(Boolean).length})`);
const igualFisica = viaje.vuelta.every((v, i) => v
  && v.comp === viaje.antes[i].comp
  && v.masa === viaje.antes[i].masa
  && v.fijo === viaje.antes[i].fijo);
ok(igualFisica,
  "y cada una vuelve con su MISMA masa y su mismo anclaje — que es lo que "
  + `decide su física (${JSON.stringify(viaje.vuelta)})`);

// ── 4. Y EN LA SIMULACIÓN SE COMPORTAN COMO SIEMPRE ────────────────────────
//
// La condición del diseñador habla de comportamiento, no solo de números: una
// pieza anclada no puede caerse y una con masa tiene que caer. Se corre la
// física de verdad y se mira.
console.log("\n── En la simulación ────────────────────────────────────────");
const fisica = await p.evaluate(async () => {
  const ed = window.exersuite.editor;
  for (const o of [...ed.listObjects()]) ed.removeObject(o);
  const anclada = ed.addComponent("soporte-peso");   // masa 0, fijo
  const suelta = ed.addComponent("bloque-peso");     // 5 kg, cae
  anclada.mesh.position.set(-40, 40, 0);
  suelta.mesh.position.set(40, 120, 0);
  const y0 = { anclada: anclada.mesh.position.y, suelta: suelta.mesh.position.y };
  // `toggleSimulation` es la puerta de verdad: espera a que cargue el motor
  // antes de dar el primer paso. Llamando a `startSimulation` a pelo, la caída
  // medida eran 2 cm porque la física apenas había arrancado.
  await ed.toggleSimulation();
  await new Promise((r) => setTimeout(r, 3000));
  const y1 = { anclada: anclada.mesh.position.y, suelta: suelta.mesh.position.y };
  ed.stopSimulation();
  await new Promise((r) => setTimeout(r, 600));
  const y2 = { anclada: anclada.mesh.position.y, suelta: suelta.mesh.position.y };
  return { y0, y1, y2 };
});
ok(Math.abs(fisica.y1.anclada - fisica.y0.anclada) < 0.5,
  `la pieza ANCLADA no se mueve al simular (${fisica.y0.anclada} → ${fisica.y1.anclada} cm)`);
ok(fisica.y0.suelta - fisica.y1.suelta > 40,
  `la pieza CON MASA cae (${fisica.y0.suelta} → ${fisica.y1.suelta.toFixed(1)} cm)`);
ok(Math.abs(fisica.y2.suelta - fisica.y0.suelta) < 0.5,
  `y al parar vuelve a su sitio de diseño (${fisica.y2.suelta} cm)`);

for (const e of errores) console.log("PAGEERROR " + e);
console.log(fallos.length === 0 && errores.length === 0
  ? "\nTODO OK" : `\n${fallos.length} fallos, ${errores.length} errores de página`);
await browser.close();
process.exit(fallos.length === 0 && errores.length === 0 ? 0 : 1);
