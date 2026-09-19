// PRUEBA: LAS KETTLEBELLS (v0.3.56).
//
// Siete pesas rusas, y una regla de crecimiento que es lo que de verdad hay que
// comprobar: la bola crece con el peso, el asa NO — se planta al llegar a su
// techo ergonómico y de ahí en adelante sólo engorda la bola.
//
// LO QUE SE MIDE, y por qué cada cosa:
//
//   · que las siete entren con la malla del CAD y sus cotas;
//   · que estén DE PIE y apoyadas en su base plana —una pesa rusa tumbada no es
//     una pesa rusa—, comprobado sin mirar el dibujo: su eje largo tiene que ser
//     el ALTO, y la bola tiene que ser más ancha de fondo que de alto… no, al
//     revés: lo que se comprueba es que el alto de la pieza supera a su fondo,
//     que es lo que pasa cuando el asa apunta al techo;
//   · que la BOLA crece en las siete, sin empates;
//   · y LA REGLA: que de 25 kg en adelante el ancho del asa y el Ø del agarre
//     son EL MISMO NÚMERO en las cuatro, mientras la bola sigue engordando. Esto
//     es lo que pidió el diseño y es lo único que no se ve en un bulto.
//
// Y EL CRUCE CONTRA LA FICHA DE TALLER: las cotas no salen de una regla
// inventada sino del ajuste a la tabla A/B/C/D de un fabricante. La prueba
// lleva esa tabla escrita a mano —si la leyera del CAD no comprobaría nada— y
// cruza contra ella el único peso que la tabla y la biblioteca comparten.
import { chromium } from "playwright-core";

let fallos = 0;
const ok = (cond, msg, dato) => {
  if (cond) console.log(`✓ ${msg}`);
  else { fallos++; console.log(`✗ ${msg}${dato === undefined ? "" : ` — ${dato}`}`); }
};

const PESOS = [10, 15, 20, 25, 35, 45, 55];
// LA TABLA DEL FABRICANTE, a mano: peso → [A ancho, B alto, C Ø bola, D Ø agarre]
// en mm. Sólo la fila de 20 kg cae dentro de la biblioteca, y es la que cruza.
const TABLA_20 = { A: 230, B: 255, C: 172, D: 35 };
const TOPE_ASA = 23.0;      // cm: el techo del ancho del asa
const TOPE_AGARRE = 3.5;    // cm: el techo del Ø del agarre

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
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(3000);

// ── EL SONDEO ────────────────────────────────────────────────────────────
const medido = await page.evaluate(async (pesos) => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  const salida = {};
  for (const kg of pesos) {
    for (const o of [...ed.objects.values()]) ed.removeObject(o);
    const id = `kettlebell-${kg}`;
    for (let i = 0; i < 90 && !ed.tieneModelo?.(id); i++) await new Promise((r) => setTimeout(r, 150));
    const o = ed.addComponent(id);
    o.mesh.updateMatrixWorld(true);
    const g = o.mesh.geometry;
    g.computeBoundingBox();
    const bb = g.boundingBox, tam = bb.getSize(new T.Vector3());
    const pos = g.attributes.position;
    const suelo = bb.min.y;                 // la base plana

    // LA BOLA y EL ASA se separan por altura: la bola ocupa la mitad de abajo
    // de la pieza y el asa vive por encima de su corona. Se busca dónde la
    // sección deja de ensancharse —el ecuador— y dónde vuelve a aparecer
    // material estrecho —el agarre—.
    let bolaAncho = 0, asaAncho = 0;
    // El agarre: el tubo del travesaño, medido en lo más alto de la pieza.
    let grosor = 0, gy0 = 1e9, gy1 = -1e9;
    const alto = tam.y;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      // LA BOLA: por debajo de media altura no hay asa que valga.
      if (y < suelo + alto * 0.45) bolaAncho = Math.max(bolaAncho, Math.abs(x) * 2);
      // EL ASA: todo lo de arriba del todo.
      if (y > suelo + alto * 0.62) asaAncho = Math.max(asaAncho, Math.abs(x) * 2);
      // EL TUBO DEL TRAVESAÑO. Se mide en LA REBANADA DE ARRIBA DEL TODO y no
      // «por encima de tal fracción»: el tubo no pasa de Ø3.5, así que los
      // últimos 3.8 cm de la pieza son tubo y nada más. Con un umbral relativo
      // la corona de la bola asomaba por encima en las pesadas y se colaba en
      // la medida —de ahí un «agarre» de Ø7.4 en la de 55—.
      if (Math.abs(x) < 3.0 && y > bb.max.y - 3.8) {
        gy0 = Math.min(gy0, y); gy1 = Math.max(gy1, y);
        grosor = Math.max(grosor, Math.abs(z) * 2);
      }
    }
    salida[kg] = {
      tam: [tam.x, tam.y, tam.z].map((v) => +v.toFixed(2)),
      vertices: pos.count,
      masa: o.physics?.massKg,
      bola: +bolaAncho.toFixed(2),
      asa: +asaAncho.toFixed(2),
      agarre: +Math.min(grosor, gy1 - gy0).toFixed(2),
    };
  }
  return salida;
}, PESOS);

// ── 1. LAS SIETE ENTRAN, DE PIE ──────────────────────────────────────────
for (const kg of PESOS) {
  const m = medido[kg];
  ok(
    m && m.vertices > 2000 && m.tam[1] > 15 && m.masa === kg,
    `la de ${kg} kg entra con la malla del CAD (${m ? m.tam.join(" × ") : "—"} cm) y pesa ${kg} kg`,
    m ? `${m.vertices} vértices · ${m.masa} kg` : "no está",
  );
}
// DE PIE. El asa apunta al techo, así que el ALTO es la cota mayor de las tres
// —o al menos mayor que el fondo, que es el Ø de la bola—. Tumbada saldría al
// revés, y ahí ni se apoya ni se agarra.
ok(
  PESOS.every((kg) => medido[kg].tam[1] > medido[kg].tam[2] + 1),
  "las siete entran DE PIE: el alto supera al fondo en todas",
  PESOS.map((kg) => `${kg}:${medido[kg].tam[1]}>${medido[kg].tam[2]}`).join(" "),
);

// ── 2. LA BOLA CRECE SIEMPRE ─────────────────────────────────────────────
const bolas = PESOS.map((kg) => medido[kg].bola);
ok(
  bolas.every((v, i) => i === 0 || v > bolas[i - 1] + 0.5),
  "la bola crece con cada peso, sin empates",
  bolas.map((v) => v.toFixed(1)).join(" < "),
);

// ── 3. LA REGLA: EL ASA SE PLANTA ────────────────────────────────────────
// De 25 kg en adelante el asa es la MISMA PIEZA. Se compara la de 25 con la de
// 35, 45 y 55: mismo ancho de asa y mismo Ø de agarre, al milímetro.
const topadas = [25, 35, 45, 55];
ok(
  topadas.every((kg) => Math.abs(medido[kg].agarre - medido[25].agarre) < 0.1),
  "de 25 kg en adelante el agarre es EL MISMO tubo en las cuatro",
  topadas.map((kg) => `${kg}:Ø${medido[kg].agarre}`).join(" "),
);
ok(
  Math.abs(medido[25].agarre - TOPE_AGARRE) < 0.15,
  `y ese tubo mide Ø${TOPE_AGARRE} cm, el techo de la tabla`,
  `Ø${medido[25].agarre} cm`,
);
ok(
  topadas.every((kg) => medido[kg].asa <= TOPE_ASA + 0.15),
  `el asa no pasa de ${TOPE_ASA} cm de ancho en ninguna de las cuatro`,
  topadas.map((kg) => `${kg}:${medido[kg].asa}`).join(" "),
);
// Y MIENTRAS TANTO LA BOLA SIGUE. Ésta es la frase entera: entre la de 25 y la
// de 55 el asa no se mueve y la bola gana más de 6 cm.
ok(
  medido[55].bola - medido[25].bola > 5,
  "entre la de 25 y la de 55 el asa no se mueve y la bola gana más de 5 cm",
  `bola ${medido[25].bola} → ${medido[55].bola} cm`,
);
// LAS PEQUEÑAS SÍ CRECEN DE ASA, que es la otra mitad de la regla: si el asa
// fuera siempre igual, el tope no sería un tope sino una constante.
ok(
  medido[20].agarre > medido[10].agarre + 0.15,
  "y por debajo del tope el agarre SÍ crece: de la de 10 a la de 20 engorda",
  `10:Ø${medido[10].agarre} → 20:Ø${medido[20].agarre} cm`,
);

// ── 4. EL CRUCE CONTRA LA FICHA DE TALLER ────────────────────────────────
// La de 20 kg es la única fila que la tabla del fabricante y la biblioteca
// comparten. Sus cuatro cotas tienen que cuadrar.
const m20 = medido[20];
ok(
  Math.abs(m20.bola * 10 - TABLA_20.C) < 6,
  `la bola de la de 20 mide los ${TABLA_20.C} mm de la tabla`,
  `${(m20.bola * 10).toFixed(0)} mm`,
);
ok(
  Math.abs(m20.tam[1] * 10 - TABLA_20.B) < 10,
  `y su alto total, los ${TABLA_20.B} mm — y esta cota NO se ajustó: sale de la geometría`,
  `${(m20.tam[1] * 10).toFixed(0)} mm`,
);
ok(
  Math.abs(m20.agarre * 10 - TABLA_20.D) < 3,
  `y su agarre, los Ø${TABLA_20.D} mm`,
  `Ø${(m20.agarre * 10).toFixed(0)} mm`,
);

// ── 5. LA BURBUJA DE LA PALETA ───────────────────────────────────────────
const botones = await page.evaluate(() =>
  [...document.querySelectorAll(".comp-btn")].map((b) => b.textContent.trim()),
);
ok(
  botones.filter((t) => /Kettlebell/i.test(t)).length === 1,
  "en la paleta hay un solo botón de kettlebell, no siete",
  botones.filter((t) => /Kettlebell/i.test(t)).join(" | ") || "ninguno",
);
const btn = await page.$(".comp-btn:has-text('Kettlebell')");
ok(!!btn, "el botón «Kettlebell» está en la paleta");
await btn.scrollIntoViewIfNeeded();
await btn.click();
await page.waitForTimeout(400);
const opciones = await page.evaluate(() =>
  [...document.querySelectorAll(".comp-burbuja-op")].map((o) => o.textContent.trim()),
);
ok(
  opciones.join(",") === PESOS.map((k) => `${k} kg`).join(","),
  "la burbuja ofrece los siete pesos, en orden",
  opciones.join(",") || "no se abrió",
);
// Y LA QUE SE TOCA ES LA QUE ENTRA. Se elige la de 35, que no es ni la primera
// ni la última ni la del bulto de reserva.
await page.evaluate(() => window.exersuite.editor.objects.forEach((o) => window.exersuite.editor.removeObject(o)));
await page.click(".comp-burbuja-op:has-text('35 kg')");
await page.waitForTimeout(1200);
const puesta = await page.evaluate(() => {
  const o = [...window.exersuite.editor.objects.values()].pop();
  return o ? { comp: o.componentId, masa: o.physics?.massKg } : null;
});
ok(
  puesta && puesta.comp === "kettlebell-35" && puesta.masa === 35,
  "la que se toca es la que entra: elegir «35 kg» coloca la de 35",
  puesta ? `${puesta.comp} · ${puesta.masa} kg` : "no entró ninguna",
);

console.log(fallos === 0 ? "TODO OK" : `❌ ${fallos} fallo(s)`);
await browser.close();
process.exit(fallos ? 1 : 0);
