// PRUEBA: LOS DISCOS «STANDARD BARBELL» (v0.3.62).
//
// Cinco discos de libras distintas, y tres cosas que de verdad hay que
// comprobar porque ninguna se ve en un bulto:
//
//   1. QUE EL AGUJERO NO CAMBIA. Ø5 cm en los cinco, el de la manga olímpica.
//      Es la única cota que no se toca por mucho que suba el peso: un disco que
//      no enfila la barra no es un disco. Se mide el radio MÍNIMO de la malla
//      alrededor del eje, que es exactamente el borde del agujero.
//
//   2. QUE LA MALLA PESA LO QUE DICE LA ETIQUETA. El rebaje del alma y las
//      ventanas de los radios no son adorno: son LA MITAD LARGA de la pieza —al
//      de 45 macizo le sobraría el 42 % del material—. Así que no basta con que
//      el `massKg` de la biblioteca ponga 20.41: hay que medir el VOLUMEN DE LA
//      MALLA, multiplicarlo por la densidad del hierro y ver si sale ese número.
//      Si alguien dibujara el rebaje «a ojo» y ajustara la masa a mano, esto lo
//      caza; es la prueba de que se resolvió el rebaje y no al revés.
//
//   3. QUE LAS COTAS SALEN DE LA FICHA DEL FABRICANTE Y NO DE UNA REGLA. La
//      prueba lleva la ficha escrita a mano —leerla del CAD no comprobaría
//      nada— y con ella se cruza el rasgo que delata una proporción inventada:
//      EL CANTO NO CRECE CON EL PESO. El de 25 lb es MÁS GRUESO que el de 35, y
//      el de 45 apenas más que el de 35 siendo mucho mayor. Un disco escalado
//      jamás haría eso.
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

// LA FICHA DEL FABRICANTE, a mano: libras → [Ø mm, canto mm, masa kg].
const FICHA = {
  10: [231, 22, 4.54],
  15: [254, 26, 6.80],
  25: [281, 35, 11.34],
  35: [370, 30, 15.88],
  45: [452, 31, 20.41],
};
const LIBRAS = [10, 15, 25, 35, 45];
const AGUJERO_CM = 5.0;      // Ø olímpico, la cota que no cambia
const DENSIDAD = 7.2;        // g/cm³, hierro fundido
const RELIEVE_CM = 0.25;     // cuánto asoma la letra de la llanta

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
const medido = await page.evaluate(async (libras) => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  const salida = {};
  for (const lb of libras) {
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
    // da por supuesto cuál es —se busca—, que es lo que hace que la prueba
    // siga sirviendo si algún día cambia el convenio de exportación.
    const ejes = [tam.x, tam.y, tam.z];
    const iEje = ejes.indexOf(Math.min(...ejes));
    const comp = (i, k) => (k === 0 ? pos.getX(i) : k === 1 ? pos.getY(i) : pos.getZ(i));
    const radial = [0, 1, 2].filter((k) => k !== iEje);

    // EL AGUJERO: el radio menor alrededor del eje. En los de radios, el borde
    // interior de las ventanas queda MÁS AFUERA que el agujero, así que el
    // mínimo sigue siendo el agujero.
    let rMin = 1e9, rMax = 0;
    let asomaMas = 0, asomaMenos = 0;     // relieve por cada cara
    const semiEje = tam.getComponent(iEje) / 2;
    for (let i = 0; i < pos.count; i++) {
      const a = comp(i, radial[0]), b = comp(i, radial[1]), e = comp(i, iEje);
      const r = Math.hypot(a, b);
      if (r < rMin) rMin = r;
      if (r > rMax) rMax = r;
      // Lo que sobresale de la llanta por cada lado es la letra y nada más.
      if (e > 0) asomaMas = Math.max(asomaMas, e);
      else asomaMenos = Math.max(asomaMenos, -e);
    }

    // EL VOLUMEN DE LA MALLA, por tetraedros con vértice en el origen. La
    // geometría está cerrada, así que la suma con signo da el sólido.
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
    };
  }
  return salida;
}, LIBRAS);

// ── 1. LOS CINCO ENTRAN CON SU MALLA Y SU MASA ───────────────────────────
for (const lb of LIBRAS) {
  const m = medido[lb], [, , kg] = FICHA[lb];
  ok(
    m && m.vertices > 2000 && Math.abs(m.masa - kg) < 0.01,
    `el de ${lb} lb entra con la malla del CAD (${m ? m.tam.join(" × ") : "—"} cm) y pesa ${kg} kg`,
    m ? `${m.vertices} vértices · ${m.masa} kg` : "no está",
  );
}

// ── 2. EL AGUJERO NO CAMBIA ──────────────────────────────────────────────
// Ø5 cm en los cinco. Se comprueba uno a uno y además que entre ellos no haya
// ni un milímetro de diferencia: da igual el número absoluto si los cinco no
// enfilan la misma manga.
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
  const [mm, canto] = FICHA[lb], m = medido[lb];
  ok(
    Math.abs(m.diametro - mm / 10) < 0.15,
    `el de ${lb} lb mide Ø${m.diametro} cm, la ficha dice Ø${(mm / 10).toFixed(1)}`,
  );
  // EL CANTO INCLUYE EL RELIEVE de las dos caras: la ficha da el hierro, la
  // malla da el hierro más las letras.
  ok(
    Math.abs(m.canto - (canto / 10 + 2 * RELIEVE_CM)) < 0.1,
    `su canto es ${m.canto} cm: ${(canto / 10).toFixed(1)} de hierro y ${RELIEVE_CM} de letra por cara`,
  );
}

// ── 4. EL CANTO NO CRECE CON EL PESO ─────────────────────────────────────
// Lo que delata a un disco escalado. El de 25 es el más grueso de los cinco
// pese a no ser ni el más pesado ni el más grande, y el de 35 es MÁS FINO que
// él. Ninguna proporción inventada hace eso: sale de la ficha.
const cantos = LIBRAS.map((lb) => medido[lb].canto);
ok(
  medido[25].canto > medido[35].canto + 0.2 && medido[25].canto === Math.max(...cantos),
  "el canto no sigue al peso: el de 25 lb es el más grueso de los cinco, más que el de 35",
  LIBRAS.map((lb) => `${lb}:${medido[lb].canto}`).join(" "),
);
// Los diámetros, en cambio, sí crecen siempre.
const diams = LIBRAS.map((lb) => medido[lb].diametro);
ok(
  diams.every((v, i) => i === 0 || v > diams[i - 1] + 1),
  "el diámetro sí crece con cada peso, sin empates",
  diams.map((v) => `Ø${v}`).join(" < "),
);

// ── 5. LA MALLA PESA LO QUE DICE LA ETIQUETA ─────────────────────────────
// El corazón de la prueba. Volumen medido × densidad del hierro contra la masa
// de catálogo: si el rebaje no se hubiera RESUELTO a partir del peso, aquí
// saldrían kilos de más.
for (const lb of LIBRAS) {
  const m = medido[lb], kg = FICHA[lb][2];
  const real = (m.volumen * DENSIDAD) / 1000;
  ok(
    Math.abs(real - kg) / kg < 0.03,
    `el hierro del de ${lb} lb pesa ${real.toFixed(2)} kg de verdad (catálogo ${kg})`,
    `${m.volumen} cm³`,
  );
}
// Y QUE EL REBAJE ES GORDO: macizo, cada disco pesaría mucho más. Se compara
// contra el cilindro de su propio diámetro y su propio canto de hierro.
for (const lb of [10, 45]) {
  const [mm, canto, kg] = FICHA[lb];
  const macizo = (Math.PI * (mm / 20) ** 2 * (canto / 10) * DENSIDAD) / 1000;
  const sobra = (100 * (macizo - kg)) / macizo;
  ok(
    sobra > 20,
    `al de ${lb} lb le sobra el ${sobra.toFixed(0)} % del material: macizo pesaría ${macizo.toFixed(1)} kg`,
  );
}

// ── 6. LAS LETRAS, POR LAS DOS CARAS ─────────────────────────────────────
// Un disco enfilado en la barra se ve por los dos lados. Si el relieve sólo
// estuviera delante, una de las dos cifras saldría a cero.
for (const lb of LIBRAS) {
  const [menos, mas] = medido[lb].asoma, canto = FICHA[lb][1] / 10;
  ok(
    menos > canto / 2 + RELIEVE_CM * 0.8 && mas > canto / 2 + RELIEVE_CM * 0.8,
    `el de ${lb} lb lleva relieve por las dos caras (${menos} y ${mas} cm desde el centro, el hierro llega a ${(canto / 2).toFixed(2)})`,
  );
}

// ── 7. LA BURBUJA DE PESOS ───────────────────────────────────────────────
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

// Y AL ELEGIR, ENTRA EL DISCO QUE TOCA. Es lo que cierra el circuito: la
// burbuja no decora, coloca la pieza.
await page.click(".comp-burbuja-op:has-text('45 lb')");
await page.waitForTimeout(1200);
const puesto = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const o = [...ed.objects.values()].at(-1);
  return o ? { comp: o.componentId ?? o.component ?? null, masa: o.physics?.massKg } : null;
});
ok(
  puesto && Math.abs(puesto.masa - FICHA[45][2]) < 0.01,
  `elegir «45 lb» coloca el disco de 45 (${puesto ? `${puesto.masa} kg` : "no colocó nada"})`,
);
ok(
  await page.evaluate(() => !document.querySelector(".comp-burbuja")),
  "la burbuja se cierra al elegir",
);

console.log(fallos === 0 ? "\nTODO OK" : `\n${fallos} FALLOS`);
await browser.close();
process.exit(fallos === 0 ? 0 : 1);
