// v0.2.45 · El choque con la estructura se AVISA, no se impide.
// (Sustituye a la prueba del tope de ▲▼ de v0.2.43: frenar la articulación
// dejaba muerta una dirección entera del recorrido y escondía justo la
// evidencia que interesa — que la máquina no deja sitio al cuerpo.)
import { chromium } from "playwright-core";
const browser = await chromium.launch({
  // El Chromium de Playwright ya instalado. Se puede apuntar a otro con
  // CHROMIUM=/ruta/al/chrome (ver LEEME.md).
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
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

const r = await page.evaluate(async () => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  [...document.querySelectorAll("#palette .comp-btn")]
    .find((b) => (b.textContent ?? "").trim().endsWith("UpperMachine")).click();
  await new Promise((x) => setTimeout(x, 1800));
  const pivote = ed.listJoints().find((u) => !u.locked);
  if (pivote) pivote.limitsEnabled = true;
  if (!ed.figureJoints()) await ed.addHumanFigure();
  await new Promise((x) => setTimeout(x, 700));
  ed.startSimulation();
  for (let i = 0; i < 160 && !ed.physics; i++) await new Promise((x) => setTimeout(x, 50));
  await new Promise((x) => setTimeout(x, 2500));

  // La figura, DENTRO de la máquina a propósito.
  const objs = [...ed.objects.values()];
  const caja = new T.Box3().setFromObject(objs[4].mesh);
  const fig = ed.humanFigure;
  ed.applyPose("Sentado");
  // Encajada DENTRO del mástil: es el caso que antes mataba una dirección.
  const resp = objs.find((o) => /Respaldo/i.test(o.name));
  fig.position.set(0, caja.max.y + 18, resp ? resp.mesh.position.z : caja.min.z);
  fig.updateMatrixWorld(true);
  await new Promise((x) => setTimeout(x, 700));

  ed.activarZona("inferior", null); ed.activarZona("bisagra", null);
  ed.activarZona("superior", "sim");   // v0.2.49: la zona sustituye al candado
  const j = ed.figureJoints();
  const codo = () => +T.MathUtils.radToDeg(j.elbowL.rotation.x).toFixed(1);
  const hombro = () => +T.MathUtils.radToDeg(j.shoulderL.rotation.x).toFixed(1);
  const a0 = { codo: codo(), hombro: hombro() };
  let flex = 0, ms = 0;
  for (let i = 0; i < 30; i++) {
    const t0 = performance.now();
    flex += ed.moverPrimitiva(1, 6);
    ms += performance.now() - t0;
  }
  const a1 = { codo: codo(), hombro: hombro() };
  const choqueFlex = ed.contactoConEstructura;
  let ext = 0;
  for (let i = 0; i < 30; i++) ext += ed.moverPrimitiva(-1, 6);
  const a2 = { codo: codo(), hombro: hombro() };
  const res = { a0, a1, a2, flex, ext, choqueFlex, choqueExt: ed.contactoConEstructura,
    msPorPulsacion: +(ms / 30).toFixed(2) };
  ed.stopSimulation();
  return res;
});
console.log("ángulos:", JSON.stringify(r.a0), "→ flex", JSON.stringify(r.a1), "→ ext", JSON.stringify(r.a2));
// v0.2.49: el EMPUJE termina al bloquear el codo (la articulación que manda),
// así que da menos pasos que la TRACCIÓN, que recorre los 165° del codo.
ok(r.flex > 10, `el EMPUJE recorre su rango con la figura metida en la máquina (${r.flex} movimientos)`);
ok(r.ext > 30, `y la TRACCIÓN también (${r.ext}): ninguna dirección queda muerta`);
ok(r.a1.codo > r.a0.codo && r.a2.codo < r.a1.codo, "el codo se mueve en los dos sentidos");
ok(r.choqueFlex || r.choqueExt, `el choque con la estructura SE AVISA (flex ${r.choqueFlex} · ext ${r.choqueExt})`);
ok(r.msPorPulsacion < 25, `coste asumible por pulsación (${r.msPorPulsacion} ms)`);
console.log("ERRORES:", errores.length ? errores.join("\n") : "ninguno");
console.log(fallos.length ? "❌ " + fallos.join(" · ") : "✅ todo correcto");
await browser.close();
process.exit(fallos.length ? 1 : 0);
