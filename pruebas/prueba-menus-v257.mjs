// v0.2.57: los menús desplegables dejan de estorbar al lienzo.
//  1) Elegir una HERRAMIENTA del menú lo colapsa (no tapa el lienzo).
//     Los AJUSTES siguen conservándolo: ahí se tocan varios seguidos.
//  2) Orbitar NO cierra el menú abierto: solo lo cierra un gesto deliberado
//     (su botón, Escape, o elegir una herramienta).
//  3) El carril lateral derecho no abre ni despliega ningún menú.
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
const p = await b.newPage({ viewport: { width: 1024, height: 768 } });
const errs = [];
p.on("pageerror", (e) => errs.push("PAGEERROR: " + e.message));

await p.goto("http://127.0.0.1:4174/");
await p.waitForTimeout(700);
await p.click("text=🛠 BUILDER"); await p.waitForTimeout(300);
await p.click("text=Crear nuevo proyecto"); await p.waitForTimeout(300);
await p.click(".wizard-carta:has-text('Profesional')"); await p.waitForTimeout(300);
await p.click(".wizard-carta:has-text('Canvas libre')"); await p.waitForTimeout(2500);
await p.evaluate(() => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  ed.insertarMaquina("uppermachine", new T.Vector3(0, 0, 0));
});
await p.waitForTimeout(1200);

const abierto = () => p.evaluate(() =>
  document.querySelector(".tool-menu")?.classList.contains("open") ?? false);
const cerrar = async () => { await p.keyboard.press("Escape"); await p.waitForTimeout(200); };

// ── 1) Elegir una HERRAMIENTA colapsa el menú ───────────────────────────
await p.click("#toolbar button:has-text('Selección')"); await p.waitForTimeout(300);
ok(await abierto(), "el menú Selección se abre");
await p.click("text=Selección de área"); await p.waitForTimeout(350);
ok((await abierto()) === false, "1) elegir «Selección de área» COLAPSA el menú");
ok(await p.evaluate(() => window.exersuite.editor.isAreaSelect()),
  "   y la herramienta queda activa");

// Y el gesto funciona A LA PRIMERA donde antes moría: bajo el menú viejo.
const marq = await p.evaluate(async () => {
  const ed = window.exersuite.editor;
  const vp = document.getElementById("viewport").getBoundingClientRect();
  const T = window.exersuite.THREE, v = new T.Vector3();
  const pts = [...ed.objects.values()].map((o) => {
    o.mesh.getWorldPosition(v).project(ed.sceneManager.camera);
    return { x: ((v.x + 1) / 2) * vp.width + vp.left, y: ((1 - v.y) / 2) * vp.height + vp.top };
  });
  return { x0: Math.min(...pts.map((q) => q.x)) - 40, y0: Math.min(...pts.map((q) => q.y)) - 40,
           x1: Math.max(...pts.map((q) => q.x)) + 40, y1: Math.max(...pts.map((q) => q.y)) + 40 };
});
await p.mouse.move(marq.x0, marq.y0);
await p.mouse.down();
await p.mouse.move(marq.x1, marq.y1, { steps: 10 });
const hayRecuadro = await p.evaluate(() => !!document.querySelector(".marquee"));
await p.mouse.up();
await p.waitForTimeout(400);
const n = await p.evaluate(() => window.exersuite.editor.multiSel.size);
ok(hayRecuadro, "1) el recuadro aparece al primer intento");
ok(n > 20, `1) y encuadra la máquina entera sin repetir el gesto (${n} piezas)`);

// Un AJUSTE, en cambio, conserva el menú abierto.
await p.evaluate(() => window.exersuite.editor.select(null));
await p.click("#toolbar button:has-text('Ver')"); await p.waitForTimeout(300);
const itemAjuste = await p.evaluate(() => {
  const it = [...document.querySelectorAll(".tool-menu .menu-item")]
    .find((e) => /Grid del suelo/.test(e.textContent));
  return it ? it.textContent.trim() : null;
});
if (itemAjuste) {
  await p.click(".tool-menu .menu-item:has-text('Grid del suelo')"); await p.waitForTimeout(350);
  ok(await abierto(), `1) un AJUSTE («${itemAjuste}») sí conserva el menú abierto`);
}

// ── 2) Orbitar NO cierra el menú ────────────────────────────────────────
if (!(await abierto())) { await p.click("#toolbar button:has-text('Ver')"); await p.waitForTimeout(300); }
ok(await abierto(), "hay un menú abierto para la prueba de órbita");
await p.mouse.move(700, 640);
await p.mouse.down();
await p.mouse.move(790, 690, { steps: 8 });
await p.mouse.up();
await p.waitForTimeout(300);
ok(await abierto(), "2) ORBITAR en el lienzo NO cierra el menú");

// Pero un cierre deliberado sí: Escape y el propio botón.
await cerrar();
ok((await abierto()) === false, "2) Escape sí lo cierra");
await p.click("#toolbar button:has-text('Ver')"); await p.waitForTimeout(300);
await p.click("#toolbar button:has-text('Ver')"); await p.waitForTimeout(300);
ok((await abierto()) === false, "2) y volver a pulsar su botón también");

// ── 3) El carril lateral no abre menús ──────────────────────────────────
const carril = await p.evaluate(() =>
  [...document.querySelectorAll("#tool-quick button")].map((b) => b.title));
ok(carril.length > 0, `el carril lateral tiene sus herramientas (${carril.length})`);
let abrioAlguno = false;
for (let i = 0; i < Math.min(carril.length, 6); i++) {
  const caja = await p.evaluate((k) => {
    const b = [...document.querySelectorAll("#tool-quick button")][k];
    const r = b.getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
  }, i);
  await p.mouse.click(caja.x, caja.y);
  await p.waitForTimeout(200);
  if (await abierto()) abrioAlguno = true;
}
ok(!abrioAlguno, "3) ninguna herramienta del carril lateral abre un menú");

// Y con un menú abierto, el carril sigue siendo un atajo: no lo despliega más.
await p.click("#toolbar button:has-text('Selección')"); await p.waitForTimeout(300);
const antes = await p.evaluate(() => document.querySelectorAll(".tool-menu .menu-item").length);
const caja0 = await p.evaluate(() => {
  const r = [...document.querySelectorAll("#tool-quick button")][1].getBoundingClientRect();
  return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
});
await p.mouse.click(caja0.x, caja0.y);
await p.waitForTimeout(250);
const despues = await p.evaluate(() => document.querySelectorAll(".tool-menu .menu-item").length);
ok(despues <= antes, `3) usar el carril no despliega más pestañas (${antes} → ${despues})`);

console.log("\nERRORES: " + (errs.length ? errs.join("\n") : "ninguno"));
if (errs.length) fallos += errs.length;
console.log(fallos === 0 ? "\n✅ TODO BIEN" : `\n❌ ${fallos} fallo(s)`);
await b.close();
process.exit(fallos ? 1 : 0);
