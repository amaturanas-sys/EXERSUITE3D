// PRUEBA: UNA PIEZA DIBUJADA SOBREVIVE AL PROYECTO (v0.3.73).
//
// Una pieza que llega con sus triángulos puestos —dibujada en el CAD de
// `cad/`, o traída con «Importar modelo 3D…»— no la regenera ningún
// componente de la biblioteca. Hasta v0.3.72 `serialize()` la DESCARTABA, así
// que el proyecto se guardaba sin ella y cada deshacer la borraba de la
// escena sin decir nada. Lo que se comprueba:
//
//   1. QUE SE GUARDA. El proyecto serializado la incluye, marcada como
//      dibujada.
//   2. QUE VUELVE AL ABRIR, con su malla —los mismos triángulos— y su sitio.
//   3. QUE DESHACER NO SE LA LLEVA. El historial pasa por el mismo
//      serializador, y ahí es donde más dolía: se perdía sin tocar nada raro.
//   4. QUE EL ARCHIVO SE LA LLEVA DENTRO. Un proyecto guardado EN UN ARCHIVO
//      se abre en otra sesión, donde el registro de mallas de ésta no existe:
//      ahí los triángulos tienen que viajar dentro del propio proyecto.
//   5. QUE EL GUARDADO DE TRABAJO NO LOS EMBUTE. El autoguardado y las
//      sesenta instantáneas del historial no pueden cargar con una malla de
//      20.000 triángulos cada una: ésas van por referencia.
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
await page.click(".wizard-carta:has-text('Canvas libre')"); await page.waitForTimeout(3000);

// Una pieza «de taller»: un tetraedro con sus cuatro caras, y una pieza normal
// de la biblioteca al lado para comprobar que no se rompe lo que ya iba bien.
const preparar = async () =>
  page.evaluate(() => {
    const ed = window.exersuite.editor;
    for (const o of [...ed.objects.values()]) ed.removeObject(o);
    const pos = [
      0, 0, 0, 10, 0, 0, 0, 10, 0,
      0, 0, 0, 0, 10, 0, 0, 0, 10,
      0, 0, 0, 0, 0, 10, 10, 0, 0,
      10, 0, 0, 0, 0, 10, 0, 10, 0,
    ];
    const p = ed.agregarPiezaDeMalla({ pos }, "Pieza de taller");
    p.mesh.position.set(17, 3, -4);
    ed.addComponent("base-soporte");
    return { piezas: ed.objects.size, tris: p.mesh.geometry.attributes.position.count / 3 };
  });

const foto = async () =>
  page.evaluate(() => {
    const ed = window.exersuite.editor;
    const d = ed.serialize();
    const dibujada = [...ed.objects.values()].find((o) => o.imported);
    return {
      piezas: ed.objects.size,
      enProyecto: d.objects.length,
      marcada: d.objects.filter((o) => o.imported).length,
      conMalla: d.objects.filter((o) => o.malla).length,
      tris: dibujada ? dibujada.mesh.geometry.attributes.position.count / 3 : null,
      pos: dibujada ? dibujada.mesh.position.toArray().map((v) => +v.toFixed(2)) : null,
    };
  });

const inicial = await preparar();
ok(inicial.piezas === 2 && inicial.tris === 4, `la pieza dibujada entra con sus 4 caras`);

// ── 1. SE GUARDA ─────────────────────────────────────────────────────────
const antes = await foto();
ok(
  antes.enProyecto === 2 && antes.marcada === 1,
  "el proyecto guarda las DOS piezas, y marca cuál llegó dibujada",
  JSON.stringify(antes),
);

// ── 5. EL GUARDADO DE TRABAJO NO EMBUTE LA MALLA ─────────────────────────
ok(
  antes.conMalla === 0,
  "el guardado de trabajo (autoguardado e historial) no carga con los triángulos: van por referencia",
);

// ── 2. VUELVE AL ABRIR ───────────────────────────────────────────────────
await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  await ed.loadProject(JSON.parse(JSON.stringify(ed.serialize())));
  await new Promise((r) => setTimeout(r, 300));
});
const tras = await foto();
ok(
  tras.piezas === 2 && tras.tris === 4,
  `guardar y abrir devuelve la pieza dibujada entera (${tras.piezas} piezas, ${tras.tris} caras)`,
  JSON.stringify(tras),
);
ok(
  tras.pos && Math.abs(tras.pos[0] - 17) < 0.01 && Math.abs(tras.pos[2] + 4) < 0.01,
  `y en su sitio (${tras.pos?.join(", ")})`,
);

// ── 3. DESHACER NO SE LA LLEVA ───────────────────────────────────────────
const trasDeshacer = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  const p = [...ed.objects.values()].find((o) => o.imported);
  p.mesh.position.set(40, 3, -4);
  ed.bus.emit("objectTransformed", { object: p });
  await new Promise((r) => setTimeout(r, 700));
  await ed.undo();
  await new Promise((r) => setTimeout(r, 500));
  const q = [...ed.objects.values()].find((o) => o.imported);
  return {
    piezas: ed.objects.size,
    sigue: !!q,
    tris: q ? q.mesh.geometry.attributes.position.count / 3 : null,
  };
});
ok(
  trasDeshacer.piezas === 2 && trasDeshacer.sigue && trasDeshacer.tris === 4,
  "deshacer no borra la pieza dibujada",
  JSON.stringify(trasDeshacer),
);

// ── 4. EL ARCHIVO SE LA LLEVA DENTRO ─────────────────────────────────────
const archivo = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  const paraArchivo = JSON.parse(JSON.stringify(ed.serialize(true)));
  const dib = paraArchivo.objects.find((o) => o.imported);
  // OTRA SESIÓN: el registro de mallas de ésta no existe. Se vacía a mano,
  // que es exactamente lo que se encuentra un proyecto abierto en otro sitio.
  ed.mallasImportadas.clear();
  await ed.loadProject(paraArchivo);
  await new Promise((r) => setTimeout(r, 300));
  const q = [...ed.objects.values()].find((o) => o.imported);
  return {
    vertices: dib?.malla?.pos?.length ?? 0,
    piezas: ed.objects.size,
    tris: q ? q.mesh.geometry.attributes.position.count / 3 : null,
  };
});
ok(
  archivo.vertices === 36,
  `el proyecto guardado en archivo lleva los triángulos dentro (${archivo.vertices} coordenadas)`,
);
ok(
  archivo.piezas === 2 && archivo.tris === 4,
  "y se abre entero aunque la sesión no sepa nada de esa malla",
  JSON.stringify(archivo),
);

console.log(fallos === 0 ? "\nTODO OK" : `\n${fallos} FALLOS`);
await browser.close();
process.exit(fallos === 0 ? 0 : 1);
