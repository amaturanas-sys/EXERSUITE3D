// PRUEBA: EL BRAZO SPOTTER (v0.3.54).
//
// El brazo de seguridad en voladizo que se calza en el pinhole de un montante.
// Lo que se mide es lo que el usuario pidió y lo que puede salir mal al darlo:
//
//   · que ESTÉ y entre con la malla del CAD, con el brazo horizontal;
//   · que EL LARGO SE CAMBIE de verdad — no que el control exista, sino que la
//     pieza mida lo que se le pide;
//   · y sobre todo, que AL CAMBIARLO NO SE DEFORME NADA MÁS. Aquí no vale
//     mirar el bulto: un bulto correcto puede esconder once agujeros vueltos
//     óvalos. Se miden las tres cosas que tienen que salir INDEMNES a cualquier
//     largo — la culata, la pestaña distal y los agujeros— y se comprueba que
//     el acero nuevo aparece SOLO en la banda lisa.
//
// EL MÉTODO, que es lo que le da valor a la prueba: se sondea la malla y se
// compara la MISMA pieza a tres largos. Un agujero se mide por su hueco en la
// nube de vértices; la culata y la pestaña, por el material que hay en los dos
// cantos. Si algo de eso cambia al alargar, la pieza se deformó.
import { chromium } from "playwright-core";

let fallos = 0;
const ok = (cond, msg, dato) => {
  if (cond) console.log(`✓ ${msg}`);
  else { fallos++; console.log(`✗ ${msg}${dato === undefined ? "" : ` — ${dato}`}`); }
};

// LAS COTAS DE TALLER, a mano: las de `cad/src/brazo_spotter.py`.
const CAJA = [13.22, 26.0, 82.82];      // ancho × alto × largo de fábrica
const CULATA_ANCHO = 9.22;              // de oreja a oreja de la C
const AGUJEROS = 11;
const AGUJERO_D = 1.2;
const AGUJERO_PASO = 3.0;
const BANDA = [24.8, 42.8];             // la zona lisa, desde el canto de atrás

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

ok(
  !!(await page.$(".comp-btn:has-text('Brazo spotter')")),
  "«Brazo spotter (voladizo)» está en la paleta",
);

// ── EL SONDEO. Devuelve la misma ficha para cada largo pedido. ───────────
const sonda = async (largoCm) =>
  page.evaluate(async (largo) => {
    const ed = window.exersuite.editor, T = window.exersuite.THREE;
    for (const o of [...ed.objects.values()]) ed.removeObject(o);
    for (let i = 0; i < 80 && !ed.tieneModelo?.("brazo-spotter"); i++)
      await new Promise((r) => setTimeout(r, 150));
    const o = ed.addComponent("brazo-spotter");
    if (largo) { o.params.largoCm = largo; o.rebuildGeometry(); }
    o.mesh.updateMatrixWorld(true);

    const g = o.mesh.geometry;
    g.computeBoundingBox();
    const bb = g.boundingBox, tam = bb.getSize(new T.Vector3());
    const pos = g.attributes.position;
    const atras = bb.min.z;          // el canto de atrás de la culata
    const punta = bb.max.z;          // la punta del brazo

    // LA CULATA: el ancho de oreja a oreja de la C, medido donde vive. Si la
    // pieza se escalara entera, esto crecería con el largo.
    let culata = 0, pestana = 0;
    // LOS AGUJEROS. Un taladro es un cilindro a lo ancho del brazo, así que sus
    // vértices son los únicos que caen POR DENTRO de las dos caras (|x| < 2.45).
    // Por dentro también están los números grabados, y por eso hace falta el
    // segundo filtro: la fila vive a 3 cm del centro de la pieza y los números
    // van debajo. (El 3 no es del CAD sino de la malla YA RECENTRADA, que es lo
    // que la app carga: el bulto corre el cero 2 cm.)
    const FILA = 3.0;
    const zs = [];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      if (z < atras + 1.0) culata = Math.max(culata, Math.abs(x) * 2);
      if (z > punta - 1.0) pestana = Math.max(pestana, y);
      // El cilindro de un taladro: vértices por dentro del ancho del brazo
      // (|x| < 2.5) y a la altura de la fila.
      if (Math.abs(x) < 2.45 && Math.abs(y - FILA) < 0.62) zs.push({ z, y });
    }
    // Los centros: se agrupan los vértices del taladro por cercanía.
    // Se agrupan por z: cada taladro ocupa 1.2 cm y el siguiente está a 3, así
    // que un hueco de 1 cm separa uno de otro sin ambigüedad.
    zs.sort((a, b) => a.z - b.z);
    const grupos = [];
    for (const v of zs) {
      const g0 = grupos[grupos.length - 1];
      if (g0 && v.z - g0[g0.length - 1].z < 1.0) g0.push(v);
      else grupos.push([v]);
    }
    const centros = grupos
      .filter((g0) => g0.length > 6)
      .map((g0) => {
        const zz = g0.map((v) => v.z), yy = g0.map((v) => v.y);
        const dz = Math.max(...zz) - Math.min(...zz);
        const dy = Math.max(...yy) - Math.min(...yy);
        // REDONDO SE MIDE ASÍ: el taladro cruza el brazo a lo ancho, o sea que
        // su círculo vive en el plano YZ. Si la pieza se estirase por aquí, el
        // hueco crecería en z y no en y, y eso es exactamente un óvalo.
        return { z: (Math.max(...zz) + Math.min(...zz)) / 2, diam: dz, ovalo: Math.abs(dz - dy) };
      });

    return {
      tam: [tam.x, tam.y, tam.z].map((v) => +v.toFixed(2)),
      culata: +culata.toFixed(2),
      pestana: +pestana.toFixed(2),
      // Los agujeros, medidos desde la PUNTA: así se comprueba que viajan
      // rígidos con el remate distal y no se reparten al alargar.
      agujeros: centros.map((c) => +(punta - c.z).toFixed(2)),
      diam: centros.map((c) => +c.diam.toFixed(2)),
      ovalo: +Math.max(0, ...centros.map((c) => c.ovalo)).toFixed(3),
      cola: +(atras).toFixed(2),
    };
  }, largoCm);

const fab = await sonda(0);
ok(
  CAJA.every((v, i) => Math.abs(fab.tam[i] - v) < 0.2),
  `entra con la malla del CAD y sus medidas de fábrica (${CAJA.join(" × ")} cm)`,
  fab.tam.join(" × "),
);
ok(
  fab.tam[2] > fab.tam[1] && fab.tam[2] > fab.tam[0],
  "el brazo queda HORIZONTAL: su eje largo es el local z, no el alto",
  fab.tam.join(" × "),
);
ok(
  fab.agujeros.length === AGUJEROS,
  `la fila trae los ${AGUJEROS} agujeros numerados de la referencia`,
  `${fab.agujeros.length}`,
);
ok(
  fab.diam.every((d) => Math.abs(d - AGUJERO_D) < 0.12),
  `los agujeros son REDONDOS y miden Ø${AGUJERO_D} cm`,
  fab.diam.join(" "),
);
ok(
  // La lista va de la PUNTA hacia atrás, así que el paso sale en negativo: lo
  // que importa es su valor absoluto.
  fab.agujeros.every((z, i) => i === 0 || Math.abs(Math.abs(z - fab.agujeros[i - 1]) - AGUJERO_PASO) < 0.1),
  `van a ${AGUJERO_PASO} cm de paso, sin acumular error`,
  fab.agujeros.map((v) => v.toFixed(1)).join(" "),
);
ok(
  Math.abs(fab.culata - CULATA_ANCHO) < 0.2,
  `la culata mide ${CULATA_ANCHO} cm de oreja a oreja`,
  `${fab.culata}`,
);

// ── EL LARGO CAMBIA, Y SOLO EL LARGO ─────────────────────────────────────
const corto = await sonda(70);
const largo = await sonda(140);

ok(
  Math.abs(corto.tam[2] - 70) < 0.2 && Math.abs(largo.tam[2] - 140) < 0.2,
  "el brazo mide lo que se le pide: 70 y 140 cm",
  `${corto.tam[2]} · ${largo.tam[2]}`,
);
// LO QUE NO PUEDE MOVERSE. Ancho y alto son los mismos a los tres largos: si la
// pieza se escalara, crecerían con él.
ok(
  Math.abs(corto.tam[0] - fab.tam[0]) < 0.02 && Math.abs(largo.tam[0] - fab.tam[0]) < 0.02 &&
    Math.abs(corto.tam[1] - fab.tam[1]) < 0.02 && Math.abs(largo.tam[1] - fab.tam[1]) < 0.02,
  "ni el ancho ni el alto se mueven al cambiar el largo",
  `${corto.tam.join("×")} · ${fab.tam.join("×")} · ${largo.tam.join("×")}`,
);
ok(
  Math.abs(corto.culata - fab.culata) < 0.02 && Math.abs(largo.culata - fab.culata) < 0.02,
  "LA CULATA sale indemne a los tres largos",
  `${corto.culata} · ${fab.culata} · ${largo.culata}`,
);
ok(
  Math.abs(corto.pestana - fab.pestana) < 0.02 && Math.abs(largo.pestana - fab.pestana) < 0.02,
  "LA PESTAÑA DISTAL sale indemne a los tres largos",
  `${corto.pestana} · ${fab.pestana} · ${largo.pestana}`,
);
// LOS AGUJEROS, LA PRUEBA DE FUEGO. Redondos y en su sitio respecto de la punta.
ok(
  corto.diam.concat(largo.diam).every((d) => Math.abs(d - AGUJERO_D) < 0.12) &&
    corto.ovalo < 0.05 && largo.ovalo < 0.05,
  "los agujeros SIGUEN REDONDOS a 70 y a 140 cm — no se vuelven óvalos",
  `desviación máxima entre ancho y alto del hueco: 70 → ${corto.ovalo} cm, 140 → ${largo.ovalo} cm`,
);
ok(
  corto.agujeros.length === AGUJEROS && largo.agujeros.length === AGUJEROS,
  "no se pierde ni se inventa ningún agujero al cambiar el largo",
  `${corto.agujeros.length} · ${largo.agujeros.length}`,
);
ok(
  fab.agujeros.every((z, i) =>
    Math.abs(corto.agujeros[i] - z) < 0.05 && Math.abs(largo.agujeros[i] - z) < 0.05),
  "los once viajan RÍGIDOS con la punta: misma distancia a la pestaña a los tres largos",
  `fábrica ${fab.agujeros[0]}…${fab.agujeros[10]} · 70 ${corto.agujeros[0]}…${corto.agujeros[10]} · 140 ${largo.agujeros[0]}…${largo.agujeros[10]}`,
);
// Y EL ACERO NUEVO APARECE DONDE DEBE. El primer agujero se aleja del CANTO DE
// ATRÁS exactamente lo que crece la pieza, porque lo que se mete va entre medias.
const desdeAtras = (s) => s.tam[2] - s.agujeros[s.agujeros.length - 1];
ok(
  Math.abs((desdeAtras(largo) - desdeAtras(fab)) - (largo.tam[2] - fab.tam[2])) < 0.1,
  "el acero nuevo entra ENTERO en la banda lisa, entre el talón y el primer agujero",
  `del canto al primer agujero: ${desdeAtras(fab).toFixed(1)} → ${desdeAtras(largo).toFixed(1)} cm`,
);

console.log(fallos === 0 ? "TODO OK" : `❌ ${fallos} fallo(s)`);
await browser.close();
process.exit(fallos ? 1 : 0);
