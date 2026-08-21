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
//
// La CADENA y la CORREA salieron de esta lista en v0.3.5: nunca debieron estar.
// No son piezas, son los BOTONES de la herramienta de cuerdas, y retirarlas
// apagó la herramienta entera. La comprobación de abajo impide que vuelva a
// pasar con cualquier otra.
import { chromium } from "playwright-core";

// tamaño [x,y,z] en cm · masa en kg · si está anclada · material · vértices
const HUELLA = {
  "soporte-peso":     { tam: [30, 8, 12],      masa: 0,    fijo: true,  material: "acero-negro",    verts: 24 },
  "montante-pr":      { tam: [7, 110, 7],      masa: 0,    fijo: true,  material: "acero-negro",    verts: 13476 },
  "barra-fondos":     { tam: [40, 4, 4],       masa: 0,    fijo: true,  material: "acero-negro",    verts: 196 },
  "landmine":         { tam: [5.2, 18, 5.2],   masa: 1,    fijo: false, material: "acero-negro",    verts: 196 },
  "pivote":           { tam: [2.4, 8, 2.4],    masa: 0.2,  fijo: false, material: "turquesa",       verts: 196 },
  "pop-pin":          { tam: [1.6, 14, 1.6],   masa: 0.1,  fijo: false, material: "acero-pulido",   verts: 196 },
  "carro-cable":      { tam: [14, 16, 10],     masa: 1.5,  fijo: false, material: "acero-negro",    verts: 24 },
  "brazo-ajustable":  { tam: [8, 80, 8],       masa: 3,    fijo: false, material: "acero-negro",    verts: 24 },
  "engranaje":        { tam: [10, 2, 10],      masa: 0.6,  fijo: false, material: "acero",          verts: 196 },
  "resorte":          { tam: [6, 30, 6],       masa: 0.3,  fijo: false, material: "acero",          verts: 196 },
  "bloque-peso":      { tam: [30, 4, 18],      masa: 5,    fijo: false, material: "hierro-fundido", verts: 1236 },
  "micro-disco":      { tam: [12, 1.2, 12],    masa: 1.25, fijo: false, material: "hierro-fundido", verts: 196 },
  "agarradera":       { tam: [19, 19, 3],      masa: 0.4,  fijo: false, material: "goma",           verts: 561 },
  "cuerda-triceps":   { tam: [2.4, 60, 2.4],   masa: 0.3,  fijo: false, material: "nylon",          verts: 196 },
  "barra-jalon":      { tam: [2.8, 120, 2.8],  masa: 2,    fijo: false, material: "cromo",          verts: 196 },
  "correa-tobillo":   { tam: [20, 8, 1],       masa: 0.2,  fijo: false, material: "nylon",          verts: 24 },
  // Segunda tanda (v0.3.2): el diseñador leyó el inventario actualizado y
  // mandó retirar dos más —el pilar y el contrapeso—, y preservar la esfera.
  "pilar":            { tam: [8, 200, 8],      masa: 0,    fijo: true,  material: "acero-negro",    verts: 24 },
  "contrapeso":       { tam: [20, 20, 20],     masa: 15,   fijo: false, material: "hierro-fundido", verts: 24 },
  // Tercera tanda (v0.3.2): el pilar vertical TTP. Lo usan OCHO máquinas, así
  // que es el caso más exigente de «retirar no es borrar»: sale del listado y
  // las ocho se siguen armando con él, con su malla perforada intacta.
  "montante-ttp":     { tam: [5.02, 204, 7.05], masa: 0,   fijo: true,  material: "acero-negro",    verts: 18096 },
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
//
// Se compara por ETIQUETA contra los botones REALES de la paleta
// (`.comp-btn`), y la lista esperada se lee del catálogo de la aplicación, no
// de una copia escrita aquí. La versión anterior buscaba selectores que no
// existen (`.palette-item`, `[data-comp-id]`): no miraba nada y pasaba sola.
const paleta = await p.evaluate((ids) => {
  const cat = window.exersuite.catalogo;
  const todas = cat.todas();
  const porId = new Map(todas.map((d) => [d.id, d]));
  // El botón de una máquina estándar también es `.comp-btn`: se descarta.
  const pintadas = [...document.querySelectorAll(".comp-btn:not(.maquina-btn)")]
    .map((n) => n.textContent.trim());
  const vigentes = cat.vigente().map((d) => d.label);
  return {
    pintadas,
    vigentes,
    coladas: ids.filter((id) => porId.has(id) && pintadas.includes(porId.get(id).label)),
    sobran: pintadas.filter((t) => !vigentes.includes(t)),
    faltan: vigentes.filter((t) => !pintadas.includes(t)),
    esfera: pintadas.includes(porId.get("prim-sphere").label),
    marcadas: todas.filter((d) => d.paleta === "retirada").map((d) => d.id).sort(),
  };
}, IDS);
ok(paleta.pintadas.length > 0, `la paleta pinta piezas de verdad (${paleta.pintadas.length} botones)`);
ok(paleta.coladas.length === 0,
  `ninguna de las ${IDS.length} retiradas aparece en la paleta `
  + `(${paleta.coladas.length === 0 ? "0" : paleta.coladas.join(", ")})`);
ok(paleta.sobran.length === 0 && paleta.faltan.length === 0,
  `la paleta enseña EXACTAMENTE el catálogo vigente, ${paleta.vigentes.length} piezas `
  + `(sobran: ${paleta.sobran.join(", ") || "0"} - faltan: ${paleta.faltan.join(", ") || "0"})`);
// La esfera se queda: el diseñador la preservó a mano pese a no tener uso.
ok(paleta.esfera, "la ESFERA sigue en la paleta (preservada a petición del diseñador)");
// ── UNA HERRAMIENTA NO SE PUEDE RETIRAR ────────────────────────────────────
//
// Una definición con `placement` no es una pieza: es el BOTÓN de una
// herramienta —vigas, tubos, cadenas, correas—. Retirarla no quita una pieza
// del listado, apaga la herramienta. Y el recuento de usos no lo ve venir,
// porque lo que la herramienta crea no lleva el id del botón: así se perdieron
// la cadena y la correa en v0.3.2, sin que nada avisara.
const herramientas = await p.evaluate(() =>
  window.exersuite.catalogo.todas().filter((d) => d.placement).map((d) => ({
    id: d.id, placement: d.placement, paleta: d.paleta,
  })));
ok(herramientas.length > 0, `hay piezas-herramienta que vigilar (${herramientas.length})`);
ok(herramientas.every((h) => !h.paleta),
  `NINGUNA pieza con herramienta lleva etiqueta de curaduría `
  + `(${herramientas.filter((h) => h.paleta).map((h) => h.id).join(", ") || "0 retiradas"})`);

ok(JSON.stringify(paleta.marcadas) === JSON.stringify([...IDS].sort()),
  `las marcadas como retiradas en la biblioteca son las ${IDS.length} de esta prueba `
  + `(${paleta.marcadas.length})`);

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
  //
  // Y NO SE MIDE CONTRA EL RELOJ, sino contra el reposo. Lo que se comprueba
  // es «la pieza con masa cae y la anclada no», y cuánto avanza la física en
  // tres segundos depende de lo cargada que esté la máquina donde corre la
  // prueba: el umbral fijo de 40 cm fallaba en un contenedor lento aunque el
  // programa estuviera bien. Se espera a que la pieza toque el suelo, con
  // quince segundos de margen.
  await ed.toggleSimulation();
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 250));
    if (suelta.mesh.position.y < 5) break;   // ya tocó el suelo
  }
  const y1 = { anclada: anclada.mesh.position.y, suelta: suelta.mesh.position.y };
  ed.stopSimulation();
  await new Promise((r) => setTimeout(r, 600));
  const y2 = { anclada: anclada.mesh.position.y, suelta: suelta.mesh.position.y };
  return { y0, y1, y2 };
});
ok(Math.abs(fisica.y1.anclada - fisica.y0.anclada) < 0.5,
  `la pieza ANCLADA no se mueve al simular (${fisica.y0.anclada} → ${fisica.y1.anclada} cm)`);
// El bloque mide 4 cm de alto: en el suelo su centro queda a 2 cm.
ok(fisica.y1.suelta < 5,
  `la pieza CON MASA cae hasta el suelo (${fisica.y0.suelta} → ${fisica.y1.suelta.toFixed(1)} cm)`);
ok(Math.abs(fisica.y2.suelta - fisica.y0.suelta) < 0.5,
  `y al parar vuelve a su sitio de diseño (${fisica.y2.suelta} cm)`);

// ── 5. Y LA BIBLIOTECA DE MODELOS ENSEÑA LO MISMO ──────────────────────────
//
// La ventana «Biblioteca de modelos» de la Home listaba las 74 definiciones,
// plantillas internas y despiece de máquinas incluidos. El diseñador pidió que
// enseñara la selección vigente y nada más. Se comprueba contra la MISMA
// fuente que la paleta, así que las dos no pueden desviarse una de otra.
console.log("\n── La ventana de Biblioteca de modelos ─────────────────────");
await p.goto("http://127.0.0.1:4174/");
await p.waitForTimeout(1000);
await p.click("text=🛠 BUILDER"); await p.waitForTimeout(400);
await p.click("text=Explorar biblioteca"); await p.waitForTimeout(2000);

const biblio = await p.evaluate((esperadas) => {
  const nombres = [...document.querySelectorAll(".lib-list .lib-name")].map((n) => n.textContent.trim());
  return {
    nombres,
    sobran: nombres.filter((t) => !esperadas.includes(t)),
    faltan: esperadas.filter((t) => !nombres.includes(t)),
  };
}, paleta.vigentes);
ok(biblio.sobran.length === 0 && biblio.faltan.length === 0,
  `la pestaña «Componentes» lista EXACTAMENTE las mismas ${paleta.vigentes.length} piezas `
  + `que la paleta (sobran: ${biblio.sobran.join(", ") || "0"} · faltan: ${biblio.faltan.join(", ") || "0"})`);

// ── 6. LA PESTAÑA «MÁQUINAS» ENSEÑA LA MÁQUINA DE VERDAD ───────────────────
//
// El modelo de esa pestaña —el que se ve y el que se descarga como OBJ/STL—
// se cocinaba aparte y se había quedado atrás: ignoraba la orientación de
// fábrica de las piezas y no construía las hijas (las quince placas de la
// pila, los discos del portadiscos). Ahora se arma con las MISMAS piezas que
// el editor inserta, y esto lo comprueba vértice a vértice.
console.log("\n── El modelo de cada máquina es la máquina ─────────────────");
await p.goto("http://127.0.0.1:4174/");
await p.waitForTimeout(1000);
await p.click("text=🛠 BUILDER"); await p.waitForTimeout(300);
await p.click("text=Crear nuevo proyecto"); await p.waitForTimeout(300);
await p.click(".wizard-carta:has-text('Profesional')"); await p.waitForTimeout(300);
await p.click(".wizard-carta:has-text('Canvas libre')"); await p.waitForTimeout(2200);

const maquinas = await p.evaluate(async () => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  const M = window.exersuite.maquinas;
  const out = [];
  for (const m of M.lista) {
    // El modelo que enseña y exporta la Biblioteca.
    const g = M.hornear(m.id);
    const horno = Array.from(g.getAttribute("position").array);
    g.dispose();
    // La máquina que de verdad se inserta, reducida a la misma forma:
    // triángulos en coordenadas de mundo, en el mismo orden de recorrido.
    for (const o of [...ed.listObjects()]) ed.removeObject(o);
    ed.insertarMaquina(m.id, new T.Vector3(0, 0, 0));
    await new Promise((r) => setTimeout(r, 350));
    const real = [];
    const v = new T.Vector3();
    const recorrer = (raiz) => {
      raiz.updateMatrixWorld(true);
      raiz.traverse((n) => {
        if (!n.isMesh || !n.geometry?.getAttribute?.("position")) return;
        const geo = n.geometry.index ? n.geometry.toNonIndexed() : n.geometry;
        const at = geo.getAttribute("position");
        for (let i = 0; i < at.count; i++) {
          v.fromBufferAttribute(at, i).applyMatrix4(n.matrixWorld);
          real.push(v.x, v.y, v.z);
        }
        if (geo !== n.geometry) geo.dispose();
      });
    };
    for (const o of ed.listObjects()) recorrer(o.mesh);
    // Las CUERDAS de seguridad del rack tambien son la maquina: tienen malla
    // propia y el modelo horneado las lleva.
    for (const r of ed.listRopes?.() ?? []) recorrer(r.group);
    let dmax = 0;
    if (horno.length === real.length) {
      for (let i = 0; i < horno.length; i++) {
        const d = Math.abs(horno[i] - real[i]);
        if (d > dmax) dmax = d;
      }
    } else dmax = Infinity;
    out.push({ id: m.id, vtx: horno.length / 3, vtxReal: real.length / 3, dmax: +dmax.toFixed(6) });
  }
  return out;
});
const clavadas = maquinas.filter((m) => m.vtx === m.vtxReal && m.dmax < 0.001);
ok(clavadas.length === maquinas.length,
  `las ${maquinas.length} máquinas estándar se hornean VÉRTICE A VÉRTICE como se insertan `
  + `(${clavadas.length} de ${maquinas.length})`);
for (const m of maquinas) {
  console.log(`    ${m.id.padEnd(20)} ${String(m.vtx).padStart(7)} vtx (real ${m.vtxReal})`
    + ` · desvío máx ${m.dmax} cm`);
}

for (const e of errores) console.log("PAGEERROR " + e);
console.log(fallos.length === 0 && errores.length === 0
  ? "\nTODO OK" : `\n${fallos.length} fallos, ${errores.length} errores de página`);
await browser.close();
process.exit(fallos.length === 0 && errores.length === 0 ? 0 : 1);
