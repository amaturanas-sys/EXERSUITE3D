// PRUEBA: EL PREFAB CON MALLA (v0.3.40) — las piezas de `cad/` entran enteras.
//
// Una pieza dibujada en un CAD de verdad no la genera ningún componente: no hay
// `comp` + `params` que la describan. Hasta ahora eso la dejaba fuera del
// formato de prefab —se guardaba su pose y su nombre y se perdía la pieza—, y
// para meterla en la app había que importar un GLB a mano y colocarla a ojo.
//
// Lo que se mide:
//   · el JSON que escribe `cad/a_prefab.py` es un prefab válido;
//   · al insertarlo aparece LA PIEZA, con su malla, no una caja;
//   · con las medidas del STEP, en centímetros;
//   · y exportar esa pieza otra vez como prefab la conserva (ida y vuelta).
import { chromium } from "playwright-core";
import { readFileSync, readdirSync } from "node:fs";

let fallos = 0;
const ok = (cond, msg, dato) => {
  if (cond) console.log(`✓ ${msg}`);
  else { fallos++; console.log(`✗ ${msg}${dato === undefined ? "" : ` — ${dato}`}`); }
};

const dir = new URL("../cad/JSON/", import.meta.url);
const nombres = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
ok(nombres.length >= 3, "hay prefabs exportados de las piezas CAD", nombres.join(", "));

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("pageerror", (e) => console.log("✗ PAGEERROR: " + e.message));
await page.goto(process.env.BASE ?? "http://127.0.0.1:4174/");
await page.waitForTimeout(1000);
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);

for (const nombre of nombres) {
  const texto = readFileSync(new URL(nombre, dir), "utf8");
  const esperado = JSON.parse(texto).piezas[0].dims;
  const r = await page.evaluate(async ({ texto, nombre }) => {
    const ed = window.exersuite.editor, T = window.exersuite.THREE;
    for (const o of [...ed.objects.values()]) ed.removeObject(o);
    const { archivo, advertencias } = window.exersuite.prefabIO.parsearPrefab(texto);
    if (!archivo) return { error: "no parsea", advertencias };
    ed.insertarPrefab(archivo, new T.Vector3(0, 0, 0));
    await new Promise((r) => setTimeout(r, 500));
    const o = ed.listObjects()[0];
    if (!o) return { error: "no insertó nada" };
    o.mesh.updateMatrixWorld(true);
    const t = new T.Box3().setFromObject(o.mesh).getSize(new T.Vector3());
    const pos = o.mesh.geometry?.attributes?.position;
    // Y la vuelta: exportarla otra vez tiene que conservar la malla.
    ed.select(o);
    const ida = window.exersuite.prefabIO.serializarPrefab(ed, nombre);
    const devuelto = ida ? JSON.parse(ida).piezas[0] : null;
    return {
      piezas: ed.objects.size,
      comp: o.componentId,
      tam: [t.x, t.y, t.z].map((v) => +v.toFixed(3)),
      vertices: pos?.count ?? 0,
      caras: o.mesh.geometry?.index ? o.mesh.geometry.index.count / 3 : 0,
      vuelta: devuelto?.malla ? devuelto.malla.pos.length / 3 : 0,
      advertencias,
    };
  }, { texto, nombre });

  console.log(`${nombre}: ${JSON.stringify(r)}`);
  ok(!r.error, `${nombre} se inserta`, r.error);
  if (r.error) continue;
  ok(r.comp === "imported", `${nombre} llega como pieza dibujada`, r.comp);
  ok(r.vertices > 100 && r.caras > 100, `${nombre} trae su malla, no una caja`,
     `${r.vertices} vértices, ${r.caras} caras`);
  const bien = esperado.every((v, i) => Math.abs(r.tam[i] - v) < 0.05);
  ok(bien, `${nombre} mide lo que dice el STEP`, `${r.tam} frente a ${esperado}`);
  ok(r.vuelta === r.vertices, `${nombre} sobrevive a la ida y vuelta`,
     `${r.vuelta} de ${r.vertices}`);
}

console.log(fallos === 0 ? "TODO OK" : `❌ ${fallos} fallo(s)`);
await browser.close();
process.exit(fallos ? 1 : 0);
