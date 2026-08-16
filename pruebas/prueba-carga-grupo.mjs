// v0.2.55: CARGA DEL CONJUNTO. Con la máquina seleccionada como grupo, se
// edita el peso que sostienen sus piezas sin desagruparla.
import { chromium } from "playwright-core";

let fallos = 0;
const ok = (c, m) => { console.log((c ? "✓ " : "✗ ") + m); if (!c) fallos++; };

const b = await chromium.launch({
  // El Chromium de Playwright ya instalado. Se puede apuntar a otro con
  // CHROMIUM=/ruta/al/chrome (ver LEEME.md).
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on("pageerror", (e) => errs.push("PAGEERROR: " + e.message));

await p.goto("http://127.0.0.1:4174/");
await p.waitForTimeout(800);
await p.click("text=🛠 BUILDER"); await p.waitForTimeout(300);
await p.click("text=Crear nuevo proyecto"); await p.waitForTimeout(300);
await p.click(".wizard-carta:has-text('Profesional')"); await p.waitForTimeout(300);
await p.click(".wizard-carta:has-text('Canvas libre')"); await p.waitForTimeout(2500);

await p.evaluate(() => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  ed.insertarMaquina("uppermachine", new T.Vector3(0, 0, 0));
});
await p.waitForTimeout(1500);

// Seleccionar la máquina COMO GRUPO (sin desagrupar).
const sel = await p.evaluate(() => {
  const ed = window.exersuite.editor;
  const primera = [...ed.objects.values()][0];
  const gid = ed.groupOf(primera.id);
  if (!gid) return null;
  ed.bus.emit("groupSelectionChanged", { id: gid, name: "UpperMachine" });
  return { gid, piezas: ed.objetosDelGrupo(gid).length,
           conCarga: ed.objetosDelGrupo(gid).filter((o) => o.stack || o.carga)
             .map((o) => ({ nombre: o.name, tipo: o.stack ? "pila" : "discos",
                            kg: +o.effectiveMassKg().toFixed(1) })) };
});
ok(sel !== null, "la máquina está agrupada");
if (sel) {
  ok(sel.piezas > 20, `el grupo tiene sus piezas (${sel.piezas})`);
  ok(sel.conCarga.length > 0,
    `se detectan las piezas que sostienen carga (${sel.conCarga.map((c) => `${c.tipo}:${c.kg}kg`).join(", ")})`);
}

// La sección aparece en PROPIEDADES con el grupo seleccionado.
const ui = await p.evaluate(() => {
  const ed = window.exersuite.editor;
  const gid = ed.groupOf([...ed.objects.values()][0].id);
  ed.bus.emit("groupSelectionChanged", { id: gid, name: "UpperMachine" });
  const titulos = [...document.querySelectorAll("#propiedades .panel-title, .panel-title")]
    .map((e) => e.textContent.trim());
  const filas = document.querySelectorAll(".carga-grupo").length;
  const total = [...document.querySelectorAll(".empty-hint")]
    .map((e) => e.textContent).find((t) => t && t.includes("Carga del conjunto"));
  return { titulos, filas, total };
});
ok(ui.filas > 0, `la sección pinta una fila por pieza con carga (${ui.filas})`);
ok(!!ui.total, `muestra el total del conjunto (${ui.total ?? "—"})`);

// El selector rápido CAMBIA la carga de verdad.
const cambio = await p.evaluate(() => {
  const ed = window.exersuite.editor;
  const gid = ed.groupOf([...ed.objects.values()][0].id);
  const pila = ed.objetosDelGrupo(gid).find((o) => o.stack);
  const disc = ed.objetosDelGrupo(gid).find((o) => o.carga);
  const r = {};
  if (pila) {
    const kg0 = pila.effectiveMassKg(), sel0 = pila.stack.selected;
    const botones = [...document.querySelectorAll(".carga-grupo")]
      .find((f) => f.textContent.includes(pila.name))?.querySelectorAll("button");
    if (botones) botones[1].click();   // "+"
    r.pila = { sel0, sel1: pila.stack.selected, kg0: +kg0.toFixed(1),
               kg1: +pila.effectiveMassKg().toFixed(1) };
  }
  if (disc) {
    const n0 = disc.discosMontados(), kg0 = disc.effectiveMassKg();
    const botones = [...document.querySelectorAll(".carga-grupo")]
      .find((f) => f.textContent.includes(disc.name))?.querySelectorAll("button");
    if (botones) botones[1].click();
    r.disc = { n0, n1: disc.discosMontados(), kg0: +kg0.toFixed(1),
               kg1: +disc.effectiveMassKg().toFixed(1) };
  }
  r.sigueAgrupado = ed.groupOf([...ed.objects.values()][0].id) === gid;
  return r;
});
if (cambio.pila) {
  ok(cambio.pila.sel1 === cambio.pila.sel0 + 1,
    `el pin de la pila sube una placa (${cambio.pila.sel0} → ${cambio.pila.sel1})`);
  ok(cambio.pila.kg1 > cambio.pila.kg0,
    `y el peso movilizado sube (${cambio.pila.kg0} → ${cambio.pila.kg1} kg)`);
}
if (cambio.disc) {
  ok(cambio.disc.n1 === cambio.disc.n0 + 1,
    `se monta un disco más (${cambio.disc.n0} → ${cambio.disc.n1})`);
  ok(cambio.disc.kg1 > cambio.disc.kg0,
    `y la masa de la pieza sube (${cambio.disc.kg0} → ${cambio.disc.kg1} kg)`);
}
ok(cambio.sigueAgrupado === true, "la máquina SIGUE agrupada tras editar la carga");

// --- El camino de los DISCOS, con una máquina que los lleva (rack-torre) ---
const discos = await p.evaluate(async () => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  ed.insertarMaquina("rack-torre", new T.Vector3(400, 0, 0));
  await new Promise((r) => setTimeout(r, 800));
  const porta = [...ed.objects.values()].find((o) => o.componentId === "portadiscos-ttp");
  if (!porta) return null;
  const gid = ed.groupOf(porta.id);
  ed.bus.emit("groupSelectionChanged", { id: gid, name: "TTP" });
  const conCarga = ed.objetosDelGrupo(gid).filter((o) => o.stack || o.carga);
  const fila = [...document.querySelectorAll(".carga-grupo")]
    .find((f) => f.textContent.includes(porta.name));
  const n0 = porta.discosMontados(), kg0 = porta.effectiveMassKg();
  fila?.querySelectorAll("button")[1].click();   // "+"
  const n1 = porta.discosMontados(), kg1 = porta.effectiveMassKg();
  fila?.querySelectorAll("button")[0].click();   // "−"
  return { hayFila: !!fila, conCarga: conCarga.length,
           n0, n1, n2: porta.discosMontados(),
           kg0: +kg0.toFixed(1), kg1: +kg1.toFixed(1),
           sigueAgrupado: ed.groupOf(porta.id) === gid };
});
ok(discos !== null, "el rack con torre trae portadiscos");
if (discos) {
  ok(discos.hayFila, `el portadiscos tiene su fila (${discos.conCarga} pieza(s) con carga en el grupo)`);
  ok(discos.n1 === discos.n0 + 1, `+ monta un disco (${discos.n0} → ${discos.n1})`);
  ok(discos.kg1 > discos.kg0, `y la masa sube (${discos.kg0} → ${discos.kg1} kg)`);
  ok(discos.n2 === discos.n0, `− lo quita y vuelve alinicio  (${discos.n1} → ${discos.n2})`);
  ok(discos.sigueAgrupado, "sigue agrupado tras tocar los discos");
}

console.log("\nERRORES: " + (errs.length ? errs.join("\n") : "ninguno"));
if (errs.length) fallos += errs.length;
console.log(fallos === 0 ? "\n✅ TODO BIEN" : `\n❌ ${fallos} fallo(s)`);
await b.close();
process.exit(fallos ? 1 : 0);
