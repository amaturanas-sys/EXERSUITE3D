// v0.2.91 · LAS REGLAS DEL LEVANTAMIENTO, dichas por el diseñador.
//
// «Los pies deben anclarse al sitio donde pisa, la barra se moviliza en línea
// recta vertical y el maniquí usa sus articulaciones en distintos planos de
// movimiento para la mejor mecánica al ejercer fuerza durante el levantamiento.»
//
// Esto no comprueba código: comprueba las tres reglas, midiendo el cuerpo entre
// la postura de arriba y la de fondo de cada ejercicio con barra.
import { chromium } from "playwright-core";

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errores = [];
p.on("pageerror", (e) => errores.push(e.message));
const fallos = [];
const ok = (c, m) => { if (!c) fallos.push(m); console.log((c ? "✓ " : "✗ ") + m); };

await p.goto("http://127.0.0.1:4174/");
await p.waitForTimeout(1000);
await p.click("text=🛠 BUILDER"); await p.waitForTimeout(300);
await p.click("text=Crear nuevo proyecto"); await p.waitForTimeout(300);
await p.click(".wizard-carta:has-text('Profesional')"); await p.waitForTimeout(300);
await p.click(".wizard-carta:has-text('Canvas libre')"); await p.waitForTimeout(2200);

await p.evaluate(async () => {
  const ed = window.exersuite.editor;
  await ed.addHumanFigure();
  await new Promise((r) => setTimeout(r, 800));
  const T = window.exersuite.THREE;
  window.__caja = (id) => {
    const fig = window.exersuite.editor.humanFigure;
    fig.updateMatrixWorld(true);
    let m = null;
    fig.traverse((n) => { if (n.userData?.segmentId === id) m = n; });
    return m ? new T.Box3().setFromObject(m) : null;
  };
  window.__estado = () => {
    const ed = window.exersuite.editor, T = window.exersuite.THREE;
    const v = (q) => q ? q.toArray().map((n) => +n.toFixed(1)) : null;
    const centro = (id) => { const b = window.__caja(id); return b ? b.getCenter(new T.Vector3()) : null; };
    const bm = ed.getBarraManiqui?.();
    let barra = null;
    if (bm?.objectId) {
      const o = ed.getObject(bm.objectId);
      o.mesh.updateMatrixWorld(true);
      const eje = new T.Vector3(0, 1, 0).applyQuaternion(o.mesh.quaternion).normalize();
      barra = {
        centro: v(o.mesh.position),
        inclinacionDeg: +(Math.asin(Math.min(1, Math.abs(eje.y))) * 180 / Math.PI).toFixed(2),
      };
    }
    const pL = window.__caja("pie-L"), pR = window.__caja("pie-R");
    return {
      barra,
      pieL: v(centro("pie-L")), pieR: v(centro("pie-R")),
      // «El medio del pie»: la vertical de referencia del diseñador.
      medioPieZ: pL && pR ? +((pL.min.z + pL.max.z + pR.min.z + pR.max.z) / 4).toFixed(1) : null,
      sueloL: pL ? +pL.min.y.toFixed(1) : null,
      sueloR: pR ? +pR.min.y.toFixed(1) : null,
    };
  };
});

const EJ = [
  { id: "sentadilla-frontal", es: "sentadilla frontal" },
  { id: "sentadilla-trasera", es: "sentadilla trasera" },
  { id: "press-vertical", es: "press vertical" },
  { id: "peso-muerto", es: "peso muerto" },
];

for (const ej of EJ) {
  const r = await p.evaluate(async (id) => {
    const ed = window.exersuite.editor;
    ed.ponerBarraEnManos(id);
    await new Promise((x) => setTimeout(x, 450));
    const arriba = window.__estado();
    ed.aplicarPosturaBarra("fondo");
    await new Promise((x) => setTimeout(x, 450));
    const fondo = window.__estado();
    const d = (a, b) => a && b ? [+(b[0]-a[0]).toFixed(1), +(b[1]-a[1]).toFixed(1), +(b[2]-a[2]).toFixed(1)] : null;
    return { arriba, fondo,
      barraD: d(arriba.barra?.centro, fondo.barra?.centro),
      pieLD: d(arriba.pieL, fondo.pieL), pieRD: d(arriba.pieR, fondo.pieR) };
  }, ej.id);
  console.log(`  ${ej.es}: ${JSON.stringify(r.barraD)} barra · ${JSON.stringify(r.pieLD)} pie izq`);

  // 1) LOS PIES SE QUEDAN DONDE PISAN. Ni patinan adelante ni cambian de
  //    apertura: la posición de los pies la elige quien se coloca, no la postura.
  const quieto = (dd) => dd && Math.abs(dd[0]) <= 2 && Math.abs(dd[2]) <= 2;
  ok(quieto(r.pieLD), `${ej.es} · el pie IZQUIERDO no se mueve del sitio (Δ ${JSON.stringify(r.pieLD)})`);
  ok(quieto(r.pieRD), `${ej.es} · el pie DERECHO no se mueve del sitio (Δ ${JSON.stringify(r.pieRD)})`);

  // 2) LA BARRA VA A PLOMO: sube y baja en línea recta vertical.
  //
  // EL PRESS ES LA EXCEPCIÓN, Y A PROPÓSITO (v0.2.97). Aquí se comparan los DOS
  // EXTREMOS, y en el press ya no comparten vertical: el diseñador pidió que la
  // salida arrancase «más hacia anterior e inferior» —para que la barra deje de
  // atravesar la cara, que es lo que hacía: 14,12 cm de cráneo medidos por rayo—
  // y que el recorrido describiera una sigmoide que esquiva la cabeza y termina
  // sobre la línea de equilibrio. O sea que la salida ESTÁ adelantada y el
  // bloqueo NO: 9,4 cm de diferencia entre los dos extremos es el gesto pedido,
  // no un fallo. Lo que sí se le exige al press es que el BLOQUEO caiga sobre la
  // línea de equilibrio, y la verticalidad del recorrido la vigila
  // `prueba-gesto-barra`, que lo filma paso a paso en vez de mirar sus puntas.
  const margen = ej.id === "press-vertical" ? 10.5 : 2;
  const aPlomo = r.barraD && Math.abs(r.barraD[0]) <= 2 && Math.abs(r.barraD[2]) <= margen;
  ok(aPlomo, `${ej.es} · la barra viaja en vertical (desvío ${r.barraD ? Math.hypot(r.barraD[0], r.barraD[2]).toFixed(1) : "?"} cm, margen ${margen})`);
  ok(r.barraD && Math.abs(r.barraD[1]) > 15, `${ej.es} · y de verdad recorre camino (${r.barraD?.[1]} cm)`);

  // 3) LA BARRA NO SE ALABEA en ninguno de los dos extremos del recorrido.
  ok((r.arriba.barra?.inclinacionDeg ?? 99) < 1, `${ej.es} · barra nivelada arriba (${r.arriba.barra?.inclinacionDeg}°)`);
  ok((r.fondo.barra?.inclinacionDeg ?? 99) < 1, `${ej.es} · barra nivelada en el fondo (${r.fondo.barra?.inclinacionDeg}°)`);

  // 4) LOS PIES PISAN EL SUELO en los dos extremos (nada de flotar ni hundirse).
  for (const [k, e] of [["arriba", r.arriba], ["fondo", r.fondo]]) {
    ok(Math.abs(e.sueloL) < 1.5 && Math.abs(e.sueloR) < 1.5,
      `${ej.es} · ${k}: las plantas tocan el suelo (${e.sueloL} / ${e.sueloR} cm)`);
  }
}

// 5) LA VERTICAL DEL MEDIO DEL PIE: la regla sagital del diseñador para el
//    peso muerto — pie, barra y brazos en la misma recta vertical.
const pm = await p.evaluate(async () => {
  const ed = window.exersuite.editor;
  ed.ponerBarraEnManos("peso-muerto");
  await new Promise((x) => setTimeout(x, 400));
  const a = window.__estado();
  ed.aplicarPosturaBarra("fondo");
  await new Promise((x) => setTimeout(x, 400));
  const f = window.__estado();
  return { arriba: a, fondo: f };
});
for (const [k, e] of [["bloqueo", pm.arriba], ["suelo", pm.fondo]]) {
  const desvio = e.barra ? Math.abs(e.barra.centro[2] - e.medioPieZ) : 99;
  ok(desvio < 5, `peso muerto · ${k}: la barra cae sobre el medio del pie (${desvio.toFixed(1)} cm)`);
}

for (const e of errores) console.log("PAGEERROR " + e);
console.log(fallos.length === 0 && errores.length === 0
  ? "\nTODO OK" : `\n${fallos.length} fallos, ${errores.length} errores de página`);
await browser.close();
process.exit(fallos.length === 0 && errores.length === 0 ? 0 : 1);
