// v0.2.81 · BARRA EN MANOS DEL MANIQUÍ.
//
// Lo que hay que proteger aquí no son los grados de las posturas —de eso ya se
// ocupa `sentadilla`— sino que la BARRA y el CUERPO estén de acuerdo. Un rack
// se dimensiona por dónde queda la barra, así que una barra que se despega del
// cuerpo, que se queda plantada cuando la figura baja, o que no cae donde la
// espera el gancho, arruina la medida sin que se note en la captura.
//
// Las comprobaciones son RELACIONES, y cada una tiene un fallo real detrás:
//
//   · la barra va DELANTE del hombro en la frontal y DETRÁS en la trasera —
//     es lo único que distingue los dos ejercicios;
//   · en press y peso muerto va EN LA MANO, no colgada del hombro;
//   · SIGUE a la postura: si no, la barra se queda arriba mientras la figura
//     baja, que es exactamente el error que no se ve en una foto de perfil;
//   · en la salida del peso muerto LOS DISCOS APOYAN EN EL SUELO. Esta es la
//     que más vale: es la física diciendo si la postura llega a la barra o se
//     queda a cuatro centímetros. Con la postura anterior flotaban 4,7 cm.
import { chromium } from "playwright-core";

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const p = await browser.newPage({ viewport: { width: 1180, height: 900 } });
const errores = [];
p.on("pageerror", (e) => errores.push(e.message));
await p.goto("http://127.0.0.1:4174/");
await p.waitForTimeout(1000);
await p.click("text=🛠 BUILDER"); await p.waitForTimeout(300);
await p.click("text=Crear nuevo proyecto"); await p.waitForTimeout(300);
await p.click(".wizard-carta:has-text('Profesional')"); await p.waitForTimeout(300);
await p.click(".wizard-carta:has-text('Canvas libre')"); await p.waitForTimeout(2500);
await p.evaluate(() => window.exersuite.editor.toggleHumanFigure());
await p.waitForTimeout(1200);

const fallos = [];
const ok = (c, m) => { if (!c) fallos.push(m); console.log((c ? "✓ " : "✗ ") + m); };

/** Medidas de la barra puesta, relativas al cuerpo. */
const medir = () => p.evaluate(() => {
  const T = window.exersuite.THREE, ed = window.exersuite.editor;
  const enlace = ed.getBarraManiqui();
  if (!enlace) return null;
  const obj = ed.listObjects().find((o) => o.id === enlace.objectId);
  if (!obj) return null;
  const f = ed.humanFigure;
  f.updateMatrixWorld(true);
  obj.mesh.updateMatrixWorld(true);
  const J = ed.figureJoints();
  const seg = (s) => { let m = null; f.traverse((n) => { if (n.isMesh && n.userData.segmentId === s) m = n; }); return m; };
  const cen = (s) => new T.Box3().setFromObject(seg(s)).getCenter(new T.Vector3());
  const hombro = J.shoulderL.getWorldPosition(new T.Vector3())
    .add(J.shoulderR.getWorldPosition(new T.Vector3())).multiplyScalar(0.5);
  const mano = cen("mano-L").clone().add(cen("mano-R")).multiplyScalar(0.5);
  const suelo = new T.Box3().setFromObject(f).min.y;
  const caja = new T.Box3().setFromObject(obj.mesh);
  const eje = new T.Vector3(0, 1, 0).applyQuaternion(obj.mesh.quaternion);
  const b = obj.mesh.position;
  return {
    ejercicio: enlace.ejercicio, rackeada: enlace.rackeada,
    kg: +ed.pesoBarraKg().toFixed(1), discos: ed.discosBarra(),
    barraY: +(b.y - suelo).toFixed(1),
    vsHombro: [+(b.x - hombro.x).toFixed(1), +(b.y - hombro.y).toFixed(1), +(b.z - hombro.z).toFixed(1)],
    vsMano: +b.distanceTo(mano).toFixed(1),
    ejeVertical: +Math.abs(eje.y).toFixed(3),
    ejeLateral: +Math.abs(eje.x).toFixed(3),
    largo: +(caja.max.x - caja.min.x).toFixed(0),
    discoAlSuelo: +(caja.min.y - suelo).toFixed(1),
  };
});

const poner = (ej) => p.evaluate((q) => { window.exersuite.editor.ponerBarraEnManos(q); }, ej);
const postura = (c) => p.evaluate((q) => { window.exersuite.editor.aplicarPosturaBarra(q); }, c);

// ---- 1. La barra existe y es una pieza de la escena
const antes = await p.evaluate(() => window.exersuite.editor.listObjects().length);
await poner("sentadilla-frontal");
const despues = await p.evaluate(() => window.exersuite.editor.listObjects().length);
ok(despues === antes + 1, `poner la barra añade UNA pieza a la escena (${antes} → ${despues})`);

const frontalArriba = await medir();
ok(frontalArriba !== null && frontalArriba.largo === 220,
  `es una barra olímpica de 2,2 m (${frontalArriba?.largo} cm)`);
ok(frontalArriba.kg === 20 && frontalArriba.discos === 0,
  `nace descargada y pesa lo que pesa la barra sola (${frontalArriba.kg} kg)`);

// Cambiar de ejercicio NO siembra barras: se reaprovecha la misma pieza.
await poner("sentadilla-trasera");
const traseraArriba = await medir();
const tras = await p.evaluate(() => window.exersuite.editor.listObjects().length);
ok(tras === despues, `cambiar de ejercicio reaprovecha la misma barra (${tras} piezas)`);

// ---- 2. EL RACK: delante del hombro en la frontal, detrás en la trasera
ok(frontalArriba.vsHombro[2] > 6,
  `frontal: la barra apoya DELANTE del hombro (${frontalArriba.vsHombro[2]} cm), sobre deltoides y clavícula`);
ok(traseraArriba.vsHombro[2] < -2,
  `trasera: la barra apoya DETRÁS del hombro (${traseraArriba.vsHombro[2]} cm), sobre los trapecios`);
ok(frontalArriba.vsHombro[1] > 0 && traseraArriba.vsHombro[1] > 0,
  `en las dos queda por ENCIMA del hombro (${frontalArriba.vsHombro[1]} / ${traseraArriba.vsHombro[1]} cm)`);
ok(frontalArriba.vsHombro[2] - traseraArriba.vsHombro[2] > 12,
  `las dos no están en el mismo sitio (${(frontalArriba.vsHombro[2] - traseraArriba.vsHombro[2]).toFixed(1)} cm de separación)`);

// Y en los dos racks la sostiene el CUERPO, no la mano: la barra no coincide
// con el punto medio de las manos.
ok(frontalArriba.vsMano > 4,
  `frontal: la barra NO está en el puño, la sostiene el cuerpo (${frontalArriba.vsMano} cm de la mano)`);

// ---- 3. En press y peso muerto la barra VA EN LA MANO
for (const ej of ["press-vertical", "peso-muerto"]) {
  await poner(ej);
  const m = await medir();
  ok(m.vsMano < 2, `${ej}: la barra va EN LA MANO (${m.vsMano} cm del punto medio de los puños)`);
}

// ---- 4. El eje de la barra es horizontal y transversal, siempre
for (const [ej, cual] of [["sentadilla-frontal", "fondo"], ["sentadilla-trasera", "fondo"],
                          ["press-vertical", "arriba"], ["peso-muerto", "fondo"]]) {
  await poner(ej);
  await postura(cual);
  const m = await medir();
  ok(m.ejeVertical < 0.05 && m.ejeLateral > 0.99,
    `${ej} ${cual}: la barra queda horizontal y atravesada (vertical ${m.ejeVertical}, lateral ${m.ejeLateral})`);
}

// ---- 5. LA BARRA SIGUE A LA POSTURA
await poner("sentadilla-trasera");
const arriba = await medir();
await postura("fondo");
const fondo = await medir();
ok(arriba.barraY - fondo.barraY > 30,
  `la barra BAJA con la figura (${arriba.barraY} → ${fondo.barraY} cm)`);
ok(Math.abs(arriba.vsHombro[2] - fondo.vsHombro[2]) < 2,
  `y no se despega del trapecio al bajar (${arriba.vsHombro[2]} → ${fondo.vsHombro[2]} cm del hombro)`);

// ---- 6. LOS DISCOS Y EL PESO
await p.evaluate(() => window.exersuite.editor.setDiscosBarra(4));
const cargada = await medir();
ok(cargada.discos === 4 && cargada.kg === 100,
  `cuatro discos de 20 sobre una barra de 20 dan ${cargada.kg} kg`);
await p.evaluate(() => window.exersuite.editor.setDiscosBarra(0));
const vacia = await medir();
ok(vacia.kg === 20, `quitarlos devuelve la barra a su peso (${vacia.kg} kg)`);

// ---- 7. EN LA SALIDA DEL PESO MUERTO, LOS DISCOS APOYAN
//
// Es la comprobación que más vale de toda la prueba: no mide la postura contra
// una constante sino contra el SUELO. Si la figura no llega a la barra, el
// disco se queda flotando y esto lo caza — que es lo que pasaba antes de
// corregir la salida.
await poner("peso-muerto");
await p.evaluate(() => window.exersuite.editor.setDiscosBarra(2));
await postura("fondo");
const salida = await medir();
ok(Math.abs(salida.discoAlSuelo) < 1.5,
  `peso muerto: el disco APOYA en el suelo (${salida.discoAlSuelo} cm), la figura llega a la barra`);
await postura("arriba");
const bloqueo = await medir();
ok(bloqueo.discoAlSuelo > 40,
  `y al bloquear la levanta del suelo (${bloqueo.discoAlSuelo} cm)`);

// ---- 8. RACKEAR sobre un soporte de verdad
await p.evaluate(() => window.exersuite.editor.insertarMaquina("rack-sentadillas"));
await p.waitForTimeout(800);
const ganchos = await p.evaluate(() => window.exersuite.editor.ganchosDeBarra(1.45).length);
ok(ganchos >= 2, `el rack de la biblioteca ofrece ganchos donde dejarla (${ganchos})`);

await poner("sentadilla-trasera");
const rack = await p.evaluate(() => {
  const T = window.exersuite.THREE, ed = window.exersuite.editor;
  const gs = ed.ganchosDeBarra(1.45);
  const hecho = ed.rackearBarra();
  const enlace = ed.getBarraManiqui();
  const obj = ed.listObjects().find((o) => o.id === enlace.objectId);
  // Distancia de la barra a la recta que une los dos ganchos.
  const cerca = gs.map((g) => +g.punto.distanceTo(obj.mesh.position).toFixed(1)).sort((a, b) => a - b);
  const alturas = gs.map((g) => +g.punto.y.toFixed(1));
  return { hecho, rackeada: enlace.rackeada, barraY: +obj.mesh.position.y.toFixed(1),
    alturaGancho: alturas[0], cerca: cerca.slice(0, 2),
    ejeVertical: +Math.abs(new T.Vector3(0, 1, 0).applyQuaternion(obj.mesh.quaternion).y).toFixed(3) };
});
ok(rack.hecho && rack.rackeada, "la barra se queda rackeada en el soporte");
ok(Math.abs(rack.barraY - rack.alturaGancho) < 1,
  `y a la altura del gancho (${rack.barraY} vs ${rack.alturaGancho} cm)`);
ok(rack.ejeVertical < 0.05, `apoyada horizontal (vertical ${rack.ejeVertical})`);

// Rackeada, la postura ya NO se la lleva: la sostiene el gancho.
await postura("fondo");
const trasBajar = await p.evaluate(() => {
  const ed = window.exersuite.editor;
  const enlace = ed.getBarraManiqui();
  const obj = ed.listObjects().find((o) => o.id === enlace.objectId);
  return +obj.mesh.position.y.toFixed(1);
});
ok(Math.abs(trasBajar - rack.barraY) < 0.5,
  `y agacharse no se la lleva del gancho (${trasBajar} vs ${rack.barraY} cm)`);

const vuelta = await p.evaluate(() => {
  const ed = window.exersuite.editor;
  const hecho = ed.desrackearBarra();
  return { hecho, rackeada: ed.getBarraManiqui()?.rackeada };
});
ok(vuelta.hecho && vuelta.rackeada === false, "y el maniquí puede volver a cogerla");
const recogida = await medir();
ok(recogida.vsHombro[2] < -2,
  `al desrackear vuelve al trapecio (${recogida.vsHombro[2]} cm del hombro)`);

// ---- 9. SOBREVIVE AL GUARDADO
// `loadProject` es ASÍNCRONO —recarga el maniquí y sus mallas—, así que hay
// que esperarlo: leer el enlace en el mismo tick daba «null» y parecía un
// fallo del guardado cuando lo era de la prueba.
const viaje = await p.evaluate(async () => {
  const ed = window.exersuite.editor;
  const data = ed.serialize();
  await ed.loadProject(data);
  const b = ed.getBarraManiqui();
  return { ejercicio: b?.ejercicio ?? null, existe: !!ed.listObjects().find((o) => o.id === b?.objectId) };
});
ok(viaje.ejercicio === "sentadilla-trasera" && viaje.existe,
  `guardar y volver a abrir conserva la barra puesta (${viaje.ejercicio})`);

await p.screenshot({ path: "salidas/barra-maniqui.png" });

for (const e of errores) console.log("PAGEERROR " + e);
console.log(fallos.length === 0 && errores.length === 0
  ? "\nTODO OK" : `\n${fallos.length} fallos, ${errores.length} errores de página`);
await browser.close();
process.exit(fallos.length === 0 && errores.length === 0 ? 0 : 1);
