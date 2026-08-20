// v0.3.2 · LARGO A MEDIDA: ALARGAR NO ES ESCALAR.
//
// El brazo de seguridad, la barra de dominadas y el multi-agarre se tienden
// ENTRE DOS PILARES, y esa separación la decide quien arma la estructura. Así
// que su largo se puede cambiar — pero el diseñador puso la condición encima:
//
//   «El largo de estas estructuras debe modificarse desde el centro de ellas
//    (como prolongación) para no alterar su forma general (deformación por
//    estiramiento en general)».
//
// Eso es lo que separa ALARGAR de ESCALAR, y es lo que vigila esta prueba. Al
// alargar la pieza:
//
//   · el largo pedido es el largo que sale,
//   · el PERFIL (ancho y alto) no se mueve ni un milímetro,
//   · los REMATES de los dos extremos —placas de montaje, manguito, ganchos—
//     conservan su forma: sus vértices viajan RÍGIDOS hacia fuera, cada uno la
//     mitad de lo que creció la pieza, sin deformarse entre sí,
//   · y volver al largo de fábrica devuelve la malla original, vértice a
//     vértice (no se acumula estirado sobre estirado).
import { chromium } from "playwright-core";

const PIEZAS = [
  { id: "brazo-seguridad", fabrica: 106, remate: 29, prueba: [150, 70] },
  { id: "barra-pr", fabrica: 106, remate: 10, prueba: [180, 45] },
  { id: "multiagarre-ttp", fabrica: 106.5, remate: 45, prueba: [160, 95] },
];

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

// ── 1. LAS TRES ESTÁN EN LA PALETA Y SE DECLARAN AJUSTABLES ────────────────
console.log("\n── En la paleta, y ajustables ──────────────────────────────");
const catalogo = await p.evaluate((ids) => {
  const cat = window.exersuite.catalogo;
  const vigentes = cat.vigente().map((d) => d.label);
  const pintadas = [...document.querySelectorAll(".comp-btn:not(.maquina-btn)")]
    .map((n) => n.textContent.trim());
  const porId = new Map(cat.todas().map((d) => [d.id, d]));
  const ed = window.exersuite.editor;
  const ajustables = {};
  for (const id of ids) {
    for (const o of [...ed.listObjects()]) ed.removeObject(o);
    const o = ed.addComponent(id);
    ajustables[id] = o.largoAjustable?.() ?? null;
  }
  return {
    faltan: ids.filter((id) => !porId.has(id) || !vigentes.includes(porId.get(id).label)),
    sinBoton: ids.filter((id) => porId.has(id) && !pintadas.includes(porId.get(id).label)),
    ajustables,
    // El pilar vertical TTP salió del catálogo en esta misma tanda.
    ttpFuera: !vigentes.includes(porId.get("montante-ttp")?.label ?? "—"),
    // Y la placa dentada sigue dentro, con su material cromado.
    dentadaDentro: vigentes.includes(porId.get("placa-dentada")?.label ?? "—"),
  };
}, PIEZAS.map((x) => x.id));
ok(catalogo.faltan.length === 0,
  `las 3 piezas están en el catálogo (faltan: ${catalogo.faltan.join(", ") || "0"})`);
ok(catalogo.sinBoton.length === 0,
  `y tienen botón en la paleta (sin botón: ${catalogo.sinBoton.join(", ") || "0"})`);
ok(PIEZAS.every((x) => catalogo.ajustables[x.id]?.eje === "z"),
  "las 3 declaran su largo ajustable por el eje Z");
ok(catalogo.ttpFuera, "el pilar vertical TTP ya NO está en el catálogo");
ok(catalogo.dentadaDentro, "la placa dentada SIGUE en el catálogo");

// ── 2. ALARGAR NO ES ESCALAR ───────────────────────────────────────────────
console.log("\n── Alargar por el centro, sin deformar ─────────────────────");
const medido = await p.evaluate(async (piezas) => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  const foto = (o) => {
    const g = o.mesh.geometry;
    g.computeBoundingBox();
    const s = g.boundingBox.getSize(new T.Vector3());
    return {
      tam: [+s.x.toFixed(3), +s.y.toFixed(3), +s.z.toFixed(3)],
      verts: Array.from(g.getAttribute("position").array),
    };
  };
  const out = {};
  for (const pz of piezas) {
    for (const o of [...ed.listObjects()]) ed.removeObject(o);
    const o = ed.addComponent(pz.id);
    const base = foto(o);
    const casos = [];
    for (const largo of pz.prueba) {
      o.params.largoCm = largo;
      o.rebuildGeometry();
      const f = foto(o);
      // ¿Los remates viajaron RÍGIDOS? Se comparan los vértices del extremo
      // +Z de la malla base contra los de la estirada: si el remate no se
      // deformó, TODOS se movieron exactamente el mismo delta.
      const half0 = base.tam[2] / 2;
      const nucleo = half0 - pz.remate;
      const deltas = [];
      for (let i = 2; i < base.verts.length; i += 3) {
        const z0 = base.verts[i];
        if (Math.abs(z0) <= nucleo) continue;          // eso es el núcleo elástico
        deltas.push(f.verts[i] - z0);
        // Y el remate no se mueve en X ni en Y: sigue siendo la misma pieza.
        if (Math.abs(f.verts[i - 2] - base.verts[i - 2]) > 1e-4) deltas.push(NaN);
        if (Math.abs(f.verts[i - 1] - base.verts[i - 1]) > 1e-4) deltas.push(NaN);
      }
      const esperado = (largo - base.tam[2]) / 2;
      const desvio = deltas.length
        ? Math.max(...deltas.map((d) => Math.abs(Math.abs(d) - Math.abs(esperado))))
        : Infinity;
      casos.push({
        largo, tam: f.tam, nRemate: deltas.length,
        desvioRemate: Number.isFinite(desvio) ? +desvio.toFixed(4) : desvio,
      });
    }
    // Vuelta a fábrica: la malla tiene que quedar como al principio.
    o.params.largoCm = undefined;
    o.rebuildGeometry();
    const vuelta = foto(o);
    let peor = 0;
    for (let i = 0; i < base.verts.length; i++) {
      peor = Math.max(peor, Math.abs(base.verts[i] - vuelta.verts[i]));
    }
    out[pz.id] = { base: base.tam, casos, vuelta: vuelta.tam, desvioVuelta: +peor.toFixed(5) };
  }
  return out;
}, PIEZAS);

for (const pz of PIEZAS) {
  const m = medido[pz.id];
  console.log(`  ${pz.id}: de fábrica ${m.base.join(" × ")} cm`);
  for (const c of m.casos) {
    console.log(`    → ${c.largo} cm: ${c.tam.join(" × ")}`
      + ` · ${c.nRemate} vértices de remate, desvío máx ${c.desvioRemate} cm`);
  }
  ok(m.casos.every((c) => Math.abs(c.tam[2] - c.largo) < 0.05),
    `${pz.id}: el largo pedido es el largo que sale`);
  ok(m.casos.every((c) => Math.abs(c.tam[0] - m.base[0]) < 1e-3
    && Math.abs(c.tam[1] - m.base[1]) < 1e-3),
    `${pz.id}: el PERFIL no se toca (${m.base[0]} × ${m.base[1]} cm)`);
  ok(m.casos.every((c) => c.nRemate > 0 && c.desvioRemate < 1e-3),
    `${pz.id}: los remates viajan RÍGIDOS, sin deformarse `
    + `(desvío máx ${Math.max(...m.casos.map((c) => c.desvioRemate))} cm)`);
  ok(m.desvioVuelta < 1e-4,
    `${pz.id}: volver a fábrica devuelve la malla original (desvío ${m.desvioVuelta} cm)`);
}

// ── 3. EL LARGO VIAJA EN EL PROYECTO ───────────────────────────────────────
//
// De nada sirve la medida si al guardar y abrir la pieza vuelve a los 106 de
// fábrica: se hace el viaje completo por el ciclo real de prefab.
console.log("\n── El largo sobrevive al guardado ──────────────────────────");
const viaje = await p.evaluate(async () => {
  const ed = window.exersuite.editor;
  for (const o of [...ed.listObjects()]) ed.removeObject(o);
  const a = ed.addComponent("brazo-seguridad");
  a.params.largoCm = 148; a.rebuildGeometry();
  const b = ed.addComponent("multiagarre-ttp");
  b.params.largoCm = 132; b.rebuildGeometry();
  b.mesh.position.set(80, 60, 0);
  const { serializarPrefab, parsearPrefab } = window.exersuite.prefabIO;
  [a, b].forEach((o) => ed.toggleMulti(o));
  const texto = serializarPrefab(ed, "prueba-largo");
  if (!texto) return { error: "serializarPrefab devolvió null" };
  for (const o of [...ed.listObjects()]) ed.removeObject(o);
  const informe = parsearPrefab(texto);
  ed.insertarPrefab(informe.archivo);
  await new Promise((r) => setTimeout(r, 400));
  const T = window.exersuite.THREE;
  const vuelta = ed.listObjects().map((o) => {
    const g = o.mesh.geometry; g.computeBoundingBox();
    return { comp: o.componentId, largoCm: o.params.largoCm ?? null,
      z: +g.boundingBox.getSize(new T.Vector3()).z.toFixed(2) };
  });
  return { vuelta, desconocidas: informe.desconocidas ?? [] };
});
ok(!viaje.error, `el ciclo exportar → insertar se completa (${viaje.error ?? "sin error"})`);
const brazo = viaje.vuelta?.find((o) => o.comp === "brazo-seguridad");
const multi = viaje.vuelta?.find((o) => o.comp === "multiagarre-ttp");
ok(brazo?.largoCm === 148 && Math.abs(brazo.z - 148) < 0.05,
  `el brazo vuelve con sus 148 cm (${brazo?.largoCm} pedidos, ${brazo?.z} medidos)`);
ok(multi?.largoCm === 132 && Math.abs(multi.z - 132) < 0.05,
  `el multi-agarre vuelve con sus 132 cm (${multi?.largoCm} pedidos, ${multi?.z} medidos)`);

// ── 4. Y LA FÍSICA MIDE LA PIEZA ALARGADA ──────────────────────────────────
//
// El colisionador sale de la malla, así que una barra de 180 cm tiene que
// SOSTENER algo que la de 106 dejaría caer: se suelta un disco justo encima
// del tramo nuevo, fuera del largo de fábrica.
console.log("\n── La física mide la pieza alargada ────────────────────────");
const fisica = await p.evaluate(async () => {
  const ed = window.exersuite.editor;
  for (const o of [...ed.listObjects()]) ed.removeObject(o);
  const barra = ed.addComponent("barra-pr");
  barra.params.largoCm = 180; barra.rebuildGeometry();
  barra.mesh.position.set(0, 100, 0);
  barra.physics = { ...barra.physics, fixed: true };
  const disco = ed.addComponent("disco-peso");
  // z = 70 cm: fuera de la barra de fábrica (±53), dentro de la alargada (±90).
  disco.mesh.position.set(0, 130, 70);
  const y0 = disco.mesh.position.y;
  await ed.toggleSimulation();
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 250));
    if (disco.mesh.position.y < 40) break;
  }
  const y1 = disco.mesh.position.y;
  ed.stopSimulation();
  await new Promise((r) => setTimeout(r, 500));
  return { y0, y1: +y1.toFixed(1) };
});
ok(fisica.y1 > 60,
  `el disco se queda sobre el tramo NUEVO de la barra de 180 cm, a 70 cm del `
  + `centro (${fisica.y0} → ${fisica.y1} cm; sin alargar habría caído al suelo)`);

for (const e of errores) console.log("PAGEERROR " + e);
console.log(fallos.length === 0 && errores.length === 0
  ? "\nTODO OK" : `\n${fallos.length} fallos, ${errores.length} errores de página`);
await browser.close();
process.exit(fallos.length === 0 && errores.length === 0 ? 0 : 1);
