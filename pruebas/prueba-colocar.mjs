// v0.2.41 · COLOCAR MANIQUÍ: hover sobre suelo y apoyos ergonómicos, clic
// deja la figura con su posición y orientación. En construcción Y simulación.
import { chromium } from "playwright-core";
import { AYUDANTES } from "./ayudantes-maniqui.mjs";
const browser = await chromium.launch({
  // El Chromium de Playwright ya instalado. Se puede apuntar a otro con
  // CHROMIUM=/ruta/al/chrome (ver LEEME.md).
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1180, height: 900 } });
const errores = [];
page.on("pageerror", (e) => errores.push(e.message));
await page.goto("http://127.0.0.1:4174/");
await page.waitForTimeout(1000);
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(2500);
await page.evaluate(() => {
  [...document.querySelectorAll("#palette .comp-btn")]
    .find((b) => (b.textContent ?? "").trim().endsWith("UpperMachine")).click();
});
await page.waitForTimeout(1800);
const fallos = [];
const ok = (c, m) => { if (!c) fallos.push(m); console.log((c ? "✓ " : "✗ ") + m); };

// Botón en construcción (panel Posturas).
const hayBoton = await page.evaluate(() =>
  !!([...document.querySelectorAll("#articulaciones button")].find((b) => b.textContent.includes("🧍 Colocar"))));
ok(hayBoton, "la ventana del maniquí (modo Posar) ofrece 🧍 Colocar");

const p = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const objs = [...ed.objects.values()];
  ed.beginColocarFigura();
  const rect = ed.sceneManager.renderer.domElement.getBoundingClientRect();
  const proy = (v) => {
    const q = v.clone().project(ed.sceneManager.camera);
    return { x: Math.round((q.x * 0.5 + 0.5) * rect.width), y: Math.round((-q.y * 0.5 + 0.5) * rect.height) };
  };
  const T = window.exersuite.THREE;
  const caja = new T.Box3().setFromObject(objs[4].mesh);   // asiento
  const arriba = new T.Vector3((caja.min.x + caja.max.x) / 2, caja.max.y + 0.2, (caja.min.z + caja.max.z) / 2);
  return { activo: ed.isColocarFigura(), asiento: proy(arriba), suelo: proy(new T.Vector3(90, 0, 60)),
    nombreAsiento: objs[4].name, topeAsiento: +caja.max.y.toFixed(1) };
});
ok(p.activo, "la herramienta queda activa");

// Hover sobre el asiento: aparece la marca de apoyo (verde).
await page.mouse.move(p.asiento.x, p.asiento.y);
await page.waitForTimeout(400);
const marca = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const m = ed.marcaApoyo;
  return m ? { hay: true, color: m.material.color.getHex(), y: +m.position.y.toFixed(1) } : { hay: false };
});
ok(marca.hay, `el puntero marca el punto de apoyo (y ${marca.y})`);
ok(marca.color === 0x7fd08a, `sobre un apoyo ergonómico la marca cambia de color (0x${marca.color?.toString(16)})`);

// Clic: la figura se sienta sobre el asiento y mira al frente.
await page.mouse.click(p.asiento.x, p.asiento.y);
await page.waitForTimeout(900);
await page.evaluate(AYUDANTES);
const sentada = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const f = ed.humanFigure;
  if (!f) return null;
  const j = ed.figureJoints();
  const dir = new T.Vector3(0, 0, 1).applyQuaternion(f.quaternion);
  const caja = new T.Box3().setFromObject(f);
  return { pos: f.position.toArray().map((v) => +v.toFixed(1)),
    mira: dir.toArray().map((v) => +v.toFixed(2)),
    pies: +caja.min.y.toFixed(1),
    // Lo que DEBE posarse sobre el asiento: glúteos y muslos (las piernas
    // cuelgan hacia el suelo y no cuentan).
    apoyo: (() => {
      const APOYAN = new Set(["pelvis"]);
      const c = new T.Box3();
      f.updateMatrixWorld(true);
      f.traverse((n) => { if (n.isMesh && APOYAN.has(n.userData.segmentId)) c.union(new T.Box3().setFromObject(n)); });
      return +c.min.y.toFixed(1);
    })(),
    rodilla: +T.MathUtils.radToDeg(j.kneeR.rotation.x).toFixed(0),
    tope: window.__rodillaAlTope("R") };
});
console.log("sentada:", JSON.stringify(sentada), "tope del asiento", p.topeAsiento);
ok(!!sentada, "la figura se crea al colocarla");
ok(Math.abs(sentada.apoyo - p.topeAsiento) < 2, `los glúteos SE POSAN sobre la cara del asiento sin flotar (${sentada.apoyo} vs ${p.topeAsiento})`);
// La rodilla no se compara contra un numero: se comprueba que esta tan doblada
// como el asiento permite (ver __rodillaAlTope).  Un asiento de 42,5 cm es BAJO
// para este cuerpo —su rodilla esta a 51,8 del suelo—, asi que la pierna se
// adelanta y quedan 59 grados, no los 95 que pide la postura.
ok(sentada.rodilla > 20 && sentada.tope?.alTope,
  `y toma la postura sentada, con la rodilla al tope que da el asiento `
  + `(${sentada.rodilla}°: planta a ${sentada.tope?.planta} cm, y doblando `
  + `${sentada.tope?.mas}° mas se hunde a ${sentada.tope?.doblandoMas})`);
ok(sentada.mira[2] > 0.5, `mirando al frente del asiento (${JSON.stringify(sentada.mira)})`);
await page.screenshot({ path: "v241-colocar.png" });

// En SIMULACIÓN también se puede recolocar.
const enSim = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  ed.startSimulation();
  for (let i = 0; i < 120 && !ed.physics; i++) await new Promise((x) => setTimeout(x, 50));
  await new Promise((x) => setTimeout(x, 2500));
  ed.beginColocarFigura();
  return { simulando: ed.isSimulating(), activo: ed.isColocarFigura(),
    boton: !!([...document.querySelectorAll("#simbar button")].find((b) => b.textContent.includes("🧍"))) };
});
ok(enSim.boton, "la barra de simulación ofrece 🧍 (Builder y Viewer)");
ok(enSim.simulando && enSim.activo, "y la herramienta se puede usar con la física corriendo");
await page.mouse.move(p.suelo.x, p.suelo.y);
await page.waitForTimeout(400);
await page.mouse.click(p.suelo.x, p.suelo.y);
await page.waitForTimeout(900);
const dePie = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const f = ed.humanFigure;
  const dir = new T.Vector3(0, 0, 1).applyQuaternion(f.quaternion);
  const caja = new T.Box3().setFromObject(f);
  return { pos: f.position.toArray().map((v) => +v.toFixed(1)), mira: dir.toArray().map((v) => +v.toFixed(2)),
    pies: +caja.min.y.toFixed(1) };
});
console.log("de pie:", JSON.stringify(dePie));
ok(Math.abs(dePie.pies) < 3, `sobre el suelo apoya los pies en el piso (pies en y ${dePie.pies})`);
ok(dePie.mira[0] < -0.3 || dePie.mira[2] < -0.3, `y mirando hacia la máquina (${JSON.stringify(dePie.mira)})`);
await page.screenshot({ path: "v241-colocar-sim.png" });
console.log("ERRORES:", errores.length ? errores.join("\n") : "ninguno");
console.log(fallos.length ? "❌ " + fallos.join(" · ") : "✅ todo correcto");
await browser.close();
