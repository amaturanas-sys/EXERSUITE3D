// PRUEBA: LA CHAPA CONVIVIENDO CON EL RESTO (v0.3.72).
//
// `prueba-chapa.mjs` comprueba la herramienta. Esta comprueba lo que se dijo
// de ella en el CHANGELOG, que es otra cosa y no lo cubría nadie: que la chapa
// SOBREVIVE a todo lo que rehace la malla y al viaje de ida y vuelta del
// proyecto. Cada punto es una afirmación que estaba escrita y sin medir:
//
//   1. GUARDAR Y ABRIR. Serializar el proyecto y volver a cargarlo tiene que
//      devolver la cubeta, no el cubo.
//   2. DESHACER. El historial pasa por el mismo serializador; si la chapa no
//      viaja en los params, un Ctrl+Z la borra y no hay quien la recupere.
//   3. COPIAR Y PEGAR, y DUPLICAR. La copia es una cubeta igual, y —lo que de
//      verdad hay que vigilar— NO una chapa de una chapa: duplicar partiendo
//      de la malla de pantalla le aplicaría el vaciado dos veces.
//   4. SOBRE UNA PIEZA DE BIBLIOTECA (malla GLB, no primitiva). Es el otro
//      camino de `rebuildGeometry`, el que parte de la malla guardada.
//   5. CON UN HUECO YA ABIERTO. La chapa va DESPUÉS de perforar: la ventana
//      tiene que seguir calada después de vaciar la pieza.
//   6. CON LARGO A MEDIDA. Se estira por el centro y después se vacía; la
//      cubeta tiene que medir el largo pedido.
import { chromium } from "playwright-core";

let fallos = 0;
const ok = (cond, msg, dato) => {
  if (cond) console.log(`✓ ${msg}`);
  else { fallos++; console.log(`✗ ${msg}${dato === undefined ? "" : ` — ${dato}`}`); }
};

const LADO = 20;
const GROSOR = 0.5;

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

// Un cubo hecho cubeta: la cara de arriba fuera, 5 mm de plancha. Se prepara
// por API (la herramienta ya está probada con el ratón en prueba-chapa).
await page.evaluate(({ lado, grosor }) => {
  const ed = window.exersuite.editor;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  const cubo = ed.addComponent("base-soporte");
  cubo.params.width = lado; cubo.params.height = lado; cubo.params.depth = lado;
  cubo.params.chapa = { grosorCm: grosor, caras: [{ n: [0, 1, 0], c: [0.5, 1, 0.5] }] };
  cubo.rebuildGeometry();
  cubo.mesh.position.set(0, lado / 2, 0);
  window.__id = cubo.id;
}, { lado: LADO, grosor: GROSOR });
await page.waitForTimeout(300);

/**
 * El rayo desde arriba, en coordenadas LOCALES de la pieza: si toca el techo
 * es un macizo; si cae hasta el fondo de dentro, es una cubeta. Fuera del
 * centro exacto, que ahí pasa por la diagonal de la cara.
 */
const sonda = async (id) =>
  page.evaluate(({ id, lado }) => {
    const ed = window.exersuite.editor, T = window.exersuite.THREE;
    const o = id ? ed.objects.get(id) : [...ed.objects.values()][0];
    if (!o) return null;
    const g = o.mesh.geometry;
    g.computeBoundingBox();
    const bb = g.boundingBox;
    const ray = new T.Raycaster(new T.Vector3(1.3, lado * 3, 0.7), new T.Vector3(0, -1, 0));
    // El rayo va en el espacio de la MALLA: la pieza puede estar donde sea.
    const m = new T.Mesh(g, o.mesh.material);
    m.updateMatrixWorld(true);
    const hits = ray.intersectObject(m, false);
    return {
      id: o.id,
      techo: hits.length ? +hits[0].point.y.toFixed(3) : null,
      alto: +(bb.max.y - bb.min.y).toFixed(2),
      ancho: +(bb.max.x - bb.min.x).toFixed(2),
      chapa: o.params.chapa ? { g: o.params.chapa.grosorCm, n: o.params.chapa.caras.length } : null,
      tris: g.attributes.position.count / 3,
    };
  }, { id, lado: LADO });

const FONDO = -LADO / 2 + GROSOR; // la malla está centrada en su caja
const esCubeta = (s) => s && s.techo !== null && Math.abs(s.techo - FONDO) < 0.06;
const esMacizo = (s) => s && s.techo !== null && Math.abs(s.techo - LADO / 2) < 0.06;

const base = await sonda(null);
ok(esCubeta(base), `de partida hay una cubeta (el rayo cae a ${base?.techo} y el fondo está en ${FONDO})`);
const trisCubeta = base.tris;

// ── 1. GUARDAR Y ABRIR ───────────────────────────────────────────────────
const trasCargar = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  const datos = JSON.parse(JSON.stringify(ed.serialize()));
  await ed.loadProject(datos);
  const o = [...ed.objects.values()][0];
  return { piezas: ed.objects.size, chapa: !!o?.params.chapa };
});
const s1 = await sonda(null);
ok(
  trasCargar.piezas === 1 && trasCargar.chapa && esCubeta(s1),
  "guardar el proyecto y volver a abrirlo devuelve la cubeta, no el cubo",
  JSON.stringify({ ...trasCargar, techo: s1?.techo }),
);

// ── 2. DESHACER ──────────────────────────────────────────────────────────
const trasDeshacer = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  const o = [...ed.objects.values()][0];
  // Un cambio cualquiera que entre en el historial, y se deshace.
  o.params.width = 34;
  o.rebuildGeometry();
  ed.bus.emit("objectTransformed", { object: o });
  await new Promise((r) => setTimeout(r, 700));
  await ed.undo();
  await new Promise((r) => setTimeout(r, 400));
  const v = [...ed.objects.values()][0];
  return { piezas: ed.objects.size, chapa: !!v?.params.chapa, ancho: v?.params.width };
});
const s2 = await sonda(null);
ok(
  trasDeshacer.chapa && esCubeta(s2),
  "deshacer un cambio de medida no se lleva la chapa por delante",
  JSON.stringify({ ...trasDeshacer, techo: s2?.techo }),
);

// ── 3. COPIAR Y PEGAR · DUPLICAR ─────────────────────────────────────────
const copias = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  const o = [...ed.objects.values()][0];
  ed.select(o);
  ed.copySelection();
  ed.pasteClipboard();
  await new Promise((r) => setTimeout(r, 300));
  const todas = [...ed.objects.values()];
  const nueva = todas.find((x) => x.id !== o.id);
  return {
    n: todas.length,
    id: nueva?.id ?? null,
    chapa: nueva?.params.chapa ? nueva.params.chapa.caras.length : null,
  };
});
const s3 = await sonda(copias.id);
ok(
  copias.n === 2 && copias.chapa === 1 && esCubeta(s3),
  "la copia pegada es otra cubeta igual",
  JSON.stringify({ ...copias, techo: s3?.techo }),
);
ok(
  s3 && Math.abs(s3.tris - trisCubeta) <= 2 && Math.abs(s3.alto - LADO) < 0.2,
  `y NO es una chapa de una chapa: misma malla que el original (${s3?.tris} triángulos contra ${trisCubeta}) y el mismo bulto`,
  JSON.stringify(s3),
);

// ── 4. SOBRE UNA PIEZA DE BIBLIOTECA (malla GLB) ─────────────────────────
const biblio = await page.evaluate(async ({ grosor }) => {
  const ed = window.exersuite.editor;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  const k = ed.addComponent("kettlebell-20");
  await new Promise((r) => setTimeout(r, 1200));
  const antes = k.mesh.geometry.attributes.position.count / 3;
  const caja = (() => {
    k.mesh.geometry.computeBoundingBox();
    const b = k.mesh.geometry.boundingBox;
    return [b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z].map((v) => +v.toFixed(2));
  })();
  // Se le quita la cara de abajo (la base plana de la kettlebell).
  k.params.chapa = { grosorCm: grosor, caras: [{ n: [0, -1, 0], c: [0.5, 0, 0.5] }] };
  k.rebuildGeometry();
  k.mesh.geometry.computeBoundingBox();
  const b = k.mesh.geometry.boundingBox;
  return {
    custom: k.customModel,
    antes,
    despues: k.mesh.geometry.attributes.position.count / 3,
    caja,
    caja2: [b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z].map((v) => +v.toFixed(2)),
  };
}, { grosor: GROSOR });
ok(
  biblio.custom && biblio.despues > biblio.antes,
  `una pieza de biblioteca también se ahueca: la kettlebell pasa de ${biblio.antes} a ${biblio.despues} triángulos (pared interior + canto)`,
  JSON.stringify(biblio),
);
ok(
  biblio.caja.every((v, i) => Math.abs(v - biblio.caja2[i]) < 0.3),
  `y por fuera sigue midiendo lo mismo (${biblio.caja.join("×")} → ${biblio.caja2.join("×")})`,
);

// ── 5. CON UN HUECO YA ABIERTO ───────────────────────────────────────────
const conVentana = await page.evaluate(({ lado, grosor }) => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  const c = ed.addComponent("base-soporte");
  c.params.width = lado; c.params.height = lado; c.params.depth = lado;
  c.params.ventanas = [{ eje: "z", u: 0, v: 0, du: 6, dv: 6 }];
  c.params.chapa = { grosorCm: grosor, caras: [{ n: [0, 1, 0], c: [0.5, 1, 0.5] }] };
  c.rebuildGeometry();
  c.mesh.position.set(0, 0, 0);
  c.mesh.updateMatrixWorld(true);
  // Un rayo por el eje Z, por el centro del hueco: no debe tocar NADA.
  const porElHueco = new T.Raycaster(new T.Vector3(0.8, 0.8, lado * 3), new T.Vector3(0, 0, -1));
  // Y otro al lado del hueco, que sí debe tocar la pared.
  const porLaPared = new T.Raycaster(new T.Vector3(7, 0.8, lado * 3), new T.Vector3(0, 0, -1));
  return {
    hueco: porElHueco.intersectObject(c.mesh, false).length,
    pared: porLaPared.intersectObject(c.mesh, false).length,
  };
}, { lado: LADO, grosor: GROSOR });
ok(
  conVentana.hueco === 0 && conVentana.pared > 0,
  "una ventana calada sigue calada después de vaciar la pieza (la chapa va DESPUÉS de perforar)",
  JSON.stringify(conVentana),
);

// ── 6. CON LARGO A MEDIDA ────────────────────────────────────────────────
const conLargo = await page.evaluate(async ({ grosor }) => {
  const ed = window.exersuite.editor;
  for (const o of [...ed.objects.values()]) ed.removeObject(o);
  const b = ed.addComponent("brazo-spotter");
  await new Promise((r) => setTimeout(r, 1200));
  if (!b.largoAjustable()) return { salta: true };
  const eje = b.largoAjustable().eje;
  b.params.largoCm = 90;
  b.rebuildGeometry();
  const medir = () => {
    b.mesh.geometry.computeBoundingBox();
    const bb = b.mesh.geometry.boundingBox;
    return +(bb.max[eje] - bb.min[eje]).toFixed(1);
  };
  const largoSolo = medir();
  b.params.chapa = { grosorCm: grosor, caras: [{ n: [0, 1, 0], c: [0.5, 1, 0.5] }] };
  b.rebuildGeometry();
  return { salta: false, eje, largoSolo, largoChapa: medir(), chapa: !!b.params.chapa };
}, { grosor: GROSOR });
ok(
  conLargo.salta || Math.abs(conLargo.largoChapa - conLargo.largoSolo) < 0.3,
  conLargo.salta
    ? "(la pieza de prueba no tiene largo a medida; se salta)"
    : `el largo a medida y la chapa conviven: 90 cm pedidos, ${conLargo.largoChapa} cm medidos con chapa (${conLargo.largoSolo} sin ella)`,
  JSON.stringify(conLargo),
);

console.log(fallos === 0 ? "\nTODO OK" : `\n${fallos} FALLOS`);
await browser.close();
process.exit(fallos === 0 ? 0 : 1);
