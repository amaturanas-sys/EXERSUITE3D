// v0.2.26: (A) roldana en dos pasos (estructura → eje azul → tipo+dirección),
// (B) carro de doble roldana funcional desde la paleta, (C) revisión de
// inventario (roldana visible; cable/base-apoyo/fulcro ocultos),
// (D) arrastre de la foto de fondo en el prototipo.
import { chromium } from "playwright-core";
const AQUI = new URL(".", import.meta.url).pathname;   // vale desde cualquier cwd
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

// C) Paleta: roldana y carro visibles; cable/base-apoyo/fulcro ocultos.
const C = await page.evaluate(() => {
  const textos = [...document.querySelectorAll("#palette .comp-btn")].map((b) => b.textContent ?? "");
  const hay = (t) => textos.some((x) => x.includes(t));
  return {
    roldana: hay("Roldana"),
    sinCable: !textos.some((x) => x.trim() === "Cable"),
    sinBaseApoyo: !hay("Base de apoyo"),
    sinFulcro: !hay("Fulcro"),
    // v0.2.28: el carro vive en TRANSMISIÓN (la subpestaña de despiece se
    // eliminó) y ninguna cabecera de despiece queda en la paleta.
    carro: hay("Carro de doble roldana TTP"),
    sinDespiece: ![...document.querySelectorAll(".cat-plegable")].some((h) =>
      /Despiece/i.test(h.textContent ?? "")),
  };
});
console.log("C-paleta:", JSON.stringify(C));

// A) Roldana en dos pasos sobre un pilar: click estructura → eje azul →
//    click punto → diálogo (externa + derecha) → roldana colocada.
await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const pilar = ed.addComponent("pilar", new T.Vector3(0, 100, 0));
  window.__pilar = pilar.id;
  ed.select(null);
  ed.beginRoldana();
  // Cámara determinista mirando al pilar (sin damping: la proyección de las
  // coordenadas de click debe coincidir con la cámara REAL al clickear).
  ed.orbit.enableDamping = false;
  ed.orbit.target.set(0, 100, 0);
  ed.sceneManager.camera.position.set(200, 140, 200);
  ed.orbit.update?.();
  ed.requestRender?.();
  // Proyección a píxeles CSS de un punto de mundo, al momento del click.
  window.__aPx = (x, y, z) => {
    const v = new T.Vector3(x, y, z).project(ed.sceneManager.camera);
    const r = document.getElementById("viewport").getBoundingClientRect();
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
  };
});
await page.waitForTimeout(600);
const prep = await page.evaluate(() => ({
  p100: window.__aPx(0, 100, 0),
  p150: window.__aPx(0, 150, 0),
}));
await page.mouse.click(prep.p100.x, prep.p100.y); // fase 1: estructura
await page.waitForTimeout(300);
const fase1 = await page.evaluate(() => ({
  host: window.exersuite.editor.roldanaHost?.id === window.__pilar,
  linea: !!window.exersuite.editor.roldanaAxisLine,
}));
const fase1b = await page.evaluate(() => ({
  host: window.exersuite.editor.roldanaHost?.id,
  linea: !!window.exersuite.editor.roldanaAxisLine,
}));
console.log("fase1:", JSON.stringify({ ...fase1, ...fase1b }), "prep:", JSON.stringify(prep));
const p150b = await page.evaluate(() => window.__aPx(0, 150, 0));
await page.mouse.click(p150b.x, p150b.y); // fase 2: punto del eje
await page.waitForTimeout(500);
const hayDialogo = await page.evaluate(() => {
  const p = document.getElementById("rold-panel");
  if (!p) return false;
  // El panel es COMPACTO y va al costado derecho, SIN velo de fondo visible
  // (se ve el modelo y se puede orbitar detrás).
  const r = p.getBoundingClientRect();
  const veloVisible = [...document.querySelectorAll(".lib-overlay")].some(
    (o) => getComputedStyle(o).display !== "none",
  );
  return r.width < 300 && r.right > window.innerWidth * 0.7 && !veloVisible;
});
console.log("hayDialogo (panel derecho compacto):", hayDialogo);
if (!hayDialogo) await page.screenshot({ path: "v226-debug-sin-dialogo.png" });
await page.click("#rold-panel .rold-opt:has-text('Externa')");
await page.waitForTimeout(200);
await page.click("#rold-panel .rold-dir:has-text('Derecha')");
await page.waitForTimeout(400);
const A = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const pilar = ed.getObject(window.__pilar);
  const rold = [...ed.objects.values()].find((o) => o.name.startsWith("Roldana externa"));
  if (!rold) return { colocada: false };
  const d = rold.mesh.position.clone().sub(pilar.mesh.position);
  return {
    colocada: true,
    fija: rold.physics.fixed,
    altura: +rold.mesh.position.y.toFixed(1),
    lateral: +Math.hypot(d.x, d.z).toFixed(1),
    modoSigue: ed.roldanaMode,
    // v0.2.27: la externa nace con su MONTAJE (placa + 2 mejillas), agrupado.
    soportes: [...ed.objects.values()].filter((o) => o.componentId === "soporte-roldana").length,
    agrupada: !!ed.objGroup.get(rold.id),
  };
});
console.log("A-roldana:", JSON.stringify({ fase1, hayDialogo, ...A }));
await page.screenshot({ path: "v227-roldana-montaje.png" });

// A2) Roldana INTERNA: alojada en el interior del perfil con su APERTURA
//     rectangular en la cara elegida (izquierda, según la vista).
const p120 = await page.evaluate(() => window.__aPx(0, 120, 0));
await page.mouse.click(p120.x, p120.y);
await page.waitForTimeout(500);
await page.click("#rold-panel .rold-opt:has-text('Interna')");
await page.waitForTimeout(200);
await page.click("#rold-panel .rold-dir:has-text('Izquierda')");
await page.waitForTimeout(400);
const A2 = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const pilar = ed.getObject(window.__pilar);
  const rold = [...ed.objects.values()].find((o) => o.name.startsWith("Roldana interna"));
  if (!rold) return { colocada: false };
  const d = rold.mesh.position.clone().sub(pilar.mesh.position);
  // v0.2.30: el hueco es REAL en la geometría del anfitrión (una ventana
  // pasante) y la rueda va montada sobre un EJE de pared a pared — ya no
  // se dibujan placas de apertura encima de las caras.
  const eje = [...ed.objects.values()].find((o) => o.componentId === "eje-roldana");
  const ejeGiro = new window.exersuite.THREE.Vector3(0, 1, 0).applyQuaternion(rold.mesh.quaternion);
  const ejeDir = eje
    ? new window.exersuite.THREE.Vector3(0, 1, 0).applyQuaternion(eje.mesh.quaternion)
    : null;
  return {
    colocada: true,
    altura: +rold.mesh.position.y.toFixed(1),
    lateral: +Math.hypot(d.x, d.z).toFixed(1),
    sinPlacas: [...ed.objects.values()].every((o) => o.componentId !== "apertura-cable"),
    ventanas: (pilar.params.ventanas ?? []).length,
    ejeAlineado: ejeDir ? +Math.abs(ejeDir.dot(ejeGiro)).toFixed(3) : null,
    ejeEnCentro: eje ? +eje.mesh.position.distanceTo(rold.mesh.position).toFixed(2) : null,
    agrupada: !!ed.objGroup.get(rold.id),
  };
});
console.log("A2-interna:", JSON.stringify(A2));
await page.screenshot({ path: "v227-roldana-interna.png" });
await page.keyboard.press("Escape");

// B) Carro de doble roldana: nace con sus 2 roldanas funcionales agrupadas
//    y en simulación se empotran al puente (cuerpo compuesto móvil).
const B = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const antes = new Set([...ed.objects.keys()]);
  ed.insertarCarroDoble(new T.Vector3(80, 0, 80));
  const nuevos = [...ed.objects.values()].filter((o) => !antes.has(o.id));
  const puente = nuevos.find((o) => o.componentId === "puente-carro-ttp");
  const rols = nuevos.filter((o) => o.componentId === "roldana");
  const gid = puente ? ed.objGroup.get(puente.id) : null;
  const nombreGrupo = gid ? ed.groups.get(gid)?.name : null;
  ed.select(null);
  await ed.toggleSimulation();
  const ph = ed.physics;
  const empotradasAlPuente = ph.empotradas.filter((e) =>
    rols.some((r) => r.id === e.obj.id),
  ).length;
  ed.toggleSimulation();
  return {
    piezas: nuevos.length,
    movil: puente ? !puente.physics.fixed : false,
    roldanas: rols.length,
    sonPoleas: rols.every((r) => ed.isPulley(r)),
    grupo: nombreGrupo,
    empotradasAlPuente,
  };
});
console.log("B-carro:", JSON.stringify(B));

// D) Prototipo (viewer): cargar foto, mover con 🖐 y verificar el offset.
await page.waitForTimeout(2000); // autoguardado de la sesión
await page.click("#toolbar button:has-text('Home')");
await page.waitForTimeout(500);
const btnSalir = page.locator("button:has-text('Salir sin guardar')");
if (await btnSalir.count()) await btnSalir.click();
await page.waitForTimeout(800);
await page.click("text=▶ SIMULADOR");
await page.waitForTimeout(500);
await page.click("text=↻  Sesión anterior");
await page.waitForTimeout(4000);
await page.click("#simbar button:has-text('Prototipo')");
await page.waitForTimeout(500);
await page.setInputFiles("#proto-viewer input[type=file]", AQUI + "fijos/foto-garaje.jpg");
await page.waitForTimeout(1200);
const D0 = await page.evaluate(() => ({
  calce: document.body.classList.contains("modo-calce"),
  overlay: getComputedStyle(document.getElementById("proto-overlay")).display !== "none",
}));
await page.click("#proto-viewer button:has-text('Mover y escalar')");
await page.waitForTimeout(300);
const capa = await page.evaluate(() => !!document.getElementById("proto-drag"));
await page.mouse.move(640, 400);
await page.mouse.down();
await page.mouse.move(640, 340, { steps: 6 }); // arrastre 60px hacia arriba
await page.mouse.up();
await page.waitForTimeout(300);
const D = await page.evaluate(() => {
  const ov = document.getElementById("proto-overlay");
  return { transform: ov.style.transform };
});
await page.screenshot({ path: "v226-foto-arrastrada.png" });
console.log("D-foto:", JSON.stringify({ ...D0, capa, ...D }));

const ok =
  C.roldana && C.sinCable && C.sinBaseApoyo && C.sinFulcro && C.carro && C.sinDespiece &&
  fase1.host && fase1.linea && hayDialogo && A.colocada && A.fija &&
  Math.abs(A.altura - 150) < 8 && A.lateral > 5 && A.lateral < 15 && A.modoSigue &&
  A.soportes === 3 && A.agrupada &&
  A2.colocada && Math.abs(A2.altura - 120) < 8 && A2.lateral < 1 &&
  A2.sinPlacas && A2.ventanas === 1 && A2.ejeAlineado > 0.999 &&
  A2.ejeEnCentro < 0.01 && A2.agrupada &&
  B.piezas === 3 && B.movil && B.roldanas === 2 && B.sonPoleas &&
  B.grupo === "Carro de doble roldana" && B.empotradasAlPuente === 2 &&
  D0.calce && D0.overlay && capa && D.transform.includes("-60");
console.log(JSON.stringify({ ok }));
console.log("ERRORES:", errores.length ? errores.join("\n") : "ninguno");
await browser.close();
