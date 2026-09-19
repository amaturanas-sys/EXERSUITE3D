// PRUEBA: LOS DISCOS «STANDARD BARBELL» (v0.3.68).
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
//   2. QUE LAS COTAS SALEN DEL CARTEL. La prueba lleva el cartel del juego
//      ESCRITO A MANO, en pulgadas —leerlo del CAD no comprobaría nada— y
//      convierte él mismo a milímetros. Y cruza el rasgo que ninguna proporción
//      inventada acierta: 45, 35 y 25 lb tienen EL MISMO CANTO, 1.4 pulgadas
//      los tres. El disco grande no es el chico engordado.
//
//   3. QUE LA MALLA PESA LO QUE DICE LA ETIQUETA. El rebaje de los cuarteles no
//      es adorno: es LA MITAD LARGA de la pieza —al de 45 macizo le sobran 18
//      kg de los 38.7 que pesaría—. Así que no basta con que el `massKg` de la
//      biblioteca ponga 20.41: hay que medir el VOLUMEN DE LA MALLA,
//      multiplicarlo por la densidad del hierro y ver si sale ese número. Si
//      alguien dibujara el rebaje «a ojo» y ajustara la masa a mano, esto lo
//      caza.
//
//   4. LA CRUZ DE CUATRO RADIOS, Y EN SU PROPIO ESCALÓN. En el cartel los de 35
//      y 45 lb llevan cuatro radios rectos separando cuatro cuarteles vaciados,
//      y los de 5, 10 y 25 no: su alma es un anillo liso. Además la LLANTA
//      DOMINA a los radios —no están a ras—, así que un disco con cruz tiene
//      TRES alturas: llanta, radios, cuarteles. Se comprueban las tres con un
//      rayo: en un disco con cruz hay cuatro tramos de ángulo que paran más
//      arriba que el resto, y en uno liso el anillo para a la misma altura en
//      toda la vuelta.
//
//   5. QUE LAS LETRAS ESTÁN PINTADAS. Sobre hierro fundido —un gris casi
//      negro— un relieve del mismo color no se lee: hace falta pintura, como en
//      la foto. Eso son DOS materiales sobre una misma malla, y la prueba mira
//      las tres cosas que pueden salir mal: que haya dos, que el segundo sea
//      claro de verdad frente al hierro, y —la que de veras cuesta— que lo
//      PINTADO sea la letra y no la pieza. Esto último se mide por ÁREA: el
//      rotulado de un disco es un puñado de trazos, nunca más de una décima
//      parte de su superficie. En el camino, dos versiones de la regla pintaron
//      el disco entero de blanco dejando las letras en hierro, y esta cuenta es
//      lo único que las habría cazado sin mirar el dibujo.
//
// Y de propina: el relieve tiene que asomar por LAS DOS CARAS, que es lo que
// pasa con un disco de verdad y lo que se nota en cuanto la cámara pasa al otro
// lado.
import { chromium } from "playwright-core";

let fallos = 0;
const ok = (cond, msg, dato) => {
  if (cond) console.log(`✓ ${msg}`);
  else { fallos++; console.log(`✗ ${msg}${dato === undefined ? "" : ` — ${dato}`}`); }
};

// EL CARTEL DEL JUEGO, a mano: libras → [Ø pulgadas, canto pulgadas].
const CARTEL = {
  5: [7.75, 0.65],
  10: [9.25, 0.85],
  25: [11.0, 1.4],
  35: [13.75, 1.4],
  45: [17.375, 1.4],
};
const PULGADA = 2.54;           // cm por pulgada
const LIBRA = 0.45359237;
const LIBRAS = [5, 10, 25, 35, 45];
const CON_CRUZ = [35, 45];      // los que llevan los cuatro radios
const AGUJERO_CM = 5.0;         // Ø olímpico, la cota que no cambia
const DENSIDAD = 7.2;           // g/cm³, hierro fundido

// Las pulgadas del cartel, pasadas a centímetros aquí mismo.
const segunLaFicha = (lb) => {
  const [d, t] = CARTEL[lb];
  return { kg: lb * LIBRA, diametro: d * PULGADA, canto: t * PULGADA };
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
    for (let i = 0; i < pos.count; i++) {
      const a = comp(i, radial[0]), b = comp(i, radial[1]);
      const r = Math.hypot(a, b);
      if (r < rMin) rMin = r;
      if (r > rMax) rMax = r;
    }
    // LA CRUZ SE BUSCA CON RAYOS, NO MIRANDO LA MALLA. Dos intentos anteriores
    // fallaron por lo mismo: la cara de un radio no es una isla de triángulos
    // suyos, es un trozo de UNA SOLA cara que abarca cubo, radios y llanta, y
    // su triangulación reparte los triángulos donde quiere —primero se
    // buscaron vértices y no había ninguno en la banda; luego centros de
    // triángulo, y en el de 45 uno de los cuatro radios se escapó—. Un rayo no
    // se equivoca: se lanza contra la pieza a media altura del vaciado y se
    // mira DÓNDE PARA. Donde hay radio para en la cara; donde hay cuartel, en
    // el fondo, mucho más adentro.
    const BINS = 72;
    const idxT = g.index;
    const rayo = new T.Raycaster();
    const desde = new T.Vector3();
    const hacia = new T.Vector3();
    hacia.setComponent(iEje, -1);
    o.mesh.position.set(0, 0, 0);
    o.mesh.rotation.set(0, 0, 0);
    o.mesh.updateMatrixWorld(true);
    const paradas = new Array(BINS).fill(0);
    for (let k = 0; k < BINS; k++) {
      const ang = ((k + 0.5) / BINS) * Math.PI * 2;
      desde.set(0, 0, 0);
      desde.setComponent(radial[0], Math.cos(ang) * 0.6 * rMax);
      desde.setComponent(radial[1], Math.sin(ang) * 0.6 * rMax);
      desde.setComponent(iEje, semiEje + 5);
      rayo.set(desde, hacia);
      const golpes = rayo.intersectObject(o.mesh, false);
      paradas[k] = golpes.length ? Math.abs(golpes[0].point.getComponent(iEje)) : 0;
    }
    // DOS ALTURAS EN EL ANILLO: donde hay radio el rayo para antes, donde hay
    // cuartel sigue hasta el fondo. El corte se pone a medio camino entre la
    // más alta y la más baja, así la prueba no necesita saber ni el escalón ni
    // la hondura: los lee de la pieza.
    const arriba = Math.max(...paradas);
    const abajo = Math.min(...paradas);
    const corte = (arriba + abajo) / 2;
    const lleno = paradas.map((v) => v > corte);
    let tramos = 0;
    // Con una sola altura no hay cruz que contar: el corte partiría el ruido.
    if (arriba - abajo > 0.05) {
      for (let k = 0; k < BINS; k++) if (lleno[k] && !lleno[(k + BINS - 1) % BINS]) tramos++;
    }

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

    // LOS DOS MATERIALES Y EL REPARTO DE SUPERFICIE. El área se suma por
    // grupos: es lo que distingue «unas letras pintadas» de «la pieza pintada
    // con las letras sin pintar», que en número de triángulos se parecen
    // muchísimo —una letra tiene mil triángulos diminutos y una cara, cuatro—.
    const mats = Array.isArray(o.mesh.material) ? o.mesh.material : [o.mesh.material];
    const areaGrupo = (g) => {
      if (!g || !idxT) return 0;
      const p = new T.Vector3(), q = new T.Vector3(), w = new T.Vector3();
      const e1 = new T.Vector3(), e2 = new T.Vector3();
      let s = 0;
      for (let i = g.start; i < g.start + g.count; i += 3) {
        p.fromBufferAttribute(pos, idxT.getX(i));
        q.fromBufferAttribute(pos, idxT.getX(i + 1));
        w.fromBufferAttribute(pos, idxT.getX(i + 2));
        s += e1.subVectors(q, p).cross(e2.subVectors(w, p)).length() / 2;
      }
      return s;
    };
    const aCuerpo = areaGrupo(g.groups[0]);
    const aRotulo = areaGrupo(g.groups[1]);
    // El rótulo, repartido entre las dos caras por el signo de su centro.
    let atras = 0, alante = 0;
    const gr = g.groups[1];
    if (gr && idxT) {
      for (let i = gr.start; i < gr.start + gr.count; i += 3) {
        let e = 0;
        for (let k = 0; k < 3; k++) e += comp(idxT.getX(i + k), iEje);
        if (e > 0) alante++; else atras++;
      }
    }

    salida[lb] = {
      colores: mats.map((m) => m.color.getHex()),
      carasRotulo: [atras, alante],
      areaRotulo: +(100 * aRotulo / Math.max(1e-9, aCuerpo + aRotulo)).toFixed(2),
      tam: [tam.x, tam.y, tam.z].map((x) => +x.toFixed(2)),
      diametro: +(rMax * 2).toFixed(2),
      canto: +(semiEje * 2).toFixed(2),
      agujero: +(rMin * 2).toFixed(2),
      volumen: +Math.abs(vol).toFixed(1),
      vertices: pos.count,
      masa: o.physics?.massKg,
      tramos,
      // La altura del radio y la del cuartel, en cm desde el plano medio.
      niveles: [+arriba.toFixed(3), +abajo.toFixed(3)],
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
    `el de ${lb} lb mide Ø${m.diametro} cm; el cartel pide ${CARTEL[lb][0]}" = Ø${f.diametro.toFixed(1)}`,
  );
  // EL CANTO ES EL DEL CARTEL, CLAVADO. El rótulo vive dentro de lo vaciado, así
  // que NADA sobresale de las caras: un disco que midiera de más ya no apilaría
  // igual ni cabría lo mismo en la manga.
  ok(
    Math.abs(m.canto - f.canto) < 0.06,
    `su canto es ${m.canto} cm, el del cartel clavado (${f.canto.toFixed(2)}), sin que el rótulo sobresalga`,
  );
}
// ── 4. LOS TRES GRANDES, EL MISMO CANTO ──────────────────────────────────
// Lo que ninguna proporción inventada acierta: el de 45, el de 35 y el de 25
// miden 1.4 pulgadas de canto LOS TRES, aunque el mayor tenga metro y medio más
// de contorno. El disco grande no es el chico engordado: crece de diámetro y se
// queda igual de grueso. Un juego escalado subiría las dos cotas a la vez.
const gordos = [25, 35, 45].map((lb) => medido[lb].canto);
ok(
  Math.max(...gordos) - Math.min(...gordos) < 0.05,
  `el de 25, el de 35 y el de 45 tienen el mismo canto (${gordos.join(" · ")} cm)`,
);
ok(
  medido[45].diametro > medido[25].diametro * 1.5,
  `y sin embargo el de 45 es ${(medido[45].diametro / medido[25].diametro).toFixed(2)} veces más ancho que el de 25`,
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
  const m = medido[lb], [arriba, abajo] = m.niveles;
  ok(
    m.tramos === esperados,
    CON_CRUZ.includes(lb)
      ? `el de ${lb} lb lleva la cruz: ${m.tramos} radios por encima del fondo de los cuarteles`
      : `el de ${lb} lb es liso, sin cruz: el anillo para a la misma altura en toda la vuelta`,
    `tramos medidos: ${m.tramos}`,
  );
  if (!CON_CRUZ.includes(lb)) continue;
  // LA LLANTA DOMINA A LOS RADIOS. Es lo que le da al disco su relieve, y es la
  // cota que hay que vigilar: sin ella los radios quedan a ras y la cruz se ve
  // como un dibujo, no como una pieza fundida.
  const { canto } = segunLaFicha(lb);
  const escalon = canto / 2 - arriba;
  ok(
    escalon > 0.5 && escalon <= 1.05,
    `y la llanta los domina por ${escalon.toFixed(2)} cm (de la cara del hierro, a ${(canto / 2).toFixed(2)}, al lomo del radio)`,
  );
  // Y EL CUARTEL SIGUE SIENDO UN CUARTEL: el escalón no se lo puede comer.
  ok(
    arriba - abajo > 0.4,
    `y el cuartel sigue hundido ${((arriba - abajo) * 10).toFixed(1)} mm por debajo del radio`,
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
for (const lb of [5, 45]) {
  const f = segunLaFicha(lb);
  const macizo = (Math.PI * ((f.diametro / 2) ** 2 - 2.5 ** 2) * f.canto * DENSIDAD) / 1000;
  const sobra = (100 * (macizo - f.kg)) / macizo;
  ok(
    sobra > 20,
    `al de ${lb} lb le sobra el ${sobra.toFixed(0)} % del material: macizo pesaría ${macizo.toFixed(1)} kg`,
  );
}

// ── 7. LAS LETRAS, POR LAS DOS CARAS ─────────────────────────────────────
// Ya no se puede medir por lo que sobresale —no sobresale nada—, así que se
// cuentan los triángulos del rótulo A CADA LADO del plano medio. Un disco
// rotulado sólo por delante daría cero en uno de los dos.
for (const lb of LIBRAS) {
  const [atras, alante] = medido[lb].carasRotulo;
  ok(
    atras > 100 && alante > 100 && Math.abs(atras - alante) / (atras + alante) < 0.1,
    `el de ${lb} lb lleva rótulo por las dos caras (${atras} y ${alante} triángulos)`,
  );
}

// ── 8. LAS LETRAS, PINTADAS ──────────────────────────────────────────────
// Luminancia perceptual, para comparar el gris del hierro con el de la pintura
// sin que un tono cálido o frío engañe a la cuenta.
const luz = (hex) => {
  const r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};
for (const lb of LIBRAS) {
  const c = medido[lb].colores;
  ok(c.length === 2, `el de ${lb} lb lleva dos materiales: hierro y pintura`, `${c.length}`);
  if (c.length !== 2) continue;
  ok(
    luz(c[1]) - luz(c[0]) > 0.5,
    `y la pintura se ve sobre el hierro (luz ${luz(c[0]).toFixed(2)} → ${luz(c[1]).toFixed(2)})`,
  );
  // LO PINTADO ES LA LETRA, NO LA PIEZA. Un rótulo son trazos: mucha superficie
  // pintada significaría que la regla se ha comido la pieza.
  ok(
    medido[lb].areaRotulo > 0.5 && medido[lb].areaRotulo < 12,
    `y lo pintado es el rótulo, no el disco (${medido[lb].areaRotulo} % de la superficie)`,
  );
}

// ── 9. LA BURBUJA DE PESOS ───────────────────────────────────────────────
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
  opciones.join(" ") === "5 lb 10 lb 25 lb 35 lb 45 lb",
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
