// v0.2.21: jaula del diseñador nativa, subcategorías plegables de la
// paleta (con persistencia) y discos de carga con la malla distintiva.
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

// 2) Subcategorías plegables: todas con cabecera clicable; plegar
// ESTRUCTURAL esconde sus botones y el estado persiste al re-render.
const P1 = await page.evaluate(() => {
  const cabs = [...document.querySelectorAll("#palette .cat-plegable")].map((c) => c.textContent.trim());
  return { cabeceras: cabs.length, conMaquinas: cabs.some((t) => t.startsWith("Máquinas estándar")) };
});
await page.click("#palette .cat-plegable:has-text('Estructural'), #palette .cat-plegable:has-text('ESTRUCTURAL')");
await page.waitForTimeout(200);
const P2 = await page.evaluate(() => {
  const cab = [...document.querySelectorAll("#palette .cat-plegable")].find((c) => /estructural/i.test(c.textContent));
  const cont = cab.nextElementSibling;
  const persistido = JSON.parse(localStorage.getItem("paleta-plegado") ?? "{}");
  return { plegada: cont.classList.contains("oculto"), botones: cont.querySelectorAll(".comp-btn").length, persistido: persistido["cat:estructural"] === true };
});
await page.screenshot({ path: "v221-paleta-plegable.png" });

// 1) Jaula de potencia del diseñador: 17 piezas TTP con jotas y brazos.
const J = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const antes = new Set([...ed.objects.keys()]);
  ed.insertarMaquina("jaula-potencia", new T.Vector3(0, 0, 0));
  const nuevos = [...ed.objects.values()].filter((o) => !antes.has(o.id));
  const por = (id) => nuevos.filter((o) => o.componentId === id).length;
  return {
    piezas: nuevos.length,
    montantes: por("montante-ttp"),
    jotas: por("j-hook"),
    brazos: por("brazo-seguridad"),
    multigrip: por("multiagarre-ttp"),
  };
});
console.log("paleta:", JSON.stringify({ ...P1, ...P2 }), "jaula:", JSON.stringify(J));

// 3) Discos de carga con la malla del "Disco de peso": registra una
// plantilla distintiva (toro) y verifica que la barra la hereda escalada.
const D = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const barra = ed.addComponent("barra-olimpica", new T.Vector3(0, 120, -200));
  barra.mesh.position.set(0, 120, -200);
  const SceneObjectClass = Object.getPrototypeOf(barra).constructor;
  // Cilindro clásico sin plantilla:
  SceneObjectClass.plantillaDisco = null;
  barra.params.discCount = 2;
  barra.rebuildCargaVisual();
  const clasico = barra.getCargaParts()[0].geometry.attributes.position.count;
  // Plantilla distintiva (toro tumbado: grosor en Y ya alineado):
  SceneObjectClass.plantillaDisco = () => {
    const g = new T.TorusGeometry(20, 4, 10, 40);
    g.rotateX(Math.PI / 2);
    return g;
  };
  barra.rebuildCargaVisual();
  const discos = barra.getCargaParts();
  const g0 = discos[0].geometry;
  g0.computeBoundingBox();
  const tam = g0.boundingBox.getSize(new T.Vector3());
  return {
    clasico,
    conPlantilla: g0.attributes.position.count,
    diam: +Math.max(tam.x, tam.z).toFixed(1),
    grosor: +tam.y.toFixed(1),
    discos: discos.length,
  };
});
console.log("discos:", JSON.stringify(D));

const ok = P1.cabeceras >= 6 && P1.conMaquinas &&
  P2.plegada && P2.persistido &&
  J.piezas === 17 && J.montantes === 4 && J.jotas === 4 && J.brazos === 2 && J.multigrip === 1 &&
  D.clasico !== D.conPlantilla && Math.abs(D.diam - 44) < 0.5 && Math.abs(D.grosor - 3) < 0.3 && D.discos === 2;
await page.evaluate(() => {
  const ed = window.exersuite.editor;
  ed.orbit.target.set(0, 100, 0);
  ed.sceneManager.camera.position.set(240, 160, 240);
  ed.orbit.update?.(); ed.requestRender?.();
});
await page.waitForTimeout(400);
await page.screenshot({ path: "v221-jaula.png" });
console.log(JSON.stringify({ ok }));
console.log("ERRORES:", errores.length ? errores.join("\n") : "ninguno");
await browser.close();
