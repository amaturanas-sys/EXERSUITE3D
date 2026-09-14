// PRUEBA: EL ATRIL DE DISCOS (v0.3.53).
//
// El cuerno que se cuelga de cualquier viga con pinholes. Lo que se mide no es
// que la malla llegue, sino las cuatro cosas de las que depende que la pieza
// sirva para algo:
//
//   · que el CUERNO ESTÉ HORIZONTAL — el GLB sale Y-arriba y sin el cuarto de
//     vuelta de inserción la pieza entra mirando al techo, y un cuerno vertical
//     no guarda discos: los deja caer;
//   · que el cuerno tenga el Ø50 del ORIFICIO de un disco olímpico, que es la
//     única cota que decide si un disco entra o se queda fuera;
//   · que la LENGÜETA pase por un pinhole de Ø25 — entra por su diagonal, no
//     por su lado, y es la cota que más fácil se rompe al retocar la pieza;
//   · y que los discos se ensarten DELANTE DE LA PLACA. El atril, a diferencia
//     del cuerno suelto, lleva chapa y lengüeta por detrás: hasta v0.3.53 el
//     primer disco arrancaba desde el canto de atrás del bulto y quedaba metido
//     dentro de la propia placa.
import { chromium } from "playwright-core";

let fallos = 0;
const ok = (cond, msg, dato) => {
  if (cond) console.log(`✓ ${msg}`);
  else { fallos++; console.log(`✗ ${msg}${dato === undefined ? "" : ` — ${dato}`}`); }
};

// LAS COTAS DE TALLER, a mano: las de `cad/src/atril_discos.py`. Si la prueba
// las leyera del propio CAD no comprobaría nada.
const PINHOLE = 2.5;        // Ø25 del montante de la casa
const CUERNO_D = 5.0;       // Ø50, el orificio del disco olímpico
const CUERNO_LARGO = 25.0;
const PLACA_ANCHO = 7.0;
const LENGUETA = { ancho: 1.6, alto: 1.2, nariz: 0.5 };
const CAJA = [7.0, 20.6, 28.2];

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("pageerror", (e) => console.log("✗ PAGEERROR: " + e.message));
await page.goto(process.env.BASE ?? "http://127.0.0.1:4174/");
await page.waitForTimeout(1000);
await page.click("text=🛠 BUILDER"); await page.waitForTimeout(300);
await page.click("text=Crear nuevo proyecto"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Profesional')"); await page.waitForTimeout(300);
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(3000);

// ── 1. ESTÁ EN LA PALETA, EN ESTRUCTURAL ─────────────────────────────────
ok(
  !!(await page.$(".comp-btn:has-text('Atril de discos')")),
  "«Atril de discos» está en la paleta",
);

// ── 2. ENTRA CON LA MALLA DEL CAD Y CON EL CUERNO HORIZONTAL ─────────────
const p = await page.evaluate(async () => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  for (let i = 0; i < 80 && !ed.tieneModelo?.("atril-discos"); i++)
    await new Promise((r) => setTimeout(r, 150));
  const o = ed.addComponent("atril-discos");
  o.mesh.position.set(0, 60, 0);
  o.mesh.updateMatrixWorld(true);

  // LA MALLA, EN EJES DE LA PIEZA. Se sondea la geometría directamente para
  // poder separar el cuerno de la placa: el bulto no distingue una cosa de otra.
  const g = o.mesh.geometry;
  g.computeBoundingBox();
  const bb = g.boundingBox, tam = bb.getSize(new T.Vector3());
  const pos = g.attributes.position;
  // El CUERNO: todo lo que vive pasado el collar de la raíz. Su radio es el
  // mayor alejamiento del eje que se encuentre allí.
  let rCuerno = 0, zMax = -1e9;
  // LA LENGÜETA: lo que queda por DETRÁS de la placa (z < 0). Su sección es lo
  // que tiene que pasar por el pinhole.
  let lgAncho = 0, lgAlto = -1e9, lgBajo = 1e9, zMin = 1e9;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    zMax = Math.max(zMax, z); zMin = Math.min(zMin, z);
    if (z > 5) rCuerno = Math.max(rCuerno, Math.hypot(x, y));
    if (z < -1.2) {
      lgAncho = Math.max(lgAncho, Math.abs(x) * 2);
      lgAlto = Math.max(lgAlto, y); lgBajo = Math.min(lgBajo, y);
    }
  }
  return {
    tam: [tam.x, tam.y, tam.z].map((v) => +v.toFixed(2)),
    vertices: pos.count,
    zMin: +zMin.toFixed(2), zMax: +zMax.toFixed(2),
    cuernoD: +(rCuerno * 2).toFixed(2),
    lengueta: [+lgAncho.toFixed(2), +(lgAlto - lgBajo).toFixed(2)],
    fija: o.physics?.fixed,
  };
});

ok(
  p.vertices > 500 && CAJA.every((v, i) => Math.abs(p.tam[i] - v) < 0.2),
  `entra con la malla del CAD y sus medidas (${CAJA.join(" × ")} cm)`,
  `${p.tam.join(" × ")} · ${p.vertices} vértices`,
);
// EL CUERNO, HORIZONTAL. La prueba no mira el dibujo: el cuerno es el eje LARGO
// de la pieza, y tiene que ser uno de los dos horizontales, nunca el alto.
ok(
  p.tam[2] > p.tam[1] && p.tam[2] > p.tam[0],
  "el cuerno queda HORIZONTAL: el eje largo de la pieza no es el alto",
  `${p.tam.join(" × ")} cm`,
);
ok(
  Math.abs(p.zMax - CUERNO_LARGO) < 0.2 && p.zMin < -0.5,
  `el cuerno vuela ${CUERNO_LARGO} cm por delante de la placa y la lengüeta sale por detrás`,
  `de ${p.zMin} a ${p.zMax} cm`,
);
ok(
  Math.abs(p.cuernoD - CUERNO_D) < 0.15,
  "el cuerno mide Ø5 cm — el orificio de un disco olímpico",
  `Ø${p.cuernoD} cm`,
);
ok(p.fija === true, "el atril nace FIJO: es un estante, no una pieza del mecanismo");

// ── 3. LA LENGÜETA PASA POR EL PINHOLE ───────────────────────────────────
// Una lengüeta rectangular entra en un agujero redondo por su DIAGONAL. Es la
// cuenta que se olvida al ensancharla «para que aguante más».
const diagonal = Math.hypot(p.lengueta[0], p.lengueta[1]);
ok(
  diagonal < PINHOLE * 2 - 0.05,
  `la lengüeta cabe por un pinhole de Ø${(PINHOLE * 2).toFixed(1)} cm — por la diagonal, no por el lado`,
  `${p.lengueta[0]} × ${p.lengueta[1]} cm → diagonal ${diagonal.toFixed(2)} cm`,
);
ok(
  Math.abs(p.lengueta[0] - LENGUETA.ancho) < 0.1 &&
    Math.abs(p.lengueta[1] - (LENGUETA.alto + LENGUETA.nariz)) < 0.1,
  "la lengüeta sale del CAD con su nariz incluida (1.6 × 1.7 cm)",
  `${p.lengueta.join(" × ")}`,
);
ok(
  p.tam[0] <= PLACA_ANCHO + 0.1,
  "la placa no vuela más ancha que la viga de la casa",
  `${p.tam[0]} cm`,
);

// ── 4. LOS DISCOS SE ENSARTAN, Y POR DELANTE DE LA PLACA ─────────────────
const carga = await page.evaluate(async (n) => {
  const ed = window.exersuite.editor;
  const o = [...ed.objects.values()].pop();
  ed.setDiscosMontados ? ed.setDiscosMontados(o, n) : (o.params.discCount = n);
  o.params.discCount = n;
  o.rebuildGeometry?.();
  await new Promise((r) => setTimeout(r, 300));
  const partes = o.getCargaParts();
  return {
    puestos: partes.length,
    z: partes.map((m) => +m.position.z.toFixed(2)).sort((a, b) => a - b),
    r: partes.length ? +(partes[0].geometry.boundingBox?.max.x ?? 0).toFixed(2) : 0,
  };
}, 4);

ok(carga.puestos === 4, "se ensartan los cuatro discos pedidos", `${carga.puestos}`);
// EL PRIMERO, DELANTE DE LA CHAPA. La placa vive en z < 0; un disco con el
// centro en z negativo está metido dentro de ella.
ok(
  carga.z.length > 0 && carga.z[0] > 0,
  "el primer disco asienta POR DELANTE de la placa, no dentro de ella",
  `centros en z = ${carga.z.join(", ")} cm`,
);
// Y NINGUNO SE SALE POR LA PUNTA.
ok(
  carga.z.length > 0 && carga.z[carga.z.length - 1] < CUERNO_LARGO,
  "ninguno se sale por la punta del cuerno",
  `el último en z = ${carga.z[carga.z.length - 1]} cm`,
);

console.log(fallos === 0 ? "TODO OK" : `❌ ${fallos} fallo(s)`);
await browser.close();
process.exit(fallos ? 1 : 0);
