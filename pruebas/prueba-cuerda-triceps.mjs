// PRUEBA: LA CUERDA DE TRÍCEPS (v0.3.47) — la tercera pieza ergonómica de CAD.
//
// `cuerda-triceps` estaba RETIRADA del catálogo porque lo único que había era
// un cilindro liso, y un cilindro liso no es una cuerda. Vuelve con la malla de
// `cad/src/cuerda_triceps.py`, que trenza los tres cabos de verdad.
//
// Lo que se mide, y lo último es lo que de verdad importa:
//   · vuelve a la paleta, en ERGONÓMICO;
//   · trae malla de CAD y las medidas del STEP (33 cm de caída, la de catálogo);
//   · cuelga derecha, con la oreja del mosquetón arriba;
//   · la sección NO es un tubo liso, sino una colcha con sus valles;
//   · y esa colcha GIRA con la altura, que es lo que hace que sea una cuerda y
//     no tres varillas paralelas.
import { chromium } from "playwright-core";

let fallos = 0;
const ok = (cond, msg, dato) => {
  if (cond) console.log(`✓ ${msg}`);
  else { fallos++; console.log(`✗ ${msg}${dato === undefined ? "" : ` — ${dato}`}`); }
};

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("pageerror", (e) => console.log("✗ PAGEERROR: " + e.message));
await page.goto(process.env.BASE ?? "http://127.0.0.1:4174/");
await page.waitForTimeout(1000);
await page.click("text=📁 PROYECTOS"); await page.waitForTimeout(300);
await page.click(".land-actions button:has-text('NUEVO')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')");
// SE ESPERA A QUE LA APP ESTE LISTA, NO AL RELOJ (v0.3.81): la capa de carga
// se va cuando las mallas estan. Adivinarlo con un timeout fijo es lo que
// hacia parpadear a estas pruebas.
await page.waitForFunction(() => !document.querySelector(".cargando-capa"), null, { timeout: 45000 });
await page.waitForTimeout(3000);

const r = await page.evaluate(async () => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  const botones = [...document.querySelectorAll(".comp-btn")].map((b) => b.textContent.trim());
  const lib = window.exersuite.componentes ?? null;
  const def = lib ? lib.find((d) => d.id === "cuerda-triceps") : null;
  for (let i = 0; i < 60 && !ed.tieneModelo?.("cuerda-triceps"); i++) {
    await new Promise((r) => setTimeout(r, 150));
  }
  const o = ed.addComponent("cuerda-triceps");
  o.mesh.updateMatrixWorld(true);
  const caja = new T.Box3().setFromObject(o.mesh);
  const t = caja.getSize(new T.Vector3());
  const pos = o.mesh.geometry?.attributes?.position;
  const v = new T.Vector3();
  const alto = Math.max(caja.max.y - caja.min.y, 1e-6);
  const xc = (caja.min.x + caja.max.x) / 2, zc = (caja.min.z + caja.max.z) / 2;

  const franja = (desde, hasta) => {
    let min = 1e9, max = -1e9;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      o.mesh.localToWorld(v);
      const f = (v.y - caja.min.y) / alto;
      if (f >= desde && f <= hasta) { min = Math.min(min, v.x); max = Math.max(max, v.x); }
    }
    return max > min ? +(max - min).toFixed(2) : 0;
  };

  // LA SECCIÓN DE UN RAMAL. Se corta el ramal IZQUIERDO por una rodaja fina y
  // se mide, desde su eje, a qué distancia queda la malla: un tubo liso daría
  // siempre lo mismo; una colcha da crestas y valles. Y se apunta en qué
  // dirección cae la cresta, que es lo que tiene que girar con la altura.
  const rodaja = (fraccion) => {
    const y0 = caja.min.y + fraccion * alto;
    let rmax = 0, rmin = 1e9, angCresta = 0, n = 0;
    // El eje del ramal: la media en X de lo que hay en la rodaja, lado
    // izquierdo. No se da por supuesto: se mide.
    let sx = 0, m = 0;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      o.mesh.localToWorld(v);
      if (Math.abs(v.y - y0) < 0.3 && v.x < xc) { sx += v.x; m++; }
    }
    if (!m) return null;
    const xr = sx / m;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      o.mesh.localToWorld(v);
      if (Math.abs(v.y - y0) >= 0.3 || v.x >= xc) continue;
      const dx = v.x - xr, dz = v.z - zc;
      const rad = Math.hypot(dx, dz);
      // Por dentro de la colcha queda el canalillo entre cabos: no es
      // superficie de fuera y no cuenta para crestas ni valles.
      if (rad < 0.6) continue;
      n++;
      if (rad > rmax) { rmax = rad; angCresta = (Math.atan2(dz, dx) * 180) / Math.PI; }
      rmin = Math.min(rmin, rad);
    }
    // Tres cabos: la colcha se repite cada 120°, así que la cresta sólo tiene
    // sentido en ese arco.
    const ang = ((angCresta % 120) + 120) % 120;
    return { rmax: +rmax.toFixed(2), rmin: +rmin.toFixed(2), ang: +ang.toFixed(1), n };
  };
  const baja = rodaja(0.30), alta = rodaja(0.42);
  let giro = null;
  if (baja && alta) {
    const d = Math.abs(baja.ang - alta.ang);
    giro = +Math.min(d, 120 - d).toFixed(1);
  }

  return {
    baja, alta, giro,
    anchoArriba: franja(0.88, 1.0),
    anchoAbajo: franja(0.0, 0.12),
    enPaleta: botones.some((b) => /Cuerda de tr[ií]ceps/i.test(b)),
    categoria: def?.category ?? "sin-lista",
    tam: [t.x, t.y, t.z].map((v) => +v.toFixed(2)),
    vertices: pos?.count ?? 0,
    masa: o.physics?.massKg,
  };
});
console.log("CUERDA:", JSON.stringify(r));
ok(r.enPaleta, "la cuerda de tríceps vuelve a la paleta");
if (r.categoria !== "sin-lista") {
  ok(r.categoria === "ergonomico", "y está en la categoría ERGONÓMICO", r.categoria);
}
ok(r.vertices > 1000, "trae la malla del CAD, no el cilindro de reserva", `${r.vertices} vértices`);
ok(
  Math.abs(r.tam[0] - 14.6) < 0.3 && Math.abs(r.tam[1] - 32.75) < 0.3 && Math.abs(r.tam[2] - 5.6) < 0.3,
  "con las medidas del STEP: 14,6 × 32,75 × 5,6 cm (los 33 cm de caída del catálogo)",
  r.tam.join(" × "),
);
ok(
  r.anchoAbajo > 12 && r.anchoArriba < 5,
  "cuelga derecha: los casquillos abajo y la oreja del mosquetón arriba",
  `arriba ${r.anchoArriba} cm, abajo ${r.anchoAbajo} cm`,
);
// LA COLCHA. Media colcha son 1,25 cm y el fondo del valle entre cabos queda a
// menos de 0,8: un tubo liso daría cresta y valle a la misma distancia.
ok(
  r.baja !== null && Math.abs(r.baja.rmax - 1.25) < 0.15 && r.baja.rmax - r.baja.rmin > 0.35,
  "y su sección es una colcha con valles, no un tubo liso",
  r.baja ? `cresta ${r.baja.rmax} cm, valle ${r.baja.rmin} cm` : "sin rodaja",
);
// EL TORCIDO. Con 8 cm de paso, 4 cm de altura son media vuelta: en un arco de
// 120° eso son unos 60°. Tres varillas paralelas darían 0.
ok(
  r.giro !== null && r.giro > 25,
  "y la colcha GIRA con la altura: está torcida, no son tres varillas paralelas",
  `${r.giro}° entre dos rodajas a 4 cm`,
);
ok(r.masa > 0 && r.masa < 5, "con una masa de accesorio, no de estructura", r.masa);

console.log(fallos === 0 ? "TODO OK" : `❌ ${fallos} fallo(s)`);
await browser.close();
process.exit(fallos ? 1 : 0);
