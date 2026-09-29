// v0.2.23: Torre polea con BLOQUE DE PESOS — pila seleccionable en los
// tubos guía, remo levanta la pila, y export del .prefab.json borrador.
import { chromium } from "playwright-core";
import { prepararPasos } from "./arnes.mjs";
import fs from "node:fs";
const browser = await chromium.launch({
  // El Chromium de Playwright ya instalado. Se puede apuntar a otro con
  // CHROMIUM=/ruta/al/chrome (ver LEEME.md).
  executablePath: process.env.CHROMIUM
    ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
// Por pasos, no por reloj: ver pruebas/arnes.mjs (v0.4.10).
const pausa = await prepararPasos(page);
const errores = [];
page.on("pageerror", (e) => errores.push("PAGEERROR: " + e.message));
await page.goto("http://127.0.0.1:4174/");
await pausa(1000);
await page.click("text=📁 PROYECTOS"); await pausa(300);
await page.click(".land-actions button:has-text('NUEVO')"); await pausa(300);
await page.click(".wizard-carta:has-text('Profesional')"); await pausa(300);
await page.click(".wizard-carta:has-text('Canvas libre')");
// SE ESPERA A QUE LA APP ESTE LISTA, NO AL RELOJ (v0.3.81): la capa de carga
// se va cuando las mallas estan. Adivinarlo con un timeout fijo es lo que
// hacia parpadear a estas pruebas.
await page.waitForFunction(() => !document.querySelector(".cargando-capa"), null, { timeout: 45000 });
await pausa(2500);

const R = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  const antes = new Set([...ed.objects.keys()]);
  ed.insertarMaquina("torre-polea-pesos", new T.Vector3(0, 0, 0));
  const nuevos = [...ed.objects.values()].filter((o) => !antes.has(o.id));
  const pila = nuevos.find((o) => o.componentId === "pila-pesos");
  const remo = nuevos.find((o) => (o.name || "").includes("Remo de polea alta"));
  const carrier = nuevos.find((o) => o.componentId === "portadiscos-ttp");
  window.__ids = { todos: nuevos.map((o) => o.id), pila: pila?.id, remo: remo?.id };
  return {
    piezas: nuevos.length,
    pila: !!pila,
    sinCarrier: !carrier,
    cables: ed.listCables().length,
    uniones: ed.listJoints().length,
    pilaPos: pila ? pila.mesh.position.toArray().map((v) => +v.toFixed(1)) : null,
  };
});
console.log("torre-pesos:", JSON.stringify(R));

// Export del BORRADOR .prefab.json para la corrección del diseñador.
//
// OJO CON DÓNDE SE ESCRIBE. Hasta aquí esto era
// `fs.writeFileSync("torrepoleadepesos.prefab.json", json)`, con ruta
// RELATIVA, así que el destino dependía del directorio desde el que se
// lanzara: por `correr-todo.sh` (que hace `cd pruebas/`) caía en
// `pruebas/`, que está en el .gitignore y no molesta a nadie; pero lanzada a
// mano desde la raíz caía encima de `torrepoleadepesos.prefab.json` —el de la
// raíz, que SÍ está versionado y que es **el prefab corregido a mano por el
// diseñador**, del que salió `standardMachines.ts` (ver su línea 439 y el
// CHANGELOG de v0.2.24: «verbatim: se eliminan los manguitos»)—. Es decir: una
// prueba de lectura podía pisar una referencia revisada sin decir nada, y de
// paso dejaba el árbol sucio en cada corrida de la batería.
//
// Ahora el borrador va SIEMPRE a `pruebas/salidas/`, que está ignorado, y la
// ruta se resuelve desde la del propio script y no desde el cwd.
const RAIZ = new URL("..", import.meta.url).pathname;
const SALIDAS = `${RAIZ}pruebas/salidas`;
const REFERENCIA = `${RAIZ}torrepoleadepesos.prefab.json`;

const json = await page.evaluate(() => {
  const ed = window.exersuite.editor;
  ed.select(null);
  for (const id of window.__ids.todos) ed.toggleMulti(ed.getObject(id));
  return window.exersuite.prefabIO.serializarPrefab(ed, "Torre polea de pesos");
});
fs.mkdirSync(SALIDAS, { recursive: true });
fs.writeFileSync(`${SALIDAS}/torrepoleadepesos.prefab.json`, json);
const parsed = JSON.parse(json);
console.log("prefab:", JSON.stringify({ piezas: parsed.piezas.length, uniones: (parsed.uniones ?? []).length, cables: (parsed.cables ?? []).length, label: parsed.label }));

// Y COMO YA NO SE PISA, SE COMPARA: el borrador fresco contra la referencia
// versionada. Así el fichero deja de ser algo que la prueba reescribe y pasa a
// ser algo que la prueba GUARDA — si `standardMachines.ts` se separa del prefab
// revisado, aquí se ve.
//
// Dos cosas se ignoran a propósito. El sello `app`, que solo dice con qué
// versión se generó y cambia sin que cambie la geometría. Y un margen en las
// coordenadas: el solver no es determinista al bit y se le han medido derivas
// de hasta 0,0015 en las anclas de cable entre corridas idénticas. El margen
// es 0,01, casi diez veces el ruido observado y aún muy por debajo de
// cualquier cambio de diseño real.
const MARGEN = 0.01;
function numeros(v, ruta = "", acc = new Map()) {
  if (typeof v === "number") acc.set(ruta, v);
  else if (Array.isArray(v)) v.forEach((x, i) => numeros(x, `${ruta}[${i}]`, acc));
  else if (v && typeof v === "object") {
    for (const [k, x] of Object.entries(v)) if (k !== "app") numeros(x, `${ruta}.${k}`, acc);
  }
  return acc;
}
const ref = JSON.parse(fs.readFileSync(REFERENCIA, "utf8"));
const aRef = numeros(ref), aNue = numeros(parsed);
const faltan = [...aRef.keys()].filter((k) => !aNue.has(k));
const sobran = [...aNue.keys()].filter((k) => !aRef.has(k));
let peor = { ruta: null, delta: 0 };
for (const [k, v] of aRef) {
  if (!aNue.has(k)) continue;
  const d = Math.abs(aNue.get(k) - v);
  if (d > peor.delta) peor = { ruta: k, delta: d };
}
if (faltan.length || sobran.length) {
  errores.push(`el prefab generado ya no tiene la forma del revisado: ${faltan.length} campos que faltan, ${sobran.length} que sobran (p. ej. ${(faltan[0] ?? sobran[0])})`);
} else if (peor.delta > MARGEN) {
  errores.push(`el prefab generado se ha separado del revisado: ${peor.ruta} difiere en ${peor.delta.toFixed(4)} (margen ${MARGEN})`);
} else {
  console.log(`prefab vs revisado: misma forma, peor desvío ${peor.delta.toFixed(4)} en ${peor.ruta ?? "—"} (margen ${MARGEN}) ✓`);
}
// Para refrescar la referencia a propósito, tras una ronda de corrección:
//   ACTUALIZAR_PREFAB=1 node pruebas/prueba-torre-pesos.mjs
if (process.env.ACTUALIZAR_PREFAB === "1") {
  fs.writeFileSync(REFERENCIA, json);
  console.log("referencia ACTUALIZADA a petición (ACTUALIZAR_PREFAB=1):", REFERENCIA);
}

// Simulación: la pila queda GUIADA y el remo la LEVANTA por el cable.
const S = await page.evaluate(async () => {
  const ed = window.exersuite.editor;
  const T = window.exersuite.THREE;
  ed.select(null);
  const pila = ed.getObject(window.__ids.pila);
  const remo = ed.getObject(window.__ids.remo);
  await ed.toggleSimulation();
  for (let i = 0; i < 120; i++) ed.physics.step(1 / 60);
  const p0 = pila.mesh.position.clone();
  const r0 = remo.mesh.position.clone();
  ed.physics.grab(remo.id, r0.clone());
  for (let i = 0; i < 240; i++) {
    ed.physics.dragTo(r0.clone().add(new T.Vector3(0, -Math.min(i * 0.5, 60), 20 + Math.min(i * 0.4, 45))));
    ed.physics.step(1 / 60);
  }
  const sube = pila.mesh.position.y - p0.y;
  const derivaXZ = Math.hypot(pila.mesh.position.x - p0.x, pila.mesh.position.z - p0.z);
  await ed.toggleSimulation();
  return { asentadaY: +p0.y.toFixed(1), pilaSube: +sube.toFixed(1), derivaXZ: +derivaXZ.toFixed(1) };
});
console.log("sim:", JSON.stringify(S));
await page.evaluate(() => {
  const ed = window.exersuite.editor;
  ed.orbit.target.set(0, 100, -10);
  ed.sceneManager.camera.position.set(230, 150, 200);
  ed.orbit.update?.(); ed.requestRender?.();
});
await pausa(400);
await page.screenshot({ path: "v224-torre-pesos.png" });
const ok = R.piezas === 22 && R.pila && R.sinCarrier && R.cables === 2 && R.uniones >= 3 &&
  parsed.piezas.length === 22 && (parsed.cables ?? []).length === 2 &&
  S.asentadaY > 38 && S.asentadaY < 60 && S.pilaSube > 5 && S.derivaXZ < 6;
console.log(JSON.stringify({ ok }));
console.log("ERRORES:", errores.length ? errores.join("\n") : "ninguno");
await browser.close();

// Y SE SALE CON EL CÓDIGO QUE CORRESPONDE.
//
// Hasta aquí esta prueba imprimía `{"ok":false}` y se cerraba en verde: la
// batería la contaba como buena aunque fallaran sus comprobaciones. Con el
// guardián del prefab recién puesto eso dejaba de tener gracia, porque un
// aviso que nadie recoge no guarda nada. Se comprobó antes de apretar: con el
// árbol en este commit `ok` es `true` y no hay errores, así que esto no
// convierte en rojo nada que estuviera pasando de verdad — solo deja de tapar
// lo que falle a partir de ahora.
if (!ok || errores.length) process.exit(1);
