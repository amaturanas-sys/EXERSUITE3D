// PRUEBA: EL MOLETEADO DE UN TRAMO DE TUBO (v0.3.71).
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
//   4. QUE NO CAMBIA EL MATERIAL. El moleteado se ve por su RELIEVE —por cómo
//      corta la luz—, no por ir pintado: un tubo moleteado sigue siendo el mismo
//      tubo del mismo acero, y eso hay que vigilarlo porque la maquinaria de los
//      dos materiales existe y es fácil que se cuele.
//   5. QUE LAS ARISTAS DEL SURCO SON VIVAS. Es lo que separa un moleteado de una
//      ondulación borrosa, y el torno de serie de three.js PROMEDIA las normales
//      entre un tramo del perfil y el siguiente, que es justo lo que redondea la
//      arista. Medirlo por el ángulo entre triángulos vecinos no sirve —un surco
//      de 0.3 mm en 2 mm de flanco se inclina 8°, menos que el paso angular del
//      propio tubo—, y tampoco por si la cara es plana: alrededor del tubo la
//      normal gira a propósito, para que el cilindro no se vea como un prisma.
//      Lo que de verdad distingue una arista viva de una redondeada es que en la
//      arista UN MISMO PUNTO LLEVA DOS NORMALES, una por cada cara que llega a
//      él. Promediadas, lleva una sola. Eso es lo que se cuenta.
//   6. QUE SE QUITA. Desmarcarlo devuelve el tubo liso de siempre.
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
    // PUNTOS CON DOS NORMALES en mitad de la banda: los que están en una arista
    // viva. Con las normales promediadas —el torno de serie— no hay ninguno.
    // Y de paso, cuánto se inclina la superficie a lo largo del eje, que es el
    // relieve mismo.
    const nor = g.attributes.normal;
    const enPunto = new Map();
    let inclina = 0;
    if (nor) {
      const q = (v) => Math.round(v * 1000);
      for (let i = 0; i < pos.count; i++) {
        const f = (c(i, iEje) - min) / largo;
        if (f < 0.4 || f > 0.6) continue;     // en mitad de la banda
        const clave = `${q(pos.getX(i))},${q(pos.getY(i))},${q(pos.getZ(i))}`;
        const n = `${q(nor.getX(i))},${q(nor.getY(i))},${q(nor.getZ(i))}`;
        let set = enPunto.get(clave);
        if (!set) enPunto.set(clave, (set = new Set()));
        set.add(n);
        inclina = Math.max(inclina, Math.abs(
          iEje === 0 ? nor.getX(i) : iEje === 1 ? nor.getY(i) : nor.getZ(i),
        ));
      }
    }
    let conArista = 0;
    for (const set of enPunto.values()) if (set.size > 1) conArista++;
    return {
      onda: alto.map((v, k) => (bajo[k] > 1e8 ? 0 : v - bajo[k])),
      largo,
      grupos: g.groups.length,
      aristas: enPunto.size ? conArista / enPunto.size : 0,
      inclina,
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

// ── 4. NO CAMBIA EL MATERIAL ─────────────────────────────────────────────
ok(
  medido.conMoleteado.colores.length === 1 &&
    medido.conMoleteado.colores[0] === medido.liso.colores[0],
  "el tubo moleteado sigue siendo del mismo acero, sin pintar",
  medido.conMoleteado.colores.map((c) => "#" + c.toString(16)).join(" "),
);

// ── 5. LAS ARISTAS DEL SURCO SON VIVAS ───────────────────────────────────
ok(
  medido.conMoleteado.aristas > 0.9,
  `los surcos tienen arista viva: el ${(medido.conMoleteado.aristas * 100).toFixed(0)} % de los puntos de la banda lleva dos normales, una por cara`,
);
ok(
  medido.conMoleteado.inclina > 0.1,
  `y hay relieve de verdad: la superficie se inclina ${(Math.asin(medido.conMoleteado.inclina) * 180 / Math.PI).toFixed(0)}° a lo largo del eje`,
);
ok(
  medido.liso.inclina < 0.01 && medido.liso.aristas < 0.01,
  `mientras que el tubo liso no se inclina ni tiene aristas (${medido.liso.inclina.toFixed(3)} · ${(medido.liso.aristas * 100).toFixed(0)} %)`,
);

// ── 6. SE QUITA ──────────────────────────────────────────────────────────
ok(
  onda(medido.quitado, 0.05, 0.95) < SURCO * 0.3 && medido.quitado.colores.length === 1,
  "y quitarlo devuelve el tubo liso de siempre",
  `onda ${(onda(medido.quitado, 0.05, 0.95) * 10).toFixed(2)} mm · ${medido.quitado.colores.length} materiales`,
);

console.log(fallos === 0 ? "\nTODO OK" : `\n${fallos} FALLOS`);
await browser.close();
process.exit(fallos === 0 ? 0 : 1);
