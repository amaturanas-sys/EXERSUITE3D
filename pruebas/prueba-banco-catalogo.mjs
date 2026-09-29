// PRUEBA: LA BANCA DE CATÁLOGO AGUANTA EN SUS CUATRO TOPES (v0.4.11).
//
// Es la banca ajustable del diseñador con la placa dentada rehecha: sus dientes
// ya no van a 12,5 cm unos de otros —que daba topes a 15,1 / 27,8 / 38,6 / 48,7 /
// 59,4°— sino donde dan ángulos de catálogo: 15, 30, 45 y 60° sobre la
// horizontal. Las posiciones las calcula `banco-catalogo.py` con la cuenta de la
// herramienta «Brazo con pilar» al revés, y las poses `banco-topes-geometria.py`,
// que resuelve el triángulo por su cuenta: salen al 0,0 y con el pasador a 0,00
// mm de su asiento. El gancho es el del diseñador, sin tocar.
//
// Se probaron también el plano y 75°, y no sirven con esta bisagra y este pilar:
// en el plano el pasador trepa al diente de 15 (pilar a 22° de la placa con la
// palanca máxima del respaldo), y a 75° los travesaños de pilar y respaldo nacen
// 4 cm metidos uno en otro. El porqué, medido, en `banco-catalogo.py`.
//
// Lo que se mide aquí es lo mismo que en `prueba-banco-cinco-topes`, con los
// mismos umbrales: que cada tope arranca donde dice la geometría, que el pasador
// no se sale de su diente, que el respaldo no cede una vez asentado y que los
// seis acaban en ángulos distintos.
import { chromium } from "playwright-core";
import { prepararPasos } from "./arnes.mjs";
import { readFileSync } from "node:fs";

// Los cinco ángulos del respaldo, contados desde la vertical, que resuelve la
// geometría con el puntal de 42 cm. Si la banca cambia, cambian, y esta prueba
// se vuelve roja hasta que se vuelvan a resolver: es lo que se quiere.
// REGENERADOS DESDE LA BASE NUEVA (v0.4.7). Los de antes salían del pivote de la
// bisagra de placas, en (−24,75, 42,15); la banca pivota ahora en el pasador de
// su horquilla, en (−28, 45,87), y con el respaldo concéntrico con ese eje. Los
// resuelve `topes.py` contra el mismo puntal de 42 cm, y en los cinco el pasador
// cae a 0,00 mm de su asiento.
const TOPES = [
  { asiento: 1, grados: 75 },   // 15° sobre la horizontal
  { asiento: 2, grados: 60 },   // 30°
  { asiento: 3, grados: 45 },   // 45°
  { asiento: 4, grados: 30 },   // 60°
];

let fallos = 0;
const ok = (cond, msg, dato) => {
  if (cond) console.log(`✓ ${msg}`);
  else { fallos++; console.log(`✗ ${msg}${dato === undefined ? "" : ` — ${dato}`}`); }
};

const datos = TOPES.map((t) =>
  JSON.parse(readFileSync(new URL(`./datos/banco-catalogo-${t.asiento}.json`, import.meta.url), "utf8")),
);

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
await pausa(2500);

/** Carga una pose, la deja andar 12 s y devuelve el ángulo del respaldo. */
const medir = (data) =>
  page.evaluate(async (proyecto) => {
    const ed = window.exersuite.editor, T = window.exersuite.THREE;
    // POR PASOS, NO POR RELOJ (v0.4.10): la física la avanza esta prueba, 12 s
    // simulados = 720 sub-pasos exactos, vaya la máquina a los fps que vaya.
    ed.setPasoManual(true);
    await ed.loadProject(proyecto);
    await window.__pausa(800);
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
    await ed.toggleSimulation();
    const serie = [], carrera = [];
    for (let k = 0; k < 12; k++) {
      ed.avanzarSimulacion(1);
      serie.push(eje());
      const q = enCarril();
      // LAS DOS COMPONENTES. Mirar solo la de a lo largo del carril da verdes
      // falsos: el pasador se sale DE LADO —en x— y la y apenas se entera.
      carrera.push([+(q.x - p0.x).toFixed(2), +(q.y - p0.y).toFixed(2)]);
    }
    await ed.toggleSimulation();
    await window.__pausa(300);
    return {
      inicio, fin: serie[serie.length - 1], serie, carrera,
      corrido: +Math.hypot(...carrera[carrera.length - 1]).toFixed(2),
      deLado: +Math.abs(carrera[carrera.length - 1][0]).toFixed(2),
      cuerpos: ed.objects.size,
    };
  }, data);

console.log("La banca, posada en cada tope y andando 12 s.");
console.log("Ángulo del respaldo desde la vertical, en grados:\n");
console.log("  tope   esperado   arranca   acaba   deriva   se corrio (y de lado)");
const res = [];
for (let i = 0; i < TOPES.length; i++) {
  const r = await medir(datos[i]);
  if (r.error) { ok(false, r.error); break; }
  const deriva = +Math.abs(r.fin - r.inicio).toFixed(1);
  res.push({ ...TOPES[i], ...r, deriva });
  console.log(
    `  ${TOPES[i].asiento}      ${String(TOPES[i].grados).padStart(6)}    ${String(r.inicio).padStart(6)}  ${String(r.fin).padStart(6)}  ${String(deriva).padStart(6)}   ${String(r.corrido).padStart(6)} cm (${r.deLado} de lado)`,
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
//
// A LOS CINCO, TAMBIÉN AL TOPE 1 (v0.4.11). De v0.4.7 a v0.4.10 el tope 1 se
// medía y se decía pero no se exigía, y la razón escrita aquí era mecánica: que
// el puntal queda a 37° del carril y empuja al pasador a lo largo de él, «y
// ninguna cuna sujeta eso». ERA DEL MOTOR. Midiendo el triángulo
// respaldo-puntal-bastidor con las anclas de Rapier, la bisagra entre respaldo y
// puntal se ABRÍA —0,62 cm en tres sub-pasos, 20 cm a los 12 s—, igual sin
// límites, sin pasador y sin contactos. El puntal, 1,90 kg colgado de un
// respaldo que giraba, tenía velocidad angular 0,00 en cada sub-paso: el
// detector de tubos guía lo había tomado por un carro ensartado en el carril,
// porque con 37° el eje del carril le cruzaba la caja envolvente ALINEADA CON EL
// MUNDO, y le congelaba la rotación. Sólo en el tope 1; en los otros cuatro, cero
// guías. Arreglado el detector (caja orientada, y alineada con el tubo), la
// bisagra se queda en 0,01-0,03 cm y el tope 1 aguanta como los demás.
//
// La intermitencia de v0.4.8 (el tope 1 caía un diente entero en 4 de 9
// corridas) era esto mismo muestreado a destiempo: con el acumulador descartando
// el 86 % del tiempo, la banca rota se leía a mitad de caerse.
for (const r of res) {
  ok(r.corrido < 6, `el pasador se queda en el diente del tope ${r.asiento}`,
    `se corrió ${r.corrido} cm, ${r.deLado} de ellos DE LADO — ${r.carrera.map((c) => c.join("/")).join(" ")}`);
}
// UN GRADO, UNA VEZ ASENTADA (v0.4.7).
//
// Se medía contra la pose GUARDADA, y eso mete en la cuenta el asentamiento del
// primer segundo: el pasador cayendo en su cuna y las uniones tensándose valen
// 1,6-3° que no son cesión ninguna —las series se quedan clavadas al segundo y no
// se mueven en los once restantes—. Lo que la banca promete es que NO CEDE, y eso
// se lee en el tramo estable: de la tercera muestra a la última. A los cinco
// topes, desde v0.4.11 (ver arriba por qué el 1 estuvo fuera).
for (const r of res) {
  const estable = r.serie.slice(2);
  const cede = +(Math.max(...estable) - Math.min(...estable)).toFixed(1);
  ok(cede <= 1, `y el respaldo aguanta ahí los 12 s (tope ${r.asiento})`,
    `cedió ${cede}° tras asentarse — ${r.serie.join(" ")}`);
}
// Y QUE SEAN CINCO POSICIONES DISTINTAS, que es de lo que iba todo esto.
if (res.length === TOPES.length) {
  const finales = res.map((r) => Math.abs(r.fin)).sort((a, b) => a - b);
  const juntos = finales.some((v, i) => i > 0 && v - finales[i - 1] < 5);
  ok(!juntos, "los cuatro topes acaban en ángulos distintos",
    finales.map((v) => `${v}°`).join(" · "));
}

console.log(fallos === 0 ? "\nTODO OK" : `\n${fallos} FALLOS`);
await browser.close();
process.exit(fallos === 0 ? 0 : 1);
