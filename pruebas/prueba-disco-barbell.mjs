// PRUEBA: LOS DISCOS «STANDARD BARBELL» (v0.3.63).
//
// Cinco discos de libras distintas, copiados de la foto del juego y de la ficha
// «Olympic Weight Plate Specifications» del fabricante. Lo que se comprueba, y
// por qué cada cosa:
//
//   1. QUE EL AGUJERO NO CAMBIA. Ø5 cm en los cinco, el de la manga olímpica, y
//      la ficha lo repite en sus siete filas. Es la única cota que no se toca
//      por mucho que suba el peso: un disco que no enfila la barra no es un
//      disco. Se mide el radio MÍNIMO de la malla alrededor del eje, que es
//      exactamente el borde del agujero.
//
//   2. QUE LAS COTAS SALEN DE LA FICHA. La prueba lleva la tabla del fabricante
//      ESCRITA A MANO —leerla del CAD no comprobaría nada— y rehace por su
//      cuenta la interpolación: la tabla va en kilos, el juego va en libras, y
//      cada disco se sitúa en ella por su masa. El de 45 lb cae JUSTO en la fila
//      de 20 kg, Ø445 × 35, que es el disco rotulado «45 LBS · 20.4 KGS» de la
//      ficha: ésa se cruza contra la fila tal cual, sin interpolar nada.
//
//   3. QUE LA MALLA PESA LO QUE DICE LA ETIQUETA. El rebaje de los cuarteles no
//      es adorno: es LA MITAD LARGA de la pieza —al de 45 macizo le sobran 18
//      kg de los 38.7 que pesaría—. Así que no basta con que el `massKg` de la
//      biblioteca ponga 20.41: hay que medir el VOLUMEN DE LA MALLA,
//      multiplicarlo por la densidad del hierro y ver si sale ese número. Si
//      alguien dibujara el rebaje «a ojo» y ajustara la masa a mano, esto lo
//      caza.
//
//   4. LA CRUZ DE CUATRO RADIOS, Y SÓLO EN LOS GRANDES. En la foto los discos
//      de 15 kg para arriba llevan cuatro radios rectos separando cuatro
//      cuarteles rebajados, y los chicos no: sólo un anillo rebajado. Se mide
//      sin mirar el dibujo, contando por dónde la pieza conserva su grueso
//      entero: en un disco con cruz hay CUATRO tramos de ángulo a tope de
//      espesor; en uno liso, ninguno.
//
// Y de propina, las letras: el relieve tiene que asomar por LAS DOS CARAS, que
// es lo que pasa con un disco de verdad y lo que se nota en cuanto la cámara
// pasa al otro lado.
import { chromium } from "playwright-core";

let fallos = 0;
const ok = (cond, msg, dato) => {
  if (cond) console.log(`✓ ${msg}`);
  else { fallos++; console.log(`✗ ${msg}${dato === undefined ? "" : ` — ${dato}`}`); }
};

// LA FICHA DEL FABRICANTE, a mano: kg → [Ø mm, canto mm]. Agujero Ø50 en todas.
const FICHA_KG = [
  [1.25, 160, 11],
  [2.5, 200, 16],
  [5, 225, 25],
  [10, 270, 30],
  [15, 347, 32],
  [20, 445, 35],
  [25, 445, 35],
];
const LIBRA = 0.45359237;
const LIBRAS = [10, 15, 25, 35, 45];
const CON_CRUZ = [35, 45];      // los que llevan los cuatro radios
const AGUJERO_CM = 5.0;         // Ø olímpico, la cota que no cambia
const DENSIDAD = 7.2;           // g/cm³, hierro fundido
const RELIEVE_CM = 0.25;        // cuánto asoma la letra de la llanta

// La misma entrada en la tabla que hace el modelo, rehecha aquí a mano.
const segunLaFicha = (lb) => {
  const kg = lb * LIBRA;
  for (let i = 0; i < FICHA_KG.length - 1; i++) {
    const [k0, d0, t0] = FICHA_KG[i], [k1, d1, t1] = FICHA_KG[i + 1];
    if (kg <= k1) {
      const f = (kg - k0) / (k1 - k0);
      return { kg, diametro: (d0 + f * (d1 - d0)) / 10, canto: (t0 + f * (t1 - t0)) / 10 };
    }
  }
  const u = FICHA_KG.at(-1);
  return { kg, diametro: u[1] / 10, canto: u[2] / 10 };
};

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

// ── EL SONDEO ────────────────────────────────────────────────────────────
const medido = await page.evaluate(async (fichas) => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  const salida = {};
  for (const { lb, semiHierro } of fichas) {
    for (const o of [...ed.objects.values()]) ed.removeObject(o);
    const id = `disco-barbell-${lb}`;
    for (let i = 0; i < 90 && !ed.tieneModelo?.(id); i++) await new Promise((r) => setTimeout(r, 150));
    const o = ed.addComponent(id);
    o.mesh.updateMatrixWorld(true);
    const g = o.mesh.geometry;
    g.computeBoundingBox();
    const bb = g.boundingBox, tam = bb.getSize(new T.Vector3());
    const pos = g.attributes.position;

    // EL EJE DEL DISCO es su cota menor: las otras dos son el diámetro. No se
    // da por supuesto cuál es —se busca—, que es lo que hace que la prueba siga
    // sirviendo si algún día cambia el convenio de exportación.
    const ejes = [tam.x, tam.y, tam.z];
    const iEje = ejes.indexOf(Math.min(...ejes));
    const comp = (i, k) => (k === 0 ? pos.getX(i) : k === 1 ? pos.getY(i) : pos.getZ(i));
    const radial = [0, 1, 2].filter((k) => k !== iEje);
    const semiEje = tam.getComponent(iEje) / 2;

    // EL AGUJERO: el radio menor alrededor del eje.
    let rMin = 1e9, rMax = 0;
    let asomaMas = 0, asomaMenos = 0;     // relieve por cada cara
    // EL PERFIL POR ÁNGULO: en el anillo de los cuarteles, hasta dónde llega la
    // pieza en el eje. Donde hay radio, llega al grueso entero; donde hay
    // cuartel rebajado, se queda en el fondo.
    const BINS = 72;
    const tope = new Array(BINS).fill(0);
    for (let i = 0; i < pos.count; i++) {
      const a = comp(i, radial[0]), b = comp(i, radial[1]), e = comp(i, iEje);
      const r = Math.hypot(a, b);
      if (r < rMin) rMin = r;
      if (r > rMax) rMax = r;
      if (e > 0) asomaMas = Math.max(asomaMas, e);
      else asomaMenos = Math.max(asomaMenos, -e);
    }
    // SE RECORREN TRIÁNGULOS, NO VÉRTICES. La cara de arriba de un radio es un
    // plano: sus únicos vértices están en las esquinas, y ésas caen en el cubo
    // y en la llanta, fuera de la banda. Mirando sólo vértices, un radio
    // perfectamente dibujado no aparece por ninguna parte —así salió esta
    // prueba en rojo la primera vez, con el modelo bien—. Se mira, por tanto,
    // qué TRIÁNGULOS están en la cara del hierro con su centro dentro de la
    // banda, y se marca el tramo de ángulo que abarcan.
    const idxT = g.index;
    const nT = idxT ? idxT.count : pos.count;
    const enBanda = (r) => r > 0.45 * rMax && r < 0.78 * rMax;
    const lleno = new Array(BINS).fill(false);
    for (let i = 0; i < nT; i += 3) {
      const tri = [0, 1, 2].map((k) => (idxT ? idxT.getX(i + k) : i + k));
      // ¿Está en la cara del hierro? El semiespesor viene de fuera: el semieje
      // del bulto incluye el relieve de las letras y no sirve de vara.
      if (!tri.every((v) => Math.abs(Math.abs(comp(v, iEje)) - semiHierro) < 0.05)) continue;
      const pol = tri.map((v) => {
        const a = comp(v, radial[0]), b = comp(v, radial[1]);
        let ang = (Math.atan2(b, a) * 180) / Math.PI;
        if (ang < 0) ang += 360;
        return { r: Math.hypot(a, b), ang };
      });
      const rc = (pol[0].r + pol[1].r + pol[2].r) / 3;
      if (!enBanda(rc)) continue;           // llanta y cubo fuera
      const a0 = Math.min(...pol.map((p) => p.ang)), a1 = Math.max(...pol.map((p) => p.ang));
      if (a1 - a0 > 180) continue;          // el triángulo cruza el 0°: se deja
      for (let k = 0; k < BINS; k++) {
        const ang = ((k + 0.5) * 360) / BINS;
        if (ang >= a0 && ang <= a1) lleno[k] = true;
      }
    }
    // CUÁNTOS TRAMOS DE ÁNGULO conservan el grueso entero: cuatro si hay cruz,
    // ninguno si el anillo está rebajado en toda la vuelta.
    let tramos = 0;
    for (let k = 0; k < BINS; k++) if (lleno[k] && !lleno[(k + BINS - 1) % BINS]) tramos++;

    // EL VOLUMEN DE LA MALLA, por tetraedros con vértice en el origen.
    const idx = g.index;
    const n = idx ? idx.count : pos.count;
    const v = new T.Vector3(), w = new T.Vector3(), u = new T.Vector3();
    let vol = 0;
    for (let i = 0; i < n; i += 3) {
      const a = idx ? idx.getX(i) : i, b = idx ? idx.getX(i + 1) : i + 1, c = idx ? idx.getX(i + 2) : i + 2;
      v.fromBufferAttribute(pos, a); w.fromBufferAttribute(pos, b); u.fromBufferAttribute(pos, c);
      vol += v.dot(w.clone().cross(u)) / 6;
    }

    salida[lb] = {
      tam: [tam.x, tam.y, tam.z].map((x) => +x.toFixed(2)),
      diametro: +(rMax * 2).toFixed(2),
      canto: +(semiEje * 2).toFixed(2),
      agujero: +(rMin * 2).toFixed(2),
      volumen: +Math.abs(vol).toFixed(1),
      vertices: pos.count,
      masa: o.physics?.massKg,
      asoma: [+asomaMenos.toFixed(2), +asomaMas.toFixed(2)],
      tramos,
    };
  }
  return salida;
}, LIBRAS.map((lb) => ({ lb, semiHierro: segunLaFicha(lb).canto / 2 })));

// ── 1. LOS CINCO ENTRAN CON SU MALLA Y SU MASA ───────────────────────────
for (const lb of LIBRAS) {
  const m = medido[lb], { kg } = segunLaFicha(lb);
  ok(
    m && m.vertices > 2000 && Math.abs(m.masa - kg) < 0.02,
    `el de ${lb} lb entra con la malla del CAD (${m ? m.tam.join(" × ") : "—"} cm) y pesa ${kg.toFixed(2)} kg`,
    m ? `${m.vertices} vértices · ${m.masa} kg` : "no está",
  );
}

// ── 2. EL AGUJERO NO CAMBIA ──────────────────────────────────────────────
for (const lb of LIBRAS) {
  ok(
    Math.abs(medido[lb].agujero - AGUJERO_CM) < 0.1,
    `el agujero del de ${lb} lb mide Ø${medido[lb].agujero} cm (olímpico, Ø${AGUJERO_CM})`,
  );
}
const agujeros = LIBRAS.map((lb) => medido[lb].agujero);
ok(
  Math.max(...agujeros) - Math.min(...agujeros) < 0.1,
  "los cinco comparten agujero: enfilan la misma manga",
  agujeros.map((v) => `Ø${v}`).join(" "),
);

// ── 3. LOS DIÁMETROS Y LOS CANTOS, CONTRA LA FICHA ───────────────────────
for (const lb of LIBRAS) {
  const f = segunLaFicha(lb), m = medido[lb];
  ok(
    Math.abs(m.diametro - f.diametro) < 0.15,
    `el de ${lb} lb mide Ø${m.diametro} cm; la ficha, entrada por sus ${f.kg.toFixed(2)} kg, pide Ø${f.diametro.toFixed(1)}`,
  );
  // EL CANTO INCLUYE EL RELIEVE de las dos caras: la ficha da el hierro, la
  // malla da el hierro más las letras.
  ok(
    Math.abs(m.canto - (f.canto + 2 * RELIEVE_CM)) < 0.1,
    `su canto es ${m.canto} cm: ${f.canto.toFixed(2)} de hierro y ${RELIEVE_CM} de letra por cara`,
  );
}
// LA FILA QUE NO SE INTERPOLA. El de 45 lb pesa 20.41 kg y cae dentro de la
// fila de 20 kg de la ficha, así que sus cotas son las de esa fila tal cual —y
// son las del disco que la ficha dibuja rotulado «45 LBS · 20.4 KGS».
ok(
  Math.abs(medido[45].diametro - 44.5) < 0.15 &&
    Math.abs(medido[45].canto - (3.5 + 2 * RELIEVE_CM)) < 0.1,
  `el de 45 lb es la fila de 20 kg de la ficha sin tocar: Ø${medido[45].diametro} × 3.5 cm de hierro`,
);

// ── 4. CRECE A LO ANCHO, NO A LO GRUESO ──────────────────────────────────
// Del de 10 al de 45 el diámetro DOBLA y el canto sube apenas la mitad. Es lo
// que hace la ficha y lo que se ve en la foto: el disco se hace grande, no
// gordo. Un juego escalado subiría las dos cotas al mismo ritmo.
const crece = (k) => medido[45][k] / medido[10][k];
ok(
  crece("diametro") > 1.9 && crece("canto") < 1.6,
  `crece a lo ancho: el diámetro se multiplica por ${crece("diametro").toFixed(2)} y el canto sólo por ${crece("canto").toFixed(2)}`,
);
const diams = LIBRAS.map((lb) => medido[lb].diametro);
ok(
  diams.every((v, i) => i === 0 || v > diams[i - 1] + 1),
  "el diámetro crece con cada peso, sin empates",
  diams.map((v) => `Ø${v}`).join(" < "),
);

// ── 5. LA CRUZ DE CUATRO RADIOS, SÓLO EN LOS GRANDES ─────────────────────
for (const lb of LIBRAS) {
  const esperados = CON_CRUZ.includes(lb) ? 4 : 0;
  const m = medido[lb];
  ok(
    m.tramos === esperados,
    CON_CRUZ.includes(lb)
      ? `el de ${lb} lb lleva la cruz: ${m.tramos} tramos a tope de espesor entre los cuarteles`
      : `el de ${lb} lb es liso, sin cruz: el anillo está rebajado en toda la vuelta`,
    `tramos medidos: ${m.tramos}`,
  );
}

// ── 6. LA MALLA PESA LO QUE DICE LA ETIQUETA ─────────────────────────────
for (const lb of LIBRAS) {
  const m = medido[lb], { kg } = segunLaFicha(lb);
  const real = (m.volumen * DENSIDAD) / 1000;
  ok(
    Math.abs(real - kg) / kg < 0.03,
    `el hierro del de ${lb} lb pesa ${real.toFixed(2)} kg de verdad (catálogo ${kg.toFixed(2)})`,
    `${m.volumen} cm³`,
  );
}
// Y QUE EL REBAJE ES GORDO: macizo, cada disco pesaría mucho más.
for (const lb of [10, 45]) {
  const f = segunLaFicha(lb);
  const macizo = (Math.PI * ((f.diametro / 2) ** 2 - 2.5 ** 2) * f.canto * DENSIDAD) / 1000;
  const sobra = (100 * (macizo - f.kg)) / macizo;
  ok(
    sobra > 20,
    `al de ${lb} lb le sobra el ${sobra.toFixed(0)} % del material: macizo pesaría ${macizo.toFixed(1)} kg`,
  );
}

// ── 7. LAS LETRAS, POR LAS DOS CARAS ─────────────────────────────────────
for (const lb of LIBRAS) {
  const [menos, mas] = medido[lb].asoma, { canto } = segunLaFicha(lb);
  ok(
    menos > canto / 2 + RELIEVE_CM * 0.8 && mas > canto / 2 + RELIEVE_CM * 0.8,
    `el de ${lb} lb lleva relieve por las dos caras (${menos} y ${mas} cm desde el centro, el hierro llega a ${(canto / 2).toFixed(2)})`,
  );
}

// ── 8. LA BURBUJA DE PESOS ───────────────────────────────────────────────
// En la paleta hay UN botón, no cinco: las cinco piezas están ocultas y se
// llega a ellas eligiendo el peso, igual que en las mancuernas.
const botones = await page.evaluate(() =>
  [...document.querySelectorAll(".comp-btn")].map((b) => b.textContent.trim()),
);
ok(
  botones.filter((t) => /^Disco/i.test(t)).length === 1,
  "en la paleta hay un solo botón de disco, no cinco",
  botones.filter((t) => /^Disco/i.test(t)).join(" | ") || "ninguno",
);

const btn = await page.$(".comp-btn:has-text('Disco de peso')");
ok(!!btn, "el botón «Disco de peso» está en la paleta");
await btn.scrollIntoViewIfNeeded();
await btn.click();
await page.waitForTimeout(400);
const opciones = await page.evaluate(() =>
  [...document.querySelectorAll(".comp-burbuja-op")].map((o) => o.textContent.trim()),
);
ok(
  opciones.join(" ") === "10 lb 15 lb 25 lb 35 lb 45 lb",
  "la burbuja ofrece los cinco pesos, en orden",
  opciones.join(" | ") || "no se abrió",
);

// Y AL ELEGIR, ENTRA EL DISCO QUE TOCA.
await page.click(".comp-burbuja-op:has-text('45 lb')");
await page.waitForTimeout(1200);
const puesto = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const o = [...ed.objects.values()].at(-1);
  return o ? { masa: o.physics?.massKg } : null;
});
ok(
  puesto && Math.abs(puesto.masa - segunLaFicha(45).kg) < 0.02,
  `elegir «45 lb» coloca el disco de 45 (${puesto ? `${puesto.masa} kg` : "no colocó nada"})`,
);
ok(
  await page.evaluate(() => !document.querySelector(".comp-burbuja")),
  "la burbuja se cierra al elegir",
);

console.log(fallos === 0 ? "\nTODO OK" : `\n${fallos} FALLOS`);
await browser.close();
process.exit(fallos === 0 ? 0 : 1);
