// PRUEBA: EL MOLETEADO DE UN TRAMO DE TUBO (v0.3.70).
//
// Un tubo es lo que se agarra cuando no hay barra —un multiagarre, un travesaño
// de dominadas, el asa de una máquina—, y el moleteado no va de punta a punta:
// va donde van las manos. Lo que se comprueba:
//
//   1. QUE UN TUBO NACE LISO. La propiedad es opcional y no puede cambiar lo que
//      ya estaba puesto en ningún proyecto. Lo que se cuenta son los MATERIALES,
//      no los grupos: un cilindro de three.js trae tres grupos de fábrica —el
//      costado y las dos tapas— y eso no significa nada.
//   2. QUE EL MOLETEADO CAE DONDE SE PIDE Y SÓLO AHÍ. Se mide el radio a lo
//      largo del tubo: donde hay surcos oscila, y donde no, es constante. Se
//      comprueban los tres tramos —antes, dentro y después—, porque un
//      moleteado que se derrama fuera de su tramo es exactamente el fallo que
//      esta prueba existe para cazar.
//   3. QUE EL TRAMO VA EN FRACCIONES Y NO EN CENTÍMETROS. Se estira el tubo al
//      doble y el moleteado tiene que seguir cubriendo el mismo TROZO de la
//      pieza, no los mismos centímetros: si fuera absoluto, al estirar se
//      quedaría colgando a la mitad.
//   4. QUE SE VE. Va en su propio material, como el de la barra.
//   5. QUE SE QUITA. Desmarcarlo devuelve un tubo liso de un solo material —y
//      esto vale doble, porque el material se pone al rehacer la malla y es muy
//      fácil que se quede pegado de la vez anterior.
import { chromium } from "playwright-core";

let fallos = 0;
const ok = (cond, msg, dato) => {
  if (cond) console.log(`✓ ${msg}`);
  else { fallos++; console.log(`✗ ${msg}${dato === undefined ? "" : ` — ${dato}`}`); }
};

const SURCO = 0.03;             // lo que hunde cada surco
const TRAMO = [0.3, 0.7];

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

const medido = await page.evaluate(async (tramo) => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  // EL PERFIL DEL TUBO: por cada casilla a lo largo, cuánto separa el radio
  // mayor del menor. En un tramo liso, nada; en uno moleteado, el surco.
  const perfil = (o, bins) => {
    const g = o.mesh.geometry, pos = g.attributes.position;
    g.computeBoundingBox();
    const tam = g.boundingBox.getSize(new T.Vector3());
    const ejes = [tam.x, tam.y, tam.z];
    const iEje = ejes.indexOf(Math.max(...ejes));
    const rad = [0, 1, 2].filter((k) => k !== iEje);
    const c = (i, k) => (k === 0 ? pos.getX(i) : k === 1 ? pos.getY(i) : pos.getZ(i));
    const min = g.boundingBox.min.getComponent(iEje), largo = ejes[iEje];
    const alto = new Array(bins).fill(0), bajo = new Array(bins).fill(1e9);
    for (let i = 0; i < pos.count; i++) {
      const r = Math.hypot(c(i, rad[0]), c(i, rad[1]));
      const k = Math.min(bins - 1, Math.max(0, Math.floor(((c(i, iEje) - min) / largo) * bins)));
      if (r > alto[k]) alto[k] = r;
      if (r < bajo[k]) bajo[k] = r;
    }
    const mats = Array.isArray(o.mesh.material) ? o.mesh.material : [o.mesh.material];
    return {
      onda: alto.map((v, k) => (bajo[k] > 1e8 ? 0 : v - bajo[k])),
      largo,
      grupos: g.groups.length,
      colores: mats.map((m) => m.color.getHex()),
    };
  };

  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  const tubo = ed.addComponent("tubo-linea");
  tubo.params.kind = "tube";
  tubo.params.radius = 2.4;
  tubo.params.path = [[0, -60, 0], [0, 60, 0]];
  tubo.params.moleteado = undefined;
  tubo.rebuildGeometry();
  const liso = perfil(tubo, 60);

  tubo.params.moleteado = tramo;
  tubo.rebuildGeometry();
  const conMoleteado = perfil(tubo, 60);

  // Y AHORA, EL DOBLE DE LARGO: el tramo va en fracciones, así que tiene que
  // seguir cubriendo el mismo trozo.
  tubo.params.path = [[0, -120, 0], [0, 120, 0]];
  tubo.rebuildGeometry();
  const estirado = perfil(tubo, 60);

  tubo.params.moleteado = undefined;
  tubo.rebuildGeometry();
  const quitado = perfil(tubo, 60);

  return { liso, conMoleteado, estirado, quitado };
}, TRAMO);

const onda = (p, a, b) => {
  const n = p.onda.length;
  let peor = 0;
  for (let k = Math.round(a * n); k < Math.round(b * n); k++) peor = Math.max(peor, p.onda[k]);
  return peor;
};

// ── 1. UN TUBO NACE LISO ─────────────────────────────────────────────────
ok(
  onda(medido.liso, 0.05, 0.95) < SURCO * 0.3 && medido.liso.colores.length === 1,
  "un tubo sin la propiedad puesta sigue siendo un tubo liso de un solo material",
  `onda ${(onda(medido.liso, 0.05, 0.95) * 10).toFixed(2)} mm · ${medido.liso.colores.length} materiales`,
);

// ── 2. EL MOLETEADO CAE DONDE SE PIDE Y SÓLO AHÍ ─────────────────────────
const dentro = onda(medido.conMoleteado, TRAMO[0] + 0.03, TRAMO[1] - 0.03);
const antes = onda(medido.conMoleteado, 0.05, TRAMO[0] - 0.05);
const despues = onda(medido.conMoleteado, TRAMO[1] + 0.05, 0.95);
ok(dentro > SURCO * 0.7, `el tramo pedido sale moleteado (${(dentro * 10).toFixed(2)} mm de surco)`);
ok(antes < SURCO * 0.3, `y lo de antes del tramo sigue liso (${(antes * 10).toFixed(2)} mm)`);
ok(despues < SURCO * 0.3, `y lo de después también (${(despues * 10).toFixed(2)} mm)`);

// ── 3. EL TRAMO VA EN FRACCIONES ─────────────────────────────────────────
ok(
  Math.abs(medido.estirado.largo - 2 * medido.conMoleteado.largo) < 1,
  `el tubo estirado mide el doble (${medido.conMoleteado.largo.toFixed(0)} → ${medido.estirado.largo.toFixed(0)} cm)`,
);
const dentroE = onda(medido.estirado, TRAMO[0] + 0.03, TRAMO[1] - 0.03);
const fueraE = onda(medido.estirado, 0.05, TRAMO[0] - 0.05);
ok(
  dentroE > SURCO * 0.7 && fueraE < SURCO * 0.3,
  "y el moleteado sigue cubriendo el mismo trozo, no los mismos centímetros",
  `dentro ${(dentroE * 10).toFixed(2)} mm · fuera ${(fueraE * 10).toFixed(2)} mm`,
);

// ── 4. SE VE ─────────────────────────────────────────────────────────────
const luz = (hex) => {
  const r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};
ok(
  medido.conMoleteado.colores.length === 2,
  "el tubo moleteado lleva dos materiales",
  `${medido.conMoleteado.colores.length}`,
);
if (medido.conMoleteado.colores.length === 2) {
  ok(
    Math.abs(luz(medido.conMoleteado.colores[0]) - luz(medido.conMoleteado.colores[1])) > 0.08,
    "y el moleteado se distingue del tubo",
    medido.conMoleteado.colores.map((c) => "#" + c.toString(16)).join(" "),
  );
}

// ── 5. SE QUITA ──────────────────────────────────────────────────────────
ok(
  onda(medido.quitado, 0.05, 0.95) < SURCO * 0.3 && medido.quitado.colores.length === 1,
  "y quitarlo devuelve el tubo liso de un solo material",
  `onda ${(onda(medido.quitado, 0.05, 0.95) * 10).toFixed(2)} mm · ${medido.quitado.colores.length} materiales`,
);

console.log(fallos === 0 ? "\nTODO OK" : `\n${fallos} FALLOS`);
await browser.close();
process.exit(fallos === 0 ? 0 : 1);
