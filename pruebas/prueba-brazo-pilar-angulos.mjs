// PRUEBA: EL BRAZO CON PILAR, DISEÑADO POR ÁNGULOS (v0.4.11).
//
// La herramienta «Brazo con pilar regulable» deducía el pilar y repartía los
// topes a la misma distancia sobre la viga: los ángulos salían como salieran.
// Una banca se diseña al revés —primero los ángulos, y de ellos las muescas—, y
// eso es lo que aquí se comprueba:
//
//   · que la cuenta al revés reproduce una gráfica de referencia muesca a
//     muesca, y que el pilar se puede dar en vez de deducirlo;
//   · que dice HASTA DÓNDE llega el brazo con un pilar dado: la tabla que
//     acompañaba a esa gráfica pedía 45°, 60° y 85° a un pilar que no pasa de 30;
//   · que avisa de las muescas que no caben, y de un recorrido que la viga no
//     deja hacer (antes devolvía otro en silencio);
//   · y, montado de verdad y simulando, que el brazo se asienta en el ángulo
//     que se pidió para su tope.
import { chromium } from "playwright-core";
import { prepararPasos } from "./arnes.mjs";

let fallos = 0;
const ok = (cond, msg, dato) => {
  if (cond) console.log(`✓ ${msg}`);
  else { fallos++; console.log(`✗ ${msg}${dato === undefined ? "" : ` — ${dato}`}`); }
};
const cerca = (a, b, tol) => Math.abs(a - b) <= tol;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
// Por pasos, no por reloj: ver pruebas/arnes.mjs (v0.4.10).
const pausa = await prepararPasos(page);
page.on("pageerror", (e) => console.log("✗ PAGEERROR: " + e.message));
await page.goto(process.env.BASE ?? "http://127.0.0.1:4174/");
await pausa(1000);
await page.click("text=📁 PROYECTOS"); await pausa(300);
await page.click(".land-actions button:has-text('NUEVO')"); await pausa(300);
await page.click(".wizard-carta:has-text('Profesional')"); await pausa(300);
await page.click(".wizard-carta:has-text('Canvas libre')");
await page.waitForFunction(() => !document.querySelector(".cargando-capa"), null, { timeout: 45000 });
await pausa(1500);

// ── 1. LA CUENTA ───────────────────────────────────────────────────────────
const cuenta = await page.evaluate(() => {
  const calc = window.exersuite.brazoPilar;
  const seis = [0, 15, 30, 45, 60, 85];
  // La gráfica de referencia: pilar de 18 colgado a 15 del pivote, viga por el
  // pivote. Sus muescas, leídas de la gráfica: 33, 32, 29,4, 25, 20, 11.
  const grafica = calc({ brazoCm: 15, gradoA: 0, gradoB: 85, vigaCm: 1, inclinacionC: 0,
    pilarCm: 18, gradosTopes: seis });
  // El mismo pilar deducido en vez de dado: con la viga que ocupan esas muescas
  // tiene que salir 18.
  const deducido = calc({ brazoCm: 15, gradoA: 0, gradoB: 85, vigaCm: 33 - 11.3373,
    inclinacionC: 0, gradosTopes: seis });
  // La tabla del documento: el pilar de 18 en el EXTREMO de un brazo de 36.
  const documento = calc({ brazoCm: 36, gradoA: 0, gradoB: 85, vigaCm: 1, inclinacionC: 0,
    pilarCm: 18, gradosTopes: seis });
  // Reparto en grados: cinco topes de 15 a 75 tienen que salir a 15° uno de otro.
  const grados = calc({ brazoCm: 35, gradoA: 15, gradoB: 75, vigaCm: 60, inclinacionC: 0,
    descentradoCm: -4.2, topes: 5, reparto: "grados" });
  // Un recorrido que cruza la dirección de la viga.
  const cruza = calc({ brazoCm: 46, gradoA: 10, gradoB: 70, vigaCm: 60, inclinacionC: 30,
    descentradoCm: 4.2, topes: 5 });
  return { grafica, deducido, documento, grados, cruza };
});

const esperadas = [33.0, 32.07, 29.35, 25.15, 19.96, 11.34];
ok(
  cuenta.grafica.topes.length === 6
    && cuenta.grafica.topes.every((t, i) => cerca(t.distanciaCm, esperadas[i], 0.02)),
  "con el pilar DADO, las muescas de la gráfica de referencia, una a una",
  cuenta.grafica.topes.map((t) => `${t.gradoBrazo}°@${t.distanciaCm}`).join(" "),
);
ok(
  cerca(cuenta.deducido.pilarCm, 18, 0.02),
  "y con el pilar DEDUCIDO de la viga que ocupan, sale el mismo pilar de 18",
  `${cuenta.deducido.pilarCm}`,
);
ok(
  /0° y 15°/.test(cuenta.grafica.aviso ?? "") && /0\.93/.test(cuenta.grafica.aviso ?? ""),
  "avisa de que las muescas de 0° y 15° no caben: quedan a 0,93",
  cuenta.grafica.aviso,
);
ok(
  cuenta.documento.topes.length === 0
    && JSON.stringify(cuenta.documento.alcanceGrados) === "[-30,30]"
    && /45°, 60°, 85°/.test(cuenta.documento.aviso ?? ""),
  "con el pilar en el extremo de un brazo de 36, dice que no pasa de 30° y cuáles no llegan",
  `${JSON.stringify(cuenta.documento.alcanceGrados)} — ${cuenta.documento.aviso}`,
);
const pasos = cuenta.grados.topes.map((t, i, a) => (i ? +(t.gradoBrazo - a[i - 1].gradoBrazo).toFixed(1) : null)).slice(1);
ok(
  cuenta.grados.topes.length === 5 && pasos.every((p) => cerca(p, 15, 0.05)),
  "el reparto EN GRADOS deja los topes a 15° uno de otro",
  cuenta.grados.topes.map((t) => `${t.gradoBrazo}°`).join(" "),
);
ok(
  /cruza la dirección de la viga/.test(cuenta.cruza.aviso ?? ""),
  "y un recorrido que cruza la viga ya no se cambia por otro en silencio",
  cuenta.cruza.aviso,
);

// ── 2. MONTADO Y SIMULANDO: CADA TOPE EN SU ÁNGULO ─────────────────────────
// Una banca de proporciones de la gráfica (pilar 1,2 veces el brazo), con la
// viga horizontal 4,2 cm por debajo del pivote, y cuatro topes a 20° uno de
// otro. Se monta cuatro veces, cada una naciendo en un tope, y se deja andar.
const TOPES = [15, 35, 55, 75];
const montajes = [];
for (const g of TOPES) {
  montajes.push(await page.evaluate(async ({ g, TOPES }) => {
    const ed = window.exersuite.editor, T = window.exersuite.THREE;
    if (ed.simulating) await ed.toggleSimulation();
    for (const o of [...ed.objects.values()]) ed.removeObject(o);
    const sol = ed.crearBrazoConPilar({
      brazoCm: 35, gradoA: TOPES[0], gradoB: TOPES[TOPES.length - 1], vigaCm: 1,
      inclinacionC: 0, descentradoCm: -4.2, pilarCm: 42, gradosTopes: TOPES, gradoInicial: g,
    }, new T.Vector3(0, 80, 0));
    const brazo = ed.listObjects().find((o) => /^Brazo$|^Arm$/.test(o.name));
    const ang = () => {
      const d = new T.Vector3(0, 1, 0).applyQuaternion(brazo.mesh.quaternion);
      return +(Math.atan2(d.y, Math.hypot(d.x, d.z)) * 180 / Math.PI).toFixed(1);
    };
    const a0 = ang();
    await ed.toggleSimulation();
    const serie = [];
    for (let k = 0; k < 8; k++) { await window.__pausa(750); serie.push(ang()); }
    await ed.toggleSimulation();
    return { g, a0, serie, aviso: sol.aviso, pilar: sol.pilarCm };
  }, { g, TOPES }));
}
console.log("\nMontado por ángulos (brazo 35, pilar 42), naciendo en cada tope; 6 s simulados:");
for (const m of montajes) {
  console.log(`  tope ${String(m.g).padStart(2)}°: nace en ${m.a0}°, serie ${m.serie.join(" → ")}`);
}
for (const m of montajes) {
  ok(cerca(m.a0, m.g, 0.5), `el brazo NACE en el ángulo pedido para el tope de ${m.g}°`, `${m.a0}°`);
}
for (const m of montajes) {
  const est = m.serie.slice(2);
  const cede = +(Math.max(...est) - Math.min(...est)).toFixed(1);
  ok(
    est.every((a) => cerca(a, m.g, 3)) && cede <= 1,
    `y simulando se asienta en él y no cede (tope de ${m.g}°)`,
    `asentado en ${est[0]}°, cede ${cede}° — ${m.serie.join(" ")}`,
  );
}

console.log(fallos === 0 ? "\nTODO OK" : `\n${fallos} FALLOS`);
await browser.close();
process.exit(fallos === 0 ? 0 : 1);
