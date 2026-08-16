// v0.2.31: AGRUPAR a partir de la selección en un modelo armado desde cero
// CON ROLDANAS (cuyo conjunto rueda+eje ya venía agrupado), y selección del
// grupo al clicar sobre él. Todo por la interfaz: Mayús+clic y menú Edición.
import { chromium } from "playwright-core";
const browser = await chromium.launch({
  // El Chromium de Playwright ya instalado. Se puede apuntar a otro con
  // CHROMIUM=/ruta/al/chrome (ver LEEME.md).
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
const errores = [];
page.on("pageerror", (e) => errores.push("PAGEERROR: " + e.message));
await page.goto("http://127.0.0.1:4174/");
await page.waitForTimeout(1000);
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);

// ── Modelo desde cero: pilar + viga + roldana interna (rueda+eje) + terminal
const M = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  ed.orbit.enableDamping = false;
  ed.orbit.target.set(20, 120, 0);
  ed.sceneManager.camera.position.set(170, 210, 330);
  ed.orbit.update?.();
  window.__aPx = (x, y, z) => {
    const v = new T.Vector3(x, y, z).project(ed.sceneManager.camera);
    const r = document.getElementById("viewport").getBoundingClientRect();
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
  };
  const pilar = ed.addComponent("pilar", new T.Vector3(0, 100, 0));
  const viga = ed.addComponent("prim-box", new T.Vector3(35, 190, 0));
  viga.name = "Viga";
  viga.mesh.name = "Viga";
  viga.params = { kind: "box", width: 80, height: 10, depth: 10 };
  viga.rebuildGeometry();
  viga.physics = { ...viga.physics, fixed: true };
  ed.select(null);
  // Roldana INTERNA en la viga: nace como su propio conjunto agrupado.
  ed.beginRoldana();
  ed.elegirEstructuraRoldana(viga);
  ed.colocarRoldanaEnEje(viga, new T.Vector3(60, 190, 0), "interna", "abajo");
  ed.cancelRoldana();
  const term = ed.addComponent("terminal-cable", new T.Vector3(0, 186, 0));
  ed.select(null);
  window.__ids = {
    pilar: pilar.id,
    viga: viga.id,
    term: term.id,
    rold: [...ed.objects.values()].find((o) => o.name.startsWith("Roldana interna")).id,
    eje: [...ed.objects.values()].find((o) => o.componentId === "eje-roldana").id,
  };
  return {
    piezas: [...ed.objects.values()].filter((o) => !o.componentId.startsWith("ws-")).length,
    grupos: ed.groups.size,
    // El conjunto de la roldana ya viene agrupado (rueda + eje).
    grupoRoldana: ed.groups.get(ed.objGroup.get(window.__ids.rold))?.ids.length ?? 0,
  };
});
console.log("modelo:", JSON.stringify(M));

// ── 1) SELECCIÓN DE ÁREA (menú Selección) y marquesina sobre el modelo ───
await page.click("#toolbar button:has-text('Selección')");
await page.waitForTimeout(300);
await page.click("text=Selección de área");
await page.waitForTimeout(300);
const areaOn = await page.evaluate(() => window.exersuite.editor.isAreaSelect());
// Desde la v0.2.57 elegir «Selección de área» COLAPSA su menú, así que esto
// ya no hace falta; se conserva como red de seguridad y para dejar constancia
// de que antes el menú se reabría encima del lienzo y se comía el primer clic
// de la marquesina.
await page.keyboard.press("Escape");
await page.waitForTimeout(200);
const menuCerrado = await page.evaluate(() =>
  !document.querySelector(".tool-menu")?.classList.contains("open"));
console.log("menu cerrado antes de arrastrar:", menuCerrado);

// Rectángulo que abarca los ORÍGENES de las cinco piezas (es lo que mide la
// marquesina) con holgura.
const caja = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const pts = Object.values(window.__ids).map((id) => {
    const p = ed.getObject(id).mesh.position;
    return window.__aPx(p.x, p.y, p.z);
  });
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return {
    x0: Math.min(...xs) - 45,
    y0: Math.min(...ys) - 45,
    x1: Math.max(...xs) + 45,
    y1: Math.max(...ys) + 45,
  };
});
console.log("caja:", JSON.stringify(caja));
await page.mouse.move(caja.x0, caja.y0);
await page.mouse.down();
await page.mouse.move(caja.x1, caja.y1, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(400);
const sel = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  return {
    multi: ed.multiSel.size,
    incluyeRueda: ed.multiSel.has(window.__ids.rold),
    incluyeEje: ed.multiSel.has(window.__ids.eje),
  };
});
console.log("1-seleccion de area:", JSON.stringify({ areaOn, ...sel }));
await page.screenshot({ path: "grupo-1-seleccion.png" });

// La herramienta de área se desactiva para que los clics vuelvan a elegir.
await page.click("#toolbar button:has-text('Selección')");
await page.waitForTimeout(250);
await page.click("text=Selección de área");
await page.waitForTimeout(250);

// ── 2) Menú Edición → Agrupar ────────────────────────────────────────────
await page.click("#toolbar button:has-text('Edición')");
await page.waitForTimeout(300);
const etiqueta = await page.evaluate(() => {
  const it = [...document.querySelectorAll(".menu-item, .menu button, [class*=menu] *")].find(
    (e) => /^Agrupar/.test((e.textContent ?? "").trim()) && e.children.length === 0,
  );
  return it ? it.textContent.trim() : null;
});
await page.click("text=/^Agrupar/");
await page.waitForTimeout(500);

const G = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const gid = ed.objGroup.get(window.__ids.pilar);
  const g = gid ? ed.groups.get(gid) : null;
  return {
    grupos: ed.groups.size,
    miembros: g ? g.ids.length : 0,
    // TODAS las piezas quedan en el MISMO grupo (incluidas rueda y eje).
    todasJuntas: Object.values(window.__ids).every((id) => ed.objGroup.get(id) === gid),
    seleccionado: ed.selectedGroupId === gid,
    nombre: g?.name ?? null,
  };
});
console.log("2-agrupar:", JSON.stringify({ etiqueta, ...G }));
await page.screenshot({ path: "grupo-2-agrupado.png" });

// ── 3) Clicar sobre el grupo lo SELECCIONA (dos piezas distintas) ────────
const puntos = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  // Puntos sobre la SUPERFICIE visible de cada pieza (no su centro, que
  // puede quedar dentro de otra).
  const sup = (id, off) => {
    const o = ed.getObject(id);
    o.mesh.updateMatrixWorld(true);
    const c = o.mesh.position.clone().add(off);
    return window.__aPx(c.x, c.y, c.z);
  };
  return {
    viga: sup(window.__ids.viga, new T.Vector3(-20, 0, 5.2)),
    pilar: sup(window.__ids.pilar, new T.Vector3(0, -40, 4.2)),
  };
});
await page.evaluate(() => window.exersuite.editor.select(null));
await page.waitForTimeout(200);
await page.mouse.click(puntos.pilar.x, puntos.pilar.y); // clic sobre el pilar
await page.waitForTimeout(300);
const S1 = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const gid = ed.objGroup.get(window.__ids.pilar);
  return { grupoSel: ed.selectedGroupId === gid, piezaSuelta: !!ed.selected };
});
await page.evaluate(() => window.exersuite.editor.select(null));
await page.waitForTimeout(200);
await page.mouse.click(puntos.viga.x, puntos.viga.y); // clic sobre la viga
await page.waitForTimeout(300);
const S2 = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const gid = ed.objGroup.get(window.__ids.viga);
  return { grupoSel: ed.selectedGroupId === gid, piezaSuelta: !!ed.selected };
});
console.log("3-clic sobre el grupo:", JSON.stringify({ desdePilar: S1, desdeViga: S2 }));

// ── 4) El grupo se transforma como bloque y se puede desagrupar ───────────
const T4 = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const antes = Object.fromEntries(
    Object.entries(window.__ids).map(([k, id]) => [k, ed.getObject(id).mesh.position.clone()]),
  );
  // setTransformGrupo fija la posición ABSOLUTA del centro del bloque: para
  // desplazarlo 40 cm hay que pedirle centro + 40.
  const centro = ed.transformGrupo().pos.x;
  ed.setTransformGrupo({ pos: { x: centro + 40 } });
  const movidas = Object.entries(window.__ids).filter(
    ([k, id]) => Math.abs(ed.getObject(id).mesh.position.x - antes[k].x - 40) < 0.01,
  ).length;
  ed.ungroupSelected();
  const sueltas = Object.values(window.__ids).every((id) => !ed.objGroup.has(id));
  return { movidas, total: Object.keys(window.__ids).length, sueltas, grupos: ed.groups.size };
});
console.log("4-bloque y desagrupar:", JSON.stringify(T4));

const ok =
  M.piezas === 5 && M.grupoRoldana === 2 &&
  areaOn && menuCerrado && sel.multi === 5 && sel.incluyeRueda && sel.incluyeEje &&
  /^Agrupar \(5\)/.test(etiqueta ?? "") &&
  G.grupos === 1 && G.miembros === 5 && G.todasJuntas && G.seleccionado &&
  S1.grupoSel && !S1.piezaSuelta && S2.grupoSel && !S2.piezaSuelta &&
  T4.movidas === T4.total && T4.sueltas && T4.grupos === 0;
console.log(JSON.stringify({ ok }));
console.log("ERRORES:", errores.length ? errores.join("\n") : "ninguno");
await browser.close();
