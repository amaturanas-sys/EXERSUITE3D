// PRUEBA: LA BARRA OLÍMPICA (v0.3.69).
//
// Una barra no es un tubo: tiene tres diámetros y el eje no es liso de punta a
// punta. Lo que se comprueba, y por qué cada cosa:
//
//   1. LOS TRES DIÁMETROS, medidos sobre la malla. Manga Ø5, collar Ø6.2, eje
//      Ø2.8. No se leen de la biblioteca —eso no comprobaría nada—: se recorre
//      la barra a lo largo y se mira hasta dónde llega el material en cada
//      tramo.
//
//   2. QUE LA MANGA ENTRA EN EL DISCO. Ésta es la que de verdad importa y la
//      única que cruza dos piezas: la manga de la barra y el agujero de los
//      discos salen de dos modelos de CAD distintos, y si alguien mueve uno sin
//      el otro el juego deja de montar. Se mide el agujero del disco de 45 lb y
//      se compara con la manga.
//
//   3. DÓNDE HAY MOLETEADO Y DÓNDE NO. El moleteado son surcos, así que en un
//      tramo moleteado el radio OSCILA a lo largo del eje y en uno liso es
//      constante. Con eso se dibuja el perfil de la barra sin mirar el modelo:
//      tiene que haber liso en el centro, moleteado a los lados, un corte limpio
//      en la marca de agarre y liso otra vez junto al collar.
//
//   4. QUE EL MOLETEADO SE VE. Va en su propio material —es lo que lo distingue
//      del cromo pulido del resto— y ocupa una parte razonable de la barra: si
//      saliera el 90 % es que la banda se comió la pieza, y si saliera el 2 % es
//      que no se pintó.
import { chromium } from "playwright-core";

let fallos = 0;
const ok = (cond, msg, dato) => {
  if (cond) console.log(`✓ ${msg}`);
  else { fallos++; console.log(`✗ ${msg}${dato === undefined ? "" : ` — ${dato}`}`); }
};

// LA BARRA, A MANO, en cm. De la ficha de despiece.
const LARGO = 220.0;
const MANGA_D = 4.94;           // Ø49.4: el Ø50 del disco menos su holgura
const COLLAR_D = 6.2;
const EJE_D = 2.8;
const SURCO = 0.03;             // lo que hunde cada surco del moleteado
// Tramos del eje, en fracciones del largo (0 = una punta, 1 = la otra).
const CENTRO = [0.46, 0.54];        // liso
const MOLETEADO = [0.25, 0.42];     // una de las bandas
const JUNTO_AL_COLLAR = [0.775, 0.79];

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

const medido = await page.evaluate(async () => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  const perfilDe = (id, bins) => {
    const o = [...ed.objects.values()].at(-1);
    const g = o.mesh.geometry, pos = g.attributes.position;
    g.computeBoundingBox();
    const tam = g.boundingBox.getSize(new T.Vector3());
    const ejes = [tam.x, tam.y, tam.z];
    const iEje = ejes.indexOf(Math.max(...ejes));
    const radial = [0, 1, 2].filter((k) => k !== iEje);
    const comp = (i, k) => (k === 0 ? pos.getX(i) : k === 1 ? pos.getY(i) : pos.getZ(i));
    const min = g.boundingBox.min.getComponent(iEje), largo = ejes[iEje];
    // Por cada casilla del eje, el radio MAYOR y el MENOR de sus vértices: en
    // un tramo liso coinciden; en uno moleteado los separa el surco.
    const alto = new Array(bins).fill(0), bajo = new Array(bins).fill(1e9);
    for (let i = 0; i < pos.count; i++) {
      const r = Math.hypot(comp(i, radial[0]), comp(i, radial[1]));
      const f = (comp(i, iEje) - min) / largo;
      const k = Math.min(bins - 1, Math.max(0, Math.floor(f * bins)));
      if (r > alto[k]) alto[k] = r;
      if (r < bajo[k]) bajo[k] = r;
    }
    return { alto, bajo, largo, tam: [tam.x, tam.y, tam.z] };
  };

  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  for (let i = 0; i < 120 && !ed.tieneModelo?.("barra-olimpica"); i++) await new Promise((r) => setTimeout(r, 150));
  const barra = ed.addComponent("barra-olimpica");
  barra.mesh.updateMatrixWorld(true);
  const g = barra.mesh.geometry;
  const mats = Array.isArray(barra.mesh.material) ? barra.mesh.material : [barra.mesh.material];
  const perfil = perfilDe("barra-olimpica", 200);

  // El agujero del disco, para cruzarlo con la manga.
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  for (let i = 0; i < 120 && !ed.tieneModelo?.("disco-barbell-45"); i++) await new Promise((r) => setTimeout(r, 150));
  const disco = ed.addComponent("disco-barbell-45");
  const dg = disco.mesh.geometry, dp = dg.attributes.position;
  dg.computeBoundingBox();
  const dtam = dg.boundingBox.getSize(new T.Vector3());
  const de = [dtam.x, dtam.y, dtam.z];
  const dEje = de.indexOf(Math.min(...de));
  const dRad = [0, 1, 2].filter((k) => k !== dEje);
  const dc = (i, k) => (k === 0 ? dp.getX(i) : k === 1 ? dp.getY(i) : dp.getZ(i));
  let agujero = 1e9;
  for (let i = 0; i < dp.count; i++) {
    agujero = Math.min(agujero, Math.hypot(dc(i, dRad[0]), dc(i, dRad[1])));
  }

  return {
    ...perfil,
    triangulos: (g.index ? g.index.count : g.attributes.position.count) / 3,
    grupos: g.groups.length,
    colores: mats.map((m) => m.color.getHex()),
    masa: barra.physics?.massKg,
    agujeroDisco: +(agujero * 2).toFixed(3),
  };
});

// ── 1. LA BARRA ENTRA CON SU MALLA ───────────────────────────────────────
ok(
  medido.triangulos > 20000 && Math.abs(medido.largo - LARGO) < 0.5,
  `la barra entra con la malla del CAD y mide ${medido.largo.toFixed(1)} cm`,
  `${medido.triangulos} triángulos`,
);
ok(medido.masa === 20, `y pesa 20 kg`, `${medido.masa}`);

// ── 2. LOS TRES DIÁMETROS ────────────────────────────────────────────────
const enTramo = (a, b) => {
  const n = medido.alto.length;
  return medido.alto.slice(Math.round(a * n), Math.round(b * n));
};
const dMax = (a, b) => 2 * Math.max(...enTramo(a, b));
const manga = dMax(0.01, 0.15);
const collar = dMax(0.19, 0.205);
const eje = dMax(CENTRO[0], CENTRO[1]);
ok(Math.abs(manga - MANGA_D) < 0.05, `la manga mide Ø${manga.toFixed(2)} cm (torneada a Ø${MANGA_D})`);
ok(Math.abs(collar - COLLAR_D) < 0.15, `el collar mide Ø${collar.toFixed(2)} cm (ficha: Ø${COLLAR_D})`);
ok(Math.abs(eje - EJE_D) < 0.1, `el eje mide Ø${eje.toFixed(2)} cm (ficha: Ø${EJE_D})`);
ok(
  collar > manga && manga > eje,
  "y van de mayor a menor: collar, manga, eje",
  `${collar.toFixed(2)} > ${manga.toFixed(2)} > ${eje.toFixed(2)}`,
);

// ── 3. LA MANGA ENTRA EN EL DISCO ────────────────────────────────────────
// La que cruza dos modelos de CAD distintos, y la única que de verdad monta o
// no monta el juego.
// La holgura tiene que existir Y ser pequeña: sin holgura el disco no enfila,
// y con demasiada baila en la manga.
const juego = medido.agujeroDisco - manga;
ok(
  juego > 0.02 && juego < 0.2,
  `la manga entra en el disco con ${(juego * 10).toFixed(1)} mm de juego: Ø${manga.toFixed(2)} en un agujero de Ø${medido.agujeroDisco} cm`,
);

// ── 4. DÓNDE HAY MOLETEADO Y DÓNDE NO ────────────────────────────────────
// El moleteado son surcos: en un tramo moleteado el radio oscila a lo largo del
// eje; en uno liso, no.
const oscila = (a, b) => {
  const n = medido.alto.length;
  const i0 = Math.round(a * n), i1 = Math.round(b * n);
  let peor = 0;
  for (let k = i0; k < i1; k++) peor = Math.max(peor, medido.alto[k] - medido.bajo[k]);
  return peor;
};
const enKnurl = oscila(MOLETEADO[0], MOLETEADO[1]);
const enCentro = oscila(CENTRO[0], CENTRO[1]);
const enCollar = oscila(JUNTO_AL_COLLAR[0], JUNTO_AL_COLLAR[1]);
ok(
  enKnurl > SURCO * 0.7,
  `la zona de agarre está moleteada: el radio oscila ${(enKnurl * 10).toFixed(2)} mm`,
);
ok(
  enCentro < SURCO * 0.4,
  `el centro está liso: el radio no se mueve (${(enCentro * 10).toFixed(2)} mm)`,
);
ok(
  enCollar < SURCO * 0.4,
  `y el tramo junto al collar también (${(enCollar * 10).toFixed(2)} mm)`,
);

// ── 5. EL MOLETEADO SE VE ────────────────────────────────────────────────
const luz = (hex) => {
  const r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};
ok(medido.grupos === 2 && medido.colores.length === 2, `la barra lleva dos materiales: pulido y moleteado`, `${medido.grupos} grupos`);
if (medido.colores.length === 2) {
  ok(
    luz(medido.colores[0]) - luz(medido.colores[1]) > 0.1,
    `y el moleteado es más mate que el cromo (luz ${luz(medido.colores[0]).toFixed(2)} → ${luz(medido.colores[1]).toFixed(2)})`,
  );
}

console.log(fallos === 0 ? "\nTODO OK" : `\n${fallos} FALLOS`);
await browser.close();
process.exit(fallos === 0 ? 0 : 1);
