// PRUEBA: LA AGARRADERA EN D DE UNA MANO (v0.3.46) — la variante simple.
//
// `agarre-d` llevaba desde el principio en la paleta como un toro de reserva.
// Ahora trae la malla de `cad/src/agarre_simple.py`, que es la misma familia
// que el agarre doble: la placa a dos aguas arriba y la funda de goma abajo.
// Lo que se mide:
//   · sigue en ERGONÓMICO y ahora trae malla de CAD, no la primitiva;
//   · con las medidas del STEP (15,6 × 18,3 × 3 cm);
//   · de pie, con la oreja del mosquetón ARRIBA;
//   · y con el hueco de la mano libre —una D es un aro, no una chapa—.
import { chromium } from "playwright-core";

let fallos = 0;
const ok = (cond, msg, dato) => {
  if (cond) console.log(`✓ ${msg}`);
  else { fallos++; console.log(`✗ ${msg}${dato === undefined ? "" : ` — ${dato}`}`); }
};

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("pageerror", (e) => console.log("✗ PAGEERROR: " + e.message));
await page.goto(process.env.BASE ?? "http://127.0.0.1:4174/");
await page.waitForTimeout(1000);
await page.click("text=📁 PROYECTOS"); await page.waitForTimeout(300);
await page.click(".land-actions button:has-text('NUEVO')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')");
// SE ESPERA A QUE LA APP ESTE LISTA, NO AL RELOJ (v0.3.81): la capa de carga
// se va cuando las mallas estan. Adivinarlo con un timeout fijo es lo que
// hacia parpadear a estas pruebas.
await page.waitForFunction(() => !document.querySelector(".cargando-capa"), null, { timeout: 45000 });
await page.waitForTimeout(3000);

const r = await page.evaluate(async () => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  const botones = [...document.querySelectorAll(".comp-btn")].map((b) => b.textContent.trim());
  const lib = window.exersuite.componentes ?? null;
  const def = lib ? lib.find((d) => d.id === "agarre-d") : null;
  for (let i = 0; i < 40 && !ed.tieneModelo?.("agarre-d"); i++) {
    await new Promise((r) => setTimeout(r, 150));
  }
  const o = ed.addComponent("agarre-d");
  o.mesh.updateMatrixWorld(true);
  const caja = new T.Box3().setFromObject(o.mesh);
  const t = caja.getSize(new T.Vector3());
  const pos = o.mesh.geometry?.attributes?.position;
  const v = new T.Vector3();
  const alto = Math.max(caja.max.y - caja.min.y, 1e-6);
  // ¿DE PIE O BOCA ABAJO? La caja mide lo mismo de las dos maneras. Abajo está
  // el mango (15,6 cm de punta a punta) y arriba la placa, mucho más estrecha.
  const franja = (desde, hasta) => {
    let min = 1e9, max = -1e9;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      o.mesh.localToWorld(v);
      const f = (v.y - caja.min.y) / alto;
      if (f >= desde && f <= hasta) { min = Math.min(min, v.x); max = Math.max(max, v.x); }
    }
    return max > min ? +(max - min).toFixed(2) : 0;
  };
  // EL HUECO DE LA MANO: a media altura, entre los dos costados, no hay acero.
  const xc = (caja.min.x + caja.max.x) / 2;
  let hueco = 0;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    o.mesh.localToWorld(v);
    const f = (v.y - caja.min.y) / alto;
    if (f > 0.3 && f < 0.55 && Math.abs(v.x - xc) < 3) hueco++;
  }
  return {
    hueco,
    anchoArriba: franja(0.82, 1.0),
    anchoAbajo: franja(0.0, 0.18),
    enPaleta: botones.some((b) => /Agarradera en D/i.test(b)),
    categoria: def?.category ?? "sin-lista",
    tam: [t.x, t.y, t.z].map((v) => +v.toFixed(2)),
    vertices: pos?.count ?? 0,
    masa: o.physics?.massKg,
  };
});
console.log("AGARRE-D:", JSON.stringify(r));
ok(r.enPaleta, "la agarradera en D figura en la paleta");
if (r.categoria !== "sin-lista") {
  ok(r.categoria === "ergonomico", "y está en la categoría ERGONÓMICO", r.categoria);
}
ok(r.vertices > 1000, "trae la malla del CAD, no la primitiva de reserva", `${r.vertices} vértices`);
ok(
  Math.abs(r.tam[0] - 15.6) < 0.3 && Math.abs(r.tam[1] - 18.3) < 0.3 && Math.abs(r.tam[2] - 3) < 0.3,
  "con las medidas del STEP: 15,6 × 18,3 × 3 cm",
  r.tam.join(" × "),
);
ok(
  r.anchoAbajo > 13 && r.anchoArriba < 10,
  "de pie, con la oreja del mosquetón ARRIBA y el mango abajo",
  `arriba ${r.anchoArriba} cm, abajo ${r.anchoAbajo} cm`,
);
ok(r.hueco === 0, "y con el hueco de la mano libre", `${r.hueco} vértices dentro del aro`);
ok(r.masa > 0 && r.masa < 5, "con una masa de accesorio, no de estructura", r.masa);

console.log(fallos === 0 ? "TODO OK" : `❌ ${fallos} fallo(s)`);
await browser.close();
process.exit(fallos ? 1 : 0);
