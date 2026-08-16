// UpperMachine como MÁQUINA ESTÁNDAR: se inserta desde la paleta igual que
// el resto, con sus 41 piezas, 16 uniones y 2 cables, y funciona en
// simulación (brazo compuesto rígido, cables válidos, jalón que mueve la pila).
import { chromium } from "playwright-core";
const OUT = ".";
const browser = await chromium.launch({
  // El Chromium de Playwright ya instalado. Se puede apuntar a otro con
  // CHROMIUM=/ruta/al/chrome (ver LEEME.md).
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1180, height: 860 } });
const errores = [];
page.on("pageerror", (e) => errores.push(e.message));
await page.goto("http://127.0.0.1:4174/");
await page.waitForTimeout(1000);
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);
const fallos = [];
const ok = (c, m) => { if (!c) fallos.push(m); console.log((c ? "✓ " : "✗ ") + m); };

// 1) Aparece en la paleta de máquinas estándar y se inserta con un clic.
const enPaleta = await page.evaluate(() =>
  [...document.querySelectorAll("#palette .comp-btn")].map((b) => (b.textContent ?? "").trim()),
);
ok(enPaleta.some((t) => t.endsWith("UpperMachine")), `figura en la paleta de máquinas (${enPaleta.filter((t) => /Machine|Torre|Rack/.test(t)).join(", ")})`);
await page.evaluate(() => {
  [...document.querySelectorAll("#palette .comp-btn")]
    .find((b) => (b.textContent ?? "").trim().endsWith("UpperMachine")).click();
});
await page.waitForTimeout(1800);

const r = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const objs = [...ed.objects.values()];
  const O = (i) => objs[i];
  ed.select(null);
  ed.cablesDirty = true; ed.requestRender?.(6);
  await new Promise((x) => setTimeout(x, 600));
  const rojos = [...ed.cableVisuals.children].filter((l) => l.material.color.getHex() === 0xef4444).length;
  const grupos = [...ed.groups.values()].map((g) => g.name);
  const base = {
    piezas: objs.length, uniones: ed.listJoints().length,
    soldaduras: ed.listJoints().filter((j) => j.locked).length,
    cables: ed.listCables().length, rojos, grupos,
    colPinhole: O(2).params.holeDiameter, colVentanas: (O(2).params.ventanas ?? []).length,
    mangoKind: O(37).params.kind, espejos: objs.filter((o) => o.params.espejo).length,
    escalasNeg: objs.filter((o) => { const s = o.mesh.scale; return s.x < 0 || s.y < 0 || s.z < 0; }).length,
  };
  // Simulación: rigidez del brazo y jalón que mueve la pila.
  O(20).stack.selected = 3; O(20).rebuildStackVisual();
  const p = (i) => O(i).mesh.position.clone();
  const a0 = { c34: p(34), c37: p(37), c38: p(38) };
  ed.startSimulation();
  for (let i = 0; i < 120 && !ed.physics; i++) await new Promise((x) => setTimeout(x, 50));
  await new Promise((x) => setTimeout(x, 2500));
  const avisos = ed.physics.avisosDeArmado();
  const barra = O(17), pila = O(20);
  const b0 = barra.mesh.position.clone(); const y0 = pila.mesh.position.y;
  let rango = 0, kg = 0;
  ed.physics.grab(barra.id, b0.clone());
  for (let i = 0; i < 40; i++) {
    ed.physics.dragTo(b0.clone().add(new T.Vector3(0, -Math.min(2 + i * 2, 80), 1 + i * 0.3)));
    await new Promise((x) => setTimeout(x, 100));
    rango = Math.max(rango, pila.mesh.position.y - y0);
    kg = Math.max(kg, ed.tensionManoKg());
  }
  const a1 = { c34: p(34), c37: p(37), c38: p(38) };
  const d = (x, y) => +x.distanceTo(y).toFixed(2);
  const res = { ...base, avisos, rango: +rango.toFixed(1), kg: +kg.toFixed(1),
    rig37: +(d(a0.c34, a0.c37) - d(a1.c34, a1.c37)).toFixed(2),
    rig38: +(d(a0.c34, a0.c38) - d(a1.c34, a1.c38)).toFixed(2) };
  ed.physics.release?.(); ed.endSimInteraction?.();
  await new Promise((x) => setTimeout(x, 800));
  return res;
});
console.log(JSON.stringify(r).replace(/,"/g, ', "'));
ok(r.piezas === 41, `41 piezas insertadas (${r.piezas})`);
ok(r.uniones === 16 && r.soldaduras === 15, `16 uniones, 15 soldaduras (${r.uniones}/${r.soldaduras})`);
ok(r.cables === 2 && r.rojos === 0, `2 cables válidos (${r.cables}, rojos ${r.rojos})`);
ok(r.grupos.includes("UpperMachine"), `queda agrupada como máquina (${r.grupos.join(", ")})`);
ok(r.colPinhole === 2.5 && r.colVentanas === 1 && r.mangoKind === "tube", "la geometría de las piezas llega intacta");
ok(r.espejos === 4 && r.escalasNeg === 0, "los volteos van horneados, sin escalas negativas");
ok(r.avisos.length === 0, `sin avisos de armado (${r.avisos.join(" · ") || "ninguno"})`);
ok(Math.abs(r.rig37) < 1 && Math.abs(r.rig38) < 1, `el brazo compuesto se mueve rígido (${r.rig37}/${r.rig38} cm)`);
ok(r.rango > 8, `el jalón mueve la pila (${r.rango} cm, ${r.kg} kg)`);
await page.screenshot({ path: `${OUT}/v236-uppermachine-libreria.png` });
console.log(errores.length ? "errores: " + errores.join(" | ") : "errores de página: ninguno");
console.log(fallos.length ? `❌ ${fallos.length} fallo(s)` : "✅ todo correcto");
await browser.close();
process.exit(fallos.length || errores.length ? 1 : 0);
