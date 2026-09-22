// PRUEBA: LA BANCA AGUANTA EN SUS CINCO TOPES (v0.3.90).
//
// De dónde sale. Desde v0.3.82 el respaldo de `bancoajustable.json` se caía al
// recostarlo, y la investigación descartó con números el motor de física
// (`prueba-bisagra-rigida`), las soldaduras, el perfil del diente
// (`prueba-diente-retiene`), el diámetro del pasador y el asiento. Lo que
// quedaba era una PROPORCIÓN: el puntal medía 58,34 cm y sólo uno de los cinco
// asientos caía a su alcance, así que la banca resbalaba siempre al mismo
// sitio. En v0.3.90 se le quitó la soldadura a la unión de arriba —para que el
// puntal bascule, como en las fotos— y se acortó a 42 cm, el largo que alcanza
// los cinco.
//
// Lo que se mide aquí es exactamente esa afirmación, y sólo esa: se carga la
// banca posada en cada uno de sus cinco topes y se mira CUÁNTO SE MUEVE EL
// RESPALDO con la máquina andando. Los datos los genera `banco42.py`, que
// resuelve el ángulo de cada tope; esta prueba no los recalcula, los comprueba.
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";

// Los cinco ángulos del respaldo, contados desde la vertical, que resuelve la
// geometría con el puntal de 42 cm. Si la banca cambia, cambian, y esta prueba
// se vuelve roja hasta que se vuelvan a resolver: es lo que se quiere.
const TOPES = [
  { asiento: 1, grados: 74.9 },
  { asiento: 2, grados: 63.5 },
  { asiento: 3, grados: 53.3 },
  { asiento: 4, grados: 43.2 },
  { asiento: 5, grados: 31.4 },
];

let fallos = 0;
const ok = (cond, msg, dato) => {
  if (cond) console.log(`✓ ${msg}`);
  else { fallos++; console.log(`✗ ${msg}${dato === undefined ? "" : ` — ${dato}`}`); }
};

const datos = TOPES.map((t) =>
  JSON.parse(readFileSync(new URL(`./datos/banco-tope-${t.asiento}.json`, import.meta.url), "utf8")),
);

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
await page.waitForFunction(() => !document.querySelector(".cargando-capa"), null, { timeout: 45000 });
await page.waitForTimeout(2500);

/** Carga una pose, la deja andar 12 s y devuelve el ángulo del respaldo. */
const medir = (data) =>
  page.evaluate(async (proyecto) => {
    const ed = window.exersuite.editor, T = window.exersuite.THREE;
    await ed.loadProject(proyecto);
    await new Promise((r) => setTimeout(r, 800));
    const resp = [...ed.objects.values()].find((o) => o.name === "Respaldo");
    const por = (n) => [...ed.objects.values()].find((o) => o.name === n);
    const carril = por("Placa dentada (upright)");
    const pasador = por("Pasador de apoyo");
    // El asiento va soldado al bastidor, así que es el bastidor: el motor los
    // funde en un solo cuerpo y su nombre, a diferencia del de las vigas, es único.
    const bastidor = por("Asiento");
    if (!resp || !carril || !pasador || !bastidor) return { error: "la banca no se montó entera" };
    const q = new T.Quaternion(), q2 = new T.Quaternion();
    // EL ÁNGULO DEL RESPALDO RELATIVO AL BASTIDOR. Medirlo contra el mundo
    // mezcla el mecanismo con el viaje de la máquina entera —que se asienta y
    // se mueve—, y ése fue el error que dio tres diagnósticos falsos en
    // v0.3.85 y uno más en v0.3.90.
    const eje = () => {
      resp.mesh.updateMatrixWorld(true); bastidor.mesh.updateMatrixWorld(true);
      const v = new T.Vector3(0, 1, 0)
        .applyQuaternion(resp.mesh.getWorldQuaternion(q))
        .applyQuaternion(bastidor.mesh.getWorldQuaternion(q2).invert());
      return +(Math.atan2(v.x, v.y) * 180 / Math.PI).toFixed(1);
    };
    // Y LO QUE DE VERDAD DECIDE: dónde está el pasador EN EL MARCO DEL CARRIL.
    // Salirse de un diente es correrse a lo largo del carril, y nada más; es
    // el gesto que `prueba-diente-retiene` dejó afinado.
    const enCarril = () => {
      carril.mesh.updateMatrixWorld(true); pasador.mesh.updateMatrixWorld(true);
      return carril.mesh.worldToLocal(pasador.mesh.getWorldPosition(new T.Vector3()));
    };
    const inicio = eje();
    const p0 = enCarril();
    ed.toggleSimulation();
    const serie = [], carrera = [];
    for (let k = 0; k < 12; k++) {
      await new Promise((r) => setTimeout(r, 1000));
      serie.push(eje());
      carrera.push(+(enCarril().y - p0.y).toFixed(2));
    }
    ed.toggleSimulation();
    await new Promise((r) => setTimeout(r, 300));
    return {
      inicio, fin: serie[serie.length - 1], serie, carrera,
      corrido: +Math.abs(carrera[carrera.length - 1]).toFixed(2),
      cuerpos: ed.objects.size,
    };
  }, data);

console.log("La banca, posada en cada tope y andando 12 s.");
console.log("Ángulo del respaldo desde la vertical, en grados:\n");
console.log("  tope   esperado   arranca   acaba   deriva   corrido en el carril");
const res = [];
for (let i = 0; i < TOPES.length; i++) {
  const r = await medir(datos[i]);
  if (r.error) { ok(false, r.error); break; }
  const deriva = +Math.abs(r.fin - r.inicio).toFixed(1);
  res.push({ ...TOPES[i], ...r, deriva });
  console.log(
    `  ${TOPES[i].asiento}      ${String(TOPES[i].grados).padStart(6)}    ${String(r.inicio).padStart(6)}  ${String(r.fin).padStart(6)}  ${String(deriva).padStart(6)}   ${String(r.corrido).padStart(6)} cm`,
  );
}
console.log("");

for (const r of res) {
  // La pose guardada tiene que ser la que resuelve la geometría: si el modelo
  // se edita a mano y se descuadra, esto lo canta antes que la deriva.
  ok(Math.abs(Math.abs(r.inicio) - r.grados) < 2,
    `el tope ${r.asiento} arranca donde dice la geometría (${r.grados}°)`,
    `arrancó en ${Math.abs(r.inicio)}°`);
}
// EL PASADOR NO SE SALE DE SU DIENTE. Los dientes van a 12,5 cm, así que
// correrse más de medio paso es haberse cambiado de tope; y ésta es la medida
// directa, la que no depende de dónde esté la máquina.
for (const r of res) {
  ok(r.corrido < 6, `el pasador se queda en el diente del tope ${r.asiento}`,
    `se corrió ${r.corrido} cm — ${r.carrera.join(" ")}`);
}
// UN GRADO EN DOCE SEGUNDOS. Antes de v0.3.90 la banca se iba 8° y acababa
// siempre en el mismo sitio, tuviera el pasador donde lo tuviera.
for (const r of res) {
  ok(r.deriva <= 1, `y el respaldo aguanta ahí los 12 s`,
    `el tope ${r.asiento} derivó ${r.deriva}° — ${r.serie.join(" ")}`);
}
// Y QUE SEAN CINCO POSICIONES DISTINTAS, que es de lo que iba todo esto.
if (res.length === 5) {
  const finales = res.map((r) => Math.abs(r.fin)).sort((a, b) => a - b);
  const juntos = finales.some((v, i) => i > 0 && v - finales[i - 1] < 5);
  ok(!juntos, "los cinco topes acaban en cinco ángulos distintos",
    finales.map((v) => `${v}°`).join(" · "));
}

console.log(fallos === 0 ? "\nTODO OK" : `\n${fallos} FALLOS`);
await browser.close();
process.exit(fallos === 0 ? 0 : 1);
