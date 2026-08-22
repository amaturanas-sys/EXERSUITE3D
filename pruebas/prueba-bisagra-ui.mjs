// Flujo de USUARIO de la bisagra real: botón "+ Bisagra" → clic en un PUNTO de
// la cara de la 1ª pieza → otro en la cara de la 2ª → panel compacto al costado
// derecho (se puede orbitar) → tamaño/recorrido → "Instalar bisagra".
//
// Desde v0.3.8 el gesto marca CARAS, no piezas: con las dos caras señaladas el
// eje del pivote sale solo, así que el panel ya no pide eje ni cara.
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

const fallos = [];
const chequear = (ok, m) => { if (!ok) fallos.push(m); console.log((ok ? "✓ " : "✗ ") + m); };

// Dos piezas enfrentadas y la cámara mirándolas de frente.
await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const caja = (x, masa, nombre) => {
    const o = ed.addComponent("prim-box");
    o.params = { kind: "box", width: 50, height: 8, depth: 26 };
    o.rebuildGeometry();
    o.mesh.position.set(x, 90, 0);
    o.physics = { massKg: masa, fixed: masa === 0 };
    o.name = nombre;
    ed.bus.emit("objectTransformed", { object: o });
    return o;
  };
  window.__A = caja(-26, 0, "Base").id;
  window.__B = caja(26, 6, "Tapa").id;
  ed.select(null);
  ed.orbit.enableDamping = false;
  ed.orbit.target.set(0, 90, 0);
  ed.sceneManager.camera.position.set(0, 150, 190);
  ed.orbit.update?.();
  ed.requestRender?.();
  window.__aPx = (x, y, z) => {
    const v = new T.Vector3(x, y, z).project(ed.sceneManager.camera);
    const r = document.getElementById("viewport").getBoundingClientRect();
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
  };
});
await page.waitForTimeout(400);

// La sección "Conexiones" nace plegada: se despliega desde su título.
await page.click("#joints .panel-title");
await page.waitForTimeout(250);
await page.click("#joints button:has-text('+ Bisagra')");
await page.waitForTimeout(250);
const hint1 = await page.textContent("#joints .empty-hint");
chequear(/PUNTO de la cara/i.test(hint1 ?? ""),
  `la ayuda pide un punto sobre una cara, no una pieza suelta: "${hint1}"`);

// Se pincha la CARA SUPERIOR de cada caja (y = 94 es su techo).
const pA = await page.evaluate(() => window.__aPx(-26, 94, 0));
await page.mouse.click(pA.x, pA.y);
await page.waitForTimeout(250);
const marcada = await page.evaluate(() => window.exersuite.editor.hayMarcaBisagra());
chequear(marcada, "el primer clic deja marcada la cara elegida");
const pB = await page.evaluate(() => window.__aPx(26, 94, 0));
await page.mouse.click(pB.x, pB.y);
await page.waitForTimeout(400);

const panel = await page.evaluate(() => {
  const p = document.getElementById("bisagra-panel");
  if (!p) return null;
  const r = p.getBoundingClientRect();
  return { ancho: Math.round(r.width), derecha: Math.round(window.innerWidth - r.right), velo: !!document.querySelector(".modal-veil, .overlay") };
});
console.log("  panel:", JSON.stringify(panel));
chequear(!!panel, "se abre el panel de la bisagra");
chequear(!!panel && panel.ancho <= 260 && panel.derecha < 90,
  `el panel es pequeño y va al costado derecho, apartado del carril del Toolbox (${panel?.derecha} px del borde)`);

await page.screenshot({ path: "v232-panel-bisagra.png" });

// Un clic en el visor con el panel abierto no debe armar nada ni seleccionar.
const antes = await page.evaluate(() => window.exersuite.editor.objects.size);
await page.mouse.click(pA.x, pA.y);
await page.waitForTimeout(200);
const durante = await page.evaluate(() => window.exersuite.editor.objects.size);
chequear(antes === durante, "con el panel abierto se puede orbitar sin efectos secundarios");

const sinEjes = await page.evaluate(() => {
  const p = document.getElementById("bisagra-panel");
  return {
    ejes: !!p?.textContent.includes("Eje de giro"),
    caras: !!p?.textContent.includes("Cara de montaje"),
    juntar: !!p?.textContent.includes("Juntar las piezas"),
  };
});
chequear(!sinEjes.ejes && !sinEjes.caras && sinEjes.juntar,
  `el panel ya no pide eje ni cara —los marcó el puntero— y sí ofrece juntar las `
  + `piezas (${JSON.stringify(sinEjes)})`);

await page.click("#bisagra-panel .rold-ejes button:has-text('Media')");
await page.check("#bisagra-panel .rold-check:has-text('Limitar') input");
// Recorrido de −90° a 0°: la tapa puede abatirse hacia abajo y ahí topa.
await page.fill("#bisagra-panel .rold-nums input:nth-child(1)", "-90");
await page.fill("#bisagra-panel .rold-nums input:nth-child(2)", "0");
await page.click("#bisagra-panel button:has-text('Instalar bisagra')");
await page.waitForTimeout(500);

const res = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const ids = [...ed.objects.values()].map((o) => o.componentId);
  const js = ed.listJoints();
  const libre = js.find((j) => !j.locked);
  return {
    sinPanel: !document.getElementById("bisagra-panel"),
    placas: ids.filter((c) => c === "placa-bisagra").length,
    pasador: ids.filter((c) => c === "pasador-bisagra").length,
    soldaduras: js.filter((j) => j.locked).length,
    eje: libre?.axis,
    limites: libre?.limitsEnabled ? [libre.min, libre.max] : null,
    grupo: [...ed.groups.values()].map((g) => g.name),
    ejeVec: libre?.axisVec ? libre.axisVec.toArray().map((v) => +v.toFixed(2)) : null,
    // La Tapa arrancó en x = 26; juntar la arrima hasta el pasador.
    tapaX: +ed.objects.get(window.__B).mesh.position.x.toFixed(2),
    baseX: +ed.objects.get(window.__A).mesh.position.x.toFixed(2),
    aviso: document.querySelector(".drag-measure, #drag-measure")?.textContent ?? "",
  };
});
console.log("  resultado:", JSON.stringify(res));
chequear(res.sinPanel, "el panel se cierra al instalar");
chequear(res.placas === 2 && res.pasador === 1, "quedan montadas dos placas y un pasador");
chequear(res.soldaduras === 3, "tres soldaduras al herraje");
chequear(res.eje === "z" && !!res.ejeVec && Math.abs(res.ejeVec[2]) > 0.99,
  `el eje del pivote sale SOLO de las dos caras marcadas: el canto entre las `
  + `piezas (${JSON.stringify(res.ejeVec)})`);
// Las dos cajas ya nacían casi tocándose (2 cm de hueco), así que «juntar» aquí
// no las acerca: las deja exactamente a la holgura del pasador. La Base, que es
// la referencia, no se mueve ni un milímetro.
const hueco = +(res.tapaX - 25 - (res.baseX + 25)).toFixed(2);
chequear(res.baseX === -26 && Math.abs(hueco - 2.14) < 0.3,
  `la Tapa queda a la holgura del pasador y la Base no se mueve `
  + `(${res.baseX} | ${res.tapaX}; hueco ${hueco} cm = dos veces la holgura)`);
chequear(!!res.limites && res.limites[0] === -90 && res.limites[1] === 0, `recorrido limitado −90–0° (${JSON.stringify(res.limites)})`);
chequear(res.grupo.some((n) => /bisagra/i.test(n)), "el herraje quedó agrupado como 'Bisagra'");

await page.screenshot({ path: "v232-bisagra-montada.png" });

// Simulación: montada sobre la CARA SUPERIOR, el recorrido no lo define el
// límite de −90° sino el MATERIAL — las dos piezas topan entre sí (v0.2.33).
const sim = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  const tapa = ed.objects.get(window.__B);
  ed.startSimulation();
  for (let i = 0; i < 100 && !ed.physics; i++) await new Promise((r) => setTimeout(r, 50));
  await new Promise((r) => setTimeout(r, 200));
  for (let i = 0; i < 240; i++) ed.physics.step(1 / 60);
  const p = tapa.mesh.position.clone();
  const q = tapa.mesh.quaternion.clone();
  const e = new window.exersuite.THREE.Euler().setFromQuaternion(q, "ZYX");
  const r = {
    pos: p.toArray().map((v) => +v.toFixed(1)),
    giroZ: +((e.z * 180) / Math.PI).toFixed(1),
    separadas: ed.piezasSeparadas(ed.objects.get(window.__A), tapa, 0.8),
    contactos: ed.listJoints().find((j) => !j.locked)?.contactos,
  };
  ed.stopSimulation();
  return r;
});
console.log("  simulación:", JSON.stringify(sim));
chequear(sim.contactos, "la bisagra instalada desde la UI pide contactos reales");
chequear(
  Math.abs(sim.giroZ) < 25,
  `montada sobre la cara superior, el MATERIAL frena el plegado antes del tope (${sim.giroZ}°)`,
);
chequear(sim.separadas, "las dos piezas no se atraviesan");
await page.screenshot({ path: "v232-bisagra-sim.png" });

console.log("\nerrores de página:", errores.length ? errores : "ninguno");
console.log(fallos.length ? `\n❌ ${fallos.length} fallo(s)` : "\n✅ todo correcto");
await browser.close();
process.exit(fallos.length || errores.length ? 1 : 0);
