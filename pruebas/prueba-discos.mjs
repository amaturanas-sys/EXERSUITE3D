// v0.2.97 · LA CARA CON RELIEVE MIRA HACIA FUERA.
//
// Pedido del diseñador: «La cara con relieves (letras y números) deberá mirar
// hacia el sentido opuesto al sentido de la manga. Por ejemplo, en una barra
// cargada con discos, la cara con relieve mira hacia ambos extremos laterales
// de forma que se lee desde ambas vistas de perfil».
//
// Antes todos los discos se montaban con la misma orientación: en un extremo se
// leía y en el otro se veía el dorso liso. Aquí se mide de verdad DÓNDE está el
// relieve en la malla (la cara con más vértices, que es la del bajorrelieve) y
// se comprueba que, montado, apunte hacia el extremo de su lado.
import { chromium } from "playwright-core";

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errores = [];
p.on("pageerror", (e) => errores.push(e.message));
const fallos = [];
const ok = (c, m) => { if (!c) fallos.push(m); console.log((c ? "✓ " : "✗ ") + m); };

await p.goto("http://127.0.0.1:4174/");
await p.waitForTimeout(1000);
await p.click("text=🛠 BUILDER"); await p.waitForTimeout(300);
await p.click("text=Crear nuevo proyecto"); await p.waitForTimeout(300);
await p.click(".wizard-carta:has-text('Profesional')"); await p.waitForTimeout(300);
await p.click(".wizard-carta:has-text('Canvas libre')"); await p.waitForTimeout(2200);

const r = await p.evaluate(async () => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  const obj = ed.addComponent("barra-olimpica");
  obj.params.discCount = 6;
  obj.rebuildCargaVisual();
  await new Promise((x) => setTimeout(x, 200));
  obj.mesh.updateMatrixWorld(true);

  // EJE DE CARGA de la pieza, en su propio marco: el más largo de la malla.
  const geo = obj.mesh.geometry;
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const dims = [bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z];
  const i = dims.indexOf(Math.max(...dims));
  const eje = [new T.Vector3(1, 0, 0), new T.Vector3(0, 1, 0), new T.Vector3(0, 0, 1)][i];
  const centro = bb.getCenter(new T.Vector3());

  const discos = obj.getCargaParts();
  const lectura = discos.map((d) => {
    // ¿DÓNDE ESTÁ EL RELIEVE? En la malla del disco, la cara del bajorrelieve
    // concentra la inmensa mayoría de los vértices. Se cuenta a cada lado del
    // plano medio y gana el lado poblado: así la prueba no depende de recordar
    // que la plantilla trae el relieve en −Y.
    const pos = d.geometry.getAttribute("position");
    const v = new T.Vector3();
    let arriba = 0, abajo = 0;
    for (let k = 0; k < pos.count; k++) {
      v.fromBufferAttribute(pos, k);
      if (v.y > 0) arriba++; else abajo++;
    }
    const caraLocal = new T.Vector3(0, abajo > arriba ? -1 : 1, 0);
    const relieve = caraLocal.applyQuaternion(d.quaternion).normalize();
    // HACIA FUERA = del centro de la pieza hacia el extremo de ESE disco.
    const s = Math.sign(d.position.clone().sub(centro).dot(eje)) || 1;
    const haciaFuera = eje.clone().multiplyScalar(s);
    return {
      lado: s,
      s: +d.position.clone().sub(centro).dot(eje).toFixed(1),
      mira: +relieve.dot(haciaFuera).toFixed(3),
      vertices: [abajo, arriba],
    };
  });
  return { n: discos.length, lectura };
});

console.log(`  ${r.n} discos montados · relieve/vértices ${JSON.stringify(r.lectura[0]?.vertices)}`);
for (const d of r.lectura) console.log(`    lado ${d.lado > 0 ? "+" : "−"} a ${d.s} cm → ${d.mira}`);

ok(r.n >= 4, `la barra monta discos a los dos lados (${r.n})`);
ok(r.lectura.some((d) => d.lado > 0) && r.lectura.some((d) => d.lado < 0),
  "hay discos en los DOS extremos");
for (const d of r.lectura) {
  ok(d.mira > 0.99,
    `disco del lado ${d.lado > 0 ? "+" : "−"} (${d.s} cm): el relieve mira al extremo `
    + `de su manga (${d.mira})`);
}
// Y SIGUEN SIENDO DISCOS: la cara plana perpendicular al eje, no de canto.
ok(r.lectura.every((d) => Math.abs(d.mira) > 0.99),
  "todos los discos quedan perpendiculares al eje de carga (ninguno de canto)");

for (const e of errores) console.log("PAGEERROR " + e);
console.log(fallos.length === 0 && errores.length === 0
  ? "\nTODO OK" : `\n${fallos.length} fallos, ${errores.length} errores de página`);
await browser.close();
process.exit(fallos.length === 0 && errores.length === 0 ? 0 : 1);
