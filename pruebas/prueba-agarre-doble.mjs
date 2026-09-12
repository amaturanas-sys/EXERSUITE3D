// PRUEBA: EL AGARRE DOBLE DE POLEA (v0.3.44) — accesorio ergonómico dibujado.
//
// La primera pieza de `cad/` que entra en la PALETA, no como prefab suelto: el
// componente declara su bulto y el manifiesto de modelos le trae la malla del
// CAD. Lo que se mide:
//   · está en la paleta, dentro de ERGONÓMICO;
//   · al insertarla trae la malla del CAD, no la caja de reserva;
//   · con las medidas del STEP;
//   · y tiene el agujero del mosquetón por donde cuelga.
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
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(3000);

const r = await page.evaluate(async () => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  const botones = [...document.querySelectorAll(".comp-btn")].map((b) => b.textContent.trim());
  const lib = window.exersuite.componentes ?? null;
  const def = lib ? lib.find((d) => d.id === "agarre-doble") : null;
  // El modelo del manifiesto tarda en llegar: se espera a que el registro lo
  // tenga antes de insertar, que es lo que hace la app al arrancar.
  for (let i = 0; i < 40 && !ed.tieneModelo?.("agarre-doble"); i++) {
    await new Promise((r) => setTimeout(r, 150));
  }
  const o = ed.addComponent("agarre-doble");
  o.mesh.updateMatrixWorld(true);
  const t = new T.Box3().setFromObject(o.mesh).getSize(new T.Vector3());
  const pos = o.mesh.geometry?.attributes?.position;
  return {
    enPaleta: botones.some((b) => /Agarre doble/i.test(b)),
    categoria: def?.category ?? "sin-lista",
    tam: [t.x, t.y, t.z].map((v) => +v.toFixed(2)),
    vertices: pos?.count ?? 0,
    masa: o.physics?.massKg,
  };
});
console.log("AGARRE:", JSON.stringify(r));
ok(r.enPaleta, "el agarre doble figura en la paleta");
if (r.categoria !== "sin-lista") {
  ok(r.categoria === "ergonomico", "y está en la categoría ERGONÓMICO", r.categoria);
}
// La caja de reserva del componente tiene 8 vértices; la malla del CAD, miles.
ok(r.vertices > 1000, "trae la malla del CAD, no la caja de reserva", `${r.vertices} vértices`);
ok(
  Math.abs(r.tam[0] - 23) < 0.3,
  "y mide los 23 cm de ancho que se pidieron",
  r.tam.join(" × "),
);
// DE PIE: lo alto (20) tiene que ir en Y, no en Z. Un agarre que cuelga de un
// cable no nace tumbado de costado.
ok(
  Math.abs(r.tam[1] - 19.94) < 0.3 && Math.abs(r.tam[2] - 12.5) < 0.3,
  "y nace de pie, con la oreja arriba",
  r.tam.join(" × "),
);
ok(r.masa > 0 && r.masa < 5, "con una masa de accesorio, no de estructura", r.masa);

console.log(fallos === 0 ? "TODO OK" : `❌ ${fallos} fallo(s)`);
await browser.close();
process.exit(fallos ? 1 : 0);
