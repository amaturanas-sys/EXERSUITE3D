// PRUEBA: EL PIVOTE INDEXADO SOBRE LA BANCA DEL DISEÑADOR (v0.3.50).
//
// La banca `bancoajustable2.json` lleva desde v0.3.29 el mecanismo de BRAZO Y
// PILAR: un puntal que baja del respaldo y se apoya en la muesca de un carril
// de topes. Ese mecanismo tiene un problema conocido y anotado —no sostiene en
// todos los topes, y el criterio de por qué sí en unos y no en otros nunca se
// encontró—, y es exactamente el problema que el PIVOTE INDEXADO resuelve de
// otra manera: en vez de apoyar un puntal en un diente, se clava un seguro en
// un agujero del disco, sobre el propio eje de giro.
//
// Aquí se cambia el mecanismo en la banca de verdad y se mide si aguanta.
//
//   · ANTES: la banca tal como está guardada, con su puntal en el diente.
//   · DESPUÉS: sin puntal, sin carril y sin los diez dedos; el respaldo clavado
//     por el disco de tramos, hora a hora.
//
// Lo que se mide en las dos es lo mismo y es lo único que importa: CUÁNTO SE
// MUEVE EL RESPALDO con la máquina andando.
import { chromium } from "playwright-core";
import { readFileSync, writeFileSync } from "node:fs";

const BANCA = JSON.parse(
  readFileSync(new URL("./datos/bancoajustable2.json", import.meta.url), "utf8"),
);

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
await page.click(".wizard-carta:has-text('Canvas libre')");
// SE ESPERA A QUE LA APP ESTE LISTA, NO AL RELOJ (v0.3.81): la capa de carga
// se va cuando las mallas estan. Adivinarlo con un timeout fijo es lo que
// hacia parpadear a estas pruebas.
await page.waitForFunction(() => !document.querySelector(".cargando-capa"), null, { timeout: 45000 });
await page.waitForTimeout(2500);

// ── 1. LA BANCA COMO ESTÁ: el puntal en su diente ────────────────────────
const antes = await page.evaluate(async (data) => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  await ed.loadProject(data);
  await new Promise((r) => setTimeout(r, 700));
  const resp = [...ed.objects.values()].find((o) => o.name === "Respaldo");
  const donde = () => {
    resp.mesh.updateMatrixWorld(true);
    return resp.mesh.getWorldPosition(new T.Vector3());
  };
  const inicio = donde();
  if (!ed.isSimulating()) ed.toggleSimulation();
  await new Promise((r) => setTimeout(r, 4000));
  const fin = donde();
  if (ed.isSimulating()) ed.toggleSimulation();
  return {
    piezas: [...ed.objects.values()].length,
    deriva: +inicio.distanceTo(fin).toFixed(2),
  };
}, BANCA);
console.log("ANTES:", JSON.stringify(antes));

// ── 2. SE CAMBIA EL MECANISMO ────────────────────────────────────────────
//
// LO QUE LA BANCA TENÍA, leído de sus propias uniones: el respaldo NO pivota
// sobre el chasis. Va soldado al BRAZO, el brazo pivota en el carril de topes, y
// lo que sostiene el ángulo es el PILAR DE APOYO metido en un diente. Trece
// piezas —carril, puntal, diez dedos y el herraje de dos bisagras— para hacer lo
// que un agujero hace solo.
//
// Así que aplicar el pivote indexado no es re-etiquetar una bisagra: es REHACER
// EL PIVOTE con la herramienta del pasador, que monta sola la horquilla con su
// disco de tramos.
const cambio = await page.evaluate(async (data) => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE, R = window.exersuite.reloj;
  await ed.loadProject(data);
  await new Promise((r) => setTimeout(r, 700));

  // EL EJE NO SE INVENTA: es el que la banca ya tenía. Se lee de la bisagra que
  // sostiene al brazo antes de tocar nada.
  const brazo = [...ed.objects.values()].find((o) => o.name === "Brazo");
  const vieja = ed.bisagraQueSostiene(brazo.id);
  if (!vieja) return { error: "no se encuentra el pivote del brazo" };
  const punto = vieja.anchor.clone();
  const eje = vieja.ejeVector().normalize();

  // EL ANCLA: la pieza FIJA del chasis más cercana a ese eje. El carril hacía de
  // intermediario y se va con el resto.
  const fijas = [...ed.objects.values()].filter(
    (o) => o.physics?.fixed && o.componentId === "pilar-linea",
  );
  let ancla = null, cerca = 1e9;
  for (const o of fijas) {
    o.mesh.updateMatrixWorld(true);
    const d = new T.Box3().setFromObject(o.mesh).distanceToPoint(punto);
    if (d < cerca) { cerca = d; ancla = o; }
  }
  if (!ancla) return { error: "la banca no tiene chasis fijo cerca del eje" };

  // FUERA EL MECANISMO VIEJO: el carril, el puntal, los diez dedos y el herraje
  // de las dos bisagras que los articulaban.
  const sobran = [...ed.objects.values()].filter(
    (o) => o.name === "Viga de topes" || o.name === "Pilar de apoyo"
      || o.name.startsWith("Tope ") || o.componentId === "placa-bisagra"
      || o.componentId === "pasador-bisagra",
  );
  const quitadas = sobran.length;
  for (const o of sobran) ed.removeObject(o);

  // Y EL PIVOTE NUEVO, montado por la herramienta.
  const pas = ed.addComponent("pasador");
  pas.name = "Pivote del respaldo";
  pas.mesh.name = pas.name;
  pas.mesh.position.copy(punto);
  pas.mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), eje);
  pas.mesh.updateMatrixWorld(true);
  Object.assign(pas.params, {
    pasadorAnclas: [ancla.id],
    pasadorMoviles: [brazo.id],
    pasadorAnclaje: true,
    // FRENADO, que es lo que hace un seguro metido en su agujero.
    pasadorLibre: false,
    pasadorIndexado: true,
    pasadorPosiciones: 12,       // 30° de paso: una hora por agujero
    pasadorRedondea: true,
  });
  ed.aplicarPasador(pas);

  // EL RECORRIDO, EN HORAS. Se pide un tramo que CONTENGA la pose en la que el
  // respaldo ya está, para que no nazca peleado con sus propios topes.
  const reloj = ed.relojDePasador(pas);
  const enDiseno = reloj?.poses?.length
    ? R.formatearHora(reloj.c0 + reloj.s * reloj.poses[0])
    : null;
  if (reloj && reloj.poses.length) {
    const desde = reloj.c0 + reloj.s * reloj.poses[0];
    const t = R.tramoDesdeHoras(reloj, desde - 30, desde + 150, false);
    Object.assign(pas.params, {
      pasadorLimite: true, pasadorMin: t.min, pasadorMax: t.max,
    });
    ed.aplicarPasador(pas);
  }

  const h = [...ed.objects.values()].find((o) => o.componentId === "punto-anclaje");
  const horas = reloj ? (() => {
    const x = R.horasDesdeTramo(reloj, pas.params.pasadorMin, pas.params.pasadorMax);
    return `${R.formatearHora(x.desde)} → ${R.formatearHora(x.hasta)}`;
  })() : null;
  return {
    quitadas,
    ancla: ancla.name,
    enDiseno,
    horas,
    tramos: h?.params?.horquillaTramos ?? null,
    arco: h?.params?.horquillaArco ?? null,
    piezas: [...ed.objects.values()].length,
  };
}, BANCA);
console.log("CAMBIO:", JSON.stringify(cambio));
ok(!cambio.error, "la herramienta encuentra el eje que la banca ya tenía y su chasis", cambio.error);
ok(
  cambio.quitadas === 18,
  "fuera el mecanismo viejo: carril, puntal, diez dedos y el herraje de dos bisagras",
  `${cambio.quitadas} piezas quitadas`,
);
ok(
  cambio.tramos === 7 && cambio.arco === 180,
  "y la horquilla nace con SU DISCO: 7 agujeros en media vuelta, una hora cada uno",
  `${cambio.tramos} agujeros en ${cambio.arco}°`,
);
ok(
  cambio.horas !== null,
  "con el recorrido dicho en horas del mundo",
  `el respaldo nace a las ${cambio.enDiseno} · tramo ${cambio.horas}`,
);

// ── 3. ¿AGUANTA, HORA A HORA? ────────────────────────────────────────────
// Lo único que de verdad se le pide a un mecanismo de fijación: que el respaldo
// se quede donde lo dejaste.
//
// SE GIRA A PASITOS Y CON TIEMPO, que es como lo haría una mano. `girarBisagra`
// mueve el OBJETIVO del freno y la física lo persigue; pedirle treinta grados de
// un tirón y soltar en el mismo instante la congela donde estaba —eso fue lo que
// esta prueba midió primero, y daba cinco paradas idénticas en cero: no es que
// aguantara, es que no se había movido—.
const aguante = await page.evaluate(async () => {
  const ed = window.exersuite.editor, T = window.exersuite.THREE;
  const resp = [...ed.objects.values()].find((o) => o.name === "Respaldo");
  const donde = () => {
    resp.mesh.updateMatrixWorld(true);
    return resp.mesh.getWorldPosition(new T.Vector3());
  };
  // HACIA DONDE HAY SITIO. El tramo pedido deja el respaldo a una hora de un
  // extremo y a cinco del otro —nace casi vertical y lo que hace es reclinarse—,
  // así que empujar al tuntún lo estrella contra el cabo corto en el primer
  // agujero. Se mira el rango y se tira hacia el lado largo, que es lo que hace
  // una mano: reclinar.
  const junta = ed.listJoints().find((x) => !x.soldada);
  const enDiseno = junta.apertura0 ?? 0;
  const paso = junta.max - enDiseno > enDiseno - junta.min ? 5 : -5;

  if (!ed.isSimulating()) ed.toggleSimulation();
  await new Promise((r) => setTimeout(r, 1200));

  const paradas = [];
  for (let k = 0; k < 4; k++) {
    ed.physics.tomarBisagra(resp.id);
    // Una hora, en pasos de cinco grados.
    for (let i = 0; i < 6; i++) {
      ed.physics.girarBisagra(resp.id, paso);
      await new Promise((r) => setTimeout(r, 140));
    }
    const pedido = ed.physics.anguloDeBisagra(resp.id);
    ed.physics.soltarBisagra(resp.id);
    await new Promise((r) => setTimeout(r, 800));
    const idx = ed.physics.indiceDeBisagra(resp.id);
    const a0 = ed.physics.anguloDeBisagra(resp.id);
    const p0 = donde();
    await new Promise((r) => setTimeout(r, 3000));
    const a1 = ed.physics.anguloDeBisagra(resp.id);
    paradas.push({
      hacia: paso,
      indice: idx ? `${idx.indice + 1}/${idx.posiciones}` : null,
      pedido: pedido == null ? null : +pedido.toFixed(1),
      clavado: a0 == null ? null : +a0.toFixed(1),
      cede: a1 == null || a0 == null ? null : +Math.abs(a1 - a0).toFixed(2),
      deriva: +p0.distanceTo(donde()).toFixed(2),
    });
  }
  if (ed.isSimulating()) ed.toggleSimulation();
  return paradas;
});
console.log("AGUANTE:", JSON.stringify(aguante));
const movio = Math.abs((aguante.at(-1)?.clavado ?? 0) - (aguante[0]?.clavado ?? 0));
const peorCede = Math.max(...aguante.map((p) => p.cede ?? 99));
const peorDeriva = Math.max(...aguante.map((p) => p.deriva ?? 99));
const enHora = aguante.every((p) => p.clavado != null && Math.abs(((p.clavado % 30) + 30) % 30) < 0.6
  || (p.clavado != null && Math.abs((((p.clavado % 30) + 30) % 30) - 30) < 0.6));
ok(
  movio > 45,
  "el respaldo RECORRE el disco: cuatro paradas lo mueven más de hora y media",
  `de ${aguante[0]?.clavado}° a ${aguante.at(-1)?.clavado}°`,
);
ok(
  aguante.every((p) => p.indice !== null),
  "cada parada cae en un agujero del disco, no donde sea",
  aguante.map((p) => p.indice).join(" · "),
);
ok(
  enHora,
  "y ese agujero está EN PUNTO: el ángulo al que se clava es múltiplo de una hora",
  aguante.map((p) => `${p.pedido}° → ${p.clavado}°`).join(" · "),
);
ok(
  peorCede < 1.5,
  "el respaldo NO CEDE en ninguna: se queda en su agujero",
  `lo que más cede son ${peorCede}° en 3 s`,
);
ok(
  peorDeriva < 1.5,
  "ni se va de sitio con la máquina andando",
  `${peorDeriva} cm de deriva en el peor caso`,
);
// EL ANTES, para que el número signifique algo: el puntal en su diente dejaba
// irse el respaldo 30 cm en cuatro segundos.
ok(
  peorDeriva < antes.deriva / 10,
  "que es lo que el mecanismo de puntal y diente no conseguía",
  `antes ${antes.deriva} cm · ahora ${peorDeriva} cm`,
);

// ── 4. LA BANCA NUEVA, GUARDADA ──────────────────────────────────────────
// Sólo cuando se pide (GUARDAR=1): una prueba no debe dejar ficheros detrás en
// cada pasada, pero el proyecto convertido es el entregable y sale de aquí para
// que no pueda separarse de lo que esta prueba mide.
if (process.env.GUARDAR === "1") {
  const proyecto = await page.evaluate(() => JSON.stringify(window.exersuite.editor.serialize()));
  writeFileSync(new URL("./datos/bancoajustable3.json", import.meta.url), proyecto);
  console.log("guardada: pruebas/datos/bancoajustable3.json");
}

console.log(fallos === 0 ? "TODO OK" : `❌ ${fallos} fallo(s)`);
await browser.close();
process.exit(fallos ? 1 : 0);
