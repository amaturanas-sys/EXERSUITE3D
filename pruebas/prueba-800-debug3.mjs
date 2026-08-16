// v0.2.48 · REGRESIÓN: ninguna ventana PERSISTENTE se solapa ni se sale de
// la pantalla, en 5 tamaños × 7 escenarios. Los elementos TRANSITORIOS
// (menús desplegables, fantasma de arrastre, marquesina, velos modales)
// pueden cubrir a propósito y se cierran al tocar fuera.
// AUDITORÍA DE SOLAPAMIENTO DE LA INTERFAZ.
// Abre combinaciones reales de ventanas y herramientas en varios tamaños de
// pantalla y mide la intersección de sus rectángulos. Lo que se solapa se
// reporta con el área en px² y el porcentaje del elemento más pequeño.
import { chromium } from "playwright-core";

const TAMANOS = [
  { nombre: "tablet vertical 800×1280", w: 800, h: 1280 },
];

const SELECTORES = [
  "#toolbar", "#left-stack", "#articulaciones", "#tool-quick", "#zoom-bar",
  "#hud", "#simbar", "#rold-panel", "#bisagra-panel", ".arrastre-panel",
  ".tool-menu", "#proto-viewer", ".dock-toggle", "#credit",
];

const browser = await chromium.launch({
  // El Chromium de Playwright ya instalado. Se puede apuntar a otro con
  // CHROMIUM=/ruta/al/chrome (ver LEEME.md).
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});

const medir = async (page, etiqueta) => {
  const res = await page.evaluate((sels) => {
    const vistos = [];
    for (const s of sels) {
      for (const n of document.querySelectorAll(s)) {
        const cs = getComputedStyle(n);
        if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) continue;
        const r = n.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) continue;
        // Fuera de pantalla (cajones plegados) no cuenta.
        if (r.right <= 0 || r.bottom <= 0 || r.left >= innerWidth || r.top >= innerHeight) continue;
        vistos.push({ sel: s + (n.id && !s.startsWith("#") ? `#${n.id}` : ""),
          x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
          z: +cs.zIndex || 0 });
      }
    }
    const TRANSITORIO = (s) => /tool-menu|drag-ghost|marquee|overlay/.test(s);
    const solapes = [];
    for (let i = 0; i < vistos.length; i++) {
      for (let j = i + 1; j < vistos.length; j++) {
        const a = vistos[i], b = vistos[j];
        const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        if (ox <= 1 || oy <= 1) continue;
        if (TRANSITORIO(a.sel) || TRANSITORIO(b.sel)) continue;
        const area = ox * oy;
        const menor = Math.min(a.w * a.h, b.w * b.h);
        solapes.push({ a: a.sel, b: b.sel, area, pct: Math.round((area / menor) * 100) });
      }
    }
    // ¿Algo se sale de la pantalla?
    const fuera = vistos.filter((v) => v.x < -1 || v.y < -1 || v.x + v.w > innerWidth + 1 || v.y + v.h > innerHeight + 1);
    return { vistos: vistos.map((v) => v.sel), solapes: solapes.sort((p, q) => q.pct - p.pct), fuera };
  }, SELECTORES);
  const graves = res.solapes.filter((s) => s.pct >= 5);
  console.log(`\n· ${etiqueta}`);
  console.log(`  visibles: ${res.vistos.join(", ")}`);
  if (!graves.length) console.log("  sin solapes");
  for (const s of graves) console.log(`  ⚠ ${s.a} ⨯ ${s.b}: ${s.area} px² (${s.pct}% del menor)`);
  for (const f of res.fuera) console.log(`  ✂ ${f.sel} se sale de la pantalla (${f.x},${f.y} ${f.w}×${f.h})`);
  return graves.length + res.fuera.length;
};

let total = 0;
for (const t of TAMANOS) {
  const page = await browser.newPage({ viewport: { width: t.w, height: t.h } });
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  await page.goto("http://127.0.0.1:4174/");
  await page.waitForTimeout(900);
  await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
  await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
  await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
  await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2200);
  console.log(`\n════ ${t.nombre} ════`);

  // A) Builder recién abierto
  total += await medir(page, "A · Builder base");

  // B) con maniquí (aparece la ventana del maniquí)
  await page.evaluate(async () => {
    const ed = window.exersuite.editor;
    [...document.querySelectorAll("#palette .comp-btn")]
      .find((b) => (b.textContent ?? "").trim().endsWith("UpperMachine")).click();
    await new Promise((x) => setTimeout(x, 1500));
    await ed.addHumanFigure();
    await new Promise((x) => setTimeout(x, 600));
  });
  total += await medir(page, "B · + ventana del maniquí");

  // C) + arrastre preciso + toolbox
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button, .panel-title")]
      .find((n) => /Arrastre preciso/i.test(n.textContent ?? ""));
    b?.click();
  });
  await page.waitForTimeout(400);
  total += await medir(page, "C · + arrastre preciso");

  // D) + diálogo de roldana (costado derecho)
  await page.evaluate(() => {
    const ed = window.exersuite.editor;
    const o = [...ed.objects.values()][0];
    if (o) ed.select(o);
    ed.beginRoldana();
  });
  await page.waitForTimeout(500);
  total += await medir(page, "D · + diálogo de roldana");

  // E) + menú desplegable de la barra superior
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("#toolbar button")].find((n) => /Selección/i.test(n.textContent ?? ""));
    b?.click();
  });
  await page.waitForTimeout(400);
  total += await medir(page, "E · + menú de la barra");

  // D2) el carril derecho ocupado por un diálogo de herramienta
  await page.evaluate(() => document.body.classList.add("dialogo-derecha"));
  await page.waitForTimeout(300);
  total += await medir(page, "D2 · carril ocupado por un diálogo");
  await page.evaluate(() => document.body.classList.remove("dialogo-derecha"));
  await page.waitForTimeout(200);

  // F) simulación (barra inferior + ventana del maniquí en modo simular)
  await page.evaluate(async () => {
    const ed = window.exersuite.editor;
    ed.cancelRoldana?.();
    document.body.click();
    ed.startSimulation();
    for (let i = 0; i < 100 && !ed.physics; i++) await new Promise((x) => setTimeout(x, 50));
    await new Promise((x) => setTimeout(x, 1200));
  });
  total += await medir(page, "F · simulación");
  console.log(JSON.stringify(await page.evaluate(() => {
    const q=(s)=>document.querySelector(s); const rect=(n)=>{const b=n.getBoundingClientRect();return {x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height),bottom:Math.round(b.bottom)};};
    const art=q("#articulaciones"), sim=q("#simbar"); const cs=getComputedStyle(document.documentElement);
    return {simbarH:cs.getPropertyValue("--simbar-h"), toolbarH:cs.getPropertyValue("--toolbar-h"), bottomArt:getComputedStyle(art).bottom, maxH:getComputedStyle(art).maxHeight, art:rect(art), sim:rect(sim), simOffsetH:sim.offsetHeight, body:document.body.className, resumen:q(".art-resumen")?.textContent, tension:q(".sim-tension")?.textContent};
  }), null, 1));
  console.log("espera:", JSON.stringify(await page.evaluate(async () => {
    const cs=getComputedStyle(document.documentElement); const t0=performance.now(); let frames=0;
    const cont=()=>{frames++; requestAnimationFrame(cont);}; requestAnimationFrame(cont);
    let t=null;
    for (let i=0;i<200;i++){ if (cs.getPropertyValue("--simbar-h")!=="0px"){t=Math.round(performance.now()-t0);break;} await new Promise(r=>setTimeout(r,50)); }
    return {msHastaQueSeActualiza:t, valor:cs.getPropertyValue("--simbar-h"), toolbarH:cs.getPropertyValue("--toolbar-h"), framesEnEseRato:frames, bottomArt:getComputedStyle(document.querySelector("#articulaciones")).bottom};
  })));
  await page.screenshot({ path: `ui-${t.w}x${t.h}.png` });
  await page.close();
}
console.log(`\n════ TOTAL de problemas: ${total} ════`);
console.log(total === 0
  ? "✅ ninguna ventana persistente se solapa ni se sale de la pantalla"
  : `❌ ${total} conflicto(s) de interfaz`);
await browser.close();
process.exit(total === 0 ? 0 : 1);
